/*
 * The fight animations (docs/fight-plan.md, Phase 1): every move, reaction
 * and idle of a fight as data, keyframed on the Degen rig's `Pose`
 * (character.ts: bob, lean, twist, side, the head, and each arm's and leg's
 * swing `fwd`, spread `out` and bend). DOM-free and free of three.js, so the
 * tests load it in Node and a designer can tune the numbers.
 *
 * - A clip is a list of keys `{ t, pose, ease }` at 60 frames a second. A key
 *   says only what moves; everything it leaves out is the clip's base pose
 *   (the guard, or the lying pose for `down`). `sampleClip()` eases between
 *   the keys (the ease named on a key is the way INTO that key: 'out' snaps
 *   into a strike, 'in' pulls away from it), clamps past the end of a
 *   one-shot clip and wraps a loop (from `loopFrom`, so the block's raise
 *   plays once and its hold loops).
 * - A move's clip is exactly as long as the move in fight-sim.ts (`MOVES`:
 *   start-up + active + recovery frames): the wind-up runs over the start-up,
 *   the strike is at full reach on the first active frame (the frame the sim
 *   lands the hit on) and holds through the active frames, and the recovery
 *   pulls back into the guard. The sim moves the fighter's root itself (the
 *   move's `lunge`); a clip never moves the root except `bob`.
 * - Every one-shot clip starts and ends on the guard's first frame, so the
 *   view can cut between them; `knockdown` ends on `KNOCKDOWN_LIE`, which
 *   `down` loops and `getup` starts from.
 * - `root` is what `Pose` can't say: the figure's group lifted by `y` tiles
 *   and tipped back by `pitch` radians (0 standing, about -1.5 flat on the
 *   back, so the figure's +z then points up) about the point `pivot` tiles
 *   up its own axis: 0 is the feet, `PELVIS` (the rig's `HIP_HEIGHT`) the
 *   hips, so the fall tips back from the hips and the feet come up while the
 *   hips drop (`y` goes to about -PELVIS lying). `rootShift()` gives the
 *   view where the group's origin then goes.
 * - A fist can turn: an arm's `wrist` (character.ts) rolls the hand about
 *   the forearm (positive brings the thumb inward on a forward arm, so a
 *   left hook's palm faces down; mirrored it's negated) and bends it at the
 *   wrist (positive tips the fist forward, negative cocks it back). The jab
 *   and the cross keep a vertical fist, the hook turns over, the uppercut
 *   comes up palm-in.
 * - The view (fight.ts) picks a clip from the fighter's `move` / `hurt` /
 *   `down` / `getup` / `blocking` (`moveClip()`, `hurtClip()`), samples it at
 *   the fighter's frame, mirrors it for the other hand or foot
 *   (`mirror: true` swaps the limbs and flips side, twist and the head's
 *   yaw) and crossfades with `blendPose()` into the guard or over the walk
 *   cycle (the legs keep walking under a punch thrown on the move).
 *
 * The rig's numbers (poseSkeleton() in skeleton.ts): an arm's `fwd` swings the
 * upper arm forward from hanging (PI/2 is straight ahead), `out` spreads it
 * from the body, `bend` folds the forearm forward and up; a leg's `fwd`
 * raises the thigh forward, `bend` folds the shin back. Positive `lean` tips
 * the chest forward, positive `twist` brings the left shoulder forward,
 * positive `headPitch` lifts the chin, positive `side` lifts the right hip.
 */
import type { Limb, Pose, Wrist } from './character';
import { MOVES, type MoveId } from './fight-sim';

export type ClipId =
  | 'guard'
  | 'jab'
  | 'cross'
  | 'hook'
  | 'uppercut'
  | 'frontKick'
  | 'roundhouse'
  | 'dodge'
  | 'block'
  | 'blockHit'
  | 'hitHead'
  | 'hitBody'
  | 'stagger'
  | 'knockdown'
  | 'down'
  | 'getup'
  | 'taunt'
  | 'victory';

/** Where the figure's group goes, beyond what a Pose can say */
export interface Root {
  /** The group lifted (tiles; negative drops it) */
  y: number;
  /** The whole body tipped back about the pivot (radians; 0 standing, about -1.5 flat on the back) */
  pitch: number;
  /** The height the pitch turns about, up the figure's own axis (tiles at scale 1; 0 the feet, PELVIS the hips) */
  pivot: number;
}
/** The hips' height standing (HIP_HEIGHT in character.ts): where the fall and the get-up pivot */
export const PELVIS = 0.62;

/**
 * Where a root puts the figure's origin (the feet when standing): lifted `dy`
 * and moved `dz` along the way it faces, so that its pitch turns about
 * `(0, pivot, 0)` in its own space rather than the feet. The view sets the
 * group's position from this (times its scale) and its rotation from the
 * pitch and the yaw.
 */
export function rootShift(r: Root): { dy: number; dz: number } {
  return { dy: r.y + r.pivot * (1 - Math.cos(r.pitch)), dz: 0 - r.pivot * Math.sin(r.pitch) };
}
/** How high the hips are off the ground for a pose (tiles at scale 1) */
export function hipHeight(p: FightPose): number {
  return rootShift(p.root).dy + (PELVIS + p.bob) * Math.cos(p.root.pitch);
}
export interface FightPose extends Pose {
  turn: number;
  sway: number;
  root: Root;
}

