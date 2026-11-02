"""Original Doodle Heroes sound assets. Dedicated to CC0-1.0.
Reproduce with: python3 scripts/generate-audio.py
No samples, recordings, third-party music or external dependencies.
"""
import math
import struct
import wave
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'public' / 'audio'
RATE = 24000
# (frequency, duration, start, gain); original short tonal gestures.
CUES = {
    'tap': [(620, .055, 0, .16)],
    'place': [(330, .09, 0, .16), (495, .07, .025, .08)],
    'draw': [(440, .09, 0, .13), (660, .13, .055, .15)],
    'merge': [(523.25, .12, 0, .14), (659.25, .13, .055, .14), (783.99, .19, .11, .16)],
    'discover': [(659.25, .17, 0, .12), (783.99, .17, .09, .13), (1046.5, .3, .18, .13)],
    'deliver': [(783.99, .12, 0, .12), (1046.5, .16, .08, .13), (1318.51, .23, .16, .1)],
    'levelup': [(523.25, .17, 0, .12), (659.25, .17, .09, .12), (783.99, .17, .18, .12), (1046.5, .3, .27, .12)],
    'invalid': [(180, .10, 0, .08)],
    'erase': [(280, .08, 0, .10), (210, .09, .04, .07)],
    'hint': [(587.33, .14, 0, .12), (880, .18, .09, .10)],
    'solved': [(523.25, .2, 0, .12), (659.25, .2, .12, .12), (783.99, .2, .24, .12), (1046.5, .45, .36, .12)],
}
OUT.mkdir(parents=True, exist_ok=True)
for name, notes in CUES.items():
    duration = max(start + length for _, length, start, _ in notes) + .02
    data = []
    for i in range(math.ceil(duration * RATE)):
        t = i / RATE
        value = 0.
        for freq, length, start, gain in notes:
            u = t - start
            if 0 <= u < length:
                envelope = min(1., u / .007) * (1 - u / length) ** 2
                # A rounded cartoon pop: a short pitch swoop, soft overtones,
                # and no harsh square waves. The phase is continuous.
                direction = -1 if name in ('invalid', 'erase') else 1
                bend = .22 * direction
                phase = math.tau * freq * ((1 - bend) * u + bend * u * u / (2 * length))
                value += gain * envelope * (math.sin(phase) + .12 * math.sin(phase * 2))
        data.append(struct.pack('<h', round(max(-1, min(1, value)) * 32767)))
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(b''.join(data))
    print(f'{name}.wav')

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
