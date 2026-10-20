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
 */
import { DOORS, GARAGE_SITE, LOT_SITE, STALL_SPOT, UNIT_SITE } from './solids';

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
  { level: 2, slots: 4, capacity: 40, pace: 1.25, cost: 2500 },
  { level: 3, slots: 6, capacity: 80, pace: 1.6, cost: 10000 },
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
export const UNIT_PRICES = [2000, 4000, 8000, 14000];
/** What a unit can be built as, and what building it costs */
export const UNIT_KINDS = {
  garden: { name: 'Garden', cost: 500 },
  shop: { name: 'Shop', cost: 900 },
  warehouse: { name: 'Warehouse', cost: 700 },
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
/** How many goods each of your cars carries */
export const CARGO: Record<string, number> = { hatch: 16, sedan: 20, coupe: 8, pickup: 40, van: 80 };
export const cargoCap = (model: string) => CARGO[model] ?? CARGO.hatch;
/** Delivering to a stall or shop yourself: this share of the goods' market price, as a bonus */
export const DELIVERY_BONUS = 0.1;

/* Phase 4: the big lots, east of Makers' Row: Dorras only (never the PLS district plots) */
export const LOT_COUNT = 3;
/** The 1st, 2nd and 3rd big lot you buy */
export const LOT_PRICES = [25000, 50000, 90000];
export const LOT_KINDS = {
  superstore: { name: 'Superstore', cost: 8000 },
  factory: { name: 'Factory', cost: 10000 },
  depot: { name: 'Depot', cost: 6000 },
  offices: { name: 'Offices', cost: 15000 },
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
export type PlaceId = 'stall' | 'workshop' | 'u0' | 'u1' | 'u2' | 'u3' | 'l0' | 'l1' | 'l2';
export const UNIT_PLACES = ['u0', 'u1', 'u2', 'u3'] as const;
export const LOT_PLACES = ['l0', 'l1', 'l2'] as const;
export const PLACE_IDS: PlaceId[] = ['stall', 'u0', 'u1', 'u2', 'u3', 'l0', 'l1', 'l2', 'workshop'];
/** The Vault's ledger: where Dorras came from and went */
export const ENTRIES = {
  sales: { name: 'Sales', in: true },
  bonus: { name: 'Delivery bonuses', in: true },
  contracts: { name: 'Contracts', in: true },
  soldBack: { name: 'Sold to the market', in: true },
  borrowed: { name: 'Loans', in: true },
  bought: { name: 'Stock bought', in: false },
  property: { name: 'Property and building', in: false },
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
export interface TycoonSave {
  v: 4;
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
  ledger: Ledger;
  loan: Loan | null;
  stats: { earned: number; sold: number; made: number; grown: number; bonus: number; wages: number; contracts: number };
}

export function newSave(now: number): TycoonSave {
  return {
    v: 4,
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
    ledger: { totals: {}, recent: [] },
    loan: null,
    stats: { earned: 0, sold: 0, made: 0, grown: 0, bonus: 0, wages: 0, contracts: 0 },
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
function cleanUnit(raw: unknown): Unit | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = obj(raw);
  const kind = UNIT_KIND_IDS.find((k) => k === r.kind) ?? null;
  const crop = RAW_IDS.find((c) => c === r.crop) ?? 'sugar';
  return {
    kind,
    crop,
    stock: kind === 'garden' ? cleanStock(r.stock, GARDEN_CAP, (id) => id === crop) : kind === 'warehouse' ? cleanStock(r.stock, WAREHOUSE_CAP) : {},
    slots: kind === 'shop' ? cleanSlots(r.slots, SHOP.slots, SHOP.capacity) : [],
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
  const s: TycoonSave = {
    v: 4,
    dorras: Math.floor(num(o.dorras, 0, 1e12, START_DORRAS)),
    till: Math.floor(num(o.till, 0, 1e12, 0)),
    at: num(o.at, 0, now, now),
    stall: { level, slots: cleanSlots(st.slots, L.slots, L.capacity) },
    units: Array.from({ length: UNIT_COUNT }, (_, i) => cleanUnit(units[i])),
    workshop: {
      stock: cleanStock(ws.stock, WORKSHOP_CAP),
      job: cleanJob(ws.job, JOB_MAX),
    },
    cargo: cleanStock(o.cargo, Math.max(...Object.values(CARGO))),
    staff: [],
    shipments: [],
    contracts: [],
    taken: [],
    lots: Array.from({ length: LOT_COUNT }, (_, i) => cleanLot((Array.isArray(o.lots) ? o.lots : [])[i])),
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
  };
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
function cleanLot(raw: unknown): Lot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = obj(raw);
  const kind = LOT_KIND_IDS.find((k) => k === r.kind) ?? null;
  return {
    kind,
    stock: kind === 'depot' ? cleanStock(r.stock, DEPOT_CAP) : kind === 'factory' ? cleanStock(r.stock, FACTORY.cap) : {},
    slots: kind === 'superstore' ? cleanSlots(r.slots, SUPERSTORE.slots, SUPERSTORE.capacity) : [],
    job: kind === 'factory' ? cleanJob(r.job, FACTORY.jobMax) : null,
  };
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
/** What's built at a place you own (a unit's or a big lot's kind), if anything */
export const kindAt = (s: TycoonSave, p: PlaceId): UnitKind | LotKind | null => unitAt(s, p)?.kind ?? lotAt(s, p)?.kind ?? null;
/** Places that sell to the public: the stall, your shops and superstores */
export const sells = (s: TycoonSave, p: PlaceId) => p === 'stall' || kindAt(s, p) === 'shop' || kindAt(s, p) === 'superstore';
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
  const u = unitAt(s, p) ?? lotAt(s, p);
  const spec = u?.kind === 'shop' ? SHOP : u?.kind === 'superstore' ? SUPERSTORE : null;
  if (!u || !spec) return null;
  return { slots: u.slots, max: spec.slots, capacity: spec.capacity, pace: spec.pace, set: (v: Slot[]) => (u.slots = v) };
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
  if (p === 'workshop') return Math.max(0, WORKSHOP_CAP - total(s.workshop.stock));
  const k = kindAt(s, p);
  const cap = k === 'warehouse' ? WAREHOUSE_CAP : k === 'depot' ? DEPOT_CAP : k === 'factory' ? FACTORY.cap : 0;
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
  if (p === 'workshop') return { stock: s.workshop.stock, job: s.workshop.job, set: (j: Job | null) => (s.workshop.job = j), speed: 1, max: JOB_MAX };
  const l = lotAt(s, p);
  if (l?.kind !== 'factory') return null;
  return { stock: l.stock, job: l.job, set: (j: Job | null) => (l.job = j), speed: FACTORY.speed, max: FACTORY.jobMax };
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
    }
  }
  // Gardens grow until their bins are full (as fast while you're away)
  s.units.forEach((u, i) => {
    if (u?.kind !== 'garden') return;
    const p = `u${i}` as PlaceId;
    const hand = s.staff.includes(p);
    const have = u.stock[u.crop] ?? 0;
    const want = CROPS[u.crop] * (hand ? STAFF_BOOST : 1) * minutes + u.carry;
    const n = Math.min(GARDEN_CAP - have, Math.floor(want));
    u.carry = have + n < GARDEN_CAP ? want - Math.floor(want) : 0;
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
  p === 'stall' ? STALL_SPOT : p === 'workshop' ? DOORS.find((d) => d.id === 'workshop')! : p.startsWith('l') ? LOT_SITE[lotIndex(p)].door : UNIT_SITE[unitIndex(p)].door;
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
  return { ok: true, qty: 1, dorras: cost };
}

/* The ledger */
export const LEDGER_LINES = 30;
/** Write a movement of Dorras in the Vault's ledger (a run of the same kind within a minute is one line) */
function book(s: TycoonSave, e: Entry, n: number) {
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
  return s.dorras + s.till + goodsValue(s, now) + propertyValue(s) - (s.loan?.owed ?? 0);
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
