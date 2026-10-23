import { describe, expect, test } from 'vitest';
import { JAR_HOURS, collectJar, jarCoins, jarRate, type Profile } from '../src/games/survivor/meta';

const HOUR = 3_600_000;
const fresh = (): Profile => ({ coins: 0, upgrades: {}, totalKills: 0, runs: 0, wins: 0, bestTime: {}, daily: {} });

describe('coin jar', () => {
  test('a new profile has an empty jar until it is started', () => {
    const p = fresh();
    expect(jarCoins(p, 1e12)).toBe(0);
    expect(collectJar(p, 1e12)).toBe(0);
    expect(p.jarSince).toBe(1e12);
  });

  test('fills at its hourly rate', () => {
    const p = { ...fresh(), jarSince: 0 };
    expect(jarCoins(p, 2 * HOUR)).toBe(2 * jarRate(p));
  });

  test('stops filling when full', () => {
    const p = { ...fresh(), jarSince: 0 };
    expect(jarCoins(p, 100 * HOUR)).toBe(Math.floor(JAR_HOURS * jarRate(p)));
  });

  test('a clock set backwards gives nothing', () => {
    const p = { ...fresh(), jarSince: 10 * HOUR };
    expect(jarCoins(p, 5 * HOUR)).toBe(0);
  });

  test('collecting moves coins into the purse and empties the jar', () => {
    const p = { ...fresh(), jarSince: 0 };
    const got = collectJar(p, 3 * HOUR);
    expect(got).toBeGreaterThan(0);
    expect(p.coins).toBe(got);
    expect(jarCoins(p, 3 * HOUR)).toBe(0);
  });

  test('collecting less than one coin keeps the partial fill', () => {
    const p = { ...fresh(), jarSince: 0 };
    expect(collectJar(p, 60_000)).toBe(0);
    expect(p.jarSince).toBe(0);
  });

  test('more heroes and Greed fill it faster', () => {
    const base = jarRate(fresh());
    expect(jarRate({ ...fresh(), upgrades: { greed: 2 } })).toBe(base + 4);
    expect(jarRate({ ...fresh(), wins: 1 })).toBeGreaterThan(base);
  });
});
