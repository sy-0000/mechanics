// WebXR:工作階段、手把、手勢、重新定位、手腕按鈕。
// 鏡頭由頭盔決定,程式不移動鏡頭;重新定位是移動 baseGroup。
import * as THREE from 'three';
import { bevelCylinder } from '../assets/geo.js';
import { dullMetal } from '../materials/metal.js';
import { toonMaterial, COLORS } from '../materials/toon.js';
import { TABLE_HEIGHT } from './layout.js';
import { createWristButtons } from '../assets/controls/wristButtons.js';

const PINCH_ON = 0.018, PINCH_OFF = 0.027;

/**
 * @param {object} p {renderer, scene, baseGroup, interact, haptics,
 *                    onPlayPause, onBlueprint}
 */
export function setupXR({ renderer, scene, baseGroup, interact, haptics, onPlayPause, onBlueprint }) {
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');

  const xrState = {
    inXR: false,
    recentered: false,
    grabs: new Map(),  // inputSourceKey → session
    gripHold: [0, 0],  // 兩手握住計時(重新定位)
    pinch: [false, false],
  };

  // ── 手把模型 + 短射線 ──
  const controllers = [];
  for (let i = 0; i < 2; i++) {
    const ctrl = renderer.xr.getController(i);
    const grip = renderer.xr.getControllerGrip(i);
    // 簡單手把模型
    const body = new THREE.Mesh(bevelCylinder(0.014, 0.09, { seg: 16 }), dullMetal('#B9B3A6'));
    body.rotation.x = Math.PI / 4;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 8, 20), toonMaterial(COLORS.cream));
    ring.position.z = -0.03;
    grip.add(body, ring);
    // 射線(只在指向可點選物件時出現)
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1),
    ]);
    const ray = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color: '#C08054' }));
    ray.scale.z = 0.5;
    ray.visible = false;
    ctrl.add(ray);
    scene.add(ctrl, grip);
    controllers.push({ ctrl, grip, ray, index: i, hand: null, squeezing: false });

    ctrl.addEventListener('selectstart', () => onSelectStart(i));
    ctrl.addEventListener('selectend', () => onSelectEnd(i));
    ctrl.addEventListener('squeezestart', () => { controllers[i].squeezing = true; onSelectStart(i); });
    ctrl.addEventListener('squeezeend', () => { controllers[i].squeezing = false; onSelectEnd(i); });
  }

  // ── 手(hand-tracking,選用)──
  const hands = [];
  for (let i = 0; i < 2; i++) {
    const hand = renderer.xr.getHand(i);
    scene.add(hand);
    // 關節球(InstancedMesh,低飽和)
    const jointMat = toonMaterial('#D9CBB2');
    const tipMat = toonMaterial('#C08054');
    const joints = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0062, 10, 8), jointMat, 25);
    joints.frustumCulled = false;
    hand.add(joints);
    hands.push({ hand, joints, jointMat, tipMat, pinching: false, index: i });
  }

  // ── 手腕按鈕(左手腕)──
  const wrist = createWristButtons({ onPlayPause, onBlueprint });
  wrist.group.scale.setScalar(1);
  scene.add(wrist.group);

  const _v = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _dir = new THREE.Vector3();
  const _camPos = new THREE.Vector3();

  function grabPoint(i) {
    const h = hands[i];
    const joint = h.hand.joints?.['index-finger-tip'];
    if (joint && renderer.xr.isPresenting && joint.visible !== false && h.tracked) {
      return _v.setFromMatrixPosition(joint.matrixWorld);
    }
    return _v.setFromMatrixPosition(controllers[i].grip.matrixWorld);
  }

  function onSelectStart(i) {
    const p = grabPoint(i).clone();
    // 先試碰 touchable
    const t = interact.nearestTouchable(p, 0.05);
    if (t) {
      t.userData.touchable.onTouch?.(t);
      haptics?.pulse(i, 'button');
      return;
    }
    // 近距抓取
    const g = interact.nearestGrabbable(p, 0.08);
    if (g) {
      xrState.grabs.set(i, interact.startGrab(g, p, `xr${i}`));
      haptics?.pulse(i, 'grab');
      return;
    }
    // 遠處:射線點選(只 touchable)
    const { origin, dir } = ctrlRay(i);
    const hit = interact.pickByRay(origin, dir, { touchOnly: true });
    if (hit) {
      hit.obj.userData.touchable.onTouch?.(hit.obj);
      haptics?.pulse(i, 'button');
    }
  }
  function onSelectEnd(i) {
    const sess = xrState.grabs.get(i);
    if (sess) {
      interact.endGrab(sess, grabPoint(i));
      xrState.grabs.delete(i);
    }
  }
  function ctrlRay(i) {
    const c = controllers[i].ctrl;
    const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).transformDirection(c.matrixWorld).normalize();
    return { origin, dir };
  }

  /** 重新定位:把底座放到頭前方 0.55m、桌面比眼睛低 0.45m */
  function recenter() {
    const cam = renderer.xr.getCamera();
    cam.getWorldPosition(_camPos);
    cam.getWorldDirection(_dir);
    _dir.y = 0;
    if (_dir.lengthSq() < 1e-6) _dir.set(0, 0, -1);
    _dir.normalize();
    const eyeY = _camPos.y;
    baseGroup.position.set(
      _camPos.x + _dir.x * 0.55,
      eyeY - 0.45 - TABLE_HEIGHT, // 桌面(TABLE_HEIGHT)落在眼下 0.45
      _camPos.z + _dir.z * 0.55,
    );
    baseGroup.rotation.y = Math.atan2(-_dir.x, -_dir.z) + Math.PI;
    xrState.recentered = true;
  }

  renderer.xr.addEventListener('sessionstart', () => {
    xrState.inXR = true;
    xrState.recentered = false; // 第一幀有姿勢後再定位
  });
  renderer.xr.addEventListener('sessionend', () => {
    xrState.inXR = false;
    baseGroup.position.set(0, 0, 0);
    baseGroup.rotation.set(0, 0, 0);
  });

  /** 進入 VR(由起始頁按鈕呼叫) */
  async function enterVR() {
    const session = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hand-tracking'],
    });
    await renderer.xr.setSession(session);
    return session;
  }

  const m4 = new THREE.Matrix4();
  /** 每幀更新(XR 中) */
  function update(dt) {
    if (!renderer.xr.isPresenting) return;
    if (!xrState.recentered) recenter();

    // 手關節球與捏合
    for (const h of hands) {
      const joints = h.hand.joints;
      h.tracked = false;
      if (joints) {
        let j = 0;
        for (const name in joints) {
          const joint = joints[name];
          if (joint?.matrixWorld) {
            m4.copy(joint.matrixWorld);
            h.joints.setMatrixAt(j++, m4);
            h.tracked = true;
          }
        }
        h.joints.count = j;
        h.joints.instanceMatrix.needsUpdate = true;
        h.joints.visible = h.tracked;
        // 捏合偵測
        const tt = joints['thumb-tip'], it = joints['index-finger-tip'];
        if (tt && it && h.tracked) {
          const d = _v.setFromMatrixPosition(tt.matrixWorld)
            .distanceTo(_v2tmp.setFromMatrixPosition(it.matrixWorld));
          if (!h.pinching && d < PINCH_ON) {
            h.pinching = true;
            h.joints.material = h.tipMat; // 捏合時指尖變色(整手換色,簡化)
            onSelectStart(h.index);
          } else if (h.pinching && d > PINCH_OFF) {
            h.pinching = false;
            h.joints.material = h.jointMat;
            onSelectEnd(h.index);
          }
        }
      } else {
        h.joints.visible = false;
      }
    }

    // 抓取移動
    for (const [i, sess] of xrState.grabs) {
      interact.moveGrab(sess, grabPoint(i));
    }

    // 射線顯示:只在指向可點選物件時出現
    for (const c of controllers) {
      const { origin, dir } = ctrlRay(c.index);
      const hit = interact.pickByRay(origin, dir, { touchOnly: true });
      c.ray.visible = !!hit;
      if (hit) c.ray.scale.z = hit.distance;
    }

    // 雙手同時握住握把 2 秒 → 重新定位
    const bothSqueezing = controllers[0].squeezing && controllers[1].squeezing;
    if (bothSqueezing) {
      xrState.gripHold[0] += dt;
      if (xrState.gripHold[0] > 2) {
        recenter();
        haptics?.pulse(0, 'lock');
        haptics?.pulse(1, 'lock');
        xrState.gripHold[0] = -2; // 防止連續觸發
      }
    } else {
      xrState.gripHold[0] = 0;
    }

    // 手腕按鈕:掛在左手(grip 0)腕上,腕面朝向視線才淡入
    const leftGrip = controllers[0].grip;
    wrist.group.position.setFromMatrixPosition(leftGrip.matrixWorld);
    wrist.group.quaternion.setFromRotationMatrix(leftGrip.matrixWorld);
    wrist.group.translateY(0.03);
    wrist.group.translateZ(0.05);
    // 朝向檢查
    const cam = renderer.xr.getCamera();
    cam.getWorldPosition(_camPos);
    _dir.set(0, 1, 0).applyQuaternion(wrist.group.quaternion);
    _v.copy(_camPos).sub(wrist.group.position).normalize();
    const facing = _dir.dot(_v) > 0.45;
    wrist.update(dt, facing);
  }

  const _v2tmp = new THREE.Vector3();

  return { enterVR, recenter, update, controllers, hands, wrist, state: xrState };
}
