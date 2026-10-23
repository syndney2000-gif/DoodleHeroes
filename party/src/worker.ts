/* Draw Party — the Cloudflare Worker. `/room/ABCD` upgrades to a WebSocket
   and is handed to that room's Durable Object, which runs the shared rules
   in src/games/draw-party/room.ts and relays messages between players. */

import { MAX_PLAYERS, Room, type ClientMsg, type Out } from '../../src/games/draw-party/room';

interface Env {
  ROOMS: { idFromName(name: string): unknown; get(id: unknown): { fetch(req: Request): Promise<Response> } };
  ALLOWED_ORIGINS: string;
}

/* Workers runtime globals, declared here so the file needs no extra type package. */
declare const WebSocketPair: { new (): { 0: WebSocket; 1: WebSocket } };
type ServerSocket = WebSocket & { accept(): void };

const MAX_MESSAGE = 16_000; // characters; a long stroke is well under this

export class PartyRoom {
  private room = new Room();
  private sockets = new Map<string, ServerSocket>();
  private timer: ReturnType<typeof setInterval> | undefined;

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    if (this.sockets.size >= MAX_PLAYERS) return new Response('Room is full', { status: 403 });

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1] as ServerSocket;
    server.accept();
    const id = crypto.randomUUID();
    this.sockets.set(id, server);

    server.addEventListener('message', (ev: MessageEvent) => {
      if (typeof ev.data !== 'string' || ev.data.length > MAX_MESSAGE) return;
      let msg: ClientMsg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      this.send(this.room.handle(id, msg, Date.now()));
      this.startClock();
    });
    const gone = () => {
      if (!this.sockets.delete(id)) return;
      this.send(this.room.leave(id, Date.now()));
    };
    server.addEventListener('close', gone);
    server.addEventListener('error', gone);

    return new Response(null, { status: 101, webSocket: client } as ResponseInit);
  }

  private send(outs: Out[]) {
    for (const o of outs) {
      const data = JSON.stringify(o.msg);
      if (o.to === 'all') {
        for (const [id, ws] of this.sockets) if (id !== o.except) trySend(ws, data);
      } else {
        const ws = this.sockets.get(o.to);
        if (ws) trySend(ws, data);
      }
    }
  }

  /** A once-a-second tick drives timers and hints while anyone is connected. */
  private startClock() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (!this.sockets.size) {
        clearInterval(this.timer);
        this.timer = undefined;
        this.room = new Room(); // an empty room starts fresh next time
        return;
      }
      this.send(this.room.tick(Date.now()));
    }, 1000);
  }
}

function trySend(ws: WebSocket, data: string) {
  try { ws.send(data); } catch { /* the close handler tidies up */ }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') return new Response('Draw Party server is running.');
    const m = url.pathname.match(/^\/room\/([A-Z]{4})$/);
    if (!m) return new Response('Not found', { status: 404 });
    // Only the site's own pages may open rooms.
    const origin = request.headers.get('Origin') ?? '';
    const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
    if (!allowed.includes(origin)) return new Response('Origin not allowed', { status: 403 });
    return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(request);
  },
};
