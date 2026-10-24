/*
 * The Armoury (buildLandmarks() in landmarks.ts puts it on its lot): a modern military compound and the
 * players' gun store, mirrored in solids.ts.
 */
import * as THREE from 'three';
import {
  Batch,
  FONT_DISPLAY,
  FONT_MONO,
  PAL,
  canvasTex,
  fx,
  lit,
  moving,
  neon,
  place,
  plane,
  rng,
  toon,
} from './kit';
import { rifleGeometry } from './guns';
import { SOLDIER, createCrowd, type Outfit } from './character';
import { CLIP_SECONDS, MARCH_STRIDE } from './crowdclips';
import { walker } from './life';
import { SLAB as S } from './world';
import { design } from './layout';
import type { LandmarkCtx } from './landmarks';
import { V, beam, cylAt, paintMat, sign, signMat, spot, unitBox, walls, unitPlane } from './landmark-kit';

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

export function armoury(scene: THREE.Scene, ctx: LandmarkCtx) {
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
    const pivot = moving(new THREE.Group());
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