export type Ease = 'in' | 'out' | 'inOut' | 'linear';
/** What a key sets; anything left out is the clip's base pose */
export interface PosePart {
  bob?: number;
  lean?: number;
  twist?: number;
  side?: number;
  /** The hips turned (positive brings the left hip forward; the shoulders' `twist` is on top) and shifted sideways (tiles, positive to the right) */
  turn?: number;
  sway?: number;
  headYaw?: number;
  headPitch?: number;
  armL?: Limb;
  armR?: Limb;
  legL?: Limb;
  legR?: Limb;
  root?: Root;
}
export interface Key {
  /** The frame (60 a second) */
  t: number;
  pose: PosePart;
  /** The way into this key from the one before (default 'inOut') */
  ease?: Ease;
}
export interface Clip {
  id: ClipId;
  /** Frames: a one-shot clip's frames run 0..frames-1 and hold the last; a loop's wrap at `frames` */
  frames: number;
  loop: boolean;
  /** A loop restarts here (default 0): the block's raise plays once, its hold loops */
  loopFrom?: number;
  keys: Key[];
}

/* ---------- The pose DSL ---------- */

/** An arm: swing forward, spread out, forearm bend, upper arm twist, and the wrist (`W()`) */
const arm = (fwd: number, out: number, bend: number, twist = 0, wrist?: Wrist): Limb => (wrist ? { fwd, out, bend, twist, wrist } : { fwd, out, bend, twist });
/** A leg: thigh forward, spread out, knee bend */
const leg = (fwd: number, out: number, bend: number): Limb => ({ fwd, out, bend, twist: 0 });
/** A wrist: the fist rolled about the forearm and bent at the wrist */
const W = (roll: number, bend = 0): Wrist => ({ roll, bend });
const root = (y: number, pitch: number, pivot = 0): Root => ({ y, pitch, pivot });
const key = (t: number, pose: PosePart, ease?: Ease): Key => ({ t, pose, ease });

/**
 * The guard, the boxer's stance every clip starts from and returns to: the
 * left (lead) side forward, fists up by the chin with the elbows in, chin
 * down, knees soft.
 */
const GUARD: Required<PosePart> = {
  bob: 0,
  lean: 0.12,
  twist: 0.2,
  side: 0,
  turn: 0.1,
  sway: 0,
  headYaw: 0,
  headPitch: -0.08,
  armL: arm(0.45, 0.12, 2.3),
  armR: arm(0.3, 0.1, 2.45),
  legL: leg(0.25, 0.1, 0.3),
  legR: leg(-0.2, 0.15, 0.35),
  root: root(0, 0),
};
/** The guard with some of it changed */
const guard = (part: PosePart = {}): PosePart => ({ ...GUARD, ...part });

/** Both forearms up in front of the face, elbows tucked, chin down: the block's hold */
const BLOCK: PosePart = {
  lean: 0.2,
  twist: 0.1,
  headPitch: -0.2,
  armL: arm(0.75, -0.12, 2.4),
  armR: arm(0.75, -0.12, 2.4),
  legL: leg(0.2, 0.1, 0.35),
  legR: leg(-0.15, 0.15, 0.4),
};

/**
 * Flat on the back (the group tipped -1.5 about the hips and dropped so they
 * lie on the canvas; the figure's +z points up and its limbs lie along the
 * ground): arms flung out, one knee up a little, the face to the sky.
 * `knockdown` ends here, `down` loops it, `getup` starts from it. The view
 * draws the stars.
 */
export const KNOCKDOWN_LIE: Required<PosePart> = {
  bob: 0,
  lean: 0.08,
  twist: 0,
  side: 0,
  turn: 0,
  sway: 0,
  headYaw: 0.2,
  headPitch: 0.1,
  armL: arm(0.0, 1.25, 0.35),
  armR: arm(0.0, 1.1, 0.45),
  legL: leg(0.05, 0.12, 0.08),
  legR: leg(0.5, 0.2, 0.9),
  root: root(-0.52, -1.5, PELVIS),
};
const lie = (part: PosePart = {}): PosePart => ({ ...KNOCKDOWN_LIE, ...part });

/* ---------- The clips ---------- */

const clip = (id: ClipId, frames: number, keys: Key[], opts: { loop?: boolean; loopFrom?: number; base?: Required<PosePart> } = {}): Clip & { base: Required<PosePart> } => ({
  id,
  frames,
  loop: !!opts.loop,
  loopFrom: opts.loopFrom,
  keys,
  base: opts.base ?? GUARD,
});

/** A move's three phases from fight-sim.ts, so the strike lands on the sim's frame */
const phases = (startup: number, active: number, recovery: number) => ({ wind: Math.round(startup * 0.55), hit: startup, held: startup + active - 1, end: startup + active + recovery - 1 });

/** The guard's bounce: a rise and a drop every `period` frames */
const bounceKeys = (frames: number, period: number, up: number, extra: (i: number) => PosePart = () => ({})) => {
  const keys: Key[] = [];
  for (let t = 0; t < frames; t += period) {
    const i = t / period;
    keys.push(key(t, guard({ bob: 0, ...extra(i) })), key(t + period * 0.5, guard({ bob: up, ...extra(i + 0.5) }), 'out'));
  }
  keys.push(key(frames, guard()));
  return keys;
};

const JAB = phases(6, 3, 8);
const CROSS = phases(8, 3, 12);
const HOOK = phases(10, 4, 16);
const UPPER = phases(12, 4, 24);
const FKICK = phases(10, 4, 16);
const RHOUSE = phases(14, 5, 22);
const DODGE = phases(4, 10, 8);

