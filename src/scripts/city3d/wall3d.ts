/*
 * The wall round Sector 7 drawn (docs/wall-plan.md Phases 2 and 4): the smooth slab in cold blue-grey concrete,
 * out of the city's haze so it's a band round every horizon, fading into the sky far off; a parapet along each
 * edge of its top with razor wire coiled on it and cameras on posts looking down into the city; floodlights at
 * its foot washing pools of cold light up the inner face at night; past it the grey murk standing on the last of
 * the land (the land itself is world.ts's `buildGround()`). Built at the boot: it's seen from everywhere.
 *
 * Draws: the slab (one toon material of its own), the murk, the wire, the cameras' and the floodlights' bodies,
 * their lenses. Nothing of it casts a shadow.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex, fx, toon } from './kit';
import { SKY_RADIUS } from './bounds';
import { BEYOND, CAMERAS, CULVERT, CULVERTS, FLOOD, FLOODS, SIDE, TOP, WALL, WALL_HAZE, WALL_INNER, WALL_LOOK, WALL_OUTER, WALL_TOP, archY } from './wall';
import { WATER_Y } from './river';
import type { Rect } from './downtown';
import type { Tick } from './world';

/** Where the wall's haze starts and ends, as distances from the camera */
const HAZE: [number, number] = [WALL_HAZE.from * SKY_RADIUS, WALL_HAZE.to * SKY_RADIUS];
/** The floodlights' cold white */
const FLOOD_LIGHT = new THREE.Color('#dbe6ff');

/* ---------- The slab ---------- */

/** A shape's arrays as it's put together: positions, normals, and the wash (along the inner face, and whether it's on it) */
interface Arrays {
  pos: number[];
  nor: number[];
  wash: number[];
}
type V = [number, number, number];
/** A flat four-sided face, wound to face `n`; `wash` the four corners' distances along the inner face, or none */
function quad(a: Arrays, p: [V, V, V, V], n: V, wash?: [number, number, number, number]) {
  const [p0, p1, p2] = p;
  const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const v = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
  const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const flip = c[0] * n[0] + c[1] * n[1] + c[2] * n[2] < 0;
  const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
  for (const k of order) {
    a.pos.push(...p[k]);
    a.nor.push(...n);
    a.wash.push(wash ? wash[k] : 0, wash ? 1 : 0);
  }
}
/**
 * Four upright faces round a rectangle from `y0` to `y1`, facing into it (`in`) or out of it; on the inner face
 * each side's distance along it from its corner clockwise (wall.ts `alongFace()`), for the floodlights' wash
 */
function uprights(a: Arrays, [x0, z0, x1, z1]: Rect, y0: number, y1: number, inward: boolean, wash = false) {
  const k = inward ? 1 : -1;
  const L = x1 - x0;
  const D = z1 - z0;
  quad(a, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [0, 0, k], wash ? [0, L, L, 0] : undefined);
  quad(a, [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], [-k, 0, 0], wash ? [0, D, D, 0] : undefined);
  quad(a, [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]], [0, 0, -k], wash ? [0, L, L, 0] : undefined);
  quad(a, [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], [k, 0, 0], wash ? [0, D, D, 0] : undefined);
}
/** The flat ring between two rectangles at `y`, facing up */
function ring(a: Arrays, [i0, j0, i1, j1]: Rect, [o0, p0, o1, p1]: Rect, y: number) {
  quad(a, [[o0, y, p0], [o1, y, p0], [i1, y, j0], [i0, y, j0]], [0, 1, 0]);
  quad(a, [[o1, y, p0], [o1, y, p1], [i1, y, j1], [i1, y, j0]], [0, 1, 0]);
  quad(a, [[o1, y, p1], [o0, y, p1], [i0, y, j1], [i1, y, j1]], [0, 1, 0]);
  quad(a, [[o0, y, p1], [o0, y, p0], [i0, y, j0], [i0, y, j1]], [0, 1, 0]);
}
const grow = ([x0, z0, x1, z1]: Rect, d: number): Rect => [x0 - d, z0 - d, x1 + d, z1 + d];

