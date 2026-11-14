import * as THREE from 'three';
import fontUrl from '../../assets/fonts/chalk-tc.woff2?url';
import symUrl from '../../assets/fonts/greek-sym.woff2?url';
import { rng } from '../../materials/canvasTex.js';

// 粉筆排版器:把 { title, lines:[{text, chalk, live}] } 以手寫粉筆質感畫到黑板分區的 canvas 上。
// text 標記:x^{2}、F_{in}、\frac{a}{b}、{key}(即時數值佔位)。單字元也可寫成 x^2、F_1。

export const CHALK_COLORS = {
  white: '#F2EFE6',
  orange: '#E9BFA2', // 淡銅橘:動力件
  yellow: '#EEE0A8', // 淡黃:連桿
  green: '#B4D0B6',  // 淡綠:輸出件
  blue: '#B2C8DC',   // 淡藍:角度與弧線
};
const FAMILY = `"ChalkTC", "ChalkSym", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "WenQuanYi Zen Hei", sans-serif`;

let fontReady = null;
export function loadChalkFont() {
  if (fontReady) return fontReady;
  if (typeof FontFace === 'undefined') return (fontReady = Promise.resolve(false));
  const ff = new FontFace('ChalkTC', `url(${fontUrl})`);
  // 希臘字母(θ、μ、φ…)粉筆字型沒有,另外打包 Noto Sans TC 的希臘字母子集作為逐字退回字型(OFL)
  const sym = new FontFace('ChalkSym', `url(${symUrl})`);
  fontReady = Promise.all([ff.load().then(f => { document.fonts.add(f); return true; }).catch(() => false),
    sym.load().then(f => { document.fonts.add(f); return true; }).catch(() => false)]).then(r => r[0]);
  return fontReady;
}

function hash(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.codePointAt(0), 16777619); return h >>> 0; }

/** 解析標記成 token 樹。 */
export function parseMarkup(text) {
  const out = []; let i = 0, buf = '';
  const flush = () => { if (buf) out.push({ t: 'txt', s: buf }); buf = ''; };
  const group = () => { // 讀取 {...}(支援巢狀)或單一字元
    if (text[i] !== '{') { const c = text[i] ?? ''; i += c ? 1 : 0; return c; }
    let depth = 0, start = i + 1;
    for (; i < text.length; i++) { if (text[i] === '{') depth++; else if (text[i] === '}' && --depth === 0) break; }
    const s = text.slice(start, i); i++; return s;
  };
  while (i < text.length) {
    const ch = text[i];
    if (text.startsWith('\\color', i)) { flush(); i += 6; const c = group(), body = group(); out.push({ t: 'col', c, k: parseMarkup(body) }); }
    else if (text.startsWith('\\frac', i)) { flush(); i += 5; const a = group(), b = group(); out.push({ t: 'frac', a: parseMarkup(a), b: parseMarkup(b) }); }
    else if (ch === '^' || ch === '_') { flush(); i++; out.push({ t: ch === '^' ? 'sup' : 'sub', c: parseMarkup(group()) }); }
    else if (ch === '{') {
      const m = /^\{([A-Za-z_][\w.]*)\}/.exec(text.slice(i));
      if (m) { flush(); out.push({ t: 'var', k: m[1] }); i += m[0].length; } else { buf += ch; i++; }
    } else { buf += ch; i++; }
  }
  flush();
  return out;
}

function fmt(v) {
  if (v === undefined || v === null) return '–';
  if (typeof v === 'number') { if (!isFinite(v)) return '–'; const a = Math.abs(v); return (a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.?0+$/, m => (m.startsWith('.') ? '' : m)) || '0'; }
  return String(v);
}

