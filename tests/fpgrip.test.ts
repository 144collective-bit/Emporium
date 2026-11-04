// The first-person hands' grip on each gun (fpgrip.ts): every gun has one, its numbers in reason; each hand's palm
// clear of the gun and lying close to it; the fingers closed on the gun, hardly any of them through it, the right
// hand's touching it; the trigger finger along the frame, on the trigger when he fires.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GRIP, GUN_IDS, allGrips, triggerOf, indexPad, insideOf, placeFor, placeOf } from '../src/scripts/city3d/fpgrip';
import { digitMoves, posePart, smoothHand, type Curl } from '../src/scripts/city3d/handmesh';
import type { WeaponId } from '../src/scripts/city3d/combat-sim';

const grips = allGrips();

/** A hand's parts posed on a gun, in the gun's frame: how many of each part's points are inside it and touching it */
function onGun(id: WeaponId, hand: 'right' | 'left', curl: Curl) {
  const side = placeFor(id, hand).side;
  const g = grips[id];
  const place = placeOf(id, hand).premultiply(new THREE.Matrix4().makeTranslation(...(hand === 'right' ? g.rightOff : g.leftOff)));
  const inside = insideOf(id, new THREE.Vector3().setFromMatrixPosition(place));
  const moves = digitMoves(side, curl);
  return smoothHand(side, 3).map((p, j) => {
    const geo = posePart(p, j ? moves[j - 1] : null);
    const P = geo.attributes.position;
    const v = new THREE.Vector3();
    let into = 0;
    let touch = 0;
    let n = 0;
    for (let i = 0; i < P.count; i += 3) {
      // (the wrist up in the sleeve isn't the palm)
      if (j === 0 && P.getY(i) > 0.03) continue;
      n++;
      const k = inside(v.fromBufferAttribute(P, i).applyMatrix4(place));
      if (k === 2) into++;
      else if (k === 1) touch++;
    }
    return { into, touch, n };
  });
}

test('fpgrip: every gun has a grip, its curls in reason, each hand stood off no further than the push', () => {
  assert.deepEqual(Object.keys(grips).sort(), [...GUN_IDS].sort());
  for (const id of GUN_IDS) {
    const g = grips[id];
    for (const c of [g.right, g.left]) {
      assert.equal(c.fingers.length, 4);
      for (const [a, b] of [...c.fingers, c.thumb]) {
        assert.ok(a >= GRIP.thumbOpen - 1e-9 && a <= 2.1, `${id}: a knuckle at ${a}`);
        assert.ok(b >= -0.5 && b <= GRIP.bend + 1e-9, `${id}: a middle joint at ${b}`);
      }
    }
    for (const off of [g.rightOff, g.leftOff]) assert.ok(Math.hypot(...off) <= GRIP.push + GRIP.gap + GRIP.slide + 1e-6, `${id}: stood off ${Math.hypot(...off)}`);
  }
});

test('fpgrip: the palms clear of the gun, the fingers hardly through it, the right hand on it', () => {
  for (const id of GUN_IDS) {
    const g = grips[id];
    for (const hand of ['right', 'left'] as const) {
      const parts = onGun(id, hand, g[hand]);
      assert.equal(parts[0].into, 0, `${id} ${hand}: the palm through the gun`);
      parts.slice(1).forEach((p, d) => assert.ok(p.into / p.n < 0.08, `${id} ${hand} digit ${d}: ${p.into} of ${p.n} points inside`));
      const touching = parts.slice(1).filter((p) => p.touch > 0).length;
      if (hand === 'right') assert.ok(touching >= 3, `${id}: ${touching} of the right hand's digits on the grip`);
    }
  }
});

test('fpgrip: his index rests just off the trigger, and is on it when he fires', () => {
  for (const id of GUN_IDS) {
    const g = grips[id];
    const place = placeOf(id, 'right').premultiply(new THREE.Matrix4().makeTranslation(...g.rightOff));
    const padAt = (index: [number, number]) => {
      const curl = { ...g.right, fingers: [index, ...g.right.fingers.slice(1)] };
      return indexPad(-1).applyMatrix4(digitMoves(-1, curl)[0][1]).applyMatrix4(place);
    };
    const on = padAt(g.trigger).distanceTo(triggerOf(id).at);
    const off = padAt(g.right.fingers[0]).distanceTo(triggerOf(id).rest);
    assert.ok(on < 0.006, `${id}: the index ${(on * 1000).toFixed(1)} mm off the trigger`);
    assert.ok(off < 0.008, `${id}: the index at rest ${(off * 1000).toFixed(1)} mm off its spot`);
    const fire = onGun(id, 'right', { ...g.right, fingers: [g.trigger, ...g.right.fingers.slice(1)] });
    assert.ok(fire[1].into / fire[1].n < 0.08, `${id}: the index through the gun on the trigger`);
  }
});
