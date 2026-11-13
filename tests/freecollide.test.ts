// City view's free camera bumps into the city (freecollide.ts, the owner's call: the walk camera's solids, sliding
// along the faces, every move): it stops at a face and slides along it, never tunnels, flies under decks, and a camera
// already inside a box can leave it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAM_R, bump, sweep } from '../src/scripts/city3d/freecollide';
import { CAMERA_GRID, type Box } from '../src/scripts/city3d/solids';
import type { V3 } from '../src/scripts/city3d/freecam';

const near = (a: number, b: number, e = 1e-9) => Math.abs(a - b) < e;
// a block 10 across, 20 tall, at x 0..10, z 0..10
const BLOCK: Box = [0, 0, 10, 10, 20];

test('it stops at a face, its room off it', () => {
  const p = sweep([-5, 5, 5], [5, 5, 5], [BLOCK]);
  assert.ok(near(p[0], -CAM_R) && p[1] === 5 && p[2] === 5);
  // from the other side, and from above onto the roof
  assert.ok(near(sweep([15, 5, 5], [5, 5, 5], [BLOCK])[0], 10 + CAM_R));
  assert.ok(near(sweep([5, 30, 5], [5, 10, 5], [BLOCK])[1], 20 + CAM_R));
});

test('it slides along a face and round a corner', () => {
  // into the face at a slant: x stops, z goes on
  const p = sweep([-3, 5, 2], [3, 5, 6], [BLOCK]);
  assert.ok(near(p[0], -CAM_R) && p[2] === 6, `${p}`);
  // along the face past the corner: free again
  const q = sweep([-CAM_R, 5, 8], [-CAM_R, 5, 14], [BLOCK]);
  assert.deepEqual(q, [-CAM_R, 5, 14]);
  // pressed against the face, moving away from it is free
  assert.deepEqual(sweep([-CAM_R, 5, 5], [-4, 5, 5], [BLOCK]), [-4, 5, 5]);
  // over the roof, it passes
  assert.deepEqual(sweep([-5, 25, 5], [15, 25, 5], [BLOCK]), [15, 25, 5]);
});

test('nothing tunnels, however long the move', () => {
  const thin: Box = [0, 0, 0.2, 10, 20];
  const p = sweep([-50, 5, 5], [500, 5, 5], [thin]);
  assert.ok(p[0] < 0, `${p}`);
  // two in a row: the first one stops it
  assert.ok(sweep([-5, 5, 5], [100, 5, 5], [[20, 0, 30, 10, 20], BLOCK])[0] < 0);
});

test('under a deck it flies, into its underside it stops', () => {
  // a deck from y 6 to 7 (a bottom: b[5])
  const deck = [0, 0, 10, 10, 7, 6] as unknown as Box;
  assert.deepEqual(sweep([-5, 3, 5], [15, 3, 5], [deck]), [15, 3, 5], 'under it');
  assert.ok(near(sweep([5, 3, 5], [5, 9, 5], [deck])[1], 6 - CAM_R), 'up into it');
  assert.ok(near(sweep([-5, 6.5, 5], [5, 6.5, 5], [deck])[0], -CAM_R), 'level with it');
});

test('a camera inside a box is free to leave it', () => {
  assert.deepEqual(sweep([5, 5, 5], [-5, 5, 5], [BLOCK]), [-5, 5, 5]);
  assert.deepEqual(sweep([5, 5, 5], [5, 30, 5], [BLOCK]), [5, 30, 5]);
});

test("the city's own buildings stop it (the walk camera's solids)", () => {
  // A tall box of the grid: flown at from outside, half way up, it stops at the face
  const b = CAMERA_GRID.boxes.find((x) => x[4] > 8 && x[2] - x[0] > 4 && x[3] - x[1] > 4 && (x as unknown as number[])[5] === undefined)!;
  assert.ok(b, 'a building');
  const z = (b[1] + b[3]) / 2;
  const y = b[4] / 2;
  const from: V3 = [b[0] - 20, y, z];
  // (clear of anything else in the way first)
  const p = bump(from, [b[2] + 20, y, z]);
  assert.ok(p[0] <= b[0] - CAM_R + 1e-9, `stopped at ${p[0]}, its face at ${b[0]}`);
  // standing still is no move
  assert.deepEqual(bump(from, from), from);
  // high over everything, it passes
  const over: V3 = [b[0] - 20, 400, z];
  assert.deepEqual(bump(over, [b[2] + 20, 400, z]), [b[2] + 20, 400, z]);
});
