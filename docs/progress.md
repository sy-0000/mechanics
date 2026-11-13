# 進度

## 第 0 步 文件與腳手架
- [x] AGENT.md、docs/plan.md、docs/progress.md、docs/decisions.md
- [x] package.json(three@0.180.0 鎖定、vite、vitest、wrangler)、vite.config.js、wrangler.toml
- [x] index.html / teacher.html 入口(無邏輯)
- [x] Noto Sans TC 子集:public/fonts/noto-tc-subset.woff2(67KB)+ noto-tc-subset-sym.woff2(3.5KB,希臘字母)
      (資產與文案完成後需重跑 `npm run font` 以涵蓋新字元)

## 第 1 步 場景佈局方案
- [x] docs/layout-plan.md(六關俯視圖、尺寸、VR 伸手距離檢核)

## 第 2 步 運動學模組
- [x] fourBar.js(Grashof、封閉解、傳動角、極限位置、預設尺寸搜尋 → 130/32/126/46)
- [x] sliderCrank.js(x(θ)、行程、偏位、μ 極值、死點)
- [x] toggleClamp.js(β、力放大、過中心鎖死)
- [x] gears.js(基本式、漸開線齒形、嚙合相位、相交檢查、背隙)
- [x] bicycle.js、clock.js
- [x] protocol.js(編解碼、名字過濾、限流)
- [x] `npm test` 44/44 全綠(例 04-01、04-02 教科書驗證通過)

## 下一步
第 3 步:逐一資產建模(src/assets/)。先做 materials/(toon、outline、envmap)供資產引用,再做 linkage → gears → props → controls。
