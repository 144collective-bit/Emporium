/*
 * The Fight Club (docs/fight-plan.md, Phase 2): the cartoon boxing gym on the
 * south bank, east of the garage, fronting the south bank avenue. The
 * numbers are fightsite.ts (the lot, the ring, the shed, the counter, the
 * bags, the lockers, the bleachers, the sign); the footprints walk mode and
 * the server share are FIGHTCLUB_SITE in solids.ts. fight.ts runs the
 * fights in the ring and flips `setLive()` while one is on.
 *
 * In Degen's style (ink outlines from the post-pass, flat toon colours, the
 * PulseChain neon): a paved yard with a low kerb; the ring, a low canvas
 * platform with the Emporium diamond painted on it, corner posts with
 * turnbuckle pads and three ropes (neon cyan and pink, white on top; you
 * step through them); an open-sided shed over the ring (a flat roof on
 * posts, the east and south walls closed and ribbed like corrugated sheet)
 * with a rig of four ring lights under it; the trainer's counter kiosk, the
 * heavy bag on its frame and the speed bag on its platform in the yard; the
 * lockers along the west side with a bench and a water cooler; three-tier
 * bleachers on the east; and the neon FIGHT CLUB cut-out on a gantry over
 * the yard's front (fixed copy only, never the token).
 *
 * Drawn in world numbers through one Batch (the shared paint and neon), so
 * the whole place is about a dozen draw calls. The ring lights' idle and
 * live panels and the sign's idle and live faces are their own materials
 * (never a shared toon() or neon() colour changed at runtime).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch, FONT_DISPLAY, FONT_MONO, PAL, canvasTex, fx, glowMat, lit, neon, occlude, place, plane, toon } from './kit';
import { SLAB as S, addLamp, addPool, type Tick } from './world';
import type { Spot } from './landmarks';
import type { FightClub } from './fight-types';
import { BAGS, BLEACHERS, COUNTER, FIGHT_CLUB, LOCKERS, POSTS, POST_R, RING, RING_H, RING_HALF, ROPES, SHED, SIGN } from './fightsite';
import { FIGHTCLUB_FIX } from './solids';

/** The place's id (city.ts SpotId lists it once index.ts wires the pin and panel) */
const ID = 'fightclub';
/** Fixed copy only */
const SIGN_TEXT = 'FIGHT CLUB';
const PLATE_TEXT = 'TRAINER';

const INK = toon('#1b1830');
const STEEL = toon('#2b2a40');
const WALL = toon('#3d4a6b');
const WALL_D = toon('#2c3550');
const ROOF = toon('#25223a');
const PAVE = toon('#4b4766');
const KERB = toon('#5a5290');
const LINE = toon('#d9d4ef');
const RED = toon('#e23b3b');
const WOOD = toon('#8a5a3c');
/** A shade under white, so nothing white blooms */
const LIGHT = toon('#cfcedb');
const PINK = toon('#e219e5');
const CYAN = toon(PAL.cyan);
const ROSE = toon(PAL.pink);
const LOCKER = toon('#2d5f8f');
const DOOR = toon('#3a78b0');
const glow = (c: string) => neon(c, 0.6, 2.4);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const unitBox = new THREE.BoxGeometry(1, 1, 1);

/** The canvas: pale, a pink border, the Emporium diamond outlined in the middle (nothing else on it) */
const canvasTexture = () =>
  canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#cfcedb';
    c.fillRect(0, 0, w, h);
    // The weave
    c.strokeStyle = '#c3c1d3';
    c.lineWidth = 2;
    for (let i = 0; i <= w; i += 32) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, h);
      c.moveTo(0, i);
      c.lineTo(w, i);
      c.stroke();
    }
    c.strokeStyle = PAL.pink;
    c.lineWidth = 10;
    c.strokeRect(26, 26, w - 52, h - 52);
    // The diamond: a gem seen side on, its girdle line and facets
    const cx = w / 2;
    const cy = h / 2 - 14;
    const gem = () => {
      c.beginPath();
      c.moveTo(cx - 104, cy - 86);
      c.lineTo(cx + 104, cy - 86);
      c.lineTo(cx + 150, cy - 18);
      c.lineTo(cx, cy + 150);
      c.lineTo(cx - 150, cy - 18);
      c.closePath();
    };
    c.lineJoin = 'round';
    gem();
    c.strokeStyle = PAL.pink;
    c.lineWidth = 22;
    c.stroke();
    gem();
    c.strokeStyle = PAL.cyan;
    c.lineWidth = 9;
    c.stroke();
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(cx - 150, cy - 18);
    c.lineTo(cx + 150, cy - 18);
    for (const [ax, bx] of [
      [-104, -58],
      [104, 58],
      [-104, 58],
      [104, -58],
    ]) {
      c.moveTo(cx + ax, cy - 86);
      c.lineTo(cx + bx, cy - 18);
    }
    for (const x of [-58, 58]) {
      c.moveTo(cx + x, cy - 18);
      c.lineTo(cx, cy + 150);
    }
    c.stroke();
  });

