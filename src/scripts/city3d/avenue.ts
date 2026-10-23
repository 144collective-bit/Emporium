/*
 * The Trenches' three places on the riverside (the grit's step 3, the
 * owner's call: "a gun store, a bar, and a large neon nightclub"; named for
 * Trench Avenue, where they first stood under the el; since the riverside's
 * redesign (riverside.ts, the owner's call) they front the bank avenue,
 * facing the boardwalk and the river; DOM-free, tested in
 * tests/avenue.test.ts), drawn by avenue3d.ts. Every number follows the way
 * a place faces (`face`, `out`, `wall`, `street`), so it reads the same
 * facing either way:
 *
 * - **Club PULSE** (`CLUB`): the riverside's landmark, the whole river half
 *   of trench-a3 (four times the club it was): a black hall behind vertical
 *   neon fins throbbing with the beat, PULSE across them, a corner pylon
 *   with the vertical sign and a mast (`pylon`), a fly tower at the back
 *   with a heartbeat traced in neon across its face (`fly`), a sky deck on
 *   the roof with its DJ booth and dancers looking out over the river
 *   (`deck`), searchlights sweeping the sky at night, a wide marquee with
 *   chasing bulbs over a red carpet, the queue behind a velvet rope and two
 *   bouncers. Tasteful: a dance club, nothing more. Its panel says coming
 *   soon.
 * - **The Rusty Nail** (`BAR`): a dive bar in an old brick walk-up on
 *   trench-a2's corner by the cross street: a dark wood front, warm
 *   windows, its name in neon and a blade sign. Coming soon.
 * - **Trench Arms** (`ARMS`): a gun store in a squat brick building on
 *   trench-a1's corner: barred windows, a roller shutter half up and a
 *   service hatch on the street (`ARMS.counter`), which opens the Armoury's
 *   gun store and workbench (cartoon guns, Dorras only).
 *
 * Their lots are riverside.ts's. What's solid is `AVENUE_SOLIDS` (in
 * SOLIDS): the buildings, the club's pylon and fly tower, the rope.
 */
import type { Footprint, Pt, Rect } from './downtown';
import { WALK_W } from './layout';
import { ARMS_LOT, BAR_LOT, CLUB_BLOCK, CLUB_LOT } from './riverside';

export type AvenueId = 'club' | 'bar' | 'arms';

/** A place's building: the land it has, the building on it (to its roof), its door in the front wall and the spot out on the sidewalk you stand at */
export interface AvenuePlace {
  id: AvenueId;
  name: string;
  block: string;
  lot: Rect;
  body: Rect;
  h: number;
  /** The way its front faces: north, across the bank avenue to the river */
  face: 'n' | 's';
  /** z out of the front: 1 facing south, -1 facing north */
  out: 1 | -1;
  /** The front of its lot on the sidewalk, and of its building (z) */
  street: number;
  wall: number;
  /** The door's middle, in the front wall (z of the wall), and its width */
  door: { x: number; z: number; w: number };
  /** Where the prompt is: out in front of the door */
  spot: { x: number; z: number };
}

/** How far the club's front stands back from its street: the forecourt the queue waits on */
export const FORECOURT = 3.1;
/** How deep the rows' front strip is, kept in front of the bar and the gun store (a brownstone's) */
const FRONT = 0.8;
/** On the cross street the club keeps a strip of sidewalk of its own */
const SIDE_FRONT = 0.9;

/** The riverside's places face north (out of the front is -z) */
const face = 'n' as const;
const out = -1 as const;
/** A lot pulled back from its front by d */
const back = ([x0, z0, x1, z1]: Rect, d: number): Rect => (out < 0 ? [x0, z0 + d, x1, z1] : [x0, z0, x1, z1 - d]);
const streetOf = (lot: Rect) => (out < 0 ? lot[1] : lot[3]);

const onCorner = (id: 'bar' | 'arms', name: string, block: string, lot: Rect, h: number, doorAt: number): AvenuePlace => {
  const [x0, , x1] = lot;
  const street = streetOf(lot);
  const body = back(lot, FRONT);
  const wall = street - out * FRONT;
  // (doorAt from the left, seen from the street)
  const door = { x: out > 0 ? x0 + (x1 - x0) * doorAt : x1 - (x1 - x0) * doorAt, z: wall, w: 1.15 };
  return { id, name, block, lot, body, h, face, out, street, wall, door, spot: { x: door.x, z: street + (out * WALK_W) / 2 } };
};

