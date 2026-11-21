/*
 * Crestmont's residents at leisure and its road cyclists (docs/crestmont-plan.md, the premium upgrade's Phase 6; the
 * owner's calls, 2026-11-20: the residents where the plan put them, "Ridge Road, a few", "Skip tennis"). DOM-free, in
 * Crestmont's chunk (crestleisure3d.ts puts them in the crowd's spare slots, life.ts `addPeople()`, and draws the
 * bikes), tested in tests/crestleisure.test.ts. Phase 8's people (crestlife.ts: the joggers, dog walkers, valets,
 * diners, sunbathers by the pools, gardeners) are the boot's; these come with the chunk.
 *
 * - **At home** (`LEISURE_IDLE`): someone out on a balcony at every third estate and every other hill house, looking
 *   out; on the other hill houses' roof terraces someone on a lounger, and at every fourth a pair at the deck's table.
 * - **Out**: diners at THE ASTERLY's terrace tables and a waiter between them, two on the Belvedere's benches and one
 *   at its front taking in the view, visitors in the Crestmont Glasshouse (two under its dome by the palm, a pair at
 *   its garden's east end, one by the fountain), someone on every other bench along the Ridgeline Walk and at each of
 *   its lookouts.
 * - **On the move** (`LEISURE_PEOPLE`): walkers on the Ridgeline Walk, up on one side of it and down the other, at a
 *   stroll; road cyclists on Ridge Road (`RIDERS`), up its right-hand edge and down the other side, slow on the climbs
 *   and quick on the way down, each the same ride a share of the loop behind the last, so none meets another. Off the
 *   cars' lanes on the asphalt's edge (a car's side at `LANE / 2` plus its half width), on the road as drawn.
 */
import { HILL_ROADS } from './crestmont';
import { heightAt } from './terrain';
import { drawnAt } from './drawn';
import { DRAPE, ROAD_LIFT } from './crestdrape';
import { SLAB_Y } from './coral';
import { ESTATES, toWorld as estateAt } from './estates';
import { MANSIONS, toWorld as mansionAt } from './mansions';
import { ESTATE_BALCONIES, MANSION_BALCONIES, ROOF_DECKS } from './crestgrand';
import { ASTERLY, BELVEDERE, GLASSHOUSE } from './crestsites';
import { BELVEDERE_BENCH, BELVEDERE_BENCHES, BENCH, BENCHES, GLASS_FOUNTAIN, LOOKOUTS, WALK_L, WALK_POINTS, stepAt, walkGround } from './crestwalk';
import { BIKE_SEAT } from './uptownlife';
import type { Idle } from './idle';
import type { Moment, ParkPerson } from './parklife';

type Pt = [number, number];
const facing = (dx: number, dz: number) => Math.atan2(dx, dz);
/** The ground the walk's benches and lookouts stand on (crestwalk3d.ts's: the lower of the hills' height and the grass as drawn) */
const ground = walkGround;
/** A lounger's top over its deck (crestgrand3d.ts `drawDeck()`), a deck's chairs' */
const DECK_LOUNGER = 0.29;
const DECK_CHAIR = 0.48;
/** A lookout's paving's top over the ground (crestwalk3d.ts) */
const LOOKOUT_TOP = 0.145;
/** THE ASTERLY's terrace's tables (crestsites3d.ts): along its length every so far, a chair either side along x, their seats' top */
export const ASTERLY_TABLES = { first: 1.3, every: 2.4, chair: 0.7, seat: 0.49 } as const;

/* ---------- At home and out ---------- */

