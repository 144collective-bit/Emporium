/*
 * The animation lab (`?anim` in the address; docs/animation-plan.md): Degen
 * on an open floor with the city's ink outlines, for reviewing his
 * movement. The new animation (animator.ts, from motion capture) and, to
 * compare, the old procedural one (locomotion.ts) side by side, both fed
 * the same movement (movesim.ts).
 *
 * - Moves: scripted programs (run and stop, turning back, weaving, a
 *   circle, starts and stops at a sprint, jumps running and standing,
 *   short hops...) or by hand (W A S D across the floor, Shift sprints,
 *   Caps Lock walks, Space jumps), with walk.ts's jump and gravity.
 * - Time: full speed, a quarter, a tenth; P pauses, . steps a frame.
 * - Cameras: side on, front, behind, over his right shoulder (walk mode's, armed), free (drag to orbit, wheel to zoom).
 * - Foot traces (where each ball of the foot was held), and readouts:
 *   speed, the clip and frame playing, its rate, the match's cost, the
 *   blend left, jumps a second, the foot slide (how far a held foot has
 *   moved over the ground: now and the worst lately).
 * - Floors: flat, kerbs, stairs, and a ledge to run off (up a ramp, a drop
 *   of 1.6 tiles).
 * - Armed (animation Phase 8): any gun in his hands (stance.ts's hold, on
 *   the procedural walk, as in the city), aiming or not, the look swept up
 *   and down; markers at the gun's butt and his shoulder pocket.
 * - The address can set it all up for recordings: `prog`, `gait`, `cam`,
 *   `floor`, `speed`, `gun`, `aim=0`, `pitch`, `compare=0`, `traces=0`.
 */
import * as THREE from 'three';
import { PLAYER, createDegen, type Degen } from './character';
import { applyTo, createAnimator, type Animator } from './animator';
import { copyPose, createLocomotion, placeRoot } from './locomotion';
import { loadMocap } from './mocap-load';
import { GAITS, newMove, stepMove, type MoveState } from './movesim';
import { toon } from './kit';
import { buildGun } from './guns';
import { FIT } from './gunfit';
import { POCKET, holdGun, newStance } from './stance';
import type { WeaponId } from './combat-sim';
import { createPost } from './post';

const SCALE = 0.85;
/** One tile in centimetres, for the readouts */
const CM = 180;
type Prog = 'manual' | 'runstop' | 'turnback' | 'weave' | 'circle' | 'startstop' | 'startback' | 'gaits' | 'idle' | 'jumps' | 'standjump' | 'hops';
type Gait = 'walk' | 'run' | 'sprint';
type Cam = 'side' | 'front' | 'back' | 'over' | 'free';
type Floor = 'flat' | 'kerbs' | 'stairs' | 'ledge';
const FLOORS: Floor[] = ['flat', 'kerbs', 'stairs', 'ledge'];

/* ---------- The floors: flat, kerbs, stairs (along +z, the same for both figures) ---------- */

