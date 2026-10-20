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
 * - The garage office door opens the garage menu: the camera swings round to
 *   the showroom turntable while you pick your car.
 * - Get in your car (at the turntable, or wherever you left it) and drive
 *   (drive.ts); get out anywhere.
 */
import * as THREE from 'three';
import type { SpotId } from '../../lib/city';
import { PLAYER, airPose, createDegen, emotePose, walkPose, type Outfit } from './character';
import { createCombat, type Sfx } from './combat';
import { WEAPON_IDS } from './combat-sim';
import { createGunShop } from './gunshop';
import { carStatsOf, ownsCar, takedown } from './tycoon';
import { createGarageUI, loadCar } from './garage-ui';
import { DEFAULT_CAR } from './mycar';
import type { Garage } from './garage';
import { createDrive } from './drive';
import { CAMERA_ONLY, DOORS, GARAGE_SITE, RACK, SOLIDS, TURNTABLE_BOX, WALK_SPAWN, rayBoxes, type Box } from './solids';
import { NS_ROADS, RIVER, SLAB, WALK_W, type Tick } from './world';
import { WORLD_BOUNDS } from './layout';
import { PLAN, inPoly } from './streetplan';
import type { GameDeps } from './ui';

/** Facing the Emporium's doors, the tower over his shoulder */
const SPAWN_YAW = WALK_SPAWN.yaw;
const RADIUS = 0.22;
const WALK = 2.4;
const RUN = 5.4;
const JUMP = 3.9;
const GRAVITY = 11.5;
/** How hard the crew's shove pushes (tiles a second, easing off as it lasts) */
const SHOVE = 4;
const SCALE = 0.85;
/** How far you can go: the world's edge */
const BOUNDS = WORLD_BOUNDS;
/** Downtown's blocks, the districts and the extra lots (garage, market...) with their sidewalks: the raised ground (with bounding boxes for a quick test first) */
const slabs = PLAN.slabs.map((poly) => ({ poly, box: [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1])), 0] as Box }));
/** What your own car bumps into: everything solid but the turntable it starts on */
const CAR_SOLIDS = SOLIDS.filter((b) => b !== TURNTABLE_BOX);
const inBox = (b: Box, x: number, z: number, pad = 0) => x > b[0] - pad && x < b[2] + pad && z > b[1] - pad && z < b[3] + pad;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);

