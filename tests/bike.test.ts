// Your motorbike (vehicle plan Phase 7): the data (mybike.ts), the rules (bike-sim.ts: tuned on the cars' rules,
// the lean, the foot down), buying and tuning them in the save (tycoon.ts), and getting on (moments.ts bikeMark).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIKES, BIKE_CARGO, BIKE_DRIVE, DEFAULT_BIKE, PLAYER_BIKES, cleanBike, type BikeId } from '../src/scripts/city3d/mybike';
import { BIKE_FEEL, G, LEAN, REST, footDown, leanTarget, stepLean, tuneBike } from '../src/scripts/city3d/bike-sim';
import { circles, newCar, stepCar, tune, type CarState } from '../src/scripts/city3d/drive-sim';
import { BIKE_CATALOG, STARTER_BIKES } from '../src/scripts/city3d/catalog';
import { CARS } from '../src/scripts/city3d/carspec';
import { CARGO, DRIVE, FEEL, PLAYER_CARS } from '../src/scripts/city3d/mycar';
import { buyCar, carMods, carStatsOf, cleanSave, modCar, ownsCar } from '../src/scripts/city3d/tycoon';
import { MOMENT, bikeMark } from '../src/scripts/city3d/moments';
import { SITTER } from '../src/scripts/city3d/carinside';

const open = { boxes: [], soft: [] };
const bounds: [number, number, number, number, number] = [-1e4, -1e4, 1e4, 1e4, 9];

test('three bikes: the names and prices the plan settled, the scooter free', () => {
  assert.deepEqual([...PLAYER_BIKES], ['scooter', 'streetbike', 'sportbike']);
  assert.deepEqual(
    PLAYER_BIKES.map((id) => [BIKES[id].name, BIKE_CATALOG[id].price, BIKE_CATALOG[id].level]),
    [
      ['Hop Scoot', 0, 1],
      ['Alley Cat', 9000, 3],
      ['Neon Blade', 36000, 8],
    ]
  );
  assert.deepEqual(STARTER_BIKES, ['scooter']);
  for (const id of PLAYER_BIKES) {
    const d = BIKE_DRIVE[id];
    for (const k of ['speed', 'accel', 'grip'] as const) assert.ok(d[k] >= 0 && d[k] <= 1, `${id} ${k}`);
    assert.ok(d.kind && d.blurb && BIKE_CATALOG[id].pitch);
    // Little cargo: less than any car
    assert.ok(BIKE_CARGO[id] > 0 && BIKE_CARGO[id] < Math.min(...PLAYER_CARS.map((c) => CARGO[c])), id);
  }
  // No name shared with a car
  const cars = new Set(PLAYER_CARS.map((c) => CARS[c].name));
  for (const id of PLAYER_BIKES) assert.ok(!cars.has(BIKES[id].name));
});

test('each bike in proportion: the rider astride, the grips ahead of him in reach, the feet on the pegs under him', () => {
  for (const id of PLAYER_BIKES) {
    const s = BIKES[id];
    const [ra, fa] = s.axles;
    assert.ok(fa - ra > 0.8 && s.L > fa - ra + s.r * 2 - 0.05, `${id}: wheelbase and length`);
    assert.ok(s.W < 0.6, `${id}: narrow`);
    const [sx, sy] = s.seat;
    assert.ok(sx > ra && sx < fa && sy > s.r * 2, `${id}: the seat between the wheels, over them`);
    const [bx, by, bh] = s.bars;
    assert.ok(bx > sx + 0.3 && bx < fa + 0.1 && by > sy, `${id}: the bars ahead and above`);
    assert.ok(bh * 2 <= s.W + 1e-9, `${id}: the bars inside its width`);
    const [px, py] = s.pegs;
    assert.ok(py < sy - 0.2 && py > 0.1 && Math.abs(px - sx) < 0.5, `${id}: the pegs under him`);
    // The rider at the drivers' size (carinside.ts SITTER): his shoulders up his back from the hips, tucked
    // forward; each grip within his reach, not cramped; his feet reach the pegs
    const shoulder = { x: sx + Math.sin(s.tuck) * SITTER.shoulder, y: sy + Math.cos(s.tuck) * SITTER.shoulder };
    const reach = Math.hypot(bx - shoulder.x, by - shoulder.y, bh - SITTER.shoulderX);
    assert.ok(reach < SITTER.reach * 0.97 && reach > SITTER.reach * 0.5, `${id}: the bars in reach (${reach.toFixed(3)} of ${SITTER.reach.toFixed(3)})`);
    assert.ok(sy - py < SITTER.thigh + SITTER.shin, `${id}: the legs reach the pegs`);
  }
  // The scooter upright, the sport bike tucked
  assert.ok(BIKES.scooter.tuck < BIKES.streetbike.tuck && BIKES.streetbike.tuck < BIKES.sportbike.tuck);
});