/**
 * The slab with its parapets: the inner face and the outer, each up to the parapets' tops; the walk along the top
 * between the parapets; the parapets' tops and their backs. Closed all round, nothing under the ground
 */
function slabGeometry() {
  const a: Arrays = { pos: [], nor: [], wash: [] };
  const { w: W } = TOP.parapet;
  const H = WALL.h;
  const T = WALL_TOP;
  const innerBack = grow(WALL_INNER, W);
  const outerBack = grow(WALL_OUTER, -W);
  uprights(a, WALL_INNER, 0, T, true, true);
  uprights(a, WALL_OUTER, 0, T, false);
  ring(a, innerBack, outerBack, H);
  ring(a, WALL_INNER, innerBack, T);
  ring(a, outerBack, WALL_OUTER, T);
  uprights(a, innerBack, H, T, false);
  uprights(a, outerBack, H, T, true);
  culvertFrames(a);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(a.nor, 3));
  g.setAttribute('wash', new THREE.Float32BufferAttribute(a.wash, 2));
  return g;
}

/**
 * The slab's material: the city's toon shading, its fog swapped for its own haze: a share of the city's haze
 * (`WALL_LOOK.std`, so it stands out of it) and, far off, all the way into the sky's horizon (the fog's colour is
 * the horizon's, sky.ts). With `flood`, at night the floodlights' pools on the inner face (the slab's): one every `FLOOD.every` along each side,
 * a cone of cold light widening and fading up the face, kept under the bloom's threshold (it's a big surface)
 */
function hazed(m: THREE.MeshToonMaterial, night: THREE.IUniform<number>, flood: boolean) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uHaze = { value: new THREE.Vector2(...HAZE) };
    sh.uniforms.uNight = night;
    sh.uniforms.uFlood = { value: FLOOD_LIGHT };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${flood ? 'attribute vec2 wash;' : 'const vec2 wash = vec2(0.0);'}\nvarying vec2 vWash;\nvarying float vUp;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWash = wash;\nvUp = position.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec2 uHaze;
uniform float uNight;
uniform vec3 uFlood;
varying vec2 vWash;
varying float vUp;`)
      .replace(
        '#include <fog_fragment>',
        `${flood ? '' : '/*'}if (vWash.y > 0.5 && uNight > 0.001) {
    float every = ${FLOOD.every.toFixed(2)};
    float lamp = (floor(vWash.x / every) + 0.5) * every;
    if (lamp < ${SIDE.toFixed(2)}) {
      float d = vWash.x - lamp;
      float spread = 1.4 + 0.42 * vUp;
      float cone = exp(-(d * d) / (spread * spread));
      float up = exp(-vUp / ${FLOOD.reach.toFixed(2)}) * smoothstep(0.0, 1.2, vUp);
      gl_FragColor.rgb += uFlood * cone * up * 0.5 * uNight;
    }
  }${flood ? '' : '*/'}
#ifdef USE_FOG
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
  m.customProgramCacheKey = () => (flood ? 'wall-haze-flood' : 'wall-haze');
  return m;
}
function slabMaterial(night: THREE.IUniform<number>) {
  const m = toon(WALL_LOOK.face, { fog: true });
  m.name = 'wall';
  return hazed(m, night, true);
}

/* ---------- The culverts (Phase 5) ---------- */

/** A box's faces into the arrays (no wash): (x0, y0, z0) to (x1, y1, z1) */
function solidBox(a: Arrays, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2).toNonIndexed();
  const p = g.getAttribute('position');
  const n = g.getAttribute('normal');
  for (let i = 0; i < p.count; i++) {
    a.pos.push(p.getX(i), p.getY(i), p.getZ(i));
    a.nor.push(n.getX(i), n.getY(i), n.getZ(i));
    a.wash.push(0, 0);
  }
  g.dispose();
}
/**
 * Each culvert's frame, in the slab's own concrete: a pier at each end over the channel's slopes and one between
 * each pair of arches, standing proud of the face from the water up to the cap, and a lintel across them all
 */
