/*
 * Player profiles: what a profile holds and what's allowed in it, shared by
 * the site and the game server (which checks everything a player sends).
 * No DOM, no scene code.
 *
 * Nothing here can carry typed text: names come from vetted word lists and
 * phrases are a fixed list, so nothing offensive or confidential appears in
 * public.
 */
import type { WeaponId } from '../city3d/combat-sim';

/* ---------- Guest names ---------- */

const ADJECTIVES = [
  'Neon', 'Pixel', 'Turbo', 'Cosmic', 'Chrome', 'Lucky', 'Rapid', 'Silent', 'Golden', 'Electric',
  'Midnight', 'Retro', 'Hyper', 'Laser', 'Velvet', 'Atomic', 'Arcade', 'Glitchy', 'Sonic', 'Jolly',
];
const NOUNS = [
  'Degen', 'Gummy', 'Voxel', 'Comet', 'Falcon', 'Tiger', 'Panda', 'Rocket', 'Diamond', 'Joystick',
  'Fox', 'Otter', 'Wizard', 'Ninja', 'Raccoon', 'Gecko', 'Phoenix', 'Yeti', 'Cobra', 'Badger',
];

/** "Neon Degen 042": `r` is any 0..1 random source */
export function guestName(r: () => number) {
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  return `${pick(ADJECTIVES)} ${pick(NOUNS)} ${String(Math.floor(r() * 1000)).padStart(3, '0')}`;
}
export function isGuestName(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = /^(\w+) (\w+) (\d{3})$/.exec(s);
  return !!m && ADJECTIVES.includes(m[1]) && NOUNS.includes(m[2]);
}

/* ---------- Ranks (cosmetic, from lifetime score) ---------- */

export const RANKS: { id: string; name: string; need: number }[] = [
  { id: 'rookie', name: 'Rookie', need: 0 },
  { id: 'cadet', name: 'Cadet', need: 1000 },
  { id: 'sharpshooter', name: 'Sharpshooter', need: 5000 },
  { id: 'marksman', name: 'Marksman', need: 15000 },
  { id: 'elite', name: 'Elite', need: 40000 },
  { id: 'legend', name: 'Legend', need: 100000 },
];
export function rankFor(total: number) {
  let r = RANKS[0];
  for (const k of RANKS) if (total >= k.need) r = k;
  return r;
}

/* ---------- Rifle finishes (cosmetic, from lifetime score) ---------- */

export type SkinId = 'olive' | 'ink' | 'neon';
export const SKINS: { id: SkinId; name: string; need: number }[] = [
  { id: 'olive', name: 'Field Olive', need: 0 },
  { id: 'ink', name: 'Black Ink', need: 2500 },
  { id: 'neon', name: 'Pulse Neon', need: 10000 },
];
export const skinUnlocked = (id: SkinId, total: number) => total >= (SKINS.find((s) => s.id === id)?.need ?? Infinity);

/* ---------- Wardrobe ---------- */

export type Hat = 'cap' | 'backcap' | 'beanie' | 'bucket' | 'crown';
export type Bag = 'backpack' | 'crossbody' | 'board';
export type Held = 'gummy' | 'coffee' | 'boombox';
export const HATS: Hat[] = ['cap', 'backcap', 'beanie', 'bucket', 'crown'];
export const BAGS: Bag[] = ['backpack', 'crossbody', 'board'];
export const HELD: Held[] = ['gummy', 'coffee', 'boombox'];

export interface Look {
  kind: 'suit' | 'hoodie' | 'track';
  top: string;
  bottom: string;
  tie: string;
  shoes: string;
  /** One thing on the head: a hat (or null), unless a hoodie's hood is up */
  hat: Hat | null;
  /** The hat's colour (the crown is always gold) */
  hatColor: string;
  hood: boolean;
  /** The shades' lens colour */
  lens: string;
  /** One bag at a time */
  bag: Bag | null;
  bagColor: string;
  /** In his right hand */
  held: Held | null;
  headphones: string | null;
  /** Gold chain on the shades */
  chain: boolean;
  /** Gold chain with a diamond round the neck */
  necklace: boolean;
}