export const LEISURE_IDLE: Idle[] = (() => {
  const out: Idle[] = [];
  // On a balcony (a house's frame `at`, its ground `y0`): at its middle, half its depth out, looking out
  const balcony = (at: (u: number, v: number) => Pt, y0: number, b: (typeof ESTATE_BALCONIES)[number][number]) => {
    const [u, v] = [(b.u0 + b.u1) / 2, b.v + b.n * b.d * 0.5];
    const [x, z] = at(u, v);
    const [ox, oz] = at(u, v + b.n);
    out.push({ x, z, y: y0 + b.y + 0.02, ry: facing(ox - x, oz - z), act: 'look' });
  };
  ESTATES.forEach((e, i) => {
    const b = ESTATE_BALCONIES[i][0];
    if (i % 3 === 0 && b) balcony((u, v) => estateAt(e, u, v), SLAB_Y, b);
  });
  MANSIONS.forEach((m, i) => {
    const at = (u: number, v: number) => mansionAt(m, u, v);
    const b = MANSION_BALCONIES[i][0];
    if (i % 2 === 0 && b) {
      balcony(at, m.y, b);
      return;
    }
    // The roof terrace: someone on its first lounger, facing its back (the view: crestgrand.ts `furnish()`), their
    // hips by its head end; at every fourth house a pair at its table
    const d = ROOF_DECKS[i];
    const lounger = d.things.find((t) => t.kind === 'lounger');
    if (lounger) {
      const [x, z] = at(lounger.u, lounger.v + 0.35);
      const [fx, fz] = at(lounger.u, lounger.v - 1);
      out.push({ x, z, y: m.y + d.y + DECK_LOUNGER + 0.03, ry: facing(fx - x, fz - z), act: 'lounge' });
    }
    const table = d.things.find((t) => t.kind === 'table');
    if (table && i % 4 === 3)
      for (const s of [-1, 1]) {
        const [x, z] = at(table.u + s * (table.r + 0.25), table.v);
        const [tx, tz] = at(table.u, table.v);
        out.push({ x, z, y: m.y + d.y + DECK_CHAIR, ry: facing(tx - x, tz - z), act: 'eat' });
      }
  });

  // THE ASTERLY's terrace: a pair at each table but the third, facing each other across it; a waiter between the first two
  const [tx0, tz0, tx1, tz1] = ASTERLY.terrace;
  const tz = (tz0 + tz1) / 2;
  const T = ASTERLY_TABLES;
  let k = 0;
  for (let x = tx0 + T.first; x < tx1 - 1; x += T.every, k++) {
    if (k === 2) continue;
    for (const s of [-1, 1]) out.push({ x: x + s * T.chair, z: tz, y: ASTERLY.y + T.seat, ry: facing(-s, 0), act: 'eat' });
  }
  out.push({ x: tx0 + T.first + T.every / 2, z: tz - ASTERLY.out * 0.9, y: ASTERLY.y + 0.02, ry: facing(0, ASTERLY.out), act: 'serve' });

  // The Belvedere: one on each bench, one at its front looking out over the valley
  // (its paving draped over the grass as drawn)
  const drawn = (x: number, z: number) => drawnAt(x, z) + DRAPE.path + 0.01;
  for (const s of BELVEDERE_BENCHES) out.push({ x: s.x, z: s.z, y: ground(s.x, s.z) + BELVEDERE_BENCH.seat, ry: s.yaw, act: 'sit' });
  {
    const [lx, lz] = BELVEDERE.look;
    // (between the two columns either side of its view, a step in)
    const [x, z] = [BELVEDERE.x + lx * (BELVEDERE.r - 0.8) + 0.6, BELVEDERE.z + lz * (BELVEDERE.r - 0.8)];
    out.push({ x, z, y: drawn(x, z), ry: facing(lx, lz), act: 'look' });
  }

  // The glasshouse: two under the dome looking at its palm, a pair at the garden's east end, one by the fountain
  const G = GLASSHOUSE;
  const { x: dx, z: dz } = G.dome;
  for (const [x, z] of [
    [dx - 1.5, dz + 0.8],
    [dx + 1.4, dz - 0.9],
  ] as Pt[])
    out.push({ x, z, y: G.y + 0.42, ry: facing(dx - x, dz - z), act: 'look' });
  const ex = (G.house[2] + G.rect[2]) / 2;
  out.push({ x: ex, z: dz - 0.45, y: G.y + 0.02, ry: facing(0, 1), act: 'chat' });
  out.push({ x: ex, z: dz + 0.45, y: G.y + 0.02, ry: facing(0, -1), act: 'chat' });
  {
    const F = GLASS_FOUNTAIN;
    const [x, z] = [F.x - 0.75, F.z - F.r - 0.45];
    out.push({ x, z, y: G.y + 0.02, ry: facing(F.x - x, F.z - z), act: 'look' });
  }

  // The walk: someone on every other bench, someone at each lookout looking out
  BENCHES.forEach((s, i) => {
    if (i % 2 === 0) out.push({ x: s.x, z: s.z, y: ground(s.x, s.z) + BENCH.seat, ry: s.yaw, act: 'sit' });
  });
  for (const o of LOOKOUTS) {
    const [x, z] = [o.x + o.look[0] * 0.25 + o.look[1] * 0.45, o.z + o.look[1] * 0.25 - o.look[0] * 0.45];
    out.push({ x, z, y: ground(o.x, o.z) + LOOKOUT_TOP, ry: facing(o.look[0], o.look[1]), act: 'look' });
  }
  return out;
})();

