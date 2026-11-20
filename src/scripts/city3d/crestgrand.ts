/**
 * Crestmont's houses upgraded (docs/crestmont-plan.md, the premium upgrade's Phase 2; the owner's answers,
 * 2026-11-19): balconies by style, roof terraces on the hill mansions only, wrought-iron gates between lit stone piers
 * on every estate and mansion (a modern house's a slatted gate), phones trimmed as now. DOM-free, the rules only, in
 * each house's own frame (u along its front, v out to its street); drawn by estates3d.ts and mansions3d.ts, tested in
 * tests/crestgrand.test.ts.
 *
 * - **Balconies** (`estateBalconies()`, `mansionBalconies()`): wrought iron on a Spanish house (one across the two
 *   upper windows over its door), a villa (one at each upper front window clear of its stone balcony over the door),
 *   a hill villa and the compound (one at each upper back window, over the view); stone balustrades on a Georgian
 *   house (its outer upper windows, clear of the portico) and the summit (one across its middle back windows); oak on
 *   a Tudor house (across its two middle upper back windows, over the garden); glass on a modern house (along its
 *   upper floor's back). A glass mansion has none: its roof is its terrace.
 * - **Roof terraces** (`roofDeckOf()`): a glass mansion's flat roof decked, railed in glass, furnished; a hill villa's,
 *   the compound's and the summit's hipped roof cut flat at half its height (`DECK_HIP`, roofs3d.ts `deckHip()`), its
 *   deck railed in iron (the summit's in stone) and furnished, the rail clear of the chimney and the summit's tower.
 * - **Gates** (`GATES_UP`): the estates' piers taller (`PIER`), a lantern on each and a plain bronze plaque (no words),
 *   the gates wrought iron with gilded spear tips standing open (a modern house's slatted); the hill mansions without
 *   a wall get piers and gates at their drive's mouth (`MANSION_PIERS`, solid with the chunk).
 */
import { ESTATES, GATE, HEDGE, STOREY as E_STOREY, piersOf, type Estate, type EstateStyle, type Part } from './estates';
import { MANSARD, MANSIONS, STOREY as M_STOREY, rectToWorld, type Mansion, type MansionKind, type MPart } from './mansions';
import { ESTATE_GARDENS, HEIGHT, MANSION_GARDENS, type Feat } from './crestgardens';
import type { Box } from './solids';

type Rect = [number, number, number, number];

/* ---------- The windows (as estates3d.ts and mansions3d.ts lay them) ---------- */

/** A window's middle every `step` or so along a wall from `u0` to `u1`, as many as fit (at least one) */
export function windowsAlong(u0: number, u1: number, step: number): number[] {
  const n = Math.max(1, Math.floor((u1 - u0) / step));
  return Array.from({ length: n }, (_, i) => u0 + ((i + 0.5) * (u1 - u0)) / n);
}
/** The windows' spacing on an estate's walls and on a mansion's, and their widths */
export const ESTATE_WINDOW = { step: 1.7, w: 0.75, modernW: 1.3 } as const;
export const MANSION_WINDOW = { step: 1.8, w: 0.85 } as const;

/* ---------- Balconies ---------- */

export type BalconyKind = 'iron' | 'stone' | 'oak' | 'glass';
export const ESTATE_BALCONY: Record<EstateStyle, BalconyKind> = { spanish: 'iron', villa: 'iron', tudor: 'oak', georgian: 'stone', modern: 'glass' };
export const MANSION_BALCONY: Record<MansionKind, BalconyKind | null> = { villa: 'iron', compound: 'iron', summit: 'stone', glass: null, deco: 'glass', chateau: 'stone' };
/**
 * A balcony's slab's thickness and its rail's height over it; how deep each kind stands out from its wall; how far
 * past its windows' sides it runs (further where the windows have shutters, so it clears them)
 */
export const BALCONY = { slab: 0.1, rail: 0.95, depth: { iron: 0.5, stone: 0.6, oak: 0.7, glass: 0.9 }, past: 0.18, shutters: 0.45 } as const;
/** A villa estate's stone balcony over its door (estates3d.ts) and a Georgian portico's half width: the balconies keep off */
export const DOOR_BALCONY = 1.1;
export const PORTICO = 1.75;

export interface Balcony {
  /** Along its wall */
  u0: number;
  u1: number;
  /** Its wall's face, and which way it stands out (1: to the street, -1: to the garden) */
  v: number;
  n: 1 | -1;
  /** Its floor (the slab's top) over the house's ground */
  y: number;
  d: number;
  kind: BalconyKind;
}
/** The rect a balcony stands on (u0, v0, u1, v1, v0 the lower) */
export const balconyRect = (b: Balcony): Rect => [b.u0, Math.min(b.v, b.v + b.n * b.d), b.u1, Math.max(b.v, b.v + b.n * b.d)];

