import * as THREE from 'three';

// 乾淨透明玻璃:極淡的反光,幾乎看不見。
export function glassMat(opacity = 0.07) {
  return new THREE.MeshBasicMaterial({
    color: '#F2F6F7', transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, vertexColors: true,
  });
}
