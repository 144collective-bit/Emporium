// The Ridgeline Walk, the Belvedere and the Crestmont Glasshouse (crestwalk.ts, crestsites.ts; the premium upgrade's
// Phase 5; the owner's calls, 2026-11-20: "That path, steps where steep", "Halfway up", "East of the reservoir"): the walk
// from Foothill Road by the cable car's foot to the overlook, on clear ground all the way (no hill house's garden, land,
// landmark, road or anything solid), steps wherever it's steep; the Belvedere on it halfway up the climb; the glasshouse
// east of the reservoir, its door to the walk; both under the Emporium.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BENCHES, GLASS_PATH, LOOKOUTS, STEPS, WALK, WALK_LAMPS, WALK_LINE, WALK_POINTS, onSteps, onWalk } from '../src/scripts/city3d/crestwalk';
import { BELVEDERE, EASE, FENCE, GLASSHOUSE, OVERLOOK, RESERVOIR, SITE_DOORS, SITE_SOLIDS, SITE_SPAWNS, onSite } from '../src/scripts/city3d/crestsites';
import { CABLE_STATIONS } from '../src/scripts/city3d/cablecar';
import { CABLE_SOLIDS } from '../src/scripts/city3d/cableline';
import { MANSIONS } from '../src/scripts/city3d/mansions';
import { onLand } from '../src/scripts/city3d/crestland';
import { nearHillRoad } from '../src/scripts/city3d/crestmont';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { heightAt } from '../src/scripts/city3d/terrain';
import { hillPlanting } from '../src/scripts/city3d/landscape';
import { cover } from '../src/scripts/city3d/crestcover';

const EMPORIUM_ROOF = 12.5;
const inR = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
/** Where the walk is meant to touch a landmark's ground: its own places, the overlook it ends at, the reservoir's bank outside its fence */
const own = (x: number, z: number) =>
  inR(BELVEDERE.rect, x, z, 4.5) || inR(GLASSHOUSE.rect, x, z, EASE + 0.5) || inR(OVERLOOK.rect, x, z, EASE + 0.5) || (inR(RESERVOIR.rect, x, z, RESERVOIR.apron + EASE + 0.5) && !inR(FENCE, x, z, 1.5));

test('the walk: from Foothill Road by the cable car to the overlook, on clear ground, crossing no road', () => {
  const foot = CABLE_STATIONS[0];
  const [a, z] = [WALK_LINE[0], WALK_LINE[WALK_LINE.length - 1]];
  assert.ok(Math.hypot(a[0] - foot.at.x, a[1] - foot.at.z) < 8, "the walk starts away from the cable car's foot");
  assert.ok(inR(OVERLOOK.rect, z[0], z[1], 2), "the walk ends away from the overlook");
  assert.ok(WALK_POINTS[WALK_POINTS.length - 1].d > 200);
  for (const p of WALK_POINTS)
    for (const s of [-WALK.half, 0, WALK.half]) {
      const [x, zz] = [p.x - p.u[1] * s, p.z + p.u[0] * s];
      assert.ok(!MANSIONS.some((m) => inR(m.yard, x, zz, 1)), `the walk through a hill house's garden at ${x.toFixed(0)}, ${zz.toFixed(0)}`);
      assert.ok(!onLand(x, zz), `the walk over land at ${x.toFixed(0)}, ${zz.toFixed(0)}`);
      assert.ok(!nearHillRoad(x, zz, 0.3), `the walk on a road at ${x.toFixed(0)}, ${zz.toFixed(0)}`);
      if (!own(x, zz)) assert.ok(!onSite(x, zz), `the walk on a landmark's ground at ${x.toFixed(0)}, ${zz.toFixed(0)}`);
      for (const b of [...SOLIDS, ...CABLE_SOLIDS, ...SITE_SOLIDS]) assert.ok(!inR(b, x, zz), `the walk through something solid at ${x.toFixed(0)}, ${zz.toFixed(0)}`);
    }
});

test('the walk: steps wherever it is steep, its lamps, benches and lookouts beside it', () => {
  for (const p of WALK_POINTS) if (Math.abs(p.grade) >= WALK.steep + 0.01) assert.ok(onSteps(p.d), `steep without steps at ${p.d.toFixed(0)}`);
  assert.ok(STEPS.length >= 1);
  const by = (x: number, z: number, lo: number, hi: number) => {
    const d = Math.min(...WALK_POINTS.map((p) => Math.hypot(p.x - x, p.z - z)));
    return d >= lo && d <= hi;
  };
  for (const [x, z] of WALK_LAMPS) assert.ok(by(x, z, WALK.half, WALK.half + 1), 'a lamp off the walk');
  for (const s of BENCHES) assert.ok(by(s.x, s.z, WALK.half + 0.2, WALK.half + 1.4), 'a bench off the walk');
  assert.equal(LOOKOUTS.length, 2);
  for (const o of LOOKOUTS) {
    assert.ok(by(o.x, o.z, WALK.half + 0.5, WALK.half + 2.5), 'a lookout off the walk');
    // (looking the way the ground falls)
    assert.ok(heightAt(o.x + o.look[0] * 12, o.z + o.look[1] * 12) < heightAt(o.x, o.z) + 0.5, 'a lookout facing the hill');
    for (const b of [...SOLIDS, ...CABLE_SOLIDS, ...SITE_SOLIDS]) assert.ok(!inR(b, o.x, o.z, 1.6), 'a lookout on something solid');
  }
});

