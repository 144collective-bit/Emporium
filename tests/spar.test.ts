// Sparring partners and styles (docs/inventory-plan.md Phase 3, docs/fight-plan.md Phase 3): the styles sold at
// the trainer, the Kickboxer's harder kicks, street spars on the save, the street chain, their missions and badge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLE_CATALOG, XP, xpForLevel } from '../src/scripts/city3d/catalog';
import { MOVES, STYLES, damageOf } from '../src/scripts/city3d/fight-moves';
import { T, createFightSim } from '../src/scripts/city3d/fight-sim';
import { BRAWL, NO_BRAWL, createBrawl } from '../src/scripts/city3d/brawl-sim';
import { PARTNERS } from '../src/scripts/city3d/brawlsite';
import { BADGES, MISSIONS, acceptMission, checkBadges, missionProgress } from '../src/scripts/city3d/missions';
import { cleanSave, type TycoonSave } from '../src/scripts/city3d/tycoon';
import { buyStyle, finishFight, pickStyle } from '../src/scripts/city3d/fightsave';

const T0 = Date.UTC(2026, 9, 28, 12);
const fresh = () => cleanSave(null, T0);
const rich = (lv: number) => {
  const s = fresh();
  s.dorras = 1_000_000;
  s.xp = xpForLevel(lv);
  return s;
};

test('the styles: the Brawler is everyone’s, the others cost Dorras and a level, and are picked once bought', () => {
  const s = fresh();
  assert.deepEqual(s.fight.styles, ['brawler']);
  assert.equal(STYLE_CATALOG.brawler.price, 0);
  assert.ok(STYLE_CATALOG.kickboxer.price > 0 && STYLE_CATALOG.street.price > STYLE_CATALOG.kickboxer.price);
  assert.ok(STYLE_CATALOG.street.level > STYLE_CATALOG.kickboxer.level);
  assert.deepEqual(buyStyle(s, 'brawler'), { ok: false, why: 'owned' });
  // (too low a level, then too little money)
  assert.deepEqual(buyStyle(s, 'kickboxer'), { ok: false, why: 'level' });
  s.xp = xpForLevel(STYLE_CATALOG.kickboxer.level);
  s.dorras = STYLE_CATALOG.kickboxer.price - 1;
  assert.deepEqual(buyStyle(s, 'kickboxer'), { ok: false, why: 'money' });
  s.dorras = STYLE_CATALOG.kickboxer.price;
  assert.equal(buyStyle(s, 'kickboxer').ok, true);
  assert.equal(s.dorras, 0);
  assert.equal(s.fight.style, 'kickboxer');
  assert.ok(s.fight.styles.includes('kickboxer'));
  assert.equal(s.ledger.totals.fightclub, STYLE_CATALOG.kickboxer.price);
  assert.equal(pickStyle(s, 'street'), false, 'not owned');
  assert.equal(pickStyle(s, 'brawler'), true);
  assert.equal(s.fight.style, 'brawler');
  // (kept through a save and a load)
  const back = cleanSave(JSON.parse(JSON.stringify(s)), T0);
  assert.deepEqual(back.fight.styles, ['brawler', 'kickboxer']);
  assert.equal(back.fight.style, 'brawler');
});

test("the Kickboxer's kicks hit harder, in the sim too; punches are the same in every style", () => {
  assert.ok(damageOf(MOVES.frontKick, 'kickboxer') > damageOf(MOVES.frontKick, 'brawler'));
  assert.equal(damageOf(MOVES.jab, 'kickboxer'), MOVES.jab.damage);
  assert.equal(damageOf(MOVES.roundhouse, 'street'), MOVES.roundhouse.damage);
  assert.ok(STYLES.kickboxer.kick > 1 && STYLES.brawler.kick === 1);
  // A front kick from close in, in each style: the damage the hit says it did is what came off
  for (const style of ['brawler', 'kickboxer'] as const) {
    const sim = createFightSim({ seed: 3, fighters: [{ id: 'a', name: 'A', style, x: 0, z: 0, yaw: 0 }, { id: 'b', name: 'B', style: 'brawler', x: 0, z: 1.2, yaw: Math.PI }] });
    let hit = 0;
    for (let i = 0; i < 60 && !hit; i++) {
      for (const e of sim.step(T.tick, { a: { x: 0, z: 0, face: 0, punch: false, kick: i === 0, block: false, dodge: false } })) if (e.kind === 'hit') hit = e.damage;
    }
    assert.equal(hit, damageOf(MOVES.frontKick, style), style);
    assert.equal(sim.fighter('b')!.health, T.health - hit);
  }
});

