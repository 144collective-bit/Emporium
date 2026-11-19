// Northgate Air Base (docs/military-plan.md Phase 1): its land, its fence and its gates, where the plan's signed-off
// lines put them (docs/military-map.png)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIRBASE_RECT, AIRBASE_SOLIDS, AVENUE, FENCE, FENCE_H, FENCE_RUNS, GATES, GATE_ROAD_ENDS, KEPT, LOOP_SHORT, MAIN_GATE, VISITORS, VISITORS_DRIVE, VISITOR_CENTRE, VISITOR_SPAWN, WALL_GATE, barrierOf, guardhouseOf, inAirbase, southFenceZ } from '../src/scripts/city3d/airbase';
import { CAMERAS, FLOODS, WALL_INNER } from '../src/scripts/city3d/wall';
import { RURAL, RURAL_RUNS } from '../src/scripts/city3d/rural';
import { PLAN, distToStreet, type Pt } from '../src/scripts/city3d/streetplan';
import { STADIUM_RECTS } from '../src/scripts/city3d/stadium';
import { FENCES } from '../src/scripts/city3d/ruralfence';

const inRect = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const distSeg = ([px, pz]: Pt, [a, b]: [Pt, Pt]) => {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t));
};
const fenceDist = (p: Pt) => Math.min(...FENCE_RUNS.map((r) => distSeg(p, r)));

test('the fence: a closed line that wanders, across the whole north, inside the wall and clear of its floodlights', () => {
  // (its runs never square to each other along a side: no straight rectangle of land)
  let square = 0;
  for (let i = 0; i < FENCE.length; i++) {
    const [a, b] = [FENCE[i], FENCE[(i + 1) % FENCE.length]];
    if (a[0] === b[0] || a[1] === b[1]) square++;
  }
  // (the wall gate's yard is square to the wall: its two sides and its face; everything else slants)
  assert.ok(square <= 3, `${square} runs square to the axes`);
  // From the west wall to Crestmont's hills, north of the stadium
  assert.ok(AIRBASE_RECT[0] < -720 && AIRBASE_RECT[2] < 285 && AIRBASE_RECT[2] > 260);
  const stadiumN = Math.min(...STADIUM_RECTS.map((r) => r[1]));
  for (let x = FENCE[0][0]; x <= 262; x += 4) assert.ok(southFenceZ(x) < stadiumN - 40, `the fence at x ${x} is too near the stadium`);
  // About the size of the whole built city: a sixth of the land inside the wall
  let n = 0;
  for (let x = AIRBASE_RECT[0]; x < AIRBASE_RECT[2]; x += 2) for (let z = AIRBASE_RECT[1]; z < AIRBASE_RECT[3]; z += 2) if (inAirbase(x, z)) n += 4;
  // (on the site's own world: a wider one's wall is further off, and the wall gate's yard runs on to it)
  assert.ok(n > 400000 && (WALL_INNER[1] !== -760 || n < 430000), `${n} square tiles`);
  // Inside the wall, with grass to its foot all round (but the yard, which meets it)
  for (const p of FENCE) {
    assert.ok(p[0] > WALL_INNER[0] + 20 && p[0] < WALL_INNER[2] && p[1] >= WALL_INNER[1]);
    if (p[1] > WALL_INNER[1]) assert.ok(p[1] > WALL_INNER[1] + 20 || (p[0] >= WALL_GATE[0] - 25 && p[0] <= WALL_GATE[2] + 25), `the fence at ${p} by the wall`);
  }
  for (const f of FLOODS) assert.ok(fenceDist([f.x, f.z]) > 15 || inRect(WALL_GATE, f.x, f.z, 25), `a floodlight at ${f.x}, ${f.z} by the fence`);
});

test('the wall gate stands in a gap between the floodlights, with no camera on it, and the parade avenue reaches it', () => {
  // (on the site's own world, where the owner signed it off)
  if (WALL_INNER[1] === -760) assert.deepEqual(WALL_GATE, [-49, -758, -19, -746]);
  for (const f of FLOODS.filter((q) => q.side === 'n')) assert.ok(f.x < WALL_GATE[0] || f.x > WALL_GATE[2], `a floodlight at x ${f.x} on the gate`);
  for (const c of CAMERAS.filter((q) => q.side === 'n')) assert.ok(c.x < WALL_GATE[0] || c.x > WALL_GATE[2], `a camera at x ${c.x} on the gate`);
  assert.equal(WALL_GATE[1], WALL_INNER[1] + 2);
  // The avenue: straight north from the main gate in line with the road, then bending to the wall gate
  assert.deepEqual(AVENUE[0], [MAIN_GATE.x, MAIN_GATE.z]);
  assert.equal(AVENUE[1][0], MAIN_GATE.x);
  const end = AVENUE[AVENUE.length - 1];
  assert.ok(inRect(WALL_GATE, end[0], end[1], 0.01));
  for (let i = 1; i < AVENUE.length; i++) for (let k = 0; k <= 10; k++) {
    const [a, b] = [AVENUE[i - 1], AVENUE[i]];
    const p: Pt = [a[0] + ((b[0] - a[0]) * k) / 10, a[1] + ((b[1] - a[1]) * k) / 10];
    assert.ok(inAirbase(p[0], p[1] - 0.5) || p[1] < -735, `the avenue outside the fence at ${p}`);
  }
});

