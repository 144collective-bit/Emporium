/*
 * The rubric (the revamp's Phase 1, docs/animation-revamp-plan.md): what
 * "realistically human" means here, as numbers, measured the same way in
 * the lab's scorecard and in tests/human.test.ts, over a clip of the
 * capture or over the animator running a program. DOM-free.
 *
 * A `Rubric` takes frames (`push()`: the pose, where the figure stands and
 * faces, its speed and what the stick asks, which feet are down) and keeps
 * a window of what it measured from each (`Record`); `rows()` works the
 * rubric's rows out over the window: cadence and stride against the bands
 * for the speed, double support or flight, the feet's slide, the hips' bob
 * and sway, the shoulders against the pelvis and the arms against the
 * legs, the elbows, the knees' and the neck's limits, the head's steadiness,
 * pops and continuity, the weight in stops, starts and turns, the reaction
 * to the stick, stillness standing, the feet on the ground.
 *
 * The steady rows (cadence to the elbows) are measured on stretches of
 * going steadily: moving, straight (not turning), at one speed; a stretch
 * is contiguous, so a stop between two runs is never counted as a stride.
 *
 * The bands are a person's (`BANDS`), calibrated in the audit against the
 * capture (real people): Degen's hips are 0.95 m up at the player's scale,
 * a real adult's, and at another scale a band is scaled the way dynamics
 * scale (Froude: a smaller figure at the same speed steps quicker, by the
 * square root of the legs' ratio). A band moves only on the owner's call,
 * written in the plan.
 */
import * as THREE from 'three';
import { MB, MOCAP_BONES, NB, type Posed, TOE_BONES, newPosed, posed } from './mocap';
import { HIP_Y } from './skeleton';

/** A tile in metres, and the player's scale (the adult the bands are written for) */
export const TILE_M = 1.8;
export const ADULT_SCALE = 0.85;
/** The legs' length (hip height) in metres at a scale */
export const legM = (scale: number) => HIP_Y * scale * TILE_M;

type Table = [number, number, number][];
const d = (x: number) => (x * Math.PI) / 180;
/**
 * The bands. Speeds in metres a second (an adult's), cadences in steps a
 * second, strides in metres a step, bob and sway in metres, angles in
 * radians, rates in radians a second. A table is [speed, low, high] rows,
 * between them in proportion (`bandAt()`).
 */
export const BANDS = {
  /** Steps a second at a speed (a walk at 0.8 to 2 m/s, a run from 2.6, a sprint at 7.5) */
  cadence: [
    [0.8, 1.3, 1.7],
    [1.4, 1.55, 2.15],
    [2.0, 1.9, 2.5],
    [2.6, 2.5, 3.1],
    [5.0, 2.7, 3.4],
    [7.5, 3.4, 3.9],
  ] as Table,
  /** A step's length at a speed (the speed over the cadence) */
  stride: [
    [0.8, 0.45, 0.62],
    [1.4, 0.65, 0.9],
    [2.0, 0.8, 1.05],
    [2.6, 0.84, 1.04],
    [5.0, 1.47, 1.85],
    [7.5, 1.85, 2.25],
  ] as Table,
  /** A walk (under `walkTo`, or told so) has both feet down this share of the time (more the slower); a run (from `runFrom`, or told so) has neither down at least `flight` of it and both at most `bothRun` */
  walkTo: 1.6,
  runFrom: 2.6,
  support: [
    [0.8, 0.2, 0.45],
    [1.4, 0.12, 0.32],
    [2.0, 0.05, 0.25],
  ] as Table,
  flight: 0.05,
  bothRun: 0.03,
  /** A held foot moves this far over the ground at most (metres) */
  slide: 0.015,
  /** The hips' rise and fall, and side to side, over a cycle (peak to peak), by the speed */
  bob: [
    [0.8, 0.01, 0.035],
    [1.4, 0.018, 0.05],
    [2.0, 0.033, 0.065],
    [2.6, 0.045, 0.09],
    [5.0, 0.06, 0.11],
    [7.5, 0.06, 0.12],
  ] as Table,
  sway: [
    [0.8, 0.008, 0.03],
    [1.4, 0.01, 0.04],
    [2.0, 0.01, 0.045],
    [2.6, 0.005, 0.045],
    [5.0, 0.005, 0.04],
  ] as Table,
  /** The shoulders turn against the pelvis: their correlation (each with its slow drift taken out) under this */
  counter: -0.2,
  /** Each arm swings with the opposite leg: its phase against it within this (the capture's own actors are up to about 20° off) */
  // (the takes' own are 14–21°; the animator's walk measures 30°: the legs' IK over a planted foot moves the thigh's swing against the arms)
  armPhase: d(33),
  /** The elbows' bend on average, by the speed (a walk's hang, a runner's carry); never past straight by more than `elbowBack` */
  elbow: [
    [1.6, d(10), d(45)],
    [2.6, d(60), d(115)],
  ] as Table,
  elbowBack: d(2),
  /** A knee never past straight by more than this (a person's can go 5°) */
  kneeBack: d(5),
  /** The neck: the head within this of the chest, yaw and pitch (a person's range) */
  neckYaw: d(80),
  neckPitch: d(60),
  /** The head's angular speed against the body (over 0.1 s): moving (a quick look round leading a turn), and standing (after a second's settling) */
  headMoving: 10,
  headStanding: 6,
  /** Any bone's turn: at most this fast (0.7 rad a frame at 60 Hz), and its speed changing at most this fast (a sprinter's knee) */
  pop: 42,
  accel: 1500,
  /** The first visible change after the stick changes, and half the speed asked for, within */
  react: 0.1,
  reactMove: 0.3,
  /**
   * Standing still: the hips and spine never over this (3° a frame at 60 Hz), breathing in this band of
   * frequencies tilting the ribcage at least this much (radians), the hips never frozen (moving `standSway` or
   * more over any `standSwayOver` seconds: a person waiting with a hand to their head held still for 6 s within
   * half a centimetre) and a weight shift (a move of the hips sideways of `shiftBy` or more, foot to foot) every
   * so often, judged over `shiftSpan` seconds standing or more (the takes are shorter: one shifts every 6 s, one
   * not in 12); a clip's hips carry its root's wander (`Frame.side`), the animator's the take's
   */
  still: 3.14,
  breath: [0.15, 0.4] as [number, number],
  breathDepth: d(0.8),
  standSway: 0.004,
  standSwayOver: 8,
  shiftSpan: 20,
  shiftEvery: [5, 40],
  shiftFrom: 0.015,
  shiftTo: 0.005,
  shiftBy: 0.025,
  /** A held foot's ball within this of its ground (metres) */
  ground: 0.02,
  /** A stop takes a braking step and the chest comes back this much from the run's lean; a start leans the chest in this much before the first step */
  stopBack: d(2),
  startLean: d(2),
} as const;

