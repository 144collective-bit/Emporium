/*
 * Walk mode's touch controls (docs/walk-plan.md Phase 3; tested in tests/walktouch.test.ts): the stick (one finger,
 * followed wherever it goes; floating under the thumb at the wheel), the pedals' fingers (touchdrive.ts has their
 * rules), the buttons held or toggled by the comfort settings (`holdButton()`), and the wiring of every touch
 * button: jump, run, crouch, the horn, the views, a kart's drift and item, the ring's, fire (dragged to aim), reload,
 * swap and aim; with them the look settings' inputs and the prompt's tap, which sat among them.
 *
 * It was three stretches of walk.ts's `createWalk()`, moved here word for word into `wireTouch()`, which walk.ts
 * calls once: the page's own objects come in `TouchEls` (the window, the document and `Element` too, under their
 * own names, so the text is as it was and a test can stand in for the page), walk mode's shared objects in
 * `TouchState`, and what it reads and calls of walk mode through `TouchHost` (what changes is read through `h.`).
 * It answers with what the rest of walk mode calls: the stick's and the pedals' starts and ends, and `setAim()`.
 * keymap.ts lists what each touch button does in each mode: when one changes here, change its line there.
 */
import { pedalAt, stickRead, type Pedal, type Rect } from './touchdrive';
import { press, type HoldInput, type HoldJob, type HoldMode } from './comfort';
import { onTap } from './ui';

/** The page as the touch controls use it (walk.ts passes the real ones; a test, stand-ins) */
export interface TouchEls {
  window: Pick<Window, 'addEventListener'>;
  document: Pick<Document, 'addEventListener'>;
  Element: typeof Element;
  root: HTMLElement;
  $: <T extends HTMLElement>(s: string) => T;
  stick: HTMLElement;
  knob: HTMLElement;
  runBtn: HTMLElement | null;
  crouchBtn: HTMLElement;
  pedalBtns: HTMLElement[];
  rideViewBtns: HTMLElement[];
  blockBtnEl: HTMLElement | null;
  fpBtn: HTMLElement;
  sensInput: HTMLInputElement;
  invertInput: HTMLInputElement;
  prompt: HTMLElement;
}

/** Walk mode's own objects the touch controls fill (shared: its frames read them) */
export interface TouchState {
  joy: { x: number; y: number; sx: number; sy: number; id: number; ox: number; oy: number; float: boolean };
  pedals: { gas: boolean; brake: boolean };
  kartBtns: { drift: boolean; item: boolean };
  /** Punch, Kick and Dodge tapped; Block held in the ring; Guard (the same button on the street) held or toggled */
  fightBtns: { punch: boolean; kick: boolean; dodge: boolean; block: boolean; guard: boolean };
  settings: { sens: number; invert: boolean };
}

/** Walk mode as the touch controls see it: what's so now (read each touch), and what the buttons do */
export interface TouchHost {
  d: { touched(): void };
  // What may change between touches
  readonly active: boolean;
  readonly ride: unknown;
  readonly boat: { active: boolean; horn(): void } | null;
  readonly crouched: boolean;
  readonly firstPerson: boolean;
  readonly sprintLock: boolean;
  /** In the ring (its Block button), not on the street (where the same button is the Guard) */
  readonly ring: boolean;
  // What the buttons set as well as read
  jumpHeld: boolean;
  aim: boolean;
  drive: { horn(): void };
  combat: { trigger(on: boolean, touch?: boolean): void; reload(): void };
  // What walk mode does
  hm(job: HoldJob, input: HoldInput): HoldMode;
  tryJump(): void;
  setSprintLock(on: boolean): void;
  crouchInput(input: HoldInput, down: boolean): void;
  crouchPress(): void;
  nextCam(): void;
  setBlock(on: boolean): void;
  setGuard(on: boolean): void;
  quitFight(): void;
  setFirstPerson(on: boolean): void;
  saveSettings(): void;
  act(): void;
  look(dx: number, dy: number, k: number): void;
  stepSlot(dir: 1 | -1): void;
}

