// Degen's home, his compound (home.ts, docs/ends-far-west-plan.md Phase 2, the owner's picks: a walled yard with
// gates on its own plot in the Ends' far west, a double garage, a house with a roof terrace, a workshop, lawns): its
// wall round the plot with the gates open on the Close's line; the buildings inside the wall, apart, under the
// estate's rows and the Emporium; what's solid, and the ways through it; the car and the bike in the garage behind a
// door each; the place, where walking starts; the room inside, its doors' fades and the things to use; the old house
// a neighbour's again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BIKE_HOME, CAR_HOME, CEIL, FURNITURE, HALL_W, HOME, HOME_CAMERA, HOME_GARAGE_DOOR, HOME_LAND, HOME_PICK, HOME_PIN, HOME_PORTALS, HOME_SOLIDS, HOME_SPAWN, HOME_USES, HOME_VIEW,
  HOME_WORKSHOP_DOOR, HATCH, PIER, ROOF_THINGS, ROOF_Y, ROOM, SHELL, TERRACE, WALL, WALL_H, WALL_T, homePlaces, homeRoofY, homeWall, inHouse, onHome, onRoof, roofWall, startsAtHome,
} from '../src/scripts/city3d/home';
import { GATES, HEAD, LANE_HALF, LANE_X, PLOT } from '../src/scripts/city3d/endsfar';
import { HOUSES, TERRACES, TERRACE_SOLIDS, TALLEST } from '../src/scripts/city3d/endsterraces';
import { ROAD_HALF, ROAD_Z, SLAB_Y, inEndswood } from '../src/scripts/city3d/endswood';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';
import { CARS } from '../src/scripts/city3d/carspec';
import { PLAYER_CARS } from '../src/scripts/city3d/mycar';
import { BENCH_VIEWS } from '../src/scripts/city3d/bench';

type Rect = [number, number, number, number];
const inRect = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const within = (inner: readonly number[], outer: readonly number[], m = 0) => inner[0] >= outer[0] - m && inner[1] >= outer[1] - m && inner[2] <= outer[2] + m && inner[3] <= outer[3] + m;
const overlap = (a: readonly number[], b: readonly number[], m = 1e-6) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
const solidAt = (x: number, z: number, m = 0) => HOME_SOLIDS.some((b) => inRect(b, x, z, m));
/** Someone this wide can stand at x, z out in the yard */
const R = 0.14;
const stands = (x: number, z: number) => !HOME_SOLIDS.some((b) => inRect(b, x, z, R));

test('the compound is on its plot at the head of the Close: the wall round it, the gates open on the road\'s line', () => {
  assert.deepEqual(HOME.plot, PLOT);
  assert.deepEqual(HOME_LAND, PLOT);
  assert.deepEqual(HOME.gates, GATES);
  const [x0, z0, x1, z1] = PLOT;
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) assert.ok(inEndswood(x, z, 0.01), 'on the estate\'s land');
  // The wall: solid all the way round at head height, but for the gates and the back gate
  const B = HOME.backGate;
  for (let x = x0 + 0.1; x < x1; x += 0.25) for (const z of [z0 + WALL_T / 2, z1 - WALL_T / 2]) assert.ok(solidAt(x, z), `a gap in the wall at ${x}, ${z}`);
  for (let z = z0 + 0.1; z < z1; z += 0.25) {
    assert.equal(solidAt(x0 + WALL_T / 2, z), !(z > B.z0 && z < B.z1), `the west wall at ${z}`);
    assert.equal(solidAt(x1 - WALL_T / 2, z), !(z > GATES.z0 && z < GATES.z1), `the east wall at ${z}`);
  }
  assert.ok(WALL_H > 1.1 && WALL_H < 1.5, 'about head high');
  // The gates: on the Close's line, as wide as the road and a little more, a pier each side, taller than the wall
  assert.equal((GATES.z0 + GATES.z1) / 2, ROAD_Z);
  assert.ok(GATES.z1 - GATES.z0 >= ROAD_HALF * 2);
  assert.ok(PIER.h > WALL_H);
  for (const z of [GATES.z0 - PIER.w / 2, GATES.z1 + PIER.w / 2]) assert.ok(HOME_SOLIDS.some((b) => inRect(b, x1 - PIER.w / 2, z) && b[4] === SLAB_Y + PIER.h), 'a pier');
  // A car coming down the Close meets nothing from the lane to well inside the yard
  for (let x = LANE_X - LANE_HALF; x > x1 - 8; x -= 0.25) for (const z of [ROAD_Z - 1.2, ROAD_Z, ROAD_Z + 1.2]) assert.ok(![...SOLIDS].some((b) => inRect(b, x, z)), `something in the way at ${x}, ${z}`);
  assert.deepEqual(HEAD, [LANE_X, ROAD_Z]);
  // The back gate: a walker's width, in the west wall by the north-west lawn
  assert.ok(B.z1 - B.z0 >= 0.8 && B.z1 - B.z0 <= 1.2 && inRect(HOME.lawns[0], x0 + WALL_T + 0.5, (B.z0 + B.z1) / 2));
});

