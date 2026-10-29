/**
 * Crestmont's streets (docs/crestmont-plan.md Phase 2, the owner's call: a north-east town in the style of
 * Beverly Hills). DOM-free: the street plan (streetplan.ts `cityPlan()`), the ground (terrain.ts: the hill roads'
 * beds cut into the hills), traffic, walking, the world map and the drawing (crestmont3d.ts) read it.
 *
 * - **The Flats**, east of the ring highway's east side between the north bank avenue and the hills' foot: a grid of
 *   streets north from the bank avenue (`FLATS_X`) across downtown's east-west roads (carried on past the highway,
 *   traffic on them now), up to **Foothill Road** (`FOOTHILL_Z`) along the hills' foot. The middle one is **Crestmont
 *   Boulevard**, a planted median down it (`BOULEVARD_MEDIAN`, palms in Phase 3); west of it **Coral Drive**, the
 *   shopping street (Phase 4). Their blocks (`CREST_BLOCKS`) are lots with a sidewalk round, flat (the hills begin
 *   north of Foothill Road).
 * - **The hill roads** (`HILL_ROADS`): smooth winding lines (`curve()`) up the hills, graded (`grade()`: their
 *   heights follow the hills, smoothed, never steeper than `MAX_GRADE`, meeting each other level where they join):
 *   **Ridge Road** up from Hollis Way's top round the hills' east side and along the crest to the overlook, and
 *   **Canyon Drive** up from Coral Drive's top to meet it (traffic goes up one and down the other), and the cul-de-sacs
 *   off it, **Summit Lane** and **Vista Lane** (no traffic: they go nowhere, nor does Ridge Road past Canyon Drive). terrain.ts cuts each into the hills as a level
 *   bed (`BED`), its banks eased into the slope.
 * - **Lamps** (`CREST_LAMPS`): along both sidewalks of the Flats' streets, and along one side of the hill roads at
 *   their beds' height.
 *
 * Names are made up. Written in fixed world numbers (north of the river: no `SOUTH_SHIFT` / `WIDEN`).
 */
import { EW_ROADS, LANE, WALK_W } from './layout';
import { HILLS, natural } from './hills';

type Pt = [number, number];
export type Rect = [number, number, number, number];

/** The Flats' streets north from the bank avenue, west to east (x) */
export const FLATS_X = [300, 330, 362, 394, 426] as const;
/** Their names (made up): the third is the boulevard, the second the shopping street */
export const FLATS_NAMES = ['Alder Way', 'Coral Drive', 'Crestmont Boulevard', 'Linden Way', 'Hollis Way'] as const;
/** Which of them is the boulevard, and which Coral Drive */
export const BOULEVARD = 2;
export const CORAL = 1;
/** The boulevard's planted median (wide enough for palms), its one lane each way either side */
export const BOULEVARD_MEDIAN = 2.4;
/** Foothill Road along the hills' foot (z), from the first of the Flats' streets to the last */
export const FOOTHILL_Z = -62;
/** The north bank avenue, where the Flats' streets start */
const BANK = EW_ROADS[3];
/** The east edge of the Flats' last row of blocks (inside the world's edge, where you can walk) */
export const FLATS_EAST = 452;

/** Half the asphalt of each of the Flats' streets */
export const flatsHalf = (i: number) => (i === BOULEVARD ? LANE + BOULEVARD_MEDIAN / 2 : LANE);

/* ---------- The hill roads ---------- */

/** No hill road climbs steeper than this (rise over run: 14%) */
export const MAX_GRADE = 0.14;
/** Each hill road's bed: level across `half` + `shoulder`, its banks eased into the hills over `ease` */
export const BED = { shoulder: 1, ease: 12 } as const;
/** How far along the hills' heights are averaged before the grade is set (the road smooths the bumps) */
const SMOOTH = 24;

