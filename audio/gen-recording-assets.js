#!/usr/bin/env node
/* Generates audio/recording-script.md and audio/audio-manifest.json
   from data/questions and data/terms.json. No dependencies.
   Run from repo root:  node scripts/gen-recording-assets.js          */
const fs = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const QDIR   = path.join(ROOT, 'data', 'questions');
const TERMS  = path.join(ROOT, 'data', 'terms.json');
const OUTDIR = path.join(ROOT, 'audio');
const EXT    = process.env.AUDIO_EXT || 'mp3';

const pad   = n => String(n).padStart(3, '0');
const clean = s => (s || '').replace(/\s+/g, ' ').trim();

function findQuestions(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(findQuestions(p));
    else if (/^q\d+\.json$/.test(e.name)) out.push(p);
  }
  return out;
}

/* ---- collect question fragments, in narration order ---- */
const questions = findQuestions(QDIR)
  .map(f => JSON.parse(fs.readFileSync(f, 'utf8')))
  .sort((a, b) => a.id - b.id);

const qFrags = [];
const addQ = (id, field, text) =>
  qFrags.push({ file: `q${id}_${field}.${EXT}`, label: `q${id}_${field}`, text: clean(text), group: `q${id}`, field });

for (const q of questions) {
  const id = pad(q.id);
  addQ(id, 'question', q.question_text);
  if (q.lead_in) addQ(id, 'lead_in', q.lead_in);
  q.official_answers.forEach((a, i) => addQ(id, `answer_${i + 1}`, a.text));
  if (q.disambiguation) addQ(id, 'disambiguation', q.disambiguation);
  addQ(id, 'why', q.why_it_matters.text);
  addQ(id, 'fun', q.fun_fact.text);
  if (q.mnemonic && q.mnemonic.link_sentence) addQ(id, 'mnemonic', q.mnemonic.link_sentence);
}

/* ---- collect term fragments (recorded ONCE, shared) ---- */
const terms = JSON.parse(fs.readFileSync(TERMS, 'utf8')).terms;
const tFrags = [];
for (const [tid, e] of Object.entries(terms)) {
  const base = `term_${tid}`;
  if (e.origin) tFrags.push({ file: `${base}_origin.${EXT}`, label: `${base}_origin`, text: clean(e.origin), group: tid, field: 'origin' });
  tFrags.push({ file: `${base}_def.${EXT}`,  label: `${base}_def`,  text: clean(e.kid_definition), group: tid, field: 'def' });
  tFrags.push({ file: `${base}_word.${EXT}`, label: `${base}_word`, text: e.term, group: tid, field: 'word' });
}

/* ---- write manifest ---- */
fs.mkdirSync(OUTDIR, { recursive: true });
const manifest = {
  generated: new Date().toISOString(),
  extension: EXT,
  counts: { questions: qFrags.length, vocabulary: tFrags.length, total: qFrags.length + tFrags.length },
  fragments: [...qFrags, ...tFrags]
};
fs.writeFileSync(path.join(OUTDIR, 'audio-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

/* ---- write human recording script ---- */
let md = '';
md += '# Recording Script — Keep It (US Civics)\n\n';
md += 'Read each line in your natural voice. In Audacity: drop a label (Cmd+B) at the start of\n';
md += 'each fragment and name it EXACTLY the bracketed text (no extension). Then\n';
md += '**File > Export Audio > Multiple files > split on Labels > name using Label**.\n\n';
md += `**Total fragments: ${manifest.counts.total}** ` +
      `(questions: ${manifest.counts.questions}, vocabulary: ${manifest.counts.vocabulary})\n\n---\n\n## Questions\n`;

let g = null;
for (const fr of qFrags) {
  if (fr.group !== g) {
    g = fr.group;
    const q = questions.find(x => `q${pad(x.id)}` === g);
    md += `\n### ${g.toUpperCase()} — ${q.question_text}\n\n`;
  }
  md += `[${fr.label}]  ${fr.text}\n\n`;
}

md += '\n---\n\n## Vocabulary (record ONCE — shared across every question)\n';
let t = null;
for (const fr of tFrags) {
  if (fr.group !== t) { t = fr.group; md += `\n### ${terms[fr.group].term}\n\n`; }
  const note = fr.field === 'word' ? '   _(say slowly and clearly — the app repeats it)_' : '';
  md += `[${fr.label}]  ${fr.text}${note}\n\n`;
}
fs.writeFileSync(path.join(OUTDIR, 'recording-script.md'), md);

console.log('Wrote audio/recording-script.md and audio/audio-manifest.json');
console.log(`Fragments: ${manifest.counts.total} (questions ${manifest.counts.questions}, vocab ${manifest.counts.vocabulary})`);