test('inside the wall: the garage on the Close\'s line, the house, the workshop and the lawns, apart, under the rows and the Emporium', () => {
  const things: [string, Rect][] = [['the house', HOME.house], ['the garage', HOME.garage], ['the workshop', HOME.workshop], ...HOME.lawns.map((r, i): [string, Rect] => [`lawn ${i}`, r])];
  for (const [id, r] of things) {
    assert.ok(r[2] > r[0] && r[3] > r[1], `${id} empty`);
    assert.ok(within(r, HOME.inner, 1e-9), `${id} through the wall`);
  }
  for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) assert.ok(!overlap(things[i][1], things[j][1]), `${things[i][0]} on ${things[j][0]}`);
  // The owner's sizes: the house about 9 by 7, the garage 8 by 5 with two doors, the workshop 5 by 4
  const size = (r: Rect) => [r[2] - r[0], r[3] - r[1]].map((n) => Math.round(n * 10) / 10);
  assert.deepEqual(size(HOME.house), [9, 6.5]);
  assert.deepEqual(size(HOME.garage), [5, 8]);
  assert.deepEqual(size(HOME.workshop), [5, 4]);
  // The garage faces the gates down the Close's line; nothing stands between them
  assert.equal((HOME.garage[1] + HOME.garage[3]) / 2, ROAD_Z);
  for (let x = HOME.garage[2] + 0.3; x < PLOT[2]; x += 0.3) assert.ok(stands(x, ROAD_Z), `something on the drive at ${x}`);
  // Everything under the estate's tallest row, and so far under the Emporium
  const tallest = Math.max(...TERRACES.map((t) => t.peak));
  for (const p of HOME_PICK) assert.ok(SLAB_Y + p.h < tallest, 'under the rows');
  assert.ok(HOME.ridge > HOME.eaves && HOME.eaves >= 2.2, 'two storeys under a parapet');
  assert.ok(TALLEST > 0);
  // The yard is the wide drive: room to turn a car between the garage and the gates
  assert.ok(PLOT[2] - HOME.garage[2] > 12 && HOME.house[1] - HOME.workshop[3] > 10);
});

