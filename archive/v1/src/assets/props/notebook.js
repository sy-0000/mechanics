// 翻開的空白筆記本(紙 + 淡格線,無文字)。
import * as THREE from 'three';
import { bevelBox } from '../geo.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';

export function createNotebook(w = 0.13, h = 0.09) {
  const group = new THREE.Group();
  group.name = 'notebook';

  // 封底(攤平)
  const cover = new THREE.Mesh(bevelBox(w, 0.0035, h, { corner: 0.004, bevel: 0.0008 }), toonMaterial(COLORS.wood));
  cover.receiveShadow = true;
  cover.castShadow = true;
  addOutline(cover, { thickness: 0.0007 });
  group.add(cover);

  // 兩頁紙(淡格線 canvas,無文字)
  const C = 256;
  const canvas = document.createElement('canvas');
  canvas.width = C; canvas.height = Math.round(C * (h / (w / 2)));
  const g = canvas.getContext('2d');
  g.fillStyle = '#F7F2E4';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = 'rgba(90,70,50,0.18)';
  g.lineWidth = 1;
  for (let y = 20; y < canvas.height; y += 22) {
    g.beginPath(); g.moveTo(12, y); g.lineTo(canvas.width - 12, y); g.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  for (const s of [-1, 1]) {
    const page = new THREE.Mesh(
      new THREE.PlaneGeometry(w / 2 - 0.004, h - 0.006),
      toonMaterial('#FFFFFF', { map: tex }),
    );
    page.rotation.x = -Math.PI / 2;
    page.rotation.z = s * 0.02;
    page.position.set(s * (w / 4 - 0.001), 0.0022, 0);
    group.add(page);
  }
  // 中縫線圈
  for (let i = -3; i <= 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.0028, 0.0007, 6, 12),
      toonMaterial(COLORS.grey),
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(0, 0.0032, i * 0.012);
    group.add(ring);
  }
  return group;
}
