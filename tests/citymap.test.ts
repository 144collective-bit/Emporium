// A city as a map file (citymap.ts) and the cities there are (cities.ts): docs/cities-plan.md, Phase 1.
// What's read from a file is cleaned (the sound kept, the rest dropped or clamped), a blank level is blank, the
// ground's height follows the hills, and the address's ?city= only ever names a map city.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HILL, LIMITS, MAP_VERSION, SIZE_MAX, SIZE_MIN, STREET_KINDS, STREET_WIDTH, areaOf, blankMap, census, cleanId, cleanMap, cleanName, groundAt, inMap, inPoly, inWater, isBlank, lengthOf, mapText, type Pt } from '../src/scripts/city3d/citymap';
import { CITIES, HOME, OPEN_LEVEL, cityAsked, cityOf, destinations } from '../src/scripts/city3d/cities';

test('a blank level: nothing built, the arrivals pad and the spawn on it', () => {
  const m = blankMap('test-town', 'Test Town');
  assert.equal(m.v, MAP_VERSION);
  assert.deepEqual(m.size, [600, 600]);
  assert.ok(isBlank(m));
  assert.equal(m.places.length, 1);
  assert.equal(m.places[0].kind, 'airport');
  assert.ok(inMap(m, m.places[0].at, 30), 'the arrivals pad stands well inside the edge');
  assert.ok(inMap(m, m.spawn.at, 30));
  // (Degen stands north of the pad, facing the open land to the north)
  assert.ok(m.spawn.at[1] < m.places[0].at[1]);
  assert.equal(groundAt(m, 0, 0), 0);
  assert.throws(() => blankMap('!!!', 'No id'));
});

test('a map file reads the same after a save and a load', () => {
  const m = cleanMap({
    id: 'Port Town',
    name: '  Port   Town ',
    size: [400, 300],
    theme: 'coast',
    hills: [{ at: [50, 50], radius: 40, height: 12 }],
    water: [{ kind: 'sea', poly: [[-200, 100], [200, 100], [200, 150], [-200, 150]] }],
    streets: [{ id: 'Front Street', kind: 'avenue', pts: [[-100, 0], [0, 10.004], [100, 0]] }],
    zones: [{ use: 'shops', poly: [[0, 20], [40, 20], [40, 60], [0, 60]] }],
    places: [{ kind: 'airport', name: 'Arrivals', at: [0, -100], yaw: 0 }],
  })!;
  assert.equal(m.id, 'port-town');
  assert.equal(m.name, 'Port Town');
  assert.equal(m.theme, 'coast');
  assert.equal(m.streets[0].id, 'front-street');
  assert.deepEqual(m.streets[0].pts[1], [0, 10], 'points are kept to the centimetre');
  assert.equal(m.hills[0].id, 'hill-1');
  assert.deepEqual(cleanMap(JSON.parse(mapText(m))), m);
  assert.equal(mapText(cleanMap(JSON.parse(mapText(m)))!), mapText(m));
  assert.ok(!isBlank(m));
  const c = census(m);
  assert.equal(c.tiles, 120000);
  assert.equal(c.streets, 1);
  assert.equal(c.streetLength, Math.round(lengthOf(m.streets[0].pts)));
});

test('what is unsound in a file is dropped or clamped, never kept', () => {
  assert.equal(cleanMap(null), null);
  assert.equal(cleanMap('a map'), null);
  assert.equal(cleanMap({ name: 'No id' }), null);
  const m = cleanMap({
    id: 'x',
    name: '<b>Town</b>',
    size: [5, 1e9],
    theme: 'lava',
    spawn: { at: [1e6, NaN], yaw: 'north' },
    hills: [{ at: [0, 0], radius: 1e6, height: -3 }, { at: 'here' }, 7],
    water: [{ poly: [[0, 0], [1, 1]] }, { poly: [[0, 0], [10, 0], [20, 0]] }],
    streets: [{ kind: 'motorway', pts: [[0, 0], [0, 0], [30, 0]] }, { pts: [[0, 0]] }, { id: 'street-1', pts: [[0, 5], [9, 5]] }],
    zones: [{ use: 'casino', poly: [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]] }],
    places: [{ name: '', at: [0, 0] }, { at: null }],
  })!;
  assert.deepEqual(m.size, [SIZE_MIN, SIZE_MAX]);
  assert.equal(m.name, 'bTown/b');
  assert.equal(m.theme, 'temperate');
  assert.deepEqual(m.spawn, { at: [0, 0], yaw: 0 }, 'a spawn that is no point is the middle');
  assert.equal(m.hills.length, 1);
  assert.equal(m.hills[0].radius, HILL.radius[1]);
  assert.equal(m.hills[0].height, HILL.height[0]);
  assert.equal(m.water.length, 0, 'a line and a sliver are no water');
  assert.equal(m.streets.length, 2);
  assert.equal(m.streets[0].kind, 'street');
  assert.equal(m.streets[0].pts.length, 2, 'a point twice running is one');
  assert.equal(new Set(m.streets.map((s) => s.id)).size, 2, 'every id once');
  assert.equal(m.zones[0].use, 'homes');
  assert.equal(m.zones[0].poly.length, 4, 'an outline closed by hand loses its last point');
  assert.equal(m.places.length, 1);
  assert.equal(m.places[0].name, 'Unnamed');
  // Every point is on the level
  const far = cleanMap({ id: 'y', size: [100, 100], streets: [{ pts: [[-900, 0], [900, 0]] }] })!;
  assert.deepEqual(far.streets[0].pts, [[-50, 0], [50, 0]]);
});

