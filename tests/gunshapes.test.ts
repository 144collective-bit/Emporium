// The guns' shapes (gunshapes.ts, docs/weapons-plan.md Phase 2): every gun builds at every level with sound
// numbers, its muzzle and butt where gunfit.ts says, the sight's line clear through a holo or a scope, the
// front hand's reload spot on the magazine, and each level within its triangle budget.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WEAPONS, type WeaponId } from '../src/scripts/city3d/combat-sim';
import { FIT } from '../src/scripts/city3d/gunfit';
import { byKey, fillet, gunParts, inset, mergeAll, sound, rifleGeometry, type GunDetail } from '../src/scripts/city3d/gunshapes';

const IDS = Object.keys(WEAPONS) as WeaponId[];
const LEVELS: GunDetail[] = [0, 1, 2];
/** Triangles a gun may have at each level */
const BUDGET: Record<GunDetail, number> = { 0: 1200, 1: 5000, 2: 11000 };

const tris = (g: THREE.BufferGeometry) => g.attributes.position.count / 3;
function built(id: WeaponId, q: GunDetail) {
  const { body, mag } = gunParts(id, q);
  return { body: mergeAll(body.map(([g]) => g)), mag: mergeAll(mag.map(([g]) => g)) };
}

test('every gun builds at every level: numbers sound, within its budget', () => {
  const report: string[] = [];
  for (const id of IDS)
    for (const q of LEVELS) {
      const { body, mag } = built(id, q);
      for (const g of [body, mag]) {
        for (const k of ['position', 'normal', 'uv'] as const) {
          const a = g.attributes[k].array;
          for (let i = 0; i < a.length; i++) assert.ok(Number.isFinite(a[i]), `${id} at ${q}: ${k} not a number`);
        }
        assert.ok(tris(g) > 0);
      }
      const n = tris(body) + tris(mag);
      report.push(`${id}@${q}: ${n}`);
      assert.ok(n <= BUDGET[q], `${id} at level ${q}: ${n} triangles`);
    }
  if (process.env.GUN_REPORT) console.log(report.join('\n'));
  // Each level finer than the one under it
  for (const id of IDS) {
    const [a, b, c] = LEVELS.map((q) => { const g = built(id, q); return tris(g.body) + tris(g.mag); });
    assert.ok(a < b && b < c, `${id}: ${a} < ${b} < ${c}`);
  }
});

test('the muzzle is the front of the gun, the butt pad the back of a long gun', () => {
  for (const id of IDS)
    for (const q of LEVELS) {
      const b = built(id, q).body;
      b.computeBoundingBox();
      const bb = b.boundingBox!;
      const f = FIT[id];
      assert.ok(Math.abs(bb.max.z - f.muzzle.z) < 0.006, `${id} at ${q}: the front at ${bb.max.z.toFixed(3)}, the muzzle at ${f.muzzle.z}`);
      if (f.butt) {
        assert.ok(Math.abs(bb.min.z - f.butt.z) < 0.004, `${id} at ${q}: the back at ${bb.min.z.toFixed(3)}, the butt at ${f.butt.z}`);
        // The butt pad's middle is on the pad
        const ray = new THREE.Raycaster(new THREE.Vector3(f.butt.x, f.butt.y, f.butt.z - 0.05), new THREE.Vector3(0, 0, 1), 0, 0.06);
        const hit = ray.intersectObject(new THREE.Mesh(b, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })))[0];
        assert.ok(hit && Math.abs(hit.point.z - f.butt.z) < 0.004, `${id} at ${q}: nothing at the butt`);
      }
    }
});

test('the line through a holo sight or a scope is clear to the muzzle and beyond', () => {
  for (const id of IDS) {
    const f = FIT[id];
    if (f.sight.kind === 'irons') continue;
    for (const q of LEVELS) {
      const mesh = new THREE.Mesh(built(id, q).body, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      const ray = new THREE.Raycaster(new THREE.Vector3(0, f.sight.at.y, f.sight.at.z), new THREE.Vector3(0, 0, 1), 0, 2);
      const hits = ray.intersectObject(mesh);
      assert.equal(hits.length, 0, `${id} at ${q}: the sight's line hits the gun at z ${hits[0]?.point.z.toFixed(3)}`);
    }
  }
});

test('the front hand reaches for the magazine where the magazine is', () => {
  for (const id of IDS) {
    const f = FIT[id];
    if (f.reload === 'shells') continue;
    const at = f.fore.clone().add(f.magAt);
    for (const q of LEVELS) {
      const m = built(id, q).mag;
      m.computeBoundingBox();
      assert.ok(m.boundingBox!.expandByScalar(0.006).containsPoint(at), `${id} at ${q}: the hand's spot off the magazine`);
    }
  }
});

test('outlines: rounded corners keep the shape, the lowest level keeps the corners', () => {
  const sq: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  assert.deepEqual(fillet(sq, 0.2, 0), sq);
  const round = fillet(sq, 0.2, 2);
  assert.equal(round.length, 4 * 5);
  for (const [x, y] of round) assert.ok(x >= -1e-9 && x <= 1 + 1e-9 && y >= -1e-9 && y <= 1 + 1e-9);
  // No point twice in a row (a zero-length edge breaks the bevel)
  for (let i = 0; i < round.length; i++) {
    const [a, b] = [round[i], round[(i + 1) % round.length]];
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6);
  }
});

test('inset: in from every edge of an outline either way round, out for a negative amount', () => {
  const ccw: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  for (const pts of [ccw, [...ccw].reverse()]) {
    const i = inset(pts, 0.1);
    for (const [x, y] of i) assert.ok(Math.abs(Math.min(x, 1 - x) - 0.1) < 1e-9 && Math.abs(Math.min(y, 1 - y) - 0.1) < 1e-9);
    const o = inset(pts, -0.1);
    for (const [x, y] of o) assert.ok(Math.abs(Math.abs(x - 0.5) - 0.6) < 1e-9 && Math.abs(Math.abs(y - 0.5) - 0.6) < 1e-9);
  }
});

test('a bevel too big for a wall is caught: the frame round a hole, an outline turned inside out', () => {
  const frame: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const hole: [number, number][] = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]];
  assert.ok(sound(frame, inset(frame, 0.02), [inset(hole, -0.02)]));
  assert.ok(!sound(frame, inset(frame, 0.06), [inset(hole, -0.06)]));
  assert.ok(!sound(frame, inset(frame, 0.6), []));
});

test('the accent runs front to back for the neon finish; the soldiers\' rifle is the plainest', () => {
  const accent = byKey(gunParts('rifle', 2).body).get('accent')!;
  const uv = accent.attributes.uv.array;
  let lo = 1;
  let hi = 0;
  for (let i = 0; i < uv.length; i += 2) {
    lo = Math.min(lo, uv[i]);
    hi = Math.max(hi, uv[i]);
  }
  assert.ok(lo <= 0.001 && hi >= 0.999);
  assert.ok(tris(rifleGeometry()) <= BUDGET[0]);
});
