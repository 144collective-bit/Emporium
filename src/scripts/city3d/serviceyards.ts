/*
 * The riverside's service yards dressed (the polish plan's Phase 7; DOM-free,
 * tested in tests/serviceyards.test.ts), drawn by riverside3d.ts. Behind the
 * riverside's landmarks (riverside.ts `YARD_Z`: their lots stop there) and in
 * front of Trench Avenue's strip of brownstones (its one row's backs at
 * `STRIP_D` in from the avenue) each of row A's blocks has a service yard on
 * the block's worn concrete. Bare until now; each gets, on its own numbers:
 *
 * - wheelie bins in a row against the strip's back wall (`bins`), a wall
 *   lamp over them (`lamps`: a caged lamp on the brownstones' back, its
 *   light pooled below) and a stack of pallets further along (`pallets`);
 * - crates by the landmark's lot line (`crates`);
 * - a white box van parked across the two deeper yards (the Pier House's and
 *   the club's, `vans`: the traffic's Box Van, through `parkedCars()`).
 *
 * Everything keeps off the rows' alleys (their way through to the yard stays
 * clear), inside its yard, and is solid (`YARD_SOLIDS` in SOLIDS: the bins,
 * pallets, crates and vans; the lamps are on a wall). Nothing that exists
 * moves. Phones leave the bins' lids and the pallets' blocks out (riverside3d.ts).
 */
import type { Footprint, Rect } from './downtown';
import { BLOCK_RECT, CLUB_LOT, PIER_HOUSE, REFINERY, RIVER_BLOCKS, STORES, STRIP_D, WHARF } from './riverside';
import { rows } from './projects';
import { CARS, type CarId } from './carspec';

export type YardKind = 'bin' | 'pallets' | 'crates';
export interface YardProp {
  kind: YardKind;
  box: Rect;
  h: number;
}
export interface YardLamp {
  /** On the strip's back wall (x, z), facing north into the yard, this high */
  x: number;
  z: number;
  y: number;
}
export interface YardVan {
  id: CarId;
  x: number;
  z: number;
  ry: number;
  paint: string;
}
export interface Yard {
  block: string;
  /** The yard's land: from the landmark's lot line to the strip's back wall, in from the block's sides */
  rect: Rect;
  /** The strip's back wall (z) */
  wall: number;
  props: YardProp[];
  lamps: YardLamp[];
  vans: YardVan[];
}

/** The bins, pallets and crates: their sizes */
export const BIN = { w: 0.6, d: 0.62, h: 1.05 };
export const PALLETS = { w: 1.2, d: 1.0, h: 0.62 };
export const CRATES = { w: 0.9, d: 0.9, h: 0.95 };
/** How far in from a yard's sides and ends the dressing keeps, and how wide an alley's way through stays clear */
const IN = 0.6;
const ALLEY_CLEAR = 1.0;
const VAN_PAINT = '#f3f2f7';

/** Each landmark lot's south edge on a block (the yard's north line) */
const LOT_LINE: Record<string, number> = {
  'trench-a0': Math.max(WHARF.lot[3], REFINERY.lot[3]),
  'trench-a1': STORES.lot[3],
  'trench-a2': PIER_HOUSE.lot[3],
  'trench-a3': CLUB_LOT[3],
};

const overlaps = (a: Rect, b: Rect, m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
const carRect = (id: CarId, x: number, z: number, ry: number): Rect => {
  const { L, W } = CARS[id];
  const c = Math.abs(Math.cos(ry));
  const s = Math.abs(Math.sin(ry));
  return [x - (L * c + W * s) / 2, z - (L * s + W * c) / 2, x + (L * c + W * s) / 2, z + (L * s + W * c) / 2];
};

export const YARDS: Yard[] = RIVER_BLOCKS.map((block, i) => {
  const [bx0, , bx1, bz1] = BLOCK_RECT[block];
  const wall = bz1 - STRIP_D;
  const rect: Rect = [bx0 + IN, LOT_LINE[block] + 0.2, bx1 - IN, wall - 0.05];
  const W = rect[2] - rect[0];
  // The rows' alleys through the strip: their way on into the yard stays clear
  const laid = rows().byBlock[i];
  const ways: Rect[] = laid.alleys.map((a) => [a.box[0] - ALLEY_CLEAR, rect[1], a.box[2] + ALLEY_CLEAR, rect[3]]);
  const clear = (r: Rect) => r[0] >= rect[0] && r[2] <= rect[2] && r[1] >= rect[1] && r[3] <= rect[3] && !ways.some((w) => overlaps(r, w));
  /** A box `w` x `d` centred on x against the back wall (or on the lot line), moved along by `step` until it's clear */
  const place = (kind: YardKind, cx: number, w: number, d: number, h: number, atWall: boolean, step: number): YardProp | null => {
    for (let k = 0; k < 6; k++) {
      const x = cx + k * step;
      const box: Rect = atWall ? [x - w / 2, rect[3] - d, x + w / 2, rect[3]] : [x - w / 2, rect[1], x + w / 2, rect[1] + d];
      if (clear(box)) return { kind, box, h };
    }
    return null;
  };
  const props: YardProp[] = [];
  const lamps: YardLamp[] = [];
  // Three bins in a row against the back wall, a lamp over the middle one
  const binsAt = rect[0] + W * (0.16 + 0.04 * (i % 2));
  const bins = [0, 1, 2].map((k) => place('bin', binsAt + k * (BIN.w + 0.08), BIN.w, BIN.d, BIN.h, true, 2.6)).filter((p): p is YardProp => !!p);
  props.push(...bins);
  if (bins.length) lamps.push({ x: (bins[0].box[0] + bins[bins.length - 1].box[2]) / 2, z: wall - 0.02, y: 2.3 });
  const pallets = place('pallets', rect[2] - W * (0.2 + 0.05 * (i % 2)), PALLETS.w, PALLETS.d, PALLETS.h, true, -2.4);
  if (pallets) props.push(pallets);
  const crates = place('crates', rect[0] + W * (0.46 + 0.06 * (i % 3)), CRATES.w, CRATES.d, CRATES.h, false, 2.2);
  if (crates) props.push(crates);
  // A van across the deeper yards, parked along the yard, its nose east or west in turn
  const vans: YardVan[] = [];
  if (rect[3] - rect[1] > 3.5) {
    const ry = i % 2 ? Math.PI : 0;
    for (const u of [0.58, 0.7, 0.4, 0.3]) {
      const x = rect[0] + W * u;
      const z = (rect[1] + rect[3]) / 2 + 0.15;
      const r = carRect('van', x, z, ry);
      if (clear(r) && !props.some((p) => overlaps(p.box, r, 0.4))) {
        vans.push({ id: 'van', x, z, ry, paint: VAN_PAINT });
        break;
      }
    }
  }
  return { block, rect, wall, props, lamps, vans };
});

/** What's solid in the yards: the bins, pallets, crates and the vans (in SOLIDS) */
export const YARD_SOLIDS: Footprint[] = YARDS.flatMap((y) => [...y.props.map((p): Footprint => [...p.box, p.h]), ...y.vans.map((v): Footprint => [...carRect(v.id, v.x, v.z, v.ry), 1.3])]);
