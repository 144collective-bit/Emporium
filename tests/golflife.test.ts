/*
 * The golf course's life (docs/golf-plan.md Phase 5): src/scripts/city3d/golflife.ts.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BESIDE, CARTS, CART_LOOPS, CART_PACE, DUCKS, FLAG, FURNITURE, GOLFERS, GROUPS, MARKERS, MOW_HOLE, MOW_LOOP, cartAt, duckAt, golferAt, mowerAt, onLoop } from '../src/scripts/city3d/golflife';
import { HOLES, LAKES, TEE, fairwayIn, fromPaths, inCourse, inLake, lakeAt, onGreen, onTee, surfaceAt, teeOf } from '../src/scripts/city3d/golf';
import { GOLF_CLUBHOUSE } from '../src/scripts/city3d/golflift';

test('what stands on the course: a flag on every green, the tee markers on the tee, the washer, bench and sign beside it off the play, a rake by each bunker', () => {
  assert.equal(FURNITURE.length, HOLES.length);
  for (const [i, f] of FURNITURE.entries()) {
    const h = HOLES[i];
    assert.equal(f.n, h.n);
    // The flag well inside its green
    assert.ok(onGreen(h, ...f.pin) < 0.6, `hole ${h.n}: the pin's at ${onGreen(h, ...f.pin).toFixed(2)} of its green`);
    assert.equal(surfaceAt(...f.pin), 'green', `hole ${h.n}: the pin's on ${surfaceAt(...f.pin)}`);
    // The markers on the tee, ahead of its middle, either side of the line
    for (const m of f.markers) assert.ok(onTee(h, ...m), `hole ${h.n}: a marker's off the tee at ${m}`);
    const gap = Math.hypot(f.markers[0][0] - f.markers[1][0], f.markers[0][1] - f.markers[1][1]);
    assert.ok(Math.abs(gap - 2 * MARKERS.across) < 1e-6);
    // The washer, the bench and the sign beside the tee, on the grass by it (never in play, the water or the path)
    for (const [what, p] of [
      ['washer', f.washer],
      ['bench', f.bench.at],
      ['sign', f.sign.at],
    ] as const) {
      const s = surfaceAt(...p);
      assert.ok(s && BESIDE.includes(s), `hole ${h.n}: its ${what} is on ${s} at ${p.map((v) => v.toFixed(1))}`);
      assert.ok(!onTee(h, ...p), `hole ${h.n}: its ${what} is on the tee`);
      assert.ok(fromPaths(...p) > 1.4, `hole ${h.n}: its ${what} is on the path`);
      assert.ok(!inLake(...p, -1), `hole ${h.n}: its ${what} is in the water`);
      const t = teeOf(h).at;
      assert.ok(Math.hypot(p[0] - t[0], p[1] - t[1]) < TEE[0] + 8, `hole ${h.n}: its ${what} is far from the tee`);
    }
    // The bench faces the tee
    const [dx, dz] = [teeOf(h).at[0] - f.bench.at[0], teeOf(h).at[1] - f.bench.at[1]];
    assert.ok(Math.sin(f.bench.ry) * dx + Math.cos(f.bench.ry) * dz > 0, `hole ${h.n}: its bench faces away from the tee`);
    // A rake by every bunker, at its edge, out of the water
    assert.equal(f.rakes.length, h.bunkers.length);
    for (const r of f.rakes) {
      const s = surfaceAt(...r.at);
      assert.ok(s && s !== 'water' && s !== 'green' && s !== 'tee', `hole ${h.n}: a rake is on ${s} at ${r.at.map((v) => v.toFixed(1))}`);
    }
  }
  // (a flag a little over a person's height)
  assert.ok(FLAG.stick > 0.9 && FLAG.stick < 1.4);
});

test('the golfers: groups round each nine for ever, off every tee, a putt on every green, never in the water or off the course', () => {
  assert.equal(GOLFERS.length, GROUPS.flat().reduce((a, b) => a + b, 0));
  const [gx0, gz0, gx1, gz1] = GOLF_CLUBHOUSE.grounds;
  const onGrounds = (x: number, z: number) => x > gx0 - 3 && x < gx1 + 3 && z > gz0 - 3 && z < gz1 + 3;
  for (const p of GOLFERS) {
    // Their legs run on end to end round the whole loop
    assert.equal(p.legs[0].t0, 0, p.id);
    for (let i = 1; i < p.legs.length; i++) assert.ok(Math.abs(p.legs[i].t0 - p.legs[i - 1].t1) < 1e-6, `${p.id}: a gap at leg ${i}`);
    assert.ok(Math.abs(p.legs.at(-1)!.t1 - p.loop) < 1e-6, `${p.id} ends at ${p.legs.at(-1)!.t1} of ${p.loop}`);
    // ... and back where they began
    const [a, b] = [p.legs[0].a, p.legs.at(-1)!.b];
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01, `${p.id}: the loop doesn't close`);
    // A round of a nine takes a while (an hour and a half or so, as nine holes do), never for ever
    assert.ok(p.loop > 1200 && p.loop < 6600, `${p.id}: a round of ${p.loop.toFixed(0)} s`);
    // Each walk at the pace, each step on from where the last ended
    for (const l of p.legs) {
      if (l.clip === 'walk') assert.ok(Math.abs(Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]) / (l.t1 - l.t0) - 0.5) < 1e-6);
      else assert.deepEqual(l.a, l.b);
    }
    // Every shot: a full swing off each tee (on it) and along the fairways, two putts on every green
    const nine = p.group >= 10 ? 1 : 0;
    const holes = HOLES.slice(nine * 9, nine * 9 + 9);
    for (const h of holes) {
      assert.ok(p.legs.some((l) => l.clip === 'golf' && onTee(h, ...l.a)), `${p.id}: no drive off the ${h.n}th tee`);
      assert.equal(p.legs.filter((l) => l.clip === 'putt' && onGreen(h, ...l.a) < 1.05).length, 2, `${p.id}: not two putts on the ${h.n}th green`);
    }
    // Never in the water, never off the club's land (but over the clubhouse's grounds, which are on it)
    const at = { x: 0, z: 0, ry: 0, clip: 'look' as const, speed: 0 } as Parameters<typeof golferAt>[2];
    for (let t = 0; t < p.loop; t += 0.75) {
      golferAt(p, t - p.offset, at);
      assert.ok(!inLake(at.x, at.z, -0.2), `${p.id} in the water at ${at.x.toFixed(1)}, ${at.z.toFixed(1)} (${t.toFixed(0)} s)`);
      assert.ok(inCourse(at.x, at.z) || onGrounds(at.x, at.z), `${p.id} off the course at ${at.x.toFixed(1)}, ${at.z.toFixed(1)}`);
    }
  }
  // A group's golfers never standing in one another (they cross as they walk out to their own balls, as golfers do)
  for (const g of new Set(GOLFERS.map((p) => p.group))) {
    const mine = GOLFERS.filter((p) => p.group === g);
    const pts = mine.map(() => ({ x: 0, z: 0, ry: 0, clip: 'look' as const, speed: 0 }) as Parameters<typeof golferAt>[2]);
    let closest = Infinity;
    for (let t = 0; t < mine[0].loop; t += 0.5) {
      mine.forEach((p, k) => golferAt(p, t - p.offset, pts[k]));
      for (let i = 0; i < mine.length; i++)
        for (let j = i + 1; j < mine.length; j++) if (pts[i].clip !== 'walk' && pts[j].clip !== 'walk') closest = Math.min(closest, Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z));
    }
    assert.ok(closest > 0.45, `group ${g}'s golfers come within ${closest.toFixed(2)} of each other`);
  }
  // The groups on a nine spread round it: no two of a nine's groups on the same tee at once
  for (const nine of [0, 1]) {
    const firsts = GOLFERS.filter((p) => (p.group >= 10 ? 1 : 0) === nine && p.k === 0);
    const at = { x: 0, z: 0, ry: 0, clip: 'look' as const, speed: 0 } as Parameters<typeof golferAt>[2];
    const bt = { ...at };
    for (let t = 0; t < 3600; t += 5)
      for (let i = 0; i < firsts.length; i++)
        for (let j = i + 1; j < firsts.length; j++) {
          golferAt(firsts[i], t, at);
          golferAt(firsts[j], t, bt);
          assert.ok(Math.hypot(at.x - bt.x, at.z - bt.z) > 1.5 || at.clip === 'walk' || bt.clip === 'walk', `two groups meet at ${at.x.toFixed(0)}, ${at.z.toFixed(0)} (${t} s)`);
        }
  }
});

test('the carts round each nine on its cart paths, the mower up and down the 10th fairway, the ducks on the water', () => {
  const [gx0, gz0, gx1, gz1] = GOLF_CLUBHOUSE.grounds;
  const onGrounds = (x: number, z: number) => x > gx0 - 3 && x < gx1 + 3 && z > gz0 - 3 && z < gz1 + 3;
  for (const [n, l] of CART_LOOPS.entries()) {
    // The way round: every stretch on the club's land or its grounds, never in the water, no long jump
    assert.ok(l.len > 1500, `the ${n ? 'back' : 'front'} nine's carts go ${l.len.toFixed(0)} round`);
    for (let u = 0; u < l.len; u += 1) {
      const { at } = onLoop(l, u);
      assert.ok(!inLake(...at, -0.3), `a cart's way is in the water at ${at.map((v) => v.toFixed(1))}`);
      assert.ok(inCourse(...at) || onGrounds(...at), `a cart's way leaves the course at ${at.map((v) => v.toFixed(1))}`);
      // (on a path: the cart paths' own lines, or across the clubhouse's grounds between them)
      assert.ok(fromPaths(...at) < 0.5 || onGrounds(...at), `a cart's way is off its path at ${at.map((v) => v.toFixed(1))}`);
    }
  }
  // The carts move at their pace and keep apart on their nine
  for (const [i] of CARTS.entries())
    for (const t0 of [10, 200, 700]) {
      // (how far it goes in a second, in small steps: round a corner too)
      let d = 0;
      for (let k = 0; k < 20; k++) {
        const [a, b] = [cartAt(i, t0 + k / 20), cartAt(i, t0 + (k + 1) / 20)];
        d += Math.hypot(b.x - a.x, b.z - a.z);
      }
      assert.ok(Math.abs(d - CART_PACE) < 0.08, `cart ${i} goes ${d.toFixed(2)} a second at ${t0} s`);
    }
  for (let t = 0; t < 1200; t += 3) {
    const [a, b] = [cartAt(0, t), cartAt(1, t)];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 4, `the front nine's carts meet at ${t} s`);
  }
  // The mower on the 10th's fairway, round its stripes
  for (let u = 0; u < MOW_LOOP.len; u += 1) {
    const { at } = onLoop(MOW_LOOP, u);
    assert.ok(fairwayIn(HOLES[MOW_HOLE], ...at) > -1.5, `the mower leaves the fairway at ${at.map((v) => v.toFixed(1))}`);
  }
  const m = mowerAt(0);
  assert.ok(Number.isFinite(m.x) && Number.isFinite(m.ry));
  // The ducks: a few on every lake, always well inside its shore
  for (const [li] of LAKES.entries()) assert.ok(DUCKS.filter((d) => d.lake === li).length >= 2);
  for (const [i, d] of DUCKS.entries())
    for (let t = 0; t < 600; t += 4) {
      const p = duckAt(i, t);
      assert.ok(lakeAt(LAKES[d.lake], p.x, p.z) < 0.8, `a duck on ${LAKES[d.lake].name} comes ashore at ${t} s`);
    }
});

test("the golfers' look, swing and putt, and the course's sound: the club in hand, the backswing to the right and the finish to the left, birds over the course", async () => {
  const { roleOf, cityOutfit, seeded } = await import('../src/scripts/city3d/crowdlook');
  const { GOLF, GOLF_SECONDS, PUTT_SECONDS, SWING_KEYS, golfPose, puttPose } = await import('../src/scripts/city3d/acts');
  const { newPose } = await import('../src/scripts/city3d/skeleton');
  const { secondsOf } = await import('../src/scripts/city3d/crowdclips');
  const { ambienceAt } = await import('../src/scripts/city3d/ambience');
  // A golfer's own look, and every golfer one
  for (const p of GOLFERS) assert.equal(roleOf({ clip: 'walk', id: p.id }), 'golfer');
  for (let i = 0; i < 40; i++) {
    const o = cityOutfit(seeded((i + 0.5) / 40), { role: 'golfer' });
    // (white shoes; the trousers left to the slot's kind: a spare slot's pieces are the boot's)
    assert.equal(o.shoes, '#f3f2f7');
    assert.equal(o.bottoms, undefined);
  }
  // (the riders on the carts and the mower are the crowd's own, not golfers)
  assert.notEqual(roleOf({ clip: 'sit', id: 'golf-cart-0' }), 'golfer');
  // The swing and the putt each take their row's loop, which the golfers' shots last
  assert.equal(secondsOf('golf'), GOLF_SECONDS);
  assert.equal(secondsOf('putt'), PUTT_SECONDS);
  for (const p of GOLFERS)
    for (const l of p.legs) {
      if (l.clip === 'golf') assert.ok(Math.abs(l.t1 - l.t0 - GOLF_SECONDS) < 1e-6);
      if (l.clip === 'putt') assert.ok(Math.abs(l.t1 - l.t0 - PUTT_SECONDS) < 1e-6);
    }
  // The swing: at the top the shoulders turned away and the hands up on the right (+x), at the finish turned through
  // and up on the left (the target's side); at the address and the strike, the hands low in front
  const at = (k: number) => SWING_KEYS.find(([, v]) => v === k)![0];
  const p = newPose();
  golfPose(p, at(1));
  assert.ok(p.twist > 0.5 && GOLF.hands[1][1].x > 0.1 && GOLF.hands[1][1].y > 0.3);
  golfPose(p, SWING_KEYS[4][0]);
  assert.ok(p.twist < -0.5 && GOLF.hands[1][3].x < -0.1 && GOLF.hands[1][3].y > 0.3);
  golfPose(p, 0);
  assert.ok(Math.abs(p.twist) < 1e-6 && GOLF.hands[0][0].y < 0 && p.headPitch < -0.3);
  // The putt: bent over the ball, the head still, the stroke small
  const q = newPose();
  for (const t of [0, 1.25, 1.65]) {
    puttPose(q, t);
    assert.ok(q.lean > 0.35 && q.headPitch < -0.4 && Math.abs(q.twist) < 0.2);
  }
  // The course's sound: birds and the lawns' sprinklers over it, the wind softened
  const mid = ambienceAt(560, -560, 0, 0);
  assert.ok(mid.park > 0.7, `birds over the course: ${mid.park}`);
  assert.ok(mid.crest > 0.6, `the sprinklers over the course: ${mid.crest}`);
});
