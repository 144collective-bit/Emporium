/*
 * Liberty Bridge (liberty.ts has the numbers): a one-of-a-kind suspension
 * bridge carrying Liberty Road over the river, in Degen's style (flat
 * cartoon shading, ink outlines, neon).
 *
 * - Liberty Road itself: asphalt from the west cross street to the Southside
 *   Loop, its dashed centre line, zebras at its three lit junctions and
 *   lamps along its sidewalks.
 * - The deck over the river: the road, two wide raised walks, the edge beams
 *   with a neon line along them, and railings.
 * - Twin towers, one on each bank's grounds (the old West 3 and South 1),
 *   each two tapering legs on plinths with portal beams between them (the
 *   low one carries LIBERTY BRIDGE) and a crown carrying the Liberty flame on
 *   both faces. Neon runs up the legs' outer corners in the flame's colours.
 * - The main cables sweep from saddle to saddle high over both river avenues
 *   and dip over the water; backstays run down to the anchorages behind the
 *   towers; hangers drop to the deck and, over the grounds, to a low stringer.
 *   Bulbs along the cables light up at night.
 *
 * The superstructure is the spot's group (it lifts on hover); the road and
 * deck stay on the ground. A few draw calls in all: one Batch's colours and
 * neon, the flame and sign textures, the paving, the blinking tower lights.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, glowMat, glowTex, lit, neon, roundRect, toon } from './kit';
import { SLAB, addLamp, flatPoly, lotMat, type Tick } from './world';
import { EW_ROADS, LIBERTY_ROAD, WALK_W } from './layout';
import { LIBERTY_GROUNDS } from './outer';
import { ANCHOR, ANCHORS, BEAMS, CROWN, DECK, DECK_HALF, FASCIA, GROUND_EDGE, HANGERS, LEG, LEG_X, LX, LZ, RAIL_X, SADDLE, TOWERS, TOWER_H, cableY } from './liberty';
import type { Spot } from './landmarks';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const TOWER = toon('#3b2f7d');
const STONE = toon('#6b6790');
const CABLE = toon('#ff6a3d');
const HANGER = toon('#e8e4f8');
const RAIL = toon('#c9c4e6');
const DECK_TOP = toon('#34314f');
const WALK_TOP = toon('#5a5290');
const ASPHALT = toon('#26243f');
const ZEBRA = toon('#e8e4f8');
const DASH = neon('#f5d76e', 0.9, 1.1);
/** Thin neon tubes and bulbs (pass the bloom threshold at night); bigger lit things softer */
const glow = (c: string) => neon(c, 0.6, 2.4);
const soft = (c: string) => neon(c, 0.5, 1.3);
/** The flame's colours, from its tail (magenta) to its tip (gold): the neon up the legs */
const FLAME = ['#e219e5', '#ff2e8a', '#ff5a36', '#ff9a2e', '#ffd36b'];

/** The legs' foot and top (y), and their half sizes at a height (they taper) */
const FOOT = SLAB + LEG.plinth.h;
const TOP = CROWN.y1;
const half = (y: number) => {
  const f = Math.min(1, Math.max(0, (y - FOOT) / (TOP - FOOT)));
  const k = 1 + (LEG.taper - 1) * f;
  return { w: (LEG.w / 2) * k, d: (LEG.d / 2) * k };
};

