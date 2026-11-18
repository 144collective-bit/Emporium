/**
 * The banks round the hills' mansions' pads (the owner's call, 2026-11: "the landscape needs adjusting around
 * buildings... improve the grounds around the houses"). DOM-free, in Crestmont's chunk only: drawn by mansions3d.ts in
 * each mansion's own site, tested in tests/crestbanks.test.ts. Nothing of it is solid, nor moves the ground: the pads
 * and their banks are terrain.ts's (`LEVELS`, eased over `PAD_EASE`); this dresses the banks.
 *
 * Each pad's bank is walked round in spokes (`Spoke`): out from the pad's edge, square to its sides and fanned round
 * its corners, as the ease runs. A spoke is **cut** where the hills rise past the pad, **fill** where they fall away,
 * **level** between, or nothing where the drive, the road and its shoulders, a landmark, a villa's terraces or a glass
 * mansion's cantilever come:
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
import { MANSIONS, PAD_EASE, outOf, originOf, rectToWorld, type Mansion, type MansionKind } from './mansions';
import { onSite } from './crestsites';
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
export function spokesOf(m: Mansion): Spoke[] {
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
      if (nearHillRoad(px, pz, ROAD_GAP) || onSite(px, pz, 0.5)) {
        reach = d - 0.4;
        break;
      }
    }
    let kind: SpokeKind = 'none';
    const blocked = [0, 1.5, 3, 4.5, PAD_EASE].some((d) => toDrive(m, x + nx * d, z + nz * d) < DRIVE_GAP || behind(m, x + nx * d, z + nz * d));
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
}

/** A cut bank's walls: how far out each stands (the toe at the pad's edge) */
export const TIERS = [0.2, 2.2, 4.2] as const;
/** A fill bank's lower wall, where the bank falls at least `drop` by it */
export const FILL_TIER = { at: 2.6, drop: 0.6 } as const;
/** A wall's top over the ground it holds back, read this far behind it; its foot under the ground in front */
export const WALL_TOP = { over: 0.28, behind: 0.45, foot: 0.3 } as const;
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

function bankOf(m: Mansion, k: number): Bank {
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

  return { id: m.id, spokes, walls, beds, plants, rocks };
}

export const BANKS: Bank[] = MANSIONS.map(bankOf);

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
