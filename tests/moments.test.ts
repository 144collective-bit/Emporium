// The game's moments (the revamp's Phase 4, moments.ts): a mark stands him short of the thing facing it; the
// approach walks him onto it and plays when he's there (or gives up on time, never stuck); a door's push opens
// the panel as the hand lands (once, or at once on a skip) and is done; a counter's lean holds while its menu is
// open and comes back when it closes; a bench sits him down onto the seat and stands him up again; and the
// hands land on the handle and the counter's top within the rubric's reach of them. Step 2: getting into and out of
// the car, the kart, the aircraft and the boat (the hands on the handle, the rim, the frame or the rails; the root
// to the seat and back), the lifts (walked in and turned to face out) and carrying a crate (picked up, carried in
// both hands, set down).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MOMENT, type Phase, type Vehicle, alightMark, benchMark, boardMark, counterMark, crateMark, createMoment, doorMark, liftMark } from '../src/scripts/city3d/moments';
import { carriedAt, carryPose, crateAt, momentPose } from '../src/scripts/city3d/momentposes';
import { HIP_HEIGHT, makeSkeleton, newPose, poseSkeleton } from '../src/scripts/city3d/skeleton';
import { idlePose } from '../src/scripts/city3d/poses';
import { SEAT_H } from '../src/scripts/city3d/pedestrians';

const SCALE = 0.85;
const DT = 1 / 60;
const CM = 180;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** A walker on the moment's goals: a simple mover that turns and walks as asked, the way walk.ts's springs do (roughly) */
function walker(x: number, z: number, face: number) {
  const w = { x, z, face, speed: 0 };
  return {
    w,
    step(goal: { dx: number; dz: number; speed: number; face: number | null } | null) {
      if (goal) {
        w.speed += (goal.speed - w.speed) * 0.25;
        w.x += goal.dx * w.speed * DT;
        w.z += goal.dz * w.speed * DT;
        const want = goal.face ?? (goal.speed > 0 ? Math.atan2(goal.dx, goal.dz) : w.face);
        w.face += wrap(want - w.face) * 0.2;
      } else w.speed *= 0.7;
    },
  };
}

test('a door mark stands him short of the door facing it, with the handle to his right; a blocked spot keeps him where he is', () => {
  const m = doorMark({ x: 10, z: 20 }, 10, 22, 0);
  assert.ok(Math.abs(m.x - 10) < 1e-9 && Math.abs(m.z - (20 + MOMENT.stand.door)) < 1e-9, 'stands short of it');
  assert.ok(Math.abs(wrap(m.face - Math.PI)) < 1e-9, 'facing it (-z)');
  // (facing -z his right is +x)
  assert.ok(m.hands[0].x > 10 && Math.abs(m.hands[0].y - MOMENT.door.handleY) < 1e-9, 'the handle to his right at its height');
  const b = doorMark({ x: 10, z: 20 }, 10.3, 21.2, 0, () => true);
  assert.ok(b.x === 10.3 && b.z === 21.2, 'blocked: stays where he is');
  assert.ok(Math.abs(wrap(b.face - Math.atan2(-0.3, -1.2))) < 1e-9, 'facing the door from there');
});

