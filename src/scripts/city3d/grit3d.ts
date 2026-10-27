/*
 * The Trenches' grit on screen (the numbers are grit.ts): each yard's worn
 * patches, tree pits, dumpsters and trash, the boombox corners by the
 * walk-ups, the jersey barriers behind Bottom Street, the rows' shuttered
 * shops and the bills and tags on the el's pillars, all as sites
 * (tilework.ts); the yards' trees and the people round the boombox at the
 * boot. Tags and posters (grime.ts) are near only, in the FX layer; on phones
 * fewer bags and no grates' bars.
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { INK, METAL, frameOf, kit, soft } from './infill';
import { SLAB as S, addTree, flatPoly } from './world';
import { site } from './tilework';
import { SHOP_H, type Infill, type Pt, type Rect } from './downtown';
import { ROW_BLOCKS, rows } from './projects';
import { PILLAR_HALF } from './metro';
import { BARRIERS, BOOMBOXES, CAR_PARKS, DUMPSTER, DUMPSTERS, EL_PILLARS, JERSEY, PATCHES, PIT, PLINTH, TRASH, YARDS, YARD_TREES, barrierRect, shuttered, type Dumpster } from './grit';
import { buildFx, poster, tag } from './grime';
import { TENEMENTS } from './streetwall';
import type { Lot } from './kits';
import type { Idle } from './landmarks';

const PATCH = { grass: toon('#5f7f3f'), dirt: toon('#6b5848'), lawn: toon('#4c7d47') };
const SOIL = toon('#3b2f2a');
const BAGS = ['#1b1a22', '#22262a', '#2e3a2c', '#1b1a22', '#cfcad8'].map((c) => toon(c));
const DUMPSTER_PAINT = ['#2f6b4a', '#2b4f7a', '#3d3a4a'].map((c) => toon(c));
const LID = toon('#1d1b24');
const JERSEY_CONCRETE = toon('#a39fb3');
const SHUTTER = toon('#77748a');
const SHUTTER_LINE = toon('#5a576c');

const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(Math.min(x0, x1), y0, Math.min(z0, z1), Math.abs(x1 - x0), y1 - y0, Math.abs(z1 - z0), mat);
const hash = (a: number, b: number) => {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
};
const inRect = (x: number, z: number, [x0, z0, x1, z1]: Rect) => x >= x0 && x <= x1 && z >= z0 && z <= z1;

/** A tree pit: the soil, a steel frame round it, the grate's bars near */
function pit(b: Batch, x: number, z: number, low: boolean) {
  b.add(new THREE.PlaneGeometry(PIT * 2, PIT * 2).rotateX(-Math.PI / 2).translate(x, S + 0.008, z), SOIL);
  const t = 0.05;
  box(b, x - PIT, S, z - PIT, x + PIT, S + 0.02, z - PIT + t, METAL);
  box(b, x - PIT, S, z + PIT - t, x + PIT, S + 0.02, z + PIT, METAL);
  box(b, x - PIT, S, z - PIT + t, x - PIT + t, S + 0.02, z + PIT - t, METAL);
  box(b, x + PIT - t, S, z - PIT + t, x + PIT, S + 0.02, z + PIT - t, METAL);
  if (!low) b.detail(() => {
    for (const d of [-0.2, 0.2]) {
      box(b, x + d - 0.015, S, z - PIT + t, x + d + 0.015, S + 0.015, z - 0.18, METAL);
      box(b, x + d - 0.015, S, z + 0.18, x + d + 0.015, S + 0.015, z + PIT - t, METAL);
    }
  });
}

