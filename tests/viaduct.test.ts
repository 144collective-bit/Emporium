// The raised highway's shape (viaduct.ts, viapiers.ts; docs/highway-plan.md Phase 1): the ring worked out exactly,
// the deck high enough for everything that drives under it, eight exits laid as partial cloverleafs on their corner
// sides, their ramps climbing no steeper than they may and meeting the arterial at grade, and the piers clear of
// everything that passes under.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIGHWAY_HALF, fromHighway } from '../src/scripts/city3d/highway';
import { PLAN, RING_MEETS, distToStreet } from '../src/scripts/city3d/streetplan';
import { CARS, TRAILER } from '../src/scripts/city3d/carspec';
import { TRACKS } from '../src/scripts/city3d/metro';
import { inWater } from '../src/scripts/city3d/river';
import { BRIDGE_PIERS } from '../src/scripts/city3d/waterfront';
import {
  BESIDE,
  CLEARANCE,
  DECK_HALF,
  DECK_Y,
  EXITS,
  OUTER_LANE,
  PIER_GAP,
  RAMPS,
  RAMP_GRADE,
  RAMP_HALF,
  REACH,
  RING_LEN,
  exitS,
  ringAt,
  ringPoint,
  ringS,
  sGap,
  steepest,
} from '../src/scripts/city3d/viaduct';
import { PIERS, PIER_CLEAR } from '../src/scripts/city3d/viapiers';

test('the ring is the highway centre line exactly, and ringS finds any point on it again', () => {
  assert.ok(Math.abs(RING_LEN - (2 * 350 + 2 * 350 + 2 * Math.PI * 70)) < 1e-6);
  for (let s = 0; s < RING_LEN; s += 7.3) {
    const r = ringAt(s);
    assert.ok(fromHighway(r.x, r.z) < 1e-6, `on the box at ${s}`);
    assert.ok(Math.abs(Math.hypot(r.tx, r.tz) - 1) < 1e-9 && Math.abs(r.tx * r.nx + r.tz * r.nz) < 1e-9);
    // Outward is outward: a step out is further from the middle of the box
    const [ox, oz] = ringPoint(s, 5);
    assert.ok(Math.hypot(ox - 30, oz - 75) > Math.hypot(r.x - 30, r.z - 75), `outward at ${s}`);
    for (const o of [-20, -3, 0, 4, 25]) {
      const [x, z] = ringPoint(s, o);
      const back = ringS(x, z);
      assert.ok(Math.abs(sGap(s, back.s)) < 1e-3 && Math.abs(back.o - o) < 1e-3, `ringS at ${s}, ${o}: ${back.s}, ${back.o}`);
    }
  }
});

test('the deck leaves room under it for the tallest thing in the traffic, a rig with its trailer and the bus', () => {
  const tallest = Math.max(...Object.values(CARS).flatMap((c) => [...c.cabin.map((p) => p[1]), ...c.top.map((p) => p[1]), c.box?.[2] ?? 0]), TRAILER.h);
  assert.ok(CLEARANCE > tallest + 0.4, `clearance ${CLEARANCE} over ${tallest}`);
  assert.ok(DECK_HALF > HIGHWAY_HALF);
});

test('eight exits, numbered clockwise from the stadium, each at an arterial junction of today', () => {
  assert.equal(EXITS.length, 8);
  let last = -Infinity;
  const start = exitS(EXITS[0]);
  for (const e of EXITS) {
    // (where its arterial passes under the deck: the street-level junction it was, streetplan.ts RING_MEETS)
    const c = RING_MEETS.find((k) => k.id === e.crossing)!;
    assert.ok(c && c.street === e.street, e.crossing);
    assert.ok(Math.hypot(c.at[0] - e.at[0], c.at[1] - e.at[1]) < 0.5);
    const s = (exitS(e) - start + RING_LEN) % RING_LEN;
    assert.ok(s > last, `exit ${e.n} after the one before`);
    last = s;
  }
});

test("each exit's ramps keep to its corner side, clear of the next arterial along the ring", () => {
  const meets = RING_MEETS;
  for (const e of EXITS) {
    const s0 = exitS(e);
    for (const c of meets) {
      if (c.id === e.crossing) continue;
      const d = sGap(s0, ringS(c.at[0], c.at[1]).s) * e.side;
      assert.ok(d < 0 || d > REACH + 4, `exit ${e.n}: ${c.id} is ${d.toFixed(1)} along its side`);
    }
    for (const r of RAMPS.filter((r) => r.exit === e.n))
      for (const p of r.pts) assert.ok(sGap(s0, ringS(p[0], p[1]).s) * e.side > -0.5, `${r.id} strays to the other side`);
  }
});

