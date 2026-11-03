// Where the touch controls stand (touchlayout.ts, docs/controls-plan.md Phase 1): every mode's buttons, the
// stick, the hotbar and the door prompt apart from each other and on screen, under the header, on the phones
// people hold upright and on their side, and on tablets; the same slots in every mode.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TC_ICONS, tcIconPath } from '../src/data/tcicons';
import { centreOf, footLayout, LAYOUTS, shapeOf, type FootMode, type Spot } from '../src/scripts/city3d/touchlayout';

/** Screens inside their safe areas (a notch's sides taken off on its side, the home bar's strip upright) */
const SCREENS: [number, number][] = [
  [320, 568 - 20],
  [360, 740 - 24],
  [375, 667 - 20],
  [375, 812 - 34],
  [390, 844 - 34],
  [414, 896 - 34],
  [430, 932 - 34],
  [568, 320],
  [667, 375],
  [812 - 94, 375 - 21],
  [844 - 94, 390 - 21],
  [932 - 118, 430 - 21],
  [768, 1024],
  [1024, 768],
];
const MODES: FootMode[] = ['fists', 'armed'];
/** The header's height on a phone (one row: docs/controls-plan.md Phase 3 makes it so in both modes) */
const HEAD = 64;
const GAP = 6;
/** The hotbar at its fullest in practice: two weapons, the thing in his hand and a snack */
const HOT_SLOTS = 4;
const PROMPT_W = 210;
const PROMPT_H = 42;

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const circleBox = (s: Spot, w: number, h: number): Box => {
  const [cx, cy] = centreOf(s, w, h);
  return { x0: cx - s.d / 2, y0: cy - s.d / 2, x1: cx + s.d / 2, y1: cy + s.d / 2 };
};
/** A circle and a box at least `gap` apart */
function clearOf(s: Spot, b: Box, w: number, h: number, gap: number) {
  const [cx, cy] = centreOf(s, w, h);
  const nx = Math.max(b.x0, Math.min(cx, b.x1));
  const ny = Math.max(b.y0, Math.min(cy, b.y1));
  return Math.hypot(cx - nx, cy - ny) >= s.d / 2 + gap;
}
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

test('the shape follows the screen: on its side when short, narrow under 361 wide', () => {
  assert.equal(shapeOf(375, 812), 'up');
  assert.equal(shapeOf(320, 568), 'narrow');
  assert.equal(shapeOf(812, 375), 'side');
  assert.equal(shapeOf(1024, 768), 'up');
});

test('every mode fills the same slots: Jump and Sprint stay put, the main button is the mode\'s', () => {
  assert.equal(LAYOUTS.fists.main, 'punch');
  assert.equal(LAYOUTS.armed.main, 'fire');
  for (const [w, h] of SCREENS) {
    const f = footLayout(w, h, 'fists').buttons;
    const a = footLayout(w, h, 'armed').buttons;
    assert.deepEqual(f.jump, a.jump);
    assert.deepEqual(f.sprint, a.sprint);
    assert.deepEqual(f.crouch, a.crouch);
    assert.deepEqual(f.punch, a.fire);
    // (Block where Reload is, Kick where Aim is)
    assert.deepEqual(f.block, a.reload);
    assert.deepEqual(f.kick, a.aim);
    assert.ok(a.fire!.d > a.jump!.d, 'the main button is the biggest');
  }
});

test('the buttons and the stick stand apart, on screen and under the header', () => {
  for (const [w, h] of SCREENS)
    for (const mode of MODES) {
      const L = footLayout(w, h, mode);
      const all = [...Object.entries(L.buttons), ['stick', L.stick] as const] as [string, Spot][];
      for (const [name, s] of all) {
        const b = circleBox(s, w, h);
        assert.ok(b.x0 >= 0 && b.x1 <= w && b.y1 <= h, `${name} on screen at ${w}x${h}`);
        assert.ok(b.y0 >= HEAD, `${name} under the header at ${w}x${h} (${b.y0})`);
      }
      for (let i = 0; i < all.length; i++)
        for (let j = i + 1; j < all.length; j++) {
          const [n1, s1] = all[i];
          const [n2, s2] = all[j];
          const [x1, y1] = centreOf(s1, w, h);
          const [x2, y2] = centreOf(s2, w, h);
          const room = Math.hypot(x1 - x2, y1 - y2) - (s1.d + s2.d) / 2;
          assert.ok(room >= GAP, `${n1} and ${n2} ${room.toFixed(1)} apart at ${w}x${h} (${mode})`);
        }
    }
});

test('the hotbar and the door prompt keep clear of the buttons and the stick', () => {
  for (const [w, h] of SCREENS)
    for (const mode of MODES) {
      const L = footLayout(w, h, mode);
      const s = L.hotbar.slot;
      const hw = HOT_SLOTS * s + (HOT_SLOTS - 1) * 4;
      const hot: Box = { x0: w - L.hotbar.right - hw, x1: w - L.hotbar.right, y0: h - L.hotbar.bottom - s, y1: h - L.hotbar.bottom };
      const pr: Box = { x0: L.prompt.cx - PROMPT_W / 2, x1: L.prompt.cx + PROMPT_W / 2, y0: h - L.prompt.bottom - PROMPT_H, y1: h - L.prompt.bottom };
      for (const [name, b] of [['hotbar', hot], ['prompt', pr]] as const) {
        assert.ok(b.x0 >= 0 && b.x1 <= w && b.y0 >= HEAD && b.y1 <= h, `${name} on screen at ${w}x${h}`);
        for (const [n, sp] of [...Object.entries(L.buttons), ['stick', L.stick]] as [string, Spot][])
          assert.ok(clearOf(sp, b, w, h, 4), `${name} clear of ${n} at ${w}x${h} (${mode})`);
      }
      assert.ok(!overlaps(hot, pr), `the hotbar and the prompt apart at ${w}x${h}`);
    }
});

test('every icon is a 16 x 16 grid, and its path covers exactly its lit pixels', () => {
  for (const [name, rows] of Object.entries(TC_ICONS)) {
    assert.equal(rows.length, 16, name);
    for (const r of rows) assert.match(r, /^[.#]{16}$/, name);
    const lit = rows.join('').split('#').length - 1;
    // (each run is M x y h<n> v1 ...: the runs' widths add up to the lit pixels)
    const runs = [...tcIconPath(rows).matchAll(/M\d+ \d+h(\d+)/g)].reduce((a, m) => a + +m[1], 0);
    assert.equal(runs, lit, name);
  }
});
