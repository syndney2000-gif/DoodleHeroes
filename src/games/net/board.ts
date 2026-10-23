/* Lighthouse Wiring — the interactive board, drawn as SVG.
   Tap a tile to turn it clockwise; lock tiles you're sure of. Wires glow
   once they connect back to the lighthouse. */

import { SIDES, isSolved, orientations, parse, powered, rotate, type NetBoard, type NetPuzzle } from './model';
import { solution, solve } from './solver';
import { load, recordResult, remove, save } from '../../lib/storage';
import { starsFor } from '../../lib/scoring';
import type { BoardCallbacks, PlayableBoard } from '../../lib/play-ui';

export const GAME = 'lighthouse-wiring';
const T = 40; // SVG units per tile
const NS = 'http://www.w3.org/2000/svg';
const SIDE_NAME: Record<number, string> = { 1: 'up', 2: 'right', 4: 'down', 8: 'left' };

interface Saved { turns: number[]; locked: number[]; seconds: number; hints: number; solved: boolean }
type Move = { tile: number; kind: 'turn'; by: number } | { tile: number; kind: 'lock' };

export class WiringBoard implements PlayableBoard {
  readonly board: NetBoard;
  private readonly answer: number[];
  /** Quarter turns applied to each tile, kept cumulative so CSS can animate. */
  private turns: number[];
  private locked: boolean[];
  private undoStack: Move[] = [];
  private mode: 'rotate' | 'lock' = 'rotate';
  private hints = 0;
  private seconds = 0;
  private solved = false;
  private timer: number | undefined;
  private focus = 0;
  private pendingHint: { tile: number; mask: number } | null = null;

  private svg!: SVGSVGElement;
  private tileEls: SVGGElement[] = [];
  private spinEls: SVGGElement[] = [];

