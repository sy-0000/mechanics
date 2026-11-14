// 鏈輪(腳踏車前齒盤/後齒輪)。齒形簡化為鏈輪齒(圓弧齒谷),語意色由呼叫者給。
import * as THREE from 'three';
import { polygonExtrude, bevelCylinder } from '../geo.js';
import { anodizedAluminum, polishedSteel } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';

export const CHAIN_PITCH = 0.0046; // 場景單位鏈節距(縮小模型)

/** 鏈輪節圓半徑 */
export function sprocketRadius(z, pitch = CHAIN_PITCH) {
  return pitch / (2 * Math.sin(Math.PI / z));
}

/** 鏈輪外形(圓弧齒) */
function sprocketProfile(z, pitch) {
  const r = sprocketRadius(z, pitch);
  const rollerR = pitch * 0.31;
  const tipR = r + pitch * 0.3;
  const pts = [];
  const steps = 8;
  for (let i = 0; i < z; i++) {
    const a0 = (i / z) * Math.PI * 2;
    // 齒谷(滾子座圓弧)
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps - 0.5) * Math.PI; // -90..90
      const a = a0 + (t / Math.PI) * (Math.PI / z) * 0.9;
      const rr = r - rollerR * Math.cos(t);
      pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
    }
    // 齒尖
    const aTip = a0 + Math.PI / z;
    pts.push([tipR * Math.cos(aTip), tipR * Math.sin(aTip)]);
  }
  return pts;
}

export function createSprocket({ z = 34, color = '#C08054', thickness = 0.006, pitch = CHAIN_PITCH } = {}) {
  const group = new THREE.Group();
  group.name = `sprocket-${z}`;
  group.userData.teeth = z;
  group.userData.radius = sprocketRadius(z, pitch);
  const body = new THREE.Mesh(
    polygonExtrude(sprocketProfile(z, pitch), thickness, { bevel: 0.0005 }),
    anodizedAluminum(color),
  );
  body.castShadow = true;
  addOutline(body, { thickness: 0.0008 });
  group.add(body);
  const hub = new THREE.Mesh(bevelCylinder(group.userData.radius * 0.25, thickness + 0.004, { seg: 20 }), polishedSteel());
  hub.castShadow = true;
  addOutline(hub, { thickness: 0.0008 });
  group.add(hub);
  return group;
}
