import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// 共用的建模小工具。所有尺寸單位為公尺。

/** 以公尺為單位的盒狀 UV(依面方向投影),讓木紋不會因物件大小被拉伸。 */
export function worldUV(geo, scale = 1) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u * scale; uv[i * 2 + 1] = v * scale;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

const geoCache = new Map();
function cached(key, fn) { if (!geoCache.has(key)) geoCache.set(key, fn()); return geoCache.get(key); }

/** 倒角盒。r 為倒角半徑(預設依最短邊自動)。 */
export function rbox(w, h, d, r) {
  const rr = r ?? Math.min(0.006, Math.min(w, h, d) * 0.2);
  return cached(`rb${w}|${h}|${d}|${rr}`, () => worldUV(new RoundedBoxGeometry(w, h, d, 2, rr)));
}
export function cyl(rt, rb, h, seg = 16, open = false) {
  return cached(`cy${rt}|${rb}|${h}|${seg}|${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));
}
export function sphere(r, ws = 12, hs = 8) {
  return cached(`sp${r}|${ws}|${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
}
export function torus(R, r, rs = 8, ts = 24, arc = Math.PI * 2) {
  return cached(`to${R}|${r}|${rs}|${ts}|${arc}`, () => new THREE.TorusGeometry(R, r, rs, ts, arc));
}
export function plane(w, h, sx = 1, sy = 1) {
  return cached(`pl${w}|${h}|${sx}|${sy}`, () => new THREE.PlaneGeometry(w, h, sx, sy));
}

/**
 * 建立 Mesh 並放入 parent。
 * opts: pos [x,y,z], rot [x,y,z], scale, cast, receive, outline, name
 */
export function mk(parent, geo, mat, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (opts.pos) m.position.set(...opts.pos);
  if (opts.rot) m.rotation.set(...opts.rot);
  if (opts.scale !== undefined) Array.isArray(opts.scale) ? m.scale.set(...opts.scale) : m.scale.setScalar(opts.scale);
  if (opts.name) m.name = opts.name;
  if (opts.outline === false) m.userData.outline = false;
  m.castShadow = !!opts.cast; m.receiveShadow = !!opts.receive;
  parent.add(m);
  return m;
}

export function group(parent, name, pos, rot) {
  const g = new THREE.Group(); g.name = name ?? '';
  if (pos) g.position.set(...pos);
  if (rot) g.rotation.set(...rot);
  if (parent) parent.add(g);
  return g;
}

/** 標記為近景(即時陰影)。 */
export function markNear(obj, cast = true) {
  obj.traverse(o => { if (o.isMesh && !o.userData.isOutline) { o.castShadow = cast; o.receiveShadow = true; o.userData.near = true; } });
  return obj;
}
/** 標記為不參與合併(動畫物件、掛載點)。 */
export function markDynamic(obj) {
  obj.traverse(o => { o.userData.dynamic = true; });
  return obj;
}

/** 由多組 [pos, rot, scale] 建立 InstancedMesh。 */
export function instanced(parent, geo, mat, transforms, opts = {}) {
  const im = new THREE.InstancedMesh(geo, mat, transforms.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  transforms.forEach((t, i) => {
    p.set(...t.pos); e.set(...(t.rot ?? [0, 0, 0])); q.setFromEuler(e);
    const sc = t.scale ?? 1; Array.isArray(sc) ? s.set(...sc) : s.setScalar(sc);
    im.setMatrixAt(i, m4.compose(p, q, s));
    if (t.color) im.setColorAt(i, new THREE.Color(t.color));
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = !!opts.cast; im.receiveShadow = !!opts.receive;
  im.frustumCulled = false;
  if (opts.name) im.name = opts.name;
  parent.add(im);
  return im;
}

/** 以 2D 輪廓擠出(厚度沿 z)。 */
export function extrude(shape, depth, bevel = 0.002) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 12 });
  g.translate(0, 0, -depth / 2);
  return g;
}
export function lathe(points, seg = 20) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg);
}
/** 沿路徑的細管(把手、線材)。 */
export function tube(points, r, seg = 24, rs = 6, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed);
  return new THREE.TubeGeometry(curve, seg, r, rs, closed);
}
