// The kart park rebuild, Phase 1 (kartcircuit.ts): one circuit, raced both ways. Corners no
// tighter than MIN_RADIUS, ramps under MAX_SLOPE, the track never near itself except where the
// flyover crosses it (and there high enough), nothing solid on the track or its run-off, the grid
// on the straight, the pit lane off it, the banking lifting the outside edge, the lap in its range.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BANK,
  BANK_H,
  BAYS,
  CIRCUIT,
  CIRCUITS,
  CIRCUIT_IDS,
  CIRCUIT_SOLIDS,
  CLEAR,
  FLY_H,
  GANTRY,
  GATE,
  GRID,
  HILL_H,
  HUT_DOOR,
  KART_W,
  KERB,
  MAX_SLOPE,
  MIN_RADIUS,
  PIT_HALF,
  PIT_LANE,
  PIT_STRAIGHT,
  SITE,
  START_U,
  SUPPORTS,
  TRACK_HALF,
  TRACK_W,
  circuitSurfaceAt,
  gridSlots,
  onCircuit,
} from '../src/scripts/city3d/kartcircuit';
import { BRIDGE_H, F, KART_PARK, frame, heightAt, toLocal, toWorld } from '../src/scripts/city3d/kartpark';

const c = CIRCUIT;
const n = c.x.length;
/** Distance round the loop between two samples */
const arc = (i: number, j: number) => Math.min(Math.abs(i - j), n - Math.abs(i - j)) * c.step;
/** Distance from a point to a box (0 inside) */
const toBox = (x: number, z: number, b: number[]) => Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - z, 0, z - b[3]));
/** The nearest the centre line comes to a point at ground level (or any level) */
const nearestTrack = (x: number, z: number, ground = false) => {
  let best = Infinity;
  for (let i = 0; i < n; i++) if (!ground || c.y[i] < 0.5) best = Math.min(best, Math.hypot(c.x[i] - x, c.z[i] - z));
  return best;
};
/** The flyover's crossing: where the deck passes over the ground */
const CROSS = (() => {
  let best = { d: Infinity, x: 0, z: 0 };
  for (let i = 0; i < n; i++) {
    if (!(c.flags[i] & F.deck) || c.y[i] < 1) continue;
    for (let j = 0; j < n; j++) {
      if (c.y[j] > 0.5) continue;
      const d = Math.hypot(c.x[i] - c.x[j], c.z[i] - c.z[j]);
      if (d < best.d) best = { d, x: c.x[i], z: c.z[i] };
    }
  }
  return best;
})();

test('one narrow track: six karts abreast, kerbs and run-off', () => {
  assert.equal(TRACK_W, 5.6);
  assert.ok(Math.floor(TRACK_W / KART_W) === 5 || Math.round(TRACK_W / KART_W) === 6, 'about six karts abreast');
  assert.ok(KERB > 0 && CLEAR >= TRACK_HALF + KERB + 4, 'a real run-off');
});

test('the lap is medium length, the same both ways', () => {
  assert.ok(c.L > 520 && c.L < 600, `lap ${c.L.toFixed(0)} tiles`);
  assert.ok(Math.abs(CIRCUITS['circuit-reverse'].L - c.L) < 0.5);
});

test('no corner is tighter than MIN_RADIUS (and the inside edge never folds), both ways', () => {
  assert.ok(MIN_RADIUS > TRACK_HALF + KERB);
  for (const id of CIRCUIT_IDS) {
    const k = CIRCUITS[id].k;
    for (let i = 0; i < k.length; i++) assert.ok(Math.abs(k[i]) < 1 / MIN_RADIUS, `${id} at ${toLocal([CIRCUITS[id].x[i], CIRCUITS[id].z[i]]).map((v) => v.toFixed(1))}: radius ${(1 / Math.abs(k[i])).toFixed(1)}`);
  }
});

