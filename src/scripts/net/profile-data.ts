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
import { FREE_PLAY } from '../city3d/freeplay';

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
// Free play (freeplay.ts): every finish open from the start
if (FREE_PLAY) for (const s of SKINS) s.need = 0;
export const skinUnlocked = (id: SkinId, total: number) => total >= (SKINS.find((s) => s.id === id)?.need ?? Infinity);

/* ---------- Wardrobe ---------- */

/*
 * The whole wardrobe is free and open to everyone, in any colour
 * (docs/wardrobe-plan.md Phase 1, the owner's call): nothing here is bought
 * or locked. The crown, halo, top hat, cowboy hat, wings and the things in
 * the hand (coffee, boombox, phone, briefcase) were retired with it, and the
 * gold and holo colour packs went once any colour could be picked; looks
 * saved with them come back without them (`cleanLook()`).
 */
export type Hat = 'cap' | 'backcap' | 'beanie' | 'bucket' | 'fitted' | 'skully' | 'hardhat';
export type Bag = 'backpack' | 'crossbody' | 'board' | 'duffel' | 'sling' | 'chestrig' | 'waist';
export type LookKind = 'suit' | 'hoodie' | 'track' | 'varsity' | 'puffer' | 'bomber' | 'coach' | 'vest' | 'tee' | 'shell' | 'trucker' | 'hivis' | 'hivisjacket' | 'chore' | 'coveralls' | 'blazer' | 'shirt' | 'double' | 'waistcoat' | 'overcoat';
export const KINDS: LookKind[] = ['suit', 'hoodie', 'track', 'varsity', 'puffer', 'bomber', 'coach', 'vest', 'tee', 'shell', 'trucker', 'hivis', 'hivisjacket', 'chore', 'coveralls', 'blazer', 'shirt', 'double', 'waistcoat', 'overcoat'];
export const HATS: Hat[] = ['cap', 'backcap', 'beanie', 'bucket', 'fitted', 'skully', 'hardhat'];
/*
 * Separates (docs/wardrobe-plan.md Phase 2): the top, the bottoms and the shoes are chosen on their own, worn in any
 * pairing. A look saved before them wears what its top came with: the suit its trousers and dress shoes, the track
 * top its track pants, the rest joggers, all but the suit sneakers (`bottomsFor()`, `shoesFor()`).
 */
export type Bottoms = 'trousers' | 'joggers' | 'trackpants' | 'cargo' | 'shorts' | 'denim' | 'work' | 'chinos';
export const BOTTOMS: Bottoms[] = ['trousers', 'joggers', 'trackpants', 'cargo', 'shorts', 'denim', 'work', 'chinos'];
export type ShoeStyle = 'dress' | 'sneaker' | 'hightop' | 'runner' | 'slide' | 'boot' | 'loafer' | 'derby';
export const SHOE_STYLES: ShoeStyle[] = ['dress', 'sneaker', 'hightop', 'runner', 'slide', 'boot', 'loafer', 'derby'];
/** The bottoms a top came with before the separates */
export const bottomsFor = (kind: string): Bottoms => (kind === 'suit' ? 'trousers' : kind === 'track' ? 'trackpants' : 'joggers');
/** The shoes a top came with before the separates */
export const shoesFor = (kind: string): ShoeStyle => (kind === 'suit' ? 'dress' : 'sneaker');
/** The shades' styles (docs/wardrobe-plan.md Phase 4): Degen's own (classic, as in the art, thinner now) and four more */
export type EyeStyle = 'classic' | 'aviator' | 'round' | 'slim' | 'wrap';
export const EYE_STYLES: { id: EyeStyle; name: string }[] = [
  { id: 'classic', name: 'Classic' },
  { id: 'aviator', name: 'Aviator' },
  { id: 'round', name: 'Round' },
  { id: 'slim', name: 'Slim' },
  { id: 'wrap', name: 'Sport Wrap' },
];
export const EYE_IDS = EYE_STYLES.map((e) => e.id);
/**
 * Face gear (the wardrobe plan's Phase 4, the owner's picks): a full gas mask and goggles (each in place of the shades
 * while worn), a half respirator (with any shades)
 */
