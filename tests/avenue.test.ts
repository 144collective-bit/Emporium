// The Trenches' three places (avenue.ts): Club PULSE, The Rusty Nail and Trench Arms on the riverside's lots
// (riverside.ts), facing north across the bank avenue to the boardwalk and the river, under the Emporium, each door
// and prompt on its front; the club the riverside's landmark, four times what it was, its queue on its forecourt
// behind the rope; everything solid in SOLIDS, off the streets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMS, AVENUE_DOORS, AVENUE_PLACES, AVENUE_SOLIDS, AVENUE_SPAWNS, BAR, CLUB, FORECOURT } from '../src/scripts/city3d/avenue';
import { EMPORIUM_ROOF, rows } from '../src/scripts/city3d/projects';
import { BANK, TRENCH_BLOCKS } from '../src/scripts/city3d/trenches';
import { RIVERSIDE } from '../src/scripts/city3d/riverside';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { overlaps } from '../src/scripts/city3d/commons';
import type { Rect } from '../src/scripts/city3d/downtown';

const within = (r: Rect, b: Rect) => r[0] >= b[0] - 1e-6 && r[1] >= b[1] - 1e-6 && r[2] <= b[2] + 1e-6 && r[3] <= b[3] + 1e-6;
const inside = (x: number, z: number, b: Rect, m = 0) => x > b[0] + m && x < b[2] - m && z > b[1] + m && z < b[3] - m;
const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
const box = (s: number[]): Rect => [s[0], s[1], s[2], s[3]];
const blockRect = (id: string): Rect => {
  const b = TRENCH_BLOCKS.find((t) => t.id === id)!;
  return [Math.min(...b.poly.map((p) => p[0])), Math.min(...b.poly.map((p) => p[1])), Math.max(...b.poly.map((p) => p[0])), Math.max(...b.poly.map((p) => p[1]))];
};

test('three places on the riverside, each on its block, fronting the bank avenue, clear of each other and the rows', () => {
  assert.deepEqual(
    AVENUE_PLACES.map((p) => p.id),
    ['club', 'bar', 'arms']
  );
  for (const p of AVENUE_PLACES) {
    const blk = TRENCH_BLOCKS.find((b) => b.id === p.block)!;
    assert.equal(blk.row, 'A');
    const br = blockRect(p.block);
    assert.ok(within(p.lot, br), `${p.id} on its block`);
    // Fronting the bank avenue, the river beyond it
    assert.ok(Math.abs(p.lot[1] - br[1]) < 1e-6 && p.lot[1] - BANK.c < 6);
    for (const o of AVENUE_PLACES) if (o !== p) assert.ok(!overlaps(o.lot, p.lot));
    for (const r of RIVERSIDE) assert.ok(!overlaps(r.lot, p.lot), `${p.id} on ${r.id}`);
    for (const l of rows().lots) assert.ok(!overlaps(l.box, p.lot), `${p.id} on a row lot`);
  }
  // Trench Arms and The Rusty Nail on their blocks' corners by the cross streets
  for (const p of [BAR, ARMS]) assert.ok(Math.abs(p.lot[2] - blockRect(p.block)[2]) < 1e-6);
});

test('the buildings: on their lots, under the Emporium, the club four times what it was; doors on their fronts', () => {
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
  // (the club it was: 12.2 x 6)
  assert.ok(area(CLUB.body) >= 4 * 12.2 * 6, 'four times the club it was');
  assert.ok(CLUB.h > BAR.h && CLUB.fly.h > CLUB.h && CLUB.pylon.h > CLUB.fly.h);
  assert.ok(CLUB.pylon.top <= EMPORIUM_ROOF - 0.5, 'its mast under the Emporium');
  assert.ok(within(CLUB.pylon.rect, CLUB.lot) && within(CLUB.fly.rect, CLUB.body));
  // The pylon on the corner by the cross street, the club's west edge on the block's
  assert.ok(Math.abs(CLUB.lot[0] - blockRect(CLUB.block)[0]) < 1e-6 && CLUB.pylon.rect[0] - CLUB.lot[0] < 0.5);
  assert.ok(CLUB.blade.x === CLUB.pylon.rect[0] && CLUB.blade.h < CLUB.pylon.h);
});

