/*
 * Endswood Estate drawn (docs/estate-plan.md Phase 2; the data is endswood.ts), a district loaded as you approach
 * (districts.ts `LAZY_DISTRICTS` id `endswood`), as sites (tilework.ts): Endswood Road and the Close (worn asphalt, a
 * dashed centre line, give-way lines where they join the Circus, the Close's concrete bollards), Endswood Circus (its
 * carriageway round the island, the island's kerb and paving), the well in its middle (its floor, its retaining wall
 * tiled at the foot with THE ENDS painted big over the tiles, the coping, the council-green railing round its rim,
 * tags and bills, a drain and a puddle), and the subways north and south from it (each a ramp down between parapets
 * in the spine, a headwall over the portal with its SUBWAY plate and a caged lamp, the concrete bollards at the top;
 * under the roof tiled walls, fluorescent strips, some tired, one dead, tags, a puddle), the spine's paving either
 * side. One small sign atlas of fixed made-up copy. Phones leave out the finest details. The blocks' slabs and
 * sidewalks are the street plan's (world.ts); the lamps are the boot's.
 */
import * as THREE from 'three';
import type { Tick } from './world';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { along } from './roads3d';
import { buildFx, poster, tag } from './grime';
import { COVER, KERB } from './palette';
import { BOLLARD, CIRCUS, CLOSE_BOLLARDS, CLOSE_END, ENDS_NICK, ISLAND_R, NORTH_Z, ROAD_HALF, ROAD_Z, SOUTH_Z, SPINE, SUBWAYS, SUBWAY_BOLLARDS, WELL, subwayEnds, type Pt, type Rect } from './endswood';
import { floorOf, type Passage } from './underground';
import { NS_ROADS, WALK_W } from './layout';
import { registerBlocks } from './endsblocks3d';
import { registerStreet } from './endsstreet3d';
import { registerBlend } from './endsblend3d';
import { registerLife } from './endslife3d';
import { BOLLARD as LOT9_BOLLARD, TUNNEL, TUNNEL_BOLLARDS, tunnelFloor } from './lot9';

export const SELF = import.meta.url;

/* ---------- Paint ---------- */

/** The roads' asphalt over the ground, the Circus's a little over it where they meet, the lines over both */
const ROAD_Y = 0.03;
const RING_Y = 0.035;
const LINE_Y = 0.041;
/** The spine's paving, the island's */
const PAVE_Y = 0.029;
const ISLAND_Y = 0.04;
const ASPHALT = toon('#2b2938');
const PATCH = toon('#33303f');
const LINE = toon('#d8d4c8');
const PAVING = toon(KERB.grit);
const ISLAND = toon(COVER.concrete);
const CONCRETE = toon('#8b8896');
const CONCRETE_DARK = toon('#6d6a78');
const COPING = toon('#a29fae');
const SUB_WALL = toon('#7a7789');
const SUB_FLOOR = toon('#54515e');
const SUB_CEIL = toon('#38363f');
const TILES = toon('#cfc7b0');
const TILES_DIRTY = toon('#b3ab95');
const GROUT = toon('#8c8573');
const RAIL = toon('#2f5a3e');
const PUDDLE = toon('#2a2b3b');
const BLACK = toon('#1c1b22');
const DRAIN = toon('#3a3843');
/** The subways' fluorescent strips (a few tired and flickering, one dead), the portals' caged bulbs */
const TUBE = neon('#e8f0ff', 0.6, 1.25);
const TUBE_TIRED = neon('#e8f0ff', 0.6, 1.25, 0.9);
const TUBE_DEAD = toon('#8a8f9a');
const BULB = neon('#ffc870', 0.2, 2.2);

/* ---------- Signs: one small atlas, a row each ---------- */

const ROWS: { text: string; bg: string | null; fg: string; edge?: string }[] = [
  { text: 'SUBWAY', bg: '#1f2a44', fg: '#efe9d6' },
  // (the estate's name, painted big on the well's wall over the tiles: no background, a dark edge round the letters)
  { text: ENDS_NICK, bg: null, fg: '#e8c23a', edge: '#1b1a20' },
];
const ATLAS_W = 512;
const ROW_H = 128;
const ATLAS = canvasTex(ATLAS_W, ROW_H * ROWS.length, (c) => {
  c.clearRect(0, 0, ATLAS_W, ROW_H * ROWS.length);
  ROWS.forEach((row, i) => {
    const y = i * ROW_H;
    if (row.bg) {
      c.fillStyle = row.bg;
      c.fillRect(0, y, ATLAS_W, ROW_H);
      c.strokeStyle = row.fg;
      c.lineWidth = 5;
      c.strokeRect(8, y + 8, ATLAS_W - 16, ROW_H - 16);
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let size = 82;
    c.font = `900 ${size}px ${FONT_DISPLAY}`;
    const w = c.measureText(row.text).width;
    if (w > ATLAS_W - 40) {
      size = Math.floor((size * (ATLAS_W - 40)) / w);
      c.font = `900 ${size}px ${FONT_DISPLAY}`;
    }
    if (row.edge) {
      c.lineJoin = 'round';
      c.lineWidth = 12;
      c.strokeStyle = row.edge;
      c.strokeText(row.text, ATLAS_W / 2, y + ROW_H / 2 + 4);
    }
    c.fillStyle = row.fg;
    c.fillText(row.text, ATLAS_W / 2, y + ROW_H / 2 + 4);
  });
});
const SIGN = siteMat('ends-sign', lit(new THREE.MeshBasicMaterial({ map: ATLAS, alphaTest: 0.3 }), 0.85, 1.05));
const ROW = { subway: 0, nick: 1 } as const;
/** A sign from the atlas facing n (x, z), its middle at (x, y, z) */
function sign(b: Batch, row: number, x: number, y: number, z: number, n: Pt, w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const [v0, v1] = [1 - (row * ROW_H + ROW_H) / (ROW_H * ROWS.length), 1 - (row * ROW_H) / (ROW_H * ROWS.length)];
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v1, 1, v1, 0, v0, 1, v0], 2));
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x, y, z), SIGN);
}

