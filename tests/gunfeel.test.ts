// How each gun feels (gunfeel.ts, docs/weapons-plan.md Phase 1), through the rules (combat-sim.ts): recoil
// patterns the same every time, the sight coming up over the gun's ADS time, moving and jumping opening the
// cone, and the shotgun loading a shell at a time, a pull stopping it and firing after the pump.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TICK, WEAPONS, createSim, type SimEvent, type WeaponId } from '../src/scripts/city3d/combat-sim';
import { ADS, MOVE_FREE, MOVE_FULL, RECOIL, SHELLS, STRING_GAP, moveSpread, recoilAt, shellsTime } from '../src/scripts/city3d/gunfeel';
import { GAITS } from '../src/scripts/city3d/movesim';
import { applyGunMods } from '../src/scripts/city3d/catalog';
import { newReloadFrame, reloadAt } from '../src/scripts/city3d/gunfit';

const IDS = Object.keys(WEAPONS) as WeaponId[];

/** A sim with one player geared up with `gun`, looking down an empty range (nothing to hit) */
function range(gun: WeaponId) {
  const sim = createSim({ ground: 0, rayWorld: () => 200, seed: 3 });
  const me = sim.addPlayer('me');
  sim.setInput('me', { origin: new THREE.Vector3(0, 50, 0), dir: new THREE.Vector3(0, 1, 0) });
  sim.equip('me', gun);
  sim.drain();
  return { sim, me };
}
const run = (sim: ReturnType<typeof createSim>, seconds: number) => {
  const out: SimEvent[] = [];
  for (let t = 0; t < seconds - 1e-9; t += TICK) {
    sim.advance(TICK);
    out.push(...sim.drain());
  }
  return out;
};

test('every gun has its feel: recoil, ADS time, the cost of moving', () => {
  for (const id of IDS) {
    assert.ok(RECOIL[id] && RECOIL[id].peak >= 1 && RECOIL[id].recover > 0 && RECOIL[id].recover <= 1, id);
    assert.ok(ADS[id] > 0.1 && ADS[id] < 0.5, id);
    assert.ok(moveSpread(id, 0, false, 0) === 0, `${id}: standing costs nothing`);
  }
  // The speeds are the walk and the run (movesim.ts)
  assert.equal(MOVE_FREE, GAITS.walk);
  assert.equal(MOVE_FULL, GAITS.run);
  // Light guns come up quicker than heavy ones
  assert.ok(ADS.smg < ADS.rifle && ADS.rifle < ADS.dmr && ADS.dmr < ADS.lmg);
});

test('recoil: the same pattern every time, climbing on the full-auto guns, never pulling down', () => {
  for (const id of IDS) {
    const k = WEAPONS[id].kick;
    for (let n = 0; n < 40; n++) {
      const a = recoilAt(id, k, n);
      const b = recoilAt(id, k, n);
      assert.deepEqual(a, b, `${id} shot ${n}`);
      assert.ok(a.up >= k * 0.99 && a.up <= k * (1 + RECOIL[id].climb) + 1e-12, `${id} shot ${n}: up ${a.up}`);
      assert.ok(Math.abs(a.side) < a.up, `${id} shot ${n}: more up than across`);
    }
    // The first shot goes up, barely across
    assert.ok(Math.abs(recoilAt(id, k, 0).side) < k * 0.25, id);
  }
  // A spray climbs over its first shots
  assert.ok(recoilAt('rifle', 1, 8).up > recoilAt('rifle', 1, 0).up * 1.5);
  assert.ok(recoilAt('lmg', 1, 14).up > recoilAt('lmg', 1, 0).up * 1.7);
  // ...and sways both ways over a long one
  const sides = Array.from({ length: 20 }, (_, n) => recoilAt('rifle', 1, n).side);
  assert.ok(Math.min(...sides) < 0 && Math.max(...sides) > 0);
  // The grip mod's softer kick softens the whole pattern
  const soft = applyGunMods(WEAPONS.rifle, { barrel: 0, mag: 0, grip: 3 }).kick;
  assert.ok(recoilAt('rifle', soft, 6).up < recoilAt('rifle', WEAPONS.rifle.kick, 6).up);
});

