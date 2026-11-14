import * as THREE from 'three';
import { C } from './palette.js';

// 反向外殼描邊:沿「平滑法線」外推背面,厚度隨距離微增,讓遠處仍有細線。
const outlineMat = new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Color(C.outline) },
    thickness: { value: 0.0032 },
    fogColor: { value: new THREE.Color(C.fog) },
    fogNear: { value: 4 }, fogFar: { value: 10 },
  },
  vertexShader: /* glsl */`
    attribute vec3 smoothNormal;
    uniform float thickness;
    varying float vDepth;
    void main() {
      mat4 mw = modelMatrix;
      #ifdef USE_INSTANCING
        mw = modelMatrix * instanceMatrix;
      #endif
      vec4 wp = mw * vec4(position, 1.0);
      vec3 wn = normalize(mat3(mw) * smoothNormal);
      vec4 vp = viewMatrix * wp;
      float dist = -vp.z;
      float t = thickness * (1.0 + dist * 0.35);
      wp.xyz += wn * t;
      vp = viewMatrix * wp;
      vDepth = -vp.z;
      gl_Position = projectionMatrix * vp;
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 color; uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
    varying float vDepth;
    void main() {
      float f = smoothstep(fogNear, fogFar, vDepth);
      gl_FragColor = vec4(mix(color, fogColor, f), 1.0);
    }`,
  side: THREE.BackSide,
});
export function getOutlineMaterial() { return outlineMat; }
export function syncOutlineFog(fog) {
  outlineMat.uniforms.fogNear.value = fog.near;
  outlineMat.uniforms.fogFar.value = fog.far;
}

/** 依位置合併頂點後平均法線,寫入 smoothNormal,讓硬邊幾何外殼不破口。 */
export function ensureSmoothNormals(geo) {
  if (geo.attributes.smoothNormal) return geo;
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const map = new Map(), out = new Float32Array(pos.count * 3);
  const key = i => `${Math.round(pos.getX(i) * 1e4)}_${Math.round(pos.getY(i) * 1e4)}_${Math.round(pos.getZ(i) * 1e4)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = key(i); let a = map.get(k); if (!a) map.set(k, a = [0, 0, 0]);
    a[0] += nor.getX(i); a[1] += nor.getY(i); a[2] += nor.getZ(i);
  }
  for (let i = 0; i < pos.count; i++) {
    const a = map.get(key(i)); const l = Math.hypot(a[0], a[1], a[2]) || 1;
    out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l;
  }
  geo.setAttribute('smoothNormal', new THREE.BufferAttribute(out, 3));
  return geo;
}

/** 為單一 Mesh 或 InstancedMesh 加上描邊子物件。 */
export function addOutline(mesh) {
  if (mesh.userData.outlineMesh || mesh.userData.outline === false) return null;
  ensureSmoothNormals(mesh.geometry);
  let o;
  if (mesh.isInstancedMesh) {
    o = new THREE.InstancedMesh(mesh.geometry, outlineMat, mesh.count);
    o.instanceMatrix = mesh.instanceMatrix;
  } else {
    o = new THREE.Mesh(mesh.geometry, outlineMat);
  }
  o.castShadow = o.receiveShadow = false;
  o.userData.isOutline = true; o.userData.outline = false;
  o.raycast = () => {};
  mesh.add(o); mesh.userData.outlineMesh = o;
  return o;
}
