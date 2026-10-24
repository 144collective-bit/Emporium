/*
 * The Trenches' waterfront on screen (the numbers are waterfront.ts and
 * riverside.ts):
 *
 * - **The boardwalk**, in sites a tile or so long (built as you go): the
 *   timber deck from the kerb out over the water, plank seams, the fascia
 *   at the water and the piles under it, a black steel railing with a wood
 *   cap, mooring bollards, life rings, benches facing the river, planters
 *   with trees; sodium lamps reaching in over it (world.ts's lamps).
 * - **The old docks**, a site: the rust-red dock crane straddling the
 *   boardwalk (legs, portal, cab, counterweight, its lattice jib out over
 *   the water with the hook hanging) and the barge tied up under it with
 *   its containers and wheelhouse.
 * - **Pier 7**, a place built at the boot (`buildPier()`, spot `pier`): the
 *   pier's deck on its piles with a railing round the head, the steel arch
 *   over the neck with PIER 7 lit both ways and bulbs along its curve, the
 *   octagonal BAIT · COFFEE kiosk, binoculars, benches, string lights from
 *   the arch to the head's poles, people fishing; and the Pier House at its
 *   head: pale stone, tall arched windows, a balustrade, a copper mansard,
 *   and the clock tower with a face on each side (its hands keep the
 *   visitor's time), the open belfry and the copper cupola.
 */
import * as THREE from 'three';
import { Batch, PAL, canvasTex, fx, glowMat, lit, neon, toon } from './kit';
import { INK, METAL, WOOD, glow, soft } from './infill';
import { SLAB as S, addLamp, addPool, addTree, keepTreesOff, type Tick } from './world';
import { site } from './tilework';
import { RIVER } from './layout';
import { WATER_Y } from './river';
import type { Pt, Rect } from './downtown';
import type { Idle, Spot } from './landmarks';
import { ARCH, BARGE, BENCHES, BINOCULARS, BOARDWALK, BOLLARDS, CRANE, DECK_Y, FISHERS, KIOSK, LAMPS, PIER, PLANTERS, RAIL_GAPS, RINGS, WATERFRONT_RECT } from './waterfront';
import { PIER_HOUSE } from './riverside';
import { SIGNS, archFrame, archPane, box, signPlane } from './riverside3d';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const DECK = toon('#6e5a4c');
const SEAM = toon('#3e3029');
const FASCIA = toon('#4a3424');
const PILE = toon('#3a2c22');
const RAIL = toon('#22212e');
const CAP = toon('#8a6444');
const RUST = toon('#9a3b24');
const RUST_DK = toon('#5e2618');
const ORANGE = toon('#ff6a2f');
const HULL = toon('#2c3a4a');
const PALE = toon('#d8ccb0');
const PALE_DK = toon('#b5a888');
const COPPER = toon('#5f9e8a');
const GLASS = toon('#141a36');
/** Windows that light up at night (a site's shared neon, so the docks can be built in the site worker) */
const WARM_WIN = neon('#ffb867', 0.1, 1.05);
const T = DECK_Y;
const [BX0, BZ0, BX1, BZ1] = BOARDWALK;

