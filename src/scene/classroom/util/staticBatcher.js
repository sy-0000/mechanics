import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// 把靜態物件合併成少數幾個 Mesh,大幅降低 draw call(Quest 3 的關鍵)。
// 物件仍各自在獨立檔案建模;合併只發生在執行期:
//  - PBR 材質的 color 烘進頂點色,依「貼圖組 + 粗糙度 + 金屬度 + 面向 + 陰影旗標」分組,不同顏色可共用一個 draw call。
//  - 遠景物件再把柔和的環境遮蔽(地面附近、牆角較暗)烘進頂點色(VR 不跑 SSAO 時仍有接觸陰影感)。

const KEEP = ['position', 'normal', 'uv', 'color'];
const shared = new Map();

function aoAt(y, ny) {
  const ground = 0.72 + 0.28 * THREE.MathUtils.smoothstep(y, 0.0, 1.0);
  const ceil = 1 - 0.1 * THREE.MathUtils.smoothstep(y, 2.6, 3.0);
  return ground * ceil * (ny < -0.5 ? 0.9 : 1);
}

/** 取得「白色 + 頂點色」的共用材質;非 Standard 或有自發光的材質維持原樣。 */
export function foldMaterial(mat) {
  if (!mat.isMeshStandardMaterial || mat.emissive.getHex() !== 0 || mat.transparent || !mat.userData.foldKey) return mat;
  const key = mat.userData.foldKey;
  if (!shared.has(key)) {
    const m = mat.clone(); m.color.set('#ffffff'); m.vertexColors = true; m.userData.folded = true;
    shared.set(key, m);
  }
  return shared.get(key);
}

export function batchStatic(root, { includeDynamic = false } = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), victims = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || (o.userData.dynamic && !includeDynamic) || Array.isArray(o.material)) return;
    if (o.material.transparent) return; // 透明物件保留排序
    victims.push(o);
  });
  const m = new THREE.Matrix4(), col = new THREE.Color();
  for (const o of victims) {
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!KEEP.includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    m.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(m);
    const mat = o.material, useMat = foldMaterial(mat);
    col.set(useMat !== mat ? mat.color : 0xffffff);
    const n = g.attributes.position.count, cols = new Float32Array(n * 3);
    const p = g.attributes.position, nn = g.attributes.normal, old = g.attributes.color;
    for (let i = 0; i < n; i++) {
      const ao = o.userData.near ? 1 : aoAt(p.getY(i), nn.getY(i));
      const oc = old ? [old.getX(i), old.getY(i), old.getZ(i)] : [1, 1, 1];
      cols[i * 3] = col.r * ao * oc[0]; cols[i * 3 + 1] = col.g * ao * oc[1]; cols[i * 3 + 2] = col.b * ao * oc[2];
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const key = `${useMat.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, { mat: useMat, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
    buckets.get(key).geos.push(g);
    o.parent.remove(o);
  }
  const batched = new THREE.Group(); batched.name = 'staticBatched';
  for (const b of buckets.values()) {
    const mesh = new THREE.Mesh(mergeGeometries(b.geos, false), b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.receive;
    mesh.userData.batched = true;
    batched.add(mesh);
    b.geos.forEach(g => g.dispose());
  }
  if (includeDynamic) batched.traverse(o => { o.userData.dynamic = true; });
  root.add(batched);
  return { merged: victims.length, meshes: buckets.size };
}