/** An estate's balconies: on its main block's first upper floor, by its style */
export function estateBalconies(e: Estate): Balcony[] {
  const p = e.house.main;
  if (p.floors < 2) return [];
  const { style, hc } = e;
  const kind = ESTATE_BALCONY[style];
  const d = BALCONY.depth[kind];
  const y = E_STOREY.ground;
  const modernUp = style === 'modern';
  const tudorUp = style === 'tudor';
  const front = modernUp ? p.v0 + 0.9 : tudorUp ? p.v0 + 0.12 : p.v0;
  const back = tudorUp ? p.v1 - 0.12 : p.v1;
  const us = windowsAlong(p.u0, p.u1, ESTATE_WINDOW.step);
  const half = ESTATE_WINDOW.w / 2;
  const span = (a: number, c: number, past: number = BALCONY.past): [number, number] => [Math.min(a, c) - half - past, Math.max(a, c) + half + past];
  const byDoor = [...us].sort((a, c) => Math.abs(a - hc) - Math.abs(c - hc));
  const out: Balcony[] = [];
  const put = ([u0, u1]: [number, number], v: number, n: 1 | -1) => out.push({ u0: Math.max(u0, p.u0 + 0.1), u1: Math.min(u1, p.u1 - 0.1), v, n, y, d, kind });
  if (style === 'spanish') put(byDoor.length > 1 ? span(byDoor[0], byDoor[1]) : span(byDoor[0], byDoor[0]), front, 1);
  else if (style === 'villa') {
    for (const u of us) {
      const s = span(u, u, BALCONY.shutters);
      if (s[1] < hc - DOOR_BALCONY - 0.1 || s[0] > hc + DOOR_BALCONY + 0.1) put(s, front, 1);
    }
  } else if (style === 'georgian') {
    if (us.length >= 2)
      for (const u of [us[0], us[us.length - 1]]) {
        const s = span(u, u, BALCONY.shutters);
        if (s[1] < hc - PORTICO - 0.1 || s[0] > hc + PORTICO + 0.1) put(s, front, 1);
      }
  } else if (style === 'tudor') put(byDoor.length > 1 ? span(byDoor[0], byDoor[1]) : span(byDoor[0], byDoor[0]), back, -1);
  else out.push({ u0: p.u0 + 0.3, u1: p.u1 - 0.3, v: back, n: -1, y, d, kind });
  return out;
}

/** A hill mansion's balconies: on its main block's first upper floor at the back, over the view, by its kind */
export function mansionBalconies(m: Mansion): Balcony[] {
  const kind = MANSION_BALCONY[m.kind];
  const p = m.parts[0];
  if (!kind || p.floors < 2) return [];
  const d = BALCONY.depth[kind];
  const y = M_STOREY.ground;
  const us = windowsAlong(p.u0, p.u1, MANSION_WINDOW.step);
  const half = MANSION_WINDOW.w / 2;
  // (an Art Deco house's one long glass balcony across its back, a ship's deck; Phase 3)
  if (m.kind === 'deco') return [{ u0: p.u0 + 0.3, u1: p.u1 - 0.3, v: p.v1, n: -1, y, d, kind }];
  if (m.kind === 'summit') {
    // (one across its middle windows, three at most)
    const mid = [...us].sort((a, c) => Math.abs(a - (p.u0 + p.u1) / 2) - Math.abs(c - (p.u0 + p.u1) / 2)).slice(0, 3);
    return [{ u0: Math.min(...mid) - half - BALCONY.past, u1: Math.max(...mid) + half + BALCONY.past, v: p.v1, n: -1, y, d, kind }];
  }
  return us.map((u) => ({ u0: u - half - BALCONY.past, u1: u + half + BALCONY.past, v: p.v1, n: -1 as const, y, d, kind }));
}

/** A balcony with nothing in the garden standing up into it (a cypress, a pool house, a parasol: crestgardens.ts) */
export const clearOf = (b: Balcony, feats: Feat[]) => {
  const [u0, v0, u1, v1] = balconyRect(b);
  const under = b.y - BALCONY.slab - 0.35;
  return feats.every((f) => (HEIGHT[f.kind] ?? 0) <= under || !(f.r[0] < u1 && f.r[2] > u0 && f.r[1] < v1 && f.r[3] > v0));
};
export const ESTATE_BALCONIES: Balcony[][] = ESTATES.map((e, i) => estateBalconies(e).filter((b) => clearOf(b, ESTATE_GARDENS[i].feats)));
export const MANSION_BALCONIES: Balcony[][] = MANSIONS.map((m, i) => mansionBalconies(m).filter((b) => clearOf(b, MANSION_GARDENS[i].feats)));

