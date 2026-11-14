import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { instanced, group } from './geo.js';
import { foldMaterial } from './staticBatcher.js';

// 把一件多零件的工具「依材質合併」成數個幾何,再以 InstancedMesh 複製多件(同款工具、圍裙等)。
export function instanceTool(parent, build, transforms, opts = {}) {
  const tmp = new THREE.Group(); build(tmp); tmp.updateMatrixWorld(true);
  const byMat = new Map();
  tmp.traverse(o => {
    if (!o.isMesh) return;
    let gg = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(gg.attributes)) if (!['position', 'normal', 'uv'].includes(k)) gg.deleteAttribute(k);
    if (!gg.attributes.uv) gg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(gg.attributes.position.count * 2), 2));
    gg.applyMatrix4(o.matrixWorld);
    const c = o.material.color ?? new THREE.Color(1, 1, 1), n = gg.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const shared = foldMaterial(o.material);
    if (!byMat.has(shared)) byMat.set(shared, []);
    byMat.get(shared).push(gg);
  });
  const g = group(parent, opts.name ?? 'instancedTool');
  for (const [mat, geos] of byMat) instanced(g, mergeGeometries(geos), mat, transforms, opts);
  return g;
}
