/*
 * The city's economy: Dorras, goods with moving prices, your market stall
 * (Phase 1), and making and moving goods (Phase 2): units of your own built
 * as a garden, a shop or a warehouse, the Workshop's factory line, and your
 * car's boot for delivery runs. Kept free of the DOM and of scene code
 * (tycoon-ui.ts is the view, market.ts and units.ts the buildings), so a game
 * server can run the same rules later; the save is plain data, cleaned by
 * cleanSave().
 *
 * - Dorras are earned by playing. They can't be cashed out (and, for now,
 *   can't be bought either).
 * - The Emporium's market hall sells goods wholesale at a price that moves
 *   with the time of day (the same for everyone, so it can't be gamed by
 *   reloading) and buys them back a little under it. What you buy goes
 *   straight to one of your places.
 * - Your stall and your shops sell their stock to passers-by at a retail
 *   mark-up you pick (Low sells fast, High earns more per sale). Takings go
 *   in the till; collect them into your balance.
 * - They sell faster while you stand at one (you serve the customers), and a
 *   quarter as fast while you're away, for up to OFFLINE_CAP minutes.
 * - Gardens grow raw goods; the Workshop turns raw goods into products.
 *   Both keep going while you're away (up to OFFLINE_CAP minutes).
 * - Goods only move between your places in your car: load at a garden, the
 *   warehouse or the Workshop, unload anywhere that takes them. Delivering
 *   to a stall or shop yourself pays a small bonus.
 * - Phase 5 (the city's game): XP and levels, cars, guns and clothes bought
 *   and upgraded with Dorras, district plots as Dorras property, levels for
 *   the places you run, missions and the counters behind them (catalog.ts
 *   has the prices and curves; missions.ts the board).
 * - Phase 9 (The Trenches, save v10): four corner shops (`c0`-`c3`), bought
 *   with Dorras from level 5, a shop from the day they're bought.
 * - The inventory (save v11, docs/inventory-plan.md): what Degen carries, its
 *   rules in inventory.ts.
 */
import { cleanDesign, type Design } from '../../data/plots';
import { DOORS, GARAGE_SITE, LOT_SITE, STALL_SPOT, UNIT_SITE } from './solids';
import type { WeaponId } from './combat-sim';
import { CARGO as BASE_CARGO, DRIVE, PLAYER_CARS, type PaintId, type PlayerCar } from './mycar';
import { DEFAULT_KART, KART_SPECS, PLAYER_KARTS, cleanKart, type KartId } from './mykart';
import { CUPS, type CupId } from './kart-cups';
import { PARTNER_IDS, STYLES, type PartnerId, type StyleId } from './fight-moves';
import { COURSE_IDS } from './kartcircuit';
import { PLACE_IDS as MAP_PLACES } from './places';
import { CORNER_SHOPS, type CornerId } from './projects';
import { cleanInventory, emptyInventory, type Inventory } from './inventory-save';
import { FREE_PLAY } from './freeplay';
import {
  BOT_LEVELS,
  type BotLevel,
  BUILD_COSTS,
  CAR_CATALOG,
  CAR_MOD_IDS,
  GUN_CATALOG,
  GUN_MOD_IDS,
  CHALLENGE_PRIZE,
  CLASS_IDS,
  KART_CATALOG,
  KART_CLASSES,
  KART_MOD_IDS,
  PAR_LAPS,
  SERIES_POINTS,
  SERIES_PRIZES,
  LEVEL_CAPACITY,
  LEVEL_PACE,
  LEVEL_SPEED,
  LOT_LEVEL_COSTS,
  CORNER_LEVEL_COSTS,
  MOD_LEVELS,
  NO_CAR_MODS,
  NO_GUN_MODS,
  NO_KART_MODS,
  PLACE_LEVELS,
  PLOT_DORRAS,
  PLOT_LEVEL,
  PLOT_REFUND,
  STARTER_CARS,
  STARTER_GUNS,
  STARTER_KARTS,
  UNIT_LEVEL_COSTS,
  WARDROBE_CATALOG,
  WORKSHOP_LEVEL_COSTS,
  XP,
  carStats,
  kartStats,
  levelFor,
  modCost,
  wardrobeEntry,
  type CarModId,
  type CarMods,
  type GunModId,
  type GunMods,
  type ClassId,
  type KartModId,
  type KartMods,
} from './catalog';

export type ProductId = 'gummies' | 'coffee' | 'glow' | 'tees' | 'sneakers' | 'neon';
export type RawId = 'sugar' | 'beans' | 'cotton';
export type GoodId = ProductId | RawId;
export interface Good {
  id: GoodId;
  name: string;
  /** Wholesale price at the middle of its swing (Dorras) */
  base: number;
  /** Customers a minute who'd buy one at a Fair price (raw goods aren't sold to the public) */
  demand: number;
  /** Colour for its crates and icon */
  color: string;
  /** A raw good: grown in gardens, made into products at the Workshop */
  raw?: true;
}

/** Products first (their order sets their price rhythms; add new goods at the end) */
export const GOODS: Good[] = [
  { id: 'glow', name: 'Glow Sticks', base: 8, demand: 1.7, color: '#2bff88' },
  { id: 'gummies', name: 'Gummy Bears', base: 12, demand: 1.4, color: '#ff6ad5' },
  { id: 'coffee', name: 'Iced Coffee', base: 18, demand: 1.1, color: '#c98a4b' },
  { id: 'tees', name: 'Street Tees', base: 45, demand: 0.55, color: '#00c2ff' },
  { id: 'sneakers', name: 'Sneakers', base: 120, demand: 0.26, color: '#f3f2f7' },
  { id: 'neon', name: 'Neon Signs', base: 260, demand: 0.13, color: '#e219e5' },
  { id: 'sugar', name: 'Sugar', base: 4, demand: 0, color: '#fff3c4', raw: true },
  { id: 'beans', name: 'Coffee Beans', base: 6, demand: 0, color: '#7a4a25', raw: true },
  { id: 'cotton', name: 'Cotton', base: 9, demand: 0, color: '#d9d4ff', raw: true },
];
export const GOOD_IDS = GOODS.map((g) => g.id);
export const PRODUCT_IDS = GOODS.filter((g) => !g.raw).map((g) => g.id as ProductId);
export const RAW_IDS = GOODS.filter((g) => g.raw).map((g) => g.id as RawId);
export const good = (id: GoodId) => GOODS.find((g) => g.id === id)!;
export const isRaw = (id: GoodId): id is RawId => !!good(id).raw;

/** What you start with */
export const START_DORRAS = 600;
/** The market buys back at this share of its price, and sells at this mark-up */
export const BID = 0.92;
export const ASK = 1.04;
/** Your stall's prices: a mark-up on the market price, and how fast it sells */
export const PRICE_LEVELS = {
  low: { markup: 1.15, pace: 1.5, label: 'Low' },
  fair: { markup: 1.35, pace: 1, label: 'Fair' },
  high: { markup: 1.6, pace: 0.55, label: 'High' },
} as const;
export type PriceLevel = keyof typeof PRICE_LEVELS;
export const PRICE_LEVEL_IDS = Object.keys(PRICE_LEVELS) as PriceLevel[];

/** Stall levels: how many kinds of goods, how many of each, how fast customers come, and the upgrade's cost */
export const STALL_LEVELS = [
  { level: 1, slots: 3, capacity: 20, pace: 1, cost: 0 },
  { level: 2, slots: 4, capacity: 40, pace: 1.25, cost: FREE_PLAY ? 0 : 2500 },
  { level: 3, slots: 6, capacity: 80, pace: 1.6, cost: FREE_PLAY ? 0 : 10000 },
] as const;
export const stallLevel = (level: number) => STALL_LEVELS[Math.max(0, Math.min(STALL_LEVELS.length - 1, level - 1))];

/** Standing at your stall (or a shop): customers come this much faster */
export const SERVING = 2;
/** While you're away: a quarter of the pace, for up to four hours */
export const OFFLINE_PACE = 0.25;
export const OFFLINE_CAP = 240;
/** A gap longer than this (minutes) counts as being away */
export const AWAY_AFTER = 2;

/* ---------- Phase 2: units, gardens, shops, the warehouse, the Workshop, your car ---------- */

/** The units on Makers' Row, north of the market square */
export const UNIT_COUNT = 4;
/** The 1st, 2nd, 3rd and 4th unit you buy */
export const UNIT_PRICES = FREE_PLAY ? [0, 0, 0, 0] : [2000, 4000, 8000, 14000];
/** What a unit can be built as, and what building it costs */
export const UNIT_KINDS = {
  garden: { name: 'Garden', cost: FREE_PLAY ? 0 : 500 },
  shop: { name: 'Shop', cost: FREE_PLAY ? 0 : 900 },
  warehouse: { name: 'Warehouse', cost: FREE_PLAY ? 0 : 700 },
} as const;
export type UnitKind = keyof typeof UNIT_KINDS;
export const UNIT_KIND_IDS = Object.keys(UNIT_KINDS) as UnitKind[];
/** Raw goods a minute from a garden, and how many its bins hold */
export const CROPS: Record<RawId, number> = { sugar: 3, beans: 2, cotton: 1.5 };
export const GARDEN_CAP = 60;
/** A shop: more shelves and more customers than a level 1 stall */
export const SHOP = { slots: 4, capacity: 50, pace: 1.5 } as const;
export const WAREHOUSE_CAP = 300;
/** The Workshop: what each product needs, and minutes per item */
export const RECIPES: Partial<Record<ProductId, { needs: Partial<Record<RawId, number>>; minutes: number }>> = {
  gummies: { needs: { sugar: 2 }, minutes: 0.2 },
  coffee: { needs: { beans: 2 }, minutes: 0.25 },
  tees: { needs: { cotton: 3 }, minutes: 0.5 },
  sneakers: { needs: { cotton: 8 }, minutes: 1.2 },
};
export const RECIPE_IDS = PRODUCT_IDS.filter((id) => RECIPES[id]);
/** The Workshop's bay (raw goods in, products out) and the most items a job can make */
export const WORKSHOP_CAP = 200;
export const JOB_MAX = 50;
/** How many goods each of your cars carries (mycar.ts), more with a roof rack (the garage's mods) */
export const CARGO: Record<string, number> = BASE_CARGO;
export const cargoCap = (model: string, s?: TycoonSave) => {
  const base = CARGO[model] ?? CARGO.hatch;
  const mods = s && PLAYER_CARS.includes(model as PlayerCar) ? carMods(s, model as PlayerCar) : NO_CAR_MODS;
  return carStats({ speed: 0, accel: 0, grip: 0 }, base, mods).cargo;
};
/** Delivering to a stall or shop yourself: this share of the goods' market price, as a bonus */
export const DELIVERY_BONUS = 0.1;

/* Phase 4: the big lots, east of Makers' Row: Dorras only (never the PLS district plots) */
export const LOT_COUNT = 3;
/** The 1st, 2nd and 3rd big lot you buy */
export const LOT_PRICES = FREE_PLAY ? [0, 0, 0] : [25000, 50000, 90000];
export const LOT_KINDS = {
  superstore: { name: 'Superstore', cost: FREE_PLAY ? 0 : 8000 },
  factory: { name: 'Factory', cost: FREE_PLAY ? 0 : 10000 },
  depot: { name: 'Depot', cost: FREE_PLAY ? 0 : 6000 },
  offices: { name: 'Offices', cost: FREE_PLAY ? 0 : 15000 },
} as const;
export type LotKind = keyof typeof LOT_KINDS;
export const LOT_KIND_IDS = Object.keys(LOT_KINDS) as LotKind[];
/** A superstore: six long aisles and crowds of customers */
export const SUPERSTORE = { slots: 6, capacity: 100, pace: 2.5 } as const;
/** A factory: its own bay, twice the Workshop's speed, bigger jobs */
export const FACTORY = { cap: 400, speed: 2, jobMax: 100 } as const;
/** A depot holds a lot, and couriers from it cost half */
export const DEPOT_CAP = 1000;
/** Your offices (one HQ is enough): every stall, shop and superstore sells this much faster */
export const HQ_BOOST = 1.2;

/* Phase 9 (The Trenches, step 3): four corner shops, Dorras only, from level CORNER_LEVEL */
export const CORNER_COUNT = 4;
/** The 1st, 2nd, 3rd and 4th corner shop you buy */
export const CORNER_PRICES = FREE_PLAY ? [0, 0, 0, 0] : [20000, 30000, 45000, 60000];
export const CORNER_LEVEL = FREE_PLAY ? 1 : 5;
/** A corner shop: always a shop (nothing to build), its shelves busier than Makers' Row's with The Trenches' foot traffic */
export const CORNER = { slots: 4, capacity: 60, pace: 2 } as const;

