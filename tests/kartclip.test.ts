// Nothing at the kart park clips through anything else (docs/kart-west-plan.md Phase 2): karts through the tunnel's
// wall, the flyover's railing, its columns, the barriers and each other; the deck's headroom over the run below; the
// trackside furniture (kartside.ts), the barriers, the catch fencing, the floodlights, the trees, the banks and the
// buildings clear of the circuit and of each other; and the race camera kept inside the tunnel, under the deck and
// over the ground (camRoom()).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAM_GAP,
  CIRCUIT,
  CLEAR,
  COURSES,
  COURSE_IDS,
  DECK_DEPTH,
  DECK_OUT,
  KERB,
  RESET_AT,
  SUPPORTS,
  SUPPORT_HALF,
  TRACK_HALF,
  TUBE_IN,
  camRoom,
  circuitSurfaceAt,
  enclosed,
  groundAt,
} from '../src/scripts/city3d/kartcircuit';
import { ARMCO_OUT, BANKS, BARRIERS, FIXTURES, FLOOD, FLOODLIGHTS, KART_TREES, TYRE_OUT, TYRE_R, TYRE_WALLS, bankAt, circuitDistance } from '../src/scripts/city3d/kartfacility';
import { BOARDS, CATCH_WORLD, FIXED, MARSHALS, segDist, tracksideOf } from '../src/scripts/city3d/kartside';
import { F, KART_BODY, KART_PARK, KART_W, frame, toLocal, type Pt } from '../src/scripts/city3d/kartpark';
import { NO_INPUT, createKartSim, tune } from '../src/scripts/city3d/kart-sim';
import { KART_SPECS, PLAYER_KARTS } from '../src/scripts/city3d/mykart';
import * as THREE from 'three';
import { DRIVER_SCALE, KART_SHAPES, WHEEL_R, WHEEL_TILT, driverRoot, kartPose, wheelOf } from '../src/scripts/city3d/kartframe';
import { makeSkeleton, newPose, poseSkeleton } from '../src/scripts/city3d/skeleton';

const EDGE = TRACK_HALF + KERB;
const HALF = KART_W / 2;
/** A seated driver's head over the ground (the tallest seat, his sitting height at the driver's scale), with a hand's room */
const HEAD = Math.max(...Object.values(KART_SHAPES).map((s) => s.seat)) + 0.62 * DRIVER_SCALE + 0.1;
const c = CIRCUIT;
const ground = (i: number) => c.y[i] < 0.5;

test("a kart scraping along the tunnel's wall keeps inside the tube, its driver's head under the roof", () => {
  // The sim holds a kart's middle at the kerb's edge in the tunnel (kart-sim.ts)
  assert.ok(EDGE + HALF + 0.1 < TUBE_IN, `the kart's side at ${(EDGE + HALF).toFixed(2)}, the wall at ${TUBE_IN.toFixed(2)}`);
  assert.ok(Math.sqrt(TUBE_IN ** 2 - (EDGE + HALF) ** 2) > HEAD, "the roof over the driver's head at the wall");
  // ...and over the camera, behind the kart in the middle
  assert.ok(TUBE_IN - CAM_GAP > 2.1, 'room for the chase camera');
});

test("a kart on the flyover is put back before its side reaches the railing; the deck has headroom over the run below", () => {
  // Put back past the kerb's edge, a tick's travel at the fastest past it at most
  assert.ok(EDGE + HALF + 0.25 < DECK_OUT - 0.05, "the kart's side short of the railing");
  let under = 0;
  for (let i = 0; i < c.x.length; i++) {
    if (!(c.flags[i] & F.deck) || c.y[i] < 0.6) continue;
    const f = frame(c, i * c.step);
    for (let j = 0; j < c.x.length; j++) {
      if (!ground(j)) continue;
      const lat = (c.x[j] - f.x) * f.nx + (c.z[j] - f.z) * f.nz;
      const ahead = (c.x[j] - f.x) * f.tx + (c.z[j] - f.z) * f.tz;
      if (Math.abs(lat) > DECK_OUT + EDGE || Math.abs(ahead) > c.step) continue;
      under++;
      const room = f.y - DECK_DEPTH - c.y[j];
      assert.ok(room > HEAD + 0.6, `${room.toFixed(2)} under the deck at ${i}`);
    }
  }
  assert.ok(under > 5, 'the run below passes under it');
});

