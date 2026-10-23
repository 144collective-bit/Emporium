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
import { ATLAS, INK, METAL, ROOF, STONE, CREAM, WOOD, acUnit, glow, kit, planter, tank, type Frame } from './infill';
import { drawLot } from './kits3d';
import { SLAB as S, addLamp, addTree } from './world';
import { site } from './tilework';
import { boarded } from './grit';
import { buildFx, tag } from './grime';
import { SCAFFOLD_OUT, STOOP, TOWERS, ROW_BLOCKS, isAvenue, isCorner, rows, towerShell, type Brick, type Tower, type TowerWall } from './projects';
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

const FACE_N: Record<Tower['door']['face'], Pt> = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
/** The parapets' brick, a shade under each wall's */
const PARAPET_OF: Record<Brick, string> = { brick: '#5a2c2a', brownstone: '#4e3326', brickTan: '#7a5c40', brickDark: '#3a2124' };
const BULK_H = 0.9;
/** The wall atlas's bays (infill.ts): a window every 0.75 along, one a floor; the sill this far over the floor line */
const BAY = 0.75;
const SILL = 0.2;
const PANEL = toon('#cfc9e4');
const LAUNDRY = ['#f3f2f7', '#ff6ad5', '#00c2ff', '#ffd23f', '#2bff88', '#e23b3b'];

/** A wall as the atlas lays it (infill.ts's kit flips a and c so its texture runs left to right seen from outside): its start, the way along it, its length */
function laid(w: TowerWall) {
  let { a, c } = w;
  if (-(c[1] - a[1]) * w.n[0] + (c[0] - a[0]) * w.n[1] < 0) [a, c] = [c, a];
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  return { a, t: [(c[0] - a[0]) / len, (c[1] - a[1]) / len] as Pt, len };
}

/**
 * One tower, into a Batch, a piece at a time (each its own site, so none takes
 * long to build): its shell (walls, roofs, parapets, cornices and the door at
 * every distance, the roof's furniture), then the lived-in details of each wall
 * (near only), then its scaffolding
 */
