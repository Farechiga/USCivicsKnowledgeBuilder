#!/usr/bin/env node
/* Generate voice audio for every fragment in audio/audio-manifest.json
   using OpenAI gpt-4o-mini-tts. Writes audio/<file>.mp3.

   Idempotent: skips a fragment when its mp3 exists, is non-empty, AND its
   text/voice/instructions are unchanged (tracked in audio/.audio-hashes.json).

   Resilient: runs requests concurrently, retries transient failures
   (429/5xx/network) with exponential backoff, times out hung requests,
   writes mp3 + hashes atomically, and validates existing files before
   skipping (catches zero-byte files from prior crashes).

   Usage (from repo root):
     export OPENAI_API_KEY=sk-...
     node scripts/gen-tts.js                   # generate missing or changed clips
     node scripts/gen-tts.js --dry-run         # show what WOULD change; no API calls
     node scripts/gen-tts.js --force           # regenerate everything
     node scripts/gen-tts.js --concurrency=8   # parallel requests (default 6)
   Requires Node 18+ (built-in fetch + AbortController).                       */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT     = path.resolve(__dirname, '..');
const OUTDIR   = path.join(ROOT, 'audio');
const MANIFEST = path.join(OUTDIR, 'audio-manifest.json');
const HASHES   = path.join(OUTDIR, '.audio-hashes.json');

/* ---- voice config (verified working — do not change without listening test) ---- */
const MODEL        = 'gpt-4o-mini-tts';
const VOICE        = 'marin';
const FORMAT       = 'mp3';
const INSTRUCTIONS =
  'Use bright, warm, engaging intonation, like a passionate teacher getting a child excited ' +
  'to understand. Clear and friendly, never rushed.';
const WORD_INSTRUCTIONS =
  'Say this single word slowly and very clearly, as if helping a young child learn to pronounce it.';

/* ---- tuning ---- */
const DEFAULT_CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS  = 60_000;
const MAX_RETRIES         = 3;        // → up to 4 total attempts per fragment
const BASE_BACKOFF_MS     = 1_000;    // 1s, 2s, 4s

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_NET_CODES = new Set([
  'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN',
  'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT'
]);

/* ---- args ---- */
const argv  = process.argv.slice(2);
const DRY   = argv.includes('--dry-run');
const FORCE = argv.includes('--force');
const concurrencyArg = argv.find(a => a.startsWith('--concurrency='));
const CONCURRENCY = concurrencyArg
  ? Math.max(1, parseInt(concurrencyArg.split('=')[1], 10) || DEFAULT_CONCURRENCY)
  : DEFAULT_CONCURRENCY;

