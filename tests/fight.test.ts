import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVES, MOVE_IDS, NO_INPUT, STYLES, T, createFightSim, forward, moveFrames, nextMove, yawTo, type FighterInput, type FightEvent, type FightSetup } from '../src/scripts/city3d/fight-sim';

const IDLE: FighterInput = { ...NO_INPUT };
const press = (p: Partial<FighterInput>): FighterInput => ({ ...NO_INPUT, ...p });

/** Two fighters face to face along z, `gap` apart (centre to centre) */
function pair(gap = 1.0, extra: Partial<FightSetup> = {}, styles: ['brawler' | 'kickboxer' | 'street', 'brawler' | 'kickboxer' | 'street'] = ['brawler', 'brawler']) {
  return createFightSim({
    seed: 1,
    fighters: [
      { id: 'a', name: 'A', style: styles[0], x: 0, z: 0, yaw: 0 },
      { id: 'b', name: 'B', style: styles[1], x: 0, z: gap, yaw: Math.PI },
    ],
    ...extra,
  });
}
/** Step n ticks with the same inputs, collecting events */
function run(sim: ReturnType<typeof createFightSim>, n: number, inputs: Record<string, FighterInput> = {}) {
  const out: FightEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...sim.step(T.tick, inputs));
  return out;
}
const kinds = (ev: FightEvent[]) => ev.map((e) => e.kind);

test('the moves: frames, reach and the chain, as the plan tables them', () => {
  for (const id of MOVE_IDS) {
    const m = MOVES[id];
    assert.ok(m.startup > 0 && m.active > 0 && m.recovery > 0);
    assert.equal(moveFrames(id), m.startup + m.active + m.recovery);
    if (m.kind !== 'dodge') assert.ok(m.reach > 0.8 && m.reach <= 1.5 && m.damage > 0 && m.stamina > 0);
  }
  // Hit stun outlasts the next move's start-up, so a chain lands if its first hit does
  assert.ok(MOVES.jab.stun > MOVES.cross.startup);
  assert.ok(MOVES.cross.stun > MOVES.hook.startup);
  assert.ok(MOVES.hook.stun > MOVES.uppercut.startup || MOVES.hook.heavy);
  assert.ok(MOVES.frontKick.stun > MOVES.roundhouse.startup);
  assert.equal(MOVES.jab.next, 'cross');
  assert.equal(MOVES.cross.next, 'hook');
  assert.equal(MOVES.hook.next, 'uppercut');
  assert.ok(MOVES.uppercut.knockdown && MOVES.hook.heavy && MOVES.roundhouse.heavy);
  // The Brawler is the free set; the others add the roundhouse, the uppercut and the parry
  assert.deepEqual(STYLES.brawler.moves, ['jab', 'cross', 'hook', 'frontKick', 'dodge']);
  assert.ok(STYLES.kickboxer.moves.includes('roundhouse') && !STYLES.kickboxer.moves.includes('uppercut'));
  assert.ok(STYLES.street.moves.includes('uppercut') && STYLES.street.parry);
  assert.equal(forward(0)[1], 1);
  assert.ok(Math.abs(yawTo(0, 0, 0, 5)) < 1e-9);
});

test('a jab lands at reach and not past it, with its stun, knockback and a swing event', () => {
  const near = pair(MOVES.jab.reach + T.radius - 0.1);
  let ev = run(near, 1, { a: press({ punch: true }) });
  assert.deepEqual(kinds(ev), ['swing']);
  const a = near.fighter('a')!;
  const b = near.fighter('b')!;
  assert.equal(a.move, 'jab');
  ev = run(near, MOVES.jab.startup + 1);
  const hit = ev.find((e) => e.kind === 'hit');
  assert.ok(hit && hit.kind === 'hit' && hit.target === 'b' && hit.damage === MOVES.jab.damage);
  assert.equal(b.health, T.health - MOVES.jab.damage);
  assert.ok(b.stun > 0 && b.hurt === 'body');
  assert.ok(b.vz > 0, 'knocked back along the punch');
  assert.ok(a.stamina < T.stamina);
  // Too far: a swing, no hit, the chain count stays zero
  const far = pair(MOVES.jab.reach + T.radius + 0.6);
  ev = run(far, moveFrames('jab') + 2, { a: press({ punch: true }) });
  assert.ok(!ev.some((e) => e.kind === 'hit'));
  assert.equal(far.fighter('b')!.health, T.health);
  // Behind: nothing lands
  const back = pair(1.0);
  back.fighter('a')!.yaw = Math.PI;
  ev = run(back, moveFrames('jab') + 2, { a: press({ punch: true }) });
  assert.ok(!ev.some((e) => e.kind === 'hit'));
});

