// Degen's home (home.ts, docs/home-plan.md Phase 1): the west end house of the row by the Close, his garage in its
// garden and his driveway beside it, with room for a car and a bike; a place, and where walking starts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIKE_BAY, BIKE_HOME, CAR_BAY, CAR_HOME, HOME, HOME_GARAGE_DOOR, HOME_VIEW, WALL, startsAtHome, CEIL, FURNITURE, HALL_W, HOME_CAMERA, HOME_PORTALS, ROOM, SHELL, YARD_GATE, homeWall, inHouse, HOME_HOUSE, HOME_LAND, HOME_PICK, HOME_PIN, HOME_ROW, HOME_SOLIDS, HOME_SPAWN, bayRect, onHome } from '../src/scripts/city3d/home';
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
  // Solid at the boot: its four walls, the door's opening left clear (and the house's own four: the test below)
  assert.equal(HOME_SOLIDS.length, 9);
  for (const b of HOME_SOLIDS) assert.ok(SOLIDS.includes(b));
  const hit = (x: number, z: number) => HOME_SOLIDS.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3]);
  for (let z = D.z0 + 0.05; z < D.z1; z += 0.1) assert.ok(!hit(D.x + WALL / 2, z), `the doorway is clear at z ${z}`);
  assert.ok(hit(D.x + WALL / 2, D.z0 - 0.1) && hit(D.x + WALL / 2, D.z1 + 0.1) && hit(HOME.garage[2] - WALL / 2, CAR_HOME.z), 'walls either side and behind');
  for (let x = HOME.garage[0] + WALL + 0.05; x < HOME.garage[2] - WALL; x += 0.25) assert.ok(!hit(x, CAR_HOME.z), 'open inside');
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
  // The neighbours keep theirs: the far fence still runs behind the other two gardens; between his yard and his
  // driveway there's none (the gate stands open there)
  const far = fencesOf(T).filter(([a, c]) => Math.abs(a[1] - c[1]) < 1e-9);
  assert.equal(far.length, 1);
  assert.ok(Math.min(far[0][0][0], far[0][1][0]) >= g[2] - 1e-6);
  assert.ok(!fencesOf(T).some(([a, c]) => Math.abs(a[0] - c[0]) < 1e-9 && Math.abs(a[0] - HOME.house[0]) < 0.1));
  assert.ok(YARD_GATE[1] === HOME.house[3] && YARD_GATE[3] === g[1]);
  // No other terrace's fences changed in number (theirs have one a party line, both ends and the far edge)
  for (const o of TERRACES) if (o !== T) assert.equal(fencesOf(o).length, o.houses.length + 2);
});

test('a place: its pin, door and where you arrive, clear and on its own ground', () => {
  assert.ok(PLACES.some((p) => p.id === 'home' && p.at.x === HOME_SPAWN.x && p.at.z === HOME_SPAWN.z));
  assert.ok(LIVE_PLACES.some((p) => p.id === 'home'));
  assert.equal(HOME_PICK.length, 2);
  assert.ok(onHome(HOME_PIN[0], HOME_PIN[1]) && onHome(HOME.garage[0] + 1, HOME.garage[1] + 1) && onHome(CAR_BAY.x, CAR_BAY.z));
  assert.ok(!onHome(HOME_LAND[2] + 1, HOME.house[1] + 1), 'not the neighbour');
  // The spawn stands in front of the door (north), clear of every solid, on the front path
  const free = (x: number, z: number) => ![...SOLIDS, ...TERRACE_SOLIDS, ...STREET_W_SOLIDS].some((b) => x > b[0] - 0.2 && x < b[2] + 0.2 && z > b[1] - 0.2 && z < b[3] + 0.2);
  assert.ok(free(HOME_SPAWN.x, HOME_SPAWN.z), 'the spawn is clear');
  assert.ok(PATHS.some((p) => HOME_SPAWN.x > p[0] && HOME_SPAWN.x < p[2] && HOME_SPAWN.z > p[1] - 0.6 && HOME_SPAWN.z < p[3] + 0.6), 'on the front path');
  // Facing the door: south; within a place prompt's reach (1) of his front door's "Go in"
  assert.equal(HOME_SPAWN.yaw, Math.PI);
  const goIn = HOME_PORTALS.find((p) => p.id === 'home:in')!;
  assert.ok(Math.hypot(goIn.x - HOME_SPAWN.x, goIn.z - HOME_SPAWN.z) < 0.95);
});