/** The FIGHT CLUB cut-out: the lettering in the PulseChain gradient, its glow baked in */
const signTexture = () =>
  canvasTex(2048, 320, (c, w, h) => {
    c.font = `900 236px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '16px';
    const grad = c.createLinearGradient(w * 0.22, 0, w * 0.78, 0);
    grad.addColorStop(0, '#f10e7d');
    grad.addColorStop(0.3, '#e219e5');
    grad.addColorStop(0.55, '#8000ff');
    grad.addColorStop(0.78, '#037dff');
    grad.addColorStop(1, '#00eaff');
    for (const [col, blur] of [
      [PAL.pink, 44],
      [PAL.cyan, 20],
    ] as const) {
      c.shadowColor = col;
      c.shadowBlur = blur;
      c.fillStyle = grad;
      c.fillText(SIGN_TEXT, w / 2, h / 2 + 8);
    }
    c.shadowBlur = 0;
    c.fillStyle = '#ffffff';
    c.globalAlpha = 0.62;
    c.fillText(SIGN_TEXT, w / 2, h / 2 + 8);
  });

/** The small plate under the counter's canopy */
const plateTexture = () =>
  canvasTex(256, 64, (c) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, 256, 64);
    c.font = `900 44px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '4px';
    c.fillStyle = PAL.warm;
    c.fillText(PLATE_TEXT, 128, 34);
    c.font = `700 14px ${FONT_MONO}`;
    c.fillStyle = PAL.cyan;
    c.fillText('SPAR · BOUT', 128, 56);
  });

/** A bench, the sitter facing `ry` (0 is +z), seat top at y + 0.3 */
function bench(b: Batch, x: number, z: number, ry: number, y = S) {
  const g = (w: number, h: number, d: number, px: number, py: number, pz: number) =>
    new THREE.BoxGeometry(w, h, d)
      .translate(px, py + h / 2, pz)
      .rotateY(ry)
      .translate(x, y, z);
  b.add(g(1.1, 0.06, 0.3, 0, 0.24, 0), WOOD);
  b.add(g(1.1, 0.3, 0.05, 0, 0.32, -0.15), WOOD);
  for (const sx of [-0.45, 0.45]) b.add(g(0.05, 0.26, 0.28, sx, 0, 0), INK);
}