const CLIP_LIST: (Clip & { base: Required<PosePart> })[] = [
  // The boxer's idle: a bounce on the balls of the feet, the weight shifting from foot to foot with the hips, the lead hand pumping
  clip(
    'guard',
    90,
    bounceKeys(90, 22.5, 0.014, (i) => {
      const w = Math.sin(i * Math.PI * 0.5) * 0.035;
      return { side: w, sway: w * 0.6, turn: 0.1 + w, twist: 0.2 + w * 0.5, armL: arm(0.45 + Math.abs(w) * 3, 0.12, 2.3 - Math.abs(w) * 2), headYaw: w * 1.5, legL: leg(0.25, 0.1, 0.3 + Math.max(0, w) * 2), legR: leg(-0.2, 0.15, 0.35 + Math.max(0, -w) * 2) };
    }),
    { loop: true }
  ),

  // Jab: the lead hand straight out and back, the lead hip and shoulder snapping forward behind it, a short dip;
  // the hand comes straight back to the chin (a touch past the guard, then settles)
  clip('jab', JAB.end + 1, [
    key(0, guard()),
    key(JAB.wind, guard({ twist: 0.3, turn: 0.16, lean: 0.1, sway: 0.01, armL: arm(0.35, 0.1, 2.4, 0, W(0, -0.35)), side: 0.03 })),
    key(JAB.hit, guard({ twist: 0.05, turn: 0.0, sway: -0.02, lean: 0.22, side: -0.03, headPitch: -0.12, armL: arm(1.6, 0.05, 0.1, 0, W(0, 0.1)), armR: arm(0.3, 0.05, 2.5), legL: leg(0.32, 0.1, 0.42), legR: leg(-0.27, 0.15, 0.22) }), 'out'),
    key(JAB.held, guard({ twist: 0.05, turn: 0.0, sway: -0.02, lean: 0.22, side: -0.03, headPitch: -0.12, armL: arm(1.6, 0.05, 0.1, 0, W(0, 0.1)), armR: arm(0.3, 0.05, 2.5), legL: leg(0.32, 0.1, 0.42), legR: leg(-0.27, 0.15, 0.22) }), 'linear'),
    key(JAB.end - 3, guard({ twist: 0.24, turn: 0.13, armL: arm(0.5, 0.12, 2.4) }), 'in'),
    key(JAB.end, guard()),
  ]),

  // Cross: the rear hand, driven by the rear hip turning through and the rear heel coming up, the weight onto
  // the front foot; the hips swing back past the guard as the hand returns
  clip('cross', CROSS.end + 1, [
    key(0, guard()),
    key(CROSS.wind, guard({ twist: 0.3, turn: 0.28, lean: 0.08, side: 0.05, sway: 0.02, armR: arm(0.2, 0.15, 2.5, 0, W(0, -0.4)), armL: arm(0.55, 0.1, 2.2), legR: leg(-0.25, 0.15, 0.45) })),
    key(CROSS.hit, guard({ twist: -0.3, turn: -0.3, lean: 0.3, side: -0.06, sway: -0.03, headPitch: -0.1, headYaw: 0.1, armR: arm(1.65, 0.02, 0.08, 0, W(0, 0.1)), armL: arm(0.5, 0.0, 2.45), legL: leg(0.38, 0.1, 0.5), legR: leg(-0.42, 0.2, 0.2), bob: -0.025 }), 'out'),
    key(CROSS.held, guard({ twist: -0.3, turn: -0.3, lean: 0.3, side: -0.06, sway: -0.03, headPitch: -0.1, headYaw: 0.1, armR: arm(1.65, 0.02, 0.08, 0, W(0, 0.1)), armL: arm(0.5, 0.0, 2.45), legL: leg(0.38, 0.1, 0.5), legR: leg(-0.42, 0.2, 0.2), bob: -0.025 }), 'linear'),
    key(CROSS.end - 5, guard({ twist: 0.28, turn: 0.16, sway: 0.01, armR: arm(0.4, 0.1, 2.4) }), 'in'),
    key(CROSS.end, guard()),
  ]),

  // Hook: the weight loads onto the lead side, the lead arm out to the side (fist still vertical, cocked back),
  // then the lead hip pivots through and the arm swings in with the elbow up at shoulder height, the fist turning
  // over (the wrist rolls, palm down) as it crosses the front at chin height
  clip('hook', HOOK.end + 1, [
    key(0, guard()),
    // (the upper arm's twist sets which way the forearm folds: here across the front; the wrist then sets the fist)
    key(HOOK.wind, guard({ twist: 0.35, turn: 0.32, lean: 0.1, side: 0.06, sway: -0.03, armL: arm(0.35, 0.85, 1.5, -0.3, W(-0.5, -0.3)), armR: arm(0.35, 0.05, 2.5), legL: leg(0.3, 0.15, 0.45) })),
    key(HOOK.hit, guard({ twist: -0.3, turn: -0.28, lean: 0.18, side: -0.08, sway: 0.02, headYaw: 0.15, headPitch: -0.1, armL: arm(1.8, 0.0, 1.1, 1.3, W(0.4, 0.15)), armR: arm(0.3, 0.05, 2.5), legL: leg(0.3, 0.12, 0.4), legR: leg(-0.3, 0.2, 0.3), bob: -0.015 }), 'out'),
    key(HOOK.held, guard({ twist: -0.38, turn: -0.32, lean: 0.18, side: -0.08, sway: 0.02, headYaw: 0.15, headPitch: -0.1, armL: arm(1.9, -0.2, 1.2, 1.4, W(0.5, 0.2)), armR: arm(0.3, 0.05, 2.5), legL: leg(0.3, 0.12, 0.4), legR: leg(-0.3, 0.2, 0.3), bob: -0.015 }), 'linear'),
    key(HOOK.end - 6, guard({ twist: 0.05, turn: 0.04, armL: arm(0.7, 0.25, 2.0, 0, W(0.15, 0.05)) }), 'in'),
    key(HOOK.end, guard()),
  ]),

  // Uppercut: the rear hand dips with the knees and the rear hip (the fist cocked back), then drives up from the
  // legs as the hip turns through, the wrist rolling it palm-up as it rises past the chin (the palm to the puncher)
  clip('uppercut', UPPER.end + 1, [
    key(0, guard()),
    key(UPPER.wind, guard({ bob: -0.07, lean: 0.3, twist: 0.3, turn: 0.3, side: 0.05, sway: 0.03, headPitch: -0.15, armR: arm(-0.3, 0.2, 2.0, 0, W(0.2, -0.4)), armL: arm(0.5, 0.1, 2.3), legL: leg(0.4, 0.1, 0.8), legR: leg(-0.1, 0.15, 0.85) })),
    key(UPPER.hit, guard({ bob: 0.01, lean: 0.05, twist: -0.25, turn: -0.32, side: -0.06, sway: -0.02, headPitch: 0.05, armR: arm(1.4, 0.05, 0.85, 0.1, W(1.0, -0.1)), armL: arm(0.45, 0.05, 2.45), legL: leg(0.3, 0.1, 0.25), legR: leg(-0.35, 0.2, 0.15) }), 'out'),
    key(UPPER.held, guard({ bob: 0.02, lean: 0.0, twist: -0.3, turn: -0.34, side: -0.06, sway: -0.02, headPitch: 0.08, armR: arm(1.5, 0.05, 1.4, 0.1, W(1.2, 0.1)), armL: arm(0.45, 0.05, 2.45), legL: leg(0.3, 0.1, 0.2), legR: leg(-0.35, 0.2, 0.1) }), 'linear'),
    key(UPPER.end - 10, guard({ twist: -0.05, turn: -0.04, lean: 0.15, armR: arm(0.6, 0.1, 2.0, 0, W(0.3, 0)) }), 'in'),
    key(UPPER.end, guard()),
  ]),

  // Front kick: the weight onto the left foot, chamber the right knee, then the hip pushes through as the foot snaps
  // out with the shin, a lean back to balance, the arms up
  clip('frontKick', FKICK.end + 1, [
    key(0, guard()),
    key(FKICK.wind, guard({ lean: 0.0, bob: -0.01, side: 0.08, sway: -0.04, twist: 0.1, turn: 0.05, legR: leg(1.1, 0.1, 2.2), legL: leg(0.05, 0.08, 0.25), armL: arm(0.5, 0.15, 2.2), armR: arm(0.35, 0.15, 2.3) })),
    key(FKICK.hit, guard({ lean: -0.2, bob: 0.0, side: 0.1, sway: -0.05, twist: 0.1, turn: -0.15, headPitch: -0.05, legR: leg(1.45, 0.1, 0.0), legL: leg(-0.05, 0.08, 0.2), armL: arm(0.55, 0.2, 2.1), armR: arm(0.4, 0.2, 2.2) }), 'out'),
    key(FKICK.held, guard({ lean: -0.2, bob: 0.0, side: 0.1, sway: -0.05, twist: 0.1, turn: -0.15, headPitch: -0.05, legR: leg(1.45, 0.1, 0.0), legL: leg(-0.05, 0.08, 0.2), armL: arm(0.55, 0.2, 2.1), armR: arm(0.4, 0.2, 2.2) }), 'linear'),
    key(FKICK.end - 7, guard({ lean: 0.05, side: 0.06, sway: -0.02, turn: 0.05, legR: leg(0.8, 0.1, 1.8) }), 'in'),
    key(FKICK.end, guard()),
  ]),

  // Roundhouse: the weight onto the left foot, pivot on it as the hip turns right over, the right leg swinging in an
  // arc at waist height, the body leaning away and the arms out for balance
  clip('roundhouse', RHOUSE.end + 1, [
    key(0, guard()),
    key(RHOUSE.wind, guard({ lean: 0.05, twist: 0.25, turn: 0.3, side: 0.12, sway: -0.05, bob: -0.01, legR: leg(0.6, 0.9, 1.9), legL: leg(0.0, 0.12, 0.3), armL: arm(0.6, 0.35, 2.0), armR: arm(0.2, 0.3, 2.3) })),
    key(RHOUSE.hit, guard({ lean: -0.35, twist: -0.1, turn: -0.75, side: -0.22, sway: -0.07, bob: 0.0, headYaw: 0.2, headPitch: 0.02, legR: leg(1.9, 0.15, 0.45), legL: leg(-0.1, 0.1, 0.15), armL: arm(0.2, 0.6, 1.6), armR: arm(0.9, 0.55, 1.4) }), 'out'),
    key(RHOUSE.held, guard({ lean: -0.35, twist: -0.2, turn: -0.85, side: -0.22, sway: -0.07, bob: 0.0, headYaw: 0.3, headPitch: 0.02, legR: leg(1.85, 0.0, 0.5), legL: leg(-0.1, 0.1, 0.15), armL: arm(0.15, 0.65, 1.6), armR: arm(1.0, 0.5, 1.4) }), 'linear'),
    key(RHOUSE.end - 10, guard({ lean: 0.0, twist: 0.0, turn: -0.15, side: 0.05, sway: -0.02, legR: leg(0.5, 0.3, 1.6), armL: arm(0.5, 0.2, 2.1), armR: arm(0.4, 0.2, 2.2) }), 'in'),
    key(RHOUSE.end, guard()),
  ]),

  // Dodge: a quick slip, the hips and head going down and to the side, the hands kept up
  clip('dodge', DODGE.end + 1, [
    key(0, guard()),
    key(DODGE.hit, guard({ bob: -0.13, lean: 0.4, side: 0.22, sway: 0.07, twist: 0.3, turn: 0.22, headPitch: -0.3, headYaw: 0.45, legL: leg(0.55, 0.25, 1.0), legR: leg(-0.1, 0.3, 0.9), armL: arm(0.6, 0.0, 2.4), armR: arm(0.5, 0.0, 2.5) }), 'out'),
    key(DODGE.hit + 6, guard({ bob: -0.12, lean: 0.38, side: 0.15, sway: 0.06, twist: 0.22, turn: 0.18, headPitch: -0.28, headYaw: 0.4, legL: leg(0.5, 0.25, 0.95), legR: leg(-0.15, 0.3, 0.85), armL: arm(0.6, 0.0, 2.4), armR: arm(0.5, 0.0, 2.5) }), 'linear'),
    key(DODGE.end, guard(), 'in'),
  ]),

  // Block: a short raise into the hold (both forearms up in front of the face, the hips square), then the hold loops with a breath
  clip(
    'block',
    48,
    [key(0, guard()), key(8, guard(BLOCK), 'out'), key(28, guard({ ...BLOCK, bob: -0.008, lean: 0.22 })), key(48, guard(BLOCK))],
    { loop: true, loopFrom: 8 }
  ),

  // The flinch of a blocked hit: the arms pushed back, a small lean back and the weight onto the back foot, then back to the block
  clip('blockHit', 12, [
    key(0, guard(BLOCK)),
    key(3, guard({ ...BLOCK, lean: 0.02, bob: -0.02, headPitch: -0.1, armL: arm(0.5, -0.12, 2.65), armR: arm(0.5, -0.12, 2.65), legL: leg(0.15, 0.1, 0.45), legR: leg(-0.25, 0.15, 0.5) }), 'out'),
    key(11, guard(BLOCK), 'in'),
  ]),

  // The reactions are keyed for a blow from the attacker's right hand or foot, landing on the fighter's left
  // (the view mirrors them for the other side): the head snaps away from it, the left shoulder and hip are
  // knocked back, the weight goes onto the far foot.

  // Hit to the head: the head snaps back and away, the shoulders and hips follow, a step's bob, the arms drop a little
  clip('hitHead', 14, [
    key(0, guard()),
    key(3, guard({ headPitch: 0.5, headYaw: 0.55, lean: -0.22, twist: -0.25, turn: -0.08, sway: 0.04, side: 0.06, bob: -0.02, armL: arm(0.3, 0.3, 1.7), armR: arm(0.15, 0.3, 1.8), legL: leg(0.15, 0.12, 0.45), legR: leg(-0.3, 0.2, 0.4) }), 'out'),
    key(6, guard({ headPitch: 0.4, headYaw: 0.45, lean: -0.15, twist: -0.18, turn: -0.06, sway: 0.035, side: 0.04, bob: -0.025, armL: arm(0.3, 0.3, 1.7), armR: arm(0.15, 0.3, 1.8), legL: leg(0.15, 0.12, 0.45), legR: leg(-0.3, 0.2, 0.4) }), 'linear'),
    key(13, guard(), 'in'),
  ]),

  // Hit to the body: fold forward at the waist round the blow, the struck side turned away, elbows in, a knee bends
  clip('hitBody', 16, [
    key(0, guard()),
    key(4, guard({ lean: 0.6, bob: -0.08, headPitch: -0.3, twist: -0.15, turn: -0.12, sway: 0.03, side: 0.05, armL: arm(0.3, -0.1, 2.2), armR: arm(0.2, -0.1, 2.3), legL: leg(0.35, 0.1, 0.5), legR: leg(0.0, 0.15, 0.9) }), 'out'),
    key(8, guard({ lean: 0.55, bob: -0.075, headPitch: -0.3, twist: -0.12, turn: -0.1, sway: 0.03, side: 0.04, armL: arm(0.3, -0.1, 2.2), armR: arm(0.2, -0.1, 2.3), legL: leg(0.35, 0.1, 0.5), legR: leg(0.0, 0.15, 0.9) }), 'linear'),
    key(15, guard(), 'in'),
  ]),

  // Stagger: a big reel back and away with the arms flailing, the hips thrown out, a stumble step to catch it, the
  // head rolling, the body swinging back the other way, a slow recovery
  clip('stagger', 36, [
    key(0, guard()),
    key(5, guard({ lean: -0.5, bob: -0.03, side: 0.1, twist: -0.3, turn: -0.2, sway: 0.06, headPitch: 0.45, headYaw: 0.5, armL: arm(1.2, 1.0, 0.4), armR: arm(0.9, 1.1, 0.5), legL: leg(0.3, 0.2, 0.3), legR: leg(-0.6, 0.25, 0.5) }), 'out'),
    key(12, guard({ lean: -0.4, bob: -0.07, side: -0.12, twist: 0.2, turn: 0.15, sway: -0.04, headPitch: 0.3, headYaw: -0.4, armL: arm(0.6, 1.2, 0.5), armR: arm(1.3, 0.9, 0.4), legL: leg(-0.5, 0.25, 0.4), legR: leg(0.4, 0.2, 0.9) })),
    key(20, guard({ lean: -0.2, bob: -0.05, side: 0.08, twist: -0.1, turn: -0.05, sway: 0.03, headPitch: 0.1, headYaw: 0.3, armL: arm(0.8, 0.8, 0.9), armR: arm(0.7, 0.8, 0.9), legL: leg(0.3, 0.2, 0.6), legR: leg(-0.35, 0.2, 0.5) })),
    key(28, guard({ lean: 0.05, bob: -0.02, turn: 0.08, headPitch: -0.05, headYaw: 0.05, armL: arm(0.5, 0.3, 1.8), armR: arm(0.4, 0.3, 1.9), legL: leg(0.25, 0.12, 0.4), legR: leg(-0.25, 0.15, 0.45) })),
    key(35, guard(), 'in'),
  ]),

  // Knockdown: the body tips back from the hips as they drop (the feet come up off the canvas as the back
  // lands), the legs leave the pose, lands flat with a bounce, arms out
  clip('knockdown', 30, [
    key(0, guard({ root: root(0, 0, PELVIS) })),
    key(4, guard({ lean: -0.35, twist: -0.2, turn: -0.15, sway: 0.04, side: 0.06, headPitch: 0.5, headYaw: 0.2, bob: -0.02, armL: arm(1.3, 0.8, 0.5), armR: arm(1.1, 0.9, 0.6), legL: leg(0.3, 0.15, 0.45), legR: leg(-0.2, 0.2, 0.6), root: root(-0.02, -0.2, PELVIS) }), 'out'),
    key(14, guard({ lean: -0.1, twist: -0.15, turn: -0.12, sway: 0.03, side: 0.04, headPitch: 0.3, headYaw: 0.2, bob: -0.03, armL: arm(1.0, 1.1, 0.4), armR: arm(0.8, 1.2, 0.5), legL: leg(0.6, 0.15, 0.9), legR: leg(0.9, 0.2, 1.4), root: root(-0.26, -0.95, PELVIS) }), 'in'),
    key(21, lie({ lean: 0.05, twist: 0.06, turn: 0.04, headPitch: 0.15, bob: -0.02, armL: arm(0.3, 1.2, 0.4), armR: arm(0.25, 1.1, 0.5), legL: leg(0.35, 0.12, 0.5), legR: leg(0.7, 0.2, 1.1), root: root(-0.5, -1.48, PELVIS) }), 'in'),
    key(25, lie({ root: root(-0.55, -1.53, PELVIS), legR: leg(0.55, 0.2, 0.95), armL: arm(0.2, 1.3, 0.3), armR: arm(0.15, 1.15, 0.4) }), 'out'),
    key(29, lie()),
  ]),

  // Down: flat on the back, a slow breath, the head lolling now and then
  clip(
    'down',
    120,
    [
      key(0, lie()),
      key(30, lie({ lean: 0.11, headYaw: 0.1, legR: leg(0.52, 0.2, 0.92) })),
      key(60, lie({ lean: 0.08, headYaw: -0.15, headPitch: 0.12 })),
      key(90, lie({ lean: 0.11, headYaw: 0.25, legR: leg(0.48, 0.2, 0.88) })),
      key(120, lie()),
    ],
    { loop: true, base: KNOCKDOWN_LIE }
  ),

  // Get up (T.getupFrames), pivoting at the hips: roll onto the right side with the right hand planted on the
  // canvas, sit up on it with the right knee tucked under, push up onto the hand and the knee with the left foot
  // planted in front, rise through a crouch, stand into the guard
  clip(
    'getup',
    40,
    [
      key(0, lie()),
      key(8, lie({ side: 0.3, twist: 0.3, turn: 0.35, sway: 0.03, headYaw: -0.4, headPitch: -0.1, armL: arm(1.3, 0.2, 0.9), armR: arm(0.1, 0.8, 0.3), legL: leg(0.4, 0.1, 0.8), legR: leg(0.45, 0.3, 0.7), root: root(-0.5, -1.4, PELVIS) })),
      key(16, lie({ side: 0.2, twist: 0.25, turn: 0.3, sway: 0.04, lean: 0.5, headYaw: -0.2, headPitch: -0.15, armL: arm(0.9, 0.3, 1.0), armR: arm(-0.9, 0.7, 0.8), legL: leg(1.2, 0.15, 1.2), legR: leg(0.35, 0.35, 2.4), root: root(-0.5, -0.95, PELVIS) })),
      key(24, lie({ side: 0.1, twist: 0.15, turn: 0.18, sway: 0.03, lean: 0.6, headYaw: -0.1, headPitch: -0.2, bob: -0.2, armL: arm(0.8, 0.2, 1.4), armR: arm(-0.2, 0.3, 0.1), legL: leg(1.7, 0.2, 1.4), legR: leg(0.7, 0.3, 2.5), root: root(-0.3, -0.45, PELVIS) })),
      key(31, guard({ side: 0.05, twist: 0.1, turn: 0.08, sway: 0.01, lean: 0.45, headPitch: -0.2, bob: -0.3, armL: arm(0.8, 0.2, 1.3), armR: arm(0.6, 0.25, 1.4), legL: leg(1.3, 0.12, 2.1), legR: leg(1.3, 0.2, 2.1), root: root(-0.02, -0.1, PELVIS) }), 'out'),
      key(36, guard({ lean: 0.25, bob: -0.1, headPitch: -0.12, armL: arm(0.5, 0.15, 2.0), armR: arm(0.4, 0.15, 2.1), legL: leg(0.5, 0.1, 0.9), legR: leg(0.0, 0.15, 0.9) })),
      key(39, guard(), 'in'),
    ],
    { base: KNOCKDOWN_LIE }
  ),

  // Taunt: a come-on wave with the right hand, a small bounce, the head cocked
  clip('taunt', 60, [
    key(0, guard()),
    key(8, guard({ side: 0.12, twist: 0.1, headYaw: -0.15, headPitch: 0.05, bob: 0.01, armR: arm(1.5, 0.4, 1.5), armL: arm(0.4, 0.2, 2.2) }), 'out'),
    key(15, guard({ side: 0.12, twist: 0.1, headYaw: -0.15, headPitch: 0.05, bob: -0.01, armR: arm(1.45, 0.25, 1.95), armL: arm(0.4, 0.2, 2.2) })),
    key(22, guard({ side: 0.12, twist: 0.1, headYaw: -0.2, headPitch: 0.08, bob: 0.01, armR: arm(1.5, 0.4, 1.5), armL: arm(0.4, 0.2, 2.2) })),
    key(29, guard({ side: 0.12, twist: 0.1, headYaw: -0.15, headPitch: 0.05, bob: -0.01, armR: arm(1.45, 0.25, 1.95), armL: arm(0.4, 0.2, 2.2) })),
    key(36, guard({ side: 0.12, twist: 0.1, headYaw: -0.2, headPitch: 0.08, bob: 0.01, armR: arm(1.5, 0.4, 1.5), armL: arm(0.4, 0.2, 2.2) })),
    key(43, guard({ side: 0.12, twist: 0.1, headYaw: -0.15, headPitch: 0.05, bob: -0.01, armR: arm(1.45, 0.25, 1.95), armL: arm(0.4, 0.2, 2.2) })),
    key(50, guard({ side: 0.06, headYaw: -0.08, armR: arm(0.9, 0.3, 2.2), armL: arm(0.45, 0.15, 2.3) })),
    key(59, guard(), 'in'),
  ]),

  // Victory: both arms up, a bounce, the head looking about
  clip(
    'victory',
    90,
    [
      key(0, guard()),
      key(6, guard({ bob: 0.03, lean: -0.05, headPitch: 0.25, headYaw: 0.0, armL: arm(2.75, 0.4, 0.35), armR: arm(2.75, 0.4, 0.35), legL: leg(0.15, 0.15, 0.15), legR: leg(-0.1, 0.18, 0.15) }), 'out'),
      key(16, guard({ bob: -0.03, lean: -0.02, headPitch: 0.2, headYaw: 0.4, armL: arm(2.7, 0.35, 0.6), armR: arm(2.7, 0.35, 0.6), legL: leg(0.15, 0.15, 0.4), legR: leg(-0.1, 0.18, 0.4) })),
      key(26, guard({ bob: 0.035, lean: -0.05, headPitch: 0.25, headYaw: 0.3, armL: arm(2.8, 0.45, 0.3), armR: arm(2.8, 0.45, 0.3), legL: leg(0.15, 0.15, 0.1), legR: leg(-0.1, 0.18, 0.1) }), 'out'),
      key(36, guard({ bob: -0.03, lean: -0.02, headPitch: 0.2, headYaw: -0.3, armL: arm(2.7, 0.35, 0.6), armR: arm(2.7, 0.35, 0.6), legL: leg(0.15, 0.15, 0.4), legR: leg(-0.1, 0.18, 0.4) })),
      key(46, guard({ bob: 0.035, lean: -0.05, headPitch: 0.25, headYaw: -0.45, armL: arm(2.8, 0.45, 0.3), armR: arm(2.8, 0.45, 0.3), legL: leg(0.15, 0.15, 0.1), legR: leg(-0.1, 0.18, 0.1) }), 'out'),
      key(56, guard({ bob: -0.03, lean: -0.02, headPitch: 0.2, headYaw: -0.1, armL: arm(2.7, 0.35, 0.6), armR: arm(2.7, 0.35, 0.6), legL: leg(0.15, 0.15, 0.4), legR: leg(-0.1, 0.18, 0.4) })),
      key(66, guard({ bob: 0.035, lean: -0.05, headPitch: 0.25, headYaw: 0.2, armL: arm(2.8, 0.45, 0.3), armR: arm(2.8, 0.45, 0.3), legL: leg(0.15, 0.15, 0.1), legR: leg(-0.1, 0.18, 0.1) }), 'out'),
      key(76, guard({ bob: -0.02, lean: 0.0, headPitch: 0.1, headYaw: 0.1, armL: arm(2.3, 0.4, 0.8), armR: arm(2.3, 0.4, 0.8), legL: leg(0.15, 0.15, 0.35), legR: leg(-0.1, 0.18, 0.35) })),
      key(90, guard()),
    ],
    { loop: true }
  ),
];