test('a file past the limits is cut short', () => {
  const pts: Pt[] = Array.from({ length: LIMITS.pts + 50 }, (_, i) => [i * 0.5 - 100, 0]);
  const streets = Array.from({ length: LIMITS.streets + 20 }, (_, i) => ({ pts: [[0, i * 0.1], [10, i * 0.1]] }));
  const m = cleanMap({ id: 'big', size: [SIZE_MAX, SIZE_MAX], streets: [{ pts }, ...streets] })!;
  assert.equal(m.streets.length, LIMITS.streets);
  assert.equal(m.streets[0].pts.length, LIMITS.pts);
  assert.equal(cleanName('n'.repeat(200)).length, LIMITS.name);
  assert.equal(cleanId('A  Very -- Odd__Id!'), 'a-very-odd-id');
  assert.equal(cleanId(12), '');
});

test('the ground: flat but for the hills, which rise smoothly and never stack', () => {
  const m = cleanMap({ id: 'hilly', hills: [{ at: [0, 0], radius: 50, height: 20 }, { at: [30, 0], radius: 50, height: 10 }] })!;
  assert.equal(groundAt(m, 0, 0), 20);
  assert.equal(groundAt(m, -50, 0), 0);
  assert.equal(groundAt(m, 200, 200), 0);
  // (downhill all the way from the top to the foot, in small steps)
  let last = Infinity;
  for (let d = 0; d <= 50; d += 1) {
    const y = groundAt(m, -d, 0);
    assert.ok(y <= last && last - y < 1.2 || last === Infinity, `no step in the slope at ${d}`);
    last = y;
  }
  assert.ok(groundAt(m, 30, 0) <= 20, 'two hills over one point are the higher, not their sum');
  assert.ok(groundAt(m, 30, 0) >= 10);
});

test('outlines: area, inside and water', () => {
  const sq: Pt[] = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(areaOf(sq), 100);
  assert.equal(areaOf([...sq].reverse()), 100);
  assert.ok(inPoly(sq, [5, 5]));
  assert.ok(!inPoly(sq, [15, 5]));
  const m = cleanMap({ id: 'wet', water: [{ kind: 'lake', poly: sq }] })!;
  assert.ok(inWater(m, [5, 5]));
  assert.ok(!inWater(m, [-5, 5]));
});

test('streets: every kind has a width, wider as it carries more', () => {
  const w = STREET_KINDS.map((k) => STREET_WIDTH[k]);
  assert.deepEqual([...w].sort((a, b) => b - a), w);
  assert.ok(w.every((x) => x > 0));
});

test('the cities: Sector 7 is home, and the address only ever names a map city', () => {
  assert.equal(new Set(CITIES.map((c) => c.id)).size, CITIES.length);
  assert.equal(CITIES.filter((c) => c.home).length, 1);
  assert.equal(cityOf(HOME)!.name, 'Sector 7');
  for (const c of CITIES) {
    if (c.home) {
      assert.equal(c.map, undefined);
      continue;
    }
    const m = c.map!();
    assert.equal(m.id, c.id, 'a city and its map share an id');
    assert.equal(m.name, c.name);
    assert.deepEqual(cleanMap(m), m, `${c.id}'s map is sound as it stands`);
    assert.ok(m.places.some((p) => p.kind === 'airport'), `${c.id} has somewhere to arrive`);
  }
  assert.equal(cityAsked(''), null);
  assert.equal(cityAsked('?fps'), null);
  assert.equal(cityAsked(`?city=${HOME}`), null, 'Sector 7 is started as ever');
  assert.equal(cityAsked('?city=nowhere'), null);
  assert.equal(cityAsked('?city=%E0%A4%A'), null);
  assert.equal(cityAsked(`?city=${OPEN_LEVEL}`)!.id, OPEN_LEVEL);
  assert.equal(cityAsked(`?fps&city=${OPEN_LEVEL}&edit`)!.id, OPEN_LEVEL);
  assert.equal(cityAsked(`?velocity=${OPEN_LEVEL}`), null);
  // A test level is never a destination
  assert.ok(isBlank(cityOf(OPEN_LEVEL)!.map!()));
  assert.ok(destinations().every((c) => !c.test && !c.home));
  assert.ok(!destinations().some((c) => c.id === OPEN_LEVEL));
});
