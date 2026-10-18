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
  plane,
  rand,
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

function emporium(scene: THREE.Scene, ctx: LandmarkCtx, crowd: Idle[]) {
  const sp = spot(scene, 'emporium', V(14.6, 5, 14.6), 8.5, V(14.6, 15.0, 14.6));
  const g = sp.group;
  const b = new Batch();

  // Podium: shop floor glazing behind a deep cornice
  const pod = facadeMat({ cols: 5, rows: 1, wall: '#3d1d63', lit: [PAL.warm], litRatio: 1, seed: 21 }, 0.4, 1.9);
  g.add(walls(11.8, S, 11.8, 5.4, 2.0, 5.4, pod, toon('#2a1650')));
  b.box(11.7, S + 2.0, 11.7, 5.6, 0.5, 5.6, toon('#5a2a8a'));
  b.box(11.65, S, 11.65, 5.7, 0.12, 5.7, toon('#2a1650'));
  // Entrance canopy and posts
  b.box(13.5, S + 1.25, 17.2, 2.0, 0.1, 0.9, toon('#1d1547'));
  for (const x of [13.6, 15.4]) b.box(x, S, 17.95, 0.08, 1.25, 0.08, toon('#1d1547'));
  g.add(sign(signMat(neonSign('EMPORIUM', PAL.pink, { board: null })), 4.0, 1.0, 14.5, S + 2.25, 17.32, 'z'));
  const side = sign(signMat(neonSign('THE DEGEN', PAL.cyan, { board: null })), 4.0, 1.0, 17.32, S + 2.25, 14.5, 'x');
  g.add(side);

  // Tower with floor bands and neon corners
  const tz = S + 2.5;
  const th = 7.5;
  const tower = facadeMat({ cols: 6, rows: 14, wall: '#2c1f68', lit: [PAL.cyan, PAL.cyan, PAL.pink, PAL.warm], litRatio: 0.62, seed: 22, bands: '#3b2a80' }, 0.2, 1.9);
  g.add(walls(12.4, tz, 12.4, 4.0, th, 4.0, tower, toon('#1d1547')));
  for (let y = tz + 1.5; y < tz + th; y += 1.5) b.box(12.3, y, 12.3, 4.2, 0.07, 4.2, toon('#4a3a9a'));
  b.box(16.33, tz, 16.33, 0.12, th, 0.12, neon(PAL.magenta, 1, 3.2, 0.05));
  b.box(12.33, tz, 16.33, 0.12, th, 0.12, neon(PAL.cyan, 1, 3.2));
  b.box(16.33, tz, 12.33, 0.12, th, 0.12, neon(PAL.cyan, 1, 3.2));

  // Crown, light ring and spire
  const cz = tz + th;
  b.box(12.9, cz, 12.9, 3.0, 0.9, 3.0, toon('#1d1547'));
  // Light ring round the crown (a frame, so the roof stays dark)
  const ringMat = neon(PAL.cyan, 0.8, 2.6);
  b.box(12.85, cz + 0.85, 12.85, 3.1, 0.07, 0.07, ringMat);
  b.box(12.85, cz + 0.85, 15.88, 3.1, 0.07, 0.07, ringMat);
  b.box(12.85, cz + 0.85, 12.85, 0.07, 0.07, 3.1, ringMat);
  b.box(15.88, cz + 0.85, 12.85, 0.07, 0.07, 3.1, ringMat);
  cylAt(b, 13.3, cz + 0.9, 13.3, 0.07, 3.6, toon('#1b1830'), 6, 0.03);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), neon(PAL.cyan, 1.5, 4));
  beacon.position.set(13.3, cz + 4.55, 13.3);
  g.add(fx(beacon));
  ctx.tick(({ t }) => (beacon.visible = Math.sin(t * 3.4) > -0.2));

  // The logo, mounted on the roof facing the street corner
  const lw = 4.2;
  const lh = lw * (494 / 729);
  const ly = cz + 0.95 + 0.35 + lh / 2;
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(lw, lh),
    lit(new THREE.MeshBasicMaterial({ map: ctx.logo, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide }), 1, 1.35)
  );
  logo.position.set(14.75, ly, 14.75);
  logo.rotation.y = Math.PI / 4;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(lw * 1.7, lh * 1.7), lit(glowMat(PAL.magenta, 1), 0.15, 0.55));
  halo.position.set(14.6, ly, 14.6);
  halo.rotation.y = Math.PI / 4;
  g.add(fx(logo), fx(halo));
  for (const o of [-1.3, 1.3]) {
    const x = 14.6 + o * Math.SQRT1_2;
    const z = 14.6 - o * Math.SQRT1_2;
    beam(b, V(x, cz + 0.9, z), V(x, ly - lh * 0.3, z), 0.08, toon('#1b1830'));
  }
  b.build(g);

  // Plaza: fountain, planters, benches
  const pb = new Batch();
  cylAt(pb, 18.6, S, 18.6, 0.85, 0.32, toon('#6b6790'), 24);
  cylAt(pb, 18.6, S, 18.6, 0.12, 0.9, toon('#8f8ab0'), 10);
  for (const [x, z] of [
    [19.2, 12.0],
    [19.3, 14.4],
    [12.0, 19.2],
    [14.4, 19.3],
  ]) {
    cylAt(pb, x, S, z, 0.45, 0.35, toon('#4a4388'), 14);
    addTree(x, z, 0.85, false, S + 0.35);
  }
  pb.box(16.0, S, 19.05, 1.0, 0.22, 0.32, toon('#7a4fb0'));
  pb.box(19.05, S, 16.0, 0.32, 0.22, 1.0, toon('#7a4fb0'));
  pb.build(scene);
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.02, 28), waterMat);
  pool.position.set(18.6, S + 0.3, 18.6);
  scene.add(pool);

  // Fountain jets
  const n = ctx.low ? 60 : 140;
  const jets = particles(n, '#bff6ff', 0.14);
  const seeds = Array.from({ length: n }, () => [rand() * Math.PI * 2, rand(), 0.6 + rand() * 0.5]);
  scene.add(jets);
  const pos = jets.geometry.attributes.position as THREE.BufferAttribute;
  ctx.tick(({ t }) => {
    for (let i = 0; i < n; i++) {
      const [a, ph, sp2] = seeds[i];
      const k = (t * sp2 + ph) % 1;
      const r = k * 0.62;
      pos.setXYZ(i, 18.6 + Math.cos(a) * r, S + 1.0 + k * 1.1 - k * k * 1.6, 18.6 + Math.sin(a) * r);
    }
    pos.needsUpdate = true;
  });

  for (const [x, z, ry] of [
    [17.5, 18.2, -Math.PI / 4 - Math.PI / 2],
    [18.3, 17.4, Math.PI],
    [19.6, 17.8, Math.PI / 2 + 0.3],
    [17.8, 19.7, -0.2],
  ])
    crowd.push({ x, z, ry });
  addLamp(11.6, 11.6, Math.PI / 4);
  addLamp(19.5, 19.5, -Math.PI * 0.75);
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
  for (let k = 0; k < 5; k++) crowd.push({ x: 26.1 + (k - 2) * 0.05, z: 17.7 + k * 0.48, ry: Math.PI });
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
      const glass = plane(7.0, 0.9, lit(new THREE.MeshBasicMaterial({ color: '#5fd6ff' }), 0.7, 1.7));
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
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), lit(glowMat('#ff9a4a', 1), 0.15, 0.6));
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
  const stone = toon('#a39ec4');
  const stoneDark = toon('#7f7aa0');
  const H = 2.6;
  b.box(0.9, S, 11.9, 6.8, 0.3, 4.8, stoneDark);
  b.box(1.0, S, 12.0, 6.6, H, 4.6, stone);
  // Rustication lines
  for (let y = S + 0.6; y < S + H - 0.2; y += 0.45) b.box(0.98, y, 11.98, 6.64, 0.04, 4.64, stoneDark);
  // Steps
  b.box(0.8, S, 16.6, 7.0, 0.12, 1.8, toon('#b9b4d6'));
  b.box(0.9, S + 0.12, 16.6, 6.8, 0.12, 1.5, toon('#c4bfe0'));
  b.box(1.0, S + 0.24, 16.6, 6.6, 0.12, 1.25, toon('#cfcaea'));
  // Columns with bases and capitals
  const colTop = S + H - 0.1;
  for (let k = 0; k < 6; k++) {
    const x = 1.45 + k * 1.14;
    b.box(x - 0.24, S + 0.36, 17.21, 0.48, 0.12, 0.48, stone);
    cylAt(b, x, S + 0.48, 17.45, 0.17, colTop - S - 0.6, toon('#e2def5'), 14, 0.15);
    b.box(x - 0.26, colTop - 0.12, 17.19, 0.52, 0.14, 0.52, stone);
  }
  // Entablature with the name, then the pediment
  b.box(0.85, colTop, 11.85, 6.9, 0.5, 6.05, stoneDark);
  const name = canvasTex(1024, 96, (c) => {
    c.fillStyle = '#7f7aa0';
    c.fillRect(0, 0, 1024, 96);
    c.font = `900 70px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '18px';
    c.fillStyle = '#2b2558';
    c.fillText('THE VAULT', 512, 52);
  });
  const nm = plane(5.2, 0.48, new THREE.MeshToonMaterial({ map: name }));
  nm.position.set(4.3, colTop + 0.25, 17.91);
  g.add(nm);
  const ped = new THREE.Shape([new THREE.Vector2(-3.5, 0), new THREE.Vector2(3.5, 0), new THREE.Vector2(0, 1.15)]);
  const pedGeo = new THREE.ExtrudeGeometry(ped, { depth: 6.05, bevelEnabled: false });
  pedGeo.translate(4.3, colTop + 0.5, 11.85);
  b.add(pedGeo, toon('#b9b4d6'));

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
  const beamMat = lit(glowMat('#d9ccff', 1, beamTex), 0, 0.5);
  const bases = new Batch();
  for (const [x, z, ph] of [
    [0.6, 19.4, 0],
    [8.2, 19.4, 2.4],
  ] as const) {
    cylAt(bases, x, S, z, 0.22, 0.3, toon('#3a3466'), 12);
    const pivot = new THREE.Group();
    pivot.position.set(x, S + 0.3, z);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.1, 22, 16, 1, true), beamMat);
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
  const fac = facadeMat({ cols: 5, rows: 3, wall: '#22365e', lit: [PAL.cyan, PAL.warm], litRatio: 0.6, seed: 31 }, 0.15, 1.7);
  g.add(walls(11.8, S, 4.6, 3.8, 2.0, 3.4, fac, toon('#1c2a4a')));
  b.box(11.7, S + 2.0, 4.5, 4.0, 0.14, 3.6, toon('#2c4370'));
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
  b.box(14.6, S + 2.14, 4.9, 0.7, 0.4, 0.6, toon('#4a5a80'));

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
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 48), glowMat(PAL.cyan, 0.8, null));
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
      (r.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.85;
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
  const flood = lit(glowMat('#fff2c0', 1), 0, 0.5);
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
  const aMat = facadeMat({ cols: 5, rows: 12, wall: '#2a2350', lit: [PAL.warm, PAL.warm, PAL.pink], litRatio: 0.6, seed: 51, bands: '#3a3070' }, 0.15, 1.7);
  scene.add(walls(22.8, S, 1.0, 3.2, 7.0, 3.2, aMat, toon('#1c1838')));
  // Balconies with railings on the street side
  for (let y = S + 1.2; y < S + 7; y += 1.17) {
    b.box(23.0, y, 4.2, 2.8, 0.06, 0.45, toon('#4a4170'));
    b.box(23.0, y + 0.06, 4.6, 2.8, 0.32, 0.04, toon('#8b86b8'));
  }
  b.box(23.3, S + 7.0, 1.4, 0.8, 0.6, 0.8, toon('#4a4170'));
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
