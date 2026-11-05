/*
 * Endswood's street level (docs/estate-plan.md Phase 4; DOM-free, the boot's: what's solid and the trees; tested in
 * tests/endsstreet.test.ts), drawn by endsstreet3d.ts and endschurch3d.ts in the estate's chunk. Every name is made up,
 * every sign fixed copy.
 *
 * - **St Aldwyn's** (`CHURCH`): an old Victorian Gothic church in soot-dark stone, older than the estate round it, on
 *   the block east of ns1s: the nave with its big window over the door facing Endswood Road, an aisle each side, the
 *   chancel at the back, the tower at its south-east corner and its spire, the only thing in the estate over the
 *   Emporium (the owner's exception, `SPIRE_TOP`). Its churchyard behind iron railings (`CHURCHYARD`, `RAIL_GATES`):
 *   the lychgate on the road in line with the zebra, a side gate on ns1s, yews, old headstones, two chest tombs, a
 *   cross, the noticeboard.
 * - **The parade** is endsblocks.ts's (a block of maisonettes over shops): its units' names and kinds here
 *   (`PARADE_UNITS`: the off-licence, the chicken shop, the launderette, the barber, the chippy, the newsagent, the
 *   phone repair shuttered, the tenants' hall), its canopy and the bollards along its forecourt.
 * - **The corner shops** (`CORNER_SHOPS`, scenery now: run for Dorras later), on Endswood Road's corners with ns1s and
 *   ns2s, a flat over each.
 * - **The abandoned buildings**: the Duke of Endswood (`PUB`), a corner pub boarded up, and the community centre
 *   (`CENTRE`), derelict, its shuttered front on the avenue's side; each with its way in round the back for the
 *   storyline (`back`, shut for now).
 * - **Bunker Sound** (`STUDIO`), the recording studio in two of Linnet Court's garages: the door open on foam, the ON
 *   AIR light, a sofa and an amp outside, the pirate aerial on Harrier Point's roof (`AERIAL`).
 * - **The green** (`GREEN`: worn grass behind low green railings, desire lines through its gaps, trees, benches, NO
 *   BALL GAMES), **the pitch** (`PITCH`: a ball court, red, behind a tall green fence), **the playground**
 *   (`PLAYGROUND`), the bin stores (`BIN_STORES`), CCTV on poles, the estate boards (`BOARDS`).
 * - **The road**: zebra crossings with their beacons (`ZEBRAS`, `BEACONS`), speed humps (`HUMPS`); the double yellow
 *   lines and zigzags are the drawing's.
 */
import { CIRCUS, ROAD_HALF, ROAD_Z, SLAB_Y, type Box, type Pt, type Rect } from './endswood';

/* ---------- St Aldwyn's ---------- */

export const CHURCH_NAME = "St Aldwyn's";
/** A part of the church: its walls' footprint, the eaves and the ridge (a lean-to's ridge is its top against the nave) */
export interface ChurchPart {
  rect: Rect;
  eaves: number;
  ridge: number;
  /** A gable roof along z (the nave, the chancel), or a lean-to falling away from the nave to the west or east */
  roof: 'gable' | 'w' | 'e';
}
const NAVE: ChurchPart = { rect: [25.5, 344, 32.5, 371], eaves: 6.2, ridge: 10.4, roof: 'gable' };
export const CHURCH = {
  nave: NAVE,
  aisles: [
    { rect: [22.8, 346.5, 25.5, 369], eaves: 3.6, ridge: 5.4, roof: 'w' },
    { rect: [32.5, 346.5, 35.2, 365.8], eaves: 3.6, ridge: 5.4, roof: 'e' },
  ] as ChurchPart[],
  chancel: { rect: [26.5, 338.6, 31.5, 344], eaves: 5.2, ridge: 8.4, roof: 'gable' } as ChurchPart,
  /** The tower at the nave's south-east corner: its square shaft to its parapet, its pinnacles, the spire's foot's
   * half-width and its top */
  tower: { rect: [32.5, 366.3, 37.5, 371.3] as Rect, top: 12.4, pinnacle: 14, spire: 1.9 },
  /** The west door under the big window (it faces the road), and the side door in the west aisle */
  door: [29, 371] as Pt,
  side: [22.8, 356.2] as Pt,
  /** The big window over the door (lit at night): its sill and its point */
  window: { x0: 27, x1: 31, y0: 2.6, y1: 6.9 },
};
/** The spire's tip: the one thing in the estate over the Emporium (the owner's exception) */
export const SPIRE_TOP = 22.5;
export const CHURCH_PARTS: ChurchPart[] = [CHURCH.nave, ...CHURCH.aisles, CHURCH.chancel];