test("each quadrant's ramps by its form: a loop and a straight ramp round it, a slip ramp, or none; every exit gets off and on", () => {
  for (const e of EXITS) {
    const mine = RAMPS.filter((r) => r.exit === e.n);
    for (const q of [-1, 1] as const) {
      const side = mine.filter((r) => r.q === q);
      const form = q < 0 ? e.inner : e.outer;
      assert.deepEqual(side.map((r) => r.shape).sort(), form === 'full' ? ['loop', 'straight'] : form === 'slip' ? ['slip'] : [], `exit ${e.n} ${q}`);
      if (form === 'full') assert.deepEqual(side.map((r) => r.kind).sort(), ['off', 'on']);
    }
    assert.ok(mine.some((r) => r.kind === 'off') && mine.some((r) => r.kind === 'on'), `exit ${e.n} gets off and on`);
  }
});

test('every ramp meets the arterial at grade at its terminal, climbs no steeper than it may, and joins the outer lane at deck height', () => {
  for (const r of RAMPS) {
    const e = EXITS.find((x) => x.n === r.exit)!;
    const art = PLAN.streets.find((s) => s.id === e.street)!;
    assert.ok(distToStreet(art, r.terminal) < 0.5, `${r.id}: its terminal on ${e.street}`);
    const atTerminal = r.kind === 'off' ? r.pts.length - 1 : 0;
    const atDeck = r.kind === 'off' ? 0 : r.pts.length - 1;
    assert.deepEqual(r.pts[atTerminal], r.terminal);
    assert.equal(r.ys[atTerminal], 0);
    assert.equal(r.ys[atDeck], DECK_Y);
    const deck = ringS(r.pts[atDeck][0], r.pts[atDeck][1]);
    assert.ok(Math.abs(Math.abs(deck.o) - OUTER_LANE) < 0.05, `${r.id} joins the outer lane`);
    // The way it's driven there is the carriageway's own (clockwise inside, anticlockwise outside)
    const next = r.pts[r.kind === 'off' ? 1 : r.pts.length - 2];
    const along = sGap(ringS(next[0], next[1]).s, deck.s) * (r.kind === 'off' ? -1 : 1);
    assert.ok(along * (r.q < 0 ? 1 : -1) > 0, `${r.id} runs the carriageway's way`);
    assert.ok(steepest(r) <= RAMP_GRADE + 1e-6, `${r.id}: ${steepest(r).toFixed(3)}`);
    // Off the deck everywhere but where it joins, and level with it there
    for (let i = 0; i < r.pts.length; i++) {
      const { o } = ringS(r.pts[i][0], r.pts[i][1]);
      if (Math.abs(o) < BESIDE - 0.01) assert.equal(r.ys[i], DECK_Y, `${r.id} over the deck below its height at ${i}`);
    }
  }
});

test("an exit's ramps never run into each other", () => {
  for (const e of EXITS) {
    const mine = RAMPS.filter((r) => r.exit === e.n);
    for (let a = 0; a < mine.length; a++)
      for (let b = a + 1; b < mine.length; b++)
        for (let i = 0; i < mine[a].pts.length; i++)
          for (let j = 0; j < mine[b].pts.length; j++) {
            const [p, q] = [mine[a].pts[i], mine[b].pts[j]];
            // (both up on the deck where they join it is the deck itself)
            if (mine[a].ys[i] === DECK_Y && mine[b].ys[j] === DECK_Y) continue;
            assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) > 2 * RAMP_HALF + 0.3, `${mine[a].id} meets ${mine[b].id}`);
          }
  }
});

test('the piers stand clear of every street that passes under, the metro, the boats and each other', () => {
  assert.ok(PIERS.length > 100);
  const under = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp');
  for (let i = 0; i < PIERS.length; i++) {
    const p = PIERS[i];
    assert.ok(fromHighway(p.at[0], p.at[1]) < 1e-6);
    for (const s of under) assert.ok(distToStreet(s, p.at) > s.half + PIER_CLEAR, `a pier at ${p.s.toFixed(1)} on ${s.id}`);
    for (const t of Object.values(TRACKS))
      for (let k = 1; k < t.pts.length; k++) {
        const [a, b] = [t.pts[k - 1], t.pts[k]];
        const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
        const u = Math.max(0, Math.min(1, ((p.at[0] - a[0]) * dx + (p.at[1] - a[1]) * dz) / (dx * dx + dz * dz)));
        assert.ok(Math.hypot(p.at[0] - a[0] - u * dx, p.at[1] - a[1] - u * dz) > 2, `a pier at ${p.s.toFixed(1)} under the metro`);
      }
    if (inWater(p.at[0], p.at[1])) assert.ok(BRIDGE_PIERS.some((z) => Math.abs(p.at[1] - z) < 0.5), `a pier in a boat lane at ${p.s.toFixed(1)}`);
    const gap = (PIERS[(i + 1) % PIERS.length].s - p.s + RING_LEN) % RING_LEN;
    assert.ok(gap > PIER_GAP / 2 && gap < 3 * PIER_GAP, `piers ${gap.toFixed(1)} apart at ${p.s.toFixed(1)}`);
  }
});

