/*
 * The emotes (the revamp's Phase 5 step 3, docs/animation-revamp-plan.md):
 * the wave, the cheer, the salute and the dance as keyed clips on the
 * `Pose` rig (skeleton.ts), DOM-free and tested in tests/emotes.test.ts.
 * Everyone plays the same clips: the player (walk.ts), other players
 * (remote.ts), the fitting room's stage (stage.ts) and the Emporium's
 * rooftop hologram (emporium.ts).
 *
 * - A clip is keys in seconds, each a part of the pose (anything left out
 *   is the clip's base: the standing rest), eased between (`Ease`). The
 *   one-shots start and end at rest; the dance loops.
 * - The wave, the cheer and the salute own only the upper body (`upper`):
 *   the arms, the spine's lean and twist and the head. Whatever moves the
 *   legs and hips (the animator's captured idle for the player and other
 *   players, the planted-feet walk, the stage's idle) stays under them, so
 *   an emote never jolts him off his feet.
 * - The dance owns the whole body. Its feet are keyed as spots on the
 *   ground (`feet`: a planted foot's ankle in his frame, or `null` up with
 *   its leg's angles keyed), and the legs reach them through the leg IK
 *   (`reachLeg()`), so a planted foot stays put however the hips bounce and
 *   sway; a foot leaving or landing between two keys eases between the
 *   reach and the keyed swing. The hips come down if a spot is out of reach.
 * - `emotePose()` writes a clip at a time into a pose, blended in by `amt`
 *   over what the pose holds; with `base` it lays the idle under an
 *   upper-body emote first (the stage, which has nothing else).
 *
 * The rig's sides: `arms[0]` and `legs[0]` are his right (the rig's -x);
 * the DSL names them `armR` / `legR`. The rig faces +z: a positive
 * `headPitch` is up, a positive `headYaw` to his left, a positive `lean`
 * forward.
 */
import * as THREE from 'three';
import { ANKLE_H, HIP_Y, LEG_X, type Limb, type Pose, type Wrist } from './skeleton';
import { LEG_REACH, reachLeg } from './locomotion';
import { idlePose } from './poses';

export type EmoteId = 'wave' | 'dance' | 'salute' | 'cheer';
export const EMOTE_IDS: EmoteId[] = ['wave', 'dance', 'salute', 'cheer'];

export type Ease = 'in' | 'out' | 'inOut' | 'linear';
/** A planted foot's ankle, in his frame (x to his left, z ahead), on the ground */
export interface FootSpot {
  x: number;
  z: number;
}
/** What a key sets; anything left out is the clip's base (the legs and feet carry on from the key before) */
export interface EmotePart {
  bob?: number;
  lean?: number;
  twist?: number;
  side?: number;
  turn?: number;
  sway?: number;
  headYaw?: number;
  headPitch?: number;
  headRoll?: number;
  armR?: Limb;
  armL?: Limb;
  legR?: Limb;
  legL?: Limb;
  /** Each foot (his right, his left): planted at a spot, or `null` up (its leg's angles keyed) */
  feet?: [FootSpot | null, FootSpot | null];
}
export interface EmoteKey {
  /** Seconds from the start */
  t: number;
  pose: EmotePart;
  /** The way into this key from the one before (default 'inOut') */
  ease?: Ease;
}
export interface EmoteClip {
  id: EmoteId;
  /** How long it plays: a one-shot holds its last key after; a loop wraps */
  seconds: number;
  loop: boolean;
  /** Only the arms, spine and head: the legs and hips are whatever's under it */
  upper: boolean;
  keys: EmoteKey[];
}

/* ---------- The pose DSL ---------- */

const arm = (fwd: number, out: number, bend: number, twist = 0, wrist?: Wrist): Limb => (wrist ? { fwd, out, bend, twist, wrist } : { fwd, out, bend, twist });
const leg = (fwd: number, out: number, bend: number): Limb => ({ fwd, out, bend, twist: 0 });
const key = (t: number, pose: EmotePart, ease?: Ease): EmoteKey => ({ t, pose, ease });
const at = (x: number, z = 0): FootSpot => ({ x, z });

