// Nothing that exists moves (docs/growth-plan.md): every place, door, pad, lot, spawn, landmark,
// downtown building and street, written down as it stands in tests/fixtures/layout.json. When
// the city grows (tiles, a bigger EXT, new districts), this keeps saves, plots and places where
// they are. A street that runs to the world's edge is written with 'edge' for that end, so the
// edge can move out without moving the street.
//
// Only when the owner moves something on purpose, rewrite the file:
//   UPDATE_SNAPSHOT=1 npm test -- snapshot
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BIG_LOTS, CORE_ROADS, EW_ROADS, EXT, FOOTBRIDGE_X, GARAGE, MARKET, NS_ROADS, RIVER, SEATS, SOUTH_ROAD, SOUTH_ROW, UNITS } from '../src/scripts/city3d/layout';
import { DOORS, GARAGE_SITE, LOT_SITE, MARKET_SITE, RACK, STALL_SPOT, UNIT_SITE, WALK_SPAWN } from '../src/scripts/city3d/solids';
import { DISTRICTS } from '../src/data/plots';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { ALLEYS, DIAGONALS, INFILL, LANES, PARKS, PRACTICE, SQUARE, WATER_TOWER } from '../src/scripts/city3d/downtown';
import { OUTER_PARKS, OUTER_SQUARES, PADS, PARKWAY, SOUTHSIDE } from '../src/scripts/city3d/outer';
import * as AIR from '../src/scripts/city3d/airfield';
import { GATE, KART_PARK, KART_SPAWN, LOOP as KART_LOOP, ROAD as KART_ROAD } from '../src/scripts/city3d/kartpark';
import { BAYS, CIRCUIT, HUT_DOOR, SITE as KART_SITE } from '../src/scripts/city3d/kartcircuit';
import { COUNTER, FIGHT_CLUB, FIGHT_SPAWN, OUT, RING, TRAINER } from '../src/scripts/city3d/fightsite';
import { LIBERTY_SPAWN, SUPPORTS, TOWERS, WALKWAY } from '../src/scripts/city3d/liberty';
import { GATES, GARDEN_SITE, LAKE_C, WESTLAKE_BLOCKS } from '../src/scripts/city3d/westlake';
import { BLOCK as STADIUM_BLOCK, BRIDGE, CENTRE as STADIUM_CENTRE, LOOP as STADIUM_LOOP, ROAD as STADIUM_ROAD } from '../src/scripts/city3d/stadium';

const FILE = join(process.cwd(), 'tests', 'fixtures', 'layout.json');

/** Numbers to 3 places (a millimetre or two), typed arrays to plain ones, the world's edge as 'edge' */
function plain(v: unknown, edge = false): unknown {
  if (typeof v === 'number') {
    if (edge && (v === EXT[0] || v === EXT[1])) return 'edge';
    return Math.round(v * 1000) / 1000 + 0;
  }
  if (ArrayBuffer.isView(v)) return Array.from(v as unknown as ArrayLike<number>, (n) => plain(n, edge));
  if (Array.isArray(v)) return v.map((x) => plain(x, edge));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x !== 'function').map(([k, x]) => [k, plain(x, edge)]));
  return v;
}

/** Every 40th sample of the kart circuit's centre line (every 20 tiles), and its length */
const circuit = { L: CIRCUIT.L, start: CIRCUIT.start, pts: Array.from({ length: Math.ceil(CIRCUIT.x.length / 40) }, (_, i) => [CIRCUIT.x[i * 40], CIRCUIT.z[i * 40]]) };

