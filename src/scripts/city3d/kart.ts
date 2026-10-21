/*
 * The kart race on screen. kart-sim.ts holds the rules (the karts, the
 * rivals, the items, the places); this is the view: the karts and their
 * drivers placed from the sim every frame, the drift sparks, boost flames
 * and shields, the oil slicks, glow trails, gummy bombs and homing pigeons,
 * the chase camera, the sounds and the HUD (painted through kart-ui.ts),
 * and the results paid through tycoon.ts (`finishKartRace`) once you cross
 * the line. Between races it keeps one kart on show in the pits.
 *
 * - The player's kart is the save's pick with its mods (kartStatsOf); the
 *   seven rivals come from a fixed lineup (`LINEUP`: karts, paints, names
 *   and track suits), the same every time, rotated a step per cup so each
 *   cup's grid looks a little different. A time trial has no rivals.
 * - Everything the view adds is pooled and shown or hidden (never built per
 *   frame), with one material per effect kind; glowing things sit on the FX
 *   layer (`fx()`) so the ink outlines never draw across them.
 * - Under reduced motion the race still runs (it is the game) but the
 *   camera never shakes or swings in from the side, no sparks fly and the
 *   show kart stands still.
 * - The sim's yaw 0 faces +x and left raises it, which is three.js
 *   `rotation.y`, so a kart's holder takes the racer's yaw as it is. Only
 *   `exit()` speaks walk.ts's convention (forward = (sin yaw, cos yaw)).
 * - A cup runs at its own class (`CUPS[cup].cls`), a time trial at the one
 *   picked; the class tunes everyone. A cup is a series: starting one begins
 *   it in the save (`startSeries`) unless that cup's is on the go, and each
 *   finish adds its points (`seriesRace`), handed to the results card.
 * - Time trials have ghosts: your best lap on the course and class (kept in
 *   the browser, `GHOST_KEY`) and the par ghost (the rivals' brain driving
 *   the Pocket Rocket, made on demand with a headless sim and cached), two
 *   see-through karts replaying their lap from the moment you cross the
 *   line. The HUD's gap is the par ghost's time at where you are now.
 */
import * as THREE from 'three';
import { createDegen, type Degen, type Outfit } from './character';
import type { Sfx } from './combat';
import type { ClassId } from './catalog';
import { COUNTDOWN, CUPS, NO_INPUT, T, TICK, createKartSim, tune, type CupId, type KartEvent, type KartInput, type KartSim, type Racer } from './kart-sim';
import type { KartHud, KartRace, KartRaceDeps, KartResultView, KartStanding } from './kart-types';
import { COURSES, F, HUT_DOOR, along, yawAt, type Course, type CourseId } from './kartpark';
import { createKart, type Kart } from './karts';
import { fx, glowMat, glowTex, mergeMeshes, toon } from './kit';
import { KART_SPECS, PLAYER_KARTS, type KartId, type MyKart } from './mykart';
import { CAR_PAINTS, paintHex, type PaintId } from './mycar';
import { finishKartRace, kartStatsOf, parLap, recordKey, seriesRace, startSeries } from './tycoon';

/* ---------- The rivals ---------- */

/** The grid's regulars: made-up names, their karts and paints, what they wear (never the player's) */
const LINEUP: { name: string; kart: KartId; paint: PaintId; outfit: Outfit }[] = [
  { name: 'Turbo Tess', kart: 'zip', paint: 'yellow', outfit: { kind: 'track', top: '#ffd23f', bottom: '#16141f', shoes: '#f3f2f7', cap: '#16141f', capBack: true, lens: '#00eaff', build: 0.95, height: 0.97 } },
  { name: 'Big Mo', kart: 'bigwheel', paint: 'navy', outfit: { kind: 'track', top: '#2a3b66', bottom: '#2a3b66', shoes: '#16141f', beanie: '#f3f2f7', lens: '#ffd23f', build: 1.1, height: 1.03 } },
  { name: 'Zippy', kart: 'zip', paint: 'cyan', outfit: { kind: 'track', top: '#00c2ff', bottom: '#16141f', shoes: '#f3f2f7', cap: '#00c2ff', lens: '#ff2fb9', build: 0.9, height: 0.95 } },
  { name: 'Lil Nitro', kart: 'rocket', paint: 'pink', outfit: { kind: 'track', top: '#ff6ad5', bottom: '#3a3a48', shoes: '#ff6ad5', beanie: '#16141f', lens: '#00eaff', build: 0.92, height: 0.94 } },
  { name: 'Dozer', kart: 'tank', paint: 'green', outfit: { kind: 'track', top: '#1fbf6b', bottom: '#16141f', shoes: '#16141f', beanie: '#1fbf6b', lens: '#ffd23f', build: 1.08, height: 1.02 } },
  { name: 'Skids', kart: 'rocket', paint: 'orange', outfit: { kind: 'track', top: '#ff8a3d', bottom: '#4a4a5a', shoes: '#f3f2f7', cap: '#ff8a3d', capBack: true, lens: '#00eaff', build: 1, height: 1 } },
  { name: 'Pixel', kart: 'rocket', paint: 'violet', outfit: { kind: 'track', top: '#8000ff', bottom: '#16141f', shoes: '#f3f2f7', beanie: '#e219e5', lens: '#00eaff', build: 0.96, height: 0.98 } },
  { name: 'Gummy Gus', kart: 'bigwheel', paint: 'red', outfit: { kind: 'track', top: '#e23b3b', bottom: '#16141f', shoes: '#16141f', cap: '#f3f2f7', lens: '#1fbf6b', chain: true, build: 1.12, height: 1.01 } },
];
const CUP_SHIFT: Record<CupId, number> = { rookie: 0, pro: 1, neon: 2 };
/** Seven of the lineup for a cup, from its own starting point */
const lineup = (cup: CupId) => Array.from({ length: 7 }, (_, i) => LINEUP[(i + CUP_SHIFT[cup]) % LINEUP.length]);

/* ---------- Sizes ---------- */

