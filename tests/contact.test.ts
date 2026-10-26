// Contact (the revamp's Phase 3, contact.ts): a hand goes onto a wall he's stopped at, or trails along
// one at his side, within the rubric's 1.5 cm of its surface; the shoulder gives and the step hitches
// brushing a wall or a person; running into a wall at a sprint staggers him (and never under it); a
// narrow gap turns the shoulders; standing a while at a rail he leans on it with both hands; on open
// ground, or moving fast past a wall, nothing happens and the pose is left exactly as it was.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CONTACT, type ContactInput, applyContact, createContact, handOff, nearestOn, reachArmBones } from '../src/scripts/city3d/contact';
import { createAnimator } from '../src/scripts/city3d/animator';
import { MB, NB, decodeMocap, newPosed, posed } from '../src/scripts/city3d/mocap';
import { newMove, stepMove } from '../src/scripts/city3d/movesim';
import type { Box } from '../src/scripts/city3d/solids';

const data = decodeMocap(readFileSync('src/data/mocap/clips.bin'));
const SCALE = 0.85;
const DT = 1 / 60;
const CM = 180;
const flat = () => 0;

/** The animator standing still at the origin facing +z, settled */
function standing() {
  const an = createAnimator(data);
  const move = newMove();
  for (let i = 0; i < 90; i++) {
    stepMove(move, 0, 0, true, DT);
    an.update({ dt: DT, x: 0, y: 0, z: 0, move, gx: 0, gz: 0, scale: SCALE, ground: flat, feet: flat, sprint: 0, grounded: true, vy: 0, jump: 4, gravity: 12, crouch: 0 });
  }
  return an;
}
const inp = (o: Partial<ContactInput>): ContactInput => ({ dt: DT, x: 0, y: 0, z: 0, face: 0, scale: SCALE, speed: 0, moving: false, walls: [], people: [], ...o });
/** A wall across his way at z0 (facing -z), 2 tall */
const across = (z0: number): Box => [-3, z0, 3, z0 + 1, 2];
/** A wall along his right side at x0 */
const alongRight = (x0: number): Box => [x0, -3, x0 + 1, 3, 2];

test('the nearest point on a box is on its outline, with the outward normal, inside or out', () => {
  const b: Box = [0, 0, 2, 1, 1];
  let n = nearestOn(b, -1, 0.5);
  assert.deepEqual([n.px, n.pz, n.d, n.nx, n.nz], [0, 0.5, 1, -1, 0]);
  n = nearestOn(b, 3, 2);
  assert.ok(Math.abs(n.d - Math.hypot(1, 1)) < 1e-9 && n.px === 2 && n.pz === 1);
  n = nearestOn(b, 1, 0.2);
  assert.ok(n.d < 0 && n.nz === -1 && n.pz === 0, 'inside: out through the nearest side');
});

test('the arm IK lands the hand on a target in reach, the elbow bending the way an elbow does', () => {
  const rot = new Float32Array(NB * 4);
  const P = newPosed();
  for (let b = 0; b < NB; b++) new THREE.Quaternion().toArray(rot, b * 4);
  posed(rot, 0, 0, 0.62, 0, P);
  // (a point ahead of the right shoulder, a little below it)
  const t = P.pos[MB.armR].clone().add(new THREE.Vector3(0.02, -0.08, 0.3));
  const hand0 = P.rot[MB.handR].clone();
  reachArmBones(rot, P, MB.armR, MB.foreR, MB.handR, t);
  posed(rot, 0, 0, 0.62, 0, P);
  assert.ok(P.pos[MB.handR].distanceTo(t) < 1e-4, `the hand reaches (${P.pos[MB.handR].distanceTo(t)})`);
  assert.ok(P.rot[MB.handR].angleTo(hand0) < 2e-3, 'the hand keeps its turn');
  // (the elbow is behind and below the line from shoulder to hand: bent back, never through the body forward)
  const mid = P.pos[MB.armR].clone().lerp(P.pos[MB.handR], 0.5);
  assert.ok(P.pos[MB.foreR].z < mid.z + 0.02, 'the elbow stays back');
});

