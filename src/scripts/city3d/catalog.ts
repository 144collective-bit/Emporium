/*
 * The city's catalog and the player's progress rules: what cars, guns,
 * clothes, upgrades and property cost in Dorras, what level they need, and
 * the XP curve, levels and titles behind that. Kept free of the DOM and of
 * scene code (and of the save itself: tycoon.ts holds the save and the
 * functions that spend Dorras), so a game server can check the same numbers.
 *
 * - The starter tier is free: the five original cars, the four original
 *   guns (still unlocked by score) and the whole original wardrobe.
 * - Everything new costs Dorras and needs a level. Upgrades ("mods") come
 *   in three levels each and cost more on dearer things; `applyGunMods()`
 *   turns a gun's mods into its rules for the combat sim.
 * - XP comes from playing: sales, contracts, races, missions, takedowns.
 *   Nothing here is bought with real money or tied to the token.
 */
import type { BuildingType } from '../../data/plots';
import type { Weapon, WeaponId } from './combat-sim';
import type { PlayerCar } from './mycar';
import type { KartId } from './mykart';
import type { BotTraits } from './fight-sim';

/* ---------- XP, levels and titles ---------- */

export const MAX_LEVEL = 40;
/** XP needed to reach a level (level 1 is 0) */
export const xpForLevel = (level: number) => Math.round(120 * Math.pow(Math.max(0, Math.min(MAX_LEVEL, level) - 1), 1.75));
export function levelFor(xp: number) {
  let l = 1;
  while (l < MAX_LEVEL && xp >= xpForLevel(l + 1)) l++;
  return l;
}
/** How far into the current level (0..1), and the XP still to go */
export function levelProgress(xp: number) {
  const level = levelFor(xp);
  if (level >= MAX_LEVEL) return { level, into: 1, toGo: 0, span: 0 };
  const lo = xpForLevel(level);
  const hi = xpForLevel(level + 1);
  return { level, into: (xp - lo) / (hi - lo), toGo: hi - xp, span: hi - lo };
}
/** Titles, from the level reached (cosmetic) */
export const TITLES: { level: number; name: string }[] = [
  { level: 1, name: 'Newcomer' },
  { level: 3, name: 'Hustler' },
  { level: 6, name: 'Trader' },
  { level: 9, name: 'Dealer' },
  { level: 12, name: 'Operator' },
  { level: 15, name: 'Baron' },
  { level: 20, name: 'Mogul' },
  { level: 25, name: 'Tycoon' },
  { level: 30, name: 'Kingpin' },
  { level: 35, name: 'Legend' },
  { level: 40, name: 'Degen Supreme' },
];
export function titleFor(level: number) {
  let t = TITLES[0];
  for (const k of TITLES) if (level >= k.level) t = k;
  return t.name;
}
/** XP for the things you do */
export const XP = {
  /** Per item sold at your stall and shops */
  sale: 1,
  /** Per contract delivered */
  contract: 40,
  /** Per unit, lot or plot bought, and per building built */
  property: 60,
  /** Per upgrade bought (a mod, a building level) */
  upgrade: 25,
  /** Per dummy, drone and crew member knocked down */
  dummy: 4,
  drone: 8,
  /** Finishing a race, and beating its par (on top) */
  raceFinish: 120,
  racePar: 180,
  /** A new best time (on top) */
  raceRecord: 60,
  /** Finishing a kart race; a podium and a win (on top); a time trial's new best */
  kartFinish: 100,
  kartPodium: 80,
  kartWin: 140,
  kartRecord: 60,
  /** Winning a cup's series, a podium in one, and beating the par ghost or the daily challenge */
  seriesWin: 500,
  seriesPodium: 250,
  parBeaten: 150,
  challenge: 200,
  /** Fighting (the Fight Club): a spar (plus a little per hit landed), a bout won or lost, a knock-out, a chain of three or more */
  spar: 40,
  sparHit: 2,
  boutWin: 200,
  boutLoss: 60,
  fightKo: 50,
  chain: 30,
} as const;

/* ---------- The Fight Club's opponents (docs/fight-plan.md) ---------- */

