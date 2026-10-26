/*
 * The game's moments (the revamp's Phase 4, docs/animation-revamp-plan.md;
 * DOM-free, tested in tests/moments.test.ts): what Degen does at the things
 * he uses, played between the prompt's press (F) and what it opens.
 *
 * A moment is a **mark** (`Mark`: where he stands, which way he faces, and
 * what's there: a door's handle, a counter's top, a bench's seat), an
 * **approach** (walk.ts walks him onto the mark on its own springs, the
 * walk's own last steps, never a slide into place: `update()` gives it the
 * goal each frame), a **clip** (keyed here on the `Pose` rig as the vault's
 * is, the hands put on the thing by `reachArm()`: the door push, the lean
 * on the counter, the sit-down) and a **hand-back** (the door's panel opens
 * as the hand lands, `open`; the counter's lean holds while its menu is open
 * and comes back when it closes, `release()`; seated he stays until he's
 * stood up, `release()`).
 *
 * Phases: `approach` → `play` → (`hold` → `back`) → `done`. A door plays
 * out and is done; a counter and a bench hold. `skip()` (F again) cuts an
 * approach or a door short, opening at once. `cancel()` drops it.
 */
import * as THREE from 'three';
import { HIP_HEIGHT, type Pose, reachArm, torsoFrame } from './skeleton';
import { SEAT_H } from './pedestrians';
import { sitPose } from './poses';

/** The numbers (tiles, seconds, radians) */
export const MOMENT = {
  /** How far from the thing he stands: a door, a counter, a bench (in front of its seat, his back to it) */
  stand: { door: 0.36, counter: 0.4, bench: 0.42 },
  /** The approach: at the mark within `at` of it and `faceAt` of its facing, slower than `still`; never from further than `max`; at most `timeout` seconds, then the clip plays from wherever he is */
  approach: { at: 0.16, faceAt: 0.3, still: 0.4, max: 2.4, timeout: 2.0, speed: 0.78, slowIn: 0.4, turnIn: 0.7 },
  /** The door push: its length, the share of it at which the hand lands and the panel opens; the handle's height over the ground and its offset to his right; how far the push goes into the door */
  door: { t: 0.6, open: 0.55, handleY: 0.56, handleSide: 0.16, push: 0.05, lean: 0.22 },
  /** The lean on a counter: in and out, how far the spine leans, the hands' spread either side of his middle, the share of the lean-in at which the menu opens */
  counter: { in: 0.4, out: 0.35, lean: 0.32, hands: 0.17, open: 0.6 },
  /** The sit-down and the stand-up; the seat's place back from his stand spot */
  bench: { down: 0.85, up: 0.7, back: 0.08 },
  /** The palm's stand-off from a surface */
  palm: 0.035,
};

export type MomentKind = 'door' | 'counter' | 'bench';
export type Phase = 'approach' | 'play' | 'hold' | 'back' | 'done';

export interface Mark {
  kind: MomentKind;
  /** Where he stands (world) and the way he faces there; the ground's height */
  x: number;
  z: number;
  y: number;
  face: number;
  /** The hands' targets (world): a door's handle, a counter's two points, nothing for a bench */
  hands: { x: number; y: number; z: number }[];
  /** A bench: its seat (world: where his root goes, the seat's height) */
  seat?: { x: number; z: number; y: number };
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/**
 * A door's mark: he comes at it from where he is (`fx`, `fz`), stands `stand.door` short of it facing it, and the
 * handle is `handleSide` to his right at `handleY`; `blocked` says the stand spot can't be stood on (then he stays
 * where he is and faces the door)
 */
export function doorMark(door: { x: number; z: number }, fx: number, fz: number, y: number, blocked?: (x: number, z: number) => boolean): Mark {
  let dx = door.x - fx;
  let dz = door.z - fz;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) (dx = 0), (dz = 1);
  else (dx /= d), (dz /= d);
  let x = door.x - dx * MOMENT.stand.door;
  let z = door.z - dz * MOMENT.stand.door;
  if (blocked?.(x, z)) (x = fx), (z = fz);
  const face = Math.atan2(dx, dz);
  // (his right: the rig's -x side when he faces +z)
  const rx = -Math.cos(face);
  const rz = Math.sin(face);
  return { kind: 'door', x, z, y, face, hands: [{ x: door.x + rx * MOMENT.door.handleSide - dx * MOMENT.palm, y: y + MOMENT.door.handleY, z: door.z + rz * MOMENT.door.handleSide - dz * MOMENT.palm }] };
}

