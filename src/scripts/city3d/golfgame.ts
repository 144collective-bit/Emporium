/*
 * The golf game on screen (docs/golf-game-plan.md Phase 2): its own chunk, loaded when Play golf is first pressed at
 * Knob Hill's door (walk.ts `startGolf()`, `lazy()`). The rules are golfgame-sim.ts's; this only draws them and reads
 * the keys.
 *
 * - **A shot**: Degen at his ball side-on (right-handed: the target to his left), the camera behind the ball down
 *   the aim, a ring where the club carries at full power (the putter's: at the pin's distance) and a line out to it.
 *   A / D (or the arrows) aim, W / S change the club (the one for the distance is picked first), V the camera
 *   (behind the ball, or high over the hole looking down the aim), Space starts the
 *   meter, Space again sets the power on its way up (past the top is more distance, less control), Space a third
 *   time on its way back down sets the accuracy: on the line straight, early a hook, late a slice (`METER`).
 * - **The swing**: his `golf` or `putt` pose (acts.ts, the crowd's rows on his figure) from the top of the backswing,
 *   the ball off at the strike, flying and rolling along the shot's path as the sim gave it, the camera following.
 * - **Between shots** the camera flies to where it stopped (the owner's call); a penalty says so in a pop.
 * - **The hole done**: its card (the strokes, the score's name against par), Again or Done.
 *
 * A club is in his right hand while the round's on (the owner's call: golf is the one exception to "his hands hold
 * only weapons"). The HUD and the card are built here, styled by golf.css (the arcade kit).
 */
import * as THREE from 'three';
import { FX, toon } from './kit';
import { placeRoot } from './locomotion';
import { golfPose, puttPose, GOLF, PUTT, GOLF_SECONDS, PUTT_SECONDS } from './acts';
import type { Pose } from './skeleton';
import { HOLES, surfaceAt, type Pt, type Surface } from './golf';
import { golfLift } from './golflift';
import { FURNITURE } from './golflife';
import { CLUBS, PUTT_MAX, TRACE, STEP, groundAt, lieTake, newRound, playShot, roundOver, windOn, type ClubId, type Round, type ShotResult } from './golfgame-sim';

export interface GolfDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: HTMLElement;
  hero: { g: THREE.Object3D; pose: Pose; update(): void; hands: THREE.Object3D[] };
  /** Degen's size (walk.ts SCALE) */
  scale: number;
  toast(text: string, ms?: number): void;
  /** The round's over or quit: walk mode takes him back */
  end(): void;
}
export interface GolfGame {
  readonly active: boolean;
  /** Where Degen is (walk mode keeps its own place there, so the city round him is drawn) */
  readonly at: { x: number; y: number; z: number };
  start(holes: number[]): void;
  frame(dt: number, t: number): void;
  /** A key down or up: true if the round took it */
  key(code: string, down: boolean, repeat: boolean): boolean;
  quit(): void;
}

/** The meter (seconds and its reading): up from 0 past the top (`top`, a little over full) and back down; the
 * power's set on the way up, the accuracy on the way down (0 the line; `window` either side of it is a full hook or
 * slice; past `end` it's a full slice) */
export const METER = { rate: 1.05, top: 1.1, window: 0.12, end: -0.22 };
/** How fast A / D turn the aim (radians a second) */
const AIM_RATE = 0.7;
/** How far Degen stands from the ball he addresses (tiles: the crowd's golfers', golflife.ts `ADDRESS`) */
const ADDRESS = 0.42;
/** Where the swing's pose starts once the third press is in (near the top of the backswing), and the strike in it */
const SWING_FROM = { golf: 1.25, putt: 0.85 };
const STRIKE_AT = { golf: 1.82, putt: 1.3 };
/** The scores' names against par */
const SCORE_NAMES: Record<number, string> = { [-3]: 'Albatross', [-2]: 'Eagle', [-1]: 'Birdie', 0: 'Par', 1: 'Bogey', 2: 'Double bogey', 3: 'Triple bogey' };
export const scoreName = (strokes: number, par: number) => (strokes === 1 ? 'Hole in one' : (SCORE_NAMES[strokes - par] ?? `${strokes - par > 0 ? '+' : ''}${strokes - par}`));
/** A distance on the HUD (metres: a tile is about 1.8 m) */
const metres = (tiles: number) => `${Math.round(tiles * 1.8)} m`;

