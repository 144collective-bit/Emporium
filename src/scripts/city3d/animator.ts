/*
 * Degen's animation from motion capture (DOM-free, tested in
 * tests/animator.test.ts): each frame
 *
 * 1. the playing clip runs on, a touch faster or slower to match the speed
 *    he's going (`RATE`); faster than the capture, most of the difference
 *    goes into the length of his steps, as a sprinter's does (`WARP`): he
 *    reaches a little further, a foot on the ground plays fast enough to
 *    stay put under him (the contact gets shorter), the time in the air
 *    plays slower (more hang time, so each step carries further) and a
 *    swinging knee drives higher; his legs turn over only a little quicker;
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
import { FOOT_BONES, MB, MOCAP_BONES, MOCAP_FPS, NB, type MoData, PARENT, type Posed, REST, TOE_BONES, newPosed, posed, rootAt, tagged } from './mocap';
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
  /** The way the springs are turning him to face, when it isn't where he's going (aiming, peeking: where the camera looks) */
  faceGoal?: number;
  /** How far into a crouch (0 standing to 1 crouched; walk.ts eases it) */
  crouch?: number;
}

/** How much faster or slower a clip may play to match his speed, and how much more flat out */
export const RATE = { min: 0.8, max: 1.15, sprint: 0.25 };
/**
 * Longer steps: of how much faster he goes than the clip (the ratio), the
 * share `cadence` (as a power) goes into how quickly his legs turn over and
 * the share `reach` into reaching further (the feet's places scaled about
 * the hips along the way he's going, at most `reachMost` times; the hips
 * may come down `drop` more for each time further; only as far into a
 * sprint as he is, and none while he (or the clip) speeds up
 * faster than `speeding` rig numbers a second², eased in from its first);
 * the rest into the
 * time: a foot on the ground plays fast enough to stay put (at most
 * `stance` times the clip's speed), the air slower (no slower than `air` of
 * the turnover) to keep it; the rate eases with the half-life `ease`, the
 * reach with `reachEase`. The share of a clip's time with a foot down is
 * looked at over `window` frames either side; past `walking` of it (a walk)
 * the rate is even. A swinging foot lifts `knee` more over its height off
 * the ground for each time faster than the clip (at most `kneeMost` times)
 */
export const WARP = { cadence: 0.3, reach: 0.3, reachMost: 1.2, speeding: [2, 6], drop: 0.3, stance: 2.2, air: 0.3, ease: 0.04, reachEase: 0.12, window: 15, walking: 0.93, knee: 0.8, kneeMost: 1 };
/** Searching: how often, how much better a frame must be to take over, how sharp a change of the stick searches at once, and for how long after it every frame is searched (a poor first match at a pivot is replaced at once, not a tenth of a second later) */
export const MATCH = { every: 0.1, margin: 0.02, sharp: 1.2, after: 0.15 };
/**
 * Standing: once he's been still `after` seconds (going under `speed` tiles
 * a second, nothing asked), only the standing clips are searched, so he
 * settles into the idles (`clips`: calm loops of subject 143 standing; the
 * old long idle turned round and round, so he cut back to its first second
 * every 0.8 s with a snap of the head) instead of the quiet frames before a
 * take sets off (whose trajectory knows a run is coming); settled in one, it
 * plays through (`margin`: nothing takes over until it ends, so its weight
 * shifts and gestures play out), and the next is one of the others, so the
 * idles take turns.
 * Not while the springs turn him further than `turn` radians from the way
 * he's shown facing (aiming round: the turns on the spot are searched)
 */
export const STAND = { after: 0.35, speed: 0.08, tag: 'stand', margin: 1e9, turn: 0.35 };
/**
 * A locked foot lets go once the clip's foot is this far away (rig
 * numbers), or when holding it would bring the hips down more than `drop`;
 * it catches up with this half-life; a free foot clears the ground `look`
 * seconds ahead of it; the hips come down for a leg that can't reach with
 * the half-life `down` (`downStart` speeding up hard: at a start the body
 * pulls away from the planted foot faster than the take's does, and a slow
 * answer let the foot slide 2 cm; at a pivot a quick one jerked the knee)
 * and back up with `up`
 */
export const LOCK = { release: 0.2, drop: 0.06, catchUp: 0.08, look: 0.12, down: 0.04, downStart: 0.015, up: 0.09 };
/** The lean into a bend (radians per tile a second², and at most), and the sprint's lean forward and extra swing */
export const LAYERS = { bank: 0.025, bankMax: 0.12, sprintLean: 0.09, sprintSwing: 0.55 };
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
/** How far the ball of a foot may sink under the ground (rig numbers: its joint sits about at the sole) */
const BALL_UNDER = 0.012;
/** The inertialization's half-life; between two standing takes a longer one (a change of stance, not a flinch) */
const BLEND = 0.09;
export const STAND_BLEND = 0.3;
/** The head and neck blend this many times longer at a cut (a 60° head turn from a standing take into a set-off whipped the head at 10 rad/s; a person's glance is under 6) */
export const HEAD_BLEND = 2.5;
/**
 * The legs' hand-over: when he leaves the ground the leg IK's hold on the
 * feet comes off at once; what the legs showed the frame before eases into
 * what they show now with this half-life, so a knee never snaps (it turned
 * 0.8 rad in a frame taking off)
 */