/** The churchyard's railings round the block (inside its edge) and their gates: the lychgate on Endswood Road in line
 * with the door, the side gate on ns1s in line with the side door */
export const CHURCHYARD: Rect = [19.9, 335.4, 40.1, 377.1];
/** The railings stand on a dwarf wall `t` thick (what's solid), `wall` tall */
export const RAIL = { h: 1.15, t: 0.26, wall: 0.34 };
export const RAIL_GATES = {
  lych: { side: 's' as const, a: 28, b: 30 },
  side: { side: 'w' as const, a: 355.4, b: 357 },
};
/** The lychgate over the main gate: its four posts and its roof */
export const LYCHGATE = { x0: 27.7, x1: 30.3, z0: 376.3, z1: 377.5, eaves: 1.9, ridge: 2.9 };
export const YEWS: Pt[] = [
  [21.4, 374.4],
  [37.9, 374.6],
  [38.8, 358.5],
  [21.2, 340.6],
  [38.6, 339],
];
export const YEW = { trunk: 0.26, r: 1.15, h: 3.9 };
export const CHEST_TOMBS: Pt[] = [
  [37.7, 346],
  [21.3, 364.2],
];
export const TOMB = { w: 1.5, d: 0.75, h: 0.62 };
/** The churchyard cross on its steps, by the path */
export const CROSS: Pt = [24.4, 374.4];
/** The noticeboard inside the lychgate, facing the road */
export const NOTICEBOARD: Pt = [32, 376.6];
/** The paths: the lychgate to the door, the side gate to the side door */
export const PATHS: Rect[] = [
  [28.2, 371, 29.8, 377.1],
  [19.9, 355.4, 22.8, 357],
];
const r01 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const inRect = (x: number, z: number, [x0, z0, x1, z1]: Rect, m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;
/** The headstones (x, z, how far each leans, which way it faces: 0 the road's way, south): in rows east and west of the
 * church and behind it, clear of the church, the paths, the yews, the tombs and the cross */
export const HEADSTONE = { w: 0.55, d: 0.12, h: 0.62 };
export const HEADSTONES: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  const areas: Rect[] = [
    [36.1, 336.2, 39.5, 365.6],
    [20.5, 342.2, 22.1, 368.4],
    [20.5, 336.1, 39.5, 337.9],
  ];
  const taken: Rect[] = [...CHURCH_PARTS.map((p) => p.rect), CHURCH.tower.rect, ...PATHS];
  let n = 0;
  for (const [x0, z0, x1, z1] of areas)
    for (let z = z0 + 0.4; z < z1 - 0.3; z += 1.35)
      for (let x = x0 + 0.4; x < x1 - 0.3; x += 1.6) {
        const k = n++;
        if (r01(k) < 0.28) continue;
        const [hx, hz] = [x + (r01(k + 500) - 0.5) * 0.3, z];
        if (taken.some((t) => inRect(hx, hz, t, 0.8))) continue;
        if (YEWS.some(([yx, yz]) => Math.hypot(hx - yx, hz - yz) < YEW.r + 0.4)) continue;
        if (CHEST_TOMBS.some(([tx, tz]) => Math.abs(hx - tx) < TOMB.w / 2 + 0.6 && Math.abs(hz - tz) < TOMB.d / 2 + 0.6)) continue;
        if (out.some(([ox, oz]) => Math.abs(ox - hx) < 0.9 && Math.abs(oz - hz) < 0.9)) continue;
        out.push([hx, hz, (r01(k + 900) - 0.5) * 0.3]);
      }
  return out;
})();

/* ---------- The parade's units (the block is endsblocks.ts's `parade`) ---------- */

export type UnitKind = 'offy' | 'chicken' | 'launderette' | 'barber' | 'chippy' | 'news' | 'phone' | 'hall';
export interface Unit {
  name: string;
  kind: UnitKind;
  /** Its shutter down (shut for good) */
  shut?: true;
}
/** West to east along the parade's front */
export const PARADE_UNITS: Unit[] = [
  { name: 'ENDS WINES', kind: 'offy' },
  { name: 'WINGZ PALACE', kind: 'chicken' },
  { name: 'SUDS', kind: 'launderette' },
  { name: 'TOP CUTZ', kind: 'barber' },
  { name: 'ENDSWOOD FISH BAR', kind: 'chippy' },
  { name: 'PARADE NEWS', kind: 'news' },
  { name: 'PHONE DOC', kind: 'phone', shut: true },
  { name: "TENANTS' HALL", kind: 'hall' },
];
/** The parade's front (its north face) and its width; each unit's share of it */
export const PARADE = { x0: -41, x1: -11, z: 385.8, back: 393.4, storeys: 2 };
export const unitX = (k: number): [number, number] => {
  const w = (PARADE.x1 - PARADE.x0) / PARADE_UNITS.length;
  return [PARADE.x0 + k * w, PARADE.x0 + (k + 1) * w];
};
/** The canopy over the shopfronts, out over the forecourt (over a walker's head) */
export const CANOPY = { out: 1.2, y: SLAB_Y + 1.48, t: 0.12 };
/** The concrete bollards along the forecourt's kerb (x, z): no car mounts it */
export const BOLLARD = { r: 0.16, h: 0.75 };

