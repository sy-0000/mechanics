// 反向外殼描邊(WebXR 不可用後處理)。
// 作法:複製幾何,沿「平滑化法線」外推固定厚度,BackSide 深棕純色。
// 平滑化法線避免硬邊(倒角)處描邊裂開。
import * as THREE from 'three';
import { COLORS } from './toon.js';

const OUTLINE_THICKNESS = 0.0016; // 公尺(場景單位),細而銳利

/** 計算以頂點位置合併的平滑法線,存成 aOutlineNormal 屬性 */
export function computeSmoothedNormals(geometry) {
  if (geometry.getAttribute('aOutlineNormal')) return;
  const pos = geometry.getAttribute('position');
  const nor = geometry.getAttribute('normal');
  const map = new Map();
  const key = (i) =>
    `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    let v = map.get(k);
    if (!v) { v = new THREE.Vector3(); map.set(k, v); }
    v.x += nor.getX(i); v.y += nor.getY(i); v.z += nor.getZ(i);
  }
  const out = new Float32Array(pos.count * 3);
  const tmp = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    tmp.copy(map.get(key(i))).normalize();
    out[i * 3] = tmp.x; out[i * 3 + 1] = tmp.y; out[i * 3 + 2] = tmp.z;
  }
  geometry.setAttribute('aOutlineNormal', new THREE.BufferAttribute(out, 3));
}

/** 描邊材質(MeshBasicMaterial + onBeforeCompile,自動支援 InstancedMesh) */
export function outlineMaterial(thickness = OUTLINE_THICKNESS, color = COLORS.outline) {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uOutline = { value: thickness };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uOutline;
        attribute vec3 aOutlineNormal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed += aOutlineNormal * uOutline;`);
  };
  // 讓材質快取區分不同厚度
  mat.customProgramCacheKey = () => `outline${thickness}`;
  return mat;
}

/**
 * 給 mesh 加描邊:附加一個同幾何的 BackSide 子 mesh。
 * 回傳描邊 mesh(已 add 到原 mesh 上,跟著動)。
 */
export function addOutline(mesh, { thickness = OUTLINE_THICKNESS, color = COLORS.outline } = {}) {
  computeSmoothedNormals(mesh.geometry);
  let o;
  if (mesh.isInstancedMesh) {
    o = new THREE.InstancedMesh(mesh.geometry, outlineMaterial(thickness, color), mesh.count);
    o.instanceMatrix = mesh.instanceMatrix; // 共用矩陣
  } else {
    o = new THREE.Mesh(mesh.geometry, outlineMaterial(thickness, color));
  }
  o.name = `${mesh.name || 'mesh'}-outline`;
  o.castShadow = false;
  o.receiveShadow = false;
  o.userData.isOutline = true;
  mesh.add(o);
  return o;
}
