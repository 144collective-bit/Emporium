/*
 * Liberty Bridge (liberty.ts has the numbers; river plan step 3, the
 * owner's calls): a one-of-a-kind footbridge in the style of the old
 * gate-tower bridges with lifting leaves, drawn the city's way (flat
 * cartoon shading, ink outlines, warm light at night).
 *
 * - Two sandstone gate towers in the river on cutwater piers: a pointed
 *   arch through each for the lower deck with a ring of stones round it,
 *   lancet windows (lit at night), the Liberty flame as a crest and
 *   LIBERTY BRIDGE on a bronze plaque on the outer faces, a string course,
 *   a corbelled cornice and crenellated parapet, four turrets with
 *   octagonal slate domes and finials, and on the roof, on a drum, the
 *   Liberty flame in 3D: a ribbon spiralling up into tongues of fire
 *   (turning slowly, still under reduced motion).
 * - The lower deck: the approaches from the promenades, paved, between
 *   pale blue lattice parapets, hung from pale blue chains between the
 *   towers and the abutments off the quays; and the two leaves over the
 *   middle, which lift for the tall ship (liberty.ts `leavesAt()`), with a
 *   boom gate across each tower's arch that drops while they're up.
 * - The high level: two walkways enclosed in pale blue lattice under a
 *   roof, and a gallery along each tower's inner face, lamps along them.
 * - The tall ship (`shipAt()`): a three-masted ship with square sails,
 *   anchored west of the bridge and east of it in turn, sailing through.
 *
 * The bridge is the spot's group (it lifts on hover); the leaves and the
 * gates move in it (`userData.keep`), the ship sails on its own.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, glowMat, glowTex, lit, moving, neon, roundRect, toon } from './kit';
import { addPool, type Tick } from './world';
import {
  ABUTMENTS,
  APPROACH,
  BX,
  CHAIN,
  DECK_DEPTH,
  DECK_HALF,
  FACES,
  HIGH,
  HIGH_Y,
  LEAF,
  LOW_Y,
  OUTER,
  PARAPET_H,
  SHIP,
  TOWER,
  TOWERS,
  TO_MIDDLE,
  WALK_HALF,
  chainY,
  leavesAt,
  lowY,
  shipAt,
  ANCHOR_X,
} from './liberty';
import { WATER_Y } from './river';
import type { Spot } from './landmarks';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const STONE = toon('#d8c9a3');
const TRIM = toon('#bba985');
const DARK = toon('#8f8265');
const PAVE = toon('#c7b48d');
const SLATE = toon('#566070');
const FINIAL = toon('#3e4552');
const IRON = toon('#262233');
/** The steelwork, painted pale blue with white trim, as the old bridges were */
const BLUE = toon('#86b6d9');
const WHITE = toon('#e8e6f0');
const DOOR = toon('#3a2c22');
/** Window glass: dark by day, warm lamplight at night */
const WINDOW = neon('#ffc66e', 0.1, 1.1);
/** Lantern bulbs (small, bright) */
const BULB = neon('#ffe2a0', 0.6, 2.4);

/* ---------- Shapes ---------- */

/** A box from (x0, y0, z0) to (x1, y1, z1) */
const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
/** A shape in the x-y plane (x across the bridge from its centre line) extruded `depth` along z from z0 */
const slabZ = (shape: THREE.Shape, depth: number, z0: number) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 12 }).translate(BX, 0, z0);
/** A shape in the z-y plane (u along z) extruded `w` along x from x0 */
const slabX = (shape: THREE.Shape, w: number, x0: number) => new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, curveSegments: 12 }).rotateY(-Math.PI / 2).translate(x0 + w, 0, 0);
/** A pointed arch's outline from its left foot (cu - half, spring) over the point to its right foot (`out` widens it, for a ring) */
function pointed(path: THREE.Path, cu: number, half: number, spring: number, out = 0) {
  const R = 2 * half + out;
  const a = Math.acos(half / R);
  path.absarc(cu + half, spring, R, Math.PI, Math.PI - a, true);
  path.absarc(cu - half, spring, R, a, 0, true);
}
/** The same, back from the right foot to the left */
function pointedBack(path: THREE.Path, cu: number, half: number, spring: number, out = 0) {
  const R = 2 * half + out;
  const a = Math.acos(half / R);
  path.absarc(cu - half, spring, R, 0, a, false);
  path.absarc(cu + half, spring, R, Math.PI - a, Math.PI, false);
}
/** A lancet: `w` wide from y0 to its springing ys, pointed over it, centred on cu */
function lancet(cu: number, w: number, y0: number, ys: number) {
  const s = new THREE.Shape();
  s.moveTo(cu - w / 2, y0);
  s.lineTo(cu + w / 2, y0);
  s.lineTo(cu + w / 2, ys);
  pointedBack(s, cu, w / 2, ys);
  s.closePath();
  return s;
}
/** The ring of stones round a pointed arch, over its springing */
function ring(cu: number, half: number, spring: number, band: number) {
  const r = new THREE.Shape();
  r.moveTo(cu - half - band, spring);
  pointed(r, cu, half, spring, band);
  r.lineTo(cu + half, spring);
  pointedBack(r, cu, half, spring);
  r.closePath();
  return r;
}
/** A thin rod from a to c */
function rod(b: Batch, a: THREE.Vector3, c: THREE.Vector3, w: number, mat: THREE.Material) {
  const d = c.clone().sub(a);
  b.add(new THREE.BoxGeometry(w, w, d.length()).lookAt(d).translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), mat);
}
/** Cuts from a to c, none longer than `step` */
function cuts(a: number, c: number, step: number) {
  const n = Math.max(1, Math.ceil(Math.abs(c - a) / step));
  return Array.from({ length: n + 1 }, (_, i) => a + ((c - a) * i) / n);
}
/** A box across the deck from x0 to x1 (offsets from the centre line) and along it from za to zb, its bottom `dy0` and top `dy1` over the walk (so it follows the approaches' rise) */
function onWalk(b: Batch, x0: number, x1: number, dy0: number, dy1: number, za: number, zb: number, mat: THREE.Material, y: (z: number) => number = lowY) {
  const g = new THREE.BoxGeometry(x1 - x0, 1, zb - za).translate(BX + (x0 + x1) / 2, 0.5, (za + zb) / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, y(p.getZ(i)) + (p.getY(i) > 0.5 ? dy1 : dy0));
  g.computeVertexNormals();
  b.add(g, mat);
}
/** The pieces from a to c, none longer than `step`: [from, to] each */
const pieces = (a: number, c: number, step = 1) => cuts(a, c, step).flatMap((z, k, all): [number, number][] => (k ? [[all[k - 1], z]] : []));
/** Both sides: [x0, x1] and its mirror */
const sides = (a: number, c: number): [number, number][] => [
  [-c, -a],
  [a, c],
];

