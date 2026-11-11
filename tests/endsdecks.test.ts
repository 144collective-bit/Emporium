// Endswood's decks walked on (endsdecks.ts, docs/estate-plan.md Phase 5): Fennel House's galleries, the street in
// the sky over the spine and Harrier Point's bridges are ground by Degen's height, with room over his head; their
// parapets, end walls and faces stop him up there; the ground under them stays the ground; the lifts' doors and where
// they let you out are on their floors, and every ride comes back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENDS_CAMERA, ENDS_FLOORS, ENDS_LIFTS, endsDeckWall, endsDeckY, endsLiftDoors, endsLiftRide, floorY, upOnEnds } from '../src/scripts/city3d/endsdecks';
import { BLOCKS, BLOCK_SOLIDS, DECK, OPENING, SHAFT, STAIR, STAIRS, TALLEST, WALK_H, deckRect, finSpans, stairSolids, topOf } from '../src/scripts/city3d/endsblocks';
import { ENDS_BLOCKS, ENDS_LAMPS, SLAB_Y } from '../src/scripts/city3d/endswood';
import { ENDS_TREES } from '../src/scripts/city3d/endsstreet';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLAN, distToStreet, inPoly } from '../src/scripts/city3d/streetplan';

/**
 * Degen's height and his radius as they were at 0.85 (1.3 at scale 1; walk.ts RADIUS 0.22): kept, so the headroom
 * and the walkways' widths hold for him even at that size (he's everyone's 0.66 now, skeleton.ts `FIGURE_SCALE`)
 */
const DEGEN = 1.3 * 0.85;
const R = 0.22;
const fw = BLOCKS.find((b) => b.id === 'fennel-w')!;
const fe = BLOCKS.find((b) => b.id === 'fennel-e')!;
const tower = BLOCKS.find((b) => b.kind === 'tower')!;
/** The galleries and bridges (not the stair towers' pieces) */
const DECKS = ENDS_FLOORS.filter((f) => !f.stair && !f.ground);
const walked = BLOCKS.filter((b) => b.decks.some((d) => d.walk));

