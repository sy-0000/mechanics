// 關卡載入與卸載:只載入目前關卡的資產,其他關卡整組移除並釋放。
// 也統一管理:關卡銘牌列、徽章牆、卷軸、暫停牌、彩蛋入口。
import * as THREE from 'three';
import { LEVELS, BONUS_LEVEL } from '../net/protocol.js';
import { createPlaque, createPausePlaque } from '../assets/controls/plaque.js';
import { createClampModel } from '../assets/props/clampModel.js';

export const LEVEL_LABELS = {
  wiper: '雨刷',
  sliderCrank: '引擎',
  gearBasics: '齒輪',
  gearApps: '應用',
  toggleClamp: '夾鉗',
};

/**
 * @param {object} ctx 共用環境 {tabletop, audio, haptics, missions, state, ...}
 * 關卡模組介面:createLevel(ctx) → {group, update(dt), setStage(i), dispose(),
 *   onGrabRotate(kind, obj, dAngle), interactables()}
 */
export function createSceneManager(ctx) {
  const loaders = {
    wiper: () => import('./levels/wiper.js'),
    sliderCrank: () => import('./levels/sliderCrank.js'),
    gearBasics: () => import('./levels/gearBasics.js'),
    gearApps: () => import('./levels/gearApps.js'),
    toggleClamp: () => import('./levels/toggleClamp.js'),
  };

  const mgr = {
    current: null,
    currentId: null,
    plaques: new Map(),
    busy: false,
  };

  // 關卡銘牌列(底座前緣)
  const plaqueRow = new THREE.Group();
  plaqueRow.name = 'plaqueRow';
  LEVELS.forEach((id, i) => {
    const p = createPlaque(LEVEL_LABELS[id], { kind: 'level', id });
    p.position.set((i - (LEVELS.length - 1) / 2) * 0.095, 0.028, 0.37);
    p.rotation.x = -0.18;
    plaqueRow.add(p);
    mgr.plaques.set(id, p);
  });
  ctx.tabletop.add(plaqueRow);

  // 彩蛋入口(自由模式才出現)
  const bonusEntry = createClampModel();
  bonusEntry.position.set(0.3, 0, 0.28);
  ctx.tabletop.add(bonusEntry);

  // 暫停牌
  const pausePlaque = createPausePlaque();
  pausePlaque.position.set(0, 0, 0.42);
  ctx.tabletop.add(pausePlaque);

  async function load(id, stage = 0) {
    if (mgr.busy || (mgr.currentId === id && mgr.current)) {
      if (mgr.current && stage !== undefined) mgr.current.setStage?.(stage);
      return mgr.current;
    }
    mgr.busy = true;
    try {
      // 卸載舊關卡:從場景圖移除並釋放
      if (mgr.current) {
        ctx.tabletop.remove(mgr.current.group);
        mgr.current.dispose?.();
        disposeGroup(mgr.current.group);
        mgr.current = null;
      }
      const mod = await loaders[id]();
      const level = await mod.createLevel(ctx);
      ctx.tabletop.add(level.group);
      mgr.current = level;
      mgr.currentId = id;
      level.setStage?.(stage);
      for (const [pid, p] of mgr.plaques) p.userData.setActive(pid === id);
      ctx.onLevelChanged?.(id);
      return level;
    } finally {
      mgr.busy = false;
    }
  }

  function disposeGroup(root) {
    root.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        m.map?.dispose?.();
        m.dispose?.();
      }
    });
  }

  function update(dt) {
    mgr.current?.update?.(dt);
    pausePlaque.userData.update(dt);
  }

  return {
    load,
    update,
    get current() { return mgr.current; },
    get currentId() { return mgr.currentId; },
    setPaused(on) { pausePlaque.userData.setRaised(on); },
    setFreeMode(on) {
      bonusEntry.visible = on;
      plaqueRow.visible = true; // 銘牌恆在;跟隨模式碰了無效(由 main 判斷)
    },
    plaqueRow,
    bonusEntry,
    plaques: mgr.plaques,
  };
}
