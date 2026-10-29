// Fists on the street (docs/inventory-plan.md Phase 2): the fight's moves on the walker (brawl-sim.ts) and
// their hits on the dummies and drones (combat-sim.ts `melee()`); the takedowns by hand counted for the
// missions and the badge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRAWL, NO_BRAWL, createBrawl, type BrawlEvent } from '../src/scripts/city3d/brawl-sim';
import { MOVES } from '../src/scripts/city3d/fight-moves';
import { T } from '../src/scripts/city3d/fight-sim';
import { createSim, type SimEvent } from '../src/scripts/city3d/combat-sim';
import { MISSIONS, BADGES } from '../src/scripts/city3d/missions';
import { newSave, takedown } from '../src/scripts/city3d/tycoon';
import { createStreetFists } from '../src/scripts/city3d/brawl';
import { newPose } from '../src/scripts/city3d/skeleton';

const tick = T.tick;
/** Run the street fighter for `frames` ticks with `first` pressed on the first and `held` after */
function run(b: ReturnType<typeof createBrawl>, frames: number, first: Partial<typeof NO_BRAWL> = {}, held: Partial<typeof NO_BRAWL> = {}) {
  const out: { frame: number; e: BrawlEvent }[] = [];
  let dx = 0;
  let dz = 0;
  for (let i = 0; i < frames; i++) {
    const r = b.step(tick, dx, dz, 0, { ...NO_BRAWL, ...(i === 0 ? first : held) });
    dx += r.dx;
    dz += r.dz;
    for (const e of r.events) out.push({ frame: i, e });
  }
  return { events: out, dx, dz };
}

test('a punch swings, then strikes once on its first active frame', () => {
  const b = createBrawl('brawler');
  const { events } = run(b, 60, { punch: true });
  const swings = events.filter((x) => x.e.kind === 'swing');
  const strikes = events.filter((x) => x.e.kind === 'strike');
  assert.equal(swings.length, 1);
  assert.equal(strikes.length, 1);
  assert.equal((strikes[0].e as { move: string }).move, 'jab');
  // (pressed on tick 0, the start-up runs its frames, the strike on the next)
  assert.equal(strikes[0].frame, MOVES.jab.startup);
});

test('a punch in the recovery chains on: jab, then cross', () => {
  const b = createBrawl('brawler');
  const moves: string[] = [];
  for (let i = 0; i < 80; i++) {
    const press = i === 0 || i === MOVES.jab.startup + MOVES.jab.active + 2;
    for (const e of b.step(tick, 0, 0, 0, { ...NO_BRAWL, punch: press }).events) if (e.kind === 'strike') moves.push(e.move);
  }
  assert.deepEqual(moves, ['jab', 'cross']);
});

test('punches are the upper body over the walk; kicks and the dodge take him whole', () => {
  const b = createBrawl('brawler');
  b.step(tick, 0, 0, 0, { ...NO_BRAWL, punch: true });
  assert.equal(b.move, 'jab');
  assert.equal(b.rooted, false);
  assert.equal(b.clip().id, 'jab');
  const k = createBrawl('brawler');
  k.step(tick, 0, 0, 0, { ...NO_BRAWL, kick: true });
  assert.equal(k.move, 'frontKick');
  assert.equal(k.rooted, true);
  const d = createBrawl('brawler');
  d.step(tick, 0, 0, 0, { ...NO_BRAWL, dodge: true });
  assert.equal(d.move, 'dodge');
  assert.equal(d.rooted, true);
});

test("a dodge slides him back (the move's own step comes back to walk mode), a punch steps him in", () => {
  const d = createBrawl('brawler');
  const back = run(d, 40, { dodge: true });
  // (facing +z: no direction given, it steps back)
  assert.ok(back.dz < -0.5, `dodged ${back.dz}`);
  const p = createBrawl('brawler');
  const fwd = run(p, 30, { punch: true });
  assert.ok(fwd.dz > 0.1 && fwd.dz < MOVES.jab.lunge + 0.01, `stepped in ${fwd.dz}`);
});

