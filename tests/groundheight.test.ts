// The ground under a point (groundheight.ts, the polish plan's Phase 10): walk.ts's `groundAt()` as an ordered list of
// layers. Nothing changed hands: `reference()` below is the old `groundAt()` word for word, and the new one must agree
// with it everywhere, at every height. Then each layer answers alone where it stands, and the order resolves the
// overlaps (a deck over the water, the tunnel under the highway, the mall's upper floor).
import { test } from 'node:test';
import { onSouthGround, southLift } from '../src/scripts/city3d/southground';
import assert from 'node:assert/strict';
import { GROUND_LAYERS, SLAB, STREET, UNDER, baseAt, createGroundHeight } from '../src/scripts/city3d/groundheight';
import { HOME, ROOF_Y, homeRoofY } from '../src/scripts/city3d/home';
import { DECK_Y, MARKET_DECK, onDeck } from '../src/scripts/city3d/waterfront';
import { onEsplanade } from '../src/scripts/city3d/boulevard';
import { DEPARTURES, departuresY } from '../src/scripts/city3d/airfield';
import { circuitSurfaceAt as trackSurfaceAt, CIRCUIT, FLY_H } from '../src/scripts/city3d/kartcircuit';
import { BANKS_AREA, bankY } from '../src/scripts/city3d/kartfacility';
import { KART_PARK } from '../src/scripts/city3d/kartpark';
import { HIGH_Y, LOW_Y, TOWERS, footbridgeY } from '../src/scripts/city3d/liberty';
import { FOOTBRIDGE_X, EXT } from '../src/scripts/city3d/layout';
import { SX as SWING_X, swingY } from '../src/scripts/city3d/swingbridge';
import { JETTY, TERRACES, onJetty, terraceY } from '../src/scripts/city3d/westlake';
import { civicY, CITYHALL_SPAWN, COURT_PORTICO, PORTICO } from '../src/scripts/city3d/civic';
import { viaductY } from '../src/scripts/city3d/viaground';
import { DECK_Y as VIADUCT_Y, ringPoint } from '../src/scripts/city3d/viaduct';
import { DECK, skyDeckY } from '../src/scripts/city3d/skydeck';
import { HALL } from '../src/scripts/city3d/mall';
import { TERRAIN_RECT } from '../src/scripts/city3d/terrain';
import { SPIRE_LOT } from '../src/scripts/city3d/highrise';
import { UP, UPPER, mallFloor } from '../src/scripts/city3d/mallinside';
import { inChannel, shoreY } from '../src/scripts/city3d/river';
import { TUNNEL } from '../src/scripts/city3d/lot9';
import { heightAt, onHills } from '../src/scripts/city3d/terrain';
import { rollsAt } from '../src/scripts/city3d/rolls';
import { HX, harbourY } from '../src/scripts/city3d/harbour';
import { vergeY } from '../src/scripts/city3d/verges';
import { GARAGE_SITE } from '../src/scripts/city3d/solids';
import { PLAN, inPoly, type Pt } from '../src/scripts/city3d/streetplan';

