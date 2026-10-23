/*
 * Degen's animation from motion capture (DOM-free, tested in
 * tests/animator.test.ts): each frame
 *
 * 1. the playing clip runs on, a touch faster or slower to match the speed
 *    he's going (stride warping, `RATE`);
 * 2. about ten times a second (and at once when the stick changes sharply,
 *    or the clip runs out) the motion matching (motionmatch.ts) looks for
 *    the frame that best carries on from this one along the trajectory
 *    the movement springs (movesim.ts) predict; a better one takes over,
 *    the difference inertialized away (inertia.ts);
 * 3. on top: the sprint (arms and knees driving harder, a lean forward)
 *    and a lean into bends from the springs' sideways pull;
 * 4. the feet: a foot the clip has on the ground is locked where it landed
 *    and the leg reaches it (two-bone IK), following the ground (kerbs,
 *    stairs); a foot left too far behind lets go and catches up smoothly;
 *    the hips come down when a leg can't reach.
 *
 * Jumps, falls and landings (Phase 3): a jump starts from the take-off
 * that best carries on from this frame (a running one off the right foot,
 * a standing one off both), plays its flight as the game's own rise and
 * fall go (its vertical speed, the ground coming up), holds the reach for
 * the ground on a long fall with the arms coming up, and lands on the
 * touchdown that carries on best (running on, or stopping), the hips
 * taking a harder landing (`AIR`).
 *
 * The result is each body bone's turn (`rot`, MOCAP_BONES' order) and the
 * hips' place (`hips`) in his own frame at scale 1, for walk.ts to put on
 * the figure.
 */
import * as THREE from 'three';
import { FOOT_BONES, MB, MOCAP_BONES, MOCAP_FPS, NB, type MoData, PARENT, type Posed, REST, TOE_BONES, newPosed, posed } from './mocap';
import { angVel, createInertia, decay, expQ, logQ, rate as springRate, wrap } from './inertia';
import { buildDatabase, cost, type Database, AHEAD, FEATURES, search, setTrajectory } from './motionmatch';
import { ahead, type MoveState } from './movesim';
import { ANKLE_H, SHIN_GROUND, THIGH, type Skeleton } from './skeleton';

export interface AnimInput {
  dt: number;
  /** Where he stands, in the world */
  x: number;
  y: number;
  z: number;
  /** His movement springs, and the velocity the stick asks for (world, tiles a second) */
  move: MoveState;
  gx: number;
  gz: number;
  scale: number;
  /** The ground's height at (x, z), from about `y` */
  ground: (x: number, z: number, y: number) => number;
  /** ...and what the feet stand on, where it's drawn differently (a flight's treads over its ramp; `ground` if not given) */
  feet?: (x: number, z: number, y: number) => number;
  /** How far into a sprint (0 a run or slower, 1 flat out) */
  sprint: number;
  /** On the ground (true if not given) */
  grounded?: boolean;
  /** His vertical speed (world, up +); on the frame he lands, the speed he landed at */
  vy?: number;
  /** The game's take-off speed and gravity (walk.ts's JUMP and GRAVITY) */
  jump?: number;
  gravity?: number;
}

/** How much faster or slower a clip may play to match his speed, and how much more flat out */
export const RATE = { min: 0.8, max: 1.15, sprint: 0.2 };
/** Searching: how often, how much better a frame must be to take over, and how sharp a change of the stick searches at once */
export const MATCH = { every: 0.1, margin: 0.02, sharp: 1.2 };
/**
 * Standing: once he's been still `after` seconds (going under `speed` tiles
 * a second, nothing asked), only the standing clips are searched, so he
 * settles into the long idle instead of the quiet frames before a take sets
 * off (whose trajectory knows a run is coming); settled in it, a frame must
 * be `margin` better to take over, so its weight shifts and shuffles play on
 */
export const STAND = { after: 0.35, speed: 0.08, clips: ['idle'], margin: 0.6 };
/**
 * A locked foot lets go once the clip's foot is this far away (rig
 * numbers), or when holding it would bring the hips down more than `drop`;
 * it catches up with this half-life; a free foot clears the ground `look`
 * seconds ahead of it
 */
export const LOCK = { release: 0.2, drop: 0.06, catchUp: 0.08, look: 0.12 };
/** The lean into a bend (radians per tile a second², and at most), and the sprint's lean forward and extra swing */
export const LAYERS = { bank: 0.025, bankMax: 0.12, sprintLean: 0.09, sprintSwing: 0.35 };
/** The hips' lift with the feet: how much a free foot counts beside a held one, and the most (world numbers) */
export const LIFT = { free: 0.25, most: 0.3 };
/** The legs' reach, hip to ankle, at scale 1 */
const LEG_REACH = (THIGH + Math.abs(SHIN_GROUND + ANKLE_H)) * 0.998;
/**
 * The shown facing: pulled towards the springs' with a half-life from
 * `slow` (standing) to `fast` (at `at` rig numbers a second and over), never
 * more than `most` radians from it
 */
