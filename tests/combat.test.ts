// Target practice rules (combat-sim.ts): seeded, so a server and a browser agree;
// guns unlock with score; a geared-up player hits a dummy and scores; the Tri-Tap
// fires three a pull; the Armoury's mods (catalog.ts) change a gun through the sim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BURST_PAUSE, DUMMIES, POINTS, TICK, WEAPONS, createSim, weaponUnlocked, type WeaponId } from '../src/scripts/city3d/combat-sim';
import { GUN_MOD_EFFECT, NO_GUN_MODS, applyGunMods } from '../src/scripts/city3d/catalog';

/** A sim with one player aiming at the first dummy from 6 away */
function atFirstDummy(seed = 1) {
  const sim = createSim({ ground: 0.18, rayWorld: () => 200, seed });
  sim.addPlayer('me');
  const target = sim.targets.find((t) => t.kind === 'dummy')!;
  const aimAt = new THREE.Vector3(target.x, target.y + 0.8, target.z);
  const origin = aimAt.clone().add(new THREE.Vector3(0, 0, 6));
  sim.setInput('me', { origin, dir: aimAt.clone().sub(origin).normalize(), aim: true });
  return { sim, target };
}
function shootFirstDummy(seed: number) {
  const { sim } = atFirstDummy(seed);
  sim.setInput('me', { fire: true });
  sim.advance(0.2);
  const before = sim.drain().filter((e) => e.type === 'shot').length;
  sim.equip('me', 'rifle');
  sim.drain();
  for (let i = 0; i < 30; i++) sim.advance(1 / 30);
  return { sim, events: sim.drain(), before };
}
const shots = (events: { type: string }[]) => events.filter((e) => e.type === 'shot').length;
/** Hold the trigger (or let it go) for `seconds`, in frames */
function hold(sim: ReturnType<typeof createSim>, fire: boolean, seconds: number) {
  sim.setInput('me', { fire });
  for (let t = 0; t < seconds; t += 1 / 30) sim.advance(1 / 30);
}

test('nobody fires before gearing up', () => {
  assert.equal(shootFirstDummy(1).before, 0);
});

test('geared up, shots at a dummy hit it and score', () => {
  const { sim, events } = shootFirstDummy(1);
  assert.ok(events.some((e) => e.type === 'shot'));
  assert.ok(events.some((e) => e.type === 'hit'));
  assert.ok(sim.players.get('me')!.score >= POINTS.hit);
});

test('the same seed gives the same game', () => {
  const a = shootFirstDummy(7).events.map((e) => e.type).join();
  const b = shootFirstDummy(7).events.map((e) => e.type).join();
  assert.equal(a, b);
});

test('guns unlock with lifetime score, the rifle from the start', () => {
  assert.ok(weaponUnlocked('rifle', 0));
  assert.ok(!weaponUnlocked('dmr', WEAPONS.dmr.need - 1));
  assert.ok(weaponUnlocked('dmr', WEAPONS.dmr.need));
  assert.ok(!weaponUnlocked('laser', 1e9));
  assert.ok(DUMMIES.length > 0);
});

test('the Tri-Tap fires exactly three rounds a pull, and nothing more until the trigger is let go', () => {
  const { sim } = atFirstDummy();
  sim.equip('me', 'burst');
  sim.drain();
  hold(sim, true, 1);
  assert.equal(shots(sim.drain()), WEAPONS.burst.burst);
  // Still held: nothing
  hold(sim, true, 1);
  assert.equal(shots(sim.drain()), 0);
  // Let go and pull again: another three
  hold(sim, false, 0.1);
  hold(sim, true, 1);
  assert.equal(shots(sim.drain()), WEAPONS.burst.burst);
  assert.equal(sim.players.get('me')!.mag, WEAPONS.burst.mag - 2 * WEAPONS.burst.burst!);
});

