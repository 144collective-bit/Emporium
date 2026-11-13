// City view's free camera (freecam.ts, the owner's call: WASD always flies it where it looks, near the wall): the keys,
// how it flies, mouse look, and that it stays inside the wall, over the ground and never over the wall's top.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLY, POLAR, anyHeld, ceilingAt, clampCam, easeVel, groundUnder, keyDir, noKeys, reach, speedAt, turn, wish, type FlyKeys, type V3 } from '../src/scripts/city3d/freecam';
import { PAN_BOUNDS } from '../src/scripts/city3d/bounds';
import { WALL, WALL_INNER, fromWall } from '../src/scripts/city3d/wall';
import { CENTER_XZ as CENTER } from '../src/scripts/city3d/layout';

const len = (v: V3) => Math.hypot(v[0], v[1], v[2]);
const held = (k: Partial<FlyKeys>): FlyKeys => ({ ...noKeys(), ...k });
const near = (a: number, b: number, e = 1e-9) => Math.abs(a - b) < e;

test('WASD, the arrows, E / Space up, Q / C down, Shift faster; nothing else', () => {
  assert.deepEqual(['KeyW', 'KeyA', 'KeyS', 'KeyD'].map(keyDir), ['fwd', 'left', 'back', 'right']);
  assert.deepEqual(['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].map(keyDir), ['fwd', 'left', 'back', 'right']);
  assert.deepEqual(['KeyE', 'Space', 'KeyQ', 'KeyC', 'ShiftLeft', 'ShiftRight'].map(keyDir), ['up', 'up', 'down', 'down', 'fast', 'fast']);
  // M is the world map, Esc the hub: not the camera's
  for (const c of ['KeyM', 'Escape', 'KeyF', 'KeyV', 'Tab', 'Enter']) assert.equal(keyDir(c), null, c);
  assert.equal(anyHeld(noKeys()), false);
  assert.equal(anyHeld(held({ fast: true })), false, 'Shift alone does not fly');
  assert.equal(anyHeld(held({ up: true })), true);
});

test('W flies along the look (up or down with it), A and D level and square to it, E straight up', () => {
  const look: V3 = [0, -Math.SQRT1_2, Math.SQRT1_2];
  const w = wish(held({ fwd: true }), look, 10);
  assert.ok(near(len(w), speedAt(10, false), 1e-6));
  assert.ok(w[1] < 0 && w[2] > 0 && near(w[0], 0), 'down the look');
  const d = wish(held({ right: true }), look, 10);
  assert.ok(near(d[1], 0) && near(d[2], 0, 1e-9) && d[0] !== 0, 'level, square to it');
  const a = wish(held({ left: true }), look, 10);
  assert.ok(near(a[0], -d[0]), 'A the other way');
  const e = wish(held({ up: true }), look, 10);
  assert.ok(near(e[0], 0) && near(e[2], 0) && e[1] > 0);
  assert.deepEqual(wish(held({ fwd: true, back: true }), look, 10), [0, 0, 0], 'W and S cancel');
  // two at once is no faster than one
  assert.ok(near(len(wish(held({ fwd: true, right: true }), look, 10)), speedAt(10, false), 1e-6));
  // looking straight down, it still slides sideways
  assert.ok(len(wish(held({ right: true }), [0, -1, 0], 10)) > 0);
});

test('faster high up and with Shift; it eases in and out, at once under reduced motion', () => {
  assert.ok(speedAt(100, false) > speedAt(5, false));
  assert.ok(near(speedAt(5, true), speedAt(5, false) * FLY.fast));
  const want: V3 = [10, 0, 0];
  const v = easeVel([0, 0, 0], want, 1 / 60);
  assert.ok(v[0] > 0 && v[0] < 10, 'eases in');
  let s: V3 = [10, 0, 0];
  for (let i = 0; i < 120; i++) s = easeVel(s, [0, 0, 0], 1 / 60);
  assert.deepEqual(s, [0, 0, 0], 'comes to a stop');
  assert.deepEqual(easeVel([0, 0, 0], want, 1 / 60, true), want);
  assert.deepEqual(easeVel([5, 5, 5], [0, 0, 0], 1 / 60, true), [0, 0, 0]);
});

test('mouse look turns where it stands, its pitch held from nearly straight down to a little up', () => {
  const ahead: V3 = [0, 0, 1];
  const r = turn(ahead, 100, 0);
  assert.ok(near(len(r), 1, 1e-9) && near(r[1], 0, 1e-9) && r[0] !== 0, 'turns level');
  const up = turn(ahead, 0, -1e6);
  assert.ok(near(Math.asin(up[1]), FLY.pitch[1], 1e-9));
  const down = turn(ahead, 0, 1e6);
  assert.ok(near(Math.asin(down[1]), FLY.pitch[0], 1e-9));
  // the orbit's polar range is the same range seen from the pivot
  assert.ok(near(POLAR[0], Math.PI / 2 + FLY.pitch[0]) && near(POLAR[1], Math.PI / 2 + FLY.pitch[1]));
  assert.ok(POLAR[0] > 0 && POLAR[1] < Math.PI);
});

test('it flies right up to the wall, never into it, all round', () => {
  for (const [x, z] of [
    [-1e4, CENTER.z],
    [1e4, CENTER.z],
    [CENTER.x, -1e4],
    [CENTER.x, 1e4],
    [-1e4, -1e4],
    [1e4, 1e4],
  ]) {
    const [cx, , cz] = clampCam([x, 20, z], 0);
    const d = fromWall(cx, cz);
    assert.ok(d > 0 && d <= 3, `${d} from the wall`);
  }
  // inside, it's left where it is
  const p: V3 = [CENTER.x + 3, 40, CENTER.z - 7];
  assert.deepEqual(clampCam(p, 0), p);
  assert.ok(PAN_BOUNDS[0] > WALL_INNER[0] && PAN_BOUNDS[2] < WALL_INNER[2]);
});

test('over the ground always, and never over the wall: near it the ceiling is under its top', () => {
  assert.equal(clampCam([CENTER.x, -50, CENTER.z], 0)[1], FLY.floor);
  assert.equal(clampCam([CENTER.x, 0, CENTER.z], 7)[1], 7 + FLY.floor, 'over a hill');
  // at the wall, under its top; well away from it, City view's old height
  const atWall = clampCam([1e4, 1e4, CENTER.z], 0);
  assert.ok(atWall[1] < WALL.h, `${atWall[1]} at the wall, its top ${WALL.h}`);
  assert.ok(near(ceilingAt(CENTER.x, CENTER.z), FLY.ceiling, 1e-6));
  assert.ok(clampCam([CENTER.x, 1e4, CENTER.z], 0)[1] <= FLY.ceiling);
  // the ceiling only rises going in from the wall
  let last = -Infinity;
  for (let d = 0; d <= FLY.nearWall + 20; d += 5) {
    const c = ceilingAt(WALL_INNER[0] + d, CENTER.z);
    assert.ok(c >= last - 1e-9);
    last = c;
  }
  // the land under it is never below the street
  for (const [x, z] of [[CENTER.x, CENTER.z], [WALL_INNER[0] + 5, WALL_INNER[1] + 5], [WALL_INNER[2] - 5, WALL_INNER[3] - 5]]) assert.ok(groundUnder(x, z) >= 0);
});

test('the pivot it turns round stays inside the wall, along the look', () => {
  const from: V3 = [WALL_INNER[2] - 10, 10, CENTER.z];
  const r = reach(from, [1, 0, 0], 50);
  assert.ok(from[0] + r <= PAN_BOUNDS[2] + 1e-9 && r < 50);
  assert.equal(reach(from, [-1, 0, 0], 50), 50, 'nothing in the way');
  assert.equal(reach([PAN_BOUNDS[2], 10, CENTER.z], [1, 0, 0], 50), FLY.pivot, 'never nearer than the pivot');
  assert.equal(reach(from, [0, -1, 0], 30), 30, 'looking straight down');
});

test("the hub's City view keys (keymap.ts FLY_KEYS) are the ones it flies with", async () => {
  const { FLY_KEYS } = await import('../src/scripts/city3d/keymap');
  const row = (label: string) => FLY_KEYS.find((r) => r.label === label)!.keys;
  assert.deepEqual(row('Fly')[0].split('').map((c) => keyDir(`Key${c}`)), ['fwd', 'left', 'back', 'right']);
  for (const [label, dir] of [['Up', 'up'], ['Down', 'down']] as const) for (const k of row(label)) assert.equal(keyDir(k === 'Space' ? k : `Key${k}`), dir, k);
  assert.equal(keyDir(`${row('Faster')[0]}Left`), 'fast');
  assert.ok(FLY_KEYS.every((r) => r.label.split(' ').length <= 3), 'labels 1-3 words');
});
