/*
 * Sector 7 game server (Cloudflare Worker). Plot sales for PLS were
 * retired: the city's plots are game property now (src/scripts/city3d/tycoon.ts).
 *
 * - GET /health: a quick "ok".
 * - GET /play (WebSocket): `?game=<id>` joins that game (a hangout city or a
 *   private game's link); without it the Lobby picks a city with room (16
 *   players each, more cities open as they fill). The connection is handed to
 *   the game's Room, which runs it and talks to each player's Profile.
 * - /games (HTTP, JSON): GET `?mode=` lists a mode's public games for the
 *   Multiplayer menu's Browse; POST { mode, map } makes a private game.
 * - /me (HTTP, JSON): the player's own profile for the menu, before joining.
 *   Playing online needs an account: /play, /games and /me all want its
 *   session (`Authorization: Bearer <token>`; in the hello for /play).
 *
 * - /auth (HTTP, JSON): accounts and logging in (a username and password,
 *   Google, Discord or a wallet), see accounts.ts.
 * - Everything else: the website itself (static files built into ../dist).
 *
 * Only pages listed in ALLOWED_ORIGINS can connect.
 */
import { Accounts, type Who } from './accounts';
import { Lobby } from './lobby';
import { Profile } from './profile';
import { Room } from './room';
import { GAME_MODES, gameIdOk, type GameMode } from '../../src/scripts/net/games';
import type { ServerMsg } from '../../src/scripts/net/protocol';

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
  /**
   * Secrets (server/README.md): Google's and Discord's sign-in apps, the email
   * service's key and sender for reset links (Resend), and the owner's private
   * list of names no username may hold (comma separated). Each one missing
   * just leaves its part out.
   */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  BLOCKED_NAMES?: string;
}

const allowed = (origin: string | null, env: Env) => !!origin && env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).includes(origin);

/**
 * An HTTP request from a page that may ask (null: answer 403), and the CORS headers for its answer.
 * A page served from this Worker itself sends no Origin on a plain GET; anything that changes
 * something always comes with one.
 */
function corsFor(req: Request, env: Env): Record<string, string> | null {
  const origin = req.headers.get('Origin');
  if (!(!origin && req.method === 'GET') && !allowed(origin, env)) return null;
  return origin
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      }
    : {};
}
const json = (body: unknown, cors: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** A socket that says why it can't join (a game that's gone) and closes, so the browser stops trying */
function refuse(m: string) {
  const [client, ws] = Object.values(new WebSocketPair());
  ws.accept();
  ws.send(JSON.stringify({ t: 'error', m } satisfies ServerMsg));
  ws.close(4006, 'No such game');
  return new Response(null, { status: 101, webSocket: client });
}

/** The logged-in account from the menu's request (its session token), or null */
function accountOf(req: Request, env: Env) {
  const token = /^Bearer ([0-9a-f]{64})$/.exec(req.headers.get('Authorization') ?? '')?.[1];
  return token ? (env.ACCOUNTS.get(env.ACCOUNTS.idFromName('main')).check(token) as Promise<Who | null>) : Promise.resolve(null);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/health') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    if (url.pathname === '/play') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      if (!allowed(req.headers.get('Origin'), env)) return new Response('Forbidden', { status: 403 });
      const lobby = env.LOBBY.get(env.LOBBY.idFromName('main'));
      const want = url.searchParams.get('game');
      const game = want === null ? await lobby.quick() : gameIdOk(want) ? await lobby.join(want) : null;
      if (!game) return refuse('That game has ended. Pick another from the Multiplayer menu.');
      const headers = new Headers(req.headers);
      headers.set('X-Game', JSON.stringify(game));
      return env.ROOMS.get(env.ROOMS.idFromName(game.id)).fetch(new Request(req, { headers }));
    }
    if (url.pathname === '/games') {
      const cors = corsFor(req, env);
      if (!cors) return new Response('Forbidden', { status: 403 });
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      if (!(await accountOf(req, env))) return json({ error: 'Log in to play online' }, cors, 401);
      const lobby = env.LOBBY.get(env.LOBBY.idFromName('main'));
      if (req.method === 'GET') {
        const mode = url.searchParams.get('mode') ?? 'hangout';
        if (!Object.hasOwn(GAME_MODES, mode)) return json({ error: 'No such mode' }, cors, 400);
        return json({ games: await lobby.list(mode as GameMode) }, cors);
      }
      if (req.method !== 'POST') return json({ error: 'GET or POST' }, cors, 405);
      const game = await lobby.create(await req.json().catch(() => null));
      return game ? json({ game }, cors) : json({ error: "That game can't be made yet" }, cors, 400);
    }
    if (url.pathname === '/me') {
      const cors = corsFor(req, env);
      if (!cors) return new Response('Forbidden', { status: 403 });
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      const who = await accountOf(req, env);
      if (!who) return json({ error: 'Log in to play online' }, cors, 401);
      return json({ profile: await env.PROFILES.get(env.PROFILES.idFromName(who.profile)).open(who.username) }, cors);
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
