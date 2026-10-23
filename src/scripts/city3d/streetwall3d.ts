/*
 * The Trenches built up, on screen (the grit's step 2; the numbers are
 * streetwall.ts), all as sites:
 *
 * - **The tenements**: the kits' shops (kits3d.ts `drawLot()`, infill.ts),
 *   two to a site, in brick with a fire escape up the front (phones leave
 *   the fire escapes out, like downtown's).
 * - **The vacant lots**: bare dirt with rubble and weeds, chain-link along
 *   the street and the back, a billboard on posts (made-up copy), tags on
 *   the neighbours' bare side walls.
 * - **Low commercial**: lock-ups with roller doors (tagged), the auto shop
 *   and body shop (roller doors, one up, an apron with cars, drums and
 *   tyres), the tyre place (stacks out front), the car wash (a canopy over
 *   the bay, two brushes, a kiosk), the scrap yard (a corrugated fence, a
 *   gate, a cabin, piles of crushed cars) and the warehouses (a clad shed,
 *   a loading door, a dock); signs from one atlas (`LOWRISE_NAMES`); trees
 *   along the highway behind the strip; a few people at work.
 *
 * Details near only; walls, roofs, signs at every distance.
 */
import * as THREE from 'three';
import { Batch, canvasTex, FONT_DISPLAY, lit, siteMat, toon } from './kit';
import { METAL, ROOF, glow } from './infill';
import { drawLot } from './kits3d';
import { SLAB as S, addTree } from './world';
import { site } from './tilework';
import { parkedCars, type CarId } from './cars';
import { TRENCH_BLOCKS } from './trenches';
import { LOWRISE, LOWRISE_NAMES, LOW_CARS, TENEMENTS, VACANT, lowFrame, type LowLot, type Vacant } from './streetwall';
import { buildFx, poster, tag, atlasQuad } from './grime';
import type { Idle } from './landmarks';
import type { Pt, Rect } from './downtown';

