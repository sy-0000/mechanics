import * as THREE from 'three';
import { std } from './standard.js';

// 帆布 / 窗簾:織紋法線,霧面。
export function fabricMat(color) {
  return std(color, { set: 'fabric', roughness: 1, metalness: 0, side: THREE.DoubleSide, normalScale: 0.6, key: `fabric|${color}` });
}
