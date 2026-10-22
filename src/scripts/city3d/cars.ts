/*
 * The city's cars, at real proportions in Degen's cartoon style: chunky
 * extruded bodies with rounded edges, a painted cabin with blacked-out
 * window frames and glass, light clusters with bezels, grilles, door seams
 * and handles, fat tyres on spoked rims and black bumpers, so the ink
 * outlines pick out every panel. Each model has its own touches (the hatch's
 * roof spoiler, the Cruiser's chrome, the Street GT's stripes, scoop and
 * wing, the Hauler's flares and light bar, the van's ladder and stripe, the
 * bus's doors and roof pods), and so do the three the garage sells: the
 * Street Thunder muscle car (hood scoop, fastback, flared arches, a black
 * stripe), the Big Rover SUV (roof rails and light bar, bull bar, running
 * boards, a spare wheel on the back door) and the Hyper Comet supercar (a
 * wedge with a tall wing on end plates, side intakes, a splitter and four
 * exhausts).
 *
 * 1 tile is about 1.8 m (Degen is about one tile tall): a hatch is about
 * 4 m long, 1.8 m wide and 1.7 m tall, a bus about 10 m long and 3 m tall.
 * Lanes are 1.7 tiles wide (layout.ts).
 *
 * Models point along +x (the front), y up, z across; the origin is on the
 * ground under the middle of the car. Each model is two geometries: `paint`
 * (one colour, set per car) and `detail` (tyres, rims, glass, bumpers,
 * plates, in vertex colours), so a fleet costs two draw calls per model.
 * The bus's windows are a third (`glow`), lit at night. Head- and taillights
 * are spots (`head`, `tail`) for the caller's own light meshes.
 *
 * `wheels: false` leaves the tyres out of `detail` (for a car whose wheels
 * turn: build them from `wheelGeometry()` at `wheelSpots()`).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fx, toon } from './kit';
import { addLodSwitch } from './lod';

export type CarId = 'hatch' | 'sedan' | 'coupe' | 'pickup' | 'van' | 'bus' | 'muscle' | 'suv' | 'super';
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
  /** Extras drawn per model */
  extra?: (p: Parts, s: CarSpec) => void;
}

/* ---------- Colours ---------- */

