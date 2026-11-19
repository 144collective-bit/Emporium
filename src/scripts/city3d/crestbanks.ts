/**
 * The banks round the hills' mansions' pads (the owner's call, 2026-11: "the landscape needs adjusting around
 * buildings... improve the grounds around the houses"). DOM-free, in Crestmont's chunk only: drawn by mansions3d.ts in
 * each mansion's own site, tested in tests/crestbanks.test.ts. Nothing of it is solid, nor moves the ground: the pads
 * and their banks are terrain.ts's (`LEVELS`, eased over `PAD_EASE`); this dresses the banks.
 *
 * Each pad's bank is walked round in spokes (`Spoke`): out from the pad's edge, square to its sides and fanned round
 * its corners, as the ease runs. A spoke is **cut** where the hills rise past the pad, **fill** where they fall away,
 * **level** between, or nothing where the drive, the road and its shoulders, a landmark, a villa's terraces, a glass
 * mansion's cantilever or a garden path (crestcover.ts `GARDEN_PATHS`) come:
 *
 * - **Cut banks** are terraced: low dry-stone walls along the bank's contours (`TIERS`: the toe at the pad's edge, two
 *   more up the bank where there's ground to hold), each topped a little over the ground it holds back, its foot down
 *   in the ground below; soil beds between them planted by the house's kind (`KIND_PLANTS`).
 * - **Fill banks** keep the pad's balustrade (mansions3d.ts) and step down past it: a lower wall where the bank falls far
 *   enough (`FILL_TIER`), planted drifts and boulders down the slope.
 * - **Level ground** round a pad gets a planted border along its edge.
 *
 * Every height is the ground as drawn (terrain.ts `drawnAt()`: the hills' grass grid, world.ts `hillsPlane()`), so
 * nothing floats over the grass or sinks into it where the grid's flat triangles cut under the hills' curve.
 */
import { BED, nearHillRoad } from './crestmont';
import { drawnAt, heightAt } from './terrain';
import { MANSIONS, PAD_EASE, onMansion, outOf, originOf, rectToWorld, type Mansion, type MansionKind } from './mansions';
import { CIVIC, CLUB, FAIRWAY, FRINGE, HOLES, SITE_LEVELS, onSite } from './crestsites';
import { PLAN, distToStreet } from './streetplan';
import { WALK_W } from './layout';
import { onGardenPath } from './crestcover';
import { DRIVE_PIER, DRIVE_PIERS } from './crestland';
import { rng } from './recipes';

type Pt = [number, number];

/* ---------- The spokes round a pad ---------- */

export type SpokeKind = 'cut' | 'fill' | 'level' | 'none';
export interface Spoke {
  /** Where it leaves the pad's edge, and its way out */
  x: number;
  z: number;
  nx: number;
  nz: number;
  kind: SpokeKind;
  /** How far out it runs before something else's ground (a road's shoulder, a landmark) */
  reach: number;
}
/** How far apart the spokes are along a pad's sides, and how many fan round each corner */
export const SPOKE = { step: 1, fan: 5 } as const;
/** A spoke's kind is read this far out: the ground this much over or under the pad */
export const READ = { at: 3, by: 0.5 } as const;
/** Clear of a hill road's shoulder (and the joggers on it) by this */
const ROAD_GAP = BED.shoulder + 1;
/** A bank's walls and planting keep this far off a garden path (crestcover.ts) */
export const PATH_GAP = 0.6;
/** Clear of a mansion's drive's middle by this */
export const DRIVE_GAP = 2.4;

/** A point in a mansion's frame (u along its front, v out to the road): mansions.ts `toWorld()` turned back */
export function toFrame(m: Mansion, x: number, z: number): Pt {
  const [ox, oz] = outOf(m.face);
  const [cx, cz] = originOf(m);
  const [dx, dz] = [x - cx, z - cz];
  return [dx * oz - dz * ox, dx * ox + dz * oz];
}
const toDrive = (m: Mansion, x: number, z: number) => {
  const [a, b] = m.drive;
  const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
};
/** Taken behind the pad: a villa's terraces stepping down, a glass mansion's cantilever and its legs */
function behind(m: Mansion, x: number, z: number) {
  const [u, v] = toFrame(m, x, z);
  if (m.terraces.length) return v < -m.D + 0.1 && v > Math.min(...m.terraces.map((t) => t[1])) - 0.6 && Math.abs(u) < m.W / 2 - 0.4;
  if (m.reach) {
    const p = m.parts[0];
    return v < -m.D + 0.1 && v > -m.D - m.reach - 0.8 && u > p.u0 - 0.9 && u < p.u1 + 0.9;
  }
  return false;
}