// Phase 1b (the owner's call: open land only moves): what each exit takes is clear. Every ramp keeps off every
// district's land and block, every street but its own arterial, the water and everything solid (the metro's pillars
// among it since Phase 2: placed clear of the ramps)
import { landMap, C, AREAS } from '../src/scripts/city3d/seams';
import { SOLID_GRID } from '../src/scripts/city3d/solids';
import { RAMP_PIER_SOLIDS } from '../src/scripts/city3d/viaground';

test('every ramp keeps clear of the districts, the streets, the water and everything solid', () => {
  const m = landMap();
  const cell = (x: number, z: number) => m.get(Math.floor((x - m.x0) / 2), Math.floor((z - m.z0) / 2));
  // (the ramps are streets of their own since Phase 3, their piers solid)
  const under = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp');
  const piers = new Set(RAMP_PIER_SOLIDS.map((b) => b.join()));
  const hits: string[] = [];
  for (const r of RAMPS) {
    const e = EXITS.find((x) => x.n === r.exit)!;
    for (let i = 0; i < r.pts.length; i++) {
      const p = r.pts[i];
      const q = r.pts[Math.min(i + 1, r.pts.length - 1)];
      const pp = r.pts[Math.max(i - 1, 0)];
      const l = Math.hypot(q[0] - pp[0], q[1] - pp[1]) || 1;
      const n = [-(q[1] - pp[1]) / l, (q[0] - pp[0]) / l];
      for (const w of [-RAMP_HALF, 0, RAMP_HALF]) {
        const [x, z] = [p[0] + n[0] * w, p[1] + n[1] * w];
        const c = cell(x, z);
        if (c >= 0) hits.push(`${r.id} on ${AREAS[c].id}`);
        else if (c === C.water) hits.push(`${r.id} in the water`);
        else if (r.ys[i] < DECK_Y) for (const s of under) if (s.id !== e.street && distToStreet(s, [x, z]) <= s.half) hits.push(`${r.id} on ${s.id}`);
        for (const b of SOLID_GRID.near(x, z, 0.1))
          if (x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3] && b[4] > r.ys[i] - 0.5 && !piers.has(b.join())) hits.push(`${r.id} into a solid at ${b.slice(0, 4).map((v) => v.toFixed(1))}`);
      }
    }
  }
  const seen = [...new Set(hits)];
  assert.deepEqual(seen, [], seen.slice(0, 20).join('\n'));
});

// Phase 2: the viaduct drawn and the ring raised. Its traffic up on the deck, nothing at street level meeting it, the
// metro rising over it and its ramps, the piers solid and the deck the camera's, its lamps on the median
import { DECK_CAMERA, DECK_LAMPS, PIER_SOLIDS } from '../src/scripts/city3d/viapiers';
import { HIGH_Y, DECK_Y as EL_Y, PLATEAUS, RISE, STATIONS, TRACKS as EL_TRACKS, pointOn, stationY, trackSlope, trackY, PILLARS, PILLAR_HALF } from '../src/scripts/city3d/metro';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { ROUTES, RING_ROUTES } from '../src/scripts/city3d/routes';

