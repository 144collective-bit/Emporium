/*
 * The country roads drawn (docs/highway-plan.md Phase 7; the numbers are rural.ts and ruraldress.ts), a district
 * loaded as you approach (districts.ts `LAZY_DISTRICTS` id `rural`), as sites a stretch of each road: the asphalt with
 * white edge lines and a dashed centre line, a grass verge and a ditch each side (not on a bank avenue's river side,
 * where the bank runs down to the water), the post-and-rail fences along the fields with their field gates and the
 * tracks over the verge to them, and each turning loop round its grass island.
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { site } from './tilework';
import { COVER, ROAD } from './palette';
import { RURAL, RURAL_RUNS, type RuralRun } from './rural';
import { atRun, loopCentre, riverSide } from './ruraldress';
import { FENCES, GATES, GATE_W } from './ruralfence';

/** This module's address, for the site worker (districts.ts) */
export const SELF = import.meta.url;

/** A site's stretch along a road */
const PIECE = 24;
const Y = { asphalt: 0.03, line: 0.036, verge: 0.016, ditch: 0.02, track: 0.024 };

/** A flat strip along a run from v0 to v1, o0 to o1 across, at y (in pieces a few tiles long) */
function strip(b: Batch, r: RuralRun, v0: number, v1: number, o0: number, o1: number, y: number, m: THREE.Material) {
  const [a, c] = [Math.min(v0, v1), Math.max(v0, v1)];
  for (let v = a; v < c - 1e-6; v += 6) {
    const w = Math.min(c, v + 6);
    const [p, q] = [atRun(r, v, o0), atRun(r, w, o1)];
    const [x0, x1, z0, z1] = [Math.min(p[0], q[0]), Math.max(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[1], q[1])];
    b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2), m);
  }
}
interface Paint {
  asphalt: THREE.Material;
  white: THREE.Material;
  yellow: THREE.Material;
  verge: THREE.Material;
  ditch: THREE.Material;
  mud: THREE.Material;
  track: THREE.Material;
  wood: THREE.Material;
  island: THREE.Material;
}
const paint = (): Paint => ({
  asphalt: toon('#2b2940'),
  white: toon(ROAD.line),
  yellow: toon('#e8c65a'),
  verge: toon(COVER.worn),
  ditch: toon(COVER.bank),
  mud: toon(COVER.bare),
  track: toon(COVER.dirt),
  wood: toon('#7a5b40'),
  island: toon(COVER.meadow),
});

/** A stretch of road, v0 to v1 along its run */
function road(b: Batch, r: RuralRun, v0: number, v1: number, m: Paint) {
  strip(b, r, v0, v1, -RURAL.half, RURAL.half, Y.asphalt, m.asphalt);
  for (const side of [-1, 1]) {
    strip(b, r, v0, v1, side * (RURAL.half - 0.2), side * (RURAL.half - 0.1), Y.line, m.white);
    if (riverSide(r, side)) continue;
    strip(b, r, v0, v1, side * RURAL.verge[0], side * RURAL.verge[1], Y.verge, m.verge);
    strip(b, r, v0, v1, side * RURAL.ditch[0], side * RURAL.ditch[1], Y.ditch, m.ditch);
    const mid = (RURAL.ditch[0] + RURAL.ditch[1]) / 2;
    strip(b, r, v0, v1, side * (mid - 0.15), side * (mid + 0.15), Y.ditch + 0.002, m.mud);
  }
  // (the centre line, dashed)
  const [a, c] = [Math.min(v0, v1), Math.max(v0, v1)];
  for (let v = Math.ceil(a / 3) * 3; v < c - 1; v += 3) strip(b, r, v, v + 1.4, -0.05, 0.05, Y.line + 0.001, m.yellow);
}

/** A fence along a line: posts every 2.4 and two rails (near only: thin, and many) */
function fence(b: Batch, pts: [number, number][], m: Paint) {
  b.detail(() => {
    for (let i = 1; i < pts.length; i++) {
      const [p, q] = [pts[i - 1], pts[i]];
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (l < 0.05) continue;
      const ry = Math.atan2(-(q[1] - p[1]), q[0] - p[0]);
      const [mx, mz] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      for (const h of [0.45, 0.8]) b.add(new THREE.BoxGeometry(l, 0.07, 0.05).rotateY(ry).translate(mx, h, mz), m.wood);
      const n = Math.max(1, Math.round(l / 2.4));
      for (let k = 0; k <= n; k++) {
        const [x, z] = [p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n];
        b.add(new THREE.BoxGeometry(0.1, 0.95, 0.1).rotateY(ry).translate(x, 0.475, z), m.wood);
      }
    }
  });
}

