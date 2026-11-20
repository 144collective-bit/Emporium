// The city's data worked out when the site is built (baked.ts, scripts/bake.mjs): what the build puts in
// the page is exactly what each module works out for itself, so baking never changes the city.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bake } from '../scripts/bake.mjs';
import { JUNCTIONS, ROUTES, packRoutes, unpackRoutes, type PackedRoute } from '../src/scripts/city3d/routes';
import { AMENITIES } from '../src/scripts/city3d/commons';
import { JOG_STRIDE, WALK_STRIDE, MARCH_STRIDE } from '../src/scripts/city3d/crowdclips';
import { VERGES, packVerges } from '../src/scripts/city3d/verges';
import { rollShares } from '../src/scripts/city3d/rolls';
import { PILLARS, PLATEAUS, packPlateaus } from '../src/scripts/city3d/metro';
import { UNDER } from '../src/scripts/city3d/viadress';
import { GINNELS, HOUSES } from '../src/scripts/city3d/southterraces';
import { SHOPS } from '../src/scripts/city3d/highroad';
import { BUNGALOWS, COMMUNITY_CENTRE, CORNER_SHOPS, SEMIS } from '../src/scripts/city3d/council';
import { LINE, SOUTH_STATIONS } from '../src/scripts/city3d/southline';
import { FOOTPATHS, GROWN, SOUTH_STREETS } from '../src/scripts/city3d/south';

const made: Record<string, unknown> = await bake({ quiet: true });
/** Into the page and back, as the browser gets it */
const viaPage = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Plain data only: what JSON would lose or change (NaN and infinities become null; functions, maps, sets, typed arrays and class instances don't come back) fails. A key holding undefined and -0 are fine: they come back as missing and 0 */
function assertPlain(v: unknown, path: string) {
  if (typeof v === 'number') return assert.ok(Number.isFinite(v), `${path} is ${v}`);
  if (v === null || v === undefined || typeof v === 'string' || typeof v === 'boolean') return;
  assert.equal(typeof v, 'object', `${path} is a ${typeof v}`);
  if (Array.isArray(v)) return v.forEach((x, i) => assertPlain(x, `${path}[${i}]`));
  assert.equal(Object.getPrototypeOf(v), Object.prototype, `${path} isn't a plain object`);
  for (const [k, x] of Object.entries(v as object)) assertPlain(x, `${path}.${k}`);
}

test('everything baked is plain data: it comes into the page as it was made', () => {
  assert.deepEqual(Object.keys(made).sort(), ['amenities', 'cable-supports', 'council', 'crest-land', 'crest-paths', 'highroad', 'hill-fine', 'jog-cycle', 'mansion-ground', 'march-cycle', 'metro-pillars', 'metro-plateaus', 'rolls', 'routes', 'south-grown', 'southline', 'sun-lots', 'terraces', 'under-deck', 'verges', 'walk-cycle']);
  for (const [key, v] of Object.entries(made)) assertPlain(v, key);
});

test('the routes from the page are the routes worked out here, junctions and all', () => {
  const routes = unpackRoutes(viaPage(made.routes as PackedRoute[]));
  assert.deepStrictEqual(routes, ROUTES);
  assert.deepStrictEqual(unpackRoutes(viaPage(packRoutes(ROUTES))), ROUTES);
  // Each stop's junction is the module's own object, not a copy
  for (const r of routes) for (const s of r.stops) assert.equal(s.j, JUNCTIONS[s.j.ix]);
});

test('the amenities and the crowd\'s walk cycles from the page are the ones worked out here', () => {
  assert.deepStrictEqual(viaPage(made.amenities), AMENITIES);
  assert.equal((made['walk-cycle'] as { stride: number }).stride, WALK_STRIDE);
  assert.equal((made['march-cycle'] as { stride: number }).stride, MARCH_STRIDE);
  assert.equal((made['jog-cycle'] as { stride: number }).stride, JOG_STRIDE);
});

test("the blocks' verges from the page are the ones worked out here", () => {
  assert.equal(typeof made.verges, 'string');
  assert.equal(viaPage(made.verges), packVerges(VERGES));
});

test("the rolls' shares from the page are the ones worked out here", () => {
  assert.equal(typeof made.rolls, 'string');
  assert.equal(viaPage(made.rolls), rollShares());
});

test("the metro's pillars and raised stretches, and what's under the highway's deck, from the page are the ones worked out here", () => {
  assert.deepStrictEqual(viaPage(made['metro-pillars']), PILLARS);
  assert.ok(PILLARS.length > 100);
  // (the plateaus' open ends are infinities: packed as null for the page)
  assert.deepStrictEqual(viaPage(made['metro-plateaus']), packPlateaus(PLATEAUS));
  assert.ok(Object.values(PLATEAUS).some((runs) => runs.some(([a, b]) => !Number.isFinite(a) || !Number.isFinite(b))));
  assert.deepStrictEqual(viaPage(made['under-deck']), UNDER);
  assert.ok(UNDER.length > 10);
});

test("Aldwyn's Green's terraces, the High Road's buildings and the council rows from the page are the ones laid here", () => {
  assert.deepStrictEqual(viaPage(made.terraces), viaPage({ houses: HOUSES, ginnels: GINNELS }));
  assert.deepStrictEqual(viaPage(made.highroad), viaPage(SHOPS));
  assert.deepStrictEqual(viaPage(made.council), viaPage({ corner: CORNER_SHOPS, centre: COMMUNITY_CENTRE, semis: SEMIS, bungalows: BUNGALOWS }));
});

test("the south's closes, crescents and their footpaths from the page are the ones grown here", () => {
  assert.deepStrictEqual(viaPage(made['south-grown']), viaPage(GROWN));
  assert.ok(GROWN.streets.length > 10 && GROWN.paths.length >= GROWN.streets.length);
  for (const s of GROWN.streets) assert.ok(SOUTH_STREETS.includes(s), `${s.id} is one of the south's streets`);
  for (const p of GROWN.paths) assert.ok(FOOTPATHS.includes(p), `${p.id} is one of its footpaths`);
});

test("the underground's south line and its stations from the page are the ones laid here", () => {
  assert.deepStrictEqual(viaPage(made.southline), viaPage({ line: LINE, stations: SOUTH_STATIONS }));
});