test("the metro rises over the deck and the ramps with room for the tallest vehicle under it, its climbs gentle and its stations level", () => {
  const tallest = Math.max(...Object.values(CARS).flatMap((c) => [...c.cabin.map((p) => p[1]), ...c.top.map((p) => p[1]), c.box?.[2] ?? 0]), TRAILER.h);
  let over = 0;
  for (const t of Object.values(EL_TRACKS))
    for (let s = 0; s <= t.len; s += 0.5) {
      const p = pointOn(t.id, s).at;
      const y = trackY(t.id, s);
      assert.ok(y >= EL_Y - 1e-9 && y <= HIGH_Y + 1e-9);
      assert.ok(Math.abs(trackSlope(t.id, s)) < 0.065, `${t.id} at ${s}: too steep`);
      const { o } = ringS(p[0], p[1]);
      // Over the deck: its parapets and the tallest truck under the el's girder (half a tile deep) with room
      if (Math.abs(o) < DECK_HALF + 0.5) {
        over++;
        assert.ok(y - 0.5 > DECK_Y + tallest + 0.4, `${t.id} at ${s} over the deck at ${y.toFixed(2)}`);
      }
      for (const r of RAMPS)
        for (let i = 0; i < r.pts.length; i++)
          if (Math.hypot(r.pts[i][0] - p[0], r.pts[i][1] - p[1]) < RAMP_HALF + 0.5) assert.ok(y - 0.5 > r.ys[i] + tallest + 0.4, `${t.id} at ${s} over ${r.id}`);
    }
  assert.ok(over > 30, 'it crosses the ring');
  // Kart Park, Southbank Docks and the Airport are raised with it; every platform is level
  for (const st of STATIONS) for (let d = -5; d <= 5; d += 1) assert.ok(Math.abs(trackSlope(st.track, st.s + d)) < 1e-6, `${st.id} on a slope`);
  assert.deepEqual(STATIONS.filter((st) => stationY(st) > EL_Y + 1).map((st) => st.id).sort(), ['airport', 'docks', 'kart']);
  assert.ok(RISE > 40 && Object.values(PLATEAUS).flat().length >= 4);
  // Its pillars stand clear of the ramps and off the deck
  for (const p of PILLARS) {
    assert.ok(Math.abs(ringS(p.at[0], p.at[1]).o) > DECK_HALF + PILLAR_HALF, `a pillar under the deck at ${p.at}`);
    for (const r of RAMPS) for (const q of r.pts) assert.ok(Math.hypot(q[0] - p.at[0], q[1] - p.at[1]) > RAMP_HALF + PILLAR_HALF, `a pillar on ${r.id}`);
  }
});

test("the ring's traffic is up on the deck all the way round, and nothing at street level meets it but by the ramps", () => {
  for (let i = 0; i < ROUTES.length; i++) assert.equal(!!ROUTES[i].deck, i < RING_ROUTES);
  for (const r of ROUTES.slice(0, RING_ROUTES)) {
    // (its only stops are the ramps' merges, unlit)
    assert.ok(r.stops.every((s) => s.j.merge && !s.j.lit));
    for (const p of r.pts) assert.ok(fromHighway(p[0], p[1]) < HIGHWAY_HALF);
    assert.ok(r.ys!.every((y) => Math.abs(y - DECK_Y) < 1e-6));
  }
  // The highway meets only its ramps, each at its deck end
  for (const c of PLAN.crossings.filter((c) => c.streets.includes('highway'))) assert.ok(c.id.startsWith('ramp-') && c.id.endsWith('-deck'), c.id);
});

test('the piers are solid, the deck is the camera\'s, its lamps on the median clear of the metro', () => {
  assert.equal(PIER_SOLIDS.length, PIERS.length);
  for (const b of PIER_SOLIDS) assert.ok(SOLIDS.includes(b) && b[4] === DECK_Y);
  // The camera's boxes cover the deck all the way round, from its soffit to its parapets
  for (let s = 0; s < RING_LEN; s += 3)
    for (const o of [-DECK_HALF + 0.2, 0, DECK_HALF - 0.2]) {
      const [x, z] = ringPoint(s, o);
      assert.ok(DECK_CAMERA.some((b) => x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3] && b[5] === DECK_Y - 1 && b[4] > DECK_Y), `no camera box at ${s}`);
    }
  assert.ok(DECK_LAMPS.length > 50);
  for (const [x, z, , y] of DECK_LAMPS) {
    assert.ok(fromHighway(x, z) < 0.01 && Math.abs(y - DECK_Y) < 0.01);
    for (const t of Object.values(EL_TRACKS)) for (const q of t.pts) assert.ok(Math.hypot(q[0] - x, q[1] - z) > 5, 'a lamp under the metro');
  }
});

// Phase 3: the exits in the network. Every ramp a one-way street meeting the deck at a merge and its arterial at a lit
// foot; driven by the traffic up and down it at its own height; the deck and the ramps the ground for a car up there,
// their walls round it, and walked onto no further than a ramp's foot
import { heightOn, pathBetween, pointOn as routeAt, JUNCTIONS } from '../src/scripts/city3d/routes';
import { DECK_GAPS, RAMP_PIERS, VIA_STEP, WALK_OFF, deckGap, rampAt, viaWallsNear, viaductSurface, viaductY, walkOff } from '../src/scripts/city3d/viaground';

