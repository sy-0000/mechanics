import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { WORKBENCH } from './layout.js';

// 電腦預覽專用景深(VR 不使用任何後處理)。焦點固定在教具掛載區,背景柔和模糊。
export function createDof(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 1.0, aperture: 0.006, maxblur: 0.008 });
  composer.addPass(bokeh);
  composer.addPass(new OutputPass());
  const focusPt = new THREE.Vector3(...WORKBENCH.mount.center);
  let strength = 1, from = 1, to = 1, t0 = 0, dur = 0, allowed = true;
  const size = new THREE.Vector2();
  return {
    composer,
    get active() { return allowed && strength > 0.001 && !renderer.xr.isPresenting; },
    setAllowed(v) { allowed = v; },
    setEnabled(on, duration = 0) { from = strength; to = on ? 1 : 0; t0 = performance.now() / 1000; dur = duration; if (!duration) strength = to; },
    update(now) {
      if (dur) { const k = Math.min(1, (now - t0) / dur); strength = from + (to - from) * k * k * (3 - 2 * k); if (k >= 1) dur = 0; }
      bokeh.uniforms.focus.value = camera.position.distanceTo(focusPt);
      bokeh.uniforms.aperture.value = 0.006 * strength;
      bokeh.uniforms.maxblur.value = 0.008 * strength;
    },
    setSize(w, h) { composer.setSize(w, h); },
    render() { renderer.getSize(size); composer.render(); },
    dispose() { composer.dispose(); },
  };
}
