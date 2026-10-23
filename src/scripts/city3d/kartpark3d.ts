/*
 * The kart park in 3D, the place (the north side's stage 2, docs/north-plan.md:
 * north of the ring highway now, off Kart Road): what's built at the boot,
 * in the spot's group (what City view lifts on hover, and its far form):
 *
 * - The garages along the pit lane with their numbers and the big screen on
 *   their roof; the kart hut at the pit lane's west end with its viewing
 *   terrace on the roof (a parapet, tables under umbrellas, the stairs up
 *   its west side); the timing tower at the pit lane's east end, its lap
 *   board facing the straight.
 * - The small grandstand in the infield over the straight (canopy, flags,
 *   fans bobbing) and the big covered one north of the hill and the jump
 *   (tiers of seats in the park's colours, the roof on columns at the back
 *   reaching out over the front rows with a neon edge, its people sitting).
 * - The gate's arch on Kart Road with SECTOR 7 KART PARK both ways, and the
 *   ticket kiosk on the plaza inside it.
 * - Its people (kartfacility.ts `KART_PEOPLE`: the banks, the stand, the
 *   terrace, the plaza, the paddock; half on phones), its trees and lamps,
 *   the car park's cars.
 *
 * Everything else round the circuit (the circuit itself, trackside, the
 * paddock, the road and the car park) is kartgrounds3d.ts, loaded as you
 * approach; `KART_VIEW` is how the race's `setCourse()` and `racing()`
 * reach it, whenever it comes.
 */
import * as THREE from 'three';
import type { SpotId } from '../../lib/city';
import { Batch, FONT_DISPLAY, FONT_MONO, PAL, canvasTex, fx, glowMat, lit, neon, neonSign, occlude, place, plane, rng, toon } from './kit';
import { GATE, toWorld } from './kartpark';
import { BAYS, CIRCUIT, HUT_DOOR, SITE, type CourseId } from './kartcircuit';
import { ARCH, GRANDSTAND, KART_LAMPS, KART_PEOPLE, KART_TREES, KIOSK, PARKED, TERRACE, TOWER, tierAt } from './kartfacility';
import { atlasTex, cellNumber, chequerBands, glowText, quad, spacing } from './kartsigns';
import { parkedCars, type CarId } from './cars';
import type { KartPark } from './kart-types';
import type { Idle, Spot } from './landmarks';
import { addLamp, addTree, type Tick } from './world';

/** The place's id (city.ts adds it to SpotId) */
const ID = 'karts' as unknown as SpotId;

/**
 * Which way round the guidance points and whether a race has the pits closed: the race sets it
 * (`setCourse()`, `racing()`), the grounds (kartgrounds3d.ts) show it once they've loaded (`apply`)
 */
export const KART_VIEW: { course: CourseId; racing: boolean; apply: (() => void) | null } = { course: 'circuit', racing: false, apply: null };

const PAVING = 0.025;
const PIT_Y = 0.04;
const INK = toon('#1b1830');
const STEEL = toon('#2b2a40');
const RED = toon('#e23b3b');
const YELLOW = toon('#ffd23f');
const GARAGE_C = toon('#3d4a6b');
const GARAGE_IN = toon('#16142a');
const CONC = toon('#6f6a8f');
const RAIL = toon('#c9c4e6');
const soft = (c: string) => neon(c, 0.5, 1.3);

const HUT_SIGN = 'KART HUT';
const ARCH_SIGN = 'SECTOR 7 KART PARK';
const KIOSK_SIGN = 'TICKETS';
const SCREEN_TITLE = 'KART PARK';
const SCREEN_SUB = 'SECTOR 7 CIRCUIT';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const W = (u: number, v: number) => toWorld([u, v]);

