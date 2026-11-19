/*
 * The council rows, the bungalows, the corner shops, the community centre and the allotments drawn (docs/south-plan.md
 * Phase 3, step 3d; the data is council.ts), in the village's chunk (village3d.ts calls `registerCouncil()`).
 *
 * - **A pair of semis**: one shape made once and copied to every pair (stretched to its frontage, level on its base):
 *   walls (pale brick, render or pebble-dash), a hipped roof, a shared chimney, a door at each end (its colour), a
 *   porch over some, windows lit at night by each home's rooms; a hedged front garden with a path to each door.
 * - **A bungalow**: the house and its garage beside it (to its left or right), a low hipped roof, a lawn and a drive,
 *   a caravan on a few drives.
 * - **A corner shop** (two storeys, its shopfront and sign) and **the community centre** (one storey, boarded).
 * - **The allotments**: the plots' soil, grass between, sheds on some, a fence round with a gate.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, roundRect, siteMat, toon } from './kit';
import { site } from './tilework';
import { poster, tag } from './grime';
import { addSolids } from './solids';
import { COVER, PLANT, SOIL, STONE } from './palette';
import { ALLOTMENTS, ALLOTMENT_GATE, ALLOTMENT_SOLIDS, FENCE_H, FENCE_SOLIDS, GARDEN_FENCES, BUNGALOW, BUNGALOWS, CENTRE, COMMUNITY_CENTRE, CORNER, CORNER_SHOPS, COUNCIL_SOLIDS, PLOTS, SEMI, SEMIS, lotRing, type Bungalow, type Finish, type Lot, type Semi } from './council';

type Pt = [number, number];

/* ---------- Materials ---------- */

const FINISH: Record<Finish, THREE.Material> = { brick: toon('#b8946e'), render: toon('#e8e1cf'), pebbledash: toon('#bdb5a5') };
const TILE = toon('#5a4a46');
const CHIMNEY = toon('#8a5a44');
const WIN_LIT = neon('#ffd99a', 0.12, 1.05);
const WIN_DARK = toon('#27324a');
const CANOPY = toon('#e8e2d4');
const GARAGE_DOOR = toon('#c9c4bc');
const CARAVAN = toon('#efeae0');
const CANOPY_TRIM = toon('#7e8aa0');
const RUBBER = toon('#24232c');
const BIN = toon('#2f4f3a');
const SHOPGLASS = neon('#ffe7b8', 0.22, 1.2);
const PLY = toon('#a3804f');
const LAWN = toon(COVER.garden);
const HEDGE = toon(PLANT.hedge);
const PATH = toon(STONE.paving);
const BED = toon(SOIL.bed);
const SHED = toon('#5f7a4a');
const SHED_DOOR = toon('#46593a');
const BUTT = toon('#2f3a4a');
const FENCE = toon('#6e6a8c');
const TIMBER = toon('#7a5a3c');
const POST = toon('#5b412b');
const doors = new Map<string, THREE.Material>();
const doorOf = (c: string) => doors.get(c) ?? (doors.set(c, toon(c)), doors.get(c)!);

/* ---------- Shapes in a lot's frame (x along its front, z out of it, y up from its base) ---------- */

