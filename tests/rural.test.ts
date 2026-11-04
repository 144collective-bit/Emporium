// The country roads (rural.ts, ruraldress.ts; docs/highway-plan.md Phase 7): past the highway and whatever stands along
// them, the grid's roads carry on to near the world's edge as two-lane country roads, each with its turning loop; the
// traffic drives every one of them (a little), and their verges, ditches, fences, gates and lamps lie beside them on the
// open land, clear of everything else, the trees kept off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN, distToStreet, onSlab, raised } from '../src/scripts/city3d/streetplan';
import { EXT, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { insideHighway } from '../src/scripts/city3d/highway';
import { ROUTES, RURAL_SPOTS, SPOTS, pointOn } from '../src/scripts/city3d/routes';
import { RURAL, RURAL_RUNS, onRural } from '../src/scripts/city3d/rural';
import { FENCES, GATES, RURAL_LAMPS, loopCentre } from '../src/scripts/city3d/ruraldress';
import { rollsAt } from '../src/scripts/city3d/rolls';
import { heightAt } from '../src/scripts/city3d/terrain';
import { inWater } from '../src/scripts/city3d/river';
import { treeSpot } from '../src/scripts/city3d/outskirts';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PILLARS } from '../src/scripts/city3d/metro';

test('every grid road out past the highway carries on as a country road to near the edge, with its turning loop', () => {
  assert.ok(RURAL_RUNS.length >= 12, `${RURAL_RUNS.length} country roads`);
  for (const r of RURAL_RUNS) {
    const s = PLAN.streets.find((q) => q.id === r.id)!;
    assert.ok(s && s.kind === 'rural' && s.lanes === 1 && s.half === RURAL.half && !s.oneway);
    // (from its town piece, unlit, out past the highway)
    const join = PLAN.crossings.find((c) => c.id === `${r.id}-join`)!;
    assert.ok(join && !join.lights && join.streets.includes(r.of));
    const town = PLAN.streets.find((q) => q.id === r.of)!;
    assert.ok(distToStreet(town, join.at) < 1e-6);
    assert.ok(!insideHighway(...join.at));
    // (to its loop near the edge, inside where you can drive)
    const edge = r.out > 0 ? EXT[1] : EXT[0];
    assert.ok(Math.abs(edge - r.to) < RURAL.edge + RURAL.turn * 2 + RURAL.half + 1);
    const loop = PLAN.streets.find((q) => q.id === `${r.id}-turn`)!;
    assert.ok(loop && loop.loop && loop.oneway);
    for (const [x, z] of loop.pts) assert.ok(x > WORLD_BOUNDS[0] + RURAL.half && x < WORLD_BOUNDS[2] - RURAL.half && z > WORLD_BOUNDS[1] + RURAL.half && z < WORLD_BOUNDS[3] - RURAL.half);
  }
});

test('the traffic drives every country road and its loop, a little', () => {
  for (const r of RURAL_RUNS) {
    const mid: [number, number] = r.axis === 'x' ? [(r.from + r.to) / 2, r.c] : [r.c, (r.from + r.to) / 2];
    const [cx, cz] = loopCentre(r);
    let road = false;
    let loop = false;
    for (const route of ROUTES)
      for (let p = 0; p < route.len && !(road && loop); p += 1) {
        const q = pointOn(route, p, 0).at;
        if (Math.hypot(q[0] - mid[0], q[1] - mid[1]) < 2.5) road = true;
        if (Math.abs(Math.hypot(q[0] - cx, q[1] - cz) - RURAL.turn) < 1.5) loop = true;
      }
    assert.ok(road && loop, `${r.id}: driven ${road}, its loop ${loop}`);
  }
  // (a car turns up out there at one spot in RURAL_SPOTS of those it could: a little traffic)
  let could = 0;
  for (const route of ROUTES) for (let p = 0; p < route.len; p += 7) if (onRural(...pointOn(route, p, 0).at, 1)) could++;
  const out = SPOTS.filter((s) => onRural(s.x, s.z, 1)).length;
  assert.ok(out > 0 && out <= could / RURAL_SPOTS + RURAL_RUNS.length * 2, `${out} spots of ${could}`);
});

test('their verges, ditches, fences, gates and lamps lie beside them on the open land, clear of everything else', () => {
  const others = PLAN.streets.filter((s) => s.kind !== 'rural' && !raised(s) && s.kind !== 'alley');
  const check = (x: number, z: number, what: string) => {
    assert.ok(!inWater(x, z), `${what} in the river at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    assert.ok(Math.abs(rollsAt(x, z)) < 1e-6 && Math.abs(heightAt(x, z)) < 1e-6, `${what} off level ground at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    assert.ok(!onSlab(PLAN, [x, z]), `${what} on a block`);
    for (const s of others) assert.ok(distToStreet(s, [x, z]) > s.half + 0.5, `${what} on ${s.id}`);
    for (const b of SOLIDS) assert.ok(!(x > b[0] - 0.3 && x < b[2] + 0.3 && z > b[1] - 0.3 && z < b[3] + 0.3), `${what} in a solid`);
  };
  for (const f of FENCES)
    for (let i = 1; i < f.pts.length; i++) {
      const [p, q] = [f.pts[i - 1], f.pts[i]];
      const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 2));
      for (let k = 0; k <= n; k++) check(p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n, `${f.run}'s fence`);
    }
  for (const [x, z] of RURAL_LAMPS) {
    check(x, z, 'a lamp');
    assert.ok(onRural(x, z, 1.2) && !onRural(x, z, 0.3), 'a lamp on the verge');
  }
  assert.ok(GATES.length > RURAL_RUNS.length);
  // Nothing of the metro stands on them
  for (const p of PILLARS) assert.ok(!onRural(p.at[0], p.at[1], 1), `a metro pillar on a country road at ${p.at}`);
});

test('the outskirts\' trees keep off them, their verges and fences', () => {
  for (const r of RURAL_RUNS)
    for (let d = 0; d < Math.abs(r.to - r.from); d += 3)
      for (const o of [0, RURAL.verge[1], RURAL.fence, -RURAL.fence]) {
        const v = r.from + r.out * d;
        const [x, z] = r.axis === 'x' ? [v, r.c + o] : [r.c + o, v];
        assert.ok(!treeSpot(x, z), `a tree on ${r.id} at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      }
});
