/*
 * The buildings. Seven of them are "spots": links into the Emporium or out
 * to a confirmed channel. Each spot is its own group so it can lift and glow
 * when hovered, with a ring on the ground and a pin above it.
 *
 * Layout matches the 2D map (src/lib/city.ts): blocks at 0-9, 11-20, 22-31.
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
  toon,
} from './kit';
import { SLAB as S, addLamp, addTree, waterMat, type Tick } from './world';

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
  ry: number;
  y?: number;
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
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, top, side, side]);
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
  return lit(new THREE.MeshToonMaterial({ map, emissiveMap, emissive: '#ffffff' }), 0.1, 1.6);
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

/* ---------- The Emporium: a black-and-gold flagship palace under a great dome ---------- */

/** Palace floor plan, grown outwards by `d`: a square with its street corner cut off. */
const PALACE = { x0: 11.8, z0: 11.8, x1: 18.0, z1: 18.0, cut: 34 };
function palacePlan(d: number): [number, number][] {
  const { x0, z0, x1, z1, cut } = PALACE;
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

/** A box laid along the line a -> c (rails, trims). */
function alongBox(b: Batch, a: [number, number], c: [number, number], y: number, h: number, t: number, mat: THREE.Material) {
  const dx = c[0] - a[0];
  const dz = c[1] - a[1];
  b.add(place(unitBox, (a[0] + c[0]) / 2, y + h / 2, (a[1] + c[1]) / 2, Math.hypot(dx, dz), h, t, 0, Math.atan2(-dz, dx), 0), mat);
}

const GOLD = '#e2b04a';
const STONE = '#1d1929';

function archPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = w / 2;
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, y + r);
  c.arc(x + r, y + r, r, Math.PI, 0);
  c.lineTo(x + w, y + h);
  c.closePath();
}

/**
 * Two storeys of palace front, `bays` wide (128 px a bay, 768 px for the
 * 4.2 units of height): arched shop windows below a gold belt, tall windows
 * with balconettes above. Returns the day map and the night-glow map.
 */
function palaceFacade(bays: number, seed: number, door = false) {
  const W = bays * 128;
  const H = 768;
  const r = rng(seed);
  const on = Array.from({ length: bays }, () => r() < 0.72);
  const tint = Array.from({ length: bays }, () => (r() < 0.3 ? 'cyan' : 'warm'));
  const draw = (glow: boolean) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = glow ? '#000' : STONE;
    c.fillRect(0, 0, W, H);
    if (!glow) {
      // Rusticated stone on the ground floor
      c.fillStyle = 'rgba(255,255,255,.06)';
      for (let y = 430; y < H; y += 34) c.fillRect(0, y, W, 3);
    }
    for (let i = 0; i < bays; i++) {
      const x = i * 128;
      // Upper floor: a tall arched window
      archPath(c, x + 30, 60, 68, 240);
      if (glow) {
        c.fillStyle = on[i] ? (tint[i] === 'cyan' ? '#00b8d8' : '#ffc860') : '#000';
        c.fill();
      } else {
        c.fillStyle = on[i] ? (tint[i] === 'cyan' ? '#8feeff' : '#ffd88a') : '#1c2350';
        c.fill();
        c.lineWidth = 9;
        c.strokeStyle = GOLD;
        c.stroke();
        c.fillStyle = PAL.ink;
        c.fillRect(x + 62, 64, 4, 236);
        c.fillRect(x + 30, 176, 68, 4);
        // Balconette
        c.fillStyle = GOLD;
        c.fillRect(x + 20, 300, 88, 10);
        for (let k = 0; k < 6; k++) c.fillRect(x + 24 + k * 16, 310, 5, 26);
        c.fillRect(x + 20, 334, 88, 6);
      }
      // Ground floor: an arched display window (the middle bay is the door on the corner front)
      if (door && i === Math.floor(bays / 2)) continue;
      archPath(c, x + 16, 450, 96, 290);
      if (glow) {
        c.fillStyle = '#ffc04a';
        c.fill();
        continue;
      }
      c.fillStyle = '#4a3a58';
      c.fill();
      // A display inside: plinths and goods
      c.fillStyle = PAL.ink;
      c.fillRect(x + 28, 680, 30, 60);
      c.fillRect(x + 70, 660, 30, 80);
      c.beginPath();
      c.arc(x + 43, 660, 14, 0, Math.PI * 2);
      c.fill();
      c.fillRect(x + 74, 610, 22, 46);
      c.lineWidth = 11;
      c.strokeStyle = GOLD;
      archPath(c, x + 16, 450, 96, 290);
      c.stroke();
    }
  };
  return { map: canvasTex(W, H, draw(false)), glow: canvasTex(W, H, draw(true)) };
}

/** A ring of arched windows, wrapped round a cylinder. */
function ringWindows(n: number, w: number, h: number, seed: number) {
  const r = rng(seed);
  const on = Array.from({ length: n }, () => r() < 0.8);
  const draw = (glow: boolean) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = glow ? '#000' : STONE;
    c.fillRect(0, 0, w, h);
    const bw = w / n;
    for (let i = 0; i < n; i++) {
      archPath(c, i * bw + bw * 0.28, h * 0.14, bw * 0.44, h * 0.72);
      c.fillStyle = glow ? (on[i] ? (i % 2 ? '#00b8d8' : '#ffc860') : '#000') : on[i] ? (i % 2 ? '#8feeff' : '#ffd88a') : '#1c2350';
      c.fill();
      if (!glow) {
        c.lineWidth = Math.max(4, bw * 0.05);
        c.strokeStyle = GOLD;
        c.stroke();
      }
    }
  };
  return { map: canvasTex(w, h, draw(false)), glow: canvasTex(w, h, draw(true)) };
}

const glowFacade = (t: { map: THREE.Texture; glow: THREE.Texture }, day = 0.12, night = 1.2) =>
  lit(new THREE.MeshToonMaterial({ map: t.map, emissiveMap: t.glow, emissive: '#ffffff' }), day, night);