function tris(list: { p: number[][]; n: number[] }[]) {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const { p, n } of list) {
    const [a, b, c] = p.map((q) => new THREE.Vector3(...q));
    const f = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const order = f.dot(new THREE.Vector3(...n)) >= 0 ? [a, b, c] : [a, c, b];
    const nn = new THREE.Vector3(...n).normalize();
    for (const q of order) (pos.push(q.x, q.y, q.z), nor.push(nn.x, nn.y, nn.z));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex([...Array(pos.length / 3).keys()]);
  return g;
}
const quad = (a: number[], b: number[], c: number[], d: number[], n: number[]) => [{ p: [a, b, c], n }, { p: [a, c, d], n }];
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
  const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  g.deleteAttribute('uv');
  return g;
};
const merge = (gs: THREE.BufferGeometry[]) => {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const g of gs) {
    const ng = g.index ? g.toNonIndexed() : g;
    pos.push(...ng.getAttribute('position').array);
    nor.push(...ng.getAttribute('normal').array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex([...Array(pos.length / 3).keys()]);
  return out;
};
const win = (x: number, y0: number, y1: number, w: number, z = 0.012) => tris(quad([x - w / 2, y0, z], [x + w / 2, y0, z], [x + w / 2, y1, z], [x - w / 2, y1, z], [0, 0, 1]));
/** A hipped roof over x0..x1, z0..z1 from its eaves y, rising `rise`, its ridge along x (shortened by the hips) */
function hipped(x0: number, x1: number, z0: number, z1: number, y: number, rise: number) {
  const zm = (z0 + z1) / 2;
  const hip = Math.min(rise * 1.2, (x1 - x0) / 2 - 0.1);
  const [r0, r1] = [x0 + hip, x1 - hip];
  return tris([
    ...quad([x0, y, z1], [x1, y, z1], [r1, y + rise, zm], [r0, y + rise, zm], [0, z1 - zm, rise]),
    ...quad([x1, y, z0], [x0, y, z0], [r0, y + rise, zm], [r1, y + rise, zm], [0, z1 - zm, -rise]),
    { p: [[x0, y, z0], [x0, y, z1], [r0, y + rise, zm]], n: [-rise, hip, 0] },
    { p: [[x1, y, z1], [x1, y, z0], [r1, y + rise, zm]], n: [rise, hip, 0] },
  ]);
}

/* ---------- The semis (a pair, 6.8 wide; each home its half) ---------- */

const SW = 6.8;
const { depth: SD, eaves: SE, roof: SR } = SEMI;
/** A pane on the back wall (facing out of it) */
const winBack = (x: number, y0: number, y1: number, w: number, z: number) => tris(quad([x - w / 2, y0, z], [x + w / 2, y0, z], [x + w / 2, y1, z], [x - w / 2, y1, z], [0, 0, -1]));
/** The front's windows and the back's (x, y0, y1, width, the wall's z: + out of the front, - out of the back) */
const FRONT_WINS: [number, number, number, number, number][] = [-1, 1].flatMap((e): [number, number, number, number, number][] => [
  [e * 1.25, 0.35, 1.05, 1.2, 0],
  [e * 1.25, 1.4, 2.0, 1.2, 0],
  [e * (SW / 2 - 0.75), 1.5, 1.95, 0.5, 0],
]);
const BACK_WINS: [number, number, number, number, number][] = [-1, 1].flatMap((e): [number, number, number, number, number][] => [
  [e * 1.1, 0.45, 1.0, 0.9, -SD - 0.012],
  [e * 1.25, 1.4, 2.0, 1.0, -SD - 0.012],
  [e * (SW / 2 - 0.85), 1.5, 1.95, 0.5, -SD - 0.012],
]);
/** A window's frame: four bars standing 4 cm off the wall round it, a mullion up the middle of a wide one */
function frameAround(x: number, y0: number, y1: number, w: number, z: number) {
  const d = Math.sign(z || 1) * 0.02 + z;
  const t = 0.06;
  const bars = [box(w + t * 2, t, 0.04, x, y1 + t / 2, d), box(w + t * 2, t, 0.04, x, y0 - t / 2, d), box(t, y1 - y0, 0.04, x - w / 2 - t / 2, (y0 + y1) / 2, d), box(t, y1 - y0, 0.04, x + w / 2 + t / 2, (y0 + y1) / 2, d)];
  if (w > 0.8) bars.push(box(0.045, y1 - y0, 0.03, x, (y0 + y1) / 2, d));
  return bars;
}
const SEMI_PIECES = (() => {
  const h = SW / 2;
  return {
    body: box(SW, SE, SD, 0, SE / 2, -SD / 2),
    plinth: box(SW, 1, SD, 0, -0.5, -SD / 2),
    roof: hipped(-h - 0.25, h + 0.25, -SD - 0.25, 0.25, SE, SR),
    chimney: box(0.7, 1.0, 0.5, 0, SE + SR - 0.1, -SD / 2),
    // (each half: its door at its outer end, its ground and first-floor windows towards the middle, a small one over
    // the door; the left half's (x < 0) pieces, the right's mirrored)
    doorL: win(-h + 0.75, 0.04, 1.05, 0.6),
    doorR: win(h - 0.75, 0.04, 1.05, 0.6),
    winL: merge([win(-1.25, 0.35, 1.05, 1.2), win(-1.25, 1.4, 2.0, 1.2), win(-h + 0.75, 1.5, 1.95, 0.5)]),
    winR: merge([win(1.25, 0.35, 1.05, 1.2), win(1.25, 1.4, 2.0, 1.2), win(h - 0.75, 1.5, 1.95, 0.5)]),
    porchL: merge([box(1.1, 0.08, 0.7, -h + 0.75, 1.2, 0.35)]),
    porchR: merge([box(1.1, 0.08, 0.7, h - 0.75, 1.2, 0.35)]),
    // The map polish plan's Phase 2: every window framed (white frames standing off the wall, a mullion across the wide
    // ones: at every distance, so a window isn't a flat dark slot), sills up close; the back (a kitchen window and a
    // back door down, two windows up, each half's) and a landing window in each end wall
    frames: merge([...FRONT_WINS, ...BACK_WINS].flatMap(([x, y0, y1, w, z]) => frameAround(x, y0, y1, w, z))),
    sills: merge([...FRONT_WINS, ...BACK_WINS].filter(([, y0]) => y0 > 0.2).map(([x, y0, , w, z]) => box(w + 0.16, 0.05, 0.1, x, y0 - 0.06, z + Math.sign(z || 1) * 0.05))),
    backL: merge(BACK_WINS.filter(([x]) => x < 0).map(([x, y0, y1, w, z]) => winBack(x, y0, y1, w, z))),
    backR: merge(BACK_WINS.filter(([x]) => x > 0).map(([x, y0, y1, w, z]) => winBack(x, y0, y1, w, z))),
    backDoorL: winBack(-h + 0.75, 0.04, 1.05, 0.6, -SD - 0.012),
    backDoorR: winBack(h - 0.75, 0.04, 1.05, 0.6, -SD - 0.012),
    ends: merge([-1, 1].map((e) => tris(quad([e * (h + 0.012), 1.45, -SD / 2 - 0.3], [e * (h + 0.012), 1.45, -SD / 2 + 0.3], [e * (h + 0.012), 1.95, -SD / 2 + 0.3], [e * (h + 0.012), 1.95, -SD / 2 - 0.3], [e, 0, 0])))),
  };
})();
function frameOf(l: Lot, unit: number, sy = 1, mirror = false) {
  const [nx, nz] = l.face;
  const sx = (l.w / unit) * (mirror ? -1 : 1);
  return new THREE.Matrix4().makeBasis(new THREE.Vector3(nz * sx, 0, -nx * sx), new THREE.Vector3(0, sy, 0), new THREE.Vector3(nx, 0, nz)).setPosition(l.at[0], l.base, l.at[1]);
}
function drawSemis(b: Batch, list: Semi[], low: boolean) {
  const P = SEMI_PIECES;
  const F = (s: Semi) => frameOf(s, SW);
  const by = <K,>(key: (s: Semi) => K) => {
    const m = new Map<K, Semi[]>();
    for (const s of list) m.set(key(s), [...(m.get(key(s)) ?? []), s]);
    return m;
  };
  b.detail(() => {
    for (const [f, ss] of by((s) => s.finish)) {
      b.instances(P.body, FINISH[f], ss.map(F));
      b.instances(P.plinth, FINISH[f], ss.map((s) => frameOf(s, SW, s.base - s.low + 0.12)));
    }
    b.instances(P.roof, TILE, list.map(F));
    b.instances(P.chimney, CHIMNEY, list.map(F));
    for (const [c, ss] of by((s) => s.doors[0])) b.instances(P.doorL, doorOf(c), ss.map(F));
    for (const [c, ss] of by((s) => s.doors[1])) b.instances(P.doorR, doorOf(c), ss.map(F));
    b.instances(P.winL, WIN_LIT, list.filter((s) => s.lit & 1).map(F));
    b.instances(P.winL, WIN_DARK, list.filter((s) => !(s.lit & 1)).map(F));
    b.instances(P.winR, WIN_LIT, list.filter((s) => s.lit & 4).map(F));
    b.instances(P.winR, WIN_DARK, list.filter((s) => !(s.lit & 4)).map(F));
    b.instances(P.porchL, CANOPY, list.filter((s) => s.porch[0]).map(F));
    b.instances(P.porchR, CANOPY, list.filter((s) => s.porch[1]).map(F));
    b.instances(P.frames, CANOPY, list.map(F));
    b.instances(P.backL, WIN_LIT, list.filter((s) => s.lit & 2).map(F));
    b.instances(P.backL, WIN_DARK, list.filter((s) => !(s.lit & 2)).map(F));
    b.instances(P.backR, WIN_LIT, list.filter((s) => s.lit & 8).map(F));
    b.instances(P.backR, WIN_DARK, list.filter((s) => !(s.lit & 8)).map(F));
    for (const [c, ss] of by((s) => s.doors[0])) b.instances(P.backDoorL, doorOf(c), ss.map(F));
    for (const [c, ss] of by((s) => s.doors[1])) b.instances(P.backDoorR, doorOf(c), ss.map(F));
    b.instances(P.ends, WIN_DARK, list.map(F));
  }, 'all');
  if (low) return;
  b.detail(() => b.instances(P.sills, CANOPY, list.map(F)));
}

/* ---------- The bungalows (8 wide: the house 5.4, the garage 2.6) ---------- */

const BW = 8;
const BUNG_PIECES = (() => {
  const [hx0, hx1] = [-BW / 2, -BW / 2 + BUNGALOW.house];
  const [gx0, gx1] = [hx1, BW / 2];
  const E = BUNGALOW.eaves;
  return {
    body: box(hx1 - hx0, E, BUNGALOW.depth, (hx0 + hx1) / 2, E / 2, -BUNGALOW.depth / 2),
    plinth: box(BW, 1, BUNGALOW.depth, 0, -0.5, -BUNGALOW.depth / 2),
    garage: box(gx1 - gx0, 1.7, BUNGALOW.depth - 0.6, (gx0 + gx1) / 2, 0.85, -BUNGALOW.depth / 2 - 0.3),
    roof: hipped(hx0 - 0.3, hx1 + 0.3, -BUNGALOW.depth - 0.3, 0.3, E, BUNGALOW.roof),
    garageRoof: box(gx1 - gx0 + 0.2, 0.12, BUNGALOW.depth - 0.4, (gx0 + gx1) / 2, 1.76, -BUNGALOW.depth / 2 - 0.3),
    garageDoor: win((gx0 + gx1) / 2, 0.02, 1.55, gx1 - gx0 - 0.4, -0.288),
    door: win(hx0 + 3.9, 0.04, 1.2, 0.65),
    wins: merge([win(hx0 + 1.4, 0.45, 1.45, 1.8), win(hx0 + 4.9, 0.55, 1.35, 0.6)]),
    // (the back, the map polish plan's Phase 2: a big window, the kitchen's and the back door; frames on every window)
    backWins: merge([winBack(hx0 + 1.4, 0.45, 1.4, 1.5, -BUNGALOW.depth - 0.012), winBack(hx0 + 3.5, 0.6, 1.3, 0.8, -BUNGALOW.depth - 0.012)]),
    backDoor: winBack(hx0 + 4.7, 0.04, 1.2, 0.65, -BUNGALOW.depth - 0.012),
    frames: merge(
      (
        [
          [hx0 + 1.4, 0.45, 1.45, 1.8, 0],
          [hx0 + 4.9, 0.55, 1.35, 0.6, 0],
          [hx0 + 1.4, 0.45, 1.4, 1.5, -BUNGALOW.depth - 0.012],
          [hx0 + 3.5, 0.6, 1.3, 0.8, -BUNGALOW.depth - 0.012],
        ] as [number, number, number, number, number][]
      ).flatMap(([x, y0, y1, w, z]) => frameAround(x, y0, y1, w, z))
    ),
  };
})();
function drawBungalows(b: Batch, list: Bungalow[]) {
  const P = BUNG_PIECES;
  // (its garage to its right as drawn; mirrored where it's to its left: the frame flipped, its triangles turned back)
  const F = (s: Bungalow) => frameOf(s, BW, 1, s.garageLeft);
  const flip = (g: THREE.BufferGeometry) => {
    const c = g.clone();
    const idx = c.index!.array as Uint16Array | Uint32Array;
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    c.index!.needsUpdate = true;
    // (the mirrored frame turns the normals itself, as it's applied; only the winding needs turning back)
    return c;
  };
  const put = (g: THREE.BufferGeometry, m: THREE.Material, ss: Bungalow[]) => {
    b.instances(g, m, ss.filter((s) => !s.garageLeft).map(F));
    b.instances(flip(g), m, ss.filter((s) => s.garageLeft).map(F));
  };
  b.detail(() => {
    for (const f of ['brick', 'render'] as Finish[]) {
      const ss = list.filter((s) => s.finish === f);
      put(P.body, FINISH[f], ss);
      put(P.garage, FINISH[f], ss);
      b.instances(P.plinth, FINISH[f], ss.map((s) => frameOf(s, BW, s.base - s.low + 0.12)));
    }
    put(P.roof, TILE, list);
    put(P.garageRoof, TILE, list);
    put(P.garageDoor, GARAGE_DOOR, list);
    for (const c of new Set(list.map((s) => s.door))) put(P.door, doorOf(c), list.filter((s) => s.door === c));
    put(P.wins, WIN_LIT, list.filter((s) => s.lit & 1));
    put(P.wins, WIN_DARK, list.filter((s) => !(s.lit & 1)));
    put(P.backWins, WIN_LIT, list.filter((s) => s.lit & 2));
    put(P.backWins, WIN_DARK, list.filter((s) => !(s.lit & 2)));
    for (const c of new Set(list.map((s) => s.door))) put(P.backDoor, doorOf(c), list.filter((s) => s.door === c));
    put(P.frames, CANOPY, list);
    // (a caravan on the drive, in front of the garage)
    // (a touring caravan, not a box: its body on its wheels, a window band round it, a door, the A-frame to the hitch)
    const cx = BW / 2 - 1.3;
    const cz = BUNGALOW.front - 1.9;
    const vans = list.filter((s) => s.caravan);
    put(merge([box(1.7, 1.35, 3.2, cx, 1.0, cz), box(1.6, 0.12, 3.0, cx, 1.73, cz)]), CARAVAN, vans);
    put(merge([box(1.72, 0.32, 2.4, cx, 1.28, cz - 0.1), box(1.4, 0.4, 0.02, cx, 1.25, cz + 1.61), box(1.4, 0.4, 0.02, cx, 1.25, cz - 1.61)]), WIN_DARK, vans);
    put(merge([box(0.02, 1.05, 0.55, cx - 0.86, 0.95, cz + 0.9), box(1.72, 0.08, 3.22, cx, 0.62, cz)]), CANOPY_TRIM, vans);
    put(merge([box(1.9, 0.5, 0.5, cx, 0.33, cz - 0.2), box(0.08, 0.08, 1.0, cx, 0.4, cz + 2.05), box(0.12, 0.35, 0.12, cx, 0.22, cz + 2.5)]), RUBBER, vans);
  }, 'all');
}

/* ---------- The gardens, the hedges, the drives (on the rolling ground: lifted) ---------- */

const ON = 0.15 + 0.006;
function flat(b: Batch, ring: Pt[], y: number, m: THREE.Material) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)))).rotateX(-Math.PI / 2).translate(0, y, 0);
  g.deleteAttribute('uv');
  b.add(g, m);
}
function along(b: Batch, a: Pt, c: Pt, w: number, y0: number, y1: number, m: THREE.Material) {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (l < 1e-3) return;
  const g = new THREE.BoxGeometry(l, y1 - y0, w).rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0])).translate((a[0] + c[0]) / 2, (y0 + y1) / 2, (a[1] + c[1]) / 2);
  g.deleteAttribute('uv');
  b.add(g, m);
}
const inFrame = (l: Lot, u: number, v: number): Pt => [l.at[0] + l.face[1] * u + l.face[0] * v, l.at[1] - l.face[0] * u + l.face[1] * v];
function drawGardens(b: Batch, semis: Semi[], bungalows: Bungalow[]) {
  for (const s of semis) {
    flat(b, lotRing(s, SEMI.front - 0.05, 0), ON, LAWN);
    flat(b, lotRing({ ...s, at: [s.at[0] - s.face[0] * SEMI.depth, s.at[1] - s.face[1] * SEMI.depth] }, 0, SEMI.rear), ON, LAWN);
    // (the hedge along the front, a gap at each door's path; the paths)
    const sx = s.w / SW;
    const gaps = [-(SW / 2 - 0.75) * sx, (SW / 2 - 0.75) * sx];
    const v = SEMI.front - 0.35;
    const runs: [number, number][] = [[-s.w / 2, gaps[0] - 0.45], [gaps[0] + 0.45, gaps[1] - 0.45], [gaps[1] + 0.45, s.w / 2]];
    for (const [u0, u1] of runs) along(b, inFrame(s, -u0, v), inFrame(s, -u1, v), 0.5, 0.15, 0.85, HEDGE);
    for (const u of gaps) along(b, inFrame(s, -u, 0.05), inFrame(s, -u, SEMI.front - 0.05), 0.8, ON, ON + 0.004, PATH);
  }
  // The back gardens fenced (the map polish plan's Phase 2: they ran open into each other and the fields): lap panels
  // to `FENCE_H`, a post every 1.8 over them (council.ts `GARDEN_FENCES`, solid)
  const mine = new Set([...semis, ...bungalows].map((l) => l.id));
  for (const { lot, run: [p, q] } of GARDEN_FENCES) {
    if (!mine.has(lot)) continue;
    along(b, p, q, 0.04, 0.15, FENCE_H, TIMBER);
    const k = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 1.8));
    for (let j = 0; j <= k; j++) {
      const [x, z] = [p[0] + ((q[0] - p[0]) * j) / k, p[1] + ((q[1] - p[1]) * j) / k];
      b.add(new THREE.BoxGeometry(0.09, 1.0, 0.09).translate(x, 0.15 + 0.5, z), POST);
    }
  }
  bungalows.forEach((s) => {
    flat(b, lotRing({ ...s, at: [s.at[0] - s.face[0] * BUNGALOW.depth, s.at[1] - s.face[1] * BUNGALOW.depth] }, 0, BUNGALOW.rear), ON, LAWN);
  });
  for (const s of bungalows) {
    flat(b, lotRing(s, BUNGALOW.front - 0.05, 0), ON, LAWN);
    const gu = (s.garageLeft ? -1 : 1) * (BW / 2 - 1.3) * (s.w / BW);
    along(b, inFrame(s, -gu, 0.05), inFrame(s, -gu, BUNGALOW.front - 0.05), 2.4, ON, ON + 0.004, PATH);
  }
}

