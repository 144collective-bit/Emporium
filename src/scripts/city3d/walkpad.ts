/*
 * Walk mode's gamepad (docs/walk-plan.md Phase 1; DOM-free, tested in tests/walkpad.test.ts): one poll a frame
 * turns the pad's sticks and buttons into what walk mode does with them, by what's on screen: a menu open (the hub,
 * the inventory, the gun store, the garage, the hangar, the trainer, the clubhouse) takes the d-pad and the face
 * buttons; a ride, the ring, the wheel of a boat, an aircraft, a kart or a car each take their own; on foot the
 * rest. It was `pollPad()` inside walk.ts's `createWalk()`, moved here word for word: what it reads and calls of
 * walk mode comes through `PadHost` (walk.ts builds it once), what it fills is `PadState` (walk mode's own objects,
 * shared). The buttons are the standard mapping's numbers (0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 View,
 * 9 Start, 10 L3, 11 R3, 12-15 the d-pad up, down, left, right); keymap.ts lists what each does in each mode: when
 * one changes here, change its line there.
 */
import type { HoldInput, HoldJob, HoldMode } from './comfort';

/** A gamepad as the poll reads it (the browser's `Gamepad`, or a test's) */
export interface PadLike {
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}

/** What the poll fills, read by walk mode's frames: the left stick and the run, and each vehicle's and the ring's own */
export interface PadState {
  pad: { x: number; y: number; run: boolean; prev: boolean[] };
  drive: { steer: number; throttle: number; handbrake: boolean };
  kart: { steer: number; throttle: number; drift: boolean; item: boolean };
  fly: { turn: number; climb: number; throttle: number };
  fight: { x: number; y: number; block: boolean };
}

type Edge = (i: number) => boolean;
/** A menu the d-pad steps through */
interface Stepper {
  open: boolean;
  step(dir: 1 | -1): void;
  close(): void;
}

/** Walk mode as the gamepad sees it: what's open and active now (read each poll), and what the buttons do */
export interface PadHost {
  /** The hub, the ride's skip, the world map and "something was pressed" (walk.ts's own deps) */
  d: {
    hub?: { open: boolean; pad(edge: Edge, any: boolean): void; show(): void } | null;
    touched(): void;
    skipRide?(): void;
    worldMap?(): void;
    mapOpen?(): boolean;
  };
  // What may change between polls
  readonly hotbar: { open: boolean; pad(edge: Edge): void } | null;
  readonly karts: { active: boolean };
  readonly kartUI: Stepper & { stepTab(dir: 1 | -1): void; take(): void };
  readonly ride: unknown;
  readonly fight: { snack(): void } | null;
  readonly boat: { active: boolean; horn(): void } | null;
  readonly near: unknown;
  readonly sprintLock: boolean;
  // What the pad sets as well as reads
  jumpHeld: boolean;
  aim: boolean;
  padLean: number;
  /** LB with empty hands: the fists' guard held (and, on toggle, whether it's on) */
  padGuard: boolean;
  padGuardOn: boolean;
  // The menus
  shop: { open: boolean; input(k: 'pad'): void; move(dir: 'up' | 'down' | 'left' | 'right'): void; tab(dir: 1 | -1): void; press(): void; close(): void };
  garageUI: Stepper & { stepTab(dir: 1 | -1): void; stepPaint(dir: 1 | -1): void; keep(): void };
  hangarUI: Stepper & { stepPaint(dir: 1 | -1): void; keep(): void };
  fightUI: Stepper & { stepTab(dir: 1 | -1): void; take(): void };
  // The vehicles, the guns, the ring
  fly: { active: boolean };
  drive: { active: boolean; horn(): void };
  combat: { trigger(on: boolean): void; reload(): void; toggleHolster(): void };
  fightBtns: { punch: boolean; kick: boolean; dodge: boolean };
  moments: { active: boolean };
  fighting(): boolean;
  quitFight(): void;
  abandonKart(): void;
  // What walk mode does
  look(dx: number, dy: number, k: number): void;
  setInput(k: 'pad'): void;
  setAim(on: boolean): void;
  still(free?: boolean): void;
  askCard(): void;
  nextCam(): void;
  hm(job: HoldJob, input: HoldInput): HoldMode;
  act(): void;
  tryJump(): void;
  crouchInput(input: HoldInput, down: boolean): void;
  fistsReady(): boolean;
  setSprintLock(on: boolean): void;
  toggleInv(): void;
  stepSlot(dir: 1 | -1): void;
}

