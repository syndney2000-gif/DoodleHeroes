"""Original Doodle Heroes sound assets. Dedicated to CC0-1.0.
Reproduce with: python3 scripts/generate-audio.py
No samples, recordings, third-party music or external dependencies.
"""
import math
import struct
import wave
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'public' / 'audio'
RATE = 24000  # the music master
OUT.mkdir(parents=True, exist_ok=True)

# ---------- sound effects ----------
# Each cue is layered like a produced game sound: a short transient click,
# a pitch-dropping "thump" for weight, bell partials or plucks for tone,
# sparkles, filtered-noise scribbles, and a small room. Mastered to a
# -1 dBFS peak (UI ticks lower) so they cut through on phone speakers.
import random as _random

SFX_RATE = 32000
_rng = _random.Random(1337)


def _buf(seconds):
    return [0.] * int(seconds * SFX_RATE)


def _add(buf, start, samples, gain=1.):
    # Every layer tapers over its last 25 ms, so nothing stops with a click.
    i0 = int(start * SFX_RATE)
    n = len(samples)
    tail = min(n, int(.025 * SFX_RATE))
    for k, v in enumerate(samples):
        if 0 <= i0 + k < len(buf):
            taper = min(1., (n - k) / tail) if tail else 1.
            buf[i0 + k] += v * gain * taper


def _env(n, attack, decay_tau):
    a = max(1, int(attack * SFX_RATE))
    return [min(1., k / a) * math.exp(-k / (decay_tau * SFX_RATE)) for k in range(n)]


def thump(f0, f1, length, gain=1.):
    """A sine that falls in pitch: the weight under an impact."""
    n = int(length * SFX_RATE)
    out, phase = [], 0.
    env = _env(n, .002, length / 4)
    for k in range(n):
        f = f1 + (f0 - f1) * math.exp(-k / (length / 6 * SFX_RATE))
        phase += math.tau * f / SFX_RATE
        out.append(math.sin(phase) * env[k] * gain)
    return out


def click(length=.006, tone=.5, gain=1.):
    """A filtered noise burst for the attack. tone 0 = dull, 1 = bright."""
    n = int(length * SFX_RATE)
    out, lp = [], 0.
    for k in range(n):
        x = _rng.uniform(-1, 1)
        lp += (x - lp) * (.15 + .8 * tone)
        out.append(lp * (1 - k / n) ** 2 * gain)
    return out


def bell(freq, length, gain=1., bright=1.):
    """Inharmonic bell partials with fast-decaying highs."""
    n = int(length * SFX_RATE)
    parts = [(1, 1., 1.), (2.0, .45 * bright, .6), (2.76, .3 * bright, .35), (5.4, .12 * bright, .18)]
    out = []
    for k in range(n):
        t = k / SFX_RATE
        att = min(1., t / .002)
        v = sum(g * math.exp(-t / (length * d)) * math.sin(math.tau * freq * r * t) for r, g, d in parts)
        out.append(v * att * gain)
    return out


def pluck(freq, length, gain=1.):
    """A rounded plucked note: triangle-ish with a quick decay."""
    n = int(length * SFX_RATE)
    out = []
    for k in range(n):
        t = k / SFX_RATE
        x = math.sin(math.tau * freq * t) + .3 * math.sin(math.tau * freq * 2 * t) + .12 * math.sin(math.tau * freq * 3 * t)
        out.append(x * min(1., t / .003) * math.exp(-t / (length / 3)) * gain)
    return out


def swoop(f0, f1, length, gain=1.):
    """A bubbly pitch glide (pops, squeaks)."""
    n = int(length * SFX_RATE)
    out, phase = [], 0.
    for k in range(n):
        u = k / n
        f = f0 * (f1 / f0) ** u
        phase += math.tau * f / SFX_RATE
        out.append((math.sin(phase) + .2 * math.sin(2 * phase)) * math.sin(math.pi * u) ** .6 * gain)
    return out


def scribble(length, strokes, gain=1., centre=3200):
    """Pencil-on-paper: band-passed noise in quick strokes."""
    n = int(length * SFX_RATE)
    out = []
    # Simple resonant band-pass (state-variable filter).
    f = 2 * math.sin(math.pi * centre / SFX_RATE)
    low = band = 0.
    for k in range(n):
        t = k / n
        x = _rng.uniform(-1, 1)
        low += f * band
        high = x - low - .6 * band
        band += f * high
        stroke = abs(math.sin(math.pi * strokes * t)) ** 1.5
        out.append(band * stroke * (1 - t) ** .5 * gain)
    return out


