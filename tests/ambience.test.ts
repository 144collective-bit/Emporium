// The sound follows the district you're in (ambience.ts, growth plan Phase 8): the beat at the Emporium, the hum in
// town and wind out of it, the river by the water, traffic by the highway and the avenues; every layer 0-1 everywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ambienceAt } from '../src/scripts/city3d/ambience';
import { DOORS } from '../src/scripts/city3d/solids';
import { EXT, RIVER, NS_ROADS } from '../src/scripts/city3d/layout';
import { HIGHWAY_BOX } from '../src/scripts/city3d/highway';
import { CLUB } from '../src/scripts/city3d/avenue';
import { LAKE_C, lakeR } from '../src/scripts/city3d/westlake';

test('every layer stays between 0 and 1 across the world', () => {
  for (let x = EXT[0]; x <= EXT[1]; x += 23)
    for (let z = EXT[0]; z <= EXT[1]; z += 23) {
      const a = ambienceAt(x, z);
      for (const [k, v] of Object.entries(a)) assert.ok(v >= 0 && v <= 1 && Number.isFinite(v), `${k} at ${x}, ${z}: ${v}`);
    }
});

test('the beat is the Emporium’s, the hum the town’s, the wind the open land’s', () => {
  const e = DOORS.find((d) => d.id === 'emporium')!;
  const at = ambienceAt(e.x, e.z + 2);
  assert.ok(at.beat > 0.9 && at.city === 1 && at.open === 0);
  const far = ambienceAt(EXT[0] + 20, EXT[0] + 20);
  assert.equal(far.beat, 0);
  assert.ok(far.city < 0.05 && far.open > 0.95);
});

test('the river by the water, traffic by the highway and the avenues', () => {
  assert.ok(ambienceAt(30, (RIVER[0] + RIVER[1]) / 2).water === 1);
  assert.ok(ambienceAt(30, RIVER[0] - 60).water === 0);
  // On the highway's north side, and in the middle of a block far from any road
  assert.ok(ambienceAt((HIGHWAY_BOX[0] + HIGHWAY_BOX[2]) / 2, HIGHWAY_BOX[1]).road > 0.95);
  assert.ok(ambienceAt(NS_ROADS[NS_ROADS.length - 1].c, 40).road >= 0.55);
  assert.ok(ambienceAt(EXT[0] + 20, EXT[0] + 20).road === 0);
});

test("Club PULSE's beat by its door on Trench Avenue, none across town", () => {
  assert.ok(ambienceAt(CLUB.spot.x, CLUB.spot.z).club > 0.95);
  assert.ok(ambienceAt(CLUB.door.x + 15, CLUB.door.z + 4).club > 0.2, 'down the avenue');
  const e = DOORS.find((d) => d.id === 'emporium')!;
  assert.equal(ambienceAt(e.x, e.z).club, 0);
  assert.ok(ambienceAt(CLUB.spot.x, CLUB.spot.z, 120).club < 0.05, 'high over it, a wash');
});

test('Westlake Park: birds on its land, the lake lapping by the water', () => {
  const mid = ambienceAt(LAKE_C[0] - 40, LAKE_C[1] - 30);
  assert.ok(mid.park > 0.95, 'birds in the park');
  assert.ok(ambienceAt(LAKE_C[0], LAKE_C[1] - lakeR(-Math.PI / 2) - 3).water > 0.7, 'the lake by its shore');
  assert.ok(ambienceAt(LAKE_C[0] - 60, LAKE_C[1] - 70).water < 0.1, 'none far from it');
  const e = DOORS.find((d) => d.id === 'emporium')!;
  assert.equal(ambienceAt(e.x, e.z).park, 0);
});