  constructor(private readonly root: HTMLElement, private readonly puzzle: NetPuzzle, private readonly cb: BoardCallbacks) {
    this.board = parse(puzzle);
    const sol = solution(this.board);
    if (!sol) throw new Error(`Lighthouse Wiring puzzle ${puzzle.id} has no unique solution`);
    this.answer = sol;
    this.turns = this.board.tiles.map(() => 0);
    this.locked = this.board.tiles.map(() => false);
    this.focus = this.board.source;

    const saved = load<Saved>(this.saveKey);
    if (saved && saved.turns.length === this.turns.length) {
      this.turns = saved.turns;
      this.locked = this.locked.map((_, i) => saved.locked.includes(i));
      this.seconds = saved.seconds;
      this.hints = saved.hints;
      this.solved = saved.solved;
    }

    this.render();
    this.refresh();
    if (this.solved) this.showSolved();
    else this.startTimer();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.stopTimer(); this.persist(); }
      else if (!this.solved) this.startTimer();
    });
  }

  get hintCount() { return this.hints; }
  private get saveKey() { return `${GAME}:${this.puzzle.id}`; }
  private mask(i: number) { return rotate(this.board.tiles[i], this.turns[i]); }
  private masks() { return this.board.tiles.map((_, i) => this.mask(i)); }

  setMode(mode: 'rotate' | 'lock') { this.mode = mode; }

  /* ---------- rendering ---------- */

  private render() {
    const { w, h, tiles, source } = this.board;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w * T} ${h * T}`);
    svg.setAttribute('class', 'nw-board');
    svg.setAttribute('role', 'grid');
    svg.setAttribute('aria-label', `${this.puzzle.title}: ${w} by ${h} grid of wire tiles`);
    svg.style.setProperty('--w', String(w));
    this.svg = svg;

    tiles.forEach((orig, i) => {
      const r = Math.floor(i / w), c = i % w;
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'nw-tile');
      g.setAttribute('transform', `translate(${c * T} ${r * T})`);
      g.setAttribute('tabindex', i === this.focus ? '0' : '-1');
      g.setAttribute('role', 'gridcell');
      g.dataset.i = String(i);

      const bg = document.createElementNS(NS, 'rect');
      bg.setAttribute('class', 'nw-bg');
      bg.setAttribute('x', '1'); bg.setAttribute('y', '1');
      bg.setAttribute('width', String(T - 2)); bg.setAttribute('height', String(T - 2));
      bg.setAttribute('rx', '5');
      g.append(bg);

      // The wires are drawn once from the original mask; turning a tile only
      // changes this group's rotation, which CSS animates.
      const spin = document.createElementNS(NS, 'g');
      spin.setAttribute('class', 'nw-spin');
      for (const side of SIDES) {
        if (!(orig & side)) continue;
        const [x2, y2] = side === 1 ? [T / 2, 0] : side === 2 ? [T, T / 2] : side === 4 ? [T / 2, T] : [0, T / 2];
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', String(T / 2)); line.setAttribute('y1', String(T / 2));
        line.setAttribute('x2', String(x2)); line.setAttribute('y2', String(y2));
        line.setAttribute('class', 'nw-wire');
        spin.append(line);
      }
      const isEnd = [1, 2, 4, 8].includes(orig);
      let house: SVGPathElement | null = null;
      if (i === source) {
        const beacon = document.createElementNS(NS, 'circle');
        beacon.setAttribute('cx', String(T / 2)); beacon.setAttribute('cy', String(T / 2));
        beacon.setAttribute('r', String(T * 0.26));
        beacon.setAttribute('class', 'nw-source');
        spin.append(beacon);
      } else if (isEnd) {
        // A cottage at the end of the line. It sits outside the turning
        // group so it stays upright while its wire swings round.
        house = document.createElementNS(NS, 'path');
        const m = T / 2, s = T * 0.19;
        house.setAttribute('d', `M${m - s} ${m + s} V${m - s * 0.2} L${m} ${m - s * 1.2} L${m + s} ${m - s * 0.2} V${m + s} Z`);
        house.setAttribute('class', 'nw-house');
      } else {
        const hub = document.createElementNS(NS, 'circle');
        hub.setAttribute('cx', String(T / 2)); hub.setAttribute('cy', String(T / 2));
        hub.setAttribute('r', '3.4');
        hub.setAttribute('class', 'nw-hub');
        spin.append(hub);
      }
      g.append(spin);
      if (house) g.append(house);

      const lock = document.createElementNS(NS, 'path');
      lock.setAttribute('d', `M${T - 11} 4 h7 v7 h-7 Z`);
      lock.setAttribute('class', 'nw-lock');
      g.append(lock);

      this.tileEls.push(g);
      this.spinEls.push(spin);
      svg.append(g);
    });

    svg.addEventListener('click', (e) => this.onClick(e));
    svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const i = this.tileAt(e);
      if (i != null) this.act(i, true);
    });
    svg.addEventListener('keydown', (e) => this.onKey(e));
    this.root.textContent = '';
    this.root.append(svg);
  }

  private refresh(marks: { wrong?: number[]; hint?: number } = {}) {
    const lit = powered(this.board, this.masks());
    this.tileEls.forEach((g, i) => {
      this.spinEls[i].style.transform = `rotate(${this.turns[i] * 90}deg)`;
      g.classList.toggle('lit', lit.has(i));
      g.classList.toggle('locked', this.locked[i]);
      g.classList.toggle('wrong', !!marks.wrong?.includes(i));
      g.classList.toggle('hint', marks.hint === i);
      const r = Math.floor(i / this.board.w) + 1, c = (i % this.board.w) + 1;
      const ends = SIDES.filter((s) => this.mask(i) & s).map((s) => SIDE_NAME[s]).join(', ');
      g.setAttribute('aria-label', `Row ${r}, column ${c}: wires ${ends}${lit.has(i) ? ', powered' : ''}${this.locked[i] ? ', locked' : ''}`);
    });
  }

  /* ---------- editing ---------- */

  private tileAt(e: MouseEvent): number | null {
    const g = (e.target as Element).closest<SVGGElement>('.nw-tile');
    return g ? Number(g.dataset.i) : null;
  }

  private onClick(e: MouseEvent) {
    const i = this.tileAt(e);
    if (i == null) return;
    this.moveFocus(i, false);
    this.act(i, e.shiftKey);
  }

  /** A tap: turn the tile, or toggle its lock in lock mode. */
  private act(i: number, backwards: boolean) {
    if (this.solved) return;
    if (this.mode === 'lock') { this.toggleLock(i); return; }
    this.turn(i, backwards ? -1 : 1);
  }

  private turn(i: number, by: number, record = true) {
    if (this.locked[i]) {
      this.cb.onStatus('That tile is locked. Unlock it first (switch to Lock, or press L).');
      return;
    }
    this.turns[i] += by;
    if (record) this.undoStack.push({ tile: i, kind: 'turn', by });
    this.after();
  }

  private toggleLock(i: number, record = true) {
    this.locked[i] = !this.locked[i];
    if (record) this.undoStack.push({ tile: i, kind: 'lock' });
    this.after();
    if (!this.solved) this.cb.onStatus(this.locked[i] ? 'Tile locked.' : 'Tile unlocked.');
  }

  private after() {
    this.pendingHint = null;
    this.refresh();
    if (isSolved(this.board, this.masks())) this.finish();
    this.persist();
  }

  undo() {
    if (this.solved) return;
    const move = this.undoStack.pop();
    if (!move) { this.cb.onStatus('Nothing to undo.'); return; }
    if (move.kind === 'turn') this.turns[move.tile] -= move.by;
    else this.locked[move.tile] = !this.locked[move.tile];
    this.after();
    this.cb.onStatus('Undone.');
  }

  restart() {
    this.turns = this.board.tiles.map(() => 0);
    this.locked = this.board.tiles.map(() => false);
    this.undoStack = [];
    this.hints = 0;
    this.seconds = 0;
    this.solved = false;
    this.pendingHint = null;
    this.svg.classList.remove('solved');
    remove(this.saveKey);
    this.refresh();
    this.cb.onTick(0);
    this.startTimer();
    this.cb.onStatus('Tiles reset to how they started.');
  }

  /* ---------- keyboard ---------- */

  private moveFocus(i: number, focus = true) {
    this.tileEls[this.focus].setAttribute('tabindex', '-1');
    this.focus = i;
    this.tileEls[i].setAttribute('tabindex', '0');
    if (focus) this.tileEls[i].focus();
  }

  private onKey(e: KeyboardEvent) {
    const { w, h } = this.board;
    const r = Math.floor(this.focus / w), c = this.focus % w;
    const move: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (move[e.key]) {
      e.preventDefault();
      const [dr, dc] = move[e.key];
      this.moveFocus(Math.min(h - 1, Math.max(0, r + dr)) * w + Math.min(w - 1, Math.max(0, c + dc)));
      return;
    }
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.undo(); return; }
    if (this.solved) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.turn(this.focus, e.shiftKey ? -1 : 1); }
    else if (e.key === 'l' || e.key === 'L') { e.preventDefault(); this.toggleLock(this.focus); }
  }

  /* ---------- help ---------- */

  private lockedWrong(): number[] {
    return this.locked.flatMap((on, i) => (on && this.mask(i) !== this.answer[i] ? [i] : []));
  }

  check() {
    if (this.solved) return;
    const wrong = this.lockedWrong();
    this.refresh({ wrong });
    const anyLocked = this.locked.some(Boolean);
    this.cb.onStatus(
      wrong.length ? `${wrong.length} locked ${wrong.length === 1 ? 'tile is' : 'tiles are'} turned the wrong way — marked in red.`
      : anyLocked ? 'Every locked tile is right.'
      : 'Lock tiles you’re sure of (Lock mode, or press L) and Check will tell you if any are wrong.');
  }

  hint() {
    if (this.solved) return;
    const wrong = this.lockedWrong();
    if (wrong.length) {
      this.useHint();
      this.refresh({ wrong });
      this.cb.onStatus(`Fix the locked ${wrong.length === 1 ? 'tile' : 'tiles'} marked in red first — later reasoning depends on ${wrong.length === 1 ? 'it' : 'them'}.`);
      return;
    }

    if (this.pendingHint) {
      const { tile, mask } = this.pendingHint;
      this.useHint();
      // Turn the shortest way round to the deduced orientation, then lock.
      let by = 0;
      while (rotate(this.board.tiles[tile], this.turns[tile] + by) !== mask) by++;
      if (by === 3) by = -1;
      this.turns[tile] += by;
      this.locked[tile] = true;
      this.undoStack.push({ tile, kind: 'turn', by }, { tile, kind: 'lock' });
      this.after();
      if (!this.solved) this.cb.onStatus('Turned and locked the tile the hint pointed at.');
      return;
    }

    // Locked tiles are all correct, so they're safe facts; deduce from them.
    const start = this.board.tiles.map((m, i) => (this.locked[i] ? [this.mask(i)] : orientations(m)));
    const run = solve(this.board, start);
    // Prefer tiles the solver settled early (a chain a person can follow)
    // and that are still turned the wrong way.
    const order = [...new Set([...run.steps.flatMap((st) => st.tiles), ...this.board.tiles.keys()])];
    const settled = (i: number) => run.options[i].length === 1 && !this.locked[i];
    const tile = order.find((i) => settled(i) && this.mask(i) !== run.options[i][0]) ?? order.find(settled);
    if (tile == null) {
      this.cb.onStatus('Every tile left follows from the locked ones — keep going!');
      return;
    }
    this.useHint();
    this.pendingHint = { tile, mask: run.options[tile][0] };
    this.refresh({ hint: tile });
    const r = Math.floor(tile / this.board.w) + 1, c = (tile % this.board.w) + 1;
    this.cb.onStatus(`Look at the tile in row ${r}, column ${c} (outlined): with the board edges and your locked tiles, it can only face one way. Press Hint again to turn and lock it.`);
  }

  private useHint() {
    this.hints++;
    this.persist();
  }

  /* ---------- finishing ---------- */

  private finish() {
    this.solved = true;
    this.stopTimer();
    const stars = starsFor(this.hints);
    recordResult(GAME, this.puzzle.id, { stars, seconds: this.seconds, date: new Date().toISOString() });
    this.showSolved();
  }

  private showSolved() {
    this.svg.classList.add('solved');
    this.refresh();
    this.cb.onSolved({ stars: starsFor(this.hints), seconds: this.seconds, hints: this.hints });
  }

  private startTimer() {
    if (this.timer || this.solved) return;
    this.timer = window.setInterval(() => {
      this.seconds++;
      this.cb.onTick(this.seconds);
      if (this.seconds % 15 === 0) this.persist();
    }, 1000);
    this.cb.onTick(this.seconds);
  }

  private stopTimer() {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private persist() {
    save(this.saveKey, {
      turns: this.turns.map((t) => ((t % 4) + 4) % 4),
      locked: this.locked.flatMap((on, i) => (on ? [i] : [])),
      seconds: this.seconds,
      hints: this.hints,
      solved: this.solved,
    } satisfies Saved);
  }
}