test("what's solid: the buildings' walls, the garage's two doors open, the workshop shut; nothing of it on a road or on the old estate's", () => {
  for (const b of HOME_SOLIDS) {
    assert.ok(b[2] > b[0] && b[3] > b[1] && b[4] > SLAB_Y, `an empty solid ${b}`);
    assert.ok(within(b, PLOT, 1e-9), `a solid off the plot: ${b}`);
    assert.ok(SOLIDS.includes(b), 'joined at the boot');
  }
  // The house is sealed all round (its doors are fades)
  const [hx0, hz0, hx1, hz1] = HOME.house;
  for (let x = hx0 + 0.05; x < hx1; x += 0.2) for (const z of [hz0 + SHELL / 2, hz1 - SHELL / 2]) assert.ok(solidAt(x, z), `a gap in the house at ${x}, ${z}`);
  for (let z = hz0 + 0.05; z < hz1; z += 0.2) for (const x of [hx0 + SHELL / 2, hx1 - SHELL / 2]) assert.ok(solidAt(x, z), `a gap in the house at ${x}, ${z}`);
  // The garage: three walls whole, the east one open at its two doors only
  const [gx0, gz0, gx1, gz1] = HOME.garage;
  const { carDoor: C, bikeDoor: K } = HOME;
  for (let z = gz0 + 0.05; z < gz1; z += 0.1) {
    assert.ok(solidAt(gx0 + WALL / 2, z), 'the back wall');
    const open = (z > C.z0 && z < C.z1) || (z > K.z0 && z < K.z1);
    assert.equal(solidAt(gx1 - WALL / 2, z), !open, `the garage's front at ${z}`);
  }
  assert.ok(C.z1 < K.z0, 'a pier between the doors');
  assert.ok(C.z1 - C.z0 >= 3 && K.z1 - K.z0 >= 3, 'a car\'s width each');
  // The workshop is shut all round
  const [wx0, wz0, wx1, wz1] = HOME.workshop;
  for (let x = wx0 + 0.05; x < wx1; x += 0.2) for (const z of [wz0 + WALL / 2, wz1 - WALL / 2]) assert.ok(solidAt(x, z), `a gap in the workshop at ${x}`);
  // The old end house is a neighbour's again: its terrace's solid is whole, and nothing of the home's is there
  const row = TERRACES.find((t) => t.houses.some((h) => h.id === 'rn2-0-2'))!;
  assert.ok(TERRACE_SOLIDS.some((b) => b[0] <= row.rect[0] + 1e-6 && b[2] >= row.rect[2] - 1e-6));
  for (const b of HOME_SOLIDS) for (const t of TERRACES) assert.ok(!overlap(b, t.rect), 'a home solid on a terrace');
  assert.ok(HOUSES.some((h) => h.id === 'rn2-0-2'));
});

test('the car and the bike live in the garage, a door each, noses out; the garage\'s and the workshop\'s prompts in the yard', () => {
  const [gx0, gz0, gx1, gz1] = HOME.garage;
  const { carDoor: C, bikeDoor: K } = HOME;
  // Each behind its own door, inside the walls, nose east (the way out)
  assert.ok(CAR_HOME.z > C.z0 + 0.8 && CAR_HOME.z < C.z1 - 0.8);
  assert.ok(BIKE_HOME.z > K.z0 + 0.5 && BIKE_HOME.z < K.z1 - 0.5);
  assert.equal(CAR_HOME.yaw, 0);
  assert.equal(BIKE_HOME.yaw, 0);
  // The longest car fits its bay front to back, and any car its door's width; the two stand apart
  const longest = Math.max(...PLAYER_CARS.map((id) => CARS[id].L));
  const widest = Math.max(...PLAYER_CARS.map((id) => CARS[id].W));
  assert.ok(CAR_HOME.x - longest / 2 > gx0 + WALL && CAR_HOME.x + longest / 2 < gx1, `a ${longest} long car in a ${gx1 - gx0} deep garage`);
  assert.ok(widest < C.z1 - C.z0 - 0.4);
  assert.ok(Math.abs(CAR_HOME.z - BIKE_HOME.z) > widest / 2 + 0.6);
  assert.ok(inRect([gx0 + WALL, gz0 + WALL, gx1, gz1 - WALL], BIKE_HOME.x, BIKE_HOME.z, -0.3));
  // The way out of each door is clear to the gates
  for (const z of [CAR_HOME.z, BIKE_HOME.z]) for (let x = CAR_HOME.x; x < gx1 + 3; x += 0.2) assert.ok(!solidAt(x, z, 0.3), `something in a bay's way at ${x}, ${z}`);
  // The prompts stand in the yard where you can, by their doors, apart
  for (const p of [HOME_GARAGE_DOOR, HOME_WORKSHOP_DOOR, HOME_SPAWN]) assert.ok(stands(p.x, p.z) && inRect(HOME.inner, p.x, p.z), `a prompt in something at ${p.x}, ${p.z}`);
  assert.ok(HOME_GARAGE_DOOR.x > gx1 && HOME_GARAGE_DOOR.x - gx1 < 1 && HOME_GARAGE_DOOR.z > C.z1 && HOME_GARAGE_DOOR.z < K.z0, 'by the pier between the doors');
  const D = HOME.workshopDoor;
  assert.ok(HOME_WORKSHOP_DOOR.z > D.z && HOME_WORKSHOP_DOOR.z - D.z < 1 && HOME_WORKSHOP_DOOR.x > D.x0 && HOME_WORKSHOP_DOOR.x < D.x1);
  assert.ok(Math.hypot(HOME_GARAGE_DOOR.x - HOME_WORKSHOP_DOOR.x, HOME_GARAGE_DOOR.z - HOME_WORKSHOP_DOOR.z) > 2.5);
  // The menu's camera looks from the yard into the garage, clear of everything
  assert.ok(stands(HOME_VIEW.eye[0], HOME_VIEW.eye[2]) && inRect(HOME.inner, HOME_VIEW.eye[0], HOME_VIEW.eye[2]));
  assert.ok(inRect(HOME.garage, HOME_VIEW.at[0], HOME_VIEW.at[2]));
});