const TYRE = '#17151f';
const RIM = '#c9c4e6';
const TRIM = '#2a2838';
const GLASS = '#5cc8e8';
const PLATE = '#f3f2f7';
const CHROME = '#dcdaf0';
const SEAM = '#1b1830';
const HEAD = '#fff4c2';
const TAIL = '#e8233a';
const AMBER = '#ffad33';
const BLACKOUT = '#1d1b2b';

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
    extra(p, s) {
      // Roof spoiler over the hatch, a rear wiper, roof bars
      p.paint(box(0.16, 0.04, s.W * 0.8, -0.96, 0.95, 0));
      p.detail(box(0.02, 0.02, 0.18, -0.985, 0.72, 0.05), TRIM);
      for (const z of [-1, 1]) p.detail(box(0.75, 0.03, 0.03, -0.4, 0.98, z * s.W * 0.3), TRIM);
    },
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
    extra(p, s) {
      // Chrome along the window line and the boot lid, a roof aerial, a boot lip
      for (const z of [-1, 1]) p.detail(box(1.38, 0.022, 0.012, -0.15, 0.58, z * (s.W * 0.43 + 0.006)), CHROME);
      p.detail(box(0.02, 0.03, s.W * 0.5, -1.31, 0.5, 0), CHROME);
      p.paint(box(0.12, 0.03, s.W * 0.86, -1.22, 0.59, 0));
      p.detail(box(0.012, 0.22, 0.012, -0.42, 0.98, 0.15), TRIM);
    },
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
    extra(p, s) {
      // Rear wing on two posts, with end plates
      p.paint(box(0.22, 0.035, s.W * 0.9, -1.1, 0.68, 0));
      for (const z of [-1, 1]) p.detail(box(0.24, 0.1, 0.02, -1.1, 0.66, z * s.W * 0.45), TRIM);
      for (const z of [-0.3, 0.3]) p.detail(box(0.05, 0.15, 0.04, -1.08, 0.59, z), TRIM);
      // Side intakes behind the doors, a bonnet scoop, a front splitter and a rear diffuser
      for (const z of [-1, 1]) p.detail(box(0.3, 0.09, 0.02, -0.68, 0.36, z * (s.W / 2 + 0.006)), BLACKOUT);
      p.paint(box(0.3, 0.06, 0.26, 0.72, 0.52, 0));
      p.detail(box(0.02, 0.04, 0.2, 0.88, 0.53, 0), BLACKOUT);
      p.detail(box(0.12, 0.025, s.W * 0.96, 1.22, 0.085, 0), BLACKOUT);
      for (const z of [-0.3, -0.1, 0.1, 0.3]) p.detail(box(0.18, 0.06, 0.015, -1.18, 0.13, z * s.W * 0.9), BLACKOUT);
      // Twin racing stripes, nose to tail over the cabin
      for (const z of [-0.09, 0.09]) stripe(p, s, z, 0.09, PLATE);
    },
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
    extra(p, s) {
      // The open bed: a dark liner inside raised rails, a toolbox across the front of it
      p.detail(box(1.12, 0.012, s.W - 0.16, -0.86, 0.752, 0), '#3a3550');
      for (const z of [-1, 1]) p.paint(box(1.18, 0.07, 0.07, -0.86, 0.785, z * (s.W / 2 - 0.035)));
      p.paint(box(0.07, 0.07, s.W, -1.44, 0.785, 0));
      p.detail(box(0.22, 0.16, s.W - 0.12, -0.42, 0.83, 0), CHROME);
      for (const z of [-0.2, 0.2]) p.detail(box(0.04, 0.02, 0.1, -0.31, 0.9, z), TRIM);
      // Push bar on the nose, fender flares over every wheel, mud flaps, a light bar on the cab
      p.detail(box(0.08, 0.22, s.W * 0.74, 1.52, 0.42, 0), TRIM);
      for (const x of [-0.18, 0.18]) p.detail(box(0.06, 0.3, 0.05, 1.5, 0.52, x * s.W), TRIM);
      for (const ax of s.axles) for (const z of [-1, 1]) p.detail(flare(s, ax, z), TRIM);
      for (const z of [-1, 1]) p.detail(box(0.02, 0.2, 0.2, s.axles[0] - s.r - 0.08, 0.16, z * (s.W / 2 - 0.1)), TRIM);
      p.detail(box(0.08, 0.06, s.W * 0.7, 0.05, 1.17, 0), TRIM);
      for (const z of [-0.27, -0.09, 0.09, 0.27]) p.detail(box(0.02, 0.045, 0.1, 0.1, 1.17, z * s.W), HEAD);
    },
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
    extra(p, s) {
      // Sliding-door rail and its seams, a roof rack with a ladder, a cargo stripe, rear doors
      for (const z of [-1, 1]) {
        const zz = z * (s.W * 0.49 + 0.012);
        p.detail(box(1.1, 0.025, 0.02, -0.45, 1.02, zz), TRIM);
        for (const x of [-1.0, 0.1]) p.detail(box(0.012, 0.6, 0.012, x, 0.7, zz), SEAM);
        p.detail(box(1.45, 0.09, 0.012, -0.575, 0.86, z * (s.W * 0.49 + 0.016)), '#ff2fb9');
        p.detail(box(1.45, 0.04, 0.012, -0.575, 0.78, z * (s.W * 0.49 + 0.016)), '#00c2ff');
      }
      for (const x of [-1.0, -0.4, 0.2]) p.detail(box(0.05, 0.05, s.W * 0.9, x, 1.3, 0), TRIM);
      for (const z of [-1, 1]) p.detail(box(1.3, 0.04, 0.04, -0.4, 1.33, z * s.W * 0.42), TRIM);
      // The ladder on the rack
      for (const z of [-0.12, 0.12]) p.detail(box(1.2, 0.025, 0.025, -0.4, 1.37, z), CHROME);
      for (let k = 0; k < 6; k++) p.detail(box(0.02, 0.02, 0.24, -0.95 + k * 0.22, 1.37, 0), CHROME);
      // Rear: a split in the doors, two handles, a step
      p.detail(box(0.012, 0.55, 0.012, -s.L / 2 - 0.006, 0.95, 0), SEAM);
      for (const z of [-0.06, 0.06]) p.detail(box(0.03, 0.03, 0.08, -s.L / 2 - 0.015, 0.95, z), CHROME);
      p.detail(box(0.16, 0.05, s.W * 0.5, -s.L / 2 - 0.05, 0.16, 0), TRIM);
    },
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
    extra(p, s) {
      // Destination sign over the windscreen, stripes along the sides
      p.glow(box(0.02, 0.14, s.W * 0.6, s.L / 2 + 0.012, 1.5, 0));
      for (const z of [-1, 1]) {
        p.detail(box(s.L - 0.4, 0.06, 0.012, 0, 0.8, z * (s.W * 0.495 + 0.008)), '#f3f2f7');
        p.detail(box(s.L - 0.4, 0.03, 0.012, 0, 0.74, z * (s.W * 0.495 + 0.008)), '#ffd23f');
      }
      // Two doors on the kerb side (+z): glass panels in dark frames
      for (const x of [2.2, -0.2]) {
        p.detail(box(0.62, 1.0, 0.014, x, 0.68, s.W / 2 + 0.01), BLACKOUT);
        for (const dx of [-0.15, 0.15]) p.detail(box(0.25, 0.85, 0.012, x + dx, 0.7, s.W / 2 + 0.018), GLASS);
      }
      // Roof pods (air conditioning), a ladder at the back, mirrors on long arms
      for (const x of [-1.3, 0.9]) {
        p.paint(box(0.9, 0.14, s.W * 0.6, x, 1.73, 0));
        p.detail(box(0.6, 0.02, s.W * 0.4, x, 1.81, 0), TRIM);
      }
      for (const z of [-1, 1]) {
        p.detail(box(0.25, 0.03, 0.03, s.L / 2 + 0.1, 1.45, z * (s.W / 2 - 0.02)), TRIM);
        p.detail(box(0.05, 0.22, 0.08, s.L / 2 + 0.22, 1.32, z * (s.W / 2 + 0.02)), TRIM);
      }
    },
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
    extra(p, s) {
      // A hood scoop on the long bonnet, with a dark mouth facing forward
      p.paint(box(0.36, 0.075, 0.3, 0.92, topAt(s, 0.92) + 0.02, 0));
      p.detail(box(0.02, 0.05, 0.24, 1.105, topAt(s, 0.92) + 0.025, 0), BLACKOUT);
      // Flared arches over the fat tyres, a lip on the boot, a wide black stripe nose to tail
      for (const ax of s.axles) for (const z of [-1, 1]) p.detail(flare(s, ax, z), TRIM);
      p.paint(box(0.1, 0.05, s.W * 0.8, -1.32, 0.64, 0));
      stripe(p, s, 0, 0.2, BLACKOUT);
      // Side pipes' heat shields under the doors
      for (const z of [-1, 1]) p.detail(box(0.9, 0.05, 0.05, -0.05, s.clr + 0.03, z * (s.W / 2 + 0.03)), CHROME);
    },
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
    extra(p, s) {
      const half = s.L / 2;
      // Roof rails on short feet, and a light bar across the front of the roof
      for (const z of [-1, 1]) {
        const zz = z * s.W * 0.33;
        p.detail(box(1.5, 0.035, 0.035, -0.45, 1.365, zz), TRIM);
        for (const x of [-1.1, 0.2]) p.detail(box(0.06, 0.04, 0.045, x, 1.335, zz), TRIM);
      }
      p.detail(box(0.08, 0.07, s.W * 0.72, 0.42, 1.36, 0), TRIM);
      for (let k = -2; k <= 2; k++) p.detail(box(0.02, 0.045, 0.1, 0.465, 1.36, k * 0.16), HEAD);
      // A bull bar on the nose: two uprights, two rails, mounts to the bumper
      for (const z of [-0.27, 0.27]) {
        p.detail(box(0.05, 0.42, 0.05, half + 0.12, 0.5, z), TRIM);
        p.detail(box(0.1, 0.04, 0.04, half + 0.06, 0.34, z), TRIM);
      }
      for (const y of [0.4, 0.66]) p.detail(box(0.05, 0.05, s.W * 0.74, half + 0.12, y, 0), TRIM);
      // Running boards, mud flaps behind the back wheels
      for (const z of [-1, 1]) {
        p.detail(box(1.1, 0.04, 0.1, 0, s.clr - 0.03, z * (s.W / 2 + 0.03)), TRIM);
        p.detail(box(0.02, 0.2, 0.2, s.axles[0] - s.r - 0.08, 0.2, z * (s.W / 2 - 0.1)), TRIM);
      }
      // The spare wheel on the back door, on a bracket, its rim facing out
      p.detail(box(0.06, 0.3, 0.1, -half - 0.03, 0.95, -0.22), TRIM);
      p.details.push(
        wheelGeometry(s)
          .rotateY(-Math.PI / 2)
          .translate(-half - s.tw / 2 - 0.03, 0.98, -0.22)
      );
    },
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
    extra(p, s) {
      const half = s.L / 2;
      // A tall rear wing on two posts, with end plates
      p.paint(box(0.26, 0.035, s.W * 0.98, -1.12, 0.8, 0));
      for (const z of [-1, 1]) p.detail(box(0.3, 0.14, 0.02, -1.12, 0.78, z * s.W * 0.49), TRIM);
      for (const z of [-0.28, 0.28]) p.detail(box(0.05, 0.32, 0.04, -1.1, 0.63, z), TRIM);
      // Louvres over the engine, side intakes behind the doors, scoops on the haunches
      for (const x of [-0.78, -0.86, -0.94, -1.02]) p.detail(box(0.03, 0.012, 0.5, x, topAt(s, x) + 0.006, 0), BLACKOUT);
      for (const z of [-1, 1]) {
        p.detail(box(0.34, 0.14, 0.03, -0.72, 0.34, z * (s.W / 2 + 0.01)), BLACKOUT);
        p.paint(box(0.3, 0.05, 0.14, -0.6, topAt(s, -0.6) + 0.01, z * 0.42));
        p.detail(box(0.02, 0.035, 0.1, -0.44, topAt(s, -0.6) + 0.015, z * 0.42), BLACKOUT);
      }
      // A front splitter wider than the nose, canards, a rear diffuser
      p.detail(box(0.16, 0.025, s.W + 0.08, half + 0.04, s.clr + 0.02, 0), BLACKOUT);
      for (const z of [-1, 1]) p.detail(box(0.12, 0.015, 0.1, half - 0.05, 0.22, z * (s.W / 2 + 0.04)), BLACKOUT);
      for (const z of [-0.3, -0.1, 0.1, 0.3]) p.detail(box(0.2, 0.08, 0.015, -half, 0.13, z * s.W * 0.9), BLACKOUT);
    },
  },
};

