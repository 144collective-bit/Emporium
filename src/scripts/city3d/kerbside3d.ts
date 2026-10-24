/*
 * Uptown's kerbside on screen (docs/finance-plan.md Phase 5; the numbers are
 * uptown.ts's and kerbside.ts's), in Uptown's chunk: the paint and signs that
 * make its streets read as real ones, and what stands at their edges.
 *
 * - **The one-way pair:** a green bike lane on each street's kerb side
 *   (`BIKE`), arrows down the lane, ONE WAY signs at its junctions.
 * - **The circle:** give-way teeth and a yield sign on every way in, arrows
 *   round its carriageway, and on its island the monument (`MONUMENT`: a
 *   stepped granite plinth, a column, a gilded globe), flowers and uplights.
 * - **The bank avenue's bus lanes** (its kerb lanes, red, BUS painted on), and
 *   turn arrows in the avenues' lanes coming up to Uptown's junctions.
 * - **The lay-bys:** bays marked out, TAXI and LOADING painted in theirs, a
 *   taxi sign at the rank's head, the porte-cochères over the lobbies behind
 *   the valets' bays (a glass roof on steel posts, lit along its edge, a VALET
 *   stand), the parked cars (main thread: `parkedCars()`).
 * - **The service alleys:** bollards at their mouths, a dumpster, roll-up
 *   doors in the podiums' sides with a lamp over each, crates (near).
 *
 * Sign and paint copy is fixed (ONE WAY, TAXI, VALET, LOADING, BUS): one
 * small atlas each, signs lit a little at night.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import { SLAB } from './world';
import { site } from './tilework';
import { LANE, MEDIAN } from './layout';
import { parkedCars, type CarId } from './cars';
import { HIGHRISES } from './highrise';
import { AXIS_X, BIKE, CIRCLE, COUPLET, ISLAND_R, LANE_HALF, LAYBYS, ROWS_Z, UPTOWN_CROSSINGS, UPTOWN_STREETS, crossingsOn, laybyRect, type Layby, type Pt, type Rect } from './uptown';
import { ALLEY_BOLLARDS, ALLEY_DUMPSTERS, BOLLARD_R, DOCK_H, DUMPSTER, LAYBY_CARS, MONUMENT, SERVICE_ALLEYS, SPACE } from './kerbside';

const [RING, , , BANK] = ROWS_Z;
/** Paint over the asphalt (Uptown's streets at 0.031, the avenues' at 0.03, their dashes at 0.036) */
const PAINT_Y = 0.034;
const MARK_Y = 0.0395;

const WHITE = toon('#e8e4f8');
const GREEN = toon('#2f8a52');
const RED = toon('#9c2e2e');
const YELLOW = toon('#f2c94c');
const POST = toon('#5c5878');
const STEEL = toon('#2a2740');
const GLASS = toon('#a9dcef');
const GRANITE = toon('#8f8aa3');
const GRANITE_DARK = toon('#6f6a86');
const FLOWERS = [toon('#ff5fa2'), toon('#ffd23f'), toon('#b18cff')];
const LEAF = toon('#2f6a3c');
const BIN = toon('#2f6b4a');
const LID = toon('#22252e');
const DOOR = toon('#7d7a90');
const CRATE = toon('#9a7650');
const BAND = toon('#ffd23f');
const EDGE = neon('#9fe8ff', 0.15, 1.6);
const LAMP = neon('#ffe2a8', 0.2, 1.3);

/** The gilded globe and the column's gold band, glowing a little at night as if floodlit */
const GOLD = siteMat('kerb-gold', lit(new THREE.MeshToonMaterial({ color: '#d8ae48', emissive: '#ffcf70' }), 0, 0.3));

/* ---------- Two small atlases: signs (lit) and road paint (on the asphalt's own colour) ---------- */

