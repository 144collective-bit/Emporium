/*
 * Walk mode's keyboard (docs/walk-plan.md Phase 2; DOM-free, tested in tests/walkkeys.test.ts): a key down or up
 * becomes what walk mode does with it, by what's on screen: the hub, the inventory or a menu open takes it (F closes
 * the menu); a ride, the ring, the wheel of a boat, an aircraft, a kart or a car each take their own; on foot the
 * rest. It was `onKey()` inside walk.ts's `createWalk()`, moved here word for word: what it reads and calls of walk
 * mode comes through `KeyHost` (walk.ts builds it once; what changes between keys is read through `h.`), and the
 * one thing it asked the page (is the emote panel open, which has the digits) is the host's `emotesOpen()`.
 * keymap.ts lists what each key does in each mode: when one changes here, change its line there.
 *
 * It answers true when the key was walk mode's (and has been `preventDefault()`ed), false when it's someone else's.
 */
import type { HoldInput, HoldJob, HoldMode } from './comfort';

/** A menu F closes */
interface Menu {
  open: boolean;
  close(): void;
}

/** Walk mode as the keyboard sees it: what's open and active now (read each key), and what the keys do */
export interface KeyHost {
  /** The hub and "something was pressed" (walk.ts's own deps) */
  d: { hub?: { open: boolean } | null; touched(): void };
  // What may change between keys
  readonly active: boolean;
  readonly hotbar: { open: boolean; key(e: KeyboardEvent, down: boolean): boolean } | null;
  readonly kartUI: Menu;
  readonly ride: unknown;
  readonly fight: { snack(): void } | null;
  readonly boat: { active: boolean; horn(): void } | null;
  readonly karts: { active: boolean };
  readonly near: unknown;
  readonly sprintLock: boolean;
  // What the keys set as well as read
  jumpHeld: boolean;
  walkLock: boolean;
  /** The keys held (the move keys, Q / E, C in the air) */
  keys: Set<string>;
  // The menus
  shop: Menu;
  garageUI: Menu;
  hangarUI: Menu;
  fightUI: Menu;
  // The vehicles, the guns, the ring
  fly: { active: boolean };
  drive: { active: boolean; horn(): void };
  combat: { reload(): void; toggleHolster(): void };
  fightBtns: { kick: boolean; dodge: boolean };
  moments: { active: boolean };
  fighting(): boolean;
  /** The emote panel is open on the page (it has the digits) */
  emotesOpen(): boolean;
  // What walk mode does
  setInput(k: 'keys'): void;
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
  pickSlot(n: number): void;
}