test('the chain: punch again in recovery for the cross and the hook; it lands when the jab does and breaks on a block', () => {
  const sim = pair(1.0);
  const a = sim.fighter('a')!;
  const b = sim.fighter('b')!;
  const ev: FightEvent[] = [];
  // Hold punch the whole way: each move queues the next from its recovery
  for (let i = 0; i < 120; i++) ev.push(...sim.step(T.tick, { a: press({ punch: true }) }));
  const hits = ev.filter((e) => e.kind === 'hit').map((e) => (e as { move: string }).move);
  assert.deepEqual(hits.slice(0, 3), ['jab', 'cross', 'hook']);
  assert.ok(ev.some((e) => e.kind === 'chain' && e.n === 3));
  assert.ok(ev.some((e) => e.kind === 'stagger' && e.who === 'b'), 'the hook staggers');
  assert.ok(a.bestChain >= 3);
  assert.equal(nextMove(b, 'punch'), b.move ? null : 'jab');
  // Blocked: the jab is cut to a fifth, the chain breaks (no cross lands while the block holds)
  const s2 = pair(1.0);
  const ev2: FightEvent[] = [];
  for (let i = 0; i < 60; i++) ev2.push(...s2.step(T.tick, { a: press({ punch: true }), b: press({ block: true }) }));
  const blocks = ev2.filter((e) => e.kind === 'block');
  assert.ok(blocks.length >= 1 && blocks[0].kind === 'block' && blocks[0].move === 'jab');
  assert.ok(!ev2.some((e) => e.kind === 'hit'));
  assert.ok(Math.abs(s2.fighter('b')!.health - (T.health - MOVES.jab.damage * T.blockCut)) < 1e-9 || s2.fighter('b')!.health < T.health);
  assert.equal(s2.fighter('a')!.chain, 0);
  assert.ok(s2.fighter('b')!.stamina < T.stamina, 'a block pays stamina');
});

test('a block only covers the front; a kick after a cross is the roundhouse for a Kickboxer, nothing for a Brawler', () => {
  // B blocks but faces away: the jab lands
  const sim = pair(1.0);
  sim.fighter('b')!.yaw = 0;
  const ev = run(sim, 30, { a: press({ punch: true }), b: press({ block: true }) });
  assert.ok(ev.some((e) => e.kind === 'hit'));
  // The Brawler has no roundhouse: a kick in the cross's recovery does nothing
  const br = pair(1.0);
  let ev2: FightEvent[] = [];
  for (let i = 0; i < moveFrames('jab') + moveFrames('cross') + 30; i++) {
    const a = br.fighter('a')!;
    const kick = a.move === 'cross' && a.phase === 'recovery';
    ev2.push(...br.step(T.tick, { a: press({ punch: !kick && i < moveFrames('jab') + 2, kick }) }));
  }
  assert.ok(!ev2.some((e) => e.kind === 'swing' && e.move === 'roundhouse'));
  // The Kickboxer does
  const kb = pair(1.0, {}, ['kickboxer', 'brawler']);
  ev2 = [];
  for (let i = 0; i < moveFrames('jab') + moveFrames('cross') + 40; i++) {
    const a = kb.fighter('a')!;
    const kick = a.move === 'cross' && a.phase === 'recovery';
    ev2.push(...kb.step(T.tick, { a: press({ punch: !kick && i < moveFrames('jab') + 2, kick }) }));
  }
  assert.ok(ev2.some((e) => e.kind === 'swing' && e.move === 'roundhouse'));
});

