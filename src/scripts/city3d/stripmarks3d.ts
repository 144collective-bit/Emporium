/*
 * The Neon Mile's landmarks drawn (docs/strip-plan.md Phase 3; the data and the timetables are stripmarks.ts), in the
 * Strip's chunk (strip3d.ts's `register()`). Sites: the welcome sign (its diamond in its own small texture, a neon
 * border, bulbs chasing round it with Wild Ace's, the star), the fountain's nozzles, the volcano (rock, its crater,
 * lava down its sides in a material the tick heats), the Sphere's plinth, pavilion and plaza, the searchlights'
 * drums. On the main thread: the jets (one instanced column and one spray, set from `jetHeights()` every frame), the
 * volcano's flames (one instanced flame), the Sphere (one mesh, its LED skin a shader: an eye, the moon, a planet, a
 * wave, the Emporium's diamond, in turn), the searchlights' beams (one instanced cone, at night). Under reduced
 * motion every show stands at its still frame.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, fx, glowTex, lit, moving, siteMat, toon } from './kit';
import { site } from './tilework';
import { SLAB, type Tick } from './world';
import { BULB, BULBS, beam, box, bulbs, cutout, cyl, mat4, neonOf, sign, starPts } from './resorts3d';
import {
  DRUM,
  ERUPT_STILL,
  ERUPT,
  JETS,
  SEARCHLIGHTS,
  SHOW_STILL,
  SPHERE,
  SPHERE_DOOR,
  VOLCANO,
  WELCOME,
  eruptionAt,
  jetHeights,
  showAt,
} from './stripmarks';
import type { Rect } from './strip';

type Pt = [number, number];

/* ---------- The welcome sign's face ---------- */

const WELCOME_TEX = canvasTex(384, 512, (c) => {
  const [W, H] = [384, 512];
  const dia = () => {
    c.beginPath();
    c.moveTo(W / 2, 4);
    c.lineTo(W - 4, H / 2);
    c.lineTo(W / 2, H - 4);
    c.lineTo(4, H / 2);
    c.closePath();
  };
  c.fillStyle = '#07060c';
  c.fillRect(0, 0, W, H);
  dia();
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a0e4a');
  g.addColorStop(1, '#120826');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 10;
  c.strokeStyle = '#ff3fd2';
  c.stroke();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const line = (text: string, y: number, size: number, col: string) => {
    c.font = `800 ${size}px ${FONT_DISPLAY}`;
    c.shadowColor = col;
    c.shadowBlur = 12;
    c.fillStyle = col;
    c.fillText(text, W / 2, y);
    c.shadowBlur = 0;
  };
  line('WELCOME TO', 168, 40, '#2ef2ff');
  line('THE', 214, 30, '#ffffff');
  line('NEON', 262, 66, '#ffd23a');
  line('MILE', 324, 66, '#ff3fd2');
  line('SECTOR 7', 384, 28, '#2ef2ff');
});
const WELCOME_MAT = siteMat('strip-welcome', lit(new THREE.MeshBasicMaterial({ map: WELCOME_TEX }), 0.95, 1.25));

/* ---------- Paint ---------- */

const CHROME = toon('#c8ccd8');
const DARK = toon('#16141f');
const ROCK = toon('#5a4a44');
const ROCK2 = toon('#7a6658');
const PAVING = toon('#d8d0c2');
const STEEL = toon('#2b2a33');
const GLASS = siteMat('strip-glass-box', lit(toon('#2b3a52', { emissive: '#bfe8ff' }), 0.1, 0.9));
/** The lava down the volcano's sides and in its crater: heated by the tick */
const LAVA = siteMat('strip-lava', new THREE.MeshBasicMaterial({ color: '#ff5a1a', toneMapped: true }));

/** The diamond's outline in its own plane (u across the median, v up), from its bottom point */
const diamond = (w: number, h: number): Pt[] => [
  [0, 0],
  [w / 2, h / 2],
  [0, h],
  [-w / 2, h / 2],
];

