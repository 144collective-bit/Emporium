// The riverside's service yards dressed (serviceyards.ts, the polish plan's Phase 7): bins, a lamp and pallets along
// the brownstones' backs, crates by the landmarks' lot lines, a van across the deeper yards; everything inside its
// yard, clear of the rows' alleys and of everything else solid, solid itself in SOLIDS; nothing that exists moved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIN, CRATES, PALLETS, YARDS, YARD_SOLIDS } from '../src/scripts/city3d/serviceyards';
import { BLOCK_RECT, RIVER_BLOCKS, STRIP_D, YARD_Z } from '../src/scripts/city3d/riverside';
import { rows } from '../src/scripts/city3d/projects';
import { SOLIDS } from '../src/scripts/city3d/solids';
import type { Rect } from '../src/scripts/city3d/downtown';

const overlaps = (a: number[], b: number[], m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
const within = (r: number[], b: number[]) => r[0] >= b[0] - 1e-6 && r[1] >= b[1] - 1e-6 && r[2] <= b[2] + 1e-6 && r[3] <= b[3] + 1e-6;

test('a yard a block of row A, between the landmarks and the strip, dressed: bins, a lamp, pallets, crates; vans in the deep ones', () => {
  assert.deepEqual(YARDS.map((y) => y.block), RIVER_BLOCKS);
  for (const y of YARDS) {
    const [bx0, , bx1, bz1] = BLOCK_RECT[y.block];
    assert.ok(Math.abs(y.wall - (bz1 - STRIP_D)) < 1e-9, "the strip's back");
    assert.ok(y.rect[0] > bx0 && y.rect[2] < bx1 && y.rect[1] >= YARD_Z - 2 && y.rect[3] < y.wall, `${y.block}'s yard on its block`);
    assert.ok(y.props.filter((p) => p.kind === 'bin').length === 3, `${y.block}: three bins`);
    assert.ok(y.props.some((p) => p.kind === 'pallets') && y.props.some((p) => p.kind === 'crates'), `${y.block}: pallets and crates`);
    assert.equal(y.lamps.length, 1);
    for (const p of y.props) {
      assert.ok(within(p.box, y.rect), `${y.block} ${p.kind} outside its yard`);
      const size = p.kind === 'bin' ? BIN : p.kind === 'pallets' ? PALLETS : CRATES;
      assert.ok(Math.abs(p.box[2] - p.box[0] - size.w) < 1e-9 && Math.abs(p.box[3] - p.box[1] - size.d) < 1e-9 && p.h === size.h);
    }
    // The bins and pallets against the back wall, the crates by the lot line
    for (const p of y.props) assert.ok(p.kind === 'crates' ? Math.abs(p.box[1] - y.rect[1]) < 1e-9 : Math.abs(p.box[3] - y.rect[3]) < 1e-9, `${p.kind} where it belongs`);
    const lamp = y.lamps[0];
    assert.ok(Math.abs(lamp.z - y.wall) < 0.1 && lamp.x > y.rect[0] && lamp.x < y.rect[2] && lamp.y > 1.8);
    // Nothing on an alley's way through
    const i = RIVER_BLOCKS.indexOf(y.block);
    for (const a of rows().byBlock[i].alleys) for (const p of y.props) assert.ok(!overlaps(p.box, [a.box[0] - 1, y.rect[1], a.box[2] + 1, y.rect[3]]), `${y.block} ${p.kind} in the alley's way`);
    // The deep yards get a van, in the yard, clear of the props
    const deep = y.rect[3] - y.rect[1] > 3.5;
    assert.equal(y.vans.length, deep ? 1 : 0, `${y.block} ${deep ? 'a van' : 'no room for a van'}`);
    for (const v of y.vans) assert.ok(v.id === 'van' && v.x > y.rect[0] && v.x < y.rect[2] && v.z > y.rect[1] && v.z < y.rect[3]);
  }
  assert.equal(YARDS.filter((y) => y.vans.length).length, 2);
});

test('solid in SOLIDS, and nothing in a yard overlaps anything else solid (the landmarks, the rows, the club)', () => {
  assert.ok(YARD_SOLIDS.length >= YARDS.length * 5);
  for (const s of YARD_SOLIDS) assert.ok(SOLIDS.some((b) => b.every((v, k) => Math.abs(v - s[k]) < 1e-9)), `${s.join()} not in SOLIDS`);
  const own = new Set(YARD_SOLIDS.map((s) => s.join()));
  for (const s of YARD_SOLIDS) for (const b of SOLIDS) if (!own.has(b.join())) assert.ok(!overlaps(s, b as unknown as Rect), `${s.join()} overlaps ${b.join()}`);
  // The vans keep a step clear of the props
  for (const y of YARDS) for (const v of y.vans) for (const p of y.props) {
    const vb = YARD_SOLIDS.find((s) => s[0] < v.x && s[2] > v.x && s[1] < v.z && s[3] > v.z)!;
    assert.ok(!overlaps(vb, p.box, 0.3), `${y.block}'s van on its ${p.kind}`);
  }
});
