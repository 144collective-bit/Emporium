// Palm Court indoors (courtinside.ts, docs/mall-plan.md "One mall" Phase 3): two storeys under a glass vault, the
// galleries, bridges and the food hall upstairs, the escalators by the south entrance, the entrances. Walking in at the
// south doors, up the escalators to the bridges and the galleries, to the food hall and into the Skywalk's pavilion
// upstairs; never off an edge into the void, nor under an escalator.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRIDGES,
  CINEMA_DOORS,
  CONNECTOR,
  COURT_INSIDE_PEOPLE,
  COURT_PLANTERS,
  COURT_TALLEST,
  ENTRANCES,
  ESCALATORS,
  FOOD_NAMES,
  FOOD_STALLS,
  FOOT_Z,
  L1,
  LAND_Z,
  LEVEL_SOLIDS,
  NORTH,
  SOUTH,
  TABLES,
  UPPER,
  UPPER_NAMES,
  UPPER_UNITS,
  VOID,
  courtFloor,
  courtWall,
  escalatorY,
  floorsAt,
} from '../src/scripts/city3d/courtinside';
import { CINEMA, COURT_SPAWN, FOUNTAIN, PAVILION, PROM, ROW_H, SHOPS, TALLEST } from '../src/scripts/city3d/mall';
import { UP, mallFloor, mallWall } from '../src/scripts/city3d/mallinside';
import { L1 as LINK_L1, MEZZ_L1, PAV_DOORS, linkFloorAt, linkUp, linkWall } from '../src/scripts/city3d/malllink';
import { SOLIDS } from '../src/scripts/city3d/solids';