const SIGN_ROWS = ['ONE WAY', 'ONE WAY ', 'TAXI', 'VALET', 'LOADING'] as const;
const SIGNS = (() => {
  const tex = canvasTex(256, 64 * SIGN_ROWS.length, (c) => {
    SIGN_ROWS.forEach((t, i) => {
      const y = i * 64;
      const oneWay = t.startsWith('ONE WAY');
      const [bg, fg] = oneWay ? ['#101018', '#ffffff'] : t === 'TAXI' ? ['#101018', '#ffc23d'] : t === 'VALET' ? ['#1c2a55', '#ffe9c2'] : ['#f2c94c', '#101018'];
      c.fillStyle = bg;
      c.fillRect(0, y, 256, 64);
      if (oneWay) {
        // A white arrow with the words on it: pointing right in the first row, left in the second (the text reads the same)
        const k = t === 'ONE WAY' ? 1 : -1;
        const X = (v: number) => (k > 0 ? v : 256 - v);
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.moveTo(X(14), y + 20);
        c.lineTo(X(196), y + 20);
        c.lineTo(X(196), y + 8);
        c.lineTo(X(244), y + 32);
        c.lineTo(X(196), y + 56);
        c.lineTo(X(196), y + 44);
        c.lineTo(X(14), y + 44);
        c.closePath();
        c.fill();
        c.fillStyle = '#101018';
        c.font = `800 26px ${FONT_DISPLAY}`;
      } else {
        c.fillStyle = fg;
        c.font = `800 40px ${FONT_DISPLAY}`;
      }
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(t.trim(), oneWay ? (t === 'ONE WAY' ? 110 : 146) : 128, y + 33);
    });
  });
  return siteMat('kerb-signs', lit(new THREE.MeshBasicMaterial({ map: tex, color: '#ffffff' }), 0.9, 1.2));
})();
const PAINT_ROWS = ['BUS', 'TAXI', 'LOADING'] as const;
const PAINT = (() => {
  const tex = canvasTex(256, 64 * PAINT_ROWS.length, (c) => {
    PAINT_ROWS.forEach((t, i) => {
      const y = i * 64;
      c.fillStyle = t === 'BUS' ? '#9c2e2e' : '#26243f';
      c.fillRect(0, y, 256, 64);
      c.fillStyle = t === 'BUS' ? '#f3f2f7' : '#f2c94c';
      c.font = `800 46px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(t, 128, y + 34);
    });
  });
  return siteMat('kerb-paint', new THREE.MeshToonMaterial({ map: tex, color: '#ffffff' }));
})();
/** A flat plate of one row of an atlas, w by d, at (x, y, z), its text reading along `ry` (0: along +x) */
function plate(b: Batch, mat: THREE.Material, rows: number, row: number, w: number, d: number, x: number, y: number, z: number, ry: number) {
  const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (row + 1 - uv.getY(i)) / rows);
  b.add(g.rotateY(ry).translate(x, y, z), mat);
}
/** An upright sign of one row of the sign atlas, w by h, its face towards (nx, nz), a post under it */
function sign(b: Batch, row: number, w: number, h: number, x: number, z: number, nx: number, nz: number, top = 2.1) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (row + 1 - uv.getY(i)) / SIGN_ROWS.length);
  b.add(g.rotateY(Math.atan2(nx, nz)).translate(x + nx * 0.03, SLAB + top - h / 2, z + nz * 0.03), SIGNS);
  // (its back, the post's colour)
  b.add(new THREE.BoxGeometry(Math.abs(nz) > 0.5 ? w : 0.03, h, Math.abs(nz) > 0.5 ? 0.03 : w).translate(x, SLAB + top - h / 2, z), POST);
  b.add(new THREE.CylinderGeometry(0.035, 0.035, top, 6, 1, true).translate(x - nx * 0.04, SLAB + top / 2, z - nz * 0.04), POST);
}

/* ---------- Painted arrows ---------- */

/** An arrow lying flat, pointing +x, `len` long: straight, turning left (seen from above, north up) or straight-and-right */
function arrowShape(kind: 'straight' | 'left' | 'right', len: number): THREE.Shape {
  const s = new THREE.Shape();
  const w = 0.09;
  const head = 0.42;
  if (kind === 'straight') {
    s.moveTo(-len / 2, -w);
    s.lineTo(len / 2 - head, -w);
    s.lineTo(len / 2 - head, -0.26);
    s.lineTo(len / 2, 0);
    s.lineTo(len / 2 - head, 0.26);
    s.lineTo(len / 2 - head, w);
    s.lineTo(-len / 2, w);
    return s;
  }
  // A shaft, then a head turned off to one side (left: towards -z seen from above with north up, as +x is east)
  const side = kind === 'left' ? -1 : 1;
  const k = len * 0.2;
  s.moveTo(-len / 2, -w);
  s.lineTo(k + w, -w);
  s.lineTo(k + w, side * 0.5);
  s.lineTo(k + 0.26, side * 0.5);
  s.lineTo(k, side * (0.5 + head));
  s.lineTo(k - 0.26, side * 0.5);
  s.lineTo(k - w, side * 0.5);
  s.lineTo(k - w, w);
  s.lineTo(-len / 2, w);
  return s;
}
/** Lay an arrow at (x, z) pointing along (ux, uz) */
function arrow(b: Batch, kind: 'straight' | 'left' | 'right', len: number, x: number, z: number, ux: number, uz: number) {
  // (a shape lies in x and y: turned flat, its +y becomes -z)
  const g = new THREE.ShapeGeometry(arrowShape(kind, len)).rotateX(-Math.PI / 2);
  b.add(g.rotateY(Math.atan2(-uz, ux)).translate(x, MARK_Y, z), WHITE);
  if (kind === 'right') {
    // (straight and right: a straight one alongside)
    const s = new THREE.ShapeGeometry(arrowShape('straight', len)).rotateX(-Math.PI / 2);
    b.add(s.rotateY(Math.atan2(-uz, ux)).translate(x, MARK_Y, z), WHITE);
  }
}

/* ---------- The one-way pair ---------- */

/** The junctions down a street of the pair (z), with how far each reaches either side */
const pairStops = (x: number): [number, number][] => [
  ...ROWS_Z.map((r): [number, number] => [r.c, r.half + 1.1]),
  ...(x === COUPLET.north ? [[CIRCLE.z, 2.3 + 1.1] as [number, number]] : []),
];
/** The stretches of a street of the pair between its junctions */
function pairRuns(x: number): [number, number][] {
  const stops = pairStops(x).sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (let i = 1; i < stops.length; i++) out.push([stops[i - 1][0] + stops[i - 1][1], stops[i][0] - stops[i][1]]);
  return out.filter(([a, b]) => b - a > 1);
}
function pair(b: Batch, x: number, dir: 1 | -1, z0: number, z1: number) {
  // The bike lane on the kerb side right of travel (northbound: the east kerb; southbound: the west)
  const side = -dir;
  const bx = x + side * BIKE.off;
  // (dashed past the taxi rank, where cabs pull across it)
  const rank = laybyRect(LAYBYS.find((l) => l.id === 'taxi')!);
  const crossesRank = (z: number) => x === COUPLET.south && z > rank[1] - 1 && z < rank[3] + 1;
  for (let z = z0; z < z1 - 0.01; z += 1) {
    const zz = Math.min(z1, z + 1);
    if (crossesRank(z) && Math.floor(z) % 2) continue;
    b.box(bx - BIKE.w / 2, 0, z, BIKE.w, PAINT_Y, zz - z, GREEN);
  }
  // Its line, solid, between it and the cars
  const lx = bx - side * (BIKE.w / 2 + 0.05);
  b.box(lx - 0.03, 0, z0, 0.06, PAINT_Y + 0.0015, z1 - z0, WHITE);
  b.detail(() => {
    // A bike painted every so often (two wheels, a frame), and arrows down the lane
    for (let z = z0 + 3; z < z1 - 2; z += 9) {
      for (const dz of [-0.28, 0.28]) b.add(new THREE.RingGeometry(0.11, 0.15, 12).rotateX(-Math.PI / 2).translate(bx, MARK_Y, z + dz), WHITE);
      b.box(bx - 0.02, 0, z - 0.28, 0.04, MARK_Y, 0.56, WHITE);
    }
    for (let z = z0 + 7.5; z < z1 - 3; z += 14) arrow(b, 'straight', 1.8, x, z, 0, dir);
  });
}

/* ---------- The circle ---------- */

function circle(b: Batch, low: boolean) {
  const { x: cx, z: cz, r, half } = CIRCLE;
  // Arrows round the carriageway, anticlockwise (north up): at each, along the way round
  b.detail(() => {
    for (const a of [Math.PI * 0.25, Math.PI * 0.92, Math.PI * 1.58]) {
      const [x, z] = [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
      // (the way round: going from the east point towards the north, angle falling)
      arrow(b, 'straight', 1.6, x, z, Math.sin(a), -Math.cos(a));
    }
  });
  // On every way in: give-way teeth across its inbound half, a yield sign on its kerb
  for (const id of ['circle-n', 'circle-s', 'circle-e']) {
    const s = UPTOWN_STREETS.find((q) => q.id === `uptown-${id}`)!;
    const end = s.pts.find((p) => Math.abs(Math.hypot(p[0] - cx, p[1] - cz) - r) < 1e-6)!;
    // Inbound: towards the circle's middle; its lane right of that
    const [ux, uz] = [(cx - end[0]) / r, (cz - end[1]) / r];
    const [rx, rz] = [-uz, ux];
    const d = r + half + 0.35;
    const [px, pz] = [cx - ux * d, cz - uz * d];
    const lane0 = s.median ? s.median / 2 : 0;
    for (let w = lane0 + 0.12; w < s.half - 0.08; w += 0.3) {
      const g = new THREE.CircleGeometry(0.15, 3).rotateX(-Math.PI / 2).rotateY(Math.atan2(-uz, ux) + Math.PI);
      b.add(g.translate(px + rx * w, MARK_Y, pz + rz * w), WHITE);
    }
    // The sign, on the sidewalk right of the way in, facing the cars coming
    const [sx, sz] = [cx - ux * (d + 0.8) + rx * (s.half + 0.45), cz - uz * (d + 0.8) + rz * (s.half + 0.45)];
    const face: Pt = [-ux, -uz];
    const ry = Math.atan2(face[0], face[1]);
    b.add(new THREE.CircleGeometry(0.34, 3).rotateZ(-Math.PI / 2).rotateY(ry).translate(sx + face[0] * 0.03, SLAB + 1.8, sz + face[1] * 0.03), RED);
    b.add(new THREE.CircleGeometry(0.22, 3).rotateZ(-Math.PI / 2).rotateY(ry).translate(sx + face[0] * 0.035, SLAB + 1.8, sz + face[1] * 0.035), WHITE);
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 6, 1, true).translate(sx, SLAB + 0.9, sz), POST);
  }
  // The island: the monument on its plinth, flowers round it, uplights
  const { plinth, column, globe } = MONUMENT;
  let y = SLAB;
  for (const [h, top] of plinth) {
    b.box(cx - h, y, cz - h, h * 2, SLAB + top - y, h * 2, y === SLAB ? GRANITE_DARK : GRANITE);
    y = SLAB + top;
  }
  b.add(new THREE.CylinderGeometry(column.r * 1.35, column.r * 1.5, 0.4, low ? 8 : 16).translate(cx, y + 0.2, cz), GRANITE_DARK);
  b.add(new THREE.CylinderGeometry(column.r * 0.88, column.r, SLAB + column.top - y - 0.4, low ? 8 : 16, 1, true).translate(cx, (y + 0.4 + SLAB + column.top) / 2, cz), GRANITE);
  b.add(new THREE.CylinderGeometry(column.r * 1.3, column.r * 1.05, 0.35, low ? 8 : 16).translate(cx, SLAB + column.top - 0.17, cz), GOLD);
  b.add(new THREE.IcosahedronGeometry(globe, low ? 1 : 2).translate(cx, SLAB + column.top + globe * 0.9, cz), GOLD);
  b.detail(() => {
    // A ring of the globe's meridians, and the flowers round the plinth
    b.add(new THREE.TorusGeometry(globe * 1.12, 0.03, 4, 24).translate(cx, SLAB + column.top + globe * 0.9, cz), GOLD);
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      const rr = (ISLAND_R - 0.8 + plinth[0][0]) / 2 + 0.35;
      b.add(new THREE.IcosahedronGeometry(0.2, 0).scale(1, 0.6, 1).translate(cx + Math.cos(a) * rr, SLAB + 0.12, cz + Math.sin(a) * rr), k % 2 ? LEAF : FLOWERS[k % FLOWERS.length]);
    }
  });
  for (const a of [0.4, 2.5, 4.6]) b.box(cx + Math.cos(a) * (plinth[0][0] + 0.35) - 0.09, SLAB, cz + Math.sin(a) * (plinth[0][0] + 0.35) - 0.09, 0.18, 0.08, 0.18, LAMP);
}

/* ---------- The avenues: the bank avenue's bus lanes, turn arrows into the junctions ---------- */

/** The stretches of an avenue through Uptown clear of its junctions and the axis's zebra */
function avenueRuns(r: (typeof ROWS_Z)[number], x0: number, x1: number): [number, number][] {
  const cuts = [...crossingsOn(r).map((x): [number, number] => [x - 2.3 - 1.4, x + 2.3 + 1.4]), [AXIS_X - LANE_HALF - 1, AXIS_X + LANE_HALF + 1] as [number, number]].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  let at = x0;
  for (const [a, b] of cuts) {
    if (a - at > 1) out.push([at, a]);
    at = Math.max(at, b);
  }
  if (x1 - at > 1) out.push([at, x1]);
  return out;
}
function busLanes(b: Batch, x0: number, x1: number) {
  // The kerb lanes both ways (east on the south side, west on the north), red, BUS every so often
  const [inner, outer] = [MEDIAN / 2 + LANE, MEDIAN / 2 + LANE * 2 - 0.06];
  for (const [a, c] of avenueRuns(BANK, x0, x1))
    for (const side of [-1, 1]) {
      for (let x = a; x < c - 0.01; x += 6) b.box(x, 0, BANK.c + side * (side > 0 ? inner : outer), Math.min(6, c - x), PAINT_Y - 0.001, outer - inner, RED);
      b.detail(() => {
        for (let x = a + 2.5; x < c - 2; x += 14) plate(b, PAINT, PAINT_ROWS.length, 0, 1.4, 0.55, x, PAINT_Y + 0.0012, BANK.c + side * (inner + outer) / 2, side > 0 ? Math.PI / 2 : -Math.PI / 2);
      });
    }
}
/** Turn arrows in an avenue's lanes coming up to each of Uptown's lit junctions on it: left from the inner lane, straight or right from the outer */
function turnArrows(b: Batch) {
  for (const r of [RING, BANK])
    for (const c of UPTOWN_CROSSINGS.filter((q) => q.lights && q.at[1] === r.c))
      for (const dir of [1, -1] as const) {
        // (coming in along +x on the +z side, along -x on the -z side)
        const x = c.at[0] - dir * 9.5;
        for (const [off, kind] of [[MEDIAN / 2 + LANE / 2, 'left'], [MEDIAN / 2 + LANE * 1.5, 'right']] as const) arrow(b, kind, 1.8, x, r.c + dir * off, dir, 0);
      }
}

/* ---------- The lay-bys ---------- */

function bay(b: Batch, l: Layby) {
  const [x0, z0, x1, z1] = laybyRect(l);
  const alongX = l.side === 'n' || l.side === 's';
  // The line along its open side (where it meets the street), dashed; the kerb side is the sidewalk's
  const open = l.side === 'e' ? x1 : l.side === 'w' ? x0 : l.side === 's' ? z1 : z0;
  const len = alongX ? x1 - x0 : z1 - z0;
  for (let a = 0; a < len - 0.2; a += 0.9) {
    const p = (alongX ? x0 : z0) + a;
    const q = Math.min(p + 0.5, alongX ? x1 : z1);
    if (alongX) b.box(p, 0, open - 0.04, q - p, MARK_Y, 0.08, l.kind === 'loading' ? YELLOW : WHITE);
    else b.box(open - 0.04, 0, p, 0.08, MARK_Y, q - p, l.kind === 'loading' ? YELLOW : WHITE);
  }
  // Bays marked off along it (parking), or its word painted in it
  const mid: Pt = [(x0 + x1) / 2, (z0 + z1) / 2];
  const ry = alongX ? 0 : Math.PI / 2;
  if (l.kind === 'parking') {
    const n = Math.floor(len / SPACE);
    const s0 = (alongX ? x0 : z0) + (len - n * SPACE) / 2;
    for (let i = 0; i <= n; i++) {
      const p = s0 + i * SPACE;
      if (alongX) b.box(p - 0.04, 0, z0, 0.08, MARK_Y, z1 - z0, WHITE);
      else b.box(x0, 0, p - 0.04, x1 - x0, MARK_Y, 0.08, WHITE);
    }
  } else if (l.kind === 'taxi' || l.kind === 'loading') {
    const row = l.kind === 'taxi' ? 1 : 2;
    for (const k of l.kind === 'taxi' ? [-0.35, 0.35] : [0]) {
      const a = (alongX ? mid[0] : mid[1]) + k * len;
      plate(b, PAINT, PAINT_ROWS.length, row, 1.6, 0.62, alongX ? a : mid[0], MARK_Y + 0.001, alongX ? mid[1] : a, ry);
    }
    if (l.kind === 'loading') {
      // A yellow box round it, hatched across
      for (let a = 0.6; a < len - 0.4; a += 0.7) {
        const p = (alongX ? x0 : z0) + a;
        if (alongX) b.add(new THREE.PlaneGeometry(0.06, (z1 - z0) * 1.2).rotateX(-Math.PI / 2).rotateY(0.7).translate(p, PAINT_Y + 0.0005, mid[1]), YELLOW);
        else b.add(new THREE.PlaneGeometry((x1 - x0) * 1.2, 0.06).rotateX(-Math.PI / 2).rotateY(0.7).translate(mid[0], PAINT_Y + 0.0005, p), YELLOW);
      }
    }
  }
  // A sign at its head, on the sidewalk behind it (the taxi rank's, the valets' stand, the loading bay's)
  if (l.kind === 'parking') return;
  const back: Pt = l.side === 'e' ? [x0 - 0.45, z0 + 0.6] : l.side === 'w' ? [x1 + 0.45, z0 + 0.6] : l.side === 's' ? [x0 + 0.6, z0 - 0.45] : [x0 + 0.6, z1 + 0.45];
  // (facing along the bay, towards the cars pulling in)
  const face: Pt = alongX ? [-1, 0] : [0, -1];
  sign(b, l.kind === 'taxi' ? 2 : l.kind === 'valet' ? 3 : 4, 0.9, 0.24, back[0], back[1], face[0], face[1]);
}
/** The porte-cochères: over each lobby behind a valets' bay, a glass roof from the podium out over the sidewalk to the bay, on two posts */
function porteCocheres(b: Batch) {
  for (const l of LAYBYS.filter((q) => q.kind === 'valet')) {
    const r = laybyRect(l);
    for (const t of HIGHRISES.filter((q) => q.block === l.block && q.door[0] > l.from && q.door[0] < l.to)) {
      const pod = t.parts[0].rect;
      // From the podium's face (south: the bays are on the blocks' south sides) to just over the bay's back
      const [z0, z1] = [pod[3], r[1] + 0.3];
      const [x0, x1] = [t.door[0] - 2.3, t.door[0] + 2.3];
      const y = SLAB + 2.95;
      b.box(x0, y, z0 + 0.01, x1 - x0, 0.12, z1 - z0, STEEL);
      b.box(x0 + 0.12, y + 0.12, z0 + 0.12, x1 - x0 - 0.24, 0.03, z1 - z0 - 0.24, GLASS);
      // Lit along its outer edge
      b.box(x0, y - 0.05, z1 - 0.06, x1 - x0, 0.05, 0.06, EDGE);
      for (const x of [x0 + 0.15, x1 - 0.15]) b.add(new THREE.CylinderGeometry(0.07, 0.07, y - SLAB, 8, 1, true).translate(x, (SLAB + y) / 2, z1 - 0.25), STEEL);
    }
  }
}

/* ---------- The service alleys ---------- */

function alleys(b: Batch, low: boolean) {
  for (const [x, z] of ALLEY_BOLLARDS) {
    b.add(new THREE.CylinderGeometry(BOLLARD_R * 0.8, BOLLARD_R, 0.85, 8).translate(x, SLAB + 0.425, z), STEEL);
    b.add(new THREE.CylinderGeometry(BOLLARD_R * 0.86, BOLLARD_R * 0.86, 0.08, 8).translate(x, SLAB + 0.68, z), BAND);
  }
  for (const [x0, z0, x1, z1] of ALLEY_DUMPSTERS) {
    b.box(x0, SLAB + 0.08, z0, x1 - x0, DUMPSTER.h - 0.14, z1 - z0, BIN);
    b.box(x0 - 0.02, SLAB + DUMPSTER.h - 0.06, z0 - 0.02, x1 - x0 + 0.04, 0.06, z1 - z0 + 0.04, LID);
  }
  for (const a of SERVICE_ALLEYS) {
    // A roll-up door in each podium's side facing the way, a lamp over it
    a.towers.forEach((id, k) => {
      const pod = HIGHRISES.find((t) => t.id === id)!.parts[0].rect;
      const x = k === 0 ? pod[2] + 0.012 : pod[0] - 0.012;
      const z = (pod[1] + pod[3]) / 2 - 1.4 + k * 2.6;
      const w = 1.9;
      b.box(Math.min(x, x + (k === 0 ? 0.02 : -0.02)), SLAB, z - w / 2, 0.02, DOCK_H, w, DOOR);
      b.box(Math.min(x, x + (k === 0 ? 0.1 : -0.1)), SLAB + DOCK_H + 0.25, z - 0.15, 0.1, 0.12, 0.3, LAMP);
      b.detail(() => {
        if (low) return;
        // Its slats
        for (let y = SLAB + 0.25; y < SLAB + DOCK_H - 0.1; y += 0.22) b.box(Math.min(x, x + (k === 0 ? 0.03 : -0.03)), y, z - w / 2 + 0.04, 0.01, 0.025, w - 0.08, LID);
        // Crates stacked by it
        const cx = x + (k === 0 ? 0.45 : -0.45);
        b.box(cx - 0.3, SLAB, z + w / 2 + 0.2, 0.6, 0.45, 0.6, CRATE);
        b.box(cx - 0.25, SLAB + 0.45, z + w / 2 + 0.25, 0.5, 0.4, 0.5, CRATE);
      });
    });
  }
}

/* ---------- Registering ---------- */

const span = (pts: Pt[], m = 2): Rect => [Math.min(...pts.map((p) => p[0])) - m, Math.min(...pts.map((p) => p[1])) - m, Math.max(...pts.map((p) => p[0])) + m, Math.max(...pts.map((p) => p[1])) + m];

export function registerKerbside(low: boolean, scene: THREE.Scene | null) {
  // The one-way pair: each street a stretch at a time
  for (const [x, dir] of [[COUPLET.north, -1], [COUPLET.south, 1]] as const)
    pairRuns(x).forEach(([z0, z1], i) =>
      site(`uptown pair ${x} ${i}`, [x - 3, z0, x + 3, z1], (into) => {
        const b = new Batch();
        pair(b, x, dir, z0, z1);
        b.build(into, { cast: false, receive: true });
      })
    );
  // ONE WAY signs at the pair's junctions: on two corners of each, facing both ways along the street across
  site('uptown pair signs', [COUPLET.north - 4, RING.c - 4, COUPLET.south + 4, BANK.c + 4], (into) => {
    const b = new Batch();
    for (const c of UPTOWN_CROSSINGS.filter((q) => q.streets.includes('uptown-ns1') || q.streets.includes('uptown-ns2'))) {
      const s = UPTOWN_STREETS.find((q) => c.streets.includes(q.id) && q.oneway)!;
      // (north is the northbound street's way: against its points)
      const north = s.oneway === -1;
      const other = ROWS_Z.find((r) => r.c === c.at[1]);
      const reach = other ? other.half : 2.3;
      for (const side of [-1, 1]) {
        const [x, z] = [c.at[0] + side * (s.half + 0.5), c.at[1] - side * (reach + 0.55)];
        // Facing east, a plane's right is north; facing west, south: the arrow drawn pointing right or left to suit
        for (const face of [1, -1]) {
          const row = (face > 0) === north ? 0 : 1;
          const g = new THREE.PlaneGeometry(0.9, 0.24);
          const uv = g.attributes.uv;
          for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (row + 1 - uv.getY(i)) / SIGN_ROWS.length);
          b.add(g.rotateY((face * Math.PI) / 2).translate(x + face * 0.025, SLAB + 2.3, z), SIGNS);
        }
        b.box(x - 0.02, SLAB + 2.18, z - 0.45, 0.04, 0.24, 0.9, POST);
        b.add(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 6, 1, true).translate(x, SLAB + 1.1, z), POST);
      }
    }
    b.build(into, { cast: false, receive: true });
  });
  // The circle and its monument
  site('uptown circle', [CIRCLE.x - 9, CIRCLE.z - 9, CIRCLE.x + 9, CIRCLE.z + 9], (into) => {
    const b = new Batch();
    circle(b, low);
    b.build(into, { cast: true, receive: true });
  });
  // The bank avenue's bus lanes, in stretches; turn arrows
  const W0 = UPTOWN_CROSSINGS.reduce((a, c) => Math.min(a, c.at[0]), Infinity) - 30;
  const E0 = UPTOWN_CROSSINGS.reduce((a, c) => Math.max(a, c.at[0]), -Infinity) + 14;
  for (let x = W0; x < E0; x += 24)
    site(`uptown bus lane ${x}`, [x, BANK.c - 4, Math.min(E0, x + 24), BANK.c + 4], (into) => {
      const b = new Batch();
      busLanes(b, x, Math.min(E0, x + 24));
      b.build(into, { cast: false, receive: true });
    });
  site('uptown turn arrows', [W0, RING.c - 4, E0, BANK.c + 4], (into) => {
    const b = new Batch();
    b.detail(() => turnArrows(b));
    b.build(into, { cast: false, receive: true });
  });
  // The lay-bys and the porte-cochères
  for (const l of LAYBYS)
    site(`uptown bay ${l.id}`, span([[laybyRect(l)[0], laybyRect(l)[1]], [laybyRect(l)[2], laybyRect(l)[3]]], 3), (into) => {
      const b = new Batch();
      bay(b, l);
      if (l.kind === 'valet') porteCocheres(b);
      b.build(into, { cast: true, receive: true });
    });
  // The service alleys
  site('uptown alleys', span(SERVICE_ALLEYS.flatMap((a) => [[a.rect[0], a.rect[1]] as Pt, [a.rect[2], a.rect[3]] as Pt])), (into) => {
    const b = new Batch();
    alleys(b, low);
    b.build(into, { cast: true, receive: true });
  });
  // The cars in the lay-bys (on the main thread: they're instanced, with far forms)
  if (scene) parkedCars(scene, 0.031, LAYBY_CARS.map(({ car: [id, x, z, yaw, c] }) => [id as CarId, x, z, yaw, c]));
}
