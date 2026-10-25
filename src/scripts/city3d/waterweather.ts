/*
 * The weather on the water (docs/water-plan.md, step 4): DOM-free, tested in tests/waterweather.test.ts; the water's
 * shader and the mist (world.ts) draw it from these numbers, index.ts's `waterLook()` feeds them each frame.
 *
 * - **Rain** (`SPLASH`): splashes at random spots and times, never a grid: two grids of cells at odd sizes, offset,
 *   each cell's splash its own spot, pace and moment, a share of them falling the harder it rains (`share`), each a
 *   ring spreading from where it hit; left out past `far` (too fine to see).
 * - **Wind** (`capsAt()`): the waves are already taller and quicker in it (the shader's chop); from `CAPS.from` the
 *   highest crests break into whitecaps, all of them by `CAPS.to` (dusk.ts `windStrength()`: a storm's).
 * - **Heavy rain** darkens and dulls the water (`RAIN_DARK`), and the thunder's soft brighten lights it (`FLASH`).
 * - **Mist** (`mistAt()`, the owner's yes): over the water at dawn, and lighter at night and in the rain; cartoon
 *   wisps in two thin layers just over the water (`MIST.low`, `MIST.high`), off the banks, never in your face.
 */

/** The rain's splashes: the two grids' cells a tile, the share falling at full rain, and how far off they're drawn */
export const SPLASH = { cells: [1.7, 1.3], share: 0.35, near: 12, far: 35 };
/** The wind (windStrength()) from which whitecaps start, and by which they're all breaking */
export const CAPS = { from: 0.075, to: 0.13 };
/** How far towards the storm's grey the water goes in the heaviest rain */
export const RAIN_DARK = 0.5;
/** How much the thunder's brighten lights the water */
export const FLASH = 0.18;
/** The mist: its hour at dawn and how long either side, how much at night and in the rain, its layers' heights over the water */
export const MIST = { dawn: 6.2, spread: 1.4, night: 0.25, rain: 0.5, low: 0.3, high: 0.75 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** How many whitecaps break, 0..1, by the wind */
export const capsAt = (wind: number) => smooth(CAPS.from, CAPS.to, wind);

/** How thick the mist over the water is, 0..1: at dawn (the hour, 0-24), lighter at night (0..1) and in the rain (0..1) */
export function mistAt(hour: number, night: number, rain: number) {
  // (the way round the clock to dawn, either side of midnight)
  let d = Math.abs(hour - MIST.dawn) % 24;
  if (d > 12) d = 24 - d;
  const dawn = Math.exp(-((d / MIST.spread) ** 2));
  return clamp01(Math.max(dawn, night * MIST.night, rain * MIST.rain));
}
