// The collision grid (boxgrid.ts, growth plan Phase 1): a check that only looks at the boxes near it
// must give exactly the answers the one-by-one check over every box gives, for walking, the walk
// camera, bullets, driving and flying, all over the city.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoxGrid } from '../src/scripts/city3d/boxgrid';
import { CAMERA_ONLY, SHOT_SOLIDS, SOLIDS, SOLID_GRID, TURNTABLE_BOX, rayBoxes, type Box } from '../src/scripts/city3d/solids';
import { newCar, reachOf, stepCar, tune, type DriveInput } from '../src/scripts/city3d/drive-sim';
import { TUNES, flyReach, newFlight, stepFly, type FlyInput } from '../src/scripts/city3d/flight-sim';
import { HANGAR_ROOF } from '../src/scripts/city3d/airfield';
import { DRIVE } from '../src/scripts/city3d/mycar';
import { WORLD_BOUNDS } from '../src/scripts/city3d/layout';

/** A seeded generator, so a failure can be run again */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(7);
const [X0, Z0, X1, Z1] = WORLD_BOUNDS;
/** A point somewhere in the world, half of them right by a solid box (where the answers matter) */
function spot(): [number, number] {
  if (r() < 0.5) return [X0 + r() * (X1 - X0), Z0 + r() * (Z1 - Z0)];
  const b = SOLIDS[Math.floor(r() * SOLIDS.length)];
  return [b[0] - 2 + r() * (b[2] - b[0] + 4), b[1] - 2 + r() * (b[3] - b[1] + 4)];
}
const inBox = (b: Box, x: number, z: number, pad = 0) => x > b[0] - pad && x < b[2] + pad && z > b[1] - pad && z < b[3] + pad;

test('a query returns every box touching the area, in the list order, and no others', () => {
  for (let k = 0; k < 4000; k++) {
    const [x, z] = spot();
    const w = r() * 20;
    const d = r() * 20;
    const got = SOLID_GRID.query(x, z, x + w, z + d);
    const want = SOLIDS.filter((b) => !(b[2] < x || b[0] > x + w || b[3] < z || b[1] > z + d));
    assert.deepEqual(got, want);
  }
  // A box exactly on a cell's edge, and boxes spanning many cells, are found from either side
  const g = new BoxGrid([
    [8, 8, 8, 8, 1],
    [-30, -2, 30, 2, 1],
  ]);
  assert.deepEqual(g.near(7.9, 8, 0.1), [[8, 8, 8, 8, 1]]);
  assert.equal(g.near(8.1, 8.1, 0.1).length, 1);
  assert.equal(g.query(-25, 0, -24, 0).length, 1);
  assert.equal(g.query(100, 100, 101, 101).length, 0);
});

test('walking: a step is blocked exactly where the one-by-one check blocks it', () => {
  const R = 0.32;
  let blocked = 0;
  for (let k = 0; k < 20000; k++) {
    const [x, z] = spot();
    const all = SOLIDS.some((b) => inBox(b, x, z, R));
    const near = SOLID_GRID.near(x, z, R).some((b) => inBox(b, x, z, R));
    assert.equal(near, all, `at ${x}, ${z}`);
    if (all) blocked++;
  }
  // (the test went where it matters: plenty of blocked steps)
  assert.ok(blocked > 2000, `only ${blocked} blocked steps`);
});

/** The one-by-one ray check, as rayBoxes did it before the grid */
function rayAll(from: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, max: number) {
  let t = max;
  if (dir.y < 0) t = Math.min(t, (from.y - 0.1) / -dir.y);
  const o = [from.x, from.y, from.z];
  const v = [dir.x, dir.y, dir.z];
  for (const b of [...SHOT_SOLIDS, ...CAMERA_ONLY]) {
    if (b[4] < 0.3) continue;
    const lo = [b[0], 0, b[1]];
    const hi = [b[2], b[4], b[3]];
    let t0 = 0;
    let t1 = t;
    let hit = true;
    for (let k = 0; k < 3 && hit; k++) {
      if (Math.abs(v[k]) < 1e-6) {
        if (o[k] < lo[k] || o[k] > hi[k]) hit = false;
        continue;
      }
      let a = (lo[k] - o[k]) / v[k];
      let c = (hi[k] - o[k]) / v[k];
      if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, c);
      if (t0 > t1) hit = false;
    }
    if (hit && t0 > 0.6) t = Math.min(t, t0);
  }
  return t;
}

test('bullets and the camera: a ray stops exactly where it did against every box', () => {
  let stopped = 0;
  for (let k = 0; k < 6000; k++) {
    const [x, z] = spot();
    const from = { x, y: 0.2 + r() * 6, z };
    const a = r() * Math.PI * 2;
    const e = (r() - 0.6) * 0.8;
    const dir = { x: Math.cos(a) * Math.cos(e), y: Math.sin(e), z: Math.sin(a) * Math.cos(e) };
    const max = 5 + r() * 120;
    const want = rayAll(from, dir, max);
    assert.equal(rayBoxes(from, dir, max), want);
    if (want < max - 1e-9) stopped++;
  }
  assert.ok(stopped > 1000);
});

