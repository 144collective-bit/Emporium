// Endswood carried west, the terraces (endsterraces.ts, docs/ends-west-plan.md Phase 2, the owner's picks: two and
// three storeys mixed along each row, flat and pitched roofs mixed, as worn as Endswood, every door its own colour):
// each terrace on its row's footprint, the rows broken by passages through to the gardens and the courts, the doors on
// the front paths, nothing out front blocking a path, the gardens fenced with a gate each, everything under the
// Emporium and clear of the lanes, courts, greens and lamps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURTS, CROSS_PATHS, GARDENS, GREENS, LANES, PATHS, ROWS, WEST_LAMPS } from '../src/scripts/city3d/endswest';
import { BIN, CANOPY, DOOR_COLOURS, FENCE, GINNEL, GINNELS, HOUSES, PORCH, TALLEST, TERRACES, TERRACE_SOLIDS, binsOf, courtBehind, fencesOf, gateOf, rectOf, toWorld } from '../src/scripts/city3d/endsterraces';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';

type Rect = readonly number[];
const inside = (r: Rect, x: number, z: number, m = 0) => x >= r[0] - m && x <= r[2] + m && z >= r[1] - m && z <= r[3] + m;
const overlap = (a: Rect, b: Rect, m = 0) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
const E = 1e-6;

test('every row is terraces with passages between, on its footprint, mixed along it (the owner\'s picks)', () => {
  for (const row of ROWS) {
    const ts = TERRACES.filter((t) => t.row === row).sort((a, b) => a.rect[0] - b.rect[0]);
    assert.ok(ts.length >= 2, `${row.id} one terrace`);
    assert.ok(Math.abs(ts[0].rect[0] - row.rect[0]) < E && Math.abs(ts.at(-1)!.rect[2] - row.rect[2]) < E, `${row.id} not filled`);
    for (let i = 1; i < ts.length; i++) assert.ok(Math.abs(ts[i].rect[0] - ts[i - 1].rect[2] - GINNEL) < E, `${row.id}: a passage ${GINNEL} wide`);
    for (const t of ts) assert.deepEqual([t.rect[1], t.rect[3]], [row.rect[1], row.rect[3]]);
    // (mixed along every row: two builds at least, a flat roof and a pitched one)
    assert.ok(new Set(ts.map((t) => `${t.storeys}${t.roof}`)).size >= 2, `${row.id} all one build`);
    assert.ok(ts.some((t) => t.roof === 'flat') && ts.some((t) => t.roof === 'pitched'), `${row.id} one kind of roof`);
  }
  assert.ok(TERRACES.some((t) => t.storeys === 2) && TERRACES.some((t) => t.storeys === 3));
  for (const t of TERRACES) {
    assert.ok(t.peak <= TALLEST && TALLEST < EMPORIUM_ROOF, `${t.id} too tall`);
    assert.ok(t.top > 2 && t.peak > t.top);
  }
});

test('houses: side by side along each terrace, mirrored in pairs, a few metres wide, the doors their own colours', () => {
  assert.ok(HOUSES.length >= 40);
  for (const t of TERRACES) {
    t.houses.forEach((h, i) => {
      assert.ok(h.u1 - h.u0 > 4 && h.u1 - h.u0 < 5.5, `${h.id} ${h.u1 - h.u0} wide`);
      if (i) assert.ok(Math.abs(h.u0 - t.houses[i - 1].u1) < E);
      assert.ok(h.door > h.u0 + 0.5 && h.door < h.u1 - 0.5);
      // (pairs: the doors of a pair side by side across their party wall)
      if (i % 2) assert.ok(Math.abs(h.door - t.houses[i - 1].door) < 2, `${h.id}'s door not by its pair's`);
    });
    assert.ok(Math.abs(t.houses.at(-1)!.u1 - t.w) < E);
  }
  for (let i = 1; i < HOUSES.length; i++) assert.notEqual(HOUSES[i].colour, HOUSES[i - 1].colour, `${HOUSES[i].id} the same door as its neighbour`);
  assert.ok(new Set(HOUSES.map((h) => h.colour)).size >= DOOR_COLOURS.length - 2, 'the doors all much the same');
  // (worn as Endswood: some of each, never all)
  for (const [what, n] of [
    ['boarded', HOUSES.filter((h) => h.board !== null).length],
    ['dishes', HOUSES.filter((h) => h.dish).length],
    ['glazed porches', HOUSES.filter((h) => h.porch === 'glazed').length],
    ['faded doors', HOUSES.filter((h) => h.faded).length],
    ['sheds', HOUSES.filter((h) => h.shed).length],
  ] as const)
    assert.ok(n > 0 && n < HOUSES.length / 2, `${what}: ${n}`);
});

