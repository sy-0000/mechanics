#!/usr/bin/env node
// 畫面檢查:對每一關、每個步驟、藍圖模式、卷軸各截一張圖 → docs/screenshots/
// 用法:先 `npm run dev`(或 vite preview),再 node scripts/screenshot.js [--url http://localhost:5173]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const url = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:5173';
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const SHOTS = [
  // [檔名, level, stage, 其他動作]
  ['wiper-1-structure', 'wiper', 0],
  ['wiper-2-mechanism', 'wiper', 1],
  ['wiper-3-machine', 'wiper', 2],
  ['wiper-scroll', 'wiper', 1, 'scroll'],
  ['wiper-blueprint', 'wiper', 1, 'blueprint'],
  ['slider-crank', 'sliderCrank', 0],
  ['slider-crank-scroll', 'sliderCrank', 0, 'scroll'],
  ['slider-crank-blueprint', 'sliderCrank', 0, 'blueprint'],
  ['toggle-clamp', 'toggleClamp', 0],
  ['toggle-clamp-scroll', 'toggleClamp', 0, 'scroll'],
  ['gear-1-problem', 'gearBasics', 0],
  ['gear-2-arc', 'gearBasics', 1],
  ['gear-3-torque', 'gearBasics', 2],
  ['gear-4-tradeoff', 'gearBasics', 3],
  ['gear-demo-friction', 'gearBasics', 10],
  ['gear-demo-idler', 'gearBasics', 11],
  ['gear-scroll', 'gearBasics', 1, 'scroll'],
  ['gear-blueprint', 'gearBasics', 1, 'blueprint'],
  ['apps-1-bike', 'gearApps', 0],
  ['apps-2-clock', 'gearApps', 1],
  ['apps-3-driver', 'gearApps', 2],
  ['apps-scroll', 'gearApps', 0, 'scroll'],
  ['apps-blueprint', 'gearApps', 1, 'blueprint'],
];

const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('頁面錯誤:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });

await page.goto(`${url}/?debug=1`);
await page.fill('#name', '測試');
await page.click('#enter');
await page.waitForFunction(() => window.__app?.manager?.current, null, { timeout: 30000 });
await page.waitForTimeout(1500);

let fails = 0;
for (const [name, level, stage, action] of SHOTS) {
  try {
    await page.evaluate(async ({ level: l, stage: s }) => {
      window.__app.blueprint.toggle(false);
      await window.__app.load(l, 0);
      window.__app.setStage(s);
    }, { level, stage });
    await page.waitForTimeout(700);
    if (action === 'blueprint') {
      await page.evaluate(() => window.__app.blueprint.toggle(true));
      await page.waitForTimeout(800);
    }
    if (action === 'scroll') {
      await page.evaluate(() => window.__app.openScroll(0));
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: `${OUT}${name}.png` });
    console.log('✓', name);
  } catch (e) {
    fails++;
    console.error('✗', name, e.message);
  }
}
await browser.close();
console.log(fails ? `✗ ${fails} 張失敗` : `✓ 全部 ${SHOTS.length} 張完成 → docs/screenshots/`);
process.exit(fails ? 1 : 0);
