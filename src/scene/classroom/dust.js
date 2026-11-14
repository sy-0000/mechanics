import * as THREE from 'three';
import { WINDOWS } from './layout.js';
import { SUN_DIR } from './lights.js';
import { rng } from '../../materials/canvasTex.js';

// 光束中緩慢漂浮的微塵(InstancedMesh)。
export function createDust(scene, count = 260) {
  const geo = new THREE.IcosahedronGeometry(0.0022, 0);
  const mat = new THREE.MeshBasicMaterial({ color: '#FFF4D6', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.userData.dynamic = true; mesh.frustumCulled = false;
  const r = rng(42), seeds = [];
  for (let i = 0; i < count; i++) {
    const zc = WINDOWS.centersZ[i % 3];
    const t = r() * 3.0;
    const base = new THREE.Vector3(WINDOWS.x + 0.1, WINDOWS.sill + r() * WINDOWS.h, zc + (r() - 0.5) * WINDOWS.w)
      .addScaledVector(SUN_DIR, -t);
    if (base.y < 0.3) base.y = 0.3 + r() * 1.5;
    seeds.push({ base, ph: r() * 100, sp: 0.02 + r() * 0.05 });
  }
  const m4 = new THREE.Matrix4(), p = new THREE.Vector3();
  function update(t) {
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      p.copy(s.base);
      p.x += Math.sin(t * s.sp + s.ph) * 0.12;
      p.y += Math.sin(t * s.sp * 0.7 + s.ph * 2) * 0.08 + ((t * 0.004 + s.ph) % 0.3) - 0.15;
      p.z += Math.cos(t * s.sp * 0.8 + s.ph) * 0.1;
      mesh.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  scene.add(mesh);
  return {
    mesh, update,
    setCount(n) { mesh.count = Math.min(count, n); },
    dispose() { geo.dispose(); mat.dispose(); scene.remove(mesh); },
  };
}
