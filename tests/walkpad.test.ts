// Walk mode's gamepad (walkpad.ts, docs/walk-plan.md Phase 1): what each button does by what's on screen, against a
// made-up pad and a host that writes down what it was asked. keymap.ts says the same things in words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pollPad, type PadHost, type PadLike, type PadState } from '../src/scripts/city3d/walkpad';

const A = 0, B = 1, X = 2, Y = 3, LB = 4, RB = 5, LT = 6, RT = 7, VIEW = 8, START = 9, L3 = 10, R3 = 11, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;

/** A pad with these sticks and buttons down (a trigger's value with it) */
function gp(o: { lx?: number; ly?: number; rx?: number; ry?: number; down?: number[]; rt?: number; lt?: number } = {}): PadLike {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: !!o.down?.includes(i), value: o.down?.includes(i) ? 1 : 0 }));
  if (o.rt) buttons[RT] = { pressed: o.rt > 0.5, value: o.rt };
  if (o.lt) buttons[LT] = { pressed: o.lt > 0.5, value: o.lt };
  return { axes: [o.lx ?? 0, o.ly ?? 0, o.rx ?? 0, o.ry ?? 0], buttons };
}
const state = (): PadState => ({
  pad: { x: 0, y: 0, run: false, prev: [] },
  drive: { steer: 0, throttle: 0, handbrake: false },
  kart: { steer: 0, throttle: 0, drift: false, item: false },
  fly: { turn: 0, climb: 0, throttle: 0 },
  fight: { x: 0, y: 0, block: false },
});
/** A host on foot with nothing open, writing down every call as "name" or "name:args" */
function host(over: Partial<PadHost> & { holds?: Record<string, 'hold' | 'toggle'> } = {}) {
  const log: string[] = [];
  const say = (name: string) => (...args: unknown[]) => void log.push(args.length ? `${name}:${args.join(',')}` : name);
  const menu = (name: string) => ({ open: false, step: say(`${name}.step`), close: say(`${name}.close`), stepTab: say(`${name}.stepTab`), stepPaint: say(`${name}.stepPaint`), keep: say(`${name}.keep`), take: say(`${name}.take`) });
  const h: PadHost = {
    d: { hub: { open: false, pad: () => void log.push('hub.pad'), show: say('hub.show') }, touched: () => {}, skipRide: say('skipRide'), worldMap: say('worldMap'), mapOpen: () => false },
    hotbar: null,
    karts: { active: false },
    kartUI: menu('kartUI'),
    ride: null,
    fight: null,
    boat: null,
    near: null,
    sprintLock: false,
    jumpHeld: false,
    aim: false,
    padLean: 0,
    padGuard: false,
    padGuardOn: false,
    shop: { open: false, input: () => {}, move: say('shop.move'), tab: say('shop.tab'), press: say('shop.press'), close: say('shop.close') },
    garageUI: menu('garage'),
    hangarUI: menu('hangar'),
    fightUI: menu('fightUI'),
    fly: { active: false },
    drive: { active: false, horn: say('horn') },
    combat: { trigger: say('trigger'), reload: say('reload'), toggleHolster: say('holster') },
    fightBtns: { punch: false, kick: false, dodge: false },
    moments: { active: false },
    fighting: () => false,
    quitFight: say('quitFight'),
    abandonKart: say('abandonKart'),
    look: (dx, dy) => void log.push(`look:${Math.sign(dx)},${Math.sign(dy)}`),
    setInput: () => {},
    setAim: (on) => {
      h.aim = on;
      log.push(`setAim:${on}`);
    },
    still: say('still'),
    askCard: say('askCard'),
    nextCam: say('nextCam'),
    hm: (job) => over.holds?.[job] ?? 'hold',
    act: say('act'),
    tryJump: say('tryJump'),
    crouchInput: say('crouch'),
    fistsReady: () => false,
    setSprintLock: say('sprintLock'),
    toggleInv: say('toggleInv'),
    stepSlot: say('stepSlot'),
    ...over,
  };
  return { h, log };
}

test('no pad: everything it held is let go', () => {
  const s = state();
  const { h, log } = host();
  pollPad(gp({ lx: 1, down: [LT, RT, L3] }), 0.016, s, h);
  assert.equal(s.pad.x, 1);
  assert.ok(s.pad.run && h.aim);
  pollPad(null, 0.016, s, h);
  assert.deepEqual([s.pad.x, s.pad.y, s.pad.run], [0, 0, false]);
  assert.deepEqual(s.pad.prev, []);
  assert.deepEqual(log.slice(-2), ['setAim:false', 'trigger:false']);
});

