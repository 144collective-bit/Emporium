/*
 * Westlake Park's bridges drawn (docs/westlake-plan.md Phase 3a; the data is westlake.ts `BRIDGES`, `bridgeY()`), a
 * site each in the park's chunk:
 *
 * - the cast-iron bridge over the arm: a timber deck on its low arch, cream-painted iron girders either side, a
 *   shallow arched rib under each with rings between it and the deck, railings of posts and rails with a scroll
 *   between each pair (near only), stone abutments at its ends with an urn of flowers on each corner;
 * - the stone bridge over the inlet: a solid body of carved stone, an elliptical arch through it over the water ringed
 *   with voussoirs and a lighter keystone either face, parapets with their caps along its deck.
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { SLAB } from './world';
import { site } from './tilework';
import { BRIDGES, inLake, type Bridge, type Pt } from './westlake';
import { ORNATE, PLANT } from './palette';

const STONE = toon(ORNATE.stone);
const ROUGH = toon(ORNATE.rough);
const DRESSED = toon(ORNATE.dressed);
const IRON = toon(ORNATE.iron);
const IRON_DARK = toon(ORNATE.ironDark);
const PLANK = toon(ORNATE.plank);
const URN = toon(ORNATE.urn);
const FOLIAGE = toon(PLANT.shrub);
const FLOWER = toon('#d0567a');

/** How many pieces a bridge's length is cut into for its curves */
const N = 28;

/** A point on a bridge `s` along it and `w` across it (left of its way positive), at height y over the lawn's slab */
function at(k: Bridge, s: number, w: number, y: number): THREE.Vector3 {
  return new THREE.Vector3(k.a[0] + k.u[0] * s - k.u[1] * w, SLAB + y, k.a[1] + k.u[1] * s + k.u[0] * w);
}
/** The deck's top over the slab `s` along it */
const deck = (k: Bridge, s: number) => k.rise * Math.sin((Math.PI * Math.max(0, Math.min(k.len, s))) / k.len);

/** A box from one point to another (its length along them), `w` wide (square to them, level), `h` deep (straight down from them) */
function beam(p: THREE.Vector3, q: THREE.Vector3, w: number, h: number): THREE.BufferGeometry {
  const d = new THREE.Vector3().subVectors(q, p);
  const len = d.length();
  const g = new THREE.BoxGeometry(len, h, w).translate(0, -h / 2, 0);
  // (pitched up the slope, then turned to the way)
  const pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  const yaw = Math.atan2(-d.z, d.x);
  g.rotateZ(pitch).rotateY(yaw);
  return g.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
}

