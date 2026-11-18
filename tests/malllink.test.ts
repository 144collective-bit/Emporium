// Starlight Mall's Skywalk (malllink.ts, docs/mall-plan.md "One mall" Phase 1): the bridge over the east ring avenue
// with the el through its top floor, the corridor through Bright & Co., the pavilion on Palm Court with its
// escalators. Walking in from the promenade, up to the bridge, through to the mall's gallery and up to the platform
// floor; never off an edge, onto the track or under an escalator; traffic still drives under it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD,
  CLEAR,
  COLUMNS,
  CORRIDOR,
  ESC_G,
  ESC_UP,
  FLIGHTS,
  KIOSK,
  L1,
  L2,
  LINK,
  LINK_PEOPLE,
  LINK_SOLIDS,
  LINK_TALLEST,
  LINK_WALLS,
  MEZZ_L1,
  MEZZ_L2,
  PAV_DOORS,
  PAV_IN,
  ROOF,
  SCREEN_X,
  TRACK,
  flightX,
  flightY,
  flightZ,
  linkFloorAt,
  linkFloors,
  linkUp,
  linkWall,
} from '../src/scripts/city3d/malllink';
import { ANCHORS, LINK_Z, PAVILION, PROM, SHOPS, SHOP_NAMES, TALLEST } from '../src/scripts/city3d/mall';
import { CORRIDOR_IN, CORRIDOR_Z, IN, UNITS, VOID, mallFloor, mallWall } from '../src/scripts/city3d/mallinside';
import { HIGH_Y, LINE_X, NORTH_END, PILLARS, trackY } from '../src/scripts/city3d/metro';
import { NS_ROADS } from '../src/scripts/city3d/layout';
import { SOLIDS } from '../src/scripts/city3d/solids';