test('the place: a spot with a panel, its pin over the house, walking starts in the yard facing the front door', () => {
  const place = PLACES.find((p) => p.spot === 'home')!;
  assert.ok(place && place.kind === 'spot');
  assert.deepEqual(place.at, HOME_SPAWN);
  assert.ok(LIVE_PLACES.some((p) => p.id === 'home'));
  assert.ok(inRect(HOME.house, HOME_PIN[0], HOME_PIN[1]));
  assert.deepEqual(HOME_PICK.map((p) => p.rect), [HOME.house, HOME.garage, HOME.workshop]);
  // In the yard by the front door, facing it (south), within reach of its prompt
  assert.ok(stands(HOME_SPAWN.x, HOME_SPAWN.z) && HOME_SPAWN.z < HOME.house[1]);
  assert.equal(HOME_SPAWN.yaw, Math.PI);
  const go = HOME_PORTALS.find((p) => p.id === 'home:in')!;
  assert.ok(Math.hypot(go.x - HOME_SPAWN.x, go.z - HOME_SPAWN.z) < 1);
  // A new player's first walk starts downtown; every one after, at home
  assert.equal(startsAtHome([]), false);
  assert.equal(startsAtHome(['emporium']), true);
  // Its land is the plot
  assert.ok(onHome(HOME_SPAWN.x, HOME_SPAWN.z) && !onHome(LANE_X, ROAD_Z));
});

test('the room: wall to wall inside the shell, its ceiling the camera\'s, everything in it apart and reachable', () => {
  const [hx0, hz0, hx1, hz1] = HOME.house;
  assert.deepEqual(ROOM.map((n) => Math.round(n * 1e6) / 1e6), [hx0 + SHELL, hz0 + SHELL, hx1 - SHELL, hz1 - SHELL].map((n) => Math.round(n * 1e6) / 1e6));
  assert.ok(CEIL > 1 && CEIL < HOME.eaves / 2 + 0.2, 'the ground floor of two');
  assert.deepEqual(HOME_CAMERA, [hx0, hz0, hx1, hz1, SLAB_Y + HOME.ridge, SLAB_Y + CEIL]);
  assert.ok(inHouse((hx0 + hx1) / 2, (hz0 + hz1) / 2) && !inHouse(HOME_SPAWN.x, HOME_SPAWN.z));
  for (const f of FURNITURE) {
    assert.ok(within(f.rect, ROOM, 1e-9), `${f.kind} through a wall`);
    assert.ok(f.h > 0 && f.h <= CEIL);
  }
  for (let i = 0; i < FURNITURE.length; i++) for (let j = i + 1; j < FURNITURE.length; j++) assert.ok(!overlap(FURNITURE[i].rect, FURNITURE[j].rect), `${FURNITURE[i].kind} on ${FURNITURE[j].kind}`);
  assert.deepEqual(FURNITURE.map((f) => f.kind).sort(), ['counter', 'dining', 'fridge', 'sofa', 'stairs', 'stash', 'table', 'tv', 'wardrobe']);
  assert.ok(homeWall(ROOM[0] + 0.05, ROOM[1] + 3, R) && !homeWall(HOME.door[0], (ROOM[1] + ROOM[3]) / 2, R));
  // From inside the front door you can walk to inside the side door and up to everything (a flood over a fine grid)
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
  const side = HOME_PORTALS.find((p) => p.id === 'home:back')!.to;
  assert.ok(reach(side.x, side.z, 0.2), 'the side door from the front');
  for (const f of FURNITURE) {
    const [x0, z0, x1, z1] = f.rect;
    assert.ok(reach(Math.max(x0, Math.min(x1, (x0 + x1) / 2)), (z0 + z1) / 2, Math.max(x1 - x0, z1 - z0) / 2 + 0.5), `${f.kind} can't be walked up to`);
  }
  // The middle of the room is clear from the front door across to the side door, a hall's width
  const dx = HOME.door[0];
  for (let z = ROOM[1] + HALL_W / 2 + 0.05; z < HOME.sideDoor[1]; z += 0.2) assert.ok(!homeWall(dx, z, HALL_W / 2), `the way in blocked at ${z}`);
  for (let x = dx; x < ROOM[2] - HALL_W / 2 - 0.05; x += 0.2) assert.ok(!homeWall(x, HOME.sideDoor[1], 0.3), `the way to the side door blocked at ${x}`);
});

