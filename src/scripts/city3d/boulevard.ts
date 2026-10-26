/*
 * Uptown's waterfront boulevard (docs/finance-plan.md Phase 4, the owner's
 * call; DOM-free, tested in tests/boulevard.test.ts): what the boot needs.
 * What only the drawing needs (the yachts, the benches, the median's
 * planting, the terraces' names) is boulevarddress.ts's, in Uptown's chunk.
 *
 * - **The esplanade** (`ESPLANADE`): a wide paved deck along the north bank
 *   from Uptown's west edge to where the town's promenade begins, from the
 *   bank avenue's kerb out over the water (`OUT` past the river's wall), at
 *   the boardwalk's height (waterfront.ts's `DECK_Y`); a double row of trees
 *   in planters (`LAND_TREES` by the avenue, `WATER_TREES` by the water),
 *   lamps at the water's edge reaching in over the walk (`EDGE_LAMPS`) and a
 *   glass rail along it.
 * - **Over the water** (`OVERLOOKS`): a broad overlook where the Mall's axis
 *   meets the river and a smaller one in line with Uptown's east street; the
 *   marina at the west end (`PONTOON`, reached by `GANGWAYS`), its yachts
 *   moored along the pontoon's outer side.
 * - **The boats keep clear** (life.ts): since the river was widened again
 *   (river plan step 1) every lane passes outside the marina, its yachts and
 *   the overlooks as it is (the tests hold every deck clear of them).
 * - **Restaurant terraces** (`ROOF_TERRACES`) on the river row's podium roofs,
 *   wherever a podium's roof is clear of its shafts, with their tables.
 * - **People** (`BOULEVARD_PEOPLE`): on the benches, at the overlooks' rails,
 *   on the pontoon and dining on the terraces.
 *
 * Walking: the decks are ground at `DECK_Y` (`onEsplanade()`, as the
 * boardwalk's); their rail is their edge. Nothing on it is solid (as the
 * town's promenade).
 */
import { RIVER } from './layout';
import { AXIS_X, BOULEVARD_X, EAST_X, ROWS_Z, STREET_HALF, crossingsOn, type Pt, type Rect } from './uptown';
import { HIGHRISES, PODIUM } from './highrise';
import { DECK_Y } from './waterfront';
import { atGangway } from './riverbus';
import { WHEEL_RECT } from './wheel';
import { ARCH } from './metro';

/** The bank avenue the esplanade runs along */
const BANK = ROWS_Z[ROWS_Z.length - 1];
/** How far the esplanade reaches out over the water past the river's wall */
export const OUT = 3;
/** The esplanade: x0 by the highway's slip lanes (as the south bank's boardwalk), x1 where the town's promenade begins; z from the avenue's kerb out over the water */
export const ESPLANADE: Rect = [BOULEVARD_X[0] + 2.5, BANK.c + BANK.half, BOULEVARD_X[1], RIVER[0] + OUT];
const [X0, Z0, X1, Z1] = ESPLANADE;

/** The overlooks out over the water: the axis's broad one, a smaller one in line with Uptown's east street (x, width, how far out) */
export const OVERLOOKS = [
  { x: AXIS_X, w: 8, out: 2 },
  { x: EAST_X, w: 6, out: 1.6 },
].map((o) => ({ ...o, rect: [o.x - o.w / 2, Z1 - 0.8, o.x + o.w / 2, Z1 + o.out] as Rect }));
/** The marina's pontoon, along the water a little out from the esplanade at its west end, and the gangways out to it (their middles, x) */
export const PONTOON: Rect = [X0 + 2, Z1 + 0.8, X0 + 37, Z1 + 1.9];
export const GANGWAYS: number[] = [X0 + 7, X0 + 32];
export const GANGWAY_HALF = 0.6;
/** Every deck you walk on (overlapping where they meet by more than a walker's width, so a walker's middle is always in one) */
export const ESPLANADE_DECKS: Rect[] = [
  ESPLANADE,
  ...OVERLOOKS.map((o) => o.rect),
  ...GANGWAYS.map((x): Rect => [x - GANGWAY_HALF, Z1 - 0.8, x + GANGWAY_HALF, PONTOON[1] + 0.8]),
  PONTOON,
];
/** Is a point on the esplanade's decks, `m` (a walker's radius) inside their edges */
export const onEsplanade = (x: number, z: number, m = 0) => ESPLANADE_DECKS.some((r) => x > r[0] + m && x < r[2] - m && z > r[1] + m && z < r[3] - m);

/** Where things stand along the water's edge: never in an overlook's or a gangway's mouth (the marina's, or the river bus's: riverbus.ts) */
export const clearOfMouths = (x: number, m: number) =>
  OVERLOOKS.every((o) => Math.abs(x - o.x) > o.w / 2 + m) && GANGWAYS.every((g) => Math.abs(x - g) > GANGWAY_HALF + m) && !atGangway('north', x, m);
/** ...and by the avenue, never where people come over from the junctions and the axis's zebra */
const clearOfCrossings = (x: number, m: number) => [...crossingsOn(BANK), AXIS_X].every((c) => Math.abs(x - c) > STREET_HALF + m);
/** ...and the observation wheel's along the water's edge (wheel.ts): the walk passes it on the avenue's side */
const clearOfWheel = (x: number, m: number) => (x < WHEEL_RECT[0] - m || x > WHEEL_RECT[2] + m) && clearOfArch(x, m);
/** ...and the metro's arch's north feet (metro.ts), either side of its line */
const clearOfArch = (x: number, m: number) => Math.abs(x - ARCH.x) > ARCH.half + 0.6 + m;

