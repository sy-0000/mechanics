import * as THREE from 'three';
import { BOARD, FANS, WORKBENCH, VIEWPOINTS, STOOLS } from './layout.js';
import { createRoom } from './room.js';
import { createLights } from './lights.js';
import { createDust } from './dust.js';
import { createFog } from './fog.js';
import { createWindows } from './windows.js';
import { createOutdoor } from './outdoor.js';
import { createBlackboard } from './blackboard.js';
import { createTeacherDesk } from './teacherDesk.js';
import { createWallClock } from './wallClock.js';
import { createWorkbench } from './workbench.js';
import { createBenchClutter } from './benchClutter.js';
import { createOtherBenches } from './otherBenches.js';
import { createStools } from './stool.js';
import { createBenchVise } from './benchVise.js';
import { createToggleClamp, createCans } from './toggleClampProp.js';
import { createPegboard } from './pegboard.js';
import { createApronRack } from './apronRack.js';
import { createDrillPress } from './drillPress.js';
import { createBandSaw } from './bandSaw.js';
import { createLumberRack } from './lumberRack.js';
import { createTrashBin } from './trashBin.js';
import { createDisplayCabinet } from './displayCabinet.js';
import { createCeiling } from './ceiling.js';
import { createCeilingFan } from './ceilingFan.js';
import { createViews } from './views.js';
import { createDof } from './dof.js';
import { createMenu } from './menu.js';
import { createDebugStats } from './debugStats.js';
import { batchStatic, outlineRemaining } from './util/staticBatcher.js';
import { group } from './util/geo.js';

const DEFAULT_LEFT = {
  title: '結構・機構・機器',
  lines: [
    { text: '結構:由構件組成,構件之間不能相對運動,用來支撐與承受力', chalk: 'white' },
    { text: '機構:由構件和接頭組成,構件之間有確定的相對運動,用來傳遞運動與力', chalk: 'white' },
    { text: '機器:機構加上動力源與控制,能轉換能量、做有用的工作', chalk: 'white' },
  ],
};

/**
 * 建立生科教室場景。
 * @param {{renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, options?: object}} p
 * options: quality ('high'|'vr'), fans (bool), dust (bool), debug (bool), leftZone (content), onSelectTeachingAid(id)
 */
