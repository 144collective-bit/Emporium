// Degen's arms in first person with empty hands (fparm.ts, the owner's call 2026-11: premium, jointed, not
// deformed): the elbow's reach, the fist's shape and the sleeves' pieces.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ARM, FIST, aimPiece, cuffGeometry, fistGeometry, merge, paint, sleeveGeometry, solveArm, stripeGeometry } from '../src/scripts/city3d/fparm';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const near = (a: number, b: number, e = 1e-6) => Math.abs(a - b) < e;

test('in reach, the hand lands on the target and both bones keep their lengths', () => {
  const s = V(0.2, -0.27, 0.06);
  const t = V(0.12, -0.12, -0.33);
  const e = new THREE.Vector3();
  const h = new THREE.Vector3();
  solveArm(s, t, V(0.45, -1, 0.15), e, h);
  assert.ok(h.distanceTo(t) < 1e-6, 'on the target');
  assert.ok(near(s.distanceTo(e), ARM.upper), 'upper arm');
  assert.ok(near(e.distanceTo(h), ARM.fore), 'forearm');
});

test('the elbow swings towards the pole: down in the guard, up and out for a hook', () => {
  const s = V(0.2, -0.27, 0.06);
  const t = V(0.12, -0.12, -0.33);
  const e = new THREE.Vector3();
  const h = new THREE.Vector3();
  solveArm(s, t, V(0, -1, 0), e, h);
  const mid = s.clone().add(h).multiplyScalar(0.5);
  assert.ok(e.y < mid.y, 'down');
  solveArm(s, t, V(1, 0.5, 0), e, h);
  assert.ok(e.x > mid.x, 'out');
});

test('out of reach, the arm goes straight towards the target and no further; never folded through itself', () => {
  const s = V(0, 0, 0);
  const e = new THREE.Vector3();
  const h = new THREE.Vector3();
  solveArm(s, V(0, 0, -2), V(0, -1, 0), e, h);
  assert.ok(h.length() <= ARM.upper + ARM.fore + 1e-9 && h.length() > (ARM.upper + ARM.fore) * 0.99);
  assert.ok(h.x === 0 && h.y === 0 && h.z < 0, 'straight at it');
  solveArm(s, V(0, 0, -0.001), V(0, -1, 0), e, h);
  assert.ok(h.length() >= Math.abs(ARM.upper - ARM.fore), 'not through itself');
  assert.ok(Number.isFinite(e.x + e.y + e.z));
});

test('a piece is turned along its bone, its +z as near the face asked as it can be', () => {
  const q = new THREE.Quaternion();
  aimPiece(V(0, 0, 0), V(0, 1, -1), V(0, 0, 1), q);
  const y = V(0, 1, 0).applyQuaternion(q);
  const z = V(0, 0, 1).applyQuaternion(q);
  assert.ok(y.distanceTo(V(0, 1, -1).normalize()) < 1e-6);
  assert.ok(near(y.dot(z), 0) && z.z > 0 && z.y > 0, 'square to the bone, facing as near as it can');
  // (a face along the bone itself still gives a turn)
  aimPiece(V(0, 0, 0), V(0, 0, 1), V(0, 0, 1), q);
  assert.ok(Number.isFinite(q.x + q.y + q.z + q.w));
});

test('the fist: closed, its size, the knuckles out front, the thumb on its side, nothing left over', () => {
  for (const thumb of [-1, 1] as const) {
    const g = fistGeometry(thumb);
    g.computeBoundingBox();
    const b = g.boundingBox!;
    const size = b.getSize(new THREE.Vector3());
    assert.ok(size.x > FIST.width * 0.9 && size.x < FIST.width * 1.2, `wide ${size.x}`);
    assert.ok(b.max.y > FIST.length * 0.85 && b.max.y < FIST.length * 1.1, `long ${b.max.y}`);
    assert.ok(size.z > FIST.depth * 0.8 && size.z < FIST.depth * 1.2, `deep ${size.z}`);
    // (the thumb, the furthest under the palm, is on its own side)
    const pos = g.attributes.position as THREE.BufferAttribute;
    let lowX = 0;
    let lowZ = Infinity;
    for (let i = 0; i < pos.count; i++)
      if (pos.getZ(i) < lowZ && pos.getY(i) > 0.06) {
        lowZ = pos.getZ(i);
        lowX = pos.getX(i);
      }
    assert.ok(lowX * thumb > -0.01, `thumb on side ${thumb}`);
    assert.deepEqual(Object.keys(g.attributes).sort(), ['normal', 'position']);
  }
});

test('the sleeves and cuffs: their lengths, round both ends; painted pieces merge into one draw', () => {
  const s = sleeveGeometry(0.058, 0.052, ARM.upper);
  s.computeBoundingBox();
  assert.ok(near(s.boundingBox!.min.y, -0.058, 1e-4) && near(s.boundingBox!.max.y, ARM.upper + 0.052, 1e-4));
  const open = sleeveGeometry(0.05, 0.045, 0.2, false);
  open.computeBoundingBox();
  assert.ok(near(open.boundingBox!.max.y, 0.2, 1e-6), 'open-ended for a cuff');
  const c = cuffGeometry(0.04, 0.037, 0.2, 0.25, 3);
  c.computeBoundingBox();
  assert.ok(c.boundingBox!.min.y >= 0.2 - 0.003 && c.boundingBox!.max.y <= 0.25 + 0.003);
  const st = stripeGeometry(Math.PI / 2, 0.06, 0.05, 0.2);
  st.computeBoundingBox();
  assert.ok(st.boundingBox!.min.z > 0.05, 'a stripe at +z sits out on +z');
  const g = merge([paint(s, '#ff0000'), paint(fistGeometry(-1).translate(0, ARM.fore, 0), '#00ff00')]);
  const tint = g.attributes.tint as THREE.BufferAttribute;
  assert.equal(tint.count, g.attributes.position.count);
  assert.ok(tint.getX(0) > 0.9 && tint.getY(0) < 0.1);
  assert.ok(tint.getY(tint.count - 1) > 0.9);
});
