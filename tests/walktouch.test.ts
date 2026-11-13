// Walk mode's touch controls (walktouch.ts, docs/walk-plan.md Phase 3): the stick, the pedals' fingers, the held and
// toggled buttons and each button's wiring, against stand-ins for the page (elements that keep their listeners, so a
// test can put a finger down, move it and lift it) and a host that writes down what it was asked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wireTouch, type TouchEls, type TouchHost, type TouchState } from '../src/scripts/city3d/walktouch';

/** A stand-in element: its box on the screen, its listeners, what was set on it */
class El {
  listeners = new Map<string, ((e: Ev) => void)[]>();
  classes = new Set<string>();
  style: Record<string, string> = {};
  attrs: Record<string, string> = {};
  captured: number[] = [];
  value = '';
  checked = false;
  disabled = false;
  constructor(public name = '', public box = { left: 0, top: 0, width: 0, height: 0 }, public kids: Record<string, El> = {}) {}
  classList = {
    toggle: (c: string, on?: boolean) => void ((on ?? !this.classes.has(c)) ? this.classes.add(c) : this.classes.delete(c)),
    remove: (c: string) => void this.classes.delete(c),
  };
  addEventListener(type: string, fn: (e: Ev) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  getBoundingClientRect() {
    const { left, top, width, height } = this.box;
    return { left, top, width, height, right: left + width, bottom: top + height };
  }
  setPointerCapture(id: number) {
    this.captured.push(id);
  }
  setAttribute(k: string, v: string) {
    this.attrs[k] = v;
  }
  querySelector(sel: string) {
    return this.kids[sel] ?? null;
  }
  closest(sel: string) {
    return sel.split(',').some((s) => s.trim() === this.name) ? this : null;
  }
  /** An event of this type reaches the element */
  fire(type: string, o: Partial<Ev> = {}) {
    const e: Ev = { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch', detail: 1, cancelable: true, deltaY: 0, target: this, prevented: false, stopped: false, preventDefault: () => void (e.prevented = true), stopPropagation: () => void (e.stopped = true), ...o };
    for (const fn of this.listeners.get(type) ?? []) fn(e);
    return e;
  }
}
interface Ev {
  pointerId: number;
  clientX: number;
  clientY: number;
  pointerType: string;
  detail: number;
  cancelable: boolean;
  deltaY: number;
  target: unknown;
  prevented: boolean;
  stopped: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

/** The page: the stick (a 100 px ring centred on 100, 500), Gas and Brake side by side at the right, the buttons by their selectors */
function page() {
  const btn = (name: string) => new El(name);
  const byId: Record<string, El> = {};
  for (const s of ['[data-walk-jump]', '[data-drive-horn]', '[data-drive-view]', '[data-walk-view]', '[data-walk-fire]', '[data-walk-reload]', '[data-walk-swap]', '[data-walk-aim]']) byId[s] = btn(s);
  const kids: Record<string, El> = {};
  for (const s of ['[data-kart-drift]', '[data-kart-item]', '[data-fight-punch]', '[data-fight-kick]', '[data-fight-dodge]', '[data-fight-quit]']) kids[s] = btn(s);
  const knob = new El('knob');
  const els = {
    window: new El('window'),
    document: new El('document'),
    root: new El('root', undefined, kids),
    stick: new El('.walk-stick', { left: 50, top: 450, width: 100, height: 100 }),
    knob,
    runBtn: btn('run'),
    crouchBtn: btn('crouch'),
    gas: new El('.tc', { left: 300, top: 500, width: 60, height: 60 }),
    brake: new El('.tc', { left: 220, top: 500, width: 60, height: 60 }),
    rideView: btn('rideview'),
    block: btn('block'),
    fp: btn('fp'),
    sens: btn('sens'),
    invert: btn('invert'),
    prompt: btn('prompt'),
    canvas: new El('canvas'),
    byId,
    kids,
  };
  return els;
}
function setup(over: Partial<TouchHost> & { holds?: Record<string, 'hold' | 'toggle'> } = {}) {
  const p = page();
  const log: string[] = [];
  const say = (name: string) => (...args: unknown[]) => void log.push(args.length ? `${name}:${args.join(',')}` : name);
  const s: TouchState = {
    joy: { x: 0, y: 0, sx: 0, sy: 0, id: -1, ox: 0, oy: 0, float: false },
    pedals: { gas: false, brake: false },
    kartBtns: { drift: false, item: false },
    fightBtns: { punch: false, kick: false, dodge: false, block: false },
    settings: { sens: 1, invert: false },
  };
  const h: TouchHost = {
    d: { touched: () => {} },
    active: true,
    ride: null,
    boat: null,
    crouched: false,
    firstPerson: false,
    sprintLock: false,
    jumpHeld: false,
    aim: false,
    drive: { horn: say('horn') },
    combat: { trigger: (on) => void log.push(`trigger:${on}`), reload: say('reload') },
    hm: (job) => over.holds?.[job] ?? 'hold',
    tryJump: say('tryJump'),
    setSprintLock: (on) => {
      (h as { sprintLock: boolean }).sprintLock = on;
      log.push(`sprintLock:${on}`);
    },
    crouchInput: say('crouch'),
    crouchPress: say('crouchPress'),
    nextCam: say('nextCam'),
    setBlock: (on) => {
      s.fightBtns.block = on;
      log.push(`block:${on}`);
    },
    quitFight: say('quitFight'),
    setFirstPerson: say('firstPerson'),
    saveSettings: say('saveSettings'),
    // (the prompt's tap hands its button along: onTap() in ui.ts)
    act: () => void log.push('act'),
    look: (dx, dy) => void log.push(`look:${dx},${dy}`),
    stepSlot: say('stepSlot'),
    ...over,
  };
  const els = {
    window: p.window,
    document: p.document,
    Element: El,
    root: p.root,
    $: (sel: string) => p.byId[sel],
    stick: p.stick,
    knob: p.knob,
    runBtn: p.runBtn,
    crouchBtn: p.crouchBtn,
    pedalBtns: [p.gas, p.brake],
    rideViewBtns: [p.rideView],
    blockBtnEl: p.block,
    fpBtn: p.fp,
    sensInput: p.sens,
    invertInput: p.invert,
    prompt: p.prompt,
  } as unknown as TouchEls;
  const t = wireTouch(els, s, h);
  return { p, s, h, t, log };
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test('the stick: one finger, followed on the window, let go by its own lift only', () => {
  const { p, s } = setup();
  // A finger on the ring's right edge: full right; the stick is held and has the finger
  const down = p.stick.fire('pointerdown', { pointerId: 7, clientX: 150, clientY: 500 });
  assert.ok(down.prevented && down.stopped);
  assert.deepEqual([s.joy.id, s.joy.x, s.joy.y, s.joy.float], [7, 1, 0, false]);
  assert.ok(p.stick.classes.has('is-held') && p.stick.captured.includes(7));
  assert.ok(s.joy.sx > 0.99, 'shaped for the wheel too');
  // It follows the finger off the ring (clamped to the ring), and never another finger
  p.window.fire('pointermove', { pointerId: 7, clientX: 100, clientY: 900 });
  assert.ok(near(s.joy.x, 0) && near(s.joy.y, 1));
  p.window.fire('pointermove', { pointerId: 8, clientX: 0, clientY: 500 });
  assert.ok(near(s.joy.y, 1), "another finger's move isn't the stick's");
  assert.ok(p.knob.style.transform.startsWith('translate('));
  // A second finger on the stick doesn't take it; another finger's lift doesn't let it go
  const second = p.stick.fire('pointerdown', { pointerId: 9, clientX: 60, clientY: 500 });
  assert.ok(!second.stopped);
  assert.equal(s.joy.id, 7);
  p.window.fire('pointerup', { pointerId: 9 });
  assert.equal(s.joy.id, 7);
  // Its own lift (or the browser's cancel) centres it
  p.window.fire('pointercancel', { pointerId: 7 });
  assert.deepEqual([s.joy.id, s.joy.x, s.joy.y, s.joy.sx, s.joy.sy], [-1, 0, 0, 0, 0]);
  assert.ok(!p.stick.classes.has('is-held'));
  assert.equal(p.knob.style.transform, '');
});

test('the stick floats at the wheel: its ring moves under the thumb and reads from there', () => {
  const { p, s, t } = setup();
  const e = p.canvas.fire('pointerdown', { pointerId: 3, clientX: 240, clientY: 560 });
  assert.equal(t.startJoy(e as unknown as PointerEvent, p.canvas as unknown as HTMLElement, true), true);
  assert.deepEqual([s.joy.id, s.joy.float, s.joy.ox, s.joy.oy, s.joy.x, s.joy.y], [3, true, 240, 560, 0, 0]);
  assert.equal(p.stick.style.translate, '140px 60px', 'the ring moved from its middle (100, 500) to the thumb');
  assert.ok(p.canvas.captured.includes(3));
  assert.equal(t.startJoy(e as unknown as PointerEvent, p.canvas as unknown as HTMLElement, true), false, 'taken already');
  p.window.fire('pointermove', { pointerId: 3, clientX: 215, clientY: 560 });
  assert.ok(near(s.joy.x, -0.5));
  // endJoy() with no event lets go whoever has it (switching away)
  t.endJoy();
  assert.deepEqual([s.joy.id, s.joy.float, p.stick.style.translate], [-1, false, '']);
});

test('the pedals: each finger its own, rolled from one to the other without lifting, let go by its own lift', () => {
  const { p, s, t } = setup();
  p.gas.fire('pointerdown', { pointerId: 1, clientX: 330, clientY: 530 });
  assert.deepEqual(s.pedals, { gas: true, brake: false });
  assert.ok(p.gas.classes.has('is-held') && !p.brake.classes.has('is-held'));
  // A second finger on Brake: both held
  p.brake.fire('pointerdown', { pointerId: 2, clientX: 250, clientY: 530 });
  assert.deepEqual(s.pedals, { gas: true, brake: true });
  // The first rolls onto Brake: Gas lets go (no finger on it now), Brake still held
  p.window.fire('pointermove', { pointerId: 1, clientX: 255, clientY: 530 });
  assert.deepEqual(s.pedals, { gas: false, brake: true });
  // The second lifts: the first is still on Brake
  p.window.fire('pointerup', { pointerId: 2 });
  assert.deepEqual(s.pedals, { gas: false, brake: true });
  // A finger that's on neither pedal moving does nothing; the first lifts and both are up
  p.window.fire('pointermove', { pointerId: 5, clientX: 330, clientY: 530 });
  assert.deepEqual(s.pedals, { gas: false, brake: true });
  p.window.fire('pointerup', { pointerId: 1 });
  assert.deepEqual(s.pedals, { gas: false, brake: false });
  assert.ok(!p.brake.classes.has('is-held'));
  // A finger on the city by a pedal presses the nearer one (walk.ts's canvas calls pressPedal), and clearPedals() lets all go
  const e = p.canvas.fire('pointerdown', { pointerId: 4, clientX: 370, clientY: 495 });
  t.pressPedal(e as unknown as PointerEvent, p.canvas as unknown as HTMLElement);
  assert.deepEqual(s.pedals, { gas: true, brake: false });
  t.clearPedals();
  assert.deepEqual(s.pedals, { gas: false, brake: false });
  assert.deepEqual(t.rectOf(p.gas as unknown as Element), { x0: 300, y0: 500, x1: 360, y1: 560 });
  assert.equal(t.rectOf(p.runBtn as unknown as Element), null, 'a hidden button has no box');
});

test('held or toggled by the setting: Run, Block and Aim', () => {
  // Held: on while the finger is down
  const hold = setup();
  hold.p.runBtn.fire('pointerdown');
  assert.deepEqual(hold.log, ['sprintLock:true']);
  hold.p.runBtn.fire('pointerup');
  assert.deepEqual(hold.log, ['sprintLock:true', 'sprintLock:false']);
  // Toggled: a press turns it on, the lift leaves it, the next press turns it off
  const tog = setup({ holds: { sprint: 'toggle', block: 'toggle', aim: 'toggle' } });
  tog.p.runBtn.fire('pointerdown');
  tog.p.runBtn.fire('pointerup');
  assert.deepEqual(tog.log, ['sprintLock:true']);
  tog.p.runBtn.fire('pointerdown');
  assert.deepEqual(tog.log, ['sprintLock:true', 'sprintLock:false']);
  // Block the same; a keyboard's Enter on the focused button (a click with no pointer) toggles either way
  tog.p.block.fire('pointerdown');
  assert.ok(tog.s.fightBtns.block);
  hold.p.block.fire('click', { detail: 0 });
  assert.ok(hold.s.fightBtns.block);
  hold.p.block.fire('click', { detail: 1 });
  assert.ok(hold.s.fightBtns.block, "a pointer's own click already pressed it");
  // Aim: the sight, and the button says so
  const aimBtn = hold.p.byId['[data-walk-aim]'];
  aimBtn.fire('pointerdown');
  assert.ok(hold.h.aim);
  assert.equal(aimBtn.attrs['aria-pressed'], 'true');
  aimBtn.fire('lostpointercapture');
  assert.ok(!hold.h.aim);
  assert.equal(aimBtn.attrs['aria-pressed'], 'false');
  hold.t.setAim(true);
  assert.ok(hold.h.aim);
});

test('on foot: jump, crouch, fire dragged to aim, reload, swap, the view, the prompt', () => {
  const { p, h, log } = setup();
  const jump = p.byId['[data-walk-jump]'];
  jump.fire('pointerdown');
  assert.deepEqual(log, ['tryJump']);
  assert.ok(h.jumpHeld);
  jump.fire('pointerup');
  assert.ok(!h.jumpHeld);
  log.length = 0;
  // Crouch: down and up by the finger; Enter on it presses
  p.crouchBtn.fire('pointerdown', { pointerId: 2 });
  p.crouchBtn.fire('pointerup', { pointerId: 2 });
  assert.deepEqual(log, ['crouch:touch,true', 'crouch:touch,false']);
  p.crouchBtn.fire('click', { detail: 0 });
  assert.equal(log.at(-1), 'crouchPress');
  // (a crouch lets go of a locked sprint)
  const locked = setup({ crouched: true });
  locked.p.crouchBtn.fire('pointerdown');
  assert.deepEqual(locked.log, ['crouch:touch,true', 'sprintLock:false']);
  log.length = 0;
  // Fire: the trigger while the finger's down, dragging it looks; another finger's lift doesn't let it go
  const fire = p.byId['[data-walk-fire]'];
  fire.fire('pointerdown', { pointerId: 4, clientX: 10, clientY: 10 });
  fire.fire('pointermove', { pointerId: 4, clientX: 16, clientY: 7 });
  fire.fire('pointermove', { pointerId: 5, clientX: 99, clientY: 99 });
  fire.fire('pointerup', { pointerId: 5 });
  assert.deepEqual(log, ['trigger:true', 'look:6,-3']);
  fire.fire('pointerup', { pointerId: 4 });
  assert.equal(log.at(-1), 'trigger:false');
  log.length = 0;
  p.byId['[data-walk-reload]'].fire('pointerdown');
  p.byId['[data-walk-swap]'].fire('pointerdown');
  p.byId['[data-walk-view]'].fire('pointerdown');
  p.prompt.fire('pointerdown');
  assert.deepEqual(log, ['reload', 'stepSlot:1', 'nextCam', 'act']);
  // The first-person button and the look settings, which sit among them
  log.length = 0;
  p.fp.fire('click');
  p.sens.value = '1.5';
  p.sens.fire('input');
  p.invert.checked = true;
  p.invert.fire('change');
  assert.deepEqual(log, ['firstPerson:true', 'saveSettings', 'saveSettings']);
});

test('at the wheel, in a kart, in the ring, on a ride', () => {
  // The horn is the boat's when boating, the car's otherwise; View steps the camera
  const car = setup();
  car.p.byId['[data-drive-horn]'].fire('pointerdown');
  car.p.byId['[data-drive-view]'].fire('pointerdown');
  assert.deepEqual(car.log, ['horn', 'nextCam']);
  const horns: string[] = [];
  const boat = setup({ boat: { active: true, horn: () => void horns.push('boat') } });
  boat.p.byId['[data-drive-horn]'].fire('pointerdown');
  assert.deepEqual([horns, boat.log], [['boat'], []]);
  // A kart: Drift and Item while the finger's down
  const { p, s, log } = setup();
  p.kids['[data-kart-drift]'].fire('pointerdown');
  p.kids['[data-kart-item]'].fire('pointerdown');
  assert.deepEqual(s.kartBtns, { drift: true, item: true });
  p.kids['[data-kart-drift]'].fire('pointerup');
  p.kids['[data-kart-item]'].fire('pointercancel');
  assert.deepEqual(s.kartBtns, { drift: false, item: false });
  // The ring: Punch, Kick, Dodge tapped; Quit
  for (const k of ['punch', 'kick', 'dodge'] as const) p.kids[`[data-fight-${k}]`].fire('pointerdown');
  assert.deepEqual([s.fightBtns.punch, s.fightBtns.kick, s.fightBtns.dodge], [true, true, true]);
  p.kids['[data-fight-quit]'].fire('click');
  assert.deepEqual(log, ['quitFight']);
  // A ride's View button steps its camera only on a ride
  log.length = 0;
  p.rideView.fire('click');
  assert.deepEqual(log, []);
  const ride = setup({ ride: {} });
  ride.p.rideView.fire('click');
  assert.deepEqual(ride.log, ['nextCam']);
});

test("the phone's own gestures never take a finger off the controls, while walking", () => {
  const { p } = setup();
  // A touch on a control, the stick or the city keeps its default from happening; one anywhere else doesn't
  assert.ok(p.root.fire('touchstart', { target: p.gas }).prevented);
  assert.ok(p.root.fire('touchmove', { target: p.stick }).prevented);
  assert.ok(p.root.fire('touchstart', { target: p.canvas }).prevented);
  assert.ok(!p.root.fire('touchstart', { target: p.prompt }).prevented);
  assert.ok(!p.root.fire('touchstart', { target: p.gas, cancelable: false }).prevented);
  assert.ok(p.root.fire('contextmenu', { target: p.gas }).prevented);
  assert.ok(p.document.fire('gesturestart').prevented);
  // Not walking: the page has its gestures back
  const off = setup({ active: false });
  assert.ok(!off.p.root.fire('touchstart', { target: off.p.gas }).prevented);
  assert.ok(!off.p.root.fire('contextmenu', { target: off.p.gas }).prevented);
  assert.ok(!off.p.document.fire('gesturechange').prevented);
});
