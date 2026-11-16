/*
 * Aldwyn's Green's terraces drawn (docs/south-plan.md Phase 3, step 3a; the data is southterraces.ts), a district loaded
 * as you approach (districts.ts `LAZY_DISTRICTS` id `village`), as sites of a few houses each (tilework.ts), as the
 * owner's photo: red brick (some yellow, painted or pebble-dashed), a slate roof, a two-storey white bay, a chimney on
 * every other party wall, a dormer on about one in four, a low front wall with a gate.
 *
 * One house's pieces, made once and copied to every house (`Batch.instances()`), stretched to its frontage and stood
 * level on its base (its plinth down to the ground where the hill falls away): walls, roof, bay, windows (lit at night,
 * by each house's `lit`), door, gables at a row's ends, chimneys, dormers at every distance; sills, the fanlight and the
 * chimney pots near only (the owner's call: full near, simple far), not on phones. The front yards, front walls, rear
 * yards, alleys and ginnels on the rolling ground (their Batch lifted onto it).
 */
import * as THREE from 'three';
import type { Tick } from './world';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { COVER, STONE } from './palette';
import { shift } from './streetfaces';
import { ALLEYS, DOOR_U, GINNELS, HOUSES, TERRACE, WALL_H, frontWalls, houseFoot, plotOf, type House } from './southterraces';

export const SELF = import.meta.url;

type Pt = [number, number];
type Rect = [number, number, number, number];

/* ---------- Materials ---------- */

const FRONTS = { red: toon('#9b3b2a'), yellow: toon('#c9a85a'), pebbledash: toon('#b9b2a2') } as const;
const PAINTED = new Map<string, THREE.Material>();
const paintOf = (c: string) => PAINTED.get(c) ?? (PAINTED.set(c, toon(c)), PAINTED.get(c)!);
const DOORS = new Map<string, THREE.Material>();
const doorOf = (c: string) => DOORS.get(c) ?? (DOORS.set(c, toon(c)), DOORS.get(c)!);
const RENDER = toon('#efe9dc');
const SLATE = toon('#3e4352');
const LEAD = toon('#2b2e38');
const SILL = toon('#e8e2d4');
const POT = toon('#a0522d');
const WIN_DARK = toon('#27324a');
const WIN_LIT = neon('#ffd99a', 0.12, 1.05);
const YARD = toon(COVER.garden);
const PAVING = toon(STONE.paving);
const ALLEY = toon(STONE.path);
const CAP = toon(STONE.cap);

/* ---------- One house, in its own frame (x along its front, z out of it, y up from its base; 2.8 wide) ---------- */

const W0 = 2.8;
const { depth: D, eaves: E, ridge: R, bayOut: BO } = TERRACE;
const OVER = 0.15;
const BAY_X = 0.5;

