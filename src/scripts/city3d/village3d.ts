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
import { CHANCEL, CHURCH_BASE, CHURCH_LOW, CHURCH_PATH, GRAVES, HEIGHTS, LYCHGATE, NAVE, PATH_W, PORCH, PORCH_DOOR, SPIRE_TIP, TOWER, YARD_WALL, YARD_WALL_H, YEWS } from './aldwyns';
import { CHURCHYARD } from './south';
import { PLANT } from './palette';
import { registerHighRoad } from './highroad3d';
import { registerCouncil } from './council3d';
import { BENCHES, BOWL, BRIDGE, FOOTPATH, FUNBOX, GOALS, PAVILION, PAVILION_H, PITCH, PLAYGROUND, QUARTER, RAIL, REC_PATH, SKATE, SLIDE, SWINGS, VERANDA, PATH_W as REC_PATH_W, recBridgeY } from './rec';

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
  // (a narrow window on each of the bay's slanted sides too, so they read as glazed, not blank)
  const onSide = (a: Pt, c: Pt, y0: number, y1: number, w: number) => {
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const t = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
    let n = [t[1], -t[0]];
    if (n[1] < 0) n = [-n[0], -n[1]];
    const m = [(a[0] + c[0]) / 2 + n[0] * 0.012, (a[1] + c[1]) / 2 + n[1] * 0.012];
    const [p0, p1] = [[m[0] - (t[0] * w) / 2, m[1] - (t[1] * w) / 2], [m[0] + (t[0] * w) / 2, m[1] + (t[1] * w) / 2]];
    return tris(quad([p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], [n[0], 0, n[1]]));
  };
  const sides = (y0: number, y1: number) => [onSide(outline[0], outline[1], y0, y1, 0.3), onSide(outline[2], outline[3], y0, y1, 0.3)];
  const winDown = merge([win(BAY_X, 0.32, 1.05, BO + 0.012, 0.72), ...sides(0.32, 1.05)]);
  const winUp = merge([win(BAY_X, 1.45, 2.08, BO + 0.012, 0.72), win(-DOOR_U, 1.45, 2.08, 0.012, 0.6), ...sides(1.45, 2.08)]);
  // Up close: a white frame round the bay's front windows and the one over the door, a sash bar across each
  // (flat strips just proud of the glass: from the street they read as the frame and its bars)
  const strip = (x0: number, x1: number, y0: number, y1: number, z: number) => tris(quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [0, 0, 1]));
  const frame = (x: number, y0: number, y1: number, z: number, w: number) => [
    strip(x - w / 2 - 0.05, x + w / 2 + 0.05, y1 - 0.01, y1 + 0.05, z),
    strip(x - w / 2 - 0.05, x + w / 2 + 0.05, y0 - 0.05, y0 + 0.01, z),
    strip(x - w / 2 - 0.05, x - w / 2 + 0.01, y0, y1, z),
    strip(x + w / 2 - 0.01, x + w / 2 + 0.05, y0, y1, z),
    strip(x - w / 2, x + w / 2, (y0 + y1) / 2 - 0.018, (y0 + y1) / 2 + 0.018, z),
    strip(x - 0.015, x + 0.015, y0, y1, z + 0.002),
  ];
  const frames = merge([...frame(BAY_X, 0.32, 1.05, BO + 0.02, 0.72), ...frame(BAY_X, 1.45, 2.08, BO + 0.02, 0.72), ...frame(-DOOR_U, 1.45, 2.08, 0.02, 0.6)]);
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
  return { body, plinth, roof, gableL: gable(1), gableR: gable(-1), bay, bayLid, bayLidEdge, winDown, winUp, frames, door, fan, sills, chimney, pots, dormer, dormerWin };
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
    b.instances(P.frames, SILL, list.map((h) => frameOf(h)));
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
/** The houses' gardens: front yards, their walls (near only), rear yards and alleys (exported for tests/southnear.test.ts) */
export function drawGround(b: Batch, list: House[], low: boolean) {
  for (const h of list) {
    const [nx, nz] = h.face;
    // The front yard: paving from the house to its wall
    const f = houseFoot({ ...h, at: [h.at[0] + nx * TERRACE.yard, h.at[1] + nz * TERRACE.yard] }, TERRACE.yard);
    flat(b, f, ON, PAVING);
    // Its front wall, capped, a gate's gap by the door (near only: a knee-high wall is lost at a distance)
    b.detail(() => {
      for (const [a, c] of frontWalls(h)) {
        along(b, a, c, 0.1, 0.15, 0.15 + WALL_H, FRONTS.red);
        // (its coping stones: not on phones)
        if (!low) along(b, a, c, 0.14, 0.15 + WALL_H, 0.15 + WALL_H + 0.04, CAP);
      }
    });
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

/* ---------- St Aldwyn's (aldwyns.ts, 3b) ---------- */

const KIRK = toon('#8e8a85');
const DRESSING = toon('#b9b3a8');
const SPIRE = toon('#4a4f5c');
const GLASS_LIT = neon('#ffc46b', 0.1, 1.15);
const GLASS_DARK = toon('#2a2f45');
const OAK = toon('#4a2e1f');
const GRAVE = toon('#a7a39b');
const YEW = toon(PLANT.shrubDark);
const GRAVEL = toon(STONE.gravel);

type R4 = [number, number, number, number];
/** A box over a rect, y0 to y1 */
const rbox = (b: Batch, r: R4, y0: number, y1: number, m: THREE.Material) => b.add(box(r[2] - r[0], y1 - y0, r[3] - r[1], (r[0] + r[2]) / 2, (y0 + y1) / 2, (r[1] + r[3]) / 2), m);
/** A gabled roof over a rect from its eaves (`y`), rising `rise`, its ridge along x (or along z); its gables in stone */
function gabled(b: Batch, r: R4, y: number, rise: number, alongX: boolean, roof: THREE.Material, gable: THREE.Material, o = 0.2) {
  const [x0, z0, x1, z1] = r;
  if (alongX) {
    const zm = (z0 + z1) / 2;
    b.add(tris([...quad([x0 - o, y, z0 - o], [x1 + o, y, z0 - o], [x1 + o, y + rise, zm], [x0 - o, y + rise, zm], [0, 1, -1]), ...quad([x0 - o, y, z1 + o], [x1 + o, y, z1 + o], [x1 + o, y + rise, zm], [x0 - o, y + rise, zm], [0, 1, 1])]), roof);
    b.add(tris([{ p: [[x0, y, z0], [x0, y, z1], [x0, y + rise, zm]], n: [-1, 0, 0] }, { p: [[x1, y, z0], [x1, y, z1], [x1, y + rise, zm]], n: [1, 0, 0] }]), gable);
  } else {
    const xm = (x0 + x1) / 2;
    b.add(tris([...quad([x0 - o, y, z0 - o], [x0 - o, y, z1 + o], [xm, y + rise, z1 + o], [xm, y + rise, z0 - o], [-1, 1, 0]), ...quad([x1 + o, y, z0 - o], [x1 + o, y, z1 + o], [xm, y + rise, z1 + o], [xm, y + rise, z0 - o], [1, 1, 0])]), roof);
    b.add(tris([{ p: [[x0, y, z0], [x1, y, z0], [xm, y + rise, z0]], n: [0, 0, -1] }, { p: [[x0, y, z1], [x1, y, z1], [xm, y + rise, z1]], n: [0, 0, 1] }]), gable);
  }
}
/** A lancet: a pointed-arch window on a wall facing n (x, z), its middle at (u along the wall: x or z), y0 to y1 */
function lancet(x: number, z: number, n: Pt, w: number, y0: number, y1: number) {
  const t: Pt = [-n[1], n[0]];
  const p = (u: number, y: number) => [x + t[0] * u + n[0] * 0.02, y, z + t[1] * u + n[1] * 0.02];
  const spring = y1 - w * 0.8;
  return tris([...quad(p(-w / 2, y0), p(w / 2, y0), p(w / 2, spring), p(-w / 2, spring), [n[0], 0, n[1]]), { p: [p(-w / 2, spring), p(w / 2, spring), p(0, y1)], n: [n[0], 0, n[1]] }]);
}
function drawChurch(b: Batch, low: boolean) {
  const B = CHURCH_BASE;
  const H = HEIGHTS;
  const top = B + H.tower;
  b.detail(() => {
    // The walls, from the plinth up (where the hill falls), the roofs and gables
    for (const [r, h] of [[NAVE, H.nave], [CHANCEL, H.chancel], [TOWER, H.tower], [PORCH, H.porch]] as [R4, number][]) rbox(b, r, CHURCH_LOW - 0.1, B + h, KIRK);
    gabled(b, NAVE, B + H.nave, H.naveRoof, true, SPIRE, KIRK);
    gabled(b, CHANCEL, B + H.chancel, H.chancelRoof, true, SPIRE, KIRK);
    gabled(b, PORCH, B + H.porch, H.porchRoof, false, SPIRE, KIRK, 0.15);
    // The tower's parapet and its broach spire, octagonal, to the owner's 22.5
    const [tx, tz] = [(TOWER[0] + TOWER[2]) / 2, (TOWER[1] + TOWER[3]) / 2];
    rbox(b, [TOWER[0] - 0.12, TOWER[1] - 0.12, TOWER[2] + 0.12, TOWER[3] + 0.12], top, top + 0.45, DRESSING);
    const spire = new THREE.CylinderGeometry(0.05, (TOWER[2] - TOWER[0]) / 2 - 0.15, B + SPIRE_TIP - top - 0.2, 8).rotateY(Math.PI / 8).translate(tx, (top + 0.2 + B + SPIRE_TIP) / 2, tz);
    spire.deleteAttribute('uv');
    b.add(spire, SPIRE);
    // The windows: lancets along the nave and the chancel, three tall ones in the east end, the tower's belfry
    const lit = (m: THREE.BufferGeometry, on: boolean) => b.add(m, on ? GLASS_LIT : GLASS_DARK);
    let k = 0;
    for (const z of [NAVE[1], NAVE[3]]) {
      const n: Pt = [0, z === NAVE[1] ? -1 : 1];
      for (let x = NAVE[0] + 2; x < NAVE[2] - 1; x += 3.1) if (!(z === NAVE[1] && x > PORCH[0] - 0.8 && x < PORCH[2] + 0.8)) lit(lancet(x, z, n, 0.8, B + 1.0, B + 3.4), k++ % 3 !== 1);
    }
    for (const z of [CHANCEL[1], CHANCEL[3]]) lit(lancet((CHANCEL[0] + CHANCEL[2]) / 2, z, [0, z === CHANCEL[1] ? -1 : 1], 0.7, B + 0.9, B + 2.7), true);
    for (const dz of [-1.1, 0, 1.1]) lit(lancet(CHANCEL[2], (CHANCEL[1] + CHANCEL[3]) / 2 + dz, [1, 0], 0.7, B + 0.8, B + (dz === 0 ? 3.0 : 2.5)), true);
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Pt[]) {
      const [x, z] = [tx + nx * ((TOWER[2] - TOWER[0]) / 2), tz + nz * ((TOWER[3] - TOWER[1]) / 2)];
      b.add(lancet(x, z, [nx, nz], 0.9, top - 2.6, top - 0.8), GLASS_DARK);
    }
    // The porch's door (pointed, oak) and the west door under the tower
    b.add(lancet(PORCH_DOOR[0], PORCH_DOOR[1], [0, -1], 1.1, B, B + 1.9), OAK);
    b.add(lancet(TOWER[0], tz, [-1, 0], 1.0, B, B + 1.8), OAK);
  }, 'all');
  if (low) return;
  // Up close: buttresses between the nave's windows, the dressed stone at the corners
  b.detail(() => {
    for (const z of [NAVE[1], NAVE[3]]) {
      const s = z === NAVE[1] ? -1 : 1;
      for (let x = NAVE[0] + 0.45; x < NAVE[2]; x += 3.1) {
        if (z === NAVE[1] && x > PORCH[0] - 0.4 && x < PORCH[2] + 0.4) continue;
        rbox(b, [x - 0.2, Math.min(z, z + s * 0.45), x + 0.2, Math.max(z, z + s * 0.45)], CHURCH_LOW, B + H.nave - 0.6, DRESSING);
      }
    }
    for (const [x, z] of [[TOWER[0], TOWER[1]], [TOWER[2], TOWER[1]], [TOWER[0], TOWER[3]], [TOWER[2], TOWER[3]]] as Pt[]) rbox(b, [x - 0.18, z - 0.18, x + 0.18, z + 0.18], CHURCH_LOW, top, DRESSING);
  });
}
function drawChurchyard(b: Batch, low: boolean) {
  // The path (gravel) from Church Road through the lychgate to the porch
  const [l, r] = [shift(CHURCH_PATH, -PATH_W / 2), shift(CHURCH_PATH, PATH_W / 2)];
  flat(b, [l[0], l[1], r[1], r[0]], ON + 0.004, GRAVEL);
  // The low stone wall round the churchyard, and the lychgate (posts, a small gabled roof)
  for (const [p, q] of YARD_WALL) along(b, p, q, 0.24, 0.15, 0.15 + YARD_WALL_H, KIRK);
  const g = LYCHGATE;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) along(b, [g.at[0] + sx * (g.w / 2 - 0.15), g.at[1] + sz * (g.d / 2 - 0.15) - 0.01], [g.at[0] + sx * (g.w / 2 - 0.15), g.at[1] + sz * (g.d / 2 - 0.15) + 0.01], 0.22, 0.15, 0.15 + g.h - 0.6, OAK);
  gabled(b, [g.at[0] - g.w / 2, g.at[1] - g.d / 2, g.at[0] + g.w / 2, g.at[1] + g.d / 2], 0.15 + g.h - 0.6, 0.7, true, SPIRE, OAK, 0.25);
  // The graves: headstones, crosses, a few chest tombs
  const m = new THREE.Matrix4();
  const at = (x: number, z: number, ry: number) => m.clone().makeRotationY(ry).setPosition(x, 0.15, z);
  const HEAD = box(0.5, 0.72, 0.12, 0, 0.36, 0);
  const CROSS = merge([box(0.12, 0.95, 0.1, 0, 0.475, 0), box(0.5, 0.11, 0.1, 0, 0.66, 0)]);
  const TOMB = box(1.0, 0.5, 0.55, 0, 0.25, 0);
  b.instances(HEAD, GRAVE, GRAVES.filter((q) => q[3] === 0).map(([x, z, ry]) => at(x, z, ry)));
  b.instances(CROSS, GRAVE, GRAVES.filter((q) => q[3] === 1).map(([x, z, ry]) => at(x, z, ry)));
  b.instances(TOMB, GRAVE, GRAVES.filter((q) => q[3] === 2).map(([x, z, ry]) => at(x, z, ry)));
  // The yews: dark, close-clipped cones
  for (const [x, z, sc] of YEWS) {
    const cone = new THREE.ConeGeometry(1.1 * sc, 3.2 * sc, low ? 7 : 10).translate(x, 0.15 + 0.3 + 1.6 * sc, z);
    cone.deleteAttribute('uv');
    b.add(cone, YEW);
  }
}