/** A pad's spokes, in order round it (north side west to east, then clockwise) */
/** A level's ground a bank is laid round: a mansion's pad (`BANKS`) or a landmark's (`SITE_BANKS`) */
export interface Ground {
  id: string;
  rect: [number, number, number, number];
  y: number;
  /** Whose planting it takes */
  kind: MansionKind;
  /** Where a spoke stops short (what else's ground begins) */
  stop: (x: number, z: number) => boolean;
  /** Where a spoke has no bank at all (a drive, what stands past the pad, a path, a walk) */
  skip: (x: number, z: number) => boolean;
}
/** A mansion's pad as a bank's ground: stopped by the roads' shoulders and the landmarks, none on its drive, its
 * terraces or under its cantilever, nor on a garden path */
export const mansionGround = (m: Mansion): Ground => ({
  id: m.id,
  // (its bank begins at its yard's edge: mansions.ts `yard`)
  rect: m.yard,
  y: m.y,
  kind: m.kind,
  stop: (x, z) => nearHillRoad(x, z, ROAD_GAP) || onSite(x, z, 0.5),
  skip: (x, z) => toDrive(m, x, z) < DRIVE_GAP || behind(m, x, z) || onGardenPath(x, z, PATH_GAP),
});
export function spokesOf(m: Ground): Spoke[] {
  const [x0, z0, x1, z1] = m.rect;
  const raw: [number, number, number, number][] = [];
  const side = (ax: number, az: number, bx: number, bz: number, nx: number, nz: number) => {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / SPOKE.step));
    for (let k = 0; k <= n; k++) raw.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, nx, nz]);
  };
  const fan = (cx: number, cz: number, a0: number) => {
    for (let k = 1; k < SPOKE.fan + 1; k++) {
      const a = a0 + (Math.PI / 2) * (k / (SPOKE.fan + 1));
      raw.push([cx, cz, Math.cos(a), Math.sin(a)]);
    }
  };
  side(x0, z0, x1, z0, 0, -1);
  fan(x1, z0, -Math.PI / 2);
  side(x1, z0, x1, z1, 1, 0);
  fan(x1, z1, 0);
  side(x1, z1, x0, z1, 0, 1);
  fan(x0, z1, Math.PI / 2);
  side(x0, z1, x0, z0, -1, 0);
  fan(x0, z0, Math.PI);
  return raw.map(([x, z, nx, nz]) => {
    // How far out before a road's shoulder or a landmark's ground
    let reach = PAD_EASE;
    for (let d = 0; d <= PAD_EASE; d += 0.5) {
      const [px, pz] = [x + nx * d, z + nz * d];
      if (m.stop(px, pz)) {
        reach = d - 0.4;
        break;
      }
    }
    let kind: SpokeKind = 'none';
    const blocked = [0, 1.5, 3, 4.5, PAD_EASE].some((d) => m.skip(x + nx * d, z + nz * d));
    if (!blocked && reach >= 1.2) {
      const g = heightAt(x + nx * READ.at, z + nz * READ.at) - m.y;
      kind = g > READ.by ? 'cut' : g < -READ.by ? 'fill' : 'level';
    }
    return { x, z, nx, nz, kind, reach };
  });
}

/* ---------- What dresses a bank ---------- */

/** A post along a wall's run: where, its foot (in the ground) and its top */
export interface Post {
  x: number;
  z: number;
  y0: number;
  y1: number;
}
/** A strip of soil along a run of spokes: each spoke's inner and outer ends, at the ground as drawn */
export type Bed = { ax: number; az: number; ay: number; bx: number; bz: number; by: number }[];
export type PlantKind = 'lavender' | 'rosemary' | 'agave' | 'grass' | 'box' | 'bougainvillea' | 'sage';
export interface Plant {
  x: number;
  z: number;
  y: number;
  s: number;
  kind: PlantKind;
}
export interface Rock {
  x: number;
  z: number;
  y: number;
  s: number;
  turn: number;
}
export interface Bank {
  id: string;
  spokes: Spoke[];
  /** The walls' runs, each a line of posts */
  walls: Post[][];
  beds: Bed[];
  plants: Plant[];
  rocks: Rock[];
  /** Lights set in the walls' faces on their low side, lit at night (x, z, y) */
  lights: [number, number, number][];
}