/* ---------- The old groundAt(), word for word (walk.ts before the split) ---------- */
type Box = [number, number, number, number, number];
const slabOf = (poly: Pt[]) => ({ poly, box: [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1])), 0] as Box });
const slabs = PLAN.slabs.map(slabOf);
const DISC = { ...GARAGE_SITE.turntable, top: 0.07 };
const inBox = (b: Box, x: number, z: number, pad = 0) => x > b[0] - pad && x < b[2] + pad && z > b[1] - pad && z < b[3] + pad;
function reference(leavesOpen: () => boolean) {
  return (x: number, z: number, yNow = 0) => {
    // (Degen's roof terrace, home.ts: new since the old groundAt(), so the reference takes it as the layers do)
    const roof = homeRoofY(x, z, yNow);
    if (roof !== null) return roof;
    const tn = UNDER.y(x, z, yNow);
    if (tn !== null) return tn;
    const slab = slabs.some((s) => inBox(s.box, x, z) && inPoly(s.poly, [x, z])) ? SLAB : onDeck(x, z) || onEsplanade(x, z) ? DECK_Y : 0.035;
    // (the south's rolling ground, southground.ts: new since the old groundAt(), so the reference takes it as the layers do)
    if (onSouthGround(x, z) && (slab === SLAB || slab === 0.035)) {
      const l = southLift(x, z);
      if (l !== 0) return (slab === SLAB ? SLAB : 0.035 + Math.max(0, vergeY(x, z))) + l;
    }
    if (slab === 0.035) {
      const v = vergeY(x, z);
      if (v > 0) return v + 0.035;
    }
    if (slab === 0.035 && onHills(x, z)) return heightAt(x, z) + 0.035;
    if (slab === 0.035) {
      const r = rollsAt(x, z);
      if (r !== 0) return r + 0.035;
    }
    const hb = harbourY(x, z);
    if (hb !== null) return Math.max(slab, hb + 0.035);
    const sw = swingY(x, z);
    if (sw !== null) return Math.max(slab, sw + 0.035);
    const via = viaductY(x, z, yNow);
    if (via !== null) return Math.max(slab, via + 0.035);
    const dep = departuresY(x, z, yNow);
    if (dep !== null) return Math.max(slab, dep + 0.035);
    const fb = footbridgeY(x, z, yNow, 0, leavesOpen());
    if (fb !== null) return Math.max(slab, fb);
    const mall = mallFloor(x, z, yNow);
    if (mall !== null) return mall;
    if (slab === 0.035 && inChannel(x, z)) return shoreY(x, z) + 0.035;
    if (slab === SLAB && Math.hypot(x - DISC.x, z - DISC.z) < DISC.r) return SLAB + DISC.top;
    // (the civic quarter's steps and porticos came after, civic.ts: the one term added to the old groundAt())
    const base = Math.max(slab, onJetty(x, z) ? SLAB + JETTY.y : 0, SLAB + (terraceY(x, z) ?? -SLAB), SLAB + (skyDeckY(x, z, yNow - SLAB) ?? -SLAB), civicY(x, z) ?? 0);
    if (x < KART_PARK.x0 || x > KART_PARK.x1 || z < KART_PARK.z0 || z > KART_PARK.z1) {
      const [bx0, bz0, bx1, bz1] = BANKS_AREA;
      return x > bx0 && x < bx1 && z > bz0 && z < bz1 ? Math.max(base, bankY(x, z) + 0.035) : base;
    }
    const t = trackSurfaceAt(x, z, yNow);
    return Math.max(base, t ? t.y + 0.035 : 0, bankY(x, z) + 0.035);
  };
}

const mid = (r: readonly number[]): [number, number] => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
const ring = (s: number): [number, number] => [ringPoint(s, 0)[0], ringPoint(s, 0)[1]];
const sample = (i: number): [number, number] => [CIRCUIT.x[i], CIRCUIT.z[i]];
/** A point on a terrace's platform: out from the water's edge along u until the terrace answers */
const terraceSpot = (t: (typeof TERRACES)[number]): [number, number] => {
  for (let d = -3; d < 5; d += 0.25) {
    const p: [number, number] = [t.at[0] + t.u[0] * d, t.at[1] + t.u[1] * d];
    if (terraceY(p[0], p[1]) !== null) return p;
  }
  throw new Error('no terrace');
};
/** The first point in a rect where `ok` holds */
const find = (r: readonly number[], ok: (x: number, z: number) => boolean): [number, number] => {
  for (let x = r[0] + 1; x < r[2]; x += 3) for (let z = r[1] + 1; z < r[3]; z += 3) if (ok(x, z)) return [x, z];
  throw new Error('not found');
};
const HILL = find(TERRAIN_RECT, (x, z) => onHills(x, z) && heightAt(x, z) > 2);
const ROLL = find([-600, -500, -300, -300], (x, z) => rollsAt(x, z) !== 0);
const JETTY_AT: [number, number] = [JETTY.x, (JETTY.z0 + JETTY.z1) / 2];
/** A natural bank of the river (no deck or quay over it) */
const SHORE = find([-150, 60, 150, 150], (x, z) => inChannel(x, z) && baseAt(x, z).open && !onDeck(x, z));
/** The mall's east gallery, upstairs */
const GALLERY = mid(UPPER[2]);
/** The places the layers are: a point on each, and the heights they're asked at */
const SPOTS: [number, number][] = [
  // City Hall's steps (half way up) and its portico
  [CITYHALL_SPAWN.x + 3, CITYHALL_SPAWN.z - 4.4],
  [CITYHALL_SPAWN.x, (PORTICO[1] + PORTICO[3]) / 2],
  // and the courthouse's
  [COURT_PORTICO[0] - 1, (COURT_PORTICO[1] + COURT_PORTICO[3]) / 2],
  [(COURT_PORTICO[0] + COURT_PORTICO[2]) / 2, (COURT_PORTICO[1] + COURT_PORTICO[3]) / 2],
  mid(MARKET_DECK),
  [TUNNEL.x, (TUNNEL.z0 + TUNNEL.z1) / 2],
  [TUNNEL.x, TUNNEL.z0 + 1],
  mid(HALL.rect),
  GALLERY,
  SHORE,
  [FOOTBRIDGE_X, (TOWERS[0] + TOWERS[1]) / 2],
  [FOOTBRIDGE_X, TOWERS[0] - 6],
  [HX, 100],
  [SWING_X, 100],
  [DEPARTURES.x0 + 2, (DEPARTURES.z0 + DEPARTURES.z1) / 2],
  ...[0.1, 0.3, 0.6, 0.85].map(ring),
  mid(SPIRE_LOT),
  JETTY_AT,
  ...TERRACES.map(terraceSpot),
  sample(12),
  sample(40),
  sample(Math.floor(CIRCUIT.x.length / 2)),
  [DISC.x, DISC.z],
  HILL,
  ROLL,
  [0, 140],
];
const HEIGHTS = [0, 2, 4, 8, 14, 30, 45];