test('on foot: the sticks, and one job a button', () => {
  const s = state();
  const { h, log } = host();
  // The left stick moves (a dead middle, then all the way), the right looks
  pollPad(gp({ lx: 0.1, ly: -1, rx: 1 }), 0.016, s, h);
  assert.deepEqual([s.pad.x, s.pad.y], [0, -1]);
  assert.deepEqual(log, ['look:1,0']);
  log.length = 0;
  // A jumps (once a press), B crouches, X reloads, Y does what the prompt says, RB and the d-pad step the hotbar,
  // View opens the inventory, R3 the camera, RT the trigger, the d-pad's up holsters, its down asks for the card
  pollPad(gp({ down: [A, B, X, Y, RB, VIEW, R3, RT, UP, DOWN] }), 0.016, s, h);
  assert.deepEqual(log, ['askCard', 'tryJump', 'crouch:pad,true', 'act', 'toggleInv', 'nextCam', 'trigger:true', 'reload', 'holster', 'stepSlot:1']);
  assert.ok(h.jumpHeld);
  log.length = 0;
  pollPad(gp({ down: [A, RT] }), 0.016, s, h);
  assert.deepEqual(log, ['crouch:pad,false']);
  pollPad(gp(), 0.016, s, h);
  assert.ok(!h.jumpHeld);
  assert.equal(log.at(-1), 'trigger:false');
  // LT aims while it's held, and LB / RB lean out then instead of stepping the hotbar; L3 runs while it's held
  log.length = 0;
  pollPad(gp({ down: [LT, RB, L3] }), 0.016, s, h);
  assert.ok(h.aim && s.pad.run);
  assert.equal(h.padLean, 1);
  assert.deepEqual(log, []);
  pollPad(gp({ down: [LT, LB] }), 0.016, s, h);
  assert.equal(h.padLean, -1);
  pollPad(gp(), 0.016, s, h);
  assert.deepEqual([h.aim, h.padLean, s.pad.run], [false, 0, false]);
  // The d-pad's left steps the hotbar back
  log.length = 0;
  pollPad(gp({ down: [LEFT] }), 0.016, s, h);
  assert.deepEqual(log, ['stepSlot:-1']);
});

test('empty hands: LB holds the guard, X punches, Y kicks with nothing to do; toggles where the settings ask', () => {
  const s = state();
  const { h, log } = host({ fistsReady: () => true });
  pollPad(gp({ down: [X, Y, LB] }), 0.016, s, h);
  assert.ok(h.fightBtns.punch && h.fightBtns.kick && h.padGuard);
  // (let go of LB, the guard drops)
  pollPad(gp(), 0.016, s, h);
  assert.ok(!h.padGuard);
  assert.deepEqual(log, []);
  // With a prompt showing, Y does it
  pollPad(gp(), 0.016, s, h);
  (h as { near: unknown }).near = { id: 'car' };
  pollPad(gp({ down: [Y] }), 0.016, s, h);
  assert.deepEqual(log, ['act']);
  // Sprint, aim and the guard on toggle: a press turns each on, the next off
  const t = host({ fistsReady: () => true, holds: { sprint: 'toggle', aim: 'toggle', guard: 'toggle' } });
  const s2 = state();
  pollPad(gp({ down: [L3, LT, LB] }), 0.016, s2, t.h);
  assert.deepEqual(t.log, ['setAim:true', 'sprintLock:true']);
  assert.ok(t.h.padGuardOn && t.h.padGuard && !s2.pad.run);
  pollPad(gp(), 0.016, s2, t.h);
  assert.ok(t.h.aim && t.h.padGuard);
  pollPad(gp({ down: [LT, LB] }), 0.016, s2, t.h);
  assert.ok(!t.h.aim && !t.h.padGuard);
});

