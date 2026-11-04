// Degen's smooth hands (handmesh.ts): one smooth surface a part (no facets), its normals outward, no crease where
// a finger leaves the palm, the fingers as long as the skeleton's, the two sides mirrored, light enough at each
// level; the gloves over the hand, a fingerless one's fingertips bare, every glove inside the first-person cuff.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BLEND, GLOVE, GLOVE_KINDS, gloveParts, smoothHand, type HandLevel, type HandPart } from '../src/scripts/city3d/handmesh';
import { bakedHand } from '../src/scripts/city3d/body';
import { HAND } from '../src/scripts/city3d/skeleton';
import { CUFF_AT, WRIST_R } from '../src/scripts/city3d/fpgunkit';
import { cleanLook, DEFAULT_LOOK, PALETTE } from '../src/scripts/net/profile-data';

const LEVELS: HandLevel[] = [3, 2];
const tris = (parts: HandPart[]) => parts.reduce((n, p) => n + p.geo.attributes.position.count / 3, 0);
const key = (v: THREE.Vector3) => `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`;

test('hands: light enough at each level, every vertex weighted to its own side', () => {
  for (const q of LEVELS)
    for (const side of [-1, 1] as const) {
      const parts = smoothHand(side, q);
      const n = tris(parts);
      assert.ok(n < (q === 3 ? 2700 : 1300), `detail ${q}: ${n} triangles a hand`);
      for (const p of parts) {
        assert.equal(p.skin.length, p.geo.attributes.position.count);
        for (const inf of p.skin) {
          assert.ok(Math.abs(inf.reduce((s, [, w]) => s + w, 0) - 1) < 1e-6, 'the weights sum to one');
          for (const [b] of inf) assert.ok(b.endsWith(side < 0 ? 'L' : 'R'), `${b} on side ${side}`);
        }
      }
    }
});

test('hands: smooth, not faceted: one normal wherever a point is shared', () => {
  for (const q of LEVELS)
    for (const p of smoothHand(-1, q)) {
      const P = p.geo.attributes.position;
      const N = p.geo.attributes.normal;
      const seen = new Map<string, THREE.Vector3>();
      const v = new THREE.Vector3();
      const n = new THREE.Vector3();
      for (let i = 0; i < P.count; i++) {
        const k = key(v.fromBufferAttribute(P, i));
        n.fromBufferAttribute(N, i);
        const was = seen.get(k);
        if (was) assert.ok(was.angleTo(n) < 1e-4, `two normals at ${k}`);
        else seen.set(k, n.clone());
      }
    }
});

test('hands: normals point out of each part', () => {
  for (const q of LEVELS)
    for (const p of smoothHand(-1, q)) {
      const P = p.geo.attributes.position;
      const N = p.geo.attributes.normal;
      p.geo.computeBoundingBox();
      const v = new THREE.Vector3();
      const n = new THREE.Vector3();
      let out = 0;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        n.fromBufferAttribute(N, i);
        // (the face's own normal: the winding, which the shading and the outline's front faces follow)
        const t = Math.floor(i / 3) * 3;
        const a = new THREE.Vector3().fromBufferAttribute(P, t);
        const face = new THREE.Vector3().fromBufferAttribute(P, t + 1).sub(a).cross(new THREE.Vector3().fromBufferAttribute(P, t + 2).sub(a));
        if (face.lengthSq() < 1e-16 || face.dot(n) > 0) out++;
      }
      assert.ok(out / P.count > 0.97, `detail ${q}: ${((out / P.count) * 100).toFixed(1)}% wound outward`);
    }
});

test('hands: where a finger leaves the palm it takes the palm\'s normal (no crease for the ink)', () => {
  const [palm, ...digits] = smoothHand(-1, 3);
  const P = palm.geo.attributes.position;
  const PN = palm.geo.attributes.normal;
  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  const m = new THREE.Vector3();
  let worst = 0;
  for (const d of digits) {
    const D = d.geo.attributes.position;
    const DN = d.geo.attributes.normal;
    for (let i = 0; i < D.count; i += 3) {
      v.fromBufferAttribute(D, i);
      let best = Infinity;
      let at = 0;
      for (let k = 0; k < P.count; k++) {
        const dd = v.distanceToSquared(w.fromBufferAttribute(P, k));
        if (dd < best) [best, at] = [dd, k];
      }
      w.fromBufferAttribute(P, at);
      m.fromBufferAttribute(PN, at);
      const out = v.clone().sub(w).dot(m);
      // (just out of the palm, within a millimetre of it)
      // (where they face much the same way: in the crease between two fingers each keeps its own)
      const own = new THREE.Vector3().fromBufferAttribute(DN, i);
      if (out < 0 || out > 0.0008 || Math.sqrt(best) > 0.0035 || own.dot(m) < 0.5) continue;
      worst = Math.max(worst, own.angleTo(m));
    }
  }
  assert.ok(worst < 0.6, `a finger's root ${THREE.MathUtils.radToDeg(worst).toFixed(0)}° off the palm's`);
  assert.ok(BLEND.most > 0.5);
});