/** A cut bank's walls: how far out each stands (the toe at the pad's edge) */
export const TIERS = [0.2, 2.2, 4.2] as const;
/** A fill bank's lower wall, where the bank falls at least `drop` by it */
export const FILL_TIER = { at: 2.6, drop: 0.6 } as const;
/** A wall's top over the ground it holds back, read this far behind it; its foot under the ground in front */
export const WALL_TOP = { over: 0.28, behind: 0.45, foot: 0.3 } as const;
/** A wall's lights: every so many posts, this far out from its middle line (on its face), this far under its top */
export const WALL_LIGHT = { every: 5, out: 0.19, down: 0.16 } as const;
/** A wall stands only where it holds back at least this much ground (the toe always) */
const HOLDS = 0.25;
/** The planting by the house's kind: a cut bank's beds, a fill bank's drifts */
export const KIND_PLANTS: Record<MansionKind, { beds: PlantKind[]; drift: PlantKind[] }> = {
  villa: { beds: ['lavender', 'rosemary'], drift: ['rosemary', 'sage', 'lavender'] },
  glass: { beds: ['grass', 'agave'], drift: ['grass', 'agave', 'sage'] },
  compound: { beds: ['bougainvillea', 'rosemary'], drift: ['rosemary', 'bougainvillea', 'sage'] },
  summit: { beds: ['box', 'lavender'], drift: ['lavender', 'box', 'sage'] },
};
/** The tallest a bank's plant stands over the ground (a little over a tier wall) */
export const PLANT_TALLEST = 0.9;

