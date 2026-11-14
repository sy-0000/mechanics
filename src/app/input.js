// 輸入:電腦滑鼠 + Quest 3 手把 / 手部追蹤,全部走 interact.js 的抓取契約。
// 不另外建立 XR 控制器:沿用教室選單已經放進場景的同一組 renderer.xr.getController(i)。
import * as THREE from 'three';
import { resumeAudio, sfx } from '../audio/sfx.js';

const NEAR_GRAB = 0.08, NEAR_TOUCH = 0.05, POKE = 0.022;

export function createInput({ renderer, camera, classroom, interact, haptics, enabled = () => true }) {
  const dom = renderer.domElement;
  const rc = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const tmp = new THREE.Vector3();
  const grabs = new Map();     // key('mouse' | 0 | 1) → {sess, mode:'near'|'ray', hand}
  const sources = [null, null];
  let hoverObj = null;

  // ---------------- 電腦:滑鼠 ----------------
  const mouse = { down: false, x: 0, y: 0, moved: 0, obj: null };
  function setRay(e) {
    const r = dom.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rc.setFromCamera(ndc, camera);
  }
  function onDown(e) {
    if (renderer.xr.isPresenting || classroom.menu.isOpen || e.button !== 0) return;
    resumeAudio();
    setRay(e);
    const hit = interact.pickByRay(rc.ray.origin, rc.ray.direction);
    if (!hit || !enabled(hit.obj)) return;
    e.stopImmediatePropagation(); e.preventDefault();           // 不讓教室的環繞視角吃到這次拖曳
    mouse.down = true; mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = 0; mouse.obj = hit.obj;
    const ud = hit.obj.userData;
    if (ud.grabbable) {
      const sess = interact.startGrab(hit.obj, hit.point, 'mouse');
      sess.carryDist = hit.distance;
      grabs.set('mouse', { sess, mode: 'ray', hand: 'both' });
      sfx.grab();
    } else if (ud.touchable) { ud.touchable.onTouch?.(hit.obj, { hand: 'both' }); sfx.button(); }
  }
  function onMove(e) {
    if (renderer.xr.isPresenting) return;
    const g = grabs.get('mouse');
    if (g) {
      mouse.moved += Math.abs(e.clientX - mouse.x) + Math.abs(e.clientY - mouse.y); mouse.x = e.clientX; mouse.y = e.clientY;
      setRay(e); interact.rayToPlanePoint(g.sess, rc.ray.origin, rc.ray.direction, tmp); interact.moveGrab(g.sess, tmp);
      return;
    }
    if (classroom.menu.isOpen) return;
    setRay(e);
    const hit = interact.pickByRay(rc.ray.origin, rc.ray.direction);
    const obj = hit && enabled(hit.obj) ? hit.obj : null;
    if (obj !== hoverObj) { hoverObj = obj; dom.style.cursor = obj ? (obj.userData.grabbable ? 'grab' : 'pointer') : ''; }
  }
  function onUp(e) {
    const g = grabs.get('mouse'); if (!g) return;
    setRay(e); interact.rayToPlanePoint(g.sess, rc.ray.origin, rc.ray.direction, tmp);
    interact.endGrab(g.sess, tmp);
    if (mouse.moved < 6) g.sess.g.onClick?.();                   // 沒拖動 = 點一下(例如玻璃直接插進卡槽)
    grabs.delete('mouse'); mouse.down = false;
  }
  dom.addEventListener('pointerdown', onDown, true);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  // ---------------- VR:手把與手部 ----------------
  const ctrls = [0, 1].map(i => renderer.xr.getController(i));
  const grips = [0, 1].map(i => renderer.xr.getControllerGrip(i));
  const hands = [0, 1].map(i => renderer.xr.getHand(i));
  const pokeCool = [0, 0];
  ctrls.forEach((c, i) => {
    c.addEventListener('connected', e => { sources[i] = e.data; });
    c.addEventListener('disconnected', () => { sources[i] = null; end(i); });
    c.addEventListener('selectstart', () => start(i));
    c.addEventListener('selectend', () => end(i));
    c.addEventListener('squeezestart', () => start(i));
    c.addEventListener('squeezeend', () => end(i));
  });
  const isHand = i => !!sources[i]?.hand;
  function grabPoint(i, out) {
    if (isHand(i)) {
      const j = hands[i].joints, a = j?.['thumb-tip'], b = j?.['index-finger-tip'];
      if (a && b) return out.setFromMatrixPosition(a.matrixWorld).add(tmp.setFromMatrixPosition(b.matrixWorld)).multiplyScalar(0.5);
    }
    return out.setFromMatrixPosition(grips[i].matrixWorld);
  }
  function ctrlRay(i) {
    const c = ctrls[i];
    rc.ray.origin.setFromMatrixPosition(c.matrixWorld);
    rc.ray.direction.set(0, 0, -1).transformDirection(c.matrixWorld).normalize();
    return rc.ray;
  }
  function start(i) {
    if (!renderer.xr.isPresenting || classroom.menu.isOpen || grabs.has(i)) return;
    resumeAudio();
    const p = grabPoint(i, new THREE.Vector3());
    const t = interact.nearestTouchable(p, NEAR_TOUCH);
    if (t && enabled(t)) { t.userData.touchable.onTouch?.(t, { hand: i }); sfx.button(); haptics.pulse(i, 'button'); return; }
    const g = interact.nearestGrabbable(p, NEAR_GRAB);
    if (g && enabled(g)) { grabs.set(i, { sess: interact.startGrab(g, p, `xr${i}`), mode: 'near', hand: i }); sfx.grab(); haptics.pulse(i, 'grab'); return; }
    if (isHand(i)) return;                                        // 手部:只用近距離
    const ray = ctrlRay(i), hit = interact.pickByRay(ray.origin, ray.direction);
    if (!hit || !enabled(hit.obj)) return;
    if (hit.obj.userData.grabbable) {
      const sess = interact.startGrab(hit.obj, hit.point, `xr${i}`); sess.carryDist = hit.distance;
      grabs.set(i, { sess, mode: 'ray', hand: i }); sfx.grab(); haptics.pulse(i, 'grab');
    } else { hit.obj.userData.touchable.onTouch?.(hit.obj, { hand: i }); sfx.button(); haptics.pulse(i, 'button'); }
  }
  function end(i) {
    const g = grabs.get(i); if (!g) return;
    const p = g.mode === 'near' ? grabPoint(i, new THREE.Vector3()) : interact.rayToPlanePoint(g.sess, ctrlRay(i).origin, ctrlRay(i).direction, new THREE.Vector3());
    interact.endGrab(g.sess, p);
    grabs.delete(i);
  }

  const pt = new THREE.Vector3();
  function update(now) {
    if (!renderer.xr.isPresenting) return;
    for (const [i, g] of grabs) {
      if (i === 'mouse') continue;
      if (g.mode === 'near') interact.moveGrab(g.sess, grabPoint(i, pt));
      else { const r = ctrlRay(i); interact.rayToPlanePoint(g.sess, r.origin, r.direction, pt); interact.moveGrab(g.sess, pt); }
    }
    for (const i of [0, 1]) {
      if (!sources[i]) continue;
      // 手部:食指尖直接戳按鈕
      if (isHand(i) && now > pokeCool[i] && !grabs.has(i)) {
        const tip = hands[i].joints?.['index-finger-tip'];
        if (tip) {
          const t = interact.nearestTouchable(pt.setFromMatrixPosition(tip.matrixWorld), POKE);
          if (t && enabled(t) && !t.userData.touchable.noPoke) { t.userData.touchable.onTouch?.(t, { hand: i }); sfx.button(); pokeCool[i] = now + 0.7; }
        }
      }
      // 手把射線:只在指向可互動物件時出現
      const ray = ctrls[i].getObjectByName('ray');
      if (ray && !classroom.menu.isOpen && !isHand(i)) {
        const r = ctrlRay(i), hit = grabs.has(i) ? null : interact.pickByRay(r.origin, r.direction);
        ray.visible = !!hit && enabled(hit.obj); if (ray.visible) ray.scale.z = hit.distance;
      }
    }
  }

  return {
    update,
    /** 目前抓著東西的手(震動用);沒有就回傳 'both'。 */
    activeHand() { for (const [k, g] of grabs) if (k !== 'mouse') return g.hand; return 'both'; },
    get grabbing() { return grabs.size > 0; },
    cancelAll() { for (const k of [...grabs.keys()]) { const g = grabs.get(k); g.sess.g.onRelease?.(); grabs.delete(k); } },
    dispose() {
      dom.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
    },
  };
}
