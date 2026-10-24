// Sector 7 Tower and its sky deck (skydeck.ts, docs/finance-plan.md Phase 6): the deck on the spire's top tier,
// walkable inside its rail and only up there, the lift's doors and where it lets you out, the viewers you can walk
// round to, Walk in on the plaza, the place in PLACES and the live settings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORE, CORE_RECT, DECK, LIFT, RAIL_IN, RIBS, SKYDECK_SOLIDS, SPIRE, TOWER_NAME, TOWER_SPAWN, VIEWERS, VIEWER_R, inOctagon, skyDeckWall, skyDeckY, upOnDeck } from '../src/scripts/city3d/skydeck';
import { HIGHRISES, OCT_CUT, TALLEST } from '../src/scripts/city3d/highrise';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';

/** walk.ts's radius */
const R = 0.22;
const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;

test('the deck: on the spire\'s top tier, just over its roof, an octagon as it is drawn', () => {
  assert.equal(SPIRE, HIGHRISES.find((t) => t.design === 'spire'));
  assert.equal(SPIRE.roof, TALLEST.roof);
  const top = SPIRE.parts.at(-1)!;
  assert.equal(top.y1, SPIRE.roof);
  assert.deepEqual(DECK.rect, top.rect);
  assert.ok(DECK.y > SPIRE.roof && DECK.y < SPIRE.roof + 0.15, 'its floor laid over the roof, under the parapet\'s cap');
  // The octagon highrise3d.ts draws: its corners on the outline, the rect's own corners off it
  const [x0, z0, x1, z1] = DECK.rect;
  const c = (x1 - x0) * OCT_CUT;
  for (const [x, z] of [
    [x0 + c, z0],
    [x0, z0 + c],
    [x1 - c, z1],
    [x1, z1 - c],
  ])
    assert.ok(inOctagon(x, z, -1e-6) && !inOctagon(x, z, 0.01), `${x}, ${z} on its edge`);
  assert.ok(!inOctagon(x0 + 0.05, z0 + 0.05));
  assert.ok(inOctagon(DECK.x, DECK.z, DECK.half - 0.01));
  assert.equal(TOWER_NAME, 'SECTOR 7 TOWER');
});

test('walking up there: the deck is ground only when you\'re up on it; its rail, the lift house and the viewers stop you', () => {
  // Under it, on the plaza, the deck is nothing (and the spire's own solids stand in the way)
  assert.equal(skyDeckY(DECK.x, DECK.z, 0), null);
  assert.equal(upOnDeck(DECK.x + 2, DECK.z, 0), false);
  // Up there: ground at its floor, inside the rail
  const p = LIFT.up;
  assert.equal(skyDeckY(p.x, p.z, DECK.y), DECK.y);
  assert.ok(upOnDeck(p.x, p.z, DECK.y));
  assert.equal(skyDeckWall(p.x, p.z, R), false, 'where the lift lets you out is clear');
  // The rail: past it is a wall, never a fall
  for (let k = 0; k < 64; k++) {
    const a = (2 * Math.PI * k) / 64;
    for (let d = 0; d < DECK.half + 1; d += 0.05) {
      const [x, z] = [DECK.x + Math.cos(a) * d, DECK.z + Math.sin(a) * d];
      if (!inOctagon(x, z, RAIL_IN + R)) {
        assert.ok(skyDeckWall(x, z, R), `past the rail at ${x}, ${z}`);
        assert.ok(inOctagon(x, z, -0.6) || !upOnDeck(x, z, DECK.y));
      }
    }
  }
  // The lift house and the viewers
  assert.ok(skyDeckWall(DECK.x, DECK.z, R));
  for (const [x, z] of VIEWERS) assert.ok(skyDeckWall(x, z, R));
});

