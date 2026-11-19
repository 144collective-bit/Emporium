/*
 * The Circus below ground drawn (docs/south-plan.md Phase 4b; circus.ts the rules): the sunken plaza in the island
 * (its paved floor, three steps of concrete seats round it cut where the subways come in, its wall with an opening for
 * each, the coping, a railing round the rim and a neon strip under it, planters; its trees and lamps at the boot,
 * index.ts) and the four subways (their floors, the blocks' warm concrete walls, a painted mural on one wall of each,
 * made-up art with no words, strip lights in the ceiling and a neon line along each wall, the ramps' parapets and
 * coping, a headwall over each portal with its SUBWAY plate), and each mouth's paved path on to the sidewalk.
 * Registered by south3d.ts (the south's chunk).
 */
import * as THREE from 'three';
import { Batch, canvasTex, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { SLAB } from './world';
import { STONE } from './palette';
import { CONCRETE } from './southblocks';
import { CEIL, FLOOR, MOUTH_PATHS, SUBWAY, PATH_HALF, PLANTERS, PLANTER_H, PLAZA, SUBWAYS, SUBWAY_WAYS, type SubwayId } from './circus';
import { floorOf, openOf, pointOf, type Passage, type Pt } from './underground';
import { ROW, sign } from './tunnel3d';

const CONC = toon(CONCRETE);
const CONC_DARK = toon('#8b8277');
const SEAT = toon('#c2b9ac');
const COPING = toon('#cfc8bd');
const PAVING = toon(STONE.paving);
const PATH = toon(STONE.path);
const FLOOR_MAT = toon('#7d776f');
const CEIL_MAT = toon('#4a4650');
const SOIL = toon('#4a3a2e');
const RAIL = toon('#3b3846');
const TUBE = neon('#eef4ff', 0.6, 1.3);
const STRIP = neon('#38e6ff', 0.5, 1.6);
const STRIP_WARM = neon('#ff4fd8', 0.5, 1.6);

/* ---------- The murals: one atlas, a row a subway (made-up art, no words) ---------- */

const ORDER: SubwayId[] = ['nw', 'ne', 'se', 's'];
const MW = 1024;
const MH = 256;
const MURALS = canvasTex(MW, MH * ORDER.length, (c) => {
  const ink = '#15131c';
  const outline = (w = 6) => {
    c.lineWidth = w;
    c.strokeStyle = ink;
    c.stroke();
  };
  ORDER.forEach((_, k) => {
    const y = k * MH;
    c.save();
    c.beginPath();
    c.rect(0, y, MW, MH);
    c.clip();
    if (k === 0) {
      // A sunset over waves: bands of sky, the sun, rolling lines of sea
      ['#2a1f5c', '#5b2a86', '#c23c8f', '#ff8a4c', '#ffd166'].forEach((col, i) => {
        c.fillStyle = col;
        c.fillRect(0, y + i * 32, MW, 34);
      });
      c.beginPath();
      c.arc(MW * 0.62, y + 150, 70, 0, Math.PI * 2);
      c.fillStyle = '#fff1a8';
      c.fill();
      outline();
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        for (let x = 0; x <= MW; x += 16) c.lineTo(x, y + 160 + i * 26 + Math.sin(x / 50 + i) * 10);
        c.lineTo(MW, y + MH);
        c.lineTo(0, y + MH);
        c.closePath();
        c.fillStyle = ['#1aa7c9', '#1586b8', '#0f6a9c', '#0b4f7d'][i];
        c.fill();
        outline(4);
      }
    } else if (k === 1) {
      // Shapes: big circles, triangles and zigzags in the city's neon
      c.fillStyle = '#1d1a2e';
      c.fillRect(0, y, MW, MH);
      const cols = ['#ff4fd8', '#38e6ff', '#ffd166', '#7cff8a', '#9b6bff'];
      for (let i = 0; i < 9; i++) {
        c.beginPath();
        const [cx, cy, r] = [60 + i * 112, y + 70 + (i % 3) * 55, 34 + (i % 4) * 12];
        if (i % 2) c.arc(cx, cy, r, 0, Math.PI * 2);
        else {
          c.moveTo(cx, cy - r);
          c.lineTo(cx + r, cy + r);
          c.lineTo(cx - r, cy + r);
          c.closePath();
        }
        c.fillStyle = cols[i % cols.length];
        c.fill();
        outline();
      }
      c.beginPath();
      for (let x = 0; x <= MW; x += 40) c.lineTo(x, y + 220 + ((x / 40) % 2 ? -18 : 18));
      c.lineWidth = 10;
      c.strokeStyle = '#ffd166';
      c.stroke();
    } else if (k === 2) {
      // Hills and trees under a big sky
      c.fillStyle = '#8fd3ff';
      c.fillRect(0, y, MW, MH);
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(0, y + MH);
        for (let x = 0; x <= MW; x += 24) c.lineTo(x, y + 120 + i * 40 - Math.sin(x / (160 - i * 30) + i * 2) * 40);
        c.lineTo(MW, y + MH);
        c.closePath();
        c.fillStyle = ['#5bbf6a', '#3f9a55', '#2c7a45'][i];
        c.fill();
        outline(4);
      }
      for (let i = 0; i < 7; i++) {
        const [tx, ty] = [80 + i * 140, y + 150 + (i % 2) * 30];
        c.fillStyle = '#6b4a2f';
        c.fillRect(tx - 6, ty, 12, 40);
        c.beginPath();
        c.arc(tx, ty - 10, 30, 0, Math.PI * 2);
        c.fillStyle = '#2f8a4a';
        c.fill();
        outline(4);
      }
      c.beginPath();
      c.arc(140, y + 50, 30, 0, Math.PI * 2);
      c.fillStyle = '#fff1a8';
      c.fill();
      outline(4);
    } else {
      // Birds over the river: flowing bands and flying shapes
      c.fillStyle = '#ffe8c2';
      c.fillRect(0, y, MW, MH);
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        for (let x = 0; x <= MW; x += 16) c.lineTo(x, y + 140 + i * 24 + Math.sin(x / 90 + i * 0.8) * 16);
        c.lineTo(MW, y + MH);
        c.lineTo(0, y + MH);
        c.closePath();
        c.fillStyle = ['#7fd1c7', '#4cb5ae', '#2f8f9a', '#256f86', '#1d4f6b'][i];
        c.fill();
        outline(3);
      }
      for (let i = 0; i < 8; i++) {
        const [bx, by] = [70 + i * 120, y + 40 + (i % 3) * 28];
        c.beginPath();
        c.moveTo(bx - 34, by + 10);
        c.quadraticCurveTo(bx - 14, by - 18, bx, by + 6);
        c.quadraticCurveTo(bx + 14, by - 18, bx + 34, by + 10);
        c.lineWidth = 8;
        c.strokeStyle = ink;
        c.stroke();
      }
    }
    c.restore();
    // (a dark edge round each, as painted on a wall)
    c.lineWidth = 10;
    c.strokeStyle = ink;
    c.strokeRect(5, y + 5, MW - 10, MH - 10);
  });
});
const MURAL = siteMat('circus-murals', lit(new THREE.MeshBasicMaterial({ map: MURALS }), 0.85, 1.05));