/* ---------- Building ---------- */

function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}

/**
 * An outline in the side view (x, y), pushed out `depth` across the car, centred. `round`
 * rounds its long edges off (the outline stays the same size seen from the side).
 */
function extrude(shape: THREE.Shape, depth: number, round = 0) {
  const core = depth - round * 2;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: core,
    bevelEnabled: round > 0,
    bevelThickness: round,
    bevelSize: round,
    bevelOffset: -round,
    bevelSegments: 1,
    curveSegments: 8,
  });
  return g.translate(0, 0, -core / 2);
}
/** The height of the lower body's top line at x */
function topAt(s: CarSpec, x: number) {
  const t = s.top;
  if (x >= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    const [x0, y0] = t[i - 1];
    const [x1, y1] = t[i];
    if (x <= x0 && x >= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  }
  return t[t.length - 1][1];
}
/** A thin plate lying along a side-view polyline (on top of the body and cabin), at z across, `w` wide */
function lay(p: Parts, pts: V2[], z: number, w: number, color: string, lift = 0.006) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 0.02) continue;
    p.detail(new THREE.BoxGeometry(len + 0.01, 0.012, w).rotateZ(Math.atan2(by - ay, bx - ax)).translate((ax + bx) / 2, (ay + by) / 2 + lift, z), color);
  }
}
/** A racing stripe from the nose over the cabin to the tail */
function stripe(p: Parts, s: CarSpec, z: number, w: number, color: string) {
  const [rb, rr, fr, fb] = s.cabin;
  const nose = s.top.filter(([x]) => x > fb[0]);
  const tail = s.top.filter(([x]) => x < rb[0]);
  lay(p, [...nose, fb, fr, rr, rb, ...tail], z, w, color);
}
/** A fender flare: a dark band round a wheel arch, on one side */
function flare(s: CarSpec, ax: number, side: number) {
  const a = s.r + 0.04;
  const sh = new THREE.Shape();
  sh.absarc(ax, s.r, a + 0.07, Math.PI, 0, true);
  sh.lineTo(ax + a, s.r);
  sh.absarc(ax, s.r, a, 0, Math.PI, false);
  sh.lineTo(ax - a - 0.07, s.r);
  return new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, side > 0 ? s.W / 2 - 0.03 : -s.W / 2 - 0.03);
}