/* ---------- Textures ---------- */

/** The crest: the Liberty flame on a dark shield with a gradient rim */
function crestTex(img: HTMLImageElement | null) {
  return canvasTex(320, 400, (ctx, w, h) => {
    ctx.fillStyle = '#d8c9a3';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1a1430';
    roundRect(ctx, 12, 12, w - 24, h - 24, 40);
    ctx.fill();
    const rim = ctx.createLinearGradient(0, h, 0, 0);
    rim.addColorStop(0, '#e219e5');
    rim.addColorStop(0.5, '#ff5a36');
    rim.addColorStop(1, '#ffd36b');
    ctx.lineWidth = 12;
    ctx.strokeStyle = rim;
    ctx.stroke();
    if (img) {
      const s = Math.min((w - 90) / img.width, (h - 90) / img.height);
      const [iw, ih] = [img.width * s, img.height * s];
      ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
    }
  });
}
/** LIBERTY BRIDGE in gold on a bronze plaque */
function nameTex() {
  return canvasTex(1024, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2b2236';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c99a4a';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.font = `900 82px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '16px';
    const g = ctx.createLinearGradient(0, 20, 0, h - 20);
    g.addColorStop(0, '#ffe7a3');
    g.addColorStop(1, '#d8a24a');
    ctx.fillStyle = g;
    ctx.fillText('LIBERTY BRIDGE', w / 2, h / 2 + 4);
  });
}

/* ---------- The Liberty flame in 3D ---------- */

/**
 * The flame mark as a sculpture: a ribbon spiralling up from a thin tail,
 * widening and warming from violet through magenta into red, and tongues of
 * fire curling out of its top (orange to gold, a pale core). One geometry,
 * coloured per vertex; its foot at the origin, about `TOWER.flame.h` tall.
 */
function flameGeometry() {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const c = new THREE.Color();
  const ramp = (stops: string[], t: number) => {
    const f = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
    const k = Math.floor(f);
    return c.set(stops[k]).lerp(new THREE.Color(stops[k + 1]), f - k);
  };
  /** Rings of points along a spine joined into a closed tube (each ring `sides` points) */
  const tube = (rings: THREE.Vector3[][], colours: THREE.Color[][]) => {
    const base = pos.length / 3;
    const sides = rings[0].length;
    rings.forEach((ring, i) =>
      ring.forEach((p, j) => {
        pos.push(p.x, p.y, p.z);
        const k = colours[i][j];
        col.push(k.r, k.g, k.b);
      })
    );
    for (let i = 0; i < rings.length - 1; i++)
      for (let j = 0; j < sides; j++) {
        const a = base + i * sides + j;
        const b = base + i * sides + ((j + 1) % sides);
        const d = base + (i + 1) * sides + j;
        const e = base + (i + 1) * sides + ((j + 1) % sides);
        idx.push(a, d, b, b, d, e);
      }
  };
  const up = V(0, 1, 0);

  // The ribbon: a thin band winding up a turn and a quarter, its tail narrow, opening out as it climbs
  const RIB = ['#4a1a8c', '#9b1fb0', '#e2197a', '#ff3d4a'];
  const ribRings: THREE.Vector3[][] = [];
  const ribCols: THREE.Color[][] = [];
  const N = 64;
  const at = (t: number) => {
    const a = 1.25 * Math.PI * 2 * t;
    const r = 0.12 + 0.4 * t;
    return V(Math.cos(a) * r, 0.05 + 2.2 * t, Math.sin(a) * r);
  };
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = at(t);
    const tan = at(Math.min(1, t + 0.01)).sub(at(Math.max(0, t - 0.01))).normalize();
    const out = V(p.x, 0, p.z).normalize();
    const band = up.clone().addScaledVector(out, 0.35).normalize();
    const nrm = new THREE.Vector3().crossVectors(tan, band).normalize();
    const hw = 0.06 + 0.38 * t ** 0.8;
    const th = 0.035;
    const ring = [
      p.clone().addScaledVector(band, hw).addScaledVector(nrm, th),
      p.clone().addScaledVector(band, hw).addScaledVector(nrm, -th),
      p.clone().addScaledVector(band, -hw).addScaledVector(nrm, -th),
      p.clone().addScaledVector(band, -hw).addScaledVector(nrm, th),
    ];
    ribRings.push(ring);
    const body = ramp(RIB, t).clone();
    // The band's upper edge a shade lighter, like the mark's highlight
    const edge = body.clone().lerp(new THREE.Color('#ffffff'), 0.18);
    ribCols.push([edge, edge, body, body]);
  }
  tube(ribRings, ribCols);

  // Tongues of fire out of the top, all sweeping up and out to one side the way the mark's flame does, layered
  // from the big red-orange one to a pale core, curling on round the way the ribbon winds
  const top = at(1);
  const a1 = Math.atan2(top.z, top.x) + 0.3;
  const FIRE = ['#ff3d1f', '#ff7a1f', '#ffb52e', '#ffe066'];
  const EMBER = ['#e2197a', '#ff3d1f', '#ff8a1f', '#ffc94a'];
  const CORE = ['#ff9a2e', '#ffd36b', '#fff1b0'];
  const tongues: { a: number; r: number; h: number; R: number; lean: number; swirl: number; stops: string[]; y0: number }[] = [
    { a: a1, r: 0.22, h: 1.5, R: 0.34, lean: 0.6, swirl: 0.6, stops: FIRE, y0: 1.95 },
    { a: a1 + 0.95, r: 0.24, h: 1.15, R: 0.28, lean: 0.5, swirl: 0.7, stops: EMBER, y0: 1.9 },
    { a: a1 - 0.9, r: 0.2, h: 0.95, R: 0.24, lean: 0.45, swirl: 0.8, stops: FIRE, y0: 1.92 },
    { a: a1 + 0.3, r: 0.08, h: 1.05, R: 0.18, lean: 0.4, swirl: 0.5, stops: CORE, y0: 2.02 },
  ];
  const SIDES = 10;
  const SEG = 22;
  for (const g of tongues) {
    const rings: THREE.Vector3[][] = [];
    const cols: THREE.Color[][] = [];
    const spine = (s: number) => {
      const a = g.a + g.swirl * s;
      const r = g.r + g.lean * s ** 1.5;
      return V(Math.cos(a) * r, g.y0 + g.h * s, Math.sin(a) * r);
    };
    for (let i = 0; i <= SEG; i++) {
      const s = i / SEG;
      const p = spine(s);
      const tan = spine(Math.min(1, s + 0.01)).sub(spine(Math.max(0, s - 0.01))).normalize();
      const side = new THREE.Vector3().crossVectors(tan, up).normalize();
      const fwd = new THREE.Vector3().crossVectors(side, tan).normalize();
      // A teardrop: swelling quickly, tapering to a point
      const R = g.R * (s < 0.25 ? Math.sin((s / 0.25) * (Math.PI / 2)) : Math.pow(1 - (s - 0.25) / 0.75, 1.3));
      const ring: THREE.Vector3[] = [];
      const cr: THREE.Color[] = [];
      for (let j = 0; j < SIDES; j++) {
        const q = (j / SIDES) * Math.PI * 2;
        ring.push(p.clone().addScaledVector(side, Math.cos(q) * R).addScaledVector(fwd, Math.sin(q) * R * 0.5));
        cr.push(ramp(g.stops, s).clone());
      }
      rings.push(ring);
      cols.push(cr);
    }
    tube(rings, cols);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* ---------- A gate tower ---------- */

function tower(b: Batch, plaques: Batch, i: 0 | 1, crest: THREE.Material, name: THREE.Material, low: boolean) {
  const z = TOWERS[i];
  const s = TO_MIDDLE[i];
  const { hx, hz, arch, pier, turret } = TOWER;
  /** The tower's foot over its pier: just under the deck's underside */
  const yb = LOW_Y - DECK_DEPTH - 0.02;

  // The pier in the river, its cutwaters up and down the river, a band of darker stone at the water
  const cutwater = (grow: number) =>
    new THREE.Shape(
      [
        [-pier.hx - pier.cut - grow, 0],
        [-pier.hx - grow * 0.4, -pier.hz - grow],
        [pier.hx + grow * 0.4, -pier.hz - grow],
        [pier.hx + pier.cut + grow, 0],
        [pier.hx + grow * 0.4, pier.hz + grow],
        [-pier.hx - grow * 0.4, pier.hz + grow],
      ].map(([u, v]) => new THREE.Vector2(u, v))
    );
  b.add(new THREE.ExtrudeGeometry(cutwater(0), { depth: yb - pier.y, bevelEnabled: false }).rotateX(Math.PI / 2).translate(BX, yb, z), STONE);
  b.add(new THREE.ExtrudeGeometry(cutwater(0.08), { depth: 0.35, bevelEnabled: false }).rotateX(Math.PI / 2).translate(BX, WATER_Y + 0.45, z), DARK);
  b.add(new THREE.ExtrudeGeometry(cutwater(0.1), { depth: 0.14, bevelEnabled: false }).rotateX(Math.PI / 2).translate(BX, yb, z), TRIM);

  // The tower: its outline with the arch cut up into it from its foot, extruded through
  const t = new THREE.Shape();
  t.moveTo(-hx, yb);
  t.lineTo(-arch.half, yb);
  t.lineTo(-arch.half, arch.spring);
  pointed(t, 0, arch.half, arch.spring);
  t.lineTo(arch.half, yb);
  t.lineTo(hx, yb);
  t.lineTo(hx, TOWER.cornice);
  t.lineTo(-hx, TOWER.cornice);
  t.closePath();
  b.add(slabZ(t, hz * 2, z - hz), STONE);

  for (const f of [-1, 1]) {
    const zf = z + f * hz;
    /** Just proud of this face, `d` deep */
    const proud = (d: number) => (f > 0 ? zf : zf - d);
    const outer = f === -s;
    // The ring of stones round the arch, the lower lancets either side of it
    b.add(slabZ(ring(0, arch.half, arch.spring, 0.28), 0.06, proud(0.06)), TRIM);
    for (const u of [-2.35, 2.35]) {
      b.add(slabZ(lancet(u, 0.68, 3.62, 5.2), 0.025, proud(0.025)), TRIM);
      b.add(slabZ(lancet(u, 0.5, 3.7, 5.2), 0.045, proud(0.045)), WINDOW);
    }
    if (outer) {
      // The plaque over the arch, the crest over it, a lancet either side
      const [p0, p1] = [6.35, 6.85];
      box(b, BX - 1.6, p0 - 0.06, f > 0 ? zf : zf - 0.05, BX + 1.6, p1 + 0.06, f > 0 ? zf + 0.05 : zf, DARK);
      const plate = new THREE.PlaneGeometry(3.0, p1 - p0).translate(0, (p0 + p1) / 2, 0);
      if (f < 0) plate.rotateY(Math.PI);
      plaques.add(plate.translate(BX, 0, zf + f * 0.06), name);
      const [c0, c1] = [7.15, 8.75];
      const shield = new THREE.PlaneGeometry((c1 - c0) * 0.8, c1 - c0).translate(0, (c0 + c1) / 2, 0);
      if (f < 0) shield.rotateY(Math.PI);
      plaques.add(shield.translate(BX, 0, zf + f * 0.02), crest);
      for (const u of [-2.05, 2.05]) {
        b.add(slabZ(lancet(u, 0.72, 7.12, 8.4), 0.025, proud(0.025)), TRIM);
        b.add(slabZ(lancet(u, 0.55, 7.2, 8.4), 0.045, proud(0.045)), WINDOW);
      }
    } else {
      // The lift's door out onto the gallery
      box(b, BX - 0.62, HIGH_Y - 0.02, f > 0 ? zf : zf - 0.04, BX + 0.62, HIGH_Y + 1.62, f > 0 ? zf + 0.04 : zf, TRIM);
      box(b, BX - 0.5, HIGH_Y, f > 0 ? zf : zf - 0.07, BX + 0.5, HIGH_Y + 1.5, f > 0 ? zf + 0.07 : zf, DOOR);
    }
  }
  // Lancets on the sides too, low and high
  for (const e of [-1, 1]) {
    const x0 = e > 0 ? BX + hx : BX - hx;
    for (const dz of [-1.2, 1.2])
      for (const [y0, ys] of [
        [3.7, 5.2],
        [7.2, 8.4],
      ]) {
        b.add(slabX(lancet(z + dz, 0.68, y0 - 0.08, ys), 0.025, e > 0 ? x0 : x0 - 0.025), TRIM);
        b.add(slabX(lancet(z + dz, 0.5, y0, ys), 0.045, e > 0 ? x0 : x0 - 0.045), WINDOW);
      }
  }
  // A string course round it under the high level, the cornice, the crenellated parapet
  box(b, BX - hx - 0.08, HIGH_Y - 0.2, z - hz - 0.08, BX + hx + 0.08, HIGH_Y - 0.04, z + hz + 0.08, TRIM);
  box(b, BX - hx - 0.22, TOWER.cornice - 0.15, z - hz - 0.22, BX + hx + 0.22, TOWER.cornice, z + hz + 0.22, TRIM);
  box(b, BX - hx - 0.06, TOWER.cornice, z - hz - 0.06, BX + hx + 0.06, TOWER.cornice + 0.25, z + hz + 0.06, STONE);
  const merlon = (x: number, zz: number) => box(b, x - 0.15, TOWER.cornice + 0.25, zz - 0.15, x + 0.15, TOWER.cornice + 0.45, zz + 0.15, STONE);
  for (let u = -hx + 0.6; u <= hx - 0.6 + 1e-6; u += 0.6) for (const f of [-1, 1]) merlon(BX + u, z + f * (hz - 0.09));
  for (let w = -hz + 0.6; w <= hz - 0.6 + 1e-6; w += 0.6) for (const e of [-1, 1]) merlon(BX + e * (hx - 0.09), z + w);
  if (!low)
    b.detail(() => {
      // Corbels under the cornice
      for (let u = -hx + 0.3; u <= hx - 0.3 + 1e-6; u += 0.5) for (const f of [-1, 1]) box(b, BX + u - 0.08, TOWER.cornice - 0.35, f > 0 ? z + hz : z - hz - 0.12, BX + u + 0.08, TOWER.cornice - 0.15, f > 0 ? z + hz + 0.12 : z - hz, TRIM);
    });
  // The four turrets at its corners: octagonal, a band at the cornice, slate domes and finials
  for (const ex of [-1, 1])
    for (const ez of [-1, 1]) {
      const [x, zz] = [BX + ex * (hx - 0.05), z + ez * (hz - 0.05)];
      const r = turret.s / 2;
      b.add(new THREE.CylinderGeometry(r, r, turret.top - 8.4, 8).translate(x, (turret.top + 8.4) / 2, zz), STONE);
      b.add(new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.15, 8).translate(x, TOWER.cornice - 0.05, zz), TRIM);
      b.add(new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.1, 8).translate(x, turret.top - 0.05, zz), TRIM);
      b.add(new THREE.SphereGeometry(r + 0.04, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, turret.dome / (r + 0.04), 1).translate(x, turret.top, zz), SLATE);
      b.add(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 6).translate(x, turret.top + turret.dome + 0.15, zz), FINIAL);
      b.add(new THREE.SphereGeometry(0.07, 8, 6).translate(x, turret.top + turret.dome + 0.38, zz), FINIAL);
    }
  // The flame's drum on the roof
  b.add(new THREE.CylinderGeometry(0.55, 0.62, TOWER.flame.base - TOWER.cornice - 0.1, 12).translate(BX, (TOWER.flame.base - 0.1 + TOWER.cornice) / 2, z), STONE);
  b.add(new THREE.CylinderGeometry(0.66, 0.66, 0.1, 12).translate(BX, TOWER.flame.base - 0.05, z), TRIM);
}

/* ---------- The lower deck ---------- */

/** A lattice parapet from x0 to x1 along za to zb, `h` high over the walk (chords, posts, near only the diagonals) */
function lattice(b: Batch, x0: number, x1: number, za: number, zb: number, h: number, low: boolean, y: (z: number) => number = lowY) {
  const zs = cuts(za, zb, 1);
  const m = (x0 + x1) / 2;
  for (let k = 1; k < zs.length; k++) {
    onWalk(b, x0, x1, -0.012, 0.1, zs[k - 1], zs[k], BLUE, y);
    onWalk(b, x0 - 0.02, x1 + 0.02, h - 0.08, h, zs[k - 1], zs[k], WHITE, y);
  }
  for (const zz of zs) box(b, BX + m - 0.04, y(zz) + 0.1, zz - 0.04, BX + m + 0.04, y(zz) + h - 0.08, zz + 0.04, BLUE);
  if (!low)
    b.detail(() => {
      for (let k = 1; k < zs.length; k++) {
        const [p, q] = [zs[k - 1], zs[k]];
        rod(b, V(BX + m, y(p) + 0.12, p), V(BX + m, y(q) + h - 0.1, q), 0.04, BLUE);
        rod(b, V(BX + m, y(p) + h - 0.1, p), V(BX + m, y(q) + 0.12, q), 0.04, BLUE);
      }
    });
}

/** The approaches, the walk through the towers, the chains and the abutments; returns where its lanterns are */
function lowerDeck(b: Batch, low: boolean) {
  const lanterns: THREE.Vector3[] = [];
  for (const [za, zb] of [
    [APPROACH[0], OUTER[0]],
    [OUTER[1], APPROACH[1]],
  ]) {
    const zs = cuts(za, zb, 1);
    for (let k = 1; k < zs.length; k++) {
      onWalk(b, -DECK_HALF, DECK_HALF, -DECK_DEPTH, -0.012, zs[k - 1], zs[k], BLUE);
      onWalk(b, -WALK_HALF, WALK_HALF, -0.012, 0.01, zs[k - 1], zs[k], PAVE);
    }
    for (const [x0, x1] of sides(WALK_HALF, DECK_HALF)) lattice(b, x0, x1, za, zb, PARAPET_H, low);
    // Lanterns on the parapets, both sides
    for (const zz of cuts(za + 1.2, zb - 1.2, 4))
      for (const e of [-1, 1]) {
        const x = BX + e * (WALK_HALF + DECK_HALF) / 2;
        const y = lowY(zz) + PARAPET_H;
        box(b, x - 0.04, y, zz - 0.04, x + 0.04, y + 0.7, zz + 0.04, IRON);
        box(b, x - 0.11, y + 0.7, zz - 0.11, x + 0.11, y + 0.95, zz + 0.11, BULB);
        box(b, x - 0.14, y + 0.95, zz - 0.14, x + 0.14, y + 1.02, zz + 0.14, IRON);
        lanterns.push(V(x, y + 0.82, zz));
        addPool(BX + e * 0.7, zz, 2.2, lowY(zz) + 0.02);
      }
  }
  // Through the towers: the walk under the arches
  for (const [za, zb] of [
    [OUTER[0], FACES[0]],
    [FACES[1], OUTER[1]],
  ])
    onWalk(b, -TOWER.arch.half, TOWER.arch.half, -0.012, 0.01, za, zb, PAVE);

  // The chains: from each abutment up to the tower, sagging over the approach (a deep pale blue truss), and the hangers
  for (const [a, c] of [
    [(ABUTMENTS[0].z[0] + ABUTMENTS[0].z[1]) / 2, OUTER[0]],
    [OUTER[1], (ABUTMENTS[1].z[0] + ABUTMENTS[1].z[1]) / 2],
  ]) {
    const zs = cuts(a, c, 1);
    for (const e of [-1, 1]) {
      const x = BX + e * CHAIN.x;
      for (let k = 1; k < zs.length; k++) {
        const [p, q] = [zs[k - 1], zs[k]];
        rod(b, V(x, chainY(p)!, p), V(x, chainY(q)!, q), 0.16, BLUE);
        rod(b, V(x, chainY(p)! - 0.32, p), V(x, chainY(q)! - 0.32, q), 0.1, BLUE);
      }
      for (const zz of zs.slice(1, -1)) {
        box(b, x - 0.035, chainY(zz)! - 0.32, zz - 0.035, x + 0.035, chainY(zz)!, zz + 0.035, BLUE);
        const foot = lowY(zz) - DECK_DEPTH * 0.5;
        if (chainY(zz)! - 0.32 - foot > 0.2) box(b, x - 0.025, foot, zz - 0.025, x + 0.025, chainY(zz)! - 0.32, zz + 0.025, WHITE);
      }
    }
  }
  // The abutments off the quays: stone piers with a cap, a little slate roof and a lantern
  for (const a of ABUTMENTS)
    for (const e of [-1, 1]) {
      const [x0, x1] = e < 0 ? [BX - a.x[1], BX - a.x[0]] : [BX + a.x[0], BX + a.x[1]];
      box(b, x0, TOWER.pier.y, a.z[0], x1, a.top, a.z[1], STONE);
      box(b, x0 - 0.08, a.top, a.z[0] - 0.08, x1 + 0.08, a.top + 0.12, a.z[1] + 0.08, TRIM);
      const [cx, cz] = [(x0 + x1) / 2, (a.z[0] + a.z[1]) / 2];
      b.add(new THREE.ConeGeometry(Math.hypot(x1 - x0, a.z[1] - a.z[0]) / 2, 0.5, 4).rotateY(Math.PI / 4).scale((x1 - x0) / Math.hypot(x1 - x0, a.z[1] - a.z[0]) * Math.SQRT2, 1, (a.z[1] - a.z[0]) / Math.hypot(x1 - x0, a.z[1] - a.z[0]) * Math.SQRT2).translate(cx, a.top + 0.37, cz), SLATE);
      box(b, cx - 0.04, a.top + 0.6, cz - 0.04, cx + 0.04, a.top + 0.9, cz + 0.04, IRON);
      box(b, cx - 0.12, a.top + 0.9, cz - 0.12, cx + 0.12, a.top + 1.15, cz + 0.12, BULB);
      box(b, cx - 0.15, a.top + 1.15, cz - 0.15, cx + 0.15, a.top + 1.22, cz + 0.15, IRON);
      lanterns.push(V(cx, a.top + 1.02, cz));
    }
  return lanterns;
}

/* ---------- The high level ---------- */

function highLevel(b: Batch, low: boolean) {
  const lanterns: THREE.Vector3[] = [];
  const flat = () => HIGH_Y;
  const [w0, w1] = HIGH.walk;
  const [f0, f1] = FACES;
  const g = HIGH.gallery;
  // The walkways' floors and the galleries', a pale blue truss under them
  for (const [x0, x1] of sides(w0 - 0.1, w1 + 0.1))
    for (const [za, zb] of pieces(f0, f1))
      onWalk(b, x0, x1, -0.45, -0.012, za, zb, BLUE, flat);
  for (const [za, zb] of [
    [f0, f0 + g],
    [f1 - g, f1],
  ])
    onWalk(b, -w0 + 0.1, w0 - 0.1, -0.45, -0.012, za, zb, BLUE, flat);
  for (const [x0, x1] of sides(w0, w1)) for (const [za, zb] of pieces(f0, f1)) onWalk(b, x0, x1, -0.012, 0.01, za, zb, PAVE, flat);
  for (const [za, zb] of [
    [f0, f0 + g],
    [f1 - g, f1],
  ])
    onWalk(b, -w0, w0, -0.012, 0.01, za, zb, PAVE, flat);
  // Their lattice sides (the inner ones only between the galleries), the roofs over the walkways
  for (const e of [-1, 1]) {
    lattice(b, e < 0 ? -w1 - 0.1 : w1, e < 0 ? -w1 : w1 + 0.1, f0, f1, HIGH.h, low, flat);
    lattice(b, e < 0 ? -w0 : w0 - 0.1, e < 0 ? -w0 + 0.1 : w0, f0 + g, f1 - g, HIGH.h, low, flat);
    const [x0, x1] = e < 0 ? [-w1 - 0.16, -w0 + 0.04] : [w0 - 0.04, w1 + 0.16];
    for (const [za, zb] of pieces(f0, f1)) onWalk(b, x0, x1, HIGH.h, HIGH.h + 0.08, za, zb, BLUE, flat);
    // Lamps under the roof down the middle of the walkway, their light pooled on the floor
    for (const zz of cuts(f0 + 1.5, f1 - 1.5, 3)) {
      const x = BX + (e * (w0 + w1)) / 2;
      box(b, x - 0.12, HIGH_Y + HIGH.h - 0.08, zz - 0.12, x + 0.12, HIGH_Y + HIGH.h, zz + 0.12, BULB);
      lanterns.push(V(x, HIGH_Y + HIGH.h - 0.12, zz));
      addPool(x, zz, 1.6, HIGH_Y + 0.02);
    }
  }
  // The galleries' railings over the middle, between the walkways
  for (const zz of [f0 + g, f1 - g]) {
    box(b, BX - w0, HIGH_Y + 1.0, zz - 0.04, BX + w0, HIGH_Y + 1.08, zz + 0.04, WHITE);
    box(b, BX - w0, HIGH_Y + 0.02, zz - 0.04, BX + w0, HIGH_Y + 0.12, zz + 0.04, BLUE);
    for (let x = -w0 + 0.3; x < w0; x += 0.45) box(b, BX + x - 0.025, HIGH_Y + 0.12, zz - 0.025, BX + x + 0.025, HIGH_Y + 1.0, zz + 0.025, IRON);
  }
  return lanterns;
}

/* ---------- The leaves and the gates ---------- */

/** A leaf, in its own numbers: its hinge at the origin (the tower's face, the walk's level), reaching `s` along z to the middle */
function leaf(s: 1 | -1, low: boolean) {
  const g = new THREE.Group();
  const b = new Batch();
  const L = s * (LEAF.len - 0.03);
  const [a, c] = [Math.min(0, L), Math.max(0, L)];
  box(b, -DECK_HALF, -LEAF.t, a, DECK_HALF, -0.012, c, BLUE);
  box(b, -WALK_HALF, -0.012, a, WALK_HALF, 0.01, c, PAVE);
  // (its parapets drawn round the origin: lattice() reads the bridge's own x, so it's shifted back after)
  const p = new Batch();
  for (const [x0, x1] of sides(WALK_HALF, DECK_HALF)) lattice(p, x0, x1, a, c, PARAPET_H, low, () => 0);
  // A white stripe across the leaf's tip, where the two meet
  box(b, -WALK_HALF, 0.01, s > 0 ? c - 0.12 : a, WALK_HALF, 0.016, s > 0 ? c : a + 0.12, WHITE);
  b.build(g);
  const shifted = new THREE.Group();
  shifted.position.x = -BX;
  p.build(shifted);
  g.add(shifted);
  g.userData.keep = true;
  return moving(g);
}

/** A boom gate across a tower's arch at its inner mouth: its post, and the arm (pivoting on the post) */
function gate(z: number) {
  const g = new THREE.Group();
  const b = new Batch();
  box(b, BX - WALK_HALF + 0.02, LOW_Y, z - 0.1, BX - WALK_HALF + 0.22, LOW_Y + 1.0, z + 0.1, IRON);
  b.build(g);
  const arm = new THREE.Group();
  const a = new Batch();
  const len = WALK_HALF * 2 - 0.3;
  for (let k = 0; k < 6; k++) box(a, (k * len) / 6, -0.05, -0.04, ((k + 1) * len) / 6, 0.05, 0.04, k % 2 ? WHITE : toon('#d23a3a'));
  a.build(arm);
  arm.position.set(BX - WALK_HALF + 0.12, LOW_Y + 0.9, z);
  g.add(arm);
  g.userData.keep = true;
  moving(g);
  return { group: g, arm };
}

/* ---------- The tall ship ---------- */

function tallShip(low: boolean) {
  const g = new THREE.Group();
  const b = new Batch();
  const { len, beam, mast } = SHIP;
  const [h, hb] = [len / 2, beam / 2];
  const HULL = toon('#2f2430');
  const GOLD = toon('#d8a24a');
  const TEAK = toon('#9a6a40');
  const SAIL = toon('#efe8d6');
  const SPAR = toon('#5a4030');
  // The hull: pointed at the bow (+x), square at the stern, a gold stripe, a teak deck
  const plan = (k: number) => {
    const s = new THREE.Shape();
    s.moveTo(-h * k, -hb * k);
    s.lineTo(h * k - beam * k, -hb * k);
    s.quadraticCurveTo(h * k - beam * 0.2 * k, -hb * 0.7 * k, h * k, 0);
    s.quadraticCurveTo(h * k - beam * 0.2 * k, hb * 0.7 * k, h * k - beam * k, hb * k);
    s.lineTo(-h * k, hb * k);
    s.closePath();
    return s;
  };
  const solid = (k: number, y0: number, y1: number, mat: THREE.Material) => b.add(new THREE.ExtrudeGeometry(plan(k), { depth: y1 - y0, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2).translate(0, y0, 0), mat);
  solid(1, -0.35, 0.75, HULL);
  solid(1.01, 0.5, 0.6, GOLD);
  solid(0.95, 0.75, 0.78, TEAK);
  // The stern castle and its lit windows
  box(b, -h, 0.78, -hb * 0.9, -h + 1.4, 1.25, hb * 0.9, HULL);
  box(b, -h - 0.01, 0.9, -hb * 0.7, -h + 0.02, 1.12, hb * 0.7, WINDOW);
  // The bowsprit
  rod(b, V(h - 0.4, 0.9, 0), V(h + 1.6, 1.5, 0), 0.08, SPAR);
  // Three masts with their yards and square sails, a jib to the bowsprit
  const masts: [number, number][] = [
    [h * 0.45, mast * 0.92],
    [0, mast],
    [-h * 0.45, mast * 0.84],
  ];
  for (const [x, top] of masts) {
    b.add(new THREE.CylinderGeometry(0.05, 0.08, top - 0.75, 6).translate(x, (top + 0.75) / 2, 0), SPAR);
    const sails = low ? 2 : 3;
    for (let k = 0; k < sails; k++) {
      const y = 1.6 + (k * (top - 2.2)) / sails;
      const w = beam * (1.15 - k * 0.18);
      const hgt = ((top - 2.2) / sails) * 0.86;
      rod(b, V(x, y + hgt, -w / 2 - 0.15), V(x, y + hgt, w / 2 + 0.15), 0.05, SPAR);
      // (a sail bellied a little forwards, as it fills)
      b.add(new THREE.BoxGeometry(0.03, hgt, w).translate(x + 0.06, y + hgt / 2, 0), SAIL);
    }
    b.add(new THREE.ConeGeometry(0.06, 0.25, 6).translate(x, top + 0.12, 0), GOLD);
  }
  // The jib, a flag at the main mast's top
  const jib = new THREE.BufferGeometry().setFromPoints([V(h * 0.45, mast * 0.92 - 0.4, 0), V(h + 1.5, 1.55, 0), V(h * 0.45, 1.3, 0)]);
  jib.setIndex([0, 1, 2, 0, 2, 1]);
  jib.computeVertexNormals();
  b.add(jib, SAIL);
  box(b, -0.02, mast - 0.05, 0.03, 0.02, mast + 0.35, 0.6, toon('#e2197a'));
  // A lantern at the stern for the night
  box(b, -h + 0.6, 1.25, -0.08, -h + 0.76, 1.45, 0.08, BULB);
  b.build(g);
  g.userData.keep = true;
  return moving(g);
}

/* ---------- Building it ---------- */

export function buildLibertyBridge(scene: THREE.Scene, opts: { flame: HTMLImageElement | null; tick: (f: Tick) => void; reduced: boolean; low: boolean }): { spot: Spot } {
  const group = new THREE.Group();
  group.name = 'liberty';
  scene.add(group);

  const b = new Batch();
  const plaques = new Batch();
  const crest = lit(new THREE.MeshBasicMaterial({ map: crestTex(opts.flame), toneMapped: true }), 0.95, 1.2);
  const name = lit(new THREE.MeshBasicMaterial({ map: nameTex(), toneMapped: true }), 0.95, 1.25);
  for (const i of [0, 1] as const) tower(b, plaques, i, crest, name, opts.low);
  const lanterns = [...lowerDeck(b, opts.low), ...highLevel(b, opts.low)];
  b.build(group);
  plaques.build(group, { cast: false, receive: false });
  // The lanterns' halos (points, always facing the camera), only at night
  const haloMat = lit(new THREE.PointsMaterial({ color: '#ffe2a0', map: glowTex, size: 0.9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0, 0.4);
  group.add(fx(new THREE.Points(new THREE.BufferGeometry().setFromPoints(lanterns), haloMat)));

  // The leaves, hinged at the towers' inner faces, and the gates across the arches
  const leaves = ([0, 1] as const).map((i) => {
    const g = leaf(TO_MIDDLE[i], opts.low);
    g.position.set(BX, LOW_Y, FACES[i]);
    group.add(g);
    return g;
  });
  const gates = ([0, 1] as const).map((i) => {
    const gt = gate(FACES[i] - TO_MIDDLE[i] * 0.25);
    group.add(gt.group);
    return gt;
  });
  // The tall ship, on the water on its own (not part of the bridge's hover)
  const ship = tallShip(opts.low);
  scene.add(ship);

  // The Liberty flame on each tower, turning slowly (still under reduced motion); its colours are its own light
  const flameGeo = flameGeometry();
  const flameMat = lit(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: true }), 0.95, 1.1);
  /** The sculpture's own height (flameGeometry()), scaled to the tower's */
  const FLAME_SCALE = TOWER.flame.h / 3.5;
  const flames = TOWERS.map((z, i) => {
    const m = new THREE.Mesh(flameGeo, flameMat);
    m.position.set(BX, TOWER.flame.base, z);
    m.scale.setScalar(FLAME_SCALE);
    m.rotation.y = i * Math.PI;
    m.castShadow = true;
    // Meant to be seen from far away, and turning: never in the bridge's far form (lod.ts)
    m.userData.keep = true;
    group.add(m);
    return m;
  });
  // A warm light on each flame's drum at night
  for (const z of TOWERS) addPool(BX, z, 2.0, TOWER.cornice + 0.02);

  /** Where the leaves, the gates and the ship are now (the timetable's, liberty.ts; still under reduced motion) */
  const place = () => {
    const now = Date.now() / 1000;
    const { angle, shut } = opts.reduced ? { angle: 0, shut: false } : leavesAt(now);
    leaves[0].rotation.x = -angle;
    leaves[1].rotation.x = angle;
    for (const gt of gates) gt.arm.rotation.z += ((shut ? 0 : Math.PI / 2) - gt.arm.rotation.z) * 0.12;
    const sp = opts.reduced ? { x: ANCHOR_X[0], z: SHIP.z, yaw: 0 } : shipAt(now);
    ship.position.set(sp.x, WATER_Y + Math.sin(now * 0.7) * 0.03, sp.z);
    ship.rotation.y = sp.yaw;
  };
  for (const gt of gates) gt.arm.rotation.z = Math.PI / 2;
  place();
  opts.tick(({ t, dt }) => {
    place();
    if (opts.reduced) return;
    flames.forEach((m, i) => {
      m.rotation.y += dt * 0.35;
      m.scale.set(FLAME_SCALE, FLAME_SCALE * (1 + Math.sin(t * 2.3 + i * 1.7) * 0.025), FLAME_SCALE);
    });
  });

  // The hover ring on the water round the north tower's pier, and the pin over its flame
  const hover = new THREE.Mesh(new THREE.RingGeometry(6.4, 6.54, 72), glowMat(PAL.cyan, 0, null));
  hover.rotation.x = -Math.PI / 2;
  hover.position.set(BX, WATER_Y + 0.06, TOWERS[0]);
  group.add(fx(hover));
  const spot: Spot = { id: 'liberty', group, focus: V(BX, 4, (TOWERS[0] + TOWERS[1]) / 2), size: 30, pin: V(BX, TOWER.flame.base + TOWER.flame.h + 1.0, TOWERS[0]), ring: hover };
  return { spot };
}