test("Fennel House's galleries, the street in the sky and Harrier Point's bridges are walked on, with room over his head", () => {
  // (four galleries a half, the bridge over the spine, three of Harrier Point's; since the polish round every block's
  // galleries: Linnet Court's two, Marten House's four, the courts' two each)
  assert.equal(DECKS.length, 4 + 4 + 1 + 3 + 2 + 4 + 2 + 2 + 2);
  for (const f of DECKS) {
    // (nothing over a floor lower than his head but its own roof, well clear of it)
    for (const c of ENDS_CAMERA) {
      const over = c[5] > f.y + 0.01 && c[0] < f.walk[2] && c[2] > f.walk[0] && c[1] < f.walk[3] && c[3] > f.walk[1];
      if (over) assert.ok(c[5] - f.y >= DEGEN + 0.3, `${f.id}: ${(c[5] - f.y).toFixed(2)} overhead`);
    }
  }
  assert.ok(WALK_H >= DEGEN + 0.3 && OPENING >= DEGEN + 0.3);
  // (a walked gallery's cross walls open at each gallery: you walk through them)
  for (const b of walked)
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
  for (const f of DECKS) {
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
  // (Fennel House's two, in its stair towers since the polish round, and Harrier Point's)
  assert.equal(ENDS_LIFTS.length, 2 + 1);
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

/* ---------- The stair towers (the polish round) ---------- */

const laneU = (STAIR.half + STAIR.spine) / 2;
/** Up a tower from the street: the porch, each flight out and back with the half landing between, onto each gallery */
function climb(g: (typeof STAIRS)[number]) {
  const { run, far } = STAIR;
  const near = g.near;
  const pts: { u: number; v: number }[] = [];
  const line = (u0: number, v0: number, u1: number, v1: number) => {
    const n = Math.ceil(Math.hypot(u1 - u0, v1 - v0) / 0.05);
    for (let i = 1; i <= n; i++) pts.push({ u: u0 + ((u1 - u0) * i) / n, v: v0 + ((v1 - v0) * i) / n });
  };
  pts.push({ u: -laneU, v: near - 0.4 });
  const half = near + run + far / 2;
  for (let k = 0; k + 1 < g.levels.length; k++) {
    line(-laneU, k ? near - 0.3 : near - 0.4, -laneU, half);
    line(-laneU, half, laneU, half);
    line(laneU, half, laneU, near - 0.3);
    line(laneU, near - 0.3, -laneU, near - 0.3);
  }
  return pts;
}

test('a stair tower up to every block with galleries: from the street to the top gallery, step by step', () => {
  // (every block with galleries has one, and every gallery is walked)
  for (const b of BLOCKS.filter((q) => q.decks.length)) {
    assert.ok(STAIRS.some((g) => g.tower.block === b.id), `${b.id} has no stair`);
    assert.ok(b.decks.every((d) => d.walk), `${b.id}'s galleries aren't walked`);
  }
  for (const g of STAIRS) {
    let y = SLAB_Y;
    let landed = 0;
    for (const { u, v } of climb(g)) {
      const [x, z] = g.at(u, v);
      const next = endsDeckY(x, z, y) ?? SLAB_Y;
      assert.ok(Math.abs(next - y) < 0.12, `${g.tower.block}: a step of ${(next - y).toFixed(2)} at ${u.toFixed(2)}, ${v.toFixed(2)}`);
      y = next;
      if (y > SLAB_Y + 0.6) {
        assert.ok(upOnEnds(x, z, y), `${g.tower.block}: off the stair at ${u.toFixed(2)}, ${v.toFixed(2)}`);
        assert.ok(!endsDeckWall(x, z, y, R), `${g.tower.block}: a wall at ${u.toFixed(2)}, ${v.toFixed(2)}, ${y.toFixed(2)}`);
      }
      landed = Math.max(landed, y);
    }
    // (out onto the top gallery, through its parapet's gap or its end wall)
    assert.equal(landed, g.levels[g.levels.length - 1], `${g.tower.block} never reaches its top gallery`);
    // ...and from every landing a step further onto its gallery, its floor
    const [gx, gz] = g.at(0, -0.6);
    for (const l of g.levels.slice(1)) assert.equal(endsDeckY(gx, gz, l), l);
    // Its walls stop him: past the lanes' outer sides, through the wall between the flights
    const mid = g.near + STAIR.run / 2;
    const yA = (g.levels[1] + (g.levels[2] ?? g.levels[1])) / 2;
    for (const [u, v] of [
      [-STAIR.half + 0.05, mid],
      [STAIR.half - 0.05, mid],
      [0, mid],
    ]) {
      const [x, z] = g.at(u, v);
      const lane = ENDS_FLOORS.find((f) => f.stair && f.slope && f.rect[0] <= x && x <= f.rect[2] && f.rect[1] <= z && z <= f.rect[3] && Math.abs(floorY(f, x, z) - yA) < 1.1);
      if (lane) assert.ok(endsDeckWall(x, z, floorY(lane, x, z), R), `${g.tower.block}: no wall at ${u}`);
    }
  }
});

test('room over his head on every stair (over the porch, the flights and the landings)', () => {
  for (const f of ENDS_FLOORS.filter((q) => q.stair || q.ground)) {
    for (let a = 0.15; a < 1; a += 0.2)
      for (let c = 0.15; c < 1; c += 0.2) {
        const x = f.walk[0] + (f.walk[2] - f.walk[0]) * a;
        const z = f.walk[1] + (f.walk[3] - f.walk[1]) * c;
        const y = floorY(f, x, z);
        for (const b of ENDS_CAMERA) if (b[5] > y + 0.01 && x > b[0] && x < b[2] && z > b[1] && z < b[3]) assert.ok(b[5] - y >= DEGEN + 0.2, `${f.id}: ${(b[5] - y).toFixed(2)} overhead`);
      }
  }
  // (and nobody walks in under the first flight back from the street)
  for (const g of STAIRS) {
    const [x, z] = g.at(laneU, g.near + STAIR.run / 2);
    assert.ok(SOLIDS.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3]), `${g.tower.block}: under its stair`);
    assert.equal(endsDeckY(x, z, SLAB_Y), null);
  }
});

test('the towers stand on their blocks, clear of the streets, everything solid, the lamps, the trees and the cross walls, under the Emporium', () => {
  const own = new Set(STAIRS.flatMap(stairSolids));
  for (const g of STAIRS) {
    const r = g.rect(-STAIR.half - STAIR.wall, 0, STAIR.half + STAIR.wall + (g.tower.lift ? SHAFT : 0), g.depth);
    assert.ok(g.top < TALLEST);
    const corners: [number, number][] = [
      [r[0], r[1]],
      [r[2], r[1]],
      [r[0], r[3]],
      [r[2], r[3]],
    ];
    assert.ok(corners.every((p) => ENDS_BLOCKS.some((b) => inPoly(b.poly, p))), `${g.tower.block}: off its block`);
    for (const s of PLAN.streets) for (const p of corners) assert.ok(distToStreet(s, p) > s.half + 0.8, `${g.tower.block} on ${s.id}`);
    for (const b of SOLIDS) {
      if (own.has(b) || BLOCK_SOLIDS.includes(b)) continue;
      assert.ok(!(b[0] < r[2] + 0.3 && b[2] > r[0] - 0.3 && b[1] < r[3] + 0.3 && b[3] > r[1] - 0.3), `${g.tower.block} on [${b.slice(0, 4).map((v) => v.toFixed(1))}]`);
    }
    // (the buildings: none in its way but the one it stands against)
    for (const b of BLOCKS)
      for (const sh of b.shells) assert.ok(!(sh.rect[0] < r[2] - 0.01 && sh.rect[2] > r[0] + 0.01 && sh.rect[1] < r[3] - 0.01 && sh.rect[3] > r[1] + 0.01), `${g.tower.block} in ${b.id}`);
    for (const [x, z] of [...ENDS_LAMPS.map(([x, z]) => [x, z]), ...ENDS_TREES.map(([x, z]) => [x, z])]) assert.ok(!(x > r[0] - 0.6 && x < r[2] + 0.6 && z > r[1] - 0.6 && z < r[3] + 0.6), `${g.tower.block} on a lamp or tree at ${x}, ${z}`);
    // (no gallery cross wall in the gap it opens)
    const b = BLOCKS.find((q) => q.id === g.tower.block)!;
    // (or, off a gallery's end, its end wall open at every gallery)
    const d = b.decks[g.tower.deck];
    const gap = g.rect(-STAIR.half, -0.5, STAIR.half, 0.2);
    finSpans(b, d).forEach(({ rect: f, spans }) => {
      if (!(f[0] < gap[2] && f[2] > gap[0] && f[1] < gap[3] && f[3] > gap[1])) return;
      assert.notEqual(g.tower.side, d.side, `${g.tower.block}: a cross wall in its gap`);
      for (const y of d.ys) assert.ok(spans.every(([y0, y1]) => y1 <= y + 1e-9 || y0 >= y + OPENING - 1e-9), `${g.tower.block}: its end wall shut at ${y}`);
    });
  }
});
