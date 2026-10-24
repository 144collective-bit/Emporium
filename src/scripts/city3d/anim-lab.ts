/*
 * The animation lab (`?anim` in the address; docs/animation-plan.md): Degen
 * on an open floor with the city's ink outlines, for reviewing his
 * movement. The new animation (animator.ts, from motion capture) and, to
 * compare, the old procedural one (locomotion.ts) side by side, both fed
 * the same movement (movesim.ts).
 *
 * - Moves: scripted programs (run and stop, turning back, weaving, a
 *   circle, starts and stops at a sprint, jumps running and standing,
 *   short hops, strafing the eight ways and aiming round, peeking...) or by
 *   hand (W A S D across the floor, Shift sprints, Caps Lock walks, Space
 *   jumps, Q / E peek, C crouches or slides), with walk.ts's jump and gravity.
 * - Time: full speed, a quarter, a tenth; P pauses, . steps a frame.
 * - Cameras: side on, front, behind, over his right shoulder (walk mode's, armed), free (drag to orbit, wheel to zoom).
 * - Foot traces (where each ball of the foot was held), and readouts:
 *   speed, the clip and frame playing, its rate, the match's cost, the
 *   blend left, jumps a second, the foot slide (how far a held foot has
 *   moved over the ground: now and the worst lately).
 * - Floors: flat, kerbs, stairs, a ledge to run off (up a ramp, a drop
 *   of 1.6 tiles), and walls to vault and climb over (a park wall's height
 *   and a dumpster's, Jump at them).
 * - Armed (animation Phases 4 and 8): any gun in his hands (stance.ts's
 *   hold on the procedural pose, over the motion capture's legs, as in the
 *   city), aiming or not, the look swept up and down; markers at the gun's
 *   butt and his shoulder pocket. Aiming by hand, he faces +z.
 * - The address can set it all up for recordings: `prog`, `gait`, `cam`,
 *   `floor`, `speed`, `gun`, `aim=0`, `pitch`, `outfit`, `held`, `orbit`,
 *   `compare=0`, `traces=0`.
 */
import * as THREE from 'three';
import { PLAYER, SOLDIER, createDegen, type Degen } from './character';
import { addCarry, addLean, applyTo, createAnimator, type Animator } from './animator';
import { copyPose, createLocomotion, placeRoot } from './locomotion';
import { loadMocap } from './mocap-load';
import { GAITS, newMove, startSlide, stepMove, stepSlide, type MoveState, type Slide } from './movesim';
import { slidePose } from './poses';
import { overAhead, overAt, overPose, type Over } from './vault';
import type { Box } from './solids';
import { toon } from './kit';
import { buildGun } from './guns';
import { FIT } from './gunfit';
import { POCKET, holdGun, newStance } from './stance';
import type { WeaponId } from './combat-sim';
import { createPost } from './post';

const SCALE = 0.85;
/** One tile in centimetres, for the readouts */
const CM = 180;
type Prog = 'manual' | 'runstop' | 'turnback' | 'weave' | 'circle' | 'startstop' | 'startback' | 'gaits' | 'idle' | 'jumps' | 'standjump' | 'hops' | 'strafe' | 'aimturn' | 'peek' | 'crouch' | 'slide' | 'over';
type Gait = 'walk' | 'run' | 'sprint';
type Cam = 'side' | 'front' | 'back' | 'over' | 'free';
type Floor = 'flat' | 'kerbs' | 'stairs' | 'ledge' | 'walls';
const FLOORS: Floor[] = ['flat', 'kerbs', 'stairs', 'ledge', 'walls'];

/* ---------- The floors: flat, kerbs, stairs (along +z, the same for both figures) ---------- */

