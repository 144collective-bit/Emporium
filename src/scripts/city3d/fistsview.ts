/*
 * First person with empty hands (the polish plan's Phase 8): Degen's own
 * fists (body.ts `bakedHand()` closed, in the sleeves of what he's wearing,
 * as the gun's hands are: viewmodel.ts) up in the guard while the street
 * fists are up (brawl-sim.ts), thrown with its moves (the jab and hook with
 * the left, the cross and uppercut with the right, each keyed over the move's
 * start-up, active and recovery frames), both close in for the block, swung
 * with a dodge, dropped away when the guard comes down. A kick shows as the
 * hands dropping and a bob of the view (walk.ts: `kickBob()`), the leg being
 * out of shot.
 *
 * Drawn as the gun's hands are: `FP_SCALE` times bigger and further out, in
 * the front sliver of the depth buffer (`upFront()`), with their own flat
 * shading. Loaded with the fists' chunk (brawl.ts), never in the boot.
 */
import * as THREE from 'three';
import type { Outfit } from './character';
import { FP_HAND, FP_SCALE, arm, fpHand, upFront } from './viewmodel';
import { MOVES, type MoveId } from './fight-sim';
import type { ClipId } from './fight-anim';

/** Where each fist sits in the guard, in metres from the eye (x right, y up, -z ahead): the left (lead) hand further out */
const GUARD = { right: new THREE.Vector3(0.17, -0.1, -0.36), left: new THREE.Vector3(-0.15, -0.06, -0.42) };
/** Blocking: both in close, high */
const BLOCK = { right: new THREE.Vector3(0.1, 0.03, -0.27), left: new THREE.Vector3(-0.1, 0.05, -0.27) };
/** Dropped out of the view when the guard's down */
const DOWN = 0.32;
/** Each punch: which hand, where it winds back to and where it lands (metres from the eye), and a roll (radians) as it lands */
const PUNCHES: Partial<Record<MoveId, { hand: 'left' | 'right'; back: THREE.Vector3; hit: THREE.Vector3; roll: number }>> = {
  jab: { hand: 'left', back: new THREE.Vector3(-0.16, -0.07, -0.36), hit: new THREE.Vector3(-0.03, -0.03, -0.74), roll: 0.5 },
  cross: { hand: 'right', back: new THREE.Vector3(0.2, -0.1, -0.3), hit: new THREE.Vector3(0.03, -0.03, -0.78), roll: -0.6 },
  hook: { hand: 'left', back: new THREE.Vector3(-0.3, -0.08, -0.34), hit: new THREE.Vector3(0.1, -0.02, -0.58), roll: 1.3 },
  uppercut: { hand: 'right', back: new THREE.Vector3(0.16, -0.32, -0.32), hit: new THREE.Vector3(0.02, 0.06, -0.52), roll: -0.4 },
};
/** A kick: how far the hands drop and the view bobs (metres), and how long after the strike the bob settles */
export const KICK = { drop: 0.08, bob: 0.045, settle: 0.35 };

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const L = THREE.MathUtils.lerp;

export interface FistsState {
  /** The guard's up (the fists are his: brawl-sim's `up`) */
  up: boolean;
  blocking: boolean;
  /** The move playing and its frame (brawl-sim's `clip()`), the guard otherwise */
  clip: { id: ClipId; frame: number };
  /** 0..1 of walking speed and the step cycle, 0..1 sprinting */
  move: number;
  phase: number;
  run: number;
  /** Which way a dodge steps, in the view's frame (+x right), 0 none */
  dodge: number;
}

