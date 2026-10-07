// Render scripts/og-card.html to public/og-default.jpg (1200x630).
//
//   npx -y playwright@1 install chromium   # once, if you don't have it
//   node scripts/og-card.mjs
//
// Playwright isn't a project dependency; this runs it from npx or a global
// install so the site itself stays dependency-light.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  const globalRoot = execSync('npm root -g').toString().trim();
  ({ chromium } = require(join(globalRoot, 'playwright')));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto('file://' + join(here, 'og-card.html'), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const out = join(here, '..', 'public', 'og-default.jpg');
await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
await browser.close();
console.log('wrote', out);