test('both country roads end at their gates: a turning loop in front of each shut gate, open toward it', () => {
  assert.equal(GATES.length, 2);
  const want: Record<string, Pt> = { 'ns0-n': [-4.5, -292], 'ns3-n': [64.5, -294] };
  for (const g of GATES) {
    // On the fence's line, on its road's line
    assert.ok(fenceDist([g.x - g.half - 0.01, g.z]) < 0.5 && fenceDist([g.x + g.half + 0.01, g.z]) < 0.5);
    const r = RURAL_RUNS.find((q) => q.id === g.road);
    assert.ok(r && r.gated && r.c === g.x, `${g.road} doesn't end at the ${g.name}`);
    assert.equal(r.to, GATE_ROAD_ENDS[g.road]);
    // Its loop where the plan put it, its far side and its fence short of the barrier
    assert.ok(Math.hypot(r.centre[0] - want[g.road][0], r.centre[1] - want[g.road][1]) < 0.5, `${g.road}'s loop at ${r.centre}`);
    assert.ok(Math.abs(r.centre[1] - (g.z + LOOP_SHORT)) < 1e-9);
    const [, bz] = barrierOf(g)[0];
    assert.ok(r.centre[1] - RURAL.turn - RURAL.half > bz + 2);
    // The loop's fence: two arcs, open to the road and to the gate
    const rings = FENCES.filter((f) => f.run === g.road && f.pts.length > 2);
    assert.equal(rings.length, 2);
    for (const f of rings) for (const p of f.pts) assert.ok(Math.abs(p[0] - g.x) > RURAL.half + 0.5, `${g.road}'s loop's fence across its way at ${p}`);
    // The guardhouse inside the fence, the barrier outside it
    const gh = guardhouseOf(g);
    assert.ok(inAirbase(gh[0], gh[1]) && inAirbase(gh[2], gh[3]));
    for (const p of barrierOf(g)) assert.ok(!inAirbase(...p));
  }
  // Nothing else of the north's country roads left past the gates: the town's pieces end where they did
  for (const id of ['ns0', 'ns3']) for (const p of PLAN.streets.find((s) => s.id === id)!.pts) assert.ok(p[1] > -250, `${id} runs on to ${p}`);
  for (const s of PLAN.streets) for (const p of s.pts) assert.ok(!inAirbase(...p), `${s.id} inside the base at ${p}`);
});

test('the fence and its shut gates are solid, too high to climb; nothing in town stands on it', () => {
  const fence = AIRBASE_SOLIDS.filter((b) => b[4] === FENCE_H);
  assert.ok(fence.length > 500);
  // (thin: a slanting run's pieces at most 0.3 wider than the fence, as Lot 9's)
  for (const b of fence) assert.ok(Math.min(b[2] - b[0], b[3] - b[1]) < 0.41 && Math.max(b[2] - b[0], b[3] - b[1]) > 0.09, `a fence box ${b}`);
  // Each gate's opening is closed (a box across it at the fence's height)
  for (const g of GATES) assert.ok(fence.some((b) => b[0] <= g.x && b[2] >= g.x && b[1] <= g.z && b[3] >= g.z), `the ${g.name} open`);
  // A walk along every country road keeps off the fence
  for (const r of RURAL_RUNS) for (let v = Math.min(r.from, r.to); v <= Math.max(r.from, r.to); v += 2) {
    const p: Pt = r.axis === 'x' ? [v, r.c] : [r.c, v];
    assert.ok(fenceDist(p) > RURAL.half + 1, `${r.id} on the fence at ${p}`);
  }
  for (const s of PLAN.streets.filter((q) => q.kind !== 'rural')) for (const p of s.pts) assert.ok(fenceDist(p) > s.half + 1, `${s.id} on the fence at ${p}`);
});

test("the visitors' car park and centre outside the main gate, off the road, clear of the stadium's car park", () => {
  for (const r of [VISITORS, VISITOR_CENTRE, VISITORS_DRIVE]) for (const [x, z] of [[r[0], r[1]], [r[2], r[3]], [r[0], r[3]], [r[2], r[1]]] as Pt[]) assert.ok(!inAirbase(x, z) && fenceDist([x, z]) > 5);
  assert.ok(inRect(VISITORS, VISITOR_CENTRE[0], VISITOR_CENTRE[1], 0.01) && inRect(VISITORS, VISITOR_CENTRE[2], VISITOR_CENTRE[3], 0.01));
  // (the stadium's car park's loop reaches z -251)
  assert.ok(VISITORS[3] < -255);
  for (const s of PLAN.streets) for (let x = VISITORS[0]; x <= VISITORS[2]; x += 2) for (let z = VISITORS[1]; z <= VISITORS[3]; z += 2) assert.ok(distToStreet(s, [x, z]) > s.half, `${s.id} through the car park at ${x}, ${z}`);
  // Its drive meets the north avenue's road, south of its loop
  const ns0n = PLAN.streets.find((s) => s.id === 'ns0-n')!;
  assert.ok(distToStreet(ns0n, [VISITORS_DRIVE[2] + 0.1, (VISITORS_DRIVE[1] + VISITORS_DRIVE[3]) / 2]) < ns0n.half + 0.1);
  assert.ok(!inRect(VISITOR_CENTRE, VISITOR_SPAWN.x, VISITOR_SPAWN.z, 0.5) && inRect(VISITORS, VISITOR_SPAWN.x, VISITOR_SPAWN.z));
});

test('the lots kept for the airfield and the base are inside the fence', () => {
  for (const k of KEPT) for (const [x, z] of [[k.rect[0], k.rect[1]], [k.rect[2], k.rect[3]], [k.rect[0], k.rect[3]], [k.rect[2], k.rect[1]]] as Pt[]) assert.ok(inAirbase(x, z), `${k.id} outside at ${x}, ${z}`);
});
