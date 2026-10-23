/* Draw Party — the rules for one room, with no networking. The server feeds
   it messages and the clock; it answers with messages to send. Keeping it
   pure means every rule can be tested without a server. */

import { words as WORDS } from './words';

export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;
export const CHOOSE_SECONDS = 15;
export const DRAW_SECONDS = 80;
export const BREAK_SECONDS = 6;
export const ROUNDS = 2; // each player draws this many times
const NAME_MAX = 16;
const CHAT_MAX = 80;

export interface Stroke { c: string; w: number; p: number[] } // points 0–1000

export type Phase = 'lobby' | 'choosing' | 'drawing' | 'break' | 'over';

export interface Player { id: string; name: string; score: number; guessed: boolean }

/** What every player is allowed to see. */
export interface PublicState {
  phase: Phase;
  players: Player[];
  host: string | null;
  drawer: string | null;
  round: number;
  rounds: number;
  /** The word with unrevealed letters as underscores (drawer sees it all via 'word'). */
  hint: string;
  endsAt: number; // ms timestamp for the current phase, 0 if none
}

export type ServerMsg =
  | { t: 'welcome'; you: string; state: PublicState; strokes: Stroke[] }
  | { t: 'state'; state: PublicState }
  | { t: 'options'; words: string[] }
  | { t: 'word'; word: string }
  | { t: 'stroke'; s: Stroke }
  | { t: 'clear' }
  | { t: 'chat'; from: string; text: string; kind: 'chat' | 'correct' | 'close' | 'system' }
  | { t: 'reveal'; word: string }
  | { t: 'error'; message: string };

export type ClientMsg =
  | { t: 'join'; name: string }
  | { t: 'start' }
  | { t: 'choose'; i: number }
  | { t: 'stroke'; s: Stroke }
  | { t: 'clear' }
  | { t: 'chat'; text: string };

export type Out = { to: 'all' | string; msg: ServerMsg; except?: string };

const COLOURS = new Set(['#2D2B33', '#E0474C', '#3F7FD8', '#3E9E57', '#F08A24', '#E58FA8', '#FFD84D', '#8A5A3C', '#FFFFFF']);

export const normalise = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();

/** Levenshtein distance, for "so close!" messages. */
export function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

