// Playwright 截圖 + 量測:node scripts/shots.mjs [url-參數...]
// 例:node scripts/shots.mjs "aid=wiper" "aid=wiper&advanced=1"
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:5199/';
const OUT = process.env.OUT ?? 'docs/screenshots';
mkdirSync(OUT, { recursive: true });
let server = null;
if (!process.env.BASE) {
  server = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 2500));
}
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let page = null;
async function fresh() {
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 1280), height: Number(process.env.H ?? 800) }, deviceScaleFactor: Number(process.env.DPR ?? 1) });
  page.on('console', m => { if (['error', 'warning'].includes(m.type()) || m.text().startsWith('[test]')) console.log(`[${m.type()}]`, m.text().slice(0, 300)); });
  page.on('pageerror', e => { console.log('[pageerror]', e.message, (e.stack ?? '').split('\n').slice(0, 3).join(' | ')); if (!process.env.KEEP) process.exit(1); });
}
for (const q of process.argv.slice(2)) {
  const [query, name, script] = q.split('|');
  await fresh();
  await page.goto(`${BASE}?skip=1&debug=1&${query}`, { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.__app?.app?.current, null, { timeout: 120000 });
  await page.waitForTimeout(Number(process.env.WAIT ?? 2500));
  if (script) {
    await page.evaluate(script); await page.waitForTimeout(Number(process.env.SCRIPT_WAIT ?? 1600));
    const res = await page.evaluate(() => window.__res ?? null);
    if (res) console.log('RESULT', JSON.stringify(res));
  }
  const file = `${OUT}/${name ?? query.replace(/[^\w=-]+/g, '_')}.png`;
  await page.screenshot({ path: file, timeout: 180000 });
  const info = await page.evaluate(() => { const s = window.__app.classroom.stats?.samples.at(-1); return s ? { calls: s.calls, tris: s.tris } : null; });
  console.log(file, JSON.stringify(info));
}
await browser.close();
server?.kill();
