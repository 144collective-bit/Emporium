/*
 * Walk mode: play as Degen. Third-person camera, keyboard / joystick
 * movement, a solid world (landmarks, your buildings, the fountain, the
 * river), kerbs, a jump, and door prompts that open a building's panel.
 */
import * as THREE from 'three';
import type { SpotId } from '../../lib/city';
import { lit, toon } from './kit';
import { DISTRICTS, BLOCKS, BS, RIVER, ROADS, SLAB } from './world';

type Box = [number, number, number, number];

/** Footprints of everything you can't walk through (x0, z0, x1, z1), matching landmarks.ts. */
const SOLIDS: Box[] = [
  [11.65, 11.65, 17.35, 17.35], // Emporium podium
  [13.5, 17.2, 15.5, 18.1], // its entrance canopy posts
  [0.8, 11.9, 7.8, 17.05], // vault body and rear steps
  [1.2, 17.1, 7.4, 17.75], // vault columns
  [7.6, 13.3, 8.0, 15.3], // vault door
  [22.7, 12.3, 29.5, 16.85], // Drop 001 shop
  [24.25, 18.15, 24.95, 18.45], // its sidewalk sign
  [11.8, 22.8, 18.8, 27.6], // workshop
  [12.3, 28.5, 18.1, 29.4], // tool crates
  [18.3, 28.1, 19.4, 30.1], // drums and forklift
  [11.7, 4.5, 15.7, 8.05], // signal studio
  [16.0, 2.2, 18.4, 4.6], // signal tower
  [1.1, 23.1, 6.1, 27.1], // post office
  [6.4, 27.3, 7.0, 27.85], // mailbox
  [5.05, 27.85, 7.75, 30.55], // pond
  [22.7, 22.7, 27.5, 27.45], // building site frame and scaffold
  [28.8, 23.3, 29.5, 24.0], // crane mast
  [22.3, 30.6, 30.8, 30.85], // site fence (front)
  [30.6, 22.3, 30.85, 30.85], // site fence (side)
  [22.6, 29.3, 23.5, 30.2], // site toilet
  [26.4, 28.3, 28.8, 30.1], // dirt pile
  [22.7, 0.9, 26.1, 4.3], // apartments A
  [26.9, 1.5, 30.3, 5.3], // apartments B
  [1.7, 1.7, 3.5, 3.5], // water tower legs
  [17.7, 17.7, 19.5, 19.5], // fountain
  [18.75, 11.55, 19.65, 12.45], // planters
  [18.85, 13.95, 19.75, 14.85],
  [11.55, 18.75, 12.45, 19.65],
  [13.95, 18.85, 14.85, 19.75],
];

/** Where you can step in, and what opens there. */
const DOORS: { id: SpotId; x: number; z: number }[] = [
  { id: 'emporium', x: 15.4, z: 18.45 },
  { id: 'shop', x: 26.1, z: 17.5 },
  { id: 'workshop', x: 15.3, z: 28.05 },
  { id: 'vault', x: 4.3, z: 18.6 },
  { id: 'signal', x: 13.7, z: 8.6 },
  { id: 'telegram', x: 3.6, z: 27.6 },
  { id: 'plan', x: 26.4, z: 31.3 },
];

const RADIUS = 0.22;
const WALK = 2.3;
const RUN = 4.8;
const BOUNDS: Box = [-30, -30, 62, 62];
const slabs: Box[] = [...BLOCKS.flatMap((x) => BLOCKS.map((z) => [x, z, x + BS, z + BS] as Box)), ...DISTRICTS.map((d) => [d.ox, d.oz, d.ox + BS, d.oz + BS] as Box)];
const inBox = (b: Box, x: number, z: number, pad = 0) => x > b[0] - pad && x < b[2] + pad && z > b[1] - pad && z < b[3] + pad;

/* ---------- The character ---------- */

