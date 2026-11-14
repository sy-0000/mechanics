import { std } from './standard.js';

// 磨石子地板:石粒、細微裂痕、髒污與鞋印擦痕,打磨後帶柔和反光(粗糙度約 0.4)。
export function terrazzoMat(color) {
  return std(color, { set: 'terrazzo', roughness: 1, metalness: 0, normalScale: 0.8, key: 'terrazzo' });
}
