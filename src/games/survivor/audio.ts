/* Scribble Siege — CC0 sample cues (see public/audio/README.md).
   Busy sounds like hits are rate-limited so a big crowd doesn't turn into
   noise. */

import type { GameEvent } from './engine';

import { playSound } from '../../lib/audio';
export { musicOn, setMusic, soundOn, setSound } from '../../lib/audio';
const last = new Map<string, number>();

function limited(key: string, gapMs: number, play: () => void) {
  const now = performance.now();
  if (now - (last.get(key) ?? 0) < gapMs) return;
  last.set(key, now);
  play();
}

const sounds: Partial<Record<GameEvent, () => void>> = {
  hit: () => limited('hit', 70, () => playSound('sg-hit')),
  kill: () => limited('kill', 90, () => playSound('sg-kill')),
  gem: () => limited('gem', 60, () => playSound('sg-gem')),
  coin: () => limited('coin', 80, () => playSound('sg-coin')),
  hurt: () => playSound('sg-hurt'),
  levelup: () => playSound('levelup'),
  boss: () => playSound('sg-boss'),
  win: () => playSound('solved'),
  dead: () => playSound('sg-dead'),
  splash: () => limited('splash', 200, () => playSound('sg-splash')),
  swipe: () => limited('swipe', 150, () => playSound('sg-swipe')),
};

export function play(events: GameEvent[]) {
  for (const e of events) sounds[e]?.();
}
