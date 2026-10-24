// The river four times as wide and natural (river.ts, docs/river-plan.md step 1): its edges inside the band between
// the quay lines, straight where anything stands on the water, pulled back elsewhere (the cove's beach, the grass
// banks east of town, free past the highway), smooth, never too narrow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BANKS, MIN_WIDTH, SLOPE, WATER_Y, edgeSamples, edgesAt, inChannel, inWater, laneAt, pullAt, shoreY, stretchAt, topsAt } from '../src/scripts/city3d/river';
import { EXT, RIVER, RIVER_W, WIDEN } from '../src/scripts/city3d/layout';
import { JETTIES, PROMENADE } from '../src/scripts/city3d/outer';
import { ESPLANADE } from '../src/scripts/city3d/boulevard';
import { BOARDWALK, DECKS } from '../src/scripts/city3d/waterfront';
import { LIBERTY_RECTS } from '../src/scripts/city3d/liberty';
import { riverBridges } from '../src/scripts/city3d/streetplan';
import { MOORED } from '../src/scripts/city3d/boats';

const quay = (bank: 'north' | 'south', x0: number, x1: number, what: string) => {
  for (let x = x0; x <= x1; x += 0.25) assert.equal(pullAt(bank, x), 0, `${what}: the ${bank} bank pulls back at ${x}`);
};

test('four times as wide, the south bank moved to make room', () => {
  assert.equal(RIVER_W, 60);
  assert.equal(WIDEN, 45);
});

test('its edges stay inside the band, never narrower than MIN_WIDTH, and move smoothly', () => {
  let prev: [number, number] | null = null;
  for (let x = EXT[0]; x <= EXT[1]; x += 0.5) {
    const [n, s] = edgesAt(x);
    assert.ok(n >= RIVER[0] && s <= RIVER[1], `past the band at ${x}`);
    assert.ok(s - n >= MIN_WIDTH - 1e-9 && MIN_WIDTH >= 40, `too narrow at ${x}`);
    if (prev) assert.ok(Math.abs(n - prev[0]) < 0.6 && Math.abs(s - prev[1]) < 0.6, `a step at ${x}`);
    prev = [n, s];
    assert.ok(inWater(x, (n + s) / 2) && !inWater(x, n - 0.1) && !inWater(x, s + 0.1));
  }
  const e = edgeSamples(-10, 10, 2);
  assert.equal(e.length, 11);
  assert.deepEqual([e[0].x, e.at(-1)!.x], [-10, 10]);
});

test('straight quays wherever anything stands on the water', () => {
  // Uptown's esplanade and marina, and the town's promenades but the cove
  quay('north', ESPLANADE[0] - 2, ESPLANADE[2], "Uptown's esplanade");
  quay('north', PROMENADE.x[0], PROMENADE.x[1], "the town's north promenade");
  const cove = BANKS.find((b) => b.beach)!;
  quay('south', PROMENADE.x[0], cove.x0, "the town's south promenade");
  quay('south', cove.x1, PROMENADE.x[1], "the town's south promenade");
  // The Trenches' boardwalk, Pier 7 and the Night Market
  quay('south', BOARDWALK[0] - 2, BOARDWALK[2] + 2, 'the boardwalk');
  for (const d of DECKS) quay('south', d[0], d[2], 'a deck');
  // Liberty Bridge, every bridge (a little either side), every jetty and the boats moored at them
  for (const r of LIBERTY_RECTS) for (const bank of ['north', 'south'] as const) quay(bank, r[0] - 2, r[2] + 2, 'Liberty Bridge');
  for (const b of riverBridges()) for (const bank of ['north', 'south'] as const) quay(bank, b.x0 - 3, b.x1 + 3, `the bridge at ${b.c}`);
  for (const j of JETTIES) quay(j.bank, j.x - 3, j.x + 3, `the jetty at ${j.x}`);
  for (const m of MOORED) assert.ok(inWater(m.x, m.z, 0.3));
});

test('and natural elsewhere: the cove a beach, grass banks east of town, wandering past the highway', () => {
  const cove = BANKS.find((b) => b.beach)!;
  assert.equal(cove.bank, 'south');
  assert.ok(pullAt('south', (cove.x0 + cove.x1) / 2) > 5, 'the cove');
  const mean = (bank: 'north' | 'south', x0: number, x1: number) => {
    let t = 0;
    let k = 0;
    for (let x = x0; x <= x1; x += 1, k++) t += pullAt(bank, x);
    return t / k;
  };
  for (const bank of ['north', 'south'] as const) {
    assert.ok(mean(bank, 150, 245) > 3, `east of town, the ${bank} bank`);
    assert.ok(mean(bank, EXT[0] + 10, -260) > 3 && mean(bank, 310, EXT[1] - 10) > 3, `out of town, the ${bank} bank`);
  }
  // Every stretch eases in and out (no bank is pulled back at its ends)
  for (const b of BANKS) for (const x of [b.x0, b.x1]) assert.ok(pullAt(b.bank, x) < 1e-9);
});

test('a boat lane keeps its place across the water as the banks curve', () => {
  for (let x = EXT[0]; x <= EXT[1]; x += 1) {
    const [n, s] = edgesAt(x);
    for (const z of [RIVER[0] + 10, (RIVER[0] + RIVER[1]) / 2, RIVER[1] - 10]) {
      const l = laneAt(z, x);
      assert.ok(l > n + 3 && l < s - 3, `a lane at ${x}`);
    }
  }
  assert.equal(laneAt(80, -100), 80, 'on the quays, where it always ran');
});

test('the water lies WATER_Y under the streets: walls at the quays, slopes down to it where it pulls back (step 2)', () => {
  assert.ok(WATER_Y < -1);
  for (let x = EXT[0]; x <= EXT[1]; x += 0.5) {
    const [n, s] = edgesAt(x);
    const [tn, ts] = topsAt(x);
    // The slopes' tops: on the quay line where it keeps to it (a wall), back on the land where it pulls back
    assert.ok(tn >= RIVER[0] - 1e-9 && tn <= n && ts <= RIVER[1] + 1e-9 && ts >= s);
    for (const [bank, top, e] of [['north', tn, n], ['south', ts, s]] as const) {
      const w = Math.abs(e - top);
      if (pullAt(bank, x) === 0) assert.equal(w, 0);
      else if (!stretchAt(bank, x)?.beach) assert.ok(w <= SLOPE + 1e-9);
    }
    // The ground: the street's on the flat, the water's in the water, sloping down between, never above the street
    assert.equal(shoreY(x, (n + s) / 2), WATER_Y);
    assert.equal(shoreY(x, RIVER[0] - 0.5), 0);
    let prev = 0;
    for (let z = RIVER[0]; z <= (n + s) / 2; z += 0.25) {
      const y = shoreY(x, z);
      assert.ok(y <= prev + 1e-9 && y >= WATER_Y && y <= 0, `the north bank climbs at ${x}, ${z}`);
      prev = y;
    }
    assert.ok(inChannel(x, (n + s) / 2) && !inChannel(x, RIVER[0] - 0.1) && !inChannel(x, RIVER[1] + 0.1));
  }
});