/** The lower body: its top line, then underneath with an arch over each wheel */
function bodyShape(s: CarSpec) {
  const half = s.L / 2;
  const sh = new THREE.Shape();
  sh.moveTo(half, s.clr);
  for (const [x, y] of s.top) sh.lineTo(x, y);
  sh.lineTo(-half, s.clr);
  const arch = s.r + 0.04;
  for (const ax of s.axles) {
    sh.lineTo(ax - arch, s.clr);
    sh.lineTo(ax - arch, s.r);
    sh.absarc(ax, s.r, arch, Math.PI, 0, true);
    sh.lineTo(ax + arch, s.clr);
  }
  sh.lineTo(half, s.clr);
  return sh;
}

/** Shrink a convex outline by d (offset every edge inwards, meet at the corners) */
function inset(poly: V2[], d: number): V2[] {
  const n = poly.length;
  // Winding sign, so "inwards" is the same side for every edge
  let area = 0;
  for (let i = 0; i < n; i++) area += poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1];
  const sgn = area > 0 ? 1 : -1;
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * sgn;
    const ny = (dx / len) * sgn;
    return { p: [a[0] + nx * d, a[1] + ny * d] as V2, v: [dx, dy] as V2 };
  });
  return lines.map((l, i) => {
    const m = lines[(i + n - 1) % n];
    // Where line m meets line l
    const den = m.v[0] * l.v[1] - m.v[1] * l.v[0];
    if (Math.abs(den) < 1e-9) return l.p;
    const t = ((l.p[0] - m.p[0]) * l.v[1] - (l.p[1] - m.p[1]) * l.v[0]) / den;
    return [m.p[0] + m.v[0] * t, m.p[1] + m.v[1] * t] as V2;
  });
}

