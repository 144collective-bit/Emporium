// The kart park's facility (kartfacility.ts, the north side's stage 2): trackside past the run-off and never solid,
// the stands, banks, paddock and plaza clear of the circuit, the floodlights and buildings under the Emporium, the
// car park in its loop off Kart Road, and the park reached by road and by the metro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCH,
  BANKS,
  BARRIERS,
  BAYS,
  CAR_PARK,
  CATCH,
  FACILITY_SOLIDS,
  FLOOD,
  FLOODLIGHTS,
  GRANDSTAND,
  KART_AREA,
  KART_LAMPS,
  KART_PEOPLE,
  KART_RECTS,
  KART_TREES,
  KIOSK,
  PADDOCK,
  PARKED,
  PLAZA,
  TENTS,
  TERRACE,
  TOWER,
  TYRE_WALLS,
  bankAt,
  bankY,
  tierAt,
  worldRect,
} from '../src/scripts/city3d/kartfacility';
import { CIRCUIT, CLEAR, HUT_DOOR, PIT_LANE, SITE } from '../src/scripts/city3d/kartcircuit';
import { GATE, KART_PARK, KART_SPAWN, LOOP, ROAD, toLocal, toWorld } from '../src/scripts/city3d/kartpark';
import { SOLIDS, SOLID_GRID } from '../src/scripts/city3d/solids';
import { OUTER_SLIPS, PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { HIGHWAY_HALF, fromHighway } from '../src/scripts/city3d/highway';
import { STATIONS } from '../src/scripts/city3d/metro';
import { treeSpot } from '../src/scripts/city3d/outskirts';

const lineDist = (c: { x: Float64Array; z: Float64Array }, x: number, z: number) => {
  let b = Infinity;
  for (let i = 0; i < c.x.length; i++) b = Math.min(b, Math.hypot(c.x[i] - x, c.z[i] - z));
  return b;
};
const inSite = (x: number, z: number, m = 0) => x > KART_PARK.x0 + m && x < KART_PARK.x1 - m && z > KART_PARK.z0 + m && z < KART_PARK.z1 - m;
const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
/** Under the Emporium's roof (about 12.5; its tallest neighbours keep under 11.5) */
const TALL = 11.5;

test('trackside: armco and tyre walls past the run-off all round, inside the fence, catch fencing in front of the spectators', () => {
  const posts = BARRIERS.flat();
  const tyres = TYRE_WALLS.flat();
  assert.ok(BARRIERS.length >= 6 && posts.length > 150, `${posts.length} armco posts`);
  assert.ok(tyres.length > 100, `${tyres.length} tyre stacks`);
  for (const [x, z] of posts) {
    assert.ok(lineDist(CIRCUIT, x, z) > CLEAR + 0.2, `armco in the run-off at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    assert.ok(lineDist(PIT_LANE, x, z) > 1.5, 'armco across the pit lane');
    assert.ok(inSite(x, z, 0.5));
  }
  for (const [x, z] of tyres) {
    assert.ok(lineDist(CIRCUIT, x, z) > CLEAR - 0.2, `tyres in the run-off at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    assert.ok(inSite(x, z, 0.5));
  }
  // Every run's posts a couple of tiles apart, so the rail between them is short
  for (const run of BARRIERS) for (let k = 1; k < run.length; k++) assert.ok(Math.hypot(run[k][0] - run[k - 1][0], run[k][1] - run[k - 1][1]) < 4);
  // Catch fencing in front of the grandstand and every bank, between them and the circuit
  assert.equal(CATCH.length, BANKS.length + 1);
  for (const [a, c] of CATCH)
    for (let t = 0; t <= 1; t += 0.1) {
      const [x, z] = toWorld([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]);
      assert.ok(lineDist(CIRCUIT, x, z) > CLEAR, 'catch fencing in the run-off');
    }
  // None of it is solid (the owner's call: nothing to bump into on or beside the track)
  for (const [x, z] of [...posts, ...tyres]) assert.ok(!SOLID_GRID.near(x, z, 0.1).some((b) => inBox(b, x, z, 0.05)), `something solid at ${x.toFixed(1)}, ${z.toFixed(1)}`);
});

test('the stands, banks, paddock, plaza and buildings: on the site, clear of the circuit, the pits and each other, under the Emporium', () => {
  const rects = { grandstand: GRANDSTAND, tower: TOWER, kiosk: KIOSK, stairs: TERRACE.stairs, plaza: PLAZA, paddock: PADDOCK, ...Object.fromEntries(BANKS.map((b) => [b.id, b])) };
  for (const [id, r] of Object.entries(rects)) {
    const [x0, z0, x1, z1] = worldRect(r);
    assert.ok(inSite(x0, z0) && inSite(x1, z1), `${id} off the site`);
    for (let u = r.u0; u <= r.u1; u += 1)
      for (let v = r.v0; v <= r.v1; v += 1) {
        const [x, z] = toWorld([u, v]);
        assert.ok(lineDist(CIRCUIT, x, z) > CLEAR + 0.5, `${id} in the run-off at ${u}, ${v}`);
        assert.ok(lineDist(PIT_LANE, x, z) > 1.8, `${id} on the pit lane at ${u}, ${v}`);
      }
  }
  // Built things off each other and off the circuit's own buildings
  const built = [GRANDSTAND, TOWER, KIOSK, TERRACE.stairs, SITE.hut, SITE.garages, SITE.stand];
  for (let i = 0; i < built.length; i++)
    for (let j = i + 1; j < built.length; j++) {
      const [a, b] = [built[i], built[j]];
      assert.ok(a.u1 <= b.u0 || b.u1 <= a.u0 || a.v1 <= b.v0 || b.v1 <= a.v0, `${i} and ${j} overlap`);
    }
  // The terrace's stairs against the hut's west wall
  assert.ok(Math.abs(TERRACE.stairs.u1 - SITE.hut.u0) < 0.3 && TERRACE.y === SITE.hut.h);
  // Under the Emporium
  assert.ok(GRANDSTAND.roof + 0.6 < TALL && TOWER.h < TALL && FLOOD.h + FLOOD.head < TALL && ARCH.h + 1.5 < TALL);
  assert.ok(tierAt(GRANDSTAND.tiers - 1).y + 1.7 < GRANDSTAND.roof, 'head room under the roof');
  // The tents in the paddock, apart
  for (const t of TENTS) assert.ok(t.u > PADDOCK.u0 && t.u < PADDOCK.u1 && t.v > PADDOCK.v0 && t.v < PADDOCK.v1);
});

test('the banks: up from the front, a flat top, down at the back; nothing under them; walkable', () => {
  for (const b of BANKS) {
    const mid = (b.u0 + b.u1) / 2;
    const midV = (b.v0 + b.v1) / 2;
    // Their edges at the lawn
    for (const [u, v] of [
      [b.u0, midV],
      [b.u1, midV],
      [mid, b.v0],
      [mid, b.v1],
    ])
      assert.ok(bankAt(b, u, v) < 1e-6, `${b.id} stands up at its edge`);
    // Rising from the front
    const front = b.front === 's' ? [mid, b.v1 - 0.5] : b.front === 'e' ? [b.u1 - 0.5, midV] : [b.u0 + 0.5, midV];
    const back = b.front === 's' ? [mid, b.v0 + (b.v1 - b.v0) * 0.2] : b.front === 'e' ? [b.u0 + (b.u1 - b.u0) * 0.2, midV] : [b.u1 - (b.u1 - b.u0) * 0.2, midV];
    assert.ok(bankAt(b, front[0], front[1]) < bankAt(b, back[0], back[1]), `${b.id} rises away from the track`);
    assert.ok(Math.abs(bankAt(b, back[0], back[1]) - b.h) < 1e-6);
    // Walking up it: never a step over a quarter tile in a tenth
    for (let t = 0; t < 1; t += 0.01) {
      const p = (k: number) => (b.front === 's' ? toWorld([mid, b.v1 - (b.v1 - b.v0) * k]) : b.front === 'e' ? toWorld([b.u1 - (b.u1 - b.u0) * k, midV]) : toWorld([b.u0 + (b.u1 - b.u0) * k, midV]));
      const [x0, z0] = p(t);
      const [x1, z1] = p(t + 0.01);
      assert.ok(Math.abs(bankY(x1, z1) - bankY(x0, z0)) < 0.25 * Math.max(1, Math.hypot(x1 - x0, z1 - z0) / 0.1));
    }
  }
  for (const s of FACILITY_SOLIDS)
    for (const b of BANKS) {
      const [x, z] = [(s[0] + s[2]) / 2, (s[1] + s[3]) / 2];
      const [u, v] = toLocal([x, z]);
      assert.ok(bankAt(b, u, v) === 0, 'something solid on a bank');
    }
});

test('the people: on the banks at their height, in the grandstand on its tiers, on the terrace; facing the track; half left out on phones', () => {
  assert.ok(KART_PEOPLE.length > 60);
  const trimmed = KART_PEOPLE.filter((p) => p.trim).length;
  assert.ok(Math.abs(trimmed - KART_PEOPLE.length / 2) <= 1);
  for (const p of KART_PEOPLE) {
    assert.ok(inSite(p.x, p.z, 0.5), 'off the site');
    assert.ok(lineDist(CIRCUIT, p.x, p.z) > CLEAR + 0.5, 'someone on the run-off');
    const [u, v] = toLocal([p.x, p.z]);
    const onBank = BANKS.some((b) => bankAt(b, u, v) > 0);
    if (onBank) assert.ok(Math.abs(p.y - bankY(p.x, p.z)) < 1e-9, 'standing in a bank');
    if (p.act !== 'sit' && !onBank) assert.ok(!SOLID_GRID.near(p.x, p.z, 0.2).some((b) => inBox(b, p.x, p.z, 0.1)) || Math.abs(p.y - TERRACE.y - 0.16) < 1e-9, 'standing in something solid');
  }
  // The banks' people face the track, roughly
  for (const p of KART_PEOPLE.filter((q) => BANKS.some((b) => bankAt(b, ...toLocal([q.x, q.z])) > 0))) {
    let best = Infinity;
    let at: [number, number] = [0, 0];
    for (let i = 0; i < CIRCUIT.x.length; i++) {
      const d = Math.hypot(CIRCUIT.x[i] - p.x, CIRCUIT.z[i] - p.z);
      if (d < best) [best, at] = [d, [CIRCUIT.x[i], CIRCUIT.z[i]]];
    }
    const want = Math.atan2(at[0] - p.x, at[1] - p.z);
    assert.ok(Math.cos(want - p.ry) > 0.9);
  }
  assert.ok(KART_PEOPLE.filter((p) => p.act === 'sit').length > 20, 'a crowd in the grandstand');
});

test('the gate, the plaza and the hut: in from Kart Road, clear to the hut\'s door', () => {
  const [gx0, gz0, gx1, gz1] = worldRect(PLAZA);
  assert.ok(KART_SPAWN.x > gx0 && KART_SPAWN.x < gx1 && KART_SPAWN.z > gz0 && KART_SPAWN.z < gz1, 'you walk in onto the plaza');
  // A clear way from inside the gate to the hut's door
  const blocked = (x: number, z: number) => SOLID_GRID.near(x, z, 0.3).some((b) => inBox(b, x, z, 0.3));
  for (let t = 0; t <= 1; t += 0.02) {
    const x = KART_SPAWN.x + (HUT_DOOR.x - KART_SPAWN.x) * t;
    const z = KART_SPAWN.z + (HUT_DOOR.z - KART_SPAWN.z) * t;
    assert.ok(!blocked(x, z), `the way to the hut is blocked at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  }
  // The arch's posts stand either side of the gate, not in it
  for (const x of [(GATE.x0 + GATE.x1) / 2 - 1.5, (GATE.x0 + GATE.x1) / 2, (GATE.x0 + GATE.x1) / 2 + 1.5]) assert.ok(!blocked(x, GATE.z), 'the gate is blocked');
  // The kiosk on the plaza, off the way in
  const [kx0, kz0, kx1, kz1] = worldRect(KIOSK);
  assert.ok(kx0 > gx0 && kx1 < gx1 && kz0 > gz0 && kz1 < gz1);
});

test('Kart Road and the car park: in the street plan off the east ring avenue, clear of the highway and the site', () => {
  const road = PLAN.streets.find((s) => s.id === 'kart-road')!;
  const loop = PLAN.streets.find((s) => s.id === 'kart-loop')!;
  assert.ok(road && loop && loop.oneway);
  assert.ok(PLAN.crossings.some((c) => c.id === 'kart-in' && c.streets.includes('ns3')));
  assert.ok(OUTER_SLIPS.includes('highway-ns3-0'));
  assert.equal(PLAN.streets.filter((s) => s.kind === 'slip' && s.id.startsWith('slip-highway-ns3-0-')).length, 4);
  for (const s of [road, loop])
    for (let i = 1; i < s.pts.length; i++)
      for (let k = 0; k <= 20; k++) {
        const p: [number, number] = [s.pts[i - 1][0] + ((s.pts[i][0] - s.pts[i - 1][0]) * k) / 20, s.pts[i - 1][1] + ((s.pts[i][1] - s.pts[i - 1][1]) * k) / 20];
        assert.ok(fromHighway(p[0], p[1]) > HIGHWAY_HALF + s.half + 6, `${s.id} too near the highway at ${p}`);
        assert.ok(!inSite(p[0], p[1], -s.half - 0.5), `${s.id} on the site at ${p}`);
      }
  // The car park inside the loop, its bays inside it, about half taken
  const [x0, z0, x1, z1] = CAR_PARK;
  assert.ok(x0 > LOOP.x0 + LOOP.half && x1 < LOOP.x1 - LOOP.half && z0 > LOOP.z1 + LOOP.half && z1 < ROAD.z - ROAD.half);
  assert.ok(BAYS.length >= 40);
  for (const b of BAYS) assert.ok(b.x - 2.2 >= x0 - 1e-9 && b.x + 2.2 <= x1 + 1e-9 && b.z > z0 && b.z < z1, 'a bay inside');
  assert.ok(PARKED.length > BAYS.length * 0.35 && PARKED.length < BAYS.length * 0.75);
  for (const [x, z] of KART_LAMPS) for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, [x, z]) > s.half + 0.2, `a lamp on ${s.id}`);
});

test('the metro\'s Kart Park station at the corner of Kart Road, a short walk from the gate', () => {
  const st = STATIONS.find((s) => s.id === 'kart')!;
  assert.ok(st.door.z < ROAD.z - ROAD.half - 1 && st.door.z > ROAD.z - 12, 'just north of Kart Road');
  assert.ok(Math.hypot(st.door.x - (GATE.x0 + GATE.x1) / 2, st.door.z - GATE.z) < 70);
  for (const b of FACILITY_SOLIDS) assert.ok(!(st.tower[0] < b[2] && st.tower[2] > b[0] && st.tower[1] < b[3] && st.tower[3] > b[1]), 'the station tower in something');
  for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, [(st.tower[0] + st.tower[2]) / 2, (st.tower[1] + st.tower[3]) / 2]) > s.half + 1, `the tower on ${s.id}`);
});

test('solids in the city\'s; the outskirts\' trees keep off it all, the park\'s own trees on its lawns', () => {
  for (const b of FACILITY_SOLIDS) assert.ok(SOLIDS.includes(b));
  for (const f of FLOODLIGHTS) assert.ok(lineDist(CIRCUIT, f.x, f.z) > CLEAR + 1, 'a floodlight in the run-off');
  assert.ok(FLOODLIGHTS.length >= 8);
  for (let x = KART_AREA[0]; x < KART_AREA[2]; x += 3) for (let z = KART_AREA[1]; z < KART_AREA[3]; z += 3) if (KART_RECTS.some((r) => inBox(r, x, z))) assert.ok(!treeSpot(x, z), `an outskirts tree at ${x}, ${z}`);
  assert.ok(KART_TREES.length > 30);
  for (const [x, z] of KART_TREES) {
    assert.ok(inSite(x, z, 0.5) && lineDist(CIRCUIT, x, z) > CLEAR + 1.5, 'a tree on the run-off');
    assert.ok(!SOLID_GRID.near(x, z, 0.4).some((b) => inBox(b, x, z, 0.4)), 'a tree in something solid');
    const [u, v] = toLocal([x, z]);
    assert.ok(!BANKS.some((b) => bankAt(b, u, v) > 0), 'a tree on a bank');
  }
});