/** A geometry from triangles, each wound to face along `n` */
function tris(list: { p: number[][]; n: number[] }[]) {
  const pos: number[] = [];
  const nor: number[] = [];
  const v = new THREE.Vector3();
  for (const { p, n } of list) {
    const [a, b, c] = p.map((q) => new THREE.Vector3(...q));
    const face = v.subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const order = face.dot(new THREE.Vector3(...n)) >= 0 ? [a, b, c] : [a, c, b];
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

const PIECES = (() => {
  const h = W0 / 2;
  const body = box(W0, E, D, 0, E / 2, -D / 2);
  const plinth = box(W0, 1, D, 0, -0.5, -D / 2);
  const roof = tris([
    ...quad([-h, E, OVER], [h, E, OVER], [h, E + R, -D / 2], [-h, E + R, -D / 2], [0, D / 2 + OVER, R]),
    ...quad([-h, E, -D - OVER], [h, E, -D - OVER], [h, E + R, -D / 2], [-h, E + R, -D / 2], [0, D / 2 + OVER, -R]),
  ]);
  const gable = (s: number) => tris([{ p: [[s * h, E, 0], [s * h, E, -D], [s * h, E + R, -D / 2]], n: [s, 0, 0] }]);
  // The bay: a canted prism, two storeys, its lid
  const outline: Pt[] = [[BAY_X - 0.75, 0], [BAY_X - 0.45, BO], [BAY_X + 0.45, BO], [BAY_X + 0.75, 0]];
  const bayFaces: { p: number[][]; n: number[] }[] = [];
  for (let i = 0; i < 3; i++) {
    const [a, c] = [outline[i], outline[i + 1]];
    const n = [c[1] - a[1], 0, -(c[0] - a[0])];
    const fix = n[2] < 0 ? -1 : 1;
    bayFaces.push(...quad([a[0], 0.02, a[1]], [c[0], 0.02, c[1]], [c[0], E - 0.12, c[1]], [a[0], E - 0.12, a[1]], [n[0] * fix, 0, n[2] * fix]));
  }
  const bay = tris(bayFaces);
  const bayLid = tris(quad([BAY_X - 0.82, E - 0.1, 0], [BAY_X + 0.82, E - 0.1, 0], [BAY_X + 0.5, E - 0.1, BO + 0.08], [BAY_X - 0.5, E - 0.1, BO + 0.08], [0, 1, 0]));
  const bayLidEdge = box(1.0, 0.1, 0.05, BAY_X, E - 0.15, BO + 0.06);
  // The windows: the bay's front, down and up; over the door
  const win = (x: number, y0: number, y1: number, z: number, w: number) => tris(quad([x - w / 2, y0, z], [x + w / 2, y0, z], [x + w / 2, y1, z], [x - w / 2, y1, z], [0, 0, 1]));
  const winDown = win(BAY_X, 0.32, 1.05, BO + 0.012, 0.72);
  const winUp = merge([win(BAY_X, 1.45, 2.08, BO + 0.012, 0.72), win(-DOOR_U, 1.45, 2.08, 0.012, 0.6)]);
  const door = win(-DOOR_U, 0.04, 1.02, 0.012, 0.6);
  const fan = win(-DOOR_U, 1.06, 1.22, 0.012, 0.6);
  const sills = merge([box(0.8, 0.05, 0.1, BAY_X, 1.42, BO + 0.05), box(0.68, 0.05, 0.1, -DOOR_U, 1.42, 0.05), box(0.8, 0.05, 0.1, BAY_X, 0.3, BO + 0.05)]);
  // The chimney on its +x party wall at the ridge, its pots
  const chimney = box(0.5, 0.95, 0.9, h, E + R + 0.15, -D / 2);
  const pots = merge([new THREE.CylinderGeometry(0.07, 0.08, 0.25, 6).translate(h, E + R + 0.75, -D / 2 - 0.2), new THREE.CylinderGeometry(0.07, 0.08, 0.25, 6).translate(h, E + R + 0.75, -D / 2 + 0.2)]);
  // A dormer on the front slope, over the door's side
  const dz0 = -1.7;
  const dz1 = -0.75;
  const dy = E + R * (-dz1 / (D / 2));
  const dormer = merge([box(1.0, 0.75, dz1 - dz0, -0.35, dy + 0.3, (dz0 + dz1) / 2), box(1.12, 0.08, dz1 - dz0 + 0.12, -0.35, dy + 0.72, (dz0 + dz1) / 2)]);
  const dormerWin = win(-0.35, dy + 0.05, dy + 0.55, dz1 + 0.012, 0.66);
  return { body, plinth, roof, gableL: gable(1), gableR: gable(-1), bay, bayLid, bayLidEdge, winDown, winUp, door, fan, sills, chimney, pots, dormer, dormerWin };
})();

/** A house's frame: x along its front (against t: a right-handed frame), z out of its front, stretched to its frontage */
function frameOf(h: House, sy = 1, y = h.base) {
  const [nx, nz] = h.face;
  const sx = h.w / W0;
  return new THREE.Matrix4().makeBasis(new THREE.Vector3(nz * sx, 0, -nx * sx), new THREE.Vector3(0, sy, 0), new THREE.Vector3(nx, 0, nz)).setPosition(h.at[0], y, h.at[1]);
}

/* ---------- A few houses at a time ---------- */

function drawHouses(b: Batch, list: House[], low: boolean) {
  const by = <K,>(key: (h: House) => K) => {
    const m = new Map<K, House[]>();
    for (const h of list) m.set(key(h), [...(m.get(key(h)) ?? []), h]);
    return m;
  };
  const wallOf = (h: House) => (h.front === 'painted' ? paintOf(h.paint) : FRONTS[h.front]);
  const P = PIECES;
  b.detail(() => {
    for (const [mat, hs] of by(wallOf)) {
      b.instances(P.body, mat, hs.map((h) => frameOf(h)));
      b.instances(P.plinth, mat, hs.map((h) => frameOf(h, h.base - h.low + 0.12)));
      b.instances(P.gableL, mat, hs.filter((h) => h.endL).map((h) => frameOf(h)));
      b.instances(P.gableR, mat, hs.filter((h) => h.endR).map((h) => frameOf(h)));
      b.instances(P.chimney, mat, hs.filter((h) => h.chimney).map((h) => frameOf(h)));
    }
    const all = list.map((h) => frameOf(h));
    b.instances(P.roof, SLATE, all);
    b.instances(P.bay, RENDER, all);
    b.instances(P.bayLid, LEAD, all);
    b.instances(P.bayLidEdge, RENDER, all);
    b.instances(P.winDown, WIN_LIT, list.filter((h) => h.lit & 1).map((h) => frameOf(h)));
    b.instances(P.winDown, WIN_DARK, list.filter((h) => !(h.lit & 1)).map((h) => frameOf(h)));
    b.instances(P.winUp, WIN_LIT, list.filter((h) => h.lit & 2).map((h) => frameOf(h)));
    b.instances(P.winUp, WIN_DARK, list.filter((h) => !(h.lit & 2)).map((h) => frameOf(h)));
    for (const [c, hs] of by((h) => h.door)) b.instances(P.door, doorOf(c), hs.map((h) => frameOf(h)));
    const dormers = list.filter((h) => h.dormer);
    b.instances(P.dormer, RENDER, dormers.map((h) => frameOf(h)));
    b.instances(P.dormerWin, WIN_LIT, dormers.filter((h) => h.lit & 4).map((h) => frameOf(h)));
    b.instances(P.dormerWin, WIN_DARK, dormers.filter((h) => !(h.lit & 4)).map((h) => frameOf(h)));
  }, 'all');
  if (low) return;
  b.detail(() => {
    b.instances(P.sills, SILL, list.map((h) => frameOf(h)));
    b.instances(P.fan, WIN_LIT, list.filter((h) => h.lit & 8).map((h) => frameOf(h)));
    b.instances(P.fan, WIN_DARK, list.filter((h) => !(h.lit & 8)).map((h) => frameOf(h)));
    b.instances(P.pots, POT, list.filter((h) => h.chimney).map((h) => frameOf(h)));
  });
}

/** A flat outline at y, facing up (its triangles small: it's lifted onto the rolling ground) */
function flat(b: Batch, ring: Pt[], y: number, m: THREE.Material) {
  const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0);
  g.deleteAttribute('uv');
  b.add(g, m);
}
/** A box along a to c, `w` across, y0 to y1 (on the ground: lifted with it) */
function along(b: Batch, a: Pt, c: Pt, w: number, y0: number, y1: number, m: THREE.Material) {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (l < 1e-3) return;
  const g = new THREE.BoxGeometry(l, y1 - y0, w).rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0])).translate((a[0] + c[0]) / 2, (y0 + y1) / 2, (a[1] + c[1]) / 2);
  g.deleteAttribute('uv');
  b.add(g, m);
}

