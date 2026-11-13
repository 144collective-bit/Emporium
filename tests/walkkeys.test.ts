// Walk mode's keyboard (walkkeys.ts, docs/walk-plan.md Phase 2): what each key does by what's on screen, against
// made-up key events and a host that writes down what it was asked. keymap.ts says the same things in words: the
// last test holds the two together.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVE, onKey, type KeyHost } from '../src/scripts/city3d/walkkeys';
import { KEYMAP, type Job, type ModeId } from '../src/scripts/city3d/keymap';

/** A key event as the handler reads it: its code, the character, a repeat, where it was typed, and whether it was taken */
function ev(code: string, o: { key?: string; repeat?: boolean; typing?: boolean } = {}) {
  const e = {
    code,
    key: o.key ?? '',
    repeat: !!o.repeat,
    target: { matches: (sel: string) => !!o.typing && sel.includes('input') },
    taken: false,
    preventDefault() {
      e.taken = true;
    },
  };
  return e;
}
type Ev = ReturnType<typeof ev>;
/** A host on foot with nothing open, writing down every call as "name" or "name:args" */
function host(over: Partial<KeyHost> & { holds?: Record<string, 'hold' | 'toggle'> } = {}) {
  const log: string[] = [];
  const say = (name: string) => (...args: unknown[]) => void log.push(args.length ? `${name}:${args.join(',')}` : name);
  const menu = (name: string) => ({ open: false, close: say(`${name}.close`) });
  const h: KeyHost = {
    d: { hub: { open: false }, touched: say('touched') },
    active: true,
    hotbar: null,
    kartUI: menu('kartUI'),
    ride: null,
    fight: null,
    boat: null,
    karts: { active: false },
    near: null,
    sprintLock: false,
    jumpHeld: false,
    walkLock: false,
    keys: new Set(),
    shop: menu('shop'),
    garageUI: menu('garage'),
    hangarUI: menu('hangar'),
    fightUI: menu('fightUI'),
    fly: { active: false },
    drive: { active: false, horn: say('horn') },
    combat: { reload: say('reload'), toggleHolster: say('holster') },
    fightBtns: { kick: false, dodge: false },
    moments: { active: false },
    fighting: () => false,
    emotesOpen: () => false,
    setInput: say('input'),
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
    pickSlot: say('pickSlot'),
    ...over,
  };
  /** Press (or let go of) a key: was it walk mode's, was it taken from the page, and what was asked (but "touched" and the input) */
  const key = (code: string, down = true, o: Parameters<typeof ev>[1] = {}) => {
    log.length = 0;
    const e: Ev = ev(code, o);
    const mine = onKey(e as unknown as KeyboardEvent, down, h);
    return { mine, taken: e.taken, asked: log.filter((l) => l !== 'touched' && l !== 'input:keys'), touched: log.includes('touched') };
  };
  return { h, log, key };
}

test("not walking, or typing in a field: the key isn't walk mode's", () => {
  const off = host({ active: false });
  assert.deepEqual(off.key('KeyW'), { mine: false, taken: false, asked: [], touched: false });
  assert.equal(off.h.keys.size, 0);
  const typing = host();
  assert.equal(typing.key('KeyW', true, { typing: true }).mine, false);
  assert.equal(typing.h.keys.size, 0);
  // (a key no mode has is left to the page)
  assert.deepEqual(host().key('KeyP'), { mine: false, taken: false, asked: [], touched: false });
});

