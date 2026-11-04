# Doodle Heroes

Six single-player puzzle, collecting and adventure games at doodleheros.com,
with the Meadow Tiles visual style. Every puzzle can be solved by reasoning alone; a solver
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
  (keys and a floating joystick), `audio.ts` (event sounds),
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

## Game feel, the island and progression

- `src/lib/juice.ts`: sparkles, confetti, chimes and vibration. Boards call
  `onProgress` (via `lib/play-ui.ts`) as lines, islands or cottages are
  finished, and `onSolved({ fresh: true })` for a new solve.
- `src/components/IslandWorld.astro` + `src/lib/world.ts`: the home-page
  island. Landmarks are worked out from saved progress in every game;
  nothing extra is stored. The sky follows the local clock.
- `src/lib/pip.ts`, `src/components/Pip.astro`: Pip the Pencil's lines and
  art. `src/lib/tours.ts`: Pip's how-to-play steps for each puzzle.
- `src/lib/prefs.ts`: play style (Sprout / Explorer / Master), text size and
  Clearer patterns, mirrored onto `<html>` data attributes. `Base.astro`
  applies them, and the Night theme, before first paint.
- `src/lib/lantern.ts`: lantern light, earned from saved progress and spent
  on island decorations (`dh:lantern:owned`), plus the daily mix.
- `src/lib/events.ts`: the weekly island event, chosen from the date.
- Streaks forgive one missed day a week (`streakDays` in `achievements.ts`).

## Advertising rules

- `Base.astro` loads AdSense only when `ads` is true (the default).
- Play screens (`/<game>/play`: the puzzles use `PlayShell`, Scribble Siege
  uses `GameLayout`), `/progress` and the 404 page carry no ads. Never put ads on a page that is mostly a game board — that is
  what got the old site flagged.
- The site is general-audience. Personalised ads in the EEA/UK/Switzerland need
  Google's consent message: set it up in AdSense → Privacy & messaging.

## Meadow Tiles build

Six single-player games, with the visual direction adapted from the sibling
`../doodle-heroes-mobile` app. Home, Games, Journal and Settings share the ivory,
forest-green and pastel theme. Existing game rules and browser saves remain.

Sound effects and music are CC0 works by Kenney, Ruskerdax and zesona, built
into `public/audio` by `scripts/build-audio.sh` (credits in
`public/audio/README.md`). The original "Meadow Stroll" loop remains as an
option, generated by `python3 scripts/generate-audio.py`. Music is off by
default, starts after interaction, and has its own toggle, volume and track
choice. Audio suspends in background tabs and resumes on a restored page.

The Merge card shows two paper pieces combining into a sticky note.

Sound and music preferences are saved under `dh:settings:*`. The old Siege sound
preference is respected on first use. A shared Web Audio context caches the
decoded cues and music and plays both the cues and Siege's sounds. Audio
unlocks on interaction and suspends in background tabs. Reduced motion follows
the system preference or the in-app setting.

### Browser validation

`scripts/check-ui.mjs` checks mobile layout, tap/drag merges, canceled drops,
orders, saved progress, sound/motion preferences, all six game pages, asset
decoding and retired-route redirects. It also completes all 12 chapters, tests story transitions, legacy-save
migration, partial supplies and single-claim rewards across reloads, and checks
focused drawing, satchel storage and free play. The redesign checks cover board
and Draw visibility in the first mobile viewport, retained board images,
independent music preferences, enlarged puzzle squares, all cartoon SVGs, and
Siege pause/resume rendering and audio controls. It expects the Astro development server
and a Playwright installation. Use `PLAYWRIGHT_MODULE` to point at an existing
Playwright ESM installation, or make `playwright` available normally. Set
`CHROMIUM_EXECUTABLE` if using a locally installed Chromium. Screenshots default
to `/tmp/doodle-heroes-check` (override with `SCREENSHOT_DIR`).

```sh
npm run dev
# In another terminal, with Playwright available:
node scripts/check-ui.mjs
```

The browser suite verifies that sound cues are scheduled and muted; final
speaker/headphone listening and physical-phone touch testing are still useful
before publishing. No deployment is performed by these checks.

## Before launch

- `sydney2000@gmail.com` (in `src/lib/site.ts`) must be a working mailbox.
- Change the AdSense account's child-directed setting to match the
  general-audience site.
