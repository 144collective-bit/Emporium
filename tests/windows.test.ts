// The windows on the city's shared wall atlas (windows.ts, docs/trenches-variety-plan.md Phase 1, the owner's picks:
// the whole city's atlas; almost none lit by day, about one in twenty and warm; about half lit at night, mostly warm,
// some a television's blue, the odd neon): every wall kind has its own window, the shares come out as picked, a window
// lit by day is a warm one lit at night, and the same window always paints the same.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_LIT, NIGHT_LIT, NIGHT_MIX, WINDOW_TYPE, paneAt, type Pane, type WallKindName } from '../src/scripts/city3d/windows';

const KINDS: WallKindName[] = ['brick', 'brownstone', 'stuccoTeal', 'stuccoPink', 'stuccoViolet', 'industrial', 'glassBlue', 'glassTeal', 'hotel', 'brickTan', 'brickDark'];
/** Every window of the atlas's eleven bands, as infill.ts seeds them (60 + the band's place), 4 floors of 8 bays, pairs */
const ALL: Pane[] = KINDS.flatMap((_, i) => Array.from({ length: 4 }, (_, row) => Array.from({ length: 16 }, (_, k) => paneAt(60 + i, row, k >> 1, k & 1))).flat());

test('every wall kind has its window, and the bricks each a different one', () => {
  for (const k of KINDS) assert.ok(WINDOW_TYPE[k], k);
  const bricks = (['brick', 'brickTan', 'brickDark', 'brownstone'] as const).map((k) => WINDOW_TYPE[k]);
  assert.equal(new Set(bricks).size, bricks.length);
});

test('about half lit at night and one in twenty by day, the day-lit ones only ever warm ones lit at night', () => {
  const night = ALL.filter((p) => p.night).length / ALL.length;
  const day = ALL.filter((p) => p.day).length / ALL.length;
  assert.ok(Math.abs(night - NIGHT_LIT) < 0.06, `${(night * 100).toFixed(1)}% lit at night`);
  assert.ok(Math.abs(day - DAY_LIT) < 0.025, `${(day * 100).toFixed(1)}% lit by day`);
  for (const p of ALL) if (p.day) assert.equal(p.night, 'warm');
});

test("at night mostly warm, some a television's blue, the odd neon", () => {
  const lit = ALL.filter((p) => p.night);
  const share = (l: string) => lit.filter((p) => p.night === l).length / lit.length;
  for (const [l, w] of NIGHT_MIX) assert.ok(Math.abs(share(l) - w) < 0.06, `${l}: ${(share(l) * 100).toFixed(1)}%`);
  assert.ok(share('warm') > 0.6 && share('tv') > 0.1);
});

test('what hangs behind the glass varies, and the same window always paints the same', () => {
  for (const d of ['bare', 'blind', 'curtains'] as const) assert.ok(ALL.filter((p) => p.dressing === d).length > ALL.length * 0.15, d);
  for (const p of ALL) assert.ok(p.drop > 0.1 && p.drop < 0.75);
  assert.deepEqual(paneAt(61, 2, 5, 1), paneAt(61, 2, 5, 1));
  // (the bands don't share one pattern)
  const pattern = (seed: number) => Array.from({ length: 32 }, (_, i) => (paneAt(seed, i >> 3, i & 7).night ? 1 : 0)).join('');
  assert.equal(new Set(KINDS.map((_, i) => pattern(60 + i))).size, KINDS.length);
});
