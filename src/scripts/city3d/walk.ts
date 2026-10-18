/*
 * Walk mode: play as Degen.
 *
 * - Look: mouse (pointer lock after a click), drag, touch or a gamepad's
 *   right stick. You can look up at the towers and sky as well as down.
 * - Move: WASD / arrows / joystick / left stick, with acceleration, strafing,
 *   run (hold Shift, or Caps Lock to toggle) and a jump with coyote time,
 *   buffering and variable height.
 * - Camera: first person when you start walking (with Degen's hands on the
 *   rifle once he's geared up). V, or scrolling out, swaps to over the
 *   shoulder, pulled in when a building or the ground is in the way. Wider
 *   field of view when running; hold the right mouse button to aim.
 * - A solid world, kerbs, door prompts that open a building's panel.
 */
import * as THREE from 'three';
import type { SpotId } from '../../lib/city';
import { PLAYER, airPose, createDegen, walkPose } from './character';
import { DUMMIES, createCombat, type Sfx } from './combat';
import { DISTRICTS, BLOCKS, BS, RIVER, ROADS, SLAB, type Tick } from './world';

/** x0, z0, x1, z1, height */
type Box = [number, number, number, number, number];

/** Training dummies: Degen walks round them */
const DUMMY_SOLIDS = DUMMIES.map(([x, z]): Box => [x - 0.3, z - 0.3, x + 0.3, z + 0.3, 1.3]);

/** Everything you can't walk through, matching landmarks.ts. Height is for the camera. */
const SOLIDS: Box[] = [
  // Emporium arcade: the podium with its street corner cut off (in steps); the tower stands on it
  [11.8, 11.8, 18.0, 16.0, 2.6],
  [11.8, 16.0, 16.0, 18.0, 2.6],
  ...[0, 1, 2, 3].map((k): Box => [16.0 + k * 0.5, 16.0, 16.5 + k * 0.5, 34 - (16.25 + k * 0.5), 2.6]),
  [15.75, 18.35, 16.4, 19.05, 1.4], // claw machines either side of the doors
  [18.35, 15.75, 19.05, 16.4, 1.4],
  [18.4, 14.15, 19.35, 15.25, 1.6], // prize booth
  [0.8, 11.9, 7.8, 17.05, 5.6], // vault body and rear steps
  [1.2, 17.1, 7.4, 17.75, 4.4], // vault columns
  [7.6, 13.3, 8.0, 15.3, 2.4], // vault door
  [22.7, 12.3, 29.5, 16.85, 5.6], // Drop 001 shop
  [24.25, 18.15, 24.95, 18.45, 1], // its sidewalk sign
  [11.8, 22.8, 18.8, 27.6, 3.7], // workshop
  [12.3, 28.5, 18.1, 29.4, 1], // tool crates
  [18.3, 28.1, 19.4, 30.1, 1.2], // drums and forklift
  [11.7, 4.5, 15.7, 8.05, 2.6], // signal studio
  [16.0, 2.2, 18.4, 4.6, 13.5], // signal tower
  [1.1, 23.1, 6.1, 27.1, 3.3], // post office
  [6.4, 27.3, 7.0, 27.85, 0.9], // mailbox
  [5.05, 27.85, 7.75, 30.55, 0], // pond
  // The Armoury: curtain walls (open at the gate), towers, keep, vehicles, supplies
  [22.55, 22.55, 30.45, 22.9, 1.4],
  [22.55, 22.55, 22.9, 30.45, 1.4],
  [30.1, 22.55, 30.45, 30.45, 1.4],
  [22.55, 30.1, 24.9, 30.45, 1.4],
  [28.3, 30.1, 30.45, 30.45, 1.4],
  [22.45, 22.45, 23.45, 23.45, 2.6], // corner towers
  [29.55, 22.45, 30.55, 23.45, 2.6],
  [22.45, 29.55, 23.45, 30.55, 2.6],
  [29.55, 29.55, 30.55, 30.55, 2.6],
  [24.9, 29.75, 25.9, 30.55, 2.8], // gatehouse towers
  [27.3, 29.75, 28.3, 30.55, 2.8],
  [23.3, 23.3, 27.9, 26.9, 3.3], // keep
  [28.62, 24.55, 29.68, 26.25, 1.0], // tank
  [28.95, 28.05, 29.65, 29.15, 0.9], // jeep
  [28.1, 22.95, 30.05, 24.35, 1.4], // supply crates under the netting
  [23.05, 29.35, 23.8, 29.85, 0.6], // drums
  [23.3, 27.95, 23.55, 28.95, 0.7], // helmet rack
  [22.7, 0.9, 26.1, 4.3, 7.6], // apartments A
  [26.9, 1.5, 30.3, 5.3, 8.4], // apartments B and billboard
  [1.7, 1.7, 3.5, 3.5, 6.6], // water tower
  [18.55, 11.95, 19.45, 12.85, 1.4], // planters
  [11.95, 18.55, 12.85, 19.45, 1.4],
  [28.3, 29.8, 29.2, 30.1, 1.2], // the Armoury's weapon rack
  ...DUMMY_SOLIDS,
];
/** What bullets stop on: everything solid except the dummies' footprints (they test their own shape) */
const SHOT_SOLIDS = SOLIDS.filter((b) => !DUMMY_SOLIDS.includes(b));

