/*
 * The wall round Sector 7 drawn (docs/wall-plan.md Phase 2): the smooth slab in cold blue-grey concrete, out of the
 * city's haze so it's a band round every horizon, fading into the sky far off; past it the grey murk standing on the
 * last of the land (the land itself is world.ts's `buildGround()`). Built at the boot: it's seen from everywhere.
 *
 * Two draws: the slab (one toon material of its own) and the murk (one transparent mesh). Nothing of it is solid yet
 * (walking stops well inside it until Phase 3), and it casts no shadows.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fx, toon } from './kit';
import { SKY_RADIUS } from './bounds';
import { BEYOND, WALL, WALL_HAZE, WALL_LOOK, WALL_OUTER, WALL_RUNS } from './wall';
import type { Tick } from './world';

/** Where the wall's haze starts and ends, as distances from the camera */
const HAZE: [number, number] = [WALL_HAZE.from * SKY_RADIUS, WALL_HAZE.to * SKY_RADIUS];

/**
 * The slab's material: the city's toon shading, its fog swapped for its own haze: a share of the city's haze
 * (`WALL_LOOK.std`, so it stands out of it) and, far off, all the way into the sky's horizon (the fog's colour is
 * the horizon's, sky.ts)
 */
function slabMaterial() {
  const m = toon(WALL_LOOK.face, { fog: true });
  m.name = 'wall';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uHaze = { value: new THREE.Vector2(...HAZE) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec2 uHaze;').replace(
      '#include <fog_fragment>',
      `#ifdef USE_FOG
  {
    float far = smoothstep(uHaze.x, uHaze.y, length(vViewPosition));
    #ifdef FOG_EXP2
      float city = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float city = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, max(far, city * ${WALL_LOOK.std.toFixed(3)}));
  }
#endif`
    );
  };
  m.customProgramCacheKey = () => 'wall-haze';
  return m;
}

/** The slab: each side a box from the ground to the top (the sides meet at the corners, wall.ts `WALL_RUNS`) */
function slabGeometry() {
  const parts = WALL_RUNS.map(({ rect: [x0, z0, x1, z1] }) => new THREE.BoxGeometry(x1 - x0, WALL.h, z1 - z0).translate((x0 + x1) / 2, WALL.h / 2, (z0 + z1) / 2));
  const g = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  return g;
}

/**
 * The murk: a ring of upright sheets past the outer face, one a layer (`BEYOND.murk`), thick at the ground and
 * thinning up to nothing at `BEYOND.h` (its uv's v is how far up), and thinning off far away with the wall's haze
 */
function murkGeometry() {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const sheet = (ax: number, az: number, bx: number, bz: number) => {
    const n = pos.length / 3;
    pos.push(ax, 0, az, bx, 0, bz, bx, BEYOND.h, bz, ax, BEYOND.h, az);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  };
  const [o0, p0, o1, p1] = WALL_OUTER;
  for (const d of BEYOND.murk) {
    const [x0, z0, x1, z1] = [o0 - d, p0 - d, o1 + d, p1 + d];
    sheet(x0, z0, x1, z0);
    sheet(x1, z0, x1, z1);
    sheet(x1, z1, x0, z1);
    sheet(x0, z1, x0, z0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function murkMaterial() {
  return new THREE.ShaderMaterial({
    name: 'wall-murk',
    uniforms: { uColor: { value: new THREE.Color(WALL_LOOK.murk) }, uHaze: { value: new THREE.Vector2(...HAZE) } },
    vertexShader: `varying float vUp; varying float vDist;
void main() {
  vUp = uv.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `uniform vec3 uColor; uniform vec2 uHaze; varying float vUp; varying float vDist;
void main() {
  float a = 0.6 * pow(1.0 - clamp(vUp, 0.0, 1.0), 1.6) * (1.0 - smoothstep(uHaze.x, uHaze.y, vDist));
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

const GREY = new THREE.Color(WALL_LOOK.murk);
const lum = (c: THREE.Color) => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;

/** The wall and the murk past it, at the boot */
export function buildWall(scene: THREE.Scene, tick: (f: Tick) => void) {
  const slab = new THREE.Mesh(slabGeometry(), slabMaterial());
  slab.name = 'wall';
  scene.add(slab);

  const mat = murkMaterial();
  const murk = fx(new THREE.Mesh(murkGeometry(), mat));
  murk.name = 'wall-murk';
  murk.frustumCulled = false;
  scene.add(murk);
  // The murk takes the sky's light: its cold grey as bright as the horizon (the fog's colour, sky.ts), a little of
  // the horizon's own colour in it, so it's pale by day, dark at night, greyer in the rain
  const col = (mat.uniforms.uColor as THREE.IUniform<THREE.Color>).value;
  tick(() => {
    const fog = scene.fog as THREE.FogExp2 | null;
    if (!fog) return;
    const k = THREE.MathUtils.clamp(lum(fog.color) / lum(GREY), 0.08, 1.15);
    col.copy(GREY).multiplyScalar(k).lerp(fog.color, 0.35);
  });
}
