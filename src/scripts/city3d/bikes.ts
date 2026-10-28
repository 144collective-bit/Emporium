/*
 * Your motorbikes, drawn (vehicle plan Phase 7): a chunk of its own, fetched
 * once the city is up (index.ts hands `createBike` to the garage's stand,
 * garage.ts `BIKE_3D`), so the boot carries only the numbers (mybike.ts).
 *
 * In the cars' cartoon style, +x the front, the origin on the ground under
 * its middle; the fixed parts merged into one vertex-coloured mesh (the paint
 * folded in, mergeMeshes), the lamps' neon with them, then the fork (it
 * steers: the front wheel, its legs or stem, the bars, the headlamp) and the
 * two wheels (they roll): a handful of draw calls a bike.
 *
 * - **Hop Scoot** (scooter): a rounded body under the seat, a floorboard, a
 *   leg shield, a stem up to the bars with the headlamp in its cowl, small
 *   wheels, a top box on the rack.
 * - **Alley Cat** (street bike): a naked frame, the engine block, a tank, a
 *   flat bench and a tail, a round headlamp on the forks, an exhaust down the
 *   right, a swingarm.
 * - **Neon Blade** (sport bike): a full fairing with a screen, twin slim
 *   lamps, a tail hump, clip-ons low, rear-set pegs.
 *
 * The rider is any Degen (createDegen) at the drivers' size, sat with
 * `seat()`: his hips on the seat, leant forward by the bike's `tuck`, his
 * hands on the grips through reachArm() (turned with the bars), his feet on
 * the pegs through reachLeg(); `pose()` puts his left foot down as it stops
 * (bike-sim.ts `footDown()`). The lean is the whole bike's (drive.ts tips
 * its group), rider and all.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { carMaterials, extrude, wheelGeometry, type CarSpec } from './cars';
import { HIP_HEIGHT, reachArm, torsoFrame, type Degen } from './character';
import { mergeMeshes, moving, neon, toon } from './kit';
import { ANKLE_H, reachLeg } from './skeleton';
import { BIKES, type BikeId } from './mybike';

const FRAME = '#2a2838';
const DARK = '#1b1830';
const ENGINE = '#4a485c';
const CHROME = '#dcdaf0';
const GRIP = '#14121f';
const SCREEN = '#5cc8e8';
const TAIL = '#ff2b2b';
const HEAD = '#fff4c2';
/** The riders' size (karts.ts and carinside.ts: Degen at walk mode's scale) */
const S = 0.85;

type V2 = [number, number];
const shape = (pts: V2[]) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const tube = (r: number, len: number) => new THREE.CylinderGeometry(r, r, len, 8);
/** A tube from a to b (in x, y; at z) */
function rod(r: number, a: V2, b: V2, z = 0) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return tube(r, len)
    .rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2)
    .translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
}

/** A wheel seen from both sides (the cars' tyre and rim, mirrored: a bike's wheel shows both faces) */
const wheelGeos = new Map<BikeId, THREE.BufferGeometry>();
function bikeWheel(id: BikeId) {
  let g = wheelGeos.get(id);
  if (!g) {
    const s = BIKES[id];
    const one = wheelGeometry({ r: s.r, tw: s.tw, rim: id === 'scooter' ? '#c9c4e6' : '#2b2a3a', spokes: id === 'sportbike' ? 3 : 5 } as CarSpec);
    g = mergeGeometries([one, one.clone().rotateY(Math.PI)])!;
    wheelGeos.set(id, g);
  }
  return g;
}

export interface Bike {
  group: THREE.Group;
  id: BikeId;
  /** Roll the wheels by a distance and turn the bars (radians, left positive, as the cars' wheels) */
  drive(dist: number, steer?: number): void;
  /** The rider's pose: the bars' turn, and how far his left foot is down (0 on the pegs, 1 on the ground) */
  pose(steer: number, foot: number): void;
  /** Sit a Degen on it (null takes him off) */
  seat(degen: Degen | null): void;
  /** His eyes, in bike space (the helmet camera) */
  eye: THREE.Vector3;
  dispose(): void;
}

