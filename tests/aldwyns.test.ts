// St Aldwyn's (aldwyns.ts; docs/south-plan.md Phase 3b, the owner's call: Victorian Gothic): the church laid east to
// west in its churchyard on the hilltop, its spire's tip 22.5 over its base; the lychgate on the churchyard's north edge
// in line with the porch, the path from Church Road through it to the porch door clear of everything; the graves and
// yews in the churchyard, off the path and clear of the church; nothing solid in the way in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHANCEL, CHURCH_BASE, CHURCH_LOW, CHURCH_PATH, CHURCH_SOLIDS, CHURCHYARD_SOLIDS, DOOR_SPOT, GRAVES, LYCHGATE, NAVE, PATH_W, PORCH, PORCH_DOOR, SPIRE_TIP, TOWER, YARD_WALL, YEWS } from '../src/scripts/city3d/aldwyns';
import { CHURCHYARD, type Pt } from '../src/scripts/city3d/south';
import { HOUSES, houseFoot } from '../src/scripts/city3d/southterraces';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { distTo, inside } from '../src/scripts/city3d/streetfaces';
import { HILL_H } from '../src/scripts/city3d/southground';

const STREETS = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp');
const offStreet = (p: Pt) => Math.min(...STREETS.map((s) => distToStreet(s, p) - s.half - 0.8));
const corners = (r: number[]): Pt[] => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;

test('the church in its churchyard on the hilltop: tower west, nave, chancel east, the porch north; its spire 22.5', () => {
  for (const r of [NAVE, CHANCEL, TOWER, PORCH]) for (const p of corners(r)) assert.ok(inside(CHURCHYARD, p), `a part at ${p} out of the churchyard`);
  assert.ok(TOWER[2] <= NAVE[0] && CHANCEL[0] >= NAVE[2], 'tower west, chancel east');
  assert.ok(CHANCEL[3] - CHANCEL[1] < NAVE[3] - NAVE[1], 'the chancel narrower');
  assert.ok(PORCH[3] <= NAVE[1] + 1e-9, 'the porch on the north side');
  assert.equal(SPIRE_TIP, 22.5);
  assert.ok(CHURCH_BASE > HILL_H * 0.7, 'up on the hill');
  assert.ok(CHURCH_BASE - CHURCH_LOW < 0.8, 'level enough a plinth takes it');
  for (const h of HOUSES) for (const p of houseFoot(h)) assert.ok(!inside(CHURCHYARD, p), `${h.id} in the churchyard`);
});

test('the way in: Church Road, the lychgate, the path to the porch door, clear of the houses, graves and anything solid', () => {
  assert.ok(Math.abs(LYCHGATE.at[0] - PORCH_DOOR[0]) < 0.5, 'the lychgate in line with the porch');
  assert.ok(distTo(CHURCHYARD, LYCHGATE.at, true) < 1.2, "the lychgate on the churchyard's edge");
  assert.ok(offStreet(CHURCH_PATH[0]) < 0.3 && offStreet(CHURCH_PATH[0]) > -0.9, 'the path from the sidewalk');
  assert.ok(Math.hypot(CHURCH_PATH[1][0] - PORCH_DOOR[0], CHURCH_PATH[1][1] - PORCH_DOOR[1]) < 0.8, 'to the porch door');
  for (let k = 0; k <= 20; k++) {
    const p: Pt = [CHURCH_PATH[0][0] + ((CHURCH_PATH[1][0] - CHURCH_PATH[0][0]) * k) / 20, CHURCH_PATH[0][1] + ((CHURCH_PATH[1][1] - CHURCH_PATH[0][1]) * k) / 20];
    for (const h of HOUSES) assert.ok(!inside(houseFoot(h), p), `the path through ${h.id}`);
    for (const b of [...CHURCH_SOLIDS, ...CHURCHYARD_SOLIDS]) assert.ok(!inBox(b, p[0], p[1], 0.25), `the path blocked at ${p}`);
  }
  assert.ok(!CHURCH_SOLIDS.some((b) => inBox(b, DOOR_SPOT[0], DOOR_SPOT[1], 0.3)), 'the door spot blocked');
});

test('the graves and yews: in the churchyard, off the path, clear of the church', () => {
  assert.ok(GRAVES.length > 40, `${GRAVES.length} graves`);
  for (const [x, z] of GRAVES) {
    assert.ok(inside(CHURCHYARD, [x, z]), 'a grave out of the churchyard');
    assert.ok(distTo(CHURCH_PATH, [x, z]) > PATH_W / 2 + 0.4, 'a grave on the path');
    assert.ok(!CHURCH_SOLIDS.some((b) => inBox(b, x, z, 0.8)), 'a grave against the church');
  }
  assert.ok(GRAVES.some((g) => g[3] === 1) && GRAVES.some((g) => g[3] === 2));
  assert.ok(YEWS.length >= 3);
  for (const [x, z] of YEWS) assert.ok(inside(CHURCHYARD, [x, z]) && distTo(CHURCH_PATH, [x, z]) > 1.2, 'a yew on the path or out of the yard');
});

test("the churchyard's wall: round its edge, open at the lychgate, clear of every house", () => {
  assert.ok(YARD_WALL.length > 20);
  for (const [p, q] of YARD_WALL) {
    assert.ok(distTo(CHURCHYARD, p, true) < 0.05 && distTo(CHURCHYARD, q, true) < 0.05, 'a wall off the edge');
    assert.ok(Math.hypot((p[0] + q[0]) / 2 - LYCHGATE.at[0], (p[1] + q[1]) / 2 - LYCHGATE.at[1]) > LYCHGATE.w / 2 - 0.3, 'the wall across the lychgate');
  }
});
