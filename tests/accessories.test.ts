// The accessories sit where they're worn (docs/clothing-plan.md Phase 5): every hat seated on the head (the head
// never through its crown, the band close round it), and the things in the hand held without a finger through
// them (a handle's bar in the fingers' hook). At every detail level, the crowd's too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { items, PLAYER, type Detail, type Outfit } from '../src/scripts/city3d/wardrobe';
import { bakedHand, headGeometry, headRow, HEAD_TOP } from '../src/scripts/city3d/body';

const LEVELS: Detail[] = [3, 2, 1, 0];
const HATS: [string, Partial<Outfit>][] = [
  ['cap', {}],
  ['capBack', { capBack: true }],
  ['beanie', { beanie: '#3355ff' }],
  ['bucket', { bucket: '#3355ff' }],
  ['crown', { crown: true }],
  ['cowboy', { cowboy: '#a06838' }],
  ['tophat', { tophat: '#222222' }],
];

/** The crown of a hat's first piece: of its parts (a brim, a button, the points) the one that reaches furthest up and down */
function crownOf(geo: THREE.BufferGeometry) {
  const g = geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
  const m = mergeVertices(g, 1e-6);
  const ix = m.index!.array;
  const P = m.attributes.position;
  const up = Array.from({ length: P.count }, (_, i) => i);
  const root = (i: number): number => (up[i] === i ? i : (up[i] = root(up[i])));
  for (let t = 0; t < ix.length; t += 3) {
    up[root(ix[t + 1])] = root(ix[t]);
    up[root(ix[t + 2])] = root(ix[t]);
  }
  const span = new Map<number, [number, number]>();
  for (let t = 0; t < ix.length; t++) {
    const r = root(ix[t]);
    const [lo, hi] = span.get(r) ?? [9, -9];
    span.set(r, [Math.min(lo, P.getY(ix[t])), Math.max(hi, P.getY(ix[t]))]);
  }
  const [best] = [...span.entries()].sort((a, b) => b[1][1] - b[1][0] - (a[1][1] - a[1][0]))[0];
  const keep: number[] = [];
  for (let t = 0; t < ix.length; t += 3) if (root(ix[t]) === best) keep.push(ix[t], ix[t + 1], ix[t + 2]);
  m.setIndex(keep);
  return { geo: m, bottom: span.get(best)![0] };
}

const ray = new THREE.Raycaster();
const side = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const hit = (m: THREE.Mesh, o: THREE.Vector3, d: THREE.Vector3, last: boolean) => {
  ray.set(o, d);
  const h = ray.intersectObject(m);
  return h.length ? h[last ? h.length - 1 : 0].distance : NaN;
};

for (const q of LEVELS) {
  test(`accessories: every hat sits on the head, the head never through it (detail ${q})`, () => {
    const head = new THREE.Mesh(headGeometry(64, q), side);
    for (const [id, extra] of HATS) {
      const o = { ...PLAYER, ...extra };
      const it = items(q, true).find((i) => i.id === id && i.when(o))!;
      assert.ok(it, id);
      const { geo, bottom } = crownOf(it.pieces[0].geo);
      const hat = new THREE.Mesh(geo, side);
      let min = 9;
      let band = 0;
      for (let y = bottom + 0.001; y < HEAD_TOP; y += 0.004) {
        const r = headRow(y);
        const o3 = new THREE.Vector3(0, y, r.zc + (r.front - r.back) / 2);
        for (let k = 0; k < 48; k++) {
          const a = (k / 48) * Math.PI * 2;
          const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
          const g = hit(hat, o3, d, false) - hit(head, o3, d, true);
          if (!Number.isFinite(g)) continue;
          min = Math.min(min, g);
          if (y < bottom + 0.004) band = Math.max(band, g);
        }
      }
      // (clear of the head everywhere, and at its band no more than a finger's width off it: seated, not perched)
      assert.ok(min > 0, `${id}: the head comes ${(-min * 1000).toFixed(1)} mm through it`);
      assert.ok(band < 0.018, `${id}: its band stands ${(band * 1000).toFixed(1)} mm off the head`);
    }
  });
}

/** How many of the hand's points (closed to hold) are inside a closed convex shape, and how deep */
function through(geo: THREE.BufferGeometry, hand: THREE.BufferGeometry) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const P = g.attributes.position;
  const H = hand.attributes.position;
  const tri = new THREE.Triangle();
  const n = new THREE.Vector3();
  const v = new THREE.Vector3();
  const planes: THREE.Plane[] = [];
  for (let t = 0; t < P.count; t += 3) {
    tri.set(new THREE.Vector3().fromBufferAttribute(P, t), new THREE.Vector3().fromBufferAttribute(P, t + 1), new THREE.Vector3().fromBufferAttribute(P, t + 2));
    if (tri.getArea() < 1e-10) continue;
    tri.getNormal(n);
    planes.push(new THREE.Plane().setFromNormalAndCoplanarPoint(n.clone(), tri.a));
  }
  let deep = 0;
  for (let i = 0; i < H.count; i++) {
    v.fromBufferAttribute(H, i);
    // (inside a convex shape: behind every face's plane; how deep: the least of them)
    let d = Infinity;
    for (const p of planes) d = Math.min(d, -p.distanceToPoint(v));
    if (d > 0) deep = Math.max(deep, d);
  }
  return deep;
}

for (const q of [3, 2] as Detail[]) {
  test(`accessories: the things in the hand are held, no finger through them (detail ${q})`, () => {
    const hand = bakedHand(1, 0.62, 9);
    const H = hand.attributes.position;
    const all = items(q, true);
    const cup = all.find((i) => i.id === 'coffee')!;
    // The cup and its sleeve: nothing more than a whisker inside them
    for (const k of [0, 1]) assert.ok(through(cup.pieces[k].geo, hand) < 0.0015, `the cup's piece ${k}`);
    // The briefcase hangs under the hand by its handle, the handle's bar in the fingers' hook
    const [body, handle] = all.find((i) => i.id === 'briefcase')!.pieces.map((p) => p.geo);
    body.computeBoundingBox();
    let lowest = 9;
    for (let i = 0; i < H.count; i++) lowest = Math.min(lowest, H.getY(i));
    assert.ok(body.boundingBox!.max.y < lowest, 'the briefcase under the hand');
    const A = handle.attributes.position;
    const v = new THREE.Vector3();
    const w = new THREE.Vector3();
    let near = 9;
    for (let i = 0; i < A.count; i++) {
      v.fromBufferAttribute(A, i);
      for (let k = 0; k < H.count; k += 3) near = Math.min(near, v.distanceTo(w.fromBufferAttribute(H, k)));
    }
    assert.ok(near < 0.003, `the handle ${(near * 1000).toFixed(1)} mm from the fingers`);
  });
}
