#!/usr/bin/env node
/* Diffs the audio/ folder against audio/audio-manifest.json.
   Run from repo root:  node scripts/check-audio.js
   Exits non-zero if anything is missing (so it can gate a build).      */
const fs = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const OUTDIR = path.join(ROOT, 'audio');
const MAN    = path.join(OUTDIR, 'audio-manifest.json');

if (!fs.existsSync(MAN)) {
  console.error('No manifest. Run: node scripts/gen-recording-assets.js');
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(MAN, 'utf8'));
const ext = manifest.extension;
const expected = new Set(manifest.fragments.map(f => f.file));

const actual = new Set();
if (fs.existsSync(OUTDIR))
  for (const f of fs.readdirSync(OUTDIR))
    if (f.endsWith('.' + ext)) actual.add(f);

const missing = [...expected].filter(f => !actual.has(f));
const extra   = [...actual].filter(f => !expected.has(f));
const have    = expected.size - missing.length;
const pct     = expected.size ? Math.round((100 * have) / expected.size) : 0;

console.log(`Audio coverage: ${have}/${expected.size} (${pct}%)`);

if (missing.length) {
  console.log(`\nMISSING (${missing.length}):`);
  missing.slice(0, 40).forEach(f => console.log('  - ' + f));
  if (missing.length > 40) console.log(`  ...and ${missing.length - 40} more`);
}
if (extra.length) {
  console.log(`\nEXTRA / not in manifest (${extra.length}):`);
  extra.slice(0, 20).forEach(f => console.log('  - ' + f));
}
if (!missing.length) console.log('\nAll fragments recorded. ✅');

process.exit(missing.length ? 1 : 0);