test('the Belvedere: on the walk halfway up the climb, on the ground as it is, its columns clear of the way through, under the Emporium', () => {
  const V = BELVEDERE;
  assert.ok(WALK_POINTS.some((p) => Math.hypot(p.x - V.x, p.z - V.z) < 0.6), 'the Belvedere off the walk');
  const top = heightAt(...WALK_LINE[WALK_LINE.length - 1]);
  assert.ok(V.y > 4 && V.y < top - 4, 'the Belvedere not halfway up');
  // (on the ground as it is: its ring level over the highest of its columns' feet)
  for (let k = 0; k < V.columns; k++) {
    const a = ((k + 0.5) / V.columns) * Math.PI * 2;
    assert.ok(V.top - heightAt(V.x + Math.cos(a) * V.r, V.z + Math.sin(a) * V.r) >= V.h, "a Belvedere's column too short");
  }
  // (the walk passes between its columns)
  for (const p of WALK_POINTS)
    for (let k = 0; k < V.columns; k++) {
      const a = ((k + 0.5) / V.columns) * Math.PI * 2;
      assert.ok(Math.hypot(p.x - (V.x + Math.cos(a) * V.r), p.z - (V.z + Math.sin(a) * V.r)) > 0.22 + 0.35, "the walk into a Belvedere's column");
    }
  assert.ok(V.top + V.dome + 0.8 - heightAt(V.x, V.z) < EMPORIUM_ROOF);
  assert.ok(MANSIONS.every((m) => !inR(m.yard, V.x, V.z, 10)));
});

test('the glasshouse: east of the reservoir, level, its door to the walk, clear of the hills\' houses and land, under the Emporium', () => {
  const G = GLASSHOUSE;
  assert.ok(G.rect[0] > RESERVOIR.rect[2], 'the glasshouse not east of the reservoir');
  for (let x = G.rect[0]; x <= G.rect[2]; x += 0.5) for (let z = G.rect[1]; z <= G.rect[3]; z += 0.5) {
    assert.ok(Math.abs(heightAt(x, z) - G.y) < 1e-6, "the glasshouse's garden not level");
    assert.ok(!onLand(x, z, 1) && !nearHillRoad(x, z, 2) && !MANSIONS.some((m) => inR(m.yard, x, z, 6)), 'the glasshouse on something');
  }
  const door = SITE_DOORS.find((d) => d.id === 'glasshouse')!;
  const [ex, ez] = GLASS_PATH[GLASS_PATH.length - 1];
  assert.ok(Math.hypot(ex - door.x, ez - door.z) < 1.2, "the glasshouse's path misses its door");
  assert.ok(WALK_POINTS.some((p) => Math.hypot(p.x - GLASS_PATH[0][0], p.z - GLASS_PATH[0][1]) < 1), "the glasshouse's path off the walk");
  for (let k = 1; k < GLASS_PATH.length; k++) for (let t = 0; t <= 1; t += 0.05) {
    const [x, z] = [GLASS_PATH[k - 1][0] + (GLASS_PATH[k][0] - GLASS_PATH[k - 1][0]) * t, GLASS_PATH[k - 1][1] + (GLASS_PATH[k][1] - GLASS_PATH[k - 1][1]) * t];
    assert.ok(!onLand(x, z) && !nearHillRoad(x, z, 0.5) && !MANSIONS.some((m) => inR(m.yard, x, z, 1)), 'the glasshouse path on something');
    for (const b of [...SOLIDS, ...CABLE_SOLIDS, ...SITE_SOLIDS]) assert.ok(!inR(b, x, z), 'the glasshouse path through something solid');
  }
  const at = SITE_SPAWNS.glasshouse;
  assert.ok(Math.hypot(at.x - door.x, at.z - door.z) < 4);
  assert.ok(G.dome.h + 0.6 < EMPORIUM_ROOF);
});

test("nothing growing or lying on the walk: the hills' oaks and scrub, the drifts and the rocks off its gravel, benches and lookouts (the polish pass)", () => {
  const near = (x: number, z: number) => Math.min(...WALK_POINTS.map((p) => Math.hypot(p.x - x, p.z - z)));
  const { oaks, scrub } = hillPlanting();
  for (const o of oaks) assert.ok(near(o.x, o.z) > WALK.half + 1.2, `an oak on the walk at ${o.x.toFixed(0)}, ${o.z.toFixed(0)}`);
  for (const b of scrub) assert.ok(near(b.x, b.z) > WALK.half + 0.5, 'scrub on the walk');
  const { drifts, outcrops } = cover();
  for (const d of drifts) for (const c of d.clumps) assert.ok(!onWalk(c.x, c.z, 0.4), 'a drift on the walk');
  for (const o of outcrops) for (const r of o) assert.ok(near(r.x, r.z) > WALK.half + 0.6, `a rock on the walk at ${r.x.toFixed(0)}, ${r.z.toFixed(0)}`);
  // (and onWalk() finds the walk where it is)
  for (const p of WALK_POINTS) assert.ok(onWalk(p.x, p.z));
  for (const b of BENCHES) assert.ok(onWalk(b.x, b.z));
});
