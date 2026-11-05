/*
 * The raised highway's signs, sound walls and murals (docs/highway-plan.md Phase 4; DOM-free, tested in
 * tests/viaduct.test.ts; read by viaduct3d.ts, the drawing's chunk only: out of the boot since Phase 9). Made-up
 * names only (the exits' own), no numbers but the exits'.
 *
 * - `GANTRIES`: green gantries over the carriageway before every off-ramp: one well ahead (`advance`), one where it
 *   leaves (`exit`), each over its side's two lanes, kept clear of the metro where it rides over the deck
 *   (`METRO_S`) and of the deck's lamps; `gantryPanel()`. `RAMP_SIGNS`: a sign by every on-ramp's foot.
 * - `SOUND_WALLS`: panels on the deck's parapet past homes (Sunridge, The Trenches, Lot 9, Uptown North), on the
 *   side facing them, broken where a ramp runs alongside or tapers in, and under the metro; `soundWall()`.
 * - `MURALS`: made-up words on the piers by The Trenches and Lot 9 (`MURAL_ART`).
 */

import { fromHighway } from './highway';
import { TRACKS } from './metro';
import { inChannel } from './river';
import { LOT9_RECT } from './lot9';
import { SUNRIDGE_RECT } from './sunridge';
import { TRENCH_RECT } from './trenches';
import { NORTH_RECT } from './uptownnorth';

import { BESIDE, DECK_HALF, DECK_Y, EXITS, OUTER_LANE, RAMPS, RAMP_HALF, RING_LEN, ringPoint, ringS, sGap, wrapS, type Pt } from './viaduct';
import { DECK_LAMPS, PIERS } from './viapiers';
import { RAMP_PARAPET, deckGap, rampAt } from './viaground';

import { besideIn } from './viadress';

type Rect = [number, number, number, number];
const inRect = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;

/** Where along the ring the metro rides over the deck (gantries and sound walls keep clear) */
export const METRO_S: number[] = (() => {
  const out: number[] = [];
  for (const t of Object.values(TRACKS)) {
    let inside = false;
    for (let i = 0; i <= Math.ceil(t.len); i++) {
      const k = Math.min(i, t.len);
      let p: Pt = t.pts[0];
      for (let j = 1; j < t.pts.length; j++)
        if (t.cum[j] >= k) {
          const f = (k - t.cum[j - 1]) / (t.cum[j] - t.cum[j - 1] || 1);
          p = [t.pts[j - 1][0] + (t.pts[j][0] - t.pts[j - 1][0]) * f, t.pts[j - 1][1] + (t.pts[j][1] - t.pts[j - 1][1]) * f];
          break;
        }
      const on = fromHighway(p[0], p[1]) < DECK_HALF + 1;
      if (on && !inside) out.push(ringS(p[0], p[1]).s);
      inside = on;
    }
  }
  return out;
})();
const nearMetro = (s: number, m: number) => METRO_S.some((ms) => Math.abs(sGap(s, ms)) < m);

/* ---------- Gantries ---------- */

/** A gantry's beam (its underside over the deck), the panel's size, the clear it keeps round the metro and the lamps */
export const GANTRY = { under: 3.1, top: 4.5, panel: { w: 3.6, h: 1.15 }, metro: 18, lamp: 3 };
export interface Gantry {
  id: string;
  exit: number;
  /** The carriageway it's over: inside (-1, clockwise) or outside (+1, anticlockwise) */
  q: 1 | -1;
  s: number;
  kind: 'advance' | 'exit';
  /** The way its traffic runs along the ring (its panel faces it) */
  dir: 1 | -1;
}
/** The exits' names (the signs read them), their made-up copy */
export const EXIT_SIGNS: { n: number; name: string }[] = EXITS.map((e) => ({ n: e.n, name: e.name }));
export const GANTRIES: Gantry[] = RAMPS.filter((r) => r.kind === 'off').flatMap((r): Gantry[] => {
  const dir = r.q < 0 ? 1 : -1;
  const sd = ringS(r.pts[0][0], r.pts[0][1]).s;
  const place = (want: number) => {
    // (nudged up or down the road off the metro and the deck's lamps, the nearest clear spot)
    for (let k = 0; k < 40; k++)
      for (const sg of k ? [-1, 1] : [1]) {
        const s = wrapS(want - dir * k * sg);
        const lamp = DECK_LAMPS.some(([x, z]) => Math.abs(sGap(ringS(x, z).s, s)) < GANTRY.lamp);
        if (!nearMetro(s, GANTRY.metro) && !lamp) return s;
      }
    return null;
  };
  const out: Gantry[] = [];
  for (const [kind, back] of [
    ['advance', 60],
    ['exit', 5],
  ] as const) {
    const s = place(sd - dir * back);
    if (s !== null) out.push({ id: `${r.id}-${kind}`, exit: r.exit, q: r.q, s, kind, dir });
  }
  return out;
});

