// 連桿(中間傳動,黃)。樞紐 A 在原點、沿 +X。
import { buildBarLink } from './barLink.js';
import { COLORS } from '../../materials/toon.js';

export function createCoupler(length, opts = {}) {
  return buildBarLink(length, COLORS.coupler, { name: 'coupler', ...opts });
}
