import * as THREE from 'three';
import { C } from '../../materials/palette.js';
import { CHALK_COLORS, loadChalkFont } from './chalkWriter.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

// 場景內的小黑板選單(不是網頁彈窗)。
// 開啟方式:電腦按 Y;Quest 左手把 Y 鍵(xr-standard:左手 buttons[5]);手勢模式左手掌心朝上時,掌上出現小按鈕,碰一下開啟。
// 項目:外部傳入的教具列表(名稱、圖示)+ 固定的「看黑板」「回到工作桌」。
const FAMILY = `"ChalkTC", "Noto Sans TC", "WenQuanYi Zen Hei", sans-serif`;
const ROW = 72, PADY = 26, CW = 512;
const Y_BUTTON = 5; // 左手 xr-standard:4 = X, 5 = Y(需實機確認)
const FIXED = [{ id: '__board', name: '看黑板', fixed: 'board' }, { id: '__bench', name: '回到工作桌', fixed: 'bench' }];

function drawIcon(g, item, x, y, s) {
  g.save(); g.translate(x, y); g.strokeStyle = CHALK_COLORS.white; g.lineWidth = 3; g.lineCap = 'round';
  if (item.icon && typeof item.icon === 'object' && 'width' in item.icon) { g.drawImage(item.icon, -s / 2, -s / 2, s, s); g.restore(); return; }
  if (typeof item.icon === 'function') { item.icon(g, s); g.restore(); return; }
  if (item.fixed === 'board') { g.strokeRect(-s / 2, -s / 3, s, s * 0.6); g.beginPath(); g.moveTo(-s / 3, s / 3); g.lineTo(s / 3, s / 3); g.stroke(); }
  else if (item.fixed === 'bench') { g.beginPath(); g.moveTo(-s / 2, -s / 6); g.lineTo(s / 2, -s / 6); g.moveTo(-s / 3, -s / 6); g.lineTo(-s / 3, s / 2); g.moveTo(s / 3, -s / 6); g.lineTo(s / 3, s / 2); g.stroke(); }
  else if (typeof item.icon === 'string' && item.icon.length <= 2) { g.fillStyle = CHALK_COLORS.white; g.font = `${s * 0.8}px ${FAMILY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(item.icon, 0, 0); }
  else { // 預設:齒輪塗鴉
    g.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? s * 0.38 : s * 0.5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke();
    g.beginPath(); g.arc(0, 0, s * 0.12, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
}

export function createMenu({ renderer, scene, camera, domElement }) {
  let items = [], open = false, hover = -1;
  const selectCbs = [];
  const canvas = document.createElement('canvas'); canvas.width = CW; canvas.height = 256;
  const g = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, fog: false, toneMapped: false });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  panel.visible = false; panel.renderOrder = 9000; panel.name = 'menuPanel';
  const iconImgs = new Map();

  const all = () => [...items, ...FIXED];
  function redraw() {
    const list = all(), H = Math.min(1024, PADY * 2 + list.length * ROW + 10);
    if (canvas.height !== H) canvas.height = H;
    // 木框小黑板
    g.fillStyle = '#AE977A'; g.beginPath(); g.roundRect(0, 0, CW, H, 22); g.fill();
    g.fillStyle = C.board; g.beginPath(); g.roundRect(12, 12, CW - 24, H - 24, 14); g.fill();
    list.forEach((it, i) => {
      const y = PADY + i * ROW;
      if (i === items.length && items.length) { g.fillStyle = 'rgba(240,238,230,0.35)'; g.fillRect(40, y - 4, CW - 80, 2); }
      if (i === hover) { g.fillStyle = 'rgba(240,238,230,0.12)'; g.beginPath(); g.roundRect(24, y + 2, CW - 48, ROW - 6, 12); g.fill(); }
      drawIcon(g, it, 70, y + ROW / 2, 40);
      g.fillStyle = CHALK_COLORS.white; g.font = `40px ${FAMILY}`; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillText(it.name ?? it.id, 112, y + ROW / 2 + 2);
    });
    tex.needsUpdate = true;
    const wM = 0.26; panel.scale.set(wM, wM * H / CW, 1);
  }
  loadChalkFont().then(redraw);

  // ---------- 擺放 ----------
  function placeDesktop() {
    if (panel.parent !== camera) camera.add(panel);
    const d = 0.6, hh = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * d, hw = hh * camera.aspect;
    const s = Math.min(1, hh * 0.9 / panel.scale.y * 1.0);
    panel.scale.multiplyScalar(Math.min(1, s));
    panel.position.set(-hw + panel.scale.x / 2 + 0.03, -hh + panel.scale.y / 2 + 0.03, -d);
    panel.quaternion.identity();
  }
  const leftGrip = renderer.xr.getControllerGrip(0), grips = [renderer.xr.getControllerGrip(0), renderer.xr.getControllerGrip(1)];
  const ctrls = [renderer.xr.getController(0), renderer.xr.getController(1)];
  const hands = [renderer.xr.getHand(0), renderer.xr.getHand(1)];
  const handFactory = new XRHandModelFactory();
  const handedness = new Map();
  [0, 1].forEach(i => {
    scene.add(ctrls[i], grips[i], hands[i]);
    hands[i].add(handFactory.createHandModel(hands[i], 'spheres'));
    // 簡易手把模型(不從 CDN 載入)
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.07, 4, 10), new THREE.MeshLambertMaterial({ color: '#D9D4C8' }));
    body.rotation.x = Math.PI / 2 - 0.5; grips[i].add(body);
    const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: '#F2EFE6', transparent: true, opacity: 0.6 }));
    ray.scale.z = 0.6; ray.visible = false; ray.name = 'ray'; ctrls[i].add(ray);
    ctrls[i].addEventListener('connected', e => { handedness.set(i, e.data); ray.visible = !e.data.hand && open; });
    ctrls[i].addEventListener('disconnected', () => handedness.delete(i));
    ctrls[i].addEventListener('select', () => { if (open) pickWithRay(ctrls[i]); });
  });
  const leftIndex = () => [0, 1].find(i => handedness.get(i)?.handedness === 'left');
  const rightIndex = () => [0, 1].find(i => handedness.get(i)?.handedness === 'right');

  // 手勢:左手掌上的小按鈕
  const palmBtn = new THREE.Mesh(new THREE.CircleGeometry(0.018, 24), new THREE.MeshBasicMaterial({ color: '#F2EFE6', transparent: true, opacity: 0.9, side: THREE.DoubleSide, fog: false }));
  palmBtn.visible = false; scene.add(palmBtn);

  function placeVR() {
    const li = leftIndex(); if (li === undefined) return;
    const src = handedness.get(li);
    const anchor = src.hand ? hands[li] : grips[li];
    if (panel.parent !== scene) scene.add(panel);
    // 出現在左手附近、略往前上方,面向頭部
    const p = new THREE.Vector3().setFromMatrixPosition(anchor.matrixWorld);
    const head = new THREE.Vector3(); renderer.xr.getCamera().getWorldPosition(head);
    const toHead = head.clone().sub(p).setY(0).normalize();
    panel.position.copy(p).addScaledVector(toHead, -0.05); panel.position.y += 0.16;
    panel.lookAt(head.x, panel.position.y, head.z);
  }

  // ---------- 選取 ----------
  const ray = new THREE.Raycaster();
  function indexFromUV(uv) {
    const yPx = (1 - uv.y) * canvas.height, i = Math.floor((yPx - PADY) / ROW);
    return i >= 0 && i < all().length ? i : -1;
  }
  function choose(i) {
    const it = all()[i]; if (!it) return;
    close();
    selectCbs.forEach(cb => cb(it.fixed ? { type: 'view', view: it.fixed, id: it.id } : { type: 'teachingAid', id: it.id, item: it }));
  }
  function pickWithRay(obj) {
    const m = new THREE.Matrix4().extractRotation(obj.matrixWorld);
    ray.ray.origin.setFromMatrixPosition(obj.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(m);
    const hit = ray.intersectObject(panel)[0]; if (hit) choose(indexFromUV(hit.uv));
  }
  const ptr = new THREE.Vector2();
  function pointer(e, click) {
    if (!open || renderer.xr.isPresenting) return false;
    const r = domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObject(panel)[0];
    const i = hit ? indexFromUV(hit.uv) : -1;
    if (i !== hover) { hover = i; redraw(); placeDesktop(); }
    domElement.style.cursor = i >= 0 ? 'pointer' : '';
    if (click && i >= 0) { choose(i); return true; }
    return false;
  }
  const onMove = e => pointer(e, false);
  const onDown = e => { if (pointer(e, true)) e.stopImmediatePropagation(); };
  const onKey = e => { if (e.key === 'y' || e.key === 'Y') toggle(); else if (e.key === 'Escape') close(); };
  domElement.addEventListener('pointermove', onMove);
  domElement.addEventListener('pointerdown', onDown, true);
  window.addEventListener('keydown', onKey);

  function openMenu() { open = true; hover = -1; redraw(); panel.visible = true; renderer.xr.isPresenting ? placeVR() : placeDesktop(); ctrls.forEach((c, i) => { const r = c.getObjectByName('ray'); if (r) r.visible = !handedness.get(i)?.hand; }); }
  function close() { open = false; panel.visible = false; ctrls.forEach(c => { const r = c.getObjectByName('ray'); if (r) r.visible = false; }); domElement.style.cursor = ''; }
  function toggle() { open ? close() : openMenu(); }

  let yWas = false, palmCooldown = 0, pokeCooldown = 0;
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), n = new THREE.Vector3();
  function update(now) {
    if (!renderer.xr.isPresenting) { if (panel.parent !== camera && open) placeDesktop(); palmBtn.visible = false; return; }
    if (open) placeVR();
    // 左手把 Y 鍵(邊緣觸發)
    const session = renderer.xr.getSession();
    let yNow = false;
    for (const src of session?.inputSources ?? []) if (src.handedness === 'left' && src.gamepad && src.gamepad.buttons[Y_BUTTON]?.pressed) yNow = true;
    if (yNow && !yWas) toggle();
    yWas = yNow;
    // 手勢:左手掌心朝上 → 顯示掌上按鈕;右手食指尖碰到即開啟
    const li = leftIndex(), ri = rightIndex();
    palmBtn.visible = false;
    if (li !== undefined && handedness.get(li).hand) {
      const j = hands[li].joints;
      const w = j['wrist'], im = j['index-finger-metacarpal'], pm = j['pinky-finger-metacarpal'];
      if (w && im && pm && w.visible !== false) {
        w.getWorldPosition(v1); im.getWorldPosition(v2); pm.getWorldPosition(v3);
        // 左手掌心法線:(index - wrist) × (pinky - wrist)
        n.copy(v2).sub(v1).cross(v3.clone().sub(v1)).normalize();
        if (n.y > 0.65 && !open) {
          palmBtn.visible = true;
          palmBtn.position.copy(v1).add(v2).add(v3).multiplyScalar(1 / 3).addScaledVector(n, 0.06);
          palmBtn.lookAt(palmBtn.position.clone().add(n));
          const tip = ri !== undefined ? hands[ri].joints['index-finger-tip'] : null;
          if (tip && now > palmCooldown) { tip.getWorldPosition(v1); if (v1.distanceTo(palmBtn.position) < 0.025) { openMenu(); palmCooldown = now + 1; } }
        }
      }
    }
    // 手勢點選選單:右手食指尖碰觸面板
    if (open && ri !== undefined && handedness.get(ri).hand && now > pokeCooldown) {
      const tip = hands[ri].joints['index-finger-tip'];
      if (tip) {
        tip.getWorldPosition(v1);
        const local = panel.worldToLocal(v1.clone());
        if (Math.abs(local.z) < 0.02 && Math.abs(local.x) < 0.5 && Math.abs(local.y) < 0.5) {
          choose(indexFromUV({ x: local.x + 0.5, y: local.y + 0.5 })); pokeCooldown = now + 0.6;
        }
      }
    }
  }

  redraw();
  return {
    setItems(list) { items = (list ?? []).map(it => ({ id: it.id, name: it.name, icon: it.icon })); items.forEach(it => { if (typeof it.icon === 'string' && it.icon.length > 2) { const img = new Image(); img.onload = () => { it.icon = img; redraw(); }; img.src = it.icon; } }); redraw(); if (open) openMenu(); },
    open: openMenu, close, toggle,
    get isOpen() { return open; },
    onSelect(cb) { selectCbs.push(cb); return () => selectCbs.splice(selectCbs.indexOf(cb), 1); },
    update, panel,
    dispose() {
      domElement.removeEventListener('pointermove', onMove); domElement.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey); panel.parent?.remove(panel); tex.dispose(); mat.dispose();
    },
  };
}
