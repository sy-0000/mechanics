import * as THREE from 'three';
import { ROOM, WINDOWS, DOOR, BOARD } from './layout.js';
import { C } from '../../materials/palette.js';
import { std, wallMat } from '../../materials/standard.js';
import { woodMat } from '../../materials/wood.js';
import { terrazzoMat } from '../../materials/terrazzo.js';
import { glassMat } from '../../materials/glass.js';
import { rbox, mk, group, worldUV } from './util/geo.js';

// 房間殼體:磨石子地板、上半奶油白牆、下半 1.0 m 淺木護牆板、天花板(燈具另見 ceiling.js)、後牆右側木門。
export function createRoom(parent) {
  const g = group(parent, 'room');
  const { xMin, xMax, zMin, zMax, height: H, wainscot: WH } = ROOM;
  const W = xMax - xMin, D = zMax - zMin, cx = (xMin + xMax) / 2, cz = (zMin + zMax) / 2;
  const wall = wallMat(C.wallCream);
  const panel = woodMat(C.woodLight, 'grain', 21);
  const t = 0.12; // 牆厚

  // 地板
  const floorGeo = worldUV(new THREE.BoxGeometry(W + 0.4, 0.1, D + 0.4), 1);
  const floor = mk(g, floorGeo, terrazzoMat(C.terrazzo), { pos: [cx, -0.05, cz], receive: true, name: 'floor' });
  floor.userData.near = true;

  // 牆片小工具:從 a 到 b 的盒子
  const slab = (x0, x1, y0, y1, z0, z1, mat, name) => {
    const geo = worldUV(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), 1);
    const m = mk(g, geo, mat, { pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], name }); return m;
  };

  // 前牆(黑板牆)與後牆
  slab(xMin - t, xMax + t, 0, H, zMin - t, zMin, wall, 'frontWall');
  // 後牆留門洞
  const d0 = DOOR.xc - DOOR.w / 2, d1 = DOOR.xc + DOOR.w / 2;
  slab(xMin - t, d0, 0, H, zMax, zMax + t, wall, 'backWallA');
  slab(d1, xMax + t, 0, H, zMax, zMax + t, wall, 'backWallB');
  slab(d0, d1, DOOR.h, H, zMax, zMax + t, wall, 'backWallTop');
  // 右牆
  slab(xMax, xMax + t, 0, H, zMin - t, zMax + t, wall, 'rightWall');
  // 左牆:三個窗洞
  const zs = WINDOWS.centersZ.map(z => [z - WINDOWS.w / 2, z + WINDOWS.w / 2]);
  const sillTop = WINDOWS.sill + WINDOWS.h;
  let zc = zMin - t;
  for (const [a, b] of zs) { slab(xMin - t, xMin, 0, H, zc, a, wall, 'leftPier'); zc = b; }
  slab(xMin - t, xMin, 0, H, zc, zMax + t, wall, 'leftPier');
  for (const [a, b] of zs) {
    slab(xMin - t, xMin, 0, WINDOWS.sill, a, b, wall, 'leftUnder');
    slab(xMin - t, xMin, sillTop, H, a, b, wall, 'leftOver');
  }
  // 天花板
  const ceil = slab(xMin - t, xMax + t, H, H + 0.1, zMin - t, zMax + t, wallMat(C.ceiling), 'ceiling');

  // 護牆板(1.0 m,左牆窗下只到窗台)+ 頂部壓條
  const cap = std(C.woodMid);
  const wd = 0.015;
  const wainscot = (x0, x1, z0, z1, top) => {
    slab(x0, x1, 0, top, z0, z1, panel, 'wainscot');
  };
  wainscot(xMin, xMax, zMin, zMin + wd, WH);                        // 前
  wainscot(xMin, d0, zMax - wd, zMax, WH); wainscot(d1, xMax, zMax - wd, zMax, WH); // 後
  wainscot(xMax - wd, xMax, zMin, zMax, WH);                        // 右
  zc = zMin;
  for (const [a, b] of zs) { wainscot(xMin, xMin + wd, zc, a, WH); wainscot(xMin, xMin + wd, a, b, WINDOWS.sill); zc = b; }
  wainscot(xMin, xMin + wd, zc, zMax, WH);
  // 壓條
  const capRail = (x0, x1, z0, z1, y) => {
    const m = mk(g, rbox(Math.max(0.03, x1 - x0), 0.03, Math.max(0.03, z1 - z0), 0.006), cap, { pos: [(x0 + x1) / 2, y, (z0 + z1) / 2] });
    return m;
  };
  capRail(xMin, xMax, zMin, zMin + 0.03, WH);
  capRail(xMin, d0, zMax - 0.03, zMax, WH); capRail(d1, xMax, zMax - 0.03, zMax, WH);
  capRail(xMax - 0.03, xMax, zMin, zMax, WH);
  // 踢腳板
  const kick = std(C.woodFrame);
  mk(g, rbox(W, 0.08, 0.02, 0.004), kick, { pos: [cx, 0.04, zMin + 0.025] });
  mk(g, rbox(0.02, 0.08, D, 0.004), kick, { pos: [xMax - 0.025, 0.04, cz] });

  createDoor(g, d0, d1, zMax);
  return g;
}

function createDoor(parent, d0, d1, z) {
  const g = group(parent, 'door', [(d0 + d1) / 2, 0, z]);
  const frame = woodMat(C.woodFrame, 'grain', 31), leaf = woodMat(C.woodMid, 'grain', 33);
  const W = d1 - d0, H = DOOR.h, ft = 0.06;
  mk(g, rbox(ft, H, 0.16), frame, { pos: [-W / 2 + ft / 2, H / 2, 0] });
  mk(g, rbox(ft, H, 0.16), frame, { pos: [W / 2 - ft / 2, H / 2, 0] });
  mk(g, rbox(W, ft, 0.16), frame, { pos: [0, H - ft / 2, 0] });
  const lw = W - ft * 2, lh = H - ft;
  // 門扇:下半實心,上半小玻璃窗
  mk(g, rbox(lw, lh * 0.62, 0.04), leaf, { pos: [0, lh * 0.31, -0.02] });
  mk(g, rbox(lw, lh * 0.08, 0.04), leaf, { pos: [0, lh - lh * 0.04, -0.02] });
  mk(g, rbox(lw * 0.22, lh * 0.3, 0.04), leaf, { pos: [-lw / 2 + lw * 0.11, lh * 0.77, -0.02] });
  mk(g, rbox(lw * 0.22, lh * 0.3, 0.04), leaf, { pos: [lw / 2 - lw * 0.11, lh * 0.77, -0.02] });
  const gl = mk(g, new THREE.PlaneGeometry(lw * 0.56, lh * 0.3), glassMat(0.18), { pos: [0, lh * 0.77, -0.02], rot: [0, Math.PI, 0] });
  // 玻璃後方:走廊的淡色牆
  mk(g, new THREE.PlaneGeometry(lw * 0.6, lh * 0.34), std('#EFEADF'), { pos: [0, lh * 0.77, 0.4], rot: [0, Math.PI, 0] });
  // 門板裝飾框線與門把
  const metal = std(C.steel);
  mk(g, rbox(lw * 0.7, lh * 0.4, 0.008), leaf, { pos: [0, lh * 0.3, -0.045] });
  mk(g, new THREE.CylinderGeometry(0.012, 0.012, 0.12, 10), metal, { pos: [lw / 2 - 0.08, 1.0, -0.07], rot: [0, 0, Math.PI / 2] });
  mk(g, rbox(0.03, 0.14, 0.012), metal, { pos: [lw / 2 - 0.06, 1.0, -0.045] });
  return g;
}