export const CLIPS = Object.fromEntries(CLIP_LIST.map((c) => [c.id, c])) as unknown as Record<ClipId, Clip>;
export const CLIP_IDS = CLIP_LIST.map((c) => c.id);

/* ---------- Sampling ---------- */

const EASES: Record<Ease, (u: number) => number> = {
  linear: (u) => u,
  in: (u) => u * u,
  out: (u) => 1 - (1 - u) * (1 - u),
  inOut: (u) => u * u * (3 - 2 * u),
};

/** A key's pose filled in from the clip's base: the full pose at that key */
function resolve(base: Required<PosePart>, part: PosePart): FightPose {
  const p = { ...base, ...part } as Required<PosePart>;
  const L = (l: Limb): Limb => ({ fwd: l.fwd, out: l.out, bend: l.bend, twist: l.twist ?? 0 });
  // An arm always carries a wrist here, so sampling and blending never allocate
  const A = (l: Limb): Limb => ({ ...L(l), wrist: { roll: l.wrist?.roll ?? 0, bend: l.wrist?.bend ?? 0 } });
  return {
    bob: p.bob,
    lean: p.lean,
    twist: p.twist,
    side: p.side,
    turn: p.turn,
    sway: p.sway,
    headYaw: p.headYaw,
    headPitch: p.headPitch,
    arms: [A(p.armL), A(p.armR)],
    legs: [L(p.legL), L(p.legR)],
    root: { y: p.root.y, pitch: p.root.pitch, pivot: p.root.pivot },
  };
}