export type Stock = Partial<Record<GoodId, number>>;
export interface Slot {
  good: ProductId;
  qty: number;
  price: PriceLevel;
  /** Part-sold customers, carried to the next tick */
  carry: number;
}
export interface Unit {
  /** null: bought, nothing built yet */
  kind: UnitKind | null;
  /** A garden's crop */
  crop: RawId;
  /** A garden's bins or a warehouse's stock */
  stock: Stock;
  /** A shop's shelves */
  slots: Slot[];
  /** Part-grown crop, carried to the next tick */
  carry: number;
}
/** A big lot: a superstore's shelves, a factory's bay and job, or a depot's stock */
export interface Lot {
  /** null: bought, nothing built yet */
  kind: LotKind | null;
  stock: Stock;
  slots: Slot[];
  job: Job | null;
}
/** A corner shop in The Trenches: its shelves */
export interface Corner {
  slots: Slot[];
}
export type PlaceId = 'stall' | 'workshop' | 'u0' | 'u1' | 'u2' | 'u3' | 'l0' | 'l1' | 'l2' | CornerId;
export const UNIT_PLACES = ['u0', 'u1', 'u2', 'u3'] as const;
export const LOT_PLACES = ['l0', 'l1', 'l2'] as const;
export const CORNER_PLACES = ['c0', 'c1', 'c2', 'c3'] as const;
export const PLACE_IDS: PlaceId[] = ['stall', 'u0', 'u1', 'u2', 'u3', 'l0', 'l1', 'l2', ...CORNER_PLACES, 'workshop'];
/** The Vault's ledger: where Dorras came from and went */
export const ENTRIES = {
  sales: { name: 'Sales', in: true },
  bonus: { name: 'Delivery bonuses', in: true },
  contracts: { name: 'Contracts', in: true },
  soldBack: { name: 'Sold to the market', in: true },
  borrowed: { name: 'Loans', in: true },
  karting: { name: 'Kart prizes', in: true },
  missions: { name: 'Missions', in: true },
  soldLand: { name: 'Plots sold', in: true },
  bought: { name: 'Stock bought', in: false },
  property: { name: 'Property and building', in: false },
  land: { name: 'District plots', in: false },
  upgrades: { name: 'Upgrades', in: false },
  vehicles: { name: 'Cars', in: false },
  karts: { name: 'Karts', in: false },
  fighting: { name: 'Fight purses', in: true },
  fightclub: { name: 'Fight styles', in: false },
  gear: { name: 'Guns', in: false },
  clothes: { name: 'Clothes', in: false },
  items: { name: 'Snacks', in: false },
  staff: { name: 'Staff', in: false },
  couriers: { name: 'Couriers', in: false },
  repaid: { name: 'Loans repaid', in: false },
} as const;
export type Entry = keyof typeof ENTRIES;
export const ENTRY_IDS = Object.keys(ENTRIES) as Entry[];
export interface Ledger {
  totals: Partial<Record<Entry, number>>;
  /** The latest movements, newest last (a run of the same kind within a minute is one line) */
  recent: { t: number; e: Entry; n: number }[];
}
/** A loan from the Vault: what's still owed (the amount plus its flat fee) */
export interface Loan {
  owed: number;
  borrowed: number;
}
export interface Job {
  make: ProductId;
  /** Items still to make */
  left: number;
  /** Minutes into the current item */
  t: number;
}
/** What you've done, all time (missions and badges count from these) */
export interface Counters {
  /** Items sold at your stall and shops; Dorras taken */
  sold: number;
  earned: number;
  contracts: number;
  /** Knocked down (shot or by hand), and the dummies knocked down by hand (fists on the street) */
  dummies: number;
  drones: number;
  fistDowns: number;
  /** Tiles driven in your own car */
  driven: number;
  /** Cars, guns and clothes bought; units, lots and plots bought; buildings built; upgrades (mods and levels) */
  bought: number;
  land: number;
  built: number;
  upgrades: number;
  missions: number;
  /** Kart races finished, podiums, wins, laps without a wheel in the run-off, and karts passed */
  kartRaces: number;
  podiums: number;
  kartWins: number;
  cleanLaps: number;
  overtakes: number;
  /** Fights: bouts fought and won, knock-outs landed, chains of three or more */
  bouts: number;
  fightWins: number;
  kos: number;
  chains: number;
  /** On the street: spars with the partners, partners beaten (each once), chains of three on a dummy by hand */
  streetSpars: number;
  partnersBeaten: number;
  streetChains: number;
}
export type CounterId = keyof Counters;
export const COUNTER_IDS: CounterId[] = ['sold', 'earned', 'contracts', 'dummies', 'drones', 'fistDowns', 'driven', 'bought', 'land', 'built', 'upgrades', 'missions', 'kartRaces', 'podiums', 'kartWins', 'cleanLaps', 'overtakes', 'bouts', 'fightWins', 'kos', 'chains', 'streetSpars', 'partnersBeaten', 'streetChains'];
export const newCounters = (): Counters => Object.fromEntries(COUNTER_IDS.map((k) => [k, 0])) as unknown as Counters;
/** A district plot you own, bought with Dorras */
export interface OwnedPlot {
  design: Design | null;
  /** What you've paid for it and what's built on it (what selling it refunds a share of) */
  paid: number;
  at: number;
}
/** A mission you've taken on: the counters as they stood when you did */
export interface ActiveMission {
  id: string;
  from: Counters;
  at: number;
}
/** A time at the park: the best lap and the run it came from */
export interface KartTime {
  lap: number;
  run: number;
  kart: KartId;
  at: number;
}
export interface KartSave {
  model: KartId;
  paint: PaintId;
  owned: KartId[];
  mods: Partial<Record<KartId, KartMods>>;
  /** Your best per course and class (`recordKey`): the fastest lap, and the fastest time trial */
  records: Record<string, KartTime>;
  /** Your own leaderboard per course and class: the best time trials, fastest first (up to LEADERBOARD_SIZE) */
  boards: Record<string, KartTime[]>;
  /** A cup's series on the go: which race is next and everyone's points (by grid index; you are the last) */
  series: { cup: CupId; race: number; points: number[] } | null;
  /** Your best finish in each cup's series (1 = won it) */
  trophies: Partial<Record<CupId, number>>;
  /** The daily challenge: the day it was done */
  challenge: { day: string; lap: number } | null;
  /** The course-and-class keys whose par ghost you've beaten */
  parBeaten: string[];
  /** Your lap records from the tracks before this one, kept aside: the old network (before the rebuild, save v8) by their old
   * keys, and the circuit at full size (before it was scaled down, save v9) as `full-circuit` / `full-circuit-reverse` */
  old: Record<string, KartTime>;
}
/** The old network's courses and the full-size circuit's (records kept aside from them) */
const OLD_COURSES = ['neon-loop', 'neon-reverse', 'summit', 'summit-reverse', 'grand', 'grand-reverse', 'full-circuit', 'full-circuit-reverse'];
export const LEADERBOARD_SIZE = 10;

/** The Fight Club (docs/fight-plan.md): your style and the styles you own, your record, and each opponent's */
export interface FightSave {
  style: StyleId;
  styles: StyleId[];
  wins: number;
  losses: number;
  kos: number;
  bestChain: number;
  bouts: number;
  spars: number;
  bots: Partial<Record<BotLevel, { beaten: number; bestSeconds: number | null }>>;
  /** The sparring partners on the street (brawlsite.ts): spars with each, and how often beaten */
  partners: Partial<Record<PartnerId, { spars: number; beaten: number }>>;
}
export const emptyFight = (): FightSave => ({ style: 'brawler', styles: ['brawler'], wins: 0, losses: 0, kos: 0, bestChain: 0, bouts: 0, spars: 0, bots: {}, partners: {} });
export const recordKey = (course: string, cls: string) => `${course}:${cls}`;
export const emptyKarts = (): KartSave => ({ model: DEFAULT_KART.model, paint: DEFAULT_KART.paint, owned: [], mods: {}, records: {}, boards: {}, series: null, trophies: {}, challenge: null, parBeaten: [], old: {} });

export interface TycoonSave {
  v: 11;
  dorras: number;
  till: number;
  /** When it was last brought up to date (ms since 1970) */
  at: number;
  stall: { level: number; slots: Slot[] };
  /** Makers' Row: null where you don't own the unit */
  units: (Unit | null)[];
  workshop: { stock: Stock; job: Job | null };
  /** What's in your car */
  cargo: Stock;
  /** Places with someone working there (Phase 3) */
  staff: PlaceId[];
  /** Couriers on their way */
  shipments: Shipment[];
  /** Contracts you've taken on, and the ids of every contract taken lately (so one can't be taken twice) */
  contracts: Contract[];
  taken: number[];
  /** The big lots (Phase 4): null where you don't own the lot */
  lots: (Lot | null)[];
  /** The Trenches' corner shops (save v10): null where you don't own the shop */
  corners: (Corner | null)[];
  ledger: Ledger;
  loan: Loan | null;
  stats: { earned: number; sold: number; made: number; grown: number; bonus: number; wages: number; contracts: number };
  /* Phase 5: the city's game */
  xp: number;
  garage: { owned: PlayerCar[]; mods: Partial<Record<PlayerCar, CarMods>> };
  armoury: { owned: WeaponId[]; mods: Partial<Record<WeaponId, GunMods>> };
  /** Premium wardrobe items (catalog.ts) you've bought */
  wardrobe: string[];
  /** District plots you own, by plot id */
  plots: Record<string, OwnedPlot>;
  /** The level of each place you run (1 where unset) */
  levels: Partial<Record<PlaceId, number>>;
  /** The kart park: your pick, the karts you've bought and their mods, your records and boards per course and class, a series on the go, trophies */
  karts: KartSave;
  fight: FightSave;
  missions: { active: ActiveMission[]; done: string[] };
  /** Badges (achievements) earned */
  badges: string[];
  counters: Counters;
  /** Getting started (guide.ts): the step you're on (GUIDE_STEPS once done), and whether it's hidden */
  guide: { step: number; hidden: boolean };
  /** When the save was last downloaded as a backup (ms since 1970; 0 never) */
  backup: number;
  /** The places you've walked to (places.ts), where fast travel can take you */
  visited: string[];
  /** What Degen carries (inventory.ts, save v11): his loadout of two guns, the thing in his hand, his consumables */
  inventory: Inventory;
}
/** How many steps Getting started has (guide.ts's GUIDE) */
export const GUIDE_STEPS = 7;

export function newSave(now: number): TycoonSave {
  return {
    v: 11,
    dorras: START_DORRAS,
    till: 0,
    at: now,
    stall: { level: 1, slots: [] },
    units: Array.from({ length: UNIT_COUNT }, () => null),
    workshop: { stock: {}, job: null },
    cargo: {},
    staff: [],
    shipments: [],
    contracts: [],
    taken: [],
    lots: Array.from({ length: LOT_COUNT }, () => null),
    corners: Array.from({ length: CORNER_COUNT }, () => null),
    ledger: { totals: {}, recent: [] },
    loan: null,
    stats: { earned: 0, sold: 0, made: 0, grown: 0, bonus: 0, wages: 0, contracts: 0 },
    xp: 0,
    garage: { owned: [], mods: {} },
    armoury: { owned: [], mods: {} },
    wardrobe: [],
    plots: {},
    levels: {},
    karts: emptyKarts(),
    fight: emptyFight(),
    missions: { active: [], done: [] },
    badges: [],
    counters: newCounters(),
    guide: { step: 0, hidden: false },
    backup: 0,
    visited: [],
    inventory: emptyInventory(),
  };
}
const emptyLot = (): Lot => ({ kind: null, stock: {}, slots: [], job: null });
const emptyUnit = (): Unit => ({ kind: null, crop: 'sugar', stock: {}, slots: [], carry: 0 });

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
export const total = (st: Stock) => Object.values(st).reduce<number>((a, b) => a + (b ?? 0), 0);

function cleanSlots(raw: unknown, max: number, capacity: number): Slot[] {
  const seen = new Set<GoodId>();
  const slots: Slot[] = [];
  for (const s of Array.isArray(raw) ? raw : []) {
    const r = obj(s);
    const id = PRODUCT_IDS.find((g) => g === r.good);
    if (!id || seen.has(id) || slots.length >= max) continue;
    seen.add(id);
    slots.push({
      good: id,
      qty: Math.floor(num(r.qty, 0, capacity, 0)),
      price: PRICE_LEVEL_IDS.find((p) => p === r.price) ?? 'fair',
      carry: num(r.carry, 0, 0.999, 0),
    });
  }
  return slots;
}
/** A stock list: known goods only, whole numbers, and no more than `cap` in all */
function cleanStock(raw: unknown, cap: number, only?: (id: GoodId) => boolean): Stock {
  const out: Stock = {};
  let left = cap;
  for (const id of GOOD_IDS) {
    if (only && !only(id)) continue;
    const n = Math.min(left, Math.floor(num(obj(raw)[id], 0, cap, 0)));
    if (n > 0) {
      out[id] = n;
      left -= n;
    }
  }
  return out;
}
function cleanUnit(raw: unknown, mul = 1): Unit | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = obj(raw);
  const kind = UNIT_KIND_IDS.find((k) => k === r.kind) ?? null;
  const crop = RAW_IDS.find((c) => c === r.crop) ?? 'sugar';
  return {
    kind,
    crop,
    stock: kind === 'garden' ? cleanStock(r.stock, Math.round(GARDEN_CAP * mul), (id) => id === crop) : kind === 'warehouse' ? cleanStock(r.stock, Math.round(WAREHOUSE_CAP * mul)) : {},
    slots: kind === 'shop' ? cleanSlots(r.slots, SHOP.slots, Math.round(SHOP.capacity * mul)) : [],
    carry: num(r.carry, 0, 0.999, 0),
  };
}