/* ---------- Aldwyn's Green Rec (rec.ts, 3e) ---------- */

const LINE = toon('#f2f0e8');
const NET = toon('#d8d4e6');
const SKATE_CONC = toon('#b8b3ab');
const BARK = toon('#7a5a3c');
const PAINT_RED = toon('#c43c2c');
const PAINT_BLUE = toon('#2aabee');
type R4b = [number, number, number, number];
const rb = (b: Batch, r: R4b, y0: number, y1: number, m: THREE.Material) => b.add(box(r[2] - r[0], y1 - y0, r[3] - r[1], (r[0] + r[2]) / 2, (y0 + y1) / 2, (r[1] + r[3]) / 2), m);
const ringOf = (r: R4b): Pt[] => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
function drawRec(b: Batch, low: boolean) {
  const G = 0.15;
  // The pitch's lines (touchlines, goal lines, halfway, the centre circle in eight, the boxes) and its goals
  const [x0, z0, x1, z1] = PITCH;
  const zm = (z0 + z1) / 2;
  const xm = (x0 + x1) / 2;
  const strip = (a: Pt, c: Pt) => along(b, a, c, 0.12, G + 0.004, G + 0.012, LINE);
  for (const [a, c] of [[[x0, z0], [x1, z0]], [[x0, z1], [x1, z1]], [[x0, z0], [x0, z1]], [[x1, z0], [x1, z1]], [[xm, z0], [xm, z1]]] as [Pt, Pt][]) strip(a, c);
  for (let k = 0; k < 12; k++) {
    const [a0, a1] = [(k / 12) * Math.PI * 2, ((k + 1) / 12) * Math.PI * 2];
    strip([xm + Math.cos(a0) * 2.6, zm + Math.sin(a0) * 2.6], [xm + Math.cos(a1) * 2.6, zm + Math.sin(a1) * 2.6]);
  }
  for (const s of [1, -1]) {
    const gx = s > 0 ? x0 : x1;
    strip([gx, zm - 4.5], [gx + s * 4, zm - 4.5]);
    strip([gx + s * 4, zm - 4.5], [gx + s * 4, zm + 4.5]);
    strip([gx + s * 4, zm + 4.5], [gx, zm + 4.5]);
  }
  for (const g of GOALS) {
    const s = g.at[0] < xm ? -1 : 1;
    for (const e of [-1, 1]) along(b, [g.at[0], g.at[1] + (e * g.w) / 2], [g.at[0] + 0.01, g.at[1] + (e * g.w) / 2], 0.12, G, G + g.h, LINE);
    along(b, [g.at[0], g.at[1] - g.w / 2], [g.at[0], g.at[1] + g.w / 2], 0.12, G + g.h - 0.12, G + g.h, LINE);
    if (!low) b.detail(() => along(b, [g.at[0] + s * 0.9, g.at[1] - g.w / 2], [g.at[0] + s * 0.9, g.at[1] + g.w / 2], 0.02, G, G + g.h * 0.8, NET));
  }
  // The pavilion: brick, a pitched roof, its veranda on posts facing the pitch, its windows and door
  rb(b, PAVILION as R4b, G - 0.3, G + PAVILION_H.eaves, FRONTS.red);
  gabled(b, [VERANDA[0], PAVILION[1], PAVILION[2], PAVILION[3]], G + PAVILION_H.eaves, PAVILION_H.ridge, false, SPIRE, FRONTS.red, 0.2);
  for (const z of [VERANDA[1] + 0.3, (VERANDA[1] + VERANDA[3]) / 2 - 1.4, (VERANDA[1] + VERANDA[3]) / 2 + 1.4, VERANDA[3] - 0.3]) along(b, [VERANDA[0] + 0.2, z], [VERANDA[0] + 0.21, z], 0.14, G, G + PAVILION_H.eaves, OAK);
  rb(b, [VERANDA[0], VERANDA[1], VERANDA[2], VERANDA[3]] as R4b, G, G + 0.12, CAP);
  b.add(lancet(PAVILION[0], (PAVILION[1] + PAVILION[3]) / 2, [-1, 0], 0.9, G + 0.12, G + 1.5).applyMatrix4(new THREE.Matrix4()), OAK);
  for (const dz of [-1.8, 1.8]) b.add(tris(quad([PAVILION[0] - 0.012, G + 0.7, (PAVILION[1] + PAVILION[3]) / 2 + dz - 0.6], [PAVILION[0] - 0.012, G + 0.7, (PAVILION[1] + PAVILION[3]) / 2 + dz + 0.6], [PAVILION[0] - 0.012, G + 1.6, (PAVILION[1] + PAVILION[3]) / 2 + dz + 0.6], [PAVILION[0] - 0.012, G + 1.6, (PAVILION[1] + PAVILION[3]) / 2 + dz - 0.6], [-1, 0, 0])), WIN_LIT);
  // The skate park: its concrete, the bowl's rim, a quarter pipe, a funbox, a rail
  flat(b, ringOf(SKATE as R4b), G + 0.006, SKATE_CONC);
  flat(b, ringOf(BOWL as R4b), G + 0.01, toon(STONE.edge));
  for (const [a, c] of [[[BOWL[0], BOWL[1]], [BOWL[2], BOWL[1]]], [[BOWL[2], BOWL[1]], [BOWL[2], BOWL[3]]], [[BOWL[2], BOWL[3]], [BOWL[0], BOWL[3]]], [[BOWL[0], BOWL[3]], [BOWL[0], BOWL[1]]]] as [Pt, Pt][]) along(b, a, c, 0.3, G, G + 0.35, SKATE_CONC);
  {
    const [qx0, qz0, qx1, qz1] = QUARTER;
    b.add(tris([...quad([qx0, G, qz1], [qx1, G, qz1], [qx1, G + 1.1, qz0], [qx0, G + 1.1, qz0], [0, 1, 1]), ...quad([qx0, G, qz0], [qx1, G, qz0], [qx1, G + 1.1, qz0], [qx0, G + 1.1, qz0], [0, 0, -1])]), SKATE_CONC);
    b.add(tris([{ p: [[qx0, G, qz0], [qx0, G, qz1], [qx0, G + 1.1, qz0]], n: [-1, 0, 0] }, { p: [[qx1, G, qz0], [qx1, G, qz1], [qx1, G + 1.1, qz0]], n: [1, 0, 0] }]), SKATE_CONC);
  }
  rb(b, FUNBOX as R4b, G, G + 0.5, SKATE_CONC);
  along(b, RAIL[0], RAIL[1], 0.06, G + 0.45, G + 0.52, PAINT_RED);
  for (const p of RAIL) along(b, p, [p[0] + 0.01, p[1]], 0.06, G, G + 0.5, PAINT_RED);
  // The playground: bark under it, the swings' frame, a slide
  flat(b, ringOf(PLAYGROUND as R4b), G + 0.006, BARK);
  for (const x of [SWINGS[0] + 0.08, SWINGS[2] - 0.08]) along(b, [x, SWINGS[1]], [x, SWINGS[3]], 0.1, G, G + 1.6, PAINT_BLUE);
  along(b, [SWINGS[0], (SWINGS[1] + SWINGS[3]) / 2], [SWINGS[2], (SWINGS[1] + SWINGS[3]) / 2], 0.1, G + 1.5, G + 1.6, PAINT_BLUE);
  rb(b, [SLIDE[0], SLIDE[1], SLIDE[0] + 0.6, SLIDE[3]], G, G + 1.3, PAINT_RED);
  b.add(tris(quad([SLIDE[0] + 0.6, G + 1.3, SLIDE[1]], [SLIDE[0] + 0.6, G + 1.3, SLIDE[3]], [SLIDE[2], G + 0.1, SLIDE[3]], [SLIDE[2], G + 0.1, SLIDE[1]], [0.4, 1, 0])), PAINT_BLUE);
  // The benches
  for (const { at, yaw } of BENCHES) {
    const t: Pt = [Math.cos(yaw), -Math.sin(yaw)];
    along(b, [at[0] - t[0] * 0.7, at[1] - t[1] * 0.7], [at[0] + t[0] * 0.7, at[1] + t[1] * 0.7], 0.45, G + 0.38, G + 0.45, OAK);
  }
  // The paths: from Brookside to the bridge and on from the gate to the pavilion
  for (const line of [FOOTPATH, REC_PATH]) for (let i = 1; i < line.length; i++) along(b, line[i - 1], line[i], REC_PATH_W, G - 0.02, G + 0.008, GRAVEL);
}
/** The footbridge (level on its own: its deck humped over the brook's valley, its rails) */
function drawRecBridge(b: Batch) {
  const n = 10;
  for (let k = 0; k < n; k++) {
    const [za, zc] = [BRIDGE.z0 + ((BRIDGE.z1 - BRIDGE.z0) * k) / n, BRIDGE.z0 + ((BRIDGE.z1 - BRIDGE.z0) * (k + 1)) / n];
    const [ya, yc] = [recBridgeY(BRIDGE.x, za)!, recBridgeY(BRIDGE.x, zc)!];
    const mid = (ya + yc) / 2;
    b.add(box(BRIDGE.half * 2, 0.12, zc - za + 0.02, BRIDGE.x, mid - 0.06, (za + zc) / 2).applyMatrix4(new THREE.Matrix4().makeRotationX(0)), OAK);
    for (const s of [-1, 1]) b.add(box(0.06, 0.06, zc - za + 0.02, BRIDGE.x + s * (BRIDGE.half - 0.05), mid + 0.9, (za + zc) / 2), OAK);
    for (const s of [-1, 1]) b.add(box(0.07, 0.95, 0.07, BRIDGE.x + s * (BRIDGE.half - 0.05), ya + 0.45, za), OAK);
  }
}

