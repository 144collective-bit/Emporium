// Degen's home, his compound (home.ts, docs/ends-far-west-plan.md Phase 2, the owner's picks: a walled yard with
// gates on its own plot in the Ends' far west, a double garage, a house with a roof terrace, a workshop, lawns): its
// wall round the plot with the gates open on the Close's line; the buildings inside the wall, apart, under the
// estate's rows and the Emporium; what's solid, and the ways through it; the car and the bike in the garage behind a
// door each; the place, where walking starts; the room inside, its doors' fades and the things to use; the old house
// a neighbour's again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BIKE_HOME, BOLLARD, BOLLARDS, CAR_HOME, CEIL, HOME, homeCamera, HOME_GARAGE_DOOR, HOME_LAND, HOME_PICK, HOME_PIN, HOME_PORTALS, HOME_SOLIDS, HOME_SPAWN, HOME_USES, HOME_VIEW,
  HOME_WORKSHOP_DOOR, HATCH, PIER, PLANTERS, PLANTER_H, ROOF_THINGS, ROOF_Y, ROOM, SHELL, TERRACE, WALL, WALL_H, WALL_T, BASE_CEIL, BASE_Y, homeFloorY, homeLevel, homePlaces, homeWall, inHouse, UP_CEIL, UP_Y, onHome, onRoof, roofWall,
  HOME_WAITS, HOME_WAKE, WAITING, SOFA_SEAT, ROOM_WINDOWS, CURTAIN, curtainPanels, FIRE_ESCAPE, GATEHOUSE, GATEHOUSE_H, GATE_LEAF, GATE_LEAF_H, FOUNTAIN, PALMS, PALM_PLANTER, YARD_TREE, YARD_TREES, GARDEN_PATHS, PATH_LIGHT, PATH_LIGHTS, pathStones, STONE_SIZE, POOL, LOUNGERS, CABANA, CABANA_SOFA, CABANA_POSTS, HELIPAD,
  HOME_POOLS, HOUSE_GEO, setRooms, STAIR, STAIR_FOOT, STAIR_GATE, ROOF_STEPS, stairY, stairRails, DEN_STEPS, denY, roofStepY, HATCH_WAY, HATCH_KERB,
} from '../src/scripts/city3d/home';
import { HALL_W, houseRooms } from '../src/scripts/city3d/homerooms';

const { FURNITURE, UPSTAIRS, UP_DOORS, BASEMENT } = houseRooms(HOUSE_GEO);
setRooms({ room: FURNITURE, up: UPSTAIRS, base: BASEMENT });
import { GATES, HEAD, LANE_HALF, LANE_X, PLOT, ROAD_HALF, ROAD_Z } from '../src/scripts/city3d/endsfar';
import { SLAB_Y, inEndswood } from '../src/scripts/city3d/endswood';
import { SOLIDS as BOOT_SOLIDS } from '../src/scripts/city3d/solids';
import { ALLOTMENT_SOLIDS, COUNCIL_SOLIDS } from '../src/scripts/city3d/council';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';
import { CARS } from '../src/scripts/city3d/carspec';
import { PLAYER_CARS } from '../src/scripts/city3d/mycar';
import { BENCH_VIEWS } from '../src/scripts/city3d/bench';
import { benchMark } from '../src/scripts/city3d/moments';
/** What's solid, the council rows' and the allotments' too (they join with the village's chunk: council3d.ts) */
const SOLIDS = [...BOOT_SOLIDS, ...COUNCIL_SOLIDS, ...ALLOTMENT_SOLIDS];

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
  assert.ok(WALL_H > 1.6 && WALL_H < 2.0, 'about twice his height (the kingpin\'s compound, docs/compound-plan.md Phase 6b)');
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
  // The owner's sizes: the house 10.4 by 7.5 (docs/house-plan.md Phase 1: a third more floor than its 9 by 6.5), the
  // garage 8 by 5 with two doors, the workshop 5 by 4
  const size = (r: Rect) => [r[2] - r[0], r[3] - r[1]].map((n) => Math.round(n * 10) / 10);
  assert.deepEqual(size(HOME.house), [10.4, 7.5]);
  assert.deepEqual(size(HOME.garage), [5, 8]);
  assert.deepEqual(size(HOME.workshop), [5, 4]);
  // The garage faces the gates down the Close's line; nothing stands between them
  assert.equal((HOME.garage[1] + HOME.garage[3]) / 2, ROAD_Z);
  for (let x = HOME.garage[2] + 0.3; x < PLOT[2]; x += 0.3) assert.ok(stands(x, ROAD_Z), `something on the drive at ${x}`);
  // Everything low: two storeys, far under the Emporium
  for (const p of HOME_PICK) assert.ok(SLAB_Y + p.h < 6, 'two storeys');
  assert.ok(HOME.ridge > HOME.eaves && HOME.eaves >= 2.2, 'two storeys under a parapet');
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
});

test('done up (docs/compound-plan.md Phase 1): the bollards and the planters at the yard\'s edges, clear of the drive, the doors and the prompts', () => {
  const buildings = [HOME.house, HOME.garage, HOME.workshop];
  const [, , px1] = PLOT;
  // The bollards: in the yard (not on a lawn or in a building), well off the drive from the garage to the gates
  assert.ok(BOLLARDS.length >= 6);
  for (const [x, z] of BOLLARDS) {
    assert.ok(inRect(HOME.inner, x, z, -BOLLARD.r - 0.1), `a bollard off the yard at ${x}, ${z}`);
    for (const r of [...buildings, ...HOME.lawns]) assert.ok(!inRect(r, x, z, BOLLARD.r), `a bollard in something at ${x}, ${z}`);
    assert.ok(Math.abs(z - ROAD_Z) > 4, `a bollard on the drive at ${x}, ${z}`);
    assert.ok(Math.hypot(px1 - x, z - ROAD_Z) > 3, 'clear of the gates');
    assert.ok(BOLLARD.h < 0.6, 'low');
  }
  for (let i = 0; i < BOLLARDS.length; i++)
    for (let j = i + 1; j < BOLLARDS.length; j++) assert.ok(Math.hypot(BOLLARDS[i][0] - BOLLARDS[j][0], BOLLARDS[i][1] - BOLLARDS[j][1]) > 1.5, 'room to walk between');
  // The planters: one each side of the front door, against the house's front, the door's way between them clear
  assert.equal(PLANTERS.length, 2);
  const [dx, dz] = HOME.door;
  const [west, east] = [...PLANTERS].sort((a, b) => a[0] - b[0]);
  assert.ok(west[2] < dx - 0.45 && east[0] > dx + 0.45, 'the door between them');
  for (const r of PLANTERS) {
    assert.ok(r[3] < dz && dz - r[3] < 0.2, 'at the wall\'s foot');
    assert.ok(PLANTER_H < 0.5);
  }
  // Nothing new in a prompt's way: the front door's, the garage's, the workshop's, where walking starts, the menu's
  // camera; the path from the spawn to the front door clear
  const inPortal = HOME_PORTALS.find((p) => p.id === 'home:in')!;
  for (const p of [inPortal, HOME_GARAGE_DOOR, HOME_WORKSHOP_DOOR, HOME_SPAWN, { x: HOME_VIEW.eye[0], z: HOME_VIEW.eye[2] }]) assert.ok(stands(p.x, p.z), `a prompt blocked at ${p.x}, ${p.z}`);
  for (let k = 0; k <= 20; k++) {
    const t = k / 20;
    assert.ok(stands(HOME_SPAWN.x + (inPortal.x - HOME_SPAWN.x) * t, HOME_SPAWN.z + (inPortal.z - HOME_SPAWN.z) * t), 'the way to the front door');
  }
  // The side door's from the yard round the house's east end, past the bollards
  for (let z = HOME.house[1] - 1; z < HOME.sideDoor[1]; z += 0.2) assert.ok(stands(HOME.house[2] + 0.5, z), `the way to the side door at ${z}`);
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
  // Its land is the plot
  assert.ok(onHome(HOME_SPAWN.x, HOME_SPAWN.z) && !onHome(LANE_X, ROAD_Z));
});