/** Every clip's keys resolved to full poses once, in key order */
const RESOLVED: Record<ClipId, { t: number; pose: FightPose; ease: Ease }[]> = Object.fromEntries(
  CLIP_LIST.map((c) => [c.id, [...c.keys].sort((a, b) => a.t - b.t).map((k) => ({ t: k.t, pose: resolve(c.base, k.pose), ease: k.ease ?? 'inOut' }))])
) as Record<ClipId, { t: number; pose: FightPose; ease: Ease }[]>;

const copyLimb = (out: Limb, a: Limb) => {
  out.fwd = a.fwd;
  out.out = a.out;
  out.bend = a.bend;
  out.twist = a.twist ?? 0;
  if (a.wrist) {
    const w = out.wrist ?? (out.wrist = { roll: 0, bend: 0 });
    w.roll = a.wrist.roll;
    w.bend = a.wrist.bend;
  } else if (out.wrist) {
    out.wrist.roll = 0;
    out.wrist.bend = 0;
  }
};
function copyPose(out: FightPose, a: FightPose) {
  out.bob = a.bob;
  out.lean = a.lean;
  out.twist = a.twist;
  out.side = a.side;
  out.turn = a.turn;
  out.sway = a.sway;
  out.headYaw = a.headYaw;
  out.headPitch = a.headPitch;
  for (let i = 0; i < 2; i++) {
    copyLimb(out.arms[i], a.arms[i]);
    copyLimb(out.legs[i], a.legs[i]);
  }
  out.root.y = a.root.y;
  out.root.pitch = a.root.pitch;
  out.root.pivot = a.root.pivot;
}

