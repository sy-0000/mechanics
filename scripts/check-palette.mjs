// 檢查教室原始碼中所有 #RRGGBB 顏色,是否接近教具保留語意色(CIE76 ΔE < 門檻即列出)。
// 例外:chalkWriter.js 的粉筆淡色版(規格允許)。用法:node scripts/check-palette.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RESERVED = { 動力件銅橘: '#C08054', 連桿黃: '#DBBE62', 機架深棕: '#5A3A28', 輸出件綠: '#75A17B' };
const LIMIT = 20;
const toLab = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92));
  const [x, y, z] = [
    (c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047,
    c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722,
    (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883,
  ].map(v => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116));
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const dE = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const files = [];
const walk = d => readdirSync(d).forEach(f => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.js$/.test(f) && files.push(p); });
walk('src/scene'); walk('src/materials');
let bad = 0;
for (const f of files) {
  if (f.endsWith('chalkWriter.js') || f.endsWith('palette.js') || f.endsWith('debugStats.js')) continue; // 粉筆淡色版、除錯疊層不屬於場景物件
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    for (const [hex] of line.matchAll(/#[0-9A-Fa-f]{6}\b/g)) {
      for (const [name, r] of Object.entries(RESERVED)) {
        const d = dE(toLab(hex), toLab(r));
        if (d < LIMIT) { bad++; console.log(`${f}:${i + 1} ${hex} 太接近 ${name} ${r}(ΔE=${d.toFixed(1)})`); }
      }
    }
  });
}
// palette.js 內的命名色也要檢查(RESERVED 那一行除外)
readFileSync('src/materials/palette.js', 'utf8').split('\n').forEach((line, i) => {
  if (line.includes('RESERVED') || line.trim().startsWith('//')) return;
  for (const [hex] of line.matchAll(/#[0-9A-Fa-f]{6}\b/g)) for (const [name, r] of Object.entries(RESERVED)) {
    const d = dE(toLab(hex), toLab(r)); if (d < LIMIT) { bad++; console.log(`palette.js:${i + 1} ${hex} 太接近 ${name}(ΔE=${d.toFixed(1)})`); }
  }
});
console.log(bad ? `\n${bad} 個顏色需要調整` : `OK:${files.length} 個檔案,沒有顏色接近四個語意色(ΔE 門檻 ${LIMIT})`);
process.exit(bad ? 1 : 0);