/** Things to do with E besides doors */
const RACK = { x: 28.75, z: 29.42 };
/** Only the camera bumps into these (tall parts above a walkable footprint) */
const CAMERA_ONLY: Box[] = [
  [11.9, 11.9, 17.5, 17.5, 12.6], // the Emporium's glass tower
  [26.5, 25.5, 27.9, 26.9, 5.9], // the Armoury's flag tower
];

/** Where you can step in, and what opens there. */
const DOORS: { id: SpotId; x: number; z: number }[] = [
  { id: 'emporium', x: 17.5, z: 17.5 },
  { id: 'shop', x: 26.1, z: 17.5 },
  { id: 'workshop', x: 15.3, z: 28.05 },
  { id: 'vault', x: 4.3, z: 18.6 },
  { id: 'signal', x: 13.7, z: 8.6 },
  { id: 'telegram', x: 3.6, z: 27.6 },
  { id: 'plan', x: 26.6, z: 30.95 },
];

/** Facing the Emporium's doors, the tower over his shoulder */
const SPAWN_YAW = 0.45;
const RADIUS = 0.22;
const WALK = 2.4;
const RUN = 5.4;
const JUMP = 3.9;
const GRAVITY = 11.5;
const SCALE = 0.85;
const BOUNDS = [-30, -30, 62, 62];
const slabs: Box[] = [...BLOCKS.flatMap((x) => BLOCKS.map((z) => [x, z, x + BS, z + BS, 0] as Box)), ...DISTRICTS.map((d) => [d.ox, d.oz, d.ox + BS, d.oz + BS, 0] as Box)];
const inBox = (b: Box, x: number, z: number, pad = 0) => x > b[0] - pad && x < b[2] + pad && z > b[1] - pad && z < b[3] + pad;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);

const SETTINGS_KEY = 'degen-city-walk-v1';
interface Settings {
  sens: number;
  invert: boolean;
}
function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return { sens: typeof s.sens === 'number' ? s.sens : 1, invert: !!s.invert };
  } catch {
    return { sens: 1, invert: false };
  }
}

/* ---------- The character ---------- */

/* ---------- Walk mode ---------- */

export interface WalkDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  root: HTMLElement;
  /** Footprints and heights of buildings visitors have placed */
  plotSolids(): Box[];
  /** Open a landmark's panel in place */
  openSpot(id: SpotId): void;
  /** Called on any input, so the frame cap knows we're busy */
  touched(): void;
  tick(f: Tick): void;
  sfx(kind: Sfx): void;
}

