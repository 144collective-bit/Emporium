// The accessories sit where they're worn (docs/clothing-plan.md Phase 5): every hat seated on the head (the head
// never through its crown, the band close round it), and the crowd's shopping bag held by its cord in the fingers'
// hook. At every detail level, the crowd's too. The costume pieces and the player's things in the hand were retired
// (docs/wardrobe-plan.md Phase 1): no item draws them.
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

for (const q of [3, 2, 1, 0] as Detail[]) {
  test(`accessories: the retired pieces are gone from the wardrobe (detail ${q})`, () => {
    const ids = items(q, true).map((i) => i.id);
    for (const gone of ['crown', 'cowboy', 'tophat', 'halo', 'coffee', 'boombox', 'briefcase']) assert.ok(!ids.includes(gone), gone);
    assert.ok(!ids.some((id) => id.startsWith('wings-')), 'the wings');
    // (the crowd keeps its phones and shopping bags; the player's look can't hold either)
    assert.ok(ids.includes('phone') && ids.includes('shopping'));
  });
}

for (const q of [3, 2] as Detail[]) {
  test(`accessories: the crowd's shopping bag is held by its cord, no finger through it (detail ${q})`, () => {
    const hand = bakedHand(1, 0.62, 9);
    const H = hand.attributes.position;
    const all = items(q, true);
    let lowest = 9;
    for (let i = 0; i < H.count; i++) lowest = Math.min(lowest, H.getY(i));
    const v = new THREE.Vector3();
    const w = new THREE.Vector3();
    // (Crestmont's Drive: under the hand, its cord in the fingers' hook)
    const [bag, cord] = all.find((i) => i.id === 'shopping')!.pieces.map((p) => p.geo);
    bag.computeBoundingBox();
    assert.ok(bag.boundingBox!.max.y < lowest, 'the shopping bag under the hand');
    const C = cord.attributes.position;
    let close = 9;
    for (let i = 0; i < C.count; i++) {
      v.fromBufferAttribute(C, i);
      for (let k = 0; k < H.count; k += 3) close = Math.min(close, v.distanceTo(w.fromBufferAttribute(H, k)));
    }
    assert.ok(close < 0.003, `the bag's cord ${(close * 1000).toFixed(1)} mm from the fingers`);
  });
}

/*
 * The hood up (docs/wardrobe-plan.md Phase 3): cloth over the head with the face in its opening. At every detail
 * level: no point of the head, its ears or the shades' frames and arms comes through the hood (looking out from the
 * head's middle, the hood is further out than they are, by a little), the ears and the back of the head are under
 * it, and nothing of the hood is in front of the lenses (the shades show).
 */
for (const q of LEVELS)
  test(`accessories: the hood up covers the head and ears, clear of them, the shades in its opening (detail ${q})`, () => {
    const all = items(q, true);
    const o = { ...PLAYER, kind: 'hoodie' as const, hood: true, cap: undefined };
    const hoodIt = all.find((i) => i.id === 'hoodUp' && i.when(o))!;
    assert.ok(hoodIt, 'the hood is worn with the hoodie, hood up');
    const hood = new THREE.Mesh(hoodIt.pieces[0].geo, side);
    const head = all.find((i) => i.id === 'head')!;
    // (the skull and ears, the frames and their arms: everything on the head but the lenses, the last piece)
    const parts = head.pieces.slice(0, -1).map((p) => p.geo);
    const lenses = head.pieces[head.pieces.length - 1].geo;
    const v = new THREE.Vector3();
    const o3 = new THREE.Vector3();
    const d = new THREE.Vector3();
    let worst = 9;
    let worstAt = '';
    for (const g of parts) {
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        if (v.y < 0.06 || v.y > HEAD_TOP) continue;
        const r = headRow(v.y);
        o3.set(0, v.y, r.zc);
        d.subVectors(v, o3).setY(0);
        const dv = d.length();
        if (dv < 1e-4) continue;
        d.normalize();
        const dh = hit(hood, o3, d, false);
        // (none: that way is the opening)
        if (!Number.isFinite(dh)) continue;
        if (dh - dv < worst) {
          worst = dh - dv;
          worstAt = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
        }
      }
    }
    assert.ok(worst > 0.001, `something on the head comes within ${(worst * 1000).toFixed(1)} thousandths of the hood's cloth (at ${worstAt})`);
    // The ears, the back and the top of the head are under it
    for (const [y, dx, dy, dz] of [
      [0.125, 1, 0, 0],
      [0.125, -1, 0, 0],
      [0.15, 0, 0, -1],
      [0.2, 0, 1, 0],
    ]) {
      o3.set(0, y, headRow(y).zc);
      assert.ok(Number.isFinite(hit(hood, o3, d.set(dx, dy, dz), false)), `the hood covers the head from ${y} along ${dx},${dy},${dz}`);
    }
    // Nothing of the hood in front of the lenses
    const L = lenses.attributes.position;
    const fwd = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < L.count; i += 3) {
      v.fromBufferAttribute(L, i);
      assert.ok(!Number.isFinite(hit(hood, v, fwd, false)), `the hood is in front of a lens at ${v.x.toFixed(3)},${v.y.toFixed(3)}`);
    }
  });

/*
 * What's worn round the head with the hood up (the wardrobe plan's Phase 3): the shades' chain runs inside the hood and
 * out through its opening and down over the hoodie; it isn't in the cloth (between just inside it and the chain's
 * thickness outside, looking out from the head's middle). The headphones go under the hood: none are drawn with it up.
 */
for (const q of LEVELS)
  test(`accessories: the chain clear of the hood's cloth, the headphones under it (detail ${q})`, () => {
    const all = items(q, true);
    const o: Outfit = { ...PLAYER, kind: 'hoodie', hood: true, cap: undefined, chain: true, headphones: '#3355ff' };
    const hood = new THREE.Mesh(all.find((i) => i.id === 'hoodUp' && i.when(o))!.pieces[0].geo, side);
    const chain = all.find((i) => i.id === 'chain-hood')!;
    assert.ok(chain.when(o) && !all.some((i) => i.id === 'chain-hoodie' && i.when(o)), "the hood's own chain");
    // (the headphones go under the hood, as under the puffer's collar)
    assert.ok(!all.some((i) => i.id === 'headphones' && i.when(o)), 'no headphones over the hood up');
    const worn: [string, THREE.BufferGeometry, number][] = [['the chain', chain.pieces[0].geo, 0]];
    const v = new THREE.Vector3();
    const o3 = new THREE.Vector3();
    const d = new THREE.Vector3();
    for (const [what, g, dy] of worn) {
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        v.y += dy;
        if (v.y < -0.08 || v.y > HEAD_TOP) continue;
        o3.set(0, v.y, headRow(Math.max(v.y, -0.08)).zc);
        d.subVectors(v, o3).setY(0);
        const dv = d.length();
        if (dv < 1e-4) continue;
        const dh = hit(hood, o3, d.normalize(), false);
        if (!Number.isFinite(dh)) continue;
        // (the chain's own thickness out from the cloth: resting on it, as on the sweater)
        assert.ok(dv < dh - 0.002 || dv > dh + 0.0034, `${what} is in the hood's cloth at ${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)} (${((dv - dh) * 1000).toFixed(1)} thousandths)`);
      }
    }
  });
