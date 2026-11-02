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

# Original eight-bar, 96 BPM meadow miniature. A pentatonic plucked melody
# over four warm, sparse chords. Every voice wraps around the loop boundary,
# so both the waveform and release tails join without a click or silence.
LOOP = 20.
BEAT = .625
music = []
chords = [(130.8128, 164.8138, 195.9977), (110., 130.8128, 164.8138),
          (87.3071, 130.8128, 174.6141), (97.9989, 146.8324, 195.9977)]
for bar, chord in enumerate(chords):
    for freq in chord:
        music.append((freq, 5.5, bar * 5., .018, 'pad'))
    for step, note in enumerate([0, 2, 1, 2]):
        music.append((chord[note] * 2, 1.1, bar * 5. + step * 1.25, .055, 'pluck'))
melody = [(0, 523.2511), (1.5, 659.2551), (3, 783.9909), (5, 659.2551),
          (8, 440.), (10, 523.2511), (11.5, 659.2551), (14, 587.3295),
          (16, 523.2511), (18, 783.9909), (19.5, 659.2551), (22, 523.2511),
          (24, 587.3295), (26, 440.), (27.5, 391.9954), (30, 523.2511)]
for beat, freq in melody:
    music.append((freq, 1.1, beat * BEAT, .09, 'pluck'))
frames = bytearray()
for i in range(round(LOOP * RATE)):
    t = i / RATE
    value = 0.
    for freq, length, start, gain, voice in music:
        u = (t - start) % LOOP
        if u >= length:
            continue
        if voice == 'pad':
            envelope = math.sin(math.pi * u / length) ** 2
            value += gain * envelope * math.sin(math.tau * freq * u)
        else:
            envelope = min(1., u / .008) * math.exp(-4.5 * u) * (1 - u / length)
            value += gain * envelope * (math.sin(math.tau * freq * u) + .12 * math.sin(math.tau * freq * 3 * u))
    frames.extend(struct.pack('<h', round(max(-1, min(1, value)) * 32767)))
with wave.open(str(OUT / 'meadow-loop.wav'), 'wb') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(RATE)
    f.writeframes(frames)
print('meadow-loop.wav (20-second seamless original music)')
