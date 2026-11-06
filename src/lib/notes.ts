/* Notes: dated articles about how the puzzles are made. The list drives the
   Notes index, each article's header and its structured data, so a new note
   is one entry here plus one page in src/pages/notes/. Newest first. */

export interface Note {
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD, the day the note was published. */
  date: string;
  /** Set when a note is revised after publishing. */
  updated?: string;
}

export const notes: Note[] = [
  {
    slug: 'one-answer-every-time',
    title: 'How we make sure every puzzle has exactly one answer',
    description: 'Each Island Sketch, Isle Spans and Lighthouse Wiring puzzle is checked by a solver that never guesses. Here is how that check works, and why it proves the answer is unique.',
    date: '2026-11-06',
  },
  {
    slug: 'daily-puzzles-without-a-server',
    title: 'A new puzzle every day, with no server at all',
    description: 'The daily puzzles are the same for everyone on a given date, yet nothing is downloaded. A seeded random number generator does the work in your browser.',
    date: '2026-11-06',
  },
  {
    slug: 'hints-that-teach',
    title: 'Hints that teach instead of telling',
    description: 'A hint on Doodle Heroes points at the one place where a new deduction is possible, names the reason, and only fills it in if you ask twice. Here is why.',
    date: '2026-11-06',
  },
  {
    slug: 'designing-for-every-player',
    title: 'Sprout, Explorer and Master: one puzzle, three ways to play',
    description: 'How the three play styles, text sizes and clearer patterns change the experience without changing the puzzle itself.',
    date: '2026-11-06',
  },
];

export const noteBySlug = (slug: string) => notes.find((n) => n.slug === slug);

/** "6 November 2026" — written out so it reads the same in every locale. */
export function longDate(key: string): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}
