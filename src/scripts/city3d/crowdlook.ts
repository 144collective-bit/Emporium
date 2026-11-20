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
 * neighbours share a seed. `unmask()` then gives all but a few of them a face
 * instead of the balaclava (docs/faces-plan.md): a skin tone and hair, drawn
 * after the clothes so the clothes stay as they were.
 *
 * The instanced crowd groups its meshes by kind (character.ts createCrowd():
 * every kind is one more set of meshes a detail level), so a style's kinds are
 * fitted to what the crowd carries (`kinds`): the desktop crowd's four
 * (`CROWD_KINDS`: suits, hoodies, track, puffers), the phones' three
 * (`CROWD_KINDS_LIGHT`: one more than the two they had, the owner's call);
 * a kind the crowd hasn't got falls back to its nearest (a puffer to a suit
 * or a hoodie, track to a hoodie).
 */
import type { HairCut, Outfit, OutfitKind } from './wardrobe';
import { HAIR_DYE, HAIR_NATURAL, PALETTE, SHAPE_IDS, type Bottoms, type ShoeStyle } from '../net/profile-data';
import { inEndswood } from './endswood';
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
import { inAirbase } from './airbase';
import { MALL_AREA } from './mall';
import { SITE as AIRPORT_SITE } from './airfield';
import { KART_AREA } from './kartfacility';
import { RIVER, SOUTH_ROW } from './layout';