test('the doors open onto the front paths, and nothing out front closes a path', () => {
  for (const t of TERRACES)
    for (const h of t.houses) {
      const [x, z] = h.foot;
      assert.ok(PATHS.some((p) => inside(p, x, z)), `${h.id}'s door onto no path`);
      // (what stands out: the porch or canopy and the bins, at most this far into the path)
      const out = Math.max(h.porch === 'canopy' ? 0 : PORCH.d, BIN.d + 0.04);
      assert.ok(1.5 - out >= 0.75, `${h.id} leaves the path too narrow`);
      for (const u of binsOf(h)) assert.ok(u >= h.u0 && u + BIN.w <= h.u1 && Math.abs(u + BIN.w / 2 - h.door) > 0.6, `${h.id}'s bin in the way`);
      // (a canopy over the head: never solid, high enough to walk under)
      assert.ok(CANOPY.y > 1.1);
    }
});

test('the passages lead from the front paths through to a court or the strip by the Close, open all the way', () => {
  assert.equal(GINNELS.length, TERRACES.length - ROWS.length);
  for (const g of GINNELS) {
    assert.ok(g[2] - g[0] > 1.5);
    assert.ok(PATHS.some((p) => overlap(p, [g[0], g[1] - 0.1, g[2], g[3] + 0.1])), 'a passage off no path');
    for (let z = g[1] + 0.05; z < g[3]; z += 0.25) assert.ok(!TERRACE_SOLIDS.some((b) => inside(b, (g[0] + g[2]) / 2, z)), `a passage closed at ${z}`);
  }
  // (a gate for every house in its back fence, onto the court where there's one)
  assert.ok(ROWS.filter(courtBehind).length >= 4);
  for (const t of TERRACES)
    for (const h of t.houses) {
      const g = gateOf(h);
      assert.ok(g > h.u0 + 0.3 && g < h.u1 - 0.3);
    }
});

test('the gardens: fenced on every party line and their far edge, inside the gardens Phase 1 laid', () => {
  for (const t of TERRACES) {
    const g = GARDENS[ROWS.indexOf(t.row)];
    const lines = fencesOf(t);
    assert.equal(lines.length, t.houses.length + 2);
    for (const [a, c] of lines) for (const [x, z] of [a, c]) assert.ok(inside(g, x, z, FENCE.t) || inside(t.rect, x, z, E), `${t.id}'s fence off its garden at ${x}, ${z}`);
    // (the far fence along the garden's far edge)
    const far = toWorld(t, t.w / 2, -t.d - t.garden);
    assert.ok(Math.abs(far[1] - (t.row.faces > 0 ? g[1] : g[3])) < E);
  }
});

test('what is solid: on the blocks, off the lanes, courts, greens and cross paths, clear of every lamp', () => {
  for (const b of TERRACE_SOLIDS) {
    assert.ok(b[2] > b[0] && b[3] > b[1] && b[4] > 0.5);
    for (const r of [...LANES, ...GREENS, ...CROSS_PATHS]) assert.ok(!overlap(b, r, 0.01), `a solid at ${b.slice(0, 4)} on ${r}`);
    for (const c of COURTS) assert.ok(!overlap(b, c, FENCE.t), `a solid at ${b.slice(0, 4)} in a court`);
    for (const [x, z] of WEST_LAMPS) assert.ok(!inside(b, x, z, 0.2), `a lamp at ${x}, ${z} in a solid`);
  }
  // (every house's body is solid, its porch too where it has one)
  for (const t of TERRACES) {
    const x0 = t.rect[0];
    assert.ok(TERRACE_SOLIDS.some((b) => b[0] <= x0 + E && b[2] >= t.rect[2] - E && b[1] <= t.rect[1] + E && b[3] >= t.rect[3] - E));
    for (const h of t.houses) if (h.porch !== 'canopy') assert.ok(TERRACE_SOLIDS.some((b) => overlap(b, rectOf(t, h.door - 0.1, h.door + 0.1, 0.1, 0.5))), `${h.id}'s porch`);
  }
});
