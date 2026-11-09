// The kart park's facility (kartfacility.ts, the north side's stage 2): trackside past the run-off and never solid,
// the stands, banks, paddock and plaza clear of the circuit, the floodlights and buildings under the Emporium, the
// car park in its loop off Kart Road, and the park reached by road and by the metro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rampLand } from '../src/scripts/city3d/viaduct';
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
  APPROACH_SIGNS,
  CAFE,
  CLUBHOUSE,
  COACHES,
  COACH_LOT,
  FLAGS,
  PODIUM,
  PODIUM_RECT,
  TOTEM,
  bankLand,
  screenLegs,
  SCREENS,
  STATION_WALK,
  bankY,
  tierAt,
  worldRect,
} from '../src/scripts/city3d/kartfacility';
import { rollsAt } from '../src/scripts/city3d/rolls';
import { keptOff } from '../src/scripts/city3d/landuse';
import { CIRCUIT, CLEAR, HUT_DOOR, PIT_LANE, SITE } from '../src/scripts/city3d/kartcircuit';
import { GATE, KART_PARK, KART_SPAWN, LOOP, ROAD, toLocal, toWorld } from '../src/scripts/city3d/kartpark';
import { SOLIDS, SOLID_GRID } from '../src/scripts/city3d/solids';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
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
    assert.ok(inSite(x0 + 1e-6, z0 + 1e-6) && inSite(x1 - 1e-6, z1 - 1e-6), `${id} off the site`);
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