/** A fresh pose on the guard's first frame */
export function newFightPose(): FightPose {
  return resolve(GUARD, {});
}

/** `out` = `a` eased to `b` by `k` (0..1), every field including the root */
export function blendPose(a: FightPose, b: FightPose, k: number, out: FightPose): FightPose {
  const L = (x: number, y: number) => x + (y - x) * k;
  out.bob = L(a.bob, b.bob);
  out.lean = L(a.lean, b.lean);
  out.twist = L(a.twist, b.twist);
  out.side = L(a.side, b.side);
  out.turn = L(a.turn ?? 0, b.turn ?? 0);
  out.sway = L(a.sway ?? 0, b.sway ?? 0);
  out.headYaw = L(a.headYaw, b.headYaw);
  out.headPitch = L(a.headPitch, b.headPitch);
  for (let i = 0; i < 2; i++) {
    for (const [o, x, y] of [
      [out.arms[i], a.arms[i], b.arms[i]],
      [out.legs[i], a.legs[i], b.legs[i]],
    ] as const) {
      o.fwd = L(x.fwd, y.fwd);
      o.out = L(x.out, y.out);
      o.bend = L(x.bend, y.bend);
      o.twist = L(x.twist ?? 0, y.twist ?? 0);
    }
    // The wrists (arms only)
    const o = out.arms[i];
    const x = a.arms[i].wrist;
    const y = b.arms[i].wrist;
    if (x || y) {
      const w = o.wrist ?? (o.wrist = { roll: 0, bend: 0 });
      w.roll = L(x?.roll ?? 0, y?.roll ?? 0);
      w.bend = L(x?.bend ?? 0, y?.bend ?? 0);
    } else if (o.wrist) {
      o.wrist.roll = 0;
      o.wrist.bend = 0;
    }
  }
  out.root.y = L(a.root.y, b.root.y);
  out.root.pitch = L(a.root.pitch, b.root.pitch);
  out.root.pivot = L(a.root.pivot, b.root.pivot);
  return out;
}

