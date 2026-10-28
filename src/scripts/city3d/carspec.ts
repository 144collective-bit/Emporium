/*
 * The cars' measurements (vehicle plan Phase 0; DOM-free, tested in
 * tests/carspec.test.ts): each model's outline, cabin, glass, lights, seams
 * and wheels (`CarSpec`, `CARS`) and the paints the traffic picks from, so
 * the drawing (cars.ts), what's inside (carinside.ts), the driving and the
 * tests all read the same numbers.
 *
 * Car space: +x the front, y up, z across with +z the car's right; the
 * origin on the ground under the middle.
 */
import type { CarId } from './mycar';
export type { CarId };
type V2 = [number, number];

export interface CarSpec {
  id: CarId;
  /** What the garage calls it (made-up names, never a real make) */
  name: string;
  /** Length, width (tiles) */
  L: number;
  W: number;
  /** Wheel radius and tyre width */
  r: number;
  tw: number;
  /** Rear and front axle (x) */
  axles: V2;
  /** Height of the body's underside */
  clr: number;
  /** Top line of the lower body, front to rear (the front and rear faces drop from its ends) */
  top: V2[];
  /** The cabin's side outline: rear base, rear roof, front roof, front base */
  cabin: [V2, V2, V2, V2];
  /** Cabin width, as a share of W */
  cabinW: number;
  /** Side windows: x ranges along the cabin (each one a pane), and the lowest a pane goes */
  panes: V2[];
  sill?: number;
  /** Rear window (vans and buses have none: a blank back) */
  rearGlass?: boolean;
  /** Height of the lights, and their shape */
  lightY: number;
  lamp?: 'round' | 'wide' | 'slim';
  /** Door seams (x) and handles (x) along the body's sides */
  seams?: number[];
  handles?: number[];
  /** Rim colour (chrome unless set) and spokes */
  rim?: string;
  spokes?: number;
  /** Exhaust pipes at the back: their z offsets */
  exhaust?: number[];
}

/** Paint colours that suit each model (the traffic picks from these) */
export const PAINTS: Record<CarId, string[]> = {
  hatch: ['#e23b3b', '#ffd23f', '#00c2ff', '#1fbf6b', '#f3f2f7', '#ff8a3d'],
  sedan: ['#f3f2f7', '#2b2a40', '#8000ff', '#00c2ff', '#e23b3b', '#9a96b8'],
  coupe: ['#e219e5', '#e23b3b', '#ffd23f', '#00eaff', '#14121f'],
  pickup: ['#ff8a3d', '#1f6b4a', '#e23b3b', '#f3f2f7', '#2a3b66'],
  van: ['#f3f2f7', '#f3f2f7', '#ffd23f', '#00c2ff', '#9a96b8'],
  bus: ['#e219e5', '#2aabee'],
  muscle: ['#e23b3b', '#14121f', '#ff8a3d', '#8000ff'],
  suv: ['#2a3b66', '#1f6b4a', '#14121f', '#f3f2f7'],
  super: ['#00eaff', '#e219e5', '#ffd23f', '#f3f2f7'],
  exec: ['#14121f', '#14121f', '#1c1d2e'],
  classic: ['#7fd6c2', '#e23b3b', '#f3f2f7', '#ff6ad5'],
  offroad: ['#5b6b3a', '#ff8a3d', '#f3f2f7', '#2a3b66'],
  ev: ['#f3f2f7', '#00c2ff', '#8000ff', '#1fbf6b'],
};

/* ---------- Models ---------- */