export type BotLevel = 'easy' | 'medium' | 'hard';
export const BOT_LEVELS: BotLevel[] = ['easy', 'medium', 'hard'];
/** The sparring partners and bout opponents: a cartoon fighter per level (fixed names, never real people), its skill, its style and a bout's prize */
export const FIGHT_BOTS: Record<BotLevel, { name: string; blurb: string; skill: number; style: 'brawler' | 'kickboxer' | 'street'; prize: number; level: number; traits: Partial<BotTraits> }> = {
  // A clear curve (the owner's call): Ray rarely blocks and never parries; Knuckles blocks and kicks; the Mayor parries and
  // finishes, but telegraphs his heavy moves with a longer wind-up and backs off after a chain, so patience beats him
  easy: { name: 'Rookie Ray', blurb: 'Slow hands, big heart. Learn the chain on him.', skill: 0.3, style: 'brawler', prize: 1_500, level: 1, traits: { block: 0.15, dodge: 0.03, kicks: 0.15, pace: 75 } },
  medium: { name: 'Knuckles', blurb: 'Blocks when he sees it coming. Mix the kicks in.', skill: 0.55, style: 'kickboxer', prize: 3_000, level: 1, traits: { block: 0.5, dodge: 0.1, kicks: 0.45, pace: 50, backOff: 20 } },
  hard: { name: 'The Mayor', blurb: 'Reads you, parries you, finishes you. Watch for the wind-up.', skill: 0.8, style: 'street', prize: 6_000, level: 3, traits: { block: 0.6, dodge: 0.15, parry: 0.4, kicks: 0.3, finisher: true, telegraph: 8, backOff: 45, pace: 44 } },
};
/** XP for taking part is capped per spar so hits can't be farmed */
export const SPAR_HIT_CAP = 30;

/* ---------- Mods (upgrades): three levels each ---------- */

export const MOD_LEVELS = 3;
/** Cost of each mod level, before the item's tier multiplies it */
const MOD_COSTS = [1200, 3000, 6500];
/** An item's price tier: how much dearer its mods are (free starters are tier 1) */
export const tierOf = (price: number) => 1 + Math.min(3, price / 20000);
export const modCost = (price: number, level: number) => (level < 1 || level > MOD_LEVELS ? null : Math.round((MOD_COSTS[level - 1] * tierOf(price)) / 50) * 50);

/* ---------- Cars (the garage) ---------- */

export interface CarEntry {
  /** Dorras (0: a starter, free) */
  price: number;
  level: number;
  /** One line for the showroom card */
  pitch: string;
}
export const CAR_CATALOG: Record<PlayerCar, CarEntry> = {
  hatch: { price: 0, level: 1, pitch: 'Yours from day one.' },
  sedan: { price: 0, level: 1, pitch: 'Yours from day one.' },
  coupe: { price: 0, level: 1, pitch: 'Yours from day one.' },
  pickup: { price: 0, level: 1, pitch: 'Yours from day one.' },
  van: { price: 0, level: 1, pitch: 'Yours from day one.' },
  muscle: { price: 18000, level: 4, pitch: 'Big block, loud pipes, built for the straights.' },
  suv: { price: 26000, level: 6, pitch: 'Tall, tough and roomy: hauls a lot and shrugs off kerbs.' },
  super: { price: 64000, level: 10, pitch: 'The fastest thing in the city. Nothing else comes close.' },
};
export const CAR_IDS = Object.keys(CAR_CATALOG) as PlayerCar[];
export const STARTER_CARS = CAR_IDS.filter((id) => CAR_CATALOG[id].price === 0);