function welcome(b: Batch, low: boolean, chase: THREE.Matrix4[][]) {
  const W = WELCOME;
  const top = SLAB + W.y0 + W.h;
  // The posts: chrome, from the median up to the diamond's middle
  for (const z of W.posts) box(b, W.x - W.post, SLAB, z - W.post, W.x + W.post, SLAB + W.y0 + W.h / 2, z + W.post, CHROME);
  // The diamond: a dark slab, its two faces in the sign's own texture (west and east)
  const outline = diamond(W.w, W.h);
  const shape = new THREE.Shape(outline.map(([u, v]) => new THREE.Vector2(u, v)));
  const slab = new THREE.ExtrudeGeometry(shape, { depth: W.thick, bevelEnabled: false }).translate(0, 0, -W.thick / 2);
  // (in the shape's plane x is across the median (world z), y up; turned so its faces look along the boulevard)
  b.add(slab.rotateY(Math.PI / 2).translate(W.x, SLAB + W.y0, W.z), DARK);
  for (const side of [1, -1]) {
    const g = new THREE.ShapeGeometry(shape);
    const pos = g.attributes.position;
    const uv: number[] = [];
    for (let i = 0; i < pos.count; i++) uv.push(pos.getX(i) / W.w + 0.5, pos.getY(i) / W.h);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    // (facing +x or -x, laid a little proud of the slab; mirrored on the west face so it reads from there too)
    g.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2).translate(W.x + side * (W.thick / 2 + 0.012), SLAB + W.y0, W.z);
    b.add(g, WELCOME_MAT);
  }
  // A neon border round both faces, bulbs chasing round it
  const nc = neonOf('#ff3fd2');
  for (const side of [1, -1]) {
    const x = W.x + side * (W.thick / 2 + 0.05);
    outline.forEach((p, i) => {
      const q = outline[(i + 1) % outline.length];
      beam(b, [x, SLAB + W.y0 + p[1], W.z + p[0]], [x, SLAB + W.y0 + q[1], W.z + q[0]], 0.07, nc);
      if (!low) bulbs(chase, [x + side * 0.04, SLAB + W.y0 + p[1] * 0.97 + 0.07, W.z + p[0] * 0.92], [x + side * 0.04, SLAB + W.y0 + q[1] * 0.97 + 0.07, W.z + q[0] * 0.92], 0.28);
    });
  }
  // The star over its top point, on a short stalk
  cyl(b, 0.05, W.star * 0.6, W.x, top, W.z, CHROME, 6);
  cutout(b, starPts(5, W.star, 0.42), W.x, top + W.star * 1.3, W.z, [1, 0], neonOf('#ffd23a'), 0.1);
}

/* ---------- The fountain's nozzles and lights ---------- */

function nozzles(b: Batch) {
  const lights: THREE.Matrix4[] = [];
  for (const j of JETS) lights.push(mat4(j.x, SLAB + 0.255, j.z, 0, j.kind === 'shooter' ? 0.32 : 0.18, 1));
  b.instances(new THREE.CylinderGeometry(1, 1, 0.012, 10).translate(0, 0, 0), neonOf('#bfe8ff'), lights);
}

/* ---------- The volcano ---------- */