test('every ramp is under MAX_SLOPE; the hill reaches its crest, the tunnel and the jump are there', () => {
  for (let i = 0; i < n; i++) {
    const slope = Math.abs(c.y[(i + 1) % n] - c.y[i]) / c.step;
    assert.ok(slope < MAX_SLOPE, `slope ${slope.toFixed(3)} at ${toLocal([c.x[i], c.z[i]]).map((v) => v.toFixed(1))}`);
  }
  const hill = Math.max(...Array.from(c.y).filter((_, i) => !(c.flags[i] & F.deck)));
  assert.ok(Math.abs(hill - HILL_H) < 0.05, 'the hill reaches its crest');
  assert.ok(c.flags.some((f) => f & F.tunnel), 'a tunnel');
  for (const id of CIRCUIT_IDS) assert.ok(CIRCUITS[id].jump >= 0, `${id} has the jump`);
});

test('away from the flyover, the track never comes within its run-off of itself', () => {
  assert.ok(CROSS.d < TRACK_HALF, 'the flyover crosses the diagonal');
  for (let i = 0; i < n; i += 2)
    for (let j = i + 2; j < n; j += 2) {
      if (arc(i, j) < 60) continue;
      const near = (k: number) => Math.hypot(c.x[k] - CROSS.x, c.z[k] - CROSS.z) < 24;
      if (near(i) && near(j)) continue;
      const d = Math.hypot(c.x[i] - c.x[j], c.z[i] - c.z[j]);
      assert.ok(d >= 2 * CLEAR, `${toLocal([c.x[i], c.z[i]]).map((v) => v.toFixed(1))} and ${toLocal([c.x[j], c.z[j]]).map((v) => v.toFixed(1))} are ${d.toFixed(1)} apart`);
    }
});

test('where the track crosses itself, the deck is at least BRIDGE_H over the lane below, and only there', () => {
  assert.ok(FLY_H >= BRIDGE_H);
  let crossings = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (arc(i, j) < 30) continue;
      const d = Math.hypot(c.x[i] - c.x[j], c.z[i] - c.z[j]);
      if (d >= 2 * (TRACK_HALF + KERB)) continue;
      crossings++;
      const [hi, lo] = c.y[i] > c.y[j] ? [i, j] : [j, i];
      assert.ok(c.y[hi] - c.y[lo] >= BRIDGE_H - 1e-6, `only ${(c.y[hi] - c.y[lo]).toFixed(2)} of clearance`);
      assert.ok(c.flags[hi] & F.deck, 'the upper lane is the deck');
      assert.ok(Math.hypot(c.x[i] - CROSS.x, c.z[i] - CROSS.z) < 12, 'one crossing');
    }
  assert.ok(crossings > 0);
});

test('the track and its run-off stay inside the fence', () => {
  for (let i = 0; i < n; i++) {
    assert.ok(c.x[i] - CLEAR > KART_PARK.x0 && c.x[i] + CLEAR < KART_PARK.x1, `x ${c.x[i].toFixed(1)}`);
    assert.ok(c.z[i] - CLEAR > KART_PARK.z0 && c.z[i] + CLEAR < KART_PARK.z1, `z ${c.z[i].toFixed(1)}`);
  }
});

test('only the fence, the hut, the garages and the grandstand are solid, all clear of the track and run-off', () => {
  assert.equal(CIRCUIT_SOLIDS.length, 8, 'four fence runs either side of the gate, the hut, the garages, the stand');
  for (const b of CIRCUIT_SOLIDS) {
    assert.ok(b[0] < b[2] && b[1] < b[3] && b[4] > 0);
    for (let i = 0; i < n; i++) assert.ok(toBox(c.x[i], c.z[i], b) > CLEAR, `a solid at ${b.slice(0, 4).map((v) => v.toFixed(1))} is ${toBox(c.x[i], c.z[i], b).toFixed(1)} from the track`);
  }
  // The gantry's posts and the flyover's supports stand outside the run-off (and aren't solid)
  for (const p of [...GANTRY.posts, ...SUPPORTS]) assert.ok(nearestTrack(p.x, p.z, true) > CLEAR, `a post at ${toLocal([p.x, p.z]).map((v) => v.toFixed(1))} is in the run-off`);
  for (const p of GANTRY.posts) assert.ok(nearestTrack(p.x, p.z) > CLEAR);
  assert.ok(SUPPORTS.length >= 4, 'the deck stands on supports');
});