test('a saved bike is cleaned; unknown models and paints fall back', () => {
  assert.deepEqual(cleanBike({ model: 'sportbike', paint: 'red' }), { model: 'sportbike', paint: 'red' });
  assert.deepEqual(cleanBike({ model: 'hatch', paint: 'nope' }), DEFAULT_BIKE);
  for (const junk of [null, 3, 'scooter', []]) assert.deepEqual(cleanBike(junk), DEFAULT_BIKE);
  assert.deepEqual(Object.keys(cleanBike({ model: 'scooter', paint: 'red', x: 1 })).sort(), ['model', 'paint']);
});

test('tuned as bikes: narrow on the road, the scooter slower than any car, the sport bike as quick as the supercar', () => {
  const t = (id: BikeId) => tuneBike(BIKE_DRIVE[id], id);
  const carTop = (id: (typeof PLAYER_CARS)[number]) => tune(DRIVE[id], { L: CARS[id].L, W: CARS[id].W, wheelbase: 1 }, FEEL[id]).top;
  assert.ok(t('scooter').top < Math.min(...PLAYER_CARS.map(carTop)), 'the scooter is the slowest thing you drive');
  assert.ok(t('scooter').top < t('streetbike').top && t('streetbike').top < t('sportbike').top);
  assert.ok(Math.abs(t('sportbike').top - carTop('super')) < 1.5, 'the sport bike keeps up with the supercar');
  for (const id of PLAYER_BIKES) {
    const tb = t(id);
    assert.ok(tb.W === BIKES[id].W && tb.rwd, id);
    // Its body for the bumps: three circles no wider than the bike
    for (const c of circles(newCar(0, 0, 0), tb)) assert.ok(c.r <= BIKES[id].W / 2 + 1e-9, `${id}: narrow circles`);
  }
  // Quicker off the line than a hatch
  const go = (tt: ReturnType<typeof t>) => {
    const s = newCar(0, 0, 0);
    for (let i = 0; i < 60; i++) stepCar(s, { throttle: 1, steer: 0, handbrake: false }, tt, 1 / 60, open, bounds);
    return s.speed;
  };
  assert.ok(go(t('streetbike')) > go(tune(DRIVE.hatch, { L: 2.2, W: 0.98, wheelbase: 1.38 }, FEEL.hatch)));
  assert.ok(Object.values(BIKE_FEEL).every((f) => f.mass < 1));
});

/** Ride a while: full throttle, steering `steer`, returning the lean each frame */
function ride(id: BikeId, steer: (t: number) => number, seconds: number, each?: (s: CarState, lean: number) => void) {
  const tb = tuneBike(BIKE_DRIVE[id], id);
  const s = newCar(0, 0, 0);
  let lean = 0;
  for (let t = 0; t < seconds; t += 1 / 60) {
    stepCar(s, { throttle: 1, steer: steer(t), handbrake: false }, tb, 1 / 60, open, bounds);
    lean = stepLean(lean, s, id, 1 / 60);
    each?.(s, lean);
  }
  return { s, lean };
}