test('the guard comes up with a move or the block, stays a while, drops; sprinting drops it and throws nothing', () => {
  const b = createBrawl('brawler');
  assert.equal(b.up, false);
  run(b, 2, { block: true }, { block: true });
  assert.equal(b.up, true);
  assert.equal(b.blocking, true);
  run(b, Math.ceil((BRAWL.guard - 0.5) / tick));
  assert.equal(b.up, true, 'still up a while after');
  run(b, Math.ceil(1 / tick));
  assert.equal(b.up, false, 'down after the guard time');
  const s = createBrawl('brawler');
  const r = run(s, 30, { punch: true, sprinting: true }, { sprinting: true });
  assert.equal(r.events.length, 0);
  assert.equal(s.up, false);
});

test('out of stamina he tires: no more moves until some is back', () => {
  const b = createBrawl('brawler');
  let tired = 0;
  for (let i = 0; i < 600; i++) for (const e of b.step(tick, 0, 0, 0, { ...NO_BRAWL, kick: i % 31 === 0 }).events) if (e.kind === 'tired') tired++;
  assert.ok(tired > 0);
});

/** The combat sim with one player standing `dist` in front of the first dummy, facing it */
function atDummy(dist: number, turn = 0) {
  const sim = createSim({ ground: 0.18, rayWorld: () => 200 });
  sim.addPlayer('me');
  const t = sim.targets.find((x) => x.kind === 'dummy')!;
  // (stand south of it, facing north at it: +z is the facing's cos)
  const x = t.x;
  const z = t.z - dist;
  return { sim, t, x, y: t.y, z, yaw: turn };
}
const drain = (sim: ReturnType<typeof createSim>) => sim.drain() as SimEvent[];

test('a punch lands on a dummy in reach, in front, at its height', () => {
  const { sim, t, x, y, z, yaw } = atDummy(0.9);
  assert.equal(sim.melee('me', x, y, z, yaw, 'jab'), t);
  const hit = drain(sim).find((e) => e.type === 'hit');
  assert.ok(hit && hit.type === 'hit' && hit.melee === true && hit.damage === MOVES.jab.damage);
  assert.equal(t.hp, 100 - MOVES.jab.damage);
});

test('nothing lands out of reach, behind him, or with a gun in his hands', () => {
  const far = atDummy(MOVES.jab.reach + 0.8);
  assert.equal(far.sim.melee('me', far.x, far.y, far.z, far.yaw, 'jab'), null);
  const back = atDummy(0.9, Math.PI);
  assert.equal(back.sim.melee('me', back.x, back.y, back.z, back.yaw, 'jab'), null);
  // (a kick reaches further than a jab)
  const kick = atDummy(MOVES.jab.reach + 0.6);
  assert.equal(kick.sim.melee('me', kick.x, kick.y, kick.z, kick.yaw, 'jab'), null);
  assert.ok(kick.sim.melee('me', kick.x, kick.y, kick.z, kick.yaw, 'frontKick'));
  const armed = atDummy(0.9);
  armed.sim.equip('me', 'rifle');
  armed.sim.advance(0.5);
  assert.equal(armed.sim.melee('me', armed.x, armed.y, armed.z, armed.yaw, 'jab'), null);
  // (and a dodge is no strike)
  const dodge = atDummy(0.5);
  assert.equal(dodge.sim.melee('me', dodge.x, dodge.y, dodge.z, dodge.yaw, 'dodge'), null);
});

test('enough hits knock a dummy down: a takedown marked as by hand', () => {
  const { sim, t, x, y, z, yaw } = atDummy(0.8);
  let down = null as SimEvent | null;
  for (let i = 0; i < 20 && !down; i++) {
    sim.melee('me', x, y, z, yaw, 'cross');
    down = drain(sim).find((e) => e.type === 'takedown') ?? null;
  }
  assert.ok(down && down.type === 'takedown' && down.melee === true && down.target === t.id);
  assert.ok(t.down > 0);
});

