/*
 * The country roads (docs/highway-plan.md Phase 7, the owner's call; DOM-free, tested in tests/rural.test.ts): past
 * the ring highway and whatever stands along them (a district, a junction), the grid's roads run on out to the world's
 * edge as two-lane country roads: one lane each way between white edge lines, a grass verge, a ditch and a post-and-rail
 * fence each side with a field gate now and then, the odd lamp, and a turning loop near the edge so a little traffic
 * drives them out and back.
 *
 * - `ruralSplit()` (called by streetplan.ts's `cityPlan()` with what stands beside the roads): each grid road's town
 *   piece keeps its id and ends where the country starts (`RURAL.lead` past the last thing beside it); the country piece
 *   is a street of kind `rural` (`<id>-<end>`: `w`, `e`, `n` or `s`) with an unlit crossing where they meet, and its
 *   turning loop at the far end (`<id>-<end>-turn`, one way round).
 * - `RURAL` the sizes across; `RURAL_RUNS` (filled by the split: each country road's line), `onRural()`;
 *   `RURAL_LAMPS` (at the boot), `RURAL_KEEPS` (the trees keep off the fences: landuse.ts), `GATES`.
 */
import type { Pt } from './streetplan';
import { EXT, LANE, RIVER } from './layout';
import { fromHighway } from './highway';

type Rect = [number, number, number, number];
/** A street as the plan holds it (streetplan.ts `Street`, without the import loop) */
interface PlanStreet {
  id: string;
  kind: string;
  pts: Pt[];
  half: number;
  lanes: number;
  oneway?: 1 | -1;
  loop?: boolean;
}
interface PlanCrossing {
  id: string;
  at: Pt;
  streets: string[];
  lights: boolean;
}

/** Across a country road (offsets from its centre line): the asphalt, the verge, the ditch, the fence's line */
export const RURAL = {
  half: LANE,
  verge: [LANE, LANE + 1.4] as [number, number],
  ditch: [LANE + 1.4, LANE + 2.4] as [number, number],
  fence: LANE + 2.8,
  /** How far past the last thing beside it the country starts, and how close that thing may stand to the road */
  lead: 14,
  near: 14,
  /** The turning loop's radius, and how far its far side stays inside the world's edge */
  turn: 6,
  edge: 12,
  /** A bank avenue's stub inland to its turning loop */
  stub: 12,
  /** The shortest country road worth one */
  min: 60,
  /** Between the lamps, and between the field gates in a fence */
  lampGap: 140,
  gateGap: 70,
};
/** The grid's roads that run out to the world's edge (layout.ts NS_ROADS / EW_ROADS, their pieces in the plan) */
export const GRID = ['ns0', 'ns0s', 'ns1s', 'ns2s', 'ns3', 'ew0', 'ew1', 'ew1e', 'ew2', 'ew2e', 'ew3', 'ew4'];

/** A country road: its plan street, which axis it runs along, its line (c across, from its start to its end along) */
export interface RuralRun {
  id: string;
  /** The grid road it carries on */
  of: string;
  axis: 'x' | 'z';
  c: number;
  /** Along its axis: where it leaves the town's piece, and where its turning loop is (its end) */
  from: number;
  to: number;
  /** Which way it runs out: +1 or -1 along its axis */
  out: 1 | -1;
  /**
   * Where its turning loop is: straight on past its end, or (a bank avenue's, with the river beside it) up a short stub
   * inland from its end (`stub`: the stub's street, its far end); the loop's centre
   */
  stub?: { id: string; end: Pt };
  centre: Pt;
}
export const RURAL_RUNS: RuralRun[] = [];

/** Which way inland a road along the river's banks turns off to its loop (a bank avenue's: -1 north, +1 south), else 0 */
const riverward = (axis: 'x' | 'z', c: number): 0 | 1 | -1 => (axis !== 'x' ? 0 : c < RIVER[0] && RIVER[0] - c < 12 ? -1 : c > RIVER[1] && c - RIVER[1] < 12 ? 1 : 0);

