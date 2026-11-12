// Degen's home (home.ts, docs/home-plan.md Phase 1): the west end house of the row by the Close, his garage in its
// garden and his driveway beside it, with room for a car and a bike; a place, and where walking starts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIKE_BAY, CAR_BAY, HOME, HOME_DOOR, HOME_HOUSE, HOME_LAND, HOME_PICK, HOME_PIN, HOME_ROW, HOME_SOLIDS, HOME_SPAWN, bayRect, onHome } from '../src/scripts/city3d/home';
import { HOUSES, TERRACES, TERRACE_SOLIDS, fencesOf, rectOf, toWorld, TALLEST } from '../src/scripts/city3d/endsterraces';
import { COURTS, CROSS_PATHS, GREENS, LANES, N_EDGE, PATHS, WEST_LAMPS } from '../src/scripts/city3d/endswest';
import { ROAD_HALF, ROAD_Z, SLAB_Y, inEndswood } from '../src/scripts/city3d/endswood';
import { STREET_W_SOLIDS } from '../src/scripts/city3d/endsweststreet';
import { WASHING } from '../src/scripts/city3d/endswestlife';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';
import { CARS } from '../src/scripts/city3d/carspec';
import { PLAYER_CARS } from '../src/scripts/city3d/mycar';

type Rect = readonly [number, number, number, number];
const overlap = (a: Rect, b: Rect, m = 0) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
const inside = (a: Rect, b: Rect, m = 1e-6) => a[0] >= b[0] - m && a[1] >= b[1] - m && a[2] <= b[2] + m && a[3] <= b[3] + m;
const T = TERRACES.find((t) => t.houses.some((h) => h.id === HOME_HOUSE))!;
const house = HOUSES.find((h) => h.id === HOME_HOUSE)!;

test('the house is the terrace\'s own west end house, where it stood', () => {
  assert.equal(T.row.id, HOME_ROW);
  const r = rectOf(T, house.u0, house.u1, -T.d, 0);
  for (let i = 0; i < 4; i++) assert.ok(Math.abs(r[i] - HOME.house[i]) < 1e-9, `${r} against ${HOME.house}`);
  // The row's west end: nothing of the row is west of it
  assert.equal(HOME.house[0], T.row.rect[0]);
  // Its door where the terrace has it, its height the terrace's
  const d = toWorld(T, house.door, 0);
  assert.ok(Math.abs(d[0] - HOME.door[0]) < 1e-9 && Math.abs(d[1] - HOME.door[1]) < 1e-9);
  assert.ok(Math.abs(SLAB_Y + HOME.eaves - T.top) < 1e-9 && Math.abs(SLAB_Y + HOME.ridge - T.peak) < 1e-9);
  assert.ok(HOME.ridge < TALLEST);
  assert.ok(inEndswood(HOME_SPAWN.x, HOME_SPAWN.z));
});

test('the garage stands in the back garden, off the house, its door on the driveway', () => {
  assert.ok(inside(HOME.garage, HOME.garden));
  // A yard between it and the house's back wall, the back door onto it
  assert.ok(HOME.garage[1] - HOME.house[3] >= 1);
  // Big enough for the longest car you can own, with room to open a door, and under the house's eaves
  const longest = Math.max(...PLAYER_CARS.map((id) => CARS[id].L));
  assert.ok(longest > 1.5 && HOME.garage[2] - HOME.garage[0] > longest + 0.6, `a ${longest} long car fits`);
  assert.ok(HOME.garage[3] - HOME.garage[1] >= 3.4, 'room to open its doors');
  // ... and the driveway's bay holds it too
  assert.ok(CAR_BAY.hl * 2 >= longest, `the driveway's bay takes a ${longest} long car`);
  assert.ok(HOME.garageTop < HOME.eaves);
  // The door: in the west wall, inside it, wide enough, onto the driveway
  const D = HOME.garageDoor;
  assert.equal(D.x, HOME.garage[0]);
  assert.equal(D.x, HOME.drive[2]);
  assert.ok(D.z0 > HOME.garage[1] + 0.2 && D.z1 < HOME.garage[3] - 0.2 && D.z1 - D.z0 >= 2.2 && D.h < HOME.garageH);
  // Solid at the boot, the one box
  assert.equal(HOME_SOLIDS.length, 1);
  assert.ok(SOLIDS.includes(HOME_SOLIDS[0]));
});