/** The LED screens' slides. Fixed copy only: nothing here may name or hint at the token. */
const SLIDES = ['gm', 'brand', 'open', 'drop'] as const;
function drawSlide(c: CanvasRenderingContext2D, kind: (typeof SLIDES)[number], degen: HTMLImageElement | null) {
  const W = 512;
  const H = 288;
  const bg = c.createLinearGradient(0, H, W, 0);
  bg.addColorStop(0, '#3a0a4f');
  bg.addColorStop(0.55, '#1a1060');
  bg.addColorStop(1, '#063a6a');
  c.fillStyle = kind === 'brand' || kind === 'open' ? '#07060f' : bg;
  c.fillRect(0, 0, W, H);
  const pulse = c.createLinearGradient(0, 0, W, 0);
  pulse.addColorStop(0, '#ff6ad5');
  pulse.addColorStop(0.5, '#a64dff');
  pulse.addColorStop(1, '#00eaff');
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '4px';
  if (kind === 'gm') {
    if (degen) {
      const h = H * 0.92;
      const w = (degen.width / degen.height) * h;
      c.drawImage(degen, 24, H - h, w, h);
    }
    c.font = `900 150px ${FONT_DISPLAY}`;
    c.fillStyle = '#ffffff';
    c.fillText('GM', degen ? 370 : W / 2, H / 2 + 8);
  } else if (kind === 'brand') {
    c.font = `900 64px ${FONT_DISPLAY}`;
    c.fillStyle = '#ffffff';
    c.fillText('THE DEGEN', W / 2, 96);
    c.font = `900 92px ${FONT_DISPLAY}`;
    c.fillStyle = pulse;
    c.fillText('EMPORIUM', W / 2, 178);
    c.fillRect(120, 238, 272, 6);
  } else if (kind === 'open') {
    c.strokeStyle = '#00eaff';
    c.lineWidth = 8;
    c.strokeRect(40, 46, W - 80, H - 92);
    c.font = `900 108px ${FONT_DISPLAY}`;
    c.fillStyle = '#7cf4ff';
    c.fillText('OPEN 24/7', W / 2, H / 2 + 6);
  } else {
    c.font = `900 110px ${FONT_DISPLAY}`;
    c.fillStyle = '#ffffff';
    c.fillText('DROP 001', W / 2, 118);
    c.font = `700 40px ${FONT_MONO}`;
    c.fillStyle = '#ffd36b';
    c.fillText('COMING SOON', W / 2, 206);
  }
  // LED rows
  c.fillStyle = 'rgba(0,0,0,.28)';
  for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1);
}

