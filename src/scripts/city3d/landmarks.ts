/*
 * The buildings. Seven of them are "spots": links into the Emporium or out
 * to a confirmed channel. Each spot is its own group so it can lift and glow
 * when hovered, with a ring on the ground and a pin above it.
 *
 * Everything here is drawn on the landmarks' original grid (core blocks at
 * 0-9, 11-20 and 22-31). buildLandmarks() moves each landmark whole onto its
 * lot downtown (layout.ts `SEATS` / `seat()`): its meshes, lamps, trees,
 * people and spot. Anything a tick places or compares by position (walker
 * checks, the post office's paper) goes through `design()` too.
 */
import * as THREE from 'three';
import type { SpotId } from '../../lib/city';
import {
  Batch,
  FONT_DISPLAY,
  FONT_MONO,
  PAL,
  canvasTex,
  facadeMat,
  fx,
  glowMat,
  glowTex,
  lit,
  neon,
  neonSign,
  occlude,
  place,
  plane,
  rand,
  rng,
  roundRect,
  sidesBox,
  toon,
} from './kit';
import { rifleGeometry } from './guns';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { parkedCars } from './cars';
import { PLAYER, SOLDIER, createCrowd, createDegen, dancePose, type Outfit } from './character';
import { CLIP_SECONDS, MARCH_STRIDE } from './crowdclips';
import { walker } from './life';
import { SLAB as S, addLamp, addTree, placedMark, shiftPlaced, waterMat, type Tick } from './world';
import { design, seat } from './layout';

export interface Spot {
  id: SpotId;
  group: THREE.Group;
  /** Where the camera looks when it flies in */
  focus: THREE.Vector3;
  /** Rough size, for the fly-in distance */
  size: number;
  /** Where the pin floats */
  pin: THREE.Vector3;
  ring: THREE.Mesh;
}

export interface Idle {
  x: number;
  z: number;
  /** Facing: 0 is +z, PI / 2 is +x */
  ry: number;
  /** Standing height, or for `sit` the seat height */
  y?: number;
  /** What they're doing: looking around (default), chatting, sitting, queueing */
  act?: 'look' | 'chat' | 'sit' | 'queue';
  /** How big (a grown-up by default; kids at play are smaller) */
  scale?: number;
}

export interface LandmarkCtx {
  degen: HTMLImageElement | null;
  logo: THREE.Texture;
  tick: (f: Tick) => void;
  low: boolean;
}

/* ---------- Helpers ---------- */

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const Z = new THREE.Vector3(0, 0, 1);

/** A square beam between two points (lattice members, legs, braces). */
function beam(b: Batch, a: THREE.Vector3, c: THREE.Vector3, t: number, mat: THREE.Material) {
  const dir = c.clone().sub(a);
  const len = dir.length();
  const g = unitBox.clone();
  g.applyMatrix4(
    new THREE.Matrix4().compose(
      a.clone().add(c).multiplyScalar(0.5),
      new THREE.Quaternion().setFromUnitVectors(Z, dir.normalize()),
      V(t, t, len)
    )
  );
  b.add(g, mat);
}

function cylAt(b: Batch, x: number, y: number, z: number, r: number, h: number, mat: THREE.Material, seg = 12, r2 = r) {
  const g = new THREE.CylinderGeometry(r2, r, h, seg);
  g.translate(x, y + h / 2, z);
  b.add(g, mat);
}

/** A box whose four sides share one material and top/bottom another. */
function walls(x: number, y: number, z: number, w: number, h: number, d: number, side: THREE.Material, top: THREE.Material) {
  const m = new THREE.Mesh(sidesBox(w, h, d), [side, top]);
  m.position.set(x + w / 2, y + h / 2, z + d / 2);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** A sign plane facing +z (front) or +x (side). */
function sign(mat: THREE.Material, w: number, h: number, x: number, y: number, z: number, face: 'z' | 'x' = 'z', ry = 0) {
  const p = plane(w, h, mat);
  p.position.set(x, y, z);
  p.rotation.y = face === 'x' ? Math.PI / 2 : ry;
  return fx(p);
}

const signMat = (tex: THREE.Texture, day = 1, night = 2, flicker = 0) =>
  lit(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), day, night, flicker);
const paintMat = (tex: THREE.Texture) => new THREE.MeshToonMaterial({ map: tex, transparent: true, alphaTest: 0.05 });