/* ---------- Roof terraces (the hill mansions only) ---------- */

/** A hipped roof cut flat at `f` of its height; the mansions' roofs' height and overhang (mansions3d.ts) */
export const DECK_HIP = { f: 0.5, h: 1.3, o: 0.4 } as const;
/** A deck's rail: in from the deck's ends and its sides, its height */
export const DECK_RAIL = { end: 0.5, side: 0.25, h: 0.9, glass: 0.15 } as const;
/** The chimney on a hipped mansion's main block: this far in along it from its first end, its half side */
export const MANSION_CHIMNEY = { at: 1.1, half: 0.32 } as const;

export interface RoofDeck {
  /** A cut hip, a flat roof (a glass mansion's, an Art Deco house's sundeck) or a chateau's mansard's flat top */
  kind: 'hip' | 'flat' | 'mansard';
  /** The deck's surface (u0, v0, u1, v1, v0 the lower) and its height over the pad */
  r: Rect;
  y: number;
  /** Inside its rail */
  rail: Rect;
  /** Its furniture: loungers, a parasol, a table, potted trees (`u`, `v` its middle, `r` its half size) */
  things: { kind: 'lounger' | 'parasol' | 'table' | 'pot'; u: number; v: number; r: number }[];
}

/** A part's walls' top over the pad */
export const partTop = (p: MPart) => M_STOREY.ground + (p.floors - 1) * M_STOREY.upper;

/** The hip of a part cut flat: its deck's rect and height (roofs3d.ts `deckHip()` draws the same) */
export function hipDeck(p: MPart): { r: Rect; y: number } {
  const { f, h, o } = DECK_HIP;
  const [x0, x1, z0, z1] = [p.u0 - o, p.u1 + o, p.v1 - o, p.v0 + o];
  const k = (f * Math.min(x1 - x0, z1 - z0)) / 2;
  return { r: [x0 + k, z0 + k, x1 - k, z1 - k], y: partTop(p) + h * f };
}

/** A mansion's roof terrace */
export function roofDeckOf(m: Mansion): RoofDeck {
  const p = m.parts[0];
  let deck: RoofDeck;
  if (m.kind === 'glass') {
    // (the upper floor's white box, out over the slope at the back: mansions3d.ts `drawGlass()`)
    const back = Math.min(p.v1, -m.D) - m.reach;
    const r: Rect = [p.u0 - 0.4 + 0.3, back + 0.3, p.u1 + 0.4 - 0.3, p.v0 + 0.6 - 0.3];
    const g = DECK_RAIL.glass;
    deck = { kind: 'flat', r, y: partTop(p) + 0.35, rail: [r[0] + g, r[1] + g, r[2] - g, r[3] - g], things: [] };
  } else if (m.kind === 'deco') {
    // (its sundeck: the main block's flat roof inside its parapet, its rail glass; Phase 3)
    const r: Rect = [p.u0 + 0.25, p.v1 + 0.25, p.u1 - 0.25, p.v0 - 0.25];
    const g = DECK_RAIL.glass;
    deck = { kind: 'flat', r, y: partTop(p) + 0.05, rail: clear(m, [r[0] + g, r[1] + g, r[2] - g, r[3] - g]), things: [] };
  } else {
    // (a chateau's mansard's flat top, or a hip cut flat; Phase 3)
    const { r, y } = m.kind === 'chateau' ? mansardDeck(p) : hipDeck(p);
    let rail: Rect = [r[0] + DECK_RAIL.end, r[1] + DECK_RAIL.side, r[2] - DECK_RAIL.end, r[3] - DECK_RAIL.side];
    // (clear of the chimney at its first end)
    const chimney = p.u0 + MANSION_CHIMNEY.at + MANSION_CHIMNEY.half + 0.15;
    if (rail[0] < chimney) rail = [chimney, rail[1], rail[2], rail[3]];
    deck = { kind: m.kind === 'chateau' ? 'mansard' : 'hip', r, y, rail: clear(m, rail), things: [] };
  }
  deck.things = furnish(deck.rail);
  return deck;
}