/** The keys that move (and run): held in `keys` while they're down */
export const MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
/** One key: `down` true as it goes down (repeats too), false as it comes up */
export function onKey(e: KeyboardEvent, down: boolean, h: KeyHost) {
  const { d, keys, shop, garageUI, hangarUI, fightUI, fly, drive, combat, fightBtns, moments } = h;
  const { fighting, emotesOpen, setInput, askCard, nextCam, hm, act, tryJump, crouchInput, fistsReady, setSprintLock, toggleInv, stepSlot, pickSlot } = h;
  if (!h.active || (e.target as HTMLElement).matches?.('input, select, textarea')) return false;
  const c = e.code;
  if (down) setInput('keys');
  // (a peek key let go anywhere is let go: it may have been held into a car or a menu)
  if (!down && (c === 'KeyQ' || c === 'KeyE')) keys.delete(c);
  // The hub open: its own keys (menukit.ts), and walking keys wait
  if (d.hub?.open) return false;
  // The inventory open: its keys (Tab closes it; Esc too, index.ts), and walking keys wait
  if (h.hotbar?.open) return h.hotbar.key(e, down);
  // While the store, the garage, the hangar, the kart hut's or the trainer's menu is open, F closes it and walking keys wait
  if (shop.open || garageUI.open || hangarUI.open || h.kartUI.open || fightUI.open) {
    if (down && !e.repeat && c === 'KeyF') (shop.open ? shop.close() : garageUI.open ? garageUI.close() : hangarUI.open ? hangarUI.close() : h.kartUI.open ? h.kartUI.close() : fightUI.close());
    return false;
  }
  // / or ?: the control card for where you are (again: closes it)
  if (down && !e.repeat && (c === 'Slash' || e.key === '?' || e.key === '/')) {
    askCard();
    e.preventDefault();
    return true;
  }
  // On a ride: V steps its camera (the ride has the rest)
  if (h.ride && down && !e.repeat && c === 'KeyV') {
    nextCam();
    e.preventDefault();
    return true;
  }
  // Fighting, on the street's keys (keymap.ts): move with the move keys (W towards the opponent), G kicks, Space
  // dodges, E a snack, V the camera; the mouse punches and blocks (right button held; on the street it's the guard)
  if (fighting()) {
    if (down && !e.repeat && c === 'KeyV') nextCam();
    else if (c === 'Space') {
      if (down && !e.repeat) fightBtns.dodge = true;
    } else if (down && !e.repeat && c === 'KeyG') fightBtns.kick = true;
    else if (down && !e.repeat && c === 'KeyE') h.fight?.snack();
    else if (MOVE.includes(c)) {
      if (down) keys.add(c);
      else keys.delete(c);
    } else return false;
    d.touched();
    e.preventDefault();
    return true;
  }
  // Boating: W / S ahead and astern, A / D steer, V swaps camera, H the horn, F gets out (alongside a landing)
  if (h.boat?.active) {
    if (down && !e.repeat && c === 'KeyF') act();
    else if (down && !e.repeat && c === 'KeyV') nextCam();
    else if (down && !e.repeat && c === 'KeyH') h.boat.horn();
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
    else if (down && !e.repeat && c === 'KeyV') nextCam();
    else if (c === 'Space') h.jumpHeld = down;
    else if (MOVE.includes(c) || c === 'KeyC') {
      if (down) keys.add(c);
      else keys.delete(c);
    } else return false;
    d.touched();
    e.preventDefault();
    return true;
  }
  // Karting: steer and pedal with the move keys, Space hops into a drift, E uses the item (F does nothing in a race: no getting out mid-lap)
  if (h.karts.active) {
    if (c === 'KeyF') {
      /* swallowed */
    } else if (down && !e.repeat && c === 'KeyV') nextCam();
    else if (c === 'Space') h.jumpHeld = down;
    // (E is held for the item, as the kart's frame reads it: it was never held before the walk plan's Phase 2 found it)
    else if (MOVE.includes(c) || c === 'KeyE') {
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
    else if (down && !e.repeat && c === 'KeyV') nextCam();
    else if (down && !e.repeat && c === 'KeyH') drive.horn();
    else if (c === 'Space') h.jumpHeld = down;
    else if (MOVE.includes(c)) {
      if (down) keys.add(c);
      else keys.delete(c);
    } else return false;
    d.touched();
    e.preventDefault();
    return true;
  }
  if (down && c === 'KeyF' && h.near) act();
  // Tab: the inventory (on foot, not in the middle of a moment)
  else if (c === 'Tab') {
    if (down && !e.repeat && !moments.active) toggleInv();
  } else if (down && !e.repeat && c === 'KeyV') nextCam();
  else if (down && !e.repeat && c === 'CapsLock') h.walkLock = !h.walkLock;
  else if (down && !e.repeat && c === 'KeyR') combat.reload();
  else if (down && !e.repeat && c === 'KeyG') {
    // (empty hands: G kicks, with the guard up (brawl-sim.ts); a gun is drawn with 1 or 2)
    if (fistsReady()) fightBtns.kick = true;
    else combat.toggleHolster();
  } else if (down && !e.repeat && c === 'KeyX') stepSlot(1);
  else if (c === 'KeyC') {
    if (!e.repeat) crouchInput('keys', down);
  }
  // Shift on toggle: a press locks the sprint, the next lets it go
  else if ((c === 'ShiftLeft' || c === 'ShiftRight') && hm('sprint', 'keys') === 'toggle') {
    if (down && !e.repeat) setSprintLock(!h.sprintLock);
  }
  // Q / E held: peek left and right
  else if (c === 'KeyQ' || c === 'KeyE') {
    if (down) keys.add(c);
    else keys.delete(c);
  }
  // 1-7 pick a hotbar slot (unless the emote panel has them)
  else if (down && !e.repeat && /^Digit[1-7]$/.test(c) && !emotesOpen()) pickSlot(Number(c.slice(5)) - 1);
  else if (c === 'Space') {
    if (down && !e.repeat) tryJump();
    h.jumpHeld = down;
  } else if (MOVE.includes(c)) {
    if (down) keys.add(c);
    else keys.delete(c);
  } else return false;
  d.touched();
  e.preventDefault();
  return true;
}
