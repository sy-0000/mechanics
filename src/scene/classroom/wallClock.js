import * as THREE from 'three';
import { CLOCK } from './layout.js';
import { C } from '../../materials/palette.js';
import { toon } from '../../materials/toon.js';
import { makeCanvas, canvasTexture } from '../../materials/canvasTex.js';
import { cyl, torus, rbox, mk, group } from './util/geo.js';

// 黑板上方的圓形時鐘:奶油色鐘面、只有刻度(無數字)、灰色指針,固定在 8:20。
export function createWallClock(parent) {
  const g = group(parent, 'wallClock', CLOCK.center);
  const R = CLOCK.r;
  const c = makeCanvas(256, 256), x = c.getContext('2d');
  x.fillStyle = '#F7F0DE'; x.fillRect(0, 0, 256, 256);
  x.translate(128, 128); x.fillStyle = '#6E7275';
  for (let i = 0; i < 60; i++) {
    x.save(); x.rotate(i * Math.PI / 30);
    const big = i % 5 === 0; x.fillRect(-(big ? 3 : 1), -118, big ? 6 : 2, big ? 18 : 8); x.restore();
  }
  mk(g, cyl(R, R, 0.02, 40), toon('#F7F0DE', { map: canvasTexture(c, { repeat: false }), key: 'clockface' }), { rot: [Math.PI / 2, 0, 0], outline: false });
  mk(g, torus(R + 0.008, 0.012, 8, 40), toon(C.machineWarm), { pos: [0, 0, 0.008] });
  const hand = toon('#6B6F72');
  const h = 8 + 20 / 60, m = 20;
  const hh = group(g, 'hourHand', [0, 0, 0.016], [0, 0, -h / 12 * Math.PI * 2]);
  mk(hh, rbox(0.012, R * 0.55, 0.004, 0.0015), hand, { pos: [0, R * 0.22, 0] });
  const mh = group(g, 'minuteHand', [0, 0, 0.02], [0, 0, -m / 60 * Math.PI * 2]);
  mk(mh, rbox(0.008, R * 0.8, 0.004, 0.0015), hand, { pos: [0, R * 0.34, 0] });
  mk(g, cyl(0.008, 0.008, 0.012, 12), hand, { pos: [0, 0, 0.022], rot: [Math.PI / 2, 0, 0] });
  // 鐘面玻璃(邊框內)略過,保持乾淨
  return g;
}