/** Kerbs: a slab up every KERB.every tiles, KERB.long of them, at the city's heights (world.ts SLAB over the road) */
const KERB = { every: 10, from: 4, long: 5, road: 0.035, slab: 0.15 };
/** Stairs at Liberty Bridge's size (liberty.ts): 15 steps up, a landing, 15 down, flat between */
const FLIGHT = { steps: 15, rise: 0.23, tread: 0.31, flat: 4, landing: 3 };
const RUN_LEN = FLIGHT.steps * FLIGHT.tread;
const TOP = FLIGHT.steps * FLIGHT.rise;
const PERIOD = FLIGHT.flat * 2 + RUN_LEN * 2 + FLIGHT.landing;
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** A ledge every LEDGE.every tiles: flat, a ramp up to `top`, a flat top, then a drop back down */
const LEDGE = { every: 16, ramp: 4, up: 6, flat: 2, top: 1.6 };
/** walk.ts's jump, gravity and the extra pull down when the jump is let go early */
const JUMP = 3.9;
const GRAVITY = 11.5;
const LET_GO = 16;
/** The ground he walks on (the stairs an even ramp, as the city's are) and what his feet stand on (their treads) */
function floorAt(kind: Floor, z: number, feet: boolean) {
  if (kind === 'ledge') {
    const u = mod(z, LEDGE.every) - LEDGE.ramp;
    return u < 0 ? 0 : u < LEDGE.up ? (u / LEDGE.up) * LEDGE.top : u < LEDGE.up + LEDGE.flat ? LEDGE.top : 0;
  }
  if (kind === 'kerbs') {
    const u = mod(z, KERB.every);
    return u >= KERB.from && u < KERB.from + KERB.long ? KERB.slab : KERB.road;
  }
  if (kind !== 'stairs') return 0;
  const u = mod(z, PERIOD) - FLIGHT.flat;
  const up = (v: number) => (feet ? Math.min(FLIGHT.steps, Math.floor(v / FLIGHT.tread) + 1) * FLIGHT.rise : (v / RUN_LEN) * TOP);
  if (u < 0) return 0;
  if (u < RUN_LEN) return up(u);
  if (u < RUN_LEN + FLIGHT.landing) return TOP;
  if (u < RUN_LEN * 2 + FLIGHT.landing) return up(RUN_LEN * 2 + FLIGHT.landing - u);
  return 0;
}
/** On a flight of the stairs (walk.ts slows him to a brisk climb on Liberty Bridge's: the same here) */
const onFlight = (kind: Floor, z: number) => {
  const u = mod(z, PERIOD) - FLIGHT.flat;
  return kind === 'stairs' && ((u >= 0 && u < RUN_LEN) || (u >= RUN_LEN + FLIGHT.landing && u < RUN_LEN * 2 + FLIGHT.landing));
};
const CLIMB = 1.75;
const PROGS: [Prog, string][] = [
  ['runstop', 'Run & stop'],
  ['turnback', 'Turn back'],
  ['weave', 'Weave'],
  ['circle', 'Circle'],
  ['startstop', 'Start / stop'],
  ['startback', 'Set off back'],
  ['gaits', 'Gait changes'],
  ['jumps', 'Run & jump'],
  ['standjump', 'Stand & jump'],
  ['hops', 'Short hops'],
  ['idle', 'Stand'],
  ['manual', 'By hand'],
];

/** The goal velocity a program asks for at time `t` (tiles a second), and whether it's sprinting */
function program(p: Prog, t: number, speed: number): [number, number] {
  const cycle = (len: number) => t % len;
  switch (p) {
    case 'idle':
      return [0, 0];
    case 'runstop': {
      const u = cycle(6);
      return u < 1 ? [0, 0] : u < 4 ? [0, speed] : [0, 0];
    }
    case 'turnback': {
      const u = cycle(6);
      return u < 3 ? [0, speed] : [0, -speed];
    }
    case 'weave': {
      const a = Math.sin(t * 1.4) * 0.9;
      return [Math.sin(a) * speed, Math.cos(a) * speed];
    }
    case 'circle': {
      const a = t * (speed / 4);
      return [Math.sin(a) * speed, Math.cos(a) * speed];
    }
    case 'startstop': {
      const u = cycle(3);
      return u < 1.6 ? [0, speed] : [0, 0];
    }
    // Standing, then off the way he's facing away from: a plant and a turn
    case 'startback': {
      const u = cycle(8);
      return u < 1.5 ? [0, 0] : u < 4 ? [0, -speed] : u < 5.5 ? [0, 0] : [0, speed];
    }
    // Walk, run, sprint, run, every two seconds (the gait buttons don't matter)
    case 'gaits':
      return [0, [GAITS.walk, GAITS.run, GAITS.sprint, GAITS.run][Math.floor(t / 2) % 4]];
    case 'jumps':
    case 'hops':
      return [0, speed];
    case 'standjump':
      return [0, 0];
    default:
      return [0, 0];
  }
}
/** Whether a program presses Jump at `t` (once a cycle), and holds it: a full jump, or a short hop let go at once */
function jumpOf(p: Prog, t: number, dt: number): { press: boolean; hold: boolean } {
  const len = p === 'hops' ? 1.4 : 2.4;
  const u = t % len;
  if (p !== 'jumps' && p !== 'standjump' && p !== 'hops') return { press: false, hold: false };
  return { press: u >= 1.2 && u - dt < 1.2, hold: u >= 1.2 && u < (p === 'hops' ? 1.27 : 1.9) };
}

