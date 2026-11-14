// VR 測試頁:vr 檔位、debug 數據,每 5 秒在主控台記錄 FPS / draw call / 三角形(Quest 3 實機記錄用)。
import { boot } from './boot.js';
const p = new URLSearchParams(location.search);
boot({ quality: p.get('quality') === 'vr-baked' ? 'vr-baked' : 'vr', debug: true, perfLog: true, aid: p.get('aid') ?? undefined, name: 'vr-test' });
