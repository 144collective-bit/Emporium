/**
 * One key for one job (docs/views-plan.md Phase 3, the owner's call: the controls simpler and the same everywhere):
 * every mode's jobs with their key, gamepad button and touch button, in one table. The hub's Settings > Keys is made
 * from it when the site is built (CityMap.astro), the control card (Phase 4) reads it, and tests/keymap.test.ts holds
 * it to the rule: a job's key and button are the same in every mode it's in (getting in and out, the camera, the
 * horn, the map, the menu, quitting...), and no two jobs share a key or a button in a mode unless one says it takes
 * it over by context (`shares`: with empty hands Y kicks when there's nothing to do, Space dodges with the guard up).
 * The control card (Phase 4, ctrlcard.ts, walk mode's own chunk) shows a mode's rows from `cardBinds()`.
 * walk.ts keeps its own handlers (the keyboard's is walkkeys.ts, the gamepad's walkpad.ts, both held to this table
 * by their tests; the touch buttons' is walktouch.ts); when one changes, change its line here too (and the other way round).
 * DOM-free and kept out of the boot: only the hub's page and the tests read it.
 */

/** A job: what a key does. The same job is the same key everywhere */
export type Job =
  | 'move' | 'look' | 'sprint' | 'walk' | 'jump' | 'crouch' | 'interact' | 'camera' | 'hotbar' | 'inventory' | 'map' | 'menu'
  | 'emotes' | 'punch' | 'kick' | 'block' | 'dodge' | 'fire' | 'aim' | 'reload' | 'peek' | 'holster' | 'steer' | 'gas'
  | 'brake' | 'handbrake' | 'horn' | 'climb' | 'drift' | 'item' | 'snack' | 'quit' | 'skip';

export interface Binding {
  job: Job;
  /** What it does in this mode (the Settings page's words) */
  label: string;
  /** The keyboard's keys, the first the main one ('WASD' is one: the four together) */
  keys: string[];
  /** The gamepad's buttons, the first the main one (none: not on a gamepad) */
  pad: string[];
  /** The touch button (none: not on touch screens) */
  touch?: string;
  /** Jobs whose key or button this one takes over in its moment (context), so the two may share */
  shares?: Job[];
}

export type ModeId = 'foot' | 'fists' | 'armed' | 'car' | 'bike' | 'boat' | 'plane' | 'kart' | 'ring' | 'ride';

export interface KeyMode {
  name: string;
  /** Laid on top of another mode's jobs (empty hands and a gun out are both on foot) */
  base?: ModeId;
  binds: Binding[];
}

/* ---------- The jobs every mode words the same ---------- */

const look = (label = 'Look'): Binding => ({ job: 'look', label, keys: ['Mouse'], pad: ['Right stick'], touch: 'Drag' });
const camera = (label: string): Binding => ({ job: 'camera', label, keys: ['V'], pad: ['R3'], touch: 'View' });
const interact = (label: string): Binding => ({ job: 'interact', label, keys: ['F'], pad: ['Y'], touch: 'Tap the prompt' });
const map = (pad = true): Binding => ({ job: 'map', label: 'World map', keys: ['M'], pad: pad ? ['View'] : [], touch: '☰ › Map' });
const menu = (keys = true): Binding => ({ job: 'menu', label: 'Menu', keys: keys ? ['Esc'] : [], pad: ['Start'], touch: '☰' });
const quit = (label: string): Binding => ({ job: 'quit', label, keys: ['Esc'], pad: ['Start'], touch: 'Quit' });
const horn: Binding = { job: 'horn', label: 'Horn', keys: ['H'], pad: ['L3'], touch: 'Horn' };
const steer = (label = 'Steer'): Binding => ({ job: 'steer', label, keys: ['A', 'D', '←', '→'], pad: ['Left stick'], touch: 'Stick' });
const gas = (label = 'Gas'): Binding => ({ job: 'gas', label, keys: ['W', '↑'], pad: ['RT'], touch: label });
const brake = (label = 'Brake · reverse', touch = 'Brake'): Binding => ({ job: 'brake', label, keys: ['S', '↓'], pad: ['LT'], touch });

