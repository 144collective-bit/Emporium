// The street plan (layout.ts): blocks, streets, avenues, lanes, the river, and the
// landmarks' old drawing grid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKS, BS, CORE_ROADS, EW_ROADS, GARAGE, LANE, MEDIAN, NS_ROADS, RIVER, SOUTH_ROAD, STREET_GAP, design, designBox, designShift, laneCentres } from '../src/scripts/city3d/layout';
import { SLABS, overlaps } from './world';

test('core blocks are 9 wide with a street between each', () => {
  assert.equal(BS, 9);
  for (let i = 1; i < BLOCKS.length; i++) assert.equal(BLOCKS[i] - BLOCKS[i - 1], BS + STREET_GAP);
  CORE_ROADS.forEach((c, i) => assert.equal(c, BLOCKS[i] + BS + STREET_GAP / 2));
});

test('no road runs over a block, district or the garage (or their sidewalks)', () => {
  for (const r of NS_ROADS) for (const s of SLABS) assert.ok(r.c + r.half <= s[0] || r.c - r.half >= s[2], `north-south road at x ${r.c} crosses a slab at x ${s[0]}-${s[2]}`);
  for (const r of EW_ROADS) for (const s of SLABS) assert.ok(r.c + r.half <= s[1] || r.c - r.half >= s[3], `east-west road at z ${r.c} crosses a slab at z ${s[1]}-${s[3]}`);
});

test('no two slabs overlap', () => {
  for (let i = 0; i < SLABS.length; i++) for (let j = i + 1; j < SLABS.length; j++) assert.ok(!overlaps(SLABS[i], SLABS[j]), `slabs ${i} and ${j} overlap`);
});

test('streets have one lane each way, avenues two, every lane inside its asphalt', () => {
  for (const [roads, axis] of [
    [NS_ROADS, 'z'],
    [EW_ROADS, 'x'],
  ] as const)
    for (const r of roads) {
      const lanes = laneCentres(r, axis);
      assert.equal(lanes.length, r.lanes * 2);
      assert.equal(lanes.filter((l) => l.dir === 1).length, r.lanes);
      for (const l of lanes) {
        assert.ok(Math.abs(l.coord - r.c) + LANE / 2 <= r.half + 1e-9, 'lane spills off the road');
        if (r.lanes === 2) assert.ok(Math.abs(l.coord - r.c) - LANE / 2 >= MEDIAN / 2 - 1e-9, 'lane runs over the median');
      }
    }
});

test('right-hand traffic: heading +x on the +z side, heading +z on the -x side', () => {
  const ew = laneCentres(EW_ROADS[1], 'x');
  for (const l of ew) assert.equal(Math.sign(l.coord - EW_ROADS[1].c), l.dir);
  const ns = laneCentres(NS_ROADS[1], 'z');
  for (const l of ns) assert.equal(Math.sign(l.coord - NS_ROADS[1].c), -l.dir);
});

test('the river runs between the north bank avenue and the south bank road, clear of every slab', () => {
  const north = EW_ROADS.filter((r) => r.c < RIVER[0]).at(-1)!;
  assert.ok(north.c + north.half < RIVER[0]);
  assert.ok(SOUTH_ROAD - EW_ROADS.find((r) => r.c === SOUTH_ROAD)!.half > RIVER[1]);
  for (const s of SLABS) assert.ok(s[3] <= RIVER[0] || s[1] >= RIVER[1], 'a slab sits in the river');
});

test('the garage lot is on the south bank, past the river', () => {
  assert.ok(GARAGE.oz > RIVER[1]);
});

test('the drawing grid maps the old blocks (0, 11, 22) onto today\'s', () => {
  [0, 11, 22].forEach((old, i) => {
    assert.equal(old + designShift(old + 1), BLOCKS[i]);
    assert.deepEqual(design(old + 4.5, old + 4.5), [BLOCKS[i] + 4.5, BLOCKS[i] + 4.5]);
  });
  // A box moves whole, by the block its centre is in
  assert.deepEqual(designBox([11.8, 11.8, 18, 16, 2.6]), [14.8, 14.8, 21, 19, 2.6]);
});