function emporium(scene: THREE.Scene, ctx: LandmarkCtx, crowd: Idle[]) {
  const C = 14.9; // centre of the palace and its dome
  const sp = spot(scene, 'emporium', V(C, 6, C), 9.4, V(C, 15.2, C));
  const g = sp.group;
  const b = new Batch();
  const gold = lit(toon(GOLD, { emissive: '#ff9a2e' }), 0.03, 0.3);
  const stone = toon(STONE);
  const marble = toon('#2a2438');
  const roof = toon('#2b2540');
  const H1 = 4.2; // main body, two tall storeys
  const top = S + H1;
  const D45 = Math.PI / 4;
  const N: [number, number] = [Math.SQRT1_2, Math.SQRT1_2]; // the corner front faces the street corner
  const U: [number, number] = [Math.SQRT1_2, -Math.SQRT1_2]; // along the corner front
  const M: [number, number] = [PALACE.cut / 2, PALACE.cut / 2]; // middle of the corner front
  const at = (n: number, u: number): [number, number] => [M[0] + N[0] * n + U[0] * u, M[1] + N[1] * n + U[1] * u];

  // Body: a granite plinth, the two storeys, a gold belt between them, a deep cornice and the roof deck
  const body = new THREE.Mesh(planSlab(palacePlan(0), S, H1), stone);
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  b.add(planSlab(palacePlan(0.07), S, 0.32), marble);
  b.add(planSlab(palacePlan(0.1), S + 1.95, 0.14), gold);
  b.add(planSlab(palacePlan(0.2), top - 0.05, 0.24), stone);
  b.add(planSlab(palacePlan(0.26), top + 0.19, 0.06), gold);
  b.add(planSlab(palacePlan(-0.05), top + 0.25, 0.02), roof);

  // Facades: each wall gets its own run of bays, framed by gold pilasters
  const faces: { a: [number, number]; c: [number, number]; bays: number; street: boolean; door?: boolean }[] = [
    { a: [11.8, 18.0], c: [16.0, 18.0], bays: 6, street: true },
    { a: [16.0, 18.0], c: [18.0, 16.0], bays: 3, street: false, door: true },
    { a: [18.0, 16.0], c: [18.0, 11.8], bays: 6, street: true },
    { a: [18.0, 11.8], c: [11.8, 11.8], bays: 9, street: false },
    { a: [11.8, 11.8], c: [11.8, 18.0], bays: 9, street: false },
  ];
  const facadeMats = new Map<string, THREE.Material>();
  const screens: { tex: THREE.CanvasTexture; c: CanvasRenderingContext2D; k: number }[] = [];
  const tickers: THREE.Texture[] = [];
  faces.forEach((f, fi) => {
    const dx = f.c[0] - f.a[0];
    const dz = f.c[1] - f.a[1];
    const len = Math.hypot(dx, dz);
    const n: [number, number] = [-dz / len, dx / len];
    const ry = Math.atan2(n[0], n[1]);
    const key = `${f.bays}${f.door ? 'd' : ''}`;
    if (!facadeMats.has(key)) facadeMats.set(key, glowFacade(palaceFacade(f.bays, 60 + f.bays, f.door)));
    const wall = plane(len, H1, facadeMats.get(key)!);
    wall.position.set((f.a[0] + f.c[0]) / 2 + n[0] * 0.012, S + H1 / 2, (f.a[1] + f.c[1]) / 2 + n[1] * 0.012);
    wall.rotation.y = ry;
    wall.receiveShadow = true;
    g.add(wall);
    for (let k = 0; k <= f.bays; k++) {
      const s = (k / f.bays) * len;
      b.add(place(unitBox, f.a[0] + (dx / len) * s + n[0] * 0.03, S + H1 / 2, f.a[1] + (dz / len) * s + n[1] * 0.03, 0.09, H1, 0.07, 0, ry, 0), gold);
    }
    if (!f.street) return;
    // An LED screen with a scrolling ticker under it, in a gold frame
    const m: [number, number] = [(f.a[0] + f.c[0]) / 2, (f.a[1] + f.c[1]) / 2];
    b.add(place(unitBox, m[0] + n[0] * 0.08, S + 3.02, m[1] + n[1] * 0.08, 2.62, 1.86, 0.06, 0, ry, 0), gold);
    b.add(place(unitBox, m[0] + n[0] * 0.1, S + 3.02, m[1] + n[1] * 0.1, 2.5, 1.74, 0.05, 0, ry, 0), toon('#07060f'));
    const tex = canvasTex(512, 288, () => {});
    const c = (tex.image as HTMLCanvasElement).getContext('2d')!;
    const k = fi === 0 ? 0 : 2;
    drawSlide(c, SLIDES[k], ctx.degen);
    tex.needsUpdate = true;
    screens.push({ tex, c, k });
    const screen = plane(2.4, 1.35, lit(new THREE.MeshBasicMaterial({ map: tex }), 1, 1.1));
    screen.position.set(m[0] + n[0] * 0.13, S + 3.27, m[1] + n[1] * 0.13);
    screen.rotation.y = ry;
    g.add(fx(screen));
    const tickTex = canvasTex(2048, 64, (cx) => {
      cx.fillStyle = '#07060f';
      cx.fillRect(0, 0, 2048, 64);
      cx.font = `700 40px ${FONT_MONO}`;
      cx.textBaseline = 'middle';
      cx.fillStyle = '#ffd36b';
      const msg = 'GM DEGENS  ✦  OPEN 24/7  ✦  PULSECHAIN NATIVE  ✦  THE DEGEN EMPORIUM  ✦  ';
      const w = cx.measureText(msg).width;
      cx.save();
      cx.scale(2048 / w, 1);
      cx.fillText(msg, 0, 34);
      cx.restore();
      cx.fillStyle = 'rgba(0,0,0,.35)';
      for (let x = 0; x < 2048; x += 4) cx.fillRect(x, 0, 1, 64);
    });
    tickTex.wrapS = THREE.RepeatWrapping;
    tickTex.repeat.x = 0.42;
    tickers.push(tickTex);
    const ticker = plane(2.4, 0.22, lit(new THREE.MeshBasicMaterial({ map: tickTex }), 1, 1.1));
    ticker.position.set(m[0] + n[0] * 0.13, S + 2.36, m[1] + n[1] * 0.13);
    ticker.rotation.y = ry;
    g.add(fx(ticker));
  });
  let slide = 0;
  let nextSlide = 4.5;
  ctx.tick(({ t, dt }) => {
    for (const tk of tickers) tk.offset.x = (tk.offset.x + dt * 0.035) % 1;
    if (t < nextSlide) return;
    nextSlide = t + 4.5;
    slide++;
    for (const s of screens) {
      drawSlide(s.c, SLIDES[(s.k + slide) % SLIDES.length], ctx.degen);
      s.tex.needsUpdate = true;
    }
  });

  // Corner pavilions rise above the roof; one carries the helipad, one the viewing deck, one the searchlights
  const pavs: [number, number][] = [
    [11.8, 11.8],
    [16.4, 11.8],
    [11.8, 16.4],
  ];
  const inPav = (x: number, z: number) => pavs.some(([px, pz]) => x > px - 0.3 && x < px + 1.9 && z > pz - 0.3 && z < pz + 1.9);

  // Balustrade round the roof, stopping at the pavilions
  const rail = palacePlan(0.12);
  for (let i = 0; i < rail.length; i++) {
    const a = rail[i];
    const c = rail[(i + 1) % rail.length];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const n = Math.max(2, Math.round(len / 0.3));
    const pt = (f: number): [number, number] => [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f];
    for (let k = 0; k < n; k++) {
      const [x, z] = pt((k + 0.5) / n);
      if (inPav(x, z)) continue;
      b.box(x - 0.035, top + 0.27, z - 0.035, 0.07, 0.35, 0.07, stone);
      alongBox(b, pt(k / n), pt((k + 1) / n), top + 0.62, 0.07, 0.12, gold);
    }
  }

  // Grand front on the corner: marble steps, four giant gold columns, entablature and pediment
  for (let k = 0; k < 3; k++) {
    const dd = 1.35 - 0.2 * k;
    const len = 3.6 - 0.2 * k;
    const h = 0.1 * (k + 1);
    const [x, z] = at(dd / 2, 0);
    b.add(place(unitBox, x, S + h / 2, z, len, h, dd, 0, D45, 0), marble);
    const [nx, nz] = at(dd - 0.02, 0);
    b.add(place(unitBox, nx, S + h - 0.01, nz, len, 0.03, 0.05, 0, D45, 0), gold);
  }
  const floor = S + 0.3;
  const colTop = S + 3.72;
  for (const u of [-1.15, -0.38, 0.38, 1.15]) {
    const [x, z] = at(0.72, u);
    b.add(place(unitBox, x, floor + 0.07, z, 0.34, 0.14, 0.34, 0, D45, 0), stone);
    cylAt(b, x, floor + 0.14, z, 0.12, colTop - floor - 0.28, gold, 14, 0.105);
    b.add(place(unitBox, x, colTop - 0.07, z, 0.32, 0.14, 0.32, 0, D45, 0), gold);
  }
  {
    const [x, z] = at(0.52, 0);
    b.add(place(unitBox, x, colTop + 0.22, z, 3.1, 0.44, 1.04, 0, D45, 0), stone);
    b.add(place(unitBox, x, colTop + 0.02, z, 3.16, 0.05, 1.1, 0, D45, 0), gold);
    b.add(place(unitBox, x, colTop + 0.45, z, 3.22, 0.06, 1.14, 0, D45, 0), gold);
    const ped = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-1.6, 0), new THREE.Vector2(1.6, 0), new THREE.Vector2(0, 0.72)]), { depth: 1.08, bevelEnabled: false });
    ped.rotateY(D45);
    ped.translate(M[0] - N[0] * 0.02, colTop + 0.48, M[1] - N[1] * 0.02);
    b.add(ped, stone);
    const tym = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-1.32, 0.09), new THREE.Vector2(1.32, 0.09), new THREE.Vector2(0, 0.6)]));
    tym.rotateY(D45);
    const [tx, tz] = at(1.07, 0);
    tym.translate(tx, colTop + 0.48, tz);
    b.add(tym, gold);
    const [sx, sz] = at(1.06, 0);
    const name = sign(signMat(neonSign('THE DEGEN EMPORIUM', '#ffd36b', { board: null, w: 2048, h: 256, size: 150 }), 1, 1.35), 2.8, 0.35, sx, colTop + 0.24, sz);
    name.rotation.y = D45;
    g.add(name);
  }
  // The door: tall gold doors with the shop glowing behind them
  const doorTex = canvasTex(256, 512, (c) => {
    const gr = c.createLinearGradient(0, 512, 0, 0);
    gr.addColorStop(0, '#ffe2a0');
    gr.addColorStop(1, '#ff9a3c');
    archPath(c, 10, 10, 236, 492);
    c.fillStyle = gr;
    c.fill();
    c.lineWidth = 18;
    c.strokeStyle = GOLD;
    c.stroke();
    c.fillStyle = GOLD;
    c.fillRect(124, 120, 8, 382);
    c.fillRect(10, 300, 236, 8);
    c.fillStyle = PAL.ink;
    c.fillRect(100, 330, 10, 40);
    c.fillRect(146, 330, 10, 40);
  });
  const [dx0, dz0] = at(0.035, 0);
  const door = sign(signMat(doorTex, 0.95, 1.3), 1.05, 2.1, dx0, floor + 1.05, dz0);
  door.rotation.y = D45;
  g.add(door);

  const PT = top + 1.35;
  const pavMat = facadeMat({ cols: 2, rows: 1, wall: STONE, glass: '#1c2350', lit: [PAL.warm, PAL.warm, PAL.cyan], litRatio: 0.9, seed: 24 }, 0.12, 1.2);
  for (const [x, z] of pavs) {
    g.add(walls(x, top, z, 1.6, PT - top, 1.6, pavMat, roof));
    b.box(x - 0.08, PT - 0.12, z - 0.08, 1.76, 0.12, 1.76, gold);
    b.box(x - 0.04, PT, z - 0.04, 1.68, 0.08, 1.68, stone);
    for (const [qx, qz] of [
      [x, z],
      [x + 1.52, z],
      [x, z + 1.52],
      [x + 1.52, z + 1.52],
    ])
      b.box(qx - 0.02, top, qz - 0.02, 0.12, PT - top - 0.12, 0.12, gold);
  }
  const deck = PT + 0.08;

  // Helipad and a parked chopper
  {
    const pad = canvasTex(256, 256, (c) => {
      c.fillStyle = '#1b1729';
      c.fillRect(0, 0, 256, 256);
      c.lineWidth = 12;
      c.strokeStyle = GOLD;
      c.beginPath();
      c.arc(128, 128, 104, 0, Math.PI * 2);
      c.stroke();
      c.font = `900 150px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#ffffff';
      c.fillText('H', 128, 136);
    });
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.04, 32), [roof, new THREE.MeshToonMaterial({ map: pad }), roof]);
    disk.position.set(17.2, deck + 0.02, 12.6);
    disk.receiveShadow = true;
    g.add(disk);
    const heli = new THREE.Group();
    heli.position.set(17.2, deck + 0.04, 12.6);
    heli.rotation.y = -0.7;
    const hb = new Batch();
    const hull = new THREE.SphereGeometry(0.27, 16, 12);
    hull.scale(1.5, 0.95, 0.85);
    hull.translate(0, 0.36, 0);
    hb.add(hull, toon('#16131f'));
    const glass = new THREE.SphereGeometry(0.2, 12, 10);
    glass.scale(1, 0.85, 0.95);
    glass.translate(0.2, 0.42, 0);
    hb.add(glass, toon('#5fd6ff'));
    hb.box(-0.95, 0.38, -0.04, 0.7, 0.08, 0.08, toon('#16131f'));
    hb.box(-1.0, 0.38, -0.025, 0.1, 0.28, 0.05, gold);
    hb.box(-0.3, 0.22, -0.3, 0.06, 0.06, 0.6, gold);
    for (const s of [-0.22, 0.22]) {
      hb.box(-0.42, 0.02, s - 0.015, 0.86, 0.03, 0.03, gold);
      hb.box(-0.2, 0.02, s - 0.015, 0.03, 0.2, 0.03, gold);
      hb.box(0.15, 0.02, s - 0.015, 0.03, 0.2, 0.03, gold);
    }
    cylAt(hb, 0, 0.58, 0, 0.03, 0.12, gold, 8);
    hb.build(heli);
    const rotor = new THREE.Group();
    rotor.position.y = 0.71;
    const rb = new Batch();
    rb.box(-0.68, 0, -0.035, 1.36, 0.015, 0.07, toon('#16131f'));
    rb.box(-0.035, 0, -0.68, 0.07, 0.015, 1.36, toon('#16131f'));
    rb.build(rotor);
    heli.add(rotor);
    g.add(heli);
    ctx.tick(({ t }) => (rotor.rotation.y = t * 0.6));
  }

  // Viewing deck: glass rail, gold top rail, coin telescopes, a couple of visitors
  {
    const [x, z] = pavs[2];
    const glassMat = new THREE.MeshBasicMaterial({ color: '#7fe9ff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    const corners: [number, number][] = [
      [x + 0.06, z + 0.06],
      [x + 1.54, z + 0.06],
      [x + 1.54, z + 1.54],
      [x + 0.06, z + 1.54],
    ];
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const c = corners[(i + 1) % 4];
      const pane = plane(Math.hypot(c[0] - a[0], c[1] - a[1]), 0.32, glassMat);
      pane.position.set((a[0] + c[0]) / 2, deck + 0.16, (a[1] + c[1]) / 2);
      pane.rotation.y = Math.atan2(-(c[1] - a[1]), c[0] - a[0]);
      g.add(fx(pane));
      alongBox(b, a, c, deck + 0.32, 0.04, 0.05, gold);
    }
    for (const [tx, tz, ry] of [
      [x + 0.45, z + 1.3, 0],
      [x + 1.3, z + 0.45, Math.PI / 2],
    ] as const) {
      cylAt(b, tx, deck, tz, 0.035, 0.32, gold, 8);
      const scope = new THREE.CylinderGeometry(0.05, 0.035, 0.26, 10);
      scope.rotateX(Math.PI / 2 - 0.35);
      scope.rotateY(ry);
      scope.translate(tx, deck + 0.38, tz);
      b.add(scope, toon('#16131f'));
    }
    crowd.push({ x: x + 0.85, z: z + 1.25, ry: Math.PI, y: deck }, { x: x + 1.25, z: z + 0.7, ry: -Math.PI / 2, y: deck });
  }

  // Searchlights on the back pavilion, sweeping the sky in PulseChain colours after dark
  {
    const beamTex = canvasTex(64, 256, (c) => {
      const gr = c.createLinearGradient(0, 256, 0, 0);
      gr.addColorStop(0, 'rgba(255,255,255,.6)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, 64, 256);
    });
    const [x, z] = pavs[0];
    for (const [lx, lz, color, ph] of [
      [x + 0.4, z + 1.2, '#7cf4ff', 0],
      [x + 1.2, z + 0.4, '#ff6ad5', Math.PI],
    ] as const) {
      cylAt(b, lx, deck, lz, 0.16, 0.1, stone, 12);
      const pivot = new THREE.Group();
      pivot.position.set(lx, deck + 0.1, lz);
      const lampGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.22, 12);
      lampGeo.translate(0, 0.11, 0);
      const lamp = new THREE.Mesh(lampGeo, gold);
      lamp.castShadow = true;
      pivot.add(lamp);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.09, 26, 16, 1, true), lit(glowMat(color, 1, beamTex), 0, 0.12));
      cone.position.y = 13.2;
      pivot.add(fx(cone));
      g.add(pivot);
      ctx.tick(({ t }) => {
        pivot.rotation.z = Math.sin(t * 0.3 + ph) * 0.5;
        pivot.rotation.x = Math.cos(t * 0.3 + ph) * 0.5;
      });
    }
  }

  // Drum: a ring of gold columns round arched windows, an attic with the name in neon
  const DR = 1.85;
  const drumH = 2.0;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(DR, DR, drumH, 48, 1, true), glowFacade(ringWindows(16, 2048, 350, 31), 0.1, 1.15));
  drum.position.set(C, top + 0.25 + drumH / 2, C);
  drum.castShadow = drum.receiveShadow = true;
  g.add(drum);
  cylAt(b, C, top + 0.25, C, DR + 0.18, 0.14, stone, 48);
  for (let k = 0; k < 16; k++) {
    const a = ((k + 0.5) / 16) * Math.PI * 2;
    cylAt(b, C + Math.sin(a) * (DR + 0.1), top + 0.39, C + Math.cos(a) * (DR + 0.1), 0.065, drumH - 0.14, gold, 8);
  }
  const attic = top + 0.25 + drumH;
  cylAt(b, C, attic, C, DR + 0.24, 0.1, gold, 48);
  cylAt(b, C, attic + 0.1, C, DR + 0.12, 0.42, stone, 48);
  const bandTex = canvasTex(2048, 128, (c) => {
    c.font = `900 84px ${FONT_DISPLAY}`;
    c.textBaseline = 'middle';
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '10px';
    const msg = 'THE DEGEN EMPORIUM  ✦  ';
    const w = c.measureText(msg).width;
    const gr = c.createLinearGradient(0, 0, 2048, 0);
    gr.addColorStop(0, '#ff6ad5');
    gr.addColorStop(0.5, '#00eaff');
    gr.addColorStop(1, '#ff6ad5');
    c.save();
    c.scale(2048 / w, 1);
    c.shadowColor = '#e219e5';
    c.shadowBlur = 16;
    c.fillStyle = gr;
    c.fillText(msg, 0, 66);
    c.restore();
  });
  bandTex.wrapS = THREE.RepeatWrapping;
  bandTex.repeat.x = 2;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(DR + 0.14, DR + 0.14, 0.36, 64, 1, true), signMat(bandTex, 1, 1.35));
  band.position.set(C, attic + 0.31, C);
  g.add(fx(band));
  cylAt(b, C, attic + 0.52, C, DR + 0.18, 0.08, gold, 48);

  // The great dome: black glass between gold ribs and rings
  const domeY = attic + 0.6;
  const R = DR + 0.02;
  const HD = 3.05;
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const th = (i / 16) * (Math.PI / 2);
    prof.push(new THREE.Vector2(Math.max(0.001, R * Math.cos(th)), HD * Math.sin(th)));
  }
  const domeGeo = new THREE.LatheGeometry(prof, 48);
  domeGeo.translate(C, domeY, C);
  b.add(domeGeo, toon('#1f1838'));
  const ribPath = (a: number, lift = 0) =>
    Array.from({ length: 13 }, (_, j) => {
      const th = (j / 12) * (Math.PI / 2) * 0.93;
      return new THREE.Vector3(C + Math.sin(a) * (R + lift) * Math.cos(th), domeY + (HD + lift) * Math.sin(th), C + Math.cos(a) * (R + lift) * Math.cos(th));
    });
  for (let k = 0; k < 12; k++) b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPath((k / 12) * Math.PI * 2, 0.03)), 18, 0.045, 5, false), gold);
  for (const th of [0, Math.PI / 6, Math.PI / 3]) {
    const ring = new THREE.TorusGeometry(R * Math.cos(th) + 0.02, th ? 0.032 : 0.06, 5, 56);
    ring.rotateX(Math.PI / 2);
    ring.translate(C, domeY + HD * Math.sin(th), C);
    b.add(ring, gold);
  }

  // Lantern on top, then the logo, crowning the whole thing
  const lanY = domeY + HD - 0.14;
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.7, 24, 1, true), glowFacade(ringWindows(8, 512, 160, 33), 0.15, 1.3));
  lantern.position.set(C, lanY + 0.35, C);
  g.add(lantern);
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) / 8) * Math.PI * 2;
    cylAt(b, C + Math.sin(a) * 0.46, lanY, C + Math.cos(a) * 0.46, 0.035, 0.7, gold, 6);
  }
  cylAt(b, C, lanY + 0.7, C, 0.52, 0.08, gold, 24);
  const cupola = new THREE.SphereGeometry(0.46, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  cupola.scale(1, 0.75, 1);
  cupola.translate(C, lanY + 0.78, C);
  b.add(cupola, gold);
  const cupTop = lanY + 0.78 + 0.345;

  const lw = 3.9;
  const lh = lw * (494 / 729);
  const ly = cupTop + 0.32 + lh / 2;
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(lw, lh),
    lit(new THREE.MeshBasicMaterial({ map: ctx.logo, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide }), 1, 1.3)
  );
  logo.position.set(C + 0.08, ly, C + 0.08);
  logo.rotation.y = D45;
  occlude(logo, ctx.logo);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(lw * 1.45, lh * 1.45), lit(glowMat(PAL.magenta, 1), 0.1, 0.2));
  halo.position.set(C - 0.02, ly, C - 0.02);
  halo.rotation.y = D45;
  g.add(fx(logo), fx(halo));
  for (const o of [-0.3, 0.3]) beam(b, V(C + U[0] * o, cupTop - 0.05, C + U[1] * o), V(C + U[0] * o * 2.4, ly - lh * 0.32, C + U[1] * o * 2.4), 0.06, gold);
  b.build(g);

  // Chasing marquee lights along the cornices, pavilions, drum, ribs and pediment
  {
    const bulbs: { p: THREE.Vector3; s: number; i: number; run: boolean }[] = [];
    const polyline = (pts: THREE.Vector3[], closed: boolean, run: boolean, step = 0.19) => {
      let s = 0;
      let i = 0;
      const n = closed ? pts.length : pts.length - 1;
      for (let e = 0; e < n; e++) {
        const a = pts[e];
        const c = pts[(e + 1) % pts.length];
        const len = a.distanceTo(c);
        const k = Math.max(1, Math.round(len / step));
        for (let j = 0; j < k; j++) bulbs.push({ p: a.clone().lerp(c, j / k), s: s + (len * j) / k, i: i++, run });
        s += len;
      }
      if (!closed) bulbs.push({ p: pts[pts.length - 1].clone(), s, i, run });
    };
    const loop = (pts: [number, number][], y: number) => polyline(pts.map(([x, z]) => V(x, y, z)), true, false);
    const ring = (r: number, y: number, n: number) => polyline(Array.from({ length: n }, (_, k) => V(C + Math.sin((k / n) * Math.PI * 2) * r, y, C + Math.cos((k / n) * Math.PI * 2) * r)), true, false, 0.16);
    loop(palacePlan(0.3), top + 0.24);
    loop(palacePlan(0.17), S + 2.1);
    for (const [x, z] of pavs)
      loop(
        [
          [x - 0.1, z - 0.1],
          [x + 1.7, z - 0.1],
          [x + 1.7, z + 1.7],
          [x - 0.1, z + 1.7],
        ],
        PT - 0.02
      );
    ring(DR + 0.26, attic + 0.08, 64);
    ring(0.55, lanY + 0.74, 16);
    for (let k = 0; k < 12; k++) polyline(ribPath((k / 12) * Math.PI * 2, 0.09), false, true, 0.2);
    const ped = [at(1.12, -1.62), at(1.12, 0), at(1.12, 1.62)].map(([x, z], i) => V(x, colTop + 0.5 + (i === 1 ? 0.75 : 0), z));
    polyline(ped, false, true, 0.17);
    for (const u of [-1.15, 1.15]) {
      const [x, z] = at(0.72 + 0.14, u);
      polyline([V(x, floor + 0.2, z), V(x, colTop - 0.1, z)], false, true, 0.2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bulbs.flatMap((u) => [u.p.x, u.p.y, u.p.z])), 3));
    const col = new THREE.BufferAttribute(new Float32Array(bulbs.length * 3), 3);
    geo.setAttribute('color', col);
    const mat = new THREE.PointsMaterial({ size: 0.55, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const lights = fx(new THREE.Points(geo, lit(mat, 0, 1)));
    g.add(lights);
    const stops = ['#ff6ad5', '#e219e5', '#8000ff', '#037dff', '#00eaff'].map((h) => new THREE.Color(h));
    const tmp = new THREE.Color();
    const hue = (f: number) => {
      const x = (((f % 1) + 1) % 1) * stops.length;
      const k = Math.floor(x);
      return tmp.copy(stops[k]).lerp(stops[(k + 1) % stops.length], x - k);
    };
    let painted = false;
    ctx.tick(({ t, night }) => {
      if (night < 0.02 && painted) return;
      painted = true;
      const step = Math.floor(t * 6);
      bulbs.forEach((u, i) => {
        const v = u.run ? 0.18 + 0.82 * Math.pow(Math.max(0, Math.sin(u.s * 2.2 - t * 4)), 6) : (u.i + step) % 3 === 0 ? 1 : 0.16;
        const c = hue(u.s * 0.05 + t * 0.04);
        col.setXYZ(i, c.r * v, c.g * v, c.b * v);
      });
      col.needsUpdate = true;
    });
  }

  // Forecourt: a grand fountain at the foot of the steps, planters and lamps along the wings
  const pb = new Batch();
  const FX0 = 18.9;
  cylAt(pb, FX0, S, FX0, 0.8, 0.3, marble, 32);
  const rim = new THREE.TorusGeometry(0.8, 0.045, 6, 40);
  rim.rotateX(Math.PI / 2);
  rim.translate(FX0, S + 0.3, FX0);
  pb.add(rim, gold);
  cylAt(pb, FX0, S + 0.3, FX0, 0.12, 0.45, gold, 12, 0.09);
  cylAt(pb, FX0, S + 0.72, FX0, 0.1, 0.12, gold, 20, 0.24);
  for (const [x, z] of [
    [19.0, 12.6],
    [19.0, 14.6],
    [12.6, 19.0],
    [14.6, 19.0],
  ]) {
    cylAt(pb, x, S, z, 0.42, 0.36, stone, 16);
    cylAt(pb, x, S + 0.34, z, 0.45, 0.05, gold, 16);
    addTree(x, z, 0.85, false, S + 0.36);
  }
  pb.build(scene);
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.02, 32), waterMat);
  pool.position.set(FX0, S + 0.28, FX0);
  scene.add(pool);

  const n = ctx.low ? 60 : 150;
  const jets = particles(n, '#bff6ff', 0.13);
  const seeds = Array.from({ length: n }, () => [rand() * Math.PI * 2, rand(), 0.6 + rand() * 0.5]);
  scene.add(jets);
  const pos = jets.geometry.attributes.position as THREE.BufferAttribute;
  ctx.tick(({ t }) => {
    for (let i = 0; i < n; i++) {
      const [a, ph, sp2] = seeds[i];
      const k = (t * sp2 + ph) % 1;
      const r = k * 0.66;
      pos.setXYZ(i, FX0 + Math.cos(a) * r, S + 0.9 + k * 1.3 - k * k * 1.9, FX0 + Math.sin(a) * r);
    }
    pos.needsUpdate = true;
  });

  for (const [x, z, ry] of [
    [17.4, 19.2, -1.37],
    [19.3, 17.6, 2.84],
    [18.2, 18.25, Math.PI / 4],
  ])
    crowd.push({ x, z, ry });
  addLamp(11.6, 11.6, Math.PI / 4);
  addLamp(19.5, 11.6, Math.PI * 0.75);
  addLamp(11.6, 19.5, -Math.PI / 4);
  addLamp(19.35, 16.3, -Math.PI * 0.75);
  addLamp(16.3, 19.35, -Math.PI * 0.75);
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
  const awning = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.05, 0.95), [toon('#c22'), toon('#c22'), new THREE.MeshToonMaterial({ map: stripes }), toon('#c22'), new THREE.MeshToonMaterial({ map: stripes }), toon('#c22')]);
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
  const bag = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.7, 1.0), [bagMat, bagMat, toon('#e8e4f8'), toon('#e8e4f8'), bagMat, bagMat]);
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
  const aframe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.05), [toon('#14102a'), toon('#14102a'), toon('#14102a'), toon('#14102a'), aMat, aMat]);
  aframe.position.set(24.6, S + 0.42, 18.3);
  aframe.rotation.x = -0.15;
  aframe.castShadow = true;
  g.add(aframe);
  b.build(g);

  // Parking at the back with two cars
  const pb = new Batch();
  for (let k = 0; k <= 4; k++) pb.box(23.4 + k * 1.3, S + 0.006, 11.0, 0.06, 0.005, 1.2, toon('#d9d4ef'));
  parkedCar(pb, 24.1, 11.6, Math.PI / 2, '#00c2ff');
  parkedCar(pb, 26.7, 11.6, Math.PI / 2, '#ffd23f');
  pb.build(scene);

  // The queue for the drop
  // Kept clear of the sidewalk lanes along the kerb
  for (let k = 0; k < 5; k++) crowd.push({ x: 26.1 + (k - 2) * 0.05, z: 17.6 + k * 0.38, ry: Math.PI });
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

export function parkedCar(b: Batch, x: number, z: number, ry: number, color: string) {
  const body = toon(color);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry));
    geo.translate(x, S, z);
    b.add(geo, mat);
  };
  const box = (w: number, h: number, d: number, px: number, py: number, pz: number) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(px, py, pz);
    return geo;
  };
  add(box(1.05, 0.32, 0.56, 0, 0.22, 0), body);
  add(box(0.56, 0.26, 0.5, -0.08, 0.51, 0), toon('#8fe7ff'));
  for (const [px, pz] of [
    [-0.32, 0.29],
    [0.32, 0.29],
    [-0.32, -0.29],
    [0.32, -0.29],
  ]) {
    const w = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10);
    w.rotateX(Math.PI / 2);
    w.translate(px, 0.11, pz);
    add(w, toon('#14121f'));
  }
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
  const wall = lit(new THREE.MeshToonMaterial({ map: ribs, emissiveMap: ribGlow, emissive: '#ffffff' }), 0.1, 1.5);
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
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.9), [tex, tex, plain, plain, tex, tex]);
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
  b.box(0.9, S + 0.12, 16.6, 6.8, 0.12, 1.5, toon('#ebe2cc'));
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
  crowd.push({ x: 4.3, z: 18.7, ry: 0 });
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
    const x = 4.0 + Math.cos(a) * 4.2;
    const z = 25.6 + Math.sin(a) * 2.6;
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

function construction(scene: THREE.Scene, ctx: LandmarkCtx) {
  const sp = spot(scene, 'plan', V(26.2, 2.2, 26.0), 9, V(25.0, 6.2, 24.8));
  const g = sp.group;
  const b = new Batch();
  const concrete = toon('#9a97ad');
  const col = toon('#b5b2c6');
  b.box(22.8, S, 22.8, 4.6, 0.2, 4.2, concrete);
  const xs = [22.9, 25.0, 27.1];
  const zs = [22.9, 24.8, 26.7];
  let y = S + 0.2;
  const levels: { h: number; rows: number[]; slab: [number, number] | null }[] = [
    { h: 1.6, rows: zs, slab: [22.8, 4.2] },
    { h: 1.6, rows: zs, slab: [22.8, 2.3] },
    { h: 1.1, rows: [zs[0]], slab: null },
  ];
  for (const L of levels) {
    for (const x of xs) for (const z of L.rows) b.box(x, y, z, 0.3, L.h, 0.3, col);
    y += L.h;
    if (L.slab) {
      b.box(22.8, y, L.slab[0], 4.6, 0.18, L.slab[1], concrete);
      y += 0.18;
    }
  }
  for (const x of xs) for (const dx of [0.08, 0.22]) b.box(x + dx, y, 23.0, 0.03, 0.5, 0.03, toon('#b07a5a'));
  // Scaffolding on the front
  const pipe = toon('#c9c4e6');
  for (let x = 22.6; x <= 27.6; x += 1.25) b.box(x, S, 27.35, 0.05, 3.6, 0.05, pipe);
  for (const yy of [S + 1.0, S + 2.0, S + 3.0]) {
    b.box(22.6, yy, 27.35, 5.05, 0.05, 0.05, pipe);
    b.box(22.6, yy - 0.04, 27.15, 5.05, 0.04, 0.25, toon('#8a5a2b'));
  }

  // Tower crane: lattice mast, a jib that slews, a beam swinging on the hook
  const yellow = toon(PAL.craneYellow);
  const mx = 28.9;
  const mz = 23.4;
  const mh = 7.6;
  const w = 0.5;
  for (const [dx, dz] of [
    [0, 0],
    [w, 0],
    [w, w],
    [0, w],
  ])
    b.box(mx + dx - 0.03, S, mz + dz - 0.03, 0.06, mh, 0.06, yellow);
  for (let yy = 0; yy < mh; yy += 0.5) {
    beam(b, V(mx, S + yy, mz + w), V(mx + w, S + yy + 0.5, mz + w), 0.035, yellow);
    beam(b, V(mx + w, S + yy, mz), V(mx + w, S + yy + 0.5, mz + w), 0.035, yellow);
    beam(b, V(mx, S + yy, mz), V(mx + w, S + yy + 0.5, mz), 0.035, yellow);
    beam(b, V(mx, S + yy, mz), V(mx, S + yy + 0.5, mz + w), 0.035, yellow);
  }
  b.build(g);

  const slew = new THREE.Group();
  slew.position.set(mx + w / 2, S + mh, mz + w / 2);
  g.add(slew);
  const jb = new Batch();
  jb.box(-0.45, 0, -0.4, 0.9, 0.7, 0.8, yellow);
  jb.box(0.05, 0.15, 0.4, 0.4, 0.4, 0.02, toon('#8fe7ff'));
  const jl = 7.2;
  for (const zz of [-0.22, 0.22]) jb.box(-jl, 0.7, zz - 0.03, jl + 2.6, 0.06, 0.06, yellow);
  jb.box(-jl, 1.15, -0.03, jl + 2.6, 0.06, 0.06, yellow);
  for (let x = -jl; x < 2.6; x += 0.5) {
    beam(jb, V(x, 0.73, -0.22), V(x + 0.25, 1.15, 0), 0.03, yellow);
    beam(jb, V(x + 0.25, 1.15, 0), V(x + 0.5, 0.73, 0.22), 0.03, yellow);
  }
  jb.box(1.6, 0.2, -0.35, 0.9, 0.6, 0.7, toon('#6f6c80'));
  beam(jb, V(0, 0.7, 0), V(0, 2.4, 0), 0.08, yellow);
  beam(jb, V(0, 2.4, 0), V(-jl * 0.8, 1.15, 0), 0.025, toon('#1b1830'));
  beam(jb, V(0, 2.4, 0), V(2.4, 1.15, 0), 0.025, toon('#1b1830'));
  jb.build(slew);
  const hook = new THREE.Group();
  hook.position.set(-4.6, 0.7, 0);
  slew.add(hook);
  const hb = new Batch();
  hb.box(-0.15, -0.1, -0.15, 0.3, 0.12, 0.3, toon('#1b1830'));
  hb.box(-0.01, -3.0, -0.01, 0.02, 2.9, 0.02, toon('#1b1830'));
  hb.box(-0.8, -3.3, -0.1, 1.6, 0.22, 0.2, toon('#e23b3b'));
  hb.build(hook);
  ctx.tick(({ t }) => {
    slew.rotation.y = Math.sin(t * 0.11) * 0.55;
    hook.rotation.x = Math.sin(t * 0.9) * 0.06;
    hook.rotation.z = Math.cos(t * 0.7) * 0.05;
  });

  // Fence, banner, cones, a dirt pile, a site toilet
  const fb = new Batch();
  const mesh = canvasTex(128, 128, (c) => {
    c.strokeStyle = 'rgba(200,196,230,.85)';
    c.lineWidth = 3;
    for (let i = -128; i < 256; i += 16) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 128, 128);
      c.moveTo(i + 128, 0);
      c.lineTo(i, 128);
      c.stroke();
    }
  });
  mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping;
  mesh.repeat.set(6, 1);
  const meshMat = new THREE.MeshBasicMaterial({ map: mesh, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  for (let x = 22.4; x <= 30.75; x += 1.04) fb.box(x, S, 30.7, 0.06, 1.2, 0.06, toon('#8b86b8'));
  for (let z = 22.4; z <= 30.75; z += 1.04) fb.box(30.7, S, z, 0.06, 1.2, 0.06, toon('#8b86b8'));
  const f1 = plane(8.35, 1.15, meshMat);
  f1.position.set(26.57, S + 0.6, 30.73);
  const f2 = plane(8.35, 1.15, meshMat);
  f2.position.set(30.73, S + 0.6, 26.57);
  f2.rotation.y = Math.PI / 2;
  g.add(fx(f1), fx(f2));
  const banner = canvasTex(2048, 160, (c) => {
    c.fillStyle = PAL.craneYellow;
    c.fillRect(0, 0, 2048, 160);
    c.lineWidth = 12;
    c.strokeStyle = PAL.ink;
    c.strokeRect(6, 6, 2036, 148);
    c.font = `700 82px ${FONT_MONO}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = PAL.ink;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '6px';
    c.fillText("WHAT'S NEXT · THE PLAN, ROUGHLY", 1024, 84);
  });
  const ban = plane(5.6, 0.44, new THREE.MeshToonMaterial({ map: banner }));
  ban.position.set(26.4, S + 0.75, 30.77);
  g.add(ban);
  for (const [x, z] of [
    [23.2, 28.8],
    [24.2, 29.4],
    [28.8, 27.6],
  ]) {
    const c = new THREE.ConeGeometry(0.13, 0.4, 10);
    c.translate(x, S + 0.2, z);
    fb.add(c, toon('#ff8a3d'));
  }
  const dirt = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dirt.scale(1.1, 0.6, 0.9);
  dirt.translate(27.6, S, 29.2);
  fb.add(dirt, toon('#7a5240'));
  fb.box(22.7, S, 29.4, 0.7, 1.3, 0.7, toon('#2a6fd6'));
  fb.build(g);

  // Floodlights for night shifts
  const flood = lit(glowMat('#fff2c0', 1), 0, 0.3);
  for (const [x, z] of [
    [22.5, 22.5],
    [30.5, 22.5],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 6), toon('#1b1830'));
    pole.position.set(x, S + 1.6, z);
    scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.15), neon('#fff6d6', 0.6, 3));
    lamp.position.set(x, S + 3.25, z);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), flood);
    glow.position.set(x, S + 3.25, z);
    glow.lookAt(26.5, S + 3.25, 40);
    scene.add(fx(lamp), fx(glow));
  }
  return sp;
}