/* ---------- Helpers ---------- */

/** A flat strip along a straight run from a to c, `half` either side, at y */
function strip(b: Batch, a: Pt, c: Pt, half: number, y: number, m: THREE.Material) {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (l < 1e-3) return;
  b.add(
    new THREE.PlaneGeometry(l, half * 2)
      .rotateX(-Math.PI / 2)
      .rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]))
      .translate((a[0] + c[0]) / 2, y, (a[1] + c[1]) / 2),
    m
  );
}
/** A flat rect at y */
const flatRect = (b: Batch, [x0, z0, x1, z1]: Rect, y: number, m: THREE.Material) => {
  if (x1 - x0 < 1e-3 || z1 - z0 < 1e-3) return;
  b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2), m);
};
/** A box along a segment a to c, w across, from y0 to y1 */
function bar(b: Batch, a: Pt, c: Pt, w: number, y0: number, y1: number, m: THREE.Material) {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (l < 1e-3) return;
  b.add(
    new THREE.BoxGeometry(l, y1 - y0, w)
      .rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]))
      .translate((a[0] + c[0]) / 2, (y0 + y1) / 2, (a[1] + c[1]) / 2),
    m
  );
}
/** A cylinder post from y0 up h */
const post = (b: Batch, x: number, z: number, y0: number, h: number, r: number, m: THREE.Material, seg = 6) => b.add(new THREE.CylinderGeometry(r, r, h, seg, 1, true).translate(x, y0 + h / 2, z), m);
/** A vertical quad from (a, ya0..ya1) to (c, yc0..yc1), facing n */
function wallQuad(b: Batch, a: Pt, c: Pt, ya0: number, ya1: number, yc0: number, yc1: number, n: Pt, m: THREE.Material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], ya0, a[1], c[0], yc0, c[1], c[0], yc1, c[1], a[0], ya1, a[1]], 3));
  const e = new THREE.Vector3(c[0] - a[0], yc0 - ya0, c[1] - a[1]);
  const face = e.clone().cross(new THREE.Vector3(0, 1, 0));
  g.setIndex(face.dot(new THREE.Vector3(n[0], 0, n[1])) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  b.add(g, m);
}
/** A flat quad of four corners (a sloping floor's, or a ring's piece) at their own heights, facing up */
function upQuad(b: Batch, p: [number, number, number][], m: THREE.Material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p.flat(), 3));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  b.add(g, m);
}
/** A piece of a ring round (cx, cz) from radius r0 to r1, angle a0 to a1 in n steps, at y */
function annulus(b: Batch, cx: number, cz: number, r0: number, r1: number, a0: number, a1: number, n: number, y: number, m: THREE.Material) {
  for (let i = 0; i < n; i++) {
    const [p, q] = [a0 + ((a1 - a0) * i) / n, a0 + ((a1 - a0) * (i + 1)) / n];
    upQuad(
      b,
      [
        [cx + r0 * Math.cos(p), y, cz + r0 * Math.sin(p)],
        [cx + r1 * Math.cos(p), y, cz + r1 * Math.sin(p)],
        [cx + r1 * Math.cos(q), y, cz + r1 * Math.sin(q)],
        [cx + r0 * Math.cos(q), y, cz + r0 * Math.sin(q)],
      ],
      m
    );
  }
}
const QUARTERS: [number, number][] = [0, 1, 2, 3].map((k): [number, number] => [(k * Math.PI) / 2, ((k + 1) * Math.PI) / 2]);
/** The rect round a quarter of a ring of radius r */
const quarterRect = (cx: number, cz: number, r: number, [a0, a1]: [number, number]): Rect => {
  const xs = [0, Math.cos(a0), Math.cos(a1), ...(a0 < Math.PI && a1 > Math.PI ? [-1] : [])].map((v) => cx + r * v);
  const zs = [0, Math.sin(a0), Math.sin(a1), ...(a0 < Math.PI / 2 && a1 > Math.PI / 2 ? [1] : []), ...(a0 < (3 * Math.PI) / 2 && a1 > (3 * Math.PI) / 2 ? [-1] : [])].map((v) => cz + r * v);
  return [Math.min(...xs) - 1, Math.min(...zs) - 1, Math.max(...xs) + 1, Math.max(...zs) + 1];
};

