// South of The Trenches redesigned (south.ts, streetfaces.ts; docs/south-plan.md Phase 1a, the owner's calls): the
// street web the south is to be re-laid on. Its streets keep off the ring road, its ramps, the Docks, Degen's compound,
// Lot 9's new fence and the brook (but at a bridge), and off each other but where they meet; they meet at angles and
// bend with the land (the owner's rule); every close and crescent has a footpath through (the owner's rule: nowhere is
// a dead end on foot); the blocks between them are clean outlines behind their kerbs; Lot 9's fence wanders (the
// owner's rule: no ruler-straight edges).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRIDGES, BROOK, BROOK_HALF, BULB, CHURCHYARD, CIRCUS, COMPOUND, EDGE_Z, FOOTPATHS, GATE_LANE, HEDGES, LOT9_BOUNDS, LOT9_EDGE, LOT9_W, LOT_LANE, NODED, PATH_HALF, REC, SOUTH_BLOCKS, SOUTH_CROSSINGS, SOUTH_STREETS, zoneAt, type Pt } from '../src/scripts/city3d/south';
import { area, cross, distTo, inside, selfCrossings } from '../src/scripts/city3d/streetfaces';
import { HEAD, PLOT } from '../src/scripts/city3d/endsfar';
import { HIGHWAY_HALF, fromHighway } from '../src/scripts/city3d/highway';
import { rampLand } from '../src/scripts/city3d/viaduct';
import { DOCKS_RECT } from '../src/scripts/city3d/docks';
import { WALK_W } from '../src/scripts/city3d/layout';

const near = (p: Pt, q: Pt, e = 1e-4) => Math.abs(p[0] - q[0]) < e && Math.abs(p[1] - q[1]) < e;
const toRect = (r: readonly number[], [x, z]: Pt) => Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - z, 0, z - r[3]));
/** The streets' ends that run on out of the town (to the fields, the country, into Lot 9) */
const OPEN_ENDS = new Set(['south-field', 'south-church', 'south-southfold', 'south-lot']);

test('its streets: ids unique, every one named, a real line', () => {
  const ids = SOUTH_STREETS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of SOUTH_STREETS) {
    assert.ok(s.name.trim().length > 2 && !/\d/.test(s.name), `${s.id}: a made-up name, no numbers: "${s.name}"`);
    assert.ok(s.pts.length >= 3, `${s.id}: a line`);
    for (const p of s.pts) assert.ok(Number.isFinite(p[0]) && Number.isFinite(p[1]), `${s.id}: a number`);
  }
  assert.ok(SOUTH_STREETS.filter((s) => s.kind === 'close').length >= 15, 'closes');
  assert.ok(SOUTH_STREETS.filter((s) => s.kind === 'crescent').length >= 3, 'crescents');
});

test('clear of the ring road and its ramps, the Docks and the airport; south of the ring road', () => {
  for (const s of SOUTH_STREETS)
    for (const [x, z] of s.pts) {
      assert.ok(fromHighway(x, z) > HIGHWAY_HALF + 6, `${s.id} at ${x.toFixed(1)}, ${z.toFixed(1)}: by the ring road`);
      assert.ok(!rampLand(x, z), `${s.id} at ${x.toFixed(1)}, ${z.toFixed(1)}: on a ramp's land`);
      assert.ok(toRect(DOCKS_RECT, [x, z]) > 10, `${s.id}: by the Docks`);
      assert.ok(x < 64.5 + 1e-6, `${s.id}: past the airport's avenue`);
      assert.ok(z > EDGE_Z + s.half, `${s.id}: north of the land's edge`);
    }
});

