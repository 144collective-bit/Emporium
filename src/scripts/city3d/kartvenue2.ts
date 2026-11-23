/*
 * Riverside Raceway's venue (docs/kart-harbour-plan.md, Phase 4), behind `?karts=new`: the buildings and what stands
 * round the circuit, in the site's frame (u east, v south from its north-west corner, kartcircuit2.ts `SITE2`).
 * DOM-free, tested in tests/kartvenue2.test.ts; drawn by kartvenue2-3d.ts (with the track's district, `karts2`).
 *
 * 4a, the workshops and the tyre store, along the site's south side west of the paddock ("stacked tyres and
 * workshops etc.", the owner's ask), on a concrete apron facing the track:
 * - **the tuning shed**: open-fronted, three bays behind roller doors half up; benches with vices along its back under
 *   the tool walls, karts up on stands, an engine rack, a parts counter at its east end;
 * - **the tyre store**: open-fronted, steel racks of tyres along its walls, a tyre-fitting machine;
 * - **tyres stacked everywhere**: loose stacks by the sheds and along the pit lane's garage side, and the corners' tyre
 *   walls painted in the club's colours (kartgrounds2-3d.ts).
 * The east end of the strip (u 50 to 64) is kept for the hire-kart garage (4b).
 */
import { SITE2 } from './kartcircuit2';

/** A rectangle in the site's frame */
export interface URect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}
/** A solid in the world: x0, z0, x1, z1, its top (solids.ts `Box`) */
export type Box2 = [number, number, number, number, number];

/** The club's colours (the tyre walls, the sheds' fascias, the karts on stands) */
export const CLUB = { a: '#2aabee', b: '#ff4fa3', ink: '#1b1830' } as const;

/** The concrete apron the sheds stand on, from the run-off's barriers to the site's south edge */
export const APRON2: URect = { u0: 3, v0: 131, u1: 64, v1: 154 };
/** The tuning shed: three bays, open to the track (north) behind roller doors half up */
export const WORKSHOP2 = { u0: 6, v0: 137, u1: 30, v1: 151, h: 4.4, bays: 3 } as const;
/** The tyre store: open to the track, racks along its walls */
export const TYRESTORE2 = { u0: 33, v0: 139, u1: 47, v1: 151, h: 3.8 } as const;
/** The hire-kart garage's land (4b), kept clear */
export const HIRE2_LAND: URect = { u0: 50, v0: 133, u1: 64, v1: 154 };
/** How thick the sheds' walls are */
export const WALL = 0.25;

/** Inside the tuning shed: the benches along its back, the karts on stands, the engine rack, the parts counter */
export const BENCHES2: URect[] = Array.from({ length: WORKSHOP2.bays }, (_, k) => {
  const w = (WORKSHOP2.u1 - WORKSHOP2.u0) / WORKSHOP2.bays;
  const u0 = WORKSHOP2.u0 + k * w;
  return { u0: u0 + 1.2, v0: WORKSHOP2.v1 - WALL - 0.9, u1: u0 + w - (k === WORKSHOP2.bays - 1 ? 3.4 : 1.2), v1: WORKSHOP2.v1 - WALL };
});
/** A kart up on a stand in each bay, and one on a trolley in the first: where (the kart's middle) and which way it faces (radians, 0 east) */
export const STANDS2: { u: number; v: number; ry: number; trolley: boolean }[] = [
  ...Array.from({ length: WORKSHOP2.bays }, (_, k) => {
    const w = (WORKSHOP2.u1 - WORKSHOP2.u0) / WORKSHOP2.bays;
    return { u: WORKSHOP2.u0 + (k + 0.5) * w, v: WORKSHOP2.v0 + 6.6, ry: Math.PI / 2, trolley: false };
  }),
  { u: WORKSHOP2.u0 + 3.2, v: WORKSHOP2.v0 + 3.4, ry: 0.3, trolley: true },
];
/** The engine rack: a steel shelf of engines against the shed's west wall */
export const ENGINE_RACK2: URect = { u0: WORKSHOP2.u0 + WALL, v0: WORKSHOP2.v0 + 4.5, u1: WORKSHOP2.u0 + WALL + 0.8, v1: WORKSHOP2.v0 + 10 };
/** The parts counter at the shed's east end, its shelves behind it against the east wall */
export const COUNTER2: URect = { u0: WORKSHOP2.u1 - 3.6, v0: WORKSHOP2.v0 + 3.5, u1: WORKSHOP2.u1 - 2.9, v1: WORKSHOP2.v0 + 9.5 };
export const PARTS_SHELF2: URect = { u0: WORKSHOP2.u1 - WALL - 0.7, v0: WORKSHOP2.v0 + 3, u1: WORKSHOP2.u1 - WALL, v1: WORKSHOP2.v1 - WALL - 1 };

