// 金屬材質:陽極氧化鋁(桿件,帶顏色)、拋光鋼、青銅。
// 用 MeshStandardMaterial + 暖色攝影棚環境貼圖,高光隨視角移動;
// 細微經年磨損以輕度 roughness 變化與邊緣高光(環境反射自然呈現)表達。
import * as THREE from 'three';

let env = null;
const registry = [];

/** 由 renderer 初始化環境貼圖(main.js 啟動時呼叫一次) */
export async function initMetalEnv(renderer) {
  const { getStudioEnvMap } = await import('./envmap.js');
  env = getStudioEnvMap(renderer);
  for (const m of registry) {
    m.envMap = env;
    m.needsUpdate = true;
  }
}

function standard(params) {
  const m = new THREE.MeshStandardMaterial(params);
  if (env) m.envMap = env;
  else registry.push(m);
  m.envMapIntensity = params.envMapIntensity ?? 0.9;
  return m;
}

/** 陽極氧化鋁(語意色桿件):金屬感但保有色彩 */
export function anodizedAluminum(color) {
  return standard({ color, metalness: 0.75, roughness: 0.38, envMapIntensity: 0.8 });
}

/** 拋光鋼(墊片、滑塊導面、游標卡尺) */
export function polishedSteel() {
  return standard({ color: '#C9CDD2', metalness: 0.95, roughness: 0.18, envMapIntensity: 1.1 });
}

/** 青銅(圓頂螺栓、徽章、代號銅牌) */
export function bronze() {
  return standard({ color: '#9C7A4C', metalness: 0.9, roughness: 0.32, envMapIntensity: 1.0 });
}

/** 黃銅(徽章圓章) */
export function brass() {
  return standard({ color: '#B8923E', metalness: 0.9, roughness: 0.28, envMapIntensity: 1.0 });
}

/** 霧面機件金屬(馬達殼等,低調) */
export function dullMetal(color = '#8F8C86') {
  return standard({ color, metalness: 0.6, roughness: 0.55, envMapIntensity: 0.6 });
}
