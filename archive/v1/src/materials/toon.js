// 三渲二卡通材質:三階漸層的 MeshToonMaterial(非金屬件用)。
import * as THREE from 'three';

let gradientMap = null;

/** 三階漸層貼圖(暗 / 中 / 亮),明暗分明但不死黑 */
export function getGradientMap() {
  if (gradientMap) return gradientMap;
  const data = new Uint8Array([120, 190, 255]); // 三階,最暗 47%
  gradientMap = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  return gradientMap;
}

/** 卡通材質 */
export function toonMaterial(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: getGradientMap(),
    ...opts,
  });
}

/** 全專案顏色語言 */
export const COLORS = Object.freeze({
  input: '#C08054',    // 動力件 銅橘
  coupler: '#DBBE62',  // 連桿 黃
  frame: '#5A3A28',    // 機架 深棕
  output: '#75A17B',   // 輸出件 綠
  outline: '#3B2A1D',  // 描邊 深棕
  background: '#FEFDF5',
  blueprint: '#1B4F8F',
  // 道具用低飽和色(禁止與上面四色混淆)
  cream: '#F2ECD9',
  wood: '#B99B74',
  woodLight: '#D8C3A0',
  grey: '#A8A49B',
  greyBlue: '#9FA8AD',
  paper: '#F7F2E4',
  rubber: '#8E8578',
  rubberBlock: '#9A8FA3', // 夾鉗橡膠塊(灰紫,避開輸出綠)
  red: '#B5443C',      // 銷釘定位點(小面積語意外點綴)
});
