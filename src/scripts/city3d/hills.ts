/**
 * The shape of Crestmont's hills before anything is cut into them (docs/crestmont-plan.md Phase 1): DOM-free.
 * terrain.ts is what everything reads (`heightAt()`, with the roads' beds and the levels cut in); crestmont.ts reads
 * this to grade its hill roads.
 *
 * The hills rise from the Flats, east of the ring highway's east side and north of z `HILLS.foot.z`, up to a ridge
 * (`HILLS.peak` high, a little more or less where the seeded swell says so: spurs and canyons), and fall away again
 * towards the world's north-east corner, so they end before the skyline ring. Written in fixed world numbers (north
 * of the river, so no `SOUTH_SHIFT` / `WIDEN`), never against the world's edge: the same hills at both sizes.
 */

/** A rectangle: x0, z0, x1, z1 */
export type Rect = [number, number, number, number];

export const HILLS = {
  /** The foot of the hills: they begin east of x and north of z (the ring highway's east side is x 275) */
  foot: { x: 285, z: -75 },
  /** How far in from the foot they take to rise to the ridge */
  rise: 110,
  /** The ridge's height before the swell (tiles: 26 is about 47 m; the swell takes it to about 32, 58 m) */
  peak: 26,
  /** Where they've fallen away to nothing beyond the ridge, towards the north-east corner (x, z) */
  end: { x: 490, z: -450 },
  /** How far before that end they start to fall */
  fall: 80,
  /** How round the corners are where the foot's two lines (and the end's) meet */
  round: 30,
} as const;

/** Where the ground can be anything but 0 (outside it heightAt() is 0) */
export const TERRAIN_RECT: Rect = [HILLS.foot.x, HILLS.end.z, HILLS.end.x, HILLS.foot.z];

export const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** A soft minimum: the corner where two lines meet rounded over `k` */
const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
};

/** The seeded swell over the ridge: spurs and canyons, about 0.62 to 1.24 (fixed waves, the same for everyone) */
const WAVES: [number, number, number, number][] = [
  // amplitude, direction (radians), wavelength (tiles), phase
  [0.17, 0.55, 150, 1.3],
  [0.12, 2.2, 95, 4.1],
  [0.07, 1.25, 58, 0.4],
  [0.04, 2.9, 34, 2.6],
];
export function swell(x: number, z: number) {
  let n = 0.93;
  for (const [a, dir, len, ph] of WAVES) n += a * Math.sin(((Math.cos(dir) * x + Math.sin(dir) * z) / len) * Math.PI * 2 + ph);
  return n;
}

/** The hills before anything is cut into them */
export function natural(x: number, z: number) {
  const into = smin(x - HILLS.foot.x, HILLS.foot.z - z, HILLS.round);
  if (into <= 0) return 0;
  const left = smin(HILLS.end.x - x, z - HILLS.end.z, HILLS.round);
  if (left <= 0) return 0;
  return HILLS.peak * smooth(0, HILLS.rise, into) * smooth(0, HILLS.fall, left) * swell(x, z);
}
