// Uptown's people (uptownlife.ts, docs/finance-plan.md Phase 6): walkers round its blocks, joggers on the esplanade
// clear of its planters and of each other, cyclists in the one-way pair's bike lanes the way the street runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIKE_LANES, BIKE_PACE, CYCLISTS, JOG, UPTOWN_PEOPLE, UPTOWN_WALKS, cyclistAt, samplePeople } from '../src/scripts/city3d/uptownlife';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { BIKE, COUPLET } from '../src/scripts/city3d/uptown';
import { LAND_TREES, PLANTER_R, WATER_TREES, onEsplanade } from '../src/scripts/city3d/boulevard';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PARK_PEOPLE } from '../src/scripts/city3d/parklife';

test('the walkers go round blocks in the street plan; the people have their own ids', () => {
  for (const id of UPTOWN_WALKS) assert.ok(PLAN.blocks.some((b) => b.id === id), id);
  const ids = [...UPTOWN_PEOPLE, ...PARK_PEOPLE].map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('the joggers: on the esplanade, clear of its planters and of each other, at a jog', () => {
  const S = samplePeople(0.25, 200).filter((s) => s.id.startsWith('esplanade'));
  assert.ok(S.length > 0);
  for (const s of S) {
    assert.ok(onEsplanade(s.at[0], s.at[1], 0.3), `${s.id} off the esplanade at ${s.at}`);
    assert.equal(s.clip, 'jog');
    for (const [x, z] of [...LAND_TREES, ...WATER_TREES]) assert.ok(Math.hypot(x - s.at[0], z - s.at[1]) > PLANTER_R + 0.28, `${s.id} in a planter at ${s.at}`);
    assert.ok(!SOLIDS.some((b) => s.at[0] > b[0] - 0.25 && s.at[0] < b[2] + 0.25 && s.at[1] > b[1] - 0.25 && s.at[1] < b[3] + 0.25), `${s.id} in something solid`);
  }
  // Never two in one place at one time
  const per = UPTOWN_PEOPLE.filter((p) => p.id.startsWith('esplanade')).length;
  for (let i = 0; i < S.length; i += per)
    for (let a = i; a < i + per; a++) for (let b = a + 1; b < i + per; b++) assert.ok(Math.hypot(S[a].at[0] - S[b].at[0], S[a].at[1] - S[b].at[1]) > 0.6);
  assert.ok(JOG.west - JOG.east > 0.6, 'the two lines apart');
});

test('the cyclists: in the bike lanes on the kerb side, the way the one-way street runs, apart, on the road', () => {
  assert.equal(BIKE_LANES.length, 2);
  for (const lane of BIKE_LANES) {
    const street = PLAN.streets.find((s) => s.id === (lane.dir === -1 ? 'uptown-ns1' : 'uptown-ns2'))!;
    assert.equal(lane.x, street.pts[0][0] + (lane.dir === -1 ? 1 : -1) * BIKE.off);
    // (the street's one way: its points run south, so northbound is against them)
    assert.equal(lane.dir, street.oneway);
    assert.ok(Math.abs(lane.x - street.pts[0][0]) < street.half - BIKE.w / 2, 'on the asphalt');
  }
  assert.equal(BIKE_LANES[0].x, COUPLET.north + BIKE.off);
  const at = { x: 0, z: 0, ry: 0 };
  const prev = CYCLISTS.map((c) => ({ ...cyclistAt(c, 0, at) }));
  for (let t = 0.1; t < 120; t += 0.1) {
    const now = CYCLISTS.map((c) => ({ ...cyclistAt(c, t, at) }));
    now.forEach((p, i) => {
      const lane = CYCLISTS[i].lane;
      assert.ok(p.z >= lane.z0 - 1e-9 && p.z <= lane.z1 + 1e-9);
      // Riding the lane's way (but where it starts again at the far end)
      const dz = p.z - prev[i].z;
      if (Math.abs(dz) < 1) assert.ok(Math.sign(dz) === lane.dir && Math.abs(dz - lane.dir * BIKE_PACE * 0.1) < 1e-6);
      // Facing the way they ride (life.ts's ry: 0 looks +z)
      assert.ok(Math.abs(Math.cos(p.ry) - lane.dir) < 1e-9);
      for (let j = i + 1; j < now.length; j++) assert.ok(Math.hypot(p.x - now[j].x, p.z - now[j].z) > 2, 'two bikes in one place');
    });
    prev.splice(0, prev.length, ...now);
  }
});
