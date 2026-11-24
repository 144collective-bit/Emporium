// The golf course's ground (golfground.ts, docs/golf-plan.md Phase 1, the owner's call: "we will need to make elevation
// changes and hills"): today's ground at the club's edge and off it, no step anywhere, real hills (the Knob in the
// corner), holes that climb and drop, level tees, gently tilted greens, playable fairways, bunkers dug in, lakes held
// in their basins under their shores, the clubhouse's grounds level.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLUB_GROUNDS, COURSE, COURSE_RECT, HOLES, LAKES, TEE, along, bunkersOf, fairwayEnd, fairwayHalf, greenOf, inCourse, lakeAt, lengthOf, teeOf, type Pt } from '../src/scripts/city3d/golf';
import { BUNKER_DEPTH, FEATURES, GREEN_TILT, SHORE_OVER, golfHeightAt, greenLevel, groundsLevel, lakeWater, teeLevel } from '../src/scripts/city3d/golfground';

const H = golfHeightAt;

test("today's ground off the course and at its edge", () => {
  for (const p of COURSE) assert.ok(Math.abs(H(...p)) < 1e-6, `the edge at ${p}: ${H(...p)}`);
  for (const p of [[300, -300], [700, 10], [480, -200], [200, -600], [790, -400], [400, -745]] as Pt[]) assert.equal(H(...p), 0, `off the course at ${p}`);
});

test('no step anywhere: the ground rises and falls smoothly', () => {
  const [x0, z0, x1, z1] = COURSE_RECT;
  let steepest = 0;
  let where = '';
  for (let x = x0; x <= x1; x += 2)
    for (let z = z0; z <= z1; z += 2) {
      if (!inCourse(x, z)) continue;
      const [a, b, c] = [H(x, z), H(x + 0.5, z), H(x, z + 0.5)];
      const s = Math.hypot(b - a, c - a) / 0.5;
      if (s > steepest) [steepest, where] = [s, `${x}, ${z}`];
    }
  assert.ok(steepest < 1, `the ground climbs ${steepest.toFixed(2)} at ${where}`);
});