function bankOf(m: Ground, k: number): Bank {
  const r = rng(8800 + k * 31);
  const spokes = spokesOf(m);
  const at = (s: Spoke, d: number): Pt => [s.x + s.nx * d, s.z + s.nz * d];
  const ground = (s: Spoke, d: number) => drawnAt(...at(s, d));
  /** A wall's post at d out along a spoke: topped over the ground on its high side, its foot in the ground on its low side */
  const post = (s: Spoke, d: number, up: 1 | -1): Post => {
    const [x, z] = at(s, d);
    const top = ground(s, d + up * WALL_TOP.behind) + WALL_TOP.over;
    const foot = Math.min(ground(s, d - 0.25), ground(s, d + 0.25), ground(s, d)) - WALL_TOP.foot;
    return { x, z, y0: foot, y1: Math.max(top, foot + WALL_TOP.foot + 0.2) };
  };
  /** Runs of consecutive spokes (round the loop) that pass a test */
  const runs = (ok: (s: Spoke) => boolean): Spoke[][] => {
    const n = spokes.length;
    const start = spokes.findIndex((s) => !ok(s));
    if (start < 0) return [[...spokes, spokes[0]]];
    const out: Spoke[][] = [];
    let run: Spoke[] = [];
    for (let i = 1; i <= n; i++) {
      const s = spokes[(start + i) % n];
      if (ok(s)) run.push(s);
      else {
        if (run.length >= 2) out.push(run);
        run = [];
      }
    }
    if (run.length >= 2) out.push(run);
    return out;
  };
  const holds = (s: Spoke, d: number, up: 1 | -1) => Math.abs(heightAt(...at(s, d + up * 0.6)) - heightAt(...at(s, d))) > HOLDS * 0.5 && Math.abs(heightAt(...at(s, d + up * 0.6)) - m.y) > HOLDS;

  const walls: Post[][] = [];
  const beds: Bed[] = [];
  const plants: Plant[] = [];
  const rocks: Rock[] = [];
  const kinds = KIND_PLANTS[m.kind];
  const plant = (s: Spoke, d: number, kind: PlantKind, jitter = 0.3) => {
    // (jittered along the bank, never past the spoke's reach)
    const t = (r() - 0.5) * jitter;
    const [x, z] = [s.x + s.nx * d - s.nz * t, s.z + s.nz * d + s.nx * t];
    plants.push({ x, z, y: drawnAt(x, z), s: 0.8 + r() * 0.45, kind });
  };
  const rock = (s: Spoke, d: number) => {
    const [x, z] = at(s, d);
    rocks.push({ x, z, y: drawnAt(x, z), s: 0.55 + r() * 0.6, turn: r() * Math.PI * 2 });
  };
  const bed = (run: Spoke[], d0: number, d1: number) => {
    const b: Bed = [];
    for (const s of run) {
      const e = Math.min(d1, s.reach);
      if (e - d0 < 0.3) {
        if (b.length >= 2) beds.push(b.splice(0));
        else b.length = 0;
        continue;
      }
      const [ax, az] = at(s, d0);
      const [bx, bz] = at(s, e);
      b.push({ ax, az, ay: drawnAt(ax, az), bx, bz, by: drawnAt(bx, bz) });
    }
    if (b.length >= 2) beds.push(b);
  };

  /* The cut banks: tiers of walls, beds between them, planted */
  for (const run of runs((s) => s.kind === 'cut')) {
    TIERS.forEach((d, t) => {
      // (each tier in runs of its own: only where the spoke reaches past it and there's ground to hold back)
      let line: Post[] = [];
      for (const s of run) {
        const ok = d + 0.6 < s.reach && (t === 0 || holds(s, d, 1));
        if (ok) line.push(post(s, d, 1));
        else {
          if (line.length >= 2) walls.push(line);
          line = [];
        }
      }
      if (line.length >= 2) walls.push(line);
    });
    for (let t = 0; t < TIERS.length; t++) {
      const [d0, d1] = [TIERS[t] + 0.32, (TIERS[t + 1] ?? PAD_EASE - 0.6) - 0.3];
      bed(run, d0, d1);
      const kind = kinds.beds[t % kinds.beds.length];
      run.forEach((s, i) => {
        // (a row along each bed, every spoke but the odd gap; a second row in the deeper ones)
        for (const f of [0.3, 0.72]) {
          const d = d0 + (d1 - d0) * f;
          if (d < s.reach - 0.3 && (i + t) % 5 !== 4 && (f < 0.5 || i % 2 === 0)) plant(s, d, f < 0.5 ? kind : kinds.beds[(t + 1) % kinds.beds.length]);
        }
      });
      if (m.kind === 'glass') run.forEach((s, i) => i % 6 === 3 && (d0 + d1) / 2 < s.reach - 0.5 && rock(s, (d0 + d1) / 2));
    }
  }

  /* The fill banks: a lower wall where it falls far enough, drifts and boulders down the slope */
  for (const run of runs((s) => s.kind === 'fill')) {
    let line: Post[] = [];
    for (const s of run) {
      const d = FILL_TIER.at;
      const ok = d + 0.6 < s.reach && heightAt(...at(s, d)) - m.y < -FILL_TIER.drop;
      if (ok) line.push(post(s, d, -1));
      else {
        if (line.length >= 2) walls.push(line);
        line = [];
      }
    }
    if (line.length >= 2) walls.push(line);
    bed(run, 0.35, FILL_TIER.at - 0.3);
    run.forEach((s, i) => {
      if (i % 4 !== 1) plant(s, 0.9 + r() * 0.5, kinds.drift[i % kinds.drift.length]);
      // (past the lower wall, a looser drift down the slope)
      for (const d of [3.3, 4.4, 5.3]) if (d < s.reach - 0.3 && r() < 0.55) plant(s, d + (r() - 0.5) * 0.4, kinds.drift[Math.floor(r() * kinds.drift.length)], 0.8);
      if (i % 5 === 2 && 3.8 < s.reach - 0.5) rock(s, 3.6 + r() * 1.4);
    });
  }

  /* Level ground: a planted border along the pad's edge */
  for (const run of runs((s) => s.kind === 'level')) {
    bed(run, 0.35, 1.3);
    run.forEach((s, i) => i % 3 !== 2 && plant(s, 0.8, kinds.drift[i % kinds.drift.length], 0.2));
  }

  /* Lights in the walls: every `WALL_LIGHT.every` posts, in the face on its low side, under the coping */
  const lights: [number, number, number][] = [];
  for (const w of walls)
    for (let k = 2; k < w.length - 2; k += WALL_LIGHT.every) {
      const [p, q] = [w[k - 1], w[k + 1]];
      const l = Math.hypot(q.x - p.x, q.z - p.z) || 1;
      let [nx, nz] = [-(q.z - p.z) / l, (q.x - p.x) / l];
      const c = w[k];
      if (drawnAt(c.x + nx * 0.5, c.z + nz * 0.5) > drawnAt(c.x - nx * 0.5, c.z - nz * 0.5)) [nx, nz] = [-nx, -nz];
      const [x, z] = [c.x + nx * WALL_LIGHT.out, c.z + nz * WALL_LIGHT.out];
      // (only where the face shows: the ground under it lower than the light)
      if (c.y1 - WALL_LIGHT.down > drawnAt(x, z) + 0.12) lights.push([x, z, c.y1 - WALL_LIGHT.down]);
    }
  return { id: m.id, spokes, walls, beds, plants, rocks, lights };
}