/** One poll: `gp` is the connected pad (null: none), `dt` the frame's seconds (the right stick looks by it) */
export function pollPad(gp: PadLike | null | undefined, dt: number, s: PadState, h: PadHost) {
  const { pad, drive: padDrive, kart: padKart, fly: padFly, fight: padFight } = s;
  const { d, shop, garageUI, hangarUI, fightUI, fly, drive, combat, fightBtns, moments } = h;
  const { fighting, quitFight, abandonKart, look, setInput, setAim, still, askCard, nextCam, hm, act, tryJump, crouchInput, fistsReady, setSprintLock, toggleInv, stepSlot } = h;
  if (!gp) {
    pad.x = pad.y = 0;
    pad.run = false;
    padDrive.steer = padDrive.throttle = 0;
    padDrive.handbrake = false;
    padKart.steer = padKart.throttle = 0;
    padKart.drift = padKart.item = false;
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
  if (pad.x || pad.y || rx || ry || b.some(Boolean)) setInput('pad');
  // The hub: the D-pad moves round it, LB / RB the tabs, A presses, B or Start closes
  if (d.hub?.open) {
    d.hub.pad(edge, b.some((x, i) => x && !pad.prev[i]));
    pad.x = pad.y = 0;
    pad.prev = b;
    return;
  }
  // The inventory: the D-pad moves round it, A does the selected thing, B or View closes
  if (h.hotbar?.open) {
    h.hotbar.pad(edge);
    pad.x = pad.y = 0;
    pad.prev = b;
    return;
  }
  // The store: D-pad picks, A takes, B (or Y again) closes
  // (the menus' kit, menukit.ts: the d-pad moves round its buttons, A presses, LB / RB the tabs)
  if (shop.open) {
    if (b.some((x, i) => x && !pad.prev[i])) shop.input('pad');
    if (edge(12)) shop.move('up');
    if (edge(13)) shop.move('down');
    if (edge(14)) shop.move('left');
    if (edge(15)) shop.move('right');
    if (edge(4)) shop.tab(-1);
    if (edge(5)) shop.tab(1);
    if (edge(0)) shop.press();
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
    if (edge(4)) fightUI.stepTab(-1);
    if (edge(5)) fightUI.stepTab(1);
    if (edge(12) || edge(14)) fightUI.step(-1);
    if (edge(13) || edge(15)) fightUI.step(1);
    if (edge(0)) fightUI.take();
    if (edge(1)) fightUI.close();
    padFight.x = padFight.y = 0;
    return;
  }
  // Start opens the hub (the pause screen), but in a fight or a kart race, where it quits (keymap.ts `quit`)
  if (edge(9) && d.hub && !fighting() && !h.karts.active) {
    still(false);
    d.hub.show();
    pad.prev = b;
    return;
  }
  // The d-pad's down: the control card (the kart hut's menu has it for its list)
  if (edge(13) && !h.kartUI.open) askCard();
  // On a ride: the right stick looks round, pressed it steps the camera, B skips the ride (the ride has the rest)
  if (h.ride) {
    if (edge(11)) nextCam();
    if (edge(1)) d.skipRide?.();
    if (b.some(Boolean)) d.touched();
    pad.prev = b;
    return;
  }
  // Fighting: left stick moves, X punches, Y kicks, LB (held) blocks, A dodges, Start quits, the right stick pressed the camera
  if (fighting()) {
    if (edge(11)) nextCam();
    padFight.x = pad.x;
    padFight.y = pad.y;
    if (hm('block', 'pad') === 'toggle') {
      if (edge(4)) padFight.block = !padFight.block;
    } else padFight.block = !!b[4];
    if (edge(2)) fightBtns.punch = true;
    if (edge(3)) fightBtns.kick = true;
    if (edge(0)) fightBtns.dodge = true;
    // (the d-pad's up: a snack, in a spar)
    if (edge(12)) h.fight?.snack();
    if (edge(9)) quitFight();
    if (pad.x || pad.y || b.some(Boolean)) d.touched();
    pad.prev = b;
    return;
  }
  // At the wheel (the boat, your aircraft, your car, bike or kart): the right stick pressed steps the camera, View opens
  // the world map; while it's open the vehicle coasts and only View (closing it) is heard
  if (h.boat?.active || fly.active || drive.active) {
    if (edge(11)) nextCam();
    if (edge(8)) d.worldMap?.();
    if (d.mapOpen?.()) {
      padDrive.steer = padDrive.throttle = 0;
      padDrive.handbrake = false;
      padFly.turn = padFly.climb = padFly.throttle = 0;
      pad.prev = b;
      return;
    }
  }
  // Boating: left stick steers, RT ahead, LT astern, Y gets out, the left stick pressed is the horn
  if (h.boat?.active) {
    padDrive.steer = pad.x;
    padDrive.throttle = (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0);
    if (edge(3)) act();
    if (edge(10)) h.boat.horn();
    if (pad.x || padDrive.throttle || b.some(Boolean)) d.touched();
    pad.prev = b;
    return;
  }
  // Flying: left stick turns and climbs (up climbs), RT faster, LT slower, Y gets out
  if (fly.active) {
    padFly.turn = pad.x;
    padFly.climb = -pad.y;
    padFly.throttle = (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0);
    if (edge(3)) act();
    if (pad.x || pad.y || padFly.throttle || b.some(Boolean)) d.touched();
    pad.prev = b;
    return;
  }
  // The kart hut's menu: D-pad moves, A takes, B (or Y again) closes
  if (h.kartUI.open) {
    if (edge(4)) h.kartUI.stepTab(-1);
    if (edge(5)) h.kartUI.stepTab(1);
    if (edge(12) || edge(14)) h.kartUI.step(-1);
    if (edge(13) || edge(15)) h.kartUI.step(1);
    if (edge(0)) h.kartUI.take();
    if (edge(1) || edge(3)) h.kartUI.close();
    pad.x = pad.y = 0;
    pad.prev = b;
    return;
  }
  // Karting: left stick steers, RT gas, LT brake, A hops into a drift, Start quits (as in the ring), the right stick pressed the camera
  if (h.karts.active) {
    if (edge(11)) nextCam();
    padKart.steer = pad.x;
    padKart.throttle = (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0);
    padKart.drift = !!b[0];
    padKart.item = !!b[2];
    if (edge(9)) abandonKart();
    if (pad.x || padKart.throttle || b.some(Boolean)) d.touched();
    pad.prev = b;
    return;
  }
  // Driving: left stick steers, RT gas, LT brake / reverse, A handbrake, Y gets out, the left stick pressed is the horn
  if (drive.active) {
    padDrive.steer = pad.x;
    padDrive.throttle = (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0);
    padDrive.handbrake = !!b[0];
    if (edge(3)) act();
    if (edge(10)) drive.horn();
    if (pad.x || padDrive.throttle || b.some(Boolean)) d.touched();
    pad.prev = b;
    return;
  }
  if (edge(0)) tryJump();
  if (b[1] !== !!pad.prev[1]) crouchInput('pad', !!b[1]);
  h.jumpHeld = h.jumpHeld || b[0] || false;
  if (!b[0] && pad.prev[0]) h.jumpHeld = false;
  // (aiming, LB and RB lean out instead: peeking)
  // (aim on toggle: LT puts the sight up and the next takes it down; peeking then while it's up)
  const aimToggle = hm('aim', 'pad') === 'toggle';
  if (aimToggle && edge(6)) setAim(!h.aim);
  const aiming = aimToggle ? h.aim : !!b[6];
  h.padLean = aiming ? (b[5] ? 1 : 0) - (b[4] ? 1 : 0) : 0;
  // (the run is the left stick pressed, a gun out or not (keymap.ts); empty hands: LB held lifts the guard, and X,
  // Y and A punch, kick and dodge with it up)
  const fb = fistsReady();
  if (hm('guard', 'pad') === 'toggle') {
    if (edge(4)) h.padGuardOn = !h.padGuardOn;
    if (!fb) h.padGuardOn = false;
    h.padGuard = fb && h.padGuardOn;
  } else h.padGuard = fb && !!b[4];
  // (sprint on toggle: L3 locks it, again lets it go)
  if (hm('sprint', 'pad') === 'toggle') {
    if (edge(10)) setSprintLock(!h.sprintLock);
    pad.run = false;
  } else pad.run = !!b[10];
  if (!aimToggle) {
    h.aim = h.aim || !!b[6];
    if (!b[6] && pad.prev[6]) setAim(false);
  }
  // (Y does what the prompt says; with empty hands and nothing to do, it kicks: with the guard up, brawl-sim.ts)
  if (edge(3)) {
    if (fistsReady() && !h.near) fightBtns.kick = true;
    else act();
  }
  // View opens the inventory; the right stick pressed swaps first and third person
  if (edge(8) && !moments.active) toggleInv();
  if (edge(11)) nextCam();
  if (b[7] !== !!pad.prev[7]) combat.trigger(!!b[7]);
  // (X reloads; with empty hands it punches: with the guard up, brawl-sim.ts)
  if (edge(2)) {
    if (fistsReady()) fightBtns.punch = true;
    else combat.reload();
  }
  if (edge(12)) combat.toggleHolster();
  // RB or D-pad right: the hotbar's next slot of the fists and the guns; D-pad left: the one before
  if ((edge(5) && !aiming) || edge(15)) stepSlot(1);
  if (edge(14)) stepSlot(-1);
  if (pad.x || pad.y || b.some(Boolean)) d.touched();
  pad.prev = b;
}