test('the layered ground agrees with the old groundAt() everywhere, at every height', () => {
  for (const open of [true, false]) {
    const was = reference(() => open);
    const now = createGroundHeight({ leavesOpen: () => open });
    let n = 0;
    const same = (x: number, z: number, y: number) => {
      const [a, b] = [was(x, z, y), now(x, z, y)];
      assert.ok(Math.abs(a - b) < 1e-9, `at ${x}, ${z} (${y} up): ${a} was, ${b} now`);
      n++;
    };
    // A grid over the whole world (coarse), and every spot the layers stand at, at every height
    for (let x = EXT[0] + 3; x < EXT[1]; x += 11) for (let z = EXT[0] + 5; z < EXT[1]; z += 13) for (const y of [0, 4, 30]) same(x, z, y);
    for (const [x, z] of SPOTS) for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) for (const y of HEIGHTS) same(x + dx * 0.7, z + dz * 0.7, y);
    assert.ok(n > 20000);
  }
});

test('every layer answers alone where it stands, and nowhere on the open street downtown', () => {
  const g = (x: number, z: number) => ({ ...baseAt(x, z), leavesOpen: true });
  const where: Record<string, [number, number, number]> = {
    homeroof: [(HOME.house[0] + HOME.house[2]) / 2, (HOME.house[1] + HOME.house[3]) / 2, SLAB + ROOF_Y],
    // (the south's rolling ground on the village's hill, St Aldwyn's churchyard)
    south: [-205, 462, 0],
    tunnel: [TUNNEL.x, (TUNNEL.z0 + TUNNEL.z1) / 2, -2],
    hills: [HILL[0], HILL[1], 0],
    rolls: [ROLL[0], ROLL[1], 0],
    harbour: [HX, 100, 0],
    swing: [SWING_X, 100, 0],
    viaduct: [ring(0.3)[0], ring(0.3)[1], VIADUCT_Y],
    departures: [DEPARTURES.x0 + 2, (DEPARTURES.z0 + DEPARTURES.z1) / 2, DEPARTURES.y],
    liberty: [FOOTBRIDGE_X, (TOWERS[0] + TOWERS[1]) / 2, LOW_Y],
    mall: [GALLERY[0], GALLERY[1], UP],
    shore: [SHORE[0], SHORE[1], 0],
    turntable: [DISC.x, DISC.z, 0],
    jetty: [JETTY_AT[0], JETTY_AT[1], 0],
    terrace: [terraceSpot(TERRACES[0])[0], terraceSpot(TERRACES[0])[1], 0],
    skydeck: [mid(SPIRE_LOT)[0], mid(SPIRE_LOT)[1], DECK.y + SLAB],
    civic: [CITYHALL_SPAWN.x, (PORTICO[1] + PORTICO[3]) / 2, 0],
    circuit: [sample(12)[0], sample(12)[1], 0],
    banks: [sample(12)[0], sample(12)[1], 0],
  };
  for (const L of GROUND_LAYERS) {
    const w = where[L.id];
    if (!w) {
      assert.equal(L.id, 'verge', `${L.id}: no spot named for it`);
      continue;
    }
    assert.notEqual(L.at(w[0], w[1], w[2], g(w[0], w[1])), null, `${L.id} answers nothing at its own spot`);
    // (the open street downtown, the Emporium's block's south side: nothing but the street)
    assert.equal(L.at(30, 44.5, 0, g(30, 44.5)), null, `${L.id} answers on the street`);
  }
  // A verge: somewhere along the first one's line
  const vg = GROUND_LAYERS.find((l) => l.id === 'verge')!;
  let found = false;
  for (let x = EXT[0]; x < EXT[1] && !found; x += 2) for (let z = EXT[0]; z < EXT[1] && !found; z += 2) if (vergeY(x, z) > 0) found = vg.at(x, z, 0, g(x, z)) !== null;
  assert.ok(found, 'the verge layer answers on a bank');
  assert.equal(baseAt(30, 44.5).base, STREET);
});

