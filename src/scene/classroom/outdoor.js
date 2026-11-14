import * as THREE from 'three';
import { ROOM, OUTDOOR } from './layout.js';
import { C } from '../../materials/palette.js';
import { makeCanvas, canvasTexture, rng } from '../../materials/canvasTex.js';
import { mk, group, rbox } from './util/geo.js';

// 窗外(二樓往下看操場)。近處 3D 物件(走廊、欄杆、樹、籃球架),遠處弧形背景板(校舍、山稜、天空)產生視差。
// 窗外材質一律 fog=false,大氣霧化直接烘進顏色(依距離混向 #FEFDF5),地平線保持清楚。
const FOGC = new THREE.Color(C.fog);
function hazed(hex, dist) {
  const k = THREE.MathUtils.clamp((dist - 4) / 80, 0, 0.75);
  return new THREE.Color(hex).lerp(FOGC, k);
}
const basic = (hex, dist, extra = {}) => new THREE.MeshBasicMaterial({ color: hazed(hex, dist), fog: false, ...extra });
// 帶簡單明暗的卡通材質(窗外也保留卡通感)
const shadedCache = new Map();
function shaded(hex, dist) {
  const k = `${hex}|${Math.round(dist)}`;
  if (!shadedCache.has(k)) shadedCache.set(k, new THREE.MeshLambertMaterial({ color: hazed(hex, dist), fog: false }));
  return shadedCache.get(k);
}