/** A smooth line through control points (Catmull-Rom), a point every `step` or so along it */
export function curve(ctrl: Pt[], step = 1.5): Pt[] {
  const out: Pt[] = [ctrl[0]];
  for (let i = 0; i + 1 < ctrl.length; i++) {
    const [p0, p1, p2, p3] = [ctrl[Math.max(0, i - 1)], ctrl[i], ctrl[i + 1], ctrl[Math.min(ctrl.length - 1, i + 2)]];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const [t2, t3] = [t * t, t * t * t];
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

/** Distances along a line, point by point */
export function cumOf(pts: Pt[]) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return cum;
}

/**
 * A road's heights point by point: the hills' own along it, averaged over `SMOOTH`, pinned where it must meet the
 * ground or another road (`pins`: point index to height, eased in over `PIN_EASE` either side), and never
 * steeper than `MAX_GRADE` between points (pulled level from the pins outwards)
 */
const PIN_EASE = 40;
export function grade(pts: Pt[], pins: Map<number, number>) {
  const cum = cumOf(pts);
  const raw = pts.map(([x, z]) => natural(x, z));
  const y = raw.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let j = 0; j < raw.length; j++)
      if (Math.abs(cum[j] - cum[i]) <= SMOOTH / 2) {
        sum += raw[j];
        n++;
      }
    return sum / n;
  });
  // The pins, eased in so the road doesn't step to them
  const base = [...y];
  for (const [k, v] of pins) {
    const d = v - base[k];
    for (let i = 0; i < y.length; i++) {
      const f = 1 - Math.min(1, Math.abs(cum[i] - cum[k]) / PIN_EASE);
      y[i] += d * f * f * (3 - 2 * f);
    }
  }
  for (const [k, v] of pins) y[k] = v;
  // The grade: a few passes each way, the pins held
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 1; i < y.length; i++) {
      if (pins.has(i)) continue;
      const g = MAX_GRADE * (cum[i] - cum[i - 1]);
      y[i] = Math.min(y[i - 1] + g, Math.max(y[i - 1] - g, y[i]));
    }
    for (let i = y.length - 2; i >= 0; i--) {
      if (pins.has(i)) continue;
      const g = MAX_GRADE * (cum[i + 1] - cum[i]);
      y[i] = Math.min(y[i + 1] + g, Math.max(y[i + 1] - g, y[i]));
    }
  }
  // (never under the Flats' level: easing to a pin at 0 can dip a little past it)
  return { cum, y: y.map((v) => Math.max(0, v)) };
}

export interface HillRoad {
  id: string;
  name: string;
  /** Its centre line, a point every 1.5 or so */
  pts: Pt[];
  /** Distance along it at each point */
  cum: number[];
  /** Its bed's height at each point */
  y: number[];
  half: number;
  /** A road that goes nowhere (a cul-de-sac, the overlook): no traffic */
  deadEnd?: boolean;
}

/** The nearest point of a line to `p`, by index */
const nearestIndex = (pts: Pt[], p: Pt) => {
  let best = 0;
  for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1]) < Math.hypot(pts[best][0] - p[0], pts[best][1] - p[1])) best = i;
  return best;
};

const CANYON_FOOT: Pt = [FLATS_X[CORAL], FOOTHILL_Z];
const RIDGE_FOOT: Pt = [FLATS_X[4], FOOTHILL_Z];

function hillRoads(): HillRoad[] {
  // Ridge Road up from Hollis Way's top round the hills' east side to the crest, along it past Canyon Drive's top, to the overlook
  const ridge = curve([
    RIDGE_FOOT,
    [432, -80],
    [447, -89],
    [452, -106],
    [450, -122],
    [440, -130],
    [428, -150],
    [414, -172],
    [404, -200],
    [392, -228],
    [384, -256],
    [389, -282],
    [391, -305],
    [399, -330],
    [396, -354],
    [386, -374],
  ]);
  // (level with the Flats until it's past the hills' foot)
  const flat = (pts: Pt[]) => new Map(pts.map((p, i): [number, number] => [i, 0]).filter(([i]) => pts[i][1] > HILLS.foot.z - 2));
  ridge[0] = RIDGE_FOOT;
  const ridgeY = grade(ridge, flat(ridge));
  const out: HillRoad[] = [{ id: 'crest-ridge', name: 'Ridge Road', pts: ridge, ...ridgeY, half: LANE }];
  /** A road from `foot` (on the Flats, at 0) up to the ridge at the point nearest `top` */
  const up = (id: string, name: string, ctrl: Pt[], top: Pt) => {
    const j = nearestIndex(ridge, top);
    const pts = curve([...ctrl, ridge[j]]);
    pts[pts.length - 1] = ridge[j];
    const pins = flat(pts);
    pins.set(pts.length - 1, ridgeY.y[j]);
    out.push({ id, name, pts, ...grade(pts, pins), half: LANE });
  };
  up(
    'crest-canyon',
    'Canyon Drive',
    [CANYON_FOOT, [331, -82], [338, -108], [350, -132], [341, -158], [331, -180], [342, -206], [354, -230], [368, -254]],
    [384, -256]
  );
  /** A cul-de-sac off the ridge from its point nearest `from` */
  const spur = (id: string, name: string, from: Pt, ctrl: Pt[]) => {
    const j = nearestIndex(ridge, from);
    const pts = curve([ridge[j], ...ctrl]);
    pts[0] = ridge[j];
    out.push({ id, name, pts, ...grade(pts, new Map([[0, ridgeY.y[j]]])), half: LANE, deadEnd: true });
  };
  spur('crest-summit', 'Summit Lane', [390, -300], [[374, -305], [360, -303]]);
  spur('crest-vista', 'Vista Lane', [399, -330], [[413, -328], [423, -334]]);
  return out;
}
export const HILL_ROADS: HillRoad[] = hillRoads();

