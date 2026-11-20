/*
 * Northgate Air Base's people (docs/military-plan.md Phase 4; DOM-free, tested in tests/airbaselife.test.ts; read by
 * airbase3d.ts, the camp's chunk, which hands them to the city's crowd: life.ts `addPeople()`). Its personnel in their
 * uniforms (crowdlook.ts `STYLES.airbase`): made up, unarmed, never a target, and they never stop or chase you.
 *
 * - `BASE_IDLE`: standing about: a sentry at each guardhouse's door, pairs chatting outside the HQ and the barracks, a
 *   queue at the mess hall, people round the motor pool's trucks, one waiting by the heliport's hut.
 * - `BASE_MOVERS`: the drill squad in a column round the parade ground, people walking round the barracks rows, and the
 *   patrols along the inside of the south fence, back and forth.
 * Every other one is left out on phones (`trim`, or the chunk's own `i % 2`).
 */
import type { Idle } from './landmarks';
import { WALK_PACE, type Moment, type ParkPerson } from './parklife';
import { loopAt, loopLen } from './civic';
import { BARRACKS, GATES, HELI_HUT, HQ, MOTOR_POOL, PARADE, SERVICES, guardhouseOf, southFenceZ } from './airbase';
import type { Rect } from './tiles';

/** The base's ground (open land: the people stand on it) */
export const BASE_Y = 0;

/** Standing about (ry: 0 faces +z, south; π/2 faces +x) */
export const BASE_IDLE: Idle[] = [
  // (a sentry inside each gate, by the guardhouse's door on its west face, facing the way in: -x)
  ...GATES.map((g): Idle => {
    const r = guardhouseOf(g);
    return { x: r[0] - 1.2, z: (r[1] + r[3]) / 2, ry: -Math.PI / 2, y: BASE_Y, act: 'wait' };
  }),
  // (outside the HQ's portico, a pair talking)
  { x: (HQ[0] + HQ[2]) / 2 - 7, z: HQ[3] + 4, ry: Math.PI / 2, y: BASE_Y, act: 'chat' },
  { x: (HQ[0] + HQ[2]) / 2 - 5.8, z: HQ[3] + 4, ry: -Math.PI / 2, y: BASE_Y, act: 'chat' },
  // (outside a block of each row, a pair talking)
  ...[0, 5, 10].flatMap((i): Idle[] => {
    const b = BARRACKS[i];
    const [x, z] = [(b[0] + b[2]) / 2, b[3] + 4];
    return [
      { x: x - 0.6, z, ry: Math.PI / 2, y: BASE_Y, act: 'chat' },
      { x: x + 0.6, z, ry: -Math.PI / 2, y: BASE_Y, act: 'chat' },
    ];
  }),
  // (a queue at the mess hall's door)
  ...[0, 1, 2].map((k): Idle => {
    const r = SERVICES[0].rect;
    return { x: (r[0] + r[2]) / 2 + 2.5, z: r[3] + 2 + k * 1.1, ry: Math.PI, y: BASE_Y, act: 'queue' };
  }),
  // (round the motor pool's trucks)
  ...[0, 2, 4].map((k): Idle => ({ x: MOTOR_POOL[0] + 10 + k * 11 + 2.4, z: MOTOR_POOL[1] + 31, ry: -Math.PI / 2, y: BASE_Y, act: 'look' })),
  // (by the heliport's hut)
  { x: (HELI_HUT[0] + HELI_HUT[2]) / 2, z: HELI_HUT[3] + 3, ry: Math.PI, y: BASE_Y, act: 'wait' },
];

/** The drill squad's loop round the parade ground (in from its edge), how many, how far apart, their pace */
export const DRILL_LOOP: Rect = [PARADE[0] + 6, PARADE[1] + 6, PARADE[2] - 6, PARADE[3] - 6];
export const DRILL = { n: 8, gap: 1.6, pace: WALK_PACE * 1.15 };
/** The loops round the barracks rows (3 out from them), and the patrols' beats along the south fence (8 inside it) */
export const ROW_LOOPS: Rect[] = [0, 4, 8].map((i): Rect => [BARRACKS[i][0] - 3, BARRACKS[i][1] - 3, BARRACKS[i + 3][2] + 3, BARRACKS[i][3] + 3]);
export const PATROL_IN = 8;
export const BEATS: [number, number][] = [
  [-200, -60],
  [85, 200],
];

/** A beat's point: back and forth from x0 to x1 along the fence, `PATROL_IN` inside it (and which way they face) */
export function beatAt([x0, x1]: [number, number], d: number): { x: number; z: number; ry: number } {
  const len = x1 - x0;
  const u = ((d % (2 * len)) + 2 * len) % (2 * len);
  const out = u < len;
  const x = out ? x0 + u : x1 - (u - len);
  const z = southFenceZ(x) - PATROL_IN;
  // (along the fence: +x out, -x back; ry 0 faces +z, π/2 +x)
  return { x, z, ry: out ? Math.PI / 2 : -Math.PI / 2 };
}

const walker = (id: string, trim: boolean, at: (t: number) => { x: number; z: number; ry: number }, pace: number): ParkPerson => ({
  id,
  trim,
  at(t: number, out: Moment) {
    const p = at(t);
    return Object.assign(out, { x: p.x, z: p.z, ry: p.ry, y: BASE_Y, clip: 'walk', speed: pace });
  },
});

export const BASE_MOVERS: ParkPerson[] = [
  // The drill squad: a column round the parade ground
  ...Array.from({ length: DRILL.n }, (_, k) => walker(`airbase-drill-${k}`, k % 2 === 1, (t) => loopAt(DRILL_LOOP, t * DRILL.pace - k * DRILL.gap, 1), DRILL.pace)),
  // Round the barracks rows, a couple each
  ...ROW_LOOPS.flatMap((r, i) => [0, 1].map((k) => walker(`airbase-row-${i}-${k}`, k === 1, (t) => loopAt(r, t * WALK_PACE + (loopLen(r) * k) / 2 + i * 11, k ? -1 : 1), WALK_PACE))),
  // The patrols: two on each beat, side by side
  ...BEATS.flatMap((b, i) =>
    [0, 1].map((k) =>
      walker(
        `airbase-patrol-${i}-${k}`,
        k === 1,
        (t) => {
          const p = beatAt(b, t * WALK_PACE + i * 37);
          return { ...p, z: p.z - k * 1.1 };
        },
        WALK_PACE
      )
    )
  ),
];