/** Names and chat are short, plain text, with a small list of words masked. */
const BLOCKED = ['fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'retard', 'whore', 'slut'];
export function clean(text: string, max: number): string {
  let out = text.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  for (const w of BLOCKED) out = out.replace(new RegExp(w, 'gi'), '★'.repeat(w.length));
  return out;
}

export class Room {
  players: Player[] = [];
  phase: Phase = 'lobby';
  host: string | null = null;
  drawer: string | null = null;
  round = 0;
  word = '';
  options: string[] = [];
  revealed = new Set<number>();
  strokes: Stroke[] = [];
  endsAt = 0;
  phaseStarted = 0;
  /** Order of drawers for the whole game. */
  queue: string[] = [];
  private lastChat = new Map<string, number>();

  constructor(private rand: () => number = Math.random) {}

  /* ---------- views ---------- */

  hint(): string {
    if (!this.word) return '';
    return [...this.word].map((ch, i) => (ch === ' ' ? ' ' : this.revealed.has(i) ? ch : '_')).join('');
  }

  view(): PublicState {
    return {
      phase: this.phase, players: this.players.map((p) => ({ ...p })), host: this.host, drawer: this.drawer,
      round: this.round, rounds: ROUNDS, hint: this.phase === 'drawing' ? this.hint() : '', endsAt: this.endsAt,
    };
  }

  private state(): Out { return { to: 'all', msg: { t: 'state', state: this.view() } }; }
  private system(text: string): Out { return { to: 'all', msg: { t: 'chat', from: '', text, kind: 'system' } }; }

  /* ---------- people ---------- */

  join(id: string, rawName: string): Out[] {
    if (this.players.length >= MAX_PLAYERS) return [{ to: id, msg: { t: 'error', message: 'This room is full.' } }];
    const name = clean(rawName, NAME_MAX) || `Doodler ${this.players.length + 1}`;
    this.players.push({ id, name, score: 0, guessed: false });
    this.host ??= id;
    if (this.phase !== 'lobby' && this.phase !== 'over') this.queue.push(id); // late joiners get a turn
    return [
      { to: id, msg: { t: 'welcome', you: id, state: this.view(), strokes: this.strokes } },
      this.system(`${name} joined.`),
      this.state(),
    ];
  }

  leave(id: string, now: number): Out[] {
    const p = this.players.find((x) => x.id === id);
    if (!p) return [];
    this.players = this.players.filter((x) => x.id !== id);
    this.queue = this.queue.filter((x) => x !== id);
    if (this.host === id) this.host = this.players[0]?.id ?? null;
    const out: Out[] = [this.system(`${p.name} left.`)];
    if (this.phase !== 'lobby' && this.phase !== 'over' && this.players.length < MIN_PLAYERS) {
      this.phase = 'lobby';
      this.drawer = null;
      this.word = '';
      this.endsAt = 0;
      out.push(this.system('Not enough players — back to the lobby.'));
    } else if (this.drawer === id && (this.phase === 'choosing' || this.phase === 'drawing')) {
      out.push(...this.endTurn(now, 'The artist left.'));
    }
    out.push(this.state());
    return out;
  }

  /* ---------- game flow ---------- */

  start(id: string, now: number): Out[] {
    if (id !== this.host) return [{ to: id, msg: { t: 'error', message: 'Only the host can start.' } }];
    if (this.phase !== 'lobby' && this.phase !== 'over') return [];
    if (this.players.length < MIN_PLAYERS) return [{ to: id, msg: { t: 'error', message: `You need at least ${MIN_PLAYERS} players.` } }];
    for (const p of this.players) { p.score = 0; p.guessed = false; }
    this.queue = [];
    for (let r = 0; r < ROUNDS; r++) this.queue.push(...this.players.map((p) => p.id));
    this.round = 0;
    return [this.system('Game on!'), ...this.nextTurn(now)];
  }

  private nextTurn(now: number): Out[] {
    const next = this.queue.shift();
    if (!next) {
      this.phase = 'over';
      this.drawer = null;
      this.word = '';
      this.endsAt = 0;
      const top = [...this.players].sort((a, b) => b.score - a.score)[0];
      return [this.system(top ? `Game over — ${top.name} wins with ${top.score} points!` : 'Game over.'), this.state()];
    }
    this.round = Math.min(ROUNDS, ROUNDS - Math.floor(this.queue.length / Math.max(1, this.players.length)));
    this.phase = 'choosing';
    this.drawer = next;
    this.word = '';
    this.revealed.clear();
    this.strokes = [];
    for (const p of this.players) p.guessed = false;
    this.options = pickWords(this.rand, 3);
    this.endsAt = now + CHOOSE_SECONDS * 1000;
    return [{ to: 'all', msg: { t: 'clear' } }, { to: next, msg: { t: 'options', words: this.options } }, this.state()];
  }

  choose(id: string, i: number, now: number): Out[] {
    if (this.phase !== 'choosing' || id !== this.drawer) return [];
    this.word = this.options[Math.max(0, Math.min(this.options.length - 1, i | 0))];
    this.phase = 'drawing';
    this.phaseStarted = now;
    this.endsAt = now + DRAW_SECONDS * 1000;
    const name = this.players.find((p) => p.id === id)?.name ?? 'The artist';
    return [{ to: id, msg: { t: 'word', word: this.word } }, this.system(`${name} is drawing.`), this.state()];
  }

  private endTurn(now: number, why: string): Out[] {
    const word = this.word;
    this.phase = 'break';
    this.endsAt = now + BREAK_SECONDS * 1000;
    const out: Out[] = [this.system(word ? `${why} The word was “${word}”.` : why)];
    if (word) out.push({ to: 'all', msg: { t: 'reveal', word } });
    out.push(this.state());
    return out;
  }

  /** Call about once a second: advances phases and reveals hint letters. */
  tick(now: number): Out[] {
    if (this.phase === 'choosing' && now >= this.endsAt) return this.choose(this.drawer!, Math.floor(this.rand() * 3), now);
    if (this.phase === 'drawing') {
      if (now >= this.endsAt) return this.endTurn(now, 'Time’s up!');
      // One letter at half time, another at three quarters, for longer words.
      const done = (now - this.phaseStarted) / (DRAW_SECONDS * 1000);
      const want = this.word.replace(/ /g, '').length >= 4 ? (done >= 0.75 ? 2 : done >= 0.5 ? 1 : 0) : 0;
      if (this.revealed.size < want) {
        const hidden = [...this.word].map((ch, i) => (ch !== ' ' && !this.revealed.has(i) ? i : -1)).filter((i) => i >= 0);
        if (hidden.length > 1) {
          this.revealed.add(hidden[Math.floor(this.rand() * hidden.length)]);
          return [this.state()];
        }
      }
    }
    if (this.phase === 'break' && now >= this.endsAt) return this.nextTurn(now);
    return [];
  }

  /* ---------- drawing ---------- */

  stroke(id: string, s: Stroke): Out[] {
    if (this.phase !== 'drawing' || id !== this.drawer) return [];
    if (!s || !Array.isArray(s.p) || s.p.length < 2 || s.p.length > 400 || !COLOURS.has(s.c)) return [];
    const safe: Stroke = {
      c: s.c,
      w: Math.max(2, Math.min(40, Number(s.w) || 4)),
      p: s.p.slice(0, s.p.length - (s.p.length % 2)).map((v) => Math.max(0, Math.min(1000, Math.round(Number(v) || 0)))),
    };
    if (this.strokes.length >= 3000) return [];
    this.strokes.push(safe);
    return [{ to: 'all', msg: { t: 'stroke', s: safe }, except: id }];
  }

  clearCanvas(id: string): Out[] {
    if (this.phase !== 'drawing' || id !== this.drawer) return [];
    this.strokes = [];
    return [{ to: 'all', msg: { t: 'clear' }, except: id }];
  }

  /* ---------- guessing and chat ---------- */

  chat(id: string, raw: string, now: number): Out[] {
    const p = this.players.find((x) => x.id === id);
    if (!p) return [];
    if (now - (this.lastChat.get(id) ?? 0) < 600) return []; // gentle flood control
    this.lastChat.set(id, now);
    const text = clean(raw, CHAT_MAX);
    if (!text) return [];
    const guessing = this.phase === 'drawing' && id !== this.drawer && !p.guessed;
    if (guessing && normalise(text) === normalise(this.word)) {
      p.guessed = true;
      const left = Math.max(0, this.endsAt - now) / (DRAW_SECONDS * 1000);
      const order = this.players.filter((x) => x.guessed).length; // includes this one
      p.score += Math.round(60 + 240 * left) + Math.max(0, 40 - (order - 1) * 10);
      const artist = this.players.find((x) => x.id === this.drawer);
      if (artist) artist.score += 30;
      const out: Out[] = [{ to: 'all', msg: { t: 'chat', from: p.name, text: `${p.name} guessed it!`, kind: 'correct' } }];
      const everyone = this.players.filter((x) => x.id !== this.drawer).every((x) => x.guessed);
      if (everyone) out.push(...this.endTurn(now, 'Everyone got it!'));
      else out.push(this.state());
      return out;
    }
    if (guessing && this.word && distance(normalise(text), normalise(this.word)) === 1) {
      return [{ to: id, msg: { t: 'chat', from: '', text: `“${text}” is so close!`, kind: 'close' } }];
    }
    // The artist and players who already guessed can't leak the word.
    if (this.phase === 'drawing' && (id === this.drawer || p.guessed) && normalise(text).includes(normalise(this.word))) {
      return [{ to: id, msg: { t: 'chat', from: '', text: 'No spoilers! That message wasn’t sent.', kind: 'system' } }];
    }
    return [{ to: 'all', msg: { t: 'chat', from: p.name, text, kind: 'chat' } }];
  }

  /** One entry point for whatever a client sends. */
  handle(id: string, msg: ClientMsg, now: number): Out[] {
    switch (msg?.t) {
      case 'join': return this.players.some((p) => p.id === id) ? [] : this.join(id, String(msg.name ?? ''));
      case 'start': return this.start(id, now);
      case 'choose': return this.choose(id, Number(msg.i), now);
      case 'stroke': return this.stroke(id, msg.s);
      case 'clear': return this.clearCanvas(id);
      case 'chat': return this.chat(id, String(msg.text ?? ''), now);
      default: return [];
    }
  }
}

function pickWords(rand: () => number, n: number): string[] {
  const out = new Set<string>();
  while (out.size < n) out.add(WORDS[Math.floor(rand() * WORDS.length)]);
  return [...out];
}
