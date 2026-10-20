/*
 * The city's economy, Phase 1: Dorras, goods with moving prices, and your
 * market stall. Kept free of the DOM and of scene code (tycoon-ui.ts is the
 * view, market.ts the stalls), so a game server can run the same rules
 * later; the save is plain data, cleaned by cleanSave().
 *
 * - Dorras are earned by playing. They can't be cashed out (and, for now,
 *   can't be bought either).
 * - The Emporium's market hall sells goods wholesale at a price that moves
 *   with the time of day (the same for everyone, so it can't be gamed by
 *   reloading) and buys them back a little under it.
 * - Your stall sells its stock to passers-by at a retail mark-up you pick
 *   (Low sells fast, High earns more per sale). Takings go in the till;
 *   collect them into your balance.
 * - It sells faster while you stand at it (you serve the customers), and a
 *   quarter as fast while you're away, for up to OFFLINE_CAP minutes.
 */

export type GoodId = 'gummies' | 'coffee' | 'glow' | 'tees' | 'sneakers' | 'neon';
export interface Good {
  id: GoodId;
  name: string;
  /** Wholesale price at the middle of its swing (Dorras) */
  base: number;
  /** Customers a minute who'd buy one at a Fair price */
  demand: number;
  /** Colour for its crates and icon */
  color: string;
}

export const GOODS: Good[] = [
  { id: 'glow', name: 'Glow Sticks', base: 8, demand: 1.7, color: '#2bff88' },
  { id: 'gummies', name: 'Gummy Bears', base: 12, demand: 1.4, color: '#ff6ad5' },
  { id: 'coffee', name: 'Iced Coffee', base: 18, demand: 1.1, color: '#c98a4b' },
  { id: 'tees', name: 'Street Tees', base: 45, demand: 0.55, color: '#00c2ff' },
  { id: 'sneakers', name: 'Sneakers', base: 120, demand: 0.26, color: '#f3f2f7' },
  { id: 'neon', name: 'Neon Signs', base: 260, demand: 0.13, color: '#e219e5' },
];
export const GOOD_IDS = GOODS.map((g) => g.id);
export const good = (id: GoodId) => GOODS.find((g) => g.id === id)!;

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

/** Standing at your stall: customers come this much faster */
export const SERVING = 2;
/** While you're away: a quarter of the pace, for up to four hours */
export const OFFLINE_PACE = 0.25;
export const OFFLINE_CAP = 240;
/** A gap longer than this (minutes) counts as being away */
export const AWAY_AFTER = 2;

export interface Slot {
  good: GoodId;
  qty: number;
  price: PriceLevel;
  /** Part-sold customers, carried to the next tick */
  carry: number;
}
export interface TycoonSave {
  v: 1;
  dorras: number;
  till: number;
  /** When it was last brought up to date (ms since 1970) */
  at: number;
  stall: { level: number; slots: Slot[] };
  stats: { earned: number; sold: number };
}

export function newSave(now: number): TycoonSave {
  return { v: 1, dorras: START_DORRAS, till: 0, at: now, stall: { level: 1, slots: [] }, stats: { earned: 0, sold: 0 } };
}

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