export const CLUB: AvenuePlace & {
  /** The corner pylon (its footprint, roof and the mast's top) carrying the vertical PULSE sign on its two outer faces */
  pylon: { rect: Rect; h: number; top: number };
  /** The fly tower over the back of the hall (its footprint and roof): the heartbeat in neon across its front */
  fly: { rect: Rect; h: number };
  /** The sky deck on the hall's roof, in front of the fly tower: its floor, the DJ booth, the dancers */
  deck: { rect: Rect; booth: Rect; people: { x: number; z: number; yaw: number }[] };
  /** The fins up the front between the ground floor and the parapet (x of each) */
  fins: number[];
  /** The marquee over the door: x0, x1, how far out over the forecourt (to z), its height */
  marquee: { x0: number; x1: number; z: number; y: number };
  /** The red carpet from the door to the sidewalk */
  carpet: Rect;
  /** The velvet rope along the forecourt, posts at x from the pylon to near the door */
  rope: { z: number; posts: number[]; h: number };
  /** The queue along it, facing the door (yaw) */
  queue: { x: number; z: number; yaw: number }[];
  /** The bouncers either side of the door */
  bouncers: { x: number; z: number; yaw: number }[];
  /** The searchlights on the roof's front corners (x, z), up on the parapet */
  searchlights: Pt[];
  /** The vertical sign's corner (the pylon's outer corner) and its height */
  blade: { x: number; z: number; h: number };
} = (() => {
  const lot = CLUB_LOT;
  const [x0, , x1, z1] = lot;
  const street = streetOf(lot);
  const wall = street - out * FORECOURT;
  const body: Rect = [x0 + SIDE_FRONT, wall, x1 - 0.6, z1 - 1.2];
  const h = 8.2;
  const pylon = { rect: [x0 + 0.15, street + 0.9, x0 + 3.35, wall + 1] as Rect, h: 11, top: 11.85 };
  const fly = { rect: [body[0] + 3.2, body[1] + 7.4, body[2] - 2.4, body[3]] as Rect, h: 9.7 };
  // The door in the middle of the front east of the pylon
  const dx = (pylon.rect[2] + body[2]) / 2;
  const door = { x: dx, z: wall, w: 2.6 };
  const fins: number[] = [];
  for (let x = pylon.rect[2] + 0.9; x < body[2] - 0.4; x += 1.45) fins.push(x);
  const marquee = { x0: dx - 4.4, x1: dx + 4.4, z: street + 0.35, y: 2.95 };
  const carpet: Rect = [dx - 0.9, street, dx + 0.9, wall];
  const ropeZ = wall + out * 1.65;
  const posts: number[] = [];
  for (let x = pylon.rect[2] + 0.7; x <= dx - 2.1 + 1e-6; x += 1.15) posts.push(x);
  const queue: { x: number; z: number; yaw: number }[] = [];
  // In twos and threes along the wall side of the rope, facing the door (east, +x is yaw π/2)
  const spots = [0.8, 1.4, 2.3, 2.9, 3.6, 4.6, 5.2, 6.1];
  for (const [i, d] of spots.entries()) {
    const x = dx - 2.4 - d;
    if (x < pylon.rect[2] + 0.5) break;
    queue.push({ x, z: wall + out * (0.6 + (i % 2) * 0.4), yaw: Math.PI / 2 + out * (i % 3 === 1 ? 0.5 : i % 3 === 2 ? -0.35 : 0) });
  }
  // (facing out to the street: 0 is +z)
  const bouncers = [-1.75, 1.75].map((o) => ({ x: dx + o, z: wall + out * 0.5, yaw: out > 0 ? 0 : Math.PI }));
  const deckRect: Rect = [body[0] + 0.5, body[1] + 0.5, body[2] - 0.5, fly.rect[1] - 0.2];
  const booth: Rect = [dx - 1.6, fly.rect[1] - 2.2, dx + 1.6, fly.rect[1] - 0.2];
  const people: { x: number; z: number; yaw: number }[] = [];
  // Dancers facing the booth (south: yaw 0), a few at the rail looking out over the river (north: yaw π)
  for (const [ox, oz, look] of [
    [-5.5, 2.2, 0],
    [-3.6, 1.4, 0],
    [-1.2, 2.6, 0],
    [1.4, 1.8, 0],
    [3.8, 2.4, 0],
    [6.2, 1.5, 0],
    [-7.8, 0.7, 1],
    [8.2, 0.7, 1],
    [0.4, 0.7, 1],
  ] as [number, number, number][])
    people.push({ x: dx + ox, z: deckRect[1] + oz, yaw: look ? Math.PI : 0.2 * Math.sign(-ox) });
  return {
    id: 'club',
    name: 'Club PULSE',
    block: CLUB_BLOCK,
    lot,
    body,
    h,
    face,
    out,
    street,
    wall,
    door,
    spot: { x: door.x, z: wall + out * 1.1 },
    pylon,
    fly,
    deck: { rect: deckRect, booth, people },
    fins,
    marquee,
    carpet,
    rope: { z: ropeZ, posts, h: 0.9 },
    queue,
    bouncers,
    searchlights: [
      [body[0] + 4.2, body[1] + 0.5],
      [body[2] - 0.6, body[1] + 0.5],
    ],
    blade: { x: pylon.rect[0], z: pylon.rect[1], h: pylon.h - 0.5 },
  };
})();

