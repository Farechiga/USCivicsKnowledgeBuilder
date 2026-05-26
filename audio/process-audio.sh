#!/usr/bin/env bash
# Batch-clean raw recordings: trim leading/trailing silence + loudness-normalize,
# then write mono mp3s into audio/ using the same base filename.
#
#   1) Export your Audacity label files (WAV) into audio/raw/
#   2) ./scripts/process-audio.sh
#   3) node scripts/check-audio.js
#
# Requires ffmpeg:  brew install ffmpeg
set -euo pipefail

IN="${1:-audio/raw}"
OUT="${2:-audio}"
mkdir -p "$OUT"

shopt -s nullglob nocaseglob
files=("$IN"/*.wav)
if [ ${#files[@]} -eq 0 ]; then
  echo "No .wav files in $IN"; exit 0
fi

for f in "${files[@]}"; do
  base="$(basename "${f%.*}")"
  echo "-> $base"
  ffmpeg -y -loglevel error -i "$f" \
    -af "silenceremove=start_periods=1:start_silence=0.10:start_threshold=-45dB,\
areverse,silenceremove=start_periods=1:start_silence=0.10:start_threshold=-45dB,areverse,\
loudnorm=I=-16:TP=-1.5:LRA=11" \
    -ar 44100 -ac 1 -codec:a libmp3lame -q:a 4 \
    "$OUT/$base.mp3"
done

echo "Done. Verify coverage:  node scripts/check-audio.js"