/* ---------- The Ridgeline Walk's walkers ---------- */

/** Their stroll (tiles a second), how far either side of the walk's middle they keep (up on its right, down on its
 * left: each on their own right), how many; the side eased to the middle over the last stretch at either end */
export const STROLL = { pace: 0.5, side: 0.3, count: 4, ease: 1.5 } as const;

/** The walk's point at `d` along it (a search by halves: the walkers ask every frame) */
function walkPoint(d: number) {
  let lo = 0;
  let hi = WALK_POINTS.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (WALK_POINTS[mid].d <= d) lo = mid;
    else hi = mid;
  }
  return [WALK_POINTS[lo], WALK_POINTS[hi]] as const;
}
/** The walk's middle at `d` along it */
function middle(d: number): Pt {
  const [a, b] = walkPoint(Math.max(0, Math.min(WALK_L, d)));
  const f = Math.max(0, Math.min(1, (d - a.d) / (b.d - a.d || 1)));
  return [a.x + (b.x - a.x) * f, a.z + (b.z - a.z) * f];
}
/** A walker `u` round the walk's loop (up it and back down): where, which way they face, their feet over the gravel as drawn */
export function strollAt(u: number, out: Moment) {
  const L = WALK_L;
  u = ((u % (2 * L)) + 2 * L) % (2 * L);
  const up = u < L;
  const d = up ? u : 2 * L - u;
  const [cx, cz] = middle(d);
  // (the way along over a stretch either side, so round a bend their side of it swings and doesn't jump)
  const [p, q] = [middle(d - STROLL.ease / 2), middle(d + STROLL.ease / 2)];
  const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
  const [ux, uz] = [((up ? 1 : -1) * (q[0] - p[0])) / l, ((up ? 1 : -1) * (q[1] - p[1])) / l];
  // (their right: (-u.z, u.x))
  const side = STROLL.side * Math.min(1, Math.min(d, L - d) / STROLL.ease);
  out.x = cx - uz * side;
  out.z = cz + ux * side;
  // (on a flight, on its step's tread)
  const st = stepAt(d);
  out.y = st ? st.top : drawnAt(out.x, out.z) + DRAPE.path;
  out.ry = facing(ux, uz);
  out.clip = 'walk';
  out.speed = STROLL.pace;
  return out;
}

/* ---------- Ridge Road's cyclists ---------- */

/** How far out from Ridge Road's middle they ride (on its asphalt's edge, right of the cars), off its ends (its junctions),
 * how many; their pace (tiles a second) from the grade along their way, slower uphill (`flat - climb * grade`, within `min`..`max`) */
export const RIDE = { off: 1.5, ends: 7, count: 5, flat: 2.2, climb: 10, min: 0.9, max: 4 } as const;
const RIDGE = HILL_ROADS.find((r) => r.id === 'crest-ridge')!;
/** The asphalt's top as drawn (crestmont3d.ts `ON`) */
export const roadTop = (x: number, z: number) => Math.max(heightAt(x, z), drawnAt(x, z)) + ROAD_LIFT;

