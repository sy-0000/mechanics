# 機構學微縮工作坊 VR(國中生活動版)

約 20 位國中生、每人一台 Meta Quest 3 的半天活動:四個主關卡(雨刷四連桿、曲柄滑塊引擎、齒輪基礎、齒輪應用)加一個彩蛋(肘節夾鉗),老師用控場頁同步全班。

## 安裝

```bash
npm install
```

## 本機開發

```bash
npm run dev
```

- 學生頁:`http://localhost:5173/?room=<房間碼>`(加 `&debug=1` 顯示 FPS/draw call 與測試掛鉤)
- 老師頁:`http://localhost:5173/teacher.html`(同步功能要走 Worker,見下)

含 Worker 與 Durable Object 的完整測試(建置 + `wrangler dev`):

```bash
npm run preview:worker
```

本機老師 PIN 放在 `.dev.vars`(已被 .gitignore 排除):

```bash
echo "TEACHER_PIN=你的測試PIN" > .dev.vars
```

## 測試

```bash
npm test
```

- 運動學單元測試(教科書例 04-01、04-02 等)與協定測試永遠執行。
- `tests/do.integration.test.js` 需要 `npm run preview:worker` 在 localhost:8787 運行且 `.dev.vars` 的 PIN 為 `test1234`;伺服器不在時自動跳過。

畫面檢查(需本機 Chromium/Playwright,先開 `npm run dev`):

```bash
node scripts/screenshot.js
```

壓力測試(模擬 20 位學生):

```bash
npm run loadtest -- --url ws://localhost:8787 --room demo --pin <PIN>
```

## 部署(單一 Cloudflare Worker)

第一次部署前,需要你在瀏覽器完成兩件事:

1. **登入 Cloudflare**(會開瀏覽器授權):

   ```bash
   npx wrangler login
   ```

2. **設定老師 PIN**(祕密變數,不會進 Git):

   ```bash
   npx wrangler secret put TEACHER_PIN
   ```

然後:

```bash
npm run deploy
```

部署內容:靜態網頁(Workers Static Assets,`dist/`)+ 即時同步(SQLite 型 Durable Object,WebSocket Hibernation)。免費方案即可。

## 活動當天

- 學生頁:`https://<你的網域>/?room=<房間碼>` — 輸入名字,戴上 Quest 3 按「進入 VR」。
- 老師頁:`https://<你的網域>/teacher.html` — 輸入房間碼與 PIN。
- 房間碼自訂(小寫英數字與連字號);同一房間碼 = 同一班。
- 斷網時學生自動進單機模式照樣能玩,恢復後自動重連並補報進度。
- 房間資料(名冊、徽章)在最後活動 24 小時後自動刪除。

## 字型子集(改了場景文字之後)

```bash
npm i --no-save @fontsource/noto-sans-tc @fontsource/noto-sans
pip install fonttools brotli
npm run font
```

輸出 `public/fonts/noto-tc-subset.woff2`(+ 希臘字母補充檔),已進版本庫,平常建置不需重跑。

## 文件

- `AGENT.md` — 需求規格(唯一來源)
- `docs/plan.md` / `docs/progress.md` / `docs/decisions.md` — 計畫、進度、決策
- `docs/layout-plan.md` — 各關俯視佈局與 VR 伸手距離
- `docs/screenshots/` — 各關、各步驟、藍圖、卷軸畫面
