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
 *
 * Step 2: **getting in and out** (`board` / `alight`: the car's door opened
 * and a duck into the seat, a leg over the kart's side, a step up into the
 * aircraft, down the ladder into the hire boat, and out again a foot first;
 * the vehicle takes him at `fireAt` of the clip and gives him back at the
 * start of the alight), **the lifts** (`lift`: the approach walks him in
 * through the door and turns him to face out, then the fade), and
 * **carrying** (`pick` / `put`: a crate lifted at a place, carried to the
 * car's boot and set down, or the other way; `carryPose()` holds it in both
 * hands on the walk between, `crateAt()` is where the crate is).
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
  /** Getting in: how far short of the vehicle's side he stands, the clip's length by vehicle, the share of it at which the vehicle takes him (the hero hidden, the ride's own figure in the seat), and getting out */
  board: { stand: 0.42, t: { car: 0.75, kart: 0.8, plane: 0.85, boat: 0.9 }, fireAt: { car: 0.72, kart: 0.8, plane: 0.85, boat: 0.75 }, out: 0.7 },
  /** The car's handle height and the seat's over the ground; the kart's pod and seat; the aircraft's door frame (two hands) and sill; the boat's rails and its deck under the quay */
  car: { handle: 0.5, seat: 0.32, lean: 0.4, bob: -0.18 },
  kart: { pod: 0.36, seat: 0.26, lean: 0.6, bob: -0.16 },
  plane: { frame: [0.78, 1.0] as [number, number], sill: 0.45, lean: 0.3, bob: -0.08 },
  boat: { rail: 0.72, railSide: 0.34, deck: -1.2, lean: 0.35, bob: -0.1 },
  /** The lift: inside the door, facing out, a beat before the fade */
  lift: { inside: 0.35, t: 0.3, fireAt: 0.5 },
  /** A crate: its size, how far short of it he stands, the lift and the set-down, where he carries it (out in front at the hips) */
  crate: { w: 0.42, h: 0.3, d: 0.3, stand: 0.44, t: 0.9, fireAt: 0.5, out: 0.3, up: 0.06, bend: 0.9, squat: -0.5, lean: 0.06, slow: 0.78 },
  /** The palm's stand-off from a surface */
  palm: 0.035,
};

export type MomentKind = 'door' | 'counter' | 'bench' | 'board' | 'alight' | 'lift' | 'pick' | 'put';
export type Vehicle = 'car' | 'kart' | 'plane' | 'boat';
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
  /** A bench: its seat (world: where his root goes, the seat's height); a vehicle: where its seat takes him (board) or gives him back (alight); a crate: where it stands */
  seat?: { x: number; z: number; y: number };
  /** Getting in or out: which vehicle */
  vehicle?: Vehicle;
  /** The share of the clip at which `open` runs (a door's panel, the vehicle taking him, the lift's fade, the crate in hand) */
  fireAt?: number;
  /** The clip's length (seconds), where it isn't the kind's own */
  t?: number;
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

/**
 * Getting into a vehicle: he comes at its side point `door` (world, on the body: the car's door, the kart's pod,
 * the aircraft's door, the ladder's top for the boat) from (`fx`, `fz`), stands `board.stand` short of it facing
 * it, the hands go to it (the handle, the pod's rim, the door frame, the rails) and the clip takes his root to
 * `seat` (world) before the vehicle takes him
 */
export function boardMark(vehicle: Vehicle, door: { x: number; z: number }, seat: { x: number; z: number; y: number }, fx: number, fz: number, y: number, blocked?: (x: number, z: number) => boolean): Mark {
  let dx = door.x - fx;
  let dz = door.z - fz;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) (dx = 0), (dz = 1);
  else (dx /= d), (dz /= d);
  let x = door.x - dx * MOMENT.board.stand;
  let z = door.z - dz * MOMENT.board.stand;
  if (blocked?.(x, z)) (x = fx), (z = fz);
  const face = Math.atan2(dx, dz);
  const rx = -Math.cos(face);
  const rz = Math.sin(face);
  const hands: Mark['hands'] = [];
  const px = door.x - dx * MOMENT.palm;
  const pz = door.z - dz * MOMENT.palm;
  if (vehicle === 'car') hands.push({ x: px + rx * 0.12, y: y + MOMENT.car.handle, z: pz + rz * 0.12 });
  else if (vehicle === 'kart') hands.push({ x: px + rx * 0.16, y: y + MOMENT.kart.pod, z: pz + rz * 0.16 }, { x: px - rx * 0.16, y: y + MOMENT.kart.pod, z: pz - rz * 0.16 });
  else if (vehicle === 'plane') hands.push({ x: px + rx * 0.2, y: y + MOMENT.plane.frame[0], z: pz + rz * 0.2 }, { x: px - rx * 0.2, y: y + MOMENT.plane.frame[1], z: pz - rz * 0.2 });
  else hands.push({ x: door.x + rx * MOMENT.boat.railSide, y: y + MOMENT.boat.rail, z: door.z + rz * MOMENT.boat.railSide }, { x: door.x - rx * MOMENT.boat.railSide, y: y + MOMENT.boat.rail, z: door.z - rz * MOMENT.boat.railSide });
  return { kind: 'board', vehicle, x, z, y, face, hands, seat, fireAt: MOMENT.board.fireAt[vehicle], t: MOMENT.board.t[vehicle] };
}