test('the parry window: a Street block begun just before the hit staggers the attacker; an early block only blocks', () => {
  const late = pair(1.0, {}, ['brawler', 'street']);
  const ev: FightEvent[] = [];
  for (let i = 0; i < 40; i++) {
    // Block from the frame before the jab lands
    const block = i >= MOVES.jab.startup - 2;
    ev.push(...late.step(T.tick, { a: press({ punch: true }), b: press({ block }) }));
  }
  assert.ok(ev.some((e) => e.kind === 'parry' && e.who === 'b'));
  assert.ok(ev.some((e) => e.kind === 'stagger' && e.who === 'a'));
  assert.equal(late.fighter('b')!.health, T.health);
  const early = pair(1.0, {}, ['brawler', 'street']);
  const ev2 = run(early, 40, { a: press({ punch: true }), b: press({ block: true }) });
  assert.ok(ev2.some((e) => e.kind === 'block') && !ev2.some((e) => e.kind === 'parry'));
  // Brawlers never parry
  const bb = pair(1.0);
  const ev3: FightEvent[] = [];
  for (let i = 0; i < 40; i++) ev3.push(...bb.step(T.tick, { a: press({ punch: true }), b: press({ block: i >= MOVES.jab.startup - 2 }) }));
  assert.ok(!ev3.some((e) => e.kind === 'parry'));
});

test('the dodge: invulnerable through its active frames, a step away, stamina paid', () => {
  const sim = pair(1.0);
  const b = sim.fighter('b')!;
  const z0 = b.z;
  const ev: FightEvent[] = [];
  // B dodges on the jab's first start-up frame; the jab lands on frame 6, inside the dodge's active frames (4..14)
  for (let i = 0; i < 40; i++) ev.push(...sim.step(T.tick, { a: press({ punch: i < 2 }), b: press({ dodge: i === 0 }) }));
  assert.ok(ev.some((e) => e.kind === 'dodge' && e.who === 'b'));
  assert.ok(!ev.some((e) => e.kind === 'hit'), 'the jab passed through the dodge');
  assert.ok(b.z > z0 + 0.5, 'stepped back');
  assert.ok(b.stamina < T.stamina);
});

test('stamina: moves drain it, it refills idle, and empty means walking and blocking only until a quarter is back', () => {
  const sim = pair(3.0);
  const a = sim.fighter('a')!;
  a.stamina = MOVES.jab.stamina * 0.75;
  let ev = run(sim, 2, { a: press({ punch: true }) });
  assert.ok(ev.some((e) => e.kind === 'swing'));
  assert.ok(a.empty, 'spent it all');
  ev = run(sim, moveFrames('jab') + 2, { a: press({ punch: true }) });
  assert.ok(ev.some((e) => e.kind === 'tired') && !ev.some((e) => e.kind === 'swing'), 'nothing to throw with');
  // Walking still works while empty
  const x0 = a.x;
  run(sim, 30, { a: press({ x: 1 }) });
  assert.ok(a.x > x0 + 0.5);
  // The crawl back: a quarter restores the throw
  run(sim, Math.ceil((T.emptyUntil / T.regenEmpty) * 60) + 5);
  assert.ok(!a.empty);
  ev = run(sim, 2, { a: press({ punch: true }) });
  assert.ok(ev.some((e) => e.kind === 'swing'));
  // Idle refill is faster than the crawl and caps at full
  a.stamina = 50;
  run(sim, 60 * 3);
  assert.equal(a.stamina, T.stamina);
});