/** A save from the browser (or anywhere) made safe: unknown goods dropped, numbers clamped; a fresh save if it isn't one */
export function cleanSave(raw: unknown, now: number): TycoonSave {
  if (!raw || typeof raw !== 'object') return newSave(now);
  const o = raw as Record<string, unknown>;
  const st = (o.stall && typeof o.stall === 'object' ? o.stall : {}) as Record<string, unknown>;
  const level = Math.round(num(st.level, 1, STALL_LEVELS.length, 1));
  const L = stallLevel(level);
  const seen = new Set<GoodId>();
  const slots: Slot[] = [];
  for (const s of Array.isArray(st.slots) ? st.slots : []) {
    const r = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
    const id = GOOD_IDS.find((g) => g === r.good);
    if (!id || seen.has(id) || slots.length >= L.slots) continue;
    seen.add(id);
    slots.push({
      good: id,
      qty: Math.floor(num(r.qty, 0, L.capacity, 0)),
      price: PRICE_LEVEL_IDS.find((p) => p === r.price) ?? 'fair',
      carry: num(r.carry, 0, 0.999, 0),
    });
  }
  const stats = (o.stats && typeof o.stats === 'object' ? o.stats : {}) as Record<string, unknown>;
  return {
    v: 1,
    dorras: Math.floor(num(o.dorras, 0, 1e12, START_DORRAS)),
    till: Math.floor(num(o.till, 0, 1e12, 0)),
    at: num(o.at, 0, now, now),
    stall: { level, slots },
    stats: { earned: Math.floor(num(stats.earned, 0, 1e15, 0)), sold: Math.floor(num(stats.sold, 0, 1e15, 0)) },
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

/* ---------- Your stall ---------- */

export const slotOf = (s: TycoonSave, id: GoodId) => s.stall.slots.find((x) => x.good === id);
/** How many more of a good the stall can take (a new kind needs a free slot) */
export function room(s: TycoonSave, id: GoodId) {
  const L = stallLevel(s.stall.level);
  const slot = slotOf(s, id);
  if (slot) return L.capacity - slot.qty;
  return s.stall.slots.length < L.slots ? L.capacity : 0;
}

export type Result = { ok: true; qty: number; dorras: number } | { ok: false; why: 'money' | 'room' | 'stock' | 'max' };

/** Buy stock at the market hall, straight onto your stall (as many as you can, up to `qty`) */
export function buy(s: TycoonSave, id: GoodId, qty: number, now: number): Result {
  const each = askPrice(id, now);
  const space = room(s, id);
  if (space <= 0) return { ok: false, why: 'room' };
  const n = Math.min(Math.floor(qty), space, Math.floor(s.dorras / each));
  if (n <= 0) return { ok: false, why: 'money' };
  let slot = slotOf(s, id);
  if (!slot) {
    slot = { good: id, qty: 0, price: 'fair', carry: 0 };
    s.stall.slots.push(slot);
  }
  slot.qty += n;
  s.dorras -= n * each;
  return { ok: true, qty: n, dorras: n * each };
}

/** Sell stock back to the market hall (a little under its price) */
export function sellBack(s: TycoonSave, id: GoodId, qty: number, now: number): Result {
  const slot = slotOf(s, id);
  const n = Math.min(Math.floor(qty), slot?.qty ?? 0);
  if (!slot || n <= 0) return { ok: false, why: 'stock' };
  const each = bidPrice(id, now);
  slot.qty -= n;
  s.dorras += n * each;
  // An empty slot frees up for another kind of goods
  if (slot.qty === 0) s.stall.slots = s.stall.slots.filter((x) => x !== slot);
  return { ok: true, qty: n, dorras: n * each };
}

/** Free a sold-out slot for another kind of goods */
export function clearSlot(s: TycoonSave, id: GoodId) {
  const slot = slotOf(s, id);
  if (!slot || slot.qty > 0) return false;
  s.stall.slots = s.stall.slots.filter((x) => x !== slot);
  return true;
}

export function setPrice(s: TycoonSave, id: GoodId, level: PriceLevel) {
  const slot = slotOf(s, id);
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

/** Customers a minute for one slot right now (before serving or being away) */
export function pace(s: TycoonSave, slot: Slot) {
  return good(slot.good).demand * PRICE_LEVELS[slot.price].pace * stallLevel(s.stall.level).pace;
}

export interface Sales {
  /** Minutes covered, and how many of them you were away */
  minutes: number;
  away: number;
  sold: Partial<Record<GoodId, number>>;
  earned: number;
}

/**
 * Bring the stall up to `now`: customers buy from its stock at its prices,
 * the takings go in the till. `serving`: you're standing at it.
 */
export function advance(s: TycoonSave, now: number, serving = false): Sales {
  const out: Sales = { minutes: 0, away: 0, sold: {}, earned: 0 };
  const gap = (now - s.at) / 60000;
  s.at = Math.max(s.at, now);
  if (!(gap > 0)) return out;
  // A long gap was time away: slower, and only so much of it counts
  const away = gap > AWAY_AFTER;
  const minutes = away ? Math.min(gap, OFFLINE_CAP) : gap;
  const rate = away ? OFFLINE_PACE : serving ? SERVING : 1;
  out.minutes = minutes;
  out.away = away ? minutes : 0;
  for (const slot of s.stall.slots) {
    if (slot.qty <= 0) continue;
    const want = pace(s, slot) * rate * minutes + slot.carry;
    const n = Math.min(slot.qty, Math.floor(want));
    slot.carry = n < slot.qty ? want - Math.floor(want) : 0;
    if (n <= 0) continue;
    slot.qty -= n;
    const pay = n * retailPrice(slot.good, slot.price, now);
    s.till += pay;
    out.earned += pay;
    out.sold[slot.good] = n;
    s.stats.sold += n;
    s.stats.earned += pay;
  }
  return out;
}