test('real hills: the Knob in the corner, the ground over 10 high, the lake beds the lowest', () => {
  const knob = FEATURES.find((f) => f.id === 'knob')!;
  let [lo, hi] = [Infinity, -Infinity];
  const [x0, z0, x1, z1] = COURSE_RECT;
  for (let x = x0; x <= x1; x += 3)
    for (let z = z0; z <= z1; z += 3) {
      const h = H(x, z);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
  assert.ok(hi >= 10 && hi <= 16, `the highest is ${hi.toFixed(1)}`);
  assert.ok(lo >= -3.5, `the lowest is ${lo.toFixed(1)}`);
  assert.ok(H(...knob.at) > 9, 'the Knob stands up');
  // (holes that climb and drop: at least four with two tiles or more between tee and green; the Knob's par 3 drops)
  const change = HOLES.map((h) => greenLevel(h) - teeLevel(h));
  assert.ok(change.filter((d) => Math.abs(d) >= 2).length >= 4, `the climbs and drops: ${change.map((d) => d.toFixed(1)).join(', ')}`);
  assert.ok(change[4] <= -5, "hole 5 drops off the Knob");
  assert.ok(change[3] >= 5, 'hole 4 climbs it');
});

test('the tees level, the greens a plane tilted gently up to the back', () => {
  for (const h of HOLES) {
    const t = teeOf(h);
    for (let u = -TEE[0]; u <= TEE[0]; u += 1)
      for (let v = -TEE[1]; v <= TEE[1]; v += 0.8) {
        const [x, z] = [t.at[0] + t.dir[0] * u - t.dir[1] * v, t.at[1] + t.dir[1] * u + t.dir[0] * v];
        assert.ok(Math.abs(H(x, z) - teeLevel(h)) < 0.02, `hole ${h.n}'s tee not level at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      }
    const g = greenOf(h);
    for (let a = 0; a < 16; a++)
      for (const r of [0, 0.4, 0.8, 1]) {
        const [c, s] = [Math.cos((a / 16) * Math.PI * 2), Math.sin((a / 16) * Math.PI * 2)];
        const [u, v] = [c * h.green[0] * r, s * h.green[1] * r];
        const [x, z] = [g.at[0] + g.dir[0] * u - g.dir[1] * v, g.at[1] + g.dir[1] * u + g.dir[0] * v];
        assert.ok(Math.abs(H(x, z) - (greenLevel(h) + GREEN_TILT * u)) < 0.02, `hole ${h.n}'s green off its plane at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      }
    assert.ok(GREEN_TILT <= 0.025, 'a green putts');
  }
});

test('the fairways playable: gentle along and across', () => {
  for (const h of HOLES) {
    if (!h.fairway) continue;
    for (let s = h.fairway.from; s <= fairwayEnd(h); s += 4) {
      const { at, dir } = along(h, s);
      for (const k of [-0.8, 0, 0.8]) {
        const o = k * fairwayHalf(h, s);
        const [x, z] = [at[0] - dir[1] * o, at[1] + dir[0] * o];
        const e = 0.5;
        const g = Math.hypot(H(x + e, z) - H(x - e, z), H(x, z + e) - H(x, z - e)) / (2 * e);
        // (by a bunker biting its edge, the bunker's own slope)
        if (bunkersOf(h).some((b) => Math.hypot(b.at[0] - x, b.at[1] - z) < Math.max(...b.r) + 1.5)) continue;
        assert.ok(g < 0.18, `hole ${h.n}'s fairway climbs ${g.toFixed(2)} at ${s}`);
      }
    }
  }
});

test('the bunkers dug in, the lakes in their basins under their shores', () => {
  for (const h of HOLES)
    for (const b of bunkersOf(h)) assert.ok(H(...b.at) <= H(...b.at, false) - BUNKER_DEPTH * 0.9, `hole ${h.n}'s bunker isn't dug in`);
  for (const l of LAKES) {
    const w = lakeWater(l);
    assert.ok(H(...l.at) < w - 0.9, `${l.name}'s bed`);
    // (all round its shore the ground stands over the water, so it holds it)
    const [c, s] = [Math.cos(l.turn), Math.sin(l.turn)];
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * Math.PI * 2;
      const [u, v] = [Math.cos(a) * l.r[0], Math.sin(a) * l.r[1]];
      const [dx, dz] = [u * c - v * s, u * s + v * c];
      const r = 1 / lakeAt(l, l.at[0] + dx, l.at[1] + dz);
      const p: Pt = [l.at[0] + dx * r * 1.001, l.at[1] + dz * r * 1.001];
      assert.ok(H(...p) >= w + SHORE_OVER - 0.05, `${l.name}'s shore under its water at ${p}`);
    }
  }
  // (no tee or green under any lake's water)
  for (const h of HOLES) for (const l of LAKES) assert.ok(Math.min(teeLevel(h), greenLevel(h)) > lakeWater(l) + 0.3 || Math.hypot(h.line[0][0] - l.at[0], h.line[0][1] - l.at[1]) > 80, `hole ${h.n} by ${l.name}`);
});

test("the clubhouse's grounds level", () => {
  const [x0, z0, x1, z1] = CLUB_GROUNDS;
  for (let x = x0; x <= x1; x += 2) for (let z = z0; z <= z1; z += 2) assert.ok(Math.abs(H(x, z) - groundsLevel()) < 1e-6, `${x}, ${z}`);
  assert.ok(groundsLevel() > 2, 'on its rise');
});

test('each hole as long as its line, its green over its approach', () => {
  for (const h of HOLES) {
    assert.ok(lengthOf(h) > 0);
    const g = greenOf(h);
    const front: Pt = [g.at[0] - g.dir[0] * (h.green[0] + 8), g.at[1] - g.dir[1] * (h.green[0] + 8)];
    assert.ok(H(...g.at) >= H(...front) - 0.6, `hole ${h.n}'s green sunk under its approach`);
  }
});

test("Clubhouse Drive's bed: from today's ground at the club's edge up to the grounds, gentle along, level across", async () => {
  const { driveBed, driveBedY } = await import('../src/scripts/city3d/golfground');
  const { DRIVE_HALF, insetOf } = await import('../src/scripts/city3d/golf');
  const b = driveBed();
  assert.ok(b.pts.length >= 3, 'it comes onto the course');
  assert.ok(Math.abs(insetOf(...b.pts[0])) < 1.5, "from the club's edge");
  assert.ok(Math.abs(H(...b.pts[0])) < 0.05 && Math.abs(H(...b.pts.at(-1)!) - groundsLevel()) < 0.02, 'today\'s ground to the grounds');
  const L = b.cum.at(-1)! - b.s0;
  assert.ok((b.y1 - b.y0) / L <= 0.06, `it climbs ${((b.y1 - b.y0) / L).toFixed(3)}`);
  for (let i = 1; i < b.pts.length; i++) {
    const [p, q] = [b.pts[i - 1], b.pts[i]];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const [nx, nz] = [-(q[1] - p[1]) / l, (q[0] - p[0]) / l];
    for (let t = 0.2; t <= 0.8; t += 0.2) {
      const s = b.cum[i - 1] + t * l;
      const [x, z] = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      // (its first few tiles, by the club's edge, hold today's ground as the edge does)
      if (s < b.s0) continue;
      for (const k of [-1, 0, 1]) assert.ok(Math.abs(H(x + nx * k * DRIVE_HALF, z + nz * k * DRIVE_HALF) - driveBedY(s)) < 0.03, `the drive not level at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  }
});