type Rect = readonly number[];
const inBox = (b: Rect, x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const SLAB = 0.15;
const R = 0.17;
const NS3 = NS_ROADS[NS_ROADS.length - 1];

test('the bridge spans the avenue clear of its traffic, the el level through its top floor, under the Emporium', () => {
  assert.ok(LINK[0] <= NS3.c - NS3.half - 0.8 && LINK[2] >= NS3.c + NS3.half + 0.8, 'from sidewalk to sidewalk');
  assert.ok(CLEAR > 2.8, `the avenue keeps ${CLEAR.toFixed(2)} under it`);
  assert.equal(L2, HIGH_Y);
  for (let z = LINK_Z[0] - 1; z <= LINK_Z[1] + 1; z += 0.5) assert.equal(trackY('main', z - NORTH_END), HIGH_Y, `the el level at ${z}`);
  assert.ok(TRACK[0] < LINE_X && TRACK[1] > LINE_X && SCREEN_X > TRACK[1]);
  assert.ok(ROOF > L2 + 2.6, 'room for a train under the roof');
  assert.ok(LINK_TALLEST <= TALLEST && TALLEST < 12.5, 'under the pylon and the Emporium');
  // The el's pillar on the median inside it is a column in the lower floor
  const inside = PILLARS.filter((p) => p.track === 'main' && inBox(LINK, p.at[0], p.at[1]));
  assert.deepEqual(COLUMNS, inside.map((p) => p.at));
});

test('the pavilion takes the west row\'s two northern shops; the corridor takes the east upper unit; nothing else moves', () => {
  assert.ok(!SHOPS.some((s) => s.rect[0] < PAVILION[2] && s.rect[2] > PAVILION[0] && s.rect[1] < PAVILION[3] && s.rect[3] > PAVILION[1]));
  assert.equal(SHOPS.length, 20);
  assert.equal(PAVILION[2], PROM[0]);
  assert.equal(UNITS.length, 15);
  assert.ok(!UNITS.some((u) => u.level === 1 && inBox(u.rect, (CORRIDOR_IN[0] + CORRIDOR_IN[2]) / 2, (CORRIDOR_Z[0] + CORRIDOR_Z[1]) / 2)));
  assert.ok(UNITS.some((u) => u.level === 0 && inBox(u.rect, (CORRIDOR_IN[0] + CORRIDOR_IN[2]) / 2, (CORRIDOR_Z[0] + CORRIDOR_Z[1]) / 2)), 'the ground floor\'s unit stays');
  assert.equal(CORRIDOR[2], ANCHORS[1].rect[2]);
  // The café from the shops it took moves to the bridge's kiosk (its sign keeps its cell in the atlas)
  const gone = SHOP_NAMES.map((s) => s.name).filter((n) => !SHOPS.some((s) => s.name === n));
  assert.equal(gone.length, 2);
  assert.ok(gone.includes(KIOSK.name));
  for (const n of [KIOSK.name, BOARD.text]) assert.ok(!/\d/.test(n), `${n}: no numbers`);
  assert.ok(CORRIDOR[0] < IN[2] && CORRIDOR[0] > CORRIDOR_IN[0]);
});

test('the floors: the street escalators alone, the lower floor and the platform floor where they are; the avenue is the street', () => {
  const xm = (LINK[0] + LINK[2]) / 2;
  assert.deepEqual(linkFloors(xm - 3, -128), [L1]);
  assert.deepEqual(linkFloors(SCREEN_X + 1, -128), [L1, L2]);
  assert.deepEqual(linkFloors((TRACK[0] + TRACK[1]) / 2, -128), [L1], 'no floor up there over the track');
  // On the avenue under the bridge: nothing in reach, the street stays the street
  assert.equal(linkFloorAt(xm - 3, -128, 0.02), null);
  assert.equal(linkFloorAt(xm - 3, -128, L1), L1);
  assert.equal(linkFloorAt(SCREEN_X + 1, -128, L1 + 0.1), L1);
  assert.equal(linkFloorAt(SCREEN_X + 1, -128, L2 + 0.1), L2);
  for (const f of FLIGHTS) {
    const s = f.stairs[0];
    const x = (s.x0 + s.x1) / 2;
    const [z0, z1] = flightZ(f);
    assert.equal(flightY(f, f.foot), f.y0);
    assert.equal(flightY(f, f.land - f.rise * 0.3), f.y1);
    assert.ok(Math.abs(f.land - f.foot) > f.run, 'a landing at its head');
    const mid = (z0 + z1) / 2;
    assert.ok(linkFloors(x, mid).includes(flightY(f, mid)));
    assert.ok(flightX(f)[0] > PAV_IN[0] && flightX(f)[1] < PAV_IN[2], 'inside the pavilion');
  }
  // The street escalators land on the lower floor's mezzanine, those up on the platform floor's
  assert.equal(ESC_G.land, MEZZ_L1[3]);
  assert.equal(ESC_UP.land, MEZZ_L2[1]);
  assert.ok(ESC_UP.foot - 0.8 > MEZZ_L1[1] + 1.5, 'room on the mezzanine at its foot');
  assert.ok(ESC_G.foot + 0.8 < PAV_IN[3] - 1.2, 'room at its foot on the street');
});

test('the doors: open at street level, nothing in the way; the pavilion\'s walls otherwise', () => {
  for (const d of PAV_DOORS) {
    assert.ok(d.z1 - d.z0 > 1.8, 'a wide door');
    for (let z = d.z0 + 0.3; z < d.z1 - 0.3; z += 0.1) {
      const x = d.x + d.face * 0.4;
      assert.ok(!SOLIDS.some((b) => inBox(b, x, z, R)), `the door at ${x}, ${z.toFixed(1)}`);
      assert.ok(!SOLIDS.some((b) => inBox(b, d.x - d.face * 0.4, z, R)), `inside the door at ${z.toFixed(1)}`);
    }
  }
  assert.ok(LINK_WALLS.length >= 5);
});

test('its people on their floors, clear of what stands there', () => {
  for (const p of LINK_PEOPLE) {
    if (p.act === 'sit') continue;
    const y = SLAB + p.y;
    assert.ok(linkFloors(p.x, p.z).some((f) => Math.abs(f - y) < 1e-6), `someone at ${p.x}, ${p.z} off their floor`);
    assert.ok(!linkWall(p.x, p.z, y, 0.15), `someone at ${p.x}, ${p.z} in something`);
  }
  for (const s of LINK_SOLIDS) assert.ok(s[5] > s[4]);
});

test('walking in from the promenade, up to the bridge, through to the mall\'s gallery and up to the platform floor', () => {
  const step = 0.25;
  const [x0, z0, x1, z1] = [VOID[2] - 1, LINK[1] - 3, PROM[0] + 3, LINK[3] + 3];
  const nx = Math.ceil((x1 - x0) / step) + 1;
  const nz = Math.ceil((z1 - z0) / step) + 1;
  const near = SOLIDS.filter((b) => b[2] > x0 - 1 && b[0] < x1 + 1 && b[3] > z0 - 1 && b[1] < z1 + 1);
  // (as walk.ts: up in the Skywalk only its own walls; else what's solid, the hall's and the pavilion's)
  const blocked = (x: number, z: number, y: number) => {
    if (linkUp(x, z, y)) return linkWall(x, z, y, R);
    return near.some((b) => inBox(b, x, z, R)) || mallWall(x, z, y, R) || linkWall(x, z, y, R);
  };
  const road = (x: number) => x > NS3.c - NS3.half && x < NS3.c + NS3.half;
  // (as groundheight.ts: the Skywalk's floors, then the hall's, else the slab or the street)
  const ground = (x: number, z: number, y: number) => linkFloorAt(x, z, y) ?? mallFloor(x, z, y + 0.3) ?? (road(x) ? 0.02 : SLAB);
  const seen = new Set<string>();
  const key = (i: number, k: number, y: number) => `${i},${k},${Math.round(y * 4)}`;
  const at = (i: number, k: number) => [x0 + i * step, z0 + k * step];
  const ix = (x: number) => Math.round((x - x0) / step);
  const kz = (z: number) => Math.round((z - z0) / step);
  // From the promenade in front of the pavilion's door
  const door = PAV_DOORS.find((d) => d.face === 1)!;
  const start: [number, number, number] = [ix(PROM[0] + 1.5), kz((door.z0 + door.z1) / 2), SLAB];
  const queue = [start];
  seen.add(key(...start));
  const on = new Map<string, number[]>();
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
      const cell = `${a},${c}`;
      on.set(cell, [...(on.get(cell) ?? []), g]);
      queue.push([a, c, g]);
    }
  }
  const reached = (x: number, z: number, y: number) => (on.get(`${ix(x)},${kz(z)}`) ?? []).some((g) => Math.abs(g - y) < 0.05);
  assert.ok(reached((PAV_IN[0] + PAV_IN[2]) / 2, MEZZ_L1[1] + 2, SLAB), 'in at the door');
  assert.ok(reached((MEZZ_L1[0] + MEZZ_L1[2]) / 2, MEZZ_L1[1] + 2, L1), 'up the escalator to the lower floor');
  assert.ok(reached(LINK[0] + 3, -128, L1), 'across the bridge');
  assert.ok(reached((CORRIDOR[0] + CORRIDOR[2]) / 2, (CORRIDOR[1] + CORRIDOR[3]) / 2, L1), 'through Bright & Co.');
  assert.ok(reached(VOID[2] + 1.5, (CORRIDOR[1] + CORRIDOR[3]) / 2, L1), "to the mall's east gallery");
  assert.ok(reached(SCREEN_X + 1, (LINK[1] + LINK[3]) / 2, L2), 'up to the platform floor');
  assert.ok(reached((MEZZ_L2[0] + MEZZ_L2[2]) / 2, MEZZ_L2[3] - 1, L2), "the platform floor's mezzanine");
  assert.ok(reached(LINE_X - 2, -120, 0.02), 'out the west door to the avenue, and under the bridge');
  for (const [cell, ys] of on) {
    const [a, c] = cell.split(',').map(Number);
    const [x, z] = at(a, c);
    for (const y of ys) {
      // Never on the platform floor over the track (the lower floor runs under it), nor up in the pavilion's atrium but on an escalator
      if (y > L2 - 0.5) assert.ok(!(x > TRACK[0] && x < TRACK[1] && z > LINK[1] && z < LINK[3]), `up over the track at ${x}, ${z}`);
      const atrium = inBox([PAV_IN[0], MEZZ_L1[3], PAV_IN[2], MEZZ_L2[1]], x, z, -0.01);
      const onFlight = FLIGHTS.some((f) => f.stairs.some((s) => x > s.x0 && x < s.x1));
      if (atrium && y > SLAB + 0.5) assert.ok(onFlight, `up in the atrium at ${x}, ${z}, ${y}`);
      // Nowhere under the street escalators' ramp (the platform floor's mezzanine is over its foot)
      const [ez0, ez1] = flightZ(ESC_G);
      if (ESC_G.stairs.some((s) => x > s.x0 && x < s.x1) && z > ez0 && z < ez1) assert.ok(Math.abs(y - flightY(ESC_G, z)) < 0.35 || y === L2, `under the escalator at ${x}, ${z}`);
    }
  }
});
