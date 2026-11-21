// The hub's Map tab (maptab.ts, docs/header-plan.md): every place in one district, "here", and what Go does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREA_CHOICES, AREA_OF, AREAS, areaHere, areaLabel, DIRECTORY, GO_LABEL, goAct, soonSplit } from '../src/scripts/city3d/maptab';
import { PLACES } from '../src/scripts/city3d/places';

/** The Map tab's places before it was split by district (CityMap.astro's old `directory`): none lost, none added */
const BEFORE = ['emporium', 'home', 'shop', 'workshop', 'vault', 'plan', 'signal', 'telegram', 'apartments', 'karts', 'airport', 'fightclub', 'liberty', 'harbour', 'trenches', 'club', 'bar', 'arms', 'pier', 'nightmarket', 'stadium', 'cityhall', 'police', 'courthouse', 'tower', 'palmcourt', 'mall', 'hotel', 'civichall', 'golfclub', 'overlook', 'reservoir', 'asterly', 'belvedere', 'glasshouse', 'vellano', 'solenne', 'harbourmaster', 'sunclub', 'sunpark', 'sunschool', 'wildace', 'dragonspire', 'scarab', 'bigcity', 'gondolier', 'lagoon', 'orbit', 'sphere', 'lot9', 'endswood', 'aldwyns', 'bunker', 'brook', 'rosas', 'kestrel', 'busgarage', 'rec', 'northgate'];

const at = (spot: string) => PLACES.find((p) => p.spot === spot)?.at;

test('every place the Map tab had is in exactly one district, and nothing new', () => {
  assert.deepEqual([...DIRECTORY].sort(), [...BEFORE].sort());
  assert.equal(new Set(DIRECTORY).size, DIRECTORY.length);
  for (const id of DIRECTORY) assert.ok(AREA_OF[id], id);
  for (const a of AREAS) assert.ok(a.places.length > 0, a.id);
  // (every district's name is at most three words: menu copy)
  for (const a of AREAS) assert.ok(a.label.split(' ').length <= 3, a.label);
});

test('the picker has every district, then All', () => {
  assert.equal(AREA_CHOICES.length, AREAS.length + 1);
  assert.equal(AREA_CHOICES.at(-1), 'all');
  assert.equal(areaLabel('all'), 'All');
  assert.equal(areaLabel('ends'), 'Endswood');
});

test('"here" is the district of the nearest place', () => {
  for (const id of ['emporium', 'home', 'club', 'tower', 'asterly', 'wildace', 'sunpark', 'lot9', 'harbourmaster'] as const) {
    const p = at(id);
    if (!p) continue;
    assert.equal(areaHere(p.x, p.z, at), AREA_OF[id], id);
  }
  assert.equal(
    areaHere(0, 0, () => undefined),
    null
  );
});

test('Go is the best way there: View in the City view, fast travel or a taxi on foot, a route at the wheel', () => {
  assert.equal(goAct('city', false), 'view');
  assert.equal(goAct('city', true), 'view');
  assert.equal(goAct('city', true, false), 'walk');
  assert.equal(goAct('city', false, false), 'route');
  assert.equal(goAct('foot', true), 'travel');
  assert.equal(goAct('foot', false), 'taxi');
  assert.equal(goAct('busy', true), 'route');
  assert.equal(goAct('busy', false), 'route');
  for (const k of Object.keys(GO_LABEL)) assert.ok(GO_LABEL[k as keyof typeof GO_LABEL].length <= 6, k);
});

test('a place coming soon is told from its line', () => {
  assert.deepEqual(soonSplit('Nightclub · coming soon'), { line: 'Nightclub', soon: true });
  assert.deepEqual(soonSplit('Pull up a stool · Coming soon'), { line: 'Pull up a stool', soon: true });
  assert.deepEqual(soonSplit('Market hall'), { line: 'Market hall', soon: false });
});
