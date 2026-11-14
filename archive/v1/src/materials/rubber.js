// 橡膠材質(雨刷刷片、夾鉗橡膠塊、旋鈕滾花面)。霧面、無高光。
import { toonMaterial, COLORS } from './toon.js';

export function rubber(color = COLORS.rubber) {
  return toonMaterial(color);
}

/** 夾鉗底下的橡膠塊(灰紫,避開輸出綠) */
export function clampRubber() {
  return toonMaterial(COLORS.rubberBlock);
}
