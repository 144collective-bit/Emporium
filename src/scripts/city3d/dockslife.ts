/*
 * Southbank Docks' life (docs/docks-plan.md Phase 4, the owner's picks: the cranes' full cycle, the rest of the port
 * quiet). DOM-free, tested in tests/dockslife.test.ts; everything a function of the clock, the same for everyone, and
 * standing still under reduced motion (dockslife3d.ts draws it at `STILL`).
 *
 * - **The working crane** (the middle one, `CRANES[1]`: the north one's boom stands raised, the south one stands over
 *   the ship's bridge) works a box off ORCA STAR and back on again, `CYCLE` seconds round: its trolley over the
 *   ship, the spreader down onto the box on top of a stack on deck, up, across to the quay between the crane's legs,
 *   down; a straddle carrier (the one parked north of it, `STRADDLES[0]`) comes, lifts it, and takes it along the
 *   quay and into the stacks' lane to a slot there; then the same the other way: the carrier brings it back, the
 *   crane lifts it onto the ship. Nothing appears or vanishes: one box goes round. `craneAt()`, `carrierAt()`,
 *   `boxAt()`.
 * - **A truck now and then** (`TRUCK_EVERY`): a Box Runner down West Road, in through the gate, round in the gate's
 *   lane, a while there, and out again (`truckAt()`; null while it's away).
 * - **The pilot boat** out round the basin now and then and back to its berth, backing the last of the way in
 *   (`pilotAt()`); the tugs stay moored.
 * - **A few dock workers** standing about (`DOCK_PEOPLE`, the crowd's spare slots; the Docks dress them in hi-vis,
 *   crowdlook.ts).
 */
import { BOX, CRANE, CRANES, LAND_RAIL, S, SEA_RAIL, SHIP, SHIP_STACKS, STRADDLES, TUGS, type Stack } from './docksport';
import { BASIN, GATE_Z, WEST_X } from './docks';
import type { Idle } from './landmarks';

type Pt = [number, number];

/** How long the crane's cycle takes (unloading the box, then loading it back), seconds */
export const CYCLE = 120;
/** The moment shown under reduced motion: the box on its way across under the crane */
export const STILL = 19;

/** The working crane and where along the rail it stands */
export const WORK = CRANES[1];
const CZ = WORK.z;
/** The ship's stack the box comes off and goes back on (the middle row of the bay under the crane) */
export const PICK: Stack = (() => {
  const under = SHIP_STACKS.filter((k) => k.rect[1] <= CZ && k.rect[3] >= CZ);
  return under[Math.floor(under.length / 2)];
})();
/** Over the ship (x) and the box's bottom when it sits on top of that stack */
export const SHIP_X = (PICK.rect[0] + PICK.rect[2]) / 2;
export const SHIP_Y = SHIP.deck + 0.3 + PICK.tiers.length * BOX.H;
/** Where it's set down on the quay (between the crane's legs, midway between its rails) */
export const QUAY_X = (SEA_RAIL + LAND_RAIL) / 2;
/** The spreader's height (its underside: the box's top) when the trolley travels */
export const TRAVEL = CRANE.girder - 3;

/**
 * The carrier's parking spot (`STRADDLES[0]`, north of the crane), the line it runs along the quay and into the
 * stacks' lane (the gate's lanes' middle, a little north: clear of the cranes' land legs either side, the north
 * crane's and the working one's), and the slot in the lane it sets the box down in
 */
export const PARK: Pt = [QUAY_X, STRADDLES[0][1]];
export const LANE_Z = GATE_Z - 2;
export const SLOT: Pt = [-364.4, LANE_Z];
/** How high the carrier carries a box (its underside over the quay) */
export const CARRY = S + 0.9;

/* ---------- Keyframes ---------- */