test('the doors: a prompt outside and in for the front and the side, each fade landing somewhere you can stand', () => {
  assert.deepEqual(HOME_PORTALS.map((p) => p.id), ['home:in', 'home:out', 'home:yard', 'home:back', 'home:up', 'home:down']);
  for (const p of HOME_PORTALS.slice(0, 4)) {
    const inside = p.id === 'home:out' || p.id === 'home:yard';
    // The prompt on its own side of the wall, the landing on the other
    assert.equal(inHouse(p.x, p.z), inside, `${p.id}'s prompt`);
    assert.equal(inHouse(p.to.x, p.to.z), !inside, `${p.id}'s landing`);
    if (inside) {
      assert.ok(!homeWall(p.x, p.z, R), `${p.id}'s prompt in something`);
      assert.ok(stands(p.to.x, p.to.z) && inRect(HOME.inner, p.to.x, p.to.z), `${p.id} lands in something`);
    } else {
      assert.ok(stands(p.x, p.z) && inRect(HOME.inner, p.x, p.z), `${p.id}'s prompt in something`);
      assert.ok(!homeWall(p.to.x, p.to.z, R), `${p.id} lands in something`);
    }
    assert.equal(p.to.y, SLAB_Y);
    assert.ok(p.label.split(' ').length <= 3 && p.arrived.length > 2);
  }
  // Each door's two prompts are either side of the same door; you never land on the prompt that takes you back
  const [fin, fout, sout, sin] = HOME_PORTALS;
  assert.ok(Math.abs(fin.x - fout.x) < 1e-9 && Math.abs(fin.x - HOME.door[0]) < 1e-9);
  assert.ok(Math.abs(sin.z - sout.z) < 1e-9 && Math.abs(sin.z - HOME.sideDoor[1]) < 1e-9);
  // The side door opens onto the east lawn
  assert.ok(inRect(HOME.lawns[1], sout.to.x, sout.to.z));
  // Facing in as you come in, out as you go out (walking's yaw: 0 north, π south, π/2 west, -π/2 east)
  assert.deepEqual([fin.to.yaw, fout.to.yaw, sout.to.yaw, sin.to.yaw], [Math.PI, 0, -Math.PI / 2, Math.PI / 2]);
});