export const FACE = { slow: 0.22, fast: 0.07, at: 3, most: 0.9 };
/** The inertialization's half-life */
const BLEND = 0.09;
/**
 * In the air: a fall without a jump counts once he's `drop` over the ground
 * (world) or `after` seconds up; a flight's last `lead` frames play as the
 * ground comes up; it lands on its own touchdown unless another costs under
 * `margin` of it; for `settle` seconds after, the landing plays on unless a
 * search finds something under `margin` of it too. A landing faster than
 * `crouch` (world speed) squashes the hips down, up to `squash` (rig
 * numbers) at `hard`, the chest bowing `bow` radians a rig number of it; a
 * long fall raises the arms up to `arms` radians over `armsIn` seconds,
 * once the flight's frames have been used up for `armsAfter`
 */
export const AIR = { margin: 0.75, drop: 0.3, after: 0.18, lead: 4, settle: 0.3, crouch: 4.5, hard: 9.5, squash: 0.16, bow: 1.6, arms: 0.7, armsAfter: 0.15, armsIn: 0.6 };
/** The game's jump and gravity, when the input doesn't say (walk.ts's) */
const JUMP = 3.9;
const GRAVITY = 11.5;

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);
const LEGS = [
  [MB.legL, MB.shinL, MB.footL],
  [MB.legR, MB.shinR, MB.footR],
] as const;
/** The bones the sprint drives harder (arms and thighs) */
const SWING = [MB.armL, MB.armR, MB.foreL, MB.foreR, MB.legL, MB.legR];

interface Foot {
  locked: boolean;
  /** Let go while the clip still has it down: it waits for the next step to be held again */
  wait: boolean;
  /** Where the ball of the foot is held (world) */
  lock: THREE.Vector3;
  /** What's left of letting go: an offset from the clip's foot, easing to nothing */
  off: THREE.Vector3;
  offV: THREE.Vector3;
  /** How far the ball of the foot ended from its lock this frame (short of it at full stretch), world */
  slide: number;
  /** How far the ball of the foot has moved over the ground since it was held (what shows as a slide), world; -1 while it's free */
  drift: number;
  /** Where it was when it was held (world) */
  held: THREE.Vector3;
  /** Where the ankle is asked to go (world) */
  at: THREE.Vector3;
  /** The ground it's on, or clearing (over his own), and how fast that's moving; where it was held */
  rise: number;
  riseV: number;
  lockG: number;
}

/* ---------- Two-bone IK ---------- */

const vab = new THREE.Vector3();
const vcb = new THREE.Vector3();
const vac = new THREE.Vector3();
const vat = new THREE.Vector3();
const n1 = new THREE.Vector3();
const n2 = new THREE.Vector3();
const n3 = new THREE.Vector3();
const footW = new THREE.Quaternion();
const ax0 = new THREE.Vector3();
const qi = new THREE.Quaternion();
const r0 = new THREE.Quaternion();
const r1 = new THREE.Quaternion();
const ql = new THREE.Quaternion();
const acos = (x: number) => Math.acos(THREE.MathUtils.clamp(x, -1, 1));
/** Where the legs' soft reach starts (a share of their full length) */
const SOFT = 0.96;

/**
 * Bones a (hip), b (knee), c (ankle) reach for `t`, all in the figure's
 * frame: their local turns in `rot` change, `P` (the posed frame) is
 * brought up to date for them and the foot keeps its turn in the world.
 * The knee is a hinge (the thigh's own x axis, bending forward only: a
 * near-straight leg never flips backwards); the thigh then swings the
 * least it can to put the ankle on the target.
 */