test('on foot: the move keys are held, and one job a key', () => {
  const { h, key } = host({ near: { id: 'door' } });
  for (const c of MOVE) {
    assert.deepEqual(key(c), { mine: true, taken: true, asked: [], touched: true }, c);
    assert.ok(h.keys.has(c));
    key(c, false);
    assert.ok(!h.keys.has(c), `${c} let go`);
  }
  assert.deepEqual(key('KeyF').asked, ['act']);
  assert.deepEqual(key('Tab').asked, ['toggleInv']);
  assert.deepEqual(key('KeyV').asked, ['nextCam']);
  assert.deepEqual(key('KeyR').asked, ['reload']);
  assert.deepEqual(key('KeyG').asked, ['holster']);
  assert.deepEqual(key('KeyX').asked, ['stepSlot:1']);
  assert.deepEqual(key('KeyC').asked, ['crouch:keys,true']);
  assert.deepEqual(key('KeyC', false).asked, ['crouch:keys,false']);
  assert.deepEqual(key('Digit1').asked, ['pickSlot:0']);
  assert.deepEqual(key('Digit7').asked, ['pickSlot:6']);
  assert.equal(key('Digit8').mine, false, 'seven slots');
  // Space jumps once a press and is held; Caps Lock locks the walk; Q and E are held to peek
  assert.deepEqual(key('Space').asked, ['tryJump']);
  assert.ok(h.jumpHeld);
  assert.deepEqual(key('Space', true, { repeat: true }).asked, []);
  key('Space', false);
  assert.ok(!h.jumpHeld);
  key('CapsLock');
  assert.ok(h.walkLock);
  key('CapsLock');
  assert.ok(!h.walkLock);
  key('KeyQ');
  key('KeyE');
  assert.ok(h.keys.has('KeyQ') && h.keys.has('KeyE'));
  key('KeyQ', false);
  assert.ok(!h.keys.has('KeyQ') && h.keys.has('KeyE'));
  // A held key's repeats do its job once
  for (const c of ['Tab', 'KeyV', 'KeyR', 'KeyG', 'KeyX', 'KeyC', 'Digit1', 'CapsLock']) assert.deepEqual(key(c, true, { repeat: true }).asked, [], c);
});

test('on foot, by what is so: nothing near, empty hands, a moment, the emote panel, Shift on toggle, the card', () => {
  // F with nothing near does nothing (and isn't walk mode's)
  assert.deepEqual(host().key('KeyF'), { mine: false, taken: false, asked: [], touched: false });
  // Empty hands: G kicks
  const fists = host({ fistsReady: () => true });
  assert.deepEqual(fists.key('KeyG').asked, []);
  assert.ok(fists.h.fightBtns.kick);
  // In the middle of a moment Tab waits; the emote panel open has the digits
  assert.deepEqual(host({ moments: { active: true } }).key('Tab').asked, []);
  assert.deepEqual(host({ emotesOpen: () => true }).key('Digit2'), { mine: false, taken: false, asked: [], touched: false });
  // Shift held runs (it's a move key); on toggle a press locks the sprint and the next lets it go
  const hold = host();
  hold.key('ShiftLeft');
  assert.ok(hold.h.keys.has('ShiftLeft'));
  const toggle = host({ holds: { sprint: 'toggle' } });
  assert.deepEqual(toggle.key('ShiftLeft').asked, ['sprintLock:true']);
  assert.ok(!toggle.h.keys.has('ShiftLeft'));
  assert.deepEqual(host({ holds: { sprint: 'toggle' }, sprintLock: true }).key('ShiftRight').asked, ['sprintLock:false']);
  // / or ? asks for the control card, in any mode but a menu's
  for (const o of [{}, { drive: { active: true, horn: () => {} } }, { fighting: () => true }, { ride: {} }] as Partial<KeyHost>[]) {
    assert.deepEqual(host(o).key('Slash').asked, ['askCard']);
    assert.deepEqual(host(o).key('IntlRo', true, { key: '?' }).asked, ['askCard']);
  }
});