/** Standing at rest (the idle's shape at its stillest): what every clip starts from and comes back to */
export const REST: Required<Omit<EmotePart, 'feet'>> & { feet: [FootSpot | null, FootSpot | null] } = {
  bob: 0,
  lean: 0.01,
  twist: 0,
  side: 0,
  turn: 0,
  sway: 0,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  armR: arm(0.03, 0.09, 0.18),
  armL: arm(0.03, 0.09, 0.18),
  legR: leg(0, 0.04, 0.04),
  legL: leg(0, 0.04, 0.04),
  feet: [null, null],
};

/** A raised arm's rest between waves, and the wave's swing either side of it */
const WAVE_UP = { fwd: 2.45, bend: 0.62 };
const wave = (out: number) => arm(WAVE_UP.fwd, out, WAVE_UP.bend, -0.35);
/** The salute's hand at the brow: the elbow out, the forearm across, the palm turned down (attentionPose's numbers) */
const BROW = arm(1.1, 1.4, 2.0, 0.8);

/**
 * The wave: his right arm comes up elbow first, the hand waves three
 * times from the elbow, a tilt of the head and a turn of the shoulders
 * towards it, and it comes down.
 */
const WAVE: EmoteClip = {
  id: 'wave',
  seconds: 2.6,
  loop: false,
  upper: true,
  keys: [
    key(0, {}),
    key(0.2, { armR: arm(1.4, 0.3, 1.9, -0.2), armL: arm(0.08, 0.1, 0.25), lean: -0.01, twist: -0.04, headPitch: 0.03 }, 'out'),
    key(0.42, { armR: wave(0.3), armL: arm(0.08, 0.1, 0.25), lean: -0.02, twist: -0.08, headPitch: 0.06, headYaw: -0.1, headRoll: 0.05 }, 'out'),
    key(0.6, { armR: wave(0.6), armL: arm(0.08, 0.1, 0.25), lean: -0.02, twist: -0.08, headPitch: 0.06, headYaw: -0.1, headRoll: 0.05 }),
    key(0.78, { armR: wave(0.1), armL: arm(0.08, 0.1, 0.25), lean: -0.02, twist: -0.08, headPitch: 0.06, headYaw: -0.1, headRoll: 0.05 }),
    key(0.96, { armR: wave(0.6), armL: arm(0.08, 0.1, 0.25), lean: -0.02, twist: -0.08, headPitch: 0.06, headYaw: -0.1, headRoll: 0.05 }),
    key(1.14, { armR: wave(0.1), armL: arm(0.08, 0.1, 0.25), lean: -0.02, twist: -0.08, headPitch: 0.06, headYaw: -0.1, headRoll: 0.05 }),
    key(1.32, { armR: wave(0.6), armL: arm(0.08, 0.1, 0.25), lean: -0.02, twist: -0.08, headPitch: 0.06, headYaw: -0.1, headRoll: 0.05 }),
    key(1.5, { armR: wave(0.1), armL: arm(0.08, 0.1, 0.25), lean: -0.02, twist: -0.08, headPitch: 0.06, headYaw: -0.1, headRoll: 0.05 }),
    key(1.7, { armR: wave(0.45), armL: arm(0.08, 0.1, 0.25), lean: -0.02, twist: -0.07, headPitch: 0.05, headYaw: -0.08, headRoll: 0.04 }),
    key(1.95, { armR: arm(2.2, 0.35, 0.8, -0.3), armL: arm(0.06, 0.1, 0.22), lean: -0.01, twist: -0.04, headPitch: 0.03, headYaw: -0.04, headRoll: 0.02 }),
    key(2.25, { armR: arm(1.1, 0.25, 1.4, -0.1), armL: arm(0.04, 0.09, 0.2) }),
    key(2.6, {}, 'out'),
  ],
};