type Phase = 'aim' | 'meter' | 'swing' | 'fly' | 'settle' | 'move' | 'card';

/** The club picked first for a distance from a lie: the shortest that gets there, the putter on the green */
export function pickClub(d: number, lie: Surface | null): ClubId {
  if (lie === 'green') return 'putter';
  const clubs = CLUBS.filter((c) => c.id !== 'putter').sort((a, b) => a.carry - b.carry);
  for (const c of clubs) if (c.carry * lieTake(lie, c.id) >= d * 0.97) return c.id;
  return clubs[clubs.length - 1].id;
}

export function createGolfGame(d: GolfDeps): GolfGame {
  const { scene, camera, root, hero } = d;
  const pinOf = (h: number): Pt => FURNITURE[h].pin;

  /* ----- What's drawn: the ball, its trail, the aim's ring and line, the club in his hand ----- */
  const group = new THREE.Group();
  group.name = 'golf game';
  // (the ball a touch big to be seen, plain white and out of the ink's pre-pass: at its size an outline is all of it)
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  const TRAIL_N = 240;
  const trailPos = new Float32Array(TRAIL_N * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, fog: false }));
  trail.frustumCulled = false;
  const ringMat = new THREE.MeshBasicMaterial({ color: '#00eaff', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 40).rotateX(-Math.PI / 2), ringMat);
  const aimPos = new Float32Array(2 * 3);
  const aimGeo = new THREE.BufferGeometry();
  aimGeo.setAttribute('position', new THREE.BufferAttribute(aimPos, 3).setUsage(THREE.DynamicDrawUsage));
  const aimLine = new THREE.Line(aimGeo, new THREE.LineDashedMaterial({ color: '#00eaff', dashSize: 0.8, gapSize: 0.6, transparent: true, opacity: 0.8, fog: false }));
  aimLine.frustumCulled = false;
  // (on the FX layer: the ink's pre-pass draws none of them, kit.ts `fx()`)
  for (const o of [ball, trail, ring, aimLine]) o.layers.set(FX);
  group.add(ball, trail, ring, aimLine);
  // The club: its grip in his right fist, the shaft on down the hand's way, the head at its foot (wardrobe.ts's crowd club)
  const club = new THREE.Group();
  club.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.74, 5).translate(-0.02, -0.35, -0.006), toon('#c9ccd4')));
  club.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.085).translate(-0.02, -0.73, 0.029), toon('#3b3a44')));

  /* ----- The HUD and the card (golf.css) ----- */
  const hud = document.createElement('div');
  hud.className = 'golf-hud mk-skin';
  hud.hidden = true;
  hud.innerHTML = `<div class="golf-hud-left"><p class="golf-hole"><b data-golf-hole>Hole 1</b><span data-golf-par>Par 4</span></p><p class="golf-name" data-golf-name></p><p class="golf-stroke" data-golf-stroke>Stroke 1</p></div>
<div class="golf-hud-mid"><p class="golf-club"><span class="golf-key">W/S</span><b data-golf-club>Driver</b></p><p class="golf-to" data-golf-to>To the pin</p><p class="golf-lie" data-golf-lie></p></div>
<div class="golf-hud-right"><p class="golf-wind"><i class="golf-arrow" data-golf-arrow></i><b data-golf-wind>0</b></p><button type="button" class="golf-quit" data-golf-quit>Quit</button></div>
<div class="golf-meter" data-golf-meter><i class="golf-meter-zero"></i><i class="golf-meter-full"></i><i class="golf-meter-power" data-golf-power hidden></i><i class="golf-meter-mark" data-golf-mark></i><p class="golf-meter-tip" data-golf-tip>Space: swing</p></div>
<p class="golf-pop" data-golf-pop hidden></p>`;
  const card = document.createElement('section');
  card.className = 'shop race-result golf-card mk-skin';
  card.hidden = true;
  card.innerHTML = `<header class="shop-head"><h2 class="shop-title" data-golf-card-title>Hole 1</h2></header><div class="race-result-body"><p class="golf-card-score" data-golf-card-score></p><p class="golf-card-line" data-golf-card-line></p></div><div class="golf-card-take"><button type="button" class="mk-btn" data-golf-again>Again</button><button type="button" class="mk-btn" data-golf-done>Done</button></div>`;
  root.append(hud, card);
  const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;
  const el = {
    hole: $(hud, '[data-golf-hole]'),
    par: $(hud, '[data-golf-par]'),
    name: $(hud, '[data-golf-name]'),
    stroke: $(hud, '[data-golf-stroke]'),
    club: $(hud, '[data-golf-club]'),
    to: $(hud, '[data-golf-to]'),
    lie: $(hud, '[data-golf-lie]'),
    arrow: $(hud, '[data-golf-arrow]'),
    wind: $(hud, '[data-golf-wind]'),
    meter: $(hud, '[data-golf-meter]'),
    power: $(hud, '[data-golf-power]'),
    mark: $(hud, '[data-golf-mark]'),
    tip: $(hud, '[data-golf-tip]'),
    pop: $(hud, '[data-golf-pop]'),
    cardTitle: $(card, '[data-golf-card-title]'),
    cardScore: $(card, '[data-golf-card-score]'),
    cardLine: $(card, '[data-golf-card-line]'),
  };
  const set = (e: HTMLElement, text: string) => {
    if (e.textContent !== text) e.textContent = text;
  };

  /* ----- The round ----- */
  let active = false;
  let round: Round | null = null;
  let holes: number[] = [0];
  let phase: Phase = 'aim';
  let aim = 0;
  let clubId: ClubId = 'driver';
  const held = new Set<string>();
  /** The meter: its clock, the power once set */
  let meterT = 0;
  let power: number | null = null;
  let shot: ShotResult | null = null;
  /** Which of the round's holes the shot was played on (the sim moves the round on when a hole's done) */
  let shotOn = 0;
  /** The swing's pose clock, the flight's clock, the camera's move between shots */
  let swingT = 0;
  let flyT = 0;
  let settleT = 0;
  let moveT = 0;
  let popT = 0;
  const at = { x: 0, y: 0, z: 0 };
  const camFrom = new THREE.Vector3();
  const camFromLook = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const want = new THREE.Vector3();
  const wantLook = new THREE.Vector3();
  const root0 = { roll: 0, pitch: 0, pivot: 0 };
  /** The shot camera: behind the ball, or high over the hole looking down the aim (V) */
  let high = false;

  const hole = () => HOLES[round!.play.hole];
  const ballAt = () => round!.play.ball;
  /** Where the ball was addressed: he swings there while the sim's already moved it on to where it stops */
  const addr = { x: 0, y: 0, z: 0 };
  const lieNow = () => surfaceAt(ballAt().x, ballAt().z);
  const putting = () => clubId === 'putter';
  const pinDist = () => {
    const p = pinOf(round!.play.hole);
    return Math.hypot(p[0] - ballAt().x, p[1] - ballAt().z);
  };
  const dir = () => [Math.sin(aim), Math.cos(aim)] as const;

  function pop(text: string, s = 1.8) {
    set(el.pop, text);
    el.pop.hidden = false;
    popT = s;
  }

  /** Ready to play the ball where it lies: aimed at the pin, the club for the distance, Degen at the ball */
  function ready() {
    const b = ballAt();
    Object.assign(addr, b);
    const p = pinOf(round!.play.hole);
    aim = Math.atan2(p[0] - b.x, p[1] - b.z);
    clubId = pickClub(pinDist(), lieNow());
    phase = 'aim';
    power = null;
    meterT = 0;
    ball.position.set(b.x, b.y + 0.05, b.z);
    ball.visible = true;
    paintHud();
  }

  /** Where the camera sits for a shot, and what it looks at */
  function shotCamera(out: THREE.Vector3, look: THREE.Vector3) {
    const b = ballAt();
    const [fx, fz] = dir();
    // (behind the ball, a little to his side of it so he's in the picture, the ball low in the middle of it; or high
    // over it looking down the aim, V: the hole laid out ahead)
    const [back, up, ahead, side] = high ? (putting() ? [5, 7, 3, 0] : [10, 26, 40, 0]) : putting() ? [2.6, 1.2, 4, 0.5] : [4.2, 1.7, 10, 0.9];
    const [sx, sz] = [-fz * side, fx * side];
    out.set(b.x - fx * back - sx, Math.max(b.y, groundAt(b.x - fx * back, b.z - fz * back)) + up, b.z - fz * back - sz);
    look.set(b.x + fx * ahead, b.y + (putting() ? 0 : 0.5), b.z + fz * ahead);
  }

  /** Degen side-on at the ball (the target to his left), posed `swingT` into his swing or putt */
  function poseHero(t: number) {
    const b = addr;
    const [fx, fz] = dir();
    // (his chest faces across the line: facing +z his left is +x, so the line's (fx, fz) is to his left when he faces (-fz, fx))
    const [cx, cz] = [-fz, fx];
    const x = b.x - cx * ADDRESS;
    const z = b.z - cz * ADDRESS;
    const P = hero.pose;
    if (putting()) puttPose(P, t % PUTT_SECONDS);
    else golfPose(P, t % GOLF_SECONDS);
    P.grip = putting() ? [PUTT.grip, PUTT.grip] : [GOLF.grip, GOLF.grip];
    hero.update();
    const y = golfLift(x, z);
    placeRoot(hero.g, x, y, z, Math.atan2(cx, cz), d.scale, root0);
    hero.g.visible = true;
    at.x = x;
    at.y = y;
    at.z = z;
  }

  function paintHud() {
    if (!round) return;
    const h = hole();
    set(el.hole, `Hole ${h.n}`);
    set(el.par, `Par ${h.par}`);
    set(el.name, h.name);
    set(el.stroke, `Stroke ${round.play.strokes + 1}`);
    set(el.club, CLUBS.find((c) => c.id === clubId)!.name);
    set(el.to, `To the pin ${metres(pinDist())}`);
    const lie = lieNow();
    set(el.lie, lie ? lie[0].toUpperCase() + lie.slice(1) : '');
    const w = windOn(round);
    set(el.wind, `${Math.round(w.speed * 1.8 * 3.6)} km/h`);
    // (the arrow turned to where it blows, as the camera looks: up the screen is down the aim)
    el.arrow.style.transform = `rotate(${(((w.dir - aim) * 180) / Math.PI).toFixed(0)}deg)`;
  }

  /** The aim's ring and line: where the club carries at full power (the putter: at the pin's distance) */
  function paintAim() {
    const b = ballAt();
    const [fx, fz] = dir();
    const c = CLUBS.find((k) => k.id === clubId)!;
    const reach = putting() ? Math.min(PUTT_MAX, pinDist()) : c.carry * lieTake(lieNow(), clubId);
    const [x, z] = [b.x + fx * reach, b.z + fz * reach];
    const y = groundAt(x, z) + 0.06;
    ring.position.set(x, y, z);
    ring.scale.setScalar(putting() ? 0.25 : 1 + reach / 60);
    aimPos.set([b.x, b.y + 0.05, b.z, x, y, z]);
    aimGeo.attributes.position.needsUpdate = true;
    aimLine.computeLineDistances();
    ring.visible = aimLine.visible = phase === 'aim' || phase === 'meter';
  }

  /** The meter's reading at its clock: up past the top and back down to its end */
  const reading = (t: number) => {
    const up = METER.top / METER.rate;
    return t <= up ? t * METER.rate : METER.top - (t - up) * METER.rate;
  };
  function paintMeter() {
    const v = phase === 'meter' ? reading(meterT) : 0;
    // (the bar's left is the end of the swing's way down, its right the top)
    const at = (r: number) => `${(((r - METER.end) / (METER.top - METER.end)) * 100).toFixed(1)}%`;
    el.mark.style.left = at(v);
    el.power.hidden = power === null;
    if (power !== null) el.power.style.left = at(power);
    set(el.tip, phase === 'aim' ? 'Space: swing' : phase === 'meter' ? (power === null ? 'Space: power' : 'Space: accuracy') : '');
  }

  /** The third press (or the meter run out): the shot played, the swing under way */
  function swing(accuracy: number) {
    if (!round || power === null) return;
    const s = { club: clubId, aim, power, accuracy };
    shotOn = round.at;
    shot = playShot(round, s, pinOf);
    phase = 'swing';
    swingT = putting() ? SWING_FROM.putt : SWING_FROM.golf;
    flyT = 0;
    trail.geometry.setDrawRange(0, 0);
  }

  function start(list: number[]) {
    holes = list;
    round = newRound(holes, (Date.now() & 0x7fffffff) | 1);
    active = true;
    scene.add(group);
    hero.hands[1].add(club);
    hud.hidden = card.hidden = true;
    hud.hidden = false;
    root.classList.add('is-golfing');
    held.clear();
    ready();
    shotCamera(camera.position, camLook);
    camera.lookAt(camLook);
    poseHero(0);
  }
  function stop() {
    if (!active) return;
    active = false;
    scene.remove(group);
    club.removeFromParent();
    hud.hidden = card.hidden = true;
    root.classList.remove('is-golfing');
    held.clear();
    d.end();
  }

  /** The hole's card: its strokes and their name against par */
  function showCard() {
    if (!round) return;
    const i = shotOn;
    const h = HOLES[round.holes[i]];
    const strokes = round.card[i] ?? 0;
    set(el.cardTitle, `Hole ${h.n} · ${h.name}`);
    set(el.cardScore, scoreName(strokes, h.par));
    set(el.cardLine, `${strokes} stroke${strokes === 1 ? '' : 's'} · par ${h.par}`);
    card.hidden = false;
    phase = 'card';
  }
  card.querySelector('[data-golf-again]')!.addEventListener('click', () => {
    card.hidden = true;
    stop();
    start(holes);
  });
  card.querySelector('[data-golf-done]')!.addEventListener('click', () => stop());
  hud.querySelector('[data-golf-quit]')!.addEventListener('click', () => stop());

  function frame(dt: number) {
    if (!active || !round) return;
    if (popT > 0 && (popT -= dt) <= 0) el.pop.hidden = true;
    const k = 1 - Math.exp(-6 * dt);
    if (phase === 'aim' || phase === 'meter') {
      // A / D or the arrows turn the aim (not once the swing's on)
      if (phase === 'aim') {
        const turn = (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0) - (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0);
        if (turn) {
          aim += turn * AIM_RATE * (putting() ? 0.4 : 1) * dt;
          paintHud();
        }
      }
      if (phase === 'meter') {
        meterT += dt;
        const v = reading(meterT);
        // (no power before it came back down through nothing: a swing called off)
        if (power === null && meterT > METER.top / METER.rate && v <= 0) {
          phase = 'aim';
          pop('Swing again', 1.2);
        } else if (power !== null && v <= METER.end) swing(1);
      }
      paintAim();
      paintMeter();
      poseHero(0);
      shotCamera(want, wantLook);
      camera.position.lerp(want, k);
      camLook.lerp(wantLook, k);
      camera.lookAt(camLook);
      return;
    }
    if (phase === 'swing') {
      const strikeAt = putting() ? STRIKE_AT.putt : STRIKE_AT.golf;
      swingT += dt;
      poseHero(swingT);
      if (swingT >= strikeAt) phase = 'fly';
      paintAim();
      paintMeter();
      return;
    }
    if (phase === 'fly' && shot) {
      // The ball along its path, as fast as it flew (a point every TRACE steps), the trail behind it, the camera after it
      flyT += dt;
      swingT = Math.min(swingT + dt, putting() ? 2.1 : 2.85);
      poseHero(swingT);
      const per = TRACE * STEP;
      const n = shot.path.length;
      const f = Math.min(n - 1, flyT / per);
      const i = Math.floor(f);
      const [a, b] = [shot.path[i], shot.path[Math.min(n - 1, i + 1)]];
      const u = f - i;
      ball.position.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
      const shown = Math.min(TRAIL_N, i + 1);
      const from = Math.max(0, i + 1 - shown);
      for (let j = 0; j < shown; j++) {
        const p = shot.path[from + j];
        trailPos.set([p.x, p.y, p.z], j * 3);
      }
      trailGeo.attributes.position.needsUpdate = true;
      trail.geometry.setDrawRange(0, shown);
      // (behind the ball and over it, looking at it; a putt's camera stays put)
      if (!putting()) {
        const [dx, dz] = [b.x - a.x, b.z - a.z];
        const L = Math.hypot(dx, dz) || 1;
        want.set(ball.position.x - (dx / L) * 9, ball.position.y + 4, ball.position.z - (dz / L) * 9);
        camera.position.lerp(want, 1 - Math.exp(-3 * dt));
      }
      camLook.lerp(ball.position, k);
      camera.lookAt(camLook);
      if (f >= n - 1) {
        phase = 'settle';
        settleT = 0;
        if (shot.holed) pop(scoreName(round.card[shotOn] ?? 0, HOLES[round.holes[shotOn]].par), 2.4);
        else if (shot.penalty === 'water') pop('In the water · a stroke', 2.2);
        else if (shot.penalty === 'out') pop('Out of bounds · a stroke', 2.2);
        else if (shot.tree) pop('Off a tree', 1.4);
      }
      return;
    }
    if (phase === 'settle') {
      settleT += dt;
      camLook.lerp(ball.position, k);
      camera.lookAt(camLook);
      if (settleT < 1.1) return;
      // (holed, or picked up at its most: the hole's done)
      if (round.at !== shotOn || roundOver(round)) return showCard();
      // On to where it lies: the camera flies there
      camFrom.copy(camera.position);
      camFromLook.copy(camLook);
      hero.g.visible = false;
      ready();
      moveT = 0;
      phase = 'move';
      return;
    }
    if (phase === 'move') {
      moveT += dt;
      const u = Math.min(1, moveT / 1.4);
      const e = u * u * (3 - 2 * u);
      shotCamera(want, wantLook);
      // (a hop up over the course on the way)
      camera.position.lerpVectors(camFrom, want, e);
      camera.position.y += Math.sin(Math.PI * e) * Math.min(12, camFrom.distanceTo(want) * 0.15);
      camLook.lerpVectors(camFromLook, wantLook, e);
      camera.lookAt(camLook);
      paintAim();
      if (u >= 1) {
        phase = 'aim';
        poseHero(0);
      }
    }
  }

  function key(code: string, down: boolean, repeat: boolean): boolean {
    if (!active) return false;
    const aimKeys = ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'];
    if (aimKeys.includes(code)) {
      if (down) held.add(code);
      else held.delete(code);
      return true;
    }
    if (!down || repeat) return ['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'Space', 'KeyV'].includes(code);
    if (code === 'KeyV') {
      high = !high;
      return true;
    }
    if (phase === 'aim' && ['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].includes(code)) {
      // W / up a longer club, S / down a shorter one
      const ids = CLUBS.map((c) => c.id);
      const i = ids.indexOf(clubId);
      const step = code === 'KeyW' || code === 'ArrowUp' ? -1 : 1;
      clubId = ids[Math.max(0, Math.min(ids.length - 1, i + step))];
      paintHud();
      return true;
    }
    if (code === 'Space') {
      if (phase === 'aim') {
        phase = 'meter';
        meterT = 0;
        power = null;
      } else if (phase === 'meter') {
        const v = reading(meterT);
        if (power === null) {
          // (on its way up, or just past the top)
          power = Math.max(0.05, Math.min(METER.top, v));
        } else {
          // On the way down: early (still over the line) a hook, late a slice
          swing(Math.max(-1, Math.min(1, -v / METER.window)));
        }
      }
      return true;
    }
    return false;
  }

  return {
    get active() {
      return active;
    },
    at,
    start,
    frame: (dt) => frame(dt),
    key,
    quit: stop,
  };
}
