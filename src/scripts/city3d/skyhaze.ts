/*
 * The night's haze far off (the owner's calls, 2026-11-20; DOM-free, tested in tests/skyhaze.test.ts; read by sky.ts).
 * The night's haze is thick (about three times the day's) and coloured the night sky's pale horizon, so the City view
 * pulled far back at night read as a hazy day: from 110 up the north was 98% haze, the base not to be seen. Pulled back
 * at night it now thins further than by day (`thinFloor()`) and takes the night's dark top (`nightHazeMix()`), so the
 * city reads as night with its lights; on the ground (walking, driving), close in and by day, as it was.
 */

/** The City view's haze thinning at its most pulled back by day (sky.ts `thin`: 70 over the distance, at least this) */
export const THIN_MIN = 0.55;
/** ... and at night: the night's haze is about three times the day's, so it thins further to see as far */
export const THIN_MIN_NIGHT = 0.25;
/** At most this much of the way from the horizon's pale to the night's dark top (a little of the pale kept, for depth) */
export const DARK_MOST = 0.85;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** How far the City view's haze may thin, pulled back: `THIN_MIN` by day to `THIN_MIN_NIGHT` at night (`night` 0 to 1) */
export function thinFloor(night: number): number {
  return THIN_MIN + (THIN_MIN_NIGHT - THIN_MIN) * clamp01(night);
}

/**
 * How thin the haze is drawn (1 its full thickness): 70 over the camera's distance from what it looks at, no thinner
 * than `thinFloor()`; down in the city (`ground`) always its full thickness
 */
export function hazeThin(distance: number, night: number, ground: boolean): number {
  if (ground) return 1;
  return Math.min(1, Math.max(thinFloor(night), 70 / Math.max(1, distance)));
}

/**
 * How far the haze's colour goes from the horizon's to the night sky's top (0 to `DARK_MOST`): `night` 0 by day to 1 at
 * night, `thin` the City view's thinning (1 close in, `THIN_MIN` and less pulled far back), `ground` down in the city
 */
export function nightHazeMix(night: number, thin: number, ground: boolean): number {
  if (ground) return 0;
  const far = clamp01((1 - thin) / (1 - THIN_MIN));
  return clamp01(night) * far * DARK_MOST;
}