test('every ramp is a one-way street in the plan, merging with the deck and meeting its arterial at a lit junction', () => {
  for (const r of RAMPS) {
    const s = PLAN.streets.find((t) => t.id === `ramp-${r.id}`)!;
    assert.ok(s && s.kind === 'ramp' && s.oneway === 1 && s.lanes === 1 && s.ys!.length === s.pts.length);
    const deck = JUNCTIONS.find((j) => j.streets.includes(s) && j.streets.some((t) => t.kind === 'highway'))!;
    assert.ok(deck && deck.merge && !deck.lit, `${r.id} merges`);
    const foot = JUNCTIONS.find((j) => j.streets.includes(s) && !j.merge)!;
    assert.ok(foot && foot.lit && Math.hypot(foot.at[0] - r.terminal[0], foot.at[1] - r.terminal[1]) < 1e-6, `${r.id}'s foot`);
  }
});

test('the traffic drives every ramp, each car at the ramp\'s height, and nothing off the ramps and the deck is raised', () => {
  for (const r of RAMPS) {
    const mid = r.pts[Math.floor(r.pts.length / 2)];
    const want = r.ys[Math.floor(r.pts.length / 2)];
    let found = false;
    for (const route of ROUTES)
      for (let p = 0; p < route.len && !found; p += 0.25) {
        const q = routeAt(route, p, 0).at;
        if (Math.hypot(q[0] - mid[0], q[1] - mid[1]) < 0.3) {
          found = true;
          assert.ok(Math.abs(heightOn(route, p) - want) < 0.15, `${r.id}: ${heightOn(route, p).toFixed(2)} for ${want.toFixed(2)}`);
        }
      }
    assert.ok(found, `nobody drives ${r.id}`);
  }
  // Up off the ground only on a ramp or the deck (not on an arterial passing under it)
  for (const route of ROUTES)
    for (let p = 0; p < route.len; p += 2) {
      const y = heightOn(route, p);
      if (y < 0.05) continue;
      const q = routeAt(route, p, 0).at;
      const rp = rampAt(q[0], q[1]);
      assert.ok(fromHighway(q[0], q[1]) < HIGHWAY_HALF + 0.2 || (rp && rp.d < RAMP_HALF + 0.6), `raised off the viaduct at ${q.map((v) => v.toFixed(1))}`);
    }
  // A taxi takes the highway where it's quicker: from out past Uptown round to the stadium
  const r = pathBetween([-230, 0], [-4.5, -230]);
  assert.ok(r && r.ys && r.ys.some((y) => y > DECK_Y - 0.01), 'a long taxi ride takes the highway');
});

test('up on the deck and the ramps a car drives on them; under them it stays on the ground; walking stops at a ramp\'s foot', () => {
  // On the deck: its surface only from up there
  const [dx, dz] = ringPoint(300, 2);
  assert.equal(viaductY(dx, dz, DECK_Y), DECK_Y);
  assert.equal(viaductY(dx, dz, 0.04), null);
  assert.equal(viaductSurface(dx, dz), DECK_Y);
  for (const r of RAMPS) {
    // Up a ramp from its foot, step by step, never more than a step at a time
    let y = 0.04;
    for (let i = 0; i < r.pts.length; i++) {
      const k = r.kind === 'on' ? i : r.pts.length - 1 - i;
      const [x, z] = r.pts[k];
      const g = viaductY(x, z, y);
      if (g === null) {
        assert.ok(r.ys[k] < VIA_STEP + 0.05, `${r.id}: off it at ${k}`);
        continue;
      }
      assert.ok(g - y < VIA_STEP + 1e-6, `${r.id}: a step up of ${(g - y).toFixed(2)}`);
      y = g;
    }
    assert.ok(Math.abs(y - DECK_Y) < 0.01, `${r.id} reaches the deck`);
    // Walked onto no further than its foot
    for (let k = 0; k < r.pts.length; k++) if (r.ys[k] > WALK_OFF + 0.05 && r.ys[k] < 2) assert.ok(walkOff(r.pts[k][0], r.pts[k][1]), `${r.id}: walked up at ${k}`);
  }
  // Walls: the ramps' sides for anyone, the deck's parapets only for a car up there, open where a ramp tapers in
  const [px, pz] = ringPoint(300, HIGHWAY_HALF + 0.05);
  assert.ok(viaWallsNear(px, pz, 1, DECK_Y).length > 0 && viaWallsNear(px, pz, 1, 0.04).length === 0);
  assert.equal(DECK_GAPS.length, RAMPS.length);
  for (const g of DECK_GAPS) assert.ok(g.s1 - g.s0 > 3 && g.s1 - g.s0 < 20 && deckGap(g.q, (g.s0 + g.s1) / 2));
  assert.ok(RAMP_PIERS.length > 10);
});
