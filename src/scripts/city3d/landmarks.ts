/*
 * The landmarks downtown. Each is a place in the city's game (a "spot": its
 * own group so it can lift and glow when hovered, a ring on the ground, a pin
 * above it, and a panel of its own). The Emporium is emporium.ts, the
 * Armoury armoury.ts, their shared helpers landmark-kit.ts; the rest are here.
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
  lit,
  neon,
  neonSign,
  plane,
  rand,
  roundRect,
  sidesBox,
  toon,
} from './kit';
import { parkedCars } from './cars';
import { SLAB as S, addLamp, addTree, placedMark, shiftPlaced, waterMat, type Tick } from './world';
import { design, seat } from './layout';
import { V, beam, brick, cylAt, hazard, paintMat, particles, sign, signMat, spot, stencil, walls } from './landmark-kit';
import { emporium } from './emporium';
import { armoury } from './armoury';

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
  /** The way it faces, if not south (+z) like the landmarks: the fly-in comes from that side (the riverside's face north) */
  faces?: 'n';
}

export interface Idle {
  x: number;
  z: number;
  /** Facing: 0 is +z, PI / 2 is +x */
  ry: number;
  /** Standing height, or for `sit` the seat height */
  y?: number;
  /** What they're doing: looking around (default), chatting, sitting, queueing, reading their phone */
  act?: 'look' | 'chat' | 'sit' | 'queue' | 'phone';
  /** How big (a grown-up by default; kids at play are smaller) */
  scale?: number;
}

export interface LandmarkCtx {
  degen: HTMLImageElement | null;
  logo: THREE.Texture;
  tick: (f: Tick) => void;
  low: boolean;
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
