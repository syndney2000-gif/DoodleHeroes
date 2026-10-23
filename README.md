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

- `src/games/nonogram/` — Island Sketch: line solver, puzzle catalogue, daily
  generator, and the interactive board.
- `src/components/MiniBoard.astro`, `LineExample.astro` — static SVG boards for
  rules, guides and walkthroughs. Examples are computed by the solver at build
  time, so diagrams can't disagree with the game.
- `src/pages/` — every page. Guides live under `guides/`, worked solves under
  `walkthroughs/`.
- `tests/` — run `npm test` after changing any puzzle: a picture that needs
  guessing fails the build.

## Advertising rules

- `Base.astro` loads AdSense only when `ads` is true (the default).
- Play screens (`/island-sketch/play`), `/progress` and the 404 page pass
  `ads={false}`. Never put ads on a page that is mostly a game board — that is
  what got the old site flagged.
- The site is general-audience. Personalised ads in the EEA/UK/Switzerland need
  Google's consent message: set it up in AdSense → Privacy & messaging.

## Before launch

- `hello@doodleheros.com` (in `src/lib/site.ts`) must be a working mailbox.
- Change the AdSense account's child-directed setting to match the
  general-audience site.
