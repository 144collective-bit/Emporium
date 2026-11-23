// Endswood's blocks as data (southblocks.ts; docs/south-plan.md Phase 2, step 2a, the owner's calls): each where the
// owner put it, clear of every street, footpath and its neighbours, as tall as asked; the sky network joining them all
// at level floors, high over the streets; the courts, the deck, the grass and the play area on clear ground.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCH_X, BLOCKS, BLOCK_SOLIDS, BRIDGES, BRIDGE_CLEAR, BUNKER, CORES, COURTS, DECKS, DESIRE_LINES, GALLERIES, GRASS, PLAY,
  BLOCKS_RECT, CAGE, CAGES, DECK_SHOPS, LOBBIES, LOBBY, lobbyAt, lobbyProps, DECK_SHOP_NAMES, PERCH, PIERS, RAMPART, TOP_FLOOR, TWIN_CORE, TWIN_CORE_HALF, roofY, TEASEL, blockById, coreById, cover, floorY, inBlock, outward, stepShape, storeysOf, topOf, type Pt,
} from '../src/scripts/city3d/southblocks';
import { EDGE_Z, FOOTPATHS, LOT9_EDGE, PATH_HALF, SOUTH_BLOCKS, SOUTH_STREETS, UNDERHILL } from '../src/scripts/city3d/south';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { cross, distTo, inside, selfCrossings } from '../src/scripts/city3d/streetfaces';
import { southLift } from '../src/scripts/city3d/southground';
import { MOUTH_PATHS } from '../src/scripts/city3d/circus';
import { DECK_COLUMNS } from '../src/scripts/city3d/southyard';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { SKY_LIFTS, lobbyFloorAt, lobbyLiftDoor, skyLiftDoors } from '../src/scripts/city3d/southsky';

