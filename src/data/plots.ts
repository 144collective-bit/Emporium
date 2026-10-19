/*
 * The city builder: the large plots, their price and the buildings you can
 * put on them. Plain data, shared with the game server (no DOM, no three.js).
 *
 * Each district around the core city is one large plot: its 3 x 3 squares
 * merged into one, sold for PLOT_PRICE PLS (the owner's price).
 *
 * Real sales go through a PulseChain wallet and the game server (see
 * src/scripts/city3d/land.ts and server/src/land.ts). Without a game server
 * the builder runs as a labelled demo with play money (store.ts).
 */

/** Price of one large plot, in PLS (set by the owner) */
export const PLOT_PRICE = 20_000_000;

/** Simulated PLS a demo wallet starts with (demo mode only) */
export const DEMO_WALLET_START = 100_000_000;

/** The districts around the core city: one large plot each (x, z of the block's corner) */
export const DISTRICTS: { id: string; name: string; ox: number; oz: number }[] = [
  ...[-11, 0, 11, 22, 33].map((ox, i) => ({ id: `N${i + 1}`, name: `North ${i + 1}`, ox, oz: -11 })),
  ...[0, 11, 22].map((oz, i) => ({ id: `W${i + 1}`, name: `West ${i + 1}`, ox: -11, oz })),
  ...[0, 11, 22].map((oz, i) => ({ id: `E${i + 1}`, name: `East ${i + 1}`, ox: 33, oz })),
];
export const PLOT_IDS = DISTRICTS.map((d) => d.id);

export type BuildingType = 'house' | 'shop' | 'tower' | 'loft' | 'arcade' | 'garden' | 'warehouse' | 'billboard';

export interface BuildingDef {
  type: BuildingType;
  name: string;
  blurb: string;
  /** Floors the owner can choose: [min, max, default] */
  floors?: [number, number, number];
  /** Has a neon sign with selectable text */
  sign?: boolean;
}

/**
 * Buildings are drawn PLOT_SCALE times their base size to fill a large plot.
 * Floors are capped so nothing outgrows the Emporium (its roof is ~12.5 tiles up).
 */
export const BUILDINGS: BuildingDef[] = [
  { type: 'house', name: 'Degen House', blurb: 'Pitched roof, warm windows, a chimney for the gas fees.' },
  { type: 'shop', name: 'Shopfront', blurb: 'Two floors, striped awning and a neon sign.', sign: true },
  { type: 'tower', name: 'Tower', blurb: 'Glass and neon. Pick how tall.', floors: [3, 6, 5] },
  { type: 'loft', name: 'Loft', blurb: 'Balconies on every floor and a garden on the roof.', floors: [2, 5, 3] },
  { type: 'arcade', name: 'Arcade', blurb: 'Big sign, marquee lights, open all night.', sign: true },
  { type: 'garden', name: 'Pocket Park', blurb: 'Trees, flower beds, a bench and a fountain.' },
  { type: 'warehouse', name: 'Warehouse', blurb: 'Sawtooth roof with glowing glazing.' },
  { type: 'billboard', name: 'Billboard Lot', blurb: 'A kiosk under a big Degen billboard.' },
];

/** Wall colours the owner can pick */
export const WALL_COLORS = ['#e23b3b', '#ff8a3d', '#ffd23f', '#1fbf6b', '#00b0ff', '#8000ff', '#e219e5', '#f3f2f7', '#2b2d3a'];
/** Neon and accent colours */
export const NEON_COLORS = ['#ff6ad5', '#00eaff', '#a36bff', '#ffd36b', '#2bff88'];
/** Sign texts (fixed, so nothing unexpected ends up on a public page) */
export const SIGNS = ['GM', 'HODL', 'DEGEN', 'LFG', 'OPEN'];

export interface Design {
  type: BuildingType;
  color: string;
  neon: string;
  floors: number;
  sign: string;
  /** Quarter turns, 0-3 */
  rot: number;
}

/** A building design from anywhere (a browser, the server), checked against the lists above; null if it isn't one */
export function cleanDesign(raw: unknown): Design | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  const def = BUILDINGS.find((b) => b.type === d.type);
  if (!def) return null;
  const pick = <T>(list: readonly T[], v: unknown) => (list.includes(v as T) ? (v as T) : list[0]);
  const floors = def.floors ? Math.round(Math.min(def.floors[1], Math.max(def.floors[0], Number(d.floors) || def.floors[2]))) : 1;
  return {
    type: def.type,
    color: pick(WALL_COLORS, d.color),
    neon: pick(NEON_COLORS, d.neon),
    floors,
    sign: pick(SIGNS, d.sign),
    rot: ((Math.round(Number(d.rot) || 0) % 4) + 4) % 4,
  };
}
