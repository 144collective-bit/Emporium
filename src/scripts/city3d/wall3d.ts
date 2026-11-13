/*
 * The wall round Sector 7 drawn (docs/wall-plan.md Phase 2): the smooth slab in cold blue-grey concrete, out of the
 * city's haze so it's a band round every horizon, fading into the sky far off; past it the grey murk standing on the
 * last of the land (the land itself is world.ts's `buildGround()`). Built at the boot: it's seen from everywhere.
 *
 * The slab (one toon material of its own, the parapet and the culverts' arches in it), the murk (one transparent
 * mesh), and since Phases 4 and 5 the top's cameras, the floodlights and the culverts' bars (one dark steel mesh in
 * the same haze), their lights (two small meshes lit at night), the floodlights' wash and the razor wire (the FX
 * layer). It's solid since Phase 3 (wall.ts `WALL_SOLIDS`, in every grid), and it casts no shadows.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex, fx, lit, toon } from './kit';
import { SKY_RADIUS } from './bounds';
import { ARCH, ARCH_SPAN, BEYOND, CAMERAS, CULVERT_FLOOR, CULVERT_X, EDGES, FLOOD, FLOODS, TOP, WALL, WALL_HAZE, WALL_LOOK, WALL_OUTER, WALL_RUNS, archTop, onEdge } from './wall';
import { RIVER } from './layout';
import type { Tick } from './world';

/** Where the wall's haze starts and ends, as distances from the camera */
const HAZE: [number, number] = [WALL_HAZE.from * SKY_RADIUS, WALL_HAZE.to * SKY_RADIUS];

/**
 * The slab's material: the city's toon shading, its fog swapped for its own haze: a share of the city's haze
 * (`WALL_LOOK.std`, so it stands out of it) and, far off, all the way into the sky's horizon (the fog's colour is
 * the horizon's, sky.ts)
 */
function slabMaterial(colour = WALL_LOOK.face, name = 'wall') {
  const m = toon(colour, { fog: true });
  m.name = name;
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

/**
 * The slab: each side a box from the ground to the top (the sides meet at the corners, wall.ts `WALL_RUNS`); the west
 * and east sides carry the culverts over the river's band (Phase 5): the wall there from under the water to the top
 * with the low arch cut through it. On top, the parapet along both edges (Phase 4), in the slab's own concrete.
 */
function slabGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
    parts.push(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  for (const { side, rect: [x0, z0, x1, z1] } of WALL_RUNS) {
    if (side === 'n' || side === 's') {
      box(x0, 0, z0, x1, WALL.h, z1);
      continue;
    }
    box(x0, 0, z0, x1, WALL.h, RIVER[0]);
    box(x0, 0, RIVER[1], x1, WALL.h, z1);
    parts.push(culvertGeometry(x0, x1));
  }
  // The parapet along both edges of the top
  const { h, w } = TOP.parapet;
  for (const e of EDGES)
    for (const v of [0, WALL.thick - w]) {
      const [ax, az] = onEdge(e, e.from - (e.axis === 'x' ? WALL.thick : 0), v);
      const [bx, bz] = onEdge(e, e.to + (e.axis === 'x' ? WALL.thick : 0), v + w);
      box(Math.min(ax, bx), WALL.h, Math.min(az, bz), Math.max(ax, bx), WALL.h + h, Math.max(az, bz));
    }
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
  for (const p of parts) p.dispose();
  return g;
}

/**
 * The culvert through a west or east side (x0 to x1, its thickness): the wall over the river's band from under the
 * water to the top, the arch cut through it (wall.ts `ARCH`, `archTop()`), drawn as an outline extruded through the
 * wall
 */
function culvertGeometry(x0: number, x1: number) {
  const [a, b] = ARCH_SPAN;
  const shape = new THREE.Shape([
    // (a sill under the water: the opening must lie inside the outline it's cut from)
    new THREE.Vector2(RIVER[0], CULVERT_FLOOR - 1),
    new THREE.Vector2(RIVER[1], CULVERT_FLOOR - 1),
    new THREE.Vector2(RIVER[1], WALL.h),
    new THREE.Vector2(RIVER[0], WALL.h),
  ]);
  const hole: THREE.Vector2[] = [new THREE.Vector2(a, CULVERT_FLOOR)];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const z = a + ((b - a) * i) / n;
    hole.push(new THREE.Vector2(z, archTop(z === a ? a + 1e-6 : z === b ? b - 1e-6 : z)));
  }
  hole.push(new THREE.Vector2(b, CULVERT_FLOOR));
  shape.holes.push(new THREE.Path(hole));
  // (the shape's x is the world's z, its extrusion the wall's thickness along x)
  return new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false })
    .rotateY(-Math.PI / 2)
    .translate(x1, 0, 0);
}