test('a string counts its shots, and starts again after a pause', () => {
  const { sim } = range('rifle');
  sim.setInput('me', { fire: true });
  const shots = run(sim, 0.5).filter((e) => e.type === 'shot');
  assert.ok(shots.length >= 4);
  shots.forEach((e, i) => assert.equal(e.type === 'shot' && e.n, i));
  sim.setInput('me', { fire: false });
  run(sim, STRING_GAP + 1 / WEAPONS.rifle.rate + 0.05);
  sim.setInput('me', { fire: true });
  const again = run(sim, TICK * 2).find((e) => e.type === 'shot');
  assert.ok(again && again.type === 'shot' && again.n === 0);
  // The Tri-Tap's bursts carry on one string, a step a burst
  const tri = range('burst');
  const ns: number[] = [];
  for (let b = 0; b < 3; b++) {
    tri.sim.setInput('me', { fire: true });
    for (const e of run(tri.sim, 0.25)) if (e.type === 'shot') ns.push(e.n);
    tri.sim.setInput('me', { fire: false });
    // (past the burst's pause, inside the string's gap)
    run(tri.sim, 0.2);
  }
  assert.deepEqual(ns, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

test('the sight comes up over the gun\'s ADS time, the cone with it, and not while reloading', () => {
  for (const id of IDS) {
    const { sim, me } = range(id);
    const W = WEAPONS[id];
    assert.ok(Math.abs(sim.spreadOf('me') - W.spreadHip) < 1e-9);
    sim.setInput('me', { aim: true });
    run(sim, ADS[id] / 2);
    assert.ok(me.ads > 0.4 && me.ads < 0.6, `${id}: half way at half the time (${me.ads})`);
    const mid = sim.spreadOf('me');
    assert.ok(mid < W.spreadHip && mid > W.spreadAim, id);
    run(sim, ADS[id] / 2 + TICK);
    assert.equal(me.ads, 1);
    assert.ok(Math.abs(sim.spreadOf('me') - W.spreadAim) < 1e-9, id);
  }
  const { sim, me } = range('rifle');
  sim.setInput('me', { fire: true });
  run(sim, 0.3);
  sim.setInput('me', { fire: false, aim: true });
  sim.reload('me');
  run(sim, 0.3);
  assert.equal(me.ads, 0, 'down while the magazine is out');
});

test('moving and jumping open the cone; aiming forgives half of it', () => {
  for (const id of IDS) {
    const { sim } = range(id);
    const still = sim.spreadOf('me');
    sim.setInput('me', { move: GAITS.walk });
    assert.equal(sim.spreadOf('me'), still, `${id}: a walk is free`);
    sim.setInput('me', { move: GAITS.run });
    const running = sim.spreadOf('me');
    assert.ok(running > still, id);
    sim.setInput('me', { move: GAITS.sprint });
    assert.equal(sim.spreadOf('me'), running, `${id}: no more than a run`);
    sim.setInput('me', { move: 0, air: true });
    assert.ok(sim.spreadOf('me') > running, `${id}: the air costs more than running`);
    assert.ok(moveSpread(id, GAITS.run, false, 1) === moveSpread(id, GAITS.run, false, 0) * 0.5);
  }
  // It reaches the shots: from a run at the hip, shots land wider than standing
  const spreadAt = (move: number) => {
    const { sim } = range('rifle');
    sim.setInput('me', { move, fire: true, dir: new THREE.Vector3(0, 0, -1) });
    const shots = run(sim, 0.11).filter((e) => e.type === 'shot');
    return Math.max(...shots.map((e) => (e.type === 'shot' ? Math.hypot(e.to.x, e.to.y - 50) : 0)));
  };
  assert.ok(spreadAt(GAITS.run) > spreadAt(0) * 1.5);
});

test('the shotgun loads a shell at a time, each its event, and takes its shells\' time', () => {
  const S = SHELLS.shotgun!;
  const { sim, me } = range('shotgun');
  sim.setInput('me', { fire: true });
  run(sim, TICK);
  sim.setInput('me', { fire: false });
  run(sim, 1);
  sim.setInput('me', { fire: true });
  run(sim, TICK);
  sim.setInput('me', { fire: false });
  run(sim, 1);
  assert.equal(me.mag, WEAPONS.shotgun.mag - 2);
  const reserve = me.reserve;
  sim.reload('me');
  assert.equal(me.shells, 2);
  assert.ok(Math.abs(me.reloadTotal - shellsTime('shotgun', 2)) < 1e-9);
  // Nothing in while opening up; then one, then the other
  let ev = run(sim, S.open - TICK);
  assert.equal(me.mag, WEAPONS.shotgun.mag - 2);
  ev = run(sim, S.shell + TICK * 2);
  assert.equal(me.mag, WEAPONS.shotgun.mag - 1);
  assert.equal(ev.filter((e) => e.type === 'reload' && e.phase === 'shell').length, 1);
  ev = run(sim, S.shell + S.close);
  assert.equal(me.mag, WEAPONS.shotgun.mag);
  assert.equal(me.reserve, reserve - 2);
  assert.ok(ev.some((e) => e.type === 'reload' && e.phase === 'done'));
  assert.equal(me.reload, 0);
  // An empty gun loads all six, never more than the spare shells
  const empty = range('shotgun');
  empty.me.mag = 0;
  empty.me.reserve = 4;
  empty.sim.reload('me');
  assert.equal(empty.me.shells, 4);
  run(empty.sim, shellsTime('shotgun', 4) + TICK);
  assert.deepEqual([empty.me.mag, empty.me.reserve], [4, 0]);
  // Other guns reload in one go, as before
  const rifle = range('rifle');
  rifle.sim.setInput('me', { fire: true });
  run(rifle.sim, 0.3);
  rifle.sim.setInput('me', { fire: false });
  rifle.sim.reload('me');
  assert.equal(rifle.me.shells, 0);
  assert.equal(rifle.me.reloadTotal, WEAPONS.rifle.reload);
});

test('a pull with a shell in stops the shotgun\'s reload and fires after the pump', () => {
  const S = SHELLS.shotgun!;
  const { sim, me } = range('shotgun');
  me.mag = 1;
  sim.reload('me');
  run(sim, S.open + S.shell + TICK * 2);
  assert.equal(me.mag, 2);
  // A tap of the trigger: the reload stops, and the shot comes after the pump, trigger held or not
  sim.setInput('me', { fire: true });
  let ev = run(sim, TICK);
  sim.setInput('me', { fire: false });
  assert.ok(ev.some((e) => e.type === 'reload' && e.phase === 'stop'));
  assert.equal(me.reload, 0);
  assert.ok(!ev.some((e) => e.type === 'shot'));
  ev = run(sim, S.stop + TICK * 2);
  assert.equal(ev.filter((e) => e.type === 'shot' && e.pellet === 0).length, 1);
  assert.equal(me.mag, 1);
  // Empty, a pull can't stop it
  const dry = range('shotgun');
  dry.me.mag = 0;
  dry.sim.reload('me');
  dry.sim.setInput('me', { fire: true });
  ev = run(dry.sim, S.open / 2);
  assert.ok(!ev.some((e) => e.type === 'reload' && e.phase === 'stop'));
  assert.ok(dry.me.reload > 0);
});

test('the shotgun\'s reload clip pushes a shell in for every shell the rules load, at rest at both ends', () => {
  const f = newReloadFrame();
  for (const n of [1, 2, 4, 6]) {
    for (const r of [0, 1]) {
      reloadAt('shotgun', r, f, n);
      assert.ok(f.hand === 0 && f.away === 0 && f.roll === 0, `${n} shells at ${r}`);
    }
    // Count the trips to the belt
    let trips = 0;
    let out = false;
    for (let r = 0; r <= 1; r += 0.001) {
      reloadAt('shotgun', r, f, n);
      if (!out && f.away > 0.9) {
        trips++;
        out = true;
      } else if (f.away < 0.1) out = false;
    }
    assert.equal(trips, n, `${n} shells`);
  }
});