/** A save from the browser (or anywhere) made safe: unknown goods dropped, numbers clamped; a fresh save if it isn't one. Saves from Phases 1-3 carry on. */
export function cleanSave(raw: unknown, now: number): TycoonSave {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return newSave(now);
  const o = raw as Record<string, unknown>;
  const st = obj(o.stall);
  const level = Math.round(num(st.level, 1, STALL_LEVELS.length, 1));
  const L = stallLevel(level);
  const stats = obj(o.stats);
  const units = Array.isArray(o.units) ? o.units : [];
  const ws = obj(o.workshop);
  // Phase 5: the places' levels first (they set how much each holds)
  const levels: Partial<Record<PlaceId, number>> = {};
  for (const p of PLACE_IDS) {
    const l = Math.round(num(obj(o.levels)[p], 1, PLACE_LEVELS, 1));
    if (l > 1 && p !== 'stall') levels[p] = l;
  }
  const mul = (p: PlaceId) => LEVEL_CAPACITY[(levels[p] ?? 1) - 1];
  const s: TycoonSave = {
    v: 11,
    dorras: Math.floor(num(o.dorras, 0, 1e12, START_DORRAS)),
    till: Math.floor(num(o.till, 0, 1e12, 0)),
    at: num(o.at, 0, now, now),
    stall: { level, slots: cleanSlots(st.slots, L.slots, L.capacity) },
    units: Array.from({ length: UNIT_COUNT }, (_, i) => cleanUnit(units[i], mul(`u${i}` as PlaceId))),
    workshop: {
      stock: cleanStock(ws.stock, Math.round(WORKSHOP_CAP * mul('workshop'))),
      job: cleanJob(ws.job, JOB_MAX),
    },
    cargo: cleanStock(o.cargo, Math.round(Math.max(...Object.values(CARGO)) * 2)),
    staff: [],
    shipments: [],
    contracts: [],
    taken: [],
    lots: Array.from({ length: LOT_COUNT }, (_, i) => cleanLot((Array.isArray(o.lots) ? o.lots : [])[i], mul(`l${i}` as PlaceId))),
    // (v10: a save from before them owns none)
    corners: Array.from({ length: CORNER_COUNT }, (_, i) => cleanCorner((Array.isArray(o.corners) ? o.corners : [])[i], mul(`c${i}` as PlaceId))),
    ledger: cleanLedger(o.ledger, now),
    loan: null,
    stats: {
      earned: Math.floor(num(stats.earned, 0, 1e15, 0)),
      sold: Math.floor(num(stats.sold, 0, 1e15, 0)),
      made: Math.floor(num(stats.made, 0, 1e15, 0)),
      grown: Math.floor(num(stats.grown, 0, 1e15, 0)),
      bonus: Math.floor(num(stats.bonus, 0, 1e15, 0)),
      wages: Math.floor(num(stats.wages, 0, 1e15, 0)),
      contracts: Math.floor(num(stats.contracts, 0, 1e9, 0)),
    },
    xp: Math.floor(num(o.xp, 0, 1e9, 0)),
    garage: { owned: [], mods: {} },
    armoury: { owned: [], mods: {} },
    wardrobe: [],
    plots: {},
    levels,
    karts: emptyKarts(),
    fight: emptyFight(),
    missions: { active: [], done: [] },
    badges: [],
    counters: newCounters(),
    guide: { step: 0, hidden: false },
    backup: 0,
    visited: [],
    inventory: emptyInventory(),
  };
  cleanGame(s, o, now);
  // (v11: a save from before the inventory carries the rifle and the first gun it bought)
  s.inventory = cleanInventory(o.inventory, s);
  // Phase 3: staff only where there's a job for them; couriers and contracts checked against the rules
  const places = (v: unknown) => PLACE_IDS.find((p) => p === v);
  s.staff = [...new Set((Array.isArray(o.staff) ? o.staff : []).map(places).filter((p): p is PlaceId => !!p && !!roleAt(s, p)))];
  for (const raw of (Array.isArray(o.shipments) ? o.shipments : []).slice(0, SHIP_MAX)) {
    const r = obj(raw);
    const from = places(r.from);
    const to = places(r.to);
    const good = GOOD_IDS.find((g) => g === r.good);
    const qty = Math.floor(num(r.qty, 0, SHIP_QTY, 0));
    if (from && to && good && qty > 0) s.shipments.push({ from, to, good, qty, arrives: num(r.arrives, 0, now + 60 * 60000, now) });
  }
  for (const raw of (Array.isArray(o.contracts) ? o.contracts : []).slice(0, CONTRACTS_MAX)) {
    const r = obj(raw);
    const good = PRODUCT_IDS.find((g) => g === r.good);
    const to = DEST_IDS.find((d) => d === r.to);
    const qty = Math.floor(num(r.qty, 1, CONTRACT_QTY, 0));
    const id = Math.floor(num(r.id, 0, 1e12, -1));
    // A contract's reward can't be more than the most the board ever offers for it
    if (good && to && qty > 0 && id >= 0)
      s.contracts.push({ id, good, qty, to, reward: Math.floor(num(r.reward, 0, good ? qty * good_(good).base * REWARD_MAX : 0, 0)), expires: num(r.expires, 0, now + CONTRACT_TIME * 60000, 0) });
  }
  s.taken = (Array.isArray(o.taken) ? o.taken : []).filter((n): n is number => Number.isInteger(n) && n >= 0).slice(-40);
  // Phase 4: a loan can't be more than the most the Vault ever lends, plus its fee
  const loan = obj(o.loan);
  const owed = Math.ceil(num(loan.owed, 0, Math.round(LOAN_MAX * (1 + LOAN_FEE)), 0));
  if (owed > 0) s.loan = { owed, borrowed: Math.floor(num(loan.borrowed, 0, LOAN_MAX, 0)) };
  return s;
}
function cleanJob(raw: unknown, max: number): Job | null {
  const job = obj(raw);
  const left = Math.floor(num(job.left, 0, max, 0));
  const make = left > 0 ? RECIPE_IDS.find((id) => id === job.make) : undefined;
  return make ? { make, left, t: num(job.t, 0, RECIPES[make]!.minutes, 0) } : null;
}
function cleanLot(raw: unknown, mul = 1): Lot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = obj(raw);
  const kind = LOT_KIND_IDS.find((k) => k === r.kind) ?? null;
  return {
    kind,
    stock: kind === 'depot' ? cleanStock(r.stock, Math.round(DEPOT_CAP * mul)) : kind === 'factory' ? cleanStock(r.stock, Math.round(FACTORY.cap * mul)) : {},
    slots: kind === 'superstore' ? cleanSlots(r.slots, SUPERSTORE.slots, Math.round(SUPERSTORE.capacity * mul)) : [],
    job: kind === 'factory' ? cleanJob(r.job, FACTORY.jobMax) : null,
  };
}
function cleanCorner(raw: unknown, mul = 1): Corner | null {
  if (!raw || typeof raw !== 'object') return null;
  return { slots: cleanSlots(obj(raw).slots, CORNER.slots, Math.round(CORNER.capacity * mul)) };
}
function cleanLedger(raw: unknown, now: number): Ledger {
  const l = obj(raw);
  const totals: Partial<Record<Entry, number>> = {};
  for (const e of ENTRY_IDS) {
    const n = Math.floor(num(obj(l.totals)[e], 0, 1e15, 0));
    if (n > 0) totals[e] = n;
  }
  const recent = (Array.isArray(l.recent) ? l.recent : [])
    .map((x) => obj(x))
    .filter((x) => ENTRY_IDS.includes(x.e as Entry))
    .map((x) => ({ t: num(x.t, 0, now, now), e: x.e as Entry, n: Math.floor(num(x.n, 0, 1e15, 0)) }))
    .slice(-LEDGER_LINES);
  return { totals, recent };
}

/* ---------- The market ---------- */

/** A fixed little number per good, for its own rhythm */
const phase = (id: GoodId) => (GOOD_IDS.indexOf(id) + 1) * 1.731;

/**
 * The market hall's price for a good at a moment: it swings around its base
 * over the hours (two waves of its own, about ±26%), the same for everyone.
 */
export function marketPrice(id: GoodId, now: number) {
  const g = good(id);
  const m = now / 60000;
  const i = GOOD_IDS.indexOf(id);
  const slow = Math.sin((m / (38 + i * 7)) * Math.PI * 2 + phase(id));
  const quick = Math.sin((m / (8 + i * 1.3)) * Math.PI * 2 + phase(id) * 2.3);
  return Math.max(1, Math.round(g.base * (1 + slow * 0.18 + quick * 0.08)));
}
/** Is the price on its way up (1), down (-1) or about flat (0)? */
export function trend(id: GoodId, now: number) {
  const d = marketPrice(id, now + 5 * 60000) - marketPrice(id, now);
  return Math.abs(d) < good(id).base * 0.02 ? 0 : Math.sign(d);
}
export const askPrice = (id: GoodId, now: number) => Math.ceil(marketPrice(id, now) * ASK);
export const bidPrice = (id: GoodId, now: number) => Math.max(1, Math.floor(marketPrice(id, now) * BID));
/** What a customer pays at your stall */
export const retailPrice = (id: GoodId, level: PriceLevel, now: number) => Math.round(marketPrice(id, now) * PRICE_LEVELS[level].markup);

/* ---------- Your places: the stall, your units, the Workshop ---------- */

export const unitIndex = (p: PlaceId) => (p.startsWith('u') ? Number(p.slice(1)) : -1);
export const unitAt = (s: TycoonSave, p: PlaceId) => s.units[unitIndex(p)] ?? null;
export const lotIndex = (p: PlaceId) => (p.startsWith('l') ? Number(p.slice(1)) : -1);
export const lotAt = (s: TycoonSave, p: PlaceId) => s.lots[lotIndex(p)] ?? null;
export const cornerIndex = (p: PlaceId) => (p.startsWith('c') ? Number(p.slice(1)) : -1);
export const cornerAt = (s: TycoonSave, p: PlaceId) => s.corners[cornerIndex(p)] ?? null;
/** What's built at a place you own (a unit's or a big lot's kind; a corner shop is always one), if anything */
export const kindAt = (s: TycoonSave, p: PlaceId): UnitKind | LotKind | 'corner' | null => unitAt(s, p)?.kind ?? lotAt(s, p)?.kind ?? (cornerAt(s, p) ? 'corner' : null);
/** Places that sell to the public: the stall, your shops, superstores and corner shops */
export const sells = (s: TycoonSave, p: PlaceId) => p === 'stall' || kindAt(s, p) === 'shop' || kindAt(s, p) === 'superstore' || kindAt(s, p) === 'corner';
/** Places you can load your car from (stock on sale stays on the shelves) */
export const loadsFrom = (s: TycoonSave, p: PlaceId) => p === 'workshop' || ['garden', 'warehouse', 'depot', 'factory'].includes(kindAt(s, p) ?? '');
/** Places that make things: the Workshop and your factories */
export const makes = (s: TycoonSave, p: PlaceId) => p === 'workshop' || kindAt(s, p) === 'factory';
/** A sales point's shelves, how many kinds and how many of each, and how fast customers come */
function shelves(s: TycoonSave, p: PlaceId) {
  if (p === 'stall') {
    const L = stallLevel(s.stall.level);
    return { slots: s.stall.slots, max: L.slots, capacity: L.capacity, pace: L.pace, set: (v: Slot[]) => (s.stall.slots = v) };
  }
  const c = cornerAt(s, p);
  if (c) return { slots: c.slots, max: CORNER.slots, capacity: Math.round(CORNER.capacity * capacityMul(s, p)), pace: CORNER.pace * paceMul(s, p), set: (v: Slot[]) => (c.slots = v) };
  const u = unitAt(s, p) ?? lotAt(s, p);
  const spec = u?.kind === 'shop' ? SHOP : u?.kind === 'superstore' ? SUPERSTORE : null;
  if (!u || !spec) return null;
  // A place's level: more of each kind on its shelves, more customers
  return { slots: u.slots, max: spec.slots, capacity: Math.round(spec.capacity * capacityMul(s, p)), pace: spec.pace * paceMul(s, p), set: (v: Slot[]) => (u.slots = v) };
}
/** A place's level (1-3; the stall has its own levels) and what each level does for it */
export const placeLevel = (s: TycoonSave, p: PlaceId) => (p === 'stall' ? 1 : (s.levels[p] ?? 1));
export const capacityMul = (s: TycoonSave, p: PlaceId) => LEVEL_CAPACITY[placeLevel(s, p) - 1];
export const paceMul = (s: TycoonSave, p: PlaceId) => LEVEL_PACE[placeLevel(s, p) - 1];
export const speedMul = (s: TycoonSave, p: PlaceId) => LEVEL_SPEED[placeLevel(s, p) - 1];
/** How much a storing place holds at its level (a garden's bins, a warehouse, the Workshop's bay, a depot, a factory's bay) */
export function capOf(s: TycoonSave, p: PlaceId) {
  if (p === 'workshop') return Math.round(WORKSHOP_CAP * capacityMul(s, p));
  const k = kindAt(s, p);
  const base = k === 'garden' ? GARDEN_CAP : k === 'warehouse' ? WAREHOUSE_CAP : k === 'depot' ? DEPOT_CAP : k === 'factory' ? FACTORY.cap : 0;
  return Math.round(base * capacityMul(s, p));
}
/** Everything at a place, as a stock list */
export function stockAt(s: TycoonSave, p: PlaceId): Stock {
  const sh = shelves(s, p);
  if (sh) return Object.fromEntries(sh.slots.map((x) => [x.good, x.qty]));
  if (p === 'workshop') return s.workshop.stock;
  return unitAt(s, p)?.stock ?? lotAt(s, p)?.stock ?? {};
}
export const holds = (s: TycoonSave, p: PlaceId, id: GoodId) => stockAt(s, p)[id] ?? 0;