test('the driveway: off the Close and the lane, clear of everything, room for a car and a bike', () => {
  const dr = HOME.drive;
  assert.ok(dr[2] - dr[0] >= 3 && dr[3] - dr[1] >= 6);
  // It runs down to the block's edge by the Close, the dropped kerb on to the road's edge; the lane lies along its west side
  assert.equal(dr[3], N_EDGE);
  assert.deepEqual([HOME.kerb[1], HOME.kerb[3]], [N_EDGE, ROAD_Z - ROAD_HALF]);
  assert.ok(LANES.some((l) => l[2] === dr[0] && l[1] <= dr[1] && l[3] >= dr[3]), 'the lane beside it');
  // Nothing built or planted on it: no terrace, fence, bin, street furniture, path, green, court or lamp
  for (const b of [...TERRACE_SOLIDS, ...STREET_W_SOLIDS]) assert.ok(!overlap(dr, b as unknown as Rect, 0.01), `a solid on the driveway: ${b}`);
  for (const r of [...PATHS, ...GREENS, ...COURTS, ...CROSS_PATHS]) assert.ok(!overlap(dr, r, 0.01), `on the driveway: ${r}`);
  for (const [x, z] of WEST_LAMPS) assert.ok(!(x > dr[0] - 0.3 && x < dr[2] + 0.3 && z > dr[1] - 0.3 && z < HOME.kerb[3] + 0.3), `a lamp on the driveway at ${x}, ${z}`);
  // The bays: on the driveway, apart, clear of the garage's door's swing
  const [car, bike] = [bayRect(CAR_BAY), bayRect(BIKE_BAY)];
  assert.ok(inside(car, dr) && inside(bike, dr));
  assert.ok(!overlap(car, bike, -0.2), 'the car and the bike apart');
  const swing: Rect = [HOME.garageDoor.x - 1, HOME.garageDoor.z0, HOME.garageDoor.x, HOME.garageDoor.z1];
  assert.ok(!overlap(car, swing) && !overlap(bike, swing), 'clear of the garage door');
});

test('the terrace makes room: no shed, gate, washing or fence where the garage stands', () => {
  assert.ok(!house.shed);
  assert.ok(!WASHING.some((w) => w.house === HOME_HOUSE));
  const g = HOME.garage;
  for (const [a, c] of fencesOf(T)) {
    const line: Rect = [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1])];
    assert.ok(!(line[0] < g[2] - 0.05 && line[2] > g[0] + 0.05 && line[1] < g[3] - 0.05 && line[3] > g[1] + 0.05), `a fence through the garage: ${line}`);
  }
  // The neighbours keep theirs: the far fence still runs behind the other two gardens, the yard's stub by the driveway stands
  const far = fencesOf(T).filter(([a, c]) => Math.abs(a[1] - c[1]) < 1e-9);
  assert.equal(far.length, 1);
  assert.ok(Math.min(far[0][0][0], far[0][1][0]) >= g[2] - 1e-6);
  assert.ok(fencesOf(T).some(([a, c]) => Math.abs(a[0] - c[0]) < 1e-9 && Math.abs(a[0] - HOME.house[0]) < 0.1 && Math.max(a[1], c[1]) <= g[1] + 1e-6));
  // No other terrace's fences changed in number (theirs have one a party line, both ends and the far edge)
  for (const o of TERRACES) if (o !== T) assert.equal(fencesOf(o).length, o.houses.length + 2);
});

test('a place: its pin, door and where you arrive, clear and on its own ground', () => {
  assert.ok(PLACES.some((p) => p.id === 'home' && p.at.x === HOME_SPAWN.x && p.at.z === HOME_SPAWN.z));
  assert.ok(LIVE_PLACES.some((p) => p.id === 'home'));
  assert.equal(HOME_PICK.length, 2);
  assert.ok(onHome(HOME_PIN[0], HOME_PIN[1]) && onHome(HOME.garage[0] + 1, HOME.garage[1] + 1) && onHome(CAR_BAY.x, CAR_BAY.z));
  assert.ok(!onHome(HOME_LAND[2] + 1, HOME.house[1] + 1), 'not the neighbour');
  // The door's prompt and the spawn stand in front of the door (north), clear of every solid, the spawn on the front path
  const free = (x: number, z: number) => ![...SOLIDS, ...TERRACE_SOLIDS, ...STREET_W_SOLIDS].some((b) => x > b[0] - 0.2 && x < b[2] + 0.2 && z > b[1] - 0.2 && z < b[3] + 0.2);
  assert.ok(HOME_DOOR.z < HOME.door[1] && Math.abs(HOME_DOOR.x - HOME.door[0]) < 1e-9);
  assert.ok(free(HOME_SPAWN.x, HOME_SPAWN.z), 'the spawn is clear');
  assert.ok(PATHS.some((p) => HOME_SPAWN.x > p[0] && HOME_SPAWN.x < p[2] && HOME_SPAWN.z > p[1] - 0.6 && HOME_SPAWN.z < p[3] + 0.6), 'on the front path');
  // Facing the door: south
  assert.equal(HOME_SPAWN.yaw, Math.PI);
});
