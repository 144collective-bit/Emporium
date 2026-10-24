/*
 * The Trenches' boardwalk and old docks on screen (the numbers are
 * waterfront.ts), part of The Trenches' chunk (trenches3d.ts), loaded as you
 * approach; the deck, railing and bench pieces are waterfront3d.ts's (Pier 7
 * draws with them at the boot).
 *
 * - **The boardwalk**, in sites a tile or so long (built as you go): the
 *   timber deck from the kerb out over the water, plank seams, the fascia
 *   at the water and the piles under it, a black steel railing with a wood
 *   cap, mooring bollards, life rings, benches facing the river, planters
 *   with trees (the trees and the sodium lamps are placed at the boot by
 *   `placeTrenches()`, trenches-place.ts).
 * - **The old docks**, a site: the rust-red dock crane straddling the
 *   boardwalk (legs, portal, cab, counterweight, its lattice jib out over
 *   the water with the hook hanging) and the barge tied up under it with
 *   its containers and wheelhouse.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { INK, METAL, glow } from './infill';
import { site } from './tilework';
import { RIVER } from './layout';
import type { Pt } from './downtown';
import { BARGE, BENCHES, BINOCULARS, BOARDWALK, BOLLARDS, CRANE, DECK_Y, PLANTERS, RAIL_GAPS, RINGS } from './waterfront';
import { box } from './riversidekit';
import { bench, binoculars, deck, railX, railZ } from './waterfront3d';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const RUST = toon('#9a3b24');
const RUST_DK = toon('#5e2618');
const ORANGE = toon('#ff6a2f');
const HULL = toon('#2c3a4a');
const WARM_WIN = neon('#ffb867', 0.1, 1.05);
const T = DECK_Y;
const [BX0, BZ0, BX1, BZ1] = BOARDWALK;

/* ---------- The boardwalk ---------- */

function boardwalkPiece(b: Batch, xa: number, xb: number, low: boolean) {
  deck(b, [xa, BZ0, xb, BZ1], low);
  // The railing at the water, open where the pier's neck and the market's deck run on out from it
  const edge = BZ0 + 0.08;
  let runs: [number, number][] = [[xa, xb]];
  for (const [g0, g1] of RAIL_GAPS) runs = runs.flatMap(([a, c]): [number, number][] => (c <= g0 || a >= g1 ? [[a, c]] : [...(a < g0 ? [[a, g0] as [number, number]] : []), ...(c > g1 ? [[g1, c] as [number, number]] : [])]));
  for (const [a, c] of runs) railX(b, a, c, edge, low);
  // The ends of the boardwalk over the water closed off
  if (Math.abs(xa - BX0) < 1e-6) railZ(b, BZ0, RIVER[1], BX0 + 0.08, low);
  if (Math.abs(xb - BX1) < 1e-6) railZ(b, BZ0, RIVER[1], BX1 - 0.08, low);
  const inPiece = (x: number) => x >= xa && x < xb;
  for (const [x, z] of BENCHES) if (inPiece(x)) bench(b, x, z);
  for (const [x, z] of BINOCULARS) if (inPiece(x) && z > BZ0) binoculars(b, x, z);
  for (const [x, z] of PLANTERS)
    if (inPiece(x)) {
      box(b, x - 0.5, T, z - 0.42, x + 0.5, T + 0.42, z + 0.42, toon('#5a4636'));
      box(b, x - 0.45, T + 0.42, z - 0.37, x + 0.45, T + 0.44, z + 0.37, toon('#3b2a22'));
    }
  b.detail(() => {
    for (const x of BOLLARDS)
      if (inPiece(x)) {
        b.add(new THREE.CylinderGeometry(0.12, 0.15, 0.32, 8).translate(x, T + 0.16, BZ0 + 0.35), INK);
        b.add(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 8).translate(x, T + 0.34, BZ0 + 0.35), INK);
      }
    for (const x of RINGS)
      if (inPiece(x)) {
        box(b, x - 0.04, T, BZ0 + 0.2, x + 0.04, T + 1.05, BZ0 + 0.28, METAL);
        b.add(new THREE.TorusGeometry(0.22, 0.06, 6, 14).translate(x, T + 0.8, BZ0 + 0.18), ORANGE);
      }
  });
}

/* ---------- The old docks: the crane and the barge ---------- */

