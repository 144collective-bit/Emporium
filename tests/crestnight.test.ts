// Crestmont by night (crestnight.ts, the premium upgrade's Phase 1; the owner's call, 2026-11-19: "Glamorous"): most
// windows lit, the same every time, fewer on phones; festoon strings sagging between their ends and over the gardens'
// parasols, strung only between lamps level with each other and nothing tall under them; the pools' lights inside
// the water; the uplights along the walls clear of the corners.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FESTOON, POOL_LIGHTS, UPLIGHT, WINDOW_SHARE, WINDOW_SHARE_LOW, alongWall, festoon, hash01, pairRuns, poolLights, windowGlow } from '../src/scripts/city3d/crestnight';
import { ESTATES } from '../src/scripts/city3d/estates';
import { MANSIONS } from '../src/scripts/city3d/mansions';
import { ESTATE_GARDENS, HEIGHT, MANSION_GARDENS, SITE_GARDENS, type Feat } from '../src/scripts/city3d/crestgardens';

test('the windows: most lit, a few dark, fewer lit on phones, each the same every time', () => {
  const count = (low: boolean) => {
    const n = { warm: 0, soft: 0, dark: 0 };
    for (let i = 0; i < 4000; i++) n[windowGlow(`house-${i % 40}`, (i * 0.83) % 9, 0.55 + (i % 3) * 1.75, -(i % 7) * 1.1, low)]++;
    return n;
  };
  const d = count(false);
  const p = count(true);
  const lit = (n: typeof d) => (n.warm + n.soft) / 4000;
  assert.ok(Math.abs(lit(d) - (WINDOW_SHARE.warm + WINDOW_SHARE.soft)) < 0.04, `desktop lit ${lit(d)}`);
  assert.ok(Math.abs(lit(p) - (WINDOW_SHARE_LOW.warm + WINDOW_SHARE_LOW.soft)) < 0.04, `phones lit ${lit(p)}`);
  assert.ok(lit(d) > 0.75, 'most windows lit (the owner: "Glamorous")');
  assert.ok(lit(p) < lit(d), 'phones light fewer');
  for (let i = 0; i < 50; i++) assert.equal(windowGlow('estate-3', i, 1, -i, false), windowGlow('estate-3', i, 1, -i, false));
  for (let i = 0; i < 200; i++) {
    const r = hash01('x', i, i * 2, i * 3);
    assert.ok(r >= 0 && r < 1);
  }
});

test('a festoon: its bulbs between its ends, sagging to the middle, about a step apart', () => {
  const a: [number, number, number] = [0, FESTOON.h, 0];
  const b: [number, number, number] = [6, FESTOON.h, 0];
  const bulbs = festoon(a, b);
  assert.ok(Math.abs(bulbs.length - (6 / FESTOON.step - 1)) <= 1);
  const low = Math.min(...bulbs.map((p) => p[1]));
  assert.ok(Math.abs(FESTOON.h - FESTOON.sag - low) < 0.02, 'the sag at its middle');
  for (const p of bulbs) assert.ok(p[0] > 0 && p[0] < 6 && p[1] <= FESTOON.h && p[1] >= FESTOON.h - FESTOON.sag - 1e-9);
  // (the lowest bulb still over a garden parasol's top)
  assert.ok(FESTOON.h - FESTOON.sag > HEIGHT.umbrella + 0.05, 'a festoon through the parasols');
});

test('the runs: between lamps level with each other, each lamp once, none too long', () => {
  assert.deepEqual(pairRuns([[0, 0]]), []);
  assert.deepEqual(pairRuns([[0, 0], [3, 0]]), [[0, 1]]);
  assert.deepEqual(pairRuns([[0, 0], [3, 2]]), [], 'not level');
  assert.deepEqual(pairRuns([[0, 0], [FESTOON.run + 1, 0]]), [], 'too long');
  const four: [number, number][] = [[0, 0], [4, 0], [0, -6], [4, -6]];
  const r = pairRuns(four);
  assert.equal(r.length, 2);
  assert.equal(new Set(r.flat()).size, 4);
});

test("the gardens' festoons: nothing tall under any of them", () => {
  const low = FESTOON.h - FESTOON.sag - 0.05;
  const all: { id: string; feats: Feat[] }[] = [
    ...ESTATES.map((e, i) => ({ id: e.id, feats: ESTATE_GARDENS[i].feats })),
    ...MANSIONS.map((m, i) => ({ id: m.id, feats: MANSION_GARDENS[i].feats })),
    ...SITE_GARDENS.map((s) => ({ id: s.id, feats: s.g.feats })),
  ];
  let runs = 0;
  for (const { id, feats } of all) {
    const lamps = feats.filter((f) => f.kind === 'lamp').map((f): [number, number] => [(f.r[0] + f.r[2]) / 2, (f.r[1] + f.r[3]) / 2]);
    for (const [i, j] of pairRuns(lamps)) {
      runs++;
      const [a, c] = [lamps[i], lamps[j]];
      for (let t = 0.05; t < 0.96; t += 0.05) {
        const [u, v] = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
        for (const f of feats) {
          const h = HEIGHT[f.kind] ?? 0;
          if (f.kind === 'lamp' || h < low) continue;
          assert.ok(!(u > f.r[0] && u < f.r[2] && v > f.r[1] && v < f.r[3]), `${id}'s festoon over its ${f.kind}`);
        }
      }
    }
  }
  assert.ok(runs > ESTATES.length, 'festoons in the gardens');
});

test("the pools' lights: inside the water, along its longer sides", () => {
  for (const e of ESTATES) {
    const [u0, v0, u1, v1] = e.pool;
    const pts = poolLights(u0, v0, u1, v1);
    assert.ok(pts.length >= 2);
    for (const [u, v] of pts) assert.ok(u > Math.min(u0, u1) + POOL_LIGHTS.r && u < Math.max(u0, u1) - POOL_LIGHTS.r && v > Math.min(v0, v1) + POOL_LIGHTS.r && v < Math.max(v0, v1) - POOL_LIGHTS.r, `${e.id}'s pool light outside its water`);
  }
  for (const m of MANSIONS) for (const [u, v] of poolLights(...m.pool)) assert.ok(u > Math.min(m.pool[0], m.pool[2]) && u < Math.max(m.pool[0], m.pool[2]) && v > Math.min(m.pool[1], m.pool[3]) && v < Math.max(m.pool[1], m.pool[3]), `${m.id}'s pool light outside its water`);
});

test('the uplights: along the wall, clear of its corners', () => {
  const pts = alongWall([0, 0], [10, 0]);
  assert.ok(pts.length >= 3);
  for (const [x] of pts) assert.ok(x >= UPLIGHT.end - 1e-9 && x <= 10 - UPLIGHT.end + 1e-9);
  assert.deepEqual(alongWall([0, 0], [1, 0]), []);
});