/** The big screen's face */
const screenTex = () =>
  canvasTex(1024, 512, (c, w, h) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff08';
    for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 3);
    chequerBands(c, w, h, 36);
    c.strokeStyle = PAL.cyan;
    c.lineWidth = 6;
    c.strokeRect(14, 34, w - 28, h - 68);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 210px ${FONT_DISPLAY}`;
    spacing(c, 12);
    glowText(c, SCREEN_TITLE, w / 2, 220, PAL.pink, 36);
    c.font = `700 60px ${FONT_MONO}`;
    spacing(c, 10);
    c.fillStyle = PAL.cyan;
    c.fillText(SCREEN_SUB, w / 2, 390);
  });

/** The timing tower's board: the lap and the order, fixed copy (P1 to P8 and their gaps never change) */
const towerTex = () =>
  canvasTex(256, 512, (c, w, h) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, w, h);
    chequerBands(c, w, h, 16);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 46px ${FONT_DISPLAY}`;
    spacing(c, 4);
    glowText(c, 'LAP 3/3', w / 2, 52, PAL.cyan, 16);
    c.font = `700 30px ${FONT_MONO}`;
    spacing(c, 2);
    const gaps = ['LEADER', '+0.4', '+1.1', '+1.9', '+2.6', '+3.8', '+4.4', '+6.0'];
    gaps.forEach((g, k) => {
      const y = 108 + k * 48;
      c.fillStyle = k === 0 ? PAL.pink : '#ffffff';
      c.textAlign = 'left';
      c.fillText(`P${k + 1}`, 22, y);
      c.textAlign = 'right';
      c.fillStyle = k === 0 ? PAL.pink : PAL.cyan;
      c.fillText(g, w - 22, y);
    });
  });