/** The cast-iron bridge */
function ironBridge(b: Batch, k: Bridge, low: boolean) {
  const step = k.len / N;
  // The deck: timber, a piece a step, its edges trimmed by the girders
  for (let i = 0; i < N; i++) {
    const [s0, s1] = [i * step, (i + 1) * step];
    b.add(beam(at(k, s0, 0, deck(k, s0)), at(k, s1, 0, deck(k, s1)), k.half * 2, 0.12), PLANK);
    for (const side of [-1, 1]) {
      // The girder along each side: a deep cream fascia under the deck's edge
      const w = side * (k.half + 0.05);
      b.add(beam(at(k, s0, w, deck(k, s0) + 0.04), at(k, s1, w, deck(k, s1) + 0.04), 0.1, 0.34), IRON);
    }
  }
  // The arched rib under each side: springing from the abutments, rising under the deck to meet it in the middle
  const rib = (s: number) => -0.25 + (k.rise - 0.1) * Math.sin((Math.PI * s) / k.len);
  for (const side of [-1, 1]) {
    const w = side * (k.half - 0.05);
    for (let i = 0; i < N; i++) {
      const [s0, s1] = [i * step, (i + 1) * step];
      b.add(beam(at(k, s0, w, rib(s0)), at(k, s1, w, rib(s1)), 0.09, 0.14), IRON_DARK);
    }
    // Rings between the rib and the deck where there's room: the spandrels' ironwork
    for (let i = 1; i < N; i++) {
      const s = i * step;
      const gap = deck(k, s) - 0.3 - rib(s);
      if (gap < 0.18) continue;
      const r = Math.min(0.26, gap / 2);
      const c = at(k, s, w, rib(s) + gap / 2);
      const g = new THREE.TorusGeometry(r, 0.025, 4, 12).rotateY(Math.atan2(-k.u[1], k.u[0]));
      b.add(g.translate(c.x, c.y, c.z), IRON);
    }
  }
  // The railings: posts, a top rail and a mid rail each side; scrolls between the posts near only
  const H = 0.95;
  for (const side of [-1, 1]) {
    const w = side * (k.half - 0.04);
    for (let i = 0; i < N; i++) {
      const [s0, s1] = [i * step, (i + 1) * step];
      b.add(beam(at(k, s0, w, deck(k, s0) + H), at(k, s1, w, deck(k, s1) + H), 0.08, 0.06), IRON);
      b.add(beam(at(k, s0, w, deck(k, s0) + 0.3), at(k, s1, w, deck(k, s1) + 0.3), 0.04, 0.04), IRON_DARK);
    }
    for (let s = 0; s <= k.len + 1e-6; s += step * 2) {
      const p = at(k, s, w, deck(k, s) + H / 2);
      b.add(new THREE.BoxGeometry(0.07, H, 0.07).translate(p.x, p.y, p.z), IRON);
    }
    b.detail(() => {
      if (low) return;
      for (let s = step; s < k.len; s += step * 2) {
        const p = at(k, s, w, deck(k, s) + 0.62);
        b.add(new THREE.TorusGeometry(0.17, 0.018, 4, 10).rotateY(Math.atan2(-k.u[1], k.u[0])).translate(p.x, p.y, p.z), IRON);
      }
    });
  }
  // The abutments: dressed stone at each end, an urn of flowers on each corner
  for (const s of [0, k.len]) {
    const out = s ? 1 : -1;
    const c = at(k, s + out * 0.5, 0, -0.05);
    const box = new THREE.BoxGeometry(1.4, 0.5, k.half * 2 + 0.6).rotateY(Math.atan2(-k.u[1], k.u[0]));
    b.add(box.translate(c.x, c.y, c.z), STONE);
    for (const side of [-1, 1]) {
      const p = at(k, s + out * 0.6, side * (k.half + 0.15), 0.2);
      b.add(new THREE.BoxGeometry(0.5, 0.5, 0.5).translate(p.x, p.y + 0.25, p.z), DRESSED);
      const urn = new THREE.LatheGeometry([new THREE.Vector2(0.08, 0), new THREE.Vector2(0.16, 0.05), new THREE.Vector2(0.12, 0.18), new THREE.Vector2(0.24, 0.42), new THREE.Vector2(0.26, 0.48)], 10);
      b.add(urn.translate(p.x, p.y + 0.5, p.z), URN);
      b.add(new THREE.SphereGeometry(0.24, 7, 5).scale(1, 0.6, 1).translate(p.x, p.y + 1.02, p.z), FOLIAGE);
      b.detail(() => {
        if (low) return;
        for (let j = 0; j < 5; j++) {
          const a = (j / 5) * Math.PI * 2;
          b.add(new THREE.SphereGeometry(0.06, 5, 4).translate(p.x + Math.cos(a) * 0.15, p.y + 1.12, p.z + Math.sin(a) * 0.15), FLOWER);
        }
      });
    }
  }
}