/* ---------- The roads ---------- */

const AVE = NS_ROADS[0];
const NS1 = NS_ROADS[1];
const NS2 = NS_ROADS[2];
const EAST = NS_ROADS[3];
/** Where the roads' asphalt runs: up to each avenue's and street's kerb (theirs is world.ts's), into the Circus's ring */
const INTO_RING = CIRCUS.r + CIRCUS.half - 0.4;
const RUNS: { id: string; a: number; c: number; entry?: -1 | 1 }[] = [
  { id: 'road-w', a: CIRCUS.x + INTO_RING, c: AVE.c - AVE.half, entry: 1 },
  { id: 'road-e1', a: AVE.c + AVE.half, c: NS1.c - NS1.half },
  { id: 'road-e2', a: NS1.c + NS1.half, c: NS2.c - NS2.half },
  { id: 'road-e3', a: NS2.c + NS2.half, c: EAST.c - EAST.half },
  { id: 'close', a: CLOSE_END, c: CIRCUS.x - INTO_RING, entry: -1 },
];

function registerRoads(low: boolean) {
  for (const run of RUNS) {
    const pts = along([run.a, ROAD_Z], [run.c, ROAD_Z], 15);
    for (let k = 1; k < pts.length; k++) {
      const [p, q] = [pts[k - 1], pts[k]];
      site(`ends ${run.id} ${k}`, [p[0] - 1, ROAD_Z - ROAD_HALF - 1, q[0] + 1, ROAD_Z + ROAD_HALF + 1], (into) => {
        const b = new Batch();
        strip(b, p, q, ROAD_HALF, ROAD_Y, ASPHALT);
        // The centre line, dashed (a gap where it meets the Circus)
        for (let x = p[0] + 0.4; x < q[0] - 1.2; x += 3) if (Math.abs(x - CIRCUS.x) > INTO_RING + 2) strip(b, [x, ROAD_Z], [x + 1.4, ROAD_Z], 0.06, LINE_Y, LINE);
        // Patches in the asphalt, never across the line (near only)
        b.detail(() => {
          if (low) return;
          for (let x = p[0] + 2.5; x < q[0] - 2; x += 5.3) {
            const side = Math.sin(x * 1.7) > 0 ? 1 : -1;
            flatRect(b, [x, ROAD_Z + side * 0.3 + (side < 0 ? -1.1 : 0), x + 1.4 + Math.abs(Math.sin(x)) * 1.2, ROAD_Z + side * 0.3 + (side < 0 ? 0 : 1.1)], ROAD_Y + 0.004, PATCH);
          }
        });
        b.build(into, { cast: false, receive: true });
      });
    }
  }
  // Give-way lines across each lane into the Circus (traffic keeps right: into it from the east in the north lane,
  // from the west in the south lane)
  site('ends circus give-way', [CIRCUS.x - INTO_RING - 2, ROAD_Z - ROAD_HALF - 1, CIRCUS.x + INTO_RING + 2, ROAD_Z + ROAD_HALF + 1], (into) => {
    const b = new Batch();
    for (const k of [1, -1]) {
      const x = CIRCUS.x + k * (CIRCUS.r + CIRCUS.half + 0.3);
      const [z0, z1] = k > 0 ? [ROAD_Z - ROAD_HALF + 0.1, ROAD_Z] : [ROAD_Z, ROAD_Z + ROAD_HALF - 0.1];
      for (let z = z0; z < z1 - 0.2; z += 0.55) strip(b, [x, z], [x, z + 0.3], 0.07, LINE_Y, LINE);
    }
    b.build(into, { cast: false, receive: true });
  });
  // The Close's end: concrete bollards across it, a strip of paving past them to the open land
  site('ends close end', [CLOSE_END - 1.5, ROAD_Z - ROAD_HALF - 1, CLOSE_END + 1.5, ROAD_Z + ROAD_HALF + 1], (into) => {
    const b = new Batch();
    for (const [x, z] of CLOSE_BOLLARDS) {
      post(b, x, z, 0, BOLLARD.h, BOLLARD.r, CONCRETE, low ? 6 : 10);
      b.add(new THREE.SphereGeometry(BOLLARD.r, low ? 6 : 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, BOLLARD.h, z), CONCRETE);
    }
    b.build(into, { cast: true, receive: true });
  });
}

/* ---------- The Circus and its island ---------- */

