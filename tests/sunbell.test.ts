/*
 * Sunridge's school bell (sunbell.ts, docs/suburb-plan.md Phase 7): weekdays only, for school, break, lunch and home
 * time, in step with the school's live line (in class from eight till three).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCHOOL_BELLS, bellDue } from '../src/scripts/city3d/sunbell';
import { liveLine } from '../src/scripts/city3d/livelines';

test('the school bell: weekdays at school, break, lunch and home time; never at the weekend or between', () => {
  assert.ok(bellDue(1, 8, 0) && bellDue(5, 15, 0) && bellDue(3, 12, 0));
  assert.ok(!bellDue(0, 8, 0) && !bellDue(6, 15, 0), 'no bell at the weekend');
  assert.ok(!bellDue(2, 8, 1) && !bellDue(2, 9, 0) && !bellDue(2, 16, 0), 'only at its times');
  // The first and the last in step with the live line: in class from eight, out at three
  const [first, last] = [SCHOOL_BELLS[0], SCHOOL_BELLS[SCHOOL_BELLS.length - 1]];
  assert.deepEqual(first, [8, 0]);
  assert.deepEqual(last, [15, 0]);
  const at = (h: number, m: number) => new Date(2026, 10, 18, h, m).getTime(); // a Wednesday
  assert.match(liveLine('sunschool', at(8, 5))!, /In class/);
  assert.match(liveLine('sunschool', at(15, 5))!, /Bell's gone/);
});
