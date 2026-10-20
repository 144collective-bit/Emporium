// Target practice rules (combat-sim.ts): seeded, so a server and a browser agree;
// guns unlock with score; a geared-up player hits a dummy and scores; the Tri-Tap
// fires three a pull; the Armoury's mods (catalog.ts) change a gun through the sim.
// The crew on the south bank: patrols keep to the zone, off the avenue and out of
// the solids; a goon comes for a player nearby, shoves and backs off; shot, it goes
// down for the goon's points and gets up at its spawn; never under reduced motion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BURST_PAUSE, CREW_SPOTS, CREW_ZONE, DUMMIES, GOON, POINTS, TICK, WEAPONS, createSim, goonPatrol, weaponUnlocked, type WeaponId } from '../src/scripts/city3d/combat-sim';
import { GUN_MOD_EFFECT, NO_GUN_MODS, applyGunMods } from '../src/scripts/city3d/catalog';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { EW_ROADS, NS_ROADS, RIVER, SOUTH_ROAD, WALK_W } from '../src/scripts/city3d/layout';
import { pointIn } from './world';

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

/* ---------- The crew on the south bank ---------- */

const inZone = (x: number, z: number) => x >= CREW_ZONE[0] && x <= CREW_ZONE[2] && z >= CREW_ZONE[1] && z <= CREW_ZONE[3];
const southBank = EW_ROADS.find((r) => r.c === SOUTH_ROAD)!;
/** On the south bank avenue's asphalt, or on a bridge road's (which cuts the riverside walk) */
const onAsphalt = (x: number, z: number) => Math.abs(z - southBank.c) < southBank.half || NS_ROADS.some((r) => Math.abs(x - r.c) < r.half + WALK_W);
const inSolid = (x: number, z: number) => SOLIDS.some((b) => pointIn(x, z, b, 0.3));
/** A sim with one player and the crew, and the first goon */
function withCrew() {
  const sim = createSim({ ground: 0.15, rayWorld: () => 200, seed: 3 });
  sim.addPlayer('me');
  const goon = sim.targets[sim.firstGoon];
  return { sim, goon };
}
/** Run the sim for `seconds`, a tick at a time (one `advance` only covers a quarter second) */
function run(sim: ReturnType<typeof createSim>, seconds: number, motion = true) {
  for (let i = 0; i < Math.round(seconds * 60); i++) sim.advance(1 / 60, motion);
}
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const patrolAt = (i: number, t: number) => goonPatrol(i, t, { x: 0, z: 0, heading: 0 });
const onPatrol = (sim: ReturnType<typeof createSim>, goon: { x: number; z: number }, i = 0) => {
  const at = patrolAt(i, sim.poseNow);
  return Math.abs(goon.x - at.x) < 1e-6 && Math.abs(goon.z - at.z) < 1e-6;
};

test('the crew is about ten, after the dummies and the drones, and its zone is the south bank', () => {
  assert.ok(CREW_SPOTS.length >= 8 && CREW_SPOTS.length <= 12);
  const { sim } = withCrew();
  const kinds = sim.targets.map((t) => t.kind).join(',');
  assert.match(kinds, /^(dummy,)+(drone,)+goon(,goon)*$/);
  assert.equal(sim.targets.filter((t) => t.kind === 'goon').length, CREW_SPOTS.length);
  assert.ok(CREW_ZONE[1] > RIVER[1], 'the zone starts south of the river');
  assert.ok(CREW_ZONE[0] >= NS_ROADS[0].c, 'the zone starts at the west bridge');
  assert.equal(POINTS.goon, 120);
});

test('spawns and patrol routes are in the zone, off the asphalt and clear of the solids', () => {
  CREW_SPOTS.forEach((s, i) => {
    const [sx, sz] = s.spawn;
    assert.ok(inZone(sx, sz), `goon ${i} spawns outside the zone`);
    assert.ok(!onAsphalt(sx, sz), `goon ${i} spawns on the road`);
    assert.ok(!inSolid(sx, sz), `goon ${i} spawns inside something`);
    assert.ok(s.route.some(([x, z]) => Math.hypot(x - sx, z - sz) < 1e-9), `goon ${i}'s spawn is off its route`);
    for (let t = 0; t < 120; t += 0.1) {
      const at = patrolAt(i, t);
      assert.ok(inZone(at.x, at.z), `goon ${i} patrols out of the zone at ${at.x}, ${at.z}`);
      assert.ok(!onAsphalt(at.x, at.z), `goon ${i} patrols on the road at ${at.x}, ${at.z}`);
      assert.ok(!inSolid(at.x, at.z), `goon ${i} patrols into something at ${at.x}, ${at.z}`);
    }
  });
});