/** Wire the touch controls up, once */
export function wireTouch(el: TouchEls, s: TouchState, h: TouchHost) {
  const { window, document, Element, root, $, stick, knob, runBtn, crouchBtn, pedalBtns, rideViewBtns, blockBtnEl, fpBtn, sensInput, invertInput, prompt } = el;
  const { joy, pedals, kartBtns, fightBtns, settings } = s;
  const { d, drive, combat, hm, tryJump, setSprintLock, crouchInput, crouchPress, nextCam, setBlock, setGuard, quitFight, setFirstPerson, saveSettings, act, look, stepSlot } = h;
  /** The fingers on the pedals (touchdrive.ts): each pointer and the pedal it presses */
  const pedalFingers = new Map<number, Pedal>();
  const rectOf = (el: Element): Rect | null => {
    const r = el.getBoundingClientRect();
    return r.width ? { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom } : null;
  };
  function syncPedals() {
    const on = [...pedalFingers.values()];
    pedals.gas = on.includes('gas');
    pedals.brake = on.includes('brake');
    pedalBtns[0].classList.toggle('is-held', pedals.gas);
    pedalBtns[1].classList.toggle('is-held', pedals.brake);
  }
  function clearPedals() {
    pedalFingers.clear();
    syncPedals();
  }
  function pressPedal(e: PointerEvent, el: HTMLElement) {
    capture(el, e.pointerId);
    pedalFingers.set(e.pointerId, pedalAt(e.clientX, e.clientY, rectOf(pedalBtns[0]), rectOf(pedalBtns[1]), 'gas'));
    syncPedals();
    d.touched();
  }
  /** Keep a finger's let-go on the button it pressed (a pointer that isn't live, as a synthetic one, can't be) */
  const capture = (el: HTMLElement, id: number) => {
    try {
      el.setPointerCapture?.(id);
    } catch {
      /* fine */
    }
  };
  /** A touch button that's held or toggled by the setting for `job`: `set` turns it on or off, `get` says whether it's on */
  function holdButton(btn: HTMLElement | null, jobOf: HoldJob | (() => HoldJob), set: (on: boolean) => void, get: () => boolean) {
    if (!btn) return;
    const job = () => (typeof jobOf === 'function' ? jobOf() : jobOf);
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      capture(btn, e.pointerId);
      set(press(hm(job(), 'touch'), get(), true));
      d.touched();
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
      btn.addEventListener(ev, () => {
        if (hm(job(), 'touch') === 'hold' && get()) set(false);
      });
    // (Enter or Space on it, focused: a toggle either way; a pointer's own click already pressed it)
    btn.addEventListener('click', (e) => {
      if (e.detail === 0) set(!get());
    });
  }

  // Touch joystick: one finger, followed wherever it goes (on the window, the finger captured) and never another's.
  // At the wheel it floats (touchdrive.ts): a thumb landing on the city on the stick's side of the lower screen is the
  // stick, its ring moved under the thumb, so the steering thumb never misses it
  const setJoy = (e: PointerEvent) => {
    const R = stick.getBoundingClientRect().width / 2 || 1;
    let x = (e.clientX - joy.ox) / R;
    let y = (e.clientY - joy.oy) / R;
    const m = Math.hypot(x, y);
    if (m > 1) ((x /= m), (y /= m));
    joy.x = x;
    joy.y = y;
    const sh = stickRead(e.clientX - joy.ox, e.clientY - joy.oy, R);
    joy.sx = sh.x;
    joy.sy = sh.y;
    knob.style.transform = `translate(${x * R * 0.54}px, ${y * R * 0.54}px)`;
    d.touched();
  };
  /** A finger takes the stick (on the stick itself, or floating at the wheel); false if another already has it */
  function startJoy(e: PointerEvent, el: HTMLElement, float: boolean) {
    if (joy.id >= 0) return false;
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    joy.id = e.pointerId;
    joy.float = float;
    joy.ox = float ? e.clientX : cx;
    joy.oy = float ? e.clientY : cy;
    stick.style.translate = float ? `${e.clientX - cx}px ${e.clientY - cy}px` : '';
    stick.classList.toggle('is-held', true);
    capture(el, e.pointerId);
    setJoy(e);
    return true;
  }
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (startJoy(e, stick, false)) e.stopPropagation();
  });
  window.addEventListener('pointermove', (e) => e.pointerId === joy.id && setJoy(e));
  const endJoy = (e?: PointerEvent) => {
    if (e && e.pointerId !== joy.id) return;
    joy.id = -1;
    joy.x = joy.y = joy.sx = joy.sy = 0;
    joy.float = false;
    knob.style.transform = '';
    stick.style.translate = '';
    stick.classList.remove('is-held');
  };
  for (const ev of ['pointerup', 'pointercancel'] as const) window.addEventListener(ev, (e) => endJoy(e));
  const jumpBtn = $('[data-walk-jump]');
  jumpBtn.addEventListener('pointerdown', () => {
    tryJump();
    h.jumpHeld = true;
  });
  jumpBtn.addEventListener('pointerup', () => (h.jumpHeld = false));
  jumpBtn.addEventListener('pointercancel', () => (h.jumpHeld = false));
  // (the touch buttons answer a finger at once, with the thumb still on the stick: onTap() in ui.ts)
  holdButton(runBtn, 'sprint', setSprintLock, () => h.sprintLock);
  crouchBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capture(crouchBtn, e.pointerId);
    crouchInput('touch', true);
    // (a crouch lets go of the locked sprint, which would stand him straight back up)
    if (h.crouched) setSprintLock(false);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) crouchBtn.addEventListener(ev, () => crouchInput('touch', false));
  crouchBtn.addEventListener('click', (e) => e.detail === 0 && crouchPress());
  // Touch pedals at the wheel (touchdrive.ts): each pedal finger followed on its own, pressing the pedal it's on or
  // the nearer one, so a thumb rolled from Gas onto Brake switches without lifting; a finger landing on the city just
  // round them presses one too. Only its own lift (or the browser's cancel) lets a pedal go, never another finger.
  pedalBtns.forEach((b) =>
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pressPedal(e, b);
    })
  );
  window.addEventListener('pointermove', (e) => {
    const was = pedalFingers.get(e.pointerId);
    if (!was) return;
    const now = pedalAt(e.clientX, e.clientY, rectOf(pedalBtns[0]), rectOf(pedalBtns[1]), was);
    if (now === was) return;
    pedalFingers.set(e.pointerId, now);
    syncPedals();
  });
  for (const ev of ['pointerup', 'pointercancel'] as const)
    window.addEventListener(ev, (e) => {
      if (pedalFingers.delete(e.pointerId)) syncPedals();
    });
  // The phone's own gestures never take a finger off the controls (Safari's pinch, its long-press magnifier and
  // callout, Android's long-press menu): a touch landing on a control or the city while walking keeps its default from
  // happening (the pointer events go on as they were)
  const onControls = (t: EventTarget | null) => t instanceof Element && !!t.closest('.tc, .walk-stick, canvas');
  for (const ev of ['touchstart', 'touchmove'] as const)
    root.addEventListener(
      ev,
      (e) => {
        if (h.active && e.cancelable && onControls(e.target)) e.preventDefault();
      },
      { passive: false }
    );
  for (const ev of ['gesturestart', 'gesturechange'] as const) document.addEventListener(ev, (e) => h.active && e.preventDefault());
  root.addEventListener('contextmenu', (e) => h.active && onControls(e.target) && e.preventDefault());
  // The horn while driving your car (city life plan, Phase 2)
  $('[data-drive-horn]').addEventListener('pointerdown', () => {
    if (h.boat?.active) h.boat.horn();
    else drive.horn();
    d.touched();
  });
  // The camera at the wheel on touch (V on a keyboard): the boat's, the aircraft's or the car's next view
  onTap($('[data-drive-view]'), () => {
    nextCam();
    d.touched();
  });
  // ... on foot (over the shoulder or first person), and on a ride (its bar's View)
  onTap($('[data-walk-view]'), () => {
    nextCam();
    d.touched();
  });
  for (const b of rideViewBtns) b.addEventListener('click', () => h.ride && (nextCam(), d.touched()));
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
  const itemBtn = root.querySelector<HTMLButtonElement>('[data-kart-item]');
  if (itemBtn) {
    itemBtn.addEventListener('pointerdown', (e) => {
      try {
        itemBtn.setPointerCapture(e.pointerId);
      } catch {
        /* still pressed */
      }
      kartBtns.item = true;
      d.touched();
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) itemBtn.addEventListener(ev, () => (kartBtns.item = false));
  }
  // Touch while fighting: Punch, Kick and Dodge tapped, Block held, Quit; on the street the Block button is the Guard
  // (a toggle unless picked: the fists lifted, Punch and Kick showing while it's up)
  for (const k of ['punch', 'kick', 'dodge'] as const) {
    const b = root.querySelector(`[data-fight-${k}]`);
    if (b)
      onTap(b, () => {
        fightBtns[k] = true;
        d.touched();
      });
  }
  holdButton(
    blockBtnEl,
    () => (h.ring ? 'block' : 'guard'),
    (on) => (h.ring ? setBlock(on) : setGuard(on)),
    () => (h.ring ? fightBtns.block : fightBtns.guard),
  );
  root.querySelector('[data-fight-quit]')?.addEventListener('click', () => quitFight());
  fpBtn.addEventListener('click', () => setFirstPerson(!h.firstPerson));
  sensInput.addEventListener('input', () => {
    settings.sens = Number(sensInput.value);
    saveSettings();
  });
  invertInput.addEventListener('change', () => {
    settings.invert = invertInput.checked;
    saveSettings();
  });
  onTap(prompt, act);
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
  onTap($('[data-walk-reload]'), () => {
    combat.reload();
    d.touched();
  });
  // (the hotbar's step: through the fists and the guns)
  onTap($('[data-walk-swap]'), () => {
    stepSlot(1);
    d.touched();
  });
  // Touch: Aim toggles the sight (one thumb can't hold Aim and Fire)
  const aimBtn = $<HTMLButtonElement>('[data-walk-aim]');
  const setAim = (on: boolean) => {
    h.aim = on;
    aimBtn.setAttribute('aria-pressed', String(on));
  };
  holdButton(aimBtn, 'aim', setAim, () => h.aim);

  return { startJoy, endJoy, pressPedal, clearPedals, rectOf, setAim };
}
export type Touch = ReturnType<typeof wireTouch>;