test('a menu open takes the keys: the hub and the inventory their own, F closes the others', () => {
  const hub = host({ d: { hub: { open: true }, touched: () => {} } });
  assert.equal(hub.key('KeyW').mine, false);
  assert.equal(hub.h.keys.size, 0);
  // The inventory answers for itself
  const seen: string[] = [];
  const inv = host({ hotbar: { open: true, key: (e, down) => (seen.push(`${e.code},${down}`), true) } });
  assert.equal(inv.key('Tab').mine, true);
  assert.equal(inv.key('KeyW', false).mine, true);
  assert.deepEqual(seen, ['Tab,true', 'KeyW,false']);
  assert.equal(inv.h.keys.size, 0);
  // The store, the garage, the hangar, the clubhouse, the trainer: F closes the one that's open, walking keys wait
  for (const name of ['shop', 'garageUI', 'hangarUI', 'kartUI', 'fightUI'] as const) {
    const log: string[] = [];
    const m = host({ [name]: { open: true, close: () => void log.push('close') } });
    assert.deepEqual(m.key('KeyW'), { mine: false, taken: false, asked: [], touched: false }, name);
    assert.equal(m.h.keys.size, 0);
    assert.equal(m.key('KeyF').mine, false);
    assert.deepEqual(log, ['close'], name);
    m.key('KeyF', true, { repeat: true });
    m.key('Slash');
    assert.deepEqual(log, ['close'], `${name}: once a press, and no card under it`);
  }
  // A peek key let go while a menu is open is let go
  const peek = host();
  peek.key('KeyQ');
  peek.h.shop.open = true;
  peek.key('KeyQ', false);
  assert.ok(!peek.h.keys.has('KeyQ'));
});

test('at the wheel: each vehicle its own keys', () => {
  // A car: F gets out, V the camera, H the horn, Space the handbrake, the move keys held; nothing of walking's
  const car = host({ drive: { active: true, horn: () => void car.log.push('horn') } });
  assert.deepEqual(car.key('KeyF').asked, ['act']);
  assert.deepEqual(car.key('KeyV').asked, ['nextCam']);
  assert.deepEqual(car.key('KeyH').asked, ['horn']);
  car.key('Space');
  assert.ok(car.h.jumpHeld);
  assert.deepEqual(car.key('Space', false).asked, [], 'no jump at the wheel');
  assert.ok(!car.h.jumpHeld);
  car.key('KeyW');
  assert.ok(car.h.keys.has('KeyW'));
  for (const c of ['Tab', 'KeyR', 'KeyG', 'KeyX', 'KeyC', 'Digit1', 'KeyQ']) assert.equal(car.key(c).mine, false, c);
  // A boat: F, V, H; no Space
  const boat = host({ boat: { active: true, horn: () => void boat.log.push('horn') } });
  assert.deepEqual([boat.key('KeyF').asked, boat.key('KeyV').asked, boat.key('KeyH').asked], [['act'], ['nextCam'], ['horn']]);
  assert.equal(boat.key('Space').mine, false);
  boat.key('KeyA');
  assert.ok(boat.h.keys.has('KeyA'));
  // An aircraft: F, V; Space climbs (held), C dives (held)
  const plane = host({ fly: { active: true } });
  assert.deepEqual([plane.key('KeyF').asked, plane.key('KeyV').asked], [['act'], ['nextCam']]);
  plane.key('Space');
  plane.key('KeyC');
  assert.ok(plane.h.jumpHeld && plane.h.keys.has('KeyC'));
  assert.deepEqual(plane.key('KeyC', false).asked, [], 'no crouch in the air');
  assert.equal(plane.key('KeyH').mine, false);
  // A kart: F is swallowed (no getting out mid-lap), V, Space the drift
  const kart = host({ karts: { active: true } });
  assert.deepEqual(kart.key('KeyF'), { mine: true, taken: true, asked: [], touched: true });
  assert.deepEqual(kart.key('KeyV').asked, ['nextCam']);
  kart.key('Space');
  assert.ok(kart.h.jumpHeld);
  // E is held for the item, and let go
  assert.equal(kart.key('KeyE').mine, true);
  assert.ok(kart.h.keys.has('KeyE'));
  kart.key('KeyE', false);
  assert.ok(!kart.h.keys.has('KeyE'));
});