/** Ease in and out between two keys */
const ease = (k: number) => k * k * (3 - 2 * k);
/** A value from keys [t, ...values] at t (each pair eased); the keys run from 0 to `CYCLE` */
function keyed(keys: number[][], t: number): number[] {
  const u = ((t % CYCLE) + CYCLE) % CYCLE;
  for (let i = 1; i < keys.length; i++) {
    const [a, b] = [keys[i - 1], keys[i]];
    if (u <= b[0]) {
      const k = b[0] > a[0] ? ease((u - a[0]) / (b[0] - a[0])) : 1;
      return a.slice(1).map((v, j) => v + (b[j + 1] - v) * k);
    }
  }
  return keys[keys.length - 1].slice(1);
}

/** The crane: its trolley (x) and the spreader's underside (y), unloading then loading */
const CRANE_KEYS: number[][] = [
  [0, SHIP_X, TRAVEL],
  [6, SHIP_X, SHIP_Y + BOX.H],
  [8, SHIP_X, SHIP_Y + BOX.H],
  [14, SHIP_X, TRAVEL],
  [24, QUAY_X, TRAVEL],
  [30, QUAY_X, S + BOX.H],
  [32, QUAY_X, S + BOX.H],
  [37, QUAY_X, TRAVEL],
  [47, SHIP_X, TRAVEL],
  [62, SHIP_X, TRAVEL],
  [74, QUAY_X, TRAVEL],
  [86, QUAY_X, TRAVEL],
  [92, QUAY_X, S + BOX.H],
  [94, QUAY_X, S + BOX.H],
  [100, QUAY_X, TRAVEL],
  [110, SHIP_X, TRAVEL],
  [115, SHIP_X, SHIP_Y + BOX.H],
  [116, SHIP_X, SHIP_Y + BOX.H],
  [120, SHIP_X, TRAVEL],
];
/** The crane at t: its trolley's x and the spreader's underside */
export function craneAt(t: number) {
  const [trolley, spreader] = keyed(CRANE_KEYS, t);
  return { trolley, spreader };
}

/**
 * The carrier: x, z, its heading (yaw: its length along local x, turned by yaw about y, x east and z south: -PI/2
 * faces +z, PI faces -x) and how high it holds a box (its underside), unloading then loading
 */
const FACE_S = -Math.PI / 2;
const FACE_W = -Math.PI;
const CARRIER_KEYS: number[][] = [
  [0, PARK[0], PARK[1], FACE_S, S],
  [32, PARK[0], PARK[1], FACE_S, S],
  [38, QUAY_X, CZ, FACE_S, S],
  [40, QUAY_X, CZ, FACE_S, CARRY],
  [46, QUAY_X, LANE_Z, FACE_S, CARRY],
  [48, QUAY_X, LANE_Z, FACE_W, CARRY],
  [56, SLOT[0], SLOT[1], FACE_W, CARRY],
  [58, SLOT[0], SLOT[1], FACE_W, S],
  [60, SLOT[0], SLOT[1], FACE_W, S],
  [62, SLOT[0], SLOT[1], FACE_W, CARRY],
  [70, QUAY_X, LANE_Z, FACE_W, CARRY],
  [72, QUAY_X, LANE_Z, FACE_S, CARRY],
  [78, QUAY_X, CZ, FACE_S, CARRY],
  [80, QUAY_X, CZ, FACE_S, S],
  [86, PARK[0], PARK[1], FACE_S, S],
  [120, PARK[0], PARK[1], FACE_S, S],
];
export function carrierAt(t: number) {
  const [x, z, yaw, lift] = keyed(CARRIER_KEYS, t);
  return { x, z, yaw, lift };
}

/** Who has the box when (seconds into the cycle) */
type Holder = 'ship' | 'crane' | 'quay' | 'carrier' | 'slot';
const HOLDERS: [number, Holder][] = [
  [8, 'ship'],
  [32, 'crane'],
  [38, 'quay'],
  [58, 'carrier'],
  [60, 'slot'],
  [80, 'carrier'],
  [94, 'quay'],
  [116, 'crane'],
  [120, 'ship'],
];
/**
 * The box at t: its middle (x, z), its underside (y), which way it lies (yaw, as the carrier's: 0 along x) and who has
 * it. On the ship, the crane and the quay it lies along z, as the ship's boxes do
 */