/** A dumpster against its wall: the body in its paint, black lids, the pockets and casters near; a tag on its front */
function dumpster(b: Batch, fxb: Batch, d: Dumpster) {
  const [x0, z0, x1, z1] = d.rect;
  const paint = DUMPSTER_PAINT[Math.floor(hash(x0, z0) * DUMPSTER_PAINT.length)];
  box(b, x0, S + 0.1, z0, x1, S + 0.88, z1, paint);
  // The lids, one propped a little open on some
  const along: Pt = d.n[0] ? [0, 1] : [1, 0];
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  box(b, x0 - 0.02, S + 0.88, z0 - 0.02, x1 + 0.02, S + 0.95, z1 + 0.02, LID);
  b.detail(() => {
    // Forklift pockets along the sides, casters under the corners
    for (const s of [-1, 1]) {
      const [px, pz] = [cx + along[0] * s * 0.45, cz + along[1] * s * 0.45];
      const [hx, hz] = d.n[0] ? [DUMPSTER.d / 2 + 0.03, 0.12] : [0.12, DUMPSTER.d / 2 + 0.03];
      box(b, px - hx, S + 0.45, pz - hz, px + hx, S + 0.58, pz + hz, LID);
    }
    for (const [ux, uz] of [
      [x0 + 0.12, z0 + 0.12],
      [x1 - 0.12, z0 + 0.12],
      [x0 + 0.12, z1 - 0.12],
      [x1 - 0.12, z1 - 0.12],
    ])
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8).rotateZ(Math.PI / 2).translate(ux, S + 0.06, uz), INK);
  });
  // A tag on the front (the side away from the wall)
  const [fx, fz] = d.n[0] ? [d.n[0] > 0 ? x1 : x0, cz] : [cx, d.n[1] > 0 ? z1 : z0];
  tag(fxb, Math.floor(hash(cx, cz) * 12), 1.1, d.n, fx + d.n[0] * 0.006, S + 0.5, fz + d.n[1] * 0.006);
}

/** A pile of bags (near only: little dark lumps) */
function trash(b: Batch, x: number, z: number, n: number, r: number, low: boolean) {
  b.detail(() => {
    const k = low ? Math.min(2, n) : n;
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2 + hash(x, i);
      const d = i === 0 ? 0 : r * (0.5 + hash(z, i) * 0.5);
      const s = 0.17 + hash(x + i, z) * 0.08;
      b.add(new THREE.IcosahedronGeometry(s, 0).scale(1, 0.8, 1).translate(x + Math.cos(a) * d, S + s * 0.7 + (i > 3 ? 0.18 : 0), z + Math.sin(a) * d), BAGS[(((i + Math.floor(x)) % BAGS.length) + BAGS.length) % BAGS.length]);
    }
  });
}

/** The jersey barrier's end on: a wide foot sloping in to a narrow top */
const JERSEY_SHAPE = (() => {
  const s = new THREE.Shape();
  const w = JERSEY.w / 2;
  const h = JERSEY.h;
  s.moveTo(-w, 0);
  s.lineTo(w, 0);
  s.lineTo(w, 0.07);
  s.lineTo(w * 0.62, 0.2);
  s.lineTo(w * 0.3, h);
  s.lineTo(-w * 0.3, h);
  s.lineTo(-w * 0.62, 0.2);
  s.lineTo(-w, 0.07);
  s.closePath();
  return s;
})();

/** A folding chair, the sitter facing `ry` */
function chair(b: Batch, x: number, z: number, ry: number, paint: THREE.Material) {
  const g = (w: number, h: number, d: number, px: number, py: number, pz: number) => new THREE.BoxGeometry(w, h, d).translate(px, py + h / 2, pz).rotateY(ry).translate(x, S, z);
  b.add(g(0.42, 0.04, 0.4, 0, 0.38, 0), paint);
  b.add(g(0.42, 0.34, 0.04, 0, 0.5, -0.2), paint);
  for (const sx of [-0.19, 0.19]) {
    b.add(g(0.03, 0.4, 0.03, sx, 0, 0.17), METAL);
    b.add(g(0.03, 0.82, 0.03, sx, 0, -0.2), METAL);
  }
}

