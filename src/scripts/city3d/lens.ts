/*
 * The walk camera's lens up close (DOM-free, tested in tests/lens.test.ts): what keeps walls and people from being
 * cut open when the camera is close to them.
 *
 * - The near plane (`nearFor()`): the camera draws nothing nearer it than its near plane, 0.5 for the whole city
 *   (`LENS.base`, index.ts). On foot the camera sits a third of a tile off a wall and the eye less, so at 0.5 the
 *   wall was cut away and you saw through it. walk.ts measures how far the walls in view are from the lens (straight
 *   ahead and at the view's two edges, `cameraRoom()`) and the near plane comes in to a share of that, never under
 *   `LENS.min`; first person it's in all the time, as the car's seat has it (drive.ts). It stays at 0.5 when nothing
 *   is close: pulled in for the whole walk, faces close together far off would flicker.
 * - People (`onLens()`): the crowd isn't in the camera's way (it passes through them), so anyone the lens is inside,
 *   or near enough that the near plane would cut them open, isn't drawn that frame (character.ts), and the sparring
 *   partners waiting in the street the same (brawl.ts).
 * - Fighters (`bodyGap()`): in a fight the camera stays on the pair, and the ropes or the street spar's ring can push
 *   it up against one; hiding your opponent mid-fight would be worse than the cut, so the fight's camera brings the
 *   near plane in by how far the nearer body is (fight.ts), and only one the lens is inside isn't drawn.
 */

export const LENS = {
  /** The city's near plane (index.ts's camera) */
  base: 0.5,
  /** Never nearer than this (the depth buffer's precision far off) */
  min: 0.05,
  /** First person: the eye is close to everything it walks up to */
  first: 0.06,
  /** The share of the distance to the nearest wall in view the near plane comes in to (its corners reach past it) */
  share: 0.6,
  /** How far the walls are looked for (past it, the base) */
  probe: 1,
  /** Steps the near plane moves in (so it isn't set anew every frame) */
  step: 0.01,
  /** A person's half-width and half-height, in their own scale, from the middle of their body */
  body: { r: 0.3, h: 0.7 },
};

/** The near plane for the nearest wall in view `gap` from the lens */
export function nearFor(gap: number, firstPerson: boolean, base = LENS.base): number {
  const want = Math.min(firstPerson ? LENS.first : base, Math.max(0, gap) * LENS.share);
  const stepped = Math.floor(want / LENS.step) * LENS.step;
  return Math.min(base, Math.max(LENS.min, stepped));
}

/**
 * How far the lens is from a person's body (their half-width round the middle, their half-height up and down): `dx`,
 * `dy`, `dz` from the lens to the middle of their body, `scale` theirs. Below 0, the lens is inside them
 */
export function bodyGap(dx: number, dy: number, dz: number, scale: number): number {
  return Math.max(Math.hypot(dx, dz) - LENS.body.r * scale, Math.abs(dy) - LENS.body.h * scale);
}

/** Whether the lens is inside a person or so close the near plane (`near`) cuts them (as `bodyGap()`) */
export function onLens(dx: number, dy: number, dz: number, near: number, scale: number): boolean {
  return bodyGap(dx, dy, dz, scale) < near;
}