test('nothing happens on open ground, and the pose is left exactly as it was', () => {
  const an = standing();
  const c = createContact();
  const before = Float32Array.from(an.rot);
  for (let i = 0; i < 60; i++) c.update(inp({ walls: [across(3)], people: [{ x: 2, z: 2 }] }));
  const st = c.state;
  assert.equal(st.hand, null);
  assert.equal(st.lean, null);
  assert.equal(st.stagger, null);
  assert.ok(st.give.w < 1e-6 && st.squeeze.w < 1e-6 && st.hitch === 0);
  applyContact(an.rot, an.hips, st, 0, 0, 0, 0, SCALE);
  assert.deepEqual(Array.from(an.rot), Array.from(before));
});

test('stopped close to a wall he faces, a hand goes onto it within 1.5 cm, and comes off again when he turns away', () => {
  const an = standing();
  for (const d of [0.24, 0.3, 0.35]) {
    const c = createContact();
    const walls = [across(d)];
    for (let i = 0; i < 120; i++) c.update(inp({ walls, speed: 0.05 }));
    const st = c.state;
    assert.ok(st.hand && st.hand.w > 0.99, `a hand on the wall at ${d}`);
    const rot = Float32Array.from(an.rot);
    applyContact(rot, an.hips, st, 0, 0, 0, 0, SCALE);
    const off = handOff(rot, an.hips, st.hand!, 0, 0, 0, 0, SCALE) * CM;
    assert.ok(off < 1.5, `the hand within 1.5 cm of the wall at ${d} (${off.toFixed(2)} cm)`);
    // (the palm on the surface: the wall's face is at z = d, the palm a hair off it)
    assert.ok(Math.abs(st.hand!.z - (d - CONTACT.palm * SCALE)) < 1e-9);
    // Turned away: the hand comes off over the ease-out
    for (let i = 0; i < 120; i++) c.update(inp({ walls, speed: 0.05, face: Math.PI }));
    assert.equal(c.state.hand, null, 'the hand off the wall once he faces away');
  }
});

test('walking slowly along a wall at his side, that hand trails along it at hip height', () => {
  const an = standing();
  const c = createContact();
  const walls = [alongRight(0.3)];
  let st = c.state;
  for (let i = 0; i < 120; i++) st = c.update(inp({ walls, speed: 0.7, moving: true }));
  assert.ok(st.hand && st.hand.side === 1 && st.hand.w > 0.99, 'the right hand on the wall to his right');
  assert.ok(Math.abs(st.hand!.y - CONTACT.handLow * SCALE) < 1e-9, 'at hip height');
  const rot = Float32Array.from(an.rot);
  applyContact(rot, an.hips, st, 0, 0, 0, 0, SCALE);
  const off = handOff(rot, an.hips, st.hand!, 0, 0, 0, 0, SCALE) * CM;
  assert.ok(off < 1.5, `within 1.5 cm (${off.toFixed(2)} cm)`);
  // Faster than a stroll: the hand comes off
  for (let i = 0; i < 120; i++) st = c.update(inp({ walls, speed: 2.5, moving: true }));
  assert.equal(st.hand, null);
});

test('brushing a wall or a person at his side while moving, the shoulder gives that side and the step hitches once', () => {
  const c = createContact();
  let st = c.state;
  // A wall close on his left
  for (let i = 0; i < 60; i++) st = c.update(inp({ walls: [[-1.3, -3, -0.26, 3, 2]], speed: 2.5, moving: true }));
  assert.equal(st.give.side, -1);
  assert.ok(st.give.w > 0.5, `the shoulder gives (${st.give.w.toFixed(2)})`);
  // The hitch: full as the brush starts, gone within hitchT
  const c2 = createContact();
  c2.update(inp({ walls: [[-1.3, -3, -0.26, 3, 2]], speed: 2.5, moving: true }));
  assert.ok(c2.state.hitch > 0.9, 'the hitch as the brush starts');
  for (let i = 0; i < Math.ceil(CONTACT.hitchT / DT) + 2; i++) c2.update(inp({ walls: [[-1.3, -3, -0.26, 3, 2]], speed: 2.5, moving: true }));
  assert.equal(c2.state.hitch, 0, 'the hitch is over');
  // A person on his right, level with him
  const c3 = createContact();
  for (let i = 0; i < 60; i++) st = c3.update(inp({ people: [{ x: 0.3, z: 0.05 }], speed: 2.5, moving: true }));
  assert.equal(st.give.side, 1);
  assert.ok(st.give.w > 0.5, 'the shoulder gives for a person');
  // A person well ahead: no brush yet
  const c4 = createContact();
  for (let i = 0; i < 60; i++) st = c4.update(inp({ people: [{ x: 0.3, z: 1.5 }], speed: 2.5, moving: true }));
  assert.ok(st.give.w < 1e-6);
  // Standing still beside a wall: nothing
  const c5 = createContact();
  for (let i = 0; i < 60; i++) st = c5.update(inp({ walls: [[-1.3, -3, -0.26, 3, 2]], speed: 0, moving: false }));
  assert.ok(st.give.w < 1e-6);
});