export function createFistsView(scene: THREE.Scene) {
  const root = new THREE.Group();
  const scaler = new THREE.Group();
  scaler.scale.setScalar(FP_SCALE);
  const holder = new THREE.Group();
  root.add(scaler);
  scaler.add(holder);
  // Each fist closed, the knuckles upright and forward, the forearm running back and down into the sleeve
  const make = (side: -1 | 1) => {
    const dir = new THREE.Vector3(0.35 * side, -0.55, 0.75);
    const along = new THREE.Vector3(-0.25 * side, 0.95, 0.15);
    const hand = fpHand(side, 1, dir, along, FP_HAND, new THREE.Vector3(0, 0, 0));
    const a = arm(dir, hand);
    const g = new THREE.Group();
    g.add(a.g);
    holder.add(g);
    return { a, g };
  };
  // (his right is the rig's -x side)
  const right = make(-1);
  const left = make(1);
  upFront(root);
  root.visible = false;
  scene.add(root);

  let draw = 0;
  let block = 0;
  let swayX = 0;
  let swayY = 0;
  let idle = 0;
  const lastDir = new THREE.Vector3();
  const dirNow = new THREE.Vector3();
  let haveDir = false;
  const pR = new THREE.Vector3();
  const pL = new THREE.Vector3();
  let rollR = 0;
  let rollL = 0;
  let dropK = 0;

  /** A punch's hand along its path: 0..1 through the move (wind back over the start-up, out through the active frames, back through the recovery) */
  function punch(id: MoveId, frame: number, out: THREE.Vector3, rest: THREE.Vector3) {
    const p = PUNCHES[id]!;
    const m = MOVES[id];
    let roll = 0;
    if (frame < m.startup) {
      const k = smooth(frame / m.startup);
      out.lerpVectors(rest, p.back, k);
    } else if (frame < m.startup + m.active) {
      const k = smooth((frame - m.startup) / Math.max(1, m.active - 1));
      out.lerpVectors(p.back, p.hit, Math.min(1, k * 1.6));
      roll = p.roll * k;
    } else {
      const k = smooth((frame - m.startup - m.active) / Math.max(1, m.recovery));
      out.lerpVectors(p.hit, rest, k);
      roll = p.roll * (1 - k);
    }
    return roll;
  }

  return {
    root,
    /** The hands in the sleeves of what he wears */
    setOutfit(o: Outfit) {
      right.a.dress(o);
      left.a.dress(o);
      upFront(root);
    },
    /** Each frame, after the camera has moved; `on`: in first person with the fists his */
    update(camera: THREE.Camera, dt: number, s: FistsState, on: boolean) {
      draw += ((on && s.up ? 1 : 0) - draw) * Math.min(1, dt * (s.up ? 10 : 7));
      root.visible = on && draw > 0.02;
      if (!root.visible) {
        haveDir = false;
        return;
      }
      root.position.copy(camera.position);
      root.quaternion.copy(camera.quaternion);
      block += ((s.blocking ? 1 : 0) - block) * Math.min(1, dt * 12);
      // Sway: the hands lag the look and settle
      camera.getWorldDirection(dirNow);
      if (haveDir) {
        const dyaw = Math.atan2(dirNow.x, dirNow.z) - Math.atan2(lastDir.x, lastDir.z);
        swayX = THREE.MathUtils.clamp(swayX - Math.atan2(Math.sin(dyaw), Math.cos(dyaw)) * 0.8, -0.1, 0.1);
        swayY = THREE.MathUtils.clamp(swayY - (dirNow.y - lastDir.y) * 0.8, -0.08, 0.08);
      }
      lastDir.copy(dirNow);
      haveDir = true;
      const settle = Math.exp(-dt * 8);
      swayX *= settle;
      swayY *= settle;
      // The step's bob and a breath
      idle += dt;
      const bobK = s.move * (1 + 0.6 * s.run);
      const bx = Math.sin(s.phase) * 0.012 * bobK;
      const by = -Math.abs(Math.cos(s.phase)) * 0.014 * bobK;
      const breathe = Math.sin(idle * 1.6) * 0.003;
      // The guard, eased to the block
      pR.lerpVectors(GUARD.right, BLOCK.right, block);
      pL.lerpVectors(GUARD.left, BLOCK.left, block);
      rollR = L(rollR, block * -0.3, Math.min(1, dt * 10));
      rollL = L(rollL, block * 0.3, Math.min(1, dt * 10));
      // A punch: its hand along its path; a kick: both hands drop a touch
      const c = s.clip;
      let drop = 0;
      if (c.id in PUNCHES) {
        const p = PUNCHES[c.id as MoveId]!;
        const roll = punch(c.id as MoveId, c.frame, p.hand === 'right' ? pR : pL, p.hand === 'right' ? GUARD.right : GUARD.left);
        if (p.hand === 'right') rollR = roll;
        else rollL = roll;
      } else if (c.id === 'frontKick' || c.id === 'roundhouse') {
        const m = MOVES[c.id];
        drop = smooth(Math.min(c.frame / m.startup, (m.startup + m.active + m.recovery - c.frame) / m.recovery));
      }
      dropK += (drop - dropK) * Math.min(1, dt * 14);
      // (the dodge takes the hands across with the step)
      const dodge = c.id === 'dodge' ? s.dodge * 0.08 * Math.sin((Math.PI * c.frame) / 22) : 0;
      const down = (1 - draw) * DOWN + dropK * KICK.drop;
      const narrow = Math.pow(THREE.MathUtils.clamp((camera as THREE.PerspectiveCamera).aspect || 1.6, 0.45, 1), -0.5);
      for (const [h, p, roll, side] of [
        [right, pR, rollR, 1],
        [left, pL, rollL, -1],
      ] as const) {
        h.g.position.set((p.x + bx * side + dodge) * narrow - swayX * 0.05, p.y + by + breathe - swayY * 0.04 - down, p.z);
        h.g.rotation.set(-swayY * 0.5 - down * 1.2 + dropK * 0.3, swayX * 0.5 + side * 0.15, roll, 'YXZ');
      }
    },
  };
}
export type FistsView = ReturnType<typeof createFistsView>;