function volcano(b: Batch, low: boolean) {
  const V = VOLCANO;
  const [x, z] = V.at;
  const y0 = SLAB + 0.1;
  // A rugged cone: its slopes, a lip round the crater, rocks at its foot
  const prof = [
    new THREE.Vector2(V.r0, 0),
    new THREE.Vector2(V.r0 * 0.72, V.h * 0.32),
    new THREE.Vector2(V.r0 * 0.5, V.h * 0.66),
    new THREE.Vector2(V.r1 + 0.18, V.h),
    new THREE.Vector2(V.r1, V.h - 0.05),
    new THREE.Vector2(V.r1 * 0.6, V.h - 0.5),
  ];
  b.add(new THREE.LatheGeometry(prof, low ? 9 : 13).translate(x, y0, z), ROCK);
  // The crater's floor, molten
  b.add(new THREE.CircleGeometry(V.r1 * 0.62, 12).rotateX(-Math.PI / 2).translate(x, y0 + V.h - 0.48, z), LAVA);
  // Lava down its sides: narrow strips on the slope
  const streaks = low ? 5 : 8;
  for (let k = 0; k < streaks; k++) {
    const a = (k / streaks) * Math.PI * 2 + 0.3;
    const [cx, cz] = [Math.cos(a), Math.sin(a)];
    const pts: [number, number][] = [
      [V.r1 + 0.1, V.h - 0.04],
      [V.r0 * 0.5 + 0.02, V.h * 0.66],
      [V.r0 * 0.72 + 0.02, V.h * 0.32 * (1 + (k % 3) * 0.2)],
    ];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ra, ya] = pts[i];
      const [rb, yb] = pts[i + 1];
      const w = 0.16 + (k % 2) * 0.06;
      // (a strip laid just proud of the slope, from ra up to rb down)
      const sx = -cz * w;
      const sz = cx * w;
      const g = new THREE.BufferGeometry();
      const P = (r: number, y: number, s: number) => [x + cx * (r + 0.03) + sx * s, y0 + y, z + cz * (r + 0.03) + sz * s];
      g.setAttribute('position', new THREE.Float32BufferAttribute([...P(ra, ya, -1), ...P(ra, ya, 1), ...P(rb, yb, 1), ...P(rb, yb, -1)], 3));
      g.setIndex([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]);
      g.computeVertexNormals();
      b.add(g, LAVA);
    }
  }
  if (!low)
    b.detail(() => {
      const rocks: THREE.Matrix4[] = [];
      for (let k = 0; k < 14; k++) {
        const a = k * 2.1;
        rocks.push(mat4(x + Math.cos(a) * V.r0 * 0.95, y0 + 0.1, z + Math.sin(a) * V.r0 * 0.95, a, 0.35 + (k % 4) * 0.12, 0.3 + (k % 3) * 0.1));
      }
      b.instances(new THREE.DodecahedronGeometry(1, 0), ROCK2, rocks);
    });
}

/* ---------- The Sphere: its plinth, pavilion and plaza ---------- */

function spherePlaza(b: Batch, low: boolean) {
  const S = SPHERE;
  const [x, z] = S.at;
  const [x0, z0, x1, z1] = S.plaza;
  const mx = (x0 + x1) / 2;
  box(b, x0, SLAB, z0, mx, SLAB + 0.008, z1, PAVING);
  box(b, mx, SLAB, z0, x1, SLAB + 0.008, z1, PAVING);
  // The plinth: a dark steel drum with a ring of light round its top
  cyl(b, S.plinth.r, S.plinth.h, x, SLAB, z, STEEL, low ? 20 : 32);
  b.add(new THREE.TorusGeometry(S.plinth.r + 0.02, 0.06, 6, low ? 32 : 48).rotateX(Math.PI / 2).translate(x, SLAB + S.plinth.h - 0.12, z), neonOf('#a15bff'));
  // A ring of uplights on the paving round its foot
  const ups: THREE.Matrix4[] = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    ups.push(mat4(x + Math.cos(a) * (S.r + 0.6), SLAB + 0.012, z + Math.sin(a) * (S.r + 0.6), 0, 0.22, 1));
  }
  b.instances(new THREE.CylinderGeometry(1, 1, 0.03, 10), neonOf('#2ef2ff'), ups);
  // The pavilion: a glass box under a white canopy, THE SPHERE over its doors
  const [px0, pz0, px1, pz1] = S.pavilion;
  const ph = S.pavilionH;
  box(b, px0 + 0.1, SLAB, pz0 + 0.1, px1 - 0.1, SLAB + ph - 0.25, pz1 - 0.1, GLASS);
  box(b, px0 - 0.4, SLAB + ph - 0.25, pz0 - 0.6, px1 + 0.4, SLAB + ph, pz1 + 0.2, toon('#f1f0f6'));
  beam(b, [px0 - 0.42, SLAB + ph - 0.12, pz0 - 0.62], [px1 + 0.42, SLAB + ph - 0.12, pz0 - 0.62], 0.06, neonOf('#a15bff'));
  sign(b, 'THE SPHERE', x, SLAB + ph + 0.5, pz0 - 0.2, [0, -1], 5, 0.62);
  box(b, x - 3, SLAB + ph, pz0 - 0.25, x + 3, SLAB + ph + 1, pz0 - 0.15, DARK);
  // The doors: dark glass in a chrome frame
  const dz = SPHERE_DOOR.z + 0.35;
  box(b, x - 1, SLAB, dz - 0.12, x + 1, SLAB + 2.3, dz - 0.1, DARK);
  beam(b, [x - 1.05, SLAB + 2.32, dz - 0.14], [x + 1.05, SLAB + 2.32, dz - 0.14], 0.06, CHROME);
}

