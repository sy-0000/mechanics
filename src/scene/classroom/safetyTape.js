import * as THREE from 'three';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { mk } from './util/geo.js';

// 機台周圍的地面安全區:奶油白膠帶(不使用黃色),5 cm 寬的矩形框,轉角處有斜線圖示(只用圖示,無文字)。
export function createSafetyTape(parent, w, d, [cx, cz] = [0, 0]) {
  const mat = std(C.tapeCream, { key: 'tape' });
  const tw = 0.05, y = 0.002;
  const strip = (len, x, z, rotY) => {
    const m = mk(parent, new THREE.PlaneGeometry(len, tw), mat, { pos: [cx + x, y, cz + z], rot: [-Math.PI / 2, 0, rotY], receive: false });
    m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1;
    return m;
  };
  strip(w, 0, d / 2, 0); strip(w, 0, -d / 2, 0);
  strip(d, w / 2, 0, Math.PI / 2); strip(d, -w / 2, 0, Math.PI / 2);
  // 前方兩角的斜紋
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) strip(0.12, s * (w / 2 - 0.05 - i * 0.05), d / 2 - 0.05, s * Math.PI / 4);
}