const SETTINGS_KEY = 'degen-city-walk-v1';
/** Aim when firing: never, only with the on-screen Fire button, or with any fire (mouse, keys, gamepad, touch) */
type AutoAds = 'off' | 'touch' | 'always';
const AUTO_ADS: AutoAds[] = ['off', 'touch', 'always'];
interface Settings {
  sens: number;
  invert: boolean;
  autoAds: AutoAds;
}
function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return { sens: typeof s.sens === 'number' ? s.sens : 1, invert: !!s.invert, autoAds: AUTO_ADS.includes(s.autoAds) ? s.autoAds : 'off' };
  } catch {
    return { sens: 1, invert: false, autoAds: 'off' };
  }
}
/** How long the sight stays up after the trigger is let go (so single shots don't flicker in and out) */
const AUTO_ADS_HOLD = 0.35;

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
  sfx(kind: Sfx, gain?: number): void;
  /** The garage on the south bank (its turntable shows the car being picked) */
  garage: Garage;
  /** Your car's engine sound: revs 0..1, or negative for off */
  engine(revs: number): void;
  /** Your business's places on foot (your stall, your units): where to stand, and the prompt's label */
  places(): { id: string; x: number; z: number; label: string }[];
  /** Open one of them (tycoon-ui.ts) */
  openPlace(id: string): void;
  /** The economy, for the shops in walk mode (buying, mods) */
  game: GameDeps;
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
  /** An emote playing on Degen (seen in third person, and by other players) */
  let emote: { id: string; t: number } | null = null;
  let speedNow = 0;

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
  // Controls > Shooting: aim when firing
  const autoAdsBtns = [...root.querySelectorAll<HTMLButtonElement>('[data-auto-ads]')];
  const paintAutoAds = () => autoAdsBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.autoAds === settings.autoAds)));
  for (const b of autoAdsBtns)
    b.addEventListener('click', () => {
      settings.autoAds = b.dataset.autoAds as AutoAds;
      paintAutoAds();
      saveSettings();
    });
  paintAutoAds();

  const SPAWN = new THREE.Vector3(WALK_SPAWN.x, SLAB, WALK_SPAWN.z);
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
  /** Aiming right now: held aim, or the sight brought up by firing (Aim when firing) */
  let aimNow = false;
  let autoAdsT = 0;
  let runLock = false;
  let baseFov = camera.fov;
  let fov = 52;
  const pivot = new THREE.Vector3();
  const keys = new Set<string>();
  const joy = { x: 0, y: 0, id: -1 };
  const pad = { x: 0, y: 0, run: false, prev: [] as boolean[] };
  let near: { id: SpotId | 'gear' | 'garage' | 'car' | `place:${string}`; label: string } | null = null;
  const act = () => {
    if (!near) return;
    if (near.id === 'gear') shop.show();
    else if (near.id === 'garage') garageUI.show();
    else if (near.id === 'car') (drive.active ? getOut() : getIn());
    else if (near.id.startsWith('place:')) {
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      d.openPlace(near.id.slice(6));
    } else openSpot(near.id as SpotId);
  };

  const groundAt = (x: number, z: number) => (slabs.some((s) => inBox(s.box, x, z) && inPoly(s.poly, [x, z])) ? SLAB : 0.035);
  const onBridge = (x: number) => NS_ROADS.some((r) => Math.abs(x - r.c) < r.half + WALK_W - 0.15);
  function blocked(x: number, z: number) {
    if (x < BOUNDS[0] || x > BOUNDS[2] || z < BOUNDS[1] || z > BOUNDS[3]) return true;
    if (z > RIVER[0] - 0.3 && z < RIVER[1] + 0.3 && !onBridge(x)) return true;
    if (SOLIDS.some((b) => inBox(b, x, z, RADIUS))) return true;
    if (drive.blocks(x, z, RADIUS)) return true;
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
  const rayWorld = (from: THREE.Vector3, dir: THREE.Vector3, max: number) => rayBoxes(from, dir, max, d.plotSolids());

  const combat = createCombat({
    scene: d.scene,
    camera,
    root,
    tick: d.tick,
    ground: SLAB,
    rayWorld,
    sfx: d.sfx,
    game: d.game,
    // Each takedown counts for the city's game (XP, missions)
    onTakedown(kind) {
      takedown(d.game.save(), kind);
      d.game.commit();
    },
  });
  // The Armoury's store and workbench at its counter: frees the mouse and pauses walking while it's open
  const shop = createGunShop(root, {
    lifetime: () => combat.lifetime,
    weapon: () => combat.weapon,
    geared: () => combat.geared,
    equip: (id) => combat.equip(id),
    game: d.game,
    setMods: (id) => combat.setMods(id),
    onOpen() {
      keys.clear();
      jumpHeld = false;
      setAim(false);
      combat.trigger(false);
      combat.trigger(false, true);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
    onClose: () => canvas.focus({ preventScroll: true }),
  });
  combat.onLifetime(() => shop.refresh());
  // The garage menu: like the store it frees the mouse and pauses walking; the camera goes to the
  // turntable (from over the shoulder, so the first-person hands stay out of the shot)
  let fpBeforeGarage = false;
  const garageUI = createGarageUI(root, {
    preview: (c) => d.garage.show(c),
    // Kept: if your car is out on the streets, it comes home
    keep(c) {
      drive.recall();
      d.garage.show(c);
    },
    cancel(saved) {
      if (drive.away) d.garage.clear();
      else d.garage.show(saved);
    },
    away: () => drive.away,
    game: d.game,
    onOpen() {
      keys.clear();
      jumpHeld = false;
      vel.set(0, 0);
      setAim(false);
      combat.trigger(false);
      combat.trigger(false, true);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      fpBeforeGarage = firstPerson;
      if (firstPerson) setFirstPerson(false);
      d.garage.spin(true);
    },
    onClose() {
      d.garage.spin(false);
      if (fpBeforeGarage) setFirstPerson(true);
      canvas.focus({ preventScroll: true });
    },
  });
  // Your car: get in where it is, drive, get out anywhere
  const drive = createDrive({
    scene: d.scene,
    camera,
    root,
    garage: d.garage,
    // (a premium car saved in the browser only counts while the save owns it)
    myCar: () => {
      const c = loadCar();
      return ownsCar(d.game.save(), c.model) ? c : { ...DEFAULT_CAR };
    },
    stats: (model) => carStatsOf(d.game.save(), model),
    solids: () => (d.plotSolids().length ? [...CAR_SOLIDS, ...d.plotSolids()] : CAR_SOLIDS),
    groundAt,
    cameraRoom,
    free: (x, z) => !blocked(x, z),
    sfx: d.sfx,
    engine: d.engine,
    bounds: [BOUNDS[0], BOUNDS[1], BOUNDS[2], BOUNDS[3], 0],
  });

  /** Driving input from the gamepad and the touch pedals */
  const padDrive = { steer: 0, throttle: 0, handbrake: false };
  const pedals = { gas: false, brake: false };
  function getIn() {
    if (combat.armed) combat.toggleHolster();
    if (!drive.enter()) return;
    keys.clear();
    vel.set(0, 0);
    jumpHeld = false;
    setAim(false);
    combat.trigger(false);
    combat.trigger(false, true);
    hero.g.visible = hero.ring.visible = false;
    near = null;
    d.touched();
  }
  function getOut() {
    const out = drive.exit();
    if (!out) return;
    pos.set(out.x, groundAt(out.x, out.z), out.z);
    vel.set(0, 0);
    vy = 0;
    // Looking the way the car was facing
    const carYaw = out.yaw - Math.PI / 2;
    yaw = Math.atan2(-Math.cos(carYaw), Math.sin(carYaw));
    face = yaw + Math.PI;
    pitch = firstPerson ? -0.05 : 0.35;
    pivot.set(0, 0, 0);
    camDist = zoom;
    keys.clear();
    pedals.gas = pedals.brake = false;
    near = null;
    d.touched();
  }
  /** How far the camera has swung over to the showroom (0..1) */
  let showroom = 0;
  const showEye = new THREE.Vector3();
  let viewShifted = false;
  hero.torso.add(combat.gun);
  let aimAmt = 0;
  let armAmt = 0;
  let recoil = 0;

  /* ---------- Input ---------- */

  const look = (dx: number, dy: number, k: number) => {
    if (drive.active) {
      drive.look(dx * k * settings.sens, dy * k * settings.sens * (settings.invert ? -1 : 1));
      d.touched();
      return;
    }
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
    root.classList.toggle('is-fp', on);
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
    // While the store or the garage is open, E closes it and walking keys wait
    if (shop.open || garageUI.open) {
      if (down && !e.repeat && c === 'KeyE') (shop.open ? shop.close() : garageUI.close());
      return false;
    }
    // Driving: steer and pedal with the move keys, Space for the handbrake, V swaps camera, E gets out
    if (drive.active) {
      if (down && !e.repeat && c === 'KeyE') act();
      else if (down && !e.repeat && c === 'KeyV') drive.toggleView();
      else if (c === 'Space') jumpHeld = down;
      else if (MOVE.includes(c)) {
        if (down) keys.add(c);
        else keys.delete(c);
      } else return false;
      d.touched();
      e.preventDefault();
      return true;
    }
    if (down && c === 'KeyE' && near) act();
    else if (down && !e.repeat && c === 'KeyV') setFirstPerson(!firstPerson);
    else if (down && !e.repeat && c === 'CapsLock') setRunLock(!runLock);
    else if (down && !e.repeat && c === 'KeyR') combat.reload();
    else if (down && !e.repeat && c === 'KeyG') combat.toggleHolster();
    else if (down && !e.repeat && c === 'KeyQ') combat.swap(1);
    // 1-4 pick a gun (unless the emote panel has them)
    else if (down && !e.repeat && /^Digit[1-7]$/.test(c) && !root.querySelector('[data-emotes][open]')) combat.swap(WEAPON_IDS[Number(c.slice(5)) - 1]);
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
  // Switching away lets go of everything (keys, buttons, sticks, a look drag)
  window.addEventListener('blur', () => {
    keys.clear();
    jumpHeld = false;
    mouseL = mouseR = false;
    setAim(false);
    combat.trigger(false);
    combat.trigger(false, true);
    endJoy();
    drag = null;
  });

  // Mouse: click to capture it (pointer lock), then just move to look
  const locked = () => document.pointerLockElement === canvas;
  // Esc frees the mouse first; browsers may release the lock before the key event arrives
  let unlockedAt = -1e9;
  // Some pages can't capture the mouse (embedded frames, some browsers): then a click
  // fires straight away and dragging looks around
  let noLock = !('requestPointerLock' in canvas);
  document.addEventListener('pointerlockerror', () => (noLock = true));
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
  // Taps send mouse events too (after the touch): only a real mouse fires and aims here
  let lastPointer = 'mouse';
  canvas.addEventListener('pointerdown', (e) => (lastPointer = e.pointerType), true);
  canvas.addEventListener('mousedown', (e) => {
    if (!active || lastPointer !== 'mouse') return;
    if (e.button === 2) aim = mouseR = true;
    if (e.button === 0 && (locked() || noLock)) {
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
      if (!locked() && !noLock) {
        const req = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
        req?.catch?.(() => (noLock = true));
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
  // A cancelled touch (the browser took it over) must not leave the drag stuck
  for (const ev of ['pointerup', 'pointercancel'] as const)
    window.addEventListener(ev, (e) => {
      if (drag && e.pointerId === drag.id) drag = null;
    });
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!active || drive.active) return;
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
    knob.style.transform = `translate(${x * r.width * 0.27}px, ${y * r.width * 0.27}px)`;
    d.touched();
  };
  stick.addEventListener('pointerdown', (e) => {
    joy.id = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    setJoy(e);
    e.stopPropagation();
  });
  stick.addEventListener('pointermove', (e) => e.pointerId === joy.id && setJoy(e));
  const endJoy = (e?: PointerEvent) => {
    if (e && e.pointerId !== joy.id) return;
    joy.id = -1;
    joy.x = joy.y = 0;
    knob.style.transform = '';
  };
  stick.addEventListener('pointerup', (e) => endJoy(e));
  stick.addEventListener('pointercancel', (e) => endJoy(e));
  const jumpBtn = $('[data-walk-jump]');
  jumpBtn.addEventListener('pointerdown', () => {
    tryJump();
    jumpHeld = true;
  });
  jumpBtn.addEventListener('pointerup', () => (jumpHeld = false));
  jumpBtn.addEventListener('pointercancel', () => (jumpHeld = false));
  runBtn.addEventListener('click', () => setRunLock(!runLock));
  // Touch pedals while driving (the stick steers)
  for (const [sel, key] of [
    ['[data-drive-gas]', 'gas'],
    ['[data-drive-brake]', 'brake'],
  ] as const) {
    const b = $(sel);
    b.addEventListener('pointerdown', (e) => {
      try {
        b.setPointerCapture(e.pointerId);
      } catch {
        /* still pressed, just not captured */
      }
      pedals[key] = true;
      d.touched();
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(ev, () => (pedals[key] = false));
  }
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
  // Touch: hold Fire (and drag it to aim, so one thumb shoots and steers), tap Reload, tap Swap
  const fireBtn = $('[data-walk-fire]');
  let fireAt: { id: number; x: number; y: number } | null = null;
  fireBtn.addEventListener('pointerdown', (e) => {
    fireBtn.setPointerCapture(e.pointerId);
    fireAt = { id: e.pointerId, x: e.clientX, y: e.clientY };
    combat.trigger(true, true);
    d.touched();
  });
  fireBtn.addEventListener('pointermove', (e) => {
    if (!fireAt || e.pointerId !== fireAt.id) return;
    look(e.clientX - fireAt.x, e.clientY - fireAt.y, 0.0075);
    fireAt.x = e.clientX;
    fireAt.y = e.clientY;
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
    fireBtn.addEventListener(ev, (e) => {
      if (fireAt && e.pointerId !== fireAt.id) return;
      fireAt = null;
      combat.trigger(false, true);
    });
  $('[data-walk-reload]').addEventListener('click', () => combat.reload());
  $('[data-walk-swap]').addEventListener('click', () => {
    combat.swap(1);
    d.touched();
  });
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
  // RT fire, LT aim, X reload, D-pad up holster, RB / D-pad left-right swap guns
  function pollPad(dt: number) {
    const gp = Array.from(navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
    if (!gp) {
      pad.x = pad.y = 0;
      pad.run = false;
      padDrive.steer = padDrive.throttle = 0;
      padDrive.handbrake = false;
      // Unplugged with a trigger down: let go of it
      if (pad.prev[6]) setAim(false);
      if (pad.prev[7]) combat.trigger(false);
      if (pad.prev.length) pad.prev = [];
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
    // The store: D-pad picks, A takes, B (or Y again) closes
    if (shop.open) {
      if (edge(14) || edge(12)) shop.step(-1);
      if (edge(15) || edge(13)) shop.step(1);
      if (edge(0)) shop.take();
      if (edge(1) || edge(3)) shop.close();
      pad.x = pad.y = 0;
      pad.prev = b;
      return;
    }
    // The garage: D-pad left / right picks the model, up / down the paint, A keeps it
    if (garageUI.open) {
      if (edge(14)) garageUI.step(-1);
      if (edge(15)) garageUI.step(1);
      if (edge(12)) garageUI.stepPaint(-1);
      if (edge(13)) garageUI.stepPaint(1);
      if (edge(0)) garageUI.keep();
      if (edge(1) || edge(3)) garageUI.close();
      pad.x = pad.y = 0;
      pad.prev = b;
      return;
    }
    // Driving: left stick steers, RT gas, LT brake / reverse, A handbrake, Y gets out, View swaps camera
    if (drive.active) {
      padDrive.steer = pad.x;
      padDrive.throttle = (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0);
      padDrive.handbrake = !!b[0];
      if (edge(3)) act();
      if (edge(8)) drive.toggleView();
      if (pad.x || padDrive.throttle || b.some(Boolean)) d.touched();
      pad.prev = b;
      return;
    }
    if (edge(0)) tryJump();
    jumpHeld = jumpHeld || b[0] || false;
    if (!b[0] && pad.prev[0]) jumpHeld = false;
    pad.run = !!(b[4] || b[10]);
    aim = aim || !!b[6];
    if (!b[6] && pad.prev[6]) setAim(false);
    if (edge(3)) act();
    if (edge(8)) setFirstPerson(!firstPerson);
    if (b[7] !== !!pad.prev[7]) combat.trigger(!!b[7]);
    if (edge(2)) combat.reload();
    if (edge(12)) combat.toggleHolster();
    // RB or D-pad right: next gun; D-pad left: previous
    if (edge(5) || edge(15)) combat.swap(1);
    if (edge(14)) combat.swap(-1);
    if (pad.x || pad.y || b.some(Boolean)) d.touched();
    pad.prev = b;
  }

  /* ---------- Per frame ---------- */

  const offset = new THREE.Vector3();
  const pivotWant = new THREE.Vector3();
  const view = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

  /**
   * The garage's showroom shot: while its menu is open the camera eases over to look at the
   * turntable, and the picture slides so the car sits in the space the panel leaves free (left of
   * it on wide screens, above the bottom sheet on phones).
   */
  function frameShowroom(dt: number) {
    showroom += ((garageUI.open ? 1 : 0) - showroom) * damp(garageUI.open ? 3.5 : 6, dt);
    if (showroom < 0.003) {
      showroom = 0;
      if (viewShifted) {
        camera.clearViewOffset();
        viewShifted = false;
      }
      return;
    }
    const s = showroom * showroom * (3 - 2 * showroom);
    const v = d.garage.view;
    // Upright screens see less across: step back so the whole car fits
    const back = THREE.MathUtils.clamp(1.15 / camera.aspect, 1, 1.9);
    camera.position.lerp(showEye.copy(v.eye).sub(v.at).multiplyScalar(back).add(v.at), s);
    lookAt.lerp(v.at, s);
    camera.lookAt(lookAt);
    hero.g.visible = true;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const c = canvas.getBoundingClientRect();
    const r = garageUI.panel.getBoundingClientRect();
    let ox = 0;
    let oy = 0;
    if (r.width && r.height && w && h) {
      if (r.top - c.top > h * 0.3) {
        // Bottom sheet: centre the car between the header and the sheet
        const head = root.querySelector('.city-head')?.getBoundingClientRect().bottom ?? c.top;
        oy = h / 2 - (Math.max(0, head - c.top) + (r.top - c.top)) / 2;
      } else ox = w / 2 - Math.max(0, r.left - c.left) / 2;
    }
    camera.setViewOffset(w, h, ox * s, oy * s, w, h);
    viewShifted = true;
  }

  function driveFrame(dt: number, t: number) {
    const k = (a: string, b: string) => (keys.has(a) || keys.has(b) ? 1 : 0);
    let steer = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
    let throttle = k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown');
    if (joy.id >= 0) {
      steer = joy.x;
      // The stick pedals too, unless a pedal button is held
      if (!pedals.gas && !pedals.brake) throttle = -joy.y;
    }
    if (pedals.gas || pedals.brake) throttle = (pedals.gas ? 1 : 0) - (pedals.brake ? 1 : 0);
    if (padDrive.steer) steer = padDrive.steer;
    if (padDrive.throttle) throttle = padDrive.throttle;
    drive.update(dt, { throttle, steer, handbrake: jumpHeld || padDrive.handbrake });
    const s = drive.state!;
    pos.set(s.x, groundAt(s.x, s.z), s.z);
    speedNow = Math.hypot(s.vx, s.vz);
    hero.g.visible = hero.ring.visible = false;
    // The rest of the city carries on (drones, dummies, the crew: it leaves a car alone)
    combat.setPlayerPos(NaN, NaN);
    combat.update(dt, t, false);
    combat.view(dt, t, { firstPerson: false, aim: false, move: 0, phase: 0, run: 0, air: 0 });
    if (near?.id !== 'car') {
      near = { id: 'car', label: 'Get out' };
      prompt.hidden = false;
      prompt.querySelector('[data-walk-label]')!.textContent = near.label;
    }
  }

  function update(dt: number, t: number) {
    if (!active) return;
    pollPad(dt);
    if (drive.active) return driveFrame(dt, t);

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
    // Aim when firing: the sight comes up while the trigger is held, and stays a moment after
    const autoFire = settings.autoAds === 'always' ? combat.firing : settings.autoAds === 'touch' ? combat.touchFiring : false;
    autoAdsT = combat.armed && autoFire ? AUTO_ADS_HOLD : Math.max(0, autoAdsT - dt);
    aimNow = aim || autoAdsT > 0;
    const shooting = combat.armed && (aimNow || combat.firing);
    const top = run && !shooting ? RUN : shooting ? WALK * 0.7 : WALK;

    // Accelerate towards it (less control in the air)
    const k = damp(grounded ? (mag > 0.05 ? 11 : 14) : 2.5, dt);
    vel.x += (dirX * top - vel.x) * k;
    vel.y += (dirZ * top - vel.y) * k;
    // Shoved by one of the crew (combat.ts): knocked back for a moment, whatever you're pressing
    const sh = combat.shove;
    if (sh) {
      const push = damp(30, dt);
      vel.x += (sh.dx * SHOVE * sh.t - vel.x) * push;
      vel.y += (sh.dz * SHOVE * sh.t - vel.y) * push;
    }
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
    speedNow = speed;
    if (emote) {
      emote.t += dt;
      if (emote.t > 3 || speed > 0.6) emote = null;
      else if (!combat.armed) emotePose(P, emote.id, emote.t);
    }
    // Recoil kicks the view up a touch; the rifle rides the shoulder
    combat.setPlayerPos(pos.x, pos.z);
    const kick = combat.update(dt, t, aimNow);
    if (kick) {
      pitch = Math.max(firstPerson ? -1.35 : -0.55, pitch - kick);
      recoil = Math.min(0.04, recoil + kick);
    }
    recoil = Math.max(0, recoil - dt * 0.35);
    aimAmt += ((shooting ? 1 : 0) - aimAmt) * damp(14, dt);
    if (hero.held) hero.held.visible = !combat.armed;
    airPose(P, air);
    // Both hands on the gun (after walking and jumping have posed the arms)
    if (combat.armed) combat.poseGun(P, aimAmt, pitch, recoil, dt);
    else if (aim) Object.assign(P.arms[1], { fwd: 1.45, out: 0.05, bend: 0.15, twist: 0 });
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
    pivotWant.set(pos.x + Math.cos(yaw) * shoulder, pos.y + (firstPerson ? 1.2 : 1.0) * SCALE + 0.05, pos.z - Math.sin(yaw) * shoulder);
    if (pivot.lengthSq() === 0) pivot.copy(pivotWant);
    pivot.x += (pivotWant.x - pivot.x) * damp(18, dt);
    pivot.z += (pivotWant.z - pivot.z) * damp(18, dt);
    pivot.y += (pivotWant.y - pivot.y) * damp(firstPerson ? 25 : 10, dt);
    // Looking up tilts the view but keeps the camera behind him (not down at his feet),
    // so he drops to the bottom of the frame and the sky opens up
    const camPitch = firstPerson ? pitch : Math.max(pitch, -0.12);
    offset.set(Math.sin(yaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(yaw) * Math.cos(camPitch));
    const want = firstPerson ? 0 : zoom * (aimNow ? 0.62 : 1);
    const room = firstPerson ? 0 : cameraRoom(pivot, offset, want);
    camDist = room < camDist ? room : camDist + (room - camDist) * damp(4, dt);
    camera.position.copy(pivot).addScaledVector(offset, camDist);
    if (firstPerson) camera.position.y += Math.sin(phase * 2) * 0.025 * stride * (1 - air) * (1 - combat.aimed * 0.8);
    view.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    lookAt.copy(camera.position).sub(view);
    camera.lookAt(lookAt);
    hero.g.visible = !firstPerson && camDist > 0.6;
    frameShowroom(dt);
    hero.ring.visible = !firstPerson;
    combat.view(dt, t, { firstPerson, aim: aimNow, move: stride, phase, run: runAmt, air });

    // Field of view widens with speed, narrows when aiming
    const wantFov = (firstPerson ? 70 : 52) + runAmt * 8 - (aimNow ? (firstPerson && combat.armed ? combat.adsZoom : 10) : 0);
    fov += (wantFov - fov) * damp(6, dt);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // Door prompts, and the Armoury's gun store counter
    let best: { id: SpotId | 'gear' | 'garage' | 'car' | `place:${string}`; label: string } | null = null;
    let bestD = 1.7;
    const atCounter = Math.hypot(RACK.x - pos.x, RACK.z - pos.z);
    if (atCounter < 1.1) {
      best = { id: 'gear', label: 'Gun store' };
      bestD = 0;
    }
    if (shop.open && atCounter > 2) shop.close();
    if (Math.hypot(GARAGE_SITE.door.x - pos.x, GARAGE_SITE.door.z - pos.z) < 1.3) {
      best = { id: 'garage', label: 'Garage' };
      bestD = 0;
    }
    if (!drive.active)
      for (const p of d.places())
        if (Math.hypot(p.x - pos.x, p.z - pos.z) < 1) {
          best = { id: `place:${p.id}`, label: p.label };
          bestD = 0;
        }
    if (!garageUI.open && drive.nearCar(pos.x, pos.z) < 0.75) {
      best = { id: 'car', label: 'Get in' };
      bestD = 0;
    }
    for (const door of DOORS) {
      const dd = Math.hypot(door.x - pos.x, door.z - pos.z);
      if (dd < bestD) {
        bestD = dd;
        best = { id: door.id, label: root.querySelector(`[data-pin="${door.id}"] .city-pin-title`)?.textContent ?? door.id };
      }
    }
    if (best?.id !== near?.id || best?.label !== near?.label) {
      near = best;
      prompt.hidden = !near;
      if (near) prompt.querySelector('[data-walk-label]')!.textContent = near.id === 'gear' || near.id === 'garage' || near.id === 'car' || near.id.startsWith('place:') ? near.label : `Enter ${near.label}`;
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
    /** Driving your car? */
    get driving() {
      return drive.active;
    },
    /** Your car, if it's out of the garage: where it is, its model, and whether you're in it */
    get car() {
      const st = drive.state;
      return st ? { x: st.x, z: st.z, model: drive.model, driving: drive.active, speed: st.speed } : null;
    },
    onKey,
    update,
    /** The rifle and target practice (the Profile panel and multiplayer talk to it) */
    combat,
    /** Dress Degen in a new outfit (the wardrobe) */
    setLook(o: Outfit) {
      const vis = hero.g.visible;
      d.scene.remove(hero.g);
      // The gun moves to the new body; only the old body's geometry goes
      combat.gun.removeFromParent();
      hero.g.traverse((m) => (m as THREE.Mesh).geometry?.dispose());
      Object.assign(hero, createDegen(o));
      hero.g.scale.setScalar(SCALE);
      hero.g.visible = vis;
      hero.torso.add(combat.gun);
      d.scene.add(hero.g);
      combat.setOutfit(o);
    },
    playEmote(id: string) {
      emote = { id, t: 0 };
    },
    /** What other players need to see of us, for the game server */
    netState() {
      return { pos, face, pitch, speed: speedNow, air: !grounded, run: runAmt > 0.5, aim: aimNow };
    },
    /** The server put us back (we moved somewhere impossible) */
    fix(x: number, y: number, z: number) {
      pos.set(x, y, z);
      vel.set(0, 0);
    },
    enter() {
      active = true;
      // A few steps back from the doors, so the arcade tower fills the view
      pos.copy(SPAWN).add(new THREE.Vector3(Math.sin(SPAWN_YAW), 0, Math.cos(SPAWN_YAW)).multiplyScalar(WALK_SPAWN.back));
      vel.set(0, 0);
      vy = 0;
      grounded = true;
      face = 0;
      yaw = SPAWN_YAW;
      // ?spawn=x,z[,yaw] in the address: start walking somewhere else (for checking a place on real devices)
      const at = new URLSearchParams(location.search).get('spawn')?.split(',').map(Number);
      if (at && at.length >= 2 && at.every(Number.isFinite)) {
        pos.set(at[0], groundAt(at[0], at[1]), at[1]);
        if (at.length > 2) yaw = at[2];
      }
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
      // Leaving walk mode in the car: it stays parked where it is
      if (drive.active) getOut();
      active = false;
      root.classList.remove('is-fp');
      keys.clear();
      jumpHeld = mouseL = mouseR = false;
      setAim(false);
      shop.close();
      garageUI.close();
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
    /** Esc: close the gun store or the garage if one is open (true if it was) */
    closeShop() {
      return shop.close() || garageUI.close();
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