export function createBike(id: BikeId, paint: string): Bike {
  const s = BIKES[id];
  const group = moving(new THREE.Group());
  const parts: THREE.Mesh[] = [];
  const fork: THREE.Mesh[] = [];
  const temp: THREE.BufferGeometry[] = [];
  const add = (geo: THREE.BufferGeometry, color: string | THREE.Material, x = 0, y = 0, z = 0, to = parts) => {
    const m = new THREE.Mesh(geo, typeof color === 'string' ? toon(color) : color);
    m.position.set(x, y, z);
    to.push(m);
    temp.push(geo);
    return m;
  };
  const [ra, fa] = s.axles;
  const [sx, sy] = s.seat;
  const [bx, by, bh] = s.bars;
  /** The steering head: where the fork turns */
  const head = new THREE.Vector3(id === 'scooter' ? 0.3 : fa - 0.16, id === 'scooter' ? 0.5 : by - 0.04, 0);
  const tailLamp = neon(TAIL, 0.9, 2);
  const headLamp = neon(HEAD, 0.35, 1.4);

  // The rear wheel's swingarm (or the scooter's engine arm) and the mudguard over it
  add(rod(0.025, [ra, s.r], [sx + 0.12, s.r + 0.08], 0.06), FRAME);
  if (id !== 'scooter') add(rod(0.025, [ra, s.r], [sx + 0.12, s.r + 0.08], -0.06), FRAME);

  if (id === 'scooter') {
    // The rounded body under the seat, the floorboard, the leg shield and the top box
    add(extrude(shape([[-0.66, 0.26], [-0.08, 0.2], [-0.04, 0.42], [-0.3, 0.49], [-0.6, 0.47], [-0.7, 0.36]]), 0.34, 0.05), paint);
    add(box(0.46, 0.04, 0.3), DARK, -0.42 + 0.46 / 2 - 0.02, sy + 0.015, 0);
    add(box(0.4, 0.05, 0.3), DARK, 0.12, 0.17, 0);
    add(extrude(shape([[0.26, 0.15], [0.36, 0.15], [0.33, 0.62], [0.24, 0.6]]), 0.38, 0.03), paint);
    add(box(0.07, 0.03, 0.34), CHROME, -0.62, 0.52, 0);
    add(box(0.24, 0.17, 0.26), DARK, -0.6, 0.62, 0);
    add(box(0.02, 0.05, 0.12), tailLamp, -0.725, 0.4, 0);
    // The stem up to the bars, the cowl with the lamp, the bars and the front mudguard (they steer)
    add(rod(0.03, [fa - 0.04, s.r], [head.x, head.y], 0), FRAME, 0, 0, 0, fork);
    add(rod(0.026, [head.x, head.y], [bx + 0.04, by - 0.03], 0), FRAME, 0, 0, 0, fork);
    add(box(0.14, 0.1, 0.18), paint, bx + 0.06, by - 0.02, 0, fork);
    add(box(0.02, 0.05, 0.08), headLamp, bx + 0.135, by - 0.02, 0, fork);
    add(box(s.r * 1.5, 0.03, s.tw + 0.05), paint, fa, s.r * 2 + 0.03, 0, fork);
  } else {
    // The frame from the head down to the swingarm's pivot, the engine block, the tank, the seat and the tail
    add(rod(0.03, [head.x, head.y], [sx + 0.1, 0.3]), FRAME);
    add(box(0.32, 0.24, 0.24), ENGINE, 0.06, 0.32, 0);
    if (id === 'streetbike') {
      add(extrude(shape([[-0.04, 0.52], [0.36, 0.56], [0.4, 0.66], [0.2, 0.72], [0.0, 0.66]]), 0.3, 0.06), paint);
      add(box(0.42, 0.05, 0.26), DARK, sx - 0.06, sy - 0.01, 0);
      add(extrude(shape([[-0.4, 0.5], [-0.25, 0.52], [-0.25, 0.6], [-0.68, 0.66], [-0.7, 0.6]]), 0.24, 0.04), paint);
      // The exhaust down the right to a can under the tail
      add(rod(0.025, [0.18, 0.2], [-0.2, 0.2], 0.13), CHROME);
      add(rod(0.045, [-0.2, 0.22], [-0.55, 0.32], 0.13), CHROME);
      add(box(0.02, 0.04, 0.12), tailLamp, -0.705, 0.61, 0);
      // The round headlamp on the forks, the forks, the bars on risers, the mudguard
      add(new THREE.CylinderGeometry(0.075, 0.07, 0.08, 14).rotateZ(Math.PI / 2), DARK, head.x + 0.1, head.y - 0.06, 0, fork);
      add(new THREE.CircleGeometry(0.06, 14).rotateY(Math.PI / 2), headLamp, head.x + 0.141, head.y - 0.06, 0, fork);
    } else {
      // The full fairing round the nose and the engine, the screen over the lamps, the tail hump
      add(extrude(shape([[0.8, 0.38], [0.84, 0.5], [0.6, 0.66], [0.38, 0.64], [0.26, 0.5], [0.3, 0.3], [0.58, 0.24]]), 0.3, 0.06), paint);
      add(extrude(shape([[-0.02, 0.24], [0.3, 0.2], [0.3, 0.32], [0.0, 0.34]]), 0.28, 0.04), paint);
      add(extrude(shape([[0.0, 0.58], [0.34, 0.62], [0.3, 0.7], [0.04, 0.68]]), 0.24, 0.05), paint);
      add(box(0.4, 0.05, 0.24), DARK, sx - 0.04, sy - 0.01, 0);
      add(extrude(shape([[-0.32, 0.56], [-0.18, 0.58], [-0.24, 0.66], [-0.74, 0.74], [-0.8, 0.66]]), 0.24, 0.04), paint);
      add(box(0.2, 0.012, 0.18).rotateZ(-0.55), SCREEN, 0.56, 0.71, 0);
      add(box(0.32, 0.06, 0.3), DARK, 0.3, 0.17, 0);
      add(rod(0.04, [-0.3, 0.3], [-0.68, 0.46], 0.11), CHROME);
      add(box(0.02, 0.03, 0.14), tailLamp, -0.805, 0.69, 0);
      for (const z of [-0.07, 0.07]) add(box(0.02, 0.03, 0.08), headLamp, 0.83, 0.5, z);
    }
    // The fork legs to the front axle, the top clamp, the bars back to the grips, the front mudguard
    for (const z of [-0.07, 0.07]) add(rod(0.022, [fa, s.r], [head.x, head.y], z), CHROME, 0, 0, 0, fork);
    add(box(0.06, 0.04, 0.2), FRAME, head.x, head.y + 0.02, 0, fork);
    for (const z of [-1, 1]) add(rod(0.016, [head.x, head.y + 0.03], [bx, by], z * bh * 0.7), FRAME, 0, 0, 0, fork);
    add(box(s.r * 1.2, 0.025, s.tw + 0.04), paint, fa + 0.04, s.r * 2 + 0.02, 0, fork);
  }
  // The bar across and its grips, and the mirrors (they steer)
  add(tube(0.016, bh * 2).rotateX(Math.PI / 2), FRAME, bx, by, 0, fork);
  for (const z of [-1, 1]) {
    add(tube(0.022, 0.09).rotateX(Math.PI / 2), GRIP, bx, by, z * (bh - 0.045), fork);
    add(rod(0.008, [bx, by], [bx + 0.02, by + 0.12], z * (bh - 0.02)), FRAME, 0, 0, 0, fork);
    add(box(0.02, 0.05, 0.07), DARK, bx + 0.02, by + 0.14, z * (bh - 0.02), fork);
  }
  // Footpegs (the street and sport bikes')
  if (id !== 'scooter') for (const z of [-1, 1]) add(tube(0.012, 0.07).rotateX(Math.PI / 2), FRAME, s.pegs[0], s.pegs[1], z * s.pegs[2]);

  const body = mergeMeshes(parts);
  group.add(body);
  // The fork turns about the steering head: its parts merged in its own frame
  const forkPivot = new THREE.Group();
  forkPivot.position.copy(head);
  for (const m of fork) m.position.sub(head);
  const forkMesh = mergeMeshes(fork);
  forkPivot.add(forkMesh);
  group.add(forkPivot);
  for (const g of temp) g.dispose();
  body.traverse((o) => void ((o as THREE.Mesh).isMesh && (o.castShadow = o.receiveShadow = true)));
  forkMesh.traverse((o) => void ((o as THREE.Mesh).isMesh && (o.castShadow = true)));

  // The wheels: the rear on the body, the front in the fork; each rolls about z
  const { detail } = carMaterials();
  const wheelGeo = bikeWheel(id);
  const rear = new THREE.Mesh(wheelGeo, detail);
  rear.position.set(ra, s.r, 0);
  const front = new THREE.Mesh(wheelGeo, detail);
  front.position.set(fa - head.x, s.r - head.y, 0);
  for (const w of [rear, front]) w.castShadow = true;
  group.add(rear);
  forkPivot.add(front);

  /* ---------- The rider ---------- */

  let rider: Degen | null = null;
  let steerNow = 0;
  let footNow = 0;
  const M = new THREE.Matrix4();
  const chest = new THREE.Matrix4();
  const inv = new THREE.Matrix4();
  const grip = new THREE.Vector3();
  const ankle = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const eye = new THREE.Vector3(sx + Math.sin(s.tuck) * 0.467 + 0.04, sy + Math.cos(s.tuck) * 0.467, 0);

  function poseRider() {
    if (!rider) return;
    const p = rider.pose;
    p.bob = p.twist = p.side = p.sway = p.turn = 0;
    p.lean = s.tuck;
    p.headYaw = 0;
    // (his head back up from the tuck, eyes on the road)
    p.headPitch = -s.tuck * 0.6;
    // His feet on the pegs (the hips' space, his own size: x across with his right at -x, y up, z ahead), the left
    // one coming down to the ground as it stops
    for (const [i, l] of p.legs.entries()) {
      const side = i === 0 ? -1 : 1;
      const down = i === 1 ? footNow : 0;
      const out = s.pegs[2] + down * 0.14;
      const y = s.pegs[1] * (1 - down) + 0.04 * down;
      ankle.set((side * out) / S, (y + ANKLE_H * S - sy) / S, (s.pegs[0] + down * 0.08 - sx) / S);
      reachLeg(l, side, ankle, 0);
      l.foot = down * 0.1;
    }
    // His hands on the grips, turned with the bars about the steering head
    const g = rider.g;
    chest.compose(g.position, g.quaternion, g.scale).multiply(torsoFrame(p, M));
    inv.copy(chest).invert();
    for (const i of [0, 1] as const) {
      grip
        .set(bx, by, i === 0 ? bh - 0.05 : -(bh - 0.05))
        .sub(head)
        .applyAxisAngle(up, steerNow)
        .add(head)
        .applyMatrix4(inv);
      reachArm(p, i, grip);
    }
    rider.update();
  }

  let roll = 0;
  return {
    group,
    id,
    eye,
    drive(dist: number, steer = 0) {
      roll -= dist / s.r;
      rear.rotation.z = front.rotation.z = roll;
      // (the bars turn half as far as the cars' wheels: a bike steers by its lean)
      forkPivot.rotation.y = steer * 0.5;
    },
    pose(steer: number, foot: number) {
      const st = steer * 0.5;
      if (Math.abs(st - steerNow) < 1e-3 && Math.abs(foot - footNow) < 1e-3) return;
      steerNow = st;
      footNow = foot;
      poseRider();
    },
    seat(degen: Degen | null) {
      if (rider) {
        rider.g.removeFromParent();
        if (rider.held) rider.held.visible = true;
      }
      rider = degen;
      if (!degen) return;
      const g = degen.g;
      g.rotation.set(0, Math.PI / 2, 0);
      g.scale.setScalar(S);
      g.position.set(sx, sy - HIP_HEIGHT * S + 0.01, 0);
      if (degen.held) degen.held.visible = false;
      group.add(g);
      poseRider();
    },
    dispose() {
      if (rider) {
        rider.g.removeFromParent();
        if (rider.held) rider.held.visible = true;
        rider = null;
      }
      group.removeFromParent();
      body.traverse((o) => void (o as THREE.Mesh).geometry?.dispose());
      forkMesh.traverse((o) => void (o as THREE.Mesh).geometry?.dispose());
    },
  };
}