test('on patrol a goon is where the clock says, back and forth at walking pace', () => {
  const { sim, goon } = withCrew();
  run(sim, 3);
  assert.ok(onPatrol(sim, goon));
  // Walking pace along the route
  const a = patrolAt(0, 1);
  const b = patrolAt(0, 2);
  assert.ok(Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - GOON.walk) < 1e-6);
  // And it turns round at the end instead of running on
  const len = CREW_SPOTS[0].route.reduce((d, p, k, r) => (k ? d + Math.hypot(p[0] - r[k - 1][0], p[1] - r[k - 1][1]) : 0), 0);
  const end = patrolAt(0, len / GOON.walk);
  const back = patrolAt(0, (len + 1) / GOON.walk);
  assert.ok(Math.hypot(back.x - end.x, back.z - end.z) < 1 + 1e-6);
  assert.ok(Math.abs(Math.sin(back.heading - end.heading)) < 1e-6 && Math.cos(back.heading - end.heading) < 0, 'it did not turn round');
});

test('a goon comes for a player nearby in the zone, shoves, then backs off before trying again', () => {
  const { sim, goon } = withCrew();
  const me = { x: goon.x + 4, z: goon.z };
  assert.ok(inZone(me.x, me.z));
  sim.setPlayerPos('me', me.x, me.z);
  const d0 = dist(goon, me);
  run(sim, 1);
  assert.ok(sim.drain().every((e) => e.type !== 'shove'), 'shoved from 4 away');
  assert.equal(sim.goons[0].mode, 'chase');
  // It jogs, not walks: well over a walk's distance closer after a second
  assert.ok(d0 - dist(goon, me) > GOON.walk * 1.3, 'the goon is not closing in at a jog');
  let shoves: { dx: number; dz: number }[] = [];
  for (let i = 0; i < 180 && !shoves.length; i++) {
    sim.advance(1 / 60);
    for (const e of sim.drain()) if (e.type === 'shove') shoves.push(e);
  }
  assert.equal(shoves.length, 1, 'no shove');
  assert.ok(dist(goon, me) <= GOON.reach + 1e-6, 'shoved from too far');
  // The knockback points from the goon to the player
  assert.ok(shoves[0].dx > 0.99 && Math.abs(shoves[0].dz) < 0.1);
  assert.ok(Math.abs(Math.hypot(shoves[0].dx, shoves[0].dz) - 1) < 1e-6);
  // Then it backs off: further away half a second later, and no second shove for two seconds
  const near = dist(goon, me);
  run(sim, 0.5);
  assert.equal(sim.goons[0].mode, 'back');
  assert.ok(dist(goon, me) > near + 0.2, 'the goon did not back off');
  run(sim, 1.3);
  assert.ok(sim.drain().every((e) => e.type !== 'shove'), 'shoved again within the back-off');
  // Still standing there: it comes back for another
  shoves = [];
  for (let i = 0; i < 180; i++) {
    sim.advance(1 / 60);
    for (const e of sim.drain()) if (e.type === 'shove') shoves.push(e);
  }
  assert.equal(shoves.length, 1);
  assert.ok(inZone(goon.x, goon.z));
});

test('a player away, across the river or in a car is left alone, and the goon goes back to its route', () => {
  const { sim, goon } = withCrew();
  // Just over the river, right across from the goon: not in the zone
  sim.setPlayerPos('me', goon.x, RIVER[0] - 1);
  run(sim, 2);
  assert.ok(onPatrol(sim, goon));
  assert.equal(sim.goons[0].mode, 'patrol');
  // Drawn off its route, then the player gets in a car: it jogs back and picks the patrol up
  sim.setPlayerPos('me', goon.x + 3, goon.z);
  run(sim, 1);
  assert.equal(sim.goons[0].mode, 'chase');
  assert.ok(!onPatrol(sim, goon));
  sim.setPlayerPos('me', NaN, NaN);
  sim.advance(1 / 60);
  assert.equal(sim.goons[0].mode, 'return');
  run(sim, 6);
  assert.equal(sim.goons[0].mode, 'patrol');
  assert.ok(onPatrol(sim, goon));
  assert.ok(sim.drain().every((e) => e.type !== 'shove'));
});

