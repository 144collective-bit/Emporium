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
import { carMaterials, merge } from './cars';
import type { Degen } from './character';
import { paintAll } from './carparts';
import { DRIVER_SCALE, KART_SHAPES, SEAT_X, WHEEL_R, WHEEL_TILT, driverRoot, kartPose, pedalsOf, wheelOf } from './kartframe';
import { FONT_DISPLAY, liveTex, mergeMeshes, moving, neon, PAL, toon } from './kit';
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

export { DRIVER_SCALE } from './kartframe';
const SHAPES = KART_SHAPES;
const HALF = KART_L / 2;
type V2 = [number, number];
type V3 = [number, number, number];

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

/**
 * A kart wheel (vehicle plan Phase 9): a fat tyre with a rounded shoulder and its tread (two staggered rows of
 * blocks round it, but on the far karts), on a magnesium rim with six spokes, a lip each side, the hub and a valve.
 * Axle along z, the rim facing +z; coloured per vertex for the cars' detail material
 */
const wheelGeos = new Map<string, THREE.BufferGeometry>();
function kartWheel(id: KartId, detail: number) {
  const key = `${id}:${detail}`;
  let g = wheelGeos.get(key);
  if (g) return g;
  const s = SHAPES[id];
  const r = s.r;
  const h = s.tw / 2;
  const tread = detail > 0 ? 0.006 : 0;
  const rt = r - tread;
  const geos: THREE.BufferGeometry[] = [];
  const col = (geo: THREE.BufferGeometry, hex: string) => void geos.push(paintAll(geo.index ? geo.toNonIndexed() : geo, hex));
  const prof: THREE.Vector2[] = [
    [rt * 0.6, -h],
    [rt * 0.86, -h],
    [rt * 0.98, -h * 0.82],
    [rt, -h * 0.5],
    [rt, h * 0.5],
    [rt * 0.98, h * 0.82],
    [rt * 0.86, h],
    [rt * 0.6, h],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  col(new THREE.LatheGeometry(prof, detail > 1 ? 20 : 14).rotateX(Math.PI / 2), WHEEL);
  // The tread: shallow blocks in two rows, staggered, standing just proud of the tyre (narrow grooves between)
  if (tread) {
    const n = detail > 1 ? 18 : 12;
    for (let k = 0; k < n; k++)
      for (const row of [-1, 1]) {
        const a = ((k + (row > 0 ? 0.5 : 0)) / n) * Math.PI * 2;
        const blk = new THREE.BoxGeometry(((Math.PI * 2 * r) / n) * 0.8, tread * 2, h * 0.86)
          .translate(0, rt, row * h * 0.46)
          .rotateZ(a);
        col(blk, '#1d1b26');
      }
  }
  // The rim: a lip each side, its dished face, six spokes, the hub and its nut, a valve
  for (const side of [-1, 1]) col(new THREE.CylinderGeometry(rt * 0.62, rt * 0.62, 0.012, 16, 1, true).rotateX(Math.PI / 2).translate(0, 0, side * (h - 0.004)), RIM);
  col(new THREE.CircleGeometry(rt * 0.58, 16).translate(0, 0, h - 0.016), '#3a3848');
  for (let k = 0; k < 6; k++)
    col(
      new THREE.BoxGeometry(rt * 0.42, rt * 0.12, 0.018)
        .translate(rt * 0.3, 0, h - 0.008)
        .rotateZ((k / 6) * Math.PI * 2),
      RIM
    );
  col(new THREE.CylinderGeometry(rt * 0.17, rt * 0.17, 0.03, 10).rotateX(Math.PI / 2).translate(0, 0, h), RIM);
  col(new THREE.CylinderGeometry(rt * 0.07, rt * 0.07, 0.03, 6).rotateX(Math.PI / 2).translate(0, 0, h + 0.012), FRAME);
  if (detail > 1) col(new THREE.CylinderGeometry(0.006, 0.006, 0.03).rotateX(Math.PI / 2).translate(0, rt * 0.5, h - 0.004), CHROME);
  g = merge(geos, true)!;
  wheelGeos.set(key, g);
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
  const group = moving(new THREE.Group());
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
  /** A tube bent through points (the frame's rails, the exhaust), its corners rounded */
  const bend = (pts: V3[], r: number, color: string, round = 0.25) => {
    const curve = new THREE.CatmullRomCurve3(
      pts.map((p) => new THREE.Vector3(...p)),
      false,
      'catmullrom',
      round
    );
    add(new THREE.TubeGeometry(curve, pts.length * (detail > 1 ? 6 : 3), r, detail > 1 ? 7 : 5, false), color);
  };
  /** A side profile (x, y) pushed `w` across, its edges rounded, at z */
  const profile = (pts: V2[], w: number, color: string, z = 0, round = 0.02) => {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), {
      depth: Math.max(0.001, w - round * 2),
      bevelEnabled: true,
      bevelThickness: round,
      bevelSize: round,
      bevelOffset: -round,
      bevelSegments: detail > 1 ? 2 : 1,
      curveSegments: 6,
    });
    add(g.translate(0, 0, z - (w - round * 2) / 2), color);
  };
  const [ra, fa] = s.axles;
  const floorY = s.floor;
  const f = floorY + 0.035;

  // The tube frame: two rails bent in towards the nose and out round the seat, cross tubes, the rear axle and its
  // bearings, the floor pan; nerf bars outboard between the wheels; a rear bumper behind the back wheels
  for (const z of [-1, 1]) {
    bend(
      [
        [fa + 0.12, f, z * 0.1],
        [fa - 0.04, f, z * 0.17],
        [SEAT_X + 0.1, f, z * 0.22],
        [ra + 0.04, f, z * 0.22],
        [ra - 0.12, f + 0.02, z * 0.17],
      ],
      0.02,
      FRAME
    );
    if (detail > 0)
      bend(
        [
          [fa - 0.1, f + 0.01, z * 0.21],
          [fa - 0.2, f + 0.05, z * (s.track - 0.02)],
          [ra + 0.2, f + 0.05, z * (s.track - 0.02)],
          [ra + 0.1, f + 0.01, z * 0.22],
        ],
        0.016,
        FRAME
      );
  }
  for (const x of [fa, (ra + fa) / 2]) add(tube(0.018, 0.4), FRAME, x, f, 0, Math.PI / 2);
  add(tube(0.022, s.track * 2 - s.tw * 0.6), CHROME, ra, s.r, 0, Math.PI / 2);
  for (const z of [-0.2, 0.2]) add(box(0.06, s.r - f + 0.03, 0.05), FRAME, ra, (s.r + f) / 2, z);
  add(box(0.7, 0.02, 0.38), PAD, SEAT_X + 0.12, floorY + 0.012, 0);
  if (detail > 0) {
    bend(
      [
        [ra - 0.1, f + 0.02, -0.18],
        [ra - s.r - 0.12, f + 0.05, -0.22],
        [ra - s.r - 0.12, f + 0.05, 0.22],
        [ra - 0.1, f + 0.02, 0.18],
      ],
      0.018,
      FRAME,
      0.1
    );
    // The front stub axles out to the wheels (they steer on their own), the tie rods
    for (const z of [-1, 1]) add(tube(0.014, s.track - 0.2), FRAME, fa, s.r, z * (0.1 + s.track / 2), Math.PI / 2);
  }

  // Side pods (the paint): a wedge rounded off, lower at the front, on the nerf bars
  const pw = s.pod.z - 0.21;
  for (const side of [-1, 1]) {
    const { x0, x1, h } = s.pod;
    profile(
      [
        [x0, floorY + 0.02],
        [x1, floorY + 0.02],
        [x1 - 0.02, floorY + h * 0.6],
        [x1 - 0.12, floorY + h],
        [x0 + 0.04, floorY + h],
        [x0, floorY + h * 0.7],
      ],
      pw,
      paint,
      side * (0.21 + pw / 2),
      0.025
    );
    if (detail > 0) add(box(x1 - x0 - 0.04, 0.03, pw + 0.02), FRAME, (x0 + x1) / 2, floorY + 0.015, side * (0.21 + pw / 2));
  }
  // The nose: a full rounded fairing over the front, the paint, its spoiler lip under it in the frame's black
  const noseX0 = fa + 0.08;
  const nn = s.nose;
  profile(
    [
      [noseX0 - 0.16, floorY + 0.04],
      [noseX0 + nn, floorY + 0.04],
      [noseX0 + nn + 0.02, floorY + 0.09],
      [noseX0 + nn - 0.06, floorY + 0.15],
      [noseX0 + 0.04, floorY + 0.22],
      [noseX0 - 0.16, floorY + 0.24],
    ],
    0.46,
    paint,
    0,
    0.04
  );
  add(box(0.12, 0.025, 0.56), FRAME, noseX0 + nn - 0.02, floorY + 0.025, 0);
  if (s.bullbar) {
    const bx = noseX0 + nn + 0.07;
    for (const y of [floorY + 0.05, floorY + 0.17]) add(tube(0.018, 0.42), FRAME, bx, y, 0, Math.PI / 2);
    for (const z of [-0.18, 0.18]) add(tube(0.018, 0.2), FRAME, bx, floorY + 0.11, z);
  }

  // The bucket seat: a cushion, a back leaning back with bolsters each side, the paint's trim down its sides
  const seatX = SEAT_X;
  const seatTop = s.seat;
  add(box(0.3, 0.06, 0.32), SEAT, seatX, seatTop - 0.03, 0);
  add(box(0.06, 0.4, 0.32), SEAT, seatX - 0.17, seatTop + 0.17, 0, 0, 0, -0.28);
  for (const side of [-1, 1]) {
    add(box(0.32, 0.16, 0.04), SEAT, seatX - 0.02, seatTop + 0.05, side * 0.17);
    add(box(0.32, 0.06, 0.045), paint, seatX - 0.02, seatTop + 0.14, side * 0.172);
  }
  // The pedals on their stalks, the steering column from the front cross tube up to the wheel
  for (const [x, y, z] of pedalsOf(id)) {
    add(box(0.03, 0.09, 0.06), CHROME, x, y, z, 0, 0, -0.35);
    if (detail > 0) add(tube(0.008, 0.08), FRAME, x + 0.02, y - 0.06, z);
  }
  const [wx, wy] = wheelOf(id);
  bend(
    [
      [fa - 0.02, f + 0.02, 0],
      [fa - 0.08, f + 0.12, 0],
      [wx + 0.02, wy - 0.02, 0],
    ],
    0.015,
    FRAME,
    0.3
  );

  // The engine behind the seat: the crankcase, the finned cylinder standing up on it, the carburettor and its air box
  // (a big round filter on the Big Wheel), the chain guard down to the sprocket on the rear axle
  const [ew, eh, ed] = s.engine;
  const engX = seatX - 0.27 - ew / 2;
  add(box(ew, eh * 0.55, ed), ENGINE, engX, floorY + eh * 0.275 + 0.02, 0);
  const cylH = eh * 0.55;
  const cylY = floorY + eh * 0.55 + 0.02 + cylH / 2;
  add(tube(ew * 0.26, cylH, 10), ENGINE, engX, cylY, 0.02);
  if (detail > 0) for (let k = 0; k < 4; k++) add(tube(ew * 0.38, 0.012, 10), '#6a6880', engX, cylY - cylH * 0.35 + k * cylH * 0.22, 0.02);
  add(tube(ew * 0.2, 0.03, 8), CHROME, engX, cylY + cylH / 2 + 0.015, 0.02);
  if (s.filter) add(tube(0.07, 0.16, 10), CHROME, engX + 0.02, floorY + eh + 0.06, -ed / 2 - 0.03, Math.PI / 2);
  else add(box(0.08, 0.08, 0.1), '#2c2f40', engX + 0.02, cylY, -ed / 2 - 0.04);
  if (detail > 0) {
    add(box(Math.abs(engX - ra) + 0.06, 0.08, 0.02), FRAME, (engX + ra) / 2, (floorY + s.r) / 2 + 0.04, -0.13, 0, 0, 0.3);
    add(tube(s.r * 0.6, 0.015, 12), '#6a6880', ra, s.r, -0.15, Math.PI / 2);
  }
  // The exhaust: a pipe bent out of the cylinder's head and round to a silencer canister behind, out the back
  const exX = -HALF + 0.02;
  const exY = floorY + 0.14;
  const exhausts: V3[] = [];
  for (const z of s.filter ? [0.16, -0.16] : [0.16]) {
    bend(
      [
        [engX + ew * 0.2, cylY + cylH * 0.2, 0.02 + Math.sign(z) * ew * 0.25],
        [engX + ew * 0.1, cylY, z * 0.9],
        [engX - ew * 0.2, exY + 0.04, z],
        [exX + 0.24, exY, z],
      ],
      0.02,
      CHROME
    );
    add(tube(0.045, 0.2, 10), CHROME, exX + 0.12, exY, z, 0, 0, Math.PI / 2);
    if (detail > 0) add(tube(0.05, 0.02, 10), FRAME, exX + 0.02, exY, z, 0, 0, Math.PI / 2);
    exhausts.push([exX - 0.01, exY, z]);
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
  // Armour: a plate down each side, riveted
  if (s.armour) {
    for (const side of [-1, 1]) {
      add(box(0.6, 0.22, 0.03), ARMOUR, 0, floorY + 0.14, side * (s.pod.z + 0.02), side * 0.1);
      if (detail > 1) for (const x of [-0.22, 0, 0.22]) add(box(0.03, 0.03, 0.02), CHROME, x, floorY + 0.22, side * (s.pod.z + 0.04));
    }
  }
  // Mudguards over the rear wheels (the paint)
  if (detail > 0) for (const side of [-1, 1]) add(box(s.r * 1.6, 0.025, s.tw + 0.04), paint, ra, s.r * 2 + 0.04, side * s.track, side * 0.1);
  // The rear light
  const light = new THREE.Mesh(box(0.02, 0.05, 0.18), neon(TAIL, 1.2, 2));
  light.position.set(-HALF + 0.01, floorY + 0.2, -0.12);
  parts.push(light);
  temp.push(light.geometry);

  const body = mergeMeshes(parts);
  for (const g of temp) g.dispose();
  group.add(body);

  // The steering wheel, on an axle tilted back towards the driver: its rim, three spokes and the hub
  const axis = new THREE.Vector3(Math.cos(WHEEL_TILT), -Math.sin(WHEEL_TILT), 0).normalize();
  const wheelGeo = new THREE.TorusGeometry(WHEEL_R, 0.02, 8, 18).rotateY(Math.PI / 2).rotateZ(-WHEEL_TILT);
  const spokeGeo = merge(
    [0, 1, 2].map((k) =>
      paintAll(
        new THREE.BoxGeometry(0.014, 0.012, WHEEL_R)
          .translate(0, 0, WHEEL_R / 2)
          .rotateX(Math.PI / 2 + (k * Math.PI * 2) / 3)
          .rotateZ(-WHEEL_TILT)
          .toNonIndexed(),
        WHEEL
      )
    ).concat(paintAll(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10).rotateZ(Math.PI / 2 - WHEEL_TILT).toNonIndexed(), '#e219e5')),
    true
  )!;
  const wheel = new THREE.Mesh(wheelGeo, toon(WHEEL));
  const spoke = new THREE.Mesh(spokeGeo, carMaterials().detail);
  wheel.add(spoke);
  wheel.position.set(...wheelOf(id));
  group.add(wheel);

  // The number on the nose
  const plateGeo = new THREE.PlaneGeometry(0.17, 0.17).rotateY(Math.PI / 2);
  const plate = new THREE.Mesh(plateGeo, plateMat(1));
  // Lying on the nose's sloping top, so it reads from the chase camera
  plate.position.set(noseX0 + s.nose * 0.45, floorY + 0.205, 0);
  plate.rotation.z = 1.3;
  group.add(plate);

  // The wheels: a pivot each (steers about y, rolls about z), the rim facing out
  const wheelGeoR = kartWheel(id, detail);
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

  /** Pose the driver: seated low, feet on the pedals, leaning, hands on the wheel's grips (kartframe.ts) */
  function poseDriver() {
    if (!driver) return;
    kartPose(driver.pose, id, leanAmt, headYaw, wheelTurn);
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
      g.position.set(...driverRoot(id));
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