export type FaceGear = 'gasmask' | 'respirator' | 'safety' | 'ski';
export const FACE_GEAR: { id: FaceGear; name: string }[] = [
  { id: 'gasmask', name: 'Gas Mask' },
  { id: 'respirator', name: 'Respirator' },
  { id: 'safety', name: 'Safety Goggles' },
  { id: 'ski', name: 'Ski Goggles' },
];
export const FACE_IDS = FACE_GEAR.map((f) => f.id);
/** Whether face gear covers the eyes (the shades come off for it) */
export const coversEyes = (f: FaceGear | null | undefined) => f === 'gasmask' || f === 'safety' || f === 'ski';
/*
 * The ranges (the wardrobe plan's Phase 2): how the fitting room sorts the clothes, for browsing only (any piece goes
 * with any other). Work wear arrives in Phase 6.
 */
export type Range = 'street' | 'business' | 'work';
export const RANGES: { id: Range; name: string }[] = [
  { id: 'street', name: 'Streetwear' },
  { id: 'business', name: 'Business' },
  { id: 'work', name: 'Work' },
];
export const BAGS: Bag[] = ['backpack', 'crossbody', 'board', 'duffel', 'sling', 'chestrig', 'waist'];

/*
 * Merch (character rebuild Phase 4): made-up marks for the clothes, drawn in
 * the city's style (logos.ts), placeholders until the merch store's own
 * designs go in, each a single swap (no real brand, nothing about the
 * token). Every mark and every all-over pattern is free.
 */
export type MarkId = 'diamond' | 'seven' | 'bolt' | 'star' | 'heart' | 'wave' | 'eye' | 'mask';
export const MARKS: { id: MarkId; name: string }[] = [
  { id: 'diamond', name: 'Emporium Diamond' },
  { id: 'seven', name: 'Sector 7' },
  { id: 'bolt', name: 'Bolt' },
  { id: 'star', name: 'Star' },
  { id: 'heart', name: 'Heart' },
  { id: 'wave', name: 'Wave' },
  { id: 'eye', name: 'Eye' },
  { id: 'mask', name: 'Degen Mask' },
];
export const MARK_IDS = MARKS.map((m) => m.id);
/** Where the top's mark goes: the left chest, big on the front, big on the back, or the left sleeve */
export type MarkSlot = 'chest' | 'centre' | 'back' | 'sleeve';
export const MARK_SLOTS: { id: MarkSlot; name: string }[] = [
  { id: 'chest', name: 'Chest' },
  { id: 'centre', name: 'Front' },
  { id: 'back', name: 'Back' },
  { id: 'sleeve', name: 'Sleeve' },
];
export const SLOT_IDS = MARK_SLOTS.map((m) => m.id);
/** An all-over print on the top */
export type PatternId = 'plain' | 'stripes' | 'checks' | 'fade' | 'camo';
export const PATTERNS: { id: PatternId; name: string }[] = [
  { id: 'plain', name: 'Plain' },
  { id: 'stripes', name: 'Stripes' },
  { id: 'checks', name: 'Checks' },
  { id: 'fade', name: 'Fade' },
  { id: 'camo', name: 'Camo' },
];
export const PATTERN_IDS = PATTERNS.map((p) => p.id);

/*
 * The face (docs/faces-plan.md Phase 2): Degen in the balaclava and shades as in the art, or unmasked, his face in a
 * skin tone with a haircut and its colour (all free), the shades on or off.
 */
export type Cut = 'buzz' | 'crop' | 'curls' | 'bun' | 'twists' | 'hightop' | 'long' | 'bald';
export const CUTS: { id: Cut; name: string }[] = [
  { id: 'buzz', name: 'Buzz' },
  { id: 'crop', name: 'Crop' },
  { id: 'curls', name: 'Curls' },
  { id: 'bun', name: 'Bun' },
  { id: 'twists', name: 'Twists' },
  { id: 'hightop', name: 'High-top' },
  { id: 'long', name: 'Long' },
  { id: 'bald', name: 'Bald' },
];
export const CUT_IDS = CUTS.map((c) => c.id);
/** The head's proportions, unmasked (Phase 3: presets, no free moulding; the stretch is wardrobe.ts `HEAD_SCALE`) */
export type HeadShape = 'standard' | 'round' | 'long' | 'wide' | 'narrow' | 'big';
export const HEAD_SHAPES: { id: HeadShape; name: string }[] = [
  { id: 'standard', name: 'Standard' },
  { id: 'round', name: 'Round' },
  { id: 'long', name: 'Long' },
  { id: 'wide', name: 'Wide' },
  { id: 'narrow', name: 'Narrow' },
  { id: 'big', name: 'Big' },
];
export const SHAPE_IDS = HEAD_SHAPES.map((h) => h.id);
/** Hair: the natural shades (the crowd's, crowdlook.ts), then the dyes (a few of the crowd dye theirs) */
export const HAIR_NATURAL = ['#16141f', '#2b1d14', '#4a2e1c', '#6e4526', '#a87a3e', '#c9a86a', '#d8c08a', '#8a3a22', '#b4532a', '#9d9aa8', '#cfccd6'];
export const HAIR_DYE = ['#ff6ad5', '#00b8d8', '#8f3dff', '#1f9d6a', '#f3f2f7'];

