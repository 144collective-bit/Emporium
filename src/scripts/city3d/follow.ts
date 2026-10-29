/*
 * Follow-through (the animation revamp's Phase 8, docs/animation-revamp-plan.md):
 * the head and neck a few frames behind the chest when it turns, the way a
 * head carries on where it was a moment before the body turns under it.
 * DOM-free; walk.ts (and the lab) lay the offset on the neck and the head
 * through `addLook()` after the motion capture has the pose.
 *
 * The chest's way in the world is followed by a lagging copy (eased with the
 * half-life `lag`); the head is turned back towards it by `share` of the
 * gap, at most `most`. Turning steadily the head trails by about the turn's
 * speed times the lag; once the chest stops it catches up; standing still
 * there's nothing. A jump in the chest's way (a teleport, a fresh start) is
 * taken at once (`snap`).
 */
export const FOLLOW = { lag: 0.06, share: 0.6, most: 0.22, snap: 1.2 };

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function createFollow() {
  let seen: number | null = null;
  let offset = 0;
  return {
    /** The head's turn back towards where the chest was (radians, added to the head's yaw), given the chest's way now */
    update(dt: number, chest: number): number {
      if (seen === null || Math.abs(wrap(chest - seen)) > FOLLOW.snap) seen = chest;
      else if (dt > 0) seen = chest + wrap(seen - chest) * Math.pow(0.5, dt / FOLLOW.lag);
      offset = Math.max(-FOLLOW.most, Math.min(FOLLOW.most, FOLLOW.share * wrap(seen - chest)));
      return offset;
    },
    /** Start again (walking starts) */
    reset() {
      seen = null;
      offset = 0;
    },
    get offset() {
      return offset;
    },
  };
}
export type Follow = ReturnType<typeof createFollow>;