/** A hill road's height (its bed) at a distance along it */
export function roadY(r: HillRoad, d: number) {
  if (d <= 0) return r.y[0];
  let i = 1;
  while (i < r.cum.length - 1 && r.cum[i] < d) i++;
  const f = Math.min(1, (d - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1] || 1));
  return r.y[i - 1] + (r.y[i] - r.y[i - 1]) * f;
}

/** The box round each hill road (a quick test first) */
const ROAD_BOXES = HILL_ROADS.map((r): Rect => [Math.min(...r.pts.map((p) => p[0])), Math.min(...r.pts.map((p) => p[1])), Math.max(...r.pts.map((p) => p[0])), Math.max(...r.pts.map((p) => p[1]))]);
/** Whether a point is on a hill road or within `m` of its asphalt (the outskirts' trees keep off) */
export function nearHillRoad(x: number, z: number, m = 0) {
  return HILL_ROADS.some((r, k) => {
    const b = ROAD_BOXES[k];
    const reach = r.half + m;
    if (x < b[0] - reach || x > b[2] + reach || z < b[1] - reach || z > b[3] + reach) return false;
    for (let i = 1; i < r.pts.length; i++) {
      const [a, c] = [r.pts[i - 1], r.pts[i]];
      const [vx, vz] = [c[0] - a[0], c[1] - a[1]];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1)));
      if (Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t) < reach) return true;
    }
    return false;
  });
}

/* ---------- The street plan's share ---------- */

export interface CrestStreet {
  id: string;
  name: string;
  pts: Pt[];
  half: number;
  median?: number;
}
export interface CrestCrossing {
  id: string;
  at: Pt;
  streets: string[];
  lights: boolean;
}

export const FLATS_STREETS: CrestStreet[] = [
  ...FLATS_X.map((x, i): CrestStreet => ({
    id: `crest-ns${i}`,
    name: FLATS_NAMES[i],
    pts: [
      [x, BANK.c],
      [x, FOOTHILL_Z],
    ],
    half: flatsHalf(i),
    ...(i === BOULEVARD ? { median: BOULEVARD_MEDIAN } : {}),
  })),
  {
    id: 'crest-foothill',
    name: 'Foothill Road',
    pts: [
      [FLATS_X[0], FOOTHILL_Z],
      [FLATS_X[FLATS_X.length - 1], FOOTHILL_Z],
    ],
    half: LANE,
  },
];
/** Every street Crestmont adds to the plan */
export const CREST_STREETS: CrestStreet[] = [...FLATS_STREETS, ...HILL_ROADS.map((r) => ({ id: r.id, name: r.name, pts: r.pts, half: r.half }))];

export const CREST_CROSSINGS: CrestCrossing[] = (() => {
  const out: CrestCrossing[] = [];
  // Each of the Flats' streets across downtown's east-west roads carried on past the highway (lit at the avenues)
  FLATS_X.forEach((x, i) => {
    for (const [j, r] of EW_ROADS.entries()) {
      if (r.c > BANK.c) continue;
      out.push({ id: `crest-ns${i}-ew${j}`, at: [x, r.c], streets: [`crest-ns${i}`, `ew${j}`], lights: r.lanes === 2 });
    }
    // ...and at Foothill Road (its ends at the first and the last; the hill roads go up from Coral Drive's top and Hollis Way's)
    const streets = [`crest-ns${i}`, 'crest-foothill'];
    if (i === CORAL) streets.push('crest-canyon');
    if (i === FLATS_X.length - 1) streets.push('crest-ridge');
    out.push({ id: `crest-ns${i}-foot`, at: [x, FOOTHILL_Z], streets, lights: false });
  });
  // Canyon Drive's top on Ridge Road (the cul-de-sacs leave it with no crossing: a crossing there would let the
  // traffic into Ridge Road past Canyon Drive, a stretch that goes nowhere but back)
  const ridge = HILL_ROADS[0];
  const canyon = HILL_ROADS.find((r) => r.id === 'crest-canyon')!;
  const top = canyon.pts[canyon.pts.length - 1];
  if (!ridge.pts.some((p) => p[0] === top[0] && p[1] === top[1])) throw new Error("Canyon Drive doesn't meet Ridge Road");
  out.push({ id: 'crest-canyon-ridge', at: top, streets: ['crest-ridge', 'crest-canyon'], lights: false });
  return out;
})();

