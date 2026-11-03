/*
 * The Neon Mile's landmarks (docs/strip-plan.md Phase 3; the owner's picks: the welcome sign, the fountain show, the
 * volcano, the giant LED sphere, searchlights). DOM-free: the boot reads the solids, the Sphere's place and the
 * volcano's rumble (sound.ts); the drawing is stripmarks3d.ts in the Strip's chunk. Every show is a function of the
 * clock (`Date.now()`), the same for everyone; under reduced motion each shows a still frame. Made-up names only.
 *
 * - **The welcome sign** (`WELCOME`): a diamond on two posts in the boulevard's median by its west end, both faces
 *   (WELCOME TO THE NEON MILE), a star on top, bulbs chasing round its edge.
 * - **The fountain show** (`JETS`, `SHOW`, `jetHeights()`): two rows of jets and five shooters in the Gondolier's lake,
 *   a show of six movements every `SHOW.period`, the lake still between.
 * - **The volcano** (`VOLCANO`, `ERUPT`, `eruptionAt()`, `volcanoRumble()`): on the islet in Lava Lagoon's lagoon,
 *   embers glowing in its crater, erupting on a timetable: the glow builds, flames burst from the crater and over
 *   the water round it, then die down.
 * - **The Sphere** (`SPHERE`): a ball of LED panels on its plinth on the south row's east lot, its entrance pavilion
 *   facing the boulevard; a place (spot `sphere`, shows coming soon); `SPHERE_SPAWN`. What it shows is the drawing's.
 * - **Searchlights** (`SEARCHLIGHTS`): on the resorts' roofs and the Sphere's plaza, sweeping the sky at night.
 * - `MARK_SOLIDS` (in `SOLIDS`), `MARKS_TALLEST`.
 */
import { STRIP_BLVD } from './layout';
import { BLVD_WEST } from './strip';
import { LAGOON, SLAB_Y, SPHERE_LOT, resortOf } from './resorts';

type Pt = [number, number];
type Box = [number, number, number, number, number];

/* ---------- The welcome sign ---------- */

/** In the median a little in from its west nose (between the first two palms), its faces up and down the boulevard */
export const WELCOME = {
  x: BLVD_WEST + 15.5,
  z: STRIP_BLVD.z,
  /** The diamond: across the median (z), tall, its bottom point over the posts */
  w: 3.4,
  h: 4.6,
  y0: 2.4,
  /** The posts (z either side of the middle), square */
  posts: [STRIP_BLVD.z - 0.9, STRIP_BLVD.z + 0.9],
  post: 0.16,
  /** The star over its top point */
  star: 0.75,
  thick: 0.3,
};
export const WELCOME_TOP = WELCOME.y0 + WELCOME.h + WELCOME.star * 2;

/* ---------- The fountain show ---------- */

