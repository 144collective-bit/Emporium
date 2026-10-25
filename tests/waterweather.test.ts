// The weather on the water (waterweather.ts, docs/water-plan.md step 4): the mist by the hour, the night and the rain;
// the whitecaps by the wind; the splashes' and the rain's numbers in range.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAPS, FLASH, MIST, RAIN_DARK, SPLASH, capsAt, mistAt } from '../src/scripts/city3d/waterweather';
import { windStrength } from '../src/scripts/city3d/dusk';

test('the mist is thickest at dawn, gone by a clear noon, lighter at night and in the rain, never over 1', () => {
  assert.ok(Math.abs(mistAt(MIST.dawn, 0, 0) - 1) < 1e-9);
  assert.ok(mistAt(13, 0, 0) < 0.001, 'none at a clear noon (the Day preset)');
  assert.ok(mistAt(17.6, 0, 0) < 0.001, 'none at sunset');
  assert.equal(mistAt(13, 1, 0), MIST.night);
  assert.equal(mistAt(13, 0, 1), MIST.rain);
  assert.ok(mistAt(MIST.dawn + 1, 0, 0) < mistAt(MIST.dawn + 0.3, 0, 0), 'it lifts as the morning goes on');
  // Round the clock, either side of midnight
  assert.ok(Math.abs(mistAt(MIST.dawn + 24, 0, 0) - 1) < 1e-9);
  for (let h = 0; h < 24; h += 0.25) for (const n of [0, 1]) for (const r of [0, 1]) {
    const m = mistAt(h, n, r);
    assert.ok(m >= 0 && m <= 1, `out of range at ${h}`);
  }
  // Its two layers just over the water, under the streets
  assert.ok(MIST.low > 0 && MIST.high > MIST.low && MIST.high < 1.5);
});

test('whitecaps break only when the wind is up: none on a calm day, all of them in a storm', () => {
  assert.equal(capsAt(windStrength(0)), 0);
  assert.equal(capsAt(windStrength(1)), 1);
  assert.ok(capsAt(windStrength(0.6)) > 0 && capsAt(windStrength(0.6)) < 1);
  assert.ok(CAPS.from > windStrength(0) && CAPS.to <= windStrength(1));
});

test("the rain's splashes, darkening and the thunder's light stay in range", () => {
  assert.equal(SPLASH.cells.length, 2);
  assert.notEqual(SPLASH.cells[0], SPLASH.cells[1], 'two grids at odd sizes, so no grid shows');
  assert.ok(SPLASH.share > 0 && SPLASH.share <= 1);
  assert.ok(SPLASH.near < SPLASH.far);
  assert.ok(RAIN_DARK > 0 && RAIN_DARK < 1);
  // (a soft brighten, under the bloom)
  assert.ok(FLASH > 0 && FLASH < 0.3);
});