/*
 * The characters (docs/characters-plan.md): Degen's body with a head of its own, worn from the fitting room's Face tab
 * (all free). Their heads are drawn by heads.ts, its own chunk; nothing is worn over one.
 */
export type CharacterId = 'slimewhale' | 'smilex';
/**
 * (`hair`: the look's hair colour shows on him, SlimeWhale's buzz; Smilex has none, only his skin row. `chain`: what
 * the necklace is called on him, where it carries his own pendant)
 */
export const CHARACTERS: { id: CharacterId; name: string; hair?: boolean; chain?: string }[] = [
  { id: 'slimewhale', name: 'SlimeWhale', hair: true },
  // (a real name, the owner's call: docs/characters-plan.md)
  { id: 'smilex', name: 'Smilex', chain: 'Gold Chain' },
];
export const CHARACTER_IDS = CHARACTERS.map((c) => c.id);
/** A character's whole look, put on in one tap (the head, the clothes and colours from the owner's art) */
export const CHARACTER_LOOKS: Record<CharacterId, Partial<Look>> = {
  slimewhale: { character: 'slimewhale', kind: 'hoodie', top: '#1f2436', hood: false, bottoms: 'joggers', bottom: '#16141f', shoeStyle: 'sneaker', shoes: '#1b1830', tone: '#efc4ae', hair: '#8c7b6b' },
  smilex: { character: 'smilex', kind: 'bomber', top: '#6b4428', bottoms: 'denim', bottom: '#3f5f8f', shoeStyle: 'sneaker', shoes: '#c9c7cf', necklace: true, mark: 'seven', markAt: 'chest', ink: '#1f9d6a' },
};

export interface Look {
  kind: LookKind;
  top: string;
  /** What he wears on his legs, and its colour */
  bottoms: Bottoms;
  bottom: string;
  tie: string;
  /** The shirt under the suit's jacket, or the long-sleeve under the puffer vest */
  shirt: string;
  /** What's on his feet, and its colour */
  shoeStyle: ShoeStyle;
  shoes: string;
  /** One thing on the head: a hat (or null), unless a hoodie's hood is up */
  hat: Hat | null;
  /** The hat's colour */
  hatColor: string;
  hood: boolean;
  /** The shades: their style, their frames' colour and their lenses' */
  eyewear: EyeStyle;
  frame: string;
  lens: string;
  /** Face gear (or none), and its colour (`faceGear`: `face` is the faces plan's, unmasked or not) */
  faceGear: FaceGear | null;
  gear: string;
  /** One bag at a time */
  bag: Bag | null;
  bagColor: string;
  headphones: string | null;
  /** Gold chain on the shades */
  chain: boolean;
  /** Gold chain with a diamond round the neck */
  necklace: boolean;
  /** Gold watch on the left wrist */
  watch: boolean;
  /** The top's mark (or none), where it goes and its ink */
  mark: MarkId | null;
  markAt: MarkSlot;
  ink: string;
  /** The mark on the front of a cap, beanie or bucket hat (the diamond, as in the art) */
  hatMark: MarkId;
  /** A mark on the outside of each sneaker (or none) */
  shoeMark: MarkId | null;
  /** An all-over print on the top */
  pattern: PatternId;
  /** Unmasked: no balaclava, the face in `tone` with the hair (`cut`, `hair`) */
  face: boolean;
  tone: string;
  hair: string;
  cut: Cut;
  /** The shades on an unmasked face (the balaclava always has them) */
  shades: boolean;
  /** The head's proportions, unmasked */
  shape: HeadShape;
  /**
   * A character's head instead of Degen's (or null: Degen): nothing is worn over it, so the hat, the hood up, the
   * eyewear, face gear and the shades' chain stay saved but aren't drawn while it's on (`tone` and `hair` are its own)
   */
  character: CharacterId | null;
}

