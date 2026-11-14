// Endswood, re-laid (endswood.ts on south.ts; docs/south-plan.md Phase 1b, the owner's calls): the estate's land is its
// blocks and streets (not the fields round them, not Lot 9), sodium lamps along every street's sidewalk, bollards at each
// end of every footpath (walkers and bikes through, cars not); the old estate's streets are gone from the street plan,
// ns1s and ns2s end where they bend in, Lot Lane meets Lot 9's lane through its west gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENDSWOOD_RECT, ENDS_LAMPS, ENDS_SOLIDS, PATH_BOLLARDS, SLAB_Y, inEndswood } from '../src/scripts/city3d/endswood';
import { FOOTPATHS, LOT9_EDGE, NS_BENDS, SOUTH_BLOCKS, SOUTH_STREETS, type Pt } from '../src/scripts/city3d/south';
import { distTo, inside } from '../src/scripts/city3d/streetfaces';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { HW_EDGE } from '../src/scripts/city3d/endswood';
import { southLift } from '../src/scripts/city3d/southground';

const centroid = (poly: Pt[]): Pt => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];

test("its land: every street and block on it; the fields, Lot 9 and the ring road's north side off it", () => {
  for (const s of SOUTH_STREETS) for (const p of s.pts) assert.ok(inEndswood(p[0], p[1]), `${s.id} at ${p} off the land`);
  for (const b of SOUTH_BLOCKS) {
    const c = centroid(b.poly);
    if (inside(b.poly, c)) assert.ok(inEndswood(c[0], c[1]), `${b.id} off the land`);
  }
  // (the fields between Field Lane and Church Road, out west; the fields south of the brook)
  for (const [x, z] of [[-380, 410], [-360, 440], [-250, 600], [-60, 330 - 20]] as Pt[]) assert.ok(!inEndswood(x, z), `${x}, ${z} is the country's`);
  assert.ok(!inEndswood(-70, 515), "Lot 9's park is its own");
  for (const [x, z] of [[-76, 516], [-60, 590]] as Pt[]) assert.ok(inside(LOT9_EDGE, [x, z]) && !inEndswood(x, z));
  assert.ok(ENDSWOOD_RECT[1] > HW_EDGE, 'south of the ring road');
  // (a margin round it reaches a little way past its edge, and further in from it shrinks)
  assert.ok(inEndswood(-380, 342 - 4, 3));
  assert.ok(!inEndswood(-82, 418, -40));
});

test('sodium lamps along every street: on its sidewalk, never on the asphalt, apart, plenty of them', () => {
  assert.ok(ENDS_LAMPS.length > 80, `${ENDS_LAMPS.length} lamps`);
  for (const [x, z, ry, y] of ENDS_LAMPS) {
    // (on the sidewalk's top, lifted by the south's rolling ground: southground.ts)
    assert.equal(y, SLAB_Y + southLift(x, z));
    assert.ok(inEndswood(x, z), `a lamp at ${x}, ${z} off the land`);
    for (const s of PLAN.streets) if (s.kind !== 'highway' && s.kind !== 'ramp') assert.ok(distToStreet(s, [x, z]) > s.half + 0.2, `a lamp on ${s.id} at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    // (its arm over the nearest street: (cos ry, -sin ry) points at its asphalt)
    const near = SOUTH_STREETS.reduce((b, s) => (distTo(s.pts, [x, z], s.loop) < distTo(b.pts, [x, z], b.loop) ? s : b));
    const [ax, az] = [x + Math.cos(ry) * 0.9, z - Math.sin(ry) * 0.9];
    assert.ok(distTo(near.pts, [ax, az], near.loop) < distTo(near.pts, [x, z], near.loop), `a lamp at ${x.toFixed(1)}, ${z.toFixed(1)} reaching away from ${near.id}`);
    assert.ok(!SOLIDS.some((b) => x > b[0] - 0.2 && x < b[2] + 0.2 && z > b[1] - 0.2 && z < b[3] + 0.2), `a lamp in something solid at ${x}, ${z}`);
  }
  for (let i = 0; i < ENDS_LAMPS.length; i++)
    for (let j = i + 1; j < ENDS_LAMPS.length; j++) assert.ok(Math.hypot(ENDS_LAMPS[i][0] - ENDS_LAMPS[j][0], ENDS_LAMPS[i][1] - ENDS_LAMPS[j][1]) > 5.9, 'two lamps on top of each other');
  // (every main road and link has some)
  for (const s of SOUTH_STREETS.filter((q) => (q.kind === 'main' || q.kind === 'link') && !q.loop)) assert.ok(ENDS_LAMPS.some(([x, z]) => distTo(s.pts, [x, z]) < s.half + 1), `no lamps on ${s.id}`);
});

test('bollards at each end of every footpath: off the asphalt, a walker\'s way between them, all solid', () => {
  assert.equal(ENDS_SOLIDS.length, PATH_BOLLARDS.length);
  // (by its footprint: on the rolling ground it's a lifted copy, solids.ts `onGround()`)
  for (const b of ENDS_SOLIDS) assert.ok(SOLIDS.some((q) => q[0] === b[0] && q[1] === b[1] && q[2] === b[2] && q[3] === b[3]), 'a bollard not in the solids');
  for (const [x, z] of PATH_BOLLARDS)
    for (const s of PLAN.streets) if (s.kind !== 'highway' && s.kind !== 'ramp') assert.ok(distToStreet(s, [x, z]) > s.half + 0.15, `a bollard on ${s.id} at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  for (const f of FOOTPATHS) {
    const mine = PATH_BOLLARDS.filter((p) => distTo(f.pts, p) < 1);
    assert.ok(mine.length >= 2, `${f.id}: its bollards`);
  }
});

test("the street plan: the old estate's streets gone, the south's in, ns1s and ns2s ending at their bends, Lot Lane into Lot 9", () => {
  assert.ok(!PLAN.streets.some((s) => s.id.startsWith('ends-')), "the old estate's streets are gone");
  for (const s of SOUTH_STREETS) assert.ok(PLAN.streets.some((q) => q.id === s.id), `${s.id} not in the plan`);
  for (const [id, z] of Object.entries(NS_BENDS)) {
    const s = PLAN.streets.find((q) => q.id === id)!;
    assert.equal(Math.max(...s.pts.map((p) => p[1])), z, `${id} ends at its bend`);
    assert.ok(!PLAN.streets.some((q) => q.id === `${id}-s`), `${id} has no country road on south`);
  }
  const w = PLAN.crossings.find((c) => c.id === 'lot9-w')!;
  assert.ok(w.streets.includes('south-lot') && w.streets.includes('lot9-road'));
  for (const b of SOUTH_BLOCKS) assert.ok(PLAN.blocks.some((q) => q.id === b.id), `${b.id} not in the plan`);
});
