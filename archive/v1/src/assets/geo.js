// 共用幾何輔助:圓頭桿件(帶倒角與銷孔)、倒角圓柱、倒角方塊。
// 所有資產獨立建模時引用;輸出皆為平滑倒角、無鋸齒的 BufferGeometry。
import * as THREE from 'three';

/**
 * 圓頭金屬桿(stadium 形)沿 +X,中心在兩孔中點。
 * length:孔心距;width:桿寬;thickness:桿厚;holeR:孔半徑。
 * 孔在 x = ±length/2。
 */
export function barGeometry(length, width = 0.016, thickness = 0.006, holeR = 0.0032) {
  const r = width / 2;
  const L = length / 2;
  const shape = new THREE.Shape();
  shape.absarc(-L, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  shape.lineTo(L, -r);
  shape.absarc(L, 0, r, (3 * Math.PI) / 2, Math.PI / 2, false);
  shape.lineTo(-L, r);
  if (holeR > 0) {
    for (const hx of [-L, L]) {
      const hole = new THREE.Path();
      hole.absarc(hx, 0, holeR, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
  }
  const bevel = Math.min(thickness * 0.28, 0.0018);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 24,
  });
  geo.translate(0, 0, -(thickness - bevel * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

/** 倒角圓柱(軸向 +Z) */
export function bevelCylinder(radius, height, { bevel = radius * 0.15, seg = 32 } = {}) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  const b = Math.min(bevel, height * 0.4);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height - b * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments: seg,
  });
  geo.translate(0, 0, -(height - b * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

/** 倒角方塊(圓角矩形截面,沿 Z 擠出;置中) */
export function bevelBox(w, h, d, { corner = Math.min(w, h) * 0.08, bevel = 0.0015 } = {}) {
  const shape = roundedRectShape(w, h, corner);
  const b = Math.min(bevel, d * 0.3);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d - b * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.translate(0, 0, -(d - b * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** 六角柱(螺栓頭用,沿 Z) */
export function hexGeometry(acrossFlats, height) {
  const r = acrossFlats / Math.sqrt(3); // 外接圓半徑
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = r * Math.cos(a), y = r * Math.sin(a);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const b = Math.min(height * 0.2, 0.0008);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height - b * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 1,
    curveSegments: 4,
  });
  geo.translate(0, 0, -(height - b * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

/** 由 2D 多邊形(齒形等)擠出,帶小倒角 */
export function polygonExtrude(points, depth, { bevel = 0.0008 } = {}) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  const b = Math.min(bevel, depth * 0.3);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - b * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 1,
    curveSegments: 6,
  });
  geo.translate(0, 0, -(depth - b * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

/** mm 刻度尺 canvas 貼圖(貼在機架邊或汽缸旁) */
export function rulerTexture(lengthMm, pxPerMm = 8, { color = '#4A382A', bg = '#EDE4CE' } = {}) {
  const w = Math.ceil(lengthMm * pxPerMm);
  const h = 64;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 1.5;
  g.font = `${Math.floor(h * 0.3)}px sans-serif`;
  g.textAlign = 'center';
  for (let mm = 0; mm <= lengthMm; mm++) {
    const x = mm * pxPerMm;
    const len = mm % 10 === 0 ? 0.5 : mm % 5 === 0 ? 0.34 : 0.2;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h * len);
    g.stroke();
    if (mm % 10 === 0) g.fillText(String(mm), x, h * 0.85);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