export function createClassroom({ renderer, scene, camera, options = {} }) {
  const opts = { quality: 'high', fans: true, dust: true, debug: false, ...options };
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  renderer.xr.setFoveation?.(1);
  if (!camera.parent) scene.add(camera);

  const root = group(scene, 'classroom');
  const fog = createFog(scene);
  const lights = createLights(scene, opts.quality);

  // ---- 建模 ----
  createRoom(root); createWindows(root); createOutdoor(root); createCeiling(root);
  const board = createBlackboard(root);
  createTeacherDesk(root); createWallClock(root);
  createWorkbench(root); createBenchClutter(root); createOtherBenches(root); createStools(root, STOOLS);
  const [bx, by, bz] = WORKBENCH.center;
  createBenchVise(root, [bx - WORKBENCH.top.w / 2, by, bz]);
  const toggleClamp = createToggleClamp(root, [0.72, by, -0.93]);
  const cans = createCans(root, [[0.66, by, -0.66], [0.585, by, -0.745], [0.7, by, -0.77]]);
  createPegboard(root); createApronRack(root); createDrillPress(root); createBandSaw(root);
  createLumberRack(root); createTrashBin(root); createDisplayCabinet(root);
  const fans = FANS.map(p => createCeilingFan(root, p));

  // ---- 掛載點 ----
  const teachingAid = new THREE.Object3D(); teachingAid.name = 'anchor:teachingAid';
  teachingAid.position.set(...WORKBENCH.mount.center);
  teachingAid.rotation.y = 0; // 本地 +Z 朝向學生(原點方向)
  teachingAid.userData = { size: WORKBENCH.mount.size, dynamic: true };
  root.add(teachingAid);
  const viewpoint = name => {
    const o = new THREE.Object3D(); o.name = `anchor:${name}Viewpoint`;
    o.position.set(...VIEWPOINTS[name].position); o.rotation.y = VIEWPOINTS[name].yaw; o.userData.dynamic = true;
    root.add(o); return o;
  };
  const anchors = {
    teachingAid, toggleEgg: toggleClamp, cans,
    boardSurface: { object: board.surface, width: board.size.w, height: board.size.h },
    benchViewpoint: viewpoint('bench'), boardViewpoint: viewpoint('board'),
  };

  // ---- 合併:先把動畫/掛載群組各自內部合併,再合併整間教室的靜態幾何 ----
  [toggleClamp, ...cans, ...fans.map(f => f.rotor)].forEach(gr => batchStatic(gr, { includeDynamic: true }));
  const batchInfo = batchStatic(root);
  outlineRemaining(root);
  scene.traverse(o => {
    if (o.isMesh && o.material?.vertexColors && !o.geometry.attributes.color) {
      o.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(o.geometry.attributes.position.count * 3).fill(1), 3));
    }
  });

  const dust = opts.dust ? createDust(scene) : null;
  const dof = createDof(renderer, scene, camera);
  const views = createViews({ renderer, camera, domElement: renderer.domElement, fog, dof });
  const menu = createMenu({ renderer, scene, camera, domElement: renderer.domElement });
  const stats = opts.debug ? createDebugStats(renderer) : null;
  menu.onSelect(sel => {
    if (sel.type === 'view') views.goTo(sel.view);
    else opts.onSelectTeachingAid?.(sel.id);
  });

  // ---- 黑板 API ----
  const zones = board.zones;
  const now = () => performance.now() / 1000;
  let pendingValues = null, lastValueApply = 0;
  const boardApi = {
    zones: Object.keys(zones),
    setZone(name, content) { if (!zones[name]) throw new Error(`unknown zone ${name}`); return zones[name].set(content, now()); },
    clearZones(list = ['center', 'right']) { return Promise.all(list.map(n => zones[n]?.clear(now()))); },
    /** 只更新即時數值,每秒最多套用一次,不重播擦寫動畫。 */
    updateValues(values) { pendingValues = { ...(pendingValues ?? {}), ...values }; },
    /** 便利函式:進階數學開關(開啟時寫右區,關閉時擦掉)。 */
    setAdvanced(on, content) { return on ? boardApi.setZone('right', content) : boardApi.clearZones(['right']); },
  };
  boardApi.setZone('left', opts.leftZone ?? DEFAULT_LEFT);

  // ---- 每幀更新 ----
  let quality = opts.quality, fansOn = opts.fans;
  function setQuality(q) {
    quality = q;
    lights.setQuality(q);
    dof.setAllowed(q === 'high');
    renderer.setPixelRatio(q === 'vr' ? 1 : Math.min(window.devicePixelRatio, 2));
    dust?.setCount(q === 'vr' ? 140 : 260);
    if (renderer.xr.setFramebufferScaleFactor && !renderer.xr.isPresenting) renderer.xr.setFramebufferScaleFactor(q === 'vr' ? 1.0 : 1.2);
  }
  setQuality(quality);
  renderer.xr.addEventListener('sessionstart', () => setQuality('vr'));

  const clock = new THREE.Clock();
  function update() {
    const t = now(), dt = Math.min(clock.getDelta(), 0.1);
    views.update(t); fog.update(t); dof.update(t); menu.update(t); lights.update(t); dust?.update(t);
    if (fansOn) fans.forEach(f => (f.rotor.rotation.y += dt * 1.6));
    for (const z of Object.values(zones)) z.update(t);
    if (pendingValues && t - lastValueApply >= 1) {
      for (const z of Object.values(zones)) z.setValues(pendingValues);
      pendingValues = null; lastValueApply = t;
    }
  }
  renderer.info.autoReset = false;
  function render() {
    renderer.info.reset();
    if (dof.active && views.current === 'bench' || dof.active && views.moving) dof.render();
    else renderer.render(scene, camera);
    stats?.tick();
  }
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h); dof.setSize(w, h);
  }

  return {
    anchors, board: boardApi, views: { goTo: views.goTo, onChange: views.onChange, get current() { return views.current; } }, menu: {
      setItems: menu.setItems, open: menu.open, close: menu.close, toggle: menu.toggle,
      onSelect(cb) { return menu.onSelect(sel => { if (sel.type === 'teachingAid') cb(sel.id, sel.item); }); },
    },
    setQuality, get quality() { return quality; },
    setFans(on) { fansOn = on; },
    update, render, onResize,
    /** 便利:啟動動畫迴圈(WebXR 相容)。 */
    start() { renderer.setAnimationLoop(() => { update(); render(); }); window.addEventListener('resize', onResize); onResize(); },
    stats, batchInfo,
    /** 除錯:把電腦鏡頭放到任意位置(解除視角限制)。 */
    debugSetCamera(eye, target) { views.free(eye, target); },
    dispose() {
      renderer.setAnimationLoop(null); window.removeEventListener('resize', onResize);
      views.dispose(); menu.dispose(); dof.dispose(); dust?.dispose(); lights.dispose(); stats?.dispose();
      scene.remove(root); scene.remove(lights.root);
      root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      for (const z of Object.values(zones)) z.texture.dispose();
      scene.fog = null;
    },
  };
}
