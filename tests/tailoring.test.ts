// The suit's tailoring (docs/tailoring-plan.md Phase 3): on single figures on the desktop only (detail 3), the
// phones' and the crowds' suit as it was; the buttons where a tailor sews them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HORN, items, PLAYER, type Detail } from '../src/scripts/city3d/wardrobe';

const suit = (q: Detail) => items(q, true).find((i) => i.id === 'suit' && i.when(PLAYER))!;
const box = (g: THREE.BufferGeometry) => (g.computeBoundingBox(), g.boundingBox!);

test('tailoring: the desktop suit has it, the phones and the crowds keep theirs', () => {
  assert.ok(suit(3).pieces.some((p) => p.color === HORN), 'the desktop suit has its horn buttons');
  for (const q of [2, 1, 0] as Detail[]) {
    assert.ok(!suit(q).pieces.some((p) => p.color === HORN), `no tailoring at detail ${q}`);
    assert.equal(suit(q).pieces.length, suit(2).pieces.length);
  }
});

test('tailoring: two buttons down the front, four on the back of each cuff', () => {
  const horn = suit(3).pieces.filter((p) => p.color === HORN);
  const front = horn.find((p) => p.joint === 'torso')!;
  const b = box(front.geo);
  // (down the middle, in front of the jacket, from the waist down)
  assert.ok(Math.abs(b.min.x + b.max.x) < 0.002 && b.min.z > 0.05 && b.min.y > 0.06 && b.max.y < 0.17, 'the front buttons');
  for (const [joint, s] of [['foreL', -1], ['foreR', 1]] as const) {
    const g = box(horn.find((p) => p.joint === joint)!.geo);
    // (on the outside of that arm, turned to the back, just up from the cuff)
    assert.ok(s * g.min.x > 0.015 && g.max.z < 0.005 && g.min.y > -0.19 && g.max.y < -0.14, `${joint}'s buttons`);
  }
});

test('tailoring: the collar rolls round the back of the neck', () => {
  const lapels = (q: Detail) => box(suit(q).pieces.find((p) => p.color === 'top' && p.shade === 1.45)!.geo);
  // (the lapels on the chest alone at detail 2; at 3 the collar carries them round behind the neck)
  assert.ok(lapels(2).min.z > 0);
  assert.ok(lapels(3).min.z < -0.06 && lapels(3).max.y < 0.44);
});