/** 粉筆畫的 ✔ / ✘(寬約 0.95 字)。 */
function drawMark(ctx, ch, x, y, size) {
  ctx.save(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = size * 0.11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (ch === '✔') { ctx.moveTo(x + size * 0.12, y - size * 0.32); ctx.lineTo(x + size * 0.36, y - size * 0.06); ctx.lineTo(x + size * 0.82, y - size * 0.7); }
  else { ctx.moveTo(x + size * 0.16, y - size * 0.66); ctx.lineTo(x + size * 0.76, y - size * 0.04); ctx.moveTo(x + size * 0.76, y - size * 0.66); ctx.lineTo(x + size * 0.16, y - size * 0.04); }
  ctx.stroke(); ctx.restore();
}

/** 量測 token 串:回傳 {w, asc, desc}(像素)。draw=true 時同時繪製。 */
function layout(ctx, tokens, size, x, y, values, draw) {
  let w = 0, asc = size * 0.82, desc = size * 0.22, min = Infinity;
  for (const tk of tokens) {
    if (tk.t === 'txt' || tk.t === 'var') {
      const s = tk.t === 'txt' ? tk.s : fmt(values[tk.k]);
      ctx.font = `${size}px ${FAMILY}`;
      // ✔ ✘ 不依賴字型:直接畫粉筆筆畫(各平台字型不一定有這兩個符號)
      for (const part of s.split(/([✔✘])/)) {
        if (!part) continue;
        if (part === '✔' || part === '✘') { if (draw) drawMark(ctx, part, x + w, y, size); w += size * 0.95; continue; }
        if (draw) ctx.fillText(part, x + w, y);
        w += ctx.measureText(part).width;
      }
      if (s.trim()) min = Math.min(min, size);
    } else if (tk.t === 'col') {
      const prev = ctx.fillStyle;
      if (draw) ctx.fillStyle = CHALK_COLORS[tk.c] ?? tk.c;
      const m = layout(ctx, tk.k, size, x + w, y, values, draw);
      if (draw) ctx.fillStyle = prev;
      w += m.w; asc = Math.max(asc, m.asc); desc = Math.max(desc, m.desc); min = Math.min(min, m.min);
    } else if (tk.t === 'sup' || tk.t === 'sub') {
      const s2 = size * 0.62, dy = tk.t === 'sup' ? -size * 0.42 : size * 0.2;
      const m = layout(ctx, tk.c, s2, x + w + size * 0.02, y + dy, values, draw);
      w += m.w + size * 0.06; min = Math.min(min, m.min);
      if (tk.t === 'sup') asc = Math.max(asc, size * 0.42 + m.asc); else desc = Math.max(desc, size * 0.2 + m.desc);
    } else if (tk.t === 'frac') {
      const s2 = size * 0.78;
      const ma = layout(ctx, tk.a, s2, 0, 0, values, false), mb = layout(ctx, tk.b, s2, 0, 0, values, false);
      min = Math.min(min, ma.min, mb.min);
      const fw = Math.max(ma.w, mb.w) + size * 0.25, barY = y - size * 0.3;
      if (draw) {
        layout(ctx, tk.a, s2, x + w + (fw - ma.w) / 2, barY - size * 0.14 - ma.desc, values, true);
        layout(ctx, tk.b, s2, x + w + (fw - mb.w) / 2, barY + size * 0.12 + mb.asc, values, true);
        ctx.fillRect(x + w + size * 0.05, barY - size * 0.035, fw - size * 0.1, size * 0.07);
      }
      asc = Math.max(asc, size * 0.3 + size * 0.14 + ma.desc + ma.asc);
      desc = Math.max(desc, -size * 0.3 + size * 0.12 + mb.asc + mb.desc);
      w += fw + size * 0.08;
    }
  }
  return { w, asc, desc, min };
}

/** 以字串換行(中文逐字、英文以空白)。只處理純文字行。 */
function wrap(ctx, text, size, maxW) {
  ctx.font = `${size}px ${FAMILY}`;
  const lines = []; let cur = '';
  for (const ch of Array.from(text)) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxW && cur) {
      // 標點不放行首
      if (/[,。、;:,.;:)」』]/.test(ch)) { lines.push(test); cur = ''; continue; }
      lines.push(cur); cur = ch.trim() ? ch : '';
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}


/** 最小字高(公尺):「看黑板」站位 2 m 時仍可讀。上下標也算在內。 */
export const MIN_GLYPH_M = 0.04;
const CJK = /[⺀-鿿豈-﫿＀-￯　-〿]/;
const NO_HEAD = /^[,。、;:,.;:)」』!?!?]$/;
/** 把含標記的一行拆成可換行的單位(中文逐字、英數一段、上下標與分數黏在前一個單位),再貪婪換行。 */
function wrapTokens(ctx, tokens, size, maxW, values) {
  const atoms = [];
  for (const tk of tokens) {
    if (tk.t === 'txt') {
      for (const piece of tk.s.match(/[⺀-鿿豈-﫿＀-￯　-〿]|[^\s⺀-鿿豈-﫿＀-￯　-〿]+|\s+/g) ?? []) {
        if (atoms.length && NO_HEAD.test(piece)) atoms[atoms.length - 1].push({ t: 'txt', s: piece });
        else atoms.push([{ t: 'txt', s: piece }]);
      }
    } else if ((tk.t === 'sub' || tk.t === 'sup') && atoms.length) atoms[atoms.length - 1].push(tk);
    else atoms.push([tk]);
  }
  const rows = []; let cur = [], curW = 0;
  const indent = [{ t: 'txt', s: '　' }], indW = layout(ctx, indent, size, 0, 0, values, false).w;
  for (const a of atoms) {
    const blank = a.length === 1 && a[0].t === 'txt' && !a[0].s.trim();
    const w = layout(ctx, a, size, 0, 0, values, false).w;
    if (cur.length && curW + w > maxW && !blank) { rows.push(cur); cur = [...indent]; curW = indW; }
    if (blank && cur.length <= 1 && rows.length) continue;
    cur.push(...a); curW += w;
  }
  if (cur.length) rows.push(cur);
  return rows;
}