test('knockdowns: an uppercut floors, a hit while staggered floors, the count and the get-up, then full stamina', () => {
  const sim = pair(1.0, {}, ['street', 'brawler']);
  const a = sim.fighter('a')!;
  const b = sim.fighter('b')!;
  const ev: FightEvent[] = [];
  for (let i = 0; i < 200 && b.down === 0; i++) ev.push(...sim.step(T.tick, { a: press({ punch: true }) }));
  const kd = ev.find((e) => e.kind === 'knockdown');
  assert.ok(kd && kd.kind === 'knockdown' && kd.who === 'b' && !kd.ko);
  assert.ok(b.down > 0 && b.invuln > 0);
  assert.ok(b.health > 0, 'a knockdown is not a knock-out');
  // On the ground nothing lands
  const before = b.health;
  const ev2 = run(sim, 40, { a: press({ punch: true }) });
  assert.ok(!ev2.some((e) => e.kind === 'hit'));
  assert.equal(b.health, before);
  // Up again after the count, stamina full
  b.stamina = 30;
  const ev3 = run(sim, T.downFrames + T.getupFrames + 2);
  assert.ok(ev3.some((e) => e.kind === 'getup' && e.who === 'b'));
  assert.equal(b.down, 0);
  assert.equal(b.getup, 0);
  assert.equal(b.stamina, T.stamina);
  // A hit while staggered floors too: hook (stagger) then a cross on a fresh fighter
  const s2 = pair(1.0);
  const b2 = s2.fighter('b')!;
  b2.stun = T.staggerStun;
  b2.hurt = 'stagger';
  const ev4 = run(s2, 30, { a: press({ punch: true }) });
  assert.ok(ev4.some((e) => e.kind === 'knockdown' && e.who === 'b'));
  assert.ok(a.hits > 0);
});

test('a knock-out in a spar: down for the count, up with full health and a knock-out counted', () => {
  const sim = pair(1.0);
  const a = sim.fighter('a')!;
  const b = sim.fighter('b')!;
  b.health = 5;
  const ev = run(sim, 20, { a: press({ punch: true }) });
  const kd = ev.find((e) => e.kind === 'knockdown');
  assert.ok(kd && kd.kind === 'knockdown' && kd.ko);
  assert.equal(a.kos, 1);
  assert.equal(b.health, 0);
  run(sim, T.koFrames + T.getupFrames + 2);
  assert.equal(b.health, T.health);
  assert.equal(b.down, 0);
});

test('a spar heals after a quiet spell; a bout never does', () => {
  const spar = pair(3.0);
  const b = spar.fighter('b')!;
  b.health = 50;
  b.sinceHit = 0;
  run(spar, T.healDelay + 60);
  assert.ok(b.health > 50 && b.health < T.health);
  const bout = pair(3.0, { bout: { rounds: 3, seconds: 60 } });
  const bb = bout.fighter('b')!;
  run(bout, T.bell + 2);
  bb.health = 50;
  bb.sinceHit = 0;
  run(bout, T.healDelay + 60);
  assert.equal(bb.health, 50);
});

test('a bout: the bell, the round to the healthier fighter on the clock, a knock-out ends a round, first to two wins', () => {
  const sim = pair(1.0, { bout: { rounds: 3, seconds: 2 } });
  const a = sim.fighter('a')!;
  const b = sim.fighter('b')!;
  // Nothing moves before the bell
  let ev = run(sim, 10, { a: press({ punch: true }) });
  assert.ok(!ev.some((e) => e.kind === 'swing'));
  assert.equal(sim.boutPhase, 'bell');
  ev = run(sim, T.bell);
  assert.ok(ev.some((e) => e.kind === 'bell' && e.round === 1));
  assert.equal(sim.boutPhase, 'fight');
  assert.ok(sim.clock > 1.7 && sim.clock <= 2);
  // Round 1: A lands a jab, then the clock runs out: A's round
  run(sim, 20, { a: press({ punch: true }) });
  ev = run(sim, 2 * 60);
  const r1 = ev.find((e) => e.kind === 'round');
  assert.ok(r1 && r1.kind === 'round' && r1.round === 1 && r1.winner === 'a');
  assert.equal(a.rounds, 1);
  assert.equal(sim.boutPhase, 'rest');
  // The rest, then round 2 with full health; B is knocked out: A's bout
  run(sim, T.rest + 1);
  assert.equal(sim.round, 2);
  assert.equal(b.health, T.health);
  run(sim, T.bell + 1);
  b.health = 5;
  ev = run(sim, 30, { a: press({ punch: true }) });
  assert.ok(ev.some((e) => e.kind === 'knockdown' && e.ko));
  const bo = ev.find((e) => e.kind === 'bout');
  assert.ok(bo && bo.kind === 'bout' && bo.winner === 'a');
  assert.ok(sim.over);
  assert.equal(sim.winner, 'a');
  assert.equal(a.rounds, 2);
});