export const PALETTE = {
  // (the last two the work wear's hi-vis yellow and orange, docs/wardrobe-plan.md Phase 6)
  top: ['#16141f', '#2a2350', '#1d2550', '#3b2a6a', '#e219e5', '#00a8d8', '#f3f2f7', '#ff6a3d', '#1f9d6a', '#8f3dff', '#4a4a5a', '#d8312f', '#d4ec3a', '#ff8a1e'],
  bottom: ['#16141f', '#2a2350', '#1d2550', '#4a4a5a', '#f3f2f7', '#3a2418'],
  cap: ['#d8312f', '#16141f', '#f3f2f7', '#00a8d8', '#e219e5', '#1f9d6a', '#ffd23f', '#a0652f', '#3a2418', '#ff8a1e'],
  tie: ['#1f9d55', '#e219e5', '#00b8d8', '#d8312f', '#c99a4a', '#16141f'],
  shirt: ['#cfcedb', '#16141f', '#9fb4d8', '#e4dcc4', '#d8a0b8', '#4a4a5a'],
  extra: ['#14121f', '#f3f2f7', '#ff6ad5', '#00b8d8', '#d8312f', '#1f9d6a', '#8f3dff'],
  shoes: ['#1b1830', '#f3f2f7', '#d8312f', '#00a8d8', '#e219e5', '#ffd23f', '#1f9d6a'],
  lens: ['#22d07a', '#ff3dbb', '#00d8ff', '#ffc23a', '#9b5cff', '#ff4a3a'],
  gear: ['#2b2a33', '#16141f', '#4a5a3a', '#c8b58a', '#ff6a3d', '#f3f2f7', '#1d2550'],
  frame: ['#0d0c14', '#f3f2f7', '#c99a4a', '#8b889c', '#3a2418', '#d8312f', '#1d2550'],
  /** A mark's ink (the whites a shade under white, so they don't bloom) */
  ink: ['#16c7b5', '#dedce8', '#16141f', '#e219e5', '#00b8d8', '#ffd23f', '#d8312f', '#e2b04a'],
  /** Skin tones, pale to deep (the crowd's too, crowdlook.ts): flat tones, none bright enough to bloom */
  // (the crowd's are its own: crowdlook.ts `SKIN_TONES`; SlimeWhale's peach, `#efc4ae`, is the players' only)
  tone: ['#f7e0cc', '#f1d2b6', '#efc4ae', '#e8c39e', '#dcae86', '#d29f78', '#c99068', '#b07650', '#a06640', '#8f5a3a', '#6e4129', '#52301f', '#3f2418'],
  /** Hair: the natural shades (and SlimeWhale's grey-brown buzz, the players' only), then the dyes */
  hair: [...HAIR_NATURAL, '#8c7b6b', ...HAIR_DYE],
};

/*
 * Any colour (docs/wardrobe-plan.md Phase 1): the lists above are only the
 * fitting room's quick swatches; a look can carry any `#rrggbb`. A colour
 * brighter than the palette's own white (`#f3f2f7`, `BRIGHTEST`) is dimmed
 * to it, its hue kept, so a picked pure white sits a shade under white and
 * nothing blooms at night; every swatch above passes as it is.
 */
const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
/** The brightest a worn colour can be: the palette's white */
export const BRIGHTEST = lum(0xf3, 0xf2, 0xf7);
const HEX = /^#[0-9a-f]{6}$/i;
/** A colour from anywhere, made safe: `#rrggbb` lower case, no brighter than `BRIGHTEST`; anything else is null */
export function safeColour(v: unknown): string | null {
  if (typeof v !== 'string' || !HEX.test(v)) return null;
  const c = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
  const l = lum(c[0], c[1], c[2]);
  const k = l > BRIGHTEST ? BRIGHTEST / l : 1;
  return '#' + c.map((x) => Math.floor(x * k).toString(16).padStart(2, '0')).join('');
}

/** Degen as he is in the art */
export const DEFAULT_LOOK: Look = {
  kind: 'suit',
  top: '#16141f',
  bottoms: 'trousers',
  bottom: '#16141f',
  tie: '#1f9d55',
  shirt: '#cfcedb',
  shoeStyle: 'dress',
  shoes: '#1b1830',
  hat: 'cap',
  hatColor: '#d8312f',
  hood: false,
  eyewear: 'classic',
  frame: '#0d0c14',
  lens: '#22d07a',
  faceGear: null,
  gear: '#2b2a33',
  bag: null,
  bagColor: '#00b8d8',
  headphones: null,
  chain: true,
  necklace: false,
  watch: false,
  mark: null,
  markAt: 'chest',
  ink: '#16c7b5',
  hatMark: 'diamond',
  shoeMark: null,
  pattern: 'plain',
  face: false,
  tone: '#e8c39e',
  hair: '#16141f',
  cut: 'crop',
  shades: false,
  shape: 'standard',
  character: null,
};