/* ---------- Helpers ---------- */

/** A point of a passage: `s` along, `u` across (underground.ts) */
const P = (p: Passage, s: number, u: number): Pt => pointOf(p, s, u);
/** A flat or sloping quad of four corners at their own heights, facing up */
function upQuad(b: Batch, c: [number, number, number][], m: THREE.Material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(c.flat(), 3));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  b.add(g, m);
}
/** A vertical quad from a to c (their own bottoms and tops), facing n */
function wallQuad(b: Batch, a: Pt, c: Pt, ya0: number, ya1: number, yc0: number, yc1: number, n: Pt, m: THREE.Material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], ya0, a[1], c[0], yc0, c[1], c[0], yc1, c[1], a[0], ya1, a[1]], 3));
  const face = new THREE.Vector3(c[0] - a[0], yc0 - ya0, c[1] - a[1]).cross(new THREE.Vector3(0, 1, 0));
  g.setIndex(face.dot(new THREE.Vector3(n[0], 0, n[1])) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  b.add(g, m);
}
/** A slab along a passage from s0 to s1, across from u0 to u1, from y0 up to y1 (a wall, a parapet, a coping) */
function along(b: Batch, p: Passage, s0: number, s1: number, ua: number, ub: number, y0: number, y1: number, m: THREE.Material) {
  const [u0, u1] = [Math.min(ua, ub), Math.max(ua, ub)];
  const [a, c] = [P(p, s0, (u0 + u1) / 2), P(p, s1, (u0 + u1) / 2)];
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const yaw = Math.atan2(-(c[1] - a[1]), c[0] - a[0]);
  b.add(new THREE.BoxGeometry(len, y1 - y0, u1 - u0).rotateY(yaw).translate((a[0] + c[0]) / 2, (y0 + y1) / 2, (a[1] + c[1]) / 2), m);
}
/** The way into the passage across it (+u), as x, z */
const acrossDir = (p: Passage): Pt => {
  const a = p.axis as number;
  return [-Math.sin(a), Math.cos(a)];
};
const alongDir = (p: Passage): Pt => {
  const a = p.axis as number;
  return [Math.cos(a), Math.sin(a)];
};