test("the flyover's columns stand off every stretch of track and its run-off, and off the deck's own ramps", () => {
  assert.ok(SUPPORTS.length >= 4);
  for (const s of SUPPORTS)
    for (let i = 0; i < c.x.length; i++) {
      const d = Math.hypot(c.x[i] - s.x, c.z[i] - s.z);
      if (ground(i)) assert.ok(d > CLEAR + SUPPORT_HALF, `a column ${d.toFixed(2)} from the run below`);
      else assert.ok(d > DECK_OUT + SUPPORT_HALF - 0.4, `a column ${d.toFixed(2)} from the deck's middle`);
    }
});

test('a kart is put back before its side reaches a tyre wall or the armco, from any stretch of track', () => {
  assert.ok(RESET_AT + HALF + 0.05 < TYRE_OUT - TYRE_R && TYRE_OUT + TYRE_R < ARMCO_OUT);
  const track = (p: Pt) => Math.min(...Array.from(c.x, (x, i) => Math.hypot(x - p[0], c.z[i] - p[1])));
  for (const run of TYRE_WALLS) for (const p of run) assert.ok(track(p) - TYRE_R > RESET_AT + HALF, `a tyre stack ${(track(p) - TYRE_R).toFixed(2)} from the circuit`);
  for (const run of BARRIERS) for (const p of run) assert.ok(track(p) > RESET_AT + HALF + 0.1, `the armco ${track(p).toFixed(2)} from the circuit`);
  // The catch fencing behind the armco's line
  for (const [a, b] of CATCH_WORLD)
    for (let t = 0; t <= 1; t += 0.02) {
      const p: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      assert.ok(circuitDistance(p[0], p[1]) > ARMCO_OUT, `catch fencing ${circuitDistance(p[0], p[1]).toFixed(2)} from the circuit`);
    }
});

test('the barriers keep off the banks, the buildings, the floodlights and the trees', () => {
  const things = [...FLOODLIGHTS.map((f) => ({ x: f.x, z: f.z, r: FLOOD.half * Math.SQRT2 })), ...KART_TREES.map(([x, z, s]) => ({ x, z, r: 0.4 * s }))];
  for (const [runs, r] of [
    [BARRIERS, 0.1],
    [TYRE_WALLS, TYRE_R],
  ] as const)
    for (const run of runs)
      for (const p of run) {
        const [u, v] = toLocal(p);
        for (const b of BANKS) assert.ok(bankAt(b, u, v) === 0, `a barrier on the ${b.id} bank`);
        for (const f of FIXTURES) assert.ok(!(u > f.u0 - r && u < f.u1 + r && v > f.v0 - r && v < f.v1 + r), `a barrier in ${JSON.stringify(f)}`);
        for (const t of things) assert.ok(Math.hypot(t.x - p[0], t.z - p[1]) > t.r + r, `a barrier in a floodlight or a tree at ${p}`);
      }
});

test('the marshal posts and each way\'s boards stand clear of the circuit, the barriers, the banks, the buildings and each other', () => {
  assert.ok(MARSHALS.length >= 6, `${MARSHALS.length} marshal posts`);
  for (const id of COURSE_IDS) {
    const boards = BOARDS[id];
    // Every corner numbered, its hard corners' markers, chevrons along the bends
    assert.deepEqual([...new Set(boards.filter((b) => b.kind === 'number').map((b) => b.n))].sort((a, b) => a - b), COURSES[id].turns.map((t) => t.n).sort((a, b) => a - b), `${id}'s numbers`);
    assert.ok(boards.filter((b) => b.kind === 'marker').length >= 12 && boards.filter((b) => b.kind === 'chevron').length >= 15, `${id}'s markers and chevrons`);
    const all = [...FIXED, ...tracksideOf(id)];
    for (const s of tracksideOf(id)) {
      assert.ok(circuitDistance(s.x, s.z) > ARMCO_OUT, `${s.x}, ${s.z} inside the armco`);
      const p: Pt = [s.x, s.z];
      for (const run of BARRIERS) for (let i = 1; i < run.length; i++) assert.ok(segDist(p, run[i - 1], run[i]) > 0.15, 'in the armco');
      for (const run of TYRE_WALLS) for (const q of run) assert.ok(Math.hypot(q[0] - s.x, q[1] - s.z) > TYRE_R + 0.1, 'in a tyre wall');
      for (const [a, b] of CATCH_WORLD) assert.ok(segDist(p, a, b) > 0.2, 'in the catch fencing');
      const [u, v] = toLocal(p);
      for (const b of BANKS) assert.ok(bankAt(b, u, v) === 0, `on the ${b.id} bank`);
      for (const f of FIXTURES) assert.ok(!(u > f.u0 && u < f.u1 && v > f.v0 && v < f.v1), 'in a building or on the plaza');
      assert.ok(s.x > KART_PARK.x0 && s.x < KART_PARK.x1 && s.z > KART_PARK.z0 && s.z < KART_PARK.z1, 'inside the fence');
      for (const o of all) if (o !== s) assert.ok(Math.hypot(o.x - s.x, o.z - s.z) >= o.r + s.r, `${s.x.toFixed(1)}, ${s.z.toFixed(1)} in something ${Math.hypot(o.x - s.x, o.z - s.z).toFixed(2)} away`);
    }
  }
});