test('a burst finishes after the trigger is let go, spaced at the rate, then pauses', () => {
  const { sim } = atFirstDummy();
  sim.equip('me', 'burst');
  sim.drain();
  // One tick of trigger, then off: the other two rounds still come
  sim.setInput('me', { fire: true });
  sim.advance(1 / 60);
  assert.equal(shots(sim.drain()), 1);
  sim.setInput('me', { fire: false });
  const times: number[] = [];
  for (let i = 0; i < 60; i++) {
    sim.advance(1 / 60);
    for (const e of sim.drain()) if (e.type === 'shot') times.push(sim.time);
  }
  assert.equal(times.length, 2);
  // Spaced at the gun's rate (to the nearest tick, like full auto)
  assert.ok(times[1] - times[0] >= 1 / WEAPONS.burst.rate - TICK - 1e-9);
  assert.ok(times[1] - times[0] <= 1 / WEAPONS.burst.rate + TICK + 1e-9);
  // A pull straight after the last round waits out the pause
  const me = sim.players.get('me')!;
  assert.ok(me.cooldown <= 0);
  sim.setInput('me', { fire: true });
  sim.advance(1 / 60);
  sim.setInput('me', { fire: false });
  for (let i = 0; i < 20; i++) sim.advance(1 / 60);
  sim.drain();
  assert.ok(me.cooldown > 0 && me.cooldown <= BURST_PAUSE);
});

test('the revolver fires once a pull', () => {
  const { sim } = atFirstDummy();
  sim.equip('me', 'revolver');
  sim.drain();
  hold(sim, true, 1);
  assert.equal(shots(sim.drain()), 1);
  assert.ok(!WEAPONS.revolver.auto);
});

test('applyGunMods: the barrel, the extended mag and the grip change the numbers', () => {
  const w = WEAPONS.rifle;
  assert.equal(applyGunMods(w, NO_GUN_MODS), w);
  const m = applyGunMods(w, { barrel: 2, mag: 1, grip: 3 });
  // (the rifle: 25 damage, 70 range, 30 / 120 rounds, 0.012 / 0.003 spread, 0.012 kick, 1.7 s reload)
  assert.equal(m.damage, 30);
  assert.equal(m.range, 81.2);
  assert.equal(m.mag, 38);
  assert.equal(m.reserve, 150);
  assert.equal(m.spreadHip, 0.0066);
  assert.equal(m.spreadAim, 0.00165);
  assert.equal(m.kick, 0.00768);
  assert.equal(m.reload, 1.19);
  assert.equal(GUN_MOD_EFFECT.damage, 0.1);
  // Untouched: the rate, the pellets, the id
  assert.equal(m.rate, w.rate);
  assert.equal(m.id, 'rifle');
  // Never a magazine smaller than stock
  for (const id of Object.keys(WEAPONS) as WeaponId[]) assert.ok(applyGunMods(WEAPONS[id], { barrel: 0, mag: 3, grip: 0 }).mag > WEAPONS[id].mag);
});

test('a player\'s mods reach the sim: a bigger magazine and harder hits', () => {
  const { sim } = atFirstDummy();
  sim.setMods('me', 'rifle', { barrel: 2, mag: 2, grip: 0 });
  sim.equip('me', 'rifle');
  const me = sim.players.get('me')!;
  assert.equal(me.mag, 45);
  assert.equal(me.reserve, 180);
  assert.equal(sim.weaponOf('me').damage, 30);
  sim.drain();
  sim.setInput('me', { fire: true });
  sim.advance(1 / 60);
  const hit = sim.drain().find((e) => e.type === 'hit');
  assert.ok(hit && hit.type === 'hit');
  assert.equal(hit.damage, 30);
  // Another gun stays stock, and mods set later take over
  sim.swap('me', 'smg');
  assert.equal(me.mag, WEAPONS.smg.mag);
  assert.equal(sim.weaponOf('me').damage, WEAPONS.smg.damage);
  sim.setMods('me', 'smg', { barrel: 1, mag: 0, grip: 0 });
  assert.equal(sim.weaponOf('me').damage, 15.4);
});
