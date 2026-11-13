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
 *   or near enough that the near plane would cut them open, isn't drawn that frame (character.ts).
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
 * Whether the lens is inside a person or so close the near plane cuts them: `dx`, `dy`, `dz` from the lens to the
 * middle of their body, `near` the camera's near plane, `scale` theirs
 */
export function onLens(dx: number, dy: number, dz: number, near: number, scale: number): boolean {
  const r = LENS.body.r * scale + near;
  return dx * dx + dz * dz < r * r && Math.abs(dy) < LENS.body.h * scale + near;
}
