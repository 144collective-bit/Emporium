/*
 * The crowd pack's captured idles and walk played straight onto a figure's
 * bones (the polish plan's Phase 8): the fitting room's and the character
 * screen's stage (stage.ts) and the rooftop hologram (emporium.ts) idle and
 * walk on subject 137's weight shifts and 143's walk, as the city's Degen
 * does, instead of the formula poses. DOM-free, tested in
 * tests/captureplay.test.ts.
 *
 * `createCapturePlayer(data)` takes the crowd pack (mocap-load.ts
 * `CROWD_PACK`, fetched at the boot): `idle(sk, t)` plays the three idle
 * takes in turn, each's last `BLEND` seconds crossfaded into the next's
 * first, round and round; `walk(sk, t)` the looped walk on the spot. Both
 * write the body's bones after the figure's own `update()` has posed it
 * (as animator.ts's `applyTo()` does), the hands' fingers and anything held
 * staying the pose's; `w` under 1 eases the capture in over what the pose
 * had. Without the pack (`ready` false) they do nothing, and the caller
 * keeps the formula.
 */
import * as THREE from 'three';
import { MOCAP_BONES, MOCAP_FPS, NB, type MoClip, type MoData } from './mocap';
import type { Skeleton } from './skeleton';

/** The takes (takes.json, pack `crowd`): the idles in the order they're played, and the walk (a seamless cycle) */
export const IDLE_TAKES = ['crowd-idle', 'crowd-idle-2', 'crowd-idle-3'] as const;
export const WALK_TAKE = 'crowd-walk';
/** Seconds one idle's tail is crossfaded into the next's head */
export const BLEND = 1.0;

export interface CapturePlayer {
  readonly ready: boolean;
  /** How long the idles take to come round (seconds) */
  readonly idlePeriod: number;
  /** The idles in turn at `t` seconds on the figure's bones (after its `update()`), `w` of the way; false without the pack */
  idle(sk: Skeleton, t: number, w?: number): boolean;
  /** The walk on the spot at `t` seconds; false without the pack */
  walk(sk: Skeleton, t: number, w?: number): boolean;
}

const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const va = new THREE.Vector3();
const vb = new THREE.Vector3();
const rotA = new Float32Array(NB * 4);
const rotB = new Float32Array(NB * 4);

/** A clip at `f` frames (fractional, within the clip), the two frames round it blended: into `rot` and `hips` */
export function sampleClip(c: MoClip, f: number, rot: Float32Array, hips: THREE.Vector3) {
  const f0 = Math.max(0, Math.min(c.frames - 1, Math.floor(f)));
  const f1 = Math.min(c.frames - 1, f0 + 1);
  const k = Math.max(0, Math.min(1, f - f0));
  for (let b = 0; b < NB; b++) {
    qa.fromArray(c.rot, (f0 * NB + b) * 4);
    if (k > 0 && f1 !== f0) {
      qb.fromArray(c.rot, (f1 * NB + b) * 4);
      qa.slerp(qb, k);
    }
    qa.toArray(rot, b * 4);
  }
  va.fromArray(c.hips, f0 * 3);
  if (k > 0 && f1 !== f0) va.lerp(vb.fromArray(c.hips, f1 * 3), k);
  hips.copy(va);
}

/** `rot` and `hips` onto the figure's bones, `w` of the way from what they have */
export function applyFrame(sk: Skeleton, rot: Float32Array, hips: THREE.Vector3, w = 1) {
  for (let i = 0; i < NB; i++) {
    const b = sk.bones[MOCAP_BONES[i]];
    qa.fromArray(rot, i * 4);
    if (w >= 1) b.quaternion.copy(qa);
    else if (w > 0) b.quaternion.slerp(qa, w);
  }
  const h = sk.bones.hips;
  if (w >= 1) h.position.copy(hips);
  else if (w > 0) h.position.lerp(hips, w);
}

const smooth = (k: number) => k * k * (3 - 2 * k);

export function createCapturePlayer(data: MoData | null): CapturePlayer {
  const idles = IDLE_TAKES.map((n) => data?.clips.find((c) => c.name === n) ?? null);
  const walk = data?.clips.find((c) => c.name === WALK_TAKE) ?? null;
  const ready = !!walk && idles.every((c) => !!c);
  const takes = ready ? (idles as MoClip[]) : [];
  /** Each idle's share of the round: its length less the blend into the next */
  const shares = takes.map((c) => c.frames / MOCAP_FPS - BLEND);
  const period = shares.reduce((s, v) => s + v, 0);
  const hipsA = new THREE.Vector3();
  const hipsB = new THREE.Vector3();
  return {
    ready,
    idlePeriod: period,
    idle(sk, t, w = 1) {
      if (!ready || w <= 0) return false;
      let u = ((t % period) + period) % period;
      let i = 0;
      while (i < takes.length - 1 && u >= shares[i]) u -= shares[i++];
      const c = takes[i];
      // (each take plays from BLEND seconds in, where the one before handed over to it; its last BLEND seconds are
      // crossfaded into the next's first, both playing, so the next carries on from BLEND when it takes over)
      const into = u - (shares[i] - BLEND);
      sampleClip(c, (u + BLEND) * MOCAP_FPS, rotA, hipsA);
      if (into > 0) {
        const next = takes[(i + 1) % takes.length];
        sampleClip(next, into * MOCAP_FPS, rotB, hipsB);
        const k = smooth(Math.min(1, into / BLEND));
        for (let b = 0; b < NB; b++) {
          qa.fromArray(rotA, b * 4);
          qb.fromArray(rotB, b * 4);
          qa.slerp(qb, k).toArray(rotA, b * 4);
        }
        hipsA.lerp(hipsB, k);
      }
      applyFrame(sk, rotA, hipsA, w);
      return true;
    },
    walk(sk, t, w = 1) {
      if (!ready || !walk || w <= 0) return false;
      const f = ((t * MOCAP_FPS) % walk.frames + walk.frames) % walk.frames;
      sampleClip(walk, f, rotA, hipsA);
      applyFrame(sk, rotA, hipsA, w);
      return true;
    },
  };
}
