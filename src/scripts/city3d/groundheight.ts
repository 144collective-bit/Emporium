/*
 * The ground under a point, for walking, driving and flying (the polish plan's Phase 10: walk.ts's `groundAt()`
 * split out along its seam; DOM-free, tested in tests/groundheight.test.ts). The city's ground is many things laid
 * over each other: the street, the blocks' slabs, the decks over the water, the bridges, the raised highway and the
 * airport's departures deck when you're up there, Liberty Bridge's two levels, the mall's two floors, Lot 9's tunnel
 * under the highway, Crestmont's hills, the open land's rolls, the verges' banks, the river's banks down to the water,
 * the garage's turntable, the park's jetty and terraces, Sector 7 Tower's sky deck, the civic quarter's steps, the kart park's circuit and its
 * grass banks. Each is a `GroundLayer` here, asked in `GROUND_LAYERS`' order with what's known so far (`GroundCtx`:
 * the base the point stands on, and whether that's open ground or a slab), and answers with a height or nothing:
 *
 * - `take`: its height is the answer (the tunnel's floor, a verge's bank, the hills, the rolls, the mall's floors, the
 *   river's banks, the turntable);
 * - `over`: its height, or the base if that's higher, is the answer (the bridges' decks, the raised highway, the
 *   departures deck, Liberty Bridge: each up on something, never under the slab it rises from);
 * - `lift`: it raises the base if it's higher and the search goes on (the jetty, the terraces, the sky deck, the
 *   circuit, the banks: things that stand on the ground and are stood on in turn).
 *
 * The order resolves the overlaps: the tunnel is asked first (down there the ground is its floor, whatever lies over
 * it), the decks before the river's banks (a deck over the water is the deck), the mall's floors before the slab
 * (`yNow` says which floor), the kart park's circuit last (its flyover over the track below). `createGroundHeight()`
 * gives `groundAt(x, z, yNow)`; `yNow` is how high Degen (or his vehicle) is now, for the layers with two levels.
 */
import { homeRoofY } from './home';
import { DECK_Y, onDeck } from './waterfront';
import { onEsplanade } from './boulevard';
import { departuresY } from './airfield';
import { circuitSurfaceAt } from './kartcircuit';
import { BANKS_AREA, bankY } from './kartfacility';
import { KART_PARK } from './kartpark';
import { footbridgeY } from './liberty';
import { swingY } from './swingbridge';
import { JETTY, onJetty, terraceY } from './westlake';
import { civicY } from './civic';
import { viaductY } from './viaground';
import { skyDeckY } from './skydeck';
import { mallFloor } from './mallinside';
import { inChannel, shoreY } from './river';
import { LOT9_PASSAGE } from './lot9';
import { underworld } from './underground';
import { heightAt, onHills } from './terrain';
import { rollsAt } from './rolls';
import { harbourY } from './harbour';
import { vergeY } from './verges';
import { onSouthGround, southLift } from './southground';
import { GARAGE_SITE } from './solids';
import { PLAN, inPoly, type Pt } from './streetplan';

/** A block's slab's height (world.ts's `SLAB`), and the street's: a hair over the asphalt */
export const SLAB = 0.15;
export const STREET = 0.035;

/** What's known when a layer is asked: the base under the point so far, and what it is */
export interface GroundCtx {
  base: number;
  /** Open ground (the street, the land): not a slab, not a deck */
  open: boolean;
  /** A block's slab */
  slab: boolean;
  /** Liberty Bridge's leaves are down (walk.ts: by the clock, always under reduced motion) */
  leavesOpen: boolean;
}
export interface GroundLayer {
  id: string;
  how: 'take' | 'over' | 'lift';
  at(x: number, z: number, yNow: number, g: GroundCtx): number | null;
}

/** Downtown's blocks, the districts and the extra lots with their sidewalks: the raised ground (a bounding box for a quick test first) */
const SLABS = PLAN.slabs.map((poly) => ({ poly, box: [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1]))] }));
const onSlab = (x: number, z: number) => SLABS.some((s) => x > s.box[0] && x < s.box[2] && z > s.box[1] && z < s.box[3] && inPoly(s.poly, [x, z] as Pt));
/** The garage's turntable's disc: stood on while getting into your car at home, its top over the forecourt */
const DISC = { ...GARAGE_SITE.turntable, top: 0.07 };
const inPark = (x: number, z: number) => x >= KART_PARK.x0 && x <= KART_PARK.x1 && z >= KART_PARK.z0 && z <= KART_PARK.z1;
const inBanks = (x: number, z: number) => x > BANKS_AREA[0] && x < BANKS_AREA[2] && z > BANKS_AREA[1] && z < BANKS_AREA[3];

/** The base: a slab, a deck over the water, or the street */
export function baseAt(x: number, z: number): { base: number; open: boolean; slab: boolean } {
  if (onSlab(x, z)) return { base: SLAB, open: false, slab: true };
  if (onDeck(x, z) || onEsplanade(x, z)) return { base: DECK_Y, open: false, slab: false };
  return { base: STREET, open: true, slab: false };
}

/** What's below street level for walking (underground.ts): Lot 9's tunnel under the highway, Endswood's subways and its well */
export const UNDER = underworld([LOT9_PASSAGE], []);

