import { printMat, atlasUV } from './printAtlas.js';

// A3 機構草圖紙:改用印刷品圖集(printAtlas.js),所有紙張共用一個材質。
// 呼叫端要用 paperUV() 把紙張幾何的 uv 對應到該張草圖。
export function paperMat() { return printMat(); }
export function paperUV(geo, seed, { rotate = false } = {}) { return atlasUV(geo, `sketch${seed}`, { landscape: true, rotate }); }
