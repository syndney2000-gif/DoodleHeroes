/* Scribble Siege — original synthesized sounds and shared CC0 cues.
   Busy sounds like hits are rate-limited so a big crowd doesn't turn into
   noise. */

import type { GameEvent } from './engine';

import { tone, playSound } from '../../lib/audio';
export { soundOn, setSound } from '../../lib/audio';
const last = new Map<string, number>();

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
  coin: () => limited('coin', 80, () => { tone(880, .07, 'triangle', .06); tone(1320, .09, 'triangle', .06, undefined, .05); }),
  hurt: () => tone(150, 0.25, 'sawtooth', 0.12, 70),
  levelup: () => playSound('levelup'),
  boss: () => [196, 185, 175, 165].forEach((f, k) => tone(f, .3, 'sawtooth', .1, undefined, k * .16)),
  win: () => playSound('solved'),
  dead: () => [392, 330, 262, 196].forEach((f, k) => tone(f, .24, 'triangle', .12, undefined, k * .14)),
  splash: () => limited('splash', 200, () => tone(200, 0.15, 'sine', 0.06, 120)),
  swipe: () => limited('swipe', 150, () => tone(700, 0.08, 'triangle', 0.04, 300)),
};

export function play(events: GameEvent[]) {
  for (const e of events) sounds[e]?.();
}
