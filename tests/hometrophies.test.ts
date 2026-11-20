// The trophy wall in Degen's lounge (hometrophies.ts, docs/compound-plan.md Phase 2): its slots from the save (the
// kart cups in their metals, the Fight Club's belt and a glove a level beaten, a frame a milestone level), empty stands
// for what's not won yet, and the feed that tells the drawing only when what it shows has changed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MILESTONES, SHELF, createShelf, trophies, trophyKey, type TrophySave } from '../src/scripts/city3d/hometrophies';
import { CUP_IDS } from '../src/scripts/city3d/kart-cups';
import { BOT_LEVELS, MAX_LEVEL, xpForLevel } from '../src/scripts/city3d/catalog';
import { newSave } from '../src/scripts/city3d/tycoon';

const blank = (): TrophySave => ({ xp: 0, karts: { trophies: {} }, fight: { wins: 0, bots: {} } });

test('a new save: every slot on the wall, none won', () => {
  for (const s of [blank(), newSave(Date.now())]) {
    const slots = trophies(s);
    assert.equal(slots.length, CUP_IDS.length + 1 + BOT_LEVELS.length + MILESTONES.length);
    assert.ok(slots.every((t) => !t.won), 'nothing won yet');
    assert.equal(new Set(slots.map((t) => t.id)).size, slots.length, 'each slot its own');
  }
});

test('three shelves: the cups on top, the belt and gloves in the middle, the milestones at the bottom, each spread along its shelf', () => {
  const slots = trophies(blank());
  assert.deepEqual([...new Set(slots.filter((t) => t.shelf === 0).map((t) => t.kind))], ['cup']);
  assert.deepEqual([...new Set(slots.filter((t) => t.shelf === 1).map((t) => t.kind))], ['belt', 'glove']);
  assert.deepEqual([...new Set(slots.filter((t) => t.shelf === 2).map((t) => t.kind))], ['frame']);
  for (const shelf of [0, 1, 2]) {
    const along = slots.filter((t) => t.shelf === shelf).map((t) => t.along);
    for (const a of along) assert.ok(a > 0 && a < 1, 'off the shelf\'s ends');
    for (let i = 1; i < along.length; i++) assert.ok(along[i] - along[i - 1] > 0.1, 'apart');
  }
  assert.ok(MILESTONES.every((m) => m >= 2 && m <= MAX_LEVEL), 'levels you can reach');
});

test('the cups: won in the metal of your best place (1 gold, 2 silver, 3 bronze), as the kart park\'s cabinet', () => {
  const s = blank();
  s.karts.trophies = { [CUP_IDS[0]]: 1, [CUP_IDS[1]]: 3 };
  const cup = (id: string) => trophies(s).find((t) => t.id === `cup:${id}`)!;
  assert.deepEqual([cup(CUP_IDS[0]).won, cup(CUP_IDS[0]).metal], [true, 1]);
  assert.deepEqual([cup(CUP_IDS[1]).won, cup(CUP_IDS[1]).metal], [true, 3]);
  assert.equal(cup(CUP_IDS[2]).won, false);
  // (anything off the podium isn't a trophy)
  s.karts.trophies = { [CUP_IDS[0]]: 5 };
  assert.equal(cup(CUP_IDS[0]).won, false);
});

test('the Fight Club: the belt once a bout is won, a glove for each level of opponent beaten', () => {
  const s = blank();
  const at = (id: string) => trophies(s).find((t) => t.id === id)!.won;
  assert.equal(at('belt'), false);
  s.fight.wins = 1;
  assert.equal(at('belt'), true);
  s.fight.bots = { [BOT_LEVELS[0]]: { beaten: 2 }, [BOT_LEVELS[1]]: { beaten: 0 } };
  assert.equal(at(`glove:${BOT_LEVELS[0]}`), true);
  assert.equal(at(`glove:${BOT_LEVELS[1]}`), false);
  assert.equal(at(`glove:${BOT_LEVELS[2]}`), false);
});

test('the milestones: a frame for each level reached', () => {
  const s = blank();
  s.xp = xpForLevel(MILESTONES[1]);
  const frames = trophies(s).filter((t) => t.kind === 'frame');
  assert.deepEqual(frames.map((t) => t.won), MILESTONES.map((m) => m <= MILESTONES[1]));
});

test('the feed: listeners hear the wall as it is, then only when it changes', () => {
  const shelf = createShelf();
  const heard: string[] = [];
  // (before the save is read, a listener hears nothing yet)
  const stop = shelf.on((slots) => heard.push(trophyKey(slots)));
  assert.equal(heard.length, 0);
  const s = blank();
  shelf.set(s);
  assert.equal(heard.length, 1);
  shelf.set(s);
  s.xp += 5;
  shelf.set(s);
  assert.equal(heard.length, 1, 'nothing on the wall changed');
  s.fight.wins = 1;
  shelf.set(s);
  assert.equal(heard.length, 2);
  // A listener that joins later hears the wall at once
  let late = '';
  shelf.on((slots) => (late = trophyKey(slots)));
  assert.equal(late, heard[1]);
  stop();
  s.karts.trophies = { [CUP_IDS[0]]: 2 };
  shelf.set(s);
  assert.equal(heard.length, 2, 'stopped');
  assert.notEqual(late, heard[1]);
  assert.ok(SHELF && typeof SHELF.set === 'function', 'the city\'s own feed');
});
