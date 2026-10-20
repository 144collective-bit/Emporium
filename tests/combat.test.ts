// Target practice rules (combat-sim.ts): seeded, so a server and a browser agree;
// guns unlock with score; a geared-up player hits a dummy and scores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DUMMIES, POINTS, WEAPONS, createSim, weaponUnlocked } from '../src/scripts/city3d/combat-sim';

function shootFirstDummy(seed: number) {
  const sim = createSim({ ground: 0.18, rayWorld: () => 200, seed });
  sim.addPlayer('me');
  const target = sim.targets.find((t) => t.kind === 'dummy')!;
  const aimAt = new THREE.Vector3(target.x, target.y + 0.8, target.z);
  const origin = aimAt.clone().add(new THREE.Vector3(0, 0, 6));
  sim.setInput('me', { origin, dir: aimAt.clone().sub(origin).normalize(), aim: true });
  sim.setInput('me', { fire: true });
  sim.advance(0.2);
  const before = sim.drain().filter((e) => e.type === 'shot').length;
  sim.equip('me', 'rifle');
  sim.drain();
  for (let i = 0; i < 30; i++) sim.advance(1 / 30);
  return { sim, events: sim.drain(), before };
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