export function createOutdoor(parent) {
  const g = group(parent, 'outdoor');

  const X0 = ROOM.xMin - 0.12; // 外牆面
  const drop = -OUTDOOR.floorDrop;

  // 外部的光:窗外使用 Lambert,需要自己的光(不影響室內:用 layers 太複雜,直接用低強度)
  // 走廊地板與外牆
  mk(g, new THREE.BoxGeometry(OUTDOOR.corridorW, 0.15, 30), shaded('#DAD6CC', 3), { pos: [X0 - OUTDOOR.corridorW / 2, -0.075, 0] });
  mk(g, new THREE.BoxGeometry(0.3, 4, 30), shaded('#E6E1D6', 5), { pos: [X0 - OUTDOOR.corridorW - 0.15, drop / 2 - 0.1, 0] });
  // 走廊欄杆(灰白):扶手 + 立柱 + 下方矮牆
  const railX = X0 - OUTDOOR.corridorW + 0.05;
  mk(g, new THREE.BoxGeometry(0.12, 0.3, 30), shaded('#E9E7E1', 3), { pos: [railX, 0.15, 0] });
  mk(g, new THREE.BoxGeometry(0.08, 0.05, 30), shaded(C.rail, 3), { pos: [railX, 1.05, 0] });
  const postGeo = new THREE.BoxGeometry(0.03, 0.5, 0.03);
  const posts = new THREE.InstancedMesh(postGeo, shaded('#D8D8D2', 3), 60);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 60; i++) posts.setMatrixAt(i, m4.compose(new THREE.Vector3(railX, 0.675, -15 + i * 0.5), new THREE.Quaternion(), new THREE.Vector3(1, 1.5, 1)));
  g.add(posts);
  // 走廊天花(雨遮)
  mk(g, new THREE.BoxGeometry(OUTDOOR.corridorW + 0.2, 0.15, 30), shaded('#EEEAE0', 3), { pos: [X0 - OUTDOOR.corridorW / 2, 3.2, 0] });

  // 操場地面(草地 + PU 跑道 + 白線),位於下方 4 m
  const groundY = drop - 0.1;
  const field = makeCanvas(1024, 1024), fg = field.getContext('2d'), r = rng(9);
  fg.fillStyle = '#' + hazed(C.grass, 25).getHexString(); fg.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2500; i++) { fg.fillStyle = `rgba(120,120,90,${r() * 0.06})`; fg.fillRect(r() * 1024, r() * 1024, 6, 2); }
  // 跑道:圓角長方形環
  const trackC = '#' + hazed(C.track, 25).getHexString();
  const ring = (inset, col, lw) => {
    fg.strokeStyle = col; fg.lineWidth = lw; const x = 120 + inset, y = 140 + inset, w = 784 - inset * 2, h = 744 - inset * 2, rr = h / 2 - 10;
    fg.beginPath(); fg.roundRect(x, y, w, h, rr); fg.stroke();
  };
  ring(0, trackC, 110);
  for (let i = -2; i <= 2; i++) ring(i * 20, 'rgba(250,250,245,0.85)', 2);
  fg.fillStyle = 'rgba(250,250,245,0.8)'; fg.fillRect(470, 140 - 55, 3, 110);
  const fieldTex = canvasTexture(field, { repeat: false });
  const ground = mk(g, new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ map: fieldTex, fog: false }), { pos: [-36, groundY, 0], rot: [-Math.PI / 2, 0, Math.PI / 2] });
  // 外圍地面(延伸到背景板)
  mk(g, new THREE.CircleGeometry(OUTDOOR.backdropR, 48, Math.PI / 2, Math.PI), basic('#D9D3C2', 50), { pos: [0, groundY - 0.02, 0], rot: [-Math.PI / 2, 0, 0] });

  // 籃球架(灰白)
  const hoop = group(g, 'hoop', [-14, groundY, 9]);
  mk(hoop, new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8), shaded('#C9CBCC', 15), { pos: [0, 1.7, 0] });
  mk(hoop, new THREE.BoxGeometry(0.9, 0.08, 0.08), shaded('#C9CBCC', 15), { pos: [0.45, 3.3, 0] });
  mk(hoop, new THREE.BoxGeometry(0.05, 1.05, 1.8), shaded('#F4F2EC', 15), { pos: [0.9, 3.4, 0] });
  mk(hoop, new THREE.TorusGeometry(0.23, 0.02, 6, 16), shaded('#B8A9A2', 15), { pos: [1.15, 3.05, 0], rot: [Math.PI / 2, 0, 0] });

  // 行道樹(近處幾棵 3D,樹冠用低多邊形球)
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 2.6, 7);
  const crownGeo = new THREE.IcosahedronGeometry(1.6, 1);
  const trees = [[-7, -9], [-7, -4], [-7.4, 3.5], [-7, 8.5], [-26, -14], [-30, 14], [-34, 2], [-12, -16], [-13, 17]];
  trees.forEach(([tx, tz], i) => {
    const d = Math.hypot(tx, tz);
    const tg = group(g, 'tree', [tx, groundY, tz]);
    mk(tg, trunkGeo, shaded('#9C8E80', d), { pos: [0, 1.3, 0] });
    const s = 0.9 + (i % 3) * 0.2;
    mk(tg, crownGeo, shaded('#B4B096', d), { pos: [0, 3.4 * s, 0], scale: [s, s * 1.15, s] });
    mk(tg, crownGeo, shaded('#C0BDA4', d), { pos: [0.5, 4.2 * s, 0.3], scale: s * 0.65 });
  });
  // 遠方校舍(盒子 + 窗帶)
  const bldg = (x, z, w, h, d, ry = 0) => {
    const dist = Math.hypot(x, z);
    const b = group(g, 'building', [x, groundY, z], [0, ry, 0]);
    mk(b, new THREE.BoxGeometry(w, h, d), shaded('#EDE6D6', dist), { pos: [0, h / 2, 0] });
    for (let f = 1; f < h / 3.4; f++) mk(b, new THREE.BoxGeometry(w + 0.02, 0.6, d + 0.02), basic('#C9CED1', dist), { pos: [0, f * 3.4 - 1.2, 0] });
    mk(b, new THREE.BoxGeometry(w + 0.4, 0.3, d + 0.4), shaded('#D2C9BC', dist), { pos: [0, h + 0.15, 0] });
  };
  // 校舍放在操場兩側與遠端,中間留空,讓跑道與山稜線清楚可見
  bldg(-68, 4, 7, 10, 34, 0.05);
  bldg(-44, 34, 26, 11, 7, 0.35);
  bldg(-46, -36, 24, 12, 7, -0.4);

  // 弧形背景板:天空漸層 + 淡淡山稜線(只覆蓋窗外 −X 半邊)
  const sky = makeCanvas(1024, 512), sg = sky.getContext('2d');
  const grd = sg.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#CFDDE6'); grd.addColorStop(0.55, '#E6EDEC'); grd.addColorStop(0.78, C.fog); grd.addColorStop(1, C.fog);
  sg.fillStyle = grd; sg.fillRect(0, 0, 1024, 512);
  const ridge = (base, amp, col, seed) => {
    const rr = rng(seed); sg.fillStyle = col; sg.beginPath(); sg.moveTo(0, 512);
    let y = base;
    for (let x = 0; x <= 1024; x += 16) { y += (rr() - 0.5) * amp; y = Math.min(base + 25, Math.max(base - 45, y)); sg.lineTo(x, y); }
    sg.lineTo(1024, 512); sg.fill();
  };
  ridge(330, 18, '#DCE0DA', 4);
  ridge(358, 12, '#D5D8CE', 8);
  // 地平線以下的遠景地面色
  sg.fillStyle = '#D9D3C2'; sg.fillRect(0, 392, 1024, 120);
  // 雲(淡)
  sg.fillStyle = 'rgba(255,255,250,0.55)';
  for (let i = 0; i < 9; i++) { const cx = rng(i + 20)() * 1024; sg.beginPath(); sg.ellipse(cx, 80 + i * 14, 70, 12, 0, 0, Math.PI * 2); sg.fill(); }
  const skyTex = canvasTexture(sky, { repeat: false });
  const R = OUTDOOR.backdropR, Hb = 60;
  const back = new THREE.CylinderGeometry(R, R, Hb, 48, 1, true, Math.PI, Math.PI);
  const bd = mk(g, back, new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }), { pos: [0, groundY + Hb * 0.5 - 14.06, 0] });
  bd.userData.outline = false;
  // 頂部天空罩(半球)
  const dome = mk(g, new THREE.SphereGeometry(R + 1, 24, 8, Math.PI, Math.PI, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#CFDDE6', side: THREE.BackSide, fog: false }), { pos: [0, groundY + Hb - 14.06 - 0.5, 0] });

  // 戶外補光(只影響 Lambert 材質,室內 toon 也會受影響,所以強度很低,且放在窗外)
  g.traverse(o => { o.userData.outline = false; o.userData.outdoor = true; });
  return g;
}