test('Uptown: a quieter hum, the plaza\'s fountain by its pool and water wall, the circle\'s traffic round it', async () => {
  const { CENTRE, POOL, WATER_WALL, WALL_RUNS } = await import('../src/scripts/city3d/plaza');
  const { CIRCLE, UPTOWN_RECT } = await import('../src/scripts/city3d/uptown');
  const { UPTOWN_HUSH } = await import('../src/scripts/city3d/ambience');
  const pool = ambienceAt(CENTRE[0] + POOL.r + 1, CENTRE[1]);
  assert.ok(pool.fountain > 0.95, `${pool.fountain}`);
  const wall = ambienceAt(WATER_WALL.x - 1, (WALL_RUNS[0][0] + WALL_RUNS[0][1]) / 2);
  assert.ok(wall.fountain > 0.9);
  // None across Uptown, and none from the City view high over the plaza
  assert.equal(ambienceAt(UPTOWN_RECT[0] + 3, UPTOWN_RECT[1] + 3).fountain, 0);
  assert.equal(ambienceAt(CENTRE[0], CENTRE[1], 60).fountain, 0);
  // The hum: quieter deep in Uptown than in town
  const deep = ambienceAt(CIRCLE.x + 12, CIRCLE.z - 12);
  assert.ok(deep.city <= 1 - UPTOWN_HUSH + 1e-9);
  const e = DOORS.find((d) => d.id === 'emporium')!;
  assert.equal(ambienceAt(e.x, e.z + 2).city, 1);
  // The circle: its traffic by its ring
  assert.ok(ambienceAt(CIRCLE.x + CIRCLE.r + 1, CIRCLE.z).road >= 0.5);
});

test("Crestmont: its quiet hum and little wind, its birds and crickets, the Drive's fountains; none of it in town", async () => {
  const { CREST_RECT } = await import('../src/scripts/city3d/crestmont');
  const { FOUNTAINS } = await import('../src/scripts/city3d/coral');
  const { CREST_HUM } = await import('../src/scripts/city3d/ambience');
  const mid = ambienceAt((CREST_RECT[0] + CREST_RECT[2]) / 2, (CREST_RECT[1] + CREST_RECT[3]) / 2);
  assert.ok(mid.crest > 0.95, 'Crestmont on its land');
  assert.ok(mid.city >= CREST_HUM - 1e-9 && mid.city < 0.6, `its hum ${mid.city}`);
  assert.ok(mid.open < 0.3, 'little wind');
  const f = FOUNTAINS[FOUNTAINS.length - 1];
  assert.ok(ambienceAt(f.x + f.r + 0.5, f.z).fountain > 0.7, "the piazza's fountain");
  const e = DOORS.find((d) => d.id === 'emporium')!;
  assert.equal(ambienceAt(e.x, e.z).crest, 0);
});

test("Sunridge: its quiet hum, its sprinklers and crickets (the suburb layer); none of it in town or in Crestmont", async () => {
  const { SUNRIDGE_RECT } = await import('../src/scripts/city3d/sunridge');
  const { CREST_RECT } = await import('../src/scripts/city3d/crestmont');
  const { SUN_HUM } = await import('../src/scripts/city3d/ambience');
  const mid = ambienceAt((SUNRIDGE_RECT[0] + SUNRIDGE_RECT[2]) / 2, (SUNRIDGE_RECT[1] + SUNRIDGE_RECT[3]) / 2 - 20);
  assert.ok(mid.suburb > 0.95, `Sunridge on its land: ${mid.suburb}`);
  assert.ok(mid.city >= SUN_HUM - 1e-9 && mid.city < 0.6, `its hum ${mid.city}`);
  assert.ok(mid.open < 0.3, 'little wind');
  assert.equal(mid.crest, 0, "not Crestmont's");
  const e = DOORS.find((d) => d.id === 'emporium')!;
  assert.equal(ambienceAt(e.x, e.z).suburb, 0);
  assert.equal(ambienceAt((CREST_RECT[0] + CREST_RECT[2]) / 2, (CREST_RECT[1] + CREST_RECT[3]) / 2).suburb, 0);
});