function registerCircus(low: boolean) {
  const { x: cx, z: cz } = CIRCUS;
  const out = CIRCUS.r + CIRCUS.half + 0.15;
  QUARTERS.forEach((q, i) =>
    site(`ends circus ${i}`, quarterRect(cx, cz, out, q), (into) => {
      const b = new Batch();
      // The carriageway: tucked under the island's kerb and the blocks' slabs at its edges
      annulus(b, cx, cz, ISLAND_R - 0.1, out, q[0], q[1], low ? 6 : 10, RING_Y, ASPHALT);
      // The island's kerb, a low concrete ring, and its paving (over the well's square hole's corners)
      const n = low ? 8 : 12;
      for (let k = 0; k < n; k++) {
        const [a, c] = [q[0] + ((q[1] - q[0]) * k) / n, q[0] + ((q[1] - q[0]) * (k + 1)) / n];
        const r = ISLAND_R - 0.08;
        bar(b, [cx + r * Math.cos(a), cz + r * Math.sin(a)], [cx + r * Math.cos(c), cz + r * Math.sin(c)], 0.2, 0, 0.13, COPING);
      }
      annulus(b, cx, cz, WELL.r + WELL.wall - 0.02, ISLAND_R - 0.17, q[0], q[1], n, ISLAND_Y, ISLAND);
      b.build(into, { cast: false, receive: true });
    })
  );
}

/* ---------- The well ---------- */

/** The angles of the subways' mouths in the well's wall (north and south), and half the angle each takes */
const MOUTHS = [-Math.PI / 2, Math.PI / 2];
const MOUTH_HALF = Math.asin(SUBWAYS[0].half / WELL.r);
/** The wall's arcs between the mouths: east (from the north mouth round to the south one) and west */
const ARCS: [number, number][] = [
  [MOUTHS[0] + MOUTH_HALF, MOUTHS[1] - MOUTH_HALF],
  [MOUTHS[1] + MOUTH_HALF, MOUTHS[0] + Math.PI * 2 - MOUTH_HALF],
];

function registerWell(low: boolean) {
  const { x: cx, z: cz, r, floor } = WELL;
  site('ends well', [cx - r - 1, cz - r - 1, cx + r + 1, cz + r + 1], (into) => {
    const b = new Batch();
    const fx0 = new Batch();
    const at = (a: number, rr: number): Pt => [cx + rr * Math.cos(a), cz + rr * Math.sin(a)];
    // The floor: concrete, a drain in the middle, a puddle by it
    b.add(new THREE.CircleGeometry(r + 0.02, low ? 24 : 40).rotateX(-Math.PI / 2).translate(cx, floor, cz), SUB_FLOOR);
    b.add(new THREE.CircleGeometry(0.45, 10).rotateX(-Math.PI / 2).translate(cx, floor + 0.006, cz), DRAIN);
    b.add(new THREE.CircleGeometry(1.1, 12).rotateX(-Math.PI / 2).translate(cx + 1.2, floor + 0.004, cz + 0.6), PUDDLE);
    // The wall round it: the arcs between the mouths floor to ground, over each mouth a lintel from the subway's ceiling
    const seg = (a0: number, a1: number) => Math.max(2, Math.ceil(((a1 - a0) * r) / 0.9));
    const ring = (a0: number, a1: number, rr: number, y0: number, y1: number, m: THREE.Material) => {
      const n = seg(a0, a1);
      for (let k = 0; k < n; k++) {
        const [p, q] = [a0 + ((a1 - a0) * k) / n, a0 + ((a1 - a0) * (k + 1)) / n];
        const mid = (p + q) / 2;
        wallQuad(b, at(p, rr), at(q, rr), y0, y1, y0, y1, [-Math.cos(mid), -Math.sin(mid)], m);
      }
    };
    for (const [a0, a1] of ARCS) {
      ring(a0, a1, r, floor, 0.02, SUB_WALL);
      // The tiles round its foot, a grout line at their top, dirtier low down
      ring(a0, a1, r - 0.006, floor + 0.05, floor + 1.0, TILES);
      ring(a0, a1, r - 0.01, floor + 0.05, floor + 0.3, TILES_DIRTY);
      ring(a0, a1, r - 0.012, floor + 0.99, floor + 1.03, GROUT);
    }
    for (const m of MOUTHS) ring(m - MOUTH_HALF, m + MOUTH_HALF, r, SUBWAYS[0].ceil, 0.02, SUB_WALL);
    // The coping round its rim, and the council-green railing on it: posts, a top rail and a middle one
    annulus(b, cx, cz, r - 0.02, r + WELL.wall + 0.06, 0, Math.PI * 2, low ? 24 : 40, ISLAND_Y + 0.008, COPING);
    const pr = r + WELL.wall / 2;
    const n = Math.ceil((Math.PI * 2 * pr) / 1.1);
    for (let k = 0; k < n; k++) {
      const [p, q] = [(k / n) * Math.PI * 2, ((k + 1) / n) * Math.PI * 2];
      const [a, c] = [at(p, pr), at(q, pr)];
      post(b, a[0], a[1], ISLAND_Y, WELL.rail, 0.035, RAIL, 5);
      bar(b, a, c, 0.06, WELL.rail - 0.06, WELL.rail, RAIL);
      if (!low) bar(b, a, c, 0.04, WELL.rail * 0.5 - 0.02, WELL.rail * 0.5 + 0.02, RAIL);
    }
    // THE ENDS painted big round the east and west walls over the tiles, a letter's width a quad so it follows the
    // curve; tags and bills between (the FX layer)
    const mural = (mid: number) => {
      const span = 4.6 / r;
      const pieces = 12;
      for (let k = 0; k < pieces; k++) {
        const [p, q] = [mid - span / 2 + (span * k) / pieces, mid - span / 2 + (span * (k + 1)) / pieces];
        const [a, c] = [at(p, r - 0.03), at(q, r - 0.03)];
        const g = new THREE.BufferGeometry();
        const [y0, y1] = [floor + 0.25, floor + 1.45];
        g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], y0, a[1], c[0], y0, c[1], c[0], y1, c[1], a[0], y1, a[1]], 3));
        const [u0, u1] = [k / pieces, (k + 1) / pieces];
        const [v0, v1] = [1 - (ROW.nick * ROW_H + ROW_H) / (ROW_H * ROWS.length), 1 - (ROW.nick * ROW_H) / (ROW_H * ROWS.length)];
        // (read from inside the well, facing the wall: the angle grows to your right, so the words run with it)
        g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v1], 2));
        g.setIndex([0, 2, 1, 0, 3, 2]);
        g.computeVertexNormals();
        const nrm = g.attributes.normal;
        if (nrm.getX(0) * Math.cos((p + q) / 2) + nrm.getZ(0) * Math.sin((p + q) / 2) > 0) g.setIndex([0, 1, 2, 0, 2, 3]);
        g.computeVertexNormals();
        fx0.add(g, SIGN);
      }
    };
    mural(0);
    mural(Math.PI);
    const inward = (a: number): Pt => [-Math.cos(a), -Math.sin(a)];
    [0.75, 2.3, 3.9, 5.5].forEach((a, j) => {
      const [x, z] = at(a, r - 0.04);
      tag(fx0, j * 2 + 1, 1.0, inward(a), x, floor + 0.55 + (j % 2) * 0.3, z);
    });
    for (const a of [1.15, 4.3]) {
      const [x, z] = at(a, r - 0.045);
      poster(fx0, Math.round(a * 3), 1, inward(a), x, floor + 1.25, z);
    }
    b.build(into, { cast: true, receive: true });
    buildFx(fx0, into);
  });
}

