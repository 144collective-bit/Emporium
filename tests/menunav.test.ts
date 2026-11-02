// How you move round a menu (menunav.ts, docs/menu-plan.md Phase 1): the d-pad to the nearest button the way
// pressed, in line before off to the side, never backwards; tabs wrapping; a sheet closing on a long drag or a
// flick; a sideways swipe stepping a tab.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextFocus, swipeCloses, swipeTab, tabStep, type Rect } from '../src/scripts/city3d/menunav';

/** A grid of 3 x 3 buttons 100 wide and 40 high, 10 apart, row by row */
const grid: Rect[] = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid.push({ x: c * 110, y: r * 50, w: 100, h: 40 });

test('the d-pad goes to the next button the way pressed, and stays put at the edge', () => {
  assert.equal(nextFocus(grid, 4, 'right'), 5);
  assert.equal(nextFocus(grid, 4, 'left'), 3);
  assert.equal(nextFocus(grid, 4, 'up'), 1);
  assert.equal(nextFocus(grid, 4, 'down'), 7);
  assert.equal(nextFocus(grid, 2, 'right'), 2);
  assert.equal(nextFocus(grid, 6, 'down'), 6);
  assert.equal(nextFocus(grid, 0, 'up'), 0);
});

test('in line before off to the side, and never backwards', () => {
  // A wide button under the first two of a row: down from the second lands on it, not on the row under the third
  const items: Rect[] = [
    { x: 0, y: 0, w: 100, h: 40 },
    { x: 110, y: 0, w: 100, h: 40 },
    { x: 220, y: 0, w: 100, h: 40 },
    { x: 0, y: 60, w: 210, h: 40 },
    { x: 220, y: 50, w: 100, h: 40 },
  ];
  assert.equal(nextFocus(items, 1, 'down'), 3);
  assert.equal(nextFocus(items, 2, 'down'), 4);
  // Up from the wide one: one above it, whichever's nearest in line
  assert.ok([0, 1].includes(nextFocus(items, 3, 'up')));
  // A list beside a column of details: right from a card goes across, never to something behind it
  const side: Rect[] = [
    { x: 0, y: 0, w: 120, h: 50 },
    { x: 0, y: 60, w: 120, h: 50 },
    { x: 140, y: 80, w: 200, h: 30 },
  ];
  assert.equal(nextFocus(side, 0, 'right'), 2);
  assert.equal(nextFocus(side, 2, 'left'), 1);
  assert.equal(nextFocus(side, 2, 'right'), 2);
});

test('no items, or a stale index, never throws', () => {
  assert.equal(nextFocus([], 0, 'down'), -1);
  assert.equal(nextFocus(grid, 99, 'down'), 0);
});

test('tabs wrap round both ways', () => {
  assert.equal(tabStep(3, 0, 1), 1);
  assert.equal(tabStep(3, 2, 1), 0);
  assert.equal(tabStep(3, 0, -1), 2);
  assert.equal(tabStep(0, 0, 1), 0);
});

test('a sheet closes on a long drag or a flick, not a nudge', () => {
  assert.ok(swipeCloses(150, 500, 600));
  assert.ok(swipeCloses(90, 500, 300));
  assert.ok(swipeCloses(60, 60, 600));
  assert.ok(!swipeCloses(30, 20, 600));
  assert.ok(!swipeCloses(100, 800, 600));
  assert.ok(!swipeCloses(-200, 100, 600));
});

test('a sideways swipe steps a tab; a scroll down does not', () => {
  assert.equal(swipeTab(-90, 10), 1);
  assert.equal(swipeTab(90, 10), -1);
  assert.equal(swipeTab(-40, 0), 0);
  assert.equal(swipeTab(-90, 80), 0);
  assert.equal(swipeTab(0, 300), 0);
});