test('the approach walks him onto the mark and plays when he is there; from too far it plays at once; it never waits past its time', () => {
  const m = doorMark({ x: 0, z: 2 }, 0.4, 0.3, 0);
  const mo = createMoment();
  const w = walker(0.4, 0.3, 0.3);
  let opened = 0;
  mo.start(m, () => opened++, w.w.x, w.w.z);
  assert.equal(mo.phase, 'approach');
  let frames = 0;
  while (mo.phase === 'approach' && frames < 600) {
    w.step(mo.update({ dt: DT, ...w.w }));
    frames++;
  }
  assert.equal(mo.phase, 'play');
  assert.ok(frames * DT < MOMENT.approach.timeout - 0.05, `arrived on his own (${(frames * DT).toFixed(2)} s)`);
  assert.ok(Math.hypot(w.w.x - m.x, w.w.z - m.z) < MOMENT.approach.at + 0.02, 'at the mark');
  assert.ok(Math.abs(wrap(w.w.face - m.face)) < MOMENT.approach.faceAt + 0.02, 'facing the door');
  assert.equal(opened, 0, 'nothing opened yet');
  // Too far: no approach
  const far = createMoment();
  far.start(m, undefined, 0, -5);
  assert.equal(far.phase, 'play');
  // A walker that never gets there (stuck): the clip plays on time
  const stuck = createMoment();
  stuck.start(m, undefined, 1.5, 0);
  let n = 0;
  while (stuck.phase === 'approach' && n < 600) (stuck.update({ dt: DT, x: 1.5, z: 0, face: 0, speed: 0 }), n++);
  assert.equal(stuck.phase, 'play');
  assert.ok(Math.abs(n * DT - MOMENT.approach.timeout) < 0.05, 'on time');
});

test('a door: the panel opens as the hand lands, once, and the push plays out; F again opens at once', () => {
  const m = doorMark({ x: 0, z: 2 }, 0, 1.3, 0);
  const mo = createMoment();
  let opened = 0;
  mo.start(m, () => opened++, m.x, m.z);
  mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
  assert.equal(mo.phase, 'play');
  let openedAt = -1;
  let peak = 0;
  const ph = (): Phase => mo.phase;
  for (let i = 0; i < 120 && ph() !== 'done'; i++) {
    mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
    if (opened && openedAt < 0) openedAt = mo.u;
    peak = Math.max(peak, mo.amount());
  }
  assert.equal(opened, 1, 'opened once');
  assert.ok(Math.abs(openedAt - MOMENT.door.open) < 0.05, `opened as the hand landed (${openedAt.toFixed(2)})`);
  assert.ok(peak > 0.95, 'the hand all the way to the handle');
  assert.equal(mo.phase, 'done');
  assert.ok(mo.amount() === 0 && !mo.posing && !mo.active);
  // A skip
  const q = createMoment();
  let o2 = 0;
  q.start(m, () => o2++, 0, 1.3);
  q.skip();
  assert.equal(o2, 1);
  q.skip();
  assert.equal(o2, 1, 'still once');
});

test('a counter: the lean comes in and opens the menu, holds while it is open, and comes back when it closes', () => {
  const m = counterMark({ x: 5, z: 4.5 }, 0.6, 0, 5, 5.3);
  const mo = createMoment();
  let opened = 0;
  mo.start(m, () => opened++, m.x, m.z);
  mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
  assert.equal(mo.phase, 'play');
  for (let i = 0; i < 60; i++) mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
  assert.equal(mo.phase, 'hold');
  assert.equal(opened, 1);
  assert.equal(mo.amount(), 1);
  for (let i = 0; i < 300; i++) mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
  assert.equal(mo.phase, 'hold', 'held as long as the menu is open');
  mo.release();
  assert.equal(mo.phase, 'back');
  let last = 1;
  while (mo.phase === 'back') {
    mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
    assert.ok(mo.amount() <= last + 1e-9, 'coming back, never forward');
    last = mo.amount();
  }
  assert.equal(mo.phase, 'done');
  // Released part way in: back from there, never a jump
  const p = createMoment();
  p.start(m, undefined, m.x, m.z);
  p.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
  for (let i = 0; i < 10; i++) p.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
  const was = p.amount();
  p.release();
  assert.ok(Math.abs(p.amount() - was) < 1e-6, 'from where it was');
});