const ON = 0.15 + 0.006;
function drawGround(b: Batch, list: House[], low: boolean) {
  for (const h of list) {
    const [nx, nz] = h.face;
    // The front yard: paving from the house to its wall
    const f = houseFoot({ ...h, at: [h.at[0] + nx * TERRACE.yard, h.at[1] + nz * TERRACE.yard] }, TERRACE.yard);
    flat(b, f, ON, PAVING);
    // Its front wall, capped, a gate's gap by the door
    for (const [a, c] of frontWalls(h)) {
      along(b, a, c, 0.14, 0.15, 0.15 + WALL_H, FRONTS.red);
      // (its coping stones: not on phones)
      if (!low) along(b, a, c, 0.18, 0.15 + WALL_H, 0.15 + WALL_H + 0.05, CAP);
    }
    // The rear yard: grass, to the alley (or the plot's end)
    const alley = ALLEYS.find((q) => q.house === h.id);
    const rear = alley?.rear ?? TERRACE.rear;
    const back = houseFoot({ ...h, at: [h.at[0] - nx * TERRACE.depth, h.at[1] - nz * TERRACE.depth] }, rear);
    flat(b, back, ON, YARD);
    if (alley) {
      flat(b, alley.poly, ON + 0.002, ALLEY);
      // (its back wall along the alley, near only)
      if (!low) b.detail(() => along(b, alley.poly[0], alley.poly[1], 0.12, 0.15, 1.15, FRONTS.red));
    }
  }
}
function drawGinnels(b: Batch) {
  for (const g of GINNELS) {
    const [nx, nz] = g.face;
    const L = TERRACE.yard + TERRACE.depth + TERRACE.rear + TERRACE.alley;
    const line: Pt[] = [
      [g.at[0] + nx * TERRACE.yard, g.at[1] + nz * TERRACE.yard],
      [g.at[0] + nx * (TERRACE.yard - L), g.at[1] + nz * (TERRACE.yard - L)],
    ];
    const [l, r] = [shift(line, -g.w / 2), shift(line, g.w / 2)];
    flat(b, [l[0], l[1], r[1], r[0]], ON + 0.003, ALLEY);
  }
}

const rectOf = (pts: Pt[], pad: number): Rect => [Math.min(...pts.map((p) => p[0])) - pad, Math.min(...pts.map((p) => p[1])) - pad, Math.max(...pts.map((p) => p[0])) + pad, Math.max(...pts.map((p) => p[1])) + pad];

/** The houses in sites of about ten (in the order they were laid: along a street) */
export const CHUNK = 10;
export function register({ low }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  for (let i = 0; i < HOUSES.length; i += CHUNK) {
    const list = HOUSES.slice(i, i + CHUNK);
    site(`village houses ${i}`, rectOf(list.flatMap((h) => plotOf(h)), 1.5), (into) => {
      const b = new Batch();
      drawHouses(b, list, low);
      b.build(into, { cast: true, receive: true, lift: false });
      const g = new Batch();
      drawGround(g, list, low);
      g.build(into, { cast: true, receive: true });
    });
  }
  if (GINNELS.length)
    site('village ginnels', rectOf(GINNELS.map((g) => g.at), 10), (into) => {
      const b = new Batch();
      drawGinnels(b);
      b.build(into, { cast: false, receive: true });
    });
}