function spot(scene: THREE.Scene, id: SpotId, focus: THREE.Vector3, size: number, pin: THREE.Vector3): Spot {
  const group = new THREE.Group();
  group.name = id;
  scene.add(group);
  const ring = new THREE.Mesh(new THREE.RingGeometry(size * 0.5, size * 0.5 + 0.14, 72), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(focus.x, S + 0.04, focus.z);
  scene.add(fx(ring));
  return { id, group, focus, size, pin, ring };
}

/* ---------- Textures ---------- */

function stencil(label: string, wood = '#8a5a2b') {
  return canvasTex(256, 160, (ctx) => {
    ctx.fillStyle = wood;
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = '#5b3a1c';
    ctx.lineWidth = 6;
    for (let y = 0; y <= 160; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    ctx.strokeRect(10, 10, 236, 140);
    ctx.font = `700 34px ${FONT_MONO}`;
    ctx.fillStyle = '#f3e3c3';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 82);
  });
}

function hazard(label: string | null, w = 1024, h = 128) {
  return canvasTex(w, h, (ctx) => {
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PAL.ink;
    for (let x = -h; x < w + h; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 32, 0);
      ctx.lineTo(x + 32 - h, h);
      ctx.lineTo(x - h, h);
      ctx.fill();
    }
    if (label) {
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(w * 0.22, 10, w * 0.56, h - 20);
      ctx.fillStyle = PAL.ink;
      ctx.font = `700 ${h * 0.5}px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '8px';
      ctx.fillText(label, w / 2, h / 2 + 2);
    }
  });
}

function brick(cols: number, wall: string) {
  const W = cols * 64;
  const H = 256;
  const map = canvasTex(W, H, (ctx) => {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,0,0,.28)';
    ctx.lineWidth = 2;
    for (let y = 0; y < H; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      for (let x = (y / 12) % 2 ? 0 : 16; x < W; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 12);
        ctx.stroke();
      }
    }
    // Upper-floor windows
    for (let c = 0; c < cols; c++) {
      const x = c * 64 + 14;
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(x - 3, 22, 42, 66);
      ctx.fillStyle = c % 3 === 1 ? '#1c2246' : PAL.warm;
      ctx.fillRect(x, 25, 36, 60);
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(x + 16, 25, 3, 60);
      ctx.fillStyle = '#e8e4f8';
      ctx.fillRect(x - 6, 88, 48, 6);
    }
  });
  const emissiveMap = canvasTex(W, H, (ctx) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    for (let c = 0; c < cols; c++) {
      if (c % 3 === 1) continue;
      ctx.fillStyle = PAL.warm;
      ctx.fillRect(c * 64 + 14, 25, 36, 60);
    }
  });
  return lit(new THREE.MeshToonMaterial({ map, emissiveMap, emissive: '#ffffff' }), 0.1, 1.3);
}

/* ---------- Animated bits ---------- */

function particles(n: number, color: string, size: number) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const mat = new THREE.PointsMaterial({ color, size, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  return fx(new THREE.Points(geo, mat));
}

/* ======================================================================
   Buildings
   ====================================================================== */

/* ---------- The Emporium: a twisting glass cyber arcade ---------- */

/** Podium floor plan, grown outwards by `d`: a square with its street corner cut off. */
const PODIUM = { x0: 11.8, z0: 11.8, x1: 18.0, z1: 18.0, cut: 34 };
function podiumPlan(d: number): [number, number][] {
  const { x0, z0, x1, z1, cut } = PODIUM;
  const c = (Math.SQRT2 - 1) * d;
  return [
    [x0 - d, z0 - d],
    [x1 + d, z0 - d],
    [x1 + d, cut - x1 + c],
    [cut - z1 + c, z1 + d],
    [x0 - d, z1 + d],
  ];
}

/** A flat-topped solid from a floor plan of (x, z) points, standing on y0. */
function planSlab(pts: [number, number][], y0: number, h: number) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}

const unitPlane = new THREE.PlaneGeometry(1, 1);

/* A 3 x 5 pixel font for the LED wall: each glyph is five rows of three bits. */
const PIXEL_FONT: Record<string, number[]> = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7],
  F: [7, 4, 6, 4, 4], G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2],
  K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7], M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2],
  P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5], S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5], Y: [5, 5, 2, 2, 2],
  Z: [7, 1, 2, 4, 7], '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [6, 1, 2, 4, 7], '3': [6, 1, 2, 1, 6],
  '4': [5, 5, 7, 1, 1], '5': [7, 4, 6, 1, 6], '6': [3, 4, 7, 5, 7], '7': [7, 1, 2, 2, 2], '8': [7, 5, 7, 5, 7],
  '9': [7, 5, 7, 1, 6], ' ': [0, 0, 0, 0, 0], '!': [2, 2, 2, 0, 2], ':': [0, 2, 0, 2, 0], '-': [0, 0, 7, 0, 0],
};
function pixelText(c: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, k = 1, centre = true) {
  const w = s.length * 4 * k - k;
  let px = centre ? Math.round(x - w / 2) : x;
  c.fillStyle = color;
  for (const ch of s) {
    const g = PIXEL_FONT[ch] ?? PIXEL_FONT[' '];
    g.forEach((row, r) => {
      for (let b = 0; b < 3; b++) if (row & (4 >> b)) c.fillRect(px + b * k, y + r * k, k, k);
    });
    px += 4 * k;
  }
}
/** A little alien of our own, two frames, 8 x 6. */
const ALIEN = [
  [0x24, 0x7e, 0xdb, 0xff, 0x5a, 0x81],
  [0x24, 0x7e, 0xdb, 0xff, 0xa5, 0x42],
];
function sprite(c: CanvasRenderingContext2D, rows: number[], x: number, y: number, color: string) {
  c.fillStyle = color;
  rows.forEach((row, r) => {
    for (let b = 0; b < 8; b++) if (row & (0x80 >> b)) c.fillRect(x + b, y + r, 1, 1);
  });
}

/**
 * The LED wall's shows, drawn at 64 px wide and played at 8 frames a second.
 * Fixed copy only: nothing here may name or hint at the token.
 */
const WALL_W = 64;
const SHOWS = ['coin', 'invaders', 'eq', 'scores', 'degen'] as const;
function drawWall(c: CanvasRenderingContext2D, H: number, show: (typeof SHOWS)[number], f: number, degen: HTMLImageElement | null) {
  // Each floor of the tower shows one 12 px band of the wall; text sits inside a band so no slab cuts it
  const bands = Math.floor(H / 12);
  const row = (band: number, k = 1) => band * 12 + (k === 2 ? 1 : 3);
  const mid = Math.floor(bands / 2);
  c.fillStyle = '#05040c';
  c.fillRect(0, 0, WALL_W, H);
  if (show === 'coin') {
    if (f % 8 < 5) {
      pixelText(c, 'INSERT', 32, row(mid - 3, 2), '#ffd36b', 2);
      pixelText(c, 'COIN', 32, row(mid - 2, 2), '#ffd36b', 2);
    }
    const w = Math.max(1, Math.round(Math.abs(Math.cos(f * 0.5)) * 5));
    c.fillStyle = '#ffd36b';
    c.fillRect(32 - w, row(mid, 2), w * 2, 10);
    c.fillStyle = '#b8862e';
    c.fillRect(32 - Math.max(1, w - 2), row(mid, 2) + 2, Math.max(2, (w - 2) * 2), 6);
    pixelText(c, 'PLAYER 1', 32, row(mid + 2), '#00eaff');
    if (f % 4 < 3) pixelText(c, 'READY', 32, row(mid + 3), '#00eaff');
  } else if (show === 'invaders') {
    const step = Math.floor(f / 2);
    const dx = (step % 12) - 6;
    const down = Math.floor(step / 12) % 4;
    const cols = ['#ff6ad5', '#a64dff', '#00eaff'];
    pixelText(c, 'SCORE 0420', 32, row(0), '#ffffff');
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) sprite(c, ALIEN[step % 2], 10 + k * 12 + dx, row(2 + r + down), cols[r]);
    const sx = 28 + Math.round(Math.sin(f * 0.3) * 18);
    c.fillStyle = '#7cff9e';
    c.fillRect(sx, row(bands - 1) + 3, 7, 3);
    c.fillRect(sx + 3, row(bands - 1) + 1, 1, 2);
    c.fillStyle = '#ffffff';
    c.fillRect(sx + 3, row(bands - 1) - 6 - ((f * 6) % (H - 30)), 1, 3);
  } else if (show === 'eq') {
    pixelText(c, 'GAME ON', 32, row(0, 2), '#ffffff', 2);
    for (let k = 0; k < 8; k++) {
      const lv = 0.2 + 0.8 * Math.abs(Math.sin(f * 0.37 + k * 1.3) * Math.cos(f * 0.21 + k));
      const n = Math.round(lv * (bands - 2));
      for (let j = 0; j < n; j++) {
        const t = j / (bands - 2);
        c.fillStyle = t < 0.33 ? '#ff2fb9' : t < 0.66 ? '#a64dff' : '#00eaff';
        c.fillRect(2 + k * 7.75, (bands - 1 - j) * 12 + 2, 6, 8);
      }
    }
  } else if (show === 'scores') {
    pixelText(c, 'HI SCORE', 32, row(1, 2), '#ff6ad5', 2);
    const rows = ['1 DEGEN 999990', '2 APE   777770', '3 CHAD  555550', '4 ANON  333330', '5 YOU   000010'];
    const hot = Math.floor(f / 4) % rows.length;
    rows.forEach((txt, i) => pixelText(c, txt, 32, row(3 + i), i === hot ? '#ffffff' : ['#ffd36b', '#00eaff', '#a64dff', '#ff6ad5', '#7cff9e'][i]));
  } else {
    if (degen) {
      const h = (bands - 4) * 12;
      const w = Math.round((degen.width / degen.height) * h);
      c.imageSmoothingEnabled = true;
      c.drawImage(degen, Math.round(32 - w / 2), 24, w, h);
    }
    if (f % 6 < 4) pixelText(c, 'GM DEGENS', 32, row(bands - 1), '#ffffff');
  }
  // LED grid
  c.fillStyle = 'rgba(0,0,0,.35)';
  for (let y = 0; y < H; y += 2) c.fillRect(0, y, WALL_W, 1);
}

/** Hologram light: rim-lit, scanlined, flickering, from pink at the feet to cyan at the head. */
function holoMaterial(base: number, height: number) {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, power: { value: 1 }, base: { value: base }, height: { value: height } },
    // (Skinned: Degen's body bends on its bones; the chunks do nothing on a plain mesh)
    vertexShader: /* glsl */ `
      #include <common>
      #include <skinning_pars_vertex>
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        #include <skinbase_vertex>
        #include <beginnormal_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vec4 wp = modelMatrix * vec4(transformed, 1.0);
        vY = wp.y;
        vec4 mv = viewMatrix * wp;
        vN = normalize(normalMatrix * objectNormal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time; uniform float power; uniform float base; uniform float height;
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        float scan = 0.6 + 0.4 * step(0.45, fract(vY * 9.0 - time * 1.2));
        float t = clamp((vY - base) / height, 0.0, 1.0);
        vec3 col = mix(vec3(1.0, 0.25, 0.8), vec3(0.0, 0.92, 1.0), smoothstep(0.1, 0.8, t));
        gl_FragColor = vec4(col * (0.18 + rim * 0.9) * scan * power, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function emporium(scene: THREE.Scene, ctx: LandmarkCtx, crowd: Idle[]) {
  const CX = 14.7; // tower centre
  const CZ = 14.7;
  const N = 12; // floors
  const FH = 0.82;
  const HS = 2.0; // half the floor plate
  const TWIST = Math.PI / 3; // over the whole height
  const PH = 2.3; // podium height
  const y0 = S + PH + 0.18; // first tower floor, on the podium roof
  const roofY = y0 + N * FH;
  const sp = spot(scene, 'emporium', V(CX, 6.5, CZ), 9.4, V(CX, roofY + 3.9, CZ));
  const g = sp.group;
  const b = new Batch();
  const glassB = new Batch();
  const D45 = Math.PI / 4;
  const N2: [number, number] = [Math.SQRT1_2, Math.SQRT1_2]; // the podium's corner front faces the street corner
  const U2: [number, number] = [Math.SQRT1_2, -Math.SQRT1_2];
  const at = (n: number, u: number): [number, number] => [17 + N2[0] * n + U2[0] * u, 17 + N2[1] * n + U2[1] * u];

  const dark = toon('#1a1730');
  const frame = toon('#2a2448');
  const cabBody = toon('#3e3180');
  const gameTex = canvasTex(128, 128, (c) => {
    c.fillStyle = '#2a1f5c';
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#00eaff';
    c.lineWidth = 3;
    c.strokeRect(1.5, 1.5, 125, 125);
    c.strokeStyle = '#ff2fb9';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(64, 0);
    c.lineTo(64, 128);
    c.moveTo(0, 64);
    c.lineTo(128, 64);
    c.stroke();
  });
  gameTex.wrapS = gameTex.wrapT = THREE.RepeatWrapping;
  gameTex.repeat.set(4, 4);
  const gameFloor = lit(new THREE.MeshBasicMaterial({ map: gameTex }), 1, 1);
  const glassTex = canvasTex(64, 256, (c) => {
    const gr = c.createLinearGradient(0, 0, 64, 0);
    gr.addColorStop(0, 'rgba(255,255,255,.85)');
    gr.addColorStop(0.16, 'rgba(255,255,255,.3)');
    gr.addColorStop(0.45, 'rgba(255,255,255,.55)');
    gr.addColorStop(0.6, 'rgba(255,255,255,.22)');
    gr.addColorStop(1, 'rgba(255,255,255,.7)');
    c.fillStyle = gr;
    c.fillRect(0, 0, 64, 256);
  });
  const glass = lit(new THREE.MeshBasicMaterial({ color: '#bff3ff', map: glassTex, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), 1, 0.45);
  const screens = ['#00eaff', '#ff6ad5', '#a64dff', '#ffd36b'].map((c) => lit(new THREE.MeshBasicMaterial({ color: c }), 0.95, 1.35));
  const ceiling = lit(new THREE.MeshBasicMaterial({ color: '#6b5aa8' }), 0.9, 0.75);
  const r = rng(91);
  const ceilingGeo = unitPlane.clone().rotateX(Math.PI / 2);
  const floorGeo = unitPlane.clone().rotateX(-Math.PI / 2);

  // Place things in a floor's own (rotated) frame
  const rot = (i: number) => (i / N) * TWIST;
  const loc = (th: number, lx: number, lz: number): [number, number] => [CX + lx * Math.cos(th) + lz * Math.sin(th), CZ - lx * Math.sin(th) + lz * Math.cos(th)];
  const boxIn = (bt: Batch, th: number, lx: number, y: number, lz: number, w: number, h: number, d: number, mat: THREE.Material, ry = 0) => {
    const [x, z] = loc(th, lx, lz);
    bt.add(place(unitBox, x, y + h / 2, z, w, h, d, 0, th + ry, 0), mat);
  };
  const planeIn = (bt: Batch, th: number, lx: number, y: number, lz: number, w: number, h: number, mat: THREE.Material, ry: number) => {
    const [x, z] = loc(th, lx, lz);
    bt.add(place(unitPlane, x, y, z, w, h, 1, 0, th + ry, 0), mat);
  };
  const person = (bt: Batch, th: number, lx: number, y: number, lz: number) => {
    boxIn(bt, th, lx, y, lz, 0.12, 0.3, 0.09, toon('#14121f'));
    const [x, z] = loc(th, lx, lz);
    const head = new THREE.SphereGeometry(0.06, 8, 6);
    head.translate(x, y + 0.37, z);
    bt.add(head, toon('#14121f'));
    const capG = new THREE.CylinderGeometry(0.063, 0.063, 0.03, 8);
    capG.translate(x, y + 0.42, z);
    bt.add(capG, toon(r() < 0.5 ? '#e23b3b' : '#00b8d8'));
  };
  /** An arcade cabinet on side k (0..3), s along that side, its screen facing out to the glass. */
  const cabinet = (bt: Batch, th: number, k: number, s: number, y: number, inset = 1.62) => {
    const phi = (k * Math.PI) / 2;
    const nx = Math.sin(phi);
    const nz = Math.cos(phi);
    const lx = nx * inset + Math.cos(phi) * s;
    const lz = nz * inset - Math.sin(phi) * s;
    boxIn(bt, th, lx, y, lz, 0.3, 0.56, 0.22, cabBody, phi);
    const scr = screens[Math.floor(r() * screens.length)];
    planeIn(bt, th, lx + nx * 0.116, y + 0.38, lz + nz * 0.116, 0.22, 0.17, scr, phi);
    // The marquee a touch wider than the body (as wide, their sides flicker against each other)
    boxIn(bt, th, lx + nx * 0.02, y + 0.5, lz + nz * 0.02, 0.31, 0.07, 0.2, scr, phi);
    return [lx, lz, nx, nz] as const;
  };

  /* ----- Podium: the street-level arcade hall ----- */
  b.add(planSlab(podiumPlan(0), S, 0.06), toon('#221c3a'));
  b.add(planSlab(podiumPlan(0.08), S + PH, 0.18), dark);
  const roofEdge = lit(new THREE.MeshBasicMaterial({ color: '#00eaff' }), 0.8, 1.3);
  b.add(planSlab(podiumPlan(0.12), S + PH + 0.05, 0.06), roofEdge);
  // Solid back walls, glass street fronts with slim mullions
  b.box(11.8, S, 11.8, 6.2, PH, 0.12, dark);
  b.box(11.8, S, 11.8, 0.12, PH, 6.2, dark);
  const fronts: [[number, number], [number, number]][] = [
    [
      [11.92, 18.0],
      [16.0, 18.0],
    ],
    [
      [16.0, 18.0],
      [18.0, 16.0],
    ],
    [
      [18.0, 16.0],
      [18.0, 11.92],
    ],
  ];
  for (const [a, c] of fronts) {
    const dx = c[0] - a[0];
    const dz = c[1] - a[1];
    const len = Math.hypot(dx, dz);
    const ryN = Math.atan2(-dz / len, dx / len);
    glassB.add(place(unitPlane, (a[0] + c[0]) / 2, S + PH / 2, (a[1] + c[1]) / 2, len, PH, 1, 0, ryN, 0), glass);
    const n = Math.round(len / 0.7);
    for (let k = 0; k <= n; k++) b.add(place(unitBox, a[0] + (dx * k) / n, S + PH / 2, a[1] + (dz * k) / n, 0.06, PH, 0.06), frame);
  }
  // Inside: claw machines along the front, cabinets along the side, players
  for (let k = 0; k < 5; k++) {
    const x = 12.5 + k * 0.7;
    b.box(x - 0.22, S + 0.06, 17.25, 0.44, 0.5, 0.44, toon(k % 2 ? '#ff6ad5' : '#00b8d8'));
    glassB.add(place(new THREE.BoxGeometry(0.42, 0.5, 0.42), x, S + 0.81, 17.47), glass);
    b.box(x - 0.22, S + 1.06, 17.25, 0.44, 0.1, 0.44, screens[k % 4]);
    for (let p = 0; p < 4; p++) {
      const ball = new THREE.SphereGeometry(0.06, 8, 6);
      ball.translate(x - 0.12 + (p % 2) * 0.22, S + 0.62, 17.37 + Math.floor(p / 2) * 0.18);
      b.add(ball, toon(['#ffd36b', '#ff6ad5', '#7cff9e', '#00eaff'][p]));
    }
  }
  for (let k = 0; k < 5; k++) {
    const z = 12.5 + k * 0.72;
    b.box(17.25, S + 0.06, z - 0.15, 0.22, 0.56, 0.3, frame);
    const scr = new THREE.PlaneGeometry(0.17, 0.22);
    scr.rotateY(Math.PI / 2);
    scr.translate(17.475, S + 0.44, z);
    b.add(scr, screens[(k + 1) % 4]);
    if (k % 2 === 0) person(b, 0, 16.95 - CX, S + 0.06, z - CZ);
  }
  // Glowing floor inside
  const floorTex = canvasTex(256, 256, (c) => {
    c.fillStyle = '#0d0a1c';
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#3b2c80';
    c.lineWidth = 3;
    for (let k = 0; k <= 256; k += 32) {
      c.beginPath();
      c.moveTo(k, 0);
      c.lineTo(k, 256);
      c.moveTo(0, k);
      c.lineTo(256, k);
      c.stroke();
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(0.5, 0.5);
  {
    const fl = new THREE.Mesh(planSlab(podiumPlan(-0.13), S + 0.06, 0.005), lit(new THREE.MeshBasicMaterial({ map: floorTex }), 1, 1));
    g.add(fl);
  }

  // Entrance on the corner: glowing doors, a canopy, the ARCADE sign and the logo above it
  {
    const doorTex = canvasTex(256, 256, (c) => {
      c.fillStyle = '#0b0918';
      c.fillRect(0, 0, 256, 256);
      const gr = c.createLinearGradient(0, 256, 0, 0);
      gr.addColorStop(0, '#ff6ad5');
      gr.addColorStop(1, '#00eaff');
      c.strokeStyle = gr;
      c.lineWidth = 16;
      c.strokeRect(18, 18, 220, 238);
      c.fillStyle = 'rgba(124,244,255,.25)';
      c.fillRect(30, 30, 94, 226);
      c.fillRect(132, 30, 94, 226);
      c.fillStyle = gr;
      c.fillRect(124, 30, 8, 226);
    });
    const [dx0, dz0] = at(0.03, 0);
    const door = sign(signMat(doorTex, 1, 1.25), 1.4, 1.5, dx0, S + 0.8, dz0);
    door.rotation.y = D45;
    g.add(door);
    const [cx, cz] = at(0.55, 0);
    b.add(place(unitBox, cx, S + 1.75, cz, 3.0, 0.12, 1.1, 0, D45, 0), dark);
    b.add(place(unitBox, cx, S + 1.68, cz, 2.9, 0.02, 1.0, 0, D45, 0), lit(new THREE.MeshBasicMaterial({ color: '#c9b8ff' }), 0.8, 1.1));
    const [sx, sz] = at(1.12, 0);
    const arcade = sign(signMat(neonSign('ARCADE', PAL.cyan, { board: null }), 1, 1.5, 0.03), 2.4, 0.6, sx, S + 2.12, sz);
    arcade.rotation.y = D45;
    g.add(arcade);
    const lw = 3.4;
    const lh = lw * (494 / 729);
    const [lx, lz] = at(0.35, 0);
    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(lw, lh),
      lit(new THREE.MeshBasicMaterial({ map: ctx.logo, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide }), 1, 1.25)
    );
    logo.position.set(lx, S + PH + 0.3 + lh / 2, lz);
    logo.rotation.y = D45;
    occlude(logo, ctx.logo);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(lw * 1.45, lh * 1.45), lit(glowMat(PAL.magenta, 1), 0.1, 0.2));
    halo.position.set(lx - 0.1, S + PH + 0.3 + lh / 2, lz - 0.1);
    halo.rotation.y = D45;
    g.add(fx(logo), fx(halo));
    const [ax, az] = at(0.3, -0.9);
    const [bx2, bz2] = at(0.3, 0.9);
    cylAt(b, ax, S + PH + 0.2, az, 0.04, 0.5, frame, 6);
    cylAt(b, bx2, S + PH + 0.2, bz2, 0.04, 0.5, frame, 6);
  }

  /* ----- The tower: fourteen glass floors, each turned a little further ----- */
  const wallFloors: number[] = [];
  for (let i = 0; i < N; i++) {
    const th = rot(i);
    const y = y0 + i * FH;
    boxIn(b, th, 0, y, 0, HS * 2 + 0.1, 0.1, HS * 2 + 0.1, dark);
    {
      const [x, z] = loc(th, 0, 0);
      b.add(place(ceilingGeo, x, y + FH - 0.005, z, HS * 2 - 0.3, 1, HS * 2 - 0.3, 0, th, 0), ceiling);
    }
    boxIn(b, th, 0, y + 0.1, 0, 1.0, FH - 0.1, 1.0, frame);
    {
      const [x, z] = loc(th, 0, 0);
      b.add(place(floorGeo, x, y + 0.102, z, HS * 2 - 0.1, 1, HS * 2 - 0.1, 0, th, 0), gameFloor);
    }
    for (const [cx, cz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      boxIn(b, th, cx * (HS - 0.04), y + 0.1, cz * (HS - 0.04), 0.12, FH - 0.1, 0.12, frame);
    const wall = i >= 1 && i <= N - 2;
    if (wall) wallFloors.push(i);
    for (let k = 0; k < 4; k++) {
      if (wall && k === 0) continue;
      const phi = (k * Math.PI) / 2;
      planeIn(glassB, th, Math.sin(phi) * HS, y + 0.1 + (FH - 0.1) / 2, Math.cos(phi) * HS, HS * 2, FH - 0.1, glass, phi);
    }
    // Game floors behind the glass
    const fy = y + 0.1;
    const kind = i === N - 1 ? 'lounge' : ['cabinets', 'dance', 'racing', 'cabinets'][i % 4];
    if (kind === 'cabinets') {
      for (let k = 1; k < 4; k++)
        for (const s of [-0.95, 0, 0.95]) {
          const [lx, lz, nx, nz] = cabinet(b, th, k, s, fy);
          if (r() < 0.35) person(b, th, lx + nx * 0.3, fy, lz + nz * 0.3);
        }
    } else if (kind === 'dance') {
      const pad = canvasTex(128, 128, (c) => {
        for (let x = 0; x < 4; x++)
          for (let z = 0; z < 4; z++) {
            c.fillStyle = ['#ff2fb9', '#00eaff', '#a64dff', '#ffd36b'][(x + z * 3 + i) % 4];
            c.fillRect(x * 32 + 2, z * 32 + 2, 28, 28);
          }
      });
      const padMesh = new THREE.Mesh(unitPlane, lit(new THREE.MeshBasicMaterial({ map: pad }), 0.9, 1.1));
      const [px, pz] = loc(th, 0.4, 0.4);
      padMesh.position.set(px, fy + 0.012, pz);
      padMesh.rotation.set(-Math.PI / 2, 0, th);
      padMesh.scale.set(1.6, 1.6, 1);
      g.add(padMesh);
      person(b, th, 0.1, fy, 0.3);
      person(b, th, 0.75, fy, 0.65);
      for (const s of [-0.95, 0, 0.95]) cabinet(b, th, 1, s, fy);
      for (const s of [-0.95, 0.95]) cabinet(b, th, 2, s, fy);
    } else if (kind === 'racing') {
      for (let k = 0; k < 4; k++) {
        const s = -1.2 + k * 0.8;
        boxIn(b, th, 1.25, fy, s, 0.34, 0.22, 0.28, toon('#e23b3b'));
        boxIn(b, th, 1.1, fy + 0.22, s, 0.06, 0.28, 0.28, toon('#e23b3b'));
        planeIn(b, th, 1.62, fy + 0.42, s, 0.42, 0.24, screens[k % 4], Math.PI / 2);
        if (k % 2 === 0) person(b, th, 1.25, fy + 0.1, s);
      }
      for (const s of [-0.95, 0.95]) cabinet(b, th, 2, s, fy);
      for (const s of [-0.95, 0, 0.95]) cabinet(b, th, 3, s, fy);
    } else {
      for (const k of [1, 2, 3]) for (const s of [-0.9, 0.9]) boxIn(b, th, Math.sin((k * Math.PI) / 2) * 1.3 + Math.cos((k * Math.PI) / 2) * s, fy, Math.cos((k * Math.PI) / 2) * 1.3 - Math.sin((k * Math.PI) / 2) * s, 0.5, 0.2, 0.3, toon('#5a3a9a'), (k * Math.PI) / 2);
      person(b, th, 0.9, fy, 0.9);
      person(b, th, -0.9, fy, 1.0);
    }
  }
  // Roof deck and the hologram projector
  const thTop = rot(N);
  boxIn(b, thTop, 0, roofY, 0, HS * 2 + 0.2, 0.14, HS * 2 + 0.2, dark);
  cylAt(b, CX, roofY + 0.14, CZ, 0.75, 0.16, frame, 32);
  const projRing = new THREE.TorusGeometry(0.62, 0.05, 6, 40);
  projRing.rotateX(Math.PI / 2);
  projRing.translate(CX, roofY + 0.31, CZ);
  b.add(projRing, lit(new THREE.MeshBasicMaterial({ color: '#00eaff' }), 1, 1.4));
  b.build(g);
  const glassGroup = new THREE.Group();
  glassB.build(glassGroup, { cast: false, receive: false });
  g.add(fx(glassGroup));

  /* ----- The LED wall: one face of the tower, twisting with it, playing pixel shows ----- */
  {
    const H = wallFloors.length * 12;
    const tex = canvasTex(WALL_W, H, () => {});
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    const c = (tex.image as HTMLCanvasElement).getContext('2d')!;
    const mat = lit(new THREE.MeshBasicMaterial({ map: tex }), 1, 1.1);
    // Every floor's panel in one mesh (one draw, one occluder), each with its band of the texture
    const panels = wallFloors.map((i, j) => {
      const geo = new THREE.PlaneGeometry(HS * 2, FH - 0.1);
      const uv = geo.attributes.uv as THREE.BufferAttribute;
      for (let v = 0; v < uv.count; v++) uv.setY(v, (j + uv.getY(v)) / wallFloors.length);
      const th = rot(i);
      const [x, z] = loc(th, 0, HS + 0.01);
      return geo.rotateY(th).translate(x, y0 + i * FH + 0.1 + (FH - 0.1) / 2, z);
    });
    const wall = new THREE.Mesh(mergeGeometries(panels, false)!, mat);
    // Meant to be seen from far away, and changing: never in the Emporium's far form (lod.ts)
    wall.userData.keep = true;
    for (const p of panels) p.dispose();
    occlude(wall, tex);
    g.add(fx(wall));
    let show = 0;
    let frameN = 0;
    let next = 0;
    let nextShow = 7;
    drawWall(c, H, SHOWS[0], 0, ctx.degen);
    tex.needsUpdate = true;
    ctx.tick(({ t }) => {
      if (t < next) return;
      next = t + 0.125;
      frameN++;
      if (t > nextShow) {
        nextShow = t + 7;
        show = (show + 1) % SHOWS.length;
        frameN = 0;
      }
      drawWall(c, H, SHOWS[show], frameN, ctx.degen);
      tex.needsUpdate = true;
    });
  }

  /* ----- Equalizer edges: the corners are four bars, the floor edges pulse up the tower ----- */
  {
    const segs: { kind: 'bar' | 'edge'; i: number; k: number }[] = [];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const mats: THREE.Matrix4[] = [];
    for (let i = 0; i < N; i++) {
      const th = rot(i);
      const y = y0 + i * FH;
      for (let k = 0; k < 4; k++) {
        const cx = k === 0 || k === 3 ? -1 : 1;
        const cz = k < 2 ? -1 : 1;
        const [x, z] = loc(th, cx * (HS + 0.03), cz * (HS + 0.03));
        mats.push(m4.compose(V(x, y + 0.1 + (FH - 0.1) / 2, z), q.setFromEuler(e.set(0, th, 0)), V(0.07, FH - 0.2, 0.07)).clone());
        segs.push({ kind: 'bar', i, k });
        const phi = (k * Math.PI) / 2;
        const [ex, ez] = loc(th, Math.sin(phi) * (HS + 0.05), Math.cos(phi) * (HS + 0.05));
        mats.push(m4.compose(V(ex, y + 0.06, ez), q.setFromEuler(e.set(0, th + phi, 0)), V(HS * 2 + 0.05, 0.035, 0.035)).clone());
        segs.push({ kind: 'edge', i, k });
      }
    }
    const mesh = new THREE.InstancedMesh(unitBox, lit(new THREE.MeshBasicMaterial({ color: '#ffffff' }), 0.55, 1.15), segs.length);
    // (its colours pulse: it stays as it is far away too)
    mesh.userData.keep = true;
    mats.forEach((mm, j) => mesh.setMatrixAt(j, mm));
    const col = new THREE.Color();
    const pink = new THREE.Color('#ff2fb9');
    const violet = new THREE.Color('#8f3dff');
    const cyan = new THREE.Color('#00eaff');
    const white = new THREE.Color('#ffffff');
    const grad = (f: number) => (f < 0.5 ? col.copy(pink).lerp(violet, f * 2) : col.copy(violet).lerp(cyan, (f - 0.5) * 2));
    const paint = (t: number) => {
      const beat = Math.pow(1 - ((t * 2) % 1), 3);
      const level = [0, 1, 2, 3].map((k) => THREE.MathUtils.clamp(0.3 + 0.32 * Math.sin(t * (1.9 + k * 0.45) + k * 1.7) + 0.38 * beat * (k % 2 ? 0.8 : 1), 0.08, 1));
      segs.forEach((s, j) => {
        const f = s.i / (N - 1);
        if (s.kind === 'bar') {
          const top = Math.round(level[s.k] * (N - 1));
          if (s.i === top) col.copy(white);
          else grad(f).multiplyScalar(s.i < top ? 1 : 0.1);
        } else {
          const wave = Math.pow(Math.max(0, Math.sin(s.i * 0.7 - t * 5)), 4);
          grad(f).multiplyScalar(0.15 + 0.85 * Math.max(wave, beat * 0.5));
        }
        mesh.setColorAt(j, col);
      });
      mesh.instanceColor!.needsUpdate = true;
    };
    paint(0);
    g.add(fx(mesh));
    ctx.tick(({ t }) => paint(t));
  }

  /* ----- The hologram: a giant Degen dancing above the roof ----- */
  {
    const holoBase = roofY + 0.32;
    const hs = 2.7;
    const holo = createDegen(PLAYER);
    holo.g.scale.setScalar(hs);
    const mat = holoMaterial(holoBase, 1.25 * hs);
    holo.g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.material = mat;
        m.castShadow = false;
      }
    });
    holo.g.position.set(CX, holoBase, CZ);
    g.add(fx(holo.g));
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.6, 3.6, 24, 1, true), lit(glowMat('#00eaff', 1, null), 0.03, 0.08));
    cone.position.set(CX, holoBase + 1.8, CZ);
    g.add(fx(cone));
    ctx.tick(({ t, night }) => {
      mat.uniforms.time.value = t;
      const glitch = Math.sin(t * 0.9) > 0.985 ? 1 : 0;
      mat.uniforms.power.value = (1.7 - night * 0.4) * (glitch ? 0.4 + Math.random() * 0.6 : 1);
      holo.g.rotation.y = t * 0.45;
      holo.g.position.x = CX + glitch * (Math.random() - 0.5) * 0.25;
      dancePose(holo.pose, t);
      holo.update();
    });
  }

  /* ----- Street level outside: a glowing tile pad, claw machines, the prize booth, a queue ----- */
  {
    const COLS = 18;
    const ROWS = 12;
    const tex = canvasTex(COLS * 8, ROWS * 8, () => {});
    tex.magFilter = THREE.NearestFilter;
    const c = (tex.image as HTMLCanvasElement).getContext('2d')!;
    const tiles = ['#ff2fb9', '#8f3dff', '#00eaff', '#ffd36b'];
    const drawPad = (t: number) => {
      c.fillStyle = '#0b0918';
      c.fillRect(0, 0, COLS * 8, ROWS * 8);
      for (let x = 0; x < COLS; x++)
        for (let y = 0; y < ROWS; y++) {
          const w = Math.sin(Math.hypot(x - COLS / 2, y - ROWS) * 0.7 - t * 3);
          c.globalAlpha = 0.18 + 0.82 * Math.max(0, w) ** 2;
          c.fillStyle = tiles[(x + y) % 4];
          c.fillRect(x * 8 + 1, y * 8 + 1, 6, 6);
        }
      c.globalAlpha = 1;
      tex.needsUpdate = true;
    };
    drawPad(0);
    const pad = new THREE.Mesh(unitPlane, lit(new THREE.MeshBasicMaterial({ map: tex }), 0.85, 1.05));
    const [px, pz] = at(1.35, 0);
    pad.position.set(px, S + 0.012, pz);
    pad.rotation.set(-Math.PI / 2, 0, D45);
    pad.scale.set(3.6, 2.4, 1);
    scene.add(fx(pad));
    let nextPad = 0;
    ctx.tick(({ t }) => {
      if (t < nextPad) return;
      nextPad = t + 0.1;
      drawPad(t);
    });

    const ob = new Batch();
    const obGlass = new Batch();
    for (const [u, col2] of [
      [-1.85, '#ff6ad5'],
      [1.85, '#00b8d8'],
    ] as const) {
      const [x, z] = at(0.55, u);
      ob.add(place(unitBox, x, S + 0.3, z, 0.55, 0.6, 0.55, 0, D45, 0), toon(col2));
      obGlass.add(place(unitBox, x, S + 0.92, z, 0.52, 0.62, 0.52, 0, D45, 0), glass);
      ob.add(place(unitBox, x, S + 1.29, z, 0.58, 0.12, 0.58, 0, D45, 0), screens[u < 0 ? 1 : 0]);
      for (let p = 0; p < 5; p++) {
        const ball = new THREE.SphereGeometry(0.07, 8, 6);
        ball.translate(x + (p % 3) * 0.13 - 0.13, S + 0.68, z + Math.floor(p / 3) * 0.14 - 0.07);
        ob.add(ball, toon(['#ffd36b', '#ff6ad5', '#7cff9e', '#00eaff', '#ffffff'][p]));
      }
      cylAt(ob, x, S + 1.0, z, 0.012, 0.22, toon('#e2b04a'), 6);
      ob.add(place(unitBox, x, S + 0.98, z, 0.12, 0.05, 0.12), toon('#e2b04a'));
    }
    // Prize booth on the east side
    ob.box(18.45, S, 14.2, 0.85, 0.95, 1.0, toon('#5a2a8a'));
    ob.box(18.4, S + 0.95, 14.15, 0.95, 0.08, 1.1, screens[3]);
    ob.box(18.45, S + 1.03, 14.2, 0.85, 0.42, 1.0, toon('#2a2448'));
    const prize = sign(signMat(neonSign('PRIZES', PAL.warm, { board: null }), 1, 1.4), 0.95, 0.24, 19.32, S + 1.24, 14.7, 'x');
    scene.add(prize);
    for (const [x, z] of [
      [19.0, 12.4],
      [12.4, 19.0],
    ]) {
      cylAt(ob, x, S, z, 0.42, 0.36, dark, 16);
      cylAt(ob, x, S + 0.34, z, 0.45, 0.05, roofEdge, 16);
      addTree(x, z, 0.85, false, S + 0.36);
    }
    ob.build(scene);
    const og = new THREE.Group();
    obGlass.build(og, { cast: false, receive: false });
    scene.add(fx(og));
  }

  // A queue along the front, people at the claw machines, someone at the booth
  for (const x of [15.6, 15.05, 14.5, 13.95, 13.4]) crowd.push({ x, z: 18.42, ry: Math.PI / 2, act: 'queue' });
  crowd.push({ x: 19.0, z: 16.6, ry: -2.62 }, { x: 19.5, z: 14.7, ry: -Math.PI / 2 }, { x: 18.75, z: 18.2, ry: -2.17 });
  addLamp(11.6, 11.6, Math.PI / 4);
  addLamp(19.5, 11.6, Math.PI * 0.75);
  addLamp(11.6, 19.5, -Math.PI / 4);
  return sp;
}

function shop(scene: THREE.Scene, ctx: LandmarkCtx, crowd: Idle[]) {
  const sp = spot(scene, 'shop', V(26.1, 1.6, 14.6), 7.4, V(26.1, 5.6, 14.6));
  const g = sp.group;
  const b = new Batch();
  g.add(walls(22.8, S, 12.4, 6.6, 2.8, 4.4, brick(8, '#a8303c'), toon('#4a1a22')));
  b.box(22.7, S + 2.8, 12.3, 6.8, 0.22, 4.6, toon('#6e1d27'));
  b.box(22.75, S, 12.35, 6.7, 0.18, 4.5, toon('#3a1218'));

  // Shopfront: shutter down with "SOON", lit display windows either side
  const shutter = canvasTex(512, 256, (c) => {
    c.fillStyle = '#5f5a7a';
    c.fillRect(0, 0, 512, 256);
    c.fillStyle = '#4a4563';
    for (let y = 0; y < 256; y += 14) c.fillRect(0, y, 512, 5);
    c.save();
    c.translate(256, 140);
    c.rotate(-0.12);
    c.font = `900 120px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 14;
    c.strokeStyle = PAL.ink;
    c.strokeText('SOON', 0, 0);
    c.fillStyle = PAL.pink;
    c.fillText('SOON', 0, 0);
    c.fillRect(-120, 50, 6, 40);
    c.fillRect(60, 54, 6, 30);
    c.restore();
  });
  const sh = plane(2.5, 1.3, new THREE.MeshToonMaterial({ map: shutter }));
  sh.position.set(26.1, S + 0.83, 16.82);
  g.add(sh);
  const display = canvasTex(256, 160, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, 160);
    gr.addColorStop(0, '#9ff8ff');
    gr.addColorStop(1, '#2bb7d6');
    c.fillStyle = gr;
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#1b1830';
    c.beginPath();
    c.moveTo(98, 150);
    c.lineTo(98, 72);
    c.lineTo(70, 92);
    c.lineTo(56, 68);
    c.lineTo(100, 38);
    c.lineTo(156, 38);
    c.lineTo(200, 68);
    c.lineTo(186, 92);
    c.lineTo(158, 72);
    c.lineTo(158, 150);
    c.fill();
    c.fillStyle = PAL.red;
    c.fillRect(112, 70, 32, 10);
  });
  for (const x of [23.75, 28.45]) {
    const w = plane(1.6, 1.0, signMat(display, 1, 1.7));
    w.position.set(x, S + 0.75, 16.82);
    g.add(fx(w));
    b.box(x - 0.85, S + 0.2, 16.8, 1.7, 0.08, 0.1, toon(PAL.ink));
    b.box(x - 0.85, S + 1.25, 16.8, 1.7, 0.08, 0.1, toon(PAL.ink));
  }
  // Striped awning
  const stripes = canvasTex(512, 64, (c) => {
    for (let i = 0; i < 16; i++) {
      c.fillStyle = i % 2 ? '#f3f2f7' : PAL.red;
      c.fillRect(i * 32, 0, 32, 64);
    }
  });
  const awning = new THREE.Mesh(sidesBox(6.3, 0.05, 0.95, [2, 4]), [new THREE.MeshToonMaterial({ map: stripes }), toon('#c22')]);
  awning.position.set(26.1, S + 1.72, 17.2);
  awning.rotation.x = 0.42;
  awning.castShadow = true;
  g.add(awning);

  // Roof sign and the giant bag
  b.box(23.3, S + 3.0, 15.2, 4.1, 1.0, 0.2, toon('#14102a'));
  g.add(sign(signMat(neonSign('DROP 001', PAL.pink, { board: null }), 1, 2.6, 0.06), 4.0, 1.0, 25.35, S + 3.5, 15.42));
  const bagTex = canvasTex(256, 256, (c) => {
    c.fillStyle = '#f3f2f7';
    c.fillRect(0, 0, 256, 256);
    c.font = `900 110px ${FONT_DISPLAY}`;
    c.fillStyle = PAL.red;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('001', 128, 140);
  });
  const bagMat = new THREE.MeshToonMaterial({ map: bagTex });
  const bag = new THREE.Mesh(sidesBox(1.4, 1.7, 1.0), [bagMat, toon('#e8e4f8')]);
  bag.position.set(28.3, S + 3.85, 13.9);
  bag.rotation.y = -0.25;
  bag.castShadow = true;
  g.add(bag);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 6, 16, Math.PI), toon(PAL.ink));
  handle.position.set(28.3, S + 4.7, 13.9);
  handle.rotation.y = -0.25;
  g.add(handle);

  // Graffiti on the side wall
  const mural = canvasTex(512, 256, (c) => {
    c.font = `900 170px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 18;
    c.strokeStyle = PAL.ink;
    c.strokeText('GM', 256, 128);
    const gr = c.createLinearGradient(140, 0, 380, 0);
    gr.addColorStop(0, PAL.pink);
    gr.addColorStop(1, PAL.cyan);
    c.fillStyle = gr;
    c.fillText('GM', 256, 128);
    c.fillStyle = PAL.pink;
    for (const [x, h] of [
      [190, 50],
      [250, 30],
      [320, 60],
    ])
      c.fillRect(x, 190, 7, h);
  });
  const m = plane(2.6, 1.3, paintMat(mural));
  m.position.set(29.41, S + 1.0, 14.6);
  m.rotation.y = Math.PI / 2;
  g.add(m);

  // Sidewalk sign
  const aTex = canvasTex(256, 256, (c) => {
    c.fillStyle = '#14102a';
    c.fillRect(0, 0, 256, 256);
    c.font = `700 52px ${FONT_MONO}`;
    c.textAlign = 'center';
    c.fillStyle = PAL.cyan;
    c.fillText('COMING', 128, 110);
    c.fillStyle = PAL.pink;
    c.fillText('SOON', 128, 176);
  });
  const aMat = new THREE.MeshToonMaterial({ map: aTex });
  const aframe = new THREE.Mesh(sidesBox(0.7, 0.85, 0.05, [4, 5]), [aMat, toon('#14102a')]);
  aframe.position.set(24.6, S + 0.42, 18.3);
  aframe.rotation.x = -0.15;
  aframe.castShadow = true;
  g.add(aframe);
  b.build(g);

  // Parking at the back: two bays along the kerb, a hatch in each
  const pb = new Batch();
  for (const x of [23.3, 25.9, 28.5]) pb.box(x - 0.03, S + 0.006, 11.05, 0.06, 0.005, 1.2, toon('#d9d4ef'));
  pb.build(scene);
  parkedCars(scene, S, [
    ['hatch', 24.6, 11.65, 0, '#00c2ff'],
    ['hatch', 27.2, 11.65, Math.PI, '#ffd23f'],
  ]);

  // The queue for the drop
  // Kept clear of the sidewalk lanes along the kerb
  for (let k = 0; k < 5; k++) crowd.push({ x: 26.1 + (k - 2) * 0.05, z: 17.6 + k * 0.38, ry: Math.PI, act: 'queue' });
  // A couple chatting further along the sidewalk
  crowd.push({ x: 28.6, z: 18.0, ry: 1.07, act: 'chat' }, { x: 29.15, z: 18.28, ry: -2.07, act: 'chat' });
  addLamp(28.0, 19.6, -Math.PI / 2);
  addLamp(30.6, 18.0, Math.PI);
  for (const [x, z] of [
    [30.4, 12.2],
    [30.5, 14.0],
    [30.4, 16.0],
    [30.3, 19.6],
    [22.8, 19.6],
  ])
    addTree(x, z);
  return sp;
}

function workshop(scene: THREE.Scene, ctx: LandmarkCtx) {
  const sp = spot(scene, 'workshop', V(15.3, 1.4, 25.6), 8, V(15.3, 4.1, 25.2));
  const g = sp.group;
  const b = new Batch();
  const ribs = canvasTex(512, 128, (c) => {
    c.fillStyle = '#35588a';
    c.fillRect(0, 0, 512, 128);
    for (let x = 0; x < 512; x += 16) {
      c.fillStyle = 'rgba(0,0,0,.25)';
      c.fillRect(x, 0, 5, 128);
      c.fillStyle = 'rgba(255,255,255,.1)';
      c.fillRect(x + 6, 0, 3, 128);
    }
    c.fillStyle = PAL.ink;
    for (let x = 20; x < 512; x += 96) c.fillRect(x - 3, 18, 58, 30);
    c.fillStyle = PAL.warm;
    for (let x = 20; x < 512; x += 96) c.fillRect(x, 21, 52, 24);
  });
  ribs.wrapS = THREE.RepeatWrapping;
  ribs.repeat.set(1.4, 1);
  const ribGlow = canvasTex(512, 128, (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, 512, 128);
    c.fillStyle = PAL.warm;
    for (let x = 20; x < 512; x += 96) c.fillRect(x, 21, 52, 24);
  });
  ribGlow.wrapS = THREE.RepeatWrapping;
  ribGlow.repeat.set(1.4, 1);
  const wall = lit(new THREE.MeshToonMaterial({ map: ribs, emissiveMap: ribGlow, emissive: '#ffffff' }), 0.1, 1.25);
  g.add(walls(11.8, S, 22.8, 7.0, 2.2, 4.8, wall, toon('#22385a')));

  // Sawtooth roof: three runs, glazing facing the street; the front one is the sign
  const rz = S + 2.2;
  const tooth = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.6, 0), new THREE.Vector2(1.6, 0.9)]);
  const toothGeo = new THREE.ExtrudeGeometry(tooth, { depth: 7.0, bevelEnabled: false });
  for (let k = 0; k < 3; k++) {
    const z0 = 22.8 + k * 1.6;
    const t = new THREE.Mesh(toothGeo, toon('#4b6896'));
    t.rotation.y = -Math.PI / 2;
    t.position.set(18.8, rz, z0);
    t.castShadow = t.receiveShadow = true;
    g.add(t);
    if (k < 2) {
      const glass = plane(7.0, 0.9, lit(new THREE.MeshBasicMaterial({ color: '#5fd6ff' }), 0.7, 1.25));
      glass.position.set(15.3, rz + 0.45, z0 + 1.61);
      g.add(fx(glass));
    }
  }
  g.add(sign(signMat(neonSign('THE WORKSHOP', '#ffb347', { w: 2048, h: 256, size: 190 }), 1, 2.4, 0.04), 7.0, 0.88, 15.3, rz + 0.45, 27.62));

  // The big door, open, the forge glowing inside
  const forge = canvasTex(512, 320, (c) => {
    const gr = c.createRadialGradient(256, 330, 20, 256, 260, 380);
    gr.addColorStop(0, '#ffe2a0');
    gr.addColorStop(0.45, '#ff7a2f');
    gr.addColorStop(1, '#4a1424');
    c.fillStyle = gr;
    c.fillRect(0, 0, 512, 320);
    c.fillStyle = '#1b1830';
    c.fillRect(80, 220, 352, 24);
    c.fillRect(100, 244, 18, 76);
    c.fillRect(394, 244, 18, 76);
    c.fillRect(150, 170, 60, 50);
    c.fillRect(300, 150, 34, 70);
  });
  const door = plane(2.7, 1.65, signMat(forge, 1, 1.8));
  door.position.set(15.3, S + 0.83, 27.61);
  g.add(fx(door));
  b.box(13.85, S, 27.58, 0.12, 1.75, 0.12, toon('#22385a'));
  b.box(16.63, S, 27.58, 0.12, 1.75, 0.12, toon('#22385a'));
  b.box(13.85, S + 1.66, 27.55, 2.9, 0.28, 0.2, toon('#22385a'));
  g.add(sign(new THREE.MeshToonMaterial({ map: hazard(null, 512, 64) }), 2.9, 0.16, 15.3, S + 1.87, 27.66));
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), lit(glowMat('#ff9a4a', 1), 0.12, 0.4));
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(15.3, S + 0.02, 28.3);
  scene.add(fx(spill));

  // Yard: crates for the three tools, drums, a forklift
  for (const [x, label] of [
    [12.3, 'TERMINAL'],
    [14.5, 'DEX'],
    [16.7, 'LAUNCHER'],
  ] as const) {
    const tex = new THREE.MeshToonMaterial({ map: stencil(label) });
    const plain = toon('#8a5a2b');
    const crate = new THREE.Mesh(sidesBox(1.4, 0.8, 0.9), [tex, plain]);
    crate.position.set(x + 0.7, S + 0.4, 28.95);
    crate.castShadow = crate.receiveShadow = true;
    g.add(crate);
  }
  cylAt(b, 18.6, S, 28.4, 0.22, 0.6, toon('#c23b3b'), 12);
  cylAt(b, 19.1, S, 28.8, 0.22, 0.6, toon('#2a6fd6'), 12);
  b.box(18.5, S, 29.6, 0.7, 0.45, 0.5, toon(PAL.craneYellow));
  b.box(18.6, S + 0.45, 29.65, 0.4, 0.35, 0.4, toon('#8fe7ff'));
  b.box(18.35, S, 29.62, 0.08, 1.1, 0.08, toon('#1b1830'));
  b.box(18.35, S, 30.02, 0.08, 1.1, 0.08, toon('#1b1830'));
  b.box(17.9, S + 0.05, 29.65, 0.5, 0.04, 0.08, toon('#1b1830'));
  b.box(17.9, S + 0.05, 29.95, 0.5, 0.04, 0.08, toon('#1b1830'));
  b.build(g);

  // Sparks out of the door
  const n = ctx.low ? 24 : 60;
  const sparks = particles(n, '#ffd27a', 0.09);
  scene.add(sparks);
  const p = sparks.geometry.attributes.position as THREE.BufferAttribute;
  const seeds = Array.from({ length: n }, () => [rand(), (rand() - 0.5) * 2.2, 0.8 + rand() * 1.6, rand() * 0.8]);
  ctx.tick(({ t }) => {
    for (let i = 0; i < n; i++) {
      const [ph, vx, vy, vz] = seeds[i];
      const k = (t * 0.9 + ph) % 1;
      p.setXYZ(i, 14.9 + vx * k, S + 0.55 + vy * k - 3.2 * k * k, 27.7 + (0.5 + vz) * k);
    }
    p.needsUpdate = true;
  });
  for (const [x, z] of [
    [19.5, 23.0],
    [19.4, 24.8],
    [19.5, 26.8],
    [12.0, 30.6],
  ])
    addTree(x, z);
  addLamp(19.5, 30.4, Math.PI);
  return sp;
}

