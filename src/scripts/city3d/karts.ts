/*
 * The go-karts, in Degen's cartoon style: a low tubular frame on a floor pan,
 * side pods, a bucket seat, a steering wheel on its column, a rear engine box
 * with an exhaust, a nose cone with a number roundel, a rear wing or a roll
 * hoop, four fat wheels that steer and roll, and a rear light. Each model in
 * KART_SPECS (mykart.ts) has its own silhouette: the Pocket Rocket is the
 * plain racer with a wing, the Big Wheel sits high on fat tyres with a big
 * motor and an air filter under a roll hoop, the Zip is tiny and low with a
 * fin, and the Tank Kart wears armour plates, a bull bar and a hoop.
 *
 * Like the cars (cars.ts) a kart points +x with its origin on the ground
 * under its middle, about KART_L long and KART_W wide (kartpark.ts). The
 * fixed parts are merged into one vertex-coloured mesh (the paint folded in
 * with the rest through mergeMeshes), plus the neon rear light, the number
 * roundel, the steering wheel (it turns) and the four wheels: about eight
 * draw calls a kart. The driver is any Degen (createDegen in character.ts),
 * sat with `seat()`: hips on the seat, knees bent forward, both hands on the
 * wheel through reachArm(); `lean()` tips him into drifts and `look()` turns
 * his head. kartSilhouette() draws the side view for the hut's cards.
 */
import * as THREE from 'three';
import { carMaterials, wheelGeometry, type CarSpec } from './cars';
import { HIP_HEIGHT, reachArm, torsoFrame, type Degen } from './character';
import { FONT_DISPLAY, liveTex, mergeMeshes, neon, PAL, toon } from './kit';
import { KART_L } from './kartpark';
import type { KartId } from './mykart';

/* ---------- Colours ---------- */

const FRAME = '#2a2838';
const RIM = '#c9c4e6';
const SEAT = '#1b1830';
const ENGINE = '#4a485c';
const CHROME = '#dcdaf0';
const WHEEL = '#16141f';
const ARMOUR = '#4e5160';
const PAD = '#3a3848';
const TAIL = '#ff2b2b';

/** The driver's size in the kart (walk.ts draws the player at this scale too) */
export const DRIVER_SCALE = 0.85;

/* ---------- Shapes ---------- */

type V2 = [number, number];
interface Shape {
  /** Wheel radius and tyre width; rear and front axle (x); the wheels' half track (z) */
  r: number;
  tw: number;
  axles: V2;
  track: number;
  /** The floor pan's underside, and the seat cushion's top */
  floor: number;
  seat: number;
  /** The side pods: x range, height and how far out they reach (z) */
  pod: { x0: number; x1: number; h: number; z: number };
  /** The engine box (w, h, d) and whether it carries a big air filter */
  engine: [number, number, number];
  filter?: boolean;
  /** What's behind the seat */
  rear: 'wing' | 'hoop' | 'fin';
  armour?: boolean;
  bullbar?: boolean;
  /** How long the nose is */
  nose: number;
}
const SHAPES: Record<KartId, Shape> = {
  rocket: { r: 0.14, tw: 0.15, axles: [-0.4, 0.42], track: 0.4, floor: 0.07, seat: 0.24, pod: { x0: -0.28, x1: 0.22, h: 0.15, z: 0.36 }, engine: [0.22, 0.2, 0.26], rear: 'wing', nose: 0.3 },
  bigwheel: { r: 0.19, tw: 0.21, axles: [-0.38, 0.4], track: 0.37, floor: 0.11, seat: 0.3, pod: { x0: -0.26, x1: 0.2, h: 0.16, z: 0.3 }, engine: [0.28, 0.26, 0.3], filter: true, rear: 'hoop', nose: 0.26 },
  zip: { r: 0.11, tw: 0.12, axles: [-0.38, 0.4], track: 0.4, floor: 0.05, seat: 0.19, pod: { x0: -0.26, x1: 0.24, h: 0.1, z: 0.34 }, engine: [0.18, 0.16, 0.22], rear: 'fin', nose: 0.34 },
  tank: { r: 0.15, tw: 0.17, axles: [-0.4, 0.4], track: 0.39, floor: 0.08, seat: 0.25, pod: { x0: -0.3, x1: 0.22, h: 0.18, z: 0.34 }, engine: [0.24, 0.22, 0.28], rear: 'hoop', armour: true, bullbar: true, nose: 0.28 },
};
const HALF = KART_L / 2;