test('the give turns the chest and pulls that collarbone back; nothing else moves', () => {
  const an = standing();
  const c = createContact();
  let st = c.state;
  for (let i = 0; i < 90; i++) st = c.update(inp({ walls: [alongRight(0.26)], speed: 2.5, moving: true }));
  const rot = Float32Array.from(an.rot);
  applyContact(rot, an.hips, st, 0, 0, 0, 0, SCALE);
  const P0 = posed(an.rot, 0, an.hips.x, an.hips.y, an.hips.z, newPosed());
  const P1 = posed(rot, 0, an.hips.x, an.hips.y, an.hips.z, newPosed());
  // (the right shoulder back: further -z than it was)
  assert.ok(P1.pos[MB.armR].z < P0.pos[MB.armR].z - 0.01, 'the right shoulder back');
  assert.ok(P1.pos[MB.legL].distanceTo(P0.pos[MB.legL]) < 1e-9 && P1.pos[MB.footR].distanceTo(P0.pos[MB.footR]) < 1e-9, 'the legs as they were');
});

test('running into a wall at a sprint staggers him for its time; a walk into it does not', () => {
  const c = createContact();
  const walls = [across(0.25)];
  let st = c.update(inp({ walls, speed: 4, moving: true, hit: true, hitSpeed: 4.1 }));
  assert.ok(st.stagger && st.stagger.t < 0.1, 'a stagger starts');
  assert.equal(st.stagger!.hand.side, 1);
  const an = standing();
  let peak = 0;
  let n = 0;
  while (c.state.stagger) {
    st = c.update(inp({ walls, speed: 0.5, moving: false }));
    if (st.stagger) {
      const rot = Float32Array.from(an.rot);
      applyContact(rot, an.hips, st, 0, 0, 0, 0, SCALE);
      const P1 = posed(rot, 0, an.hips.x, an.hips.y, an.hips.z, newPosed());
      const P0 = posed(an.rot, 0, an.hips.x, an.hips.y, an.hips.z, newPosed());
      peak = Math.max(peak, P0.pos[MB.head].z - P1.pos[MB.head].z);
    }
    n++;
  }
  assert.ok(Math.abs(n * DT - CONTACT.stagger.t) < 0.05, `over its time (${(n * DT).toFixed(2)} s)`);
  assert.ok(peak > 0.03, `the head thrown back (${(peak * CM).toFixed(1)} cm)`);
  const c2 = createContact();
  st = c2.update(inp({ walls, speed: 1.4, moving: true, hit: true, hitSpeed: 1.4 }));
  assert.equal(st.stagger, null, 'a walk into a wall is no stagger');
});