/** Both arms thrown up, the chest up and the head back, two pumps of the elbows, and down */
const UP = (bend: number, twist = 0) => arm(2.85 - bend * 0.2, 0.36, bend, twist);
const CHEER: EmoteClip = {
  id: 'cheer',
  seconds: 2.4,
  loop: false,
  upper: true,
  keys: [
    key(0, {}),
    key(0.14, { armR: arm(1.2, 0.3, 1.9), armL: arm(1.2, 0.3, 1.9), lean: -0.03, headPitch: 0.08 }, 'out'),
    key(0.34, { armR: UP(0.3), armL: UP(0.3), lean: -0.1, headPitch: 0.25 }, 'out'),
    key(0.56, { armR: UP(0.95), armL: UP(0.95), lean: -0.06, headPitch: 0.16 }),
    key(0.78, { armR: UP(0.25), armL: UP(0.25), lean: -0.12, headPitch: 0.28 }),
    key(1.0, { armR: UP(0.95), armL: UP(0.95), lean: -0.06, headPitch: 0.16 }),
    key(1.22, { armR: UP(0.25), armL: UP(0.25), lean: -0.12, headPitch: 0.28 }),
    key(1.55, { armR: UP(0.4, 0.1), armL: UP(0.4, -0.1), lean: -0.09, headPitch: 0.22, twist: 0.06 }),
    key(1.95, { armR: arm(1.3, 0.3, 1.4), armL: arm(1.3, 0.3, 1.4), lean: -0.03, headPitch: 0.08 }),
    key(2.4, {}, 'out'),
  ],
};

/** To attention and the right hand snapped to the brow, held, and snapped down */
const SALUTE: EmoteClip = {
  id: 'salute',
  seconds: 2.2,
  loop: false,
  upper: true,
  keys: [
    key(0, {}),
    key(0.14, { armR: arm(1.1, 0.95, 2.15, 0.4), armL: arm(0.02, 0.06, 0.1), lean: -0.04, twist: 0 }, 'out'),
    key(0.3, { armR: BROW, armL: arm(0.02, 0.06, 0.1), lean: -0.04, headPitch: 0.05 }, 'out'),
    key(1.55, { armR: BROW, armL: arm(0.02, 0.06, 0.1), lean: -0.04, headPitch: 0.05 }, 'linear'),
    key(1.72, { armR: arm(1.0, 0.7, 1.4, 0.3), armL: arm(0.02, 0.06, 0.1), lean: -0.03, headPitch: 0.03 }, 'in'),
    key(1.95, { armR: arm(0.3, 0.15, 0.5), armL: arm(0.02, 0.07, 0.12), lean: -0.01 }),
    key(2.2, {}, 'out'),
  ],
};

/*
 * The dance: a step-touch on a two-beats-a-second groove (120 bpm, a bar
 * every two seconds): step right (the right foot out wide), touch left (the
 * left comes to it), step left (the left back out), touch right. The weight
 * goes over the stepping foot, the hips bounce down on every beat, the
 * shoulders turn against the hips, the elbows pump in time and the head
 * nods. The feet: his right at -x; a step lands on the beat, the other foot
 * lifts off the beat and comes down on the next.
 */