export function buildKartPark(scene: THREE.Scene, crowd: Idle[], opts: { tick: (f: Tick) => void; reduced: boolean; low: boolean }): KartPark {
  const { low, reduced } = opts;
  const r = rng(4747);
  const group = new THREE.Group();
  group.name = 'kartpark';
  scene.add(group);
  /** The buildings and the stands: the spot's group, lifted on hover */
  const places = new THREE.Group();
  places.name = ID;
  group.add(places);
  const pb = new Batch();
  const c = CIRCUIT;
  const n = c.x.length;
  const flat = (batch: Batch, x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material) =>
    batch.add(place(new THREE.PlaneGeometry(x1 - x0, z1 - z0), (x0 + x1) / 2, y, (z0 + z1) / 2, 1, 1, 1, -Math.PI / 2), mat);

  /* ----- The garages, the big screen on their roof (in the spot's group) ----- */

  const [gx0, gz0] = W(SITE.garages.u0, SITE.garages.v0);
  const [gx1, gz1] = W(SITE.garages.u1, SITE.garages.v1);
  const GH = SITE.garages.h;
  {
    const depth = gz1 - gz0;
    // The back block, the roof over the open fronts, the dividing walls, a dark floor in each bay
    pb.box(gx0, -0.3, gz0 + depth * 0.55, gx1 - gx0, GH + 0.3, depth * 0.45, GARAGE_C);
    pb.box(gx0 - 0.15, GH, gz0 - 0.15, gx1 - gx0 + 0.3, 0.22, depth + 0.3, toon('#25223a'));
    pb.box(gx0 - 0.16, GH + 0.22, gz0 - 0.16, gx1 - gx0 + 0.32, 0.05, 0.05, soft(PAL.pink));
    const bays = BAYS.length;
    const bw = (gx1 - gx0) / bays;
    for (let k = 0; k <= bays; k++) pb.box(gx0 + k * bw - 0.12, 0, gz0, 0.24, GH, depth * 0.55, GARAGE_C);
    for (let k = 0; k < bays; k++) {
      flat(pb, gx0 + k * bw + 0.12, gz0, gx0 + (k + 1) * bw - 0.12, gz0 + depth * 0.55, PAVING + 0.004, GARAGE_IN);
      // A strip light at the back of each bay, a tool chest
      pb.box(gx0 + k * bw + 0.5, GH - 0.5, gz0 + depth * 0.55 - 0.06, bw - 1, 0.08, 0.05, soft(PAL.warm));
      pb.box(gx0 + k * bw + 0.4, 0, gz0 + depth * 0.55 - 0.55, 0.7, 0.8, 0.45, k % 2 ? RED : toon('#2aabee'));
    }
    // The bays' numbers over the fronts (the atlas' corner numbers, facing the pit lane)
    const nb = new Batch();
    const nm = lit(new THREE.MeshBasicMaterial({ map: atlasTex(), alphaTest: 0.5 }), 0.95, 1.2);
    for (let k = 0; k < bays; k++) nb.add(quad(gx0 + (k + 0.5) * bw, GH - 0.45, gz0 - 0.02, -1, 0, 0.7, 0.7, cellNumber(k + 1), false), nm);
    nb.build(places, { cast: false, receive: false });
    // The big screen on the roof, facing north over the straight
    const [cx] = W(SITE.screen.u, SITE.screen.v);
    const SW = SITE.screen.w;
    const SH = SITE.screen.h;
    const cz = gz0 + depth * 0.5;
    const base = GH + 0.6;
    for (const px of [cx - SW / 2 + 0.6, cx + SW / 2 - 0.6]) pb.box(px - 0.12, GH, cz - 0.12, 0.24, 0.8, 0.24, STEEL);
    pb.box(cx - SW / 2, base, cz - 0.3, SW, SH, 0.6, toon('#1b1830'));
    pb.box(cx - SW / 2 - 0.05, base - 0.05, cz - 0.35, SW + 0.1, 0.1, 0.7, STEEL);
    pb.box(cx - SW / 2 - 0.05, base + SH - 0.05, cz - 0.35, SW + 0.1, 0.1, 0.7, STEEL);
    const face = plane(SW - 0.2, SH - 0.2, lit(new THREE.MeshBasicMaterial({ map: screenTex() }), 0.9, 1.25));
    face.position.set(cx, base + SH / 2, cz - 0.31);
    face.rotation.y = Math.PI;
    places.add(fx(face));
  }

  /* ----- The hut, its terrace on the roof and the stairs up to it ----- */

  const [hx0, hz0] = W(SITE.hut.u0, SITE.hut.v0);
  const [hx1, hz1] = W(SITE.hut.u1, SITE.hut.v1);
  const HUT_H = SITE.hut.h;
  {
    pb.box(hx0, -0.3, hz0, hx1 - hx0, HUT_H + 0.3, hz1 - hz0, toon('#3d4a6b'));
    pb.box(hx0 - 0.12, HUT_H, hz0 - 0.12, hx1 - hx0 + 0.24, 0.16, hz1 - hz0 + 0.24, toon('#25223a'));
    for (const z of [hz0 - 0.13, hz1 + 0.08]) pb.box(hx0 - 0.13, HUT_H + 0.16, z, hx1 - hx0 + 0.26, 0.05, 0.05, soft(PAL.pink));
    pb.box(hx0 - 0.02, 2.08, hz0 - 0.02, hx1 - hx0 + 0.04, 0.2, hz1 - hz0 + 0.04, toon('#e219e5'));
    // The door on the south side (HUT_DOOR is where you stand, just outside it), a lit window beside it, a shutter on the north side to the pits
    const dx = HUT_DOOR.x;
    pb.box(dx - 0.42, 0, hz1 - 0.03, 0.84, 1.6, 0.06, toon('#14102a'));
    pb.box(dx - 0.34, 0.7, hz1 + 0.02, 0.68, 0.5, 0.02, soft(PAL.warm));
    pb.box(dx - 0.5, 1.6, hz1 - 0.05, 1.0, 0.08, 0.3, INK);
    pb.box(dx + 1.4, 1.0, hz1 - 0.02, 1.6, 0.8, 0.05, soft(PAL.warm));
    for (let k = 0; k < 9; k++) pb.box(hx0 + 2, 0.75 + k * 0.13, hz0 - 0.03, 3, 0.12, 0.05, k % 2 ? toon('#8a86a8') : toon('#6f6a8f'));
    pb.box(hx0 + 1.95, 0.68, hz0 - 0.04, 3.1, 0.08, 0.07, YELLOW);
    // The signs: over the door, and over the shutter facing the pits
    const tex = neonSign(HUT_SIGN, PAL.pink, { board: null, w: 1024, h: 256, size: 180, tracking: 14 });
    for (const [x, z, ry] of [
      [dx, hz1 + 0.04, 0],
      [hx0 + 3.5, hz0 - 0.04, Math.PI],
    ] as const) {
      const sign = plane(2.6, 0.65, lit(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), 1, 1.7));
      sign.position.set(x, 2.74, z);
      sign.rotation.y = ry;
      occlude(sign, tex);
      places.add(fx(sign));
    }
    // Tyres stacked and two drums against the hut's west wall
    for (let k = 0; k < 4; k++) pb.add(new THREE.CylinderGeometry(0.28, 0.28, 0.17, 12).translate(hx0 - 0.4, 0.09 + k * 0.18, hz1 - 1.0), toon('#17151f'));
    pb.add(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12).translate(hx0 - 0.4, 0.28, hz1 - 1.8), toon('#2aabee'));
    pb.add(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12).translate(hx0 - 0.4, 0.28, hz1 - 2.3), RED);
  }
  {
    // The terrace: a parapet round the roof's edge with a rail on posts, tables under umbrellas
    const T = TERRACE.y + 0.16;
    for (const [x0, z0, x1, z1] of [
      [hx0, hz0, hx1, hz0 + 0.12],
      [hx0, hz1 - 0.12, hx1, hz1],
      [hx1 - 0.12, hz0, hx1, hz1],
      [hx0, hz0, hx0 + 0.12, hz1 - 1.6],
    ] as const) {
      pb.box(x0, T, z0, x1 - x0, 0.4, z1 - z0, CONC);
      pb.box(x0, T + 1.0, z0, x1 - x0, 0.05, z1 - z0, RAIL);
    }
    for (let x = hx0 + 0.06; x < hx1; x += 1.2) for (const z of [hz0 + 0.06, hz1 - 0.06]) pb.box(x - 0.025, T + 0.4, z - 0.025, 0.05, 0.6, 0.05, RAIL);
    const umbrellas = [PAL.cyan, PAL.pink, PAL.violet].map((k) => toon(k));
    for (let k = 0; k < 3; k++) {
      const x = hx0 + 1.8 + k * 2.4;
      const z = (hz0 + hz1) / 2 + 0.6;
      pb.add(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 10).translate(x, T + 0.72, z), toon('#e8e6f0'));
      pb.box(x - 0.03, T, z - 0.03, 0.06, 2.0, 0.06, INK);
      pb.add(new THREE.ConeGeometry(1.0, 0.4, 8).translate(x, T + 2.1, z), umbrellas[k]);
    }
    // The stairs up the west side, from the south (the plaza) to the roof's open corner
    const [sx0, sz0] = W(TERRACE.stairs.u0, TERRACE.stairs.v0);
    const [sx1, sz1] = W(TERRACE.stairs.u1, TERRACE.stairs.v1);
    const steps = 12;
    const tread = (sz1 - sz0) / steps;
    for (let k = 0; k < steps; k++) pb.box(sx0, 0, sz1 - (k + 1) * tread, sx1 - sx0, (T * (k + 1)) / steps, tread, CONC);
    for (const x of [sx0 - 0.04, sx1 - 0.02]) {
      const a = V(x + 0.03, 1.0, sz1);
      const b2 = V(x + 0.03, T + 1.0, sz0);
      const dir = b2.clone().sub(a);
      const g = new THREE.BoxGeometry(0.05, 0.05, dir.length());
      g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b2).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize()), _s));
      pb.add(g, RAIL);
    }
  }

  /* ----- The timing tower at the pit lane's east end ----- */

  {
    const [tx0, tz0] = W(TOWER.u0, TOWER.v0);
    const [tx1, tz1] = W(TOWER.u1, TOWER.v1);
    const H = TOWER.h;
    pb.box(tx0, 0, tz0, tx1 - tx0, H - 2.6, tz1 - tz0, GARAGE_C);
    // The board's housing up top, wider than the shaft, a neon edge round it, a roof
    pb.box(tx0 - 0.3, H - 2.6, tz0 - 0.3, tx1 - tx0 + 0.6, 2.4, tz1 - tz0 + 0.6, toon('#25223a'));
    pb.box(tx0 - 0.4, H - 0.2, tz0 - 0.4, tx1 - tx0 + 0.8, 0.2, tz1 - tz0 + 0.8, STEEL);
    for (const y of [H - 2.62, H - 0.24]) pb.box(tx0 - 0.32, y, tz0 - 0.32, tx1 - tx0 + 0.64, 0.05, 0.05, soft(PAL.pink));
    pb.box(tx0 - 0.32, H - 2.62, tz0 - 0.32, 0.05, 2.4, 0.05, soft(PAL.pink));
    pb.box(tx1 + 0.27, H - 2.62, tz0 - 0.32, 0.05, 2.4, 0.05, soft(PAL.pink));
    // A door and narrow lit windows down the shaft
    pb.box((tx0 + tx1) / 2 - 0.4, 0, tz1 - 0.02, 0.8, 1.6, 0.06, toon('#14102a'));
    for (let y = 2.2; y < H - 3; y += 1.1) pb.box((tx0 + tx1) / 2 - 0.15, y, tz0 - 0.03, 0.3, 0.6, 0.05, soft(PAL.warm));
    const board = plane(tx1 - tx0 + 0.3, 2.1, lit(new THREE.MeshBasicMaterial({ map: towerTex() }), 0.9, 1.2));
    board.position.set((tx0 + tx1) / 2, H - 1.4, tz0 - 0.32);
    board.rotation.y = Math.PI;
    places.add(fx(board));
  }

  /* ----- The grandstand in the infield, facing south over the straight (in the spot's group) ----- */

  const seatCols = ['#0fb3c6', '#e35bc0', '#7a3fd6', '#2d7bff'].map((k) => toon(k));
  const fanSpots: { x: number; y: number; z: number }[] = [];
  const [sx0, sz0] = W(SITE.stand.u0, SITE.stand.v0);
  const [sx1, sz1] = W(SITE.stand.u1, SITE.stand.v1);
  {
    // Tiers rising to the north (the front is the south edge), as many as its depth holds, seats along each tread, fans in them
    const COUNT = Math.max(3, Math.min(5, Math.floor((sz1 - sz0) / 0.9)));
    const TIER = (sz1 - sz0) / COUNT;
    const RISE = Math.min(0.85, TIER * 0.75);
    const perTier = Math.round(((sx1 - sx0) / 42) * (low ? 10 : 30));
    /** The canopy over the top tier, with head room for a fan standing there */
    const ROOF = 0.5 + (COUNT - 1) * RISE + 1.7;
    for (let k = 0; k < COUNT; k++) {
      const h = 0.5 + k * RISE;
      const front = sz1 - k * TIER;
      pb.box(sx0, -0.3, sz0, sx1 - sx0, h + 0.3, front - sz0, toon('#3b3658'));
      const back = front - TIER;
      pb.box(sx0 + 0.1, h, back + 0.04, sx1 - sx0 - 0.2, 0.28, 0.34, seatCols[k % seatCols.length]);
      for (let j = 0; j < perTier; j++) {
        const x = sx0 + 0.6 + ((sx1 - sx0 - 1.2) * (j + 0.5)) / perTier + (r() - 0.5) * 0.25;
        if (r() < 0.12) continue;
        fanSpots.push({ x, y: h + 0.58, z: back + 0.24 });
      }
    }
    // The back wall, posts and a canopy over it all, a neon edge on the canopy's front
    pb.box(sx0 - 0.1, 0, sz0 - 0.12, sx1 - sx0 + 0.2, ROOF - 1, 0.12, toon('#2b2550'));
    for (const px of [sx0 + 0.1, (sx0 + sx1) / 2, sx1 - 0.1]) for (const pz of [sz0 + 0.05]) pb.box(px - 0.07, 0, pz - 0.07, 0.14, ROOF, 0.14, STEEL);
    pb.box(sx0 - 0.4, ROOF, sz0 - 0.4, sx1 - sx0 + 0.8, 0.14, sz1 - sz0 - 0.6, toon('#2b2550'));
    pb.box(sx0 - 0.39, ROOF + 0.02, sz1 - 1.04, sx1 - sx0 + 0.78, 0.1, 0.05, soft(PAL.cyan));
    // Flags at the ends (PulseChain colours, no logos)
    for (const [px, col, col2] of [
      [sx0 - 0.8, PAL.cyan, PAL.violet],
      [sx1 + 0.8, PAL.pink, PAL.blue],
    ] as const) {
      const pz = sz0 + 0.6;
      const top = ROOF + 0.8;
      pb.add(new THREE.CylinderGeometry(0.04, 0.05, top, 6).translate(px, top / 2, pz), INK);
      pb.add(new THREE.SphereGeometry(0.08, 6, 5).translate(px, top + 0.02, pz), toon(PAL.gold));
      pb.box(px - 0.015, top - 0.7, pz + 0.04, 0.03, 0.5, 0.9, toon(col));
      pb.box(px - 0.015, top - 1.4, pz + 0.04, 0.03, 0.4, 0.7, toon(col2));
    }
  }
  const fans = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.16, 0.28, 2, 8), toon('#ffffff', { name: 'fans' }), fanSpots.length);
  {
    const cols = [PAL.violet, PAL.cyan, PAL.pink, '#f2c94c', '#2aabee', '#e8e6f0'].map((k) => new THREE.Color(k));
    fanSpots.forEach((_, i) => fans.setColorAt(i, cols[Math.floor(r() * cols.length)]));
    fans.castShadow = true;
    fans.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    places.add(fans);
  }
  const fanPhase = fanSpots.map(() => r() * 6.28);
  const paintFans = (t: number) => {
    fanSpots.forEach((f, i) => {
      const bob = reduced ? 0 : Math.max(0, Math.sin(t * 2.6 + fanPhase[i])) * 0.07;
      fans.setMatrixAt(i, _m.compose(_p.set(f.x, f.y + bob, f.z), _q, _s));
    });
    fans.instanceMatrix.needsUpdate = true;
  };
  paintFans(0);
  fans.computeBoundingSphere();


  /* ----- The covered grandstand north of the hill and the jump ----- */

  {
    const G = GRANDSTAND;
    const [gx0, gz0] = W(G.u0, G.v0);
    const [gx1, gz1] = W(G.u1, G.v1);
    // The tiers stepping up to the north from its front, a band of seat colour along each
    for (let k = 0; k < G.tiers; k++) {
      const t = tierAt(k);
      const [, front] = W(0, G.v1 - k * t.depth);
      pb.box(gx0, 0, gz0, gx1 - gx0, t.y - 0.05, front - gz0, toon('#3b3658'));
      pb.box(gx0 + 0.1, t.y - 0.05, front - t.depth + 0.04, gx1 - gx0 - 0.2, 0.08, t.depth * 0.45, seatCols[k % seatCols.length]);
    }
    // Side walls, the back wall up to the roof, columns along the back and the roof reaching over the front
    const top = tierAt(G.tiers - 1).y;
    for (const x of [gx0 - 0.25, gx1]) {
      const wall = new THREE.Shape([new THREE.Vector2(gz0, 0), new THREE.Vector2(gz0, top + 1.2), new THREE.Vector2(gz1, 0.9), new THREE.Vector2(gz1, 0)]);
      pb.add(new THREE.ExtrudeGeometry(wall, { depth: 0.25, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(x + 0.25, 0, 0), toon('#2b2550'));
    }
    pb.box(gx0, 0, gz0 - 0.2, gx1 - gx0, G.roof, 0.2, toon('#2b2550'));
    for (let x = gx0 + 0.2; x <= gx1; x += (gx1 - gx0 - 0.4) / 6) pb.box(x - 0.12, 0, gz0 - 0.4, 0.24, G.roof, 0.24, STEEL);
    // The roof: a deep slab sloping gently up towards the front, braced from the columns
    const reach = gz1 - gz0 + 1.2;
    const roof = new THREE.BoxGeometry(gx1 - gx0 + 1, 0.22, reach).translate(0, 0, reach / 2).rotateX(-0.08).translate((gx0 + gx1) / 2, G.roof, gz0 - 0.5);
    pb.add(roof, toon('#25223a'));
    const edgeZ = gz0 - 0.5 + reach * Math.cos(0.08);
    const edgeY = G.roof + reach * Math.sin(0.08);
    pb.box(gx0 - 0.5, edgeY - 0.18, edgeZ - 0.04, gx1 - gx0 + 1, 0.06, 0.06, soft(PAL.cyan));
    for (let x = gx0 + 0.2; x <= gx1; x += (gx1 - gx0 - 0.4) / 6) {
      const a = V(x, G.roof - 2.2, gz0 - 0.3);
      const b2 = V(x, G.roof + 0.1, gz0 + reach * 0.55);
      const dir = b2.clone().sub(a);
      const geo = new THREE.BoxGeometry(0.1, 0.1, dir.length());
      geo.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b2).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize()), _s));
      pb.add(geo, STEEL);
    }
    // Its name along the roof's front, lit, facing the circuit
    const tex = neonSign('GRANDSTAND', PAL.cyan, { board: null, w: 1024, h: 256, size: 170, tracking: 18 });
    const sign = plane(7, 1.75, lit(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), 1, 1.6));
    sign.position.set((gx0 + gx1) / 2, edgeY + 0.95, edgeZ - 0.4);
    occlude(sign, tex);
    places.add(fx(sign));
  }

  /* ----- The gate's arch on Kart Road, the ticket kiosk on the plaza ----- */

  {
    const H = ARCH.h;
    const pw = ARCH.post;
    const xs = [GATE.x0 - 0.3, GATE.x1 + 0.3];
    for (const x of xs) {
      pb.box(x - pw / 2, 0, GATE.z - pw / 2, pw, H, pw, STEEL);
      pb.box(x - pw / 2 - 0.1, 0, GATE.z - pw / 2 - 0.1, pw + 0.2, 0.3, pw + 0.2, CONC);
      pb.box(x - pw / 2 - 0.02, 0.6, GATE.z - pw / 2 - 0.02, pw + 0.04, H - 1.2, 0.04, soft(PAL.cyan));
    }
    const span = xs[1] - xs[0] + 1.6;
    const cx = (xs[0] + xs[1]) / 2;
    pb.box(cx - span / 2, H, GATE.z - 0.35, span, 1.3, 0.7, toon('#16142a'));
    pb.box(cx - span / 2, H - 0.06, GATE.z - 0.37, span, 0.06, 0.74, soft(PAL.pink));
    pb.box(cx - span / 2, H + 1.3, GATE.z - 0.37, span, 0.06, 0.74, soft(PAL.pink));
    // Chequered caps on the posts
    for (const x of xs) for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) pb.box(x - pw / 2 + k * (pw / 2), H + 1.36, GATE.z - pw / 2 + j * (pw / 2), pw / 2, 0.14, pw / 2, (k + j) % 2 ? INK : toon('#e8e6f0'));
    const tex = neonSign(ARCH_SIGN, PAL.cyan, { board: null, w: 1024, h: 160, size: 104, tracking: 10 });
    const smat = lit(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), 1, 1.8);
    for (const [dz, ry] of [
      [0.37, 0],
      [-0.37, Math.PI],
    ] as const) {
      const sign = plane(span - 0.4, (span - 0.4) * (160 / 1024), smat);
      sign.position.set(cx, H + 0.65, GATE.z + dz + Math.sign(dz) * 0.01);
      sign.rotation.y = ry;
      occlude(sign, tex);
      places.add(fx(sign));
    }
    // The kiosk: a little booth, a window and its counter on the west side towards the gate's path, a canopy, its sign
    const [kx0, kz0] = W(KIOSK.u0, KIOSK.v0);
    const [kx1, kz1] = W(KIOSK.u1, KIOSK.v1);
    pb.box(kx0, 0, kz0, kx1 - kx0, KIOSK.h, kz1 - kz0, toon('#3d4a6b'));
    pb.box(kx0 - 0.03, 1.0, kz0 + 0.5, 0.05, 0.9, kz1 - kz0 - 1, soft(PAL.warm));
    pb.box(kx0 - 0.3, 0.95, kz0 + 0.4, 0.3, 0.06, kz1 - kz0 - 0.8, toon('#e8e6f0'));
    pb.box(kx0 - 0.8, KIOSK.h, kz0 - 0.3, kx1 - kx0 + 1.1, 0.12, kz1 - kz0 + 0.6, toon('#e219e5'));
    const ktex = neonSign(KIOSK_SIGN, PAL.warm, { board: null, w: 512, h: 128, size: 92, tracking: 10 });
    const ks = plane(1.8, 0.45, lit(new THREE.MeshBasicMaterial({ map: ktex, transparent: true, depthWrite: false }), 1, 1.6));
    ks.position.set(kx0 - 0.04, KIOSK.h + 0.45, (kz0 + kz1) / 2);
    ks.rotation.y = -Math.PI / 2;
    occlude(ks, ktex);
    places.add(fx(ks));
  }

  pb.build(places);

  /* ----- Its people, trees, lamps and the car park's cars ----- */

  for (const p of KART_PEOPLE) if (!(low && p.trim)) crowd.push({ x: p.x, z: p.z, y: p.y, ry: p.ry, act: p.act });
  for (const [x, z, s, pine] of KART_TREES) if (!low || r() < 0.6) addTree(x, z, s, pine, 0);
  for (const [x, z, ry, y] of KART_LAMPS) addLamp(x, z, ry, y);
  parkedCars(scene, 0.04, PARKED as [CarId, number, number, number, string][]);

  /* ----- The spot ----- */

  let bx0 = Infinity;
  let bx1 = -Infinity;
  let bz0 = Infinity;
  let bz1 = -Infinity;
  for (let i = 0; i < n; i++) {
    bx0 = Math.min(bx0, c.x[i]);
    bx1 = Math.max(bx1, c.x[i]);
    bz0 = Math.min(bz0, c.z[i]);
    bz1 = Math.max(bz1, c.z[i]);
  }
  const focus = V((bx0 + bx1) / 2, 0, (bz0 + bz1) / 2);
  const pin = V((hx0 + hx1) / 2, HUT_H + 2.6, (hz0 + hz1) / 2);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.64, 48), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(HUT_DOOR.x, PAVING + 0.014, HUT_DOOR.z);
  group.add(fx(ring));
  const spot: Spot = { id: ID, group: places, focus, size: 110, pin, ring };
  // The show kart waits in the middle bay, nose to the pit lane (kart.ts: yaw π/2 faces -z)
  const [bayX, bayZ] = BAYS[3];
  const showSpot = { x: bayX, y: PAVING + PIT_Y, z: bayZ + 0.45, yaw: Math.PI / 2 };

  opts.tick(({ t }) => {
    if (reduced) return;
    paintFans(t);
  });

  return {
    group,
    spot,
    setCourse(id) {
      KART_VIEW.course = id;
      KART_VIEW.apply?.();
    },
    racing(on) {
      KART_VIEW.racing = on;
      KART_VIEW.apply?.();
    },
    showSpot,
  };
}
