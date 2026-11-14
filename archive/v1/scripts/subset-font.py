#!/usr/bin/env python3
"""產生 Noto Sans TC 子集字型。
掃描 src/ 內所有字串用到的字元(含中英數、希臘字母、數學符號),
從 @fontsource/noto-sans-tc 的字型檔做子集,輸出 public/fonts/noto-tc-subset.woff2。

用法:npm run font
需要:pip install fonttools brotli;以及 scratch 目錄中的來源字型或
      node_modules/@fontsource/noto-sans-tc(npm install 後自動存在)。
"""
import os
import re
import sys
import glob
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
OUT_DIR = os.path.join(ROOT, 'public', 'fonts')
OUT = os.path.join(OUT_DIR, 'noto-tc-subset.woff2')

# 固定必含字元:ASCII 可見字元 + 希臘 + 數學/標點。
# 上下標(₂、² 等)不進字型:自製 canvas 排版器用一般數字縮小繪製。
EXTRA = (
    ''.join(chr(c) for c in range(0x20, 0x7F))
    + 'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΘΛΠΣΦΨΩ'
    + '≤≥≠≈±×÷√∝∞°′″·—–…、。,:;!?()「」『』【】〈〉《》'
)


def collect_chars():
    chars = set(EXTRA)
    for path in glob.glob(os.path.join(SRC, '**', '*.js'), recursive=True) + \
            glob.glob(os.path.join(ROOT, '*.html')):
        with open(path, encoding='utf-8') as f:
            text = f.read()
        for ch in text:
            cp = ord(ch)
            # 跳過 emoji / 特殊符號(只在桌面 2D HUD 使用,系統字型即可)
            if cp > 0x7F and not (0x2300 <= cp <= 0x27BF or cp >= 0x1F000):
                chars.add(ch)
    chars.discard(' ')
    return ''.join(sorted(chars))


def find_font_dirs():
    """回傳存在的來源目錄:Noto Sans TC(中文)與 Noto Sans(希臘字母)。"""
    dirs = []
    for env, sub in (('FONT_DIR', 'noto-sans-tc'), ('FONT_DIR2', 'noto-sans')):
        c = os.environ.get(env) or os.path.join(ROOT, 'node_modules', '@fontsource', sub, 'files')
        if os.path.isdir(c):
            dirs.append(c)
    return dirs


def main():
    import tempfile
    from fontTools.ttLib import TTFont
    from fontTools.merge import Merger

    font_dirs = find_font_dirs()
    if not font_dirs:
        print('找不到來源字型目錄。請 npm i --no-save @fontsource/noto-sans-tc @fontsource/noto-sans', file=sys.stderr)
        print('或設 FONT_DIR / FONT_DIR2', file=sys.stderr)
        sys.exit(1)

    chars = collect_chars()
    want = {ord(c) for c in chars if not c.isspace()} | {0x20}
    os.makedirs(OUT_DIR, exist_ok=True)
    txt = os.path.join(OUT_DIR, 'charset.txt')
    with open(txt, 'w', encoding='utf-8') as f:
        f.write(chars)

    # 逐片(fontsource 把字型切成多個 unicode-range 檔)找齊所有字元
    slices = []
    for d in font_dirs:
        slices += sorted(glob.glob(os.path.join(d, '*-400-normal.woff2')))
    remaining = set(want)
    picked = []  # (path, codepoints)
    # 先用 chinese-traditional 大片,再用其他片補
    slices.sort(key=lambda p: ('chinese-traditional' not in p, 'latin' not in p, p))
    for path in slices:
        if not remaining:
            break
        try:
            f = TTFont(path)
            cmap = set(f.getBestCmap().keys())
        except Exception:
            continue
        got = remaining & cmap
        if got:
            picked.append((path, got))
            remaining -= got

    # 同一家族(同來源目錄)內可 merge;跨家族(TC vs Noto Sans)輸出成第二個檔,
    # 前端以 font-family 後備串接('WorkshopTC, WorkshopSym')。
    by_dir = {}
    for path, got in picked:
        by_dir.setdefault(os.path.dirname(path), []).append((path, got))

    outputs = []
    with tempfile.TemporaryDirectory() as tmp:
        for di, (d, items) in enumerate(by_dir.items()):
            parts = []
            for i, (path, got) in enumerate(items):
                part = os.path.join(tmp, f'p{di}_{i}.ttf')
                unicodes = ','.join(f'{c:04X}' for c in sorted(got))
                subprocess.run([
                    sys.executable, '-m', 'fontTools.subset', path,
                    f'--unicodes={unicodes}',
                    f'--output-file={part}',
                    '--layout-features=*', '--no-hinting', '--drop-tables+=FFTM',
                ], check=True)
                parts.append(part)
            merged = TTFont(parts[0]) if len(parts) == 1 else Merger().merge(parts)
            merged.flavor = 'woff2'
            out = OUT if di == 0 else OUT.replace('subset', 'subset-sym')
            merged.save(out)
            outputs.append(out)

    have = set()
    for out in outputs:
        size = os.path.getsize(out)
        cmap = TTFont(out).getBestCmap()
        have |= set(cmap.keys())
        print(f'子集完成:{out}({size/1024:.0f} KB)')
    missing = [chr(c) for c in want if c not in have]
    if missing:
        print(f'警告:{len(missing)} 個字元缺字:{"".join(missing)}', file=sys.stderr)
        sys.exit(2)
    print(f'所有 {len(chars)} 個字元皆有字形({len(picked)} 片來源,{len(outputs)} 個輸出)。')


if __name__ == '__main__':
    main()