def sparkle(start_freq, notes, step, gain=1.):
    """A quick rising run of tiny bells."""
    out = _buf(step * notes + .5)
    scale = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3, 10 / 3]
    for k in range(notes):
        _add(out, k * step, bell(start_freq * scale[k % len(scale)] * (2 if k >= len(scale) else 1), .25, .35, 1.4), gain)
    return out


def room(buf, mix=.18, size=1.):
    """A small Schroeder reverb so rewards ring out."""
    out = buf + [0.] * int(.6 * SFX_RATE)
    combs = [int(d * size * SFX_RATE) for d in (.0297, .0371, .0411, .0437)]
    wet = [0.] * len(out)
    for d in combs:
        line = [0.] * d
        idx = 0
        for k in range(len(out)):
            y = line[idx]
            line[idx] = out[k] + y * .72
            idx = (idx + 1) % d
            wet[k] += y * .25
    for d, g in ((int(.005 * SFX_RATE), .7), (int(.0017 * SFX_RATE), .7)):
        line = [0.] * d
        idx = 0
        for k in range(len(wet)):
            x = wet[k]
            y = line[idx]
            line[idx] = x + y * g
            wet[k] = y - g * x
            idx = (idx + 1) % d
    return [a + b * mix for a, b in zip(out, wet)]


def master(buf, peak_db=-1.):
    # Gentle saturation for punch, then trim the silence and normalise.
    buf = [math.tanh(1.4 * v) for v in buf]
    while len(buf) > 1 and abs(buf[-1]) < 1e-4:
        buf.pop()
    top = max(1e-9, max(abs(v) for v in buf))
    g = 10 ** (peak_db / 20) / top
    fade = int(.01 * SFX_RATE)
    return [v * g * (min(1., (len(buf) - k) / fade)) for k, v in enumerate(buf)]


def cue(name):
    b = _buf(1.6)
    if name == 'tap':        # a soft wooden tick
        _add(b, 0, click(.004, .7)); _add(b, 0, pluck(1200, .05, .5))
        return master(b, -7)
    if name == 'place':      # a satisfying tile "thock"
        _add(b, 0, click(.005, .5)); _add(b, 0, thump(320, 140, .09, 1.)); _add(b, .002, pluck(660, .07, .35))
        return master(b, -4)
    if name == 'draw':       # pencil scribble, then the doodle pops onto the board
        _add(b, 0, scribble(.16, 3, .9)); _add(b, .13, swoop(380, 900, .07, .8)); _add(b, .13, click(.004, .8, .6))
        return master(b, -3)
    if name == 'merge':      # a punchy thump with a bright chord on top
        _add(b, 0, click(.006, .6)); _add(b, 0, thump(220, 70, .22, 1.2))
        for f, d in ((1046.5, 0), (1318.5, .03), (1568, .06)):
            _add(b, d, bell(f, .45, .32))
        return master(room(b, .16), -1)
    if name == 'discover':   # merge impact plus a shimmering rise
        _add(b, 0, click(.006, .6)); _add(b, 0, thump(200, 65, .25, 1.2))
        _add(b, .02, sparkle(880, 8, .045, .5)); _add(b, .38, bell(2093, .7, .3))
        return master(room(b, .24, 1.1), -1)
    if name == 'deliver':    # coins: two metallic chinks over a thump
        _add(b, 0, thump(260, 90, .15, .9))
        for d, f in ((0, 2637), (.09, 3136)):
            _add(b, d, click(.003, 1., .8)); _add(b, d, bell(f, .35, .45, 1.6))
        _add(b, .18, bell(1568, .5, .3))
        return master(room(b, .18), -1)
    if name == 'levelup':    # a bright rising fanfare that lands on a thump
        for k, f in enumerate((523.25, 659.25, 783.99, 1046.5)):
            _add(b, k * .085, pluck(f, .25, .7)); _add(b, k * .085, bell(f * 2, .3, .2))
        _add(b, .34, thump(180, 60, .3, 1.1)); _add(b, .34, sparkle(1046.5, 7, .04, .45))
        return master(room(b, .26, 1.2), -1)
    if name == 'invalid':    # a soft rubbery "bonk" — friendly, not harsh
        _add(b, 0, thump(260, 150, .14, 1.)); _add(b, 0, swoop(300, 190, .12, .45))
        return master(b, -6)
    if name == 'erase':      # rubber squeak and a little whoosh away
        _add(b, 0, scribble(.12, 2, .7, 1800)); _add(b, .02, swoop(900, 420, .11, .5))
        return master(b, -5)
    if name == 'hint':       # a magical twinkle
        for k, f in enumerate((1174.66, 1567.98, 2349.32)):
            _add(b, k * .07, bell(f, .4, .45, 1.3))
        return master(room(b, .3, 1.1), -3)
    if name == 'solved':     # chord stab, thump, run of sparkles, ringing tail
        _add(b, 0, click(.007, .6)); _add(b, 0, thump(180, 55, .35, 1.3))
        for f in (523.25, 659.25, 783.99, 1046.5):
            _add(b, 0, pluck(f, .5, .45)); _add(b, 0, bell(f * 2, .7, .16))
        _add(b, .12, sparkle(1046.5, 10, .05, .45)); _add(b, .6, bell(2093, 1., .32))
        return master(room(b, .3, 1.25), -1)
    raise ValueError(name)


