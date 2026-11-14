// 共用互動管理:電腦滑鼠與 VR(手把/手勢)都走同一套「抓取契約」。
// 物件契約(由資產/關卡設定):
//   obj.userData.grabbable = {
//     type: 'rotary' | 'slide' | 'carry',
//     pivot?: Object3D   // rotary:繞 pivot 的局部 +Z 軸;slide:沿 pivot 局部 +X
//     onRotate?(dAngle)  // 角度增量(弧度),避免跳動
//     onSlide?(localX)   // 滑到的局部 X
//     onMove?(worldPos)  // carry 移動
//     onGrab?() / onRelease?()
//   }
//   obj.userData.touchable = { onTouch() }  // 按鈕、銘牌、卷軸、代號牌
import * as THREE from 'three';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _plane = new THREE.Plane();
const _ray = new THREE.Ray();

export function createInteractionManager() {
  let roots = [];
  let grabbables = [];
  let touchables = [];

  /** 重新收集可互動物件。newRoots:單一 Object3D 或陣列(教具根節點 + 教室的彩蛋入口)。 */
  function refresh(newRoots) {
    if (newRoots) roots = (Array.isArray(newRoots) ? newRoots : [newRoots]).filter(Boolean);
    grabbables = [];
    touchables = [];
    for (const root of roots) root.traverse((o) => {
      if (o.userData.grabbable) grabbables.push(o);
      if (o.userData.touchable) touchables.push(o);
    });
  }

  /** 找 pivot(往上找最近的祖先:grabbable.pivot 或自己的父) */
  function pivotOf(obj) {
    return obj.userData.grabbable.pivot || obj.parent;
  }

  /** 世界點 → pivot 局部 XY 平面上的角度 */
  function angleAt(obj, worldPos) {
    const pivot = pivotOf(obj);
    _m.copy(pivot.matrixWorld).invert();
    _v.copy(worldPos).applyMatrix4(_m);
    return Math.atan2(_v.y, _v.x);
  }
  function slideXAt(obj, worldPos) {
    const pivot = pivotOf(obj);
    _m.copy(pivot.matrixWorld).invert();
    _v.copy(worldPos).applyMatrix4(_m);
    return _v.x;
  }

  // ── 抓取 session ──
  function startGrab(obj, worldPos, source) {
    const g = obj.userData.grabbable;
    const sess = { obj, g, source, type: g.type || 'rotary' };
    if (sess.type === 'rotary') {
      sess.lastAngle = angleAt(obj, worldPos);
      // 拖曳平面:pivot 的 XY 平面(世界座標)
      const pivot = pivotOf(obj);
      const n = new THREE.Vector3(0, 0, 1).transformDirection(pivot.matrixWorld).normalize();
      const p = new THREE.Vector3().setFromMatrixPosition(pivot.matrixWorld);
      sess.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p);
    } else if (sess.type === 'slide') {
      sess.lastX = slideXAt(obj, worldPos);
      const pivot = pivotOf(obj);
      const n = new THREE.Vector3(0, 0, 1).transformDirection(pivot.matrixWorld).normalize();
      const p = new THREE.Vector3().setFromMatrixPosition(pivot.matrixWorld);
      sess.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p);
    } else {
      // carry:記錄抓取偏移
      sess.offset = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld).sub(worldPos);
    }
    g.onGrab?.();
    return sess;
  }

  function moveGrab(sess, worldPos) {
    const { g } = sess;
    if (sess.type === 'rotary') {
      const a = angleAt(sess.obj, worldPos);
      let d = a - sess.lastAngle;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      sess.lastAngle = a;
      if (d !== 0) g.onRotate?.(d);
    } else if (sess.type === 'slide') {
      const x = slideXAt(sess.obj, worldPos);
      g.onSlide?.(x, x - sess.lastX);
      sess.lastX = x;
    } else {
      _v.copy(worldPos).add(sess.offset);
      g.onMove?.(_v);
    }
  }

  function endGrab(sess, worldPos) {
    sess.g.onRelease?.(worldPos);
  }

  // ── 近距抓取(VR):找最近可抓物 ──
  function nearestGrabbable(worldPos, maxDist = 0.07) {
    let best = null, bestD = maxDist;
    for (const o of grabbables) {
      if (!o.visible || !isShown(o)) continue;
      const d = distTo(o, worldPos);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  }
  /** 到物件的距離:有 grabPoint 用它,否則用包圍球表面(大零件也能從邊緣抓)。 */
  function distTo(o, worldPos) {
    const gp = o.userData.grabPoint;
    if (gp) return _v2.copy(gp).applyMatrix4(o.matrixWorld).distanceTo(worldPos);
    if (o.geometry) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const bs = o.geometry.boundingSphere;
      _v2.copy(bs.center).applyMatrix4(o.matrixWorld);
      const r = bs.radius * o.matrixWorld.getMaxScaleOnAxis();
      return Math.max(0, _v2.distanceTo(worldPos) - r * 0.6);
    }
    return _v2.setFromMatrixPosition(o.matrixWorld).distanceTo(worldPos);
  }
  function nearestTouchable(worldPos, maxDist = 0.05) {
    let best = null, bestD = maxDist;
    for (const o of touchables) {
      if (!o.visible || !isShown(o)) continue;
      const d = distTo(o, worldPos);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  }
  function isShown(o) {
    for (let p = o; p; p = p.parent) if (p.visible === false) return false;
    return true;
  }

  // ── 射線選取(手把遠點、滑鼠)──
  const raycaster = new THREE.Raycaster();
  function pickByRay(origin, dir, { touchOnly = false } = {}) {
    raycaster.set(origin, dir);
    raycaster.far = 3;
    const pool = touchOnly ? touchables : [...touchables, ...grabbables];
    const hits = raycaster.intersectObjects(pool.filter(isShown), true);
    hits.sort((a, b) => (a.object.userData.pickPriority ?? 0) - (b.object.userData.pickPriority ?? 0) || a.distance - b.distance);
    for (const h of hits) {
      // 命中物可能是子 mesh:往上找登記的物件
      for (let p = h.object; p; p = p.parent) {
        if (pool.includes(p)) return { obj: p, point: h.point, distance: h.distance };
      }
    }
    return null;
  }

  /** 滑鼠/射線拖曳時:把射線投影到 session 平面取得世界點 */
  function rayToPlanePoint(sess, origin, dir, out) {
    _ray.set(origin, dir);
    if (sess.plane && _ray.intersectPlane(sess.plane, out)) return out;
    // carry:維持距離
    out.copy(origin).addScaledVector(dir, sess.carryDist ?? 0.5);
    return out;
  }

  return {
    refresh,
    startGrab, moveGrab, endGrab,
    nearestGrabbable, nearestTouchable,
    pickByRay, rayToPlanePoint,
    get touchables() { return touchables; },
    get grabbables() { return grabbables; },
  };
}