/* ---------- Corner shops, the community centre ---------- */

const SIGNS = (() => {
  const W = 512;
  const H = 64;
  const tex = canvasTex(W, H * Math.max(1, CORNER_SHOPS.length), (c) => {
    CORNER_SHOPS.forEach((s, i) => {
      const y = i * H;
      c.fillStyle = '#14121f';
      c.fillRect(0, y, W, H);
      c.strokeStyle = s.colour;
      c.lineWidth = 5;
      roundRect(c, 6, y + 6, W - 12, H - 12, 8);
      c.stroke();
      c.fillStyle = '#fff6e0';
      c.font = `800 34px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(s.name.toUpperCase(), W / 2, y + H / 2 + 2);
    });
  });
  return siteMat('corner-signs', lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.15));
})();
function drawCornerShops(b: Batch) {
  CORNER_SHOPS.forEach((s, i) => {
    const M = frameOf(s, s.w);
    const add = (g: THREE.BufferGeometry, m: THREE.Material) => b.add(g.applyMatrix4(M), m);
    const w = s.w / 2;
    add(box(s.w, 2.6 + (s.base - s.low) + 0.1, CORNER.depth, 0, (2.6 - (s.base - s.low) - 0.1) / 2, -CORNER.depth / 2), FINISH.brick);
    add(box(s.w + 0.1, 0.3, CORNER.depth + 0.1, 0, 2.75, -CORNER.depth / 2), FINISH.render);
    // (the shopfront: its window, a door at its end with its glass, the frames round them; the map polish plan's
    // Phase 2: the window ran the whole front, no way in)
    add(win(-0.5, 0.3, 1.05, s.w - 2.0), SHOPGLASS);
    add(win(w - 0.85, 0.02, 1.08, 0.8), doorOf(s.colour));
    add(win(w - 0.85, 0.45, 0.98, 0.5, 0.016), SHOPGLASS);
    add(merge([...frameAround(-0.5, 0.3, 1.05, s.w - 2.0, 0), ...frameAround(w - 0.85, 0.02, 1.08, 0.8, 0), ...frameAround(-w + 1.2, 1.55, 2.2, 0.9, 0), ...frameAround(w - 1.2, 1.55, 2.2, 0.9, 0)]), CANOPY);
    add(merge([win(-w + 1.2, 1.55, 2.2, 0.9), win(w - 1.2, 1.55, 2.2, 0.9)]), WIN_DARK);
    // (its back: two windows up, one and a door down; a bin by the back door)
    add(merge([winBack(-w + 1.2, 1.55, 2.2, 0.9, -CORNER.depth - 0.012), winBack(w - 1.2, 1.55, 2.2, 0.9, -CORNER.depth - 0.012), winBack(-w + 1.4, 0.45, 1.05, 0.8, -CORNER.depth - 0.012)]), WIN_DARK);
    add(winBack(w - 1.0, 0.02, 1.08, 0.75, -CORNER.depth - 0.012), doorOf('#2b2e38'));
    add(box(0.55, 0.75, 0.55, w - 1.9, 0.38, -CORNER.depth - 0.5), BIN);
    add(box(s.w, 0.3, 0.1, 0, 1.25, 0.05), doorOf(s.colour));
    const g = new THREE.PlaneGeometry(s.w - 0.4, 0.24);
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    const n = Math.max(1, CORNER_SHOPS.length);
    const [v0, v1] = [1 - (i + 1) / n, 1 - i / n];
    for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) > 0.5 ? v1 - 0.002 : v0 + 0.002);
    add(g.translate(0, 1.25, 0.105), SIGNS);
  });
  const c = COMMUNITY_CENTRE;
  if (!c) return;
  const M = frameOf(c, c.w);
  const add = (g: THREE.BufferGeometry, m: THREE.Material) => b.add(g.applyMatrix4(M), m);
  add(box(c.w, CENTRE.eaves + (c.base - c.low) + 0.1, CENTRE.depth, 0, (CENTRE.eaves - (c.base - c.low) - 0.1) / 2, -CENTRE.depth / 2), FINISH.brick);
  add(box(c.w + 0.3, 0.25, CENTRE.depth + 0.3, 0, CENTRE.eaves + 0.1, -CENTRE.depth / 2), FINISH.render);
  // (boarded: its windows and doors under plywood, each board in its frame; a canopy over the doors, bills and a tag
  // on the boards, a downpipe at each corner; the map polish plan's Phase 2)
  add(merge([...[-4.5, -2.5, 2.5, 4.5].map((x) => win(x, 0.9, 2.2, 1.4)), win(0, 0.04, 2.0, 2.2)]), PLY);
  add(merge([...[-4.5, -2.5, 2.5, 4.5].flatMap((x) => frameAround(x, 0.9, 2.2, 1.4, 0)), ...frameAround(0, 0.04, 2.0, 2.2, 0)]), FINISH.render);
  add(box(3.2, 0.12, 1.2, 0, 2.3, 0.6), FINISH.render);
  for (const x of [-1.45, 1.45]) add(box(0.1, 2.3, 0.1, x, 1.15, 1.1), FINISH.render);
  for (const x of [-c.w / 2 + 0.12, c.w / 2 - 0.12]) add(box(0.08, CENTRE.eaves, 0.08, x, CENTRE.eaves / 2, 0.06), BIN);
  const at = (x: number, y: number): [number, number, number] => [c.at[0] + c.face[1] * x + c.face[0] * 0.03, c.base + y, c.at[1] - c.face[0] * x + c.face[1] * 0.03];
  for (const [k, x] of [-4.5, 2.5, 4.5].entries()) poster(b, 11 + k * 7, 1.1, c.face, ...at(x + 0.2, 1.5));
  tag(b, 23, 1.5, c.face, ...at(-2.5, 1.6));
}

/* ---------- The allotments ---------- */

function drawAllotments(b: Batch, low: boolean) {
  flat(b, ALLOTMENTS, ON - 0.002, LAWN);
  for (const p of PLOTS) flat(b, p.ring, ON + 0.004, BED);
  for (const p of PLOTS) {
    if (!p.shed) continue;
    // (a shed with a pitched roof, its door and a window, a water butt by it: they were green boxes)
    const [sx, sz] = p.shed;
    const put = (g: THREE.BufferGeometry, m: THREE.Material) => b.add(g.rotateY(-p.rot).translate(sx, 0.15, sz), m);
    put(box(1.3, 1.3, 1.1, 0, 0.65, 0), SHED);
    put(tris([{ p: [[-0.65, 1.3, 0.55], [0.65, 1.3, 0.55], [0, 1.65, 0.55]], n: [0, 0, 1] }, { p: [[-0.65, 1.3, -0.55], [0.65, 1.3, -0.55], [0, 1.65, -0.55]], n: [0, 0, -1] }]), SHED);
    put(tris([...quad([-0.75, 1.25, 0.65], [-0.75, 1.25, -0.65], [0, 1.7, -0.65], [0, 1.7, 0.65], [-0.45, 0.75, 0]), ...quad([0.75, 1.25, -0.65], [0.75, 1.25, 0.65], [0, 1.7, 0.65], [0, 1.7, -0.65], [0.45, 0.75, 0])]), TILE);
    put(win(-0.3, 0.02, 1.15, 0.55, 0.562), SHED_DOOR);
    put(win(0.32, 0.65, 1.05, 0.38, 0.562), WIN_DARK);
    put(new THREE.CylinderGeometry(0.22, 0.2, 0.75, 8).translate(0.85, 0.375, 0.3), BUTT);
  }
  // The fence round it (posts and a rail), its gate left open
  for (let i = 0; i < ALLOTMENTS.length; i++) {
    const [a, c] = [ALLOTMENTS[i], ALLOTMENTS[(i + 1) % ALLOTMENTS.length]];
    const m: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    if (Math.hypot(m[0] - ALLOTMENT_GATE[0], m[1] - ALLOTMENT_GATE[1]) < 1.5) continue;
    along(b, a, c, 0.06, 0.95, 1.02, FENCE);
    // (square posts at every distance, so the rail never floats: at the corner, and every 2.5 along on desktops)
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const n = low ? 1 : Math.max(1, Math.round(l / 2.5));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const q: Pt = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
      b.add(new THREE.BoxGeometry(0.08, 0.9, 0.08).translate(q[0], 0.15 + 0.45, q[1]), FENCE);
    }
  }
}

/* ---------- Registered ---------- */

const rectOf = (pts: Pt[], pad: number): [number, number, number, number] => [Math.min(...pts.map((p) => p[0])) - pad, Math.min(...pts.map((p) => p[1])) - pad, Math.max(...pts.map((p) => p[0])) + pad, Math.max(...pts.map((p) => p[1])) + pad];
export function registerCouncil(low: boolean, scene: THREE.Scene | null) {
  // (on the main thread: the houses, shops and sheds join the grids, so walking, driving and shots meet them; the
  // houses' tops already over their plinths, the sheds on the ground and lifted with it)
  if (scene) {
    addSolids(COUNCIL_SOLIDS, false);
    addSolids(ALLOTMENT_SOLIDS);
    addSolids(FENCE_SOLIDS);
  }
  const lifted = { cast: true, receive: true };
  const level = { cast: true, receive: true, lift: false };
  for (let i = 0; i < SEMIS.length; i += 8) {
    const list = SEMIS.slice(i, i + 8);
    site(`village semis ${i}`, rectOf(list.flatMap((s) => lotRing(s, SEMI.front, SEMI.depth + SEMI.rear)), 1), (into) => {
      const b = new Batch();
      drawSemis(b, list, low);
      b.build(into, level);
      const g = new Batch();
      drawGardens(g, list, []);
      g.build(into, lifted);
    });
  }
  for (let i = 0; i < BUNGALOWS.length; i += 8) {
    const list = BUNGALOWS.slice(i, i + 8);
    site(`village bungalows ${i}`, rectOf(list.flatMap((s) => lotRing(s, BUNGALOW.front, BUNGALOW.depth + BUNGALOW.rear)), 1), (into) => {
      const b = new Batch();
      drawBungalows(b, list);
      b.build(into, level);
      const g = new Batch();
      drawGardens(g, [], list);
      g.build(into, lifted);
    });
  }
  if (CORNER_SHOPS.length || COMMUNITY_CENTRE)
    site('village corner shops', rectOf([...CORNER_SHOPS.flatMap((s) => lotRing(s, 1, CORNER.depth)), ...(COMMUNITY_CENTRE ? lotRing(COMMUNITY_CENTRE, 1, CENTRE.depth) : [])], 2), (into) => {
      const b = new Batch();
      drawCornerShops(b);
      b.build(into, level);
    });
  site('village allotments', rectOf(ALLOTMENTS, 1), (into) => {
    const b = new Batch();
    drawAllotments(b, low);
    b.build(into, lifted);
  });
}
