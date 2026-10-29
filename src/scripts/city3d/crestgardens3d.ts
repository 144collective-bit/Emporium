/*
 * Crestmont's gardens drawn (the polish pass; the layout is crestgardens.ts), in Crestmont's chunk (crestmont3d.ts
 * `register()`), a site a garden (tilework.ts), each in its estate's or mansion's own frame (u along its front, v out
 * to the street, y up from its ground: a turn, never a mirror, estates3d.ts's way):
 *
 * the lawns mown in stripes; round the pool a spa spilling into its corner, umbrellas over the loungers and bollard
 * lamps; the pool houses (walls in the house's own render, brick or white, under its roof, a porch on two columns, glass
 * doors); outdoor kitchens; pergolas over dining tables, hung with bougainvillea or vines; sunken fire pits with their
 * seats; flower borders and rose beds; bird baths; benches; marble statues on plinths (a bronze knot on a modern lawn);
 * clipped cones in lead planters, urns with clipped balls, lemons in terracotta, grasses in square planters; cypresses,
 * olives and citrus trees; gazebos (eight white columns under a copper roof); a Spanish house's tiled fountain; a
 * reflecting pool; parterres of box round flowers and gravel; gravel walks; stepping stones; shrubs; and a villa
 * mansion's terraces planted as a vineyard.
 *
 * What stands is drawn at every distance in its plain shape; flowers, fruit, chairs, flames and the like near only,
 * phones leaving out the finest. Nothing new on the main thread.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { ESTATES, SLAB_Y, type Estate, type EstateStyle } from './estates';
import { MANSIONS, type Mansion, type MansionKind } from './mansions';
import { ESTATE_GARDENS, MANSION_GARDENS, SITE_GARDENS, POST, SPA_R, TERRACE_VINES, gazeboColumns, type Feat, type Garden } from './crestgardens';
import { hip, poolOf } from './estates3d';
import { DRIVE_PIER, DRIVE_PIERS, DRIVE_TREES, GROVES, MEADOWS, VINEYARDS, type Tree } from './crestland';
import { MANSIONS as HILL_HOUSES } from './mansions';
import { heightAt } from './terrain';
import { BULB, SPRAY, WATER } from './mallkit';

type Tone = EstateStyle | MansionKind;

const STONE = toon('#d9cfbb');
const STONE_SHADE = toon('#c4b99f');
const MARBLE = toon('#f2efe8');
const WHITE = toon('#f6f3ec');
const RENDER = toon('#f4efe4');
const OCHRE = toon('#e6c493');
const CREAM = toon('#efe3c6');
const BRICK = toon('#a4523f');
const TILE = toon('#c0603f');
const SLATE = toon('#4d5566');
const COPPER = toon('#5f9e8a');
const WOOD = toon('#6b4630');
const TEAK = toon('#a8743f');
const IRON = toon('#1e1d22');
const BRONZE = toon('#8a6a3e');
const LEAD = toon('#55595f');
const TERRACOTTA = toon('#c26f4a');
const CHARCOAL = toon('#34373c');
const SOIL = toon('#4e3d2f');
const GRAVEL = toon('#d8cfbd');
const PAVER = toon('#cdc4b1');
const BLUE_TILE = toon('#2f6f9e');
const BOX_GREEN = toon('#2c6a3c');
const LEAF = toon('#3f7a40');
const LEAF_DARK = toon('#25563a');
const OLIVE_LEAF = toon('#8aa073');
const CITRUS_LEAF = toon('#2f6b35');
const GRASS_TUFT = toon('#a9b36a');
const VINE = toon('#4f8a3c');
const BOULDER = toon('#8e8a84');
const CUSHION = toon('#f1ede2');
/** The lawns' mown stripes, lighter over the lots' grass; a pad's lawn in two greens */
const STRIPE = toon('#378a5d');
const PAD_LAWN = toon('#4a9550');
const PAD_STRIPE = toon('#56a45b');
const FLOWER = ['#ff5c9a', '#ffd23f', '#f7f5f0', '#b06cff', '#ff8a3d', '#e23b3b'].map((c) => toon(c));
const ROSE = ['#e23b5a', '#ff8fb0', '#f7f5f0', '#c2185b'].map((c) => toon(c));
const BOUGAINVILLEA = toon('#d0287a');
const GRAPE = toon('#5a2a6e');
const FRUIT = [toon('#f2d43c'), toon('#ff9a2e')];
const FLAME = neon('#ff8a3d', 0.9, 2.2);
const LAMP = neon('#ffe2a8', 0.25, 1.3);
/** The umbrellas' canopies, by style */
const CANOPY: Record<Tone, THREE.Material> = { spanish: toon('#f4ead2'), villa: toon('#f4ead2'), tudor: toon('#2f5d40'), georgian: toon('#1e2a55'), modern: toon('#f1f1ee'), glass: toon('#f1f1ee'), compound: toon('#f4ead2'), summit: toon('#1e2a55') };
/** A pool house's walls and roof, by style */
const HOUSE_WALL: Record<Tone, THREE.Material> = { spanish: RENDER, villa: OCHRE, tudor: CREAM, georgian: BRICK, modern: WHITE, glass: WHITE, compound: RENDER, summit: STONE };
const HOUSE_ROOF: Record<Tone, THREE.Material | null> = { spanish: TILE, villa: TILE, tudor: SLATE, georgian: SLATE, modern: null, glass: null, compound: TILE, summit: SLATE };

