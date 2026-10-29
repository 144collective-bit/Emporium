/*
 * Walk mode: play as Degen.
 *
 * - Look: mouse (pointer lock after a click), drag, touch or a gamepad's
 *   right stick. You can look up at the towers and sky as well as down.
 * - Move: WASD / arrows / joystick / left stick, on springs (movesim.ts:
 *   speeding up, slowing down and turning with real weight), a run by
 *   default, a sprint (hold Shift; the touch Sprint button locks it), a walk
 *   (Caps Lock toggles it) and a jump with coyote time, buffering and
 *   variable height.
 * - His body on foot is motion capture (animator.ts, docs/animation-plan.md)
 *   once its clips have loaded, jumps and landings too; with a gun in his
 *   hands or aiming only its legs and hips, under his own upper body (the
 *   gun's hold); emoting and in a hard landing's roll it's the procedural
 *   walk (locomotion.ts), blended across. Q / E held peek round a corner.
 * - F does what the prompt says (doors, counters, getting in and out).
 * - Camera: first person when you start walking (with Degen's hands on the
 *   rifle once he's geared up). V, or scrolling out, swaps to over the
 *   shoulder, pulled in when a building or the ground is in the way. Wider
 *   field of view when running; hold the right mouse button to aim.
 * - A solid world, kerbs, door prompts that open a building's panel.
 * - The garage office door opens the garage menu: the camera swings round to
 *   the showroom turntable while you pick your car.
 * - Get in your car (at the turntable, or wherever you left it) and drive
 *   (drive.ts); get out anywhere.
 * - The kart hut's door opens the kart park's menu (kart-ui.ts) and the
 *   trainer's counter the Fight Club's (fight-ui.ts).
 * - The hangar office's door at the airport opens the hangar menu (the
 *   camera looks into the hangar while you pick); get in your aircraft and
 *   fly (fly.ts), land anywhere and get out.
 */
import { SUN_DOORS } from './sunplaces';
import * as THREE from 'three';
import type { SpotId } from '../../lib/city';
import { HOLDING, PLAYER, RELAXED, createDegen, type Outfit } from './character';
import { LAND_CROUCH, LAND_ROLL, copyPose, createLocomotion, placeRoot, type Root } from './locomotion';
import type { Animator } from './animator';
import type { Contact } from './contact';
import { loadMocap } from './mocap-load';
import { createFollow } from './follow';
import type { Interest } from './gaze';
import { GAITS, STAIRS, climbAhead, newMove, startSlide, stepMove, stepSlide, type Slide } from './movesim';
import { slidePose } from './poses';
import type { Over } from './vault';
import { springVel } from './inertia';
import type { MoData } from './mocap';
import { createCombat, type Sfx } from './combat';
import type { Hotbar } from './inventory-ui';
import type { Held } from '../net/profile-data';
import type { GunShop } from './gunshop';
import { ARMS, AVENUE_DOORS } from './avenue';
import { DECK_Y, onDeck } from './waterfront';
import { onEsplanade } from './boulevard';
import { carStatsOf, kartStatsOf, ownsCar, takedown } from './tycoon';
import type { GarageUI } from './garage-ui';
import { loadCar } from './mycar';
import { DEFAULT_CAR } from './mycar';
import { BIKES, DEFAULT_BIKE, loadBike } from './mybike';
import type { Garage } from './garage';
import { createDrive } from './drive';
import { createFly } from './fly';
import type { HangarUI } from './hangar-ui';
import { loadPlane } from './myplane';
import { DECK_CAMERA, HANGAR_DOOR, HANGAR_SPOT, departuresWall, departuresY, type AircraftKind, type Pose } from './airfield';
import { HUT_DOOR, circuitSurfaceAt as trackSurfaceAt } from './kartcircuit';
import { KART_PARK } from './kartpark';
import { bankY } from './kartfacility';
import type { RaceStart } from './kart-types';
import type { Cond } from './kartcircuit';
import { COUNTER, TRAINER } from './fightsite';
import { MOMENT, type Mark, type Moment, type Vehicle, alightMark, benchMark, bikeMark, boardMark, carMark, counterMark, crateMark, createMoment, doorMark, liftMark } from './moments';
import { INTERIORS } from './carinside';
import { CARS } from './cars';
import { toon } from './kit';
import { BENCHES } from './pedestrians';
import type { Fight, FightClub, FightInput, FightUI } from './fight-types';
import type { KartPark, KartRace, KartUI } from './kart-types';
import { CUPS } from './kart-cups';
import type { KartInput } from './kart-sim';
import { abandonSeries, seriesNext } from './tycoon';
import { CAMERA_GRID, DOORS, GARAGE_SITE, RACK, SOLIDS, SOLID_GRID, SOLID_GRIDS, TURNTABLE_BOX, WALK_SPAWN, addSolids, rayBoxes, type Box } from './solids';
import { BoxGrid } from './boxgrid';
import { count } from './tycoon';
import { SLAB, type Tick } from './world';
import { BX as LIBERTY_X, FACES, LIBERTY_CAMERA, LOW_Y, TO_MIDDLE, footbridgeWall, footbridgeY, leavesAt, onLeaves } from './liberty';
import { JETTY, RIM, inLake, onJetty, onTerrace, terraceY } from './westlake';
import { GATE, bridgeWall, bridgeY } from './stadium';
import { skyDeckWall, skyDeckY, upOnDeck } from './skydeck';
import { MALL_CAMERA, mallFloor, mallWall } from './mallinside';
import { WORLD_BOUNDS, design } from './layout';
import { WATER_Y, inChannel, inWater, shoreY } from './river';
import { inBasin } from './docks';
import { HARBOUR_MASTER } from './docksport';
import { heightAt, hillsAlong, onHills } from './terrain';
import { HIRE } from './riverbus';
import type { Boat } from './boat';
import { harbourY, onHarbour } from './harbour';
import { PLAN, inPoly, type Pt } from './streetplan';
import { SPOTS, pointOn, ROUTES } from './routes';
import { bodies, swing } from './life';
import type { Partners, StreetFists } from './brawl';
import type { PartnerId } from './fight-moves';
import type { FightStart } from './fight-types';
import type { GameDeps } from './ui';
import { vehFace, type Mode, type Vehicle as NetVehicle } from '../net/protocol';
import { live } from './live-client';
import type { FeatureId } from './live';

/** What a prompt can open: a landmark's door, or one of walk mode's own places and vehicles */
type Near = SpotId | 'gear' | 'garage' | 'hangar' | 'car' | 'plane' | 'boat' | 'karts' | 'trainer' | 'bench' | 'stand' | 'put' | `place:${string}` | `spar:${PartnerId}`;
/** The prompts the owner can close (live settings, live.ts) and the feature that closes each */
const GATED: Partial<Record<Near, FeatureId>> = { gear: 'guns', garage: 'drive', hangar: 'fly', karts: 'karts', trainer: 'fight', boat: 'boat' };
/** Prompts that say their own label (the rest say "Enter ...") */
/** The landmarks' doors and Trench Avenue's (their prompts open their panels) */
const ALL_DOORS = [...DOORS, ...AVENUE_DOORS, { id: 'stadium' as const, ...GATE.spot }, { id: 'harbourmaster' as const, ...HARBOUR_MASTER.door }, ...SUN_DOORS];
const OWN_LABEL = new Set<string>(['gear', 'garage', 'hangar', 'car', 'plane', 'boat', 'karts', 'trainer', 'bench', 'stand', 'put']);
/** The Armoury's counter top (its drawing grid: the counter's box, a little in from its front edge) and height over the slab */
const RACK_TOP = (([x, z]) => ({ x, z }))(design(24.7, 27.4));
const RACK_TOP_H = 0.6;
/** The trainer's counter top (its near edge, a little in) and height */
const TRAINER_TOP = { x: TRAINER.x, z: COUNTER.z1 - 0.1 };
const TRAINER_TOP_H = 0.56;
/** The hangar menu's shot: from the doors, looking in at your aircraft */
const HANGAR_VIEW = { eye: new THREE.Vector3(HANGAR_SPOT.x - 6.5, 3.4, HANGAR_SPOT.z + 12.5), at: new THREE.Vector3(HANGAR_SPOT.x, 1.2, HANGAR_SPOT.z) };

/** Facing the Emporium's doors, the tower over his shoulder */
const SPAWN_YAW = WALK_SPAWN.yaw;
const RADIUS = 0.22;
/** His speeds (movesim.ts): a walk (Caps Lock), the run he goes at, the sprint (Shift), and walking while he aims */
const { walk: WALK, run: RUN, sprint: SPRINT } = GAITS;
const AIMING = 1.4;
/** Carrying a crate: how near its destination (the car's boot, the place) counts as there */
const PUT_R = 1.8;
/**
 * Crouched (animation Phase 5: C toggles, B on a gamepad, the touch Crouch
 * button; crouching while sprinting slides): how fast he goes, and how far
 * the camera comes down crouched and sliding (tiles at his scale)
 */
const CROUCH = { speed: 0.55, cam: 0.26, slideCam: 0.42 };
/**
 * Peeking (Q / E held; LB / RB while aiming on a gamepad; on touch, aiming
 * by a corner): how far the upper body leans out over the hips (radians),
 * how far the camera goes out with it over the shoulder (tiles; `eye` in
 * first person, and its roll), how much slower he goes leaning right out,
 * the half-life it comes and goes with, and the head's levelling
 */
const PEEK = { lean: 0.42, cam: 0.45, eye: 0.3, roll: 0.08, slow: 0.55, ease: 0.07, level: 0.85 };
/**
 * Peeking by a corner on touch (aiming): the view straight ahead blocked
 * within `near` (tiles), and clear for `far` from `side` out to one side;
 * looked at `every` seconds
 */
const CORNER = { near: 1.4, far: 3.5, side: 0.55, every: 0.2 };
const JUMP = 3.9;
const GRAVITY = 11.5;
/** How long a hard landing shakes the camera */
const LAND_SHAKE = 0.3;
/** How much of the hips' rise and fall the first-person eye takes (the head steadies some of it) */
const FP_BOB = 0.7;
/**
 * A menu whose module loads the first time it's opened (the gun store, the garage's, the hangar's and the
 * trainer's: none in the boot): until then it's shut (`open` false, its other calls do nothing) and a call in `opens` loads it and then
 * opens it. The menus are closures over object literals, so a method called on the stand-in is the real one's.
 */
function lazyMenu<T extends object>(opens: (keyof T & string)[], load: () => Promise<T>): T & { loaded(): Promise<T> } {
  let real: T | null = null;
  let loading: Promise<T> | null = null;
  const get = () => (loading ??= load().then((m) => (real = m)));
  return new Proxy({} as T & { loaded(): Promise<T> }, {
    get(_, k) {
      // (fetch it without opening it: a street spar wants the fight's HUD with no menu first)
      if (k === 'loaded') return get;
      if (real) return (real as Record<PropertyKey, unknown>)[k];
      if (k === 'open') return false;
      if (typeof k === 'string' && opens.includes(k as keyof T & string)) return (...a: unknown[]) => void get().then((m) => (m as Record<string, (...x: unknown[]) => void>)[k](...a));
      return () => {};
    },
  });
}

/** The gaze before its module is in: straight ahead */
const STILL_GAZE = { yaw: 0, pitch: 0 };
const SCALE = 0.85;
/** Getting into your car: how far through the reach to the handle the door starts to open (of the clip up to the car taking him) */
const HAND_ON = 0.35;
/** The quick swap's fade out (ms), as fast travel's */
const QUICK_FADE = 260;
/** How far you can go: the world's edge */
const BOUNDS = WORLD_BOUNDS;
/** Downtown's blocks, the districts and the extra lots (garage, market...) with their sidewalks: the raised ground (with bounding boxes for a quick test first) */
const slabOf = (poly: Pt[]) => ({ poly, box: [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1])), 0] as Box });
const slabs = PLAN.slabs.map(slabOf);
/** More raised blocks to walk on (a district laid by a recipe: growth plan Phase 4) */
export function addSlabs(polys: Pt[][]) {
  slabs.push(...polys.map(slabOf));
}
/** The garage's turntable in a grid's copy (the grids hold their own copies of the boxes: matched by numbers) */
const isTurntable = (b: Box) => b[0] === TURNTABLE_BOX[0] && b[1] === TURNTABLE_BOX[1] && b[2] === TURNTABLE_BOX[2] && b[3] === TURNTABLE_BOX[3];
/** The turntable's disc: stood on while getting into your car at home, its top over the forecourt */
const DISC = { ...GARAGE_SITE.turntable, top: 0.07 };
/** What your own car bumps into: everything solid but the turntable it starts on */
const CAR_SOLIDS = SOLIDS.filter((b) => b !== TURNTABLE_BOX);
/** What a car or an aircraft bumps into, in the collision grid (boxgrid.ts) */
const CAR_GRID = new BoxGrid(CAR_SOLIDS);
// (solids added later, a district's, join it too)
SOLID_GRIDS.push(CAR_GRID);
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

/** A ride (taxi.ts, the metro): each frame it moves on and says where Degen is (in it); `end` when walk mode stops mid-ride */
export interface Ride {
  update(dt: number, t: number): { x: number; z: number; y?: number };
  end(): void;
}