export function twoBone(rot: Float32Array, P: Posed, a: number, b: number, c: number, t: THREE.Vector3) {
  const A = P.pos[a];
  const B = P.pos[b];
  const C = P.pos[c];
  const lab = vab.copy(B).sub(A).length();
  const lcb = vcb.copy(C).sub(B).length();
  // (soft at full stretch: past SOFT of the leg's length the ankle eases out towards the target,
  // so a target just out of reach never snaps the knee straight, nor back)
  const full = lab + lcb;
  const soft = full * SOFT;
  let lat = Math.max(Math.abs(lab - lcb) + 1e-4, vat.copy(t).sub(A).length());
  if (lat > soft) lat = soft + (full - soft) * (1 - Math.exp(-(lat - soft) / (full - soft)));
  lat = Math.min(lat, full * 0.9999);
  footW.copy(P.rot[c]);
  // The knee: from its bend now (signed about the hinge) to the bend that makes hip to ankle `lat`
  const hinge = ax0.copy(X).applyQuaternion(P.rot[a]);
  n1.copy(vab).normalize();
  n2.copy(vcb).normalize();
  const now = Math.atan2(n3.copy(n1).cross(n2).dot(hinge), n1.dot(n2));
  const want = Math.PI - acos((lab * lab + lcb * lcb - lat * lat) / (2 * lab * lcb));
  r1.setFromAxisAngle(hinge, want - now);
  P.rot[b].premultiply(r1);
  P.pos[c].copy(REST[c]).applyQuaternion(P.rot[b]).add(P.pos[b]);
  // The thigh: the least swing that takes the ankle to the target
  r0.setFromUnitVectors(vac.copy(P.pos[c]).sub(A).normalize(), n1.copy(t).sub(A).normalize());
  P.rot[a].premultiply(r0);
  P.rot[b].premultiply(r0);
  P.pos[b].copy(REST[b]).applyQuaternion(P.rot[a]).add(A);
  P.pos[c].copy(REST[c]).applyQuaternion(P.rot[b]).add(P.pos[b]);
  // Back to local turns (the foot keeping its turn in the world)
  qi.copy(P.rot[PARENT[a]]).invert();
  ql.copy(qi).multiply(P.rot[a]).normalize().toArray(rot, a * 4);
  qi.copy(P.rot[a]).invert();
  ql.copy(qi).multiply(P.rot[b]).normalize().toArray(rot, b * 4);
  qi.copy(P.rot[b]).invert();
  ql.copy(qi).multiply(footW).normalize().toArray(rot, c * 4);
  P.rot[c].copy(footW);
}

/** How far hips at `hip` must come down for a leg to reach `at` (world numbers) */
function reachNeed(at: THREE.Vector3, hip: THREE.Vector3, scale: number) {
  const h = Math.hypot(at.x - hip.x, at.z - hip.z);
  // (to where the soft reach starts: the leg reaches it all)
  const L = LEG_REACH * SOFT * scale;
  const vy = hip.y - at.y;
  return h < L ? vy - Math.sqrt(L * L - h * h) : vy;
}

/* ---------- The animator ---------- */

