// The golf course's layout (golf.ts, docs/golf-plan.md Phase 1, the owner's call, 2026-11-21): eighteen holes, par 72,
// in the open north-east corner past Crestmont's hills, each nine out from the clubhouse and home to it, the holes
// apart, everything on the club's land and the club's land clear of everything that stands, its edge wandering.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLUB_CENTRE,
  CLUB_GROUNDS,
  COURSE,
  COURSE_RECT,
  DRIVE,
  EDGE_STEP,
  FRINGE,
  HOLES,
  LAKES,
  PAR_LENGTH,
  along,
  bunkersOf,
  ellipseAt,
  fairwayEnd,
  fairwayHalf,
  greenOf,
  inCourse,
  inLake,
  insetOf,
  lakeAt,
  lengthOf,
  nearestOn,
  onGreen,
  surfaceAt,
  teeOf,
  type Hole,
  type Pt,
} from '../src/scripts/city3d/golf';
import { FENCE, inAirbase } from '../src/scripts/city3d/airbase';
import { WALL_INNER } from '../src/scripts/city3d/wall';
import { TERRAIN_RECT } from '../src/scripts/city3d/hills';
import { keptOff } from '../src/scripts/city3d/landuse';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { distTo } from '../src/scripts/city3d/streetfaces';

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Every point along a hole's line, every 2 */
const lineSamples = (h: Hole) => {
  const out: Pt[] = [];
  for (let s = 0; s <= lengthOf(h); s += 2) out.push(along(h, s).at);
  out.push(h.line.at(-1)!);
  return out;
};

test('eighteen holes, par 72: four par 3s, ten par 4s, four par 5s, each its par\'s length', () => {
  assert.deepEqual(
    HOLES.map((h) => h.n),
    Array.from({ length: 18 }, (_, i) => i + 1),
  );
  assert.equal(
    HOLES.reduce((s, h) => s + h.par, 0),
    72,
  );
  for (const [par, count] of [[3, 4], [4, 10], [5, 4]] as const) assert.equal(HOLES.filter((h) => h.par === par).length, count, `par ${par}s`);
  for (const nine of [HOLES.slice(0, 9), HOLES.slice(9)]) assert.equal(nine.reduce((s, h) => s + h.par, 0), 36, 'each nine par 36');
  for (const h of HOLES) {
    const [lo, hi] = PAR_LENGTH[h.par];
    assert.ok(lengthOf(h) >= lo && lengthOf(h) <= hi, `hole ${h.n} (par ${h.par}) is ${lengthOf(h).toFixed(0)} long`);
    assert.equal(h.fairway === null, h.par === 3, `hole ${h.n}: a fairway on every par 4 and 5, none on a par 3`);
    assert.ok(h.name.length > 0 && !/\d/.test(h.name), `hole ${h.n}'s name`);
  }
  assert.equal(new Set(HOLES.map((h) => h.name)).size, 18, 'every hole its own name');
});

test('each nine out from the clubhouse and home to it; each tee a short walk from the green before', () => {
  for (const n of [1, 10]) assert.ok(dist(HOLES[n - 1].line[0], CLUB_CENTRE) < 90, `hole ${n}'s tee by the clubhouse`);
  for (const n of [9, 18]) assert.ok(dist(HOLES[n - 1].line.at(-1)!, CLUB_CENTRE) < 90, `hole ${n}'s green by the clubhouse`);
  for (let i = 1; i < 18; i++) {
    const walk = dist(HOLES[i - 1].line.at(-1)!, HOLES[i].line[0]);
    assert.ok(walk < (i === 9 ? 80 : 60), `from hole ${i}'s green to hole ${i + 1}'s tee is ${walk.toFixed(0)}`);
  }
});

test('the holes keep apart: no two lines within 45 (but the next tee after a green, and by the clubhouse)', () => {
  for (const a of HOLES)
    for (const b of HOLES) {
      if (b.n <= a.n || b.n - a.n === 1) continue;
      let m = Infinity;
      for (const p of lineSamples(a)) if (dist(p, CLUB_CENTRE) > 80) m = Math.min(m, nearestOn(b, ...p).d);
      assert.ok(m >= 45, `holes ${a.n} and ${b.n} come within ${m.toFixed(1)}`);
    }
  // (and next to each other only at the green and the next tee: no line crosses the one before or after)
  for (let i = 1; i < 18; i++) {
    const [a, b] = [HOLES[i - 1], HOLES[i]];
    for (const p of lineSamples(a)) if (dist(p, a.line.at(-1)!) > 30) assert.ok(nearestOn(b, ...p).d > 20, `holes ${a.n} and ${b.n} cross at ${p}`);
  }
});