function drawDocks(b: Batch, low: boolean) {
  const C = CRANE;
  const [px0, pz0, px1, pz1] = C.portal;
  // The legs, braced, on their bogies
  for (const r of C.legs) {
    box(b, r[0], T, r[1], r[2], T + C.deck, r[3], RUST);
    box(b, r[0] - 0.12, T, r[1] - 0.25, r[2] + 0.12, T + 0.3, r[3] + 0.25, RUST_DK);
  }
  // The portal: beams along and across its top, braces across its ends (open along the boardwalk, so you walk through)
  for (const z of [pz0, pz1]) box(b, px0 - 0.2, T + C.deck - 0.35, z - 0.2, px1 + 0.2, T + C.deck, z + 0.2, RUST);
  for (const x of [px0, px1]) box(b, x - 0.2, T + C.deck - 0.35, pz0 - 0.2, x + 0.2, T + C.deck, pz1 + 0.2, RUST);
  b.detail(() => {
    for (const z of [pz0, pz1]) {
      const span = px1 - px0;
      const len = Math.hypot(span, C.deck - 0.8);
      for (const s of [1, -1]) b.add(new THREE.BoxGeometry(len, 0.1, 0.1).rotateZ(s * Math.atan2(C.deck - 0.8, span)).translate((px0 + px1) / 2, T + 0.4 + (C.deck - 0.8) / 2, z), RUST);
    }
  });
  // The deck on the portal, the cab turning on it, the counterweight behind
  const cx = (px0 + px1) / 2;
  const cz = (pz0 + pz1) / 2;
  box(b, px0 - 0.3, T + C.deck, pz0 - 0.3, px1 + 0.3, T + C.deck + 0.18, pz1 + 0.3, RUST_DK);
  b.add(new THREE.CylinderGeometry(1.1, 1.2, 0.35, 16).translate(cx, T + C.deck + 0.35, cz), RUST_DK);
  box(b, cx - 1.1, T + C.deck + 0.5, cz - 1.2, cx + 1.1, T + C.cab, cz + 0.9, RUST);
  box(b, cx - 1.15, T + C.cab, cz - 1.25, cx + 1.15, T + C.cab + 0.12, cz + 0.95, RUST_DK);
  // Its windows, lit at night, facing the water
  box(b, cx - 0.9, T + C.deck + 1.4, cz - 1.22, cx + 0.9, T + C.cab - 0.3, cz - 1.205, WARM_WIN);
  box(b, cx - 0.95, T + C.deck + 0.6, cz + 0.9, cx + 0.95, T + C.deck + 1.6, cz + 1.9, toon('#3a3b4a'));
  // The jib: a lattice boom from the cab out over the water, rising a little; the cable and hook over the barge
  const j0 = V(cx, T + C.cab - 0.2, cz - 1.1);
  const j1 = V(cx, T + C.jib.y, C.jib.to);
  const d = j1.clone().sub(j0);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, -1), d.clone().normalize());
  const along = (t: number, ox: number, oy: number) => j0.clone().addScaledVector(d, t).add(V(ox, oy, 0));
  for (const [ox, oy] of [
    [-0.32, 0],
    [0.32, 0],
    [0, 0.5],
  ] as Pt[]) {
    const g = new THREE.BoxGeometry(0.09, 0.09, len).applyQuaternion(q);
    const m = along(0.5, ox, oy);
    b.add(g.translate(m.x, m.y, m.z), RUST);
  }
  b.detail(() => {
    const n = low ? 6 : 12;
    for (let i = 0; i < n; i++) {
      const a = along(i / n, i % 2 ? -0.32 : 0.32, 0);
      const c = along((i + 1) / n, 0, 0.5);
      const e = c.clone().sub(a);
      const g = new THREE.BoxGeometry(0.05, e.length(), 0.05).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), e.clone().normalize()));
      b.add(g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), RUST);
    }
  });
  // The A-frame over the cab and its stays out to the jib's tip and back to the counterweight
  const peak = V(cx, T + C.top, cz - 0.2);
  for (const [a, c] of [
    [V(cx - 0.7, T + C.cab, cz - 0.6), peak],
    [V(cx + 0.7, T + C.cab, cz - 0.6), peak],
    [peak, along(0.98, 0, 0.5)],
    [peak, V(cx, T + C.deck + 1.6, cz + 1.9)],
  ] as [THREE.Vector3, THREE.Vector3][]) {
    const e = c.clone().sub(a);
    const g = new THREE.BoxGeometry(0.07, e.length(), 0.07).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), e.clone().normalize()));
    b.add(g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), RUST_DK);
  }
  b.add(new THREE.SphereGeometry(0.08, 6, 4).translate(peak.x, peak.y + 0.08, peak.z), glow('#ff3b3b'));
  const tip = along(0.98, 0, 0);
  b.add(new THREE.CylinderGeometry(0.012, 0.012, tip.y - (T + 1.3), 4).translate(tip.x, (tip.y + T + 1.3) / 2, tip.z), METAL);
  box(b, tip.x - 0.16, T + 1.05, tip.z - 0.1, tip.x + 0.16, T + 1.35, tip.z + 0.1, ORANGE);

  // The barge: a hull low in the water, its deck, containers, a little wheelhouse at the stern
  const [gx0, gz0, gx1, gz1] = BARGE;
  box(b, gx0, -0.25, gz0, gx1, 0.32, gz1, HULL);
  box(b, gx0 + 0.1, 0.32, gz0 + 0.1, gx1 - 0.1, 0.36, gz1 - 0.1, toon('#4a4a5a'));
  box(b, gx0 - 0.04, 0.22, gz0 - 0.04, gx1 + 0.04, 0.3, gz1 + 0.04, toon('#e8e2f0'));
  const cont = [toon('#2f6b8a'), toon('#9a3b24'), toon('#d9a23a'), toon('#3e7a4a')];
  const cw = 2.6;
  for (let i = 0; i < 3; i++) {
    const x = gx0 + 0.5 + i * (cw + 0.2);
    box(b, x, 0.36, gz0 + 0.4, x + cw, 1.36, gz1 - 0.4, cont[i]);
    if (i !== 1) box(b, x + 0.1, 1.36, gz0 + 0.5, x + cw - 0.1, 2.3, gz1 - 0.5, cont[(i + 3) % 4]);
    b.detail(() => {
      for (let u = x + 0.2; u < x + cw - 0.1; u += 0.22) box(b, u - 0.02, 0.4, gz0 + 0.39, u + 0.02, 1.32, gz0 + 0.4, INK);
    });
  }
  box(b, gx1 - 1.6, 0.36, gz0 + 0.5, gx1 - 0.3, 1.5, gz1 - 0.5, toon('#e8e2f0'));
  box(b, gx1 - 1.55, 1.0, gz0 + 0.48, gx1 - 0.35, 1.35, gz0 + 0.5, WARM_WIN);
  box(b, gx1 - 1.7, 1.5, gz0 + 0.4, gx1 - 0.2, 1.6, gz1 - 0.4, INK);
  // Tyres along its side as fenders, ropes to the boardwalk's bollards
  b.detail(() => {
    for (let x = gx0 + 1; x < gx1 - 0.5; x += 1.6) b.add(new THREE.TorusGeometry(0.16, 0.07, 6, 10).translate(x, 0.12, gz1 + 0.05), INK);
    for (const x of [gx0 + 0.6, gx1 - 0.6]) {
      const a = V(x, 0.36, gz1 - 0.2);
      const c = V(x, T + 0.3, BZ0 + 0.35);
      const e = c.clone().sub(a);
      const g = new THREE.CylinderGeometry(0.02, 0.02, e.length(), 4).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), e.clone().normalize()));
      b.add(g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), toon('#cdbfa8'));
    }
  });
}

/** The boardwalk in sites a tile or so long, the docks a site */
export function registerBoardwalk(low: boolean) {
  const n = Math.ceil((BX1 - BX0) / 30);
  for (let k = 0; k < n; k++) {
    const xa = BX0 + ((BX1 - BX0) * k) / n;
    const xb = BX0 + ((BX1 - BX0) * (k + 1)) / n;
    site(`boardwalk ${k}`, [xa, BZ0, xb, BZ1], (into) => {
      const b = new Batch();
      boardwalkPiece(b, xa, xb, low);
      b.build(into, { cast: false, receive: true });
    });
  }
  site('docks crane', [CRANE.portal[0] - 1, BARGE[1], CRANE.portal[2] + 1, CRANE.portal[3]], (into) => {
    const b = new Batch();
    drawDocks(b, low);
    b.build(into);
  });
}