/** A bench facing the water (north), seat at the deck's height + 0.3 */
export function bench(b: Batch, x: number, z: number) {
  b.detail(() => {
    box(b, x - 0.45, T + 0.24, z - 0.15, x + 0.45, T + 0.3, z + 0.15, WOOD);
    box(b, x - 0.45, T + 0.32, z + 0.12, x + 0.45, T + 0.62, z + 0.17, WOOD);
    for (const sx of [-0.36, 0.36]) box(b, x + sx - 0.025, T, z - 0.14, x + sx + 0.025, T + 0.26, z + 0.14, INK);
  });
}
/** Coin binoculars on a post, looking north */
function binoculars(b: Batch, x: number, z: number) {
  b.detail(() => {
    b.add(new THREE.CylinderGeometry(0.05, 0.07, 0.95, 8).translate(x, T + 0.475, z), METAL);
    box(b, x - 0.16, T + 0.95, z - 0.12, x + 0.16, T + 1.12, z + 0.1, toon('#2a8a55'));
    for (const o of [-0.08, 0.08]) b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8).rotateX(Math.PI / 2).translate(x + o, T + 1.05, z - 0.18), METAL);
  });
}
/** A railing along x at z (posts near, a rail, a wood cap) */
export function railX(b: Batch, xa: number, xb: number, z: number, low: boolean) {
  box(b, xa, T + 0.58, z - 0.06, xb, T + 0.64, z + 0.06, CAP);
  box(b, xa, T + 0.28, z - 0.02, xb, T + 0.32, z + 0.02, RAIL);
  b.detail(() => {
    for (let x = xa; x <= xb + 1e-6; x += low ? 2.4 : 1.2) box(b, x - 0.03, T, z - 0.03, x + 0.03, T + 0.58, z + 0.03, RAIL);
  });
}
export function railZ(b: Batch, za: number, zb: number, x: number, low: boolean) {
  box(b, x - 0.06, T + 0.58, za, x + 0.06, T + 0.64, zb, CAP);
  box(b, x - 0.02, T + 0.28, za, x + 0.02, T + 0.32, zb, RAIL);
  b.detail(() => {
    for (let z = za; z <= zb + 1e-6; z += low ? 2.4 : 1.2) box(b, x - 0.03, T, z - 0.03, x + 0.03, T + 0.58, z + 0.03, RAIL);
  });
}
/** A deck on piles: the boards, plank seams across, the fascia round its water edges, piles under it */
export function deck(b: Batch, r: Rect, low: boolean, seamsAlongX = true) {
  const [x0, z0, x1, z1] = r;
  box(b, x0, T - 0.08, z0, x1, T, z1, DECK);
  const wz = Math.min(z1, RIVER[1]);
  // (the fascia and piles only where it's over the water)
  if (z0 < wz) {
    box(b, x0, T - 0.32, z0 - 0.02, x1, T - 0.06, z0 + 0.06, FASCIA);
    // (down into the water, under the streets since river plan step 2: at every distance, or the deck floats far off)
    const step = low ? 2.4 : 1.6;
    const ph = T - 0.08 - (WATER_Y - 0.3);
    for (let x = x0 + 0.3; x < x1; x += step) for (let z = z0 + 0.25; z < wz - 0.2; z += 1.9) b.add(new THREE.CylinderGeometry(0.11, 0.12, ph, 6, 1, true).translate(x, T - 0.08 - ph / 2, z), PILE);
  }
  b.detail(() => {
    const s = low ? 1 : 0.5;
    if (seamsAlongX) for (let x = x0 + s; x < x1 - 0.05; x += s) box(b, x - 0.012, T + 0.001, z0 + 0.02, x + 0.012, T + 0.004, z1 - 0.02, SEAM);
    else for (let z = z0 + s; z < z1 - 0.05; z += s) box(b, x0 + 0.02, T + 0.001, z - 0.012, x1 - 0.02, T + 0.004, z + 0.012, SEAM);
  });
}

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
  // (on the water, under the streets since river plan step 2)
  const W = WATER_Y;
  box(b, gx0, W - 0.25, gz0, gx1, W + 0.32, gz1, HULL);
  box(b, gx0 + 0.1, W + 0.32, gz0 + 0.1, gx1 - 0.1, W + 0.36, gz1 - 0.1, toon('#4a4a5a'));
  box(b, gx0 - 0.04, W + 0.22, gz0 - 0.04, gx1 + 0.04, W + 0.3, gz1 + 0.04, toon('#e8e2f0'));
  const cont = [toon('#2f6b8a'), toon('#9a3b24'), toon('#d9a23a'), toon('#3e7a4a')];
  const cw = 2.6;
  for (let i = 0; i < 3; i++) {
    const x = gx0 + 0.5 + i * (cw + 0.2);
    box(b, x, W + 0.36, gz0 + 0.4, x + cw, W + 1.36, gz1 - 0.4, cont[i]);
    if (i !== 1) box(b, x + 0.1, W + 1.36, gz0 + 0.5, x + cw - 0.1, W + 2.3, gz1 - 0.5, cont[(i + 3) % 4]);
    b.detail(() => {
      for (let u = x + 0.2; u < x + cw - 0.1; u += 0.22) box(b, u - 0.02, W + 0.4, gz0 + 0.39, u + 0.02, W + 1.32, gz0 + 0.4, INK);
    });
  }
  box(b, gx1 - 1.6, W + 0.36, gz0 + 0.5, gx1 - 0.3, W + 1.5, gz1 - 0.5, toon('#e8e2f0'));
  box(b, gx1 - 1.55, W + 1.0, gz0 + 0.48, gx1 - 0.35, W + 1.35, gz0 + 0.5, WARM_WIN);
  box(b, gx1 - 1.7, W + 1.5, gz0 + 0.4, gx1 - 0.2, W + 1.6, gz1 - 0.4, INK);
  // Tyres along its side as fenders, ropes to the boardwalk's bollards
  b.detail(() => {
    for (let x = gx0 + 1; x < gx1 - 0.5; x += 1.6) b.add(new THREE.TorusGeometry(0.16, 0.07, 6, 10).translate(x, W + 0.12, gz1 + 0.05), INK);
    for (const x of [gx0 + 0.6, gx1 - 0.6]) {
      const a = V(x, W + 0.36, gz1 - 0.2);
      const c = V(x, T + 0.3, BZ0 + 0.35);
      const e = c.clone().sub(a);
      const g = new THREE.CylinderGeometry(0.02, 0.02, e.length(), 4).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), e.clone().normalize()));
      b.add(g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), toon('#cdbfa8'));
    }
  });
}

