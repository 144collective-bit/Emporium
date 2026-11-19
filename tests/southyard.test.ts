// The ground round Endswood's blocks (southyard.ts; docs/south-plan.md Phase 2d, the owner's calls): the courts' bays
// inside their courts with cars in about two in three, the bin stores and bike sheds clear of the bays, the blocks and
// the streets, the play area's frame, sandpit and fenced ball court in it, a few trees on the grass, planters and
// benches on the podium deck that stop you up there, and nothing solid in anyone's way.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BALL_COURT, BAYS, BIKE_SHEDS, BIN_STORES, COURT_GAP, DECK_COLUMNS, DECK_PROPS, FRAME, SANDPIT, YARD_CARS, YARD_SOLIDS, YARD_TREES,
  bayCorners, courtFence, onDeckProp, thingCorners,
} from '../src/scripts/city3d/southyard';
import { BRIDGES, COURTS, DECKS, DESIRE_LINES, GRASS, PLAY, inBlock, type Pt } from '../src/scripts/city3d/southblocks';
import { SKY_LIFTS, STAIR, skyWall } from '../src/scripts/city3d/southsky';
import { ENDS_DOORS, ENDS_SPAWNS } from '../src/scripts/city3d/endsplaces';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { distTo, inside } from '../src/scripts/city3d/streetfaces';

const STREETS = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp');
const offStreet = (p: Pt) => Math.min(...STREETS.map((s) => distToStreet(s, p) - s.half - 0.8));
const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const segDist = (p: Pt, a: Pt, b: Pt) => distTo([a, b], p);

test('the courts: their bays inside them, apart, off the street; cars in about two in three', () => {
  assert.ok(BAYS.length >= 30, `${BAYS.length} bays`);
  for (const c of COURTS) assert.ok(BAYS.some((b) => b.court === c.id), `${c.id} has no bays`);
  for (const b of BAYS) {
    const poly = COURTS.find((c) => c.id === b.court)!.poly;
    for (const p of bayCorners(b)) {
      assert.ok(inside(poly, p), `a bay out of ${b.court}`);
      assert.ok(offStreet(p) > -0.5, `a bay on a street at ${p}`);
      assert.ok(!inBlock(p), `a bay in a block at ${p}`);
    }
  }
  for (let i = 0; i < BAYS.length; i++) for (let j = i + 1; j < BAYS.length; j++) assert.ok(Math.hypot(BAYS[i].x - BAYS[j].x, BAYS[i].z - BAYS[j].z) > 2.4, 'two bays on each other');
  const share = YARD_CARS.length / BAYS.length;
  assert.ok(share > 0.45 && share < 0.85, `cars in ${(share * 100).toFixed(0)}% of the bays`);
  for (const [, x, z] of YARD_CARS) assert.ok(BAYS.some((b) => b.x === x && b.z === z), 'a car off its bay');
});

test('bin stores and bike sheds: clear of the bays, the blocks, the streets and the play area', () => {
  for (const t of [...BIN_STORES, ...BIKE_SHEDS])
    for (const p of thingCorners(t)) {
      assert.ok(!inBlock(p, 0.3), `${t.kind} at ${t.at} in a block`);
      assert.ok(offStreet(p) > 0.3, `${t.kind} at ${t.at} by a street`);
      assert.ok(!inside(PLAY, p), `${t.kind} in the play area`);
      assert.ok(!BAYS.some((b) => inside(bayCorners(b), p)), `${t.kind} at ${t.at} in a bay`);
    }
  assert.ok(BIN_STORES.length >= COURTS.length, 'bins by every court');
});

test('the play area: the frame, the sandpit and the ball court in it, apart; the court fenced, a way in at its west side', () => {
  const things = [FRAME, SANDPIT, BALL_COURT];
  for (const t of things) for (const p of thingCorners(t)) assert.ok(inside(PLAY, p), `${t.kind} out of the play area`);
  for (let i = 0; i < things.length; i++)
    for (let j = i + 1; j < things.length; j++) for (const p of thingCorners(things[i])) assert.ok(!inside(thingCorners(things[j]), p), `${things[i].kind} in ${things[j].kind}`);
  const runs = courtFence();
  assert.equal(runs.length, 5);
  const [w0, w1] = [runs[3][1], runs[4][0]];
  assert.ok(Math.abs(Math.hypot(w1[0] - w0[0], w1[1] - w0[1]) - COURT_GAP) < 1e-6, 'the way in');
});

test('a few trees on the grass: apart, off the desire lines, clear of the blocks, the streets and under no bridge', () => {
  assert.ok(YARD_TREES.length >= 8, `${YARD_TREES.length} trees`);
  for (const [x, z] of YARD_TREES) {
    const p: Pt = [x, z];
    assert.ok(inside(GRASS[0], p), 'a tree off the grass');
    assert.ok(!inBlock(p, 3), 'a tree by a block');
    assert.ok(offStreet(p) > 1, 'a tree by a street');
    for (const l of DESIRE_LINES) assert.ok(distTo(l, p) > 2, 'a tree on a desire line');
    for (const br of BRIDGES) assert.ok(segDist(p, br.pts[0], br.pts[1]) > 2.5, `a tree under ${br.id}`);
  }
  for (let i = 0; i < YARD_TREES.length; i++)
    for (let j = i + 1; j < YARD_TREES.length; j++) assert.ok(Math.hypot(YARD_TREES[i][0] - YARD_TREES[j][0], YARD_TREES[i][1] - YARD_TREES[j][1]) > 6, 'two trees together');
});

test('the podium deck: planters and benches along its open edges, stopping you up there; its columns under it, out of the bays', () => {
  const deck = DECKS[0];
  assert.ok(DECK_PROPS.some((t) => t.kind === 'planter') && DECK_PROPS.some((t) => t.kind === 'bench'));
  for (const t of DECK_PROPS) {
    assert.equal(t.y, deck.y);
    for (const p of thingCorners(t)) assert.ok(inside(deck.poly, p), `a ${t.kind} off the deck`);
    assert.ok(onDeckProp(t.at[0], t.at[1]));
    assert.equal(skyWall(t.at[0], t.at[1], deck.y, 0.2), true, `walking into a ${t.kind}`);
  }
  // (the deck's middle is open)
  const c: Pt = [deck.poly.reduce((s, p) => s + p[0], 0) / deck.poly.length, deck.poly.reduce((s, p) => s + p[1], 0) / deck.poly.length];
  assert.equal(onDeckProp(c[0], c[1], 0.3), false);
  assert.ok(DECK_COLUMNS.length >= 4);
  for (const p of DECK_COLUMNS) {
    assert.ok(inside(deck.poly, p));
    assert.ok(!BAYS.some((b) => inside(bayCorners(b), p)), 'a column in a bay');
  }
});

test("nothing solid in anyone's way: the lifts' doors, the stair's foot, the places' doors and arrivals, the footpaths", () => {
  const spots: Pt[] = [...SKY_LIFTS.map((l): Pt => [l.door.x, l.door.z]), STAIR.foot, ...ENDS_DOORS.map((d): Pt => [d.x, d.z]), ...Object.values(ENDS_SPAWNS).map((s): Pt => [s.x, s.z])];
  for (const [x, z] of spots) assert.ok(!YARD_SOLIDS.some((b) => inBox(b, x, z, 0.4)), `something solid at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  for (const b of YARD_SOLIDS) for (const p of [[b[0], b[1]], [b[2], b[3]]] as Pt[]) assert.ok(offStreet(p) > -0.2, `a solid on a street at ${p}`);
});
