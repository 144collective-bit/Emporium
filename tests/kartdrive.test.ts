// The karts' driving (docs/kart-west-plan.md Phase 5, kart-sim.ts): the timed start (a boost for gas down just before
// the GO, bogged down for gas held from early), the slipstream (a tow right behind another kart, in its line, at speed)
// and the drift's three stages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NO_INPUT, SLIP, START, T, createKartSim, tune, type KartEvent } from '../src/scripts/city3d/kart-sim';
import { KART_SPECS, PLAYER_KARTS } from '../src/scripts/city3d/mykart';
import { at } from '../src/scripts/city3d/kartpark';

const solo = () => createKartSim({ course: 'circuit', cup: 'time', cls: 'sport', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, 'sport') }, rivals: [], seed: 1, laps: 2 });
/** Run the countdown with the gas going down at `press` seconds left (null: never), then `after` seconds of full gas */
function launch(press: number | null, after = 1.5) {
  const sim = solo();
  const ev: KartEvent[] = [];
  for (let i = 0; i < 400 && (!sim.started || sim.time < after); i++) {
    const gas = press !== null && sim.countdown <= press ? 1 : 0;
    ev.push(...sim.step(1 / 60, { ...NO_INPUT, throttle: sim.started ? 1 : gas }));
  }
  return { sim, ev };
}

test('the start: gas down just before the GO launches you with a boost, held from early it bogs down, never down neither', () => {
  const good = launch((START.late + START.early) / 2);
  assert.ok(good.ev.some((e) => e.kind === 'startBoost'), 'a rocket start');
  const plain = launch(null);
  assert.ok(!plain.ev.some((e) => e.kind === 'startBoost' || e.kind === 'stall'));
  const early = launch(2.6);
  assert.ok(early.ev.some((e) => e.kind === 'stall'), 'bogged down');
  assert.ok(!early.ev.some((e) => e.kind === 'startBoost'));
  // A second and a half in: the rocket start ahead of the plain one, the bogged one behind it
  assert.ok(good.sim.player.progress > plain.sim.player.progress + 0.5, `${good.sim.player.progress.toFixed(2)} against ${plain.sim.player.progress.toFixed(2)}`);
  assert.ok(early.sim.player.progress < plain.sim.player.progress - 0.2, `${early.sim.player.progress.toFixed(2)} against ${plain.sim.player.progress.toFixed(2)}`);
  // Too late (the gas down at the GO itself) is just a start
  assert.ok(!launch(0.05).ev.some((e) => e.kind === 'startBoost' || e.kind === 'stall'));
});

test('the slipstream: right behind another kart in its line at speed, the tow charges and pulls you along; out of its line, none', () => {
  const rivals = [{ kart: 'rocket' as const, tune: tune(KART_SPECS.rocket, 'sport') }];
  const run = (lateral: number) => {
    const sim = createKartSim({ course: 'circuit', cup: 'rookie', cls: 'sport', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, 'sport') }, rivals, seed: 2, laps: 2 });
    for (let i = 0; i < 400 && !sim.started; i++) sim.step(1 / 60, NO_INPUT);
    const c = sim.course;
    // Both on the start straight at speed, the player 3.5 behind the rival, `lateral` across from its line
    const lead = sim.racers.find((k) => k !== sim.player)!;
    const place = (k: typeof lead, s: number, lat: number) => {
      const q = at(c, s, lat);
      Object.assign(k, { x: q.x, z: q.z, y: q.y, yaw: q.yaw, s, lateral: lat, speed: k.tune.top * 0.85, vx: Math.cos(q.yaw) * k.tune.top * 0.85, vz: -Math.sin(q.yaw) * k.tune.top * 0.85, progress: s - c.start + c.L });
    };
    const s0 = c.start + 1;
    place(lead, s0 + 3.5, 0);
    place(sim.player, s0, lateral);
    const ev: KartEvent[] = [];
    let towed = false;
    for (let i = 0; i < 60; i++) {
      // (the rival held 3.5 ahead on its line, so only the tow differs)
      place(lead, sim.player.s + 3.5, 0);
      ev.push(...sim.step(1 / 60, { ...NO_INPUT, throttle: 1 }));
      if (sim.player.slip) towed = true;
    }
    return { towed, ev };
  };
  const behind = run(0);
  assert.ok(behind.towed && behind.ev.some((e) => e.kind === 'slip' && e.on), 'towed');
  const aside = run(SLIP.width + 0.6);
  assert.ok(!aside.towed, 'out of its line');
});

test('the drift\'s three stages come in order as it\'s held, each a longer boost when let go', () => {
  assert.ok(T.drift[0] < T.drift[1] && T.drift[1] < T.drift[2]);
  assert.ok(T.driftBoost[0] < T.driftBoost[1] && T.driftBoost[1] < T.driftBoost[2]);
  for (const k of PLAYER_KARTS) assert.ok(KART_SPECS[k]);
});

test('your splits: an event at the end of each lap\'s first and second thirds, in order, before the lap\'s', () => {
  const sim = createKartSim({ course: 'circuit', cup: 'time', cls: 'sport', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, 'sport') }, rivals: [], seed: 1, laps: 2, auto: true });
  const seen: string[] = [];
  let last = -1;
  for (let t = 0; t < 200 && !sim.done; t += 1 / 60)
    for (const e of sim.step(1 / 60, NO_INPUT)) {
      if (e.kind === 'split') {
        seen.push(`s${e.sector}`);
        assert.ok(e.time > last);
        last = e.time;
      }
      if (e.kind === 'lap' || e.kind === 'finish') seen.push('line');
    }
  assert.deepEqual(seen, ['s1', 's2', 'line', 's1', 's2', 'line']);
});
