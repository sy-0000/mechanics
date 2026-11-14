// 紙張材質(卷軸、筆記本、銘牌紙面)。
import * as THREE from 'three';
import { toonMaterial, COLORS } from './toon.js';

/** 素紙 */
export function plainPaper(color = COLORS.paper) {
  return toonMaterial(color, { side: THREE.DoubleSide });
}

/** 帶 canvas 內容的紙(卷軸頁面、筆記本頁) */
export function paperWithCanvas(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = toonMaterial('#FFFFFF', { map: tex, side: THREE.DoubleSide });
  m.userData.texture = tex;
  return m;
}
