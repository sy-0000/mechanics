// 黑板可讀性檢查:每個教具(進階數學開啟)寫完後,三區的最小字高 ≥ 4 cm、沒有溢出。
// 也檢查「看黑板」站位到板面的距離。用法:BASE=http://localhost:5173/ node scripts/board-check.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const BASE = process.env.BASE ?? 'http://localhost:5173/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`${BASE}?skip=1&aid=none&quality=vr-baked&advanced=1`, { waitUntil: 'commit', timeout: 180000 });
await page.waitForFunction(() => window.__app?.classroom, null, { timeout: 180000 });
let bad = 0;
const dist = await page.evaluate(() => { const b = window.__app.classroom.anchors.boardViewpoint, s = window.__app.classroom.anchors.boardSurface.object; const p = new window.__app.THREE.Vector3(); s.getWorldPosition(p); return Math.abs(p.z - b.position.z); });
console.log(`看黑板站位到板面:${dist.toFixed(2)} m`); if (Math.abs(dist - 2) > 0.05) bad++;
for (const id of ['wiper', 'engine', 'crusher', 'gears', 'bike', 'clock', 'driver']) {
  await page.evaluate(async id => { const a = window.__app.app; await a.select(id); a.setAdvanced(true); }, id);
  await page.waitForTimeout(6000);
  const m = await page.evaluate(() => window.__app.classroom.board.metrics());
  for (const [z, v] of Object.entries(m)) {
    if (!v) continue;
    const ok = v.minGlyphM >= 0.0399 && !v.overflow; if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'BAD'} ${id.padEnd(8)} ${z.padEnd(6)} 最小字高 ${(v.minGlyphM * 100).toFixed(1)} cm、${v.rows} 行、縮放 ${v.scale.toFixed(2)}${v.overflow ? '、溢出' : ''}`);
  }
}
await browser.close();
console.log(bad ? `${bad} 項不合格` : '全部合格');
process.exit(bad ? 1 : 0);