test('the banks: up from the front, a flat top to the fence, the berm down outside it; nothing under them; walkable', () => {
  for (const b of BANKS) {
    const mid = (b.u0 + b.u1) / 2;
    const midV = (b.v0 + b.v1) / 2;
    const land = bankLand(b);
    // Their front, their ends and the berm's far edge at the lawn
    const edges: [number, number][] =
      b.front === 's'
        ? [[land.u0, midV], [land.u1, midV], [mid, land.v0], [mid, b.v1]]
        : b.front === 'e'
          ? [[land.u0, midV], [b.u1, midV], [mid, land.v0], [mid, land.v1]]
          : [[b.u0, midV], [land.u1, midV], [mid, land.v0], [mid, land.v1]];
    for (const [u, v] of edges) assert.ok(bankAt(b, u, v) < 1e-6, `${b.id} stands up at its edge`);
    // Its back at the fence, at its full height, the fence's line its own
    const fence = b.front === 's' ? toWorld([mid, b.v0]) : b.front === 'e' ? toWorld([b.u0, midV]) : toWorld([b.u1, midV]);
    assert.ok(Math.abs(bankY(...fence) - b.h) < 1e-6, `${b.id}'s top reaches the fence`);
    assert.ok(Math.abs(fence[0] - KART_PARK.x0) < 1e-6 || Math.abs(fence[0] - KART_PARK.x1) < 1e-6 || Math.abs(fence[1] - KART_PARK.z0) < 1e-6, `${b.id}'s back on the fence`);
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
  // (the screens' legs stand on them, on purpose)
  const legs = new Set(SCREENS.flatMap((sc) => screenLegs(sc).map(([u, v]) => worldRect({ u0: u - 0.25, v0: v - 0.25, u1: u + 0.25, v1: v + 0.25 }).join())));
  for (const s of FACILITY_SOLIDS.filter((b) => !legs.has(b.slice(0, 4).join())))
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

test('Kart Road and the car park: in the street plan off the north avenue (ew0) west of the highway, clear of the highway and the site', () => {
  const road = PLAN.streets.find((s) => s.id === 'kart-road')!;
  const loop = PLAN.streets.find((s) => s.id === 'kart-loop')!;
  assert.ok(road && loop && loop.oneway);
  assert.ok(PLAN.crossings.some((c) => c.id === 'kart-in' && c.streets.includes('ew0')));
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

test('the metro\'s Kart Park station on the north bank avenue west of the highway, a walk up to the gate', () => {
  const st = STATIONS.find((s) => s.id === 'kart')!;
  assert.ok(st.door.x < -215 - 20 && st.door.z > 43 && st.door.z < 64.5, 'by the north bank avenue, west of the highway');
  assert.ok(Math.hypot(st.door.x - (GATE.x0 + GATE.x1) / 2, st.door.z - GATE.z) < 160, 'a walk up to the gate');
  for (const b of FACILITY_SOLIDS) assert.ok(!(st.tower[0] < b[2] && st.tower[2] > b[0] && st.tower[1] < b[3] && st.tower[3] > b[1]), 'the station tower in something');
  for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, [(st.tower[0] + st.tower[2]) / 2, (st.tower[1] + st.tower[3]) / 2]) > s.half + 1, `the tower on ${s.id}`);
  for (let x = st.tower[0]; x <= st.tower[2]; x += 0.5) for (let z = st.tower[1]; z <= st.tower[3]; z += 0.5) assert.ok(!rampLand(x, z), 'the tower on the ramps\' land');
});

test("the station walk (the polish plan's Phase 7): from the door past the tower to Kart Road's east end, flat, clear, over the streets on zebras", () => {
  const st = STATIONS.find((s) => s.id === 'kart')!;
  const W = STATION_WALK;
  const [first, ...rest] = W.pts;
  const last = rest[rest.length - 1];
  assert.ok(Math.abs(first[0] - st.door.x) < 1e-9 && first[1] > st.door.z && first[1] < st.door.z + 0.5, 'starts at the station door');
  assert.ok(Math.abs(last[0] - ROAD.x1) < 2 && Math.abs(last[1] - (ROAD.z - ROAD.half - 0.4)) < 0.5, "ends at Kart Road's sidewalk's east end");
  // Every street it meets, it crosses straight on a zebra of its own; the rest of the way is open land it has to itself
  const crossed = new Set<string>();
  for (let i = 1; i < W.pts.length; i++) {
    const [a, b] = [W.pts[i - 1], W.pts[i]];
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.5);
    for (let k = 0; k <= n; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / n;
      const z = a[1] + ((b[1] - a[1]) * k) / n;
      for (const s of PLAN.streets) {
        if (s.kind === 'alley' || distToStreet(s, [x, z]) >= s.half + W.half) continue;
        const zb = W.zebras.find((q) => q.street === s.id);
        if (s.id === 'kart-road' || s.id === 'ew3') continue; // (it starts beside the avenue and ends at Kart Road's end)
        assert.ok(zb, `${s.id} crossed with no zebra at ${x.toFixed(1)}, ${z.toFixed(1)}`);
        assert.ok(Math.abs(x - zb!.x) < 1e-6 && Math.abs(a[0] - b[0]) < 1e-9, `${s.id} crossed askew`);
        crossed.add(s.id);
      }
      // Nothing solid on it (the station tower's own wall along the door's stretch excepted: the pad runs under it)
      const near = SOLID_GRID.near(x, z, W.half).filter((bx) => inBox(bx, x, z, W.half - 0.05));
      for (const bx of near) assert.ok(i === 1 && bx.slice(0, 4).every((v, q) => Math.abs(v - st.tower[q]) < 1e-9), `something solid on the walk at ${x.toFixed(1)}, ${z.toFixed(1)}: ${bx.join()}`);
      // Flat open ground: the rolls keep off its land (landuse.ts KEEPS)
      assert.equal(rollsAt(x, z), 0, `the walk rolls at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      assert.ok(keptOff(x, z), `the trees may stand on the walk at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      assert.ok(!rampLand(x, z), "on the ramps' land");
    }
  }
  assert.deepEqual([...crossed].sort(), W.zebras.map((z) => z.street).sort());
  for (const zb of W.zebras) {
    const s = PLAN.streets.find((q) => q.id === zb.street)!;
    assert.ok(Math.abs(zb.z0 - (s.pts[0][1] - s.half)) < 1e-6 && Math.abs(zb.z1 - (s.pts[0][1] + s.half)) < 1e-6, `${zb.street}'s zebra spans its asphalt`);
  }
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

test('the clubhouse, the podium and the café: on the plaza and the pits, clear of the path, the kiosk, the lamps and each other', () => {
  const H = SITE.hut;
  assert.ok(H.h > 5.5 && H.h + 1.4 < TALL && CLUBHOUSE.floor < H.h - 2.5, 'two storeys and a roof terrace, under the Emporium');
  assert.ok(CLUBHOUSE.cabinet.u0 > H.u0 && CLUBHOUSE.cabinet.u1 < SITE.hut.door[0] - 1, 'the cabinet beside the door');
  // The podium: first in the middle and highest, second on its west, third on its east, behind its backdrop
  const [first, second, third] = PODIUM.steps;
  assert.ok(first.h > second.h && second.h > third.h && second.u1 === first.u0 && first.u1 === third.u0);
  assert.ok(PODIUM.back.v1 <= PODIUM.v0 && PODIUM.back.h + 1 < TALL);
  const inL = (r: { u0: number; v0: number; u1: number; v1: number }, u: number, v: number, m = 0) => u > r.u0 - m && u < r.u1 + m && v > r.v0 - m && v < r.v1 + m;
  for (const [u, v] of [
    [PODIUM_RECT.u0, PODIUM_RECT.v0],
    [PODIUM_RECT.u1, PODIUM_RECT.v1],
  ])
    assert.ok(inL(PLAZA, u, v), 'the podium on the plaza');
  const path = SITE.path;
  const onPath = (u: number, v: number, m: number) => (Math.abs(v - path.v) < path.half + m && u > path.u0 - path.half - m && u < path.u1 + m) || (Math.abs(u - path.u0) < path.half + m && v > path.v - m);
  for (let u = PODIUM_RECT.u0; u <= PODIUM_RECT.u1; u += 0.3) for (let v = PODIUM_RECT.v0; v <= PODIUM_RECT.v1; v += 0.3) assert.ok(!onPath(u, v, 0.4), 'the podium on the path');
  const lamps = KART_LAMPS.map(([x, z]) => toLocal([x, z]));
  for (const [u, v] of lamps) assert.ok(!inL(PODIUM_RECT, u, v, 0.4), 'a lamp in the podium');
  // The café's tables in front of the clubhouse, off the path, the podium, the kiosk and the lamps
  for (const [u, v] of CAFE) {
    assert.ok(inL(PLAZA, u, v, -1) && v > H.v1 + 2 && u > H.u0 && u < H.u1, 'a table in front of the clubhouse');
    assert.ok(!onPath(u, v, 1.3) && !inL(PODIUM_RECT, u, v, 1.4) && !inL(KIOSK, u, v, 1.5), 'a table in the way');
    for (const [lu, lv] of lamps) assert.ok(Math.hypot(lu - u, lv - v) > 1.4, 'a table by a lamp');
  }
  // The flags beside the path, not on it
  for (const f of FLAGS) assert.ok(inL(PLAZA, f.u, f.v) && !onPath(f.u, f.v, 0.6), 'a flag on the path');
});

test('the LED screens face the track: the garages\', and one on each of two banks\' tops, standing on them; under the Emporium', () => {
  assert.equal(SCREENS.length, 3);
  for (const sc of SCREENS) {
    assert.ok(sc.base + sc.h + 2.6 < TALL);
    const [x, z] = toWorld([sc.u, sc.v]);
    // Facing (sin ry, cos ry) in u, v: towards the circuit's nearest point
    let best = Infinity;
    let near: [number, number] = [0, 0];
    for (let i = 0; i < CIRCUIT.x.length; i++) {
      const d = Math.hypot(CIRCUIT.x[i] - x, CIRCUIT.z[i] - z);
      if (d < best) [best, near] = [d, [CIRCUIT.x[i] - x, CIRCUIT.z[i] - z]];
    }
    assert.ok(Math.sin(sc.ry) * near[0] + Math.cos(sc.ry) * near[1] > 0.6 * best, 'a screen facing away from the track');
    for (const [u, v] of screenLegs(sc)) {
      const top = Math.max(...BANKS.map((b) => bankAt(b, u, v)));
      assert.ok(top > 2.4, `a screen's leg off a bank's top (${top.toFixed(2)})`);
    }
  }
});

test('the approach: the totem, the signs and the coach park off every street and the ramps, the coaches in their bays; the berms clear too', () => {
  const streets = PLAN.streets.filter((s) => s.kind !== 'alley');
  for (const [x, z, m] of [[TOTEM.x, TOTEM.z, 1], ...APPROACH_SIGNS.map((a) => [a.x, a.z, 0.6])] as [number, number, number][]) {
    for (const s of streets) assert.ok(distToStreet(s, [x, z]) > s.half + m, `${x}, ${z} on ${s.id}`);
    assert.ok(!rampLand(x, z), 'on the ramps\' land');
  }
  const [x0, z0, x1, z1] = COACH_LOT;
  for (let x = x0; x <= x1; x += 0.5)
    for (let z = z0; z <= z1; z += 0.5) for (const s of streets) if (s.id !== 'kart-road') assert.ok(distToStreet(s, [x, z]) > s.half + 0.3, `the coach park on ${s.id}`);
  for (const [, x, z, yaw] of COACHES) assert.ok(x - 2.85 > x0 && x + 2.85 < x1 && z > z0 + 0.8 && z < z1 - 0.8 && Math.abs(Math.sin(yaw)) < 1e-9, 'a coach out of its bay');
  // The banks' berms: off the streets and the ramps' land, kept clear of the trees
  for (const b of BANKS) {
    const [bx0, bz0, bx1, bz1] = worldRect(bankLand(b));
    for (let x = bx0; x <= bx1; x += 1)
      for (let z = bz0; z <= bz1; z += 1) {
        assert.ok(!rampLand(x, z), 'a berm on the ramps\' land');
        for (const s of streets) assert.ok(distToStreet(s, [x, z]) > s.half + 1, `a berm on ${s.id}`);
        assert.ok(KART_RECTS.some((r) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]), 'a berm the trees may grow on');
      }
  }
});