const STREETS = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp');
/** How far a point is from the nearest street's sidewalk's outer edge (negative: on the street or its sidewalk) */
const offStreet = (p: Pt) => Math.min(...STREETS.map((s) => distToStreet(s, p) - s.half - 0.8));
/** A ring's points, and points along its edges every metre */
const along = (poly: Pt[], closed = true): Pt[] =>
  (closed ? poly : poly.slice(0, -1)).flatMap((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
    return Array.from({ length: n }, (_, k): Pt => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  });
const feet = () => [...BLOCKS.map((b) => ({ id: b.id, foot: b.foot })), ...CORES.map((c) => ({ id: c.id, foot: c.foot }))];
const underArch = ([x, z]: Pt) => x > ARCH_X[0] && x < ARCH_X[1] && z < 352;

test('every block and core where the owner put it: clear of the streets and footpaths, on the estate\'s land, out of Lot 9', () => {
  for (const { id, foot } of feet()) {
    assert.equal(selfCrossings(foot), 0, `${id}'s footprint crosses itself`);
    for (const p of along(foot)) {
      if (underArch(p)) continue;
      assert.ok(offStreet(p) >= 0.95, `${id} at ${p[0].toFixed(1)}, ${p[1].toFixed(1)}: ${offStreet(p).toFixed(2)} off a sidewalk`);
      for (const f of FOOTPATHS) assert.ok(distTo(f.pts, p) > PATH_HALF + 0.5, `${id} on ${f.id}`);
      assert.ok(p[1] > EDGE_Z + 1.4, `${id} on the ring road's edge`);
      assert.ok(!inside(LOT9_EDGE, p), `${id} in Lot 9`);
      assert.ok(SOUTH_BLOCKS.some((b) => inside(b.poly, p)), `${id} at ${p[0].toFixed(1)}, ${p[1].toFixed(1)} off the blocks`);
    }
  }
  // (the towers north-east of the Circus: site A; the slabs between the avenues east of ns0s; the low ones round the Circus)
  for (const id of ['harrier', 'kite', 'twin-core']) {
    const c = blockById(id).foot[0];
    assert.ok(c[0] > -100 && c[0] < -12 && c[1] > 345 && c[1] < 400, `${id} off site A`);
  }
  for (const id of ['linnet', 'marten', 'wren']) assert.ok(blockById(id).foot.every((p) => p[0] > -1), `${id} west of the avenue`);
});

test('none in another, a walker\'s way between them; the archway over the turning circle and the path to the tunnel', () => {
  const all = feet();
  // (a block's own cores stand against it, the towers' core between them and the bridges)
  const own = (a: string, b: string) => a.startsWith(`${b}-`) || b.startsWith(`${a}-`) || a === 'twin-core' || b === 'twin-core';
  for (const a of all)
    for (const b of all) {
      if (a.id >= b.id || own(a.id, b.id)) continue;
      const gap = Math.min(...along(a.foot).map((p) => Math.min(...along(b.foot).map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])))));
      assert.ok(gap > 2.5, `${a.id} and ${b.id} ${gap.toFixed(1)} apart`);
    }
  for (const id of ['harrier', 'kite']) {
    const gap = Math.min(...along(blockById(id).foot).map((p) => Math.min(...along(blockById('twin-core').foot).map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])))));
    assert.ok(gap > 3 && gap < 8, `${id} ${gap.toFixed(1)} from its core`);
  }
  // (the arch: Underhill Lane's turning circle and the tunnel's path pass under it, nothing solid there)
  const bulb = UNDERHILL.pts[UNDERHILL.pts.length - 1];
  assert.ok(bulb[0] > ARCH_X[0] + 5 && bulb[0] < ARCH_X[1] - 5, 'the turning circle under the arch');
  const tunnel = FOOTPATHS.find((f) => f.id === 'south-tunnel-path')!;
  for (const p of tunnel.pts) assert.ok(p[0] > ARCH_X[0] && p[0] < ARCH_X[1]);
  for (const b of BLOCK_SOLIDS) {
    const mid: Pt = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    assert.ok(!underArch(mid) || mid[1] > 352, 'a solid under the arch');
  }
  assert.ok(RAMPART.arch!.clear > 2.1, 'room under the arch');
  // (and the cores never under it)
  for (const c of CORES.filter((q) => q.of === 'rampart')) assert.ok(c.at[0] < ARCH_X[0] - 2 || c.at[0] > ARCH_X[1] + 2, `${c.id} under the arch`);
});

test('as tall as the owner asked: the towers about 20, the Rampart to 13 storeys by the Circus, the slabs 9 and 5', () => {
  for (const id of ['harrier', 'kite']) {
    const t = topOf(blockById(id));
    assert.ok(t > 19 && t < 21, `${id} ${t}`);
    assert.ok(t < 22.5, "under St Aldwyn's spire");
  }
  assert.equal(storeysOf(RAMPART), 13);
  const tall = RAMPART.steps.find((s) => s.storeys === 13)!;
  assert.ok(topOf(RAMPART) < 14.5 && topOf(RAMPART) > 13);
  // (its tallest stretch north-east of the Circus; falling either way)
  assert.ok(RAMPART.steps.indexOf(tall) > 0 && RAMPART.steps.indexOf(tall) < RAMPART.steps.length - 1);
  for (const id of ['linnet', 'marten', 'wren']) assert.equal(storeysOf(blockById(id)), 9);
  for (const id of ['sorrel', 'fennel', 'teasel']) assert.equal(storeysOf(blockById(id)), 5);
  // (every block level on its plinth: the ground under it never more than a step below its floor)
  for (const b of BLOCKS) for (const p of b.foot) assert.ok(b.base - 0.15 - southLift(p[0], p[1]) < 0.5, `${b.id} high over the ground`);
  // (each its own accent, neighbours apart)
  for (const id of ['rampart', 'harrier', 'kite', 'linnet', 'marten', 'wren', 'sorrel', 'fennel', 'teasel']) assert.ok(blockById(id).accent, `${id} has no accent`);
  assert.notEqual(blockById('harrier').accent, blockById('kite').accent);
  assert.notEqual(blockById('linnet').accent, blockById('marten').accent);
  assert.notEqual(blockById('marten').accent, blockById('wren').accent);
  assert.notEqual(blockById('teasel').accent, blockById('fennel').accent);
});