function drums(b: Batch) {
  for (const [x, y, z] of SEARCHLIGHTS) {
    cyl(b, DRUM.r * 0.9, 0.25, x, SLAB + y, z, STEEL, 10);
    cyl(b, DRUM.r, DRUM.h, x, SLAB + y + 0.25, z, toon('#3a3846'), 12);
    b.add(new THREE.CircleGeometry(DRUM.r * 0.85, 12).rotateX(-Math.PI / 2).translate(x, SLAB + y + 0.25 + DRUM.h + 0.01, z), neonOf('#fff6dc'));
  }
}

/* ---------- The Sphere's skin: a shader of LED slides ---------- */

/** A slide every this many seconds, crossfading over the last one */
const SPHERE_SLIDE = 12;
const SPHERE_SLIDES = 5;
const SPHERE_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SPHERE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uSlide;
  uniform float uFade;
  uniform float uBright;
  varying vec3 vDir;
  const float PI = 3.14159265;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  // The front: towards the boulevard (north, -z)
  vec3 eye(vec3 d, float t) {
    vec3 look = normalize(vec3(sin(t * 0.37) * 0.32, 0.06 + sin(t * 0.21) * 0.1, -1.0));
    float a = acos(clamp(dot(d, look), -1.0, 1.0));
    vec3 col = vec3(0.93, 0.9, 0.88);
    // (veins faintly, the iris with its streaks, the pupil, a highlight)
    col -= vec3(0.0, 0.25, 0.25) * smoothstep(0.62, 0.0, abs(noise(d * 9.0) - 0.5)) * smoothstep(0.7, 1.3, a) * 0.5;
    float ang = atan(d.x - look.x, d.y - look.y);
    vec3 iris = mix(vec3(0.05, 0.45, 0.75), vec3(0.15, 0.85, 0.75), smoothstep(0.55, 0.15, a)) * (0.75 + 0.25 * sin(ang * 23.0));
    col = mix(col, iris, smoothstep(0.58, 0.55, a));
    col = mix(col, vec3(0.02), smoothstep(0.24, 0.21, a));
    col = mix(col, vec3(1.0), smoothstep(0.07, 0.04, length(d - normalize(look + vec3(0.12, 0.14, 0.0)))));
    // The lids: a blink every few seconds
    float blink = smoothstep(0.0, 0.08, abs(fract(t / 5.3) - 0.5) - 0.42);
    float lid = mix(0.0, 0.95, 1.0 - blink);
    col = mix(col, vec3(0.25, 0.08, 0.3), step(1.0 - lid, abs(d.y - look.y * 0.5) + 0.02));
    // Outside the eye: dark
    return mix(col, vec3(0.08, 0.03, 0.12), smoothstep(1.25, 1.35, a));
  }
  vec3 moon(vec3 d, float t) {
    vec3 r = vec3(d.x * cos(t * 0.05) - d.z * sin(t * 0.05), d.y, d.x * sin(t * 0.05) + d.z * cos(t * 0.05));
    float n = noise(r * 3.0) * 0.5 + noise(r * 7.0) * 0.3 + noise(r * 16.0) * 0.2;
    float craters = smoothstep(0.62, 0.7, noise(r * 5.0 + 3.0));
    return vec3(0.82, 0.82, 0.86) * (0.55 + 0.45 * n) - craters * 0.22;
  }
  vec3 planet(vec3 d, float t) {
    float lon = atan(d.x, d.z) + t * 0.08;
    float v = d.y * 7.0 + (noise(vec3(lon * 2.0, d.y * 6.0, 1.0)) - 0.5) * 1.6;
    vec3 col = mix(vec3(0.85, 0.55, 0.3), vec3(0.95, 0.88, 0.72), 0.5 + 0.5 * sin(v * 2.4));
    col = mix(col, vec3(0.6, 0.3, 0.2), smoothstep(0.65, 0.95, sin(v * 1.1)));
    // The great storm, drifting round
    vec2 spot = vec2(mod(lon, 2.0 * PI) - PI, d.y + 0.25);
    col = mix(col, vec3(0.8, 0.25, 0.18), smoothstep(0.26, 0.2, length(spot * vec2(0.6, 1.6))));
    return col;
  }
  vec3 wave(vec3 d, float t) {
    float lon = atan(d.x, d.z);
    float w = sin(d.y * 11.0 + lon * 3.0 - t * 1.8) + 0.5 * sin(d.y * 23.0 - lon * 5.0 - t * 2.7);
    vec3 col = mix(vec3(0.02, 0.18, 0.45), vec3(0.1, 0.6, 0.85), 0.5 + 0.25 * w);
    return mix(col, vec3(0.95, 1.0, 1.0), smoothstep(1.15, 1.4, w));
  }
  vec3 gem(vec3 d, float t) {
    float c = cos(t * 0.3);
    float s = sin(t * 0.3);
    vec3 r = vec3(d.x * c - d.z * s, d.y, d.x * s + d.z * c);
    vec3 col = vec3(0.07, 0.03, 0.14) + vec3(0.6, 0.6, 0.8) * step(0.985, hash(floor(d * 60.0))) * (0.5 + 0.5 * sin(t * 4.0 + hash(floor(d * 60.0)) * 30.0));
    // The diamond on both sides as it turns: magenta to cyan, a white edge
    for (int k = 0; k < 2; k++) {
      vec3 q = k == 0 ? r : -r;
      if (q.z < 0.0) {
        float m = abs(q.x) / 0.42 + abs(q.y) / 0.62;
        vec3 g = mix(vec3(1.0, 0.25, 0.82), vec3(0.18, 0.95, 1.0), clamp(q.x / 0.84 + 0.5, 0.0, 1.0));
        col = mix(col, g, step(m, 0.92));
        col = mix(col, vec3(1.0), step(0.92, m) * step(m, 1.0));
      }
    }
    return col;
  }
  vec3 slide(float k, vec3 d, float t) {
    if (k < 0.5) return eye(d, t);
    if (k < 1.5) return moon(d, t);
    if (k < 2.5) return planet(d, t);
    if (k < 3.5) return wave(d, t);
    return gem(d, t);
  }
  void main() {
    vec3 d = normalize(vDir);
    float a = mod(uSlide, ${SPHERE_SLIDES}.0);
    float b = mod(uSlide + 1.0, ${SPHERE_SLIDES}.0);
    vec3 col = mix(slide(a, d, uTime), slide(b, d, uTime), uFade);
    // The panels: a grid of dots
    float lon = atan(d.x, d.z);
    float lat = asin(clamp(d.y, -1.0, 1.0));
    vec2 cell = fract(vec2(lon, lat) * (90.0 / PI));
    float led = 1.0 - smoothstep(0.34, 0.5, length(cell - 0.5));
    col *= (0.72 + 0.28 * led) * uBright;
    gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
    #include <colorspace_fragment>
  }
