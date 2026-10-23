// The Trenches' grit (grit.ts, the owner's call): concrete yards with worn patches and trees in pits, chain-link round
// them (commons.ts), jersey barriers, dumpsters and trash, shuttered shops and boarded windows, the boombox corners, the
// el's pillars and spans, sodium lamps (trenches.ts) and the hood's sound (ambience.ts). Nothing in anyone's way.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BARRIERS,
  BOOMBOXES,
  CAR_PARKS,
  DUMPSTER,
  DUMPSTERS,
  EL_PILLARS,
  EL_SPANS,
  GRIT_SOLIDS,
  PATCHES,
  PIT,
  TRASH,
  YARDS,
  YARD_TREES,
  barrierRect,
  boarded,
  shuttered,
  taken,
} from '../src/scripts/city3d/grit';
import { AMENITIES, BAYS, BAY_CARS, COMMONS_SOLIDS, REC, amenityWay, doorWay, overlaps, towerRects } from '../src/scripts/city3d/commons';
import { CORNER_SHOPS, PROJECT_SOLIDS, THE_BLOCK, TOWERS, rows } from '../src/scripts/city3d/projects';
import { EDGES, STREETWALL_SOLIDS } from '../src/scripts/city3d/streetwall';
import { TRENCH_BLOCKS, inTrenches, lampKind } from '../src/scripts/city3d/trenches';
import { METRO_SOLIDS, PILLARS } from '../src/scripts/city3d/metro';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLAN, distToStreet, inPoly } from '../src/scripts/city3d/streetplan';
import { ambienceAt } from '../src/scripts/city3d/ambience';
import type { Rect } from '../src/scripts/city3d/downtown';

const blockRect = (id: string): Rect => {
  const p = TRENCH_BLOCKS.find((b) => b.id === id)!.poly;
  return [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];
};
const within = (r: Rect, b: Rect, m = 0) => r[0] >= b[0] + m - 1e-6 && r[1] >= b[1] + m - 1e-6 && r[2] <= b[2] - m + 1e-6 && r[3] <= b[3] - m + 1e-6;
const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
const inSolid = (x: number, z: number, m: number) => SOLIDS.some((s) => x > s[0] - m && x < s[2] + m && z > s[1] - m && z < s[3] + m);

test('the lamps: sodium in The Trenches (a few flickering, the odd one dead), the town\'s own white everywhere else', () => {
  assert.equal(lampKind(30, 30), null, 'downtown');
  assert.equal(lampKind(200, 0), null, 'the kart park side');
  const kinds = { sodium: 0, flicker: 0, dead: 0 };
  for (let x = -185; x < -15; x += 3.7) for (let z = 100; z < 255; z += 4.1) if (inTrenches(x, z)) kinds[lampKind(x, z)!]++;
  const n = kinds.sodium + kinds.flicker + kinds.dead;
  assert.ok(n > 500);
  assert.ok(kinds.sodium / n > 0.75, 'mostly steady sodium');
  assert.ok(kinds.flicker / n > 0.04 && kinds.flicker / n < 0.16, `some flickering (${kinds.flicker} of ${n})`);
  assert.ok(kinds.dead / n > 0.02 && kinds.dead / n < 0.1, `the odd one dead (${kinds.dead} of ${n})`);
  assert.equal(lampKind(-120, 190), lampKind(-120, 190), 'the same every visit');
});

test('the yards: worn patches on the concrete, clear of everything on them', () => {
  assert.ok(YARDS.length >= 13 && !YARDS.some((b) => b.id === THE_BLOCK.block));
  assert.ok(PATCHES.length >= 20);
  for (const blk of YARDS.filter((b) => b.id !== REC.block)) assert.ok(PATCHES.some((p) => p.block === blk.id), `${blk.id} has a worn patch`);
  for (const p of PATCHES) {
    const b = blockRect(p.block);
    assert.ok(within(p.rect, b, 1.4), `${p.block}'s patch on its yard`);
    for (const [x, z] of p.poly) assert.ok(x >= p.rect[0] - 1e-6 && x <= p.rect[2] + 1e-6 && z >= p.rect[1] - 1e-6 && z <= p.rect[3] + 1e-6, 'its outline inside its bounds');
    if (p.kind === 'lawn') {
      assert.equal(p.block, REC.block);
      continue;
    }
    for (const k of taken(p.block)) assert.ok(!overlaps(k, p.rect), `${p.block}'s patch clear of what's on the yard`);
    for (const o of PATCHES) if (o !== p && o.block === p.block) assert.ok(!overlaps(o.rect, p.rect), 'patches apart');
  }
  assert.ok(PATCHES.some((p) => p.kind === 'grass') && PATCHES.some((p) => p.kind === 'dirt'));
});

