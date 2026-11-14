import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ensureSmoothNormals, addOutline, getOutlineMaterial } from '../../../materials/outline.js';

// 把靜態物件合併成少數幾個 Mesh,大幅降低 draw call(Quest 3 的關鍵)。
// 物件仍各自在獨立檔案建模;合併只發生在執行期:
//  - 卡通材質的顏色烘進頂點色,依「貼圖 + 面向 + 陰影旗標」分組,不同顏色可共用一個 draw call。
//  - 遠景物件再把柔和環境遮蔽(地面附近、牆角較暗)烘進頂點色,並且不參與即時陰影。
//  - 所有描邊外殼合併成一個 Mesh(只需 position + smoothNormal)。

const KEEP = ['position', 'normal', 'uv', 'smoothNormal', 'color'];
const sharedMats = new Map();

function aoAt(y, ny) {
  const ground = 0.8 + 0.2 * THREE.MathUtils.smoothstep(y, 0.0, 1.1);
  const ceil = 1 - 0.08 * THREE.MathUtils.smoothstep(y, 2.6, 3.0);
  return ground * ceil * (ny < -0.5 ? 0.92 : 1);
}

function sharedToon(src) {
  const key = `${src.map?.uuid ?? 'none'}|${src.side}|${src.polygonOffset}`;
  if (!sharedMats.has(key)) {
    const m = src.clone(); m.color.set('#ffffff'); m.vertexColors = true;
    sharedMats.set(key, m);
  }
  return sharedMats.get(key);
}

export function batchStatic(root, { includeDynamic = false } = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), victims = [], outlineGeos = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || (o.userData.dynamic && !includeDynamic) || o.userData.isOutline || Array.isArray(o.material)) return;
    if (o.material.transparent) return; // 透明物件保留排序
    victims.push(o);
  });
  const nm = new THREE.Matrix3(), m = new THREE.Matrix4(), col = new THREE.Color(), v = new THREE.Vector3();
  for (const o of victims) {
    ensureSmoothNormals(o.geometry);
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!KEEP.includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    m.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(m);
    nm.getNormalMatrix(m);
    const sn = g.attributes.smoothNormal;
    for (let i = 0; i < sn.count; i++) { v.fromBufferAttribute(sn, i).applyMatrix3(nm).normalize(); sn.setXYZ(i, v.x, v.y, v.z); }

    const mat = o.material;
    const fold = mat.isMeshToonMaterial && mat.emissive.getHex() === 0;
    col.set(fold ? mat.color : 0xffffff);
    const n = g.attributes.position.count, cols = new Float32Array(n * 3);
    const p = g.attributes.position, nn = g.attributes.normal, old = g.attributes.color;
    for (let i = 0; i < n; i++) {
      const ao = o.userData.near ? 1 : aoAt(p.getY(i), nn.getY(i));
      const oc = old ? [old.getX(i), old.getY(i), old.getZ(i)] : [1, 1, 1];
      cols[i * 3] = col.r * ao * oc[0]; cols[i * 3 + 1] = col.g * ao * oc[1]; cols[i * 3 + 2] = col.b * ao * oc[2];
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const useMat = fold ? sharedToon(mat) : mat;
    const key = `${useMat.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, { mat: useMat, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
    buckets.get(key).geos.push(g);
    if (o.userData.outline !== false && !o.userData.noOutline) {
      const og = new THREE.BufferGeometry();
      og.setAttribute('position', g.attributes.position); og.setAttribute('smoothNormal', g.attributes.smoothNormal);
      outlineGeos.push(og);
    }
    o.parent.remove(o);
  }
  const batched = new THREE.Group(); batched.name = 'staticBatched';
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.receive;
    mesh.userData.outline = false; mesh.userData.batched = true; mesh.userData.near = true;
    batched.add(mesh);
  }
  if (outlineGeos.length) {
    const og = mergeGeometries(outlineGeos, false);
    const om = new THREE.Mesh(og, getOutlineMaterial());
    om.userData.isOutline = true; om.userData.outline = false; om.raycast = () => {};
    batched.add(om);
  }
  for (const b of buckets.values()) b.geos.forEach(g => g.dispose());
  if (includeDynamic) batched.traverse(o => { o.userData.dynamic = true; });
  root.add(batched);
  return { merged: victims.length, meshes: buckets.size, outlineMerged: outlineGeos.length };
}

/** 未合併的物件(動態、實例化)補上描邊。 */
export function outlineRemaining(root) {
  const list = [];
  root.traverse(o => { if (o.isMesh && !o.userData.isOutline && !o.userData.outlineMesh && o.userData.outline !== false && !o.userData.batched && !o.material.transparent) list.push(o); });
  list.forEach(addOutline);
}
