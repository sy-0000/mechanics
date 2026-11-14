// 程序產生的暖色攝影棚環境貼圖,PMREM 預先處理一次。
// 金屬的高光會隨視角移動,呈現「奶油色日光工作坊」的暖反射。
import * as THREE from 'three';

let cached = null;

/** 建立(或取回快取的)PMREM 環境貼圖 */
export function getStudioEnvMap(renderer) {
  if (cached) return cached;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#F2E8CF');

  // 大面積柔光「天花板窗」:暖白長條
  const mk = (color, intensity, w, h, pos, lookAt = [0, 0, 0]) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    mat.color.multiplyScalar(intensity);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.lookAt(...lookAt);
    scene.add(mesh);
  };
  // 主窗光(左上斜照,淡黃)
  mk('#FFF3D6', 5.0, 6, 4, [-5, 6, 3]);
  // 側補光(奶油)
  mk('#FFEFD9', 2.2, 4, 3, [6, 3, -2]);
  // 低角度地面反彈(暖木色)
  mk('#D9BE9C', 1.2, 8, 8, [0, -5, 0]);
  // 背後一條冷一點的縫,讓金屬邊緣有對比
  mk('#DCE4E8', 1.0, 1.2, 5, [0, 2, -7]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  const rt = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  cached = rt.texture;
  return cached;
}
