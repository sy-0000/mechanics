# 第一版教具盤點(audit)

第一版完整備份在 `archive/v1/`(原分支 `claude/mechanisms-vr-workshop-hnpn58` 的全部檔案,含測試、文件、截圖;不再修改)。
判定依整合提示詞第 1 節:運動學必須通過 `AGENT.md` 第 13.1 節的教科書例題測試才算「保留」。
整合前在新專案跑 `npm test`:6 個測試檔 44 項全部通過(Durable Object 整合測試需要 `wrangler dev`,照原設計略過)。

| 模組 | 處理方式 | 理由 |
| --- | --- | --- |
| `src/kinematics/fourBar.js` | 保留(擴充) | 通過例 04-01 Grashof 範圍、封閉解誤差 < 1e-9、傳動角測試。新增「變點機構」分類與公分版預設尺寸搜尋,原函式行為不變。 |
| `src/kinematics/sliderCrank.js` | 保留 | 通過例 04-02 偏位滑件曲柄(行程 401.57、μ 65.38° / 104.48°)。 |
| `src/kinematics/gears.js` | 保留 | 漸開線齒形、不相交測試、中心距、同軸相位都通過;齒形直接用來產生齒輪幾何。 |
| `src/kinematics/clock.js`、`bicycle.js` | 保留(bicycle 參數調整) | 測試通過。爬坡門檻改為 `thresholds.js` 的 1.3,輪子周長改為教材的 2.1 m。 |
| `src/kinematics/toggleClamp.js` | 重構 | 公式正確但「握把行程 → β」寫死在數學檔;壓罐機改用真實尺寸的對稱肘節幾何計算 β,放大倍率公式保留。 |
| `tests/*.test.js` | 保留 | 運動學與協定測試原樣保留,另補新分類、門檻、黑板內容測試。 |
| `src/net/protocol.js`、`sync.js` | 重構 | 協定、名字過濾、限流、重連邏輯正確。卷軸欄位改成黑板指令(`view`、`advanced`),關卡清單改成六個教具加彩蛋。 |
| `worker/index.js`、`worker/room.js`、`wrangler.toml` | 保留(小改) | Durable Object(SQLite、Hibernation、PIN、alarm)邏輯可用;只把 `scroll` 換成黑板相關欄位。 |
| `src/teacher/main.js`、`teacher.html` | 重構 | DOM 控場頁可用;卷軸按鈕換成「全員看黑板 / 全員回到工作桌」、藍圖改名「進階數學」、教具與步驟清單更新。 |
| `src/scene/interact.js` | 保留 | 「抓取契約」(rotary / slide / carry / touchable)與畫面無關,搬到 `src/interact.js` 給新教具共用。 |
| `src/audio/sfx.js`、`haptics.js` | 重構 | Web Audio 合成器保留;補上點火「轟」、敲缸、火星塞「答」、壓罐、提示音,並支援 `assets/audio/` 同名音檔優先。 |
| `src/teach/missions.js` | 重做 | 任務內容與門檻都換了(第 3 節);門檻集中到 `src/teach/thresholds.js`。偵測仍用運動學數值,不靠動畫。 |
| `src/teach/badges.js` | 重構 | 徽章定義(名稱=學會了什麼)保留並更新;場景內的徽章牆(toon + 描邊)移除,改成桌上的任務卡蓋章,徽章同步到老師頁。 |
| `src/scene/levels/*.js`(五個關卡) | 重做 | 互動流程可參考,但數學、畫面、卷軸、藍圖全寫在同一檔;全部改成 `src/aids/*.js`,畫面用 PBR、教學內容改寫到黑板。 |
| `src/assets/linkage/*`、`gears/*`、`controls/*`、`props/*` | 重做 | `MeshToonMaterial` + 反向外殼描邊,每個零件獨立材質與 Mesh(雨刷 180+ draw calls,時鐘 259)。改用教室材質工廠的 PBR 圖集,零件依剛體合併。 |
| `src/assets/geo.js` | 重構 | 圓頭桿、倒角圓柱、齒形擠出等幾何函式保留思路,搬到 `src/aids/geo.js` 並加上圖集 UV。 |
| `src/materials/toon.js`、`outline.js` | 一律移除 | toon 材質與描邊。 |
| `src/materials/envmap.js`、`metal.js`、`wood.js`、`paper.js`、`plastic.js`、`rubber.js` | 一律移除 | 教具自建的環境貼圖與材質;改用教室的 `std()` 材質工廠與教室環境貼圖。 |
| `src/scene/layout.js`(奶油色空間、底座、地面、主光、微塵、霧) | 一律移除 | 教具專案自己的房間 / 地板 / 背景 / 燈光;改用教室。 |
| `src/scene/cameraDesktop.js` | 一律移除 | 教室的 `views` 已有電腦視角。 |
| `src/scene/xr.js` | 重構 | 重複建立手把與手部模型;改用教室選單已建立的同一組 XR 控制器,只保留抓取、捏合、震動邏輯(`src/app/input.js`)。手腕按鈕移除(功能併入教室選單)。重新定位改由教室 `views` 的傳送處理。 |
| `src/scene/sceneManager.js` | 重構 | 載入 / 卸載 / 釋放邏輯保留(`src/app/aidManager.js`);關卡銘牌列與暫停木牌移除,切換改用教室選單。 |
| `src/teach/scroll.js` | 一律移除 | 卷軸;教學內容改寫在黑板。 |
| `src/teach/tags.js` | 重做 | 浮空翻面標籤;改成固定在零件上的代號銅牌(圖集貼圖),數值寫在黑板。 |
| `src/teach/typeset.js` | 一律移除 | 浮空面板排版器;黑板用教室的粉筆排版器。 |
| `src/modes/blueprint.js` | 重做 | 換底色與天空的做法依賴舊房間;改成教具材質內的藍圖著色(深藍半透明、白色邊線)+ 尺寸標註線。 |
| `src/main.js`、`index.html` | 重做 | 2D 起始頁(名字、房間碼)保留,3D 部分改為 `createClassroom()`;HUD 圖示移除(進階數學在教室選單)。 |
| `public/fonts/noto-tc-subset*.woff2`、`scripts/subset-font.py` | 保留 | 起始頁與老師頁(DOM)仍用 Noto Sans TC 子集;場景內的字用教室的粉筆字型。 |
| `scripts/loadtest.js` | 保留 | 20 人壓力測試腳本與協定無關的部分不變。 |
| `scripts/screenshot.js` | 重做 | 改為 `scripts/shots.mjs`(Playwright,教室 + 教具,含三種畫質的 draw call / 三角面量測)。 |