function makeDegen() {
  const g = new THREE.Group();
  const black = toon('#14121f');
  const skin = toon('#e8c39e');
  const part = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const limb = (x: number, y: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    g.add(pivot);
    return pivot;
  };
  // Legs and shoes
  const legs = [-0.07, 0.07].map((x) => {
    const p = limb(x, 0.48);
    part(0.11, 0.44, 0.13, black, 0, -0.22, 0, p);
    part(0.12, 0.06, 0.2, toon('#2a2350'), 0, -0.45, 0.03, p);
    return p;
  });
  // Suit, shirt and tie
  part(0.34, 0.44, 0.21, black, 0, 0.7, 0);
  part(0.11, 0.2, 0.01, toon('#f3f2f7'), 0, 0.82, 0.106);
  part(0.045, 0.18, 0.012, lit(new THREE.MeshToonMaterial({ color: '#1fbf6b', emissive: '#1fbf6b' }), 0.05, 0.5), 0, 0.8, 0.113);
  // Arms; the right hand holds the gummy bears
  const arms = [-0.21, 0.21].map((x, i) => {
    const p = limb(x, 0.9);
    part(0.09, 0.4, 0.11, black, 0, -0.2, 0, p);
    part(0.08, 0.07, 0.08, skin, 0, -0.43, 0, p);
    if (i === 1) part(0.13, 0.17, 0.05, toon('#e23b3b'), 0, -0.5, 0.06, p);
    return p;
  });
  // Head: balaclava, eye slot, shades, red cap
  const head = new THREE.Group();
  head.position.y = 1.05;
  g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 10), black);
  skull.castShadow = true;
  head.add(skull);
  part(0.2, 0.05, 0.02, skin, 0, 0.025, 0.13, head);
  part(0.24, 0.055, 0.03, lit(new THREE.MeshToonMaterial({ color: '#1fbf6b', emissive: '#1fbf6b' }), 0.15, 0.8), 0, 0.03, 0.145, head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.075, 16), toon('#e23b3b'));
  cap.position.y = 0.1;
  cap.castShadow = true;
  head.add(cap);
  part(0.2, 0.02, 0.15, toon('#e23b3b'), 0, 0.07, 0.15, head);
  part(0.11, 0.045, 0.012, toon('#f3f2f7'), 0, 0.105, 0.153, head);
  g.scale.setScalar(0.85);

  // A soft ring under the feet so he's easy to find
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.36, 32),
    new THREE.MeshBasicMaterial({ color: '#00eaff', transparent: true, opacity: 0.55, depthWrite: false, fog: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  ring.layers.set(1);
  return { g, legs, arms, head, ring };
}

/* ---------- Walk mode ---------- */

export interface WalkDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  root: HTMLElement;
  /** Footprints of buildings visitors have placed */
  plotSolids(): Box[];
  /** Open a landmark's panel in place */
  openSpot(id: SpotId): void;
  /** Called on any input, so the frame cap knows we're busy */
  touched(): void;
}