type TowerPiece = 'shell' | 'scaffold' | number;
function tower(b: Batch, t: Tower, low: boolean, piece: TowerPiece, fxb: Batch) {
  const k = kit(b, WORLD);
  const r = rng(t.no * 131 + (typeof piece === 'number' ? piece + 1 : piece === 'scaffold' ? 97 : 0));
  const trim = STONE;
  const band = ATLAS.wall[t.brick];
  const parapet = toon(PARAPET_OF[t.brick]);
  const { walls, roofs } = towerShell(t.parts);
  /** A box along a wall: s0..s1 along it, out0..out1 out of it, y0..y1 up */
  const onWall = (w: ReturnType<typeof laid>, n: Pt, s0: number, s1: number, out0: number, out1: number, y0: number, y1: number, mat: THREE.Material) => {
    const xs = [w.a[0] + w.t[0] * s0 + n[0] * out0, w.a[0] + w.t[0] * s1 + n[0] * out1];
    const zs = [w.a[1] + w.t[1] * s0 + n[1] * out0, w.a[1] + w.t[1] * s1 + n[1] * out1];
    k.lbox(Math.min(...xs), Math.max(...xs), y0, y1, Math.min(...zs), Math.max(...zs), mat);
  };
  // The door's wall and the mural's are kept clear of clutter
  const doorN = FACE_N[t.door.face];
  const onDoorWall = (w: TowerWall) => w.n[0] === doorN[0] && w.n[1] === doorN[1] && w.y0 === 0 && Math.abs(w.n[0] ? w.a[0] - (t.door.x - doorN[0] * 0.25) : w.a[1] - (t.door.z - doorN[1] * 0.25)) < 1e-6;
  const muralWall = t.block.startsWith('trench-b0-') && t.door.face !== 'n' ? walls.filter((w) => w.n[1] < -0.5 && w.y0 === 0 && laid(w).len >= 5).sort((p, q) => p.a[1] - q.a[1])[0] : undefined;

  if (piece !== 'shell') {
    // Lived in: window air conditioners, window boxes and the odd dish; balconies with washing on some towers
    b.detail(() => {
      if (typeof piece === 'number') {
        const w = walls[piece];
        if (w === muralWall) return;
        const L = laid(w);
        const door = onDoorWall(w);
        const balconies = t.balconies && L.len >= 6 && (w.n[1] > 0.5 || w.n[0] < -0.5);
        for (let y = w.y0; y + 0.9 < w.y1 - PARAPET_GAP; y += 1) {
          const yb = S + y;
          for (let j = 0; (j + 0.5) * BAY < L.len - 0.3; j++) {
            const s = (j + 0.5) * BAY;
            if (door && y < 2 && Math.abs(s - L.len / 2) < 1.6) continue;
            // (the grit step) A window boarded up, the plywood tagged on the lower floors
            if (boarded(t, piece, j, y)) {
              onWall(L, w.n, s - 0.24, s + 0.24, 0.004, 0.026, yb + 0.18, yb + 0.85, toon('#a07a52'));
              if (y < 2 && !low) {
                const [x, z] = [L.a[0] + L.t[0] * s + w.n[0] * 0.032, L.a[1] + L.t[1] * s + w.n[1] * 0.032];
                tag(fxb, t.no + j, 0.5, w.n, x, yb + 0.5, z);
              }
              continue;
            }
            if (y < 1) continue;
            if (balconies && y >= 2 && j % 4 === 0 && s + BAY < L.len - 0.2) {
              // A balcony across two bays (every other pair): the slab, a light panel and a rail, washing on the line on some
              const s0 = s - 0.3;
              const s1 = s + BAY + 0.3;
              onWall(L, w.n, s0, s1, 0.004, 0.55, yb - 0.04, yb + 0.03, CREAM);
              onWall(L, w.n, s0, s1, 0.52, 0.545, yb + 0.03, yb + 0.3, PANEL);
              onWall(L, w.n, s0, s1, 0.51, 0.55, yb + 0.47, yb + 0.51, METAL);
              for (const e of [s0, s1 - 0.03]) onWall(L, w.n, e, e + 0.03, 0.004, 0.55, yb + 0.03, yb + 0.47, METAL);
              if (!low && r() < 0.35)
                for (let q = 0; q < 3; q++) {
                  const c0 = s0 + 0.18 + q * 0.32;
                  onWall(L, w.n, c0, c0 + 0.24, 0.5, 0.505, yb + 0.22, yb + 0.5, toon(LAUNDRY[Math.floor(r() * LAUNDRY.length)]));
                }
              continue;
            }
            if (balconies && y >= 2 && j % 4 === 1) continue;
            const pick = r();
            if (pick < 0.07) {
              // An air conditioner under the window
              onWall(L, w.n, s - 0.18, s + 0.18, 0.004, 0.26, yb + SILL - 0.2, yb + SILL + 0.04, toon('#c9c4e6'));
              onWall(L, w.n, s - 0.14, s + 0.14, 0.26, 0.265, yb + SILL - 0.16, yb + SILL, INK);
            } else if (pick < 0.11 && !low) {
              // A window box of flowers
              onWall(L, w.n, s - 0.26, s + 0.26, 0.004, 0.15, yb + SILL - 0.04, yb + SILL + 0.08, WOOD);
              onWall(L, w.n, s - 0.24, s + 0.24, 0.02, 0.14, yb + SILL + 0.08, yb + SILL + 0.16, toon(r() < 0.5 ? '#36b06c' : '#ff6ad5'));
            } else if (pick < 0.12 && !low) {
              const [px, pz] = [L.a[0] + L.t[0] * (s + 0.42) + w.n[0] * 0.2, L.a[1] + L.t[1] * (s + 0.42) + w.n[1] * 0.2];
              dish(k, px, yb + 0.55, pz, Math.atan2(w.n[0], w.n[1]));
            }
          }
        }
      }
      // Scaffolding up one face: poles, a ledger at each floor, boards on some, braces
      if (piece === 'scaffold' && t.scaffold) {
        const [x0, z0, x1, z1] = t.scaffold;
        const alongX = x1 - x0 > z1 - z0;
        const len = alongX ? x1 - x0 : z1 - z0;
        const hTop = S + t.parts[t.main].h + 0.6;
        const at = (s: number, o: number): Pt => (alongX ? [x0 + s, z0 + o] : [x0 + o, z0 + s]);
        const depth = SCAFFOLD_OUT;
        const pole = toon('#9aa0b0');
        for (let s = 0.1; s <= len - 0.1 + 1e-6; s += (len - 0.2) / Math.round((len - 0.2) / 1.6)) {
          for (const o of [0.15, depth - 0.1]) {
            const [px, pz] = at(s, o);
            k.lbox(px - 0.03, px + 0.03, S, hTop, pz - 0.03, pz + 0.03, pole);
          }
        }
        for (let y = S + 1; y < hTop - 0.3; y += 1)
          for (const o of [0.15, depth - 0.1]) {
            const [a0, a1] = [at(0.05, o), at(len - 0.05, o)];
            k.lbox(Math.min(a0[0], a1[0]) - 0.02, Math.max(a0[0], a1[0]) + 0.02, y, y + 0.05, Math.min(a0[1], a1[1]) - 0.02, Math.max(a0[1], a1[1]) + 0.02, pole);
          }
        for (let y = S + 2; y < hTop - 0.5; y += 2) {
          const [a0, a1] = [at(0.1, 0.12), at(len - 0.1, depth - 0.08)];
          k.lbox(Math.min(a0[0], a1[0]), Math.max(a0[0], a1[0]), y + 0.05, y + 0.09, Math.min(a0[1], a1[1]), Math.max(a0[1], a1[1]), WOOD);
        }
        // Orange toe boards along the outside of each deck
        for (let y = S + 2; y < hTop - 0.5; y += 2) {
          const [a0, a1] = [at(0.05, depth - 0.07), at(len - 0.05, depth - 0.04)];
          k.lbox(Math.min(a0[0], a1[0]), Math.max(a0[0], a1[0]), y + 0.09, y + 0.24, Math.min(a0[1], a1[1]), Math.max(a0[1], a1[1]), toon('#ff8a3d'));
        }
      }
    });
    return;
  }

  k.all(() => {
    for (const w of walls) k.wall(band, w.a, w.c, S + w.y0, S + w.y1, w.n, 0);
    for (const rf of roofs) k.lbox(rf.rect[0], rf.rect[2], S + rf.h - 0.04, S + rf.h, rf.rect[1], rf.rect[3], ROOF);
    // Parapets along every wall's top, on the inside
    for (const w of walls) {
      const L = laid(w);
      onWall(L, w.n, 0, L.len, -0.14, 0, S + w.y1, S + w.y1 + 0.26, parapet);
    }
  });
  // A stone string course over the ground floor, a cornice under each roof, a touch proud of the walls
  for (const w of walls) {
    const L = laid(w);
    onWall(L, w.n, -0.05, L.len + 0.05, 0, 0.05, S + w.y1 - 0.3, S + w.y1 - 0.18, trim);
    if (w.y0 === 0) onWall(L, w.n, -0.05, L.len + 0.05, 0, 0.05, S + 1.18, S + 1.26, trim);
  }

  // The roofs: the stair and lift house on the tallest part, a water tank on the lower towers, vents; terraces on a stepped tower's lower steps
  const m = t.parts[t.main].rect;
  const top = S + t.h;
  const [cx, cz] = [(m[0] + m[2]) / 2, (m[1] + m[3]) / 2];
  const wide = m[2] - m[0] >= m[3] - m[1];
  k.all(() => k.lbox(cx - (wide ? 1.1 : 0.7), cx + (wide ? 1.1 : 0.7), top, top + BULK_H, cz - (wide ? 0.7 : 1.1), cz + (wide ? 0.7 : 1.1), toon('#6b3432')));
  b.detail(() => {
    k.lbox(cx - (wide ? 1.2 : 0.8), cx + (wide ? 1.2 : 0.8), top + BULK_H, top + BULK_H + 0.08, cz - (wide ? 0.8 : 1.2), cz + (wide ? 0.8 : 1.2), ROOF);
    const room = Math.max(m[2] - m[0], m[3] - m[1]) / 2;
    if (t.tank) tank(k, cx + (wide ? Math.min(2.6, room - 1) : 0), cz + (wide ? 0 : Math.min(2.6, room - 1)), top + 0.02);
    if (!low) {
      acUnit(k, cx - (wide ? Math.min(3, room - 1) : 0.6), cz + (wide ? 0.4 : -Math.min(3, room - 1)), top);
      // A satellite dish or two on the roof
      for (let i = 0; i < 2; i++) dish(k, cx + (r() - 0.5) * (m[2] - m[0] - 1.6), top + 0.02, cz + (r() - 0.5) * (m[3] - m[1] - 1.6), r() * Math.PI * 2);
    }
    if (t.design === 'stepped')
      t.parts.forEach((p, i) => {
        if (i === t.main) return;
        const [x0, z0, x1, z1] = p.rect;
        const y = S + p.h;
        // A roof terrace: decking, planters along the edge, a table under a parasol
        k.lbox(x0 + 0.3, x1 - 0.3, y, y + 0.03, z0 + 0.3, z1 - 0.3, WOOD);
        if (low) return;
        for (const [px, pz] of [
          [x0 + 0.6, z0 + 0.6],
          [x1 - 0.6, z0 + 0.6],
          [x0 + 0.6, z1 - 0.6],
          [x1 - 0.6, z1 - 0.6],
        ] as Pt[])
          planter(k, px, pz, y);
        const [tx, tz] = [(x0 + x1) / 2, (z0 + z1) / 2];
        k.put(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 10).translate(tx, y + 0.45, tz), CREAM);
        k.put(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 5).translate(tx, y + 0.65, tz), METAL);
        k.put(new THREE.ConeGeometry(0.75, 0.28, 8).translate(tx, y + 1.42, tz), toon(['#e23b3b', '#00a3d6', '#ffd23f'][i % 3]));
      });
  });

  // The way in: a canopy on posts with lamps (a walk-up's front steps instead), and its number
  const n = doorN;
  const tg: Pt = [n[1], -n[0]];
  const [dx, dz] = [t.door.x - n[0] * 0.25, t.door.z - n[1] * 0.25];
  const box = (u0: number, u1: number, y0: number, y1: number, v0: number, v1: number, mat: THREE.Material) => {
    const xs = [dx + tg[0] * u0 + n[0] * v0, dx + tg[0] * u1 + n[0] * v1];
    const zs = [dz + tg[1] * u0 + n[1] * v0, dz + tg[1] * u1 + n[1] * v1];
    k.lbox(Math.min(...xs), Math.max(...xs), y0, y1, Math.min(...zs), Math.max(...zs), mat);
  };
  k.all(() => k.put(atlasPlane(t.no - 1, NUMBERS.rows, 1.9, 0.24, n, dx + n[0] * 0.03, S + 1.55, dz + n[1] * 0.03), NUMBERS.mat));
  if (t.design === 'walkup') {
    // Stone stoops up to doors in carved surrounds, a lamp by each
    const stone = toon('#8f7a8a');
    for (const st of t.stoops) {
      const [sx, sz] = [(st[0] + st[2]) / 2, (st[1] + st[3]) / 2];
      const along = n[1] !== 0;
      const half = (along ? st[2] - st[0] : st[3] - st[1]) / 2;
      const w0: Pt = [sx - n[0] * STOOP.out / 2, sz - n[1] * STOOP.out / 2];
      const sb = (u0: number, u1: number, y0: number, y1: number, v0: number, v1: number, mat: THREE.Material) => {
        const xs = [w0[0] + tg[0] * u0 + n[0] * v0, w0[0] + tg[0] * u1 + n[0] * v1];
        const zs = [w0[1] + tg[1] * u0 + n[1] * v0, w0[1] + tg[1] * u1 + n[1] * v1];
        k.lbox(Math.min(...xs), Math.max(...xs), y0, y1, Math.min(...zs), Math.max(...zs), mat);
      };
      k.all(() => {
        for (let i = 0; i < 3; i++) sb(-half, half, S + i * 0.15, S + (i + 1) * 0.15, 0, STOOP.out - i * 0.25, stone);
        sb(-0.32, 0.32, S + 0.45, S + 1.15, 0.006, 0.02, toon('#3a2430'));
      });
      sb(-0.42, -0.32, S + 0.45, S + 1.2, 0, 0.08, trim);
      sb(0.32, 0.42, S + 0.45, S + 1.2, 0, 0.08, trim);
      sb(-0.48, 0.48, S + 1.2, S + 1.3, 0, 0.12, trim);
      const [lx, lz] = [w0[0] + tg[0] * 0.55 + n[0] * 0.08, w0[1] + tg[1] * 0.55 + n[1] * 0.08];
      k.put(new THREE.SphereGeometry(0.05, 6, 4).translate(lx, S + 1.05, lz), glow(PAL.warm));
    }
  } else {
    k.all(() => {
      box(-0.75, 0.75, S, S + 1.1, 0.006, 0.02, INK);
      box(-0.85, 0.85, S + 1.1, S + 1.2, 0, 0.04, trim);
    });
    box(-1.1, 1.1, S + 1.3, S + 1.4, 0, 1.3, toon('#2f3a4a'));
    for (const u of [-1.0, 1.0]) box(u - 0.04, u + 0.04, S, S + 1.3, 1.22, 1.3, METAL);
    for (const u of [-0.95, 0.95]) {
      const [lx, lz] = [dx + tg[0] * u + n[0] * 0.06, dz + tg[1] * u + n[1] * 0.06];
      k.put(new THREE.SphereGeometry(0.06, 6, 4).translate(lx, S + 0.95, lz), glow(PAL.warm));
    }
  }

  // A mural on the arm facing Trench Avenue (towers on its south side)
  if (muralWall) {
    const L = laid(muralWall);
    const w = Math.min(L.len - 0.4, 6);
    const mh = Math.min(w, 4.2, muralWall.y1 - 1.8);
    const mx = L.a[0] + L.t[0] * L.len / 2;
    k.all(() => k.put(atlasPlane(t.no % MURALS.rows, MURALS.rows, w, mh, [0, -1], mx, S + 1.5 + mh / 2, muralWall.a[1] - 0.012), MURALS.mat));
  }

}
/** Details keep below a wall's parapet and cornice */
const PARAPET_GAP = 0.35;