type Rect = readonly number[];
const inBox = (b: Rect, x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const SLAB = 0.15;
const R = 0.17;

test('two storeys under the vault, at the mall\'s floors, under the pylon; made-up names upstairs, the food hall\'s too', () => {
  assert.equal(L1, LINK_L1);
  assert.ok(Math.abs(ROW_H - (UP * 2 + 0.35)) < 1e-9);
  for (const s of SHOPS) assert.equal(s.h, ROW_H);
  assert.ok(COURT_TALLEST <= TALLEST && TALLEST < 12.5);
  assert.equal(UPPER_UNITS.length, UPPER_NAMES.length);
  assert.equal(new Set(UPPER_UNITS.map((u) => u.name)).size, UPPER_UNITS.length);
  for (const n of [...UPPER_NAMES, ...FOOD_NAMES]) assert.ok(!/\d/.test(n), `${n}: no numbers`);
  // The food hall's stalls in the east row's north end, upstairs, where there's no unit
  for (const s of FOOD_STALLS) {
    assert.ok(s.z0 >= NORTH && s.z1 <= PAVILION[3] + 0.2);
    assert.ok(!UPPER_UNITS.some((u) => u.face === -1 && u.rect[1] < s.z1 && u.rect[3] > s.z0), 'a unit over a stall');
  }
  // The tables on the terrace, clear of the way from the cinema's doors and into the pavilion
  for (const [x, z] of TABLES) {
    assert.ok(inBox(UPPER[0], x, z, -0.5), 'a table on the terrace');
    assert.ok(x < CINEMA_DOORS[0] - 0.8 || x > CINEMA_DOORS[1] + 0.8, "a table in the cinema's way");
  }
  assert.ok(CINEMA_DOORS[0] > PROM[0] && CINEMA_DOORS[1] < PROM[1] && NORTH === CINEMA.rect[3]);
});

test('the floors: two over the galleries, the terrace and the bridges, one in the void, an escalator on its own', () => {
  const zm = -90;
  assert.deepEqual(floorsAt((VOID[0] + VOID[2]) / 2, zm), [0]);
  assert.deepEqual(floorsAt(VOID[0] - 1, zm), [0, UP]);
  assert.deepEqual(floorsAt((VOID[0] + VOID[2]) / 2, (BRIDGES[0][0] + BRIDGES[0][1]) / 2), [0, UP]);
  assert.deepEqual(floorsAt((PROM[0] + PROM[1]) / 2, NORTH + 2), [0, UP]);
  const e = ESCALATORS[0];
  const x = (e.x0 + e.x1) / 2;
  assert.equal(escalatorY(FOOT_Z + 0.3), 0);
  assert.equal(escalatorY(LAND_Z + 0.4), UP);
  assert.deepEqual(floorsAt(x, (FOOT_Z + LAND_Z) / 2), [escalatorY((FOOT_Z + LAND_Z) / 2)]);
  assert.equal(courtFloor(VOID[0] - 1, zm, SLAB + 0.3), SLAB);
  assert.equal(courtFloor(VOID[0] - 1, zm, L1 + 0.3), L1);
  assert.equal(courtFloor(PROM[0] - 5, zm, 0), null);
  // The escalators land on the south bridge, their foot clear of the south doors
  assert.equal(LAND_Z, BRIDGES[BRIDGES.length - 1][1]);
  assert.ok(FOOT_Z + 0.8 < SOUTH - 1.8);
  // The bridges and the trees clear of the fountain; the trees in the void, clear of the bridges
  for (const [z0, z1] of BRIDGES) assert.ok(z1 < FOUNTAIN.z - FOUNTAIN.r - 2 || z0 > FOUNTAIN.z + FOUNTAIN.r + 2);
  for (const [px, pz] of COURT_PLANTERS) {
    assert.ok(inBox(VOID, px, pz, -0.5), 'a tree in the void');
    assert.ok(BRIDGES.every(([z0, z1]) => pz < z0 - 1 || pz > z1 + 1), 'a tree under a bridge');
    assert.ok(Math.hypot(px - FOUNTAIN.x, pz - FOUNTAIN.z) > FOUNTAIN.r + 1.5);
  }
});

test('the entrances: open doors, nothing in the way; its people on their floors, clear of what stands there', () => {
  for (const e of ENTRANCES) {
    for (let u = e.door[0] + 0.3; u < e.door[1] - 0.3; u += 0.1)
      for (const d of [-0.5, 0.5]) {
        const [x, z] = e.along === 'x' ? [u, e.at + d] : [e.at + d, u];
        assert.ok(!SOLIDS.some((b) => inBox(b, x, z, R)), `${e.id}'s doors at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      }
    assert.ok(e.door[1] - e.door[0] > 2.5);
  }
  assert.ok(!SOLIDS.some((b) => inBox(b, COURT_SPAWN.x, COURT_SPAWN.z, R)), 'the spawn is clear');
  for (const p of COURT_INSIDE_PEOPLE) {
    if (p.act === 'sit') continue;
    assert.ok(floorsAt(p.x, p.z).includes(p.y), `someone at ${p.x.toFixed(1)}, ${p.z.toFixed(1)} off their floor`);
    assert.ok(!SOLIDS.some((b) => inBox(b, p.x, p.z, 0.15)) && !LEVEL_SOLIDS.some((b) => (b[4] === 1) === p.y > 1 && inBox(b, p.x, p.z, 0.15)), `someone at ${p.x.toFixed(1)}, ${p.z.toFixed(1)} in something`);
  }
  // The way into the pavilion upstairs is where its promenade door is, its mezzanine beyond it
  const door = PAV_DOORS.find((d) => d.x === PAVILION[2] && d.z0 < MEZZ_L1[3])!;
  assert.ok(Math.abs(door.z0 - CONNECTOR[1]) < 1e-9 && Math.abs(door.z1 - CONNECTOR[3]) < 1e-9);
});

test('walking in at the south doors, up the escalators, round the galleries to the food hall and into the pavilion upstairs', () => {
  const step = 0.25;
  const [x0, z0, x1, z1] = [PAVILION[0] + 1, NORTH + 0.2, PROM[1] + 0.5, COURT_SPAWN.z + 1];
  const nx = Math.ceil((x1 - x0) / step) + 1;
  const nz = Math.ceil((z1 - z0) / step) + 1;
  const near = SOLIDS.filter((b) => b[2] > x0 - 1 && b[0] < x1 + 1 && b[3] > z0 - 1 && b[1] < z1 + 1);
  // (as walk.ts: up in the Skywalk only its own walls; else what's solid, the hall's, the pavilion's and Palm Court's)
  const blocked = (x: number, z: number, y: number) => {
    if (linkUp(x, z, y)) return linkWall(x, z, y, R);
    return near.some((b) => inBox(b, x, z, R)) || mallWall(x, z, y, R) || linkWall(x, z, y, R) || courtWall(x, z, y, R);
  };
  const ground = (x: number, z: number, y: number) => linkFloorAt(x, z, y) ?? mallFloor(x, z, y + 0.3) ?? courtFloor(x, z, y + 0.3) ?? SLAB;
  const seen = new Set<string>();
  const on = new Map<string, number[]>();
  const key = (i: number, k: number, y: number) => `${i},${k},${Math.round(y * 4)}`;
  const at = (i: number, k: number) => [x0 + i * step, z0 + k * step];
  const ix = (x: number) => Math.round((x - x0) / step);
  const kz = (z: number) => Math.round((z - z0) / step);
  const start: [number, number, number] = [ix(COURT_SPAWN.x), kz(COURT_SPAWN.z), SLAB];
  const queue = [start];
  seen.add(key(...start));
  while (queue.length) {
    const [i, k, y] = queue.pop()!;
    for (const [di, dk] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const [a, c] = [i + di, k + dk];
      if (a < 0 || c < 0 || a >= nx || c >= nz) continue;
      const [x, z] = at(a, c);
      if (blocked(x, z, y)) continue;
      const g = ground(x, z, y);
      if (g > y + 0.3 + 1e-6) continue;
      const kk = key(a, c, g);
      if (seen.has(kk)) continue;
      seen.add(kk);
      on.set(`${a},${c}`, [...(on.get(`${a},${c}`) ?? []), g]);
      queue.push([a, c, g]);
    }
  }
  const reached = (x: number, z: number, y: number) => (on.get(`${ix(x)},${kz(z)}`) ?? []).some((g) => Math.abs(g - y) < 0.05);
  assert.ok(reached(PROM[0] + 1.5, SOUTH - 3, SLAB), 'in at the south doors');
  assert.ok(reached((VOID[0] + VOID[2]) / 2, (BRIDGES[2][0] + BRIDGES[2][1]) / 2, L1), 'up the escalators to the south bridge');
  assert.ok(reached(VOID[0] - 1, -90, L1), 'the west gallery');
  assert.ok(reached(VOID[2] + 1, -90, L1), 'the east gallery');
  assert.ok(reached((VOID[0] + VOID[2]) / 2, (BRIDGES[0][0] + BRIDGES[0][1]) / 2, L1), 'the north bridge');
  assert.ok(reached((CINEMA_DOORS[0] + CINEMA_DOORS[1]) / 2, NORTH + 0.6, L1), "the food hall, at the cinema's doors upstairs");
  // (on its mezzanine past the escalators' foot, clear of the lift)
  assert.ok(reached(MEZZ_L1[2] - 5.8, CONNECTOR[1] + 1.3, L1), "into the pavilion's mezzanine upstairs");
  assert.ok(reached((CINEMA_DOORS[0] + CINEMA_DOORS[1]) / 2, NORTH + 0.6, SLAB), "the cinema's doors downstairs");
  for (const [cell, ys] of on) {
    const [a, c] = cell.split(',').map(Number);
    const [x, z] = at(a, c);
    for (const y of ys) {
      // Never up over the void but on a bridge or an escalator
      const onBridge = BRIDGES.some(([b0, b1]) => z >= b0 - 0.01 && z <= b1 + 0.01);
      const onEsc = ESCALATORS.some((e) => x > e.x0 && x < e.x1) && z > LAND_Z - 0.01 && z < FOOT_Z;
      if (y > SLAB + 0.5 && inBox(VOID, x, z, -0.01)) assert.ok(onBridge || onEsc, `up over the void at ${x}, ${z}`);
      // Nowhere under the escalators' ramp
      if (ESCALATORS.some((e) => x > e.x0 && x < e.x1) && z > LAND_Z && z < FOOT_Z) assert.ok(Math.abs(y - SLAB - escalatorY(z)) < 0.35, `under the escalator at ${x}, ${z}`);
    }
  }
});

test("the vault's crown under Paradise Cinema's roof, its front closing the vault's north end", () => {
  assert.ok(COURT_TALLEST < SLAB + CINEMA.h, 'under the cinema');
});
