/*
 * The pose helpers (DOM-free, so the crowd's clips can be baked and tested in
 * Node): walking and running by formula, idling, looking round, chatting,
 * sitting, in the air, marching, standing to attention and saluting, the
 * hologram's dance and the multiplayer emotes. Each writes a `Pose`
 * (skeleton.ts). Your own Degen walks with locomotion.ts instead; the
 * crowds play these (and the locomotion's walk) baked into clips
 * (crowdclips.ts).
 */
import type { Limb, Pose } from './skeleton';

export const set = (l: Limb, fwd: number, out: number, bend: number) => {
  l.fwd = fwd;
  l.out = out;
  l.bend = bend;
  l.twist = 0;
  if (l.wrist) l.wrist = undefined;
  if (l.reach) l.reach = undefined;
};

/**
 * Walking and running. `phase` advances with distance covered, `stride`
 * 0..1 scales the whole cycle (0 = standing), `run` 0..1 blends to a run.
 */
export function walkPose(p: Pose, phase: number, stride: number, run: number, armSwing = 1) {
  const A = (0.42 + run * 0.36) * stride;
  for (let i = 0; i < 2; i++) {
    const ph = phase + i * Math.PI;
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    // Knees bend most while the leg swings through, a little at the heel strike
    set(p.legs[i], A * s, 0.02, 0.06 + stride * (0.5 + run * 0.85) * Math.max(0, c) + stride * 0.12 * Math.max(0, -s));
    // Arms swing against the legs, elbows tighten as you speed up
    set(p.arms[1 - i], A * 0.95 * s * armSwing + run * 0.15, 0.08 + run * 0.06, 0.2 + run * 1.05 + 0.15 * stride * Math.max(0, s));
  }
  p.bob = (Math.abs(Math.cos(phase)) - 0.6) * 0.03 * stride * (1 + run * 1.2);
  p.lean = 0.03 * stride + run * 0.24;
  p.twist = Math.sin(phase) * 0.08 * stride;
  p.side = Math.sin(phase) * 0.025 * stride;
  p.headYaw = 0;
  p.headPitch = 0;
}

/** Standing: breathing, a slow weight shift. */
export function idlePose(p: Pose, t: number, seed = 0) {
  const sh = Math.sin(t * 0.35 + seed);
  p.bob = Math.sin(t * 1.6 + seed) * 0.003 - Math.abs(sh) * 0.008;
  p.lean = 0.01;
  p.twist = 0;
  p.side = sh * 0.035;
  set(p.arms[0], 0.03, 0.09 + Math.sin(t * 1.6 + seed) * 0.01, 0.18);
  set(p.arms[1], 0.03, 0.09, 0.18);
  set(p.legs[0], 0, 0.04, 0.04 + Math.max(0, -sh) * 0.1);
  set(p.legs[1], 0, 0.04, 0.04 + Math.max(0, sh) * 0.1);
  p.headYaw = 0;
  p.headPitch = 0;
}

/** Looking around while standing. */
export function lookPose(p: Pose, t: number, seed = 0) {
  idlePose(p, t, seed);
  p.headYaw = Math.sin(t * 0.37 + seed * 2) * 0.55 + Math.sin(t * 0.13 + seed) * 0.3;
  p.headPitch = Math.sin(t * 0.21 + seed) * 0.12;
}

/** Talking with a group: gestures with one hand, nods, now and then both hands. */
export function chatPose(p: Pose, t: number, seed = 0) {
  idlePose(p, t, seed);
  const talk = Math.sin(t * 0.5 + seed * 3) > -0.2;
  if (talk) {
    set(p.arms[1], 0.55 + Math.sin(t * 2.3 + seed) * 0.3, 0.16, 1.25 + Math.sin(t * 3.1 + seed) * 0.35);
    if (Math.sin(t * 0.9 + seed) > 0.4) set(p.arms[0], 0.45 + Math.sin(t * 2.0 + seed) * 0.2, 0.14, 1.1);
    p.headPitch = Math.sin(t * 2.6 + seed) * 0.06;
  } else {
    // Listening: hands in pockets, the odd nod
    set(p.arms[0], -0.05, 0.1, 0.45);
    set(p.arms[1], -0.05, 0.1, 0.45);
    p.headPitch = Math.max(0, Math.sin(t * 1.4 + seed)) * -0.12;
  }
  p.headYaw = Math.sin(t * 0.3 + seed) * 0.25;
}