test('home base: the car in the garage nose to its door, the bike on its bay, the garage\'s prompt on the driveway', () => {
  const g = HOME.garage;
  const D = HOME.garageDoor;
  // Every car you can own stands inside clear of the walls, nose west to the door, room to walk down both its sides
  assert.equal(CAR_HOME.yaw, Math.PI);
  assert.ok(Math.abs(Math.cos(CAR_HOME.yaw) + 1) < 1e-9, 'its nose points west: (cos yaw, -sin yaw)');
  for (const id of PLAYER_CARS) {
    const { L, W } = CARS[id];
    assert.ok(CAR_HOME.x - L / 2 > g[0] + WALL + 0.05 && CAR_HOME.x + L / 2 < g[2] - WALL - 0.05, `${id} fits the garage's length`);
    assert.ok(CAR_HOME.z - W / 2 - 0.5 > g[1] + WALL && CAR_HOME.z + W / 2 + 0.5 < g[3] - WALL, `room beside ${id}`);
    // ... and it goes out through the door: its width inside the opening, in line with it
    assert.ok(CAR_HOME.z - W / 2 > D.z0 + 0.15 && CAR_HOME.z + W / 2 < D.z1 - 0.15, `${id} through the door`);
  }
  // The bike on its bay on the driveway, nose to the Close (south)
  assert.ok(Math.abs(-Math.sin(BIKE_HOME.yaw) - 1) < 1e-9);
  assert.deepEqual([BIKE_HOME.x, BIKE_HOME.z], [BIKE_BAY.x, BIKE_BAY.z]);
  // The prompt: on the driveway, outside the garage, by the door, away from the car (its Get in is another prompt)
  const dr = HOME.drive;
  assert.ok(HOME_GARAGE_DOOR.x > dr[0] && HOME_GARAGE_DOOR.x < dr[2] && HOME_GARAGE_DOOR.z > dr[1] && HOME_GARAGE_DOOR.z < dr[3]);
  assert.ok(Math.hypot(HOME_GARAGE_DOOR.x - CAR_HOME.x, HOME_GARAGE_DOOR.z - CAR_HOME.z) - CAR_HOME.r > 1.75);
  // The menu's camera: out on the driveway side, looking in at the car
  assert.ok(HOME_VIEW.eye[0] < g[0] && HOME_VIEW.at[0] > g[0] && HOME_VIEW.at[0] < g[2]);
});

test('walking starts at home, but a new player\'s first walk', () => {
  assert.ok(!startsAtHome([]));
  assert.ok(startsAtHome(['emporium']));
});

test('inside: the house is his own shell, sealed; the room inside is walked in, its doors fades', () => {
  const [hx0, hz0, hx1, hz1] = HOME.house;
  // The terraces' solid leaves his house out (the neighbours' part of the terrace is still one box to its peak)
  const mid: [number, number] = [(hx0 + hx1) / 2, (hz0 + hz1) / 2];
  assert.ok(!TERRACE_SOLIDS.some((b) => mid[0] > b[0] && mid[0] < b[2] && mid[1] > b[1] && mid[1] < b[3]), "the terrace's box covers his room");
  assert.ok(TERRACE_SOLIDS.some((b) => Math.abs(b[0] - hx1) < 1e-9 && b[1] === hz0 && b[3] === hz1 && b[4] === T.peak), "the neighbours' part");
  // His own walls: sealed all round (no way in on foot), the room inside them open
  const hit = (x: number, z: number) => HOME_SOLIDS.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3]);
  for (let x = hx0 + 0.02; x < hx1; x += 0.1) assert.ok(hit(x, hz0 + SHELL / 2) && hit(x, hz1 - SHELL / 2), `a gap in the front or back wall at x ${x}`);
  for (let z = hz0 + 0.02; z < hz1; z += 0.1) assert.ok(hit(hx0 + SHELL / 2, z) && hit(hx1 - SHELL / 2, z), `a gap in a side wall at z ${z}`);
  assert.ok(!hit(mid[0], mid[1]));
  for (const b of HOME_SOLIDS) assert.ok(SOLIDS.includes(b));
  // The room: inside the shell, a ceiling a grown-up clears, the camera kept under it
  assert.deepEqual(ROOM, [hx0 + SHELL, hz0 + SHELL, hx1 - SHELL, hz1 - SHELL]);
  assert.ok(CEIL >= 1.15 && CEIL <= 1.25);
  assert.deepEqual(HOME_CAMERA.slice(0, 4), [...HOME.house]);
  assert.ok(Math.abs(HOME_CAMERA[5] - (SLAB_Y + CEIL)) < 1e-9 && HOME_CAMERA[4] > HOME_CAMERA[5]);
  assert.ok(inHouse(mid[0], mid[1]) && !inHouse(hx0 - 0.1, mid[1]) && !inHouse(mid[0], hz1 + 0.1));
});