/** The boardwalk in sites a tile or so long, the docks a site; its lamps and planters' trees (before the city's lamps and trees are built) */
export function buildWaterfront(low: boolean) {
  keepTreesOff(WATERFRONT_RECT);
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
  // (the lamps stand on the deck at the water, their arms reaching in over the walk)
  for (const [x, z] of LAMPS) addLamp(x, z, -Math.PI / 2, T);
  for (const [x, z] of PLANTERS) addTree(x, z, 0.75, false, T + 0.44);
}

/* ---------- Pier 7 and the Pier House: a place ---------- */

/** The clock's face: a cream dial, its numerals as strokes and dots, a brass ring (made-up, no maker's name) */
const DIAL = (() => {
  const tex = canvasTex(256, 256, (c) => {
    c.fillStyle = '#1d3a33';
    c.fillRect(0, 0, 256, 256);
    c.beginPath();
    c.arc(128, 128, 118, 0, Math.PI * 2);
    c.fillStyle = '#c9a24a';
    c.fill();
    c.beginPath();
    c.arc(128, 128, 108, 0, Math.PI * 2);
    c.fillStyle = '#f6eed8';
    c.fill();
    c.strokeStyle = '#1b1830';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const big = i % 5 === 0;
      c.lineWidth = big ? 7 : 2;
      const r0 = big ? 82 : 94;
      c.beginPath();
      c.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0);
      c.lineTo(128 + Math.sin(a) * 102, 128 - Math.cos(a) * 102);
      c.stroke();
    }
    c.fillStyle = '#1b1830';
    c.beginPath();
    c.arc(128, 128, 8, 0, Math.PI * 2);
    c.fill();
  });
  return lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.15);
})();

