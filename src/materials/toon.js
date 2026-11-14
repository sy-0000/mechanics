import * as THREE from 'three';

// 三階明暗:暗部仍保留 60% 亮度,避免死黑。
let gradient = null;
export function toonGradient() {
  if (gradient) return gradient;
  const data = new Uint8Array([150, 150, 150, 255, 205, 205, 205, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

const cache = new Map();
/** 卡通材質。所有幾何都帶 vertex color(預設白),遠景的烘焙陰影寫在這裡。 */
export function toon(color, opts = {}) {
  const key = opts.key ?? (opts.map || opts.transparent || opts.emissive ? null : `${color}|${opts.side ?? 0}`);
  if (key && cache.has(key)) return cache.get(key);
  const m = new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    gradientMap: toonGradient(),
    vertexColors: true,
    map: opts.map ?? null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    emissive: new THREE.Color(opts.emissive ?? '#000000'),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
  if (opts.depthWrite === false) m.depthWrite = false;
  if (key) cache.set(key, m);
  return m;
}

/** 無光照材質(窗外、發光面)。 */
export function flat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color), vertexColors: true, map: opts.map ?? null,
    fog: opts.fog ?? true, transparent: !!opts.transparent, opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide, depthWrite: opts.depthWrite ?? true,
  });
}