/** A sign by each on-ramp's foot, outside its parapet a few tiles up it (x, z, the way it faces, its exit) */
export const RAMP_SIGNS: { exit: number; at: Pt; face: Pt }[] = RAMPS.filter((r) => r.kind === 'on').map((r) => {
  const k = Math.min(r.pts.length - 2, 8);
  const [a, b] = [r.pts[k], r.pts[k + 1]];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const [ux, uz] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  // (on its side away from the ring, facing the traffic coming up from its foot)
  let n: Pt = [-uz, ux];
  if (fromHighway(a[0] + n[0], a[1] + n[1]) < fromHighway(a[0], a[1])) n = [-n[0], -n[1]];
  const w = RAMP_PARAPET.out + 0.7;
  return { exit: r.exit, at: [a[0] + n[0] * w, a[1] + n[1] * w], face: [-ux, -uz] };
});

/* ---------- Sound walls ---------- */

/** The panels over the parapet (their top over the deck) and the shortest run worth one */
export const SOUND_WALL = { top: 2.6, min: 16 };
/** The homes the walls face: Sunridge, The Trenches, Lot 9, Uptown North */
const HOMES: Rect[] = [SUNRIDGE_RECT, TRENCH_RECT, LOT9_RECT, NORTH_RECT];
export const SOUND_WALLS: { q: 1 | -1; s0: number; s1: number }[] = (() => {
  const out: { q: 1 | -1; s0: number; s1: number }[] = [];
  for (const q of [-1, 1] as const) {
    let from: number | null = null;
    const STEP = 2;
    for (let s = 0; s <= RING_LEN; s += STEP) {
      const home = [10, 20, 32].some((d) => HOMES.some((r) => inRect(r, ...ringPoint(s, q * (DECK_HALF + d)))));
      const along = rampAt(...ringPoint(s, q * BESIDE));
      const ok = home && !nearMetro(s, 8) && ![-6, 0, 6].some((d) => deckGap(q, wrapS(s + d))) && !(along && along.d < RAMP_HALF + 0.5);
      if (ok && from === null) from = s;
      if ((!ok || s + STEP > RING_LEN) && from !== null) {
        if (s - from >= SOUND_WALL.min) out.push({ q, s0: from, s1: s });
        from = null;
      }
    }
  }
  return out;
})();
/** Is there a sound wall on side q at s */
export const soundWall = (q: 1 | -1, s: number) => SOUND_WALLS.some((w) => w.q === q && s >= w.s0 && s <= w.s1);

/** Made-up words for the murals (nothing for sale, never a real name) */
export const MURAL_ART = ['UNDER THE DECK', 'TRENCH LIFE', 'LOT 9 FOREVER', 'BLOCK LOVE', 'RISE UP', 'SECTOR 7 SOUL', 'GOOD DAYS', 'NIGHT SHIFT'];
/** The murals: on both faces along the ring of every pier by The Trenches and Lot 9 (the pier, which face, which picture) */
export const MURALS: { s: number; at: Pt; face: 1 | -1; art: number }[] = PIERS.flatMap((p, i) => {
  if (!besideIn(p.s, [TRENCH_RECT, LOT9_RECT]) || inChannel(p.at[0], p.at[1], 2)) return [];
  return ([-1, 1] as const).map((face, k) => ({ s: p.s, at: p.at, face, art: (i * 2 + k) % MURAL_ART.length }));
});

/** A gantry's panel's middle (x, z, y) over its side's lanes */
export const gantryPanel = (g: Gantry) => {
  const [x, z] = ringPoint(g.s, g.q * (OUTER_LANE - 0.8));
  return { x, z, y: DECK_Y + GANTRY.under + GANTRY.panel.h / 2 };
};
