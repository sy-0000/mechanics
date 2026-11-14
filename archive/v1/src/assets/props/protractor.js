// 透明量角器(半圓,刻度 0–180°)。
import * as THREE from 'three';
import { clearPlastic } from '../../materials/plastic.js';
import { toonMaterial } from '../../materials/toon.js';

export function createProtractor(radius = 0.05) {
  const group = new THREE.Group();
  group.name = 'protractor';
  group.userData.grabbable = { kind: 'prop' };

  // 刻度 canvas
  const C = 512;
  const canvas = document.createElement('canvas');
  canvas.width = C; canvas.height = C / 2 + 24;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  const cx = C / 2, cy = C / 2 + 12, R = C / 2 - 12;
  g.strokeStyle = '#4A382A';
  g.fillStyle = '#4A382A';
  g.textAlign = 'center';
  g.font = '20px sans-serif';
  for (let deg = 0; deg <= 180; deg += 2) {
    const a = (deg / 180) * Math.PI;
    const len = deg % 10 === 0 ? 0.14 : deg % 5 === 0 ? 0.09 : 0.05;
    g.lineWidth = deg % 10 === 0 ? 2.4 : 1.4;
    g.beginPath();
    g.moveTo(cx + R * Math.cos(a), cy - R * Math.sin(a));
    g.lineTo(cx + R * (1 - len) * Math.cos(a), cy - R * (1 - len) * Math.sin(a));
    g.stroke();
    if (deg % 30 === 0) {
      g.fillText(String(deg), cx + R * 0.72 * Math.cos(a), cy - R * 0.72 * Math.sin(a) + 7);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI, false);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0.012, 0.008, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.0024, bevelEnabled: false, curveSegments: 40 });
  const body = new THREE.Mesh(geo, clearPlastic('#E8F0EE', 0.28));
  group.add(body);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius + 0.0047),
    toonMaterial('#FFFFFF', { map: tex, transparent: true }),
  );
  face.position.set(0, (radius + 0.0047) / 2 - 0.0047, 0.0028);
  group.add(face);
  return group;
}
