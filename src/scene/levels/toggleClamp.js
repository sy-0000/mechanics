// 彩蛋 肘節夾鉗:壓下握把連桿拉直,過中心鎖死;沒過中心放手彈開。
import * as THREE from 'three';
import {
  DEG, betaFromHandle, isLocked, clampForceRatio, rubberCompression, CLAMP_DEFAULT,
} from '../../kinematics/toggleClamp.js';
import { bevelBox, bevelCylinder } from '../../assets/geo.js';
import { buildBarLink } from '../../assets/linkage/barLink.js';
import { createRubberBlock } from '../../assets/props/rubberBlock.js';
import { createPin } from '../../assets/linkage/pin.js';
import { frameWood } from '../../materials/wood.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';
import { createTag } from '../../teach/tags.js';
import { createScroll } from '../../teach/scroll.js';
import { textPlane, T } from '../../teach/typeset.js';
import { sfx } from '../../audio/sfx.js';

export async function createLevel(ctx) {
  const group = new THREE.Group();
  group.name = 'level-toggleClamp';

  const S = {
    handle: 0,      // 0 張開 … 1 全壓(過中心)
    beta: CLAMP_DEFAULT.beta0,
    held: false,
    lockedSound: false,
  };

  const mech = new THREE.Group();
  mech.position.set(0, 0.02, -0.05);
  group.add(mech);

  // 底座與直立支架(深棕)
  const base = new THREE.Mesh(bevelBox(0.3, 0.03, 0.18, { corner: 0.008 }), frameWood());
  base.position.y = 0.015;
  base.castShadow = true; base.receiveShadow = true;
  addOutline(base);
  mech.add(base);
  const post = new THREE.Mesh(bevelBox(0.035, 0.2, 0.05, { corner: 0.005 }), frameWood());
  post.position.set(-0.1, 0.13, 0);
  post.castShadow = true;
  addOutline(post);
  mech.add(post);

  // 幾何:支點 P(支架頂)、夾臂水平向右;肘節兩連桿在夾臂後端與握把之間
  const PIVOT = new THREE.Vector3(-0.1, 0.22, 0.02);
  const planeG = new THREE.Group();
  planeG.position.copy(PIVOT);
  mech.add(planeG);

  // 夾臂(綠):從支點向右延伸,前端壓橡膠塊
  const armLen = 0.2;
  const arm = buildBarLink(armLen, COLORS.output, { name: 'clampArm', width: 0.024, thickness: 0.012 });
  planeG.add(arm);

  // 握把(銅橘):從支點上方往右上
  const handleLen = 0.19;
  const handleBar = buildBarLink(handleLen, COLORS.input, { name: 'clampHandle', width: 0.02, thickness: 0.01 });
  handleBar.position.z = 0.016;
  planeG.add(handleBar);
  // 握把套
  const gripSleeve = new THREE.Mesh(bevelCylinder(0.011, 0.06, { seg: 14 }), toonMaterial(COLORS.greyBlue));
  gripSleeve.rotation.y = Math.PI / 2;
  gripSleeve.position.set(handleLen - 0.03, 0, 0.016);
  gripSleeve.castShadow = true;
  addOutline(gripSleeve);
  handleBar.add(gripSleeve);

  // 連桿(黃):握把中段 → 夾臂中段
  const linkBar = buildBarLink(0.09, COLORS.coupler, { name: 'clampLink', width: 0.016, thickness: 0.008 });
  linkBar.position.z = 0.03;
  planeG.add(linkBar);

  // 銷釘
  const pins = [createPin(), createPin(), createPin()];
  for (const p of pins) { p.position.z = 0.042; planeG.add(p); }

  // 橡膠塊(灰紫)
  const rubber = createRubberBlock();
  rubber.position.set(PIVOT.x + armLen - 0.015, 0.048, PIVOT.z);
  mech.add(rubber);

  // ── 握把抓取(rotary 繞支點)──
  gripSleeve.userData.grabbable = {
    type: 'rotary',
    pivot: planeG,
    onGrab: () => { S.held = true; sfx.grab(); },
    onRotate: (d) => {
      // 往下壓 = 角度減少 → handle 0→1
      S.handle = Math.min(1, Math.max(0, S.handle - d / (50 * DEG)));
      poseFromHandle();
    },
    onRelease: () => {
      S.held = false;
      if (!isLocked(S.beta)) {
        sfx.springBack();
      }
    },
  };

  function poseFromHandle() {
    const wasLocked = isLocked(S.beta);
    S.beta = betaFromHandle(S.handle);
    if (!wasLocked && isLocked(S.beta)) {
      sfx.lock();
      ctx.haptics?.pulse('both', 'lock');
    }
    const comp = rubberCompression(S.beta);
    rubber.userData.setCompression(comp);
    // 視覺位姿:握把 35°→−8°;夾臂 10°→0°(壓下);連桿連接兩者
    const hA = (35 - 43 * S.handle) * DEG;
    const aA = (8 - 8 * Math.min(1, comp)) * DEG;
    handleBar.rotation.z = hA;
    arm.rotation.z = -aA * 0 - (1 - comp) * 4 * DEG;
    // 連桿:從握把 60% 處接到夾臂 55% 處
    const p1 = new THREE.Vector3(handleLen * 0.55, 0, 0.03).applyAxisAngle(new THREE.Vector3(0, 0, 1), hA);
    const p2 = new THREE.Vector3(armLen * 0.55, 0, 0.03).applyAxisAngle(new THREE.Vector3(0, 0, 1), arm.rotation.z);
    linkBar.position.set(p1.x, p1.y, 0.03);
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    linkBar.rotation.z = Math.atan2(dy, dx);
    linkBar.userData.setLength(Math.max(0.03, Math.hypot(dx, dy)));
    pins[0].position.set(p1.x, p1.y, 0.045);
    pins[1].position.set(p2.x, p2.y, 0.045);
    pins[2].position.set(0, 0, 0.045);
  }

  // ── 代號標籤 ──
  const tagBeta = createTag({
    symbol: [{ t: 'β', color: COLORS.coupler }],
    plain: '連桿離一直線還差幾度',
    getValue: () => `${Math.max(0, S.beta / DEG).toFixed(1)}°`,
  });
  tagBeta.position.set(0.18, 0.1, 0.12);
  group.add(tagBeta);

  // ── 卷軸 ──
  const scroll = createScroll({
    getPages: () => {
      const b = Math.max(0.5, S.beta / DEG);
      const ratio = clampForceRatio(Math.max(0.5 * DEG, S.beta), CLAMP_DEFAULT.handleLever);
      return [
        {
          title: T('肘節夾鉗'),
          plain: T('連桿越接近一直線,夾緊力放大越多'),
          formula: T('夾緊力 ≈ 手的力 ÷ (2 × tanβ) × 槓桿比'),
          subst: [{ t: `β = ${b.toFixed(1)}°` , color: COLORS.coupler }],
          result: [{ t: isLocked(S.beta) ? '已過中心,鎖死!' : `約放大 ${ratio === Infinity ? '∞' : ratio.toFixed(0)} 倍`, color: COLORS.output }],
        },
        {
          title: T('過中心鎖死'),
          plain: T('過了一直線(中心點),橡膠的反彈力反而把它壓得更緊'),
          formula: T('過中心 → 鎖死;沒過 → 彈開'),
          subst: [{ t: S.beta < 0 ? '現在:已過中心' : '現在:還沒過中心' }],
          result: T('放手試試看!'),
        },
      ];
    },
    onStateChange: (s) => ctx.onScrollChange?.(s),
  });
  scroll.position.set(-0.28, 0, 0.26);
  group.add(scroll);
  ctx.registerScroll?.(scroll);

  // ── 藍圖 overlay ──
  const overlay = new THREE.Group();
  mech.add(overlay);
  const panel = textPlane([
    { segments: [{ t: '夾緊力 ≈ ' }, { frac: { num: [{ t: '手的力' }], den: [{ t: '2 tanβ' }] } }], size: 46 },
    { segments: [{ t: '含握把槓桿:× ' }, { frac: { num: [{ t: 'L' }, { t: '握', sub: '' }], den: [{ t: 'L' }, { t: '連', sub: '' }] } }, { t: ` = × ${CLAMP_DEFAULT.handleLever}` }], size: 42 },
    { segments: [{ t: 'β → 0 時倍率 → ∞(理論上)' }], size: 40 },
  ], 0.3, { width: 1000, baseSize: 46, pad: 40, defaultColor: '#EAF2FF' });
  panel.position.set(0.05, 0.36, 0.1);
  overlay.add(panel);
  ctx.blueprint?.markOverlay(overlay);

  function update(dt) {
    // 沒過中心放手 → 彈開
    if (!S.held && !isLocked(S.beta) && S.handle > 0) {
      S.handle = Math.max(0, S.handle - dt * 2.2);
      poseFromHandle();
    }
    tagBeta.userData.update(dt);
    scroll.userData.update(dt);
    ctx.missions?.feed('toggleClamp', { beta: S.beta, held: S.held }, dt);
  }

  poseFromHandle();
  return { group, update, setStage: () => {}, dispose: () => {}, scroll };
}