test('the grid is on the start straight, behind the line, both ways', () => {
  for (const id of CIRCUIT_IDS) {
    const cc = CIRCUITS[id];
    const line = frame(cc, cc.start);
    assert.ok(Math.abs(toLocal([line.x, line.z])[0] - START_U) < 0.3, `${id}: the line is at START_U`);
    const slots = gridSlots(cc);
    assert.equal(slots.length, GRID);
    for (const sl of slots) {
      const f = frame(cc, sl.s);
      const [u, v] = toLocal([f.x, f.z]);
      assert.ok(Math.abs(v - 115) < 0.6 && Math.abs(f.tz) < 0.05, `${id}: a slot off the straight at ${u.toFixed(1)}, ${v.toFixed(1)}`);
      assert.ok(Math.abs(sl.lateral) + KART_W / 2 < TRACK_HALF, 'on the asphalt');
      assert.ok(f.y === 0, 'flat');
      // Behind the line: forward runs west (u falls), so behind is east
      assert.ok(cc.reverse ? u < START_U : u > START_U, `${id}: a slot ahead of the line`);
    }
  }
});

test('the pit lane leaves the straight before the line, runs beyond the run-off, and rejoins after it', () => {
  const end = (i: number) => toLocal([PIT_LANE.x[i], PIT_LANE.z[i]]);
  const first = end(0);
  const last = end(PIT_LANE.x.length - 1);
  assert.ok(first[0] > START_U && last[0] < START_U, 'in before the line (forward), out after it');
  for (const [x, z] of [toWorld(first), toWorld(last)]) assert.ok(onCircuit(x, z).track, 'its ends are on the track');
  for (let i = 0; i < PIT_LANE.x.length; i++) {
    const [u] = end(i);
    if (u < PIT_STRAIGHT.u0 || u > PIT_STRAIGHT.u1) continue;
    assert.ok(nearestTrack(PIT_LANE.x[i], PIT_LANE.z[i]) - PIT_HALF >= CLEAR, `the pit lane's straight is in the run-off at u ${u.toFixed(1)}`);
    for (const b of CIRCUIT_SOLIDS) assert.ok(toBox(PIT_LANE.x[i], PIT_LANE.z[i], b) >= PIT_HALF, 'nothing solid on the pit lane');
  }
  // A bay for each kart, in front of the garages, on the pit lane
  assert.equal(BAYS.length, GRID);
  for (const [x, z] of BAYS) {
    const [u] = toLocal([x, z]);
    assert.ok(u > SITE.garages.u0 && u < SITE.garages.u1);
    let d = Infinity;
    for (let i = 0; i < PIT_LANE.x.length; i++) d = Math.min(d, Math.hypot(PIT_LANE.x[i] - x, PIT_LANE.z[i] - z));
    assert.ok(d < PIT_HALF, 'the bay is on the pit lane');
  }
  // The screen stands on the garages' roof
  assert.ok(SITE.screen.u - SITE.screen.w / 2 > SITE.garages.u0 && SITE.screen.u + SITE.screen.w / 2 < SITE.garages.u1);
});

test('the gate path leads from the gate to the hut door, clear of the track and anything solid', () => {
  const [gu] = toLocal([(GATE.x0 + GATE.x1) / 2, 0]);
  assert.ok(Math.abs(gu - SITE.path.u0) < 0.5, 'it starts at the gate');
  assert.ok(Math.abs(toLocal([HUT_DOOR.x, HUT_DOOR.z])[0] - SITE.path.u1) < 0.5, 'it ends at the hut door');
  for (let u = SITE.path.u0; u <= SITE.path.u1; u += 0.5) {
    const [x, z] = toWorld([u, SITE.path.v]);
    assert.ok(nearestTrack(x, z) > CLEAR, 'the path keeps off the run-off');
    for (const b of CIRCUIT_SOLIDS) assert.ok(toBox(x, z, b) > SITE.path.half, `the path runs into a solid at u ${u}`);
  }
  for (const b of CIRCUIT_SOLIDS) assert.ok(toBox(HUT_DOOR.x, HUT_DOOR.z, b) >= 0.4, 'room to stand at the hut door');
});