export function createAnimator(data: MoData) {
  const db: Database = buildDatabase(data);
  const inertia = createInertia(NB, BLEND);
  const rot = new Float32Array(NB * 4);
  const hips = new THREE.Vector3();
  const P = newPosed();
  const q = new Float32Array(FEATURES);
  const standing = Uint8Array.from(db.clips, (c) => (STAND.clips.includes(c.name.replace('~', '')) ? 1 : 0));
  let still = 0;
  let clip = 0;
  let t = 0;
  let searchIn = 0;
  let started = false;
  let lastGx = 0;
  let lastGz = 0;
  let bank = 0;
  let bankV = 0;
  let drop = 0;
  let dropV = 0;
  let lift = 0;
  let liftV = 0;
  let rate = 1;
  /** The way he's shown facing (the clip's turning, kept near the springs') */
  let face = 0;
  let lastCost = 0;
  let jumps = 0;
  // In the air: the flight playing, the speed it maps onto, how long the flight's frames have been
  // used up (a long fall); after landing, how long the landing still plays; the hips' squash
  let inAir = false;
  let flight = -1;
  let v0 = JUMP;
  let airT = 0;
  let held = 0;
  let settle = 0;
  let squash = 0;
  let squashV = 0;
  let squashH = 0.12;
  // Where a fall without a jump starts: each flight's top
  const falls = new Uint8Array(db.count);
  for (const f of db.flights) falls[db.start[f.clip] + Math.round((f.from + f.to) / 2)] = 1;
  const feet: Foot[] = [0, 1].map(() => ({ locked: false, wait: false, lock: new THREE.Vector3(), off: new THREE.Vector3(), offV: new THREE.Vector3(), slide: 0, drift: -1, held: new THREE.Vector3(), at: new THREE.Vector3(), rise: 0, riseV: 0, lockG: 0 }));

  // The middle of the run's swing, per swinging bone, for the sprint to push away from
  const mean = SWING.map(() => new THREE.Quaternion(0, 0, 0, 0));
  {
    const acc = SWING.map(() => new THREE.Vector4());
    for (let g = 0; g < db.count; g++) {
      if (db.speed[g] < 2) continue;
      const c = db.clips[db.clipOf[g]];
      const f = db.frameOf[g];
      SWING.forEach((b, i) => {
        const o = (f * NB + b) * 4;
        const s = acc[i].w * c.rot[o + 3] + acc[i].x * c.rot[o] + acc[i].y * c.rot[o + 1] + acc[i].z * c.rot[o + 2] < 0 ? -1 : 1;
        acc[i].x += c.rot[o] * s;
        acc[i].y += c.rot[o + 1] * s;
        acc[i].z += c.rot[o + 2] * s;
        acc[i].w += c.rot[o + 3] * s;
      });
    }
    SWING.forEach((_, i) => mean[i].set(acc[i].x, acc[i].y, acc[i].z, acc[i].w || 1).normalize());
  }

  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const lv = new THREE.Vector3();
  /** A clip's pose at frame time `ft`: turns, hips, and their velocities */
  const srcAv = Array.from({ length: NB }, () => new THREE.Vector3());
  const dstAv = Array.from({ length: NB }, () => new THREE.Vector3());
  const srcRot = new Float32Array(NB * 4);
  const dstRot = new Float32Array(NB * 4);
  const srcHips = new THREE.Vector3();
  const dstHips = new THREE.Vector3();
  const srcHv = new THREE.Vector3();
  const dstHv = new THREE.Vector3();
  function sample(ci: number, ft: number, out: Float32Array, outHips: THREE.Vector3, av?: THREE.Vector3[], hv?: THREE.Vector3) {
    const c = db.clips[ci];
    const last = c.frames - 1;
    const f0 = Math.min(last, Math.max(0, Math.floor(ft)));
    const f1 = Math.min(last, f0 + 1);
    const u = THREE.MathUtils.clamp(ft - f0, 0, 1);
    for (let b = 0; b < NB; b++) {
      qa.fromArray(c.rot, (f0 * NB + b) * 4);
      qb.fromArray(c.rot, (f1 * NB + b) * 4);
      qa.slerp(qb, u).toArray(out, b * 4);
    }
    outHips.set(
      c.hips[f0 * 3] + (c.hips[f1 * 3] - c.hips[f0 * 3]) * u,
      c.hips[f0 * 3 + 1] + (c.hips[f1 * 3 + 1] - c.hips[f0 * 3 + 1]) * u,
      c.hips[f0 * 3 + 2] + (c.hips[f1 * 3 + 2] - c.hips[f0 * 3 + 2]) * u,
    );
    if (av && hv) {
      const a = f1 === f0 ? Math.max(0, f0 - 1) : f0;
      const b = f1 === f0 ? f0 : f1;
      const dt = Math.max(1, b - a) / MOCAP_FPS;
      for (let k = 0; k < NB; k++) angVel(c.rot, (a * NB + k) * 4, c.rot, (b * NB + k) * 4, dt, av[k]);
      hv.set(c.hips[b * 3] - c.hips[a * 3], c.hips[b * 3 + 1] - c.hips[a * 3 + 1], c.hips[b * 3 + 2] - c.hips[a * 3 + 2]).multiplyScalar(1 / dt);
    }
  }
  /** The root's heading in a clip at frame time `ft` (eased between frames) */
  const yawAt = (ci: number, ft: number) => {
    const c = db.clips[ci];
    const f0 = Math.min(c.frames - 1, Math.max(0, Math.floor(ft)));
    const f1 = Math.min(c.frames - 1, f0 + 1);
    const y0 = c.root[f0 * 3 + 2];
    return y0 + wrap(c.root[f1 * 3 + 2] - y0) * THREE.MathUtils.clamp(ft - f0, 0, 1);
  };
  const at = (ci: number, ft: number) => db.start[ci] + Math.min(db.clips[ci].frames - 1, Math.max(0, Math.round(ft)));

  const pts = AHEAD.map(() => ({ x: 0, z: 0, face: 0 }));
  const ah = { x: 0, z: 0, face: 0 };
  function trajectory(inp: AnimInput) {
    const m = inp.move;
    const c = Math.cos(-face);
    const s = Math.sin(-face);
    AHEAD.forEach((k, i) => {
      ahead(m, inp.gx, inp.gz, k / MOCAP_FPS, ah);
      // Into his own frame (rig numbers)
      pts[i].x = (ah.x * c + ah.z * s) / inp.scale;
      pts[i].z = (-ah.x * s + ah.z * c) / inp.scale;
      pts[i].face = wrap(ah.face - face);
    });
  }

  const world = (p: THREE.Vector3, inp: AnimInput, out: THREE.Vector3) => {
    const c = Math.cos(face);
    const s = Math.sin(face);
    return out.set(inp.x + (p.x * c + p.z * s) * inp.scale, inp.y + p.y * inp.scale, inp.z + (-p.x * s + p.z * c) * inp.scale);
  };
  const local = (w: THREE.Vector3, inp: AnimInput, out: THREE.Vector3) => {
    const c = Math.cos(-face);
    const s = Math.sin(-face);
    const dx = (w.x - inp.x) / inp.scale;
    const dz = (w.z - inp.z) / inp.scale;
    return out.set(dx * c + dz * s, (w.y - inp.y) / inp.scale, -dx * s + dz * c);
  };

  const wv = new THREE.Vector3();
  const lt = new THREE.Vector3();
  const hipW = new THREE.Vector3();
  const wb = new THREE.Vector3();

  function update(inp: AnimInput) {
    const dt = Math.min(inp.dt, 0.1);
    const m = inp.move;
    if (!started) face = m.face;
    trajectory(inp);
    if (!started) {
      // The first frame: whatever fits best, no blend
      q.fill(0);
      const best = searchFor(true);
      clip = db.clipOf[best];
      t = db.frameOf[best];
      started = true;
      inertia.reset();
    }

    // 0. Into the air (a jump, or a fall off something higher than a kerb), and back down
    const grounded = inp.grounded ?? true;
    const vy = inp.vy ?? 0;
    const jumpV = inp.jump ?? JUMP;
    const over = grounded ? 0 : inp.y - inp.ground(inp.x, inp.z, inp.y + 0.3);
    airT = grounded ? 0 : airT + dt;
    if (!inAir && !grounded) {
      const jumping = vy > jumpV * 0.4;
      if (jumping || over > AIR.drop || airT > AIR.after) takeOff(jumping, vy, jumpV);
    }
    let landed = 0;
    if (inAir && grounded) {
      landed = Math.max(0, -vy);
      land();
    }

    // 1. Play on: matched to his speed on the ground; in the air, as far through the flight as
    // his rise and fall have gone (never backwards), its last frames as the ground comes up
    const g = at(clip, t);
    const animSpeed = db.speed[g];
    const simSpeed = Math.hypot(m.vx, m.vz) / inp.scale;
    const yaw0 = yawAt(clip, t);
    let force = false;
    if (inAir) {
      rate = 1;
      const F = db.flights[flight];
      const span = F.to - F.from;
      let want = F.from + THREE.MathUtils.clamp(0.5 * (1 - vy / v0), 0, 1) * span;
      const gr = inp.gravity ?? GRAVITY;
      const tl = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * gr * Math.max(0, over)))) / gr;
      want = Math.min(want, F.to - AIR.lead);
      if (vy < 0) want = Math.max(want, F.to - tl * MOCAP_FPS);
      want = Math.min(want, F.to - 0.5);
      held = want >= F.to - AIR.lead - 0.01 && tl * MOCAP_FPS > AIR.lead ? held + dt : Math.max(0, held - dt * 2);
      t = Math.max(t, Math.min(want, t + dt * MOCAP_FPS * 3));
    } else {
      rate = animSpeed > 0.4 && simSpeed > 0.25 ? THREE.MathUtils.clamp(simSpeed / animSpeed, RATE.min, RATE.max + RATE.sprint * inp.sprint) : 1;
      t += dt * MOCAP_FPS * rate;
      held = 0;
      if (t >= db.clips[clip].frames - 1) {
        t = db.clips[clip].frames - 1;
        force = true;
      }
      // (a ground clip never plays on into a jump: that's the air's to start)
      if (db.flightOf[at(clip, t)] >= 0) force = true;
    }
    // The way he's shown facing turns as the clip turns (a plant and a turn, steps round on the
    // spot), pulled towards the springs' facing: gently when he's slow, firmly at a run, and
    // never further from it than FACE.most
    face += wrap(yawAt(clip, t) - yaw0);
    const err = wrap(m.face - face);
    const h = THREE.MathUtils.lerp(FACE.slow, FACE.fast, THREE.MathUtils.clamp(simSpeed / FACE.at, 0, 1));
    face += err * (1 - Math.exp((-Math.LN2 * dt) / h));
    const left = wrap(m.face - face);
    if (Math.abs(left) > FACE.most) face = m.face - Math.sign(left) * FACE.most;
    face = wrap(face);

    // 2. Search (on the ground; while a landing plays out, only for something far better)
    settle = Math.max(0, settle - dt);
    // (standing: not in the air, nor while a landing plays out)
    still = !inAir && Math.hypot(m.vx, m.vz) < STAND.speed && Math.hypot(inp.gx, inp.gz) < 0.01 ? still + dt : 0;
    const stand = still > STAND.after && settle <= 0;
    // (settling: the first search standing still looks for the idle at once)
    if (stand && !standing[clip]) searchIn = 0;
    searchIn -= dt;
    const sharp = Math.hypot(inp.gx - lastGx, inp.gz - lastGz) > MATCH.sharp;
    lastGx = inp.gx;
    lastGz = inp.gz;
    if (!inAir && (force || searchIn <= 0 || sharp)) {
      searchIn = MATCH.every;
      const cur = at(clip, t);
      const best = searchFor(false, cur, stand ? standing : undefined);
      const curCost = db.open[cur] && !force ? cost(db, q, cur) : Infinity;
      const near = db.clipOf[best] === clip && Math.abs(db.frameOf[best] - t) < 3;
      const better = settle > 0 ? lastCost < curCost * AIR.margin : lastCost + (stand && standing[clip] ? STAND.margin : MATCH.margin) < curCost || (stand && !standing[clip]);
      if (best >= 0 && !near && (force || better)) cut(best);
    }

    // The pose, with what's left of any jump
    sample(clip, t, rot, hips);
    inertia.step(dt);
    inertia.apply(rot, hips);

    // The flight's own rise comes out: the game does the jump
    {
      const c0 = db.start[clip] + Math.min(db.clips[clip].frames - 1, Math.floor(t));
      const c1 = db.start[clip] + Math.min(db.clips[clip].frames - 1, Math.floor(t) + 1);
      const u = t - Math.floor(t);
      hips.y -= db.bump[c0] + (db.bump[c1] - db.bump[c0]) * u;
    }

    // 3. The sprint and the lean into bends (on the ground)
    if (inp.sprint > 0 && !inAir) {
      SWING.forEach((b, i) => {
        qa.fromArray(rot, b * 4).multiply(qb.copy(mean[i]).invert());
        logQ(qa, lv).multiplyScalar(1 + LAYERS.sprintSwing * inp.sprint);
        expQ(lv, qa).multiply(mean[i]).normalize().toArray(rot, b * 4);
      });
      for (const b of [MB.spine1, MB.spine2]) {
        qa.setFromAxisAngle(X, (LAYERS.sprintLean / 2) * inp.sprint).multiply(qb.fromArray(rot, b * 4));
        qa.toArray(rot, b * 4);
      }
    }
    // (sideways pull in his own frame: +x is his left)
    const c = Math.cos(-face);
    const s = Math.sin(-face);
    const pull = m.ax * c + m.az * s;
    const want = inAir ? 0 : THREE.MathUtils.clamp(-LAYERS.bank * pull, -LAYERS.bankMax, LAYERS.bankMax);
    [bank, bankV] = decay(bank - want, bankV, 0.08, dt);
    bank += want;
    if (Math.abs(bank) > 1e-4) {
      qa.setFromAxisAngle(Z, bank);
      hips.applyQuaternion(qa);
      qb.fromArray(rot, 0);
      qa.multiply(qb).toArray(rot, 0);
    }

    // A long fall: the flight's frames used up, the arms come up and out
    const arms = AIR.arms * THREE.MathUtils.smoothstep(held, AIR.armsAfter, AIR.armsAfter + AIR.armsIn);
    if (arms > 1e-3) {
      posed(rot, 0, hips.x, hips.y, hips.z, P);
      for (const [b, sgn] of [
        [MB.armL, -1],
        [MB.armR, 1],
      ] as const) {
        const pw = P.rot[PARENT[b]];
        qa.setFromAxisAngle(Z, sgn * arms);
        qb.copy(pw).invert().multiply(qa).multiply(pw).multiply(ql.fromArray(rot, b * 4));
        qb.normalize().toArray(rot, b * 4);
      }
    }
    // A hard landing: the hips squash down and the chest bows, then he comes back up
    if (landed > AIR.crouch) {
      const k = THREE.MathUtils.clamp((landed - AIR.crouch) / (AIR.hard - AIR.crouch), 0, 1);
      squashH = 0.1 + 0.08 * k;
      squashV = AIR.squash * (0.35 + 0.65 * k) * springRate(squashH) * Math.E;
      squash = 0;
    }
    [squash, squashV] = decay(squash, squashV, squashH, dt);
    // (the hips come down with the drop, below, once the feet are placed)
    if (squash > 1e-4) {
      for (const b of [MB.spine1, MB.spine2]) {
        qa.setFromAxisAngle(X, (AIR.bow / 2) * squash).multiply(qb.fromArray(rot, b * 4));
        qa.toArray(rot, b * 4);
      }
    }

    // 4. The feet: each locked by the ball (its place on the ground); the ankle goes where the
    // clip has it round the ball, so the heel still rolls up off the ground at push-off. A held
    // foot stands on the ground where it was put down; a free one clears the ground under it and
    // just ahead of it (eased up quickly, down gently: over a kerb's edge or a step's nose)
    const fg = inp.feet ?? inp.ground;
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    for (let i = 0; i < 2; i++) {
      const f = feet[i];
      // (in the air nothing's held)
      const cf = !inAir && db.contacts[clip][Math.min(db.clips[clip].frames - 1, Math.round(t)) * 2 + i] === 1;
      world(P.pos[FOOT_BONES[i]], inp, wv);
      world(P.pos[TOE_BONES[i]], inp, wb);
      // (held where the foot really is: the clip's, and what's left of catching up)
      if (!cf || (f.wait && Math.hypot(f.off.x, f.off.z) < 0.01 * inp.scale)) f.wait = false;
      if (cf && !f.locked && !f.wait) {
        f.locked = true;
        f.lock.set(wb.x + f.off.x, wb.y, wb.z + f.off.z);
        f.lockG = fg(f.lock.x, f.lock.z, inp.y + 0.3);
        f.off.set(0, 0, 0);
        f.offV.set(0, 0, 0);
      } else if (f.locked && (!cf || Math.hypot(f.lock.x - wb.x, f.lock.z - wb.z) > LOCK.release * inp.scale)) {
        f.locked = false;
        f.wait = cf;
        f.off.set(f.lock.x - wb.x, 0, f.lock.z - wb.z);
      }
      if (f.locked) {
        // (onto the ground it's held on: straight up onto it, never into it; down onto it
        // quickly, since what it cleared in the air may have been higher)
        const want = f.lockG - inp.y;
        if (want >= f.rise) {
          f.rise = want;
          f.riseV = 0;
        } else {
          [f.rise, f.riseV] = decay(f.rise - want, f.riseV, 0.03, dt);
          f.rise += want;
        }
        f.at.set(f.lock.x + wv.x - wb.x, wv.y + f.rise, f.lock.z + wv.z - wb.z);
      } else {
        for (const k of ['x', 'z'] as const) [f.off[k], f.offV[k]] = decay(f.off[k], f.offV[k], LOCK.catchUp, dt);
        const bx = wb.x + f.off.x;
        const bz = wb.z + f.off.z;
        // (in the air the legs are the flight's: nothing reaches for the ground)
        const ahead = inAir ? 0 : Math.max(fg(bx, bz, inp.y + 0.3), fg(bx + m.vx * LOCK.look, bz + m.vz * LOCK.look, inp.y + 0.3)) - inp.y;
        [f.rise, f.riseV] = decay(f.rise - ahead, f.riseV, ahead > f.rise ? 0.025 : 0.07, dt);
        f.rise += ahead;
        f.at.set(wv.x + f.off.x, wv.y + f.rise, wv.z + f.off.z);
      }
    }
    // The hips come up with the feet standing above his own ground, as a pelvis follows the
    // foot it stands on (a kerb before he's up it, the treads of a flight drawn over the even
    // ramp he walks up): held feet count, a free one a little
    const wsum = feet.reduce((a, f) => a + (f.locked ? 1 : LIFT.free), 0);
    const liftWant = inAir ? 0 : THREE.MathUtils.clamp(feet.reduce((a, f) => a + f.rise * (f.locked ? 1 : LIFT.free), 0) / wsum, 0, LIFT.most) / inp.scale;
    [lift, liftV] = decay(lift - liftWant, liftV, 0.06, dt);
    lift += liftWant;
    if (lift > 1e-5) {
      hips.y += lift;
      posed(rot, 0, hips.x, hips.y, hips.z, P);
    }
    // How far the hips must come down for each leg to reach; a foot held further than they can
    // come lets go and catches up instead
    let need = 0;
    for (let i = 0; i < 2; i++) {
      const f = feet[i];
      world(P.pos[TOE_BONES[i]], inp, wb);
      world(P.pos[LEGS[i][0]], inp, hipW);
      // (the hips can come down as far as they went up, and LOCK.drop more)
      const most = (LOCK.drop + lift) * inp.scale;
      let n = inAir ? 0 : reachNeed(f.at, hipW, inp.scale);
      if (f.locked && n > most) {
        f.locked = false;
        f.wait = true;
        f.off.set(f.lock.x - wb.x, 0, f.lock.z - wb.z);
        n = reachNeed(f.at, hipW, inp.scale);
      }
      if (inAir) n = 0;
      need = Math.max(need, Math.min(n, most));
    }
    // (down when a leg needs it, back up gently)
    const dropWant = Math.max(0, need) / inp.scale;
    [drop, dropV] = decay(drop - dropWant, dropV, dropWant > drop ? 0.04 : 0.09, dt);
    drop += dropWant;
    drop = Math.max(0, drop);
    if (drop + Math.max(0, squash) > 1e-5) {
      hips.y -= drop + Math.max(0, squash);
      posed(rot, 0, hips.x, hips.y, hips.z, P);
    }
    for (let i = 0; i < 2; i++) {
      const f = feet[i];
      local(f.at, inp, lt);
      twoBone(rot, P, LEGS[i][0], LEGS[i][1], LEGS[i][2], lt);
      // (the toe follows the foot)
      P.pos[TOE_BONES[i]].copy(REST[TOE_BONES[i]]).applyQuaternion(P.rot[LEGS[i][2]]).add(P.pos[LEGS[i][2]]);
      world(P.pos[TOE_BONES[i]], inp, wb);
      f.slide = f.locked ? Math.hypot(wb.x - f.lock.x, wb.z - f.lock.z) : 0;
      if (!f.locked) f.drift = -1;
      else if (f.drift < 0) {
        f.held.copy(wb);
        f.drift = 0;
      } else f.drift = Math.hypot(wb.x - f.held.x, wb.z - f.held.z);
    }
  }

  /** The query for here (the playing frame's pose with the springs' trajectory) and its best frame */
  function searchFor(fresh: boolean, cur = 0, only?: Uint8Array, frames?: Uint8Array) {
    if (fresh) q.fill(0);
    else for (let k = 0; k < 15; k++) q[k] = db.feat[cur * FEATURES + k];
    setTrajectory(db, q, pts);
    const r = search(db, q, only, frames);
    lastCost = r.cost;
    return r.g;
  }
  /** Over to frame `g`, what was showing inertialized away */
  function cut(g: number) {
    sample(clip, t, srcRot, srcHips, srcAv, srcHv);
    // (the flight's rise is the game's: both sides without it)
    srcHips.y -= db.bump[at(clip, t)];
    clip = db.clipOf[g];
    t = db.frameOf[g];
    sample(clip, t, dstRot, dstHips, dstAv, dstHv);
    dstHips.y -= db.bump[g];
    inertia.jump(srcRot, srcAv, srcHips, srcHv, dstRot, dstAv, dstHips, dstHv);
    jumps++;
  }
  /** Into the air: a jump from the take-off that carries on best from here; a fall from a flight's top */
  function takeOff(jumping: boolean, vy: number, jumpV: number) {
    const g = searchFor(false, at(clip, t), undefined, jumping ? db.takeoff : falls);
    if (g < 0) return;
    cut(g);
    inAir = true;
    flight = db.flightOf[g];
    v0 = jumping ? Math.max(vy, jumpV * 0.5) : jumpV;
    held = 0;
    for (const f of feet) f.locked = f.wait = false;
  }
  /**
   * Down: the flight's own touchdown, playing straight on, unless another
   * carries on better by `AIR.margin` (stopping where it runs on, or running
   * on where it stops)
   */
  function land() {
    const F = db.flights[flight];
    inAir = false;
    flight = -1;
    settle = AIR.settle;
    searchIn = MATCH.every;
    const g = searchFor(false, at(clip, t), undefined, db.touchdown);
    const own = db.start[F.clip] + F.to;
    if (g >= 0 && g !== own && lastCost < cost(db, q, own) * AIR.margin) cut(g);
    else t = Math.max(t, F.to);
  }

  return {
    rot,
    hips,
    db,
    feet,
    update,
    /** The way he's shown facing (world yaw): place the figure with it */
    get face() {
      return face;
    },
    /** Start again from scratch (walking starts, a teleport) */
    reset() {
      started = false;
      inertia.reset();
      for (const f of feet) {
        f.locked = f.wait = false;
        f.drift = -1;
        f.off.set(0, 0, 0);
        f.offV.set(0, 0, 0);
      }
      drop = dropV = bank = bankV = lift = liftV = squash = squashV = 0;
      inAir = false;
      flight = -1;
      settle = held = airT = 0;
      for (const f of feet) f.rise = f.riseV = 0;
    },
    /** What it's doing, for the lab */
    get debug() {
      return { clip: db.clips[clip].name, frame: t, rate, cost: lastCost, blend: inertia.left, jumps, drop, lift, bank, air: inAir, squash, arms: AIR.arms * THREE.MathUtils.smoothstep(held, AIR.armsAfter, AIR.armsAfter + AIR.armsIn) };
    },
  };
}
export type Animator = ReturnType<typeof createAnimator>;

