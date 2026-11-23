/**
 * Rooms behind the glass (docs/buildings-plan.md Phase 4, desktops only; which windows and their codes are rooms.ts's):
 * one material for every room in the city, a flat quad over each bare window's painted glass, its shader casting the
 * view into a box behind the wall (interior mapping) and drawing what it meets in Degen's flat colours: the back wall
 * (a sofa or a desk against it, a picture over it), the side walls, the floor and the ceiling, ink where they meet,
 * the glass's sky catching the light at a low angle. By day a room sits darker than the street; at night it takes the
 * painted window's own light (warm, a TV's blue, pink, cyan) or goes dark. One draw a tile, near only.
 *
 * The room's box is the window's size and a little more (it's seen through the window, from in front), its depth in
 * proportion. Its colours come from where the window stands, so each room is its own and stays the same.
 */
import * as THREE from 'three';
import { nightU, siteMat } from './kit';
import { CODE_STEP, DAY_BIT } from './rooms';

export const ROOMS_MAT = siteMat(
  'rooms',
  (() => {
    const m = new THREE.MeshBasicMaterial({ color: '#ffffff', name: 'rooms' });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uNight = nightU;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRoomPos;\nvarying vec3 vRoomN;\nvarying vec2 vRoomUv;')
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          vec4 roomP = vec4(position, 1.0);
          vec3 roomN = normal;
          #ifdef USE_BATCHING
            roomP = batchingMatrix * roomP;
            roomN = mat3(batchingMatrix) * roomN;
          #endif
          vRoomPos = (modelMatrix * roomP).xyz;
          vRoomN = normalize(mat3(modelMatrix) * roomN);
          vRoomUv = uv;`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uNight;\nvarying vec3 vRoomPos;\nvarying vec3 vRoomN;\nvarying vec2 vRoomUv;\n${ROOM_GLSL}`)
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( roomColour(), opacity );');
    };
    m.customProgramCacheKey = () => 'rooms';
    return m;
  })(),
);

/** The room's colours (muted: they're behind glass), the lights', and the glass's sky */
const ROOM_GLSL = /* glsl */ `
const float CODE_STEP = ${CODE_STEP.toFixed(1)};
const float DAY_BIT = ${DAY_BIT.toFixed(1)};
float roomHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
vec3 roomWall(float s) {
  if (s < 0.25) return vec3(0.78, 0.72, 0.62);
  if (s < 0.5) return vec3(0.62, 0.70, 0.66);
  if (s < 0.75) return vec3(0.74, 0.62, 0.64);
  return vec3(0.64, 0.66, 0.76);
}
vec3 roomLight(float l) {
  if (l < 1.5) return vec3(1.0, 0.78, 0.46);
  if (l < 2.5) return vec3(0.56, 0.7, 1.0);
  if (l < 3.5) return vec3(1.0, 0.5, 0.78);
  return vec3(0.45, 0.95, 1.0);
}
vec3 roomColour() {
  // The window (rooms.ts unpackRoomUv())
  float wc = floor(vRoomUv.x * 0.5);
  float fx = vRoomUv.x - 2.0 * wc;
  float whole = floor(vRoomUv.y * 0.5);
  float fy = vRoomUv.y - 2.0 * whole;
  float code = floor(whole / CODE_STEP);
  float W = wc * 0.01;
  float H = (whole - code * CODE_STEP) * 0.01;
  float light = mod(code, DAY_BIT);
  float dayLit = step(DAY_BIT, code);
  // The wall's frame: across it (seen from outside, left to right), up, out of it
  vec3 N = normalize(vRoomN);
  vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), N));
  vec3 V = normalize(vRoomPos - cameraPosition);
  vec3 d = vec3(dot(V, T), V.y, dot(V, N));
  d.z = min(d.z, -1e-3);
  if (abs(d.x) < 1e-4) d.x = 1e-4;
  if (abs(d.y) < 1e-4) d.y = 1e-4;
  // The box behind the glass, from the window's bottom left corner
  vec3 o = vec3(fx * W, fy * H, 0.0);
  float sideM = 0.3 * W + 0.08;
  vec3 lo = vec3(-sideM, -0.45 * H, -(0.9 * W + 0.5));
  vec3 hi = vec3(W + sideM, 1.18 * H, 0.0);
  vec3 tA = (lo - o) / d;
  vec3 tB = (hi - o) / d;
  vec3 tF = max(tA, tB);
  float t = min(min(tF.x, tF.y), tF.z);
  vec3 p = o + d * t;
  // Its colours, from where the window stands
  vec3 centre = vRoomPos - T * (fx - 0.5) * W - vec3(0.0, (fy - 0.5) * H, 0.0);
  float s = roomHash(floor(centre * 4.0));
  vec3 wall = roomWall(s);
  vec3 c;
  float edge;
  if (t == tF.z) {
    // The back wall: a sofa or a desk along its foot, a picture over it
    c = wall;
    float a = lo.x + (hi.x - lo.x) * (0.1 + 0.35 * fract(s * 7.0));
    float b = a + (hi.x - lo.x) * 0.45;
    if (p.x > a && p.x < b && p.y < lo.y + 0.32 * H) c = mix(vec3(0.25, 0.24, 0.32), roomWall(fract(s * 3.0)), 0.35);
    float pa = (lo.x + hi.x) * 0.5 - 0.12 * W + (fract(s * 13.0) - 0.5) * 0.3 * W;
    if (p.x > pa && p.x < pa + 0.24 * W && p.y > 0.45 * H && p.y < 0.8 * H) c = vec3(0.32, 0.3, 0.42);
    edge = min(min(p.x - lo.x, hi.x - p.x), min(p.y - lo.y, hi.y - p.y));
  } else if (t == tF.x) {
    c = wall * 0.84;
    edge = min(min(p.z - lo.z, -p.z), min(p.y - lo.y, hi.y - p.y));
  } else if (d.y < 0.0) {
    c = vec3(0.42, 0.34, 0.3) * (0.9 + 0.2 * fract(s * 5.0));
    edge = min(min(p.x - lo.x, hi.x - p.x), p.z - lo.z);
  } else {
    c = vec3(0.86, 0.84, 0.8);
    edge = min(min(p.x - lo.x, hi.x - p.x), p.z - lo.z);
  }
  // Ink where the room's faces meet
  c = mix(vec3(0.07, 0.06, 0.12), c, smoothstep(0.012, 0.02, edge));
  // By day well under the street's light (indoors), warmer where the painted window is lit; at night its light or dark
  vec3 day = c * mix(0.3, 0.7, dayLit) * mix(vec3(0.9, 0.95, 1.05), vec3(1.05, 0.88, 0.66), dayLit);
  vec3 night = light > 0.5 ? min(c * roomLight(light) * 1.3, vec3(1.0)) : c * 0.12;
  vec3 col = mix(day, night, uNight);
  // The glass: a blue sheen always (so a wall of it still reads as glass), the sky more of it at a glancing look
  float fres = pow(1.0 - abs(d.z), 2.0);
  vec3 sky = mix(vec3(0.2, 0.27, 0.44), vec3(0.05, 0.07, 0.16), uNight);
  col = mix(col, sky, mix(0.4, 0.12, uNight) + fres * mix(0.35, 0.25, uNight));
  // (the colours above are as they'd show on screen, like the atlas's paint: the renderer works in linear light)
  return pow(col, vec3(2.2));
}
`;
