// Cloudflare Worker 入口:/ws 升級到 Durable Object(房間),其餘交給靜態資產。
export { Room } from './room.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      const room = (url.searchParams.get('room') || '').trim().toLowerCase();
      const role = url.searchParams.get('role') === 'teacher' ? 'teacher' : 'student';
      if (!room || room.length > 24 || !/^[a-z0-9-]+$/.test(room)) {
        return new Response('bad room', { status: 400 });
      }
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('expected websocket', { status: 426 });
      }
      const id = env.ROOM.idFromName(room);
      const stub = env.ROOM.get(id);
      const fwd = new URL(request.url);
      fwd.searchParams.set('role', role);
      return stub.fetch(new Request(fwd, request));
    }
    return env.ASSETS.fetch(request);
  },
};