export function boxAt(t: number): { x: number; z: number; y: number; yaw: number; holder: Holder } {
  const u = ((t % CYCLE) + CYCLE) % CYCLE;
  const holder = HOLDERS.find(([until]) => u < until)?.[1] ?? 'ship';
  const along = FACE_S;
  switch (holder) {
    case 'ship':
      return { x: SHIP_X, z: CZ, y: SHIP_Y, yaw: along, holder };
    case 'crane': {
      const c = craneAt(t);
      return { x: c.trolley, z: CZ, y: c.spreader - BOX.H, yaw: along, holder };
    }
    case 'quay':
      return { x: QUAY_X, z: CZ, y: S, yaw: along, holder };
    case 'slot':
      return { x: SLOT[0], z: SLOT[1], y: S, yaw: FACE_W, holder };
    default: {
      const c = carrierAt(t);
      return { x: c.x, z: c.z, y: c.lift, yaw: c.yaw, holder };
    }
  }
}

/* ---------- A truck now and then ---------- */

/** How often a truck comes, how fast it drives, how long it stands in the lane */
export const TRUCK_EVERY = 150;
export const TRUCK_SPEED = 4;
export const TRUCK_WAIT = 18;
/** Its lanes: in on the lane's south side (drive on the right), out on its north side; West Road's lanes either side */
const IN_Z = GATE_Z + 2.5;
const OUT_Z = GATE_Z - 2.5;
/** Where it turns round in the lane (the turn's middle, x) */
export const TURN_X = -381;
const arc = (cx: number, cz: number, r: number, a0: number, a1: number, n = 10): Pt[] => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos(a0 + ((a1 - a0) * i) / n), cz + r * Math.sin(a0 + ((a1 - a0) * i) / n)]);
/** In: down West Road (south, on its west side) and left in through the gate, to where it turns round */
export const TRUCK_IN: Pt[] = [[WEST_X - 0.85, 140], [WEST_X - 0.85, IN_Z - 4.2], ...arc(WEST_X + 3.35, IN_Z - 4.2, 4.2, Math.PI, Math.PI / 2, 6).slice(1), [TURN_X, IN_Z]];
/** Round (a half circle in the lane), then out: back to the gate and right up West Road (north, on its east side) */
export const TRUCK_ROUND: Pt[] = arc(TURN_X, GATE_Z, 2.5, Math.PI / 2, -Math.PI / 2, 12);
export const TRUCK_OUT: Pt[] = [[TURN_X, OUT_Z], ...arc(WEST_X + 4, OUT_Z - 3.15, 3.15, Math.PI / 2, Math.PI, 6).slice(1), [WEST_X + 0.85, 140]];
const lengthOf = (pts: Pt[]) => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
function along(pts: Pt[], d: number): { x: number; z: number; yaw: number } {
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= l || i === pts.length - 1) {
      const k = Math.min(1, Math.max(0, d / Math.max(l, 1e-9)));
      return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, yaw: Math.atan2(-(b[1] - a[1]), b[0] - a[0]) };
    }
    d -= l;
  }
  const p = pts[pts.length - 1];
  return { x: p[0], z: p[1], yaw: 0 };
}
const TIN = lengthOf(TRUCK_IN) / TRUCK_SPEED;
const TROUND = lengthOf(TRUCK_ROUND) / (TRUCK_SPEED * 0.5);
const TOUT = lengthOf(TRUCK_OUT) / TRUCK_SPEED;
/** How long a visit takes, start to end */
export const TRUCK_VISIT = TIN + TRUCK_WAIT + TROUND + TOUT;
/** The truck at t (x, z; yaw as a car's: +x its front, turned about y), or null while it's away */
export function truckAt(t: number): { x: number; z: number; yaw: number } | null {
  const u = ((t % TRUCK_EVERY) + TRUCK_EVERY) % TRUCK_EVERY;
  if (u < TIN) return along(TRUCK_IN, u * TRUCK_SPEED);
  if (u < TIN + TRUCK_WAIT) return along(TRUCK_IN, lengthOf(TRUCK_IN));
  if (u < TIN + TRUCK_WAIT + TROUND) return along(TRUCK_ROUND, (u - TIN - TRUCK_WAIT) * TRUCK_SPEED * 0.5);
  if (u < TRUCK_VISIT) return along(TRUCK_OUT, (u - TIN - TRUCK_WAIT - TROUND) * TRUCK_SPEED);
  return null;
}

