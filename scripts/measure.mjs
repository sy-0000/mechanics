// 量測三種畫質下,教室 + 每個教具的 draw calls 與三角面數(固定在工作桌視角)。
// 用法:BASE=http://localhost:5173/ node scripts/measure.mjs [high vr vr-baked]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const BASE = process.env.BASE ?? 'http://localhost:5173/';
const AIDS = ['wiper', 'engine', 'crusher', 'gears', 'bike', 'clock', 'driver'];
const modes = process.argv.slice(2).length ? process.argv.slice(2) : ['vr', 'vr-baked', 'high'];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = {};
for (const q of modes) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(`${BASE}?skip=1&aid=none&quality=${q}`, { waitUntil: 'commit', timeout: 180000 });
  await page.waitForFunction(() => window.__app?.classroom, null, { timeout: 180000 });
  const frame = () => page.evaluate(() => new Promise(r => {
    const { classroom, renderer } = window.__app;
    let n = 0; const tick = () => { if (++n < 3) return requestAnimationFrame(tick);
      if (q === 'vr-baked') renderer.shadowMap.needsUpdate = false;
      classroom.update(); classroom.render(); r({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles }); };
    var q = classroom.quality; requestAnimationFrame(tick); }));
  await page.waitForTimeout(4000);
  const base = await frame();
  out[q] = { classroom: base, aids: {} };
  console.log(q, 'classroom', base);
  for (const id of AIDS) {
    await page.evaluate(id => window.__app.app.select(id), id);
    await page.waitForTimeout(5000);
    const r = await frame();
    // 教具本身的三角面(含 InstancedMesh 數量)與 Mesh 數
    const own = await page.evaluate(() => {
      const root = window.__app.app.current.root; let tris = 0, meshes = 0;
      root.traverse(o => { if (!(o.isMesh || o.isLine) || !o.visible) return; let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false; if (!vis) return;
        meshes++; if (o.isMesh) { const g = o.geometry; const n = (g.index ? g.index.count : g.attributes.position.count) / 3; tris += n * (o.isInstancedMesh ? o.count : 1); } });
      return { tris: Math.round(tris), meshes };
    });
    out[q].aids[id] = { total: r, delta: r.calls - base.calls, own };
    console.log(q, id, JSON.stringify(out[q].aids[id]));
    await page.evaluate(() => window.__app.app.unload());
    await page.waitForTimeout(1500);
  }
  await page.close();
}
writeFileSync('docs/perf.json', JSON.stringify(out, null, 1));
await browser.close();
