/*
 * The Trenches' buildings on screen, step 2 (docs/growth-plan.md Phase 9;
 * the numbers are projects.ts): the Trench Houses' towers, their lawns and
 * paths, and the brownstone rows, each a site (tilework.ts), built as you go.
 *
 * - **A tower**: walls from the wall atlas's brick band (its windows lit at
 *   night, like downtown's), a stone string course and cornice, the roof
 *   slab tucked inside a parapet, the stair and lift house and a water tank
 *   on the roof, and at its door a canopy on posts with lamps and its
 *   number (one small atlas, `NUMBERS`). The towers along Trench Avenue
 *   carry a mural on the arm facing it (`MURALS`: made-up names only).
 *   Walls, roof and parapet at every distance; the rest near only.
 * - **Its lawn**: a path from each door out to the sidewalk, benches by it,
 *   a lamp; trees round the lawn (the city's trees and lamps, placed at the
 *   boot).
 * - **The rows**: the kits' brownstones and shops (kits3d.ts), their alleys
 *   with bollards; behind Bottom Street's row, a car park and a line of
 *   trees along the highway.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, lit, roundRect, toon } from './kit';
import { ATLAS, INK, METAL, ROOF, STONE, CREAM, acUnit, glow, kit, tank, type Frame } from './infill';
import { drawLot } from './kits3d';
import { SLAB as S, addLamp, addTree } from './world';
import { site } from './tilework';
import { TOWERS, ROW_BLOCKS, rows, type Tower } from './projects';
import { RECIPES, rng } from './recipes';
import { TRENCH_BLOCKS } from './trenches';
import type { Pt, Rect } from './downtown';

/** Drawing in world numbers (a kit in the identity frame: u is x, v is z) */
const WORLD: Frame = { M: new THREE.Matrix4(), w: 0, d: 0, L: [0, 0], t: [1, 0], n: [0, 1] };

