// 學生端連線:自動重連(1s、2s、4s…最多 15s)、單機模式、心跳、進度回報。
import { decode, student, HEARTBEAT_MS, defaultState } from './protocol.js';

/**
 * @param {object} p {room, name, clientId, onState(state), onConnChange(online)}
 */
export function createSync({ room, name, clientId, onState, onConnChange }) {
  const state = {
    online: false,
    ws: null,
    retry: 0,
    closed: false,
    lastServer: defaultState(),
    pending: null,
  };
  let heartbeat = null;

  function url() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}/ws?room=${encodeURIComponent(room)}&role=student`;
  }

  function connect() {
    if (state.closed || !room) return;
    let ws;
    try {
      ws = new WebSocket(url());
    } catch {
      scheduleRetry();
      return;
    }
    state.ws = ws;
    ws.onopen = () => {
      state.retry = 0;
      state.online = true;
      onConnChange?.(true);
      ws.send(student.hello(clientId, name));
      if (state.pending) { ws.send(state.pending); state.pending = null; } // 補送進度
      clearInterval(heartbeat);
      heartbeat = setInterval(() => {
        if (ws.readyState === 1) ws.send(student.ping());
      }, HEARTBEAT_MS);
    };
    ws.onmessage = (ev) => {
      const { ok, msg } = decode(ev.data);
      if (!ok) return;
      if (msg.t === 'state') {
        state.lastServer = msg;
        onState?.(msg);
      } else if (msg.t === 'recenter') {
        onState?.(msg); // 轉交(main.js 以 t 分流)
      }
    };
    ws.onclose = () => {
      state.online = false;
      onConnChange?.(false); // 單機模式
      clearInterval(heartbeat);
      scheduleRetry();
    };
    ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
  }

  function scheduleRetry() {
    if (state.closed) return;
    const delay = Math.min(15000, 1000 * 2 ** state.retry);
    state.retry++;
    setTimeout(connect, delay);
  }

  /** 進度回報(事件時呼叫);離線就留到重連後補送 */
  function sendProgress(level, stage, badges) {
    const msg = student.progress(level, stage, badges);
    if (state.ws?.readyState === 1) state.ws.send(msg);
    else state.pending = msg;
  }

  function close() {
    state.closed = true;
    clearInterval(heartbeat);
    state.ws?.close();
  }

  connect();
  return {
    sendProgress,
    close,
    get online() { return state.online; },
    get serverState() { return state.lastServer; },
  };
}
