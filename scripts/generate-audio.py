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
                # Soft bell-like partial, built entirely from sine waves.
                value += gain * envelope * (math.sin(math.tau * freq * u) + .18 * math.sin(math.tau * freq * 2 * u))
        data.append(struct.pack('<h', round(max(-1, min(1, value)) * 32767)))
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(b''.join(data))
    print(f'{name}.wav')
