// The game's moments (the revamp's Phase 4, moments.ts): a mark stands him short of the thing facing it; the
// approach walks him onto it and plays when he's there (or gives up on time, never stuck); a door's push opens
// the panel as the hand lands (once, or at once on a skip) and is done; a counter's lean holds while its menu is
// open and comes back when it closes; a bench sits him down onto the seat and stands him up again; and the
// hands land on the handle and the counter's top within the rubric's reach of them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MOMENT, type Phase, benchMark, counterMark, createMoment, doorMark, momentPose } from '../src/scripts/city3d/moments';
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