test('the room: wall to wall inside the shell, its ceiling the camera\'s, everything in it apart and reachable', () => {
  const [hx0, hz0, hx1, hz1] = HOME.house;
  assert.deepEqual(ROOM.map((n) => Math.round(n * 1e6) / 1e6), [hx0 + SHELL, hz0 + SHELL, hx1 - SHELL, hz1 - SHELL].map((n) => Math.round(n * 1e6) / 1e6));
  assert.ok(CEIL > 1 && CEIL < HOME.eaves / 2 + 0.2, 'the ground floor of two');
  // (the camera under the room's ceiling but over the stair's well, open up to the landing's: docs/house-plan.md Phase 2)
  const cam = homeCamera(SLAB_Y);
  for (const b of cam.slice(0, 4)) assert.deepEqual(b.slice(4), [SLAB_Y + HOME.ridge, SLAB_Y + CEIL]);
  assert.deepEqual(cam[4], [...STAIR.well, SLAB_Y + HOME.ridge, SLAB_Y + UP_CEIL]);
  const area = (b: readonly number[]) => (b[2] - b[0]) * (b[3] - b[1]);
  assert.ok(Math.abs(cam.slice(0, 5).reduce((t, b) => t + area(b), 0) - (hx1 - hx0) * (hz1 - hz0)) < 1e-6, 'the footprint covered, once');
  assert.ok(inHouse((hx0 + hx1) / 2, (hz0 + hz1) / 2) && !inHouse(HOME_SPAWN.x, HOME_SPAWN.z));
  for (const f of FURNITURE) {
    assert.ok(within(f.rect, ROOM, 1e-9), `${f.kind} through a wall`);
    assert.ok(f.h > 0 && f.h <= CEIL);
  }
  for (let i = 0; i < FURNITURE.length; i++) for (let j = i + 1; j < FURNITURE.length; j++) assert.ok(!overlap(FURNITURE[i].rect, FURNITURE[j].rect), `${FURNITURE[i].kind} on ${FURNITURE[j].kind}`);
  assert.deepEqual(
    [...new Set(FURNITURE.map((f) => f.kind))].sort(),
    ['armchair', 'boots', 'chair', 'chaise', 'console', 'counter', 'dining', 'fridge', 'island', 'lamp', 'laundry', 'media', 'oven', 'plant', 'sofa', 'stools', 'table', 'trophies'],
  );
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

test('the refit (docs/compound-plan.md Phase 2, docs/interior-plan.md Phase 1): the lounge west, the telly on the wall, the kitchen at the back, the hall clear', () => {
  const at = (k: string) => FURNITURE.find((f) => f.kind === k)!.rect;
  const [rx0, rz0, rx1, rz1] = ROOM;
  const dx = HOME.door[0];
  // The wardrobe's prompt is upstairs in the dressing room now (docs/interior-plan.md Phase 3); the stash is the den's vault
  const use = (id: string) => HOME_USES.find((u) => u.id === id)!;
  assert.equal(use('home:wardrobe').level, 'up');
  assert.equal(use('home:stash').level, 'base');
  for (const u of HOME_USES.filter((x) => x.level === 'room')) assert.ok(!homeWall(u.x, u.z, R), `${u.id}'s prompt in something`);
  assert.ok(!homeWall(STAIR_FOOT.x, STAIR_FOOT.z, R), 'the stair\'s foot');
  // The lounge west of the hall: the media wall on the west wall (nothing stands in the middle of the room for the
  // telly), the corner sofa facing it across the coffee table, the chaise at its south end, the trophy wall past it
  for (const k of ['media', 'sofa', 'chaise', 'armchair', 'table', 'trophies', 'lamp']) assert.ok(at(k)[2] < dx - HALL_W / 2, `${k} in the lounge`);
  const [media, sofa, chaise, table, wall] = ['media', 'sofa', 'chaise', 'table', 'trophies'].map(at);
  assert.ok(Math.abs(media[0] - rx0) < 1e-9 && media[2] - media[0] < 0.2, 'the media wall against the west wall');
  assert.ok(Math.abs(chaise[2] - sofa[0]) < 1e-9 && Math.abs(chaise[3] - sofa[3]) < 1e-9, 'the chaise turns the sofa\'s south end');
  assert.ok(table[0] > media[2] + 2 * R + 0.2 && table[2] < sofa[0] - 2 * R - 0.1, 'the coffee table between the telly and the sofa, a way round it');
  const mid = (media[1] + media[3]) / 2;
  assert.ok(mid > sofa[1] && mid < sofa[3] && mid > table[1] && mid < table[3], 'the sofa and the table face the telly');
  assert.ok(Math.abs(wall[0] - rx0) < 1e-9 && wall[1] > media[3], 'the trophy wall on the west wall, past the media wall');
  // The kitchen along the back wall: the island with room to walk round it, its stools on the lounge's side
  const [island, stools, counter] = ['island', 'stools', 'counter'].map(at);
  assert.ok(Math.abs(counter[3] - rz1) < 1e-9);
  assert.ok(counter[1] - island[3] > 2 * R + 0.2, 'a way between the island and the counter');
  assert.ok(stools[3] <= island[1] && stools[1] - chaise[3] > 2 * R + 0.1, 'the stools on the lounge\'s side, with a way past them');
  assert.ok(island[2] < dx - HALL_W / 2, 'the island off the hall');
  // The boot room by the side door (docs/interior-plan.md Phase 4): the bench north of it, the laundry south, both on the
  // east wall, the door's way clear between them
  const [boots, laundry] = ['boots', 'laundry'].map(at);
  const sz = HOME.sideDoor[1];
  assert.ok(Math.abs(boots[2] - rx1) < 1e-9 && Math.abs(laundry[2] - rx1) < 1e-9, 'on the east wall');
  assert.ok(boots[3] < sz - 0.5 && laundry[1] > sz + 0.4, 'either side of the side door, clear of it');
  // The stair hall in the front east corner (docs/house-plan.md Phase 2), clear of everything in the room
  const [wx0, wz0, wx1, wz1] = STAIR.well;
  assert.ok(Math.abs(wx1 - rx1) < 1e-9 && Math.abs(wz0 - rz0) < 1e-9 && wx0 > dx + HALL_W / 2 && wz1 < HOME.sideDoor[1] - 1, 'in the corner, off the hall');
  for (const f of FURNITURE) assert.ok(!overlap(f.rect, STAIR.well), `the ${f.kind} in the stair hall`);
});

test('the doors: a prompt outside and in for the front and the side, each fade landing somewhere you can stand', () => {
  assert.deepEqual(HOME_PORTALS.map((p) => p.id), ['home:in', 'home:out', 'home:yard', 'home:back']);
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

test('every visit wakes in the room: clear of the furniture, facing the telly, out of reach of every prompt', () => {
  assert.ok(inHouse(HOME_WAKE.x, HOME_WAKE.z) && !homeWall(HOME_WAKE.x, HOME_WAKE.z, R), 'somewhere he can stand in the room');
  assert.equal(HOME_WAKE.yaw, Math.PI / 2, 'facing west, at the media wall');
  const tv = FURNITURE.find((f) => f.kind === 'media')!.rect;
  const sofa = FURNITURE.find((f) => f.kind === 'sofa')!.rect;
  assert.ok(HOME_WAKE.x < sofa[0] && HOME_WAKE.x > tv[2] && HOME_WAKE.z > tv[1] && HOME_WAKE.z < tv[3], 'between the sofa and the telly');
  // (the way the smoke test walks him out: a step west off the sofa, north past its end, east along the front wall to
  // the hall and the front door's prompt)
  const [wx, nz] = [HOME_WAKE.x - 0.2, ROOM[1] + 0.5];
  for (let x = HOME_WAKE.x; x > wx; x -= 0.05) assert.ok(!homeWall(x, HOME_WAKE.z, R + 0.03), `off the sofa at ${x}`);
  for (let z = HOME_WAKE.z; z > nz; z -= 0.05) assert.ok(!homeWall(wx, z, R + 0.03), `north past the sofa at ${z}`);
  for (let x = wx; x < HOME.door[0]; x += 0.05) assert.ok(!homeWall(x, nz, R + 0.03), `along to the hall at ${x}`);
  // (a prompt shows within 1 of him, walk.ts: none as he wakes)
  for (const p of homePlaces(0)) assert.ok(Math.hypot(p.x - HOME_WAKE.x, p.z - HOME_WAKE.z) > 1.05, `${p.id} shows as he wakes`);
});

test('he wakes sat on the sofa, its cushion under him, and stands up onto the wake spot', () => {
  const sofa = FURNITURE.find((f) => f.kind === 'sofa')!;
  const m = benchMark(SOFA_SEAT, SLAB_Y);
  assert.ok(Math.abs(m.x - HOME_WAKE.x) < 1e-9 && Math.abs(m.z - HOME_WAKE.z) < 1e-9, 'stood up onto HOME_WAKE');
  // (facing the telly: the bench mark's face, 0 south, is walking's yaw π turned round, walk.ts face = yaw + π)
  assert.ok(Math.abs(Math.cos(m.face - (HOME_WAKE.yaw + Math.PI))) > 0.999);
  assert.ok(inRect(sofa.rect, m.seat!.x, m.seat!.z), 'the seat is on the sofa');
  assert.ok(SOFA_SEAT.h > 0.15 && SOFA_SEAT.h < sofa.h, 'on its cushion, under its back');
});

test('the curtains: drawn, they cover both windows; open, they bunch at the ends; always in the room, off the glass, over the furniture', () => {
  const panels = (k: number) => curtainPanels(k);
  assert.equal(panels(0).length, ROOM_WINDOWS.length * 2);
  for (const [i, w] of ROOM_WINDOWS.entries()) {
    const [a, b] = [panels(0)[i * 2], panels(0)[i * 2 + 1]];
    assert.ok(a[0] < w.x0 && b[2] > w.x1, 'drawn: past both ends');
    assert.ok(Math.abs(a[2] - b[0]) < 1e-9, 'drawn: meeting in the middle');
    const [c, d] = [panels(1)[i * 2], panels(1)[i * 2 + 1]];
    assert.ok(c[2] - c[0] <= CURTAIN.bunched + 1e-9 && d[2] - d[0] <= CURTAIN.bunched + 1e-9, 'open: bunched');
    assert.ok(d[0] - c[2] > (w.x1 - w.x0) * 0.8, 'open: most of the window clear');
    // (in the room, a few cm off the glass and its frame: nothing flush)
    for (const p of [a, b, c, d]) {
      assert.ok(within(p, ROOM, 1e-9), 'in the room');
      assert.ok(Math.min(Math.abs(p[1] - w.z), Math.abs(p[3] - w.z)) >= 0.035 + 0.005, 'off the window');
    }
  }
  for (const k of [0.25, 0.5, 0.75]) for (const p of panels(k)) assert.ok(p[2] > p[0], 'never inside out');
  assert.ok(CURTAIN.y0 > Math.max(...FURNITURE.filter((f) => f.kind === 'sofa' || f.kind === 'counter').map((f) => f.h)), 'over the sofa and the counter');
  assert.ok(CURTAIN.y1 < CEIL, 'under the ceiling');
});

test('while the street is loading, the ways out of the room wait and the rest are as they were', () => {
  assert.deepEqual([...HOME_WAITS].sort(), ['home:out', 'home:stairs', 'home:yard']);
  assert.ok(WAITING.split(' ').length <= 3);
  for (const y of [0, SLAB_Y + ROOF_Y]) {
    const ready = homePlaces(y);
    // (in the room the stair's foot says it's waiting too: docs/house-plan.md Phase 2, it's walked)
    const waiting = homePlaces(y, false).filter((p) => p.id !== 'home:stairs');
    assert.deepEqual(waiting.map((p) => p.id), ready.map((p) => p.id), 'the same prompts');
    for (const [i, p] of waiting.entries()) assert.equal(p.label, HOME_WAITS.includes(p.id) ? WAITING : ready[i].label, p.id);
  }
  const foot = homePlaces(SLAB_Y, false).find((p) => p.id === 'home:stairs')!;
  assert.ok(foot.label === WAITING && Math.hypot(foot.x - STAIR_FOOT.x, foot.z - STAIR_FOOT.z) < 1e-9);
  assert.ok(!homePlaces(SLAB_Y + UP_Y, false).some((p) => p.id === 'home:stairs'), 'only in the room');
  // ...and shut meanwhile: the first flight's foot is a wall, open again once the street's ready
  const onFoot: [number, number] = [STAIR_FOOT.x, STAIR.well[3] - 0.1];
  STAIR_GATE.shut = true;
  assert.ok(homeWall(...onFoot, R, SLAB_Y));
  STAIR_GATE.shut = false;
  assert.ok(!homeWall(...onFoot, R, SLAB_Y));
  // Going in from the yard never waits
  assert.ok(!HOME_WAITS.includes('home:in') && !HOME_WAITS.includes('home:back'));
});

test("the wardrobe's and the vault's prompts stand where he can, by the thing, apart from the doors'", () => {
  assert.deepEqual(HOME_USES.map((u) => u.id), ['home:wardrobe', 'home:stash', 'home:desk']);
  for (const u of HOME_USES.filter((x) => x.id !== 'home:desk')) {
    const fy = u.level === 'base' ? SLAB_Y + BASE_Y : SLAB_Y + UP_Y;
    assert.ok(inHouse(u.x, u.z, fy) && !homeWall(u.x, u.z, R, fy), `${u.id} is somewhere he can stand`);
    const f = u.id === 'home:wardrobe' ? UPSTAIRS.find((x) => x.kind === 'rails')!.rect : BASEMENT.find((x) => x.kind === 'vault')!.rect;
    const d = Math.hypot(u.x - Math.max(f[0], Math.min(f[2], u.x)), u.z - Math.max(f[1], Math.min(f[3], u.z)));
    assert.ok(d < 0.5, `${u.id} is at its ${u.label.toLowerCase()}`);
    assert.ok(u.label.split(' ').length <= 3);
    for (const p of [...HOME_PORTALS, ...HOME_USES]) if (p.id !== u.id && p.level === u.level) assert.ok(Math.hypot(p.x - u.x, p.z - u.z) > 0.6, `${u.id} and ${p.id} apart`);
  }
});

test('upstairs (docs/compound-plan.md Phase 3): its own floor between the room and the roof, the landing, the bedroom and the office, the desk', () => {
  const [hx0, hz0, hx1, hz1] = HOME.house;
  const [mx, mz] = [(hx0 + hx1) / 2, (hz0 + hz1) / 2];
  const floor = SLAB_Y + UP_Y;
  // Over the room's ceiling and under the roof, a room's height; each floor known by his height, a jump included
  assert.ok(UP_Y > CEIL && UP_Y - CEIL < 0.2 && UP_CEIL === HOME.eaves && UP_CEIL - UP_Y > 1.1, 'a storey over the room');
  for (const [f, lv] of [[0, 'room'], [UP_Y, 'up'], [ROOF_Y, 'roof']] as const) for (const jump of [0, 0.3, 0.55]) assert.equal(homeLevel(SLAB_Y + f + jump), lv, `${lv} at ${jump}`);
  assert.ok(inHouse(mx, mz, floor) && !onRoof(mx, mz, floor));
  assert.equal(homeFloorY(mx, mz, floor), floor);
  assert.equal(homeFloorY(mx, mz, floor + 0.5), floor);
  // The camera up there: over the room's ceiling (its floor's boxes topped out under the floor, open over the stair's
  // well) and under the roof
  const cam = homeCamera(floor);
  for (const under of cam.slice(0, 4)) assert.ok(under[4] + 0.15 < floor && under[4] + 0.15 > SLAB_Y + CEIL && !overlap(under, STAIR.well), 'the floor under him');
  assert.equal(cam[4][5], SLAB_Y + UP_CEIL);
  // What stands upstairs: inside the walls, apart (the partitions may meet end to end)
  for (const u of UPSTAIRS) {
    assert.ok(within(u.rect, ROOM, 1e-9), `${u.kind} through a wall`);
    assert.ok(u.h > 0 && u.h <= UP_CEIL - UP_Y + 1e-9);
  }
  for (let i = 0; i < UPSTAIRS.length; i++) for (let j = i + 1; j < UPSTAIRS.length; j++) assert.ok(!overlap(UPSTAIRS[i].rect, UPSTAIRS[j].rect), `${UPSTAIRS[i].kind} on ${UPSTAIRS[j].kind}`);
  // Nothing stands in the stair's well, and from the landing's floor its rails stop him but at the second flight's head
  for (const u of UPSTAIRS) assert.ok(!overlap(u.rect, STAIR.well), `the ${u.kind} in the well`);
  // From the stair's head he can walk everywhere: both rooms through their doorways, the desk, the ways down and up
  const step = 0.1;
  const key = (i: number, j: number) => `${i},${j}`;
  const at = (i: number, j: number): [number, number] => [ROOM[0] + i * step, ROOM[1] + j * step];
  const start = { x: (STAIR.b[0] + STAIR.b[2]) / 2, z: STAIR.well[3] + 0.3 };
  // (onto the stair and the roof's steps only as far as their floor is the landing's: on them, he'd be on the steps,
  // not the floor)
  const off = (x: number, z: number) => Math.abs((homeFloorY(x, z, floor + 0.3) ?? SLAB_Y) - floor) > 0.3;
  const first: [number, number] = [Math.round((start.x - ROOM[0]) / step), Math.round((start.z - ROOM[1]) / step)];
  assert.ok(!homeWall(...at(...first), R, floor), 'he arrives somewhere he can stand');
  const seen = new Set([key(...first)]);
  const queue = [first];
  while (queue.length) {
    const [i, j] = queue.pop()!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n: [number, number] = [i + di, j + dj];
      if (seen.has(key(...n)) || homeWall(...at(...n), R, floor) || off(...at(...n))) continue;
      seen.add(key(...n));
      queue.push(n);
    }
  }
  const reach = (x: number, z: number, r: number) => [...seen].some((k) => { const [px, pz] = at(...(k.split(',').map(Number) as [number, number])); return Math.hypot(px - x, pz - z) < r; });
  for (const u of UPSTAIRS) {
    if (u.kind === 'wall') continue;
    const [x0, z0, x1, z1] = u.rect;
    assert.ok(reach((x0 + x1) / 2, (z0 + z1) / 2, Math.max(x1 - x0, z1 - z0) / 2 + 0.5), `${u.kind} can't be walked up to`);
  }
  // (the bedroom through the dressing room at the front, the office at the back, the bathroom behind the landing, each
  // through its own doorway: docs/interior-plan.md Phase 3)
  assert.ok(reach(ROOM[0] + 2.45, ROOM[1] + 1.4, 0.3), 'the bedroom');
  assert.ok(reach(ROOM[0] + 4.5, ROOM[1] + 1.8, 0.3), 'the dressing room');
  assert.ok(reach(ROOM[0] + 2, ROOM[3] - 1.6, 0.3), 'the office');
  assert.ok(reach(ROOM[2] - 1.5, ROOM[3] - 0.65, 0.2), 'the bathroom');
  assert.equal(UP_DOORS.length, 2);
  // The bedroom's telly faces the bed across the room, the bed's head on the west wall
  const [bed, tv] = ['bed', 'tv'].map((k) => UPSTAIRS.find((u) => u.kind === k)!.rect);
  assert.ok(Math.abs(bed[0] - ROOM[0]) < 1e-9 && Math.abs((bed[1] + bed[3]) / 2 - (tv[1] + tv[3]) / 2) < 0.1 && tv[0] - bed[2] > 1, 'the telly facing the bed');
  // The middle front window in the dressing room, whole (the partition clear of it)
  const dress = UPSTAIRS.filter((u) => u.kind === 'wall' && u.rect[2] - u.rect[0] < 0.2 && u.rect[2] < ROOM[2] - 3).map((u) => u.rect[0]);
  for (const x of dress) assert.ok(x < ROOM[0] + 3.2, 'the dressing room\'s partition west of the middle window');
  // (the stair's well: never stepped into from the landing's floor; but for the second flight's head and the roof's
  // steps' foot, the flood over the floor stays out of it)
  const [rs0, , rs1] = ROOF_STEPS.rect;
  for (const k of seen) {
    const [px, pz] = at(...(k.split(',').map(Number) as [number, number]));
    const heads = (px > STAIR.b[0] && px < STAIR.b[2]) || (px > rs0 && px < rs1);
    assert.ok(!(px > STAIR.well[0] + 0.01 && pz < STAIR.well[3] - 0.01 && !(heads && pz > STAIR.well[3] - 0.7)), `off the landing into the well at ${px.toFixed(2)}, ${pz.toFixed(2)}`);
  }
  // Its prompts: the wardrobe, the desk (the roof's steps are walked: docs/house-plan.md Phase 3); standing where he
  // can, apart, all reached
  assert.deepEqual(homePlaces(floor).map((p) => p.id), ['home:wardrobe', 'home:desk']);
  for (const p of homePlaces(floor)) {
    assert.ok(!homeWall(p.x, p.z, R, floor) && reach(p.x, p.z, 0.2), `${p.id}'s prompt`);
    for (const q of homePlaces(floor)) if (q !== p) assert.ok(Math.hypot(p.x - q.x, p.z - q.z) > 0.6, `${p.id} and ${q.id} apart`);
  }
  const desk = HOME_USES.find((u) => u.id === 'home:desk')!;
  const d = UPSTAIRS.find((u) => u.kind === 'desk')!.rect;
  assert.ok(desk.level === 'up' && desk.x > d[0] && desk.x < d[2] && d[1] - desk.z < 1.2, 'at the desk, behind its chair');
});

test('the turned stair (docs/house-plan.md Phase 2): walked from the room round the half landing up to the landing and down again, its rails round it', () => {
  const { well, a, half, b, spine, window: win } = STAIR;
  const [x0, z0, x1, z1] = well;
  const up = SLAB_Y + UP_Y;
  // In the stair hall in the front east corner: the first flight up the east wall to the half landing across the front,
  // the second back beside it to the landing's floor, the spine between; they fill the well
  const area = (r: readonly number[]) => (r[2] - r[0]) * (r[3] - r[1]);
  assert.ok(Math.abs(area(a) + area(half) + area(b) + area(spine) - area(well)) < 1e-9, 'the well filled');
  assert.ok(Math.abs(a[2] - x1) < 1e-9 && Math.abs(half[1] - z0) < 1e-9 && Math.abs(b[0] - x0) < 1e-9);
  assert.ok(a[2] - a[0] >= 0.85 && b[2] - b[0] >= 0.85, 'flights a body and more wide');
  // Its floor: the room's at the first flight's foot, half way up on the half landing, the landing's at the second's head
  const [ax, bx, hz] = [(a[0] + a[2]) / 2, (b[0] + b[2]) / 2, (half[1] + half[3]) / 2];
  assert.ok(Math.abs(stairY(ax, a[3])! - SLAB_Y) < 1e-9 && Math.abs(stairY(ax, hz)! - (SLAB_Y + UP_Y / 2)) < 1e-9 && Math.abs(stairY(bx, b[3])! - up) < 1e-9);
  assert.equal(stairY((spine[0] + spine[2]) / 2, (spine[1] + spine[3]) / 2), null, 'not on the spine');
  assert.equal(stairY(x0 - 0.1, hz), null);
  // ...gentle: no steeper than the old straight flight (1.3 up over 2.8)
  assert.ok(UP_Y / 2 / (a[3] - a[1]) <= 1.3 / 2.8 + 1e-9 && STAIR.steps >= 5);
  // Walked (as walk.ts does: the ground under him asked from a little over his feet, walking's radius), from the room
  // up and round to the landing: each step a small one, nothing stopping him
  const RW = 0.17;
  const path: [number, number][] = [];
  for (let z = z1 + 0.6; z > hz; z -= 0.05) path.push([ax, z]);
  for (let x = ax; x > bx; x -= 0.05) path.push([x, hz]);
  for (let z = hz; z < z1 + 0.6; z += 0.05) path.push([bx, z]);
  const walk = (pts: [number, number][], from: number) => {
    let y = from;
    for (const [x, z] of pts) {
      const g = homeFloorY(x, z, y + 0.3) ?? SLAB_Y;
      assert.ok(Math.abs(g - y) < 0.06, `a step of ${(g - y).toFixed(2)} at ${x.toFixed(2)}, ${z.toFixed(2)}`);
      y = g;
      assert.ok(!homeWall(x, z, RW, y), `stopped at ${x.toFixed(2)}, ${z.toFixed(2)}, ${(y - SLAB_Y).toFixed(2)} up`);
    }
    return y;
  };
  assert.equal(walk(path, SLAB_Y), up, 'up on the landing');
  assert.equal(walk([...path].reverse(), up), SLAB_Y, 'and down in the room again');
  // Its rails: from the room's floor, never onto it but at the first flight's foot (not up its side, not under the
  // second flight's head, where the den's door is); from the landing's floor, never into the well but at the second
  // flight's head; on it, never across the spine
  for (let z = z0 + 0.2; z < z1; z += 0.2) {
    assert.ok(homeWall(x0 - 0.1, z, RW, SLAB_Y), `up the side from the room at ${z}`);
    assert.ok(homeWall(x0 - 0.1, z, RW, up), `into the well from the gallery at ${z}`);
  }
  assert.ok(homeWall(b[0] + 0.05, z1 + 0.1, RW, SLAB_Y) && !homeWall(ax, z1 + 0.1, RW, SLAB_Y), 'the first flight\'s foot, open (beside the den\'s door, closed)');
  // (from the landing the first flight's head is the roof's steps' foot: docs/house-plan.md Phase 3)
  assert.ok(!homeWall(bx, z1 + 0.1, RW, up), 'the second flight\'s head, open');
  for (let z = spine[1] + 0.1; z < spine[3]; z += 0.2) assert.ok(homeWall((spine[0] + spine[2]) / 2, z, 0.05, stairY(ax, z)!), `across the spine at ${z}`);
  assert.ok(stairRails(SLAB_Y + 0.6).every((r) => !overlap(r, half)), 'the half landing open across, for the turn');
  // On the stair the camera's ceiling is the landing's (the room's is open over the well), and the roof's steps
  // overhead are kept clear of it as they climb over the first flight
  for (const [x, z] of [...path.filter((_, i) => i % 4 === 0)]) {
    const y = stairY(x, z);
    if (y === null) continue;
    const over = homeCamera(y).filter((c) => c[5] > y && x > c[0] && x < c[2] && z > c[1] && z < c[3]);
    assert.ok(over.length && Math.min(...over.map((c) => c[5])) - y > 1, `room over his head at ${x.toFixed(2)}, ${z.toFixed(2)}`);
  }
  const steps = ROOF_STEPS.rect;
  assert.ok(within(steps, well) && steps[0] >= a[0] - 0.1, 'the roof\'s steps over the first flight, in the well');
  // The stair's window over the half landing, in the front wall, over its floor and under the room's ceiling
  assert.ok(win.x0 > x0 && win.x1 < x1 && win.y0 > UP_Y / 2 && win.y1 <= CEIL - 0.05);
  for (const w of ROOM_WINDOWS) assert.ok(w.x1 < x0 || w.x0 > x1 || w.z > z1, 'the room\'s windows clear of the stair hall');
});

test('the den\'s and the roof\'s steps, walked (docs/house-plan.md Phase 3): down through the den\'s door under the stair, round and down to the basement; up from the landing through the hatch onto the terrace', () => {
  const { well, a, b, half, spine } = STAIR;
  const [x0, z0, , z1] = well;
  const RW = 0.17;
  const [ax, bx, hz] = [(a[0] + a[2]) / 2, (b[0] + b[2]) / 2, (half[1] + half[3]) / 2];
  // (as walk.ts does: the ground under him asked from a little over his feet, his walls by his floor: the house's,
  // or the terrace's up on the roof)
  const walk = (pts: [number, number][], from: number) => {
    let y = from;
    for (const [x, z] of pts) {
      const g = homeFloorY(x, z, y + 0.3) ?? SLAB_Y;
      assert.ok(Math.abs(g - y) < 0.06, `a step of ${(g - y).toFixed(2)} at ${x.toFixed(2)}, ${z.toFixed(2)}`);
      y = g;
      const wall = onRoof(x, z, y) ? roofWall(x, z, RW) : homeWall(x, z, RW, y);
      assert.ok(!wall, `stopped at ${x.toFixed(2)}, ${z.toFixed(2)}, ${(y - SLAB_Y).toFixed(2)} up`);
    }
    return y;
  };
  // The den's steps: under the stair, the same flights turned the same way, from the room's floor at the door down to
  // the basement's at the first flight's foot, as gentle as the stair
  assert.deepEqual([DEN_STEPS.b, DEN_STEPS.half, DEN_STEPS.a], [b, half, a]);
  assert.ok(Math.abs(denY(bx, z1)! - SLAB_Y) < 1e-9 && Math.abs(denY(bx, hz)! - (SLAB_Y + BASE_Y / 2)) < 1e-9 && Math.abs(denY(ax, z1)! - (SLAB_Y + BASE_Y)) < 1e-9);
  assert.ok(-BASE_Y / 2 / (a[3] - a[1]) <= UP_Y / 2 / (a[3] - a[1]) + 0.01, 'no steeper than the stair');
  const [d0, d1] = DEN_STEPS.door;
  assert.ok(d0 <= b[0] + 1e-9 && d1 >= b[2] - 1e-9, 'the den\'s doorway the second flight\'s whole width');
  // (so whoever comes up along either wall walks straight out: no jamb to stop him)
  for (const x of [b[0] + RW + 0.002, b[2] - RW - 0.002]) {
    const up: [number, number][] = [];
    for (let z = hz; z < z1 + 0.6; z += 0.04) up.push([x, z]);
    assert.equal(walk(up, denY(x, hz)!), SLAB_Y, 'up along the wall and out of the den\'s doorway');
  }
  const den: [number, number][] = [];
  for (let z = z1 + 0.6; z > hz; z -= 0.04) den.push([bx, z]);
  for (let x = bx; x < ax; x += 0.04) den.push([x, hz]);
  for (let z = hz; z < z1 + 0.8; z += 0.04) den.push([ax, z]);
  assert.equal(walk(den, SLAB_Y), SLAB_Y + BASE_Y, 'down in the den');
  assert.equal(walk([...den].reverse(), SLAB_Y + BASE_Y), SLAB_Y, 'and up in the room again');
  // ...the stair over them as it was (up the first flight from the room, and on the second flight his floor is its)
  assert.equal(homeFloorY(ax, z1 - 0.1, SLAB_Y + 0.3), stairY(ax, z1 - 0.1));
  assert.equal(homeFloorY(bx, hz + 1, stairY(bx, hz + 1)! + 0.3), stairY(bx, hz + 1));
  // Its walls: from the room, the second flight's back but for the door; from the basement, closed under the second
  // flight and the well's west side, the first flight's foot open; the spine between the flights all the way down
  for (const x of [b[0] + 0.05, b[2] - 0.05]) assert.ok(homeWall(x, z1 + 0.1, RW, SLAB_Y), `beside the door at ${x}`);
  assert.ok(!homeWall(bx, z1 + 0.1, RW, SLAB_Y), 'through the door');
  const base = SLAB_Y + BASE_Y;
  assert.ok(homeWall(bx, z1 + 0.1, RW, base) && !homeWall(ax, z1 + 0.1, RW, base), 'from the basement, the first flight\'s foot');
  for (let z = z0 + 0.2; z < z1; z += 0.2) assert.ok(homeWall(x0 - 0.1, z, RW, base), `into the well from the den at ${z}`);
  for (let z = spine[1] + 0.1; z < spine[3]; z += 0.2) assert.ok(homeWall((spine[0] + spine[2]) / 2, z, 0.05, denY(ax, z)!), `across the spine at ${z}`);
  // The roof's steps: from the landing's floor over the first flight to a platform at the roof's in the hatch
  const [sx0, sz0, sx1, sz1] = ROOF_STEPS.rect;
  const sx = (sx0 + sx1) / 2 + 0.05;
  assert.ok(Math.abs(roofStepY(sx, sz1)! - (SLAB_Y + UP_Y)) < 1e-9 && roofStepY(sx, sz0 + 0.1) === SLAB_Y + ROOF_Y);
  assert.ok(sz0 > HATCH[1] + HATCH_KERB && HATCH_WAY[1] - HATCH_WAY[0] >= 2 * RW + 0.15 && HATCH_WAY[0] < sz0 + ROOF_STEPS.top, 'the way out beside the platform');
  const roofWay: [number, number][] = [];
  for (let z = sz1 + 0.5; z > sz0 + 0.2; z -= 0.04) roofWay.push([sx, z]);
  for (let x = sx; x > HATCH[0] - 0.8; x -= 0.04) roofWay.push([x, sz0 + 0.2]);
  assert.equal(walk(roofWay, SLAB_Y + UP_Y), SLAB_Y + ROOF_Y, 'out on the terrace');
  assert.equal(walk([...roofWay].reverse(), SLAB_Y + ROOF_Y), SLAB_Y + UP_Y, 'and down on the landing again');
  // ...steep, as a roof's steps are, but walkable
  assert.ok((ROOF_Y - UP_Y) / (sz1 - sz0 - ROOF_STEPS.top) < 0.85);
  // Its walls: their sides up over the well from the landing; on the roof, the hatch's kerb but at the way out
  for (let z = sz0 + 0.5; z < sz1 - 0.2; z += 0.2) {
    const y = roofStepY(sx, z)!;
    const wall = (x: number) => (onRoof(x, z, y) ? roofWall(x, z, RW) : homeWall(x, z, RW, y));
    assert.ok(wall(sx0 - 0.12) && wall(sx1 + 0.05), `off the steps\' sides at ${z.toFixed(2)}`);
  }
  for (let z = HATCH[1]; z < HATCH[3]; z += 0.1) if (z < HATCH_WAY[0] || z > HATCH_WAY[1]) assert.ok(roofWall(HATCH[0] - 0.1, z, RW), `into the hatch at ${z.toFixed(2)}`);
  for (let x = HATCH[0]; x < HATCH[2]; x += 0.1) for (const z of [HATCH[1] - 0.1, HATCH[3] + 0.1]) assert.ok(roofWall(x, z, RW), `into the hatch at ${x.toFixed(2)}`);
  // On every step of the way the camera has room over his head (the stair's flights over the den's steps, the ceiling
  // and the roof but over the hatch)
  const headroom = (pts: [number, number][], from: number) => {
    let y = from;
    for (const [x, z] of pts) {
      y = homeFloorY(x, z, y + 0.3) ?? SLAB_Y;
      const over = homeCamera(y).filter((c) => c[5] > y && x > c[0] && x < c[2] && z > c[1] && z < c[3]);
      if (over.length) assert.ok(Math.min(...over.map((c) => c[5])) - y > 1, `room over his head at ${x.toFixed(2)}, ${z.toFixed(2)}, ${(y - SLAB_Y).toFixed(2)} up`);
      // (up on the roof the camera's box is the house under the parapet's top, his feet in it, as all over the terrace)
      const under = homeCamera(y).filter((c) => c[4] > y + 0.02 && c[5] < y && x > c[0] && x < c[2] && z > c[1] && z < c[3]);
      if (homeLevel(y) !== 'roof') assert.equal(under.length, 0, `the camera's floor through him at ${x.toFixed(2)}, ${z.toFixed(2)}`);
    }
  };
  headroom(den, SLAB_Y);
  headroom(roofWay, SLAB_Y + UP_Y);
  // There are no fades left in the house but its doors out
  assert.ok(HOME_PORTALS.every((p) => p.level === 'room'));
});

test('the polish (docs/interior-plan.md Phase 5): a tall plant in the lounge, the bedroom and on the landing, each in its corner, clear of the rest, the curtains and the doorways', () => {
  const { BED_DOOR, BATH_DOOR, BATH_Z, DRESS_X } = houseRooms(HOUSE_GEO);
  const tall = (list: readonly { kind: string; rect: readonly number[]; h: number }[]) => list.filter((f) => f.kind === 'plant' && f.h >= 0.9);
  const [lounge] = tall(FURNITURE);
  const up = tall(UPSTAIRS);
  assert.equal(tall(FURNITURE).length, 1);
  assert.equal(up.length, 2);
  // (the lounge's in the front corner west of the window, clear of everything, of the curtains drawn or open, of the wake spot)
  assert.ok(within(lounge.rect, [ROOM[0], ROOM[1], ROOM[0] + 0.5, ROOM[1] + 0.6]), 'in the corner');
  for (const f of FURNITURE) if (f !== lounge) assert.ok(!overlap(f.rect, lounge.rect), `on the ${f.kind}`);
  for (const k of [0, 1]) for (const p of curtainPanels(k)) assert.ok(!overlap(p, lounge.rect, -0.02), 'in the curtains');
  assert.ok(!inRect(lounge.rect, HOME_WAKE.x, HOME_WAKE.z, 0.5));
  // (upstairs: apart from the rest, out of every doorway)
  for (const p of up) {
    for (const u of UPSTAIRS) if (u !== p) assert.ok(!overlap(u.rect, p.rect), `on the ${u.kind}`);
    const LAND_X = ROOM[2] - 2.6;
    const ways = [...UP_DOORS.map(([a, c]) => [LAND_X - 0.6, a, LAND_X + 0.6, c]), [DRESS_X - 0.6, BED_DOOR[0], DRESS_X + 0.6, BED_DOOR[1]], [BATH_DOOR[0], BATH_Z - 0.6, BATH_DOOR[1], BATH_Z + 0.7]];
    for (const w of ways) assert.ok(!overlap(p.rect, w), `in a doorway at ${w.map((v) => v.toFixed(2))}`);
  }
});

test('the benchmark has a view of the compound, from the Close down its line, looking at his land', () => {
  const v = BENCH_VIEWS.find((b) => b.id === 'ends-home')!;
  assert.ok(v, 'the view is there');
  const [x, y, z] = v.pos;
  assert.ok(!SOLIDS.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3]), 'the camera stands in nothing');
  assert.ok(y > SLAB_Y + 1 && y < SLAB_Y + 6, 'near eye level');
  assert.ok(Math.abs(z - ROAD_Z) < ROAD_HALF + 3, 'on the High Road by the gates');
  const [tx, , tz] = v.target;
  assert.ok(onHome(tx, tz), 'looking at his land');
  assert.ok(Math.hypot(tx - x, tz - z) < 40);
});

test('the roof terrace: up from the landing to the roof inside its rail, the house under it; each floor its own ground, walls and prompts', () => {
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
  // The ground: the roof when he's up there (a jump too), the room's floor (the plot's own) when he's down there
  assert.equal(homeFloorY(mx, mz, roof), roof);
  assert.equal(homeFloorY(mx, mz, roof + 1.2), roof);
  assert.equal(homeFloorY(mx, mz, SLAB_Y), null);
  assert.equal(homeFloorY(HOME_SPAWN.x, HOME_SPAWN.z, roof), null);
  // The rail: nowhere on the roof past the terrace's edge, all the way round
  const R = 0.14;
  for (let x = hx0; x <= hx1; x += 0.25) for (const z of [hz0 + 0.1, hz1 - 0.1]) assert.ok(roofWall(x, z, R), `over the edge at ${x}, ${z}`);
  for (let z = hz0; z <= hz1; z += 0.25) for (const x of [hx0 + 0.1, hx1 - 0.1]) assert.ok(roofWall(x, z, R), `over the edge at ${x}, ${z}`);
  // What stands on it: on the terrace, apart; the hatch over the roof's steps, over the stair's well
  for (const t of ROOF_THINGS) assert.ok(within(t.rect, TERRACE, 1e-9) && t.h > 0 && t.h < 0.8, `${t.kind} off the terrace`);
  for (let i = 0; i < ROOF_THINGS.length; i++) for (let j = i + 1; j < ROOF_THINGS.length; j++) assert.ok(!overlap(ROOF_THINGS[i].rect, ROOF_THINGS[j].rect), `${ROOF_THINGS[i].kind} on ${ROOF_THINGS[j].kind}`);
  assert.ok(within(HATCH, STAIR.well) && ROOF_STEPS.rect[0] > HATCH[0] && ROOF_STEPS.rect[2] < HATCH[2] && ROOF_STEPS.rect[1] > HATCH[1] && ROOF_STEPS.rect[1] < HATCH[3], 'the hatch over the well, the steps up through it');
  assert.deepEqual(ROOF_THINGS[0], { kind: 'hatch', rect: HATCH, h: ROOF_THINGS[0].h });
  // Out of the hatch onto the terrace by the steps' head (docs/house-plan.md Phase 3: walked, the next test), and from
  // there he can walk to everything on it and the front rail (a flood over the terrace)
  const out = { x: HATCH[0] - 0.35, z: (HATCH_WAY[0] + HATCH_WAY[1]) / 2 };
  assert.ok(!roofWall(out.x, out.z, R) && homeFloorY(out.x, out.z, roof) === roof, 'he steps out onto the terrace');
  const step = 0.1;
  const seen = new Set<string>();
  const start: [number, number] = [Math.round((out.x - TERRACE[0]) / step), Math.round((out.z - TERRACE[1]) / step)];
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
  // (but the hatch is walked into only by its way out, at the steps' head)
  for (const k of seen) {
    const [px, pz] = at(...(k.split(',').map(Number) as [number, number]));
    if (px > HATCH[0] + HATCH_KERB && px < HATCH[2] && pz > HATCH[1] && pz < HATCH[3]) assert.ok(roofStepY(px, pz) !== null || (pz > HATCH_WAY[0] && pz < HATCH_WAY[1]), `into the hatch at ${px.toFixed(2)}, ${pz.toFixed(2)}`);
  }
  // (the front corner by the rail, and the back rail between the planters)
  assert.ok(reach(TERRACE[0] + 0.3, TERRACE[1] + 0.3, 0.3) && reach((TERRACE[0] + TERRACE[2]) / 2, TERRACE[3] - 0.3, 0.3), 'front to back');
  // Each floor shows its own prompts: on the terrace none; in the room and the yard, theirs
  assert.deepEqual(homePlaces(roof).map((p) => p.id), []);
  const low = homePlaces(SLAB_Y).map((p) => p.id);
  assert.deepEqual(low, ['home:in', 'home:out', 'home:yard', 'home:back']);
  // The camera's boxes on the roof are the whole house under the parapet's top but the hatch, so the camera stays
  // over it up there
  const boxes = homeCamera(roof).slice(0, 4);
  for (const box of boxes) assert.ok(roof < box[4] && roof + 1 > box[4] && !overlap(box, HATCH));
  const area = (r: readonly number[]) => (r[2] - r[0]) * (r[3] - r[1]);
  assert.ok(Math.abs(boxes.reduce((t, b) => t + area(b), 0) + area(HATCH) - (hx1 - hx0) * (hz1 - hz0)) < 1e-6, 'all of it');
});

test('the basement (docs/compound-plan.md Phase 4): his trading den under the house, down the steps under the stairs, everything reachable', () => {
  const [hx0, hz0, hx1, hz1] = HOME.house;
  const [mx, mz] = [(hx0 + hx1) / 2, (hz0 + hz1) / 2];
  const floor = SLAB_Y + BASE_Y;
  // Under the room, a room's height, its own floor by height (a jump too), inside the house
  assert.ok(BASE_CEIL < 0 && BASE_CEIL - BASE_Y > 1.1, 'a storey under the room');
  for (const jump of [0, 0.3, 0.55]) assert.equal(homeLevel(floor + jump), 'base');
  assert.ok(inHouse(mx, mz, floor) && !onRoof(mx, mz, floor));
  assert.equal(homeFloorY(mx, mz, floor), floor);
  assert.equal(homeFloorY(mx, mz, floor + 0.5), floor);
  assert.equal(homeFloorY(HOME_SPAWN.x, HOME_SPAWN.z, floor), null, 'not out under the yard');
  // The camera down there: the house over it, and walls round it (the city's don't reach under the ground)
  const cam = homeCamera(floor);
  for (const b of cam.slice(0, 4)) assert.ok(b[5] === SLAB_Y + BASE_CEIL && !overlap(b, STAIR.well), 'the ceiling, open over the den\'s steps');
  for (const b of cam.slice(4, 8)) assert.ok(b[5] < floor && b[4] >= SLAB_Y, 'from under the floor to the ground');
  // What stands in it: inside the walls, apart, low enough
  for (const u of BASEMENT) {
    assert.ok(within(u.rect, ROOM, 1e-9), `${u.kind} through a wall`);
    assert.ok(u.h > 0 && u.h <= BASE_CEIL - BASE_Y + 1e-9);
  }
  for (let i = 0; i < BASEMENT.length; i++) for (let j = i + 1; j < BASEMENT.length; j++) assert.ok(!overlap(BASEMENT[i].rect, BASEMENT[j].rect), `${BASEMENT[i].kind} on ${BASEMENT[j].kind}`);
  // Nothing stands in the stair's well, where the den's steps come down (docs/house-plan.md Phase 3)
  for (const u of BASEMENT) assert.ok(!overlap(u.rect, STAIR.well), `the ${u.kind} on the den's steps`);
  // From the den's steps' foot he can walk up to everything (a flood over the floor)
  const step = 0.1;
  const key = (i: number, j: number) => `${i},${j}`;
  const at = (i: number, j: number): [number, number] => [ROOM[0] + i * step, ROOM[1] + j * step];
  const foot = { x: (DEN_STEPS.a[0] + DEN_STEPS.a[2]) / 2, z: STAIR.well[3] + 0.3 };
  const first: [number, number] = [Math.round((foot.x - ROOM[0]) / step), Math.round((foot.z - ROOM[1]) / step)];
  assert.ok(!homeWall(...at(...first), R, floor), 'he arrives somewhere he can stand');
  const seen = new Set([key(...first)]);
  const queue = [first];
  while (queue.length) {
    const [i, j] = queue.pop()!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n: [number, number] = [i + di, j + dj];
      if (seen.has(key(...n)) || homeWall(...at(...n), R, floor)) continue;
      seen.add(key(...n));
      queue.push(n);
    }
  }
  const reach = (x: number, z: number, r: number) => [...seen].some((k) => { const [px, pz] = at(...(k.split(',').map(Number) as [number, number])); return Math.hypot(px - x, pz - z) < r; });
  for (const u of BASEMENT) {
    if (u.kind === 'barshelf') continue;
    const [x0, z0, x1, z1] = u.rect;
    assert.ok(reach((x0 + x1) / 2, (z0 + z1) / 2, Math.max(x1 - x0, z1 - z0) / 2 + 0.5), `${u.kind} can't be walked up to`);
  }
  // Its prompt: the stash at the vault (docs/interior-plan.md Phase 1: in the north wall, reachable)
  assert.deepEqual(homePlaces(floor).map((p) => p.id), ['home:stash']);
  const vault = BASEMENT.find((u) => u.kind === 'vault')!.rect;
  const stash = HOME_USES.find((u) => u.id === 'home:stash')!;
  assert.ok(Math.abs(vault[1] - ROOM[1]) < 1e-9 && vault[3] - vault[1] < 0.15, 'the vault set in the north wall');
  assert.ok(reach(stash.x, stash.z, 0.15) && stash.z > vault[3] && stash.z - vault[3] < 0.5, 'its prompt in front of it');
  // (the way into the den from the steps' foot is clear, as the smoke test walks it: south off them, then west)
  for (let z = foot.z; z < foot.z + 0.4; z += 0.1) assert.ok(!homeWall(foot.x, z, R + 0.02, floor), `the way off the steps at ${z}`);
  for (let x = foot.x; x > foot.x - 1.6; x -= 0.1) assert.ok(!homeWall(x, foot.z + 0.4, R + 0.02, floor), `the way into the den at ${x}`);
});

