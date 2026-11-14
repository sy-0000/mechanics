import * as THREE from 'three';

// 乾淨透明玻璃:幾乎看不見,只有環境反射帶來的淡淡反光。
export function glassMat(opacity = 0.08) {
  return new THREE.MeshStandardMaterial({
    color: '#F2F6F7', transparent: true, opacity, roughness: 0.04, metalness: 0, envMapIntensity: 1.6,
    depthWrite: false, side: THREE.DoubleSide,
  });
}
