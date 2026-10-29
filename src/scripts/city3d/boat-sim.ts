/*
 * Boating yourself (river plan step 4c, the owner's pick): the rules, DOM-free
 * like drive-sim.ts, tested in tests/boat.test.ts. A small motor boat for
 * hire, moored along the quay east of Downtown's landing (`HIRE` in
 * riverbus.ts), driven anywhere on the river between the ring highway's
 * bridges (their decks are too low to pass under), and left at any river bus
 * landing (or back at its mooring), when it goes home.
 *
 * - **Handling:** arcade. Thrust eases it up to `TUNE.top` (a gentle astern
 *   below), the water slows it when you let go; the rudder turns it harder
 *   the faster it goes (a little at a standstill, the outboard swung); it
 *   slides through its turns, the sideways speed dying away (`TUNE.slip`).
 * - **Collisions:** soft and safe. The hull is three circles along its
 *   length (`circles()`); each is pushed out of the banks (river.ts
 *   `edgesAt()`), the world's ends, everything standing in the water
 *   (`WATER_SOLIDS`: the bridges' piers and towers, the decks, the landings,
 *   the marina, what's moored, and the bridges' spans too low to pass under)
 *   and every other boat (`moversAt()`, and the lane boats the view passes
 *   in), losing the speed it had into them; nothing is ever damaged.
 *
 * x east, z south; world tiles (1 = about 1.8 m). A heading (`yaw`) is 0 with
 * the bow to +x, as every boat's.
 */
import { EXT, RIVER } from './layout';
import { WATER_Y, edgesAt } from './river';
import { BX, DECK_DEPTH, DECK_HALF, LIBERTY_RECTS, SHIP, lowY, shipAt } from './liberty';
import { DEPTH as HARBOUR_DEPTH, HALF as HARBOUR_HALF, HX, TOWER, TOWERS, deckY } from './harbour';
import { BARGE, BRIDGE_PIERS, DECKS, PIER_HALF } from './waterfront';
import { ESPLANADE_DECKS, OVERLOOKS, PONTOON } from './boulevard';
import { YACHTS } from './boulevarddress';
import { JETTIES } from './outer';
import { MOORED } from './boats';
import { riverBridges } from './streetplan';
import { BUS, HIRE, STOPS, type Hull, type Stop } from './riverbus';
import { BUSES, BUS_VIEW, busAt } from './riverroute';
import { riverMovers } from './riverlife';

export type Rect = [number, number, number, number];

/** The hire boat: a small runabout (its top is the driver's head) */
export const BOAT: Hull = { len: 2.6, beam: 1.1, top: 1.0 };
/** Its handling: top speed and astern (tiles/s), thrust, the water's drag, the rudder (rad/s) and its pick-up, the slide's decay */
export const TUNE = { top: 6.5, astern: 2, thrust: 2.2, drag: 0.45, turn: 1.15, idleTurn: 0.4, rudder: 5, slip: 2.4 };

export interface BoatState {
  x: number;
  z: number;
  yaw: number;
  /** Its speed over the water (x, z) and how fast it's turning (rad/s, left positive) */
  vx: number;
  vz: number;
  r: number;
  /** The throttle as it stands (it eases), for the engine's voice and the bow's lift */
  power: number;
}
export interface BoatInput {
  /** -1 astern .. 1 ahead */
  throttle: number;
  /** -1 left .. 1 right */
  steer: number;
}
/** A round thing on the water to keep off (another boat's hull, as circles) */
export interface Circle {
  x: number;
  z: number;
  r: number;
}

/** Is the hire boat out (boat.ts draws it; riverlife3d.ts hides the one at the mooring) */
export const HIRE_VIEW = { out: false };
/** A boat lying at its mooring */
export const newBoat = (at: { x: number; z: number; yaw: number } = HIRE): BoatState => ({ x: at.x, z: at.z, yaw: at.yaw, vx: 0, vz: 0, r: 0, power: 0 });
export const speedOf = (s: BoatState) => Math.hypot(s.vx, s.vz);
/** Its speed along its heading (negative astern) */
export const aheadOf = (s: BoatState) => s.vx * Math.cos(s.yaw) - s.vz * Math.sin(s.yaw);

