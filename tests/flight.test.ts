// Flying your own aircraft (flight-sim.ts, Airport Phase 2): arcade handling that takes off,
// levels itself, can't stall and lands anywhere it touches down; the helicopter's hover; soft,
// safe collisions with buildings, the hangar's roof, the world's edge and the ceiling; and the
// hangar where your aircraft stands (airfield.ts) with the save that picks it (myplane.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CEILING,
  CLIMB_OUT,
  HULLS,
  TUNES,
  canLeave,
  floorAt,
  hullAt,
  newFlight,
  stepFly,
  type FlyInput,
  type FlyState,
  type FlyWorld,
} from '../src/scripts/city3d/flight-sim';
import { AIRPORT_SOLIDS, HANGAR, HANGAR_DOOR, HANGAR_ROOF, HANGAR_SPOT, PROP_STAND, RUNWAY, STANDS, TERMINAL } from '../src/scripts/city3d/airfield';
import { DEFAULT_PLANE, PLAYER_AIRCRAFT, cleanPlane, type PlaneId } from '../src/scripts/city3d/myplane';
import { WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { PLAN, onSlab } from '../src/scripts/city3d/streetplan';
import { SOLIDS, type Box } from '../src/scripts/city3d/solids';

const DT = 1 / 60;
/** Between the two stands in the middle of the hall (its airside wall faces the apron) */
const WALL_X = (STANDS[3][0] + STANDS[4][0]) / 2;
const BOUNDS: Box = [...WORLD_BOUNDS, 0];
const OPEN: FlyWorld = { boxes: [], ceilings: [], soft: [], ground: () => 0 };
const CITY: FlyWorld = { boxes: SOLIDS, ceilings: [HANGAR_ROOF], soft: [], ground: (x, z) => (onSlab(PLAN, [x, z]) ? 0.15 : 0.035) };
const HUGE: Box = [-1e5, -1e5, 1e5, 1e5, 0];
const NONE: FlyInput = { throttle: 0, turn: 0, climb: 0 };
const PLANES: PlaneId[] = ['prop', 'bizjet'];

/** Fly for a while; `each` sees every step. Returns the hardest hit. */
function fly(
  s: FlyState,
  id: PlaneId,
  inp: FlyInput | ((s: FlyState, t: number) => FlyInput),
  seconds: number,
  world = OPEN,
  each?: (s: FlyState, t: number) => void,
  bounds = BOUNDS
) {
  let hit = 0;
  for (let t = 0; t < seconds; t += DT) {
    hit = Math.max(hit, stepFly(s, typeof inp === 'function' ? inp(s, t) : inp, TUNES[id], DT, world, bounds));
    each?.(s, t);
  }
  return hit;
}
/** In the air at a height, flying level at a lever setting */
function aloft(id: PlaneId, x: number, z: number, y: number, yaw: number, power: number): FlyState {
  const s = newFlight(x, z, yaw, y);
  s.ground = false;
  s.gear = false;
  s.power = s.spool = power;
  const T = TUNES[id];
  s.speed = T.kind === 'plane' ? T.minAir + power * (T.top - T.minAir) : 0;
  return s;
}
/** Is any of the aircraft's spheres' centres inside something solid (that isn't under its wheels)? */
function inside(s: FlyState, id: PlaneId, boxes: Box[]) {
  for (const c of hullAt(s, TUNES[id].hull))
    for (const b of boxes) if (b[4] > s.y + 0.65 && c.y < b[4] - 0.05 && c.x > b[0] + 0.2 && c.x < b[2] - 0.2 && c.z > b[1] + 0.2 && c.z < b[3] - 0.2) return b;
  return null;
}

test('the planes roll down the runway, lift off well before its end and climb away at a city pace', () => {
  for (const id of PLANES) {
    const T = TUNES[id];
    const s = newFlight(RUNWAY.x0 + 6, RUNWAY.z, 0);
    let liftX = NaN;
    fly(s, id, (st) => ({ throttle: 1, turn: 0, climb: st.speed > T.rotate * 0.9 ? 0.6 : 0 }), 30, OPEN, (st) => {
      if (Number.isNaN(liftX) && !st.ground) liftX = st.x;
      assert.ok(st.speed <= T.top * 1.15 + 1e-6, `${id} goes too fast`);
    });
    assert.ok(liftX < RUNWAY.x1 - 30, `${id} needs ${(liftX - RUNWAY.x0).toFixed(0)} tiles of runway`);
    assert.ok(s.y > 20, `${id} only climbed to ${s.y.toFixed(1)}`);
    assert.ok(!s.gear, `${id} keeps its wheels down`);
    // City-sized: about 140 km/h for the prop plane, about 220 for the jet (a tile is about 1.8 m)
    assert.ok(T.top * 6.48 > 120 && T.top * 6.48 < 240);
  }
  // Hands off the stick, full power: it lifts off on its own and climbs out clear of the ground
  for (const id of PLANES) {
    const s = newFlight(RUNWAY.x0 + 6, RUNWAY.z, 0);
    fly(s, id, { throttle: 1, turn: 0, climb: 0 }, 20);
    assert.ok(!s.ground && s.y > CLIMB_OUT - 1, `${id} skims the ground at ${s.y.toFixed(2)}`);
    // Power back, stick alone: it comes down and lands
    fly(s, id, { throttle: -1, turn: 0, climb: 0 }, 60, OPEN, undefined, HUGE);
    assert.ok(s.ground, `${id} won't come down`);
  }
  // Not fast enough: it stays on the ground however hard the stick comes back
  const s = newFlight(0, 0, 0);
  s.power = 0.3;
  fly(s, 'bizjet', { throttle: 0, turn: 0, climb: 1 }, 10);
  assert.ok(s.ground && s.y === 0);
});

test("they can't stall: slow and pulling up, they sink gently, and touching down is a soft landing", () => {
  for (const id of PLANES) {
    const T = TUNES[id];
    const s = aloft(id, 0, 0, 30, 0, 0);
    let low = Infinity;
    let worst = 0;
    const hit = fly(
      s,
      id,
      { throttle: -1, turn: 0, climb: 1 },
      120,
      OPEN,
      (st) => {
        if (!st.ground) {
          low = Math.min(low, st.speed);
          worst = Math.min(worst, st.vy);
        }
      },
      HUGE
    );
    assert.ok(low >= T.minAir - 1e-9, `${id} slowed to ${low.toFixed(2)}`);
    assert.ok(worst > -3, `${id} dropped at ${worst.toFixed(1)} tiles a second`);
    assert.ok(s.ground && s.y === 0, `${id} never came down`);
    assert.ok(hit < 3);
  }
  // Diving at the ground at full power: it eases off before it touches
  for (const id of PLANES) {
    const s = aloft(id, 0, 0, 25, 0, 1);
    let at = 0;
    fly(s, id, (st) => (st.ground ? NONE : { throttle: 0, turn: 0, climb: -1 }), 20, OPEN, (st) => {
      if (st.ground && !at) at = 1;
    });
    assert.ok(s.ground && at, `${id} never touched down`);
  }
});

test('they level themselves: the bank and the nose come back when the stick is let go', () => {
  for (const id of PLANES) {
    const s = aloft(id, 0, 0, 30, 0, 0.6);
    fly(s, id, { throttle: 0, turn: 1, climb: 1 }, 3);
    assert.ok(s.roll > 0.4 && s.pitch > 0.1, `${id} won't bank or climb`);
    // A right turn: the yaw falls (left raises it)
    assert.ok(s.yaw < -0.5);
    fly(s, id, NONE, 4);
    assert.ok(Math.abs(s.roll) < 0.05 && Math.abs(s.pitch) < 0.05, `${id} stays tipped`);
    assert.ok(Math.abs(s.yawRate) < 0.05);
  }
});

test('the helicopter lifts straight up, holds its height, turns on the spot, flies forward and lands', () => {
  const T = TUNES.heli;
  const s = newFlight(10, 10, 0);
  // No stick: it sits and spins its rotor up
  fly(s, 'heli', NONE, 2);
  assert.ok(s.ground && s.y === 0 && s.spool > 0.7);
  fly(s, 'heli', { throttle: 0, turn: 0, climb: 1 }, 3);
  assert.ok(!s.ground && s.y > 8 && Math.hypot(s.x - 10, s.z - 10) < 0.5);
  const y = s.y;
  fly(s, 'heli', NONE, 4);
  assert.ok(Math.abs(s.y - y) < 1.5 && Math.abs(s.vy) < 0.1, 'it drifts up or down in a hover');
  const yaw = s.yaw;
  fly(s, 'heli', { throttle: 0, turn: -1, climb: 0 }, 2);
  assert.ok(s.yaw - yaw > 1.5 && Math.hypot(s.x - 10, s.z - 10) < 0.6, 'it should turn on the spot');
  const [x0, z0] = [s.x, s.z];
  fly(s, 'heli', { throttle: 1, turn: 0, climb: 0 }, 6, OPEN, (st) => assert.ok(st.speed <= T.top + 1e-9));
  assert.ok(Math.hypot(s.x - x0, s.z - z0) > 40);
  fly(s, 'heli', NONE, 5);
  assert.ok(Math.abs(s.speed) < 0.1 && Math.hypot(s.vx, s.vz) < 0.3, 'it should ease to a hover');
  fly(s, 'heli', { throttle: 0, turn: 0, climb: -1 }, 6);
  assert.ok(s.ground && s.y === 0);
  assert.ok(canLeave(s));
});

test('the helicopter lands on a flat roof and lifts off it again', () => {
  const [x0, z0, x1, z1, top] = TERMINAL;
  const s = aloft('heli', (x0 + x1) / 2, (z0 + z1) / 2, top + 6, 0, 1);
  fly(s, 'heli', { throttle: 0, turn: 0, climb: -1 }, 6, CITY);
  assert.ok(s.ground && Math.abs(s.y - top) < 1e-6, `it settled at ${s.y.toFixed(2)}`);
  assert.equal(floorAt(CITY, s.x, s.z, s.y), top);
  fly(s, 'heli', { throttle: 0, turn: 0, climb: 1 }, 2, CITY);
  assert.ok(!s.ground && s.y > top + 4);
});

// (Since docs/airport-plan.md Phase 3 the airport is on the world's south edge: the hall's airside wall faces the apron at z 372)
test('buildings are soft: flying low into one slides off it, never through, and a plane keeps flying', () => {
  // North from the apron, low, between two stands, into the hall's airside wall
  const s = aloft('prop', WALL_X, 386, 1.6, Math.PI / 2, 0.7);
  let away = 0;
  const hit = fly(s, 'prop', NONE, 6, CITY, (st) => {
    const b = inside(st, 'prop', CITY.boxes);
    assert.ok(!b, `the plane is inside ${b} at ${st.x.toFixed(1)}, ${st.z.toFixed(1)}`);
    away = Math.max(away, Math.hypot(st.x - WALL_X, st.z - 386));
  });
  assert.ok(hit > 1, 'it never touched the terminal');
  assert.ok(away > 40 && s.speed >= TUNES.prop.minAir, 'it got stuck on the wall');
  // The helicopter flies into it and stops against it
  const h = aloft('heli', WALL_X, 378, 1.2, Math.PI / 2, 1);
  fly(h, 'heli', { throttle: 1, turn: 0, climb: 0 }, 4, CITY, (st) => assert.ok(!inside(st, 'heli', CITY.boxes)));
  assert.ok(h.z > TERMINAL[3] - 0.05, 'the helicopter went into the terminal');
  // Every hull has its spheres
  for (const k of Object.keys(HULLS) as (keyof typeof HULLS)[]) assert.ok(HULLS[k].length >= 3);
});

test('the edge of the world turns it back, and the ceiling levels it off', () => {
  for (const id of PLAYER_AIRCRAFT) {
    const [, , x1] = WORLD_BOUNDS;
    // Flying straight at the east edge, hands off: it turns itself back into the world
    const s = aloft(id, x1 - 40, 0, 30, 0, 1);
    fly(s, id, { throttle: 1, turn: 0, climb: 0 }, 25, OPEN, (st) => {
      assert.ok(st.x >= WORLD_BOUNDS[0] && st.x <= WORLD_BOUNDS[2] && st.z >= WORLD_BOUNDS[1] && st.z <= WORLD_BOUNDS[3], `${id} left the world`);
    });
    if (TUNES[id].kind === 'plane') assert.ok(s.x < x1 - 60, `${id} didn't turn back (at ${s.x.toFixed(0)})`);
    const c = aloft(id, 0, 0, 40, 0, 1);
    fly(c, id, { throttle: 1, turn: 0.3, climb: 1 }, 60, OPEN, (st) => assert.ok(st.y <= CEILING + 1e-9));
    assert.ok(c.y > CEILING - 6);
  }
});

test('whatever the stick does, every aircraft stays in the world, on or over the floor, out of the buildings', () => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (const id of PLAYER_AIRCRAFT) {
    // Off the apron, round the airport and the town's south side
    const s = newFlight(150, 390, 0);
    let inp: FlyInput = { throttle: 1, turn: 0, climb: 0 };
    let next = 0;
    fly(
      s,
      id,
      (_st, t) => {
        if (t >= next) {
          next = t + 0.5 + rand() * 1.5;
          inp = { throttle: rand() * 2 - 0.6, turn: rand() * 2 - 1, climb: rand() * 2 - 0.9 };
        }
        return inp;
      },
      150,
      CITY,
      (st) => {
        for (const v of [st.x, st.y, st.z, st.yaw, st.pitch, st.roll, st.speed]) assert.ok(Number.isFinite(v), `${id} broke`);
        assert.ok(st.x >= WORLD_BOUNDS[0] && st.x <= WORLD_BOUNDS[2] && st.z >= WORLD_BOUNDS[1] && st.z <= WORLD_BOUNDS[3]);
        assert.ok(st.y >= CITY.ground(st.x, st.z) - 1e-6 && st.y <= CEILING + 1e-9);
        const b = inside(st, id, CITY.boxes);
        assert.ok(!b, `${id} is inside ${b} at ${st.x.toFixed(1)}, ${st.y.toFixed(1)}, ${st.z.toFixed(1)}`);
        assert.ok(Math.abs(st.roll) <= 0.7 && Math.abs(st.pitch) <= 0.5);
      }
    );
  }
});

