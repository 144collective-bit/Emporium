/*
 * The Neon Mile's drop-offs (stripdrop.ts, docs/strip-plan.md Phase 7): each resort's canopy car comes along the
 * boulevard's kerb lane, turns in under its canopy into its bay, stands there, and leaves through the canopy's other
 * end; every way clear of the solids, the lamps, the people and the water, no two cars in one place, each car in its
 * own bay when it stands, and every one parked under reduced motion.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARS } from '../src/scripts/city3d/carspec';
import { RESORTS, RESORT_SOLIDS } from '../src/scripts/city3d/resorts';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { STRIP_LAMPS, inStrip } from '../src/scripts/city3d/strip';
import { SHOW_WATCHERS, STRIP_IDLE } from '../src/scripts/city3d/striplife';
import { DROPS, DROP_STILL, ENDS, LANE_N, LANE_S, PARKED, PERIOD, STAND, dropAt, legsOf } from '../src/scripts/city3d/stripdrop';

type P = [number, number];
const STEP = 0.1;

/** A car's corners at x, z turned by yaw (+x its front; x east, z south), a margin round it */
function corners(x: number, z: number, yaw: number, len: number, wid: number, m = 0): P[] {
  const [c, s] = [Math.cos(yaw), -Math.sin(yaw)];
  const [hl, hw] = [len / 2 + m, wid / 2 + m];
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [x + a * hl * c - b * hw * s, z + a * hl * s + b * hw * c]);
}
/** Whether a turned rectangle overlaps an upright one (separating axes) */
function hits(pts: P[], b: number[]) {
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  if (Math.max(...xs) <= b[0] || Math.min(...xs) >= b[2] || Math.max(...zs) <= b[1] || Math.min(...zs) >= b[3]) return false;
  const box: P[] = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
  for (let i = 0; i < 2; i++) {
    const [p, q] = [pts[i], pts[i + 1]];
    const ax = [q[1] - p[1], p[0] - q[0]];
    const proj = (list: P[]) => list.map(([x, z]) => x * ax[0] + z * ax[1]);
    const [a, c] = [proj(pts), proj(box)];
    if (Math.max(...a) <= Math.min(...c) || Math.max(...c) <= Math.min(...a)) return false;
  }
  return true;
}
/** Two turned rectangles overlapping */
function clash(a: P[], b: P[]) {
  for (const poly of [a, b])
    for (let i = 0; i < 4; i++) {
      const [p, q] = [poly[i], poly[(i + 1) % 4]];
      const ax = [q[1] - p[1], p[0] - q[0]];
      const proj = (list: P[]) => list.map(([x, z]) => x * ax[0] + z * ax[1]);
      const [u, v] = [proj(a), proj(b)];
      if (Math.max(...u) <= Math.min(...v) || Math.max(...v) <= Math.min(...u)) return false;
    }
  return true;
}
const times = (n: number, step = STEP) => Array.from({ length: Math.ceil(n / step) }, (_, i) => i * step);

test('six resorts\' cars come and go; Big City\'s stays parked; each stands in its own bay, facing east, and all parked when still', () => {
  assert.equal(DROPS.length, 6);
  assert.ok(DROPS.every((d) => [...d.road, ...d.drive, ...d.exit, ...d.away].every(([x, z]) => Number.isFinite(x) && Number.isFinite(z))), 'every way found');
  assert.ok(PARKED.length >= 1 && PARKED.every(([, x, z]) => RESORTS.some((r) => r.id === 'bigcity' && x > r.porte.rect[0] && x < r.porte.rect[2] && z > r.porte.rect[1] && z < r.porte.rect[3])));
  for (const d of DROPS) {
    const r = RESORTS.find((q) => q.id === d.id)!;
    const [, bx, bz] = r.cars[0];
    assert.deepEqual(d.bay, [bx, bz], `${d.id}'s bay is where its car always stood`);
    const still = dropAt(d, DROP_STILL)!;
    assert.ok(still.parked && still.x === bx && still.z === bz && still.yaw === 0, `${d.id} parked under reduced motion`);
    const g = legsOf(d);
    const standing = d.phase + g.road + g.drive + STAND / 2;
    const s = dropAt(d, standing)!;
    assert.ok(s.parked && s.x === bx && s.z === bz, `${d.id} stands in its bay`);
    assert.equal(dropAt(d, d.phase + g.road + g.drive + STAND + g.exit + g.away + 1), null, `${d.id} away between visits`);
    assert.ok(g.road + g.drive + STAND + g.exit + g.away < PERIOD - 5, `${d.id}'s visit fits its period`);
  }
});

