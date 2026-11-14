// 教具共用工具組(kit):
//  1. 一張 PBR 圖集材質:反照率 / 法線 / ORM 三張貼圖,素材直接取自教室材質工廠(pbrSet)的烤漆金屬、木紋、拉絲鋼,
//     再加上一塊可寫字的區域(代號銅牌、旋鈕刻度、任務卡)。整個教具的不透明零件共用這一個 MeshStandardMaterial。
//  2. 剛體合併(BodyBuilder):一個會一起動的零件群合併成一個 Mesh,顏色烘進頂點色 → 每個剛體 1 個 draw call。
//  3. 藍圖著色:同一個材質用 onBeforeCompile 加一個 uBP 參數,0→1 時變成深藍半透明 + 白色邊線(依視角的輪廓),
//     頂點屬性 keep=1 的部分(代號銅牌)保留原色。
//  4. 幾何小工具(公尺)、簡易接觸陰影。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { pbrSet } from '../materials/standard.js';
import { gearProfile } from '../kinematics/gears.js';
import { CHALK_COLORS } from '../scene/classroom/chalkWriter.js';

/** 四個語意色(AGENT.md 第 5 節)。只用在教具上。 */
export const SEM = Object.freeze({ input: '#C08054', coupler: '#DBBE62', frame: '#5A3A28', output: '#75A17B' });
/** 教具上非語意零件的中性色(低飽和,避開四個語意色)。 */
export const N = Object.freeze({
  steel: '#C9CDD0', steelDark: '#80868A', black: '#3A3C3E', rubber: '#2F3133', plate: '#34312E',
  cream: '#EDE6D6', wire: '#5B5E61', glass: '#DCE8EC', brass: '#B9A27A', paper: '#F6F1E4',
});
export const CHALK = CHALK_COLORS;
export const FONT = `"ChalkTC", "ChalkSym", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;

const AT = 1024;
// 圖集區塊(像素,canvas 座標 y 向下):[x, y, w, h]
const REGION = {
  paint: [0, 0, 512, 512],     // 烤漆金屬(語意色零件)
  wood: [512, 0, 512, 512],    // 木紋(機架木塊)
  steel: [0, 512, 512, 256],   // 拉絲鋼(銷、軸、螺絲)
  plain: [512, 512, 256, 256], // 霧面塑膠 / 漆
  rubber: [768, 512, 256, 256],// 橡膠
  label: [0, 768, 1024, 256],  // 可寫字區
};
const INSET = 10;

function canvas(n = AT) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
function rectUV([x, y, w, h], inset = INSET) {
  return [(x + inset) / AT, 1 - (y + h - inset) / AT, (x + w - inset) / AT, 1 - (y + inset) / AT];
}

let KIT = null;
/** 取得(或建立)全站共用的教具工具組。 */
export function getKit() { return KIT ?? (KIT = createKit()); }

function createKit() {
  const mapC = canvas(), nrmC = canvas(), ormC = canvas();
  const gm = mapC.getContext('2d'), gn = nrmC.getContext('2d'), go = ormC.getContext('2d');
  const blit = (set, [x, y, w, h]) => {
    gm.drawImage(set.map.image, 0, 0, set.map.image.width, set.map.image.height, x, y, w, h);
    gn.drawImage(set.normalMap.image, 0, 0, set.normalMap.image.width, set.normalMap.image.height, x, y, w, h);
    go.drawImage(set.orm.image, 0, 0, set.orm.image.width, set.orm.image.height, x, y, w, h);
  };
  const fill = ([x, y, w, h], map, orm) => {
    gm.fillStyle = map; gm.fillRect(x, y, w, h);
    gn.fillStyle = 'rgb(128,128,255)'; gn.fillRect(x, y, w, h);
    go.fillStyle = orm; go.fillRect(x, y, w, h);
  };
  blit(pbrSet('metal:painted'), REGION.paint);
  blit(pbrSet('wood:grain'), REGION.wood);
  blit(pbrSet('metal:brushed'), REGION.steel);
  fill(REGION.plain, '#f4f4f4', 'rgb(255,150,0)');
  fill(REGION.rubber, '#e8e8e8', 'rgb(255,232,0)');
  fill(REGION.label, '#ffffff', 'rgb(255,140,0)');
  // 烤漆區:提高一點金屬度,讓語意色零件像陽極處理的金屬件,有環境反射
  go.globalCompositeOperation = 'lighter'; go.fillStyle = 'rgb(0,0,70)'; go.fillRect(...REGION.paint); go.globalCompositeOperation = 'source-over';

  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4; t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  const map = tex(mapC, true), normalMap = tex(nrmC, false), orm = tex(ormC, false);
  const uBP = { value: 0 };
  const material = new THREE.MeshStandardMaterial({
    map, normalMap, roughnessMap: orm, metalnessMap: orm, aoMap: orm,
    vertexColors: true, roughness: 1, metalness: 1, envMapIntensity: 1.6,
  });
  material.normalScale.setScalar(0.7);
  material.name = 'aid-atlas';
  material.onBeforeCompile = sh => {
    sh.uniforms.uBP = uBP;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float keep;\nvarying float vKeep;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKeep = keep;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uBP;\nvarying float vKeep;')
      .replace('#include <colorspace_fragment>', `#include <colorspace_fragment>
      {
        float bpk = uBP * (1.0 - vKeep);
        if (bpk > 0.001) {
          float ndv = abs(dot(normalize(nonPerturbedNormal), normalize(vViewPosition)));
          float edge = smoothstep(0.45, 0.12, ndv);
          vec3 bp = mix(vec3(0.106, 0.31, 0.56) * 0.62, vec3(0.95, 0.97, 1.0), edge);
          gl_FragColor = vec4(mix(gl_FragColor.rgb, bp, bpk), mix(gl_FragColor.a, mix(0.38, 0.96, edge), bpk));
        }
      }`);
  };
  material.customProgramCacheKey = () => 'aid-atlas-bp';

  // ---------- 寫字區配置(簡單的貨架演算法) ----------
  let shelfX = 0, shelfY = 0, shelfH = 0;
  const labels = [];
  function resetLabels() {
    shelfX = shelfY = shelfH = 0; labels.length = 0;
    fill(REGION.label, '#ffffff', 'rgb(255,140,0)');
    map.needsUpdate = orm.needsUpdate = true;
  }
  /** 配置一塊 w×h 像素的寫字格。回傳 {rect(uv), draw(fn)};fn(ctx, w, h) 以格子左上為原點。 */
  function label(w, h, { metal = 0, rough = 0.55 } = {}) {
    const [rx, ry, rw, rh] = REGION.label;
    if (shelfX + w + 4 > rw) { shelfX = 0; shelfY += shelfH + 4; shelfH = 0; }
    if (shelfY + h > rh) { console.warn('[kit] 寫字區已滿'); shelfX = shelfY = 0; }
    const x = rx + shelfX, y = ry + shelfY;
    shelfX += w + 4; shelfH = Math.max(shelfH, h);
    go.fillStyle = `rgb(255,${Math.round(rough * 255)},${Math.round(metal * 255)})`; go.fillRect(x, y, w, h);
    orm.needsUpdate = true;
    const cell = {
      rect: [(x + 1) / AT, 1 - (y + h - 1) / AT, (x + w - 1) / AT, 1 - (y + 1) / AT], w, h,
      draw(fn) {
        gm.save(); gm.beginPath(); gm.rect(x, y, w, h); gm.clip(); gm.translate(x, y);
        gm.clearRect(0, 0, w, h); fn(gm, w, h); gm.restore(); map.needsUpdate = true;
      },
    };
    labels.push(cell);
    return cell;
  }

  // ---------- 藍圖過渡(0.4 秒) ----------
  let bpTarget = 0;
  function setBlueprint(on) {
    bpTarget = on ? 1 : 0;
    if (on && !material.transparent) { material.transparent = true; material.needsUpdate = true; }
  }
  function update(dt) {
    if (uBP.value === bpTarget) return;
    const step = dt / 0.4;
    uBP.value = bpTarget > uBP.value ? Math.min(bpTarget, uBP.value + step) : Math.max(bpTarget, uBP.value - step);
    if (uBP.value === 0 && material.transparent) { material.transparent = false; material.needsUpdate = true; }
  }

  return {
    material, map, orm, uBP, label, resetLabels, setBlueprint, update,
    get blueprint() { return bpTarget === 1; }, get blueprintK() { return uBP.value; },
    swatch: name => rectUV(REGION[name]),
    body: name => new BodyBuilder(name),
  };
}

// ---------------- 剛體合併 ----------------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const _c = new THREE.Color();

/** 盒狀投影 UV 到圖集的某一塊(依零件自己的大小縮放,不會超出區塊)。 */
function swatchUV(g, rect, meters = 0.3) {
  const p = g.attributes.position, n = g.attributes.normal;
  g.computeBoundingBox();
  const bb = g.boundingBox, size = new THREE.Vector3(); bb.getSize(size);
  const k = 1 / Math.max(meters, size.x, size.y, size.z);
  const uv = new Float32Array(p.count * 2);
  const [u0, v0, u1, v1] = rect;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let a, b;
    const x = (p.getX(i) - bb.min.x) * k, y = (p.getY(i) - bb.min.y) * k, z = (p.getZ(i) - bb.min.z) * k;
    if (ay >= ax && ay >= az) { a = x; b = z; } else if (ax >= az) { a = z; b = y; } else { a = x; b = y; }
    uv[i * 2] = u0 + (u1 - u0) * Math.min(1, Math.max(0, a));
    uv[i * 2 + 1] = v0 + (v1 - v0) * Math.min(1, Math.max(0, b));
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export class BodyBuilder {
  constructor(name = 'body') { this.name = name; this.parts = []; }
  /**
   * 加入一個零件(幾何會被複製,原本的幾何可重複使用)。
   * o: color、sw(圖集區塊:paint|wood|steel|plain|rubber)、pos、rot、scale、keep(藍圖時保留原色)、
   *    rect(寫字格 uv;給了就把幾何原本的 uv 映射進去)、uvScale(公尺)
   */
  add(geo, o = {}) { this.parts.push({ geo, ...o }); return this; }
  get empty() { return this.parts.length === 0; }
  geometry() {
    const kit = getKit();
    const list = this.parts.map(pt => {
      let g = pt.geo.index ? pt.geo.toNonIndexed() : pt.geo.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (pt.rect) {
        const uv = g.attributes.uv, [u0, v0, u1, v1] = pt.rect;
        const a = new Float32Array(uv.count * 2);
        for (let i = 0; i < uv.count; i++) { a[i * 2] = u0 + (u1 - u0) * uv.getX(i); a[i * 2 + 1] = v0 + (v1 - v0) * uv.getY(i); }
        g.setAttribute('uv', new THREE.BufferAttribute(a, 2));
      } else swatchUV(g, kit.swatch(pt.sw ?? 'paint'), pt.uvScale);
      _p.set(...(pt.pos ?? [0, 0, 0])); _e.set(...(pt.rot ?? [0, 0, 0])); _q.setFromEuler(_e);
      const sc = pt.scale ?? 1; Array.isArray(sc) ? _s.set(...sc) : _s.setScalar(sc);
      g.applyMatrix4(_m.compose(_p, _q, _s));
      const cnt = g.attributes.position.count;
      _c.set(pt.color ?? '#ffffff');
      const col = new Float32Array(cnt * 3), keep = new Float32Array(cnt).fill(pt.keep ? 1 : 0);
      for (let i = 0; i < cnt; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('keep', new THREE.BufferAttribute(keep, 1));
      return g;
    });
    const merged = mergeGeometries(list, false);
    list.forEach(g => g.dispose());
    merged.computeBoundingSphere();
    return merged;
  }
  /** 合併成一個 Mesh(1 個 draw call)。 */
  build({ cast = true, receive = true } = {}) {
    const mesh = new THREE.Mesh(this.geometry(), getKit().material);
    mesh.name = this.name; mesh.castShadow = cast; mesh.receiveShadow = receive;
    return mesh;
  }
  /** 合併成 InstancedMesh(相同小零件:銷、鍊節、齒)。 */
  instanced(count, { cast = true } = {}) {
    const im = new THREE.InstancedMesh(this.geometry(), getKit().material, count);
    im.name = this.name; im.castShadow = cast; im.receiveShadow = true; im.frustumCulled = false;
    return im;
  }
}

// ---------------- 幾何小工具(公尺) ----------------
const gcache = new Map();
const cached = (k, f) => (gcache.has(k) ? gcache.get(k) : (gcache.set(k, f()), gcache.get(k)));
export const geo = {
  box: (w, h, d, r = Math.min(0.004, Math.min(w, h, d) * 0.25)) => cached(`b${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r)),
  /** 沿 Z 軸的圓柱(預設置中)。 */
  cylZ: (r, h, seg = 24, r2 = r) => cached(`cz${r},${h},${seg},${r2}`, () => new THREE.CylinderGeometry(r2, r, h, seg).rotateX(Math.PI / 2)),
  /** 沿 Y 軸的圓柱。 */
  cylY: (r, h, seg = 24, r2 = r) => cached(`cy${r},${h},${seg},${r2}`, () => new THREE.CylinderGeometry(r2, r, h, seg)),
  sphere: (r, s = 12) => cached(`s${r},${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, s * 0.66 | 0))),
  plane: (w, h) => cached(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h)),
  torus: (R, r, ts = 32, rs = 8, arc = Math.PI * 2) => cached(`t${R},${r},${ts},${rs},${arc}`, () => new THREE.TorusGeometry(R, r, rs, ts, arc)),
  /** 圓頭桿(stadium):孔心 0 → len 沿 +X,帶倒角與兩端的孔。 */
  bar: (len, w = 0.016, t = 0.006, holeR = 0.003) => cached(`bar${len},${w},${t},${holeR}`, () => {
    const r = w / 2, s = new THREE.Shape();
    s.absarc(0, 0, r, Math.PI / 2, Math.PI * 1.5, false); s.lineTo(len, -r);
    s.absarc(len, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(0, r);
    if (holeR > 0) for (const hx of [0, len]) { const h = new THREE.Path(); h.absarc(hx, 0, holeR, 0, Math.PI * 2, true); s.holes.push(h); }
    const b = Math.min(t * 0.25, 0.0015);
    const g = new THREE.ExtrudeGeometry(s, { depth: t - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 16 });
    g.translate(0, 0, -(t - 2 * b) / 2); g.computeVertexNormals(); return g;
  }),
  /** 2D 外形擠出(厚度沿 Z,置中)。 */
  extrude: (shape, t, bevel = 0.0008, curve = 12) => {
    const b = Math.min(bevel, t * 0.3);
    const g = new THREE.ExtrudeGeometry(shape, { depth: t - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: curve });
    g.translate(0, 0, -(t - 2 * b) / 2); g.computeVertexNormals(); return g;
  },
  /** 漸開線正齒輪(模數 m 單位 mm),齒合併成一個幾何,中心有軸孔;齒 0 沿 +X。 */
  gear: (m, z, t = 0.008, bore = 0.004) => cached(`g${m},${z},${t},${bore}`, () => {
    const pts = gearProfile(m, z, { flankSteps: 5, tipSteps: 2, rootSteps: 2 }).map(([x, y]) => new THREE.Vector2(x / 1000, y / 1000));
    const s = new THREE.Shape(pts);
    if (bore > 0) { const h = new THREE.Path(); h.absarc(0, 0, bore, 0, Math.PI * 2, true); s.holes.push(h); }
    const rp = m * z / 2000;
    if (z >= 30) { // 減輕孔
      const n = 5, rr = rp * 0.18;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.3, h = new THREE.Path(); h.absarc(Math.cos(a) * rp * 0.52, Math.sin(a) * rp * 0.52, rr, 0, Math.PI * 2, true); s.holes.push(h); }
    }
    return geo.extrude(s, t, 0.0006, 8);
  }),
  /** 圓環(厚度沿 Z)。 */
  ring: (R, r, t, seg = 40) => cached(`r${R},${r},${t},${seg}`, () => {
    const s = new THREE.Shape(); s.absarc(0, 0, R, 0, Math.PI * 2, false);
    const h = new THREE.Path(); h.absarc(0, 0, r, 0, Math.PI * 2, true); s.holes.push(h);
    return geo.extrude(s, t, 0.0006, seg);
  }),
  tube: (points, r, seg = 24, rs = 8) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), seg, r, rs, false),
  lathe: (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg),
};

/** 齒輪節圓半徑(公尺)。 */
export const pitchR = (m, z) => (m * z) / 2000;

// ---------------- 寫字格:代號銅牌、刻度牌 ----------------
/** 代號銅牌:深色小牌(跟黑板同色系),符號用和黑板相同的粉筆色。回傳可加入 BodyBuilder 的零件參數。 */
export function codePlate(text, chalk = 'white', { w = 0.032, h = 0.02, px = 96 } = {}) {
  const kit = getKit();
  const cell = kit.label(px, Math.round(px * h / w), { metal: 0.65, rough: 0.35 });
  cell.draw((g, W, H) => {
    g.fillStyle = '#8C7A5C'; g.fillRect(0, 0, W, H);           // 黃銅邊
    g.fillStyle = '#34312E'; g.fillRect(3, 3, W - 6, H - 6);    // 深色牌面
    g.fillStyle = CHALK[chalk] ?? chalk; g.textAlign = 'center'; g.textBaseline = 'middle';
    drawMarkupText(g, text, W / 2, H / 2 + 2, H * 0.62);
  });
  return { geo: new THREE.PlaneGeometry(w, h), rect: cell.rect, keep: 1, color: '#ffffff', cell };
}

/** 在寫字格畫簡單的「主字 + 下標」(例如 θ_2、z_A)。 */
export function drawMarkupText(g, text, cx, cy, size) {
  const [main, sub] = String(text).split('_');
  g.font = `${size}px ${FONT}`;
  const wm = g.measureText(main).width;
  g.font = `${size * 0.62}px ${FONT}`;
  const ws = sub ? g.measureText(sub).width : 0;
  const x0 = cx - (wm + ws) / 2;
  g.textAlign = 'left';
  g.font = `${size}px ${FONT}`; g.fillText(main, x0, cy);
  if (sub) { g.font = `${size * 0.62}px ${FONT}`; g.fillText(sub, x0 + wm, cy + size * 0.28); }
}

// ---------------- 接觸陰影 ----------------
let shadowTex = null;
/** 教具底下的簡易接觸陰影(半透明深色貼片),vr-baked 模式教具運動時使用。 */
export function contactShadow(w, d) {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0, color: '#1c1a17' }));
  m.position.y = 0.0015; m.renderOrder = 1; m.name = 'contactShadow'; m.visible = false;
  m.material.userData.sharedMap = true;
  return m;
}