test('the terrace done up (docs/compound-plan.md Phase 5): the sofa at the front, the telescope, his sign at the east rail facing the Close', () => {
  const at = (k: string) => ROOF_THINGS.find((t) => t.kind === k)!.rect;
  const [tx0, tz0, tx1, tz1] = TERRACE;
  const sofa = at('sofa');
  const table = at('table');
  assert.ok(table[3] <= sofa[1] && sofa[1] - tz0 < 1.2, 'the sofa at the front, the table before it');
  const sign = at('sign');
  assert.ok(Math.abs(sign[2] - tx1) < 1e-9 && sign[1] > tz0 + 1 && sign[3] < tz1 - 1, 'the sign at the east rail, mid-way');
  const scope = at('telescope');
  assert.ok(scope[1] - tz0 < 0.3 && scope[0] - tx0 < 1.5, 'the telescope at the front rail');
  // The way the smoke test walks out of the hatch along the terrace (west, then back) stays clear
  const z = ROOF_STEPS.rect[1] + 0.2;
  for (let x = ROOF_STEPS.rect[0] + 0.25; x > HATCH[0] - 1.6; x -= 0.1) assert.ok(!roofWall(x, z, R), `the way along at ${x}`);
});

test('the loft (docs/compound-plan.md Phase 6): the fire escape up the east side, solid, clear of the side door and the way round to it', () => {
  const [fx0, fz0, fx1, fz1] = FIRE_ESCAPE;
  const [, hz0, hx1, hz1] = HOME.house;
  assert.ok(Math.abs(fx0 - hx1) < 1e-9 && fx1 - fx0 < 0.4, 'against the east wall, narrow');
  assert.ok(fz0 > hz0 && fz1 < HOME.sideDoor[1] - 0.6 && fz1 < hz1, 'along the wall, short of the side door');
  assert.ok(HOME_SOLIDS.some((b) => b[0] === fx0 && b[1] === fz0 && b[2] === fx1 && b[3] === fz1), 'solid');
  const back = HOME_PORTALS.find((p) => p.id === 'home:back')!;
  assert.ok(stands(back.x, back.z), 'the side door\'s prompt clear');
  for (let z = hz0 - 1; z < HOME.sideDoor[1]; z += 0.1) assert.ok(stands(hx1 + 0.5, z), `the way round to the side door at ${z}`);
  assert.ok(!overlap(FIRE_ESCAPE, HOME.lawns[1]), 'off the lawn');
});