test('through a gap narrower than his shoulders need the shoulders turn, and not through a wide one', () => {
  const c = createContact();
  let st = c.state;
  const gap = 0.6 * SCALE;
  for (let i = 0; i < 60; i++) st = c.update(inp({ walls: [[-2, -3, -gap / 2, 3, 1.2], [gap / 2, -3, 2, 3, 1.2]], speed: 1.4, moving: true }));
  assert.ok(st.squeeze.w > 0.9 && Math.abs(st.squeeze.turn) > 0.3, `squeezing (${st.squeeze.w.toFixed(2)}, ${st.squeeze.turn.toFixed(2)})`);
  const an = standing();
  const rot = Float32Array.from(an.rot);
  applyContact(rot, an.hips, st, 0, 0, 0, 0, SCALE);
  const P1 = posed(rot, 0, an.hips.x, an.hips.y, an.hips.z, newPosed());
  const P0 = posed(an.rot, 0, an.hips.x, an.hips.y, an.hips.z, newPosed());
  const w0 = Math.abs(P0.pos[MB.armR].x - P0.pos[MB.armL].x);
  const w1 = Math.abs(P1.pos[MB.armR].x - P1.pos[MB.armL].x);
  assert.ok(w1 < w0 * 0.9, `the shoulders narrower across his way (${(w1 * CM).toFixed(1)} of ${(w0 * CM).toFixed(1)} cm)`);
  const c2 = createContact();
  for (let i = 0; i < 60; i++) st = c2.update(inp({ walls: [[-2, -3, -0.8, 3, 1.2], [0.8, -3, 2, 3, 1.2]], speed: 1.4, moving: true }));
  assert.ok(st.squeeze.w < 1e-6, 'a wide gap');
});

test('standing a while facing a rail he leans on it, both hands on it; never at a wall, and off again when he moves', () => {
  const an = standing();
  const c = createContact();
  // (an edge at z = 0.3 nothing solid explains: the quay)
  const blocked = (_x: number, z: number) => z > 0.3;
  let st = c.state;
  for (let i = 0; i < 60; i++) st = c.update(inp({ blocked }));
  assert.equal(st.lean, null, 'not before the dwell');
  for (let i = 0; i < Math.ceil((CONTACT.railDwell + 1.5) / DT); i++) st = c.update(inp({ blocked }));
  assert.ok(st.lean && st.lean.w > 0.95, 'leaning');
  const rot = Float32Array.from(an.rot);
  applyContact(rot, an.hips, st, 0, 0, 0, 0, SCALE);
  for (const h of st.lean!.hands) {
    const off = handOff(rot, an.hips, h, 0, 0, 0, 0, SCALE) * CM;
    assert.ok(off < 1.5, `a hand on the rail within 1.5 cm (${off.toFixed(2)} cm)`);
    assert.ok(Math.abs(h.y - CONTACT.railH * SCALE) < 1e-9);
  }
  const P1 = posed(rot, 0, an.hips.x, an.hips.y, an.hips.z, newPosed());
  const P0 = posed(an.rot, 0, an.hips.x, an.hips.y, an.hips.z, newPosed());
  assert.ok(P1.pos[MB.chest].z > P0.pos[MB.chest].z + 0.02, 'the chest over the rail');
  // Moving: off it
  for (let i = 0; i < 90; i++) st = c.update(inp({ blocked, speed: 1.4, moving: true }));
  assert.equal(st.lean, null);
  // A wall there instead: a hand on it, no lean
  const c2 = createContact();
  for (let i = 0; i < Math.ceil((CONTACT.railDwell + 1.5) / DT); i++) st = c2.update(inp({ blocked, walls: [across(0.3)] }));
  assert.equal(st.lean, null);
  assert.ok(st.hand, 'a hand on the wall');
});

test('everything eases: no hand, give or lean jumps more than a little in a frame', () => {
  const an = standing();
  const c = createContact();
  const walls = [across(0.3)];
  let last: THREE.Vector3 | null = null;
  let worst = 0;
  for (let i = 0; i < 240; i++) {
    // (turned away over a second, as he would)
    const st = c.update(inp({ walls, speed: 0.05, face: Math.PI * Math.min(1, Math.max(0, (i - 100) / 60)) }));
    const rot = Float32Array.from(an.rot);
    applyContact(rot, an.hips, st, 0, 0, 0, 0, SCALE);
    const P = posed(rot, 0, an.hips.x, an.hips.y, an.hips.z, newPosed());
    const h = P.pos[MB.handR].clone();
    if (last) worst = Math.max(worst, h.distanceTo(last));
    last = h;
  }
  assert.ok(worst * CM < 9, `the hand moves at most a little a frame (${(worst * CM).toFixed(1)} cm)`);
});