test('a bench: down onto the seat, the root dropping to the seat and back onto it; stood up it comes back to the stand spot', () => {
  const bench = { x: 3, z: 7, ry: Math.PI / 2 };
  const m = benchMark(bench, 0.1);
  assert.ok(Math.abs(m.x - (3 + MOMENT.stand.bench)) < 1e-9 && Math.abs(m.z - 7) < 1e-9, 'standing in front of the seat');
  assert.equal(m.face, bench.ry);
  const mo = createMoment();
  mo.scale = SCALE;
  mo.start(m, undefined, m.x, m.z);
  assert.equal(mo.root(), null, 'standing: no shift');
  mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
  assert.equal(mo.phase, 'play');
  let lastY = Infinity;
  while (mo.phase === 'play') {
    mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
    const r = mo.root()!;
    assert.ok(r.y <= lastY + 1e-9, 'coming down, never up');
    lastY = r.y;
  }
  assert.equal(mo.phase, 'hold');
  const r = mo.root()!;
  assert.ok(Math.abs(r.y - (0.1 + SEAT_H - (HIP_HEIGHT - 0.03) * SCALE)) < 1e-9, 'the root down so the hips sit on the seat');
  assert.ok(Math.abs(r.x - m.seat!.x) < 1e-9 && Math.abs(r.z - m.seat!.z) < 1e-9, 'on the seat');
  mo.release();
  while (mo.phase === 'back') mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
  assert.equal(mo.phase, 'done');
  assert.equal(mo.root(), null);
});

/** A bone's world position for a figure at (x, y, z) facing `face` at SCALE in pose `p` */
function boneAt(sk: ReturnType<typeof makeSkeleton>, p: ReturnType<typeof newPose>, name: 'handL' | 'handR' | 'hips' | 'footL' | 'footR', x: number, y: number, z: number, face: number) {
  poseSkeleton(sk, p);
  sk.root.position.set(x, y, z);
  sk.root.rotation.set(0, face, 0);
  sk.root.scale.setScalar(SCALE);
  sk.root.updateMatrixWorld(true);
  return sk.bones[name].getWorldPosition(new THREE.Vector3());
}

test('the hand lands on the door handle, and both hands on the counter, within reach of them (the rubric)', () => {
  const sk = makeSkeleton();
  // (the hand bone sits at the palm's middle, which reachArm() lands on the thing)
  const HAND = 0;
  for (const face of [0, Math.PI / 2, Math.PI, -2.1]) {
    const dx = Math.sin(face);
    const dz = Math.cos(face);
    const door = { x: 4 + dx * 1.2, z: 9 + dz * 1.2 };
    const m = doorMark(door, 4, 9, 0);
    const mo = createMoment();
    mo.scale = SCALE;
    mo.start(m, undefined, m.x, m.z);
    mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
    let best = Infinity;
    while (mo.phase === 'play') {
      mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
      const p = newPose();
      idlePose(p, 0);
      momentPose(p, mo, 1, m.x, m.y, m.z, m.face, SCALE, 0);
      // (arms[0] is the rig's -x arm, his right: the handL bone)
      const h = boneAt(sk, p, 'handL', m.x, m.y, m.z, m.face);
      best = Math.min(best, h.distanceTo(new THREE.Vector3(m.hands[0].x, m.hands[0].y, m.hands[0].z)));
    }
    assert.ok(best < HAND + 0.015, `facing ${face.toFixed(2)}: the hand on the handle (${(best * CM).toFixed(1)} cm)`);
  }
  const m = counterMark({ x: 5, z: 4.5 }, 0.6, 0, 5, 5.3);
  const mo = createMoment();
  mo.scale = SCALE;
  mo.start(m, undefined, m.x, m.z);
  for (let i = 0; i < 90; i++) mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
  assert.equal(mo.phase, 'hold');
  const p = newPose();
  idlePose(p, 0);
  momentPose(p, mo, 1, m.x, m.y, m.z, m.face, SCALE, 0);
  for (const [i, name] of [[0, 'handL'], [1, 'handR']] as const) {
    const h = boneAt(sk, p, name, m.x, m.y, m.z, m.face);
    const d = h.distanceTo(new THREE.Vector3(m.hands[i].x, m.hands[i].y, m.hands[i].z));
    assert.ok(d < HAND + 0.015, `${name} on the counter (${(d * CM).toFixed(1)} cm)`);
  }
});

