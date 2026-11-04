/* Wires a game board into the shared play screen (components/PlayShell.astro):
   toolbar buttons, timer, hint count, status line and the solved panel. */

import { formatTime, starText } from './scoring';
import { playSound } from './audio';
import { reducedMotion } from './site-shell';
import { results } from './storage';
import { earnedIds, stickers } from './achievements';
import { buzz, chime, confetti, fanfare, pop, sparkle } from './juice';
import { iconSvg } from './icons';

/** How far through the puzzle the player is, and what they just completed. */
export interface Progress {
  done: number;
  total: number;
  /** Elements finished by the latest move: they sparkle and chime. */
  gained: Element[];
}

export interface BoardCallbacks {
  onStatus(message: string): void;
  /** fresh is true only when the player solved it just now, not on reload. */
  onSolved(result: { stars: number; seconds: number; hints: number; fresh?: boolean }): void;
  onTick(seconds: number): void;
  onProgress?(progress: Progress): void;
}

export interface PlayableBoard {
  readonly hintCount: number;
  undo(): void;
  check(): void;
  hint(): void;
  restart(): void;
}

interface Setup<B extends PlayableBoard> {
  eyebrow: string;
  title: string;
  /** Shown in the solved panel. */
  note: string;
  next?: { href: string; label: string };
  listHref: string;
  create(root: HTMLElement, callbacks: BoardCallbacks): B;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export function showMissing(): void {
  $('pl-missing').hidden = false;
}

export function setupPlay<B extends PlayableBoard>(s: Setup<B>): B {
  $('pl-eyebrow').textContent = s.eyebrow;
  $('pl-title').textContent = s.title;
  document.title = `${s.title} · Doodle Heroes`;
  $('pl-play').hidden = false;

  const status = $('pl-status');
  const tools = () => document.querySelectorAll<HTMLButtonElement>('.pl-toolbar button');
  const showHints = (n: number) => {
    $('pl-hints').textContent = n === 0 ? 'no hints used' : n === 1 ? '1 hint used' : `${n} hints used`;
  };

  // Stickers held before this puzzle, so the report card can announce new ones.
  const stickersBefore = earnedIds(results());
  // Completions within a few seconds of each other climb the scale.
  let streak = { step: -1, at: 0 };
  let board: B | undefined;
  board = s.create($('pl-board'), {
    onStatus(message) {
      status.textContent = message;
      if (board) showHints(board.hintCount);
    },
    onProgress({ done, total, gained }) {
      const ribbon = $('pl-progress');
      ribbon.style.setProperty('--p', String(total ? done / total : 0));
      ribbon.setAttribute('aria-valuenow', String(Math.round((done / Math.max(1, total)) * 100)));
      if (!gained.length || !board) return;
      const now = performance.now();
      streak = { step: now - streak.at < 5000 ? streak.step + 1 : 0, at: now };
      chime(streak.step);
      buzz(10);
      for (const el of gained.slice(0, 6)) { sparkle(el, 7); pop(el); }
    },
    onTick(seconds) {
      $('pl-time').textContent = formatTime(seconds);
    },
    onSolved({ stars, seconds, hints, fresh: justSolved }) {
      const done = $('pl-done');
      done.classList.toggle('fresh', !!justSolved);
      $('pl-progress').style.setProperty('--p', '1');
      if (justSolved) {
        playSound('solved');
        fanfare();
        buzz([18, 60, 18, 60, 40]);
        $('pl-board').classList.add('celebrate');
        window.setTimeout(() => confetti(), 380);
        window.setTimeout(() => {
          done.scrollIntoView({ behavior: reducedMotion() ? 'instant' : 'smooth', block: 'center' });
        }, 1100);
      }
      showHints(hints);
      $('pl-time').textContent = formatTime(seconds);
      // S for a clean solve, then A and B, like a stamped report card.
      $('pl-grade').textContent = ['B', 'B', 'A', 'S'][stars];
      $('pl-stars').replaceChildren(...[...starText(stars)].map((ch, k) => {
        const star = document.createElement('span');
        star.textContent = ch;
        star.style.setProperty('--k', String(k));
        star.className = k < stars ? 'on' : 'off';
        return star;
      }));
      $('pl-stars').setAttribute('aria-label', `${stars} of 3 stars`);
      $('pl-done-text').textContent =
        `Solved in ${formatTime(seconds)} with ${hints === 0 ? 'no hints' : hints === 1 ? '1 hint' : `${hints} hints`}.`;
      $('pl-note').textContent = s.note;
      const fresh = stickers.filter((x) => earnedIds(results()).has(x.id) && !stickersBefore.has(x.id));
      const stickerEl = $('pl-sticker');
      stickerEl.hidden = fresh.length === 0;
      stickerEl.innerHTML = fresh.map((x) =>
        `<span class="sticker-chip"><span class="badge ${x.tint}">${iconSvg(x.icon, 22)}</span>New sticker: <b></b></span>`).join('');
      stickerEl.querySelectorAll('b').forEach((b, k) => { b.textContent = fresh[k].name; });
      fresh.forEach((x) => stickersBefore.add(x.id));
      const next = $<HTMLAnchorElement>('pl-next');
      next.href = s.next?.href ?? s.listHref;
      next.textContent = s.next?.label ?? 'Back to the list →';
      $('pl-done').hidden = false;
      status.textContent = `Solved! ${stars} of 3 stars.`;
      for (const b of tools()) b.disabled = true;
    },
  });
  showHints(board.hintCount);
  $('pl-board').addEventListener('pointerup', () => { if ($('pl-done').hidden) playSound('place'); });
  $('pl-board').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') playSound('place'); });

  const more = $('pl-more');
  const menu = $('pl-more-menu');
  const closeMenu = () => { menu.classList.remove('open'); more.setAttribute('aria-expanded', 'false'); };
  more.addEventListener('click', (e) => {
    e.stopPropagation();
    playSound('tap');
    more.setAttribute('aria-expanded', String(menu.classList.toggle('open')));
  });
  menu.addEventListener('click', closeMenu);
  document.addEventListener('click', (e) => { if (!menu.contains(e.target as Node)) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  $('pl-undo').addEventListener('click', () => { board!.undo(); playSound('place'); });
  $('pl-check').addEventListener('click', () => { board!.check(); playSound('tap'); });
  $('pl-hint').addEventListener('click', () => { board!.hint(); playSound('hint'); });
  const startOver = () => {
    board!.restart();
    $('pl-done').hidden = true;
    $('pl-board').classList.remove('celebrate');
    for (const b of tools()) b.disabled = false;
    showHints(0);
  };
  $('pl-restart').addEventListener('click', () => {
    if (confirm('Clear the board and start this puzzle again?')) startOver();
  });
  // After a solve there's nothing to lose, so Try again needs no confirmation.
  $('pl-again').addEventListener('click', () => {
    startOver();
    $('pl-board').scrollIntoView({ behavior: reducedMotion() ? 'instant' : 'smooth', block: 'center' });
  });
  return board;
}

/** Hooks up a two-button mode switch ([data-mode] buttons in the toolbar). */
export function setupModes(onChange: (mode: string) => void): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      playSound('tap');
      onChange(btn.dataset.mode!);
      for (const b of buttons) {
        const on = b === btn;
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('secondary', !on);
      }
    });
  }
}
