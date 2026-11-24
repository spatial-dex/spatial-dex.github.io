#!/usr/bin/env bash
# Cut the reconstruction-gallery clips out of the 1920x1080 slideshow renders.
#
# Usage: tools/encode_recon.sh <slideshow_clips_mp4 dir>
#
# Each render shows the scene (left) and the input video with the instruction bars (right).
# The page draws the bars itself, so only the two videos are kept:
#   scene  1060x1000 at (0,80)    -> 800x754   (+ 320x302 tile)
#   input   800x605  at (1080,88) -> 600x454
# The renders' timing tick spans the whole bar, so every tile in index.html has data-tick="0,1".
set -euo pipefail

SRC=${1:?slideshow_clips_mp4 dir}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=$ROOT/assets/videos/data/clips
POS=$ROOT/assets/posters/data/clips
mkdir -p "$OUT" "$POS"

# gallery slot -> render id
CLIPS=(
  "1 decd766d"   # carrot and knife
  "2 9434b584"   # frying pan and egg
  "3 9cdb75d5"   # onion
  "4 6ac05c9d"   # soil in a pot
  "5 2a831288"   # shirt
)

enc() {  # <src> <filter> <dst> <crf>
  ffmpeg -nostdin -v error -y -i "$1" -vf "$2,format=yuv420p" \
    -an -c:v libx264 -preset slow -crf "$4" -profile:v high \
    -map_metadata -1 -map_chapters -1 -fflags +bitexact -movflags +faststart "$3"
  ffmpeg -nostdin -v error -y -i "$3" -frames:v 1 -q:v 3 "$POS/$(basename "${3%.mp4}").jpg"
}

for row in "${CLIPS[@]}"; do
  read -r k id <<<"$row"
  src=$SRC/$id.mp4
  echo "==> clip $k  <-  $id"
  enc "$src" "crop=1060:1000:0:80,scale=800:754:flags=lanczos"  "$OUT/scene_$k.mp4" 22
  enc "$src" "crop=800:605:1080:88,scale=600:454:flags=lanczos" "$OUT/input_$k.mp4" 22
  enc "$src" "crop=1060:1000:0:80,scale=320:302:flags=lanczos"  "$OUT/tile_$k.mp4"  26
done

du -sh "$OUT" "$POS"
