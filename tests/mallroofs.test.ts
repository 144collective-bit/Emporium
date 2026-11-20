// The joined mall's roofs dressed (mallroofs.ts, docs/mall-plan.md "One mall" Phase 4): the solar arrays, the
// rooflights and the plant each on its roof, clear of its edge, the vaults and each other; nothing over the pylon.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANCHOR_PLANT, CINEMA_PLANT, HALL_PLANT, PANELS, PANEL_D, PANEL_GAP, PANEL_RISE, ROOFLIGHTS, ROOFS, ROW_PLANT, plantRect } from '../src/scripts/city3d/mallroofs';
import { ANCHORS, CINEMA, HALL, PROM, SHOPS, TALLEST } from '../src/scripts/city3d/mall';

type Rect = readonly number[];
const within = (r: Rect, o: Rect, m = 0) => r[0] >= o[0] - m && r[2] <= o[2] + m && r[1] >= o[1] - m && r[3] <= o[3] + m;
const overlap = (a: Rect, b: Rect, m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;

test('the roofs: Palm Court\'s rows, the anchors, the hall and the cinema, each inside its building, its membrane on the light ones', () => {
  const ids = ROOFS.map((r) => r.id);
  assert.ok(ids.filter((i) => i.startsWith('court-west')).length >= 1 && ids.filter((i) => i.startsWith('court-east')).length >= 2);
  for (const id of ['anchor-0', 'anchor-1', 'hall', 'cinema']) assert.ok(ids.includes(id), id);
  const body = (id: string): Rect => (id === 'hall' ? HALL.rect : id === 'cinema' ? CINEMA.rect : id.startsWith('anchor-') ? ANCHORS[Number(id.slice(7))].rect : [PROM[0] - 10.6, -200, PROM[1] + 10.6, 0]);
  for (const r of ROOFS) {
    assert.ok(within(r.rect, body(r.id)), `${r.id} over its building`);
    // (Palm Court's rows clear of the vault's curb over the promenade)
    if (r.id.startsWith('court-')) assert.ok(r.rect[2] < PROM[0] - 0.4 || r.rect[0] > PROM[1] + 0.4, `${r.id} on the vault`);
    for (const p of r.plant) assert.ok(within(plantRect(p), r.rect, 0.4), `${r.id}'s plant off its roof`);
  }
  assert.ok(ROOFS.find((r) => r.id === 'anchor-0')!.membrane && !ROOFS.find((r) => r.id === 'anchor-1')!.membrane);
  // Every third shop's plant on its row's roof
  assert.equal(ROW_PLANT.length, Math.ceil(SHOPS.length / 3));
  for (const p of ROW_PLANT) assert.ok(ROOFS.some((r) => r.id.startsWith('court-') && within(plantRect(p), r.rect, 0.4)), `a row's plant at ${p} off its roof`);
  assert.equal(ANCHOR_PLANT.length, 2);
  assert.equal(HALL_PLANT.length, 2);
  assert.equal(CINEMA_PLANT.length, 2);
});

test('the solar arrays: on their roofs, clear of the plant and the vaults, rows facing south with room between them', () => {
  assert.ok(PANELS.length > 40);
  for (const r of ROOFS) assert.ok(PANELS.some((p) => p.roof === r.id), `no panels on ${r.id}`);
  for (const p of PANELS) {
    const r = ROOFS.find((q) => q.id === p.roof)!;
    assert.ok(within(p.rect, r.rect, 1e-6), `a panel off ${r.id}`);
    assert.ok(Math.abs(p.rect[3] - p.rect[1] - PANEL_D) < 1e-6 && p.rect[2] - p.rect[0] >= 2 - 1e-6);
    for (const k of r.keep) assert.ok(!overlap(p.rect, k), `a panel on ${r.id} in its plant or vault`);
    assert.equal(p.y, r.y);
    assert.ok(p.y + PANEL_RISE + 0.3 < TALLEST, 'under the pylon');
  }
  // (rows on a roof never overlap: each the next a gap on)
  for (let i = 0; i < PANELS.length; i++)
    for (let j = i + 1; j < PANELS.length; j++) if (PANELS[i].roof === PANELS[j].roof) assert.ok(!overlap(PANELS[i].rect, PANELS[j].rect, -1e-6), 'two arrays overlap');
  assert.ok(PANEL_GAP >= PANEL_RISE * 1.5, 'room for the shadow of the row in front');
  // The hall's vault left clear
  const hall = ROOFS.find((r) => r.id === 'hall')!;
  for (const p of PANELS.filter((q) => q.roof === 'hall')) assert.ok(!overlap(p.rect, hall.keep[0]));
});

test("the rooflights over Palm Court's upper floor: on the rows' inner halves, clear of the panels and the plant", () => {
  assert.ok(ROOFLIGHTS.length > 15);
  for (const l of ROOFLIGHTS) {
    const r = ROOFS.find((q) => q.id.startsWith('court-') && within(l.rect, q.rect, 1e-6));
    assert.ok(r, 'a rooflight off the rows');
    for (const k of r!.keep) assert.ok(!overlap(l.rect, k), 'a rooflight in the plant');
    for (const p of PANELS) if (p.roof === r!.id) assert.ok(!overlap(l.rect, p.rect), 'a rooflight under a panel');
  }
});
