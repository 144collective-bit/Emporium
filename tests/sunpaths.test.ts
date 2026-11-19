// Sunridge's cul-de-sacs with a footpath through to the loop (sunridgelots.ts `COURT_PATHS`; the map polish plan's
// Phase 7, the owner's call: nowhere a dead end on foot)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURT_PATHS, LOTS, outline } from '../src/scripts/city3d/sunridgelots';
import { BULB, COURTS, HALF, PARKWAY_LOOP, distTo, inside, type Pt } from '../src/scripts/city3d/sunridge';
import { HOUSE_SOLIDS } from '../src/scripts/city3d/sunhouses';
import { WALLS } from '../src/scripts/city3d/sunyards';
import { SUN_LAMPS } from '../src/scripts/city3d/sunlamps';

const inRect = ([x0, z0, x1, z1]: number[], [x, z]: Pt, m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;

test('a footpath from every turning circle to the loop: from inside the circle to the loop\'s kerb', () => {
  assert.equal(COURT_PATHS.length, COURTS.length);
  COURTS.forEach((c, i) => {
    const [x0, z0, x1, z1] = COURT_PATHS[i];
    const end = c.pts[c.pts.length - 1];
    // (its south end inside the circle, its north end at the loop's carriageway's edge)
    assert.ok(Math.hypot((x0 + x1) / 2 - end[0], z1 - end[1]) < BULB, `${c.id}'s path doesn't start in its circle`);
    assert.ok(Math.abs(distTo(PARKWAY_LOOP, [(x0 + x1) / 2, z0], true) - HALF) < 0.6, `${c.id}'s path doesn't reach the loop`);
  });
});

test('nothing in the way: no lot, house, yard wall or lamp on a footpath', () => {
  for (const r of COURT_PATHS) {
    const [x0, z0, x1, z1] = r;
    for (let z = z0 + 0.6; z < z1 - 0.2; z += 0.5)
      for (const x of [x0 + 0.3, (x0 + x1) / 2, x1 - 0.3]) {
        assert.ok(!LOTS.some((l) => inside(outline(l), [x, z])), `a lot on the path at ${x.toFixed(1)}, ${z.toFixed(1)}`);
        assert.ok(!HOUSE_SOLIDS.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3]), 'a house on the path');
      }
    for (const w of WALLS)
      for (let f = 0.05; f < 1; f += 0.1) {
        const p: Pt = [w.a[0] + (w.b[0] - w.a[0]) * f, w.a[1] + (w.b[1] - w.a[1]) * f];
        assert.ok(!inRect(r, p, -0.05), `a yard wall across the path at ${p[0].toFixed(1)}, ${p[1].toFixed(1)}`);
      }
    for (const [x, z] of SUN_LAMPS) assert.ok(!inRect(r, [x, z], 0.5), 'a lamp in the path');
  }
});