/** Inside the tyre store: racks along its back and both sides, the fitting machine in the middle */
export const RACKS2: URect[] = [
  { u0: TYRESTORE2.u0 + WALL, v0: TYRESTORE2.v1 - WALL - 0.9, u1: TYRESTORE2.u1 - WALL, v1: TYRESTORE2.v1 - WALL },
  { u0: TYRESTORE2.u0 + WALL, v0: TYRESTORE2.v0 + 2.5, u1: TYRESTORE2.u0 + WALL + 0.9, v1: TYRESTORE2.v1 - WALL - 1.6 },
  { u0: TYRESTORE2.u1 - WALL - 0.9, v0: TYRESTORE2.v0 + 2.5, u1: TYRESTORE2.u1 - WALL, v1: TYRESTORE2.v1 - WALL - 1.6 },
];
/** The rack's shelves (heights over the floor) */
export const RACK_SHELVES = [0.35, 1.15, 1.95];
export const FITTER2 = { u: (TYRESTORE2.u0 + TYRESTORE2.u1) / 2, v: TYRESTORE2.v0 + 6.5 } as const;

/** Loose stacks of tyres: how many high, where (site frame) */
export interface TyreStack {
  u: number;
  v: number;
  n: number;
}
/** A tyre's radius and depth, lying flat in a stack */
export const TYRE2 = { r: 0.33, h: 0.24 } as const;
export const STACKS2: TyreStack[] = [
  // (by the tuning shed's front, between its bays' doors, and at its corners)
  ...[0, 1, 2, 3].map((k): TyreStack => ({ u: WORKSHOP2.u0 + (k * (WORKSHOP2.u1 - WORKSHOP2.u0)) / WORKSHOP2.bays + (k === 0 ? -0.8 : k === 3 ? 0.8 : 0), v: WORKSHOP2.v0 - 1.2, n: 3 + (k % 2) })),
  { u: WORKSHOP2.u0 - 1.4, v: WORKSHOP2.v0 + 2, n: 5 },
  { u: WORKSHOP2.u0 - 1.4, v: WORKSHOP2.v0 + 2.8, n: 4 },
  // (by the tyre store: piles either side of its front, a row along its west side)
  { u: TYRESTORE2.u0 - 0.9, v: TYRESTORE2.v0 - 1.0, n: 6 },
  { u: TYRESTORE2.u0 - 0.9, v: TYRESTORE2.v0 - 1.8, n: 5 },
  { u: TYRESTORE2.u0 - 1.7, v: TYRESTORE2.v0 - 1.4, n: 4 },
  { u: TYRESTORE2.u1 + 0.9, v: TYRESTORE2.v0 - 1.0, n: 6 },
  { u: TYRESTORE2.u1 + 0.9, v: TYRESTORE2.v0 - 1.8, n: 3 },
  ...[0, 1, 2, 3, 4].map((k): TyreStack => ({ u: TYRESTORE2.u0 - 1.0, v: TYRESTORE2.v0 + 3 + k * 1.6, n: 2 + ((k * 3) % 4) })),
  // (along the pit lane's garage side, a stack every few tiles, where the teams change tyres)
  ...Array.from({ length: 7 }, (_, k): TyreStack => ({ u: 112 + k * 4, v: 128.9, n: 2 + ((k * 5) % 3) })),
];

/** The world's numbers of a point in the site's frame */
export const W2 = (u: number, v: number): [number, number] => [SITE2.x0 + u, SITE2.z0 + v];
const box = (r: URect, top: number): Box2 => [SITE2.x0 + r.u0, SITE2.z0 + r.v0, SITE2.x0 + r.u1, SITE2.z0 + r.v1, top];

/** The sheds' walls (back and sides; their fronts open but for the posts between the bays) */
function shedWalls(s: { u0: number; v0: number; u1: number; v1: number; h: number }, bays: number): Box2[] {
  const out: Box2[] = [
    box({ u0: s.u0, v0: s.v1 - WALL, u1: s.u1, v1: s.v1 }, s.h),
    box({ u0: s.u0, v0: s.v0, u1: s.u0 + WALL, v1: s.v1 }, s.h),
    box({ u0: s.u1 - WALL, v0: s.v0, u1: s.u1, v1: s.v1 }, s.h),
  ];
  // (the posts between the bays, and at the front corners already in the side walls)
  for (let k = 1; k < bays; k++) {
    const u = s.u0 + ((s.u1 - s.u0) * k) / bays;
    out.push(box({ u0: u - 0.18, v0: s.v0, u1: u + 0.18, v1: s.v0 + 0.36 }, s.h));
  }
  return out;
}

/** What stops you on foot (walk.ts, through kartswitch.ts at the boot): the sheds' walls and posts, the benches, the racks, the counter, the machine, the stacks */
export const VENUE2_SOLIDS: Box2[] = [
  ...shedWalls(WORKSHOP2, WORKSHOP2.bays),
  ...shedWalls(TYRESTORE2, 1),
  ...BENCHES2.map((b) => box(b, 1)),
  box(ENGINE_RACK2, 1.9),
  box(COUNTER2, 1.1),
  box(PARTS_SHELF2, 2.2),
  ...RACKS2.map((r) => box(r, 2.4)),
  box({ u0: FITTER2.u - 0.5, v0: FITTER2.v - 0.5, u1: FITTER2.u + 0.5, v1: FITTER2.v + 0.5 }, 1.3),
  ...STANDS2.map((s) => box({ u0: s.u - 0.75, v0: s.v - 0.75, u1: s.u + 0.75, v1: s.v + 0.75 }, 1)),
  ...STACKS2.map((s) => box({ u0: s.u - TYRE2.r, v0: s.v - TYRE2.r, u1: s.u + TYRE2.r, v1: s.v + TYRE2.r }, s.n * TYRE2.h)),
];
