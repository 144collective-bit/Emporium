// The council rows, the bungalows, the allotments, the corner shops and the community centre (council.ts;
// docs/south-plan.md Phase 3d, the owner's calls): semis on the council land, bungalows round Degen's compound (never in
// it), each in its block off the streets and footpaths, none in another or in what was there before; the allotments'
// plots on the brook's north bank; the corner shops and the derelict centre on corners of their own; nothing solid in
// anyone's way.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALLOTMENTS, ALLOTMENT_SOLIDS, BUNGALOW, BUNGALOWS, CENTRE, COMMUNITY_CENTRE, CORNER, CORNER_SHOPS, COUNCIL_RECT, COUNCIL_SOLIDS, PLOTS, SEMI, SEMIS, lotRing } from '../src/scripts/city3d/council';
import { BROOK, COMPOUND, COUNCIL_LAND, FOOTPATHS, PATH_HALF, REC, zoneAt, type Pt } from '../src/scripts/city3d/south';
import { HOUSES, houseFoot } from '../src/scripts/city3d/southterraces';
import { SHOPS, shopFoot } from '../src/scripts/city3d/highroad';
import { BLOCKS } from '../src/scripts/city3d/southblocks';
import { ENDS_SPAWNS } from '../src/scripts/city3d/endsplaces';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { distTo, inside } from '../src/scripts/city3d/streetfaces';

const STREETS = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp');
const offStreet = (p: Pt) => Math.min(...STREETS.map((s) => distToStreet(s, p) - s.half - 0.8));
const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const others = (): Pt[][] => [...HOUSES.map((h) => houseFoot(h)), ...SHOPS.map((s) => shopFoot(s)), ...BLOCKS.map((b) => b.foot)];

test('semis on the council land, bungalows round the compound: off the streets and footpaths, in nothing that was there', () => {
  assert.ok(SEMIS.length >= 10, `${SEMIS.length} pairs`);
  assert.ok(BUNGALOWS.length >= 12, `${BUNGALOWS.length} bungalows`);
  const lots = [...SEMIS.map((s) => ({ id: s.id, foot: lotRing(s, 0, SEMI.depth), zone: ['council', 'tall'] })), ...BUNGALOWS.map((s) => ({ id: s.id, foot: lotRing(s, 0, BUNGALOW.depth), zone: ['bungalow'] }))];
  for (const { id, foot, zone } of lots) {
    const c: Pt = [foot.reduce((v, p) => v + p[0], 0) / 4, foot.reduce((v, p) => v + p[1], 0) / 4];
    // (the council land runs up to the tall band's edge along Fennel Way: its semis' backs there)
    assert.ok(zone.includes(zoneAt(c[0], c[1])), `${id} off its land`);
    for (const p of foot) {
      assert.ok(offStreet(p) > 0.3, `${id} by a street`);
      for (const f of FOOTPATHS) assert.ok(distTo(f.pts, p) > PATH_HALF + 0.3, `${id} on ${f.id}`);
      assert.ok(!(p[0] > COMPOUND[0] && p[0] < COMPOUND[2] && p[1] > COMPOUND[1] && p[1] < COMPOUND[3]), `${id} in Degen's compound`);
      for (const o of others()) assert.ok(!inside(o, p), `${id} in something that was there`);
    }
  }
  for (let i = 0; i < lots.length; i++) for (let j = i + 1; j < lots.length; j++) assert.ok(!lots[i].foot.some((p) => inside(lots[j].foot, [p[0] + 0.01, p[1] + 0.01])), `${lots[i].id} in ${lots[j].id}`);
  // (as the owner asked: brick, render and some pebble-dash; porches on some; a caravan on a few drives)
  assert.ok(SEMIS.some((s) => s.finish === 'render') && SEMIS.some((s) => s.finish === 'brick'));
  assert.ok(SEMIS.some((s) => s.porch[0] || s.porch[1]));
});

test('the allotments: plots on the brook\'s north bank, off the rec ground; sheds on some', () => {
  assert.ok(PLOTS.length >= 12, `${PLOTS.length} plots`);
  assert.ok(PLOTS.some((p) => p.shed));
  for (const p of PLOTS) for (const q of p.ring) {
    assert.ok(inside(ALLOTMENTS, q), 'a plot off the allotments');
    assert.ok(distTo(BROOK, q) > 3, 'a plot in the brook');
    assert.ok(!inside(REC, q), 'a plot on the rec ground');
    assert.ok(offStreet(q) > 0.5, 'a plot on a street');
    for (const h of HOUSES) assert.ok(!inside(houseFoot(h), q), 'a plot in a house');
  }
});

test('the corner shops and the derelict community centre: placed, named, clear of the rest', () => {
  assert.ok(CORNER_SHOPS.length >= 2);
  for (const c of CORNER_SHOPS) {
    assert.ok(!/\d/.test(c.name), 'a number on a sign');
    for (const p of lotRing(c, 0, CORNER.depth)) for (const o of others()) assert.ok(!inside(o, p), `${c.name} in something that was there`);
  }
  assert.ok(COMMUNITY_CENTRE, 'the community centre');
  for (const p of lotRing(COMMUNITY_CENTRE!, 0, CENTRE.depth)) assert.ok(offStreet(p) > 0.3);
});

test("nothing solid in anyone's way: the places' arrivals, the High Road's doors", () => {
  for (const at of Object.values(ENDS_SPAWNS)) assert.ok(![...COUNCIL_SOLIDS, ...ALLOTMENT_SOLIDS].some((b) => inBox(b, at.x, at.z, 0.4)), `an arrival at ${at.x}, ${at.z} blocked`);
  for (const b of COUNCIL_SOLIDS) for (const p of [[b[0], b[1]], [b[2], b[3]]] as Pt[]) assert.ok(offStreet(p) > 0, `a solid on a street at ${p}`);
});

test("the council's land (fixed in south.ts, what the village's chunk loads round) holds everything laid", () => {
  const [x0, z0, x1, z1] = COUNCIL_LAND;
  assert.ok(COUNCIL_RECT[0] >= x0 && COUNCIL_RECT[1] >= z0 && COUNCIL_RECT[2] <= x1 && COUNCIL_RECT[3] <= z1, `laid over ${COUNCIL_RECT.join(',')}, the land ${COUNCIL_LAND.join(',')}`);
  for (const b of [...COUNCIL_SOLIDS, ...ALLOTMENT_SOLIDS]) assert.ok(b[0] >= x0 && b[1] >= z0 && b[2] <= x1 && b[3] <= z1, `a solid at ${b[0]},${b[1]} past the land`);
});