/** The low lots' signs (made-up names), one row each, and the vacant lots' billboards */
const NAMES = Object.entries(LOWRISE_NAMES) as [Exclude<LowLot['kind'], 'lockups'>, string][];
const BILLBOARDS = ['RIDE THE EL · SECTOR 7 METRO', 'THE BLOCK · SUMMER JAM'];
const SIGN_ROWS = NAMES.length + BILLBOARDS.length;
const SIGNS = (() => {
  const W = 1024;
  const H = 160;
  const colors = ['#ff6a2f', '#ffd23f', '#00eaff', '#2bff88', '#e219e5', '#f3f2f7'];
  const tex = canvasTex(W, H * SIGN_ROWS, (c) => {
    [...NAMES.map(([, n]) => n), ...BILLBOARDS].forEach((text, i) => {
      const y = i * H;
      const bill = i >= NAMES.length;
      const color = colors[i % colors.length];
      if (bill) {
        // A billboard: a painted ad, a band of colour, the words big
        const g = c.createLinearGradient(0, y, W, y + H);
        g.addColorStop(0, '#8000ff');
        g.addColorStop(1, '#e219e5');
        c.fillStyle = g;
        c.fillRect(0, y, W, H);
        c.fillStyle = '#ffd23f';
        c.fillRect(0, y + H - 26, W, 14);
      } else {
        c.fillStyle = '#f3efe4';
        c.fillRect(0, y, W, H);
        c.fillStyle = color;
        c.fillRect(0, y, W, 18);
        c.fillRect(0, y + H - 18, W, 18);
      }
      c.font = `900 96px ${FONT_DISPLAY}`;
      const size = Math.min(96, (96 * (W - 80)) / c.measureText(text).width);
      c.font = `900 ${size}px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = bill ? '#ffffff' : '#141226';
      c.fillText(text, W / 2, y + H / 2 + 4);
    });
  });
  return { mat: siteMat('lowrise-signs', lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.15)) };
})();

const BLOCK_WALL = toon('#8a8698');
const BRICK_LOW = toon('#7a4a40');
const CLAD = toon('#5f6b7a');
const CLAD_LINE = toon('#4b5563');
const DOOR = toon('#77748a');
const DOOR_LINE = toon('#5a576c');
const DARK = toon('#141226');
const APRON = toon('#6e6a80');
const DIRT = toon('#6b5848');
const RUBBLE = ['#8a8698', '#7a4a40', '#9a96b4', '#5a576c'].map((c) => toon(c));
const WEED = toon('#5f7f3f');
const RUST = ['#8a4a2f', '#6b3a2a', '#9a6a3a', '#4f5a6b', '#7a2f2f', '#3d5a4a'].map((c) => toon(c));
const TYRE = toon('#1b1a22');
const DRUM = toon('#2b4f7a');
const BRUSH = toon('#2aabee');
const CANOPY = toon('#2f3a4a');
const FENCE = toon('#6b7280');

const box = (b: Batch, [x0, z0, x1, z1]: Rect, y0: number, y1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
const hash = (a: number, b: number) => {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
};

/** The front's outward normal */
const OUT: Record<LowLot['face'], Pt> = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };

/** A sign board on the building's front, its row from the atlas */
function sign(b: Batch, l: { rect: Rect; face: LowLot['face'] }, row: number, u: number, v: number, y: number, w: number, h: number) {
  const F = lowFrame(l);
  const [x, z] = F.at(u, v);
  const n = OUT[l.face];
  b.add(atlasQuad(row, SIGN_ROWS, w, h, n, x + n[0] * 0.004, y, z + n[1] * 0.004), SIGNS.mat);
}

/** A roller door on a front at v: u0 to u1, up to y1; `open` shows the dark inside instead */
function rollerDoor(b: Batch, l: LowLot, u0: number, u1: number, v: number, y1: number, open: boolean) {
  const F = lowFrame(l);
  if (open) {
    box(b, F.rect(u0, v - 0.02, u1, v + 0.01), S, S + y1, DARK);
    return;
  }
  box(b, F.rect(u0, v - 0.04, u1, v + 0.01), S, S + y1, DOOR);
  b.detail(() => {
    for (let y = S + 0.15; y < S + y1 - 0.05; y += 0.15) box(b, F.rect(u0, v - 0.05, u1, v - 0.04), y, y + 0.02, DOOR_LINE);
  });
}

/** A building: four walls in its stuff, a roof slab tucked in, a parapet's cap */
function shed(b: Batch, r: Rect, h: number, wall: THREE.Material) {
  box(b, r, S, S + h, wall);
  box(b, [r[0] - 0.04, r[1] - 0.04, r[2] + 0.04, r[3] + 0.04], S + h, S + h + 0.08, ROOF);
}

function lowLotDraw(b: Batch, fxb: Batch, l: LowLot, low: boolean) {
  const F = lowFrame(l);
  const n = OUT[l.face];
  const { W, D } = F;
  // The lot's ground (paved), the building
  box(b, l.rect, S, S + 0.008, APRON);
  const front = l.kind === 'lockups' ? 1.2 : l.kind === 'auto' || l.kind === 'body' ? 3.2 : l.kind === 'tyres' ? 2.6 : l.kind === 'warehouse' ? 2.2 : 0;
  const row = NAMES.findIndex(([k]) => k === l.kind);
  if (l.kind === 'lockups') {
    shed(b, l.body, l.h, BLOCK_WALL);
    const doors = Math.max(1, Math.floor(W / 2.6));
    const dw = W / doors;
    for (let i = 0; i < doors; i++) {
      rollerDoor(b, l, i * dw + 0.25, (i + 1) * dw - 0.25, front, 1.6, false);
      if (hash(l.rect[0] + i, l.rect[1]) < 0.6) {
        const [x, z] = F.at((i + 0.5) * dw, front - 0.056);
        tag(fxb, i + Math.floor(l.rect[0]), Math.min(1.6, dw - 0.6), n, x + n[0] * 0.002, S + 0.7, z + n[1] * 0.002);
      }
    }
    return;
  }
  if (l.kind === 'auto' || l.kind === 'body' || l.kind === 'tyres' || l.kind === 'warehouse') {
    shed(b, l.body, l.h, l.kind === 'warehouse' ? CLAD : l.kind === 'tyres' ? BRICK_LOW : BLOCK_WALL);
    if (l.kind === 'warehouse')
      b.detail(() => {
        // Cladding ribs along the front
        for (let u = 0.5; u < W - 0.4; u += 0.5) box(b, F.rect(u - 0.02, front - 0.03, u + 0.02, front), S + 0.1, S + l.h - 0.1, CLAD_LINE);
      });
    // Doors: two bays on the workshops (one up), one wide door on the warehouse, a shop door and window on the tyre place
    if (l.kind === 'tyres') {
      box(b, F.rect(W / 2 - 0.4, front - 0.02, W / 2 + 0.4, front + 0.01), S, S + 1.2, DARK);
      box(b, F.rect(1.2, front - 0.02, W / 2 - 0.7, front + 0.01), S + 0.4, S + 1.3, toon('#24305a'));
    } else if (l.kind === 'warehouse') {
      rollerDoor(b, l, W / 2 - 1.5, W / 2 + 1.5, front, 2.4, false);
      // A loading dock under it
      box(b, F.rect(W / 2 - 1.8, front - 0.8, W / 2 + 1.8, front), S, S + 0.4, APRON);
      const [x, z] = F.at(W / 2, front - 0.056);
      if (hash(l.rect[1], 3) < 0.7) tag(fxb, Math.floor(l.rect[1]), 2.4, n, x + n[0] * 0.002, S + 1.2, z + n[1] * 0.002);
    } else {
      const half = W / 2;
      rollerDoor(b, l, 0.4, half - 0.3, front, 2.0, false);
      rollerDoor(b, l, half + 0.3, W - 0.4, front, 2.0, true);
    }
    // The sign over the front
    if (row >= 0) sign(b, l, row, W / 2, front, S + l.h - 0.35, Math.min(W - 0.6, 5.5), 0.55);
    b.detail(() => {
      if (l.kind === 'tyres') {
        // Stacks of tyres either side of the door
        for (const u of [0.9, W - 0.9])
          for (let k = 0; k < (low ? 3 : 5); k++) {
            const [x, z] = F.at(u, 2.05);
            b.add(new THREE.TorusGeometry(0.3, 0.12, 6, 12).rotateX(Math.PI / 2).translate(x, S + 0.12 + k * 0.17, z), TYRE);
          }
      } else if (l.kind !== 'warehouse') {
        // Oil drums and a tyre stack by the open bay; a light over each door
        for (const [u, dv] of [
          [W - 0.5, 0.5],
          [W - 0.9, 0.5],
        ] as Pt[]) {
          const [x, z] = F.at(u, front - dv);
          b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 10).translate(x, S + 0.3, z), DRUM);
        }
        const [tx, tz] = F.at(0.5, front - 0.5);
        for (let k = 0; k < 3; k++) b.add(new THREE.TorusGeometry(0.28, 0.1, 6, 12).rotateX(Math.PI / 2).translate(tx, S + 0.1 + k * 0.15, tz), TYRE);
        for (const u of [W / 4, (3 * W) / 4]) {
          const [x, z] = F.at(u, front - 0.12);
          b.add(new THREE.BoxGeometry(0.3, 0.06, 0.12).translate(x, S + 2.2, z), glow('#ffd8a0'));
        }
      }
    });
    return;
  }
  if (l.kind === 'carwash') {
    const bay = W - 2.6;
    // The kiosk, the canopy on its posts with the sign along its fascia, the brushes, a wet floor
    shed(b, l.body, l.h, BLOCK_WALL);
    box(b, F.rect(W - 2.0, 1.48, W - 0.5, 1.52), S + 0.8, S + 1.6, toon('#24305a'));
    for (const u of [0.3, bay - 0.1]) for (const v of [1.2, D - 0.8]) box(b, F.rect(u - 0.08, v - 0.08, u + 0.08, v + 0.08), S, S + 2.6, CANOPY);
    box(b, F.rect(0, 0.9, bay + 0.2, D - 0.5), S + 2.6, S + 2.8, CANOPY);
    if (row >= 0) sign(b, l, row, bay / 2, 0.9, S + 2.7, Math.min(bay, 5.5), 0.5);
    box(b, F.rect(0.2, 1.0, bay, D - 0.6), S + 0.008, S + 0.014, toon('#3b5a7a'));
    for (const u of [0.9, bay - 0.7]) {
      const [x, z] = F.at(u, D / 2);
      b.add(new THREE.CylinderGeometry(0.35, 0.35, 1.8, 10).translate(x, S + 1.0, z), BRUSH);
      b.detail(() => b.add(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 6).translate(x, S + 1.25, z), METAL));
    }
    return;
  }
  if (l.kind === 'scrap') {
    // The corrugated fence round the yard (the gate in the front), the cabin, piles of crushed cars, the sign over the gate
    const gate: [number, number] = [W / 2 - 1.6, W / 2 + 1.6];
    const t = 0.1;
    const runs: [number, number, number, number][] = [
      [0, 0, gate[0], t],
      [gate[1], 0, W, t],
      [0, D - t, W, D],
      [0, 0, t, D],
      [W - t, 0, W, D],
    ];
    for (const [u0, v0, u1, v1] of runs) box(b, F.rect(u0, v0, u1, v1), S, S + 2.2, FENCE);
    b.detail(() => {
      for (const [u0, v0, u1] of runs.slice(0, 2))
        for (let u = u0 + 0.3; u < u1 - 0.1; u += 0.3) box(b, F.rect(u - 0.03, v0 - 0.02, u + 0.03, v0), S + 0.05, S + 2.15, CLAD_LINE);
    });
    // Tags and a bill on the fence's street side
    for (const [u0, , u1] of runs.slice(0, 2)) {
      const [x, z] = F.at((u0 + u1) / 2, -0.006);
      tag(fxb, Math.floor(l.rect[1] + u0), Math.min(2.2, u1 - u0 - 0.4), n, x, S + 1.1, z);
    }
    {
      const [x, z] = F.at(gate[0] - 0.6, -0.008);
      poster(fxb, 2, 0.9, n, x, S + 1.6, z);
    }
    shed(b, l.body, l.h, toon('#c9a26a'));
    box(b, [l.body[0] - 0.01, l.body[1] - 0.01, l.body[2] + 0.01, l.body[3] + 0.01], S + 1.0, S + 1.5, toon('#24305a'));
    for (const [u, v] of [
      [2, D - 2.2],
      [W / 2, D - 2.2],
      [W - 2.4, D - 2.6],
      [2.2, D / 2 - 0.4],
    ] as Pt[]) {
      const layers = 3 + Math.floor(hash(u, v) * 3);
      for (let k = 0; k < layers; k++) {
        const [x, z] = F.at(u + (hash(k, u) - 0.5) * 0.3, v + (hash(v, k) - 0.5) * 0.3);
        b.add(new THREE.BoxGeometry(2.0, 0.28, 1.4).rotateY((hash(k, v) - 0.5) * 0.4).translate(x, S + 0.14 + k * 0.28, z), RUST[(k + Math.floor(u)) % RUST.length]);
      }
    }
    // The sign up over the gate on two posts
    const [g0, g1] = [F.at(gate[0], 0.05), F.at(gate[1], 0.05)];
    for (const [x, z] of [g0, g1]) b.add(new THREE.BoxGeometry(0.12, 3.0, 0.12).translate(x, S + 1.5, z), METAL);
    if (row >= 0) sign(b, l, row, W / 2, 0.0, S + 2.8, gate[1] - gate[0] + 0.3, 0.5);
    return;
  }
}

/** A vacant lot: dirt, rubble and weeds, open to the street (its chain-link came out in the trim); a billboard; tags on the neighbours' side walls */
function vacantDraw(b: Batch, fxb: Batch, v: Vacant, i: number, low: boolean) {
  const F = lowFrame(v);
  const n = OUT[v.face];
  const { W, D } = F;
  box(b, v.rect, S, S + 0.01, DIRT);
  // Rubble and weeds (near)
  b.detail(() => {
    for (let k = 0; k < (low ? 8 : 18); k++) {
      const [x, z] = F.at(0.4 + hash(k, i) * (W - 0.8), 0.7 + hash(i, k) * (D - 1.4));
      const s = 0.12 + hash(k + 3, i) * 0.22;
      if (k % 3 === 2) b.add(new THREE.ConeGeometry(0.12, 0.35, 5).translate(x, S + 0.17, z), WEED);
      else b.add(new THREE.IcosahedronGeometry(s, 0).scale(1, 0.6, 1).translate(x, S + s * 0.5, z), RUBBLE[k % RUBBLE.length]);
    }
  });
  // A billboard on two posts at the back, facing the street
  const bw = Math.min(W - 0.4, 3.4);
  for (const u of [W / 2 - bw / 3, W / 2 + bw / 3]) {
    const [x, z] = F.at(u, D - 0.9);
    b.add(new THREE.BoxGeometry(0.12, 3.6, 0.12).translate(x, S + 1.8, z), METAL);
  }
  const [bx, bz] = F.at(W / 2, D - 0.95);
  box(b, [bx - (n[0] ? 0.05 : bw / 2 + 0.06), bz - (n[0] ? bw / 2 + 0.06 : 0.05), bx + (n[0] ? 0.05 : bw / 2 + 0.06), bz + (n[0] ? bw / 2 + 0.06 : 0.05)], S + 2.4, S + 3.75, DARK);
  b.add(atlasQuad(NAMES.length + (i % BILLBOARDS.length), SIGN_ROWS, bw, 1.2, n, bx + n[0] * 0.056, S + 3.07, bz + n[1] * 0.056), SIGNS.mat);
  // The neighbours' bare side walls, tagged low down, facing into the lot
  const o = F.at(0, 0);
  const t1 = F.at(1, 0);
  const tu: Pt = [t1[0] - o[0], t1[1] - o[1]];
  for (const [side, u] of [
    [1, 0.006],
    [-1, W - 0.006],
  ] as [number, number][]) {
    const [x, z] = F.at(u, D / 2);
    tag(fxb, i * 2 + (side > 0 ? 1 : 0) + 5, Math.min(2.2, D - 1.2), [tu[0] * side, tu[1] * side], x, S + 0.9, z);
  }
}

export function buildStreetWalls(scene: THREE.Scene, crowd: Idle[], opts: { low: boolean }) {
  const low = opts.low;
  // The tenements, two to a site (none takes long to build), block by block
  const byBlock = new Map<string, typeof TENEMENTS>();
  for (const t of TENEMENTS) byBlock.set(t.block, [...(byBlock.get(t.block) ?? []), t]);
  for (const [id, lots] of byBlock)
    for (let n = 0; n < lots.length; n += 2) {
      const mine = lots.slice(n, n + 2);
      const rect: Rect = [Math.min(...mine.map((o) => o.box[0])), Math.min(...mine.map((o) => o.box[1])), Math.max(...mine.map((o) => o.box[2])), Math.max(...mine.map((o) => o.box[3]))];
      site(`trench tenements ${id} ${n / 2}`, rect, (into) => {
        const b = new Batch();
        for (const o of mine) drawLot(b, o, low);
        b.build(into);
      });
    }
  VACANT.forEach((v, i) =>
    site(`trench vacant ${v.id}`, v.rect, (into) => {
      const b = new Batch();
      const fxb = new Batch();
      vacantDraw(b, fxb, v, i, low);
      b.build(into);
      buildFx(fxb, into);
    })
  );
  for (const l of LOWRISE)
    site(`trench low ${l.id}`, l.rect, (into) => {
      const b = new Batch();
      const fxb = new Batch();
      fxb.lod = 'near';
      lowLotDraw(b, fxb, l, low);
      b.build(into);
      buildFx(fxb, into);
    });
  // The cars on the aprons and in the car wash; trees along the highway behind the strip; people at work
  parkedCars(scene, S, LOW_CARS as [CarId, number, number, number, string][]);
  const w = TRENCH_BLOCKS.find((b) => b.row === 'W')!;
  const [x0, z0, , z1] = [Math.min(...w.poly.map((p) => p[0])), Math.min(...w.poly.map((p) => p[1])), Math.max(...w.poly.map((p) => p[0])), Math.max(...w.poly.map((p) => p[1]))];
  for (let z = z0 + 1.5; z < z1 - 1; z += 3.4) if (hash(z, 7) < 0.8) addTree(x0 + 1.2, z, 0.9 + hash(z, 3) * 0.35, hash(z, 11) < 0.4);
  for (const l of LOWRISE) {
    if (l.kind === 'lockups' || l.kind === 'warehouse') continue;
    const F = lowFrame(l);
    const [u, v] = l.kind === 'carwash' ? [F.W - 1.2, 0.9] : l.kind === 'scrap' ? [F.W - 2.1, 3.3] : [F.W * 0.55, 2.7];
    const [x, z] = F.at(u, v);
    const n = OUT[l.face];
    crowd.push({ x, z, ry: Math.atan2(n[0], n[1]), act: 'look' });
  }
}