/* ---------- The subways ---------- */

function registerSubway(p: Passage, low: boolean) {
  const { top, ramp, portal, out } = subwayEnds(p);
  const [wx, ex] = [p.c - p.half, p.c + p.half];
  /** Where its walls meet the well's curve (its floor and walls run to there; the well's floor covers the rest) */
  const rim = WELL.z + out * Math.sqrt(WELL.r ** 2 - p.half ** 2);
  const pieces: { id: string; s0: number; s1: number; roofed: boolean }[] = [
    { id: 'cutting', s0: Math.min(top, portal), s1: Math.max(top, portal), roofed: false },
    { id: 'passage', s0: Math.min(portal, rim), s1: Math.max(portal, rim), roofed: true },
  ];
  for (const piece of pieces)
    site(`ends ${p.id} ${piece.id}`, [wx - 1, piece.s0 - 1, ex + 1, piece.s1 + 1], (into) => {
      const b = new Batch();
      const fx0 = new Batch();
      const zs = [piece.s0, piece.s1, ramp].filter((z) => z >= piece.s0 && z <= piece.s1).sort((a, c) => a - c);
      for (let k = 1; k < zs.length; k++) {
        const [a, c] = [zs[k - 1], zs[k]];
        if (c - a < 1e-3) continue;
        const [ya, yc] = [floorOf(p, a), floorOf(p, c)];
        upQuad(
          b,
          [
            [wx, ya, a],
            [ex, ya, a],
            [ex, yc, c],
            [wx, yc, c],
          ],
          SUB_FLOOR
        );
        const top0 = piece.roofed ? p.ceil : 0.02;
        wallQuad(b, [wx, a], [wx, c], ya, top0, yc, top0, [1, 0], SUB_WALL);
        wallQuad(b, [ex, a], [ex, c], ya, top0, yc, top0, [-1, 0], SUB_WALL);
        // (a drain channel along the west wall's foot)
        if (!low)
          upQuad(
            b,
            [
              [wx, ya + 0.004, a],
              [wx + 0.16, ya + 0.004, a],
              [wx + 0.16, yc + 0.004, c],
              [wx, yc + 0.004, c],
            ],
            BLACK
          );
      }
      const [s0, s1] = [piece.s0, piece.s1];
      if (piece.roofed) {
        const f = p.floor;
        // The tiles along both walls, dirtier low down, a grout line at their top
        for (const [x, n] of [
          [wx + 0.006, 1],
          [ex - 0.006, -1],
        ] as const) {
          wallQuad(b, [x, s0], [x, s1], f + 0.05, f + 1.05, f + 0.05, f + 1.05, [n, 0], TILES);
          wallQuad(b, [x + n * 0.004, s0], [x + n * 0.004, s1], f + 0.05, f + 0.32, f + 0.05, f + 0.32, [n, 0], TILES_DIRTY);
          wallQuad(b, [x + n * 0.006, s0], [x + n * 0.006, s1], f + 1.04, f + 1.08, f + 1.04, f + 1.08, [n, 0], GROUT);
        }
        // The ceiling (facing down), the strips along it: a few tired and flickering, one dead
        b.add(new THREE.PlaneGeometry(ex - wx, s1 - s0).rotateX(Math.PI / 2).translate(p.c, p.ceil, (s0 + s1) / 2), SUB_CEIL);
        let n = out < 0 ? 0 : 1;
        for (let z = s0 + 1.1; z < s1 - 0.8; z += 2.3, n++) {
          const m = n === 2 ? TUBE_DEAD : n % 3 === 1 ? TUBE_TIRED : TUBE;
          b.box(p.c - 0.06, p.ceil - 0.05, z - 0.55, 0.12, 0.04, 1.1, m);
          b.box(p.c - 0.09, p.ceil - 0.02, z - 0.6, 0.18, 0.02, 1.2, CONCRETE_DARK);
        }
        // A puddle where the roof drips, a can against the wall (near only)
        b.add(new THREE.PlaneGeometry(0.9, 1.4).rotateX(-Math.PI / 2).translate(p.c - 0.3, f + 0.006, (s0 + s1) / 2 + out * 0.8), PUDDLE);
        b.detail(() => {
          if (low) return;
          b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 6).rotateZ(Math.PI / 2).translate(ex - 0.3, f + 0.05, (s0 + s1) / 2 - out * 1.5), toon('#9a3a32'));
        });
        // Tags down both walls over the tiles, a bill or two (the FX layer)
        for (let z = s0 + 1.4, j = 0; z < s1 - 1; z += 2.6, j++) {
          tag(fx0, j * 3 + (out < 0 ? 0 : 5), 1.1, [1, 0], wx + 0.014, f + 0.7 + (j % 2) * 0.25, z);
          tag(fx0, j * 3 + (out < 0 ? 2 : 7), 0.9, [-1, 0], ex - 0.014, f + 0.6 + ((j + 1) % 2) * 0.3, z + 1.1);
        }
        poster(fx0, out < 0 ? 2 : 5, 1, [-1, 0], ex - 0.016, f + 1.3, (s0 + s1) / 2);
      } else {
        // The open cutting: the parapets over its walls (their coping a hair wider), the headwall over the portal
        for (const x of [wx - p.wall, ex]) b.box(x, 0, s0, p.wall, p.rail, s1 - s0, CONCRETE);
        for (const x of [wx - p.wall - 0.03, ex - 0.03]) b.box(x, p.rail, s0, p.wall + 0.06, 0.05, s1 - s0, COPING);
        const [hz0, hz1] = out < 0 ? [portal - 0.3, portal] : [portal, portal + 0.3];
        b.box(wx - p.wall, p.ceil, hz0, ex - wx + 2 * p.wall, p.rail - p.ceil, hz1 - hz0, CONCRETE);
        b.box(wx - p.wall - 0.03, p.rail, hz0 - 0.02, ex - wx + 2 * p.wall + 0.06, 0.05, hz1 - hz0 + 0.04, COPING);
        // The SUBWAY plate over the portal facing out, a caged lamp under it
        const face = out < 0 ? hz0 - 0.012 : hz1 + 0.012;
        sign(b, ROW.subway, p.c, (p.ceil + p.rail) / 2 + 0.05, face, [0, out], 1.6, 0.4);
        b.box(p.c - 0.15, p.ceil - 0.18, out < 0 ? hz0 - 0.12 : hz1, 0.3, 0.12, 0.12, BLACK);
        b.box(p.c - 0.1, p.ceil - 0.24, out < 0 ? hz0 - 0.1 : hz1 + 0.02, 0.2, 0.06, 0.08, BULB);
        // Tags on the cutting's walls
        tag(fx0, out < 0 ? 6 : 9, 1.3, [1, 0], wx + 0.012, floorOf(p, (s0 + s1) / 2) / 2 - 0.1, (s0 + s1) / 2);
        tag(fx0, out < 0 ? 11 : 3, 1.1, [-1, 0], ex - 0.012, floorOf(p, (s0 + s1) / 2 + 1.5) / 2 - 0.1, (s0 + s1) / 2 + 1.5);
        // The concrete bollards across the top of the ramp
        for (const [x, z] of SUBWAY_BOLLARDS.filter(([, z]) => z > s0 - 0.6 && z < s1 + 0.6)) {
          post(b, x, z, 0, BOLLARD.h, BOLLARD.r, CONCRETE, low ? 6 : 10);
          b.add(new THREE.SphereGeometry(BOLLARD.r, low ? 6 : 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, BOLLARD.h, z), CONCRETE);
        }
      }
      b.build(into, { cast: true, receive: true });
      buildFx(fx0, into);
    });
}