/**
 * Each mansion's bank, laid the first time it's asked for: by the sites that draw them (mansions3d.ts, in the site
 * worker), never as the chunk loads on the main thread
 */
export function banks(): Bank[] {
  return (BANKS ??= MANSIONS.map((m, k) => bankOf(mansionGround(m), k)));
}
let BANKS: Bank[] | null = null;

/* ---------- The landmarks' banks ---------- */

const STREETS = PLAN.streets.filter((st) => st.kind !== 'alley');
/** The streets that come anywhere near a rect's banks (so a spoke asks only those, not the whole city's) */
const streetsNear = (r: readonly number[]) => {
  const [cx, cz] = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
  const reach = Math.hypot(r[2] - r[0], r[3] - r[1]) / 2 + PAD_EASE + 2;
  return STREETS.filter((st) => distToStreet(st, [cx, cz]) < st.half + WALK_W + reach);
};
/** On one of these streets or its sidewalk (padded `m`) */
const onStreet = (near: typeof STREETS, x: number, z: number, m: number) => near.some((st) => distToStreet(st, [x, z]) < st.half + WALK_W + m);
/** On the golf course: a fairway, or round a green (crestsites.ts's reach for them) */
const onHole = (x: number, z: number) =>
  HOLES.some((h) => {
    const [a, b] = [h.tee, h.green];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t) < FAIRWAY + 1.5 || Math.hypot(x - b[0], z - b[1]) < FRINGE + 3;
  });
