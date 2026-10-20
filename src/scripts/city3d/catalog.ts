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
 *   in three levels each and cost more on dearer things.
 * - XP comes from playing: sales, contracts, races, missions, takedowns.
 *   Nothing here is bought with real money or tied to the token.
 */
import type { BuildingType } from '../../data/plots';
import type { Weapon, WeaponId } from './combat-sim';
import type { PlayerCar } from './mycar';

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
  goon: 12,
  /** Finishing a race, and beating its par (on top) */
  raceFinish: 120,
  racePar: 180,
  /** A new best time (on top) */
  raceRecord: 60,
} as const;

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