/* ---------- The plaza ---------- */

const RAD = Math.PI / 180;
/** The subways' ways round the plaza, in order */
const WAYS = (Object.values(SUBWAY_WAYS) as number[]).map((d) => d * RAD).sort((a, b) => a - b);
const HALF = SUBWAYS[0].half;
/** Round the plaza at radius r between two subways (k to k+1): where their cuts meet it */
const gapAt = (r: number) => Math.asin(Math.min(1, HALF / r));
const at = (a: number, r: number): Pt => [PLAZA.x + r * Math.cos(a), PLAZA.z + r * Math.sin(a)];

/** A ring's top between two radii and the subways' cuts, at y (a seat's top, the floor's edge) */
function ringTop(b: Batch, r0: number, r1: number, y: number, m: THREE.Material, n: number) {
  WAYS.forEach((w, k) => {
    const next = WAYS[(k + 1) % WAYS.length] + (k + 1 === WAYS.length ? Math.PI * 2 : 0);
    const [a0, a1] = [w + gapAt(r0), next - gapAt(r0)];
    const [c0, c1] = [w + gapAt(r1), next - gapAt(r1)];
    const segs = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * n));
    for (let i = 0; i < segs; i++) {
      const [t0, t1] = [i / segs, (i + 1) / segs];
      const p = [at(a0 + (a1 - a0) * t0, r0), at(c0 + (c1 - c0) * t0, r1), at(c0 + (c1 - c0) * t1, r1), at(a0 + (a1 - a0) * t1, r0)];
      upQuad(b, p.map(([x, z]) => [x, y, z] as [number, number, number]), m);
    }
  });
}
/** A ring's face at radius r from y0 to y1 between the subways' cuts, facing in (to the middle) */
function ringFace(b: Batch, r: number, y0: number, y1: number, m: THREE.Material, n: number, cut = HALF) {
  const g = (rr: number) => Math.asin(Math.min(1, cut / rr));
  WAYS.forEach((w, k) => {
    const next = WAYS[(k + 1) % WAYS.length] + (k + 1 === WAYS.length ? Math.PI * 2 : 0);
    const [a0, a1] = [w + g(r), next - g(r)];
    const segs = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * n));
    for (let i = 0; i < segs; i++) {
      const [p, q] = [at(a0 + ((a1 - a0) * i) / segs, r), at(a0 + ((a1 - a0) * (i + 1)) / segs, r)];
      const mid: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      wallQuad(b, p, q, y0, y1, y0, y1, [PLAZA.x - mid[0], PLAZA.z - mid[1]], m);
    }
  });
}

