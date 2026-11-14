// 徽章:黃銅圓章掛在底座角落小木板(徽章牆)。蓋章動畫 + 鈴聲 + 輕震動。
import * as THREE from 'three';
import { bevelBox, bevelCylinder } from '../assets/geo.js';
import { lightWood } from '../materials/wood.js';
import { brass } from '../materials/metal.js';
import { addOutline } from '../materials/outline.js';
import { textPlane } from './typeset.js';
import { sfx } from '../audio/sfx.js';

/** 全部徽章定義(名稱=學會了什麼) */
export const BADGES = [
  { id: 'wiper-engineer', level: 'wiper', name: '雨刷工程師', desc: '知道雨刷是曲柄搖桿', icon: '刷' },
  { id: 'grashof-detective', level: 'wiper', name: '葛氏偵探', desc: '會判斷曲柄能不能轉整圈', icon: '葛' },
  { id: 'engine-ignite', level: 'sliderCrank', name: '引擎點火', desc: '知道搖桿換成滑塊會變引擎', icon: '引' },
  { id: 'deadpoint-hunter', level: 'sliderCrank', name: '死點獵人', desc: '找到推不動的位置', icon: '死' },
  { id: 'lock-master', level: 'toggleClamp', name: '鎖緊大師', desc: '知道過了中心點就會鎖住', icon: '鎖' },
  { id: 'strongman', level: 'gearBasics', name: '大力士', desc: '知道減速可以增加力矩', icon: '力' },
  { id: 'tradeoff', level: 'gearBasics', name: '速度與力氣', desc: '知道兩者要取捨', icon: '衡' },
  { id: 'gear-shifter', level: 'gearApps', name: '換檔高手', desc: '知道爬坡用低速檔', icon: '檔' },
  { id: 'clockmaker', level: 'gearApps', name: '鐘錶匠', desc: '會用兩級齒輪做出 12 倍減速', icon: '鐘' },
];

/**
 * 徽章牆。award(id) 蓋章;getEarned() 回傳 id 陣列;setEarned(list) 還原。
 */
export function createBadgeWall({ haptics = null, onAward = null } = {}) {
  const group = new THREE.Group();
  group.name = 'badgeWall';

  const board = new THREE.Mesh(bevelBox(0.16, 0.22, 0.012, { corner: 0.008 }), lightWood());
  board.castShadow = true;
  board.receiveShadow = true;
  addOutline(board);
  group.add(board);

  const title = textPlane([{ segments: [{ t: '徽章牆' }], align: 'center' }], 0.1,
    { width: 300, baseSize: 72, pad: 20 });
  title.position.set(0, 0.088, 0.0075);
  group.add(title);

  const earned = new Set();
  const slots = new Map();
  const badgeGeo = bevelCylinder(0.014, 0.005, { seg: 26, bevel: 0.0012 });

  BADGES.forEach((b, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = (col - 1) * 0.048;
    const y = 0.045 - row * 0.052;
    const slot = new THREE.Group();
    slot.position.set(x, y, 0.008);
    // 空位(凹圓)
    const hollow = new THREE.Mesh(bevelCylinder(0.015, 0.002, { seg: 26, bevel: 0.0005 }), lightWood());
    hollow.material = hollow.material.clone?.() ?? hollow.material;
    slot.add(hollow);
    // 徽章(初始隱藏)
    const medal = new THREE.Group();
    const coin = new THREE.Mesh(badgeGeo, brass());
    coin.castShadow = true;
    addOutline(coin, { thickness: 0.0007 });
    medal.add(coin);
    const face = textPlane([{ segments: [{ t: b.icon, color: '#5A4420' }], align: 'center' }], 0.02,
      { width: 120, baseSize: 84, pad: 12 });
    face.position.z = 0.0032;
    medal.add(face);
    medal.visible = false;
    slot.add(medal);
    group.add(slot);
    slots.set(b.id, { medal, slot, badge: b });
  });

  const anims = [];
  function award(id, { silent = false } = {}) {
    if (earned.has(id) || !slots.has(id)) return false;
    earned.add(id);
    const { medal } = slots.get(id);
    medal.visible = true;
    if (!silent) {
      // 蓋章動畫:從前方 0.1m 壓入
      medal.position.z = 0.1;
      medal.scale.setScalar(1.6);
      anims.push({ medal, t: 0 });
      sfx.stamp();
      haptics?.pulse('both', 'stamp');
      onAward?.(id);
    }
    return true;
  }

  group.userData.update = (dt) => {
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      a.t += dt * 3.5;
      const k = Math.min(1, a.t);
      const ease = 1 - (1 - k) ** 3;
      a.medal.position.z = 0.1 * (1 - ease);
      a.medal.scale.setScalar(1.6 - 0.6 * ease);
      if (k >= 1) anims.splice(i, 1);
    }
  };

  return {
    group,
    award,
    getEarned: () => [...earned],
    setEarned: (list) => { for (const id of list || []) award(id, { silent: true }); },
    has: (id) => earned.has(id),
  };
}