/** Swap the sides of a pose in place: the other hand or foot throws the same move */
function mirrorPose(p: FightPose) {
  const a = p.arms[0];
  p.arms[0] = p.arms[1];
  p.arms[1] = a;
  const l = p.legs[0];
  p.legs[0] = p.legs[1];
  p.legs[1] = l;
  for (const limb of [...p.arms, ...p.legs]) limb.twist = -(limb.twist ?? 0);
  // The other hand turns the other way over
  for (const a of p.arms) if (a.wrist) a.wrist.roll = -a.wrist.roll;
  p.side = -p.side;
  p.twist = -p.twist;
  p.turn = -(p.turn ?? 0);
  p.sway = -(p.sway ?? 0);
  p.headYaw = -p.headYaw;
}

/**
 * The pose of clip `id` at `frame` (fractional frames interpolate) into
 * `out`. Past the end a one-shot clip holds its last frame; a loop wraps
 * (from `loopFrom`). `mirror` swaps the limbs and flips side, twist, the
 * wrists' roll and the head's yaw, for the same move off the other side.
 */
export function sampleClip(id: ClipId, frame: number, out: FightPose, opts: { mirror?: boolean } = {}): FightPose {
  const clip = CLIPS[id];
  const keys = RESOLVED[id];
  let f = Number.isFinite(frame) ? Math.max(0, frame) : 0;
  if (clip.loop) {
    const from = clip.loopFrom ?? 0;
    const span = clip.frames - from;
    if (f >= clip.frames) f = from + ((f - from) % span);
  } else f = Math.min(f, clip.frames - 1);
  // The keys either side of the frame
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= f) i++;
  const a = keys[i];
  const b = keys[i + 1];
  if (!b || f <= a.t) copyPose(out, a.pose);
  else {
    const u = Math.min(1, (f - a.t) / (b.t - a.t));
    blendPose(a.pose, b.pose, EASES[b.ease](u), out);
  }
  if (opts.mirror) mirrorPose(out);
  return out;
}

/** The clip a move plays */
export const moveClip = (move: MoveId): ClipId => move;

/**
 * Whether a hit reaction plays mirrored: the reactions are keyed for a blow
 * from the attacker's right hand or foot (`armR`, `legR`), so one from the
 * left (the jab, the hook) plays them the other way round.
 */
export const hurtMirror = (by: MoveId | null) => !!by && MOVES[by].limb.endsWith('L');

/** The clip a hit reaction plays */
export function hurtClip(hurt: 'head' | 'body' | 'stagger'): ClipId {
  return hurt === 'head' ? 'hitHead' : hurt === 'body' ? 'hitBody' : 'stagger';
}
