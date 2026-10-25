/*
 * The lights in the water (docs/water-plan.md, step 2, the owner's pick: the lights only, everywhere, phones too).
 * Which lights and where are waterlights.ts's; this draws them.
 *
 * Every light is a streak on the water, an instance of one quad: the vertex shader lays it where the light's mirror
 * image meets the water as the camera sees it (the line from the camera to the light mirrored under the water), its
 * long side towards the camera, longer the higher the light and the more the wind is up, so it reads as a column of
 * light down the water from wherever you look. The fragment shader breaks it into short ripple strokes of their own
 * widths that drift with the waves, in crisp cartoon edges. The depth test hides any of it that falls under the land (the water lies under
 * the streets); the lake's are clipped to its shore. They come up with the night, fade into the haze and are left
 * out past `FAR`. Nothing passes the bloom's threshold.
 *
 * Two draws: the fixed lights (`build()`, once, after the lamps are placed) and the moving ones (`update()`, every
 * frame after the ticks: the boats' lamps, at most `MOVING`).
 */
import * as THREE from 'three';
import { fx } from './kit';
import { WATER_UNIFORMS } from './world';
import { LAKE_C } from './westlake';
import { movingLights, waterUnder, type Reflected, type WaterLight } from './waterlights';

/** How far from the camera a reflection is drawn */
export const FAR = 240;
/** The most moving lights drawn at once */
export const MOVING = 48;

const VERT = /* glsl */ `
  #include <fog_pars_vertex>
  uniform float wind;
  attribute vec4 light;
  attribute vec4 tint;
  attribute float lake;
  varying vec2 vUv;
  varying vec3 vCol;
  varying float vLen;
  varying float vSeed;
  varying float vFade;
  varying float vLake;
  varying vec3 vPos;
  void main() {
    vec3 L = light.xyz;
    float w = tint.w;
    float h = L.y - w;
    vec3 C = cameraPosition;
    float ch = C.y - w;
    float dist = length(C - L);
    // (none from under the water, nor past FAR: folded away out of the frame)
    if (ch < 0.05 || h < 0.05 || dist > ${FAR.toFixed(1)}) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    // Where the light's mirror image meets the water, seen from the camera
    vec3 M = vec3(L.x, w - h, L.z);
    vec3 P = C + (M - C) * (ch / (ch + h));
    vec2 toCam = C.xz - P.xz;
    float dc = length(toCam);
    vec2 d = dc > 1e-3 ? toCam / dc : vec2(0.0, 1.0);
    vec2 side = vec2(-d.y, d.x);
    // Long towards the camera (the ripples stretch it): more the higher the light and the lower the eye, and in the wind
    float len = (0.5 + h * 0.3) * (1.0 + wind * 3.0) * (0.7 + min(1.6, dc / max(ch, 0.5) * 0.12));
    vec2 xz = P.xz + d * position.y * len + side * position.x * light.w;
    vPos = vec3(xz.x, w + 0.02, xz.y);
    vec4 mvPosition = viewMatrix * vec4(vPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vUv = position.xy;
    vCol = tint.rgb;
    vLen = len;
    vSeed = fract(sin(dot(L.xz, vec2(12.9898, 78.233))) * 43758.5453);
    vFade = 1.0 - smoothstep(${(FAR * 0.6).toFixed(1)}, ${FAR.toFixed(1)}, dist);
    vLake = lake;
    #include <fog_vertex>
  }
`;