test("the wardrobe's and the trunk's prompts stand in the room where he can, by the thing, apart from the doors'", () => {
  assert.deepEqual(HOME_USES.map((u) => u.id), ['home:wardrobe', 'home:stash']);
  for (const u of HOME_USES) {
    assert.ok(inHouse(u.x, u.z) && !homeWall(u.x, u.z, R), `${u.id} is somewhere he can stand`);
    const f = FURNITURE.find((x) => x.kind === (u.id === 'home:wardrobe' ? 'wardrobe' : 'stash'))!.rect;
    const d = Math.hypot(u.x - Math.max(f[0], Math.min(f[2], u.x)), u.z - Math.max(f[1], Math.min(f[3], u.z)));
    assert.ok(d < 0.5, `${u.id} is at its ${u.label.toLowerCase()}`);
    assert.ok(u.label.split(' ').length <= 3);
    for (const p of [...HOME_PORTALS, ...HOME_USES]) if (p.id !== u.id) assert.ok(Math.hypot(p.x - u.x, p.z - u.z) > 0.6, `${u.id} and ${p.id} apart`);
  }
});

test('the benchmark has a view of the compound, from the Close down its line, looking at his land', () => {
  const v = BENCH_VIEWS.find((b) => b.id === 'ends-home')!;
  assert.ok(v, 'the view is there');
  const [x, y, z] = v.pos;
  assert.ok(!SOLIDS.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3]), 'the camera stands in nothing');
  assert.ok(y > SLAB_Y + 1 && y < SLAB_Y + 6, 'near eye level');
  assert.ok(Math.abs(z - ROAD_Z) < ROAD_HALF, 'on the Close');
  const [tx, , tz] = v.target;
  assert.ok(onHome(tx, tz), 'looking at his land');
  assert.ok(Math.hypot(tx - x, tz - z) < 40);
});

