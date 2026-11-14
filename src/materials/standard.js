import * as THREE from 'three';
import { C } from './palette.js';
import { woodSet, terrazzoSet, wallSet, metalSet, fabricSet, slateRoughSet } from './pbrTextures.js';

// 寫實 PBR 材質工廠(MeshStandardMaterial)。所有貼圖程序產生,一組 = map + normalMap + ORM。
const sets = new Map();
export function pbrSet(name) {
  if (sets.has(name)) return sets.get(name);
  const [kind, sub] = name.split(':');
  const s = kind === 'wood' ? woodSet(sub) : kind === 'terrazzo' ? terrazzoSet() : kind === 'wall' ? wallSet()
    : kind === 'metal' ? metalSet(sub) : kind === 'fabric' ? fabricSet() : kind === 'slate' ? slateRoughSet() : null;
  sets.set(name, s);
  return s;
}

// 依顏色自動判定的金屬(工具鋼、鋁、鑄鐵、烤漆機台)
const AUTO = {
  [C.steel]: { set: 'metal:brushed', roughness: 1, metalness: 1, envMapIntensity: 2.4 },
  [C.steelBright]: { set: 'metal:brushed', roughness: 0.75, metalness: 1, envMapIntensity: 2.4 },
  [C.steelDark]: { set: 'metal:brushed', roughness: 1.1, metalness: 1, envMapIntensity: 2.4 },
  [C.alu]: { set: 'metal:brushed', roughness: 0.9, metalness: 1, envMapIntensity: 2.4 },
  [C.aluFrame]: { set: 'metal:brushed', roughness: 1.3, metalness: 1, envMapIntensity: 2.4 },
  [C.castIron]: { set: 'metal:cast', roughness: 1, metalness: 1, envMapIntensity: 2.4 },
  [C.machineWarm]: { set: 'metal:painted', roughness: 1, metalness: 1 },
  [C.machineCream]: { set: 'metal:painted', roughness: 1, metalness: 1 },
  [C.trashGray]: { roughness: 0.6, metalness: 0 },
  [C.board]: { set: 'slate', roughness: 1, metalness: 0 },
};

const ROUGH_LEVELS = [0.35, 0.6, 0.9];
const cache = new Map();
/**
 * opts: set(PBR 組名稱)、map(覆蓋反照率)、roughness、metalness、emissive、emissiveIntensity、
 *       transparent、opacity、side、normalScale、key(快取鍵)、envMapIntensity
 */
export function std(color, opts = {}) {
  const auto = AUTO[String(color).toUpperCase()] ?? AUTO[color];
  const o = { roughness: 0.6, metalness: 0, ...(auto ?? {}), ...opts };
  // 沒有貼圖的塑膠/漆面材質:粗糙度與金屬度吸附到少數幾個等級,
  // 讓不同物件的材質鍵相同、合併進同一批次(顏色已烘進頂點色),新增物件時不會多出 draw call。
  if (!o.set && !o.map && !o.transparent) {
    o.roughness = ROUGH_LEVELS.reduce((a, b) => (Math.abs(b - o.roughness) < Math.abs(a - o.roughness) ? b : a));
    o.metalness = o.metalness >= 0.5 ? 1 : 0;
  }
  const key = opts.key ?? (opts.map || opts.transparent ? null : JSON.stringify([color, o.set, o.roughness, o.metalness, o.emissive, o.emissiveIntensity, o.side ?? 0, o.normalScale]));
  if (key && cache.has(key)) return cache.get(key);
  const s = o.set ? pbrSet(o.set) : null;
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    map: o.map ?? s?.map ?? null,
    normalMap: s?.normalMap ?? null,
    aoMap: s?.orm ?? null, roughnessMap: s?.orm ?? null, metalnessMap: s?.orm ?? null,
    roughness: o.roughness, metalness: o.metalness,
    transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide,
    emissive: new THREE.Color(o.emissive ?? '#000000'), emissiveIntensity: o.emissiveIntensity ?? 1,
    vertexColors: true,
  });
  if (s) m.normalScale.setScalar(o.normalScale ?? 1);
  if (o.envMapIntensity !== undefined) m.envMapIntensity = o.envMapIntensity;
  if (o.depthWrite === false) m.depthWrite = false;
  // 合併用的鍵:除了 color 之外的所有屬性(color 會烘進頂點色)
  m.userData.foldKey = JSON.stringify([m.map?.uuid, m.normalMap?.uuid, m.aoMap?.uuid, o.roughness, o.metalness, o.side ?? 0, o.normalScale, o.envMapIntensity]);
  if (key) cache.set(key, m);
  return m;
}

/** 無光照材質(窗外遠景、發光面)。 */
export function flat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color), vertexColors: true, map: opts.map ?? null,
    fog: opts.fog ?? true, transparent: !!opts.transparent, opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide, depthWrite: opts.depthWrite ?? true,
  });
}

/** 牆面乳膠漆。 */
export function wallMat(color) { return std(color, { set: 'wall', roughness: 1, metalness: 0, key: `wall|${color}` }); }