test('the furniture: in the room, apart, the hall clear from door to door, everything reachable', () => {
  const R = 0.17;
  for (const f of FURNITURE) {
    assert.ok(inside(f.rect, ROOM), `${f.kind} in the room`);
    assert.ok(f.h > 0.1 && f.h <= CEIL, `${f.kind}'s height`);
    // Nothing in the hall down the west wall
    assert.ok(f.rect[0] >= ROOM[0] + HALL_W - 1e-9, `${f.kind} stands in the hall`);
  }
  for (const [i, a] of FURNITURE.entries()) for (const b of FURNITURE.slice(i + 1)) assert.ok(!overlap(a.rect, b.rect, 1e-6), `${a.kind} and ${b.kind} overlap`);
  for (const k of ['stairs', 'sofa', 'tv', 'counter', 'fridge', 'wardrobe', 'stash'] as const) assert.ok(FURNITURE.some((f) => f.kind === k), k);
  // The walls and the furniture stop you; the middle of the hall doesn't
  assert.ok(homeWall(ROOM[0] + 0.05, ROOM[1] + 1, R) && homeWall(ROOM[2] - 0.3, ROOM[1] + 1, R));
  assert.ok(!homeWall(ROOM[0] + HALL_W / 2, (ROOM[1] + ROOM[3]) / 2, R));
  // From inside the front door you can walk to inside the back door, and up to everything but the stairs (a flood
  // over a fine grid of where he can stand)
  const step = 0.1;
  const key = (i: number, j: number) => `${i},${j}`;
  const at = (i: number, j: number): [number, number] => [ROOM[0] + i * step, ROOM[1] + j * step];
  const start = HOME_PORTALS.find((p) => p.id === 'home:in')!.to;
  const seen = new Set<string>();
  const queue: [number, number][] = [[Math.round((start.x - ROOM[0]) / step), Math.round((start.z - ROOM[1]) / step)]];
  assert.ok(!homeWall(...at(...queue[0]), R), 'you arrive somewhere you can stand');
  seen.add(key(...queue[0]));
  while (queue.length) {
    const [i, j] = queue.pop()!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n: [number, number] = [i + di, j + dj];
      if (seen.has(key(...n)) || homeWall(...at(...n), R)) continue;
      seen.add(key(...n));
      queue.push(n);
    }
  }
  const reach = (x: number, z: number, r: number) =>
    [...seen].some((k) => {
      const [i, j] = k.split(',').map(Number);
      const [px, pz] = at(i, j);
      return Math.hypot(px - x, pz - z) < r;
    });
  for (const p of HOME_PORTALS.filter((q) => inHouse(q.x, q.z))) assert.ok(reach(p.x, p.z, 0.4), `${p.id}'s prompt can be walked to`);
  for (const f of FURNITURE.filter((g) => g.kind !== 'stairs')) {
    const [cx, cz] = [(f.rect[0] + f.rect[2]) / 2, (f.rect[1] + f.rect[3]) / 2];
    assert.ok(reach(cx, cz, Math.hypot(f.rect[2] - f.rect[0], f.rect[3] - f.rect[1]) / 2 + 0.45), `${f.kind} can be walked up to`);
  }
});

test('the doors: a prompt outside and in for the front and the back, each fade landing somewhere you can stand', () => {
  assert.deepEqual(HOME_PORTALS.map((p) => p.id), ['home:in', 'home:out', 'home:yard', 'home:back']);
  const by = (id: string) => HOME_PORTALS.find((p) => p.id === id)!;
  const solid = (x: number, z: number, r = 0.17) => [...SOLIDS, ...TERRACE_SOLIDS].some((b) => x + r > b[0] && x - r < b[2] && z + r > b[1] && z - r < b[3]);
  // Going in lands in the room clear of everything; the outside prompts stand clear
  for (const id of ['home:in', 'home:back']) {
    const p = by(id);
    assert.ok(!inHouse(p.x, p.z) && inHouse(p.to.x, p.to.z) && !homeWall(p.to.x, p.to.z, 0.17), id);
    assert.ok(!solid(p.x, p.z), `${id}'s prompt stands clear`);
  }
  // Going out lands outside clear of every solid: the front on the path's side, the back in the yard
  for (const id of ['home:out', 'home:yard']) {
    const p = by(id);
    assert.ok(inHouse(p.x, p.z) && !homeWall(p.x, p.z, 0.17) && !inHouse(p.to.x, p.to.z), id);
    assert.ok(!solid(p.to.x, p.to.z), `${id} lands clear`);
  }
  assert.ok(by('home:out').to.z < HOME.house[1] && by('home:yard').to.z > HOME.house[3] && by('home:yard').to.z < HOME.garage[1]);
  // The two prompts of a door are apart, so each side shows its own
  assert.ok(Math.hypot(by('home:in').x - by('home:out').x, by('home:in').z - by('home:out').z) > 1);
  assert.ok(Math.hypot(by('home:back').x - by('home:yard').x, by('home:back').z - by('home:yard').z) >= 0.75);
  // The yard opens onto the driveway through the gate's gap: nothing solid across it
  const [gx0, gz0, gx1, gz1] = YARD_GATE;
  for (let z = gz0 + 0.2; z < gz1 - 0.15; z += 0.1) assert.ok(!solid((gx0 + gx1) / 2, z, 0.05), `the gate's gap is blocked at z ${z}`);
});