/** The hull's three circles along its length */
export function circles(x: number, z: number, yaw: number, h: Hull = BOAT): Circle[] {
  const r = h.beam / 2;
  const u = h.len / 2 - r;
  const [c, sn] = [Math.cos(yaw), -Math.sin(yaw)];
  return [-u, 0, u].map((k) => ({ x: x + c * k, z: z + sn * k, r }));
}

/* ---------- What stands in the water ---------- */

/** How much room the boat needs under a span (over its top) */
const HEADROOM = 0.15;
/** A span's underside from `under(z)`, as rects across x0..x1 wherever it's too low for the boat (sampled every half tile) */
function lowSpans(x0: number, x1: number, under: (z: number) => number): Rect[] {
  const out: Rect[] = [];
  let from: number | null = null;
  const step = 0.5;
  for (let z = RIVER[0]; z <= RIVER[1] + 1e-6; z += step) {
    const low = under(z) < WATER_Y + BOAT.top + HEADROOM;
    if (low && from === null) from = z;
    if ((!low || z + step > RIVER[1]) && from !== null) {
      out.push([x0, from - step, x1, low ? RIVER[1] : z]);
      from = null;
    }
  }
  return out;
}
/** Everything standing in (or too low over) the water the boat keeps off */
export const WATER_SOLIDS: Rect[] = [
  // Liberty Bridge's towers' piers and its abutments, and its approaches where they're too low over the water
  ...LIBERTY_RECTS.slice(1).map((r) => [...r] as Rect),
  ...lowSpans(BX - DECK_HALF, BX + DECK_HALF, (z) => lowY(z) - DECK_DEPTH),
  // Harbour Bridge's towers' piers (with their cutwaters), and its deck near the banks
  ...TOWERS.map((z): Rect => [HX - TOWER.base.hu - TOWER.base.cut, z - TOWER.base.hz, HX + TOWER.base.hu + TOWER.base.cut, z + TOWER.base.hz]),
  ...lowSpans(HX - HARBOUR_HALF, HX + HARBOUR_HALF, (z) => deckY(z) - HARBOUR_DEPTH),
  // The ring highway's bridges: their decks are too low all the way across (and their piers)
  ...riverBridges()
    .filter((b) => b.street === 'highway')
    .map((b): Rect => [b.x0, RIVER[0], b.x1, RIVER[1]]),
  ...riverBridges()
    .filter((b) => b.street === 'highway')
    .flatMap((b) => BRIDGE_PIERS.map((z): Rect => [b.x0, z - PIER_HALF, b.x1, z + PIER_HALF])),
  // The decks over the water: the boardwalk, Pier 7, the market's; the esplanade, its overlooks and the marina
  ...DECKS.map((r) => [...r] as Rect),
  ...ESPLANADE_DECKS.map((r) => [...r] as Rect),
  ...OVERLOOKS.map((o) => [...o.rect] as Rect),
  [...PONTOON] as Rect,
  ...YACHTS.map((y): Rect => [y.x - y.len / 2, y.z - y.beam / 2, y.x + y.len / 2, y.z + y.beam / 2]),
  [...BARGE] as Rect,
  ...MOORED.map((m): Rect => [m.x - 0.8, m.z - 0.35, m.x + 0.8, m.z + 0.35]),
  ...JETTIES.map((j): Rect => [j.x - 1.1, j.bank === 'north' ? RIVER[0] - 0.1 : RIVER[1] - 0.75, j.x + 1.1, j.bank === 'north' ? RIVER[0] + 0.75 : RIVER[1] + 0.1]),
  // The river bus's landings
  ...STOPS.map((s) => [...s.landing] as Rect),
];

