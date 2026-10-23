/* Isle Spans — the interactive board, drawn as SVG.
   Drag from an island toward a neighbour (or tap the water between them) to
   cycle the bridge there through none → single → double → none. */

import { directionFrom, parse, type Board, type Span } from './model';
import { initialState, solve, solution } from './solver';
import type { SpansPuzzle } from './puzzles';
import { load, recordResult, remove, save } from '../../lib/storage';
import { starsFor } from '../../lib/scoring';
import type { BoardCallbacks, PlayableBoard } from '../../lib/play-ui';

export const GAME = 'isle-spans';
const S = 40; // SVG units per grid square
const NS = 'http://www.w3.org/2000/svg';

interface Saved { counts: string; seconds: number; hints: number; solved: boolean }
interface Change { span: number; from: number; to: number }
type Dir = 'up' | 'down' | 'left' | 'right';

export class SpansBoard implements PlayableBoard {
  readonly board: Board;
  private readonly answer: number[];
  private counts: number[];
  private undoStack: Change[] = [];
  private hints = 0;
  private seconds = 0;
  private solved = false;
  private timer: number | undefined;
  private focus = 0;
  private pendingHint: { span: number; to: number }[] | null = null;

  private svg!: SVGSVGElement;
  private bridgeLayer!: SVGGElement;
  private islandEls: SVGGElement[] = [];
  private press: { island: number; x: number; y: number } | null = null;