const qw = new THREE.Quaternion();
const vw = new THREE.Vector3();
/**
 * Put the animator's pose on a figure's bones (after its own `update()`,
 * which has posed the fingers and anything held), `w` of the way from the
 * pose it has (1 all of it)
 */
export function applyTo(sk: Skeleton, rot: Float32Array, hips: THREE.Vector3, w = 1) {
  for (let i = 0; i < NB; i++) {
    const b = sk.bones[MOCAP_BONES[i]];
    qw.fromArray(rot, i * 4);
    if (w >= 1) b.quaternion.copy(qw);
    else b.quaternion.slerp(qw, w);
  }
  const h = sk.bones.hips;
  if (w >= 1) h.position.copy(hips);
  else h.position.lerp(vw.copy(hips), w);
}

const qx = new THREE.Quaternion();
const qyaw = new THREE.Quaternion();
/** Turn the head (a share of it the neck) by `yaw` and `pitch` on top of the pose, `w` of the way: looking where the camera looks */
export function addLook(sk: Skeleton, yaw: number, pitch: number, w = 1) {
  for (const [b, k] of [
    [sk.bones.neck, 0.35],
    [sk.bones.head, 0.65],
  ] as const) {
    qyaw.setFromAxisAngle(UPV, yaw * k * w);
    qx.setFromAxisAngle(X, -pitch * k * w);
    b.quaternion.multiply(qyaw).multiply(qx);
  }
}
const UPV = new THREE.Vector3(0, 1, 0);
