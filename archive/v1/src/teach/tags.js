// 代號標籤:小銅牌(θ、φ、μ、z、r …)。碰一下翻面顯示白話+即時數值,
// 同時對應的角度弧/線段亮起;再碰一下翻回。
import * as THREE from 'three';
import { bevelBox } from '../assets/geo.js';
import { bronze } from '../materials/metal.js';
import { addOutline } from '../materials/outline.js';
import { textPlane } from './typeset.js';
import { sfx } from '../audio/sfx.js';

/**
 * @param {object} p
 *  symbol: segments(正面代號,如 [{t:'θ',sub:'2',color:'#C08054'}])
 *  plain: 白話文字
 *  getValue: () => '38°' 即時數值
 *  onFlip: (flipped) => void 亮起/熄滅對應標註
 */
export function createTag({ symbol, plain, getValue, onFlip = null, width = 0.045 } = {}) {
  const group = new THREE.Group();
  group.name = 'tag';

  const plate = new THREE.Mesh(bevelBox(width, width * 0.6, 0.004, { corner: 0.004 }), bronze());
  plate.castShadow = true;
  addOutline(plate, { thickness: 0.0008 });
  group.add(plate);

  const front = textPlane([{ segments: symbol, align: 'center' }], width * 0.9,
    { width: 320, baseSize: 150, pad: 30, defaultColor: '#2E2318' });
  front.position.z = 0.0028;
  group.add(front);

  const back = textPlane(
    [
      { segments: [{ t: plain }], align: 'center', size: 44 },
      { segments: [{ t: getValue?.() ?? '' , color: '#7A5A3A' }], align: 'center', size: 60 },
    ],
    width * 1.6, { width: 640, baseSize: 52, pad: 24, bg: '#F2E8CF' },
  );
  back.position.z = -0.0028;
  back.rotation.y = Math.PI;
  back.visible = false;
  group.add(back);

  const state = { flipped: false, anim: 0 };
  plate.userData.touchable = {
    kind: 'tag',
    onTouch: () => {
      state.flipped = !state.flipped;
      sfx.button();
      onFlip?.(state.flipped);
      if (state.flipped) refresh();
    },
  };

  function refresh() {
    back.userData.redraw([
      { segments: [{ t: plain }], align: 'center', size: 44 },
      { segments: [{ t: getValue?.() ?? '', color: '#7A5A3A' }], align: 'center', size: 60 },
    ]);
  }

  group.userData.update = (dt) => {
    const target = state.flipped ? Math.PI : 0;
    const d = target - state.anim;
    if (Math.abs(d) > 0.001) {
      state.anim += d * Math.min(1, dt * 10);
      group.rotation.y = state.anim;
      back.visible = state.anim > Math.PI / 2;
      front.visible = state.anim <= Math.PI / 2;
    }
    if (state.flipped && Math.random() < dt * 4) refresh(); // 即時數值(約每 0.25s)
  };
  group.userData.isFlipped = () => state.flipped;
  return group;
}

/** 亮起用:高亮弧/線的共用材質 */
export function highlightMaterial(color = '#E2A14E') {
  return new THREE.LineBasicMaterial({ color, linewidth: 2 });
}