export const slotOf = (s: TycoonSave, id: GoodId, p: PlaceId = 'stall') => shelves(s, p)?.slots.find((x) => x.good === id);
/** How many more of a good a place can take (a new kind on a stall or shop needs a free shelf) */
export function room(s: TycoonSave, id: GoodId, p: PlaceId = 'stall') {
  const sh = shelves(s, p);
  if (sh) {
    if (isRaw(id)) return 0;
    const slot = sh.slots.find((x) => x.good === id);
    if (slot) return sh.capacity - slot.qty;
    return sh.slots.length < sh.max ? sh.capacity : 0;
  }
  if (p === 'workshop') return Math.max(0, capOf(s, p) - total(s.workshop.stock));
  const k = kindAt(s, p);
  const cap = k === 'warehouse' || k === 'depot' || k === 'factory' ? capOf(s, p) : 0;
  return Math.max(0, cap - total(stockAt(s, p)));
}
/** Put goods in a place (call room() first) */
function put(s: TycoonSave, p: PlaceId, id: GoodId, n: number) {
  const sh = shelves(s, p);
  if (sh) {
    let slot = sh.slots.find((x) => x.good === id);
    if (!slot) {
      slot = { good: id as ProductId, qty: 0, price: 'fair', carry: 0 };
      sh.slots.push(slot);
    }
    slot.qty += n;
    return;
  }
  const st = stockAt(s, p);
  st[id] = (st[id] ?? 0) + n;
}
/** Take goods out of a place (no more than it holds); an emptied shelf frees up */
function take(s: TycoonSave, p: PlaceId, id: GoodId, n: number) {
  const k = Math.min(n, holds(s, p, id));
  if (k <= 0) return 0;
  const sh = shelves(s, p);
  if (sh) {
    const slot = sh.slots.find((x) => x.good === id)!;
    slot.qty -= k;
    if (slot.qty === 0) sh.set(sh.slots.filter((x) => x !== slot));
    return k;
  }
  const st = stockAt(s, p);
  st[id] = (st[id] ?? 0) - k;
  if (!st[id]) delete st[id];
  return k;
}

export type Result =
  | { ok: true; qty: number; dorras: number }
  | { ok: false; why: 'money' | 'room' | 'stock' | 'max' | 'busy' | 'owned' | 'place' | 'time' };

/** Buy at the market hall, delivered straight to one of your places (as many as you can, up to `qty`) */
export function buy(s: TycoonSave, id: GoodId, qty: number, now: number, to: PlaceId = 'stall'): Result {
  const each = askPrice(id, now);
  const space = room(s, id, to);
  if (space <= 0) return { ok: false, why: 'room' };
  const n = Math.min(Math.floor(qty), space, Math.floor(s.dorras / each));
  if (n <= 0) return { ok: false, why: 'money' };
  put(s, to, id, n);
  s.dorras -= n * each;
  book(s, 'bought', n * each);
  return { ok: true, qty: n, dorras: n * each };
}

/** Sell goods from one of your places back to the market hall (a little under its price) */
export function sellBack(s: TycoonSave, id: GoodId, qty: number, now: number, from: PlaceId = 'stall'): Result {
  const n = take(s, from, id, Math.floor(qty));
  if (n <= 0) return { ok: false, why: 'stock' };
  const each = bidPrice(id, now);
  s.dorras += n * each;
  book(s, 'soldBack', n * each);
  return { ok: true, qty: n, dorras: n * each };
}

/** Free a sold-out shelf for another kind of goods */
export function clearSlot(s: TycoonSave, id: GoodId, p: PlaceId = 'stall') {
  const sh = shelves(s, p);
  const slot = sh?.slots.find((x) => x.good === id);
  if (!sh || !slot || slot.qty > 0) return false;
  sh.set(sh.slots.filter((x) => x !== slot));
  return true;
}

export function setPrice(s: TycoonSave, id: GoodId, level: PriceLevel, p: PlaceId = 'stall') {
  const slot = slotOf(s, id, p);
  if (slot && level in PRICE_LEVELS) slot.price = level;
}

/** Take the till's takings into your balance */
export function collect(s: TycoonSave) {
  const n = s.till;
  s.dorras += n;
  s.till = 0;
  return n;
}

export function upgradeCost(s: TycoonSave) {
  const next = STALL_LEVELS[s.stall.level];
  return next ? next.cost : null;
}
export function upgrade(s: TycoonSave): Result {
  const cost = upgradeCost(s);
  if (cost === null) return { ok: false, why: 'max' };
  if (s.dorras < cost) return { ok: false, why: 'money' };
  s.dorras -= cost;
  book(s, 'property', cost);
  s.stall.level += 1;
  return { ok: true, qty: 1, dorras: cost };
}

/* ---------- Units ---------- */

/** What the next unit costs (null once you own them all) */
export function unitPrice(s: TycoonSave) {
  const owned = s.units.filter(Boolean).length;
  return owned < UNIT_PRICES.length ? UNIT_PRICES[owned] : null;
}
export function buyUnit(s: TycoonSave, i: number): Result {
  if (i < 0 || i >= UNIT_COUNT) return { ok: false, why: 'place' };
  if (s.units[i]) return { ok: false, why: 'owned' };
  const price = unitPrice(s)!;
  if (s.dorras < price) return { ok: false, why: 'money' };
  s.dorras -= price;
  book(s, 'property', price);
  s.units[i] = emptyUnit();
  count(s, 'land', 1);
  addXp(s, XP.property);
  return { ok: true, qty: 1, dorras: price };
}
/** Build (or rebuild) a unit as a garden, shop or warehouse; it has to be empty of goods first */
export function buildUnit(s: TycoonSave, i: number, kind: UnitKind, crop?: RawId): Result {
  const u = s.units[i];
  if (!u) return { ok: false, why: 'place' };
  if (total(stockAt(s, `u${i}` as PlaceId)) > 0) return { ok: false, why: 'stock' };
  if (u.kind === kind) return { ok: false, why: 'owned' };
  const cost = UNIT_KINDS[kind].cost;
  if (s.dorras < cost) return { ok: false, why: 'money' };
  s.dorras -= cost;
  book(s, 'property', cost);
  Object.assign(u, emptyUnit(), { kind, crop: crop ?? u.crop });
  // Whoever worked there had a different job: they go
  s.staff = s.staff.filter((p) => p !== `u${i}`);
  count(s, 'built', 1);
  addXp(s, XP.property);
  return { ok: true, qty: 1, dorras: cost };
}
/** Change what a garden grows (its bins have to be empty) */
export function setCrop(s: TycoonSave, i: number, crop: RawId): Result {
  const u = s.units[i];
  if (u?.kind !== 'garden') return { ok: false, why: 'place' };
  if (total(u.stock) > 0) return { ok: false, why: 'stock' };
  u.crop = crop;
  u.carry = 0;
  return { ok: true, qty: 0, dorras: 0 };
}

/* ---------- The Workshop ---------- */

/** A place that makes things (the Workshop or a factory): its bay, its job, how fast and how big */
export function line(s: TycoonSave, p: PlaceId = 'workshop') {
  if (p === 'workshop') return { stock: s.workshop.stock, job: s.workshop.job, set: (j: Job | null) => (s.workshop.job = j), speed: speedMul(s, p), max: JOB_MAX };
  const l = lotAt(s, p);
  if (l?.kind !== 'factory') return null;
  return { stock: l.stock, job: l.job, set: (j: Job | null) => (l.job = j), speed: FACTORY.speed * speedMul(s, p), max: FACTORY.jobMax };
}
/** How many of a product a bay has the raw goods for */
export function canMake(s: TycoonSave, make: ProductId, p: PlaceId = 'workshop') {
  const r = RECIPES[make];
  const ln = line(s, p);
  if (!r || !ln) return 0;
  return Math.min(ln.max, ...Object.entries(r.needs).map(([raw, n]) => Math.floor((ln.stock[raw as RawId] ?? 0) / n!)));
}
/** Start a job: its raw goods leave the bay now, the products arrive one by one */
export function startJob(s: TycoonSave, make: ProductId, qty: number, p: PlaceId = 'workshop'): Result {
  const r = RECIPES[make];
  const ln = line(s, p);
  if (!r || !ln) return { ok: false, why: 'place' };
  if (ln.job) return { ok: false, why: 'busy' };
  const n = Math.min(Math.floor(qty), canMake(s, make, p));
  if (n <= 0) return { ok: false, why: 'stock' };
  for (const [raw, k] of Object.entries(r.needs)) take(s, p, raw as RawId, k! * n);
  ln.set({ make, left: n, t: 0 });
  return { ok: true, qty: n, dorras: 0 };
}
/** Stop the job: the raw goods for what wasn't made go back in the bay */
export function cancelJob(s: TycoonSave, p: PlaceId = 'workshop') {
  const ln = line(s, p);
  const j = ln?.job;
  if (!ln || !j) return false;
  for (const [raw, k] of Object.entries(RECIPES[j.make]!.needs)) put(s, p, raw as RawId, k! * j.left);
  ln.set(null);
  return true;
}

/* ---------- Your car ---------- */

/** Load your car at a garden, the warehouse or the Workshop */
export function load(s: TycoonSave, from: PlaceId, id: GoodId, qty: number, cap: number): Result {
  if (!loadsFrom(s, from)) return { ok: false, why: 'place' };
  const space = cap - total(s.cargo);
  if (space <= 0) return { ok: false, why: 'room' };
  const n = take(s, from, id, Math.min(Math.floor(qty), space));
  if (n <= 0) return { ok: false, why: 'stock' };
  s.cargo[id] = (s.cargo[id] ?? 0) + n;
  return { ok: true, qty: n, dorras: 0 };
}
/** Unload your car at one of your places; delivering to a stall or shop pays a bonus (`dorras`) */
export function unload(s: TycoonSave, to: PlaceId, id: GoodId, qty: number, now: number): Result {
  const have = s.cargo[id] ?? 0;
  if (have <= 0) return { ok: false, why: 'stock' };
  const n = Math.min(Math.floor(qty), have, room(s, id, to));
  if (n <= 0) return { ok: false, why: 'room' };
  put(s, to, id, n);
  s.cargo[id] = have - n;
  if (!s.cargo[id]) delete s.cargo[id];
  const bonus = sells(s, to) ? Math.floor(n * marketPrice(id, now) * DELIVERY_BONUS) : 0;
  s.dorras += bonus;
  s.stats.bonus += bonus;
  if (bonus) book(s, 'bonus', bonus);
  return { ok: true, qty: n, dorras: bonus };
}

/* ---------- Time passing ---------- */

/** Customers a minute for one shelf right now (before serving or being away) */
export function pace(s: TycoonSave, slot: Slot, p: PlaceId = 'stall') {
  return good(slot.good).demand * PRICE_LEVELS[slot.price].pace * (shelves(s, p)?.pace ?? 1) * (hasHQ(s) ? HQ_BOOST : 1);
}
/** Do you have offices (an HQ) on a big lot? */
export const hasHQ = (s: TycoonSave) => s.lots.some((l) => l?.kind === 'offices');

export interface Sales {
  /** Minutes covered, and how many of them you were away */
  minutes: number;
  away: number;
  sold: Partial<Record<GoodId, number>>;
  earned: number;
  /** Grown in gardens, made at the Workshop */
  grown: Partial<Record<GoodId, number>>;
  made: Partial<Record<GoodId, number>>;
  /** Paid to staff; staff who left because they couldn't be paid */
  wages: number;
  quit: PlaceId[];
  /** Taken from the takings towards a loan */
  repaid: number;
  /** Couriers that arrived (what they brought), contracts that ran out */
  arrived: Shipment[];
  expired: Contract[];
}
const add = (m: Partial<Record<GoodId, number>>, id: GoodId, n: number) => (m[id] = (m[id] ?? 0) + n);

/**
 * Bring everything up to `now`: customers buy from your stall and shops at
 * their prices (takings go in the till), gardens grow, the Workshop works.
 * `serving`: the place you're standing at (true: the stall).
 */