  constructor(private readonly root: HTMLElement, private readonly puzzle: SpansPuzzle, private readonly cb: BoardCallbacks) {
    this.board = parse(puzzle.rows);
    const sol = solution(this.board);
    if (!sol) throw new Error(`Isle Spans puzzle ${puzzle.id} has no unique solution`);
    this.answer = sol;
    this.counts = this.board.spans.map(() => 0);

    const saved = load<Saved>(this.saveKey);
    if (saved && saved.counts.length === this.counts.length) {
      this.counts = [...saved.counts].map(Number);
      this.seconds = saved.seconds;
      this.hints = saved.hints;
      this.solved = saved.solved;
    }

    this.render();
    this.redraw();
    if (this.solved) this.showSolved();
    else this.startTimer();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.stopTimer(); this.persist(); }
      else if (!this.solved) this.startTimer();
    });
  }

  get hintCount() { return this.hints; }
  private get saveKey() { return `${GAME}:${this.puzzle.id}`; }

  /* ---------- rendering ---------- */

  private render() {
    const { w, h, islands, spans } = this.board;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w * S} ${h * S}`);
    svg.setAttribute('class', 'sp-board');
    svg.setAttribute('role', 'application');
    svg.setAttribute('aria-label', `${this.puzzle.title}: ${islands.length} islands on a ${w} by ${h} map`);
    svg.style.setProperty('--w', String(w));
    this.svg = svg;

    const water = document.createElementNS(NS, 'g');
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', String(c * S + S / 2));
        dot.setAttribute('cy', String(r * S + S / 2));
        dot.setAttribute('r', '1.6');
        dot.setAttribute('class', 'sp-dot');
        water.append(dot);
      }
    }
    svg.append(water);

    // Wide invisible strips along each span: tapping the water toggles it.
    const hits = document.createElementNS(NS, 'g');
    for (const span of spans) {
      const [x1, y1, x2, y2] = this.ends(span);
      const rect = document.createElementNS(NS, 'rect');
      const pad = S * 0.32;
      rect.setAttribute('x', String(Math.min(x1, x2) - (span.dir === 'v' ? pad : 0)));
      rect.setAttribute('y', String(Math.min(y1, y2) - (span.dir === 'h' ? pad : 0)));
      rect.setAttribute('width', String(Math.abs(x2 - x1) + (span.dir === 'v' ? pad * 2 : 0)));
      rect.setAttribute('height', String(Math.abs(y2 - y1) + (span.dir === 'h' ? pad * 2 : 0)));
      rect.setAttribute('class', 'sp-hit');
      rect.dataset.span = String(span.id);
      hits.append(rect);
    }
    svg.append(hits);

    this.bridgeLayer = document.createElementNS(NS, 'g');
    this.bridgeLayer.setAttribute('class', 'sp-bridges');
    svg.append(this.bridgeLayer);

    for (const isl of islands) {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'sp-island');
      g.setAttribute('tabindex', isl.id === this.focus ? '0' : '-1');
      g.setAttribute('role', 'button');
      g.dataset.island = String(isl.id);
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('cx', String(isl.c * S + S / 2));
      circle.setAttribute('cy', String(isl.r * S + S / 2));
      circle.setAttribute('r', String(S * 0.38));
      const text = document.createElementNS(NS, 'text');
      text.setAttribute('x', String(isl.c * S + S / 2));
      text.setAttribute('y', String(isl.r * S + S / 2 + S * 0.15));
      text.setAttribute('text-anchor', 'middle');
      text.textContent = String(isl.n);
      g.append(circle, text);
      this.islandEls.push(g);
      svg.append(g);
    }

    svg.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    svg.addEventListener('pointerup', (e) => this.onPointerUp(e));
    svg.addEventListener('pointercancel', () => { this.press = null; });
    svg.addEventListener('contextmenu', (e) => e.preventDefault());
    svg.addEventListener('keydown', (e) => this.onKey(e));
    this.root.textContent = '';
    this.root.append(svg);
  }

  /** Line endpoints for a span, from island edge to island edge. */
  private ends(span: Span): [number, number, number, number] {
    const a = this.board.islands[span.a], b = this.board.islands[span.b];
    const off = S * 0.38;
    const ax = a.c * S + S / 2, ay = a.r * S + S / 2, bx = b.c * S + S / 2, by = b.r * S + S / 2;
    return span.dir === 'h' ? [ax + off, ay, bx - off, by] : [ax, ay + off, bx, by - off];
  }

  private redraw(marks: { wrong?: number[]; hint?: number[]; focusIsland?: number } = {}) {
    this.bridgeLayer.textContent = '';
    for (const span of this.board.spans) {
      const n = this.counts[span.id];
      const isHint = marks.hint?.includes(span.id);
      if (!n && !isHint) continue;
      const [x1, y1, x2, y2] = this.ends(span);
      const offsets = n === 2 ? [-S * 0.1, S * 0.1] : [0];
      for (const o of n ? offsets : [0]) {
        const line = document.createElementNS(NS, 'line');
        const [dx, dy] = span.dir === 'h' ? [0, o] : [o, 0];
        line.setAttribute('x1', String(x1 + dx)); line.setAttribute('y1', String(y1 + dy));
        line.setAttribute('x2', String(x2 + dx)); line.setAttribute('y2', String(y2 + dy));
        line.setAttribute('class', [
          'sp-bridge',
          n ? '' : 'sp-ghost',
          marks.wrong?.includes(span.id) ? 'wrong' : '',
          isHint ? 'hint' : '',
        ].join(' ').trim());
        this.bridgeLayer.append(line);
      }
    }
    for (const isl of this.board.islands) {
      const have = this.board.spansOf[isl.id].reduce((t, s) => t + this.counts[s], 0);
      const g = this.islandEls[isl.id];
      g.classList.toggle('done', have === isl.n);
      g.classList.toggle('over', have > isl.n);
      g.classList.toggle('hint', marks.focusIsland === isl.id);
      g.setAttribute('aria-label', `Island ${isl.n} at row ${isl.r + 1}, column ${isl.c + 1}: ${have} of ${isl.n} bridges`);
    }
  }

  /* ---------- editing ---------- */

  private cycle(spanId: number, backwards = false) {
    if (this.solved) return;
    const from = this.counts[spanId];
    const to = backwards ? (from + 2) % 3 : (from + 1) % 3;
    if (to > 0 && this.board.spans[spanId].crosses.some((t) => this.counts[t] > 0)) {
      this.cb.onStatus('That bridge would cross another one. Remove the other bridge first.');
      return;
    }
    this.apply([{ span: spanId, from, to }]);
    if (this.solved) return;
    const span = this.board.spans[spanId];
    const a = this.board.islands[span.a], b = this.board.islands[span.b];
    this.cb.onStatus(`${['No bridge', 'Single bridge', 'Double bridge'][to]} between the ${a.n} and the ${b.n}.`);
  }

  private apply(changes: Change[], hintSpans?: number[]) {
    for (const ch of changes) this.counts[ch.span] = ch.to;
    this.undoStack.push(...changes.map((c) => ({ ...c })));
    if (changes.length > 1) this.undoStack.push({ span: -changes.length, from: 0, to: 0 }); // batch marker
    this.pendingHint = null;
    this.redraw({ hint: hintSpans });
    if (this.counts.every((v, i) => v === this.answer[i])) this.finish();
    this.persist();
  }

  undo() {
    if (this.solved) return;
    let top = this.undoStack.pop();
    if (!top) { this.cb.onStatus('Nothing to undo.'); return; }
    const batch: Change[] = [];
    if (top.span < 0) {
      for (let k = 0; k < -top.span; k++) batch.push(this.undoStack.pop()!);
    } else batch.push(top);
    for (const ch of batch) this.counts[ch.span] = ch.from;
    this.pendingHint = null;
    this.redraw();
    this.persist();
    this.cb.onStatus('Undone.');
  }

  restart() {
    this.counts.fill(0);
    this.undoStack = [];
    this.hints = 0;
    this.seconds = 0;
    this.solved = false;
    this.pendingHint = null;
    this.svg.classList.remove('solved');
    remove(this.saveKey);
    this.redraw();
    this.cb.onTick(0);
    this.startTimer();
    this.cb.onStatus('Map cleared. Fresh start!');
  }

  /* ---------- pointer ---------- */

  private point(e: PointerEvent) {
    const p = this.svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(this.svg.getScreenCTM()!.inverse());
  }

  private onPointerDown(e: PointerEvent) {
    if (this.solved) return;
    const target = e.target as Element;
    const isl = target.closest<SVGGElement>('.sp-island');
    if (isl) {
      e.preventDefault();
      const { x, y } = this.point(e);
      this.press = { island: Number(isl.dataset.island), x, y };
      this.svg.setPointerCapture(e.pointerId);
      this.moveFocus(Number(isl.dataset.island), false);
      return;
    }
    const hit = target.closest<SVGRectElement>('.sp-hit');
    if (hit) {
      e.preventDefault();
      this.cycle(Number(hit.dataset.span), e.button === 2 || e.shiftKey);
    }
  }

  private onPointerUp(e: PointerEvent) {
    const press = this.press;
    this.press = null;
    if (!press) return;
    const { x, y } = this.point(e);
    const dx = x - press.x, dy = y - press.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < S * 0.35) {
      this.cb.onStatus('Drag from an island towards a neighbour to build a bridge, or tap the water between them.');
      return;
    }
    const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    this.bridgeFrom(press.island, dir, e.button === 2 || e.shiftKey);
  }

  private spanToward(island: number, dir: Dir): Span | undefined {
    return this.board.spansOf[island]
      .map((s) => this.board.spans[s])
      .find((s) => directionFrom(this.board, s, island) === dir);
  }

  private bridgeFrom(island: number, dir: Dir, backwards: boolean) {
    const span = this.spanToward(island, dir);
    if (!span) { this.cb.onStatus(`There’s no island in sight ${dir === 'up' || dir === 'down' ? dir : `to the ${dir}`} from there.`); return; }
    this.cycle(span.id, backwards);
  }

  /* ---------- keyboard ---------- */

  private moveFocus(i: number, focus = true) {
    this.islandEls[this.focus].setAttribute('tabindex', '-1');
    this.focus = i;
    this.islandEls[i].setAttribute('tabindex', '0');
    if (focus) this.islandEls[i].focus();
  }

  private onKey(e: KeyboardEvent) {
    const dirs: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const dir = dirs[e.key];
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.undo(); return; }
    if (!dir) return;
    e.preventDefault();
    if (e.shiftKey) {
      this.bridgeFrom(this.focus, dir, false);
      return;
    }
    // Plain arrows hop to the nearest island in that direction.
    const here = this.board.islands[this.focus];
    const candidates = this.board.islands.filter((o) =>
      dir === 'right' ? o.r === here.r && o.c > here.c :
      dir === 'left' ? o.r === here.r && o.c < here.c :
      dir === 'down' ? o.c === here.c && o.r > here.r :
      o.c === here.c && o.r < here.r);
    const fallback = this.board.islands.filter((o) =>
      dir === 'right' ? o.c > here.c : dir === 'left' ? o.c < here.c : dir === 'down' ? o.r > here.r : o.r < here.r);
    const pool = candidates.length ? candidates : fallback;
    if (!pool.length) return;
    // Distance along the arrow's direction, with sideways drift costing double.
    const horizontal = dir === 'left' || dir === 'right';
    const dist = (o: typeof here) => horizontal
      ? Math.abs(o.c - here.c) + 2 * Math.abs(o.r - here.r)
      : Math.abs(o.r - here.r) + 2 * Math.abs(o.c - here.c);
    const best = pool.reduce((a, b) => (dist(b) < dist(a) ? b : a));
    this.moveFocus(best.id);
    const have = this.board.spansOf[best.id].reduce((t, s) => t + this.counts[s], 0);
    this.cb.onStatus(`Island ${best.n} at row ${best.r + 1}, column ${best.c + 1}: ${have} of ${best.n} bridges.`);
  }

  /* ---------- help ---------- */

  private mistakes(): number[] {
    return this.board.spans.flatMap((s) => (this.counts[s.id] > this.answer[s.id] ? [s.id] : []));
  }

  check() {
    if (this.solved) return;
    const wrong = this.mistakes();
    this.redraw({ wrong });
    this.cb.onStatus(wrong.length === 0
      ? 'No mistakes so far.'
      : `${wrong.length} ${wrong.length === 1 ? 'bridge doesn’t' : 'bridges don’t'} belong — marked in red.`);
  }

  hint() {
    if (this.solved) return;
    const wrong = this.mistakes();
    if (wrong.length) {
      this.useHint();
      this.redraw({ wrong });
      this.cb.onStatus(`Remove the ${wrong.length === 1 ? 'bridge' : `${wrong.length} bridges`} marked in red first — later reasoning depends on ${wrong.length === 1 ? 'it' : 'them'}.`);
      return;
    }

    if (this.pendingHint) {
      const target = this.pendingHint;
      this.useHint();
      this.apply(target.map(({ span, to }) => ({ span, from: this.counts[span], to })), target.map((t) => t.span));
      if (!this.solved) this.cb.onStatus('Built what the hint pointed at — shown in teal.');
      return;
    }

    // Start from the bridges already built (all correct, so each is a safe
    // lower bound) and find the first deduction that adds a bridge.
    const start = initialState(this.board);
    start.min = this.counts.slice();
    const run = solve(this.board, start);
    const step = run.steps.find((s) => s.changes.some((c) => c.min > this.counts[c.span]));
    if (!step) {
      this.cb.onStatus('Every bridge left follows from what’s on the map — keep going!');
      return;
    }
    const adds = step.changes.filter((c) => c.min > this.counts[c.span]).map((c) => ({ span: c.span, to: c.min }));
    this.useHint();
    this.pendingHint = adds;
    const isl = step.island != null ? this.board.islands[step.island] : this.board.islands[this.board.spans[adds[0].span].a];
    this.redraw({ hint: adds.map((a) => a.span), focusIsland: isl.id });
    const where = `the ${isl.n} at row ${isl.r + 1}, column ${isl.c + 1}`;
    const msg = step.rule === 'count'
      ? `Look at ${where}: count its neighbours against its number. It needs more bridges where the teal line${adds.length === 1 ? ' is' : 's are'}.`
      : `Look at the group of islands around ${where}: it has only one way out left, so that bridge must be built.`;
    this.cb.onStatus(`${msg} Press Hint again to build ${adds.length === 1 ? 'it' : 'them'}.`);
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
    this.redraw();
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
    save(this.saveKey, { counts: this.counts.join(''), seconds: this.seconds, hints: this.hints, solved: this.solved } satisfies Saved);
  }
}