test('seated, the hips are at the seat and the feet about the ground; the pose eases on and off', () => {
  const sk = makeSkeleton();
  const bench = { x: 3, z: 7, ry: 0.4 };
  const m = benchMark(bench, 0);
  const mo = createMoment();
  mo.scale = SCALE;
  mo.start(m, undefined, m.x, m.z);
  for (let i = 0; i < 120; i++) mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
  assert.equal(mo.phase, 'hold');
  const r = mo.root()!;
  const p = newPose();
  idlePose(p, 0);
  momentPose(p, mo, 1, r.x, r.y, r.z, m.face, SCALE, 0);
  const hips = boneAt(sk, p, 'hips', r.x, r.y, r.z, m.face);
  assert.ok(Math.abs(hips.y - SEAT_H) < 0.03, `the hips on the seat (${hips.y.toFixed(3)} of ${SEAT_H})`);
  assert.ok(Math.hypot(hips.x - m.seat!.x, hips.z - m.seat!.z) < 0.08, 'over the seat');
  for (const f of ['footL', 'footR'] as const) {
    const v = boneAt(sk, p, f, r.x, r.y, r.z, m.face);
    assert.ok(v.y > -0.2 && v.y < 0.2, `${f} about the ground (${v.y.toFixed(2)})`);
  }
});

test('getting in: the hands land on the handle, the rim, the frame or the rails, the root reaches the seat as the vehicle takes him, and out again', () => {
  const sk = makeSkeleton();
  const HAND = 0;
  for (const v of ['car', 'kart', 'plane', 'boat'] as Vehicle[]) {
    for (const face of [0, 1.9, Math.PI]) {
      const dx = Math.sin(face);
      const dz = Math.cos(face);
      const door = { x: 12 + dx * 1.0, z: 3 + dz * 1.0 };
      const seat = { x: door.x + dx * 0.5, z: door.z + dz * 0.5, y: v === 'boat' ? MOMENT.boat.deck + 0.3 : v === 'plane' ? MOMENT.plane.sill : MOMENT[v].seat };
      const m = boardMark(v, door, seat, 12, 3, 0);
      assert.ok(Math.abs(Math.hypot(m.x - door.x, m.z - door.z) - MOMENT.board.stand) < 1e-9, `${v}: stands short of its side`);
      assert.ok(Math.abs(wrap(m.face - face)) < 1e-9, `${v}: facing it`);
      const mo = createMoment();
      mo.scale = SCALE;
      let taken = 0;
      mo.start(m, () => taken++, m.x, m.z);
      mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
      assert.equal(mo.phase, 'play');
      let best = Infinity;
      let rootAtTake: { x: number; z: number; y: number } | null = null;
      while (mo.phase === 'play') {
        mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
        if (taken && !rootAtTake) rootAtTake = mo.root();
        if (taken) continue;
        const r = mo.root() ?? { x: m.x, z: m.z, y: m.y };
        const p = newPose();
        idlePose(p, 0);
        momentPose(p, mo, 1, r.x, r.y, r.z, m.face, SCALE, 0);
        let worst = 0;
        for (const [i, name] of [[0, 'handL'], [1, 'handR']] as const) {
          if (i >= m.hands.length) break;
          const h = boneAt(sk, p, name, r.x, r.y, r.z, m.face);
          worst = Math.max(worst, h.distanceTo(new THREE.Vector3(m.hands[i].x, m.hands[i].y, m.hands[i].z)));
        }
        best = Math.min(best, worst);
      }
      assert.ok(best < HAND + 0.015, `${v} facing ${face.toFixed(2)}: the hands on it (${(best * CM).toFixed(1)} cm)`);
      assert.equal(taken, 1, `${v}: the vehicle takes him once`);
      assert.ok(rootAtTake && Math.hypot(rootAtTake.x - seat.x, rootAtTake.z - seat.z) < 0.1, `${v}: the root at the seat when it takes him`);
      // Out again: from the seat to where he stands, the root rising (or climbing) back to his feet, at once
      const out = { x: door.x - dx * 0.6, z: door.z - dz * 0.6 };
      const a = alightMark(v, seat, out, 0, face + Math.PI);
      const ao = createMoment();
      ao.scale = SCALE;
      ao.start(a, undefined, 5, 5);
      assert.equal(ao.phase, 'play', `${v}: an alight plays at once, wherever he was`);
      const r0 = ao.root()!;
      assert.ok(Math.hypot(r0.x - seat.x, r0.z - seat.z) < 0.02, `${v}: starts at the seat`);
      let last = r0;
      while (ao.phase === 'play') {
        ao.update({ dt: DT, x: last.x, z: last.z, face: a.face, speed: 0 });
        const r = ao.root();
        if (r) {
          assert.ok(Math.hypot(r.x - out.x, r.z - out.z) <= Math.hypot(last.x - out.x, last.z - out.z) + 1e-9, `${v}: never back towards the seat`);
          last = r;
        }
      }
      assert.ok(Math.hypot(last.x - out.x, last.z - out.z) < 0.02 && Math.abs(last.y) < 0.02, `${v}: ends standing where he gets out`);
      assert.equal(ao.phase, 'done');
    }
  }
});

