/*
 * The city builder: plots, prices and the buildings you can put on them.
 *
 * DEMO ONLY. Buying is simulated: there is no wallet connection, nothing is
 * sent to PulseChain and no real PLS moves. Progress is saved in the
 * visitor's own browser. The real wallet goes in later behind the same
 * calls (see src/scripts/city3d/store.ts).
 *
 * PLACEHOLDER PRICES. These numbers only make the demo work. Replace them
 * with the owner's real pricing before anything goes on sale.
 */

/** Simulated PLS a demo wallet starts with. */
export const DEMO_WALLET_START = 10_000_000;

/** Placeholder plot prices in PLS, by tier. */
export const PLOT_PRICES = {
  prime: 2_000_000,
  standard: 1_000_000,
  outer: 500_000,
} as const;
export type Tier = keyof typeof PLOT_PRICES;

export const TIER_INFO: Record<Tier, { label: string; note: string }> = {
  prime: { label: 'Prime', note: 'Faces the core city across the ring road' },
  standard: { label: 'Standard', note: 'Inside a district, one row back' },
  outer: { label: 'Outer', note: 'Corner district, quieter streets' },
};

export type BuildingType = 'house' | 'shop' | 'tower' | 'loft' | 'arcade' | 'garden' | 'warehouse' | 'billboard';

export interface BuildingDef {
  type: BuildingType;
  name: string;
  blurb: string;
  /** Floors the visitor can choose: [min, max, default] */
  floors?: [number, number, number];
  /** Has a neon sign with selectable text */
  sign?: boolean;
}

export const BUILDINGS: BuildingDef[] = [
  { type: 'house', name: 'Degen House', blurb: 'Pitched roof, warm windows, a chimney for the gas fees.' },
  { type: 'shop', name: 'Shopfront', blurb: 'Two floors, striped awning and a neon sign.', sign: true },
  { type: 'tower', name: 'Tower', blurb: 'Glass and neon. Pick how tall.', floors: [4, 16, 9] },
  { type: 'loft', name: 'Loft', blurb: 'Balconies on every floor and a garden on the roof.', floors: [2, 5, 3] },
  { type: 'arcade', name: 'Arcade', blurb: 'Big sign, marquee lights, open all night.', sign: true },
  { type: 'garden', name: 'Pocket Park', blurb: 'Trees, flower beds, a bench and a fountain.' },
  { type: 'warehouse', name: 'Warehouse', blurb: 'Sawtooth roof with glowing glazing.' },
  { type: 'billboard', name: 'Billboard Lot', blurb: 'A kiosk under a big Degen billboard.' },
];

/** Wall colours the visitor can pick */
export const WALL_COLORS = ['#e23b3b', '#ff8a3d', '#ffd23f', '#1fbf6b', '#00b0ff', '#8000ff', '#e219e5', '#f3f2f7', '#2b2d3a'];
/** Neon and accent colours */
export const NEON_COLORS = ['#ff6ad5', '#00eaff', '#a36bff', '#ffd36b', '#2bff88'];
/** Sign texts (fixed, so nothing unexpected ends up on a public page) */
export const SIGNS = ['GM', 'HODL', 'DEGEN', 'LFG', 'OPEN'];