// The polish pass's sound phase (docs/polish-plan.md theme 3): no built-up part reads as open country, and the
// places with a sound of their own have a layer
test("the hum reaches every built-up part: Uptown hushed, the mall, the Docks, the airport, the kart park and the stadium; open land is open", async () => {
  const { HUMS, UPTOWN_HUSH } = await import('../src/scripts/city3d/ambience');
  const { TOWER_SPAWN } = await import('../src/scripts/city3d/skydeck');
  const { INSIDE_SPAWN } = await import('../src/scripts/city3d/mallinside');
  const { HM_SPAWN } = await import('../src/scripts/city3d/docksport');
  const { AIR_SPAWN } = await import('../src/scripts/city3d/airfield');
  const { KART_SPAWN } = await import('../src/scripts/city3d/kartpark');
  const { STADIUM_SPAWN } = await import('../src/scripts/city3d/stadium');
  const band = (name: string, x: number, z: number, lo: number, hi: number) => {
    const a = ambienceAt(x, z, 0, 0);
    assert.ok(a.city >= lo - 1e-9 && a.city <= hi + 1e-9, `${name}'s hum ${a.city} (${lo}-${hi})`);
    assert.ok(a.open <= 1 - lo + 1e-9, `${name}'s wind ${a.open}`);
  };
  // Uptown Circle and the spire's spawn: Uptown's hushed hum, not zero and not the town's full one
  band('Uptown Circle', -176, 30, 1 - UPTOWN_HUSH - 0.05, 1 - UPTOWN_HUSH);
  band("the spire's spawn", TOWER_SPAWN.x, TOWER_SPAWN.z, 1 - UPTOWN_HUSH - 0.05, 1 - UPTOWN_HUSH);
  band("the mall's hall", INSIDE_SPAWN.x, INSIDE_SPAWN.z, HUMS.mall.level - 0.05, 1);
  band('the Docks', HM_SPAWN.x, HM_SPAWN.z, HUMS.docks.level - 0.05, 1);
  band('the airport', AIR_SPAWN.x, AIR_SPAWN.z, HUMS.airport.level - 0.05, 1);
  band("the kart park's gate", KART_SPAWN.x, KART_SPAWN.z, HUMS.karts.level - 0.05, 1);
  band("the stadium's forecourt", STADIUM_SPAWN.x, STADIUM_SPAWN.z, HUMS.stadium.level - 0.05, 1);
  // The stadium's crowd (the polish plan's Phase 7): on a match night only, round the ground, not across town
  const { matchOn } = await import('../src/scripts/city3d/stadium');
  const night = new Date(2026, 10, 11, 19, 30).getTime() / 1000;
  const noon = new Date(2026, 10, 11, 12).getTime() / 1000;
  assert.ok(matchOn(night * 1000) && !matchOn(noon * 1000));
  assert.ok(ambienceAt(STADIUM_SPAWN.x, STADIUM_SPAWN.z, 0, night).stadium > 0.9);
  assert.equal(ambienceAt(STADIUM_SPAWN.x, STADIUM_SPAWN.z, 0, noon).stadium, 0);
  assert.equal(ambienceAt(30, 30, 0, night).stadium, 0, 'none downtown');
  const { STRIP_RECT } = await import('../src/scripts/city3d/strip');
  const { YARDS_RECT } = await import('../src/scripts/city3d/southfield');
  band('the Neon Mile', (STRIP_RECT[0] + STRIP_RECT[2]) / 2, (STRIP_RECT[1] + STRIP_RECT[3]) / 2, HUMS.strip.level - 0.05, 1);
  band('Southfield Yards', (YARDS_RECT[0] + YARDS_RECT[2]) / 2, (YARDS_RECT[1] + YARDS_RECT[3]) / 2, HUMS.yards.level - 0.05, 1);
  // Open land, far from them all: no hum, all wind, none of the new layers
  for (const [x, z] of [
    [EXT[0] + 20, EXT[0] + 20],
    [600, 600],
  ]) {
    const far = ambienceAt(x, z, 0, 0);
    assert.ok(far.city < 0.02 && far.open > 0.98, `open land at ${x}, ${z}: ${far.city} ${far.open}`);
    for (const k of ['waterfront', 'market', 'docks', 'jets', 'indoor', 'yards', 'karts'] as const) assert.equal(far[k], 0, `${k} at ${x}, ${z}`);
  }
});