test('the gates (docs/compound-plan.md Phase 6b): the gatehouse inside them and the leaf slid open along the wall, solid, the way in clear', () => {
  const [, , px1] = PLOT;
  for (const [r, h, what] of [[GATEHOUSE, GATEHOUSE_H, 'the gatehouse'], [GATE_LEAF, GATE_LEAF_H, 'the gate\'s leaf']] as [Rect, number, string][]) {
    assert.ok(within(r, HOME.inner, 1e-9), `${what} inside the wall`);
    assert.ok(HOME_SOLIDS.some((b) => b[0] === r[0] && b[1] === r[1] && b[2] === r[2] && b[3] === r[3] && b[4] === SLAB_Y + h), `${what} solid`);
    assert.ok(r[3] < GATES.z0 - PIER.w || r[1] > GATES.z1 + PIER.w, `${what} out of the gates' opening`);
    assert.ok(h < WALL_H + 0.1, `${what} no taller than the wall`);
    for (const r2 of [HOME.house, HOME.garage, HOME.workshop, ...HOME.lawns, ...PLANTERS]) assert.ok(!overlap(r, r2), `${what} on something`);
    for (const [x, z] of BOLLARDS) assert.ok(!inRect(r, x, z, BOLLARD.r + 0.2), `${what} on a bollard`);
  }
  // The gatehouse by the gates on their south side; the leaf against the wall north of them
  assert.ok(GATEHOUSE[1] > GATES.z1 && GATEHOUSE[2] > px1 - 1 && GATEHOUSE[3] - GATEHOUSE[1] < 2);
  assert.ok(GATE_LEAF[3] < GATES.z0 && px1 - GATE_LEAF[2] < WALL_T + 0.1 && Math.abs(GATE_LEAF[3] - GATE_LEAF[1] - (GATES.z1 - GATES.z0)) < 0.2, 'as long as the gates are wide');
  // The way in: the Close's line and a car's width either side clear from the lane to the garage's doors
  for (let x = px1 + 1; x > HOME.garage[2] + 0.3; x -= 0.25) for (const z of [ROAD_Z - 1.2, ROAD_Z, ROAD_Z + 1.2]) assert.ok(stands(x, z), `the way in at ${x}, ${z}`);
  // The prompts and where you arrive still stand clear
  for (const p of [HOME_GARAGE_DOOR, HOME_WORKSHOP_DOOR, HOME_SPAWN]) assert.ok(stands(p.x, p.z));
});