/* ---------- Corner shops, the pub, the community centre ---------- */

export interface CornerShop {
  id: string;
  name: string;
  rect: Rect;
  /** Its shopfront on the road (south) and round the corner on the side street's face */
  side: 'e' | 'w';
  /** The flat over it: its roof */
  h: number;
}
export const CORNER_SHOPS: CornerShop[] = [
  { id: 'lucky', name: 'LUCKY STAR', rect: [10.3, 372.4, 14.1, 377.1], side: 'e', h: 2.9 },
  { id: 'nightday', name: 'NIGHT & DAY', rect: [45.9, 372.6, 51.5, 377.1], side: 'w', h: 2.9 },
];
/** The Duke of Endswood, a corner pub on the avenue and the road, boarded up: two brick storeys under a hipped slate
 * roof, its hanging sign faded; its way in round the back (later) */
export const PUB = { name: 'THE DUKE OF ENDSWOOD', rect: [0.4, 383, 8.4, 390.4] as Rect, eaves: 3.4, ridge: 4.9, back: [4.4, 390.9] as Pt };
/** The community centre, derelict: a flat-roofed single storey, its hall standing higher at the west end, boarded,
 * the sign missing letters; its way in round the back (later) */
export const CENTRE = { name: 'ENDSWOOD COMMUNITY CENTRE', rect: [-48, 410, -30, 423.5] as Rect, h: 2.5, hall: [-48, 410, -40, 423.5] as Rect, hallH: 3.7, back: [-39, 424] as Pt, front: [-29.5, 416.8] as Pt };

/* ---------- Bunker Sound ---------- */

/** In two of Linnet Court's garages on its north face (endsblocks.ts `linnet`): the converted front, the sofa and amp
 * outside on the yard, the pirate aerial on Harrier Point's roof */
export const STUDIO = {
  name: 'BUNKER SOUND',
  x0: -83,
  x1: -77.5,
  z: 352,
  door: [-79.4, 351.4] as Pt,
  sofa: [-82.4, 348.5, -80.2, 349.4] as Rect,
  amp: [-77.3, 350.6, -76.7, 351.2] as Rect,
};
export const SOFA_H = 0.48;
export const AMP_H = 0.55;
/** On Harrier Point's roof (its top `ROOF_AT`), under the Emporium */
export const AERIAL = { x: -24, z: 356.4, foot: SLAB_Y + 1.5 + 9, top: 12.1 };

/* ---------- The green, the pitch, the playground ---------- */

/** Worn grass behind low green railings, gaps where the desire lines go through */
export const GREEN = {
  rect: [-52.2, 347.4, -38.6, 365.4] as Rect,
  gaps: { s: [-50.6, -49.2], n: [-41.2, -39.8], e: [355.8, 357.2] } as Record<'n' | 's' | 'e' | 'w', [number, number] | undefined>,
  /** The desire lines: from the south gap to the north one, from the east gap to the south one */
  lines: [
    [
      [-49.9, 365.4],
      [-40.5, 347.4],
    ],
    [
      [-38.6, 356.5],
      [-49.9, 365.4],
    ],
  ] as [Pt, Pt][],
  trees: [
    [-48.2, 351.2],
    [-41.6, 362.6],
    [-51, 358.4],
  ] as Pt[],
  benches: [
    [-45, 364.6],
    [-51.4, 352.5],
  ] as Pt[],
  sign: [-46.6, 365.1] as Pt,
};
export const LOW_RAIL = { h: 0.8, t: 0.06 };
/** The ball court: a red surface behind a tall green fence, its gate on the south */
export const PITCH = { rect: [-20.8, 348.4, -10.4, 366.4] as Rect, h: 3, gate: [-16.2, -15] as [number, number] };
export const PLAYGROUND = {
  rect: [1.2, 393.6, 13.4, 406.6] as Rect,
  gate: [6.4, 7.6] as [number, number],
  swings: { x0: 2.6, x1: 7, z: 397.2, h: 2 },
  slide: [10, 395.4, 12.6, 400.6] as Rect,
  springers: [
    [4, 403],
    [6.2, 404.6],
  ] as Pt[],
  roundabout: [10.6, 403.8] as Pt,
  benches: [[2.3, 405.6]] as Pt[],
};

