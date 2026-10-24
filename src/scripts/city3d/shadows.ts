/*
 * The sun's shadows, near only (the owner's call; DOM-free, tested in
 * tests/shadows.test.ts): drawn only while walking or driving (not in the
 * City view, not up in an aircraft), round the camera and ahead of it, fading
 * out softly before the edge of the shadow box, so the box itself never shows.
 *
 * - **Where** (`SHADOW`): the shadow box (`reach` either way) is centred
 *   `ahead` of the camera along the way it looks (`shadowCentre()`); the
 *   shadows are full within `fade0` of that centre on the ground and gone by
 *   `fade1`, well inside the box (`MARGIN`), so the box's edge is never seen.
 *   The same sum runs in every lit material's shader (`SHADOW_GLSL`, from the
 *   camera's own view matrix, `patchShadowChunks()`), and lights left out of
 *   the fade (where it's 0) skip sampling the maps altogether.
 * - **Two maps** (`sky.ts`, `shadowmaps.ts`): the city's fixed shadows (the
 *   tiles, the places) in one map, drawn again only when it's due
 *   (`staticDue()`: the centre has moved `move`, the sun has turned `turn`,
 *   `refresh` seconds have gone by, or something new was built), and what
 *   moves (people, cars, Degen, boats, aircraft) in a second map drawn every
 *   frame, much lighter. The shader takes the darker of the two.
 * - Phones draw no shadows (the quality tier).
 */

export const SHADOW = {
  /** The shadow box's half-width (tiles), and how far ahead of the camera its middle is */
  reach: 24,
  ahead: 7,
  /** Full shadows within `fade0` of the middle, none past `fade1` (on the ground) */
  fade0: 13,
  fade1: 19,
  /** The fixed map is drawn again once the middle has moved this far, the sun turned this much (radians) or this long has gone by (s) */
  move: 2.5,
  turn: 0.004,
  refresh: 2,
  /** How quickly the shadows come and go when walking starts or stops (a second's share a frame) */
  ease: 3,
};
/** What's left between the fade's edge and the box's (room for the fixed map's middle to lag behind) */
export const MARGIN = SHADOW.reach - SHADOW.fade1;

/** The shadow box's middle on the ground, `ahead` of the camera along the way it looks (`look`, any length) */
export function shadowCentre(eye: { x: number; z: number }, look: { x: number; z: number }, out: { x: number; z: number }) {
  const l = Math.max(Math.hypot(look.x, look.z), 1e-3);
  out.x = eye.x + (look.x / l) * SHADOW.ahead;
  out.z = eye.z + (look.z / l) * SHADOW.ahead;
  return out;
}

/** How much of the shadow a spot on the ground gets, 1 near the middle to 0 past the fade (the shader's sum) */
export function shadowFade(x: number, z: number, centre: { x: number; z: number }) {
  const d = Math.hypot(x - centre.x, z - centre.z);
  const t = Math.min(1, Math.max(0, (d - SHADOW.fade0) / (SHADOW.fade1 - SHADOW.fade0)));
  return 1 - t * t * (3 - 2 * t);
}

/** Where the fixed map was last drawn from */
export interface FixedMap {
  drawn: boolean;
  x: number;
  y: number;
  z: number;
  dir: [number, number, number];
  t: number;
}
export const newFixedMap = (): FixedMap => ({ drawn: false, x: 0, y: 0, z: 0, dir: [0, 1, 0], t: 0 });

/** Is the fixed map due to be drawn again, for a middle at x, y, z, the sun along `dir` (a unit vector) at time t */
export function staticDue(m: FixedMap, x: number, y: number, z: number, dir: readonly [number, number, number], t: number) {
  if (!m.drawn) return true;
  if (Math.hypot(x - m.x, y - m.y, z - m.z) > SHADOW.move) return true;
  if (dir[0] * m.dir[0] + dir[1] * m.dir[1] + dir[2] * m.dir[2] < Math.cos(SHADOW.turn)) return true;
  return t - m.t > SHADOW.refresh || t < m.t;
}
export function markDrawn(m: FixedMap, x: number, y: number, z: number, dir: readonly [number, number, number], t: number) {
  Object.assign(m, { drawn: true, x, y, z, t });
  m.dir = [dir[0], dir[1], dir[2]];
}

const f = (n: number) => n.toFixed(2);
/**
 * The fade and the two maps, for every lit material: `cityShadow()` (after three's own `getShadow()`s) is the sun's
 * shadow, the darker of the fixed map (light 0) and the moving one (light 1), faded round the shadow box's middle,
 * worked out from the camera exactly as `shadowCentre()` does. Light 0's shadow intensity is how much shadow there is
 * at all (0 in the City view): nothing is sampled where it or the fade is 0.
 */
export const SHADOW_GLSL = /* glsl */ `
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
float cityShadowFade( vec3 viewPos ) {
  vec3 wp = ( viewPos - viewMatrix[ 3 ].xyz ) * mat3( viewMatrix );
  vec3 fw = - vec3( viewMatrix[ 0 ][ 2 ], viewMatrix[ 1 ][ 2 ], viewMatrix[ 2 ][ 2 ] );
  vec2 c = cameraPosition.xz + fw.xz / max( length( fw.xz ), 1e-3 ) * ${f(SHADOW.ahead)};
  return 1.0 - smoothstep( ${f(SHADOW.fade0)}, ${f(SHADOW.fade1)}, distance( wp.xz, c ) );
}
float cityShadow( vec3 viewPos ) {
  float amount = directionalLightShadows[ 0 ].shadowIntensity;
  if ( amount <= 0.0 ) return 1.0;
  float fade = cityShadowFade( viewPos );
  if ( fade <= 0.0 ) return 1.0;
  float s = getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, 1.0, directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] );
  #if NUM_DIR_LIGHT_SHADOWS > 1
  s = min( s, getShadow( directionalShadowMap[ 1 ], directionalLightShadows[ 1 ].shadowMapSize, 1.0, directionalLightShadows[ 1 ].shadowBias, directionalLightShadows[ 1 ].shadowRadius, vDirectionalShadowCoord[ 1 ] ) );
  #endif
  return mix( 1.0, s, amount * fade );
}
#endif
`;

/** three's own line for a directional light's shadow (lights_fragment_begin), which `cityShadow()` takes the place of */
export const DIR_SHADOW_LINE =
  'directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;';
/** Light 0 (the sun) takes both maps; light 1 (the moving map's) only lends its map, it lights nothing */
const DIR_SHADOW_CITY = `#if UNROLLED_LOOP_INDEX == 0
		directLight.color *= ( directLight.visible && receiveShadow ) ? cityShadow( geometryPosition ) : 1.0;
		#endif`;

/** Put the near-only shadows into three's shader chunks (once, before anything compiles): false if they weren't there to patch */
export function patchShadowChunks(chunks: Record<string, string>) {
  const lights = chunks.lights_fragment_begin;
  const pars = chunks.shadowmap_pars_fragment;
  if (lights.includes('cityShadow(')) return true;
  if (!lights.includes(DIR_SHADOW_LINE) || !pars.includes('float getShadow(')) return false;
  chunks.lights_fragment_begin = lights.replace(DIR_SHADOW_LINE, DIR_SHADOW_CITY);
  chunks.shadowmap_pars_fragment = pars + SHADOW_GLSL;
  return true;
}