/** The other boats about (but the lane boats: the view has those) as circles at time t, near x, z */
export function moversAt(t: number, x: number, z: number, reach = 30): Circle[] {
  const out: Circle[] = [];
  const add = (p: { x: number; z: number; yaw: number }, h: { len: number; beam: number }) => {
    if (Math.abs(p.x - x) > reach + h.len || Math.abs(p.z - z) > reach + h.len) return;
    // (circles along it, overlapping, one every beam)
    const n = Math.max(1, Math.ceil(h.len / h.beam));
    const [c, s] = [Math.cos(p.yaw), -Math.sin(p.yaw)];
    for (let i = 0; i < n; i++) {
      const k = -h.len / 2 + h.beam / 2 + ((h.len - h.beam) * i) / Math.max(1, n - 1);
      out.push({ x: p.x + c * k, z: p.z + s * k, r: h.beam / 2 });
    }
  };
  for (const m of riverMovers(t)) add(m, m.hull);
  for (let i = 0; i < BUSES; i++) add(i === 0 && BUS_VIEW.ride ? BUS_VIEW.ride : busAt(i, t + BUS_VIEW.offset), BUS.hull);
  // The tall ship and its bowsprit
  const ship = shipAt(t);
  add({ ...ship, x: ship.x + Math.cos(ship.yaw) * 0.8, z: ship.z - Math.sin(ship.yaw) * 0.8 }, { len: SHIP.len + 1.6, beam: SHIP.beam });
  return out;
}

/* ---------- A step ---------- */

const PUSH = 0.03;
/** Push one circle out of the banks, the world's ends and the rects; returns the push (x, z) */
function pushOut(c: Circle, solids: readonly Rect[], others: readonly Circle[]): [number, number] {
  let [px, pz] = [0, 0];
  const [n, s] = edgesAt(c.x);
  if (c.z - c.r < n + PUSH) pz += n + PUSH - (c.z - c.r);
  if (c.z + c.r > s - PUSH) pz -= c.z + c.r - (s - PUSH);
  if (c.x - c.r < EXT[0] + 1) px += EXT[0] + 1 - (c.x - c.r);
  if (c.x + c.r > EXT[1] - 1) px -= c.x + c.r - (EXT[1] - 1);
  const x = c.x + px;
  const z = c.z + pz;
  for (const r of solids) {
    if (x < r[0] - c.r || x > r[2] + c.r || z < r[1] - c.r || z > r[3] + c.r) continue;
    const qx = Math.min(Math.max(x, r[0]), r[2]);
    const qz = Math.min(Math.max(z, r[1]), r[3]);
    const dx = x - qx;
    const dz = z - qz;
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) {
      if (d < c.r) {
        px += (dx / d) * (c.r - d);
        pz += (dz / d) * (c.r - d);
      }
    } else {
      // (its middle inside: out the nearest side)
      const outs: [number, number, number][] = [
        [x - r[0] + c.r, -1, 0],
        [r[2] - x + c.r, 1, 0],
        [z - r[1] + c.r, 0, -1],
        [r[3] - z + c.r, 0, 1],
      ];
      const [dd, ux, uz] = outs.reduce((a, b) => (b[0] < a[0] ? b : a));
      px += ux * dd;
      pz += uz * dd;
    }
  }
  for (const o of others) {
    const dx = x - o.x;
    const dz = z - o.z;
    const d = Math.hypot(dx, dz);
    if (d < c.r + o.r && d > 1e-6) {
      px += (dx / d) * (c.r + o.r - d);
      pz += (dz / d) * (c.r + o.r - d);
    }
  }
  return [px, pz];
}

/**
 * One step of the boat (dt at most a 30th of a second; longer frames are cut up): thrust, rudder, the slide, then
 * pushed clear of everything. Returns the hardest knock (the speed lost into whatever it met)
 */