function drawPierHouse(b: Batch, low: boolean) {
  const P = PIER_HOUSE;
  const [x0, z0, x1, z1] = P.hall;
  const top = S + P.h;
  // The hall: pale stone, a rusticated base, the attic storey's band, the balustrade on the cornice
  box(b, x0, S, z0, x1, top, z1, PALE);
  box(b, x0 - 0.06, S, z0 - 0.06, x1 + 0.06, S + 1.0, z1 + 0.06, PALE_DK);
  b.detail(() => {
    for (const y of [S + 0.33, S + 0.66]) box(b, x0 - 0.08, y - 0.02, z0 - 0.08, x1 + 0.08, y + 0.02, z0 - 0.06, toon('#8f8470'));
  });
  box(b, x0 - 0.1, top - 0.35, z0 - 0.14, x1 + 0.1, top - 0.05, z1 + 0.14, PALE_DK);
  box(b, x0 - 0.14, top - 0.05, z0 - 0.18, x1 + 0.14, top + 0.05, z1 + 0.18, PALE);
  // The balustrade: a rail on balusters round the roof's edge (near), its plinth at every distance
  box(b, x0 - 0.06, top + 0.05, z0 - 0.1, x1 + 0.06, top + 0.12, z0 + 0.02, PALE_DK);
  box(b, x0 - 0.06, top + 0.55, z0 - 0.12, x1 + 0.06, top + 0.62, z0 + 0.04, PALE);
  b.detail(() => {
    for (let x = x0 + 0.1; x < x1 - 0.05; x += low ? 0.5 : 0.25) b.add(new THREE.CylinderGeometry(0.035, 0.05, 0.43, 6).translate(x, top + 0.335, z0 - 0.04), PALE);
  });
  // The copper mansard over the hall, its dormers lit
  const mans = new THREE.CylinderGeometry(Math.SQRT1_2 * 0.78, Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4);
  mans.scale(x1 - x0 - 0.6, 1.15, z1 - z0 - 0.6);
  b.add(mans.translate((x0 + x1) / 2, top + 0.12 + 0.575, (z0 + z1) / 2), COPPER);
  box(b, x0 + 1.6, top + 1.27, z0 + 1.3, x1 - 1.6, top + 1.32, z1 - 1.3, toon('#4a7f6f'));
  for (let i = 0; i < 6; i++) {
    const x = x0 + 1.6 + ((x1 - x0 - 3.2) * (i + 0.5)) / 6;
    if (Math.abs(x - P.cx) < 2.6) continue;
    box(b, x - 0.32, top + 0.3, z0 + 0.42, x + 0.32, top + 0.95, z0 + 0.8, PALE);
    box(b, x - 0.2, top + 0.38, z0 + 0.41, x + 0.2, top + 0.85, z0 + 0.42, WARM_WIN);
  }
  // The front's tall arched windows, three each side of the tower, between pilasters; lit at night
  const sides: [number, number][] = [
    [x0 + 0.6, P.tower[0] - 0.6],
    [P.tower[2] + 0.6, x1 - 0.6],
  ];
  for (const [a, c] of sides) {
    const bw = (c - a) / 3;
    for (let i = 0; i < 3; i++) {
      const cx = a + bw * (i + 0.5);
      const w = bw * 0.55;
      b.add(archPane(w, 2.9, cx, S + 1.15, z0 - 0.005), i === 1 ? GLASS : WARM_WIN);
      b.add(archFrame(w, 2.9, 0.12, 0.08, cx, S + 1.15, z0), PALE_DK);
      // The keystone, the mullion and transom
      box(b, cx - 0.1, S + 3.95, z0 - 0.12, cx + 0.1, S + 4.2, z0, PALE_DK);
      b.detail(() => {
        box(b, cx - 0.015, S + 1.15, z0 - 0.02, cx + 0.015, S + 3.9, z0 - 0.012, METAL);
        box(b, cx - w / 2, S + 2.6, z0 - 0.02, cx + w / 2, S + 2.63, z0 - 0.012, METAL);
      });
      if (i > 0) box(b, a + bw * i - 0.12, S + 1.0, z0 - 0.1, a + bw * i + 0.12, top - 0.35, z0, PALE_DK);
    }
  }
  // Round the sides and back, a row of arched windows along the hall
  for (const [xa, side] of [
    [x0, -1],
    [x1, 1],
  ] as [number, number][]) {
    for (let z = z0 + 1.6; z < z1 - 1; z += 2.4) {
      const g = archPane(1.0, 2.2, 0, 0, 0).rotateY((side * Math.PI) / 2 + Math.PI).translate(xa + side * 0.005, S + 1.3, z);
      b.add(g, Math.round(z) % 2 ? WARM_WIN : GLASS);
    }
  }

  // ...and across the back, facing the yard
  for (let x = x0 + 1.4, i = 0; x < x1 - 1; x += 2.4, i++) b.add(archPane(1.0, 2.2, 0, 0, 0).rotateY(Math.PI).translate(x, S + 1.3, z1 + 0.005), i % 2 ? WARM_WIN : GLASS);

  /* --- The clock tower --- */
  const [tx0, tz0, tx1, tz1] = P.tower;
  const tcx = (tx0 + tx1) / 2;
  const tcz = (tz0 + tz1) / 2;
  const th = S + P.towerH;
  box(b, tx0, S, tz0, tx1, th, tz1, PALE);
  box(b, tx0 - 0.08, S, tz0 - 0.08, tx1 + 0.08, S + 1.0, tz1 + 0.08, PALE_DK);
  // Corner pilasters, string courses
  for (const [x, z] of [
    [tx0, tz0],
    [tx1, tz0],
    [tx1, tz1],
    [tx0, tz1],
  ] as Pt[])
    box(b, x - 0.2, S + 1.0, z - 0.2, x + 0.2, th - 0.3, z + 0.2, PALE_DK);
  for (const y of [top - 0.35, th - 2.9, th - 0.3]) box(b, tx0 - 0.14, y, tz0 - 0.14, tx1 + 0.14, y + 0.2, tz1 + 0.14, PALE_DK);
  // The grand arch through its foot, the way in, PIER HOUSE over it
  b.add(archPane(2.2, 3.1, tcx, S, tz0 - 0.005, 14), WARM_WIN);
  b.add(archFrame(2.2, 3.1, 0.26, 0.14, tcx, S, tz0, 14), PALE_DK);
  box(b, tcx - 0.95, S, tz0 - 0.03, tcx + 0.95, S + 2.1, tz0 - 0.02, GLASS);
  box(b, tcx - 0.02, S, tz0 - 0.04, tcx + 0.02, S + 2.1, tz0 - 0.03, METAL);
  box(b, tcx - 1.75, S + 3.5, tz0 - 0.1, tcx + 1.75, S + 4.05, tz0 - 0.02, toon('#1d3a33'));
  b.add(signPlane(4, 3.3, 0.45, tcx, S + 3.775, tz0 - 0.105), SIGNS);
  // A tall window up the shaft
  b.add(archPane(0.8, 1.8, tcx, S + 4.5, tz0 - 0.005), WARM_WIN);
  b.add(archFrame(0.8, 1.8, 0.1, 0.06, tcx, S + 4.5, tz0), PALE_DK);
  // The clock: a dial on each face in a stone surround
  const cy = S + P.clockY;
  const dial = (g: THREE.BufferGeometry) => b.add(g, DIAL);
  for (const [nx, nz] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as Pt[]) {
    const out = (tx1 - tx0) / 2 + 0.13;
    const [x, z] = [tcx + nx * out, tcz + nz * out];
    const ry = Math.atan2(nx, nz);
    dial(new THREE.CircleGeometry(1.05, low ? 20 : 32).rotateY(ry).translate(x, cy, z));
    b.add(new THREE.TorusGeometry(1.1, 0.07, 6, low ? 20 : 32).rotateY(ry).translate(x, cy, z), PALE_DK);
    box(b, tcx + nx * ((tx1 - tx0) / 2) - (nz ? 1.3 : 0.12), cy - 1.3, tcz + nz * ((tz1 - tz0) / 2) - (nx ? 1.3 : 0.12), tcx + nx * ((tx1 - tx0) / 2) + (nz ? 1.3 : 0.12), cy + 1.3, tcz + nz * ((tz1 - tz0) / 2) + (nx ? 1.3 : 0.12), PALE);
  }
  // The belfry: an open arcade on four piers, its lantern lit, the copper cupola and finial
  const bt = th + 0.2;
  const bh = 1.5;
  box(b, tx0 - 0.1, th - 0.1, tz0 - 0.1, tx1 + 0.1, bt, tz1 + 0.1, PALE_DK);
  for (const [x, z] of [
    [tx0 + 0.3, tz0 + 0.3],
    [tx1 - 0.3, tz0 + 0.3],
    [tx1 - 0.3, tz1 - 0.3],
    [tx0 + 0.3, tz1 - 0.3],
  ] as Pt[])
    box(b, x - 0.3, bt, z - 0.3, x + 0.3, bt + bh, z + 0.3, PALE);
  box(b, tcx - 0.45, bt, tcz - 0.45, tcx + 0.45, bt + bh - 0.2, tcz + 0.45, soft('#ffd27a'));
  box(b, tx0 - 0.08, bt + bh, tz0 - 0.08, tx1 + 0.08, bt + bh + 0.25, tz1 + 0.08, PALE_DK);
  const cup = new THREE.CylinderGeometry(0.4, (tx1 - tx0) / 2 + 0.05, 1.2, 8, 1).rotateY(Math.PI / 8);
  b.add(cup.translate(tcx, bt + bh + 0.25 + 0.6, tcz), COPPER);
  b.add(new THREE.SphereGeometry(0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(tcx, bt + bh + 1.45, tcz), COPPER);
  const fin = S + P.top - (bt + bh + 1.85);
  b.add(new THREE.CylinderGeometry(0.02, 0.05, fin, 6).translate(tcx, bt + bh + 1.85 + fin / 2, tcz), toon('#c9a24a'));
  b.add(new THREE.SphereGeometry(0.08, 8, 6).translate(tcx, bt + bh + 1.87, tcz), toon('#c9a24a'));
  // Lamps by the way in, a flagpole on the hall's roof
  for (const o of [-1.9, 1.9]) {
    b.add(new THREE.CylinderGeometry(0.05, 0.08, 2.2, 8).translate(tcx + o, S + 1.1, z0 - 1.4), INK);
    b.add(new THREE.SphereGeometry(0.16, 10, 8).translate(tcx + o, S + 2.35, z0 - 1.4), glow('#ffe2a0'));
  }
  addPool(tcx, z0 - 1.4, 3.4, S + 0.03, true);
}

function drawPier(b: Batch, crowd: Idle[], low: boolean) {
  const { neck, head } = PIER;
  deck(b, neck, low, false);
  deck(b, head, low);
  // The railing round the head and along the neck
  const e = 0.08;
  railX(b, head[0], head[2], head[1] + e, low);
  railX(b, head[0], neck[0], head[3] - e, low);
  railX(b, neck[2], head[2], head[3] - e, low);
  railZ(b, head[1], head[3], head[0] + e, low);
  railZ(b, head[1], head[3], head[2] - e, low);
  railZ(b, neck[1], neck[3], neck[0] + e, low);
  railZ(b, neck[1], neck[3], neck[2] - e, low);
  // The arch: two lattice posts, a curved truss between, PIER 7 both ways on its board, bulbs along the curve
  const A = ARCH;
  for (const x of [A.x0, A.x1]) {
    box(b, x - A.post / 2, T, A.z - A.post / 2, x + A.post / 2, T + A.h - 0.5, A.z + A.post / 2, RAIL);
    box(b, x - 0.25, T, A.z - 0.25, x + 0.25, T + 0.3, A.z + 0.25, INK);
  }
  const ax = (A.x0 + A.x1) / 2;
  const half = (A.x1 - A.x0) / 2;
  const rise = 0.75;
  const arc = (t: number, dy = 0): THREE.Vector3 => V(A.x0 + (A.x1 - A.x0) * t, T + A.h - 0.5 + Math.sin(t * Math.PI) * rise + dy, A.z);
  const seg = low ? 8 : 14;
  for (let i = 0; i < seg; i++) {
    for (const dy of [0, -0.35]) {
      const a = arc(i / seg, dy);
      const c = arc((i + 1) / seg, dy);
      const d = c.clone().sub(a);
      b.add(new THREE.BoxGeometry(d.length() + 0.06, 0.08, 0.08).rotateZ(Math.atan2(d.y, d.x)).translate((a.x + c.x) / 2, (a.y + c.y) / 2, A.z), RAIL);
    }
    if (!low || i % 2 === 0) b.add(new THREE.SphereGeometry(0.06, 6, 4).translate(arc(i / seg).x, arc(i / seg).y + 0.08, A.z - 0.06), glow('#ffd27a'));
  }
  const bd = A.board;
  box(b, ax - bd.w / 2 - 0.08, T + bd.y - bd.h / 2 - 0.08, A.z - 0.06, ax + bd.w / 2 + 0.08, T + bd.y + bd.h / 2 + 0.08, A.z + 0.06, INK);
  b.add(signPlane(5, bd.w, bd.h, ax, T + bd.y, A.z - 0.066), SIGNS);
  b.add(signPlane(5, bd.w, bd.h, ax, T + bd.y, A.z + 0.066, 's'), SIGNS);
  for (const x of [ax - half + 0.05, ax + half - 0.05]) box(b, x - 0.03, T + bd.y + bd.h / 2, A.z - 0.03, x + 0.03, T + A.h - 0.5, A.z + 0.03, RAIL);
  // The kiosk: an octagon of dark wood with a lit hatch towards the head's middle, a copper roof, BAIT · COFFEE over it
  const [kx, kz] = KIOSK.c;
  b.add(new THREE.CylinderGeometry(KIOSK.r, KIOSK.r, KIOSK.h - 0.5, 8).rotateY(Math.PI / 8).translate(kx, T + (KIOSK.h - 0.5) / 2, kz), toon('#3b2418'));
  b.add(new THREE.CylinderGeometry(0.2, KIOSK.r + 0.35, 0.6, 8).rotateY(Math.PI / 8).translate(kx, T + KIOSK.h - 0.2, kz), COPPER);
  box(b, kx + KIOSK.r * 0.9 - 0.02, T + 0.75, kz - 0.55, kx + KIOSK.r * 0.92 + 0.02, T + 1.45, kz + 0.55, soft('#ffd9a0'));
  box(b, kx + KIOSK.r * 0.9, T + 0.72, kz - 0.6, kx + KIOSK.r + 0.3, T + 0.78, kz + 0.6, WOOD);
  b.add(signPlane(6, 2.0, 0.3, 0, 0, 0, 's').rotateY(Math.PI / 2).translate(kx + KIOSK.r + 0.12, T + 1.72, kz), SIGNS);
  // Benches, binoculars, a lamp at each corner of the head, string lights from the arch out to them
  for (const x of [PIER.x - 6, PIER.x + 4]) {
    b.detail(() => {
      box(b, x - 0.45, T + 0.24, head[3] - 0.65, x + 0.45, T + 0.3, head[3] - 0.35, WOOD);
      box(b, x - 0.45, T + 0.32, head[3] - 0.35, x + 0.45, T + 0.62, head[3] - 0.3, WOOD);
    });
  }
  for (const [x, z] of BINOCULARS) if (z < BZ0) binoculars(b, x, z);
  const poles: Pt[] = [
    [head[0] + 0.4, head[1] + 0.4],
    [head[2] - 0.4, head[1] + 0.4],
  ];
  for (const [x, z] of poles) {
    b.add(new THREE.CylinderGeometry(0.05, 0.07, 2.6, 8).translate(x, T + 1.3, z), RAIL);
    b.add(new THREE.SphereGeometry(0.14, 10, 8).translate(x, T + 2.7, z), glow('#ffb35c'));
    addPool(x, z, 3, T + 0.02, true);
  }
  b.detail(() => {
    for (const [px, pz] of poles) {
      const from = arc(px < ax ? 0.08 : 0.92);
      const k = low ? 8 : 16;
      for (let j = 0; j <= k; j++) {
        const t = j / k;
        const y = from.y + (T + 2.6 - from.y) * t - Math.sin(t * Math.PI) * 0.4;
        b.add(new THREE.SphereGeometry(0.045, 5, 4).translate(from.x + (px - from.x) * t, y, from.z + (pz - from.z) * t), j % 3 ? glow('#ffd27a') : glow('#ff7ad9'));
      }
    }
  });
  // People fishing off the rail, their rods out over the water
  for (const f of FISHERS) {
    crowd.push({ x: f.x, z: f.z, y: T, ry: f.yaw, act: 'look' });
    const dir = V(Math.sin(f.yaw), 0, Math.cos(f.yaw));
    const a = V(f.x, T + 0.75, f.z).addScaledVector(dir, 0.25);
    const c = a.clone().addScaledVector(dir, 1.6).add(V(0, 0.9, 0));
    const d = c.clone().sub(a);
    b.add(new THREE.CylinderGeometry(0.01, 0.018, d.length(), 4).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize())).translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), INK);
    b.add(new THREE.CylinderGeometry(0.004, 0.004, c.y - 0.05, 3).translate(c.x, c.y / 2, c.z), toon('#e8e2f0'));
    b.detail(() => box(b, f.x + dir.z * 0.4 - 0.15, T, f.z - dir.x * 0.4 - 0.1, f.x + dir.z * 0.4 + 0.15, T + 0.22, f.z - dir.x * 0.4 + 0.1, toon('#2a8a55')));
  }
  // A couple at the end of the neck, someone at the kiosk
  crowd.push({ x: PIER.x + 1.2, z: head[1] + 0.6, y: T, ry: Math.PI, act: 'chat' }, { x: PIER.x + 1.9, z: head[1] + 0.7, y: T, ry: Math.PI - 0.4, act: 'chat' });
  crowd.push({ x: kx + KIOSK.r + 0.75, z: kz + 0.2, y: T, ry: -Math.PI / 2, act: 'queue' });
}

