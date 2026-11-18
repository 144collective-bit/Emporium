// Waking at home (spawn.ts, docs/spawn-plan.md): the street round his house is ready when the districts near it have
// loaded and nothing near it is waiting to be built, and the doors never wait for ever.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GIVE_UP_MS, READY_AT, READY_REACH, dueDistricts, streetReady } from '../src/scripts/city3d/spawn';
import { HOME, HOME_WAKE, onHome } from '../src/scripts/city3d/home';
import { rectDistance } from '../src/scripts/city3d/tileplan';
import { SOUTH_DRAWN } from '../src/scripts/city3d/south';

test('round the house is measured from the gates, on his land, reaching the Close and past the yard', () => {
  assert.ok(Math.abs(READY_AT[0] - HOME.gates.x) < 1e-9);
  assert.ok(onHome(READY_AT[0] - 0.5, READY_AT[1]), 'at the gates');
  assert.ok(Math.hypot(HOME_WAKE.x - READY_AT[0], HOME_WAKE.z - READY_AT[1]) < READY_REACH / 3, 'the room well inside it');
  assert.ok(READY_REACH >= 40 && READY_REACH <= 90, 'the street, not the whole city');
});

test("the districts due are the near ones not loaded yet, and the south's (his house's) is one of them", () => {
  assert.ok(rectDistance(READY_AT[0], READY_AT[1], SOUTH_DRAWN) === 0, 'his house is in the south');
  const list = [
    { id: 'south', rect: SOUTH_DRAWN },
    { id: 'near', rect: [READY_AT[0] + 30, READY_AT[1], READY_AT[0] + 40, READY_AT[1] + 10] as [number, number, number, number] },
    { id: 'far', rect: [READY_AT[0] + 500, READY_AT[1], READY_AT[0] + 510, READY_AT[1] + 10] as [number, number, number, number] },
  ];
  assert.deepEqual(dueDistricts(list, []), ['south', 'near']);
  assert.deepEqual(dueDistricts(list, ['south']), ['near']);
  assert.deepEqual(dueDistricts(list, ['south', 'near']), []);
});

test('ready once nothing near is due or waiting, and never stuck past the wait', () => {
  assert.equal(streetReady({ due: 0, waiting: 0, waitedMs: 0 }), true);
  assert.equal(streetReady({ due: 1, waiting: 0, waitedMs: 1000 }), false, 'a district still coming');
  assert.equal(streetReady({ due: 0, waiting: 3, waitedMs: 1000 }), false, 'sites still to build');
  assert.equal(streetReady({ due: 2, waiting: 40, waitedMs: GIVE_UP_MS }), true, 'the doors open anyway');
  assert.ok(GIVE_UP_MS >= 10000 && GIVE_UP_MS <= 60000);
});
