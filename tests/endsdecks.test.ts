// Endswood's decks walked on (endsdecks.ts, docs/estate-plan.md Phase 5): Fennel House's galleries, the street in
// the sky over the spine and Harrier Point's bridges are ground by Degen's height, with room over his head; their
// parapets, end walls and faces stop him up there; the ground under them stays the ground; the lifts' doors and where
// they let you out are on their floors, and every ride comes back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENDS_CAMERA, ENDS_FLOORS, ENDS_LIFTS, endsDeckWall, endsDeckY, endsLiftDoors, endsLiftRide, upOnEnds } from '../src/scripts/city3d/endsdecks';
import { BLOCKS, DECK, OPENING, WALK_H, deckRect, finSpans, topOf } from '../src/scripts/city3d/endsblocks';
import { SLAB_Y } from '../src/scripts/city3d/endswood';
import { SOLIDS } from '../src/scripts/city3d/solids';

/** Degen's height (1.3 at scale 1, walk.ts SCALE 0.85) and his radius (walk.ts RADIUS) */
const DEGEN = 1.3 * 0.85;
const R = 0.22;
const fw = BLOCKS.find((b) => b.id === 'fennel-w')!;
const fe = BLOCKS.find((b) => b.id === 'fennel-e')!;
const tower = BLOCKS.find((b) => b.kind === 'tower')!;

test("Fennel House's galleries, the street in the sky and Harrier Point's bridges are walked on, with room over his head", () => {
  // (four galleries a half, the bridge over the spine, three of Harrier Point's)
  assert.equal(ENDS_FLOORS.length, 4 + 4 + 1 + 3);
  for (const f of ENDS_FLOORS) {
    // (nothing over a floor lower than his head but its own roof, well clear of it)
    for (const c of ENDS_CAMERA) {
      const over = c[5] > f.y + 0.01 && c[0] < f.walk[2] && c[2] > f.walk[0] && c[1] < f.walk[3] && c[3] > f.walk[1];
      if (over) assert.ok(c[5] - f.y >= DEGEN + 0.3, `${f.id}: ${(c[5] - f.y).toFixed(2)} overhead`);
    }
  }
  assert.ok(WALK_H >= DEGEN + 0.3 && OPENING >= DEGEN + 0.3);
  // (a walked gallery's cross walls open at each gallery: you walk through them)
  for (const b of [fw, fe])
    for (const d of b.decks) {
      assert.ok(d.walk);
      const fins = finSpans(b, d);
      for (const f of fins.slice(1, -1)) for (const y of d.ys) assert.ok(f.spans.every(([y0, y1]) => y1 <= y + 1e-9 || y0 >= y + OPENING - 1e-9), `a cross wall across ${b.id}'s gallery at ${y}`);
    }
});

test('he walks the length of Fennel House over the spine on its third floor, and off nowhere', () => {
  const y = topOf(2);
  const z = (deckRect(fw, fw.decks[0])[1] + deckRect(fw, fw.decks[0])[3]) / 2;
  for (let x = fw.shells[0].rect[0] + 0.4; x <= fe.shells[0].rect[2] - 0.4; x += 0.1) {
    assert.equal(endsDeckY(x, z, y), y, `off the floor at ${x.toFixed(1)}`);
    assert.ok(upOnEnds(x, z, y));
    assert.ok(!endsDeckWall(x, z, y, R), `a wall at ${x.toFixed(1)}`);
  }
  // The parapet stops him, and the face behind him; the gallery's far ends are shut
  const [x0, z0, x1, z1] = deckRect(fw, fw.decks[0]);
  assert.ok(endsDeckWall(-80, z1 - 0.1, y, R));
  assert.ok(endsDeckWall(-80, z0 + 0.1, y, R));
  assert.ok(endsDeckWall(x0 + 0.1, z, y, R));
  assert.ok(endsDeckWall(deckRect(fe, fe.decks[0])[2] - 0.1, z, y, R));
  // On the other galleries the ends where the bridge meets the third floor are shut
  assert.ok(endsDeckWall(x1 - 0.1, z, topOf(4), R), "the fifth floor's end over the spine");
  // (walking off the end of a bridge into the air never happens: the bridge's own parapets)
  const br = fw.bridges[0];
  assert.ok(endsDeckWall(-56, br.rect[1] + 0.05, y, R) && endsDeckWall(-56, br.rect[3] - 0.05, y, R));
});