const LEG_BLEND = 0.05;
const LEG_BONES = [MB.legL, MB.shinL, MB.footL, MB.legR, MB.shinR, MB.footR];
/**
 * A free foot reaches no further down than `kerb` (world: a step) under his
 * ground, over an edge or before it's a fall. In the air: a fall without a jump counts once he's `drop` over the ground
 * (world) or `after` seconds up; a flight's last `lead` frames play as the
 * ground comes up; it lands on its own touchdown unless another costs under
 * `margin` of it; for `settle` seconds after, the landing plays on unless a
 * search finds something under `margin` of it too. A landing faster than
 * `crouch` (world speed) squashes the hips down, up to `squash` (rig
 * numbers) at `hard`, the chest bowing `bow` radians a rig number of it; a
 * long fall raises the arms up to `arms` radians over `armsIn` seconds,
 * once the flight's frames have been used up for `armsAfter`
 */
export const AIR = { kerb: 0.3, margin: 0.75, drop: 0.3, after: 0.18, lead: 4, settle: 0.3, crouch: 4.5, hard: 9.5, squash: 0.16, bow: 1.6, arms: 0.7, armsAfter: 0.15, armsIn: 0.6 };
/**
 * Crouching (Phase 5): past `at` of the way into a crouch, moving, only the
 * crouched walks are searched (the takes tagged `tag`), and standing up, never them;
 * standing still crouched, the idle plays with the crouch laid over it: the
 * hips `drop` lower (the legs' IK bends the knees, the feet stay put), the
 * spine leant `lean` forward and the head back up, eased in and out over
 * `ease` (a half-life) as the clip changes
 */
export const CROUCH = { tag: 'crouch', at: 0.5, drop: 0.16, lean: 0.42, ease: 0.1 };
/**
 * Standing up straight (the owner's call: the idle's actor stood with his
 * knees bent 20-30°, leaning back, his head tilted): standing still, the
 * hips rise (at most `most`, rig numbers) until the held legs reach `reach`
 * of their length, the legs' IK softening only past `soft` of it, so the
 * knees come nearly straight (the other leg keeps its bend: the weight on
 * one); the spine comes `upright` of the way to over the hips, the head
 * `level` of the way to level, the arms in `arms` radians to hang by his
 * sides and the elbows `elbows` of the way straight (the idles' actor holds
 * a runner's arms, bent 30-40°); eased in over `ease` (a half-life) and out
 * over `out` (quickly: a start's lean is the take's own)
 */
export const STANCE = { most: 0.045, reach: 0.999, soft: 0.997, upright: 0.75, level: 0.75, arms: 0.07, elbows: 0.45, ease: 0.2, out: 0.05, upEase: 0.12 };
/**
 * Breathing (the revamp's Phase 2): standing still the ribcage tilts back
 * and up a touch and settles, `rate` breaths a second (wandering `wander`
 * of it, so no two breaths are quite alike), `spine` radians at the upper
 * spine and `chest` at the chest, the neck and head taking it back out so
 * the head stays level; laid on as far into standing straight as he is
 */
export const BREATH = { rate: 0.24, wander: 0.15, spine: 0.012, chest: 0.014 };
/** The standing takes' wander (the weight shifts) eased in and out with this half-life */
export const WANDER = { ease: 0.25 };
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
  /** Where the clip has the ball of the foot this frame (world) */
  ball: THREE.Vector3;
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
/** Where the legs' soft reach starts (a share of their full length; 0.96 held every planted knee bent 30°) */
const SOFT = 0.98;

/**
 * Bones a (hip), b (knee), c (ankle) reach for `t`, all in the figure's
 * frame: their local turns in `rot` change, `P` (the posed frame) is
 * brought up to date for them and the foot keeps its turn in the world.
 * The knee is a hinge (the thigh's own x axis, bending forward only: a
 * near-straight leg never flips backwards); the thigh then swings the
 * least it can to put the ankle on the target. Past `softAt` of the leg's
 * length the reach is soft.
 */