function drawPlaza(b: Batch, low: boolean) {
  const n = low ? 40 : 72;
  const t = PLAZA.tiers!;
  const w = (PLAZA.r - t.r0) / t.n;
  // The paved floor, and its edge where the subways come in
  b.add(new THREE.CircleGeometry(t.r0 + 0.02, n).rotateX(-Math.PI / 2).translate(PLAZA.x, FLOOR, PLAZA.z), PAVING);
  // The seats: a top and a riser each, cut where the subways come in (the cut ends facing the subway)
  for (let k = 1; k <= t.n; k++) {
    const [r0, r1, y] = [t.r0 + (k - 1) * w, t.r0 + k * w, FLOOR + t.rise * k];
    ringTop(b, r0, r1, y, SEAT, n);
    ringFace(b, r0, y - t.rise, y, CONC_DARK, n);
    for (const way of WAYS)
      for (const side of [-1, 1]) {
        const [a, c] = [at(way + side * gapAt(r0), r0), at(way + side * gapAt(r1), r1)];
        const into: Pt = [Math.cos(way + (side * Math.PI) / 2), Math.sin(way + (side * Math.PI) / 2)];
        wallQuad(b, a, c, FLOOR, y, FLOOR, y, [-into[0], -into[1]], CONC_DARK);
      }
  }
  // The wall round it: full height between the subways, over each opening a lintel from the ceiling up
  const top = SLAB + 0.02;
  ringFace(b, PLAZA.r, FLOOR + t.rise * t.n, top, CONC, n);
  WAYS.forEach((way) => {
    const g = gapAt(PLAZA.r);
    const segs = 4;
    for (let i = 0; i < segs; i++) {
      const [p, q] = [at(way - g + (2 * g * i) / segs, PLAZA.r), at(way - g + (2 * g * (i + 1)) / segs, PLAZA.r)];
      wallQuad(b, p, q, CEIL, top, CEIL, top, [-Math.cos(way), -Math.sin(way)], CONC);
    }
  });
  // The coping round its rim, the neon strip just under it, the railing on it
  const cy = top + 0.06;
  b.add(new THREE.RingGeometry(PLAZA.r - 0.06, PLAZA.r + PLAZA.wall + 0.1, n, 1).rotateX(-Math.PI / 2).translate(PLAZA.x, cy, PLAZA.z), COPING);
  b.add(new THREE.CylinderGeometry(PLAZA.r - 0.06, PLAZA.r - 0.06, cy - top + 0.04, n, 1, true).translate(PLAZA.x, (cy + top - 0.04) / 2, PLAZA.z), COPING);
  b.add(new THREE.CylinderGeometry(PLAZA.r - 0.012, PLAZA.r - 0.012, 0.04, n, 1, true).translate(PLAZA.x, top - 0.12, PLAZA.z), STRIP);
  const rr = PLAZA.r + 0.12;
  b.add(new THREE.TorusGeometry(rr, 0.035, 5, n).rotateX(Math.PI / 2).translate(PLAZA.x, cy + PLAZA.rail, PLAZA.z), RAIL);
  b.add(new THREE.TorusGeometry(rr, 0.02, 4, n).rotateX(Math.PI / 2).translate(PLAZA.x, cy + PLAZA.rail * 0.5, PLAZA.z), RAIL);
  const posts = low ? 24 : 40;
  for (let i = 0; i < posts; i++) {
    const [x, z] = at((i / posts) * Math.PI * 2, rr);
    b.add(new THREE.CylinderGeometry(0.03, 0.03, PLAZA.rail, 5, 1, true).translate(x, cy + PLAZA.rail / 2, z), RAIL);
  }
  // The planters (their trees at the boot)
  for (const { at: [x, z], r } of PLANTERS) {
    b.add(new THREE.CylinderGeometry(r, r, PLANTER_H, low ? 12 : 20).translate(x, FLOOR + PLANTER_H / 2, z), CONC);
    b.add(new THREE.CircleGeometry(r - 0.08, low ? 12 : 20).rotateX(-Math.PI / 2).translate(x, FLOOR + PLANTER_H - 0.04, z), SOIL);
  }
}