function vault(scene: THREE.Scene, ctx: LandmarkCtx, crowd: Idle[]) {
  const sp = spot(scene, 'vault', V(4.3, 1.6, 15.2), 8, V(4.3, 5.0, 15.2));
  const g = sp.group;
  const b = new Batch();
  const stone = toon('#d9cdb0');
  const stoneDark = toon('#b3a37f');
  const H = 2.6;
  b.box(0.9, S, 11.9, 6.8, 0.3, 4.8, stoneDark);
  b.box(1.0, S, 12.0, 6.6, H, 4.6, stone);
  // Rustication lines
  for (let y = S + 0.6; y < S + H - 0.2; y += 0.45) b.box(0.98, y, 11.98, 6.64, 0.04, 4.64, stoneDark);
  // Steps
  b.box(0.8, S, 16.6, 7.0, 0.12, 1.8, toon('#e3d9c0'));
  // (a touch wider than the plinth behind it: as wide, their ends flicker)
  b.box(0.85, S + 0.12, 16.6, 6.9, 0.12, 1.5, toon('#ebe2cc'));
  b.box(1.0, S + 0.24, 16.6, 6.6, 0.12, 1.25, toon('#f1ead8'));
  // Columns with bases and capitals
  const colTop = S + H - 0.1;
  for (let k = 0; k < 6; k++) {
    const x = 1.45 + k * 1.14;
    b.box(x - 0.24, S + 0.36, 17.21, 0.48, 0.12, 0.48, stone);
    cylAt(b, x, S + 0.48, 17.45, 0.17, colTop - S - 0.6, toon('#f4efe2'), 14, 0.15);
    b.box(x - 0.26, colTop - 0.12, 17.19, 0.52, 0.14, 0.52, stone);
  }
  // Entablature with the name, then the pediment
  b.box(0.85, colTop, 11.85, 6.9, 0.5, 6.05, stoneDark);
  const name = canvasTex(1024, 96, (c) => {
    c.fillStyle = '#b3a37f';
    c.fillRect(0, 0, 1024, 96);
    c.font = `900 70px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '18px';
    c.fillStyle = '#3a2c12';
    c.fillText('THE VAULT', 512, 52);
  });
  const nm = plane(5.2, 0.48, new THREE.MeshToonMaterial({ map: name }));
  nm.position.set(4.3, colTop + 0.25, 17.91);
  g.add(nm);
  const ped = new THREE.Shape([new THREE.Vector2(-3.5, 0), new THREE.Vector2(3.5, 0), new THREE.Vector2(0, 1.15)]);
  const pedGeo = new THREE.ExtrudeGeometry(ped, { depth: 6.05, bevelEnabled: false });
  pedGeo.translate(4.3, colTop + 0.5, 11.85);
  b.add(pedGeo, toon('#e3d9c0'));

  // The vault door on the side, taped shut
  const gold = toon(PAL.gold);
  const ring = new THREE.CylinderGeometry(0.9, 0.9, 0.16, 32);
  ring.rotateZ(Math.PI / 2);
  ring.translate(7.68, S + 1.35, 14.3);
  b.add(ring, gold);
  const inner = new THREE.CylinderGeometry(0.66, 0.66, 0.2, 28);
  inner.rotateZ(Math.PI / 2);
  inner.translate(7.72, S + 1.35, 14.3);
  b.add(inner, toon('#c99a2e'));
  for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
    const sp2 = new THREE.BoxGeometry(0.08, 1.15, 0.08);
    sp2.rotateX(a);
    sp2.translate(7.86, S + 1.35, 14.3);
    b.add(sp2, toon(PAL.ink));
  }
  const tape = sign(new THREE.MeshToonMaterial({ map: hazard('CLASSIFIED') }), 3.0, 0.36, 7.92, S + 1.35, 14.3, 'x');
  tape.rotation.z = 0;
  tape.rotateX(0.18);
  g.add(tape);
  // Bollards
  for (let x = 1.2; x < 8; x += 1.1) cylAt(b, x, S, 19.4, 0.08, 0.45, gold, 8);
  b.build(g);

  // Searchlights either side, sweeping the sky at night
  const beamTex = canvasTex(64, 256, (c) => {
    const gr = c.createLinearGradient(0, 256, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, 64, 256);
  });
  const beamMat = lit(glowMat('#d9ccff', 1, beamTex), 0, 0.13);
  const bases = new Batch();
  for (const [x, z, ph] of [
    [0.6, 19.4, 0],
    [8.2, 19.4, 2.4],
  ] as const) {
    cylAt(bases, x, S, z, 0.22, 0.3, toon('#3a3466'), 12);
    const pivot = new THREE.Group();
    pivot.position.set(x, S + 0.3, z);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.1, 22, 16, 1, true), beamMat);
    cone.position.y = 11;
    pivot.add(cone);
    scene.add(fx(pivot));
    ctx.tick(({ t }) => {
      pivot.rotation.z = Math.sin(t * 0.35 + ph) * 0.45;
      pivot.rotation.x = Math.cos(t * 0.27 + ph) * 0.3;
    });
  }
  bases.build(scene);
  crowd.push({ x: 4.3, z: 18.7, ry: Math.PI });
  for (const [x, z] of [
    [1.2, 19.8],
    [8.0, 11.8],
    [8.4, 19.6],
  ])
    addTree(x, z);
  addLamp(2.4, 19.8, Math.PI / 2);
  addLamp(6.2, 19.8, Math.PI / 2);
  return sp;
}

function signal(scene: THREE.Scene, ctx: LandmarkCtx) {
  const sp = spot(scene, 'signal', V(16.0, 3.5, 4.6), 9, V(17.2, 14.6, 3.4));
  const g = sp.group;
  const b = new Batch();
  const fac = facadeMat({ cols: 5, rows: 3, wall: '#2b2d3a', lit: [PAL.cyan, PAL.warm], litRatio: 0.6, seed: 31 }, 0.15, 1.7);
  g.add(walls(11.8, S, 4.6, 3.8, 2.0, 3.4, fac, toon('#22242f')));
  b.box(11.7, S + 2.0, 4.5, 4.0, 0.14, 3.6, toon('#c23b3b'));
  g.add(sign(signMat(neonSign('SIGNAL', PAL.cyan)), 2.4, 0.6, 13.15, S + 1.6, 8.02));
  const xTex = canvasTex(256, 256, (c) => {
    c.fillStyle = '#0b0a18';
    roundRect(c, 8, 8, 240, 240, 36);
    c.fill();
    c.lineWidth = 10;
    c.strokeStyle = PAL.ink;
    c.stroke();
    c.translate(48, 48);
    c.scale(6.6, 6.6);
    c.fillStyle = '#ffffff';
    c.fill(new Path2D('M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'));
  });
  g.add(sign(signMat(xTex, 1, 1.6), 0.62, 0.62, 14.95, S + 1.6, 8.02));
  // Dishes and units on the roof
  for (const [x, z, s] of [
    [12.6, 5.4, 0.5],
    [14.4, 6.4, 0.38],
  ]) {
    cylAt(b, x, S + 2.14, z, 0.05, 0.4, toon('#1b1830'), 6);
    const dish = new THREE.SphereGeometry(s, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6);
    dish.rotateX(-Math.PI / 2 - 0.6);
    dish.rotateY(0.6);
    dish.translate(x, S + 2.6, z);
    b.add(dish, toon('#e2def5', { side: THREE.DoubleSide }));
  }
  b.box(14.6, S + 2.14, 4.9, 0.7, 0.4, 0.6, toon('#4a4d5e'));

  // Lattice tower, red and white
  const base = 1.05;
  const topH = 11.6;
  const cx = 17.2;
  const cz = 3.4;
  const at = (sx: number, sz: number, y: number) => {
    const k = 1 - (y / topH) * 0.82;
    return V(cx + sx * base * k, S + y, cz + sz * base * k);
  };
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const red = toon('#e23b3b');
  const white = toon('#f3f2f7');
  const seg = 8;
  for (const [sx, sz] of corners) {
    for (let k = 0; k < seg; k++) beam(b, at(sx, sz, (topH * k) / seg), at(sx, sz, (topH * (k + 1)) / seg), 0.11, k % 2 ? white : red);
  }
  const brace = toon('#d9d4ef');
  for (let k = 0; k < seg; k++) {
    const y0 = (topH * k) / seg;
    const y1 = (topH * (k + 1)) / seg;
    for (let c = 0; c < 4; c++) {
      const [ax, az] = corners[c];
      const [bx, bz] = corners[(c + 1) % 4];
      beam(b, at(ax, az, y1), at(bx, bz, y1), 0.05, brace);
      beam(b, at(ax, az, y0), at(bx, bz, y1), 0.04, brace);
    }
  }
  cylAt(b, cx, S + topH, cz, 0.06, 2.2, toon('#1b1830'), 6, 0.03);
  for (const y of [5.5, 8.2]) cylAt(b, cx + 0.25, S + y, cz + 0.25, 0.18, 0.5, toon('#e2def5'), 10);
  b.build(g);

  const beaconMat = neon('#ff3b3b', 1.5, 4);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), beaconMat);
  beacon.position.set(cx, S + topH + 2.3, cz);
  g.add(fx(beacon));
  const rings: THREE.Mesh[] = [];
  for (let k = 0; k < 3; k++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.018, 6, 48), glowMat(PAL.cyan, 0.8, null));
    r.rotation.x = Math.PI / 2;
    r.position.copy(beacon.position);
    g.add(fx(r));
    rings.push(r);
  }
  ctx.tick(({ t }) => {
    beacon.visible = Math.sin(t * 2.6) > 0;
    rings.forEach((r, k) => {
      const p = (t * 0.32 + k / 3) % 1;
      r.scale.setScalar(0.2 + p * 5);
      (r.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.38;
    });
  });

  for (const [x, z] of [
    [12.2, 1.4],
    [13.6, 1.2],
    [15.0, 1.3],
    [19.4, 6.4],
    [19.3, 7.9],
    [16.6, 8.4],
  ])
    addTree(x, z);
  addLamp(15.8, 8.6, -Math.PI / 2);
  return sp;
}

function postOffice(scene: THREE.Scene, ctx: LandmarkCtx) {
  const sp = spot(scene, 'telegram', V(3.6, 1.4, 25.1), 7, V(3.6, 4.0, 25.1));
  const g = sp.group;
  const b = new Batch();
  const fac = facadeMat({ cols: 6, rows: 2, wall: '#e3d6b8', glass: '#2a3b66', lit: [PAL.warm], litRatio: 0.85, seed: 41 }, 0.2, 1.6);
  g.add(walls(1.2, S, 23.2, 4.8, 1.9, 3.8, fac, toon('#c9bc9c')));
  b.box(1.1, S, 23.1, 5.0, 0.15, 4.0, toon('#b3a684'));

  // Hip roof in Telegram blue
  const y0 = S + 1.9;
  const y1 = y0 + 1.25;
  const p = [V(0.95, y0, 22.95), V(6.25, y0, 22.95), V(6.25, y0, 27.25), V(0.95, y0, 27.25), V(2.6, y1, 25.1), V(4.6, y1, 25.1)];
  const tris = [
    [0, 4, 1],
    [1, 4, 5],
    [1, 5, 2],
    [2, 5, 3],
    [3, 5, 4],
    [3, 4, 0],
  ];
  const pos: number[] = [];
  for (const [a, c, d] of tris) for (const i of [a, c, d]) pos.push(p[i].x, p[i].y, p[i].z);
  const roof = new THREE.BufferGeometry();
  roof.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  roof.computeVertexNormals();
  b.add(roof, toon(PAL.telegram));

  const tg = canvasTex(1024, 192, (c) => {
    c.fillStyle = '#0b0a18';
    roundRect(c, 6, 6, 1012, 180, 24);
    c.fill();
    c.lineWidth = 10;
    c.strokeStyle = PAL.ink;
    c.stroke();
    c.fillStyle = PAL.telegram;
    c.beginPath();
    c.arc(110, 96, 62, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(70, 96);
    c.lineTo(150, 62);
    c.lineTo(132, 136);
    c.lineTo(112, 112);
    c.closePath();
    c.fill();
    c.font = `900 120px ${FONT_DISPLAY}`;
    c.textBaseline = 'middle';
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '14px';
    c.shadowColor = '#7fd4ff';
    c.shadowBlur = 24;
    c.fillStyle = '#bfe9ff';
    c.fillText('TELEGRAM', 210, 104);
  });
  g.add(sign(signMat(tg, 1, 1.8), 2.8, 0.52, 3.6, S + 1.55, 27.02));
  b.box(3.25, S, 26.98, 0.7, 1.05, 0.06, toon('#2a3b66'));
  // Mailbox
  b.box(6.5, S, 27.4, 0.45, 0.75, 0.4, toon(PAL.telegram));
  const top = new THREE.CylinderGeometry(0.2, 0.2, 0.45, 12, 1, false, 0, Math.PI);
  top.rotateZ(Math.PI / 2);
  top.translate(6.725, S + 0.75, 27.6);
  b.add(top, toon(PAL.telegram));
  b.build(g);

  // Pond
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.03, 36), waterMat);
  pond.position.set(6.4, S + 0.01, 29.2);
  scene.add(pond);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.08, 6, 36), toon('#8f8ab0'));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(6.4, S + 0.04, 29.2);
  scene.add(rim);
  const pads = new Batch();
  for (const [x, z, r] of [
    [6.0, 29.6, 0.18],
    [6.9, 28.8, 0.14],
    [6.6, 29.9, 0.11],
  ])
    cylAt(pads, x, S + 0.03, z, r, 0.02, toon('#2fae6e'), 10);
  pads.build(scene);

  // A paper plane looping over the block
  const planeGeo = new THREE.BufferGeometry();
  planeGeo.setAttribute('position', new THREE.Float32BufferAttribute([0.45, 0, 0, -0.3, 0, -0.26, -0.18, -0.05, 0, 0.45, 0, 0, -0.18, -0.05, 0, -0.3, 0, 0.26], 3));
  planeGeo.computeVertexNormals();
  const paper = new THREE.Mesh(planeGeo, toon('#f3f2f7', { side: THREE.DoubleSide }));
  paper.castShadow = true;
  scene.add(paper);
  ctx.tick(({ t }) => {
    const a = t * 0.45;
    const [x, z] = design(4.0 + Math.cos(a) * 4.2, 25.6 + Math.sin(a) * 2.6);
    paper.position.set(x, 5.4 + Math.sin(a * 2) * 0.6, z);
    paper.rotation.set(0, -a - Math.PI / 2, -0.35);
  });
  for (const [x, z] of [
    [1.0, 28.6],
    [1.4, 30.3],
    [3.0, 30.4],
    [7.8, 23.0],
    [8.2, 24.8],
  ])
    addTree(x, z);
  addLamp(8.5, 26.6, Math.PI);
  return sp;
}

/* ---------- The Armoury: a modern military compound and the players' gun store ---------- */

/**
 * Concrete panel facade with a ribbon of dark windows and an olive plinth. The windows glow a
 * faint tactical green after dark (the compound stays stealth dark: no floodlights).
 */
function compoundFacade(w: number, h: number) {
  const W = Math.round(w * 96);
  const H = Math.round(h * 96);
  const draw = (glow: boolean) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = glow ? '#000' : '#b9b5a6';
    c.fillRect(0, 0, W, H);
    if (!glow) {
      c.fillStyle = '#5a6b3a';
      c.fillRect(0, H - 0.34 * 96, W, 0.34 * 96);
      c.strokeStyle = 'rgba(30,28,24,.35)';
      c.lineWidth = 3;
      for (let x = 0; x <= W; x += 0.9 * 96) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, H - 0.34 * 96);
        c.stroke();
      }
      c.beginPath();
      c.moveTo(0, H * 0.18);
      c.lineTo(W, H * 0.18);
      c.stroke();
    }
    // Ribbon windows with mullions
    const y0 = H - 2.1 * 96;
    const y1 = H - 1.62 * 96;
    c.fillStyle = glow ? '#0d4a22' : '#1d2a33';
    c.fillRect(8, y0, W - 16, y1 - y0);
    c.fillStyle = glow ? '#000' : PAL.ink;
    for (let x = 8; x <= W - 8; x += 0.45 * 96) c.fillRect(x - 2, y0, 4, y1 - y0);
    if (!glow) {
      c.lineWidth = 5;
      c.strokeStyle = PAL.ink;
      c.strokeRect(8, y0, W - 16, y1 - y0);
    }
  };
  return lit(new THREE.MeshToonMaterial({ map: canvasTex(W, H, draw(false)), emissiveMap: canvasTex(W, H, draw(true)), emissive: '#ffffff' }), 0, 0.55);
}

/** A run of T-wall blast barriers from (x0, z0) to (x1, z1) (axis-aligned), razor wire on top. */
function blastWall(b: Batch, x0: number, z0: number, x1: number, z1: number, h: number, mats: { slab: THREE.Material; foot: THREE.Material; steel: THREE.Material; wire: THREE.Material }, wire: boolean) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const len = alongX ? x1 - x0 : z1 - z0;
  const n = Math.max(1, Math.round(len / 0.9));
  const seg = len / n;
  const mid = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
  for (let k = 0; k < n; k++) {
    const a = (alongX ? x0 : z0) + k * seg + 0.02;
    const w = seg - 0.04;
    if (alongX) {
      b.box(a, S, mid - 0.12, w, h, 0.24, mats.slab);
      b.box(a, S, mid - 0.25, w, 0.22, 0.5, mats.foot);
    } else {
      b.box(mid - 0.12, S, a, 0.24, h, w, mats.slab);
      b.box(mid - 0.25, S, a, 0.5, 0.22, w, mats.foot);
    }
  }
  // Fence posts and a coil of razor wire along the top
  const posts = Math.max(1, Math.round(len / 1.5));
  for (let k = 0; k <= posts; k++) {
    const a = (alongX ? x0 : z0) + (k / posts) * len;
    const [px, pz] = alongX ? [a, mid] : [mid, a];
    b.box(px - 0.02, S + h, pz - 0.02, 0.04, 0.42, 0.04, mats.steel);
  }
  if (!wire) return;
  const rings = Math.floor(len / 0.09);
  for (let k = 0; k < rings; k++) {
    const a = (alongX ? x0 : z0) + (k + 0.5) * (len / rings);
    const ring = new THREE.TorusGeometry(0.085, 0.008, 4, 10);
    if (alongX) ring.rotateY(Math.PI / 2 + 0.25);
    else ring.rotateY(0.25);
    ring.translate(alongX ? a : mid, S + h + 0.2, alongX ? mid : a);
    b.add(ring, mats.wire);
  }
}

/** A steel watchtower: splayed legs with braces, a lookout cabin with a dark window band. */
function watchtower(b: Batch, x: number, z: number, m: { steel: THREE.Material; cabin: THREE.Material; glass: THREE.Material; roof: THREE.Material; lamp: THREE.Material }) {
  const H = 1.85;
  const foot = 0.4;
  const top = 0.3;
  const corners = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ];
  for (const [sx, sz] of corners) beam(b, V(x + sx * foot, S, z + sz * foot), V(x + sx * top, S + H, z + sz * top), 0.06, m.steel);
  for (let k = 0; k < 4; k++) {
    const [ax, az] = corners[k];
    const [cx, cz] = corners[(k + 1) % 4];
    const at = (f: number, sx: number, sz: number) => V(x + sx * (foot + (top - foot) * f), S + H * f, z + sz * (foot + (top - foot) * f));
    beam(b, at(0.15, ax, az), at(0.55, cx, cz), 0.035, m.steel);
    beam(b, at(0.55, ax, az), at(0.15, cx, cz), 0.035, m.steel);
  }
  b.box(x - 0.42, S + H, z - 0.42, 0.84, 0.62, 0.84, m.cabin);
  b.box(x - 0.43, S + H + 0.3, z - 0.43, 0.86, 0.2, 0.86, m.glass);
  b.box(x - 0.52, S + H + 0.62, z - 0.52, 1.04, 0.07, 1.04, m.roof);
  const l = new THREE.SphereGeometry(0.05, 8, 6);
  l.translate(x, S + H + 0.75, z);
  b.add(l, m.lamp);
}

function armoury(scene: THREE.Scene, ctx: LandmarkCtx) {
  const sp = spot(scene, 'plan', V(26.5, 1.8, 26.6), 9, V(26.6, 6.6, 25.8));
  const g = sp.group;
  const b = new Batch();
  const concrete = toon('#b3ae9e');
  const concreteDk = toon('#8f8b7e');
  const concreteLt = toon('#e2ded2');
  const olive = toon('#5a6b3a');
  const oliveDk = toon('#3e4a26');
  const steel = toon('#2b2a33');
  const roof = toon('#4a4a52');
  const glass = toon('#1d2a33');
  const wireMat = toon('#a7a5b4');
  const hazard = toon('#ffd23f');
  const redLamp = neon('#ff2a2a', 0.15, 1.1);
  const greenLamp = neon('#2aff6a', 0.15, 1.0);
  const WH = 1.25; // blast wall height
  const [X0, X1] = [22.55, 30.45];

  // Perimeter: T-wall blast barriers with razor wire, open at the checkpoint on the street side
  const wallMats = { slab: concrete, foot: concreteDk, steel, wire: wireMat };
  const wire = !ctx.low;
  blastWall(b, X0, X0, X1, X0 + 0.35, WH, wallMats, wire);
  blastWall(b, X0, X0, X0 + 0.35, X1, WH, wallMats, wire);
  blastWall(b, X1 - 0.35, X0, X1, X1, WH, wallMats, wire);
  blastWall(b, X0, X1 - 0.35, 24.9, X1, WH, wallMats, wire);
  blastWall(b, 28.3, X1 - 0.35, X1, X1, WH, wallMats, wire);
  // Stencilled street-side panels pointing to the checkpoint
  const stencilWall = (text: string, arrow: 'l' | 'r') =>
    paintMat(
      canvasTex(512, 160, (c) => {
        c.font = `900 84px ${FONT_DISPLAY}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '8px';
        c.fillStyle = '#2b3418';
        c.fillText(text, 256, 70);
        c.beginPath();
        const ax = arrow === 'r' ? 420 : 92;
        const d = arrow === 'r' ? 1 : -1;
        c.moveTo(ax - d * 40, 122);
        c.lineTo(ax + d * 20, 122);
        c.lineTo(ax + d * 20, 108);
        c.lineTo(ax + d * 50, 132);
        c.lineTo(ax + d * 20, 156);
        c.lineTo(ax + d * 20, 142);
        c.lineTo(ax - d * 40, 142);
        c.closePath();
        c.fill();
      })
    );
  g.add(sign(stencilWall('GUN STORE', 'r'), 1.9, 0.6, 23.7, S + 0.68, X1 - 0.04));
  g.add(sign(stencilWall('GUN STORE', 'l'), 1.7, 0.54, 29.38, S + 0.68, X1 - 0.04));

  // Steel watchtowers on the corners, low red lights on top
  const corners: [number, number][] = [
    [22.95, 22.95],
    [30.05, 22.95],
    [22.95, 30.05],
    [30.05, 30.05],
  ];
  for (const [x, z] of corners) watchtower(b, x, z, { steel, cabin: oliveDk, glass, roof, lamp: redLamp });

  // The checkpoint: a guard booth, a boom barrier that lifts when you walk up, and a sign gantry
  b.box(24.98, S, 29.8, 0.8, 1.25, 0.62, concreteLt);
  b.box(24.97, S + 0.6, 29.79, 0.82, 0.4, 0.64, glass);
  b.box(24.9, S + 1.25, 29.72, 0.96, 0.08, 0.78, roof);
  for (let k = 0; k < 4; k++) b.box(24.98 + k * 0.2, S, 30.43, 0.1, 0.18, 0.005, k % 2 ? steel : hazard);
  {
    const l = new THREE.SphereGeometry(0.04, 8, 6);
    l.translate(25.38, S + 1.38, 30.1);
    b.add(l, redLamp);
  }
  b.box(25.98, S, 30.25, 0.14, 0.7, 0.14, hazard);
  b.box(28.13, S, 30.27, 0.1, 0.5, 0.1, hazard);
  b.box(28.08, S + 0.5, 30.27, 0.2, 0.04, 0.1, steel);
  {
    const stripes = canvasTex(256, 16, (c) => {
      for (let k = 0; k < 8; k++) {
        c.fillStyle = k % 2 ? '#f3f2f7' : '#e23b3b';
        c.fillRect(k * 32, 0, 32, 16);
      }
    });
    const pivot = new THREE.Group();
    pivot.position.set(26.05, S + 0.62, 30.32);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.07, 0.07).translate(1.075, 0, 0), new THREE.MeshToonMaterial({ map: stripes }));
    arm.castShadow = true;
    pivot.add(arm);
    // Starts raised (and stays raised under reduced motion, when ticks don't run)
    pivot.rotation.z = 1.35;
    g.add(pivot);
    const [gateX, gateZ] = design(27.1, 30.3);
    ctx.tick(({ dt }) => {
      const near = walker.on && Math.hypot(walker.x - gateX, walker.z - gateZ) < 4;
      pivot.rotation.z += ((near ? 1.35 : 0.02) - pivot.rotation.z) * Math.min(1, dt * 3);
    });
  }
  for (const x of [25.8, 28.26]) b.box(x, S, 30.2, 0.12, 2.35, 0.12, steel);
  b.box(25.8, S + 2.3, 30.2, 2.58, 0.1, 0.12, steel);
  {
    const board = canvasTex(1024, 256, (c) => {
      c.fillStyle = '#2b3418';
      c.fillRect(0, 0, 1024, 256);
      c.lineWidth = 14;
      c.strokeStyle = PAL.ink;
      c.strokeRect(7, 7, 1010, 242);
      c.font = `900 128px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '14px';
      c.fillStyle = '#f3f2f7';
      c.fillText('THE ARMOURY', 512, 104);
      c.fillStyle = '#3cff7a';
      c.fillRect(150, 172, 724, 6);
      c.font = `700 40px ${FONT_MONO}`;
      (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '10px';
      c.fillText('GUN STORE', 512, 214);
    });
    const mat = new THREE.MeshToonMaterial({ map: board });
    for (const [z, ry] of [
      [30.33, 0],
      [30.19, Math.PI],
    ]) {
      const p = plane(2.3, 0.58, mat);
      p.position.set(27.04, S + 1.98, z);
      p.rotation.y = ry;
      g.add(p);
    }
    for (const x of [25.95, 28.13]) {
      const l = new THREE.SphereGeometry(0.035, 8, 6);
      l.translate(x, S + 2.42, 30.27);
      b.add(l, greenLamp);
    }
  }
  // Speed bump and painted chevrons leading from the gate to the store counter
  {
    const bump = canvasTex(256, 32, (c) => {
      for (let k = 0; k < 8; k++) {
        c.fillStyle = k % 2 ? '#14121f' : '#ffd23f';
        c.beginPath();
        c.moveTo(k * 32, 32);
        c.lineTo(k * 32 + 16, 0);
        c.lineTo(k * 32 + 48, 0);
        c.lineTo(k * 32 + 32, 32);
        c.fill();
      }
    });
    const sb = new THREE.Mesh(unitPlane, new THREE.MeshToonMaterial({ map: bump }));
    sb.rotation.x = -Math.PI / 2;
    sb.scale.set(2.2, 0.22, 1);
    // Just over the lot's paving (level with it, it flickers)
    sb.position.set(27.1, S + 0.014, 29.85);
    scene.add(fx(sb));
    const chevron = canvasTex(128, 128, (c) => {
      c.strokeStyle = '#3cff7a';
      c.lineWidth = 22;
      c.lineCap = 'square';
      c.beginPath();
      c.moveTo(24, 96);
      c.lineTo(64, 40);
      c.lineTo(104, 96);
      c.stroke();
    });
    const chevMat = lit(new THREE.MeshBasicMaterial({ map: chevron, transparent: true, depthWrite: false }), 0.75, 0.55);
    const from = V(26.9, 0, 29.35);
    const to = V(24.85, 0, 28.15);
    const yaw = Math.atan2(to.x - from.x, to.z - from.z);
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(unitPlane, chevMat);
      m.rotation.set(-Math.PI / 2, 0, Math.PI - yaw);
      m.scale.set(0.42, 0.42, 1);
      m.position.copy(from).lerp(to, k / 2.2).setY(S + 0.016);
      scene.add(fx(m));
    }
  }

  // The gun store: a flat-roofed concrete block with a glass shopfront, a canopy with the
  // store sign, and a walk-up counter where players gear up
  const HX0 = 23.3;
  const HZ0 = 23.3;
  const HW = 4.6;
  const HD = 3.6;
  const HH = 2.6;
  g.add(walls(HX0, S, HZ0, HW, HH, HD, compoundFacade(HW, HH), roof));
  for (const [x, z, w, d] of [
    [HX0 - 0.04, HZ0 - 0.04, HW + 0.08, 0.12],
    [HX0 - 0.04, HZ0 + HD - 0.08, HW + 0.08, 0.12],
    [HX0 - 0.04, HZ0 - 0.04, 0.12, HD + 0.08],
    [HX0 + HW - 0.08, HZ0 - 0.04, 0.12, HD + 0.08],
  ])
    b.box(x, S + HH, z, w, 0.16, d, concreteDk);
  const FZ = HZ0 + HD + 0.012;
  {
    // Display window: the racks inside, lit soft green
    const display = canvasTex(512, 256, (c) => {
      c.fillStyle = '#121820';
      c.fillRect(0, 0, 512, 256);
      c.fillStyle = '#1f2a33';
      for (let y = 30; y < 256; y += 18) for (let x = 12; x < 512; x += 18) c.fillRect(x, y, 4, 4);
      c.fillStyle = '#3cff7a';
      c.fillRect(0, 0, 512, 10);
      c.fillStyle = '#3a3346';
      for (const y of [112, 220]) c.fillRect(10, y, 492, 8);
      // Rifles on the racks (silhouettes in the house colours)
      const rifle = (x: number, y: number, col: string) => {
        c.fillStyle = col;
        c.strokeStyle = PAL.ink;
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + 120, y);
        c.lineTo(x + 120, y - 8);
        c.lineTo(x + 150, y - 8);
        c.lineTo(x + 150, y + 2);
        c.lineTo(x + 66, y + 10);
        c.lineTo(x + 60, y + 34);
        c.lineTo(x + 48, y + 34);
        c.lineTo(x + 46, y + 14);
        c.lineTo(x + 20, y + 16);
        c.lineTo(x, y + 26);
        c.closePath();
        c.fill();
        c.stroke();
        c.fillStyle = '#2b2a33';
        c.fillRect(x + 72, y - 16, 22, 12);
      };
      const cols = ['#5a6b3a', '#24212f', '#8f3dff', '#5a6b3a', '#00b8d8', '#24212f'];
      for (let k = 0; k < 6; k++) rifle(18 + (k % 3) * 164, k < 3 ? 70 : 178, cols[k]);
      // Glass reflection
      c.fillStyle = 'rgba(255,255,255,.08)';
      c.beginPath();
      c.moveTo(300, 0);
      c.lineTo(380, 0);
      c.lineTo(250, 256);
      c.lineTo(170, 256);
      c.fill();
    });
    const win = plane(2.4, 1.15, lit(new THREE.MeshBasicMaterial({ map: display }), 0.95, 0.75));
    win.position.set(24.75, S + 0.76, FZ);
    g.add(win);
    for (const x of [23.52, 24.75, 25.98]) b.box(x - 0.03, S + 0.16, FZ - 0.01, 0.06, 1.22, 0.05, steel);
    for (const y of [0.16, 1.34]) b.box(23.49, S + y, FZ - 0.01, 2.52, 0.06, 0.05, steel);
    // Glass doors
    const doors = canvasTex(160, 256, (c) => {
      c.fillStyle = '#16202a';
      c.fillRect(0, 0, 160, 256);
      c.fillStyle = 'rgba(60,255,122,.18)';
      c.fillRect(0, 0, 160, 256);
      c.strokeStyle = '#3a3a46';
      c.lineWidth = 10;
      c.strokeRect(5, 5, 150, 246);
      c.beginPath();
      c.moveTo(80, 0);
      c.lineTo(80, 256);
      c.stroke();
      c.fillStyle = '#c9c6d6';
      c.fillRect(60, 120, 10, 40);
      c.fillRect(90, 120, 10, 40);
    });
    const door = plane(0.8, 1.3, lit(new THREE.MeshBasicMaterial({ map: doors }), 0.95, 0.75));
    door.position.set(26.55, S + 0.65, FZ);
    g.add(door);
    // Roller shutter on the loading bay
    const shutter = canvasTex(64, 128, (c) => {
      c.fillStyle = '#8f8b98';
      c.fillRect(0, 0, 64, 128);
      c.fillStyle = '#6e6a7a';
      for (let y = 0; y < 128; y += 8) c.fillRect(0, y, 64, 3);
    });
    const sh = plane(0.72, 1.25, new THREE.MeshToonMaterial({ map: shutter }));
    sh.position.set(27.47, S + 0.63, FZ);
    g.add(sh);
    for (let k = 0; k < 5; k++) b.box(27.1 + k * 0.155, S, FZ, 0.08, 0.12, 0.01, k % 2 ? steel : hazard);
  }
  // Canopy over the shopfront, the lit store sign on its fascia
  b.box(23.2, S + 1.62, HZ0 + HD, 4.8, 0.07, 1.0, roof);
  for (const x of [23.32, 27.82]) b.box(x, S, HZ0 + HD + 0.88, 0.07, 1.62, 0.07, steel);
  {
    const tex = canvasTex(1024, 96, (c) => {
      c.fillStyle = '#14121f';
      c.fillRect(0, 0, 1024, 96);
      c.font = `900 70px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '18px';
      c.lineWidth = 8;
      c.strokeStyle = PAL.ink;
      c.strokeText('GUN STORE', 512, 52);
      c.fillStyle = '#3cff7a';
      c.fillText('GUN STORE', 512, 52);
      // Crosshairs either side
      c.strokeStyle = '#3cff7a';
      c.lineWidth = 6;
      for (const x of [170, 854]) {
        c.beginPath();
        c.arc(x, 48, 22, 0, Math.PI * 2);
        c.moveTo(x - 34, 48);
        c.lineTo(x + 34, 48);
        c.moveTo(x, 14);
        c.lineTo(x, 82);
        c.stroke();
      }
    });
    g.add(sign(signMat(tex, 1, 1.25), 4.8, 0.3, 25.6, S + 1.52, HZ0 + HD + 1.012));
  }
  // The counter: where players gear up (RACK in solids.ts), a rifle on display, ammo boxes,
  // and a little GEAR UP sign
  {
    const cb = new Batch();
    cb.box(23.9, S, 27.15, 1.6, 0.55, 0.35, oliveDk);
    cb.box(23.85, S + 0.55, 27.1, 1.7, 0.05, 0.45, steel);
    for (let k = 0; k < 4; k++) cb.box(23.95 + k * 0.4, S + 0.08, 27.505, 0.3, 0.12, 0.005, k % 2 ? steel : hazard);
    const gun = rifleGeometry().rotateY(Math.PI / 2).rotateX(Math.PI / 2);
    cb.add(gun.translate(24.3, S + 0.64, 27.32), toon('#2b2a33'));
    for (const [x, z] of [
      [25.0, 27.25],
      [25.18, 27.28],
      [25.09, 27.4],
    ])
      cb.box(x, S + 0.6, z, 0.14, 0.09, 0.09, olive);
    cb.build(g);
    const tag = canvasTex(512, 128, (c) => {
      c.fillStyle = '#3e4a26';
      c.fillRect(0, 0, 512, 128);
      c.lineWidth = 10;
      c.strokeStyle = PAL.ink;
      c.strokeRect(5, 5, 502, 118);
      c.font = `900 78px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '10px';
      c.fillStyle = '#e3dcb0';
      c.fillText('GEAR UP', 256, 70);
    });
    const p = plane(0.6, 0.15, new THREE.MeshToonMaterial({ map: tag }));
    p.position.set(24.75, S + 0.69, 27.5);
    g.add(p);
    const l = new THREE.SphereGeometry(0.035, 8, 6);
    l.translate(25.42, S + 0.66, 27.48);
    const lb = new Batch();
    lb.add(l, greenLamp);
    lb.build(g);
  }

  // Roof: a helipad, air conditioning units, a satellite dish, a comms mast with a red light
  {
    const pad = canvasTex(256, 256, (c) => {
      c.fillStyle = '#3a3a42';
      c.beginPath();
      c.arc(128, 128, 124, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ffd23f';
      c.lineWidth = 12;
      c.beginPath();
      c.arc(128, 128, 104, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#f3f2f7';
      c.fillRect(84, 64, 22, 128);
      c.fillRect(150, 64, 22, 128);
      c.fillRect(84, 117, 88, 22);
    });
    const m = new THREE.Mesh(unitPlane, new THREE.MeshToonMaterial({ map: pad, transparent: true, alphaTest: 0.5 }));
    m.rotation.x = -Math.PI / 2;
    m.scale.set(2.3, 2.3, 1);
    m.position.set(24.75, S + HH + 0.012, 25.15);
    scene.add(fx(m));
    for (const [x, z] of [
      [26.35, 23.55],
      [26.35, 24.3],
    ]) {
      b.box(x, S + HH, z, 0.85, 0.42, 0.6, concreteLt);
      cylAt(b, x + 0.42, S + HH + 0.42, z + 0.3, 0.2, 0.03, steel, 14);
    }
    cylAt(b, 27.45, S + HH, 25.6, 0.03, 0.3, steel, 6);
    const dish = new THREE.SphereGeometry(0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 3.2);
    dish.rotateX(-0.9).rotateY(0.6).translate(27.45, S + HH + 0.42, 25.6);
    b.add(dish, concreteLt);
    cylAt(b, 27.5, S + HH, 23.7, 0.03, 2.1, steel, 6);
    for (const y of [1.2, 1.6, 1.95]) b.box(27.3, S + HH + y, 23.68, 0.4, 0.025, 0.04, steel);
    const l = new THREE.SphereGeometry(0.05, 8, 6);
    l.translate(27.5, S + HH + 2.15, 23.7);
    b.add(l, redLamp);
  }

  // Degen's flag flying over the store
  const flags: { geo: THREE.PlaneGeometry; base: Float32Array; w: number }[] = [];
  const flag = (x: number, y: number, z: number, w: number, h: number, tex: THREE.Texture, pole: number) => {
    cylAt(b, x, y, z, 0.025, pole, steel, 6);
    const geo = new THREE.PlaneGeometry(w, h, 10, 4);
    geo.translate(w / 2, 0, 0);
    flags.push({ geo, base: Float32Array.from(geo.attributes.position.array as Float32Array), w });
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }));
    m.position.set(x, y + pole - h / 2 - 0.04, z);
    m.rotation.y = Math.PI / 4;
    m.castShadow = true;
    g.add(m);
  };
  const degenFlag = canvasTex(256, 168, (c) => {
    c.fillStyle = '#14121f';
    c.fillRect(0, 0, 256, 168);
    const gr = c.createLinearGradient(0, 168, 256, 0);
    gr.addColorStop(0, '#ff2fb9');
    gr.addColorStop(0.5, '#8f3dff');
    gr.addColorStop(1, '#00eaff');
    c.fillStyle = gr;
    c.fillRect(0, 140, 256, 28);
    if (ctx.degen) {
      const h = 132;
      const w = (ctx.degen.width / ctx.degen.height) * h;
      c.drawImage(ctx.degen, 128 - w / 2, 6, w, h);
    }
  });
  flag(27.55, S + HH + 0.16, 26.55, 1.0, 0.65, degenFlag, 1.45);
  ctx.tick(({ t }) => {
    for (const f of flags) {
      const pos = f.geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = f.base[i * 3];
        pos.setZ(i, Math.sin(x * 5 - t * 4) * 0.07 * (x / f.w));
      }
      pos.needsUpdate = true;
    }
  });

  // Vehicle bays painted on the yard
  {
    const lineMat = toon('#ffd23f');
    for (const [x, z, w, d] of [
      [28.35, 24.45, 0.05, 1.95],
      [29.95, 24.45, 0.05, 1.95],
      [28.35, 27.9, 0.05, 1.4],
      [29.95, 27.9, 0.05, 1.4],
    ]) {
      const m = new THREE.Mesh(unitPlane, lineMat);
      m.rotation.x = -Math.PI / 2;
      m.scale.set(w, d, 1);
      m.position.set(x + w / 2, S + 0.006, z + d / 2);
      scene.add(fx(m));
    }
  }

  // A tank with a slowly turning turret
  {
    const tank = new THREE.Group();
    tank.position.set(29.15, S, 25.4);
    const tb = new Batch();
    for (const sx of [-1, 1]) {
      tb.box(sx * 0.42 - 0.14, 0.02, -0.8, 0.28, 0.3, 1.6, steel);
      for (let k = 0; k < 5; k++) {
        const w = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12);
        w.rotateZ(Math.PI / 2);
        w.translate(sx * 0.57, 0.14, -0.6 + k * 0.3);
        tb.add(w, oliveDk);
      }
    }
    tb.box(-0.48, 0.28, -0.75, 0.96, 0.26, 1.45, olive);
    tb.add(place(unitBox, 0, 0.44, 0.68, 0.96, 0.16, 0.3, -0.55, 0, 0), olive);
    tb.box(-0.3, 0.54, -0.72, 0.6, 0.06, 0.3, oliveDk);
    tb.build(tank);
    const turret = new THREE.Group();
    turret.position.set(0, 0.54, -0.05);
    const ub = new Batch();
    ub.box(-0.31, 0, -0.38, 0.62, 0.24, 0.7, oliveDk);
    cylAt(ub, 0.12, 0.24, -0.12, 0.1, 0.06, steel, 10);
    const barrel = new THREE.CylinderGeometry(0.045, 0.05, 1.05, 10);
    barrel.rotateX(Math.PI / 2);
    barrel.translate(0, 0.12, 0.82);
    ub.add(barrel, steel);
    ub.box(-0.07, 0.06, 1.3, 0.14, 0.12, 0.14, steel);
    ub.build(turret);
    tank.add(turret);
    g.add(tank);
    ctx.tick(({ t }) => (turret.rotation.y = Math.sin(t * 0.22) * 0.9));
  }

  // An armoured jeep by the gate
  {
    const jeep = new THREE.Group();
    jeep.position.set(29.3, S, 28.6);
    jeep.rotation.y = Math.PI;
    const jb = new Batch();
    jb.box(-0.28, 0.14, -0.5, 0.56, 0.26, 1.0, olive);
    jb.box(-0.27, 0.4, -0.5, 0.54, 0.1, 0.42, oliveDk);
    jb.box(-0.26, 0.4, -0.05, 0.52, 0.28, 0.04, toon('#8fd6e8'));
    for (const sx of [-0.25, 0.23]) for (const sz of [-0.05, 0.4]) jb.box(sx, 0.4, sz, 0.02, 0.3, 0.02, steel);
    jb.box(-0.26, 0.68, -0.05, 0.52, 0.03, 0.47, oliveDk);
    for (const sx of [-0.3, 0.3])
      for (const sz of [-0.32, 0.32]) {
        const w = new THREE.CylinderGeometry(0.13, 0.13, 0.1, 12);
        w.rotateZ(Math.PI / 2);
        w.translate(sx, 0.13, sz);
        jb.add(w, steel);
      }
    const spare = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
    spare.rotateX(Math.PI / 2);
    spare.translate(0, 0.32, -0.55);
    jb.add(spare, steel);
    jb.build(jeep);
    g.add(jeep);
  }

  // Supply yard: crates under camo netting, drums, a helmet rack, a forklift moving crates
  {
    const sb = new Batch();
    const crateMat = (label: string) =>
      new THREE.MeshToonMaterial({
        map: canvasTex(128, 96, (c) => {
          c.fillStyle = '#4f5d31';
          c.fillRect(0, 0, 128, 96);
          c.strokeStyle = '#2f3a1c';
          c.lineWidth = 6;
          c.strokeRect(3, 3, 122, 90);
          c.font = `700 24px ${FONT_MONO}`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillStyle = '#e3dcb0';
          c.fillText(label, 64, 50);
        }),
      });
    const crates = ['GEAR', 'RATIONS', 'SUPPLY'].map(crateMat);
    const stack: [number, number, number, number][] = [
      [28.3, 23.1, 0, 0],
      [28.85, 23.1, 0, 1],
      [29.4, 23.1, 0, 2],
      [28.3, 23.65, 0, 2],
      [28.85, 23.65, 0, 0],
      [28.55, 23.1, 1, 1],
      [29.1, 23.1, 1, 2],
      [28.55, 23.65, 1, 0],
    ];
    for (const [x, z, lvl, m] of stack) sb.box(x, S + lvl * 0.42, z, 0.5, 0.42, 0.5, crates[m]);
    for (const [x, z] of [
      [29.95, 23.25],
      [29.95, 23.7],
      [23.25, 29.55],
      [23.6, 29.65],
    ]) {
      cylAt(sb, x, S, z, 0.17, 0.48, oliveDk, 12);
      cylAt(sb, x, S + 0.46, z, 0.175, 0.03, steel, 12);
    }
    sb.box(23.4, S + 0.55, 28.0, 0.05, 0.05, 0.9, steel);
    for (const zz of [28.0, 28.9]) sb.box(23.405, S, zz - 0.02, 0.04, 0.6, 0.04, steel);
    for (let k = 0; k < 3; k++) {
      const h = new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      h.translate(23.425, S + 0.6, 28.15 + k * 0.3);
      sb.add(h, oliveDk);
    }
    for (const [x, z] of [
      [28.15, 22.95],
      [30.0, 22.95],
      [28.15, 24.35],
      [30.0, 24.35],
    ])
      sb.box(x - 0.025, S, z - 0.025, 0.05, 1.35, 0.05, steel);
    sb.build(g);
    const camo = canvasTex(256, 256, (c) => {
      c.fillStyle = '#4f5d31';
      c.fillRect(0, 0, 256, 256);
      const blobs = ['#3a4622', '#6b7a44', '#2b3418', '#7d6b45'];
      const rr = rng(7);
      for (let k = 0; k < 60; k++) {
        c.fillStyle = blobs[k % blobs.length];
        c.beginPath();
        c.ellipse(rr() * 256, rr() * 256, 10 + rr() * 26, 8 + rr() * 18, rr() * 3, 0, Math.PI * 2);
        c.fill();
      }
    });
    const net = new THREE.Mesh(unitPlane, new THREE.MeshToonMaterial({ map: camo, side: THREE.DoubleSide }));
    net.rotation.x = -Math.PI / 2;
    net.scale.set(2.0, 1.55, 1);
    net.position.set(29.07, S + 1.36, 23.65);
    net.receiveShadow = true;
    g.add(net);

    const fork = new THREE.Group();
    const fb2 = new Batch();
    fb2.box(-0.2, 0.08, -0.28, 0.4, 0.32, 0.5, olive);
    fb2.box(-0.16, 0.4, -0.25, 0.32, 0.3, 0.02, steel);
    fb2.box(-0.16, 0.7, -0.25, 0.32, 0.03, 0.36, oliveDk);
    for (const sx of [-0.12, 0.12]) fb2.box(sx - 0.02, 0.05, 0.22, 0.04, 0.75, 0.04, steel);
    for (const sx of [-0.1, 0.1]) fb2.box(sx - 0.02, 0.1, 0.24, 0.04, 0.02, 0.36, steel);
    fb2.box(-0.2, 0.12, 0.26, 0.4, 0.32, 0.34, crates[1]);
    for (const sx of [-0.21, 0.21])
      for (const sz of [-0.18, 0.12]) {
        const w = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10);
        w.rotateZ(Math.PI / 2);
        w.translate(sx, 0.08, sz);
        fb2.add(w, steel);
      }
    fb2.build(fork);
    fork.rotation.y = Math.PI / 2;
    fork.position.set(29.1, S, 27.35);
    g.add(fork);
    ctx.tick(({ t }) => (fork.position.x = 29.1 + Math.sin(t * 0.45) * 0.6));
  }

  // Degen soldiers: a patrol walking laps of the yard, two guards at the checkpoint who salute
  // when you walk past, and the store clerk behind the counter. The shared Degen body in
  // fatigues, instanced.
  {
    const squad = 4;
    const guards: [number, number][] = [
      [25.55, 29.5],
      [27.95, 29.6],
    ];
    const outfits: Outfit[] = [...Array.from({ length: squad }, () => SOLDIER), ...guards.map((): Outfit => ({ ...SOLDIER, rifle: 'left' })), { ...SOLDIER, rifle: undefined }];
    const crowd = createCrowd(g, outfits, { light: ctx.low });
    // The patrol's route: a rounded rectangle in the open yard, east of the counter and clear of
    // the checkpoint lane and the vehicle bays
    const route: THREE.Vector2[] = [];
    const [cx, cz, hx, hz, rr] = [27.05, 28.1, 0.8, 0.55, 0.32];
    for (let k = 0; k < 4; k++) {
      const [sx, sz] = [
        [1, 1],
        [-1, 1],
        [-1, -1],
        [1, -1],
      ][k];
      const a0 = [0, Math.PI / 2, Math.PI, Math.PI * 1.5][k];
      for (let j = 0; j <= 6; j++) {
        const a = a0 + (j / 6) * (Math.PI / 2);
        route.push(new THREE.Vector2(cx + sx * (hx - rr) + Math.cos(a) * rr, cz + sz * (hz - rr) + Math.sin(a) * rr));
      }
    }
    const segLen = route.map((p, i) => p.distanceTo(route[(i + 1) % route.length]));
    const total = segLen.reduce((a, c) => a + c, 0);
    const along = (s: number) => {
      s = ((s % total) + total) % total;
      for (let i = 0; i < route.length; i++) {
        if (s <= segLen[i]) {
          const a = route[i];
          const c = route[(i + 1) % route.length];
          const f = s / segLen[i];
          return { x: a.x + (c.x - a.x) * f, z: a.y + (c.y - a.y) * f, yaw: Math.atan2(c.x - a.x, c.y - a.y) };
        }
        s -= segLen[i];
      }
      return { x: route[0].x, z: route[0].y, yaw: 0 };
    };
    const salute = guards.map(() => 0);
    ctx.tick(({ t, dt }) => {
      for (let i = 0; i < squad; i++) {
        const s = t * 0.38 - i * 1.05;
        const p = along(s);
        // The march played at its stride, so their boots stay put on the yard
        crowd.set(i, p.x, S, p.z, p.yaw, 0.85, 'march', s / (MARCH_STRIDE * 0.85));
      }
      guards.forEach(([x, z], k) => {
        const [wx, wz] = design(x, z);
        const near = walker.on && Math.hypot(walker.x - wx, walker.z - wz) < 1.8;
        salute[k] += ((near ? 1 : 0) - salute[k]) * Math.min(1, dt * 6);
        crowd.set(squad + k, x, S, z, 0, 0.85, 'salute', salute[k]);
      });
      // The clerk: at ease behind the counter, now and then looking round
      crowd.set(squad + guards.length, 24.7, S, 26.99, 0, 0.85, 'look', t / CLIP_SECONDS + 0.3);
      crowd.commit();
    });
  }
  b.build(g);
  return sp;
}

/** The apartments: a tower and a lower block with Degen on the billboard. The tower is a place (staff to hire). */
function apartments(scene: THREE.Scene, ctx: LandmarkCtx) {
  const sp = spot(scene, 'apartments', V(24.4, 3.5, 2.6), 5.5, V(24.4, 8.6, 2.6));
  const g = sp.group;
  const b = new Batch();
  const tb = new Batch();
  const aMat = facadeMat({ cols: 5, rows: 12, wall: '#17414a', lit: [PAL.warm, PAL.warm, PAL.pink], litRatio: 0.6, seed: 51, bands: '#22606a' }, 0.15, 1.7);
  g.add(walls(22.8, S, 1.0, 3.2, 7.0, 3.2, aMat, toon('#123238')));
  // Balconies with railings on the street side
  for (let y = S + 1.2; y < S + 7; y += 1.17) {
    tb.box(23.0, y, 4.2, 2.8, 0.06, 0.45, toon('#2f6f78'));
    tb.box(23.0, y + 0.06, 4.6, 2.8, 0.32, 0.04, toon('#8b86b8'));
  }
  // The front door, under the balconies
  tb.box(23.95, S, 4.18, 0.9, 1.25, 0.06, toon('#14304a'));
  tb.box(23.85, S + 1.25, 4.16, 1.1, 0.08, 0.1, toon('#1b1830'));
  tb.box(23.3, S + 7.0, 1.4, 0.8, 0.6, 0.8, toon('#2f6f78'));
  cylAt(tb, 25.3, S + 7.0, 2.4, 0.38, 0.8, toon('#6b4a8f'), 14);
  tb.build(g);

  const bMat = facadeMat({ cols: 5, rows: 7, wall: '#3b2c66', lit: [PAL.warm, PAL.cyan], litRatio: 0.55, seed: 52 }, 0.15, 1.7);
  scene.add(walls(27.0, S, 1.6, 3.2, 4.2, 3.6, bMat, toon('#251c45')));
  // Billboard on the roof: Degen
  const top = S + 4.2;
  for (const x of [27.6, 29.6]) b.box(x, top, 3.9, 0.08, 0.9, 0.08, toon('#1b1830'));
  const bb = canvasTex(1024, 640, (c) => {
    const gr = c.createLinearGradient(0, 640, 1024, 0);
    gr.addColorStop(0, '#5a0f6e');
    gr.addColorStop(0.55, '#2a1a8a');
    gr.addColorStop(1, '#0b5fa8');
    c.fillStyle = gr;
    c.fillRect(0, 0, 1024, 640);
    if (ctx.degen) {
      const h = 610;
      const w = (ctx.degen.width / ctx.degen.height) * h;
      c.drawImage(ctx.degen, 30, 640 - h, w, h);
    }
    c.font = `900 230px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 22;
    c.strokeStyle = PAL.ink;
    c.strokeText('GM', 760, 240);
    c.fillStyle = '#ffffff';
    c.fillText('GM', 760, 240);
    c.font = `900 150px ${FONT_DISPLAY}`;
    c.strokeText('DEGEN', 760, 440);
    c.fillStyle = PAL.cyan;
    c.fillText('DEGEN', 760, 440);
    c.lineWidth = 24;
    c.strokeRect(12, 12, 1000, 616);
  });
  const board = plane(3.0, 1.875, signMat(bb, 1, 1.25));
  board.position.set(28.65, top + 0.9 + 0.94, 3.96);
  scene.add(fx(board));
  b.box(27.1, top + 0.88, 3.85, 3.1, 1.95, 0.1, toon('#14102a'));
  b.build(scene);
  for (const [x, z] of [
    [23.0, 5.6],
    [23.4, 7.4],
    [25.2, 8.2],
    [27.0, 8.3],
    [30.4, 6.4],
    [30.4, 8.0],
  ])
    addTree(x, z);
  addLamp(25.6, 6.0, 0);
  return sp;
}

