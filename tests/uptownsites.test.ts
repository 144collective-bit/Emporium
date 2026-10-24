// Uptown's free land built on (uptownsites.ts, docs/finance-plan.md Phase 7): the theatre on the circle, the exchange,
// the hotel, a tower going up and the pocket gardens, each on its block, off every street and its sidewalk, clear of
// the towers, the lanes and the lay-bys, solid, and under what flies over.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXCHANGE, MARQUEE, FILMS, GARDENS, HOARDING_COPY, HOTEL, HOTEL_NAME, SITE_PEOPLE, SITE_RECTS, THEATRE, TICKER_WORDS, UPTOWN_SITE_SOLIDS, WORKS } from '../src/scripts/city3d/uptownsites';
import { HIGHRISES } from '../src/scripts/city3d/highrise';
import { CIRCLE, LAYBYS, UPTOWN_BLOCKS, UPTOWN_LANES, laybyRect } from '../src/scripts/city3d/uptown';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { WALK_W } from '../src/scripts/city3d/layout';

type Pt = [number, number];
function inPoly(poly: Pt[], p: Pt) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [u, v] = [poly[i], poly[j]];
    if (u[1] > p[1] !== v[1] > p[1] && p[0] < ((v[0] - u[0]) * (p[1] - u[1])) / (v[1] - u[1]) + u[0]) inside = !inside;
  }
  return inside;
}
const rectPoly = ([x0, z0, x1, z1]: number[]): Pt[] => [[x0, z0], [x0, z1], [x1, z1], [x1, z0]];
const overlap = (a: number[], b: number[], m = 0) => a[0] < b[2] + m && b[0] < a[2] + m && a[1] < b[3] + m && b[1] < a[3] + m;
/** Points along an outline's edges, every half tile */
const along = (poly: Pt[]) => poly.flatMap((a, i) => {
  const c = poly[(i + 1) % poly.length];
  const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.5));
  return Array.from({ length: n }, (_, k): Pt => [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
});
const OUTLINES: [string, Pt[]][] = [['theatre', THEATRE.poly], ['exchange', EXCHANGE.poly], ['hotel', HOTEL.poly], ['works', WORKS.poly], ...GARDENS.map((g, i): [string, Pt[]] => [`garden ${i}`, rectPoly(g)])];

test('each on its block, off every street and its sidewalk, clear of the towers, the lanes and the lay-bys', () => {
  for (const [name, poly] of OUTLINES) {
    const pts = along(poly);
    const blk = UPTOWN_BLOCKS.find((b) => pts.every((p) => inPoly(b.poly, p) || UPTOWN_BLOCKS.find((q) => q === b && distOut(q.poly, p) < 0.05)));
    assert.ok(blk, `${name} on one block`);
    for (const p of pts) for (const s of PLAN.streets) assert.ok(distToStreet(s, p) > s.half + WALK_W - 0.05, `${name} at ${p[0].toFixed(1)}, ${p[1].toFixed(1)} on ${s.id}`);
    for (const t of HIGHRISES) {
      const pod = t.parts[0].rect;
      assert.ok(!pts.some((p) => inPoly(rectPoly(pod), p)) && !t.parts.some((q) => q.poly ? false : inPoly(poly, [(q.rect[0] + q.rect[2]) / 2, (q.rect[1] + q.rect[3]) / 2])), `${name} on ${t.id}`);
      // A passage between it and any tower's lot (or more)
      if (t.design !== 'flatiron') assert.ok(!pts.some((p) => p[0] > t.lot[0] - 0.5 && p[0] < t.lot[2] + 0.5 && p[1] > t.lot[1] - 0.5 && p[1] < t.lot[3] + 0.5), `${name} against ${t.id}'s lot`);
    }
    for (const l of [...UPTOWN_LANES, ...LAYBYS.map(laybyRect)]) assert.ok(!pts.some((p) => p[0] > l[0] && p[0] < l[2] && p[1] > l[1] && p[1] < l[3]), `${name} on a lane or lay-by`);
  }
  // None on another
  for (let i = 0; i < SITE_RECTS.length; i++) for (let j = i + 1; j < SITE_RECTS.length; j++) assert.ok(!overlap(SITE_RECTS[i], SITE_RECTS[j]), `sites ${i} and ${j} overlap`);
});
/** How far a point is outside an outline's edges (0 inside) */
function distOut(poly: Pt[], p: Pt) {
  if (inPoly(poly, p)) return 0;
  let best = Infinity;
  poly.forEach((a, i) => {
    const c = poly[(i + 1) % poly.length];
    const [vx, vz] = [c[0] - a[0], c[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t));
  });
  return best;
}

test('the theatre faces the circle, its marquee over the sidewalk, not the carriageway', () => {
  const front = THEATRE.poly.filter((p) => p[0] > -185);
  for (const [x, z] of front) {
    const r = Math.hypot(x - CIRCLE.x, z - CIRCLE.z);
    assert.ok(r > CIRCLE.r + CIRCLE.half + WALK_W - 0.01, `its front at ${r.toFixed(2)} from the circle`);
  }
  // The marquee reaches over the sidewalk only
  for (const { outer: [x, z] } of MARQUEE) assert.ok(Math.hypot(x - CIRCLE.x, z - CIRCLE.z) > CIRCLE.r + CIRCLE.half + 0.1, `the marquee over the carriageway at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  assert.ok(THEATRE.fly[4] > THEATRE.h && THEATRE.fly[4] < 14);
});

test('the heights: the theatre, the exchange and the hotel mid-rise; the crane under the flights, its jib over the towers round it', () => {
  for (const h of [THEATRE.h, EXCHANGE.h, HOTEL.h, HOTEL.penthouse[4], EXCHANGE.portico.peak]) assert.ok(h > 5 && h < 15);
  const c = WORKS.crane;
  // Its jib turns clear over every tower it can reach (their roofs and tips)
  for (const t of HIGHRISES) {
    const d = Math.hypot(Math.max(t.lot[0] - c.x, 0, c.x - t.lot[2]), Math.max(t.lot[1] - c.z, 0, c.z - t.lot[3]));
    if (d < c.jib + 0.5) assert.ok(c.h - 1.2 > t.roof + 1 && (d > 2 || c.h - 1.2 > t.tip), `the jib over ${t.id}`);
  }
  assert.ok(c.h < 36, 'well under the flights over Uptown');
});

test('the copy is fixed and made up, never a number or a price; the people; all of it solid', () => {
  for (const w of [...FILMS, ...TICKER_WORDS, ...HOARDING_COPY, HOTEL_NAME]) assert.ok(!/[0-9$%€£]/.test(w.replace('SECTOR 7', '')), `${w}: no numbers or prices`);
  assert.ok(SITE_PEOPLE.length >= 8);
  for (const p of SITE_PEOPLE) for (const s of PLAN.streets) assert.ok(distToStreet(s, [p.x, p.z]) > s.half - 0.05, `someone in ${s.id}`);
  for (const b of UPTOWN_SITE_SOLIDS) assert.ok(SOLIDS.includes(b));
});