/* ---------- The pilot boat ---------- */

/** The pilot boat's berth (its middle, bow north) */
export const PILOT = TUGS.find((t) => t.kind === 'pilot')!;
/** How often it goes out, how fast, and how slowly it backs out of its berth */
export const PILOT_EVERY = 240;
export const PILOT_SPEED = 3;
export const PILOT_BACK = 1.2;
/** How far south it backs out (bow still north) before it sets off */
const BACK_TO = PILOT.z + 11.4;
/**
 * Its trip (after backing out): forward north a little, round to the west and south through the basin's east half
 * (clear of the ship, the tugs and the walls), back east and up into its berth bow first
 */
export const PILOT_LOOP: Pt[] = [
  [PILOT.x, BACK_TO],
  // (easing off the east wall before it turns: its stern swings out towards it)
  [PILOT.x - 0.6, BACK_TO - 4],
  [-278.5, BACK_TO - 8],
  [-282, 168],
  [-288, 167.5],
  [-296, 170],
  [-306, 175],
  [-314, 182],
  [-312, 190],
  [-298, 194],
  [-285, 192],
  [-278.4, 186],
  [PILOT.x, 180],
  [PILOT.x, PILOT.z],
];
const BACK_T = (BACK_TO - PILOT.z) / PILOT_BACK;
const LOOP_T = lengthOf(PILOT_LOOP) / PILOT_SPEED;
/** The pilot boat at t: its middle, and its heading (yaw: 0 bow north, turning to the west positive: a model built bow to -z turned by it) */
export function pilotAt(t: number): { x: number; z: number; yaw: number } {
  const u = ((t % PILOT_EVERY) + PILOT_EVERY) % PILOT_EVERY;
  if (u < BACK_T) return { x: PILOT.x, z: PILOT.z + u * PILOT_BACK, yaw: 0 };
  if (u < BACK_T + LOOP_T) {
    const p = along(PILOT_LOOP, (u - BACK_T) * PILOT_SPEED);
    // (along()'s yaw is a car's, 0 along +x: a bow at -z faces that way turned by it less a quarter)
    return { x: p.x, z: p.z, yaw: p.yaw - Math.PI / 2 };
  }
  return { x: PILOT.x, z: PILOT.z, yaw: 0 };
}
/** How long a trip out takes */
export const PILOT_TRIP = BACK_T + LOOP_T;

/* ---------- The dock workers ---------- */

/** A few people at work about the port (the crowd's: life.ts `addPeople()`), facing what they're watching (ry: 0 is +z, PI / 2 is +x) */
export const DOCK_PEOPLE: Idle[] = [
  // By the working crane, on the apron at the sea rail, watching it
  { x: SEA_RAIL + 1, z: CZ - 7.5, y: S, ry: Math.PI, act: 'look' },
  // The gate's man by the booth, between the lanes
  { x: -388.2, z: GATE_Z, y: S, ry: -Math.PI / 2, act: 'guard' },
  // Two by the tugs on the east quay, talking
  { x: BASIN[2] + 1.4, z: 155.4, y: S, ry: Math.PI, act: 'chat' },
  { x: BASIN[2] + 1.4, z: 156.6, y: S, ry: 0, act: 'chat' },
  // One by the land rail at the stacks' corner, checking his phone
  { x: -357.3, z: 171.6, y: S, ry: Math.PI / 2, act: 'phone' },
];
