/*
 * Every vehicle a player can have, by id, and the paints they come in: the
 * garage's (mycar.ts, mybike.ts), the kart hut's (mykart.ts) and the
 * hangar's (myplane.ts), which re-export them, and how they read their
 * saves. Typed without the DOM, so the game server can check what a player
 * says they're in (net/protocol.ts `cleanVehicle()`).
 */
/** Every car model (cars.ts draws them; here so the shared, DOM-free code can name them) */
export type CarId = 'hatch' | 'sedan' | 'coupe' | 'pickup' | 'van' | 'bus' | 'muscle' | 'suv' | 'super' | 'exec' | 'classic' | 'offroad' | 'ev' | 'police' | 'truck' | 'rig';

/** The cars a player can pick (the bus is for the city only): the five starters, then the ones the garage sells (catalog.ts) */
export const PLAYER_CARS = ['hatch', 'sedan', 'coupe', 'pickup', 'van', 'muscle', 'suv', 'super', 'classic', 'offroad', 'ev'] as const satisfies readonly CarId[];
export type PlayerCar = (typeof PLAYER_CARS)[number];

/** Paint colours on offer */
export const CAR_PAINTS = [
  { id: 'red', name: 'Rocket red', hex: '#e23b3b' },
  { id: 'orange', name: 'Sunset orange', hex: '#ff8a3d' },
  { id: 'yellow', name: 'Taxi yellow', hex: '#ffd23f' },
  { id: 'green', name: 'Mint green', hex: '#1fbf6b' },
  { id: 'cyan', name: 'Electric cyan', hex: '#00c2ff' },
  { id: 'navy', name: 'Night blue', hex: '#2a3b66' },
  { id: 'violet', name: 'Ultra violet', hex: '#8000ff' },
  { id: 'magenta', name: 'Neon magenta', hex: '#e219e5' },
  { id: 'pink', name: 'Bubblegum', hex: '#ff6ad5' },
  { id: 'white', name: 'Pearl white', hex: '#f3f2f7' },
  { id: 'silver', name: 'Silver', hex: '#9a96b8' },
  { id: 'black', name: 'Midnight', hex: '#14121f' },
] as const;
export type PaintId = (typeof CAR_PAINTS)[number]['id'];

export const PLAYER_BIKES = ['scooter', 'streetbike', 'sportbike'] as const;
export type BikeId = (typeof PLAYER_BIKES)[number];

export const PLAYER_KARTS = ['rocket', 'bigwheel', 'zip', 'tank'] as const;
export type KartId = (typeof PLAYER_KARTS)[number];

/** The aircraft a player can fly: a high-wing prop plane, a small jet and a helicopter */
export const PLAYER_AIRCRAFT = ['prop', 'bizjet', 'heli'] as const;
export type PlaneId = (typeof PLAYER_AIRCRAFT)[number];

/** A vehicle's save in the browser, parsed (null if there's none); the game server never calls it */
export const readSaved = (key: string): unknown =>
  JSON.parse((globalThis as unknown as { localStorage: { getItem(k: string): string | null } }).localStorage.getItem(key) ?? 'null');
