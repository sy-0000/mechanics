var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/room.js
import { DurableObject } from "cloudflare:workers";

// src/net/protocol.js
var PROTOCOL_VERSION = 1;
var MAX_MESSAGE_BYTES = 4096;
var MAX_NAME_LEN = 12;
var RATE_LIMIT_PER_SEC = 10;
var LEVELS = ["wiper", "engine", "gears", "bike", "clock", "driver"];
var BONUS_LEVEL = "crusher";
var ALL_AIDS = [...LEVELS, BONUS_LEVEL];
var CMD_KEYS = ["mode", "level", "stage", "view", "viewSeq", "advanced", "volume", "muted"];
function sanitizeName(raw) {
  if (typeof raw !== "string") return "";
  const noTags = raw.replace(/<[^>]*>/g, "").replace(/[<>&"'`]/g, "");
  const noCtrl = noTags.replace(/[\u0000-\u001f\u007f]/g, "");
  return [...noCtrl.trim()].slice(0, MAX_NAME_LEN).join("");
}
__name(sanitizeName, "sanitizeName");
function encode(t, payload = {}) {
  const s = JSON.stringify({ t, v: PROTOCOL_VERSION, ...payload });
  if (byteLength(s) > MAX_MESSAGE_BYTES) {
    throw new Error("message too large");
  }
  return s;
}
__name(encode, "encode");
function decode(raw) {
  if (typeof raw !== "string") return { ok: false, error: "not a string" };
  if (byteLength(raw) > MAX_MESSAGE_BYTES) return { ok: false, error: "too large" };
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return { ok: false, error: "bad json" };
  }
  if (!msg || typeof msg !== "object" || typeof msg.t !== "string") {
    return { ok: false, error: "bad shape" };
  }
  if (msg.v !== PROTOCOL_VERSION) return { ok: false, error: "bad version" };
  return { ok: true, msg };
}
__name(decode, "decode");
function byteLength(s) {
  return new TextEncoder().encode(s).length;
}
__name(byteLength, "byteLength");
var server = {
  state: /* @__PURE__ */ __name((s) => encode("state", s), "state"),
  roster: /* @__PURE__ */ __name((list) => encode("roster", { roster: list }), "roster"),
  export: /* @__PURE__ */ __name((csv) => encode("export", { csv }), "export"),
  error: /* @__PURE__ */ __name((reason) => encode("error", { reason }), "error"),
  recenter: /* @__PURE__ */ __name(() => encode("recenter"), "recenter"),
  rename: /* @__PURE__ */ __name((name) => encode("rename", { name }), "rename")
};
function defaultState() {
  return {
    mode: "free",
    level: "wiper",
    stage: 1,
    view: "bench",
    viewSeq: 0,
    advanced: false,
    volume: 0.8,
    muted: false,
    seq: 0
  };
}
__name(defaultState, "defaultState");

// worker/room.js
var DAY_MS = 24 * 60 * 60 * 1e3;
var OFFLINE_MS = 40 * 1e3;
var Room = class extends DurableObject {
  static {
    __name(this, "Room");
  }
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
    this.rate = /* @__PURE__ */ new Map();
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
    const role = url.searchParams.get("role") === "teacher" ? "teacher" : "student";
    const pair = new WebSocketPair();
    const [client, ws] = Object.values(pair);
    this.ctx.acceptWebSocket(ws, [role]);
    ws.serializeAttachment({ role, authed: role === "student", clientId: null });
    await this.touchAlarm();
    return new Response(null, { status: 101, webSocket: client });
  }
  rateOk(ws) {
    const now = Date.now();
    let r = this.rate.get(ws);
    if (!r) {
      r = { tokens: RATE_LIMIT_PER_SEC, last: now };
      this.rate.set(ws, r);
    }
    r.tokens = Math.min(RATE_LIMIT_PER_SEC, r.tokens + (now - r.last) / 1e3 * RATE_LIMIT_PER_SEC);
    r.last = now;
    if (r.tokens >= 1) {
      r.tokens -= 1;
      return true;
    }
    return false;
  }
  async webSocketMessage(ws, raw) {
    if (typeof raw !== "string" || raw.length > MAX_MESSAGE_BYTES) {
      ws.close(1009, "too large");
      return;
    }
    if (!this.rateOk(ws)) return;
    const { ok, msg } = decode(raw);
    if (!ok) return;
    const att = ws.deserializeAttachment() || {};
    await this.touchAlarm();
    if (att.role === "teacher") {
      if (msg.t === "hello") {
        const good = !!this.env.TEACHER_PIN && msg.pin === this.env.TEACHER_PIN;
        if (!good) {
          ws.send(server.error("bad pin"));
          ws.close(4001, "bad pin");
          return;
        }
        att.authed = true;
        ws.serializeAttachment(att);
        ws.send(server.state(this.getState()));
        ws.send(server.roster(this.roster()));
        return;
      }
      if (!att.authed) {
        ws.close(4001, "not authed");
        return;
      }
      this.onTeacher(ws, msg);
      return;
    }
    if (msg.t === "hello") {
      const name = sanitizeName(msg.name || "");
      const clientId = String(msg.clientId || "").slice(0, 32);
      if (!clientId || !name) {
        ws.close(4e3, "bad hello");
        return;
      }
      att.clientId = clientId;
      ws.serializeAttachment(att);
      this.sql.exec(
        `INSERT INTO roster (clientId, name, lastSeen) VALUES (?, ?, ?)
                     ON CONFLICT(clientId) DO UPDATE SET name = excluded.name, lastSeen = excluded.lastSeen`,
        clientId,
        name,
        Date.now()
      );
      ws.send(server.state(this.getState()));
      this.pushRoster();
      return;
    }
    if (!att.clientId) return;
    if (msg.t === "ping") {
      this.sql.exec(`UPDATE roster SET lastSeen = ? WHERE clientId = ?`, Date.now(), att.clientId);
      return;
    }
    if (msg.t === "progress") {
      const badges = Array.isArray(msg.badges) ? msg.badges.slice(0, 32).map(String) : [];
      this.sql.exec(
        `UPDATE roster SET level = ?, stage = ?, badges = ?, lastSeen = ? WHERE clientId = ?`,
        String(msg.level || "").slice(0, 24),
        Number(msg.stage) || 0,
        JSON.stringify(badges),
        Date.now(),
        att.clientId
      );
      this.pushRoster();
    }
  }
  onTeacher(ws, msg) {
    switch (msg.t) {
      case "cmd": {
        const s = this.getState();
        for (const k of CMD_KEYS) {
          if (msg[k] !== void 0) s[k] = msg[k];
        }
        if (msg.view !== void 0) s.viewSeq = (s.viewSeq || 0) + 1;
        s.seq = (s.seq || 0) + 1;
        this.setState(s);
        this.broadcast("student", server.state(s));
        this.broadcast("teacher", server.state(s));
        break;
      }
      case "rename": {
        const name = sanitizeName(msg.name || "");
        if (!name) break;
        this.sql.exec(`UPDATE roster SET name = ? WHERE clientId = ?`, name, String(msg.clientId || ""));
        this.pushRoster();
        break;
      }
      case "recenter": {
        const target = msg.target || "all";
        for (const sock of this.ctx.getWebSockets("student")) {
          const a = sock.deserializeAttachment() || {};
          if (target === "all" || a.clientId === target) {
            try {
              sock.send(server.recenter());
            } catch {
            }
          }
        }
        break;
      }
      case "clear": {
        this.sql.exec(`DELETE FROM roster`);
        this.setState(defaultState());
        this.broadcast("student", server.state(this.getState()));
        this.pushRoster();
        break;
      }
      case "export": {
        const rows = this.roster();
        const esc = /* @__PURE__ */ __name((v) => `"${String(v).replace(/"/g, '""')}"`, "esc");
        const csv = ["name,level,stage,badges,online"].concat(rows.map((r) => [esc(r.name), r.level, r.stage, esc(r.badges.join("|")), r.online].join(","))).join("\n");
        ws.send(server.export(csv));
        break;
      }
      default:
        break;
    }
  }
  roster() {
    const now = Date.now();
    return [...this.sql.exec(`SELECT * FROM roster ORDER BY name`)].map((r) => ({
      clientId: r.clientId,
      name: r.name,
      level: r.level,
      stage: r.stage,
      badges: JSON.parse(r.badges || "[]"),
      lastSeen: r.lastSeen,
      online: now - r.lastSeen < OFFLINE_MS
    }));
  }
  pushRoster() {
    this.broadcast("teacher", server.roster(this.roster()));
  }
  broadcast(role, data) {
    for (const sock of this.ctx.getWebSockets(role)) {
      if (role === "teacher") {
        const a = sock.deserializeAttachment() || {};
        if (!a.authed) continue;
      }
      try {
        sock.send(data);
      } catch {
      }
    }
  }
  webSocketClose(ws) {
    this.rate.delete(ws);
    const att = ws.deserializeAttachment?.() || {};
    if (att.clientId) {
      this.sql.exec(`UPDATE roster SET lastSeen = ? WHERE clientId = ?`, Date.now() - OFFLINE_MS, att.clientId);
      this.pushRoster();
    }
  }
  webSocketError(ws) {
    this.rate.delete(ws);
  }
  /** 24 小時無活動:刪除全部資料 */
  async alarm() {
    this.sql.exec(`DELETE FROM roster`);
    this.sql.exec(`DELETE FROM kv`);
    await this.ctx.storage.deleteAll();
  }
};

// worker/index.js
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      const room = (url.searchParams.get("room") || "").trim().toLowerCase();
      const role = url.searchParams.get("role") === "teacher" ? "teacher" : "student";
      if (!room || room.length > 24 || !/^[a-z0-9-]+$/.test(room)) {
        return new Response("bad room", { status: 400 });
      }
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("expected websocket", { status: 426 });
      }
      const id = env.ROOM.idFromName(room);
      const stub = env.ROOM.get(id);
      const fwd = new URL(request.url);
      fwd.searchParams.set("role", role);
      return stub.fetch(new Request(fwd, request));
    }
    return env.ASSETS.fetch(request);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-zbKuoS/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-zbKuoS/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  Room,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