test('the fountain and the palms (docs/compound-plan.md Phase 6c): in the yard, off the drive, clear of everything and every prompt', () => {
  const things: [string, Rect][] = [
    ['the fountain', [FOUNTAIN.x - FOUNTAIN.r, FOUNTAIN.z - FOUNTAIN.r, FOUNTAIN.x + FOUNTAIN.r, FOUNTAIN.z + FOUNTAIN.r]],
    ...PALMS.map(([x, z], i): [string, Rect] => [`palm ${i}`, [x - PALM_PLANTER.r, z - PALM_PLANTER.r, x + PALM_PLANTER.r, z + PALM_PLANTER.r]]),
  ];
  for (const [what, r] of things) {
    assert.ok(within(r, HOME.inner, 1e-9), `${what} inside the wall`);
    for (const r2 of [HOME.house, HOME.garage, HOME.workshop, ...HOME.lawns, ...PLANTERS, GATEHOUSE, GATE_LEAF, FIRE_ESCAPE]) assert.ok(!overlap(r, r2), `${what} on something`);
    for (const [x, z] of BOLLARDS) assert.ok(!inRect(r, x, z, BOLLARD.r + 0.3), `${what} by a bollard`);
    // (off the drive: the Close's line and a car's width either side, from the gates to the garage)
    assert.ok(r[3] < ROAD_Z - 1.6 || r[1] > ROAD_Z + 1.6, `${what} on the drive`);
  }
  for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) assert.ok(!overlap(things[i][1], things[j][1], -0.4), `${things[i][0]} by ${things[j][0]}`);
  assert.ok(HOME_SOLIDS.filter((b) => b[4] === SLAB_Y + PALM_PLANTER.h).length >= PALMS.length, 'the planters solid');
  // Every prompt, where you arrive and the menu's camera still stand clear, and the ways round
  for (const p of [HOME_GARAGE_DOOR, HOME_WORKSHOP_DOOR, HOME_SPAWN, ...HOME_PORTALS.filter((q) => !inHouse(q.x, q.z) && q.level === 'room'), { x: HOME_VIEW.eye[0], z: HOME_VIEW.eye[2] }]) assert.ok(stands(p.x, p.z), `blocked at ${p.x}, ${p.z}`);
  for (let z = HOME.house[1] - 1; z < HOME.sideDoor[1]; z += 0.1) assert.ok(stands(HOME.house[2] + 0.5, z), 'the way round to the side door');
  for (const z of [CAR_HOME.z, BIKE_HOME.z]) for (let x = CAR_HOME.x; x < HOME.garage[2] + 3; x += 0.2) assert.ok(!solidAt(x, z, 0.3), 'a bay\'s way out');
});

