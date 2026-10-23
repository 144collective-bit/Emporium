// Trench Avenue's places (avenue.ts, the grit's step 3): Club PULSE, The Rusty Nail and Trench Arms on row A's
// lots, turned round with their blocks to face north across the bank avenue to the river (projects.ts TURNED), each
// on its own lots (out of the rows), under the Emporium, its door and prompt on its front, the club's queue on its
// forecourt behind the rope; everything solid in SOLIDS, off the streets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMS, AVENUE_DOORS, AVENUE_PLACES, AVENUE_SOLIDS, AVENUE_SPAWNS, BAR, CLUB, FORECOURT } from '../src/scripts/city3d/avenue';
import { AVENUE_LOTS, CORNER_SHOPS, EMPORIUM_ROOF, PROJECT_SOLIDS, TURNED, isAvenue, isCorner, rows } from '../src/scripts/city3d/projects';
import { BANK, TRENCH_BLOCKS } from '../src/scripts/city3d/trenches';
import { STATIONS } from '../src/scripts/city3d/metro';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { shuttered } from '../src/scripts/city3d/grit';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { overlaps } from '../src/scripts/city3d/commons';
import type { Rect } from '../src/scripts/city3d/downtown';

const within = (r: Rect, b: Rect) => r[0] >= b[0] - 1e-6 && r[1] >= b[1] - 1e-6 && r[2] <= b[2] + 1e-6 && r[3] <= b[3] + 1e-6;
const inside = (x: number, z: number, b: Rect, m = 0) => x > b[0] + m && x < b[2] - m && z > b[1] + m && z < b[3] - m;
const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
const box = (s: number[]): Rect => [s[0], s[1], s[2], s[3]];

test('three places on row A, facing the river, each on its own row lots, out of the rows', () => {
  assert.deepEqual(AVENUE_LOTS.map((a) => a.id), ['club', 'bar', 'arms']);
  assert.deepEqual(AVENUE_LOTS.map((a) => a.lots.length), [5, 2, 2]);
  const { lots } = rows();
  for (const a of AVENUE_LOTS) {
    const blk = TRENCH_BLOCKS.find((b) => b.id === a.block)!;
    assert.equal(blk.row, 'A', 'on the avenue\'s north side');
    assert.ok(TURNED.includes(a.block), 'on a turned block');
    for (const l of a.lots) {
      assert.ok(lots.includes(l) && isAvenue(l) && !isCorner(l));
      assert.ok(within(l.box, a.rect));
      // Out of the rows' solids and the shuttered shops
      for (const s of l.solids) assert.ok(!PROJECT_SOLIDS.includes(s));
      assert.ok(!shuttered(l));
    }
    // Fronting the bank avenue, the river beyond it
    assert.ok(Math.abs(a.rect[1] - Math.min(...blk.poly.map((p) => p[1]))) < 1e-6);
    assert.ok(a.rect[1] - BANK.c < 6);
    for (const o of AVENUE_LOTS) if (o !== a) assert.ok(!overlaps(o.rect, a.rect));
    for (const c of CORNER_SHOPS) assert.ok(!overlaps(c.lot.box, a.rect), `${a.id} on ${c.name}`);
  }
  // No row lot is left half under one
  for (const l of lots) if (!isAvenue(l)) for (const a of AVENUE_LOTS) assert.ok(!overlaps(l.box, a.rect), `a row lot under ${a.id}`);
});

test('the buildings: on their lots, under the Emporium, the club biggest; doors on their fronts', () => {
  for (const p of AVENUE_PLACES) {
    assert.ok(within(p.body, p.lot), `${p.id} on its lot`);
    assert.ok(p.h > 3 && p.h < EMPORIUM_ROOF - 0.5);
    assert.equal(p.face, 'n', 'facing the river');
    assert.equal(p.out, -1);
    assert.equal(p.wall, p.body[1]);
    assert.equal(p.street, p.lot[1]);
    assert.equal(p.door.z, p.wall, 'the door in the front wall');
    assert.ok(p.door.x - p.door.w / 2 > p.body[0] && p.door.x + p.door.w / 2 < p.body[2]);
    assert.ok(p.spot.z < p.wall && Math.abs(p.spot.x - p.door.x) < 1e-6, 'the prompt in front of the door');
    for (const s of SOLIDS) if (s[4] > 0.3) assert.ok(!inside(p.spot.x, p.spot.z, box(s), -0.3), `${p.id}'s door spot in ${s.join()}`);
  }
  const area = (r: Rect) => (r[2] - r[0]) * (r[3] - r[1]);
  assert.ok(area(CLUB.body) > 2 * Math.max(area(BAR.body), area(ARMS.body)), 'the club is the big one');
  assert.ok(CLUB.h > BAR.h && CLUB.blade.h < EMPORIUM_ROOF - 0.5);
  // Club PULSE on the corner (the cross street on its west side), Trench Arms on the block across from the station
  const blk = TRENCH_BLOCKS.find((b) => b.id === CLUB.block)!;
  assert.ok(Math.abs(CLUB.lot[0] - Math.min(...blk.poly.map((p) => p[0]))) < 1e-6);
  const station = STATIONS.find((s) => s.id === 'trenches')!;
  assert.ok(Math.abs((ARMS.body[0] + ARMS.body[2]) / 2 - station.door.x) < 6, 'the station behind it');
  // The bar next door to Block Bodega
  const bodega = CORNER_SHOPS.find((c) => c.id === 'c0')!;
  assert.ok(Math.abs(BAR.lot[2] - bodega.lot.box[0]) < 1e-6);
});

