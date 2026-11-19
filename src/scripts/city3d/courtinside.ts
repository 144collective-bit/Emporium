/*
 * Palm Court indoors: the mall's wing over the east ring avenue (docs/mall-plan.md "One mall" Phase 3, the owner's
 * call: an enclosed two-floor wing matching the mall's interior; DOM-free, tested in tests/courtinside.test.ts), drawn
 * by courtinside3d.ts in the mall's chunk. The rows (mall.ts `SHOPS`) are two storeys (`ROW_H`): the shops downstairs,
 * more upstairs (`UPPER_UNITS`); a glass barrel vault over the promenade (the owner's pick, the mall's and the
 * Skywalk's look).
 *
 * - **Upstairs** (`UPPER`, at `L1`: the hall's and the Skywalk's lower floor's height): the galleries along both rows
 *   (`GALLERY_W`), the food hall's terrace across the north end by Paradise Cinema (`TERRACE`: its tables, `TABLES`;
 *   its stalls, `FOOD_STALLS`, in the east row's north end; the cinema's doors up here, `CINEMA_DOORS`), three glass
 *   bridges across the void (`BRIDGES`), and the way into the Skywalk's pavilion (`CONNECTOR`: its mezzanine,
 *   malllink.ts, where the promenade's door into it is).
 * - **The void** (`VOID`): open from the promenade to the vault; the fountain, the benches, the trees in their white
 *   planters (`COURT_PLANTERS`), and the escalators by the south entrance up to the south bridge (`ESCALATORS`).
 * - **The entrances** (`ENTRANCES`): the south end across the promenade, the west passage from the avenue's zebra and
 *   the east one onto the open land; glass doors, open. `COURT_INSIDE_SOLIDS` (in `SOLIDS`) are their walls, the
 *   wing's walls at the cinema's corners, the escalators' balustrades.
 *
 * Walking (as mallinside.ts): `courtFloor()` the floor by Degen's height (groundheight.ts's `court` layer),
 * `courtWall()` stops him off the upper floor's edges and in what stands on his floor (`LEVEL_SOLIDS`); the rows are
 * solid (`SHOPS`). `COURT_CAMERA` is for the walk camera. Made-up names only; no prices on any sign.
 */
import { ARCH, CINEMA, COURT, EAST_GAP, FOUNTAIN, PAVILION, PROM, PROM_X, ROW_H, SHOPS, ZEBRA, type Pt, type Rect } from './mall';
import { FLOOR_T, UP } from './mallinside';

type Box = [number, number, number, number, number];

/** The slab (world.ts `SLAB`) Palm Court stands on; the upper floor's height (the hall's: mallinside.ts `UP`) */
const SLAB = 0.15;
export const L1 = SLAB + UP;
/** The wing's north end (Paradise Cinema's front) and south end (the rows' ends: its entrance there) */
export const NORTH = CINEMA.rect[3];
export const SOUTH = ARCH.z - 1.5;
/** The rows' outer faces, the avenue's side and the open land's */
export const WEST_X = PAVILION[0];
export const EAST_X = COURT[2] - 0.5;
/** The galleries' width out from the rows' fronts, and the food hall's terrace's south edge */
export const GALLERY_W = 2.5;
export const TERRACE_Z = NORTH + 9;
/** The void: open from the promenade to the vault, between the galleries, south of the terrace */
export const VOID: Rect = [PROM[0] + GALLERY_W, TERRACE_Z, PROM[1] - GALLERY_W, SOUTH];
/** The glass bridges across the void (z0, z1), clear of the fountain and its benches */
export const BRIDGE_W = 2.5;
export const BRIDGES: Pt[] = [-101, -80, -60].map((z): Pt => [z, z + BRIDGE_W]);
/** The way into the Skywalk's pavilion upstairs: through its wall where its promenade door is (malllink.ts `PAV_DOORS`) */
export const CONNECTOR_Z: Pt = [PAVILION[1] + 1.4, PAVILION[1] + 6.0];
export const CONNECTOR: Rect = [PAVILION[2] - 0.3, CONNECTOR_Z[0], PROM[0], CONNECTOR_Z[1]];
/** The upper floor: the terrace, the two galleries, the bridges, the way into the pavilion */
export const UPPER: Rect[] = [
  [PROM[0], NORTH, PROM[1], TERRACE_Z],
  [PROM[0], TERRACE_Z, VOID[0], SOUTH],
  [VOID[2], TERRACE_Z, PROM[1], SOUTH],
  ...BRIDGES.map(([z0, z1]): Rect => [VOID[0], z0, VOID[2], z1]),
  CONNECTOR,
];