test('the yard\'s trees (docs/garden-plan.md Phase 1): in the yard, off the drive, apart, solid, lower than the palms, every prompt and way clear', () => {
  const T = YARD_TREE;
  const box = ([x, z]: [number, number]): Rect => [x - T.half, z - T.half, x + T.half, z + T.half];
  assert.ok(YARD_TREES.length >= 5);
  const others: Rect[] = [
    HOME.house, HOME.garage, HOME.workshop, ...HOME.lawns, ...PLANTERS, GATEHOUSE, GATE_LEAF, FIRE_ESCAPE,
    [FOUNTAIN.x - FOUNTAIN.r, FOUNTAIN.z - FOUNTAIN.r, FOUNTAIN.x + FOUNTAIN.r, FOUNTAIN.z + FOUNTAIN.r],
    ...PALMS.map(([x, z]): Rect => [x - PALM_PLANTER.r, z - PALM_PLANTER.r, x + PALM_PLANTER.r, z + PALM_PLANTER.r]),
  ];
  for (const t of YARD_TREES) {
    const r = box(t);
    assert.ok(within(r, HOME.inner, 1e-9), `a tree outside the wall at ${t}`);
    for (const o of others) assert.ok(!overlap(r, o, -0.4), `a tree on something at ${t}`);
    for (const [x, z] of BOLLARDS) assert.ok(!inRect(r, x, z, BOLLARD.r + 0.6), `a tree by a bollard at ${t}`);
    // (off the drive: the Close's line and a car's width either side, from the gates to the garage)
    assert.ok(r[3] < ROAD_Z - 1.6 || r[1] > ROAD_Z + 1.6, `a tree on the drive at ${t}`);
    assert.ok(solidAt(t[0], t[1]), 'its planter solid');
  }
  for (let i = 0; i < YARD_TREES.length; i++)
    for (let j = i + 1; j < YARD_TREES.length; j++) assert.ok(Math.hypot(YARD_TREES[i][0] - YARD_TREES[j][0], YARD_TREES[i][1] - YARD_TREES[j][1]) > 2, 'room between them');
  // Low: under the house's eaves and well under the palms (whose crowns stand over 3.2)
  assert.ok(T.top < HOME.eaves - 0.4 && T.top < 3, 'lower than the palms');
  // Every prompt, where you arrive and the menu's camera still stand clear; the ways round; the cars' way out
  for (const p of [HOME_GARAGE_DOOR, HOME_WORKSHOP_DOOR, HOME_SPAWN, ...HOME_PORTALS.filter((q) => !inHouse(q.x, q.z) && q.level === 'room'), { x: HOME_VIEW.eye[0], z: HOME_VIEW.eye[2] }]) assert.ok(stands(p.x, p.z), `blocked at ${p.x}, ${p.z}`);
  for (let z = HOME.house[1] - 1; z < HOME.sideDoor[1]; z += 0.1) assert.ok(stands(HOME.house[2] + 0.5, z), 'the way round to the side door');
  for (const z of [CAR_HOME.z, BIKE_HOME.z]) for (let x = CAR_HOME.x; x < HOME.garage[2] + 3; x += 0.2) assert.ok(!solidAt(x, z, 0.3), 'a bay\'s way out');
  for (let x = HOME.garage[2] + 0.3; x < PLOT[2]; x += 0.3) assert.ok(stands(x, ROAD_Z), `something on the drive at ${x}`);
  // The workshop's door: its way out into the yard clear
  const W = HOME.workshopDoor;
  for (let x = W.x0 + 0.2; x < W.x1; x += 0.2) for (let z = W.z + 0.3; z < W.z + 2; z += 0.2) assert.ok(stands(x, z), `the workshop's way out at ${x}, ${z}`);
});

