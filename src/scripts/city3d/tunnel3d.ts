/*
 * Lot 9's tunnel under the ring road from The Trenches (lot9.ts `TUNNEL`), drawn as an estate subway (it was
 * endswood3d.ts's, docs/estate-plan.md Phase 6; kept when the south was re-laid, docs/south-plan.md Phase 1b): the
 * open cuttings between parapets, a headwall over each portal with its SUBWAY plate and a caged lamp, the concrete
 * bollards at each ramp's top; under the roof tiled walls dirtier low down, THE ENDS painted on the west wall over the
 * tiles, fluorescent strips (some tired, one dead), tags and a bill, a puddle. Registered by south3d.ts.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { buildFx, poster, tag } from './grime';
import { ENDS_NICK, type Pt } from './endswood';
import { BOLLARD as LOT9_BOLLARD, TUNNEL, TUNNEL_BOLLARDS, tunnelFloor } from './lot9';

const CONCRETE = toon('#8b8896');
const CONCRETE_DARK = toon('#6d6a78');
const COPING = toon('#a29fae');
const SUB_WALL = toon('#7a7789');
const SUB_FLOOR = toon('#54515e');
const SUB_CEIL = toon('#38363f');
const TILES = toon('#cfc7b0');
const TILES_DIRTY = toon('#b3ab95');
const GROUT = toon('#8c8573');
const PUDDLE = toon('#2a2b3b');
const BLACK = toon('#1c1b22');
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
/**
 * The pedestrian tunnel under the highway from The Trenches (lot9.ts `TUNNEL`), drawn as the estate's subways are:
 * the open cuttings between parapets, a headwall over each portal with its SUBWAY plate and a caged lamp, the
 * concrete bollards at each ramp's top; under the roof tiled walls dirtier low down, THE ENDS painted on the west
 * wall over the tiles, fluorescent strips (some tired, one dead), tags and a bill, a puddle
 */
export function registerTunnel(low: boolean) {
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
