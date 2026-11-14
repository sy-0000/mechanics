import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DESKTOP_VIEWS, VIEWPOINTS } from './layout.js';
import { C } from '../../materials/palette.js';

// 視角管理。
// 電腦:兩個預設視角,切換時鏡頭沿平滑曲線慢慢平移(2.5 秒、ease-in-out),位置與注視點同步過渡。
// VR:絕不平滑移動鏡頭。以淡出(0.25 s)→ 偏移 XR 參考空間 → 淡入(0.25 s)完成瞬間傳送,
//     並依目前頭部位置與朝向補償,讓頭剛好落在目標點、面向正對黑板。
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createViews({ renderer, camera, domElement, fog, dof }) {
  const listeners = [];
  let current = 'bench';
  // ---------- 電腦 ----------
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
  controls.rotateSpeed = 0.45; controls.zoomSpeed = 0.6;
  let glide = null;

  function applyLimits(name) {
    const v = DESKTOP_VIEWS[name];
    const off = new THREE.Vector3(...v.eye).sub(new THREE.Vector3(...v.target));
    const s = new THREE.Spherical().setFromVector3(off);
    const az = name === 'bench' ? 0.55 : 0.3, pol = name === 'bench' ? 0.28 : 0.15;
    controls.minAzimuthAngle = s.theta - az; controls.maxAzimuthAngle = s.theta + az;
    controls.minPolarAngle = Math.max(0.2, s.phi - pol); controls.maxPolarAngle = Math.min(Math.PI / 2 + 0.1, s.phi + pol);
    controls.minDistance = s.radius * (name === 'bench' ? 0.55 : 0.7); controls.maxDistance = s.radius * (name === 'bench' ? 1.35 : 1.15);
  }
  function setDesktopView(name) {
    const v = DESKTOP_VIEWS[name];
    camera.position.set(...v.eye); controls.target.set(...v.target); camera.lookAt(controls.target);
    applyLimits(name); controls.update();
    fog.set(name, 0); dof?.setEnabled(name === 'bench', 0);
  }

  function glideTo(name, dur = 2.5) {
    const v = DESKTOP_VIEWS[name];
    const p0 = camera.position.clone(), p2 = new THREE.Vector3(...v.eye);
    const t0 = controls.target.clone(), t2 = new THREE.Vector3(...v.target);
    // 曲線控制點:兩端中點稍微抬高、往側邊偏,避免穿過桌面
    const mid = p0.clone().lerp(p2, 0.5); mid.y += 0.25; mid.x += 0.15;
    const curve = new THREE.CatmullRomCurve3([p0, mid, p2], false, 'centripetal');
    controls.enabled = false;
    controls.minAzimuthAngle = controls.minPolarAngle = -Infinity; controls.maxAzimuthAngle = Infinity; controls.maxPolarAngle = Math.PI;
    controls.minDistance = 0; controls.maxDistance = Infinity;
    glide = { curve, t0, t2, start: performance.now() / 1000, dur, name };
    fog.set(name, dur); dof?.setEnabled(name === 'bench', dur);
  }

  // ---------- VR ----------
  const fadeMat = new THREE.MeshBasicMaterial({ color: C.fog, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false });
  const fadeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), fadeMat);
  fadeMesh.renderOrder = 10000; fadeMesh.frustumCulled = false; fadeMesh.visible = false; fadeMesh.userData.outline = false;
  camera.add(fadeMesh);
  let baseSpace = null, fade = null, needsRecenter = false;
  renderer.xr.addEventListener('sessionstart', () => {
    baseSpace = renderer.xr.getReferenceSpace();
    needsRecenter = true; // 第一幀把學生放到原點、面向黑板
  });
  renderer.xr.addEventListener('sessionend', () => { baseSpace = null; setDesktopView(current); });

  function headPoseInBase() {
    const frame = renderer.xr.getFrame();
    if (!frame || !baseSpace) return null;
    const pose = frame.getViewerPose(baseSpace);
    if (!pose) return null;
    const { position: p, orientation: o } = pose.transform;
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(o.x, o.y, o.z, o.w), 'YXZ');
    return { x: p.x, z: p.z, yaw: e.y };
  }
  /** 讓頭部落在 VIEWPOINTS[name] 的位置與朝向:O = H · T⁻¹(只取水平位移與偏航)。 */
  function teleportNow(name) {
    const h = headPoseInBase(); if (!h) return false;
    const vp = VIEWPOINTS[name];
    const H = new THREE.Matrix4().makeRotationY(h.yaw).setPosition(h.x, 0, h.z);
    const T = new THREE.Matrix4().makeRotationY(vp.yaw).setPosition(vp.position[0], 0, vp.position[2]);
    const O = H.multiply(T.invert());
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    O.decompose(pos, q, s);
    const xf = new XRRigidTransform({ x: pos.x, y: 0, z: pos.z }, { x: q.x, y: q.y, z: q.z, w: q.w });
    renderer.xr.setReferenceSpace(baseSpace.getOffsetReferenceSpace(xf));
    return true;
  }

  function xrTeleport(name) {
    fade = { name, start: performance.now() / 1000, moved: false };
    fadeMesh.visible = true;
  }

  function goTo(name) {
    if (!DESKTOP_VIEWS[name]) throw new Error(`unknown view: ${name}`);
    current = name;
    if (renderer.xr.isPresenting) xrTeleport(name); else glideTo(name);
    listeners.forEach(f => f(name));
  }

  function update(now) {
    if (renderer.xr.isPresenting) {
      if (needsRecenter && teleportNow(current)) needsRecenter = false;
      if (fade) {
        const t = now - fade.start, D = 0.25;
        if (t < D) fadeMat.opacity = t / D;
        else if (!fade.moved) { fadeMat.opacity = 1; if (teleportNow(fade.name)) fade.moved = true; fade.start = now - D; }
        else if (t < 2 * D) fadeMat.opacity = 1 - (t - D) / D;
        else { fadeMat.opacity = 0; fadeMesh.visible = false; fade = null; }
      }
      return;
    }
    if (glide) {
      const k = Math.min(1, (now - glide.start) / glide.dur), e = ease(k);
      camera.position.copy(glide.curve.getPointAt(e));
      controls.target.lerpVectors(glide.t0, glide.t2, e);
      camera.lookAt(controls.target);
      if (k >= 1) { const n = glide.name; glide = null; controls.enabled = true; applyLimits(n); controls.update(); }
      return;
    }
    controls.update();
  }

  setDesktopView('bench');
  return {
    goTo, update, controls,
    get current() { return current; },
    free(eye, target) {
      glide = null; controls.enabled = true;
      controls.minAzimuthAngle = controls.minPolarAngle = -Infinity; controls.maxAzimuthAngle = Infinity; controls.maxPolarAngle = Math.PI;
      controls.minDistance = 0; controls.maxDistance = Infinity;
      camera.position.set(...eye); controls.target.set(...target); controls.update(); dof?.setEnabled(false, 0); fog.set('default', 0);
    },
    get moving() { return !!glide || !!fade; },
    onChange(f) { listeners.push(f); },
    dispose() { controls.dispose(); camera.remove(fadeMesh); fadeMesh.geometry.dispose(); fadeMat.dispose(); },
  };
}