const PUMP_R = { armR: arm(0.95, 0.25, 1.95, -0.2), armL: arm(0.35, 0.2, 1.7, 0.1) };
const PUMP_L = { armR: arm(0.35, 0.2, 1.7, -0.1), armL: arm(0.95, 0.25, 1.95, 0.2) };
const PUMP_MID = { armR: arm(0.65, 0.22, 1.85, -0.15), armL: arm(0.65, 0.22, 1.85, 0.15) };
const BEAT = { bob: -0.045, lean: 0.07, headPitch: -0.04 };
const OFF = { bob: -0.015, lean: 0.05, headPitch: 0.03 };
const R_WIDE = at(-0.28);
const R_IN = at(-0.08);
const L_WIDE = at(0.08);
const L_IN = at(-0.12);
const DANCE: EmoteClip = {
  id: 'dance',
  seconds: 2,
  loop: true,
  upper: false,
  keys: [
    // Beat 1: the right foot lands wide, the weight going onto it
    key(0, { ...BEAT, ...PUMP_R, feet: [R_WIDE, L_WIDE], sway: -0.14, side: -0.04, turn: 0.06, twist: -0.18, headYaw: -0.12 }),
    // The left lifts and comes in
    key(0.25, { ...OFF, ...PUMP_MID, feet: [R_WIDE, null], legL: leg(0.5, 0.02, 1.15), sway: -0.2, side: -0.05, turn: 0.03, twist: -0.08, headYaw: -0.06 }),
    // Beat 2: the left touches beside it, the weight stays on the right
    key(0.5, { ...BEAT, ...PUMP_L, feet: [R_WIDE, L_IN], sway: -0.21, side: -0.05, turn: -0.05, twist: 0.18, headYaw: 0.08 }),
    // The left lifts again, heading back out
    key(0.75, { ...OFF, ...PUMP_MID, feet: [R_WIDE, null], legL: leg(0.48, 0.14, 1.1), sway: -0.16, side: -0.04, turn: -0.02, twist: 0.08, headYaw: 0.04 }),
    // Beat 3: the left lands wide, the weight going onto it
    key(1.0, { ...BEAT, ...PUMP_R, feet: [R_WIDE, L_WIDE], sway: -0.06, side: 0.04, turn: -0.06, twist: -0.18, headYaw: 0.12 }),
    // The right lifts and comes in
    key(1.25, { ...OFF, ...PUMP_MID, feet: [null, L_WIDE], legR: leg(0.5, 0.02, 1.15), sway: 0.0, side: 0.05, turn: -0.03, twist: -0.08, headYaw: 0.06 }),
    // Beat 4: the right touches beside it
    key(1.5, { ...BEAT, ...PUMP_L, feet: [R_IN, L_WIDE], sway: 0.01, side: 0.05, turn: 0.05, twist: 0.18, headYaw: -0.08 }),
    // The right lifts, heading back out wide
    key(1.75, { ...OFF, ...PUMP_MID, feet: [null, L_WIDE], legR: leg(0.48, 0.14, 1.1), sway: -0.04, side: 0.04, turn: 0.02, twist: 0.08, headYaw: -0.04 }),
    // (back to beat 1)
    key(2.0, { ...BEAT, ...PUMP_R, feet: [R_WIDE, L_WIDE], sway: -0.14, side: -0.04, turn: 0.06, twist: -0.18, headYaw: -0.12 }),
  ],
};

export const EMOTE_CLIPS: Record<EmoteId, EmoteClip> = { wave: WAVE, cheer: CHEER, salute: SALUTE, dance: DANCE };

/** How long an emote plays on someone (the dance: two bars) */
export const DANCE_SECONDS = 4;
export const emoteSeconds = (id: string): number => (isEmote(id) ? (EMOTE_CLIPS[id].loop ? DANCE_SECONDS : EMOTE_CLIPS[id].seconds) : 0);
export const emoteOver = (id: string, t: number) => t >= emoteSeconds(id);
export const isEmote = (id: string): id is EmoteId => id in EMOTE_CLIPS;
/** Only the upper body: the legs and hips are whatever's under it */
export const emoteUpper = (id: string) => isEmote(id) && EMOTE_CLIPS[id].upper;

/* ---------- Resolving and sampling ---------- */

type Full = typeof REST;
const RESOLVED: Record<EmoteId, Full[]> = Object.fromEntries(EMOTE_IDS.map((id) => [id, resolve(EMOTE_CLIPS[id])])) as Record<EmoteId, Full[]>;

/** Every key filled in: the base for what's left out, the legs and feet carried on from the key before */
function resolve(c: EmoteClip): Full[] {
  const out: Full[] = [];
  let prev: Full = REST;
  for (const k of c.keys) {
    const p = k.pose;
    const f: Full = {
      ...REST,
      ...p,
      legR: p.legR ?? prev.legR,
      legL: p.legL ?? prev.legL,
      feet: p.feet ?? prev.feet,
    };
    out.push(f);
    prev = f;
  }
  return out;
}