test("everything on the club's land, well in from its edge; tees, greens and fairways out of the water", () => {
  for (const h of HOLES) {
    for (const p of lineSamples(h)) assert.ok(insetOf(...p) >= 20, `hole ${h.n}'s line ${insetOf(...p).toFixed(1)} from the edge at ${p}`);
    assert.ok(insetOf(...h.line.at(-1)!) >= Math.max(...h.green) + 12, `hole ${h.n}'s green`);
    for (const b of bunkersOf(h)) assert.ok(insetOf(...b.at) >= 10, `a bunker of hole ${h.n}`);
    // (the tee and the green dry, all over)
    const t = teeOf(h);
    for (let u = -5; u <= 5; u++) for (let v = -3; v <= 3; v++) assert.ok(!inLake(t.at[0] + t.dir[0] * u - t.dir[1] * v, t.at[1] + t.dir[1] * u + t.dir[0] * v, -0.15), `hole ${h.n}'s tee in the water`);
    const g = greenOf(h);
    for (let a = 0; a < 24; a++)
      for (const r of [0, 0.5, 1]) {
        const [c, s] = [Math.cos((a / 24) * Math.PI * 2), Math.sin((a / 24) * Math.PI * 2)];
        const [u, v] = [c * h.green[0] * r, s * h.green[1] * r];
        assert.ok(!inLake(g.at[0] + g.dir[0] * u - g.dir[1] * v, g.at[1] + g.dir[1] * u + g.dir[0] * v, -0.25), `hole ${h.n}'s green in the water`);
      }
    // (and the fairway, out to its edge)
    if (h.fairway)
      for (let s = h.fairway.from; s <= fairwayEnd(h); s += 3) {
        const { at, dir } = along(h, s);
        for (const k of [-1, 0, 1]) {
          const o = k * fairwayHalf(h, s);
          assert.ok(!inLake(at[0] - dir[1] * o, at[1] + dir[0] * o, -0.15), `hole ${h.n}'s fairway in the water at ${s}`);
        }
      }
  }
  for (const l of LAKES) {
    assert.ok(insetOf(...l.at) >= Math.max(...l.r) + 10, `${l.name} in from the edge`);
    assert.equal(lakeAt(l, ...l.at), 0);
  }
  // (the lakes apart)
  for (const a of LAKES) for (const b of LAKES) if (a !== b) assert.ok(dist(a.at, b.at) > Math.max(...a.r) + Math.max(...b.r) + 20, `${a.name} and ${b.name}`);
});

test('the bunkers: none on a green, each greenside one by its green, none in the water', () => {
  for (const h of HOLES)
    for (const b of bunkersOf(h)) {
      for (let a = 0; a < 16; a++)
        for (const r of [0, 0.6, 1]) {
          const [c, s] = [Math.cos((a / 16) * Math.PI * 2), Math.sin((a / 16) * Math.PI * 2)];
          const [u, v] = [c * b.r[0] * r, s * b.r[1] * r];
          const p: Pt = [b.at[0] + b.dir[0] * u - b.dir[1] * v, b.at[1] + b.dir[1] * u + b.dir[0] * v];
          assert.ok(onGreen(h, ...p) > 1 + 0.5 / Math.min(...h.green), `hole ${h.n}'s bunker on its green at ${p}`);
          assert.ok(!inLake(...p), `hole ${h.n}'s bunker in the water`);
        }
    }
  for (const h of HOLES)
    for (const [i, k] of h.bunkers.entries())
      if (k[4] === 'g') {
        const b = bunkersOf(h)[i];
        assert.ok(onGreen(h, ...b.at) < 1 + 12 / Math.min(...h.green), `hole ${h.n}'s greenside bunker is by its green`);
      }
  assert.ok(HOLES.every((h) => h.bunkers.length >= 2), 'every hole has its bunkers');
});

test("the club's land is clear of everything that stands: the air base, the wall, the hills, every street and keep", () => {
  for (const p of COURSE) {
    assert.ok(!inAirbase(...p) && distTo(FENCE, p, true) >= 18, `the edge by the air base's fence at ${p}`);
    assert.ok(p[0] - WALL_INNER[0] >= 18 && WALL_INNER[2] - p[0] >= 18 && p[1] - WALL_INNER[1] >= 18 && WALL_INNER[3] - p[1] >= 18, `the edge by the wall at ${p}`);
  }
  // (nothing kept off anywhere on it: no street, district or landmark; and none of it on the hills' land)
  const [x0, z0, x1, z1] = COURSE_RECT;
  for (let x = x0; x <= x1; x += 4)
    for (let z = z0; z <= z1; z += 4) {
      if (!inCourse(x, z)) continue;
      assert.equal(keptOff(x, z, false), null, `something stands on the course at ${x}, ${z}`);
      assert.ok(!(x > TERRAIN_RECT[0] && x < TERRAIN_RECT[2] && z > TERRAIN_RECT[1] && z < TERRAIN_RECT[3]), `on the hills' land at ${x}, ${z}`);
    }
  for (const s of PLAN.streets) for (const p of s.pts) assert.ok(insetOf(...p) < -10, `${s.id} runs onto the course at ${p}`);
});