export const CARS: Record<CarId, CarSpec> = {
  hatch: {
    id: 'hatch',
    name: 'City Hatch',
    L: 2.2,
    W: 0.98,
    r: 0.19,
    tw: 0.2,
    axles: [-0.68, 0.7],
    clr: 0.1,
    top: [
      [1.1, 0.44],
      [1.0, 0.53],
      [0.5, 0.57],
      [-1.02, 0.6],
      [-1.1, 0.5],
    ],
    cabin: [
      [-1.03, 0.57],
      [-0.9, 0.93],
      [0.12, 0.95],
      [0.55, 0.56],
    ],
    cabinW: 0.86,
    panes: [
      [-0.95, -0.36],
      [-0.3, 0.5],
    ],
    rearGlass: true,
    lightY: 0.44,
    lamp: 'round',
    seams: [-0.3, 0.52],
    handles: [-0.18],
    exhaust: [0.28],
  },
  sedan: {
    id: 'sedan',
    name: 'Cruiser',
    L: 2.6,
    W: 1.0,
    r: 0.2,
    tw: 0.2,
    axles: [-0.82, 0.86],
    clr: 0.1,
    top: [
      [1.3, 0.42],
      [1.2, 0.52],
      [0.55, 0.56],
      [-0.85, 0.58],
      [-1.25, 0.56],
      [-1.3, 0.46],
    ],
    cabin: [
      [-0.9, 0.57],
      [-0.46, 0.89],
      [0.2, 0.89],
      [0.6, 0.55],
    ],
    cabinW: 0.86,
    panes: [
      [-0.85, -0.15],
      [-0.09, 0.55],
    ],
    rearGlass: true,
    lightY: 0.43,
    lamp: 'wide',
    seams: [-0.92, -0.12, 0.6],
    handles: [-0.8, 0.0],
    exhaust: [0.26, -0.26],
  },
  coupe: {
    id: 'coupe',
    name: 'Street GT',
    L: 2.5,
    W: 1.04,
    r: 0.21,
    tw: 0.24,
    axles: [-0.8, 0.84],
    clr: 0.07,
    top: [
      [1.25, 0.34],
      [1.13, 0.48],
      [0.4, 0.52],
      [-1.0, 0.54],
      [-1.25, 0.5],
    ],
    cabin: [
      [-1.0, 0.53],
      [-0.42, 0.79],
      [0.0, 0.79],
      [0.42, 0.51],
    ],
    cabinW: 0.82,
    panes: [[-0.85, 0.36]],
    rearGlass: true,
    lightY: 0.35,
    lamp: 'slim',
    seams: [-0.5, 0.44],
    handles: [-0.4],
    rim: '#ffd23f',
    spokes: 6,
    exhaust: [0.3, 0.2, -0.2, -0.3],
  },
  pickup: {
    id: 'pickup',
    name: 'Hauler',
    L: 2.95,
    W: 1.06,
    r: 0.26,
    tw: 0.24,
    axles: [-0.95, 0.95],
    clr: 0.18,
    top: [
      [1.475, 0.62],
      [1.4, 0.71],
      [0.62, 0.75],
      [-1.475, 0.75],
    ],
    cabin: [
      [-0.24, 0.74],
      [-0.2, 1.13],
      [0.3, 1.13],
      [0.66, 0.74],
    ],
    cabinW: 0.92,
    panes: [[-0.16, 0.58]],
    rearGlass: true,
    lightY: 0.62,
    lamp: 'wide',
    seams: [-0.22, 0.64],
    handles: [-0.1],
    rim: '#3a3550',
    spokes: 6,
    exhaust: [-0.3],
  },
  van: {
    id: 'van',
    name: 'Box Van',
    L: 2.75,
    W: 1.06,
    r: 0.23,
    tw: 0.22,
    axles: [-0.9, 0.92],
    clr: 0.14,
    top: [
      [1.375, 0.5],
      [1.3, 0.6],
      [1.02, 0.66],
      [-1.375, 0.66],
    ],
    cabin: [
      [-1.375, 0.65],
      [-1.375, 1.27],
      [0.6, 1.27],
      [1.04, 0.65],
    ],
    cabinW: 0.98,
    panes: [[0.24, 0.84]],
    sill: 0.78,
    lightY: 0.5,
    lamp: 'wide',
    seams: [0.2, 0.98],
    handles: [0.32, -0.88],
    exhaust: [-0.32],
  },
  bus: {
    id: 'bus',
    name: 'City Bus',
    L: 5.6,
    W: 1.38,
    r: 0.3,
    tw: 0.26,
    axles: [-1.75, 1.8],
    clr: 0.16,
    top: [
      [2.8, 0.72],
      [-2.8, 0.72],
    ],
    cabin: [
      [-2.8, 0.71],
      [-2.78, 1.66],
      [2.72, 1.66],
      [2.8, 0.71],
    ],
    cabinW: 0.99,
    panes: [
      [-2.6, -1.85],
      [-1.75, -1.0],
      [-0.9, -0.15],
      [-0.05, 0.7],
      [0.8, 1.55],
      [1.65, 2.6],
    ],
    sill: 0.92,
    lightY: 0.5,
    lamp: 'wide',
    rim: '#f3f2f7',
    spokes: 0,
    exhaust: [-0.5],
  },
  muscle: {
    id: 'muscle',
    name: 'Street Thunder',
    L: 2.75,
    W: 1.08,
    r: 0.22,
    tw: 0.28,
    axles: [-0.92, 0.9],
    clr: 0.09,
    top: [
      [1.375, 0.42],
      [1.26, 0.54],
      [0.45, 0.58],
      [-0.7, 0.62],
      [-1.3, 0.62],
      [-1.375, 0.52],
    ],
    // A fastback: the roof runs down in one long slope to the tail
    cabin: [
      [-1.28, 0.61],
      [-0.5, 0.88],
      [0.0, 0.89],
      [0.45, 0.57],
    ],
    cabinW: 0.84,
    panes: [
      [-1.0, -0.35],
      [-0.27, 0.36],
    ],
    rearGlass: true,
    lightY: 0.4,
    lamp: 'slim',
    seams: [-0.4, 0.46],
    handles: [-0.28],
    rim: '#3a3550',
    spokes: 5,
    exhaust: [0.3, -0.3],
  },
  suv: {
    id: 'suv',
    name: 'Big Rover',
    L: 2.8,
    W: 1.12,
    r: 0.28,
    tw: 0.27,
    axles: [-0.92, 0.92],
    clr: 0.24,
    top: [
      [1.4, 0.66],
      [1.33, 0.8],
      [0.9, 0.84],
      [-1.4, 0.84],
    ],
    cabin: [
      [-1.38, 0.83],
      [-1.34, 1.32],
      [0.5, 1.32],
      [0.92, 0.83],
    ],
    cabinW: 0.95,
    panes: [
      [-1.28, -0.5],
      [-0.42, 0.22],
      [0.3, 0.82],
    ],
    rearGlass: true,
    lightY: 0.58,
    lamp: 'round',
    seams: [-0.46, 0.26, 0.98],
    handles: [-0.34, 0.38],
    rim: '#3a3550',
    spokes: 6,
    exhaust: [-0.34],
  },
  super: {
    id: 'super',
    name: 'Hyper Comet',
    L: 2.65,
    W: 1.14,
    r: 0.2,
    tw: 0.28,
    axles: [-0.85, 0.88],
    clr: 0.08,
    // A wedge: the nose low, the deck high over the engine
    top: [
      [1.325, 0.34],
      [1.1, 0.45],
      [0.2, 0.5],
      [-0.85, 0.53],
      [-1.325, 0.47],
    ],
    cabin: [
      [-0.95, 0.52],
      [-0.42, 0.75],
      [0.02, 0.75],
      [0.55, 0.48],
    ],
    cabinW: 0.8,
    panes: [[-0.8, 0.42]],
    rearGlass: true,
    lightY: 0.27,
    lamp: 'slim',
    seams: [-0.6, 0.5],
    rim: '#ffd23f',
    spokes: 6,
    exhaust: [0.34, 0.24, -0.24, -0.34],
  },
  // Uptown's (finance plan Phase 4): a long black executive saloon, traffic only (never in the garage)
  exec: {
    id: 'exec',
    name: 'Midnight Exec',
    L: 3.0,
    W: 1.06,
    r: 0.2,
    tw: 0.2,
    axles: [-0.98, 1.0],
    clr: 0.1,
    top: [
      [1.5, 0.42],
      [1.4, 0.53],
      [0.72, 0.57],
      [-1.0, 0.59],
      [-1.45, 0.57],
      [-1.5, 0.46],
    ],
    cabin: [
      [-1.05, 0.58],
      [-0.62, 0.9],
      [0.32, 0.9],
      [0.74, 0.56],
    ],
    cabinW: 0.86,
    panes: [
      [-1.0, -0.45],
      [-0.38, 0.12],
      [0.18, 0.68],
    ],
    rearGlass: true,
    lightY: 0.44,
    lamp: 'slim',
    seams: [-1.06, -0.42, 0.15, 0.74],
    handles: [-0.92, -0.3, 0.3],
    exhaust: [0.3, -0.3],
  },
  // Vehicle plan Phase 6: three more (docs/vehicle-plan.md "Decided": the names)
  // An old-school saloon: a long bonnet and boot, a rounded cabin in the middle, tail fins (cars.ts EXTRAS), chrome hubcaps
  classic: {
    id: 'classic',
    name: 'Boulevardier',
    L: 2.8,
    W: 1.04,
    r: 0.21,
    tw: 0.2,
    axles: [-0.9, 0.92],
    clr: 0.12,
    top: [
      [1.4, 0.46],
      [1.3, 0.56],
      [0.62, 0.6],
      [-0.8, 0.6],
      [-1.3, 0.6],
      [-1.4, 0.5],
    ],
    cabin: [
      [-0.84, 0.59],
      [-0.5, 0.94],
      [0.26, 0.94],
      [0.66, 0.59],
    ],
    cabinW: 0.84,
    panes: [
      [-0.76, -0.1],
      [-0.04, 0.5],
    ],
    rearGlass: true,
    lightY: 0.46,
    lamp: 'round',
    seams: [-0.86, -0.08, 0.66],
    handles: [-0.74, 0.04],
    spokes: 0,
    exhaust: [0.3],
  },
  // Lifted and boxy: big tyres, a short bonnet, an upright windscreen (roof lights, a snorkel, a bull bar: EXTRAS)
  offroad: {
    id: 'offroad',
    name: 'Mud Buster',
    L: 2.6,
    W: 1.12,
    r: 0.31,
    tw: 0.32,
    axles: [-0.86, 0.86],
    clr: 0.3,
    top: [
      [1.3, 0.74],
      [1.25, 0.88],
      [0.8, 0.92],
      [-1.3, 0.92],
    ],
    cabin: [
      [-1.14, 0.91],
      [-1.1, 1.4],
      [0.4, 1.4],
      [0.8, 0.91],
    ],
    cabinW: 0.94,
    panes: [
      [-1.04, -0.5],
      [-0.42, 0.18],
      [0.26, 0.7],
    ],
    rearGlass: true,
    lightY: 0.78,
    lamp: 'round',
    seams: [-0.46, 0.2, 0.86],
    handles: [-0.34, 0.32],
    rim: '#2b2a3a',
    spokes: 8,
    exhaust: [-0.36],
  },
  // Smooth and rounded, one long sweep of glass: closed grille, light bars nose and tail, aero discs, no exhaust
  ev: {
    id: 'ev',
    name: 'Glow Pod',
    L: 2.25,
    W: 1.0,
    r: 0.2,
    tw: 0.21,
    axles: [-0.74, 0.76],
    clr: 0.1,
    top: [
      [1.125, 0.44],
      [1.04, 0.53],
      [0.62, 0.58],
      [-1.02, 0.6],
      [-1.125, 0.5],
    ],
    cabin: [
      [-1.04, 0.59],
      [-0.86, 0.95],
      [0.02, 0.97],
      [0.66, 0.57],
    ],
    cabinW: 0.88,
    panes: [
      [-0.96, -0.36],
      [-0.3, 0.56],
    ],
    rearGlass: true,
    lightY: 0.4,
    lamp: 'slim',
    seams: [-0.32, 0.56],
    handles: [-0.2],
    rim: '#dfe3f0',
    spokes: 0,
  },
};