/* ---------- A subway ---------- */

function drawSubway(b: Batch, p: Passage, row: number, low: boolean) {
  const h = p.half;
  const [roof0, roof1] = p.roofs[0];
  const [ramp1, a1] = openOf(p).at(-1)!;
  const start = p.a0 + 0.1;
  // (the plaza's wall along it: along-values are measured through the world's origin, circus.ts's from the Circus's middle)
  const wallAt = p.a0 - SUBWAY.from + PLAZA.r;
  const n = acrossDir(p);
  // The floor: level from the plaza to the ramp, then up it (5 mm over the plaza's floor where they meet)
  const floorPts = [start, roof0, roof1, (ramp1 + a1) / 2, a1];
  for (let k = 1; k < floorPts.length; k++) {
    const [s0, s1] = [floorPts[k - 1], floorPts[k]];
    const [y0, y1] = [floorOf(p, s0) + 0.005, floorOf(p, s1) + 0.005];
    const c = [P(p, s0, -h), P(p, s0, h), P(p, s1, h), P(p, s1, -h)];
    upQuad(b, [[c[0][0], y0, c[0][1]], [c[1][0], y0, c[1][1]], [c[2][0], y1, c[2][1]], [c[3][0], y1, c[3][1]]], FLOOR_MAT);
  }
  // Under the roof: the walls (from the plaza's wall to the portal), the ceiling, its strip lights and the neon lines
  for (const side of [-1, 1]) along(b, p, wallAt, roof1, side * h, side * (h + p.wall), FLOOR, 0, CONC);
  // (the ceiling, facing down)
  const under = new THREE.BufferGeometry();
  const cs = [P(p, wallAt, -h), P(p, roof1, -h), P(p, roof1, h), P(p, wallAt, h)];
  under.setAttribute('position', new THREE.Float32BufferAttribute(cs.flatMap(([x, z]) => [x, CEIL, z]), 3));
  under.setIndex([0, 1, 2, 0, 2, 3]);
  under.computeVertexNormals();
  if (under.attributes.normal.getY(0) > 0) under.setIndex([0, 2, 1, 0, 3, 2]);
  under.computeVertexNormals();
  b.add(under, CEIL_MAT);
  for (let s = wallAt + 0.9; s < roof1 - 0.4; s += 1.5) {
    const [x, z] = P(p, s, 0);
    const yaw = Math.atan2(-alongDir(p)[1], alongDir(p)[0]);
    b.add(new THREE.BoxGeometry(0.9, 0.04, 0.1).rotateY(yaw).translate(x, CEIL - 0.03, z), TUBE);
  }
  for (const side of [-1, 1]) along(b, p, wallAt + 0.1, roof1 - 0.1, side * (h - 0.012), side * (h - 0.004), CEIL - 0.1, CEIL - 0.06, side < 0 ? STRIP : STRIP_WARM);
  // The mural on its left wall (facing across into the subway), under the neon line
  const [m0, m1] = [roof0 + 0.25, roof1 - 0.35];
  const mw = m1 - m0;
  const mh = Math.min(1.25, CEIL - FLOOR - 0.35);
  const mid = P(p, (m0 + m1) / 2, -h + 0.008);
  const g = new THREE.PlaneGeometry(mw, mh);
  const [v0, v1] = [1 - ((row + 1) * MH) / (MH * ORDER.length), 1 - (row * MH) / (MH * ORDER.length)];
  // (the plane faces +z before it's turned: turned to face +u, its left the way back towards the plaza)
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v1, 1, v1, 0, v0, 1, v0], 2));
  g.rotateY(Math.atan2(n[0], n[1])).translate(mid[0], FLOOR + 0.2 + mh / 2, mid[1]);
  b.add(g, MURAL);
  // The ramp: its walls up to the parapets, their coping
  for (const side of [-1, 1]) {
    along(b, p, roof1, a1, side * h, side * (h + p.wall), FLOOR, p.rail, CONC);
    along(b, p, roof1, a1, side * (h - 0.04), side * (h + p.wall + 0.04), p.rail, p.rail + 0.05, COPING);
  }
  // The step up from the ramp's top on to the block's slab, across its mouth
  wallQuad(b, P(p, a1, -h), P(p, a1, h), floorOf(p, a1), SLAB, floorOf(p, a1), SLAB, [-alongDir(p)[0], -alongDir(p)[1]], CONC_DARK);
  // The headwall over the portal (from the ceiling up to the parapets), its coping, the SUBWAY plate facing out
  along(b, p, roof1 - 0.3, roof1, -h - p.wall, h + p.wall, CEIL, p.rail, CONC);
  along(b, p, roof1 - 0.32, roof1 + 0.02, -h - p.wall - 0.04, h + p.wall + 0.04, p.rail, p.rail + 0.05, COPING);
  const plate = P(p, roof1 + 0.012, 0);
  sign(b, ROW.subway, plate[0], (CEIL + p.rail) / 2 + 0.05, plate[1], alongDir(p), 1.6, 0.4);
  // (a strip light over the portal facing out)
  const lamp = P(p, roof1 + 0.05, 0);
  b.add(new THREE.BoxGeometry(1.2, 0.05, 0.08).rotateY(Math.atan2(-n[1], n[0])).translate(lamp[0], CEIL - 0.06, lamp[1]), TUBE);
  void low;
}

