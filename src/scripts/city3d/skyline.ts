/*
 * Uptown's skyline at night (docs/finance-plan.md Phase 6, the owner's pick:
 * lived-in office lights; DOM-free, tested in tests/skyline.test.ts).
 *
 * - **The offices' lights** (`officeShare()`): how much of the curtain walls'
 *   lit windows (the atlas's light map, about half its windows) stay on at an
 *   hour: all through the working day and the evening, thinning out after
 *   ten, a few late workers and cleaners through the small hours, coming
 *   back on from five. highrise3d.ts switches them in sections (`OFFICE`:
 *   a few bays wide, a floor high), each its own hash (`officeHash()`, the
 *   shader's), on while its hash is under the share.
 * - **The warning lights** (`beaconOn()`): the red lights on every mast and
 *   tip flash together, `BEACON` on in each period, as obstruction lights do.
 */

/** The hours (0-24) and the share of the light map's windows on at each, between them eased in a straight line */
const SHARE: [number, number][] = [
  [0, 0.42],
  [1, 0.3],
  [5, 0.28],
  [7, 1],
  [19, 1],
  [22, 0.85],
  [24, 0.42],
];
/** How much of the offices' lights are on at an hour (0-24) */
export function officeShare(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 1; i < SHARE.length; i++) {
    const [h1, s1] = SHARE[i];
    if (h <= h1) {
      const [h0, s0] = SHARE[i - 1];
      return s0 + ((s1 - s0) * (h - h0)) / (h1 - h0);
    }
  }
  return SHARE[0][1];
}

/** A section of offices switched together: this wide along a facade (world units, both ways) and a floor high */
export const OFFICE = { w: 3, h: 1 };
/** Each section's own number in 0-1 (the shader's hash, the same sum: a section is on while this is under the share) */
export function officeHash(cx: number, cy: number, cz: number): number {
  const v = Math.sin(cx * 12.9898 + cy * 78.233 + cz * 37.719) * 43758.5453;
  return v - Math.floor(v);
}
/** The GLSL of it, for highrise3d.ts's shader */
export const OFFICE_GLSL = `float officeHash(vec3 c) { return fract(sin(c.x * 12.9898 + c.y * 78.233 + c.z * 37.719) * 43758.5453); }`;

/** The warning lights' flash: its period (s) and how long of it they're on */
export const BEACON = { period: 1.5, on: 0.5 };
export const beaconOn = (t: number) => ((t % BEACON.period) + BEACON.period) % BEACON.period < BEACON.on;