export function createWalk(d: WalkDeps) {
  const { camera, canvas, root } = d;
  const hero = makeDegen();
  hero.g.visible = false;
  hero.ring.visible = false;
  d.scene.add(hero.g, hero.ring);

  const prompt = root.querySelector<HTMLButtonElement>('[data-walk-prompt]')!;
  const stick = root.querySelector<HTMLElement>('[data-walk-stick]')!;
  const knob = stick.querySelector<HTMLElement>('span')!;

  let active = false;
  const SPAWN = new THREE.Vector3(16.4, SLAB, 18.45);
  const pos = SPAWN.clone();
  let face = Math.PI;
  let vy = 0;
  let phase = 0;
  let moving = 0;
  let yaw = 0.67;
  let pitch = 0.62;
  let dist = 5.2;
  const keys = new Set<string>();
  const joy = { x: 0, y: 0, id: -1 };
  let near: { id: SpotId; label: string } | null = null;
  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();

  const groundAt = (x: number, z: number) => (slabs.some((b) => inBox(b, x, z)) ? SLAB : 0.035);
  const onBridge = (x: number) => ROADS.some((r) => Math.abs(x - r) < 1.05);
  function blocked(x: number, z: number) {
    if (x < BOUNDS[0] || x > BOUNDS[2] || z < BOUNDS[1] || z > BOUNDS[3]) return true;
    if (z > RIVER[0] - 0.3 && z < RIVER[1] + 0.3 && !onBridge(x)) return true;
    if (SOLIDS.some((b) => inBox(b, x, z, RADIUS))) return true;
    return d.plotSolids().some((b) => inBox(b, x, z, RADIUS));
  }

  /* Input */
  const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space'];
  function onKey(e: KeyboardEvent, down: boolean) {
    if (!active || (e.target as HTMLElement).matches?.('input, select, textarea')) return false;
    if (down && e.code === 'KeyE' && near) {
      d.openSpot(near.id);
      return true;
    }
    if (!MOVE_KEYS.includes(e.code)) return false;
    if (down) {
      keys.add(e.code);
      if (e.code === 'Space' && pos.y <= groundAt(pos.x, pos.z) + 0.01) vy = 3.2;
    } else keys.delete(e.code);
    d.touched();
    e.preventDefault();
    return true;
  }
  window.addEventListener('blur', () => keys.clear());

  // Drag on the city to look around, scroll to zoom
  let drag: { id: number; x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (!active || drag) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointermove', (e) => {
    if (!active || !drag || e.pointerId !== drag.id) return;
    yaw -= (e.clientX - drag.x) * 0.006;
    pitch = THREE.MathUtils.clamp(pitch + (e.clientY - drag.y) * 0.004, 0.12, 1.25);
    drag.x = e.clientX;
    drag.y = e.clientY;
    d.touched();
  });
  window.addEventListener('pointerup', (e) => {
    if (drag && e.pointerId === drag.id) drag = null;
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!active) return;
      dist = THREE.MathUtils.clamp(dist * (1 + Math.sign(e.deltaY) * 0.1), 3.2, 16);
      e.preventDefault();
    },
    { passive: false }
  );

  // On-screen joystick for touch
  const setJoy = (e: PointerEvent) => {
    const r = stick.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(x, y);
    if (m > 1) ((x /= m), (y /= m));
    joy.x = x;
    joy.y = y;
    knob.style.transform = `translate(${x * 32}px, ${y * 32}px)`;
    d.touched();
  };
  stick.addEventListener('pointerdown', (e) => {
    joy.id = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    setJoy(e);
    e.stopPropagation();
  });
  stick.addEventListener('pointermove', (e) => e.pointerId === joy.id && setJoy(e));
  const endJoy = (e: PointerEvent) => {
    if (e.pointerId !== joy.id) return;
    joy.id = -1;
    joy.x = joy.y = 0;
    knob.style.transform = '';
  };
  stick.addEventListener('pointerup', endJoy);
  stick.addEventListener('pointercancel', endJoy);
  root.querySelector('[data-walk-jump]')!.addEventListener('click', () => {
    if (pos.y <= groundAt(pos.x, pos.z) + 0.01) vy = 3.2;
    d.touched();
  });
  prompt.addEventListener('click', () => near && d.openSpot(near.id));

  /* Per frame */
  function update(dt: number, t: number) {
    if (!active) return;
    // Input in camera space
    let ix = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    let iz = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    let run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    if (joy.id >= 0) {
      ix = joy.x;
      iz = -joy.y;
      run = Math.hypot(joy.x, joy.y) > 0.85;
    }
    const mag = Math.min(1, Math.hypot(ix, iz));
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    let mx = (fx * iz + -fz * ix) / (Math.hypot(ix, iz) || 1);
    let mz = (fz * iz + fx * ix) / (Math.hypot(ix, iz) || 1);
    mx *= mag;
    mz *= mag;
    const speed = (run ? RUN : WALK) * dt;
    moving += ((mag > 0.05 ? (run ? 1.6 : 1) : 0) - moving) * Math.min(1, dt * 10);
    if (mag > 0.05) {
      const nx = pos.x + mx * speed;
      const nz = pos.z + mz * speed;
      // Never trapped: if he's ended up overlapping something, any step is allowed
      const stuck = blocked(pos.x, pos.z);
      if (stuck || !blocked(nx, pos.z)) pos.x = nx;
      if (stuck || !blocked(pos.x, nz)) pos.z = nz;
      const target = Math.atan2(mx, mz);
      face += Math.atan2(Math.sin(target - face), Math.cos(target - face)) * Math.min(1, dt * 12);
    }
    // Kerbs and jumping
    const ground = groundAt(pos.x, pos.z);
    vy -= 9.5 * dt;
    pos.y += vy * dt;
    if (pos.y <= ground) {
      pos.y = pos.y < ground - 0.05 ? pos.y + (ground - pos.y) * Math.min(1, dt * 18) : ground;
      vy = 0;
    }

    // Animate: stride with speed, a little bob, idle breathing
    phase += dt * (4 + moving * 5) * (moving > 0.05 ? 1 : 0);
    const swing = Math.sin(phase) * 0.7 * Math.min(1, moving);
    hero.legs[0].rotation.x = swing;
    hero.legs[1].rotation.x = -swing;
    hero.arms[0].rotation.x = -swing * 0.8;
    hero.arms[1].rotation.x = swing * 0.8 - (moving < 0.05 ? 0.25 : 0);
    hero.head.rotation.y = moving < 0.05 ? Math.sin(t * 0.6) * 0.3 : 0;
    const bob = Math.abs(Math.cos(phase)) * 0.035 * Math.min(1, moving) + Math.sin(t * 2) * 0.004;
    hero.g.position.set(pos.x, pos.y + bob, pos.z);
    hero.g.rotation.y = face;
    hero.ring.position.set(pos.x, groundAt(pos.x, pos.z) + 0.02, pos.z);

    // Third-person camera, eased
    look.set(pos.x, pos.y + 0.85, pos.z);
    const want = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(look);
    camPos.lerp(want, 1 - Math.exp(-dt * 9));
    camera.position.copy(camPos);
    camera.lookAt(look);

    // Door prompts
    let best: { id: SpotId; label: string } | null = null;
    let bestD = 1.7;
    for (const door of DOORS) {
      const dd = Math.hypot(door.x - pos.x, door.z - pos.z);
      if (dd < bestD) {
        bestD = dd;
        best = { id: door.id, label: root.querySelector(`[data-pin="${door.id}"] .city-pin-title`)?.textContent ?? door.id };
      }
    }
    if (best?.id !== near?.id) {
      near = best;
      prompt.hidden = !near;
      if (near) prompt.querySelector('[data-walk-label]')!.textContent = `Enter ${near.label}`;
    }
  }

  return {
    get active() {
      return active;
    },
    get position() {
      return pos;
    },
    onKey,
    update,
    enter() {
      active = true;
      pos.copy(SPAWN);
      face = 0;
      vy = 0;
      yaw = 0.67;
      pitch = 0.62;
      dist = 5.2;
      look.set(pos.x, pos.y + 0.75, pos.z);
      camPos.copy(camera.position);
      hero.g.visible = hero.ring.visible = true;
      root.dataset.mode = 'walk';
    },
    exit() {
      active = false;
      keys.clear();
      joy.id = -1;
      joy.x = joy.y = 0;
      knob.style.transform = '';
      near = null;
      prompt.hidden = true;
      hero.g.visible = hero.ring.visible = false;
      root.dataset.mode = 'explore';
    },
  };
}