export type District = 'town' | 'trenches' | 'ends' | 'uptown' | 'park' | 'docks' | 'yards' | 'crest' | 'strip' | 'beach' | 'suburb' | 'lot9' | 'mall' | 'airport' | 'karts' | 'airbase';
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
  if (inEndswood(x, z)) return 'ends';
  if (inUptown(x, z) || inRect(NORTH_RECT, x, z)) return 'uptown';
  if (inRect(WESTLAKE_RECT, x, z)) return 'park';
  if (inDocks(x, z)) return 'docks';
  if (inYards(x, z)) return 'yards';
  if (inRect(CREST_RECT, x, z)) return 'crest';
  if (inStrip(x, z)) return 'strip';
  if (inLot9(x, z)) return 'lot9';
  if (inSunridge(x, z)) return 'suburb';
  if (inRect(MALL_AREA, x, z)) return 'mall';
  // (Northgate Air Base: everyone inside its fence is its own, docs/military-plan.md Phase 4)
  if (inAirbase(x, z)) return 'airbase';
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
  /*
   * The wardrobe by district (docs/wardrobe-plan.md Phase 8, the owner's call: "well dressed in the north and street
   * wear in the Ends and The Trenches"): what's worn on the legs and feet with a casual top (`legs`, `feet`) and with
   * a suit (`suitLegs`, `suitFeet`), each a share; how many of the caps are fitted (`fitted`) and of the beanies
   * skullies (`skully`); and the new bags' chances (a sling, a waist bag) after the backpack and crossbody (the chest
   * rig the players' only: one more shape on every person of a kind)
   */
  legs: Partial<Record<Bottoms, number>>;
  feet: Partial<Record<ShoeStyle, number>>;
  suitLegs: Partial<Record<Bottoms, number>>;
  suitFeet: Partial<Record<ShoeStyle, number>>;
  fitted: number;
  skully: number;
  sling: number;
  waist: number;
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
  legs: { joggers: 0.4, denim: 0.3, cargo: 0.15, chinos: 0.15 },
  feet: { sneaker: 0.6, runner: 0.25, hightop: 0.15 },
  suitLegs: { trousers: 0.85, chinos: 0.15 },
  suitFeet: { dress: 0.7, derby: 0.2, loafer: 0.1 },
  fitted: 0.2,
  skully: 0.3,
  sling: 0.05,
  waist: 0.05,
};
/** Streetwear: The Trenches and the Ends */
const STREET = {
  legs: { joggers: 0.3, denim: 0.3, cargo: 0.25, shorts: 0.15 },
  feet: { sneaker: 0.3, runner: 0.3, hightop: 0.25, slide: 0.15 },
  fitted: 0.45,
  skully: 0.55,
  sling: 0.12,
  waist: 0.12,
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
    ...STREET,
  },
  ends: null!,
  // Lighter suits and smart coats, quiet ties, no caps to speak of; well dressed: trousers or chinos, derbies and loafers
  // under the suits and the coats alike
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
    legs: { chinos: 0.6, trousers: 0.25, denim: 0.15 },
    feet: { loafer: 0.35, derby: 0.3, sneaker: 0.25, runner: 0.1 },
    suitLegs: { trousers: 0.7, chinos: 0.3 },
    suitFeet: { dress: 0.45, derby: 0.35, loafer: 0.2 },
    fitted: 0,
    skully: 0.4,
    sling: 0,
    waist: 0,
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
    legs: { joggers: 0.35, shorts: 0.3, chinos: 0.2, denim: 0.15 },
    feet: { sneaker: 0.4, runner: 0.4, hightop: 0.2 },
    suitLegs: { chinos: 0.6, trousers: 0.4 },
    suitFeet: { loafer: 0.5, derby: 0.3, dress: 0.2 },
    waist: 0.08,
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
    legs: { work: 0.45, cargo: 0.3, denim: 0.25 },
    feet: { boot: 0.6, sneaker: 0.25, runner: 0.15 },
    skully: 0.5,
    fitted: 0.1,
    sling: 0,
    waist: 0,
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
    legs: { chinos: 0.45, denim: 0.25, shorts: 0.2, joggers: 0.1 },
    feet: { loafer: 0.3, sneaker: 0.4, runner: 0.2, slide: 0.1 },
    suitLegs: { chinos: 0.6, trousers: 0.4 },
    suitFeet: { loafer: 0.5, derby: 0.25, dress: 0.25 },
    fitted: 0.1,
    sling: 0,
    waist: 0.04,
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
    legs: { denim: 0.35, joggers: 0.3, cargo: 0.15, chinos: 0.2 },
    feet: { runner: 0.3, hightop: 0.3, sneaker: 0.3, loafer: 0.1 },
    suitFeet: { loafer: 0.5, dress: 0.3, derby: 0.2 },
    fitted: 0.5,
    sling: 0.08,
    waist: 0.15,
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
    legs: { shorts: 0.6, chinos: 0.25, denim: 0.15 },
    feet: { slide: 0.45, sneaker: 0.35, runner: 0.2 },
    suitLegs: { chinos: 0.7, trousers: 0.3 },
    suitFeet: { loafer: 0.7, dress: 0.3 },
    waist: 0.08,
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
    legs: { denim: 0.35, chinos: 0.25, joggers: 0.2, shorts: 0.2 },
    feet: { sneaker: 0.45, runner: 0.35, slide: 0.1, hightop: 0.1 },
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
    legs: { cargo: 0.35, joggers: 0.3, denim: 0.25, work: 0.1 },
    feet: { boot: 0.35, sneaker: 0.3, hightop: 0.2, runner: 0.15 },
    fitted: 0.2,
    skully: 0.6,
  },
  // The mall and Palm Court: shoppers, a lighter town
  mall: {
    ...TOWN,
    mix: { hoodie: 0.45, suit: 0.3, track: 0.15, puffer: 0.1 },
    openCollar: 0.3,
    backpack: 0.1,
    crossbody: 0.22,
    legs: { denim: 0.3, joggers: 0.25, chinos: 0.25, cargo: 0.1, shorts: 0.1 },
    feet: { sneaker: 0.4, runner: 0.25, hightop: 0.15, slide: 0.1, loafer: 0.1 },
    waist: 0.08,
    sling: 0.06,
  },
  // The airport: travellers, suits with bags
  airport: {
    ...TOWN,
    mix: { suit: 0.55, hoodie: 0.3, puffer: 0.1, track: 0.05 },
    backpack: 0.3,
    crossbody: 0.2,
    headphones: 0.3,
    cap: 0.3,
    legs: { chinos: 0.35, joggers: 0.35, denim: 0.3 },
    feet: { sneaker: 0.5, runner: 0.3, loafer: 0.2 },
    suitFeet: { dress: 0.5, derby: 0.3, loafer: 0.2 },
  },
  // Northgate Air Base: its people in uniform, made up (no real force's): olive, khaki and navy in their PT kit (track),
  // their service dress (suits) and their working tops (hoodies, hoods down), mostly in caps, little else
  airbase: {
    ...TOWN,
    mix: { track: 0.45, suit: 0.3, hoodie: 0.25 },
    suits: ['#4f5a3d', '#3d4a5f', '#6b6650', '#2e3a2b', '#5a5f4a'],
    ties: ['#2e3a2b', '#1d2550', '#4f5a3d'],
    openCollar: 0.4,
    tops: ['#4f5a3d', '#5d6b52', '#6b6650', '#3d4a5f', '#7a7558', '#2e3a2b'],
    bottoms: ['#4f5a3d', '#3a3f32', '#6b6650', '#2f3640'],
    shoes: ['#1b1830', '#2a2420', '#3a2e24'],
    cap: 0.7,
    beanie: 0.06,
    bucket: 0.06,
    hood: 0,
    hats: ['#4f5a3d', '#3d4a5f', '#2e3a2b', '#6b6650'],
    backpack: 0.15,
    crossbody: 0,
    headphones: 0,
    chain: 0,
    legs: { chinos: 0.6, joggers: 0.4 },
    feet: { runner: 0.5, sneaker: 0.5 },
    suitFeet: { derby: 0.6, dress: 0.4 },
  },
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
    legs: { joggers: 0.5, cargo: 0.3, shorts: 0.2 },
    feet: { sneaker: 0.5, runner: 0.3, hightop: 0.2 },
  },
};
STYLES.yards = { ...STYLES.docks, lenses: [GREEN, '#5a5a6a'] };
// The Ends (Endswood): The Trenches' streetwear, more track and slides, fewer suits still
STYLES.ends = {
  ...STYLES.trenches,
  mix: { hoodie: 0.5, track: 0.4, puffer: 0.05, suit: 0.05 },
  feet: { sneaker: 0.3, runner: 0.25, hightop: 0.2, slide: 0.25 },
  waist: 0.15,
};

