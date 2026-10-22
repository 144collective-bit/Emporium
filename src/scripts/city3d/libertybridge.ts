/*
 * Liberty Bridge (liberty.ts has the numbers): a one-of-a-kind stone
 * footbridge built up and over the water, in the old style (sandstone,
 * domed turrets, crenellations) drawn the city's way (flat cartoon shading,
 * ink outlines, warm light at night).
 *
 * - Two gate towers: a ground storey with an arch through it and a
 *   voussoir ring round it, a string course, an upper storey with arched
 *   windows (lit at night) and the Liberty flame as a crest on both faces,
 *   LIBERTY BRIDGE on a bronze plaque on the landward face, a corbelled
 *   cornice, a crenellated parapet, four turrets with octagonal slate domes
 *   and finials, and on the roof, on a drum, the Liberty flame in 3D: a
 *   ribbon spiralling up into tongues of fire (turning slowly, never under
 *   reduced motion).
 * - Stairs up both sides of each tower (solid stone flanks, a wall on the
 *   outside, a lamp at the foot) to the landing in front of its river face.
 * - The walkway: a stone deck on round-topped arches, pillars in pairs on
 *   the lawns and the promenades, cutwater piers in the river; parapets
 *   with a coping, pilasters with lanterns on top and pools of their light
 *   on the walk at night.
 *
 * The whole bridge is the spot's group (it lifts on hover). One Batch for
 * the stone and the lit windows and lanterns, the plaques, the flames (one
 * mesh each, their own material: they turn).
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, glowMat, glowTex, lit, neon, roundRect, toon } from './kit';
import { SLAB, addLamp, addPool, flatPoly, lotMat, type Tick } from './world';
import { RIVER } from './layout';
import { BX, DECK_HALF, DECK_UNDER, DECK_Y, LANDING, LIBERTY_RECTS, PARAPET_H, PIER_HALF, PILLAR, SPANS, STAIR, SUPPORTS, TOWER, TOWERS, TO_RIVER, WALKWAY, WALK_HALF, archY, landingOf, stairsOf } from './liberty';
import type { Spot } from './landmarks';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const STONE = toon('#d8c9a3');
const TRIM = toon('#bba985');
const DARK = toon('#8f8265');
const PAVE = toon('#c7b48d');
const SLATE = toon('#566070');
const FINIAL = toon('#3e4552');
const IRON = toon('#262233');
/** Window glass: dark by day, warm lamplight at night */
const WINDOW = neon('#ffc66e', 0.1, 1.1);
/** Lantern bulbs (small, bright) */
const BULB = neon('#ffe2a0', 0.6, 2.4);

const { hx, hz } = TOWER;
const AH = TOWER.arch.half;

/* ---------- Shapes ---------- */

/** A shape in the x-y plane extruded `depth` along z, its back at z0 */
function slabZ(shape: THREE.Shape, depth: number, x: number, y: number, z0: number) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 }).translate(x, y, z0);
}
/** A profile in the z-y plane (u along z, v up), extruded `w` along x from x0 */
function slabX(pts: [number, number][], w: number, x0: number) {
  const shape = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
  return new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(x0 + w, 0, 0);
}
/** A wall `w` wide and `h` high with a round-headed arch through it, `half` wide, springing at `spring` (its foot at y 0, centred on x 0) */
function archWall(w: number, h: number, half: number, spring: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-half, 0);
  s.lineTo(-half, spring);
  s.absarc(0, spring, half, Math.PI, 0, true);
  s.lineTo(half, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.lineTo(-w / 2, h);
  s.closePath();
  return s;
}
/** The ring of stones round an arch (legs down to the ground) */
function archRing(half: number, spring: number, band: number) {
  const s = new THREE.Shape();
  s.moveTo(-half - band, 0);
  s.lineTo(-half - band, spring);
  s.absarc(0, spring, half + band, Math.PI, 0, true);
  s.lineTo(half + band, 0);
  s.lineTo(half, 0);
  s.lineTo(half, spring);
  s.absarc(0, spring, half, 0, Math.PI, false);
  s.lineTo(-half, 0);
  s.closePath();
  return s;
}
/** An arched window, `w` wide, `h` to its springing */
function archWindow(w: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.absarc(0, h, w / 2, 0, Math.PI, false);
  s.closePath();
  return s;
}
/** An upright plane facing +z (or -z with `back`) */
const face = (x: number, y: number, z: number, w: number, h: number, back: boolean) => new THREE.PlaneGeometry(w, h).rotateY(back ? Math.PI : 0).translate(x, y, z);

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

