// Rooms behind the glass (docs/buildings-plan.md Phase 4, rooms.ts): only a bare window has a room, its light the
// painted window's own; a window's size and code ride in its uv and come back exact anywhere across it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CODE_STEP, DAY_BIT, ROOM_LIGHTS, packRoomUv, roomCode, unpackRoomUv } from '../src/scripts/city3d/rooms';
import { paneAt } from '../src/scripts/city3d/windows';

test('a room only behind a bare window, with its light (and by day too if the paint is lit by day)', () => {
  assert.equal(roomCode({ dressing: 'blind', night: 'warm', day: false }), null);
  assert.equal(roomCode({ dressing: 'curtains', night: null, day: false }), null);
  assert.equal(roomCode({ dressing: 'bare', night: null, day: false }), 0);
  for (const [i, l] of ROOM_LIGHTS.entries()) assert.equal(roomCode({ dressing: 'bare', night: l, day: false }), i + 1);
  assert.equal(roomCode({ dressing: 'bare', night: 'warm', day: true }), 1 + DAY_BIT);
  // Over a band's windows: about a third bare, some of those lit
  const panes = Array.from({ length: 4 }, (_, row) => Array.from({ length: 8 }, (_, col) => paneAt(61, row, col))).flat();
  const rooms = panes.map(roomCode).filter((c) => c !== null) as number[];
  assert.ok(rooms.length > 3 && rooms.length < panes.length * 0.6, `${rooms.length} rooms of ${panes.length}`);
  assert.ok(rooms.some((c) => c % DAY_BIT > 0), 'some lit at night');
});

test("a window's size and code come back from its uv anywhere across it", () => {
  for (const [w, h, code] of [
    [0.54, 0.56, 0],
    [1.2, 0.66, 4],
    [0.3, 1.6, 1 + DAY_BIT],
    [0.75, 0.85, 12],
  ] as const) {
    assert.ok(h * 100 < CODE_STEP);
    for (const fx of [0, 0.25, 0.999, 1])
      for (const fy of [0, 0.5, 0.999, 1]) {
        const [u, v] = packRoomUv(fx, fy, w, h, code);
        // (as a float32 attribute, the way the GPU gets it)
        const r = unpackRoomUv(Math.fround(u), Math.fround(v));
        assert.ok(Math.abs(r.fx - fx) < 1e-3 && Math.abs(r.fy - fy) < 1e-3, `${w} ${h} ${code} at ${fx}, ${fy}`);
        assert.ok(Math.abs(r.w - w) < 0.006 && Math.abs(r.h - h) < 0.006);
        assert.equal(r.light, code % DAY_BIT);
        assert.equal(r.day, code >= DAY_BIT);
      }
  }
});