/** The joggers' and cyclists' track: bright over dark */
const JOG = { tops: ['#ff6a3d', '#00a8d8', '#1f9d6a', '#e219e5', '#ffd23f', WHITE, '#8f3dff'], bottoms: [INK, '#3a3a48', '#2a2350'], shoes: [WHITE, '#ff6ad5', '#00b8d8', '#ffd23f'] };
/** The kids: bright, the cap backwards */
const KID = { tops: ['#ff6a3d', '#00a8d8', '#ffd23f', '#e219e5', '#1f9d6a', '#8f3dff', '#d8312f'], bottoms: ['#1d2550', INK, '#3a3a48', '#4a4a5a'], shoes: [WHITE, '#ff6ad5', '#00b8d8', '#ffd23f'] };

/* ---------- The pick ---------- */

const pick = <T>(r: () => number, a: readonly T[]) => a[Math.min(a.length - 1, Math.floor(r() * a.length))];
/** One of a style's shares (`{ denim: 0.3, ... }`), by its share */
function weighted<K extends string>(r: () => number, w: Partial<Record<K, number>>): K {
  const e = Object.entries(w) as [K, number][];
  let u = r() * e.reduce((t, [, v]) => t + v, 0);
  for (const [k, v] of e) if ((u -= v) < 0) return k;
  return e[e.length - 1][0];
}
/** The nearest kind the crowd carries */
function fit(kind: OutfitKind, kinds: readonly OutfitKind[]): OutfitKind {
  if (kinds.includes(kind)) return kind;
  const next: Record<OutfitKind, OutfitKind[]> = { puffer: ['suit', 'hoodie'], track: ['hoodie', 'suit'], varsity: ['hoodie', 'suit'], bomber: ['hoodie', 'suit'], coach: ['track', 'hoodie', 'suit'], vest: ['puffer', 'hoodie', 'suit'], tee: ['hoodie', 'suit'], shell: ['track', 'hoodie', 'suit'], trucker: ['hoodie', 'suit'], hivis: ['track', 'hoodie', 'suit'], hivisjacket: ['track', 'hoodie', 'suit'], chore: ['hoodie', 'suit'], coveralls: ['suit', 'hoodie'], blazer: ['suit', 'hoodie'], shirt: ['suit', 'hoodie'], double: ['suit'], waistcoat: ['suit'], overcoat: ['suit', 'puffer'], hoodie: ['track', 'suit'], suit: ['puffer', 'hoodie'], soldier: ['suit'] };
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
  // (a share of the caps fitted, flat brimmed; of the beanies skullies)
  const style = r();
  if (u < s.cap) {
    out.cap = colour;
    if (style < s.fitted) out.capFlat = true;
  } else if (u < s.cap + s.beanie) {
    out.beanie = colour;
    if (style < s.skully) out.skully = true;
  } else if (u < s.cap + s.beanie + s.bucket) out.bucket = colour;
}