function tower(b: Batch, plaques: Batch, i: 0 | 1, crest: THREE.Material, name: THREE.Material) {
  const z = TOWERS[i];
  const s = TO_RIVER[i];
  const G = SLAB;
  const H1 = TOWER.storey;
  const R = TOWER.roof;
  // The ground storey, its arch through it towards the river
  b.add(slabZ(archWall(hx * 2, H1 - G, AH, TOWER.arch.spring), hz * 2, BX, G, z - hz), STONE);
  // A darker base course either side of the arch (tucked inside the passage's walls)
  for (const e of [-1, 1]) {
    const [a, c] = [BX + e * (AH + 0.03), BX + e * (hx + 0.06)];
    b.box(Math.min(a, c), G, z - hz - 0.06, Math.abs(c - a), 0.45, hz * 2 + 0.12, DARK);
  }
  // The ring of stones round the arch on both faces, and its keystone
  for (const f of [-1, 1]) {
    const z0 = f < 0 ? z - hz - 0.08 : z + hz;
    b.add(slabZ(archRing(AH, TOWER.arch.spring, 0.28), 0.08, BX, G, z0), TRIM);
    b.box(BX - 0.18, G + TOWER.arch.spring + AH - 0.05, f < 0 ? z - hz - 0.12 : z + hz, 0.36, 0.42, 0.12, DARK);
  }
  // The string course, the upper storey, the cornice
  b.box(BX - hx - 0.1, H1 - 0.12, z - hz - 0.1, hx * 2 + 0.2, 0.22, hz * 2 + 0.2, TRIM);
  b.box(BX - hx, H1 + 0.1, z - hz, hx * 2, R - 0.15 - H1 - 0.1, hz * 2, STONE);
  b.box(BX - hx - 0.14, R - 0.2, z - hz - 0.14, hx * 2 + 0.28, 0.2, hz * 2 + 0.28, TRIM);
  // Arched windows: two on each face either side of the crest, two on each side; lit at night
  const win = archWindow(0.46, 0.75);
  for (const f of [-1, 1]) {
    const zf = f < 0 ? z - hz - 0.03 : z + hz;
    for (const x of [-1.55, 1.55]) {
      b.add(slabZ(win, 0.03, BX + x, 4.75, zf), WINDOW);
      b.box(BX + x - 0.32, 4.68, f < 0 ? z - hz - 0.1 : z + hz, 0.64, 0.08, 0.1, TRIM);
    }
    // The crest (both faces) and the name plaque (the landward face)
    plaques.add(face(BX, 5.55, z + f * (hz + 0.012), 1.0, 1.25, f < 0), crest);
    if (f === -s) plaques.add(face(BX, 4.32, z + f * (hz + 0.012), 3.3, 0.41, f < 0), name);
  }
  for (const e of [-1, 1]) for (const dz of [-0.85, 0.85]) b.add(slabZ(win, 0.03, 0, 0, 0).rotateY(Math.PI / 2).translate(BX + e * hx - (e > 0 ? 0 : 0.03), 4.75, z + dz), WINDOW);

  // The parapet between the turrets, and its merlons
  const P0 = R;
  // (Each run reaches into the turrets at its ends)
  const runs: [number, number, number, number][] = [
    [BX - hx + 0.6, z - hz - 0.1, BX + hx - 0.6, z - hz + 0.12],
    [BX - hx + 0.6, z + hz - 0.12, BX + hx - 0.6, z + hz + 0.1],
    [BX - hx - 0.1, z - hz + 0.6, BX - hx + 0.12, z + hz - 0.6],
    [BX + hx - 0.12, z - hz + 0.6, BX + hx + 0.1, z + hz - 0.6],
  ];
  for (const [x0, z0, x1, z1] of runs) {
    b.box(x0, P0, z0, x1 - x0, 0.3, z1 - z0, STONE);
    const along = x1 - x0 > z1 - z0;
    const L = along ? x1 - x0 : z1 - z0;
    const n = Math.max(2, Math.round(L / 0.62));
    for (let k = 0; k < n; k++) {
      const c = (k + 0.5) / n;
      if (along) b.box(x0 + c * L - 0.16, P0 + 0.3, z0, 0.32, 0.3, z1 - z0, STONE);
      else b.box(x0, P0 + 0.3, z0 + c * L - 0.16, x1 - x0, 0.3, 0.32, STONE);
    }
  }
  // The roof inside the parapet, and the drum the flame stands on
  b.box(BX - hx + 0.12, P0, z - hz + 0.12, hx * 2 - 0.24, 0.04, hz * 2 - 0.24, PAVE);
  b.add(new THREE.CylinderGeometry(0.5, 0.56, TOWER.flame.base - P0, 12).translate(BX, (P0 + TOWER.flame.base) / 2, z), TRIM);
  b.add(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 12).translate(BX, TOWER.flame.base - 0.05, z), DARK);

  // The turrets at the corners: a little taller than the parapet, octagonal slate domes and finials
  const T = TOWER.turret;
  const dome = new THREE.LatheGeometry(
    [
      [0.6, 0],
      [0.62, 0.1],
      [0.58, 0.32],
      [0.46, 0.58],
      [0.28, 0.84],
      [0.1, 1.0],
      [0, T.dome],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    8
  ).rotateY(Math.PI / 8);
  for (const ex of [-1, 1])
    for (const ez of [-1, 1]) {
      // (Standing 2 cm proud of the cornice, so no face of theirs is level with it)
      const cx = BX + ex * (hx - 0.34);
      const cz = z + ez * (hz - 0.34);
      b.box(cx - T.s / 2, R - 0.6, cz - T.s / 2, T.s, T.top - R + 0.6, T.s, STONE);
      b.box(cx - T.s / 2 - 0.08, T.top - 0.12, cz - T.s / 2 - 0.08, T.s + 0.16, 0.14, T.s + 0.16, TRIM);
      b.add(dome.clone().translate(cx, T.top + 0.02, cz), SLATE);
      b.add(new THREE.SphereGeometry(0.08, 8, 6).translate(cx, T.top + T.dome + 0.08, cz), FINIAL);
      b.add(new THREE.CylinderGeometry(0.012, 0.03, 0.3, 5).translate(cx, T.top + T.dome + 0.28, cz), FINIAL);
      // A slit window on its outer faces
      b.box(ex > 0 ? cx + T.s / 2 - 0.03 : cx - T.s / 2 - 0.04, 7.95, cz - 0.07, 0.07, 0.42, 0.14, WINDOW);
      b.box(cx - 0.07, 7.95, ez > 0 ? cz + T.s / 2 - 0.03 : cz - T.s / 2 - 0.04, 0.14, 0.42, 0.07, WINDOW);
    }

  // The stairs up both sides, towards the river: a solid stone flank with its steps, a wall on the outside
  const st = stairsOf(i);
  const run = Math.abs(st.z1 - st.z0);
  const rise = (DECK_Y - G) / STAIR.steps;
  const tread = run / STAIR.steps;
  for (const e of [-1, 1]) {
    const pts: [number, number][] = [[st.z0, G]];
    for (let k = 0; k < STAIR.steps; k++) {
      pts.push([st.z0 + s * k * tread, G + (k + 1) * rise]);
      pts.push([st.z0 + s * (k + 1) * tread, G + (k + 1) * rise]);
    }
    pts.push([st.z1, G]);
    const x0 = e > 0 ? BX + hx : BX - hx - STAIR.tread;
    b.add(slabX(pts, STAIR.tread, x0), STONE);
    // The outer wall, rising with the steps, its coping and the newel at the foot
    const wx = e > 0 ? BX + hx + STAIR.tread : BX - hx - STAIR.w;
    const ww = STAIR.w - STAIR.tread;
    b.add(
      slabX(
        [
          [st.z0, G],
          [st.z0, G + PARAPET_H],
          [st.z1, DECK_Y + PARAPET_H],
          [st.z1, G],
        ],
        ww,
        wx
      ),
      TRIM
    );
    b.box(wx - 0.08, G, st.z0 - (s > 0 ? 0.4 : 0), ww + 0.16, 1.15, 0.4, DARK);
    // A street lamp at the foot of the stairs, its arm over the first steps
    addLamp(BX + e * (hx + STAIR.w + 0.35), st.z0 - s * 0.2, e > 0 ? Math.PI : 0);
  }

  // The landing in front of the river face, its parapets (open to the walkway), the posts under its corners
  const la = landingOf(i);
  const [l0, l1] = [Math.min(la.z0, la.z1), Math.max(la.z0, la.z1)];
  const LX = hx + STAIR.w;
  b.box(BX - LX, DECK_Y - 0.35, l0, LX * 2, 0.35, l1 - l0, STONE);
  b.box(BX - LX + 0.2, DECK_Y, l0, (LX - 0.2) * 2, 0.006, l1 - l0, PAVE);
  for (const e of [-1, 1]) {
    // The sides
    const x0 = e > 0 ? BX + LX - 0.2 : BX - LX;
    b.box(x0, DECK_Y, l0, 0.2, PARAPET_H, l1 - l0, TRIM);
    // The river edge, either side of the walkway
    const zr = la.z1 - (s > 0 ? 0.2 : 0);
    const [a, c] = [BX + e * DECK_HALF, BX + e * LX];
    b.box(Math.min(a, c), DECK_Y, zr, Math.abs(c - a), PARAPET_H, 0.2, TRIM);
    // The posts under the far corners
    const px = BX + e * (LX - 0.25);
    const pz = la.z1 - s * 0.25;
    b.box(px - 0.25, G, pz - 0.25, 0.5, DECK_Y - 0.35 - G, 0.5, TRIM);
  }
}

