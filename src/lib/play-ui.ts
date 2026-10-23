/* Wires a game board into the shared play screen (components/PlayShell.astro):
   toolbar buttons, timer, hint count, status line and the solved panel. */

import { formatTime, starText } from './scoring';
import { results } from './storage';
import { earnedIds, stickers } from './achievements';

export interface BoardCallbacks {
  onStatus(message: string): void;
  onSolved(result: { stars: number; seconds: number; hints: number }): void;
  onTick(seconds: number): void;
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
  let board: B | undefined;
  board = s.create($('pl-board'), {
    onStatus(message) {
      status.textContent = message;
      if (board) showHints(board.hintCount);
    },
    onTick(seconds) {
      $('pl-time').textContent = formatTime(seconds);
    },
    onSolved({ stars, seconds, hints }) {
      showHints(hints);
      $('pl-time').textContent = formatTime(seconds);
      // S for a clean solve, then A and B, like a stamped report card.
      $('pl-grade').textContent = ['B', 'B', 'A', 'S'][stars];
      $('pl-stars').textContent = starText(stars);
      $('pl-stars').setAttribute('aria-label', `${stars} of 3 stars`);
      $('pl-done-text').textContent =
        `Solved in ${formatTime(seconds)} with ${hints === 0 ? 'no hints' : hints === 1 ? '1 hint' : `${hints} hints`}.`;
      $('pl-note').textContent = s.note;
      const fresh = stickers.filter((x) => earnedIds(results()).has(x.id) && !stickersBefore.has(x.id));
      const stickerEl = $('pl-sticker');
      stickerEl.hidden = fresh.length === 0;
      stickerEl.textContent = fresh.map((x) => `${x.icon} New sticker: ${x.name}`).join('  ·  ');
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

  $('pl-undo').addEventListener('click', () => board!.undo());
  $('pl-check').addEventListener('click', () => board!.check());
  $('pl-hint').addEventListener('click', () => board!.hint());
  const startOver = () => {
    board!.restart();
    $('pl-done').hidden = true;
    for (const b of tools()) b.disabled = false;
    showHints(0);
  };
  $('pl-restart').addEventListener('click', () => {
    if (confirm('Clear the board and start this puzzle again?')) startOver();
  });
  // After a solve there's nothing to lose, so Try again needs no confirmation.
  $('pl-again').addEventListener('click', () => {
    startOver();
    $('pl-board').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  return board;
}

/** Hooks up a two-button mode switch ([data-mode] buttons in the toolbar). */
export function setupModes(onChange: (mode: string) => void): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      onChange(btn.dataset.mode!);
      for (const b of buttons) {
        const on = b === btn;
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('secondary', !on);
      }
    });
  }
}
