import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ensureSmoothNormals } from '../../../materials/outline.js';
import { instanced, group } from './geo.js';

// 把一件多零件的工具「依材質合併」成數個幾何,再以 InstancedMesh 複製多件(同款工具、圍裙等)。
export function instanceTool(parent, build, transforms, opts = {}) {
  const tmp = new THREE.Group(); build(tmp); tmp.updateMatrixWorld(true);
  const byMat = new Map();
  tmp.traverse(o => {
    if (!o.isMesh) return;
    ensureSmoothNormals(o.geometry);
    let gg = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(gg.attributes)) if (!['position', 'normal', 'uv', 'smoothNormal'].includes(k)) gg.deleteAttribute(k);
    if (!gg.attributes.uv) gg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(gg.attributes.position.count * 2), 2));
    gg.applyMatrix4(o.matrixWorld);
    const nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld), sn = gg.attributes.smoothNormal, v = new THREE.Vector3();
    for (let i = 0; i < sn.count; i++) { v.fromBufferAttribute(sn, i).applyMatrix3(nm).normalize(); sn.setXYZ(i, v.x, v.y, v.z); }
    const col = new Float32Array(gg.attributes.position.count * 3).fill(1);
    gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(gg);
  });
  const g = group(parent, opts.name ?? 'instancedTool');
  for (const [mat, geos] of byMat) instanced(g, mergeGeometries(geos), mat, transforms, opts);
  return g;
}
