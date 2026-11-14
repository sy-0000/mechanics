import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { WORKBENCH } from './layout.js';

// 電腦預覽的後製鏈:Render → GTAO(環境遮蔽)→ Bokeh(只在工作桌近景)→ 輕微 Bloom → Output(ACES + sRGB)。
// VR 模式完全不使用後製(直接 renderer.render),Bloom 與 SSAO 都關閉。
export function createPostFX(renderer, scene, camera) {
  const w = innerWidth, h = innerHeight;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, w, h);
  gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.0, scale: 1.0, samples: 16 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  gtao.blendIntensity = 0.9;
  composer.addPass(gtao);
  const bokeh = new BokehPass(scene, camera, { focus: 1.0, aperture: 0.006, maxblur: 0.008 });
  composer.addPass(bokeh);
  // 門檻 1.4(線性 HDR 值):只有燈具自發光與強烈高光會發亮,窗光照到的地板不會泛光
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.28, 0.45, 1.4);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const focusPt = new THREE.Vector3(...WORKBENCH.mount.center);
  let dofK = 1, from = 1, to = 1, t0 = 0, dur = 0, allowed = true;
  return {
    composer, gtao, bloom, bokeh,
    get active() { return allowed && !renderer.xr.isPresenting; },
    setAllowed(v) { allowed = v; },
    /** 景深強度(工作桌近景開、黑板視角關),可漸變。 */
    setDof(on, duration = 0) { from = dofK; to = on ? 1 : 0; t0 = performance.now() / 1000; dur = duration; if (!duration) dofK = to; },
    update(now) {
      if (dur) { const k = Math.min(1, (now - t0) / dur); dofK = from + (to - from) * k * k * (3 - 2 * k); if (k >= 1) dur = 0; }
      bokeh.enabled = dofK > 0.01;
      bokeh.uniforms.focus.value = camera.position.distanceTo(focusPt);
      bokeh.uniforms.aperture.value = 0.006 * dofK;
      bokeh.uniforms.maxblur.value = 0.008 * dofK;
    },
    setSize(W, H) { composer.setSize(W, H); gtao.setSize(W, H); bloom.setSize(W, H); },
    render() { composer.render(); },
    dispose() { composer.dispose(); gtao.dispose(); bloom.dispose(); },
  };
}