test('the roof terrace: up the stairs to the roof inside its rail, the room under it; each floor its own ground, walls and prompts', () => {
  const [hx0, hz0, hx1, hz1] = HOME.house;
  const roof = SLAB_Y + ROOF_Y;
  assert.ok(ROOF_Y > HOME.eaves && ROOF_Y < HOME.ridge, 'on the roof, below the parapet\'s top');
  assert.ok(TERRACE[0] > hx0 && TERRACE[1] > hz0 && TERRACE[2] < hx1 && TERRACE[3] < hz1, 'inside the parapet');
  // By height: in the room on the ground floor, on the roof up there; never both
  const [mx, mz] = [(hx0 + hx1) / 2, (hz0 + hz1) / 2];
  assert.ok(inHouse(mx, mz, SLAB_Y) && !onRoof(mx, mz, SLAB_Y));
  assert.ok(onRoof(mx, mz, roof) && !inHouse(mx, mz, roof));
  assert.ok(!onRoof(HOME_SPAWN.x, HOME_SPAWN.z, roof), 'not out over the yard');
  for (const y of [0, SLAB_Y, 1, roof - 0.5, roof, roof + 1.4]) assert.notEqual(inHouse(mx, mz, y), onRoof(mx, mz, y), `at ${y}`);
  // The ground: the roof when he's up there (a jump too), the room's floor when he isn't
  assert.equal(homeRoofY(mx, mz, roof), roof);
  assert.equal(homeRoofY(mx, mz, roof + 1.2), roof);
  assert.equal(homeRoofY(mx, mz, SLAB_Y), null);
  assert.equal(homeRoofY(HOME_SPAWN.x, HOME_SPAWN.z, roof), null);
  // The rail: nowhere on the roof past the terrace's edge, all the way round
  const R = 0.14;
  for (let x = hx0; x <= hx1; x += 0.25) for (const z of [hz0 + 0.1, hz1 - 0.1]) assert.ok(roofWall(x, z, R), `over the edge at ${x}, ${z}`);
  for (let z = hz0; z <= hz1; z += 0.25) for (const x of [hx0 + 0.1, hx1 - 0.1]) assert.ok(roofWall(x, z, R), `over the edge at ${x}, ${z}`);
  // What stands on it: on the terrace, apart; the hatch over the stairs below
  for (const t of ROOF_THINGS) assert.ok(within(t.rect, TERRACE, 1e-9) && t.h > 0 && t.h < 0.8, `${t.kind} off the terrace`);
  for (let i = 0; i < ROOF_THINGS.length; i++) for (let j = i + 1; j < ROOF_THINGS.length; j++) assert.ok(!overlap(ROOF_THINGS[i].rect, ROOF_THINGS[j].rect), `${ROOF_THINGS[i].kind} on ${ROOF_THINGS[j].kind}`);
  const stairs = FURNITURE.find((f) => f.kind === 'stairs')!.rect;
  assert.ok(overlap(HATCH, stairs), 'the hatch is over the stairs');
  assert.deepEqual(ROOF_THINGS[0], { kind: 'hatch', rect: HATCH, h: ROOF_THINGS[0].h });
  // The stairs' fades: from the room at their foot to the hatch's side, and down again, each landing where he can stand
  const up = HOME_PORTALS.find((p) => p.id === 'home:up')!;
  const down = HOME_PORTALS.find((p) => p.id === 'home:down')!;
  assert.ok(inHouse(up.x, up.z) && !homeWall(up.x, up.z, R), 'the way up stands in the room');
  assert.ok(Math.hypot(up.x - Math.max(stairs[0], Math.min(stairs[2], up.x)), up.z - Math.max(stairs[1], Math.min(stairs[3], up.z))) < 0.6, 'by the stairs');
  assert.equal(up.to.y, roof);
  assert.ok(!roofWall(up.to.x, up.to.z, R), 'he arrives on the terrace');
  assert.ok(!roofWall(down.x, down.z, R) && Math.hypot(down.x - up.to.x, down.z - up.to.z) < 1, 'the way down is where he arrives');
  assert.equal(down.to.y, SLAB_Y);
  assert.ok(!homeWall(down.to.x, down.to.z, R) && Math.hypot(down.to.x - up.x, down.to.z - up.z) < 1);
  assert.deepEqual([up.label, down.label, up.arrived, down.arrived], ['Upstairs', 'Downstairs', 'The terrace', 'Home']);
  // From where he arrives he can walk to both chairs and the front rail (a flood over the terrace)
  const step = 0.1;
  const seen = new Set<string>();
  const start: [number, number] = [Math.round((up.to.x - TERRACE[0]) / step), Math.round((up.to.z - TERRACE[1]) / step)];
  const at = (i: number, j: number): [number, number] => [TERRACE[0] + i * step, TERRACE[1] + j * step];
  const queue = [start];
  seen.add(start.join());
  while (queue.length) {
    const [i, j] = queue.pop()!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n: [number, number] = [i + di, j + dj];
      if (seen.has(n.join()) || roofWall(...at(...n), R)) continue;
      seen.add(n.join());
      queue.push(n);
    }
  }
  const reach = (x: number, z: number, r: number) => [...seen].some((k) => Math.hypot(at(...(k.split(',').map(Number) as [number, number]))[0] - x, at(...(k.split(',').map(Number) as [number, number]))[1] - z) < r);
  for (const t of ROOF_THINGS) assert.ok(reach((t.rect[0] + t.rect[2]) / 2, (t.rect[1] + t.rect[3]) / 2, 1), `${t.kind} can't be walked up to`);
  // (the front corner by the rail, and the back rail between the planters)
  assert.ok(reach(TERRACE[0] + 0.3, TERRACE[1] + 0.3, 0.3) && reach((TERRACE[0] + TERRACE[2]) / 2, TERRACE[3] - 0.3, 0.3), 'front to back');
  // Each floor shows its own prompts: on the terrace only the way down; below, everything but it
  assert.deepEqual(homePlaces(roof).map((p) => p.id), ['home:down']);
  const low = homePlaces(SLAB_Y).map((p) => p.id);
  assert.deepEqual(low, ['home:in', 'home:out', 'home:yard', 'home:back', 'home:up', 'home:wardrobe', 'home:stash']);
  for (const p of homePlaces(SLAB_Y)) if (p.id !== 'home:up') assert.ok(Math.hypot(p.x - up.x, p.z - up.z) > 0.6, `home:up and ${p.id} apart`);
  // The camera's ceiling box ends under the terrace's floor's level... the parapet's top, so the camera stays over it up there
  assert.ok(roof < HOME_CAMERA[4] && roof + 1 > HOME_CAMERA[4]);
});
