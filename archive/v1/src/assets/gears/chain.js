// 鍊條(連桿語意,黃):沿兩鏈輪的公切線 + 圓弧纏繞,用 InstancedMesh 鏈節。
// 鏈節沿路徑排列;動畫時整條沿路徑參數平移。
import * as THREE from 'three';
import { bevelBox } from '../geo.js';
import { anodizedAluminum } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { COLORS } from '../../materials/toon.js';

/**
 * 建立繞過兩圓(圓心 c1/c2、半徑 r1/r2,同平面 XY)的鍊條。
 * 回傳 group;group.userData.advance(dist) 讓鏈節沿路徑前進。
 */
export function createChain(c1, r1, c2, r2, { linkLen = 0.0032, width = 0.004 } = {}) {
  const group = new THREE.Group();
  group.name = 'chain';

  // 外公切線幾何
  const d = Math.hypot(c2.x - c1.x, c2.y - c1.y);
  const base = Math.atan2(c2.y - c1.y, c2.x - c1.x);
  const alpha = Math.acos((r1 - r2) / d); // 外切線角
  // 路徑:圓1圓弧(從切點1b 到 1a)→ 直線上緣 → 圓2圓弧 → 直線下緣
  const a1a = base + alpha, a1b = base - alpha + 2 * Math.PI;
  const a2a = base + alpha, a2b = base - alpha;
  const p1a = { x: c1.x + r1 * Math.cos(a1a), y: c1.y + r1 * Math.sin(a1a) };
  const p2a = { x: c2.x + r2 * Math.cos(a2a), y: c2.y + r2 * Math.sin(a2a) };
  const p2b = { x: c2.x + r2 * Math.cos(a2b), y: c2.y + r2 * Math.sin(a2b) };
  const p1b = { x: c1.x + r1 * Math.cos(a1b - 2 * Math.PI), y: c1.y + r1 * Math.sin(a1b) };
  const lenLine = Math.hypot(p2a.x - p1a.x, p2a.y - p1a.y);
  const arc2 = ((a2b - a2a + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI);
  // 圓2 繞行方向:鍊條外繞,角度遞減(順時針)
  const arc2Len = (2 * Math.PI - arc2) * r2 > arc2 * r2 ? arc2 * r2 : arc2 * r2;
  const sweep2 = -((a2a - a2b + 2 * Math.PI) % (2 * Math.PI));
  const sweep1 = -((a1b - a1a + 2 * Math.PI) % (2 * Math.PI));
  const arcLen2 = Math.abs(sweep2) * r2;
  const arcLen1 = Math.abs(sweep1) * r1;
  const total = lenLine * 2 + arcLen1 + arcLen2;

  /** 路徑參數 s∈[0,total) → {x,y,ang} */
  const at = (s) => {
    s = ((s % total) + total) % total;
    if (s < lenLine) {
      const t = s / lenLine;
      return {
        x: p1a.x + (p2a.x - p1a.x) * t,
        y: p1a.y + (p2a.y - p1a.y) * t,
        ang: Math.atan2(p2a.y - p1a.y, p2a.x - p1a.x),
      };
    }
    s -= lenLine;
    if (s < arcLen2) {
      const a = a2a + sweep2 * (s / arcLen2);
      return { x: c2.x + r2 * Math.cos(a), y: c2.y + r2 * Math.sin(a), ang: a - Math.PI / 2 };
    }
    s -= arcLen2;
    if (s < lenLine) {
      const t = s / lenLine;
      return {
        x: p2b.x + (p1b.x - p2b.x) * t,
        y: p2b.y + (p1b.y - p2b.y) * t,
        ang: Math.atan2(p1b.y - p2b.y, p1b.x - p2b.x),
      };
    }
    s -= lenLine;
    const a = a1b + sweep1 * (s / arcLen1) - 2 * Math.PI;
    return { x: c1.x + r1 * Math.cos(a), y: c1.y + r1 * Math.sin(a), ang: a - Math.PI / 2 };
  };

  const n = Math.round(total / linkLen);
  const linkGeo = bevelBox(linkLen * 0.92, width * 0.55, 0.0022, { corner: 0.0006, bevel: 0.0004 });
  const links = new THREE.InstancedMesh(linkGeo, anodizedAluminum(COLORS.coupler), n);
  links.castShadow = true;
  addOutline(links, { thickness: 0.0005 });
  group.add(links);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  let offset = 0;
  const layout = () => {
    for (let i = 0; i < n; i++) {
      const p = at(i * (total / n) + offset);
      q.setFromAxisAngle(zAxis, p.ang);
      m4.compose(
        new THREE.Vector3(p.x, p.y, (i % 2) * 0.0012 - 0.0006), // 內外鏈片交錯
        q,
        new THREE.Vector3(1, 1, 1),
      );
      links.setMatrixAt(i, m4);
    }
    links.instanceMatrix.needsUpdate = true;
  };
  layout();

  group.userData.advance = (dist) => { offset += dist; layout(); };
  group.userData.pathLength = total;
  return group;
}
