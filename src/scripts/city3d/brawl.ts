/*
 * Fists on the street, on screen (docs/inventory-plan.md Phase 2): a chunk of
 * its own, fetched when walking starts (walk.ts), with the fight's rules for
 * one (brawl-sim.ts) and its clips (fight-anim.ts), so neither is in the boot.
 *
 * `lay()` puts the fight's clip for what he's doing on Degen's pose after the
 * walk has posed him: the upper body (the arms, the lean and twist, the head,
 * the fists closed) by `upper`, everything by `whole` (a kick or the dodge,
 * standing: walk mode steps the motion capture aside for it). Over the walk,
 * the clip's hip turn goes into the spine's twist, so the shoulders turn as
 * far as in the ring over hips that walk on.
 *
 * `createPartners()` draws the sparring partners (brawlsite.ts, Phase 3)
 * waiting in the guard where they stand, near Degen only (`NEAR`), each a
 * fighter of its own sim with no input (so the guard idles as in the ring),
 * turning to face him when he comes close; one being sparred with is hidden
 * (the fight draws its own).
 */
import type * as THREE from 'three';
import type { Limb, Pose } from './skeleton';
import { crewOutfit } from './crew';
import { PARTNERS, partnerNear, type PartnerId } from './brawlsite';
import { createFighterFigure, drawFighter, type FighterFigure } from './fight-figure';
import { newFightPose, sampleClip, type FightPose } from './fight-anim';
import { BRAWL, NO_BRAWL, createBrawl, type BrawlEvent, type BrawlInput } from './brawl-sim';
import { MOVES, createFightSim, yawTo, type Fighter, type FightSim, type MoveId, type StyleId } from './fight-sim';

export { BRAWL, NO_BRAWL, MOVES, type BrawlEvent, type BrawlInput, type MoveId };
/** Where the partners stand: walk mode adds them to the collision grids */
export { PARTNER_SOLIDS } from './brawlsite';

/** The hands closed into fists with the guard up (0 open, 1 a fist), and as they are relaxed */
const FIST = 1;
const RELAXED = 0.2;

const mix = (a: number, b: number, k: number) => a + (b - a) * k;
function mixLimb(to: Limb, from: Limb, k: number, arm: boolean) {
  to.fwd = mix(to.fwd, from.fwd, k);
  to.out = mix(to.out, from.out, k);
  to.bend = mix(to.bend, from.bend, k);
  if (arm) {
    to.twist = mix(to.twist ?? 0, from.twist ?? 0, k);
    const w = from.wrist;
    if (w || to.wrist) to.wrist = { roll: mix(to.wrist?.roll ?? 0, w?.roll ?? 0, k), bend: mix(to.wrist?.bend ?? 0, w?.bend ?? 0, k) };
  } else if (k > 0.5) to.foot = to.footYaw = to.footRoll = to.toe = undefined;
}

export function createStreetFists(style: StyleId) {
  const brawl = createBrawl(style);
  const clip: FightPose = newFightPose();
  return {
    brawl,
    /** The style the fists were made in (walk mode makes them again when the save's changes) */
    style,
    /**
     * The fight's clip on his pose: the upper body by `upper` (0-1), all of him by `whole` (0-1, a kick or the
     * dodge). Called after the walk (and anything else) has posed him, before the figure takes the pose.
     */
    lay(P: Pose, upper: number, whole: number) {
      if (upper < 0.01 && whole < 0.01) return;
      const c = brawl.clip();
      sampleClip(c.id, c.frame, clip);
      const turn = clip.turn ?? 0;
      const k = Math.max(upper, whole);
      // The upper body: the arms, the lean, the spine's twist (with the clip's hip turn while the walk keeps his hips) and the head
      for (let i = 0; i < 2; i++) mixLimb(P.arms[i], clip.arms[i], k, true);
      P.lean = mix(P.lean, clip.lean, k);
      P.twist = mix(P.twist, clip.twist + turn * (1 - whole), k);
      P.headYaw = mix(P.headYaw, clip.headYaw - turn, k);
      P.headPitch = mix(P.headPitch, clip.headPitch, k);
      const g = mix(RELAXED, FIST, k);
      P.grip = [g, g];
      if (whole < 0.01) return;
      // ...and all of him: the legs, the hips' bob, tilt, sway and turn
      for (let i = 0; i < 2; i++) mixLimb(P.legs[i], clip.legs[i], whole, false);
      P.bob = mix(P.bob, clip.bob, whole);
      P.side = mix(P.side, clip.side, whole);
      P.sway = mix(P.sway ?? 0, clip.sway ?? 0, whole);
      P.turn = mix(P.turn ?? 0, turn, whole);
    },
  };
}
export type StreetFists = ReturnType<typeof createStreetFists>;

/** How near Degen a partner is drawn (tiles), and turns to face him */
const NEAR = 45;
const LOOK = 6;
const TURN = 3;

/** The sparring partners waiting in the guard where they stand (walk mode, near him only) */
export function createPartners(parent: THREE.Object3D, low: boolean, groundAt: (x: number, z: number) => number) {
  const all = PARTNERS.map((p, i) => {
    const sim: FightSim = createFightSim({ seed: 11 + i, fighters: [{ id: p.id, name: p.name, style: p.style, x: p.x, z: p.z, yaw: p.yaw }] });
    const f: Fighter = sim.fighter(p.id)!;
    return { p, sim, f, fg: null as FighterFigure | null };
  });
  return {
    /** Every frame while walking: draw those near him (x, z), hide the one being sparred with */
    update(dt: number, x: number, z: number, busy: PartnerId | null) {
      for (const a of all) {
        const near = Math.hypot(a.p.x - x, a.p.z - z) < NEAR && a.p.id !== busy;
        if (!near) {
          if (a.fg) a.fg.degen.g.visible = false;
          continue;
        }
        if (!a.fg) {
          a.fg = createFighterFigure(parent, crewOutfit(a.p.look), low, 23 + a.p.look);
          a.fg.y = groundAt(a.p.x, a.p.z);
        }
        a.fg.degen.g.visible = true;
        // (turned to face him as he comes up, back to their own way when he goes)
        const want = Math.hypot(a.p.x - x, a.p.z - z) < LOOK ? yawTo(a.p.x, a.p.z, x, z) : a.p.yaw;
        let dy = want - a.f.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        a.f.yaw += dy * Math.min(1, TURN * dt);
        a.f.x = a.p.x;
        a.f.z = a.p.z;
        a.sim.step(Math.min(dt, 0.1));
        drawFighter(a.fg, a.f, dt, a.sim.ticks);
      }
    },
    /** The partner whose "Spar" prompt shows here, if any */
    near(x: number, z: number) {
      const p = partnerNear(x, z);
      return p ? { id: p.id, name: p.name } : null;
    },
    /** Walk mode ending: hide them all */
    hide() {
      for (const a of all) if (a.fg) a.fg.degen.g.visible = false;
    },
  };
}
export type Partners = ReturnType<typeof createPartners>;