/** A seeded number from a garden's place, so the flowers fall the same every time */
function seeded(seed: number) {
  let s = Math.floor(seed * 9301 + 49297) % 233280 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const clump = new THREE.OctahedronGeometry(0.1, 0).scale(1, 0.8, 1);

/** A frame: local +x along its front, +y up from its ground, +z out to the street */
function frame(out: [number, number], origin: [number, number], y: number) {
  const [ox, oz] = out;
  return new THREE.Matrix4().set(oz, 0, ox, origin[0], 0, 1, 0, y, -ox, 0, oz, origin[1], 0, 0, 0, 1);
}

/** Draw one garden into its site */
function drawGarden(into: THREE.Object3D, g: Garden, M: THREE.Matrix4, low: boolean, lawnFull: boolean, seed: number, terraces?: { u: [number, number]; rows: [number, number][]; y: number }[]) {
  const b = new Batch();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material) => b.add(geo.applyMatrix4(M), m);
  const box = (u0: number, y0: number, v0: number, u1: number, y1: number, v1: number, m: THREE.Material) =>
    add(new THREE.BoxGeometry(Math.abs(u1 - u0), y1 - y0, Math.abs(v1 - v0)).translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2), m);
  const cyl = (r: number, h: number, u: number, y: number, v: number, m: THREE.Material, seg = 10, r0 = r, open = false) => add(new THREE.CylinderGeometry(r, r0, h, seg, 1, open).translate(u, y + h / 2, v), m);
  const ball = (r: number, u: number, y: number, v: number, m: THREE.Material, d = 1) => add(new THREE.IcosahedronGeometry(r, d).translate(u, y, v), m);
  const flatRect = (u0: number, v0: number, u1: number, v1: number, y: number, m: THREE.Material) => add(new THREE.PlaneGeometry(u1 - u0, v1 - v0).rotateX(-Math.PI / 2).translate((u0 + u1) / 2, y, (v0 + v1) / 2), m);
  /** A geometry built facing +z at the origin, turned to face `n` and set at (u, v) */
  const facing = (geo: THREE.BufferGeometry, u: number, v: number, n: [number, number] = [0, 1]) => geo.rotateY(Math.atan2(n[0], n[1])).translate(u, 0, v);
  const rand = seeded(seed);

  /* ---------- The lawn ---------- */
  for (const { r, row } of g.lawn) {
    if (lawnFull) flatRect(r[0], r[1], r[2], r[3], 0.025, Math.floor(row / 2) % 2 ? PAD_LAWN : PAD_STRIPE);
    else if (Math.floor(row / 2) % 2 === 0) flatRect(r[0], r[1], r[2], r[3], 0.004, STRIPE);
  }

  for (const f of g.feats) {
    const [u0, v0, u1, v1] = f.r;
    const [cu, cv] = [(u0 + u1) / 2, (v0 + v1) / 2];
    const [hu, hv] = [(u1 - u0) / 2, (v1 - v0) / 2];
    const tone = (f.tone ?? 'spanish') as Tone;
    switch (f.kind) {
      case 'spa': {
        cyl(SPA_R, 0.42, cu, 0, cv, STONE_SHADE, 16, SPA_R, true);
        add(new THREE.RingGeometry(SPA_R - 0.1, SPA_R + 0.04, 16).rotateX(-Math.PI / 2).translate(cu, 0.42, cv), STONE);
        add(new THREE.CircleGeometry(SPA_R - 0.09, 16).rotateX(-Math.PI / 2).translate(cu, 0.38, cv), poolOf(low));
        break;
      }
      case 'umbrella': {
        cyl(0.025, 2.05, cu, 0, cv, tone === 'modern' || tone === 'glass' ? CHARCOAL : TEAK, 5, 0.025, true);
        add(new THREE.ConeGeometry(0.95, 0.32, 8, 1, true).translate(cu, 2.12, cv), CANOPY[tone]);
        b.detail(() => cyl(0.08, 0.06, cu, 0, cv, CHARCOAL, 8));
        break;
      }
      case 'lamp': {
        cyl(0.055, 0.62, cu, 0, cv, IRON, 6);
        b.detail(() => ball(0.06, cu, 0.66, cv, LAMP, 0));
        break;
      }
      case 'poolhouse':
        poolHouse(f, tone);
        break;
      case 'kitchen': {
        // (a stone counter on a dark body, the grill's hood and a sink, facing the pool)
        const n = f.n ?? [1, 0];
        const [w, d] = n[0] ? [v1 - v0, u1 - u0] : [u1 - u0, v1 - v0];
        const g0 = new THREE.BoxGeometry(w, 0.85, d).translate(0, 0.425, 0);
        add(facing(g0, cu, cv, n), CHARCOAL);
        add(facing(new THREE.BoxGeometry(w + 0.06, 0.06, d + 0.06).translate(0, 0.88, 0), cu, cv, n), MARBLE);
        b.detail(() => {
          add(facing(new THREE.BoxGeometry(w * 0.4, 0.3, d * 0.6).translate(-w * 0.2, 1.06, -d * 0.1), cu, cv, n), toon('#c9ccd1'));
          if (!low) for (let k = 0; k < 2; k++) add(facing(new THREE.CylinderGeometry(0.13, 0.11, 0.62, 8).translate(-w * 0.25 + k * w * 0.5, 0.31, d / 2 + 0.35), cu, cv, n), TEAK);
        });
        break;
      }
      case 'pergola':
        pergola(f, tone);
        break;
      case 'firepit': {
        // (a paved ring, the pit, its flames; deep chairs round it)
        add(new THREE.CircleGeometry(Math.min(hu, hv), 20).rotateX(-Math.PI / 2).translate(cu, 0.009, cv), PAVER);
        cyl(0.42, 0.35, cu, 0, cv, CHARCOAL, 14, 0.42, true);
        add(new THREE.RingGeometry(0.3, 0.44, 14).rotateX(-Math.PI / 2).translate(cu, 0.35, cv), STONE_SHADE);
        add(new THREE.CircleGeometry(0.31, 14).rotateX(-Math.PI / 2).translate(cu, 0.2, cv), IRON);
        b.detail(() => {
          for (let k = 0; k < 3; k++) add(new THREE.ConeGeometry(0.09, 0.3 + (k % 2) * 0.12, 5).translate(cu + Math.cos(k * 2.1) * 0.1, 0.36, cv + Math.sin(k * 2.1) * 0.1), FLAME);
          const R = Math.min(hu, hv) - 0.3;
          for (let k = 0; k < 4; k++) {
            const a = (k * Math.PI) / 2 + Math.PI / 4;
            const [x, z] = [cu + Math.cos(a) * R, cv + Math.sin(a) * R];
            add(new THREE.BoxGeometry(0.5, 0.32, 0.45).translate(0, 0.16, 0).rotateY(-a + Math.PI / 2).translate(x, 0, z), CUSHION);
            add(new THREE.BoxGeometry(0.5, 0.36, 0.1).translate(0, 0.42, -0.2).rotateY(-a + Math.PI / 2).translate(x, 0, z), CUSHION);
          }
        });
        break;
      }
      case 'border':
      case 'roses':
      case 'shrubs': {
        // (a bed of soil, its plants in rows)
        if (f.kind !== 'shrubs') flatRect(u0, v0, u1, v1, 0.009, SOIL);
        const along = u1 - u0 >= v1 - v0;
        const L = along ? u1 - u0 : v1 - v0;
        const step = f.kind === 'shrubs' ? 0.7 : f.kind === 'roses' ? 0.45 : 0.3;
        const n = Math.max(1, Math.floor(L / step));
        const colours = f.kind === 'roses' ? ROSE : FLOWER;
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n;
          const [x, z] = along ? [u0 + t * (u1 - u0), cv] : [cu, v0 + t * (v1 - v0)];
          if (f.kind === 'shrubs') ball(0.3, x, 0.28, z, k % 2 ? LEAF : LEAF_DARK);
          else if (f.kind === 'roses') {
            ball(0.2, x, 0.3, z, LEAF_DARK, 0);
            b.detail(() => {
              for (let j = 0; j < (low ? 2 : 4); j++) add(clump.clone().translate(x + (rand() - 0.5) * 0.3, 0.42 + rand() * 0.08, z + (rand() - 0.5) * 0.25), colours[(k + j) % colours.length]);
            });
          } else
            b.detail(() => {
              ball(0.12, x, 0.12, z, LEAF, 0);
              if (!low || k % 2 === 0) add(clump.clone().translate(x + (rand() - 0.5) * 0.12, 0.22, z + (rand() - 0.5) * 0.18), colours[Math.floor(rand() * colours.length)]);
            });
        }
        break;
      }
      case 'birdbath': {
        cyl(0.15, 0.08, cu, 0, cv, STONE_SHADE, 8);
        cyl(0.07, 0.7, cu, 0.08, cv, STONE, 8, 0.1);
        cyl(0.3, 0.12, cu, 0.78, cv, STONE, 12, 0.16);
        add(new THREE.CircleGeometry(0.25, 12).rotateX(-Math.PI / 2).translate(cu, 0.905, cv), WATER);
        break;
      }
      case 'bench': {
        const n = f.n ?? [0, 1];
        const w = n[0] ? v1 - v0 : u1 - u0;
        add(facing(new THREE.BoxGeometry(w, 0.06, 0.4).translate(0, 0.44, 0), cu, cv, n), TEAK);
        add(facing(new THREE.BoxGeometry(w, 0.38, 0.05).translate(0, 0.68, -0.19), cu, cv, n), TEAK);
        for (const s of [-1, 1]) add(facing(new THREE.BoxGeometry(0.06, 0.44, 0.38).translate(s * (w / 2 - 0.08), 0.22, 0), cu, cv, n), IRON);
        break;
      }
      case 'statue': {
        box(cu - 0.3, 0, cv - 0.3, cu + 0.3, 0.12, cv + 0.3, STONE_SHADE);
        box(cu - 0.24, 0.12, cv - 0.24, cu + 0.24, 0.95, cv + 0.24, STONE);
        box(cu - 0.28, 0.95, cv - 0.28, cu + 0.28, 1.03, cv + 0.28, STONE_SHADE);
        if (tone === 'modern' || tone === 'glass') add(new THREE.TorusKnotGeometry(0.28, 0.07, low ? 32 : 56, 6).translate(cu, 1.45, cv), BRONZE);
        else {
          // (a figure in marble, draped: a made-up classical figure, no one in particular)
          cyl(0.12, 0.62, cu, 1.03, cv, MARBLE, 10, 0.2);
          cyl(0.13, 0.28, cu, 1.65, cv, MARBLE, 10, 0.12);
          ball(0.11, cu, 2.05, cv, MARBLE);
          b.detail(() => add(new THREE.CylinderGeometry(0.035, 0.04, 0.32, 6).rotateZ(0.5).translate(cu + 0.15, 1.82, cv), MARBLE));
        }
        break;
      }
      case 'cone': {
        box(cu - 0.24, 0, cv - 0.24, cu + 0.24, 0.42, cv + 0.24, LEAD);
        add(new THREE.ConeGeometry(0.24, 0.98, 10).translate(cu, 0.42 + 0.49, cv), BOX_GREEN);
        break;
      }
      case 'urn': {
        const pts = [
          [0.12, 0],
          [0.16, 0.06],
          [0.1, 0.18],
          [0.14, 0.32],
          [0.24, 0.5],
          [0.27, 0.62],
          [0.22, 0.66],
        ].map(([x, y]) => new THREE.Vector2(x, y));
        box(cu - 0.2, 0, cv - 0.2, cu + 0.2, 0.18, cv + 0.2, STONE_SHADE);
        add(new THREE.LatheGeometry(pts, low ? 8 : 12).translate(cu, 0.18, cv), STONE);
        ball(0.27, cu, 1.08, cv, BOX_GREEN);
        break;
      }
      case 'lemon': {
        cyl(0.24, 0.42, cu, 0, cv, TERRACOTTA, 10, 0.18);
        cyl(0.04, 0.45, cu, 0.4, cv, WOOD, 5, 0.04, true);
        ball(0.34, cu, 1.0, cv, CITRUS_LEAF);
        b.detail(() => {
          if (!low) for (let k = 0; k < 5; k++) add(new THREE.IcosahedronGeometry(0.045, 0).translate(cu + Math.cos(k * 1.3) * 0.3, 0.92 + (k % 3) * 0.1, cv + Math.sin(k * 1.3) * 0.3), FRUIT[0]);
        });
        break;
      }
      case 'planter': {
        box(cu - 0.27, 0, cv - 0.27, cu + 0.27, 0.5, cv + 0.27, CHARCOAL);
        flatRect(cu - 0.23, cv - 0.23, cu + 0.23, cv + 0.23, 0.5, SOIL);
        for (let k = 0; k < (low ? 3 : 6); k++) add(new THREE.ConeGeometry(0.06, 0.45 + (k % 3) * 0.08, 4, 1, true).translate(cu + Math.cos(k * 2.4) * 0.14, 0.72, cv + Math.sin(k * 2.4) * 0.14), GRASS_TUFT);
        break;
      }
      case 'cypress': {
        cyl(0.06, 0.5, cu, 0, cv, WOOD, 5, 0.07, true);
        add(new THREE.SphereGeometry(1, low ? 8 : 10, low ? 6 : 8).scale(0.32, 1.85, 0.32).translate(cu, 2.3, cv), LEAF_DARK);
        break;
      }
      case 'olive':
      case 'citrus': {
        const olive = f.kind === 'olive';
        const s = olive ? 1 : 0.62;
        // (a gnarled trunk in two leaning stems, the crown in a few soft clumps)
        add(new THREE.CylinderGeometry(0.06 * s, 0.11 * s, 1.2 * s, 6, 1, true).rotateZ(0.18).translate(cu - 0.08 * s, 0.6 * s, cv), WOOD);
        add(new THREE.CylinderGeometry(0.05 * s, 0.09 * s, 1.1 * s, 6, 1, true).rotateZ(-0.3).rotateY(1.1).translate(cu + 0.1 * s, 0.55 * s, cv + 0.05 * s), WOOD);
        const leaf = olive ? OLIVE_LEAF : CITRUS_LEAF;
        for (const [dx, dy, dz, r] of [
          [0, 1.75, 0, 0.62],
          [0.45, 1.5, 0.2, 0.45],
          [-0.4, 1.55, -0.2, 0.48],
          [0.1, 1.45, -0.45, 0.4],
        ] as [number, number, number, number][])
          ball(r * s, cu + dx * s, dy * s, cv + dz * s, leaf);
        if (!olive)
          b.detail(() => {
            if (!low) for (let k = 0; k < 6; k++) add(new THREE.IcosahedronGeometry(0.05, 0).translate(cu + Math.cos(k * 1.1) * 0.36, 0.85 + (k % 3) * 0.12, cv + Math.sin(k * 1.1) * 0.36), FRUIT[1]);
          });
        break;
      }
      case 'grass': {
        flatRect(u0, v0, u1, v1, 0.009, GRAVEL);
        const n = Math.max(2, Math.floor(((u1 - u0) * (v1 - v0)) / 0.12));
        for (let k = 0; k < (low ? Math.ceil(n / 2) : n); k++) {
          const [x, z] = [u0 + 0.12 + rand() * (u1 - u0 - 0.24), v0 + 0.1 + rand() * (v1 - v0 - 0.2)];
          add(new THREE.ConeGeometry(0.12, 0.5 + rand() * 0.25, 5, 1, true).translate(x, 0.3, z), GRASS_TUFT);
        }
        break;
      }
      case 'boulder': {
        add(new THREE.DodecahedronGeometry(0.3, 0).scale(1.1, 0.75, 0.9).rotateY(cu).translate(cu, 0.18, cv), BOULDER);
        break;
      }
      case 'gazebo':
        gazebo(f);
        break;
      case 'fountain': {
        // (an octagonal basin edged in blue tile, a bowl on a column, its jet)
        const R = Math.min(hu, hv);
        cyl(R, 0.45, cu, 0, cv, STONE, 8, R, true);
        add(new THREE.CylinderGeometry(R + 0.012, R + 0.012, 0.12, 8, 1, true).translate(cu, 0.3, cv), BLUE_TILE);
        add(new THREE.RingGeometry(R - 0.14, R + 0.02, 8).rotateX(-Math.PI / 2).rotateY(Math.PI / 8).translate(cu, 0.45, cv), STONE_SHADE);
        add(new THREE.CircleGeometry(R - 0.12, 8).rotateX(-Math.PI / 2).rotateY(Math.PI / 8).translate(cu, 0.4, cv), WATER);
        cyl(0.1, 0.65, cu, 0.35, cv, STONE_SHADE, 8);
        cyl(0.38, 0.12, cu, 1.0, cv, STONE, 12, 0.22);
        add(new THREE.CircleGeometry(0.32, 12).rotateX(-Math.PI / 2).translate(cu, 1.125, cv), WATER);
        b.detail(() => add(new THREE.ConeGeometry(0.07, 0.35, 6, 1, true).translate(cu, 1.3, cv), SPRAY));
        break;
      }
      case 'reflect': {
        box(u0, 0, v0, u1, 0.2, v0 + 0.1, STONE);
        box(u0, 0, v1 - 0.1, u1, 0.2, v1, STONE);
        box(u0, 0, v0 + 0.1, u0 + 0.1, 0.2, v1 - 0.1, STONE);
        box(u1 - 0.1, 0, v0 + 0.1, u1, 0.2, v1 - 0.1, STONE);
        flatRect(u0 + 0.1, v0 + 0.1, u1 - 0.1, v1 - 0.1, 0.16, toon('#2f5f76'));
        b.detail(() => {
          for (let k = 1; k <= 3; k++) add(new THREE.ConeGeometry(0.04, 0.3, 5, 1, true).translate(u0 + ((u1 - u0) * k) / 4, 0.3, cv), SPRAY);
        });
        break;
      }
      case 'parterre': {
        // (box hedging round it and across it in four, the quarters in flowers and gravel, a cone in the middle)
        const t = 0.14;
        const h = 0.4;
        flatRect(u0, v0, u1, v1, 0.009, GRAVEL);
        box(u0, 0, v0, u1, h, v0 + t, BOX_GREEN);
        box(u0, 0, v1 - t, u1, h, v1, BOX_GREEN);
        box(u0, 0, v0 + t, u0 + t, h, v1 - t, BOX_GREEN);
        box(u1 - t, 0, v0 + t, u1, h, v1 - t, BOX_GREEN);
        box(cu - t / 2, 0, v0 + t, cu + t / 2, h * 0.7, v1 - t, BOX_GREEN);
        box(u0 + t, 0, cv - t / 2, u1 - t, h * 0.7, cv + t / 2, BOX_GREEN);
        add(new THREE.ConeGeometry(0.2, 0.8, 8).translate(cu, 0.4 + 0.4, cv), BOX_GREEN);
        b.detail(() => {
          for (const [a, c, d, e2] of [
            [u0 + t, v0 + t, cu - t / 2, cv - t / 2],
            [cu + t / 2, cv + t / 2, u1 - t, v1 - t],
          ] as [number, number, number, number][]) {
            flatRect(a, c, d, e2, 0.014, SOIL);
            const k = Math.max(2, Math.floor(((d - a) * (e2 - c)) / 0.09));
            for (let j = 0; j < (low ? Math.ceil(k / 3) : k); j++) add(clump.clone().translate(a + 0.08 + rand() * (d - a - 0.16), 0.08, c + 0.08 + rand() * (e2 - c - 0.16)), FLOWER[(j + seed) % FLOWER.length]);
          }
        });
        break;
      }
      case 'hedge': {
        box(u0, 0, v0, u1, 0.5, v1, BOX_GREEN);
        if (u1 - u0 > 0.1 && v1 - v0 > 0.1) box(u0 + 0.03, 0.49, v0 + 0.03, u1 - 0.03, 0.56, v1 - 0.03, toon('#3a8a4e'));
        break;
      }
      case 'flag': {
        // (a white pole, a gilt ball, the city's own flag: navy with a gold band, made up)
        cyl(0.045, 4.6, cu, 0, cv, WHITE, 8, 0.06);
        ball(0.09, cu, 4.7, cv, toon('#d9a94a'));
        b.detail(() => {
          box(cu + 0.05, 3.7, cv - 0.01, cu + 1.15, 4.4, cv + 0.01, toon('#1e2a55'));
          box(cu + 0.05, 3.98, cv - 0.015, cu + 1.15, 4.12, cv + 0.015, toon('#d9a94a'));
        });
        break;
      }
      case 'putting': {
        // (a putting green: its fringe, the green, a hole with its flag)
        add(new THREE.CircleGeometry(1, 24).scale(hu, 1, hv).rotateX(-Math.PI / 2).translate(cu, 0.01, cv), toon('#5fa84b'));
        add(new THREE.CircleGeometry(1, 24).scale(hu - 0.35, 1, hv - 0.35).rotateX(-Math.PI / 2).translate(cu, 0.016, cv), toon('#82d46b'));
        add(new THREE.CircleGeometry(0.06, 8).rotateX(-Math.PI / 2).translate(cu + hu * 0.3, 0.02, cv - hv * 0.3), IRON);
        cyl(0.02, 1.4, cu + hu * 0.3, 0, cv - hv * 0.3, WHITE, 5);
        add(new THREE.BoxGeometry(0.02, 0.3, 0.45).translate(cu + hu * 0.3, 1.25, cv - hv * 0.3 + 0.23), toon('#e23b3b'));
        break;
      }
      case 'gravel':
        flatRect(u0, v0, u1, v1, 0.011, GRAVEL);
        break;
      case 'stones': {
        const along = v1 - v0 > u1 - u0;
        const L = along ? v1 - v0 : u1 - u0;
        for (let t = 0.3; t < L - 0.15; t += 0.62) {
          const [x, z] = along ? [cu + Math.sin(t * 3) * 0.06, v0 + t] : [u0 + t, cv + Math.sin(t * 3) * 0.06];
          box(x - 0.22, 0, z - 0.17, x + 0.22, 0.04, z + 0.17, PAVER);
        }
        break;
      }
    }
  }

  /* A villa mansion's terraces as a vineyard: rows of vines on posts and wires */
  if (terraces)
    for (const t of terraces)
      for (const [va, vb] of t.rows)
        for (let v = Math.max(va, vb) - 0.45; v > Math.min(va, vb) + 0.3; v -= TERRACE_VINES) {
          const [a, c] = t.u;
          box(a, t.y, v - 0.14, c, t.y + 0.62, v + 0.14, VINE);
          for (const u of [a, c]) box(u - 0.04, t.y, v - 0.04, u + 0.04, t.y + 0.9, v + 0.04, WOOD);
          b.detail(() => {
            if (!low) for (let u = a + 0.4; u < c - 0.2; u += 0.8) add(new THREE.IcosahedronGeometry(0.06, 0).translate(u, t.y + 0.4, v + 0.15), GRAPE);
          });
        }
  b.build(into, { cast: true, receive: true });

  /** A pool house: its back and sides walled, a porch under the roof on two columns, glass doors */
  function poolHouse(f: Feat, tone: Tone) {
    const [u0, v0, u1, v1] = f.r;
    const n = f.n ?? [0, 1];
    // (in its own sub-frame: w along its front, d back from it)
    const [cu, cv] = [(u0 + u1) / 2, (v0 + v1) / 2];
    const [w, d] = n[0] ? [v1 - v0, u1 - u0] : [u1 - u0, v1 - v0];
    const porch = Math.min(0.75, d * 0.35);
    const H = 2.2;
    const wall = HOUSE_WALL[tone];
    const put = (g: THREE.BufferGeometry, m: THREE.Material) => add(facing(g, cu, cv, n), m);
    const bx = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    // The body, set back behind its porch
    put(bx(-w / 2, 0, -d / 2, w / 2, H, d / 2 - porch), wall);
    // The glass doors and a window, on its front
    put(new THREE.PlaneGeometry(w * 0.45, 1.65).translate(-w * 0.12, 0.85, d / 2 - porch + 0.012), toon('#3b4c60'));
    b.detail(() => {
      put(bx(-w * 0.12 - w * 0.225 - 0.04, 0, d / 2 - porch, -w * 0.12 + w * 0.225 + 0.04, 1.72, d / 2 - porch + 0.04), tone === 'modern' || tone === 'glass' ? CHARCOAL : WHITE);
      put(new THREE.PlaneGeometry(w * 0.45, 1.6).translate(-w * 0.12, 0.85, d / 2 - porch + 0.05), toon('#3b4c60'));
      // (a towel rail and a lounger on the porch)
      put(bx(w * 0.18, 0, d / 2 - porch + 0.1, w * 0.42, 0.28, d / 2 - 0.08), CUSHION);
    });
    // The porch's columns, the roof over all
    for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.09, 0.1, H, 8).translate(s * (w / 2 - 0.15), H / 2, d / 2 - 0.15), tone === 'tudor' ? WOOD : WHITE);
    const roof = HOUSE_ROOF[tone];
    if (roof) {
      const [r, soffit] = hip(-w / 2, d / 2, w / 2, -d / 2, H, 0.8, 0.22);
      put(r, roof);
      put(soffit, tone === 'georgian' ? WHITE : WOOD);
    } else {
      put(bx(-w / 2 - 0.15, H, -d / 2 - 0.1, w / 2 + 0.15, H + 0.22, d / 2 + 0.1), WHITE);
      b.detail(() => put(bx(-w / 2 - 0.15, H - 0.02, d / 2 + 0.06, w / 2 + 0.15, H + 0.005, d / 2 + 0.11), LAMP));
    }
    b.detail(() => put(new THREE.SphereGeometry(0.07, 6, 4).translate(w * 0.22, 1.85, d / 2 - porch + 0.1), LAMP));
  }

  /** A pergola: four posts, beams and rafters, climbers over it, a dining table under it */
  function pergola(f: Feat, tone: Tone) {
    const [u0, v0, u1, v1] = f.r;
    const [cu, cv] = [(u0 + u1) / 2, (v0 + v1) / 2];
    const H = 2.2;
    const post = tone === 'spanish' || tone === 'compound' ? RENDER : TEAK;
    const m = 0.1;
    for (const [u, v] of [
      [u0 + m, v0 + m],
      [u1 - m, v0 + m],
      [u0 + m, v1 - m],
      [u1 - m, v1 - m],
    ])
      box(u - POST, 0, v - POST, u + POST, H, v + POST, post);
    for (const v of [v0 + m, v1 - m]) box(u0 - 0.1, H, v - 0.06, u1 + 0.1, H + 0.14, v + 0.06, TEAK);
    for (let u = u0 + 0.05; u <= u1 - 0.04; u += 0.36) box(u - 0.03, H + 0.14, v0 - 0.12, u + 0.03, H + 0.22, v1 + 0.12, TEAK);
    // The climbers: leafy clumps along the top, in flower for a Spanish house, grapes for a villa
    const n = Math.max(3, Math.round((u1 - u0) / 0.55));
    for (let k = 0; k < n; k++)
      for (const v of [v0 + 0.25, cv, v1 - 0.25]) {
        const u = u0 + ((k + 0.5) * (u1 - u0)) / n;
        if ((k + Math.round(v * 3)) % 3 === 2 && low) continue;
        ball(0.24, u, H + 0.28, v + (k % 2 ? 0.08 : -0.08), VINE, 0);
      }
    b.detail(() => {
      if (!low)
        for (let k = 0; k < n * 2; k++) add(clump.clone().scale(1.4, 1.2, 1.4).translate(u0 + rand() * (u1 - u0), H + 0.38 + rand() * 0.1, v0 + rand() * (v1 - v0)), tone === 'spanish' ? BOUGAINVILLEA : tone === 'villa' ? GRAPE : FLOWER[k % FLOWER.length]);
      // (climbers up two of the posts)
      for (const [u, v] of [
        [u0 + m, v0 + m],
        [u1 - m, v1 - m],
      ])
        add(new THREE.CylinderGeometry(0.05, 0.07, H - 0.2, 5, 1, true).translate(u + 0.1, H / 2, v + 0.1), VINE);
      // The table and its chairs
      const [tw, td] = [Math.min(1.4, u1 - u0 - 0.9), Math.min(0.75, v1 - v0 - 1.1)];
      if (tw > 0.5 && td > 0.35) {
        box(cu - tw / 2, 0.68, cv - td / 2, cu + tw / 2, 0.74, cv + td / 2, TEAK);
        for (const [su, sv] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ])
          box(cu + su * (tw / 2 - 0.06) - 0.03, 0, cv + sv * (td / 2 - 0.06) - 0.03, cu + su * (tw / 2 - 0.06) + 0.03, 0.68, cv + sv * (td / 2 - 0.06) + 0.03, IRON);
        const chairs = Math.max(1, Math.floor(tw / 0.6));
        for (let k = 0; k < chairs; k++)
          for (const s of [-1, 1]) {
            const u = cu - tw / 2 + ((k + 0.5) * tw) / chairs;
            const v = cv + s * (td / 2 + 0.25);
            box(u - 0.18, 0.42, v - 0.18, u + 0.18, 0.47, v + 0.18, IRON);
            box(u - 0.18, 0.47, v + s * 0.15, u + 0.18, 0.85, v + s * 0.18, IRON);
          }
        // (a lantern hung over it)
        add(new THREE.SphereGeometry(0.1, 8, 6).translate(cu, H - 0.3, cv), BULB);
      }
    });
  }

  /** A gazebo: a round stone floor, eight white columns, a frieze and a copper roof with its finial */
  function gazebo(f: Feat) {
    const [u0, v0, u1] = f.r;
    const [cu, cv] = [(u0 + u1) / 2, (f.r[1] + f.r[3]) / 2];
    const R = (u1 - u0) / 2;
    void v0;
    const H = 2.2;
    cyl(R, 0.2, cu, 0, cv, STONE, 16);
    for (const [u, v] of gazeboColumns(f)) {
      cyl(POST, H, u, 0.2, v, WHITE, 8);
      b.detail(() => {
        box(u - 0.12, 0.2, v - 0.12, u + 0.12, 0.3, v + 0.12, WHITE);
        box(u - 0.12, 0.2 + H - 0.1, v - 0.12, u + 0.12, 0.2 + H, v + 0.12, WHITE);
      });
    }
    add(new THREE.CylinderGeometry(R - 0.05, R - 0.05, 0.3, 16, 1, true).translate(cu, 0.2 + H + 0.15, cv), WHITE);
    add(new THREE.CircleGeometry(R - 0.06, 16).rotateX(Math.PI / 2).translate(cu, 0.2 + H + 0.005, cv), WHITE);
    add(new THREE.ConeGeometry(R + 0.18, 0.75, 16).translate(cu, 0.2 + H + 0.3 + 0.375, cv), COPPER);
    cyl(0.05, 0.35, cu, 0.2 + H + 1.0, cv, BRONZE, 6);
    b.detail(() => {
      // (a bench round the inside)
      add(new THREE.RingGeometry(R - 0.55, R - 0.2, 16, 1, 0.6, Math.PI * 2 - 1.2).rotateX(-Math.PI / 2).translate(cu, 0.62, cv), TEAK);
      add(new THREE.SphereGeometry(0.1, 8, 6).translate(cu, 0.2 + H - 0.2, cv), BULB);
    });
  }
}

