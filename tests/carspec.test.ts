// The cars' measurements and what's inside them (carspec.ts, vehicle plan
// Phase 0): every model has a driver's seat, a steering wheel and a dash that
// fit the body drawn round them, with Degen seated at walk mode's size: his
// head under the roof, his eyes over the window line and the dash, his hands
// on the wheel within reach, his knees under it and his feet on the floor;
// the driver's door between two of the body's seams, wide enough to get in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INTERIORS, SITTER, beltAt, hollowFrom, hollowTo, roofAt, type V3 } from '../src/scripts/city3d/carinside';
import { CARS } from '../src/scripts/city3d/carspec';

const MODELS = Object.values(CARS);
const along = (hip: V3, recline: number, up: number): V3 => [hip[0] - Math.sin(recline) * up, hip[1] + Math.cos(recline) * up, hip[2]];
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('every model has an interior, the driver on the left inside the cabin', () => {
  for (const s of MODELS) {
    const n = INTERIORS[s.id];
    assert.ok(n, s.id);
    const [b0, , , b1] = s.cabin;
    assert.ok(n.hip[0] > b0[0] + 0.1 && n.hip[0] < b1[0] - 0.1, `${s.id}: the seat is under the cabin`);
    assert.ok(n.hip[2] < 0, `${s.id}: the driver sits on the left`);
    const half = (s.W * s.cabinW) / 2;
    for (const sh of n.shoulders) assert.ok(Math.abs(sh[2]) + 0.06 < half, `${s.id}: his shoulders inside the cabin`);
    assert.ok(n.hip[1] > s.clr + 0.08, `${s.id}: the cushion is over the floor pan`);
  }
});

test('his head clears the roof and he sees out over the window line and the dash', () => {
  for (const s of MODELS) {
    const n = INTERIORS[s.id];
    const crown = along(n.hip, n.recline, SITTER.crown);
    assert.ok(crown[1] < roofAt(s, crown[0]) - 0.02, `${s.id}: crown ${crown[1].toFixed(3)} under the roof ${roofAt(s, crown[0]).toFixed(3)}`);
    assert.ok(n.eye[1] > beltAt(s, n.eye[0]) + 0.04, `${s.id}: eyes over the window line`);
    assert.ok(n.eye[1] < roofAt(s, n.eye[0]) - 0.06, `${s.id}: eyes under the roof`);
    assert.ok(n.eye[1] > n.dash[1] + 0.03, `${s.id}: eyes over the dash`);
  }
});

test('the wheel is in reach of both hands, over his knees and under the windscreen', () => {
  for (const s of MODELS) {
    const n = INTERIORS[s.id];
    const up = n.wheelR * Math.cos(n.wheelTilt);
    for (const [i, sh] of n.shoulders.entries()) {
      // Each hand at its side of the rim (a quarter to three)
      const grip: V3 = [n.wheel[0], n.wheel[1], n.wheel[2] + (i ? 1 : -1) * n.wheelR];
      const d = dist(sh, grip);
      assert.ok(d < SITTER.reach * 0.98, `${s.id}: hand ${i} reaches the wheel (${d.toFixed(3)} of ${SITTER.reach.toFixed(3)})`);
      assert.ok(d > SITTER.reach * 0.45, `${s.id}: hand ${i} isn't cramped`);
    }
    assert.ok(n.wheel[0] > n.hip[0] + 0.12, `${s.id}: the wheel is ahead of him`);
    assert.ok(n.wheel[1] - up > n.hip[1] + 0.06, `${s.id}: his knees fit under the wheel`);
    assert.ok(n.wheel[1] + up < roofAt(s, n.wheel[0]) - 0.02, `${s.id}: the wheel's top is under the windscreen`);
    assert.ok(n.dash[1] < roofAt(s, n.dash[0]) - 0.01, `${s.id}: the dash is under the windscreen`);
    assert.ok(n.dash[0] > n.wheel[0], `${s.id}: the dash is beyond the wheel`);
  }
});

test('his feet are on the floor and the pedals inside the body', () => {
  for (const s of MODELS) {
    const n = INTERIORS[s.id];
    assert.ok(n.floor >= s.clr, `${s.id}: the floor is in the body`);
    const drop = n.hip[1] - n.floor;
    assert.ok(drop > 0.08 && drop < SITTER.shin + 0.05, `${s.id}: his legs fit between the seat and the floor (${drop.toFixed(3)})`);
    assert.ok(n.pedals < s.L / 2 - 0.12, `${s.id}: the pedals are behind the bumper`);
  }
});

test('the driver\'s door is between two seams, wide and tall enough to get in by; the bus has none', () => {
  assert.equal(INTERIORS.bus.door, undefined);
  for (const s of MODELS) {
    const d = INTERIORS[s.id].door;
    if (s.id === 'bus') continue;
    assert.ok(d, s.id);
    assert.ok(s.seams!.includes(d.hinge) && s.seams!.includes(d.back), `${s.id}: on the body's seams`);
    assert.ok(d.hinge - d.back > 0.45, `${s.id}: wide enough`);
    const hip = INTERIORS[s.id].hip[0];
    assert.ok(hip > d.back && hip < d.hinge, `${s.id}: the seat is in the doorway`);
    assert.ok(d.y1 - d.y0 > 0.4 && d.y1 <= roofAt(s, d.back), `${s.id}: tall enough, under the roof`);
    assert.ok(d.open > 0.5 && d.open < Math.PI / 2, `${s.id}: swings open, not round onto the wing`);
  }
});

test('the rear seats have knee room behind the driver and head room under the roof', () => {
  for (const s of MODELS) {
    const n = INTERIORS[s.id];
    if (!n.rear) continue;
    assert.ok(n.hip[0] - n.rear.x > 0.45, `${s.id}: knee room`);
    const crown = along([n.rear.x, n.hip[1], n.hip[2]], n.rear.recline, SITTER.crown);
    assert.ok(crown[1] < roofAt(s, crown[0]) - 0.02, `${s.id}: rear head room`);
    assert.ok(n.rear.x > s.cabin[0][0] + 0.1, `${s.id}: inside the cabin`);
  }
});

test('your car is hollow where it has an inside: the seats, the dash and the pedals all inside the opening', () => {
  for (const s of MODELS) {
    if (s.id === 'bus' || s.id === 'exec') continue;
    const n = INTERIORS[s.id];
    const h0 = hollowFrom(s, n);
    const h1 = hollowTo(s);
    // The driver's seat back (leant back by the recline) and the rear bench's
    const back = (x: number, r: number) => x - 0.1 - Math.sin(r) * 0.44 - 0.04;
    assert.ok(back(n.hip[0], n.recline) > h0, `${s.id}: the driver's seat back is in the hollow`);
    if (n.rear) assert.ok(back(n.rear.x, n.rear.recline) > h0 - 0.02, `${s.id}: the rear bench is in the hollow`);
    assert.ok(n.pedals < h1 && n.wheel[0] < h1, `${s.id}: the pedals and the wheel are in front of the windscreen's foot`);
    assert.ok(h1 - h0 > 0.6, `${s.id}: room for a seat and a dash`);
  }
});
