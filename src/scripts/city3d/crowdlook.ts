/*
 * What the crowd wears, by district and role (the polish plan's Phase 8, the
 * owner's call: "varied by district and role ... seeded so neighbours never
 * match"). DOM-free, tested in tests/crowdlook.test.ts.
 *
 * `districtAt(x, z)` says which part of the city a person stands in (the town
 * unless they're in a named district), `roleOf()` what they're doing from what
 * life.ts knows (a jogger, a kid at play, someone at work, a bouncer, a
 * shopper...), and `cityOutfit(r, where)` dresses them from that district's
 * style (`STYLES`: its mix of kinds, its cloth, hats, shoes, lenses and
 * extras) with the role's own rules first (joggers and cyclists in track,
 * kids bright with the cap backwards, the Docks' and Southfield Yards' workers
 * in hi-vis, bouncers in black). `r` is a seeded generator (`seeded()` from
 * the person's own number), so an outfit is the same every visit and no two
 * neighbours share a seed.
 *
 * The instanced crowd groups its meshes by kind (character.ts createCrowd():
 * every kind is one more set of meshes a detail level), so a style's kinds are
 * fitted to what the crowd carries (`kinds`): the desktop crowd's four
 * (`CROWD_KINDS`: suits, hoodies, track, puffers), the phones' three
 * (`CROWD_KINDS_LIGHT`: one more than the two they had, the owner's call);
 * a kind the crowd hasn't got falls back to its nearest (a puffer to a suit
 * or a hoodie, track to a hoodie).
 */
import type { Outfit, OutfitKind } from './wardrobe';
import type { IdleAct, CrowdClip } from './crowdclips';
import { inTrenches } from './trenches';
import { inUptown } from './uptown';
import { NORTH_RECT } from './uptownnorth';
import { WESTLAKE_RECT } from './westlake';
import { inDocks } from './docks';
import { inYards } from './southfield';
import { CREST_RECT } from './crestmont';
import { inStrip } from './strip';
import { inSunridge } from './sunridge';
import { inLot9 } from './lot9';
import { MALL_AREA } from './mall';
import { SITE as AIRPORT_SITE } from './airfield';
import { KART_AREA } from './kartfacility';
import { RIVER, SOUTH_ROW } from './layout';

export type District = 'town' | 'trenches' | 'uptown' | 'park' | 'docks' | 'yards' | 'crest' | 'strip' | 'beach' | 'suburb' | 'lot9' | 'mall' | 'airport' | 'karts';
export type Role = 'walk' | 'idle' | 'jog' | 'kid' | 'worker' | 'guard' | 'shopper' | 'cyclist' | 'boater';

/** The kinds the crowd's meshes carry: the desktop's, and the phones' (one more than the two they had: the owner's call) */
export const CROWD_KINDS: readonly OutfitKind[] = ['suit', 'hoodie', 'track', 'puffer'];
export const CROWD_KINDS_LIGHT: readonly OutfitKind[] = ['suit', 'hoodie', 'track'];

export interface Where {
  district?: District;
  role?: Role;
  /** The kinds the crowd can draw (`CROWD_KINDS` if not said) */
  kinds?: readonly OutfitKind[];
}