export function twoBone(rot: Float32Array, P: Posed, a: number, b: number, c: number, t: THREE.Vector3, softAt = SOFT) {
  const A = P.pos[a];
  const B = P.pos[b];
  const C = P.pos[c];
  const lab = vab.copy(B).sub(A).length();
  const lcb = vcb.copy(C).sub(B).length();
  // (soft at full stretch: past SOFT of the leg's length the ankle eases out towards the target,
  // so a target just out of reach never snaps the knee straight, nor back)
  const full = lab + lcb;
  const soft = full * softAt;
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
  inertia.slow[MB.neck] = inertia.slow[MB.head] = HEAD_BLEND;
  const rot = new Float32Array(NB * 4);
  const hips = new THREE.Vector3();
  const P = newPosed();
  const q = new Float32Array(FEATURES);
  const standing = Uint8Array.from(db.clips, (c) => (tagged(c, STAND.tag) ? 1 : 0));
  /** Settled in a standing clip, the next is looked for among the others (each idle's own loop, then another: no one idle over and over) */
  // (at a standing take's end, another take: not itself and not its mirror, so the idles take turns)
  const takeOf = (c: { name: string }) => c.name.replace(/~$/, '');
  const takes = [...new Set(db.clips.map(takeOf))];
  const takeIdx = db.clips.map((c) => takes.indexOf(takeOf(c)));
  /** When each take was last cut to (a count of cuts), for the standing takes' turns */
  const takeStamp = new Float64Array(takes.length);
  let cuts = 0;
  /**
   * The standing clips to search next: not the one playing (nor its mirror), and of the rest the take least
   * recently played (so the idles take turns and every one's weight shifts come round); coming to a stand from
   * anything else, all of them (the nearest pose)
   */
  function standNext(): Uint8Array {
    if (!standing[clip]) return standing;
    let best = Infinity;
    for (let j = 0; j < db.clips.length; j++) if (standing[j] && takeIdx[j] !== takeIdx[clip]) best = Math.min(best, takeStamp[takeIdx[j]]);
    return standing.map((v, j) => (v && takeIdx[j] !== takeIdx[clip] && takeStamp[takeIdx[j]] === best ? 1 : 0));
  }
  const crouching = Uint8Array.from(db.clips, (c) => (tagged(c, CROUCH.tag) ? 1 : 0));
  const upright = crouching.map((v) => 1 - v);
  /** Crouched (past CROUCH.at), and how much of the crouch is laid over a clip that isn't one */
  let crouched = false;
  let crouchW = 0;
  /** How far into standing up straight he is (STANCE, eased) */
  let tallW = 0;
  /** How far the stance has the hips up (eased: a foot let go of changes what the legs allow at once) */
  let stanceUp = 0;
  /** The breath's phase (turns), and its rate's wander */
  let breathT = 0;
  let breathK = 1;
  let still = 0;
  let clip = 0;
  let t = 0;
  let searchIn = 0;
  let started = false;
  let lastGx = 0;
  let lastGz = 0;
  /** How long a sharp change of the stick still has every frame searched */
  let sharpLeft = 0;
  /** How hard he's speeding up along his way (0 to 1: a start) */
  let starting = 0;
  /**
   * Standing still, a take's own root motion (the actor's pelvis wandering
   * over his planted feet: a weight shift) carried into the hips, from
   * where the take's root was when it took over (`WANDER`): the sim moves
   * the figure, so it would be lost; eased in standing and out moving
   */
  const wander = new THREE.Vector3();
  let wanderX0 = 0;
  let wanderZ0 = 0;
  let wanderYaw0 = 0;
  let wanderW = 0;
  let bank = 0;
  /** How far into the sprint's layers he is (eased) */
  let sprintW = 0;
  let bankV = 0;
  let drop = 0;
  let dropV = 0;
  let lift = 0;
  let liftV = 0;
  let rate = 1;
  /** How much further he reaches than the clip (stride warping), how much faster than it he's going, the rate eased towards, and the way he's going in his own frame */
  let warp = 1;
  let faster = 1;
  let rateWant = 1;
  /** The turnover he's had lately (the rate averaged over about half a second), and the trim on the air's rate */
  let turnLately = 1;
  let airK = 1;
  const along = new THREE.Vector3(0, 0, 1);
  // Each frame's share of its clip's time round it with a foot down
  const downShare = new Float32Array(db.count);
  db.clips.forEach((c, ci) => {
    const con = db.contacts[ci];
    for (let f = 0; f < c.frames; f++) {
      let d = 0;
      let n = 0;
      for (let k = Math.max(0, f - WARP.window); k <= Math.min(c.frames - 1, f + WARP.window); k++, n++) if (con[k * 2] || con[k * 2 + 1]) d++;
      downShare[db.start[ci] + f] = d / n;
    }
  });
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
  const feet: Foot[] = [0, 1].map(() => ({ locked: false, wait: false, lock: new THREE.Vector3(), off: new THREE.Vector3(), offV: new THREE.Vector3(), slide: 0, drift: -1, held: new THREE.Vector3(), at: new THREE.Vector3(), rise: 0, riseV: 0, lockG: 0, ball: new THREE.Vector3() }));

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
      ahead(m, inp.gx, inp.gz, k / MOCAP_FPS, ah, inp.faceGoal);
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
  const wa = new THREE.Vector3();
  const wt = new THREE.Vector3();
  /** Foot `i`'s ankle and ball (in his frame), reaching further and a swinging foot lifted with the knee's drive: into `wa` and `wt` */
  function warped(i: number) {
    const ankle = P.pos[FOOT_BONES[i]];
    wa.copy(ankle);
    wt.copy(P.pos[TOE_BONES[i]]);
    const k = ((ankle.x - P.pos[0].x) * along.x + (ankle.z - P.pos[0].z) * along.z) * (warp - 1);
    wa.addScaledVector(along, k);
    wt.addScaledVector(along, k);
    const up = Math.max(0, ankle.y - ANKLE_H) * WARP.knee * Math.min(WARP.kneeMost, faster - 1);
    wa.y += up;
    wt.y += up;
  }
  const lt = new THREE.Vector3();
  const hipW = new THREE.Vector3();
  const hu = new THREE.Vector3();
  /** The legs' hand-over: what they showed last frame, and the offsets easing away (LEG_BLEND) */
  const legOut = new Float32Array(LEG_BONES.length * 4);
  const legOff = LEG_BONES.map(() => new THREE.Vector3());
  const legOffV = LEG_BONES.map(() => new THREE.Vector3());
  let legShown = false;
  let legAirWas = false;
  /** Turn bone `b` by `pitch` (forward, about his x) and `roll` (about his z) in his own frame, whatever its parent's turn */
  function turnWorld(b: number, pitch: number, roll: number) {
    const pw = P.rot[PARENT[b]];
    qa.setFromAxisAngle(X, pitch).multiply(qb.setFromAxisAngle(Z, roll));
    qb.copy(pw).invert().multiply(qa).multiply(pw).multiply(ql.fromArray(rot, b * 4));
    qb.normalize().toArray(rot, b * 4);
  }
  const wb = new THREE.Vector3();

  function update(inp: AnimInput) {
    const dt = Math.min(inp.dt, 0.1);
    const m = inp.move;
    if (!started) face = m.face;
    trajectory(inp);
    if (!started) {
      // The first frame: whatever fits best, no blend
      q.fill(0);
      crouched = (inp.crouch ?? 0) > CROUCH.at;
      const best = searchFor(true, 0, crouched ? crouching : upright);
      clip = db.clipOf[best];
      t = db.frameOf[best];
      {
        const r = rootAt(db.clips[clip], Math.round(t));
        wanderX0 = r.x;
        wanderZ0 = r.z;
        wanderYaw0 = r.yaw;
      }
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
      starting = 0;
      rate = 1;
      warp += (1 - warp) * (1 - Math.exp((-Math.LN2 * dt) / WARP.reachEase));
      faster += (1 - faster) * (1 - Math.exp((-Math.LN2 * dt) / WARP.reachEase));
      const F = db.flights[flight];
      const span = F.to - F.from;
      let want = F.from + THREE.MathUtils.clamp(0.5 * (1 - vy / v0), 0, 1) * span;
      const gr = inp.gravity ?? GRAVITY;
      const tl = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * gr * Math.max(0, over)))) / gr;
      want = Math.min(want, F.to - AIR.lead);
      if (vy < 0) want = Math.max(want, F.to - tl * MOCAP_FPS);
      want = Math.min(want, F.to - 0.5);
      held = want >= F.to - AIR.lead - 0.01 && tl * MOCAP_FPS > AIR.lead ? held + dt : Math.max(0, held - dt * 2);
      // (the push off the ground plays at about its own speed; the flight catches up faster)
      t = Math.max(t, Math.min(want, t + dt * MOCAP_FPS * (t < F.from ? 1.2 : 3)));
    } else {
      // (of the difference in speed: a share in the turnover, the rest in the steps' length: a foot
      // on the ground plays at the full ratio so it stays put, the air slower)
      const ratio = animSpeed > 0.4 && simSpeed > 0.25 ? simSpeed / animSpeed : 1;
      const turnover = THREE.MathUtils.clamp(ratio ** WARP.cadence, RATE.min, RATE.max + RATE.sprint * inp.sprint);
      const share = downShare[g];
      const fc = db.contacts[clip][Math.min(db.clips[clip].frames - 1, Math.round(t)) * 2];
      const down = fc === 1 || db.contacts[clip][Math.min(db.clips[clip].frames - 1, Math.round(t)) * 2 + 1] === 1;
      // (no reaching out while he's speeding up hard: a start is short, quick steps)
      // (nor while the clip is: a capture's start runs on longer than his springs' does)
      const ci0 = db.start[clip];
      const cf0 = Math.min(db.clips[clip].frames - 1, Math.max(0, Math.round(t)));
      const clipSpeeding = ((db.speed[ci0 + Math.min(db.clips[clip].frames - 1, cf0 + 3)] - db.speed[ci0 + Math.max(0, cf0 - 3)]) * MOCAP_FPS) / 6;
      const speeding = Math.max(clipSpeeding, simSpeed > 0.25 ? (m.ax * m.vx + m.az * m.vz) / (Math.hypot(m.vx, m.vz) * inp.scale) : 0);
      const steady = 1 - THREE.MathUtils.smoothstep(speeding, WARP.speeding[0], WARP.speeding[1]);
      starting = 1 - steady;
      // (and only into a sprint: at a run the time alone makes up the difference)
      const reach = ratio > 1 ? 1 + (Math.min(WARP.reachMost, ratio ** WARP.reach) - 1) * steady * inp.sprint : 1;
      const onGround = Math.min(ratio / reach, WARP.stance);
      // (not while a landing plays out: it's absorbing the drop, not running)
      if (onGround > turnover * 1.01 && share < WARP.walking && settle <= 0) {
        // (the air's rate worked out from the clip's share on the ground, trimmed by how far the
        // turnover he's had lately is off the one wanted)
        const inAirRate = THREE.MathUtils.clamp(airK * ((1 - share) / Math.max(1e-3, 1 / turnover - share / onGround)), turnover * WARP.air, turnover);
        rateWant = down ? onGround : inAirRate;
        airK = THREE.MathUtils.clamp(airK * Math.exp(-(turnLately - turnover) * dt * 3), 0.3, 3);
      } else rateWant = THREE.MathUtils.clamp(ratio / reach, RATE.min, RATE.max + RATE.sprint * inp.sprint);
      rate += (rateWant - rate) * (1 - Math.exp((-Math.LN2 * dt) / WARP.ease));
      turnLately += (rate - turnLately) * (1 - Math.exp(-dt / 0.6));
      warp += (reach - warp) * (1 - Math.exp((-Math.LN2 * dt) / WARP.reachEase));
      faster += (Math.max(1, ratio) - faster) * (1 - Math.exp((-Math.LN2 * dt) / WARP.reachEase));
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
    still = !inAir && Math.hypot(m.vx, m.vz) < STAND.speed && Math.hypot(inp.gx, inp.gz) < 0.01 && Math.abs(wrap(m.face - face)) < STAND.turn ? still + dt : 0;
    const stand = still > STAND.after && settle <= 0;
    // (settling: the first search standing still looks for the idle at once)
    if (stand && !standing[clip]) searchIn = 0;
    // (crouching or standing up on the move: over to the other kind of walk at once)
    crouched = (inp.crouch ?? 0) > CROUCH.at;
    const wrongKind = !stand && !inAir && (crouched ? !crouching[clip] : crouching[clip] === 1);
    if (wrongKind) searchIn = 0;
    searchIn -= dt;
    const sharp = Math.hypot(inp.gx - lastGx, inp.gz - lastGz) > MATCH.sharp;
    lastGx = inp.gx;
    lastGz = inp.gz;
    if (sharp) sharpLeft = MATCH.after;
    sharpLeft = Math.max(0, sharpLeft - dt);
    if (!inAir && (force || searchIn <= 0 || sharp || sharpLeft > 0)) {
      searchIn = MATCH.every;
      const cur = at(clip, t);
      const best = searchFor(false, cur, stand ? standNext() : crouched ? crouching : upright);
      const curCost = db.open[cur] && !force ? cost(db, q, cur) : Infinity;
      const near = db.clipOf[best] === clip && Math.abs(db.frameOf[best] - t) < 3;
      const better = wrongKind || (settle > 0 ? lastCost < curCost * AIR.margin : lastCost + (stand && standing[clip] ? STAND.margin : MATCH.margin) < curCost || (stand && !standing[clip]));
      if (best >= 0 && !near && (force || better)) cut(best);
    }

    // The pose, with what's left of any jump
    sample(clip, t, rot, hips);
    inertia.step(dt);
    inertia.apply(rot, hips);
    // The standing take's wander (WANDER), in his frame: the take's root since it took over, turned by the take's heading then
    wanderW += ((stand && standing[clip] ? 1 : 0) - wanderW) * (1 - Math.exp((-Math.LN2 * dt) / WANDER.ease));
    if (wanderW > 1e-3) {
      const r = rootAt(db.clips[clip], Math.min(db.clips[clip].frames - 1, Math.max(0, Math.round(t))));
      const cw = Math.cos(-wanderYaw0);
      const sw = Math.sin(-wanderYaw0);
      const dx = r.x - wanderX0;
      const dz = r.z - wanderZ0;
      wander.set((dx * cw + dz * sw) * wanderW, 0, (-dx * sw + dz * cw) * wanderW);
      hips.x += wander.x;
      hips.z += wander.z;
    } else wander.set(0, 0, 0);

    // The flight's own rise comes out: the game does the jump
    {
      const c0 = db.start[clip] + Math.min(db.clips[clip].frames - 1, Math.floor(t));
      const c1 = db.start[clip] + Math.min(db.clips[clip].frames - 1, Math.floor(t) + 1);
      const u = t - Math.floor(t);
      hips.y -= db.bump[c0] + (db.bump[c1] - db.bump[c0]) * u;
    }

    // 3. The sprint and the lean into bends (on the ground; eased, so leaving it never snaps)
    sprintW += ((inAir ? 0 : inp.sprint) - sprintW) * (1 - Math.exp((-Math.LN2 * dt) / 0.08));
    if (sprintW > 1e-3) {
      SWING.forEach((b, i) => {
        qa.fromArray(rot, b * 4).multiply(qb.copy(mean[i]).invert());
        logQ(qa, lv).multiplyScalar(1 + LAYERS.sprintSwing * sprintW);
        expQ(lv, qa).multiply(mean[i]).normalize().toArray(rot, b * 4);
      });
      for (const b of [MB.spine1, MB.spine2]) {
        qa.setFromAxisAngle(X, (LAYERS.sprintLean / 2) * sprintW).multiply(qb.fromArray(rot, b * 4));
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

    // The crouch over a clip that isn't one (standing still, turning on the spot): the hips down
    // (the feet's IK, below, bends the knees), the spine forward, the head back up
    crouchW += ((crouched && !crouching[clip] && !inAir ? 1 : 0) - crouchW) * (1 - Math.exp((-Math.LN2 * dt) / CROUCH.ease));
    if (crouchW > 1e-3) {
      hips.y -= CROUCH.drop * crouchW;
      for (const b of [MB.spine1, MB.spine2]) {
        qa.setFromAxisAngle(X, (CROUCH.lean / 2) * crouchW).multiply(qb.fromArray(rot, b * 4));
        qa.toArray(rot, b * 4);
      }
      for (const b of [MB.neck, MB.head]) {
        qa.setFromAxisAngle(X, (-CROUCH.lean / 2) * crouchW).multiply(qb.fromArray(rot, b * 4));
        qa.toArray(rot, b * 4);
      }
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
    // (the way he's going, in his own frame, for the reach)
    {
      const c = Math.cos(-face);
      const s = Math.sin(-face);
      const sp = Math.hypot(m.vx, m.vz);
      if (sp > 0.05) along.set((m.vx * c + m.vz * s) / sp, 0, (-m.vx * s + m.vz * c) / sp);
    }
    for (let i = 0; i < 2; i++) {
      const f = feet[i];
      // (in the air nothing's held)
      const cf = !inAir && db.contacts[clip][Math.min(db.clips[clip].frames - 1, Math.round(t)) * 2 + i] === 1;
      // The foot where the clip has it, reaching further along the way he's going about the hips
      // and a swinging one lifted higher the faster he goes than the clip (the knee driving; the
      // ankle and the ball moved together, so the foot keeps its shape)
      warped(i);
      world(wa, inp, wv);
      world(wt, inp, wb);
      f.ball.copy(wb);
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
        // (and never with the ball of the foot under it: a blend between two clips can put the
        // one's ankle with the other's tilt)
        const ball = wb.y + f.rise;
        if (ball < f.lockG - BALL_UNDER * inp.scale) f.at.y += f.lockG - BALL_UNDER * inp.scale - ball;
      } else {
        for (const k of ['x', 'z'] as const) [f.off[k], f.offV[k]] = decay(f.off[k], f.offV[k], LOCK.catchUp, dt);
        const bx = wb.x + f.off.x;
        const bz = wb.z + f.off.z;
        // (in the air the legs are the flight's: nothing reaches for the ground)
        // (never further down than a step: over an edge, or off the ground before it's a fall)
        const ahead = inAir ? 0 : Math.max(-AIR.kerb, Math.max(fg(bx, bz, inp.y + 0.3), fg(bx + m.vx * LOCK.look, bz + m.vz * LOCK.look, inp.y + 0.3)) - inp.y);
        [f.rise, f.riseV] = decay(f.rise - ahead, f.riseV, ahead > f.rise ? 0.025 : 0.07, dt);
        f.rise += ahead;
        f.at.set(wv.x + f.off.x, wv.y + f.rise, wv.z + f.off.z);
        if (!inAir) {
          const g0 = fg(bx, bz, inp.y + 0.3) - BALL_UNDER * inp.scale;
          const ball = wb.y + f.rise;
          if (ball < g0) f.at.y += g0 - ball;
        }
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
      warped(i);
      world(wt, inp, wb);
      world(P.pos[LEGS[i][0]], inp, hipW);
      // (the hips can come down as far as they went up, and LOCK.drop more)
      const most = (LOCK.drop + lift + WARP.drop * Math.max(0, warp - 1)) * inp.scale;
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
    // (down quickly, at once when a leg is pulled at a start, back up gently)
    [drop, dropV] = decay(drop - dropWant, dropV, dropWant > drop ? THREE.MathUtils.lerp(LOCK.down, LOCK.downStart, starting) : LOCK.up, dt);
    drop += dropWant;
    drop = Math.max(0, drop);
    if (drop + Math.max(0, squash) > 1e-5) {
      hips.y -= drop + Math.max(0, squash);
      posed(rot, 0, hips.x, hips.y, hips.z, P);
    }
    // Standing still: up straight (STANCE)
    // (in over STANCE.ease; out quickly at a start, so its lean is the take's own, not held upright; a foot
    // lifted in a standing take (the actor shuffling) keeps the stance: easing it out that quickly popped every bone)
    const tall = stand && !crouched && !inAir && squash < 1e-3;
    tallW += ((tall ? 1 : 0) - tallW) * (1 - Math.exp((-Math.LN2 * dt) / (tall || stand ? STANCE.ease : STANCE.out)));
    if (tallW > 1e-3) {
      // (the hips up as far as the held legs let them: neither leg past `reach`)
      const reach = (LEG_REACH / 0.998) * STANCE.reach * inp.scale;
      let up = STANCE.most * inp.scale;
      for (let i = 0; i < 2; i++) {
        world(P.pos[LEGS[i][0]], inp, hipW);
        // (a held foot where it's held; one let go of where the take has it)
        const at = feet[i].locked ? feet[i].at : feet[i].ball;
        const h2 = reach * reach - (at.x - hipW.x) ** 2 - (at.z - hipW.z) ** 2;
        up = Math.min(up, h2 > 0 ? Math.sqrt(h2) - (hipW.y - at.y) : 0);
      }
      // (eased: when a foot is let go of, what the legs allow jumps, and the hips jumping with it snapped the other knee)
      stanceUp += (Math.max(0, up) - stanceUp) * (1 - Math.exp((-Math.LN2 * dt) / STANCE.upEase));
      hips.y += (stanceUp * tallW) / inp.scale;
      // (the spine over the hips, then the head level: each turned about his own axes, in the world)
      posed(rot, 0, hips.x, hips.y, hips.z, P);
      const n = P.pos[MB.neck];
      const lean = Math.atan2(n.z - P.pos[0].z, n.y - P.pos[0].y);
      const side = Math.atan2(n.x - P.pos[0].x, n.y - P.pos[0].y);
      for (const b of [MB.spine1, MB.spine2]) turnWorld(b, (-lean / 2) * STANCE.upright * tallW, (side / 2) * STANCE.upright * tallW);
      posed(rot, 0, hips.x, hips.y, hips.z, P);
      hu.set(0, 1, 0).applyQuaternion(P.rot[MB.head]);
      turnWorld(MB.head, -Math.atan2(hu.z, hu.y) * STANCE.level * tallW, Math.atan2(hu.x, hu.y) * STANCE.level * tallW);
      // (L is his -x side: its arm comes in towards +x)
      turnWorld(MB.armL, 0, STANCE.arms * tallW);
      turnWorld(MB.armR, 0, -STANCE.arms * tallW);
      for (const b of [MB.foreL, MB.foreR]) ql.fromArray(rot, b * 4).slerp(qi.identity(), STANCE.elbows * tallW).toArray(rot, b * 4);
      posed(rot, 0, hips.x, hips.y, hips.z, P);
    }
    // Breathing (BREATH): the ribcage tilting back and up and settling, the head kept level
    if (tallW > 1e-3) {
      breathT += dt * BREATH.rate * breathK;
      if (breathT >= 1) {
        breathT -= 1;
        // (the next breath a little quicker or slower: a seeded wander, the same every time)
        breathK = 1 + BREATH.wander * Math.sin(breathT * 97 + jumps * 1.7);
      }
      // (in quicker than out, as a breath goes)
      const u = breathT < 0.4 ? breathT / 0.4 : 1 - (breathT - 0.4) / 0.6;
      const k = (0.5 - 0.5 * Math.cos(u * Math.PI)) * tallW;
      turnWorld(MB.spine2, -BREATH.spine * k, 0);
      turnWorld(MB.chest, -BREATH.chest * k, 0);
      turnWorld(MB.neck, (BREATH.spine + BREATH.chest) * 0.5 * k, 0);
      turnWorld(MB.head, (BREATH.spine + BREATH.chest) * 0.5 * k, 0);
      posed(rot, 0, hips.x, hips.y, hips.z, P);
    }
    const softAt = SOFT + (STANCE.soft - SOFT) * tallW;
    for (let i = 0; i < 2; i++) {
      const f = feet[i];
      local(f.at, inp, lt);
      twoBone(rot, P, LEGS[i][0], LEGS[i][1], LEGS[i][2], lt, softAt);
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
    // The legs' hand-over (LEG_BLEND): from what they showed last frame
    // (taking off only: landing, the feet must meet the ground at once, and on the ground a foot's
    // let-go is gentle already: easing it as well stalls the legs every step)
    const handOver = legShown && inAir && !legAirWas;
    LEG_BONES.forEach((b, k) => {
      if (handOver) {
        qa.fromArray(legOut, k * 4).multiply(qb.fromArray(rot, b * 4).invert());
        logQ(qa, legOff[k]);
        legOffV[k].set(0, 0, 0);
      } else
        for (const c of ['x', 'y', 'z'] as const) [legOff[k][c], legOffV[k][c]] = decay(legOff[k][c], legOffV[k][c], LEG_BLEND, dt);
      if (legOff[k].lengthSq() > 1e-10) expQ(legOff[k], qa).multiply(qb.fromArray(rot, b * 4)).normalize().toArray(rot, b * 4);
      legOut.set(rot.subarray(b * 4, b * 4 + 4), k * 4);
    });
    legShown = true;
    legAirWas = inAir;
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
  /** Over to frame `g`, what was showing inertialized away (each side moving as fast as it plays: this clip at its rate, the next at `next`) */
  function cut(g: number, next = rate) {
    sample(clip, t, srcRot, srcHips, srcAv, srcHv);
    // (the flight's rise is the game's: both sides without it; the standing take's wander was showing)
    srcHips.y -= db.bump[at(clip, t)];
    srcHips.x += wander.x;
    srcHips.z += wander.z;
    for (const v of srcAv) v.multiplyScalar(rate);
    srcHv.multiplyScalar(rate);
    const wasStanding = standing[clip] === 1;
    clip = db.clipOf[g];
    t = db.frameOf[g];
    takeStamp[takeIdx[clip]] = ++cuts;
    {
      const r = rootAt(db.clips[clip], Math.round(t));
      wanderX0 = r.x;
      wanderZ0 = r.z;
      wanderYaw0 = r.yaw;
    }
    sample(clip, t, dstRot, dstHips, dstAv, dstHv);
    dstHips.y -= db.bump[g];
    for (const v of dstAv) v.multiplyScalar(next);
    dstHv.multiplyScalar(next);
    inertia.jump(srcRot, srcAv, srcHips, srcHv, dstRot, dstAv, dstHips, dstHv);
    // (from one standing take to another: a slow change of stance)
    inertia.halflife = standing[clip] && wasStanding ? STAND_BLEND : BLEND;
    jumps++;
  }
  /** Into the air: a jump from the take-off that carries on best from here; a fall from a flight's top */
  function takeOff(jumping: boolean, vy: number, jumpV: number) {
    const g = searchFor(false, at(clip, t), undefined, jumping ? db.takeoff : falls);
    if (g < 0) return;
    // (the push off plays at about its own speed, a fall's flight as the fall goes)
    cut(g, jumping ? 1.2 : 1);
    inAir = true;
    flight = db.flightOf[g];
    v0 = jumping ? Math.max(vy, jumpV * 0.5) : jumpV;
    held = 0;
    // (a held foot lets go where it is, catching up with the flight's)
    for (const f of feet) {
      if (f.locked) f.off.set(f.lock.x - f.ball.x, 0, f.lock.z - f.ball.z);
      f.locked = f.wait = false;
    }
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
      tallW = 0;
      stanceUp = 0;
      breathT = 0;
      breathK = 1;
      legShown = legAirWas = false;
      for (const v of [...legOff, ...legOffV]) v.set(0, 0, 0);
      warp = faster = turnLately = airK = 1;
      sprintW = crouchW = wanderW = 0;
      wander.set(0, 0, 0);
      inAir = false;
      flight = -1;
      settle = held = airT = 0;
      for (const f of feet) f.rise = f.riseV = 0;
    },
    /** What it's doing, for the lab */
    get debug() {
      return { clip: db.clips[clip].name, frame: t, rate, warp, cost: lastCost, blend: inertia.left, jumps, drop, lift, bank, air: inAir, crouch: crouchW, squash, tall: tallW, up: stanceUp, arms: AIR.arms * THREE.MathUtils.smoothstep(held, AIR.armsAfter, AIR.armsAfter + AIR.armsIn) };
    },
  };
}
export type Animator = ReturnType<typeof createAnimator>;

const qw = new THREE.Quaternion();
const vw = new THREE.Vector3();
const qp = new THREE.Quaternion();
const qd = new THREE.Quaternion();
const qs = new THREE.Quaternion();
const qt = new THREE.Quaternion();
/** The bones under the hips that carry the upper body, and the share of a turn each takes */
const SPINE = [
  ['spine1', 0.35],
  ['spine2', 0.5],
  ['chest', 1],
] as const;
/** The legs' bones (all but the hips under them) */
const LOWER = new Set(['legL', 'shinL', 'footL', 'toeL', 'legR', 'shinR', 'footR', 'toeR']);
/**
 * Put the animator's pose on a figure's bones (after its own `update()`,
 * which has posed the fingers and anything held), `w` of the way from the
 * pose it has (1 all of it).
 *
 * `upper` (0 to 1) keeps the figure's own upper body over the animator's
 * legs (Phase 4: the gun's hold, an arm out aiming): the hips and legs are
 * the animator's, and the spine turns so the chest keeps the turn the
 * figure's pose gave it, `yaw` (radians about up) more: the figure is drawn
 * turned by the animator's facing, and the pose was made for the springs'
 * (walk.ts passes the difference), so the gun still points where you look.
 */
export function applyTo(sk: Skeleton, rot: Float32Array, hips: THREE.Vector3, w = 1, upper = 0, yaw = 0) {
  const h = sk.bones.hips;
  // (the pose's own hips, before they're the animator's)
  qp.copy(h.quaternion);
  for (let i = 0; i < NB; i++) {
    const n = MOCAP_BONES[i];
    const b = sk.bones[n];
    qw.fromArray(rot, i * 4);
    // (the upper body only as far as it isn't the pose's own)
    const k = i === 0 || LOWER.has(n) ? w : w * (1 - upper);
    if (k >= 1) b.quaternion.copy(qw);
    else if (k > 0) b.quaternion.slerp(qw, k);
  }
  if (w >= 1) h.position.copy(hips);
  else h.position.lerp(vw.copy(hips), w);
  if (upper <= 0) return;
  // What turns the pose's chest under the hips as they are now: hips⁻¹ · yaw · the pose's hips, a share of it
  // down each bone of the spine (each time brought into the next bone's frame)
  qd.copy(h.quaternion).invert().multiply(qt.setFromAxisAngle(UPV, yaw)).multiply(qp);
  qd.slerp(qs.identity(), 1 - upper);
  for (const [n, k] of SPINE) {
    const b = sk.bones[n];
    qs.identity().slerp(qd, k);
    // the rest, in this bone's frame: b⁻¹ · share⁻¹ · rest · b
    qt.copy(qs).invert().multiply(qd);
    qd.copy(b.quaternion).invert().multiply(qt).multiply(b.quaternion);
    b.quaternion.premultiply(qs).normalize();
  }
}

const qa2 = new THREE.Quaternion();
const qr = new THREE.Quaternion();
const vax = new THREE.Vector3();
/** The lean of a peek over the spine (spine1, spine2, the chest) and the head's levelling back (neck, head) */
const LEAN = [
  ['spine1', 0.3],
  ['spine2', 0.35],
  ['chest', 0.35],
] as const;
const LEVEL = [
  ['neck', 0.4],
  ['head', 0.6],
] as const;
/**
 * A peek (Phase 4): the upper body leant out over the hips by `lean`
 * radians (+ to his right) about the figure's way `yaw` (radians about up,
 * in its own frame: where the camera looks), the feet where they are, and
 * the head turned back `level` of the way, so it stays level. On top of
 * whatever posed the figure (the animator, the pose, both).
 */
export function addLean(sk: Skeleton, lean: number, yaw = 0, level = 0.85) {
  if (Math.abs(lean) < 1e-4) return;
  // (the axis in the figure's frame; each bone's parent's turn in it, built up going down the chain)
  vax.set(Math.sin(yaw), 0, Math.cos(yaw));
  qa2.copy(sk.bones.hips.quaternion);
  for (const [n, k] of LEAN) {
    const b = sk.bones[n];
    const ax = vw.copy(vax).applyQuaternion(qt.copy(qa2).invert());
    b.quaternion.premultiply(qr.setFromAxisAngle(ax, lean * k)).normalize();
    qa2.multiply(b.quaternion);
  }
  for (const [n, k] of LEVEL) {
    const b = sk.bones[n];
    const ax = vw.copy(vax).applyQuaternion(qt.copy(qa2).invert());
    b.quaternion.premultiply(qr.setFromAxisAngle(ax, -lean * level * k)).normalize();
    qa2.multiply(b.quaternion);
  }
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

/**
 * Something carried in his right hand (a coffee, a phone): the arm `out`
 * radians from his side and the forearm turned about its length so the
 * thumb leads, so it's held in front of the hand, clear of his leg (the
 * capture's hands hang thumbs in, which put it into his thigh); `w` of
 * the way. On top of the pose, after `applyTo()`.
 */
export const CARRY = { out: 0.12, most: 1.4 };
const cr = new THREE.Quaternion();
const cp = new THREE.Quaternion();
const cu = new THREE.Vector3();
const cv = new THREE.Vector3();
const cf = new THREE.Vector3();
const cx = new THREE.Vector3();
export function addCarry(sk: Skeleton, w = 1) {
  if (w < 1e-3) return;
  const arm = sk.bones.armR;
  const fore = sk.bones.foreR;
  sk.root.updateMatrixWorld(true);
  // (turns in his own frame: the root's taken out)
  const rootInv = sk.root.getWorldQuaternion(cr).invert();
  const pw = arm.parent!.getWorldQuaternion(cp).premultiply(rootInv);
  qt.setFromAxisAngle(Z, CARRY.out * w);
  arm.quaternion.premultiply(qw.copy(pw).invert().multiply(qt).multiply(pw)).normalize();
  arm.updateMatrixWorld(true);
  const fw = fore.getWorldQuaternion(cp).premultiply(rootInv);
  const hw = sk.bones.handR.getWorldQuaternion(qw).premultiply(rootInv);
  // (the thumb's way and his forward, both across the forearm)
  cu.set(0, 1, 0).applyQuaternion(fw);
  cv.set(0, 0, 1).applyQuaternion(hw);
  cv.addScaledVector(cu, -cv.dot(cu));
  cf.set(0, 0, 1).addScaledVector(cu, -cu.z);
  if (cv.lengthSq() < 1e-6 || cf.lengthSq() < 1e-6) return;
  const turn = THREE.MathUtils.clamp(Math.atan2(cx.crossVectors(cv, cf).dot(cu), cv.dot(cf)), -CARRY.most, CARRY.most);
  fore.quaternion.multiply(qt.setFromAxisAngle(UPV, turn * w)).normalize();
}