/** The Flats' blocks: lots inside their sidewalks, between the streets (the last row out to `FLATS_EAST`) */
export const CREST_BLOCKS: { id: string; rect: Rect }[] = (() => {
  const rows = [FOOTHILL_Z, ...EW_ROADS.filter((r) => r.c <= BANK.c).map((r) => r.c)];
  const halfZ = (z: number) => (z === FOOTHILL_Z ? LANE : EW_ROADS.find((r) => r.c === z)!.half);
  const cols: [number, number, number, number][] = FLATS_X.map((x, i) => [x, flatsHalf(i), FLATS_X[i + 1] ?? FLATS_EAST, i + 1 < FLATS_X.length ? flatsHalf(i + 1) : -WALK_W]);
  const out: { id: string; rect: Rect }[] = [];
  cols.forEach(([xa, ha, xb, hb], i) =>
    rows.slice(0, -1).forEach((za, j) => {
      const zb = rows[j + 1];
      out.push({ id: `crest-${i}-${j}`, rect: [xa + ha + WALK_W, za + halfZ(za) + WALK_W, xb - hb - WALK_W, zb - halfZ(zb) - WALK_W] });
    })
  );
  return out;
})();

/** Where Crestmont's streets and blocks are (the outskirts' trees keep off; the drawing's land) */
export const CREST_RECT: Rect = [FLATS_X[0] - 6, -380, FLATS_EAST + 2, BANK.c + BANK.half];

/* ---------- Lamps ---------- */

/** Lamps: x, z, the way the arm reaches, the ground's height */
export const CREST_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  // (the sidewalk's top: world.ts SLAB)
  const SLAB_Y = 0.15;
  // The Flats' streets: both sidewalks every 13, clear of the crossings
  const crossZ = [FOOTHILL_Z, ...EW_ROADS.filter((r) => r.c <= BANK.c).map((r) => r.c)];
  FLATS_X.forEach((x, i) => {
    const h = flatsHalf(i);
    for (let z = FOOTHILL_Z + 6; z < BANK.c - 5; z += 13) {
      if (crossZ.some((c) => Math.abs(c - z) < 6)) continue;
      out.push([x - h - 0.45, z, 0, SLAB_Y], [x + h + 0.45, z, Math.PI, SLAB_Y]);
    }
  });
  for (let x = FLATS_X[0] + 7; x < FLATS_X[FLATS_X.length - 1] - 5; x += 13) {
    if (FLATS_X.some((c) => Math.abs(c - x) < 6)) continue;
    out.push([x, FOOTHILL_Z + LANE + 0.45, -Math.PI / 2, SLAB_Y]);
  }
  // The hill roads: one side, every 16, on their beds (outside the bend's lip, clear of each other's ends)
  for (const r of HILL_ROADS)
    for (let d = 8; d < r.cum[r.cum.length - 1] - 6; d += 16) {
      let i = 1;
      while (i < r.cum.length - 1 && r.cum[i] < d) i++;
      const [a, b] = [r.pts[i - 1], r.pts[i]];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const u: Pt = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
      const f = (d - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1] || 1);
      const p: Pt = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      // (right of travel is (-u.z, u.x))
      const [nx, nz] = [-u[1], u[0]];
      const x = p[0] + nx * (r.half + 0.45);
      const z = p[1] + nz * (r.half + 0.45);
      if (HILL_ROADS.some((o) => o !== r && o.pts.some((q) => Math.hypot(q[0] - x, q[1] - z) < o.half + 1.2))) continue;
      out.push([x, z, Math.atan2(nz, -nx), roadY(r, d) + 0.035]);
    }
  return out;
})();