const EASES: Record<Ease, (u: number) => number> = {
  linear: (u) => u,
  in: (u) => u * u,
  out: (u) => 1 - (1 - u) * (1 - u),
  inOut: (u) => u * u * (3 - 2 * u),
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const L2 = (p: Pose, f: 'bob' | 'lean' | 'twist' | 'side' | 'headYaw' | 'headPitch', v: number, amt: number) => (p[f] = lerp(p[f], v, amt));

/** `out` eased from limb `a` to `b` by `u`, then blended over what it held by `amt`; the wrist and the reach cleared */
function limb(out: Limb, a: Limb, b: Limb, u: number, amt: number) {
  out.fwd = lerp(out.fwd, lerp(a.fwd, b.fwd, u), amt);
  out.out = lerp(out.out, lerp(a.out, b.out, u), amt);
  out.bend = lerp(out.bend, lerp(a.bend, b.bend, u), amt);
  out.twist = lerp(out.twist ?? 0, lerp(a.twist ?? 0, b.twist ?? 0, u), amt);
  const wa = a.wrist;
  const wb = b.wrist;
  if (wa || wb) {
    const w = out.wrist ?? { roll: 0, bend: 0 };
    w.roll = lerp(w.roll, lerp(wa?.roll ?? 0, wb?.roll ?? 0, u), amt);
    w.bend = lerp(w.bend, lerp(wa?.bend ?? 0, wb?.bend ?? 0, u), amt);
    out.wrist = w;
  } else if (out.wrist) out.wrist = undefined;
  if (out.reach) out.reach = undefined;
}

/** The keys either side of `t` and how far between them (eased) */
function place(id: EmoteId, t: number): [Full, Full, number] {
  const c = EMOTE_CLIPS[id];
  const keys = RESOLVED[id];
  let s = Number.isFinite(t) ? Math.max(0, t) : 0;
  if (c.loop) s %= c.seconds;
  else s = Math.min(s, c.seconds);
  let i = 0;
  while (i < c.keys.length - 1 && c.keys[i + 1].t <= s) i++;
  const a = keys[i];
  const b = keys[i + 1];
  if (!b || s <= c.keys[i].t) return [a, a, 0];
  const u = Math.min(1, (s - c.keys[i].t) / (c.keys[i + 1].t - c.keys[i].t));
  return [a, b, EASES[c.keys[i + 1].ease ?? 'inOut'](u)];
}

/** Where each foot is planted at `t` (the spot both keys agree on; `null` up or moving), for the tests */
export function emoteFeet(id: EmoteId, t: number): [FootSpot | null, FootSpot | null] {
  const [a, b, u] = place(id, t);
  const f = (i: 0 | 1): FootSpot | null => {
    const fa = a.feet[i];
    const fb = b.feet[i];
    if (u <= 0) return fa;
    if (u >= 1) return fb;
    return fa && fb ? { x: lerp(fa.x, fb.x, u), z: lerp(fa.z, fb.z, u) } : null;
  };
  return [f(0), f(1)];
}

const tmp = new THREE.Vector3();
const eu = new THREE.Euler();
/** A foot's spot into the hips' space from its hip joint (as locomotion.ts's `hipSpace()`) */
function hipSpace(p: Pose, i: number, f: FootSpot, out: THREE.Vector3) {
  out.set(f.x - (p.sway ?? 0), ANKLE_H - (HIP_Y + p.bob), f.z);
  out.applyEuler(eu.set(0, -(p.turn ?? 0), 0, 'XYZ'));
  out.applyEuler(eu.set(0, 0, -p.side, 'XYZ'));
  out.x -= (i === 0 ? -1 : 1) * LEG_X;
  return out;
}

const want: Limb = leg(0, 0, 0);
/**
 * Emote `id` at `t` seconds into pose `p`, blended in by `amt` over what
 * `p` holds. An upper-body emote writes the arms, the spine's lean and
 * twist and the head (with `base`, over the idle first); the dance writes
 * everything, its planted feet reached by the legs. Unknown ids do nothing.
 */
export function emotePose(p: Pose, id: string, t: number, amt = 1, base = false): void {
  if (!isEmote(id)) return;
  const c = EMOTE_CLIPS[id];
  if (base && c.upper) idlePose(p, t);
  const [a, b, u] = place(id, t);
  L2(p, 'lean', lerp(a.lean, b.lean, u), amt);
  L2(p, 'twist', lerp(a.twist, b.twist, u), amt);
  L2(p, 'headYaw', lerp(a.headYaw, b.headYaw, u), amt);
  L2(p, 'headPitch', lerp(a.headPitch, b.headPitch, u), amt);
  p.headRoll = lerp(p.headRoll ?? 0, lerp(a.headRoll, b.headRoll, u), amt);
  limb(p.arms[0], a.armR, b.armR, u, amt);
  limb(p.arms[1], a.armL, b.armL, u, amt);
  if (c.upper) return;
  L2(p, 'bob', lerp(a.bob, b.bob, u), amt);
  L2(p, 'side', lerp(a.side, b.side, u), amt);
  p.turn = lerp(p.turn ?? 0, lerp(a.turn, b.turn, u), amt);
  p.sway = lerp(p.sway ?? 0, lerp(a.sway, b.sway, u), amt);
  // The hips come down as far as the planted feet need (a spot out of reach pulls them, never a lifted foot)
  let need = 0;
  for (let i = 0; i < 2; i++) {
    const fa = a.feet[i];
    const fb = b.feet[i];
    const f = fa && fb ? { x: lerp(fa.x, fb.x, u), z: lerp(fa.z, fb.z, u) } : fa && u < 0.5 ? fa : fb && u >= 0.5 ? fb : null;
    if (!f) continue;
    hipSpace(p, i, f, tmp);
    const reach = Math.sqrt(Math.max(0, LEG_REACH * LEG_REACH - tmp.x * tmp.x - tmp.z * tmp.z));
    need = Math.max(need, -tmp.y - reach);
  }
  if (need > 0) p.bob -= need;
  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? -1 : 1;
    const l = p.legs[i];
    const ka = i === 0 ? a.legR : a.legL;
    const kb = i === 0 ? b.legR : b.legL;
    const fa = a.feet[i];
    const fb = b.feet[i];
    if (fa && fb) {
      // Planted through both keys: on the spot (eased between them where they differ)
      hipSpace(p, i, { x: lerp(fa.x, fb.x, u), z: lerp(fa.z, fb.z, u) }, tmp);
      reachLeg(want, s, tmp, p.side);
      limb(l, want, want, 0, amt);
    } else if (fa) {
      // Leaving the ground: from the reach to the keyed swing
      hipSpace(p, i, fa, tmp);
      reachLeg(want, s, tmp, p.side);
      limb(l, want, kb, u, amt);
    } else if (fb) {
      // Landing: from the keyed swing onto the spot
      hipSpace(p, i, fb, tmp);
      reachLeg(want, s, tmp, p.side);
      limb(l, ka, want, u, amt);
    } else limb(l, ka, kb, u, amt);
    if (fa || fb) {
      // A foot on the ground in either key is flat on it and headed his way (the shin's tilt, the hips' turn and the
      // leg's spread taken out at the ankle), lifted level in between
      l.foot = l.fwd - l.bend;
      l.toe = 0;
      l.footYaw = -(p.turn ?? 0);
      l.footRoll = -s * l.out;
    } else l.foot = l.toe = l.footYaw = l.footRoll = undefined;
  }
}

/** The rooftop hologram's dance (the same clip, looping) */
export const dancePose = (p: Pose, t: number) => emotePose(p, 'dance', t);
