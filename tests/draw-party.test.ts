import { describe, expect, test } from 'vitest';
import { BREAK_SECONDS, CHOOSE_SECONDS, DRAW_SECONDS, ROUNDS, Room, clean, distance, type Out } from '../src/games/draw-party/room';
import { words } from '../src/games/draw-party/words';

const S = 1000;
const seq = (...vals: number[]) => { let k = 0; return () => vals[k++ % vals.length]; };
const msgs = (out: Out[], t: string) => out.filter((o) => o.msg.t === t);

function room() {
  const r = new Room(seq(0.1, 0.5, 0.9, 0.3));
  r.join('a', 'Ana'); r.join('b', 'Ben'); r.join('c', 'Cy');
  return r;
}

describe('words', () => {
  test('a decent list with no duplicates', () => {
    expect(words.length).toBeGreaterThan(100);
    expect(new Set(words).size).toBe(words.length);
  });
});

describe('text', () => {
  test('distance', () => {
    expect(distance('cat', 'cut')).toBe(1);
    expect(distance('castle', 'cattle')).toBe(1);
    expect(distance('dog', 'dog')).toBe(0);
  });

  test('clean trims, limits and masks', () => {
    expect(clean('  hi   there  ', 20)).toBe('hi there');
    expect(clean('x'.repeat(50), 10)).toHaveLength(10);
    expect(clean('<script>', 20)).toBe('script');
    expect(clean('oh shit', 20)).toBe('oh ★★★★');
  });
});

describe('lobby', () => {
  test('the first player is host and only the host can start', () => {
    const r = room();
    expect(r.host).toBe('a');
    expect(msgs(r.start('b', 0), 'error')).toHaveLength(1);
    expect(r.phase).toBe('lobby');
  });

  test('a game needs two players', () => {
    const r = new Room();
    r.join('a', 'Ana');
    expect(msgs(r.start('a', 0), 'error')).toHaveLength(1);
  });

  test('the host passes on when the host leaves', () => {
    const r = room();
    r.leave('a', 0);
    expect(r.host).toBe('b');
  });
});

describe('a turn', () => {
  test('the drawer alone gets the word options and the word', () => {
    const r = room();
    const out = r.start('a', 0);
    const opts = msgs(out, 'options');
    expect(opts).toHaveLength(1);
    expect(opts[0].to).toBe(r.drawer);
    const chose = r.choose(r.drawer!, 1, 1 * S);
    expect(msgs(chose, 'word')[0].to).toBe(r.drawer);
    expect(r.view().hint).toMatch(/^[_ ]+$/); // everyone else sees only blanks
  });

  test('if the drawer does not choose, a word is picked for them', () => {
    const r = room();
    r.start('a', 0);
    r.tick(CHOOSE_SECONDS * S + 1);
    expect(r.phase).toBe('drawing');
    expect(r.word).not.toBe('');
  });

  test('only the drawer can draw, and strokes are cleaned up', () => {
    const r = room();
    r.start('a', 0); r.choose(r.drawer!, 0, 0);
    const other = r.players.find((p) => p.id !== r.drawer)!.id;
    expect(r.stroke(other, { c: '#2D2B33', w: 4, p: [1, 2, 3, 4] })).toHaveLength(0);
    expect(r.stroke(r.drawer!, { c: 'javascript:', w: 4, p: [1, 2, 3, 4] })).toHaveLength(0);
    const ok = r.stroke(r.drawer!, { c: '#2D2B33', w: 999, p: [5000, -3, 10, 10, 7] });
    expect(ok[0].except).toBe(r.drawer);
    expect(r.strokes[0]).toEqual({ c: '#2D2B33', w: 40, p: [1000, 0, 10, 10] });
  });

  test('a right guess scores for guesser and artist; close guesses are private', () => {
    const r = room();
    r.start('a', 0); r.choose(r.drawer!, 0, 0);
    const guesser = r.players.find((p) => p.id !== r.drawer)!;
    const word = r.word;
    if (word.length > 2) {
      const near = word.slice(0, -1) + (word.endsWith('z') ? 'y' : 'z');
      const out = r.chat(guesser.id, near, 1 * S);
      expect(out).toHaveLength(1);
      expect(out[0].to).toBe(guesser.id);
    }
    r.chat(guesser.id, word.toUpperCase(), 5 * S);
    expect(guesser.guessed).toBe(true);
    expect(guesser.score).toBeGreaterThan(200);
    expect(r.players.find((p) => p.id === r.drawer)!.score).toBe(30);
  });

  test('the artist cannot spoil the word', () => {
    const r = room();
    r.start('a', 0); r.choose(r.drawer!, 0, 0);
    const out = r.chat(r.drawer!, `it is a ${r.word}`, 1 * S);
    expect(out[0].to).toBe(r.drawer);
  });

  test('when everyone guesses the turn ends early', () => {
    const r = room();
    r.start('a', 0); r.choose(r.drawer!, 0, 0);
    let t = 1 * S;
    for (const p of r.players) if (p.id !== r.drawer) r.chat(p.id, r.word, (t += S));
    expect(r.phase).toBe('break');
  });

  test('hint letters appear at half and three-quarter time for longer words', () => {
    const r = room();
    r.start('a', 0);
    r.options = ['umbrella', 'umbrella', 'umbrella'];
    r.choose(r.drawer!, 0, 0);
    r.tick(DRAW_SECONDS * 0.5 * S + 1);
    expect(r.revealed.size).toBe(1);
    r.tick(DRAW_SECONDS * 0.76 * S);
    expect(r.revealed.size).toBe(2);
  });
});

describe('a whole game', () => {
  test('everyone draws ROUNDS times, then the game ends', () => {
    const r = room();
    let now = 0;
    r.start('a', now);
    const drawers: string[] = [];
    while (r.phase !== 'over' && now < 1e8) {
      if (r.phase === 'choosing') { drawers.push(r.drawer!); r.choose(r.drawer!, 0, now); }
      now += (r.phase === 'drawing' ? DRAW_SECONDS : BREAK_SECONDS) * S + 1;
      r.tick(now);
    }
    expect(r.phase).toBe('over');
    expect(drawers).toHaveLength(r.players.length * ROUNDS);
    for (const p of r.players) expect(drawers.filter((d) => d === p.id)).toHaveLength(ROUNDS);
  });

  test('if players drop below two the room returns to the lobby', () => {
    const r = new Room();
    r.join('a', 'Ana'); r.join('b', 'Ben');
    r.start('a', 0);
    r.leave('b', 1);
    expect(r.phase).toBe('lobby');
  });
});