export function registerGardens(low: boolean) {
  ESTATES.forEach((e: Estate, i) => {
    const [x0, z0, x1, z1] = e.rect;
    const out: [number, number] = e.face === 'e' ? [1, 0] : [-1, 0];
    const origin: [number, number] = [e.face === 'e' ? e.rect[2] : e.rect[0], (e.rect[1] + e.rect[3]) / 2];
    site(`crestmont garden ${e.id}`, [x0, z0, x1, z1], (into) => drawGarden(into, ESTATE_GARDENS[i], frame(out, origin, SLAB_Y), low, false, i + 1));
  });
  // The landmarks' gardens, in world numbers
  for (const { id, y, g } of SITE_GARDENS) {
    const xs = g.feats.flatMap((f) => [f.r[0], f.r[2]]);
    const zs = g.feats.flatMap((f) => [f.r[1], f.r[3]]);
    site(`crestmont garden ${id}`, [Math.min(...xs) - 1, Math.min(...zs) - 1, Math.max(...xs) + 1, Math.max(...zs) + 1], (into) => drawGarden(into, g, new THREE.Matrix4().makeTranslation(0, y, 0), low, false, id.length * 7));
  }
  MANSIONS.forEach((m: Mansion, i) => {
    const [x0, z0, x1, z1] = m.rect;
    const [ox, oz] = m.face === 'e' ? [1, 0] : m.face === 'w' ? [-1, 0] : m.face === 's' ? [0, 1] : [0, -1];
    const origin: [number, number] = m.face === 'e' ? [x1, (z0 + z1) / 2] : m.face === 'w' ? [x0, (z0 + z1) / 2] : m.face === 's' ? [(x0 + x1) / 2, z1] : [(x0 + x1) / 2, z0];
    // (a villa's terraces stepping down past its back: mansions3d.ts's, a step lower each)
    const terraces = m.terraces.map(([v0, v1], k) => ({ u: [-m.W / 2 + 1.5, m.W / 2 - 1.5] as [number, number], rows: [[v0, v1]] as [number, number][], y: -0.9 * (k + 1) + 0.006 }));
    const R = 6;
    site(`crestmont garden ${m.id}`, [x0 - R, z0 - R, x1 + R, z1 + R], (into) => drawGarden(into, MANSION_GARDENS[i], frame([ox, oz], origin, m.y), low, true, 100 + i, terraces));
  });
}