export const PALETTE = {
  top: ['#16141f', '#2a2350', '#1d2550', '#3b2a6a', '#e219e5', '#00a8d8', '#f3f2f7', '#ff6a3d', '#1f9d6a', '#8f3dff', '#4a4a5a', '#d8312f'],
  bottom: ['#16141f', '#2a2350', '#1d2550', '#4a4a5a', '#f3f2f7', '#3a2418'],
  cap: ['#d8312f', '#16141f', '#f3f2f7', '#00a8d8', '#e219e5', '#1f9d6a', '#ffd23f'],
  tie: ['#1f9d55', '#e219e5', '#00b8d8', '#d8312f', '#c99a4a', '#16141f'],
  extra: ['#14121f', '#f3f2f7', '#ff6ad5', '#00b8d8', '#d8312f', '#1f9d6a', '#8f3dff'],
  shoes: ['#1b1830', '#f3f2f7', '#d8312f', '#00a8d8', '#e219e5', '#ffd23f', '#1f9d6a'],
  lens: ['#22d07a', '#ff3dbb', '#00d8ff', '#ffc23a', '#9b5cff', '#ff4a3a'],
};

/** Degen as he is in the art */
export const DEFAULT_LOOK: Look = {
  kind: 'suit',
  top: '#16141f',
  bottom: '#16141f',
  tie: '#1f9d55',
  shoes: '#1b1830',
  hat: 'cap',
  hatColor: '#d8312f',
  hood: false,
  lens: '#22d07a',
  bag: null,
  bagColor: '#00b8d8',
  held: 'gummy',
  headphones: null,
  chain: true,
  necklace: false,
};

/** Anything from a player, made safe: unknown values fall back to Degen's own look */
export function cleanLook(raw: unknown): Look {
  const o = { ...(raw && typeof raw === 'object' ? raw : {}) } as Record<string, unknown>;
  const from = <T extends string>(v: unknown, list: readonly T[], fallback: T) => (list.includes(v as T) ? (v as T) : fallback);
  const orNull = <T extends string>(v: unknown, list: readonly T[], fallback: T | null) => (v === null ? null : list.includes(v as T) ? (v as T) : fallback);
  // Looks saved before hats, bags and held items had their own fields
  if (o.hat === undefined) {
    o.hat = typeof o.beanie === 'string' ? 'beanie' : o.cap === null ? null : 'cap';
    o.hatColor = typeof o.beanie === 'string' ? o.beanie : o.cap;
  }
  if (o.bag === undefined && (typeof o.backpack === 'string' || typeof o.crossbody === 'string')) {
    o.bag = typeof o.backpack === 'string' ? 'backpack' : 'crossbody';
    o.bagColor = o.backpack ?? o.crossbody;
  }
  if (o.held === undefined && o.gummy === false) o.held = null;
  const kind = from(o.kind, ['suit', 'hoodie', 'track'] as const, DEFAULT_LOOK.kind);
  return {
    kind,
    top: from(o.top, PALETTE.top, DEFAULT_LOOK.top),
    bottom: from(o.bottom, PALETTE.bottom, DEFAULT_LOOK.bottom),
    tie: from(o.tie, PALETTE.tie, DEFAULT_LOOK.tie),
    shoes: from(o.shoes, PALETTE.shoes, DEFAULT_LOOK.shoes),
    hat: orNull(o.hat, HATS, DEFAULT_LOOK.hat),
    hatColor: from(o.hatColor, PALETTE.cap, DEFAULT_LOOK.hatColor),
    hood: kind === 'hoodie' && o.hood === true,
    lens: from(o.lens, PALETTE.lens, DEFAULT_LOOK.lens),
    bag: orNull(o.bag, BAGS, null),
    bagColor: from(o.bagColor, PALETTE.extra, DEFAULT_LOOK.bagColor),
    held: orNull(o.held, HELD, DEFAULT_LOOK.held),
    headphones: orNull(o.headphones, PALETTE.extra, null),
    chain: o.chain === undefined ? DEFAULT_LOOK.chain : o.chain === true,
    necklace: o.necklace === true,
  };
}

/* ---------- Emotes and phrases (fixed lists) ---------- */

export const EMOTES = [
  { id: 'wave', label: 'Wave', icon: '👋' },
  { id: 'dance', label: 'Dance', icon: '🕺' },
  { id: 'salute', label: 'Salute', icon: '🫡' },
  { id: 'cheer', label: 'Cheer', icon: '🙌' },
] as const;
export type EmoteId = (typeof EMOTES)[number]['id'];

export const PHRASES = [
  'GM degens',
  'GN degens',
  'LFG!',
  'Nice shot!',
  'GG',
  'Follow me',
  'Over here',
  'Meet at the Emporium',
  'Gear up at the Armoury',
  'Thanks!',
  'Sorry!',
  'BRB',
] as const;

/* ---------- The profile ---------- */

export interface PublicProfile {
  name: string;
  look: Look;
  skin: SkinId;
  total: number;
  /** The gun picked last time at the store (unlocked by lifetime score) */
  weapon: WeaponId;
}

/** A browser's own lifetime score counts once, up to this, when its first profile is made */
export const IMPORT_CAP = 5000;
