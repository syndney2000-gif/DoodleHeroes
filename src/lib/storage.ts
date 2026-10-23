/* Progress lives in localStorage under one "dh:" prefix so the progress page
   can list and clear it. Storage can be missing or throw (private windows,
   blocked site data), so every call fails soft: the game still plays, it just
   won't remember. */

const PREFIX = 'dh:';

export function load<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* unavailable */
  }
}

/** Every key this site has stored, without the prefix. */
export function keys(): string[] {
  try {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
    }
    return out;
  } catch {
    return [];
  }
}

export function clearAll(): void {
  for (const k of keys()) remove(k);
}

/* ---------- finished puzzles ---------- */

export interface Result {
  stars: number;
  seconds: number;
  date: string;
}

/** Best result per puzzle, keyed "<game>/<puzzle id>". */
export function results(): Record<string, Result> {
  return load<Record<string, Result>>('results') ?? {};
}

export function recordResult(game: string, puzzleId: string, result: Result): void {
  const all = results();
  const key = `${game}/${puzzleId}`;
  const prev = all[key];
  if (!prev || result.stars > prev.stars || (result.stars === prev.stars && result.seconds < prev.seconds)) {
    all[key] = result;
    save('results', all);
  }
}
