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
  for (let i = 0; i < 30; i++) {
    // Block from the frame before the jab lands (30 ticks: the parried jab and its stagger, before the held punch throws again)
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

/* ---------- The save: the Fight Club's record and what a fight pays (tycoon.ts) ---------- */
import { cleanSave, finishFight, newSave } from '../src/scripts/city3d/tycoon';
import { FIGHT_BOTS, SPAR_HIT_CAP, XP } from '../src/scripts/city3d/catalog';

test('the save (v9): the fight record cleans, a spar pays XP capped per hit, a bout pays its purse on a win, a quit bout is a loss', () => {
  const s = newSave(1000);
  assert.equal(s.v, 9);
  assert.deepEqual(s.fight.styles, ['brawler']);
  assert.equal(s.fight.style, 'brawler');
  const d0 = s.dorras;
  const x0 = s.xp;
  // A spar: taking part plus hits, capped
  let r = finishFight(s, { kind: 'spar', bot: 'easy', won: null, hits: 40, kos: 0, bestChain: 2, seconds: 90 });
  assert.equal(r.prize, 0);
  assert.equal(r.xp, XP.spar + SPAR_HIT_CAP);
  assert.equal(r.won, null);
  assert.equal(s.fight.spars, 1);
  assert.equal(s.dorras, d0);
  // A bout won: the purse, a knock-out, a chain of three
  r = finishFight(s, { kind: 'bout', bot: 'medium', won: true, hits: 20, kos: 1, bestChain: 3, seconds: 75.5 });
  assert.equal(r.prize, FIGHT_BOTS.medium.prize);
  assert.equal(r.xp, XP.boutWin + XP.fightKo + XP.chain);
  assert.equal(r.won, true);
  assert.equal(s.dorras, d0 + FIGHT_BOTS.medium.prize);
  assert.equal(s.fight.wins, 1);
  assert.equal(s.fight.kos, 1);
  assert.equal(s.fight.bestChain, 3);
  assert.deepEqual(s.fight.bots.medium, { beaten: 1, bestSeconds: 75.5 });
  assert.equal(s.counters.bouts, 1);
  assert.equal(s.counters.fightWins, 1);
  assert.equal(s.counters.kos, 1);
  assert.equal(s.counters.chains, 1);
  assert.equal(s.ledger.totals.fighting, FIGHT_BOTS.medium.prize);
  // A faster win keeps the best time; a slower one doesn't
  finishFight(s, { kind: 'bout', bot: 'medium', won: true, hits: 5, kos: 0, bestChain: 1, seconds: 60 });
  finishFight(s, { kind: 'bout', bot: 'medium', won: true, hits: 5, kos: 0, bestChain: 1, seconds: 99 });
  assert.deepEqual(s.fight.bots.medium, { beaten: 3, bestSeconds: 60 });
  // A loss pays a little XP; a quit pays none
  const x1 = s.xp;
  r = finishFight(s, { kind: 'bout', bot: 'hard', won: false, hits: 3, kos: 0, bestChain: 1, seconds: 30 });
  assert.equal(r.xp, XP.boutLoss);
  r = finishFight(s, { kind: 'bout', bot: 'hard', won: false, hits: 3, kos: 0, bestChain: 1, seconds: 30, quit: true });
  assert.equal(r.xp, 0);
  assert.equal(s.fight.losses, 2);
  assert.ok(s.xp > x1 && s.xp > x0);
  // Cleaning: junk dropped, the record kept, an unowned style falls back
  const c = cleanSave({ ...s, fight: { ...s.fight, style: 'street', styles: ['brawler', 'nope'], wins: -3, bots: { medium: { beaten: 2.4, bestSeconds: 'x' }, bogus: { beaten: 1 } } } }, 2000);
  assert.equal(c.fight.style, 'brawler');
  assert.deepEqual(c.fight.styles, ['brawler']);
  assert.equal(c.fight.wins, 0);
  assert.deepEqual(c.fight.bots, { medium: { beaten: 2, bestSeconds: null } });
  // An old save without a fight record comes up with an empty one
  const old = cleanSave({ v: 7, dorras: 5 }, 2000);
  assert.equal(old.v, 9);
  assert.deepEqual(old.fight.styles, ['brawler']);
  assert.equal(old.fight.bouts, 0);
});

/* ---------- The optimisation round: buffered presses, the step-in, the turn rate, the bots' tells ---------- */
import { botTraits } from '../src/scripts/city3d/fight-sim';

test('a press up to T.buffer frames early still fires: a chain pressed before the recovery window, a punch pressed while stunned', () => {
  // The cross pressed 5 frames before the jab's recovery opens: it still chains
  const sim = pair(1.0);
  const ev: FightEvent[] = [];
  const window = MOVES.jab.startup + MOVES.jab.active;
  for (let i = 0; i < 80; i++) ev.push(...sim.step(T.tick, { a: press({ punch: i === 0 || i === window - 5 }) }));
  assert.deepEqual(ev.filter((e) => e.kind === 'swing').map((e) => (e as { move: string }).move).slice(0, 2), ['jab', 'cross']);
  // Pressed too early (T.buffer + 4 frames before): lost
  const s2 = pair(1.0);
  const ev2: FightEvent[] = [];
  for (let i = 0; i < 80; i++) ev2.push(...s2.step(T.tick, { a: press({ punch: i === 0 || i === window - T.buffer - 4 }) }));
  assert.deepEqual(ev2.filter((e) => e.kind === 'swing').map((e) => (e as { move: string }).move), ['jab']);
  // A punch pressed 4 frames before the stun ends fires as soon as it does
  const s3 = pair(1.0);
  const a = s3.fighter('a')!;
  a.stun = 10;
  a.hurt = 'head';
  const ev3: FightEvent[] = [];
  for (let i = 0; i < 20; i++) ev3.push(...s3.step(T.tick, { a: press({ punch: i === 5 }) }));
  assert.ok(ev3.some((e) => e.kind === 'swing'));
  assert.ok(a.move === 'jab' || a.hits > 0);
});

test('the step-in: a jab from just out of reach steps forward and lands; from well out of reach it still misses', () => {
  const just = pair(MOVES.jab.reach + T.radius + 0.35);
  const ev = run(just, moveFrames('jab') + 2, { a: press({ punch: true }) });
  assert.ok(ev.some((e) => e.kind === 'hit'), 'stepped in');
  const far = pair(MOVES.jab.reach + T.radius + T.stepIn + 0.3);
  const ev2 = run(far, moveFrames('jab') + 2, { a: press({ punch: true }) });
  assert.ok(!ev2.some((e) => e.kind === 'hit'));
});

test('the facing turns at a rate, and a move only snaps the facing a little', () => {
  const sim = pair(3.0);
  const a = sim.fighter('a')!;
  run(sim, 1, { a: press({ face: Math.PI }) });
  assert.ok(Math.abs(a.yaw) < Math.PI / 2, 'not there in one tick');
  assert.ok(Math.abs(a.yaw) > 0.05, 'but turning');
  run(sim, 40, { a: press({ face: Math.PI }) });
  assert.ok(Math.abs(Math.abs(a.yaw) - Math.PI) < 1e-6, 'there within 40 ticks');
  // A move's lock-on snaps at most T.lockSnap towards a target 1 radian off
  const s2 = pair(1.0);
  const b = s2.fighter('a')!;
  b.yaw = 1.0;
  run(s2, 1, { a: press({ punch: true }) });
  assert.ok(Math.abs(b.yaw - (1.0 - T.lockSnap)) < 1e-6);
});

test("the Mayor's tells: a telegraphed hook winds up longer, he parries, and he backs off after a chain; Ray hardly blocks", () => {
  // A telegraphed heavy move takes its extra frames to land; a jab doesn't
  const tele = createFightSim({ seed: 1, fighters: [{ id: 'a', name: 'A', style: 'street', x: 0, z: 0, yaw: 0, bot: { skill: 0.8, telegraph: 8 } }, { id: 'b', name: 'B', style: 'brawler', x: 0, z: 1, yaw: Math.PI }] });
  tele.bots = false;
  const a = tele.fighter('a')!;
  a.move = 'cross';
  a.phase = 'recovery';
  a.frame = MOVES.cross.startup + MOVES.cross.active + 1;
  const recov = MOVES.cross.startup + MOVES.cross.active + MOVES.cross.recovery - a.frame;
  let landed = -1;
  for (let i = 0; i < 80 && landed < 0; i++) for (const e of tele.step(T.tick, { a: press({ punch: i === 0 }) })) if (e.kind === 'hit' && e.move === 'hook') landed = i;
  assert.ok(landed > recov + MOVES.hook.startup + 6, `the hook took ${landed} frames: longer than ${recov + MOVES.hook.startup}`);
  // Traits default from skill; the gym's Mayor parries
  const t = botTraits({ skill: 0.5 });
  assert.ok(t.block > 0 && t.pace > 0 && t.parry === 0 && !t.finisher);
  const mayor = createFightSim({ seed: 3, fighters: [{ id: 'a', name: 'A', style: 'brawler', x: 0, z: 0, yaw: 0 }, { id: 'b', name: 'Mayor', style: 'street', x: 0, z: 1.1, yaw: Math.PI, bot: { skill: 0.8, block: 0.65, parry: 0.5, finisher: true, telegraph: 8, backOff: 45, pace: 1e9 } }] });
  /** A plain player: walks in, jabs every 40 ticks once in reach, always facing the other */
  const plain = (sim: ReturnType<typeof createFightSim>, i: number): FighterInput => {
    const me = sim.fighter('a')!;
    const o = sim.fighter('b')!;
    const dx = o.x - me.x;
    const dz = o.z - me.z;
    const d = Math.hypot(dx, dz);
    const near = d < MOVES.jab.reach + T.radius - 0.1;
    return press({ x: near ? 0 : dx / d, z: near ? 0 : dz / d, punch: near && i % 40 === 0 && !me.move && me.stun <= 0 && me.down <= 0, face: yawTo(me.x, me.z, o.x, o.z) });
  };
  let parries = 0;
  let blocks = 0;
  for (let i = 0; i < 60 * 40; i++)
    for (const e of mayor.step(T.tick, { a: plain(mayor, i) })) {
      if (e.kind === 'parry' && e.who === 'b') parries++;
      if (e.kind === 'block' && e.who === 'b') blocks++;
    }
  // (He only defends here, pace 1e9, so the player gets his jabs off)
  assert.ok(parries + blocks >= 10, `the Mayor answered ${parries + blocks} of the jabs`);
  assert.ok(parries >= 1, `he parried ${parries}`);
  // Ray hardly blocks
  const ray = createFightSim({ seed: 3, fighters: [{ id: 'a', name: 'A', style: 'brawler', x: 0, z: 0, yaw: 0 }, { id: 'b', name: 'Ray', style: 'brawler', x: 0, z: 1.1, yaw: Math.PI, bot: { skill: 0.3, block: 0.15, dodge: 0.03, kicks: 0.15, pace: 75 } }] });
  let rayBlocks = 0;
  let hits = 0;
  for (let i = 0; i < 60 * 40; i++)
    for (const e of ray.step(T.tick, { a: plain(ray, i) })) {
      if (e.kind === 'block' && e.who === 'b') rayBlocks++;
      if (e.kind === 'hit' && e.who === 'a') hits++;
    }
  assert.ok(hits > rayBlocks, `Ray blocked ${rayBlocks}, took ${hits}`);
  // Backing off: after a chain of two the Mayor retreats for a while
  const bo = createFightSim({ seed: 2, fighters: [{ id: 'a', name: 'A', style: 'brawler', x: 0, z: 0, yaw: 0 }, { id: 'b', name: 'Mayor', style: 'street', x: 0, z: 1.0, yaw: Math.PI, bot: { skill: 0.8, backOff: 45, pace: 20, block: 0 } }] });
  const chainAt = { t: -1, d: 0 };
  for (let i = 0; i < 60 * 20 && chainAt.t < 0; i++) {
    for (const e of bo.step(T.tick, { a: press({ block: false }) })) if (e.kind === 'chain' && e.who === 'b' && e.n >= 2) chainAt.t = i;
  }
  assert.ok(chainAt.t >= 0, 'he landed a chain');
  const A = bo.fighter('a')!;
  const B = bo.fighter('b')!;
  // Once the chain's last move ends he's backing off: the gap opens over the next half second
  for (let i = 0; i < 120 && !(B.move === null && B.bot!.backT > 0); i++) bo.step(T.tick);
  assert.ok(B.bot!.backT > 0, 'backing off');
  const d0 = Math.hypot(B.x - A.x, B.z - A.z);
  run(bo, 30);
  const d1 = Math.hypot(B.x - A.x, B.z - A.z);
  assert.ok(d1 > d0 + 0.3, `backed off from ${d0.toFixed(2)} to ${d1.toFixed(2)}`);
});

/* ---------- Phase 3: styles bought at the trainer's, harder kicks, the record's new counts ---------- */
import { buyStyle, ownsStyle, pickStyle } from '../src/scripts/city3d/tycoon';
import { FIGHT_STYLES } from '../src/scripts/city3d/catalog';
import { damageOf } from '../src/scripts/city3d/fight-sim';

test("a Kickboxer's kicks land harder; punches don't", () => {
  assert.equal(damageOf('brawler', 'frontKick'), MOVES.frontKick.damage);
  assert.equal(damageOf('kickboxer', 'frontKick'), Math.round(MOVES.frontKick.damage * STYLES.kickboxer.kick));
  assert.ok(STYLES.kickboxer.kick > 1 && STYLES.brawler.kick === 1 && STYLES.street.kick === 1);
  assert.equal(damageOf('kickboxer', 'jab'), MOVES.jab.damage);
  // On the sim: a front kick from a Kickboxer takes more health than a Brawler's
  const taken = (style: 'brawler' | 'kickboxer') => {
    const sim = pair(1.2, {}, [style, 'brawler']);
    run(sim, 1, { a: press({ kick: true }) });
    run(sim, moveFrames('frontKick'));
    return T.health - sim.fighter('b')!.health;
  };
  assert.ok(taken('kickboxer') > taken('brawler'));
});

test('styles: the Brawler is everyone\'s, the others need Dorras and a level, a bought style is picked, only owned styles can be picked, cleaning keeps them', () => {
  const s = newSave(1000);
  assert.ok(ownsStyle(s, 'brawler') && !ownsStyle(s, 'kickboxer'));
  assert.equal(buyStyle(s, 'brawler').ok, false, 'already yours');
  s.dorras = 100_000;
  s.xp = 0;
  assert.deepEqual(buyStyle(s, 'kickboxer'), { ok: false, why: 'level' });
  s.xp = 1e9;
  s.dorras = 10;
  assert.deepEqual(buyStyle(s, 'street'), { ok: false, why: 'money' });
  s.dorras = 100_000;
  const r = buyStyle(s, 'kickboxer');
  assert.ok(r.ok);
  assert.equal(s.dorras, 100_000 - FIGHT_STYLES.kickboxer.price);
  assert.equal(s.fight.style, 'kickboxer', 'picked as bought');
  assert.deepEqual(s.fight.styles, ['brawler', 'kickboxer']);
  assert.equal(s.counters.bought, 1);
  assert.deepEqual(buyStyle(s, 'kickboxer'), { ok: false, why: 'owned' });
  assert.equal(pickStyle(s, 'street'), false, 'not owned');
  assert.equal(s.fight.style, 'kickboxer');
  assert.equal(pickStyle(s, 'brawler'), true);
  assert.equal(s.fight.style, 'brawler');
  assert.equal(pickStyle(s, 'brawler'), false, 'already picked');
  const c = cleanSave(JSON.parse(JSON.stringify({ ...s, fight: { ...s.fight, style: 'kickboxer' } })), 2000);
  assert.deepEqual(c.fight.styles, ['brawler', 'kickboxer']);
  assert.equal(c.fight.style, 'kickboxer');
});

test('a fight counts its spars, blocks, big chains, the top fighter beaten and the rounds won standing or untouched', () => {
  const s = newSave(1000);
  s.xp = 1e9;
  finishFight(s, { kind: 'spar', bot: 'easy', won: null, hits: 3, kos: 0, bestChain: 4, seconds: 20, blocks: 7, ironRounds: 0, cleanRounds: 0 });
  assert.equal(s.counters.spars, 1);
  assert.equal(s.counters.blocks, 7);
  assert.equal(s.counters.chains, 1);
  assert.equal(s.counters.bigChains, 1);
  finishFight(s, { kind: 'bout', bot: 'hard', won: true, hits: 30, kos: 1, bestChain: 3, seconds: 100, blocks: 2, ironRounds: 2, cleanRounds: 1 });
  assert.equal(s.counters.bossWins, 1);
  assert.equal(s.counters.fightWins, 1);
  assert.equal(s.counters.ironRounds, 2);
  assert.equal(s.counters.cleanRounds, 1);
  assert.equal(s.counters.bigChains, 1, 'a chain of three is not a big one');
  finishFight(s, { kind: 'bout', bot: 'medium', won: true, hits: 30, kos: 0, bestChain: 1, seconds: 100 });
  assert.equal(s.counters.bossWins, 1, 'only the top fighter counts');
  assert.equal(s.counters.blocks, 9, 'left out means none');
  // Junk is clamped: never more rounds than a bout has, never a negative count
  finishFight(s, { kind: 'bout', bot: 'easy', won: false, hits: 0, kos: 0, bestChain: 0, seconds: 10, blocks: -4, ironRounds: 99, cleanRounds: 2.6 });
  assert.equal(s.counters.blocks, 9);
  assert.equal(s.counters.ironRounds, 5);
  assert.equal(s.counters.cleanRounds, 4);
});
