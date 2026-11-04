/*
 * Sector 7 game server (Cloudflare Worker).
 *
 * - GET /health: a quick "ok".
 * - GET /play (WebSocket): the Lobby picks a city with room (16 players each,
 *   more cities open as they fill) and the connection is handed to that city's
 *   Room, which runs the game and talks to each player's Profile.
 *
 * - /auth (HTTP, JSON): logging in with a wallet and its basic profile, logging out everywhere and
 *   deleting the account, see accounts.ts.
 * - /save (HTTP, JSON): a logged-in wallet's cloud save, see saves.ts (docs/account-plan.md):
 *   GET /save, POST /save/lease, PUT /save, GET /save/history, POST /save/restore.
 * - Everything else: the website itself (static files built into ../dist).
 *
 * Only pages listed in ALLOWED_ORIGINS can connect.
 */
import { Accounts } from './accounts';
import { Lobby } from './lobby';
import { Profile } from './profile';
import { Room } from './room';
import { Saves } from './saves';
import { walletKey } from './keys';
import { SAVE_MAX } from '../../src/scripts/net/savecheck';

export { Accounts, Lobby, Profile, Room, Saves };

export interface Env {
  LOBBY: DurableObjectNamespace<Lobby>;
  ROOMS: DurableObjectNamespace<Room>;
  PROFILES: DurableObjectNamespace<Profile>;
  ACCOUNTS: DurableObjectNamespace<Accounts>;
  SAVES: DurableObjectNamespace<Saves>;
  /** The built website (wrangler.jsonc "assets") */
  ASSETS?: Fetcher;
  ALLOWED_ORIGINS: string;
  /** The network wallets log in on: 943 (PulseChain Testnet v4) or 369 (PulseChain) */
  AUTH_CHAIN_ID?: string;
}

const allowed = (origin: string | null, env: Env) => !!origin && env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).includes(origin);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (status: number, message: string) => json({ error: message }, status);
const bearer = (auth: string | null) => /^Bearer ([0-9a-f]{64})$/.exec(auth ?? '')?.[1] ?? null;

/**
 * An HTTP call from a page: only from the allowed pages (a page served from this Worker itself
 * sends no Origin on a plain GET; anything that changes something always comes with one), with
 * CORS headers for them and never cached.
 */
async function api(req: Request, env: Env, handle: () => Promise<Response>): Promise<Response> {
  const origin = req.headers.get('Origin');
  const sameSite = !origin && req.method === 'GET';
  if (!sameSite && !allowed(origin, env)) return new Response('Forbidden', { status: 403 });
  const cors: Record<string, string> = origin
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      }
    : {};
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const res = await handle();
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
  out.headers.set('Cache-Control', 'no-store');
  return out;
}

/** /save: the logged-in wallet's cloud save */
async function save(req: Request, env: Env, path: string): Promise<Response> {
  try {
    const address = await env.ACCOUNTS.get(env.ACCOUNTS.idFromName('main')).check(bearer(req.headers.get('Authorization')));
    if (!address) return fail(401, 'Log in with your wallet');
    const saves = env.SAVES.get(env.SAVES.idFromName(await walletKey(address)));
    const body = async () => {
      const text = await req.text();
      if (text.length > SAVE_MAX + 64_000) return 'big' as const;
      try {
        const v = JSON.parse(text);
        return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    };
    if (req.method === 'GET' && path === '/save') return json(await saves.get(new URL(req.url).searchParams.get('lease') ?? undefined));
    if (req.method === 'GET' && path === '/save/history') return json(await saves.history());
    if (req.method === 'POST' && path === '/save/lease') return json(await saves.lease());
    if ((req.method === 'PUT' && path === '/save') || (req.method === 'POST' && path === '/save/restore')) {
      const b = await body();
      if (b === 'big') return fail(413, 'Too big');
      if (!b) return fail(400, 'Expected JSON');
      const res = path === '/save' ? await saves.put(b.lease, b.base, b.saves) : await saves.restore(b.lease, b.day);
      return json(res, res.ok ? 200 : res.why === 'check' ? 422 : res.why === 'slow' ? 429 : res.why === 'day' ? 404 : 409);
    }
    return fail(404, 'Not found');
  } catch (e) {
    console.error('save', e);
    return fail(500, 'Something went wrong');
  }
}

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
    if (url.pathname.startsWith('/auth/')) return api(req, env, () => env.ACCOUNTS.get(env.ACCOUNTS.idFromName('main')).fetch(req));
    const savePath = url.pathname.replace(/\/$/, '');
    if (savePath === '/save' || savePath.startsWith('/save/')) return api(req, env, () => save(req, env, savePath));
    return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Sector 7 game server', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