test('the galleries: along each slab and the Rampart at every third floor it rises past, each meeting its stair cores', () => {
  for (const b of BLOCKS.filter((q) => q.spine)) {
    const mine = GALLERIES.filter((g) => g.of === b.id);
    assert.ok(mine.some((g) => g.floor === 3), `${b.id} has no gallery at the third floor`);
    for (const g of mine) {
      assert.ok(g.floor < storeysOf(b), `${b.id}'s gallery over its roof`);
      assert.equal(g.y, floorY(b.base, g.floor));
      for (const p of g.poly) if (!underArch(p)) assert.ok(offStreet(p) > 0.3, `${b.id}'s gallery over a street at ${p}`);
    }
    // (each core of a slab touches its third floor's gallery; a service tower standing off its block by its link: the
    // link from on the gallery's edge to the tower's face, `gap` long, docs/brutalist-plan.md Phase 2)
    for (const c of CORES.filter((q) => q.of === b.id)) {
      const third = mine.filter((q) => q.floor === 3);
      const dist = (pts: Pt[], poly: Pt[]) => Math.min(...pts.map((p) => Math.min(...along(poly).map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])))));
      if (!c.link) {
        assert.equal(c.gap, 0);
        assert.ok(Math.min(...third.map((g) => dist(along(c.foot), g.poly))) < 0.4, `${c.id} from its gallery`);
        continue;
      }
      const [a, e] = c.link;
      assert.ok(Math.min(...third.map((g) => dist([a], g.poly))) < 0.4, `${c.id}'s link off its gallery`);
      assert.ok(dist([e], c.foot) < 0.4, `${c.id}'s link short of its tower`);
      assert.ok(Math.abs(Math.hypot(e[0] - a[0], e[1] - a[1]) - c.gap) < 0.3, `${c.id}'s link ${c.gap} long`);
    }
  }
});

test('the sky network: every block reached, each bridge level, over a street only high above it, through nothing', () => {
  const nodes = new Set<string>();
  const of = (e: (typeof BRIDGES)[number]['a']) => ('core' in e ? coreById(e.core).of : 'block' in e ? e.block : e.deck);
  const links: [string, string][] = BRIDGES.map((b) => [of(b.a), of(b.b)]);
  // (the podium deck joins Teasel's galleries and Fennel's)
  links.push(['teasel', 'podium'], ['fennel', 'podium']);
  const seen = new Set(['rampart']);
  for (let k = 0; k < 20; k++) for (const [a, b] of links) if (seen.has(a) || seen.has(b)) (seen.add(a), seen.add(b));
  for (const b of BLOCKS) nodes.add(b.id);
  for (const id of nodes) assert.ok(seen.has(id), `${id} isn't on the sky network`);
  for (const br of BRIDGES) {
    const [a, b] = br.pts;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    assert.ok(L > 1 && L < 45, `${br.id} ${L.toFixed(1)} long`);
    assert.ok(Math.abs(br.ys[1] - br.ys[0]) <= L / 12 + 1e-6, `${br.id} too steep`);
    for (let k = 1; k < 20; k++) {
      const p: Pt = [a[0] + ((b[0] - a[0]) * k) / 20, a[1] + ((b[1] - a[1]) * k) / 20];
      const y = br.ys[0] + ((br.ys[1] - br.ys[0]) * k) / 20;
      if (offStreet(p) < 0) assert.ok(y - 0.3 > BRIDGE_CLEAR, `${br.id} low over a street`);
      // (through no block but its own ends')
      for (const { id, foot } of feet()) {
        const ends = [of(br.a), of(br.b), 'core' in br.a ? br.a.core : '', 'core' in br.b ? br.b.core : ''];
        if (ends.includes(id) || ends.some((e) => e && id.startsWith(`${e}-`))) continue;
        assert.ok(!inside(foot, p), `${br.id} through ${id}`);
      }
    }
  }
  // (at two or three levels, as the owner asked)
  assert.ok(new Set(BRIDGES.map((b) => b.floor)).size >= 3);
});

