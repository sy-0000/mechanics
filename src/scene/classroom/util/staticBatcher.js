import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ensureSmoothNormals, addOutline } from '../../../materials/outline.js';

// 把靜態物件依材質合併成少數幾個 Mesh,大幅降低 draw call(Quest 3 的關鍵)。
// 物件仍各自在獨立檔案建模;合併只發生在執行期。
// 遠景物件同時把柔和的環境遮蔽(地面附近、牆角較暗)烘焙進頂點色,並且不參與即時陰影。

const KEEP = ['position', 'normal', 'uv', 'smoothNormal', 'color'];

function bakeAO(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const ground = 0.78 + 0.22 * THREE.MathUtils.smoothstep(y, 0.0, 1.1);
    const ceil = 1 - 0.08 * THREE.MathUtils.smoothstep(y, 2.6, 3.0);
    const down = n.getY(i) < -0.5 ? 0.9 : 1;
    const v = ground * ceil * down;
    col[i * 3] = v; col[i * 3 + 1] = v * 0.995; col[i * 3 + 2] = v * 0.985;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

export function batchStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), victims = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.dynamic || o.userData.isOutline || Array.isArray(o.material)) return;
    if (o.material.transparent) return; // 透明物件保留排序
    victims.push(o);
  });
  const nm = new THREE.Matrix3(), m = new THREE.Matrix4();
  for (const o of victims) {
    ensureSmoothNormals(o.geometry);
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!KEEP.includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    m.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(m);
    nm.getNormalMatrix(m);
    const sn = g.attributes.smoothNormal, v = new THREE.Vector3();
    for (let i = 0; i < sn.count; i++) { v.fromBufferAttribute(sn, i).applyMatrix3(nm).normalize(); sn.setXYZ(i, v.x, v.y, v.z); }
    if (!o.userData.near) bakeAO(g);
    else if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
    const outline = o.userData.outline !== false;
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${outline}`;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, receive: o.receiveShadow, outline, geos: [] });
    buckets.get(key).geos.push(g);
    o.parent.remove(o);
  }
  const batched = new THREE.Group(); batched.name = 'staticBatched';
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    b.geos.forEach(g => g.dispose());
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.receive;
    mesh.userData.outline = b.outline;
    if (b.outline) addOutline(mesh);
    batched.add(mesh);
  }
  root.add(batched);
  return { merged: victims.length, meshes: buckets.size };
}

/** 未合併的物件(動態、實例化)補上描邊。 */
export function outlineRemaining(root) {
  const list = [];
  root.traverse(o => { if (o.isMesh && !o.userData.isOutline && !o.userData.outlineMesh && o.userData.outline !== false && !o.material.transparent) list.push(o); });
  list.forEach(addOutline);
}
