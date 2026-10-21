/*
 * Liberty Bridge as data (DOM-free like layout.ts and outer.ts, so the scene,
 * collisions, the tests and the game server read one layout): a one-of-a-kind
 * landmark, a suspension bridge carrying Liberty Road (layout.ts
 * `LIBERTY_ROAD`) over the river. Its twin towers stand on its grounds, the
 * old West 3 and South 1 plots (outer.ts `LIBERTY_GROUNDS`), either side of
 * the road; the main cables sweep from tower to tower high over both river
 * avenues and dip over the water, where hangers carry the deck; behind each
 * tower a backstay runs down to an anchorage. libertybridge.ts draws it.
 *
 * x east, z south, y up; world tiles (1 = about 1.8 m).
 */
import { BLOCKS, BS, DECK_WALK, EW_ROADS, LIBERTY_ROAD, RING_HI, SOUTH_ROAD, SOUTH_ROW, WALK_W } from './layout';
import { LIBERTY_END, PROMENADE } from './outer';
import type { Box } from './solids';

/** Liberty Road's centre line (x) and how far it runs (z) */
export const LX = LIBERTY_ROAD.c;
export const LZ: [number, number] = [LIBERTY_ROAD.z0, LIBERTY_END[1]];
/** Half the deck's width: the road and its wide walks */
export const DECK_HALF = LIBERTY_ROAD.half + DECK_WALK;
/** The deck over the river, promenade to promenade (it's at ground level, like every bridge in the city) */
export const DECK = { z0: PROMENADE.north[0] + 0.2, z1: PROMENADE.south[1] - 0.2 };

/** The towers: one on each bank's grounds, in the middle of the old plot (z), legs either side of the road */
export const TOWERS: [number, number] = [BLOCKS[2] + BS / 2, SOUTH_ROW + BS / 2];
/** The deck's edge beam outside each walk (the hangers stand on it), and the railing on the walk's outer edge */
export const FASCIA = { x0: DECK_HALF, x1: DECK_HALF + 0.32 };
export const RAIL_X = DECK_HALF + 0.05;
/** How far each leg's centre (and each main cable, and its hangers) is from the road's centre line */
export const LEG_X = DECK_HALF + 0.2;
/** A leg's footprint at its foot (x across, z along), narrowing by `taper` (each way) to the crown; its plinth */
export const LEG = { w: 0.9, d: 1.3, taper: 0.8, plinth: { w: 1.2, d: 1.6, h: 0.55 } };
/** The tower's height (the crown's top): well under the Emporium's roof (~12.5) */
export const TOWER_H = 11.2;
/** The portal beams between the legs: the low one clears a bus with room to spare */
export const BEAMS: { y0: number; y1: number }[] = [
  { y0: 4.4, y1: 5.1 },
  { y0: 7.5, y1: 7.9 },
];
/** The crown: the block between the legs' tops that carries the flame, both faces */
export const CROWN = { y0: 8.5, y1: 10.5 };
/** Where the main cables ride over each tower, and how low they dip in the middle of the span */
export const SADDLE = 10.75;
export const LOW = 3.0;
/** The anchorages behind the towers (z of each one's middle), where the backstays come down, and its block */
export const ANCHORS: [number, number] = [TOWERS[0] - 3.6, TOWERS[1] + 3.6];
export const ANCHOR = { w: 1.5, d: 1.4, h: 1.15 };

/** The main cables' height at z: a parabola from saddle to saddle, and straight down the backstays to the anchorages */
export function cableY(z: number) {
  const [n, s] = TOWERS;
  if (z >= n && z <= s) {
    const f = (z - (n + s) / 2) / ((s - n) / 2);
    return LOW + (SADDLE - LOW) * f * f;
  }
  const [a, t] = z < n ? [ANCHORS[0], n] : [ANCHORS[1], s];
  return ANCHOR.h + ((SADDLE - ANCHOR.h) * (z - a)) / (t - a);
}

/** Where the grounds' blocks end at the river avenues (z): the north one's south edge, the south one's north edge */
export const GROUND_EDGE: [number, number] = (() => {
  const [n, s] = [RING_HI, SOUTH_ROAD].map((c) => EW_ROADS.find((r) => r.c === c)!);
  return [n.c - n.half - WALK_W, s.c + s.half + WALK_W];
})();

/**
 * Where hangers drop from the main cables (z): along the deck over the river,
 * and over the grounds between each tower and its avenue (onto a low
 * stringer). None over the avenues: the cables leap them.
 */
export const HANGERS: { z: number; deck: boolean }[] = (() => {
  const out: { z: number; deck: boolean }[] = [];
  const run = (z0: number, z1: number, deck: boolean) => {
    const n = Math.max(1, Math.round((z1 - z0) / (deck ? 1.0 : 1.6)));
    for (let i = 0; i <= n; i++) out.push({ z: z0 + ((z1 - z0) * i) / n, deck });
  };
  run(TOWERS[0] + 1.2, GROUND_EDGE[0] - 0.4, false);
  run(DECK.z0 + 0.35, DECK.z1 - 0.35, true);
  run(GROUND_EDGE[1] + 0.4, TOWERS[1] - 1.2, false);
  return out;
})();
/** Walk in from the panel: at the north end of the deck's west walk, looking along it to the south tower (walk.ts: yaw 0 faces -z) */
export const LIBERTY_SPAWN = { x: LX - LIBERTY_ROAD.half - DECK_WALK / 2, z: DECK.z0 + 0.7, yaw: Math.PI };

/** What's solid: the towers' legs (two each, on their plinths) and the four anchorages */
export const LIBERTY_SOLIDS: Box[] = [
  ...TOWERS.flatMap((z) => [-1, 1].map((s): Box => [LX + s * LEG_X - LEG.plinth.w / 2, z - LEG.plinth.d / 2, LX + s * LEG_X + LEG.plinth.w / 2, z + LEG.plinth.d / 2, TOWER_H])),
  ...ANCHORS.flatMap((z) => [-1, 1].map((s): Box => [LX + s * LEG_X - ANCHOR.w / 2, z - ANCHOR.d / 2, LX + s * LEG_X + ANCHOR.w / 2, z + ANCHOR.d / 2, ANCHOR.h])),
];

/** Strolling on the deck: a line down the middle of each walk (life.ts walks people up one side of it and back down the other) */
export const DECK_STROLLS: [number, number][][] = [-1, 1].map((s) => {
  const x = LX + s * (LIBERTY_ROAD.half + DECK_WALK / 2);
  const [z0, z1] = [DECK.z0 + 0.8, DECK.z1 - 0.8];
  return [
    [x - 0.01, z0],
    [x - 0.01, z1],
    [x + 0.01, z1],
    [x + 0.01, z0],
  ];
});

/** On one of the deck's raised walks (walking stands on them; the road between is at street level) */
export const onDeckWalk = (x: number, z: number) => z > DECK.z0 && z < DECK.z1 && Math.abs(x - LX) > LIBERTY_ROAD.half && Math.abs(x - LX) < DECK_HALF;