test("the club's forecourt: the rope, the queue behind it, the bouncer at the door, the marquee overhead", () => {
  const bx0 = CLUB.body[0];
  // (out of the front is -z: depths out from the wall)
  const out = (z: number) => CLUB.wall - z;
  assert.ok(out(CLUB.street) >= FORECOURT - 1e-6);
  assert.ok(out(CLUB.rope.z) > 0.9 && out(CLUB.rope.z) < out(CLUB.street) - 0.5);
  assert.ok(CLUB.rope.posts.length >= 4 && CLUB.rope.posts[0] > bx0 && CLUB.rope.posts[CLUB.rope.posts.length - 1] < CLUB.door.x - 1);
  assert.ok(CLUB.queue.length >= 6);
  for (const q of CLUB.queue) {
    assert.ok(out(q.z) > 0.3 && out(q.z) < out(CLUB.rope.z) - 0.3 && q.x > bx0 + 0.3 && q.x < CLUB.door.x - 1, 'between the wall and the rope');
    for (const s of SOLIDS) assert.ok(!inside(q.x, q.z, box(s), -0.2), `in the queue, ${s.join()}`);
  }
  const b = CLUB.bouncer;
  assert.ok(Math.abs(b.x - CLUB.door.x) < 1.5 && out(b.z) > 0 && out(b.z) < out(CLUB.rope.z));
  assert.ok(Math.abs(b.yaw - Math.PI) < 1e-9, 'the bouncer facing the street');
  // The way in stays open: the door, past the rope's end
  assert.ok(CLUB.door.x - CLUB.door.w / 2 > CLUB.rope.posts[CLUB.rope.posts.length - 1] + 0.5);
  const m = CLUB.marquee;
  assert.ok(m.x0 < CLUB.door.x && m.x1 > CLUB.door.x && out(m.z) > 0 && out(m.z) <= out(CLUB.street) && m.y > 2.2 && m.y < CLUB.h);
  assert.ok(CLUB.blade.x === bx0 && CLUB.blade.z === CLUB.wall, 'the vertical sign on its corner');
});

test("Trench Arms' hatch and counter on its front; the club's and bar's doors; Walk in and the map", () => {
  assert.ok(ARMS.hatch.x0 > ARMS.body[0] && ARMS.hatch.x1 < ARMS.body[2]);
  // (facing north, its right seen from the street is west)
  assert.ok(ARMS.hatch.x1 < ARMS.door.x - ARMS.door.w / 2, 'beside the door');
  assert.ok(ARMS.counter.z < ARMS.street && ARMS.counter.x > ARMS.hatch.x0 && ARMS.counter.x < ARMS.hatch.x1);
  assert.ok(Math.hypot(ARMS.counter.x - ARMS.spot.x, ARMS.counter.z - ARMS.spot.z) > 1.2, 'the door and the hatch far enough apart');
  assert.deepEqual(AVENUE_DOORS.map((d) => d.id), ['club', 'bar']);
  for (const id of ['club', 'bar', 'arms'] as const) {
    const at = AVENUE_SPAWNS[id];
    for (const s of SOLIDS) if (s[4] > 0.3) assert.ok(!inside(at.x, at.z, box(s), -0.35), `${id}'s spawn in ${s.join()}`);
    // On the sidewalk, facing the place (south: walk.ts's yaw π)
    assert.ok(at.z < AVENUE_PLACES.find((p) => p.id === id)!.street && Math.abs(at.yaw - Math.PI) < 1e-9);
    const pl = PLACES.find((p) => p.id === id)!;
    assert.equal(pl.spot, id);
    assert.deepEqual(pl.at, at);
  }
});

test("what's solid is in SOLIDS, off the streets", () => {
  for (const s of AVENUE_SOLIDS) {
    assert.ok(SOLIDS.includes(s) && s[0] < s[2] && s[1] < s[3]);
    for (const p of [
      [s[0], s[1]],
      [s[2], s[3]],
    ] as [number, number][])
      for (const r of roads) assert.ok(distToStreet(r, p) > r.half - 1e-6, `${s.join()} on ${r.id}`);
    for (const o of SOLIDS) if (!AVENUE_SOLIDS.includes(o)) assert.ok(!overlaps(box(s), box(o)), `${s.join()} in ${o.join()}`);
  }
});
