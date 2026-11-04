/* Lantern light: one currency earned in every game and spent on
   decorations for the home island. Earnings are worked out from saved
   progress, and spending from the decorations owned, so the balance can't
   drift out of step with either. */

import { load, save } from './storage';
import { worldFrom, type Snapshot } from './world';

export interface Decoration { id: string; name: string; price: number; icon: string; blurb: string }

export const decorations: Decoration[] = [
  { id: 'flowers', name: 'Flower beds', price: 20, icon: 'flower', blurb: 'Bright borders by every cottage.' },
  { id: 'picnic', name: 'Beach picnic', price: 30, icon: 'basket', blurb: 'A checked blanket on the sand.' },
  { id: 'lights', name: 'String lights', price: 40, icon: 'bulb', blurb: 'Little lamps between the gallery and the workshop.' },
  { id: 'kite', name: 'Kite', price: 55, icon: 'kite', blurb: 'Flying high over the workshop.' },
  { id: 'windmill', name: 'Windmill', price: 70, icon: 'windmill', blurb: 'Turns all day in the sea breeze.' },
  { id: 'balloon', name: 'Hot-air balloon', price: 90, icon: 'balloon', blurb: 'Drifts lazily across the sky.' },
  { id: 'whale', name: 'Friendly whale', price: 110, icon: 'whale', blurb: 'Visits the bay and says hello.' },
  { id: 'rainbow', name: 'Rainbow', price: 140, icon: 'rainbow', blurb: 'The finishing touch.' },
];

const puzzleGames = ['island-sketch', 'isle-spans', 'lighthouse-wiring'];

/** Today's three-part mix: a puzzle daily, the doodle, and a daily siege. */
export function dailyMix(s: Snapshot, date: string) {
  return {
    puzzle: puzzleGames.some((g) => s.results[`${g}/daily-${date}`]),
    guess: s.guessDates.includes(date),
    siege: !!s.results[`scribble-siege/daily-${date}`],
  };
}

/** Days on which all three parts of the daily mix were done. */
export function fullMixDays(s: Snapshot): number {
  return s.guessDates.filter((d) => Object.values(dailyMix(s, d)).every(Boolean)).length;
}

export function lightEarned(s: Snapshot): number {
  const stars = Object.values(s.results).reduce((n, r) => n + (Number(r.stars) || 0), 0);
  return stars * 5
    + s.mergeRestored * 15
    + s.siegeWins * 20 + s.siegeRuns * 2
    + s.guessSolved * 8
    + worldFrom(s).chapters * 25
    + fullMixDays(s) * 20;
}

export const owned = (): string[] => {
  const ids = load<string[]>('lantern:owned');
  return Array.isArray(ids) ? ids.filter((id) => decorations.some((d) => d.id === id)) : [];
};

export function lightBalance(s: Snapshot, have = owned()): number {
  const spent = have.reduce((n, id) => n + (decorations.find((d) => d.id === id)?.price ?? 0), 0);
  return lightEarned(s) - spent;
}

/** Buys a decoration if the player can afford it. */
export function buy(s: Snapshot, id: string): boolean {
  const have = owned();
  const item = decorations.find((d) => d.id === id);
  if (!item || have.includes(id) || lightBalance(s, have) < item.price) return false;
  save('lantern:owned', [...have, id]);
  return true;
}