/* ---------- The escalators: by the south entrance, up to the south bridge ---------- */

/** Up on the west, down on the east, side by side in the void's middle, rising north to the south bridge */
export const ESCALATORS: { x0: number; x1: number; dir: 1 | -1 }[] = [
  { x0: PROM_X - 1.7, x1: PROM_X - 0.3, dir: 1 },
  { x0: PROM_X + 0.3, x1: PROM_X + 1.7, dir: -1 },
];
export const BALUSTRADE = 0.2;
/** Where the ramp lands (the south bridge's south edge), its run and the flat landing at its head; its foot */
export const LAND_Z = BRIDGES[BRIDGES.length - 1][1];
export const RUN = 5.5;
export const FOOT_Z = LAND_Z + RUN + 1;
/** An escalator's height over the slab at z: flat at the foot, up the run, flat on the landing */
export const escalatorY = (z: number) => Math.min(1, Math.max(0, (FOOT_Z - z) / RUN)) * UP;

/* ---------- The units upstairs, the food hall, the cinema's doors ---------- */

/** Upstairs over the rows' shops: made-up names, west row then east, north to south */
export const UPPER_NAMES = [
  'BLUE HARBOUR',
  'ATELIER NINE',
  'POLAR GOODS',
  'SAGE & SALT',
  'MOONLIT',
  'COBALT',
  'THE LOOM',
  'IVY LANE',
  'HIGH TIDE',
  'FIELDNOTE',
  'COPPERLEAF',
  'NORTHLIGHT',
  'GREENHOUSE',
  'VELVET ROOM',
  'TRAILHEAD',
  'BRIGHTWATER',
  'KINDLE & CO',
  'SILVER BIRCH',
];
export interface UpperUnit {
  rect: Rect;
  /** Which way its front faces (+1 east: the west row's) */
  face: 1 | -1;
  name: string;
  k: number;
}
/** The food hall's stalls upstairs in the east row's north end, facing the east gallery (made-up names) */
export const FOOD_NAMES = ['PIZZA FORNO', 'RAMEN STREET', 'FALAFEL HUT', 'CREPE CORNER'];
const FOOD_END = ZEBRA.z - 3;
export const FOOD_STALLS: { z0: number; z1: number; name: string }[] = FOOD_NAMES.map((name, i) => {
  const [z0, z1] = [NORTH + 4, FOOD_END];
  const w = (z1 - z0) / FOOD_NAMES.length;
  return { z0: z0 + i * w, z1: z0 + (i + 1) * w, name };
});
/** Over each shop but where the food hall's stalls are: a unit upstairs, its front on the gallery */
export const UPPER_UNITS: UpperUnit[] = SHOPS.filter((s) => !(s.face === -1 && s.rect[3] <= FOOD_END + 0.2)).map((s, k) => ({ rect: s.rect, face: s.face, name: UPPER_NAMES[k % UPPER_NAMES.length], k }));
/** The food hall's tables on the terrace (x, z): two columns either side of the aisle from the cinema's doors, clear of the way into the pavilion */
export const TABLE_R = 0.45;
export const TABLES: Pt[] = [NORTH + 2.6, NORTH + 4.8, NORTH + 7.0].flatMap((z) => [PROM[0] + 1.2, PROM_X - 2.75, PROM_X + 2.75, PROM[1] - 1.2].map((x): Pt => [x, z]));
/** Paradise Cinema's doors up here on the terrace (x0, x1 on its front), as downstairs */
export const CINEMA_DOORS: Pt = [PROM_X - 1.6, PROM_X + 1.6];

/* ---------- The void ---------- */

/** Trees in big white planters in the void (x, z): down its edges, clear of the fountain, the bridges and the escalators */
export const PLANTER_R = 0.6;
export const COURT_PLANTERS: Pt[] = (() => {
  const out: Pt[] = [];
  const clear = (z: number) => Math.abs(z - FOUNTAIN.z) > FOUNTAIN.r + 4 && BRIDGES.every(([a, b]) => z < a - 1.6 || z > b + 1.6) && z < LAND_Z - 1;
  for (let z = TERRACE_Z + 3; z < SOUTH - 2; z += 7) if (clear(z)) out.push([VOID[0] + 1.0, z], [VOID[2] - 1.0, z + 3.5]);
  return out.filter(([, z]) => clear(z));
})();

