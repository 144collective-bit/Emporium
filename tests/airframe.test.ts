// The aircraft's moving parts (airframe.ts, vehicle plan Phase 9): the control surfaces cut from their panels'
// trailing edges and moving the right way with the controls, the gear on the ground when down and folded away
// inside the body when up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  BIZ_BODY,
  FAIRINGS,
  GEAR_TIME,
  JET_BODY,
  LEGS,
  PANELS,
  SURFACES,
  corners,
  deflection,
  frames,
  inBody,
  inFairing,
  legLength,
  legMatrix,
  newAirframe,
  notched,
  place,
  stepAirframe,
  surfaceMatrix,
  type FrameKind,
  type Station,
} from '../src/scripts/city3d/airframe';

const KINDS: FrameKind[] = ['jet', 'bizjet', 'prop'];
const BODY: Partial<Record<FrameKind, Station[]>> = { jet: JET_BODY, bizjet: BIZ_BODY };
/** A surface's trailing edge's middle in the model at a deflection */
const tail = (f: ReturnType<typeof frames>[number], d: number) => new THREE.Vector3(1, 0, 0).applyMatrix4(surfaceMatrix(f, d));

test('every surface lies in its cut, its trailing edge on the panel\'s, inside its outline', () => {
  for (const k of KINDS) {
    for (const s of SURFACES[k]!) {
      const p = PANELS[k]![s.panel];
      const c = corners(p, s);
      // (the hinge's ends inside the panel: forward of the trailing edge, short of the leading edge)
      for (const q of [c.a2, c.b2]) {
        assert.ok(pointIn(p.outline, q), `${k} ${s.channel} hinge ${q} inside its panel`);
      }
      assert.ok(notched(k, s.panel).length > p.outline.length, `${k} ${s.panel} notched`);
    }
    for (const f of frames(k)) {
      // At rest its trailing edge's middle is on the panel's trailing edge (within the gap), at the panel's middle plane
      const p = PANELS[k]![SURFACES[k]!.find((s) => s.channel === f.channel)!.panel];
      const te = tail(f, 0);
      const [a, b] = [p.outline[1], p.outline[2]];
      const ends = [place(p, f.side, a[0], a[1], 0), place(p, f.side, b[0], b[1], 0)].map((q) => new THREE.Vector3(...q));
      const line = new THREE.Line3(ends[0], ends[1]);
      assert.ok(line.closestPointToPoint(te, true, new THREE.Vector3()).distanceTo(te) < 0.03, `${k} ${f.channel} ${f.side} at the trailing edge`);
    }
  }
});