/** The towers' numbers, one row each: "TRENCH HOUSES · 7" in white on the city's green */
const NUMBERS = (() => {
  const n = TOWERS.length;
  const W = 512;
  const H = 64;
  const tex = canvasTex(W, H * n, (c) => {
    for (let i = 0; i < n; i++) {
      const y = i * H;
      c.fillStyle = '#1f5a46';
      c.fillRect(0, y, W, H);
      c.strokeStyle = '#e8e4f8';
      c.lineWidth = 4;
      roundRect(c, 6, y + 6, W - 12, H - 12, 8);
      c.stroke();
      c.fillStyle = '#ffffff';
      c.font = `800 30px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`TRENCH HOUSES · ${TOWERS[i].no}`, W / 2, y + H / 2 + 2);
    }
  });
  return { mat: lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.9, 1.1), rows: n };
})();

/** The murals: big painted walls with made-up names, one row each */
export const MURAL_TEXT = ['THE TRENCHES', 'GM', 'TRENCH LIFE', 'S7', 'THE BLOCK', 'HOME'];
const MURALS = (() => {
  const W = 512;
  const H = 512;
  const colours = [
    ['#e219e5', '#00eaff', '#ffd23f'],
    ['#ff6a2f', '#ffd23f', '#00eaff'],
    ['#2bff88', '#8000ff', '#ff6ad5'],
  ];
  const tex = canvasTex(W, H * MURAL_TEXT.length, (c) => {
    MURAL_TEXT.forEach((text, i) => {
      const y = i * H;
      const [a, b, d] = colours[i % colours.length];
      // A painted ground: bands of colour, a sun, drips
      const g = c.createLinearGradient(0, y, 0, y + H);
      g.addColorStop(0, '#1b1233');
      g.addColorStop(1, '#2d1a4f');
      c.fillStyle = g;
      c.fillRect(0, y, W, H);
      c.fillStyle = a;
      c.beginPath();
      c.arc(W * 0.72, y + H * 0.3, 110, 0, Math.PI * 2);
      c.fill();
      for (let k = 0; k < 5; k++) {
        c.fillStyle = [b, d][k % 2];
        c.fillRect(0, y + H * 0.62 + k * 26, W, 13);
      }
      // The name, outlined and shadowed, in graffiti caps
      c.save();
      c.translate(W / 2, y + H * 0.46);
      c.rotate(-0.08);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const size = text.length > 8 ? 74 : text.length > 4 ? 110 : 190;
      c.font = `900 ${size}px ${FONT_DISPLAY}`;
      c.lineJoin = 'round';
      c.lineWidth = 22;
      c.strokeStyle = PAL.ink;
      c.strokeText(text, 8, 10);
      c.lineWidth = 12;
      c.strokeStyle = '#ffffff';
      c.strokeText(text, 0, 0);
      c.fillStyle = b;
      c.fillText(text, 0, 0);
      c.restore();
      for (let k = 0; k < 9; k++) {
        c.fillStyle = [a, b, d][k % 3];
        c.fillRect(30 + k * 52, y + H * 0.58, 6, 20 + ((k * 37) % 50));
      }
    });
  });
  return { mat: lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.9, 0.45), rows: MURAL_TEXT.length };
})();

/** A plane facing out along n (one of the four), w wide and h high, its middle at (x, y, z), showing row `row` of an atlas of `rows` */
function atlasPlane(row: number, rows: number, w: number, h: number, n: Pt, x: number, y: number, z: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const v0 = 1 - (row + 1) / rows;
  const v1 = 1 - row / rows;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? v1 - 0.002 : v0 + 0.002);
  g.rotateY(Math.atan2(n[0], n[1]));
  return g.translate(x, y, z);
}

/** A tower's outline, counter-clockwise from above (a cross's twelve corners, a slab's four) */
function outline(t: Tower): Pt[] {
  if (t.parts.length === 1) {
    const [x0, z0, x1, z1] = t.parts[0];
    return [
      [x0, z0],
      [x0, z1],
      [x1, z1],
      [x1, z0],
    ];
  }
  const [[ax0, az0, ax1, az1], [bx0, bz0, bx1, bz1]] = t.parts;
  return [
    [bx0, bz0],
    [bx0, az0],
    [ax0, az0],
    [ax0, az1],
    [bx0, az1],
    [bx0, bz1],
    [bx1, bz1],
    [bx1, az1],
    [ax1, az1],
    [ax1, az0],
    [bx1, az0],
    [bx1, bz0],
  ];
}
const inParts = (t: Tower, [x, z]: Pt) => t.parts.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
/** Each side of the outline with the way out of it */
function sides(t: Tower) {
  const o = outline(t);
  return o.map((a, i) => {
    const c = o[(i + 1) % o.length];
    const m: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    let n: Pt = [-(c[1] - a[1]) / l, (c[0] - a[0]) / l];
    if (inParts(t, [m[0] + n[0] * 0.05, m[1] + n[1] * 0.05])) n = [-n[0], -n[1]];
    return { a, c, n, l };
  });
}

const FACE_N: Record<Tower['door']['face'], Pt> = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };

/** One tower, into a Batch */
function tower(b: Batch, t: Tower, low: boolean) {
  const k = kit(b, WORLD);
  const top = S + t.h;
  const r = rng(t.no * 131);
  const trim = STONE;
  const sd = sides(t);
  k.all(() => {
    sd.forEach(({ a, c, n }, i) => k.wall(ATLAS.wall.brick, a, c, S, top, n, (i * 0.37 + r()) % 1));
    // The roof slab tucked inside the walls, the parapet round it (flat on the walls' tops)
    for (const [x0, z0, x1, z1] of t.parts) k.lbox(x0 + 0.006, x1 - 0.006, top - 0.04, top, z0 + 0.006, z1 - 0.006, ROOF);
    for (const { a, c, n } of sd) {
      const [x0, x1] = [Math.min(a[0], c[0]), Math.max(a[0], c[0])];
      const [z0, z1] = [Math.min(a[1], c[1]), Math.max(a[1], c[1])];
      // 0.14 thick, inside the wall line
      const ix = n[0] ? -n[0] * 0.14 : 0;
      const iz = n[1] ? -n[1] * 0.14 : 0;
      k.lbox(Math.min(x0, x0 + ix), Math.max(x1, x1 + ix), top, top + 0.26, Math.min(z0, z0 + iz), Math.max(z1, z1 + iz), toon('#5a2c2a'));
    }
  });
  // A stone string course over the ground floor and a cornice under the parapet, a touch proud of the walls
  for (const { a, c, n } of sd) {
    const [x0, x1] = [Math.min(a[0], c[0]), Math.max(a[0], c[0])];
    const [z0, z1] = [Math.min(a[1], c[1]), Math.max(a[1], c[1])];
    const ox = n[0] * 0.05;
    const oz = n[1] * 0.05;
    for (const [y0, y1] of [
      [S + 1.18, S + 1.26],
      [top - 0.3, top - 0.18],
    ])
      k.lbox(Math.min(x0, x0 + ox) - (n[1] ? 0.05 : 0), Math.max(x1, x1 + ox) + (n[1] ? 0.05 : 0), y0, y1, Math.min(z0, z0 + oz) - (n[0] ? 0.05 : 0), Math.max(z1, z1 + oz) + (n[0] ? 0.05 : 0), trim);
  }
  // The roof: the stair and lift house, a water tank (the lower towers), a vent or two
  const [cx, cz] = t.c;
  k.all(() => k.lbox(cx - 1.1, cx + 1.1, top, top + BULK_H, cz - 0.7, cz + 0.7, toon('#6b3432')));
  k.lbox(cx - 1.2, cx + 1.2, top + BULK_H, top + BULK_H + 0.08, cz - 0.8, cz + 0.8, ROOF);
  if (t.tank) tank(k, cx + (t.parts.length > 1 ? 0 : 2.6), cz + (t.parts.length > 1 ? 1.4 : 0), top + 0.02);
  if (!low) for (const [du, dv] of [[-3.2, 0.3], [3, -0.4]] as Pt[]) acUnit(k, cx + (t.along === 'x' || t.parts.length > 1 ? du : dv), cz + (t.along === 'x' || t.parts.length > 1 ? dv : du), top);
  // The door: a dark opening in a stone surround, a canopy on two posts, two lamps, its number over it
  const n = FACE_N[t.door.face];
  const tg: Pt = [n[1], -n[0]];
  const [dx, dz] = [t.door.x - n[0] * 0.25, t.door.z - n[1] * 0.25];
  const box = (u0: number, u1: number, y0: number, y1: number, v0: number, v1: number, mat: THREE.Material) => {
    const xs = [dx + tg[0] * u0 + n[0] * v0, dx + tg[0] * u1 + n[0] * v1];
    const zs = [dz + tg[1] * u0 + n[1] * v0, dz + tg[1] * u1 + n[1] * v1];
    k.lbox(Math.min(...xs), Math.max(...xs), y0, y1, Math.min(...zs), Math.max(...zs), mat);
  };
  k.all(() => {
    box(-0.75, 0.75, S, S + 1.1, 0, 0.02, INK);
    box(-0.85, 0.85, S + 1.1, S + 1.2, 0, 0.04, trim);
    k.put(atlasPlane(t.no - 1, NUMBERS.rows, 1.9, 0.24, n, dx + n[0] * 0.03, S + 1.55, dz + n[1] * 0.03), NUMBERS.mat);
  });
  box(-1.1, 1.1, S + 1.3, S + 1.4, 0, 1.3, toon('#2f3a4a'));
  for (const u of [-1.0, 1.0]) box(u - 0.04, u + 0.04, S, S + 1.3, 1.22, 1.3, METAL);
  for (const u of [-0.95, 0.95]) {
    const [lx, lz] = [dx + tg[0] * u + n[0] * 0.06, dz + tg[1] * u + n[1] * 0.06];
    k.put(new THREE.SphereGeometry(0.06, 6, 4).translate(lx, S + 0.95, lz), glow(PAL.warm));
  }
  // A mural on the arm facing Trench Avenue (towers on its south side), where the door isn't
  if (t.block.startsWith('trench-b0-') && t.door.face !== 'n') {
    const north = sd.filter((s) => s.n[1] < -0.5).sort((p, q) => Math.min(p.a[1], p.c[1]) - Math.min(q.a[1], q.c[1]))[0];
    if (north) {
      const w = Math.min(north.l - 0.4, 6);
      const mx = (north.a[0] + north.c[0]) / 2;
      const mz = north.a[1] - 0.012;
      k.all(() => k.put(atlasPlane(t.no % MURALS.rows, MURALS.rows, w, Math.min(w, 4.2), [0, -1], mx, S + 1.5 + Math.min(w, 4.2) / 2, mz), MURALS.mat));
    }
  }
}
const BULK_H = 0.9;

/** The lawn round a block's towers: a path from each door to the sidewalk, benches by it (the trees and lamps are the city's) */
function lawn(b: Batch, towers: Tower[], blk: Rect) {
  const path = toon('#8f8ab0');
  const k = kit(b, WORLD);
  const [x0, z0, x1, z1] = blk;
  for (const t of towers) {
    const n = FACE_N[t.door.face];
    const end = t.door.face === 'n' ? z0 : t.door.face === 's' ? z1 : t.door.face === 'w' ? x0 : x1;
    const [dx, dz] = [t.door.x, t.door.z];
    if (n[0]) k.lbox(Math.min(dx, end), Math.max(dx, end), S, S + 0.012, dz - 0.8, dz + 0.8, path);
    else k.lbox(dx - 0.8, dx + 0.8, S, S + 0.012, Math.min(dz, end), Math.max(dz, end), path);
    // Benches either side of the path, facing it
    b.detail(() => {
      for (const side of [-1, 1]) {
        const along = 2.6;
        const bx = dx + n[0] * along + n[1] * side * 1.5;
        const bz = dz + n[1] * along - n[0] * side * 1.5;
        const [w, d] = n[0] ? [0.4, 1.3] : [1.3, 0.4];
        k.lbox(bx - w / 2, bx + w / 2, S + 0.3, S + 0.36, bz - d / 2, bz + d / 2, toon('#8a5a3c'));
        for (const s of [-1, 1]) {
          const lx = n[0] ? bx : bx + s * 0.5;
          const lz = n[0] ? bz + s * 0.5 : bz;
          k.lbox(lx - 0.05, lx + 0.05, S, S + 0.3, lz - 0.05, lz + 0.05, METAL);
        }
      }
    });
  }
}

/** The Trenches' buildings, each a site; their lawns' trees and lamps placed in the city's lists (before the boot builds those) */
export function buildProjects(low: boolean) {
  const byBlock = new Map<string, Tower[]>();
  for (const t of TOWERS) byBlock.set(t.block, [...(byBlock.get(t.block) ?? []), t]);
  for (const t of TOWERS) {
    const xs = t.parts.flatMap((p) => [p[0], p[2]]);
    const zs = t.parts.flatMap((p) => [p[1], p[3]]);
    site(`trench tower ${t.no}`, [Math.min(...xs) - 1.5, Math.min(...zs) - 1.5, Math.max(...xs) + 1.5, Math.max(...zs) + 1.5], (into) => {
      const b = new Batch();
      tower(b, t, low);
      b.build(into);
    });
  }
  for (const [id, towers] of byBlock) {
    const blk = TRENCH_BLOCKS.find((o) => o.id === id)!;
    const xs = blk.poly.map((p) => p[0]);
    const zs = blk.poly.map((p) => p[1]);
    const rect: Rect = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
    site(`trench lawn ${id}`, rect, (into) => {
      const b = new Batch();
      lawn(b, towers, rect);
      b.build(into, { cast: false, receive: true });
    });
    // A lamp by each door's path; trees round the lawn, clear of the towers and the paths
    for (const t of towers) {
      const n = FACE_N[t.door.face];
      addLamp(t.door.x + n[0] * 1.6 + n[1] * 1.1, t.door.z + n[1] * 1.6 - n[0] * 1.1, Math.atan2(-n[1], n[0]));
    }
    const r = rng(rect[0] * 7 + rect[1]);
    const clear = (x: number, z: number) =>
      towers.every((t) => t.parts.every(([a, c, d, e]) => x < a - 1.6 || x > d + 1.6 || z < c - 1.6 || z > e + 1.6)) &&
      towers.every((t) => {
        const n = FACE_N[t.door.face];
        return n[0] ? Math.abs(z - t.door.z) > 2.2 || (x - t.door.x) * n[0] < -1 : Math.abs(x - t.door.x) > 2.2 || (z - t.door.z) * n[1] < -1;
      });
    for (let x = rect[0] + 2; x <= rect[2] - 2; x += 4.5)
      for (let z = rect[1] + 2; z <= rect[3] - 2; z += 4.5) {
        const edge = x < rect[0] + 3 || x > rect[2] - 3 || z < rect[1] + 3 || z > rect[3] - 3;
        if (clear(x, z) && r() < (edge ? 0.75 : 0.35)) addTree(x + (r() - 0.5), z + (r() - 0.5), 0.9 + r() * 0.4, false);
      }
  }

  // The rows: their buildings a few at a time, their alleys with each block
  const laid = rows();
  ROW_BLOCKS.forEach((blk, i) => {
    const l = laid.byBlock[i];
    for (let n = 0; n < l.lots.length; n += 4) {
      const lots = l.lots.slice(n, n + 4);
      const rect: Rect = [Math.min(...lots.map((o) => o.box[0])), Math.min(...lots.map((o) => o.box[1])), Math.max(...lots.map((o) => o.box[2])), Math.max(...lots.map((o) => o.box[3]))];
      site(`trench row ${blk.id} ${n / 4}`, rect, (into) => {
        const b = new Batch();
        for (const o of lots) drawLot(b, o, low);
        b.build(into);
      });
    }
    if (l.alleys.length) {
      const xs = l.alleys.flatMap((a) => [a.box[0], a.box[2]]);
      const zs = l.alleys.flatMap((a) => [a.box[1], a.box[3]]);
      site(`trench alleys ${blk.id}`, [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], (into) => {
        const b = new Batch();
        const k = kit(b, WORLD);
        for (const a of l.alleys) {
          const [a0, c0, a1, c1] = a.box;
          k.lbox(a0, a1, S + 0.004, S + 0.012, c0, c1, toon('#3f3a5c'));
          b.detail(() => {
            for (const [x, z] of a.bollards) {
              b.add(new THREE.CylinderGeometry(0.08, 0.09, 0.6, 8).translate(x, S + 0.3, z), INK);
              b.add(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 8).translate(x, S + 0.49, z), glow(PAL.warm));
            }
          });
        }
        b.build(into);
      });
    }
  });

  // Behind Bottom Street's row: a car park, and trees along the highway
  for (const blk of TRENCH_BLOCKS.filter((o) => o.row === 'C')) {
    const xs = blk.poly.map((p) => p[0]);
    const zs = blk.poly.map((p) => p[1]);
    const [x0, z0, x1, z1] = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
    const pz0 = z0 + RECIPES.rowhouses.depth + 1;
    const pz1 = z1 - 2.6;
    const px0 = x0 + (blk.poly.length > 4 ? 6 : 1);
    if (pz1 - pz0 > 3)
      site(`trench parking ${blk.id}`, [px0, pz0, x1 - 1, pz1], (into) => {
        const b = new Batch();
        const k = kit(b, WORLD);
        k.lbox(px0, x1 - 1, S, S + 0.012, pz0, pz1, toon('#2e2b45'));
        for (let x = px0 + 0.4; x < x1 - 1.4; x += 1.25) k.lbox(x, x + 0.06, S, S + 0.02, pz0 + 0.3, pz0 + 2.3, CREAM);
        b.build(into, { cast: false, receive: true });
      });
    const r = rng(x0 * 3 + 11);
    for (let x = px0 + 1; x < x1 - 1; x += 3.2) if (r() < 0.8) addTree(x, z1 - 1.2, 0.9 + r() * 0.4, r() < 0.35);
  }
}

