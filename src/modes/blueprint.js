// 藍圖模式(進階數學):0.4 秒平順過渡成藍底 #1B4F8F + 淡格線,
// 零件半透明藍、白輪廓,疊上尺寸線/中心線/角度弧/進階公式(各關卡提供 overlay)。
import * as THREE from 'three';
import { COLORS } from '../materials/toon.js';

const BLUE = new THREE.Color('#1B4F8F');
const WARM = new THREE.Color(COLORS.background);

export function createBlueprint({ scene, tabletop, envMeshes = null }) {
  const GROUND_WARM = new THREE.Color('#F8F3E2');
  const HORIZON_WARM = new THREE.Color('#F7F1DE');
  const GROUND_BLUE = new THREE.Color('#1B4F8F');
  const HORIZON_BLUE = new THREE.Color('#235C9F');
  const state = { on: false, t: 0, swapped: false };
  const saved = new Map(); // mesh → 原材質

  // 藍圖格線地毯(淡格線),只在藍圖模式顯示
  const grid = new THREE.GridHelper(3, 30, '#4F7FBC', '#2E5E9E');
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  grid.position.y = 0.002;
  grid.visible = false;
  tabletop.add(grid);

  const partMat = new THREE.MeshBasicMaterial({
    color: '#4F7FBC', transparent: true, opacity: 0.22, depthWrite: false,
  });
  const outlineWhite = new THREE.MeshBasicMaterial({ color: '#EAF2FF', side: THREE.BackSide });

  // 換材質的範圍:整張桌子(baseGroup)含桌上零件
  const swapRoot = tabletop.parent || tabletop;

  function swap(on) {
    if (on === state.swapped) return;
    state.swapped = on;
    swapRoot.traverse((o) => {
      if (!o.isMesh && !o.isInstancedMesh) return;
      if (o.userData.isBlueprintOverlay) return;
      if (on) {
        saved.set(o, o.material);
        o.material = o.userData.isOutline ? outlineWhite : partMat;
      } else if (saved.has(o)) {
        o.material = saved.get(o);
      }
    });
    if (!on) saved.clear();
    grid.visible = on;
    // 關卡 overlay(尺寸線、公式)
    swapRoot.traverse((o) => {
      if (o.userData.isBlueprintOverlay) o.visible = on;
    });
  }

  function toggle(on = !state.on) {
    state.on = on;
  }

  function update(dt) {
    const target = state.on ? 1 : 0;
    if (state.t === target) return;
    // 定速 0.4 秒全程,平順過渡
    const dir = target > state.t ? 1 : -1;
    state.t = THREE.MathUtils.clamp(state.t + (dir * dt) / 0.4, 0, 1);
    const ease = state.t * state.t * (3 - 2 * state.t); // smoothstep
    scene.background.copy(WARM).lerp(BLUE, ease);
    if (scene.fog) scene.fog.color.copy(scene.background);
    if (envMeshes) {
      envMeshes.ground.material.color.copy(GROUND_WARM).lerp(GROUND_BLUE, ease);
      envMeshes.horizon.material.color.copy(HORIZON_WARM).lerp(HORIZON_BLUE, ease);
      envMeshes.patch.visible = ease < 0.5;
      envMeshes.dust.visible = ease < 0.5;
    }
    // 中點切換材質(視覺上最順)
    if (state.t > 0.5 && !state.swapped) swap(true);
    if (state.t < 0.5 && state.swapped) swap(false);
  }

  return {
    toggle, update,
    get isOn() { return state.on; },
    /** 關卡 overlay 標記(建立後呼叫) */
    markOverlay(group) {
      group.traverse((o) => { o.userData.isBlueprintOverlay = true; });
      group.userData.isBlueprintOverlay = true;
      group.visible = state.on;
    },
  };
}

/** 工具:尺寸線(兩端箭頭 + 置中標籤位置)。回傳 Line group。 */
export function dimensionLine(p1, p2, { offset = 0.02, color = '#EAF2FF' } = {}) {
  const g = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
  const n = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(offset);
  const a = new THREE.Vector3().addVectors(p1, n);
  const b = new THREE.Vector3().addVectors(p2, n);
  const mat = new THREE.LineBasicMaterial({ color });
  const pts = [
    p1, a, a, b, b, p2, // 兩條延伸線 + 主線
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  g.add(new THREE.LineSegments(geo, mat));
  // 箭頭(小三角)
  for (const [tip, d] of [[a, dir], [b, dir.clone().negate()]]) {
    const ah = new THREE.Mesh(
      new THREE.ConeGeometry(0.004, 0.012, 8),
      new THREE.MeshBasicMaterial({ color }),
    );
    ah.position.copy(tip).addScaledVector(d, 0.007);
    ah.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().negate());
    g.add(ah);
  }
  g.userData.mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return g;
}

/** 工具:角度弧 */
export function angleArc(center, radius, a0, a1, { color = '#EAF2FF', segments = 24 } = {}) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = a0 + ((a1 - a0) * i) / segments;
    pts.push(new THREE.Vector3(
      center.x + radius * Math.cos(a),
      center.y + radius * Math.sin(a),
      center.z,
    ));
  }
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color }),
  );
  return line;
}

/** 工具:中心線(虛線) */
export function centerLine(p1, p2, { color = '#9FC2E8' } = {}) {
  const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const mat = new THREE.LineDashedMaterial({ color, dashSize: 0.012, gapSize: 0.008 });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return line;
}
