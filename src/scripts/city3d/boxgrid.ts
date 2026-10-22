/*
 * The collision grid (docs/growth-plan.md Phase 1; DOM-free, tested in
 * tests/boxgrid.test.ts): solid boxes sorted into square cells, so a check
 * only looks at the boxes near it instead of every box in the city. It
 * gives exactly the answers the one-by-one check gives: a query returns
 * every box whose footprint touches the area asked about (more than the
 * check needs, never fewer), in the order the list had them, and the caller
 * runs its own test on those. Walking, the walk camera, bullets (here and on
 * the game server), driving and flying use it; the city grows without the
 * checks getting slower.
 */
import type { Box } from './solids';

/** How big a cell is, in tiles: a few cars long, so most checks touch one to four cells */
export const CELL = 8;

export class BoxGrid {
  private list: Box[];
  private cells = new Map<number, number[]>();
  private seen: Int32Array;
  private stamp = 0;

  constructor(boxes: readonly Box[], readonly cell = CELL) {
    this.list = [];
    this.seen = new Int32Array(0);
    this.add(boxes);
  }

  /** Every box, in the order they were given */
  get boxes(): readonly Box[] {
    return this.list;
  }

  /** More boxes, after those already in (a district built later: growth plan Phase 4) */
  add(boxes: readonly Box[]) {
    const from = this.list.length;
    this.list.push(...boxes);
    const seen = new Int32Array(this.list.length);
    seen.set(this.seen);
    this.seen = seen;
    boxes.forEach((b, n) => {
      const i = from + n;
      for (let cx = this.ix(b[0]); cx <= this.ix(b[2]); cx++)
        for (let cz = this.ix(b[1]); cz <= this.ix(b[3]); cz++) {
          const k = key(cx, cz);
          let list = this.cells.get(k);
          if (!list) this.cells.set(k, (list = []));
          list.push(i);
        }
    });
  }

  private ix(v: number) {
    return Math.floor(v / this.cell);
  }

  /**
   * Every box whose footprint touches the rectangle x0..x1, z0..z1 (edges
   * included), in the list's own order. `out` is filled and returned.
   */
  query(x0: number, z0: number, x1: number, z1: number, out: Box[] = []): Box[] {
    out.length = 0;
    if (++this.stamp > 0x3fffffff) {
      this.stamp = 1;
      this.seen.fill(0);
    }
    const hits: number[] = [];
    for (let cx = this.ix(x0); cx <= this.ix(x1); cx++)
      for (let cz = this.ix(z0); cz <= this.ix(z1); cz++) {
        const list = this.cells.get(key(cx, cz));
        if (!list) continue;
        for (const i of list) {
          if (this.seen[i] === this.stamp) continue;
          this.seen[i] = this.stamp;
          const b = this.list[i];
          if (b[2] < x0 || b[0] > x1 || b[3] < z0 || b[1] > z1) continue;
          hits.push(i);
        }
      }
    // In the list's own order, so anything that works through them in turn (the car's pushes) does the same
    hits.sort((a, b) => a - b);
    for (const i of hits) out.push(this.list[i]);
    return out;
  }

  /** The boxes within `r` of a point's footprint square (what an `inBox(b, x, z, r)` check can be true for) */
  near(x: number, z: number, r: number, out?: Box[]) {
    return this.query(x - r, z - r, x + r, z + r, out);
  }

  /** The boxes a ray's flat shadow passes over, from `from` along `dir` for `max` (padded by `pad` either side) */
  alongRay(from: { x: number; z: number }, dir: { x: number; z: number }, max: number, pad = 0, out?: Box[]) {
    const x1 = from.x + dir.x * max;
    const z1 = from.z + dir.z * max;
    return this.query(Math.min(from.x, x1) - pad, Math.min(from.z, z1) - pad, Math.max(from.x, x1) + pad, Math.max(from.z, z1) + pad, out);
  }
}

/** A cell's key: both indices in one number (cells run to about ±500,000 either way) */
const key = (cx: number, cz: number) => (cx + 0x80000) * 0x100000 + (cz + 0x80000);
