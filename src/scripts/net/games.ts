/*
 * The Multiplayer menu's games (docs/multiplayer-plan.md, "The Multiplayer
 * menu and its games"): the modes, their maps, and the games the Lobby keeps.
 *
 * - Public games are the hangout cities ("City 1", "City 2" as they fill),
 *   ids `city-1`, `city-2`...
 * - Private games are made from the menu and reached only by their link:
 *   ids `p` and ten letters and digits, too many to guess.
 *
 * Shared by the site and the game server. No DOM, no scene code.
 */

export type GameMode = 'hangout' | 'ffa' | 'tdm' | 'karts' | 'fight';
export type MapId = 'sector7' | 'junkyard' | 'circuit' | 'circuit-reverse' | 'fightclub';

export interface ModeInfo {
  name: string;
  /** One line for the mode's card */
  blurb: string;
  /** Most players in one game */
  size: number;
  /** Its maps, the first the default */
  maps: MapId[];
  /** Playable now (the rest say "coming soon") */
  ready: boolean;
}

export const MAP_NAMES: Record<MapId, string> = {
  sector7: 'Sector 7',
  junkyard: 'Junkyard',
  circuit: 'Kart park',
  'circuit-reverse': 'Kart park, reversed',
  fightclub: 'Fight Club',
};

/** Up to this many players in a hangout city; more cities open as they fill */
export const CITY_SIZE = 16;

export const GAME_MODES: Record<GameMode, ModeInfo> = {
  hangout: { name: 'Hangout', blurb: 'The whole city with other Degens. Walk, drive, fly and emote; nobody shoots.', size: CITY_SIZE, maps: ['sector7'], ready: true },
  ffa: { name: 'Free for all', blurb: 'Every Degen for themselves in an arena. 5 minutes or first to 25.', size: 8, maps: ['junkyard'], ready: false },
  tdm: { name: 'Team deathmatch', blurb: 'Four against four in an arena. 5 minutes or first to 50.', size: 8, maps: ['junkyard'], ready: false },
  karts: { name: 'Kart race', blurb: 'Up to eight at the kart park, rivals filling the grid.', size: 8, maps: ['circuit', 'circuit-reverse'], ready: false },
  fight: { name: 'Fight Club', blurb: 'One on one in the ring; everyone else watches and queues.', size: CITY_SIZE, maps: ['fightclub'], ready: false },
};
export const GAME_MODE_IDS = Object.keys(GAME_MODES) as GameMode[];

/** A game as the menu lists it */
export interface GameInfo {
  id: string;
  /** "City 1", or "Private game" */
  name: string;
  mode: GameMode;
  map: MapId;
  private: boolean;
}

/* ---------- Ids ---------- */

const CITY_ID = /^city-([1-9]\d{0,2})$/;
const PRIVATE_ID = /^p[a-z0-9]{10}$/;
/** The most hangout cities there can be */
export const MAX_CITIES = 500;

export const cityId = (n: number) => `city-${n}`;
export const cityName = (n: number) => `City ${n}`;
/** The city's number, or 0 when `id` isn't a hangout city */
export function cityOf(id: unknown) {
  const m = typeof id === 'string' ? CITY_ID.exec(id) : null;
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= MAX_CITIES ? n : 0;
}
export const isPrivateId = (id: unknown): id is string => typeof id === 'string' && PRIVATE_ID.test(id);
export const gameIdOk = (id: unknown): id is string => cityOf(id) > 0 || isPrivateId(id);

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
/** A private game's id from ten random bytes (crypto.getRandomValues on the server) */
export function privateId(bytes: Uint8Array) {
  let s = 'p';
  for (let i = 0; i < 10; i++) s += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  return s;
}

/* ---------- What the Lobby keeps ---------- */

/** A game's head count, refreshed when someone joins or leaves */
export interface Count {
  n: number;
  at: number;
}
/** A private game: what it is and when it was made */
export interface PrivateGame {
  mode: GameMode;
  map: MapId;
  made: number;
}

/** Head counts not refreshed for this long count as empty (a room that went away) */
export const STALE = 120_000;
/** A private game nobody has been in for this long is gone (its link stops working) */
export const PRIVATE_TTL = 24 * 3_600_000;

export const headCount = (c: Count | undefined, now: number) => (c && now - c.at < STALE ? c.n : 0);

/** The first hangout city with room (quick join, and the one always listed) */
export function pickCity(counts: Map<string, Count>, now: number) {
  for (let i = 1; i <= MAX_CITIES; i++) if (headCount(counts.get(cityId(i)), now) < CITY_SIZE) return i;
  return 1;
}

/** Is a private game still there: made or last played in within `PRIVATE_TTL` */
export function privateAlive(g: PrivateGame, c: Count | undefined, now: number) {
  return now - Math.max(g.made, c?.at ?? 0) < PRIVATE_TTL;
}

/** The game behind an id, or null (a city past the last, a private game that's gone or never was) */
export function gameOf(id: string, privates: Map<string, PrivateGame>, counts: Map<string, Count>, now: number): GameInfo | null {
  const n = cityOf(id);
  if (n) return { id, name: cityName(n), mode: 'hangout', map: 'sector7', private: false };
  const g = isPrivateId(id) ? privates.get(id) : undefined;
  if (!g || !privateAlive(g, counts.get(id), now)) return null;
  return { id, name: 'Private game', mode: g.mode, map: g.map, private: true };
}

/**
 * The public games of a mode for Browse: every hangout city with people in it, and the one quick
 * join would pick (so there's always one to join). Private games are never listed.
 */
export function listGames(mode: GameMode, counts: Map<string, Count>, now: number): GameInfo[] {
  if (mode !== 'hangout') return [];
  const open = pickCity(counts, now);
  const out: GameInfo[] = [];
  for (let i = 1; i <= MAX_CITIES; i++) {
    if (i !== open && headCount(counts.get(cityId(i)), now) === 0) continue;
    out.push({ id: cityId(i), name: cityName(i), mode: 'hangout', map: 'sector7', private: false });
  }
  return out;
}

/** A request to make a private game, checked: a mode that's ready and one of its maps */
export function cleanCreate(raw: unknown): { mode: GameMode; map: MapId } | null {
  if (!raw || typeof raw !== 'object') return null;
  const { mode, map } = raw as { mode?: unknown; map?: unknown };
  if (typeof mode !== 'string' || !Object.hasOwn(GAME_MODES, mode)) return null;
  const m = GAME_MODES[mode as GameMode];
  if (!m.ready) return null;
  const pick = map === undefined ? m.maps[0] : m.maps.find((x) => x === map);
  return pick ? { mode: mode as GameMode, map: pick } : null;
}
