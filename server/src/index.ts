/*
 * Degen City game server (Cloudflare Worker).
 *
 * - GET /health: a quick "ok".
 * - GET /play (WebSocket): the Lobby picks a city with room (16 players each,
 *   more cities open as they fill) and the connection is handed to that city's
 *   Room, which runs the game and talks to each player's Profile.
 *
 * - /land (HTTP, JSON): plot sales and buildings, see land.ts.
 *
 * Only pages listed in ALLOWED_ORIGINS can connect.
 */
import { Land } from './land';
import { Lobby } from './lobby';
import { Profile } from './profile';
import { Room } from './room';

export { Land, Lobby, Profile, Room };

export interface Env {
  LOBBY: DurableObjectNamespace<Lobby>;
  ROOMS: DurableObjectNamespace<Room>;
  PROFILES: DurableObjectNamespace<Profile>;
  LAND: DurableObjectNamespace<Land>;
  ALLOWED_ORIGINS: string;
  /** Land sales: 943 (PulseChain Testnet v4) or 369 (PulseChain) */
  LAND_CHAIN_ID?: string;
  /** The owner's wallet that plot payments go to; sales stay closed while it's empty */
  LAND_PAYEE?: string;
  /** Plot price in whole PLS */
  LAND_PRICE_PLS?: string;
  LAND_CONFIRMATIONS?: string;
  /** PulseChain RPC to check payments on (defaults to the network's public one) */
  LAND_RPC?: string;
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
    if (url.pathname === '/land' || url.pathname.startsWith('/land/')) {
      const origin = req.headers.get('Origin');
      if (!allowed(origin, env)) return new Response('Forbidden', { status: 403 });
      const cors = {
        'Access-Control-Allow-Origin': origin!,
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      };
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      const res = await env.LAND.get(env.LAND.idFromName('city')).fetch(req);
      const out = new Response(res.body, res);
      for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
      out.headers.set('Cache-Control', 'no-store');
      return out;
    }
    return new Response('Degen City game server', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