export type CarModId = 'engine' | 'turbo' | 'tyres' | 'rack';
export interface CarMods {
  engine: number;
  turbo: number;
  tyres: number;
  rack: number;
}
export const CAR_MODS: Record<CarModId, { name: string; blurb: string; stat: 'speed' | 'accel' | 'grip' | 'cargo' }> = {
  engine: { name: 'Engine', blurb: 'More top speed each level.', stat: 'speed' },
  turbo: { name: 'Turbo', blurb: 'Quicker off the line each level.', stat: 'accel' },
  tyres: { name: 'Tyres', blurb: 'More grip through the corners each level.', stat: 'grip' },
  rack: { name: 'Roof rack', blurb: 'Carries a quarter more goods each level.', stat: 'cargo' },
};
export const CAR_MOD_IDS = Object.keys(CAR_MODS) as CarModId[];
export const NO_CAR_MODS: CarMods = { engine: 0, turbo: 0, tyres: 0, rack: 0 };
/** Each engine, turbo or tyre level adds this to the model's 0..1 stat */
export const CAR_MOD_STEP = 0.09;
export const RACK_STEP = 0.25;
/** A model's 0..1 handling and cargo with its mods on */
export function carStats(base: { speed: number; accel: number; grip: number }, cargo: number, mods: CarMods) {
  const up = (v: number, lvl: number) => Math.min(1.15, v + lvl * CAR_MOD_STEP);
  return {
    speed: up(base.speed, mods.engine),
    accel: up(base.accel, mods.turbo),
    grip: up(base.grip, mods.tyres),
    cargo: Math.round(cargo * (1 + mods.rack * RACK_STEP)),
  };
}

/* ---------- Karts (the kart park's hut) ---------- */

export interface KartEntry {
  price: number;
  level: number;
  pitch: string;
}
export const KART_CATALOG: Record<KartId, KartEntry> = {
  rocket: { price: 0, level: 1, pitch: 'Yours from day one.' },
  zip: { price: 9000, level: 3, pitch: 'Light as a feather: the drifter\'s kart.' },
  tank: { price: 16000, level: 5, pitch: 'Plated. Bumps and spins barely slow it.' },
  bigwheel: { price: 28000, level: 8, pitch: 'The fastest thing on the loop, once it gets going.' },
};
export const KART_IDS = Object.keys(KART_CATALOG) as KartId[];
export const STARTER_KARTS = KART_IDS.filter((id) => KART_CATALOG[id].price === 0);

export type KartModId = 'motor' | 'tyres' | 'nitro';
export interface KartMods {
  motor: number;
  tyres: number;
  nitro: number;
}
export const KART_MODS: Record<KartModId, { name: string; blurb: string; stat: 'speed' | 'handling' | 'boost' }> = {
  motor: { name: 'Motor', blurb: 'A bigger motor: more top speed and pick-up.', stat: 'speed' },
  tyres: { name: 'Soft tyres', blurb: 'Stickier tyres: sharper turns, tighter drifts.', stat: 'handling' },
  nitro: { name: 'Nitro kit', blurb: 'Longer boosts from drifts, pads and rockets.', stat: 'boost' },
};
export const KART_MOD_IDS = Object.keys(KART_MODS) as KartModId[];
export const NO_KART_MODS: KartMods = { motor: 0, tyres: 0, nitro: 0 };
/** Each mod level adds this much to a 0..1 stat (the nitro kit lengthens boosts by this share) */
export const KART_MOD_STEP = 0.08;
export const NITRO_STEP = 0.15;
export function kartStats(base: { speed: number; accel: number; handling: number; weight: number }, mods: KartMods) {
  const up = (v: number, lvl: number) => Math.min(1.15, v + lvl * KART_MOD_STEP);
  return {
    speed: up(base.speed, mods.motor),
    accel: up(base.accel, mods.motor * 0.5),
    handling: up(base.handling, mods.tyres),
    weight: base.weight,
    boost: 1 + mods.nitro * NITRO_STEP,
  };
}