test('the waterfront: gulls along the boardwalk, Pier 7, the market deck (its murmur) and the promenades; none in the plaza', async () => {
  const { BOARDWALK, PIER, MARKET_DECK } = await import('../src/scripts/city3d/waterfront');
  const { PROMENADE } = await import('../src/scripts/city3d/outer');
  const { CENTRE } = await import('../src/scripts/city3d/plaza');
  const mid = (r: readonly number[]) => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as const;
  for (const [name, [x, z]] of [
    ['the boardwalk', mid(BOARDWALK)],
    ["Pier 7's head", mid(PIER.head)],
    ["the market's deck", mid(MARKET_DECK)],
    ['the north promenade', [30, (PROMENADE.north[0] + PROMENADE.north[1]) / 2]],
  ] as const) {
    assert.ok(ambienceAt(x, z, 0, 0).waterfront > 0.95, `${name}: ${ambienceAt(x, z, 0, 0).waterfront}`);
  }
  const market = ambienceAt(...mid(MARKET_DECK), 0, 0);
  assert.ok(market.market > 0.95 && market.city > 0.5, `the market's murmur ${market.market}, its hum ${market.city}`);
  assert.equal(ambienceAt(MARKET_DECK[2] + 40, mid(BOARDWALK)[1], 0, 0).market, 0, 'no market murmur well along the boardwalk');
  const plaza = ambienceAt(CENTRE[0], CENTRE[1], 0, 0);
  assert.equal(plaza.waterfront, 0);
  assert.equal(plaza.market, 0);
  assert.ok(ambienceAt(...mid(BOARDWALK), 150, 0).waterfront < 0.5, 'high over it, a wash');
});

test("the Docks: its layer on its land and none across the river; the airport's jets rise and fade with the timetable", async () => {
  const { DOCKS_RECT } = await import('../src/scripts/city3d/docks');
  const { HM_SPAWN } = await import('../src/scripts/city3d/docksport');
  const { AIR_SPAWN, PERIOD } = await import('../src/scripts/city3d/airfield');
  const { TOWER_SPAWN } = await import('../src/scripts/city3d/skydeck');
  const { jetsAt } = await import('../src/scripts/city3d/ambience');
  assert.equal(ambienceAt(HM_SPAWN.x, HM_SPAWN.z, 0, 0).docks, 1);
  assert.equal(ambienceAt((DOCKS_RECT[0] + DOCKS_RECT[2]) / 2, DOCKS_RECT[1] - 80, 0, 0).docks, 0, 'across the river');
  assert.equal(ambienceAt(TOWER_SPAWN.x, TOWER_SPAWN.z, 0, 0).docks, 0);
  // The jets: over a period at the airport's spawn an airliner's roar comes and goes
  let lo = 1;
  let hi = 0;
  for (let t = 0; t < PERIOD; t += 0.5) {
    const j = jetsAt(AIR_SPAWN.x, AIR_SPAWN.z, t);
    assert.ok(j >= 0 && j <= 1);
    lo = Math.min(lo, j);
    hi = Math.max(hi, j);
  }
  assert.ok(hi > 0.4, `a take-off roars: ${hi}`);
  assert.ok(lo < 0.05, `and fades: ${lo}`);
  assert.equal(ambienceAt(AIR_SPAWN.x, AIR_SPAWN.z, 0, 7).jets, jetsAt(AIR_SPAWN.x, AIR_SPAWN.z, 7));
  for (let t = 0; t < PERIOD; t += 7) assert.equal(jetsAt(TOWER_SPAWN.x, TOWER_SPAWN.z, t), 0, 'none in Uptown');
});

