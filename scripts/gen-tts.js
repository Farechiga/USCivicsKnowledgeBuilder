#!/usr/bin/env node
/* Generate voice audio for every fragment in audio/audio-manifest.json
   using OpenAI gpt-4o-mini-tts. Writes audio/<file>.mp3.

   Idempotent: skips a fragment when its mp3 exists AND its text/voice/
   instructions are unchanged (tracked in audio/.audio-hashes.json). Edit a
   question's wording and only that one clip regenerates on the next run.

   Usage (from repo root):
     export OPENAI_API_KEY=sk-...
     node scripts/gen-tts.js              # generate missing or changed clips
     node scripts/gen-tts.js --dry-run    # list what WOULD change; no API calls
     node scripts/gen-tts.js --force      # regenerate everything
   Requires Node 18+ (built-in fetch).                                        */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT     = path.resolve(__dirname, '..');
const OUTDIR   = path.join(ROOT, 'audio');
const MANIFEST = path.join(OUTDIR, 'audio-manifest.json');
const HASHES   = path.join(OUTDIR, '.audio-hashes.json');

/* ---- voice config (tweak these freely) ---- */
const MODEL        = 'gpt-4o-mini-tts';
const VOICE        = 'marin';
const FORMAT       = 'mp3';
const INSTRUCTIONS =
  'Use bright, warm, engaging intonation, like a passionate teacher getting a child excited ' +
  'to understand. Clear and friendly, never rushed.';
const WORD_INSTRUCTIONS =
  'Say this single word slowly and very clearly, as if helping a young child learn to pronounce it.';

/* ---- args / key ---- */
const argv  = process.argv.slice(2);
const DRY   = argv.includes('--dry-run');
const FORCE = argv.includes('--force');
const API_KEY = process.env.OPENAI_API_KEY;
if (!DRY && !API_KEY) {
  console.error('Set your key first:  export OPENAI_API_KEY=sk-...');
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
let hashes = {};
try { hashes = JSON.parse(fs.readFileSync(HASHES, 'utf8')); } catch {}

const isWord         = f => /_word\.[a-z0-9]+$/.test(f.file);
const instructionsFor = f => (isWord(f) ? WORD_INSTRUCTIONS : INSTRUCTIONS);
// hash everything that affects the output, so any change triggers a regen
const sig = f => crypto.createHash('sha256')
  .update([MODEL, VOICE, FORMAT, instructionsFor(f), f.text].join('\u0001'))
  .digest('hex');

async function synth(f) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, voice: VOICE, input: f.text,
      instructions: instructionsFor(f), response_format: FORMAT
    })
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${await res.text()}`);
  fs.writeFileSync(path.join(OUTDIR, f.file), Buffer.from(await res.arrayBuffer()));
}

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  let made = 0, skipped = 0, failed = 0;
  for (const f of manifest.fragments) {
    const dest = path.join(OUTDIR, f.file);
    const want = sig(f);
    if (!FORCE && fs.existsSync(dest) && hashes[f.file] === want) { skipped++; continue; }
    if (DRY) { console.log('would generate  ' + f.file); made++; continue; }
    try {
      process.stdout.write('-> ' + f.file + ' ... ');
      await synth(f);
      hashes[f.file] = want;
      fs.writeFileSync(HASHES, JSON.stringify(hashes, null, 2) + '\n'); // resumable
      console.log('ok');
      made++;
      await new Promise(r => setTimeout(r, 150)); // gentle on rate limits
    } catch (e) { console.log('FAIL — ' + e.message); failed++; }
  }
  console.log(`\nDone. generated/updated: ${made}, up-to-date: ${skipped}, failed: ${failed}`);
  if (DRY) console.log('(dry run — no API calls, nothing written)');
  if (failed) process.exit(1);
})();
