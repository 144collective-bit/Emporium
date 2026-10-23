// The evening's and the weather's small reactions (dusk.ts, city life plan Phase 4): lamps coming on one
// by one, thunder in heavy rain, the steam vents in The Trenches, the wind in the trees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLASH_LEN, FLASH_PEAK, FLICKER_ON, PUFF_LEN, PUFF_RISE, RUMBLE_DELAY, STRIKE_GAP, SWITCH_FROM, SWITCH_TO, TRICKLE, VENTS, VENT_N, flickerOn, lampGlow, newLamp, newStorm, puff, stormStep, ventsNear, windStrength } from '../src/scripts/city3d/dusk';
import { TRENCH_CROSSINGS, TRENCH_STREETS, inTrenches } from '../src/scripts/city3d/trenches';
import { distToStreet } from '../src/scripts/city3d/streetplan';

test('lamps come on one by one through the dusk, each with its own moment, delay and flicker, and go off with the day', () => {
  const N = 200;
  const lamps = Array.from({ length: N }, newLamp);
  const seeds = Array.from({ length: N }, (_, i) => ((i * 0.7548776662) % 1));
  // Dusk coming in slowly: the count on climbs, never falls, from none to all
  let was = 0;
  for (let night = 0; night <= 1; night += 0.02) {
    const t = night * 3600;
    let on = 0;
    lamps.forEach((l, i) => {
      if (lampGlow(l, night, seeds[i], t) > 0) on++;
    });
    assert.ok(on >= was - 0, `fewer on at ${night}`);
    if (night < SWITCH_FROM) assert.equal(on, 0);
    was = on;
  }
  assert.equal(was, N, 'all on by full night');
  // A sudden night: their moments come at once, but each waits its own while and flickers, so they trickle on over TRICKLE
  const fresh = Array.from({ length: N }, newLamp);
  const ons: number[] = [];
  const settled: number[] = [];
  for (let t = 0; t < TRICKLE + FLICKER_ON + 1; t += 0.05) {
    fresh.forEach((l, i) => {
      const g = lampGlow(l, 1, seeds[i], t);
      if (g > 0 && ons[i] === undefined) ons[i] = t;
      if (g === 1 && settled[i] === undefined) settled[i] = t;
      assert.ok(g >= 0 && g <= 1);
    });
  }
  assert.equal(ons.filter((x) => x !== undefined).length, N);
  assert.ok(Math.max(...ons) - Math.min(...ons) > TRICKLE * 0.7, `spread ${Math.max(...ons) - Math.min(...ons)}`);
  settled.forEach((s, i) => assert.ok(s - ons[i] <= FLICKER_ON + 0.1, `lamp ${i} took ${s - ons[i]} to settle`));
  // Without the trickle (reduced motion) a lamp past its moment is simply on
  assert.equal(lampGlow(newLamp(), 1, 0.5, 0, false), 1);
  assert.equal(lampGlow(newLamp(), SWITCH_FROM / 2, 0.5, 0, false), 0);
  // Day again: off
  const l = newLamp();
  lampGlow(l, 1, 0.2, 100);
  assert.equal(lampGlow(l, 0, 0.2, 200), 0);
  assert.equal(l.on, -1);
  // The flicker starts low and ends full
  assert.ok(flickerOn(0.01, 0.3) < 0.5);
  assert.equal(flickerOn(FLICKER_ON, 0.3), 1);
  assert.ok(SWITCH_TO > SWITCH_FROM);
});

test('thunder: none in light rain; in heavy rain a soft flash now and then, each followed by one rumble a few seconds later', () => {
  const dt = 1 / 60;
  const dry = newStorm();
  for (let t = 0; t < 600; t += dt) {
    const o = stormStep(dry, 0.5, dt);
    assert.equal(o.flash, 0);
    assert.equal(o.rumble, 0);
  }
  const s = newStorm(0.2);
  const flashes: number[] = [];
  const rumbles: number[] = [];
  let peak = 0;
  let inFlash = false;
  for (let t = 0; t < 900; t += dt) {
    const o = stormStep(s, 1, dt);
    if (o.flash > 0 && !inFlash) flashes.push(t);
    inFlash = o.flash > 0;
    peak = Math.max(peak, o.flash);
    if (o.rumble > 0) rumbles.push(t);
    assert.ok(o.flash <= FLASH_PEAK + 1e-9);
  }
  assert.ok(flashes.length >= 10 && flashes.length <= 60, `${flashes.length} strikes in 15 min`);
  assert.equal(rumbles.length, flashes.length, 'a rumble for every flash');
  assert.ok(peak > FLASH_PEAK * 0.9);
  for (let i = 1; i < flashes.length; i++) {
    const gap = flashes[i] - flashes[i - 1];
    assert.ok(gap >= STRIKE_GAP[0] - 0.1 && gap <= STRIKE_GAP[1] + 0.1, `gap ${gap}`);
  }
  flashes.forEach((f, i) => {
    const d = rumbles[i] - f;
    assert.ok(d >= RUMBLE_DELAY[0] - 0.05 && d <= RUMBLE_DELAY[1] + 0.05, `rumble ${d} s after`);
  });
  // A flash is over within FLASH_LEN
  const one = newStorm(0.2);
  one.next = 0;
  stormStep(one, 1, dt);
  let len = 0;
  while (stormStep(one, 1, dt).flash > 0) len += dt;
  assert.ok(len <= FLASH_LEN + 0.05);
  // Standing still (dt 0: reduced motion), nothing happens
  const still = newStorm(0.2);
  for (let i = 0; i < 1000; i++) assert.equal(stormStep(still, 1, 0).flash, 0);
});

test('the vents lie in The Trenches\' streets, in a lane, clear of the junctions; the nearest few steam; a puff rises and fades', () => {
  assert.ok(VENTS.length >= 10, `${VENTS.length} vents`);
  for (const v of VENTS) {
    assert.ok(inTrenches(v[0], v[1], 1), `vent at ${v} outside The Trenches`);
    const s = TRENCH_STREETS.find((st) => distToStreet(st, v) < st.half - 0.2);
    assert.ok(s, `vent at ${v} off the asphalt`);
    for (const c of TRENCH_CROSSINGS) assert.ok(Math.hypot(c.at[0] - v[0], c.at[1] - v[1]) >= 4.5, `vent at ${v} in a junction`);
  }
  const near = ventsNear(VENTS[3][0], VENTS[3][1]);
  assert.equal(near.length, VENT_N);
  assert.equal(near[0], 3);
  for (let i = 1; i < near.length; i++) {
    const d = (k: number) => Math.hypot(VENTS[k][0] - VENTS[3][0], VENTS[k][1] - VENTS[3][1]);
    assert.ok(d(near[i]) >= d(near[i - 1]));
  }
  assert.ok(puff(0, 0).alpha < 0.01 && puff(0, 0).y === 0);
  const mid = puff(PUFF_LEN / 2, 0);
  assert.ok(mid.alpha > 0.4 && mid.y > 0.5 && mid.y < PUFF_RISE);
  assert.ok(puff(PUFF_LEN * 0.999, 0).alpha < 0.01);
  assert.ok(puff(PUFF_LEN * 0.999, 0).size > mid.size);
});

test('the wind is stronger in the rain', () => {
  assert.ok(windStrength(1) > windStrength(0) * 2);
  assert.ok(windStrength(0) > 0);
});