/* ---------- The walkway on its arches ---------- */

function walkway(b: Batch, low: boolean) {
  const [z0, z1] = WALKWAY;
  const len = z1 - z0;
  // The deck, its paving, its parapets and their coping
  b.box(BX - DECK_HALF, DECK_UNDER, z0, DECK_HALF * 2, DECK_Y - DECK_UNDER, len, STONE);
  b.box(BX - WALK_HALF, DECK_Y, z0, WALK_HALF * 2, 0.006, len, PAVE);
  for (const e of [-1, 1]) {
    const x0 = e > 0 ? BX + WALK_HALF : BX - DECK_HALF;
    b.box(x0, DECK_Y, z0, DECK_HALF - WALK_HALF, PARAPET_H, len, STONE);
    b.box(x0 - 0.04, DECK_Y + PARAPET_H, z0, DECK_HALF - WALK_HALF + 0.08, 0.08, len, TRIM);
    // The string course along the deck's face
    b.box(e > 0 ? BX + DECK_HALF : BX - DECK_HALF - 0.05, DECK_UNDER - 0.05, z0, 0.05, 0.17, len, TRIM);
  }
  // The arches between the supports: the barrel under the deck, the ring of stones on both faces
  for (const { a, b: c } of SPANS) {
    const n = 24;
    const under: [number, number][] = [];
    for (let k = n; k >= 0; k--) {
      const z = a.z + ((c.z - a.z) * k) / n;
      under.push([z, archY(Math.min(c.z, Math.max(a.z, z))) ?? a.y]);
    }
    const barrel: [number, number][] = [[a.z, DECK_UNDER + 0.01], [c.z, DECK_UNDER + 0.01], ...under];
    b.add(slabX(barrel, DECK_HALF * 2, BX - DECK_HALF), STONE);
    const ring: [number, number][] = [...under, ...[...under].reverse().map(([z, y]): [number, number] => [z, Math.min(DECK_UNDER - 0.02, y + 0.28)])];
    for (const e of [-1, 1]) b.add(slabX(ring, 0.04, e > 0 ? BX + DECK_HALF : BX - DECK_HALF - 0.04), TRIM);
  }
  // The supports: pillars in pairs on land (capitals and bases), cutwater piers in the water
  for (const p of SUPPORTS) {
    const ground = p.z > RIVER[0] - 3 && p.z < RIVER[1] + 3 ? 0.05 : SLAB;
    if (p.kind === 'pier') {
      b.box(BX - DECK_HALF, -0.6, p.z - PIER_HALF, DECK_HALF * 2, p.y + 0.6, PIER_HALF * 2, STONE);
      for (const e of [-1, 1]) b.add(new THREE.BoxGeometry(PIER_HALF * 1.42, p.y + 0.6, PIER_HALF * 1.42).rotateY(Math.PI / 4).translate(BX + e * DECK_HALF, (p.y - 0.6) / 2, p.z), STONE);
      b.box(BX - DECK_HALF - 0.08, p.y - 0.14, p.z - PIER_HALF - 0.08, DECK_HALF * 2 + 0.16, 0.14, PIER_HALF * 2 + 0.16, TRIM);
      continue;
    }
    for (const e of [-1, 1]) {
      const x = BX + e * PILLAR.x;
      b.box(x - PILLAR.half, ground, p.z - PILLAR.half, PILLAR.half * 2, p.y - ground, PILLAR.half * 2, STONE);
      b.box(x - PILLAR.half - 0.06, ground, p.z - PILLAR.half - 0.06, PILLAR.half * 2 + 0.12, 0.3, PILLAR.half * 2 + 0.12, DARK);
      b.box(x - PILLAR.half - 0.06, p.y - 0.16, p.z - PILLAR.half - 0.06, PILLAR.half * 2 + 0.12, 0.16, PILLAR.half * 2 + 0.12, TRIM);
    }
  }
  // Pilasters on the parapets with lanterns on top, their light pooled on the walk at night
  const lanterns: THREE.Vector3[] = [];
  const step = low ? 6.6 : 4.4;
  const n = Math.max(2, Math.round(len / step));
  for (let k = 0; k <= n; k++) {
    const z = z0 + 0.4 + ((len - 0.8) * k) / n;
    for (const e of [-1, 1]) {
      const x = BX + e * ((WALK_HALF + DECK_HALF) / 2);
      b.box(x - 0.17, DECK_Y, z - 0.17, 0.34, PARAPET_H + 0.14, 0.34, TRIM);
      b.box(x - 0.04, DECK_Y + PARAPET_H + 0.14, z - 0.04, 0.08, 0.32, 0.08, IRON);
      b.box(x - 0.09, DECK_Y + PARAPET_H + 0.44, z - 0.09, 0.18, 0.04, 0.18, IRON);
      b.add(new THREE.BoxGeometry(0.11, 0.16, 0.11).translate(x, DECK_Y + PARAPET_H + 0.38, z), BULB);
      lanterns.push(V(x, DECK_Y + PARAPET_H + 0.38, z));
      if (k % 2 === (e > 0 ? 0 : 1)) addPool(x - e * 0.6, z, 1.6, DECK_Y);
    }
  }
  return lanterns;
}

