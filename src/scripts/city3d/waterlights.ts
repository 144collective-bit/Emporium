/*
 * The lights in the water (docs/water-plan.md, step 2): which lights show in
 * the river and the lake, and where they are. DOM-free, tested in
 * tests/waterlights.test.ts; drawn by reflections.ts.
 *
 * - **The fixed lights:** the street lamps near the water (world.ts
 *   `lampLights()`, from the lamps the boot places), the bridges' lanterns
 *   (each bridge's drawing hands them over with `addWaterLights()`, since it
 *   works them out as it draws), and the lights the data already knows
 *   (`landmarkLights()`): Club PULSE's fins and its pylon, the Night Market's
 *   stalls and poles, Pier 7's kiosk, the Sky Wheel's rim, Uptown's towers'
 *   crowns and warning lights, the moored boats' lamps.
 * - **The moving lights:** the boats' lamps, each drawing's own
 *   (`setMovingLights()`: the traffic's boats in life.ts, the river's own in
 *   riverlife3d.ts, the tall ship in libertybridge.ts), only while it's drawing
 *   them, so a light never shows under a boat that isn't there.
 * - **What reflects** (`waterUnder()`): a light near enough to the water for its
 *   reflection to land on it (further back the higher it is), with the water's
 *   height under it (the river's, or the lake's on the lawn).
 */
import { EXT } from './layout';
import { WATER_Y, edgesAt } from './river';
import { LAKE_C, lakeR } from './westlake';
import { CLUB } from './avenue';
import { POLES, STALLS } from './nightmarket';
import { DECK_Y, KIOSK } from './waterfront';
import { WHEEL } from './wheel';
import { HIGHRISES } from './highrise';
import { MOORED } from './boats';
import { LAKE_Y } from './riverwater';

/** A light: where it is, its colour (0xrrggbb) and how wide its reflection is */
export interface WaterLight {
  x: number;
  y: number;
  z: number;
  color: number;
  size: number;
}
/** A light that reflects, with the water's height under it and which water (0 the river, 1 the lake) */
export interface Reflected extends WaterLight {
  w: number;
  lake: 0 | 1;
}

/** How far back from the water a light can stand and still show in it: a little, and more the higher it is */
export const REACH = { base: 3, perHeight: 0.9, most: 40 };
/** The lights' colours */
export const TINT = {
  white: 0xffe2a0,
  sodium: 0xffab55,
  warm: 0xffcf7a,
  magenta: 0xff2fd0,
  cyan: 0x20e0ff,
  gold: 0xffd27a,
  red: 0xff3030,
  crown: 0xffe6b0,
};

/** How far x, z is from the river's water (0 over it), or Infinity past the world's ends */
export function fromRiver(x: number, z: number) {
  if (x < EXT[0] || x > EXT[1]) return Infinity;
  const [n, s] = edgesAt(x);
  return z < n ? n - z : z > s ? z - s : 0;
}
/** How far x, z is from the lake's water (0 over it) */
export function fromLake(x: number, z: number) {
  const dx = x - LAKE_C[0];
  const dz = z - LAKE_C[1];
  return Math.max(0, Math.hypot(dx, dz) - lakeR(Math.atan2(dz, dx)));
}

/** The water a light shows in (the nearer, if both are in reach), or null if it's too far back from both */
export function waterUnder(l: WaterLight): Reflected | null {
  const reach = (w: number) => Math.min(REACH.most, REACH.base + REACH.perHeight * Math.max(0, l.y - w));
  const r = fromRiver(l.x, l.z);
  const k = fromLake(l.x, l.z);
  if (l.y > WATER_Y && r <= reach(WATER_Y) && r <= k) return { ...l, w: WATER_Y, lake: 0 };
  if (l.y > LAKE_Y && k <= reach(LAKE_Y)) return { ...l, w: LAKE_Y, lake: 1 };
  return null;
}

/* ---------- The fixed lights ---------- */

const handed: WaterLight[] = [];
/** The lights a drawing works out as it draws (the bridges' lanterns): kept for the reflections */
export function addWaterLights(list: WaterLight[]) {
  handed.push(...list);
}
/** What the drawings have handed over */
export const handedLights = (): readonly WaterLight[] => handed;

/** The lights the data knows by the water */
export function landmarkLights(): WaterLight[] {
  const out: WaterLight[] = [];
  // Club PULSE: its neon fins up the front (magenta and cyan in turn), the PULSE pylon
  CLUB.fins.forEach((x, i) => out.push({ x, y: CLUB.h * 0.55, z: CLUB.body[1] - 0.1, color: i % 2 ? TINT.cyan : TINT.magenta, size: 0.3 }));
  out.push({ x: CLUB.blade.x, y: CLUB.blade.h * 0.6, z: CLUB.blade.z, color: TINT.magenta, size: 0.6 });
  // The Night Market: each stall's lit counter and the string lights' poles
  for (const s of STALLS) out.push({ x: (s.rect[0] + s.rect[2]) / 2, y: DECK_Y + Math.min(2.4, s.h), z: s.front, color: TINT.warm, size: 0.45 });
  for (const [x, z] of POLES) out.push({ x, y: DECK_Y + 3, z, color: TINT.warm, size: 0.3 });
  // Pier 7's kiosk
  out.push({ x: KIOSK.c[0], y: DECK_Y + KIOSK.h, z: KIOSK.c[1], color: TINT.warm, size: 0.35 });
  // The Sky Wheel's rim, lit all round (its lights in turn)
  const rim = [TINT.magenta, TINT.cyan, TINT.gold];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    out.push({ x: WHEEL.x + Math.cos(a) * WHEEL.r, y: DECK_Y + WHEEL.hub + Math.sin(a) * WHEEL.r, z: WHEEL.z, color: rim[k % 3], size: 0.3 });
  }
  // Uptown's towers: the crown's light at the roof, the red warning light at the tip
  for (const h of HIGHRISES) {
    const [x, z] = [(h.lot[0] + h.lot[2]) / 2, (h.lot[1] + h.lot[3]) / 2];
    out.push({ x, y: h.roof, z, color: TINT.crown, size: 0.7 }, { x, y: h.tip, z, color: TINT.red, size: 0.2 });
  }
  // The boats tied up at the jetties: each its cabin lamp (life.ts draws them so)
  for (const m of MOORED) out.push(boatLamp(m.x, m.z, m.yaw));
  return out;
}

/* ---------- The moving lights ---------- */

const moving = new Map<string, readonly WaterLight[]>();
/** A drawing's moving lights this frame (replacing what it said before; an empty list when it shows none) */
export function setMovingLights(owner: string, list: readonly WaterLight[]) {
  moving.set(owner, list);
}
/** Every drawing's moving lights, `into` a list it fills (at most `most`) */
export function movingLights(into: WaterLight[], most: number) {
  into.length = 0;
  for (const list of moving.values())
    for (const l of list) {
      if (into.length >= most) return into;
      into.push(l);
    }
  return into;
}
/** A point on a boat at x, z turned to yaw (0 is the bow to +x), `u` along it and `y` up */
export function onBoat(x: number, z: number, yaw: number, u: number, y: number, color: number, size: number): WaterLight {
  return { x: x + Math.cos(yaw) * u, y: WATER_Y + y, z: z - Math.sin(yaw) * u, color, size };
}
/** The traffic's boats' cabin lamp (life.ts: on the cabin's roof, a little aft) */
export const boatLamp = (x: number, z: number, yaw: number) => onBoat(x, z, yaw, -0.2, 0.64, TINT.warm, 0.2);