export const BAR: AvenuePlace = onCorner('bar', 'The Rusty Nail', 'trench-a2', BAR_LOT, 4.6, 0.32);
export const ARMS: AvenuePlace & {
  /** The service hatch in the shopfront: x0, x1, its counter's height (a Degen's waist) and the opening's */
  hatch: { x0: number; x1: number; y: number; h: number };
  /** Where you stand at the hatch: the counter (opens the gun store) */
  counter: { x: number; z: number };
} = (() => {
  const p = onCorner('arms', 'Trench Arms', 'trench-a1', ARMS_LOT, 3.6, 0.28);
  const [x0, , x1] = p.body;
  // (right of the door, seen from the street)
  const hx = p.out > 0 ? x0 + (x1 - x0) * 0.68 : x1 - (x1 - x0) * 0.68;
  return { ...p, hatch: { x0: hx - 0.8, x1: hx + 0.8, y: 0.55, h: 0.55 }, counter: { x: hx, z: p.street + (p.out * WALK_W) / 2 } };
})();

export const AVENUE_PLACES: AvenuePlace[] = [CLUB, BAR, ARMS];

/** Doors that open a place's panel (the club and the bar; Trench Arms is its counter): the place, where you stand */
export const AVENUE_DOORS: { id: 'club' | 'bar'; x: number; z: number }[] = [
  { id: 'club', ...CLUB.spot },
  { id: 'bar', ...BAR.spot },
];

/** Where Walk in and fast travel stand you: on the sidewalk in front, facing it (walk.ts's yaw: 0 faces north, π south) */
const facingIn = (p: AvenuePlace) => (p.out > 0 ? 0 : Math.PI);
export const AVENUE_SPAWNS: Record<AvenueId, { x: number; z: number; yaw: number }> = {
  club: { x: CLUB.door.x + 2.8, z: CLUB.street + (CLUB.out * WALK_W) / 2, yaw: facingIn(CLUB) },
  bar: { x: BAR.spot.x, z: BAR.spot.z + BAR.out * 0.2, yaw: facingIn(BAR) },
  arms: { x: ARMS.counter.x - ARMS.out * 1.1, z: ARMS.counter.z + ARMS.out * 0.2, yaw: facingIn(ARMS) },
};

/** Everything solid: the three buildings to their roofs, the club's pylon and fly tower, the rope from its first post to its last */
export const AVENUE_SOLIDS: Footprint[] = (() => {
  const r = 0.06;
  const p = CLUB.rope.posts;
  return [
    ...AVENUE_PLACES.map((a): Footprint => [...a.body, a.h + 0.4]),
    [...CLUB.pylon.rect, CLUB.pylon.top],
    [...CLUB.fly.rect, CLUB.fly.h],
    [p[0] - r, CLUB.rope.z - r, p[p.length - 1] + r, CLUB.rope.z + r, CLUB.rope.h],
  ];
})();