test('the ground: courts open off their streets, the deck over its court, the grass and the play area clear of everything', () => {
  for (const c of COURTS) {
    assert.ok(c.poly.length > 3);
    assert.equal(selfCrossings(c.poly), 0, `${c.id} crosses itself`);
    for (const p of along(c.poly)) {
      assert.ok(!inBlock(p) || c.id === 'court-podium', `${c.id} in a block at ${p}`);
      assert.ok(offStreet(p) > -0.9, `${c.id} on a street at ${p}`);
    }
    const s = SOUTH_STREETS.find((q) => q.id === c.street)!;
    assert.ok(distTo(s.pts, c.entry) < s.half + 4, `${c.id}'s way in off ${c.street}`);
    assert.ok(Math.min(...c.poly.map((p) => Math.hypot(p[0] - c.entry[0], p[1] - c.entry[1]))) < 6, `${c.id} far from its way in`);
  }
  const deck = DECKS[0];
  assert.equal(selfCrossings(deck.poly), 0);
  assert.equal(deck.y, floorY(Math.max(blockById('teasel').base, blockById('fennel').base), 3));
  for (const [x, z] of deck.poly) assert.ok(inside(COURTS[1].poly, [x, z]) || inBlock([x, z], 2.2), 'the deck off its court');
  for (const poly of [...GRASS, PLAY]) {
    assert.equal(selfCrossings(poly), 0);
    for (const p of along(poly)) {
      assert.ok(offStreet(p) > -0.2, `grass on a street at ${p}`);
      assert.ok(!inBlock(p), `grass in a block at ${p}`);
    }
  }
  for (const l of DESIRE_LINES) for (const p of l) assert.ok(!inBlock(p, 0.5), `a desire line into a block at ${p}`);
  for (const p of along(PLAY)) for (const c of COURTS) assert.ok(!inside(c.poly, p), 'the play area in a court');
  // (no line of a court crosses a street but where it opens off its own)
  for (const c of COURTS)
    for (const s of SOUTH_STREETS.filter((q) => q.id !== c.street))
      for (let i = 0; i < c.poly.length; i++) for (let j = 1; j < s.pts.length; j++) assert.equal(cross(c.poly[i], c.poly[(i + 1) % c.poly.length], s.pts[j - 1], s.pts[j]), null, `${c.id} crosses ${s.id}`);
});

test('Teasel House: its west half hoarded for refit, Bunker Sound under it, its door on its street side', () => {
  const refit = BLOCKS.filter((b) => b.refit);
  assert.deepEqual(refit.map((b) => b.id), ['teasel']);
  assert.equal(BUNKER.of, 'teasel');
  assert.ok(offStreet(BUNKER.door) > 0, 'the door on the street');
  assert.ok(offStreet(BUNKER.door) < 4, 'the door off its street side');
  // (the west half: by the Circus)
  const [p] = TEASEL.spine!.slice(-1);
  assert.ok(p[0] < TEASEL.spine![0][0]);
});

