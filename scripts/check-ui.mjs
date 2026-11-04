/** Browser integration checks. Run against `npm run dev`.
 * PLAYWRIGHT_MODULE may point at an existing Playwright ESM installation.
 * CHROMIUM_EXECUTABLE may select an installed compatible browser.
 */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox'] });
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4321';
const output = process.env.SCREENSHOT_DIR || '/tmp/doodle-heroes-check';
await mkdir(output, { recursive: true });
const errors = [];
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.route('**/pagead2.googlesyndication.com/**', route => route.abort());
await context.addInitScript(() => {
  window.audioStarts = 0;
  const original = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) { window.audioStarts++; return original.apply(this, args); };
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const open = async path => {
  const response = await page.goto(base + path);
  assert.ok(response.status() < 400, `${path}: ${response.status()}`);
  await page.evaluate(() => document.fonts.ready);
};
const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow: ${page.url()}`);
try {
  await open('/');
  assert.equal(await page.locator('.world-card').count(), 6);
  const mergeIcon = page.locator('.world-card').filter({ has: page.getByRole('heading', { name: 'Margin Merge' }) }).locator('.world-icon');
  assert.equal(await mergeIcon.locator('svg').count(), 0);
  assert.equal(await mergeIcon.locator('img').count(), 3);
  assert.equal(await page.locator('a[href*="draw-party"]').count(), 0);
  await noOverflow();
  await page.screenshot({ path: `${output}/home-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: `${output}/home-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });

  await open('/margin-merge/play');
  await page.waitForSelector('.mm-cell');
  await open('/games'); // Seed away from the game so its pagehide save cannot overwrite the fixture.
  const initial = await page.evaluate(async () => {
    const { newState } = await import('/src/games/merge/engine.ts');
    const s = newState(7, Date.now());
    s.cells[0] = { chain: 'paper', tier: 1 }; s.cells[1] = { chain: 'paper', tier: 1 };
    s.cells[2] = { chain: 'heroes', tier: 1 }; s.cells[3] = { chain: 'heroes', tier: 1 };
    s.cells[4] = { chain: 'tools', tier: 5 }; s.cells[5] = { chain: 'creatures', tier: 5 };
    s.level = 5; s.coins = 50; s.discovered = ['paper:1', 'heroes:1', 'tools:5', 'creatures:5'];
    s.orders = [{ id: 1, wants: [{ chain: 'paper', tier: 2 }], coins: 6, xp: 6 }, { id: 2, wants: [{ chain: 'heroes', tier: 2 }], coins: 6, xp: 6 }, { id: 3, wants: [{ chain: 'tools', tier: 5 }], coins: 48, xp: 15 }];
    s.nextOrderId = 4;
    localStorage.setItem('dh:margin-merge:state', JSON.stringify(s)); return s;
  });
  await open('/margin-merge/play');
  await page.waitForSelector('.mm-cell img');
  await noOverflow();
  const boardRect = await page.locator('#mm-board').boundingBox();
  const drawRect = await page.locator('#mm-draw').boundingBox();
  assert.ok(boardRect.y + boardRect.height < 760, 'Board is visible in the initial mobile viewport');
  assert.ok(drawRect.y + drawRect.height < 760, 'Draw is visible above mobile navigation');
  const cells = page.locator('.mm-cell');
  await cells.nth(4).locator('img').evaluate(el => { window.retainedImage = el; });
  await cells.nth(0).click();
  assert.ok(await cells.nth(4).locator('img').evaluate(el => el === window.retainedImage), 'Selecting preserves unrelated board images');
  assert.ok(await cells.nth(1).evaluate(el => el.classList.contains('match')));
  await cells.nth(1).click();
  assert.equal(await cells.nth(1).getAttribute('aria-label'), 'Sticky Note, Paper level 2');
  assert.equal(await cells.nth(0).locator('img').count(), 0);
  await page.waitForFunction(() => window.audioStarts > 0);
  const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('dh:margin-merge:state')));
  assert.equal((await save()).merges, 1);

  // Drag two matching pieces, then cancel another drag outside the board.
  const a = await cells.nth(2).boundingBox(), b = await cells.nth(3).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 }); await page.mouse.up();
  assert.equal((await save()).merges, 2);
  const beforeCancel = (await save()).cells;
  const fox = await cells.nth(5).boundingBox();
  await page.mouse.move(fox.x + fox.width / 2, fox.y + fox.height / 2); await page.mouse.down();
  await page.mouse.move(5, fox.y, { steps: 10 }); await page.mouse.up();
  assert.deepEqual((await save()).cells, beforeCancel);
  assert.equal(await page.locator('.mm-ghost').count(), 0);

  await page.locator('.mm-order').first().getByRole('button', { name: 'Deliver', exact: true }).click();
  assert.equal((await save()).delivered, 1);
  assert.equal((await save()).coins, initial.coins + 6);
  await page.locator('#mm-draw').click();
  assert.equal((await save()).cells.filter(Boolean).length, 4);
  await page.screenshot({ path: `${output}/merge-mobile.png`, fullPage: true });
  const persisted = await save(); await page.reload();
  assert.deepEqual((await save()).cells, persisted.cells);
  await page.locator('#mm-book').click();
  assert.ok(await page.locator('#mm-collection').evaluate(el => el.open));
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await open('/');
  assert.equal(await page.locator('[data-continue]').getAttribute('href'), '/margin-merge/play');
  await open('/settings');
  await page.locator('#setting-sound').uncheck();
  await page.locator('#setting-motion').check();
  assert.ok(await page.locator('html').evaluate(el => el.hasAttribute('data-reduced-motion')));
  await page.reload(); assert.equal(await page.locator('#setting-sound').isChecked(), false);
  await noOverflow();
  await page.screenshot({ path: `${output}/settings-mobile.png`, fullPage: true });
  await open('/margin-merge/play');
  await page.locator('#mm-draw').click();
  assert.equal(await page.evaluate(() => window.audioStarts), 0);
  assert.equal(await page.locator('[data-sound-toggle]').getAttribute('aria-label'), 'Enable sound effects');
  await open('/settings');
  assert.equal(await page.locator('#setting-music').isChecked(), false);
  await page.locator('#setting-music').check();
  await page.waitForFunction(() => window.audioStarts === 1);
  assert.equal(await page.locator('[data-music-toggle]').getAttribute('aria-pressed'), 'true');
  await page.locator('#setting-music-volume').evaluate(el => { el.value = '25'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dh:settings:music-volume'))), .25);
  await page.reload();
  assert.equal(await page.locator('#setting-music').isChecked(), true);
  assert.equal(await page.evaluate(() => window.audioStarts), 0, 'Music waits for a gesture after navigation');
  await page.locator('#setting-music').uncheck();
  assert.equal(await page.locator('[data-music-toggle]').getAttribute('aria-pressed'), 'false');
  // Reduced motion changes presentation, never the move or persisted result.
  await open('/games');
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dh:margin-merge:state'));
    s.cells[0] = { chain: 'paper', tier: 1 }; s.cells[1] = { chain: 'paper', tier: 1 };
    localStorage.setItem('dh:margin-merge:state', JSON.stringify(s));
  });
  await open('/margin-merge/play');
  await cells.nth(0).click(); await cells.nth(1).click();
  assert.equal((await save()).cells[1].tier, 2);
  assert.equal(await cells.nth(1).evaluate(el => getComputedStyle(el.querySelector('img')).animationDuration), '0s');

  // Complete the entire studio story through real UI actions, starting with
  // a legacy save. Fixture setup is away from the game (no pagehide overwrite).
  await open('/games');
  const storyFixture = await page.evaluate(async () => {
    const { newState } = await import('/src/games/merge/engine.ts');
    const { studioChapters } = await import('/src/games/merge/studio.ts');
    const s = newState(88, Date.now()); s.level = 5; s.coins = 40; s.ink = 18;
    let cell = 0;
    for (const chapter of studioChapters) for (const goal of chapter.goals) {
      if (goal.kind === 'discover') s.discovered.push(`${goal.item.chain}:${goal.item.tier}`);
      else for (let n = 0; n < (goal.quantity ?? 1); n++) s.cells[cell++] = { ...goal.item };
    }
    localStorage.setItem('dh:margin-merge:state', JSON.stringify(s)); return { state: s, chapters: studioChapters.map(c => ({ id: c.id, coins: c.reward.coins })) };
  });
  const legacy = storyFixture.state;
  await open('/margin-merge/play');
  const migrated = await save();
  assert.deepEqual(migrated.cells, legacy.cells);
  assert.deepEqual(migrated.orders, legacy.orders);
  assert.equal(migrated.coins, legacy.coins);
  assert.equal(migrated.seed, legacy.seed);
  assert.equal(migrated.studio.restored, 0);
  assert.equal(await page.locator('.studio-goal.done').count(), 1);
  await noOverflow();
  await page.screenshot({ path: `${output}/studio-start-mobile.png`, fullPage: true });
  const chapters = storyFixture.chapters;
  let expectedCoins = legacy.coins;
  for (let i = 0; i < chapters.length; i++) {
    assert.equal(await page.locator('[data-studio-restore]').isEnabled(), false);
    await page.locator('[data-studio-supply]').first().click();
    const supplied = (await save()).studio.supplied;
    const partial = (await save()).studio.contributions;
    await page.reload();
    assert.deepEqual((await save()).studio.supplied, supplied);
    assert.deepEqual((await save()).studio.contributions, partial);
    while (await page.locator('[data-studio-supply]').count()) await page.locator('[data-studio-supply]').first().click();
    assert.equal(await page.locator('[data-studio-restore]').isEnabled(), true);
    await page.locator('[data-studio-restore]').click();
    expectedCoins += chapters[i].coins;
    assert.equal((await save()).coins, expectedCoins);
    assert.equal((await save()).studio.restored, i + 1);
    assert.equal(await page.locator('[data-studio-scene]').getAttribute('data-act'), String(Math.floor(i / 4) + 1));
    assert.equal(await page.locator('[data-studio-scene]').getAttribute('data-local-restored'), String(i % 4 + 1));
    if (i === 4) assert.equal(await page.locator('#mm-focus').isEnabled(), true);
    if (i === 3) {
      assert.equal(await page.locator('[data-studio-ending]').isVisible(), true);
      await page.locator('[data-studio-continue]').click(); await page.reload();
      assert.equal((await save()).studio.freePlay, true);
      assert.equal((await save()).studio.restored, 4);
      await page.locator('[data-story-resume]').click();
      assert.equal((await save()).studio.activeAct, 2);
      assert.equal((await save()).coins, expectedCoins);
      await page.screenshot({ path: `${output}/harbour-start-mobile.png`, fullPage: true });
    }
    if (i === 7) {
      await page.screenshot({ path: `${output}/harbour-complete-mobile.png`, fullPage: true });
      await page.locator('[data-story-continue]').click();
      assert.equal((await save()).studio.activeAct, 3);
    }
    if (i === 0) {
      await page.screenshot({ path: `${output}/studio-workshop-mobile.png`, fullPage: true });
      await page.setViewportSize({ width: 320, height: 740 }); await noOverflow();
      await page.setViewportSize({ width: 390, height: 844 });
    }
  }
  assert.equal(await page.locator('[data-studio-ending]').isVisible(), true);
  assert.equal(await page.locator('[data-studio-restore]').isVisible(), false);
  assert.equal(await page.locator('[data-studio-progress]').getAttribute('value'), '48');
  await page.screenshot({ path: `${output}/studio-ending-mobile.png`, fullPage: true });
  const finished = await save(); await page.reload();
  assert.equal((await save()).coins, expectedCoins);
  assert.equal((await save()).studio.finishedAt, finished.studio.finishedAt);
  await page.locator('[data-studio-continue]').click();
  assert.equal((await save()).studio.freePlay, true);
  assert.equal(await page.locator('[data-studio-visual]').evaluate(el => el.open), false);
  await page.locator('#mm-focus').selectOption('paper');
  await page.locator('#mm-draw').click();
  assert.equal((await save()).cells.filter(Boolean).length, 1);
  const drawnCell = (await save()).cells.findIndex(Boolean);
  assert.equal((await save()).cells[drawnCell].chain, 'paper');
  await page.locator('.mm-cell').nth(drawnCell).click(); await page.locator('#mm-store').click();
  assert.equal((await save()).satchel.length, 1);
  assert.equal((await save()).cells.filter(Boolean).length, 0);
  await page.reload();
  await page.locator('#mm-satchel-panel').evaluate(el => { el.open = true; });
  await page.locator('[data-retrieve]').click();
  assert.equal((await save()).satchel.length, 0);
  assert.equal((await save()).cells.filter(Boolean).length, 1);
  assert.equal((await save()).focus, 'paper');
  await page.locator('.story-journal summary').click();
  assert.equal(await page.locator('.story-memory').count(), 12);
  await page.locator('.story-journal summary').click();
  await page.reload();
  assert.equal((await save()).studio.freePlay, true);
  assert.equal((await save()).coins, expectedCoins);
  await page.setViewportSize({ width: 1280, height: 900 }); await noOverflow();
  await page.screenshot({ path: `${output}/studio-free-play-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ['/games', '/progress', '/island-sketch/play?p=volcano', '/isle-spans/play?p=two-coves', '/lighthouse-wiring/play?p=first-light', '/doodle-guess/play', '/scribble-siege/play']) {
    await open(path); await noOverflow();
    if (path.startsWith('/island-sketch/play')) {
      await page.locator('#pl-zoom').click();
      assert.equal(await page.locator('#pl-zoom').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.ns-cell').first().evaluate(el => el.getBoundingClientRect().width), 44);
      await noOverflow();
      await page.locator('#pl-zoom').click();
    }
    if (path === '/progress') {
      assert.ok((await page.locator('#summary').innerText()).includes('Island stories complete'));
      await page.screenshot({ path: `${output}/journal-mobile.png`, fullPage: true });
    }
    if (path === '/scribble-siege/play') {
      await page.evaluate(() => {
        window.siegeDraws = 0;
        const original = CanvasRenderingContext2D.prototype.setTransform;
        CanvasRenderingContext2D.prototype.setTransform = function (...args) {
          if (this.canvas.id === 'sg-canvas') window.siegeDraws++;
          return original.apply(this, args);
        };
      });
      await page.locator('#sg-play').click();
      await page.waitForFunction(() => window.siegeDraws > 2);
      await page.locator('#hud-pause').click();
      assert.equal(await page.locator('#ov-pause').isVisible(), true);
      const pausedDraws = await page.evaluate(() => window.siegeDraws);
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => window.siegeDraws), pausedDraws, 'Paused Siege does not redraw');
      await page.locator('#pz-music').click();
      assert.equal(await page.locator('#pz-music').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#pz-sound').getAttribute('aria-pressed'), 'false');
      await page.locator('#pz-music').click();
      await page.locator('#pz-resume').click();
      await page.waitForFunction(count => window.siegeDraws > count, pausedDraws);
      await page.locator('#hud-pause').click();
      await page.locator('#pz-quit').click();
      assert.equal(await page.locator('#ov-end').isVisible(), true);
      await page.locator('#end-menu').click();
      assert.equal(await page.locator('#scr-menu').isVisible(), true);
    }
  }
  // All 32 local assets decode successfully in the browser.
  const images = await page.evaluate(async () => {
    const urls = ['heroes','paper','tools','creatures'].flatMap(chain => Array.from({ length: 8 }, (_, i) => `/images/merge/cartoon/${chain}-${i + 1}.svg`));
    return Promise.all(urls.map(url => new Promise(resolve => { const i = new Image(); i.onload = () => resolve(i.naturalWidth > 0); i.onerror = () => resolve(false); i.src = url; })));
  });
  assert.ok(images.every(Boolean));
  await open('/draw-party/play'); await page.waitForURL('**/games');
  assert.deepEqual(errors, []);
  console.log(`Browser checks passed. Screenshots: ${output}`);
} catch (error) {
  console.error('Page errors:', errors);
  console.error(await page.locator('body').innerText());
  console.error(await page.evaluate(() => localStorage.getItem('dh:margin-merge:state')));
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally { await browser.close(); }