/* ---------- Street furniture ---------- */

/** The bin stores: engineering brick, louvred steel doors (rect, 1.6 tall) */
export const BIN_STORES: Rect[] = [
  [-104.8, 353.2, -102.6, 355.6],
  [-35.4, 362.2, -33, 363.6],
  [10.4, 343.5, 12.8, 345.9],
  [35.2, 400, 37.6, 402.4],
  [56.3, 410, 58.7, 412.4],
  [-71.3, 395, -68.9, 397.4],
];
export const BIN_H = 1.6;
/** CCTV cameras on poles (x, z, the way the camera looks) */
export const CCTV: [number, number, number][] = [
  [-38.2, 376.6, Math.PI * 0.75],
  [-11.6, 384.2, -Math.PI * 0.6],
  [-21.5, 367.4, Math.PI],
  [14, 383.4, -Math.PI * 0.25],
];
export const POLE = { r: 0.07, h: 4.2 };
/** The estate boards (ENDSWOOD ESTATE and the blocks' names) at the ways in off the avenues (x, z, the way it faces) */
export const BOARDS: { at: Pt; n: Pt }[] = [
  { at: [-10.4, 375.8], n: [1, 0] },
  { at: [59.4, 383.4], n: [1, 0] },
];
export const BOARD = { w: 2.2, h: 1.3, foot: 0.9 };

/** The zebra crossings over Endswood Road: by Harrier Point to the parade, from the church's lychgate to Marten House */
export const ZEBRAS: number[] = [-28, 29];
export const ZEBRA_W = 2.5;
/** Their beacons (x, z): one at each end, on the sidewalks */
export const BEACONS: Pt[] = ZEBRAS.flatMap((x): Pt[] => [
  [x + ZEBRA_W / 2 + 0.35, ROAD_Z - ROAD_HALF - 0.45],
  [x - ZEBRA_W / 2 - 0.35, ROAD_Z + ROAD_HALF + 0.45],
]);
export const BEACON = { r: 0.06, h: 2.3, globe: 0.17 };
/** Speed humps across the road, clear of the junctions and the zebras (their zigzags reach `ZIGZAG` either side) */
export const HUMPS: number[] = [-38, 8, 53];
export const ZIGZAG = 6;
/** The road's double yellow lines run its length but at the junctions (`JUNCTIONS`, `JUNCTION_GAP` either side) and the
 * zigzags */
export const JUNCTIONS: number[] = [CIRCUS.x + CIRCUS.r, -4.5, 17, 43, 64.5];
export const JUNCTION_GAP = 5.5;

/** The forecourt's bollards along its kerb, clear of the beacons and the lamps on the sidewalk by it */
export const FORECOURT_BOLLARDS: Pt[] = (() => {
  const out: Pt[] = [];
  const z = ROAD_Z + ROAD_HALF + 0.8 + 0.4;
  for (let x = PARADE.x0 + 0.8; x < PARADE.x1 - 0.5; x += 2.4) if (BEACONS.every(([bx, bz]) => Math.hypot(bx - x, bz - z) > 1.2)) out.push([x, z]);
  return out;
})();

/** The estate's trees (x, z, size): on the green, in the churchyard, by the playground, overgrown round the
 * community centre (the boot's, index.ts `addTree()`) */
export const ENDS_TREES: [number, number, number][] = [
  ...GREEN.trees.map(([x, z]): [number, number, number] => [x, z, 0.95]),
  [23.6, 340.4, 1],
  [36.8, 341.6, 0.9],
  [2.4, 409.6, 0.85],
  [12.4, 410.2, 0.8],
  [-51, 412, 0.8],
  [-27.6, 418, 0.75],
];

/* ---------- What's solid ---------- */