/** In a rect, padded */
const inRect = (r: readonly number[], x: number, z: number, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
/**
 * The civic hall's and the country club's pads, banked as the mansions' are (the grand hotel stands on the Flats, its
 * edges planted by crestgardens.ts): stopped by the streets and their sidewalks, the hill roads, the mansions and the
 * golf course; none across the civic hall's walk in from the boulevard. The civic hall takes the summit's formal box
 * and lavender, the club a villa's lavender and rosemary
 */
export function siteBanks(): Bank[] {
  return (SITE_BANKS ??= laySiteBanks());
}
let SITE_BANKS: Bank[] | null = null;
/** The landmarks banked, and the ground each stands on (where their sites go, without laying the banks) */
export const SITE_GROUNDS = [
  { id: 'civic', rect: CIVIC.pad as readonly number[] },
  { id: 'club', rect: CLUB.pad as readonly number[] },
] as const;
const laySiteBanks = (): Bank[] => [
  { id: 'civic', rect: CIVIC.pad, y: CIVIC.y, kind: 'summit' as MansionKind, walk: CIVIC.walk as readonly number[] | null },
  { id: 'club', rect: CLUB.pad, y: CLUB.y, kind: 'villa' as MansionKind, walk: null },
].map(({ id, rect, y, kind, walk }, k) => {
  const near = streetsNear(rect);
  return bankOf(
    {
      id,
      rect: rect as [number, number, number, number],
      y,
      kind,
      stop: (x, z) => nearHillRoad(x, z, ROAD_GAP) || onStreet(near, x, z, 0.4) || onMansion(x, z, 0.5) || onHole(x, z) || SITE_LEVELS.some((l) => l.rect !== rect && inRect(l.rect, x, z, l.ease)),
      skip: (x, z) => (walk ? inRect(walk, x, z, 1.2) : false) || onGardenPath(x, z, PATH_GAP),
    },
    40 + k
  );
});

/* ---------- A villa's terraces, on the ground behind it ---------- */

/** A terrace's width in from the pad's sides, how far its top stands over the highest ground under it, its foot under the lowest;
 * the most the ground may fall across a bay before it's cut in more bays, and the most bays */
export const TERRACE = { inset: 1, over: 0.12, foot: 0.4, face: 1.4, bays: 4 } as const;
export interface Terrace {
  /** In the mansion's frame (u0, v0 its high edge by the pad, u1, v1), its top and foot over the pad (y up from it) */
  r: [number, number, number, number];
  top: number;
  foot: number;
}
/**
 * Each mansion's terraces (a villa's two, mansions.ts `terraces`), standing on the slope behind it as it is: each a
 * platform topped a little over the highest ground under it (so none is ever buried in the bank), its retaining face
 * showing where the ground falls away, its foot in the ground at its lowest (the ground as drawn)
 */
export const TERRACES: Terrace[][] = MANSIONS.map((m) =>
  m.terraces.flatMap(([v0, v1]) => {
    const [a, b] = [-m.W / 2 + TERRACE.inset, m.W / 2 - TERRACE.inset];
    /** The ground's highest and lowest under a stretch of the terrace (u0 to u1) */
    const range = (u0: number, u1: number) => {
      let hi = -Infinity;
      let lo = Infinity;
      for (let u = u0; u <= u1 + 1e-9; u += (u1 - u0) / 6)
        for (let v = v1; v <= v0 + 1e-9; v += (v0 - v1) / 4) {
          const g = drawnAt(...toWorldOf(m, u, v)) - m.y;
          hi = Math.max(hi, g);
          lo = Math.min(lo, g);
        }
      return [hi, lo];
    };
    // (in as few bays across as keep each one's face under `TERRACE.face` where the ground falls across it, each its own height)
    for (let n = 1; ; n++) {
      const bays = Array.from({ length: n }, (_, k) => [a + ((b - a) * k) / n, a + ((b - a) * (k + 1)) / n]);
      const rs = bays.map(([u0, u1]) => range(u0, u1));
      if (n < TERRACE.bays && rs.some(([hi, lo]) => hi - lo > TERRACE.face)) continue;
      return bays.map(([u0, u1], k): Terrace => ({ r: [u0, v0, u1, v1], top: rs[k][0] + TERRACE.over, foot: rs[k][1] - TERRACE.foot }));
    }
  })
);
function toWorldOf(m: Mansion, u: number, v: number): Pt {
  const [ox, oz] = outOf(m.face);
  const [cx, cz] = originOf(m);
  return [cx + oz * u + ox * v, cz - ox * u + oz * v];
}
/** The terraces, solid to their tops (joining the grids when the chunk comes in, crestmont3d.ts) */
export const TERRACE_SOLIDS: [number, number, number, number, number][] = MANSIONS.flatMap((m, i) => TERRACES[i].map((t): [number, number, number, number, number] => [...rectToWorld(m, t.r[0], t.r[1], t.r[2], t.r[3]), m.y + t.top]));

/* ---------- Lights along the drives ---------- */

/** A drive's low lights: this far out from its middle (just past its kerb), this far apart along it, by turns each side */
export const DRIVE_LIGHT = { off: 1.48, step: 3.2, clear: 0.55 } as const;
/** Each mansion's drive lit at night: low lights by turns either side, clear of its piers (crestland.ts) and the road */
export function driveLights(): [number, number, number][] {
  return (DRIVE_LIGHTS ??= layDriveLights());
}
let DRIVE_LIGHTS: [number, number, number][] | null = null;
const layDriveLights = (): [number, number, number][] => MANSIONS.flatMap((m) => {
  const [a, b] = m.drive;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [ux, uz] = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  const out: [number, number, number][] = [];
  let side = 1;
  for (let d = 2.4; d < L - 0.8; d += DRIVE_LIGHT.step, side = -side) {
    const [x, z] = [a[0] + ux * d - uz * side * DRIVE_LIGHT.off, a[1] + uz * d + ux * side * DRIVE_LIGHT.off];
    if (nearHillRoad(x, z, BED.shoulder + 0.3) || DRIVE_PIERS.some((p) => Math.hypot(p.x - x, p.z - z) < DRIVE_PIER.half + DRIVE_LIGHT.clear)) continue;
    out.push([x, z, drawnAt(x, z)]);
  }
  return out;
});