test('the garden\'s paths (docs/garden-plan.md Phase 2): stepping stones across both lawns to the bench, the back gate, the side door and the cabana; lit beside, nothing in the way', () => {
  const [nw, east] = HOME.lawns;
  const [tx, tz] = [nw[0] + 2.2, nw[1] + 2.4];
  const bench: Rect = [tx + 1.6, tz - 0.7, tx + 2.0, tz + 0.7];
  const keepOff: [string, Rect][] = [['the pool', POOL], ['the cabana', CABANA], ['the bench', bench], ['the tree', [tx - 0.3, tz - 0.3, tx + 0.3, tz + 0.3]], ...LOUNGERS.map((r, i): [string, Rect] => [`lounger ${i}`, r])];
  const stones = pathStones();
  assert.ok(stones.length >= 20);
  for (const st of stones) {
    const half = Math.max(st.w, st.d) / 2;
    assert.ok(inRect(nw, st.x, st.z, -half) || inRect(east, st.x, st.z, -half), `a stone off the lawns at ${st.x}, ${st.z}`);
    for (const [what, r] of keepOff) assert.ok(!inRect(r, st.x, st.z, half + 0.05), `a stone on ${what} at ${st.x}, ${st.z}`);
    assert.ok(stands(st.x, st.z), `something on the path at ${st.x}, ${st.z}`);
  }
  for (let i = 0; i < stones.length; i++)
    for (let j = i + 1; j < stones.length; j++) assert.ok(Math.hypot(stones[i].x - stones[j].x, stones[i].z - stones[j].z) > STONE_SIZE.step * 0.7, 'stones apart');
  // Where they go: the north-west lawn's from the yard's corner to the back gate, past the bench; the east lawn's from
  // the yard down to the side door and on to the cabana's front
  const [a, b] = GARDEN_PATHS;
  const near = (p: readonly number[], x: number, z: number, d: number) => Math.hypot(p[0] - x, p[1] - z) < d;
  assert.ok(near(a[0], nw[2], nw[3], 0.7), 'from the yard');
  assert.ok(near(a[a.length - 1], HOME.backGate.x, (HOME.backGate.z0 + HOME.backGate.z1) / 2, 0.8), 'to the back gate');
  assert.ok(a.some((p) => near(p, bench[2] + 0.5, bench[3] + 0.6, 1)), 'by the bench');
  assert.ok(b[0][1] - east[1] < 0.4, 'from the yard');
  const yard = HOME_PORTALS.find((p) => p.id === 'home:yard')!;
  assert.ok(b.some((p) => near(p, yard.to.x, yard.to.z, 0.8)), 'by the side door');
  assert.ok(near(b[b.length - 1], (CABANA[0] + CABANA[2]) / 2 - 0.5, CABANA[1], 1), 'to the cabana');
  // The lights: beside the stones (never on one), low, solid, on the lawns, off everything, each a pool of light at night
  assert.ok(PATH_LIGHTS.length >= 6 && PATH_LIGHT.h < 0.3);
  for (const [x, z] of PATH_LIGHTS) {
    assert.ok(inRect(nw, x, z, -0.1) || inRect(east, x, z, -0.1), `a light off the lawns at ${x}, ${z}`);
    const d = Math.min(...stones.map((st) => Math.hypot(st.x - x, st.z - z)));
    assert.ok(d > 0.3 && d < 0.8, `a light ${d} from the stones at ${x}, ${z}`);
    for (const [what, r] of keepOff) assert.ok(!inRect(r, x, z, 0.3), `a light by ${what}`);
    assert.ok(solidAt(x, z) && HOME_POOLS.some(([px, pz]) => px === x && pz === z), 'solid, and lit at night');
  }
  // Every prompt and way still clear
  for (const p of [HOME_GARAGE_DOOR, HOME_WORKSHOP_DOOR, HOME_SPAWN, ...HOME_PORTALS.filter((q) => !inHouse(q.x, q.z) && q.level === 'room'), { x: HOME_VIEW.eye[0], z: HOME_VIEW.eye[2] }]) assert.ok(stands(p.x, p.z), `blocked at ${p.x}, ${p.z}`);
  for (let z = HOME.house[1] - 1; z < HOME.sideDoor[1]; z += 0.1) assert.ok(stands(HOME.house[2] + 0.5, z), 'the way round to the side door');
  for (let x = yard.to.x; x < (CABANA[0] + CABANA[2]) / 2; x += 0.1) assert.ok(stands(x, POOL[3] + 0.4) || x > CABANA[0], `the way along the pool's south side at ${x}`);
  for (let z = HOME.backGate.z0 + 0.2; z < HOME.backGate.z1 - 0.2; z += 0.1) for (let x = HOME.backGate.x + 0.6; x < HOME.backGate.x + 1.5; x += 0.1) assert.ok(stands(x, z), `the back gate's way in at ${x}, ${z}`);
});

