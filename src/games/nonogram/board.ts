/* Island Sketch — the interactive board.
   Renders clues and cells as plain DOM, handles mouse, touch and keyboard,
   and saves the board after every move. */

import { EMPTY, FILLED, UNKNOWN, cluesFor, runs, solveGrid, type Cell, type Clues, type Step } from './solver';
import type { Puzzle } from './puzzles';
import { load, recordResult, remove, save } from '../../lib/storage';

export const GAME = 'island-sketch';

interface SavedBoard {
  cells: string;
  seconds: number;
  hints: number;
  solved: boolean;
}

interface Change { i: number; from: Cell; to: Cell }

export interface BoardOptions {
  onStatus(message: string): void;
  onSolved(result: { stars: number; seconds: number; hints: number }): void;
  onTick?(seconds: number): void;
}

const CELL_CHARS = ['?', '#', 'x'] as const;
const STATE_WORD = ['blank', 'filled', 'crossed'] as const;

/** Stars for a finished puzzle: three, minus one per hint, never below one. */
export function starsFor(hints: number): number {
  return Math.max(1, 3 - hints);
}

export class NonogramBoard {
  readonly n: number;
  readonly clues: Clues;
  private cells: Cell[];
  private cellEls: HTMLElement[] = [];
  private rowClueEls: HTMLElement[] = [];
  private colClueEls: HTMLElement[] = [];
  private undoStack: Change[][] = [];
  private focusIndex = 0;
  private mode: 'fill' | 'cross' = 'fill';
  private seconds = 0;
  private hints = 0;
  private solved = false;
  private timer: number | undefined;
  /** A hint that pointed at a line but hasn't revealed its cells yet. */
  private pendingHint: Step | null = null;