/** The bars across each culvert, in the wall's middle (Phase 5): uprights `gap` apart and two rails, heavy steel */
function barsGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const { gap, r, rails } = ARCH.bars;
  const [a, b] = ARCH_SPAN;
  for (const x of CULVERT_X) {
    for (let z = a + gap / 2; z < b; z += gap) {
      const top = archTop(z) + 0.05;
      parts.push(new THREE.CylinderGeometry(r, r, top - CULVERT_FLOOR, 6, 1, true).translate(x, (top + CULVERT_FLOOR) / 2, z));
    }
    for (const y of rails) parts.push(new THREE.BoxGeometry(0.22, 0.22, b - a).translate(x, y, (a + b) / 2));
  }
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
  for (const p of parts) p.dispose();
  return g;
}

/**
 * What stands on the wall and at its foot (Phase 4), in dark steel: the cameras on their posts along the top's inner
 * edge, each a post, an arm and a housing looking in, and the floodlights' housings against the inner face at its
 * foot. Their lit parts (the cameras' red dots, the floodlights' lenses) are `lights()`'s
 */
function kitGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, yaw: number) => parts.push(g.rotateY(yaw).translate(x, y, z));
  const top = WALL.h;
  for (const c of CAMERAS) {
    at(new THREE.CylinderGeometry(0.07, 0.09, TOP.camera.post, 6, 1, true), c.x, top + TOP.camera.post / 2, c.z, 0);
    // (the arm out over the city, then the housing, longer along the way it looks: +x before turning)
    at(new THREE.BoxGeometry(0.5, 0.08, 0.08).translate(0.25, 0, 0), c.x, top + TOP.camera.post, c.z, c.yaw);
    at(new THREE.BoxGeometry(0.62, 0.26, 0.26).translate(0.62, -0.16, 0), c.x, top + TOP.camera.post, c.z, c.yaw);
  }
  for (const f of FLOODS) at(new THREE.BoxGeometry(FLOOD.d, FLOOD.h, FLOOD.w).translate(0, FLOOD.h / 2, 0), f.x, 0, f.z, f.yaw);
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
  for (const p of parts) p.dispose();
  return g;
}

/** The lit parts: each camera's red dot at its lens, each floodlight's lens on its top (`lit()`: faint by day) */
function lights() {
  const dots: THREE.BufferGeometry[] = [];
  const lenses: THREE.BufferGeometry[] = [];
  const top = WALL.h + TOP.camera.post;
  for (const c of CAMERAS) dots.push(new THREE.BoxGeometry(0.06, 0.06, 0.06).translate(0.95, -0.12, 0).rotateY(c.yaw).translate(c.x, top, c.z));
  for (const f of FLOODS) lenses.push(new THREE.BoxGeometry(FLOOD.d * 0.8, 0.04, FLOOD.w * 0.8).rotateY(f.yaw).translate(f.x, FLOOD.h + 0.02, f.z));
  const merge = (list: THREE.BufferGeometry[]) => {
    const g = mergeGeometries(list.map((p) => (p.index ? p.toNonIndexed() : p)))!;
    for (const p of list) p.dispose();
    return g;
  };
  return {
    dots: new THREE.Mesh(merge(dots), lit(new THREE.MeshBasicMaterial({ color: '#ff2a2a' }), 0.35, 1.9)),
    lenses: new THREE.Mesh(merge(lenses), lit(new THREE.MeshBasicMaterial({ color: '#dfe8ff' }), 0.25, 1.6)),
  };
}

/**
 * The floodlights' wash up the face at night (Phase 4): a soft fan of light on the inner face over each, `wash` high
 * and `spread` wide, brightest at the foot, nothing by day. Added light, kept well under the bloom's threshold so the
 * face never washes out; in the FX layer, so no ink is drawn round it
 */
