// 房間 Durable Object(SQLite 型):WebSocket Hibernation、名冊、老師指令廣播。
// 最後活動 24 小時後 alarm 自動刪除全部資料。
import { DurableObject } from 'cloudflare:workers';
import {
  decode, server, sanitizeName, defaultState, CMD_KEYS,
  MAX_MESSAGE_BYTES, RATE_LIMIT_PER_SEC,
} from '../src/net/protocol.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const OFFLINE_MS = 40 * 1000; // 超過兩次心跳沒收到 → 離線

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS roster (
        clientId TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        level TEXT DEFAULT 'wiper',
        stage INTEGER DEFAULT 0,
        badges TEXT DEFAULT '[]',
        lastSeen INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
    `);
    this.rate = new Map(); // ws → {tokens, last}
  }

  // ── 房間狀態 ──
  getState() {
    const row = [...this.sql.exec(`SELECT v FROM kv WHERE k = 'state'`)][0];
    return row ? JSON.parse(row.v) : defaultState();
  }
  setState(s) {
    this.sql.exec(`INSERT INTO kv (k, v) VALUES ('state', ?)
                   ON CONFLICT(k) DO UPDATE SET v = excluded.v`, JSON.stringify(s));
  }
  async touchAlarm() {
    await this.ctx.storage.setAlarm(Date.now() + DAY_MS);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const role = url.searchParams.get('role') === 'teacher' ? 'teacher' : 'student';
    const pair = new WebSocketPair();
    const [client, ws] = Object.values(pair);
    // Hibernation API;attachment 存角色與驗證狀態
    this.ctx.acceptWebSocket(ws, [role]);
    ws.serializeAttachment({ role, authed: role === 'student', clientId: null });
    await this.touchAlarm();
    return new Response(null, { status: 101, webSocket: client });
  }

  rateOk(ws) {
    const now = Date.now();
    let r = this.rate.get(ws);
    if (!r) { r = { tokens: RATE_LIMIT_PER_SEC, last: now }; this.rate.set(ws, r); }
    r.tokens = Math.min(RATE_LIMIT_PER_SEC, r.tokens + ((now - r.last) / 1000) * RATE_LIMIT_PER_SEC);
    r.last = now;
    if (r.tokens >= 1) { r.tokens -= 1; return true; }
    return false;
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_MESSAGE_BYTES) { ws.close(1009, 'too large'); return; }
    if (!this.rateOk(ws)) return; // 超量:靜默丟棄
    const { ok, msg } = decode(raw);
    if (!ok) return;
    const att = ws.deserializeAttachment() || {};
    await this.touchAlarm();

    if (att.role === 'teacher') {
      if (msg.t === 'hello') {
        const good = !!this.env.TEACHER_PIN && msg.pin === this.env.TEACHER_PIN;
        if (!good) {
          ws.send(server.error('bad pin'));
          ws.close(4001, 'bad pin');
          return;
        }
        att.authed = true;
        ws.serializeAttachment(att);
        ws.send(server.state(this.getState()));
        ws.send(server.roster(this.roster()));
        return;
      }
      if (!att.authed) { ws.close(4001, 'not authed'); return; }
      this.onTeacher(ws, msg);
      return;
    }

    // 學生
    if (msg.t === 'hello') {
      const name = sanitizeName(msg.name || '');
      const clientId = String(msg.clientId || '').slice(0, 32);
      if (!clientId || !name) { ws.close(4000, 'bad hello'); return; }
      att.clientId = clientId;
      ws.serializeAttachment(att);
      this.sql.exec(`INSERT INTO roster (clientId, name, lastSeen) VALUES (?, ?, ?)
                     ON CONFLICT(clientId) DO UPDATE SET name = excluded.name, lastSeen = excluded.lastSeen`,
        clientId, name, Date.now());
      ws.send(server.state(this.getState()));
      this.pushRoster();
      return;
    }
    if (!att.clientId) return;
    if (msg.t === 'ping') {
      this.sql.exec(`UPDATE roster SET lastSeen = ? WHERE clientId = ?`, Date.now(), att.clientId);
      return;
    }
    if (msg.t === 'progress') {
      const badges = Array.isArray(msg.badges) ? msg.badges.slice(0, 32).map(String) : [];
      this.sql.exec(
        `UPDATE roster SET level = ?, stage = ?, badges = ?, lastSeen = ? WHERE clientId = ?`,
        String(msg.level || '').slice(0, 24), Number(msg.stage) || 0,
        JSON.stringify(badges), Date.now(), att.clientId,
      );
      this.pushRoster();
    }
  }

  onTeacher(ws, msg) {
    switch (msg.t) {
      case 'cmd': {
        const s = this.getState();
        for (const k of CMD_KEYS) {
          if (msg[k] !== undefined) s[k] = msg[k];
        }
        if (msg.view !== undefined) s.viewSeq = (s.viewSeq || 0) + 1; // 每次「全員看黑板 / 回到工作桌」都重新觸發
        s.seq = (s.seq || 0) + 1;
        this.setState(s);
        this.broadcast('student', server.state(s));
        this.broadcast('teacher', server.state(s));
        break;
      }
      case 'rename': {
        const name = sanitizeName(msg.name || '');
        if (!name) break;
        this.sql.exec(`UPDATE roster SET name = ? WHERE clientId = ?`, name, String(msg.clientId || ''));
        this.pushRoster();
        break;
      }
      case 'recenter': {
        const target = msg.target || 'all';
        for (const sock of this.ctx.getWebSockets('student')) {
          const a = sock.deserializeAttachment() || {};
          if (target === 'all' || a.clientId === target) {
            try { sock.send(server.recenter()); } catch { /* 已斷線 */ }
          }
        }
        break;
      }
      case 'clear': {
        this.sql.exec(`DELETE FROM roster`);
        this.setState(defaultState());
        this.broadcast('student', server.state(this.getState()));
        this.pushRoster();
        break;
      }
      case 'export': {
        const rows = this.roster();
        const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
        const csv = ['name,level,stage,badges,online']
          .concat(rows.map((r) => [esc(r.name), r.level, r.stage, esc(r.badges.join('|')), r.online].join(',')))
          .join('\n');
        ws.send(server.export(csv));
        break;
      }
      default: break;
    }
  }

  roster() {
    const now = Date.now();
    return [...this.sql.exec(`SELECT * FROM roster ORDER BY name`)].map((r) => ({
      clientId: r.clientId,
      name: r.name,
      level: r.level,
      stage: r.stage,
      badges: JSON.parse(r.badges || '[]'),
      lastSeen: r.lastSeen,
      online: now - r.lastSeen < OFFLINE_MS,
    }));
  }

  pushRoster() {
    this.broadcast('teacher', server.roster(this.roster()));
  }

  broadcast(role, data) {
    for (const sock of this.ctx.getWebSockets(role)) {
      if (role === 'teacher') {
        const a = sock.deserializeAttachment() || {};
        if (!a.authed) continue;
      }
      try { sock.send(data); } catch { /* 已斷線 */ }
    }
  }

  webSocketClose(ws) {
    this.rate.delete(ws);
    const att = ws.deserializeAttachment?.() || {};
    if (att.clientId) {
      // 標記離線(lastSeen 保留;online 由時間判斷)
      this.sql.exec(`UPDATE roster SET lastSeen = ? WHERE clientId = ?`, Date.now() - OFFLINE_MS, att.clientId);
      this.pushRoster();
    }
  }
  webSocketError(ws) { this.rate.delete(ws); }

  /** 24 小時無活動:刪除全部資料 */
  async alarm() {
    this.sql.exec(`DELETE FROM roster`);
    this.sql.exec(`DELETE FROM kv`);
    await this.ctx.storage.deleteAll();
  }
}