export async function openLab(root: HTMLElement, d: { reduced: boolean; low: boolean }) {
  const q = new URLSearchParams(location.search);
  const ui = document.createElement('div');
  ui.className = 'anim-lab';
  ui.innerHTML = `
    <canvas class="anim-lab-view" aria-hidden="true"></canvas>
    <div class="anim-lab-panel">
      <div class="anim-lab-head"><span class="anim-lab-title">Animation lab</span><span class="anim-lab-note">?anim · Phases 1-3, 8</span><button class="anim-lab-close" type="button" aria-label="Close the lab">×</button></div>
      <div class="anim-lab-row" data-progs></div>
      <div class="anim-lab-row" data-gaits></div>
      <div class="anim-lab-row" data-time></div>
      <div class="anim-lab-row" data-cams></div>
      <div class="anim-lab-row" data-floors></div>
      <div class="anim-lab-row" data-guns></div>
      <div class="anim-lab-row" data-toggles></div>
      <dl class="anim-lab-read" data-read></dl>
      <p class="anim-lab-hint">By hand: W A S D, Shift sprints, Caps Lock walks, Space jumps. P pauses, . steps.</p>
    </div>`;
  root.append(ui);
  const canvas = ui.querySelector<HTMLCanvasElement>('canvas')!;
  const read = ui.querySelector<HTMLElement>('[data-read]')!;

  let prog: Prog = (PROGS.find(([p]) => p === q.get('prog'))?.[0] as Prog) ?? 'runstop';
  let gait: Gait = (['walk', 'run', 'sprint'] as Gait[]).find((g) => g === q.get('gait')) ?? 'run';
  let cam: Cam = (['side', 'front', 'back', 'over', 'free'] as Cam[]).find((c) => c === q.get('cam')) ?? 'side';
  let speed = Number(q.get('speed')) || 1;
  // (recordings: closer in, and the cheaper drawing)
  const near = Number(q.get('zoom')) || 1;
  if (q.has('low')) d = { ...d, low: true };
  // (`rec`: recordings draw a frame only when asked, with the outlines but none of the costly finish)
  const rec = q.has('rec');
  let compare = q.get('compare') !== '0';
  let traces = q.get('traces') !== '0';
  let floorKind: Floor = FLOORS.find((f) => f === q.get('floor')) ?? 'flat';
  let paused = false;
  let stepOnce = false;
  const GUNS: [WeaponId | 'none', string][] = [
    ['none', 'Unarmed'],
    ['rifle', 'Rifle'],
    ['smg', 'SMG'],
    ['shotgun', 'Shotgun'],
    ['dmr', 'Marksman'],
    ['burst', 'Burst'],
    ['lmg', 'Belt feeder'],
    ['revolver', 'Revolver'],
  ];
  let gunId: WeaponId | 'none' = (GUNS.find(([g]) => g === q.get('gun'))?.[0] as WeaponId) ?? 'none';
  let aimOn = q.get('aim') !== '0';
  const fixedPitch = q.has('pitch') ? Number(q.get('pitch')) : null;
  let sweep = fixedPitch === null;

  const button = (row: string, label: string, on: () => boolean, act: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'anim-lab-btn';
    b.textContent = label;
    b.addEventListener('click', () => {
      act();
      paint();
    });
    ui.querySelector(`[data-${row}]`)!.append(b);
    return () => b.classList.toggle('is-on', on());
  };
  const paints: (() => void)[] = [];
  const paint = () => paints.forEach((p) => p());
  for (const [p, label] of PROGS)
    paints.push(
      button('progs', label, () => prog === p, () => {
        prog = p;
        clock = 0;
      }),
    );
  for (const g of ['walk', 'run', 'sprint'] as Gait[]) paints.push(button('gaits', g[0].toUpperCase() + g.slice(1), () => gait === g, () => (gait = g)));
  for (const [s, label] of [
    [1, '1×'],
    [0.25, '¼×'],
    [0.1, '1/10×'],
  ] as const)
    paints.push(button('time', label, () => speed === s && !paused, () => ((speed = s), (paused = false))));
  paints.push(button('time', 'Pause', () => paused, () => (paused = !paused)));
  paints.push(button('time', 'Step', () => false, () => ((paused = true), (stepOnce = true))));
  for (const f of FLOORS) paints.push(button('floors', f[0].toUpperCase() + f.slice(1), () => floorKind === f, () => ((floorKind = f), buildFloor())));
  for (const c of ['side', 'front', 'back', 'over', 'free'] as Cam[]) paints.push(button('cams', c === 'over' ? 'Shoulder' : c[0].toUpperCase() + c.slice(1), () => cam === c, () => (cam = c)));
  paints.push(button('toggles', 'Old beside', () => compare, () => (compare = !compare)));
  paints.push(button('toggles', 'Foot traces', () => traces, () => (traces = !traces)));
  for (const [g, label] of GUNS) paints.push(button('guns', label, () => gunId === g, () => ((gunId = g), mount())));
  paints.push(button('toggles', 'Aim', () => aimOn, () => (aimOn = !aimOn)));
  paints.push(button('toggles', 'Sweep the look', () => sweep, () => (sweep = !sweep)));
  paint();

  // The scene
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a2350');
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  const post = createPost(renderer, scene, camera, { msaa: d.low || rec ? 0 : 4, bloomScale: 0.5, smaa: d.low && !rec });
  post.bloom.enabled = !rec;
  post.bloom.strength = 0.2;
  post.bloom.threshold = 1.05;
  post.ink.uniforms.fadeNear.value = 40;
  scene.add(new THREE.HemisphereLight('#d6e2ff', '#3a2f6a', 1.9));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(3, 6, 2);
  scene.add(key);
  // The floor: tiles a metre and a bit (one city tile) with every fifth darker, so speed reads
  const floorTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#7a72b8';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#5a5298';
    g.lineWidth = 3;
    for (let i = 0; i <= 5; i++) {
      g.beginPath();
      g.moveTo(i * 51.2, 0);
      g.lineTo(i * 51.2, 256);
      g.moveTo(0, i * 51.2);
      g.lineTo(256, i * 51.2);
      g.stroke();
    }
    g.strokeStyle = '#4a4290';
    g.lineWidth = 4;
    g.strokeRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(40, 40);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), toon('#ffffff', { map: floorTex }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  // The kerbs' slabs or the stairs' steps, from z -40 to 400 (the floor's own markings stay under them)
  const terrain = new THREE.Group();
  scene.add(terrain);
  const stone = toon('#a39ad8');
  function buildFloor() {
    for (const m of terrain.children) (m as THREE.Mesh).geometry.dispose();
    terrain.clear();
    const box = (z0: number, z1: number, h: number) => {
      // (across both figures' lanes, clear of the cameras)
      const m = new THREE.Mesh(new THREE.BoxGeometry(3, h, z1 - z0), stone);
      m.position.set(0.6, h / 2, (z0 + z1) / 2);
      terrain.add(m);
    };
    if (floorKind === 'kerbs') for (let z = -40; z < 400; z += KERB.every) box(z + KERB.from, z + KERB.from + KERB.long, KERB.slab);
    if (floorKind === 'stairs')
      for (let p = -3 * PERIOD; p < 400; p += PERIOD) {
        const z0 = p + FLIGHT.flat;
        for (let k = 0; k < FLIGHT.steps; k++) box(z0 + k * FLIGHT.tread, z0 + (k + 1) * FLIGHT.tread, (k + 1) * FLIGHT.rise);
        box(z0 + RUN_LEN, z0 + RUN_LEN + FLIGHT.landing, TOP);
        const z2 = z0 + RUN_LEN + FLIGHT.landing;
        for (let k = 0; k < FLIGHT.steps; k++) box(z2 + k * FLIGHT.tread, z2 + (k + 1) * FLIGHT.tread, (FLIGHT.steps - k) * FLIGHT.rise);
      }
    if (floorKind === 'ledge') {
      // (the ramp and the top as one side profile, across both lanes)
      const sh = new THREE.Shape();
      sh.moveTo(LEDGE.ramp, 0);
      sh.lineTo(LEDGE.ramp + LEDGE.up, LEDGE.top);
      sh.lineTo(LEDGE.ramp + LEDGE.up + LEDGE.flat, LEDGE.top);
      sh.lineTo(LEDGE.ramp + LEDGE.up + LEDGE.flat, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: false }).rotateY(-Math.PI / 2);
      for (let z = -3 * LEDGE.every; z < 400; z += LEDGE.every) terrain.add(new THREE.Mesh(g.clone().translate(2.1, 0, z), stone));
      g.dispose();
    }
  }
  buildFloor();

  const hero: Degen = createDegen(PLAYER);
  const old: Degen = createDegen(PLAYER);
  scene.add(hero.g, old.g);
  const loco = createLocomotion();

  // Armed: the gun in a pivot on his torso frame, posed by stance.ts on the procedural walk (as in the city)
  const armedLoco = createLocomotion();
  const pivot = new THREE.Group();
  hero.torso.add(pivot);
  const stance = newStance();
  let gun: ReturnType<typeof buildGun> | null = null;
  // (markers: the gun's butt, and his shooting shoulder's pocket)
  const marker = (c: string) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: c, depthTest: false }));
    m.renderOrder = 10;
    return m;
  };
  const buttDot = marker('#ffd400');
  const pocketDot = marker('#00eaff');
  pivot.add(buttDot);
  hero.torso.add(pocketDot);
  function mount() {
    if (gun) {
      pivot.remove(gun.group);
      gun.dispose();
      gun = null;
    }
    if (gunId !== 'none') {
      gun = buildGun(gunId, 'olive');
      pivot.add(gun.group);
    }
    pivot.visible = pocketDot.visible = !!gun;
  }
  mount();

  // Foot traces: a dot where each ball of the foot was held
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.035, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#00eaff' }), 80);
  dots.count = 0;
  dots.frustumCulled = false;
  scene.add(dots);
  let dotAt = 0;
  const m4 = new THREE.Matrix4();
  const addDot = (x: number, z: number) => {
    m4.makeTranslation(x, 0.006, z);
    dots.setMatrixAt(dotAt % 80, m4);
    dotAt++;
    dots.count = Math.min(80, dotAt);
    dots.instanceMatrix.needsUpdate = true;
  };

  read.innerHTML = '<dt>Loading</dt><dd>the motion capture…</dd>';
  const data = await loadMocap();
  const anim: Animator = createAnimator(data);
  const move: MoveState = newMove(0);
  let x = 0;
  let z = 0;
  let clock = 0;
  const wasLocked = [false, false];
  let worst = 0;
  let worstAt = 0;
  const jumpTimes: number[] = [];
  let lastJumps = 0;
  // Up and down (walk.ts's way): his and the old walk's beside him
  const body = () => ({ y: 0, vy: 0, fall: 0, grounded: true });
  const me = body();
  const them = body();
  let jumpHeld = false;
  let jumpPress = false;

  // By hand
  const keys = new Set<string>();
  let walkLock = false;
  const onKey = (e: KeyboardEvent) => {
    if (e.type === 'keydown') {
      if (e.code === 'KeyP') paused = !paused;
      else if (e.code === 'Period') (paused = true), (stepOnce = true);
      else if (e.code === 'CapsLock') walkLock = !walkLock;
      else if (e.code === 'Escape') close();
      else if (e.code === 'Space' && !e.repeat) {
        jumpPress = true;
        e.preventDefault();
      }
      keys.add(e.code);
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && prog !== 'manual') prog = 'manual';
      paint();
    } else keys.delete(e.code);
  };
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);

  // The free camera
  let orbit = { yaw: 0.9, pitch: 0.25, dist: 5 };
  let drag: { x: number; y: number; yaw: number; pitch: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, yaw: orbit.yaw, pitch: orbit.pitch };
    canvas.setPointerCapture(e.pointerId);
    if (cam !== 'free') (cam = 'free'), paint();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    orbit.yaw = drag.yaw - (e.clientX - drag.x) * 0.008;
    orbit.pitch = THREE.MathUtils.clamp(drag.pitch + (e.clientY - drag.y) * 0.006, -0.1, 1.3);
  });
  canvas.addEventListener('pointerup', () => (drag = null));
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      orbit.dist = THREE.MathUtils.clamp(orbit.dist * (1 + e.deltaY * 0.001), 1.5, 20);
    },
    { passive: false },
  );

  const size = () => {
    const w = innerWidth;
    const h = innerHeight;
    const pr = Math.min(devicePixelRatio, d.low ? 1.5 : 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    post.setSize(w, h, pr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', size);
  size();

  const ground = (_x: number, gz: number) => floorAt(floorKind, gz, false);
  const feet = (_x: number, gz: number) => floorAt(floorKind, gz, true);
  // (his height as walk.ts has it: gravity always, up a kerb eased, a jump pressed with Jump held or let go)
  let y = 0;
  let oy = 0;
  let lookPitch = 0;
  const fallTo = (b: ReturnType<typeof body>, g: number, dt: number, press: boolean, hold: boolean) => {
    if (press && b.grounded) {
      b.vy = JUMP;
      b.grounded = false;
    }
    b.vy -= (GRAVITY + (!hold && b.vy > 0 ? LET_GO : 0)) * dt;
    b.y += b.vy * dt;
    b.fall = b.vy;
    if (b.y <= g) {
      b.y = b.y < g - 0.05 ? b.y + (g - b.y) * (1 - Math.exp(-20 * dt)) : g;
      b.vy = 0;
      b.grounded = true;
    } else if (b.y > g + 0.04) b.grounded = false;
    return b.y;
  };
  const beside = (): [number, number] => (cam === 'side' ? [0, -2.2] : [1.6, 0]);
  const look = new THREE.Vector3();
  const step = (dt: number) => {
    clock += dt;
    const top = GAITS[gait];
    let [gx, gz] = program(prog, clock, top);
    if (prog === 'manual') {
      const ix = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
      const iz = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
      const n = Math.hypot(ix, iz) || 1;
      const s = keys.has('ShiftLeft') || keys.has('ShiftRight') ? GAITS.sprint : walkLock ? GAITS.walk : GAITS.run;
      gx = (ix / n) * s;
      gz = (iz / n) * s;
    }
    if (onFlight(floorKind, z)) {
      const g = Math.hypot(gx, gz);
      if (g > CLIMB) {
        gx *= CLIMB / g;
        gz *= CLIMB / g;
      }
    }
    stepMove(move, gx, gz, me.grounded, dt);
    x += move.vx * dt;
    z += move.vz * dt;
    const j = prog === 'manual' ? { press: jumpPress, hold: keys.has('Space') } : jumpOf(prog, clock, dt);
    jumpHeld = j.hold;
    y = fallTo(me, ground(x, z), dt, j.press, j.hold);
    const v = Math.hypot(move.vx, move.vz);
    const sprint = THREE.MathUtils.clamp((v - GAITS.run) / (GAITS.sprint - GAITS.run), 0, 1);
    anim.update({ dt, x, y, z, move, gx, gz, scale: SCALE, ground, feet, sprint, grounded: me.grounded, vy: me.grounded ? me.fall : me.vy, jump: JUMP, gravity: GRAVITY });
    if (gun) {
      // (the procedural walk under the gun's hold, as walk.ts has it while armed)
      armedLoco.update({ dt, t: clock, x, y, z, vx: move.vx, vz: move.vz, face: move.face, grounded: me.grounded, vy: me.grounded ? me.fall : me.vy, scale: SCALE, ground, armed: true });
      copyPose(armedLoco.pose, hero.pose);
      lookPitch = sweep ? 0.5 * Math.sin(clock * 0.9) : (fixedPitch ?? 0);
      holdGun(hero.pose, stance, pivot, gun, { aim: aimOn ? 1 : 0, ready: 1, pitch: lookPitch, recoil: 0, reload: 0, dt });
      const butt = FIT[gun.id].butt;
      buttDot.visible = !!butt;
      if (butt) buttDot.position.copy(butt);
      pocketDot.position.copy(POCKET);
      hero.update();
      placeRoot(hero.g, x, y, z, move.face, SCALE, armedLoco.root);
    } else {
      hero.update();
      applyTo(hero.rig, anim.rot, anim.hips);
      hero.g.position.set(x, y, z);
      hero.g.rotation.set(0, anim.face, 0);
      hero.g.scale.setScalar(SCALE);
    }
    // The old walk beside him, on the same movement (across the picture from him, whichever the camera)
    const [dx, dz] = beside();
    oy = fallTo(them, ground(x + dx, z + dz), dt, j.press, j.hold);
    jumpPress = false;
    loco.update({ dt, t: clock, x: x + dx, y: oy, z: z + dz, vx: move.vx, vz: move.vz, face: move.face, grounded: them.grounded, vy: them.grounded ? them.fall : them.vy, scale: SCALE, ground, armed: false });
    copyPose(loco.pose, old.pose);
    old.update();
    placeRoot(old.g, x + dx, oy, z + dz, move.face, SCALE, loco.root);
    old.g.visible = compare && !gun;
    // Traces and the slide
    anim.feet.forEach((f, i) => {
      if (f.locked && !wasLocked[i] && traces) addDot(f.lock.x, f.lock.z);
      wasLocked[i] = f.locked;
      if (f.drift > worst || clock - worstAt > 5) {
        worst = Math.max(0, f.drift);
        worstAt = clock;
      }
    });
    dots.visible = traces;
    const dbg = anim.debug;
    if (dbg.jumps !== lastJumps) {
      jumpTimes.push(clock);
      lastJumps = dbg.jumps;
    }
    while (jumpTimes.length && clock - jumpTimes[0] > 2) jumpTimes.shift();
  };

  /** What the camera looks at: between the two figures, and side on, on a wide screen, right of the panel (both clear of it) */
  const target = (out: THREE.Vector3) => {
    const [dx, dz] = compare ? beside() : [0, 0];
    const clear = cam === 'side' && innerWidth > 600 ? 1.3 / near : 0;
    return out.set(x + dx / 2, y + 0.62, z + dz / 2 + clear);
  };
  const want = new THREE.Vector3();
  // (the camera keeps exactly with them: eased after a runner, it trails and the picture slides off the figures)
  const view = () => {
    look.copy(target(want));
    if (cam === 'free') camera.position.set(look.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist, look.y + Math.sin(orbit.pitch) * orbit.dist, look.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist);
    else if (cam === 'side') camera.position.set(look.x + (compare ? 6 : 4.5) / near, look.y + 0.3, look.z);
    else if (cam === 'front') camera.position.set(look.x, look.y + 0.5, look.z + 5.5 / near);
    // (over his right shoulder, as walk mode's camera is when armed)
    else if (cam === 'over') camera.position.set(look.x - 0.9 / near, look.y + 0.45, look.z - 2.6 / near);
    else camera.position.set(look.x, look.y + 0.9, look.z - 5 / near);
    camera.lookAt(look);
  };

  const paintRead = () => {
    const dbg = anim.debug;
    const v = Math.hypot(move.vx, move.vz);
    const slideNow = Math.max(0, ...anim.feet.map((f) => f.drift));
    const rows: [string, string][] = [
      ...(compare ? ([['Beside', cam === 'back' ? 'new right · old left' : cam === 'free' ? 'the old walk is the other one' : 'new left · old right']] as [string, string][]) : []),
      ['Speed', `${v.toFixed(2)} tiles/s · ${(v * 1.8).toFixed(1)} m/s`],
      ['Clip', `${dbg.clip} @ ${dbg.frame.toFixed(1)}`],
      ['Rate', dbg.rate.toFixed(2)],
      ['Match cost', dbg.cost.toFixed(2)],
      ['Blend left', `${((dbg.blend * 180) / Math.PI).toFixed(0)}°`],
      ['Jumps', `${(jumpTimes.length / 2).toFixed(1)} a second`],
      ['Foot slide', `${(slideNow * CM).toFixed(1)} cm (worst lately ${(worst * CM).toFixed(1)} cm)`],
      ['Hips down', `${(dbg.drop * SCALE * CM).toFixed(1)} cm`],
      ...(gun ? ([['Gun', `${gunId}${aimOn ? ' · aiming' : ' · ready'} · looking ${lookPitch > 0 ? 'down' : 'up'} ${Math.abs((lookPitch * 180) / Math.PI).toFixed(0)}°`]] as [string, string][]) : []),
      ['Air', dbg.air ? `in the air${jumpHeld ? ' · Jump held' : ''}${dbg.arms > 0.01 ? ` · arms up ${((dbg.arms * 180) / Math.PI).toFixed(0)}°` : ''}` : `on the ground${dbg.squash > 0.002 ? ` · landing ${(dbg.squash * SCALE * CM).toFixed(0)} cm down` : ''}`],
      ['Feet', anim.feet.map((f) => (f.locked ? 'held' : 'free')).join(' · ')],
    ];
    read.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  };

  let raf = 0;
  let last = performance.now();
  let readIn = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const real = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused || stepOnce) {
      // Fixed steps, so slow motion is the same motion
      const dt = stepOnce ? 1 / 60 : real * speed;
      stepOnce = false;
      let left = dt;
      while (left > 1e-6) {
        const h = Math.min(left, 1 / 60);
        step(h);
        left -= h;
      }
    }
    view();
    post.render();
    readIn -= real;
    if (readIn <= 0) {
      readIn = 0.1;
      paintRead();
    }
  };
  const close = () => {
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey);
    removeEventListener('keyup', onKey);
    removeEventListener('resize', size);
    ui.remove();
    renderer.dispose();
    const u = new URL(location.href);
    u.searchParams.delete('anim');
    location.href = u.toString();
  };
  ui.querySelector('.anim-lab-close')!.addEventListener('click', close);
  // (for recordings and checks)
  (window as unknown as { __animLab: unknown }).__animLab = {
    anim,
    move,
    get worst() {
      return worst;
    },
    pause(on: boolean) {
      paused = on;
      paint();
    },
    steps(n: number) {
      for (let i = 0; i < n; i++) step(1 / 60);
      // (a skip ahead: the camera's there too)
      look.copy(target(want));
    },
    get where() {
      return { x, z, look: look.toArray(), eye: camera.position.toArray() };
    },
    /** Step on `n` frames and draw (recordings) */
    shoot(n: number) {
      for (let i = 0; i < n; i++) step(1 / 60);
      view();
      post.render();
      paintRead();
    },
  };
  if (rec) return;
  raf = requestAnimationFrame(frame);
}
