// Westlake Park's life (parklife.ts, step 3): walkers, joggers and dogs on the paths, picnics in the glades, the games
// on their courts with their balls, boats on the lake that never meet; and the land it needed (westlake.ts): the
// boathouse and its jetty on the lake's north shore, the courts on the strips with their walks bent round them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BALLS, BALL_R, BOATS, DOGS, GAMES, HULL, LANES, LEAD, PARK_PEOPLE, PICNICS, moment } from '../src/scripts/city3d/parklife';
import { BOATHOUSE, COURTS, JETTY, PARK_TREES, PATHS, BENCHES, inLake, inPark, onJetty, onPath, distToLine, LOOP_OUT, lakeLine } from '../src/scripts/city3d/westlake';
import { SOLIDS } from '../src/scripts/city3d/solids';

const TIMES = Array.from({ length: 160 }, (_, i) => i * 1.37 + 0.11);
const inRect = (r: number[], x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;

test('the courts: on their strips, off every path, their walks bent round them on the park', () => {
  for (const c of COURTS) {
    for (const [x, z] of [[c.rect[0], c.rect[1]], [c.rect[2], c.rect[3]], [c.rect[0], c.rect[3]], [c.rect[2], c.rect[1]]]) assert.ok(inPark([x, z], 0.5), `${c.id}'s corner on the park`);
    for (const q of PATHS) for (const p of q.pts) assert.ok(!inRect(c.rect, p[0], p[1], q.half + 0.3), `${q.id} across ${c.id}`);
    for (const t of PARK_TREES) assert.ok(!inRect(c.rect, t.x, t.z, 1), `a tree on ${c.id}`);
  }
});

test('the boathouse and its jetty: on the north shore, the jetty from the loop out over the water, walkable', () => {
  const [x0, z0, x1, z1] = BOATHOUSE.rect;
  for (const [x, z] of [[x0, z0], [x1, z1], [x0, z1], [x1, z0]]) {
    assert.ok(inPark([x, z], 1) && !inLake(x, z, 1), 'the boathouse on the lawn');
    assert.ok(!onPath([x, z], 0.3), 'the boathouse off the paths');
  }
  assert.ok(SOLIDS.some((s) => s[0] === x0 && s[2] === x1), 'the boathouse is solid');
  // The jetty starts on the loop and ends out in the water, past the rim
  const loop = PATHS.find((p) => p.id === 'loop')!;
  assert.ok(distToLine(loop.pts, [JETTY.x, JETTY.z0 + 0.3], true) < loop.half);
  assert.ok(inLake(JETTY.x, JETTY.z1 - 0.2, -2.5), 'its end well out in the water');
  assert.ok(onJetty(JETTY.x, JETTY.z1 - 1, 0.3) && !onJetty(JETTY.x + 2, JETTY.z1 - 1));
  for (const b of BENCHES) assert.ok(!(Math.abs(b.at[0] - JETTY.x) < 1.5 && b.at[1] > JETTY.z0 - 1 && b.at[1] < JETTY.z1 + 1), 'no bench on the jetty');
});

test('walkers, joggers and dog walkers: on their paths, never through each other in a lane', () => {
  const m = moment();
  const walkers = PARK_PEOPLE.filter((p) => LANES.some((l) => p.id.startsWith(`${l.id}-`)));
  assert.ok(walkers.length >= 40, `${walkers.length} walkers`);
  for (const t of TIMES)
    for (const p of walkers) {
      p.at(t, m);
      assert.ok(onPath([m.x, m.z], 0.05), `${p.id} off the paths at ${m.x.toFixed(1)}, ${m.z.toFixed(1)} (t ${t})`);
      assert.ok(!inLake(m.x, m.z, 0.5));
    }
  for (const l of LANES) {
    const mine = walkers.filter((p) => p.id.startsWith(`${l.id}-`));
    assert.equal(mine.length, l.count);
    for (const t of TIMES.slice(0, 40)) {
      const at = mine.map((p) => ({ ...p.at(t, m) }));
      // (a lane's people spread round it; on a path walked both ways as one thin loop they pass each other a lane apart)
      for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) assert.ok(Math.hypot(at[i].x - at[j].x, at[i].z - at[j].z) > 0.7, `${l.id}: two too close`);
    }
    assert.ok(l.loop.len / l.count > 4, `${l.id}: room for each`);
  }
  assert.ok(PARK_PEOPLE.some((p) => p.at(3, m).clip === 'jog'), 'some jog');
  assert.equal(new Set(PARK_PEOPLE.map((p) => p.id)).size, PARK_PEOPLE.length, 'ids unique');
});

