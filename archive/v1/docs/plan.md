# 開發計畫(依 AGENT.md 第 15 節)

## 第 0 步 文件與腳手架
- [ ] 寫入 AGENT.md、docs/plan.md、docs/progress.md、docs/decisions.md
- [ ] package.json:three 鎖定版本、vite、vitest、wrangler;六個 npm scripts
- [ ] index.html / teacher.html 入口(只引 script)
- [ ] 打包 Noto Sans TC 子集字型(fonttools;失敗則整包並記錄大小)

## 第 1 步 場景佈局方案
- [ ] docs/layout-plan.md:每關俯視配置(ASCII 圖)、尺寸、VR 伸手距離

## 第 2 步 運動學模組(純數學,過全部測試才進第 3 步)
- [ ] fourBar.js:Grashof 分類、封閉解、傳動角、極限位置、擺角、預設尺寸搜尋
- [ ] sliderCrank.js:x(θ)、行程(含偏位)、傳動角、死點
- [ ] toggleClamp.js:β、力放大、過中心鎖死判斷
- [ ] gears.js:模數/節圓/中心距、轉速比、力矩比、漸開線齒形、齒形不相交檢查、複合齒輪相位、背隙
- [ ] bicycle.js:檔位比、踏一圈前進距離
- [ ] clock.js:兩級輪系、總比 12、中心距相等
- [ ] 測試:例 04-01、例 04-02、封閉解誤差 <1e-9、齒形不相交、時鐘總比、腳踏車檔位、協定
- [ ] `npm test` 全綠

## 第 3 步 資產建模(每零件一檔)
- [ ] linkage:crank、coupler、rocker、frame、pin、slider、rail
- [ ] gears:gear、pinion、chain、sprocket、clockMovement、hands、gearbox
- [ ] props:windshield、caliper、protractor、boltSet、pencil、notebook、spareGear、oilCan、weight、fan、clampModel、rubberBlock、ramp、screwdriverShell、woodBlockScrew
- [ ] controls:knob、lever、button、gearTray、switchBox、wristButtons、levelPlaque、pausePlaque、scaleBar

## 第 4 步 材質與光影
- [ ] toon 漸層、反向外殼描邊、程序暖色 envmap(PMREM)、木材/紙/塑膠/橡膠
- [ ] 主光+陰影、奶油環境光、地面與地平線、微塵(InstancedMesh)、窗光緩動

## 第 5 步 互動
- [ ] cameraDesktop(限角環繞)、滑鼠拖曳零件(角度增量)
- [ ] xr.js:session、手把射線+抓取、手勢捏合、雙手握把 2 秒重新定位、手腕按鈕
- [ ] sceneManager:關卡載入卸載、銘牌切換

## 第 6 步 教學層
- [ ] tags.js 代號銅牌翻面;scroll.js 卷軸四行格式;blueprint.js 0.4 秒過渡
- [ ] canvas 公式排版器(分數、上下標、希臘字母)
- [ ] missions.js 任務偵測(數值判斷);badges.js 徽章牆與蓋章
- [ ] sfx.js 合成音效;haptics.js 震動(25ms 節流)

## 第 6.5 步 關卡組裝
- [ ] 雨刷(3 stage、旋鈕、任務、卷軸、藍圖)
- [ ] 曲柄滑塊(過場動畫、死點、量行程)
- [ ] 肘節夾鉗(彩蛋入口、鎖死/彈開)
- [ ] 齒輪基礎(4 stage、托盤、轉速力矩長條、示範)
- [ ] 齒輪應用(腳踏車/時鐘/減速機三站)

## 第 7 步 同步
- [ ] protocol.js(共用);sync.js(重連、單機模式)
- [ ] worker/index.js + room.js(DO、Hibernation、SQLite、alarm 24h、PIN、限流)
- [ ] teacher 頁 DOM;index 起始頁;loadtest.js
- [ ] DO 測試(廣播、PIN 拒絕、清除)

## 第 8 步 效能
- [ ] ?debug=1 顯示 FPS/drawcall;逐關記錄;Quest 預估寫 decisions.md

## 第 9 步 驗收
- [ ] Playwright 截圖逐關逐 stage 檢查 → docs/screenshots/
- [ ] 第 14 節清單逐項打勾;README.md

## 第 10 步 部署
- [ ] npm run deploy(需使用者 wrangler login 與 TEACHER_PIN,寫入 README)
