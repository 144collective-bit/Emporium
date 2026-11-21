// The night's haze far off (skyhaze.ts, the owner's calls): pulled far back at night, the haze thins further than by day
// and goes the night's dark; on the ground, by day and close in, it's as it was
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DARK_MOST, THIN_MIN, THIN_MIN_NIGHT, hazeThin, nightHazeMix, thinFloor } from '../src/scripts/city3d/skyhaze';

test("pulled far back at night the haze goes dark; on the ground, by day or close in, it doesn't", () => {
  assert.equal(nightHazeMix(1, THIN_MIN, false), DARK_MOST);
  assert.equal(nightHazeMix(1, THIN_MIN, true), 0);
  assert.equal(nightHazeMix(0, THIN_MIN, false), 0);
  assert.equal(nightHazeMix(1, 1, false), 0);
  // (between, in step: further back and darker night, darker haze; never past DARK_MOST)
  let prev = -1;
  for (let thin = 1; thin >= THIN_MIN - 1e-9; thin -= 0.05) {
    const m = nightHazeMix(1, thin, false);
    assert.ok(m >= prev && m <= DARK_MOST + 1e-12);
    prev = m;
  }
  assert.ok(nightHazeMix(0.5, THIN_MIN, false) < nightHazeMix(1, THIN_MIN, false));
});

test('pulled far back at night the haze thins further, enough to see the city; by day, close in and on the ground, as it was', () => {
  // (as it was: 70 over the distance, no thinner than THIN_MIN; on the ground its full thickness)
  for (const d of [10, 70, 100, 127, 200, 400, 900]) {
    assert.equal(hazeThin(d, 0, false), Math.min(1, Math.max(THIN_MIN, 70 / d)));
    assert.equal(hazeThin(d, 1, true), 1);
  }
  // (close in, the night's the same as the day's: the floor only matters pulled far back)
  for (const d of [10, 70, 100, 127]) assert.equal(hazeThin(d, 1, false), hazeThin(d, 0, false));
  assert.equal(thinFloor(0), THIN_MIN);
  assert.equal(thinFloor(1), THIN_MIN_NIGHT);
  assert.ok(thinFloor(0.5) < THIN_MIN && thinFloor(0.5) > THIN_MIN_NIGHT);
  // From 110 up over the north (about 350 from what it looks at), the night's haze (density 0.0105, sky.ts) lets the
  // base through: under two thirds haze there (it was 98%), and never thinner than the day's haze close in
  const d = 350;
  const haze = (density: number) => 1 - Math.exp(-((density * d) ** 2));
  assert.ok(haze(0.0105 * hazeThin(d, 1, false)) < 0.66);
  assert.ok(haze(0.0105 * THIN_MIN) > 0.95);
  assert.ok(0.0105 * THIN_MIN_NIGHT > 0.0037 * THIN_MIN);
  // (and the colour still goes all the way to its darkest, pulled back past the day's floor)
  assert.equal(nightHazeMix(1, hazeThin(d, 1, false), false), DARK_MOST);
});