test('dogs: on the lead ahead of their walkers, on the park, never in the water', () => {
  assert.ok(DOGS.length >= 5);
  const m = moment();
  const d = { x: 0, z: 0, ry: 0, speed: 0 };
  for (const t of TIMES)
    for (const dog of DOGS) {
      dog.at(t, d);
      PARK_PEOPLE[dog.walker].at(t, m);
      const gap = Math.hypot(d.x - m.x, d.z - m.z);
      assert.ok(gap > 0.6 && gap < LEAD.ahead + 0.6, `a lead of ${gap.toFixed(2)}`);
      assert.ok(inPark([d.x, d.z], -0.2) && !inLake(d.x, d.z, 0.4));
    }
});

test('picnics: in the glades, off the paths, the water and the trees', () => {
  assert.ok(PICNICS.length >= 6, `${PICNICS.length} picnics`);
  for (const p of PICNICS) {
    assert.ok(inPark(p.at, 3) && !onPath(p.at, 2.5) && !inLake(p.at[0], p.at[1], LOOP_OUT + 2));
    assert.ok(PARK_TREES.every((t) => Math.hypot(t.x - p.at[0], t.z - p.at[1]) > 2.5));
    assert.ok(p.people.length >= 2);
  }
});

test('the games: every player stays on their court, every ball on (or over) it', () => {
  const m = moment();
  const courtOf = { football: COURTS[1], tennis: COURTS[0], basketball: COURTS[2] };
  for (const [game, ids] of Object.entries(GAMES)) {
    const c = courtOf[game as keyof typeof courtOf];
    for (const id of ids) {
      const p = PARK_PEOPLE.find((q) => q.id === id)!;
      for (const t of TIMES) {
        p.at(t, m);
        assert.ok(inRect(c.rect, m.x, m.z, -0.2), `${id} off ${c.id} at ${m.x.toFixed(1)}, ${m.z.toFixed(1)}`);
      }
    }
  }
  const b = { x: 0, y: 0, z: 0 };
  for (const ball of BALLS) {
    const c = courtOf[ball.kind];
    let last: typeof b | null = null;
    for (let t = 0; t < 120; t += 1 / 30) {
      ball.at(t, b);
      assert.ok(inRect(c.rect, b.x, b.z, 0.2), `the ${ball.kind} off its court at ${b.x.toFixed(1)}, ${b.z.toFixed(1)} (t ${t.toFixed(2)})`);
      assert.ok(b.y >= BALL_R[ball.kind] - 1e-6 && b.y < 3.5);
      // It never jumps: at most a hard pass's distance in a frame
      if (last) assert.ok(Math.hypot(b.x - last.x, b.z - last.z) < 1.2, `the ${ball.kind} jumped at t ${t.toFixed(2)}`);
      last = { ...b };
    }
  }
});

test('boats: in the water, clear of the rim and the jetty, never meeting', () => {
  assert.ok(BOATS.filter((b) => !b.moored).length >= 6);
  const p = { x: 0, z: 0, yaw: 0 };
  for (const t of TIMES) {
    const at = BOATS.map((b) => ({ ...b.at(t, p), b }));
    for (const a of at) {
      const h = HULL[a.b.kind];
      const [fx, fz] = [Math.cos(a.yaw), -Math.sin(a.yaw)];
      for (const [l, w] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const x = a.x + (fx * l * h.l) / 2 + (fz * w * h.w) / 2;
        const z = a.z + (fz * l * h.l) / 2 - (fx * w * h.w) / 2;
        assert.ok(inLake(x, z, -0.3), `a ${a.b.kind}'s corner out of the water at ${x.toFixed(1)}, ${z.toFixed(1)}`);
        if (!a.b.moored) assert.ok(!(Math.abs(x - JETTY.x) < JETTY.half + 0.2 && z < JETTY.z1 + 0.2), 'a boat into the jetty');
      }
    }
    for (let i = 0; i < at.length; i++)
      for (let j = i + 1; j < at.length; j++)
        if (!(at[i].b.moored && at[j].b.moored)) assert.ok(Math.hypot(at[i].x - at[j].x, at[i].z - at[j].z) > 1.3, 'two boats meet');
  }
  // The rings stay well inside the loop
  for (const q of lakeLine(-4, 60)) assert.ok(inLake(q[0], q[1]));
});
