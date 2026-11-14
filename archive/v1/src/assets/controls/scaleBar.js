// 實體長條刻度(轉速 / 力矩):直立木條 + 滑動指示塊。
import * as THREE from 'three';
import { bevelBox } from '../geo.js';
import { lightWood } from '../../materials/wood.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';
import { textPlane, T } from '../../teach/typeset.js';

/** @param {object} p {label, color(指示塊,低飽和), height} */
export function createScaleBar({ label = '', color = '#C9A86A', height = 0.3 } = {}) {
  const group = new THREE.Group();
  group.name = `scaleBar-${label}`;

  const bar = new THREE.Mesh(bevelBox(0.05, height, 0.02, { corner: 0.005 }), lightWood());
  bar.position.y = height / 2;
  bar.castShadow = true;
  bar.receiveShadow = true;
  addOutline(bar);
  group.add(bar);

  // 刻度線(canvas)
  const C = 128;
  const canvas = document.createElement('canvas');
  canvas.width = C; canvas.height = C * 4;
  const g = canvas.getContext('2d');
  g.strokeStyle = '#4A382A';
  for (let i = 0; i <= 10; i++) {
    const y = canvas.height - (i / 10) * canvas.height * 0.96 - 8;
    g.lineWidth = i % 5 === 0 ? 4 : 2;
    g.beginPath();
    g.moveTo(8, y);
    g.lineTo(i % 5 === 0 ? 52 : 36, y);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const ticks = new THREE.Mesh(
    new THREE.PlaneGeometry(0.044, height * 0.97),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  ticks.position.set(0, height / 2, 0.0105);
  group.add(ticks);

  // 指示塊
  const marker = new THREE.Mesh(bevelBox(0.058, 0.018, 0.026, { corner: 0.004 }), toonMaterial(color));
  marker.castShadow = true;
  addOutline(marker);
  group.add(marker);

  const plate = textPlane([{ segments: T(label), align: 'center' }], 0.06,
    { width: 300, baseSize: 72, pad: 16, bg: '#EFE6CF' });
  plate.position.set(0, -0.025, 0.012);
  group.add(plate);

  let target = 0, cur = 0;
  group.userData.setValue = (t) => { target = Math.min(1, Math.max(0, t)); };
  group.userData.update = (dt) => {
    cur += (target - cur) * Math.min(1, dt * 4);
    marker.position.y = 0.02 + cur * (height - 0.04);
  };
  group.userData.update(0.1);
  return group;
}
