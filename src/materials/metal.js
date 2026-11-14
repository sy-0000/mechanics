import { makeCanvas, canvasTexture } from './canvasTex.js';
import { std } from './standard.js';
import * as THREE from 'three';

// 金屬 PBR:有反光(金屬度 1、環境反射)與磨損(刮痕、磨亮斑、掉漆)。
export function metalMat(color, brushedFinish = false) {
  return std(color, { set: 'metal:brushed', roughness: brushedFinish ? 0.85 : 1, metalness: 1, envMapIntensity: 2.4, key: `metal|${color}|${brushedFinish}` });
}

/** 銼刀銼面:交叉細紋(作為反照率細節),金屬度 1。 */
let file = null;
export function fileTexture() {
  if (file) return file;
  const c = makeCanvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(70,70,70,0.45)';
  for (let i = -128; i < 256; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 128); g.stroke(); }
  g.strokeStyle = 'rgba(70,70,70,0.25)';
  for (let i = -128; i < 256; i += 5) { g.beginPath(); g.moveTo(i, 128); g.lineTo(i + 64, 0); g.stroke(); }
  return (file = canvasTexture(c));
}