  /* drag state */
  private drag: {
    start: number;
    paint: Cell;
    from: Cell;
    axis: 'row' | 'col' | null;
    batch: Change[];
  } | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly puzzle: Puzzle,
    private readonly opts: BoardOptions,
  ) {
    this.n = puzzle.solution.length;
    this.clues = cluesFor(puzzle.solution);
    this.cells = new Array<Cell>(this.n * this.n).fill(UNKNOWN);

    const saved = load<SavedBoard>(this.saveKey);
    if (saved && saved.cells.length === this.cells.length) {
      this.cells = [...saved.cells].map((ch) => CELL_CHARS.indexOf(ch as never) as Cell);
      this.seconds = saved.seconds;
      this.hints = saved.hints;
      this.solved = saved.solved;
    }

    this.render();
    this.refreshAllClues();
    if (this.solved) this.showSolved(false);
    else this.startTimer();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.stopTimer(); this.persist(); }
      else if (!this.solved) this.startTimer();
    });
  }

  private get saveKey() { return `${GAME}:${this.puzzle.id}`; }

  get hintCount() { return this.hints; }

  /* ---------- rendering ---------- */

  private render() {
    const { n, clues } = this;
    const maxRowClue = Math.max(1, ...clues.rows.map((c) => c.length));
    const maxColClue = Math.max(1, ...clues.cols.map((c) => c.length));
    this.root.textContent = '';
    this.root.className = 'ns-board';
    this.root.style.setProperty('--n', String(n));
    this.root.style.setProperty('--rc', String(maxRowClue));
    this.root.style.setProperty('--cc', String(maxColClue));
    this.root.setAttribute('role', 'grid');
    this.root.setAttribute('aria-label', `${this.puzzle.title}, ${n} by ${n} grid`);

    const header = el('div', 'ns-row');
    header.setAttribute('role', 'row');
    const corner = el('div', 'ns-corner');
    corner.setAttribute('aria-hidden', 'true');
    header.append(corner);
    clues.cols.forEach((clue, c) => {
      const cell = el('div', 'ns-clue ns-col-clue');
      cell.setAttribute('role', 'columnheader');
      cell.setAttribute('aria-label', `Column ${c + 1} clue: ${clueWords(clue)}`);
      for (const num of clue.length ? clue : [0]) cell.append(el('span', '', String(num)));
      if (c % 5 === 4 && c < n - 1) cell.classList.add('thick-r');
      this.colClueEls.push(cell);
      header.append(cell);
    });
    this.root.append(header);

    for (let r = 0; r < n; r++) {
      const row = el('div', 'ns-row');
      row.setAttribute('role', 'row');
      const rc = el('div', 'ns-clue ns-row-clue');
      rc.setAttribute('role', 'rowheader');
      rc.setAttribute('aria-label', `Row ${r + 1} clue: ${clueWords(clues.rows[r])}`);
      for (const num of clues.rows[r].length ? clues.rows[r] : [0]) rc.append(el('span', '', String(num)));
      if (r % 5 === 4 && r < n - 1) rc.classList.add('thick-b');
      this.rowClueEls.push(rc);
      row.append(rc);
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const cell = el('div', 'ns-cell');
        cell.setAttribute('role', 'gridcell');
        cell.dataset.i = String(i);
        cell.tabIndex = i === this.focusIndex ? 0 : -1;
        if (c % 5 === 4 && c < n - 1) cell.classList.add('thick-r');
        if (r % 5 === 4 && r < n - 1) cell.classList.add('thick-b');
        if (r === 0) cell.classList.add('edge-t');
        if (c === 0) cell.classList.add('edge-l');
        this.cellEls.push(cell);
        this.paintCell(i);
        row.append(cell);
      }
      this.root.append(row);
    }

    this.root.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.root.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.root.addEventListener('pointerup', () => this.endDrag());
    this.root.addEventListener('pointercancel', () => this.endDrag());
    this.root.addEventListener('lostpointercapture', () => this.endDrag());
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    this.root.addEventListener('keydown', (e) => this.onKey(e));
  }

  private paintCell(i: number) {
    const cell = this.cellEls[i];
    const v = this.cells[i];
    cell.classList.toggle('filled', v === FILLED);
    cell.classList.toggle('crossed', v === EMPTY);
    const r = Math.floor(i / this.n) + 1;
    const c = (i % this.n) + 1;
    cell.setAttribute('aria-label', `Row ${r}, column ${c}, ${STATE_WORD[v]}`);
  }

  /** Dims a clue once the line's filled cells match it exactly. */
  private refreshClue(kind: 'row' | 'col', index: number) {
    const { n } = this;
    const line = Array.from({ length: n }, (_, k) =>
      this.cells[kind === 'row' ? index * n + k : k * n + index] === FILLED);
    const clue = kind === 'row' ? this.clues.rows[index] : this.clues.cols[index];
    const done = sameRuns(runs(line), clue);
    (kind === 'row' ? this.rowClueEls : this.colClueEls)[index].classList.toggle('done', done);
  }

  private refreshAllClues() {
    for (let k = 0; k < this.n; k++) { this.refreshClue('row', k); this.refreshClue('col', k); }
  }

  /* ---------- editing ---------- */

  /** Applies a batch of changes as one undoable move. */
  private commit(batch: Change[]) {
    if (!batch.length) return;
    this.undoStack.push(batch);
    if (this.undoStack.length > 500) this.undoStack.shift();
    this.afterChange(batch);
  }

  private set(i: number, to: Cell, batch: Change[]) {
    const from = this.cells[i];
    if (from === to) return;
    this.cells[i] = to;
    this.paintCell(i);
    batch.push({ i, from, to });
  }

  private afterChange(batch: Change[]) {
    this.pendingHint = null;
    this.clearMarks();
    const rows = new Set(batch.map((ch) => Math.floor(ch.i / this.n)));
    const cols = new Set(batch.map((ch) => ch.i % this.n));
    rows.forEach((r) => this.refreshClue('row', r));
    cols.forEach((c) => this.refreshClue('col', c));
    if (this.isComplete()) this.finish();
    this.persist();
  }

  undo() {
    if (this.solved) return;
    const batch = this.undoStack.pop();
    if (!batch) { this.opts.onStatus('Nothing to undo.'); return; }
    for (const { i, from } of [...batch].reverse()) {
      this.cells[i] = from;
      this.paintCell(i);
    }
    this.afterChange(batch);
    this.opts.onStatus(batch.length === 1 ? 'Undid 1 cell.' : `Undid ${batch.length} cells.`);
  }

  restart() {
    this.cells.fill(UNKNOWN);
    this.cellEls.forEach((_, i) => this.paintCell(i));
    this.undoStack = [];
    this.seconds = 0;
    this.hints = 0;
    this.solved = false;
    this.pendingHint = null;
    this.root.classList.remove('solved');
    this.clearMarks();
    this.refreshAllClues();
    remove(this.saveKey);
    this.opts.onTick?.(0);
    this.startTimer();
    this.opts.onStatus('Board cleared. Fresh start!');
  }

  setMode(mode: 'fill' | 'cross') { this.mode = mode; }

  /* ---------- pointer ---------- */

  private cellAt(x: number, y: number): number | null {
    const target = document.elementFromPoint(x, y) as HTMLElement | null;
    const i = target?.closest<HTMLElement>('.ns-cell')?.dataset.i;
    return i == null ? null : Number(i);
  }

  private onPointerDown(e: PointerEvent) {
    if (this.solved) return;
    const i = this.cellAt(e.clientX, e.clientY);
    if (i == null) return;
    e.preventDefault();
    this.root.setPointerCapture(e.pointerId);
    this.moveFocus(i, false);
    const tool: Cell = e.button === 2 || this.mode === 'cross' || e.shiftKey ? EMPTY : FILLED;
    const from = this.cells[i];
    // Pressing on a cell that already holds the tool's mark clears it, and the
    // drag then clears matching cells instead of painting.
    const paint = from === tool ? UNKNOWN : tool;
    const batch: Change[] = [];
    this.set(i, paint, batch);
    this.drag = { start: i, paint, from, axis: null, batch };
  }

  private onPointerMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    const i = this.cellAt(e.clientX, e.clientY);
    if (i == null) return;
    const { n } = this;
    const sr = Math.floor(d.start / n), sc = d.start % n;
    const r = Math.floor(i / n), c = i % n;
    if (!d.axis) {
      if (r === sr && c === sc) return;
      d.axis = Math.abs(c - sc) >= Math.abs(r - sr) ? 'row' : 'col';
    }
    // Paint every cell between the start and the pointer along the locked
    // axis, so a fast swipe can't skip any. Only cells that started in the
    // same state as the first one change, so a fill drag never wipes crosses.
    const [lo, hi] = d.axis === 'row' ? [Math.min(sc, c), Math.max(sc, c)] : [Math.min(sr, r), Math.max(sr, r)];
    for (let k = lo; k <= hi; k++) {
      const j = d.axis === 'row' ? sr * n + k : k * n + sc;
      if (this.cells[j] === d.from) this.set(j, d.paint, d.batch);
    }
  }

  private endDrag() {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.commit(d.batch);
  }

  /* ---------- keyboard ---------- */

  private moveFocus(i: number, focus = true) {
    this.cellEls[this.focusIndex].tabIndex = -1;
    this.focusIndex = i;
    this.cellEls[i].tabIndex = 0;
    if (focus) this.cellEls[i].focus();
  }

  private onKey(e: KeyboardEvent) {
    const { n } = this;
    const i = this.focusIndex;
    const r = Math.floor(i / n), c = i % n;
    const move: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    if (move[e.key]) {
      e.preventDefault();
      const [dr, dc] = move[e.key];
      const nr = Math.min(n - 1, Math.max(0, r + dr));
      const nc = Math.min(n - 1, Math.max(0, c + dc));
      this.moveFocus(nr * n + nc);
      return;
    }
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.undo();
      return;
    }
    if (this.solved) return;
    let to: Cell | null = null;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'f' || e.key === 'F') to = this.cells[i] === FILLED ? UNKNOWN : FILLED;
    else if (e.key === 'x' || e.key === 'X') to = this.cells[i] === EMPTY ? UNKNOWN : EMPTY;
    else if (e.key === 'Backspace' || e.key === 'Delete') to = UNKNOWN;
    if (to == null) return;
    e.preventDefault();
    const batch: Change[] = [];
    this.set(i, to, batch);
    this.commit(batch);
    this.opts.onStatus(`Row ${r + 1}, column ${c + 1}: ${STATE_WORD[to]}.`);
  }

  /* ---------- help ---------- */

  private mistakes(): number[] {
    return this.cells.flatMap((v, i) => {
      const filled = this.puzzle.solution[Math.floor(i / this.n)][i % this.n] === '#';
      return (v === FILLED && !filled) || (v === EMPTY && filled) ? [i] : [];
    });
  }

  private clearMarks() {
    for (const cell of this.cellEls) cell.classList.remove('wrong', 'hint-line', 'hint-cell');
    for (const cl of [...this.rowClueEls, ...this.colClueEls]) cl.classList.remove('hint-line');
  }

  /** Marks wrong cells. Free: it only tells you what you already did. */
  check() {
    if (this.solved) return;
    this.clearMarks();
    const wrong = this.mistakes();
    for (const i of wrong) this.cellEls[i].classList.add('wrong');
    this.opts.onStatus(wrong.length === 0
      ? 'No mistakes so far.'
      : `${wrong.length} ${wrong.length === 1 ? 'cell doesn’t' : 'cells don’t'} match the solution — marked in red.`);
  }

  /**
   * First press: points at a line where something new can be worked out,
   * and names the clue. Second press: fills those cells in. Each press costs
   * a star. If the board has mistakes, the hint shows those first, because
   * no deduction is safe on top of a wrong cell.
   */
  hint() {
    if (this.solved) return;
    this.clearMarks();

    const wrong = this.mistakes();
    if (wrong.length) {
      this.useHint();
      for (const i of wrong) this.cellEls[i].classList.add('wrong');
      this.opts.onStatus(`Fix ${wrong.length === 1 ? 'the cell' : `the ${wrong.length} cells`} marked in red first — later deductions depend on it.`);
      return;
    }

    if (this.pendingHint) {
      const step = this.pendingHint;
      this.pendingHint = null;
      this.useHint();
      const batch: Change[] = [];
      for (const { at, value } of step.changes) {
        const i = step.line.kind === 'row' ? step.line.index * this.n + at : at * this.n + step.line.index;
        this.set(i, value, batch);
      }
      this.commit(batch);
      for (const { i } of batch) this.cellEls[i].classList.add('hint-cell');
      if (!this.solved) this.opts.onStatus(`Filled in ${batch.length} ${batch.length === 1 ? 'cell' : 'cells'} on ${lineName(step)}.`);
      return;
    }

    const grid: Cell[][] = Array.from({ length: this.n }, (_, r) => this.cells.slice(r * this.n, (r + 1) * this.n));
    const step = solveGrid(this.clues, grid, 1).steps[0];
    if (!step) {
      this.opts.onStatus('Every cell left is already determined — keep going!');
      return;
    }
    this.useHint();
    this.pendingHint = step;
    this.markLine(step);
    const clue = step.line.kind === 'row' ? this.clues.rows[step.line.index] : this.clues.cols[step.line.index];
    const count = step.changes.length;
    this.opts.onStatus(
      `Look at ${lineName(step)} (clue ${clue.join(' ') || '0'}): you can work out ${count} more ${count === 1 ? 'cell' : 'cells'}. Press Hint again to fill ${count === 1 ? 'it' : 'them'} in.`,
    );
  }

  private markLine(step: Step) {
    const { kind, index } = step.line;
    for (let k = 0; k < this.n; k++) {
      this.cellEls[kind === 'row' ? index * this.n + k : k * this.n + index].classList.add('hint-line');
    }
    (kind === 'row' ? this.rowClueEls : this.colClueEls)[index].classList.add('hint-line');
  }

  private useHint() {
    this.hints++;
    this.persist();
  }

  /* ---------- finishing ---------- */

  private isComplete() {
    return this.cells.every((v, i) =>
      (v === FILLED) === (this.puzzle.solution[Math.floor(i / this.n)][i % this.n] === '#'));
  }

  private finish() {
    this.solved = true;
    this.stopTimer();
    const stars = starsFor(this.hints);
    recordResult(GAME, this.puzzle.id, { stars, seconds: this.seconds, date: new Date().toISOString() });
    this.showSolved(true);
    this.opts.onSolved({ stars, seconds: this.seconds, hints: this.hints });
  }

  private showSolved(announce: boolean) {
    this.root.classList.add('solved');
    this.clearMarks();
    if (!announce) this.opts.onSolved({ stars: starsFor(this.hints), seconds: this.seconds, hints: this.hints });
  }

  /* ---------- timer + saving ---------- */

  private startTimer() {
    if (this.timer || this.solved) return;
    this.timer = window.setInterval(() => {
      this.seconds++;
      this.opts.onTick?.(this.seconds);
      if (this.seconds % 15 === 0) this.persist();
    }, 1000);
    this.opts.onTick?.(this.seconds);
  }

  private stopTimer() {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private persist() {
    const saved: SavedBoard = {
      cells: this.cells.map((v) => CELL_CHARS[v]).join(''),
      seconds: this.seconds,
      hints: this.hints,
      solved: this.solved,
    };
    save(this.saveKey, saved);
  }
}

/* ---------- helpers ---------- */

function el(tag: string, cls: string, text?: string) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function sameRuns(a: number[], b: number[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function clueWords(clue: number[]) {
  return clue.length ? clue.join(', ') : 'empty';
}

function lineName(step: Step) {
  return `${step.line.kind === 'row' ? 'row' : 'column'} ${step.line.index + 1}`;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
