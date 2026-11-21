// A still city's ticks (stillticks.ts): under reduced motion they run on the first frame, then once the sky has
// settled somewhere that's moved on by a step, so what follows the sky (the murk, the night lights) catches up
// without anything moving, and without running (and drawing the city) on every step of the sky's glide
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOUR_STEP, SKY_STEP, createStillTicks, skyMoved, type SkyState } from '../src/scripts/city3d/stillticks';

const DAY: SkyState = { night: 0, day: 1, rain: 0, hour: 13 };
const NIGHT: SkyState = { night: 1, day: 0, rain: 0, hour: 23 };
const nan = { night: NaN, day: NaN, rain: NaN, hour: NaN };

/** The sky gliding from one state to another as sky.ts eases it (a share of what's left each frame), then held */
function glide(from: SkyState, to: SkyState, frames = 200, hold = 5): SkyState[] {
  const out: SkyState[] = [];
  let s = { ...from };
  for (let k = 0; k < frames; k++) {
    s = { night: s.night + (to.night - s.night) * 0.08, day: s.day + (to.day - s.day) * 0.08, rain: s.rain + (to.rain - s.rain) * 0.08, hour: s.hour + (to.hour - s.hour) * 0.08 };
    out.push(s);
  }
  for (let k = 0; k < hold; k++) out.push({ ...to });
  return out;
}

test('a step is a step: night, day, rain or the hour (round the clock); never ran counts as moved', () => {
  assert.equal(skyMoved(nan, DAY), true);
  assert.equal(skyMoved(DAY, DAY), false);
  assert.equal(skyMoved(DAY, NIGHT), true);
  assert.equal(skyMoved(DAY, { ...DAY, rain: SKY_STEP * 2 }), true);
  assert.equal(skyMoved(DAY, { ...DAY, hour: 13 + HOUR_STEP * 2 }), true);
  assert.equal(skyMoved(DAY, { night: SKY_STEP / 2, day: 1 - SKY_STEP / 2, rain: SKY_STEP / 2, hour: 13 + HOUR_STEP / 2 }), false);
  assert.equal(skyMoved({ ...NIGHT, hour: 23.95 }, { ...NIGHT, hour: 0.05 }), false);
});

test('the first frame runs them; a sky that holds never runs them again', () => {
  const still = createStillTicks();
  assert.equal(still.due(DAY), true);
  for (let k = 0; k < 100; k++) assert.equal(still.due(DAY), false);
});

test('day to night (the menu, the review shots): once, when the sky has settled, not on every step of the glide', () => {
  const still = createStillTicks();
  still.due(DAY);
  const frames = glide(DAY, NIGHT);
  const runs = frames.map((s) => still.due(s));
  assert.equal(runs.filter(Boolean).length, 1);
  // (and on the settled night, not on the way: within a step of it)
  assert.equal(skyMoved(frames[runs.indexOf(true)], NIGHT), false);
  // Then back to day, and rain coming on: once each
  assert.equal(glide(NIGHT, DAY).map((s) => still.due(s)).filter(Boolean).length, 1);
  assert.equal(glide(DAY, { ...DAY, rain: 1 }).map((s) => still.due(s)).filter(Boolean).length, 1);
});

test("the live clock's hour going on runs them once it's a step on, its minutes counting as settled", () => {
  const still = createStillTicks();
  still.due(DAY);
  let runs = 0;
  // (a frame a second for an hour: the hour creeps on by a 3600th each frame)
  for (let k = 0; k < 3600; k++) if (still.due({ ...DAY, hour: 13 + k / 3600 })) runs++;
  assert.ok(runs >= 3 && runs <= 4, `ran ${runs} times`);
});