test('it leans into a turn by its speed, right into a right turn, as far as its most and never further', () => {
  for (const id of PLAYER_BIKES) {
    const right = ride(id, (t) => (t > 2 ? 0.6 : 0), 4);
    assert.ok(right.lean > 0.1, `${id}: leans right (${right.lean.toFixed(2)})`);
    const left = ride(id, (t) => (t > 2 ? -0.6 : 0), 4);
    assert.ok(left.lean < -0.1, `${id}: leans left`);
    // The lean is the turn's pull against gravity
    const want = -Math.atan((right.s.speed * right.s.yawRate) / G);
    assert.ok(Math.abs(right.lean - Math.min(LEAN.most[id], want)) < 0.08, `${id}: balanced (${right.lean.toFixed(2)} vs ${want.toFixed(2)})`);
    // Straight, it's upright
    assert.ok(Math.abs(ride(id, () => 0, 3).lean) < 1e-6, `${id}: upright`);
  }
  // Faster leans further through the same wheel
  const slow = ride('streetbike', (t) => (t > 0.6 ? 0.3 : 0), 1.2).lean;
  const fast = ride('streetbike', (t) => (t > 3 ? 0.3 : 0), 3.6).lean;
  assert.ok(fast > slow, `faster, further (${slow.toFixed(2)} < ${fast.toFixed(2)})`);
  // Never past its most, whatever the wheel does
  for (const id of PLAYER_BIKES) {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    let most = 0;
    let w = 0;
    ride(
      id,
      (t) => (Math.floor(t * 3) !== Math.floor((t - 1 / 60) * 3) ? (w = rnd()) : w),
      20,
      (_, l) => void (most = Math.max(most, Math.abs(l)))
    );
    assert.ok(most <= LEAN.most[id] + 1e-9 && most > 0.2, `${id}: ${most.toFixed(2)}`);
  }
});

test('stopping, a foot comes down and it rests a touch over onto it; moving off it picks up', () => {
  const s = newCar(0, 0, 0);
  assert.equal(footDown(s), 1);
  assert.ok(Math.abs(leanTarget(s, 'scooter') - REST.lean) < 1e-9);
  s.speed = REST.below + 0.1;
  assert.equal(footDown(s), 0);
  assert.ok(Math.abs(leanTarget(s, 'scooter')) < 1e-9);
  // Settles onto the foot from upright
  s.speed = 0;
  let lean = 0;
  for (let i = 0; i < 120; i++) lean = stepLean(lean, s, 'sportbike', 1 / 60);
  assert.ok(Math.abs(lean - REST.lean) < 0.005);
});

test('bikes are bought and tuned in the garage as the cars are: the top box carries more', () => {
  const s = cleanSave({}, 0);
  assert.ok(ownsCar(s, 'scooter') && !ownsCar(s, 'streetbike'));
  s.dorras = 100000;
  s.xp = 1e7;
  assert.ok(buyCar(s, 'streetbike').ok);
  assert.ok(ownsCar(s, 'streetbike'));
  const before = carStatsOf(s, 'streetbike').cargo;
  assert.ok(modCar(s, 'streetbike', 'rack').ok);
  assert.ok(carStatsOf(s, 'streetbike').cargo > before);
  assert.equal(carMods(s, 'streetbike').rack, 1);
  // Saved and read back, bikes and their mods are kept; unknown ids dropped
  const again = cleanSave(JSON.parse(JSON.stringify({ ...s, garage: { owned: [...s.garage.owned, 'unicycle'], mods: s.garage.mods } })), 0);
  assert.deepEqual(again.garage.owned, ['streetbike']);
  assert.equal(carMods(again, 'streetbike').rack, 1);
});

