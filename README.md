# Doodle Heroes

Hand-made logic puzzles at doodleheros.com. Every puzzle can be solved by
reasoning alone; a solver checks that before anything ships.

The previous drawing-game site is preserved at the git tag `drawing-site-final`.

## Develop

```sh
npm install
npm run dev       # local dev server
npm test          # solver + catalogue + daily-puzzle checks
npm run build     # static site into dist/
```

## Deploy (Cloudflare Pages)

The site is now built with Astro, so the Pages project needs build settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable `NODE_VERSION`: `22` or newer

`public/_redirects` maps the old drawing-game URLs to their closest new pages.
`public/sw.js` is a retired service worker that clears the old site's offline
cache and unregisters itself — keep it deployed for a few months.

## Layout

Three games, each in `src/games/<name>/` with the same parts:

| Game | Folder | Puzzle type |
|---|---|---|
| Island Sketch | `nonogram/` | Picture logic (nonogram) |
| Isle Spans | `bridges/` | Bridge building (Hashi) |
| Lighthouse Wiring | `net/` | Rotating network tiles |

- `model.ts` / `solver.ts`: the rules and a deduction-only solver. The solver
  checks puzzles, drives hints, and draws the guide diagrams.
- `puzzles.ts`: the fixed catalogue (12 puzzles in 3 chapters). Bridges and
  wiring maps came from `generate.ts` with fixed seeds and are stored as text.
- `daily.ts`: the daily puzzle, seeded from the date.
- `board.ts` / `board.css`: the interactive board.

Shared pieces:

- `src/components/PlayShell.astro` + `src/lib/play-ui.ts`: the ad-free play
  screen (toolbar, timer, hints, solved panel) used by all three games.
- `src/lib/storage.ts`, `scoring.ts`: saved progress and stars.
- `src/content/expedition.ts`: the Lantern Isles chapters.
- `src/content/bridges-examples.ts`: Isle Spans guide examples. Each claim is
  tested.
- `MiniBoard`, `LineExample`, `SpansDiagram`, `SpansExample`, `WiringDiagram`,
  `WiringStep`: build-time SVG diagrams. Each takes its picture from the
  solver, and the build fails if a diagram no longer matches its text.

`npm test` verifies every catalogue puzzle and a year of daily puzzles, and
for bridges and wiring a brute-force search proves each catalogue puzzle has
exactly one solution. Run it after changing any puzzle.

## Advertising rules

- `Base.astro` loads AdSense only when `ads` is true (the default).
- Play screens (`/<game>/play`, all built on `PlayShell`), `/progress` and the
  404 page pass `ads={false}`. Never put ads on a page that is mostly a game board — that is
  what got the old site flagged.
- The site is general-audience. Personalised ads in the EEA/UK/Switzerland need
  Google's consent message: set it up in AdSense → Privacy & messaging.

## Before launch

- `hello@doodleheros.com` (in `src/lib/site.ts`) must be a working mailbox.
- Change the AdSense account's child-directed setting to match the
  general-audience site.