export function advance(s: TycoonSave, now: number, serving: PlaceId | boolean = false): Sales {
  const out: Sales = { minutes: 0, away: 0, sold: {}, earned: 0, grown: {}, made: {}, wages: 0, quit: [], repaid: 0, arrived: [], expired: [] };
  const gap = (now - s.at) / 60000;
  s.at = Math.max(s.at, now);
  if (!(gap > 0)) return out;
  // Couriers arrive (as much as there's room for; the rest waits), contracts run out
  for (const sh of s.shipments) {
    if (sh.arrives > now) continue;
    const n = Math.min(sh.qty, room(s, sh.good, sh.to));
    if (n <= 0) continue;
    put(s, sh.to, sh.good, n);
    sh.qty -= n;
    out.arrived.push({ ...sh, qty: n });
  }
  s.shipments = s.shipments.filter((sh) => sh.qty > 0);
  out.expired = s.contracts.filter((c) => c.expires < now);
  s.contracts = s.contracts.filter((c) => c.expires >= now);
  // A long gap was time away: slower, and only so much of it counts
  const away = gap > AWAY_AFTER;
  const minutes = away ? Math.min(gap, OFFLINE_CAP) : gap;
  const at = serving === true ? 'stall' : serving || null;
  out.minutes = minutes;
  out.away = away ? minutes : 0;
  for (const p of PLACE_IDS) {
    const sh = shelves(s, p);
    if (!sh) continue;
    // A clerk sells half as fast again, and at full pace while you're away
    const clerk = s.staff.includes(p);
    const rate = (away ? (clerk ? 1 : OFFLINE_PACE) : at === p ? SERVING : 1) * (clerk ? STAFF_BOOST : 1);
    for (const slot of sh.slots) {
      if (slot.qty <= 0) continue;
      const want = pace(s, slot, p) * rate * minutes + slot.carry;
      const n = Math.min(slot.qty, Math.floor(want));
      slot.carry = n < slot.qty ? want - Math.floor(want) : 0;
      if (n <= 0) continue;
      slot.qty -= n;
      const pay = n * retailPrice(slot.good, slot.price, now);
      const cut = clerk ? Math.floor(pay * STAFF_CUT) : 0;
      // A loan takes its share of the takings until it's paid off
      const repay = s.loan ? Math.min(s.loan.owed, Math.floor((pay - cut) * LOAN_SHARE)) : 0;
      if (repay) payLoan(s, repay);
      s.till += pay - cut - repay;
      s.stats.wages += cut;
      if (cut) book(s, 'staff', cut);
      book(s, 'sales', pay - cut);
      out.wages += cut;
      out.repaid += repay;
      out.earned += pay - cut - repay;
      add(out.sold, slot.good, n);
      s.stats.sold += n;
      s.stats.earned += pay;
      count(s, 'sold', n);
      count(s, 'earned', pay - cut - repay);
      addXp(s, n * XP.sale);
    }
  }
  // Gardens grow until their bins are full (as fast while you're away; bigger bins and faster growth at higher levels)
  s.units.forEach((u, i) => {
    if (u?.kind !== 'garden') return;
    const p = `u${i}` as PlaceId;
    const hand = s.staff.includes(p);
    const have = u.stock[u.crop] ?? 0;
    const cap = capOf(s, p);
    const want = CROPS[u.crop] * (hand ? STAFF_BOOST : 1) * speedMul(s, p) * minutes + u.carry;
    const n = Math.min(cap - have, Math.floor(want));
    u.carry = have + n < cap ? want - Math.floor(want) : 0;
    if (n <= 0) return;
    u.stock[u.crop] = have + n;
    add(out.grown, u.crop, n);
    s.stats.grown += n;
    if (hand) payStaff(s, p, n * marketPrice(u.crop, now) * STAFF_CUT, out);
  });
  // The Workshop and your factories work through their jobs
  for (const p of PLACE_IDS) {
    const ln = makes(s, p) ? line(s, p) : null;
    const j = ln?.job;
    if (!ln || !j) continue;
    const each = RECIPES[j.make]!.minutes;
    const hand = s.staff.includes(p);
    const t = j.t + minutes * ln.speed * (hand ? STAFF_BOOST : 1);
    const n = Math.min(j.left, Math.floor(t / each));
    if (n > 0) {
      put(s, p, j.make, n);
      add(out.made, j.make, n);
      s.stats.made += n;
      if (hand) payStaff(s, p, n * marketPrice(j.make, now) * STAFF_CUT, out);
    }
    j.left -= n;
    j.t = j.left > 0 ? t - n * each : 0;
    if (j.left <= 0) ln.set(null);
  }
  return out;
}

/* ---------- Phase 3: staff, couriers, contracts ---------- */

/** Who works where: a clerk at a stall, shop or superstore, a gardener in a garden, a hand at the Workshop or a factory */
export const ROLES = {
  clerk: { name: 'Clerk', blurb: 'Serves customers: half as many sales again, and full pace while you\'re away.' },
  gardener: { name: 'Gardener', blurb: 'The garden grows half as fast again.' },
  hand: { name: 'Hand', blurb: 'Jobs run half as fast again.' },
} as const;
export type Role = keyof typeof ROLES;
/** What hiring costs up front; then staff keep this share of the value of what they sell, grow or make */
export const STAFF_HIRE = 250;
export const STAFF_CUT = 0.1;
export const STAFF_BOOST = 1.5;
export function roleAt(s: TycoonSave, p: PlaceId): Role | null {
  if (makes(s, p)) return 'hand';
  if (sells(s, p)) return 'clerk';
  return unitAt(s, p)?.kind === 'garden' ? 'gardener' : null;
}
export function hire(s: TycoonSave, p: PlaceId): Result {
  if (!roleAt(s, p)) return { ok: false, why: 'place' };
  if (s.staff.includes(p)) return { ok: false, why: 'owned' };
  if (s.dorras < STAFF_HIRE) return { ok: false, why: 'money' };
  s.dorras -= STAFF_HIRE;
  book(s, 'staff', STAFF_HIRE);
  s.staff.push(p);
  return { ok: true, qty: 1, dorras: STAFF_HIRE };
}
export function letGo(s: TycoonSave, p: PlaceId) {
  const had = s.staff.includes(p);
  s.staff = s.staff.filter((x) => x !== p);
  return had;
}
/** Pay a gardener's or hand's share (from the till, then your balance); if it can't be paid, they leave */
function payStaff(s: TycoonSave, p: PlaceId, amount: number, out: Sales) {
  const due = Math.ceil(amount);
  const fromTill = Math.min(s.till, due);
  const fromBalance = Math.min(s.dorras, due - fromTill);
  s.till -= fromTill;
  s.dorras -= fromBalance;
  s.stats.wages += fromTill + fromBalance;
  if (fromTill + fromBalance) book(s, 'staff', fromTill + fromBalance);
  out.wages += fromTill + fromBalance;
  if (fromTill + fromBalance < due) {
    letGo(s, p);
    out.quit.push(p);
  }
}

/* Couriers (the Post office): goods between your places without driving */
export interface Shipment {
  from: PlaceId;
  to: PlaceId;
  good: GoodId;
  qty: number;
  /** When it arrives (ms since 1970) */
  arrives: number;
}
/** Couriers out at once, and the most one carries */
export const SHIP_MAX = 3;
export const SHIP_QTY = 50;
/** Where each of your places is (for the couriers' journeys) */
export const placeAt = (p: PlaceId) =>
  p === 'stall'
    ? STALL_SPOT
    : p === 'workshop'
      ? DOORS.find((d) => d.id === 'workshop')!
      : p.startsWith('l')
        ? LOT_SITE[lotIndex(p)].door
        : p.startsWith('c')
          ? CORNER_SHOPS[cornerIndex(p)].door
          : UNIT_SITE[unitIndex(p)].door;
/** A courier's journey in minutes: a minute to load, then about 40 tiles a minute */
export const shipMinutes = (from: PlaceId, to: PlaceId) => {
  const a = placeAt(from);
  const b = placeAt(to);
  return Math.round((1 + Math.hypot(a.x - b.x, a.z - b.z) / 40) * 2) / 2;
};
/** What a courier charges: a call-out and a share of the goods' price */
export const shipFee = (id: GoodId, qty: number, now: number) => Math.ceil(5 + qty * marketPrice(id, now) * 0.06);
/** From a depot, couriers cost half */
export const shipFeeFrom = (s: TycoonSave, from: PlaceId, id: GoodId, qty: number, now: number) => (kindAt(s, from) === 'depot' ? Math.ceil(shipFee(id, qty, now) / 2) : shipFee(id, qty, now));
/** Send goods by courier from a garden, warehouse or the Workshop to another of your places */
export function ship(s: TycoonSave, from: PlaceId, to: PlaceId, id: GoodId, qty: number, now: number): Result {
  if (!loadsFrom(s, from) || from === to) return { ok: false, why: 'place' };
  if (s.shipments.length >= SHIP_MAX) return { ok: false, why: 'busy' };
  const n = Math.min(Math.floor(qty), SHIP_QTY, holds(s, from, id), room(s, id, to));
  if (holds(s, from, id) <= 0) return { ok: false, why: 'stock' };
  if (n <= 0) return { ok: false, why: 'room' };
  const fee = shipFeeFrom(s, from, id, n, now);
  if (s.dorras < fee) return { ok: false, why: 'money' };
  s.dorras -= fee;
  book(s, 'couriers', fee);
  take(s, from, id, n);
  s.shipments.push({ from, to, good: id, qty: n, arrives: now + shipMinutes(from, to) * 60000 });
  return { ok: true, qty: n, dorras: fee };
}

/* Contracts (the Signal tower): deliver goods across the city in your car */
export const DESTS = {
  shop: 'Drop 001',
  vault: 'The Vault',
  plan: 'The Armoury',
  signal: 'Signal tower',
  telegram: 'Post office',
  apartments: 'The Apartments',
  garage: 'The garage',
} as const;
export type DestId = keyof typeof DESTS;
export const DEST_IDS = Object.keys(DESTS) as DestId[];
/** Where a contract's goods are dropped off: the building's door */
export const destAt = (d: DestId) => (d === 'garage' ? GARAGE_SITE.door : DOORS.find((x) => x.id === d)!);
export interface Contract {
  id: number;
  good: ProductId;
  qty: number;
  to: DestId;
  reward: number;
  /** Taken: when it runs out (ms since 1970) */
  expires: number;
}
/** A new board every 20 minutes, four contracts on it; up to three taken at once, each with 30 minutes to deliver */
export const BOARD_MINUTES = 20;
export const BOARD_SIZE = 4;
export const CONTRACTS_MAX = 3;
export const CONTRACT_TIME = 30;
export const CONTRACT_QTY = 60;
/** Rewards: between these times the goods' base price */
const REWARD_MIN = 1.45;
const REWARD_MAX = 1.8;
const good_ = good;
/** A little seeded generator (the same board for everyone) */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const boardIndex = (now: number) => Math.floor(now / (BOARD_MINUTES * 60000));
/** When the board on show now is replaced */
export const boardEnds = (now: number) => (boardIndex(now) + 1) * BOARD_MINUTES * 60000;
/** The contracts on the board at a moment: the same for everyone, new every BOARD_MINUTES */
export function board(now: number): Omit<Contract, 'expires'>[] {
  const w = boardIndex(now);
  const r = seeded(w * 7919 + 17);
  const out: Omit<Contract, 'expires'>[] = [];
  for (let k = 0; k < BOARD_SIZE; k++) {
    const g = good_(PRODUCT_IDS[Math.floor(r() * PRODUCT_IDS.length)]);
    // Worth roughly 150-650 Dorras of goods, so cheap goods come by the crate and neon signs a few at a time
    const qty = Math.max(2, Math.min(CONTRACT_QTY, Math.round((150 + r() * 500) / g.base)));
    const to = DEST_IDS[Math.floor(r() * DEST_IDS.length)];
    out.push({ id: w * 10 + k, good: g.id as ProductId, qty, to, reward: Math.round(g.base * qty * (REWARD_MIN + r() * (REWARD_MAX - REWARD_MIN))) });
  }
  return out;
}
/** Take on a contract from the board */
export function accept(s: TycoonSave, id: number, now: number): Result {
  const c = board(now).find((x) => x.id === id);
  if (!c) return { ok: false, why: 'time' };
  if (s.taken.includes(id)) return { ok: false, why: 'owned' };
  if (s.contracts.length >= CONTRACTS_MAX) return { ok: false, why: 'max' };
  s.contracts.push({ ...c, expires: now + CONTRACT_TIME * 60000 });
  s.taken = [...s.taken, id].slice(-40);
  return { ok: true, qty: c.qty, dorras: 0 };
}
/** Give up a contract (no penalty; it can't be taken again) */
export function dropContract(s: TycoonSave, id: number) {
  const had = s.contracts.some((c) => c.id === id);
  s.contracts = s.contracts.filter((c) => c.id !== id);
  return had;
}
/** Hand over a contract's goods from your car at its drop-off: the reward goes straight to your balance */
export function deliver(s: TycoonSave, id: number, at: DestId, now: number): Result {
  const c = s.contracts.find((x) => x.id === id);
  if (!c) return { ok: false, why: 'place' };
  if (c.expires < now) return { ok: false, why: 'time' };
  if (c.to !== at) return { ok: false, why: 'place' };
  if ((s.cargo[c.good] ?? 0) < c.qty) return { ok: false, why: 'stock' };
  s.cargo[c.good]! -= c.qty;
  if (!s.cargo[c.good]) delete s.cargo[c.good];
  s.dorras += c.reward;
  book(s, 'contracts', c.reward);
  s.stats.contracts += 1;
  count(s, 'contracts', 1);
  count(s, 'earned', c.reward);
  addXp(s, XP.contract);
  s.contracts = s.contracts.filter((x) => x !== c);
  return { ok: true, qty: c.qty, dorras: c.reward };
}

