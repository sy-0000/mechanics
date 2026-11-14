// 只有圖示的進入 VR 按鈕(取代會顯示文字的 VRButton)。
export async function setupVRButton(renderer, btn) {
  if (!btn || !navigator.xr) return;
  const ok = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
  if (!ok) return;
  btn.style.display = 'block';
  let session = null;
  btn.onclick = async () => {
    if (session) { session.end(); return; }
    session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'hand-tracking'] });
    session.addEventListener('end', () => { session = null; btn.style.opacity = 1; });
    await renderer.xr.setSession(session);
    btn.style.opacity = 0.4;
  };
}
