// Everyone's size (docs/scale-plan.md), DOM-free and on its own so the game server can read it without three.js
// (skeleton.ts re-exports it): your Degen on foot and at the wheel, other players, the crowd and the Fight Club's
// fighters at the crowd's size. The fight's moves and distances were written for fighters at 0.85 (`WAS_SCALE`)
// and are brought down in proportion (`SIZE_K`), so a fight plays as it did, only smaller.

/** About 0.86 tiles tall (1.3 at scale 1) */
export const FIGURE_SCALE = 0.66;
/** The size the player was before (and the fight's numbers were written for) */
export const WAS_SCALE = 0.85;
/** Everyone's size against it: what a length written for 0.85 is multiplied by */
export const SIZE_K = FIGURE_SCALE / WAS_SCALE;