test('the ring and a ride', () => {
  // The ring: the move keys, G kicks, Space dodges, E a snack, V the camera; nothing else
  const snacks: string[] = [];
  const ring = host({ fighting: () => true, fight: { snack: () => void snacks.push('snack') } });
  ring.key('KeyG');
  ring.key('Space');
  assert.deepEqual(ring.h.fightBtns, { kick: true, dodge: true });
  ring.key('KeyE');
  assert.deepEqual(snacks, ['snack']);
  assert.deepEqual(ring.key('KeyV').asked, ['nextCam']);
  ring.key('KeyD');
  assert.ok(ring.h.keys.has('KeyD') && !ring.h.keys.has('KeyE'));
  for (const c of ['KeyF', 'Tab', 'KeyR', 'KeyX', 'KeyC', 'Digit1']) assert.equal(ring.key(c).mine, false, c);
  ring.h.fightBtns.dodge = false;
  ring.key('Space', true, { repeat: true });
  assert.ok(!ring.h.fightBtns.dodge, 'once a press');
  // A ride: V steps its camera
  assert.deepEqual(host({ ride: { kind: 'metro' } }).key('KeyV'), { mine: true, taken: true, asked: ['nextCam'], touched: false });
});

test("keymap.ts's table and the handler agree: every key a mode lists is walk mode's there", () => {
  // The table's names for keys, as codes (the mouse, Esc and M are other handlers': index.ts and the canvas)
  const CODES: Record<string, string[]> = {
    WASD: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], W: ['KeyW'], A: ['KeyA'], S: ['KeyS'], D: ['KeyD'],
    '↑': ['ArrowUp'], '↓': ['ArrowDown'], '←': ['ArrowLeft'], '→': ['ArrowRight'],
    Shift: ['ShiftLeft'], Space: ['Space'], 'Caps Lock': ['CapsLock'], Tab: ['Tab'],
  };
  const codeOf = (k: string) => CODES[k] ?? (/^[A-Z]$/.test(k) ? [`Key${k}`] : /^[1-7]$/.test(k) ? [`Digit${k}`] : null);
  const ELSEWHERE = /^(Mouse|Esc|M|Click|Right-click|Wheel|Scroll)/;
  /** Walk mode in each of the table's modes */
  const IN: Record<ModeId, () => Partial<KeyHost>> = {
    foot: () => ({ near: {} }),
    fists: () => ({ near: {}, fistsReady: () => true }),
    armed: () => ({ near: {} }),
    car: () => ({ drive: { active: true, horn: () => {} } }),
    bike: () => ({ drive: { active: true, horn: () => {} } }),
    boat: () => ({ boat: { active: true, horn: () => {} } }),
    plane: () => ({ fly: { active: true } }),
    kart: () => ({ karts: { active: true } }),
    ring: () => ({ fighting: () => true, fight: { snack: () => {} } }),
    ride: () => ({ ride: {} }),
  };
  // (jobs the keyboard does elsewhere, or with the mouse only)
  const NOT_KEYS: Job[] = ['look', 'map', 'menu', 'quit', 'skip', 'emotes', 'fire', 'aim', 'punch', 'block', 'guard'];
  let checked = 0;
  for (const [id, mode] of Object.entries(KEYMAP) as [ModeId, (typeof KEYMAP)[ModeId]][]) {
    for (const b of mode.binds) {
      if (NOT_KEYS.includes(b.job)) continue;
      for (const k of b.keys) {
        if (ELSEWHERE.test(k)) continue;
        // (a range of digits, "1-7", is its ends)
        const names = /^\d\s*[-–]\s*\d$/.test(k) ? [k[0], k.at(-1)!] : [k];
        for (const n of names) {
          const codes = codeOf(n.trim());
          assert.ok(codes, `${id}: no code for the key "${k}" (${b.job})`);
          for (const c of codes) {
            assert.equal(host(IN[id]()).key(c).mine, true, `${id}: ${c} (${b.job}: ${b.label})`);
            checked++;
          }
        }
      }
    }
  }
  assert.ok(checked > 60, `${checked} keys checked`);
});