/**
 * One person's outfit: the district's style with the role's rules, seeded. Kinds the crowd doesn't carry are fitted
 * to their nearest (`kinds`, `CROWD_KINDS` by default).
 */
export function cityOutfit(r: () => number, where: Where = {}): Outfit {
  // (the face is drawn after the clothes, so the clothes are what they were before faces came)
  return unmask(r, clothed(r, where), where.role ?? 'walk', where.district ?? 'town');
}

/* ---------- Faces (docs/faces-plan.md) ---------- */

/** How many of the crowd still wear the balaclava and shades (the bouncers all do) */
export const MASKED_SHARE = 0.15;
/** Skin tones, pale to deep: made-up flat tones under the key light, none bright enough to bloom */
// (the players' own: profile-data.ts `PALETTE`)
export const SKIN_TONES: readonly string[] = PALETTE.tone;
/** Hair: the natural shades (black twice as often), and now and then a dyed one (more of those on the Neon Mile and in The Trenches) */
export const HAIR_COLORS: readonly string[] = ['#16141f', ...HAIR_NATURAL];
export const HAIR_DYES: readonly string[] = HAIR_DYE;
/** The cuts and how often each is seen (and bald for the rest) */
const CUTS: readonly [HairCut, number][] = [
  ['buzz', 0.2],
  ['crop', 0.26],
  ['curls', 0.14],
  ['bun', 0.1],
  ['twists', 0.08],
  ['hightop', 0.06],
  ['long', 0.08],
];

/** Unmasked, a skin tone and hair, seeded (all but `MASKED_SHARE` of the crowd, and never the bouncers) */
export function unmask(r: () => number, o: Outfit, role: Role = 'walk', district: District = 'town'): Outfit {
  const masked = r() < MASKED_SHARE;
  const skin = pick(r, SKIN_TONES);
  const u = r();
  let acc = 0;
  const cut = CUTS.find(([, p]) => (acc += p) > u)?.[0];
  const dyed = r() < (district === 'strip' || district === 'trenches' ? 0.14 : 0.05);
  const hair = dyed ? pick(r, HAIR_DYES) : pick(r, HAIR_COLORS);
  // (Phase 3: the head's proportions; half the crowd the standard)
  const shape = r() < 0.5 ? 'standard' : pick(r, SHAPE_IDS.slice(1));
  if (role === 'guard' || masked) return o;
  return { ...o, face: true, skin, headShape: shape, ...(cut || role === 'kid' ? { hair, cut: cut ?? 'crop' } : {}) };
}