test("Southfield Yards: its compressor on its land, none in the park beside it or in town", async () => {
  const { YARDS_RECT, SOUTHFIELD_RECT } = await import('../src/scripts/city3d/southfield');
  assert.equal(ambienceAt((YARDS_RECT[0] + YARDS_RECT[2]) / 2, (YARDS_RECT[1] + YARDS_RECT[3]) / 2, 0, 0).yards, 1);
  assert.ok(ambienceAt(SOUTHFIELD_RECT[2] - 2, SOUTHFIELD_RECT[3] - 2, 0, 0).yards < 0.5, "the park's far corner");
  const e = DOORS.find((d) => d.id === 'emporium')!;
  assert.equal(ambienceAt(e.x, e.z + 2, 0, 0).yards, 0);
});

test("indoors in the mall's hall (not from over its roof); the kart park's idling engines on its land", async () => {
  const { INSIDE_SPAWN } = await import('../src/scripts/city3d/mallinside');
  const { HALL } = await import('../src/scripts/city3d/mall');
  const { KART_SPAWN, KART_PARK } = await import('../src/scripts/city3d/kartpark');
  const inside = ambienceAt(INSIDE_SPAWN.x, INSIDE_SPAWN.z, 0, 0);
  assert.equal(inside.indoor, 1);
  assert.equal(ambienceAt(INSIDE_SPAWN.x, INSIDE_SPAWN.z, HALL.h + 20, 0).indoor, 0, 'the City view over the roof');
  assert.equal(ambienceAt(HALL.rect[0] - 30, HALL.rect[1], 0, 0).indoor, 0, 'outside, well off the doors');
  assert.equal(ambienceAt(KART_SPAWN.x, KART_SPAWN.z, 0, 0).karts, 1);
  assert.equal(ambienceAt(KART_PARK.x0 - 80, KART_PARK.z0, 0, 0).karts, 0);
  const e = DOORS.find((d) => d.id === 'emporium')!;
  const town = ambienceAt(e.x, e.z + 2, 0, 0);
  assert.equal(town.indoor, 0);
  assert.equal(town.karts, 0);
});

test("Endswood's own: the estate's sounds on its land and just past it; Bunker Sound's beat and St Aldwyn's bell wait for their buildings", () => {
  // (the south re-laid, docs/south-plan.md Phase 1b: the studio and the church come back in Phases 2 and 3)
  const on = ambienceAt(-82, 404, 0, 0);
  assert.ok(on.ends > 0.95 && on.studio === 0 && on.bell === 0);
  assert.ok(ambienceAt(-205, 445, 0, 0).ends > 0.9, 'in the village');
  assert.ok(ambienceAt(-380, 420, 0, 0).ends < 0.5, 'out in the fields');
  // (and none of it downtown)
  const town = ambienceAt(30, 30, 0, 0);
  assert.ok(town.ends === 0 && town.studio === 0 && town.bell === 0);
});

test("in Degen's house the street is shut out (not from over its roof, nor out in his yard)", async () => {
  const { HOME_SPAWN, ROOM, inHouse } = await import('../src/scripts/city3d/home');
  const [x, z] = [(ROOM[0] + ROOM[2]) / 2, (ROOM[1] + ROOM[3]) / 2];
  assert.ok(inHouse(x, z));
  assert.equal(ambienceAt(x, z, 0, 0).home, 1);
  assert.equal(ambienceAt(x, z, 0, 0).indoor, 0, "the mall's murmur isn't his");
  assert.equal(ambienceAt(x, z, 30, 0).home, 0, 'the City view over the roof');
  assert.equal(ambienceAt(HOME_SPAWN.x, HOME_SPAWN.z, 0, 0).home, 0);
});
