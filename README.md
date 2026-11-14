# 機構教室 VR

寫實 PBR 的國中生活科技教室 + 六個機構教具(雨刷、引擎、齒輪、腳踏車、時鐘、電動起子)與彩蛋壓罐機。教學內容寫在教室黑板上,老師可以用控場頁讓全班同步。

- Three.js 0.170 + Vite 5,WebXR(Quest 3,手把與手部追蹤)與電腦滑鼠都能完整操作。
- 部署:一個 Cloudflare Worker(靜態網頁 + Durable Object 即時同步)。

## 本機開發

```bash
npm install
```

```bash
npm run dev
```

- 學生頁:`http://localhost:5173/`(輸入名字;房間碼可空白 = 單機模式)
- 開發捷徑:`/?skip=1&aid=wiper`(略過起始頁)、`&quality=vr|vr-baked`、`&advanced=1`、`&view=board`、`&debug=1`(FPS / draw calls / 三角面)
- VR 測試頁:`/vr.html?aid=gears`(vr 畫質,每 5 秒在主控台記錄效能)
- 老師頁:`/teacher.html`
- 選單:電腦按 **Y**;Quest 左手把 Y 鍵,或左手掌心朝上碰掌上的小圓鈕。選單有七個教具、進階數學開關、看黑板 / 回到工作桌。

## 測試與檢查

```bash
npm test
```

```bash
node scripts/check-palette.mjs
```

```bash
BASE=http://localhost:5173/ node scripts/measure.mjs vr vr-baked high
```

```bash
BASE=http://localhost:5173/ node scripts/shots.mjs "aid=wiper|wiper" "aid=gears&advanced=1|gears-blueprint"
```

`measure.mjs` 寫出 `docs/perf.json`;`shots.mjs` 用 Playwright 截圖到 `docs/screenshots/`。

## 部署

```bash
npx wrangler login
```

```bash
npx wrangler secret put TEACHER_PIN
```

```bash
npm run deploy
```

活動當天:學生開 `https://<網域>/?room=<房間碼>`,老師開 `https://<網域>/teacher.html`。

## 使用者可以補的資料

- `docs/textbook-definitions.md`:課本對「結構、機構、機器」的定義原文(每個詞一行,例如 `- 結構:……`)。沒有這個檔案時黑板左區用預設三句。
- `assets/audio/`:同名音檔會取代合成音效,名稱見該資料夾的 README。

## 文件

`docs/audit.md`(第一版盤點)、`docs/decisions.md`(整合決策)、`docs/progress.md`(進度、效能數字、待實機確認)、`docs/scene-decisions.md`(教室)。第一版完整備份在 `archive/v1/`。
