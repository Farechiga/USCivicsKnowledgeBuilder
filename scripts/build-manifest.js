#!/usr/bin/env node
/* Build audio/audio-manifest.json from the question + term data.

   Walks every data/questions/q*.json (in id order) and data/terms.json,
   emitting one fragment per piece of speakable text. gen-tts.js then turns
   each fragment into audio/<file>.mp3.

   Per question, in order:
     question, lead_in?, answer_1..N, disambiguation?, why, fun, mnemonic?
   Per term referenced by a question AND defined in terms.json, in order of
   first appearance:
     origin?, def, word

   Dynamic questions: the answer fragment uses the live dynamic.current_value
   (e.g. the current President's name), NOT the "look it up on uscis.gov"
   placeholder. Re-run build-manifest + gen-tts when a current_value changes.

   Usage (from repo root):
     node scripts/build-manifest.js              # write the manifest
     node scripts/build-manifest.js --dry-run    # report only; write nothing  */

const fs = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const QDIR     = path.join(ROOT, 'data', 'questions');
const TERMS    = path.join(ROOT, 'data', 'terms.json');
const OUT      = path.join(ROOT, 'audio', 'audio-manifest.json');
const EXT      = 'mp3';
const DRY      = process.argv.slice(2).includes('--dry-run');

const qid = id => 'q' + String(id).padStart(3, '0');
const frag = (file, group, field, text) =>
  ({ file: `${file}.${EXT}`, label: file, text, group, field });

/* ---- questions, in id order ---- */
const qFiles = fs.readdirSync(QDIR)
  .filter(f => /^q\d+\.json$/.test(f))
  .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

const fragments = [];
let qCount = 0;
const termOrder = [];          // term ids in order of first appearance
const seenTerm = new Set();

for (const f of qFiles) {
  const d = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8'));
  const q = qid(d.id);
  const before = fragments.length;

  fragments.push(frag(`${q}_question`, q, 'question', d.question_text));
  if (d.lead_in) fragments.push(frag(`${q}_lead_in`, q, 'lead_in', d.lead_in));
  // Dynamic questions: the official_answers text is a "look it up" placeholder;
  // record the live d.dynamic.current_value instead so the audio says the real
  // name. (Re-run build-manifest + gen-tts when a current_value changes.)
  const answerTexts = (d.answer_type === 'dynamic_lookup' && d.dynamic && d.dynamic.current_value)
    ? [d.dynamic.current_value]
    : (d.official_answers || []).map(a => a.text);
  answerTexts.forEach((text, i) =>
    fragments.push(frag(`${q}_answer_${i + 1}`, q, `answer_${i + 1}`, text)));
  if (d.disambiguation)
    fragments.push(frag(`${q}_disambiguation`, q, 'disambiguation', d.disambiguation));
  if (d.why_it_matters && d.why_it_matters.text)
    fragments.push(frag(`${q}_why`, q, 'why', d.why_it_matters.text));
  if (d.fun_fact && d.fun_fact.text)
    fragments.push(frag(`${q}_fun`, q, 'fun', d.fun_fact.text));
  if (d.mnemonic && d.mnemonic.link_sentence)
    fragments.push(frag(`${q}_mnemonic`, q, 'mnemonic', d.mnemonic.link_sentence));

  qCount += fragments.length - before;

  for (const t of (d.term_ids || [])) {
    if (!seenTerm.has(t)) { seenTerm.add(t); termOrder.push(t); }
  }
}

/* ---- vocabulary, in order of first appearance (only terms defined in terms.json) ---- */
const terms = JSON.parse(fs.readFileSync(TERMS, 'utf8')).terms;
let vocabCount = 0;
const missingTerms = [];

for (const t of termOrder) {
  const e = terms[t];
  if (!e) { missingTerms.push(t); continue; }
  const before = fragments.length;
  if (e.origin) fragments.push(frag(`term_${t}_origin`, t, 'origin', e.origin));
  fragments.push(frag(`term_${t}_def`, t, 'def', e.kid_definition));
  fragments.push(frag(`term_${t}_word`, t, 'word', e.term));
  vocabCount += fragments.length - before;
}

const manifest = {
  generated: new Date().toISOString(),
  extension: EXT,
  counts: { questions: qCount, vocabulary: vocabCount, total: fragments.length },
  fragments
};

console.log(`questions processed: ${qFiles.length}`);
console.log(`question fragments:  ${qCount}`);
console.log(`vocabulary terms:    ${termOrder.length - missingTerms.length} defined, ${missingTerms.length} referenced but undefined`);
console.log(`vocabulary fragments:${vocabCount}`);
console.log(`total fragments:     ${fragments.length}`);
if (missingTerms.length)
  console.log(`\n[skipped — not in terms.json] ${missingTerms.length} term ids:\n  ${missingTerms.join(', ')}`);

if (DRY) { console.log('\n(dry run — manifest not written)'); process.exit(0); }
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nWrote ${path.relative(ROOT, OUT)}`);