`;

/* ---------- Register: the sites, and on the main thread what moves ---------- */

export function registerMarks({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  const W = WELCOME;
  const near: Rect = [W.x - 3, W.z - 3, W.x + 3, W.z + 3];
  site('strip welcome', near, (into) => {
    const b = new Batch();
    const sets: THREE.Matrix4[][] = [[], [], []];
    welcome(b, low, sets);
    sets.forEach((list, k) => b.instances(BULB, BULBS[k], list));
    b.build(into, { cast: true, receive: true });
  });
  const [vx, vz] = VOLCANO.at;
  site('strip volcano', [vx - VOLCANO.r0, vz - VOLCANO.r0, vx + VOLCANO.r0, vz + VOLCANO.r0], (into) => {
    const b = new Batch();
    volcano(b, low);
    b.build(into, { cast: true, receive: true });
  });
  site('strip sphere plaza', SPHERE.plaza, (into) => {
    const b = new Batch();
    spherePlaza(b, low);
    b.build(into, { cast: true, receive: true });
  });
  const jx = JETS.map((j) => j.x);
  const jz = JETS.map((j) => j.z);
  site('strip fountain', [Math.min(...jx), Math.min(...jz), Math.max(...jx), Math.max(...jz)], (into) => {
    const b = new Batch();
    nozzles(b);
    b.build(into, { cast: false, receive: true });
  });
  const sx = SEARCHLIGHTS.map((p) => p[0]);
  const sz = SEARCHLIGHTS.map((p) => p[2]);
  site('strip searchlights', [Math.min(...sx), Math.min(...sz), Math.max(...sx), Math.max(...sz)], (into) => {
    const b = new Batch();
    drums(b);
    b.build(into, { cast: true, receive: true });
  });
  if (!scene) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const now = () => (reduced ? 0 : Date.now() / 1000);

  /* --- The jets: a column and its spray each, set every frame --- */
  const n = JETS.length;
  // (water, in the FX layer: the ink would outline each jet as a solid stick)
  const waterMat = new THREE.MeshBasicMaterial({ color: '#d8f2ff', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, toneMapped: true });
  const sprayMat = new THREE.MeshBasicMaterial({ color: '#eef8ff', transparent: true, opacity: 0.26, depthWrite: false, toneMapped: true });
  const column = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.12, 1, 8, 1, true).translate(0, 0.5, 0), waterMat, n);
  // (the spray falling back round the top: a soft open cone, wider at the bottom)
  const spray = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1.4, 10, 1, true).translate(0, -0.55, 0), sprayMat, n);
  for (const m of [column, spray]) {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    m.userData.keep = true;
    scene.add(fx(moving(m)));
  }
  const heights = new Float32Array(n);
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const V = new THREE.Vector3();
  const S = new THREE.Vector3();
  const setJets = (t: number) => {
    jetHeights(reduced ? SHOW_STILL : showAt(t), heights);
    JETS.forEach((j, i) => {
      const h = heights[i];
      const on = h > 0.04;
      const w = j.kind === 'shooter' ? 1.25 : 1;
      M.compose(V.set(j.x, SLAB + 0.26, j.z), Q, S.set(on ? w : 0.0001, on ? h : 0.0001, on ? w : 0.0001));
      column.setMatrixAt(i, M);
      const r = on ? (0.14 + h * 0.035) * w : 0.0001;
      M.compose(V.set(j.x, SLAB + 0.26 + h, j.z), Q, S.set(r, on ? Math.min(h * 0.35, 0.8 + h * 0.1) : 0.0001, r));
      spray.setMatrixAt(i, M);
    });
    column.instanceMatrix.needsUpdate = true;
    spray.instanceMatrix.needsUpdate = true;
  };

  /* --- The volcano's flames: a plume from the crater with a yellow core, a ring on the water, a glow over it --- */
  const ring = low ? 8 : 12;
  const crater = 5;
  const flameGeo = new THREE.ConeGeometry(0.5, 1, 9, 1, true).translate(0, 0.5, 0);
  const flame = (color: string, count: number) => {
    const m = new THREE.InstancedMesh(flameGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), count);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    m.userData.keep = true;
    scene.add(fx(moving(m)));
    return m;
  };
  const flames = flame('#ff6a1a', crater + ring);
  const core = flame('#ffd23a', crater);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ff7a2a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.set(vx, SLAB + VOLCANO.h + 1.2, vz);
  halo.userData.keep = true;
  scene.add(fx(moving(halo)));
  const setFlames = (t: number) => {
    const e = eruptionAt(reduced ? ERUPT.offset + ERUPT_STILL : t);
    LAVA.color.setRGB(1, 0.35 + 0.35 * e.glow, 0.1 * e.glow).multiplyScalar(0.35 + 0.75 * e.glow);
    (halo.material as THREE.SpriteMaterial).opacity = Math.max(0, e.glow - 0.15) * 0.75;
    halo.scale.setScalar(4 + 6 * e.glow + 3 * e.flames);
    for (let i = 0; i < crater + ring; i++) {
      const inCrater = i < crater;
      const flick = reduced ? 0.85 : 0.75 + 0.25 * Math.sin(t * 11 + i * 2.7) * Math.sin(t * 7.3 + i);
      const h = e.flames * flick * (inCrater ? 4.5 + (i % 2) * 1.8 : 1.6 + (i % 3) * 0.5);
      const a = inCrater ? (i / crater) * Math.PI * 2 + t * 0.7 : ((i - crater) / ring) * Math.PI * 2;
      const rr = inCrater ? VOLCANO.r1 * 0.35 : VOLCANO.r0 + 0.7;
      const y = inCrater ? SLAB + VOLCANO.h - 0.2 : SLAB + 0.27;
      const on = h > 0.05;
      const w = inCrater ? 2.2 - (i % 2) * 0.5 : 1.1;
      M.compose(V.set(vx + Math.cos(a) * rr, y, vz + Math.sin(a) * rr), Q, S.set(on ? w : 0.0001, on ? h : 0.0001, on ? w : 0.0001));
      flames.setMatrixAt(i, M);
      if (inCrater) {
        M.compose(V, Q, S.set(on ? w * 0.5 : 0.0001, on ? h * 0.7 : 0.0001, on ? w * 0.5 : 0.0001));
        core.setMatrixAt(i, M);
      }
    }
    flames.instanceMatrix.needsUpdate = true;
    core.instanceMatrix.needsUpdate = true;
  };

  /* --- The Sphere --- */
  const sphereMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSlide: { value: 0 }, uFade: { value: 0 }, uBright: { value: 0.9 } },
    vertexShader: SPHERE_VERT,
    fragmentShader: SPHERE_FRAG,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(SPHERE.r, low ? 40 : 72, low ? 24 : 40), sphereMat);
  ball.position.set(SPHERE.at[0], SLAB + SPHERE.y, SPHERE.at[1]);
  ball.castShadow = true;
  ball.receiveShadow = false;
  ball.userData.keep = true;
  scene.add(ball);
  const setSphere = (t: number, night: number) => {
    // (kept small: the shader's floats lose precision on a clock's worth of seconds)
    const local = reduced ? 3 : t % (SPHERE_SLIDE * SPHERE_SLIDES * 10);
    const ph = local / SPHERE_SLIDE;
    sphereMat.uniforms.uTime.value = local;
    sphereMat.uniforms.uSlide.value = Math.floor(ph) % SPHERE_SLIDES;
    sphereMat.uniforms.uFade.value = reduced ? 0 : Math.max(0, (ph - Math.floor(ph) - 0.9) / 0.1);
    sphereMat.uniforms.uBright.value = 0.88 + 0.12 * night;
  };

  /* --- The searchlights' beams: one instanced cone, sweeping, at night --- */
  const L = 40;
  const g = new THREE.CylinderGeometry(2.1, 0.22, L, 16, 1, true).translate(0, L / 2, 0);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) col.set([1, 1, 1, Math.max(0, 1 - pos.getY(i) / L) ** 1.6], i * 4);
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const beamMat = new THREE.MeshBasicMaterial({ color: '#dff0ff', vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const beams = new THREE.InstancedMesh(g, beamMat, SEARCHLIGHTS.length);
  beams.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  beams.frustumCulled = false;
  beams.userData.keep = true;
  scene.add(fx(moving(beams)));
  const E = new THREE.Euler();
  const setBeams = (t: number, night: number) => {
    beamMat.opacity = 0.075 * night;
    beams.visible = night > 0.05;
    if (!beams.visible) return;
    SEARCHLIGHTS.forEach(([x, y, z], i) => {
      const a = (reduced ? 0 : t * 0.3) + i * 1.9;
      E.set(Math.sin(a * 0.8) * 0.35, 0, Math.sin(a) * 0.45);
      M.compose(V.set(x, SLAB + y + DRUM.h + 0.3, z), Q.setFromEuler(E), S.set(1, 1, 1));
      beams.setMatrixAt(i, M);
    });
    beams.instanceMatrix.needsUpdate = true;
    Q.identity();
  };

  const t0 = now();
  setJets(t0);
  setFlames(t0);
  setSphere(t0, 0);
  setBeams(t0, 0);
  tick?.((env) => {
    const t = now();
    setJets(t);
    setFlames(t);
    setSphere(t, env.night);
    setBeams(t, env.night);
  });
}