/** A counter's mark: he comes at its point `at` from (`fx`, `fz`), stands `stand.counter` short of it facing it, and both hands go onto its top (`top`, world) either side of him */
export function counterMark(at: { x: number; z: number }, top: number, y: number, fx: number, fz: number): Mark {
  let dx = at.x - fx;
  let dz = at.z - fz;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) (dx = 0), (dz = 1);
  else (dx /= d), (dz /= d);
  const stand = { x: at.x - dx * MOMENT.stand.counter, z: at.z - dz * MOMENT.stand.counter };
  const face = Math.atan2(dx, dz);
  // (hands[0] is the rig's -x arm's, his right)
  const rx = -Math.cos(face);
  const rz = Math.sin(face);
  const h = MOMENT.counter.hands;
  return {
    kind: 'counter',
    x: stand.x,
    z: stand.z,
    y,
    face,
    hands: [
      { x: at.x + rx * h, y: top + MOMENT.palm, z: at.z + rz * h },
      { x: at.x - rx * h, y: top + MOMENT.palm, z: at.z - rz * h },
    ],
  };
}

/** A bench's mark: he stands in front of its seat with his back to it, facing the way its sitter faces (`ry`), and sits back onto it */
export function benchMark(bench: { x: number; z: number; ry: number }, y: number): Mark {
  const dx = Math.sin(bench.ry);
  const dz = Math.cos(bench.ry);
  return { kind: 'bench', x: bench.x + dx * MOMENT.stand.bench, z: bench.z + dz * MOMENT.stand.bench, y, face: bench.ry, hands: [], seat: { x: bench.x + dx * MOMENT.bench.back, z: bench.z + dz * MOMENT.bench.back, y: y + SEAT_H } };
}

export interface MomentInput {
  dt: number;
  x: number;
  z: number;
  face: number;
  speed: number;
}
export interface MomentGoal {
  /** The way to go (unit) and how fast; the facing to settle on once near */
  dx: number;
  dz: number;
  speed: number;
  face: number | null;
}

/** The root's place while seated: where it is and how far down (world) */
export interface RootShift {
  x: number;
  z: number;
  y: number;
}