/** How far over the ground a figure must be going to count as moving, and as going somewhere (tiles a second); how fast a turn stops a stretch counting as straight (radians a second) */
const MOVING = 0.3;
const STILL = 0.05;
const TURNING = 0.5;

/** What a frame is measured as (the numbers the rows read) */
export interface Record {
  t: number;
  dt: number;
  /** The speed over the ground and what the stick asks (world tiles a second), and the stick's way (radians, or none); how fast he's turning (radians a second) */
  speed: number;
  goal: number;
  goalDir: number | null;
  turn: number;
  /** The way he faces (world), and the stick's way or that */
  yaw: number;
  goalYaw: number;
  /** The hips in the world (height) and in his frame (side to side), metres; and with the root's wander, for the weight shifts */
  hipY: number;
  hipX: number;
  shiftX: number;
  /** The pelvis's and the shoulders' turn relative to the way he faces, the chest's lean forward and to his right */
  pelvis: number;
  chest: number;
  lean: number;
  leanSide: number;
  /** Each arm's and leg's swing forward (radians; L then R) */
  arm: [number, number];
  leg: [number, number];
  /** Each elbow's bend and knee's bend, signed (bending the way a joint does +) */
  elbow: [number, number];
  knee: [number, number];
  /** The head's turn relative to the chest */
  neckYaw: number;
  neckPitch: number;
  /** The head's angular speed against the body over the last 0.1 s (radians a second) */
  head: number;
  /** The fastest any bone turned this frame (and the fastest of the body's core: hips, spine, chest), and the biggest change in a bone's turning speed (radians a second, a second²), and which bone that was */
  pop: number;
  corePop: number;
  accel: number;
  accelBone: number;
  /** Each foot: on the ground, the ball's place in the world (tiles), its height over its ground (metres), and how far it's moved while held (metres; none without a lock) */
  down: [boolean, boolean];
  ball: [[number, number], [number, number]];
  ballOver: [number, number];
  drift: [number, number] | null;
}

export interface Frame {
  dt: number;
  /** The pose: every body bone's turn (NB × 4) and the hips in his frame (rig numbers) */
  rot: ArrayLike<number>;
  hips: { x: number; y: number; z: number };
  /** A clip's root's wander since its start, sideways in his frame (rig numbers; the animator's hips carry it already) */
  side?: number;
  /** Where he stands and faces (world), his scale */
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
  /** His speed over the ground and what the stick asks (world tiles a second); the stick's way */
  speed: number;
  goal: number;
  goalDir?: number | null;
  /** Each foot on the ground (held by the lock, or the clip's contact) */
  down: [boolean, boolean];
  /** How far each held foot has moved over the ground (world tiles), where there's a lock */
  drift?: [number, number];
  /** The ground under a point (world), for the feet */
  ground?: (x: number, z: number) => number;
}

export interface Row {
  id: string;
  name: string;
  /** What it measured, for people */
  value: string;
  /** Inside its band; null where the window has nothing to measure it on */
  ok: boolean | null;
  /** The number itself, where there's one */
  n?: number;
}

