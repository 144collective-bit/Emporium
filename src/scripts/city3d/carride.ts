/*
 * Your car on the move (vehicle plan Phase 2; the cars' fine-detail chunk,
 * carfine.ts, so the boot doesn't carry it). carcabin.ts fits the car out
 * and hands over its moving pieces (`Moving`); this drives them, through the
 * car's own hooks drive.ts calls:
 *
 * - `ride()` every frame you drive: the body on its springs over the wheels
 *   (suspension.ts: the ground under each wheel, the load of speeding up,
 *   braking and turning), each wheel up and down in its arch; the steering
 *   wheel turning with the steering and your hands with it; the speed and
 *   the revs on the gauges; the wipers sweeping in the rain; the skid marks
 *   under the rear wheels while they slide (city life plan, Phase 2: one
 *   fixed mesh of `SKID_N` quads, each fading over `SKID_FADE`; none under
 *   reduced motion).
 * - `eye()` for the driver's-seat camera: his eyes, turned as you look
 *   round, and no rain falling inside the cabin while you sit in it (the
 *   rain's shader is given a hole round it, `hole`).
 * - `door()` (Phase 3): a front door swung open as the hand lands on its
 *   handle getting in (walk.ts) or as you get out (drive.ts), and shut after;
 *   `seat()`, wrapped: the door you came in by shuts after you, from the
 *   passenger's side you slide over to the wheel (none of it under reduced
 *   motion: the quick version), and the headlights' pool on the road ahead
 *   and the brake lights' red wash behind show while you're in (two glow
 *   points, dark by day through `lit`; the brake wash from `lights()`).
 */
import * as THREE from 'three';
import type { Car } from './cars';
import type { Moving } from './carcabin';
import { INTERIORS } from './carinside';
import { SPRINGS, newSprings, stepSprings, wheelsOf } from './suspension';
import { fx, glowTex, lit } from './kit';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const now = () => performance.now() / 1000;

/** How far the steering wheel turns for the front wheels' turn, and how far his hands go round with it */
const STEER_RATIO = 3;
const HANDS_MOST = 1.3;
/** A door opening or shutting (seconds); how soon after he's in it shuts behind him; sliding over from the passenger's seat */
const DOOR_T = 0.35;
const DOOR_SHUT = 0.3;
const SLIDE = 0.5;
/** The needles' sweep either side of straight up (radians) */
const SWEEP = 2.3;
/** A wipe there and back (seconds), from this much rain; how far round the wipers go */
const WIPE = 1.1;
const WET = 0.2;
const WIPE_ARC = 1.6;

/* ---------- Skid marks ---------- */

/** How many skid-mark pieces the road keeps (the oldest is reused), and how long one takes to fade (seconds) */
const SKID_N = 240;
const SKID_FADE = 7;
/** A fresh mark's opacity (dark rubber over the ground) and width */
const SKID_ALPHA = 0.55;
const SKID_W = 0.13;

/**
 * One fixed mesh of SKID_N quads laid under the rear wheels while the tyres slide, each fading over SKID_FADE; the
 * oldest is reused. Dark rubber with an alpha per vertex (one small shader: a basic material can't fade per quad), a
 * hair above the lane markings, in the FX layer so no outline is drawn round them. (Multiply blending isn't honoured
 * in the post chain: never use it for decals.)
 */
