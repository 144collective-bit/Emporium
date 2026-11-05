/*
 * A player's card (docs/account-plan.md Phase 5): what other players see of
 * you when they tap your name online, and the top of your own profile. Worked
 * out from the city's game save, the same way in the browser (your own
 * profile, from this browser's save) and on the server (anyone else's, from
 * the save the server checked and holds: saves.ts `card()`), so what others
 * see is what the checks let through.
 *
 * Never on a card: Dorras, worth or anything with a price, and never a
 * wallet address. A guest has no save on the server, so a guest's card is
 * their name, rank and target score only (`account: false`).
 *
 * DOM-free: the server bundles it. Tested in tests/card.test.ts.
 */
import { levelFor, titleFor } from '../city3d/catalog';
import { CUP_IDS } from '../city3d/kart-cups';
import { PIN_MAX, type TycoonSave } from '../city3d/tycoon';

/** What a save shows of the city's game */
export interface GameCard {
  level: number;
  title: string;
  /** The badges shown first (at most PIN_MAX), then how many there are */
  pinned: string[];
  badges: number;
  /** Seconds played */
  played: number;
  karts: {
    races: number;
    wins: number;
    podiums: number;
    /** Cups won */
    trophies: number;
    /** The fastest lap on each course, whichever class it was set in (`course:class` keys) */
    laps: { key: string; lap: number }[];
  };
  fights: { wins: number; losses: number; kos: number; partners: number; chain: number };
}
export interface PlayerCard {
  name: string;
  /** Target practice's rank and lifetime score */
  rank: string;
  score: number;
  /** Logged in with a wallet: only an account's game is on the server */
  account: boolean;
  /** When the profile was made (ms) */
  since?: number;
  game?: GameCard;
}

/** The courses' records kept, fastest lap each */
const LAPS_MAX = 4;

export function gameCard(s: TycoonSave): GameCard {
  const best = new Map<string, { key: string; lap: number }>();
  for (const [key, t] of Object.entries(s.karts.records)) {
    const course = key.split(':')[0];
    if (!(t.lap > 0)) continue;
    const had = best.get(course);
    if (!had || t.lap < had.lap) best.set(course, { key, lap: t.lap });
  }
  const c = s.counters;
  return {
    level: levelFor(s.xp),
    title: titleFor(levelFor(s.xp)),
    pinned: s.pinned.filter((id) => s.badges.includes(id)).slice(0, PIN_MAX),
    badges: s.badges.length,
    played: s.played,
    karts: {
      races: c.kartRaces,
      wins: c.kartWins,
      podiums: c.podiums,
      trophies: CUP_IDS.filter((id) => s.karts.trophies[id] === 1).length,
      laps: [...best.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(0, LAPS_MAX),
    },
    fights: { wins: s.fight.wins, losses: s.fight.losses, kos: s.fight.kos, partners: c.partnersBeaten, chain: s.fight.bestChain },
  };
}

/** What you own, for your own profile only (never on a card) */
export function ownsOf(s: TycoonSave) {
  return {
    vehicles: s.garage.owned.length,
    karts: s.karts.owned.length,
    guns: s.armoury.owned.length,
    clothes: s.wardrobe.length,
    places: s.units.filter(Boolean).length + s.lots.filter(Boolean).length + s.corners.filter(Boolean).length,
    styles: Math.max(0, s.fight.styles.length - 1),
  };
}

/* ---------- A card off the wire, made safe (the browser shows it as text) ---------- */

const n = (v: unknown, max = 1e14) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const SLUG = /^[a-z0-9-]{1,40}$/;
const KEY = /^[a-z0-9-]{1,40}:[a-z0-9-]{1,20}$/;

export function cleanGameCard(raw: unknown): GameCard | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = obj(raw);
  const k = obj(o.karts);
  const f = obj(o.fights);
  const level = Math.max(1, n(o.level, 1000));
  return {
    level,
    title: str(o.title, 40) || titleFor(level),
    pinned: (Array.isArray(o.pinned) ? o.pinned : []).filter((id): id is string => typeof id === 'string' && SLUG.test(id)).slice(0, PIN_MAX),
    badges: n(o.badges, 1000),
    played: n(o.played),
    karts: {
      races: n(k.races),
      wins: n(k.wins),
      podiums: n(k.podiums),
      trophies: n(k.trophies, 100),
      laps: (Array.isArray(k.laps) ? k.laps : [])
        .map(obj)
        .filter((l) => typeof l.key === 'string' && KEY.test(l.key) && typeof l.lap === 'number' && l.lap > 0 && l.lap < 3600)
        .map((l) => ({ key: l.key as string, lap: l.lap as number }))
        .slice(0, LAPS_MAX),
    },
    fights: { wins: n(f.wins), losses: n(f.losses), kos: n(f.kos), partners: n(f.partners, 100), chain: n(f.chain, 1000) },
  };
}
export function cleanCard(raw: unknown): PlayerCard | null {
  const o = obj(raw);
  const name = str(o.name, 40).trim();
  if (!name) return null;
  const since = n(o.since);
  return { name, rank: str(o.rank, 20) || 'rookie', score: n(o.score), account: o.account === true, since: since || undefined, game: o.account === true ? cleanGameCard(o.game) : undefined };
}

/** "3 h 20 min", "45 min", "under a minute" */
export function playTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  if (m < 1) return 'under a minute';
  const h = Math.floor(m / 60);
  return h ? `${h} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`;
}