export function stepBoat(s: BoatState, inp: BoatInput, dt: number, solids: readonly Rect[] = WATER_SOLIDS, others: readonly Circle[] = []): number {
  let knock = 0;
  const n = Math.max(1, Math.ceil(dt / (1 / 30)));
  const h = dt / n;
  for (let i = 0; i < n; i++) knock = Math.max(knock, step(s, inp, h, solids, others));
  return knock;
}
function step(s: BoatState, inp: BoatInput, dt: number, solids: readonly Rect[], others: readonly Circle[]) {
  const T = TUNE;
  const throttle = Math.max(-1, Math.min(1, inp.throttle));
  const steer = Math.max(-1, Math.min(1, inp.steer));
  s.power += (throttle - s.power) * Math.min(1, dt * 3);
  // Along the heading and across it
  const [fx, fz] = [Math.cos(s.yaw), -Math.sin(s.yaw)];
  let u = s.vx * fx + s.vz * fz;
  let w = s.vx * -fz + s.vz * fx;
  // Thrust towards the speed the throttle asks for (ahead or astern); past it (or with the throttle off) the water's
  // drag slows it, and astern thrust brakes it harder
  const want = s.power >= 0 ? s.power * T.top : s.power * T.astern;
  const push = T.thrust * Math.abs(s.power);
  const drag = T.drag * Math.abs(u);
  if (u < want) u = Math.min(want, u + (push + (u < 0 ? drag : 0)) * dt);
  else if (u > want) u = Math.max(want, u - (drag + (s.power < -0.05 ? push * 1.4 : 0)) * dt);
  w -= w * T.slip * dt;
  // The rudder: harder the faster it goes through the water (reversed astern), a little at a standstill
  const bite = Math.min(1, Math.abs(u) / 2.5);
  const rate = -steer * (T.idleTurn + (T.turn - T.idleTurn) * bite) * (u < -0.2 ? -1 : 1);
  s.r += (rate - s.r) * Math.min(1, dt * T.rudder);
  // Back to the water's frame; the hull turns under it, so what it carried on with is a slide across the new heading
  // (dying away next step)
  s.vx = u * fx + w * -fz;
  s.vz = u * fz + w * fx;
  s.yaw += s.r * dt;
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  // Pushed clear, a few times over (a push out of one thing can push it into another)
  let knock = 0;
  for (let k = 0; k < 3; k++) {
    let moved = false;
    for (const c of circles(s.x, s.z, s.yaw)) {
      const [px, pz] = pushOut(c, solids, others);
      const d = Math.hypot(px, pz);
      if (d < 1e-5) continue;
      moved = true;
      s.x += px;
      s.z += pz;
      // The speed it had into it is lost (a little bounce), and the turn eases
      const [nx, nz] = [px / d, pz / d];
      const vn = s.vx * nx + s.vz * nz;
      if (vn < 0) {
        s.vx -= nx * vn * 1.2;
        s.vz -= nz * vn * 1.2;
        knock = Math.max(knock, -vn);
        s.r *= 0.6;
      }
    }
    if (!moved) break;
  }
  return knock;
}

/* ---------- Getting out ---------- */

/** How slow it must be to step off, and how near a landing's side (or the mooring) */
export const LEAVE = { speed: 1.2, reach: 1.7 };
/** Where you can step off here: the landing whose side it lies along (or its mooring, null if neither) */
export function leaveAt(s: BoatState): { stop: Stop | null; at: { x: number; z: number } } | null {
  if (speedOf(s) > LEAVE.speed) return null;
  if (Math.hypot(s.x - HIRE.x, s.z - HIRE.z) < LEAVE.reach + 0.6) return { stop: null, at: HIRE.door };
  for (const st of STOPS) {
    const edge = st.bank === 'north' ? st.landing[3] : st.landing[1];
    const off = Math.abs(s.z - edge) - BOAT.beam / 2;
    if (off < LEAVE.reach && s.x > st.landing[0] - 1 && s.x < st.landing[2] + 1) return { stop: st, at: st.arrive };
  }
  return null;
}

/* ---------- Spray and wake (vehicle plan Phase 9: boat.ts draws them) ---------- */

/** The bow throws spray from `from` of its top speed, the most at full speed */
export const SPRAY = { from: 0.45 };
/** How much spray the bow throws at `speed` (tiles/s): 0 to 1 */
export function sprayOf(speed: number) {
  const k = (Math.abs(speed) / TUNE.top - SPRAY.from) / (1 - SPRAY.from);
  return Math.max(0, Math.min(1, k));
}
/**
 * The wake at `speed`: a foam streak straight back from the stern (`len` long) and two arms spreading at the
 * Kelvin angle (about 19.5 degrees either side of the way it came: `spread`), their length and brightness by the
 * speed; nothing at a crawl
 */
export const KELVIN = Math.asin(1 / 3);
export function wakeShape(speed: number) {
  const k = Math.min(1, Math.abs(speed) / TUNE.top);
  if (k < 0.08) return { len: 0, arms: 0, spread: KELVIN, opacity: 0 };
  return { len: 1.5 + k * 5, arms: 1 + k * 6, spread: KELVIN, opacity: 0.45 * k };
}