const street = (s: TycoonSave, partner: 'duke' | 'tash' | 'sal', won: boolean, quit = false) => finishFight(s, { kind: 'street', bot: 'easy', partner, won, hits: 6, kos: won ? 1 : 0, bestChain: 2, seconds: 40, quit });

test('a street spar: XP as a spar and more for a win, no Dorras, each partner’s record, the first win over each counted', () => {
  const s = fresh();
  const d0 = s.dorras;
  const lost = street(s, 'duke', false, true);
  assert.equal(lost.won, false);
  assert.equal(lost.prize, 0);
  assert.equal(s.dorras, d0);
  assert.deepEqual(s.fight.partners.duke, { spars: 1, beaten: 0 });
  assert.equal(s.counters.streetSpars, 1);
  assert.equal(s.counters.partnersBeaten, 0);
  const won = street(s, 'duke', true);
  assert.equal(won.won, true);
  assert.ok(won.xp >= XP.spar + XP.streetWin);
  assert.ok(won.xp > lost.xp);
  street(s, 'duke', true);
  assert.deepEqual(s.fight.partners.duke, { spars: 3, beaten: 2 });
  assert.equal(s.counters.partnersBeaten, 1, 'each partner once');
  assert.equal(s.counters.streetSpars, 3);
  // (no bout, no win at the gym)
  assert.equal(s.fight.bouts, 0);
  assert.equal(s.fight.wins, 0);
  // Kept through a save and a load; unknown partners and nonsense dropped
  const raw = JSON.parse(JSON.stringify(s));
  raw.fight.partners.nobody = { spars: 4, beaten: 1 };
  raw.fight.partners.tash = { spars: 1, beaten: 9 };
  const back = cleanSave(raw, T0);
  assert.deepEqual(back.fight.partners.duke, { spars: 3, beaten: 2 });
  assert.deepEqual(back.fight.partners.tash, { spars: 1, beaten: 1 });
  assert.ok(!('nobody' in back.fight.partners));
  // (an older save has no partners)
  const old = JSON.parse(JSON.stringify(fresh()));
  delete old.fight.partners;
  assert.deepEqual(cleanSave(old, T0).fight.partners, {});
});

test('the street chain: three strikes landing close together, counted once; a miss or a pause ends it', () => {
  const b = createBrawl('brawler');
  const tick = () => b.step(T.tick, 0, 0, 0, NO_BRAWL);
  assert.equal(b.landed(true), false);
  tick();
  assert.equal(b.landed(true), false);
  tick();
  assert.equal(b.landed(true), true, 'the third');
  tick();
  assert.equal(b.landed(true), false, 'counted once');
  b.landed(false);
  assert.equal(b.landed(true), false);
  for (let i = 0; i < BRAWL.chain + 2; i++) tick();
  assert.equal(b.landed(true), false, 'too long a pause starts again');
  tick();
  assert.equal(b.landed(true), false);
  tick();
  assert.equal(b.landed(true), true);
});

test('the missions and the badge: a street spar, a street chain, every partner sparred, every partner beaten', () => {
  const s = rich(5);
  const ids = ['sparring-partner', 'one-two-three', 'round-the-city'];
  for (const id of ids) assert.ok(MISSIONS.some((m) => m.id === id), id);
  for (const id of ids) assert.equal(acceptMission(s, id, T0).ok, true, id);
  const act = (id: string) => missionProgress(s, s.missions.active.find((a) => a.id === id)!);
  assert.equal(act('sparring-partner').complete, false);
  street(s, 'duke', false);
  assert.equal(act('sparring-partner').complete, true);
  s.counters.streetChains++;
  assert.equal(act('one-two-three').complete, true);
  assert.deepEqual(act('round-the-city'), { done: 1, need: PARTNERS.length, complete: false });
  street(s, 'tash', true);
  street(s, 'sal', false);
  assert.equal(act('round-the-city').complete, true);
  const badge = BADGES.find((x) => x.id === 'partners-all')!;
  assert.equal(badge.name, 'Street Fighter');
  assert.ok(!checkBadges(s).some((x) => x.id === 'partners-all'), 'not every partner beaten yet');
  street(s, 'duke', true);
  street(s, 'sal', true);
  assert.ok(checkBadges(s).some((x) => x.id === 'partners-all'));
  // (the old mission kept its id, under a name of its own now the badge is the Street Fighter)
  assert.notEqual(MISSIONS.find((m) => m.id === 'street-fighter')!.name, 'Street fighter');
});
