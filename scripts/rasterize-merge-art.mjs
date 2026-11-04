// Bakes the Margin Merge SVGs (public/images/merge/cartoon/*.svg) into
// 256 px transparent WebPs beside them. The SVGs use lighting filters that
// are slow to render on phones; the game shows these WebPs instead.
//
// Needs Playwright (as check-ui.mjs does) and ImageMagick's `magick`:
//   PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/rasterize-merge-art.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir = resolve(import.meta.dirname, '../public/images/merge/cartoon');
const SIZE = 256;
const svgs = readdirSync(dir).filter((f) => f.endsWith('.svg')).sort();
const tmp = mkdtempSync(join(tmpdir(), 'merge-art-'));

const browser = await chromium.launch();
// Each SVG is 128 × 128; a 2× device scale captures it at 256 px.
const page = await browser.newPage({ viewport: { width: 128, height: 128 }, deviceScaleFactor: SIZE / 128 });
for (const file of svgs) {
  await page.goto(`file://${join(dir, file)}`);
  const png = join(tmp, file.replace('.svg', '.png'));
  await page.screenshot({ path: png, omitBackground: true, clip: { x: 0, y: 0, width: 128, height: 128 } });
  const webp = join(dir, file.replace('.svg', '.webp'));
  execFileSync('magick', [png, '-quality', '88', '-define', 'webp:alpha-quality=100', webp]);
  console.log(`${file} → ${file.replace('.svg', '.webp')} (${statSync(webp).size} bytes)`);
}
await browser.close();
rmSync(tmp, { recursive: true, force: true });
if (svgs.length !== 32) throw new Error(`Expected 32 SVGs, found ${svgs.length}`);