const inRect = (r: Rect, x: number, z: number, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;

/**
 * Split the grid's roads where the country starts (in place): `beside` is what stands near the roads (the blocks'
 * and the open districts' rects); the crossings on each road and the ring highway count too
 */
export function ruralSplit(streets: PlanStreet[], crossings: PlanCrossing[], beside: Rect[]) {
  RURAL_RUNS.length = 0;
  for (const id of GRID) {
    const s = streets.find((q) => q.id === id);
    if (!s) continue;
    const [a, b] = [s.pts[0], s.pts[s.pts.length - 1]];
    const axis: 'x' | 'z' = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]) ? 'x' : 'z';
    const c = axis === 'x' ? a[1] : a[0];
    const at = (v: number): Pt => (axis === 'x' ? [v, c] : [c, v]);
    const along = (p: Pt) => (axis === 'x' ? p[0] : p[1]);
    const lo = Math.min(along(a), along(b));
    const hi = Math.max(along(a), along(b));
    const mine = crossings.filter((k) => k.streets.includes(id)).map((k) => along(k.at));
    let [from, to] = [lo, hi];
    for (const out of [-1, 1] as const) {
      const edge = out < 0 ? EXT[0] : EXT[1];
      if ((out < 0 ? lo : hi) !== edge) continue;
      // From the edge inward, the first thing beside the road
      let stop = out < 0 ? hi : lo;
      for (let v = edge; out < 0 ? v < hi : v > lo; v -= out * 1) {
        const [x, z] = at(v);
        const hit = mine.some((m) => Math.abs(m - v) < 1) || fromHighway(x, z) < 30 || beside.some((r) => inRect(r, x, z, RURAL.near));
        if (hit) {
          stop = v;
          break;
        }
      }
      const start = stop + out * RURAL.lead;
      const end = edge - out * (RURAL.edge + RURAL.turn * 2 + RURAL.half);
      if ((end - start) * out < RURAL.min) continue;
      const rid = `${id}-${axis === 'x' ? (out < 0 ? 'w' : 'e') : out < 0 ? 'n' : 's'}`;
      streets.push({ id: rid, kind: 'rural', pts: [at(start), at(end)], half: RURAL.half, lanes: 1 });
      crossings.push({ id: `${rid}-join`, at: at(start), streets: [id, rid], lights: false });
      // Its turning loop: straight on past its end, or up a stub inland where the river runs beside it
      const inland = riverward(axis, c);
      let entry = at(end);
      let dir: Pt = axis === 'x' ? [out, 0] : [0, out];
      let stub: RuralRun['stub'];
      if (inland) {
        dir = [0, inland];
        const far: Pt = [entry[0], entry[1] + inland * RURAL.stub];
        streets.push({ id: `${rid}-stub`, kind: 'rural', pts: [entry, far], half: RURAL.half, lanes: 1 });
        crossings.push({ id: `${rid}-fork`, at: entry, streets: [rid, `${rid}-stub`], lights: false });
        stub = { id: `${rid}-stub`, end: far };
        entry = far;
      }
      const centre: Pt = [entry[0] + dir[0] * RURAL.turn, entry[1] + dir[1] * RURAL.turn];
      RURAL_RUNS.push({ id: rid, of: id, axis, c, from: start, to: end, out, stub, centre });
      // (one way round, starting where its road meets it)
      const n = 24;
      const a0 = Math.atan2(entry[1] - centre[1], entry[0] - centre[0]);
      const ring: Pt[] = [];
      for (let k = 0; k < n; k++) {
        const t = a0 - (k / n) * Math.PI * 2;
        ring.push([+(centre[0] + Math.cos(t) * RURAL.turn).toFixed(4), +(centre[1] + Math.sin(t) * RURAL.turn).toFixed(4)]);
      }
      ring[0] = entry;
      const way = stub ? stub.id : rid;
      streets.push({ id: `${rid}-turn`, kind: 'rural', pts: ring, half: RURAL.half, lanes: 1, oneway: 1, loop: true });
      crossings.push({ id: `${rid}-end`, at: entry, streets: [way, `${rid}-turn`], lights: false });
      if (out < 0) from = start;
      else to = start;
    }
    s.pts = s.pts.filter((p) => along(p) > from + 1e-6 && along(p) < to - 1e-6);
    s.pts.unshift(at(from));
    s.pts.push(at(to));
    if (along(a) > along(b)) s.pts.reverse();
  }
}

/** Is x, z on a country road's asphalt (`m` round it) */
export function onRural(x: number, z: number, m = 0) {
  return RURAL_RUNS.some((r) => {
    const [u, v] = r.axis === 'x' ? [x, z] : [z, x];
    const [a, b] = [Math.min(r.from, r.to), Math.max(r.from, r.to)];
    return Math.abs(v - r.c) <= RURAL.half + m && u >= a - m && u <= b + m;
  });
}