export function createMoment() {
  let mark: Mark | null = null;
  let phase: Phase = 'done';
  let t = 0;
  let u = 0;
  let opened = false;
  let onOpen: (() => void) | null = null;
  /** Where the approach started (the sit-down comes back to the stand spot) */
  let from = { x: 0, z: 0 };

  function fire() {
    if (opened) return;
    opened = true;
    onOpen?.();
  }

  /** Start a moment at `mark`; `open` runs when the hand lands (a door's panel, a counter's menu) */
  function start(m: Mark, open?: () => void, x = m.x, z = m.z) {
    mark = m;
    onOpen = open ?? null;
    opened = false;
    t = 0;
    u = 0;
    from = { x, z };
    const d = Math.hypot(m.x - x, m.z - z);
    phase = d > MOMENT.approach.max ? 'play' : 'approach';
    if (phase === 'play') (from.x = m.x), (from.z = m.z);
  }

  /** The length of the clip playing now */
  function length(): number {
    if (!mark) return 1;
    if (mark.kind === 'door') return MOMENT.door.t;
    if (mark.kind === 'counter') return phase === 'back' ? MOMENT.counter.out : MOMENT.counter.in;
    return phase === 'back' ? MOMENT.bench.up : MOMENT.bench.down;
  }

  /** A frame: the goal for walk.ts while approaching, else null */
  function update(inp: MomentInput): MomentGoal | null {
    if (!mark || phase === 'done') return null;
    const dt = Math.min(inp.dt, 0.1);
    if (phase === 'approach') {
      t += dt;
      const dx = mark.x - inp.x;
      const dz = mark.z - inp.z;
      const d = Math.hypot(dx, dz);
      const faceOff = Math.abs(wrap(mark.face - inp.face));
      const there = d < MOMENT.approach.at && faceOff < MOMENT.approach.faceAt && inp.speed < MOMENT.approach.still;
      if (there || t > MOMENT.approach.timeout) {
        phase = 'play';
        t = 0;
        u = 0;
        return null;
      }
      const near = d < MOMENT.approach.at;
      // (slower as he comes up to it, and turning to face it the last bit)
      const speed = near ? 0 : Math.min(MOMENT.approach.speed, Math.max(0.3, (d / MOMENT.approach.slowIn) * MOMENT.approach.speed));
      return { dx: d > 1e-6 ? dx / d : 0, dz: d > 1e-6 ? dz / d : 0, speed, face: d < MOMENT.approach.turnIn ? mark.face : null };
    }
    if (phase === 'play' || phase === 'back') {
      t += dt;
      u = Math.min(1, t / length());
      if (phase === 'play') {
        const at = mark.kind === 'door' ? MOMENT.door.open : mark.kind === 'counter' ? MOMENT.counter.open : 1.01;
        if (u >= at) fire();
        if (u >= 1) {
          if (mark.kind === 'door') phase = 'done';
          else {
            phase = 'hold';
            t = 0;
          }
        }
      } else if (u >= 1) phase = 'done';
    }
    return null;
  }

  /** F again: an approach or a door cut short, what it opens opened now */
  function skip() {
    if (!mark || phase === 'done') return;
    if (phase === 'approach') {
      phase = 'play';
      t = 0;
      u = 0;
      if (mark.kind !== 'bench') fire();
    } else if (phase === 'play' && mark.kind === 'door') {
      fire();
      phase = 'done';
    }
  }

  /** The counter's menu closed, or stand up from the bench: back to standing */
  function release() {
    if (!mark) return;
    if (phase === 'hold' || (phase === 'play' && mark.kind !== 'door')) {
      // (part way in: back from there)
      const left = phase === 'play' ? 1 - u : 0;
      phase = 'back';
      t = left * (mark.kind === 'counter' ? MOMENT.counter.out : MOMENT.bench.up);
      u = left;
    } else if (phase === 'approach') phase = 'done';
  }

  function cancel() {
    phase = 'done';
    mark = null;
  }

  /** How far into the keyed pose (0 standing, 1 on the thing): the clip's own curve */
  function amount(): number {
    if (!mark) return 0;
    if (mark.kind === 'door') {
      // (the hand to the handle, the push, and back)
      return phase === 'play' ? smooth(u / 0.5) * (1 - smooth((u - 0.7) / 0.3)) : 0;
    }
    if (phase === 'play') return smooth(u);
    if (phase === 'hold') return 1;
    if (phase === 'back') return 1 - smooth(u);
    return 0;
  }

  /** Seated (and on the way down or up): where the root is (world), else null */
  function root(): RootShift | null {
    if (!mark?.seat || phase === 'approach' || phase === 'done') return null;
    const k = amount();
    const s = mark.seat;
    // (down onto the seat: the hips end HIP_HEIGHT - 0.03 over the root, as the crowd's sitters sit)
    return { x: from.x + (s.x - from.x) * k, z: from.z + (s.z - from.z) * k, y: mark.y + (s.y - (HIP_HEIGHT - 0.03) * scaleOf - mark.y) * k };
  }
  let scaleOf = 1;

  return {
    start,
    update,
    skip,
    release,
    cancel,
    amount,
    root,
    /** The figure's scale (the seat's drop is in its numbers) */
    set scale(s: number) {
      scaleOf = s;
    },
    get mark() {
      return mark;
    },
    get phase() {
      return phase;
    },
    get u() {
      return u;
    },
    get active() {
      return !!mark && phase !== 'done';
    },
    /** The keyed pose is on (the motion capture steps aside) */
    get posing() {
      return !!mark && (phase === 'play' || phase === 'hold' || phase === 'back');
    },
    get opened() {
      return opened;
    },
  };
}
export type Moment = ReturnType<typeof createMoment>;

/* ---------- The keyed poses ---------- */

const mRoot = new THREE.Matrix4();
const mTorso = new THREE.Matrix4();
const qYaw = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const vHand = new THREE.Vector3();
const vPos = new THREE.Vector3();
const vScale = new THREE.Vector3();

/** Arm `i` reaches `w` of the way to a world point, from where the pose has it */
function reachTo(p: Pose, i: 0 | 1, wx: number, wy: number, wz: number, w: number) {
  vHand.set(wx, wy, wz).applyMatrix4(mRoot).applyMatrix4(mTorso);
  const before = { ...p.arms[i] };
  reachArm(p, i, vHand);
  const l = p.arms[i];
  l.fwd = before.fwd + (l.fwd - before.fwd) * w;
  l.out = before.out + (l.out - before.out) * w;
  l.bend = before.bend + (l.bend - before.bend) * w;
  l.twist = (before.twist ?? 0) + ((l.twist ?? 0) - (before.twist ?? 0)) * w;
  l.reach = (before.reach ?? 0) + ((l.reach ?? 0) - (before.reach ?? 0)) * w;
}