/* Buying straight into your car (parked at the Emporium) and selling from it */
export function buyToCar(s: TycoonSave, id: GoodId, qty: number, now: number, cap: number): Result {
  const each = askPrice(id, now);
  const space = cap - total(s.cargo);
  if (space <= 0) return { ok: false, why: 'room' };
  const n = Math.min(Math.floor(qty), space, Math.floor(s.dorras / each));
  if (n <= 0) return { ok: false, why: 'money' };
  s.cargo[id] = (s.cargo[id] ?? 0) + n;
  s.dorras -= n * each;
  book(s, 'bought', n * each);
  return { ok: true, qty: n, dorras: n * each };
}
export function sellFromCar(s: TycoonSave, id: GoodId, qty: number, now: number): Result {
  const n = Math.min(Math.floor(qty), s.cargo[id] ?? 0);
  if (n <= 0) return { ok: false, why: 'stock' };
  s.cargo[id]! -= n;
  if (!s.cargo[id]) delete s.cargo[id];
  const each = bidPrice(id, now);
  s.dorras += n * each;
  book(s, 'soldBack', n * each);
  return { ok: true, qty: n, dorras: n * each };
}

/* ---------- Phase 4: the big lots and the Vault ---------- */

/** What the next big lot costs (null once you own all three) */
export function lotPrice(s: TycoonSave) {
  const owned = s.lots.filter(Boolean).length;
  return owned < LOT_PRICES.length ? LOT_PRICES[owned] : null;
}
export function buyLot(s: TycoonSave, i: number): Result {
  if (i < 0 || i >= LOT_COUNT) return { ok: false, why: 'place' };
  if (s.lots[i]) return { ok: false, why: 'owned' };
  const price = lotPrice(s)!;
  if (s.dorras < price) return { ok: false, why: 'money' };
  s.dorras -= price;
  book(s, 'property', price);
  s.lots[i] = emptyLot();
  count(s, 'land', 1);
  addXp(s, XP.property);
  return { ok: true, qty: 1, dorras: price };
}
/** Build (or rebuild) a big lot; it has to be empty of goods (and its factory idle) first. One set of offices is all you need. */
export function buildLot(s: TycoonSave, i: number, kind: LotKind): Result {
  const l = s.lots[i];
  const p = `l${i}` as PlaceId;
  if (!l) return { ok: false, why: 'place' };
  if (total(stockAt(s, p)) > 0 || l.job) return { ok: false, why: 'stock' };
  if (l.kind === kind || (kind === 'offices' && hasHQ(s))) return { ok: false, why: 'owned' };
  const cost = LOT_KINDS[kind].cost;
  if (s.dorras < cost) return { ok: false, why: 'money' };
  s.dorras -= cost;
  book(s, 'property', cost);
  Object.assign(l, emptyLot(), { kind });
  s.staff = s.staff.filter((x) => x !== p);
  count(s, 'built', 1);
  addXp(s, XP.property);
  return { ok: true, qty: 1, dorras: cost };
}

/* The Trenches' corner shops (Phase 9, step 3) */

/** What the next corner shop costs (null once you own all four) */
export function cornerPrice(s: TycoonSave) {
  const owned = s.corners.filter(Boolean).length;
  return owned < CORNER_PRICES.length ? CORNER_PRICES[owned] : null;
}
/** Buy a corner shop: it opens as a shop straight away, its shelves empty */
export function buyCorner(s: TycoonSave, i: number): BuyResult {
  if (i < 0 || i >= CORNER_COUNT) return { ok: false, why: 'place' };
  if (s.corners[i]) return { ok: false, why: 'owned' };
  const r = pay(s, cornerPrice(s)!, CORNER_LEVEL, 'property');
  if (!r.ok) return r;
  s.corners[i] = { slots: [] };
  count(s, 'land', 1);
  addXp(s, XP.property);
  return r;
}

/* The ledger */
export const LEDGER_LINES = 30;
/** Write a movement of Dorras in the Vault's ledger (a run of the same kind within a minute is one line) */
export function book(s: TycoonSave, e: Entry, n: number) {
  if (!(n > 0)) return;
  s.ledger.totals[e] = (s.ledger.totals[e] ?? 0) + n;
  const last = s.ledger.recent[s.ledger.recent.length - 1];
  if (last && last.e === e && s.at - last.t < 60000) last.n += n;
  else {
    s.ledger.recent.push({ t: s.at, e, n });
    if (s.ledger.recent.length > LEDGER_LINES) s.ledger.recent.shift();
  }
}
/** What you've paid for property: the stall's upgrades, units and big lots, and what's built on them */
export function propertyValue(s: TycoonSave) {
  let v = STALL_LEVELS.slice(1, s.stall.level).reduce((a, l) => a + l.cost, 0);
  const units = s.units.filter(Boolean) as Unit[];
  v += UNIT_PRICES.slice(0, units.length).reduce((a, b) => a + b, 0) + units.reduce((a, u) => a + (u.kind ? UNIT_KINDS[u.kind].cost : 0), 0);
  const lots = s.lots.filter(Boolean) as Lot[];
  v += LOT_PRICES.slice(0, lots.length).reduce((a, b) => a + b, 0) + lots.reduce((a, l) => a + (l.kind ? LOT_KINDS[l.kind].cost : 0), 0);
  v += CORNER_PRICES.slice(0, s.corners.filter(Boolean).length).reduce((a, b) => a + b, 0);
  // Phase 5: the places' levels and your district plots
  for (const p of PLACE_IDS) v += levelCosts(p).slice(1, placeLevel(s, p)).reduce((a, b) => a + b, 0);
  for (const o of Object.values(s.plots)) v += o.paid;
  return v;
}
/** What you've paid for cars, guns, clothes and their mods */
export function gearValue(s: TycoonSave) {
  let v = 0;
  for (const id of s.garage.owned) v += CAR_CATALOG[id]?.price ?? 0;
  for (const id of s.karts.owned) v += KART_CATALOG[id]?.price ?? 0;
  for (const id of PLAYER_KARTS) {
    const m = s.karts.mods[id];
    if (m) for (const k of KART_MOD_IDS) for (let l = 1; l <= m[k]; l++) v += kartModCost(id, k, { ...m, [k]: l - 1 }) ?? 0;
  }
  for (const id of PLAYER_CARS) {
    const m = carMods(s, id);
    for (const k of CAR_MOD_IDS) for (let l = 1; l <= m[k]; l++) v += modCost(CAR_CATALOG[id].price, l) ?? 0;
  }
  for (const id of s.armoury.owned) v += GUN_CATALOG[id]?.price ?? 0;
  for (const id of Object.keys(GUN_CATALOG) as WeaponId[]) {
    const m = gunMods(s, id);
    for (const k of GUN_MOD_IDS) for (let l = 1; l <= m[k]; l++) v += modCost(GUN_CATALOG[id].price, l) ?? 0;
  }
  for (const id of s.wardrobe) v += wardrobeEntry(id)?.price ?? 0;
  return v;
}
/** All your goods (every place, your car and the couriers' loads) at today's market price */
export function goodsValue(s: TycoonSave, now: number) {
  let v = 0;
  const count = (st: Stock) => {
    for (const [id, n] of Object.entries(st)) v += (n ?? 0) * marketPrice(id as GoodId, now);
  };
  for (const p of PLACE_IDS) count(stockAt(s, p));
  count(s.cargo);
  for (const sh of s.shipments) v += sh.qty * marketPrice(sh.good, now);
  return v;
}
/** What your business is worth: your Dorras, the till, your goods and your property, less what you owe */
export function worth(s: TycoonSave, now: number) {
  return s.dorras + s.till + goodsValue(s, now) + propertyValue(s) + gearValue(s) - (s.loan?.owed ?? 0);
}

/* Loans: a flat fee, paid back from a share of the takings (and whenever you like) */
export const LOAN_FEE = 0.1;
export const LOAN_SHARE = 0.25;
export const LOAN_MAX = 50000;
/** What the Vault will lend you: more the more property you hold */
export const loanLimit = (s: TycoonSave) => Math.min(LOAN_MAX, Math.floor((1000 + propertyValue(s) * 0.5) / 500) * 500);
export function borrow(s: TycoonSave, amount: number): Result {
  if (s.loan) return { ok: false, why: 'busy' };
  const n = Math.floor(amount);
  if (n <= 0 || n > loanLimit(s)) return { ok: false, why: 'max' };
  s.loan = { borrowed: n, owed: Math.ceil(n * (1 + LOAN_FEE)) };
  s.dorras += n;
  book(s, 'borrowed', n);
  return { ok: true, qty: 1, dorras: n };
}
function payLoan(s: TycoonSave, n: number) {
  if (!s.loan || n <= 0) return;
  s.loan.owed -= n;
  book(s, 'repaid', n);
  if (s.loan.owed <= 0) s.loan = null;
}
/** Pay some of a loan off from your balance */
export function repay(s: TycoonSave, amount: number): Result {
  if (!s.loan) return { ok: false, why: 'place' };
  const n = Math.min(Math.floor(amount), s.loan.owed, s.dorras);
  if (n <= 0) return { ok: false, why: 'money' };
  s.dorras -= n;
  payLoan(s, n);
  return { ok: true, qty: 1, dorras: n };
}

/* ====================================================================
   Phase 5: the city's game. XP and levels, the garage, the Armoury,
   Drop 001, the estate agent, the places' levels, counters.
   ==================================================================== */

/** Your level, from your XP (catalog.ts has the curve) */
export const level = (s: TycoonSave) => levelFor(s.xp);
/** Add XP; returns the levels gained (0 most of the time) */
export function addXp(s: TycoonSave, n: number) {
  if (!(n > 0)) return 0;
  const before = level(s);
  s.xp += Math.round(n);
  return level(s) - before;
}
/** Count something you did (missions and badges watch these) */
export function count(s: TycoonSave, k: CounterId, n = 1) {
  if (!(n > 0)) return;
  s.counters[k] = (s.counters[k] ?? 0) + n;
}
/** Takedowns in target practice: counted, with their XP; `hand`, with his fists (docs/inventory-plan.md Phase 2) */
export function takedown(s: TycoonSave, kind: 'dummy' | 'drone', hand = false) {
  const k = kind === 'dummy' ? 'dummies' : 'drones';
  count(s, k, 1);
  if (hand && kind === 'dummy') count(s, 'fistDowns', 1);
  return addXp(s, XP[kind]);
}

export type BuyResult = { ok: true; dorras: number } | { ok: false; why: 'money' | 'level' | 'owned' | 'max' | 'place' | 'stock' };
/** Pay for something (a level is checked first, then the money) */
export function pay(s: TycoonSave, price: number, need: number, entry: Entry): BuyResult {
  // Free play (freeplay.ts): nothing costs anything and no level is needed
  if (FREE_PLAY) return { ok: true, dorras: 0 };
  if (level(s) < need) return { ok: false, why: 'level' };
  if (s.dorras < price) return { ok: false, why: 'money' };
  s.dorras -= price;
  book(s, entry, price);
  return { ok: true, dorras: price };
}

/* ---------- The garage: cars and their mods ---------- */

export const ownsCar = (s: TycoonSave, id: PlayerCar) => STARTER_CARS.includes(id) || s.garage.owned.includes(id);
export function buyCar(s: TycoonSave, id: PlayerCar): BuyResult {
  const c = CAR_CATALOG[id];
  if (!c) return { ok: false, why: 'place' };
  if (ownsCar(s, id)) return { ok: false, why: 'owned' };
  const r = pay(s, c.price, c.level, 'vehicles');
  if (!r.ok) return r;
  s.garage.owned.push(id);
  count(s, 'bought', 1);
  return r;
}
export const carMods = (s: TycoonSave, id: PlayerCar): CarMods => ({ ...NO_CAR_MODS, ...(s.garage.mods[id] ?? {}) });
/** What the next level of a mod costs (null at the top) */
export const carModCost = (id: PlayerCar, mod: CarModId, mods: CarMods) => modCost(CAR_CATALOG[id].price, mods[mod] + 1);
export function modCar(s: TycoonSave, id: PlayerCar, mod: CarModId): BuyResult {
  if (!ownsCar(s, id) || !CAR_MOD_IDS.includes(mod)) return { ok: false, why: 'place' };
  const mods = carMods(s, id);
  const cost = carModCost(id, mod, mods);
  if (cost === null) return { ok: false, why: 'max' };
  const r = pay(s, cost, 1, 'upgrades');
  if (!r.ok) return r;
  mods[mod] += 1;
  s.garage.mods[id] = mods;
  count(s, 'upgrades', 1);
  addXp(s, XP.upgrade);
  return r;
}
/** A car's handling and cargo with its mods on */
export const carStatsOf = (s: TycoonSave, id: PlayerCar) => carStats(DRIVE[id], CARGO[id] ?? CARGO.hatch, carMods(s, id));

