/* Scribble Siege — progress that lasts between runs: coins, bought
   upgrades, unlocked heroes, lifetime stats, the player's drawn hero and
   daily bests. Stored in the browser like every other game on the site. */

import { load, recordResult, save } from '../../lib/storage';
import { heroes, upgrades, type HeroDef, type HeroId, type UpgradeId, type WeaponId } from './data';
import type { Meta } from './engine';

export const GAME = 'scribble-siege';
const KEY = `${GAME}:profile`;

export interface Profile {
  coins: number;
  upgrades: Meta;
  totalKills: number;
  runs: number;
  wins: number;
  bestTime: Partial<Record<HeroId, number>>;
  /** The player's own drawing, as a small PNG data URL, and its weapon. */
  custom?: { image: string; weapon: WeaponId; name: string };
  /** Best daily result per date: seconds survived and kills. */
  daily: Record<string, { seconds: number; kills: number }>;
  /** When the coin jar was last emptied (ms since epoch). */
  jarSince?: number;
}

const empty = (): Profile => ({ coins: 0, upgrades: {}, totalKills: 0, runs: 0, wins: 0, bestTime: {}, daily: {} });

export function loadProfile(): Profile {
  return { ...empty(), ...(load<Profile>(KEY) ?? {}) };
}

export function saveProfile(p: Profile): void {
  save(KEY, p);
}

export function isUnlocked(p: Profile, hero: HeroDef): boolean {
  const u = hero.unlock;
  if (u.kind === 'free') return true;
  if (u.kind === 'survive') return Object.values(p.bestTime).some((t) => (t ?? 0) >= u.seconds);
  if (u.kind === 'kills') return p.totalKills >= u.total;
  return p.wins > 0;
}

export function unlockText(hero: HeroDef): string {
  const u = hero.unlock;
  if (u.kind === 'free') return 'Unlocked from the start.';
  if (u.kind === 'survive') return `Survive ${Math.floor(u.seconds / 60)} minutes in any run.`;
  if (u.kind === 'kills') return `Defeat ${u.total.toLocaleString()} scribbles in total.`;
  return 'Survive a full ten-minute siege.';
}

/** Progress towards a hero's unlock, 0–1. */
export function unlockProgress(p: Profile, hero: HeroDef): number {
  const u = hero.unlock;
  if (isUnlocked(p, hero)) return 1;
  if (u.kind === 'survive') return Math.max(0, ...Object.values(p.bestTime).map((t) => t ?? 0)) / u.seconds;
  if (u.kind === 'kills') return p.totalKills / u.total;
  return 0;
}

export function buyUpgrade(p: Profile, id: UpgradeId): boolean {
  const def = upgrades.find((u) => u.id === id)!;
  const owned = p.upgrades[id] ?? 0;
  if (owned >= def.max) return false;
  const price = def.cost(owned);
  if (p.coins < price) return false;
  p.coins -= price;
  p.upgrades[id] = owned + 1;
  saveProfile(p);
  return true;
}

/** The cheapest thing the player can't afford yet, for the "next unlock" bar. */
export function nextGoal(p: Profile): { label: string; have: number; need: number } | null {
  const options = upgrades
    .filter((u) => (p.upgrades[u.id] ?? 0) < u.max)
    .map((u) => ({ label: `${u.icon} ${u.name} ${(p.upgrades[u.id] ?? 0) + 1}`, need: u.cost(p.upgrades[u.id] ?? 0) }))
    .filter((o) => o.need > p.coins)
    .sort((a, b) => a.need - b.need);
  return options.length ? { label: options[0].label, have: p.coins, need: options[0].need } : null;
}

export interface RunSummary {
  hero: HeroId;
  seconds: number;
  kills: number;
  coins: number;
  won: boolean;
  /** Set for a daily siege: its date. */
  daily?: string;
}

/** Banks a finished run. Returns heroes this run unlocked. */
export function recordRun(p: Profile, r: RunSummary): HeroDef[] {
  const before = heroes.filter((h) => isUnlocked(p, h));
  p.coins += r.coins;
  p.totalKills += r.kills;
  p.runs++;
  if (r.won) p.wins++;
  p.bestTime[r.hero] = Math.max(p.bestTime[r.hero] ?? 0, Math.floor(r.seconds));
  if (r.daily) {
    const prev = p.daily[r.daily];
    if (!prev || r.seconds > prev.seconds || (r.seconds === prev.seconds && r.kills > prev.kills)) {
      p.daily[r.daily] = { seconds: Math.floor(r.seconds), kills: r.kills };
    }
    // A daily siege counts towards the site-wide daily streak like the
    // puzzle dailies do.
    recordResult(GAME, `daily-${r.daily}`, { stars: r.won ? 3 : r.seconds >= 300 ? 2 : 1, seconds: Math.floor(r.seconds), date: new Date().toISOString() });
  }
  saveProfile(p);
  return heroes.filter((h) => isUnlocked(p, h) && !before.includes(h));
}

/* ---------- the coin jar (idle earnings) ---------- */

/** The jar stops filling after this long, so it rewards coming back daily. */
export const JAR_HOURS = 12;

/** Coins per hour while you're away: more heroes and Greed fill it faster. */
export function jarRate(p: Profile): number {
  const unlocked = heroes.filter((h) => isUnlocked(p, h)).length;
  return 4 + 3 * unlocked + 2 * (p.upgrades.greed ?? 0) + Math.min(10, p.wins * 2);
}

/** Coins waiting in the jar at time `now`. */
export function jarCoins(p: Profile, now = Date.now()): number {
  if (p.jarSince == null) return 0;
  // A clock set backwards shouldn't drain the jar or mint coins.
  const hours = Math.min(JAR_HOURS, Math.max(0, (now - p.jarSince) / 3_600_000));
  return Math.floor(hours * jarRate(p));
}

/** Hours until the jar is full, 0 when it already is. */
export function jarHoursLeft(p: Profile, now = Date.now()): number {
  if (p.jarSince == null) return JAR_HOURS;
  return Math.max(0, JAR_HOURS - (now - p.jarSince) / 3_600_000);
}

/** Empties the jar into the coin purse. The first call just starts it. */
export function collectJar(p: Profile, now = Date.now()): number {
  const coins = jarCoins(p, now);
  if (p.jarSince != null && coins === 0 && now >= p.jarSince) {
    return 0; // nothing whole to collect yet; keep the partial hour filling
  }
  p.coins += coins;
  p.jarSince = now;
  saveProfile(p);
  return coins;
}