/** Keep the part of an outline where f(point) >= 0 (f linear) */
function clip(poly: V2[], f: (p: V2) => number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const fa = f(a);
    const fb = f(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/** A thin pane along a side-view segment a-b (glass on a sloped face), pushed `lift` out from the cabin */
function pane(a: V2, b: V2, width: number, centre: V2, ends: number, lift = 0.012) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  let nx = -dy / len;
  let ny = dx / len;
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  if ((mx - centre[0]) * nx + (my - centre[1]) * ny < 0) [nx, ny] = [-nx, -ny];
  return new THREE.BoxGeometry(len - ends * 2, 0.014, width)
    .rotateZ(Math.atan2(dy, dx))
    .translate(mx + nx * lift, my + ny * lift, 0);
}

export class Parts {
  readonly paints: THREE.BufferGeometry[] = [];
  readonly details: THREE.BufferGeometry[] = [];
  readonly glows: THREE.BufferGeometry[] = [];
  paint(g: THREE.BufferGeometry) {
    this.paints.push(g);
  }
  detail(g: THREE.BufferGeometry, color: string) {
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.details.push(g);
  }
  glow(g: THREE.BufferGeometry) {
    this.glows.push(g);
  }
}

/** Same attributes everywhere (position, normal, uv, and colour where asked), indexed, so they merge */
function merge(geos: THREE.BufferGeometry[], color: boolean) {
  if (!geos.length) return null;
  const clean = geos.map((g0) => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', ...(color ? ['color'] : [])].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  });
  return mergeGeometries(clean, false);
}

/** Wheel centres: x, y, z (left then right, rear then front) */
export function wheelSpots(s: CarSpec): [number, number, number][] {
  const z = s.W / 2 - s.tw / 2 + 0.02;
  return s.axles.flatMap((x) => [
    [x, s.r, z],
    [x, s.r, -z],
  ]);
}

/** One wheel (tyre and rim), axle along z, centred; the rim faces +z */
export function wheelGeometry(s: CarSpec) {
  const p = new Parts();
  const r = s.r;
  const h = s.tw / 2;
  // The tyre: a rounded shoulder and a deep sidewall, turned round its axle
  const prof: THREE.Vector2[] = [
    [r * 0.62, -h],
    [r * 0.86, -h],
    [r * 0.97, -h * 0.8],
    [r, -h * 0.45],
    [r, h * 0.45],
    [r * 0.97, h * 0.8],
    [r * 0.86, h],
    [r * 0.62, h],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  p.detail(new THREE.LatheGeometry(prof, 14).rotateX(Math.PI / 2), TYRE);
  // The rim: a lip, a dished face, spokes and a hub with a cap
  const rim = s.rim ?? RIM;
  p.detail(new THREE.CylinderGeometry(r * 0.64, r * 0.64, 0.012, 14, 1, true).rotateX(Math.PI / 2).translate(0, 0, h - 0.004), rim);
  p.detail(new THREE.CircleGeometry(r * 0.6, 14).translate(0, 0, h - 0.015), s.spokes === 0 ? rim : TRIM);
  const n = s.spokes ?? 5;
  for (let k = 0; k < n; k++)
    p.detail(
      new THREE.BoxGeometry(r * 0.5, r * 0.13, 0.016)
        .translate(r * 0.3, 0, 0)
        .rotateZ((k / n) * Math.PI * 2)
        .translate(0, 0, h - 0.008),
      rim
    );
  p.detail(new THREE.CylinderGeometry(r * 0.2, r * 0.2, 0.03, 8).rotateX(Math.PI / 2).translate(0, 0, h), rim);
  p.detail(new THREE.CylinderGeometry(r * 0.09, r * 0.09, 0.03, 6).rotateX(Math.PI / 2).translate(0, 0, h + 0.012), TRIM);
  return merge(p.details, true)!;
}

export interface CarGeometry {
  spec: CarSpec;
  paint: THREE.BufferGeometry;
  detail: THREE.BufferGeometry;
  /** Lit windows (the bus), or null */
  glow: THREE.BufferGeometry | null;
  /** Head- and taillight spots (on the front / rear faces) */
  head: [number, number, number][];
  tail: [number, number, number][];
}

const cache = new Map<string, CarGeometry>();

export function carGeometry(id: CarId, { wheels = true } = {}): CarGeometry {
  const key = `${id}:${wheels}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = CARS[id];
  const p = new Parts();
  const half = s.L / 2;
  const cw = s.W * s.cabinW;
  const lit = s.id === 'bus';
  const addGlass = (g: THREE.BufferGeometry) => (lit ? p.glow(g) : p.detail(g, GLASS));

  // Body and cabin, their long edges rounded off
  const bus = s.id === 'bus';
  p.paint(extrude(bodyShape(s), s.W, bus ? 0.05 : 0.04));
  const cabinRound = bus ? 0.05 : 0.055;
  p.paint(extrude(new THREE.Shape(s.cabin.map(([x, y]) => new THREE.Vector2(x, y))), cw, cabinRound));

  // Glass: the side panes on a blacked-out frame (dark pillars between them), the windscreen and
  // the rear window, each on a slightly bigger dark surround
  const [rb, rr, fr, fb] = s.cabin;
  const sideFace = (poly: V2[], z: number, out: number, color: string | null) => {
    if (poly.length < 3) return;
    const g = extrude(new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y))), 0.012).translate(0, 0, z * (cw / 2 + out));
    if (color) p.detail(g, color);
    else addGlass(g);
  };
  const frame = inset(s.cabin, cabinRound + 0.012);
  const inner = inset(s.cabin, cabinRound + 0.035);
  const x0s = Math.min(...s.panes.map(([a]) => a)) - 0.03;
  const x1s = Math.max(...s.panes.map(([, b]) => b)) + 0.03;
  let band = clip(clip(frame, ([x]) => x - x0s), ([x]) => x1s - x);
  if (s.sill !== undefined) band = clip(band, ([, y]) => y - (s.sill! - 0.03));
  for (const side of [-1, 1]) sideFace(band, side, 0.006, BLACKOUT);
  for (const [x0, x1] of s.panes) {
    let poly = clip(inner, ([x]) => x - x0);
    poly = clip(poly, ([x]) => x1 - x);
    if (s.sill !== undefined) poly = clip(poly, ([, y]) => y - s.sill!);
    for (const side of [-1, 1]) sideFace(poly, side, 0.014, null);
  }
  const mid: V2 = [(rb[0] + fb[0] + rr[0] + fr[0]) / 4, (rb[1] + fb[1] + rr[1] + fr[1]) / 4];
  const screenFrom: V2 = s.sill !== undefined && lit ? [fb[0] + (fr[0] - fb[0]) * 0.15, fb[1] + (fr[1] - fb[1]) * 0.15] : fb;
  p.detail(pane(fr, screenFrom, cw - cabinRound * 2 + 0.02, mid, 0.03), BLACKOUT);
  // The glass sits a little proud of its surround: level with it, the two flicker against each other
  addGlass(pane(fr, screenFrom, cw - cabinRound * 2 - 0.06, mid, 0.07, 0.02));
  if (s.rearGlass) {
    p.detail(pane(rb, rr, cw - cabinRound * 2 + 0.02, mid, 0.03), BLACKOUT);
    addGlass(pane(rb, rr, cw - cabinRound * 2 - 0.06, mid, 0.07, 0.02));
  }

  // Bumpers (with a lower lip), plates, the grille with chrome slats
  const bumperY = s.clr + 0.08;
  for (const end of [-1, 1]) {
    p.detail(box(0.1, 0.14, s.W + 0.02, end * (half + 0.01), bumperY, 0), TRIM);
    // The lip set back a touch from the bumper's face (flush, they flicker)
    p.detail(box(0.06, 0.03, s.W * 0.9, end * (half + 0.025), bumperY - 0.08, 0), BLACKOUT);
    p.detail(box(0.02, 0.08, 0.26, end * (half + 0.065), bumperY + 0.01, 0), PLATE);
    p.detail(box(0.022, 0.012, 0.2, end * (half + 0.066), bumperY + 0.02, 0), SEAM);
  }
  const noseTop = s.top[0][1];
  const grilleH = Math.max(0.06, noseTop - bumperY - 0.12);
  const grilleY = (noseTop + bumperY + 0.07) / 2 - 0.01;
  const grilleW = s.W * (bus ? 0.5 : 0.42);
  p.detail(box(0.02, grilleH, grilleW, half + 0.008, grilleY, 0), BLACKOUT);
  for (let k = 0; k < 3; k++) p.detail(box(0.025, 0.012, grilleW - 0.04, half + 0.012, grilleY - grilleH / 2 + (grilleH * (k + 1)) / 4, 0), CHROME);
  p.detail(box(0.03, grilleH + 0.03, 0.02, half + 0.01, grilleY, grilleW / 2), CHROME);
  p.detail(box(0.03, grilleH + 0.03, 0.02, half + 0.01, grilleY, -grilleW / 2), CHROME);

  // Lights: a bezel and a lens at each corner, front and back, with indicators beside them
  const lz = s.W / 2 - Math.min(0.17, s.W * 0.16);
  const lamp = s.lamp ?? 'wide';
  const lh = lamp === 'slim' ? 0.055 : 0.1;
  const lw = lamp === 'slim' ? 0.24 : 0.2;
  for (const z of [lz, -lz]) {
    if (lamp === 'round') {
      p.detail(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 14).rotateZ(Math.PI / 2).translate(half + 0.004, s.lightY, z), TRIM);
      p.detail(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 14).rotateZ(Math.PI / 2).translate(half + 0.008, s.lightY, z), HEAD);
    } else {
      p.detail(box(0.02, lh + 0.03, lw + 0.03, half + 0.003, s.lightY, z), TRIM);
      p.detail(box(0.02, lh, lw, half + 0.007, s.lightY, z), HEAD);
    }
    p.detail(box(0.02, 0.035, 0.06, half + 0.006, s.lightY - lh / 2 - 0.04, z + Math.sign(z) * 0.06), AMBER);
    p.detail(box(0.02, lh + 0.04, lw + 0.03, -half - 0.003, s.lightY, z), TRIM);
    p.detail(box(0.02, lh + 0.01, lw, -half - 0.007, s.lightY, z), TAIL);
    p.detail(box(0.02, 0.03, lw * 0.4, -half - 0.009, s.lightY + 0.01, z - Math.sign(z) * lw * 0.25), AMBER);
  }

  // Door seams and handles down the sides, a dark sill between the wheels
  for (const side of [-1, 1]) {
    const z = side * (s.W / 2 + 0.002);
    for (const x of s.seams ?? []) {
      const top = topAt(s, x) - 0.03;
      const bottom = s.clr + 0.04;
      if (top - bottom > 0.05) p.detail(box(0.012, top - bottom, 0.012, x, (top + bottom) / 2, z), SEAM);
    }
    for (const x of s.handles ?? []) p.detail(box(0.08, 0.022, 0.016, x, topAt(s, x) - 0.08, z + side * 0.004), CHROME);
    const [ra, fa] = s.axles;
    const span = fa - ra - (s.r + 0.08) * 2;
    if (span > 0.1 && !bus) p.detail(box(span, 0.05, 0.02, (ra + fa) / 2, s.clr + 0.025, side * (s.W / 2 + 0.004)), BLACKOUT);
  }
  // Exhausts under the back
  for (const z of s.exhaust ?? []) p.detail(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 10).rotateZ(Math.PI / 2).translate(-half - 0.02, s.clr + 0.02, z * s.W), CHROME);
  // Wing mirrors on short arms
  for (const side of [-1, 1]) {
    if (bus) continue;
    p.detail(box(0.05, 0.02, 0.06, fb[0] - 0.06, fb[1] + 0.06, side * (cw / 2 + 0.03)), TRIM);
    p.paint(box(0.08, 0.07, 0.1, fb[0] - 0.08, fb[1] + 0.09, side * (cw / 2 + 0.08)));
    p.detail(box(0.012, 0.05, 0.075, fb[0] - 0.122, fb[1] + 0.09, side * (cw / 2 + 0.08)), GLASS);
  }

  // Wheels
  if (wheels) {
    const w = wheelGeometry(s);
    for (const [x, y, z] of wheelSpots(s)) {
      const g = w.clone();
      if (z < 0) g.rotateY(Math.PI);
      p.details.push(g.translate(x, y, z));
    }
  }
  s.extra?.(p, s);

  const out: CarGeometry = {
    spec: s,
    paint: merge(p.paints, false)!,
    detail: merge(p.details, true)!,
    glow: merge(p.glows, false),
    head: [
      [half + 0.005, s.lightY, lz],
      [half + 0.005, s.lightY, -lz],
    ],
    tail: [
      [-half - 0.005, s.lightY, lz],
      [-half - 0.005, s.lightY, -lz],
    ],
  };
  cache.set(key, out);
  return out;
}

/** The materials the fleet shares: paint takes each car's own colour, detail its vertex colours */
let mats: { paint: THREE.Material; detail: THREE.Material } | null = null;
export function carMaterials() {
  mats ??= {
    paint: toon('#ffffff', { name: 'car' }),
    detail: toon('#ffffff', { vertexColors: true, name: 'car-detail' }),
  };
  return mats;
}

/* ---------- Far away (growth plan Phase 2) ---------- */

const farCache = new Map<CarId, THREE.BufferGeometry>();
let farMat: THREE.MeshToonMaterial | null = null;
/**
 * A car seen from far away: its own body and cabin outlines extruded flat
 * and four block wheels, about a hundred triangles (the model is a couple of
 * thousand). White where the paint goes (each car's colour comes from its
 * instance), a dark cabin and tyres. Built like the models: facing +x, the
 * origin on the ground under its middle.
 */
export function farCarGeometry(id: CarId) {
  const hit = farCache.get(id);
  if (hit) return hit;
  const s = CARS[id];
  const half = s.L / 2;
  const body = new THREE.Shape();
  body.moveTo(half, s.clr);
  for (const [x, y] of s.top) body.lineTo(x, y);
  body.lineTo(-half, s.clr);
  const flat = (shape: THREE.Shape, depth: number) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
  const paint = (g: THREE.BufferGeometry, hex: string) => {
    const c = new THREE.Color(hex);
    const n = g.attributes.position.count;
    g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => (i % 3 === 0 ? c.r : i % 3 === 1 ? c.g : c.b)), 3));
    return g.index ? g.toNonIndexed() : g;
  };
  const parts = [paint(flat(body, s.W), '#ffffff'), paint(flat(new THREE.Shape(s.cabin.map(([x, y]) => new THREE.Vector2(x, y))), s.W * s.cabinW), s.id === 'bus' ? '#ffffff' : '#46506e')];
  for (const ax of s.axles) for (const side of [-1, 1]) parts.push(paint(new THREE.BoxGeometry(s.r * 2, s.r * 2, s.tw).translate(ax, s.r, side * (s.W / 2 - s.tw / 2 + 0.02)), TYRE));
  for (const g of parts) g.deleteAttribute('uv');
  const g = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  farCache.set(id, g);
  return g;
}
/** The far cars' material: toon, coloured per vertex and per car */
export function farCarMaterial() {
  return (farMat ??= toon('#ffffff', { vertexColors: true, name: 'car-far' }));
}

/**
 * Every car far from the camera, parked or driving, in one BatchedMesh: one
 * draw call for all of them (three.js culls each car against the view and
 * the shadow box). Each car takes an instance of its model's far form, in
 * its own paint, shown while it's far away.
 */
export interface FarCars {
  add(model: CarId, paint: THREE.ColorRepresentation, at?: THREE.Matrix4): number;
  place(id: number, at: THREE.Matrix4): void;
  show(id: number, on: boolean): void;
}
let farCars: FarCars | null = null;
/** Make the far cars' mesh (index.ts, before anything adds a car) */
export function initFarCars(scene: THREE.Scene, max = 400) {
  const models = Object.keys(CARS) as CarId[];
  const geos = models.map(farCarGeometry);
  const bm = new THREE.BatchedMesh(max, geos.reduce((n, g) => n + g.attributes.position.count, 0), 0, farCarMaterial());
  const ids = new Map(models.map((m, i) => [m, bm.addGeometry(geos[i])]));
  bm.sortObjects = false;
  bm.perObjectFrustumCulled = true;
  // (its cars move all over the map: culled one by one, never as a whole)
  bm.frustumCulled = false;
  bm.castShadow = true;
  bm.receiveShadow = true;
  bm.name = 'far-cars';
  scene.add(bm);
  const c = new THREE.Color();
  farCars = {
    add(model, paint, at) {
      const id = bm.addInstance(ids.get(model)!);
      bm.setColorAt(id, c.set(paint));
      if (at) bm.setMatrixAt(id, at);
      bm.setVisibleAt(id, false);
      return id;
    },
    place: (id, at) => void bm.setMatrixAt(id, at),
    show: (id, on) => void bm.setVisibleAt(id, on),
  };
  return farCars;
}
/** The far cars' mesh (`initFarCars()` made it) */
export const theFarCars = () => farCars!;

/**
 * Parked cars (static, instanced: two draw calls a model near the camera,
 * one far away: `farCarGeometry()`, swapped by the camera's distance from
 * the whole lot, `addLod()` in lod.ts). Each is [model, x, z, turn, colour];
 * x, z on the ground at `y`.
 */
export function parkedCars(parent: THREE.Object3D, y: number, list: [CarId, number, number, number, string][]) {
  const { paint, detail } = carMaterials();
  const M = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const near: THREE.Object3D[] = [];
  const far: number[] = [];
  const fleet = theFarCars();
  parent.updateMatrixWorld(true);
  for (const id of new Set(list.map((c) => c[0]))) {
    const cars = list.filter((c) => c[0] === id);
    const g = carGeometry(id);
    const meshes = [new THREE.InstancedMesh(g.paint, paint, cars.length), new THREE.InstancedMesh(g.detail, detail, cars.length)];
    cars.forEach(([, x, z, ry, color], i) => {
      M.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), one);
      for (const m of meshes) m.setMatrixAt(i, M);
      meshes[0].setColorAt(i, new THREE.Color(color));
      far.push(fleet.add(id, color, M.clone().premultiply(parent.matrixWorld)));
    });
    for (const m of meshes) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.computeBoundingSphere();
      parent.add(m);
    }
    near.push(...meshes);
  }
  // The whole lot swaps at once (world numbers)
  const box = new THREE.Box3();
  for (const [, x, z] of list) box.expandByPoint(new THREE.Vector3(x, y, z));
  box.expandByScalar(3).applyMatrix4(parent.matrixWorld);
  addLodSwitch((on) => {
    for (const o of near) o.visible = on;
    for (const id of far) fleet.show(id, !on);
  }, box);
}

/**
 * One car of your own (the garage's turntable, and the car you'll drive):
 * its own paint, wheels that can turn and steer, and lights. Built facing +x
 * with the origin on the ground under its middle, like the models.
 */
export function createCar(id: CarId, paint: string) {
  const g = carGeometry(id, { wheels: false });
  const s = g.spec;
  const { detail } = carMaterials();
  const group = new THREE.Group();
  const paintMat = toon(paint);
  const body = new THREE.Mesh(g.paint, paintMat);
  const trim = new THREE.Mesh(g.detail, detail);
  const wheelGeo = wheelGeometry(s);
  const wheels = wheelSpots(s).map(([x, y, z]) => {
    // A pivot per wheel: it steers (y) and rolls (z); the rim faces out
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const w = new THREE.Mesh(wheelGeo, detail);
    if (z < 0) w.rotation.y = Math.PI;
    pivot.add(w);
    group.add(pivot);
    return { pivot, mesh: w, front: x > 0 };
  });
  group.add(body, trim);
  for (const m of [body, trim, ...wheels.map((w) => w.mesh)]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  // A touch deeper than the lamps they light up (level with them, the two flicker)
  const lightGeo = new THREE.BoxGeometry(0.04, 0.08, 0.17);
  const headMat = new THREE.MeshBasicMaterial({ color: '#fff6c8' });
  const tailMat = new THREE.MeshBasicMaterial({ color: '#ff2b2b' });
  for (const [list, mat] of [
    [g.head, headMat],
    [g.tail, tailMat],
  ] as const)
    for (const [x, y, z] of list) {
      const l = new THREE.Mesh(lightGeo, mat);
      l.position.set(x, y, z);
      group.add(fx(l));
    }
  let roll = 0;
  return {
    group,
    spec: s,
    /** Roll the wheels by a distance travelled, and steer the front ones (radians) */
    drive(dist: number, steer = 0) {
      roll -= dist / s.r;
      for (const w of wheels) {
        w.mesh.rotation.z = w.mesh.rotation.y ? -roll : roll;
        w.pivot.rotation.y = w.front ? steer : 0;
      }
    },
    dispose() {
      group.removeFromParent();
      wheelGeo.dispose();
      lightGeo.dispose();
      headMat.dispose();
      tailMat.dispose();
    },
  };
}
export type Car = ReturnType<typeof createCar>;