/** A band at a speed (metres a second), between the table's rows in proportion, held at the ends */
export function bandAt(table: Table, v: number): [number, number] {
  if (v <= table[0][0]) return [table[0][1], table[0][2]];
  for (let i = 1; i < table.length; i++)
    if (v <= table[i][0]) {
      const u = (v - table[i - 1][0]) / (table[i][0] - table[i - 1][0]);
      return [THREE.MathUtils.lerp(table[i - 1][1], table[i][1], u), THREE.MathUtils.lerp(table[i - 1][2], table[i][2], u)];
    }
  const l = table[table.length - 1];
  return [l[1], l[2]];
}
/** Froude scaling: a speed at `scale` as the adult's equivalent, and a cadence or time the same way back */
export const froudeSpeed = (v: number, scale: number) => v * Math.sqrt(legM(ADULT_SCALE) / legM(scale));
export const froudeRate = (r: number, scale: number) => r * Math.sqrt(legM(scale) / legM(ADULT_SCALE));

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
/** The correlation of two series (-1 to 1; 0 when either is flat) */
function corr(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 4) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    sab += (a[i] - ma) * (b[i] - mb);
    saa += (a[i] - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  }
  return saa > 1e-9 && sbb > 1e-9 ? sab / Math.sqrt(saa * sbb) : 0;
}
/** A series less its running mean over `w` frames (the slow drift taken out) */
function highPass(xs: number[], w: number) {
  const h = Math.max(1, Math.floor(w / 2));
  return xs.map((x, i) => {
    const a = Math.max(0, i - h);
    const b = Math.min(xs.length - 1, i + h);
    let s = 0;
    for (let k = a; k <= b; k++) s += xs[k];
    return x - s / (b - a + 1);
  });
}
/** Peak to peak as a sine's from the spread */
const peakToPeak = (xs: number[]) => {
  const m0 = mean(xs);
  return 2 * Math.SQRT2 * Math.sqrt(mean(xs.map((x) => (x - m0) ** 2)));
};
const deg = (r: number) => `${((r * 180) / Math.PI).toFixed(0)}°`;
const cm = (m: number) => `${(m * 100).toFixed(1)} cm`;
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const inBand = (x: number, b: readonly [number, number]) => x >= b[0] && x <= b[1];
const bandStr = (b: readonly [number, number], f = (x: number) => x.toFixed(2)) => `${f(b[0])}–${f(b[1])}`;
const row = (id: string, name: string, value: string, ok: boolean | null, n?: number): Row => ({ id, name, value, ok, n });

export interface RubricOpts {
  /** Keep this many seconds of frames (every frame, with no limit, when 0) */
  seconds?: number;
  /** What the figure is doing, where it's known (a program's gait, a take's tag): else judged by the speed */
  gait?: 'walk' | 'run';
}

