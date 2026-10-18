/*
 * Degen City game server (Cloudflare Worker).
 *
 * - GET /health: a quick "ok".
 * - GET /play (WebSocket): the Lobby picks a city with room (16 players each,
 *   more cities open as they fill) and the connection is handed to that city's
 *   Room, which runs the game and talks to each player's Profile.
 *
 * Only pages listed in ALLOWED_ORIGINS can connect.
 */
import { Lobby } from './lobby';
import { Profile } from './profile';
import { Room } from './room';

export { Lobby, Profile, Room };

export interface Env {
  LOBBY: DurableObjectNamespace<Lobby>;
  ROOMS: DurableObjectNamespace<Room>;
  PROFILES: DurableObjectNamespace<Profile>;
  ALLOWED_ORIGINS: string;
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
    return new Response('Degen City game server', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
