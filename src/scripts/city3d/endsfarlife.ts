/*
 * The far west's life and night (docs/ends-far-west-plan.md Phase 5; DOM-free, the chunk's, tested in
 * tests/endsfarlife.test.ts): a quiet end of the estate, never anyone on the compound (it's his):
 *
 * - **Walkers** (`FAR_PEOPLE`): three round the lane's two sidewalks, one up and down the allotments' middle path.
 * - **Standing about** (`FAR_IDLE`): two neighbours chatting over a bungalow's front wall, one at another's gate on
 *   the phone, three at their plots (stood over a bed, or looking it over), one reading at the allotments' gate.
 * - **At night** (`FAR_POOLS`): a pool of light on the lane under each of the gates' lamps, one in the yard by the
 *   garage's lamp and one at his front door; which windows are lit is the drawing's (home3d.ts, endsfarhomes3d.ts).
 *
 * Into the crowd's spare slots (life.ts `addPeople()`), as the rest of the Ends', on desktops only: the phones' slots
 * are all spoken for (index.ts TIERS `reserve`), so the far west has nobody there. Its sound is Endswood's.
 */
import { LANE_HALF, LANE_X, LANE_Z } from './endsfar';
import { ALLOTMENT, BUNGALOWS, FRONT_WALL, PLOTS } from './endsfarhomes';
import { HOME, PIER } from './home';
import { SLAB_Y, type Pt } from './endswood';
import { WALK_PACE, type Moment, type ParkPerson } from './parklife';
import type { Idle } from './landmarks';

/* ---------- Walkers ---------- */

interface Loop {
  id: string;
  pts: Pt[];
  cum: number[];
  len: number;
  pace: number;
  count: number;
}
function loop(id: string, pts: Pt[], pace: number, count: number): Loop {
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % pts.length][0] - pts[i - 1][0], pts[i % pts.length][1] - pts[i - 1][1]));
  return { id, pts, cum, len: cum[cum.length - 1], pace, count };
}
const scratch = { x: 0, z: 0, dx: 0, dz: 0 };
function along(l: Loop, u: number) {
  u = ((u % l.len) + l.len) % l.len;
  let i = 0;
  while (i < l.pts.length - 1 && l.cum[i + 1] <= u) i++;
  const [a, b] = [l.pts[i], l.pts[(i + 1) % l.pts.length]];
  const seg = l.cum[i + 1] - l.cum[i] || 1;
  const f = (u - l.cum[i]) / seg;
  scratch.x = a[0] + (b[0] - a[0]) * f;
  scratch.z = a[1] + (b[1] - a[1]) * f;
  scratch.dx = (b[0] - a[0]) / seg;
  scratch.dz = (b[1] - a[1]) / seg;
  return scratch;
}

/** How far out from the lane's kerb its walkers go: on its sidewalk's middle */
export const LANE_OFF = LANE_HALF + 0.4;
/** How far inside the allotments' end gates their walker turns round */
const [az0, az1] = [ALLOTMENT.rect[1] + 1.5, ALLOTMENT.rect[3] - 1.5];
export const FAR_LOOPS: Loop[] = [
  // Up the lane's east sidewalk and back down its west one, crossing at its ends (short of the dead ends' edges)
  loop(
    'lane',
    [
      [LANE_X + LANE_OFF, LANE_Z[0] + 2],
      [LANE_X + LANE_OFF, LANE_Z[1] - 2],
      [LANE_X - LANE_OFF, LANE_Z[1] - 2],
      [LANE_X - LANE_OFF, LANE_Z[0] + 2],
    ],
    WALK_PACE,
    3
  ),
  // The allotments' middle path, up one side of it and down the other
  loop(
    'allotments',
    [
      [ALLOTMENT.mid - 0.3, az0],
      [ALLOTMENT.mid - 0.3, az1],
      [ALLOTMENT.mid + 0.3, az1],
      [ALLOTMENT.mid + 0.3, az0],
    ],
    WALK_PACE * 0.85,
    1
  ),
];
export const FAR_PEOPLE: ParkPerson[] = FAR_LOOPS.flatMap((l, li) =>
  Array.from({ length: l.count }, (_, k): ParkPerson => {
    const u0 = (li * 11.7 + (k / l.count) * l.len) % l.len;
    return {
      id: `endsfar-${l.id}-${k}`,
      trim: k % 2 === 1,
      at(t: number, out: Moment) {
        const s = along(l, u0 + l.pace * t);
        return Object.assign(out, { x: s.x, z: s.z, y: SLAB_Y, ry: Math.atan2(s.dx, s.dz), clip: 'walk' as const, speed: l.pace });
      },
    };
  })
);

/* ---------- Standing about ---------- */

/** Facing (an Idle's ry: 0 is +z, π / 2 is +x) */
const [EAST, WEST, SOUTH, NORTH] = [Math.PI / 2, -Math.PI / 2, 0, Math.PI];
const idle = (x: number, z: number, ry: number, act: Idle['act'] = 'look'): Idle => ({ x, z, ry, act, y: SLAB_Y });
export const FAR_IDLE: Idle[] = (() => {
  const out: Idle[] = [];
  // Two neighbours chatting over the first bungalow's front wall: one in its garden, one on the sidewalk outside
  const [a, , c] = BUNGALOWS;
  const za = a.doorZ + (a.bin[1] > a.doorZ ? -1.6 : 1.6);
  out.push(idle(a.lot[2] - FRONT_WALL.t - 0.4, za, EAST, 'chat'), idle(a.lot[2] + 0.45, za, WEST, 'chat'));
  // Someone at another's gate, on the phone, looking down the lane
  out.push(idle(c.lot[2] + 0.4, c.doorZ, c.doorZ < (LANE_Z[0] + LANE_Z[1]) / 2 ? SOUTH : NORTH, 'phone'));
  // At their plots: stood over a bed, or looking it over from the path
  const worked = PLOTS.filter((p) => p.beds.some((b) => b.crop));
  const at: [number, Idle['act']][] = [
    [1, 'wait'],
    [Math.floor(worked.length / 2), 'look'],
    [worked.length - 2, 'wait'],
  ];
  for (const [k, act] of at) {
    const p = worked[k];
    const bed = p.beds.find((b) => b.crop)!.rect;
    const east = p.rect[0] > ALLOTMENT.mid;
    // (standing in the gap between two beds' strips' ends and the path: on the plot's edge by the middle path)
    out.push(idle(east ? p.rect[0] - 0.15 : p.rect[2] + 0.15, (bed[1] + bed[3]) / 2, east ? EAST : WEST, act));
  }
  // One reading the phone just inside the allotments' gate opposite the compound's back gate
  out.push(idle(ALLOTMENT.rect[2] - 0.7, ALLOTMENT.gateZ + 0.9, NORTH, 'phone'));
  return out;
})();

/* ---------- At night ---------- */

/** Pools of light (x, z, size): under each gate pier's lamp on the lane's sidewalk, by the garage's lamp, at his front door */
export const FAR_POOLS: [number, number, number][] = [
  [HOME.gates.x + 0.5, HOME.gates.z0 - PIER.w / 2, 2.2],
  [HOME.gates.x + 0.5, HOME.gates.z1 + PIER.w / 2, 2.2],
  [HOME.garage[2] + 0.9, (HOME.carDoor.z1 + HOME.bikeDoor.z0) / 2, 2.6],
  [HOME.door[0], HOME.door[1] - 0.6, 1.8],
];