for name in ('tap', 'place', 'draw', 'merge', 'discover', 'deliver', 'levelup', 'invalid', 'erase', 'hint', 'solved'):
    samples = cue(name)
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SFX_RATE)
        f.writeframes(b''.join(struct.pack('<h', round(max(-1, min(1, v)) * 32767)) for v in samples))
    print(f'{name}.wav ({len(samples) / SFX_RATE:.2f}s)')

# "A Stroll Around the Island": an original 24-bar miniature at 96 BPM.
# Six four-bar phrases trade a plucked hook and a soft whistle response. Bass,
# lightly strummed chords and brushed percussion give it a gentle walking pulse.
# Event-local rendering keeps regeneration fast even as the arrangement grows.
from array import array
import random
import shutil
import subprocess
import sys

BEAT = 60 / 96
BARS = 24
LOOP = BARS * 4 * BEAT
COUNT = round(LOOP * RATE)
left = array('d', [0.]) * COUNT
right = array('d', [0.]) * COUNT
noise = random.Random(271828)


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def note(voice, midi, beat, beats, gain, pan=0.):
    length = beats * BEAT
    start = round(beat * BEAT * RATE)
    freq = frequency(midi)
    l_gain = math.sqrt((1 - pan) / 2) * gain
    r_gain = math.sqrt((1 + pan) / 2) * gain
    for i in range(math.ceil(length * RATE)):
        t = i / RATE
        phase = math.tau * freq * t
        end = min(1., (length - t) / .045)
        attack = min(1., t / .012)
        if voice == 'pluck':
            wave_value = (math.sin(phase) * math.exp(-3.8 * t)
                          + .25 * math.sin(phase * 2) * math.exp(-7 * t)
                          + .09 * math.sin(phase * 3) * math.exp(-11 * t))
        elif voice == 'strum':
            wave_value = (math.sin(phase) + .35 * math.sin(phase * 2)
                          + .16 * math.sin(phase * 3)) * math.exp(-5 * t)
        elif voice == 'bass':
            wave_value = (math.sin(phase) + .12 * math.sin(phase * 2)) * math.exp(-3.5 * t)
        elif voice == 'whistle':
            envelope = math.sin(math.pi * t / length) ** .7
            # Small, delayed vibrato; smooth attack keeps the high voice gentle.
            vibrato = .018 * min(1., t / .2) * math.sin(math.tau * 4.6 * t)
            wave_value = envelope * (math.sin(phase + vibrato) + .055 * math.sin(phase * 2 + vibrato))
        elif voice == 'brush':
            wave_value = noise.uniform(-1, 1) * math.exp(-35 * t) * .45
        else:  # Quiet wooden rim, with no sharp snare or kick.
            wave_value = (math.sin(phase) + .3 * math.sin(phase * 1.5)) * math.exp(-65 * t)
        value = wave_value * attack * end
        index = (start + i) % COUNT
        left[index] += value * l_gain
        right[index] += value * r_gain


# C6, Am7, Fmaj7, G6, with a contrasting Dm7/Em7 middle phrase.
chords = [(48, 55, 60, 64, 69), (45, 52, 55, 60, 64),
          (41, 53, 57, 60, 64), (43, 55, 59, 62, 64)]