/* ---------- Lot 9's tunnel, dressed as Endswood's subway (docs/estate-plan.md Phase 6) ---------- */

/**
 * The pedestrian tunnel under the highway from The Trenches (lot9.ts `TUNNEL`), drawn as the estate's subways are:
 * the open cuttings between parapets, a headwall over each portal with its SUBWAY plate and a caged lamp, the
 * concrete bollards at each ramp's top; under the roof tiled walls dirtier low down, THE ENDS painted on the west
 * wall over the tiles, fluorescent strips (some tired, one dead), tags and a bill, a puddle
 */
function registerTunnel(low: boolean) {
  const T = TUNNEL;
  const [wx, ex] = [T.x - T.half, T.x + T.half];
  const breaks = [T.z0, T.ramp0, T.roof0, T.roof1, T.ramp1, T.z1];
  const pieces: [number, number][] = [
    [T.z0, T.roof0],
    [T.roof0, T.roof1],
    [T.roof1, T.z1],
  ];
  pieces.forEach(([za, zc], i) =>
    site(`ends tunnel ${i}`, [wx - 1, za - 1, ex + 1, zc + 1], (into) => {
      const b = new Batch();
      const fx0 = new Batch();
      const roofed = i === 1;
      const zs = breaks.filter((z) => z >= za && z <= zc);
      for (let k = 1; k < zs.length; k++) {
        const [a, c] = [zs[k - 1], zs[k]];
        const [ya, yc] = [tunnelFloor(a), tunnelFloor(c)];
        upQuad(
          b,
          [
            [wx, ya, a],
            [ex, ya, a],
            [ex, yc, c],
            [wx, yc, c],
          ],
          SUB_FLOOR
        );
        const top = roofed ? T.ceil : 0.02;
        wallQuad(b, [wx, a], [wx, c], ya, top, yc, top, [1, 0], SUB_WALL);
        wallQuad(b, [ex, a], [ex, c], ya, top, yc, top, [-1, 0], SUB_WALL);
        if (!low)
          upQuad(
            b,
            [
              [wx, ya + 0.004, a],
              [wx + 0.16, ya + 0.004, a],
              [wx + 0.16, yc + 0.004, c],
              [wx, yc + 0.004, c],
            ],
            BLACK
          );
      }
      if (roofed) {
        const f = T.floor;
        for (const [x, n] of [
          [wx + 0.006, 1],
          [ex - 0.006, -1],
        ] as const) {
          wallQuad(b, [x, za], [x, zc], f + 0.05, f + 1.05, f + 0.05, f + 1.05, [n, 0], TILES);
          wallQuad(b, [x + n * 0.004, za], [x + n * 0.004, zc], f + 0.05, f + 0.32, f + 0.05, f + 0.32, [n, 0], TILES_DIRTY);
          wallQuad(b, [x + n * 0.006, za], [x + n * 0.006, zc], f + 1.04, f + 1.08, f + 1.04, f + 1.08, [n, 0], GROUT);
        }
        b.add(new THREE.PlaneGeometry(ex - wx, zc - za).rotateX(Math.PI / 2).translate(T.x, T.ceil, (za + zc) / 2), SUB_CEIL);
        let n = 0;
        for (let z = za + 1.2; z < zc - 0.8; z += 2.4, n++) {
          const m = n === 3 ? TUBE_DEAD : n % 3 === 1 ? TUBE_TIRED : TUBE;
          b.box(T.x - 0.06, T.ceil - 0.05, z - 0.6, 0.12, 0.04, 1.2, m);
          b.box(T.x - 0.09, T.ceil - 0.02, z - 0.65, 0.18, 0.02, 1.3, CONCRETE_DARK);
        }
        b.add(new THREE.PlaneGeometry(0.9, 1.6).rotateX(-Math.PI / 2).translate(T.x - 0.3, f + 0.006, (za + zc) / 2 - 1.2), PUDDLE);
        b.detail(() => {
          if (low) return;
          b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 6).rotateZ(Math.PI / 2).translate(ex - 0.3, f + 0.05, (za + zc) / 2 + 2.2), toon('#9a3a32'));
        });
        // THE ENDS on the west wall over the tiles (the FX layer), tags down the east wall, a bill
        sign(fx0, ROW.nick, wx + 0.016, f + 0.85, (za + zc) / 2, [1, 0], 5.2, 1.3);
        for (let z = za + 1.6, j = 0; z < zc - 1; z += 3.1, j++) tag(fx0, j * 3 + 4, 1.0, [-1, 0], ex - 0.014, f + 0.6 + (j % 2) * 0.35, z);
        tag(fx0, 8, 1.1, [1, 0], wx + 0.014, f + 0.7, za + 1.8);
        tag(fx0, 2, 1.0, [1, 0], wx + 0.014, f + 0.65, zc - 1.8);
        poster(fx0, 6, 1, [-1, 0], ex - 0.016, f + 1.3, (za + zc) / 2 - 3);
      } else {
        for (const x of [wx - T.wall, ex]) b.box(x, 0, za, T.wall, T.rail, zc - za, CONCRETE);
        for (const x of [wx - T.wall - 0.03, ex - 0.03]) b.box(x, T.rail, za, T.wall + 0.06, 0.05, zc - za, COPING);
        const north = i === 0;
        const portal = north ? T.roof0 : T.roof1;
        const [hz0, hz1] = north ? [portal, portal + 0.3] : [portal - 0.3, portal];
        b.box(wx - T.wall, T.ceil, hz0, ex - wx + 2 * T.wall, T.rail - T.ceil, hz1 - hz0, CONCRETE);
        b.box(wx - T.wall - 0.03, T.rail, hz0 - 0.02, ex - wx + 2 * T.wall + 0.06, 0.05, hz1 - hz0 + 0.04, COPING);
        // The SUBWAY plate over the portal facing out, a caged lamp under it
        const out = north ? -1 : 1;
        const face = north ? hz0 - 0.012 : hz1 + 0.012;
        sign(b, ROW.subway, T.x, (T.ceil + T.rail) / 2 + 0.05, face, [0, out], 1.6, 0.4);
        b.box(T.x - 0.15, T.ceil - 0.18, north ? hz0 - 0.12 : hz1, 0.3, 0.12, 0.12, BLACK);
        b.box(T.x - 0.1, T.ceil - 0.24, north ? hz0 - 0.1 : hz1 + 0.02, 0.2, 0.06, 0.08, BULB);
        tag(fx0, north ? 6 : 9, 1.3, [1, 0], wx + 0.012, tunnelFloor((za + zc) / 2) / 2 - 0.1, (za + zc) / 2);
        tag(fx0, north ? 11 : 3, 1.1, [-1, 0], ex - 0.012, tunnelFloor((za + zc) / 2 + 1.5) / 2 - 0.1, (za + zc) / 2 + 1.5);
        // The concrete bollards across the top of the ramp (where lot9.ts has them: their solids)
        for (const [x, z] of TUNNEL_BOLLARDS.filter(([, z]) => z > za - 0.5 && z < zc + 0.5)) {
          post(b, x, z, 0, LOT9_BOLLARD.h, LOT9_BOLLARD.r, CONCRETE, low ? 6 : 10);
          b.add(new THREE.SphereGeometry(LOT9_BOLLARD.r, low ? 6 : 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, LOT9_BOLLARD.h, z), CONCRETE);
        }
      }
      b.build(into, { cast: true, receive: true });
      buildFx(fx0, into);
    })
  );
}