/** Pier 7, the arch, the kiosk and the Pier House: a place (its pin over the arch); the clock's hands keep the time */
export function buildPier(scene: THREE.Scene, crowd: Idle[], opts: { tick: (f: Tick) => void; low: boolean }): { spot: Spot } {
  const group = new THREE.Group();
  group.name = 'pier';
  scene.add(group);
  const b = new Batch();
  drawPierHouse(b, opts.low);
  drawPier(b, crowd, opts.low);
  // People on the boardwalk's benches, at the binoculars
  BENCHES.filter((_, i) => i % 3 === 1).forEach(([x, z], i) => crowd.push({ x: x + (i % 2 ? 0.2 : -0.2), z, y: T + 0.3, ry: Math.PI, act: 'sit' }));
  b.build(group);
  // The clock's hands on all four faces: their own meshes (they move), kept at every distance
  const P = PIER_HOUSE;
  const [tx0, tz0, tx1, tz1] = P.tower;
  const tcx = (tx0 + tx1) / 2;
  const tcz = (tz0 + tz1) / 2;
  const handMat = toon('#1b1830');
  const hands: { hour: THREE.Mesh; minute: THREE.Mesh }[] = [];
  for (const [nx, nz] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as Pt[]) {
    const out = (tx1 - tx0) / 2 + 0.16;
    const face = new THREE.Group();
    face.position.set(tcx + nx * out, S + P.clockY, tcz + nz * out);
    face.rotation.y = Math.atan2(nx, nz);
    const hour = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.55, 0.02).translate(0, 0.22, 0), handMat);
    const minute = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.02).translate(0, 0.36, 0.01), handMat);
    for (const m of [hour, minute]) m.userData.keep = true;
    face.add(hour, minute);
    face.userData.keep = true;
    group.add(face);
    hands.push({ hour, minute });
  }
  let last = -1;
  opts.tick(() => {
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    if (min === last) return;
    last = min;
    for (const h of hands) {
      h.minute.rotation.z = -(now.getMinutes() / 60) * Math.PI * 2;
      h.hour.rotation.z = -((min % 720) / 720) * Math.PI * 2;
    }
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(9, 9.25, 64), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(PIER.x, T + 0.05, BZ0 - 1);
  group.add(fx(ring));
  const focus = V(PIER.x, 2, BZ0 + 2);
  return { spot: { id: 'pier', group, focus, size: 30, pin: V(ARCH.x0 + (ARCH.x1 - ARCH.x0) / 2, T + ARCH.h + 1.2, ARCH.z), ring, faces: 'n' } };
}