export function createWalk(d: WalkDeps) {
  const { camera, canvas, root } = d;
  const hero = {
    ...createDegen(PLAYER),
    ring: new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.36, 32),
      new THREE.MeshBasicMaterial({ color: '#00eaff', transparent: true, opacity: 0.55, depthWrite: false, fog: false })
    ),
  };
  hero.ring.rotation.x = -Math.PI / 2;
  hero.ring.layers.set(1);
  hero.g.scale.setScalar(SCALE);
  hero.g.visible = hero.ring.visible = false;
  d.scene.add(hero.g, hero.ring);
  let headYaw = 0;
  let headPitch = 0;

  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  // Opening a door panel frees the mouse so its links can be clicked
  const openSpot = (id: SpotId) => {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    d.openSpot(id);
  };
  const prompt = $<HTMLButtonElement>('[data-walk-prompt]');
  const stick = $('[data-walk-stick]');
  const knob = stick.querySelector<HTMLElement>('span')!;
  const runBtn = $<HTMLButtonElement>('[data-walk-run]');
  const sensInput = $<HTMLInputElement>('[data-walk-sens]');
  const invertInput = $<HTMLInputElement>('[data-walk-invert]');
  const fpBtn = $<HTMLButtonElement>('[data-walk-fp]');

  const settings = loadSettings();
  const saveSettings = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* fine: settings just won't stick */
    }
  };
  sensInput.value = String(settings.sens);
  invertInput.checked = settings.invert;

  const SPAWN = new THREE.Vector3(17.3, SLAB, 18.85);
  let active = false;
  const pos = SPAWN.clone();
  const vel = new THREE.Vector2();
  let vy = 0;
  let grounded = true;
  let coyote = 0;
  let jumpBuffer = 0;
  let jumpHeld = false;
  let land = 0;
  let face = 0;
  let phase = 0;
  let runAmt = 0;
  let air = 0;

  let yaw = SPAWN_YAW;
  let pitch = 0.5;
  let zoom = 5.2;
  let camDist = 5.2;
  let firstPerson = false;
  let aim = false;
  let runLock = false;
  let baseFov = camera.fov;
  let fov = 52;
  const pivot = new THREE.Vector3();
  const keys = new Set<string>();
  const joy = { x: 0, y: 0, id: -1 };
  const pad = { x: 0, y: 0, run: false, prev: [] as boolean[] };
  let near: { id: SpotId | 'gear'; label: string } | null = null;
  const act = () => {
    if (!near) return;
    if (near.id === 'gear') combat.gearUp();
    else openSpot(near.id);
  };

  const groundAt = (x: number, z: number) => (slabs.some((b) => inBox(b, x, z)) ? SLAB : 0.035);
  const onBridge = (x: number) => ROADS.some((r) => Math.abs(x - r) < 1.05);
  function blocked(x: number, z: number) {
    if (x < BOUNDS[0] || x > BOUNDS[2] || z < BOUNDS[1] || z > BOUNDS[3]) return true;
    if (z > RIVER[0] - 0.3 && z < RIVER[1] + 0.3 && !onBridge(x)) return true;
    if (SOLIDS.some((b) => inBox(b, x, z, RADIUS))) return true;
    return d.plotSolids().some((b) => inBox(b, x, z, RADIUS));
  }

  /** How far the camera can sit from the pivot along `dir` before something's in the way. */
  function cameraRoom(from: THREE.Vector3, dir: THREE.Vector3, want: number) {
    let t = want;
    // Ground (and kerb) below
    if (dir.y < 0) {
      const floor = Math.max(groundAt(from.x, from.z), 0.035) + 0.22;
      t = Math.min(t, (from.y - floor) / -dir.y);
    }
    for (const b of [...SOLIDS, ...CAMERA_ONLY, ...d.plotSolids()]) {
      if (b[4] < 0.5) continue;
      const lo = [b[0] - 0.18, 0, b[1] - 0.18];
      const hi = [b[2] + 0.18, b[4] + 0.15, b[3] + 0.18];
      const o = [from.x, from.y, from.z];
      const v = [dir.x, dir.y, dir.z];
      let t0 = 0;
      let t1 = t;
      let hit = true;
      for (let k = 0; k < 3 && hit; k++) {
        if (Math.abs(v[k]) < 1e-6) {
          if (o[k] < lo[k] || o[k] > hi[k]) hit = false;
          continue;
        }
        let a = (lo[k] - o[k]) / v[k];
        let c = (hi[k] - o[k]) / v[k];
        if (a > c) [a, c] = [c, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, c);
        if (t0 > t1) hit = false;
      }
      if (hit && t0 > 0.01) t = Math.min(t, t0);
    }
    return Math.max(0.35, t - 0.15);
  }

  /** Distance along a ray to the first building or the ground (for shots). */
  function rayWorld(from: THREE.Vector3, dir: THREE.Vector3, max: number) {
    let t = max;
    if (dir.y < 0) t = Math.min(t, (from.y - 0.1) / -dir.y);
    const o = [from.x, from.y, from.z];
    const v = [dir.x, dir.y, dir.z];
    for (const list of [SHOT_SOLIDS, CAMERA_ONLY, d.plotSolids()]) {
      for (const b of list) {
        if (b[4] < 0.3) continue;
        const lo = [b[0], 0, b[1]];
        const hi = [b[2], b[4], b[3]];
        let t0 = 0;
        let t1 = t;
        let hit = true;
        for (let k = 0; k < 3 && hit; k++) {
          if (Math.abs(v[k]) < 1e-6) {
            if (o[k] < lo[k] || o[k] > hi[k]) hit = false;
            continue;
          }
          let a = (lo[k] - o[k]) / v[k];
          let c = (hi[k] - o[k]) / v[k];
          if (a > c) [a, c] = [c, a];
          t0 = Math.max(t0, a);
          t1 = Math.min(t1, c);
          if (t0 > t1) hit = false;
        }
        // Ignore boxes the camera starts inside (the hero's own surroundings)
        if (hit && t0 > 0.6) t = Math.min(t, t0);
      }
    }
    return t;
  }

  const combat = createCombat({ scene: d.scene, camera, root, tick: d.tick, ground: SLAB, rayWorld, sfx: d.sfx });
  hero.torso.add(combat.gun);
  let aimAmt = 0;
  let armAmt = 0;
  let recoil = 0;

  /* ---------- Input ---------- */

  const look = (dx: number, dy: number, k: number) => {
    // Finer control down the sight
    k *= 1 - combat.aimed * 0.4;
    yaw -= dx * k * settings.sens;
    const limit = firstPerson ? 1.35 : 1.3;
    const low = firstPerson ? -1.35 : -0.55;
    pitch = THREE.MathUtils.clamp(pitch + dy * k * settings.sens * (settings.invert ? -1 : 1), low, limit);
    d.touched();
  };
  const tryJump = () => {
    jumpBuffer = 0.14;
    d.touched();
  };
  function setFirstPerson(on: boolean) {
    firstPerson = on;
    if (!on && zoom < 1.5) zoom = 4.5;
    fpBtn.setAttribute('aria-pressed', String(on));
    if (on) pitch = THREE.MathUtils.clamp(pitch, -1.35, 1.35);
    else pitch = Math.max(pitch, -0.55);
  }
  function setRunLock(on: boolean) {
    runLock = on;
    runBtn.setAttribute('aria-pressed', String(on));
  }

  const MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
  function onKey(e: KeyboardEvent, down: boolean) {
    if (!active || (e.target as HTMLElement).matches?.('input, select, textarea')) return false;
    const c = e.code;
    if (down && c === 'KeyE' && near) act();
    else if (down && !e.repeat && c === 'KeyV') setFirstPerson(!firstPerson);
    else if (down && !e.repeat && c === 'CapsLock') setRunLock(!runLock);
    else if (down && !e.repeat && c === 'KeyR') combat.reload();
    else if (down && !e.repeat && c === 'KeyG') combat.toggleHolster();
    else if (c === 'Space') {
      if (down && !e.repeat) tryJump();
      jumpHeld = down;
    } else if (MOVE.includes(c)) {
      if (down) keys.add(c);
      else keys.delete(c);
    } else return false;
    d.touched();
    e.preventDefault();
    return true;
  }
  window.addEventListener('blur', () => {
    keys.clear();
    jumpHeld = false;
    aim = mouseL = mouseR = false;
    combat.trigger(false);
    combat.trigger(false, true);
  });

  // Mouse: click to capture it (pointer lock), then just move to look
  const locked = () => document.pointerLockElement === canvas;
  // Esc frees the mouse first; browsers may release the lock before the key event arrives
  let unlockedAt = -1e9;
  document.addEventListener('pointerlockchange', () => {
    root.classList.toggle('is-looking', locked());
    if (!locked()) {
      unlockedAt = performance.now();
      if (mouseL) combat.trigger(false);
      mouseL = false;
    }
  });
  document.addEventListener('mousemove', (e) => {
    if (active && locked()) look(e.movementX, e.movementY, 0.0024);
  });
  canvas.addEventListener('contextmenu', (e) => active && e.preventDefault());

  // Mouse buttons: mousedown / mouseup fire for every button, even a second one
  // pressed while another is held (pointerdown doesn't, so fire-while-aiming was
  // lost). Right aims; left fires once the mouse is captured, so the click that
  // captures it doesn't fire.
  let mouseL = false;
  let mouseR = false;
  canvas.addEventListener('mousedown', (e) => {
    if (!active) return;
    if (e.button === 2) aim = mouseR = true;
    if (e.button === 0 && locked()) {
      mouseL = true;
      combat.trigger(true);
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2 && mouseR) aim = mouseR = false;
    if (e.button === 0 && mouseL) {
      mouseL = false;
      combat.trigger(false);
    }
  });

  // Drag to look (touch, or a mouse before it's captured)
  let drag: { id: number; x: number; y: number; touch: boolean } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (!active) return;
    if (e.pointerType === 'mouse') {
      if (!locked()) {
        const req = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
        req?.catch?.(() => {});
      }
      if (locked()) return;
    }
    if (!drag) drag = { id: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' };
  });
  window.addEventListener('pointermove', (e) => {
    if (!active || !drag || e.pointerId !== drag.id || locked()) return;
    look(e.clientX - drag.x, e.clientY - drag.y, drag.touch ? 0.0075 : 0.005);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  window.addEventListener('pointerup', (e) => {
    if (drag && e.pointerId === drag.id) drag = null;
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!active) return;
      zoom = THREE.MathUtils.clamp(zoom * (1 + Math.sign(e.deltaY) * 0.12), 0.8, 16);
      if (zoom < 1.2 && !firstPerson) setFirstPerson(true);
      else if (zoom >= 1.2 && firstPerson && e.deltaY > 0) setFirstPerson(false);
      d.touched();
      e.preventDefault();
    },
    { passive: false }
  );

  // Touch joystick
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
  const jumpBtn = $('[data-walk-jump]');
  jumpBtn.addEventListener('pointerdown', () => {
    tryJump();
    jumpHeld = true;
  });
  jumpBtn.addEventListener('pointerup', () => (jumpHeld = false));
  jumpBtn.addEventListener('pointercancel', () => (jumpHeld = false));
  runBtn.addEventListener('click', () => setRunLock(!runLock));
  fpBtn.addEventListener('click', () => setFirstPerson(!firstPerson));
  sensInput.addEventListener('input', () => {
    settings.sens = Number(sensInput.value);
    saveSettings();
  });
  invertInput.addEventListener('change', () => {
    settings.invert = invertInput.checked;
    saveSettings();
  });
  prompt.addEventListener('click', act);
  // Touch: hold Fire, tap Reload
  const fireBtn = $('[data-walk-fire]');
  fireBtn.addEventListener('pointerdown', (e) => {
    fireBtn.setPointerCapture(e.pointerId);
    combat.trigger(true, true);
    d.touched();
  });
  for (const ev of ['pointerup', 'pointercancel'] as const) fireBtn.addEventListener(ev, () => combat.trigger(false, true));
  $('[data-walk-reload]').addEventListener('click', () => combat.reload());
  // Touch: Aim toggles the sight (one thumb can't hold Aim and Fire)
  const aimBtn = $<HTMLButtonElement>('[data-walk-aim]');
  const setAim = (on: boolean) => {
    aim = on;
    aimBtn.setAttribute('aria-pressed', String(on));
  };
  aimBtn.addEventListener('click', () => {
    setAim(!aim);
    d.touched();
  });

  // Gamepad: left stick move, right stick look, A jump, LB / L3 run, Y enter, View first person,
  // RT fire, X reload, D-pad up holster
  function pollPad(dt: number) {
    const gp = Array.from(navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
    if (!gp) {
      pad.x = pad.y = 0;
      pad.run = false;
      return;
    }
    const dz = (v = 0) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
    pad.x = dz(gp.axes[0]);
    pad.y = dz(gp.axes[1]);
    const rx = dz(gp.axes[2]);
    const ry = dz(gp.axes[3]);
    if (rx || ry) look(rx * 2.8 * dt, ry * 2 * dt, 1);
    const b = gp.buttons.map((x) => x.pressed);
    const edge = (i: number) => b[i] && !pad.prev[i];
    if (edge(0)) tryJump();
    jumpHeld = jumpHeld || b[0] || false;
    if (!b[0] && pad.prev[0]) jumpHeld = false;
    pad.run = !!(b[4] || b[10]);
    aim = aim || !!b[6];
    if (!b[6] && pad.prev[6]) aim = false;
    if (edge(3)) act();
    if (edge(8)) setFirstPerson(!firstPerson);
    if (b[7] !== !!pad.prev[7]) combat.trigger(!!b[7]);
    if (edge(2)) combat.reload();
    if (edge(12)) combat.toggleHolster();
    if (pad.x || pad.y || b.some(Boolean)) d.touched();
    pad.prev = b;
  }

  /* ---------- Per frame ---------- */

  const offset = new THREE.Vector3();
  const pivotWant = new THREE.Vector3();
  const view = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

  function update(dt: number, t: number) {
    if (!active) return;
    pollPad(dt);

    // What the player wants, in camera space
    let ix = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    let iz = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    let run = runLock || keys.has('ShiftLeft') || keys.has('ShiftRight') || pad.run;
    if (joy.id >= 0) {
      ix = joy.x;
      iz = -joy.y;
      run ||= Math.hypot(joy.x, joy.y) > 0.9;
    } else if (pad.x || pad.y) {
      ix = pad.x;
      iz = -pad.y;
      run ||= Math.hypot(pad.x, pad.y) > 0.95;
    }
    const mag = Math.min(1, Math.hypot(ix, iz));
    const n = Math.hypot(ix, iz) || 1;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const dirX = ((fx * iz - fz * ix) / n) * mag;
    const dirZ = ((fz * iz + fx * ix) / n) * mag;
    const shooting = combat.armed && (aim || combat.firing);
    const top = run && !shooting ? RUN : shooting ? WALK * 0.7 : WALK;

    // Accelerate towards it (less control in the air)
    const k = damp(grounded ? (mag > 0.05 ? 11 : 14) : 2.5, dt);
    vel.x += (dirX * top - vel.x) * k;
    vel.y += (dirZ * top - vel.y) * k;
    const stuck = blocked(pos.x, pos.z);
    const nx = pos.x + vel.x * dt;
    if (stuck || !blocked(nx, pos.z)) pos.x = nx;
    else vel.x = 0;
    const nz = pos.z + vel.y * dt;
    if (stuck || !blocked(pos.x, nz)) pos.z = nz;
    else vel.y = 0;
    const speed = vel.length();

    // Face where you're going, or where you look when aiming / in first person
    const lookFace = yaw + Math.PI;
    if (aim || firstPerson || shooting) face += wrap(lookFace - face) * damp(16, dt);
    else if (speed > 0.25) face += wrap(Math.atan2(vel.x, vel.y) - face) * damp(12, dt);

    // Jumping: buffered presses, a little coyote time, release early for a short hop
    coyote = grounded ? 0.12 : coyote - dt;
    jumpBuffer -= dt;
    if (jumpBuffer > 0 && coyote > 0) {
      vy = JUMP;
      grounded = false;
      coyote = jumpBuffer = 0;
    }
    vy -= (GRAVITY + (!jumpHeld && vy > 0 ? 16 : 0)) * dt;
    pos.y += vy * dt;
    const ground = groundAt(pos.x, pos.z);
    if (pos.y <= ground) {
      if (!grounded && vy < -3) land = 0.16;
      // Kerbs: step up smoothly rather than pop
      pos.y = pos.y < ground - 0.05 ? pos.y + (ground - pos.y) * damp(20, dt) : ground;
      vy = 0;
      grounded = true;
    } else if (pos.y > ground + 0.04) grounded = false;
    land = Math.max(0, land - dt);

    // Animation
    runAmt += (THREE.MathUtils.clamp((speed - WALK) / (RUN - WALK), 0, 1) - runAmt) * damp(8, dt);
    air += ((grounded ? 0 : 1) - air) * damp(12, dt);
    phase += dt * speed * 3.1;
    const stride = Math.min(1, speed / WALK);
    const P = hero.pose;
    walkPose(P, phase, stride, runAmt);
    if (speed < 0.2) P.bob += Math.sin(t * 1.6) * 0.004;
    // Recoil kicks the view up a touch; the rifle rides the shoulder
    const kick = combat.update(dt, t, aim);
    if (kick) {
      pitch = Math.max(firstPerson ? -1.35 : -0.55, pitch - kick);
      recoil = Math.min(0.04, recoil + kick);
    }
    recoil = Math.max(0, recoil - dt * 0.35);
    aimAmt += ((shooting ? 1 : 0) - aimAmt) * damp(14, dt);
    if (hero.gummy) hero.gummy.visible = !combat.armed;
    if (combat.armed) {
      // Both hands on the rifle: low and ready, or up at the shoulder when aiming or firing
      const up = -pitch * aimAmt;
      const L = THREE.MathUtils.lerp;
      // Right hand (arms[0]) on the grip, left hand under the barrel: the rifle rides the right
      // shoulder, the side the camera looks over
      Object.assign(P.arms[0], { fwd: L(0.55, 1.2, aimAmt) + up * 0.9, out: L(0.12, 0.28, aimAmt), bend: L(1.05, 1.2, aimAmt) });
      Object.assign(P.arms[1], { fwd: L(0.95, 1.4, aimAmt) + up * 0.9, out: L(-0.22, -0.12, aimAmt), bend: L(0.95, 0.45, aimAmt) });
      const rl = combat.reloading ? Math.sin(combat.reloading * Math.PI) : 0;
      if (rl) Object.assign(P.arms[1], { fwd: L(P.arms[1].fwd, 0.45, rl), bend: L(P.arms[1].bend, 1.55, rl) });
      combat.poseGun(aimAmt, pitch, P.lean, recoil);
    } else if (aim) Object.assign(P.arms[1], { fwd: 1.45, out: 0.05, bend: 0.15 });
    airPose(P, air);
    // The head follows the camera: turns towards where you look, tilts up and down
    const lookYaw = THREE.MathUtils.clamp(wrap(lookFace - face), -0.9, 0.9);
    headYaw += ((speed < 0.25 || aim ? lookYaw : 0) - headYaw) * damp(8, dt);
    headPitch += (THREE.MathUtils.clamp((0.35 - pitch) * 0.6, -0.45, 0.55) - headPitch) * damp(8, dt);
    P.headYaw = headYaw;
    P.headPitch = headPitch;
    hero.update();
    hero.g.position.set(pos.x, pos.y, pos.z);
    hero.g.rotation.set(0, face, 0);
    const squash = land / 0.16;
    hero.g.scale.set(SCALE * (1 + squash * 0.18), SCALE * (1 - squash * 0.22), SCALE * (1 + squash * 0.18));
    hero.ring.position.set(pos.x, ground + 0.02, pos.z);
    (hero.ring.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - air * 0.6);

    // Camera: over the shoulder, pulled in when something's in the way
    // Armed, he steps further left of the crosshair so it never sits on his head
    armAmt += ((combat.armed ? 1 : 0) - armAmt) * damp(6, dt);
    const shoulder = firstPerson ? 0 : THREE.MathUtils.clamp(1 - zoom / 10, 0, 1) * 0.38 + armAmt * 0.42;
    pivotWant.set(pos.x + Math.cos(yaw) * shoulder, pos.y + (firstPerson ? 1.12 : 0.95) * SCALE + 0.05, pos.z - Math.sin(yaw) * shoulder);
    if (pivot.lengthSq() === 0) pivot.copy(pivotWant);
    pivot.x += (pivotWant.x - pivot.x) * damp(18, dt);
    pivot.z += (pivotWant.z - pivot.z) * damp(18, dt);
    pivot.y += (pivotWant.y - pivot.y) * damp(firstPerson ? 25 : 10, dt);
    // Looking up tilts the view but keeps the camera behind him (not down at his feet),
    // so he drops to the bottom of the frame and the sky opens up
    const camPitch = firstPerson ? pitch : Math.max(pitch, -0.12);
    offset.set(Math.sin(yaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(yaw) * Math.cos(camPitch));
    const want = firstPerson ? 0 : zoom * (aim ? 0.62 : 1);
    const room = firstPerson ? 0 : cameraRoom(pivot, offset, want);
    camDist = room < camDist ? room : camDist + (room - camDist) * damp(4, dt);
    camera.position.copy(pivot).addScaledVector(offset, camDist);
    if (firstPerson) camera.position.y += Math.sin(phase * 2) * 0.025 * stride * (1 - air) * (1 - combat.aimed * 0.8);
    view.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    lookAt.copy(camera.position).sub(view);
    camera.lookAt(lookAt);
    hero.g.visible = !firstPerson && camDist > 0.6;
    hero.ring.visible = !firstPerson;
    combat.view(dt, t, { firstPerson, aim, move: stride, phase, run: runAmt, air });

    // Field of view widens with speed, narrows when aiming
    const wantFov = (firstPerson ? 70 : 52) + runAmt * 8 - (aim ? (firstPerson && combat.armed ? 20 : 10) : 0);
    fov += (wantFov - fov) * damp(6, dt);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // Door prompts, and the Armoury's weapon rack
    let best: { id: SpotId | 'gear'; label: string } | null = null;
    let bestD = 1.7;
    if (Math.hypot(RACK.x - pos.x, RACK.z - pos.z) < 1.1) {
      best = { id: 'gear', label: combat.geared ? 'Refill ammo' : 'Gear up' };
      bestD = 0;
    }
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
      if (near) prompt.querySelector('[data-walk-label]')!.textContent = near.id === 'gear' ? near.label : `Enter ${near.label}`;
    }
  }

  return {
    get active() {
      return active;
    },
    get position() {
      return pos;
    },
    get looking() {
      return locked();
    },
    onKey,
    update,
    enter() {
      active = true;
      // A few steps back from the doors, so the arcade tower fills the view
      pos.copy(SPAWN).add(new THREE.Vector3(Math.sin(SPAWN_YAW), 0, Math.cos(SPAWN_YAW)).multiplyScalar(2.6));
      vel.set(0, 0);
      vy = 0;
      grounded = true;
      face = 0;
      yaw = SPAWN_YAW;
      // First person by default; V (or the Controls panel) swaps to the shoulder camera
      pitch = -0.16;
      zoom = camDist = 5.2;
      pivot.set(0, 0, 0);
      setFirstPerson(true);
      baseFov = camera.fov;
      fov = camera.fov;
      hero.g.visible = hero.ring.visible = true;
      root.dataset.mode = 'walk';
    },
    exit() {
      active = false;
      keys.clear();
      jumpHeld = mouseL = mouseR = false;
      setAim(false);
      combat.exit();
      joy.id = -1;
      joy.x = joy.y = 0;
      knob.style.transform = '';
      near = null;
      prompt.hidden = true;
      hero.g.visible = hero.ring.visible = false;
      if (locked()) document.exitPointerLock();
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
      root.dataset.mode = 'explore';
    },
    /** True if Esc was used to free the mouse (so it shouldn't also stop walking). */
    releaseMouse() {
      if (locked()) {
        document.exitPointerLock();
        return true;
      }
      return performance.now() - unlockedAt < 250;
    },
  };
}
