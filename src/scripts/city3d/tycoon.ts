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
export type PlaceId = 'stall' | 'workshop' | 'u0' | 'u1' | 'u2' | 'u3';
export const UNIT_PLACES = ['u0', 'u1', 'u2', 'u3'] as const;
export interface Job {
  make: ProductId;
  /** Items still to make */
  left: number;
  /** Minutes into the current item */
  t: number;
}
export interface TycoonSave {
  v: 2;
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
  stats: { earned: number; sold: number; made: number; grown: number; bonus: number };
}

export function newSave(now: number): TycoonSave {
  return {
    v: 2,
    dorras: START_DORRAS,
    till: 0,
    at: now,
    stall: { level: 1, slots: [] },
    units: Array.from({ length: UNIT_COUNT }, () => null),
    workshop: { stock: {}, job: null },
    cargo: {},
    stats: { earned: 0, sold: 0, made: 0, grown: 0, bonus: 0 },
  };
}
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

/** A save from the browser (or anywhere) made safe: unknown goods dropped, numbers clamped; a fresh save if it isn't one. Phase 1 saves carry on. */
export function cleanSave(raw: unknown, now: number): TycoonSave {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return newSave(now);
  const o = raw as Record<string, unknown>;
  const st = obj(o.stall);
  const level = Math.round(num(st.level, 1, STALL_LEVELS.length, 1));
  const L = stallLevel(level);
  const stats = obj(o.stats);
  const units = Array.isArray(o.units) ? o.units : [];
  const ws = obj(o.workshop);
  const job = obj(ws.job);
  const left = Math.floor(num(job.left, 0, JOB_MAX, 0));
  const make = left > 0 ? RECIPE_IDS.find((id) => id === job.make) : undefined;
  return {
    v: 2,
    dorras: Math.floor(num(o.dorras, 0, 1e12, START_DORRAS)),
    till: Math.floor(num(o.till, 0, 1e12, 0)),
    at: num(o.at, 0, now, now),
    stall: { level, slots: cleanSlots(st.slots, L.slots, L.capacity) },
    units: Array.from({ length: UNIT_COUNT }, (_, i) => cleanUnit(units[i])),
    workshop: {
      stock: cleanStock(ws.stock, WORKSHOP_CAP),
      job: make ? { make, left, t: num(job.t, 0, RECIPES[make]!.minutes, 0) } : null,
    },
    cargo: cleanStock(o.cargo, Math.max(...Object.values(CARGO))),
    stats: {
      earned: Math.floor(num(stats.earned, 0, 1e15, 0)),
      sold: Math.floor(num(stats.sold, 0, 1e15, 0)),
      made: Math.floor(num(stats.made, 0, 1e15, 0)),
      grown: Math.floor(num(stats.grown, 0, 1e15, 0)),
      bonus: Math.floor(num(stats.bonus, 0, 1e15, 0)),
    },
  };
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
/** Places that sell to the public: the stall and your shops */
export const sells = (s: TycoonSave, p: PlaceId) => p === 'stall' || unitAt(s, p)?.kind === 'shop';
/** Places you can load your car from (stock on sale stays on the shelves) */
export const loadsFrom = (s: TycoonSave, p: PlaceId) => p === 'workshop' || unitAt(s, p)?.kind === 'garden' || unitAt(s, p)?.kind === 'warehouse';
/** A sales point's shelves, how many kinds and how many of each, and how fast customers come */
function shelves(s: TycoonSave, p: PlaceId) {
  if (p === 'stall') {
    const L = stallLevel(s.stall.level);
    return { slots: s.stall.slots, max: L.slots, capacity: L.capacity, pace: L.pace, set: (v: Slot[]) => (s.stall.slots = v) };
  }
  const u = unitAt(s, p);
  if (u?.kind !== 'shop') return null;
  return { slots: u.slots, max: SHOP.slots, capacity: SHOP.capacity, pace: SHOP.pace, set: (v: Slot[]) => (u.slots = v) };
}
/** Everything at a place, as a stock list */
export function stockAt(s: TycoonSave, p: PlaceId): Stock {
  const sh = shelves(s, p);
  if (sh) return Object.fromEntries(sh.slots.map((x) => [x.good, x.qty]));
  if (p === 'workshop') return s.workshop.stock;
  return unitAt(s, p)?.stock ?? {};
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
  const u = unitAt(s, p);
  if (u?.kind === 'warehouse') return Math.max(0, WAREHOUSE_CAP - total(u.stock));
  return 0;
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
  | { ok: false; why: 'money' | 'room' | 'stock' | 'max' | 'busy' | 'owned' | 'place' };

/** Buy at the market hall, delivered straight to one of your places (as many as you can, up to `qty`) */
export function buy(s: TycoonSave, id: GoodId, qty: number, now: number, to: PlaceId = 'stall'): Result {
  const each = askPrice(id, now);
  const space = room(s, id, to);
  if (space <= 0) return { ok: false, why: 'room' };
  const n = Math.min(Math.floor(qty), space, Math.floor(s.dorras / each));
  if (n <= 0) return { ok: false, why: 'money' };
  put(s, to, id, n);
  s.dorras -= n * each;
  return { ok: true, qty: n, dorras: n * each };
}

/** Sell goods from one of your places back to the market hall (a little under its price) */
export function sellBack(s: TycoonSave, id: GoodId, qty: number, now: number, from: PlaceId = 'stall'): Result {
  const n = take(s, from, id, Math.floor(qty));
  if (n <= 0) return { ok: false, why: 'stock' };
  const each = bidPrice(id, now);
  s.dorras += n * each;
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
  Object.assign(u, emptyUnit(), { kind, crop: crop ?? u.crop });
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

/** How many of a product the Workshop's bay has the raw goods for */
export function canMake(s: TycoonSave, make: ProductId) {
  const r = RECIPES[make];
  if (!r) return 0;
  return Math.min(JOB_MAX, ...Object.entries(r.needs).map(([raw, n]) => Math.floor((s.workshop.stock[raw as RawId] ?? 0) / n!)));
}
/** Start a job: its raw goods leave the bay now, the products arrive one by one */
export function startJob(s: TycoonSave, make: ProductId, qty: number): Result {
  const r = RECIPES[make];
  if (!r) return { ok: false, why: 'place' };
  if (s.workshop.job) return { ok: false, why: 'busy' };
  const n = Math.min(Math.floor(qty), canMake(s, make));
  if (n <= 0) return { ok: false, why: 'stock' };
  for (const [raw, k] of Object.entries(r.needs)) take(s, 'workshop', raw as RawId, k! * n);
  s.workshop.job = { make, left: n, t: 0 };
  return { ok: true, qty: n, dorras: 0 };
}
/** Stop the job: the raw goods for what wasn't made go back in the bay */
export function cancelJob(s: TycoonSave) {
  const j = s.workshop.job;
  if (!j) return false;
  for (const [raw, k] of Object.entries(RECIPES[j.make]!.needs)) put(s, 'workshop', raw as RawId, k! * j.left);
  s.workshop.job = null;
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
  return { ok: true, qty: n, dorras: bonus };
}

/* ---------- Time passing ---------- */

/** Customers a minute for one shelf right now (before serving or being away) */
export function pace(s: TycoonSave, slot: Slot, p: PlaceId = 'stall') {
  return good(slot.good).demand * PRICE_LEVELS[slot.price].pace * (shelves(s, p)?.pace ?? 1);
}

export interface Sales {
  /** Minutes covered, and how many of them you were away */
  minutes: number;
  away: number;
  sold: Partial<Record<GoodId, number>>;
  earned: number;
  /** Grown in gardens, made at the Workshop */
  grown: Partial<Record<GoodId, number>>;
  made: Partial<Record<GoodId, number>>;
}
const add = (m: Partial<Record<GoodId, number>>, id: GoodId, n: number) => (m[id] = (m[id] ?? 0) + n);

/**
 * Bring everything up to `now`: customers buy from your stall and shops at
 * their prices (takings go in the till), gardens grow, the Workshop works.
 * `serving`: the place you're standing at (true: the stall).
 */
export function advance(s: TycoonSave, now: number, serving: PlaceId | boolean = false): Sales {
  const out: Sales = { minutes: 0, away: 0, sold: {}, earned: 0, grown: {}, made: {} };
  const gap = (now - s.at) / 60000;
  s.at = Math.max(s.at, now);
  if (!(gap > 0)) return out;
  // A long gap was time away: slower, and only so much of it counts
  const away = gap > AWAY_AFTER;
  const minutes = away ? Math.min(gap, OFFLINE_CAP) : gap;
  const at = serving === true ? 'stall' : serving || null;
  out.minutes = minutes;
  out.away = away ? minutes : 0;
  for (const p of ['stall', ...UNIT_PLACES] as PlaceId[]) {
    const sh = shelves(s, p);
    if (!sh) continue;
    const rate = away ? OFFLINE_PACE : at === p ? SERVING : 1;
    for (const slot of sh.slots) {
      if (slot.qty <= 0) continue;
      const want = pace(s, slot, p) * rate * minutes + slot.carry;
      const n = Math.min(slot.qty, Math.floor(want));
      slot.carry = n < slot.qty ? want - Math.floor(want) : 0;
      if (n <= 0) continue;
      slot.qty -= n;
      const pay = n * retailPrice(slot.good, slot.price, now);
      s.till += pay;
      out.earned += pay;
      add(out.sold, slot.good, n);
      s.stats.sold += n;
      s.stats.earned += pay;
    }
  }
  // Gardens grow until their bins are full (as fast while you're away)
  for (const u of s.units) {
    if (u?.kind !== 'garden') continue;
    const have = u.stock[u.crop] ?? 0;
    const want = CROPS[u.crop] * minutes + u.carry;
    const n = Math.min(GARDEN_CAP - have, Math.floor(want));
    u.carry = have + n < GARDEN_CAP ? want - Math.floor(want) : 0;
    if (n <= 0) continue;
    u.stock[u.crop] = have + n;
    add(out.grown, u.crop, n);
    s.stats.grown += n;
  }
  // The Workshop works through its job
  const j = s.workshop.job;
  if (j) {
    const each = RECIPES[j.make]!.minutes;
    const t = j.t + minutes;
    const n = Math.min(j.left, Math.floor(t / each));
    if (n > 0) {
      put(s, 'workshop', j.make, n);
      add(out.made, j.make, n);
      s.stats.made += n;
    }
    j.left -= n;
    j.t = j.left > 0 ? t - n * each : 0;
    if (j.left <= 0) s.workshop.job = null;
  }
  return out;
}
