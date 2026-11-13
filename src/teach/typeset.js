// 自訂 canvas 公式/文字排版器:支援分數、上下標、希臘字母、語意色。
// 上下標用一般數字縮小繪製(子集字型不含下標碼位)。
// 片段(segment)格式:
//   { t: '文字', color?, sub?: '下標', sup?: '上標' }
//   { frac: { num: [segments], den: [segments] }, color? }
import * as THREE from 'three';

export const FONT_FAMILY = '"WorkshopTC","WorkshopSym",sans-serif';
let fontsReady = null;

/** 載入子集字型(FontFace;Quest 瀏覽器無中文字型也能顯示) */
export function loadFonts() {
  if (fontsReady) return fontsReady;
  const base = import.meta.env.BASE_URL || './';
  const load = (family, file) => {
    const f = new FontFace(family, `url(${base}fonts/${file})`);
    return f.load().then((ff) => { document.fonts.add(ff); });
  };
  fontsReady = Promise.allSettled([
    load('WorkshopTC', 'noto-tc-subset.woff2'),
    load('WorkshopSym', 'noto-tc-subset-sym.woff2'),
  ]).then(() => undefined);
  return fontsReady;
}

const SUB_SCALE = 0.62;
const SUP_SCALE = 0.62;
const FRAC_SCALE = 0.78;

function setFont(ctx, size) {
  ctx.font = `${size}px ${FONT_FAMILY}`;
}

/** 量測一行片段的寬度 */
export function measureLine(ctx, segments, size) {
  let w = 0;
  for (const seg of segments) {
    w += measureSegment(ctx, seg, size);
  }
  return w;
}

function measureSegment(ctx, seg, size) {
  if (seg.frac) {
    const nw = measureLine(ctx, seg.frac.num, size * FRAC_SCALE);
    const dw = measureLine(ctx, seg.frac.den, size * FRAC_SCALE);
    return Math.max(nw, dw) + size * 0.3;
  }
  setFont(ctx, size);
  let w = ctx.measureText(seg.t ?? '').width;
  if (seg.sub) { setFont(ctx, size * SUB_SCALE); w += ctx.measureText(seg.sub).width; }
  if (seg.sup) { setFont(ctx, size * SUP_SCALE); w += ctx.measureText(seg.sup).width; }
  return w;
}

/** 繪製一行;(x, y) 為基線左端。回傳行寬。 */
export function drawLine(ctx, segments, x, y, size, defaultColor = '#3B2A1D') {
  let cx = x;
  for (const seg of segments) {
    const color = seg.color || defaultColor;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    if (seg.frac) {
      const s = size * FRAC_SCALE;
      const nw = measureLine(ctx, seg.frac.num, s);
      const dw = measureLine(ctx, seg.frac.den, s);
      const w = Math.max(nw, dw) + size * 0.3;
      // 分子、分數線、分母
      drawLine(ctx, seg.frac.num, cx + (w - nw) / 2, y - size * 0.32, s, color);
      drawLine(ctx, seg.frac.den, cx + (w - dw) / 2, y + size * 0.52, s, color);
      ctx.lineWidth = Math.max(1.5, size * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx + size * 0.08, y - size * 0.12);
      ctx.lineTo(cx + w - size * 0.08, y - size * 0.12);
      ctx.stroke();
      cx += w;
      continue;
    }
    setFont(ctx, size);
    ctx.fillText(seg.t ?? '', cx, y);
    cx += ctx.measureText(seg.t ?? '').width;
    if (seg.sub) {
      setFont(ctx, size * SUB_SCALE);
      ctx.fillText(seg.sub, cx, y + size * 0.18);
      cx += ctx.measureText(seg.sub).width;
    }
    if (seg.sup) {
      setFont(ctx, size * SUP_SCALE);
      ctx.fillText(seg.sup, cx, y - size * 0.42);
      cx += ctx.measureText(seg.sup).width;
    }
  }
  return cx - x;
}

/**
 * 做一張文字 canvas。lines = [{segments, size?, align?, gapAfter?}]。
 * 回傳 {canvas, width, height}(實際 px;呼叫者決定世界尺寸)。
 */
export function makeTextCanvas(lines, {
  width = 1024, pad = 48, baseSize = 56, lineGap = 1.7,
  bg = null, defaultColor = '#3B2A1D',
} = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  // 預量高度
  let h = pad * 2;
  for (const line of lines) {
    const s = line.size || baseSize;
    const hasFrac = line.segments.some((x) => x.frac);
    h += s * (hasFrac ? lineGap + 0.75 : lineGap) + (line.gapAfter || 0);
  }
  canvas.width = width;
  canvas.height = Math.ceil(h);
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  let y = pad;
  for (const line of lines) {
    const s = line.size || baseSize;
    const hasFrac = line.segments.some((x) => x.frac);
    y += s * (hasFrac ? 1.15 : 0.95);
    const w = measureLine(ctx, line.segments, s);
    let x = pad;
    if (line.align === 'center') x = (width - w) / 2;
    else if (line.align === 'right') x = width - pad - w;
    drawLine(ctx, line.segments, x, y, s, defaultColor);
    y += s * (hasFrac ? lineGap - 0.2 + 0.6 : lineGap - 0.95) + (line.gapAfter || 0);
  }
  return { canvas, width: canvas.width, height: canvas.height };
}

/** 便利:純文字一行 → segments */
export function T(text, color) {
  return color ? [{ t: text, color }] : [{ t: text }];
}

/** 做成 three 貼圖平面(世界寬 worldW,等比高) */
export function textPlane(lines, worldW, opts = {}) {
  const { canvas } = makeTextCanvas(lines, opts);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const worldH = worldW * (canvas.height / canvas.width);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(worldW, worldH),
    new THREE.MeshBasicMaterial({ map: tex, transparent: !opts.bg, depthWrite: !!opts.bg }),
  );
  mesh.userData.redraw = (newLines) => {
    const { canvas: c2 } = makeTextCanvas(newLines, opts);
    tex.image = c2;
    tex.needsUpdate = true;
  };
  return mesh;
}
