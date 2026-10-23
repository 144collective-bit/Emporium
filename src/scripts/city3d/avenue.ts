/*
 * Trench Avenue's places (the grit's step 3, the owner's call: "a gun
 * store, a bar, and a large neon nightclub", on Trench Avenue under the el;
 * DOM-free, tested in tests/avenue.test.ts), drawn by avenue3d.ts:
 *
 * - **Club PULSE** (`CLUB`): a big nightclub on the corner of trench-a3,
 *   the cross street and the avenue, facing the el: a black box with neon
 *   up its corner and along its parapet, PULSE over a marquee, a forecourt
 *   where the queue waits along a velvet rope and a bouncer by the door.
 *   Tasteful: a dance club, nothing more. Its panel says coming soon.
 * - **The Rusty Nail** (`BAR`): a dive bar in an old brick walk-up on
 *   trench-a2, next to Block Bodega: a dark wood front, warm windows, its
 *   name in neon and a blade sign. Coming soon.
 * - **Trench Arms** (`ARMS`): a gun store in a squat brick building
 *   across the avenue from the station: barred windows, a roller shutter
 *   half up and a service hatch on the street (`ARMS.counter`), which opens
 *   the Armoury's gun store and workbench (cartoon guns, Dorras only).
 *
 * Each stands on the row lots projects.ts sets aside (`AVENUE_LOTS`, kept
 * out of the rows' drawing and solids) and keeps their front strip. What's
 * solid is `AVENUE_SOLIDS` (in SOLIDS): the buildings, the club's rope.
 */
import type { Footprint, Pt, Rect } from './downtown';
import { AVENUE_LOTS, type AvenueId, type AvenueLots } from './projects';
import { WALK_W } from './layout';

const lots = (id: AvenueId): AvenueLots => AVENUE_LOTS.find((a) => a.id === id)!;

/** A place's building: the land it has, the building on it (to its roof), its door in the front wall and the spot out on the sidewalk you stand at */
export interface AvenuePlace {
  id: AvenueId;
  name: string;
  block: string;
  lot: Rect;
  body: Rect;
  h: number;
  /** The door's middle, in the front wall (z of the wall), and its width */
  door: { x: number; z: number; w: number };
  /** Where the prompt is: out in front of the door */
  spot: { x: number; z: number };
}

/** How far the club's front stands back from the avenue: the forecourt the queue waits on */
export const FORECOURT = 2.3;
/** How deep the rows' front strip is, kept in front of the bar and the gun store (a brownstone's) */
const FRONT = 0.8;
/** On the cross street the club keeps the shops' strip */
const SIDE_FRONT = 0.5;

const club = (() => {
  const { rect, block } = lots('club');
  const [x0, z0, x1, z1] = rect;
  const body: Rect = [x0 + SIDE_FRONT, z0, x1, z1 - FORECOURT];
  const door = { x: x1 - 4.4, z: body[3], w: 1.6 };
  return { id: 'club' as const, name: 'Club PULSE', block, lot: rect, body, h: 6.4, door, spot: { x: door.x, z: body[3] + 0.9 } };
})();
const onAvenue = (id: 'bar' | 'arms', name: string, h: number, doorAt: number): AvenuePlace => {
  const { rect, block } = lots(id);
  const [x0, z0, x1, z1] = rect;
  const body: Rect = [x0, z0, x1, z1 - FRONT];
  const door = { x: x0 + (x1 - x0) * doorAt, z: body[3], w: 1.15 };
  return { id, name, block, lot: rect, body, h, door, spot: { x: door.x, z: z1 + WALK_W / 2 } };
};