const MAX_SPARKS = 192;
const MAX_OIL = 8;
const MAX_TRAIL = 40;
const MAX_GUMMY = 8;
const MAX_PIGEON = 8;
/** How far a rival's sounds carry (tiles), and how loud they are then */
const HEAR = 12;
const HEAR_GAIN = 0.35;
/** The sparks' colours by drift stage */
const SPARK = ['#f3f2f7', '#f3f2f7', '#00eaff', '#ff2fb9'];
const CANDY = ['#e23b3b', '#1fbf6b', '#ffd23f', '#ff6ad5', '#ff8a3d', '#00c2ff', '#8000ff', '#e219e5'];

/** The dust off the dirt and the spray off the wet bend (the spark pool, small and dim) */
const DUST = '#6b4f2e';
const SPRAY = '#8fcbff';
/** Ghost karts: yours and par's */
const GHOST_YOURS = '#00eaff';
const GHOST_PAR = '#ff2fb9';

const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const placeText = (p: number) => (p === 1 ? '1st!' : p === 2 ? '2nd' : p === 3 ? '3rd' : `${p}th`);

/* ---------- Ghosts (time trials) ---------- */

/** Your best laps' ghosts, in the browser: `{ [recordKey(course, cls)]: Ghost }` */
const GHOST_KEY = 'degen-city-ghosts-v1';
/** Numbers per sample: x, y, z, yaw, roll (the banking), steer, s (along the main line) */
const G_N = 7;
/** Seconds between samples: every third sim tick */
const G_STEP = TICK * 3;
/** A ghost is thinned to about this many samples before it's kept */
const G_CAP = 2000;
/** The headless par sim gives up after this many ticks (the brain never finishing) */
const PAR_MAX_TICKS = 60 * 900;
export interface Ghost {
  /** The lap's time (seconds), and the kart that drove it */
  lap: number;
  kart: KartId;
  paint: PaintId;
  /** Seconds between samples (`G_STEP`, or more once thinned) */
  step: number;
  /** The poses from the line, `G_N` numbers each, sample i at i * step */
  samples: number[];
}
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
/** A stored ghost made safe (null if it's no use) */
function cleanGhost(v: unknown): Ghost | null {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  if (!num(o.lap) || (o.lap as number) <= 0 || !num(o.step) || (o.step as number) <= 0 || !Array.isArray(o.samples)) return null;
  const samples = o.samples as unknown[];
  if (samples.length < G_N * 2 || samples.length % G_N !== 0 || samples.length > G_CAP * G_N * 2 || !samples.every(num)) return null;
  const kart = PLAYER_KARTS.find((k) => k === o.kart) ?? 'rocket';
  const paint = CAR_PAINTS.find((p) => p.id === o.paint)?.id ?? 'cyan';
  return { lap: o.lap as number, kart, paint, step: o.step as number, samples: samples as number[] };
}
function loadGhosts(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(GHOST_KEY);
    const o = raw ? JSON.parse(raw) : null;
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch {
    return {};
  }
}
/** Your ghost for a course and class, if there is one */
function readGhost(key: string): Ghost | null {
  return cleanGhost(loadGhosts()[key]);
}
/** Keep a ghost (thinned to the cap); quietly does nothing where storage isn't there */
function writeGhost(key: string, g: Ghost) {
  const n = g.samples.length / G_N;
  const stride = Math.max(1, Math.ceil(n / G_CAP));
  let out = g;
  if (stride > 1) {
    const samples: number[] = [];
    for (let i = 0; i < n; i += stride) for (let c = 0; c < G_N; c++) samples.push(g.samples[i * G_N + c]);
    out = { ...g, step: g.step * stride, samples };
  }
  try {
    const all = loadGhosts();
    all[key] = out;
    localStorage.setItem(GHOST_KEY, JSON.stringify(all));
  } catch {
    /* no storage: no ghost kept */
  }
}
/**
 * Records a racer's pose at a fixed cadence of lap time (`G_STEP`), from the line. Fed once a
 * frame; a slow frame that skips a slot gets it filled in between the last pose and this one,
 * so sample i always sits at i * step.
 */
function recorder() {
  let samples: number[] = [];
  let next = 0;
  let last: { t: number; p: number[] } | null = null;
  const pose = (k: Racer) => [k.x, k.y, k.z, k.yaw, k.roll, k.steer, k.s];
  const reset = () => {
    samples = [];
    next = 0;
    last = null;
  };
  return {
    reset,
    at(t: number, k: Racer) {
      const cur = pose(k);
      while (next <= t + 1e-6) {
        if (!last || t - last.t < 1e-6) samples.push(...cur);
        else {
          const u = Math.min(1, Math.max(0, (next - last.t) / (t - last.t)));
          for (let c = 0; c < G_N; c++) samples.push(c === 3 ? last.p[c] + wrap(cur[c] - last.p[c]) * u : last.p[c] + (cur[c] - last.p[c]) * u);
        }
        next += G_STEP;
      }
      last = { t, p: cur };
    },
    take() {
      const s = samples;
      reset();
      return s;
    },
  };
}
/** The par ghosts made so far, per course and class */
const parCache = new Map<string, Ghost>();
/**
 * The par ghost: the rivals' brain driving the Pocket Rocket round the course at the class's
 * pace, alone, its second lap (a flying one) recorded. A headless sim, a few milliseconds.
 */
function parGhost(course: CourseId, cls: ClassId): Ghost | null {
  const key = recordKey(course, cls);
  const hit = parCache.get(key);
  if (hit) return hit;
  const sim = createKartSim({ course, cup: 'time', cls, player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, cls) }, rivals: [], seed: 7, auto: true, laps: 2 });
  const rec = recorder();
  const me = sim.player.i;
  let lapAt = -1;
  let ghost: Ghost | null = null;
  for (let n = 0; n < PAR_MAX_TICKS && !ghost; n++) {
    const events = sim.step(TICK, NO_INPUT);
    for (const e of events) {
      if (e.kind === 'lap' && e.kart === me && lapAt < 0) lapAt = sim.time;
      else if (e.kind === 'finish' && e.kart === me && lapAt >= 0) {
        rec.at(e.time - lapAt, sim.player);
        ghost = { lap: e.time - lapAt, kart: 'rocket', paint: 'magenta', step: G_STEP, samples: rec.take() };
      }
    }
    if (!ghost && lapAt >= 0) rec.at(sim.time - lapAt, sim.player);
  }
  if (ghost) parCache.set(key, ghost);
  return ghost;
}
/** A ghost kart replaying its lap */
interface GhostView {
  kart: Kart;
  holder: THREE.Group;
  ghost: Ghost;
  /** The sample nearest the player's s (for the gap), and where the kart was last frame (for the wheels) */
  cursor: number;
  lastX: number;
  lastZ: number;
  on: boolean;
}