const CAR = SOLIDS.filter((b) => b !== TURNTABLE_BOX);
const CAR_GRID = new BoxGrid(CAR);
const BOUNDS: Box = [...WORLD_BOUNDS, 0];

test('driving: a car only given the boxes near it ends every step exactly where it would with all of them', () => {
  const T = tune(DRIVE.super, { L: 2.5, W: 1.05, wheelbase: 1.55 });
  let bumps = 0;
  for (let run = 0; run < 60; run++) {
    // (a car starts outside every building, as in the city: started inside a stack of a tower's footprints
    // it's pushed out further in one step than the boxes near where it started reach)
    let [x, z] = spot();
    while (CAR.some((q) => inBox(q, x, z))) [x, z] = spot();
    const yaw = r() * Math.PI * 2;
    const a = newCar(x, z, yaw);
    const b = newCar(x, z, yaw);
    let inp: DriveInput = { throttle: 1, steer: 0, handbrake: false };
    for (let k = 0; k < 600; k++) {
      if (k % 40 === 0) inp = { throttle: r() < 0.8 ? 1 : -1, steer: r() * 2 - 1, handbrake: r() < 0.1 };
      const hitA = stepCar(a, inp, T, 1 / 60, { boxes: CAR, soft: [] }, BOUNDS);
      const hitB = stepCar(b, inp, T, 1 / 60, { boxes: CAR_GRID.near(b.x, b.z, reachOf(b)), soft: [] }, BOUNDS);
      assert.deepEqual(b, a, `run ${run}, step ${k}`);
      assert.equal(hitB, hitA);
      if (hitA > 0) bumps++;
    }
  }
  // (the cars hit plenty of walls on the way)
  assert.ok(bumps > 200, `only ${bumps} bumps`);
});

test('flying: an aircraft only given the boxes near it flies exactly as it would with all of them', () => {
  const ground = () => 0.035;
  let bumps = 0;
  for (const id of ['prop', 'bizjet', 'heli'] as const) {
    const T = TUNES[id];
    for (let run = 0; run < 25; run++) {
      // (it starts outside every building, as the cars do)
      let [x, z] = spot();
      while (CAR.some((q) => inBox(q, x, z))) [x, z] = spot();
      const yaw = r() * Math.PI * 2;
      const y = 1 + r() * 10;
      const mk = () => {
        const s = newFlight(x, z, yaw, y);
        s.ground = false;
        s.gear = false;
        s.power = s.spool = 0.6;
        s.speed = T.kind === 'plane' ? T.minAir + 0.6 * (T.top - T.minAir) : 6;
        return s;
      };
      const a = mk();
      const b = mk();
      let inp: FlyInput = { throttle: 0, turn: 0, climb: 0 };
      for (let k = 0; k < 400; k++) {
        if (k % 50 === 0) inp = { throttle: r() * 2 - 1, turn: r() * 2 - 1, climb: r() * 2 - 1.2 };
        const hitA = stepFly(a, inp, T, 1 / 60, { boxes: CAR, ceilings: [HANGAR_ROOF], soft: [], ground }, BOUNDS);
        const hitB = stepFly(b, inp, T, 1 / 60, { boxes: CAR_GRID.near(b.x, b.z, flyReach(b)), ceilings: [HANGAR_ROOF], soft: [], ground }, BOUNDS);
        assert.deepEqual(b, a, `${id} run ${run}, step ${k}`);
        assert.equal(hitB, hitA);
        if (hitA > 0) bumps++;
      }
    }
  }
  assert.ok(bumps > 50, `only ${bumps} bumps`);
});

test('boxes added later (a district) answer exactly as a grid made with all of them', () => {
  let s = 9;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const more: Box[] = Array.from({ length: 400 }, () => {
    const x = -190 + r() * 140;
    const z = 100 + r() * 125;
    return [x, z, x + 0.5 + r() * 6, z + 0.5 + r() * 6, r() * 8];
  });
  const later = new BoxGrid(SOLIDS);
  later.add(more.slice(0, 150));
  later.add(more.slice(150));
  const all = new BoxGrid([...SOLIDS, ...more]);
  assert.equal(later.boxes.length, SOLIDS.length + more.length);
  for (let k = 0; k < 2000; k++) {
    const x = -200 + r() * 440;
    const z = -200 + r() * 440;
    const w = r() * 20;
    assert.deepEqual(later.query(x, z, x + w, z + w), all.query(x, z, x + w, z + w));
  }
});