const square = ([x, z]: Pt, r: number, h: number): Box => [x - r, z - r, x + r, z + r, h];
/** A rect's four sides as thin runs, `t` thick inside it, with gaps left open (each side's [a, b] along it) */
export function runsOf([x0, z0, x1, z1]: Rect, t: number, gaps: Partial<Record<'n' | 's' | 'e' | 'w', [number, number]>> = {}): Rect[] {
  const out: Rect[] = [];
  const along = (side: 'n' | 's' | 'e' | 'w', a: number, c: number, make: (p: number, q: number) => Rect) => {
    const g = gaps[side];
    if (g) {
      if (g[0] > a) out.push(make(a, g[0]));
      if (g[1] < c) out.push(make(g[1], c));
    } else out.push(make(a, c));
  };
  along('n', x0, x1, (p, q) => [p, z0, q, z0 + t]);
  along('s', x0, x1, (p, q) => [p, z1 - t, q, z1]);
  along('w', z0 + t, z1 - t, (p, q) => [x0, p, x0 + t, q]);
  along('e', z0 + t, z1 - t, (p, q) => [x1 - t, p, x1, q]);
  return out;
}
export const CHURCHYARD_RUNS = runsOf(CHURCHYARD, RAIL.t, { s: [RAIL_GATES.lych.a, RAIL_GATES.lych.b], w: [RAIL_GATES.side.a, RAIL_GATES.side.b] });
export const GREEN_RUNS = runsOf(GREEN.rect, LOW_RAIL.t, GREEN.gaps as Partial<Record<'n' | 's' | 'e' | 'w', [number, number]>>);
export const PITCH_RUNS = runsOf(PITCH.rect, 0.08, { s: PITCH.gate });
export const PLAY_RUNS = runsOf(PLAYGROUND.rect, LOW_RAIL.t, { n: PLAYGROUND.gate });

const box = (r: Rect, h: number): Box => [r[0], r[1], r[2], r[3], h];
export const STREET_SOLIDS: Box[] = [
  // St Aldwyn's: the church to its ridges, the tower to its parapet; the railings, the lychgate's posts, the yews'
  // trunks, the tombs, the cross and the headstones
  ...CHURCH_PARTS.map((p) => box(p.rect, p.ridge)),
  box(CHURCH.tower.rect, CHURCH.tower.top),
  ...CHURCHYARD_RUNS.map((r) => box(r, RAIL.h)),
  ...[LYCHGATE.x0, LYCHGATE.x1].flatMap((x) => [LYCHGATE.z0, LYCHGATE.z1].map((z) => square([x + (x < 29 ? 0.1 : -0.1), z + (z < 377 ? 0.1 : -0.1)], 0.1, LYCHGATE.eaves))),
  ...YEWS.map((p) => square(p, YEW.trunk, 2)),
  ...CHEST_TOMBS.map(([x, z]): Box => [x - TOMB.w / 2, z - TOMB.d / 2, x + TOMB.w / 2, z + TOMB.d / 2, TOMB.h]),
  square(CROSS, 0.45, 2.2),
  ...HEADSTONES.map(([x, z]): Box => [x - HEADSTONE.w / 2, z - HEADSTONE.d / 2, x + HEADSTONE.w / 2, z + HEADSTONE.d / 2, HEADSTONE.h]),
  // The corner shops, the pub, the community centre
  ...CORNER_SHOPS.map((s) => box(s.rect, s.h + 0.25)),
  box(PUB.rect, PUB.ridge),
  box(CENTRE.rect, CENTRE.h + 0.2),
  box(CENTRE.hall, CENTRE.hallH + 0.2),
  // Bunker Sound's sofa and amp, the aerial's foot is on a roof
  box(STUDIO.sofa, SOFA_H),
  box(STUDIO.amp, AMP_H),
  // The green's, the pitch's and the playground's railings and fence, the slide and the swings' frame
  ...GREEN_RUNS.map((r) => box(r, LOW_RAIL.h)),
  ...PITCH_RUNS.map((r) => box(r, PITCH.h)),
  ...PLAY_RUNS.map((r) => box(r, LOW_RAIL.h)),
  box(PLAYGROUND.slide, 1.6),
  ...[PLAYGROUND.swings.x0, PLAYGROUND.swings.x1].map((x) => square([x, PLAYGROUND.swings.z], 0.12, PLAYGROUND.swings.h)),
  // Street furniture: bin stores, CCTV poles, the estate boards' posts, the beacons, the forecourt's bollards
  ...BIN_STORES.map((r) => box(r, BIN_H)),
  ...CCTV.map(([x, z]) => square([x, z], POLE.r, POLE.h)),
  ...BOARDS.flatMap(({ at: [x, z], n }) => [-1, 1].map((k) => square([x + (n[0] ? 0 : k * (BOARD.w / 2 - 0.1)), z + (n[0] ? k * (BOARD.w / 2 - 0.1) : 0)], 0.06, BOARD.foot + BOARD.h))),
  ...BEACONS.map((p) => square(p, BEACON.r, BEACON.h)),
  ...FORECOURT_BOLLARDS.map((p) => square(p, BOLLARD.r, BOLLARD.h)),
];