test('the sweepers are banked to the outside, and their low edge rests on the ground, both ways', () => {
  for (const id of CIRCUIT_IDS) {
    const cc = CIRCUITS[id];
    let banked = 0;
    for (let s = 0; s < cc.L; s += 0.5) {
      const f = frame(cc, s);
      if (!f.roll) continue;
      // The low edge: the inside of the turn
      const low = Math.min(heightAt(f, TRACK_HALF), heightAt(f, -TRACK_HALF));
      assert.ok(low > -0.1 && low < 0.1, `${id}: the low edge at ${low.toFixed(2)}`);
      if (Math.abs(f.k) > 0.03 && f.flags & F.bank) {
        banked++;
        // Left turns raise the right edge (roll > 0), right turns the left: the roll follows the curvature
        assert.ok(f.roll * f.k > 0, `${id}: banked the wrong way at s ${s}`);
      }
    }
    assert.ok(banked > 20, `${id}: the two sweepers are banked`);
    assert.ok(Math.abs(Math.max(...Array.from(cc.roll).map(Math.abs)) - BANK) < 1e-6, 'the full banking is reached');
    assert.ok(Math.abs(Math.max(...Array.from(cc.y).filter((_, i) => cc.flags[i] & F.bank)) - BANK_H) < 1e-6, 'lifted by BANK_H');
  }
});

test('reverse is the same surface the other way, its corners numbered from its own line', () => {
  const r = CIRCUITS['circuit-reverse'];
  for (let s = 0; s < c.L; s += 7) {
    const f = frame(c, s);
    let best = Infinity;
    let bi = 0;
    for (let i = 0; i < r.x.length; i++) {
      const d = Math.hypot(r.x[i] - f.x, r.z[i] - f.z);
      if (d < best) {
        best = d;
        bi = i;
      }
    }
    assert.ok(best < 0.6, 'the same line');
    if (f.y < 0.5 || r.y[bi] < 0.5) continue;
    assert.ok(Math.abs(r.y[bi] - f.y) < 0.15, 'the same heights');
  }
  for (const id of CIRCUIT_IDS) {
    const cc = CIRCUITS[id];
    assert.ok(cc.turns.length >= 10, `${id}: plenty of corners`);
    assert.deepEqual(
      cc.turns.map((t) => t.n),
      cc.turns.map((_, i) => i + 1)
    );
    const after = cc.turns.map((t) => (t.s - cc.start + cc.L) % cc.L);
    assert.deepEqual(after, [...after].sort((a, b) => a - b), `${id}: numbered in the order they come`);
  }
});

test('driving off a race: the deck and the diagonal under it each keep their own height', () => {
  const up = circuitSurfaceAt(CROSS.x, CROSS.z, FLY_H);
  const down = circuitSurfaceAt(CROSS.x, CROSS.z, 0);
  assert.ok(up && Math.abs(up.y - FLY_H) < 0.1, 'on the deck');
  assert.ok(down && Math.abs(down.y) < 0.1, 'under it');
  const [gx, gz] = toWorld([SITE.path.u0 + 10, SITE.path.v]);
  assert.equal(circuitSurfaceAt(gx, gz, 0), null, 'off the track');
  const f = frame(c, c.start);
  assert.ok(onCircuit(f.x, f.z).track);
  assert.ok(onCircuit(f.x + f.nx * (TRACK_HALF + 2), f.z + f.nz * (TRACK_HALF + 2)).runoff);
});