test("Degen's compound stays exactly where it is, its gates on Gate Lane", () => {
  assert.deepEqual([...COMPOUND], [...PLOT]);
  assert.ok(GATE_LANE.pts.some((p) => near(p, HEAD)), 'Gate Lane runs past the gates');
  for (const s of SOUTH_STREETS) for (const p of s.pts) assert.ok(toRect(PLOT, p) >= s.half + WALK_W - 1e-6, `${s.id} on the compound's plot`);
  for (const f of FOOTPATHS) for (const p of f.pts) assert.ok(toRect(PLOT, p) > PATH_HALF, `${f.id} through the compound`);
});

test('streets keep apart but where they meet', () => {
  const at = new Map<string, Pt[]>();
  for (const c of SOUTH_CROSSINGS) for (const id of c.streets) at.set(id, [...(at.get(id) ?? []), c.at]);
  for (let i = 0; i < SOUTH_STREETS.length; i++)
    for (let j = i + 1; j < SOUTH_STREETS.length; j++) {
      const [A, B] = [SOUTH_STREETS[i], SOUTH_STREETS[j]];
      const shared = (at.get(A.id) ?? []).filter((p) => (at.get(B.id) ?? []).some((q) => near(p, q)));
      const gap = A.half + B.half + 2 * WALK_W;
      for (const p of A.pts) {
        if (shared.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 16)) continue;
        const d = distTo(B.pts, p, B.loop);
        assert.ok(d >= gap, `${A.id} and ${B.id} ${d.toFixed(2)} apart at ${p[0].toFixed(1)}, ${p[1].toFixed(1)}`);
      }
    }
});

test('every street ends at a crossing, a turning circle, or runs on out of the town', () => {
  for (const s of SOUTH_STREETS) {
    if (s.loop) continue;
    const ends = [s.pts[0], s.pts[s.pts.length - 1]];
    ends.forEach((e, k) => {
      const crossing = SOUTH_CROSSINGS.some((c) => c.streets.includes(s.id) && near(c.at, e));
      const bulb = k === 1 && s.bulb;
      const open = k === 1 && OPEN_ENDS.has(s.id);
      assert.ok(crossing || bulb || open, `${s.id}'s ${k ? 'end' : 'start'} at ${e[0].toFixed(1)}, ${e[1].toFixed(1)} goes nowhere`);
    });
  }
  // (the crossings' points are in each street's noded line)
  for (const c of SOUTH_CROSSINGS) for (const id of c.streets) if (NODED[id]) assert.ok(NODED[id].some((p) => near(p, c.at)), `${c.id} not on ${id}`);
});

