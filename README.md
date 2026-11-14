# mechanics — 生科教室場景

以 Three.js 建置的「奶油色日光」國中生活科技教室,作為機構教學 VR 的環境。本專案**只有場景**;教具由另一個專案透過掛載點與 API 接上。

```bash
npm install
npm run dev        # http://localhost:5173/  (?debug=1 顯示 FPS / draw call / 三角形)
```
- `index.html`:電腦預覽(含示範教具內容;`?demo=0` 關閉、`?view=board`、`?menu=1`、`?quality=vr`)。
- `vr.html`:VR 測試頁(vr 檔位、debug 數據、主控台 `[perf]` 記錄)。
- 按 **Y** 開啟選單。

## 使用方式
```js
import { createClassroom } from './src/scene/classroom/index.js';
const classroom = createClassroom({ renderer, scene, camera, options: { onSelectTeachingAid: id => load(id) } });
classroom.start();                                   // 或每幀自行呼叫 classroom.update(); classroom.render();
classroom.anchors.teachingAid.add(myMechanism);      // 桌面掛載區中心(本地 +Z 朝學生)
classroom.menu.setItems([{ id: 'fourBar', name: '四連桿', icon: '/icons/fourbar.png' }]);
classroom.board.setZone('center', { title: '四連桿 Four-bar', lines: [
  { text: 'ω_{4} = \\frac{r_2}{r_4} ω_{2}', chalk: 'green' },
  { text: '現在:θ = {theta}°', chalk: 'yellow', live: 'theta' } ] });
classroom.board.updateValues({ theta: 42 });         // 每秒最多套用一次
classroom.views.goTo('board');                       // 電腦平移、VR 淡出傳送
```
完整介面見 `src/scene/classroom/index.js`;配置見 `docs/scene-layout.md`;決策見 `docs/scene-decisions.md`;截圖在 `docs/screenshots/`。

`node scripts/check-palette.mjs` 檢查教室是否誤用教具保留的四個語意色。
