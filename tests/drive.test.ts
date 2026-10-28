// Driving rules (drive-sim.ts): arcade handling and soft, safe collisions, and
// the garage's mods (catalog.ts, tycoon.ts) making a car faster through tune().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIFT, GEARS, RIVER_WALLS, riverWallsNear, SIGNAL_HOLD, SIGNAL_SPEED, carLights, circles, gearOf, newCar, newSignal, skidding, slipOf, stepCar, tune, type CarState, type DriveInput, type DriveTune, type DriveWorld } from '../src/scripts/city3d/drive-sim';
import { BRIDGED_NS, EXT, NS_ROADS, RIVER, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { topsAt } from '../src/scripts/city3d/river';
import { CARGO, DRIVE, FEEL, PLAYER_CARS, type PlayerCar } from '../src/scripts/city3d/mycar';
import { CARS } from '../src/scripts/city3d/carspec';
import { NO_CAR_MODS, carStats } from '../src/scripts/city3d/catalog';
import { carStatsOf, cleanSave, modCar } from '../src/scripts/city3d/tycoon';
import type { Box } from '../src/scripts/city3d/solids';
import { riverBridges } from '../src/scripts/city3d/streetplan';

const HATCH = { L: 2.2, W: 0.98, wheelbase: 1.38 };
const T = tune(DRIVE.hatch, HATCH);
const OPEN: DriveWorld = { boxes: [], soft: [] };
const BOUNDS: Box = [...WORLD_BOUNDS, 0];
const DT = 1 / 60;
const GAS: DriveInput = { throttle: 1, steer: 0, handbrake: false };
const HUGE: Box = [-1e5, -1e5, 1e5, 1e5, 0];
function run(c: CarState, inp: DriveInput, seconds: number, world = OPEN, bounds = HUGE) {
  let hit = 0;
  for (let i = 0; i < seconds / DT; i++) hit = Math.max(hit, stepCar(c, inp, T, DT, world, bounds));
  return hit;
}

test('better numbers make a faster, quicker, grippier car', () => {
  const slow = tune({ speed: 0, accel: 0, grip: 0 }, HATCH);
  const fast = tune({ speed: 1, accel: 1, grip: 1 }, HATCH);
  assert.ok(fast.top > slow.top && fast.accel > slow.accel && fast.grip > slow.grip);
  // Top speeds stay city-sized: about 45-115 km/h (a tile is 1.8 m)
  for (const t of [slow, fast]) assert.ok(t.top * 6.48 > 40 && t.top * 6.48 < 120);
});

test('mods raise the top speed, pick-up and grip through tune(), within the city-sized range', () => {
  const stock = tune(DRIVE.hatch, HATCH);
  const engine = tune(carStats(DRIVE.hatch, CARGO.hatch, { ...NO_CAR_MODS, engine: 3 }), HATCH);
  assert.ok(engine.top > stock.top, 'the engine mod raises the top speed');
  assert.equal(engine.accel, stock.accel);
  assert.equal(engine.grip, stock.grip);
  const all = tune(carStats(DRIVE.hatch, CARGO.hatch, { engine: 3, turbo: 3, tyres: 3, rack: 0 }), HATCH);
  assert.ok(all.accel > stock.accel && all.grip > stock.grip);
  // A maxed-out car is still city-sized (the stats cap a little over 1)
  const maxed = tune(carStats(DRIVE.super, CARGO.super, { engine: 3, turbo: 3, tyres: 3, rack: 3 }), HATCH);
  assert.ok(maxed.top * 6.48 < 120);
  // ...and the same numbers come from a save with the mods bought in it
  const save = cleanSave({ dorras: 1e6 }, 0);
  for (let k = 0; k < 3; k++) assert.ok(modCar(save, 'hatch', 'engine').ok);
  assert.deepEqual(tune(carStatsOf(save, 'hatch'), HATCH), engine);
  // A modded car actually goes faster
  const slow = newCar(0, 0, 0);
  const fast = newCar(0, 0, 0);
  for (let i = 0; i < 20 / DT; i++) {
    stepCar(slow, GAS, stock, DT, OPEN, HUGE);
    stepCar(fast, GAS, engine, DT, OPEN, HUGE);
  }
  assert.ok(fast.speed > slow.speed + 1, `${fast.speed} vs ${slow.speed}`);
});

test('full gas builds speed up to the top speed, never past it', () => {
  const c = newCar(0, 0, 0);
  run(c, GAS, 2);
  const early = c.speed;
  run(c, GAS, 20);
  assert.ok(early > 3, 'pulls away');
  assert.ok(c.speed <= T.top + 1e-6 && c.speed > T.top * 0.95, `speed ${c.speed}`);
  // Facing +x at yaw 0
  assert.ok(c.x > 50 && Math.abs(c.z) < 1e-6);
});

test('the brake stops it, then it reverses (slowly)', () => {
  const c = newCar(0, 0, 0);
  run(c, GAS, 3);
  run(c, { throttle: -1, steer: 0, handbrake: false }, 1.2);
  assert.ok(c.speed < 1, 'stopped or nearly');
  run(c, { throttle: -1, steer: 0, handbrake: false }, 6);
  assert.ok(Math.abs(c.speed + T.reverse) < 1e-6, `reverse speed ${c.speed}`);
});

test('steering right turns right (yaw goes down), and wider when fast', () => {
  const slow = newCar(0, 0, 0);
  slow.speed = slow.vx = 3;
  run(slow, { throttle: 0.2, steer: 1, handbrake: false }, 0.5);
  assert.ok(slow.yaw < 0);
  const fast = newCar(0, 0, 0);
  fast.speed = fast.vx = 11;
  run(fast, { throttle: 0.2, steer: 1, handbrake: false }, 0.5);
  // Turning radius: speed / yaw rate
  assert.ok(Math.abs(fast.speed / fast.yawRate) > Math.abs(slow.speed / slow.yawRate));
});

test('the handbrake lets the back slide out', () => {
  const grip = newCar(0, 0, 0);
  const slide = newCar(0, 0, 0);
  for (const c of [grip, slide]) c.speed = c.vx = 10;
  run(grip, { throttle: 0, steer: 1, handbrake: false }, 0.6);
  run(slide, { throttle: 0, steer: 1, handbrake: true }, 0.6);
  const drift = (c: CarState) => Math.abs(Math.atan2(-c.vz, c.vx) - c.yaw);
  assert.ok(drift(slide) > drift(grip));
});

test('walls: driving at one never gets the car inside it', () => {
  const wall: Box = [10, -5, 12, 5, 2];
  for (const angle of [0, 0.4, -0.7, 1.1]) {
    const c = newCar(0, -Math.tan(angle) * 6, angle * 0.5);
    const world = { boxes: [wall], soft: [] };
    for (let i = 0; i < 400; i++) {
      stepCar(c, GAS, T, DT, world, BOUNDS);
      for (const cc of circles(c, T)) {
        const px = Math.max(wall[0], Math.min(cc.x, wall[2]));
        const pz = Math.max(wall[1], Math.min(cc.z, wall[3]));
        assert.ok(Math.hypot(cc.x - px, cc.z - pz) > cc.r - 0.05, `inside the wall at step ${i}`);
      }
    }
  }
});

test('low things (kerbs, pond edges) don\'t stop it', () => {
  const c = newCar(0, 0, 0);
  run(c, GAS, 3, { boxes: [[8, -3, 9, 3, 0.1]], soft: [] });
  assert.ok(c.x > 9);
});

test('the river stops it except over the bridges', () => {
  const into = newCar(5, RIVER[0] - 5, -Math.PI / 2);
  run(into, GAS, 5);
  assert.ok(into.z < RIVER[0], 'drove into the river');
  NS_ROADS.forEach((r, i) => {
    // Down every bridge (river plan step 1: only the east avenue keeps one; the others end at the bank avenue)
    const c = newCar(r.c + 0.85, RIVER[0] - 6, -Math.PI / 2);
    run(c, GAS, 9);
    if (BRIDGED_NS.includes(i)) assert.ok(c.z > RIVER[1] + 1, `blocked on the bridge at x ${r.c}`);
    else assert.ok(c.z < RIVER[0], `drove into the river at x ${r.c}`);
  });
  // The ring highway's two bridges (growth plan Phase 7), down each of its lanes
  for (const b of riverBridges().filter((b) => b.street === 'highway'))
    for (const off of [-2.85, -1.15, 1.15, 2.85]) {
      const c = newCar(b.c + off, off > 0 ? RIVER[0] - 6 : RIVER[1] + 6, off > 0 ? -Math.PI / 2 : Math.PI / 2);
      run(c, GAS, 9);
      assert.ok(off > 0 ? c.z > RIVER[1] + 1 : c.z < RIVER[0] - 1, `blocked on the highway's bridge at x ${b.c}`);
    }
  // The gaps in the river walls are the bridges' width (river plan step 1: the east avenue's and the highway's two)
  const gaps = riverBridges().map((b) => [b.x0 + 0.1, b.x1 - 0.1]);
  assert.equal(gaps.length, BRIDGED_NS.length + 2);
  NS_ROADS.forEach((r, i) => {
    const open = !RIVER_WALLS.some((w) => w[0] < r.c + r.half && w[2] > r.c - r.half);
    assert.equal(open, BRIDGED_NS.includes(i), `x ${r.c}`);
  });
  // From the street plan (growth plan Phase 5): the river runs edge to edge, in order, broken only at the bridges
  assert.equal(RIVER_WALLS[0][0], EXT[0]);
  assert.equal(RIVER_WALLS.at(-1)![2], EXT[1]);
  for (let i = 1; i < RIVER_WALLS.length; i++) {
    const [p, q] = [RIVER_WALLS[i - 1], RIVER_WALLS[i]];
    assert.ok(q[0] >= p[2] - 1e-9 && q[0] - p[2] < 30, 'in order');
    if (q[0] - p[2] > 1e-6) assert.ok(gaps.some((g) => Math.abs(g[0] - p[2]) < 1e-9 && Math.abs(g[1] - q[0]) < 1e-9), `a gap at ${p[2]} that isn't a bridge`);
  }
  // ...and they cover the water and the banks' slopes down to it wherever they are (it curves: river.ts), never far
  // onto the flat land
  for (let x = EXT[0] + 1; x < EXT[1] - 1; x += 0.7) {
    if (gaps.some((g) => x > g[0] - 0.2 && x < g[1] + 0.2)) continue;
    const [n, sz] = topsAt(x);
    const w = riverWallsNear(x, 0).find((b) => b[0] <= x && b[2] >= x)!;
    assert.ok(w && w[1] <= n - 0.25 && w[3] >= sz + 0.25 && w[1] > n - 2 && w[3] < sz + 2, `the wall at x ${x.toFixed(1)}`);
  }
});

test('people and other cars are soft: a bump, never driving through', () => {
  const person = { x: 6, z: 0, r: 0.28 };
  const c = newCar(0, 0, 0);
  let hit = 0;
  for (let i = 0; i < 300; i++) {
    hit = Math.max(hit, stepCar(c, GAS, T, DT, { boxes: [], soft: [person] }, BOUNDS));
    for (const cc of circles(c, T)) assert.ok(Math.hypot(cc.x - person.x, cc.z - person.z) > cc.r + person.r - 0.05);
  }
  assert.ok(hit > 0, 'it noticed the bump');
  assert.ok(c.x < person.x, 'still on the near side');
});

test('the edge of the world holds it in', () => {
  const c = newCar(BOUNDS[2] - 4, 0, 0);
  run(c, GAS, 5, OPEN, BOUNDS);
  assert.ok(c.x <= BOUNDS[2]);
});

/* ---------- What the car shows (city life plan, Phase 2) ---------- */

test('brake lights on braking from a roll or with the handbrake on the move, reversing lights in reverse', () => {
  const sig = newSignal();
  const c = newCar(0, 0, 0);
  c.speed = 5;
  assert.equal(carLights(c, GAS, sig, DT).brake, false);
  assert.equal(carLights(c, { throttle: -1, steer: 0, handbrake: false }, sig, DT).brake, true);
  assert.equal(carLights(c, { throttle: 0, steer: 0, handbrake: true }, sig, DT).brake, true);
  // Coasting: nothing lit
  assert.deepEqual(carLights(c, { throttle: 0, steer: 0, handbrake: false }, sig, DT), { brake: false, reverse: false, turn: null });
  // Stopped with the brake held: that's the start of reversing, not a brake light; reversing lights once rolling back
  c.speed = 0;
  assert.equal(carLights(c, { throttle: -1, steer: 0, handbrake: false }, sig, DT).brake, false);
  c.speed = -1;
  assert.equal(carLights(c, { throttle: -1, steer: 0, handbrake: false }, sig, DT).reverse, true);
  // The handbrake at a standstill lights nothing
  c.speed = 0;
  assert.equal(carLights(c, { throttle: 0, steer: 0, handbrake: true }, sig, DT).brake, false);
});

test('indicators follow the wheel below walking pace and stay on a moment after it straightens', () => {
  const sig = newSignal();
  const c = newCar(0, 0, 0);
  c.speed = 1;
  assert.equal(carLights(c, { throttle: 0, steer: 1, handbrake: false }, sig, DT).turn, 'R');
  assert.equal(carLights(c, { throttle: 0, steer: -1, handbrake: false }, sig, DT).turn, 'L');
  // Let go: held for SIGNAL_HOLD, then off
  let t = 0;
  let off = -1;
  for (; t < 3 && off < 0; t += DT) if (!carLights(c, { throttle: 0, steer: 0, handbrake: false }, sig, DT).turn) off = t;
  assert.ok(off >= SIGNAL_HOLD - DT && off <= SIGNAL_HOLD + 2 * DT, `off after the hold (${off.toFixed(2)})`);
  // At speed the wheel is a lane change, not a turn
  c.speed = SIGNAL_SPEED + 1;
  assert.equal(carLights(c, { throttle: 1, steer: 1, handbrake: false }, sig, DT).turn, null);
  // Stopped at a junction with the wheel turned: indicating
  c.speed = 0;
  assert.equal(carLights(c, { throttle: 0, steer: -0.8, handbrake: false }, sig, DT).turn, 'L');
});

test('the gearbox: N, R, then four gears up the speed range, the revs dropping at each shift', () => {
  assert.deepEqual(gearOf(0, T.top), { gear: 'N', revs: 0 });
  assert.equal(gearOf(0, T.top, 1).gear, 1);
  assert.equal(gearOf(-2, T.top).gear, 'R');
  let last = 0;
  let shifts = 0;
  let gear: number | string = 0;
  for (let v = 0.3; v <= T.top; v += 0.1) {
    const g = gearOf(v, T.top);
    assert.ok(g.revs >= 0.25 && g.revs <= 1);
    if (g.gear !== gear) {
      if (gear) {
        shifts++;
        assert.ok(g.revs < last, `revs drop at the shift into ${g.gear}`);
      }
      gear = g.gear;
    } else assert.ok(g.revs >= last - 1e-9, 'revs climb within a gear');
    last = g.revs;
  }
  assert.equal(shifts, GEARS.length);
  assert.equal(gearOf(T.top, T.top).gear, 4);
});

test('skidding: a handbrake slide or a real sideways slip, never a clean drive', () => {
  const c = newCar(0, 0, 0);
  run(c, GAS, 3);
  assert.equal(skidding(c, GAS), 0);
  assert.ok(skidding(c, { throttle: 0, steer: 0, handbrake: true }) >= 1.5);
  // Thrown sideways: the slip itself
  c.vx = Math.cos(c.yaw) * 4;
  c.vz = 3;
  assert.ok(skidding(c, GAS) >= 2.9);
  // A gentle turn's slip is nothing
  c.vz = 0.5;
  assert.equal(skidding(c, GAS), 0);
  // The handbrake at a crawl marks nothing
  const slow = newCar(0, 0, 0);
  slow.speed = 1;
  slow.vx = 1;
  assert.equal(skidding(slow, { throttle: 0, steer: 0, handbrake: true }), 0);
});

/* ---------- Handling with depth (vehicle plan Phase 4): each model's feel, drifting ---------- */

const tuneOf = (id: PlayerCar, stats: { speed: number; accel: number; grip: number } = DRIVE[id]) => {
  const s = CARS[id];
  return tune(stats, { L: s.L, W: s.W, wheelbase: s.axles[1] - s.axles[0] }, FEEL[id]);
};
const rolling = (v: number) => {
  const c = newCar(0, 0, 0);
  c.speed = c.vx = v;
  return c;
};
function drive(c: CarState, t: DriveTune, inp: DriveInput, seconds: number, each?: (c: CarState, time: number) => void) {
  for (let time = 0; time < seconds; time += DT) {
    stepCar(c, inp, t, DT, OPEN, HUGE);
    each?.(c, time);
  }
}
/** A model's numbers on the road: 0-50 km/h, turn-in (to 63% of its turn), the turning circle at 8, full power through a turn's slide */
function fingerprint(id: PlayerCar) {
  const t = tuneOf(id);
  let t50 = 0;
  drive(newCar(0, 0, 0), t, GAS, 10, (c, time) => void (!t50 && c.speed > 7.7 && (t50 = time)));
  const settled = rolling(8);
  drive(settled, t, { throttle: 0.3, steer: -1, handbrake: false }, 2);
  let turnIn = 0;
  drive(rolling(8), t, { throttle: 0.3, steer: -1, handbrake: false }, 2, (c, time) => void (!turnIn && c.yawRate > settled.yawRate * 0.63 && (turnIn = time)));
  let power = 0;
  drive(rolling(8), t, { throttle: 1, steer: -1, handbrake: false }, 2, (c) => void (power = Math.max(power, Math.abs(slipOf(c)))));
  return [t50, turnIn, 8 / settled.yawRate, power];
}

test('every model has its own feel: no two drive alike', () => {
  const prints = PLAYER_CARS.map((id) => [id, fingerprint(id)] as const);
  for (const [i, [a, pa]] of prints.entries())
    for (const [b, pb] of prints.slice(i + 1)) {
      const most = Math.max(...pa.map((v, k) => Math.abs(v - pb[k]) / Math.max(Math.abs(v), Math.abs(pb[k]))));
      assert.ok(most > 0.1, `${a} and ${b} differ by ${(most * 100).toFixed(0)}% at most`);
    }
  // The coupe darts, the van wallows: the van answers the wheel slowest and turns widest
  const [, coupe] = prints.find(([id]) => id === 'coupe')!;
  const [, van] = prints.find(([id]) => id === 'van')!;
  assert.ok(van[1] > coupe[1] * 1.5 && van[2] > coupe[2] * 1.2);
});

test('full power through a turn steps the tail out of the rear-drive cars, as much as each is loose; the front-drive ones grip', () => {
  const muscle = fingerprint('muscle')[3];
  assert.ok(muscle > 0.4, `the muscle car's tail steps out (${muscle.toFixed(2)})`);
  for (const id of PLAYER_CARS) {
    const slide = fingerprint(id)[3];
    if (!FEEL[id].rwd) assert.ok(slide < 0.2, `${id} grips (${slide.toFixed(2)})`);
    else if (id !== 'muscle') assert.ok(slide < muscle, `${id} is less loose than the muscle car`);
  }
  // The supercar grips, rear drive or not
  assert.ok(fingerprint('super')[3] < 0.2);
});

test('a handbrake drift: held with throttle and the wheel into the turn, counter-steer straightens it, lifting off recovers', () => {
  for (const id of PLAYER_CARS) {
    const t = tuneOf(id);
    const c = rolling(10);
    drive(c, t, { throttle: 0, steer: -1, handbrake: true }, 0.6);
    assert.ok(Math.abs(slipOf(c)) > 0.4 && c.drift > 0.9, `${id}: the handbrake breaks it away (${slipOf(c).toFixed(2)})`);
    assert.ok(c.speed > 5, `${id}: without losing all its speed`);
    // Held: throttle on, the wheel a little into the turn
    const held = structuredClone(c);
    let least = Infinity;
    drive(held, t, { throttle: 0.8, steer: -0.4, handbrake: false }, 1.5, (q) => void (least = Math.min(least, Math.abs(slipOf(q)))));
    assert.ok(least > 0.2, `${id}: the slide holds (${least.toFixed(2)})`);
    // Counter-steer brings the nose back round
    let back = -1;
    drive(structuredClone(c), t, { throttle: 0.5, steer: 1, handbrake: false }, 3, (q, time) => void (back < 0 && Math.abs(slipOf(q)) < 0.08 && (back = time)));
    assert.ok(back >= 0 && back < 1, `${id}: counter-steer straightens it (${back.toFixed(2)} s)`);
    // Lift off and straighten: the grip comes back
    const off = structuredClone(c);
    drive(off, t, { throttle: 0, steer: 0, handbrake: false }, 2);
    assert.ok(Math.abs(slipOf(off)) < 0.05 && off.drift < 0.05, `${id}: lifting off recovers`);
  }
});

test('the tyres mod helps hold a drift: less of a runaway', () => {
  const runaway = (stats: { speed: number; accel: number; grip: number }) => {
    const t = tuneOf('muscle', stats);
    const c = rolling(10);
    drive(c, t, { throttle: 0, steer: -1, handbrake: true }, 0.6);
    let most = 0;
    drive(c, t, { throttle: 1, steer: -0.8, handbrake: false }, 1.5, (q) => void (most = Math.max(most, Math.abs(slipOf(q)))));
    return most;
  };
  const stock = runaway(DRIVE.muscle);
  const tyres = runaway(carStats(DRIVE.muscle, CARGO.muscle, { ...NO_CAR_MODS, tyres: 3 }));
  assert.ok(tyres < stock, `${tyres.toFixed(2)} vs ${stock.toFixed(2)}`);
});

test('nothing spins for ever: the slide never passes its most, and with the wheel straight every car settles', () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const id of PLAYER_CARS) {
    const t = tuneOf(id);
    const c = rolling(12);
    // (well away from the river's walls and the lake's, which stepCar always has)
    c.z = -3000;
    let inp: DriveInput = GAS;
    for (let time = 0; time < 40; time += DT) {
      if (rnd() < 0.03) inp = { throttle: rnd() * 2 - 0.6, steer: rnd() * 2 - 1, handbrake: rnd() < 0.3 };
      stepCar(c, inp, t, DT, OPEN, HUGE);
      assert.ok(Math.abs(slipOf(c)) <= DRIFT.most + 1e-6, `${id}: the slide held at its most`);
    }
    drive(c, t, { throttle: 0.3, steer: 0, handbrake: false }, 4);
    assert.ok(Math.abs(slipOf(c)) < 0.05 && Math.abs(c.yawRate) < 0.05 && c.drift < 0.01, `${id}: settled (${slipOf(c).toFixed(3)}, ${c.yawRate.toFixed(3)})`);
  }
});
