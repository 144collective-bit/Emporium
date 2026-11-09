/*
 * The common between Endswood and Lot 9 drawn (docs/estate-plan.md Phase 6; the data is endsblend.ts), in Endswood's
 * chunk as sites: the desire line's worn dirt, the ditch (dark water between muddy banks, rushes along it, a plank
 * bridge where the footpath crosses), the fly-tipping, the estate's old chain-link (standing, leaning over, flat on
 * the grass: its mesh in the FX layer), brambles. Phones leave out the rushes and the finer bits.
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { site } from './tilework';
import { CHAIN as CHAIN_MAT, buildFx, chainMesh, tag } from './grime';
import { COVER } from './palette';
import { BRAMBLES, CHAIN, CHAIN_RUNS, CHAIN_Z, COMMON, DESIRE, DESIRE_HALF, DITCH, DITCH_LINE, PLANK, TIPPED, TIP_SIZE, type Tip } from './endsblend';
import type { Pt } from './endswood';

/** The ground's height on the open land (walk.ts), the worn dirt a hair over it */
const Y = 0.035;
const DIRT = toon(COVER.bare);
const MUD = toon('#4a3f33');
const WATER = toon('#2c3a33');
const RUSH = toon('#5f7a3a');
const PLANKS = toon('#6f5a40');
const STEEL = toon('#8d91a0');
const RUST = toon('#7a4a2e');
const BRAMBLE = toon('#2f4a2a');
const BERRY = toon('#3a1f3a');
const TICKING = toon('#d8d0b8');
const STAIN = toon('#a6946a');
const SCORCH = toon('#1f1d22');
const BURNT = toon('#2c2a2e');
const SOFA = toon('#5a4a3a');
const WHITE_GOODS = toon('#d9dbe0');
const BIN_BAG = toon('#17161c');
const TYRE = toon('#202024');

/** A flat strip from a to c, `half` either side, at y */
function strip(b: Batch, a: Pt, c: Pt, half: number, y: number, m: THREE.Material) {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (l < 1e-3) return;
  b.add(
    new THREE.PlaneGeometry(l + half * 0.6, half * 2)
      .rotateX(-Math.PI / 2)
      .rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]))
      .translate((a[0] + c[0]) / 2, y, (a[1] + c[1]) / 2),
    m
  );
}
/** A box turned to yaw (its length along yaw's x), its foot at y */
function yawBox(b: Batch, x: number, z: number, yaw: number, l: number, h: number, w: number, y: number, m: THREE.Material, tilt = 0) {
  b.add(new THREE.BoxGeometry(l, h, w).rotateZ(tilt).translate(0, h / 2, 0).rotateY(yaw).translate(x, y, z), m);
}
/** The point `along` its length and `across` it from a tip's middle */
const off = (t: Tip, along: number, across: number): Pt => [t.x + Math.cos(t.yaw) * along + Math.sin(t.yaw) * across, t.z - Math.sin(t.yaw) * along + Math.cos(t.yaw) * across];