/* ---------- Decoration blocks ---------- */

function park(scene: THREE.Scene, crowd: Idle[]) {
  const b = new Batch();
  // Water tower
  const legTop = S + 4.2;
  const v = toon('#3a3466');
  const legs: [number, number][] = [
    [1.8, 1.8],
    [3.4, 1.8],
    [3.4, 3.4],
    [1.8, 3.4],
  ];
  for (const [x, z] of legs) beam(b, V(x, S, z), V(2.6 + (x - 2.6) * 0.6, legTop, 2.6 + (z - 2.6) * 0.6), 0.1, v);
  for (const yy of [1.5, 3.0]) {
    for (let k = 0; k < 4; k++) {
      const [ax, az] = legs[k];
      const [bx, bz] = legs[(k + 1) % 4];
      const f = 1 - (yy / 4.2) * 0.4;
      beam(b, V(2.6 + (ax - 2.6) * f, S + yy, 2.6 + (az - 2.6) * f), V(2.6 + (bx - 2.6) * f, S + yy, 2.6 + (bz - 2.6) * f), 0.05, v);
    }
  }
  const gm = canvasTex(1024, 256, (c) => {
    c.fillStyle = '#5d4f9a';
    c.fillRect(0, 0, 1024, 256);
    c.strokeStyle = 'rgba(0,0,0,.25)';
    c.lineWidth = 4;
    for (let x = 0; x < 1024; x += 64) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 256);
      c.stroke();
    }
    c.font = `900 170px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 16;
    c.strokeStyle = PAL.ink;
    for (const x of [128, 640]) {
      c.strokeText('GM', x, 136);
      c.fillStyle = PAL.pink;
      c.fillText('GM', x, 136);
    }
  });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.7, 28), [new THREE.MeshToonMaterial({ map: gm }), toon('#41377a'), toon('#41377a')]);
  tank.position.set(2.6, legTop + 0.85, 2.6);
  tank.rotation.y = -Math.PI / 4;
  tank.castShadow = true;
  scene.add(tank);
  const cone = new THREE.ConeGeometry(1.15, 0.8, 28);
  cone.translate(2.6, legTop + 1.7 + 0.4, 2.6);
  b.add(cone, toon('#41377a'));

  // Basketball court with hoops
  const court = canvasTex(512, 768, (c) => {
    c.fillStyle = '#b4513a';
    c.fillRect(0, 0, 512, 768);
    c.strokeStyle = '#f3e9dc';
    c.lineWidth = 8;
    c.strokeRect(20, 20, 472, 728);
    c.beginPath();
    c.moveTo(20, 384);
    c.lineTo(492, 384);
    c.stroke();
    c.beginPath();
    c.arc(256, 384, 60, 0, Math.PI * 2);
    c.stroke();
    c.strokeRect(176, 20, 160, 150);
    c.strokeRect(176, 598, 160, 150);
  });
  const ct = plane(2.8, 4.0, new THREE.MeshToonMaterial({ map: court }));
  ct.rotation.x = -Math.PI / 2;
  ct.position.set(6.6, S + 0.01, 6.5);
  ct.receiveShadow = true;
  scene.add(ct);
  for (const [z, d] of [
    [4.4, 1],
    [8.6, -1],
  ]) {
    b.box(6.55, S, z - 0.05, 0.1, 1.5, 0.1, toon('#1b1830'));
    b.box(6.2, S + 1.4, z + d * 0.1 - 0.03, 0.8, 0.5, 0.06, toon('#f3f2f7'));
    const rim = new THREE.TorusGeometry(0.16, 0.025, 6, 16);
    rim.rotateX(Math.PI / 2);
    rim.translate(6.6, S + 1.45, z + d * 0.32);
    b.add(rim, toon('#ff6a2f'));
  }
  crowd.push({ x: 6.2, z: 6.0, ry: 0.4 }, { x: 7.0, z: 7.1, ry: Math.PI + 0.3 });
  for (const [x, z] of [
    [1.0, 5.4],
    [1.2, 6.9],
    [1.6, 8.2],
    [3.2, 8.3],
    [4.4, 1.0],
    [5.8, 1.1],
    [7.3, 1.0],
    [8.2, 2.4],
    [8.3, 3.7],
    [3.9, 4.6],
    [4.4, 7.0],
  ])
    addTree(x, z);
  b.box(3.6, S, 5.9, 0.3, 0.22, 1.0, toon('#7a4fb0'));
  b.build(scene);
  addLamp(4.6, 3.4, 0);
  addLamp(8.4, 8.4, -Math.PI * 0.75);
}

function apartments(scene: THREE.Scene, ctx: LandmarkCtx) {
  const b = new Batch();
  const aMat = facadeMat({ cols: 5, rows: 12, wall: '#17414a', lit: [PAL.warm, PAL.warm, PAL.pink], litRatio: 0.6, seed: 51, bands: '#22606a' }, 0.15, 1.7);
  scene.add(walls(22.8, S, 1.0, 3.2, 7.0, 3.2, aMat, toon('#123238')));
  // Balconies with railings on the street side
  for (let y = S + 1.2; y < S + 7; y += 1.17) {
    b.box(23.0, y, 4.2, 2.8, 0.06, 0.45, toon('#2f6f78'));
    b.box(23.0, y + 0.06, 4.6, 2.8, 0.32, 0.04, toon('#8b86b8'));
  }
  b.box(23.3, S + 7.0, 1.4, 0.8, 0.6, 0.8, toon('#2f6f78'));
  cylAt(b, 25.3, S + 7.0, 2.4, 0.38, 0.8, toon('#6b4a8f'), 14);

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
}

/* ---------- Everything ---------- */

export function buildLandmarks(scene: THREE.Scene, ctx: LandmarkCtx) {
  const crowd: Idle[] = [];
  park(scene, crowd);
  apartments(scene, ctx);
  const spots = [
    emporium(scene, ctx, crowd),
    shop(scene, ctx, crowd),
    workshop(scene, ctx),
    vault(scene, ctx, crowd),
    construction(scene, ctx),
    signal(scene, ctx),
    postOffice(scene, ctx),
  ];
  return { spots, crowd };
}