/** Getting out: from the vehicle's `seat` (world) to where he stands, `at`, facing `face`; plays at once (no approach) */
export function alightMark(vehicle: Vehicle, seat: { x: number; z: number; y: number }, at: { x: number; z: number }, y: number, face: number): Mark {
  return { kind: 'alight', vehicle, x: at.x, z: at.z, y, face, hands: [], seat, t: MOMENT.board.out };
}

/** A lift: he walks in through its door (`door`, world) from (`fx`, `fz`) and turns to face out; the fade comes after a beat */
export function liftMark(door: { x: number; z: number }, fx: number, fz: number, y: number): Mark {
  let dx = door.x - fx;
  let dz = door.z - fz;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) (dx = 0), (dz = 1);
  else (dx /= d), (dz /= d);
  return { kind: 'lift', x: door.x + dx * MOMENT.lift.inside, z: door.z + dz * MOMENT.lift.inside, y, face: Math.atan2(-dx, -dz), hands: [], fireAt: MOMENT.lift.fireAt, t: MOMENT.lift.t };
}

/** A crate on the ground at `at` (world) to pick up (`pick`) or a spot to set one down on (`put`): he stands `crate.stand` short of it facing it, both hands on its sides */
export function crateMark(kind: 'pick' | 'put', at: { x: number; z: number }, fx: number, fz: number, y: number, blocked?: (x: number, z: number) => boolean): Mark {
  let dx = at.x - fx;
  let dz = at.z - fz;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) (dx = 0), (dz = 1);
  else (dx /= d), (dz /= d);
  let x = at.x - dx * MOMENT.crate.stand;
  let z = at.z - dz * MOMENT.crate.stand;
  if (blocked?.(x, z)) (x = fx), (z = fz);
  const face = Math.atan2(dx, dz);
  const rx = -Math.cos(face);
  const rz = Math.sin(face);
  const side = MOMENT.crate.w / 2 + MOMENT.palm;
  const cy = y + MOMENT.crate.h / 2;
  return { kind, x, z, y, face, hands: [{ x: at.x + rx * side, y: cy, z: at.z + rz * side }, { x: at.x - rx * side, y: cy, z: at.z - rz * side }], seat: { x: at.x, z: at.z, y: cy }, fireAt: MOMENT.crate.fireAt, t: MOMENT.crate.t };
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
    phase = d > MOMENT.approach.max || m.kind === 'alight' ? 'play' : 'approach';
    if (phase === 'play') (from.x = m.x), (from.z = m.z);
  }

  /** The length of the clip playing now */
  function length(): number {
    if (!mark) return 1;
    if (mark.t !== undefined) return mark.t;
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
        const at = mark.fireAt ?? (mark.kind === 'door' ? MOMENT.door.open : mark.kind === 'counter' ? MOMENT.counter.open : 1.01);
        if (u >= at) fire();
        // (what it opened may have dropped the moment: a vehicle taking him)
        if (!mark) return null;
        if (u >= 1) {
          if (mark.kind === 'counter' || mark.kind === 'bench') {
            phase = 'hold';
            t = 0;
          } else phase = 'done';
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
    } else if (phase === 'play' && mark.kind !== 'counter' && mark.kind !== 'bench') {
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
    if (mark.kind === 'lift') return phase === 'play' ? smooth(u / (mark.fireAt ?? 1)) : 0;
    // (getting in: the hands land first, then the body goes in over the second half, so the root is at the seat as the vehicle takes him)
    if (mark.kind === 'board') return phase === 'play' ? smooth((u / (mark.fireAt ?? 1) - 0.45) / 0.55) : 0;
    if (mark.kind === 'alight') return phase === 'play' ? 1 - smooth(u) : 0;
    if (mark.kind === 'pick' || mark.kind === 'put') {
      // (down to it, up with it or without it)
      return phase === 'play' ? Math.sin(Math.PI * Math.min(1, u)) : 0;
    }
    if (phase === 'play') return smooth(u);
    if (phase === 'hold') return 1;
    if (phase === 'back') return 1 - smooth(u);
    return 0;
  }

  /** Seated (and on the way down or up): where the root is (world), else null */
  function root(): RootShift | null {
    if (!mark?.seat || phase === 'approach' || phase === 'done' || mark.kind === 'pick' || mark.kind === 'put') return null;
    const k = amount();
    const s = mark.seat;
    // (down onto the seat: the hips end HIP_HEIGHT - 0.03 over the root, as the crowd's sitters sit)
    const seatY = s.y - (HIP_HEIGHT - 0.03) * scaleOf;
    if (mark.kind === 'alight') return { x: s.x + (mark.x - s.x) * (1 - k), z: s.z + (mark.z - s.z) * (1 - k), y: seatY + (mark.y - seatY) * (1 - k) };
    return { x: from.x + (s.x - from.x) * k, z: from.z + (s.z - from.z) * k, y: mark.y + (seatY - mark.y) * k };
  }
  /** Carrying a crate: how far it has come up from the ground (pick) or gone down to it (put): 0 on the ground, 1 in his hands */
  function lifted(): number {
    if (!mark || (mark.kind !== 'pick' && mark.kind !== 'put')) return 0;
    // (before the clip a put carries it and a pick doesn't; after it the other way round)
    if (phase !== 'play') return mark.kind === 'pick' === opened ? 1 : 0;
    const f = mark.fireAt ?? 0.5;
    const k = mark.kind === 'pick' ? smooth((u - f) / (1 - f)) : 1 - smooth((u - f) / (1 - f));
    return k;
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
    lifted,
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
  if (mark.kind === 'lift') return;
  if (mark.kind === 'board' || mark.kind === 'alight') {
    boardPose(p, mark, m, k, a, x, y, z, face, scale, t);
    return;
  }
  if (mark.kind === 'pick' || mark.kind === 'put') {
    // The squat: down to the crate, both hands on its sides, up with it (or without it); the hands follow the crate
    p.bob += (MOMENT.crate.squat - p.bob) * k;
    p.lean += (MOMENT.crate.bend - p.lean) * k;
    p.headPitch += (0.3 - p.headPitch) * k;
    for (const l of p.legs) {
      l.fwd += (0.5 - l.fwd) * k;
      l.bend += (1.0 - l.bend) * k;
      l.out += (0.12 - l.out) * k;
    }
    // (once it's in his hands they stay on it: all the way up, and until it's down)
    const lifted = m.lifted();
    const w = Math.max(k, (mark.kind === 'pick' ? (lifted > 0.001 ? 1 : 0) : lifted) * a);
    const c = crateAt(m, x, y, z, face, scale);
    if (c && w > 0.001) handsOn(p, c, x, y, z, face, scale, w);
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

/** The stepping leg (his left, the rig's +x: legs[1]) into each vehicle: up and over, or down the ladder */
const STEP: Record<Vehicle, { fwd: number; bend: number; out: number }> = {
  car: { fwd: 0.85, bend: 1.3, out: 0.1 },
  kart: { fwd: 1.1, bend: 1.5, out: 0.3 },
  plane: { fwd: 1.25, bend: 1.6, out: 0.15 },
  boat: { fwd: -0.3, bend: 0.5, out: 0.1 },
};

/**
 * Getting in (`board`: `k` rising to the vehicle taking him) or out (`alight`: `k` falling from the seat to his
 * feet): the hands to the handle, the pod's rim, the door frame or the rails; the near leg lifting over; the body
 * folding down onto the seat (or unfolding off it)
 */
function boardPose(p: Pose, mark: Mark, m: Moment, k: number, a: number, x: number, y: number, z: number, face: number, scale: number, t: number) {
  const v = mark.vehicle ?? 'car';
  const c = MOMENT[v];
  const u = mark.kind === 'board' ? Math.min(1, m.u / (mark.fireAt ?? 1)) : 1 - Math.min(1, m.u);
  // (the hands land over the first half, the lean in and the duck with them; the body folds onto the seat over the second)
  const hw = (mark.kind === 'board' ? smooth(u / 0.5) : smooth((u - 0.3) / 0.7)) * a;
  p.lean += (c.lean - p.lean) * hw;
  p.bob += (c.bob - p.bob) * Math.max(k, hw);
  p.headPitch += ((v === 'boat' ? 0.35 : 0.15) - p.headPitch) * hw;
  const step = Math.sin(Math.PI * u) * a;
  const st = STEP[v];
  const l = p.legs[1];
  l.fwd += (st.fwd - l.fwd) * step;
  l.bend += (st.bend - l.bend) * step;
  l.out += (st.out - l.out) * step;
  l.foot = (l.foot ?? 0) * (1 - step) - 0.3 * step;
  l.footYaw = (l.footYaw ?? 0) * (1 - step);
  l.footRoll = (l.footRoll ?? 0) * (1 - step);
  const sitK = smooth((u - 0.5) / 0.5) * a;
  if (sitK > 0.001) {
    const sit = sitPoseOf(t);
    for (const i of [0, 1] as const) {
      const lg = p.legs[i];
      const sg = sit.legs[i];
      lg.fwd += (sg.fwd - lg.fwd) * sitK;
      lg.bend += (sg.bend - lg.bend) * sitK;
      lg.out += (sg.out - lg.out) * sitK;
      lg.foot = (lg.foot ?? 0) * (1 - sitK);
      lg.toe = (lg.toe ?? 0) * (1 - sitK);
    }
    p.sway = (p.sway ?? 0) * (1 - sitK);
    p.turn = (p.turn ?? 0) * (1 - sitK);
  }
  if (!mark.hands.length || hw < 0.001) return;
  frame(p, x, y, z, face, scale);
  if (mark.hands.length === 1) reachTo(p, 0, mark.hands[0].x, mark.hands[0].y, mark.hands[0].z, hw);
  else for (const i of [0, 1] as const) reachTo(p, i, mark.hands[i].x, mark.hands[i].y, mark.hands[i].z, hw);
}

/** Both hands on the sides of a crate whose middle is at `c` (world), `w` of the way */
function handsOn(p: Pose, c: { x: number; y: number; z: number }, x: number, y: number, z: number, face: number, scale: number, w: number) {
  frame(p, x, y, z, face, scale);
  const rx = -Math.cos(face);
  const rz = Math.sin(face);
  const side = (MOMENT.crate.w / 2 + MOMENT.palm) * scale;
  // (arms[0] is his right: the crate's right side is at +r)
  reachTo(p, 0, c.x + rx * side, c.y, c.z + rz * side, w);
  reachTo(p, 1, c.x - rx * side, c.y, c.z - rz * side, w);
}

/** Where a carried crate's middle is: out in front of a figure at (x, y, z) facing `face`, held at the hips */
export function carriedAt(x: number, y: number, z: number, face: number, scale: number) {
  return { x: x + Math.sin(face) * MOMENT.crate.out * scale, y: y + (HIP_HEIGHT + MOMENT.crate.up) * scale, z: z + Math.cos(face) * MOMENT.crate.out * scale };
}

/** Where the crate is during a pick or a put: on the ground at the mark, in his hands, or on its way between (`lifted()`) */
export function crateAt(m: Moment, x: number, y: number, z: number, face: number, scale: number) {
  const mark = m.mark;
  if (!mark?.seat || (mark.kind !== 'pick' && mark.kind !== 'put')) return null;
  const k = m.lifted();
  const c = carriedAt(x, y, z, face, scale);
  const g = mark.seat;
  return { x: g.x + (c.x - g.x) * k, y: g.y + (c.y - g.y) * k, z: g.z + (c.z - g.z) * k };
}

/** Carrying a crate on the walk between a pick and a put: both hands on it out in front, a little lean back, `w` of the way */
export function carryPose(p: Pose, w: number, x: number, y: number, z: number, face: number, scale: number) {
  if (w <= 0.001) return;
  p.lean += (-MOMENT.crate.lean - p.lean) * w;
  handsOn(p, carriedAt(x, y, z, face, scale), x, y, z, face, scale, w);
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