const FRAG = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float time;
  uniform float night;
  uniform float wind;
  varying vec2 vUv;
  varying vec3 vCol;
  varying float vLen;
  varying float vSeed;
  varying float vFade;
  varying float vLake;
  varying vec3 vPos;
  float band(float x, float e) { float w = max(fwidth(x), 1e-4); return smoothstep(e - w, e + w, x); }
  float h(float n) { return fract(sin(n) * 43758.5453); }
  // The lake's radius at angle a (westlake.ts lakeR())
  float lakeR(float a) { return 24.0 * (1.0 + 0.3 * cos(2.0 * (a - 0.15)) + 0.1 * cos(3.0 * a + 1.1) + 0.05 * cos(5.0 * a + 2.3)); }
  void main() {
    if (vLake > 0.5) {
      vec2 q = vPos.xz - vec2(${LAKE_C[0].toFixed(2)}, ${LAKE_C[1].toFixed(2)});
      if (length(q) > lakeR(atan(q.y, q.x)) - 0.1) discard;
    }
    // Along the streak in world units: a stack of short ripple strokes drifting with the waves, each its own width
    // and a little to one side, fuller in the middle and thinning to the ends (the cartoon glitter)
    float s = vUv.y * vLen;
    float sp = s * 3.2 - time * (1.0 + wind * 4.0) * 1.3 + vSeed * 13.0;
    float i = floor(sp);
    float f = fract(sp);
    float taper = 1.0 - vUv.y * vUv.y;
    float hw = (0.25 + 0.75 * h(i + vSeed * 31.0)) * taper;
    float off = (h(i * 1.7 + 5.0 + vSeed * 7.0) - 0.5) * 0.7 * taper;
    float stroke = (1.0 - band(abs(vUv.x - off), hw)) * band(f, 0.2) * (1.0 - band(f, 0.68));
    float glow = stroke * vFade * night;
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        glow *= exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
      #else
        glow *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
      #endif
    #endif
    if (glow < 0.004) discard;
    gl_FragColor = vec4(vCol * glow * 0.6, 1.0);
    #include <colorspace_fragment>
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms: WATER_UNIFORMS,
  vertexShader: VERT,
  fragmentShader: FRAG,
  fog: true,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
material.name = 'water-reflections';

/** A mesh of `n` streaks, their attributes ready to fill */
function streaks(n: number) {
  const g = new THREE.InstancedBufferGeometry();
  // (a quad -1..1 both ways in its own plane: x across the streak, y along it; the shader lays it on the water)
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const light = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
  const tint = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
  const lake = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
  g.setAttribute('light', light);
  g.setAttribute('tint', tint);
  g.setAttribute('lake', lake);
  g.instanceCount = 0;
  const mesh = new THREE.Mesh(g, material);
  // (laid by the shader wherever the camera is: never culled)
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  fx(mesh);
  const c = new THREE.Color();
  const set = (i: number, r: Reflected) => {
    c.setHex(r.color);
    light.setXYZW(i, r.x, r.y, r.z, r.size);
    tint.setXYZW(i, c.r, c.g, c.b, r.w);
    lake.setX(i, r.lake);
  };
  return { mesh, g, light, tint, lake, set };
}

export function buildReflections(scene: THREE.Scene, fixed: WaterLight[]) {
  const shown = fixed.map(waterUnder).filter((r): r is Reflected => r !== null);
  const still = streaks(Math.max(1, shown.length));
  shown.forEach((r, i) => still.set(i, r));
  still.g.instanceCount = shown.length;
  still.mesh.name = 'water-reflections';
  const moves = streaks(MOVING);
  moves.mesh.name = 'water-reflections-moving';
  for (const a of [moves.light, moves.tint, moves.lake]) a.setUsage(THREE.DynamicDrawUsage);
  scene.add(still.mesh, moves.mesh);
  const now: WaterLight[] = [];
  return {
    /** How many fixed lights show in the water */
    count: shown.length,
    /** The moving lights, every frame after the ticks (the boats' drawings have said where theirs are) */
    update() {
      let n = 0;
      for (const l of movingLights(now, MOVING)) {
        const r = waterUnder(l);
        if (r) moves.set(n++, r);
      }
      moves.g.instanceCount = n;
      if (n) for (const a of [moves.light, moves.tint, moves.lake]) a.needsUpdate = true;
    },
  };
}