/** A rail clear of the other parts standing up through its roof (the summit's tower, an Art Deco house's, a chateau's turrets): the deck on the wider side of each */
function clear(m: Mansion, rail: Rect): Rect {
  let r = rail;
  for (const q of m.parts.slice(1))
    if (q.u0 < r[2] && q.u1 > r[0] && Math.min(q.v0, q.v1) < r[3] && Math.max(q.v0, q.v1) > r[1]) {
      const [west, east] = [q.u0 - 0.3 - r[0], r[2] - (q.u1 + 0.3)];
      r = east >= west ? [q.u1 + 0.3, r[1], r[2], r[3]] : [r[0], r[1], q.u0 - 0.3, r[3]];
    }
  return r;
}
/** A chateau's mansard's flat top: its rect and height (roofs3d.ts `mansard()` draws the same) */
export function mansardDeck(p: MPart): { r: Rect; y: number } {
  const { h, inset, o } = MANSARD;
  return { r: [p.u0 - o + inset, p.v1 - o + inset, p.u1 + o - inset, p.v0 + o - inset], y: partTop(p) + h };
}
/** A deck's furniture inside its rail: potted trees in its corners, loungers along its back (the view), a parasol among them, a table and its chairs at the front */
function furnish(rail: Rect): RoofDeck['things'] {
  const [u0, v0, u1, v1] = rail;
  const [W, D] = [u1 - u0, v1 - v0];
  const out: RoofDeck['things'] = [];
  if (W < 1.6 || D < 1.2) return out;
  for (const [u, v] of [
    [u0 + 0.3, v0 + 0.3],
    [u1 - 0.3, v0 + 0.3],
    [u0 + 0.3, v1 - 0.3],
    [u1 - 0.3, v1 - 0.3],
  ])
    out.push({ kind: 'pot', u, v, r: 0.22 });
  // (loungers across the back, end on to the rail, a lounger's length deep)
  const lv = v0 + 0.35 + 0.6;
  if (D >= 2.4) {
    const n = Math.min(3, Math.floor((W - 1.4) / 0.9));
    for (let i = 0; i < n; i++) out.push({ kind: 'lounger', u: u0 + 0.9 + i * 0.9, v: lv, r: 0.3 });
    if (n > 0 && u0 + 0.9 + n * 0.9 + 0.6 < u1 - 0.6) out.push({ kind: 'parasol', u: u0 + 0.9 + n * 0.9 + 0.1, v: lv, r: 0.15 });
  }
  if (D >= 1.2 && W >= 3.4) out.push({ kind: 'table', u: (u0 + u1) / 2 + Math.min(1.2, W / 4), v: v1 - 0.7, r: 0.4 });
  return out;
}

export const ROOF_DECKS: RoofDeck[] = MANSIONS.map(roofDeckOf);

/* ---------- Gates ---------- */

/** The estates' gate piers upgraded: their height (`GATE.h`, estates.ts, was 1.7), the lantern on top, the plaque on the street face */
export const PIER = { lantern: 0.13, lanternH: 0.36, plaque: { w: 0.3, h: 0.22, y: 1.15 } } as const;
/** The gates: their leaves' height at the hinge and at the top of the arch, the bars' spacing, the tips' height */
export const GATE_LEAF = { h: 1.4, arch: 0.25, bar: 0.13, tip: 0.09 } as const;
/** Which houses' gates are slatted rather than wrought iron */
export const slatted = (style: EstateStyle) => style === 'modern';

/** A hill mansion without a wall: its drive's piers, either side of the mouth at its pad's front (`du` ± `at`), and its open gates' leaves inside */
export const MANSION_GATE = { at: 2.05, half: 0.25, h: 2.1, v: -0.35, leaf: 1.78 } as const;
export const mansionPiers = (m: Mansion): [number, number][] => (m.walled ? [] : [-1, 1].map((s) => [m.du + s * MANSION_GATE.at, MANSION_GATE.v]));
/** The mansions' new piers, solid (x0, z0, x1, z1, top), joining the grids with Crestmont's chunk */
export const MANSION_PIERS: Box[] = MANSIONS.flatMap((m) =>
  mansionPiers(m).map(([u, v]): Box => [...rectToWorld(m, u - MANSION_GATE.half, v - MANSION_GATE.half, u + MANSION_GATE.half, v + MANSION_GATE.half), m.y + MANSION_GATE.h])
);

/** Every estate's piers' middles (estates.ts `piersOf()`), for the drawing and the tests */
export const ESTATE_PIERS: [number, number][][] = ESTATES.map((e) => piersOf(e));
/** The gates' leaves, swung open into the forecourt: each one's hinge (u, v) and its run back (the same as estates3d.ts drew them) */
export const leavesOf = (e: Estate): { u: number; v: number; len: number }[] => [-1, 1].map((s) => ({ u: e.hc + s * (GATE.half - 0.08), v: -HEDGE.front - HEDGE.thick, len: 1.2 }));
export type { Part };
