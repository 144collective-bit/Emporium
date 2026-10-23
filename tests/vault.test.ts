// Over low things (animation Phase 5, vault.ts; the owner's calls: low things only, over and down,
// never standing on top): what counts as low (real heights, and every one of them a solid walking
// meets), when Jump at something goes over it (a vault, a climb, or nothing), and the way over: his
// feet clear of it, his hands on its top, from where he set off to the far side.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LOW_THINGS, OVER, isLow, overAhead, overAt, overPose } from '../src/scripts/city3d/vault';
import { SOLIDS, type Box } from '../src/scripts/city3d/solids';
import { makeSkeleton, newPose, poseSkeleton } from '../src/scripts/city3d/skeleton';

const SCALE = 0.85;
const R = 0.22;
const all = () => true;

test('the low things are low, and every one is a solid walking meets', () => {
  assert.ok(LOW_THINGS.length > 100, `${LOW_THINGS.length}`);
  for (const b of LOW_THINGS) assert.ok(b[4] <= OVER.climb + 0.2, `${b.join(',')}: ${b[4]} high`);
  const solid = SOLIDS.filter(isLow).length;
  assert.ok(solid >= LOW_THINGS.length * 0.95, `${solid} of ${LOW_THINGS.length} found among the solids`);
  // (and nothing tall is taken for one)
  assert.ok(SOLIDS.filter(isLow).every((b) => b[4] <= OVER.climb + 0.2));
});

test('Jump at something low straight ahead: a vault for waist-high, a climb up to head height, nothing for the rest', () => {
  const wall = (h: number, d = 0.3): Box => [-2, 2, 2, 2 + d, h];
  assert.equal(overAhead(0, 1.3, 0, 0, [wall(0.55)], R, all)?.kind, 'vault');
  assert.equal(overAhead(0, 1.3, 0, 0, [wall(1.0)], R, all)?.kind, 'climb');
  assert.equal(overAhead(0, 1.3, 0, 0, [wall(1.6)], R, all), null, 'too high');
  assert.equal(overAhead(0, 1.3, 0, 0, [wall(0.15)], R, all), null, 'a kerb: stepped over');
  assert.equal(overAhead(0, 1.3, 0, 0, [wall(0.55, 2)], R, all), null, 'too thick to go over');
  assert.equal(overAhead(0, 0, 0, 0, [wall(0.55)], R, all), null, 'out of reach');
  assert.equal(overAhead(0, 1.3, Math.PI, 0, [wall(0.55)], R, all), null, 'going the other way');
  assert.equal(overAhead(0, 1.3, 1.25, 0, [wall(0.55)], R, all), null, 'side on');
  assert.equal(overAhead(0, 1.3, 0, 0, [wall(0.55)], R), null, 'not one of the low things');
  assert.equal(overAhead(0, 1.3, 0, 0.35, [wall(0.55)], R, all), null, 'its top only a kerb over his ground');
  // (something else first, or something nearer: the nearest decides)
  assert.equal(overAhead(0, 1.3, 0, 0, [wall(0.55), [-1, 1.7, 1, 1.9, 2.5] as Box], R, (b) => b[4] < 2), null, 'a wall in front of it');
  const o = overAhead(0, 1.3, 0, 0, [wall(0.55)], R, all)!;
  assert.ok(o.z1 > 2.3 + R && Math.abs(o.x1) < 1e-9, 'landing past it, straight on');
});

test('the way over: from where he set off to the far side, his feet clear of it and his hands planted on its top', () => {
  const sk = makeSkeleton();
  for (const h of [0.55, 1.0]) {
    const box: Box = [-2, 2, 2, 2 + (h > 0.7 ? 0.6 : 0.3), h];
    const o = overAhead(0, 1.3, 0, 0, [box], R, all)!;
    const a = overAt(o, 0, 0, 0);
    const b = overAt(o, 1, 0, 0);
    assert.ok(Math.hypot(a.x - o.x0, a.z - o.z0) < 1e-9 && a.y === 0, 'from where he set off');
    assert.ok(Math.hypot(b.x - o.x1, b.z - o.z1) < 1e-9 && b.y === 0, 'down on the far side');
    let planted = 0;
    for (let u = 0; u <= 1.0001; u += 0.02) {
      const at = overAt(o, u, 0, 0);
      const p = newPose();
      overPose(p, o, u, 1, at.x, at.y, at.z, 0, SCALE);
      poseSkeleton(sk, p);
      sk.root.position.set(at.x, at.y, at.z);
      sk.root.scale.setScalar(SCALE);
      sk.root.updateMatrixWorld(true);
      for (const n of ['footL', 'footR', 'toeL', 'toeR', 'shinL', 'shinR', 'hips'] as const) {
        const v = sk.bones[n].getWorldPosition(new THREE.Vector3());
        if (v.z > box[1] + 0.02 && v.z < box[3] - 0.02) assert.ok(v.y > box[4] - 0.03, `${o.kind} at ${u.toFixed(2)}: the ${n} ${(box[4] - v.y).toFixed(3)} into it`);
      }
      // (a hand on its top: the palm on it, the wrist just over it)
      const hand = sk.bones.handR.getWorldPosition(new THREE.Vector3());
      if (Math.abs(hand.y - box[4]) < 0.15 && hand.z > box[1] - 0.05 && hand.z < box[3] + 0.05) planted++;
    }
    assert.ok(planted >= 5, `${o.kind}: a hand on its top ${planted} samples`);
  }
});