/** The rubric over a window of frames */
export function createRubric(scale: number, opts: RubricOpts = {}) {
  const seconds = opts.seconds ?? 0;
  const P: Posed = newPosed();
  const recs: Record[] = [];
  let t = 0;
  const prevRot = new Float32Array(NB * 4);
  const prevW = new Float32Array(NB);
  let prevKnown = false;
  let prevWKnown = false;
  let prevYaw = 0;
  const headQ: { t: number; q: THREE.Quaternion }[] = [];
  const held: [THREE.Vector3 | null, THREE.Vector3 | null] = [null, null];
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const ax = new THREE.Vector3();
  const X = new THREE.Vector3(1, 0, 0);
  const e = new THREE.Euler();
  const fwdAngle = (from: number, to: number) => {
    va.copy(P.pos[to]).sub(P.pos[from]);
    return Math.atan2(va.z, -va.y);
  };
  /** A hinge's bend, signed about the upper bone's x axis (`sign` turns it so the joint's own way of bending is +: the knee as twoBone() has it, the elbow the other way) */
  const bend = (a: number, b: number, c: number, sign: number) => {
    va.copy(P.pos[b]).sub(P.pos[a]).normalize();
    vb.copy(P.pos[c]).sub(P.pos[b]).normalize();
    ax.copy(X).applyQuaternion(P.rot[a]);
    return sign * Math.atan2(vc.copy(va).cross(vb).dot(ax), va.dot(vb));
  };
  const yawOf = (q: THREE.Quaternion) => {
    va.set(0, 0, 1).applyQuaternion(q);
    return Math.atan2(va.x, va.z);
  };

  function push(f: Frame) {
    t += f.dt;
    posed(f.rot, 0, f.hips.x, f.hips.y, f.hips.z, P);
    const m = f.scale * TILE_M;
    // Pops and continuity: each bone's turn since the last frame, and how its speed changed
    let pop = 0;
    let corePop = 0;
    let accel = 0;
    let accelBone = 0;
    for (let b = 0; b < NB; b++) {
      qa.fromArray(f.rot, b * 4);
      if (prevKnown) {
        qb.fromArray(prevRot, b * 4);
        const w = qa.angleTo(qb) / f.dt;
        pop = Math.max(pop, w);
        if (b < MB.neck) corePop = Math.max(corePop, w);
        // (the first speed has none before it to change from)
        const a = prevWKnown ? Math.abs(w - prevW[b]) / f.dt : 0;
        if (a > accel) {
          accel = a;
          accelBone = b;
        }
        prevW[b] = w;
      }
      qa.toArray(prevRot, b * 4);
    }
    if (prevKnown) prevWKnown = true;
    const turn = prevKnown ? Math.abs(wrap(f.yaw - prevYaw)) / f.dt : 0;
    prevYaw = f.yaw;
    prevKnown = true;
    // The head against the body (his frame), against where it was 0.1 s ago
    const hq = P.rot[MB.head].clone();
    headQ.push({ t, q: hq });
    while (headQ.length > 1 && t - headQ[1].t >= 0.1) headQ.shift();
    const head = headQ.length > 1 && t - headQ[0].t > 1e-6 ? hq.angleTo(headQ[0].q) / (t - headQ[0].t) : 0;
    // The neck: the head's turn relative to the chest
    qa.copy(P.rot[MB.chest]).invert().multiply(P.rot[MB.head]);
    e.setFromQuaternion(qa, 'YXZ');
    // The chest's lean forward (its up tipped towards +z)
    va.set(0, 1, 0).applyQuaternion(P.rot[MB.chest]);
    const lean = Math.atan2(va.z, va.y);
    const leanSide = Math.atan2(-va.x, va.y);
    // The feet in the world
    const c = Math.cos(f.yaw);
    const s = Math.sin(f.yaw);
    const ball: [[number, number], [number, number]] = [
      [0, 0],
      [0, 0],
    ];
    const ballOver: [number, number] = [0, 0];
    const drift: [number, number] | null = f.drift ? [0, 0] : null;
    for (let i = 0; i < 2; i++) {
      const p = P.pos[TOE_BONES[i]];
      const wx = f.x + (p.x * c + p.z * s) * f.scale;
      const wz = f.z + (-p.x * s + p.z * c) * f.scale;
      const wy = f.y + p.y * f.scale;
      ball[i] = [wx, wz];
      ballOver[i] = (wy - (f.ground ? f.ground(wx, wz) : f.y)) * TILE_M;
      if (drift && f.drift) drift[i] = f.down[i] ? f.drift[i] * TILE_M : 0;
      held[i] = f.down[i] ? (held[i] ?? new THREE.Vector3(wx, 0, wz)) : null;
    }
    recs.push({
      t,
      dt: f.dt,
      speed: f.speed,
      goal: f.goal,
      goalDir: f.goalDir ?? null,
      turn,
      yaw: f.yaw,
      goalYaw: f.goalDir ?? f.yaw,
      hipY: f.y * TILE_M + f.hips.y * m,
      hipX: f.hips.x * m,
      shiftX: (f.hips.x + (f.side ?? 0)) * m,
      pelvis: yawOf(P.rot[0]),
      chest: yawOf(P.rot[MB.chest]),
      lean,
      leanSide,
      arm: [fwdAngle(MB.armL, MB.foreL), fwdAngle(MB.armR, MB.foreR)],
      leg: [fwdAngle(MB.legL, MB.shinL), fwdAngle(MB.legR, MB.shinR)],
      elbow: [bend(MB.armL, MB.foreL, MB.handL, -1), bend(MB.armR, MB.foreR, MB.handR, -1)],
      knee: [bend(MB.legL, MB.shinL, MB.footL, 1), bend(MB.legR, MB.shinR, MB.footR, 1)],
      neckYaw: e.y,
      neckPitch: e.x,
      head,
      pop,
      corePop,
      accel,
      accelBone,
      down: [f.down[0], f.down[1]],
      ball,
      ballOver,
      drift,
    });
    if (seconds > 0) while (recs.length > 1 && t - recs[0].t > seconds) recs.shift();
  }

  const span = (rs: Record[]) => (rs.length ? rs[rs.length - 1].t - rs[0].t : 0);
  /** Each foot's touchdowns (the frame it comes down) among `rs` */
  function onsets(rs: Record[]) {
    const out: { i: number; foot: number }[] = [];
    for (let i = 1; i < rs.length; i++) for (let foot = 0; foot < 2; foot++) if (rs[i].down[foot] && !rs[i - 1].down[foot]) out.push({ i, foot });
    return out;
  }
  /**
   * The stretches of going steadily: moving, not turning, within 15% of
   * the median moving speed with the stick asking about that, contiguous,
   * and at least 0.6 s long
   */
  function stretches(): Record[][] {
    const moving = recs.filter((r) => r.speed > MOVING && r.turn < TURNING);
    const med = median(moving.map((r) => r.speed));
    const ok = (r: Record) => r.speed > MOVING && r.turn < TURNING && Math.abs(r.speed - med) < med * 0.15 && Math.abs(r.goal - med) < med * 0.25;
    const out: Record[][] = [];
    let cur: Record[] = [];
    for (const r of recs) {
      if (ok(r)) cur.push(r);
      else {
        if (span(cur) >= 0.6) out.push(cur);
        cur = [];
      }
    }
    if (span(cur) >= 0.6) out.push(cur);
    return out;
  }

  /** The steady rows: cadence to the elbows, over the steady stretches */
  function steadyRows(): Row[] {
    const names: [string, string][] = [
      ['cadence', 'Cadence'],
      ['stride', 'Stride'],
      ['support', 'Support'],
      ['bob', 'Bob'],
      ['sway', 'Sway'],
      ['counter', 'Counter-rotation'],
      ['arms', 'Arm swing'],
      ['elbows', 'Elbows'],
    ];
    const sts = stretches();
    const all = sts.flat();
    // Steps within each stretch
    let steps = 0;
    let stepTime = 0;
    const lens: number[] = [];
    for (const st of sts) {
      const on = onsets(st);
      if (on.length < 2) continue;
      steps += on.length - 1;
      stepTime += st[on[on.length - 1].i].t - st[on[0].i].t;
      for (let k = 1; k < on.length; k++) {
        if (on[k].foot === on[k - 1].foot) continue;
        const a = st[on[k - 1].i].ball[on[k - 1].foot];
        const b = st[on[k].i].ball[on[k].foot];
        lens.push(Math.hypot(b[0] - a[0], b[1] - a[1]) * TILE_M * Math.sqrt(legM(ADULT_SCALE) / legM(scale)));
      }
    }
    if (all.length < 20 || steps < 3) return names.map(([id, name]) => row(id, name, 'not moving steadily', null));
    const out: Row[] = [];
    const v = froudeSpeed(mean(all.map((r) => r.speed)) * TILE_M, scale);
    const cadence = froudeRate(steps / stepTime, scale);
    const cb = bandAt(BANDS.cadence, v);
    out.push(row('cadence', 'Cadence', `${cadence.toFixed(2)} steps/s at ${v.toFixed(1)} m/s (${bandStr(cb)})`, inBand(cadence, cb), cadence));
    const stride = mean(lens);
    const sb = bandAt(BANDS.stride, v);
    out.push(row('stride', 'Stride', `${stride.toFixed(2)} m a step (${bandStr(sb)})`, lens.length ? inBand(stride, sb) : null, stride));
    // Support: a walk's double support, a run's flight
    const both = all.filter((r) => r.down[0] && r.down[1]).length / all.length;
    const neither = all.filter((r) => !r.down[0] && !r.down[1]).length / all.length;
    const gait = opts.gait ?? (v < BANDS.walkTo ? 'walk' : v >= BANDS.runFrom ? 'run' : null);
    if (gait === 'walk') {
      const b = bandAt(BANDS.support, v);
      out.push(row('support', 'Support', `walking: both feet down ${pct(both)} (${bandStr(b, pct)}), in the air ${pct(neither)}`, inBand(both, b) && neither < 0.01, both));
    } else if (gait === 'run') out.push(row('support', 'Support', `running: in the air ${pct(neither)} (over ${pct(BANDS.flight)}), both down ${pct(both)} (under ${pct(BANDS.bothRun)})`, neither >= BANDS.flight && both <= BANDS.bothRun, neither));
    else out.push(row('support', 'Support', `between a walk and a run (${v.toFixed(1)} m/s)`, null));
    // Bob and sway, each stretch about its own level
    const k = legM(scale) / legM(ADULT_SCALE);
    const dtm = mean(all.map((r) => r.dt));
    const cycle = 2 / (steps / stepTime) / dtm;
    // (each about its own level, the slow trend over a cycle and a half taken out: a start's crouch isn't a bob)
    const centred = (pick: (r: Record) => number) => sts.flatMap((st) => highPass(st.map(pick), cycle * 1.5));
    const bob = peakToPeak(centred((r) => r.hipY)) / k;
    const sway = peakToPeak(centred((r) => r.hipX)) / k;
    const bb = bandAt(BANDS.bob, v);
    const wb = bandAt(BANDS.sway, v);
    out.push(row('bob', 'Bob', `${cm(bob)} up and down (${bandStr(bb, cm)})`, inBand(bob, bb), bob));
    out.push(row('sway', 'Sway', `${cm(sway)} side to side (${bandStr(wb, cm)})`, inBand(sway, wb), sway));
    // The shoulders against the pelvis, each with its drift over a cycle taken out
    const cr = corr(
      sts.flatMap((st) => highPass(st.map((r) => r.pelvis), cycle)),
      sts.flatMap((st) => highPass(st.map((r) => r.chest), cycle)),
    );
    out.push(row('counter', 'Counter-rotation', `shoulders against the pelvis ${cr.toFixed(2)} (under ${BANDS.counter})`, cr < BANDS.counter, cr));
    // Each arm's phase against the opposite leg: the lag of the best correlation over a cycle
    const half = Math.round(cycle / 2);
    let worst = 0;
    for (let side = 0; side < 2; side++) {
      const a = sts.flatMap((st) => highPass(st.map((r) => r.arm[side]), cycle));
      const l = sts.flatMap((st) => highPass(st.map((r) => r.leg[1 - side]), cycle));
      let best = -Infinity;
      let bestLag = 0;
      for (let lag = -half; lag <= half; lag++) {
        const c = corr(a.slice(Math.max(0, lag), a.length + Math.min(0, lag)), l.slice(Math.max(0, -lag), l.length + Math.min(0, -lag)));
        if (c > best) {
          best = c;
          bestLag = lag;
        }
      }
      worst = Math.max(worst, Math.abs(wrap((bestLag * 2 * Math.PI) / cycle)));
    }
    out.push(row('arms', 'Arm swing', `${deg(worst)} off the opposite leg's swing (under ${deg(BANDS.armPhase)})`, worst <= BANDS.armPhase, worst));
    // The elbows
    // (by the gait where it's known: a fast walk keeps a walk's arms, a slow run a runner's)
    const eb: [number, number] = opts.gait === 'walk' ? [BANDS.elbow[0][1], BANDS.elbow[0][2]] : opts.gait === 'run' ? [BANDS.elbow[1][1], BANDS.elbow[1][2]] : bandAt(BANDS.elbow, v);
    const elbow = mean(all.flatMap((r) => [Math.abs(r.elbow[0]), Math.abs(r.elbow[1])]));
    out.push(row('elbows', 'Elbows', `bent ${deg(elbow)} on average (${bandStr(eb, deg)})`, inBand(elbow, eb), elbow));
    return out;
  }

  function rows(): Row[] {
    const out: Row[] = steadyRows();
    // Foot slide (where there's a lock) and the feet on the ground
    const locked = recs.filter((r) => r.drift);
    const slide = Math.max(0, ...locked.map((r) => Math.max(r.drift![0], r.drift![1])));
    out.push(row('slide', 'Foot slide', locked.length ? `${cm(slide)} at most (under ${cm(BANDS.slide)})` : 'no lock on the feet', locked.length ? slide <= BANDS.slide : null, slide));
    const under = Math.max(0, ...recs.flatMap((r) => [0, 1].map((i) => (r.down[i] ? -r.ballOver[i] : 0))));
    out.push(row('ground', 'Feet on the ground', `a foot down ${cm(under)} into the ground at most (under ${cm(BANDS.ground)})`, recs.length ? under <= BANDS.ground : null, under));
    // Limits
    const kneeBack = Math.max(0, ...recs.flatMap((r) => [-r.knee[0], -r.knee[1]]));
    const elbowBack = Math.max(0, ...recs.flatMap((r) => [-r.elbow[0], -r.elbow[1]]));
    out.push(row('knees', 'Knees', `${deg(kneeBack)} past straight at most (under ${deg(BANDS.kneeBack)})`, recs.length ? kneeBack <= BANDS.kneeBack : null, kneeBack));
    out.push(row('elbowBack', 'Elbows past straight', `${deg(elbowBack)} at most (under ${deg(BANDS.elbowBack)})`, recs.length ? elbowBack <= BANDS.elbowBack : null, elbowBack));
    const ny = Math.max(0, ...recs.map((r) => Math.abs(r.neckYaw)));
    const np = Math.max(0, ...recs.map((r) => Math.abs(r.neckPitch)));
    out.push(row('neck', 'Neck', `the head ${deg(ny)} round and ${deg(np)} up or down from the chest at most (${deg(BANDS.neckYaw)}, ${deg(BANDS.neckPitch)})`, recs.length ? ny <= BANDS.neckYaw && np <= BANDS.neckPitch : null, Math.max(ny / BANDS.neckYaw, np / BANDS.neckPitch)));
    // The head
    const moving = recs.filter((r) => r.speed > MOVING);
    const standingRecs = settledStanding();
    const hm = Math.max(0, ...moving.map((r) => r.head));
    const hs = Math.max(0, ...standingRecs.map((r) => r.head));
    out.push(row('head', 'Head', `turning ${hm.toFixed(1)} rad/s moving, ${hs.toFixed(1)} standing at most, against the body (under ${BANDS.headMoving}, ${BANDS.headStanding})`, moving.length || standingRecs.length ? (!moving.length || hm <= BANDS.headMoving) && (!standingRecs.length || hs <= BANDS.headStanding) : null, Math.max(hm / BANDS.headMoving, hs / BANDS.headStanding)));
    // Pops and continuity
    const pop = Math.max(0, ...recs.map((r) => r.pop));
    const accel = Math.max(0, ...recs.map((r) => r.accel));
    out.push(row('pops', 'Pops', `a bone turning ${pop.toFixed(0)} rad/s at most (under ${BANDS.pop})`, recs.length > 1 ? pop <= BANDS.pop : null, pop));
    const accelAt = recs.find((r) => r.accel === accel);
    out.push(row('continuity', 'Continuity', `a bone's speed changing ${accel.toFixed(0)} rad/s² at most (under ${BANDS.accel})${accelAt ? `, the ${MOCAP_BONES[accelAt.accelBone]} at ${accelAt.t.toFixed(2)} s` : ''}`, recs.length > 2 ? accel <= BANDS.accel : null, accel));
    out.push(...weight());
    out.push(reaction());
    out.push(...stillness());
    return out;
  }

  /** The frames standing still, after a second's settling into each stretch of it */
  function settledStanding(): Record[] {
    const out: Record[] = [];
    let since = -1;
    for (const r of recs) {
      if (r.speed < STILL && r.goal < STILL && r.turn < TURNING) {
        if (since < 0) since = r.t;
        if (r.t - since > 1) out.push(r);
      } else since = -1;
    }
    return out;
  }
  /** The stick's events: starts (from nothing to going), stops (to nothing) and turns (round by over 120°) */
  function events() {
    const out: { i: number; kind: 'start' | 'stop' | 'turn' }[] = [];
    for (let i = 1; i < recs.length; i++) {
      const a = recs[i - 1];
      const b = recs[i];
      if (a.goal < STILL && b.goal > MOVING) out.push({ i, kind: 'start' });
      else if (a.goal > MOVING && b.goal < STILL) out.push({ i, kind: 'stop' });
      else if (a.goalDir !== null && b.goalDir !== null && a.goal > MOVING && b.goal > MOVING && Math.abs(wrap(b.goalDir - a.goalDir)) > (120 * Math.PI) / 180) out.push({ i, kind: 'turn' });
    }
    return out;
  }
  const after = (i: number, seconds: number) => {
    let j = i;
    while (j < recs.length - 1 && recs[j].t - recs[i].t < seconds) j++;
    return j;
  };
  function weight(): Row[] {
    const ev = events();
    const stops = ev.filter((e) => e.kind === 'stop');
    const starts = ev.filter((e) => e.kind === 'start');
    const turns = ev.filter((e) => e.kind === 'turn');
    const out: Row[] = [];
    // A stop: at least one touchdown before he's still, the chest coming back from the run's lean
    let stopOk: boolean | null = stops.length ? true : null;
    let stopSteps = Infinity;
    let stopBack = Infinity;
    for (const e of stops) {
      let j = e.i;
      while (j < recs.length - 1 && recs[j].speed > STILL * 2 && recs[j].t - recs[e.i].t < 3) j++;
      const stretch = recs.slice(e.i, j + 1);
      const n = onsets(stretch).length;
      const before = recs.slice(Math.max(0, e.i - 30), e.i);
      const back = mean(before.map((r) => r.lean)) - Math.min(...stretch.map((r) => r.lean));
      stopSteps = Math.min(stopSteps, n);
      stopBack = Math.min(stopBack, back);
      if (n < 1 || back < BANDS.stopBack) stopOk = false;
    }
    out.push(row('stop', 'Stops', stops.length ? `${stopSteps} braking step${stopSteps === 1 ? '' : 's'} at least, the chest back ${deg(stopBack)} (1 step, ${deg(BANDS.stopBack)})` : 'no stop in the window', stopOk));
    // A start: the chest leans in before the first foot leaves the ground
    let startOk: boolean | null = starts.length ? true : null;
    let startLean = Infinity;
    for (const e of starts) {
      // (the chest's tilt towards where the stick points, in his frame; a start off the way he faces is
      // a plant and a turn, which leans into the turn: not measured)
      const dir = recs[e.i].goalDir ?? recs[e.i].goalYaw;
      if (Math.abs(wrap(dir - recs[e.i].yaw)) > d(60)) continue;
      const towards = (r: Record) => r.lean * Math.cos(dir - r.yaw) + r.leanSide * Math.sin(dir - r.yaw);
      const stand = mean(recs.slice(Math.max(0, e.i - 30), e.i).map(towards));
      let j = e.i;
      while (j < recs.length - 1 && recs[j].down[0] && recs[j].down[1] && recs[j].t - recs[e.i].t < 1) j++;
      const lean = Math.max(...recs.slice(e.i, j + 1).map(towards)) - stand;
      startLean = Math.min(startLean, lean);
      if (lean < BANDS.startLean) startOk = false;
    }
    out.push(row('start', 'Starts', startLean === Infinity ? 'no start ahead in the window' : `the chest leans in ${deg(startLean)} before the first step (${deg(BANDS.startLean)})`, startLean === Infinity ? null : startOk));
    // A turn round: a foot plants within half a second
    let turnOk: boolean | null = turns.length ? true : null;
    let plantAt = 0;
    for (const e of turns) {
      const j = after(e.i, 0.5);
      const on = onsets(recs.slice(e.i, j + 1));
      if (!on.length) turnOk = false;
      else plantAt = Math.max(plantAt, recs[e.i + on[0].i].t - recs[e.i].t);
    }
    out.push(row('turn', 'Turns', turns.length ? (turnOk ? `a foot plants within ${plantAt.toFixed(2)} s of turning round` : 'no foot plants within 0.5 s of turning round') : 'no turn round in the window', turnOk));
    return out;
  }
  /** The reaction to the stick: the first visible change, and half the speed asked for */
  function reaction(): Row {
    const ev = events().filter((e) => e.kind !== 'turn');
    if (!ev.length) return row('reaction', 'Reaction', 'no start or stop in the window', null);
    let worstFirst = 0;
    let worstMove = 0;
    for (const e of ev) {
      const base = recs[e.i - 1];
      let first = Infinity;
      let move = Infinity;
      for (let j = e.i; j < recs.length && recs[j].t - base.t < 1; j++) {
        const r = recs[j];
        const changed = Math.max(Math.abs(r.lean - base.lean), ...[0, 1].flatMap((k) => [Math.abs(r.arm[k] - base.arm[k]), Math.abs(r.leg[k] - base.leg[k]), Math.abs(r.knee[k] - base.knee[k])]));
        if (first === Infinity && changed > d(2)) first = r.t - base.t;
        if (move === Infinity && e.kind === 'start' && r.speed >= r.goal * 0.5) move = r.t - base.t;
      }
      worstFirst = Math.max(worstFirst, first);
      if (e.kind === 'start') worstMove = Math.max(worstMove, move);
    }
    const ms = (x: number) => (x === Infinity ? 'never' : `${(x * 1000).toFixed(0)} ms`);
    return row('reaction', 'Reaction', `the first change ${ms(worstFirst)} after the stick, half the speed in ${ms(worstMove)} (${BANDS.react * 1000}, ${BANDS.reactMove * 1000})`, worstFirst <= BANDS.react && worstMove <= BANDS.reactMove, Math.max(worstFirst / BANDS.react, worstMove / BANDS.reactMove));
  }
  /** Standing still (a stretch of 3 s or more): never frozen, never twitchy */
  function stillness(): Row[] {
    // The longest still stretch
    let best: Record[] = [];
    let cur: Record[] = [];
    for (const r of recs) {
      if (r.speed < STILL && r.goal < STILL && r.turn < TURNING) cur.push(r);
      else {
        if (span(cur) > span(best)) best = cur;
        cur = [];
      }
    }
    if (span(cur) > span(best)) best = cur;
    const out: Row[] = [];
    if (span(best) < 3) {
      out.push(row('twitch', 'Twitching', 'not standing still for 3 s', null), row('breath', 'Breathing', 'not standing still for 3 s', null), row('shift', 'Weight shifts', `not standing still for ${BANDS.shiftSpan} s`, null));
      return out;
    }
    // (after the first second: settling in)
    const st = best.filter((r) => r.t - best[0].t > 1);
    const pop = Math.max(0, ...st.map((r) => r.corePop));
    out.push(row('twitch', 'Twitching', `the hips or spine turning ${pop.toFixed(2)} rad/s at most standing (under ${BANDS.still})`, pop <= BANDS.still, pop));
    // Breathing: the ribcage's tilt at 0.15-0.4 Hz
    const n = st.length;
    const dtm = span(st) / Math.max(1, n - 1);
    const xs = st.map((r) => r.lean);
    const m0 = mean(xs);
    let depth = 0;
    for (let f = BANDS.breath[0]; f <= BANDS.breath[1]; f += 0.025) {
      let re = 0;
      let im = 0;
      for (let i = 0; i < n; i++) {
        const w = 2 * Math.PI * f * i * dtm;
        re += (xs[i] - m0) * Math.cos(w);
        im += (xs[i] - m0) * Math.sin(w);
      }
      depth = Math.max(depth, (2 * Math.hypot(re, im)) / n);
    }
    out.push(row('breath', 'Breathing', `the ribcage tilting ${((depth * 180) / Math.PI).toFixed(2)}° at ${BANDS.breath[0]}–${BANDS.breath[1]} Hz (over ${deg(BANDS.breathDepth)})`, span(st) >= 8 ? depth >= BANDS.breathDepth : null, depth));
    // Weight shifts: a distinct move of the hips sideways (moving past `shiftFrom` a second, settled again
    // under `shiftTo`) that carried them `shiftBy` or more
    if (span(st) < BANDS.shiftSpan) out.push(row('shift', 'Weight shifts', `not standing still for ${BANDS.shiftSpan} s`, null));
    else {
      let shifts = 0;
      let from = -1;
      let vel = 0;
      for (let i = 1; i < st.length; i++) {
        const r = st[i];
        vel += ((r.shiftX - st[i - 1].shiftX) / r.dt - vel) * Math.min(1, r.dt / 0.3);
        if (from < 0 && Math.abs(vel) > BANDS.shiftFrom) from = i - 1;
        else if (from >= 0 && Math.abs(vel) < BANDS.shiftTo) {
          if (Math.abs(r.shiftX - st[from].shiftX) >= BANDS.shiftBy) shifts++;
          from = -1;
        }
      }
      const every = shifts ? span(st) / shifts : Infinity;
      // (never frozen: over any swayOver seconds the hips move at least sway)
      let frozen = 0;
      for (let i = 0; i < st.length; i++) {
        let lo = st[i].shiftX;
        let hi = lo;
        let j = i;
        while (j < st.length && st[j].t - st[i].t < BANDS.standSwayOver) {
          lo = Math.min(lo, st[j].shiftX);
          hi = Math.max(hi, st[j].shiftX);
          j++;
        }
        if (j < st.length && hi - lo < BANDS.standSway) frozen++;
      }
      out.push(row('shift', 'Weight shifts', `one every ${every === Infinity ? 'never' : `${every.toFixed(1)} s`} standing (every ${BANDS.shiftEvery[0]}–${BANDS.shiftEvery[1]})${frozen ? ', frozen for a spell' : ''}`, inBand(every, BANDS.shiftEvery) && !frozen, every));
    }
    return out;
  }

  return {
    push,
    rows,
    /** The window's frames as measured */
    get records() {
      return recs;
    },
    /** How much the window holds (seconds) */
    get span() {
      return span(recs);
    },
    reset() {
      recs.length = 0;
      t = 0;
      prevKnown = false;
      headQ.length = 0;
      held[0] = held[1] = null;
    },
  };
}
export type Rubric = ReturnType<typeof createRubric>;

