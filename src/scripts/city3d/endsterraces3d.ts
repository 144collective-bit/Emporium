/*
 * Endswood's terraces drawn (docs/ends-west-plan.md Phase 2; the numbers are endsterraces.ts), a site a terrace in the
 * extension's chunk (endswest3d.ts): the walls from the city's one wall atlas in the terrace's brick (infill.ts
 * `ATLAS`: red, buff or dark, windows lit at night), the roof (a slab inside a parapet with its coping, or a shallow
 * pitched roof in concrete tiles with brick gable ends, gutters and a chimney a pair), and near only each house's front
 * (its door in its own colour in a frame, a step, a concrete canopy on brackets, a brick porch or a glazed one someone
 * added, the light by the door, its bins, the odd board, dish or faded door), its back door, and its back garden in
 * close-board fences with a gate (a shed in some). The passages through the rows are paved, sites of their own. Phones
 * leave out the finest (brackets, gutters and pipes, the second bin, the sheds' felt).
 */
import * as THREE from 'three';
import { Batch, PAL, shadeHex, toon } from './kit';
import { site } from './tilework';
import { KERB } from './palette';
import { ATLAS, INK, METAL, WALL_COLOR, glow, kit, roof, type Frame, type Kit } from './infill';
import { SLAB_Y, type Pt, type Rect } from './endswood';
import { HOME_HOUSE } from './home';
import { BIN, BIN_OFF, CANOPY, DOOR, FENCE, GATE_W, GINNELS, GROUND_H, PARAPET_H, PITCH, PORCH, TERRACES, binsOf, fencesOf, gateOf, rectOf, type House, type Terrace } from './endsterraces';

const S = SLAB_Y;
/** The passages' paving over the gardens' lawn (endswest3d.ts's at the slab's top and 6 mm) */
const PAVE_Y = S + 0.012;
const CONCRETE = toon('#9c98a2');
const STAINED = toon('#77737f');
const TILES = toon('#5a4846');
const TILES_DARK = toon('#433a48');
const TIMBER = toon('#7a5a3e');
const GATE = toon('#5c4330');
const SHED = toon('#6d6b52');
const FELT = toon('#2e2b36');
const PLY = toon('#b89a6a');
const GLASS = toon('#8fa9bd');
const UPVC = toon('#ecebe6');
const DISH = toon('#d9d6cf');
const BIN_BODY = toon('#2d3a33');
const LIDS = ['#1f1e26', '#2c56a0', '#3d7a3a', '#6b4a2e'].map((c) => toon(c));
const FLAGS = toon(KERB.grit);
const LAMP = glow(PAL.warm);

/** A terrace's frame for infill.ts's `kit()`: u along its front from its left end, v out of its front */
function frameOf(T: Terrace): Frame {
  const M = new THREE.Matrix4().makeBasis(new THREE.Vector3(T.t[0], 0, T.t[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(T.n[0], 0, T.n[1])).setPosition(T.left[0], 0, T.left[1]);
  return { M, w: T.w, d: T.d, L: T.left, t: T.t, n: T.n };
}

/** Four walls round u0..u1, v0..v1 (v1 the front), from one atlas band */
function walls(k: Kit, T: Terrace, u0: number) {
  const band = ATLAS.wall[T.brick];
  const [w, d] = [T.w, T.d];
  k.wall(band, [0, 0], [w, 0], S, T.top, [0, 1], u0);
  k.wall(band, [0, -d], [0, 0], S, T.top, [-1, 0], u0 + 0.25);
  k.wall(band, [w, 0], [w, -d], S, T.top, [1, 0], u0 + 0.5);
  k.wall(band, [w, -d], [0, -d], S, T.top, [0, -1], u0 + 0.75);
}

/** The shallow pitched roof: concrete tiles over the eaves (`over` past the front and back walls), the ridge along u,
 * brick gable ends a hair proud of the end walls (the tiles' own ends just inside them, a verge line over the brick) */
function pitched(k: Kit, T: Terrace, tiles: THREE.Material, brick: THREE.Material) {
  const { w, d, top } = T;
  const over = 0.15;
  const IN = 0.012;
  const shape = new THREE.Shape([new THREE.Vector2(-over, -0.05), new THREE.Vector2(d + over, -0.05), new THREE.Vector2(d / 2, PITCH)]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: w - IN * 2, bevelEnabled: false });
  k.put(g.rotateY(Math.PI / 2).translate(IN, top, 0), tiles);
  // (each gable under the tiles' line all the way up: its top edge 3 cm or more below them)
  for (const [u, s] of [
    [-0.006, -1],
    [w + 0.006, 1],
  ] as const) {
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([u, top - 0.05, 0, u, top - 0.05, -d, u, top + PITCH - 0.03, -d / 2], 3));
    tri.setAttribute('normal', new THREE.Float32BufferAttribute([s, 0, 0, s, 0, 0, s, 0, 0], 3));
    tri.setIndex(s < 0 ? [0, 2, 1] : [0, 1, 2]);
    k.put(tri, brick);
  }
}