test('the solids: every footprint covered (the arch open), nothing solid on a street, as tall as the block', () => {
  for (const { id, foot } of feet()) {
    const xs = foot.map((p) => p[0]);
    const zs = foot.map((p) => p[1]);
    for (let x = Math.min(...xs); x < Math.max(...xs); x += 0.7)
      for (let z = Math.min(...zs); z < Math.max(...zs); z += 0.7) {
        // (but the lobbies' halls and doorways, cut out of it: docs/brutalist-plan.md Phase 6, and a hand's breadth round them)
        if (!inside(foot, [x, z]) || underArch([x, z]) || LOBBIES.some((l) => [l.poly, l.doorPoly].some((h) => inside(h, [x, z]) || h.some((p, i) => distTo([p, h[(i + 1) % h.length]], [x, z]) < 0.2)))) continue;
        assert.ok(BLOCK_SOLIDS.some((b) => x >= b[0] - 1e-6 && x <= b[2] + 1e-6 && z >= b[1] - 1e-6 && z <= b[3] + 1e-6), `${id} not solid at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      }
  }
  for (const b of BLOCK_SOLIDS) for (const p of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]] as Pt[]) assert.ok(offStreet(p) > 0.5, `a solid by a street at ${p}`);
  assert.ok(Math.max(...BLOCK_SOLIDS.map((b) => b[4])) < 21);
  // (cover() itself: a square's one box a strip)
  assert.equal(cover([[0, 0], [3, 0], [3, 1], [0, 1]], 2, 1).length, 3);
});

test("each step's outline (what's drawn): its edges tagged, its cuts where steps meet, together the block's footprint", () => {
  const area = (r: Pt[]) => Math.abs(r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0) / 2);
  for (const b of BLOCKS.filter((q) => q.spine)) {
    let sum = 0;
    b.steps.forEach((st, i) => {
      const sh = stepShape(b, st);
      assert.equal(sh.ring.length, sh.tags.length);
      assert.equal(selfCrossings(sh.ring), 0, `${b.id} step ${i} crosses itself`);
      assert.equal(sh.cutStart, i > 0);
      assert.equal(sh.cutEnd, i < b.steps.length - 1);
      for (const t of ['right', 'left', 'start', 'end'] as const) assert.ok(sh.tags.includes(t), `${b.id} step ${i} has no ${t}`);
      assert.equal(sh.tags.includes('corner'), !sh.cutStart || !sh.cutEnd, `${b.id} step ${i}: rounded only at the block's ends`);
      // (each edge's outward normal points out of it)
      sh.ring.forEach((a, j) => {
        const c = sh.ring[(j + 1) % sh.ring.length];
        const n = outward(sh.ring, j);
        if (Math.hypot(c[0] - a[0], c[1] - a[1]) < 0.05) return;
        const m: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
        assert.ok(!inside(sh.ring, [m[0] + n[0] * 0.05, m[1] + n[1] * 0.05]) && inside(sh.ring, [m[0] - n[0] * 0.05, m[1] - n[1] * 0.05]), `${b.id} step ${i} edge ${j} faces in`);
      });
      sum += area(sh.ring);
    });
    assert.ok(Math.abs(sum - area(b.foot)) / area(b.foot) < 0.02, `${b.id}'s steps ${sum.toFixed(0)} against its footprint ${area(b.foot).toFixed(0)}`);
  }
  // (and the district's rect round every block)
  for (const b of BLOCKS) for (const [x, z] of b.foot) assert.ok(x > BLOCKS_RECT[0] && x < BLOCKS_RECT[2] && z > BLOCKS_RECT[1] && z < BLOCKS_RECT[3]);
});

