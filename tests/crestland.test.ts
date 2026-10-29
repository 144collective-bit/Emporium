// Crestmont's land round its houses (crestland.ts, the polish pass): the vineyards, olive groves and meadows on the
// hills, clear of the roads, the mansions, the landmarks, the golf course and the spur, apart from each other; the
// hills' oaks and scrub off them; the mansions' drives lined with cypresses and their piers clear of the road, its
// lamps and the joggers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIVE_PIERS, DRIVE_TREES, GROVES, LAND_SOLIDS, MEADOWS, VINEYARDS, clear, onLand } from '../src/scripts/city3d/crestland';
import { OAKS, SCRUB } from '../src/scripts/city3d/landscape';
import { CREST_LAMPS, nearHillRoad } from '../src/scripts/city3d/crestmont';
import { heightAt } from '../src/scripts/city3d/terrain';
import { MANSIONS } from '../src/scripts/city3d/mansions';
import { CREST_PEOPLE } from '../src/scripts/city3d/crestlife';
import { moment } from '../src/scripts/city3d/parklife';

test('the vineyards, groves and meadows: on clear, gentle ground on the hills, apart, the oaks and scrub off them', () => {
  assert.ok(VINEYARDS.length >= 2 && GROVES.length >= 2 && MEADOWS.length >= 3);
  for (const v of VINEYARDS) {
    for (let x = v.rect[0]; x <= v.rect[2]; x += 2) for (let z = v.rect[1]; z <= v.rect[3]; z += 2) assert.ok(clear(x, z, 0.5), `a vineyard on taken ground at ${x}, ${z}`);
    assert.ok(v.rows.length >= 6);
  }
  for (const g of GROVES) for (const t of g) assert.ok(clear(t.x, t.z, 0.6) && Math.abs(t.y - heightAt(t.x, t.z)) < 1e-9);
  for (const m of MEADOWS) for (const f of m.flowers) assert.ok(clear(f.x, f.z, 0.8) && Math.abs(f.y - heightAt(f.x, f.z)) < 1e-9, `a meadow's flower on taken ground at ${f.x.toFixed(1)}, ${f.z.toFixed(1)}`);
  const rects = [...VINEYARDS.map((v) => v.rect), ...GROVES.map((g) => [Math.min(...g.map((t) => t.x)), Math.min(...g.map((t) => t.z)), Math.max(...g.map((t) => t.x)), Math.max(...g.map((t) => t.z))])];
  for (const [i, a] of rects.entries()) for (const b of rects.slice(i + 1)) assert.ok(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1], 'two pieces of land on each other');
  for (const p of [...OAKS, ...SCRUB]) assert.ok(!onLand(p.x, p.z), `an oak or scrub in a vineyard, grove or meadow at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
});

test("the mansions' drives: cypresses either side, the piers at the mouth, clear of the road, its lamps and the joggers", () => {
  assert.ok(DRIVE_TREES.length >= 30 && DRIVE_PIERS.length >= 8);
  for (const t of [...DRIVE_TREES, ...DRIVE_PIERS]) {
    assert.ok(!nearHillRoad(t.x, t.z, 0.5), `on a road at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
    for (const [x, z] of CREST_LAMPS) assert.ok(Math.hypot(x - t.x, z - t.z) > 1);
    assert.ok(Math.abs(t.y - heightAt(t.x, t.z)) < 1e-9);
    // (beside a drive, not on it)
    assert.ok(
      MANSIONS.some((m) => {
        const [a, b] = m.drive;
        const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
        const s = Math.max(0, Math.min(1, ((t.x - a[0]) * vx + (t.z - a[1]) * vz) / (vx * vx + vz * vz)));
        const d = Math.hypot(t.x - a[0] - vx * s, t.z - a[1] - vz * s);
        return d > 1.4 && d < 2;
      })
    );
  }
  assert.equal(LAND_SOLIDS.length, DRIVE_PIERS.length);
  const m = moment();
  for (let t = 0; t < 300; t += 2.3)
    for (const p of CREST_PEOPLE) {
      p.at(t, m);
      for (const s of LAND_SOLIDS) assert.ok(!(m.x > s[0] - 0.2 && m.x < s[2] + 0.2 && m.z > s[1] - 0.2 && m.z < s[3] + 0.2), `a jogger through a drive's pier at ${m.x.toFixed(1)}, ${m.z.toFixed(1)}`);
    }

});
