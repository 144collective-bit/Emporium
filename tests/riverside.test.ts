// The Trenches' riverside (riverside.ts, the owner's call): row A's four blocks redesigned, their river side a row
// of landmarks (The Wharf, the Refinery, Harbor Stores, the Pier House, and the places: avenue.ts), their Trench
// Avenue side a strip of brownstones and the corner shops, a yard between; everything on its block, off the
// streets, under the Emporium, solid in SOLIDS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLOCK_RECT, FRONT_Z, PIER_HOUSE, REFINERY, RIVERSIDE, RIVERSIDE_SOLIDS, RIVER_BLOCKS, STORES, STRIPS, TALLEST, WHARF, YARD_Z } from '../src/scripts/city3d/riverside';
import { AVENUE_PLACES } from '../src/scripts/city3d/avenue';
import { CORNER_SHOPS, EMPORIUM_ROOF, ROW_BLOCKS, rows } from '../src/scripts/city3d/projects';
import { PIER } from '../src/scripts/city3d/waterfront';
import { BANK, TRENCH_BLOCKS } from '../src/scripts/city3d/trenches';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { overlaps } from '../src/scripts/city3d/commons';
import type { Rect } from '../src/scripts/city3d/downtown';

const within = (r: Rect, b: Rect, m = 0) => r[0] >= b[0] - 1e-6 + m && r[1] >= b[1] - 1e-6 + m && r[2] <= b[2] + 1e-6 - m && r[3] <= b[3] + 1e-6 - m;
const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
const box = (s: number[]): Rect => [s[0], s[1], s[2], s[3]];

test("row A's four blocks, west to east, fronting the bank avenue", () => {
  assert.deepEqual(RIVER_BLOCKS, TRENCH_BLOCKS.filter((b) => b.row === 'A').map((b) => b.id));
  for (let i = 1; i < RIVER_BLOCKS.length; i++) assert.ok(BLOCK_RECT[RIVER_BLOCKS[i]][0] > BLOCK_RECT[RIVER_BLOCKS[i - 1]][2]);
  for (const id of RIVER_BLOCKS) assert.ok(Math.abs(BLOCK_RECT[id][1] - FRONT_Z) < 1e-6);
  assert.ok(FRONT_Z > BANK.c + BANK.half && FRONT_Z - BANK.c < 6);
});

test('the landmarks: each on its block, fronting the river, its parts on its lot, under the Emporium; no two on one lot', () => {
  assert.deepEqual(
    RIVERSIDE.map((r) => r.id),
    ['wharf', 'refinery', 'stores', 'pierhouse']
  );
  const lots = [...RIVERSIDE.map((r) => ({ id: r.id, lot: r.lot, block: r.block })), ...AVENUE_PLACES.map((p) => ({ id: p.id, lot: p.lot, block: p.block }))];
  for (const r of RIVERSIDE) {
    assert.ok(within(r.lot, BLOCK_RECT[r.block]), `${r.id} on ${r.block}`);
    assert.ok(Math.abs(r.lot[1] - FRONT_Z) < 1e-6, `${r.id} fronts the river`);
    assert.ok(r.lot[3] <= YARD_Z + 1e-6, `${r.id} short of the yard`);
    for (const p of r.parts) {
      assert.ok(within(p.rect, r.lot), `${r.id}'s part on its lot`);
      assert.ok(p.h > 1 && p.h <= TALLEST && TALLEST <= EMPORIUM_ROOF - 0.5);
    }
  }
  for (const a of lots) for (const b of lots) if (a !== b) assert.ok(!overlaps(a.lot, b.lot), `${a.id} on ${b.id}`);
  // Every block has its landmark (the club is a3's)
  for (const id of RIVER_BLOCKS) assert.ok(lots.some((l) => l.block === id && l.lot[2] - l.lot[0] > 15), `${id} has a landmark`);
});