test('a lift: the approach walks him in through the door and turns him to face out; the fade comes after a beat', () => {
  const door = { x: 20, z: 30 };
  const m = liftMark(door, 20, 31, 0);
  assert.ok(Math.abs(m.x - 20) < 1e-9 && Math.abs(m.z - (30 - MOMENT.lift.inside)) < 1e-9, 'inside the door');
  assert.ok(Math.abs(wrap(m.face - 0)) < 1e-9, 'facing out (+z, back the way he came)');
  const mo = createMoment();
  const w = walker(20, 31, Math.PI);
  let faded = 0;
  mo.start(m, () => faded++, w.w.x, w.w.z);
  let frames = 0;
  while (mo.phase === 'approach' && frames < 600) {
    w.step(mo.update({ dt: DT, ...w.w }));
    frames++;
  }
  assert.equal(mo.phase, 'play');
  assert.ok(Math.hypot(w.w.x - m.x, w.w.z - m.z) < MOMENT.approach.at + 0.05, 'in the lift');
  assert.ok(Math.abs(wrap(w.w.face - m.face)) < MOMENT.approach.faceAt + 0.05, 'turned to face out');
  assert.equal(faded, 0);
  let t = 0;
  while (mo.phase === 'play') {
    mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
    t += DT;
  }
  assert.equal(faded, 1, 'the fade, once');
  assert.ok(t > MOMENT.lift.t * MOMENT.lift.fireAt - 0.05 && t <= MOMENT.lift.t + 0.05, `after a beat (${t.toFixed(2)} s)`);
  assert.equal(mo.phase, 'done');
});