/** Lamps at the water's edge, their arms reaching in over the walk (x, z, ry), and two at each overlook's outer corners */
export const EDGE_LAMPS: [number, number, number][] = [];
for (let x = X0 + 2; x < X1 - 1; x += 12) if (clearOfMouths(x, 1) && clearOfWheel(x, 0.5)) EDGE_LAMPS.push([x, Z1 - 0.4, Math.PI / 2]);
for (const o of OVERLOOKS) for (const s of [-1, 1]) EDGE_LAMPS.push([o.x + s * (o.w / 2 - 0.4), o.rect[3] - 0.4, Math.PI / 2]);
/** The double row of trees in planters: every 6 along the avenue's side, every 12 along the water's (between the lamps) */
export const PLANTER_R = 0.45;
export const LAND_TREES: Pt[] = [];
for (let x = X0 + 2; x < X1 - 1; x += 6) if (clearOfCrossings(x, 1.5) && clearOfArch(x, 0.5)) LAND_TREES.push([x, Z0 + 0.95]);
export const WATER_TREES: Pt[] = [];
for (let x = X0 + 8; x < X1 - 1; x += 12) if (clearOfMouths(x, 1.4) && clearOfWheel(x, 0.5)) WATER_TREES.push([x, Z1 - 1.55]);
/** Benches facing the water between the trees and the lamps (the drawing's; their sitters are here) */
export const BENCH_Z = Z1 - 0.95;
export const BENCH_XS: number[] = [];
for (let x = X0 + 5; x < X1 - 1; x += 6) if (clearOfMouths(x, 1.2) && clearOfWheel(x, 0.5)) BENCH_XS.push(x);

/* ---------- The restaurant terraces ---------- */

/** The river row's towers (their podiums' south faces look over the avenue to the water) */
const RIVER_ROW = HIGHRISES.filter((t) => t.block.startsWith('uptown-s') && t.parts[0].skin === 'podium');
export interface RoofTerrace {
  tower: string;
  /** On the podium's roof, in front of the shafts (the river row's stand at the back of their podiums: highrise.ts) */
  rect: Rect;
  /** Its tables (each a chair either side along x) */
  tables: Pt[];
}
/** The podiums' roof height (over the slab) */
export const TERRACE_Y = PODIUM.h;
export const ROOF_TERRACES: RoofTerrace[] = RIVER_ROW.flatMap((t) => {
  const pod = t.parts[0].rect;
  const back = Math.max(...t.parts.filter((p) => p.y0 === PODIUM.h).map((p) => p.rect[3]));
  // From a step off the shafts to the podium's front, if it's deep enough for a row of tables
  const rect: Rect = [pod[0] + 0.5, back + 0.7, pod[2] - 0.5, pod[3] - 0.5];
  if (rect[3] - rect[1] < 2.2 || rect[2] - rect[0] < 4) return [];
  const tables: Pt[] = [];
  const z = (rect[1] + rect[3]) / 2;
  for (let x = rect[0] + 1.1; x <= rect[2] - 1.1 + 1e-6; x += 2.4) tables.push([x, z]);
  return [{ tower: t.id, rect, tables }];
});

/* ---------- People ---------- */

export type BoulevardAct = 'sit' | 'eat' | 'chat' | 'look' | 'phone';
export interface BoulevardPerson {
  x: number;
  z: number;
  /** Over the ground (on the decks), or over the slab for those on a podium's roof (`roof`); a seat's height for those sitting */
  y: number;
  roof?: true;
  ry: number;
  act: BoulevardAct;
}
/** A bench's and a chair's seat over what it stands on */
export const SEAT = 0.32;
export const CHAIR_OFF = 0.6;
export const BOULEVARD_PEOPLE: BoulevardPerson[] = (() => {
  const out: BoulevardPerson[] = [];
  const add = (x: number, z: number, y: number, ry: number, act: BoulevardAct, roof = false) => out.push({ x, z, y, ry, act, ...(roof ? { roof: true as const } : {}) });
  // (every other bench, looking out over the water: ry 0 faces +z, the river)
  BENCH_XS.forEach((x, i) => i % 2 === 0 && add(x + (i % 4 ? 0.3 : -0.3), BENCH_Z, DECK_Y + SEAT, 0, 'sit'));
  // At each overlook's rail (one looking out, one on their phone), and a pair chatting on the pontoon
  for (const o of OVERLOOKS) for (const d of [-1.4, 1.1]) add(o.x + d, o.rect[3] - 0.55, DECK_Y, 0, d < 0 ? 'look' : 'phone');
  for (const s of [-1, 1]) add((PONTOON[0] + PONTOON[2]) / 2 + s * 0.45, (PONTOON[1] + PONTOON[3]) / 2, DECK_Y, (-s * Math.PI) / 2, 'chat');
  // Dining on the terraces (two tables in three), facing each other across the table
  for (const t of ROOF_TERRACES)
    t.tables.forEach(([x, z], i) => {
      if (i % 3 === 2) return;
      add(x - CHAIR_OFF, z, TERRACE_Y + SEAT, Math.PI / 2, 'eat', true);
      add(x + CHAIR_OFF, z, TERRACE_Y + SEAT, -Math.PI / 2, 'eat', true);
    });
  return out;
})();