test('brutalist (docs/brutalist-plan.md Phase 1): every corner cut straight, a chamfer at 45 degrees, none rounded', () => {
  // (a corner's face: the edge between two sides at right angles, at 45 degrees to both)
  const turn = (a: Pt, b: Pt, c: Pt) => {
    const [u, v] = [Math.atan2(b[1] - a[1], b[0] - a[0]), Math.atan2(c[1] - b[1], c[0] - b[0])];
    return Math.abs(((v - u + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
  };
  // The towers and The Core: squares with their four corners cut, eight faces, each turn a right angle's half
  for (const id of ['harrier', 'kite', 'twin-core']) {
    const f = blockById(id).foot;
    assert.equal(f.length, 8, `${id}: ${f.length} corners`);
    for (let i = 0; i < 8; i++) assert.ok(Math.abs(turn(f[i], f[(i + 1) % 8], f[(i + 2) % 8]) - Math.PI / 4) < 1e-6, `${id} corner ${i}`);
  }
  // The slabs' ends: one cut each corner (two corner faces an end, the end's face between them, square to it)
  for (const b of BLOCKS.filter((x) => x.kind === 'slab' || x.kind === 'rampart'))
    b.steps.forEach((st, i) => {
      const sh = stepShape(b, st);
      const corners = sh.tags.filter((t) => t === 'corner').length;
      const ends = (sh.cutStart ? 0 : 1) + (sh.cutEnd ? 0 : 1);
      assert.equal(corners, ends * 2, `${b.id} step ${i}: ${corners} corner faces for ${ends} ends`);
    });
});

test('the service towers (docs/brutalist-plan.md Phase 2): most stand a bridge off their blocks, none nearer the streets', () => {
  const off = CORES.filter((c) => c.gap > 0);
  assert.ok(off.length >= 12, `${off.length} of ${CORES.length} stand off`);
  for (const c of off) assert.ok(c.gap <= 3 && c.link, c.id);
  // (each link clear of the streets as its galleries are)
  for (const c of off) for (const p of along(c.link!, false)) assert.ok(offStreet(p) > 0.3, `${c.id}'s link over a street`);
});

test('the bridges\' piers (docs/brutalist-plan.md polish): under their spans, on the estate\'s land, clear of the streets', () => {
  assert.ok(PIERS.length >= 4, `${PIERS.length} piers`);
  for (const p of PIERS) {
    const br = BRIDGES.find((q) => p.id.startsWith(`${q.id}-pier`))!;
    assert.ok(br, `${p.id}'s bridge`);
    // (on its span's line, under its deck, standing on the ground)
    const [a, c] = br.pts;
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const off = Math.abs(((p.at[0] - a[0]) * (c[1] - a[1]) - (p.at[1] - a[1]) * (c[0] - a[0])) / l);
    assert.ok(off < 0.05, `${p.id} ${off.toFixed(2)} off its span`);
    assert.ok(p.top < Math.min(...br.ys) && p.top > Math.min(...br.ys) - 0.4, `${p.id}'s top`);
    assert.ok(p.top - p.base > 2, `${p.id} too short`);
    for (const q of [p.at, ...[[-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4]].map(([dx, dz]): Pt => [p.at[0] + dx, p.at[1] + dz])]) {
      assert.ok(offStreet(q) >= 0.95, `${p.id} by a street`);
      for (const f of FOOTPATHS) assert.ok(distTo(f.pts, q) > PATH_HALF + 0.5, `${p.id} on ${f.id}`);
    }
  }
});

test("the towers' stair cages (docs/brutalist-plan.md): off the streets, the footpaths, the Circus's paths and the blocks", () => {
  assert.ok(CAGES.length >= 10);
  for (const g of CAGES)
    for (let a = 0.4; a <= CAGE.len; a += 0.25)
      for (let b = -CAGE.half; b <= CAGE.half + 1e-6; b += CAGE.half / 4) {
        const p = g.at(a, b);
        const at = `${g.id} at ${p[0].toFixed(1)}, ${p[1].toFixed(1)}`;
        assert.ok(offStreet(p) > 0.3, `${at}: on a sidewalk`);
        for (const f of FOOTPATHS) assert.ok(distTo(f.pts, p) > PATH_HALF, `${at}: on ${f.id}`);
        for (const m of MOUTH_PATHS) assert.ok(distTo(m, p) > PATH_HALF, `${at}: on a subway's path`);
        assert.ok(!inBlock(p), `${at}: in a block`);
      }
});

test("The Perch (docs/brutalist-plan.md Phase 3): a hexagon wider than The Core round its top two floors, no taller, joined to both twins at the top", () => {
  // (a hexagon, a flat face to each tower, round The Core's whole footprint and wider, clear of the towers)
  assert.equal(PERCH.foot.length, 6);
  assert.ok(PERCH.apothem > TWIN_CORE_HALF + 1);
  for (const p of TWIN_CORE.foot) assert.ok(inside(PERCH.foot, p), 'The Core out of its drum');
  for (const id of ['harrier', 'kite']) for (const p of along(PERCH.foot)) assert.ok(!inside(blockById(id).foot, p), `in ${id}`);
  // (its floor the top floor, its roof The Core's, The Core's top as it was: about 20, under 21)
  assert.equal(PERCH.y0, floorY(TWIN_CORE.base, TOP_FLOOR));
  assert.equal(PERCH.y1, roofY(TWIN_CORE.base, storeysOf(TWIN_CORE)));
  assert.ok(TOP_FLOOR < storeysOf(TWIN_CORE) - 1 && TOP_FLOOR === storeysOf(blockById('harrier')) - 1, "the twins' top floor, The Core's top two");
  assert.ok(topOf(TWIN_CORE) > 19 && topOf(TWIN_CORE) < 21);
  // (a bridge to each twin at the top floor, from a face of the drum to the tower's, a few metres long, level)
  for (const id of ['harrier', 'kite']) {
    const br = BRIDGES.find((q) => q.id === `core-${id}-${TOP_FLOOR}`)!;
    assert.ok(br, `no top bridge to ${id}`);
    const [a, b] = br.pts;
    assert.ok(Math.abs(Math.hypot(a[0] - PERCH.at[0], a[1] - PERCH.at[1]) - PERCH.apothem) < 0.05, `the ${id} bridge off the middle of a face`);
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > 3, `the ${id} bridge too short`);
    assert.ok(Math.abs(br.ys[0] - br.ys[1]) < 0.01);
  }
  // (the bridges under it, the fifteenth floor's, their roofs, 1.68 over their floor, under its soffit)
  for (const br of BRIDGES.filter((q) => q.floor === 15 && q.id.startsWith('core-'))) assert.ok(Math.max(...br.ys) + 1.68 < PERCH.y0 - 0.25 - 0.005, `${br.id} into its underside`);
});

test("no landing post stands in a link's doorway; each core keeps two or more (J1 part 3)", async () => {
  const { CORES, landingPosts, inDoorway } = await import('../src/scripts/city3d/southblocks');
  const linked = CORES.filter((c) => c.link);
  assert.ok(linked.length >= 10, 'the service towers have their links');
  for (const c of linked) {
    const posts = landingPosts(c.foot, c.link);
    for (const p of posts) assert.ok(!inDoorway(c.link!, p), `${c.id}: a post in the doorway at ${p}`);
    assert.ok(posts.length >= 2, `${c.id}: only ${posts.length} posts left`);
    // (and before the fix one was there: the rule is doing something)
    assert.ok(landingPosts(c.foot).some((p) => inDoorway(c.link!, p)) || posts.length === 4, `${c.id}: nothing to clear`);
  }
});

test("the shops under the podium deck (docs/brutalist-plan.md Phase 5): ten units on Teasel's and Fennel's gallery sides, under the deck, two of them open", () => {
  assert.equal(DECK_SHOPS.length, 10);
  assert.deepEqual(DECK_SHOPS.filter((q) => q.name).map((q) => q.name), [...DECK_SHOP_NAMES]);
  assert.equal(DECK_SHOPS.filter((q) => q.toLet).length, 1);
  const deck = DECKS[0];
  for (const sh of DECK_SHOPS) {
    const len = Math.hypot(sh.c[0] - sh.a[0], sh.c[1] - sh.a[1]);
    assert.ok(len > 2.5 && len < 5, `${sh.id} ${len.toFixed(2)} wide`);
    const mid: Pt = [(sh.a[0] + sh.c[0]) / 2, (sh.a[1] + sh.c[1]) / 2];
    // (its front on its block's face, the court in front of it, under the deck)
    assert.ok(inBlock(mid, 0.05) && !inBlock([mid[0] + sh.n[0] * 0.3, mid[1] + sh.n[1] * 0.3]), `${sh.id} not on its block's face`);
    const out: Pt = [mid[0] + sh.n[0] * 2.4, mid[1] + sh.n[1] * 2.4];
    assert.ok(inside(deck.poly, out), `${sh.id} not under the deck`);
    for (const [x, z] of DECK_COLUMNS) assert.ok(Math.hypot(x - out[0], z - out[1]) > 0.8, `${sh.id} behind a column`);
  }
});

test('the lobbies (docs/brutalist-plan.md Phase 6): a hall in every block but The Core, walked into through its door, walled in, its lift doors calling its lift', () => {
  assert.equal(LOBBIES.length, BLOCKS.length - 1);
  const solid = (p: Pt, r = 0.2) => SOLIDS.some((b) => p[0] > b[0] - r && p[0] < b[2] + r && p[1] > b[1] - r && p[1] < b[3] + r);
  for (const l of LOBBIES) {
    const blk = blockById(l.of);
    // (its hall inside its block, a little in from its outline)
    for (const p of l.poly) assert.ok(inside(blk.foot, p) && inBlock(p), `${l.id}'s corner outside ${l.of}`);
    const at = (u: number, o: number): Pt => [l.door[0] + l.t[0] * u + l.n[0] * o, l.door[1] + l.t[1] * u + l.n[1] * o];
    const mid = at(0, -LOBBY.wall - l.d / 2);
    // (in from outside: from a step out of the door, through it, to the hall's middle, nothing solid in the way; on its floor)
    const outside = at(0, 0.9);
    assert.ok(!inBlock(outside) && !solid(outside, 0.3), `${l.id}'s door opens onto something solid at ${outside.map((v) => v.toFixed(1))}`);
    assert.ok(offStreet(outside) > -1.6, `${l.id}'s door opens onto the street`);
    for (let k = 0; k <= 40; k++) {
      const p: Pt = [outside[0] + ((mid[0] - outside[0]) * k) / 40, outside[1] + ((mid[1] - outside[1]) * k) / 40];
      assert.ok(!solid(p), `${l.id}: solid on the way in at ${p.map((v) => v.toFixed(2))}`);
    }
    assert.equal(lobbyAt(mid[0], mid[1])?.id, l.id);
    assert.equal(lobbyFloorAt(mid[0], mid[1]), l.base);
    // (walled in: past its back wall, its side walls, and the front beside the door, all solid)
    for (const p of [at(0, -LOBBY.wall - l.d - 0.4), at(l.w / 2 + 0.4, -LOBBY.wall - l.d / 2), at(-l.w / 2 - 0.4, -LOBBY.wall - l.d / 2), at(l.w / 2 - 0.5, -0.1), at(-l.w / 2 + 0.5, -0.1)])
      assert.ok(solid(p, 0), `${l.id}: open wall at ${p.map((v) => v.toFixed(2))}`);
    // (its bench and stairs solid, inside the hall)
    const { bench, stairs } = lobbyProps(l);
    for (const q of [...bench, ...stairs]) assert.ok(inside(l.poly, [q[0] + (mid[0] - q[0]) * 0.02, q[1] + (mid[1] - q[1]) * 0.02]), `${l.id}'s bench or stairs outside its hall`);
    // (its lift doors: a lift that exists, its prompt at the ground in the hall)
    assert.ok(SKY_LIFTS.some((q) => q.id === l.lift), `${l.id}'s lift ${l.lift}`);
    const ld = lobbyLiftDoor(l);
    assert.ok(inside(l.poly, ld) && !solid(ld, 0.25), `${l.id}'s lift door`);
    assert.ok(skyLiftDoors(l.base).some((d) => d.id === `sky-lift:${l.lift}` && Math.hypot(d.x - ld[0], d.z - ld[1]) < 0.01), `${l.id}'s lift prompt`);
  }
});