/** Engine classes: everyone's pace in a race, a level to unlock each; boards are kept per class */
export type ClassId = 'street' | 'sport' | 'neon';
export const KART_CLASSES: Record<ClassId, { name: string; blurb: string; level: number; pace: number }> = {
  street: { name: 'Street', blurb: 'Easy pace. Learn the lines.', level: 1, pace: 0.82 },
  sport: { name: 'Sport', blurb: 'The standard pace.', level: 3, pace: 1 },
  neon: { name: 'Neon', blurb: 'Flat out. Every corner is a drift.', level: 8, pace: 1.18 },
};
export const CLASS_IDS = Object.keys(KART_CLASSES) as ClassId[];
/** A cup's series: points by place in each race */
export const SERIES_POINTS = [15, 12, 10, 8, 6, 4, 2, 1];
/** What winning a series pays on top of the races (first, second, third overall) */
export const SERIES_PRIZES: Record<'rookie' | 'pro' | 'neon', number[]> = { rookie: [3000, 1500, 800], pro: [8000, 4000, 2000], neon: [20000, 10000, 5000] };
/** The daily challenge: a time to beat on the day's course and class pays this */
export const CHALLENGE_PRIZE = 2500;
/** The par ghost's lap at Sport pace per course (the rivals' brain driving the player; other classes scale by pace) */
export const PAR_LAPS: Record<string, number> = { 'neon-loop': 29, 'neon-reverse': 30, summit: 27, 'summit-reverse': 27, grand: 53, 'grand-reverse': 53 };

/* ---------- Guns (the Armoury) ---------- */

export interface GunEntry {
  price: number;
  level: number;
  pitch: string;
}
export const GUN_CATALOG: Record<WeaponId, GunEntry> = {
  rifle: { price: 0, level: 1, pitch: 'Free at the counter.' },
  smg: { price: 0, level: 1, pitch: 'Free once your score unlocks it.' },
  shotgun: { price: 0, level: 1, pitch: 'Free once your score unlocks it.' },
  dmr: { price: 0, level: 1, pitch: 'Free once your score unlocks it.' },
  revolver: { price: 7500, level: 3, pitch: 'Six rounds. Each one counts.' },
  burst: { price: 14000, level: 5, pitch: 'Three-round bursts, tight and quick.' },
  lmg: { price: 32000, level: 8, pitch: 'A hundred rounds of noise.' },
};
export const GUN_IDS = Object.keys(GUN_CATALOG) as WeaponId[];
export const STARTER_GUNS = GUN_IDS.filter((id) => GUN_CATALOG[id].price === 0);

export type GunModId = 'barrel' | 'mag' | 'grip';
export interface GunMods {
  barrel: number;
  mag: number;
  grip: number;
}
export const GUN_MODS: Record<GunModId, { name: string; blurb: string }> = {
  barrel: { name: 'Barrel', blurb: 'Hits harder and reaches further each level.' },
  mag: { name: 'Extended mag', blurb: 'A bigger magazine and more spare rounds each level.' },
  grip: { name: 'Grip & stock', blurb: 'Tighter shots, less kick and quicker reloads each level.' },
};
export const GUN_MOD_IDS = Object.keys(GUN_MODS) as GunModId[];
export const NO_GUN_MODS: GunMods = { barrel: 0, mag: 0, grip: 0 };
/** How much each mod level changes a gun */
export const GUN_MOD_EFFECT = { damage: 0.1, range: 0.08, mag: 0.25, reserve: 0.25, spread: 0.15, kick: 0.12, reload: 0.1 } as const;
/** Tidy a modded number (25 x 1.2 is 30, not 30.000000000000004) */
const tidy = (v: number) => Math.round(v * 1e6) / 1e6;
/**
 * A gun's rules with its mods on: the barrel hits harder and reaches further,
 * the extended mag holds more (rounded to whole rounds), the grip tightens the
 * spread, softens the kick and speeds the reload. Pure, so the sim (and a
 * server) can apply it per player; a gun without mods comes back as it is.
 */
export function applyGunMods(w: Weapon, mods: GunMods): Weapon {
  if (!mods.barrel && !mods.mag && !mods.grip) return w;
  const E = GUN_MOD_EFFECT;
  return {
    ...w,
    damage: tidy(w.damage * (1 + E.damage * mods.barrel)),
    range: tidy(w.range * (1 + E.range * mods.barrel)),
    mag: Math.round(w.mag * (1 + E.mag * mods.mag)),
    reserve: Math.round(w.reserve * (1 + E.reserve * mods.mag)),
    spreadHip: tidy(w.spreadHip * (1 - E.spread * mods.grip)),
    spreadAim: tidy(w.spreadAim * (1 - E.spread * mods.grip)),
    kick: tidy(w.kick * (1 - E.kick * mods.grip)),
    reload: tidy(w.reload * (1 - E.reload * mods.grip)),
  };
}