test('trees in pits along the yards\' street sides (and on the worn grass), clear of the ways in and the chain-link', () => {
  const pits = YARD_TREES.filter((t) => t.pit);
  assert.ok(pits.length >= 40, `${pits.length} in pits`);
  assert.ok(YARD_TREES.some((t) => !t.pit && t.block === REC.block), 'some on the rec block\'s lawn');
  for (const t of YARD_TREES) {
    const b = blockRect(t.block);
    assert.ok(t.x > b[0] + 0.9 && t.x < b[2] - 0.9 && t.z > b[1] + 0.9 && t.z < b[3] - 0.9, `${t.block}'s tree on its yard`);
    assert.ok(!inSolid(t.x, t.z, 0.3), `a tree in something at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
    const towers = TOWERS.filter((o) => o.block === t.block);
    for (const o of towers) assert.ok(!overlaps(doorWay(o, b, 1.3), [t.x - 0.4, t.z - 0.4, t.x + 0.4, t.z + 0.4]), `a tree on ${o.id}'s way in`);
    for (const a of AMENITIES.filter((o) => o.block === t.block)) assert.ok(!overlaps(amenityWay(a, 1), [t.x - 0.4, t.z - 0.4, t.x + 0.4, t.z + 0.4]), `a tree on ${a.id}'s way out`);
    if (t.pit)
      for (const e of EDGES.filter((o) => o.block === t.block)) {
        const r: Rect = [Math.min(e.a[0], e.c[0]), Math.min(e.a[1], e.c[1]), Math.max(e.a[0], e.c[0]), Math.max(e.a[1], e.c[1])];
        assert.ok(!overlaps([r[0] - 0.15, r[1] - 0.15, r[2] + 0.15, r[3] + 0.15], [t.x - PIT, t.z - PIT, t.x + PIT, t.z + PIT]), 'a pit clear of the chain-link');
      }
  }
});

test('the chain-link: solid, open at every way in (doors, amenities, bays, the rec block\'s path)', () => {
  assert.ok(EDGES.length > 40);
  const fences = STREETWALL_SOLIDS.filter((s) => s[4] > 1 && s[4] < 1.4 && Math.min(s[2] - s[0], s[3] - s[1]) < 0.25);
  assert.ok(fences.length >= EDGES.length, 'every run solid');
  for (const t of TOWERS) {
    if (t.block === THE_BLOCK.block) continue;
    const way = doorWay(t, blockRect(t.block), 1.2);
    for (const f of fences) assert.ok(!overlaps(way, [f[0], f[1], f[2], f[3]]), `the chain-link across ${t.id}'s way in`);
  }
  for (const a of AMENITIES) for (const f of fences) assert.ok(!overlaps(amenityWay(a, 0.8), [f[0], f[1], f[2], f[3]]), `the chain-link across ${a.id}'s way out`);
  for (const y of BAYS) for (const f of fences) assert.ok(!overlaps(y.rect, [f[0], f[1], f[2], f[3]]), `the chain-link across ${y.id}`);
  for (const f of fences) assert.ok(!overlaps(REC.path, [f[0], f[1], f[2], f[3]]), 'the rec block\'s path open');
});

test('under the el: a lay-by of parked cars along Trench Avenue wherever its pillars stand over a yard', () => {
  const el = BAYS.filter((y) => y.id.endsWith(':el'));
  assert.ok(el.length >= 2);
  for (const y of el) {
    const b = blockRect(y.block);
    assert.equal(y.face, 'n');
    assert.equal(y.rect[1], b[1], 'against the avenue');
    assert.ok(EL_PILLARS.some((p) => p.at[0] > b[0] && p.at[0] < b[2]), 'under the el');
    assert.ok(BAY_CARS.filter((c) => c.bay === y.id).length >= 2, 'cars in it');
  }
  assert.ok(EL_PILLARS.length >= 8 && EL_PILLARS.every((p) => inTrenches(p.at[0], p.at[1])));
  assert.equal(EL_SPANS.length, EL_PILLARS.filter((p) => p.track === 'main').length - 1);
  for (const s of EL_SPANS) assert.ok(!PILLARS.some((p) => Math.hypot(p.at[0] - s.at[0], p.at[1] - s.at[1]) < 1), 'a span\'s lamp between pillars');
});

test('jersey barriers behind Bottom Street\'s car parks; dumpsters against the towers; trash by them and in the alleys', () => {
  assert.ok(CAR_PARKS.length >= 3 && BARRIERS.length >= 20);
  for (const j of BARRIERS) {
    const r = barrierRect(j);
    assert.ok(TRENCH_BLOCKS.some((b) => b.row === 'C' && inPoly(b.poly, [r[0], r[1]]) && inPoly(b.poly, [r[2], r[3]])), 'on a strip along the highway');
    assert.ok(CAR_PARKS.some((c) => r[0] >= c[0] - 1e-6 && r[2] <= c[2] + 1e-6 && r[1] >= c[3]), 'behind its car park');
  }
  for (const a of BARRIERS) for (const b of BARRIERS) if (a !== b) assert.ok(!overlaps(barrierRect(a), barrierRect(b)), 'end to end');
  assert.ok(DUMPSTERS.length >= 10);
  for (const d of DUMPSTERS) {
    const t = TOWERS.find((o) => o.id === d.tower)!;
    const b = blockRect(t.block);
    assert.ok(within(d.rect, b, 1.4), `${d.tower}'s dumpster on its yard`);
    // Against its wall: 0.15 out from the main part
    const m = t.parts[t.main].rect;
    const gap = Math.max(m[0] - d.rect[2], d.rect[0] - m[2], m[1] - d.rect[3], d.rect[1] - m[3]);
    assert.ok(Math.abs(gap - 0.15) < 1e-6, `${d.tower}'s dumpster against its wall (${gap})`);
    assert.ok(Math.abs(Math.max(d.rect[2] - d.rect[0], d.rect[3] - d.rect[1]) - DUMPSTER.l) < 1e-6);
    for (const o of TOWERS.filter((q) => q.block === t.block)) {
      assert.ok(!overlaps(d.rect, doorWay(o, b, 1.6)), `${d.tower}'s dumpster clear of ${o.id}'s way in`);
      for (const r of towerRects(o)) assert.ok(!overlaps(d.rect, r));
    }
    for (const a of AMENITIES.filter((o) => o.block === t.block)) assert.ok(!overlaps(d.rect, amenityWay(a, 1.2)) && !overlaps(d.rect, a.rect));
  }
  assert.ok(TRASH.length >= DUMPSTERS.length + 5);
  for (const tr of TRASH) assert.ok(TRENCH_BLOCKS.some((b) => inPoly(b.poly, [tr.x, tr.z])), 'trash on a block, off the street');
});

test('worn fronts: some of the rows\' shops shuttered (never a corner shop), the odd window boarded', () => {
  const lots = rows().lots;
  const shops = lots.filter((l) => l.type === 'shop');
  const shut = lots.filter(shuttered);
  assert.ok(shut.length >= 3 && shut.length < shops.length, `${shut.length} of ${shops.length} shops shuttered`);
  for (const c of CORNER_SHOPS) assert.ok(!shuttered(c.lot), `${c.name} isn't shuttered`);
  let n = 0;
  let all = 0;
  for (const t of TOWERS)
    for (let j = 0; j < 20; j++)
      for (let f = 0; f < 3; f++) {
        all++;
        if (boarded(t, 0, j, f)) n++;
      }
  assert.ok(n > 0 && n / all < 0.08, `a few boarded (${n} of ${all})`);
});

test('the boombox corners: by a walk-up between its stoops, the chairs and the people standing clear of everything', () => {
  assert.ok(BOOMBOXES.length >= 2);
  for (const bx of BOOMBOXES) {
    const blk = TRENCH_BLOCKS.find((b) => inPoly(b.poly, [bx.x, bx.z]))!;
    assert.ok(blk && YARDS.includes(blk), 'on a yard');
    assert.ok(within(bx.rect, blockRect(blk.id), 0.3));
    for (const [x, z] of [...bx.chairs, ...bx.standing]) assert.ok(!inSolid(x, z, 0.2), `someone inside a solid at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    for (const t of TOWERS.filter((o) => o.block === blk.id)) assert.ok(!overlaps(bx.rect, doorWay(t, blockRect(blk.id), 1.3)), `in ${t.id}'s way`);
  }
});

test("what's solid is in SOLIDS, off the streets and clear of the rest", () => {
  assert.ok(GRIT_SOLIDS.length === BARRIERS.length + DUMPSTERS.length);
  const others = [...PROJECT_SOLIDS, ...COMMONS_SOLIDS, ...METRO_SOLIDS];
  for (const s of GRIT_SOLIDS) {
    assert.ok(SOLIDS.includes(s) && s[0] < s[2] && s[1] < s[3] && s[4] > 0);
    for (const p of [
      [s[0], s[1]],
      [s[2], s[3]],
    ] as [number, number][])
      for (const r of roads) assert.ok(distToStreet(r, p) > r.half - 1e-6, `${s.join()} on ${r.id}`);
    for (const o of others) assert.ok(!overlaps([s[0], s[1], s[2], s[3]], [o[0], o[1], o[2], o[3]]), `${s.join()} in ${o.join()}`);
  }
});

test('the sound: the hood in The Trenches (not downtown), the boombox close by its corner', () => {
  const t = ambienceAt(-120, 195);
  assert.ok(t.hood > 0.99);
  assert.equal(ambienceAt(30, 30).hood, 0);
  const bx = BOOMBOXES[0];
  assert.ok(ambienceAt(bx.x + 1, bx.z).boombox > 0.9);
  assert.ok(ambienceAt(bx.x + 40, bx.z).boombox < 0.01);
});