/* ---------- The entrances and the wing's walls ---------- */

/** The doors: the south end across the promenade, the west passage's on the avenue, the east gap's on the open land (each across x or z, open) */
export const ENTRANCES: { id: 'south' | 'west' | 'east'; along: 'x' | 'z'; at: number; from: number; to: number; door: Pt }[] = [
  { id: 'south', along: 'x', at: SOUTH, from: PROM[0], to: PROM[1], door: [PROM_X - 2.2, PROM_X + 2.2] },
  { id: 'west', along: 'z', at: WEST_X, from: ZEBRA.z - 3, to: ZEBRA.z + 3, door: [ZEBRA.z - 2.2, ZEBRA.z + 2.2] },
  { id: 'east', along: 'z', at: EAST_X, from: EAST_GAP[0], to: EAST_GAP[1], door: [EAST_GAP[0] + 0.8, EAST_GAP[1] - 0.8] },
];
/** How thick the wing's own walls are */
export const SKIN = 0.2;
const sq = (x: number, z: number, r: number, h: number): Box => [x - r, z - r, x + r, z + r, h];
/** Walls: the entrances' either side of their doors, the cinema's corners by the rows' north ends */
export const COURT_WALLS: Box[] = [
  ...ENTRANCES.flatMap((e): Box[] => {
    const parts: Pt[] = [
      [e.from, e.door[0]],
      [e.door[1], e.to],
    ];
    return parts.map(([a, b]): Box => (e.along === 'x' ? [a, e.at - SKIN / 2, b, e.at + SKIN / 2, ROW_H] : [e.at - SKIN / 2, a, e.at + SKIN / 2, b, ROW_H]));
  }),
  // (the square in front of the cinema, by the rows' north ends: closed on the avenue's side and the open land's)
  // (on past the cinema's front, closing the gap by its corner)
  [WEST_X, NORTH - 1, WEST_X + SKIN, PAVILION[1], ROW_H],
  [EAST_X - SKIN, NORTH - 1, EAST_X, NORTH + 4, ROW_H],
];
/** The escalators' balustrades (from the landing to just past the foot), solid all the way up */
export const ESC_SOLIDS: Box[] = (() => {
  const [a, b] = ESCALATORS;
  const z1 = FOOT_Z + 0.8;
  return [
    [a.x0 - BALUSTRADE, LAND_Z, a.x0, z1, L1 + 1],
    [a.x1, LAND_Z, b.x0, z1, L1 + 1],
    [b.x1, LAND_Z, b.x1 + BALUSTRADE, z1, L1 + 1],
  ];
})();
export const COURT_INSIDE_SOLIDS: Box[] = [...COURT_WALLS, ...ESC_SOLIDS, ...COURT_PLANTERS.map(([x, z]) => sq(x, z, PLANTER_R, 0.6))];
/** What stands on one floor only, with a floor over or under it (x0, z0, x1, z1, level): the food hall's tables */
export const LEVEL_SOLIDS: [number, number, number, number, 0 | 1][] = TABLES.map(([x, z]): [number, number, number, number, 0 | 1] => [x - TABLE_R, z - TABLE_R, x + TABLE_R, z + TABLE_R, 1]);

/* ---------- Walking ---------- */