export const CLUB: AvenuePlace & {
  /** The marquee over the door: x0, x1, how far out over the forecourt (to z), its height */
  marquee: { x0: number; x1: number; z: number; y: number };
  /** The velvet rope along the forecourt, posts at x from the corner to near the door */
  rope: { z: number; posts: number[]; h: number };
  /** The queue along it, facing the door (yaw) */
  queue: { x: number; z: number; yaw: number }[];
  /** The bouncer, by the door */
  bouncer: { x: number; z: number; yaw: number };
  /** The corner the vertical PULSE sign stands on, and its height */
  blade: { x: number; z: number; h: number };
} = (() => {
  const [bx0, , , bz1] = club.body;
  const [, , , lz1] = club.lot;
  const marquee = { x0: club.door.x - 2.6, x1: club.door.x + 2.6, z: lz1 - 0.15, y: 2.55 };
  const ropeZ = bz1 + 1.35;
  const posts: number[] = [];
  for (let x = bx0 + 0.6; x <= club.door.x - 1.3 + 1e-6; x += 1.1) posts.push(x);
  const queue: { x: number; z: number; yaw: number }[] = [];
  // In twos and threes along the wall side of the rope, facing the door (east, +x is yaw π/2)
  const spots = [1.1, 1.75, 2.9, 3.5, 4.2, 5.5, 6.15, 7.3];
  for (const [i, d] of spots.entries()) {
    const x = club.door.x - 1.4 - d;
    if (x < bx0 + 0.4) break;
    queue.push({ x, z: bz1 + 0.55 + (i % 2) * 0.32, yaw: Math.PI / 2 + (i % 3 === 1 ? 0.5 : i % 3 === 2 ? -0.35 : 0) });
  }
  return {
    ...club,
    marquee,
    rope: { z: ropeZ, posts, h: 0.9 },
    queue,
    bouncer: { x: club.door.x - 1.05, z: bz1 + 0.45, yaw: 0 },
    blade: { x: bx0, z: bz1, h: 8.6 },
  };
})();

export const BAR: AvenuePlace = onAvenue('bar', 'The Rusty Nail', 4.6, 0.32);
export const ARMS: AvenuePlace & {
  /** The service hatch in the shopfront: x0, x1, its counter's height (a Degen's waist) and the opening's */
  hatch: { x0: number; x1: number; y: number; h: number };
  /** Where you stand at the hatch: the counter (opens the gun store) */
  counter: { x: number; z: number };
} = (() => {
  const p = onAvenue('arms', 'Trench Arms', 3.6, 0.28);
  const [x0, , x1] = p.body;
  const hx = x0 + (x1 - x0) * 0.68;
  return { ...p, hatch: { x0: hx - 0.8, x1: hx + 0.8, y: 0.55, h: 0.55 }, counter: { x: hx, z: p.lot[3] + WALK_W / 2 } };
})();

export const AVENUE_PLACES: AvenuePlace[] = [CLUB, BAR, ARMS];

/** Doors that open a place's panel (the club and the bar; Trench Arms is its counter): the place, where you stand */
export const AVENUE_DOORS: { id: 'club' | 'bar'; x: number; z: number }[] = [
  { id: 'club', ...CLUB.spot },
  { id: 'bar', ...BAR.spot },
];

/** Where Walk in and fast travel stand you: on the sidewalk in front, facing it (north: walk.ts's yaw 0) */
export const AVENUE_SPAWNS: Record<AvenueId, { x: number; z: number; yaw: number }> = {
  club: { x: CLUB.door.x + 1.2, z: CLUB.lot[3] + WALK_W / 2, yaw: 0 },
  bar: { x: BAR.spot.x, z: BAR.spot.z + 0.2, yaw: 0 },
  arms: { x: ARMS.counter.x - 1.1, z: ARMS.counter.z + 0.2, yaw: 0 },
};

/** Everything solid: the three buildings to their roofs, the club's corner sign, the rope from the corner to its last post */
export const AVENUE_SOLIDS: Footprint[] = (() => {
  const r = 0.06;
  const p = CLUB.rope.posts;
  return [
    ...AVENUE_PLACES.map((a): Footprint => [...a.body, a.h]),
    [p[0] - r, CLUB.rope.z - r, p[p.length - 1] + r, CLUB.rope.z + r, CLUB.rope.h],
  ];
})();

/** The spots a place's people take: the queue and the bouncer at the club (avenue3d.ts) */
export const clubPeople = (): Pt[] => [...CLUB.queue.map((q): Pt => [q.x, q.z]), [CLUB.bouncer.x, CLUB.bouncer.z]];