/* ---------- The kart park: karts, their mods, and the races' prizes ---------- */

export const ownsKart = (s: TycoonSave, id: KartId) => STARTER_KARTS.includes(id) || s.karts.owned.includes(id);
export function buyKart(s: TycoonSave, id: KartId): BuyResult {
  const k = KART_CATALOG[id];
  if (!k) return { ok: false, why: 'place' };
  if (ownsKart(s, id)) return { ok: false, why: 'owned' };
  const r = pay(s, k.price, k.level, 'karts');
  if (!r.ok) return r;
  s.karts.owned.push(id);
  count(s, 'bought', 1);
  return r;
}
export const kartMods = (s: TycoonSave, id: KartId): KartMods => ({ ...NO_KART_MODS, ...(s.karts.mods[id] ?? {}) });
/** What the next level of a kart mod costs (null at the top) */
export const kartModCost = (id: KartId, mod: KartModId, mods: KartMods) => modCost(Math.max(KART_CATALOG[id].price, 6000), mods[mod] + 1);
export function modKart(s: TycoonSave, id: KartId, mod: KartModId): BuyResult {
  if (!ownsKart(s, id) || !KART_MOD_IDS.includes(mod)) return { ok: false, why: 'place' };
  const mods = kartMods(s, id);
  const cost = kartModCost(id, mod, mods);
  if (cost === null) return { ok: false, why: 'max' };
  const r = pay(s, cost, 1, 'upgrades');
  if (!r.ok) return r;
  mods[mod] += 1;
  s.karts.mods[id] = mods;
  count(s, 'upgrades', 1);
  addXp(s, XP.upgrade);
  return r;
}
/** A kart's handling with its mods on (0..1 numbers; kart-sim.ts tune() turns them into speeds) */
export const kartStatsOf = (s: TycoonSave, id: KartId) => kartStats(KART_SPECS[id], kartMods(s, id));
/** Pick the kart (and paint) you race in; only one you own */
export function pickKart(s: TycoonSave, model: KartId, paint: PaintId) {
  const k = cleanKart({ model, paint });
  if (!ownsKart(s, k.model)) return false;
  s.karts.model = k.model;
  s.karts.paint = k.paint;
  return true;
}
export interface KartResult {
  place: number;
  prize: number;
  xp: number;
  seconds: number;
  /** Your fastest lap this race, and whether it's a new lap record for the course and class */
  bestLap: number;
  lapRecord: boolean;
  /** A time trial: a new best run (on the board's top) */
  record: boolean;
  /** The par ghost beaten for the first time */
  parBeaten: boolean;
  /** The daily challenge met (today, for the first time) */
  challenge: boolean;
  /** Levels gained */
  levels: number;
}
/** The par lap for a course at a class (the par ghost's pace, catalog.ts PAR_LAPS) */
export const parLap = (course: string, cls: ClassId) => PAR_LAPS[course]?.[cls] ?? Math.round((60 / KART_CLASSES[cls].pace) * 100) / 100;
/** Today's challenge: a course and a class from the date, and a lap to beat (a touch slower than par) */
export function dailyChallenge(day: string) {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619) >>> 0;
  const course = COURSE_IDS[h % COURSE_IDS.length];
  const cls = CLASS_IDS[(h >>> 8) % CLASS_IDS.length];
  return { day, course, cls, target: Math.round(parLap(course, cls) * 1.06 * 100) / 100 };
}
/** The day as the challenge keys it (the visitor's clock) */
export const dayKey = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/**
 * A finished kart race or time trial: pay the place (a cup's prizes), count it, keep the fastest lap
 * per course and class (any race) and a time trial's run on the board; `clean` (laps without a
 * wheel in the run-off) and `overtakes` are counted for missions and badges. `laps` are the lap times.
 */
export function finishKartRace(s: TycoonSave, r: { course: string; cup: string; cls: ClassId; place: number; seconds: number; laps?: number[]; clean?: number; overtakes?: number; now?: number }): KartResult {
  const seconds = Math.round(r.seconds * 100) / 100;
  const time = r.cup === 'time';
  const c = time ? null : CUPS[r.cup as CupId];
  const cls: ClassId = KART_CLASSES[r.cls] ? r.cls : 'sport';
  const place = Math.max(1, Math.min(8, Math.round(r.place)));
  const prize = c ? (c.prizes[place - 1] ?? 0) : 0;
  const now = r.now ?? s.at;
  const lapsIn = (r.laps ?? []).filter((t) => Number.isFinite(t) && t > 0);
  const bestLap = lapsIn.length ? Math.round(Math.min(...lapsIn) * 100) / 100 : 0;
  const key = recordKey(r.course, cls);
  const K = s.karts;
  let lapRecord = false;
  let record = false;
  if (bestLap > 0) {
    const best = K.records[key];
    lapRecord = !best || best.lap <= 0 || bestLap < best.lap;
    if (lapRecord) K.records[key] = { lap: bestLap, run: best?.run ?? 0, kart: K.model, at: now };
  }
  if (time) {
    const entry: KartTime = { lap: bestLap, run: seconds, kart: K.model, at: now };
    const best = K.records[key];
    record = !best || best.run <= 0 || seconds < best.run;
    if (record) K.records[key] = { ...(K.records[key] ?? entry), run: seconds, kart: K.model, at: now };
    const board = [...(K.boards[key] ?? []), entry].sort((a, b) => a.run - b.run).slice(0, LEADERBOARD_SIZE);
    K.boards[key] = board;
  }
  // The par ghost beaten (XP once per course and class), and the daily challenge
  let parBeaten = false;
  if (bestLap > 0 && bestLap < parLap(r.course, cls) && !K.parBeaten.includes(key)) {
    K.parBeaten.push(key);
    parBeaten = true;
  }
  let challenge = false;
  const today = dayKey(now);
  const ch = dailyChallenge(today);
  if (bestLap > 0 && ch.course === r.course && ch.cls === cls && bestLap <= ch.target && K.challenge?.day !== today) {
    K.challenge = { day: today, lap: bestLap };
    challenge = true;
    s.dorras += CHALLENGE_PRIZE;
    book(s, 'karting', CHALLENGE_PRIZE);
    count(s, 'earned', CHALLENGE_PRIZE);
  }
  if (prize > 0) {
    s.dorras += prize;
    book(s, 'karting', prize);
    count(s, 'earned', prize);
  }
  count(s, 'kartRaces', 1);
  if (c && place <= 3) count(s, 'podiums', 1);
  if (c && place === 1) count(s, 'kartWins', 1);
  if (r.clean) count(s, 'cleanLaps', Math.max(0, Math.min(10, Math.floor(r.clean))));
  if (r.overtakes) count(s, 'overtakes', Math.max(0, Math.min(50, Math.floor(r.overtakes))));
  const xp =
    XP.kartFinish +
    (c && place <= 3 ? XP.kartPodium : 0) +
    (c && place === 1 ? XP.kartWin : 0) +
    (record || lapRecord ? XP.kartRecord : 0) +
    (parBeaten ? XP.parBeaten : 0) +
    (challenge ? XP.challenge : 0);
  const levels = addXp(s, xp);
  return { place, prize, xp, seconds, bestLap, lapRecord, record, parBeaten, challenge, levels };
}

/* ---------- Cups as series: four races, points by place ---------- */

export interface SeriesResult {
  /** Points after this race (by grid index; you are the last) */
  points: number[];
  /** Everyone's overall place after this race (by grid index) */
  places: number[];
  /** Which race just finished (1-based) and how many there are */
  race: number;
  of: number;
  /** The series is over: your overall place, the series prize and XP (0 if not over) */
  done: boolean;
  overall: number;
  prize: number;
  xp: number;
  levels: number;
}
/** Start a cup's series (any series on the go is dropped) */
export function startSeries(s: TycoonSave, cup: CupId) {
  if (!CUPS[cup]) return false;
  s.karts.series = { cup, race: 0, points: Array.from({ length: 8 }, () => 0) };
  return true;
}
export const abandonSeries = (s: TycoonSave) => {
  s.karts.series = null;
};
/** The next race of the series on the go: its course, laps and conditions (null when there's none) */
export const seriesNext = (s: TycoonSave) => (s.karts.series ? (CUPS[s.karts.series.cup].races[s.karts.series.race] ?? null) : null);
/** Overall places from points (ties broken by grid index, you last among equals) */
export const seriesPlaces = (points: number[]) => {
  const order = points.map((p, i) => i).sort((a, b) => points[b] - points[a] || a - b);
  const places = points.map(() => 0);
  order.forEach((i, p) => (places[i] = p + 1));
  return places;
};
/**
 * A race of the series finished: `placesByKart` is each grid index's place in it (you last).
 * Points go on; after the last race the overall standings pay a prize and a trophy.
 */
export function seriesRace(s: TycoonSave, placesByKart: number[]): SeriesResult | null {
  const sr = s.karts.series;
  if (!sr) return null;
  const cup = CUPS[sr.cup];
  for (let i = 0; i < sr.points.length; i++) sr.points[i] += SERIES_POINTS[Math.max(1, Math.min(8, placesByKart[i] ?? 8)) - 1] ?? 0;
  sr.race += 1;
  const places = seriesPlaces(sr.points);
  const you = sr.points.length - 1;
  const overall = places[you];
  const done = sr.race >= cup.races.length;
  let prize = 0;
  let xp = 0;
  let levels = 0;
  if (done) {
    prize = SERIES_PRIZES[sr.cup][overall - 1] ?? 0;
    if (prize > 0) {
      s.dorras += prize;
      book(s, 'karting', prize);
      count(s, 'earned', prize);
    }
    const best = s.karts.trophies[sr.cup];
    if (!best || overall < best) s.karts.trophies[sr.cup] = overall;
    xp = overall === 1 ? XP.seriesWin : overall <= 3 ? XP.seriesPodium : 0;
    levels = addXp(s, xp);
    s.karts.series = null;
  }
  return { points: [...sr.points], places, race: sr.race, of: cup.races.length, done, overall, prize, xp, levels };
}

/* ---------- The Armoury: guns and their mods ---------- */

/** Owned here means bought: the starters are free, and the store unlocks them by score */
export const ownsGun = (s: TycoonSave, id: WeaponId) => STARTER_GUNS.includes(id) || s.armoury.owned.includes(id);
export function buyGun(s: TycoonSave, id: WeaponId): BuyResult {
  const g = GUN_CATALOG[id];
  if (!g) return { ok: false, why: 'place' };
  if (ownsGun(s, id)) return { ok: false, why: 'owned' };
  const r = pay(s, g.price, g.level, 'gear');
  if (!r.ok) return r;
  s.armoury.owned.push(id);
  count(s, 'bought', 1);
  return r;
}
export const gunMods = (s: TycoonSave, id: WeaponId): GunMods => ({ ...NO_GUN_MODS, ...(s.armoury.mods[id] ?? {}) });
export const gunModCost = (id: WeaponId, mod: GunModId, mods: GunMods) => modCost(GUN_CATALOG[id].price, mods[mod] + 1);
export function modGun(s: TycoonSave, id: WeaponId, mod: GunModId): BuyResult {
  if (!ownsGun(s, id) || !GUN_MOD_IDS.includes(mod)) return { ok: false, why: 'place' };
  const mods = gunMods(s, id);
  const cost = gunModCost(id, mod, mods);
  if (cost === null) return { ok: false, why: 'max' };
  const r = pay(s, cost, 1, 'upgrades');
  if (!r.ok) return r;
  mods[mod] += 1;
  s.armoury.mods[id] = mods;
  count(s, 'upgrades', 1);
  addXp(s, XP.upgrade);
  return r;
}

/* ---------- Drop 001: the premium wardrobe ---------- */

export const ownsWardrobe = (s: TycoonSave, id: string) => s.wardrobe.includes(id);
export function buyWardrobe(s: TycoonSave, id: string): BuyResult {
  const w = wardrobeEntry(id);
  if (!w) return { ok: false, why: 'place' };
  if (ownsWardrobe(s, id)) return { ok: false, why: 'owned' };
  const r = pay(s, w.price, w.level, 'clothes');
  if (!r.ok) return r;
  s.wardrobe.push(id);
  count(s, 'bought', 1);
  return r;
}

/* ---------- The estate agent (the Vault): district plots ---------- */