/** Their loop: up the right-hand edge from the foot, across, down the other; a point every 1.5, its height, the time to it */
export const RIDE_LOOP = (() => {
  const r = RIDGE;
  const len = r.cum[r.cum.length - 1];
  const up: Pt[] = [];
  const down: Pt[] = [];
  for (let d = RIDE.ends; d <= len - RIDE.ends; d += 1.5) {
    let i = 1;
    while (i < r.cum.length - 1 && r.cum[i] < d) i++;
    const [a, b] = [r.pts[i - 1], r.pts[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const f = (d - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1] || 1);
    const p: Pt = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    // (the road's right, the way it runs up: (-u.z, u.x))
    const [nx, nz] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    up.push([p[0] + nx * RIDE.off, p[1] + nz * RIDE.off]);
    down.push([p[0] - nx * RIDE.off, p[1] - nz * RIDE.off]);
  }
  const pts = [...up, ...down.reverse()];
  const ys = pts.map(([x, z]) => roadTop(x, z));
  // (each piece's time at its pace, from its grade the way they ride it)
  const time = [0];
  for (let i = 1; i <= pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i % pts.length]];
    const run = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6;
    const grade = (ys[i % pts.length] - ys[i - 1]) / run;
    const pace = Math.max(RIDE.min, Math.min(RIDE.max, RIDE.flat - RIDE.climb * grade));
    time.push(time[i - 1] + run / pace);
  }
  return { pts, ys, time, T: time[time.length - 1], top: up.length };
})();

/** Each cyclist: a share of the loop's time behind the last */
export const RIDERS = Array.from({ length: RIDE.count }, (_, k) => ({ id: `ridge-cyclist-${k}`, t0: (k / RIDE.count) * RIDE_LOOP.T, trim: k % 2 === 1 }));
/** A cyclist on the road at `t`: their bike's place on the asphalt (`y` its top), which way it faces, its pitch (nose up +) and pace */
export interface RidePose {
  x: number;
  z: number;
  y: number;
  ry: number;
  pitch: number;
  pace: number;
}
export function rideAt(k: number, t: number, out: RidePose) {
  const L = RIDE_LOOP;
  const s = (((t + RIDERS[k].t0) % L.T) + L.T) % L.T;
  let lo = 0;
  let hi = L.time.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (L.time[mid] <= s) lo = mid;
    else hi = mid;
  }
  const n = (lo + 1) % L.pts.length;
  const [a, b] = [L.pts[lo], L.pts[n]];
  const f = (s - L.time[lo]) / (L.time[lo + 1] - L.time[lo] || 1);
  const run = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6;
  out.x = a[0] + (b[0] - a[0]) * f;
  out.z = a[1] + (b[1] - a[1]) * f;
  out.y = L.ys[lo] + (L.ys[n] - L.ys[lo]) * f;
  out.ry = facing(b[0] - a[0], b[1] - a[1]);
  out.pitch = Math.atan2(L.ys[n] - L.ys[lo], run);
  out.pace = run / (L.time[lo + 1] - L.time[lo] || 1);
  return out;
}

/* ---------- Everyone on the move ---------- */

export const LEISURE_PEOPLE: ParkPerson[] = (() => {
  const out: ParkPerson[] = [];
  for (let k = 0; k < STROLL.count; k++) {
    const u0 = (k / STROLL.count) * 2 * WALK_L + 11;
    out.push({ id: `ridgeline-walk-${k}`, trim: k % 2 === 1, at: (t, m) => strollAt(u0 + STROLL.pace * t, m) });
  }
  const pose: RidePose = { x: 0, z: 0, y: 0, ry: 0, pitch: 0, pace: 0 };
  RIDERS.forEach((r, k) =>
    out.push({
      id: r.id,
      trim: r.trim,
      at: (t, m) => {
        rideAt(k, t, pose);
        Object.assign(m, { x: pose.x, z: pose.z, ry: pose.ry, y: pose.y + BIKE_SEAT, clip: 'sit' as const, speed: 0 });
        return m;
      },
    })
  );
  return out;
})();