export interface WalkDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  root: HTMLElement;
  /** Footprints and heights of what's built on your units and big lots */
  placedSolids(): Box[];
  /** Open a landmark's panel in place */
  openSpot(id: SpotId): void;
  /** Called on any input, so the frame cap knows we're busy */
  touched(): void;
  tick(f: Tick): void;
  sfx(kind: Sfx, gain?: number): void;
  /** The garage on the south bank (its turntable shows the car being picked) */
  garage: Garage;
  /** Your car's engine sound: revs 0..1, or negative for off */
  engine(revs: number, whine?: boolean): void;
  /** Your car's tyres sliding, 0..1 (sound.ts) */
  tyres(level: number): void;
  /** Your business's places on foot (your stall, your units): where to stand, and the prompt's label */
  places(): { id: string; x: number; z: number; label: string }[];
  /** Open one of them (tycoon-ui.ts) */
  openPlace(id: string): void;
  /** Put a thing in Degen's hand from the inventory (the look's `held`: profile-ui.ts wears it, the save follows) */
  hold(held: Held): void;
  /** The economy, for the shops in walk mode (buying, mods) */
  game: GameDeps;
  /** The kart park in the north-east (its hut door opens the kart menu; races run on its track) */
  kartPark: KartPark;
  /** A kart race's conditions on the sky; null puts the visitor's own back */
  raceConditions(cond: Cond | null): void;
  /** The airport's own aircraft, where they are now (yours bumps softly off them) */
  airTraffic(): { kind: AircraftKind; pose: Pose }[];
  /** Your aircraft's engine: its voice and revs 0..1, negative for off */
  aero(kind: 'prop' | 'jet' | 'heli', revs: number): void;
  /** The Fight Club on the south bank (the trainer's counter opens its menu; fights run in its ring) */
  fightClub: FightClub;
  reduced: boolean;
  low: boolean;
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
  /**
   * Carrying (moments.ts, the revamp's Phase 4 step 2): a crate of goods picked up at one of your places and
   * carried to your car's boot (or the other way), for the business card's Load / Unload; `done` moves the goods
   * once it's set down where it's going
   */
  let carrying: { dir: 'load' | 'unload'; to: { x: number; z: number }; stage: 'pick' | 'carry' | 'put'; done: () => void } | null = null;
  /** The crate is in his hands (between the pick's lift and the put's set-down) */
  let crateUp = false;
  let carryAmt = 0;
  const crate = new THREE.Mesh(new THREE.BoxGeometry(MOMENT.crate.w, MOMENT.crate.h, MOMENT.crate.d), toon('#b9874a'));
  crate.visible = false;
  d.scene.add(crate);
  /** The crate put away (walk mode ending, a ride, a vehicle): nothing moved */
  const dropCrate = () => {
    carrying = null;
    crateUp = false;
    crate.visible = false;
  };
  /** His feet and body on the move (locomotion.ts): planted feet, gaits, landings, the idle */
  const loco = createLocomotion();
  /** ...and the motion capture over it on foot (animator.ts), once its clips are in; how much of it shows */
  let animator: Animator | null = null;
  /** ...its code (its own chunk, fetched with the clips the first time he walks) */
  let anim: typeof import('./animator') | null = null;
  /** The emotes, the gaze and the vault (onfoot.ts), loaded with the animator: until then none of them plays */
  let onFoot: typeof import('./onfoot') | null = null;
  /** ...and the clips it plays (other players' animators play the same: `motion`) */
  let mocapData: MoData | null = null;
  let animLoading = false;
  let mocapW = 0;
  /** The capture's hips' height, slowly followed: the first-person eye rides what's left (its steps and landings) */
  let hipMean = 0;
  /** The head's follow-through in turns (follow.ts) */
  const headFollow = createFollow();
  /** How much of his upper body is his own pose over the motion capture's legs (the gun's hold, an arm out aiming) */
  let upperW = 0;
  /**
   * Contact (contact.ts, the revamp's Phase 3): what his body does about what he touches (a hand on a wall, the
   * shoulder's give brushing past, a stagger into one at a sprint, a squeeze, a lean on a rail), a layer on the
   * motion capture's pose; its code comes with the animator's. Phones leave out the hands and the lean.
   */
  let contactMod: typeof import('./contact') | null = null;
  let contact: Contact | null = null;
  let contactRot: Float32Array | null = null;
  const contactBoxes: Box[] = [];
  const contactPeople: { x: number; z: number }[] = [];
  /** This frame his move was stopped by something, and how fast he was going into it */
  let hitWall = false;
  let hitSpeed = 0;
  let staggering = false;
  /** The peek: how far he's leaning (-1 his left to 1 his right), eased; the gamepad's lean, the touch corner's, and when it was looked for */
  let peek = 0;
  let padLean = 0;
  let cornerLean = 0;
  let cornerIn = 0;
  /** Crouched, and how far into it (eased); the slide under way, and how much of its pose shows */
  let crouched = false;
  let crouchAmt = 0;
  let slide: Slide | null = null;
  let slideAmt = 0;
  /** Going over something low (Jump at it, vault.ts): how far into it, the ground at the start and the landing, how fast he came at it; how much of its pose shows, and the last one (to blend out of) */
  let over: { o: Over; t: number; g0: number; g1: number; v: number } | null = null;
  let overAmt = 0;
  let overLast: Over | null = null;
  /** Seconds the procedural landing (a crouch or a roll) still has, before the motion capture takes him back */
  let landHold = 0;
  const lastPos = new THREE.Vector3();
  /** His movement springs (movesim.ts) */
  const ms = newMove();
  /** The root's lean and roll as the procedural walk has them, less as the motion capture takes over */
  const root0: Root = { roll: 0, pitch: 0, pivot: 0 };
  /** The camera's dip on a hard stop, and how fast it's moving */
  let dip = 0;
  let dipV = 0;
  // A hard landing's shake (seconds left of it, and how hard)
  let shakeT = 0;
  let shakeK = 0;
  /** Seconds since the camera last turned (a while standing still, he looks round by himself) */
  let camStill = 0;
  let lookAround = 0;
  let gazePitch = 0;
  // The gaze (gaze.ts): what his head is drawn to, on top of the pose
  let gaze: ReturnType<typeof import('./gaze').createGaze> | null = null;
  const interests: Interest[] = [];
  let lastYaw = 0;
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
  const crouchBtn = $<HTMLButtonElement>('[data-walk-crouch]');
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
  let face = 0;
  /** Where the others are told he is, in a vehicle (its height, an aircraft's in the air) */
  const netPos = new THREE.Vector3();
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
  /** The touch Sprint button's lock, and Caps Lock's walk */
  let sprintLock = false;
  let walkLock = false;
  let baseFov = camera.fov;
  let fov = 52;
  const pivot = new THREE.Vector3();
  const keys = new Set<string>();
  const joy = { x: 0, y: 0, id: -1 };
  const pad = { x: 0, y: 0, run: false, prev: [] as boolean[] };
  let near: { id: Near; label: string } | null = null;
  /** The getting-in moment whose door has been swung open (once each) */
  let swungFor: Mark | null = null;
  /**
   * The game's moments (moments.ts, the revamp's Phase 4): a door's push, a lean on a counter, a sit on a bench,
   * played between the prompt's press and what it opens; walk.ts walks him onto the mark, then its keyed pose
   * takes over from the motion capture (`momentAmt`), the root shifted onto a seat (`momentDy`)
   */
  const moments: Moment = createMoment();
  moments.scale = SCALE;
  let momentAmt = 0;
  let momentDy = 0;
  /** Sitting down, where the camera goes: a three-quarter view from whichever side of him has the room */
  let benchYaw = 0;
  const benchEye = new THREE.Vector3();
  const benchDir = new THREE.Vector3();
  function pickBenchYaw(mk: { face: number; y: number; seat?: { x: number; z: number } }) {
    if (!mk.seat) return;
    let best = -1;
    for (const side of [1, -1]) {
      const y = mk.face + Math.PI + side;
      benchEye.set(mk.seat.x, mk.y + 0.7, mk.seat.z);
      benchDir.set(Math.sin(y) * Math.cos(0.35), Math.sin(0.35), Math.cos(y) * Math.cos(0.35));
      const room = cameraRoom(benchEye, benchDir, zoom, 0.35, 0.9);
      if (room > best) (best = room), (benchYaw = y);
    }
  }
  /** What a prompt is a moment at: its mark, null to open at once, or 'quick' for the swap with a fade (your car's side blocked) */
  const markFor = (n: { id: Near; label: string }): Mark | null | 'quick' => {
    const y = groundAt(pos.x, pos.z, pos.y);
    const door = (at: { x: number; z: number }) => doorMark(at, pos.x, pos.z, y, (bx, bz) => blocked(bx, bz, pos.y));
    if (n.id === 'gear') return n.label === ARMS.name ? counterMark({ x: ARMS.counter.x, z: ARMS.street }, y + ARMS.hatch.y, y, pos.x, pos.z) : counterMark(RACK_TOP, y + RACK_TOP_H, y, pos.x, pos.z);
    if (n.id === 'trainer') return counterMark(TRAINER_TOP, y + TRAINER_TOP_H, y, pos.x, pos.z);
    // (a sparring partner: the spar starts at once)
    if (n.id.startsWith('spar:')) return null;
    if (n.id === 'garage') return door(GARAGE_SITE.door);
    if (n.id === 'hangar') return door(HANGAR_DOOR);
    if (n.id === 'karts') return door(HUT_DOOR);
    // Getting in (step 2): the car's or the kart's side nearest him, the aircraft's door, the hire boat's ladder
    if (n.id === 'car') {
      const v = drive.doorOf(pos.x, pos.z);
      if (!v) return null;
      // Your motorbike (vehicle plan Phase 7): beside it on his side, both hands to the grips, a leg over the seat
      if (v.kind === 'bike' && v.bike) return bikeMark(v, BIKES[v.bike], pos.x, pos.z, y, (bx, bz) => blocked(bx, bz, pos.y));
      // Your car (vehicle plan Phase 3): by the door on his side, onto its real seat; that side blocked, the quick
      // swap; under reduced motion always the quick version, no fade
      const inside = v.kind === 'car' && v.model ? INTERIORS[v.model] : null;
      if (!inside?.door) return sideMark(v.kind, v, MOMENT[v.kind].seat);
      if (d.reduced) return null;
      // (at home the turntable is stood on to get in: carMark's spot is by the door, on the disc)
      return carMark(v, { hip: inside.hip, door: inside.door }, pos.x, pos.z, y, SCALE, (bx, bz) => blocked(bx, bz, pos.y, isTurntable)) ?? 'quick';
    }
    if (n.id === 'plane') {
      if (fly.active) return null;
      const p = fly.doorOf();
      return sideMark('plane', { x: p.x, z: p.z, yaw: p.yaw, W: p.side * 2 }, MOMENT.plane.sill, p.u);
    }
    if (n.id === 'boat') return boating() ? null : boardMark('boat', HIRE.door, { x: HIRE.x, z: HIRE.z, y: y + MOMENT.boat.deck }, pos.x, pos.z, y, (bx, bz) => blocked(bx, bz, pos.y));
    if (n.id === 'bench') {
      const b = nearestBench();
      return b ? benchMark(b, groundAt(b.x, b.z, pos.y)) : null;
    }
    if (n.id.startsWith('place:')) {
      const id = n.id.slice(6);
      if (!(id.startsWith('lift:') || id.startsWith('metro:'))) return null;
      const pl = d.places().find((q) => q.id === id);
      if (!pl) return null;
      // (a lift: walked into, turned to face out, then the fade; a station's door is pushed)
      return id.startsWith('lift:') ? liftMark(pl, pos.x, pos.z, y) : door(pl);
    }
    const dr = ALL_DOORS.find((q) => q.id === n.id);
    return dr ? door(dr) : null;
  };
  /** Getting into a vehicle (moments.ts): the mark at the side of its body nearest him, the seat `seatY` up in its middle (`along` its length) */
  const sideMark = (v: Vehicle, b: { x: number; z: number; yaw: number; W: number }, seatY: number, along = 0): Mark => {
    const y = groundAt(pos.x, pos.z, pos.y);
    const fx = Math.cos(b.yaw);
    const fz = -Math.sin(b.yaw);
    const rx = Math.sin(b.yaw);
    const rz = Math.cos(b.yaw);
    const cx = b.x + fx * along;
    const cz = b.z + fz * along;
    const side = (pos.x - cx) * rx + (pos.z - cz) * rz >= 0 ? 1 : -1;
    return boardMark(v, { x: cx + rx * side * (b.W / 2), z: cz + rz * side * (b.W / 2) }, { x: cx, z: cz, y: y + seatY }, pos.x, pos.z, y, (bx, bz) => blocked(bx, bz, pos.y));
  };
  /** Out of a vehicle (moments.ts): from its seat (`from`, `seatY` up) to where he stands, the vehicle giving him back as he steps down */
  const alight = (v: Vehicle, from: { x: number; z: number }, out: { x: number; z: number }, seatY: number) => {
    const y = groundAt(out.x, out.z, pos.y);
    moments.start(alightMark(v, { x: from.x, z: from.z, y: y + seatY }, out, y, face), undefined, out.x, out.z);
  };
  /** Carrying: the crate set down (where it's going, the goods move; anywhere else, nothing does) */
  const putDown = () => {
    if (!carrying || carrying.stage !== 'carry' || moments.active) return;
    const c = carrying;
    const here = Math.hypot(c.to.x - pos.x, c.to.z - pos.z) < PUT_R;
    const at = here ? c.to : { x: pos.x + Math.sin(face) * 0.6, z: pos.z + Math.cos(face) * 0.6 };
    if (!here) c.done = () => d.game.toast('Put down. Nothing moved.', 2500);
    c.stage = 'put';
    contact?.reset();
    moments.start(crateMark('put', at, pos.x, pos.z, groundAt(at.x, at.z, pos.y), (bx, bz) => blocked(bx, bz, pos.y)), () => (crateUp = false), pos.x, pos.z);
  };
  /** The nearest bench nobody's sitting on, within reach */
  const nearestBench = () => {
    let best: { x: number; z: number; ry: number } | null = null;
    let bd = 0.95;
    for (const b of BENCHES) {
      const dd = Math.hypot(b.x - pos.x, b.z - pos.z);
      if (dd >= bd) continue;
      if (bodies.people.some((q) => q.act === 'sit' && Math.hypot(q.x - b.x, q.z - b.z) < 0.45)) continue;
      best = b;
      bd = dd;
    }
    return best;
  };
  const seated = () => moments.active && moments.mark?.kind === 'bench' && moments.phase !== 'approach';
  const act = () => {
    // A moment under way: F again cuts the approach or a door short; seated, it stands him up
    if (moments.active) {
      if (moments.phase === 'hold' && moments.mark?.kind === 'bench') moments.release();
      else moments.skip();
      return;
    }
    if (!near) return;
    // Closed for now by the owner (live settings): getting into things, never out of them
    const f = near.id === 'car' ? (drive.active ? null : 'drive') : near.id === 'plane' ? (fly.active ? null : 'fly') : near.id === 'boat' ? (boating() ? null : 'boat') : near.id.startsWith('spar:') ? 'fight' : GATED[near.id];
    const shut = f && live.closed(f);
    if (shut) return d.game.toast(shut, 3000);
    const n = near;
    const open = () => {
      if (n.id === 'gear') shop.show(n.label === ARMS.name ? ARMS.name : 'Armoury');
      else if (n.id === 'garage') garageUI.show();
      else if (n.id === 'hangar') hangarUI.show();
      else if (n.id === 'plane') (fly.active ? leavePlane() : board());
      else if (n.id === 'boat') (boating() ? leaveBoat() : takeBoat());
      else if (n.id === 'karts') void loadKarts().then(() => kartUI.show());
      else if (n.id === 'trainer') fightUI.show();
      else if (n.id.startsWith('spar:')) startFight({ kind: 'street', partner: n.id.slice(5) as PartnerId });
      else if (n.id === 'car') (drive.active ? getOut() : getIn());
      else if (n.id === 'put') putDown();
      else if (n.id === 'bench' || n.id === 'stand') return;
      // (a snack is bought there and then: the mouse stays captured)
      else if (n.id.startsWith('place:snack:')) hotbar?.snack(n.id.slice(12));
      else if (n.id.startsWith('place:')) {
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        d.openPlace(n.id.slice(6));
      } else openSpot(n.id as SpotId);
    };
    // (on foot and not in the middle of something: the moment first, then what it opens as the hand lands)
    const mk = !drive.active && !over && !slide && !emote && !carrying ? markFor(n) : null;
    if (mk === 'quick') {
      // (the city fades out and in round the swap, as fast travel's does)
      root.classList.add('is-fading');
      setTimeout(() => {
        open();
        requestAnimationFrame(() => root.classList.remove('is-fading'));
      }, QUICK_FADE);
    } else if (mk) {
      contact?.reset();
      pickBenchYaw(mk);
      moments.start(mk, open, pos.x, pos.z);
    } else open();
  };

  /**
   * The ground under a point: a slab, or the street; Liberty Bridge's stairs, landings and walkway when
   * `yNow` is up there; at the kart park the circuit's own (its banks, the hill, the flyover's deck when `yNow` is up there)
   */
  /** Liberty Bridge's leaves are down and its gates open (liberty.ts: they lift for the tall ship; never under reduced motion) */
  const leavesOpen = () => d.reduced || !leavesAt(Date.now() / 1000).shut;
  const groundAt = (x: number, z: number, yNow = 0) => {
    const slab = slabs.some((s) => inBox(s.box, x, z) && inPoly(s.poly, [x, z])) ? SLAB : onDeck(x, z) || onEsplanade(x, z) ? DECK_Y : 0.035;
    // (Crestmont's hills, terrain.ts: open ground that rises; nothing else stands there yet)
    if (slab === 0.035 && onHills(x, z)) return heightAt(x, z) + 0.035;
    // (Harbour Bridge's deck, humped over the river; the river's banks sloping down to the water, river plan step 2)
    const hb = harbourY(x, z);
    if (hb !== null) return Math.max(slab, hb + 0.035);
    // (the airport's departures deck and its ramps, when `yNow` is up there: the arrivals level is under it; airfield.ts)
    const dep = departuresY(x, z, yNow);
    if (dep !== null) return Math.max(slab, dep + 0.035);
    // (Liberty Bridge's decks, when `yNow` is up there)
    const fb = footbridgeY(x, z, yNow, 0, leavesOpen());
    if (fb !== null) return Math.max(slab, fb);
    // (inside Starlight Mall: its two floors and the escalators between them, by `yNow`; mallinside.ts)
    const mall = mallFloor(x, z, yNow);
    if (mall !== null) return mall;
    if (slab === 0.035 && inChannel(x, z)) return shoreY(x, z) + 0.035;
    // (the garage's turntable: its disc's top, where your car stands and you step on to get in)
    if (slab === SLAB && Math.hypot(x - DISC.x, z - DISC.z) < DISC.r) return SLAB + DISC.top;
    const base = Math.max(slab, bridgeY(x, z, yNow) ?? 0, onJetty(x, z) ? SLAB + JETTY.y : 0, SLAB + (terraceY(x, z) ?? -SLAB), SLAB + (skyDeckY(x, z, yNow - SLAB) ?? -SLAB));
    if (x < KART_PARK.x0 || x > KART_PARK.x1 || z < KART_PARK.z0 || z > KART_PARK.z1) return base;
    const t = trackSurfaceAt(x, z, yNow);
    // (and the spectators' grass banks round it, kartfacility.ts)
    return Math.max(base, t ? t.y + 0.035 : 0, bankY(x, z) + 0.035);
  };
  /** Scratch for the collision grid's answers */
  const nearBoxes: Box[] = [];
  const onBridge = (x: number, z: number) => onHarbour(x, z, 0.15);
  /** `y`: how high Degen is (up on Liberty Bridge only its parapets stop you; under it, its pillars and stairs do) */
  function blocked(x: number, z: number, y = 0, skip?: (b: Box) => boolean) {
    if (x < BOUNDS[0] || x > BOUNDS[2] || z < BOUNDS[1] || z > BOUNDS[3]) return true;
    const open = leavesOpen();
    if (footbridgeY(x, z, y, RADIUS, open) !== null) return false;
    if (footbridgeWall(x, z, y, RADIUS, open)) return true;
    // The airport's departures deck (airfield.ts): up there only its parapets, the hall's face and your car stop you
    if (departuresY(x, z, y, RADIUS) !== null) return drive.blocks(x, z, RADIUS);
    if (departuresWall(x, z, y, RADIUS)) return true;
    // The stadium's footbridge over the highway (stadium.ts): up there only its parapets stop you
    if (bridgeY(x, z, y, RADIUS) !== null) return false;
    if (bridgeWall(x, z, y, RADIUS)) return true;
    // Sector 7 Tower's sky deck (skydeck.ts): up there only its rail, the lift house and the viewers stop you
    if (upOnDeck(x, z, y - SLAB)) return skyDeckWall(x, z, RADIUS);
    // Inside Starlight Mall (mallinside.ts): the upper floor's edges and what stands on your floor
    if (mallWall(x, z, y, RADIUS)) return true;
    // (the river is a wall at its edges, wherever they curve (river.ts), but at the bridges, on The Trenches' boardwalk and pier and on Uptown's esplanade: their railings are the decks' edges)
    if (inWater(x, z, -0.3) && !onBridge(x, z) && !onDeck(x, z, RADIUS) && !onEsplanade(x, z, RADIUS)) return true;
    // ...and the Docks' basin at its quays' edge (docks.ts; the avenue crosses its mouth on a bridge)
    if (inBasin(x, z, -0.3)) return true;
    // Westlake Park's lake (westlake.ts): you stop on the lawn at its stone rim, but out along the jetty (its edges stop you)
    if (inLake(x, z, RADIUS + RIM.w + 0.1) && !onJetty(x, z, RADIUS) && !onTerrace(x, z, RADIUS)) return true;
    if (SOLID_GRID.near(x, z, RADIUS, nearBoxes).some((b) => inBox(b, x, z, RADIUS) && !skip?.(b))) return true;
    if (drive.blocks(x, z, RADIUS) || fly.blocks(x, z, RADIUS)) return true;
    return d.placedSolids().some((b) => inBox(b, x, z, RADIUS));
  }
  /** Where he can't step at his own height (contact.ts asks, for a rail: an edge nothing solid explains) */
  const contactBlocked = (bx: number, bz: number) => blocked(bx, bz, pos.y);

  /** How far the camera can sit from the pivot along `dir` before something's in the way. */
  function cameraRoom(from: THREE.Vector3, dir: THREE.Vector3, want: number, min = 0.35, skipUnder = 0.5) {
    let t = want;
    // Ground (and kerb) below
    if (dir.y < 0) {
      const floor = Math.max(groundAt(from.x, from.z, from.y), 0.035) + 0.22;
      t = Math.min(t, (from.y - floor) / -dir.y);
    }
    // (and Crestmont's hills along the way, terrain.ts: a slope rising behind him)
    t = hillsAlong(from, dir, t);
    // Only the boxes under the camera's line can be in its way (padded as the test below pads them)
    // (and Liberty Bridge's towers over their arches and its walkways' roofs, which you walk under: a bottom, b[5])
    for (const b of [...CAMERA_GRID.alongRay(from, dir, t, 0.18, nearBoxes), ...d.placedSolids(), ...LIBERTY_CAMERA, ...DECK_CAMERA, ...MALL_CAMERA] as number[][]) {
      if (b[4] < skipUnder) continue;
      const lo = [b[0] - 0.18, b[5] ?? 0, b[1] - 0.18];
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
    return Math.max(min, t - 0.15);
  }

  /** Distance along a ray to the first building or the ground (for shots). */
  const rayWorld = (from: THREE.Vector3, dir: THREE.Vector3, max: number) => rayBoxes(from, dir, max, d.placedSolids());

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
    onTakedown(kind, hand) {
      takedown(d.game.save(), kind, hand);
      d.game.commit();
    },
  });
  /**
   * A menu opened, a race or a fight begun, a vehicle taken: walking's keys let go, Degen stood still,
   * the trigger and the sight down, and (`free`) the mouse freed
   */
  function still(free = true) {
    keys.clear();
    jumpHeld = false;
    vel.set(0, 0);
    setAim(false);
    combat.trigger(false);
    combat.trigger(false, true);
    if (free && document.pointerLockElement === canvas) document.exitPointerLock();
  }
  // The Armoury's store and workbench at its counter: frees the mouse and pauses walking while it's open
  const shop = lazyMenu<GunShop>(['show', 'take'], async () => (await import('./gunshop')).createGunShop(root, {
    lifetime: () => combat.lifetime,
    weapon: () => combat.weapon,
    geared: () => combat.geared,
    equip: (id) => combat.equip(id),
    may: (id) => combat.canTake(id),
    loadoutChanged: () => combat.setLoadout(),
    game: d.game,
    setMods: (id) => combat.setMods(id),
    onOpen() {
      still();
    },
    onClose: () => {
      moments.release();
      canvas.focus({ preventScroll: true });
    },
  }));
  combat.onLifetime(() => shop.refresh());
  // The inventory's hotbar and the Bag tab (inventory-ui.ts, a chunk of its own fetched when walking starts): fists,
  // his loadout, the thing in his hand, his snacks. A key pressed before it's in waits for it.
  let hotbar: Hotbar | null = null;
  let hotbarLoad: Promise<void> | null = null;
  const loadHotbar = () =>
    (hotbarLoad ??= import('./inventory-ui')
      .then(({ createHotbar }) => {
        hotbar = createHotbar(root, {
          game: d.game,
          combat,
          touched: d.touched,
          hold: d.hold,
          // The inventory (Tab): the mouse freed for dragging, Degen stood still, as at a counter
          opened() {
            still();
          },
          closed: () => canvas.focus({ preventScroll: true }),
        });
      })
      .catch(() => {
        hotbarLoad = null;
      }));
  /** Pick a hotbar slot (0-6), or step through the fists and the guns */
  const pickSlot = (n: number) => (hotbar ? hotbar.pick(n) : void loadHotbar().then(() => hotbar?.pick(n)));
  /** Open or close the inventory (Tab, the Bag button, View on a gamepad) */
  const toggleInv = () => (hotbar ? hotbar.toggle() : void loadHotbar().then(() => hotbar?.toggle()));
  const stepSlot = (dir: 1 | -1) => (hotbar ? hotbar.step(dir) : void loadHotbar().then(() => hotbar?.step(dir)));
  // Fists on the street (brawl.ts, docs/inventory-plan.md Phase 2, a chunk of its own fetched when walking starts):
  // empty hands are his fists. Click punches, right-click (held) blocks, G kicks, Space with the guard up and standing
  // dodges; on a gamepad X, Y, LB held and A; on touch Punch, Kick and Block in Fire's, Aim's and Reload's places
  let fists: StreetFists | null = null;
  let partners: Partners | null = null;
  /** The partner a street spar is with (they're hidden while the fight draws its own) */
  let sparWith: PartnerId | null = null;
  let fistsMod: typeof import('./brawl') | null = null;
  let fistsLoad: Promise<void> | null = null;
  const loadFists = () =>
    (fistsLoad ??= import('./brawl')
      .then((m) => {
        fistsMod = m;
        fists = m.createStreetFists(d.game.save().fight.style);
        // The sparring partners waiting on the street (Phase 3): drawn near him, solid where they stand
        partners = m.createPartners(d.scene, d.low, (x, z) => groundAt(x, z));
        // (solid where they stand: into the grids now, not the city's SOLIDS, whose lawn walks were routed at the load)
        addSolids(m.PARTNER_SOLIDS);
      })
      .catch(() => {
        fistsLoad = null;
      }));
  /** The guard's and the whole-body moves' share of his pose, the right mouse button and LB held (the block), the last "out of breath" */
  let guardAmt = 0;
  let wholeAmt = 0;
  let mouseBlock = false;
  let padBlock = false;
  let tiredAt = -1e9;
  let fistsShown = false;
  /** His hands are empty and he's on his feet with nothing else on: the fists are his */
  const fistsReady = () => !!fists && !!hotbar?.handsEmpty && !hotbar.open && !carrying && !drive.active && !fly.active && !karts.active && !boat?.active && !fighting() && !ride && !shop.open && !garageUI.open && !hangarUI.open && !kartUI.open && !fightUI.open;
  // The garage menu: like the store it frees the mouse and pauses walking; the camera goes to the
  // turntable (from over the shoulder, so the first-person hands stay out of the shot)
  let fpBeforeGarage = false;
  const garageUI = lazyMenu<GarageUI>(['show'], async () => (await import('./garage-ui')).createGarageUI(root, {
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
    // Your motorbike on its stand, as the car on the turntable (vehicle plan Phase 7)
    previewBike: (b) => d.garage.showBike(b),
    keepBike(b) {
      drive.recallBike();
      d.garage.showBike(b);
    },
    cancelBike(saved) {
      if (drive.bikeAway) d.garage.clearBike();
      else d.garage.showBike(saved);
    },
    bikeAway: () => drive.bikeAway,
    game: d.game,
    onOpen() {
      still();
      fpBeforeGarage = firstPerson;
      if (firstPerson) setFirstPerson(false);
      d.garage.spin(true);
    },
    onClose() {
      d.garage.spin(false);
      if (fpBeforeGarage) setFirstPerson(true);
      canvas.focus({ preventScroll: true });
    },
  }));
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
    // Your motorbike (vehicle plan Phase 7), as your car: only one the save owns
    myBike: () => {
      const b = loadBike();
      return ownsCar(d.game.save(), b.model) ? b : { ...DEFAULT_BIKE };
    },
    // Your kart, out of the pits and back (kart.ts keeps the show kart); its handling with its mods
    kart: {
      home: () => karts.home(),
      takeOut: () => karts.takeOut(),
      bringBack: () => karts.bringBack(),
      stats: (model) => {
        const k = kartStatsOf(d.game.save(), model);
        return { speed: k.speed, accel: k.accel, grip: k.handling };
      },
    },
    outfit: () => outfit,
    // (the banks too: a kart can climb them)
    track: (x, z, y) => {
      const t = trackSurfaceAt(x, z, y);
      const b = bankY(x, z);
      return b > 0.01 && (!t || b > t.y) ? { y: b, roll: 0 } : t;
    },
    // The boxes within `reach` of where the car is (the collision grid's answer, then placed buildings)
    solids: (x, z, reach) => {
      const near = CAR_GRID.near(x, z, reach);
      return d.placedSolids().length ? [...near, ...d.placedSolids()] : near;
    },
    groundAt,
    cameraRoom,
    free: (x, z) => !blocked(x, z),
    sfx: d.sfx,
    engine: d.engine,
    tyres: d.tyres,
    bounds: [BOUNDS[0], BOUNDS[1], BOUNDS[2], BOUNDS[3], 0],
  });


  // Your aircraft: get in at the hangar (or wherever you landed it), fly, land and get out
  const fly = createFly({
    scene: d.scene,
    camera,
    root,
    myPlane: loadPlane,
    solids: (x, z, reach) => {
      const near = CAR_GRID.near(x, z, reach);
      return d.placedSolids().length ? [...near, ...d.placedSolids()] : near;
    },
    groundAt,
    cameraRoom,
    free: (x, z) => !blocked(x, z),
    traffic: d.airTraffic,
    sfx: d.sfx,
    aero: d.aero,
    bounds: [BOUNDS[0], BOUNDS[1], BOUNDS[2], BOUNDS[3], 0],
  });
  // The hangar menu: like the garage's, it frees the mouse and pauses walking while the camera looks into the hangar
  let fpBeforeHangar = false;
  const hangarUI = lazyMenu<HangarUI>(['show'], async () => (await import('./hangar-ui')).createHangarUI(root, {
    preview: (p) => fly.preview(p),
    keep: (p) => fly.recall(p),
    cancel: (saved) => fly.cancel(saved),
    away: () => fly.away,
    onOpen() {
      still();
      fpBeforeHangar = firstPerson;
      if (firstPerson) setFirstPerson(false);
    },
    onClose() {
      if (fpBeforeHangar) setFirstPerson(true);
      canvas.focus({ preventScroll: true });
    },
  }));
  /** Flying input from the gamepad */
  const padFly = { turn: 0, climb: 0, throttle: 0 };

  /** Driving input from the gamepad and the touch pedals */
  const padDrive = { steer: 0, throttle: 0, handbrake: false };
  const pedals = { gas: false, brake: false };
  /* ---------- The kart park: the hut's menu, the race on its track (kart-ui.ts, kart.ts) ---------- */

  /** What Degen wears (the kart's driver wears the same) */
  let outfit: Outfit = PLAYER;
  /**
   * The hut's menu and the race (kart-ui.ts, kart.ts) come in their own chunk (kartgame.ts), loaded when Degen comes
   * near the park or asks at the hut; until then they stand idle
   */
  const NO_KART_UI: KartUI = { open: false, show() {}, close: () => false, step() {}, take() {}, showHud() {}, paintHud() {}, count() {}, pop() {}, showResult() {}, update() {} };
  const NO_KARTS: KartRace = { active: false, sim: null, start() {}, setGhosts() {}, update() {}, exit: () => ({ x: pos.x, z: pos.z, yaw }), preview() {}, idle() {}, home: () => null, takeOut: () => null, bringBack() {} };
  let kartUI: KartUI = NO_KART_UI;
  let karts: KartRace = NO_KARTS;
  let kartLoad: Promise<void> | null = null;
  const loadKarts = () =>
    (kartLoad ??= import('./kartgame').then(({ createKartUI, createKartRace }) => {
      kartUI = makeKartUI(createKartUI);
      karts = makeKartRace(createKartRace);
    }));
  /** Your hire boat (boat.ts, river plan step 4c): its own chunk, loaded the first time you take it */
  let boat: Boat | null = null;
  let boatLoad: Promise<Boat> | null = null;
  const boating = () => !!boat?.active;
  const loadBoat = () =>
    (boatLoad ??= import('./boat').then(({ createBoat }) =>
      (boat = createBoat({ scene: d.scene, camera, root, outfit: () => outfit, cameraRoom, lanes: () => bodies.boats, sfx: (k, g) => d.sfx(k, g), engine: (r) => d.engine(r), reduced: d.reduced }))
    ));
  /** Near enough the park to fetch them (its land and a margin) */
  const nearKarts = (x: number, z: number) => x > KART_PARK.x0 - 80 && x < KART_PARK.x1 + 80 && z > KART_PARK.z0 - 80 && z < KART_PARK.z1 + 80;
  const makeKartUI = (createKartUI: typeof import('./kart-ui').createKartUI) => createKartUI(root, {
    game: d.game,
    start: (setup) => startKart(setup),
    // A series: the results card's Next race starts the cup's next course; Drop ends the series
    nextRace() {
      if (karts.active) leaveKart();
      const s = d.game.save();
      const sr = s.karts.series;
      const race = seriesNext(s);
      if (!sr || !race) return;
      startKart({ course: race.course, cup: sr.cup, cls: CUPS[sr.cup].cls, laps: race.laps, cond: race.cond });
    },
    quitSeries() {
      const s = d.game.save();
      if (!s.karts.series) return;
      abandonSeries(s);
      d.game.commit();
    },
    preview: (k) => karts.preview(k),
    onOpen() {
      pedals.gas = pedals.brake = false;
      kartBtns.drift = false;
      still();
    },
    onClose() {
      // The results card closed: out of the kart
      if (karts.active && karts.sim?.done) leaveKart();
      canvas.focus({ preventScroll: true });
    },
    quit: () => abandonKart(),
  });
  const makeKartRace = (createKartRace: typeof import('./kart').createKartRace) => createKartRace({
    scene: d.scene,
    camera,
    root,
    park: d.kartPark,
    ui: kartUI,
    game: d.game,
    outfit: () => outfit,
    sfx: d.sfx,
    engine: d.engine,
    conditions: d.raceConditions,
    reduced: d.reduced,
    low: d.low,
  });
  /* ---------- The Fight Club: the trainer's menu, the fight in its ring (fight-ui.ts, fight.ts) ---------- */

  // (the menu loads the first time the trainer opens it: not in the boot)
  const fightUI = lazyMenu<FightUI>(['show'], async () => (await import('./fight-ui')).createFightUI(root, {
    game: d.game,
    start: (setup) => startFight(setup),
    snack: () => void fight?.snack(),
    onOpen() {
      pedals.gas = pedals.brake = false;
      fightBtns.block = false;
      still();
      void loadFight();
    },
    onClose() {
      moments.release();
      // The bout card closed: out of the ring
      if (fighting() && (fightDone || fightOver())) leaveFight();
      canvas.focus({ preventScroll: true });
    },
    quit: () => quitFight(),
  }));
  /** The fight itself (fight.ts and the figures' clips) comes in its own chunk, when the trainer's menu first opens */
  let fight: Fight | null = null;
  let fightLoad: Promise<Fight> | null = null;
  const loadFight = () =>
    (fightLoad ??= import('./fight').then(({ createFight }) => {
      fight = createFight({
        scene: d.scene,
        camera,
        root,
        club: d.fightClub,
        ui: fightUI,
        game: d.game,
        groundAt: (x, z) => groundAt(x, z, pos.y),
        outfit: () => outfit,
        sfx: d.sfx,
        reduced: d.reduced,
        low: d.low,
        motion: () => (anim && mocapData && onFoot ? { anim, data: mocapData, onFoot } : null),
      });
      return fight;
    }));
  const fighting = () => !!fight?.active;
  /** The card is up (the fight's over): closing it leaves the ring */
  let fightDone = false;
  const fightOver = () => !!fight?.sim?.over;
  /** The buttons while fighting: Block held, Punch / Kick / Dodge pressed (edges) */
  const fightBtns = { punch: false, kick: false, block: false, dodge: false };
  const padFight = { x: 0, y: 0, block: false };
  let fightUIReady = false;
  function startFight(setup: FightStart) {
    if (fighting()) return;
    // (still loading, the fight and its HUD: it starts as soon as they're here)
    if (!fight || !fightUIReady) {
      void Promise.all([loadFight(), fightUI.loaded()]).then(() => {
        fightUIReady = true;
        startFight(setup);
      });
      return;
    }
    fightUI.close();
    if (drive.active) getOut();
    if (combat.armed) combat.toggleHolster();
    // (the fists' guard down: the fight has its own; walk mode's frame doesn't run while it's on)
    fists?.brawl.cancel();
    fistsShown = false;
    guardAmt = wholeAmt = 0;
    mouseBlock = padBlock = false;
    root.classList.remove('is-fists');
    fightBtns.punch = fightBtns.kick = fightBtns.block = fightBtns.dodge = false;
    still();
    hero.g.visible = hero.ring.visible = false;
    near = null;
    prompt.hidden = true;
    fightDone = false;
    sparWith = setup.kind === 'street' ? setup.partner : null;
    fight.start(setup);
    canvas.focus({ preventScroll: true });
    d.touched();
  }
  /** Out of the ring: Degen stands up outside the ropes */
  function leaveFight() {
    if (!fight?.active) return;
    const out = fight.exit();
    fightDone = false;
    sparWith = null;
    pos.set(out.x, groundAt(out.x, out.z), out.z);
    vel.set(0, 0);
    vy = 0;
    yaw = out.yaw;
    face = yaw + Math.PI;
    pitch = firstPerson ? -0.05 : 0.35;
    pivot.set(0, 0, 0);
    camDist = zoom;
    camera.fov = fov = baseFov;
    camera.updateProjectionMatrix();
    hero.g.visible = !firstPerson;
    hero.ring.visible = !firstPerson;
    keys.clear();
    pedals.gas = pedals.brake = false;
    fightBtns.punch = fightBtns.kick = fightBtns.block = fightBtns.dodge = false;
    near = null;
    d.touched();
  }
  /** Quit a fight (a bout is forfeited): the card comes up; true if there was one */
  function quitFight() {
    if (!fight?.active) return false;
    if (!fightDone) {
      fightDone = true;
      fight.quit();
    }
    return true;
  }

  /** The touch Drift button, held */
  const kartBtns = { drift: false };
  const padKart = { steer: 0, throttle: 0, drift: false };
  function startKart(setup: RaceStart) {
    if (karts.active) return;
    kartUI.close();
    if (drive.active) getOut();
    drive.recallKart();
    if (combat.armed) combat.toggleHolster();
    kartBtns.drift = false;
    still();
    hero.g.visible = hero.ring.visible = false;
    near = null;
    prompt.hidden = true;
    karts.start(setup);
    canvas.focus({ preventScroll: true });
    d.touched();
  }
  /** Out of the kart: Degen stands up by the hut */
  function leaveKart() {
    if (!karts.active) return;
    const out = karts.exit();
    pos.set(out.x, groundAt(out.x, out.z), out.z);
    vel.set(0, 0);
    vy = 0;
    yaw = out.yaw;
    face = yaw + Math.PI;
    pitch = firstPerson ? -0.05 : 0.35;
    pivot.set(0, 0, 0);
    camDist = zoom;
    camera.fov = fov = baseFov;
    camera.updateProjectionMatrix();
    hero.g.visible = !firstPerson;
    hero.ring.visible = !firstPerson;
    keys.clear();
    pedals.gas = pedals.brake = false;
    kartBtns.drift = false;
    near = null;
    d.touched();
  }
  /** Abandon a race (no prize); true if there was one */
  function abandonKart() {
    if (!karts.active) return false;
    const done = !!karts.sim?.done;
    kartUI.close();
    leaveKart();
    if (!done) d.game.toast('Race abandoned. No prize this time.', 3500);
    return true;
  }

  /** Tiles driven since the last time they were counted (counted every ten, not every frame) */
  let driven = 0;
  function getIn() {
    if (combat.armed) combat.toggleHolster();
    // (in by your car's passenger door, the moment's: he slides over to the wheel)
    if (!drive.enter(pos.x, pos.z, moments.mark?.kind === 'board' ? (moments.mark.side ?? 0) : 0)) return;
    still(false);
    hero.g.visible = hero.ring.visible = false;
    near = null;
    // (the vehicle has him: the moment that got him in is over, and a crate is put away)
    moments.cancel();
    dropCrate();
    d.touched();
  }
  function getOut() {
    const out = drive.exit();
    if (!out) return;
    standAt(out);
    // (your car: from its real seat, the hips at its hip point; under reduced motion just out, the quick version)
    if (out.seat !== undefined && d.reduced) return;
    alight(out.kind, out.from, out, out.seat !== undefined ? out.seat - 0.03 * SCALE : MOMENT[out.kind].seat);
  }
  /** Into your aircraft (the gun is holstered) */
  function board() {
    if (drive.active || karts.active) return;
    if (combat.armed) combat.toggleHolster();
    if (!fly.enter()) return;
    still(false);
    hero.g.visible = hero.ring.visible = false;
    near = null;
    moments.cancel();
    dropCrate();
    d.touched();
  }
  /** Out of it: only on the ground and stopped */
  function leavePlane() {
    const out = fly.exit();
    if (!out) {
      d.game.toast('Land and stop first, then get out.', 2500);
      return;
    }
    standAt(out);
    alight('plane', out.from, out, MOMENT.plane.sill);
  }
  /** Down the ladder into the hire boat (the gun is holstered) */
  function takeBoat() {
    if (drive.active || karts.active || fly.active || ride) return;
    void loadBoat()
      .then((b) => {
        if (!active || drive.active || fly.active || karts.active || ride || fighting()) return;
        if (combat.armed) combat.toggleHolster();
        if (!b.enter()) return;
        still(false);
        hero.g.visible = hero.ring.visible = false;
        near = null;
        moments.cancel();
        dropCrate();
        d.touched();
      })
      .catch(() => d.game.toast('The boat hire is closed for a moment: try again', 2500));
  }
  /** Out of it: only alongside a landing (or at its mooring), stopped */
  function leaveBoat() {
    const out = boat?.exit();
    if (!out) {
      d.game.toast('Bring it alongside a landing and stop, then get out.', 2500);
      return;
    }
    standAt(out);
    alight('boat', out.from, out, MOMENT.boat.deck);
  }
  /** Degen steps out of a vehicle, looking the way it faces */
  function standAt(out: { x: number; z: number; yaw: number }) {
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
  /** How far the camera has swung over to the showroom (0..1), and which (the garage's turntable or the hangar) */
  let showroom = 0;
  let showFrom: 'garage' | 'hangar' = 'garage';
  const showEye = new THREE.Vector3();
  let viewShifted = false;
  hero.torso.add(combat.gun);
  let aimAmt = 0;
  let armAmt = 0;
  let recoil = 0;

  /* ---------- Input ---------- */

  const look = (dx: number, dy: number, k: number) => {
    if (boat?.active) {
      boat.look(dx * k * settings.sens, dy * k * settings.sens * (settings.invert ? -1 : 1));
      d.touched();
      return;
    }
    if (fly.active) {
      fly.look(dx * k * settings.sens, dy * k * settings.sens * (settings.invert ? -1 : 1));
      d.touched();
      return;
    }
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
    d.touched();
    // (the guard up and standing, it's a dodge: moving, a jump as ever)
    if (fistsReady() && fists!.brawl.up && grounded && vel.length() < fistsMod!.BRAWL.still) {
      fightBtns.dodge = true;
      return;
    }
    jumpBuffer = 0.14;
  };
  /** C, B or the touch Crouch button: a slide when sprinting, else into or out of a crouch */
  const crouchPress = () => {
    d.touched();
    if (slide) return;
    const fast = grounded ? startSlide(ms) : null;
    if (fast) slide = fast;
    else crouched = !crouched;
  };
  function setFirstPerson(on: boolean) {
    firstPerson = on;
    root.classList.toggle('is-fp', on);
    if (!on && zoom < 1.5) zoom = 4.5;
    fpBtn.setAttribute('aria-pressed', String(on));
    if (on) pitch = THREE.MathUtils.clamp(pitch, -1.35, 1.35);
    else pitch = Math.max(pitch, -0.55);
  }
  function setSprintLock(on: boolean) {
    sprintLock = on;
    runBtn.setAttribute('aria-pressed', String(on));
  }

  const MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
  function onKey(e: KeyboardEvent, down: boolean) {
    if (!active || (e.target as HTMLElement).matches?.('input, select, textarea')) return false;
    const c = e.code;
    // (a peek key let go anywhere is let go: it may have been held into a car or a menu)
    if (!down && (c === 'KeyQ' || c === 'KeyE')) keys.delete(c);
    // The inventory open: its keys (Tab closes it; Esc too, index.ts), and walking keys wait
    if (hotbar?.open) return hotbar.key(e, down);
    // While the store, the garage, the hangar, the kart hut's or the trainer's menu is open, F closes it and walking keys wait
    if (shop.open || garageUI.open || hangarUI.open || kartUI.open || fightUI.open) {
      if (down && !e.repeat && c === 'KeyF') (shop.open ? shop.close() : garageUI.open ? garageUI.close() : hangarUI.open ? hangarUI.close() : kartUI.open ? kartUI.close() : fightUI.close());
      return false;
    }
    // Fighting: move with the move keys (W towards the opponent), Shift blocks, Space dodges; the mouse punches and kicks
    if (fighting()) {
      if (c === 'Space') {
        if (down && !e.repeat) fightBtns.dodge = true;
      } else if (c === 'ShiftLeft' || c === 'ShiftRight') fightBtns.block = down;
      else if (down && !e.repeat && c === 'KeyG') fightBtns.kick = true;
      else if (down && !e.repeat && c === 'KeyE') fight?.snack();
      else if (MOVE.includes(c)) {
        if (down) keys.add(c);
        else keys.delete(c);
      } else return false;
      d.touched();
      e.preventDefault();
      return true;
    }
    // Boating: W / S ahead and astern, A / D steer, V swaps camera, H the horn, F gets out (alongside a landing)
    if (boat?.active) {
      if (down && !e.repeat && c === 'KeyF') act();
      else if (down && !e.repeat && c === 'KeyV') boat.toggleView();
      else if (down && !e.repeat && c === 'KeyH') boat.horn();
      else if (MOVE.includes(c)) {
        if (down) keys.add(c);
        else keys.delete(c);
      } else return false;
      d.touched();
      e.preventDefault();
      return true;
    }
    // Flying: W / S faster and slower, A / D turn, the arrows (or Space and Shift / C) climb and dive, V swaps camera, F gets out
    if (fly.active) {
      if (down && !e.repeat && c === 'KeyF') act();
      else if (down && !e.repeat && c === 'KeyV') fly.toggleView();
      else if (c === 'Space') jumpHeld = down;
      else if (MOVE.includes(c) || c === 'KeyC') {
        if (down) keys.add(c);
        else keys.delete(c);
      } else return false;
      d.touched();
      e.preventDefault();
      return true;
    }
    // Karting: steer and pedal with the move keys, Space hops into a drift (F does nothing in a race: no getting out mid-lap)
    if (karts.active) {
      if (c === 'KeyF') {
        /* swallowed */
      } else if (c === 'Space') jumpHeld = down;
      else if (MOVE.includes(c)) {
        if (down) keys.add(c);
        else keys.delete(c);
      } else return false;
      d.touched();
      e.preventDefault();
      return true;
    }
    // Driving: steer and pedal with the move keys, Space for the handbrake, V swaps camera, H the horn, F gets out
    if (drive.active) {
      if (down && !e.repeat && c === 'KeyF') act();
      else if (down && !e.repeat && c === 'KeyV') drive.toggleView();
      else if (down && !e.repeat && c === 'KeyH') drive.horn();
      else if (c === 'Space') jumpHeld = down;
      else if (MOVE.includes(c)) {
        if (down) keys.add(c);
        else keys.delete(c);
      } else return false;
      d.touched();
      e.preventDefault();
      return true;
    }
    if (down && c === 'KeyF' && near) act();
    // Tab: the inventory (on foot, not in the middle of a moment)
    else if (c === 'Tab') {
      if (down && !e.repeat && !moments.active) toggleInv();
    } else if (down && !e.repeat && c === 'KeyV') setFirstPerson(!firstPerson);
    else if (down && !e.repeat && c === 'CapsLock') walkLock = !walkLock;
    else if (down && !e.repeat && c === 'KeyR') combat.reload();
    else if (down && !e.repeat && c === 'KeyG') {
      // (empty hands: G kicks; a gun is drawn with 1 or 2)
      if (fistsReady()) fightBtns.kick = true;
      else combat.toggleHolster();
    } else if (down && !e.repeat && c === 'KeyX') stepSlot(1);
    else if (down && !e.repeat && c === 'KeyC') crouchPress();
    // Q / E held: peek left and right
    else if (c === 'KeyQ' || c === 'KeyE') {
      if (down) keys.add(c);
      else keys.delete(c);
    }
    // 1-7 pick a hotbar slot (unless the emote panel has them)
    else if (down && !e.repeat && /^Digit[1-7]$/.test(c) && !root.querySelector('[data-emotes][open]')) pickSlot(Number(c.slice(5)) - 1);
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
  // A click punches and a right-click kicks while fighting (the mouse isn't captured in the ring)
  canvas.addEventListener('mousedown', (e) => {
    if (active && fighting()) {
      if (e.button === 0) fightBtns.punch = true;
      else if (e.button === 2) fightBtns.kick = true;
    }
  });
  // Switching away lets go of everything (keys, buttons, sticks, a look drag)
  window.addEventListener('blur', () => {
    keys.clear();
    padLean = 0;
    jumpHeld = false;
    mouseL = mouseR = mouseBlock = padBlock = false;
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
    if (!active || lastPointer !== 'mouse' || fighting()) return;
    // Empty hands: a click punches (once the mouse is captured), the right button held blocks
    if (fistsReady()) {
      if (e.button === 0 && (locked() || noLock)) fightBtns.punch = true;
      if (e.button === 2) mouseBlock = true;
      d.touched();
      return;
    }
    if (e.button === 2) aim = mouseR = true;
    if (e.button === 0 && (locked() || noLock)) {
      mouseL = true;
      combat.trigger(true);
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) mouseBlock = false;
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
      if (!active || drive.active || fly.active) return;
      // With the mouse captured the wheel steps the hotbar (as a shooter's does); free, it sets the camera's distance
      if (locked() && !boating() && !karts.active && !fighting()) {
        if (e.deltaY) hotbar?.wheel(Math.sign(e.deltaY) as 1 | -1);
        e.preventDefault();
        return;
      }
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
  runBtn.addEventListener('click', () => setSprintLock(!sprintLock));
  crouchBtn.addEventListener('click', () => {
    crouchPress();
    // (a crouch lets go of the locked sprint, which would stand him straight back up)
    if (crouched) setSprintLock(false);
  });
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
  // The horn while driving your car (city life plan, Phase 2)
  $('[data-drive-horn]').addEventListener('pointerdown', () => {
    if (boat?.active) boat.horn();
    else drive.horn();
    d.touched();
  });
  // Touch while karting: Drift held, Item tapped (the stick steers, the pedals pedal)
  const driftBtn = root.querySelector<HTMLButtonElement>('[data-kart-drift]');
  if (driftBtn) {
    driftBtn.addEventListener('pointerdown', (e) => {
      try {
        driftBtn.setPointerCapture(e.pointerId);
      } catch {
        /* still pressed */
      }
      kartBtns.drift = true;
      d.touched();
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) driftBtn.addEventListener(ev, () => (kartBtns.drift = false));
  }
  // Touch while fighting: Punch, Kick and Dodge tapped, Block held, Quit
  root.querySelector('[data-fight-punch]')?.addEventListener('click', () => {
    fightBtns.punch = true;
    d.touched();
  });
  root.querySelector('[data-fight-kick]')?.addEventListener('click', () => {
    fightBtns.kick = true;
    d.touched();
  });
  root.querySelector('[data-fight-dodge]')?.addEventListener('click', () => {
    fightBtns.dodge = true;
    d.touched();
  });
  const blockBtn = root.querySelector<HTMLButtonElement>('[data-fight-block]');
  if (blockBtn) {
    blockBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      blockBtn.setPointerCapture?.(e.pointerId);
      fightBtns.block = true;
      d.touched();
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) blockBtn.addEventListener(ev, () => (fightBtns.block = false));
  }
  root.querySelector('[data-fight-quit]')?.addEventListener('click', () => quitFight());
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
  // (the hotbar's step: through the fists and the guns)
  $('[data-walk-swap]').addEventListener('click', () => {
    stepSlot(1);
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

  // Gamepad: left stick move, right stick look, A jump, LB / L3 run, Y enter, View the inventory, R3 first person,
  // RT fire, LT aim, X reload, D-pad up holster, RB / D-pad left-right step the hotbar (the weapons and empty hands);
  // with empty hands X punches, Y kicks (nothing to do there), LB held blocks, A dodges standing with the guard up
  function pollPad(dt: number) {
    const gp = Array.from(navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
    if (!gp) {
      pad.x = pad.y = 0;
      pad.run = false;
      padDrive.steer = padDrive.throttle = 0;
      padDrive.handbrake = false;
      padKart.steer = padKart.throttle = 0;
      padKart.drift = false;
      padFly.turn = padFly.climb = padFly.throttle = 0;
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
    // The inventory: the D-pad moves round it, A does the selected thing, B or View closes
    if (hotbar?.open) {
      hotbar.pad(edge);
      pad.x = pad.y = 0;
      pad.prev = b;
      return;
    }
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
    // The garage: D-pad left / right picks the model, up / down the paint, the bumpers the tabs, A keeps it
    if (garageUI.open) {
      if (edge(4)) garageUI.stepTab(-1);
      if (edge(5)) garageUI.stepTab(1);
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
    // The hangar menu: like the garage's
    if (hangarUI.open) {
      if (edge(14)) hangarUI.step(-1);
      if (edge(15)) hangarUI.step(1);
      if (edge(12)) hangarUI.stepPaint(-1);
      if (edge(13)) hangarUI.stepPaint(1);
      if (edge(0)) hangarUI.keep();
      if (edge(1) || edge(3)) hangarUI.close();
      pad.x = pad.y = 0;
      pad.prev = b;
      return;
    }
    // The trainer's menu: D-pad moves, A takes, B closes
    if (fightUI.open) {
      if (edge(12) || edge(14)) fightUI.step(-1);
      if (edge(13) || edge(15)) fightUI.step(1);
      if (edge(0)) fightUI.take();
      if (edge(1)) fightUI.close();
      padFight.x = padFight.y = 0;
      return;
    }
    // Fighting: left stick moves, X punches, Y kicks, LB (held) blocks, A dodges, Start quits
    if (fighting()) {
      padFight.x = pad.x;
      padFight.y = pad.y;
      padFight.block = !!b[4];
      if (edge(2)) fightBtns.punch = true;
      if (edge(3)) fightBtns.kick = true;
      if (edge(0)) fightBtns.dodge = true;
      // (the d-pad's up: a snack, in a spar)
      if (edge(12)) fight?.snack();
      if (edge(9)) quitFight();
      if (pad.x || pad.y || b.some(Boolean)) d.touched();
      pad.prev = b;
      return;
    }
    // Boating: left stick steers, RT ahead, LT astern, Y gets out, View swaps camera, the left stick pressed is the horn
    if (boat?.active) {
      padDrive.steer = pad.x;
      padDrive.throttle = (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0);
      if (edge(3)) act();
      if (edge(8)) boat.toggleView();
      if (edge(10)) boat.horn();
      if (pad.x || padDrive.throttle || b.some(Boolean)) d.touched();
      pad.prev = b;
      return;
    }
    // Flying: left stick turns and climbs (up climbs), RT faster, LT slower, Y gets out, View swaps camera
    if (fly.active) {
      padFly.turn = pad.x;
      padFly.climb = -pad.y;
      padFly.throttle = (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0);
      if (edge(3)) act();
      if (edge(8)) fly.toggleView();
      if (pad.x || pad.y || padFly.throttle || b.some(Boolean)) d.touched();
      pad.prev = b;
      return;
    }
    // The kart hut's menu: D-pad moves, A takes, B (or Y again) closes
    if (kartUI.open) {
      if (edge(12) || edge(14)) kartUI.step(-1);
      if (edge(13) || edge(15)) kartUI.step(1);
      if (edge(0)) kartUI.take();
      if (edge(1) || edge(3)) kartUI.close();
      pad.x = pad.y = 0;
      pad.prev = b;
      return;
    }
    // Karting: left stick steers, RT gas, LT brake, A hops into a drift, Y quits
    if (karts.active) {
      padKart.steer = pad.x;
      padKart.throttle = (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0);
      padKart.drift = !!b[0];
      if (edge(3)) abandonKart();
      if (pad.x || padKart.throttle || b.some(Boolean)) d.touched();
      pad.prev = b;
      return;
    }
    // Driving: left stick steers, RT gas, LT brake / reverse, A handbrake, Y gets out, View swaps camera, the left stick pressed is the horn
    if (drive.active) {
      padDrive.steer = pad.x;
      padDrive.throttle = (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0);
      padDrive.handbrake = !!b[0];
      if (edge(3)) act();
      if (edge(8)) drive.toggleView();
      if (edge(10)) drive.horn();
      if (pad.x || padDrive.throttle || b.some(Boolean)) d.touched();
      pad.prev = b;
      return;
    }
    if (edge(0)) tryJump();
    if (edge(1)) crouchPress();
    jumpHeld = jumpHeld || b[0] || false;
    if (!b[0] && pad.prev[0]) jumpHeld = false;
    // (aiming, LB and RB lean out instead: peeking)
    padLean = b[6] ? (b[5] ? 1 : 0) - (b[4] ? 1 : 0) : 0;
    // (empty hands: LB held blocks, the run is the left stick pressed)
    const fb = fistsReady();
    padBlock = fb && !!b[4];
    pad.run = !!((b[4] && !b[6] && !fb) || b[10]);
    aim = aim || !!b[6];
    if (!b[6] && pad.prev[6]) setAim(false);
    // (Y does what the prompt says; with empty hands and nothing to do, it kicks)
    if (edge(3)) {
      if (fistsReady() && !near) fightBtns.kick = true;
      else act();
    }
    // View opens the inventory; the right stick pressed swaps first and third person
    if (edge(8) && !moments.active) toggleInv();
    if (edge(11)) setFirstPerson(!firstPerson);
    if (b[7] !== !!pad.prev[7]) combat.trigger(!!b[7]);
    // (X reloads; with empty hands it punches)
    if (edge(2)) {
      if (fistsReady()) fightBtns.punch = true;
      else combat.reload();
    }
    if (edge(12)) combat.toggleHolster();
    // RB or D-pad right: the hotbar's next slot of the fists and the guns; D-pad left: the one before
    if ((edge(5) && !b[6]) || edge(15)) stepSlot(1);
    if (edge(14)) stepSlot(-1);
    if (pad.x || pad.y || b.some(Boolean)) d.touched();
    pad.prev = b;
  }

  /* ---------- Per frame ---------- */

  /**
   * Jump at something low straight ahead (going `dir`): over it, if it's a
   * low thing (vault.ts), the landing's clear and near his own ground, and
   * nothing but low things under the arc stands in the way over
   */
  function tryOver(dir: number) {
    const g0 = groundAt(pos.x, pos.z, pos.y + 0.3);
    const ahead = SOLID_GRID.near(pos.x + Math.sin(dir) * 1.1, pos.z + Math.cos(dir) * 1.1, 1.5, []);
    if (!onFoot) return null;
    const o = onFoot.overAhead(pos.x, pos.z, dir, g0, ahead, RADIUS);
    if (!o) return null;
    const g1 = groundAt(o.x1, o.z1, g0 + 0.3);
    if (Math.abs(g1 - g0) > onFoot.OVER.drop || blocked(o.x1, o.z1, g1)) return null;
    for (let k = 1; k < 10; k++) {
      const at = onFoot.overAt(o, k / 10, g0, g1);
      if (blocked(at.x, at.z, at.y, (b) => onFoot!.isLow(b) && b[4] <= o.top + 0.02)) return null;
    }
    return { o, t: 0, g0, g1, v: speedNow };
  }

  const headAt = new THREE.Vector3();
  const sideDir = new THREE.Vector3();
  const lookDir = new THREE.Vector3();
  const outAt = new THREE.Vector3();
  /**
   * Aiming by a corner (touch): with the view straight ahead blocked close by,
   * the side it's clear from a lean out to (1 his right, -1 his left, 0 neither)
   */
  function cornerSide() {
    headAt.set(pos.x, pos.y + 1.0 * SCALE, pos.z);
    lookDir.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    if (cameraRoom(headAt, lookDir, CORNER.near + 0.15, 0) >= CORNER.near) return 0;
    for (const sgn of [1, -1]) {
      sideDir.set(Math.cos(yaw) * sgn, 0, -Math.sin(yaw) * sgn);
      if (cameraRoom(headAt, sideDir, CORNER.side + 0.15, 0) < CORNER.side) continue;
      outAt.copy(headAt).addScaledVector(sideDir, CORNER.side);
      if (cameraRoom(outAt, lookDir, CORNER.far + 0.15, 0) >= CORNER.far) return sgn;
    }
    return 0;
  }

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
    const showing = garageUI.open || hangarUI.open;
    if (showing) showFrom = hangarUI.open ? 'hangar' : 'garage';
    showroom += ((showing ? 1 : 0) - showroom) * damp(showing ? 3.5 : 6, dt);
    if (showroom < 0.003) {
      showroom = 0;
      if (viewShifted) {
        camera.clearViewOffset();
        viewShifted = false;
      }
      return;
    }
    const s = showroom * showroom * (3 - 2 * showroom);
    const v = showFrom === 'hangar' ? HANGAR_VIEW : d.garage.view;
    // Upright screens see less across: step back so the whole car fits
    const back = THREE.MathUtils.clamp(1.15 / camera.aspect, 1, 1.9);
    camera.position.lerp(showEye.copy(v.eye).sub(v.at).multiplyScalar(back).add(v.at), s);
    lookAt.lerp(v.at, s);
    camera.lookAt(lookAt);
    hero.g.visible = true;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const c = canvas.getBoundingClientRect();
    const r = (showFrom === 'hangar' ? hangarUI.panel : garageUI.panel).getBoundingClientRect();
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
    driven += drive.update(dt, { throttle, steer, handbrake: jumpHeld || padDrive.handbrake });
    // Every ten tiles the distance goes on the save's counters (missions watch them)
    if (driven >= 10) {
      count(d.game.save(), 'driven', Math.floor(driven));
      driven -= Math.floor(driven);
      d.game.commit();
    }
    const s = drive.state!;
    pos.set(s.x, groundAt(s.x, s.z), s.z);
    speedNow = Math.hypot(s.vx, s.vz);
    hero.g.visible = hero.ring.visible = false;
    // The rest of the city carries on (drones, dummies)
    combat.update(dt, t, false);
    combat.view(dt, t, { firstPerson: false, aim: false, move: 0, phase: 0, run: 0, air: 0 });
    // The prompt: Get out
    const want = { id: 'car' as const, label: root.classList.contains('on-bike') ? 'Get off' : 'Get out' };
    if (near?.id !== want.id) {
      near = want;
      prompt.hidden = false;
      prompt.querySelector('[data-walk-label]')!.textContent = near.label;
    }
  }

  /** On the water in the hire boat: steer and throttle as in the car; Get out once it lies stopped alongside a landing */
  function boatFrame(dt: number, t: number) {
    const k = (a: string, b: string) => (keys.has(a) || keys.has(b) ? 1 : 0);
    let steer = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
    let throttle = k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown');
    if (joy.id >= 0) {
      steer = joy.x;
      if (!pedals.gas && !pedals.brake) throttle = -joy.y;
    }
    if (pedals.gas || pedals.brake) throttle = (pedals.gas ? 1 : 0) - (pedals.brake ? 1 : 0);
    if (padDrive.steer) steer = padDrive.steer;
    if (padDrive.throttle) throttle = padDrive.throttle;
    const b = boat!;
    b.update(dt, { throttle, steer });
    const s = b.state;
    pos.set(s.x, WATER_Y + 0.5, s.z);
    speedNow = Math.hypot(s.vx, s.vz);
    hero.g.visible = hero.ring.visible = false;
    combat.update(dt, t, false);
    combat.view(dt, t, { firstPerson: false, aim: false, move: 0, phase: 0, run: 0, air: 0 });
    const want = b.canLeave ? { id: 'boat' as const, label: 'Get out' } : null;
    if (near?.id !== want?.id) {
      near = want;
      prompt.hidden = !near;
      if (near) prompt.querySelector('[data-walk-label]')!.textContent = near.label;
    }
  }

  /**
   * Riding (a taxi or the metro, growth plan Phase 8): the ride moves Degen (hidden in it) and its own
   * camera; the keys and the stick wait, the rest of the city carries on
   */
  let ride: Ride | null = null;
  function rideFrame(dt: number, t: number) {
    const r = ride!;
    const at = r.update(dt, t);
    // (the ride may have ended this frame and stood Degen at its end)
    if (ride !== r) return;
    pos.set(at.x, at.y ?? groundAt(at.x, at.z), at.z);
    vel.set(0, 0);
    speedNow = 0;
    hero.g.visible = hero.ring.visible = false;
    combat.update(dt, t, false);
    combat.view(dt, t, { firstPerson: false, aim: false, move: 0, phase: 0, run: 0, air: 0 });
    if (near) {
      near = null;
      prompt.hidden = true;
    }
  }

  /** In your aircraft: the stick turns and climbs, the pedals (or W / S) go faster and slower */
  function flyFrame(dt: number, t: number) {
    const k = (a: string, b: string) => (keys.has(a) || keys.has(b) ? 1 : 0);
    let turn = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
    let throttle = k('KeyW', 'KeyW') - k('KeyS', 'KeyS');
    let climb = (keys.has('ArrowUp') || jumpHeld ? 1 : 0) - (keys.has('ArrowDown') || keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyC') ? 1 : 0);
    if (joy.id >= 0) {
      turn = joy.x;
      climb = -joy.y;
    }
    if (pedals.gas || pedals.brake) throttle = (pedals.gas ? 1 : 0) - (pedals.brake ? 1 : 0);
    if (padFly.turn) turn = padFly.turn;
    if (padFly.climb) climb = padFly.climb;
    if (padFly.throttle) throttle = padFly.throttle;
    fly.update(dt, { throttle, turn, climb });
    const s = fly.state;
    pos.set(s.x, groundAt(s.x, s.z), s.z);
    speedNow = Math.hypot(s.vx, s.vz);
    hero.g.visible = hero.ring.visible = false;
    // The rest of the city carries on
    combat.update(dt, t, false);
    combat.view(dt, t, { firstPerson: false, aim: false, move: 0, phase: 0, run: 0, air: 0 });
    // The prompt: Get out once it's down and stopped
    const want = fly.canLeave ? { id: 'plane' as const, label: 'Get out' } : null;
    if (near?.id !== want?.id) {
      near = want;
      prompt.hidden = !near;
      if (near) prompt.querySelector('[data-walk-label]')!.textContent = near.label;
    }
  }

  /** In the ring: the fight takes the stick and the buttons, in your facing's frame */
  function fightFrame(dt: number, t: number) {
    const k = (a: string, b: string) => (keys.has(a) || keys.has(b) ? 1 : 0);
    let right = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
    let fwd = k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown');
    if (joy.id >= 0) {
      right = joy.x;
      fwd = -joy.y;
    } else if (padFight.x || padFight.y) {
      right = padFight.x;
      fwd = -padFight.y;
    }
    const inp: FightInput = { fwd, right, punch: fightBtns.punch, kick: fightBtns.kick, block: fightBtns.block || padFight.block, dodge: fightBtns.dodge };
    fightBtns.punch = fightBtns.kick = fightBtns.dodge = false;
    fight!.update(dt, inp);
    const you = fight!.sim?.fighter('you');
    if (you) {
      pos.set(you.x, groundAt(you.x, you.z), you.z);
      speedNow = you.moving * 3;
    }
    hero.g.visible = hero.ring.visible = false;
    // The rest of the city carries on (drones, dummies)
    combat.update(dt, t, false);
    combat.view(dt, t, { firstPerson: false, aim: false, move: 0, phase: 0, run: 0, air: 0 });
    if (near) {
      near = null;
      prompt.hidden = true;
    }
  }

  /** In the kart: the sim takes the pedals, the stick and the buttons; the view does the rest */
  function kartFrame(dt: number, t: number) {
    const k = (a: string, b: string) => (keys.has(a) || keys.has(b) ? 1 : 0);
    let steer = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
    let throttle = k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown');
    if (joy.id >= 0) {
      steer = joy.x;
      if (!pedals.gas && !pedals.brake) throttle = -joy.y;
    }
    if (pedals.gas || pedals.brake) throttle = (pedals.gas ? 1 : 0) - (pedals.brake ? 1 : 0);
    if (padKart.steer) steer = padKart.steer;
    if (padKart.throttle) throttle = padKart.throttle;
    const inp: KartInput = { throttle, steer, drift: jumpHeld || kartBtns.drift || padKart.drift };
    karts.update(dt, inp);
    const p = karts.sim?.player;
    if (p) {
      pos.set(p.x, p.y, p.z);
      speedNow = p.speed;
    }
    hero.g.visible = hero.ring.visible = false;
    // The rest of the city carries on
    combat.update(dt, t, false);
    combat.view(dt, t, { firstPerson: false, aim: false, move: 0, phase: 0, run: 0, air: 0 });
    if (near) {
      near = null;
      prompt.hidden = true;
    }
  }

  function update(dt: number, t: number) {
    if (!active) return;
    pollPad(dt);
    kartUI.update(dt);
    fightUI.update(dt);
    if (ride) return rideFrame(dt, t);
    partners?.update(dt, pos.x, pos.z, sparWith);
    if (fighting()) return fightFrame(dt, t);
    if (karts.active) return kartFrame(dt, t);
    if (!kartLoad && nearKarts(pos.x, pos.z)) void loadKarts();
    karts.idle(dt);
    if (boat?.active) return boatFrame(dt, t);
    if (fly.active) return flyFrame(dt, t);
    fly.idle(dt);
    if (drive.active) return driveFrame(dt, t);
    // Liberty Bridge's gates shutting while he's out on its leaves: he's walked back through to the nearer tower
    if (pos.y > LOW_Y - 0.4 && pos.y < LOW_Y + 1.5 && onLeaves(pos.x, pos.z) && !leavesOpen()) {
      const i = pos.z < (FACES[0] + FACES[1]) / 2 ? 0 : 1;
      pos.set(LIBERTY_X + THREE.MathUtils.clamp(pos.x - LIBERTY_X, -1.1, 1.1), LOW_Y + 0.035, FACES[i] - TO_MIDDLE[i] * 0.8);
      vel.set(0, 0);
      d.game.toast('Liberty Bridge · The leaves are lifting for the tall ship', 3500);
    }

    // What the player wants, in camera space
    let ix = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    let iz = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    let sprint = sprintLock || keys.has('ShiftLeft') || keys.has('ShiftRight') || pad.run;
    if (joy.id >= 0) {
      ix = joy.x;
      iz = -joy.y;
      sprint ||= Math.hypot(joy.x, joy.y) > 0.9;
    } else if (pad.x || pad.y) {
      ix = pad.x;
      iz = -pad.y;
      sprint ||= Math.hypot(pad.x, pad.y) > 0.95;
    }
    // (a moment under way: the keys wait; seated, pushing the stick stands him up)
    if (moments.active) {
      if (moments.phase === 'hold' && moments.mark?.kind === 'bench' && Math.hypot(ix, iz) > 0.3) moments.release();
      ix = iz = 0;
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
    // Peeking: Q / E, the gamepad's lean, or on touch aiming by a corner; as far out as there's room for
    cornerIn -= dt;
    if (aimNow && lastPointer === 'touch') {
      if (cornerIn <= 0) {
        cornerIn = CORNER.every;
        cornerLean = cornerSide();
      }
    } else cornerLean = 0;
    const peekWant = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0) || padLean || cornerLean;
    let leanRoom = 0;
    if (peekWant) {
      headAt.set(pos.x, pos.y + 1.0 * SCALE, pos.z);
      sideDir.set(Math.cos(yaw) * peekWant, 0, -Math.sin(yaw) * peekWant);
      leanRoom = THREE.MathUtils.clamp(cameraRoom(headAt, sideDir, PEEK.cam + 0.15, 0) / PEEK.cam, 0, 1);
    }
    peek += (peekWant * leanRoom - peek) * (1 - Math.exp((-Math.LN2 * dt) / PEEK.ease));
    if (Math.abs(peek) < 1e-4) peek = 0;
    // (sprinting stands him up out of a crouch)
    if (crouched && sprint && mag > 0.1 && !slide) crouched = false;
    // Fists on the street (brawl.ts): the fight's moves timed for him, from the presses (the touch buttons, the
    // mouse, G, the pad) gathered in fightBtns; anything else in his hands, or anything else on, and they stop
    // (a style bought or picked at the trainer: the fists in it from his next move)
    const style = d.game.save().fight.style;
    if (fists && fistsMod && !fists.brawl.move && fists.style !== style) fists = fistsMod.createStreetFists(style);
    const fistsOn = fistsReady() && !moments.active && !over && !slide;
    if (!fistsOn && fists && (fists.brawl.up || fists.brawl.move)) fists.brawl.cancel();
    const fistStep = fistsOn
      ? fists!.brawl.step(dt, pos.x, pos.z, face, { punch: fightBtns.punch, kick: fightBtns.kick, dodge: fightBtns.dodge, block: fightBtns.block || mouseBlock || padBlock, sprinting: sprint && mag > 0.1, dx: dirX, dz: dirZ })
      : null;
    if (!fighting()) fightBtns.punch = fightBtns.kick = fightBtns.dodge = false;
    const guardUp = fistsOn && fists!.brawl.up;
    const rooted = fistsOn && fists!.brawl.rooted;
    if (fistsOn !== fistsShown) {
      fistsShown = fistsOn;
      root.classList.toggle('is-fists', fistsOn);
    }
    // (up stairs a climb's pace: the stairs takes' walking, a brisk climb running; movesim.ts STAIRS)
    const climbing = mag > 0.1 && climbAhead(groundAt, pos.x, pos.z, pos.y, dirX, dirZ, SCALE);
    // (brushing something the step hitches: contact.ts)
    const hitch = contact && contactMod ? contactMod.CONTACT.hitch * contact.state.hitch : 0;
    const top = Math.min(shooting ? AIMING : sprint ? SPRINT : walkLock ? WALK : RUN, crouched ? CROUCH.speed : Infinity, climbing ? (walkLock ? STAIRS.walk : STAIRS.run) : Infinity, carrying ? RUN * MOMENT.crate.slow : Infinity, guardUp && fists!.brawl.blocking ? fistsMod!.BRAWL.blockSpeed : Infinity) * (1 - (1 - PEEK.slow) * Math.abs(peek)) * (1 - hitch);

    // Towards it on the springs (movesim.ts; hardly any control in the air), facing where he's
    // going, or where you look when aiming / in first person; a moment's approach walks him onto its mark
    const mg = moments.update({ dt, x: pos.x, z: pos.z, face, speed: vel.length() });
    // Getting into your car: its door swings open as the hand comes to the handle (and shuts again if he never gets in)
    const bm = moments.mark;
    if (bm?.kind === 'board' && bm.side !== undefined && bm !== swungFor && moments.phase === 'play' && moments.u >= (bm.fireAt ?? 1) * HAND_ON) {
      swungFor = bm;
      drive.swing(pos.x, pos.z, bm.side, 2.5);
    }
    // (sitting down he turns his back to the bench, where the camera would be: it comes round to his front-left,
    // a three-quarter view of him on the bench, and is yours again once he's seated)
    if (moments.active && moments.mark?.kind === 'bench' && (moments.phase === 'approach' || moments.phase === 'play')) yaw += wrap(benchYaw - yaw) * damp(4, dt);
    // (a kick or the dodge: he stands for it; the guard up, he faces where you look, as aiming)
    const gx = mg ? mg.dx * mg.speed : rooted ? 0 : dirX * top;
    const gz = mg ? mg.dz * mg.speed : rooted ? 0 : dirZ * top;
    const lookFace = yaw + Math.PI;
    const faceGoal = mg ? (mg.face ?? undefined) : aim || firstPerson || shooting || peekWant || guardUp ? lookFace : undefined;
    ms.vx = vel.x;
    ms.vz = vel.y;
    ms.face = face;
    hitWall = false;
    hitSpeed = 0;
    if (over) {
      // Over something low: along the way over, his feet over its top (vault.ts), the springs carried along
      over.t += dt;
      const u = Math.min(1, over.t / over.o.dur);
      const at = onFoot!.overAt(over.o, u, over.g0, over.g1);
      vel.set((at.x - pos.x) / dt, (at.z - pos.z) / dt);
      pos.set(at.x, at.y, at.z);
      ms.vx = vel.x;
      ms.vz = vel.y;
      ms.ax = ms.az = ms.w = 0;
      ms.face = over.o.dir;
      if (u >= 1) {
        // (down: on at a run with the stick pushed, at most as fast as he came at it; else stopping)
        const v = Math.hypot(gx, gz) > 0.01 ? Math.min(over.v, RUN) : 0.4;
        ms.vx = Math.sin(over.o.dir) * v;
        ms.vz = Math.cos(over.o.dir) * v;
        vel.set(ms.vx, ms.vz);
        overLast = over.o;
        over = null;
      }
    } else {
      if (slide) {
        // (a slide carries him on, slowing; when it's done he runs on with the stick pushed, or stays down in a crouch)
        if (!stepSlide(slide, ms, gx, gz, dt) || !grounded) {
          slide = null;
          crouched = Math.hypot(gx, gz) < 0.01;
        }
      } else {
        // (a stagger (contact.ts): thrown back from the wall over its time, the stick waiting)
        const stag = contact?.state.stagger;
        stepMove(ms, stag ? 0 : gx, stag ? 0 : gz, grounded, dt, faceGoal);
        if (stag && contactMod) {
          const k = contactMod.CONTACT.stagger;
          const v = (k.back / k.t) * (Math.PI / 2) * Math.sin(Math.PI * stag.t);
          ms.vx = stag.hand.nx * v;
          ms.vz = stag.hand.nz * v;
        }
      }
      vel.set(ms.vx, ms.vz);
      const v0 = vel.length();
      // (getting into your car at home, the approach steps onto the turntable)
      const skip = moments.active && moments.mark?.kind === 'board' && moments.mark.side !== undefined ? isTurntable : undefined;
      const stuck = blocked(pos.x, pos.z, pos.y, skip);
      const nx = pos.x + vel.x * dt;
      if (stuck || !blocked(nx, pos.z, pos.y, skip)) pos.x = nx;
      else vel.x = 0;
      const nz = pos.z + vel.y * dt;
      if (stuck || !blocked(pos.x, nz, pos.y, skip)) pos.z = nz;
      else vel.y = 0;
      hitWall = !slide && grounded && (vel.x !== ms.vx || vel.y !== ms.vz);
      hitSpeed = hitWall ? v0 : 0;
      // (a slide into something stops there, crouched)
      if (slide && (vel.x !== ms.vx || vel.y !== ms.vz)) {
        slide = null;
        crouched = true;
      }
    }
    // What the fists' moves move him themselves (a strike's step in, a dodge's slide), through the same walls
    if (fistStep && (fistStep.dx || fistStep.dz)) {
      const nx = pos.x + fistStep.dx;
      if (!blocked(nx, pos.z, pos.y)) pos.x = nx;
      const nz = pos.z + fistStep.dz;
      if (!blocked(pos.x, nz, pos.y)) pos.z = nz;
    }
    // ...and what they do: the whoosh of a swing (the crowd near it steps aside), a strike landing on a dummy or
    // a drone in front of him (combat-sim `melee()`: its hit and takedown are combat.ts's to show), out of breath
    if (fistStep)
      for (const e of fistStep.events) {
        if (e.kind === 'swing' || e.kind === 'dodge') {
          d.sfx('whoosh', e.kind === 'swing' ? 0.5 : 0.35);
          if (e.kind === 'swing') {
            swing.x = pos.x + Math.sin(face) * 0.6;
            swing.z = pos.z + Math.cos(face) * 0.6;
            swing.r = fistsMod!.MOVES[e.move].reach + fistsMod!.BRAWL.crowd;
            swing.t = 0.4;
          }
        } else if (e.kind === 'strike') {
          // (three landing close together on a dummy: a street chain, for the mission)
          if (fists!.brawl.landed(combat.melee(e.move, pos.x, pos.y, pos.z, face))) {
            count(d.game.save(), 'streetChains', 1);
            d.game.commit();
            d.game.toast('Chain of three!', 1500);
          }
        }
        else if (e.kind === 'tired' && performance.now() - tiredAt > 4000) {
          tiredAt = performance.now();
          d.game.toast('Out of breath: let him get it back for a moment.', 2200);
        }
      }
    const speed = vel.length();

    face = ms.face;
    // Seated (moments.ts): the root on the seat, down to it
    {
      const rs = moments.root();
      if (rs) {
        pos.x = rs.x;
        pos.z = rs.z;
        vel.set(0, 0);
        ms.vx = ms.vz = 0;
        momentDy = rs.y - pos.y;
      } else momentDy = 0;
    }

    // Jumping: buffered presses, a little coyote time, release early for a short hop
    coyote = grounded ? 0.12 : coyote - dt;
    // (Jump going at something low goes over it instead: vault.ts)
    if (!over && jumpBuffer > 0 && coyote > 0 && grounded && mag > 0.3) {
      const o = tryOver(Math.atan2(dirX, dirZ));
      if (o) {
        over = o;
        jumpBuffer = 0;
        crouched = false;
        slide = null;
      }
    }
    if (!over && jumpBuffer > 0 && coyote > 0) {
      vy = JUMP;
      grounded = false;
      coyote = jumpBuffer = 0;
      // (out of a crouch or a slide, up)
      crouched = false;
      slide = null;
    }
    // (the press waits a moment for the ground: counted down after it's looked at, so a slow frame can't lose it)
    jumpBuffer -= dt;
    if (over) vy = 0;
    else {
      vy -= (GRAVITY + (!jumpHeld && vy > 0 ? 16 : 0)) * dt;
      pos.y += vy * dt;
    }
    const ground = groundAt(pos.x, pos.z, pos.y + 0.3);
    const fall = vy;
    const wasGrounded = grounded;
    // Down a slope (Crestmont's hills) he keeps his feet rather than stepping off into the air at every stride
    if (wasGrounded && vy <= 0 && !over && pos.y > ground && pos.y - ground < 0.05 + speed * dt * 0.9 && onHills(pos.x, pos.z)) pos.y = ground;
    if (pos.y <= ground) {
      // Kerbs: step up smoothly rather than pop
      pos.y = pos.y < ground - 0.05 ? pos.y + (ground - pos.y) * damp(20, dt) : ground;
      vy = 0;
      grounded = true;
    } else if (pos.y > ground + 0.04) grounded = false;

    // A hard landing at a run plays the procedural roll before the motion capture takes him back (it
    // lands everything else itself: animator.ts); the camera dips with every landing and shakes with a hard one
    if (grounded && !wasGrounded) {
      if (-fall > LAND_ROLL && speed > 2) landHold = 0.75;
      else if (!animator && -fall > LAND_CROUCH) landHold = 0.5;
      if (!d.reduced && !firstPerson) {
        dipV -= 31 * 0.16 * THREE.MathUtils.clamp((-fall - 2) / 8, 0, 1);
        if (-fall > LAND_CROUCH) {
          shakeT = LAND_SHAKE;
          shakeK = 0.035 * THREE.MathUtils.clamp((-fall - LAND_CROUCH) / (LAND_ROLL - LAND_CROUCH), 0.3, 1);
        }
      }
    }
    landHold = Math.max(0, landHold - dt);

    // Animation: the feet planted as he goes (locomotion.ts), then emotes, the gun and the head on top
    // (runAmt: how far into a sprint)
    runAmt += (THREE.MathUtils.clamp((speed - RUN) / (SPRINT - RUN), 0, 1) - runAmt) * damp(8, dt);
    air += ((grounded ? 0 : 1) - air) * damp(12, dt);
    loco.update({ dt, t, x: pos.x, y: pos.y, z: pos.z, vx: vel.x, vz: vel.y, face, grounded, vy: grounded ? fall : vy, scale: SCALE, ground: groundAt, armed: combat.armed });
    phase = loco.phase;
    const stride = Math.min(1, speed / RUN);
    const P = hero.pose;
    copyPose(loco.pose, P);
    speedNow = speed;
    if (emote) {
      emote.t += dt;
      if (!onFoot || onFoot.emoteOver(emote.id, emote.t) || speed > 0.6) emote = null;
      // (emotes.ts: the wave, the cheer and the salute take only his upper body, over the captured legs and hips
      // through the upper mask below; the dance takes everything, the motion capture stepping aside)
      else if (!combat.armed) onFoot.emotePose(P, emote.id, emote.t);
    }
    const dancing = !!emote && !!onFoot && !combat.armed && !onFoot.emoteUpper(emote.id);
    const emoting = !!emote && !combat.armed && !dancing;
    // Fists: the fight's clip on him (brawl.ts), the guard, a punch and the block on the upper body over the walk,
    // a kick and the dodge on all of him (the motion capture stepping aside for those, as for the dance)
    guardAmt += ((guardUp ? 1 : 0) - guardAmt) * damp(guardUp ? 14 : 6, dt);
    wholeAmt += ((rooted ? 1 : 0) - wholeAmt) * damp(rooted ? 22 : 10, dt);
    if (fists) fists.lay(P, guardAmt, wholeAmt);
    // The slide's pose, blended in quickly and out a little slower (the motion capture steps aside for it)
    slideAmt += ((slide ? 1 : 0) - slideAmt) * damp(slide ? 18 : 9, dt);
    crouchAmt += ((crouched ? 1 : 0) - crouchAmt) * damp(10, dt);
    if (crouchBtn.ariaPressed !== String(crouched)) crouchBtn.setAttribute('aria-pressed', String(crouched));
    slidePose(P, slideAmt);
    // ...and going over something low, its keyed pose with the hands planted on its top (blended out from its end)
    overAmt += ((over ? 1 : 0) - overAmt) * damp(over ? 30 : 8, dt);
    const ov = over?.o ?? overLast;
    if (ov && onFoot && overAmt > 0.01) onFoot.overPose(P, ov, over ? Math.min(1, over.t / over.o.dur) : 1, overAmt, pos.x, pos.y, pos.z, face, SCALE);
    // ...and a moment's keyed pose (the door push, the lean on the counter, the sit), the motion capture stepping aside
    momentAmt += ((moments.posing ? 1 : 0) - momentAmt) * damp(moments.posing ? 12 : 8, dt);
    if (momentAmt > 0.01 && onFoot) onFoot.momentPose(P, moments, momentAmt, pos.x, pos.y + momentDy, pos.z, face, SCALE, t);
    // ...and a crate in both hands on the walk between a pick and a put (the hold has the arms, as a gun does)
    carryAmt += ((carrying && crateUp && !moments.posing ? 1 : 0) - carryAmt) * damp(10, dt);
    if (carryAmt > 0.01 && onFoot) onFoot.carryPose(P, carryAmt, pos.x, pos.y, pos.z, face, SCALE);
    // The crate itself: on the ground at the mark, in his hands, or on its way between
    if (carrying) {
      const mk = moments.mark;
      const inMoment = moments.active && (mk?.kind === 'pick' || mk?.kind === 'put');
      const c = !onFoot ? null : inMoment ? onFoot.crateAt(moments, pos.x, pos.y, pos.z, face, SCALE) : crateUp ? onFoot.carriedAt(pos.x, pos.y, pos.z, face, SCALE) : null;
      crate.visible = !!c;
      if (c) {
        crate.position.set(c.x, c.y, c.z);
        crate.rotation.y = inMoment ? mk!.face : face;
      }
      if (carrying.stage === 'pick' && crateUp) carrying.stage = 'carry';
      else if (carrying.stage === 'put' && !moments.active) {
        const done = carrying.done;
        dropCrate();
        done();
      }
    }
    // Recoil kicks the view up a touch; the rifle rides the shoulder
    const kick = combat.update(dt, t, aimNow);
    if (kick) {
      pitch = Math.max(firstPerson ? -1.35 : -0.55, pitch - kick);
      recoil = Math.min(0.04, recoil + kick);
    }
    recoil = Math.max(0, recoil - dt * 0.35);
    aimAmt += ((shooting ? 1 : 0) - aimAmt) * damp(14, dt);
    if (hero.held) hero.held.visible = (hotbar ? hotbar.heldOut : !combat.armed) && !carrying;
    hotbar?.update();
    // Both hands on the gun (after walking and jumping have posed the arms)
    const gunInHand = combat.geared && combat.poseGun(P, { aim: aimAmt, pitch, recoil, run: runAmt, dt });
    if (!gunInHand && aim && !carrying) Object.assign(P.arms[1], { fwd: 1.45, out: 0.05, bend: 0.15, twist: 0 });
    // The head follows the camera: turns towards where you look, tilts up and down
    const lookYaw = THREE.MathUtils.clamp(wrap(lookFace - face), -0.9, 0.9);
    headYaw += ((speed < 0.25 || aim ? lookYaw : 0) - headYaw) * damp(8, dt);
    headPitch += (THREE.MathUtils.clamp((0.35 - pitch) * 0.6, -0.45, 0.55) - headPitch) * damp(8, dt);
    // The gaze: his head drawn to people passing, cars going by and the way he's about to turn, and a
    // look round by himself standing (gaze.ts); the camera's own look wins over it standing or aiming
    camStill = Math.abs(wrap(yaw - lastYaw)) > 0.002 ? 0 : camStill + dt;
    lastYaw = yaw;
    interests.length = 0;
    for (const p of bodies.people) if (Math.abs(p.x - pos.x) < 8 && Math.abs(p.z - pos.z) < 8) interests.push({ x: p.x, z: p.z, y: pos.y + 1.1 * SCALE, kind: 'person', moving: p.act === undefined, id: `p${p.x.toFixed(1)},${p.z.toFixed(1)}` });
    for (const c of bodies.cars) if (Math.abs(c.x - pos.x) < 8 && Math.abs(c.z - pos.z) < 8) interests.push({ x: c.x, z: c.z, y: pos.y + 0.6, kind: 'car', weight: 0.7, moving: true, id: `c${c.model}${Math.round(c.x)},${Math.round(c.z)}` });
    const gaz = gaze ? gaze.update({ dt, x: pos.x, y: pos.y + 1.1 * SCALE, z: pos.z, face: animator ? animator.face : face, ahead: face, speed, interests }) : STILL_GAZE;
    const gazeW = combat.armed || aim ? 0 : speed < 0.25 ? 1 - Math.min(1, Math.abs(lookYaw) / 0.35) : 1;
    lookAround += (gaz.yaw * gazeW - lookAround) * damp(10, dt);
    gazePitch += (gaz.pitch * gazeW - gazePitch) * damp(10, dt);
    // (on top of the locomotion's own: the head kept steady while the body turns and leans under it;
    // with his cheek on a rifle's stock the head is the gun's)
    const free = gunInHand ? 1 - combat.cheek : 1;
    P.headYaw += (headYaw + lookAround) * free;
    P.headPitch += (headPitch + gazePitch) * free;
    // The hands on the motion capture: as the playing take closes them (animator.ts GRIP), unless something's in them
    if (animator && mocapW > 0 && !P.grip) {
      const g = RELAXED + (animator.grip - RELAXED) * mocapW;
      P.grip = [g, hero.held?.visible ? Math.max(g, HOLDING) : g];
    }
    hero.update();
    // On foot, unarmed and not showing off, the motion capture: blended in and out over a moment
    if (!animator && !animLoading) {
      animLoading = true;
      Promise.all([import('./animator'), import('./contact'), loadMocap(), import('./onfoot')]).then(
        ([m, cm, data, of]) => {
          anim = m;
          onFoot = of;
          gaze ??= of.createGaze(11);
          mocapData = data;
          animator = m.createAnimator(data);
          contactMod = cm;
          contact = cm.createContact({ hands: !d.low });
          contactRot = new Float32Array(animator.rot.length);
        },
        // (it can be tried again: the procedural walk carries on meanwhile)
        () => (animLoading = false),
      );
    }
    let drawFace = face;
    // ...with a gun in his hands or an arm out aiming, only its legs and hips: his own pose over them
    const mocapOn = !!animator && landHold <= 0 && !dancing && !slide && !over && !moments.posing && wholeAmt < 0.5;
    upperW = THREE.MathUtils.clamp(upperW + (gunInHand || aim || carryAmt > 0.01 || emoting || guardAmt > 0.05 ? dt / 0.15 : -dt / 0.15), 0, 1);
    if (animator && anim) {
      // (a fresh start after a jump in place: walking started, a fast travel, the end of a ride)
      if ((mocapW < 0.01 && mocapOn) || lastPos.distanceToSquared(pos) > 4) {
        animator.reset();
        contact?.reset();
        headFollow.reset();
      }
      // (over a quarter second back in, less going out so a slide or an emote still answers at once: quicker, the two poses swapped with a jolt)
      mocapW = THREE.MathUtils.clamp(mocapW + (mocapOn ? dt / 0.25 : -dt / 0.15), 0, 1);
      if (mocapW > 0) {
        const w = mocapW * mocapW * (3 - 2 * mocapW);
        const u = upperW * upperW * (3 - 2 * upperW);
        animator.update({ dt, x: pos.x, y: pos.y, z: pos.z, move: ms, gx, gz, scale: SCALE, ground: groundAt, feet: groundAt, sprint: runAmt, grounded, vy: grounded ? fall : vy, jump: JUMP, gravity: GRAVITY, faceGoal, crouch: crouchAmt });
        // (shown facing the way the motion capture turns him; his own upper body turned back to the springs' facing)
        drawFace = face + wrap(animator.face - face) * mocapW;
        // Contact (contact.ts): on the pose before the figure takes it, not with a gun in his hands (the hold has the arms)
        let rot: Float32Array = animator.rot;
        if (contact && contactMod && contactRot && !moments.active && !carrying) {
          contactBoxes.length = 0;
          SOLID_GRID.near(pos.x, pos.z, 1.2, contactBoxes);
          for (const b of d.placedSolids()) if (b[0] - 1.2 < pos.x && pos.x < b[2] + 1.2 && b[1] - 1.2 < pos.z && pos.z < b[3] + 1.2) contactBoxes.push(b);
          contactPeople.length = 0;
          for (const p of bodies.people) if (p.act === undefined && Math.abs(p.x - pos.x) < 1.5 && Math.abs(p.z - pos.z) < 1.5) contactPeople.push(p);
          const st = contact.update({ dt, x: pos.x, y: pos.y, z: pos.z, face: drawFace, scale: SCALE, speed, moving: mag > 0.1, walls: contactBoxes, people: contactPeople, blocked: contactBlocked, hit: hitWall, hitSpeed });
          if (u < 0.5 && (st.hand || st.lean || st.stagger || st.give.w > 1e-3 || st.squeeze.w > 1e-3)) {
            contactRot.set(animator.rot);
            contactMod.applyContact(contactRot, animator.hips, st, pos.x, pos.y, pos.z, drawFace, SCALE);
            rot = contactRot;
          }
          // (a small shake as a stagger starts)
          if (st.stagger && !staggering && !d.reduced && !firstPerson) {
            shakeT = LAND_SHAKE;
            shakeK = 0.018;
          }
          staggering = !!st.stagger;
        }
        anim.applyTo(hero.rig, rot, animator.hips, w, u, face - drawFace);
        anim.addLook(hero.rig, headYaw + lookAround, headPitch * 0.5 + gazePitch, w * (1 - u));
        // Follow-through (follow.ts): the head a few frames behind the chest as it turns
        const trail = headFollow.update(dt, drawFace + anim.chestYaw(hero.rig));
        if (!firstPerson) anim.addLook(hero.rig, trail, 0, w * (1 - u));
        // (anything in his hand held out in front of it, clear of his leg)
        if (hero.held?.visible) anim.addCarry(hero.rig, w * (1 - u));
      }
      root0.roll = loco.root.roll * (1 - mocapW);
      root0.pitch = loco.root.pitch * (1 - mocapW);
      root0.pivot = loco.root.pivot;
    }
    // The peek: the upper body out over the hips towards where you look, the head kept level (less so with his cheek on a stock)
    if (peek && anim) anim.addLean(hero.rig, peek * PEEK.lean, wrap(lookFace - drawFace), PEEK.level * (1 - 0.6 * (gunInHand ? combat.cheek : 0)));
    lastPos.copy(pos);
    placeRoot(hero.g, pos.x, pos.y + momentDy, pos.z, animator ? drawFace : face, SCALE, animator ? root0 : loco.root);
    hero.ring.position.set(pos.x, ground + 0.02, pos.z);
    (hero.ring.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - air * 0.6);

    // Camera: over the shoulder, pulled in when something's in the way
    // Armed, he steps further left of the crosshair so it never sits on his head
    armAmt += ((combat.armed ? 1 : 0) - armAmt) * damp(6, dt);
    const shoulder = firstPerson ? 0 : THREE.MathUtils.clamp(1 - zoom / 10, 0, 1) * 0.38 + armAmt * 0.42;
    // (a peek takes it out with him: further over his right shoulder, or across to his left; never into a wall beside him)
    let lateral = firstPerson ? peek * PEEK.eye : shoulder + peek * (peek > 0 ? PEEK.cam : 2 * shoulder + PEEK.cam);
    // (lower crouched, lower still sliding)
    const eyeY = pos.y + momentDy + ((firstPerson ? 1.2 : 1.0) - crouchAmt * CROUCH.cam - slideAmt * CROUCH.slideCam) * SCALE + 0.05;
    if (Math.abs(lateral) > 0.01) {
      const sgn = Math.sign(lateral);
      headAt.set(pos.x, eyeY, pos.z);
      sideDir.set(Math.cos(yaw) * sgn, 0, -Math.sin(yaw) * sgn);
      lateral = sgn * Math.min(Math.abs(lateral), cameraRoom(headAt, sideDir, Math.abs(lateral) + 0.15, 0));
    }
    pivotWant.set(pos.x + Math.cos(yaw) * lateral, eyeY, pos.z - Math.sin(yaw) * lateral);
    if (pivot.lengthSq() === 0) pivot.copy(pivotWant);
    // (a sprint pulls ahead of the camera a touch; a hard stop dips it and lets it settle)
    const follow = firstPerson ? 18 : 18 - 6 * runAmt;
    pivot.x += (pivotWant.x - pivot.x) * damp(follow, dt);
    pivot.z += (pivotWant.z - pivot.z) * damp(follow, dt);
    const brake = d.reduced || firstPerson ? 0 : THREE.MathUtils.clamp(-(ms.ax * Math.sin(face) + ms.az * Math.cos(face)) / 40, 0, 1);
    [dip, dipV] = springVel(dip, dipV, -0.05 * brake, 0.12, dt);
    pivot.y += (pivotWant.y + dip - pivot.y) * damp(firstPerson ? 25 : 10, dt);
    // Looking up tilts the view but keeps the camera behind him (not down at his feet),
    // so he drops to the bottom of the frame and the sky opens up
    const camPitch = firstPerson ? pitch : Math.max(pitch, -0.12);
    offset.set(Math.sin(yaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(yaw) * Math.cos(camPitch));
    const want = firstPerson ? 0 : zoom * (aimNow ? 0.62 : 1);
    // (seated, a bench's back or anything else that low doesn't pull the camera in onto him)
    const room = firstPerson ? 0 : cameraRoom(pivot, offset, want, 0.35, seated() ? 0.9 : 0.5);
    camDist = room < camDist ? room : camDist + (room - camDist) * damp(4, dt);
    camera.position.copy(pivot).addScaledVector(offset, camDist);
    if (shakeT > 0) {
      shakeT = Math.max(0, shakeT - dt);
      const k = shakeK * (shakeT / LAND_SHAKE) ** 2;
      camera.position.x += Math.sin(shakeT * 71) * k * Math.cos(yaw);
      camera.position.z -= Math.sin(shakeT * 71) * k * Math.sin(yaw);
      camera.position.y += Math.sin(shakeT * 53 + 1) * k;
    }
    // First person, the eye rides the steps: on the motion capture its hips' rise and fall (high-passed: each
    // step's bob and a landing's squash, not the crouch, which lowers the eye itself), else the procedural walk's
    if (animator && mocapW > 0) {
      hipMean += (animator.hips.y - hipMean) * damp(2.5, dt);
      if (Math.abs(animator.hips.y - hipMean) > 0.3) hipMean = animator.hips.y;
    }
    if (firstPerson && !d.reduced) {
      const steps = Math.sin(phase * 2) * 0.025 * stride * (1 - air);
      const hips = animator ? (animator.hips.y - hipMean) * SCALE * FP_BOB : 0;
      camera.position.y += (steps * (1 - mocapW) + hips * mocapW) * (1 - combat.aimed * 0.8);
    }
    view.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    lookAt.copy(camera.position).sub(view);
    camera.lookAt(lookAt);
    // (leaning out in first person, the view tilts with his head a little)
    if (firstPerson && peek && !d.reduced) camera.rotateZ(-peek * PEEK.roll);
    // (seated, the bench and what's round it may keep the camera close: he still shows)
    hero.g.visible = !firstPerson && camDist > (seated() ? 0.3 : 0.6);
    frameShowroom(dt);
    hero.ring.visible = !firstPerson;
    combat.view(dt, t, { firstPerson, aim: aimNow, move: stride, phase, run: runAmt, air });

    // Field of view widens with speed, narrows when aiming
    const wantFov = (firstPerson ? 70 : 52) + (d.reduced ? 0 : 2 * Math.min(1, speed / RUN) + 6 * runAmt) - (aimNow ? (firstPerson && combat.armed ? combat.adsZoom : 10) : 0);
    fov += (wantFov - fov) * damp(6, dt);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // Door prompts, and the Armoury's gun store counter
    let best: { id: Near; label: string } | null = null;
    let bestD = 1.7;
    const atCounter = Math.hypot(RACK.x - pos.x, RACK.z - pos.z);
    if (atCounter < 1.1) {
      best = { id: 'gear', label: 'Gun store' };
      bestD = 0;
    }
    // ...and Trench Arms' hatch, the same store under its own name
    const atHatch = Math.hypot(ARMS.counter.x - pos.x, ARMS.counter.z - pos.z);
    if (atHatch < 1.1) {
      best = { id: 'gear', label: ARMS.name };
      bestD = 0;
    }
    if (shop.open && Math.min(atCounter, atHatch) > 2) shop.close();
    if (Math.hypot(GARAGE_SITE.door.x - pos.x, GARAGE_SITE.door.z - pos.z) < 1.3) {
      best = { id: 'garage', label: 'Garage' };
      bestD = 0;
    }
    // The kart hut's door, at the kart park
    if (!drive.active && Math.hypot(HUT_DOOR.x - pos.x, HUT_DOOR.z - pos.z) < 1.4) {
      best = { id: 'karts', label: 'Kart hut' };
      bestD = 0;
    }
    // The trainer's counter, at the Fight Club
    if (!drive.active && Math.hypot(TRAINER.x - pos.x, TRAINER.z - pos.z) < 1.4) {
      best = { id: 'trainer', label: 'Trainer' };
      bestD = 0;
    }
    // A sparring partner waiting on the street (brawlsite.ts)
    const sp = drive.active ? null : partners?.near(pos.x, pos.z);
    if (sp) {
      best = { id: `spar:${sp.id}`, label: `Spar · ${sp.name}` };
      bestD = 0;
    }
    if (!drive.active)
      // (and the snack bars, the inventory chunk's)
      for (const p of hotbar ? [...d.places(), ...hotbar.doors] : d.places())
        if (Math.hypot(p.x - pos.x, p.z - pos.z) < 1) {
          best = { id: `place:${p.id}`, label: p.label };
          bestD = 0;
        }
    // The hire boat's ladder by Downtown's landing (river plan step 4c)
    if (!drive.active && Math.hypot(HIRE.door.x - pos.x, HIRE.door.z - pos.z) < 1) {
      best = { id: 'boat', label: 'Take a boat' };
      bestD = 0;
    }
    // The hangar office's door at the airport
    if (Math.hypot(HANGAR_DOOR.x - pos.x, HANGAR_DOOR.z - pos.z) < 1.2) {
      best = { id: 'hangar', label: 'Hangar' };
      bestD = 0;
    }
    // Your car or kart, or your aircraft: whichever is nearer
    const carD = garageUI.open ? Infinity : drive.nearCar(pos.x, pos.z);
    const planeD = hangarUI.open ? Infinity : fly.near(pos.x, pos.z);
    if (Math.min(carD, planeD) < 0.75) {
      best = carD <= planeD ? { id: 'car', label: drive.nearKind(pos.x, pos.z) === 'bike' ? 'Get on' : 'Get in' } : { id: 'plane', label: `Fly the ${fly.name}` };
      bestD = 0;
    }
    for (const door of ALL_DOORS) {
      const dd = Math.hypot(door.x - pos.x, door.z - pos.z);
      if (dd < bestD) {
        bestD = dd;
        best = { id: door.id, label: root.querySelector(`[data-pin="${door.id}"] .city-pin-title`)?.textContent ?? door.id };
      }
    }
    // A free bench to sit on (moments.ts); seated, standing up
    if (seated()) best = { id: 'stand', label: 'Stand up' };
    else if (!best && !drive.active && nearestBench()) best = { id: 'bench', label: 'Sit' };
    // Carrying a crate: set it down (where it's going, or anywhere)
    if (carrying) best = carrying.stage === 'carry' ? { id: 'put', label: Math.hypot(carrying.to.x - pos.x, carrying.to.z - pos.z) < PUT_R ? (carrying.dir === 'load' ? 'Load the car' : 'Unload here') : 'Put it down' } : null;
    if (best?.id !== near?.id || best?.label !== near?.label) {
      near = best;
      prompt.hidden = !near;
      if (near) prompt.querySelector('[data-walk-label]')!.textContent = OWN_LABEL.has(near.id) || near.id.startsWith('place:') || near.id.startsWith('spar:') ? near.label : `Enter ${near.label}`;
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
    /** Flying your aircraft? */
    get flying() {
      return fly.active;
    },
    /** ...and off the ground? */
    get airborne() {
      return fly.active && !fly.state.ground;
    },
    /** In a kart at the kart park? */
    get karting() {
      return karts.active;
    },
    /** In the ring at the Fight Club? */
    get fighting() {
      return fighting();
    },
    /** Your aircraft: where it stands (home in the hangar, or wherever you landed it), or flies */
    get plane() {
      const s = fly.state;
      return { x: s.x, z: s.z, away: fly.away };
    },
    /** On foot (not driving, flying, karting, fighting or riding): free to take a taxi or travel */
    get onFoot() {
      return active && !drive.active && !fly.active && !boating() && !karts.active && !fighting() && !ride;
    },
    /** In a taxi or on the metro */
    get riding() {
      return !!ride;
    },
    /** Start a ride (on foot only: false otherwise), or end it (null: Degen stands where the ride left him) */
    setRide(r: Ride | null) {
      if (r && (ride || drive.active || fly.active || boating() || karts.active || fighting())) return false;
      ride = r;
      keys.clear();
      jumpHeld = false;
      setAim(false);
      if (r) {
        // (the ride has him: the moment that got him in is over, and a crate is put away)
        moments.cancel();
        dropCrate();
      }
      if (r && locked()) document.exitPointerLock();
      root.classList.toggle('is-riding', !!r);
      if (!r) hero.g.visible = hero.ring.visible = !firstPerson;
      return true;
    },
    /**
     * Bring my car (the world map, growth plan Phase 8): to the nearest lane round you, facing the way it
     * runs, clear of the traffic. False if you're driving it, or there's no road within reach
     */
    bringCar() {
      if (drive.active) return false;
      let best: { x: number; z: number; yaw: number; d: number } | null = null;
      for (const sp of SPOTS) {
        const d = Math.hypot(sp.x - pos.x, sp.z - pos.z);
        if (d > 45 || d < 3 || (best && d >= best.d)) continue;
        if (bodies.cars.some((c) => Math.hypot(c.x - sp.x, c.z - sp.z) < 7)) continue;
        const dir = pointOn(ROUTES[sp.r], sp.p, 0).dir;
        best = { x: sp.x, z: sp.z, yaw: Math.atan2(-dir[1], dir[0]), d };
      }
      return !!best && drive.bring(best.x, best.z, best.yaw);
    },
    /** Stand Degen somewhere else at once, looking the way he faces (fast travel, the end of a taxi or metro ride) */
    placeAt(at: { x: number; z: number; yaw: number; y?: number }) {
      if (ride || drive.active || fly.active || boating() || karts.active || fighting()) return false;
      // (`y`: up somewhere, the sky deck's floor over the slab: the lift)
      pos.set(at.x, groundAt(at.x, at.z, at.y === undefined ? 0 : SLAB + at.y), at.z);
      vel.set(0, 0);
      vy = 0;
      grounded = true;
      over = slide = null;
      moments.cancel();
      dropCrate();
      momentAmt = momentDy = 0;
      yaw = at.yaw;
      face = yaw + Math.PI;
      pitch = firstPerson ? -0.05 : 0.35;
      pivot.set(0, 0, 0);
      camDist = zoom;
      keys.clear();
      near = null;
      prompt.hidden = true;
      d.touched();
      return true;
    },
    /** Your car, if it's out of the garage: where it is, its model, and whether you're in it */
    get car() {
      const st = drive.carState;
      return st ? { x: st.x, z: st.z, yaw: st.yaw, model: drive.model, driving: drive.inCar, speed: st.speed } : null;
    },
    /** A taxi at the kerb (taxi.ts): walk him up to its door and in (moments.ts), then `go` (the ride) */
    boardAt(v: { x: number; z: number; yaw: number; W: number }, go: () => void) {
      if (!active || drive.active || fly.active || boating() || karts.active || fighting() || ride || moments.active || over || slide || emote || carrying) return false;
      contact?.reset();
      moments.start(sideMark('car', v, MOMENT.car.seat), go, pos.x, pos.z);
      return true;
    },
    /**
     * Carry a crate of goods (the business card's Load / Unload, moments.ts): from one of your places (`at`) to
     * your car's boot, or the other way; `done` moves the goods once it's set down there. False if he can't now.
     */
    carry(dir: 'load' | 'unload', at: { x: number; z: number }, done: () => void) {
      const c = drive.carState;
      if (!c || !active || drive.active || fly.active || boating() || karts.active || fighting() || ride || moments.active || over || slide || emote || carrying) return false;
      if (combat.armed) combat.toggleHolster();
      const fx = Math.cos(c.yaw);
      const fz = -Math.sin(c.yaw);
      const back = CARS[drive.model].L / 2 + 0.35;
      const boot = { x: c.x - fx * back, z: c.z - fz * back };
      let from = dir === 'load' ? at : boot;
      // (standing on the spot already: the crate just ahead of him)
      if (Math.hypot(from.x - pos.x, from.z - pos.z) < 0.6) from = { x: pos.x + Math.sin(face) * 0.6, z: pos.z + Math.cos(face) * 0.6 };
      carrying = { dir, to: dir === 'load' ? boot : at, stage: 'pick', done };
      contact?.reset();
      moments.start(crateMark('pick', from, pos.x, pos.z, groundAt(from.x, from.z, pos.y), (bx, bz) => blocked(bx, bz, pos.y)), () => (crateUp = true), pos.x, pos.z);
      return true;
    },
    onKey,
    update,
    /** The rifle and target practice (the Profile panel and multiplayer talk to it) */
    combat,
    /** Dress Degen in a new outfit (the wardrobe) */
    setLook(o: Outfit) {
      outfit = o;
      const vis = hero.g.visible;
      d.scene.remove(hero.g);
      // The gun moves to the new body; only the old body's geometry and bones go
      combat.gun.removeFromParent();
      hero.dispose();
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
    /** The motion capture and its animator module, once they're in (remote.ts: other players move on it too) */
    get motion() {
      return anim && mocapData && onFoot ? { anim, data: mocapData, onFoot } : null;
    },
    /** What other players need to see of us, for the game server */
    netState() {
      const mode: Mode = ride ? 'ride' : fly.active ? 'fly' : karts.active ? 'kart' : drive.active || boating() ? 'drive' : fighting() ? 'fight' : 'walk';
      // In a vehicle the others see it (docs/multiplayer-plan.md "What others see"): its heading and height, not his
      const v = fly.active ? fly.state : boating() ? boat!.state : karts.active ? karts.sim?.player : drive.active ? drive.state : null;
      if (!v) return { pos, face, pitch, speed: speedNow, air: !grounded, run: runAmt > 0.5, aim: aimNow, mode, gear: false };
      const y = fly.active ? fly.state.y : boating() ? WATER_Y : karts.active ? (karts.sim?.player.y ?? pos.y) : pos.y;
      netPos.set(pos.x, y, pos.z);
      return { pos: netPos, face: vehFace(v.yaw), pitch, speed: speedNow, air: fly.active && !fly.state.ground, run: false, aim: false, mode, gear: fly.active && fly.state.gear };
    },
    /** What he's in, for everyone else to draw: your car, bike or kart, your aircraft or the hire boat (null on foot or riding) */
    netVehicle(): NetVehicle | null {
      if (fly.active) {
        const p = loadPlane();
        return { k: 'plane', id: p.model, p: p.paint };
      }
      if (boating()) return { k: 'boat', id: 'hire', p: 'magenta' };
      if (karts.active) {
        const k = d.game.save().karts;
        return { k: 'kart', id: k.model, p: k.paint };
      }
      const v = drive.vehicle;
      if (!v) return null;
      if (v.kind === 'kart') return { k: 'kart', id: v.model, p: d.game.save().karts.paint };
      if (v.kind === 'bike') return { k: 'bike', id: v.model, p: loadBike().paint };
      return { k: 'car', id: v.model, p: loadCar().paint };
    },
    /** The server put us back (we moved somewhere impossible); only on foot (a car, a kart, an aircraft or a ride says where Degen is) */
    fix(x: number, y: number, z: number) {
      if (ride || drive.active || fly.active || boating() || karts.active || fighting()) return;
      pos.set(x, y, z);
      vel.set(0, 0);
    },
    /** Start walking; `spawn` puts Degen somewhere else (the kart park's gate from its panel) */
    enter(spawn?: { x: number; z: number; yaw: number }) {
      active = true;
      // A few steps back from the doors, so the arcade tower fills the view
      pos.copy(SPAWN).add(new THREE.Vector3(Math.sin(SPAWN_YAW), 0, Math.cos(SPAWN_YAW)).multiplyScalar(WALK_SPAWN.back));
      vel.set(0, 0);
      vy = 0;
      grounded = true;
      face = 0;
      yaw = SPAWN_YAW;
      crouched = false;
      slide = null;
      over = null;
      moments.cancel();
      dropCrate();
      momentAmt = momentDy = 0;
      // ?spawn=x,z[,yaw] in the address: start walking somewhere else (for checking a place on real devices)
      const at = new URLSearchParams(location.search).get('spawn')?.split(',').map(Number);
      if (at && at.length >= 2 && at.every(Number.isFinite)) {
        pos.set(at[0], groundAt(at[0], at[1]), at[1]);
        if (at.length > 2) yaw = at[2];
      }
      if (spawn) {
        pos.set(spawn.x, groundAt(spawn.x, spawn.z), spawn.z);
        yaw = spawn.yaw;
      }
      // Over the shoulder by default; V (or the Controls panel) swaps to first person
      pitch = 0.35;
      zoom = camDist = 5.2;
      pivot.set(0, 0, 0);
      setFirstPerson(false);
      baseFov = camera.fov;
      fov = camera.fov;
      hero.g.visible = hero.ring.visible = true;
      hotbar?.reset();
      void loadHotbar();
      void loadFists();
      root.dataset.mode = 'walk';
    },
    exit() {
      // Leaving walk mode on a ride: it ends where it is
      if (ride) {
        const r = ride;
        ride = null;
        r.end();
      }
      // Leaving walk mode in the car: it stays parked where it is
      if (drive.active) getOut();
      // In your aircraft: it stays where it stands if it's down, else it goes home to the hangar
      if (fly.active) {
        if (fly.canLeave) leavePlane();
        else fly.abandon(loadPlane());
      }
      hangarUI.close();
      // (the fists down)
      fists?.brawl.cancel();
      partners?.hide();
      mouseBlock = padBlock = fistsShown = false;
      guardAmt = wholeAmt = 0;
      root.classList.remove('is-fists');
      // On the water: the hire boat goes home
      boat?.abandon();
      // ...and a kart race is abandoned too
      if (karts.active) {
        kartUI.close();
        leaveKart();
      }
      kartUI.close();
      // ...and a fight (a bout is forfeited)
      if (fighting()) {
        fightUI.close();
        leaveFight();
      }
      fightUI.close();
      active = false;
      moments.cancel();
      dropCrate();
      momentAmt = momentDy = 0;
      root.classList.remove('is-fp');
      keys.clear();
      jumpHeld = mouseL = mouseR = false;
      setAim(false);
      shop.close();
      garageUI.close();
      hotbar?.close();
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
    /** Esc: close the gun store, the garage, the kart or fight menu if one is open, or abandon a kart race or a fight (true if it did) */
    closeShop() {
      return !!hotbar?.close() || shop.close() || garageUI.close() || hangarUI.close() || kartUI.close() || abandonKart() || fightUI.close() || quitFight();
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