function pointIn(poly: [number, number][], [x, y]: [number, number]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

test('the surfaces move the right way: rolling right, nose up, yawing right, flaps down', () => {
  for (const k of KINDS) {
    const a = newAirframe();
    const fs = frames(k);
    const moved = (ch: string, side: number, set: Partial<typeof a>) => {
      const f = fs.find((x) => x.channel === ch && x.side === side)!;
      const rest = tail(f, 0);
      return tail(f, deflection(f, { ...a, ...set })).sub(rest);
    };
    // Rolling right: the right aileron's trailing edge up, the left's down
    assert.ok(moved('aileron', 1, { ail: 1 }).y > 0.05, `${k} right aileron up`);
    assert.ok(moved('aileron', -1, { ail: 1 }).y < -0.05, `${k} left aileron down`);
    // Nose up: both elevators' trailing edges up
    for (const s of [1, -1]) assert.ok(moved('elevator', s, { ele: 1 }).y > 0.03, `${k} elevator up`);
    // Yawing right: the rudder's trailing edge to the right
    assert.ok(moved('rudder', 1, { rud: 1 }).z > 0.05, `${k} rudder right`);
    // Flaps: down and back
    for (const s of [1, -1]) {
      const d = moved('flap', s, { flap: 1 });
      assert.ok(d.y < -0.05 && d.x < 0, `${k} flap down and back`);
    }
  }
});

test('the airport\'s aircraft move their surfaces from how they turn, yours from the stick', () => {
  const a = newAirframe();
  const pose = { yaw: 0, pitch: 0, roll: 0, v: 40, ground: false, gear: false };
  stepAirframe(a, pose, 0);
  // Rolling into a right bank, nosing up, turning right
  for (let i = 1; i <= 30; i++) stepAirframe(a, { ...pose, roll: i * 0.01, pitch: i * 0.004, yaw: -i * 0.006 }, 1 / 30);
  assert.ok(a.ail > 0.3, `ailerons over: ${a.ail}`);
  assert.ok(a.ele > 0.3, `elevator up: ${a.ele}`);
  assert.ok(a.rud > 0.1, `rudder right: ${a.rud}`);
  // Held steady: they come back to the middle (the elevator held a little up in the bank)
  for (let i = 0; i < 60; i++) stepAirframe(a, { ...pose, roll: 0.3, pitch: 0.12, yaw: -0.18 }, 1 / 30);
  assert.ok(Math.abs(a.ail) < 0.02 && Math.abs(a.rud) < 0.02, 'centred');
  assert.ok(a.ele > 0 && a.ele < 0.3, 'a little back pressure');
  // The stick, straight on
  const b = newAirframe();
  for (let i = 0; i < 30; i++) stepAirframe(b, { ...pose, stick: { turn: -1, climb: 1 } }, 1 / 30);
  assert.ok(b.ail < -0.9 && b.ele > 0.9 && b.rud < -0.5);
  // Flaps: down with the gear in the air, part down rolling, up parked
  const c = newAirframe();
  for (let i = 0; i < 300; i++) stepAirframe(c, { ...pose, gear: true }, 1 / 30);
  assert.ok(c.flap > 0.95);
  for (let i = 0; i < 300; i++) stepAirframe(c, { ...pose, gear: true, ground: true, v: 10 }, 1 / 30);
  assert.ok(Math.abs(c.flap - 0.4) < 0.05);
  for (let i = 0; i < 300; i++) stepAirframe(c, { ...pose, gear: true, ground: true, v: 0 }, 1 / 30);
  assert.ok(c.flap < 0.05);
});

test('the gear takes GEAR_TIME to come up and go down, and lands where it is on the first step', () => {
  const a = newAirframe(0);
  stepAirframe(a, { yaw: 0, pitch: 0, roll: 0, v: 0, ground: true, gear: true }, 0);
  assert.equal(a.gear, 1);
  const up = { yaw: 0, pitch: 0, roll: 0, v: 60, ground: false, gear: false };
  stepAirframe(a, up, GEAR_TIME / 2);
  assert.ok(Math.abs(a.gear - 0.5) < 1e-9);
  stepAirframe(a, up, GEAR_TIME);
  assert.equal(a.gear, 0);
});

/** Points over a leg's wheels and strut (in the leg's own space, hanging from the origin) */
function legPoints(l: NonNullable<(typeof LEGS)['jet']>[number]) {
  const L = legLength(l);
  const wheels: THREE.Vector3[] = [];
  const zs = l.twin ? [-l.twin, l.twin] : [0];
  for (const z0 of zs)
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      for (const dz of [-l.w / 2, l.w / 2]) wheels.push(new THREE.Vector3(Math.cos(a) * l.r, -L + Math.sin(a) * l.r, z0 + dz));
    }
  const strut = [0.15, 0.5, 0.85].map((f) => new THREE.Vector3(0, -L * f, 0));
  return { wheels, strut };
}

test('the gear stands on the ground when down and folds away inside the body when up', () => {
  for (const k of ['jet', 'bizjet'] as const) {
    const st = BODY[k]!;
    const fr = FAIRINGS[k]!;
    const wing = PANELS[k]!.wing;
    const inWing = (q: THREE.Vector3) => {
      const v = Math.abs(q.z);
      const [, y] = place(wing, 1, q.x, v, 0);
      return Math.abs(q.y - y) <= wing.thick / 2 + 0.02 && pointIn(wing.outline, [q.x, v]);
    };
    const inside = (q: THREE.Vector3) => inBody(st, q.x, q.y, q.z) || inFairing(fr, q.x, q.y, q.z);
    for (const l of LEGS[k]!) {
      const { wheels, strut } = legPoints(l);
      // Down: the wheels' lowest point on the ground
      const down = legMatrix(l, 1);
      const low = Math.min(...wheels.map((q) => q.clone().applyMatrix4(down).y));
      assert.ok(Math.abs(low) < 0.01, `${k} leg at ${l.pivot} on the ground (${low})`);
      // The pivot is inside the body, the fairing or the wing
      const pv = new THREE.Vector3(...l.pivot);
      assert.ok(inside(pv) || inWing(pv), `${k} pivot ${l.pivot} hidden`);
      // Up: every wheel point inside the body or the fairing, the strut inside them or the wing
      const up = legMatrix(l, 0);
      for (const q of wheels) {
        const w = q.clone().applyMatrix4(up);
        assert.ok(inside(w), `${k} leg at ${l.pivot}: folded wheel at ${w.toArray().map((n) => n.toFixed(2))} hidden`);
      }
      for (const q of strut) {
        const w = q.clone().applyMatrix4(up);
        assert.ok(inside(w) || inWing(w), `${k} folded strut at ${w.toArray().map((n) => n.toFixed(2))} hidden`);
      }
    }
    // The mains fold in without meeting
    const [, r, lft] = LEGS[k]!;
    const zr = Math.min(...legPoints(r).wheels.map((q) => q.clone().applyMatrix4(legMatrix(r, 0)).z));
    const zl = Math.max(...legPoints(lft).wheels.map((q) => q.clone().applyMatrix4(legMatrix(lft, 0)).z));
    assert.ok(zr > zl + 0.05, `${k} mains clear of each other folded (${zl}, ${zr})`);
  }
});