# (beat within a bar, MIDI note, duration in beats). Original question/answer
# figures leave room between phrases instead of filling every beat.
hook = [
    [(0, 76, .65), (.75, 79, .45), (1.5, 81, .7), (2.5, 79, .55), (3.25, 76, .65)],
    [(.5, 72, .7), (1.5, 76, .6), (2.5, 79, .8)],
    [(0, 77, .7), (1, 76, .45), (1.75, 74, .6), (2.75, 72, .8)],
    [(.5, 74, .7), (1.5, 71, .65), (2.5, 72, 1.15)],
]
answer = [
    [(0, 79, .85), (1.25, 76, .65), (2.25, 74, .5), (3, 72, .75)],
    [(.5, 76, .65), (1.5, 72, .75), (2.75, 69, .85)],
    [(0, 72, .65), (1, 74, .6), (2, 76, .65), (3, 77, .6)],
    [(0, 76, .65), (1, 74, .65), (2, 71, .6), (3, 72, .85)],
]
for bar in range(BARS):
    phrase, local = divmod(bar, 4)
    chord = chords[local]
    if phrase == 3 and local < 2:
        chord = [(50, 57, 60, 65, 69), (52, 55, 59, 64, 67)][local]
    at = bar * 4
    # Intro/outro share a lean texture so the loop wraps naturally.
    light = phrase in (0, 5)
    for beat in (0, 2):
        note('bass', chord[0] if beat == 0 else chord[0] + 7,
             at + beat, 1.15, .11 if not light else .085, -.08)
    for beat, volume in [(0.5, .038), (2.5, .032), (3.5, .022)]:
        if light and beat == 3.5:
            continue
        for offset, pitch in enumerate(chord[1:]):
            note('strum', pitch, at + beat + offset * .025, .95, volume, -.4)
    if phrase != 0:
        for eighth in range(8):
            swing = .06 if eighth % 2 else 0
            note('brush', 60, at + eighth * .5 + swing, .22,
                 .025 if eighth % 2 else .017, .5)
        if not light:
            for beat in (1, 3):
                note('wood', 77, at + beat, .2, .018, .2)
    melody = answer if phrase in (2, 3) else hook
    voice = 'whistle' if phrase in (1, 3) else 'pluck'
    for beat, pitch, duration in melody[local]:
        # A lower ending keeps the return to the opening light and unforced.
        if phrase == 5 and local == 3 and beat > 2:
            pitch = 72
        note(voice, pitch, at + beat, duration,
             .075 if voice == 'whistle' else .16, .18)
    if phrase in (2, 4):
        # A sparse lower countermelody joins only in the fuller sections.
        for beat, degree in [(1.25, 2), (3.25, 3)]:
            note('pluck', chord[degree] + 12, at + beat, .7, .055, -.35)

# Short stereo room reflections wrap through the same circular buffer. This
# preserves release tails at the loop boundary without fading the entire song.
dry_left, dry_right = left[:], right[:]
for seconds, gain in [(.083, .12), (.167, .08), (.291, .045)]:
    offset = round(seconds * RATE)
    for i in range(COUNT):
        left[i] += dry_right[(i - offset) % COUNT] * gain
        right[i] += dry_left[(i - offset) % COUNT] * gain
peak = max(max(abs(v) for v in left), max(abs(v) for v in right))
scale = .48 / max(.48, peak)  # Headroom for simultaneous gameplay effects.
frames = array('h')
for l_sample, r_sample in zip(left, right):
    frames.append(round(l_sample * scale * 32767))
    frames.append(round(r_sample * scale * 32767))
if sys.byteorder != 'little':
    frames.byteswap()
with wave.open(str(OUT / 'meadow-loop.wav'), 'wb') as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes(frames.tobytes())
print(f'meadow-loop.wav ({LOOP:g}-second original stereo miniature)')

# The uncompressed master stays available; the browser loads this smaller
# Vorbis version first. Python alone reproduces the master and all effects.
if shutil.which('ffmpeg'):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    '-i', str(OUT / 'meadow-loop.wav'), '-c:a', 'libvorbis',
                    '-q:a', '3', str(OUT / 'meadow-loop.ogg')], check=True)
    print('meadow-loop.ogg (compressed web playback)')