/** The hats retired with the costume pieces (docs/wardrobe-plan.md Phase 1): a look saved in one is bare-headed */
const RETIRED_HATS = ['crown', 'cowboy', 'tophat', 'halo'];

/** Anything from a player, made safe: unknown values fall back to Degen's own look */
export function cleanLook(raw: unknown): Look {
  const o = { ...(raw && typeof raw === 'object' ? raw : {}) } as Record<string, unknown>;
  const from = <T extends string>(v: unknown, list: readonly T[], fallback: T) => (list.includes(v as T) ? (v as T) : fallback);
  const colour = (v: unknown, fallback: string) => safeColour(v) ?? fallback;
  const orNull = <T extends string>(v: unknown, list: readonly T[], fallback: T | null) => (v === null ? null : list.includes(v as T) ? (v as T) : fallback);
  // Looks saved before hats and bags had their own fields
  if (o.hat === undefined) {
    o.hat = typeof o.beanie === 'string' ? 'beanie' : o.cap === null ? null : 'cap';
    o.hatColor = typeof o.beanie === 'string' ? o.beanie : o.cap;
  }
  if (o.bag === undefined && (typeof o.backpack === 'string' || typeof o.crossbody === 'string')) {
    o.bag = typeof o.backpack === 'string' ? 'backpack' : 'crossbody';
    o.bagColor = o.backpack ?? o.crossbody;
  }
  const kind = from(o.kind, KINDS, DEFAULT_LOOK.kind);
  return {
    kind,
    top: colour(o.top, DEFAULT_LOOK.top),
    // (a look from before the separates: what its top came with)
    bottoms: from(o.bottoms, BOTTOMS, bottomsFor(kind)),
    bottom: colour(o.bottom, DEFAULT_LOOK.bottom),
    tie: colour(o.tie, DEFAULT_LOOK.tie),
    shirt: colour(o.shirt, DEFAULT_LOOK.shirt),
    shoeStyle: from(o.shoeStyle, SHOE_STYLES, shoesFor(kind)),
    shoes: colour(o.shoes, DEFAULT_LOOK.shoes),
    // (a retired hat, the crown, halo, top hat or cowboy hat, comes back as no hat)
    hat: orNull(o.hat, HATS, RETIRED_HATS.includes(o.hat as string) ? null : DEFAULT_LOOK.hat),
    hatColor: colour(o.hatColor, DEFAULT_LOOK.hatColor),
    hood: kind === 'hoodie' && o.hood === true,
    eyewear: from(o.eyewear, EYE_IDS, DEFAULT_LOOK.eyewear),
    frame: colour(o.frame, DEFAULT_LOOK.frame),
    lens: colour(o.lens, DEFAULT_LOOK.lens),
    faceGear: orNull(o.faceGear, FACE_IDS, null),
    gear: colour(o.gear, DEFAULT_LOOK.gear),
    bag: orNull(o.bag, BAGS, null),
    bagColor: colour(o.bagColor, DEFAULT_LOOK.bagColor),
    headphones: safeColour(o.headphones),
    chain: o.chain === undefined ? DEFAULT_LOOK.chain : o.chain === true,
    necklace: o.necklace === true,
    watch: o.watch === true,
    // (looks saved before the merch had none of these: Degen as in the art)
    mark: orNull(o.mark, MARK_IDS, null),
    markAt: from(o.markAt, SLOT_IDS, DEFAULT_LOOK.markAt),
    ink: colour(o.ink, DEFAULT_LOOK.ink),
    hatMark: from(o.hatMark, MARK_IDS, DEFAULT_LOOK.hatMark),
    shoeMark: orNull(o.shoeMark, MARK_IDS, null),
    pattern: from(o.pattern, PATTERN_IDS, DEFAULT_LOOK.pattern),
    // (looks saved before faces had none of these: in the balaclava, as in the art)
    face: o.face === true,
    tone: from(o.tone, PALETTE.tone, DEFAULT_LOOK.tone),
    hair: from(o.hair, PALETTE.hair, DEFAULT_LOOK.hair),
    cut: from(o.cut, CUT_IDS, DEFAULT_LOOK.cut),
    shades: o.shades === true,
    shape: from(o.shape, SHAPE_IDS, DEFAULT_LOOK.shape),
    // (looks saved before the characters had none: Degen; one no longer known comes back as Degen)
    character: orNull(o.character, CHARACTER_IDS, null),
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