const layout = () =>
  plain({
    landmarks: SEATS,
    doors: DOORS,
    spawns: { walk: WALK_SPAWN, kart: KART_SPAWN, air: AIR.AIR_SPAWN, fight: FIGHT_SPAWN, liberty: LIBERTY_SPAWN },
    rack: RACK,
    districts: DISTRICTS,
    pads: PADS,
    lots: { garage: GARAGE, market: MARKET, units: UNITS, big: BIG_LOTS },
    garage: GARAGE_SITE,
    market: { ...MARKET_SITE, spot: STALL_SPOT },
    units: UNIT_SITE,
    bigLots: LOT_SITE,
    river: { RIVER, SOUTH_ROAD, SOUTH_ROW },
    roads: { CORE_ROADS, NS_ROADS, EW_ROADS },
    downtown: {
      diagonals: DIAGONALS,
      infill: INFILL.map((f) => ({ box: f.box, h: f.h, face: f.face, type: f.type, floors: f.floors, sign: f.sign ?? null })),
      alleys: ALLEYS,
      lanes: LANES,
      parks: PARKS,
      square: SQUARE,
      waterTower: WATER_TOWER.box,
      practice: PRACTICE,
    },
    outer: { parkway: PARKWAY, southside: SOUTHSIDE, squares: OUTER_SQUARES, parks: OUTER_PARKS },
    airport: {
      site: AIR.SITE,
      runway: AIR.RUNWAY,
      taxiway: AIR.TAXIWAY,
      apron: AIR.APRON,
      terminal: AIR.TERMINAL,
      stands: AIR.STANDS,
      tower: AIR.TOWER,
      hangar: AIR.HANGAR,
      hangarSpot: AIR.HANGAR_SPOT,
      hangarDoor: AIR.HANGAR_DOOR,
      helipad: AIR.HELIPAD,
      road: AIR.ROAD,
      carPark: AIR.CAR_PARK,
    },
    karts: { park: KART_PARK, gate: GATE, road: KART_ROAD, loop: KART_LOOP, site: KART_SITE, bays: BAYS, hutDoor: HUT_DOOR, circuit },
    fightClub: { lot: FIGHT_CLUB, ring: RING, counter: COUNTER, trainer: TRAINER, out: OUT },
    liberty: { x: FOOTBRIDGE_X, towers: TOWERS, walkway: WALKWAY, supports: SUPPORTS },
    westlake: { blocks: WESTLAKE_BLOCKS, lake: LAKE_C, gates: GATES, garden: GARDEN_SITE },
    stadium: { block: STADIUM_BLOCK, centre: STADIUM_CENTRE, road: STADIUM_ROAD, loop: STADIUM_LOOP, bridge: { x: BRIDGE.x, deck: BRIDGE.deck } },
  }) as Record<string, unknown>;

// The streets, with the world's edge left open
const streets = () => plain(PLAN.streets.map((s) => ({ id: s.id, kind: s.kind, half: s.half, lanes: s.lanes, pts: s.pts })), true);

test('nothing that exists has moved', () => {
  const now = { ...layout(), streets: streets() };
  if (process.env.UPDATE_SNAPSHOT) {
    mkdirSync(join(process.cwd(), 'tests', 'fixtures'), { recursive: true });
    writeFileSync(FILE, JSON.stringify(now, null, 1) + '\n');
  }
  const was = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, unknown>;
  // Group by group, so a failure says which part of the city moved
  for (const k of Object.keys(was)) assert.deepEqual(now[k as keyof typeof now], was[k], `${k} moved (see tests/snapshot.test.ts)`);
  // A new group is fine, but write it down
  for (const k of Object.keys(now)) assert.ok(k in was, `${k} isn't in the snapshot yet: UPDATE_SNAPSHOT=1 npm test -- snapshot`);
});

test('the snapshot covers every door, pad and district', () => {
  const was = JSON.parse(readFileSync(FILE, 'utf8')) as { doors: unknown[]; pads: unknown[]; districts: unknown[]; downtown: { infill: unknown[] } };
  assert.equal(was.doors.length, DOORS.length);
  assert.equal(was.pads.length, PADS.length);
  assert.equal(was.districts.length, DISTRICTS.length);
  assert.equal(was.downtown.infill.length, INFILL.length);
});