/** The stone bridge */
function stoneBridge(b: Batch, k: Bridge, low: boolean) {
  const step = k.len / N;
  // The arch: over the water along the deck, a little wider, an ellipse under the deck
  let [w0, w1] = [Infinity, -Infinity];
  for (let s = 0; s <= k.len; s += 0.1) {
    const p = at(k, s, 0, 0);
    if (inLake(p.x, p.z)) [w0, w1] = [Math.min(w0, s), Math.max(w1, s)];
  }
  const [a0, a1] = [w0 - 0.5, w1 + 0.5];
  const [mid, span] = [(a0 + a1) / 2, (a1 - a0) / 2];
  const crown = (s: number) => deck(k, s) - 0.45;
  const intrados = (s: number) => (s > a0 && s < a1 ? -0.1 + (crown(mid) + 0.1) * Math.sqrt(1 - ((s - mid) / span) ** 2) : -0.1);
  const W = k.half + 0.25;
  // The body: one carved mass, its side the deck's curve over the arch's (or the lawn where there's no arch), the full
  // width, smooth (extruded across the bridge from its profile)
  const M = 64;
  const prof = new THREE.Shape();
  prof.moveTo(0, -0.1);
  for (let i = 0; i <= M; i++) {
    const s = (i / M) * k.len;
    prof.lineTo(s, deck(k, s));
  }
  for (let i = M; i >= 0; i--) {
    const s = (i / M) * k.len;
    prof.lineTo(s, Math.min(intrados(s), deck(k, s) - 0.2));
  }
  const body = new THREE.ExtrudeGeometry(prof, { depth: W * 2, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -W);
  // (its x along the bridge, its z across it to the left, its y up: into the world)
  const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(k.u[0], 0, k.u[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-k.u[1], 0, k.u[0]));
  b.add(body.applyMatrix4(basis.setPosition(k.a[0], SLAB, k.a[1])), ROUGH);
  // The paving over it
  for (let i = 0; i < N; i++) {
    const [s0, s1] = [i * step, (i + 1) * step];
    b.add(beam(at(k, s0, 0, deck(k, s0) + 0.03), at(k, s1, 0, deck(k, s1) + 0.03), k.half * 2, 0.05), STONE);
  }
  // The voussoirs round the arch, either face, the keystone at its crown larger and lighter
  const n = 11;
  for (const side of [-1, 1]) {
    const w = side * (W + 0.03);
    for (let j = 0; j <= n; j++) {
      const t = Math.PI - (j / n) * Math.PI;
      const s = mid + Math.cos(t) * span;
      const y = -0.1 + (crown(mid) + 0.1) * Math.sin(t);
      const p = at(k, s, w, y + 0.12);
      const key = j === Math.round(n / 2);
      const g = new THREE.BoxGeometry(key ? 0.34 : 0.26, key ? 0.42 : 0.3, 0.1).rotateZ(t - Math.PI / 2).rotateY(Math.atan2(-k.u[1], k.u[0]));
      b.add(g.translate(p.x, p.y, p.z), key ? DRESSED : STONE);
    }
  }
  // The parapets along the deck, their caps, a pier at each end
  for (const side of [-1, 1]) {
    const w = side * (k.half + 0.08);
    for (let i = 0; i < N; i++) {
      const [s0, s1] = [i * step, (i + 1) * step];
      b.add(beam(at(k, s0, w, deck(k, s0) + 0.62), at(k, s1, w, deck(k, s1) + 0.62), 0.26, 0.62), STONE);
      b.add(beam(at(k, s0, w, deck(k, s0) + 0.7), at(k, s1, w, deck(k, s1) + 0.7), 0.34, 0.08), DRESSED);
    }
    for (const s of [0, k.len]) {
      const p = at(k, s, w, 0.45);
      b.add(new THREE.BoxGeometry(0.46, 0.9, 0.46).translate(p.x, p.y, p.z), DRESSED);
      if (!low) b.add(new THREE.SphereGeometry(0.16, 8, 6).translate(p.x, p.y + 0.6, p.z), DRESSED);
    }
  }
}

/** The bridges, a site each */
export function registerBridges(low: boolean) {
  for (const k of BRIDGES) {
    const pts: Pt[] = [k.a, k.b];
    const r = k.half + 2;
    const rect: [number, number, number, number] = [Math.min(...pts.map((p) => p[0])) - r, Math.min(...pts.map((p) => p[1])) - r, Math.max(...pts.map((p) => p[0])) + r, Math.max(...pts.map((p) => p[1])) + r];
    site(`westlake bridge ${k.id}`, rect, (into) => {
      const b = new Batch();
      if (k.id === 'iron') ironBridge(b, k, low);
      else stoneBridge(b, k, low);
      b.build(into, { cast: true, receive: true });
    });
  }
}