test("the patrol drones fly out of a fist's reach from the street", () => {
  const sim = createSim({ ground: 0.18, rayWorld: () => 200 });
  sim.addPlayer('me');
  for (const d of sim.targets.filter((x) => x.kind === 'drone')) {
    // (straight under it, facing it)
    assert.equal(sim.melee('me', d.x, 0.18, d.z - 0.6, 0, 'roundhouse'), null);
  }
});

test('takedowns by hand count apart, for the missions and the badge', () => {
  const s = newSave(0);
  takedown(s, 'dummy', true);
  takedown(s, 'dummy');
  assert.equal(s.counters.dummies, 2);
  assert.equal(s.counters.fistDowns, 1);
  assert.ok(MISSIONS.some((m) => 'counter' in m.goal && m.goal.counter === 'fistDowns' && m.level === 1));
  assert.ok(BADGES.some((b) => 'counter' in b.on && b.on.counter === 'fistDowns'));
});

test("the fists' clip over the walk: the upper body only, the legs left to the walk; a kick takes the legs too", () => {
  const fists = createStreetFists('brawler');
  const walk = () => {
    const p = newPose();
    p.legs[0].fwd = 0.4;
    p.legs[1].fwd = -0.3;
    p.legs[0].foot = 0.2;
    p.bob = 0.03;
    return p;
  };
  fists.brawl.step(tick, 0, 0, 0, { ...NO_BRAWL, punch: true });
  const P = walk();
  const before = JSON.stringify(walk().legs);
  fists.lay(P, 1, 0);
  assert.equal(JSON.stringify(P.legs), before, 'the legs are the walk\'s');
  assert.equal(P.bob, 0.03);
  assert.notEqual(P.arms[0].fwd, 0, 'the arms are the clip\'s');
  assert.deepEqual(P.grip, [1, 1], 'fists closed');
  // (nothing laid on with the guard down)
  const Q = walk();
  fists.lay(Q, 0, 0);
  assert.equal(JSON.stringify(Q), JSON.stringify(walk()));
  const k = createStreetFists('brawler');
  k.brawl.step(tick, 0, 0, 0, { ...NO_BRAWL, kick: true });
  for (let i = 0; i < MOVES.frontKick.startup; i++) k.brawl.step(tick, 0, 0, 0, NO_BRAWL);
  const R = walk();
  k.lay(R, 1, 1);
  assert.notEqual(JSON.stringify(R.legs), before, 'a kick takes the legs');
  // (the standing foot is the clip's, planted under it: fightfeet.ts)
  assert.notEqual(R.legs[0].foot, 0.2, "the walk's foot replaced");
  assert.equal(typeof R.legs[0].foot, 'number', 'the clip\'s planted foot');
});

test('every street move ends back on the guard, where the guard clip starts', () => {
  for (const m of ['jab', 'frontKick', 'dodge'] as const) {
    const f = createStreetFists('brawler');
    f.brawl.step(tick, 0, 0, 0, { ...NO_BRAWL, punch: m === 'jab', kick: m === 'frontKick', dodge: m === 'dodge' });
    const at = () => {
      const P = newPose();
      f.lay(P, 1, 1);
      return P;
    };
    let last = at();
    for (let i = 0; i < 120 && f.brawl.move; i++) {
      f.brawl.step(tick, 0, 0, 0, NO_BRAWL);
      if (f.brawl.move) last = at();
    }
    assert.equal(f.brawl.move, null, `${m} played out`);
    const guard = newPose();
    f.lay(guard, 1, 1);
    for (let i = 0; i < 2; i++) {
      assert.ok(Math.abs(last.arms[i].fwd - guard.arms[i].fwd) < 0.25, `${m}: arm ${i} ${last.arms[i].fwd} vs ${guard.arms[i].fwd}`);
      assert.ok(Math.abs(last.arms[i].bend - guard.arms[i].bend) < 0.35, `${m}: elbow ${i}`);
    }
  }
});