/** The world → torso-frame transform for a figure at (x, y, z) facing `face` at `scale` with pose `p` */
function frame(p: Pose, x: number, y: number, z: number, face: number, scale: number) {
  mRoot.compose(vPos.set(x, y, z), qYaw.setFromAxisAngle(UP, face), vScale.set(scale, scale, scale)).invert();
  torsoFrame(p, mTorso);
  mTorso.invert();
}

/**
 * The moment's keyed pose laid on `p` (the figure's own, standing or walking) by `a` (0 none, 1 all): the figure at
 * (x, y, z) facing `face` at `scale` (the root where walk.ts has it: seated, `root()`'s place); `t` the clock
 */
export function momentPose(p: Pose, m: Moment, a: number, x: number, y: number, z: number, face: number, scale: number, t: number) {
  const mark = m.mark;
  if (!mark || a <= 0.001) return;
  const k = m.amount() * a;
  if (k <= 0.001) return;
  if (mark.kind === 'door') {
    // The push: a little lean in, the right hand (arms[0], the rig's -x arm) to the handle, pushing it in as it lands
    p.lean += (MOMENT.door.lean - p.lean) * k;
    p.headPitch += (0.1 - p.headPitch) * k;
    frame(p, x, y, z, face, scale);
    const h = mark.hands[0];
    const dx = Math.sin(mark.face);
    const dz = Math.cos(mark.face);
    const push = smooth((m.u - 0.5) / 0.25) * MOMENT.door.push;
    reachTo(p, 0, h.x + dx * push, h.y, h.z + dz * push, k);
    return;
  }
  if (mark.kind === 'counter') {
    // The lean: the spine forward over the counter, the weight on both hands, the head up to whoever's there
    p.lean += (MOMENT.counter.lean - p.lean) * k;
    p.bob += (-0.02 - p.bob) * k;
    p.headPitch += (-0.12 - p.headPitch) * k;
    frame(p, x, y, z, face, scale);
    for (const i of [0, 1] as const) {
      const h = mark.hands[i];
      reachTo(p, i, h.x, h.y, h.z, k);
    }
    return;
  }
  // The bench: down onto the seat (the root comes down and back with it, walk.ts), the legs folding, the arms to the knees
  const sit = sitPoseOf(t);
  p.bob += (sit.bob - p.bob) * k;
  p.lean += (sit.lean - p.lean) * k;
  p.twist += (sit.twist - p.twist) * k;
  p.side += (sit.side - p.side) * k;
  p.sway = (p.sway ?? 0) * (1 - k);
  p.turn = (p.turn ?? 0) * (1 - k);
  p.headPitch += (sit.headPitch - p.headPitch) * k;
  p.headYaw += (sit.headYaw * 0.3 - p.headYaw) * k;
  for (const i of [0, 1] as const) {
    const l = p.legs[i];
    const s = sit.legs[i];
    l.fwd += (s.fwd - l.fwd) * k;
    l.out += (s.out - l.out) * k;
    l.bend += (s.bend - l.bend) * k;
    l.foot = (l.foot ?? 0) * (1 - k);
    l.toe = (l.toe ?? 0) * (1 - k);
    l.footYaw = (l.footYaw ?? 0) * (1 - k);
    l.footRoll = (l.footRoll ?? 0) * (1 - k);
    const al = p.arms[i];
    const as = sit.arms[i];
    al.fwd += (as.fwd - al.fwd) * k;
    al.out += (as.out - al.out) * k;
    al.bend += (as.bend - al.bend) * k;
    al.twist = (al.twist ?? 0) * (1 - k);
    al.reach = (al.reach ?? 0) * (1 - k);
  }
}

const sitScratch: Pose = {
  bob: 0,
  lean: 0,
  twist: 0,
  side: 0,
  headYaw: 0,
  headPitch: 0,
  arms: [
    { fwd: 0, out: 0, bend: 0 },
    { fwd: 0, out: 0, bend: 0 },
  ],
  legs: [
    { fwd: 0, out: 0, bend: 0 },
    { fwd: 0, out: 0, bend: 0 },
  ],
};
/** The crowd's sitting pose (poses.ts) at time `t`, with its own small life */
function sitPoseOf(t: number): Pose {
  sitPose(sitScratch, t);
  return sitScratch;
}