test('every way seamless: on and off the lane at the boulevard\'s ends, never jumping, never in reverse', () => {
  for (const d of DROPS) {
    const L = RESORTS.find((r) => r.id === d.id)!.row === 'north' ? LANE_N : LANE_S;
    assert.ok(d.road[0][1] === L && d.away[d.away.length - 1][1] === L);
    assert.ok(ENDS.includes(d.road[0][0]) && ENDS.includes(d.away[d.away.length - 1][0]) && d.road[0][0] !== d.away[d.away.length - 1][0]);
    let last: ReturnType<typeof dropAt> = null;
    for (const t of times(PERIOD)) {
      const p = dropAt(d, d.phase + t);
      if (p && last) {
        const step = Math.hypot(p.x - last.x, p.z - last.z);
        assert.ok(step < 0.6, `${d.id} jumps ${step.toFixed(2)} at ${t.toFixed(1)}`);
        // (moving the way it faces)
        if (step > 1e-6) {
          const fwd = (p.x - last.x) * Math.cos(last.yaw) - (p.z - last.z) * Math.sin(last.yaw);
          assert.ok(fwd > -1e-6, `${d.id} backs up at ${t.toFixed(1)}`);
        }
      }
      last = p;
    }
  }
});

test('every way clear of the solids, the lamps, the people and the other cars', () => {
  // (its own car's box is the bay it stands in: RESORT_SOLIDS keeps it, for walking into the car standing there)
  const isOwn = (d: (typeof DROPS)[number], b: number[]) => Math.abs((b[0] + b[2]) / 2 - d.bay[0]) < 1e-6 && Math.abs((b[1] + b[3]) / 2 - d.bay[1]) < 1e-6;
  const near = SOLIDS.filter((b) => inStrip((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 10));
  assert.ok(DROPS.every((d) => RESORT_SOLIDS.some((b) => isOwn(d, b))), 'each bay holds its car\'s box');
  const lamps = STRIP_LAMPS.map(([x, z]) => [x - 0.15, z - 0.15, x + 0.15, z + 0.15]);
  const people = [...STRIP_IDLE, ...SHOW_WATCHERS].map((p) => [p.x - 0.25, p.z - 0.25, p.x + 0.25, p.z + 0.25]);
  const water = RESORTS.flatMap((r) => r.water);
  for (const d of DROPS) {
    const solid = near.filter((b) => !isOwn(d, b));
    const { L, W } = CARS[d.car];
    for (const t of times(PERIOD, 0.25)) {
      const p = dropAt(d, d.phase + t);
      if (!p) continue;
      const box = corners(p.x, p.z, p.yaw, L, W);
      for (const b of solid) assert.ok(!hits(box, b), `${d.id}'s car in ${b.map((v) => v.toFixed(1))} at ${t}`);
      for (const b of [...lamps, ...water]) assert.ok(!hits(box, b), `${d.id}'s car in a lamp or the water at ${t}`);
      for (const b of people) assert.ok(!hits(box, b), `${d.id}'s car through someone at ${b[0].toFixed(1)}, ${b[1].toFixed(1)} (${t})`);
    }
  }
  // No two cars in one place at once (the lanes are shared)
  for (const t of times(PERIOD, 0.25)) {
    const here = DROPS.map((d) => [d, dropAt(d, t)] as const).filter(([, p]) => p);
    for (let i = 0; i < here.length; i++)
      for (let j = 0; j < i; j++) {
        const [[a, p], [b, q]] = [here[i], here[j]];
        assert.ok(!clash(corners(p!.x, p!.z, p!.yaw, CARS[a.car].L, CARS[a.car].W, 0.3), corners(q!.x, q!.z, q!.yaw, CARS[b.car].L, CARS[b.car].W, 0.3)), `${a.id}'s and ${b.id}'s cars meet at ${t}`);
      }
  }
});
