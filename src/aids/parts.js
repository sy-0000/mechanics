// 教具共用的實體控制物件:旋鈕、按鈕、撥桿。都是場景內可抓 / 可碰的物件(不是網頁介面)。
// 為了省 draw call:旋鈕底座與刻度牌併進教具的靜態剛體(staticBody),只有會轉的旋鈕帽是獨立 Mesh。
import * as THREE from 'three';
import { getKit, geo, N, CHALK, FONT, drawMarkupText } from './kit.js';
import { sfx } from '../audio/sfx.js';

/**
 * 旋鈕:每格 30°,轉一格 = step。轉到範圍外或 canSet(v) 為 false 時卡住不動並發出提示音。
 * o: label(名稱)、symbol(代號,例 'd')、chalk(粉筆色)、color(旋鈕帽顏色)、value、min、max、step、unit、
 *    onChange(v)、canSet(v)、ctx(教具 ctx,用來震動)
 * staticBody:底座與刻度牌要併進去的 BodyBuilder;pos:旋鈕在教具座標的位置(桌面上)。
 */
export function createKnob(o, staticBody, pos) {
  const kit = getKit();
  const { min, max, step = 1, unit = 'cm' } = o;
  let value = o.value, accum = 0;
  const [x, y, z] = pos;
  // 底座(中性灰鋼)+ 刻度牌(深色牌、粉筆字)
  staticBody.add(geo.cylY(0.026, 0.008, 32), { color: N.steelDark, sw: 'steel', pos: [x, y + 0.004, z] });
  const cell = kit.label(176, 64, { metal: 0.4, rough: 0.4 });
  const draw = (flash = false) => cell.draw((g, w, h) => {
    g.fillStyle = flash ? '#5A4F48' : '#34312E'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#8C7A5C'; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
    g.fillStyle = CHALK[o.chalk] ?? CHALK.white; g.textBaseline = 'middle';
    g.font = `26px ${FONT}`; g.textAlign = 'left'; g.fillText(o.label, 10, h / 2 + 1);
    drawMarkupText(g, o.symbol, 92, h / 2 + 1, 26);
    g.font = `28px ${FONT}`; g.textAlign = 'right'; g.fillText(`${value}`, w - 34, h / 2 + 1);
    g.font = `18px ${FONT}`; g.fillText(unit, w - 8, h / 2 + 4);
  });
  draw();
  const pw = 0.072, ph = pw * 64 / 176;
  staticBody.add(new THREE.PlaneGeometry(pw, ph), { rect: cell.rect, keep: 1, pos: [x, y + 0.006, z + 0.045], rot: [-Math.PI / 2 + 0.5, 0, 0] });
  staticBody.add(geo.box(pw + 0.006, 0.004, ph + 0.006, 0.001), { color: N.steelDark, sw: 'steel', pos: [x, y + 0.003, z + 0.045 - 0.0025], rot: [0.5, 0, 0] });

  // 會轉的旋鈕帽(滾花用 24 邊柱 + 指標)
  const b = kit.body(`knob-${o.symbol}`);
  b.add(geo.cylY(0.019, 0.022, 24, 0.017), { color: o.color, sw: 'paint', pos: [0, 0.011, 0] });
  b.add(geo.cylY(0.0204, 0.012, 24), { color: N.black, sw: 'rubber', pos: [0, 0.009, 0], scale: [1, 1, 1] });
  b.add(geo.box(0.004, 0.003, 0.014, 0.001), { color: N.cream, sw: 'plain', pos: [0, 0.0225, -0.007] });
  const cap = b.build();
  const group = new THREE.Group(); group.position.set(x, y + 0.008, z); group.add(cap);
  // 互動:繞旋鈕自己的 +Y 軸轉;interact 的 rotary 以 pivot 的 XY 平面計角,所以放一個轉了 −90° 的 pivot
  const pivot = new THREE.Object3D(); pivot.rotation.x = -Math.PI / 2; group.add(pivot);
  const setAngle = () => { cap.rotation.y = -((value - min) / step) * (Math.PI / 6) - accum; };
  let shakeT = 0;
  function limited() {
    sfx.limit(); o.ctx?.feel('limit'); shakeT = 0.25; draw(true); setTimeout(() => draw(false), 220);
  }
  cap.userData.grabbable = {
    type: 'rotary', pivot,
    onRotate: d => {
      accum -= d;                                   // 順時針(由上往下看)= 變大
      const det = Math.PI / 6;
      while (Math.abs(accum) >= det) {
        const dir = Math.sign(accum), nv = value + dir * step;
        if (nv < min || nv > max || (o.canSet && !o.canSet(nv))) { accum = 0; limited(); break; }
        accum -= dir * det; value = nv; draw(); sfx.detent(); o.ctx?.feel('detent'); o.onChange?.(value);
      }
      setAngle();
    },
    onRelease: () => { accum = 0; setAngle(); },
  };
  cap.userData.grabPoint = new THREE.Vector3(0, 0.012, 0);
  setAngle();
  return {
    group, cap,
    get value() { return value; },
    set(v) { value = v; accum = 0; setAngle(); draw(); },
    update(dt) { if (shakeT > 0) { shakeT -= dt; cap.position.x = Math.sin(shakeT * 90) * 0.0012 * (shakeT / 0.25); } },
  };
}

/** 圓形按鈕(碰一下觸發)。按下時帽子下沉。 */
export function createButton({ color, onPress, radius = 0.016, ctx }) {
  const kit = getKit();
  const g = new THREE.Group();
  const base = kit.body('buttonBase');
  base.add(geo.cylY(radius * 1.45, 0.01, 28), { color: N.black, sw: 'rubber', pos: [0, 0.005, 0] });
  const cap = kit.body('buttonCap');
  cap.add(geo.cylY(radius, 0.012, 28, radius * 0.92), { color, sw: 'plain', pos: [0, 0.006, 0] });
  const baseMesh = base.build(), capMesh = cap.build();
  capMesh.position.y = 0.008;
  g.add(baseMesh, capMesh);
  let t = 0;
  capMesh.userData.touchable = { onTouch: (obj, info) => { t = 0.18; ctx?.feel('button'); onPress?.(info); } };
  return { group: g, cap: capMesh, update(dt) { if (t > 0) t -= dt; capMesh.position.y = 0.008 - (t > 0 ? 0.004 : 0); } };
}