/* ---------- The spine ---------- */

/** The spine's paving north and south of the Circus between the blocks' slabs, round the subways' cuttings */
function registerSpine() {
  const half = SPINE - WALK_W;
  const ringEdge = CIRCUS.r + CIRCUS.half - 0.4;
  for (const p of SUBWAYS) {
    const { top, portal, out } = subwayEnds(p);
    const [far, near] = out < 0 ? [NORTH_Z - WALK_W, CIRCUS.z - ringEdge] : [SOUTH_Z + WALK_W, CIRCUS.z + ringEdge];
    const [z0, z1] = [Math.min(far, near), Math.max(far, near)];
    const cut = p.half + p.wall;
    const [c0, c1] = [Math.min(top, portal), Math.max(top, portal)];
    site(`ends spine ${p.id}`, [p.c - half - 1, z0 - 1, p.c + half + 1, z1 + 1], (into) => {
      const b = new Batch();
      for (const [x0, x1] of [
        [p.c - half, p.c - cut],
        [p.c + cut, p.c + half],
      ])
        for (const [a, c] of along([0, z0], [0, z1], 15).map((q, i, all) => (i ? [all[i - 1][1], q[1]] : null)).filter((v): v is [number, number] => !!v)) flatRect(b, [x0, a, x1, c], PAVE_Y, PAVING);
      // Over and past the cutting: from the far end to its top, and from its portal (over the roof) to the Circus
      flatRect(b, [p.c - cut, z0, p.c + cut, c0], PAVE_Y, PAVING);
      flatRect(b, [p.c - cut, c1, p.c + cut, z1], PAVE_Y, PAVING);
      b.build(into, { cast: false, receive: true });
    });
  }
}

export function register({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  registerRoads(low);
  registerCircus(low);
  registerWell(low);
  for (const p of SUBWAYS) registerSubway(p, low);
  registerSpine();
  // The blocks (endsblocks.ts, docs/estate-plan.md Phase 3)
  registerBlocks(low);
  // Street level: the church, the parade, the shops, the studio, the green, the pitch, the road's paint (Phase 4)
  registerStreet({ low, scene, tick });
  // The blend (Phase 6): Lot 9's tunnel as the estate's subway; the common down to Lot 9
  registerTunnel(low);
  registerBlend(low);
  // Its life (Phase 7): the people into the crowd's spare slots, the dogs, bikes, mopeds and the trolley
  registerLife(scene, tick, low);
}