test('the drive in: off the country road east, up the hills\' east foot to the grounds, off the course', () => {
  const road = PLAN.streets.find((s) => s.id === 'ew0-e')!;
  const [a, b] = [road.pts[0], road.pts.at(-1)!];
  const start = DRIVE[0];
  assert.ok(Math.abs(start[1] - a[1]) < 1e-6 && start[0] > a[0] + 20 && start[0] < b[0] - 20, 'it leaves the country road');
  const end = DRIVE.at(-1)!;
  assert.ok(end[0] >= CLUB_GROUNDS[0] - 4 && end[1] <= CLUB_GROUNDS[3] + 10, 'it ends at the grounds');
  for (let i = 1; i < DRIVE.length; i++) {
    const [p, q] = [DRIVE[i - 1], DRIVE[i]];
    for (let t = 0; t <= 1; t += 0.1) {
      const r: Pt = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      // (but its last stretch, in across the club's edge to the grounds)
      if (r[1] < CLUB_GROUNDS[3] + 18) continue;
      assert.ok(insetOf(...r) < -3, `the drive on the course at ${r}`);
      assert.ok(r[0] > TERRAIN_RECT[2] + 4, `the drive on the hills' land at ${r}`);
    }
  }
  // (it wanders as the land does: no long straight)
  for (let i = 2; i < DRIVE.length; i++) {
    const [p, q, r] = [DRIVE[i - 2], DRIVE[i - 1], DRIVE[i]];
    const turn = Math.abs(Math.atan2(r[1] - q[1], r[0] - q[0]) - Math.atan2(q[1] - p[1], q[0] - p[0]));
    assert.ok(turn > 0.01, `the drive runs straight on at ${q}`);
  }
});

test("the club's edge wanders: no ruler-straight run", () => {
  for (let i = 0; i < COURSE.length; i++) {
    const [p, q] = [COURSE[i], COURSE[(i + 1) % COURSE.length]];
    assert.ok(dist(p, q) <= EDGE_STEP * 1.25, `a long straight edge at ${p}`);
    assert.ok(Math.abs(p[0] - q[0]) > 0.05 && Math.abs(p[1] - q[1]) > 0.05, `an edge square to the axes at ${p}`);
  }
});

test("what's underfoot: tees, greens, fringes, fairways, bunkers, the water, the grounds, off the course", () => {
  for (const h of HOLES) {
    assert.equal(surfaceAt(...h.line[0]), 'tee', `hole ${h.n}'s tee`);
    assert.equal(surfaceAt(...h.line.at(-1)!), 'green', `hole ${h.n}'s green`);
    const g = greenOf(h);
    // (just past the green's edge, short of it: its fringe)
    const r = h.green[0] + FRINGE / 2;
    const p: Pt = [g.at[0] - g.dir[0] * r, g.at[1] - g.dir[1] * r];
    assert.ok(['fringe', 'bunker'].includes(surfaceAt(...p)!), `hole ${h.n}'s fringe is ${surfaceAt(...p)}`);
    for (const b of bunkersOf(h)) assert.equal(surfaceAt(...b.at), 'bunker', `hole ${h.n}'s bunker`);
    if (h.fairway) {
      const mid = along(h, (h.fairway.from + fairwayEnd(h)) / 2).at;
      assert.equal(surfaceAt(...mid), 'fairway', `hole ${h.n}'s fairway`);
    }
  }
  for (const l of LAKES) assert.equal(surfaceAt(...l.at), 'water', l.name);
  assert.equal(surfaceAt(...CLUB_CENTRE), 'grounds');
  for (const p of [[300, -300], [700, 10], [480, -200], [0, 0]] as Pt[]) assert.equal(surfaceAt(...p), null, `off the course at ${p}`);
  // (and every point on the land is something)
  for (let x = COURSE_RECT[0]; x <= COURSE_RECT[2]; x += 9) for (let z = COURSE_RECT[1]; z <= COURSE_RECT[3]; z += 9) assert.equal(surfaceAt(x, z) !== null, inCourse(x, z), `${x}, ${z}`);
  // (the green's middle is a green's ellipse's 0)
  for (const h of HOLES) assert.equal(ellipseAt(greenOf(h).at, greenOf(h).dir, h.green, ...greenOf(h).at), 0);
});