test('the pool and the cabana (docs/compound-plan.md Phase 6d): on the east lawn, apart, solid, the way round to the side door clear', () => {
  const lawn = HOME.lawns[1];
  const things: [string, Rect][] = [['the pool', POOL], ['the cabana', CABANA], ...LOUNGERS.map((r, i): [string, Rect] => [`lounger ${i}`, r])];
  for (const [what, r] of things) {
    assert.ok(within(r, lawn, 1e-9), `${what} on the east lawn`);
    for (const r2 of [HOME.house, FIRE_ESCAPE, GATEHOUSE]) assert.ok(!overlap(r, r2), `${what} on something`);
  }
  for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) assert.ok(!overlap(things[i][1], things[j][1]), `${things[i][0]} on ${things[j][0]}`);
  assert.ok(within(CABANA_SOFA, CABANA, 1e-9) && CABANA_POSTS.every(([x, z]) => inRect(CABANA, x, z)), 'the sofa and posts in the cabana');
  // Solid, the pool and the loungers; the cabana open under its roof between its posts
  assert.ok(solidAt((POOL[0] + POOL[2]) / 2, (POOL[1] + POOL[3]) / 2) && LOUNGERS.every((r) => solidAt((r[0] + r[2]) / 2, (r[1] + r[3]) / 2)));
  assert.ok(stands((CABANA[0] + CABANA[2]) / 2, CABANA[1] + 0.4), 'room under the cabana\'s roof');
  // The way from the side door out onto the lawn, round the house's end to the yard, and to the cabana
  const back = HOME_PORTALS.find((p) => p.id === 'home:back')!;
  assert.ok(stands(back.x, back.z) && stands(back.to.x, back.to.z));
  for (let z = HOME.house[1] - 1; z < HOME.sideDoor[1]; z += 0.1) assert.ok(stands(HOME.house[2] + 0.5, z), 'the way round to the side door');
  for (let x = back.x; x < (CABANA[0] + CABANA[2]) / 2; x += 0.1) assert.ok(stands(x, POOL[3] + 0.4) || x > CABANA[0], `the way along the pool's south side at ${x}`);
});

test('the helipad (docs/compound-plan.md Phase 6e): on the garage\'s roof, inside its edges, low', () => {
  const [gx0, gz0, gx1, gz1] = HOME.garage;
  assert.ok(HELIPAD.x - HELIPAD.r > gx0 && HELIPAD.x + HELIPAD.r < gx1 && HELIPAD.z - HELIPAD.r > gz0 && HELIPAD.z + HELIPAD.r < gz1, 'on the roof');
  assert.ok(SLAB_Y + HOME.garageTop + 1 < 6, 'under the Emporium, with its windsock');
});
