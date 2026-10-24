# Doodle Heroes

Hand-made logic puzzles and a doodle survivor game at doodleheros.com, all on
notebook paper. Every puzzle can be solved by reasoning alone; a solver
checks that before anything ships.

The previous drawing-game site is preserved at the git tag `drawing-site-final`.

## Develop

```sh
npm install
npm run dev       # local dev server
npm test          # solver + catalogue + daily-puzzle checks
npm run build     # static site into dist/
```

## Deploy (Cloudflare Workers)

The root `wrangler.toml` builds Astro and uploads `dist` as static assets.
It supports the Workers Builds deploy command `npx wrangler versions upload`.
Use `npx wrangler deploy` to publish directly to production.

- Repository root: `/` (not `party/`).
- Node.js: `22` or newer.
- Worker name: `doodle-heroes`; match this to the Worker name in your
  Cloudflare dashboard if it differs.
- Preview uploads must be deployed/promoted before they serve production traffic.
- Draw Party's server remains a separate deployment from `party/`.

## Deploy (Cloudflare Pages alternative)

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

Scribble Siege, the action game, lives in `src/games/survivor/`:

- `data.ts`: every number the game uses (weapons, items, heroes, enemies,
  waves, upgrades, daily twists). The guide pages print their tables from it.
- `engine.ts`: the rules, with no DOM. It uses a fixed step and seeded
  randomness, so `tests/survivor.test.ts` can play whole runs with bots.
- `sprites.ts` (procedural doodle art), `render.ts` (canvas), `input.ts`
  (keys and a floating joystick), `audio.ts` (synthesised sounds),
  `meta.ts` (coins, upgrades, unlocks, drawn hero), `app.ts` (menus and
  loop).
- The play screen uses `GameLayout.astro`: full screen, no site chrome, and
  never ads.

Shared pieces:

- `src/components/PlayShell.astro` + `src/lib/play-ui.ts`: the ad-free play
  screen (toolbar, timer, hints, solved panel) used by all three games.
- `src/lib/storage.ts`, `scoring.ts`: saved progress and stars.
- `src/lib/achievements.ts`: stickers and the daily streak, both worked out
  from saved results.
- `src/styles/site.css`: the notebook look. All the texture is CSS.
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
- Play screens (`/<game>/play`: the puzzles use `PlayShell`, Scribble Siege
  uses `GameLayout`), `/progress` and the 404 page carry no ads. Never put ads on a page that is mostly a game board — that is
  what got the old site flagged.
- The site is general-audience. Personalised ads in the EEA/UK/Switzerland need
  Google's consent message: set it up in AdSense → Privacy & messaging.

## Draw Party server (`party/`)

Draw Party needs a small real-time server: a Cloudflare Worker with one
Durable Object per room. The room rules live in `src/games/draw-party/room.ts`
(tested in `tests/draw-party.test.ts`); `party/src/worker.ts` only relays.

Run it locally alongside the site:

```sh
cd party && npm install && npm run dev   # ws://127.0.0.1:8787
```

Deploy it once to your Cloudflare account:

```sh
cd party && npx wrangler login && npm run deploy
```

Wrangler prints the Worker's address (e.g.
`https://doodle-heroes-party.<you>.workers.dev`). In the Pages project add an
environment variable `PUBLIC_PARTY_URL` set to the same address with `wss://`,
then redeploy the site. Until that's set, the Draw Party page says it isn't
switched on yet. If you serve the site from another domain, add it to
`ALLOWED_ORIGINS` in `party/wrangler.toml`.

## Before launch

- `sydney2000@gmail.com` (in `src/lib/site.ts`) must be a working mailbox.
- Change the AdSense account's child-directed setting to match the
  general-audience site.