/** One house's front, back door and garden */
function house(k: Kit, T: Terrace, h: House, trim: THREE.Material, brick: THREE.Material, low: boolean) {
  const du = h.door;
  const door = toon(h.faded ? shadeHex(h.colour, 0.28) : h.colour);
  const slab = h.stained ? STAINED : CONCRETE;
  if (h.porch === 'canopy') {
    // The door in its frame, a step, the concrete canopy on two brackets, the light beside it
    k.lbox(du - DOOR.w / 2 - 0.06, du + DOOR.w / 2 + 0.06, S, S + DOOR.h + 0.08, 0, 0.04, trim);
    k.lbox(du - DOOR.w / 2, du + DOOR.w / 2, S, S + DOOR.h, 0.01, 0.06, door);
    k.lbox(du - 0.42, du + 0.42, S, S + 0.07, 0.04, 0.32, CONCRETE);
    k.lbox(du - CANOPY.w / 2, du + CANOPY.w / 2, S + CANOPY.y, S + CANOPY.y + 0.08, 0.005, CANOPY.d, slab);
    if (!low) for (const s of [-1, 1]) k.lbox(du + s * (CANOPY.w / 2 - 0.12) - 0.04, du + s * (CANOPY.w / 2 - 0.12) + 0.04, S + CANOPY.y - 0.22, S + CANOPY.y, 0.005, CANOPY.d - 0.08, slab);
    k.put(new THREE.SphereGeometry(0.05, 6, 4).translate(du + (du > (h.u0 + h.u1) / 2 ? -1 : 1) * 0.48, S + 1.12, 0.07), LAMP);
  } else if (h.porch === 'box') {
    // A brick porch with a concrete slab roof, the door in its front, the light over it
    k.lbox(du - PORCH.w / 2, du + PORCH.w / 2, S, S + PORCH.h, 0.005, PORCH.d, brick);
    k.lbox(du - PORCH.w / 2 - 0.06, du + PORCH.w / 2 + 0.06, S + PORCH.h, S + PORCH.h + 0.07, 0.005, PORCH.d + 0.06, slab);
    k.lbox(du - 0.28, du + 0.28, S, S + 1.08, PORCH.d - 0.02, PORCH.d + 0.04, door);
    k.put(new THREE.SphereGeometry(0.045, 6, 4).translate(du, S + 1.2, PORCH.d + 0.06), LAMP);
  } else {
    // A glazed porch someone added: a low brick wall, glass in white frames, a white roof, a uPVC door
    k.lbox(du - PORCH.w / 2, du + PORCH.w / 2, S, S + 0.32, 0.005, PORCH.d, brick);
    k.lbox(du - PORCH.w / 2 + 0.04, du + PORCH.w / 2 - 0.04, S + 0.32, S + 1.22, 0.03, PORCH.d - 0.03, GLASS);
    k.lbox(du - PORCH.w / 2 - 0.03, du + PORCH.w / 2 + 0.03, S + 1.22, S + 1.29, 0.005, PORCH.d + 0.04, UPVC);
    if (!low) for (const s of [-1, 1]) k.lbox(du + s * (PORCH.w / 2 - 0.03) - 0.03, du + s * (PORCH.w / 2 - 0.03) + 0.03, S + 0.32, S + 1.22, PORCH.d - 0.05, PORCH.d + 0.005, UPVC);
    k.lbox(du - 0.26, du + 0.26, S, S + 1.1, PORCH.d - 0.05, PORCH.d + 0.02, door);
  }
  // Worn: a board over a ground-floor window, a dish on the front, the bins by it
  if (h.board !== null) k.lbox(h.board - 0.3, h.board + 0.3, S + 0.3, S + 1.0, 0.01, 0.035, PLY);
  if (h.dish) {
    const u = du > (h.u0 + h.u1) / 2 ? h.u0 + 0.8 : h.u1 - 0.8;
    k.put(new THREE.CylinderGeometry(0.2, 0.15, 0.05, 10).rotateX(1.1).translate(u, S + GROUND_H + 0.55, 0.16), DISH);
    k.lbox(u - 0.02, u + 0.02, S + GROUND_H + 0.45, S + GROUND_H + 0.55, 0.005, 0.12, METAL);
  }
  binsOf(h).forEach((u, i) => {
    if (low && i > 0) return;
    k.lbox(u, u + BIN.w, S, S + BIN.h - 0.06, BIN_OFF, BIN_OFF + BIN.d, BIN_BODY);
    k.lbox(u - 0.01, u + BIN.w + 0.01, S + BIN.h - 0.06, S + BIN.h, BIN_OFF - 0.02, BIN_OFF + BIN.d + 0.02, LIDS[(h.id.length + i * 3 + Math.round(u * 10)) % LIDS.length]);
  });
  // The back door, the gate in the back fence, a shed at the garden's end on the gate's other side
  const far = -T.d - T.garden;
  k.lbox(du - 0.28, du + 0.28, S, S + 1.05, -T.d - 0.05, -T.d - 0.005, toon(shadeHex(h.colour, -0.25)));
  const gu = gateOf(h);
  // (Degen's home, home.ts: his garage stands where its gate and shed would)
  if (h.id === HOME_HOUSE) return;
  k.lbox(gu - GATE_W / 2, gu + GATE_W / 2, S, S + FENCE.h - 0.03, far + FENCE.t / 2 - 0.05, far + FENCE.t / 2 + 0.05, GATE);
  if (h.shed) {
    const su = gu > (h.u0 + h.u1) / 2 ? h.u0 + 0.2 : h.u1 - 1.3;
    k.lbox(su, su + 1.1, S, S + 0.85, far + FENCE.t + 0.08, far + 1.0, SHED);
    if (!low) k.lbox(su - 0.06, su + 1.16, S + 0.85, S + 0.92, far + FENCE.t + 0.02, far + 1.06, FELT);
  }
}

