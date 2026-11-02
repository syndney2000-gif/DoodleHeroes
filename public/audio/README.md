# Original Doodle Heroes audio — CC0-1.0

Every `.wav` in this directory is an original mathematical synthesis generated
by `scripts/generate-audio.py`. No recordings, stock samples, songs, casino
assets, melodies from existing works, or third-party audio were used.

**A Stroll Around the Island** (`meadow-loop.wav`) is an original 60-second,
24-bar background miniature at 96 BPM. Six phrases trade a thumb-piano-style
plucked hook and soft whistle responses, with lightly strummed chords, warm
bass, brushed shakers and quiet wooden percussion. A contrasting middle passage,
sparse countermelody and changing instrumentation give the tune room to develop.
Stereo room reflections and instrument release tails wrap across the boundary
for seamless looping. The master is stereo 24 kHz PCM WAV.

`meadow-loop.ogg` is the compact Vorbis playback version. The browser falls back
to the WAV master if Vorbis is unavailable. Regeneration also creates the Ogg
when `ffmpeg` with `libvorbis` is installed; Python alone reproduces the master.
The other eleven files are short cartoon pops, pitch swoops and discovery/reward
chimes, stored as mono 24 kHz PCM WAV. All instrument sounds are synthesized
from scratch, with no recordings, samples or borrowed melodies.

Music is off by default, starts after a user gesture, and has its own volume
and toggle in the toolbar and Settings. Effects retain their separate saved
preference. Both pause in background tabs. Music is fetched only when enabled.

To the extent possible under law, the authors dedicate these sound assets and
their generator to the public domain under CC0 1.0 Universal. They may be used,
modified and redistributed, including commercially, without attribution.

SPDX-License-Identifier: CC0-1.0
Legal code: https://creativecommons.org/publicdomain/zero/1.0/legalcode

Regenerate from source with Python 3: `python3 scripts/generate-audio.py`.
The rest of the project is not relicensed by this dedication.
