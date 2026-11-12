// Building as you go (tileplan.ts, growth plan Phase 3): the boot builds only what's round the home view, however
// much city there is elsewhere; the queue builds nearest first and ahead of you; near forms are let go furthest
// first past the budget, never near the camera, and built again before they're needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEEP_LEAD, LOOK_AHEAD, REBUILD_LEAD, bootSites, focusOf, keyRect, nextSite, rectDistance, sitesNear, tilesOfRect, toRebuild, toRelease, type HeldTile, type SiteArea, HAZE_SEEN, HORIZON_BACK, HORIZON_OUT, hazeHorizon, toReturn, toVanish } from '../src/scripts/city3d/tileplan';
import { TILE, tileKey, tileOf, tilesNear } from '../src/scripts/city3d/tiles';

let seed = 7;
const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const siteAt = (id: string, x: number, z: number, w = 10): SiteArea => ({ id, rect: [x, z, x + w, z + w] });

test('a rectangle covers exactly the tiles it overlaps', () => {
  assert.deepEqual(tilesOfRect([0, 0, TILE, TILE]), [[0, 0]]);
  assert.equal(tilesOfRect([-1, -1, 1, 1]).length, 4);
  for (let k = 0; k < 200; k++) {
    const x = (r() - 0.5) * 400;
    const z = (r() - 0.5) * 400;
    const rect: [number, number, number, number] = [x, z, x + r() * 70 + 0.1, z + r() * 70 + 0.1];
    const tiles = new Set(tilesOfRect(rect).map(([i, j]) => tileKey(i, j)));
    for (let n = 0; n < 50; n++) {
      const px = rect[0] + r() * (rect[2] - rect[0]);
      const pz = rect[1] + r() * (rect[3] - rect[1]);
      assert.ok(tiles.has(tileKey(...tileOf(px, pz))));
    }
  }
  assert.equal(rectDistance(5, 5, [0, 0, 10, 10]), 0);
  assert.equal(rectDistance(13, 14, [0, 0, 10, 10]), 5);
  assert.deepEqual(keyRect('2,-1'), [60, -30, 90, 0]);
});

test('the boot builds the sites round the home view, and nothing more however big the city grows', () => {
  const home = tilesNear(30, 30, 60);
  const city = [siteAt('downtown', 20, 20), siteAt('square', 40, 50), siteAt('airport', 300, 300, 60), siteAt('karts', 120, -120, 80)];
  const boot = bootSites(city, home).map((s) => s.id);
  assert.deepEqual(boot, ['downtown', 'square']);
  // Ten thousand more sites out past the home view: the boot builds the same two
  const grown = [...city];
  for (let k = 0; k < 10000; k++) grown.push(siteAt(`far${k}`, 200 + r() * 2000, -2000 + r() * 4000, 5 + r() * 40));
  assert.deepEqual(
    bootSites(grown, home).map((s) => s.id),
    boot
  );
  // A site reaching into a home tile is built at boot
  assert.ok(bootSites([{ id: 'edge', rect: [85, 25, 200, 26] }], home).length === 1);
});

test('the queue builds the nearest first, and ahead of you when you move', () => {
  const q = [siteAt('a', 0, 0), siteAt('b', 100, 0), siteAt('c', -50, 0), siteAt('d', 0, 80)];
  assert.equal(q[nextSite(q, 5, 5)].id, 'a');
  assert.equal(q[nextSite(q, 90, 5)].id, 'b');
  assert.equal(nextSite([], 0, 0), -1);
  // Driving east at 16 tiles a second from x 20: the focus is 40 ahead, so the site to the east comes before the one behind
  const [fx, fz] = focusOf(20, 5, 16, 0);
  assert.equal(fx, 20 + 16 * LOOK_AHEAD);
  assert.equal(fz, 5);
  const pair = [q[1], q[2]];
  assert.equal(pair[nextSite(pair, fx, fz)].id, 'b');
  assert.equal(pair[nextSite(pair, 20, 5)].id, 'c');
  // Standing still the focus is the camera
  assert.deepEqual(focusOf(3, 4, 0, 0), [3, 4]);
  assert.deepEqual(
    sitesNear(q, 0, 0, 55).map((s) => s.id),
    ['a', 'c']
  );
});

test('near forms are let go past the budget, furthest first, never near the camera', () => {
  const far = 110;
  const held: HeldTile[] = [
    { key: 'a', d: 20, bytes: 40, near: true },
    { key: 'b', d: far + KEEP_LEAD - 1, bytes: 40, near: false },
    { key: 'c', d: 300, bytes: 30, near: false },
    { key: 'd', d: 200, bytes: 30, near: false },
    { key: 'e', d: 250, bytes: 30, near: false },
  ];
  // Inside the budget nothing goes
  assert.deepEqual(toRelease(held, 170, far), []);
  // 170 held against 120: the furthest go first, just until it fits
  assert.deepEqual(toRelease(held, 120, far), ['c', 'e']);
  // Against nothing: everything that may go, but never the near tile or the one just past the swap distance
  assert.deepEqual(toRelease(held, 0, far), ['c', 'e', 'd']);
  // A tile let go comes back before it's near, nearest first; one only just past where it was let go waits
  assert.deepEqual(
    toRebuild(
      [
        { key: 'x', d: far + REBUILD_LEAD + 1 },
        { key: 'y', d: far + 5 },
        { key: 'z', d: far - 30 },
      ],
      far
    ),
    ['z', 'y']
  );
  // Between where it's let go and where it's built again there's room, so a tile on the line doesn't churn
  assert.ok(KEEP_LEAD > REBUILD_LEAD);
});

test('past the haze a tile lets everything go, and comes back before it could show', () => {
  // The horizon is where the scene's fog leaves under a hundredth of a thing: thicker haze, nearer
  const day = hazeHorizon(0.0037);
  const night = hazeHorizon(0.0105);
  assert.ok(Math.abs(Math.exp(-((0.0037 * day) ** 2)) - HAZE_SEEN) < 1e-9);
  assert.ok(day > 550 && day < 620 && night > 190 && night < 220);
  assert.equal(hazeHorizon(0), Infinity);
  const t = (key: string, d: number, o: Partial<{ all: number; near: boolean; gone: boolean }> = {}) => ({ key, d, all: 100, near: false, gone: false, ...o });
  const tiles = [t('a', 100), t('b', 300), t('c', 261), t('d', 900), t('e', 500, { all: 0 }), t('f', 400, { gone: true }), t('g', 700, { near: true })];
  // Only past the horizon and a margin, furthest first; never one with nothing to give, one gone already or one drawn near
  assert.deepEqual(toVanish(tiles, 200), ['d', 'b', 'c']);
  assert.deepEqual(toVanish(tiles, 200 + 1 - HORIZON_OUT + 60), ['d', 'b']);
  // No horizon (the City view, a desktop, an aircraft): nothing is let go
  assert.deepEqual(toVanish(tiles, Infinity), []);
  // Coming back: only those gone, inside the horizon and a smaller margin, nearest first
  const gone = [t('p', 215, { gone: true }), t('q', 221, { gone: true }), t('r', 90, { gone: true }), t('s', 50)];
  assert.deepEqual(toReturn(gone, 200), ['r', 'p']);
  assert.ok(HORIZON_BACK < HORIZON_OUT);
  // ... and every one of them once nothing hides them any more
  assert.deepEqual(toReturn(gone, Infinity), ['r', 'p', 'q']);
  // A tile let go at the margin isn't asked back at once
  assert.deepEqual(toReturn([t('x', 200 + HORIZON_OUT + 1, { gone: true })], 200), []);
});