function washMesh() {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (const f of FLOODS) {
    const e = EDGES.find((q) => q.side === f.side)!;
    const u = e.axis === 'x' ? f.x : f.z;
    // (a hair off the face, into the city)
    const [ax, az] = onEdge(e, u - FLOOD.spread / 2, -0.04);
    const [bx, bz] = onEdge(e, u + FLOOD.spread / 2, -0.04);
    const n = pos.length / 3;
    pos.push(ax, 0, az, bx, 0, bz, bx, FLOOD.wash, bz, ax, FLOOD.wash, az);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    name: 'wall-wash',
    uniforms: { uNight: { value: 0 }, uColor: { value: new THREE.Color('#cfdcff') } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uNight; uniform vec3 uColor; varying vec2 vUv;
void main() {
  float across = 1.0 - pow(abs(vUv.x * 2.0 - 1.0), 2.0);
  // (narrow at the foot, fanning out as it rises, fading to nothing at the top)
  float fan = smoothstep(0.0, 0.35 + 0.65 * vUv.y, across);
  // (clamped: under multisampling a sample off the quad's top edge reads vUv.y a hair past 1, and a negative number
  // to a power is not a number on a real graphics card; nothing times that is still not a number, which the bloom
  // then spreads over the whole picture: the black screens of 2026-11)
  float a = uNight * 0.42 * fan * pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6);
  gl_FragColor = vec4(uColor * a, 1.0);
  #include <colorspace_fragment>
}`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const m = fx(new THREE.Mesh(g, mat));
  m.name = 'wall-wash';
  m.frustumCulled = false;
  return { mesh: m, night: mat.uniforms.uNight as THREE.IUniform<number> };
}

/**
 * The razor wire along the top's inner parapet (Phase 4): coils as an open tube along each side with the coils drawn
 * on a texture that repeats along it (cut out, `alphaTest`: no sorting), a big coil and a thinner strand on top of it
 * (phones leave the strand out: the finest wire); in the FX layer, so the ink doesn't draw it as black ropes
 */
function wireMesh(low: boolean) {
  const tex = canvasTex(128, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    // (overlapping loops: a concertina seen round the tube)
    for (let i = -1; i < 5; i++) {
      c.beginPath();
      c.ellipse(i * 28 + 14, h / 2, 22, h / 2 - 3, 0.5, 0, Math.PI * 2);
      c.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const parts: THREE.BufferGeometry[] = [];
  const { r, small } = TOP.wire;
  const y = WALL.h + TOP.parapet.h;
  for (const e of EDGES)
    for (const [rad, lift] of low ? [[r, r]] : [[r, r], [small, 2 * r + small * 0.6]]) {
      const len = e.to - e.from;
      const g = new THREE.CylinderGeometry(rad, rad, len, 8, 1, true);
      // (the coils' texture along it: a repeat every 1.1 along the run, two round it)
      const uvs = g.getAttribute('uv');
      for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * 2, uvs.getY(i) * (len / 1.1));
      // (lying along the edge, on the inner parapet)
      g.rotateZ(Math.PI / 2);
      if (e.axis === 'z') g.rotateY(Math.PI / 2);
      const [x, z] = onEdge(e, (e.from + e.to) / 2, TOP.parapet.w / 2);
      parts.push(g.translate(x, y + lift, z));
    }
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
  for (const p of parts) p.dispose();
  const mat = new THREE.MeshBasicMaterial({ name: 'wall-wire', color: '#3c434c', map: tex, alphaTest: 0.5, side: THREE.DoubleSide, fog: true });
  const m = fx(new THREE.Mesh(g, mat));
  m.name = 'wall-wire';
  m.frustumCulled = false;
  return m;
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

/** The wall and the murk past it, at the boot; `low`: a phone (the finest wire left out) */
export function buildWall(scene: THREE.Scene, tick: (f: Tick) => void, low = false) {
  const slab = new THREE.Mesh(slabGeometry(), slabMaterial());
  slab.name = 'wall';
  scene.add(slab);

  // The top's cameras and the floodlights at the foot, the bars across the culverts (Phases 4 and 5): dark steel,
  // in the wall's own haze
  const steel = slabMaterial('#3a4048', 'wall-steel');
  const kit = new THREE.Mesh(mergeGeometries([kitGeometry(), barsGeometry()])!, steel);
  kit.name = 'wall-kit';
  scene.add(kit);
  const { dots, lenses } = lights();
  scene.add(fx(dots), fx(lenses));
  scene.add(wireMesh(low));
  const wash = washMesh();
  scene.add(wash.mesh);
  // (and not drawn at all by day, when it adds nothing)
  wash.mesh.visible = false;
  tick((f) => {
    wash.night.value = f.night;
    wash.mesh.visible = f.night > 0.003;
  });

  const mat = murkMaterial();
  const murk = fx(new THREE.Mesh(murkGeometry(), mat));
  murk.name = 'wall-murk';
  murk.frustumCulled = false;
  scene.add(murk);
  // The murk takes the sky's light: its cold grey as bright as the horizon (the fog's colour, sky.ts), a touch of the
  // horizon's own colour in it, so it's pale by day and dark at night, but always grey against the sky's blue
  const col = (mat.uniforms.uColor as THREE.IUniform<THREE.Color>).value;
  tick(() => {
    const fog = scene.fog as THREE.FogExp2 | null;
    if (!fog) return;
    const k = THREE.MathUtils.clamp(lum(fog.color) / lum(GREY), 0.08, 1.15);
    col.copy(GREY).multiplyScalar(k * 0.85).lerp(fog.color, 0.15);
  });
}