function culvertFrames(a: Arrays) {
  const C = CULVERT;
  for (const c of CULVERTS) {
    const out = (d: number) => [c.x, c.x + c.dir * d].sort((p, q) => p - q) as [number, number];
    const [px0, px1] = out(C.out);
    const y0 = WATER_Y - 0.2;
    const y1 = WATER_Y + C.cap;
    // (the end piers reach over the slopes to their tops, and a pier's width past them)
    const piers: [number, number][] = [[c.tops[0] - C.pier, c.water[0]], [c.water[1], c.tops[1] + C.pier]];
    for (let k = 1; k < c.bays.length; k++) piers.push([c.bays[k - 1][1], c.bays[k][0]]);
    for (const [z0, z1] of piers) solidBox(a, px0, y0, z0, px1, y1, z1);
    const [lx0, lx1] = out(C.out * 0.8);
    solidBox(a, lx0, y1, c.tops[0] - C.pier, lx1, y1 + C.lintel, c.tops[1] + C.pier);
  }
}
/**
 * The dark under each arch (a flat shape a hair in front of the face, from under the water to the arch's top) and
 * its bars: rods `CULVERT.bar` apart up to the arch, two rails across. One geometry coloured per vertex
 */
function culvertDark() {
  const C = CULVERT;
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const dark = new THREE.Color('#0a0c10');
  const steel = new THREE.Color('#2a3038');
  const put = (g: THREE.BufferGeometry, c: THREE.Color) => {
    const ng = g.index ? g.toNonIndexed() : g;
    const p = ng.getAttribute('position');
    const n = ng.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c.r, c.g, c.b);
    }
    if (ng !== g) ng.dispose();
    g.dispose();
  };
  const bottom = WATER_Y - 0.4;
  for (const cv of CULVERTS) {
    const fx = cv.x + cv.dir * 0.03;
    for (const b of cv.bays) {
      // The arch's outline across (z, y), fanned from the middle of its bottom
      const ring: [number, number][] = [[b[0], bottom]];
      const N = 16;
      for (let k = 0; k <= N; k++) {
        const z = b[0] + ((b[1] - b[0]) * k) / N;
        ring.push([z, archY(b, z)!]);
      }
      ring.push([b[1], bottom]);
      const mid: [number, number] = [(b[0] + b[1]) / 2, bottom];
      const tri: number[] = [];
      for (let k = 0; k < ring.length - 1; k++) {
        const [za, ya] = ring[k];
        const [zb, yb] = ring[k + 1];
        // (wound to face into the city)
        if (cv.dir > 0) tri.push(fx, mid[1], mid[0], fx, ya, za, fx, yb, zb);
        else tri.push(fx, mid[1], mid[0], fx, yb, zb, fx, ya, za);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from({ length: tri.length / 3 }, () => [cv.dir, 0, 0]).flat(), 3));
      put(g, dark);
      // The bars: upright rods to the arch, and two rails across where the arch is high enough for them
      const bx = cv.x + cv.dir * C.barOut;
      for (let z = b[0] + C.bar / 2; z < b[1]; z += C.bar) {
        const top = archY(b, z)!;
        put(new THREE.BoxGeometry(C.barW, top - (WATER_Y - 0.5), C.barW).translate(bx, (top + WATER_Y - 0.5) / 2, z), steel);
      }
      for (const ry of [WATER_Y + 1.1, WATER_Y + C.spring + 0.9]) {
        let [z0, z1] = [b[0], b[1]];
        while (archY(b, z0)! < ry + 0.1 && z0 < z1) z0 += 0.05;
        while (archY(b, z1)! < ry + 0.1 && z1 > z0) z1 -= 0.05;
        if (z1 - z0 > 0.5) put(new THREE.BoxGeometry(C.barW, C.barW * 1.4, z1 - z0).translate(bx, ry, (z0 + z1) / 2), steel);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/* ---------- The top: razor wire and cameras ---------- */

/** One coil of the razor wire across a texture, `COIL` tiles long (the texture repeats along the wall) */
const COIL = 1.4;
function wireTexture() {
  const t = canvasTex(128, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    // A loop of the coil, and the next half a loop on, so the texture repeats seamlessly
    for (const x0 of [-w / 2, 0, w / 2, w]) {
      c.beginPath();
      c.ellipse(x0 + w / 4, h / 2, w / 3, h / 2 - 3, 0.35, 0, Math.PI * 2);
      c.stroke();
    }
    // Barbs along it
    c.lineWidth = 2;
    for (let k = 0; k < 12; k++) {
      const x = (k / 12) * w;
      const y = h / 2 + Math.sin((k / 12) * Math.PI * 4) * (h / 2 - 6);
      c.beginPath();
      c.moveTo(x - 4, y - 4);
      c.lineTo(x + 4, y + 4);
      c.stroke();
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
/** The wire along one parapet: an upright ribbon on its middle, its coils repeating along it */
function wireRibbon(pos: number[], uv: number[], idx: number[], r: Rect, y: number) {
  const [x0, z0, x1, z1] = r;
  const corners: [number, number][] = [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
    [x0, z0],
  ];
  let s = 0;
  for (let k = 0; k < 4; k++) {
    const [ax, az] = corners[k];
    const [bx, bz] = corners[k + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const n = pos.length / 3;
    pos.push(ax, y, az, bx, y, bz, bx, y + TOP.wire, bz, ax, y + TOP.wire, az);
    uv.push(s / COIL, 0, (s + len) / COIL, 0, (s + len) / COIL, 1, s / COIL, 1);
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    s += len;
  }
}
function wireMesh(low: boolean) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const { w: W } = TOP.parapet;
  // (on the inner parapet always; on the outer too but on phones)
  wireRibbon(pos, uv, idx, grow(WALL_INNER, W / 2), WALL_TOP);
  if (!low) wireRibbon(pos, uv, idx, grow(WALL_OUTER, -W / 2), WALL_TOP);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.MeshBasicMaterial({ name: 'wall-wire', color: '#4b525b', map: wireTexture(), alphaTest: 0.4, side: THREE.DoubleSide });
  // (in the FX layer: the ink would draw the ribbon's edges as a black rope)
  return fx(new THREE.Mesh(g, m));
}

/** A box's geometry, `w` across, `h` tall, `d` deep, turned `ry` about y and pitched `rx`, at (x, y, z) */
function box(w: number, h: number, d: number, x: number, y: number, z: number, ry: number, rx = 0) {
  return new THREE.BoxGeometry(w, h, d).rotateX(rx).rotateY(ry).translate(x, y, z);
}

/**
 * The cameras on their posts along the inner parapet, each leaning out over the face and tilted down into the
 * city, a red dot by its lens; and the floodlights at the foot, a squat housing on a concrete base tilted up at
 * the face, its lens lit at night. Bodies in one draw, lenses and dots in two more (their glow follows the night)
 */
function fixtures() {
  const bodies: THREE.BufferGeometry[] = [];
  const lenses: THREE.BufferGeometry[] = [];
  const dots: THREE.BufferGeometry[] = [];
  const top = WALL_TOP;
  for (const c of CAMERAS) {
    // Facing into the city: +z of the box along (nx, nz)
    const ry = Math.atan2(c.nx, c.nz);
    const at = (along: number) => [c.x + c.nx * along, c.z + c.nz * along] as const;
    bodies.push(box(0.14, TOP.post, 0.14, c.x, top + TOP.post / 2, c.z, ry));
    const [ax, az] = at(0.35);
    bodies.push(box(0.12, 0.12, 0.7, ax, top + TOP.post, az, ry));
    const [bx, bz] = at(0.75);
    bodies.push(box(0.34, 0.3, 0.75, bx, top + TOP.post - 0.2, bz, ry, 0.45));
    const [dx, dz] = at(1.16);
    dots.push(box(0.1, 0.1, 0.04, dx, top + TOP.post - 0.38, dz, ry, 0.45));
  }
  for (const f of FLOODS) {
    // Facing the wall: back towards it
    const ry = Math.atan2(-f.nx, -f.nz);
    bodies.push(box(0.9, 0.35, 0.7, f.x, 0.175, f.z, ry));
    bodies.push(box(0.75, 0.5, 0.45, f.x, 0.62, f.z, ry, -0.7));
    const [lx, lz] = [f.x - f.nx * 0.2, f.z - f.nz * 0.2];
    lenses.push(box(0.6, 0.38, 0.04, lx, 0.78, lz, ry, -0.7));
  }
  const merge = (gs: THREE.BufferGeometry[]) => {
    const g = mergeGeometries(gs)!;
    for (const p of gs) p.dispose();
    return g;
  };
  return { bodies: merge(bodies), lenses: merge(lenses), dots: merge(dots) };
}

/* ---------- The murk past it ---------- */

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
  float a = 0.8 * pow(1.0 - clamp(vUp, 0.0, 1.0), 1.2) * (1.0 - smoothstep(uHaze.x, uHaze.y, vDist));
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
/** The floodlights' lenses and the cameras' dots by day and at night (a small, bright dot at night may glow; never a big surface) */
const LENS_DAY = new THREE.Color('#6f7682');
const DOT = new THREE.Color('#ff2a2a');

/** The wall, its top and its lights, and the murk past it, at the boot (`low`: phones, the outer wire left out) */
export function buildWall(scene: THREE.Scene, tick: (f: Tick) => void, low = false) {
  const night: THREE.IUniform<number> = { value: 0 };
  const slab = new THREE.Mesh(slabGeometry(), slabMaterial(night));
  slab.name = 'wall';
  slab.frustumCulled = false;
  scene.add(slab);

  // The culverts' dark arches and bars (Phase 5), in the slab's haze
  const culverts = new THREE.Mesh(culvertDark(), hazed(toon('#ffffff', { fog: true, vertexColors: true }), night, false));
  culverts.name = 'wall-culverts';
  scene.add(culverts);

  const wire = wireMesh(low);
  wire.name = 'wall-wire';
  wire.frustumCulled = false;
  scene.add(wire);

  const f = fixtures();
  const bodies = new THREE.Mesh(f.bodies, toon('#3c424b', { fog: true }));
  bodies.name = 'wall-fixtures';
  scene.add(bodies);
  const lensMat = new THREE.MeshBasicMaterial({ name: 'wall-lens', color: LENS_DAY.clone() });
  const lenses = new THREE.Mesh(f.lenses, lensMat);
  lenses.name = 'wall-lenses';
  scene.add(lenses);
  const dotMat = new THREE.MeshBasicMaterial({ name: 'wall-dot', color: DOT.clone() });
  const dots = new THREE.Mesh(f.dots, dotMat);
  dots.name = 'wall-dots';
  scene.add(dots);

  const mat = murkMaterial();
  const murk = fx(new THREE.Mesh(murkGeometry(), mat));
  murk.name = 'wall-murk';
  murk.frustumCulled = false;
  scene.add(murk);
  // The murk takes the sky's light: its cold grey as bright as the horizon (the fog's colour, sky.ts), a touch of the
  // horizon's own colour in it, so it's pale by day and dark at night, but always grey against the sky's blue.
  // The floodlights come on with the night, their lenses with them; the cameras' dots are dim by day, bright at night
  const col = (mat.uniforms.uColor as THREE.IUniform<THREE.Color>).value;
  tick((env) => {
    night.value = env.night;
    lensMat.color.copy(LENS_DAY).lerp(FLOOD_LIGHT, env.night).multiplyScalar(1 + 0.25 * env.night);
    dotMat.color.copy(DOT).multiplyScalar(0.45 + 1.15 * env.night);
    const fog = scene.fog as THREE.FogExp2 | null;
    if (!fog) return;
    const k = THREE.MathUtils.clamp(lum(fog.color) / lum(GREY), 0.08, 1.15);
    col.copy(GREY).multiplyScalar(k * 0.85).lerp(fog.color, 0.15);
  });
}