test('the viewers: one on each straight side, inside the rail, each with room to stand behind it, all reached from the lift', () => {
  assert.equal(VIEWERS.length, 4);
  for (const [x, z, yaw] of VIEWERS) {
    assert.ok(inOctagon(x, z, RAIL_IN + VIEWER_R), 'inside the rail');
    // (looking out: along -sin, -cos away from the middle)
    const [lx, lz] = [-Math.sin(yaw), -Math.cos(yaw)];
    assert.ok(lx * (x - DECK.x) + lz * (z - DECK.z) > 0, 'it looks out');
  }
  // Every viewer's standing spot is reached on foot from where the lift lets you out (a flood over the deck)
  const step = 0.1;
  const key = (i: number, j: number) => `${i},${j}`;
  const ok = (i: number, j: number) => !skyDeckWall(DECK.x + i * step, DECK.z + j * step, R);
  const start: [number, number] = [Math.round((LIFT.up.x - DECK.x) / step), Math.round((LIFT.up.z - DECK.z) / step)];
  assert.ok(ok(...start));
  const seen = new Set([key(...start)]);
  const todo = [start];
  while (todo.length) {
    const [i, j] = todo.pop()!;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n: [number, number] = [i + di, j + dj];
      if (!seen.has(key(...n)) && ok(...n)) {
        seen.add(key(...n));
        todo.push(n);
      }
    }
  }
  for (const [x, z, yaw] of VIEWERS) {
    const [sx, sz] = [x + Math.sin(yaw) * (VIEWER_R + R + 0.12), z + Math.cos(yaw) * (VIEWER_R + R + 0.12)];
    assert.ok(seen.has(key(Math.round((sx - DECK.x) / step), Math.round((sz - DECK.z) / step))), `behind the viewer at ${x}, ${z}`);
  }
  // ...and all the way round the lift house
  assert.ok(seen.size * step * step > 12, `${(seen.size * step * step).toFixed(1)} square tiles to walk`);
});

test('the lift: a door in the pavilion and one at the lift house, each letting you out clear at the other end', () => {
  // The pavilion's: on the plaza at the spire's foot, clear of everything solid
  for (const p of [LIFT.lobby, LIFT.down]) {
    assert.ok(!SOLIDS.some((b) => inBox(b, p.x, p.z, R)), `${p.x}, ${p.z} clear`);
    assert.ok(p.x < SPIRE.parts[0].rect[0] && p.x > SPIRE.parts[0].rect[0] - 2.4, 'inside the pavilion, out from the spire\'s face');
  }
  assert.equal(LIFT.down.y, 0);
  // The deck's: at the lift house's door
  assert.ok(LIFT.deck.x < CORE_RECT[0] && LIFT.deck.x > CORE_RECT[0] - 1);
  assert.ok(!skyDeckWall(LIFT.deck.x, LIFT.deck.z, R));
  assert.equal(LIFT.up.y, DECK.y);
  // Each door's prompt (walk.ts: within 1) is where its lift lets you out; the two never in reach of each other
  assert.ok(Math.hypot(LIFT.up.x - LIFT.deck.x, LIFT.up.z - LIFT.deck.z) < 1);
  assert.ok(Math.hypot(LIFT.down.x - LIFT.lobby.x, LIFT.down.z - LIFT.lobby.z) < 1);
  assert.ok(Math.hypot(LIFT.lobby.x - LIFT.deck.x, LIFT.lobby.z - LIFT.deck.z) > 3);
  // Stepping out on the deck facing north along it (walk.ts's yaw 0), the deck's walk clear ahead for a few steps;
  // in the pavilion facing out west to the plaza (π/2)
  assert.equal(LIFT.up.yaw, 0);
  for (let d = 0; d < 1.2; d += 0.1) assert.ok(!skyDeckWall(LIFT.up.x, LIFT.up.z - d, R), `clear ${d.toFixed(1)} ahead`);
  assert.ok(Math.abs(LIFT.down.yaw - Math.PI / 2) < 1e-9);
});

test('the lift house, the crown and the mast: under the spire\'s tip; what\'s solid is in SOLIDS', () => {
  assert.ok(SPIRE.roof + CORE.h < TALLEST.tip - 1);
  assert.ok(DECK.y + RIBS.top < TALLEST.tip - 0.5, 'the crown\'s ring round the mast, under its tip');
  assert.ok(RIBS.top > DECK.rail + 2, 'the ribs well over a walker\'s head where they cross the deck');
  for (const b of SKYDECK_SOLIDS) assert.ok(SOLIDS.includes(b));
  assert.ok(inBox(SKYDECK_SOLIDS[0], DECK.x, DECK.z) && SKYDECK_SOLIDS[0][4] > SPIRE.roof + CORE.h);
});

test('the place: Walk in on the plaza facing the pavilion, a PLACES entry, a live setting', () => {
  assert.ok(!SOLIDS.some((b) => inBox(b, TOWER_SPAWN.x, TOWER_SPAWN.z, R)), 'Walk in clear');
  assert.ok(TOWER_SPAWN.x < LIFT.lobby.x - 3 && Math.abs(TOWER_SPAWN.z - LIFT.lobby.z) < 1e-9);
  assert.ok(Math.abs(TOWER_SPAWN.yaw + Math.PI / 2) < 1e-9, 'facing east, at the pavilion');
  const p = PLACES.find((q) => q.id === 'tower')!;
  assert.equal(p.kind, 'spot');
  assert.deepEqual(p.at, TOWER_SPAWN);
  assert.ok(LIVE_PLACES.some((q) => q.id === 'tower' && q.name === 'Sector 7 Tower'));
});