export const ownsPlot = (s: TycoonSave, id: string) => id in s.plots;
export const plotCount = (s: TycoonSave) => Object.keys(s.plots).length;
/** What a plot costs you now: dearer with each one you already own */
export const plotPrice = (s: TycoonSave) => Math.round(PLOT_DORRAS * (1 + plotCount(s) * 0.25));
export function buyPlot(s: TycoonSave, id: string, now: number, valid: (id: string) => boolean = () => true): BuyResult {
  if (!valid(id)) return { ok: false, why: 'place' };
  if (ownsPlot(s, id)) return { ok: false, why: 'owned' };
  const price = plotPrice(s);
  const r = pay(s, price, PLOT_LEVEL, 'land');
  if (!r.ok) return r;
  s.plots[id] = { design: null, paid: price, at: now };
  count(s, 'land', 1);
  addXp(s, XP.property);
  return r;
}
/** Build on a plot (or clear it with null): a dearer design costs the difference */
export function buildPlot(s: TycoonSave, id: string, design: Design | null): BuyResult {
  const o = s.plots[id];
  if (!o) return { ok: false, why: 'place' };
  const next = design ? cleanDesign(design) : null;
  if (design && !next) return { ok: false, why: 'place' };
  const was = o.design ? BUILD_COSTS[o.design.type] : 0;
  const cost = Math.max(0, (next ? BUILD_COSTS[next.type] : 0) - was);
  const r = pay(s, cost, 1, 'property');
  if (!r.ok) return r;
  if (next && (!o.design || o.design.type !== next.type)) {
    count(s, 'built', 1);
    addXp(s, XP.property);
  }
  o.design = next;
  o.paid += cost;
  return r;
}
/** Sell a plot back to the city for a share of what you paid */
export function sellPlot(s: TycoonSave, id: string): BuyResult {
  const o = s.plots[id];
  if (!o) return { ok: false, why: 'place' };
  const back = Math.round(o.paid * PLOT_REFUND);
  delete s.plots[id];
  s.dorras += back;
  book(s, 'soldLand', back);
  return { ok: true, dorras: back };
}

/* ---------- Levels for the places you run ---------- */

export const levelCosts = (p: PlaceId) => (p === 'workshop' ? WORKSHOP_LEVEL_COSTS : p.startsWith('l') ? LOT_LEVEL_COSTS : p.startsWith('c') ? CORNER_LEVEL_COSTS : p === 'stall' ? [] : UNIT_LEVEL_COSTS);
/** What the next level costs (null at the top, or where there's nothing to level yet) */
export function placeLevelCost(s: TycoonSave, p: PlaceId) {
  if (p === 'stall') return null;
  if (p !== 'workshop' && !kindAt(s, p)) return null;
  const l = placeLevel(s, p);
  return l < PLACE_LEVELS ? levelCosts(p)[l] : null;
}
export function upgradePlace(s: TycoonSave, p: PlaceId): BuyResult {
  const cost = placeLevelCost(s, p);
  if (cost === null) return { ok: false, why: placeLevel(s, p) >= PLACE_LEVELS ? 'max' : 'place' };
  const r = pay(s, cost, 1, 'upgrades');
  if (!r.ok) return r;
  s.levels[p] = placeLevel(s, p) + 1;
  count(s, 'upgrades', 1);
  addXp(s, XP.upgrade);
  return r;
}

/* ---------- Loading the game part of the save ---------- */

function cleanGame(s: TycoonSave, o: Record<string, unknown>, now: number) {
  const g = obj(o.garage);
  s.garage.owned = (Array.isArray(g.owned) ? g.owned : []).filter((id): id is PlayerCar => PLAYER_CARS.includes(id as PlayerCar) && !STARTER_CARS.includes(id as PlayerCar));
  s.garage.owned = [...new Set(s.garage.owned)];
  for (const id of PLAYER_CARS) {
    const m = obj(obj(g.mods)[id]);
    const mods = { ...NO_CAR_MODS };
    for (const k of CAR_MOD_IDS) mods[k] = Math.round(num(m[k], 0, MOD_LEVELS, 0));
    if (CAR_MOD_IDS.some((k) => mods[k] > 0) && (STARTER_CARS.includes(id) || s.garage.owned.includes(id))) s.garage.mods[id] = mods;
  }
  const a = obj(o.armoury);
  const gunIds = Object.keys(GUN_CATALOG) as WeaponId[];
  s.armoury.owned = [...new Set((Array.isArray(a.owned) ? a.owned : []).filter((id): id is WeaponId => gunIds.includes(id as WeaponId) && !STARTER_GUNS.includes(id as WeaponId)))];
  for (const id of gunIds) {
    const m = obj(obj(a.mods)[id]);
    const mods = { ...NO_GUN_MODS };
    for (const k of GUN_MOD_IDS) mods[k] = Math.round(num(m[k], 0, MOD_LEVELS, 0));
    if (GUN_MOD_IDS.some((k) => mods[k] > 0) && (STARTER_GUNS.includes(id) || s.armoury.owned.includes(id))) s.armoury.mods[id] = mods;
  }
  s.wardrobe = [...new Set((Array.isArray(o.wardrobe) ? o.wardrobe : []).filter((id): id is string => typeof id === 'string' && WARDROBE_CATALOG.some((w) => w.id === id)))];
  for (const [id, raw] of Object.entries(obj(o.plots))) {
    if (!/^[NEWS]\d$/.test(id)) continue;
    const r = obj(raw);
    const design = r.design ? cleanDesign(r.design) : null;
    s.plots[id] = { design, paid: Math.round(num(r.paid, 0, 1e9, PLOT_DORRAS)), at: num(r.at, 0, now, now) };
  }
  // The kart park (v6)
  const kt = obj(o.karts);
  s.karts.owned = [...new Set((Array.isArray(kt.owned) ? kt.owned : []).filter((id): id is KartId => PLAYER_KARTS.includes(id as KartId) && !STARTER_KARTS.includes(id as KartId)))];
  for (const id of PLAYER_KARTS) {
    const m = obj(obj(kt.mods)[id]);
    const mods = { ...NO_KART_MODS };
    for (const k of KART_MOD_IDS) mods[k] = Math.round(num(m[k], 0, MOD_LEVELS, 0));
    if (KART_MOD_IDS.some((k) => mods[k] > 0) && (STARTER_KARTS.includes(id) || s.karts.owned.includes(id))) s.karts.mods[id] = mods;
  }
  const pick = cleanKart({ model: kt.model, paint: kt.paint });
  s.karts.model = STARTER_KARTS.includes(pick.model) || s.karts.owned.includes(pick.model) ? pick.model : DEFAULT_KART.model;
  s.karts.paint = pick.paint;
  // Records and boards per course and class (v7; a v6 save's plain times are dropped). Save v8 rebuilt the track:
  // an older save's records are kept aside (`old`), its boards, par ghosts beaten and a series on the go are dropped
  // Save v9 scaled the circuit down to 60%: a v8 save's circuit records go aside as the full-size circuit's, its boards and
  // par ghosts beaten are dropped (a series on the go stays: the cups race the same courses)
  const rebuilt = typeof o.v === 'number' && o.v >= 8;
  const scaled = typeof o.v === 'number' && o.v >= 9;
  const keyIn = (ids: readonly string[]) => (k: string) => /^[a-z0-9-]{1,32}:[a-z]{1,16}$/.test(k) && ids.includes(k.split(':')[0]) && CLASS_IDS.includes(k.split(':')[1] as ClassId);
  const keyOk = scaled ? keyIn(COURSE_IDS) : () => false;
  const oldOk = keyIn(OLD_COURSES);
  const cleanTime = (raw: unknown): KartTime | null => {
    const r = obj(raw);
    const lap = num(r.lap, 0, 36000, 0);
    const run = num(r.run, 0, 36000, 0);
    const kart = PLAYER_KARTS.find((k) => k === r.kart) ?? DEFAULT_KART.model;
    if (lap <= 0 && run <= 0) return null;
    return { lap: Math.round(lap * 100) / 100, run: Math.round(run * 100) / 100, kart, at: num(r.at, 0, now, now) };
  };
  for (const [k, raw] of Object.entries(obj(kt.records))) {
    const t = keyOk(k) ? cleanTime(raw) : null;
    if (t) s.karts.records[k] = t;
  }
  for (const [k, raw] of Object.entries(rebuilt ? obj(kt.old) : obj(kt.records))) {
    const t = oldOk(k) ? cleanTime(raw) : null;
    if (t) s.karts.old[k] = t;
  }
  if (rebuilt && !scaled)
    for (const [k, raw] of Object.entries(obj(kt.records))) {
      const t = keyIn(COURSE_IDS)(k) ? cleanTime(raw) : null;
      if (t) s.karts.old[`full-${k}`] = t;
    }
  for (const [k, raw] of Object.entries(obj(kt.boards))) {
    if (!keyOk(k) || !Array.isArray(raw)) continue;
    const list = raw.map(cleanTime).filter((t): t is KartTime => !!t && t.run > 0).sort((a, b) => a.run - b.run).slice(0, LEADERBOARD_SIZE);
    if (list.length) s.karts.boards[k] = list;
  }
  const sr = obj(kt.series);
  const cupId = (Object.keys(CUPS) as CupId[]).find((c) => c === sr.cup);
  if (cupId && rebuilt) {
    const race = Math.round(num(sr.race, 0, CUPS[cupId].races.length, 0));
    const points = Array.from({ length: 8 }, (_, i) => Math.round(num((Array.isArray(sr.points) ? sr.points : [])[i], 0, 1e4, 0)));
    if (race < CUPS[cupId].races.length) s.karts.series = { cup: cupId, race, points };
  }
  for (const c of Object.keys(CUPS) as CupId[]) {
    const t = Math.round(num(obj(kt.trophies)[c], 0, 8, 0));
    if (t >= 1) s.karts.trophies[c] = t;
  }
  const ch = obj(kt.challenge);
  if (typeof ch.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ch.day)) s.karts.challenge = { day: ch.day, lap: Math.round(num(ch.lap, 0, 36000, 0) * 100) / 100 };
  s.karts.parBeaten = [...new Set((Array.isArray(kt.parBeaten) ? kt.parBeaten : []).filter((k): k is string => typeof k === 'string' && keyOk(k)))];
  // The Fight Club (v8)
  const ft = obj(o.fight);
  const styleIds = Object.keys(STYLES) as StyleId[];
  s.fight.styles = [...new Set(['brawler' as StyleId, ...(Array.isArray(ft.styles) ? ft.styles : []).filter((id): id is StyleId => styleIds.includes(id as StyleId))])];
  s.fight.style = typeof ft.style === 'string' && s.fight.styles.includes(ft.style as StyleId) ? (ft.style as StyleId) : 'brawler';
  for (const k of ['wins', 'losses', 'kos', 'bestChain', 'bouts', 'spars'] as const) s.fight[k] = Math.round(num(ft[k], 0, 1e9, 0));
  for (const b of BOT_LEVELS) {
    const r = obj(obj(ft.bots)[b]);
    const beaten = Math.round(num(r.beaten, 0, 1e9, 0));
    const best = num(r.bestSeconds, 0, 36000, 0);
    if (beaten > 0 || best > 0) s.fight.bots[b] = { beaten, bestSeconds: best > 0 ? Math.round(best * 100) / 100 : null };
  }
  for (const id of PARTNER_IDS) {
    const r = obj(obj(ft.partners)[id]);
    const spars = Math.round(num(r.spars, 0, 1e9, 0));
    const beaten = Math.min(spars, Math.round(num(r.beaten, 0, 1e9, 0)));
    if (spars > 0) s.fight.partners[id] = { spars, beaten };
  }
  const m = obj(o.missions);
  const slug = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9-]{1,40}$/.test(v);
  s.missions.done = [...new Set((Array.isArray(m.done) ? m.done : []).filter(slug))];
  for (const raw of (Array.isArray(m.active) ? m.active : []).slice(0, 5)) {
    const r = obj(raw);
    if (!slug(r.id) || s.missions.done.includes(r.id) || s.missions.active.some((x) => x.id === r.id)) continue;
    const from = newCounters();
    for (const k of COUNTER_IDS) from[k] = Math.floor(num(obj(r.from)[k], 0, 1e15, 0));
    s.missions.active.push({ id: r.id, from, at: num(r.at, 0, now, now) });
  }
  s.badges = [...new Set((Array.isArray(o.badges) ? o.badges : []).filter(slug))];
  for (const k of COUNTER_IDS) s.counters[k] = Math.floor(num(obj(o.counters)[k], 0, 1e15, 0));
  // Getting started: a save from before it that's past level 1 has it done already (no rewards for steps long behind you)
  const gd = obj(o.guide);
  s.guide = 'guide' in o ? { step: Math.round(num(gd.step, 0, GUIDE_STEPS, 0)), hidden: gd.hidden === true } : { step: level(s) > 1 ? GUIDE_STEPS : 0, hidden: false };
  s.backup = num(o.backup, 0, now, 0);
  // Getting about (growth plan Phase 8): the places you've walked to, only ones that are on the map
  s.visited = [...new Set((Array.isArray(o.visited) ? o.visited : []).filter((id): id is string => typeof id === 'string' && MAP_PLACES.includes(id)))];
}

/** You've walked to these places (places.ts `seen()`): fast travel can take you there now. The ones that are new */
export function visit(s: TycoonSave, ids: readonly string[]) {
  const fresh = ids.filter((id) => MAP_PLACES.includes(id) && !s.visited.includes(id));
  s.visited.push(...fresh);
  return fresh;
}
