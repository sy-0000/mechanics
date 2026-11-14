import { describe, it, expect } from 'vitest';
import {
  encode, decode, sanitizeName, RateLimiter, byteLength,
  PROTOCOL_VERSION, MAX_MESSAGE_BYTES, student, teacher, defaultState,
} from '../src/net/protocol.js';

describe('協定:編碼解碼', () => {
  it('round-trip', () => {
    const raw = encode('progress', { level: 'wiper', stage: 2, badges: ['a'] });
    const { ok, msg } = decode(raw);
    expect(ok).toBe(true);
    expect(msg.t).toBe('progress');
    expect(msg.v).toBe(PROTOCOL_VERSION);
    expect(msg.level).toBe('wiper');
    expect(msg.badges).toEqual(['a']);
  });

  it('拒絕壞 JSON、壞形狀、壞版本', () => {
    expect(decode('{oops').ok).toBe(false);
    expect(decode('"string"').ok).toBe(false);
    expect(decode('{"x":1}').ok).toBe(false);
    expect(decode(JSON.stringify({ t: 'ping', v: 99 })).ok).toBe(false);
    expect(decode(12345).ok).toBe(false);
  });

  it('超過 4KB 拒絕(解碼)與丟錯(編碼)', () => {
    const big = 'x'.repeat(MAX_MESSAGE_BYTES + 1);
    expect(decode(big).ok).toBe(false);
    expect(() => encode('cmd', { data: big })).toThrow();
  });
});

describe('協定:名字過濾', () => {
  it('去除 HTML、控制字元、裁 12 字', () => {
    expect(sanitizeName('<script>alert(1)</script>小明')).toBe('alert(1)小明');
    expect(sanitizeName('  小明\u0000\u001f  ')).toBe('小明');
    expect(sanitizeName('a<b>c</b>d&"\'`')).toBe('acd');
    expect(sanitizeName('一二三四五六七八九十一二三四')).toBe('一二三四五六七八九十一二');
    expect([...sanitizeName('一二三四五六七八九十一二三四')].length).toBe(12);
    expect(sanitizeName(null)).toBe('');
    expect(sanitizeName(123)).toBe('');
  });

  it('student.hello 內建過濾', () => {
    const { msg } = decode(student.hello('c1', '<b>小華</b>'));
    expect(msg.name).toBe('小華');
  });
});

describe('協定:限流(超量拒絕)', () => {
  it('每秒超過 10 則拒絕,補滿後恢復', () => {
    const rl = new RateLimiter(10);
    let t = 1000;
    let allowed = 0;
    for (let i = 0; i < 20; i++) {
      if (rl.allow(t)) allowed++;
    }
    expect(allowed).toBe(10);
    expect(rl.allow(t)).toBe(false);
    t += 1000; // 一秒後補滿
    allowed = 0;
    for (let i = 0; i < 20; i++) {
      if (rl.allow(t)) allowed++;
    }
    expect(allowed).toBe(10);
  });
});

describe('協定:預設狀態與訊息建構', () => {
  it('defaultState 形狀', () => {
    const s = defaultState();
    expect(s.mode).toBe('free');
    expect(s.level).toBe('wiper');
    expect(s.view).toBe('bench');
    expect(s.advanced).toBe(false);
    expect(s).not.toHaveProperty('scroll');
  });
  it('teacher.cmd 可編碼完整指令', () => {
    const { ok, msg } = decode(teacher.cmd({
      mode: 'follow', level: 'gears', stage: 1,
      view: 'board', advanced: true, volume: 0.5, muted: false,
    }));
    expect(ok).toBe(true);
    expect(msg.mode).toBe('follow');
    expect(byteLength(JSON.stringify(msg))).toBeLessThan(512);
  });
});
