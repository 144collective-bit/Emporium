// The Multiplayer menu's games (games.ts), shared by the site and the game server: ids, which
// games Browse lists, private games' lifetimes and what a request to make one may ask for.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_SIZE,
  GAME_MODES,
  GAME_MODE_IDS,
  MAP_NAMES,
  PRIVATE_TTL,
  STALE,
  cityId,
  cityOf,
  cleanCreate,
  gameIdOk,
  gameOf,
  isPrivateId,
  listGames,
  pickCity,
  privateAlive,
  privateId,
  type Count,
  type PrivateGame,
} from '../src/scripts/net/games';

const NOW = 1_800_000_000_000;

test('ids: hangout cities and private games, nothing else', () => {
  assert.equal(cityOf('city-1'), 1);
  assert.equal(cityOf('city-500'), 500);
  for (const bad of ['city-0', 'city-501', 'city-01', 'City 1', 'city-', 7, null]) assert.equal(cityOf(bad), 0, String(bad));
  const id = privateId(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 255]));
  assert.ok(isPrivateId(id) && gameIdOk(id), id);
  for (const bad of ['p123', 'pABCDEFGHIJ', 'q0123456789', 'p0123456789x', '../city-1']) assert.ok(!gameIdOk(bad), bad);
});

test('private ids come out evenly over random bytes', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) seen.add(privateId(crypto.getRandomValues(new Uint8Array(10))));
  assert.equal(seen.size, 2000);
});

test('every mode has a name, a map and a size; only hangout is ready', () => {
  for (const id of GAME_MODE_IDS) {
    const m = GAME_MODES[id];
    assert.ok(m.name && m.blurb && m.size > 1 && m.maps.length, id);
    for (const map of m.maps) assert.ok(MAP_NAMES[map], `${id}: ${map}`);
  }
  assert.deepEqual(GAME_MODE_IDS.filter((m) => GAME_MODES[m].ready), ['hangout']);
});

test('quick join takes the first city with room', () => {
  const counts = new Map<string, Count>();
  assert.equal(pickCity(counts, NOW), 1);
  counts.set(cityId(1), { n: CITY_SIZE, at: NOW });
  assert.equal(pickCity(counts, NOW), 2);
  // A full city that stopped reporting counts as empty
  counts.set(cityId(1), { n: CITY_SIZE, at: NOW - STALE - 1 });
  assert.equal(pickCity(counts, NOW), 1);
});

test('Browse lists the cities with people and the one with room, never private games', () => {
  const counts = new Map<string, Count>([
    [cityId(1), { n: CITY_SIZE, at: NOW }],
    [cityId(3), { n: 2, at: NOW }],
    ['pabcdefghij', { n: 4, at: NOW }],
  ]);
  assert.deepEqual(
    listGames('hangout', counts, NOW).map((g) => g.id),
    ['city-1', 'city-2', 'city-3'],
  );
  assert.deepEqual(listGames('hangout', new Map(), NOW).map((g) => g.name), ['City 1']);
  for (const mode of GAME_MODE_IDS.filter((m) => m !== 'hangout')) assert.deepEqual(listGames(mode, counts, NOW), [], mode);
});

test('a private game lasts a day after it was made or last played in', () => {
  const g: PrivateGame = { mode: 'hangout', map: 'sector7', made: NOW };
  assert.ok(privateAlive(g, undefined, NOW + PRIVATE_TTL - 1));
  assert.ok(!privateAlive(g, undefined, NOW + PRIVATE_TTL));
  assert.ok(privateAlive(g, { n: 0, at: NOW + PRIVATE_TTL }, NOW + PRIVATE_TTL + 1000));
  const privates = new Map([['pabcdefghij', g]]);
  assert.equal(gameOf('pabcdefghij', privates, new Map(), NOW)?.mode, 'hangout');
  assert.equal(gameOf('pabcdefghij', privates, new Map(), NOW + PRIVATE_TTL), null);
  assert.equal(gameOf('pzzzzzzzzzz', privates, new Map(), NOW), null);
  assert.deepEqual(gameOf('city-4', privates, new Map(), NOW), { id: 'city-4', name: 'City 4', mode: 'hangout', map: 'sector7', private: false });
});

test('a private game can only be a ready mode on one of its maps', () => {
  assert.deepEqual(cleanCreate({ mode: 'hangout' }), { mode: 'hangout', map: 'sector7' });
  assert.deepEqual(cleanCreate({ mode: 'hangout', map: 'sector7' }), { mode: 'hangout', map: 'sector7' });
  for (const bad of [null, 'hangout', {}, { mode: 'ffa' }, { mode: 'karts', map: 'circuit' }, { mode: 'hangout', map: 'junkyard' }, { mode: 'toString' }])
    assert.equal(cleanCreate(bad), null, JSON.stringify(bad));
});