/* ---------- The place ---------- */

export function buildLibertyBridge(scene: THREE.Scene, opts: { flame: HTMLImageElement | null; tick: (f: Tick) => void; reduced: boolean; low: boolean }): { spot: Spot } {
  const group = new THREE.Group();
  group.name = 'liberty';
  scene.add(group);

  // A paved apron round each tower and its stairs, on its lawn
  const ground = new Batch();
  const paving = lotMat('paving');
  for (const [x0, z0, x1, z1] of LIBERTY_RECTS.slice(0, 2)) {
    const m = 0.8;
    ground.add(
      flatPoly(
        [
          [x0 - m, z0 - m],
          [x0 - m, z1 + m],
          [x1 + m, z1 + m],
          [x1 + m, z0 - m],
        ],
        SLAB + 0.012
      ),
      paving
    );
  }
  ground.build(scene, { cast: false, receive: true });

  const b = new Batch();
  const plaques = new Batch();
  const crest = lit(new THREE.MeshBasicMaterial({ map: crestTex(opts.flame), toneMapped: true }), 0.95, 1.2);
  const name = lit(new THREE.MeshBasicMaterial({ map: nameTex(), toneMapped: true }), 0.95, 1.25);
  for (const i of [0, 1] as const) tower(b, plaques, i, crest, name);
  const lanterns = walkway(b, opts.low);
  b.build(group);
  plaques.build(group, { cast: false, receive: false });
  // The lanterns' halos (points, always facing the camera), only at night
  const haloMat = lit(new THREE.PointsMaterial({ color: '#ffe2a0', map: glowTex, size: 0.9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0, 0.4);
  group.add(fx(new THREE.Points(new THREE.BufferGeometry().setFromPoints(lanterns), haloMat)));

  // The Liberty flame on each tower, turning slowly (still under reduced motion); its colours are its own light
  const flameGeo = flameGeometry();
  const flameMat = lit(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: true }), 0.95, 1.1);
  const flames = TOWERS.map((z, i) => {
    const m = new THREE.Mesh(flameGeo, flameMat);
    m.position.set(BX, TOWER.flame.base, z);
    m.rotation.y = i * Math.PI;
    m.castShadow = true;
    // Meant to be seen from far away, and turning: never in the bridge's far form (lod.ts)
    m.userData.keep = true;
    group.add(m);
    return m;
  });
  // A warm light on each flame's drum at night, and pools of it on the paving round each tower's foot
  for (const z of TOWERS) {
    addPool(BX, z, 2.4, TOWER.roof + 0.04);
    for (const e of [-1, 1]) addPool(BX + e * (hx + STAIR.w + 0.4), z, 3.2, SLAB + 0.01);
    for (const f of [-1, 1]) addPool(BX, z + f * (hz + 0.9), 2.6, SLAB + 0.01);
  }
  opts.tick(({ t, dt }) => {
    if (opts.reduced) return;
    flames.forEach((m, i) => {
      m.rotation.y += dt * 0.35;
      m.scale.set(1, 1 + Math.sin(t * 2.3 + i * 1.7) * 0.025, 1);
    });
  });

  // The hover ring round the north tower's foot, and the pin over its flame
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.74, 72), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(BX, SLAB + 0.03, TOWERS[0]);
  group.add(fx(ring));
  const mid = (TOWERS[0] + TOWERS[1]) / 2;
  const spot: Spot = { id: 'liberty', group, focus: V(BX, 4, mid), size: 24, pin: V(BX, TOWER.flame.base + TOWER.flame.h + 1.2, TOWERS[0]), ring };
  return { spot };
}
