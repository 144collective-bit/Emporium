// Where the touch controls stand (touchlayout.ts, docs/controls-plan.md Phases 1 and 2): every mode's buttons
// (on foot, at the wheel, in a kart race, in the ring), the stick, and on foot the hotbar and the door prompt,
// apart from each other and on screen, under the header, on the phones people hold upright and on their side,
// and on tablets; the same slots in every mode; and (Phase 4) at every size, either hand, the size stepping down
// only where it has to.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TC_ICONS, tcIconPath } from '../src/data/tcicons';
import {
  centreOf,
  clash,
  cleanTouch,
  DEFAULT_TOUCH,
  footLayout,
  layoutFor,
  LAYOUTS,
  shapeOf,
  SIZES,
  TOUCH_SIZES,
  arrangeKey,
  arrangementOf,
  familyOf,
  FAMILIES,
  itemsOf,
  moveItem,
  SHOWN,
  type FootMode,
  type Mode,
  type Spot,
} from '../src/scripts/city3d/touchlayout';

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
const ALL: Mode[] = ['fists', 'armed', 'drive', 'kart', 'ring'];
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

test('every mode shares the slots: the main button, the one beside it, the arc', () => {
  for (const [w, h] of SCREENS) {
    const f = layoutFor(w, h, 'fists').buttons;
    const d = layoutFor(w, h, 'drive').buttons;
    const k = layoutFor(w, h, 'kart').buttons;
    const r = layoutFor(w, h, 'ring').buttons;
    // (Gas where Punch is, Brake where Jump is, Dodge where Jump is, the ring's Block and Kick as the street's)
    assert.deepEqual(d.gas, f.punch);
    assert.deepEqual(d.brake, f.jump);
    assert.deepEqual(k.brake, f.jump);
    assert.deepEqual(r.dodge, f.jump);
    assert.deepEqual(r.block, f.block);
    assert.deepEqual(r.kick, f.kick);
    assert.deepEqual(k.drift, d.view);
    assert.equal(d.crouch, undefined, 'no Crouch at the wheel');
    assert.ok(layoutFor(w, h, 'drive').stick.d > layoutFor(w, h, 'fists').stick.d, 'a bigger stick to steer with');
  }
});