/** A satellite dish on a bracket, facing `ry` */
function dish(k: ReturnType<typeof kit>, x: number, y: number, z: number, ry: number) {
  k.put(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4).translate(x, y + 0.15, z), METAL);
  k.put(new THREE.CylinderGeometry(0.2, 0.06, 0.06, 10).rotateX(Math.PI / 2 - 0.5).rotateY(ry).translate(x, y + 0.36, z), toon('#e8e2f0'));
}

/** The lawn round a block's towers: a path from each door to the sidewalk, benches by it (the trees and lamps are the city's) */
function lawn(b: Batch, towers: Tower[], blk: Rect) {
  // (the yards are concrete now: the paths a lighter, newer concrete)
  const path = toon('#77738a');
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
    const xs = t.parts.flatMap((p) => [p.rect[0], p.rect[2]]);
    const zs = t.parts.flatMap((p) => [p.rect[1], p.rect[3]]);
    const rect: Rect = [Math.min(...xs) - 1.5, Math.min(...zs) - 1.5, Math.max(...xs) + 1.5, Math.max(...zs) + 1.5];
    const pieces: TowerPiece[] = ['shell', ...towerShell(t.parts).walls.map((_, i) => i), ...(t.scaffold ? ['scaffold' as const] : [])];
    for (const piece of pieces)
      site(`trench tower ${t.no} ${piece}`, rect, (into) => {
        const b = new Batch();
        const fxb = new Batch();
        fxb.lod = 'near';
        tower(b, t, low, piece, fxb);
        b.build(into);
        buildFx(fxb, into);
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
        // (the corner shops' lots are drawn from the save, cornershops.ts; the avenue's places by avenue3d.ts)
        for (const o of lots) if (!isCorner(o) && !isAvenue(o)) drawLot(b, o, low);
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