interface View {
  kart: Kart;
  degen: Degen | null;
  /** Position and yaw; the kart's own group carries roll and pitch */
  holder: THREE.Group;
  spinDir: number;
  roll: number;
  /** The track's banking under it (radians, right side up when positive), smoothed */
  bank: number;
  pitch: number;
  lastSpeed: number;
  flames: THREE.Mesh[];
  shield: THREE.Mesh;
}

export function createKartRace(d: KartRaceDeps): KartRace {
  const { scene, camera, root } = d;
  const group = new THREE.Group();
  group.name = 'kart-race';
  scene.add(group);

  let sim: KartSim | null = null;
  let course: CourseId = 'neon-loop';
  let cup: CupId | 'time' = 'time';
  let cls: ClassId = 'sport';
  /** The series this race is part of (a cup): which race of how many */
  let seriesInfo: { race: number; of: number } | null = null;
  let views: View[] = [];
  let active = false;
  /** This race's laps as they're driven (a time trial): the recorder for the lap on the go, the laps done */
  const rec = recorder();
  let lapSamples: number[][] = [];
  /** The ghosts of a time trial, and which are wanted */
  let yours: GhostView | null = null;
  let par: GhostView | null = null;
  let ghostsOn = { yours: true, par: true };
  let frameNo = 0;
  /** Seconds until the GO clears; until the results are paid; until the level-up's fanfare */
  let goClear = 0;
  let finishAt = -1;
  let levelAt = -1;
  let paid = false;
  let lapStart = 0;
  let lapTimes: number[] = [];
  let shownCount = '';

  /* ---------- Effects: materials and pools, made once ---------- */

  // Drift sparks: one cloud of points, each with a velocity and a life
  const sparkPos = new Float32Array(MAX_SPARKS * 3).fill(-999);
  const sparkCol = new Float32Array(MAX_SPARKS * 3);
  const sparkVel = new Float32Array(MAX_SPARKS * 3);
  const sparkLife = new Float32Array(MAX_SPARKS);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
  const sparks = fx(new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.12, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
  sparks.frustumCulled = false;
  sparks.visible = false;
  group.add(sparks);
  let sparkNext = 0;
  const sparkColor = new THREE.Color();

  // Boost flames (two cones an exhaust) and shields (a sphere) share a material each
  const flameGeo = new THREE.ConeGeometry(0.07, 0.34, 7).rotateZ(Math.PI / 2);
  const flameMat = glowMat('#ff9a3d', 0.9, null);
  const shieldGeo = new THREE.SphereGeometry(0.95, 18, 12);
  const shieldMat = new THREE.MeshBasicMaterial({ color: '#00eaff', transparent: true, opacity: 0.2, depthWrite: false, fog: false });
  // Ghost karts: every part in one see-through colour, never inked
  const ghostMat = {
    yours: new THREE.MeshBasicMaterial({ color: GHOST_YOURS, transparent: true, opacity: 0.35, depthWrite: false, fog: false }),
    par: new THREE.MeshBasicMaterial({ color: GHOST_PAR, transparent: true, opacity: 0.35, depthWrite: false, fog: false }),
  };
  // Oil slicks: flat dark glossy discs, instanced
  const oilGeo = new THREE.CircleGeometry(0.7, 20).rotateX(-Math.PI / 2);
  const oilMat = toon('#0c0b14', { name: 'kart-oil' });
  const oil = new THREE.InstancedMesh(oilGeo, oilMat, MAX_OIL);
  oil.count = 0;
  oil.frustumCulled = false;
  group.add(oil);
  // Glow trails: short lit quads, instanced, each fading through its colour
  const trailGeo = new THREE.PlaneGeometry(0.8, 0.6).rotateX(-Math.PI / 2);
  const trail = fx(new THREE.InstancedMesh(trailGeo, glowMat('#ffffff', 0.85, null), MAX_TRAIL));
  trail.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAIL * 3), 3);
  trail.count = 0;
  trail.frustumCulled = false;
  group.add(trail);
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const V = new THREE.Vector3();
  const ONE = new THREE.Vector3(1, 1, 1);
  const UP = new THREE.Vector3(0, 1, 0);
  const C = new THREE.Color();

  // Gummy bombs: a candy blob with ears and eyes, one merged mesh each, a colour a slot
  const gummies: THREE.Group[] = [];
  for (let i = 0; i < MAX_GUMMY; i++) {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 10).scale(1, 1.1, 0.9), toon(CANDY[i]));
    const ears = [-1, 1].map((s) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), toon(CANDY[i]));
      e.position.set(0, 0.3, s * 0.2);
      return e;
    });
    const eyes = [-1, 1].map((s) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), toon('#16141f'));
      e.position.set(0.28, 0.08, s * 0.12);
      return e;
    });
    const g = mergeMeshes([body, ...ears, ...eyes]);
    for (const m of [body, ...ears, ...eyes]) m.geometry.dispose();
    g.visible = false;
    gummies.push(g);
    group.add(g);
  }
  // Homing pigeons: a body with a head and beak, a tail, and two wings that flap
  const pigeons: { g: THREE.Group; wings: [THREE.Mesh, THREE.Mesh] }[] = [];
  const wingGeo = new THREE.BoxGeometry(0.22, 0.02, 0.3).translate(0, 0, 0.15);
  const wingMat = toon('#c9c4e6');
  for (let i = 0; i < MAX_PIGEON; i++) {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 9).scale(1.5, 0.9, 1), toon('#9a96b8'));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), toon('#8d89b0'));
    head.position.set(0.2, 0.1, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 6).rotateZ(-Math.PI / 2), toon('#ffad33'));
    beak.position.set(0.3, 0.09, 0);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.14), toon('#8d89b0'));
    tail.position.set(-0.24, 0.03, 0);
    tail.rotation.z = 0.3;
    const eyes = [-1, 1].map((s) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), toon('#16141f'));
      e.position.set(0.26, 0.13, s * 0.06);
      return e;
    });
    const g = mergeMeshes([body, head, beak, tail, ...eyes]);
    for (const m of [body, head, beak, tail, ...eyes]) m.geometry.dispose();
    const wing = (s: number) => {
      const w = new THREE.Mesh(wingGeo, wingMat);
      w.position.set(0, 0.06, s * 0.08);
      w.rotation.y = s < 0 ? Math.PI : 0;
      w.castShadow = true;
      g.add(w);
      return w;
    };
    const wings: [THREE.Mesh, THREE.Mesh] = [wing(-1), wing(1)];
    g.visible = false;
    pigeons.push({ g, wings });
    group.add(g);
  }

  /* ---------- The camera ---------- */

  let camYaw = 0;
  let camReady = false;
  let shake = 0;
  let fov = 60;
  let fov0 = 60;
  const camPos = new THREE.Vector3();
  const goal = new THREE.Vector3();
  const side = new THREE.Vector3();
  const at = new THREE.Vector3();

  function placeCamera(p: Racer, dt: number) {
    if (!sim) return;
    camYaw = camReady ? camYaw + wrap(p.yaw - camYaw) * damp(4, dt) : p.yaw;
    const fxx = Math.cos(camYaw);
    const fzz = -Math.sin(camYaw);
    const pitch = 0.3;
    const boost = p.boostT > 0 ? 1 : 0;
    const dist = 3.3 + Math.min(1, Math.abs(p.speed) / p.tune.top) * 0.6 + boost * 0.4;
    goal.set(p.x - fxx * Math.cos(pitch) * dist, p.y + 0.6 + Math.sin(pitch) * dist, p.z - fzz * Math.cos(pitch) * dist);
    // The countdown: in close from the side, settling in behind as the lights go
    const intro = !d.reduced && sim.countdown > 0;
    if (intro) {
      const yaw = p.yaw;
      const rx = Math.sin(yaw);
      const rz = Math.cos(yaw);
      side.set(p.x + rx * 2.4 + Math.cos(yaw) * 1.2, p.y + 0.7, p.z + rz * 2.4 - Math.sin(yaw) * 1.2);
      const u = smooth(Math.min(1, (COUNTDOWN - sim.countdown) / COUNTDOWN));
      camPos.copy(side).lerp(goal, u);
    } else if (!camReady) camPos.copy(goal);
    else camPos.lerp(goal, damp(10, dt));
    camReady = true;
    camera.position.copy(camPos);
    if (shake > 0 && !d.reduced) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake = Math.max(0, shake - dt * 1.4);
    }
    const look = intro ? 0.4 : 1.8;
    at.set(p.x + Math.cos(p.yaw) * look, p.y + 0.45, p.z - Math.sin(p.yaw) * look);
    camera.lookAt(at);
    const wantFov = 60 + Math.min(1, Math.abs(p.speed) / p.tune.top) * 10 + boost * 6;
    fov += (wantFov - fov) * damp(4, dt);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  /* ---------- Sounds and pops ---------- */

  /** How loud a kart's sound is for the player: his own in full, a rival's quieter within earshot, else silent */
  function gainFor(i: number) {
    if (!sim) return 0;
    const p = sim.player;
    if (i === p.i) return 1;
    const k = sim.racers[i];
    if (!k) return 0;
    const dd = Math.hypot(k.x - p.x, k.z - p.z);
    return dd < HEAR ? HEAR_GAIN * (1 - (dd / HEAR) * 0.5) : 0;
  }
  const sfx = (kind: Sfx, i: number, scale = 1) => {
    const g = gainFor(i) * scale;
    if (g > 0) d.sfx(kind, g);
  };

  function onEvent(e: KartEvent) {
    if (!sim) return;
    const me = sim.player.i;
    switch (e.kind) {
      case 'count':
        showCount(String(e.n));
        d.sfx('countdown');
        break;
      case 'go':
        showCount('GO');
        d.sfx('go');
        goClear = 0.9;
        rec.reset();
        lapSamples = [];
        lapOver(0);
        break;
      case 'lap':
        if (e.kart === me) {
          lapDone(sim.time);
          if (e.lap === sim.laps) d.ui.pop('Final lap', 'plain');
        }
        break;
      case 'finish':
        if (e.kart === me) {
          lapDone(e.time);
          d.ui.pop(placeText(e.place), e.place <= 3 ? 'good' : 'plain');
          finishAt = 1.5;
        }
        break;
      case 'shortcut':
        if (e.on) {
          sfx('kartShortcut', e.kart);
          if (e.kart === me) d.ui.pop('Shortcut!', 'good');
        }
        break;
      case 'boost':
        sfx('kartBoost', e.kart);
        if (e.kart === me && e.tier >= 3) d.ui.pop('Boost!', 'good');
        break;
      case 'pad':
        sfx('kartBoost', e.kart, 0.5);
        break;
      case 'hit':
        if (e.kart === me) {
          d.sfx('kartHit');
          d.ui.pop(e.item === 'trail' ? 'Slowed' : 'Spun out', 'bad');
          if (e.item !== 'trail') shake = 0.18;
        } else if (e.by === me) d.sfx('kartHitLanded');
        else sfx('kartHit', e.kart, 0.7);
        if (e.item !== 'trail') views[e.kart].spinDir = e.kart % 2 ? -1 : 1;
        break;
      case 'shield':
        sfx('kartShield', e.kart);
        if (e.kart === me) d.ui.pop('Shield!', 'good');
        break;
      case 'item':
        sfx('kartItem', e.kart);
        break;
      case 'use':
        sfx('kartUse', e.kart);
        break;
      case 'drift':
        if (e.on) sfx('kartDrift', e.kart);
        break;
      case 'driftTier':
        sfx('kartSpark', e.kart, 0.5 + e.tier * 0.17);
        break;
      case 'jump':
        sfx('kartJump', e.kart);
        break;
      case 'land':
        sfx('kartLand', e.kart);
        if (e.kart === me) shake = Math.max(shake, 0.1);
        break;
      case 'bump':
        if (e.kart === me || e.other === me) {
          d.sfx('bump', Math.min(1, e.force / 7));
          shake = Math.max(shake, Math.min(0.12, e.force * 0.015));
        } else sfx('bump', e.kart, Math.min(1, e.force / 7));
        break;
      case 'wall':
        sfx('bump', e.kart, 0.3);
        break;
      case 'box':
        break;
    }
  }
  function showCount(text: string) {
    if (text === shownCount) return;
    shownCount = text;
    d.ui.count(text);
  }
  /** The player crossed the line at `at`: the lap's time, its samples, the ghosts' chime, the next lap */
  function lapDone(at: number) {
    if (!sim) return;
    const p = sim.player;
    const lapT = at - lapStart;
    lapTimes.push(lapT);
    if (sim.timeTrial) {
      rec.at(lapT, p);
      lapSamples.push(rec.take());
      // Faster than your own ghost (or par when you have none): a soft chime
      const mark = yours?.ghost.lap ?? par?.ghost.lap ?? 0;
      if (mark > 0 && lapT < mark) {
        d.sfx('kartGhost');
        d.ui.pop(yours ? 'Ghost beaten' : 'Under par', 'good');
      }
    }
    lapOver(at);
  }
  /** A new lap starts at `at`: the ghosts go back to the line */
  function lapOver(at: number) {
    lapStart = at;
    for (const g of [yours, par]) {
      if (!g) continue;
      g.cursor = 0;
      g.lastX = g.ghost.samples[0];
      g.lastZ = g.ghost.samples[2];
    }
  }

  /* ---------- Placing the karts ---------- */

  function placeKart(v: View, k: Racer, dt: number) {
    const hop = k.hopT > 0 ? Math.sin(Math.PI * (1 - k.hopT / T.hop)) * 0.16 : 0;
    const spin = k.spinT > 0 ? (1 - k.spinT / k.spinLen) * Math.PI * 4 * v.spinDir : 0;
    const boost = k.boostT > 0 ? 1 : 0;
    v.holder.position.set(k.x, k.y + hop - boost * 0.015, k.z);
    v.holder.rotation.y = k.yaw + spin;
    // Roll: into the drift (the arcade way), out of a plain corner (body roll), a wobble while spinning
    const wantRoll = k.drift * 0.13 - THREE.MathUtils.clamp(k.steer * k.speed * 0.006, -0.06, 0.06) + (k.spinT > 0 ? Math.sin(spin * 1.5) * 0.08 : 0);
    v.roll += (wantRoll - v.roll) * damp(8, dt);
    // The banking under it: the track's roll lifts the right side (local +z), which is a turn of -roll about the nose
    v.bank += (k.roll - v.bank) * damp(14, dt);
    // Pitch: nose up in the air with the rise, squatting back under a boost or gas, dipping under the brakes
    const accel = (k.speed - v.lastSpeed) / Math.max(dt, 1e-3);
    v.lastSpeed = k.speed;
    const wantPitch = k.air ? THREE.MathUtils.clamp(k.vy * 0.06, -0.3, 0.3) : THREE.MathUtils.clamp(accel * 0.008, -0.06, 0.06) + boost * 0.05;
    v.pitch += (wantPitch - v.pitch) * damp(8, dt);
    v.kart.group.rotation.set(v.roll - v.bank, 0, v.pitch);
    v.kart.drive(k.speed * dt, -k.steer * 0.42);
    if (v.degen) {
      v.kart.lean(k.drift !== 0 ? k.drift : k.steer * 0.4);
      v.kart.look(-k.steer * 0.45 - k.drift * 0.3);
    }
    // Boost flames flicker; the shield breathes
    const flames = boost > 0;
    for (const f of v.flames) {
      f.visible = flames;
      if (flames) {
        const s = 0.8 + Math.random() * 0.5;
        f.scale.set(s * (k.boostK > 1.35 ? 1.3 : 1), s * 0.8, s * 0.8);
      }
    }
    v.shield.visible = k.shield;
    if (k.shield) {
      const s = 1 + Math.sin(performance.now() * 0.006) * 0.04;
      v.shield.scale.setScalar(s);
    }
  }

  function emitSparks(v: View, k: Racer, tier: number) {
    const f = Math.cos(k.yaw);
    const g = -Math.sin(k.yaw);
    const rx = Math.sin(k.yaw);
    const rz = Math.cos(k.yaw);
    // The rear wheel on the drifting side (drift 1 is to the right)
    const sideK = k.drift > 0 ? 1 : -1;
    const ox = k.x - f * 0.4 + rx * 0.4 * sideK;
    const oz = k.z - g * 0.4 + rz * 0.4 * sideK;
    sparkColor.set(SPARK[Math.min(3, tier)]);
    for (let n = 0; n < 2; n++) {
      const i = sparkNext;
      sparkNext = (sparkNext + 1) % MAX_SPARKS;
      sparkPos.set([ox + (Math.random() - 0.5) * 0.1, k.y + 0.05, oz + (Math.random() - 0.5) * 0.1], i * 3);
      sparkVel.set([-f * (2 + Math.random() * 2) + rx * sideK * Math.random() * 1.5, 1 + Math.random() * 2, -g * (2 + Math.random() * 2) + rz * sideK * Math.random() * 1.5], i * 3);
      sparkLife[i] = 0.25 + Math.random() * 0.2;
      sparkCol.set([sparkColor.r, sparkColor.g, sparkColor.b], i * 3);
    }
  }
  /** Dust off the rear wheels on the dirt, spray on the wet bend: one small puff a wheel, low and short-lived */
  function emitPuffs(k: Racer, wet: boolean) {
    const f = Math.cos(k.yaw);
    const g = -Math.sin(k.yaw);
    const rx = Math.sin(k.yaw);
    const rz = Math.cos(k.yaw);
    const back = Math.sign(k.speed) || 1;
    sparkColor.set(wet ? SPRAY : DUST);
    for (const sideK of [-1, 1]) {
      const i = sparkNext;
      sparkNext = (sparkNext + 1) % MAX_SPARKS;
      const ox = k.x - f * 0.42 * back + rx * 0.38 * sideK;
      const oz = k.z - g * 0.42 * back + rz * 0.38 * sideK;
      sparkPos.set([ox + (Math.random() - 0.5) * 0.12, k.y + 0.04, oz + (Math.random() - 0.5) * 0.12], i * 3);
      const up = wet ? 1.2 + Math.random() * 1.2 : 0.5 + Math.random() * 0.7;
      sparkVel.set([-f * back * (0.6 + Math.random()) + rx * sideK * (0.3 + Math.random() * 0.5), up, -g * back * (0.6 + Math.random()) + rz * sideK * (0.3 + Math.random() * 0.5)], i * 3);
      sparkLife[i] = (wet ? 0.22 : 0.3) + Math.random() * 0.18;
      sparkCol.set([sparkColor.r, sparkColor.g, sparkColor.b], i * 3);
    }
  }
  function stepSparks(dt: number) {
    let live = 0;
    for (let i = 0; i < MAX_SPARKS; i++) {
      if (sparkLife[i] <= 0) continue;
      sparkLife[i] -= dt;
      if (sparkLife[i] <= 0) {
        sparkPos[i * 3 + 1] = -999;
        continue;
      }
      live++;
      sparkVel[i * 3 + 1] -= 9 * dt;
      sparkPos[i * 3] += sparkVel[i * 3] * dt;
      sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
      sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
      // Dimming out over its last tenth of a second
      if (sparkLife[i] < 0.1) for (let c = 0; c < 3; c++) sparkCol[i * 3 + c] *= 0.85;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.color.needsUpdate = true;
    sparks.visible = live > 0;
  }

  function placeHazards(t: number) {
    if (!sim) return;
    let no = 0;
    let nt = 0;
    const c = sim.course;
    for (const h of sim.hazards) {
      if (h.kind === 'oil') {
        if (no >= MAX_OIL) continue;
        M.compose(V.set(h.x, h.y + 0.02, h.z), Q.identity(), ONE);
        oil.setMatrixAt(no++, M);
      } else {
        if (nt >= MAX_TRAIL) continue;
        // The quad lies along the track where it was laid, bright when fresh, fading out through its colour
        M.compose(V.set(h.x, h.y + 0.025, h.z), Q.setFromAxisAngle(UP, yawAt(c, h.s)), ONE);
        trail.setMatrixAt(nt, M);
        const k = Math.min(1, h.t / T.trailLife) * (0.6 + 0.4 * Math.abs(Math.sin(t * 6 + h.s)));
        C.set(paintOf(h.owner)).multiplyScalar(0.3 + k * 0.9);
        trail.setColorAt(nt++, C);
      }
    }
    oil.count = no;
    oil.instanceMatrix.needsUpdate = true;
    trail.count = nt;
    trail.instanceMatrix.needsUpdate = true;
    if (trail.instanceColor) trail.instanceColor.needsUpdate = true;
  }
  const paints: string[] = [];
  const paintOf = (i: number) => paints[i] ?? '#00eaff';

  function placeMissiles(dt: number, t: number) {
    if (!sim) return;
    let ng = 0;
    let np = 0;
    for (const p of sim.missiles) {
      if (p.kind === 'gummy') {
        if (ng >= MAX_GUMMY) continue;
        const g = gummies[ng++];
        g.visible = true;
        g.position.set(p.x, p.y, p.z);
        g.rotation.y += dt * 5;
        g.rotation.z = Math.sin(t * 7 + ng) * 0.15;
      } else {
        if (np >= MAX_PIGEON) continue;
        const b = pigeons[np++];
        b.g.visible = true;
        b.g.position.set(p.x, p.y + Math.sin(t * 9 + np) * 0.04, p.z);
        b.g.rotation.y = p.yaw;
        const flap = Math.sin(t * 24 + np) * 0.7;
        b.wings[0].rotation.x = -flap;
        b.wings[1].rotation.x = flap;
      }
    }
    for (let i = ng; i < MAX_GUMMY; i++) gummies[i].visible = false;
    for (let i = np; i < MAX_PIGEON; i++) pigeons[i].g.visible = false;
  }

  /* ---------- Building and clearing a race ---------- */

  /** A kart on the grid with its driver (a Degen in `outfit` at `detail`), its flames and its shield */
  function buildView(k: Racer, paint: string, outfit: Outfit | null, detail: 0 | 1 | 2): View {
    const kart = createKart(k.kart, paint, { detail: d.low ? 1 : 2 });
    const holder = new THREE.Group();
    holder.add(kart.group);
    holder.position.set(k.x, k.y, k.z);
    holder.rotation.y = k.yaw;
    group.add(holder);
    kart.setNumber(k.i + 1);
    let degen: Degen | null = null;
    if (outfit) {
      degen = createDegen(outfit, detail);
      kart.seat(degen);
    }
    const flames = kart.exhausts.map(([x, y, z]) => {
      const f = fx(new THREE.Mesh(flameGeo, flameMat));
      f.position.set(x - 0.17, y, z);
      f.visible = false;
      kart.group.add(f);
      return f;
    });
    const shield = fx(new THREE.Mesh(shieldGeo, shieldMat));
    shield.position.y = 0.45;
    shield.visible = false;
    kart.group.add(shield);
    return { kart, degen, holder, spinDir: 1, roll: 0, bank: 0, pitch: 0, lastSpeed: 0, flames, shield };
  }

  /** A ghost kart: the lap's kart in one see-through colour, no driver, never inked, hidden until the lap starts */
  function buildGhost(ghost: Ghost, mat: THREE.Material): GhostView {
    const kart = createKart(ghost.kart, paintHex(ghost.paint), { detail: d.low ? 0 : 1 });
    kart.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = mat;
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    fx(kart.group);
    const holder = new THREE.Group();
    holder.add(kart.group);
    holder.visible = false;
    group.add(holder);
    return { kart, holder, ghost, cursor: 0, lastX: ghost.samples[0], lastZ: ghost.samples[2], on: true };
  }
  function clearGhost(v: GhostView | null) {
    if (!v) return;
    v.kart.dispose();
    v.holder.removeFromParent();
  }
  /** A ghost at `t` seconds into its lap (held at the line once its lap is over), interpolated between samples */
  function placeGhost(v: GhostView, t: number) {
    const g = v.ghost;
    const S = g.samples;
    const n = S.length / G_N;
    const f = Math.min(n - 1, Math.max(0, t / g.step));
    const i = Math.floor(f);
    const j = Math.min(n - 1, i + 1);
    const u = f - i;
    const a = i * G_N;
    const b = j * G_N;
    const lerp = (c: number) => S[a + c] + (S[b + c] - S[a + c]) * u;
    const x = lerp(0);
    const y = lerp(1);
    const z = lerp(2);
    const yaw = S[a + 3] + wrap(S[b + 3] - S[a + 3]) * u;
    v.holder.position.set(x, y, z);
    v.holder.rotation.y = yaw;
    v.kart.group.rotation.set(-lerp(4), 0, 0);
    const moved = Math.hypot(x - v.lastX, z - v.lastZ);
    v.lastX = x;
    v.lastZ = z;
    v.kart.drive(Math.min(moved, 2), -lerp(5) * 0.42);
  }
  /**
   * How far behind the ghost the player is here (seconds; negative = ahead): the ghost's time at
   * its sample nearest the player's s, less the player's time into the lap. The cursor walks
   * along the samples with him, so each frame is a few comparisons.
   */
  function ghostGap(v: GhostView, c: Course, p: Racer, lapT: number) {
    const g = v.ghost;
    const S = g.samples;
    const n = S.length / G_N;
    if (n < 2) return null;
    const dist = (i: number) => Math.abs(along(c, S[i * G_N + 6], p.s));
    let i = Math.min(n - 1, v.cursor);
    let best = dist(i);
    while (i + 1 < n) {
      const dd = dist(i + 1);
      if (dd > best) break;
      best = dd;
      i++;
    }
    while (i > 0) {
      const dd = dist(i - 1);
      if (dd >= best) break;
      best = dd;
      i--;
    }
    v.cursor = i;
    return i * g.step - lapT;
  }
  function showGhosts() {
    if (yours) yours.on = ghostsOn.yours;
    if (par) par.on = ghostsOn.par;
  }

  function clearRace() {
    for (const v of views) {
      v.kart.seat(null);
      v.kart.dispose();
      v.holder.removeFromParent();
    }
    views = [];
    paints.length = 0;
    sim = null;
    clearGhost(yours);
    clearGhost(par);
    yours = par = null;
    rec.reset();
    lapSamples = [];
    for (const g of gummies) g.visible = false;
    for (const p of pigeons) p.g.visible = false;
    oil.count = 0;
    trail.count = 0;
    sparkLife.fill(0);
    sparkPos.fill(-999);
    sparks.visible = false;
  }

  /** Who stands where, for the results: the sim's order, rivals by their lineup names */
  function standings(): KartStanding[] {
    if (!sim) return [];
    const s = sim;
    const names = s.timeTrial ? [] : lineup(cup as CupId).map((r) => r.name);
    return s.standings().map((i, idx) => {
      const r = s.racers[i];
      const you = i === s.player.i;
      return { name: you ? 'You' : (names[i] ?? `Racer ${i + 1}`), kart: r.kart, place: idx + 1, time: r.finished ? r.finishT : null, you };
    });
  }

  function payOut() {
    if (!sim || paid) return;
    paid = true;
    const s = sim;
    const p = s.player;
    const save = d.game.save();
    const laps = lapTimes.slice();
    const result = finishKartRace(save, { course, cup, cls, place: p.place, seconds: p.finishT, laps, hits: p.hits, now: Date.now() });
    // A cup's race counts for its series: everyone's place by grid index (the rivals, then you)
    let series: KartResultView['series'] = null;
    if (cup !== 'time') {
      const byKart = s.racers.map(() => s.racers.length);
      s.standings().forEach((i, idx) => (byKart[i] = idx + 1));
      const sr = seriesRace(save, byKart);
      if (sr) series = { ...sr, names: [...lineup(cup).map((r) => ({ name: r.name, kart: r.kart, you: false })), { name: 'You', kart: save.karts.model, you: true }] };
    }
    d.game.commit();
    d.sfx('finish');
    if (result.levels > 0 || (series?.levels ?? 0) > 0) levelAt = 0.7;
    if (series?.done) d.ui.pop(`Series: ${placeText(series.overall)}`, series.overall <= 3 ? 'good' : 'plain');
    // A time trial's new lap record: that lap's ghost is kept for next time
    if (s.timeTrial && result.lapRecord && laps.length) {
      let best = 0;
      for (let i = 1; i < laps.length; i++) if (laps[i] < laps[best]) best = i;
      const samples = lapSamples[best];
      if (samples && samples.length >= G_N * 2) writeGhost(recordKey(course, cls), { lap: Math.round(laps[best] * 100) / 100, kart: save.karts.model, paint: save.karts.paint, step: G_STEP, samples });
    }
    d.ui.showResult({ cup, cls, course, of: s.racers.length, result, standings: standings(), laps, par: parLap(course, cls), series });
  }

  /* ---------- The kart on show in the pits ---------- */

  let show: { kart: Kart; holder: THREE.Group; model: KartId; paint: PaintId; yaw: number } | null = null;
  let picked: MyKart | null = null;
  function ensureShow(want: MyKart) {
    if (show && show.model === want.model && show.paint === want.paint) return;
    if (show) {
      show.kart.dispose();
      show.holder.removeFromParent();
    }
    const spot = d.park.showSpot;
    const kart = createKart(want.model, paintHex(want.paint), { detail: d.low ? 1 : 2 });
    const holder = new THREE.Group();
    holder.add(kart.group);
    holder.position.set(spot.x, spot.y, spot.z);
    holder.rotation.y = show?.yaw ?? spot.yaw;
    group.add(holder);
    kart.setNumber(1);
    show = { kart, holder, model: want.model, paint: want.paint, yaw: holder.rotation.y };
  }

  /* ---------- The interface ---------- */

  return {
    get active() {
      return active;
    },
    get sim() {
      return sim;
    },
    start(setup) {
      if (active) clearRace();
      course = setup.course;
      cup = setup.cup;
      const save = d.game.save();
      const model = save.karts.model;
      // A cup runs at its own class and is a series: begin one unless that cup's is on the go
      cls = cup === 'time' ? setup.cls : CUPS[cup].cls;
      seriesInfo = null;
      if (cup !== 'time') {
        if (!save.karts.series || save.karts.series.cup !== cup) {
          startSeries(save, cup);
          d.game.commit();
        }
        const sr = save.karts.series;
        if (sr) seriesInfo = { race: Math.min(sr.race + 1, CUPS[cup].courses.length), of: CUPS[cup].courses.length };
      }
      const rivals = cup === 'time' ? [] : lineup(cup);
      sim = createKartSim({
        course,
        cup,
        cls,
        player: { kart: model, tune: tune(kartStatsOf(save, model), cls) },
        rivals: rivals.map((r) => ({ kart: r.kart, tune: tune(KART_SPECS[r.kart], cls) })),
        seed: Date.now() >>> 0,
      });
      // A time trial's ghosts: your best lap here, and par's
      if (sim.timeTrial) {
        const mine = readGhost(recordKey(course, cls));
        if (mine) yours = buildGhost(mine, ghostMat.yours);
        const pg = parGhost(course, cls);
        if (pg) par = buildGhost(pg, ghostMat.par);
        showGhosts();
      }
      views = [];
      for (const k of sim.racers) {
        const you = k.i === sim.player.i;
        const r = you ? null : rivals[k.i];
        const paint = you ? paintHex(save.karts.paint) : paintHex(r!.paint);
        paints[k.i] = paint;
        views[k.i] = buildView(k, paint, you ? d.outfit() : r!.outfit, you ? 2 : d.low ? 0 : 1);
      }
      for (let i = 0; i < views.length; i++) placeKart(views[i], sim.racers[i], 1 / 60);
      active = true;
      paid = false;
      finishAt = -1;
      levelAt = -1;
      goClear = 0;
      lapStart = 0;
      lapTimes = [];
      shake = 0;
      camReady = false;
      fov0 = camera.fov;
      fov = camera.fov;
      d.park.setCourse(course);
      d.park.showBoxes(sim.boxes.map((b) => b.gone));
      d.ui.showHud(true);
      root.classList.add('is-karting');
      root.dataset.kart = COURSES[course].name;
      // The sim only announces counts below its first, so the first number is ours
      shownCount = '';
      showCount(String(Math.ceil(COUNTDOWN)));
      d.sfx('countdown');
      d.engine(0.15);
    },
    update(dt, inp: KartInput) {
      if (!active || !sim) return;
      const s = sim;
      const events = s.step(dt, inp);
      for (const e of events) onEvent(e);
      const t = performance.now() / 1000;
      const p = s.player;
      frameNo++;
      const lapT = s.time - lapStart;
      for (let i = 0; i < views.length; i++) {
        const v = views[i];
        const k = s.racers[i];
        placeKart(v, k, dt);
        if (d.reduced || k.air) continue;
        if (k.drift !== 0 && k.hopT <= 0) emitSparks(v, k, s.driftTier(k));
        // Dust and spray: the player's every frame, a rival's in earshot every other
        else if (k.flags & (F.dirt | F.wet) && Math.abs(k.speed) > 3 && (i === p.i || ((frameNo + i) % 2 === 0 && gainFor(i) > 0))) emitPuffs(k, !(k.flags & F.dirt));
      }
      stepSparks(dt);
      // The lap on the go, recorded for its ghost; the ghosts replay theirs from the line
      if (s.timeTrial && s.started && !p.finished) rec.at(lapT, p);
      let gap: number | null = null;
      for (const g of [yours, par]) {
        if (!g) continue;
        const show = g.on && s.started;
        g.holder.visible = show;
        if (show) placeGhost(g, lapT);
      }
      if (par?.on && s.started && !p.finished) gap = ghostGap(par, s.course, p, lapT);
      placeHazards(t);
      placeMissiles(dt, t);
      d.park.showBoxes(s.boxes.map((b) => b.gone));
      // Timers: the GO clears, the results come after a breath, the fanfare after the finish
      if (goClear > 0 && (goClear -= dt) <= 0) showCount('');
      if (finishAt >= 0 && (finishAt -= dt) < 0) payOut();
      if (levelAt >= 0 && (levelAt -= dt) < 0) d.sfx('levelup');
      // The engine, the camera, the HUD
      d.engine(0.15 + Math.min(1, Math.abs(p.speed) / p.tune.top) * 0.7 + (p.boostT > 0 ? 0.15 : 0));
      placeCamera(p, dt);
      const hud: KartHud = {
        place: p.place,
        of: s.racers.length,
        lap: p.finished ? s.laps : Math.min(s.laps, p.lap + 1),
        laps: s.laps,
        time: s.countdown > 0 ? -s.countdown : s.time,
        item: p.item,
        roulette: p.rouletteT > 0,
        driftTier: s.driftTier(p),
        boost: p.boostT > 0,
        shield: p.shield,
        finished: p.finished,
        timeTrial: s.timeTrial,
        cls,
        lastLap: lapTimes.length ? lapTimes[lapTimes.length - 1] : null,
        bestLap: lapTimes.length ? Math.min(...lapTimes) : null,
        ghostGap: gap,
        surface: p.flags & F.dirt ? 'dirt' : p.flags & F.wet ? 'wet' : p.flags & F.tunnel ? 'tunnel' : p.flags & F.bank ? 'bank' : 'dry',
        shortcut: p.line === 'short',
        series: seriesInfo,
      };
      d.ui.paintHud(hud);
    },
    setGhosts(on) {
      ghostsOn = { yours: !!on.yours, par: !!on.par };
      showGhosts();
    },
    exit() {
      if (active) {
        clearRace();
        active = false;
        if (Math.abs(camera.fov - fov0) > 0.05) {
          camera.fov = fov0;
          camera.updateProjectionMatrix();
        }
      }
      finishAt = -1;
      levelAt = -1;
      d.engine(-1);
      d.ui.showHud(false);
      d.ui.count('');
      shownCount = '';
      root.classList.remove('is-karting');
      delete root.dataset.kart;
      d.park.showBoxes(null);
      d.park.setCourse('neon-loop');
      // Out of the hut's door, a tile south of it, facing the track (walk.ts: forward is (sin yaw, cos yaw))
      // (walk.ts looks along -z at yaw 0: at the track)
      return { x: HUT_DOOR.x, z: HUT_DOOR.z + 1, yaw: 0 };
    },
    preview(k) {
      picked = k;
      ensureShow(k ?? d.game.save().karts);
    },
    idle(dt) {
      ensureShow(picked ?? d.game.save().karts);
      if (show && !d.reduced) {
        show.yaw += dt * 0.5;
        show.holder.rotation.y = show.yaw;
      }
    },
  };
}