function tipped(b: Batch, t: Tip, low: boolean) {
  const s = TIP_SIZE[t.kind];
  if (t.kind === 'mattress') {
    yawBox(b, t.x, t.z, t.yaw, s.l, s.h, s.w, Y, TICKING, 0.06);
    const [sx, sz] = off(t, 0.3, -0.2);
    b.add(new THREE.CircleGeometry(0.28, 8).rotateX(-Math.PI / 2).translate(sx, Y + s.h + 0.06, sz), STAIN);
  } else if (t.kind === 'moped') {
    // Burnt out, on its side: the scorch on the grass under it, a black frame, two bare rims
    b.add(new THREE.CircleGeometry(1.3, 10).rotateX(-Math.PI / 2).translate(t.x, Y + 0.004, t.z), SCORCH);
    yawBox(b, t.x, t.z, t.yaw, 1.2, 0.3, 0.35, Y + 0.05, BURNT);
    for (const a of [-0.62, 0.62]) {
      const [x, z] = off(t, a, 0.1);
      b.add(new THREE.TorusGeometry(0.24, 0.035, 4, low ? 8 : 12).rotateX(Math.PI / 2).translate(x, Y + 0.05, z), RUST);
    }
    const [hx, hz] = off(t, 0.55, -0.35);
    yawBox(b, hx, hz, t.yaw + 1.2, 0.7, 0.05, 0.05, Y + 0.18, BURNT);
  } else if (t.kind === 'trolley') {
    // On its side: the basket's frame as bars, its wheels in the air
    const [l, w, h] = [s.l, s.w, s.h];
    for (const [a, c] of [
      [-l / 2, -w / 2],
      [l / 2, -w / 2],
      [-l / 2, w / 2],
      [l / 2, w / 2],
    ]) {
      const [x, z] = off(t, a * 0.95, c * 0.95);
      b.add(new THREE.CylinderGeometry(0.02, 0.02, h, 4, 1, true).translate(x, Y + h / 2, z), STEEL);
    }
    for (const y of [0.04, h / 2, h - 0.02]) {
      yawBox(b, ...off(t, 0, -w / 2), t.yaw, l, 0.025, 0.025, Y + y, STEEL);
      yawBox(b, ...off(t, 0, w / 2), t.yaw, l, 0.025, 0.025, Y + y, STEEL);
      yawBox(b, ...off(t, -l / 2, 0), t.yaw, 0.025, 0.025, w, Y + y, STEEL);
    }
    if (!low)
      for (const c of [-w / 3, w / 3]) {
        const [x, z] = off(t, l / 2 + 0.08, c);
        b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8).rotateZ(Math.PI / 2).rotateY(t.yaw).translate(x, Y + 0.35, z), TYRE);
      }
  } else if (t.kind === 'sofa') {
    yawBox(b, t.x, t.z, t.yaw, s.l, 0.38, s.w, Y, SOFA);
    yawBox(b, ...off(t, 0, -s.w / 2 + 0.12), t.yaw, s.l, 0.4, 0.24, Y + 0.38, SOFA);
    for (const a of [-s.l / 2 + 0.11, s.l / 2 - 0.11]) yawBox(b, ...off(t, a, 0.05), t.yaw, 0.22, 0.22, s.w - 0.1, Y + 0.38, SOFA);
    // (a cushion gone, its seat torn)
    yawBox(b, ...off(t, 0.4, 0.1), t.yaw, 0.6, 0.02, 0.4, Y + 0.38, STAIN);
  } else if (t.kind === 'fridge') {
    yawBox(b, t.x, t.z, t.yaw, s.l, s.h, s.w, Y, WHITE_GOODS);
    // (its door hanging open off one side)
    const [dx, dz] = off(t, 0.1, s.w / 2 + 0.25);
    yawBox(b, dx, dz, t.yaw, s.l * 0.6, 0.05, 0.5, Y + s.h - 0.05, WHITE_GOODS, 0);
  } else if (t.kind === 'bags') {
    const n = low ? 3 : 5;
    for (let k = 0; k < n; k++) {
      const [x, z] = off(t, ((k % 3) - 1) * 0.42, (Math.floor(k / 3) - 0.3) * 0.45);
      b.add(new THREE.IcosahedronGeometry(0.24 + (k % 2) * 0.05, 0).scale(1, 0.8, 1.1).translate(x, Y + 0.2, z), BIN_BAG);
    }
  } else {
    // Tyres: a stack and one leaning on it
    for (let k = 0; k < 3; k++) b.add(new THREE.TorusGeometry(0.4, 0.13, 5, low ? 10 : 14).rotateX(Math.PI / 2).translate(t.x - 0.1, Y + 0.13 + k * 0.25, t.z), TYRE);
    b.add(new THREE.TorusGeometry(0.4, 0.13, 5, low ? 10 : 14).rotateY(0.3).rotateZ(0.25).translate(t.x + 0.55, Y + 0.42, t.z + 0.15), TYRE);
  }
}

/** A run of the old chain-link: its posts, its mesh standing, leaning over (its posts tipped, the top sagging) or flat
 * on the grass */
function chain(b: Batch, fx: Batch, r: (typeof CHAIN_RUNS)[number], k: number) {
  const n = Math.max(1, Math.round((r.x1 - r.x0) / CHAIN.post));
  const pts: Pt[] = Array.from({ length: n + 1 }, (_, i) => {
    const x = r.x0 + ((r.x1 - r.x0) * i) / n;
    return [x, CHAIN_Z(x)];
  });
  if (r.state === 'up') {
    for (const [x, z] of pts) b.add(new THREE.CylinderGeometry(0.035, 0.035, CHAIN.h, 5, 1, true).translate(x, Y + CHAIN.h / 2, z), STEEL);
    for (let i = 1; i < pts.length; i++) chainMesh(fx, pts[i - 1], pts[i], Y, CHAIN.h - 0.05);
    // (tagged on the mesh's posts' side: a tag on the run's middle)
    const m = pts[Math.floor(pts.length / 2)];
    tag(fx, 3 + k, 0.8, [0, -1], m[0], Y + 0.8, m[1] - 0.02);
    return;
  }
  const lean = r.state === 'lean' ? 0.55 : Math.PI / 2 - 0.03;
  // (leaning south, away from the estate: everyone pushed it that way)
  for (const [x, z] of pts) {
    const h = r.state === 'lean' ? CHAIN.h : 0.4;
    b.add(new THREE.CylinderGeometry(0.035, 0.035, h, 5, 1, true).translate(0, h / 2, 0).rotateX(r.state === 'lean' ? lean : 0.2).translate(x, Y, z), r.state === 'lean' ? STEEL : RUST);
  }
  for (let i = 1; i < pts.length; i++) {
    const [a, c] = [pts[i - 1], pts[i]];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const h = CHAIN.h - 0.1;
    const g = new THREE.PlaneGeometry(len, h);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * len * 3, uv.getY(j) * h * 3);
    // (stood on its bottom edge, tipped over about it, then along the run)
    g.translate(0, h / 2, 0)
      .rotateX(lean)
      .rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]))
      .translate((a[0] + c[0]) / 2, Y + (r.state === 'down' ? 0.02 : 0), (a[1] + c[1]) / 2);
    fx.add(g, CHAIN_MAT);
  }
}