/** The houses in sites of about ten (in the order they were laid: along a street) */
export const CHUNK = 10;
export function register({ low, scene }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
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
  // The High Road's places (highroad3d.ts, 3c)
  registerHighRoad(low);
  // The council rows, the bungalows, the corner shops, the community centre, the allotments (council3d.ts, 3d)
  registerCouncil(low, scene);
  // Aldwyn's Green Rec (rec.ts, 3e): its ground on the rolling ground, its footbridge level on its own
  site('village rec', [PITCH[0] - 16, PITCH[1] - 4, SKATE[2] + 4, PITCH[3] + 6], (into) => {
    const b = new Batch();
    drawRec(b, low);
    b.build(into, { cast: true, receive: true });
  });
  site('village rec bridge', [BRIDGE.x - 3, FOOTPATH[0][1] - 1, BRIDGE.x + 3, BRIDGE.z1 + 1], (into) => {
    const b = new Batch();
    drawRecBridge(b);
    b.build(into, { cast: true, receive: true, lift: false });
  });
  // St Aldwyn's: the church level on its plinth, its churchyard on the hill
  site('village st aldwyns', [CHURCHYARD.reduce((v, p) => Math.min(v, p[0]), Infinity) - 2, CHURCHYARD.reduce((v, p) => Math.min(v, p[1]), Infinity) - 10, CHURCHYARD.reduce((v, p) => Math.max(v, p[0]), -Infinity) + 2, CHURCHYARD.reduce((v, p) => Math.max(v, p[1]), -Infinity) + 2], (into) => {
    const b = new Batch();
    drawChurch(b, low);
    b.build(into, { cast: true, receive: true, lift: false });
    const g = new Batch();
    drawChurchyard(g, low);
    g.build(into, { cast: true, receive: true });
  });
  if (GINNELS.length)
    site('village ginnels', rectOf(GINNELS.map((g) => g.at), 10), (into) => {
      const b = new Batch();
      drawGinnels(b);
      b.build(into, { cast: false, receive: true });
    });
}