test('The Wharf: stacks of floors each shifted off the one under it, one on the next, on its lobby, the crown on top', () => {
  const s = WHARF.stacks;
  assert.equal(s.length, 4);
  for (let i = 0; i < s.length; i++) {
    assert.ok(within(s[i].rect, WHARF.lobby), 'over the lobby');
    if (i === 0) assert.ok(Math.abs(s[0].y0 - WHARF.lobbyH) < 1e-6);
    else {
      assert.ok(Math.abs(s[i].y0 - s[i - 1].y1) < 1e-6, 'each on the last');
      assert.ok(Math.abs(s[i].rect[0] - s[i - 1].rect[0]) > 0.3 || Math.abs(s[i].rect[1] - s[i - 1].rect[1]) > 0.3, 'shifted');
    }
  }
  assert.ok(within(WHARF.crown.rect, s[s.length - 1].rect) && Math.abs(WHARF.crown.y0 - s[s.length - 1].y1) < 1e-6 && WHARF.top <= TALLEST);
  // A terrace on the lobby's roof in front of the tower
  assert.ok(Math.min(...s.map((t) => t.rect[1])) - WHARF.lobby[1] > 3);
});

test('the Refinery, Harbor Stores and the Pier House: their parts where they belong', () => {
  assert.ok(within(REFINERY.monitor, REFINERY.hall) && REFINERY.monitorH > REFINERY.h);
  assert.ok(REFINERY.sign.x0 > REFINERY.hall[0] && REFINERY.sign.x1 < REFINERY.hall[2] && REFINERY.sign.y0 > REFINERY.h);
  assert.ok(within(REFINERY.plinth, REFINERY.lot) && REFINERY.chimney.top > REFINERY.sign.y1 && REFINERY.chimney.top <= TALLEST);
  assert.ok(within(STORES.penthouse, STORES.body, 1) && STORES.penthouseH > STORES.h);
  // The Pier House's clock tower out of the middle of its front, on Pier 7's line
  const t = PIER_HOUSE.tower;
  assert.ok(Math.abs((t[0] + t[2]) / 2 - PIER_HOUSE.cx) < 1e-6 && Math.abs(PIER.x - PIER_HOUSE.cx) < 1e-6);
  assert.ok(t[1] < PIER_HOUSE.hall[1] && t[3] > PIER_HOUSE.hall[1], 'standing out of the hall front');
  assert.ok(PIER_HOUSE.towerH > PIER_HOUSE.h && PIER_HOUSE.clockY < PIER_HOUSE.towerH && PIER_HOUSE.top <= TALLEST);
});

test("Trench Avenue's strips: one row of brownstones and shops each, facing the avenue, behind the yard; the corner shops on them", () => {
  for (const s of STRIPS) {
    const rb = ROW_BLOCKS.find((b) => b.id === s.id)!;
    assert.deepEqual(rb.poly, s.poly);
  }
  const laid = rows();
  ROW_BLOCKS.forEach((rb, i) => {
    if (!RIVER_BLOCKS.includes(rb.id)) return;
    assert.ok(laid.byBlock[i].lots.length >= 6, `${rb.id}'s strip is built up`);
    for (const l of laid.byBlock[i].lots) {
      assert.equal(l.face, 's', `${rb.id}'s row faces the avenue`);
      assert.ok(l.box[1] >= YARD_Z + 1, 'behind the yard');
    }
  });
  for (const id of ['c0', 'c1', 'c2']) {
    const c = CORNER_SHOPS.find((s) => s.id === id)!;
    assert.ok(RIVER_BLOCKS.includes(c.block) && c.lot.face === 's', `${c.name} on Trench Avenue`);
  }
});

test("what's solid is in SOLIDS, on its block, off the streets and nobody else's", () => {
  assert.ok(RIVERSIDE_SOLIDS.length >= 7);
  for (const s of RIVERSIDE_SOLIDS) {
    assert.ok(SOLIDS.includes(s) && s[0] < s[2] && s[1] < s[3] && s[4] <= TALLEST);
    assert.ok(RIVER_BLOCKS.some((id) => within(box(s), BLOCK_RECT[id])));
    for (const p of [
      [s[0], s[1]],
      [s[2], s[3]],
    ] as [number, number][])
      for (const r of roads) assert.ok(distToStreet(r, p) > r.half - 1e-6, `${s.join()} on ${r.id}`);
    for (const o of SOLIDS) if (!RIVERSIDE_SOLIDS.includes(o)) assert.ok(!overlaps(box(s), box(o)), `${s.join()} in ${o.join()}`);
  }
});