const API_KEY = process.env.OPENAI_API_KEY;
if (!DRY && !API_KEY) {
  console.error('Set your key first:  export OPENAI_API_KEY=sk-...');
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
let hashes = {};
try { hashes = JSON.parse(fs.readFileSync(HASHES, 'utf8')); } catch {}

const isWord          = f => /_word\.[a-z0-9]+$/.test(f.file);
const instructionsFor = f => (isWord(f) ? WORD_INSTRUCTIONS : INSTRUCTIONS);
const sig = f => crypto.createHash('sha256')
  .update([MODEL, VOICE, FORMAT, instructionsFor(f), f.text].join('\u0001'))
  .digest('hex');

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---- atomic write (POSIX rename is atomic on the same filesystem) ---- */
function atomicWrite(dest, buffer) {
  const tmp = dest + '.tmp';
  fs.writeFileSync(tmp, buffer);
  fs.renameSync(tmp, dest);
}

/* ---- existing file is "valid" only if present and non-empty ---- */
function validExisting(dest) {
  try { return fs.statSync(dest).size > 0; } catch { return false; }
}

/* ---- single API call w/ timeout + content-type sanity check ---- */
async function callTTS(f) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, voice: VOICE, input: f.text,
        instructions: instructionsFor(f), response_format: FORMAT
      }),
      signal: ctrl.signal
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    // Guard against the rare case where a 200 carries JSON (would corrupt the .mp3)
    const ctype = res.headers.get('content-type') || '';
    if (!/audio|octet-stream/i.test(ctype)) {
      throw new Error(`unexpected content-type: ${ctype}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

function isRetryable(err) {
  if (err.status && RETRYABLE_STATUS.has(err.status)) return true;
  if (err.name === 'AbortError') return true;                    // our timeout
  if (err.code && RETRYABLE_NET_CODES.has(err.code)) return true;
  if (err.cause && err.cause.code && RETRYABLE_NET_CODES.has(err.cause.code)) return true;
  return false;
}

async function synthWithRetry(f) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const buf = await callTTS(f);
      atomicWrite(path.join(OUTDIR, f.file), buf);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/* ---- minimal concurrency pool ---- */
async function runPool(items, worker, concurrency) {
  if (items.length === 0) return;
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      await worker(items[idx], idx);
    }
  }));
}

/* ---- hash persistence (atomic; flushed on success + on signals) ---- */
function flushHashes() {
  try {
    const tmp = HASHES + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(hashes, null, 2) + '\n');
    fs.renameSync(tmp, HASHES);
  } catch (e) {
    console.error('warn: failed to write hashes file:', e.message);
  }
}
process.on('SIGINT',  () => { flushHashes(); process.exit(130); });
process.on('SIGTERM', () => { flushHashes(); process.exit(143); });

/* ---- main ---- */
(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });

  // Classify every fragment up front so we can show the plan
  const todo = [];
  let upToDate = 0;
  const inManifest = new Set();
  for (const f of manifest.fragments) {
    inManifest.add(f.file);
    const dest = path.join(OUTDIR, f.file);
    const want = sig(f);
    const hashMatch = hashes[f.file] === want;
    const fileOk = validExisting(dest);
    if (!FORCE && hashMatch && fileOk) {
      upToDate++;
    } else {
      todo.push({
        f, want,
        reason: !fileOk ? 'missing/empty' : !hashMatch ? 'text/voice changed' : 'forced'
      });
    }
  }
  const stale = Object.keys(hashes).filter(k => !inManifest.has(k));

  if (DRY) {
    for (const { f, reason } of todo) console.log(`would generate  ${f.file}  (${reason})`);
    console.log(`\nDry run. would generate: ${todo.length}, up-to-date: ${upToDate}`);
    if (stale.length) console.log(`would prune stale hash entries: ${stale.length}`);
    return;
  }

  console.log(`Plan: ${todo.length} to generate, ${upToDate} up-to-date, concurrency=${CONCURRENCY}\n`);

  let made = 0, failed = 0, done = 0;
  const failures = [];

  await runPool(todo, async ({ f, want }) => {
    const tag = `[${String(++done).padStart(String(todo.length).length, ' ')}/${todo.length}]`;
    try {
      await synthWithRetry(f);
      hashes[f.file] = want;
      flushHashes();                                   // resumable: persist after each success
      made++;
      console.log(`${tag} ok    ${f.file}`);
    } catch (e) {
      failed++;
      failures.push({ file: f.file, error: e.message });
      console.log(`${tag} FAIL  ${f.file} — ${e.message}`);
    }
  }, CONCURRENCY);

  // Drop hash entries for fragments no longer in the manifest
  let pruned = 0;
  for (const k of Object.keys(hashes)) {
    if (!inManifest.has(k)) { delete hashes[k]; pruned++; }
  }
  if (pruned) flushHashes();

  console.log(
    `\nDone. generated: ${made}, up-to-date: ${upToDate}, ` +
    `failed: ${failed}, pruned hash entries: ${pruned}`
  );
  if (failures.length) {
    console.log(`\nFailed (${failures.length}):`);
    for (const fail of failures) console.log(`  ${fail.file}  ${fail.error}`);
  }
  if (failed) process.exit(1);
})();