test('hands: the fingers as long as the skeleton\'s, the two sides mirrored', () => {
  for (const q of LEVELS) {
    const [, ...fingers] = smoothHand(-1, q);
    HAND.fingers.forEach((f, i) => {
      const g = fingers[i].geo;
      g.computeBoundingBox();
      const tip = HAND.knuckleY - g.boundingBox!.min.y;
      assert.ok(Math.abs(tip - f.len) < 0.002, `finger ${i}: ${(tip * 1000).toFixed(1)} mm against ${(f.len * 1000).toFixed(1)}`);
    });
    const L = smoothHand(-1, q);
    const R = smoothHand(1, q);
    L.forEach((p, i) => {
      const a = p.geo.attributes.position;
      const b = R[i].geo.attributes.position;
      assert.equal(a.count, b.count);
      const left = new Set<string>();
      for (let k = 0; k < a.count; k++) left.add(key(new THREE.Vector3(-a.getX(k), a.getY(k), a.getZ(k))));
      for (let k = 0; k < b.count; k++) assert.ok(left.has(key(new THREE.Vector3().fromBufferAttribute(b, k))), 'mirrored');
    });
  }
});

test('hands: closed, the fingertips come round to the palm', () => {
  const open = bakedHand(1, 0, 3);
  const fist = bakedHand(1, 1, 3);
  open.computeBoundingBox();
  fist.computeBoundingBox();
  assert.ok(fist.boundingBox!.min.y > open.boundingBox!.min.y + 0.025, 'a fist is shorter than an open hand');
});

test('gloves: over the hand, a fingerless one\'s fingertips bare', () => {
  for (const q of LEVELS)
    for (const kind of GLOVE_KINDS) {
      const hand = smoothHand(-1, q);
      const glove = gloveParts(-1, q, kind);
      assert.equal(glove.length, hand.length);
      glove.forEach((g, i) => {
        const H = hand[i].geo.attributes.position;
        const G = g.geo.attributes.position;
        assert.equal(g.skin.length, G.count);
        if (kind !== 'fingerless') {
          assert.equal(G.count, H.count);
          // (a finger's root buried in the palm is under the palm's glove: only the palm's covers it there)
          let off = 0;
          for (let k = 0; k < G.count; k++) if (new THREE.Vector3().fromBufferAttribute(G, k).distanceTo(new THREE.Vector3().fromBufferAttribute(H, k)) > GLOVE.t - 1e-5) off++;
          assert.ok(off / G.count > (i === 0 ? 0.9999 : 0.7), `${kind} ${i}: ${((off / G.count) * 100).toFixed(1)}% off the hand`);
        } else if (i > 0) {
          g.geo.computeBoundingBox();
          hand[i].geo.computeBoundingBox();
          assert.ok(g.geo.boundingBox!.min.y > hand[i].geo.boundingBox!.min.y + 0.012, `fingerless ${i}: the tip bare`);
          assert.ok(G.count > 0);
        }
      });
    }
});

test('hands and gloves: inside the first-person cuff', () => {
  // (fpgunkit's WRIST_R is in the viewmodel's size: the hand drawn 1.15 times life)
  const FP_HAND = 1.15;
  for (const parts of [smoothHand(1, 3), ...GLOVE_KINDS.map((k) => gloveParts(1, 3, k))]) {
    let widest = 0;
    for (const p of parts) {
      const P = p.geo.attributes.position;
      for (let i = 0; i < P.count; i++) if (P.getY(i) * FP_HAND >= CUFF_AT) widest = Math.max(widest, Math.hypot(P.getX(i), P.getZ(i)) * FP_HAND);
    }
    assert.ok(widest < WRIST_R, `${(widest * 1000).toFixed(1)} mm under the cuff, against ${(WRIST_R * 1000).toFixed(1)}`);
  }
});

test('the look: skin tones and gloves cleaned, older looks as they were', () => {
  assert.equal(PALETTE.skin.length, 6);
  assert.ok(PALETTE.skin.includes(DEFAULT_LOOK.tone));
  const old = cleanLook({ kind: 'suit' });
  assert.equal(old.tone, DEFAULT_LOOK.tone);
  assert.equal(old.gloves, null);
  const l = cleanLook({ tone: PALETTE.skin[4], gloves: 'driving', gloveColor: PALETTE.glove[2] });
  assert.equal(l.tone, PALETTE.skin[4]);
  assert.equal(l.gloves, 'driving');
  assert.equal(l.gloveColor, PALETTE.glove[2]);
  const bad = cleanLook({ tone: '#ff00ff', gloves: 'boxing', gloveColor: 'red' });
  assert.equal(bad.tone, DEFAULT_LOOK.tone);
  assert.equal(bad.gloves, null);
  assert.equal(bad.gloveColor, DEFAULT_LOOK.gloveColor);
});