test('the buttons and the stick stand apart, on screen and under the header', () => {
  for (const [w, h] of SCREENS)
    for (const mode of ALL) {
      const L = layoutFor(w, h, mode);
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
      const hot: Box = { x0: w - L.hotbar.edge - hw, x1: w - L.hotbar.edge, y0: h - L.hotbar.bottom - s, y1: h - L.hotbar.bottom };
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

test('the touch settings are cleaned: a size from the list, the opacity held in range, left-handed only if true', () => {
  assert.deepEqual(cleanTouch(undefined), DEFAULT_TOUCH);
  assert.deepEqual(cleanTouch({ size: 'huge', alpha: 7, left: 'yes' }), { size: 'medium', alpha: 1, left: false, arrange: {} });
  assert.deepEqual(cleanTouch({ size: 'large', alpha: 0.1, left: true }), { size: 'large', alpha: 0.4, left: true, arrange: {} });
  assert.equal(cleanTouch({ alpha: 0.734 }).alpha, 0.73);
});

test('every size and either hand fits every screen in every mode', () => {
  for (const [w, h] of SCREENS)
    for (const mode of ALL)
      for (const size of TOUCH_SIZES)
        for (const left of [false, true]) {
          const L = layoutFor(w, h, mode, { ...DEFAULT_TOUCH, size, left });
          assert.equal(clash(L, w, h), null, `${size}${left ? ', left-handed' : ''} at ${w}x${h} (${mode})`);
          // (a size only ever steps down towards medium, never past it, and small is always small)
          if (size === 'small') assert.equal(L.scale, SIZES.small);
          else assert.ok(L.scale >= 1 && L.scale <= SIZES[size]);
        }
});

test('large really is larger where there is room, and steps down where there is none', () => {
  const roomy = layoutFor(430, 932 - 34, 'armed', { ...DEFAULT_TOUCH, size: 'large' });
  assert.equal(roomy.scale, SIZES.large);
  assert.ok(roomy.buttons.fire!.d > footLayout(430, 932 - 34, 'armed').buttons.fire!.d);
  const scales = SCREENS.map(([w, h]) => layoutFor(w, h, 'armed', { ...DEFAULT_TOUCH, size: 'large' }).scale);
  assert.ok(scales.every((s) => s >= 1));
});

test('left-handed mirrors every spot, the stick, the hotbar and the prompt', () => {
  for (const [w, h] of SCREENS)
    for (const mode of ALL) {
      const R = layoutFor(w, h, mode);
      const L = layoutFor(w, h, mode, { ...DEFAULT_TOUCH, left: true });
      for (const [a, s] of Object.entries(R.buttons) as [string, Spot][]) {
        const m = L.buttons[a as keyof typeof L.buttons]!;
        const [rx, ry] = centreOf(s, w, h);
        const [lx, ly] = centreOf(m, w, h);
        assert.ok(Math.abs(rx + lx - w) < 0.01 && Math.abs(ry - ly) < 0.01, `${a} mirrored at ${w}x${h}`);
      }
      assert.notEqual(L.stick.side, R.stick.side);
      assert.equal(L.hotbar.side, 'l');
      assert.ok(Math.abs(L.prompt.cx + R.prompt.cx - w) < 0.11);
    }
});

// ---------- Phase 6: moving the buttons ----------
test('an arrangement is cleaned: known keys and items, shares of the screen only', () => {
  const t = cleanTouch({ arrange: { 'foot:up': { main: [0.5, 0.9], a1: [2, 0.5], nope: [0.1, 0.1], stick: 'x' }, 'boat:up': { main: [0.1, 0.1] } } });
  assert.deepEqual(t.arrange, { 'foot:up': { main: [0.5, 0.9] } });
  assert.deepEqual(cleanTouch({ arrange: 'x' }).arrange, {});
});

test('a family holds every slot its modes use, the stick, and on foot Crouch', () => {
  assert.deepEqual(itemsOf('foot'), ['main', 'a1', 'a2', 'a3', 'b1', 'b2', 'crouch', 'stick']);
  assert.deepEqual(itemsOf('wheel'), ['main', 'a1', 'a2', 'a3', 'stick']);
  assert.deepEqual(itemsOf('ring'), ['main', 'a1', 'a2', 'a3', 'b2', 'stick']);
  for (const m of ALL) for (const slot of Object.keys(LAYOUTS[m])) assert.ok(itemsOf(familyOf(m)).includes(slot as never), `${m} ${slot}`);
});

/** Drag `item` by (dx, dy) on the family's shown layout, as the arranging screen does, and keep it */
function arranged(w: number, h: number, f: (typeof FAMILIES)[number], item: Parameters<typeof moveItem>[2], dx: number, dy: number, left = false) {
  const prefs = { ...DEFAULT_TOUCH, left };
  const L = layoutFor(w, h, SHOWN[f], prefs);
  const s = item === 'stick' ? L.stick : L.buttons[item === 'crouch' ? 'crouch' : LAYOUTS[SHOWN[f]][item]!]!;
  const [cx, cy] = centreOf(s, w, h);
  const moved = moveItem(L, SHOWN[f], item, cx + dx, cy + dy, w, h);
  return { L, moved, prefs, cx, cy };
}

test('a button dragged to open ground stays there, in every mode of its family, and in the other hand mirrored', () => {
  const [w, h] = [390, 844 - 34];
  const { moved, prefs, cx, cy } = arranged(w, h, 'foot', 'b2', -80, 0);
  assert.ok(moved, 'Aim moves in');
  const arrange = { [arrangeKey('foot', 'up')]: arrangementOf(moved!, 'foot', w, h, false) };
  for (const mode of ['armed', 'fists'] as Mode[]) {
    const L = layoutFor(w, h, mode, { ...prefs, arrange });
    const b2 = L.buttons[LAYOUTS[mode].b2!]!;
    const [x, y] = centreOf(b2, w, h);
    assert.ok(Math.abs(x - (cx - 80)) < 0.5 && Math.abs(y - cy) < 0.5, `${mode}: ${x},${y}`);
    assert.equal(clash(L, w, h), null);
  }
  // left-handed: the same arrangement, mirrored
  const M = layoutFor(w, h, 'armed', { ...prefs, left: true, arrange });
  const [mx, my] = centreOf(M.buttons.aim!, w, h);
  assert.ok(Math.abs(mx - (w - (cx - 80))) < 0.5 && Math.abs(my - cy) < 0.5);
  // other families and the other shape keep their slots
  assert.deepEqual(layoutFor(w, h, 'drive', { ...prefs, arrange }), layoutFor(w, h, 'drive'));
  assert.deepEqual(layoutFor(h, w > 500 ? w : 375, 'armed', { ...prefs, arrange }).buttons, layoutFor(h, w > 500 ? w : 375, 'armed').buttons);
});

test('a drag that would put a button on another, off screen, under the header or under the hotbar is refused', () => {
  const [w, h] = [375, 812 - 34];
  const L = layoutFor(w, h, 'armed');
  const [jx, jy] = centreOf(L.buttons.jump!, w, h);
  assert.equal(moveItem(L, 'armed', 'main', jx, jy, w, h), null, 'onto Jump');
  assert.equal(moveItem(L, 'armed', 'main', w + 10, h - 40, w, h), null, 'off the edge');
  assert.equal(moveItem(L, 'armed', 'a3', w / 2, 20, w, h), null, 'under the header');
  const hot = L.hotbar;
  assert.equal(moveItem(L, 'armed', 'a3', w - hot.edge - 40, h - hot.bottom - hot.slot / 2, w, h), null, 'under the hotbar');
  // the stick and the wheel's own
  const [sx, sy] = centreOf(L.stick, w, h);
  assert.ok(moveItem(L, 'armed', 'stick', sx + 20, sy, w, h));
  assert.equal(moveItem(L, 'armed', 'stick', sx, sy - 40, w, h), null, 'onto Crouch');
  assert.equal(moveItem(L, 'armed', 'stick', w - 60, h - 72, w, h), null, 'onto Fire');
});

test('an arrangement that no longer fits (a bigger size, a smaller screen) falls back to the slots', () => {
  const [w, h] = [430, 932 - 34];
  const { moved } = arranged(w, h, 'wheel', 'a3', 0, -100);
  assert.ok(moved, 'Horn moves up');
  const arrange = { [arrangeKey('wheel', 'up')]: arrangementOf(moved!, 'wheel', w, h, false) };
  // two buttons saved on one spot can't fit anywhere: the slots come back
  const broken = { [arrangeKey('wheel', 'up')]: { main: [0.8, 0.9], a1: [0.8, 0.9] } as Record<string, [number, number]> };
  assert.deepEqual(layoutFor(w, h, 'drive', { ...DEFAULT_TOUCH, arrange: broken }), layoutFor(w, h, 'drive'));
  for (const [W, H] of SCREENS)
    for (const mode of ALL)
      for (const size of TOUCH_SIZES)
        assert.equal(clash(layoutFor(W, H, mode, { ...DEFAULT_TOUCH, size, arrange }), W, H), null, `${W}x${H} ${mode} ${size}`);
});