test('carrying: the hands land on the crate on the ground, lift it into his hands, hold it on the walk, and set it down', () => {
  const sk = makeSkeleton();
  const HAND = 0;
  const at = { x: 7, z: 2 };
  const m = crateMark('pick', at, 7, 3.4, 0);
  assert.ok(Math.abs(Math.hypot(m.x - at.x, m.z - at.z) - MOMENT.crate.stand) < 1e-9, 'stands short of the crate');
  assert.ok(Math.abs(m.seat!.y - MOMENT.crate.h / 2) < 1e-9, 'the crate on the ground');
  const mo = createMoment();
  mo.scale = SCALE;
  let picked = 0;
  mo.start(m, () => picked++, m.x, m.z);
  mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
  assert.equal(mo.phase, 'play');
  assert.equal(mo.lifted(), 0, 'on the ground to start');
  let best = Infinity;
  let lastLift = 0;
  const sideOf = (c: { x: number; y: number; z: number }, i: 0 | 1) => {
    const rx = -Math.cos(m.face);
    const rz = Math.sin(m.face);
    const s = (MOMENT.crate.w / 2 + MOMENT.palm) * SCALE * (i ? -1 : 1);
    return new THREE.Vector3(c.x + rx * s, c.y, c.z + rz * s);
  };
  while (mo.phase === 'play') {
    mo.update({ dt: DT, x: m.x, z: m.z, face: m.face, speed: 0 });
    const lift = mo.lifted();
    assert.ok(lift >= lastLift - 1e-9, 'the crate only comes up');
    lastLift = lift;
    // (done, the walk's carry pose takes over: below)
    if (mo.phase !== 'play') break;
    const p = newPose();
    idlePose(p, 0);
    momentPose(p, mo, 1, m.x, m.y, m.z, m.face, SCALE, 0);
    const c = crateAt(mo, m.x, m.y, m.z, m.face, SCALE)!;
    let worst = 0;
    for (const [i, name] of [[0, 'handL'], [1, 'handR']] as const) worst = Math.max(worst, boneAt(sk, p, name, m.x, m.y, m.z, m.face).distanceTo(sideOf(c, i)));
    if (!picked) best = Math.min(best, worst);
    // (once it's in his hands they stay on it as it comes up)
    if (lift > 0.2) assert.ok(worst < HAND + 0.03, `the hands on the crate as it comes up (${(worst * CM).toFixed(1)} cm at ${lift.toFixed(2)})`);
  }
  assert.ok(best < HAND + 0.015, `the hands on the crate on the ground (${(best * CM).toFixed(1)} cm)`);
  assert.equal(picked, 1, 'picked up once');
  assert.equal(mo.phase, 'done');
  // On the walk: in both hands out in front
  const p = newPose();
  idlePose(p, 0);
  carryPose(p, 1, 9, 0, 4, 0.7, SCALE);
  const c = carriedAt(9, 0, 4, 0.7, SCALE);
  assert.ok(c.y > 0.45 && c.y < 0.75, `carried about hip height (${c.y.toFixed(2)})`);
  for (const [i, name] of [[0, 'handL'], [1, 'handR']] as const) {
    const rx = -Math.cos(0.7);
    const rz = Math.sin(0.7);
    const s = (MOMENT.crate.w / 2 + MOMENT.palm) * SCALE * (i ? -1 : 1);
    const d = boneAt(sk, p, name, 9, 0, 4, 0.7).distanceTo(new THREE.Vector3(c.x + rx * s, c.y, c.z + rz * s));
    assert.ok(d < HAND + 0.015, `${name} on the carried crate (${(d * CM).toFixed(1)} cm)`);
  }
  // Setting it down: carried until the hands let go, then on the ground
  const put = crateMark('put', { x: 11, z: 6 }, 10.2, 6.9, 0);
  const po = createMoment();
  po.scale = SCALE;
  let set = 0;
  po.start(put, () => set++, 10.2, 6.9);
  assert.equal(po.phase, 'approach');
  assert.equal(po.lifted(), 1, 'carried on the way');
  po.start(put, () => set++, put.x, put.z);
  po.update({ dt: DT, x: put.x, z: put.z, face: put.face, speed: 0 });
  const pph = (): Phase => po.phase;
  let last = 1;
  while (pph() === 'play') {
    po.update({ dt: DT, x: put.x, z: put.z, face: put.face, speed: 0 });
    const l = po.lifted();
    assert.ok(l <= last + 1e-9, 'the crate only goes down');
    last = l;
  }
  assert.ok(last < 1e-6, 'on the ground at the end');
  assert.equal(set, 1, 'set down once');
});