/** A seeded generator from a number 0..1 (a person's own): the same outfit every visit */
export function seeded(seed: number): () => number {
  let a = (Math.floor(seed * 4294967296) ^ 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Where ---------- */

const inRect = (r: readonly number[], x: number, z: number) => x > r[0] && x < r[2] && z > r[1] && z < r[3];
/** The cove below the south row (river.ts's `beach` stretch, x -12 to 47): the blocks along it */
const BEACH: readonly number[] = [-12, RIVER[0], 47, SOUTH_ROW + 22];

export function districtAt(x: number, z: number): District {
  if (inTrenches(x, z)) return 'trenches';
  if (inUptown(x, z) || inRect(NORTH_RECT, x, z)) return 'uptown';
  if (inRect(WESTLAKE_RECT, x, z)) return 'park';
  if (inDocks(x, z)) return 'docks';
  if (inYards(x, z)) return 'yards';
  if (inRect(CREST_RECT, x, z)) return 'crest';
  if (inStrip(x, z)) return 'strip';
  if (inLot9(x, z)) return 'lot9';
  if (inSunridge(x, z)) return 'suburb';
  if (inRect(MALL_AREA, x, z)) return 'mall';
  if (inRect(AIRPORT_SITE, x, z)) return 'airport';
  if (inRect(KART_AREA, x, z)) return 'karts';
  if (inRect(BEACH, x, z)) return 'beach';
  return 'town';
}

/** What a person's doing, from what life.ts knows of them: their act standing, their size, the clip a mover plays, their id */
export function roleOf(p: { act?: IdleAct; scale?: number; clip?: CrowdClip; id?: string; shopper?: boolean }): Role {
  if (p.scale !== undefined && p.scale < 0.8) return 'kid';
  if (p.act === 'serve' || p.act === 'cook' || p.act === 'fish') return 'worker';
  if (p.act === 'guard') return 'guard';
  if (p.clip === 'jog') return 'jog';
  if (p.clip === 'row' || p.clip === 'pedal') return 'boater';
  if (p.id?.includes('cyclist')) return 'cyclist';
  if (p.shopper) return 'shopper';
  return p.act !== undefined || p.clip !== undefined ? 'idle' : 'walk';
}

/* ---------- The styles ---------- */

interface Style {
  /** Each kind's share (what's left after the ones named goes to the first) */
  mix: Partial<Record<OutfitKind, number>>;
  /** Suits: jackets (the trousers match, but a pale jacket over dark trousers now and then), ties; how often no tie */
  suits: string[];
  ties: string[];
  openCollar: number;
  /** The casual kinds' tops and bottoms */
  tops: string[];
  bottoms: string[];
  shoes: string[];
  /** Hats: the chance of each (the rest bare-headed), their colours; a hoodie's hood up */
  cap: number;
  beanie: number;
  bucket: number;
  hood: number;
  hats: string[];
  lenses: string[];
  /** Extras: a backpack, a crossbody bag, headphones, the shades' chain */
  backpack: number;
  crossbody: number;
  headphones: number;
  chain: number;
}

const INK = '#16141f';
const WHITE = '#f3f2f7';
const GREEN = '#22d07a';
/** The hi-vis the Docks' and Southfield Yards' workers wear */
export const HI_VIS = ['#f5c400', '#ff7a1a', '#ffb300'];

const TOWN: Style = {
  mix: { suit: 0.45, hoodie: 0.4, track: 0.1, puffer: 0.05 },
  suits: [INK, INK, '#1d2550', '#3b2a6a', WHITE, '#4a4a5a'],
  ties: ['#1f9d55', '#1f9d55', '#e219e5', '#00b8d8', '#d8312f', '#c99a4a'],
  openCollar: 0.1,
  tops: [INK, '#2a2350', '#e219e5', '#00a8d8', WHITE, '#ff6a3d', '#1f9d6a', '#8f3dff'],
  bottoms: ['#3a3a48', INK, '#4a4a5a'],
  shoes: [WHITE, WHITE, INK, '#ff6ad5', '#00b8d8', '#1b1830'],
  cap: 0.55,
  beanie: 0.06,
  bucket: 0.04,
  hood: 0.3,
  hats: ['#d8312f', '#d8312f', INK, WHITE],
  lenses: [GREEN, GREEN, GREEN, '#00eaff', '#ff6ad5'],
  backpack: 0.18,
  crossbody: 0.12,
  headphones: 0.2,
  chain: 0.2,
};
export const STYLES: Record<District, Style> = {
  town: TOWN,
  // Hoodies and track, hoods up, beanies, bold colours over dark bottoms
  trenches: {
    ...TOWN,
    mix: { hoodie: 0.5, track: 0.35, suit: 0.1, puffer: 0.05 },
    suits: [INK, INK, '#2b2b36'],
    tops: [INK, '#2a2350', '#8a1f2a', '#1f1f2a', '#e219e5', '#2a6a4a', '#ff6a3d', '#5a3a8a', '#b8862b'],
    bottoms: [INK, '#2b2b36', '#3a3a48', '#4a4a5a'],
    shoes: [WHITE, INK, '#d8312f', '#1b1830'],
    cap: 0.4,
    beanie: 0.3,
    bucket: 0.06,
    hood: 0.45,
    hats: [INK, INK, '#d8312f', '#8f3dff', '#4a4a5a'],
    lenses: [GREEN, GREEN, '#ffb300', '#ff6ad5', '#d8312f'],
    backpack: 0.12,
    crossbody: 0.1,
    headphones: 0.28,
    chain: 0.3,
  },
  // Lighter suits and smart coats, quiet ties, no caps to speak of
  uptown: {
    ...TOWN,
    mix: { suit: 0.7, puffer: 0.22, hoodie: 0.05, track: 0.03 },
    suits: ['#2a3550', '#3a3a48', '#5a5a6a', '#8a8fa0', '#c9c4b8', WHITE, INK],
    ties: ['#1d2550', '#7a1f2a', '#c99a4a', '#3a6a8a', '#5a5a6a'],
    openCollar: 0.25,
    tops: [INK, '#2a3550', '#c9b48a', '#5a5a6a', '#8a3a2a'],
    bottoms: ['#2a3550', '#3a3a48', INK],
    shoes: ['#1b1830', '#3a2418', INK, '#5a3a2a'],
    cap: 0.08,
    beanie: 0.04,
    bucket: 0,
    hood: 0.05,
    hats: [INK, '#3a3a48'],
    lenses: [GREEN, '#c99a4a', '#5a5a6a', '#00b8d8'],
    backpack: 0.04,
    crossbody: 0.14,
    headphones: 0.1,
    chain: 0.12,
  },
  // The park: track and hoodies in bright colours, caps and buckets
  park: {
    ...TOWN,
    mix: { track: 0.4, hoodie: 0.4, suit: 0.12, puffer: 0.08 },
    tops: ['#ff6a3d', '#00a8d8', '#1f9d6a', '#e219e5', '#ffd23f', '#8f3dff', WHITE, '#2a2350'],
    bottoms: ['#3a3a48', INK, '#2a2350', '#4a4a5a', '#7a8aa0'],
    shoes: [WHITE, WHITE, '#ff6ad5', '#00b8d8', '#ffd23f'],
    cap: 0.45,
    beanie: 0.04,
    bucket: 0.14,
    hood: 0.08,
    hats: ['#d8312f', WHITE, '#00a8d8', INK, '#ffd23f'],
    lenses: [GREEN, GREEN, '#00eaff', '#ffb300'],
    backpack: 0.22,
    crossbody: 0.06,
    headphones: 0.32,
    chain: 0.08,
  },
  // The port and the yards: work clothes, hi-vis on the workers
  docks: {
    ...TOWN,
    mix: { hoodie: 0.6, track: 0.2, puffer: 0.15, suit: 0.05 },
    suits: ['#3a3a48', '#2b2b36'],
    tops: ['#2b2b36', '#3a3a48', '#4a3a2a', '#1d2550', ...HI_VIS],
    bottoms: ['#2b2b36', '#3a3a48', '#1d2550', '#4a3a2a'],
    shoes: ['#3a2418', INK, '#5a3a2a'],
    cap: 0.3,
    beanie: 0.4,
    bucket: 0,
    hood: 0.2,
    hats: [INK, '#3a3a48', '#ff7a1a', '#d8312f'],
    lenses: [GREEN, '#5a5a6a', '#ffb300'],
    backpack: 0.1,
    crossbody: 0.04,
    headphones: 0.12,
    chain: 0.06,
  },
  yards: null!,
  // Crestmont: smart casual, pale suits with the collar open, pastels, bucket hats, gold lenses
  crest: {
    ...TOWN,
    mix: { suit: 0.45, hoodie: 0.3, track: 0.15, puffer: 0.1 },
    suits: ['#e9e4d6', '#c9b48a', WHITE, '#9fb3c8', '#8a8fa0', '#2a3550'],
    ties: ['#c99a4a', '#3a6a8a', '#7a1f2a'],
    openCollar: 0.55,
    tops: [WHITE, '#9fb3c8', '#e9b8c8', '#c9b48a', '#8fd0b8', '#ffd9a0', '#2a3550'],
    bottoms: ['#e9e4d6', '#c9b48a', '#3a3a48', '#7a8aa0', WHITE],
    shoes: [WHITE, '#c9b48a', '#3a2418', '#1b1830'],
    cap: 0.18,
    beanie: 0,
    bucket: 0.18,
    hood: 0.02,
    hats: [WHITE, '#c9b48a', '#e9e4d6', INK],
    lenses: ['#c99a4a', '#c99a4a', GREEN, '#ff6ad5'],
    backpack: 0.04,
    crossbody: 0.2,
    headphones: 0.08,
    chain: 0.3,
  },
  // The Neon Mile: party colours, chains, no green lenses
  strip: {
    ...TOWN,
    mix: { hoodie: 0.4, suit: 0.3, track: 0.2, puffer: 0.1 },
    suits: [WHITE, '#8f3dff', '#c99a4a', '#e219e5', INK, '#00a8d8'],
    ties: ['#e219e5', '#00b8d8', '#ffd23f', '#d8312f'],
    openCollar: 0.4,
    tops: ['#e219e5', '#00eaff', '#8f3dff', '#ffd23f', '#ff6ad5', '#ff6a3d', WHITE, INK],
    bottoms: [INK, '#2a2350', WHITE, '#4a1f9e'],
    shoes: [WHITE, '#ff6ad5', '#00b8d8', '#ffd23f', INK],
    cap: 0.3,
    beanie: 0.04,
    bucket: 0.1,
    hood: 0.1,
    hats: ['#e219e5', '#00eaff', WHITE, '#ffd23f', INK],
    lenses: ['#ff6ad5', '#00eaff', '#e219e5', '#ffd23f', '#8f3dff'],
    backpack: 0.06,
    crossbody: 0.14,
    headphones: 0.18,
    chain: 0.45,
  },
  // The cove: casual, pale and light, bucket hats, white shoes
  beach: {
    ...TOWN,
    mix: { hoodie: 0.5, track: 0.35, suit: 0.1, puffer: 0.05 },
    suits: [WHITE, '#9fb3c8', '#c9b48a'],
    openCollar: 0.6,
    tops: [WHITE, '#9fd8f0', '#ffd9a0', '#8fd0b8', '#ff9a7a', '#e9e4d6', '#00a8d8'],
    bottoms: [WHITE, '#e9e4d6', '#9fb3c8', '#3a3a48'],
    shoes: [WHITE, WHITE, '#ffd23f', '#00b8d8'],
    cap: 0.25,
    beanie: 0,
    bucket: 0.3,
    hood: 0.04,
    hats: [WHITE, '#e9e4d6', '#ffd23f', '#00a8d8'],
    lenses: ['#00eaff', GREEN, '#ffb300'],
    backpack: 0.14,
    crossbody: 0.08,
    headphones: 0.14,
    chain: 0.06,
  },
  // Sunridge: light casual, caps
  suburb: {
    ...TOWN,
    mix: { hoodie: 0.45, track: 0.3, suit: 0.15, puffer: 0.1 },
    suits: ['#8a8fa0', '#2a3550', '#c9c4b8'],
    openCollar: 0.4,
    tops: ['#9fb3c8', WHITE, '#e9b8c8', '#8fd0b8', '#ffd9a0', '#5a7aa0', '#c9b48a', '#d8312f'],
    bottoms: ['#3a3a48', '#7a8aa0', '#c9b48a', '#4a4a5a'],
    shoes: [WHITE, '#3a2418', '#1b1830', '#00b8d8'],
    cap: 0.5,
    beanie: 0.02,
    bucket: 0.08,
    hood: 0.06,
    hats: ['#d8312f', WHITE, '#1d2550', '#c9b48a'],
    lenses: [GREEN, GREEN, '#00eaff', '#c99a4a'],
    backpack: 0.16,
    crossbody: 0.08,
    headphones: 0.16,
    chain: 0.06,
  },
  // Lot 9: worn, faded, dark; beanies and hoods
  lot9: {
    ...TOWN,
    mix: { hoodie: 0.55, track: 0.3, suit: 0.05, puffer: 0.1 },
    suits: ['#3a3a48', '#4a3a2a'],
    tops: ['#4a4a5a', '#5a4a3a', '#6a5a4a', '#3a3a48', '#7a2a2a', '#2a4a3a', '#8a8070'],
    bottoms: ['#3a3a48', '#4a3a2a', '#5a5a6a', '#2b2b36'],
    shoes: ['#3a2418', INK, '#8a8070'],
    cap: 0.3,
    beanie: 0.3,
    bucket: 0.04,
    hood: 0.35,
    hats: ['#3a3a48', INK, '#5a4a3a', '#7a2a2a'],
    lenses: ['#5a5a6a', GREEN, '#ffb300'],
    backpack: 0.08,
    crossbody: 0.04,
    headphones: 0.1,
    chain: 0.08,
  },
  // The mall and Palm Court: shoppers, a lighter town
  mall: { ...TOWN, mix: { hoodie: 0.45, suit: 0.3, track: 0.15, puffer: 0.1 }, openCollar: 0.3, backpack: 0.1, crossbody: 0.22 },
  // The airport: travellers, suits with bags
  airport: { ...TOWN, mix: { suit: 0.55, hoodie: 0.3, puffer: 0.1, track: 0.05 }, backpack: 0.3, crossbody: 0.2, headphones: 0.3, cap: 0.3 },
  // The kart park: track suits in the teams' colours
  karts: {
    ...TOWN,
    mix: { track: 0.5, hoodie: 0.35, suit: 0.1, puffer: 0.05 },
    tops: ['#d8312f', '#00a8d8', '#ffd23f', '#1f9d6a', '#e219e5', '#ff6a3d', WHITE, INK],
    bottoms: [INK, '#3a3a48', '#2a2350'],
    cap: 0.6,
    beanie: 0.04,
    bucket: 0.04,
    hood: 0.1,
    hats: ['#d8312f', INK, WHITE, '#00a8d8'],
    headphones: 0.3,
  },
};
STYLES.yards = { ...STYLES.docks, lenses: [GREEN, '#5a5a6a'] };

/** The joggers' and cyclists' track: bright over dark */
const JOG = { tops: ['#ff6a3d', '#00a8d8', '#1f9d6a', '#e219e5', '#ffd23f', WHITE, '#8f3dff'], bottoms: [INK, '#3a3a48', '#2a2350'], shoes: [WHITE, '#ff6ad5', '#00b8d8', '#ffd23f'] };
/** The kids: bright, the cap backwards */
const KID = { tops: ['#ff6a3d', '#00a8d8', '#ffd23f', '#e219e5', '#1f9d6a', '#8f3dff', '#d8312f'], bottoms: ['#1d2550', INK, '#3a3a48', '#4a4a5a'], shoes: [WHITE, '#ff6ad5', '#00b8d8', '#ffd23f'] };

/* ---------- The pick ---------- */

const pick = <T>(r: () => number, a: readonly T[]) => a[Math.min(a.length - 1, Math.floor(r() * a.length))];
/** The nearest kind the crowd carries */
function fit(kind: OutfitKind, kinds: readonly OutfitKind[]): OutfitKind {
  if (kinds.includes(kind)) return kind;
  const next: Record<OutfitKind, OutfitKind[]> = { puffer: ['suit', 'hoodie'], track: ['hoodie', 'suit'], varsity: ['hoodie', 'suit'], hoodie: ['track', 'suit'], suit: ['puffer', 'hoodie'], soldier: ['suit'] };
  return next[kind].find((k) => kinds.includes(k)) ?? kinds[0];
}
/** A kind from the style's mix */
function kindOf(r: () => number, s: Style, kinds: readonly OutfitKind[]): OutfitKind {
  let u = r();
  for (const [k, share] of Object.entries(s.mix) as [OutfitKind, number][]) {
    if (u < share) return fit(k, kinds);
    u -= share;
  }
  return fit((Object.keys(s.mix) as OutfitKind[])[0], kinds);
}
/** A hat (or the hood) from the style's chances: at most one */
function hat(r: () => number, s: Style, kind: OutfitKind, out: Outfit) {
  let u = r();
  const colour = pick(r, s.hats);
  if (kind === 'hoodie' && u < s.hood) {
    out.hood = true;
    return;
  }
  if (kind === 'hoodie') u -= s.hood;
  if (u < s.cap) out.cap = colour;
  else if (u < s.cap + s.beanie) out.beanie = colour;
  else if (u < s.cap + s.beanie + s.bucket) out.bucket = colour;
}

/**
 * One person's outfit: the district's style with the role's rules, seeded. Kinds the crowd doesn't carry are fitted
 * to their nearest (`kinds`, `CROWD_KINDS` by default).
 */
export function cityOutfit(r: () => number, where: Where = {}): Outfit {
  const district = where.district ?? 'town';
  const role = where.role ?? 'walk';
  const kinds = where.kinds ?? CROWD_KINDS;
  const s = STYLES[district];
  const out: Outfit = { kind: 'hoodie', top: INK, bottom: INK, shoes: INK, build: 0.92 + r() * 0.2, height: 0.95 + r() * 0.1, lens: pick(r, s.lenses) };
  const extras = () => {
    if (r() < s.backpack) out.backpack = pick(r, ['#14121f', '#2a2350', '#d8312f', '#1f9d6a', WHITE]);
    else if (r() < s.crossbody) out.crossbody = pick(r, ['#14121f', '#8f3dff', '#c99a4a']);
    if (r() < s.headphones) out.headphones = pick(r, ['#14121f', WHITE, '#ff6ad5', '#00b8d8']);
    if (r() < s.chain) out.chain = true;
  };
  // The roles with a look of their own
  if (role === 'jog' || role === 'cyclist') {
    out.kind = fit('track', kinds);
    out.top = pick(r, JOG.tops);
    out.bottom = pick(r, JOG.bottoms);
    out.shoes = pick(r, JOG.shoes);
    if (r() < 0.5) out.cap = pick(r, [INK, WHITE, '#d8312f']);
    if (r() < 0.4) out.headphones = pick(r, [WHITE, '#14121f', '#ff6ad5']);
    return out;
  }
  if (role === 'kid') {
    out.kind = fit(r() < 0.6 ? 'track' : 'hoodie', kinds);
    out.top = pick(r, KID.tops);
    out.bottom = pick(r, KID.bottoms);
    out.shoes = pick(r, KID.shoes);
    const u = r();
    if (u < 0.45) {
      out.cap = pick(r, ['#d8312f', '#00a8d8', INK, WHITE]);
      out.capBack = r() < 0.6;
    } else if (u < 0.55 && out.kind === 'hoodie') out.hood = true;
    out.lens = pick(r, [GREEN, '#00eaff', '#ffb300']);
    return out;
  }
  if (role === 'guard') {
    out.kind = fit('suit', kinds);
    out.top = out.bottom = INK;
    out.shoes = '#1b1830';
    if (out.kind === 'suit') out.tie = r() < 0.5 ? INK : '#3a3a48';
    out.lens = '#2b2b36';
    out.chain = true;
    out.build = 1.06 + r() * 0.08;
    return out;
  }
  if (role === 'worker' && (district === 'docks' || district === 'yards')) {
    out.kind = fit('hoodie', kinds);
    out.top = pick(r, HI_VIS);
    out.bottom = pick(r, ['#2b2b36', '#1d2550', '#3a3a48']);
    out.shoes = pick(r, ['#3a2418', INK]);
    if (r() < 0.6) out.beanie = pick(r, [INK, '#3a3a48', '#ff7a1a']);
    out.lens = pick(r, ['#5a5a6a', GREEN]);
    return out;
  }
  // Everyone else: the district's style
  const kind = kindOf(r, s, kinds);
  out.kind = kind;
  if (kind === 'suit') {
    const top = pick(r, s.suits);
    out.top = top;
    // (a pale jacket over dark trousers now and then)
    out.bottom = (top === WHITE || top === '#e9e4d6' || top === '#c9c4b8') && r() < 0.5 ? pick(r, [INK, '#2a3550', '#3a3a48']) : top;
    out.shoes = pick(r, ['#1b1830', '#3a2418', INK, ...(district === 'crest' || district === 'beach' ? [WHITE] : [])]);
    if (r() >= s.openCollar) out.tie = pick(r, s.ties);
    hat(r, s, kind, out);
    extras();
    out.backpack = undefined;
    return out;
  }
  out.top = pick(r, s.tops);
  out.bottom = pick(r, s.bottoms);
  out.shoes = pick(r, s.shoes);
  // (a worker at a stall or a grill: a plain dark top, no bag)
  if (role === 'worker') {
    out.top = pick(r, [INK, '#2b2b36', '#3a3a48', '#4a3a2a']);
    if (r() < 0.4) out.cap = pick(r, s.hats);
    return out;
  }
  hat(r, s, kind, out);
  extras();
  return out;
}
