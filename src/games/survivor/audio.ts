/* Scribble Siege — sound effects, synthesised on the fly (no audio files).
   Busy sounds like hits are rate-limited so a big crowd doesn't turn into
   noise. */

import type { GameEvent } from './engine';
import { load, save } from '../../lib/storage';

let ctx: AudioContext | null = null;
let on = load<boolean>('scribble-siege:sound') ?? true;
const last = new Map<string, number>();

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, slide?: number) {
  if (!on) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    if (slide) o.frequency.linearRampToValueAtTime(slide, ctx.currentTime + dur);
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch {
    /* audio unavailable */
  }
}

function limited(key: string, gapMs: number, play: () => void) {
  const now = performance.now();
  if (now - (last.get(key) ?? 0) < gapMs) return;
  last.set(key, now);
  play();
}

const sounds: Partial<Record<GameEvent, () => void>> = {
  hit: () => limited('hit', 70, () => tone(300 + Math.random() * 120, 0.05, 'square', 0.035)),
  kill: () => limited('kill', 90, () => tone(520, 0.07, 'triangle', 0.05, 260)),
  gem: () => limited('gem', 60, () => tone(980, 0.05, 'sine', 0.05)),
  coin: () => limited('coin', 80, () => { tone(880, 0.07, 'square', 0.06); setTimeout(() => tone(1320, 0.09, 'square', 0.06), 50); }),
  hurt: () => tone(150, 0.25, 'sawtooth', 0.12, 70),
  levelup: () => [523, 659, 784].forEach((f, k) => setTimeout(() => tone(f, 0.14, 'triangle', 0.1), k * 80)),
  boss: () => [196, 185, 175, 165].forEach((f, k) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.1), k * 160)),
  win: () => [523, 659, 784, 1047].forEach((f, k) => setTimeout(() => tone(f, 0.2, 'triangle', 0.12), k * 120)),
  dead: () => [392, 330, 262, 196].forEach((f, k) => setTimeout(() => tone(f, 0.24, 'triangle', 0.12), k * 140)),
  splash: () => limited('splash', 200, () => tone(200, 0.15, 'sine', 0.06, 120)),
  swipe: () => limited('swipe', 150, () => tone(700, 0.08, 'triangle', 0.04, 300)),
};

export function play(events: GameEvent[]) {
  for (const e of events) sounds[e]?.();
}

export function soundOn() { return on; }
export function setSound(v: boolean) { on = v; save('scribble-siege:sound', v); }
