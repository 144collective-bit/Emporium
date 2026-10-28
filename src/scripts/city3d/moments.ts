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
 * hands on the walk between, `crateAt()` is where the crate is). The keyed
 * poses themselves are momentposes.ts (walk mode's on-foot chunk).
 */
import { HIP_HEIGHT } from './skeleton';
import { SEAT_H } from './pedestrians';

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
  board: { stand: 0.42, t: { car: 0.75, kart: 0.8, plane: 0.85, boat: 0.9, bike: 0.8 }, fireAt: { car: 0.72, kart: 0.8, plane: 0.85, boat: 0.75, bike: 0.78 }, out: 0.7 },
  /** The car's handle height and the seat's over the ground; the kart's pod and seat; the aircraft's door frame (two hands) and sill; the boat's rails and its deck under the quay */
  car: { handle: 0.5, seat: 0.32, lean: 0.4, bob: -0.18, out: 0.42, behind: 0.04, turn: 0.45 },
  kart: { pod: 0.36, seat: 0.26, lean: 0.6, bob: -0.16 },
  plane: { frame: [0.78, 1.0] as [number, number], sill: 0.45, lean: 0.3, bob: -0.08 },
  boat: { rail: 0.72, railSide: 0.34, deck: -1.2, lean: 0.35, bob: -0.1 },
  /** The motorbike (vehicle plan Phase 7): how far off its side he stands, the seat's height (the scooter's; each bike's own is mybike.ts's), the lean in */
  bike: { out: 0.36, seat: 0.5, lean: 0.25, bob: -0.08 },
  /** The lift: inside the door, facing out, a beat before the fade */
  lift: { inside: 0.35, t: 0.3, fireAt: 0.5 },
  /** A crate: its size, how far short of it he stands, the lift and the set-down, where he carries it (out in front at the hips) */
  crate: { w: 0.42, h: 0.3, d: 0.3, stand: 0.44, t: 0.9, fireAt: 0.5, out: 0.3, up: 0.06, bend: 0.9, squat: -0.5, lean: 0.06, slow: 0.78 },
  /** The palm's stand-off from a surface */
  palm: 0.035,
};

export type MomentKind = 'door' | 'counter' | 'bench' | 'board' | 'alight' | 'lift' | 'pick' | 'put';
export type Vehicle = 'car' | 'kart' | 'plane' | 'boat' | 'bike';
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
  /** Getting in or out: which vehicle; your car's door (0 the driver's, 1 the passenger's) */
  vehicle?: Vehicle;
  side?: 0 | 1;
  /** One hand on the thing: which (0 his right, the default; 1 his left) */
  hand?: 0 | 1;
  /** The share of the clip at which `open` runs (a door's panel, the vehicle taking him, the lift's fade, the crate in hand) */
  fireAt?: number;
  /** The clip's length (seconds), where it isn't the kind's own */
  t?: number;
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
export const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

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

/** What carMark() reads of a car's inside (carinside.ts `Interior`): the driver's hip point, the door's edges and handle */
export interface Doorway {
  hip: [number, number, number];
  door: { back: number; hinge: number; handle: [number, number] };
}

/**
 * Getting into your car (vehicle plan Phase 3): by the door on the side he's on, the driver's on its left (`side`
 * 0) or the passenger's (1: the seat across, and he slides over to the wheel once in). He stands by the door's back
 * edge, `car.out` off the body (clear of the door as it swings open), facing into the doorway turned `car.turn`
 * towards the front, the nearer hand to the handle; the clip takes his root to that side's seat (the hips at the
 * seat's hip point). Null when that spot can't be stood on: the quick swap instead.
 */
export function carMark(car: { x: number; z: number; yaw: number; W: number }, n: Doorway, fx: number, fz: number, y: number, scale: number, blocked?: (x: number, z: number) => boolean): Mark | null {
  const fwx = Math.cos(car.yaw);
  const fwz = -Math.sin(car.yaw);
  const rx = Math.sin(car.yaw);
  const rz = Math.cos(car.yaw);
  const side = (fx - car.x) * rx + (fz - car.z) * rz >= 0 ? 1 : 0;
  const sg = side ? 1 : -1;
  const at = (u: number, v: number) => ({ x: car.x + fwx * u + rx * v, z: car.z + fwz * u + rz * v });
  const stand = at(n.door.back - MOMENT.car.behind, sg * (car.W / 2 + MOMENT.car.out));
  if (blocked?.(stand.x, stand.z)) return null;
  const face = Math.atan2(-sg * rx + MOMENT.car.turn * fwx, -sg * rz + MOMENT.car.turn * fwz);
  const [hx, hy] = n.door.handle;
  const handle = at(hx, sg * (car.W / 2 + MOMENT.palm));
  // (his right is (-cos face, sin face): the hand on the handle's side of him)
  const hand = (handle.x - stand.x) * -Math.cos(face) + (handle.z - stand.z) * Math.sin(face) >= 0 ? 0 : 1;
  const seat = at(n.hip[0], sg * Math.abs(n.hip[2]));
  return {
    kind: 'board',
    vehicle: 'car',
    x: stand.x,
    z: stand.z,
    y,
    face,
    hands: [{ x: handle.x, y: y + hy, z: handle.z }],
    hand,
    side,
    seat: { x: seat.x, z: seat.z, y: y + n.hip[1] - 0.03 * scale },
    fireAt: MOMENT.board.fireAt.car,
    t: MOMENT.board.t.car,
  };
}

/**
 * Getting on your motorbike (vehicle plan Phase 7): beside it on the side he's on, by the seat, `bike.out` off its
 * middle, facing across it turned towards the front, both hands to the grips (`bars`), the clip taking his root up
 * onto the seat as his leg swings over
 */
export function bikeMark(bike: { x: number; z: number; yaw: number }, s: { W: number; seat: [number, number]; bars: [number, number, number] }, fx: number, fz: number, y: number, blocked?: (x: number, z: number) => boolean): Mark {
  const fwx = Math.cos(bike.yaw);
  const fwz = -Math.sin(bike.yaw);
  const rx = Math.sin(bike.yaw);
  const rz = Math.cos(bike.yaw);
  const sg = (fx - bike.x) * rx + (fz - bike.z) * rz >= 0 ? 1 : -1;
  const at = (u: number, v: number) => ({ x: bike.x + fwx * u + rx * v, z: bike.z + fwz * u + rz * v });
  let stand = at(s.seat[0] + 0.1, sg * (s.W / 2 + MOMENT.bike.out));
  if (blocked?.(stand.x, stand.z)) stand = { x: fx, z: fz };
  const face = Math.atan2(-sg * rx + 0.6 * fwx, -sg * rz + 0.6 * fwz);
  const [bx, by, bh] = s.bars;
  // (his right is (-cos face, sin face): arms[0] to the grip on his right)
  const grips = [at(bx, bh), at(bx, -bh)];
  const right = (g: { x: number; z: number }) => (g.x - stand.x) * -Math.cos(face) + (g.z - stand.z) * Math.sin(face);
  if (right(grips[0]) < right(grips[1])) grips.reverse();
  const seat = at(s.seat[0], 0);
  return {
    kind: 'board',
    vehicle: 'bike',
    x: stand.x,
    z: stand.z,
    y,
    face,
    hands: grips.map((g) => ({ x: g.x, y: y + by, z: g.z })),
    seat: { x: seat.x, z: seat.z, y: y + s.seat[1] },
    fireAt: MOMENT.board.fireAt.bike,
    t: MOMENT.board.t.bike,
  };
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