export const KEYMAP: Record<ModeId, KeyMode> = {
  foot: {
    name: 'On foot',
    binds: [
      { job: 'move', label: 'Move', keys: ['WASD'], pad: ['Left stick'], touch: 'Stick' },
      look(),
      { job: 'sprint', label: 'Sprint', keys: ['Shift'], pad: ['L3'], touch: 'Sprint' },
      { job: 'walk', label: 'Walk (toggle)', keys: ['Caps Lock'], pad: [] },
      { job: 'jump', label: 'Jump · vault', keys: ['Space'], pad: ['A'], touch: 'Jump' },
      { job: 'crouch', label: 'Crouch · slide', keys: ['C'], pad: ['B'], touch: 'Crouch' },
      interact('Use'),
      camera('Camera'),
      { job: 'hotbar', label: 'Weapons', keys: ['1–7', 'X', 'Wheel'], pad: ['RB', 'D-pad ← →'], touch: 'Hotbar' },
      { job: 'inventory', label: 'Inventory', keys: ['Tab'], pad: ['View'], touch: '☰ › Bag' },
      map(false),
      menu(),
      { job: 'emotes', label: 'Emotes', keys: ['T'], pad: [], touch: '☰ › Online' },
    ],
  },
  fists: {
    name: 'Empty hands',
    base: 'foot',
    binds: [
      { job: 'punch', label: 'Punch', keys: ['Click'], pad: ['X'], touch: 'Punch' },
      { job: 'kick', label: 'Kick', keys: ['G'], pad: ['Y'], touch: 'Kick', shares: ['interact'] },
      { job: 'block', label: 'Block', keys: ['Right-click'], pad: ['LB'], touch: 'Block' },
      { job: 'dodge', label: 'Dodge', keys: ['Space'], pad: ['A'], touch: 'Jump', shares: ['jump'] },
    ],
  },
  armed: {
    name: 'A gun out',
    base: 'foot',
    binds: [
      { job: 'fire', label: 'Fire', keys: ['Click'], pad: ['RT'], touch: 'Fire' },
      { job: 'aim', label: 'Aim', keys: ['Right-click'], pad: ['LT'], touch: 'Aim' },
      { job: 'reload', label: 'Reload', keys: ['R'], pad: ['X'], touch: 'Reload' },
      { job: 'peek', label: 'Peek', keys: ['Q', 'E'], pad: ['LB', 'RB'], touch: 'Aim by a corner', shares: ['hotbar'] },
      { job: 'holster', label: 'Holster', keys: ['G'], pad: ['D-pad ↑'] },
    ],
  },
  car: {
    name: 'Your car',
    binds: [steer(), gas(), brake(), { job: 'handbrake', label: 'Handbrake', keys: ['Space'], pad: ['A'] }, horn, camera('Camera'), look(), interact('Get out'), map(), menu()],
  },
  bike: {
    name: 'Your motorbike',
    binds: [steer(), gas(), brake(), horn, camera('Camera'), look(), interact('Get off'), map(), menu()],
  },
  boat: {
    name: 'The hire boat',
    binds: [steer(), gas('Ahead'), brake('Astern', 'Astern'), horn, camera('Camera'), look(), interact('Get out'), map(), menu()],
  },
  plane: {
    name: 'Your aircraft',
    binds: [
      { job: 'steer', label: 'Turn', keys: ['A', 'D'], pad: ['Left stick'], touch: 'Stick' },
      { job: 'climb', label: 'Climb and dive', keys: ['Space', 'Shift', '↑', '↓'], pad: ['Left stick ↑ ↓'], touch: 'Stick' },
      { job: 'gas', label: 'Faster', keys: ['W'], pad: ['RT'], touch: 'Faster' },
      { job: 'brake', label: 'Slower', keys: ['S'], pad: ['LT'], touch: 'Slower' },
      camera('Camera'),
      look(),
      interact('Get out'),
      map(),
      menu(),
    ],
  },
  kart: {
    name: 'A kart race',
    binds: [
      steer(),
      gas(),
      brake('Brake'),
      { job: 'drift', label: 'Hop and drift', keys: ['Space'], pad: ['A'], touch: 'Drift' },
      { job: 'item', label: 'Use item', keys: ['E'], pad: ['X'], touch: 'Item' },
      camera('Camera'),
      quit('Quit the race (no prize)'),
    ],
  },
  ring: {
    name: 'The ring',
    binds: [
      { job: 'move', label: 'Move', keys: ['WASD'], pad: ['Left stick'], touch: 'Stick' },
      { job: 'punch', label: 'Punch', keys: ['Click'], pad: ['X'], touch: 'Punch' },
      { job: 'kick', label: 'Kick', keys: ['G'], pad: ['Y'], touch: 'Kick' },
      { job: 'block', label: 'Block', keys: ['Right-click'], pad: ['LB'], touch: 'Block' },
      { job: 'dodge', label: 'Dodge', keys: ['Space'], pad: ['A'], touch: 'Dodge' },
      { job: 'snack', label: 'Snack', keys: ['E'], pad: ['D-pad ↑'], touch: 'Snack' },
      camera('Near or far'),
      quit('Quit the fight (a loss)'),
    ],
  },
  ride: {
    name: 'A ride (taxi, metro, monorail, river bus)',
    binds: [look('Look round'), camera('Camera'), { job: 'skip', label: 'Skip the ride', keys: ['Esc'], pad: ['B'], touch: 'Skip ride' }, menu(false)],
  },
};

