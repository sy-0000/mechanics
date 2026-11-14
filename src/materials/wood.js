import { std } from './standard.js';

// 木材 PBR:看得到木紋(反照率 + 法線 + 粗糙度 + 凹陷 AO)。kind: grain | laminate | knotty。
// seed 參數保留以相容舊呼叫;為了合併與省記憶體,同 kind 共用一組貼圖。
export function woodMat(color, kind = 'grain', seed = 0) {
  return std(color, { set: `wood:${kind}`, roughness: 1, metalness: 0, normalScale: 0.6, key: `wood|${color}|${kind}` });
}