/* ---------- Clothes (Drop 001) ---------- */

export type WardrobeTab = 'fit' | 'head' | 'bag' | 'hand' | 'extras' | 'colours';
export interface WardrobeEntry {
  id: string;
  name: string;
  price: number;
  level: number;
  tab: WardrobeTab;
  pitch: string;
}
/** The premium wardrobe: everything the original fitting room didn't have. Ids are the Look values they put on. */
export const WARDROBE_CATALOG: WardrobeEntry[] = [
  { id: 'varsity', name: 'Varsity Jacket', price: 4000, level: 2, tab: 'fit', pitch: 'Letterman jacket with striped cuffs and a chenille D.' },
  { id: 'puffer', name: 'Puffer Jacket', price: 6500, level: 3, tab: 'fit', pitch: 'Quilted, shiny and twice your width.' },
  { id: 'cowboy', name: 'Cowboy Hat', price: 2500, level: 1, tab: 'head', pitch: 'Wide brim, city attitude.' },
  { id: 'tophat', name: 'Top Hat', price: 3500, level: 2, tab: 'head', pitch: 'For the Kingpin look.' },
  { id: 'halo', name: 'Neon Halo', price: 9000, level: 6, tab: 'head', pitch: 'A floating ring of neon over your head.' },
  { id: 'duffel', name: 'Duffel Bag', price: 3000, level: 2, tab: 'bag', pitch: 'Big enough for all the Dorras.' },
  { id: 'wings', name: 'Neon Wings', price: 25000, level: 12, tab: 'bag', pitch: 'Glowing wings on your back. Purely decorative. Mostly.' },
  { id: 'phone', name: 'Phone', price: 1000, level: 1, tab: 'hand', pitch: 'Always checking the charts.' },
  { id: 'briefcase', name: 'Briefcase', price: 5000, level: 4, tab: 'hand', pitch: 'Serious business.' },
  { id: 'watch', name: 'Gold Watch', price: 8000, level: 5, tab: 'extras', pitch: 'A fat gold watch on the wrist.' },
  { id: 'gold', name: 'Gold Pack', price: 10000, level: 7, tab: 'colours', pitch: 'Metallic gold and bronze for every fit.' },
  { id: 'holo', name: 'Holo Pack', price: 6000, level: 4, tab: 'colours', pitch: 'Holographic pastels for every fit.' },
];
export const WARDROBE_IDS = WARDROBE_CATALOG.map((w) => w.id);
export const wardrobeEntry = (id: string) => WARDROBE_CATALOG.find((w) => w.id === id) ?? null;

/* ---------- Property ---------- */

/** A district plot, bought with Dorras (the top of the property ladder) */
export const PLOT_DORRAS = 120000;
export const PLOT_LEVEL = 8;
/** Selling a plot back to the city pays this share of what it cost */
export const PLOT_REFUND = 0.6;
/** What each design costs to build on a plot (changing a design costs the difference, never less than 0) */
export const BUILD_COSTS: Record<BuildingType, number> = {
  garden: 4000,
  billboard: 6000,
  house: 9000,
  shop: 12000,
  warehouse: 12000,
  loft: 18000,
  arcade: 24000,
  tower: 36000,
};

/** Levels for the places you run: capacity, pace and speed go up; the cost of each level */
export const PLACE_LEVELS = 3;
export const UNIT_LEVEL_COSTS = [0, 1500, 4000];
export const LOT_LEVEL_COSTS = [0, 12000, 30000];
export const WORKSHOP_LEVEL_COSTS = [0, 5000, 15000];
export const LEVEL_CAPACITY = [1, 1.5, 2];
export const LEVEL_PACE = [1, 1.25, 1.5];
export const LEVEL_SPEED = [1, 1.3, 1.6];