const LAKE = resortOf('gondolier')!.water[0];
export type JetKind = 'row' | 'shooter';
export interface Jet {
  x: number;
  z: number;
  kind: JetKind;
  /** Front row 0, back row 1, the shooters 2 */
  row: 0 | 1 | 2;
  /** Along the lake, 0 at its west end, 1 at its east */
  p: number;
}
/** How high each kind reaches at its most (tiles over the water) */
export const JET_MAX: Record<JetKind, number> = { row: 4, shooter: 11 };
export const JET_GAP = 0.9;
export const JETS: Jet[] = (() => {
  const [x0, z0, x1, z1] = LAKE;
  const out: Jet[] = [];
  const along = (x: number) => (x - x0) / (x1 - x0);
  for (const [row, z, off] of [
    [0, z0 + 1.1, 0],
    [1, z1 - 1.1, JET_GAP / 2],
  ] as [0 | 1, number, number][])
    for (let x = x0 + 1.2 + off; x <= x1 - 1.2; x += JET_GAP) out.push({ x, z, kind: 'row', row, p: along(x) });
  const mid = (z0 + z1) / 2;
  for (let k = 0; k < 5; k++) {
    const x = x0 + 2.5 + (k * (x1 - x0 - 5)) / 4;
    out.push({ x, z: mid, kind: 'shooter', row: 2, p: along(x) });
  }
  return out;
})();
/** A show every `period` seconds, `length` long (six movements of `MOVE`), the lake still between */
export const SHOW = { period: 180, length: 54, move: 9 };
/** The moment shown under reduced motion (the crescendo) */
export const SHOW_STILL = 38;
/** Seconds into the show at the clock's t, or -1 between shows */
export function showAt(t: number): number {
  const s = ((t % SHOW.period) + SHOW.period) % SHOW.period;
  return s < SHOW.length ? s : -1;
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
/** Each jet's height (tiles) at second `s` of the show (0 outside it), into `out` */
export function jetHeights(s: number, out = new Float32Array(JETS.length)): Float32Array {
  if (s < 0 || s >= SHOW.length) return out.fill(0);
  // (in at the start, out at the end)
  const env = smooth(0, 3, s) * (1 - smooth(SHOW.length - 4, SHOW.length, s));
  const m = Math.min(5, Math.floor(s / SHOW.move));
  const u = s - m * SHOW.move;
  JETS.forEach((j, i) => {
    let h = 0;
    const shooter = j.kind === 'shooter';
    const k = JETS.filter((q) => q.kind === 'shooter').indexOf(j);
    switch (m) {
      // A wave running along the rows, the back row half a beat behind
      case 0:
        h = shooter ? 0 : 0.2 + 0.8 * Math.max(0, Math.sin(j.p * 9 - s * 3 - j.row * 1.4));
        break;
      // The rows taking turns, a gentle ripple along each
      case 1:
        h = shooter ? 0.25 : (0.5 + 0.5 * Math.sin(s * 2.4 + j.row * Math.PI)) * (0.75 + 0.25 * Math.sin(j.p * 12));
        break;
      // A sweep: the front row filling from the west, the back row from the east
      case 2: {
        const fill = u / (SHOW.move * 0.7);
        const p = j.row === 1 ? 1 - j.p : j.p;
        h = shooter ? 0.15 : p < fill ? 0.9 : 0.12;
        break;
      }
      // The shooters firing in turn over a low wave
      case 3:
        h = shooter ? (Math.floor(u * 1.6) % 5 === k ? 1 : 0.15) : 0.3 + 0.2 * Math.sin(j.p * 7 - s * 2);
        break;
      // The crescendo: everything climbing
      case 4:
        h = shooter ? 0.5 + 0.5 * smooth(0, SHOW.move, u) : 0.75 + 0.2 * Math.sin(s * 4 + j.p * 10);
        break;
      // The finale: everything at its height, then the fall
      default:
        h = shooter ? 1 : 0.95;
    }
    out[i] = clamp01(h) * env * JET_MAX[j.kind];
  });
  return out;
}

/* ---------- The volcano ---------- */

/** On the islet in the lagoon: its foot's radius, its crater's, its height over the slab */
export const VOLCANO = { at: LAGOON.islet.at as Pt, r0: 3.1, r1: 0.85, h: 4.4 };
/** An eruption every `period` seconds from `offset`, `length` long: the glow builds (`build`), it erupts until `fade`, then dies down */
export const ERUPT = { period: 150, offset: 60, length: 26, build: 4, fade: 18 };
/** The moment shown under reduced motion (mid-eruption) */
export const ERUPT_STILL = 10;
export interface Eruption {
  /** Seconds into the eruption (-1 between) */
  s: number;
  /** The crater's glow and the lava down its sides (0 cold embers, 1 white hot) */
  glow: number;
  /** The flames: from the crater and over the water round it */
  flames: number;
}
const EMBERS = 0.18;
export function eruptionAt(t: number): Eruption {
  const s = ((((t - ERUPT.offset) % ERUPT.period) + ERUPT.period) % ERUPT.period);
  if (s >= ERUPT.length) return { s: -1, glow: EMBERS, flames: 0 };
  const glow = EMBERS + (1 - EMBERS) * smooth(0, ERUPT.build, s) * (1 - smooth(ERUPT.fade, ERUPT.length, s));
  const flames = smooth(ERUPT.build - 0.5, ERUPT.build + 0.8, s) * (1 - smooth(ERUPT.fade - 2, ERUPT.length - 2, s));
  return { s, glow, flames };
}
/** How hard the volcano rumbles where you hear it from (0 to 1): its build and burst, fading over `RUMBLE_R` */
export const RUMBLE_R = 70;
export function volcanoRumble(x: number, z: number, t: number): number {
  const e = eruptionAt(t);
  if (e.s < 0) return 0;
  const d = Math.hypot(x - VOLCANO.at[0], z - VOLCANO.at[1]);
  return clamp01(1 - d / RUMBLE_R) * clamp01((e.glow - EMBERS) / (1 - EMBERS) + e.flames * 0.3);
}

/* ---------- The Sphere ---------- */

const [sx0, sz0, sx1, sz1] = SPHERE_LOT;
/** The ball: its middle (x, z), its radius and its middle's height over the slab; its plinth; the entrance pavilion */
export const SPHERE = (() => {
  const r = 9;
  const at: Pt = [(sx0 + sx1) / 2, sz1 - 0.6 - r];
  return {
    at,
    r,
    y: 10.2,
    plinth: { r: 5, h: 1.4 },
    /** The pavilion under its front, a glass box the doors are in */
    pavilion: [at[0] - 4, sz0 + 0.6, at[0] + 4, sz0 + 3] as [number, number, number, number],
    pavilionH: 3,
    /** Its plaza: the lot round it */
    plaza: SPHERE_LOT,
  };
})();
export const SPHERE_TOP = SPHERE.y + SPHERE.r;
/** The door in the pavilion's front, the spot you walk in at on the sidewalk facing it */
export const SPHERE_DOOR = { x: SPHERE.at[0], z: SPHERE.pavilion[1] - 0.35 };
export const SPHERE_SPAWN = { x: SPHERE.at[0], z: SPHERE.pavilion[1] - 2.4, yaw: Math.PI };

/* ---------- Searchlights ---------- */

/** Searchlights: where each stands (x, y over the slab, z) on a roof or the Sphere's plaza */
export const SEARCHLIGHTS: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  const top = (id: string, i: number, inset = 1) => {
    const p = resortOf(id)!.parts[i];
    const [x0, z0, x1, z1] = p.rect;
    const r = resortOf(id)!;
    const fz = r.face > 0 ? z1 - inset : z0 + inset;
    out.push([x0 + inset, p.y1, fz], [x1 - inset, p.y1, fz]);
  };
  top('wildace', 1, 0.8);
  top('dragonspire', 0, 1.2);
  top('bigcity', 0, 0.8);
  top('gondolier', 0, 1.2);
  top('lagoon', 0, 1.2);
  // The Sphere's plaza: either side of its pavilion
  out.push([SPHERE.pavilion[0] - 2.4, 0, SPHERE.pavilion[1] + 0.8], [SPHERE.pavilion[2] + 2.4, 0, SPHERE.pavilion[1] + 0.8]);
  return out;
})();
/** A searchlight's drum, standing on its spot */
export const DRUM = { r: 0.35, h: 0.5 };