test('the floodlights, trees and the flyover\'s columns keep off each other and the circuit', () => {
  for (let a = 0; a < FIXED.length; a++)
    for (let b = a + 1; b < FIXED.length; b++) {
      const [p, q] = [FIXED[a], FIXED[b]];
      assert.ok(Math.hypot(p.x - q.x, p.z - q.z) > (p.r + q.r) * 0.7, `${p.x.toFixed(1)}, ${p.z.toFixed(1)} in ${q.x.toFixed(1)}, ${q.z.toFixed(1)}`);
    }
  for (const f of FLOODLIGHTS) assert.ok(circuitDistance(f.x, f.z) > ARMCO_OUT + FLOOD.half, 'a floodlight inside the armco');
  for (const [x, z] of KART_TREES) assert.ok(circuitDistance(x, z) > ARMCO_OUT + 0.6, 'a tree inside the armco');
});

test('the race camera keeps inside the tunnel, under the deck when the kart is below it, and over the ground', () => {
  let tunnel = 0;
  let deck = 0;
  for (let s = 0; s < c.L; s += 0.7) {
    const f = frame(c, s);
    if (f.flags & F.tunnel) {
      // Out through the wall, and up through the roof
      for (const [lat, up] of [
        [4.5, 1.6],
        [-4.5, 1.6],
        [0, 4.5],
        [3.4, 2.6],
      ]) {
        const [x, y, z] = camRoom(f.x + f.nx * lat, f.y + up, f.z + f.nz * lat, f.x, f.y, f.z);
        const g = frame(c, s);
        const l = (x - g.x) * g.nx + (z - g.z) * g.nz;
        // (to within a few cm: the tube runs straight between the samples, the frame here is between two)
        assert.ok(Math.hypot(l, y - g.y) <= TUBE_IN - CAM_GAP + 0.06, `the camera through the tube at ${s.toFixed(1)}: ${Math.hypot(l, y - g.y).toFixed(2)}`);
        tunnel++;
      }
    }
    if (f.flags & F.deck && f.y > 1.2) {
      // Somewhere under it on the run below: the camera behind a kart down there stays under the slab
      for (let j = 0; j < c.x.length; j++) {
        if (!ground(j)) continue;
        const lat = (c.x[j] - f.x) * f.nx + (c.z[j] - f.z) * f.nz;
        const ahead = (c.x[j] - f.x) * f.tx + (c.z[j] - f.z) * f.tz;
        if (Math.abs(lat) > DECK_OUT - 0.3 || Math.abs(ahead) > c.step * 0.5) continue;
        const [, y] = camRoom(c.x[j], c.y[j] + 2.4, c.z[j], c.x[j], c.y[j], c.z[j]);
        assert.ok(y <= f.y - DECK_DEPTH - CAM_GAP + 1e-6, `the camera in the deck at ${s.toFixed(1)}: ${y.toFixed(2)} under ${(f.y - DECK_DEPTH).toFixed(2)}`);
        deck++;
      }
    }
  }
  assert.ok(tunnel > 10 && deck > 3, `${tunnel} in the tunnel, ${deck} under the deck`);
  // Over the ground everywhere round the circuit, and the kart on the deck keeps its camera over it
  for (let s = 0; s < c.L; s += 3) {
    const f = frame(c, s);
    for (const lat of [0, 3, -3, 5, -5]) {
      const x = f.x + f.nx * lat;
      const z = f.z + f.nz * lat;
      const [, y] = camRoom(x, -1, z, f.x, f.y, f.z);
      const surf = circuitSurfaceAt(x, z, f.y);
      assert.ok(y >= (surf ? surf.y : 0) + CAM_GAP - 1e-6, `the camera under the ground at ${s}, ${lat}`);
    }
  }
  // (and leaves it alone in the open)
  const f = frame(c, c.start);
  const [x, y, z] = camRoom(f.x, f.y + 2, f.z + 0.1, f.x, f.y, f.z);
  assert.ok(Math.abs(x - f.x) < 1e-9 && Math.abs(y - f.y - 2) < 1e-9 && Math.abs(z - f.z - 0.1) < 1e-9);
  assert.ok(groundAt(f, 0) <= f.y + 1e-9);
});