test('the hangar: your aircraft stands inside clear of its walls, rolls straight out past the prop plane, and keeps under the roof', () => {
  const walls = AIRPORT_SOLIDS.filter((b) => b[0] >= HANGAR[0] - 0.01 && b[2] <= HANGAR[2] + 0.01 && b[1] >= HANGAR[1] - 0.01 && b[3] <= HANGAR[3] + 0.01);
  assert.equal(walls.length, 3);
  for (const id of PLAYER_AIRCRAFT) {
    const T = TUNES[id];
    const s = newFlight(HANGAR_SPOT.x, HANGAR_SPOT.z, HANGAR_SPOT.yaw);
    assert.ok(!inside(s, id, SOLIDS));
    // Wingtip to wingtip (or across the rotor) inside the walls, nose short of the doors
    assert.ok(HANGAR_SPOT.x - T.span / 2 > HANGAR[0] + 0.5 && HANGAR_SPOT.x + T.span / 2 < HANGAR[2] - 0.5, `${id} doesn't fit`);
    assert.ok(HANGAR_SPOT.z + T.L / 2 < HANGAR[3] && HANGAR_SPOT.z - T.L / 2 > HANGAR[1] + 0.5);
    assert.ok(T.tall < HANGAR_ROOF[4]);
    // Straight out of the doors: clear of the airport's prop plane on its stand (span 7.2)
    assert.ok(Math.abs(HANGAR_SPOT.x - PROP_STAND[0]) > (T.span + 7.2) / 2 + 0.5, `${id} would clip the prop plane`);
    if (T.kind === 'plane') {
      s.power = 0.25;
      const hit = fly(s, id, NONE, 6, CITY);
      assert.equal(hit, 0, `${id} bumps on the way out`);
      assert.ok(s.ground && s.z > HANGAR[3] + T.L / 2, `${id} is still in the hangar`);
    } else {
      // The helicopter lifts under the roof only as far as it goes, then flies out
      fly(s, id, { throttle: 0, turn: 0, climb: 1 }, 5, CITY, (st) => assert.ok(st.y + T.tall <= HANGAR_ROOF[4] + 1e-6));
      assert.ok(!s.ground);
      fly(s, id, { throttle: 0.6, turn: 0, climb: 0.2 }, 4, CITY, (st) => assert.ok(!inside(st, id, SOLIDS)));
      assert.ok(s.z > HANGAR[3] + 2);
    }
  }
  // The office door is clear to stand at
  assert.ok(!SOLIDS.some((b) => HANGAR_DOOR.x > b[0] - 0.22 && HANGAR_DOOR.x < b[2] + 0.22 && HANGAR_DOOR.z > b[1] - 0.22 && HANGAR_DOOR.z < b[3] + 0.22));
});

test('getting out: only on the ground and stopped; the saved aircraft is cleaned', () => {
  const s = aloft('prop', 0, 0, 10, 0, 0.5);
  assert.ok(!canLeave(s));
  const g = newFlight(0, 0, 0);
  assert.ok(canLeave(g));
  g.speed = 5;
  assert.ok(!canLeave(g));
  assert.deepEqual(cleanPlane(null), DEFAULT_PLANE);
  assert.deepEqual(cleanPlane({ model: 'heli', paint: 'cyan' }), { model: 'heli', paint: 'cyan' });
  assert.deepEqual(cleanPlane({ model: 'airliner', paint: 'chrome' }), DEFAULT_PLANE);
});
