// ?debug=1:顯示 FPS、draw call、三角形數(僅除錯用的 DOM 疊層)。
export function createDebugStats(renderer) {
  const el = document.createElement('div');
  Object.assign(el.style, { position: 'fixed', left: '8px', top: '8px', padding: '6px 8px', font: '12px/1.4 ui-monospace,monospace', color: '#33261D', background: 'rgba(254,253,245,0.85)', borderRadius: '6px', zIndex: 10, pointerEvents: 'none', whiteSpace: 'pre' });
  document.body.appendChild(el);
  let frames = 0, last = performance.now(), fps = 0;
  const samples = [];
  return {
    get fps() { return fps; },
    samples,
    tick() {
      frames++;
      const now = performance.now();
      if (now - last >= 500) {
        fps = (frames * 1000) / (now - last); frames = 0; last = now;
        const i = renderer.info.render;
        samples.push({ fps, calls: i.calls, tris: i.triangles });
        if (samples.length > 120) samples.shift();
        el.textContent = `FPS ${fps.toFixed(0)}\ndraw calls ${i.calls}\ntriangles ${i.triangles.toLocaleString()}\nxr ${renderer.xr.isPresenting ? 'on' : 'off'}`;
      }
    },
    dispose() { el.remove(); },
  };
}