test('in a race, karts never sit inside each other, nor through the tunnel\'s wall, the deck\'s railing or a column', () => {
  const rivals = PLAYER_KARTS.flatMap((k) => [k, k]).slice(0, 7).map((k) => ({ kart: k, tune: tune(KART_SPECS[k], 'neon') }));
  for (const course of COURSE_IDS) {
    const sim = createKartSim({ course, cup: 'rookie', laps: 2, player: { kart: 'tank', tune: tune(KART_SPECS.tank, 'neon') }, rivals, seed: 11, auto: true });
    let worst = 0;
    let close = 0;
    for (let t = 0; t < 400 && !sim.over; t += 1 / 60) {
      sim.step(1 / 60, NO_INPUT);
      const ks = sim.racers.filter((k) => k.resetT <= 0);
      for (let a = 0; a < ks.length; a++) {
        const k = ks[a];
        const f = frame(sim.course, k.s);
        if (f.flags & F.tunnel) assert.ok(Math.abs(k.lateral) <= EDGE + 1e-6, `through the tunnel's wall at ${k.lateral.toFixed(2)}`);
        if (enclosed(f)) assert.ok(Math.abs(k.lateral) + HALF < DECK_OUT - 0.05 || f.flags & F.tunnel, `through the railing at ${k.lateral.toFixed(2)}`);
        for (const s of SUPPORTS) if (k.y < s.h - DECK_DEPTH - 0.2) assert.ok(Math.hypot(k.x - s.x, k.z - s.z) > SUPPORT_HALF + HALF, 'through a column');
        for (let b = a + 1; b < ks.length; b++) {
          const q = ks[b];
          if (Math.abs(k.y - q.y) > 0.9) continue;
          let d = Infinity;
          for (const oa of [KART_BODY.front, KART_BODY.rear])
            for (const ob of [KART_BODY.front, KART_BODY.rear])
              d = Math.min(d, Math.hypot(q.x + Math.cos(q.yaw) * ob - k.x - Math.cos(k.yaw) * oa, q.z - Math.sin(q.yaw) * ob - k.z + Math.sin(k.yaw) * oa));
          const into = KART_BODY.r * 2 - d;
          if (into > 0) close++;
          worst = Math.max(worst, into);
        }
      }
    }
    assert.ok(sim.over, `${course}: everyone finished`);
    // (bumps are put right each tick: what's left at the end of one is a sliver)
    assert.ok(worst < 0.15, `${course}: karts ${worst.toFixed(2)} inside each other (${close} ticks)`);
  }
});

test('Degen in his kart: knees behind the wheel\'s rim and over the floor, elbows and knees inside the kart, his head under the height the tunnel and the deck leave', () => {
  const sk = makeSkeleton();
  for (const id of PLAYER_KARTS)
    for (const turn of [0, 0.9, -0.9]) {
      const p = newPose();
      kartPose(p, id, 0, 0, turn);
      poseSkeleton(sk, p);
      sk.root.position.set(...driverRoot(id));
      sk.root.rotation.set(0, Math.PI / 2, 0);
      sk.root.scale.setScalar(DRIVER_SCALE);
      sk.root.updateMatrixWorld(true);
      const at = (n: 'shinL' | 'shinR' | 'foreL' | 'foreR' | 'head') => sk.bones[n].getWorldPosition(new THREE.Vector3());
      const s = KART_SHAPES[id];
      const [wx, wy] = wheelOf(id);
      // The wheel's lower rim, tilted back towards him
      const rimX = wx + WHEEL_R * Math.sin(WHEEL_TILT);
      const rimY = wy - WHEEL_R * Math.cos(WHEEL_TILT);
      for (const k of ['shinL', 'shinR'] as const) {
        const q = at(k);
        assert.ok(q.x < rimX - 0.1 || q.y < rimY - 0.08, `${id} ${turn}: ${k} in the wheel`);
        assert.ok(q.y > s.floor + 0.12 && Math.abs(q.z) < s.track, `${id} ${turn}: ${k} through the floor or out of the kart`);
      }
      for (const e of ['foreL', 'foreR'] as const) assert.ok(Math.abs(at(e).z) < s.track + s.tw / 2, `${id} ${turn}: ${e} out past the wheels`);
      assert.ok(at('head').y + 0.15 < HEAD, `${id}: his head over the room the tunnel and the deck leave`);
    }
});
