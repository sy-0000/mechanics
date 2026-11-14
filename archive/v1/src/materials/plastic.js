// 塑膠材質:透明(量角器、擋風玻璃、汽缸)與實色塑膠。
import * as THREE from 'three';
import { toonMaterial } from './toon.js';

/** 透明塑膠(玻璃感):MeshPhysicalMaterial 輕透射 */
export function clearPlastic(tint = '#DCE8EA', opacity = 0.22) {
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    transparent: true,
    opacity,
    roughness: 0.1,
    metalness: 0,
    transmission: 0,          // 不用昂貴的透射,直接半透明
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/** 實色塑膠(按鈕、撥桿頭) */
export function solidPlastic(color) {
  return toonMaterial(color);
}