export function registerBlend(low: boolean) {
  // The desire line's worn dirt (a site: short)
  site('ends common desire', [Math.min(...DESIRE.map((p) => p[0])) - 1, Math.min(...DESIRE.map((p) => p[1])) - 1, Math.max(...DESIRE.map((p) => p[0])) + 1, Math.max(...DESIRE.map((p) => p[1])) + 1], (into) => {
    const b = new Batch();
    for (let i = 1; i < DESIRE.length; i++) strip(b, DESIRE[i - 1], DESIRE[i], DESIRE_HALF, Y + 0.0025, DIRT);
    b.build(into, { cast: false, receive: true });
  });
  // The ditch, a few stretches a site: the water, a band of mud either side, low banks with rushes, the plank bridge
  const RUN = 5;
  for (let i0 = 0, k = 0; i0 < DITCH_LINE.length - 1; i0 += RUN, k++) {
    const pts = DITCH_LINE.slice(i0, Math.min(DITCH_LINE.length, i0 + RUN + 1));
    site(`ends common ditch ${k}`, [pts[0][0] - 1, Math.min(...pts.map((p) => p[1])) - 2, pts[pts.length - 1][0] + 1, Math.max(...pts.map((p) => p[1])) + 2], (into) => {
      const b = new Batch();
      const h = DITCH.half;
      for (let i = 1; i < pts.length; i++) {
        const [a, c] = [pts[i - 1], pts[i]];
        strip(b, a, c, h + 0.35, Y + 0.002, MUD);
        strip(b, a, c, h - 0.12, Y + 0.006, WATER);
        const atPlank = Math.abs((a[0] + c[0]) / 2 - PLANK.x) < 2;
        if (atPlank) continue;
        // (the banks: low mounds of earth either side)
        for (const side of [-1, 1]) {
          const o = side * (h + 0.05);
          b.add(
            new THREE.CylinderGeometry(0.16, 0.16, Math.hypot(c[0] - a[0], c[1] - a[1]) + 0.1, 5, 1, true)
              .rotateZ(Math.PI / 2)
              .scale(1, 0.8, 1)
              .rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]))
              .translate((a[0] + c[0]) / 2, Y, (a[1] + c[1]) / 2 + o),
            MUD
          );
        }
        b.detail(() => {
          if (low) return;
          for (let u = 0.3; u < 1; u += 0.35) {
            const [x, z] = [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u];
            const side = (Math.round(x * 3) % 2 === 0 ? 1 : -1) * (h - 0.05);
            b.add(new THREE.ConeGeometry(0.12, 0.6, 4, 1, true).translate(x, Y + 0.3, z + side), RUSH);
          }
        });
      }
      if (PLANK.x >= pts[0][0] && PLANK.x <= pts[pts.length - 1][0]) {
        // Two scaffold boards side by side across the water, a breeze block under each end
        for (const dx of [-0.17, 0.17]) b.box(PLANK.x + dx - 0.15, Y + 0.12, PLANK.z - PLANK.len / 2, 0.3, 0.05, PLANK.len, PLANKS);
        for (const s of [-1, 1]) b.box(PLANK.x - 0.3, Y, PLANK.z + s * (PLANK.len / 2 - 0.25) - 0.15, 0.6, 0.12, 0.3, toon('#8a8794'));
      }
      b.build(into, { cast: true, receive: true });
    });
  }
  // The fly-tipping and the brambles, a site each (small)
  TIPPED.forEach((t, i) =>
    site(`ends common tipped ${i}`, [t.x - 2, t.z - 2, t.x + 2, t.z + 2], (into) => {
      const b = new Batch();
      tipped(b, t, low);
      b.build(into, { cast: true, receive: true });
    })
  );
  site('ends common brambles', [COMMON[0], COMMON[1], COMMON[2], COMMON[3]], (into) => {
    const b = new Batch();
    BRAMBLES.forEach(([x, z, r], i) => {
      const n = low ? 3 : 5;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + i;
        const [px, pz] = [x + Math.cos(a) * r * 0.45, z + Math.sin(a) * r * 0.45];
        b.add(new THREE.IcosahedronGeometry(r * 0.5, 0).scale(1, 0.55, 1).translate(px, Y + r * 0.22, pz), BRAMBLE);
      }
      b.detail(() => {
        if (low) return;
        for (let k = 0; k < 6; k++) b.add(new THREE.IcosahedronGeometry(0.05, 0).translate(x + Math.cos(k * 2.1) * r * 0.6, Y + r * 0.42, z + Math.sin(k * 2.1) * r * 0.6), BERRY);
      });
    });
    b.build(into, { cast: true, receive: true });
  });
  // The old chain-link, a run a site
  CHAIN_RUNS.forEach((r, k) =>
    site(`ends common chain ${k}`, [r.x0 - 1, CHAIN_Z(r.x0) - 2, r.x1 + 1, CHAIN_Z(r.x0) + 2], (into) => {
      const b = new Batch();
      const fx = new Batch();
      chain(b, fx, r, k);
      b.build(into, { cast: true, receive: true });
      buildFx(fx, into);
    })
  );
}