export const MODE_IDS = Object.keys(KEYMAP) as ModeId[];

/** The hub's Settings > Controls rows for City view (CityMap.astro; the free camera, freecam.ts):
 * keys and the mouse only, touch keeps its drag and pinch. Not a mode of `KEYMAP`: City view has no views, nor a gamepad */
export const FLY_KEYS: { keys: string[]; label: string }[] = [
  { keys: ['WASD', '↑ ← ↓ →'], label: 'Fly' },
  { keys: ['E', 'Space'], label: 'Up' },
  { keys: ['Q', 'C'], label: 'Down' },
  { keys: ['Shift'], label: 'Faster' },
  { keys: ['Right-drag'], label: 'Look' },
  { keys: ['Drag'], label: 'Pan' },
  { keys: ['Ctrl-drag'], label: 'Orbit' },
  { keys: ['Wheel'], label: 'Zoom' },
];

/** A mode's jobs with its base's (empty hands and a gun out on top of on foot) */
export function bindsOf(id: ModeId): Binding[] {
  const m = KEYMAP[id];
  return m.base ? [...KEYMAP[m.base].binds, ...m.binds] : m.binds;
}

/** What the control card leaves out (known from the menu, or rarely wanted) */
const CARD_SKIP: Job[] = ['walk', 'emotes'];
/** For a mode laid on another, the base's jobs the card adds after the mode's own */
const CARD_BASE: Job[] = ['move', 'sprint', 'jump', 'crouch', 'interact', 'camera', 'inventory'];

/** The control card's rows (docs/views-plan.md Phase 4): the mode's own jobs, then for one laid on on foot the main ones of that */
export function cardBinds(id: ModeId): Binding[] {
  const m = KEYMAP[id];
  const own = m.binds.filter((b) => !CARD_SKIP.includes(b.job));
  if (!m.base) return own;
  const jobs = new Set(own.map((b) => b.job));
  return [...own, ...KEYMAP[m.base].binds.filter((b) => CARD_BASE.includes(b.job) && !jobs.has(b.job))];
}