test('a goon never leaves the zone or crosses the river, whoever it chases', () => {
  const { sim, goon } = withCrew();
  // A player standing right on the river wall at the zone's west end
  sim.setPlayerPos('me', CREW_ZONE[0] + 0.2, CREW_ZONE[1] + 0.1);
  for (let i = 0; i < 600; i++) {
    sim.advance(1 / 60);
    assert.ok(inZone(goon.x, goon.z), `out of the zone at ${goon.x}, ${goon.z}`);
    assert.ok(goon.z > RIVER[1], 'in the river');
  }
  assert.ok(sim.drain().some((e) => e.type === 'shove'), 'it never got there');
});

test('under reduced motion the crew stands still, even with a player beside it', () => {
  const { sim, goon } = withCrew();
  const [x, z] = [goon.x, goon.z];
  sim.setPlayerPos('me', goon.x + 2, goon.z);
  run(sim, 2, false);
  assert.equal(goon.x, x);
  assert.equal(goon.z, z);
  assert.ok(sim.drain().every((e) => e.type !== 'shove'));
});

test('shot, a goon goes down for its points, lies there a while and gets up at its spawn', () => {
  const { sim, goon } = withCrew();
  const aimAt = new THREE.Vector3(goon.x, goon.y + GOON.aimY * GOON.scale, goon.z);
  // The shooter's camera 5 away (the player isn't placed, so the goon keeps patrolling; the shots follow it)
  const origin = aimAt.clone().add(new THREE.Vector3(0, 0.3, 5));
  sim.setInput('me', { origin, aim: true });
  sim.equip('me', 'rifle');
  sim.drain();
  const me = sim.players.get('me')!;
  let down: { points: number } | null = null;
  let hits = 0;
  for (let i = 0; i < 240 && !down; i++) {
    aimAt.set(goon.x, goon.y + GOON.aimY * GOON.scale, goon.z);
    sim.setInput('me', { fire: true, dir: aimAt.clone().sub(origin).normalize() });
    sim.advance(1 / 60);
    for (const e of sim.drain()) {
      if (e.type === 'hit' && e.target === goon.id) hits++;
      if (e.type === 'takedown' && e.target === goon.id) down = e;
    }
  }
  assert.ok(hits > 0, 'never hit');
  assert.ok(down, 'never went down');
  assert.equal(down!.points, POINTS.goon);
  assert.equal(goon.hp, 0);
  assert.ok(goon.down > GOON.down - 0.1 && goon.down <= GOON.down);
  assert.ok(me.score >= POINTS.goon + hits * POINTS.hit);
  // Down, it can't be hit, and it stays where it fell
  const [fx, fz] = [goon.x, goon.z];
  run(sim, 1);
  assert.ok(sim.drain().every((e) => e.type !== 'hit' || e.target !== goon.id), 'hit while down');
  assert.equal(goon.x, fx);
  assert.equal(goon.z, fz);
  sim.setInput('me', { fire: false });
  // Up again at its spawn (a step at most, it's already walking back), full health
  let respawned = false;
  for (let i = 0; i < 8 * 60 && !respawned; i++) {
    sim.advance(1 / 60);
    respawned = sim.drain().some((e) => e.type === 'respawn' && e.target === goon.id);
    if (respawned) {
      const [sx, sz] = CREW_SPOTS[0].spawn;
      assert.ok(Math.hypot(goon.x - sx, goon.z - sz) <= GOON.jog * TICK + 1e-9, `got up at ${goon.x}, ${goon.z}`);
      assert.equal(goon.hp, GOON.hp);
      assert.equal(goon.down, 0);
    }
  }
  assert.ok(respawned, 'never got up');
  assert.notEqual(sim.goons[0].mode, 'chase');
});

test('a goon is a standing box: a shot over its head misses, one at its chest hits', () => {
  const { sim, goon } = withCrew();
  const top = goon.y + GOON.height * GOON.scale;
  const origin = new THREE.Vector3(goon.x, goon.y + 0.6, goon.z + 5);
  const shot = (y: number) => {
    const at = new THREE.Vector3(goon.x, y, goon.z);
    sim.setInput('me', { origin, dir: at.sub(origin).normalize(), aim: true, fire: true });
    sim.advance(1 / 60);
    const ev = sim.drain();
    assert.ok(ev.some((e) => e.type === 'shot'), 'no shot');
    sim.setInput('me', { fire: false });
    run(sim, 1);
    sim.drain();
    return ev.some((e) => e.type === 'hit' && e.target === goon.id);
  };
  sim.equip('me', 'dmr');
  sim.drain();
  assert.ok(!shot(top + 0.4), 'hit over its head');
  assert.ok(shot(goon.y + 0.5), 'missed its chest');
});
