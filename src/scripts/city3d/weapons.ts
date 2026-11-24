/*
 * The guns in the Armoury's store and the training dummies' places: what the boot reads of target practice (the
 * Armoury's shelves, the hotbar, the dummies' solids) without the rules themselves, combat-sim.ts, which re-exports
 * these and comes with target practice. DOM-free; tested with the rules (tests/combat.test.ts).
 */
import { design } from './layout';
import { PRACTICE } from './downtown';
import { FREE_PLAY } from './freeplay';

/* ---------- The guns in the Armoury's store ---------- */

export type WeaponId = 'rifle' | 'smg' | 'shotgun' | 'dmr' | 'revolver' | 'burst' | 'lmg';
export interface Weapon {
  id: WeaponId;
  name: string;
  /** Short name for the swap button */
  short: string;
  /** One line for the store */
  blurb: string;
  /** Lifetime score that unlocks it in the store (cosmetic progress, never bought) */
  need: number;
  mag: number;
  reserve: number;
  /** Rounds a second */
  rate: number;
  /** Holding the trigger keeps firing; otherwise one shot per pull */
  auto: boolean;
  /** Damage per pellet, and pellets per shot */
  damage: number;
  pellets: number;
  reload: number;
  range: number;
  /** Shot cone (radians) from the hip and aimed, and how much each shot opens it */
  spreadHip: number;
  spreadAim: number;
  bloom: number;
  bloomMax: number;
  bloomDecay: number;
  /** How hard each shot kicks the view (radians) */
  kick: number;
  /** First person: how many degrees the view narrows when aiming */
  zoom: number;
  /** Rounds fired per trigger pull (a burst), 1 for the rest */
  burst?: number;
}

const BASE = { auto: true, pellets: 1, bloomDecay: 0.2 };
export const WEAPONS: Record<WeaponId, Weapon> = {
  rifle: { ...BASE, id: 'rifle', name: 'Assault Rifle', short: 'Rifle', blurb: 'Full-auto all-rounder, red-dot sight', need: 0, mag: 30, reserve: 120, rate: 9.5, damage: 25, reload: 1.7, range: 70, spreadHip: 0.012, spreadAim: 0.003, bloom: 0.005, bloomMax: 0.04, kick: 0.012, zoom: 20 },
  smg: { ...BASE, id: 'smg', name: 'Buzz SMG', short: 'SMG', blurb: 'Fast spray up close', need: 750, mag: 40, reserve: 160, rate: 15, damage: 14, reload: 1.4, range: 45, spreadHip: 0.02, spreadAim: 0.007, bloom: 0.004, bloomMax: 0.05, bloomDecay: 0.3, kick: 0.007, zoom: 14 },
  shotgun: { ...BASE, id: 'shotgun', name: 'Street Sweeper', short: 'Sweeper', blurb: 'Eight pellets, deadly up close', need: 2500, mag: 6, reserve: 36, rate: 1.4, auto: false, damage: 11, pellets: 8, reload: 2.2, range: 30, spreadHip: 0.065, spreadAim: 0.045, bloom: 0, bloomMax: 0, kick: 0.05, zoom: 10 },
  dmr: { ...BASE, id: 'dmr', name: 'Long Shot', short: 'Long Shot', blurb: 'Scoped, slow, hits hard', need: 6000, mag: 8, reserve: 40, rate: 2.6, auto: false, damage: 80, reload: 2.0, range: 120, spreadHip: 0.03, spreadAim: 0.0004, bloom: 0.02, bloomMax: 0.03, bloomDecay: 0.5, kick: 0.035, zoom: 36 },
  // Bought at the Armoury with Dorras (catalog.ts), never unlocked by score
  revolver: { ...BASE, id: 'revolver', name: 'Hand Cannon', short: 'Cannon', blurb: 'Slow to fire, hits very hard', need: 0, mag: 6, reserve: 30, rate: 2.2, auto: false, damage: 60, reload: 2.4, range: 60, spreadHip: 0.018, spreadAim: 0.002, bloom: 0.015, bloomMax: 0.04, bloomDecay: 0.35, kick: 0.04, zoom: 18 },
  burst: { ...BASE, id: 'burst', name: 'Tri-Tap', short: 'Tri-Tap', blurb: 'Carbine, precise at range', need: 0, mag: 36, reserve: 144, rate: 14, auto: false, burst: 3, damage: 22, reload: 1.8, range: 85, spreadHip: 0.01, spreadAim: 0.002, bloom: 0.004, bloomMax: 0.03, kick: 0.01, zoom: 24 },
  lmg: { ...BASE, id: 'lmg', name: 'Belt Feeder', short: 'Belt', blurb: 'Long spray, slow reload', need: 0, mag: 100, reserve: 200, rate: 11, damage: 20, reload: 3.6, range: 65, spreadHip: 0.03, spreadAim: 0.012, bloom: 0.003, bloomMax: 0.06, bloomDecay: 0.18, kick: 0.016, zoom: 16 },
};
// Free play (freeplay.ts): no gun waits on a score
if (FREE_PLAY) for (const w of Object.values(WEAPONS)) w.need = 0;
/** Store order, and each gun's number on the wire */
export const WEAPON_IDS: WeaponId[] = ['rifle', 'smg', 'shotgun', 'dmr', 'revolver', 'burst', 'lmg'];
export const weaponUnlocked = (id: unknown, total: number) => typeof id === 'string' && id in WEAPONS && total >= WEAPONS[id as WeaponId].need;

/**
 * Training dummies: x, z and facing. Three in the north-west pocket park (downtown.ts PRACTICE),
 * the rest on a few landmarks' lots (placed on the landmarks' drawing grid, layout.ts).
 */
export const DUMMIES: [number, number, number][] = [
  ...PRACTICE.map(([x, z], i): [number, number, number] => [x, z, i === 0 ? Math.PI / 2 : 0]),
  ...(
    [
      [7.7, 24.1, Math.PI / 4],
      [8.1, 25.6, Math.PI / 4],
      [28.6, 7.0, 0],
      [24.4, 6.4, 0],
    ] as [number, number, number][]
  ).map(([x, z, ry]): [number, number, number] => [...design(x, z), ry]),
];