test('bots: a bout between two bots ends with a winner, nobody throws from out of reach, nobody leaves the ring', () => {
  for (const seed of [2, 7, 11]) {
    const arena = { x: 0, z: 1, r: 3.5 };
    const sim = createFightSim({
      seed,
      fighters: [
        { id: 'a', name: 'A', style: 'brawler', x: 0, z: -1, yaw: 0, bot: { skill: 0.75 } },
        { id: 'b', name: 'B', style: 'brawler', x: 0, z: 3, yaw: Math.PI, bot: { skill: 0.35 } },
      ],
      bout: { rounds: 3, seconds: 45 },
      arena,
    });
    let swings = 0;
    let hits = 0;
    let blocks = 0;
    for (let i = 0; i < 60 * 200 && !sim.over; i++) {
      const before = sim.fighters.map((f) => ({ x: f.x, z: f.z }));
      const ev = sim.step(T.tick);
      for (const e of ev) {
        if (e.kind === 'swing') {
          swings++;
          // From reach: the swinger was within its move's reach of someone when it started (its position a tick ago)
          const w = sim.fighters.findIndex((f) => f.id === e.who);
          const o = sim.fighters[1 - w];
          const d = Math.hypot(o.x - before[w].x, o.z - before[w].z);
          assert.ok(d <= MOVES[e.move].reach + T.radius + 0.5, `${e.who} threw a ${e.move} from ${d.toFixed(2)} away (seed ${seed})`);
        }
        if (e.kind === 'hit') hits++;
        if (e.kind === 'block') blocks++;
      }
      for (const f of sim.fighters) assert.ok(Math.hypot(f.x - arena.x, f.z - arena.z) <= arena.r - T.radius + 1e-6, 'inside the ring');
    }
    assert.ok(sim.over && sim.winner, `seed ${seed}: a winner`);
    assert.ok(swings > 10 && hits > 3, `seed ${seed}: ${swings} swings, ${hits} hits`);
    assert.ok(blocks + hits > 0);
  }
  // The same seed gives the same fight (deterministic for the server)
  const a = createFightSim({ seed: 5, fighters: [{ id: 'a', name: 'A', style: 'brawler', x: 0, z: 0, yaw: 0, bot: { skill: 0.5 } }, { id: 'b', name: 'B', style: 'brawler', x: 0, z: 2, yaw: Math.PI, bot: { skill: 0.5 } }] });
  const b = createFightSim({ seed: 5, fighters: [{ id: 'a', name: 'A', style: 'brawler', x: 0, z: 0, yaw: 0, bot: { skill: 0.5 } }, { id: 'b', name: 'B', style: 'brawler', x: 0, z: 2, yaw: Math.PI, bot: { skill: 0.5 } }] });
  const ea = run(a, 600);
  const eb = run(b, 600);
  assert.deepEqual(ea, eb);
});

test('the clock takes whole ticks and carries the rest; big frames are capped', () => {
  const sim = pair(3.0);
  sim.step(T.tick * 2.5);
  assert.equal(sim.ticks, 2);
  sim.step(T.tick * 0.6);
  assert.equal(sim.ticks, 3);
  sim.step(5);
  assert.ok(sim.ticks <= 3 + 8);
  // Fighters never stand inside each other
  const close = pair(0.1);
  run(close, 2, { a: IDLE, b: IDLE });
  assert.ok(Math.hypot(close.fighter('a')!.x - close.fighter('b')!.x, close.fighter('a')!.z - close.fighter('b')!.z) >= T.radius * 2 - 1e-6);
});