/** Sitting on a bench: thighs level, hands on the knees. Hips sit HIP_HEIGHT - 0.03 above the feet's root. */
export function sitPose(p: Pose, t: number, seed = 0) {
  p.bob = -0.03;
  p.lean = -0.08 + Math.sin(t * 0.3 + seed) * 0.03;
  p.twist = 0;
  p.side = 0;
  set(p.legs[0], 1.5, 0.08, 1.45);
  set(p.legs[1], 1.5, 0.08, 1.45);
  set(p.arms[0], 0.55, 0.12, 0.7);
  set(p.arms[1], 0.55, 0.12, 0.7);
  p.headYaw = Math.sin(t * 0.25 + seed) * 0.5;
  p.headPitch = 0.05;
}

/** In the air: knees up, arms out for balance. `a` 0..1 blends it over whatever pose is set. */
export function airPose(p: Pose, a: number) {
  if (a <= 0) return;
  const mix = (l: Limb, fwd: number, out: number, bend: number) => {
    l.fwd += (fwd - l.fwd) * a;
    l.out += (out - l.out) * a;
    l.bend += (bend - l.bend) * a;
  };
  mix(p.legs[0], 0.7, 0.06, 1.1);
  mix(p.legs[1], -0.1, 0.06, 0.55);
  mix(p.arms[0], 0.5, 0.7, 0.6);
  mix(p.arms[1], 0.3, 0.75, 0.5);
  p.lean += (0.1 - p.lean) * a;
  p.bob *= 1 - a;
}

/** Soldier on parade: a crisp march, arms straighter, the rifle hand still. */
export function marchPose(p: Pose, phase: number, rifle: 'left' | 'right') {
  walkPose(p, phase, 1, 0.15, 1.1);
  for (const l of p.legs) l.bend *= 1.25;
  for (const a of p.arms) a.bend = 0.12;
  const r = p.arms[rifle === 'left' ? 0 : 1];
  set(r, 0.05, 0.1, 0.35);
  p.lean = 0.02;
  p.twist *= 0.4;
}

/** Standing to attention, `salute` 0..1 brings the free hand to the brow. */
export function attentionPose(p: Pose, salute: number, rifle: 'left' | 'right') {
  idlePose(p, 0, 0);
  p.side = 0;
  for (const l of p.legs) set(l, 0, 0.02, 0.03);
  const held = p.arms[rifle === 'left' ? 0 : 1];
  set(held, 0.05, 0.1, 0.35);
  // The free hand up to the brow: the elbow out to the side, the forearm across, turned palm-down
  const free = p.arms[rifle === 'left' ? 1 : 0];
  set(free, 0.02 + salute * 1.08, 0.07 + salute * 1.33, 0.12 + salute * 1.88);
  free.twist = (rifle === 'left' ? -0.8 : 0.8) * salute;
  p.headPitch = salute * 0.05;
}

/** A dance for the rooftop hologram, on a two-beats-a-second groove. */
export function dancePose(p: Pose, t: number) {
  const b = t * Math.PI * 2;
  const beat = Math.pow(1 - ((t * 2) % 1), 3);
  p.bob = -beat * 0.05;
  p.lean = 0.05 + beat * 0.06;
  p.twist = Math.sin(b * 0.5) * 0.35;
  p.side = Math.sin(b * 0.5) * 0.06;
  set(p.arms[0], 2.4 + Math.sin(b) * 0.4, 0.4, 0.4);
  set(p.arms[1], 2.4 - Math.sin(b) * 0.4, 0.4, 0.4);
  set(p.legs[0], 0.1 + Math.max(0, Math.sin(b)) * 0.4, 0.12, 0.25 + beat * 0.3 + Math.max(0, Math.sin(b)) * 0.6);
  set(p.legs[1], 0.1 + Math.max(0, -Math.sin(b)) * 0.4, 0.12, 0.25 + beat * 0.3 + Math.max(0, -Math.sin(b)) * 0.6);
  p.headPitch = -beat * 0.15;
  p.headYaw = Math.sin(b * 0.5) * 0.2;
}

/** Multiplayer emotes (ids from EMOTES in profile-data.ts); `t` is seconds since it started */
export function emotePose(p: Pose, id: string, t: number) {
  if (id === 'dance') return dancePose(p, t);
  if (id === 'salute') return attentionPose(p, Math.min(1, t * 4), 'right');
  idlePose(p, t);
  if (id === 'wave') {
    set(p.arms[0], 2.55, 0.3 + Math.sin(t * 10) * 0.28, 0.55);
    p.headPitch = -0.08;
  } else if (id === 'cheer') {
    const hop = Math.abs(Math.sin(t * 7));
    p.bob = hop * 0.04;
    set(p.arms[0], 2.75, 0.32, 0.25 + hop * 0.3);
    set(p.arms[1], 2.75, 0.32, 0.25 + hop * 0.3);
    p.headPitch = -0.15;
  }
}