function clothed(r: () => number, where: Where): Outfit {
  const district = where.district ?? 'town';
  const role = where.role ?? 'walk';
  const kinds = where.kinds ?? CROWD_KINDS;
  const s = STYLES[district];
  const out: Outfit = { kind: 'hoodie', top: INK, bottom: INK, shoes: INK, build: 0.92 + r() * 0.2, height: 0.95 + r() * 0.1, lens: pick(r, s.lenses) };
  const extras = () => {
    if (r() < s.backpack) out.backpack = pick(r, ['#14121f', '#2a2350', '#d8312f', '#1f9d6a', WHITE]);
    else if (r() < s.crossbody) out.crossbody = pick(r, ['#14121f', '#8f3dff', '#c99a4a']);
    else {
      // (the wardrobe's newer bags, by district: Phase 8)
      const u = r();
      const bag = pick(r, ['#14121f', '#2b2b36', '#465530', '#c99a4a', '#8f3dff']);
      if (u < s.sling) out.sling = bag;
      else if (u < s.sling + s.waist) out.waist = bag;
    }
    if (r() < s.headphones) out.headphones = pick(r, ['#14121f', WHITE, '#ff6ad5', '#00b8d8']);
    if (r() < s.chain) out.chain = true;
  };
  // The roles with a look of their own
  if (role === 'jog' || role === 'cyclist') {
    out.kind = fit('track', kinds);
    out.top = pick(r, JOG.tops);
    out.bottom = pick(r, JOG.bottoms);
    out.shoes = pick(r, JOG.shoes);
    // (in shorts or track pants, runners or trainers)
    out.bottoms = r() < 0.4 ? 'shorts' : out.kind === 'track' ? 'trackpants' : 'joggers';
    out.shoeStyle = r() < 0.6 ? 'runner' : 'sneaker';
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
    // (work trousers or cargo, work boots; a hard hat on a good share, else the beanie)
    out.bottoms = r() < 0.7 ? 'work' : 'cargo';
    out.shoeStyle = 'boot';
    const u = r();
    if (u < 0.4) out.hardhat = pick(r, [WHITE, '#f5c400', '#ff7a1a']);
    else if (u < 0.75) out.beanie = pick(r, [INK, '#3a3a48', '#ff7a1a']);
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
    // (the district's: trousers or chinos, dress shoes, derbies or loafers; chinos in a pale stone or a dark cotton)
    out.bottoms = weighted(r, s.suitLegs);
    if (out.bottoms === 'chinos') out.bottom = pick(r, ['#c8b58a', '#e9e4d6', '#3a3a48', '#2a3550']);
    out.shoeStyle = weighted(r, s.suitFeet);
    if (r() >= s.openCollar) out.tie = pick(r, s.ties);
    hat(r, s, kind, out);
    extras();
    out.backpack = undefined;
    return out;
  }
  out.top = pick(r, s.tops);
  out.bottom = pick(r, s.bottoms);
  out.shoes = pick(r, s.shoes);
  // The district's legs and feet (a track top mostly with its own pants); leather in a leather's colours
  out.bottoms = kind === 'track' && r() < 0.7 ? 'trackpants' : weighted(r, s.legs);
  out.shoeStyle = weighted(r, s.feet);
  // (the smart pieces stay with the suits and the coats: a hoodie or a track top in chinos and loafers would be one
  // more set of shapes in every hoodie's and track top's mesh, for a look the crowd hardly wears)
  if (kind !== 'puffer') {
    if (out.bottoms === 'chinos' || out.bottoms === 'trousers') out.bottoms = 'denim';
    if (out.shoeStyle === 'loafer' || out.shoeStyle === 'derby' || out.shoeStyle === 'dress') out.shoeStyle = 'sneaker';
  }
  if (out.bottoms === 'denim') out.bottom = pick(r, ['#2a3a5a', '#3f5f9a', '#1d2550', INK, '#5a6a8a']);
  if (out.bottoms === 'chinos') out.bottom = pick(r, ['#c8b58a', '#e9e4d6', '#3a3a48', '#2a3550']);
  if (out.shoeStyle === 'boot' || out.shoeStyle === 'loafer' || out.shoeStyle === 'derby') out.shoes = pick(r, ['#3a2418', '#5a3a2a', INK, '#1b1830']);
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