test('a menu open has the pad: the hub, the inventory, the store, the garage', () => {
  const s = state();
  const { h, log } = host();
  h.d.hub!.open = true;
  pollPad(gp({ lx: 1, down: [A] }), 0.016, s, h);
  assert.deepEqual(log, ['hub.pad']);
  assert.equal(s.pad.x, 0);
  h.d.hub!.open = false;
  log.length = 0;
  pollPad(gp(), 0.016, s, h);
  h.shop.open = true;
  pollPad(gp({ down: [UP, RIGHT, LB, A] }), 0.016, s, h);
  assert.deepEqual(log, ['shop.move:up', 'shop.move:right', 'shop.tab:-1', 'shop.press']);
  pollPad(gp(), 0.016, s, h);
  pollPad(gp({ down: [B] }), 0.016, s, h);
  assert.equal(log.at(-1), 'shop.close');
  h.shop.open = false;
  h.garageUI.open = true;
  log.length = 0;
  pollPad(gp(), 0.016, s, h);
  pollPad(gp({ down: [LEFT, DOWN, RB, A] }), 0.016, s, h);
  assert.deepEqual(log, ['garage.stepTab:1', 'garage.step:-1', 'garage.stepPaint:1', 'garage.keep']);
  // Start opens the hub from the street
  h.garageUI.open = false;
  log.length = 0;
  pollPad(gp(), 0.016, s, h);
  pollPad(gp({ down: [START] }), 0.016, s, h);
  assert.deepEqual(log, ['still:false', 'hub.show']);
});

test('at the wheel: the car, the kart, the aircraft and the boat each read their own', () => {
  const s = state();
  const { h, log } = host({ drive: { active: true, horn: () => void log2.push('horn') } });
  const log2: string[] = [];
  pollPad(gp({ lx: -1, rt: 1, lt: 0.25, down: [A, Y, L3, R3, VIEW] }), 0.016, s, h);
  assert.deepEqual([s.drive.steer, s.drive.throttle, s.drive.handbrake], [-1, 0.75, true]);
  assert.deepEqual(log, ['nextCam', 'worldMap', 'act']);
  assert.deepEqual(log2, ['horn']);
  // The world map open: the car coasts
  const m = host({ drive: { active: true, horn: () => {} } });
  m.h.d.mapOpen = () => true;
  const s1 = state();
  s1.drive.throttle = 1;
  pollPad(gp({ lx: 1, rt: 1 }), 0.016, s1, m.h);
  assert.deepEqual([s1.drive.steer, s1.drive.throttle], [0, 0]);
  // A kart race: A drifts, X uses the item, Start quits
  const k = host({ karts: { active: true } });
  const s2 = state();
  pollPad(gp({ lx: 1, rt: 1, down: [A, X, START] }), 0.016, s2, k.h);
  assert.deepEqual([s2.kart.steer, s2.kart.throttle, s2.kart.drift, s2.kart.item], [1, 1, true, true]);
  assert.deepEqual(k.log, ['abandonKart']);
  // Flying: the stick turns and climbs (up climbs), the triggers the throttle
  const f = host({ fly: { active: true } });
  const s3 = state();
  pollPad(gp({ lx: 1, ly: -1, rt: 1 }), 0.016, s3, f.h);
  assert.deepEqual([s3.fly.turn, s3.fly.climb, s3.fly.throttle], [1, 1, 1]);
  // Boating: the car's stick and triggers, L3 its horn
  const horns: string[] = [];
  const b = host({ boat: { active: true, horn: () => void horns.push('boat') } });
  const s4 = state();
  pollPad(gp({ lx: 1, lt: 1, down: [L3] }), 0.016, s4, b.h);
  assert.deepEqual([s4.drive.steer, s4.drive.throttle], [1, -1]);
  assert.deepEqual(horns, ['boat']);
});

test('the ring and a ride', () => {
  const s = state();
  const snacks: string[] = [];
  const { h, log } = host({ fighting: () => true, fight: { snack: () => void snacks.push('snack') } });
  pollPad(gp({ lx: 1, ly: 1, down: [X, Y, A, LB, UP, R3] }), 0.016, s, h);
  assert.deepEqual([s.fight.x, s.fight.y, s.fight.block], [1, 1, true]);
  assert.ok(h.fightBtns.punch && h.fightBtns.kick && h.fightBtns.dodge);
  assert.deepEqual(snacks, ['snack']);
  assert.deepEqual(log, ['nextCam']);
  pollPad(gp(), 0.016, s, h);
  pollPad(gp({ down: [START] }), 0.016, s, h);
  assert.equal(log.at(-1), 'quitFight');
  // A ride: B skips it, R3 steps its camera, nothing else is heard
  const r = host({ ride: {} });
  const s2 = state();
  pollPad(gp({ down: [B, R3, A, Y] }), 0.016, s2, r.h);
  assert.deepEqual(r.log, ['nextCam', 'skipRide']);
});