const inRect = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const onRect = (r: Rect, x: number, z: number) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
/** Indoors, downstairs: the promenade, the square in front of the cinema, the entrances' passages (and the way into the pavilion) */
export const INSIDE: Rect[] = [
  [PROM[0], NORTH, PROM[1], SOUTH],
  [WEST_X, NORTH, PROM[0], PAVILION[1]],
  [PROM[1], NORTH, EAST_X, NORTH + 4],
  [WEST_X, ZEBRA.z - 3, PROM[0], ZEBRA.z + 3],
  [PROM[1], EAST_GAP[0], EAST_X, EAST_GAP[1]],
  CONNECTOR,
];
/** Inside Palm Court */
export const inCourt = (x: number, z: number) => INSIDE.some((r) => inRect(r, x, z));
const onEscalator = (x: number, z: number) => z > LAND_Z && z < FOOT_Z && ESCALATORS.some((e) => x > e.x0 && x < e.x1);
/** The floors over a point (heights over the slab): an escalator's ramp alone, else the ground and the upper floor over it */
export function floorsAt(x: number, z: number): number[] {
  if (!inCourt(x, z)) return [];
  if (onEscalator(x, z)) return [escalatorY(z)];
  return UPPER.some((r) => onRect(r, x, z)) ? [0, UP] : [0];
}
const STEP = 0.3;
const DROP = 1.3;
/** The floor under a point for someone whose feet could reach `yNow` (world): the highest not over them; null outside */
export function courtFloor(x: number, z: number, yNow: number): number | null {
  const fl = floorsAt(x, z);
  if (!fl.length) return null;
  const under = fl.filter((f) => SLAB + f <= yNow + 1e-6);
  return SLAB + (under.length ? Math.max(...under) : Math.min(...fl));
}
function reach(x: number, z: number, y: number): number | null {
  const ok = floorsAt(x, z).filter((f) => SLAB + f <= y + STEP && SLAB + f >= y - DROP);
  return ok.length ? Math.max(...ok) : null;
}
/** Indoors, a point Degen (radius `m`, feet at `y`) can't stand at: off the upper floor's edges, up an escalator's side or under it, or in what stands on his floor */
export function courtWall(x: number, z: number, y: number, m = 0): boolean {
  if (!inCourt(x, z)) return false;
  for (const [dx, dz] of [
    [0, 0],
    [m, 0],
    [-m, 0],
    [0, m],
    [0, -m],
  ])
    if (inCourt(x + dx, z + dz) && reach(x + dx, z + dz, y) === null) return true;
  const level = y > SLAB + UP - 0.6 ? 1 : 0;
  return LEVEL_SOLIDS.some((b) => b[4] === level && x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m);
}
/** For the walk camera (x0, z0, x1, z1, top, bottom): the upper floor's slabs, the vault's springing over the promenade */
export const COURT_CAMERA: number[][] = [...UPPER.map((r) => [...r, L1, L1 - FLOOR_T]), [PROM[0], NORTH, PROM[1], SOUTH, SLAB + ROW_H + 2.6, SLAB + ROW_H + 2.2]];

/* ---------- People upstairs ---------- */

export interface CourtPerson {
  x: number;
  z: number;
  ry: number;
  act: 'look' | 'chat' | 'sit';
  /** Over the slab */
  y: number;
}
export const COURT_INSIDE_PEOPLE: CourtPerson[] = (() => {
  const out: CourtPerson[] = [];
  // Window-shopping at every other unit upstairs
  UPPER_UNITS.forEach((u, i) => {
    if (i % 2) return;
    const x = u.face === 1 ? u.rect[2] + 1.0 : u.rect[0] - 1.0;
    out.push({ x, z: (u.rect[1] + u.rect[3]) / 2 + 0.6, ry: u.face === 1 ? -Math.PI / 2 : Math.PI / 2, act: 'look', y: UP });
  });
  // Queueing at the food hall's stalls, and at its tables
  for (const s of FOOD_STALLS) out.push({ x: PROM[1] - 1.0, z: (s.z0 + s.z1) / 2, ry: -Math.PI / 2, act: 'look', y: UP });
  TABLES.forEach(([x, z], i) => {
    if (i % 3 === 2) return;
    out.push({ x: x - TABLE_R - 0.3, z, ry: Math.PI / 2, act: 'sit', y: UP + 0.32 });
    if (i % 2 === 0) out.push({ x: x + TABLE_R + 0.3, z, ry: -Math.PI / 2, act: 'sit', y: UP + 0.32 });
  });
  // Leaning on the bridges' rails, looking down into the void
  BRIDGES.forEach(([z0, z1], i) => out.push({ x: (VOID[0] + VOID[2]) / 2 + (i - 1) * 1.6, z: i % 2 ? z0 + 0.45 : z1 - 0.45, ry: i % 2 ? Math.PI : 0, act: 'look', y: UP }));
  return out;
})();

/** The tallest anything stands: the vault's crown over the rows (under the pylon: mall.ts `TALLEST`; under Paradise Cinema's roof, its front closing the vault's north end) */
export const VAULT_RISE = 2.1;
export const COURT_TALLEST = SLAB + ROW_H + VAULT_RISE;