/**
 * 一個黑板分區。widthM/heightM:公尺。style:字高(公尺)設定。
 */
export class ChalkZone {
  constructor(name, widthM, heightM, style) {
    this.name = name; this.wM = widthM; this.hM = heightM; this.style = style;
    const ppm = Math.min(1024 / widthM, 1024 / heightM);
    this.ppm = ppm;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(widthM * ppm); this.canvas.height = Math.round(heightM * ppm);
    this.ctx = this.canvas.getContext('2d');
    this.ink = document.createElement('canvas'); // 單行墨跡暫存
    this.ink.width = this.canvas.width; this.ink.height = Math.ceil(ppm * 0.4);
    this.smear = document.createElement('canvas'); // 累積的擦拭痕跡
    this.smear.width = this.canvas.width; this.smear.height = this.canvas.height;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace; this.texture.anisotropy = 8;
    this.content = null; this.values = {};
    this.anim = null; // {phase:'erase'|'write', t0, dur, old}
    this.dirty = true;
  }

  mesh() {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(this.wM, this.hM),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false, toneMapped: false })); m.userData.dynamic = true; m.renderOrder = 2; m.name = `chalk-${this.name}`;
    return m;
  }

  /** 擦掉再寫上。回傳在動畫結束時 resolve 的 Promise。 */
  set(content, now) {
    return new Promise(res => {
      const hadContent = !!this.content;
      this.anim = { old: this.content, next: content, t0: now, erase: hadContent ? 0.32 : 0, write: content ? 0.48 : 0, res };
      this.dirty = true;
    });
  }
  clear(now) { return this.set(null, now); }
  setValues(v) { Object.assign(this.values, v); if (this.content) this.dirty = true; }

  update(now) {
    const a = this.anim;
    if (!a) { if (this.dirty) { this.render(this.content, 1, null); this.dirty = false; } return; }
    const t = now - a.t0;
    if (t < a.erase) {
      this.render(a.old, 1, t / a.erase);
    } else {
      if (!a.smeared && a.old) { this.addSmear(); a.smeared = true; }
      this.content = a.next;
      const k = a.write ? Math.min(1, (t - a.erase) / a.write) : 1;
      this.render(this.content, k, null);
      if (t >= a.erase + a.write) { this.anim = null; this.dirty = false; a.res(); }
    }
  }

  addSmear() {
    const g = this.smear.getContext('2d'), r = rng(hash(this.name + performance.now()));
    const W = this.smear.width, H = this.smear.height;
    g.globalAlpha = 1;
    for (let i = 0; i < 7; i++) {
      g.fillStyle = `rgba(235,235,225,${0.012 + r() * 0.016})`;
      const y = r() * H, h = 30 + r() * 80;
      g.beginPath(); g.ellipse(W / 2 + (r() - 0.5) * W * 0.3, y, W * (0.35 + r() * 0.2), h / 2, (r() - 0.5) * 0.1, 0, Math.PI * 2); g.fill();
    }
    // 讓舊痕跡慢慢淡去,避免越擦越白
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
  }

  /** 排版:回傳 {items, scale, pad}。太寬的行自動換行;太長時先縮行距、再縮字,但最小字高不低於 MIN_GLYPH_M。 */
  build(content) {
    const ctx = this.ctx, ppm = this.ppm, st = this.style;
    const pad = st.pad * ppm, maxW = this.canvas.width - pad * 2, H = this.canvas.height - pad;
    const rows = [];
    const add = (tokens, sizeM, color, gapM, extra = {}) => {
      const size = sizeM * ppm;
      const w = layout(ctx, tokens, size, 0, 0, this.values, false).w;
      const parts = w > maxW ? wrapTokens(ctx, tokens, size, maxW * 0.95, this.values) : [tokens];
      parts.forEach((p, i) => rows.push({ tokens: p, size, color, gap: i === parts.length - 1 ? gapM : st.gap * 0.25, ...(i === 0 ? extra : {}) }));
    };
    if (content.title) add(parseMarkup(content.title), st.title, CHALK_COLORS.white, st.gap * 1.3, { underline: true });
    for (const line of content.lines ?? []) {
      const color = CHALK_COLORS[line.chalk] ?? CHALK_COLORS.white;
      const size = (line.live ? st.live : st.line);
      const plain = !/[\\^_{]/.test(line.text);
      if (plain && st.wrap) {
        const parts = wrap(ctx, line.text, size * ppm, maxW - size * ppm * 1.05); // 留一個字給續行的縮排
        parts.forEach((p, i) => rows.push({ tokens: [{ t: 'txt', s: (i ? '　' : '') + p }], size: size * ppm, color, gap: i === parts.length - 1 ? st.gap : st.gap * 0.25 }));
      } else add(parseMarkup(line.text), size, color, st.gap);
    }
    const place = k => {
      let y = pad;
      for (const r of rows) { const m = layout(ctx, r.tokens, r.size, 0, 0, this.values, false); y += m.asc; r.y = y; r.w = m.w; r.min = m.min; y += m.desc + r.gap * k * ppm; }
      return y;
    };
    let y = place(1);
    for (const k of [0.75, 0.55, 0.4, 0.3]) { if (y <= H) break; y = place(k); }
    const minPx = Math.min(...rows.map(r => r.min).filter(isFinite));
    const minScale = isFinite(minPx) ? Math.min(1, (MIN_GLYPH_M * ppm) / minPx) : 1;
    const scale = y > H ? Math.max(minScale, H / y) : 1;
    this.metrics = {
      minGlyphM: isFinite(minPx) ? (minPx * scale) / ppm : null,
      overflow: y * scale > H + 1 || rows.some(r => r.w * scale > maxW + 2),
      scale, rows: rows.length,
      wide: rows.filter(r => r.w * scale > maxW + 2).map(r => `${Math.round(r.w)}/${Math.round(maxW)} ` + r.tokens.map(t => t.s ?? (t.k?.map?.(x => x.s ?? '').join('') ?? t.t)).join('').slice(0, 40)),
    };
    return { items: rows, scale, pad };
  }

  render(content, writeK, eraseK) {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(this.smear, 0, 0);
    if (content) {
      const { items, scale, pad } = this.build(content);
      ctx.save(); ctx.translate(pad, 0); ctx.scale(scale, scale);
      const n = items.length;
      items.forEach((it, i) => {
        // 逐行出現:每行在自己的時間窗內由左到右露出
        const k = THREE.MathUtils.clamp(writeK * n - i, 0, 1);
        if (k <= 0) return;
        this.drawChalkLine(it, k, i);
      });
      ctx.restore();
    }
    if (eraseK !== null && eraseK !== undefined) {
      // 板擦由左到右掃過:已擦區域清空,只留淡淡粉痕
      const x = eraseK * (W + 120) - 60;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const grd = ctx.createLinearGradient(x - 60, 0, x + 40, 0);
      grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fillRect(0, 0, Math.max(0, x - 60), H);
      ctx.fillStyle = grd; ctx.fillRect(x - 60, 0, 100, H);
      ctx.restore();
      ctx.drawImage(this.smear, 0, 0);
    }
    this.texture.needsUpdate = true;
  }

  drawChalkLine(it, reveal, idx) {
    const ctx = this.ctx, ink = this.ink, g = ink.getContext('2d');
    const lineH = Math.ceil(it.size * 2.2);
    if (ink.height < lineH) ink.height = lineH;
    g.clearRect(0, 0, ink.width, ink.height);
    const base = it.size * 1.25;
    g.fillStyle = it.color;
    layout(g, it.tokens, it.size, 4, base, this.values, true);
    if (it.underline) g.fillRect(4, base + it.size * 0.25, it.w, Math.max(2, it.size * 0.05));
    // 粉筆顆粒:固定亂數(依行內容),每次重繪一致,不閃爍
    const r = rng(hash(it.tokens.map(t => t.s ?? t.t).join('') + idx));
    g.globalCompositeOperation = 'destination-out';
    const dots = Math.floor(ink.width * lineH / 90);
    for (let i = 0; i < dots; i++) {
      g.fillStyle = `rgba(0,0,0,${0.35 + r() * 0.6})`;
      g.fillRect(r() * (it.w + 10), r() * lineH, 1 + r() * 1.6, 1 + r() * 1.2);
    }
    // 橫向細刮痕(粉筆拖過板面的紋理)
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < lineH / 3; i++) g.fillRect(0, r() * lineH, it.w + 10, 0.8);
    g.globalCompositeOperation = 'source-over';
    const w = (it.w + 12) * reveal;
    const y0 = it.y - base;
    // 粉末:模糊的淡影
    ctx.save();
    ctx.globalAlpha = 0.22; ctx.filter = 'blur(1.5px)';
    ctx.drawImage(ink, 0, 0, w, lineH, 1, y0 + 1, w, lineH);
    ctx.restore();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(ink, 0, 0, w, lineH, 0, y0, w, lineH);
    ctx.globalAlpha = 1;
  }
}