/* ---------- Solids ---------- */

/** A disc as three crossing boxes */
const disc = (cx: number, cz: number, r: number, h: number): Box[] => [
  [cx - r * 0.92, cz - r * 0.38, cx + r * 0.92, cz + r * 0.38, h],
  [cx - r * 0.71, cz - r * 0.71, cx + r * 0.71, cz + r * 0.71, h],
  [cx - r * 0.38, cz - r * 0.92, cx + r * 0.38, cz + r * 0.92, h],
];
/** The welcome sign's posts: in the boulevard's median, not on a lot (the test holds them there) */
export const WELCOME_SOLIDS: Box[] = WELCOME.posts.map((z): Box => [WELCOME.x - WELCOME.post, z - WELCOME.post, WELCOME.x + WELCOME.post, z + WELCOME.post, SLAB_Y + WELCOME_TOP]);
export const MARK_SOLIDS: Box[] = [
  ...WELCOME_SOLIDS,
  // The Sphere (its whole width: the underside is low all round), its pavilion
  ...disc(SPHERE.at[0], SPHERE.at[1], SPHERE.r, SLAB_Y + SPHERE_TOP),
  [...SPHERE.pavilion, SLAB_Y + SPHERE.pavilionH] as Box,
  // The plaza's searchlights
  ...SEARCHLIGHTS.filter(([, y]) => y === 0).map(([x, , z]): Box => [x - DRUM.r, z - DRUM.r, x + DRUM.r, z + DRUM.r, SLAB_Y + DRUM.h + 0.4]),
];
export const MARKS_TALLEST = Math.max(SPHERE_TOP, WELCOME_TOP);