/** A field gate across its gap (five bars, closed), and the track over the verge and the ditch to it */
function gate(b: Batch, r: RuralRun, v: number, side: number, m: Paint) {
  strip(b, r, v - GATE_W / 2 + 0.2, v + GATE_W / 2 - 0.2, side * RURAL.half, side * (RURAL.fence + 1.5), Y.track, m.track);
  b.detail(() => {
    const [p, q] = [atRun(r, v - GATE_W / 2, side * RURAL.fence), atRun(r, v + GATE_W / 2, side * RURAL.fence)];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ry = Math.atan2(-(q[1] - p[1]), q[0] - p[0]);
    const [mx, mz] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    for (let k = 0; k < 5; k++) b.add(new THREE.BoxGeometry(l - 0.2, 0.06, 0.05).rotateY(ry).translate(mx, 0.2 + k * 0.17, mz), m.white);
    for (const e of [p, q]) b.add(new THREE.BoxGeometry(0.14, 1.1, 0.14).rotateY(ry).translate(e[0], 0.55, e[1]), m.wood);
    // (the brace across it)
    b.add(new THREE.BoxGeometry(Math.hypot(l - 0.2, 0.7), 0.05, 0.05).rotateZ(Math.atan2(0.7, l - 0.2)).rotateY(ry).translate(mx, 0.54, mz), m.white);
  });
}

export function register(_: { low: boolean }) {
  for (const r of RURAL_RUNS) {
    const len = Math.abs(r.to - r.from);
    for (let d = 0; d < len - 1e-6; d += PIECE) {
      const [v0, v1] = [r.from + r.out * d, r.from + r.out * Math.min(len, d + PIECE)];
      const [p, q] = [atRun(r, v0, -RURAL.fence - 2), atRun(r, v1, RURAL.fence + 2)];
      site(`rural ${r.id} ${d}`, [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])], (into) => {
        const b = new Batch();
        const m = paint();
        road(b, r, v0, v1, m);
        const [lo, hi] = [Math.min(v0, v1), Math.max(v0, v1)];
        for (const f of FENCES.filter((f) => f.run === r.id && f.pts.length === 2)) {
          // (the part of each fence along this stretch)
          const along = (pt: [number, number]) => (r.axis === 'x' ? pt[0] : pt[1]);
          const [a, c] = [along(f.pts[0]), along(f.pts[1])];
          const [s0, s1] = [Math.max(lo, Math.min(a, c)), Math.min(hi, Math.max(a, c))];
          if (s1 <= s0 + 0.05) continue;
          const o = r.axis === 'x' ? f.pts[0][1] - r.c : f.pts[0][0] - r.c;
          if (riverSide(r, Math.sign(o))) continue;
          fence(b, [atRun(r, s0, o), atRun(r, s1, o)], m);
        }
        for (const g of GATES.filter((g) => g.run === r.id && g.v >= lo && g.v < hi)) if (!riverSide(r, g.side)) gate(b, r, g.v, g.side, m);
        b.build(into, { cast: true, receive: true });
      });
    }
    // The turning loop: its asphalt ring round a grass island, and the fence round it (up its stub inland, a bank avenue's)
    const [cx, cz] = loopCentre(r);
    const R = RURAL.turn + RURAL.half + 3;
    const [ex, ez] = atRun(r, r.to, 0);
    site(`rural ${r.id} loop`, [Math.min(cx, ex) - R, Math.min(cz, ez) - R, Math.max(cx, ex) + R, Math.max(cz, ez) + R], (into) => {
      const b = new Batch();
      const m = paint();
      if (r.stub) {
        // (a bank avenue's: north or south off its end, its asphalt from the road's middle to the loop)
        const [z0, z1] = [Math.min(ez, r.stub.end[1]), Math.max(ez, r.stub.end[1])];
        b.add(new THREE.PlaneGeometry(RURAL.half * 2, z1 - z0).rotateX(-Math.PI / 2).translate(ex, Y.asphalt + 0.001, (z0 + z1) / 2), m.asphalt);
        for (const side of [-1, 1]) {
          b.add(new THREE.PlaneGeometry(0.1, z1 - z0 - RURAL.half).rotateX(-Math.PI / 2).translate(ex + side * (RURAL.half - 0.15), Y.line, (z0 + z1) / 2 + (r.stub.end[1] > ez ? RURAL.half / 2 : -RURAL.half / 2)), m.white);
          b.add(new THREE.PlaneGeometry(RURAL.verge[1] - RURAL.verge[0], z1 - z0).rotateX(-Math.PI / 2).translate(ex + side * (RURAL.verge[0] + RURAL.verge[1]) / 2, Y.verge, (z0 + z1) / 2), m.verge);
        }
      }
      b.add(new THREE.RingGeometry(RURAL.turn - RURAL.half, RURAL.turn + RURAL.half, 40, 1).rotateX(-Math.PI / 2).translate(cx, Y.asphalt, cz), m.asphalt);
      b.add(new THREE.CircleGeometry(RURAL.turn - RURAL.half, 32).rotateX(-Math.PI / 2).translate(cx, Y.verge, cz), m.island);
      b.add(new THREE.RingGeometry(RURAL.turn + RURAL.half - 0.2, RURAL.turn + RURAL.half - 0.1, 40, 1).rotateX(-Math.PI / 2).translate(cx, Y.line, cz), m.white);
      const ring = FENCES.find((f) => f.run === r.id && f.pts.length > 2);
      if (ring) fence(b, ring.pts, m);
      b.build(into, { cast: true, receive: true });
    });
  }
}
