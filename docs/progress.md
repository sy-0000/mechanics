# 進度

## 第 0 步 文件與腳手架
- [x] AGENT.md、docs/plan.md、docs/progress.md、docs/decisions.md
- [x] package.json(three@0.180.0 鎖定、vite、vitest、wrangler)、vite.config.js、wrangler.toml
- [x] index.html / teacher.html 入口(無邏輯)
- [x] Noto Sans TC 子集(143KB + 3KB 希臘補充,1032 字元全覆蓋,`npm run font` 可重生)

## 第 1 步 場景佈局方案
- [x] docs/layout-plan.md(六關俯視圖、尺寸、VR 伸手距離檢核)

## 第 2 步 運動學模組(51 測試全綠)
- [x] fourBar / sliderCrank / toggleClamp / gears / bicycle / clock / protocol
- [x] 教科書例 04-01、04-02 驗證;雨刷預設 130/32/126/46(擺角 88.2°、μmin 43.6°)
- [x] 齒形不相交、時鐘總比 12、中心距相等、封閉解 <1e-9

## 第 3 步 資產建模(每零件一檔)
- [x] linkage 8 檔、gears 7 檔、props 16 檔、controls 7 檔

## 第 4 步 材質與光影
- [x] toon 三階、反向外殼描邊(平滑法線)、PMREM 暖色環境貼圖、木紋/紙/透明塑膠/橡膠
- [x] 斜照主光+柔影、奶油地面+地平線、微塵 InstancedMesh、窗光緩動(VR 幅度減半)

## 第 5 步 互動
- [x] 電腦環繞視角(俯仰 15–70°、方位 ±70°、距離限制)、滑鼠拖曳(角度增量)
- [x] interact.js 抓取契約(rotary/slide/carry/touch)共用三種輸入
- [x] xr.js:手把+短射線、手勢捏合+關節球、雙手握把 2 秒重新定位、手腕雙鈕淡入

## 第 6 步 教學層
- [x] 代號銅牌翻面+即時數值、卷軸四行格式+翻頁角、藍圖 0.4s smoothstep 過渡
- [x] canvas 排版器(分數/上下標/希臘字母/語意色)
- [x] missions.js 數值判斷(12 任務)、badges.js 徽章牆+蓋章動畫
- [x] sfx.js 合成音效(含馬達轉速音高)、haptics.js(25ms 節流)

## 第 6.5 步 關卡
- [x] 雨刷(3 stage、鎖死螺栓、桿長旋鈕、擦拭扇形+目標區、葛氏偵測)
- [x] 曲柄滑塊(過場、死點強震、游標卡尺量行程、偏位旋鈕藍圖限定)
- [x] 肘節夾鉗(過中心鎖死/彈開、橡膠壓扁)
- [x] 齒輪基礎(4 stage+2 示範、托盤吸附換齒、轉速/力矩長條、重物/風扇)
- [x] 齒輪應用(腳踏車 6 檔+坡道、時鐘五組 60 齒對+背隙、減速機動畫)

## 第 7 步 同步
- [x] protocol.js、sync.js(1/2/4…15s 重連、單機模式、補送進度)
- [x] worker/room.js(Hibernation、SQLite、24h alarm、PIN 驗證、4KB/10msg-s 限流)
- [x] 老師頁(三模式、關卡/步驟、卷軸同步、藍圖、音量、改名、CSV、二次確認清除、徽章牆投影)
- [x] DO 整合測試 7/7(廣播、PIN 拒絕、清除、改名、recenter)
- [x] loadtest:20/20 連線、20/20 收到廣播、名冊 20、p90=5ms(本機)

## 第 8 步 效能
- [x] ?debug=1 顯示 FPS/draw/tri;逐關數據寫入 decisions.md D-011
- [ ] Quest 3 實機 72fps —— **待實機確認**(降階順序已寫在 D-011)

## 第 9 步 驗收清單(§14)
- [x] 四主關+彩蛋可從頭玩到尾;任務以運動學數值偵測(missions.js,51 測試涵蓋判斷函數)
- [x] 顏色語言逐關正確(截圖檢查);道具皆低飽和色
- [x] 無彈窗/說明文字區/水印;銘牌提示環為恆亮不閃爍
- [x] 卷軸四行「白話/公式/代入/結果」,代入即時數字;國中版只用比值與四則
- [x] 藍圖 0.4s 平順過渡;尺寸線/中心線/角度弧/公式(截圖 5 張)
- [x] 老師頁三模式、卷軸同步、改名、匯出、清除(DO 測試+截圖)
- [x] 斷網單機模式+自動重連(sync.js;重連邏輯測試於 loadtest 中間斷線觀察)
- [x] 手把與手勢皆支援(xr.js);震動+聲音(haptics 節流、合成音效)—— 實際手感 **待實機確認**
- [x] 電腦版流暢度:容器內軟體渲染 20fps,無法量真值;draw call 負載合理 —— 60fps **待實機確認**
- [x] README.md(安裝/開發/測試/部署/當天網址)

## 第 10 步 部署
- [ ] `npm run deploy` —— **需要使用者**:`npx wrangler login`(瀏覽器授權)與
      `npx wrangler secret put TEACHER_PIN`,步驟在 README「部署」一節。

## 待實機確認清單
1. Quest 3 穩定 72fps(各關 draw call 已記錄於 decisions.md D-011)
2. 手把震動強度與手勢捏合閾值(PINCH_ON 0.018m)
3. VR 中文字高(0.6m 處 ≥2.5cm):卷軸 0.34m 寬、字高約佔 1/14 ≈ 2.6cm,需實機目測
4. 重新定位後底座距離 0.55m / 桌面低於眼 0.45m 的體感
5. 電腦 60fps(一般獨顯/內顯;容器內無硬體 GPU)

## 已知外部阻礙
- **git push 403**:Claude GitHub App 無 sy-0000/mechanics 權限,等使用者在
  https://claude.ai/connect-github 修復後補推(本機已有完整 commit)。

## 下一步
使用者執行 `wrangler login` + `wrangler secret put TEACHER_PIN` 後跑 `npm run deploy`;
或告知 GitHub 權限已修復,由我補推分支 claude/mechanisms-vr-workshop-hnpn58。