/** The rubric's rows for a whole clip of the capture (at its own 30 frames a second, scale 1) */
/** A clip's rows: `standing` says the take is a standing one (its actor's wander never counts as going anywhere) */
export function clipRows(c: { frames: number; rot: Float32Array; hips: Float32Array; root: Float32Array }, contacts: Uint8Array, fps: number, gait?: 'walk' | 'run', standing = false): Row[] {
  const r = createRubric(1, { gait });
  const dt = 1 / fps;
  for (let f = 0; f < c.frames; f++) {
    const a = Math.max(0, f - 1);
    const b = Math.min(c.frames - 1, f + 1);
    const speed = standing ? 0 : (Math.hypot(c.root[b * 3] - c.root[a * 3], c.root[b * 3 + 1] - c.root[a * 3 + 1]) * fps) / Math.max(1, b - a);
    const yaw = c.root[f * 3 + 2];
    r.push({
      dt,
      rot: c.rot.subarray(f * NB * 4, (f + 1) * NB * 4),
      hips: { x: c.hips[f * 3], y: c.hips[f * 3 + 1], z: c.hips[f * 3 + 2] },
      side: (c.root[f * 3] - c.root[0]) * Math.cos(yaw) - (c.root[f * 3 + 1] - c.root[1]) * Math.sin(yaw),
      x: c.root[f * 3],
      y: 0,
      z: c.root[f * 3 + 1],
      // (a standing take's actor turning on the spot is still standing: his yaw is held)
      yaw: standing ? c.root[2] : c.root[f * 3 + 2],
      scale: 1,
      speed,
      goal: speed,
      goalDir: null,
      down: [contacts[f * 2] === 1, contacts[f * 2 + 1] === 1],
    });
  }
  return r.rows();
}
