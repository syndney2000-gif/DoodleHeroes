import { describe, expect, test } from 'vitest';
import { earnedIds, lastWeek, streak } from '../src/lib/achievements';

const solved = (keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, { stars: 3, seconds: 60, date: '2026-10-23' }]));
const today = new Date(2026, 9, 23); // 23 Oct 2026, local time

describe('streak', () => {
  test('counts consecutive days ending today', () => {
    const r = solved(['island-sketch/daily-2026-10-21', 'isle-spans/daily-2026-10-22', 'lighthouse-wiring/daily-2026-10-23']);
    expect(streak(r, today)).toBe(3);
  });

  test('a streak ending yesterday still counts until today is over', () => {
    const r = solved(['island-sketch/daily-2026-10-21', 'island-sketch/daily-2026-10-22']);
    expect(streak(r, today)).toBe(2);
  });

  test('a gap breaks it', () => {
    const r = solved(['island-sketch/daily-2026-10-20', 'island-sketch/daily-2026-10-23']);
    expect(streak(r, today)).toBe(1);
  });

  test('several dailies on one day count once', () => {
    const r = solved(['island-sketch/daily-2026-10-23', 'isle-spans/daily-2026-10-23']);
    expect(streak(r, today)).toBe(1);
  });

  test('last week marks the right days', () => {
    const week = lastWeek(solved(['isle-spans/daily-2026-10-17', 'isle-spans/daily-2026-10-23']), today);
    expect(week.map((d) => d.done)).toEqual([true, false, false, false, false, false, true]);
  });
});

describe('stickers', () => {
  test('first solves and clean sheets', () => {
    const ids = earnedIds(solved(['island-sketch/sun']), today);
    expect(ids.has('first-sketch')).toBe(true);
    expect(ids.has('clean-sheet')).toBe(true);
    expect(ids.has('first-bridge')).toBe(false);
  });

  test('expedition chapter 1 needs all three of its puzzles', () => {
    expect(earnedIds(solved(['island-sketch/sail', 'isle-spans/two-coves']), today).has('landfall')).toBe(false);
    expect(earnedIds(solved(['island-sketch/sail', 'isle-spans/two-coves', 'lighthouse-wiring/first-light']), today).has('landfall')).toBe(true);
  });
});
