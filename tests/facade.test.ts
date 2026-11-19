import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BALCONY_DOOR, CELL_W, COLS, END_MIN, LINTEL, PANES, PX, REACH, baysOf, styleOf, windowsOf, type FacadeStyle } from '../src/scripts/city3d/facade';
import { FLOOR, INFILL, bodyOf } from '../src/scripts/city3d/downtown';
import { WINDOW_TYPE } from '../src/scripts/city3d/windows';

const STYLES: FacadeStyle[] = ['sash', 'pair', 'casement', 'arched', 'shuttered', 'balcony', 'steel', 'ribbon'];
const widths = Array.from({ length: 90 }, (_, i) => 1.6 + i * 0.07);

test('wall kinds: the masonry ones have modelled windows, the glass has none', () => {
  assert.equal(styleOf('brick'), 'sash');
  assert.equal(styleOf('brickTan'), 'pair');
  assert.equal(styleOf('brickDark'), 'casement');
  assert.equal(styleOf('stuccoPink'), 'shuttered');
  assert.equal(styleOf('brownstone'), 'arched');
  assert.equal(styleOf('industrial'), 'steel');
  assert.equal(styleOf('hotel'), 'balcony');
  assert.equal(styleOf('panel'), 'ribbon');
  assert.equal(styleOf('glassBlue'), null);
  // (every window type the atlas paints, but the curtain walls', has its opening here)
  for (const type of new Set(Object.values(WINDOW_TYPE))) if (type !== 'curtain') assert.ok(PANES[type], type);
});

test('a pane sits inside its cell with room for its frame, a pixel a 64th of a tile', () => {
  assert.equal(PX, 1 / 64);
  assert.equal(FLOOR / 64, PX);
  for (const p of [...Object.values(PANES), BALCONY_DOOR]) {
    assert.ok(p.x >= 4 && p.x + p.w <= 48 * p.span - 4, 'across');
    if (p.post) assert.ok(p.post[0] > 0 && p.post[0] + p.post[1] < p.w, 'the post inside the opening');
    assert.ok(p.y >= 4 && p.y + p.h <= 64, 'up');
  }
});

test('bays: whole ones, centred, a plain end each side, the first on an atlas cell', () => {
  for (const style of STYLES)
    for (const w of widths)
      for (let col = 0; col < COLS; col++) {
        const b = baysOf(w, style, col);
        assert.ok(b.n >= 0 && Number.isInteger(b.n));
        assert.ok(Math.abs(b.s0 * 2 + b.n * b.bw - w) < 1e-9 || style === 'balcony', `${style} ${w}: the bays and both ends make the front`);
        if (style === 'balcony') {
          assert.equal(b.s0, 0);
          assert.ok(b.n * b.bw <= w + 1e-6);
          continue;
        }
        if (b.n > 0) assert.ok(b.s0 >= END_MIN - 1e-9 && b.s0 < b.bw / 2 + END_MIN + 1e-9, `${style} ${w}: the end ${b.s0}`);
        // The atlas column under bay 0's left edge is a whole one (an even one where a window spans two)
        const cell = (b.start * COLS * CELL_W + b.s0) / CELL_W;
        assert.ok(Math.abs(cell - Math.round(cell)) < 1e-9, `${style} ${w}: bay 0 on a cell`);
        assert.equal(((Math.round(cell) % PANES[style].span) + PANES[style].span) % PANES[style].span, 0);
      }
});

test('windows: on the wall between the corner piers, apart from each other, nothing above the clip', () => {
  for (const style of STYLES)
    for (const w of widths) {
      const b = baysOf(w, style, 3);
      for (const floors of [1, 2, 5]) {
        for (const clip of [floors + 0.01, floors - 0.44]) {
          const wins = windowsOf(b, style, floors, clip);
          assert.ok(wins.length <= floors * b.n);
          for (const win of wins) {
            assert.ok(win.u0 - REACH[style] >= b.s0 - 1e-9 && win.u1 + REACH[style] <= w - b.s0 + 1e-9, `${style} ${w}: inside the piers`);
            assert.ok(win.y0 >= win.floor * FLOOR - 1e-9 && win.y1 <= clip + 1e-9 && win.y1 - win.y0 >= 0.2);
            if (win.head) assert.ok(win.y1 + LINTEL <= clip + 1e-9);
            assert.equal(win.door, style === 'balcony' && win.bay % 2 === 0);
            if (style === 'pair') assert.ok(win.post && win.post[0] > win.u0 && win.post[1] < win.u1, 'a post between the pair');
          }
          for (const a of wins) for (const c of wins) if (a !== c && a.floor === c.floor) assert.ok(a.u1 + REACH[style] <= c.u0 - REACH[style] + 1e-9 || c.u1 < a.u0, `${style}: neighbours apart`);
        }
      }
    }
});

test('a bay window standing in front takes the windows behind it', () => {
  const b = baysOf(4.2, 'arched', 0);
  const all = windowsOf(b, 'arched', 3, 3.01);
  const cut = windowsOf(b, 'arched', 3, 3.01, [2.3, 3.6]);
  assert.ok(cut.length < all.length);
  for (const win of cut) assert.ok(win.u1 + REACH.arched <= 2.3 || win.u0 - REACH.arched >= 3.6);
});

test("downtown's own fronts: every building with floors gets at least one bay", () => {
  for (const f of INFILL) {
    if (f.floors < 1 || f.type === 'diner' || f.type === 'office') continue;
    const [x0, z0, x1, z1] = bodyOf(f);
    const w = f.face === 'n' || f.face === 's' ? x1 - x0 : z1 - z0;
    const style: FacadeStyle = f.type === 'loft' ? 'steel' : f.type === 'hotel' ? 'balcony' : 'sash';
    assert.ok(baysOf(w, style, 0).n >= 1, `${f.type} ${w.toFixed(2)} wide`);
  }
});
