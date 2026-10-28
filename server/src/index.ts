/*
 * Sector 7 game server (Cloudflare Worker).
 *
 * - GET /health: a quick "ok".
 * - GET /play (WebSocket): the Lobby picks a city with room (16 players each,
 *   more cities open as they fill) and the connection is handed to that city's
 *   Room, which runs the game and talks to each player's Profile.
 *
 * - /auth (HTTP, JSON): logging in with a wallet and its basic profile, see accounts.ts.
 * - Everything else: the website itself (static files built into ../dist).
 *
 * Only pages listed in ALLOWED_ORIGINS can connect.
 */
import { Accounts } from './accounts';
import { Lobby } from './lobby';
import { Profile } from './profile';
import { Room } from './room';

export { Accounts, Lobby, Profile, Room };

export interface Env {
  LOBBY: DurableObjectNamespace<Lobby>;
  ROOMS: DurableObjectNamespace<Room>;
  PROFILES: DurableObjectNamespace<Profile>;
  ACCOUNTS: DurableObjectNamespace<Accounts>;
  /** The built website (wrangler.jsonc "assets") */
  ASSETS?: Fetcher;
  ALLOWED_ORIGINS: string;
  /** The network wallets log in on: 943 (PulseChain Testnet v4) or 369 (PulseChain) */
  AUTH_CHAIN_ID?: string;
}

const allowed = (origin: string | null, env: Env) => !!origin && env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).includes(origin);

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/health') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    if (url.pathname === '/play') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      if (!allowed(req.headers.get('Origin'), env)) return new Response('Forbidden', { status: 403 });
      const room = await env.LOBBY.get(env.LOBBY.idFromName('main')).assign();
      const headers = new Headers(req.headers);
      headers.set('X-Room', room);
      return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(new Request(req, { headers }));
    }
    if (url.pathname.startsWith('/auth/')) {
      const origin = req.headers.get('Origin');
      // A page served from this Worker itself sends no Origin on a plain GET (/auth/me needs the visitor's
      // own session token); anything that changes something always comes with one
      const sameSite = !origin && req.method === 'GET';
      if (!sameSite && !allowed(origin, env)) return new Response('Forbidden', { status: 403 });
      const cors: Record<string, string> = origin
        ? {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '600',
            Vary: 'Origin',
          }
        : {};
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      const res = await env.ACCOUNTS.get(env.ACCOUNTS.idFromName('main')).fetch(req);
      const out = new Response(res.body, res);
      for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
      out.headers.set('Cache-Control', 'no-store');
      return out;
    }
    return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Sector 7 game server', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