/* ---------- The number roundel ---------- */

const plateMats = new Map<number, THREE.MeshBasicMaterial>();
function plateMat(n: number) {
  let m = plateMats.get(n);
  if (m) return m;
  const map = liveTex(64, 64, (c) => {
    c.clearRect(0, 0, 64, 64);
    c.fillStyle = '#f3f2f7';
    c.strokeStyle = PAL.ink;
    c.lineWidth = 5;
    c.beginPath();
    c.arc(32, 32, 27, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = PAL.ink;
    c.font = `700 40px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(n), 32, 35);
  });
  m = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5, toneMapped: false });
  plateMats.set(n, m);
  return m;
}

/** A wheel: the cars' tyre and rim, at the kart's size (wheelGeometry reads only r, tw, rim and spokes) */
const wheelGeos = new Map<KartId, THREE.BufferGeometry>();
function kartWheel(id: KartId) {
  let g = wheelGeos.get(id);
  if (!g) {
    const s = SHAPES[id];
    g = wheelGeometry({ r: s.r, tw: s.tw, rim: RIM, spokes: 4 } as CarSpec);
    wheelGeos.set(id, g);
  }
  return g;
}

/* ---------- One kart ---------- */

export interface Kart {
  group: THREE.Group;
  id: KartId;
  /** Where the exhaust pipes end (kart space), for boost flames */
  exhausts: [number, number, number][];
  /** The seat's top (kart space): where the driver's hips go */
  seatAt: THREE.Vector3;
  /** Roll the wheels by a distance travelled and steer the front ones (radians, left positive) */
  drive(dist: number, steer?: number): void;
  /** The number on the nose (1-8) */
  setNumber(n: number): void;
  /** Sit a Degen in it (hands on the wheel); null takes the driver out */
  seat(degen: Degen | null): void;
  /** Tip the driver sideways into a drift (-1 left .. 1 right) */
  lean(amount: number): void;
  /** Turn the driver's head (radians, left positive) */
  look(yaw: number): void;
  dispose(): void;
}

export function createKart(id: KartId, paint: string, opts: { detail?: 0 | 1 | 2 } = {}): Kart {
  const s = SHAPES[id];
  const detail = opts.detail ?? 2;
  const group = new THREE.Group();
  const parts: THREE.Mesh[] = [];
  const temp: THREE.BufferGeometry[] = [];
  const add = (geo: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, toon(color));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    parts.push(m);
    temp.push(geo);
    return m;
  };
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const tube = (r: number, len: number, seg = 8) => new THREE.CylinderGeometry(r, r, len, seg);
  const [ra, fa] = s.axles;
  const floorY = s.floor;

  // The frame: two side rails and three cross tubes, on a floor pan
  const railLen = fa - ra + 0.5;
  for (const z of [-0.2, 0.2]) add(tube(0.022, railLen), FRAME, (fa + ra) / 2 + 0.05, floorY + 0.03, z, 0, 0, Math.PI / 2);
  for (const x of [ra, (ra + fa) / 2 + 0.05, fa]) add(tube(0.02, s.track * 2 - s.tw), FRAME, x, floorY + 0.03, 0, Math.PI / 2);
  add(box(0.72, 0.03, 0.42), PAD, 0.05, floorY + 0.015, 0);
  // Side pods (the paint), with a dark lip along the bottom
  for (const side of [-1, 1]) {
    const pw = s.pod.z - 0.21;
    add(box(s.pod.x1 - s.pod.x0, s.pod.h, pw), paint, (s.pod.x0 + s.pod.x1) / 2, floorY + s.pod.h / 2, side * (0.21 + pw / 2));
    if (detail > 0) add(box(s.pod.x1 - s.pod.x0, 0.03, pw + 0.02), FRAME, (s.pod.x0 + s.pod.x1) / 2, floorY + 0.015, side * (0.21 + pw / 2));
  }
  // The nose cone: a flattened four-sided taper, the paint, over a dark bumper
  const noseX0 = fa + 0.08;
  const nose = new THREE.CylinderGeometry(0.07, 0.2, s.nose, 4).rotateY(Math.PI / 4).rotateZ(-Math.PI / 2).scale(1, 0.55, 1.2);
  add(nose, paint, noseX0 + s.nose / 2, floorY + 0.1, 0);
  add(box(0.06, 0.05, 0.3), FRAME, noseX0 + s.nose + 0.01, floorY + 0.06, 0);
  // The bucket seat: a cushion and a back leaning back, with the paint's trim down its sides
  const seatX = -0.1;
  const seatTop = s.seat;
  add(box(0.3, 0.06, 0.34), SEAT, seatX, seatTop - 0.03, 0);
  add(box(0.06, 0.38, 0.34), SEAT, seatX - 0.17, seatTop + 0.16, 0, 0, 0, -0.28);
  for (const side of [-1, 1]) add(box(0.3, 0.1, 0.03), paint, seatX, seatTop + 0.02, side * 0.17);
  // The steering column (the wheel itself is its own mesh, below)
  const colX = seatX + 0.3;
  const wheelAt = new THREE.Vector3(colX + 0.1, seatTop + 0.24, 0);
  add(tube(0.016, 0.26), FRAME, colX + 0.03, seatTop + 0.12, 0, 0, 0, -0.5);
  // The engine box behind the seat, its pull cord and the exhaust pipe out the back
  const [ew, eh, ed] = s.engine;
  const engX = seatX - 0.27 - ew / 2;
  add(box(ew, eh, ed), ENGINE, engX, floorY + eh / 2 + 0.02, 0);
  if (detail > 0) add(box(ew * 0.6, 0.03, ed * 0.6), CHROME, engX, floorY + eh + 0.035, 0);
  if (s.filter) add(tube(0.07, 0.16, 10), CHROME, engX, floorY + eh + 0.1, -ed / 4);
  const exX = -HALF + 0.02;
  const exY = floorY + 0.12;
  const exZ = 0.16;
  add(tube(0.03, 0.26, 10), CHROME, exX + 0.1, exY, exZ, 0, 0, Math.PI / 2);
  if (detail > 0) add(tube(0.036, 0.04, 10), FRAME, exX - 0.02, exY, exZ, 0, 0, Math.PI / 2);
  const exhausts: [number, number, number][] = [[exX - 0.03, exY, exZ]];
  if (s.filter) {
    add(tube(0.03, 0.26, 10), CHROME, exX + 0.1, exY, -exZ, 0, 0, Math.PI / 2);
    exhausts.push([exX - 0.03, exY, -exZ]);
  }
  // Behind the seat: a wing on struts, a roll hoop, or a little fin
  if (s.rear === 'wing') {
    const wy = seatTop + 0.3;
    for (const z of [-0.2, 0.2]) add(box(0.025, wy - floorY - eh, 0.025), FRAME, engX - 0.04, (wy + floorY + eh) / 2, z);
    add(box(0.14, 0.022, 0.62), paint, engX - 0.04, wy, 0, 0, 0, 0.18);
    for (const z of [-0.31, 0.31]) add(box(0.16, 0.08, 0.015), FRAME, engX - 0.04, wy, z);
  } else if (s.rear === 'hoop') {
    const hy = seatTop + 0.44;
    for (const z of [-0.14, 0.14]) add(tube(0.022, hy - floorY), FRAME, seatX - 0.3, (hy + floorY) / 2, z, 0, 0, -0.12);
    add(tube(0.022, 0.32), FRAME, seatX - 0.3 - Math.tan(0.12) * (hy - floorY) * 0.5, hy, 0, Math.PI / 2);
  } else {
    add(box(0.16, 0.14, 0.02), paint, engX - 0.02, floorY + eh + 0.08, 0, 0, 0, 0.5);
  }
  // Armour: a plate down each side and over the nose, riveted; and a bull bar out front
  if (s.armour) {
    for (const side of [-1, 1]) {
      add(box(0.6, 0.22, 0.03), ARMOUR, 0, floorY + 0.14, side * (s.pod.z + 0.02), side * 0.1);
      if (detail > 1) for (const x of [-0.22, 0, 0.22]) add(box(0.03, 0.03, 0.02), CHROME, x, floorY + 0.22, side * (s.pod.z + 0.04));
    }
    add(box(0.24, 0.03, 0.3), ARMOUR, noseX0 + 0.1, floorY + 0.2, 0, 0, 0, 0.3);
  }
  if (s.bullbar) {
    const bx = noseX0 + s.nose + 0.07;
    for (const y of [floorY + 0.05, floorY + 0.17]) add(tube(0.018, 0.42), FRAME, bx, y, 0, Math.PI / 2);
    for (const z of [-0.18, 0.18]) add(tube(0.018, 0.2), FRAME, bx, floorY + 0.11, z);
  }
  // Mudguards over the rear wheels (the paint), and a dark strip behind the seat
  if (detail > 0) for (const side of [-1, 1]) add(box(s.r * 1.6, 0.025, s.tw + 0.04), paint, ra, s.r * 2 + 0.04, side * s.track, side * 0.1);
  // The rear light
  const light = new THREE.Mesh(box(0.02, 0.05, 0.18), neon(TAIL, 1.2, 2));
  light.position.set(-HALF + 0.01, floorY + 0.2, -0.12);
  parts.push(light);
  temp.push(light.geometry);

  const body = mergeMeshes(parts);
  for (const g of temp) g.dispose();
  group.add(body);

  // The steering wheel, on an axle tilted back towards the driver; its grips are where the hands go
  const tilt = 0.55;
  const axis = new THREE.Vector3(Math.cos(tilt), -Math.sin(tilt), 0).normalize();
  const wheelGeo = new THREE.TorusGeometry(0.095, 0.02, 8, 16).rotateY(Math.PI / 2).rotateZ(-tilt);
  const spokeGeo = new THREE.BoxGeometry(0.02, 0.012, 0.17).rotateZ(-tilt);
  const wheel = new THREE.Mesh(wheelGeo, toon(WHEEL));
  const spoke = new THREE.Mesh(spokeGeo, toon(WHEEL));
  wheel.add(spoke);
  wheel.position.copy(wheelAt);
  group.add(wheel);

  // The number on the nose
  const plateGeo = new THREE.PlaneGeometry(0.17, 0.17).rotateY(Math.PI / 2);
  const plate = new THREE.Mesh(plateGeo, plateMat(1));
  // Lying on the nose's sloping top, so it reads from the chase camera
  plate.position.set(noseX0 + s.nose * 0.5, floorY + 0.2, 0);
  plate.rotation.z = 1.3;
  group.add(plate);

  // The wheels: a pivot each (steers about y, rolls about z), the rim facing out
  const wheelGeoR = kartWheel(id);
  const { detail: detailMat } = carMaterials();
  const wheels = s.axles.flatMap((x) =>
    [s.track, -s.track].map((z) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, s.r, z);
      const w = new THREE.Mesh(wheelGeoR, detailMat);
      if (z < 0) w.rotation.y = Math.PI;
      w.castShadow = true;
      pivot.add(w);
      group.add(pivot);
      return { pivot, mesh: w, front: x > 0 };
    })
  );

  /* ---------- The driver ---------- */

  const seatAt = new THREE.Vector3(seatX, seatTop, 0);
  let driver: Degen | null = null;
  let leanAmt = 0;
  let headYaw = 0;
  let wheelTurn = 0;
  const M = new THREE.Matrix4();
  const inv = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const grip = new THREE.Vector3();
  const chest = new THREE.Matrix4();

  /** Pose the driver: seated, leaning, hands on the wheel's grips */
  function poseDriver() {
    if (!driver) return;
    const p = driver.pose;
    p.bob = 0;
    p.lean = 0.16 + Math.abs(leanAmt) * 0.04;
    p.twist = 0;
    // Tipping into the drift: the hips roll (a positive side tilts him to his right)
    p.side = leanAmt * 0.22;
    p.headYaw = headYaw;
    p.headPitch = 0.06;
    for (const l of p.legs) {
      l.fwd = 1.2;
      l.out = 0.1;
      l.bend = 0.5;
      l.twist = 0;
    }
    // The torso frame in kart space: root (seat, facing +x, scaled) > the body's own (hips rolled, spine leaned)
    const g = driver.g;
    chest.compose(g.position, g.quaternion, g.scale);
    chest.multiply(torsoFrame(p, M));
    inv.copy(chest).invert();
    // The grips: 3 and 9 o'clock on the wheel, turned with it; arm 0 (the rig's -x) is on the kart's +z side
    for (const i of [0, 1] as const) {
      grip.set(0, 0, i === 0 ? 0.095 : -0.095).applyQuaternion(q.setFromAxisAngle(axis, wheelTurn)).add(wheelAt);
      grip.applyMatrix4(inv);
      reachArm(p, i, grip);
    }
    driver.update();
  }

  let roll = 0;
  return {
    group,
    id,
    exhausts,
    seatAt,
    drive(dist: number, steer = 0) {
      roll -= dist / s.r;
      for (const w of wheels) {
        w.mesh.rotation.z = w.mesh.rotation.y ? -roll : roll;
        w.pivot.rotation.y = w.front ? steer : 0;
      }
      // The wheel turns with the steering (about twice as far), the hands with it
      const want = steer * 2.2;
      if (Math.abs(want - wheelTurn) > 1e-3) {
        wheelTurn = want;
        wheel.quaternion.setFromAxisAngle(axis, wheelTurn);
        poseDriver();
      }
    },
    setNumber(n: number) {
      plate.material = plateMat(Math.max(1, Math.min(8, Math.round(n))));
    },
    seat(degen: Degen | null) {
      if (driver) {
        driver.g.removeFromParent();
        if (driver.held) driver.held.visible = true;
      }
      driver = degen;
      if (!degen) return;
      const g = degen.g;
      g.rotation.set(0, Math.PI / 2, 0);
      g.scale.setScalar(DRIVER_SCALE);
      g.position.set(seatAt.x, seatAt.y - HIP_HEIGHT * DRIVER_SCALE + 0.01, seatAt.z);
      // Whatever he carries stays put away while he drives
      if (degen.held) degen.held.visible = false;
      group.add(g);
      poseDriver();
    },
    lean(amount: number) {
      const a = THREE.MathUtils.clamp(amount, -1, 1);
      if (Math.abs(a - leanAmt) < 1e-3) return;
      leanAmt = a;
      poseDriver();
    },
    look(yaw: number) {
      const y = THREE.MathUtils.clamp(yaw, -1, 1);
      if (Math.abs(y - headYaw) < 1e-3) return;
      headYaw = y;
      poseDriver();
    },
    dispose() {
      if (driver) {
        driver.g.removeFromParent();
        if (driver.held) driver.held.visible = true;
        driver = null;
      }
      group.removeFromParent();
      body.traverse((c) => {
        if (c instanceof THREE.Mesh) c.geometry.dispose();
      });
      wheelGeo.dispose();
      spokeGeo.dispose();
      plateGeo.dispose();
    },
  };
}

/* ---------- Silhouettes ---------- */

/**
 * A side-on silhouette of a model for the hut's cards: the body's outline and the
 * wheels, all at one scale in a 120 x 60 box, so sizes compare.
 */
export function kartSilhouette(id: KartId): string {
  const s = SHAPES[id];
  const k = 64;
  const pt = ([x, y]: V2) => `${(60 + x * k).toFixed(1)},${(54 - y * k).toFixed(1)}`;
  const [ra, fa] = s.axles;
  const [ew, eh] = s.engine;
  const seatX = -0.1;
  const engX = seatX - 0.27 - ew / 2;
  const noseX0 = fa + 0.08;
  const top = s.floor + s.pod.h;
  // Round the kart clockwise from the nose: the cone, the pod's top, the wheel column, the seat back, the engine, the tail
  const body: V2[] = [
    [noseX0 + s.nose + (s.bullbar ? 0.1 : 0), s.floor + 0.03],
    [noseX0 + s.nose, s.floor + 0.13],
    [noseX0 + 0.05, s.floor + 0.2],
    [s.pod.x1, top],
    [seatX + 0.3, s.seat + 0.12],
    [seatX + 0.42, s.seat + 0.3],
    [seatX + 0.36, s.seat + 0.33],
    [seatX + 0.14, s.seat + 0.02],
    [seatX - 0.06, s.seat + 0.02],
    [seatX - 0.18, s.seat + 0.34],
    ...(s.rear === 'wing' ? ([[engX + 0.06, s.seat + 0.28], [engX - 0.12, s.seat + 0.32], [engX - 0.1, s.seat + 0.2]] as V2[]) : s.rear === 'hoop' ? ([[seatX - 0.28, s.seat + 0.46], [seatX - 0.36, s.seat + 0.46]] as V2[]) : ([[engX, s.floor + eh + 0.16], [engX - 0.1, s.floor + eh + 0.06]] as V2[])),
    [engX - ew / 2, s.floor + eh],
    [-HALF, s.floor + 0.12],
    [-HALF, s.floor],
    [HALF, s.floor],
  ];
  const wheels = [ra, fa].map((x) => `<circle class="wheel" cx="${(60 + x * k).toFixed(1)}" cy="${(54 - s.r * k).toFixed(1)}" r="${(s.r * k).toFixed(1)}"/>`).join('');
  return `<svg viewBox="0 0 120 60" aria-hidden="true"><path d="M${body.map(pt).join('L')}Z"/>${wheels}</svg>`;
}