test('streets meet at angles, and bend with the land (the owner\'s rule)', () => {
  const dirAt = (pts: Pt[], p: Pt): Pt => {
    const i = pts.findIndex((q) => near(q, p));
    const [a, b] = i <= 0 ? [pts[0], pts[1]] : i >= pts.length - 1 ? [pts[pts.length - 2], pts[pts.length - 1]] : [pts[i - 1], pts[i + 1]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  for (const c of SOUTH_CROSSINGS) {
    const lines = c.streets.map((id) => NODED[id]).filter(Boolean);
    for (let i = 0; i < lines.length; i++)
      for (let j = i + 1; j < lines.length; j++) {
        const [u, v] = [dirAt(lines[i], c.at), dirAt(lines[j], c.at)];
        const deg = (Math.acos(Math.min(1, Math.abs(u[0] * v[0] + u[1] * v[1]))) * 180) / Math.PI;
        // (a street carried on as another, end to end, runs straight through: no angle)
        const endToEnd = [lines[i], lines[j]].every((l) => near(l[0], c.at) || near(l[l.length - 1], c.at));
        if (!endToEnd) assert.ok(deg >= 20, `${c.id} (${c.streets.join(', ')}): a sliver of a junction, ${deg.toFixed(0)} degrees`);
      }
  }
  // Every main road and link bends: no long ruler-straight run
  for (const s of SOUTH_STREETS.filter((s) => (s.kind === 'main' || s.kind === 'link') && !s.loop)) {
    const head = (i: number) => Math.atan2(s.pts[i + 1][1] - s.pts[i][1], s.pts[i + 1][0] - s.pts[i][0]);
    let turn = 0;
    for (let i = 1; i < s.pts.length - 1; i++) turn += Math.abs(Math.atan2(Math.sin(head(i) - head(i - 1)), Math.cos(head(i) - head(i - 1))));
    assert.ok((turn * 180) / Math.PI > 12, `${s.id} runs ruler-straight`);
  }
});

test('nowhere is a dead end on foot: a footpath out of every close and crescent (the owner\'s rule)', () => {
  const ways = SOUTH_STREETS.filter((s) => s.kind === 'close' || s.kind === 'crescent');
  for (const s of ways) {
    const paths = FOOTPATHS.filter((f) => f.from === s.id);
    assert.equal(paths.length, 1, `${s.id}: its footpath`);
    const [a, b] = paths[0].pts;
    assert.ok(distTo(s.pts, a) < 1e-6, `${s.id}'s path starts on it`);
    assert.ok(SOUTH_STREETS.some((o) => o.id !== s.id && distTo(o.pts, b) < 1e-6), `${s.id}'s path ends on another street`);
  }
  // Each path keeps off the other streets (but where it joins them), the other paths, and what's kept
  for (const f of FOOTPATHS) {
    const [a, b] = f.pts;
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.5);
    for (let k = 1; k < n; k++) {
      const p: Pt = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      assert.ok(!inside(LOT9_EDGE, p) && !inside(CHURCHYARD, p), `${f.id} through Lot 9 or the churchyard`);
      assert.ok(distTo(BROOK, p) > BROOK_HALF, `${f.id} through the brook`);
    }
    for (const g of FOOTPATHS) {
      if (g === f) continue;
      const c = cross(a, b, g.pts[0], g.pts[1]);
      assert.ok(!c || c[0] < 1e-6 || c[0] > 1 - 1e-6, `${f.id} crosses ${g.id}`);
    }
    for (const s of SOUTH_STREETS) {
      if (s.id === f.from) continue;
      for (let i = 1; i < s.pts.length; i++) {
        const c = cross(a, b, s.pts[i - 1], s.pts[i]);
        assert.ok(!c || c[0] > 1 - 1e-3, `${f.id} crosses ${s.id}`);
      }
    }
  }
});

test('the blocks: clean outlines behind their kerbs, none on another, each in a zone', () => {
  assert.ok(SOUTH_BLOCKS.length >= 15, 'blocks');
  for (const b of SOUTH_BLOCKS) {
    assert.ok(area(b.poly) < 0, `${b.id} wound as the street plan's`);
    assert.ok(Math.abs(area(b.poly)) >= 40, `${b.id} a sliver`);
    assert.equal(selfCrossings(b.poly), 0, `${b.id} crosses itself`);
    assert.ok(['tall', 'estate', 'council', 'village', 'bungalow'].includes(b.zone), `${b.id} in ${b.zone}`);
    for (const p of b.poly)
      for (const s of SOUTH_STREETS) {
        const d = distTo(s.pts, p, s.loop);
        const kerb = s.bulb && Math.hypot(p[0] - s.pts[s.pts.length - 1][0], p[1] - s.pts[s.pts.length - 1][1]) < BULB + WALK_W + 0.5 ? BULB + WALK_W : s.half + WALK_W;
        assert.ok(d >= kerb - 0.06 || (s.bulb && Math.hypot(p[0] - s.pts[s.pts.length - 1][0], p[1] - s.pts[s.pts.length - 1][1]) >= BULB + WALK_W - 0.06), `${b.id}'s corner ${p[0].toFixed(1)}, ${p[1].toFixed(1)} on ${s.id} (${d.toFixed(2)} from it)`);
      }
  }
  for (const b of SOUTH_BLOCKS)
    for (const c of SOUTH_BLOCKS) {
      if (b === c) continue;
      for (const p of b.poly) assert.ok(!inside(c.poly, p) || distTo(c.poly, p, true) < 0.05, `${b.id} on ${c.id}`);
    }
  // (the tall band along the ring road and the village are there)
  for (const z of ['tall', 'estate', 'council', 'village', 'bungalow']) assert.ok(SOUTH_BLOCKS.some((b) => b.zone === z), `no ${z} block`);
});

test("Lot 9's new fence: wanders with the land inside its agreed bounds, its west side by the brook, Lot Lane in at its west gate", () => {
  assert.equal(selfCrossings(LOT9_EDGE), 0);
  for (let i = 0; i < LOT9_EDGE.length; i++) {
    const [p, q] = [LOT9_EDGE[i], LOT9_EDGE[(i + 1) % LOT9_EDGE.length]];
    assert.ok(Math.hypot(q[0] - p[0], q[1] - p[1]) <= 20, `a ruler-straight run of fence at ${p}`);
    assert.ok(LOT9_BOUNDS.some((r) => p[0] >= r[0] && p[0] <= r[2] && p[1] >= r[1] && p[1] <= r[3]), `the fence out of its bounds at ${p}`);
  }
  for (const s of SOUTH_STREETS) {
    if (s.id === LOT_LANE.id) continue;
    for (const p of s.pts) {
      assert.ok(!inside(LOT9_EDGE, p) && distTo(LOT9_EDGE, p, true) >= s.half + WALK_W, `${s.id} in Lot 9`);
      for (const r of LOT9_BOUNDS) assert.ok(toRect(r, p) >= s.half + WALK_W, `${s.id} in Lot 9's bounds at ${p}`);
    }
  }
  assert.ok(near(LOT_LANE.pts[LOT_LANE.pts.length - 1], LOT9_W), "Lot Lane ends on Lot 9's lane");
  for (const p of LOT9_EDGE) assert.ok(distTo(BROOK, p) > BROOK_HALF + 4, 'its fence off the brook');
  assert.ok(LOT9_EDGE.filter((p) => p[0] < -116 && p[1] > 546).every((p) => distTo(BROOK, p) < 20), 'its west side by the brook');
});

test('the brook: crossed only at its bridges; the rec ground on its bank; the hedges round the fields', () => {
  for (const s of SOUTH_STREETS)
    for (const p of s.pts) {
      const d = distTo(BROOK, p);
      if (d < BROOK_HALF + s.half + WALK_W + 2) assert.ok(BRIDGES.some((b) => b.street === s.id && Math.hypot(b.at[0] - p[0], b.at[1] - p[1]) < 10), `${s.id} in the brook at ${p[0].toFixed(1)}, ${p[1].toFixed(1)}`);
    }
  assert.ok(BRIDGES.length >= 1, 'Southfold Lane over the brook');
  for (const p of REC) assert.ok(distTo(BROOK, p) < 40 && distTo(BROOK, p) > BROOK_HALF + 2, 'the rec ground on the bank');
  for (const h of HEDGES)
    for (const p of h) {
      assert.ok(!inside(LOT9_EDGE, p), 'a hedge in Lot 9');
      assert.ok(!SOUTH_BLOCKS.some((b) => inside(b.poly, p)), `a hedge in a block at ${p}`);
      assert.equal(zoneAt(p[0], p[1]) === 'lot9', false);
    }
});

test('the Circus: the heart, five ways in', () => {
  const circus = SOUTH_STREETS.find((s) => s.loop)!;
  assert.ok(circus.pts.every((p) => Math.abs(Math.hypot(p[0] - CIRCUS.x, p[1] - CIRCUS.z) - CIRCUS.r) < 1e-6));
  const arms = SOUTH_CROSSINGS.filter((c) => c.streets.includes(circus.id));
  assert.equal(arms.length, 5, `its arms: ${arms.map((a) => a.streets.join('+')).join(' / ')}`);
});