function createSkidMarks(scene: THREE.Object3D) {
  const pos = new Float32Array(SKID_N * 4 * 3);
  const fade = new Float32Array(SKID_N * 4);
  const idx = new Uint16Array(SKID_N * 6);
  for (let i = 0; i < SKID_N; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('fade', new THREE.BufferAttribute(fade, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.setDrawRange(0, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { alpha: { value: SKID_ALPHA } },
    vertexShader: /* glsl */ `
      attribute float fade; varying float vFade;
      void main() { vFade = fade; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float alpha; varying float vFade;
      void main() { gl_FragColor = vec4(0.02, 0.02, 0.03, alpha * vFade); }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  mesh.visible = false;
  scene.add(fx(mesh));
  const born = new Float32Array(SKID_N).fill(-Infinity);
  let next = 0;
  let used = 0;
  return {
    /** Lay one piece from (ax, az) to (bx, bz) at height y */
    add(ax: number, az: number, bx: number, bz: number, y: number, t: number) {
      const l = Math.hypot(bx - ax, bz - az) || 1;
      const nx = (-(bz - az) / l) * SKID_W * 0.5;
      const nz = ((bx - ax) / l) * SKID_W * 0.5;
      const i = next;
      next = (next + 1) % SKID_N;
      used = Math.min(SKID_N, used + 1);
      pos.set([ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz], i * 12);
      fade.fill(1, i * 4, i * 4 + 4);
      born[i] = t;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.fade.needsUpdate = true;
      geo.setDrawRange(0, used * 6);
      mesh.visible = true;
    },
    /** Fade every piece by its age; the mesh hides once all have gone */
    update(t: number) {
      if (!mesh.visible) return;
      let alive = 0;
      for (let i = 0; i < used; i++) {
        const age = t - born[i];
        const k = age >= SKID_FADE ? 0 : 1 - age / SKID_FADE;
        if (k > 0) alive++;
        fade.fill(k, i * 4, i * 4 + 4);
      }
      geo.attributes.fade.needsUpdate = true;
      if (!alive) mesh.visible = false;
    },
  };
}
let skids: ReturnType<typeof createSkidMarks> | null | undefined;
let clock = 0;

/* ---------- The rain round the cabin ---------- */

/** The rain's hole (xyz, radius): where the driver's-seat camera sits, none otherwise */
const hole = new THREE.Vector4();
let rain: THREE.ShaderMaterial | null | undefined;
/** The rain (sky.ts: its streaks' shader), found once and given the hole: no streak whose foot is inside it is drawn */
function findRain(root: THREE.Object3D) {
  let found: THREE.ShaderMaterial | null = null;
  root.traverse((o) => {
    const m = (o as THREE.LineSegments).material as THREE.ShaderMaterial | undefined;
    if (!found && (o as THREE.LineSegments).isLineSegments && m?.uniforms?.amount && m.uniforms.origin) found = m;
  });
  const m = found as THREE.ShaderMaterial | null;
  const at = 'p += vec3(-0.05, 0.55, -0.02) * end;';
  if (m && m.vertexShader.includes(at)) {
    m.uniforms.hole = { value: hole };
    m.vertexShader = m.vertexShader.replace('uniform vec3 origin;', 'uniform vec3 origin; uniform vec4 hole;').replace(at, `if (distance(p, hole.xyz) < hole.w) p = vec3(0.0, -1000.0, 0.0); else ${at}`);
    m.needsUpdate = true;
  }
  return m;
}

/* ---------- The lamps' pools ---------- */

const poolMat = () =>
  (thePools ??= lit(new THREE.PointsMaterial({ color: '#ffffff', vertexColors: true, map: glowTex, size: 1.9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0, 0.3));
let thePools: THREE.PointsMaterial | null = null;
const HEAD_POOL = new THREE.Color('#fff0c0');
const BRAKE_WASH = new THREE.Color('#ff2b2b').multiplyScalar(0.22);
const DARK = new THREE.Color(0, 0, 0);

/* ---------- The car ---------- */

const ease = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const P = new THREE.Vector3();
const Q = new THREE.Vector3();
const dir = new THREE.Vector3();

/** Drive your fitted car's moving pieces (carcabin.ts hands them over): its `ride()`, `eye()`, and the door and pools on `seat()` */
export function rideOn(car: Car, m: Moving) {
  const s = car.spec;
  const n = INTERIORS[s.id];
  const at = wheelsOf(s);
  const tune = SPRINGS[s.id];
  const sp = newSprings();
  const ground = [0, 0, 0, 0];
  const rest = m.wheels.map((w) => w.position.y);
  const [rb, , fr, fb] = s.cabin;
  /** The body pitches and rolls about the axles' height; the cabin's middle (the rain's hole) */
  const pivot = new THREE.Vector3(0, s.r, 0);
  const cabin = new THREE.Vector3((rb[0] + fb[0]) / 2, (rb[1] + fr[1]) / 2, 0);
  const roomy = (fb[0] - rb[0]) / 2 + 0.35;
  let turned = NaN;
  let wipe = 0;
  const settle = () => {
    Object.assign(sp, newSprings());
    m.body.position.set(0, 0, 0);
    m.body.rotation.set(0, 0, 0);
    for (const [i, w] of m.wheels.entries()) w.position.y = rest[i];
  };

  // The pools: ahead of the nose and behind the tail, on the road
  const col = new Float32Array(6);
  HEAD_POOL.toArray(col, 0);
  const poolGeo = new THREE.BufferGeometry();
  poolGeo.setAttribute('position', new THREE.Float32BufferAttribute([s.L / 2 + 1.5, 0.06, 0, -(s.L / 2 + 0.7), 0.06, 0], 3));
  poolGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pools = fx(new THREE.Points(poolGeo, poolMat()));
  pools.frustumCulled = false;
  pools.visible = false;
  car.group.add(pools);
  const lights = car.lights;
  car.lights = (brake, reverse, turn) => {
    lights(brake, reverse, turn);
    (brake ? BRAKE_WASH : DARK).toArray(col, 3);
    poolGeo.attributes.color.needsUpdate = true;
  };
  const dispose = car.dispose;
  car.dispose = () => {
    dispose();
    poolGeo.dispose();
  };

  // The front doors (Phase 3): each opened by `door()` (the moment's hand landing on its handle, getting out) and
  // shut after `hold` seconds, easing over `DOOR_T`; moved as they're drawn (a frame behind, which nobody sees, and
  // they swing whether you're driving or not). Under reduced motion they stay shut: the quick version
  const states = m.doors.map(() => ({ k: 0, goal: 0, shutAt: Infinity, last: 0 }));
  if (n.door && !reduced)
    for (const [i, door] of m.doors.entries()) {
      const open = (i ? 1 : -1) * n.door.open;
      const st = states[i];
      (door.children[0] as THREE.Mesh).onBeforeRender = () => {
        const t = now();
        const dt = Math.min(0.1, t - st.last);
        st.last = t;
        if (t >= st.shutAt) (st.goal = 0), (st.shutAt = Infinity);
        st.k = st.goal > st.k ? Math.min(st.goal, st.k + dt / DOOR_T) : Math.max(st.goal, st.k - dt / DOOR_T);
        door.rotation.y = open * ease(st.k);
      };
    }
  car.door = (i, hold) => {
    const st = states[i];
    if (!st || reduced) return;
    st.goal = 1;
    st.shutAt = now() + hold;
    st.last = now();
  };
  // In the seat's view his head is folded away (the camera's inside it)
  const head = (on: boolean) => m.driver()?.rig.bones.head.scale.setScalar(on ? 1 : 1e-3);
  /** In by the passenger's door: how far he's slid over to the wheel (1 there) */
  let slid = 1;
  const seat = car.seat!;
  car.seat = (degen, from = 0) => {
    head(true);
    seat(degen);
    pools.visible = !!degen;
    turned = NaN;
    hole.w = 0;
    settle();
    if (!degen) return;
    // (the door he came in by shuts after him, if the moment had it open; from the passenger's seat he slides over)
    const st = states[from];
    if (st?.goal) st.shutAt = now() + DOOR_SHUT;
    slid = from && !reduced ? 0 : 1;
  };

  car.ride = (st, dt, slip, accel, revs, top, y, groundAt) => {
    const c = Math.cos(st.yaw);
    const sn = Math.sin(st.yaw);
    const world = (x: number, z: number): [number, number] => [st.x + c * x + sn * z, st.z - sn * x + c * z];
    // The springs: the ground under each wheel from the car's height (a step too big to be a kerb is a deck or a ramp
    // the car's own height already follows), the load of speeding up, braking and turning
    for (const [i, [x, z]] of at.entries()) {
      const g = groundAt(...world(x, z), y) - y;
      ground[i] = Math.abs(g) < 0.3 ? g : 0;
    }
    stepSprings(sp, tune, at, { ax: Math.max(-12, Math.min(12, accel)), ay: st.speed * st.yawRate, ground }, dt);
    const b = m.body;
    b.rotation.set(sp.r, 0, sp.p);
    b.position.set(0, sp.h, 0).add(pivot).sub(P.copy(pivot).applyEuler(b.rotation));
    for (const [i, w] of m.wheels.entries()) w.position.y = rest[i] + sp.wheels[i];

    // In by the passenger's door: across to the wheel
    if (slid < 1) {
      slid = Math.min(1, slid + dt / SLIDE);
      const g = m.driver()?.g;
      if (g) g.position.z = -n.hip[2] + 2 * n.hip[2] * ease(slid);
    }
    // The wheel and his hands on it; the needles
    const turn = st.steer * STEER_RATIO;
    m.steer.rotation.x = turn;
    const hold = Math.max(-HANDS_MOST, Math.min(HANDS_MOST, turn));
    if (!(Math.abs(hold - turned) < 0.003)) m.hands((turned = hold));
    const [speedo, rev] = m.needles;
    if (speedo) speedo.rotation.x += (-SWEEP + 2 * SWEEP * Math.min(1, Math.abs(st.speed) / (top * 1.05)) - speedo.rotation.x) * Math.min(1, dt * 10);
    if (rev) rev.rotation.x += (-SWEEP + 2 * SWEEP * revs - rev.rotation.x) * Math.min(1, dt * 12);

    // The wipers: sweeping while it rains, home to their rest after the last wipe once it stops
    let root: THREE.Object3D = car.group;
    while (root.parent) root = root.parent;
    if (rain === undefined) rain = findRain(root);
    const wet = (rain?.uniforms.amount.value as number | undefined) ?? 0;
    if (!reduced && (wet > WET || wipe % 1 > 0.02)) wipe += dt / WIPE;
    const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * wipe);
    for (const w of m.wipers) w.rotation.y = -WIPE_ARC * k;

    // The skid marks under the rear wheels (a piece per 0.15 moved), and their fading
    clock += dt;
    if (skids === undefined) skids = reduced ? null : createSkidMarks(root);
    if (skids) {
      for (let w = 0; w < 2; w++) {
        const [wx, wz] = world(s.axles[0], (w ? 1 : -1) * (s.W / 2 - 0.1));
        if (slip > 0 && Math.abs(st.speed) > 1) {
          const last = marks[w];
          if (!last) marks[w] = [wx, wz];
          else if (Math.hypot(wx - last[0], wz - last[1]) > 0.15) {
            skids.add(last[0], last[1], wx, wz, groundAt(wx, wz, y) + 0.046, clock);
            marks[w] = [wx, wz];
          }
        } else marks[w] = null;
      }
      skids.update(clock);
    }
    // (the hole's only there, and his head away, while the seat's camera asks for it, below)
    hole.w = 0;
    head(true);
    return true;
  };
  const marks: ([number, number] | null)[] = [null, null];

  car.eye = (pos, look, yaw, pitch) => {
    const w = m.body;
    w.updateWorldMatrix(true, false);
    pos.set(n.eye[0] + 0.02, n.eye[1], n.eye[2]).applyMatrix4(w.matrixWorld);
    head(false);
    const up = -0.2 - pitch * 0.7;
    dir.set(Math.cos(up) * Math.cos(yaw), Math.sin(up), -Math.cos(up) * Math.sin(yaw)).transformDirection(w.matrixWorld);
    look.copy(pos).addScaledVector(dir, 5);
    Q.copy(cabin).applyMatrix4(w.matrixWorld);
    hole.set(Q.x, Q.y, Q.z, roomy);
  };
}
