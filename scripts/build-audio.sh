#!/usr/bin/env bash
# Builds the game's sound effects and music from CC0 source packs.
#
# Usage: scripts/build-audio.sh <dir>
#   <dir> holds the unzipped packs and music files listed below, all from
#   opengameart.org and all CC0 (see public/audio/README.md for credits):
#     kenney_interfaceSounds/   Kenney, Interface Sounds
#     jingleSounds_Kenney/      Kenney, 85 Short music jingles
#     kenney_casino-audio/      Kenney, Casino Audio
#     ruskerdax_-_happy_vibes.mp3   Ruskerdax, Happy Vibes
#     shineblitz_0.ogg              zesona, Shine Blitz
#
# Effects become mono MP3s (every browser decodes them); music becomes Ogg
# Vorbis with an MP3 fallback for Safari. Needs ffmpeg with libmp3lame and
# libvorbis.
set -euo pipefail
SRC=$(cd "$1" && pwd)
OUT=$(cd "$(dirname "$0")/../public/audio" && pwd)
mkdir -p "$OUT/music"

ui="$SRC/kenney_interfaceSounds/Audio"
steel="$SRC/jingleSounds_Kenney/OGG/jingles_STEEL"
casino="$SRC/kenney_casino-audio/Audio"

# A short falling sine "thump" under the merge sound, for weight.
thump='aevalsrc=exprs=0.9*sin(2*PI*(60*t+160*0.03*(1-exp(-t/0.03))))*exp(-t/0.07):s=44100:d=0.3'

# Effects are peak-normalised to -1.5 dBFS: loudness normalisation is
# unreliable on sub-second clips, and phone speakers distort on overs.
level() { # name: normalise $OUT/name.wav into $OUT/name.mp3
  local wav="$OUT/$1.wav" peak
  peak=$(ffmpeg -hide_banner -nostats -i "$wav" -af volumedetect -f null - 2>&1 | awk '/max_volume/ {print $5}')
  ffmpeg -v error -y -i "$wav" -af "volume=$(awk -v p="$peak" 'BEGIN { print -1.5 - p }')dB" -c:a libmp3lame -q:a 4 "$OUT/$1.mp3"
  rm "$wav"
}
one() { # name, input (single source)
  ffmpeg -v error -y -i "$2" -ac 1 -ar 44100 "$OUT/$1.wav"
  level "$1"
}
mix() { # name, inputs...: layered sources, then levelled together
  local name=$1; shift
  local args=() n=0
  for input in "$@"; do
    if [[ $input == aevalsrc=* ]]; then args+=(-f lavfi -i "$input"); else args+=(-i "$input"); fi
    n=$((n + 1))
  done
  ffmpeg -v error -y "${args[@]}" -filter_complex "amix=inputs=$n:normalize=0" -ac 1 -ar 44100 "$OUT/$name.wav"
  level "$name"
}

one tap      "$ui/select_001.ogg"         # a light tick
one place    "$ui/drop_002.ogg"           # a tile settling into place
one draw     "$ui/drop_003.ogg"           # a doodle dropping onto the board
mix merge    "$ui/confirmation_004.ogg" "$thump"   # bright confirm with a low thump
one discover "$steel/jingles_STEEL09.ogg" # short rising steel-drum lift
mix deliver  "$casino/chips-stack-3.ogg" "$ui/confirmation_001.ogg"  # coins + chime
one levelup  "$steel/jingles_STEEL10.ogg" # rising steel-drum run
one invalid  "$ui/error_004.ogg"          # a short, soft "nope"
one erase    "$ui/minimize_003.ogg"       # a quick whoosh away
one hint     "$ui/question_002.ogg"       # a curious twinkle
one solved   "$steel/jingles_STEEL02.ogg" # an octave-climbing steel-drum finish

# Scribble Siege
hits="$SRC/jingleSounds_Kenney/OGG/jingles_HIT"
one sg-hit    "$ui/drop_001.ogg"           # a light knock (rate-limited in game)
one sg-kill   "$ui/pluck_001.ogg"          # a scribble popping
one sg-gem    "$ui/glass_002.ogg"          # a bright tink
one sg-coin   "$casino/chips-collide-2.ogg" # a coin clink
one sg-hurt   "$ui/error_002.ogg"          # an ouch
one sg-boss   "$hits/jingles_HIT06.ogg"    # a falling orchestral hit: trouble arrives
one sg-dead   "$steel/jingles_STEEL14.ogg" # a sinking steel-drum run
one sg-splash "$ui/drop_004.ogg"           # an ink splat
one sg-swipe  "$ui/scratch_002.ogg"        # a ruler swish

music() { # name, input
  ffmpeg -v error -y -i "$2" -ar 44100 -af "loudnorm=I=-18:TP=-1.5:LRA=9" -c:a libvorbis -q:a 4 "$OUT/music/$1.ogg"
  ffmpeg -v error -y -i "$2" -ar 44100 -af "loudnorm=I=-18:TP=-1.5:LRA=9" -c:a libmp3lame -q:a 4 "$OUT/music/$1.mp3"
}
music island-vibes "$SRC/ruskerdax_-_happy_vibes.mp3"
music shine-blitz  "$SRC/shineblitz_0.ogg"

ls -la "$OUT"/*.mp3 "$OUT/music"