/** An olive tree at a world point: a gnarled trunk in two stems, its crown in soft clumps */
function olive(b: Batch, t: Tree) {
  const { x, z, y, s } = t;
  b.add(new THREE.CylinderGeometry(0.06 * s, 0.11 * s, 1.2 * s, 6, 1, true).rotateZ(0.18).translate(x - 0.08 * s, y + 0.6 * s, z), WOOD);
  b.add(new THREE.CylinderGeometry(0.05 * s, 0.09 * s, 1.1 * s, 6, 1, true).rotateZ(-0.3).rotateY(1.1).translate(x + 0.1 * s, y + 0.55 * s, z + 0.05 * s), WOOD);
  for (const [dx, dy, dz, r] of [
    [0, 1.75, 0, 0.62],
    [0.45, 1.5, 0.2, 0.45],
    [-0.4, 1.55, -0.2, 0.48],
    [0.1, 1.45, -0.45, 0.4],
  ] as [number, number, number, number][])
    b.add(new THREE.IcosahedronGeometry(r * s, 1).translate(x + dx * s, y + dy * s, z + dz * s), OLIVE_LEAF);
}
/** A cypress at a world point */
function cypress(b: Batch, t: Tree, low: boolean) {
  const { x, z, y, s } = t;
  b.add(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 5, 1, true).translate(x, y + 0.25, z), WOOD);
  b.add(new THREE.SphereGeometry(1, low ? 8 : 10, low ? 6 : 8).scale(0.32 * s, 1.85 * s, 0.32 * s).translate(x, y + 0.45 + 1.85 * s, z), LEAF_DARK);
}

