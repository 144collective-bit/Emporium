/*
 * The Ridgeline Walk, the Belvedere and the Crestmont Glasshouse drawn (crestwalk.ts, crestsites.ts; the premium
 * upgrade's Phase 5), in Crestmont's chunk, as sites: the walk in pieces (gravel laid on the grass as drawn, stone steps
 * and an iron handrail where it's steep, low lamps, benches, two lookouts with a rail and a coin viewer); the Belvedere
 * (a round of stone columns under a small dome on its paved round, benches inside); the glasshouse (a white-framed
 * palm house of a domed middle and two wings, its palms seen through the glass, its garden of beds and gravel paths
 * round a fountain). The lamps' heads, the Belvedere's uplights and the glasshouse's glow at night, under the bloom.
 */
import * as THREE from 'three';
import { Batch, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { DRAPE, discMesh, lineMesh } from './crestdrape';
import { meshGeometry } from './mansions3d';
import { BELVEDERE, GLASSHOUSE } from './crestsites';
import { BELVEDERE_BENCH, BELVEDERE_BENCHES, BENCH, BENCHES, GLASS_FOUNTAIN, GLASS_PATH, LOOKOUTS, STEP, STEPS, WALK, WALK_LAMPS, WALK_POINTS, stepAt, walkAt, walkGround } from './crestwalk';
import { COVER } from './palette';

const GRAVEL = toon('#d8cfbd');
const STONE = toon('#d9cfbb');
const STONE_SHADE = toon('#c4b99f');
const IRON = toon('#1e1d22');
const WOOD = toon('#5a3a26');
const WHITE = toon('#f4f1ea');
const GOLD = toon('#c9a54a');
const COPPER = toon('#5f9c8a');
const LEAF = toon('#3f7434');
const PALM = toon('#4f8a3a');
const TRUNK = toon('#7a5a3a');
const BED = toon(COVER.planted);
const LAMP = neon('#ffe2a8', 0.2, 1.3);
const UPLIGHT = neon('#fff0d0', 0.1, 1.5);
const GLASS = siteMat('glasshouse-glass', lit(new THREE.MeshToonMaterial({ color: '#cfeedd', transparent: true, opacity: 0.32, depthWrite: false, emissive: '#ffe9c0' }), 0, 0.35));
const WATER = toon('#5aa3c4');

const ground = walkGround;
const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: THREE.Material) => b.box(Math.min(x0, x1), y0, Math.min(z0, z1), Math.abs(x1 - x0), y1 - y0, Math.abs(z1 - z0), m);
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, m: THREE.Material, seg = 10, r0 = r) => b.add(new THREE.CylinderGeometry(r, r0, h, seg).translate(x, y + h / 2, z), m);

/** On the Belvedere's paved round (its kerb and a little past) */
const inBelvedere = (x: number, z: number) => Math.hypot(x - BELVEDERE.x, z - BELVEDERE.z) < BELVEDERE.r + 0.8;