/** Kerbs: a slab up every KERB.every tiles, KERB.long of them, at the city's heights (world.ts SLAB over the road) */
const KERB = { every: 10, from: 4, long: 5, road: 0.035, slab: 0.15 };
/** Stairs at Liberty Bridge's size (liberty.ts): 15 steps up, a landing, 15 down, flat between */
const FLIGHT = { steps: 15, rise: 0.23, tread: 0.31, flat: 4, landing: 3 };
const RUN_LEN = FLIGHT.steps * FLIGHT.tread;
const TOP = FLIGHT.steps * FLIGHT.rise;
const PERIOD = FLIGHT.flat * 2 + RUN_LEN * 2 + FLIGHT.landing;
const mod = (a: number, n: number) => ((a % n) + n) % n;
const wrapA = (a: number) => mod(a + Math.PI, Math.PI * 2) - Math.PI;
/** A ledge every LEDGE.every tiles: flat, a ramp up to `top`, a flat top, then a drop back down */
const LEDGE = { every: 16, ramp: 4, up: 6, flat: 2, top: 1.6 };
/** Walls to go over (vault.ts): every `every` tiles along +z, a low one (a park wall's height) and then a high one (a dumpster's) */
const WALLS = { every: 7, low: [0.55, 0.3], high: [1.0, 0.6] } as const;
const wallBoxes = (): Box[] => {
  const out: Box[] = [];
  for (let k = 0; k < 60; k++) {
    const [h, d] = k % 2 ? WALLS.high : WALLS.low;
    const z0 = 4 + k * WALLS.every;
    out.push([-0.9, z0, 2.1, z0 + d, h]);
  }
  return out;
};
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
/** walk.ts's speed while aiming, and the peek's lean */
const AIMING = 1.4;
const PEEK = { lean: 0.42, ease: 0.07, level: 0.85 };
/** walk.ts's crouched speed */
const CROUCHED = 0.55;
/** The programs that aim (+z, or round, for `aimturn`) while they move */
const AIMS: Prog[] = ['strafe', 'aimturn', 'peek'];
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
  ['strafe', 'Strafe 8 ways'],
  ['aimturn', 'Aim round'],
  ['peek', 'Peek'],
  ['crouch', 'Crouch'],
  ['slide', 'Sprint & slide'],
  ['over', 'Vault & climb'],
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
    // Aiming down +z: each of the eight ways in turn for 1.6 s, a stop between
    case 'strafe': {
      const k = Math.floor(t / 2) % 8;
      const a = (k * Math.PI) / 4;
      return t % 2 < 1.6 ? [Math.sin(a) * AIMING, Math.cos(a) * AIMING] : [0, 0];
    }
    case 'aimturn':
    case 'peek':
      return [0, 0];
    // Crouched: still, on, still, back, round again
    case 'crouch': {
      const u = cycle(9);
      return u < 1.5 ? [0, 0] : u < 4.5 ? [0, CROUCHED] : u < 5.5 ? [0, 0] : u < 8 ? [0, -CROUCHED] : [0, 0];
    }
    // A sprint, a slide at two seconds (slideOf), down in a crouch, up again
    case 'slide':
      return cycle(5) < 2.2 ? [0, GAITS.sprint] : [0, 0];
    // On at a run over the walls (the walls floor)
    case 'over':
      return [0, GAITS.run];
    default:
      return [0, 0];
  }
}
/** Whether a program presses Jump at `t` (once a cycle), and holds it: a full jump, or a short hop let go at once */
/** Where a program aims (radians about up; 0 down +z), when it does */
function aimOf(p: Prog, t: number) {
  if (p === 'aimturn') return Math.floor(t / 2.5) % 2 ? -1.6 * Math.sin(t * 0.4) : Math.round(Math.sin(t * 0.7)) * 1.4;
  return 0;
}
/** How far a program peeks (-1 his left, 1 his right): right, back, left, back */
function peekOf(p: Prog, t: number) {
  if (p !== 'peek') return 0;
  const u = t % 6;
  return u < 0.5 ? 0 : u < 2 ? 1 : u < 3 ? 0 : u < 4.5 ? -1 : 0;
}
/** Whether a program is crouched at `t`, and when it presses Crouch to slide */
function crouchOf(p: Prog, t: number) {
  if (p === 'crouch') return true;
  return p === 'slide' && t % 5 > 2 && t % 5 < 4.4;
}
const slideOf = (p: Prog, t: number, dt: number) => p === 'slide' && t % 5 >= 2 && (t - dt) % 5 < 2;
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
      <div class="anim-lab-head"><span class="anim-lab-title">Animation lab</span><span class="anim-lab-note">?anim · Phases 1-5, 8</span><button class="anim-lab-close" type="button" aria-label="Close the lab">×</button></div>
      <div class="anim-lab-row" data-progs></div>
      <div class="anim-lab-row" data-gaits></div>
      <div class="anim-lab-row" data-time></div>
      <div class="anim-lab-row" data-cams></div>
      <div class="anim-lab-row" data-floors></div>
      <div class="anim-lab-row" data-guns></div>
      <div class="anim-lab-row" data-toggles></div>
      <dl class="anim-lab-read" data-read></dl>
      <p class="anim-lab-hint">By hand: W A S D, Shift sprints, Caps Lock walks, Space jumps, Q / E peek, C crouches (slides sprinting; armed and aiming, he faces +z). P pauses, . steps.</p>
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
  let floorKind: Floor = FLOORS.find((f) => f === q.get('floor')) ?? (prog === 'over' ? 'walls' : 'flat');
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
        // (the walls to go over are a floor of their own)
        if (p === 'over' && floorKind !== 'walls') (floorKind = 'walls'), buildFloor();
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
    if (floorKind === 'walls') for (const b of wallBoxes()) box(b[1], b[3], b[4]);
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

  // (`outfit=hoodie|track|varsity|puffer|soldier` in the address: the player's look in another kind of top)
  // (`held=coffee|boombox|phone|briefcase`: something in his right hand)
  const kind = (['suit', 'hoodie', 'track', 'varsity', 'puffer', 'soldier'] as const).find((k) => k === q.get('outfit'));
  const held = (['coffee', 'boombox', 'phone', 'briefcase'] as const).find((h) => h === q.get('held'));
  const outfit = { ...(kind === 'soldier' ? SOLDIER : kind ? { ...PLAYER, kind } : PLAYER), held };
  const hero: Degen = createDegen(outfit);
  const old: Degen = createDegen(outfit);
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
  let peek = 0;
  // Crouched (by the program, or C by hand) and the slide (C sprinting)
  let crouched = false;
  let crouchAmt = 0;
  let slide: Slide | null = null;
  let slideAmt = 0;
  let crouchPress = false;
  // Going over a wall (Jump at it; by itself in the Vault & climb program)
  let over: { o: Over; t: number } | null = null;
  let overLast: Over | null = null;
  let overAmt = 0;
  const walls = wallBoxes();

  // By hand
  const keys = new Set<string>();
  let walkLock = false;
  const onKey = (e: KeyboardEvent) => {
    if (e.type === 'keydown') {
      if (e.code === 'KeyP') paused = !paused;
      else if (e.code === 'Period') (paused = true), (stepOnce = true);
      else if (e.code === 'CapsLock') walkLock = !walkLock;
      else if (e.code === 'KeyC' && !e.repeat) crouchPress = true;
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
  // (`orbit=yaw,pitch,dist` in the address: the free camera's start)
  const o0 = (q.get('orbit') ?? '').split(',').map(Number);
  const [yaw0, pitch0, dist0] = o0.length === 3 && o0.every(Number.isFinite) ? o0 : [0.9, 0.25, 5];
  let orbit = { yaw: yaw0, pitch: pitch0, dist: dist0 };
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
      const s = keys.has('ShiftLeft') || keys.has('ShiftRight') ? GAITS.sprint : crouched ? CROUCHED : walkLock ? GAITS.walk : GAITS.run;
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
    // (aiming: facing where the program aims, or +z by hand with a gun up)
    const faceGoal = AIMS.includes(prog) ? aimOf(prog, clock) : prog === 'manual' && gun && aimOn ? 0 : undefined;
    // Crouch and slide (walk.ts's way: C sprinting slides, else crouches or stands)
    if (prog === 'manual') {
      if (crouchPress && !slide) {
        const sl = me.grounded ? startSlide(move) : null;
        if (sl) slide = sl;
        else crouched = !crouched;
      }
      if (crouched && (keys.has('ShiftLeft') || keys.has('ShiftRight'))) crouched = false;
    } else {
      if (slideOf(prog, clock, dt) && !slide) slide = startSlide(move);
      if (!slide) crouched = crouchOf(prog, clock);
    }
    crouchPress = false;
    // Over a wall: Jump at one by hand, or by itself when the program comes up to it
    if (!over && floorKind === 'walls' && me.grounded && Math.hypot(gx, gz) > 0.1 && (prog === 'over' || (prog === 'manual' && jumpPress))) {
      const o = overAhead(x, z, Math.atan2(gx, gz), ground(x, z), walls, 0.22, () => true);
      if (o && (prog === 'manual' || o.near < 0.45)) {
        over = { o, t: 0 };
        jumpPress = false;
      }
    }
    if (over) {
      over.t += dt;
      const u = Math.min(1, over.t / over.o.dur);
      const at = overAt(over.o, u, 0, 0);
      move.vx = (at.x - x) / dt;
      move.vz = (at.z - z) / dt;
      move.ax = move.az = move.w = 0;
      move.face = over.o.dir;
      if (u >= 1) {
        move.vx = Math.sin(over.o.dir) * Math.min(Math.hypot(gx, gz), GAITS.run);
        move.vz = Math.cos(over.o.dir) * Math.min(Math.hypot(gx, gz), GAITS.run);
        overLast = over.o;
        over = null;
      }
    } else if (slide) {
      if (!stepSlide(slide, move, gx, gz, dt)) {
        slide = null;
        crouched = Math.hypot(gx, gz) < 0.01;
      }
    } else stepMove(move, gx, gz, me.grounded, dt, faceGoal);
    crouchAmt += ((crouched ? 1 : 0) - crouchAmt) * (1 - Math.exp(-10 * dt));
    slideAmt += ((slide ? 1 : 0) - slideAmt) * (1 - Math.exp(-(slide ? 18 : 9) * dt));
    x += move.vx * dt;
    z += move.vz * dt;
    const j = prog === 'manual' ? { press: jumpPress, hold: keys.has('Space') } : jumpOf(prog, clock, dt);
    jumpHeld = j.hold;
    if (over) {
      const at = overAt(over.o, Math.min(1, over.t / over.o.dur), 0, 0);
      x = at.x;
      z = at.z;
      y = me.y = at.y;
      me.vy = 0;
      me.grounded = at.y < 0.01;
    } else y = fallTo(me, ground(x, z), dt, j.press, j.hold);
    overAmt += ((over ? 1 : 0) - overAmt) * (1 - Math.exp(-(over ? 30 : 8) * dt));
    const v = Math.hypot(move.vx, move.vz);
    const sprint = THREE.MathUtils.clamp((v - GAITS.run) / (GAITS.sprint - GAITS.run), 0, 1);
    anim.update({ dt, x, y, z, move, gx, gz, scale: SCALE, ground, feet, sprint, grounded: me.grounded, vy: me.grounded ? me.fall : me.vy, jump: JUMP, gravity: GRAVITY, faceGoal, crouch: crouchAmt });
    if (gun) {
      // (the gun's hold over the motion capture's legs, as walk.ts has it: the procedural walk under the hold
      // gives the upper body, turned back from the way the capture faces him to the springs')
      armedLoco.update({ dt, t: clock, x, y, z, vx: move.vx, vz: move.vz, face: move.face, grounded: me.grounded, vy: me.grounded ? me.fall : me.vy, scale: SCALE, ground, armed: true });
      copyPose(armedLoco.pose, hero.pose);
      lookPitch = sweep ? 0.5 * Math.sin(clock * 0.9) : (fixedPitch ?? 0);
      holdGun(hero.pose, stance, pivot, gun, { aim: aimOn ? 1 : 0, ready: 1, pitch: lookPitch, recoil: 0, reload: 0, dt });
      const butt = FIT[gun.id].butt;
      buttDot.visible = !!butt;
      if (butt) buttDot.position.copy(butt);
      pocketDot.position.copy(POCKET);
      hero.update();
      applyTo(hero.rig, anim.rot, anim.hips, 1, 1, wrapA(move.face - anim.face));
    } else {
      // (the slide is a keyed pose over the last of the procedural walk, the motion capture stepping aside for it)
      copyPose(loco.pose, hero.pose);
      slidePose(hero.pose, slideAmt);
      const ov = over?.o ?? overLast;
      if (ov && overAmt > 0.01) overPose(hero.pose, ov, over ? Math.min(1, over.t / over.o.dur) : 1, overAmt, x, y, z, anim.face, SCALE);
      hero.update();
      applyTo(hero.rig, anim.rot, anim.hips, 1 - Math.max(slideAmt, overAmt));
      if (hero.held?.visible) addCarry(hero.rig, 1 - Math.max(slideAmt, overAmt));
    }
    hero.g.position.set(x, y, z);
    hero.g.rotation.set(0, anim.face, 0);
    hero.g.scale.setScalar(SCALE);
    // The peek: by the program, or Q / E by hand
    const peekWant = prog === 'manual' ? (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0) : peekOf(prog, clock);
    peek += (peekWant - peek) * (1 - Math.exp((-Math.LN2 * dt) / PEEK.ease));
    addLean(hero.rig, peek * PEEK.lean, wrapA(move.face - anim.face), PEEK.level * (1 - (gun && aimOn ? 0.6 * stance.cheek : 0)));
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
      ...(crouchAmt > 0.02 || slideAmt > 0.02 ? ([['Crouch', `${slide ? `sliding at ${slide.v.toFixed(1)} tiles/s` : crouched ? 'crouched' : 'standing up'}${dbg.crouch > 0.02 ? ` · over the clip ${(dbg.crouch * 100).toFixed(0)}%` : ''}`]] as [string, string][]) : []),
      ...(AIMS.includes(prog) || peek ? ([['Aim', `legs ${((wrapA(anim.face - move.face) * 180) / Math.PI).toFixed(0)}° off the aim${Math.abs(peek) > 0.02 ? ` · peeking ${peek > 0 ? 'right' : 'left'} ${(Math.abs(peek) * 100).toFixed(0)}%` : ''}`]] as [string, string][]) : []),
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