test("the club's front and roof: fins, the marquee, the carpet, the sky deck behind its rail, the searchlights", () => {
  const out = (z: number) => CLUB.wall - z;
  assert.ok(CLUB.fins.length >= 10);
  for (const x of CLUB.fins) assert.ok(x > CLUB.pylon.rect[2] && x < CLUB.body[2]);
  assert.ok(Math.abs(CLUB.fins[0] - CLUB.door.x) > 0 && CLUB.fins.every((x, i) => i === 0 || x > CLUB.fins[i - 1]));
  const m = CLUB.marquee;
  assert.ok(m.x0 < CLUB.door.x && m.x1 > CLUB.door.x && out(m.z) > 0 && out(m.z) <= out(CLUB.street) && m.y > 2.2 && m.y < CLUB.h);
  assert.ok(CLUB.carpet[0] < CLUB.door.x && CLUB.carpet[2] > CLUB.door.x && CLUB.carpet[1] === CLUB.street && CLUB.carpet[3] === CLUB.wall);
  const d = CLUB.deck;
  assert.ok(within(d.rect, CLUB.body) && d.rect[3] <= CLUB.fly.rect[1], 'the deck in front of the fly tower');
  assert.ok(within(d.booth, d.rect));
  assert.ok(d.people.length >= 6);
  for (const q of d.people) assert.ok(inside(q.x, q.z, d.rect) && !inside(q.x, q.z, d.booth, -0.3), 'dancing on the deck, not in the booth');
  assert.equal(CLUB.searchlights.length, 2);
  for (const [x, z] of CLUB.searchlights) assert.ok(inside(x, z, CLUB.body));
});

test("the club's forecourt: the rope, the queue behind it, the bouncers at the door", () => {
  const out = (z: number) => CLUB.wall - z;
  assert.ok(out(CLUB.street) >= FORECOURT - 1e-6);
  assert.ok(out(CLUB.rope.z) > 0.9 && out(CLUB.rope.z) < out(CLUB.street) - 0.5);
  const posts = CLUB.rope.posts;
  assert.ok(posts.length >= 6 && posts[0] > CLUB.pylon.rect[2] && posts[posts.length - 1] < CLUB.door.x - 1);
  assert.ok(CLUB.queue.length >= 8);
  for (const q of CLUB.queue) {
    assert.ok(out(q.z) > 0.3 && out(q.z) < out(CLUB.rope.z) - 0.3 && q.x > CLUB.pylon.rect[2] && q.x < CLUB.door.x - 1, 'between the wall and the rope');
    for (const s of SOLIDS) assert.ok(!inside(q.x, q.z, box(s), -0.2), `in the queue, ${s.join()}`);
  }
  assert.equal(CLUB.bouncers.length, 2);
  for (const b of CLUB.bouncers) {
    assert.ok(Math.abs(b.x - CLUB.door.x) < 2 && out(b.z) > 0 && out(b.z) < out(CLUB.rope.z));
    assert.ok(Math.abs(b.yaw - Math.PI) < 1e-9, 'facing the street');
  }
  // The way in stays open: the door, past the rope's end
  assert.ok(CLUB.door.x - CLUB.door.w / 2 > posts[posts.length - 1] + 0.5);
});

test("Trench Arms' hatch and counter on its front; the club's and bar's doors; Walk in and the map", () => {
  assert.ok(ARMS.hatch.x0 > ARMS.body[0] && ARMS.hatch.x1 < ARMS.body[2]);
  // (facing north, its right seen from the street is west)
  assert.ok(ARMS.hatch.x1 < ARMS.door.x - ARMS.door.w / 2, 'beside the door');
  assert.ok(ARMS.counter.z < ARMS.street && ARMS.counter.x > ARMS.hatch.x0 && ARMS.counter.x < ARMS.hatch.x1);
  assert.ok(Math.hypot(ARMS.counter.x - ARMS.spot.x, ARMS.counter.z - ARMS.spot.z) > 1.2, 'the door and the hatch far enough apart');
  assert.deepEqual(
    AVENUE_DOORS.map((d) => d.id),
    ['club', 'bar']
  );
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
    assert.ok(s[4] <= EMPORIUM_ROOF - 0.5);
    for (const p of [
      [s[0], s[1]],
      [s[2], s[3]],
    ] as [number, number][])
      for (const r of roads) assert.ok(distToStreet(r, p) > r.half - 1e-6, `${s.join()} on ${r.id}`);
    for (const o of SOLIDS) if (!AVENUE_SOLIDS.includes(o)) assert.ok(!overlaps(box(s), box(o)), `${s.join()} in ${o.join()}`);
  }
});