/** A close-board fence along a world line, posts every so often */
function fenceRun(b: Batch, a: Pt, c: Pt, low: boolean) {
  const [dx, dz] = [c[0] - a[0], c[1] - a[1]];
  const len = Math.hypot(dx, dz);
  const ry = Math.atan2(-dz, dx);
  const box = (l: number, h: number, t: number, x: number, y: number, z: number, m: THREE.Material) => b.add(new THREE.BoxGeometry(l, h, t).rotateY(ry).translate(x, y, z), m);
  box(len, FENCE.h, FENCE.t * 0.75, (a[0] + c[0]) / 2, S + FENCE.h / 2, (a[1] + c[1]) / 2, TIMBER);
  if (low) return;
  const n = Math.max(1, Math.round(len / 1.8));
  for (let i = 0; i <= n; i++) box(0.1, FENCE.h + 0.06, FENCE.t, a[0] + (dx * i) / n, S + (FENCE.h + 0.06) / 2, a[1] + (dz * i) / n, GATE);
}

function registerTerrace(T: Terrace, low: boolean) {
  const area = rectOf(T, -0.4, T.w + 0.4, -T.d - T.garden - 0.3, PORCH.d + 0.4);
  site(`endswest terrace ${T.id}`, area, (into) => {
    const b = new Batch();
    const F = frameOf(T);
    const k = kit(b, F);
    const { wall: wallHex, trim: trimHex } = WALL_COLOR[T.brick];
    const brick = toon(wallHex);
    const trim = toon(trimHex);
    const u0 = (T.id.charCodeAt(1) % 8) / 8;
    b.detail(() => {
      k.all(() => {
        walls(k, T, u0);
        if (T.roof === 'pitched') pitched(k, T, T.brick === 'brickTan' ? TILES_DARK : TILES, brick);
      });
      if (T.roof === 'flat') {
        roof(k, F, T.top, toon(shadeHex(wallHex, -0.12)), PARAPET_H);
        // The parapet's concrete coping front and back, a vent stack and an aerial or two on the deck
        for (const [v0, v1] of [
          [-0.15, 0.03],
          [-T.d - 0.03, -T.d + 0.15],
        ])
          k.lbox(-0.03, T.w + 0.03, T.top + PARAPET_H, T.top + PARAPET_H + 0.04, v0, v1, CONCRETE);
        T.houses.forEach((h, i) => {
          const u = (h.u0 + h.u1) / 2;
          k.lbox(u - 0.06, u + 0.06, T.top, T.top + 0.4, -T.d * 0.6 - 0.06, -T.d * 0.6 + 0.06, METAL);
          if (i % 3 === 1) k.lbox(u + 0.7, u + 0.72, T.top, T.top + 0.9, -T.d * 0.45, -T.d * 0.45 + 0.02, METAL);
        });
        // A concrete band at the first floor's line
        if (!low) k.lbox(0, T.w, S + GROUND_H - 0.04, S + GROUND_H + 0.04, 0.005, 0.035, CONCRETE);
      } else {
        // A chimney a pair, on the ridge over their party wall; gutters along both eaves, a downpipe at each pair
        T.houses.forEach((h, i) => {
          if (i % 2) return;
          const u = Math.min(h.u1, T.w - 0.3);
          k.lbox(u - 0.24, u + 0.24, T.top + PITCH * 0.4, T.top + PITCH + 0.36, -T.d / 2 - 0.3, -T.d / 2 + 0.3, brick);
          k.lbox(u - 0.28, u + 0.28, T.top + PITCH + 0.36, T.top + PITCH + 0.42, -T.d / 2 - 0.34, -T.d / 2 + 0.34, INK);
          if (!low) for (const v of [-T.d - 0.05, 0.05]) k.lbox(u - 0.03, u + 0.03, S, T.top - 0.06, v - 0.03, v + 0.03, METAL);
        });
        if (!low)
          for (const [v0, v1] of [
            [0.08, 0.18],
            [-T.d - 0.18, -T.d - 0.08],
          ])
            k.lbox(-0.15, T.w + 0.15, T.top - 0.14, T.top - 0.05, v0, v1, METAL);
      }
      for (const h of T.houses) house(k, T, h, trim, brick, low);
      for (const [a, c] of fencesOf(T)) fenceRun(b, a, c, low);
    });
    b.build(into, { cast: true, receive: true });
  });
}

/** The passages through the rows, paved a hair over the gardens' lawn */
function registerGinnels() {
  GINNELS.forEach((r: Rect, i) =>
    site(`endswest ginnel ${i}`, [r[0] - 0.5, r[1] - 0.5, r[2] + 0.5, r[3] + 0.5], (into) => {
      const b = new Batch();
      const g = new THREE.PlaneGeometry(r[2] - r[0], r[3] - r[1]).rotateX(-Math.PI / 2);
      g.deleteAttribute('uv');
      b.add(g.translate((r[0] + r[2]) / 2, PAVE_Y, (r[1] + r[3]) / 2), FLAGS);
      b.build(into, { cast: false, receive: true });
    })
  );
}

export function registerTerraces(low: boolean) {
  for (const T of TERRACES) registerTerrace(T, low);
  registerGinnels();
}
