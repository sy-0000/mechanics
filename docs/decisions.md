# 決策記錄

## D-001 Three.js 版本
選 `three@0.180.0`(2025-09-03 發佈,遠超 14 天)。鎖定精確版本(package.json 不帶 ^)。
理由:夠新、WebXR API 穩定、避開 0.182+ 的 WebGPU 預設變動風險。

## D-002 字型來源與子集
GitHub 直連 google/fonts 被環境網路政策擋(403),改用 npm 套件 `@fontsource/noto-sans-tc`(同為 OFL 授權的官方建置)取得 TTF/WOFF2,再用 fonttools `pyftsubset` 產生子集(只含專案字串掃描出的字元)。子集腳本:`scripts/subset-font.py`,由 `npm run font` 執行;子集結果直接進版本庫(`public/fonts/`),建置時不需 Python。

## D-003 測試框架
Vitest(與 Vite 同家族,ESM 原生)。Durable Object 測試用 `wrangler dev` 啟動後以 WebSocket 整合測試(`tests/do.integration.test.js`,需本機 wrangler,標記為可跳過:CI 無 wrangler 時 skip 並在 progress.md 註記)。

## D-004 模型尺度
運動學模組一律用「模型 mm」為單位(雨刷曲柄約 30mm 等),three 場景 1 單位 = 1 m,底座 0.8m,機構繪製比例 1 模型mm = 2.5 場景mm(×0.0025),讓 120mm 的機構畫成 0.3m 寬,留足道具空間。卷軸與標籤顯示的數字一律是模型 mm,學生看到的數字與旋鈕刻度一致。

(後續決策隨開發追加)

## D-005 雨刷預設尺寸(§8.1)
`searchDefaultDimensions()` 以 2mm 網格搜尋(r2∈[20,40]、r3,r1∈[40,130]、r4∈[30,90]),
避開葛氏等號邊界(留 2mm 裕度)。在擺角 88–95° 子區間取最小傳動角最大者:
**r1=130、r2=32、r3=126、r4=46(模型 mm)** → 葛氏曲柄搖桿、擺角 88.16°、μmin=43.65°(θ2=0° 時)。
整圈可組裝已由測試逐 5° 驗證。全域最佳 μmin 解(118,26,114,40)擺角僅 81°,取較居中的擺角。

## D-006 齒形背隙
`gearProfile` 預設圓周背隙 0.08m(m=模數),符合實務且保證隨機角度下齒形零穿透
(測試以「邊界取樣穿透深度 × 弧長」估相交面積,門檻 0.1% 齒面積)。
時鐘站的背隙旋鈕只放大顯示用背隙,不影響運動學比值。