test('getting on: he stands beside it on his side, faces it, both hands on the grips, his hips onto the seat', () => {
  for (const id of PLAYER_BIKES) {
    const s = BIKES[id];
    for (const yaw of [0, 1.1, -2.4]) {
      const bike = { x: 10, z: -4, yaw };
      const rx = Math.sin(yaw);
      const rz = Math.cos(yaw);
      for (const side of [-1, 1]) {
        const m = bikeMark(bike, s, bike.x + rx * side * 2, bike.z + rz * side * 2, 0);
        assert.equal(m.kind, 'board');
        assert.equal(m.vehicle, 'bike');
        // On his side, clear of the bike
        const off = (m.x - bike.x) * rx + (m.z - bike.z) * rz;
        assert.ok(off * side > s.W / 2 + 0.15, `${id} ${side}: beside it (${off.toFixed(2)})`);
        assert.equal(m.hands.length, 2);
        // The grips at the bars' height, either side of the middle, ahead of the seat
        for (const h of m.hands) {
          assert.ok(Math.abs(h.y - s.bars[1]) < 1e-9);
          const along = (h.x - bike.x) * Math.cos(yaw) - (h.z - bike.z) * Math.sin(yaw);
          assert.ok(Math.abs(along - s.bars[0]) < 1e-9);
          assert.ok(Math.hypot(h.x - m.x, h.z - m.z) < 0.9, `${id}: the grips in reach`);
        }
        assert.ok(Math.abs(m.seat!.y - s.seat[1]) < 0.05, `${id}: onto the seat`);
      }
    }
  }
  assert.ok(MOMENT.board.t.bike > 0 && MOMENT.board.fireAt.bike > 0);
});

test('the rider sits astride: hands on the grips, feet on the pegs (the left on the ground as it stops), within 1.5 cm', async () => {
  const THREE = await import('three');
  const { ridePose, riderRoot } = await import('../src/scripts/city3d/acts');
  const { DRIVER_SCALE } = await import('../src/scripts/city3d/carinside');
  const { steeringHead } = await import('../src/scripts/city3d/mybike');
  const { ANKLE_H, makeSkeleton, newPose, poseSkeleton } = await import('../src/scripts/city3d/skeleton');
  const sk = makeSkeleton();
  const at = (p: ReturnType<typeof newPose>, id: keyof typeof BIKES, name: 'handL' | 'handR' | 'footL' | 'footR') => {
    poseSkeleton(sk, p);
    sk.root.position.set(...riderRoot(id), 0);
    sk.root.rotation.set(0, Math.PI / 2, 0);
    sk.root.scale.setScalar(DRIVER_SCALE);
    sk.root.updateMatrixWorld(true);
    return sk.bones[name].getWorldPosition(new THREE.Vector3());
  };
  for (const id of Object.keys(BIKES) as (keyof typeof BIKES)[]) {
    const s = BIKES[id];
    const [hx, hy] = steeringHead(id);
    // (the bars turn half the steer, drive.ts: up to about 0.15 in a corner at speed)
    for (const steer of [0, 0.15]) {
      const p = newPose();
      ridePose(p, id, 0, steer);
      for (const [name, side] of [['handL', 1], ['handR', -1]] as const) {
        const g = new THREE.Vector3(s.bars[0], s.bars[1], side * (s.bars[2] - 0.05)).sub(new THREE.Vector3(hx, hy, 0)).applyAxisAngle(new THREE.Vector3(0, 1, 0), steer).add(new THREE.Vector3(hx, hy, 0));
        const d = at(p, id, name).distanceTo(g);
        assert.ok(d < 0.015, `${id} steer ${steer}: ${name} on its grip (${(d * 180).toFixed(1)} cm)`);
      }
      for (const [name, side] of [['footL', 1], ['footR', -1]] as const) {
        const d = at(p, id, name).distanceTo(new THREE.Vector3(s.pegs[0], s.pegs[1] + ANKLE_H * DRIVER_SCALE, side * s.pegs[2]));
        assert.ok(d < 0.015, `${id}: ${name} on its peg (${(d * 180).toFixed(1)} cm)`);
      }
    }
    // Stopped: his left foot (the rig's +x, the bike's -z) down beside the seat, on the ground (on the sport bike's
    // tall seat a toe's length short of it in the bike's own space: the bike leans onto that side, REST)
    const p = newPose();
    ridePose(p, id, 1);
    const f = at(p, id, 'footR');
    assert.ok(f.y - (0.04 + ANKLE_H * DRIVER_SCALE) < 0.07 && f.z < -s.pegs[2], `${id}: the left foot down (${f.y.toFixed(3)}, ${f.z.toFixed(3)})`);
  }
});