test('the order resolves the overlaps: a deck over the water, the tunnel under the highway, the mall and Liberty by height, the flyover over the track', () => {
  const ground = createGroundHeight({ leavesOpen: () => true });
  // The Night Market's deck stands over the river: the deck, not the river's bank
  const [mx, mz] = mid(MARKET_DECK);
  assert.ok(inChannel(mx, mz), 'the market deck is out over the water');
  assert.equal(ground(mx, mz), DECK_Y);
  // Lot 9's tunnel: down there its floor, up at street level the ground over it
  const tz = (TUNNEL.z0 + TUNNEL.z1) / 2;
  const down = UNDER.y(TUNNEL.x, tz, -2)!;
  assert.equal(ground(TUNNEL.x, tz, -2), down);
  assert.ok(down < 0 && ground(TUNNEL.x, tz, 0) > down, 'the ground over the tunnel is higher than its floor');
  // The mall's two floors by height
  const [hx, hz] = GALLERY;
  const low = ground(hx, hz, 0);
  const high = ground(hx, hz, UP + 0.5);
  assert.ok(high > low + UP * 0.9, `${low} ${high}`);
  // Liberty Bridge: the lower deck and the high walkway, each from its own height; the leaves gone when the gates are shut
  const lz = (TOWERS[0] + TOWERS[1]) / 2;
  assert.ok(Math.abs(ground(FOOTBRIDGE_X, lz, LOW_Y) - footbridgeY(FOOTBRIDGE_X, lz, LOW_Y, 0, true)!) < 1e-9);
  // (the high walkways run either side of the centre line, HIGH.walk)
  assert.ok(ground(FOOTBRIDGE_X + 2, lz, HIGH_Y) > ground(FOOTBRIDGE_X + 2, lz, LOW_Y) + 2);
  const shut = createGroundHeight({ leavesOpen: () => false });
  assert.ok(shut(FOOTBRIDGE_X, lz, LOW_Y) < ground(FOOTBRIDGE_X, lz, LOW_Y), 'the leaves up: the water below');
  // The raised highway: its deck for a car up there, the street under it for a walker
  const r = ring(0.3);
  assert.ok(ground(r[0], r[1], VIADUCT_Y) > VIADUCT_Y - 1 && ground(r[0], r[1], 0) < 2);
  // The kart park's flyover: the deck for a kart up there, the track below for one down there
  let crossing: [number, number] | null = null;
  for (let i = 0; i < CIRCUIT.x.length; i++) {
    const p = sample(i);
    const hi = trackSurfaceAt(p[0], p[1], FLY_H);
    const lo = trackSurfaceAt(p[0], p[1], 0);
    if (hi && lo && hi.y > lo.y + FLY_H * 0.6) crossing = p;
  }
  assert.ok(crossing, 'the flyover crosses the track');
  assert.ok(ground(crossing![0], crossing![1], FLY_H) > ground(crossing![0], crossing![1], 0) + FLY_H * 0.6);
});
