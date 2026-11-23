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
 * - **Between shots** the camera flies to where it stopped (the owner's call); a penalty says so in a pop. On the
 *   green the slope's shown (`paintSlopes()`: a chevron a tile pointing downhill, longer where it's steeper).
 * - **The menu** (Play golf at the door, `open()`, Phase 3): Continue a round left part-way (it's kept on the save
 *   after every shot), a hole on its own (picked), the front nine, the back nine or all eighteen; the bests.
 * - **The hole done**: its card (the strokes, the score's name against par, the XP), Next hole; the round done: its
 *   card (the strokes against par, the Dorras, under the day's cap, the XP), Again or Done (golfscore.ts pays them).
 * - **The crowd's golfers** keep off the hole being played (golflife.ts `PLAYING`).
 * - **Touch, the pad and sound** (Phase 4): on a touch screen ◀ ▶ aim, Club ▲ ▼ the club, View the camera, and the
 *   swing's a pull-back anywhere over the course (`PULL`: how far down is the power, past full as the meter's top; how
 *   far it leans off straight down is the accuracy, as a slingshot's: leaning right a hook, left a slice). The pad:
 *   the left stick or the d-pad aims, LB / RB or the d-pad's up and down the club, A the meter's three presses, R3 or
 *   Y the camera, B or Start quits; its menu and cards by the d-pad and A (the menus' kit). The HUD's hints follow
 *   what you last used. The club's strike, a putt, the landing, a tree, the water and the cup are heard
 *   (sound.ts). Under reduced motion the camera cuts between shots and only turns to follow the ball.
 *
 * A club is in his right hand while the round's on (the owner's call: golf is the one exception to "his hands hold
 * only weapons"). The HUD and the card are built here, styled by golf.css (the arcade kit).
 */
import * as THREE from 'three';
import { FX, toon } from './kit';
import { placeRoot } from './locomotion';
import { golfPose, puttPose, GOLF, PUTT, GOLF_SECONDS, PUTT_SECONDS } from './acts';
import type { Pose } from './skeleton';
import { HOLES, onGreen, surfaceAt, type Pt, type Surface } from './golf';
import { golfLift } from './golflift';
import { FURNITURE, PLAYING } from './golflife';
import { dropRound, finishGolfHole, finishGolfRound, keepRound, parWords, type RoundResult } from './golfscore';
import type { SavedRound, TycoonSave } from './tycoon';
import { menuKit } from './menukit';
import type { Sfx } from './combat';
import { CLUBS, METER, PULL, pullShot, PUTT_MAX, TRACE, STEP, groundAt, lieTake, newRound, playShot, roundOver, slopeAt, toPar, windOn, type ClubId, type Round, type ShotResult } from './golfgame-sim';

export interface GolfDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: HTMLElement;
  hero: { g: THREE.Object3D; pose: Pose; update(): void; hands: THREE.Object3D[] };
  /** Degen's size (walk.ts SCALE) */
  scale: number;
  toast(text: string, ms?: number): void;
  /** The city's save (the game's GameDeps: `save()`, then `commit()`) */
  game: { save(): TycoonSave; commit(): void };
  /** Whether prizes pay (the owner's live `prizes` switch) */
  prizes(): boolean;
  /** The round's over or quit: walk mode takes him back */
  end(): void;
  /** A sound (sound.ts; silent till the visitor turns sound on) */
  sfx?(kind: Sfx): void;
  /** prefers-reduced-motion: the camera cuts between shots */
  reduced?: boolean;
}
export interface GolfGame {
  readonly active: boolean;
  /** A round's on (not the menu) */
  readonly playing: boolean;
  /** Where Degen is (walk mode keeps its own place there, so the city round him is drawn) */
  readonly at: { x: number; y: number; z: number };
  /** The clubhouse's menu: carry on a round, play a hole, a nine or the eighteen */
  open(): void;
  start(holes: number[], saved?: SavedRound | null): void;
  frame(dt: number, t: number): void;
  /** A key down or up: true if the round took it */
  key(code: string, down: boolean, repeat: boolean): boolean;
  /** The gamepad's poll (walkpad.ts): `edge` a button just pressed, `held` one down, `x` the left stick across */
  pad(edge: (i: number) => boolean, held: (i: number) => boolean, x: number): void;
  quit(): void;
}

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

type Phase = 'menu' | 'aim' | 'meter' | 'swing' | 'fly' | 'settle' | 'move' | 'card';

/** The club picked first for a distance from a lie: the shortest that gets there (the driver only off a tee), the putter on the green */
export function pickClub(d: number, lie: Surface | null): ClubId {
  if (lie === 'green') return 'putter';
  // (the driver off a tee only: anywhere else the 3 wood is the longest picked; W still reaches the driver)
  const clubs = CLUBS.filter((c) => c.id !== 'putter' && (c.id !== 'driver' || lie === 'tee')).sort((a, b) => a.carry - b.carry);
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
  // The green's slope while putting: a chevron every tile pointing downhill, longer where it's steeper
  const SLOPES_MAX = 400;
  const chevron = new THREE.BufferGeometry();
  chevron.setAttribute('position', new THREE.Float32BufferAttribute([-0.13, 0, -0.14, 0, 0, 0.2, 0.13, 0, -0.14, 0, 0, -0.04], 3));
  chevron.setIndex([0, 1, 3, 3, 1, 2]);
  const slopes = new THREE.InstancedMesh(chevron, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, fog: false }), SLOPES_MAX);
  slopes.frustumCulled = false;
  slopes.count = 0;
  slopes.visible = false;
  let slopesOn = -1;
  function paintSlopes(hole: number) {
    if (slopesOn === hole) return;
    slopesOn = hole;
    const h = HOLES[hole];
    const [cx, cz] = h.line.at(-1)!;
    const R = Math.max(...h.green) + 1;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    let n = 0;
    for (let x = cx - R; x <= cx + R && n < SLOPES_MAX; x += 1)
      for (let z = cz - R; z <= cz + R && n < SLOPES_MAX; z += 1) {
        if (onGreen(h, x, z) > 0.92) continue;
        const [gx, gz] = slopeAt(x, z);
        const steep = Math.hypot(gx, gz);
        // (flat ground shows a small dot of a chevron; the steeper, the longer)
        const k = 0.45 + Math.min(1, steep * 25) * 0.9;
        q.setFromAxisAngle(up, Math.atan2(-gx, -gz));
        slopes.setMatrixAt(n++, m.compose(v.set(x, golfLift(x, z) + 0.06, z), q, sc.set(k, 1, k)));
      }
    slopes.count = n;
    slopes.instanceMatrix.needsUpdate = true;
  }
  group.add(ball, trail, ring, aimLine, slopes);
  for (const o of [ball, trail, ring, aimLine, slopes]) o.layers.set(FX);
  // The club: its grip in his right fist, the shaft on down the hand's way, the head at its foot (wardrobe.ts's crowd club)
  const club = new THREE.Group();
  club.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.74, 5).translate(-0.02, -0.35, -0.006), toon('#c9ccd4')));
  club.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.085).translate(-0.02, -0.73, 0.029), toon('#3b3a44')));

  /* ----- The HUD and the card (golf.css) ----- */
  const hud = document.createElement('div');
  hud.className = 'golf-hud mk-skin';
  hud.hidden = true;
  hud.innerHTML = `<div class="golf-hud-left"><p class="golf-hole"><b data-golf-hole>Hole 1</b><span data-golf-par>Par 4</span></p><p class="golf-name" data-golf-name></p><p class="golf-stroke" data-golf-stroke>Stroke 1</p><p class="golf-round" data-golf-round></p></div>
<div class="golf-hud-mid"><p class="golf-club"><span class="golf-key" data-golf-clubkey>W/S</span><b data-golf-club>Driver</b></p><p class="golf-to" data-golf-to>To the pin</p><p class="golf-lie" data-golf-lie></p></div>
<div class="golf-hud-right"><p class="golf-wind"><i class="golf-arrow" data-golf-arrow></i><b data-golf-wind>0</b></p><button type="button" class="golf-quit" data-golf-quit>Quit</button></div>
<div class="golf-meter" data-golf-meter><i class="golf-meter-zero"></i><i class="golf-meter-full"></i><i class="golf-meter-power" data-golf-power hidden></i><i class="golf-meter-mark" data-golf-mark></i><p class="golf-meter-tip" data-golf-tip>Space: swing</p></div>
<div class="golf-pull" data-golf-pull><i class="golf-pull-line" data-golf-pull-line hidden></i></div>
<div class="golf-touch"><button type="button" class="golf-tb" data-golf-aim="1" aria-label="Aim left">◀</button><button type="button" class="golf-tb" data-golf-aim="-1" aria-label="Aim right">▶</button><button type="button" class="golf-tb" data-golf-clubstep="-1" aria-label="A longer club">Club ▲</button><button type="button" class="golf-tb" data-golf-clubstep="1" aria-label="A shorter club">Club ▼</button><button type="button" class="golf-tb" data-golf-view>View</button></div>
<p class="golf-pop" data-golf-pop hidden></p>`;
  const card = document.createElement('section');
  card.className = 'shop race-result golf-card mk-skin';
  card.hidden = true;
  card.innerHTML = `<header class="shop-head"><h2 class="shop-title" data-golf-card-title>Hole 1</h2></header><div class="race-result-body"><p class="golf-card-score" data-golf-card-score></p><p class="golf-card-line" data-golf-card-line></p><p class="golf-card-take-line" data-golf-card-take></p></div><div class="golf-card-take"><button type="button" class="mk-btn" data-golf-next>Next hole</button><button type="button" class="mk-btn" data-golf-again>Again</button><button type="button" class="mk-btn" data-golf-done>Done</button></div>`;
  // The clubhouse's menu: carry on a round left, a hole on its own (picked), a nine or all eighteen
  const menu = document.createElement('section');
  menu.className = 'shop golf-menu mk-skin';
  menu.hidden = true;
  menu.innerHTML = `<header class="shop-head"><h2 class="shop-title">Knob Hill</h2><button type="button" class="shop-close" data-golf-menu-close aria-label="Close the golf menu"><svg class="mk-xi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><use href="#mk-x" /></svg></button></header>
<div class="golf-menu-body"><button type="button" class="mk-btn golf-continue" data-golf-continue hidden>Continue</button>
<div class="golf-pick"><button type="button" class="golf-step" data-golf-prev aria-label="The hole before">‹</button><p class="golf-pick-name"><b data-golf-pick-hole>Hole 1</b><span data-golf-pick-line></span></p><button type="button" class="golf-step" data-golf-next-hole aria-label="The next hole">›</button></div>
<button type="button" class="mk-btn" data-golf-one>Play hole</button><button type="button" class="mk-btn" data-golf-front>Front nine</button><button type="button" class="mk-btn" data-golf-back>Back nine</button><button type="button" class="mk-btn" data-golf-full>All eighteen</button>
<p class="golf-bests" data-golf-bests></p></div>`;
  root.append(hud, card, menu);
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
    cardTake: $(card, '[data-golf-card-take]'),
    next: $(card, '[data-golf-next]'),
    again: $(card, '[data-golf-again]'),
    round: $(hud, '[data-golf-round]'),
    cont: $(menu, '[data-golf-continue]'),
    pickHole: $(menu, '[data-golf-pick-hole]'),
    pickLine: $(menu, '[data-golf-pick-line]'),
    bests: $(menu, '[data-golf-bests]'),
    clubKey: $(hud, '[data-golf-clubkey]'),
    pull: $(hud, '[data-golf-pull]'),
    pullLine: $(hud, '[data-golf-pull-line]'),
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
  /** What the save made of the hole and the round the last shot finished */
  let holeDone: ReturnType<typeof finishGolfHole> | null = null;
  let roundDone: RoundResult | null = null;
  /** The hole picked on the menu */
  let pick = 0;
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
  /** What was last used (the HUD's hints follow it), the pad's and the touch arrows' aim */
  let input: 'keys' | 'pad' | 'touch' = matchMedia('(hover: none) and (pointer: coarse)').matches ? 'touch' : 'keys';
  let padTurn = 0;
  let touchTurn = 0;
  /** The touch swing's pull-back under way: its finger, where it started, the shot it makes so far */
  const pull = { id: -1, x0: 0, y0: 0, power: 0, accuracy: 0 };
  /** The shot's sounds: where in its path it lands (and hits a tree), and whether they've been heard */
  let landAt = -1;
  let treeAt = -1;
  let heard = { land: false, tree: false };
  const sfx = (k: Sfx) => d.sfx?.(k);

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
    // (the crowd's golfers off this hole while it's played; the green's slope shown for a putt)
    PLAYING.hole = round!.play.hole;
    if (lieNow() === 'green') paintSlopes(round!.play.hole);
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
    // (in a round of more than one: which of them, and the score so far)
    const many = round.holes.length > 1;
    el.round.hidden = !many;
    if (many) set(el.round, `${round.at + 1} of ${round.holes.length} · ${parWords(toPar(round))}`);
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
    slopes.visible = putting() && slopesOn === round!.play.hole && (phase === 'aim' || phase === 'meter');
  }

  /** The meter's reading at its clock: up past the top and back down to its end */
  const reading = (t: number) => {
    const up = METER.top / METER.rate;
    return t <= up ? t * METER.rate : METER.top - (t - up) * METER.rate;
  };
  function paintMeter() {
    const v = phase === 'meter' ? reading(meterT) : pull.id >= 0 ? pull.power : 0;
    // (the bar's left is the end of the swing's way down, its right the top)
    const at = (r: number) => `${(((r - METER.end) / (METER.top - METER.end)) * 100).toFixed(1)}%`;
    el.mark.style.left = at(v);
    el.power.hidden = power === null;
    if (power !== null) el.power.style.left = at(power);
    const b = input === 'pad' ? 'A' : 'Space';
    const tip = input === 'touch' ? (pull.id >= 0 ? 'Let go to swing' : 'Pull back to swing') : `${b}: swing`;
    set(el.tip, phase === 'aim' ? tip : phase === 'meter' ? (power === null ? `${b}: power` : `${b}: accuracy`) : '');
    set(el.clubKey, input === 'pad' ? 'LB/RB' : 'W/S');
  }

  /** The third press (or the meter run out): the shot played, the swing under way */
  function swing(accuracy: number) {
    if (!round || power === null) return;
    const s = { club: clubId, aim, power, accuracy };
    shotOn = round.at;
    shot = playShot(round, s, pinOf);
    // On the save: the hole done counted, the round done paid, or the round kept to carry on
    const save = d.game.save();
    holeDone = null;
    roundDone = null;
    if (round.at !== shotOn) holeDone = finishGolfHole(save, round.holes[shotOn], round.card[shotOn] ?? 0);
    if (roundOver(round)) {
      roundDone = finishGolfRound(save, { holes: round.holes, card: round.card.map((c) => c ?? 20), now: Date.now(), prizes: d.prizes() });
      dropRound(save);
    } else keepRound(save, round as unknown as SavedRound);
    d.game.commit();
    // (where it lands, and where a tree stopped it: the sounds' moments)
    landAt = treeAt = -1;
    heard = { land: false, tree: false };
    if (shot && !putting()) {
      let hi = 0;
      for (let i = 1; i < shot.path.length; i++) {
        const [a, q] = [shot.path[i - 1], shot.path[i]];
        const h = q.y - groundAt(q.x, q.z);
        if (shot.tree && treeAt < 0 && h > 0.3 && i > 1) {
          const [p0, p1] = [shot.path[i - 2], a];
          const before = Math.hypot(p1.x - p0.x, p1.z - p0.z);
          if (before > 0.05 && Math.hypot(q.x - a.x, q.z - a.z) < before * 0.35) treeAt = i;
        }
        hi = Math.max(hi, h);
        if (hi > 0.4 && h < 0.08) {
          landAt = i;
          break;
        }
      }
    }
    phase = 'swing';
    swingT = putting() ? SWING_FROM.putt : SWING_FROM.golf;
    flyT = 0;
    trail.geometry.setDrawRange(0, 0);
  }

  function start(list: number[], saved?: SavedRound | null) {
    holes = saved ? saved.holes : list;
    round = saved ? (JSON.parse(JSON.stringify(saved)) as Round) : newRound(holes, (Date.now() & 0x7fffffff) | 1);
    if (!saved) {
      keepRound(d.game.save(), round as unknown as SavedRound);
      d.game.commit();
    }
    active = true;
    scene.add(group);
    hero.hands[1].add(club);
    hud.hidden = card.hidden = menu.hidden = true;
    hud.hidden = false;
    root.classList.add('is-golfing');
    held.clear();
    endPull();
    ready();
    shotCamera(camera.position, camLook);
    camera.lookAt(camLook);
    poseHero(0);
  }
  function stop() {
    if (!active) return;
    // (a round left part-way is kept: Continue on the menu carries it on)
    if (round && !roundOver(round) && phase !== 'menu') d.toast('Round kept · Continue at the clubhouse door', 3000);
    active = false;
    PLAYING.hole = -1;
    slopes.visible = false;
    scene.remove(group);
    club.removeFromParent();
    hud.hidden = card.hidden = menu.hidden = true;
    root.classList.remove('is-golfing');
    held.clear();
    endPull();
    padTurn = touchTurn = 0;
    d.end();
  }

  /** The hole's card: its strokes and their name against par */
  function showCard() {
    if (!round) return;
    const i = shotOn;
    const h = HOLES[round.holes[i]];
    const strokes = round.card[i] ?? 0;
    const over = roundOver(round);
    const r = roundDone;
    if (over && r && round.holes.length > 1) {
      // The round's card: its strokes against par, what it paid
      set(el.cardTitle, r.kind === 'front' ? 'The front nine' : r.kind === 'back' ? 'The back nine' : r.kind === 'full' ? 'All eighteen' : 'The round');
      set(el.cardScore, parWords(r.toPar));
      set(el.cardLine, `${r.strokes} strokes · par ${r.par}${r.best ? ' · your best' : ''}`);
    } else {
      set(el.cardTitle, `Hole ${h.n} · ${h.name}`);
      set(el.cardScore, scoreName(strokes, h.par));
      set(el.cardLine, `${strokes} stroke${strokes === 1 ? '' : 's'} · par ${h.par}${holeDone?.best ? ' · your best here' : ''}`);
    }
    // (what it earned: the hole's XP, and at the round's end its Dorras, under the day's cap)
    const xp = (holeDone?.xp ?? 0) + (r?.xp ?? 0);
    const levels = (holeDone?.levels ?? 0) + (r?.levels ?? 0);
    const paid = r ? (r.prize > 0 ? `${r.prize.toLocaleString()} Dorras${r.capped ? ' (daily cap)' : ''} · ` : '') : '';
    set(el.cardTake, `${paid}+${xp} XP${levels > 0 ? ' · Level up' : ''}`);
    el.next.hidden = over;
    el.again.hidden = !over;
    card.hidden = false;
    phase = 'card';
    if (over) sfx('finish');
    // (the pad's A on the first button)
    if (input === 'pad') requestAnimationFrame(() => cardKit.focusFirst('[data-golf-next]:not([hidden]), [data-golf-again]:not([hidden])'));
  }
  el.next.addEventListener('click', () => {
    if (!round || roundOver(round)) return;
    // On to the next tee: the camera flies there
    card.hidden = true;
    camFrom.copy(camera.position);
    camFromLook.copy(camLook);
    hero.g.visible = false;
    ready();
    moveT = 0;
    phase = 'move';
  });
  el.again.addEventListener('click', () => {
    card.hidden = true;
    const list = holes;
    stop();
    start(list);
  });
  card.querySelector('[data-golf-done]')!.addEventListener('click', () => stop());

  /* ----- The menu ----- */
  function paintMenu() {
    const g = d.game.save().golf;
    el.cont.hidden = !g.round;
    if (g.round) set(el.cont, `Continue · hole ${HOLES[g.round.play.hole].n}`);
    const h = HOLES[pick];
    set(el.pickHole, `Hole ${h.n}`);
    set(el.pickLine, `${h.name} · par ${h.par}${g.holes[pick] ? ` · best ${g.holes[pick]}` : ''}`);
    const best = (n: number, what: string) => (n ? `${what} ${n}` : '');
    set(el.bests, [best(g.front, 'Front nine'), best(g.back, 'Back nine'), best(g.full, 'Eighteen')].filter(Boolean).join(' · ') || 'No rounds yet');
  }
  function open() {
    if (active) return;
    active = true;
    phase = 'menu';
    round = null;
    menu.hidden = false;
    root.classList.add('is-golfing');
    paintMenu();
    menuKit_.shown();
    if (input === 'pad') requestAnimationFrame(() => menuKit_.focusFirst(el.cont.hidden ? '[data-golf-one]' : '[data-golf-continue]'));
    // (the mouse freed for the menu)
    if (document.pointerLockElement) document.exitPointerLock();
  }
  const closeMenu = () => {
    menu.hidden = true;
    active = false;
    root.classList.remove('is-golfing');
    d.end();
  };
  menu.querySelector('[data-golf-menu-close]')!.addEventListener('click', closeMenu);
  // (the menus' kit: the arrows and the d-pad round its buttons, A or Enter presses)
  const menuKit_ = menuKit(menu, { close: closeMenu });
  const cardKit = menuKit(card, { close: () => stop() });
  menu.querySelector('[data-golf-prev]')!.addEventListener('click', () => {
    pick = (pick + HOLES.length - 1) % HOLES.length;
    paintMenu();
  });
  menu.querySelector('[data-golf-next-hole]')!.addEventListener('click', () => {
    pick = (pick + 1) % HOLES.length;
    paintMenu();
  });
  const go = (list: number[], saved?: SavedRound | null) => {
    active = false;
    start(list, saved);
  };
  el.cont.addEventListener('click', () => go([], d.game.save().golf.round));
  menu.querySelector('[data-golf-one]')!.addEventListener('click', () => go([pick]));
  menu.querySelector('[data-golf-front]')!.addEventListener('click', () => go([...Array(9).keys()]));
  menu.querySelector('[data-golf-back]')!.addEventListener('click', () => go([...Array(9).keys()].map((i) => i + 9)));
  menu.querySelector('[data-golf-full]')!.addEventListener('click', () => go([...Array(18).keys()]));
  hud.querySelector('[data-golf-quit]')!.addEventListener('click', () => stop());

  function frame(dt: number) {
    if (!active || phase === 'menu' || !round) return;
    if (popT > 0 && (popT -= dt) <= 0) el.pop.hidden = true;
    const k = 1 - Math.exp(-6 * dt);
    if (phase === 'aim' || phase === 'meter') {
      // A / D or the arrows turn the aim (not once the swing's on)
      if (phase === 'aim') {
        const keys = (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0) - (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0);
        const turn = Math.max(-1, Math.min(1, keys + padTurn + touchTurn));
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
      if (swingT >= strikeAt) {
        phase = 'fly';
        sfx(putting() ? 'golfPutt' : 'golfHit');
      }
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
      if (treeAt >= 0 && i >= treeAt && !heard.tree) {
        heard.tree = true;
        sfx('golfTree');
      }
      if (landAt >= 0 && i >= landAt && !heard.land && shot.penalty !== 'water') {
        heard.land = true;
        sfx('golfLand');
      }
      const shown = Math.min(TRAIL_N, i + 1);
      const from = Math.max(0, i + 1 - shown);
      for (let j = 0; j < shown; j++) {
        const p = shot.path[from + j];
        trailPos.set([p.x, p.y, p.z], j * 3);
      }
      trailGeo.attributes.position.needsUpdate = true;
      trail.geometry.setDrawRange(0, shown);
      // (behind the ball and over it, looking at it; a putt's camera stays put, and under reduced motion it only turns)
      if (!putting() && !d.reduced) {
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
        if (shot.holed) sfx('golfCup');
        else if (shot.penalty === 'water') sfx('golfSplash');
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
      // (under reduced motion a cut)
      const u = d.reduced ? 1 : Math.min(1, moveT / 1.4);
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

  /** W / up, LB, the d-pad's up, Club ▲: a longer club (-1); S / down, RB, Club ▼ a shorter one (1) */
  function stepClub(step: 1 | -1) {
    if (phase !== 'aim' || pull.id >= 0) return;
    const ids = CLUBS.map((c) => c.id);
    const i = ids.indexOf(clubId);
    clubId = ids[Math.max(0, Math.min(ids.length - 1, i + step))];
    paintHud();
  }
  /** Space or A: the meter's three presses (start, power on the way up, accuracy on the way down) */
  function press() {
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
  }
  const toggleView = () => {
    high = !high;
  };

  function key(code: string, down: boolean, repeat: boolean): boolean {
    if (!active) return false;
    // (the menu's buttons take the mouse; walking keys wait)
    if (phase === 'menu') return true;
    if (down) input = 'keys';
    const aimKeys = ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'];
    if (aimKeys.includes(code)) {
      if (down) held.add(code);
      else held.delete(code);
      return true;
    }
    if (!down || repeat) return ['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'Space', 'KeyV'].includes(code);
    if (code === 'KeyV') {
      toggleView();
      return true;
    }
    if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].includes(code)) {
      stepClub(code === 'KeyW' || code === 'ArrowUp' ? -1 : 1);
      return true;
    }
    if (code === 'Space') {
      press();
      return true;
    }
    return false;
  }

  /** The gamepad (walkpad.ts polls it): the menu's and the card's buttons by the d-pad and A, a round's controls */
  function pad(edge: (i: number) => boolean, down: (i: number) => boolean, x: number) {
    if (!active) return;
    const pressed = [0, 1, 2, 3, 4, 5, 9, 11, 12, 13, 14, 15].some(edge);
    if (pressed || x) input = 'pad';
    const kit = phase === 'menu' ? menuKit_ : phase === 'card' ? cardKit : null;
    if (kit) {
      if (pressed) kit.input('pad');
      // (nothing focused yet: the first press only puts it on the first choice)
      if (pressed && !(phase === 'menu' ? menu : card).contains(document.activeElement)) {
        if (phase === 'menu') kit.focusFirst(el.cont.hidden ? '[data-golf-one]' : '[data-golf-continue]');
        else kit.focusFirst('[data-golf-next]:not([hidden]), [data-golf-again]:not([hidden])');
        if (!edge(1) && !edge(9)) return;
      }
      if (edge(12)) kit.move('up');
      if (edge(13)) kit.move('down');
      if (edge(14)) kit.move('left');
      if (edge(15)) kit.move('right');
      if (edge(0)) kit.press();
      if (edge(1) || edge(9)) (phase === 'menu' ? closeMenu() : stop());
      return;
    }
    if (edge(1) || edge(9)) return stop();
    padTurn = -x + (down(14) ? 1 : 0) - (down(15) ? 1 : 0);
    if (edge(4) || edge(12)) stepClub(-1);
    if (edge(5) || edge(13)) stepClub(1);
    if (edge(0)) press();
    if (edge(11) || edge(3)) toggleView();
  }

  /* ----- Touch: the aim's arrows, the club's, the camera, and the pull-back swing ----- */
  const touchBtn = (sel: string, downFn: (b: HTMLElement) => void, upFn?: () => void) =>
    hud.querySelectorAll<HTMLElement>(sel).forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        input = e.pointerType === 'mouse' ? 'keys' : 'touch';
        downFn(b);
      });
      if (upFn) for (const ev of ['pointerup', 'pointercancel', 'pointerleave'] as const) b.addEventListener(ev, upFn);
    });
  touchBtn('[data-golf-aim]', (b) => (touchTurn = Number(b.dataset.golfAim)), () => (touchTurn = 0));
  touchBtn('[data-golf-clubstep]', (b) => stepClub(Number(b.dataset.golfClubstep) as 1 | -1));
  touchBtn('[data-golf-view]', toggleView);
  const pullFull = () => Math.max(PULL.min, Math.min(PULL.max, innerHeight * PULL.share));
  function endPull() {
    if (pull.id >= 0 && el.pull.hasPointerCapture(pull.id)) el.pull.releasePointerCapture(pull.id);
    pull.id = -1;
    pull.power = pull.accuracy = 0;
    el.pullLine.hidden = true;
  }
  el.pull.addEventListener('pointerdown', (e) => {
    if (!active || phase !== 'aim' || pull.id >= 0) return;
    e.preventDefault();
    input = e.pointerType === 'mouse' ? 'keys' : 'touch';
    el.pull.setPointerCapture(e.pointerId);
    const r = el.pull.getBoundingClientRect();
    Object.assign(pull, { id: e.pointerId, x0: e.clientX - r.left, y0: e.clientY - r.top, power: 0, accuracy: 0 });
    el.pullLine.style.left = `${pull.x0}px`;
    el.pullLine.style.top = `${pull.y0}px`;
    el.pullLine.style.height = '0px';
    el.pullLine.hidden = false;
  });
  el.pull.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pull.id) return;
    const r = el.pull.getBoundingClientRect();
    const [dx, dy] = [e.clientX - r.left - pull.x0, e.clientY - r.top - pull.y0];
    Object.assign(pull, pullShot(dx, dy, pullFull()));
    // (the line from where it started to the finger, past full drawn hot)
    el.pullLine.style.height = `${Math.hypot(dx, dy).toFixed(0)}px`;
    el.pullLine.style.transform = `rotate(${((Math.atan2(-dx, dy) * 180) / Math.PI).toFixed(1)}deg)`;
    el.pullLine.classList.toggle('is-over', pull.power > 1);
  });
  const letGo = (e: PointerEvent) => {
    if (e.pointerId !== pull.id) return;
    const r = el.pull.getBoundingClientRect();
    const dy = e.clientY - r.top - pull.y0;
    const shotNow = { power: pull.power, accuracy: pull.accuracy };
    endPull();
    // (too short a pull, or let go back up past where it started: nothing)
    if (e.type === 'pointercancel' || dy < PULL.least || shotNow.power < 0.05 || phase !== 'aim') return;
    power = shotNow.power;
    swing(shotNow.accuracy);
  };
  el.pull.addEventListener('pointerup', letGo);
  el.pull.addEventListener('pointercancel', letGo);

  return {
    get active() {
      return active;
    },
    get playing() {
      return active && phase !== 'menu';
    },
    at,
    start,
    frame: (dt) => frame(dt),
    key,
    pad,
    open,
    quit: () => (phase === 'menu' && active ? closeMenu() : stop()),
  };
}
