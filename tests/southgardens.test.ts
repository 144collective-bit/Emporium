// Aldwyn's Green's back gardens (southgardens.ts; the improvement loop's J6, R3's garden rule): every rear yard closed
// as a plot (its fences meet the house's back corners and the back wall, a shared fence drawn once), a patio against
// the house's back wall inside the yard, sheds in a back corner off the patio and in no other house.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GARDEN, GARDENS } from '../src/scripts/city3d/southgardens';
import { HOUSES, houseFoot } from '../src/scripts/city3d/southterraces';
import { inside } from '../src/scripts/city3d/streetfaces';
import type { Pt } from '../src/scripts/city3d/south';

const d = (a: Pt, c: Pt) => Math.hypot(a[0] - c[0], a[1] - c[1]);
const shrink = (r: Pt[], k: number): Pt[] => {
  const c: Pt = [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
  return r.map((p) => [p[0] + (c[0] - p[0]) * k, p[1] + (c[1] - p[1]) * k]);
};
const allFences = GARDENS.flatMap((g) => g.fences);
/** A fence runs from (within a hair of) p along the yard's side */
const fenced = (p: Pt) => allFences.some(([a]) => d(a, p) < 0.3);

test('a garden for every house; each yard closed: both sides fenced from the back corners, the back wall across its end', () => {
  assert.equal(GARDENS.length, HOUSES.length);
  for (const g of GARDENS) {
    const [l, r, er, el] = g.yard;
    assert.ok(fenced(l) && fenced(r), `${g.house}: a side open`);
    assert.ok(d(g.back[0], el) < 1e-9 && d(g.back[1], er) < 1e-9, `${g.house}: the back wall off the yard's end`);
    // (its own fences reach the back wall)
    for (const [a, c] of g.fences) assert.ok(d(a, c) >= g.rear - 1e-9, `${g.house}: a fence short of the back wall`);
  }
  // (a shared fence drawn once: no two fences on the same line)
  for (let i = 0; i < allFences.length; i++)
    for (let j = i + 1; j < allFences.length; j++) assert.ok(d(allFences[i][0], allFences[j][0]) > 0.05 || d(allFences[i][1], allFences[j][1]) > 0.05, 'a fence drawn twice');
});

test('the patio against the back wall inside its yard; the sheds in a corner, off the patio, in no house', () => {
  let sheds = 0;
  for (const g of GARDENS) {
    for (const p of shrink(g.patio, 0.02)) assert.ok(inside(g.yard, p), `${g.house}: the patio out of its yard`);
    assert.ok(d(g.patio[0], g.yard[0]) < GARDEN.fenceT + 1e-6, `${g.house}: the patio off the back wall`);
    if (!g.shed) continue;
    sheds++;
    for (const p of g.shed) assert.ok(inside(g.yard, p), `${g.house}: the shed out of its yard`);
    const pd = Math.min(...g.shed.map((p) => d(p, g.yard[0]) ** 2 + 0).map(Math.sqrt));
    assert.ok(pd > GARDEN.patio, `${g.house}: the shed on the patio`);
    for (const o of HOUSES) for (const p of g.shed) assert.ok(!inside(houseFoot(o), p), `${g.house}: the shed in ${o.id}`);
  }
  assert.ok(sheds > GARDENS.length / 6 && sheds < GARDENS.length / 2, `sheds in about one in three (${sheds})`);
});