export function registerWalk(low: boolean) {
  /* ---------- The walk, a piece every 30 along it ---------- */
  const PIECE = 30;
  const L = WALK_POINTS[WALK_POINTS.length - 1].d;
  for (let d0 = 0; d0 < L; d0 += PIECE) {
    const d1 = Math.min(L, d0 + PIECE + 0.5);
    const pts = WALK_POINTS.filter((p) => p.d >= d0 && p.d <= d1);
    if (pts.length < 2) continue;
    const xs = pts.map((p) => p.x);
    const zs = pts.map((p) => p.z);
    site(`crestmont walk ${d0}`, [Math.min(...xs) - 3, Math.min(...zs) - 3, Math.max(...xs) + 3, Math.max(...zs) + 3], (into) => {
      const b = new Batch();
      // The gravel, on the grass as drawn
      b.add(meshGeometry(lineMesh(pts.map((p): [number, number] => [p.x, p.z]), WALK.half, DRAPE.path)), GRAVEL);
      // Stone steps where it's steep, an iron handrail on its right
      for (const [a, c] of STEPS) {
        const [s0, s1] = [Math.max(a, d0), Math.min(c, d1)];
        if (s1 <= s0) continue;
        // (each step a solid block a run deep, its tread level at the higher end's ground and its foot in the lower's,
        // so a flight reads as a stair and not as slabs laid on the slope: crestwalk.ts `stepAt()`, the walkers' too)
        // (phones draw them near only: from further off a flight reads as the gravel it climbs)
        const steps = () => {
          for (let d = a; d < c; d += STEP.run) {
            if (d < d0 || d >= d0 + PIECE) continue;
            const st = stepAt(d + 1e-6);
            if (!st) continue;
            const mid = (st.from + st.to) / 2;
            const p = WALK_POINTS.find((q) => q.d >= mid) ?? pts[pts.length - 1];
            const [x, z] = walkAt(mid);
            b.add(new THREE.BoxGeometry(2 * WALK.half + 0.1, st.top - st.foot, STEP.run).rotateY(Math.atan2(p.u[0], p.u[1])).translate(x, (st.top + st.foot) / 2, z), STONE);
          }
        };
        if (low) b.detail(steps);
        else steps();
        b.detail(() => {
          for (let d = s0; d <= s1 + 0.01; d += 2) {
            const [x, z] = walkAt(d, WALK.half + 0.12);
            if (!inBelvedere(x, z)) cyl(b, 0.03, 0.95, x, ground(x, z), z, IRON, 5);
          }
          // (the rail in runs: none across the Belvedere's paving, where its benches are)
          let rail: THREE.Vector3[] = [];
          const run = () => {
            if (rail.length > 1) b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), rail.length, 0.025, 4, false), IRON);
            rail = [];
          };
          for (let d = s0; d <= s1 + 0.01; d += 1) {
            const [x, z] = walkAt(d, WALK.half + 0.12);
            if (inBelvedere(x, z)) run();
            else rail.push(new THREE.Vector3(x, ground(x, z) + 0.95, z));
          }
          run();
        });
      }
      // The lamps along its right (phones every other), the benches along its left
      for (const [i, [x, z]] of WALK_LAMPS.entries()) {
        if ((low && i % 2) || !pts.some((p) => Math.hypot(p.x - x, p.z - z) < 1.5)) continue;
        const g = ground(x, z);
        cyl(b, 0.07, 0.7, x, g, z, IRON, 6);
        b.add(new THREE.SphereGeometry(0.09, 6, 4).translate(x, g + 0.76, z), LAMP);
      }
      b.detail(() => {
        for (const s of BENCHES) {
          if (!pts.some((p) => Math.hypot(p.x - s.x, p.z - s.z) < 2.2)) continue;
          const g = ground(s.x, s.z);
          b.add(new THREE.BoxGeometry(BENCH.long, 0.07, BENCH.deep).rotateY(s.yaw).translate(s.x, g + BENCH.seat - 0.035, s.z), WOOD);
          for (const k of [-0.6, 0.6]) b.add(new THREE.BoxGeometry(0.08, BENCH.seat - 0.035, 0.4).translate(k, (BENCH.seat - 0.035) / 2, 0).rotateY(s.yaw).translate(s.x, g, s.z), IRON);
        }
      });
      b.build(into, { cast: false, receive: true });
    });
  }

  /* ---------- The branch to the glasshouse's door ---------- */
  {
    const xs = GLASS_PATH.map((p) => p[0]);
    const zs = GLASS_PATH.map((p) => p[1]);
    site('crestmont walk glasshouse', [Math.min(...xs) - 2, Math.min(...zs) - 2, Math.max(...xs) + 2, Math.max(...zs) + 2], (into) => {
      const b = new Batch();
      b.add(meshGeometry(lineMesh(GLASS_PATH, WALK.half * 0.8, DRAPE.path)), GRAVEL);
      b.build(into, { cast: false, receive: true });
    });
  }

  /* ---------- The lookouts ---------- */
  for (const [k, o] of LOOKOUTS.entries())
    site(`crestmont lookout ${k}`, [o.x - 3, o.z - 3, o.x + 3, o.z + 3], (into) => {
      const b = new Batch();
      const g = ground(o.x, o.z);
      b.add(new THREE.CylinderGeometry(1.4, 1.5, 0.25, 16).translate(o.x, g + 0.02, o.z), STONE);
      // (a rail round its far half, near only on phones; a coin viewer at the front)
      const rail = () => {
        for (let i = 0; i <= 6; i++) {
          const a = Math.atan2(o.look[1], o.look[0]) - Math.PI / 2 + (i / 6) * Math.PI;
          cyl(b, 0.04, 0.95, o.x + Math.cos(a) * 1.35, g + 0.15, o.z + Math.sin(a) * 1.35, IRON, 5);
        }
      };
      if (low) b.detail(rail);
      else rail();
      cyl(b, 0.08, 1.0, o.x + o.look[0] * 0.8, g + 0.15, o.z + o.look[1] * 0.8, IRON, 8);
      box(b, o.x + o.look[0] * 0.8 - 0.14, g + 1.15, o.z + o.look[1] * 0.8 - 0.14, o.x + o.look[0] * 0.8 + 0.14, g + 1.42, o.z + o.look[1] * 0.8 + 0.14, GOLD);
      b.build(into, { cast: true, receive: true });
    });

  /* ---------- The Belvedere ---------- */
  const V = BELVEDERE;
  site('crestmont belvedere', [V.rect[0] - 1, V.rect[1] - 1, V.rect[2] + 1, V.rect[3] + 1], (into) => {
    const b = new Batch();
    // Its paved round on the ground as it is, a stone kerb round its edge; the columns from the ground to one level
    // ring; the ring; the dome, its finial
    b.add(meshGeometry(discMesh(V.x, V.z, V.r + 0.45, V.r + 0.45, DRAPE.path + 0.01)), STONE);
    const ringY = V.top;
    for (let k = 0; k < V.columns; k++) {
      const a = ((k + 0.5) / V.columns) * Math.PI * 2;
      const [x, z] = [V.x + Math.cos(a) * V.r, V.z + Math.sin(a) * V.r];
      const g = ground(x, z) - 0.1;
      cyl(b, 0.24, 0.3, x, g, z, STONE_SHADE, 8);
      cyl(b, 0.16, ringY - g - 0.3, x, g + 0.3, z, WHITE, 10, 0.19);
      b.detail(() => cyl(b, 0.24, 0.12, x, ringY - 0.12, z, STONE, 8));
      // (an uplight at each column's foot)
      b.add(new THREE.BoxGeometry(0.1, 0.05, 0.1).translate(x + Math.cos(a) * 0.35, ground(x + Math.cos(a) * 0.35, z + Math.sin(a) * 0.35) + 0.06, z + Math.sin(a) * 0.35), UPLIGHT);
    }
    b.add(new THREE.CylinderGeometry(V.r + 0.35, V.r + 0.35, 0.4, 24, 1, true).translate(V.x, ringY + 0.2, V.z), WHITE);
    b.add(new THREE.CircleGeometry(V.r + 0.35, 24).rotateX(Math.PI / 2).translate(V.x, ringY, V.z), WHITE);
    b.add(new THREE.SphereGeometry(V.r + 0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, V.dome / (V.r + 0.3), 1).translate(V.x, ringY + 0.4, V.z), COPPER);
    cyl(b, 0.05, 0.5, V.x, ringY + 0.4 + V.dome - 0.05, V.z, GOLD, 6);
    // (benches inside, along the back)
    b.detail(() => {
      for (const s of BELVEDERE_BENCHES) b.add(new THREE.BoxGeometry(BELVEDERE_BENCH.long, 0.07, BELVEDERE_BENCH.deep).rotateY(s.yaw).translate(s.x, ground(s.x, s.z) + BELVEDERE_BENCH.seat - 0.035, s.z), WOOD);
    });
    b.build(into, { cast: true, receive: true });
  });

  /* ---------- The Crestmont Glasshouse ---------- */
  const G = GLASSHOUSE;
  site('crestmont glasshouse', [G.rect[0] - 1, G.rect[1] - 1, G.rect[2] + 1, G.rect[3] + 1], (into) => {
    const b = new Batch();
    const y = G.y;
    const [hx0, hz0, hx1, hz1] = G.house;
    const { x: dx, z: dz, r: dr, h: dh } = G.dome;
    // Its garden: gravel round the house, beds either end, a fountain in front (west, to the walk)
    b.add(new THREE.PlaneGeometry(G.rect[2] - G.rect[0] - 0.4, G.rect[3] - G.rect[1] - 0.4).rotateX(-Math.PI / 2).translate((G.rect[0] + G.rect[2]) / 2, y + 0.02, (G.rect[1] + G.rect[3]) / 2), GRAVEL);
    for (const [a, c] of [
      [G.rect[1] + 0.4, hz0 - 0.6],
      [hz1 + 0.6, G.rect[3] - 0.4],
    ])
      for (let x = G.rect[0] + 0.8; x < G.rect[2] - 1; x += 2.4) box(b, x, y + 0.02, a, x + 1.8, y + 0.22, c, BED);
    // The house: a low stone plinth, the wings' glass between white ribs, their ridged roofs; the dome in the middle
    box(b, hx0, y, hz0, hx1, y + 0.4, hz1, STONE);
    const wingH = G.wingH;
    for (const [a, c] of [
      [hx0, dx - dr + 0.2],
      [dx + dr - 0.2, hx1],
    ]) {
      box(b, a + 0.05, y + 0.4, hz0 + 0.05, c - 0.05, y + wingH, hz1 - 0.05, GLASS);
      // (the ribs and the roof's ridge)
      for (let x = a; x <= c + 0.01; x += (c - a) / Math.max(2, Math.round((c - a) / 1.1))) for (const z of [hz0, hz1]) box(b, x - 0.04, y + 0.4, z - 0.04, x + 0.04, y + wingH, z + 0.04, WHITE);
      const roof = new THREE.CylinderGeometry((hz1 - hz0) / 2, (hz1 - hz0) / 2, c - a, 12, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).translate((a + c) / 2, y + wingH, (hz0 + hz1) / 2);
      b.add(roof, GLASS);
      box(b, a, y + wingH + (hz1 - hz0) / 2 - 0.05, (hz0 + hz1) / 2 - 0.05, c, y + wingH + (hz1 - hz0) / 2 + 0.05, (hz0 + hz1) / 2 + 0.05, WHITE);
    }
    cyl(b, dr, dh - dr, dx, y + 0.4, dz, GLASS, 20);
    b.add(new THREE.SphereGeometry(dr, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(dx, y + 0.4 + dh - dr, dz), GLASS);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      box(b, dx + Math.cos(a) * dr - 0.04, y + 0.4, dz + Math.sin(a) * dr - 0.04, dx + Math.cos(a) * dr + 0.04, y + 0.4 + dh - dr, dz + Math.sin(a) * dr + 0.04, WHITE);
    }
    cyl(b, 0.08, 0.6, dx, y + 0.4 + dh, dz, GOLD, 6);
    // Its door, on the west to the walk
    box(b, hx0 - 0.08, y + 0.4, dz - 0.6, hx0 + 0.02, y + 2.4, dz + 0.6, WHITE);
    // The palms and the greenery inside, seen through the glass
    b.detail(() => {
      for (const [x, z, h] of [
        [dx, dz, dh - 1],
        [hx0 + 1.2, (hz0 + hz1) / 2, wingH - 0.6],
        [hx1 - 1.2, (hz0 + hz1) / 2, wingH - 0.6],
      ]) {
        cyl(b, 0.1, h, x, y + 0.4, z, TRUNK, 6, 0.14);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          b.add(new THREE.BoxGeometry(0.9, 0.05, 0.25).translate(0.45, 0, 0).rotateZ(-0.35).rotateY(a).translate(x, y + 0.4 + h, z), PALM);
        }
      }
      if (!low) for (let x = hx0 + 0.6; x < hx1 - 0.5; x += 0.9) for (const z of [hz0 + 0.5, hz1 - 0.5]) b.add(new THREE.IcosahedronGeometry(0.32, 0).translate(x, y + 0.7, z), LEAF);
    });
    // The fountain on the garden's west side, by the walk
    const { x: fx, z: fz, r: fr } = GLASS_FOUNTAIN;
    cyl(b, fr, 0.4, fx, y, fz, STONE, 16);
    b.add(new THREE.CircleGeometry(fr - 0.12, 16).rotateX(-Math.PI / 2).translate(fx, y + 0.36, fz), WATER);
    b.build(into, { cast: true, receive: true });
  });
}