/* ---------- Everything ---------- */

export function buildLandmarks(scene: THREE.Scene, ctx: LandmarkCtx) {
  const crowd: Idle[] = [];
  /** Build a landmark drawn on the old grid in the block at (bx, bz), then move it onto today's block */
  const onBlock = <T,>(bx: number, bz: number, build: () => T): T => {
    const [dx, dz] = seat(bx, bz);
    const before = new Set(scene.children);
    const mark = placedMark();
    const people = crowd.length;
    const made = build();
    for (const o of scene.children) {
      if (before.has(o)) continue;
      o.position.x += dx;
      o.position.z += dz;
      o.updateMatrix();
    }
    shiftPlaced(mark, dx, dz);
    for (const c of crowd.slice(people)) (c.x += dx), (c.z += dz);
    const sp = made as Spot | undefined;
    if (sp?.focus && sp.pin) for (const v of [sp.focus, sp.pin]) (v.x += dx), (v.z += dz);
    return made;
  };
  // The Emporium first (the city's sound centres on it)
  const spots = [
    onBlock(11, 11, () => emporium(scene, ctx, crowd)),
    onBlock(22, 11, () => shop(scene, ctx, crowd)),
    onBlock(11, 22, () => workshop(scene, ctx)),
    onBlock(0, 11, () => vault(scene, ctx, crowd)),
    onBlock(22, 22, () => armoury(scene, ctx)),
    onBlock(11, 0, () => signal(scene, ctx)),
    onBlock(0, 22, () => postOffice(scene, ctx)),
    onBlock(22, 0, () => apartments(scene, ctx)),
  ];
  return { spots, crowd };
}
