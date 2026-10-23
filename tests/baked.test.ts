// The city's data worked out when the site is built (baked.ts, scripts/bake.mjs): what the build puts in
// the page is exactly what each module works out for itself, so baking never changes the city.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bake } from '../scripts/bake.mjs';
import { JUNCTIONS, ROUTES, packRoutes, unpackRoutes, type PackedRoute } from '../src/scripts/city3d/routes';
import { AMENITIES } from '../src/scripts/city3d/commons';
import { JOG_STRIDE, WALK_STRIDE, MARCH_STRIDE } from '../src/scripts/city3d/crowdclips';

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
  assert.deepEqual(Object.keys(made).sort(), ['amenities', 'jog-cycle', 'march-cycle', 'routes', 'walk-cycle']);
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