export const GROUND_LAYERS: GroundLayer[] = [
  // Degen's roof terrace, when `yNow` is up there (home.ts; the room is under it)
  { id: 'homeroof', how: 'take', at: (x, z, yNow) => homeRoofY(x, z, yNow) },
  // Below ground (underground.ts): Lot 9's tunnel under the highway and Endswood's subways and well, their ramps and
  // open floors, and a floor under a roof when `yNow` is down there
  { id: 'tunnel', how: 'take', at: (x, z, yNow) => UNDER.y(x, z, yNow) },
  // The south's rolling ground (southground.ts, docs/south-plan.md Phase 1c): its slabs, sidewalks, streets and land
  // all lifted by the ground under them, as what's drawn there is (kit.ts `Batch.build()`)
  {
    id: 'south',
    how: 'take',
    at: (x, z, _y, g) => {
      if (!onSouthGround(x, z) || (!g.slab && !g.open)) return null;
      const l = southLift(x, z);
      if (l === 0) return null;
      return (g.slab ? SLAB : STREET + Math.max(0, vergeY(x, z))) + l;
    },
  },
  // A block's edge onto open land eases down to the ground (verges.ts: the bank's slope)
  {
    id: 'verge',
    how: 'take',
    at: (x, z, _y, g) => {
      if (!g.open) return null;
      const v = vergeY(x, z);
      return v > 0 ? v + STREET : null;
    },
  },
  // Crestmont's hills (terrain.ts): open ground that rises; nothing else stands there
  { id: 'hills', how: 'take', at: (x, z, _y, g) => (g.open && onHills(x, z) ? heightAt(x, z) + STREET : null) },
  // The open land's gentle rolls outside the town (rolls.ts): exactly 0 wherever anything stands
  {
    id: 'rolls',
    how: 'take',
    at: (x, z, _y, g) => {
      if (!g.open) return null;
      const r = rollsAt(x, z);
      return r !== 0 ? r + STREET : null;
    },
  },
  // Harbour Bridge's deck, humped over the river (harbour.ts)
  { id: 'harbour', how: 'over', at: (x, z) => lift(harbourY(x, z)) },
  // The swing bridge's deck, low over the river on a ramp from each bank (swingbridge.ts)
  { id: 'swing', how: 'over', at: (x, z) => lift(swingY(x, z)) },
  // The raised highway's deck and its ramps, when `yNow` is up there: a car's, a bike's (viaground.ts)
  { id: 'viaduct', how: 'over', at: (x, z, yNow) => lift(viaductY(x, z, yNow)) },
  // The airport's departures deck and its ramps, when `yNow` is up there: the arrivals level is under it (airfield.ts)
  { id: 'departures', how: 'over', at: (x, z, yNow) => lift(departuresY(x, z, yNow)) },
  // Liberty Bridge's decks, when `yNow` is up there (liberty.ts; the leaves only while they're down)
  { id: 'liberty', how: 'over', at: (x, z, yNow, g) => footbridgeY(x, z, yNow, 0, g.leavesOpen) },
  // Inside Starlight Mall: its two floors and the escalators between them, by `yNow` (mallinside.ts)
  { id: 'mall', how: 'take', at: (x, z, yNow) => mallFloor(x, z, yNow) },
  // The river's banks sloping down to the water (river plan step 2)
  { id: 'shore', how: 'take', at: (x, z, _y, g) => (g.open && inChannel(x, z) ? shoreY(x, z) + STREET : null) },
  // The garage's turntable: its disc's top, where your car stands and you step on to get in
  { id: 'turntable', how: 'take', at: (x, z, _y, g) => (g.slab && Math.hypot(x - DISC.x, z - DISC.z) < DISC.r ? SLAB + DISC.top : null) },
  // Westlake Park's jetty and its lakeside terraces (westlake.ts), Sector 7 Tower's sky deck (skydeck.ts)
  { id: 'jetty', how: 'lift', at: (x, z) => (onJetty(x, z) ? SLAB + JETTY.y : null) },
  { id: 'terrace', how: 'lift', at: (x, z) => lift(terraceY(x, z), SLAB) },
  { id: 'skydeck', how: 'lift', at: (x, z, yNow) => lift(skyDeckY(x, z, yNow - SLAB), SLAB) },
  // City Hall's and the courthouse's steps and porticos' floors (civic.ts, docs/civic-plan.md): heights of their own
  { id: 'civic', how: 'lift', at: (x, z) => civicY(x, z) },
  // The kart park's circuit: its own ground (the deck, the banking, the hill), when `yNow` is on it (kartcircuit.ts)
  { id: 'circuit', how: 'lift', at: (x, z, yNow) => (inPark(x, z) ? lift(circuitSurfaceAt(x, z, yNow)?.y ?? null) : null) },
  // Its spectators' grass banks, whose berms carry on outside the fence (kartfacility.ts)
  { id: 'banks', how: 'lift', at: (x, z) => (inPark(x, z) || inBanks(x, z) ? bankY(x, z) + STREET : null) },
];

/** A layer's height over its ground (`by`), or nothing where it isn't */
function lift(y: number | null | undefined, by = STREET) {
  return y === null || y === undefined ? null : y + by;
}

/**
 * `groundAt(x, z, yNow)`: the ground under x, z for someone `yNow` high (0: on the street). `leavesOpen`: whether
 * Liberty Bridge's leaves are down right now (walk.ts reads the clock)
 */
export function createGroundHeight(opts: { leavesOpen: () => boolean; layers?: GroundLayer[] }) {
  const layers = opts.layers ?? GROUND_LAYERS;
  return (x: number, z: number, yNow = 0) => {
    const b = baseAt(x, z);
    const g: GroundCtx = { ...b, leavesOpen: opts.leavesOpen() };
    for (const L of layers) {
      const y = L.at(x, z, yNow, g);
      if (y === null) continue;
      if (L.how === 'take') return y;
      if (L.how === 'over') return Math.max(g.base, y);
      g.base = Math.max(g.base, y);
    }
    return g.base;
  };
}