export function buildGrit(scene: THREE.Scene, crowd: Idle[], opts: { low: boolean }) {
  const low = opts.low;
  void scene;
  // Each yard: its worn patches, tree pits, dumpsters, trash, boombox corner
  for (const blk of YARDS) {
    const xs = blk.poly.map((p) => p[0]);
    const zs = blk.poly.map((p) => p[1]);
    const rect: Rect = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
    site(`trench yard ${blk.id}`, rect, (into) => {
      const b = new Batch();
      const fxb = new Batch();
      fxb.lod = 'near';
      for (const p of PATCHES.filter((o) => o.block === blk.id)) b.add(flatPoly(p.poly, S + 0.008), PATCH[p.kind]);
      for (const t of YARD_TREES.filter((o) => o.block === blk.id && o.pit)) pit(b, t.x, t.z, low);
      for (const d of DUMPSTERS.filter((o) => inRect((o.rect[0] + o.rect[2]) / 2, (o.rect[1] + o.rect[3]) / 2, rect))) dumpster(b, fxb, d);
      for (const t of TRASH.filter((o) => inRect(o.x, o.z, rect))) trash(b, t.x, t.z, t.n, t.r, low);
      for (const bx of BOOMBOXES.filter((o) => inRect(o.x, o.z, rect))) {
        // The box: speakers either side of a tape deck, a handle; folding chairs
        const g = (w: number, h: number, d: number, px: number, py: number, pz: number) => new THREE.BoxGeometry(w, h, d).translate(px, py, pz).rotateY(bx.ry).translate(bx.x, S, bx.z);
        b.add(g(0.56, 0.3, 0.16, 0, 0.15, 0), toon('#2a2838'));
        b.detail(() => {
          for (const sx of [-0.17, 0.17]) b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12).rotateX(Math.PI / 2).translate(sx, 0.15, 0.085).rotateY(bx.ry).translate(bx.x, S, bx.z), INK);
          b.add(g(0.12, 0.06, 0.02, 0, 0.2, 0.085), soft('#00eaff'));
          b.add(g(0.4, 0.03, 0.03, 0, 0.36, 0), METAL);
          // A cooler by it
          b.add(g(0.36, 0.28, 0.26, 0.55, 0.14, 0.05), toon('#e23b3b'));
          b.add(g(0.38, 0.05, 0.28, 0.55, 0.3, 0.05), toon('#f3f2f7'));
        });
        bx.chairs.forEach(([x, z, ry], i) => chair(b, x, z, ry, toon(i ? '#2aabee' : '#1fbf6b')));
      }
      b.build(into);
      buildFx(fxb, into);
    });
  }
  // The yards' trees (pits or patches of grass) and the people round the boombox
  for (const t of YARD_TREES) addTree(t.x, t.z, t.s, false);
  for (const bx of BOOMBOXES) {
    for (const [x, z, ry] of bx.chairs) crowd.push({ x, z, ry, act: 'lounge', y: S + 0.42 });
    for (const [x, z, ry] of bx.standing) crowd.push({ x, z, ry, act: 'chat' });
  }

  // The jersey barriers along the back of Bottom Street's car parks, some tagged
  for (const cp of CAR_PARKS) {
    const mine = BARRIERS.filter((j) => j.x > cp[0] - 1 && j.x < cp[2] + 1 && Math.abs(j.z - (cp[3] + 0.45)) < 0.01);
    if (!mine.length) continue;
    site(`trench barriers ${cp[0]}`, [cp[0] - 1, cp[3], cp[2] + 1, cp[3] + 1], (into) => {
      const b = new Batch();
      const fxb = new Batch();
      fxb.lod = 'near';
      mine.forEach((j, i) => {
        const g = new THREE.ExtrudeGeometry(JERSEY_SHAPE, { depth: JERSEY.l, bevelEnabled: false }).translate(0, 0, -JERSEY.l / 2);
        if (j.alongX) g.rotateY(Math.PI / 2);
        b.add(g.translate(j.x, S, j.z), JERSEY_CONCRETE);
        if (hash(j.x, j.z) < 0.45) {
          // A tag on its car park side, on the upper slope (leaning back with it, a hair off it)
          const [, z0] = barrierRect(j);
          const slope = Math.atan2(JERSEY.w * (0.31 - 0.15), JERSEY.h - 0.2);
          const at = 0.36;
          const half = JERSEY.w * 0.31 - ((at - 0.2) / (JERSEY.h - 0.2)) * JERSEY.w * 0.16;
          tag(fxb, i + 2, 0.85, [0, -1], j.x, S + at, z0 + JERSEY.w / 2 - half - 0.008, slope);
        }
      });
      b.build(into);
      buildFx(fxb, into);
    });
  }

  // The rows' and the street walls' shuttered shops: the roller shutter down over the front, its housing, tags on some
  const laid = rows();
  const groups = [
    ...ROW_BLOCKS.map((blk, i) => ({ id: blk.id, lots: laid.byBlock[i].lots as Lot[] })),
    ...[...new Set(TENEMENTS.map((t) => t.block))].map((id) => ({ id: `${id} walls`, lots: TENEMENTS.filter((t) => t.block === id) as Lot[] })),
  ];
  groups.forEach(({ id, lots }) => {
    const shut = lots.filter(shuttered);
    if (!shut.length) return;
    const xs = shut.flatMap((o) => [o.box[0], o.box[2]]);
    const zs = shut.flatMap((o) => [o.box[1], o.box[3]]);
    site(`trench shutters ${id}`, [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], (into) => {
      const b = new Batch();
      const fxb = new Batch();
      fxb.lod = 'near';
      for (const o of shut) {
        const F = frameOf(o as unknown as Infill);
        const k = kit(b, F);
        const w = F.w;
        k.all(() => {
          k.lbox(0.06, w - 0.06, S, S + SHOP_H - 0.24, 0.012, 0.045, SHUTTER);
          k.lbox(0.02, w - 0.02, S + SHOP_H - 0.24, S + SHOP_H - 0.12, 0, 0.1, METAL);
        });
        b.detail(() => {
          for (let y = S + 0.14; y < S + SHOP_H - 0.3; y += 0.14) k.lbox(0.06, w - 0.06, y, y + 0.02, 0.045, 0.051, SHUTTER_LINE);
        });
        // A tag or two across it, a bill on the side
        const n = F.n;
        const at = (u: number): Pt => [F.L[0] + F.t[0] * u + n[0] * 0.057, F.L[1] + F.t[1] * u + n[1] * 0.057];
        const [tx, tz] = at(w * (0.3 + hash(o.seed, 1) * 0.4));
        tag(fxb, o.seed, Math.min(1.4, w - 0.4), n, tx, S + 0.55, tz);
        if (hash(o.seed, 2) < 0.5) {
          const [px, pz] = at(w - 0.4);
          poster(fxb, o.seed, 0.8, n, px, S + 0.62, pz);
        }
      }
      b.build(into);
      buildFx(fxb, into);
    });
  });

  // Bills and tags on the el's pillars, a few per pillar on its faces
  EL_PILLARS.forEach((p, i) => {
    const [x, z] = p.at;
    site(`trench el pillar ${i}`, [x - 1, z - 1, x + 1, z + 1], (into) => {
      const fxb = new Batch();
      fxb.lod = 'near';
      const faces: Pt[] = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];
      faces.forEach((n, k) => {
        const h = hash(i, k);
        const out = PLINTH.half + 0.006;
        const [fx, fz] = [x + n[0] * out, z + n[1] * out];
        // A tag on the plinth on most faces, a bill or two higher up on the steel on some
        if (h < 0.7) tag(fxb, i * 4 + k, 0.5, n, fx, S + 0.5, fz);
        if (h > 0.35) {
          // (on the steel: its flanges' face along the track, the web's across it)
          const so = (n[0] ? PILLAR_HALF : PILLAR_HALF - 0.03) + 0.006;
          poster(fxb, i + k, 0.62, n, x + n[0] * so, S + 1.35 + (h > 0.8 ? 0.4 : 0), z + n[1] * so);
        }
      });
      buildFx(fxb, into);
    });
  });
}