test('the ground under them stays the ground: not from it, not jumping, not under a floor', () => {
  for (const f of ENDS_FLOORS) {
    const [cx, cz] = [(f.walk[0] + f.walk[2]) / 2, (f.walk[1] + f.walk[3]) / 2];
    assert.equal(endsDeckY(cx, cz, SLAB_Y), null);
    // (a standing jump, walk.ts: about 0.66 up)
    assert.equal(endsDeckY(cx, cz, SLAB_Y + 0.75), null);
    assert.ok(!upOnEnds(cx, cz, SLAB_Y + 0.75));
    // (on a gallery, the one he's on, not the one over him)
    assert.equal(endsDeckY(cx, cz, f.y + 0.3), f.y);
  }
  // Every gallery's slab, the walked ones' lintels and the bridges' floors and roofs are the camera's, each with a bottom
  for (const c of ENDS_CAMERA) assert.ok(c[4] > c[5]);
  for (const b of BLOCKS) for (const d of b.decks) assert.ok(d.ys.every((y) => ENDS_CAMERA.some((c) => Math.abs(c[4] - y) < 1e-9 && Math.abs(c[5] - (y - DECK.slab)) < 1e-9)));
});

test("the lifts: a door at every stop, where they let you out on its floor, every ride there and back", () => {
  assert.equal(ENDS_LIFTS.length, 4 + 1);
  for (const l of ENDS_LIFTS) {
    assert.ok(l.stops.length >= 4, l.id);
    l.stops.forEach((s, si) => {
      if (si === 0) {
        // (the ground floor's: by the entrance, outside everything solid)
        for (const p of [s.up!, s.out]) assert.ok(!SOLIDS.some((o) => p.x > o[0] - R && p.x < o[2] + R && p.z > o[1] - R && p.z < o[3] + R), `${l.id}'s ground door in something`);
        assert.equal(s.out.y, SLAB_Y);
        assert.ok(!s.down);
      } else {
        for (const p of [s.up, s.down, s.out]) {
          if (!p) continue;
          assert.equal(endsDeckY(p.x, p.z, s.y), s.y, `${l.id} ${s.name}: off its floor`);
          assert.ok(!endsDeckWall(p.x, p.z, s.y, R), `${l.id} ${s.name}: in a wall at ${p.x}, ${p.z}`);
        }
        assert.equal(si === l.stops.length - 1, !s.up);
      }
      // (you step out by its doors: their prompts in reach)
      const doors = [s.up, s.down].filter(Boolean);
      assert.ok(doors.some((d) => Math.hypot(d!.x - s.out.x, d!.z - s.out.z) < 1), `${l.id} ${s.name}: out too far from its door`);
      if (s.up && s.down) assert.ok(Math.hypot(s.up.x - s.down.x, s.up.z - s.down.z) >= 0.75, 'its two doors apart');
    });
  }
  // Every prompt at a stop's height takes you to the next stop and back
  for (const l of ENDS_LIFTS)
    for (const s of l.stops) {
      const doors = endsLiftDoors(s.y).filter((d) => d.id.startsWith(`lift:ends:${ENDS_LIFTS.indexOf(l)}:`));
      assert.equal(doors.length, (s.up ? 1 : 0) + (s.down ? 1 : 0), `${l.id} ${s.name}`);
      for (const d of doors) {
        const go = endsLiftRide(d.id)!;
        assert.ok(go && Math.abs(go.to.y - s.y) > 0.5);
        const there = l.stops.find((t) => t.out === go.to)!;
        const back = endsLiftDoors(there.y).find((b) => b.id.startsWith(`lift:ends:${ENDS_LIFTS.indexOf(l)}:${l.stops.indexOf(there)}:`) && b.id.endsWith(d.id.endsWith('up') ? 'down' : 'up'))!;
        assert.equal(endsLiftRide(back.id)!.to, s.out);
        assert.match(go.arrived, /^(Fennel House|Harrier Point) · (Ground|Floor \d)$/);
      }
    }
  // (Harrier Point's lift reaches its top bridge, Fennel House's the street in the sky)
  assert.equal(ENDS_LIFTS.find((l) => l.id === 'harrier')!.stops.at(-1)!.y, tower.bridges.at(-1)!.y0);
  assert.ok(ENDS_LIFTS.filter((l) => l.id.startsWith('fennel')).every((l) => l.stops.some((s) => s.y === fw.bridges[0].y0)));
});