/** The land round the houses (crestland.ts): vineyards, olive groves, wildflower meadows, the mansions' drives */
export function registerLand(low: boolean) {
  for (const [k, v] of VINEYARDS.entries())
    site(`crestmont vineyard ${k}`, v.rect, (into) => {
      const b = new Batch();
      for (const [j, row] of v.rows.entries()) {
        if (low && j % 2) continue;
        // (each row in pieces a tile long, each at its ground, its foot a little under it)
        for (let x = row.x0; x < row.x1 - 0.01; x += 1) {
          const x1 = Math.min(row.x1, x + 1);
          const y = heightAt((x + x1) / 2, row.z);
          b.box(x, y - 0.15, row.z - 0.16, x1 - x, 0.78, 0.32, VINE);
        }
        for (let x = row.x0; x <= row.x1 + 0.01; x += (row.x1 - row.x0) / Math.round((row.x1 - row.x0) / 3)) {
          const y = heightAt(x, row.z);
          b.box(x - 0.04, y - 0.1, row.z - 0.04, 0.08, 1.05, 0.08, WOOD);
        }
        b.detail(() => {
          if (!low) for (let x = row.x0 + 0.4; x < row.x1 - 0.2; x += 0.7) b.add(new THREE.IcosahedronGeometry(0.06, 0).translate(x, heightAt(x, row.z) + 0.38, row.z + (Math.round(x * 3) % 2 ? 0.17 : -0.17)), GRAPE);
        });
      }
      b.build(into, { cast: true, receive: true });
    });
  for (const [k, g] of GROVES.entries()) {
    const xs = g.map((t) => t.x);
    const zs = g.map((t) => t.z);
    site(`crestmont grove ${k}`, [Math.min(...xs) - 2, Math.min(...zs) - 2, Math.max(...xs) + 2, Math.max(...zs) + 2], (into) => {
      const b = new Batch();
      for (const t of g) olive(b, t);
      b.build(into, { cast: true, receive: true });
    });
  }
  for (const [k, m] of MEADOWS.entries())
    site(`crestmont meadow ${k}`, [m.x - m.r, m.z - m.r, m.x + m.r, m.z + m.r], (into) => {
      const b = new Batch();
      m.flowers.forEach((f, i) => {
        if (low && i % 2) return;
        b.add(clump.clone().scale(1.3, 1.3, 1.3).translate(f.x, f.y + 0.12, f.z), FLOWER[f.c]);
      });
      b.detail(() => {
        if (!low) m.flowers.forEach((f, i) => b.add(clump.clone().translate(f.x + 0.25, f.y + 0.1, f.z - 0.2), FLOWER[(f.c + i) % FLOWER.length]));
      });
      b.build(into, { cast: false, receive: true });
    });
  // The drives' cypresses and piers, a site a mansion
  for (const [k, m] of HILL_HOUSES.entries()) {
    const [a, c] = m.drive;
    const trees = DRIVE_TREES.filter((t) => near(t, a, c));
    const piers = DRIVE_PIERS.filter((t) => near(t, a, c));
    if (!trees.length && !piers.length) continue;
    site(`crestmont drive ${k}`, [Math.min(a[0], c[0]) - 3, Math.min(a[1], c[1]) - 3, Math.max(a[0], c[0]) + 3, Math.max(a[1], c[1]) + 3], (into) => {
      const b = new Batch();
      for (const t of trees) cypress(b, t, low);
      for (const p of piers) {
        const h = DRIVE_PIER.half;
        b.box(p.x - h, p.y - 0.2, p.z - h, h * 2, DRIVE_PIER.h + 0.2, h * 2, STONE);
        b.box(p.x - h - 0.05, p.y + DRIVE_PIER.h, p.z - h - 0.05, h * 2 + 0.1, 0.1, h * 2 + 0.1, STONE_SHADE);
        b.add(new THREE.SphereGeometry(0.11, 8, 6).translate(p.x, p.y + DRIVE_PIER.h + 0.27, p.z), BULB);
      }
      b.build(into, { cast: true, receive: true });
    });
  }
}
/** Along a drive (from a to c, within 2.5) */
function near(t: Tree, a: [number, number], c: [number, number]) {
  const [vx, vz] = [c[0] - a[0], c[1] - a[1]];
  const s = Math.max(0, Math.min(1, ((t.x - a[0]) * vx + (t.z - a[1]) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(t.x - a[0] - vx * s, t.z - a[1] - vz * s) < 2.5;
}