/** A box narrowing from (w0, d0) at y0 to (w1, d1) at y1, centred on (x, z) */
function taper(x: number, z: number, y0: number, y1: number, w0: number, d0: number, w1: number, d1: number) {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const up = p.getY(i) > 0;
    p.setXYZ(i, x + p.getX(i) * (up ? w1 : w0), up ? y1 : y0, z + p.getZ(i) * (up ? d1 : d0));
  }
  g.computeVertexNormals();
  return g;
}
/** A flat plane lying on the ground, centred at (x, y, z), w across x and d along z */
const flat = (x: number, y: number, z: number, w: number, d: number) => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(x, y, z);
/** An upright plane facing +z (or -z with `back`) */
const face = (x: number, y: number, z: number, w: number, h: number, back: boolean) => new THREE.PlaneGeometry(w, h).rotateY(back ? Math.PI : 0).translate(x, y, z);
/** A cylinder from a to b (open-ended: its caps are never seen) */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, sides = 5) {
  const d = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(r, r, d.length(), sides, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

/* ---------- Textures ---------- */

/** The crown's plaque: the Liberty flame on a dark panel with a gradient rim */
function flameTex(img: HTMLImageElement | null) {
  return canvasTex(384, 476, (ctx, w, h) => {
    ctx.fillStyle = '#120d2a';
    ctx.fillRect(0, 0, w, h);
    const rim = ctx.createLinearGradient(0, h, 0, 0);
    FLAME.forEach((c, i) => rim.addColorStop(i / (FLAME.length - 1), c));
    roundRect(ctx, 14, 14, w - 28, h - 28, 34);
    ctx.lineWidth = 12;
    ctx.strokeStyle = rim;
    ctx.stroke();
    if (img) {
      const s = Math.min((w - 110) / img.width, (h - 110) / img.height);
      const [iw, ih] = [img.width * s, img.height * s];
      ctx.shadowColor = '#ff6a3d';
      ctx.shadowBlur = 26;
      ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
      ctx.shadowBlur = 0;
      ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
    }
  });
}
/** LIBERTY BRIDGE on the low portal beam, in the city's lettering with the flame's gradient */
function nameTex() {
  return canvasTex(1024, 116, (ctx, w, h) => {
    ctx.fillStyle = '#120d2a';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `900 84px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '14px';
    const g = ctx.createLinearGradient(160, 0, w - 160, 0);
    g.addColorStop(0, FLAME[0]);
    g.addColorStop(0.5, FLAME[2]);
    g.addColorStop(1, FLAME[4]);
    ctx.shadowColor = FLAME[2];
    ctx.shadowBlur = 18;
    ctx.fillStyle = g;
    ctx.fillText('LIBERTY BRIDGE', w / 2, h / 2 + 4);
    ctx.shadowBlur = 0;
    ctx.fillText('LIBERTY BRIDGE', w / 2, h / 2 + 4);
  });
}

/* ---------- Liberty Road on the ground ---------- */

function road(b: Batch) {
  const H = LIBERTY_ROAD.half;
  const [z0, z1] = LZ;
  b.box(LX - H, 0.002, z0, H * 2, 0.03, z1 - z0, ASPHALT);
  const crossing = EW_ROADS.filter((r) => r.c >= z0 && r.c < z1);
  const onDeck = (z: number) => z > DECK.z0 && z < DECK.z1;
  const y = (z: number) => (onDeck(z) ? 0.066 : 0.037);
  // The dashed centre line, clear of the junctions (and of the loop at the south end)
  for (let z = z0 + crossing[0].half + 1.4; z < z1 - 2.9; z += 1.1)
    if (!crossing.some((r) => Math.abs(z - r.c) < r.half + 1.4)) b.add(flat(LX, y(z), z, 0.07, 0.55), DASH);
  // Zebras at each junction: across Liberty Road either side (only the south side where it starts), and across the other road either side of it
  for (const r of crossing) {
    for (const s of [-1, 1]) {
      const z = r.c + s * (r.half + 0.45);
      if (z < z0) continue;
      for (let k = LX - H + 0.16; k < LX + H - 0.1; k += 0.32) b.add(flat(k, y(z) + 0.004, z, 0.17, 0.55), ZEBRA);
    }
    for (const s of [-1, 1]) for (let k = r.c - r.half + 0.16; k < r.c + r.half - 0.1; k += 0.32) b.add(flat(LX + s * (H + 0.45), 0.041, k, 0.55, 0.17), ZEBRA);
  }
  // Lamps along the sidewalks, the arms out over the road, clear of the junctions and the towers' legs
  for (const [a, c] of [
    [z0 + 3.5, GROUND_EDGE[0] - 0.5],
    [GROUND_EDGE[1] + 1.2, z1 - 4],
  ])
    for (let z = a; z <= c; z += 4.4) {
      if (TOWERS.some((t) => Math.abs(z - t) < 1.6)) continue;
      addLamp(LX - H - WALK_W * 0.55, z, 0);
      addLamp(LX + H + WALK_W * 0.55, z + 2.2 <= c ? z + 2.2 : z, Math.PI);
    }
  // The grounds round the towers are paved, either side of the road
  const paving = lotMat('paving');
  for (const g of LIBERTY_GROUNDS)
    for (const [x0, x1] of [
      [g[0], LX - H - WALK_W],
      [LX + H + WALK_W, g[2]],
    ])
      b.add(
        flatPoly(
          [
            [x0, g[1]],
            [x0, g[3]],
            [x1, g[3]],
            [x1, g[1]],
          ],
          SLAB + 0.012
        ),
        paving
      );
}

/* ---------- The deck over the river ---------- */

function deck(b: Batch, low: boolean) {
  const H = LIBERTY_ROAD.half;
  const len = DECK.z1 - DECK.z0;
  b.box(LX - H, 0, DECK.z0, H * 2, 0.06, len, DECK_TOP);
  for (const s of [-1, 1]) {
    // The raised walk, the edge beam outside it (down to the water) with its neon line, the railing on the beam
    const [w0, w1] = s < 0 ? [LX - DECK_HALF, LX - H] : [LX + H, LX + DECK_HALF];
    b.box(w0, 0, DECK.z0, w1 - w0, SLAB, len, WALK_TOP);
    const [f0, f1] = s < 0 ? [LX - FASCIA.x1, LX - FASCIA.x0] : [LX + FASCIA.x0, LX + FASCIA.x1];
    b.box(f0, -0.2, DECK.z0, f1 - f0, 0.48, len, TOWER);
    const out = s < 0 ? f0 - 0.012 : f1 + 0.012;
    b.box(out - 0.012, 0.06, DECK.z0 + 0.1, 0.024, 0.04, len - 0.2, glow(PAL.cyan));
    const rx = LX + s * RAIL_X;
    for (let z = DECK.z0 + 0.1; z <= DECK.z1 - 0.05; z += low ? 1.5 : 0.75) b.box(rx - 0.035, 0.28, z - 0.035, 0.07, 0.57, 0.07, RAIL);
    for (const y of [0.55, 0.82]) b.box(rx - 0.03, y, DECK.z0 + 0.05, 0.06, 0.05, len - 0.1, RAIL);
  }
}

/* ---------- The towers, cables and hangers ---------- */

function tower(b: Batch, z: number, plaques: Batch, flameMat: THREE.Material, nameMat: THREE.Material, beacons: Batch, beaconMat: THREE.Material) {
  for (const s of [-1, 1]) {
    const x = LX + s * LEG_X;
    // Plinth, the leg, the saddle housing on top and its hump
    const P = LEG.plinth;
    b.box(x - P.w / 2, SLAB, z - P.d / 2, P.w, P.h, P.d, STONE);
    const top = half(TOP);
    b.add(taper(x, z, FOOT, TOP, LEG.w, LEG.d, top.w * 2, top.d * 2), TOWER);
    b.box(x - top.w - 0.05, TOP, z - top.d - 0.05, top.w * 2 + 0.1, 0.5, top.d * 2 + 0.1, STONE);
    b.add(taper(x, z, TOP + 0.5, TOWER_H, top.w * 2 + 0.1, top.d * 2 + 0.1, 0.36, 0.5), STONE);
    beacons.add(new THREE.IcosahedronGeometry(0.08, 0).translate(x, TOWER_H + 0.06, z), beaconMat);
    // Neon up the outer corners, in the flame's colours from foot to crown
    const n = FLAME.length;
    for (let k = 0; k < n; k++) {
      const y0 = FOOT + 0.25 + ((TOP - FOOT - 0.4) * k) / n;
      const y1 = FOOT + 0.25 + ((TOP - FOOT - 0.4) * (k + 1)) / n - 0.06;
      const h = half((y0 + y1) / 2);
      for (const e of [-1, 1]) b.box(x + s * (h.w + 0.01) - 0.025, y0, z + e * (h.d - 0.09) - 0.025, 0.05, y1 - y0, 0.05, glow(FLAME[k]));
    }
    // Uplights on the plinth, either side of the leg, lit at night
    for (const e of [-1, 1]) b.box(x - 0.12, SLAB + P.h, z + e * (LEG.d / 2 + 0.1) - 0.06, 0.24, 0.025, 0.12, soft(FLAME[3]));
  }
  // The portal beams between the legs (tucked into them), the low one with the name on both faces
  BEAMS.forEach(({ y0, y1 }, i) => {
    const reach = LEG_X - half(y1).w + 0.15;
    const d = i === 0 ? 0.8 : 0.6;
    b.box(LX - reach, y0, z - d / 2, reach * 2, y1 - y0, d, TOWER);
    if (i === 0) {
      for (const back of [false, true]) plaques.add(face(LX, (y0 + y1) / 2, z + (back ? -1 : 1) * (d / 2 + 0.012), 4.9, 0.56, back), nameMat);
      // A neon line along its underside edges
      for (const e of [-1, 1]) b.box(LX - reach + 0.3, y0 - 0.025, z + e * (d / 2 - 0.05) - 0.02, reach * 2 - 0.6, 0.025, 0.04, glow(PAL.cyan));
    }
  });
  // The crown between the legs' tops, with the flame on both faces
  const reach = LEG_X - half(CROWN.y1).w + 0.15;
  const cd = 0.86;
  b.box(LX - reach, CROWN.y0, z - cd / 2, reach * 2, CROWN.y1 - 0.05 - CROWN.y0, cd, TOWER);
  for (const back of [false, true]) plaques.add(face(LX, (CROWN.y0 + CROWN.y1) / 2, z + (back ? -1 : 1) * (cd / 2 + 0.012), 1.5, 1.86, back), flameMat);
}

/** Where the bulbs ride on the main cables and backstays (their halos are drawn as points) */
function bulbs(low: boolean) {
  const out: THREE.Vector3[] = [];
  const step = low ? 2.4 : 1.2;
  for (const side of [-1, 1])
    for (let z = ANCHORS[0] + 0.6; z < ANCHORS[1] - 0.5; z += step) if (TOWERS.every((t) => Math.abs(z - t) > 0.7)) out.push(V(LX + side * LEG_X, cableY(z) + 0.14, z));
  return out;
}

function cables(b: Batch, at: THREE.Vector3[]) {
  const [n, s] = TOWERS;
  const bulb = glow('#ffe9b0');
  // Bulbs riding on the cables, lit at night
  for (const p of at) b.add(new THREE.IcosahedronGeometry(0.075, 0).translate(p.x, p.y, p.z), bulb);
  for (const side of [-1, 1]) {
    const x = LX + side * LEG_X;
    // The main cable, saddle to saddle
    const pts: THREE.Vector3[] = [];
    for (let z = n; z <= s + 1e-6; z += 0.5) pts.push(V(x, cableY(z), z));
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length, 0.1, 6, false), CABLE);
    // The backstays, down to the anchorages
    for (const [a, t] of [
      [ANCHORS[0], n],
      [ANCHORS[1], s],
    ])
      b.add(rod(V(x, ANCHOR.h - 0.1, a), V(x, SADDLE, t), 0.1, 6), CABLE);
    // Hangers: onto the deck's edge beam over the river, onto a low stringer over the grounds
    for (const h of HANGERS) b.add(rod(V(x, h.deck ? 0.28 : SLAB + 0.3, h.z), V(x, cableY(h.z) - 0.06, h.z), 0.025), HANGER);
    for (const [a, c] of [
      [n + LEG.plinth.d / 2, GROUND_EDGE[0]],
      [GROUND_EDGE[1], s - LEG.plinth.d / 2],
    ])
      b.box(x - 0.15, SLAB, a, 0.3, 0.3, c - a, TOWER);
  }
  // The anchorages
  for (const z of ANCHORS) for (const side of [-1, 1]) b.box(LX + side * LEG_X - ANCHOR.w / 2, SLAB, z - ANCHOR.d / 2, ANCHOR.w, ANCHOR.h - SLAB, ANCHOR.d, STONE);
}

/* ---------- The place ---------- */

export function buildLibertyBridge(scene: THREE.Scene, opts: { flame: HTMLImageElement | null; tick: (f: Tick) => void; reduced: boolean; low: boolean }): { spot: Spot } {
  const ground = new Batch();
  road(ground);
  deck(ground, opts.low);
  ground.build(scene, { cast: false, receive: true });

  const group = new THREE.Group();
  group.name = 'liberty';
  scene.add(group);
  const b = new Batch();
  const plaques = new Batch();
  const beacons = new Batch();
  const flameMat = lit(new THREE.MeshBasicMaterial({ map: flameTex(opts.flame), toneMapped: true }), 1, 1.35);
  const nameMat = lit(new THREE.MeshBasicMaterial({ map: nameTex(), toneMapped: true }), 1, 1.4);
  // The towers' red lights blink (their own material, so the shared neon never changes)
  const beaconMat = new THREE.MeshBasicMaterial({ color: '#ff2b2b', toneMapped: true });
  for (const z of TOWERS) tower(b, z, plaques, flameMat, nameMat, beacons, beaconMat);
  const at = bulbs(opts.low);
  cables(b, at);
  b.build(group);
  // The bulbs' halos: points (always facing the camera), only at night, so the cables read as strings of light from across town
  const haloMat = lit(new THREE.PointsMaterial({ color: '#ffe2a0', map: glowTex, size: 0.9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0, 0.45);
  group.add(fx(new THREE.Points(new THREE.BufferGeometry().setFromPoints(at), haloMat)));
  plaques.build(group, { cast: false, receive: false });
  beacons.build(group, { cast: false, receive: false });
  const red = new THREE.Color('#ff2b2b');
  opts.tick(({ t, night }) => {
    const on = opts.reduced || t % 2 < 0.25 ? 0.6 + night * 1.8 : 0.15;
    beaconMat.color.copy(red).multiplyScalar(on);
  });

  // The hover ring on the deck, and the pin over the north tower's crown
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.54, 64), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  const mid = (DECK.z0 + DECK.z1) / 2;
  ring.position.set(LX, 0.075, mid);
  group.add(fx(ring));
  const spot: Spot = { id: 'liberty', group, focus: V(LX, 4.5, (TOWERS[0] + TOWERS[1]) / 2), size: 22, pin: V(LX, TOWER_H + 1.3, TOWERS[0]), ring };
  return { spot };
}
