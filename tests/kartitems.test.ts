// The items mode (kartitems.ts, docs/kart-west-plan.md Phase 7): the boxes' rows on plain asphalt clear of the pads,
// the jump, the deck and the tunnel; what a box gives by place; a race with items (boxes taken and back, every item
// used, slicks spinning karts, shields shrugging them off, everyone home); your button; no records kept.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOXES, ITEM, ITEM_IDS, ROW_S, TRACK_HALF, drawItem } from '../src/scripts/city3d/kartitems';
import { CIRCUIT, enclosed } from '../src/scripts/city3d/kartcircuit';
import { NO_INPUT, createKartSim, tune, type KartEvent } from '../src/scripts/city3d/kart-sim';
import { KART_SPECS, PLAYER_KARTS } from '../src/scripts/city3d/mykart';
import { frame, locate } from '../src/scripts/city3d/kartpark';
import { finishKartRace, newSave } from '../src/scripts/city3d/tycoon';

const gap = (a: number, b: number) => Math.min(Math.abs(a - b), CIRCUIT.L - Math.abs(a - b));
const rivals = PLAYER_KARTS.flatMap((k) => [k, k]).slice(0, 7).map((k) => ({ kart: k, tune: tune(KART_SPECS[k], 'sport') }));

test('the item boxes stand in rows across the track on plain asphalt, clear of the pads, the jump, the line, the deck and the tunnel', () => {
  assert.equal(BOXES.length, 12);
  const c = CIRCUIT;
  for (const s of ROW_S) {
    for (let d = -3; d <= 3; d++) assert.ok(!enclosed(frame(c, s + d)) && Math.abs(frame(c, s + d).k) < 0.08, `a row on a bend, the deck or the tunnel at ${s.toFixed(1)}`);
    for (const p of c.pads) assert.ok(gap(s, p.s) > 6 && gap(s, p.s + p.len) > 6, 'a row on a pad');
    assert.ok(gap(s, c.jump) > 9 && gap(s, c.start) > 8, 'a row by the jump or the line');
  }
  for (const b of BOXES) assert.ok(Math.abs(locate(c, b.x, b.z, null).lateral) < TRACK_HALF - 0.5, 'a box off the asphalt');
});

test('a box gives the leaders mostly oil, the back markers mostly a boost, a shield either way', () => {
  const share = (place: number) => {
    const n: Record<string, number> = { boost: 0, shield: 0, oil: 0 };
    for (let i = 0; i < 1000; i++) n[drawItem(place, 8, (i + 0.5) / 1000)]++;
    return n;
  };
  const front = share(1);
  const back = share(8);
  assert.ok(front.oil > front.boost && back.boost > back.oil);
  assert.ok(front.shield > 100 && back.shield > 100);
  for (const id of ITEM_IDS) assert.ok(front[id] + back[id] > 0);
});

test('a race with items: boxes taken and back, every item used, slicks spin karts and shields shrug them off; everyone home', () => {
  const counts: Record<string, number> = {};
  const used = new Set<string>();
  let blocked = 0;
  let slickSpins = 0;
  for (const seed of [3, 4, 5]) {
    const sim = createKartSim({ course: 'circuit', cup: 'rookie', cls: 'sport', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, 'sport') }, rivals, seed, laps: 3, auto: true, items: true });
    assert.ok(sim.items);
    for (const k of sim.racers) assert.ok('item' in k && 'shieldT' in k);
    for (let t = 0; t < 600 && !sim.over; t += 1 / 60) {
      const ev: KartEvent[] = sim.step(1 / 60, NO_INPUT);
      for (const e of ev) {
        counts[e.kind] = (counts[e.kind] ?? 0) + 1;
        if (e.kind === 'useItem') used.add(e.item);
        if (e.kind === 'blocked') blocked++;
        if (e.kind === 'spin' && e.by === -1) slickSpins++;
      }
      assert.ok(sim.slicks.length <= ITEM.most);
    }
    assert.ok(sim.over, `seed ${seed}: everyone finished`);
  }
  assert.ok((counts.item ?? 0) > 20, `${counts.item} items taken`);
  assert.deepEqual([...used].sort(), [...ITEM_IDS].sort(), 'every item used');
  assert.ok(slickSpins > 0, 'a slick spun someone');
  assert.ok(blocked >= 0);
});

test('your button uses what you hold, once a press; a pure race has no items; an items race keeps no records', () => {
  const sim = createKartSim({ course: 'circuit', cup: 'rookie', cls: 'sport', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, 'sport') }, rivals: [], seed: 1, laps: 2, items: true });
  for (let i = 0; i < 400 && !sim.started; i++) sim.step(1 / 60, NO_INPUT);
  const p = sim.player;
  p.item = 'boost';
  let uses = 0;
  for (let i = 0; i < 30; i++) for (const e of sim.step(1 / 60, { ...NO_INPUT, throttle: 1, item: true })) if (e.kind === 'useItem') uses++;
  assert.equal(uses, 1, 'held down, it goes once');
  assert.ok(p.boostT > 0 && p.item === null);
  p.item = 'shield';
  for (let i = 0; i < 5; i++) for (const e of sim.step(1 / 60, { ...NO_INPUT, throttle: 1, item: true })) if (e.kind === 'useItem') uses++;
  assert.equal(uses, 1, 'not again until it comes back up');
  for (const e of sim.step(1 / 60, { ...NO_INPUT, throttle: 1, item: false })) if (e.kind === 'useItem') uses++;
  for (const e of sim.step(1 / 60, { ...NO_INPUT, throttle: 1, item: true })) if (e.kind === 'useItem') uses++;
  assert.equal(uses, 2);
  assert.ok((p.shieldT ?? 0) > ITEM.shieldT - 0.1);
  const pure = createKartSim({ course: 'circuit', cup: 'rookie', cls: 'sport', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, 'sport') }, rivals: [], seed: 1, laps: 2 });
  assert.ok(!pure.items && !('item' in pure.player));
  const s = newSave(0);
  const r = finishKartRace(s, { course: 'circuit', cup: 'rookie', cls: 'sport', place: 1, seconds: 70, laps: [30, 31], items: true, now: 0 });
  assert.ok(!r.lapRecord && !s.karts.records['circuit:sport']);
});
