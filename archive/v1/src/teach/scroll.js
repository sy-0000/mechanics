// 卷軸(國中版):桌上紙卷道具,碰觸展開成一張紙浮在機構上方偏側。
// 每頁固定四行:白話 / 公式 / 代入 / 結果。紙角可翻頁。
import * as THREE from 'three';
import { bevelCylinder } from '../assets/geo.js';
import { plainPaper } from '../materials/paper.js';
import { addOutline } from '../materials/outline.js';
import { toonMaterial, COLORS } from '../materials/toon.js';
import { makeTextCanvas } from './typeset.js';
import { sfx } from '../audio/sfx.js';

/**
 * @param {object} p
 *  getPages: () => [{plain, formula, subst, result}]  各欄位都是 segments 陣列
 *  onPageShown?: (pageIndex) => void  在機構上同步標出結果
 * 回傳 group(放在桌上的紙卷位置);展開的紙是 group 的子物件(浮起)。
 */
export function createScroll({ getPages, onPageShown = null, onStateChange = null } = {}) {
  const group = new THREE.Group();
  group.name = 'scroll';

  // 桌上的紙卷(兩個木軸 + 捲起的紙筒)
  const rollG = new THREE.Group();
  const paperRoll = new THREE.Mesh(bevelCylinder(0.014, 0.13, { seg: 20 }), plainPaper());
  paperRoll.rotation.x = Math.PI / 2;
  paperRoll.rotation.z = Math.PI / 2;
  paperRoll.position.y = 0.016;
  paperRoll.castShadow = true;
  addOutline(paperRoll, { thickness: 0.0008 });
  rollG.add(paperRoll);
  for (const s of [-1, 1]) {
    const knobEnd = new THREE.Mesh(bevelCylinder(0.0075, 0.02, { seg: 14 }), toonMaterial(COLORS.wood));
    knobEnd.rotation.y = Math.PI / 2;
    knobEnd.position.set(s * 0.074, 0.016, 0);
    knobEnd.castShadow = true;
    addOutline(knobEnd, { thickness: 0.0007 });
    rollG.add(knobEnd);
  }
  group.add(rollG);
  paperRoll.userData.touchable = { kind: 'scroll', onTouch: () => toggle() };

  // 展開的紙(浮在機構上方偏側;由關卡決定 group 的位置,紙的偏移固定)
  const W = 0.34, H = 0.26;
  const sheet = new THREE.Group();
  sheet.position.set(0.1, 0.32, -0.28); // 相對紙卷:上方偏側
  sheet.visible = false;
  group.add(sheet);

  const pageTex = new THREE.CanvasTexture(document.createElement('canvas'));
  pageTex.colorSpace = THREE.SRGBColorSpace;
  pageTex.anisotropy = 4;
  const page = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({ map: pageTex, side: THREE.DoubleSide }),
  );
  addOutline(page, { thickness: 0.0012 });
  sheet.add(page);
  // 上下紙軸
  for (const s of [-1, 1]) {
    const rod = new THREE.Mesh(bevelCylinder(0.009, W + 0.03, { seg: 14 }), toonMaterial(COLORS.wood));
    rod.rotation.y = Math.PI / 2;
    rod.position.y = s * (H / 2 + 0.004);
    rod.castShadow = true;
    addOutline(rod, { thickness: 0.0007 });
    sheet.add(rod);
  }
  // 翻頁紙角(左下 = 上一頁,右下 = 下一頁)
  const cornerGeo = new THREE.PlaneGeometry(0.05, 0.05);
  const mkCorner = (x, label, dir) => {
    const { canvas } = makeTextCanvas(
      [{ segments: [{ t: label, color: '#7A5A3A' }], align: 'center' }],
      { width: 160, baseSize: 52, pad: 20, bg: '#EDE3C8' },
    );
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const c = new THREE.Mesh(cornerGeo, new THREE.MeshBasicMaterial({ map: tex }));
    c.position.set(x, -H / 2 + 0.028, 0.002);
    c.rotation.z = dir * -0.12;
    c.userData.touchable = { kind: 'scroll-page', onTouch: () => flip(dir) };
    sheet.add(c);
    return c;
  };
  const prevCorner = mkCorner(-W / 2 + 0.03, '上一頁', -1);
  const nextCorner = mkCorner(W / 2 - 0.03, '下一頁', 1);

  const state = { open: false, pageIndex: 0, anim: 0 };

  function renderPage() {
    const pages = getPages();
    const n = pages.length;
    state.pageIndex = Math.min(n - 1, Math.max(0, state.pageIndex));
    const p = pages[state.pageIndex];
    const rows = [];
    const label = (t, c) => [{ t, color: c }];
    if (p.title) rows.push({ segments: p.title, align: 'center', size: 58, gapAfter: 10 });
    const addRow = (tag, segs) => {
      if (!segs) return;
      rows.push({ segments: [...label(`${tag} `, '#A08050'), ...segs], size: 50, gapAfter: 8 });
    };
    addRow('白話', p.plain);
    addRow('公式', p.formula);
    addRow('代入', p.subst);
    addRow('結果', p.result);
    rows.push({ segments: [{ t: `${state.pageIndex + 1} / ${n}`, color: '#B9A074' }], align: 'center', size: 34 });
    const { canvas } = makeTextCanvas(rows, { width: 1100, baseSize: 50, pad: 56, bg: '#F7F2E4' });
    pageTex.image = canvas;
    pageTex.needsUpdate = true;
    prevCorner.visible = state.pageIndex > 0;
    nextCorner.visible = state.pageIndex < n - 1;
    onPageShown?.(state.pageIndex);
  }

  function toggle() { setOpen(!state.open); }
  function setOpen(open, silent = false) {
    if (state.open === open) return;
    state.open = open;
    if (open) renderPage();
    sfx.button();
    if (!silent) onStateChange?.({ open: state.open, page: state.pageIndex });
  }
  function flip(dir) {
    const n = getPages().length;
    const np = Math.min(n - 1, Math.max(0, state.pageIndex + dir));
    if (np === state.pageIndex) return;
    state.pageIndex = np;
    renderPage();
    sfx.button();
    onStateChange?.({ open: state.open, page: state.pageIndex });
  }
  /** 老師同步:全員打開到同一頁 */
  function applyRemote({ open, page }) {
    state.pageIndex = page ?? state.pageIndex;
    if (open !== undefined && open !== state.open) {
      state.open = open;
    }
    if (state.open) renderPage();
  }

  group.userData.update = (dt) => {
    const target = state.open ? 1 : 0;
    state.anim += (target - state.anim) * Math.min(1, dt * 6);
    sheet.visible = state.anim > 0.02;
    sheet.scale.setScalar(Math.max(0.001, state.anim));
    // 展開時數值即時:每 0.5s 重繪
    if (state.open && state.anim > 0.95) {
      group.userData._t = (group.userData._t || 0) + dt;
      if (group.userData._t > 0.5) { group.userData._t = 0; renderPage(); }
    }
  };
  group.userData.scroll = { setOpen, flip, applyRemote, get state() { return state; }, renderPage };
  return group;
}