/** Each mouth's path on to the sidewalk: paved, a strip a leg, a disc at each turn */
function drawPaths(b: Batch, low: boolean) {
  const y = SLAB + 0.008;
  for (const path of MOUTH_PATHS) {
    for (let k = 1; k < path.length; k++) {
      const [a, c] = [path[k - 1], path[k]];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (len < 0.01) continue;
      const yaw = Math.atan2(-(c[1] - a[1]), c[0] - a[0]);
      b.add(new THREE.PlaneGeometry(len, PATH_HALF * 2).rotateX(-Math.PI / 2).rotateY(yaw).translate((a[0] + c[0]) / 2, y, (a[1] + c[1]) / 2), PATH);
    }
    for (const q of path.slice(1, -1)) b.add(new THREE.CircleGeometry(PATH_HALF, low ? 8 : 14).rotateX(-Math.PI / 2).translate(q[0], y + 0.001, q[1]), PATH);
  }
}

/** The Circus's plaza and subways, a site each */
export function registerCircus(low: boolean) {
  const e = PLAZA.r + PLAZA.wall + 1;
  site('circus plaza', [PLAZA.x - e, PLAZA.z - e, PLAZA.x + e, PLAZA.z + e], (into) => {
    const b = new Batch();
    drawPlaza(b, low);
    b.build(into, { cast: true, receive: true, lift: false });
  });
  SUBWAYS.forEach((p) => {
    const id = p.id.slice('circus-'.length) as SubwayId;
    const pts = [P(p, p.a0, -3), P(p, p.a0, 3), P(p, p.a1 + 3, -3), P(p, p.a1 + 3, 3)];
    const xs = pts.map((q) => q[0]);
    const zs = pts.map((q) => q[1]);
    site(`circus subway ${id}`, [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], (into) => {
      const b = new Batch();
      drawSubway(b, p, ORDER.indexOf(id), low);
      b.build(into, { cast: false, receive: true, lift: false });
    });
  });
  const xs = MOUTH_PATHS.flat().map((q) => q[0]);
  const zs = MOUTH_PATHS.flat().map((q) => q[1]);
  site('circus paths', [Math.min(...xs) - 1, Math.min(...zs) - 1, Math.max(...xs) + 1, Math.max(...zs) + 1], (into) => {
    const b = new Batch();
    drawPaths(b, low);
    b.build(into, { cast: false, receive: true, lift: false });
  });
}