export function buildFightClub(scene: THREE.Scene, opts: { tick: (f: Tick) => void; reduced: boolean; low: boolean }): FightClub {
  const { low, reduced } = opts;
  const L = FIGHT_CLUB;
  /** The paving stays on the ground; everything standing on it is the spot's group (lifted on hover) */
  const group = new THREE.Group();
  group.name = 'fightclub-lot';
  scene.add(group);
  const places = new THREE.Group();
  places.name = ID;
  group.add(places);
  const gb = new Batch();
  const b = new Batch();
  const top = S + RING_H;

  /* ----- The yard: paving with a low kerb, a painted line in from the avenue ----- */
  gb.box(L.x0, S, L.z0, L.x1 - L.x0, 0.008, L.z1 - L.z0, KERB);
  gb.box(L.x0 + 0.3, S, L.z0 + 0.3, L.x1 - L.x0 - 0.6, 0.012, L.z1 - L.z0 - 0.6, PAVE);
  gb.box(RING.x - 0.03, S + 0.013, L.z0 + 0.3, 0.06, 0.004, RING.z - RING_HALF - 0.9 - L.z0, LINE);
  gb.build(group, { cast: false });

  /* ----- The ring: the platform, its skirt, the canvas, the posts, the pads, the ropes ----- */
  const rx0 = RING.x - RING_HALF;
  const rz0 = RING.z - RING_HALF;
  const RW = RING_HALF * 2;
  b.box(rx0, S, rz0, RW, RING_H, RW, INK);
  b.box(rx0 - 0.03, S + 0.025, rz0 - 0.03, RW + 0.06, 0.06, RW + 0.06, PINK);
  b.add(place(new THREE.PlaneGeometry(RW, RW), RING.x, top + 0.006, RING.z, 1, 1, 1, -Math.PI / 2), new THREE.MeshToonMaterial({ map: canvasTexture() }));
  const POST_H = 1.45;
  const post = new THREE.CylinderGeometry(POST_R, POST_R, POST_H, 10);
  const cap = new THREE.SphereGeometry(0.1, 10, 8);
  POSTS.forEach(([x, z], k) => {
    const cyan = k === 0 || k === 3;
    b.add(post.clone().translate(x, top + POST_H / 2, z), cyan ? CYAN : ROSE);
    b.add(cap.clone().translate(x, top + POST_H + 0.04, z), glow(cyan ? PAL.cyan : PAL.pink));
    b.box(x - 0.17, top, z - 0.17, 0.34, 0.05, 0.34, INK);
    // Turnbuckle pads at each rope, on the ring's side of the post
    const sx = x < RING.x ? 1 : -1;
    const sz = z < RING.z ? 1 : -1;
    for (const h of ROPES) b.box(x + sx * 0.1 - 0.14, top + h - 0.09, z + sz * 0.1 - 0.14, 0.28, 0.18, 0.28, LIGHT);
  });
  const ropeMats = [neon(PAL.cyan, 0.7, 2.0), neon(PAL.pink, 0.7, 2.0), LIGHT];
  ROPES.forEach((h, i) => {
    const y = top + h;
    const m = ropeMats[i];
    for (const z of [rz0, rz0 + RW]) b.box(rx0, y - 0.025, z - 0.025, RW, 0.05, 0.05, m);
    for (const x of [rx0, rx0 + RW]) b.box(x - 0.025, y - 0.025, rz0, 0.05, 0.05, RW, m);
  });

  /* ----- The shed: a flat roof on four posts, the east and south walls closed and ribbed ----- */
  const SW = SHED.x1 - SHED.x0;
  const SD = SHED.z1 - SHED.z0;
  const roofY = S + SHED.h;
  b.box(SHED.x0 - 0.2, roofY, SHED.z0 - 0.2, SW + 0.4, 0.16, SD + 0.4, ROOF);
  // Fascias along the open sides, each with a neon tube under it
  b.box(SHED.x0 - 0.2, roofY - 0.3, SHED.z0 - 0.2, SW + 0.4, 0.3, 0.1, WALL_D);
  b.box(SHED.x0 - 0.2, roofY - 0.3, SHED.z0 - 0.2, 0.1, 0.3, SD + 0.4, WALL_D);
  b.add(new THREE.BoxGeometry(SW + 0.2, 0.035, 0.035).translate(SHED.x0 + SW / 2, roofY - 0.32, SHED.z0 - 0.17), neon(PAL.cyan, 0.8, 2.6));
  b.add(new THREE.BoxGeometry(0.035, 0.035, SD + 0.2).translate(SHED.x0 - 0.17, roofY - 0.32, SHED.z0 + SD / 2), neon(PAL.pink, 0.8, 2.6));
  for (const [x, z] of FIGHTCLUB_FIX.shedPosts) {
    b.box(x - 0.09, S, z - 0.09, 0.18, SHED.h, 0.18, STEEL);
    b.box(x - 0.14, S, z - 0.14, 0.28, 0.1, 0.28, INK);
  }
  const WT = 0.2;
  b.box(SHED.x1 - WT, S, SHED.z0, WT, SHED.h, SD, WALL);
  b.box(SHED.x0, S, SHED.z1 - WT, SW, SHED.h, WT, WALL);
  // Corrugations: ribs on both faces of each wall, and a band of colour outside
  const ribStep = low ? 1.1 : 0.55;
  for (let z = SHED.z0 + 0.3; z < SHED.z1 - WT - 0.2; z += ribStep) for (const x of [SHED.x1 - WT - 0.06, SHED.x1]) b.box(x, S + 0.1, z, 0.06, SHED.h - 0.3, 0.14, WALL_D);
  for (let x = SHED.x0 + 0.3; x < SHED.x1 - WT - 0.2; x += ribStep) for (const z of [SHED.z1 - WT - 0.06, SHED.z1]) b.box(x, S + 0.1, z, 0.14, SHED.h - 0.3, 0.06, WALL_D);
  b.box(SHED.x1 + 0.06, S + 2.1, SHED.z0, 0.03, 0.2, SD, PINK);
  b.box(SHED.x0, S + 2.1, SHED.z1 + 0.06, SW, 0.2, 0.03, PINK);
  // The rig under the roof: a square frame on drop rods, bulbs along it, a light head at each corner
  const rigY = roofY - 0.6;
  const RR = 2.3;
  for (const z of [RING.z - RR, RING.z + RR]) b.box(RING.x - RR, rigY, z - 0.04, RR * 2, 0.08, 0.08, STEEL);
  for (const x of [RING.x - RR, RING.x + RR]) b.box(x - 0.04, rigY, RING.z - RR, 0.08, 0.08, RR * 2, STEEL);
  const bulb = new THREE.SphereGeometry(0.05, 8, 6);
  const warm = glow(PAL.warm);
  for (const k of [-1, 0, 1]) {
    for (const z of [RING.z - RR, RING.z + RR]) b.add(bulb.clone().translate(RING.x + k * RR * 0.6, rigY - 0.03, z), warm);
    for (const x of [RING.x - RR, RING.x + RR]) b.add(bulb.clone().translate(x, rigY - 0.03, RING.z + k * RR * 0.6), warm);
  }
  const idle = new Batch();
  const live = new Batch();
  const idleMat = lit(new THREE.MeshBasicMaterial({ color: '#ffe3b8', toneMapped: true }), 0.35, 0.9);
  const liveMat = lit(new THREE.MeshBasicMaterial({ color: '#fff1d6', toneMapped: true }), 0.9, 1.3);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = RING.x + sx * RR;
      const z = RING.z + sz * RR;
      b.box(x - 0.04, rigY + 0.08, z - 0.04, 0.08, roofY - rigY - 0.08, 0.08, STEEL);
      // The head hangs just inside the corner, aimed at the canvas
      const hx = x - sx * 0.35;
      const hz = z - sz * 0.35;
      b.box(hx - 0.32, rigY - 0.22, hz - 0.22, 0.64, 0.16, 0.44, INK);
      idle.box(hx - 0.28, rigY - 0.235, hz - 0.18, 0.56, 0.015, 0.36, idleMat);
      live.box(hx - 0.28, rigY - 0.235, hz - 0.18, 0.56, 0.015, 0.36, liveMat);
    }
  const idleG = new THREE.Group();
  const liveG = new THREE.Group();
  idle.build(idleG, { cast: false, receive: false });
  live.build(liveG, { cast: false, receive: false });
  liveG.visible = false;
  places.add(fx(idleG), fx(liveG));

  /* ----- The trainer's counter: a kiosk with a canopy, a clipboard and a bell on the top ----- */
  const C = COUNTER;
  const CW = C.x1 - C.x0;
  const CD = C.z1 - C.z0;
  b.box(C.x0, S, C.z0, CW, 0.5, CD, WALL);
  b.box(C.x0, S + 0.14, C.z1 - 0.02, CW, 0.18, 0.04, PINK);
  b.box(C.x0 - 0.05, S + 0.5, C.z0 - 0.05, CW + 0.1, 0.06, CD + 0.1, INK);
  for (const x of [C.x0 + 0.1, C.x1 - 0.1]) b.box(x - 0.04, S, C.z0 + 0.06, 0.08, 2.0, 0.08, STEEL);
  b.box(C.x0 - 0.15, S + 2.0, C.z0 - 0.1, CW + 0.3, 0.08, CD + 0.5, PINK);
  b.add(new THREE.BoxGeometry(CW + 0.3, 0.035, 0.035).translate(C.x0 + CW / 2, S + 1.98, C.z1 + 0.4), neon(PAL.cyan, 0.8, 2.6));
  // The clipboard and the bell
  b.box(C.x0 + 0.4, S + 0.56, C.z0 + 0.3, 0.26, 0.012, 0.34, LIGHT);
  b.box(C.x0 + 0.47, S + 0.57, C.z0 + 0.3, 0.12, 0.025, 0.06, STEEL);
  b.add(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12).translate(C.x1 - 0.45, S + 0.57, C.z0 + 0.5), STEEL);
  b.add(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(C.x1 - 0.45, S + 0.58, C.z0 + 0.5), toon(PAL.gold));
  b.add(new THREE.SphereGeometry(0.018, 6, 5).translate(C.x1 - 0.45, S + 0.655, C.z0 + 0.5), INK);
  {
    const p = plane(0.9, 0.22, lit(new THREE.MeshBasicMaterial({ map: plateTexture() }), 0.9, 1.6));
    p.position.set(C.x0 + CW / 2, S + 1.84, C.z1 + 0.41);
    places.add(fx(p));
  }

  /* ----- The bags: the heavy bag on a frame, the speed bag under its platform ----- */
  {
    const { x, z } = BAGS.heavy;
    // The frame runs north-south, its uprights clear of the spawn's line of sight
    const span = FIGHTCLUB_FIX.bagSpan;
    for (const pz of [z - span, z + span]) b.box(x - 0.04, S, pz - 0.04, 0.08, 2.3, 0.08, STEEL);
    b.box(x - 0.04, S + 2.26, z - span - 0.06, 0.08, 0.08, span * 2 + 0.12, STEEL);
    for (const pz of [z - span, z + span]) b.box(x - 0.14, S, pz - 0.14, 0.28, 0.08, 0.28, INK);
    b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 5).translate(x, S + 2.01, z), LIGHT);
    b.add(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 12).translate(x, S + 1.26, z), RED);
    for (const y of [S + 0.78, S + 1.72]) b.add(new THREE.CylinderGeometry(0.21, 0.21, 0.07, 12).translate(x, y, z), INK);
  }
  {
    const { x, z } = BAGS.speed;
    b.box(x - 0.05, S, z - 0.3, 0.1, 2.0, 0.1, STEEL);
    b.box(x - 0.14, S, z - 0.39, 0.28, 0.08, 0.28, INK);
    b.box(x - 0.05, S + 1.76, z - 0.3, 0.1, 0.08, 0.32, STEEL);
    b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20).translate(x, S + 1.73, z), WALL_D);
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6).translate(x, S + 1.66, z), STEEL);
    b.add(new THREE.SphereGeometry(0.11, 10, 8).scale(1, 1.3, 1).translate(x, S + 1.5, z), RED);
  }

  /* ----- The lockers along the west side, a couple ajar; the bench; the water cooler ----- */
  {
    const K = LOCKERS;
    const KW = K.x1 - K.x0;
    const KD = K.z1 - K.z0;
    b.box(K.x0, S, K.z0, KW, 1.9, KD, LOCKER);
    b.box(K.x0 - 0.02, S + 1.9, K.z0 - 0.02, KW + 0.04, 0.06, KD + 0.04, INK);
    b.box(K.x0 - 0.02, S, K.z0 - 0.02, KW + 0.04, 0.1, KD + 0.04, INK);
    const n = Math.round(KD / 0.5);
    for (let k = 0; k < n; k++) {
      const z = K.z0 + k * 0.5 + 0.03;
      if (FIGHTCLUB_FIX.ajar.includes(k)) {
        // Hinged on the door's north edge, swung out into the yard
        const a = FIGHTCLUB_FIX.ajarAngle;
        b.add(place(unitBox, K.x1 + Math.sin(a) * 0.22, S + 0.95, z + Math.cos(a) * 0.22, 0.03, 1.74, 0.44, 0, -a), DOOR);
        b.box(K.x1 - 0.02, S + 0.1, z, 0.025, 1.74, 0.44, toon('#14102a'));
      } else {
        // The door a touch proud of the lockers' front (level with it, the two flicker), the handle and vent proud of the door
        b.box(K.x1 - 0.02, S + 0.1, z, 0.03, 1.74, 0.44, DOOR);
        if (!low) {
          b.box(K.x1, S + 0.95, z + 0.33, 0.025, 0.12, 0.03, LIGHT);
          b.box(K.x1 + 0.005, S + 1.45, z + 0.1, 0.012, 0.03, 0.24, WALL_D);
        }
      }
    }
    const bn = FIGHTCLUB_FIX.bench;
    bench(b, bn.x, bn.z, Math.PI / 2);
    const wc = FIGHTCLUB_FIX.cooler;
    b.box(wc.x - 0.17, S, wc.z - 0.17, 0.34, 0.95, 0.34, LIGHT);
    b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 12).translate(wc.x, S + 1.16, wc.z), toon('#2aabee'));
    b.box(wc.x - 0.03, S + 0.55, wc.z + 0.17, 0.06, 0.08, 0.06, PINK);
  }

  /* ----- The bleachers on the east: three tiers facing the ring, a rail along the back ----- */
  {
    const B = BLEACHERS;
    const tiers = 3;
    const T = (B.x1 - B.x0) / tiers;
    const seatCols = ['#0fb3c6', '#e35bc0', '#7a3fd6'].map((k) => toon(k));
    for (let k = 0; k < tiers; k++) {
      const front = B.x0 + k * T;
      const h = 0.42 + k * 0.36;
      b.box(front, S, B.z0, B.x1 - front, h, B.z1 - B.z0, toon('#3b3658'));
      b.box(front + T - 0.38, S + h, B.z0 + 0.1, 0.34, 0.1, B.z1 - B.z0 - 0.2, seatCols[k]);
    }
    const railH = 0.42 + (tiers - 1) * 0.36 + 0.9;
    b.box(B.x1 - 0.05, S + railH - 0.05, B.z0, 0.06, 0.06, B.z1 - B.z0, LIGHT);
    if (!low) for (let z = B.z0 + 0.1; z < B.z1; z += 1.72) b.box(B.x1 - 0.05, S + railH - 0.9, z, 0.06, 0.9, 0.06, LIGHT);
  }

  /* ----- The sign: a gantry over the yard's front, the FIGHT CLUB cut-out standing on its beam ----- */
  const signY = S + SIGN.h;
  for (const x of FIGHTCLUB_FIX.signPosts) {
    b.box(x - 0.08, S, SIGN.z - 0.08, 0.16, SIGN.h + 0.3, 0.16, STEEL);
    b.box(x - 0.14, S, SIGN.z - 0.14, 0.28, 0.1, 0.28, INK);
    b.box(x - 0.1, signY + 0.3, SIGN.z - 0.1, 0.2, 0.06, 0.2, INK);
  }
  const [sp0, sp1] = FIGHTCLUB_FIX.signPosts;
  b.box(sp0 - 0.1, signY - 0.22, SIGN.z - 0.11, sp1 - sp0 + 0.2, 0.22, 0.22, STEEL);
  b.add(new THREE.BoxGeometry(sp1 - sp0 - 0.4, 0.035, 0.035).translate(SIGN.x, signY - 0.24, SIGN.z), neon(PAL.magenta, 0.8, 2.4));
  const stex = signTexture();
  const signIdle = lit(new THREE.MeshBasicMaterial({ map: stex, transparent: true, depthWrite: false }), 1, 1.8);
  const signLive = lit(new THREE.MeshBasicMaterial({ map: stex, transparent: true, depthWrite: false }), 1.3, 2.3);
  const SH = 0.9;
  const faces = [1, -1].map((side) =>
    new THREE.PlaneGeometry(SIGN.w - 0.4, SH)
      .rotateY(side > 0 ? 0 : Math.PI)
      .translate(SIGN.x, signY + SH / 2 + 0.02, SIGN.z + 0.02 * side)
  );
  const sign = new THREE.Mesh(mergeGeometries(faces, false)!, signIdle);
  sign.matrixAutoUpdate = false;
  occlude(sign, stex);
  places.add(fx(sign));

  b.build(places);

  // Lamps at the yard's front corners, leaning in; the rig's light pooled on the canvas at night (drawn with the lamps' pools)
  addLamp(L.x0 + 0.4, L.z0 + 0.3, -Math.PI / 2);
  addLamp(L.x1 - 0.4, L.z0 + 0.3, -Math.PI / 2);
  addPool(RING.x, RING.z, RW * 1.3, top);

  /* ----- The spot: the pin over the sign, the camera on the ring, the hover ring on the canvas ----- */
  const ring = new THREE.Mesh(new THREE.RingGeometry(RING_HALF - 0.5, RING_HALF - 0.36, 64), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(RING.x, top + 0.014, RING.z);
  places.add(fx(ring));
  const spot: Spot = { id: ID, group: places, focus: V(RING.x, S + 0.8, RING.z), size: 11, pin: V(SIGN.x, signY + 1.6, SIGN.z), ring };

  // The sign breathes faintly at night (never under reduced motion)
  opts.tick(({ t, night }) => {
    if (reduced) return;
    const pulse = night * 0.1 * (0.5 + 0.5 * Math.sin(t * 2.2));
    signIdle.opacity = 1 - pulse;
    signLive.opacity = 1 - pulse * 0.5;
  });

  return {
    group,
    spot,
    setLive(on) {
      idleG.visible = !on;
      liveG.visible = on;
      sign.material = on ? signLive : signIdle;
    },
  };
}
