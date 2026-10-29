// The Sector 7 Metro (metro.ts, growth plan Phases 8 and 9): the line runs down the east ring avenue's median, bends
// west to The Trenches over Trench Avenue's median and on to Uptown (finance plan Phase 7: a tight bend north, portal
// frames, a steel arch over the river with nothing in the water), and the Airport's branch carries on south from the bend; its
// pillars stand only in a median clear of the junctions, or on open ground, over the river only in its bridge's median, never too far
// apart; its stations sit between junctions, their stair towers on open ground off every road, pad and solid; and the
// train keeps to its tracks and its timetable, and every ride takes well under a minute.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AIRPORT_END,
  ARCH,
  BRANCH,
  BEND_R,
  CREST,
  CREST_END,
  CREST_S,
  DECK_HALF,
  DECK_Y,
  HANGERS,
  LEGS,
  LINE_X,
  METRO_SOLIDS,
  NORTH_END,
  PILLARS,
  PILLAR_HALF,
  PLATFORM,
  PORTAL,
  PORTALS,
  ROUND_TRIP,
  STATIONS,
  SWITCH_S,
  TRACKS,
  TRAIN,
  UP_END,
  UP_R,
  UP_X,
  WEST_END,
  archY,
  carAt,
  pointOn,
  rideAt,
  sideAt,
  sideOf,
  stationAt,
  timetableAt,
  trainAt,
} from '../src/scripts/city3d/metro';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { DEPARTURES, LOOP } from '../src/scripts/city3d/airfield';
import { MEDIAN, RIVER } from '../src/scripts/city3d/layout';
import { PADS } from '../src/scripts/city3d/outer';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { FLIGHTS, PERIOD, REACH, poseAt } from '../src/scripts/city3d/airfield';
import { ANCHOR_X, SHIP } from '../src/scripts/city3d/liberty';
import { WATER_Y } from '../src/scripts/city3d/river';
import { AVENUE_Z } from '../src/scripts/city3d/trenches';
import { HIGHWAY_HALF, fromHighway } from '../src/scripts/city3d/highway';
import { KART_PARK } from '../src/scripts/city3d/kartpark';
import { heightAt } from '../src/scripts/city3d/terrain';
import { PALMS } from '../src/scripts/city3d/landscape';

const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
const near = (a: [number, number], b: [number, number], e = 1e-6) => Math.hypot(a[0] - b[0], a[1] - b[1]) < e;

test('the line runs down the east ring avenue, bends west onto Trench Avenue, and the Airport branch carries on south and out east to the terminal', () => {
  const { main, branch } = TRACKS;
  assert.ok(near(main.pts[0], [LINE_X, NORTH_END]));
  assert.ok(near(main.pts[main.pts.length - 1], [UP_X, UP_END]));
  assert.ok(main.pts.some((p) => near(p, [WEST_END, AVENUE_Z])));
  assert.ok(near(branch.pts[0], pointOn('main', SWITCH_S).at));
  assert.ok(near(branch.pts[branch.pts.length - 1], [AIRPORT_END, BRANCH.z]));
  // (since docs/airport-plan.md Phase 3 step 2: down the avenue's median, a quarter bend east, over the old site and the
  // highway's bend to the station by Airport Drive, just north of the terminal's forecourt; smooth all the way)
  for (let i = 2; i < branch.pts.length; i++) {
    const [a, b, c] = [branch.pts[i - 2], branch.pts[i - 1], branch.pts[i]];
    const t = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
    assert.ok(Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) < 0.05, `the branch kinks at ${b}`);
  }
  // It reaches the terminal: its station by the drive north of the forecourt's loop, a short walk from the departures deck
  const st = stationAt(STATIONS.find((s) => s.id === 'airport')!).at;
  assert.ok(Math.hypot(st[0] - (DEPARTURES.x0 + DEPARTURES.x1) / 2, st[1] - DEPARTURES.z0) < 60);
  assert.ok(st[1] < LOOP.out - LOOP.half - 3, 'the station stands over the loop');
  // Crestmont's spur: off the main line south of Kart Park station, round outside the highway's north-east corner, to its
  // station past Alder Way; smooth all the way, nothing under it on the highway or the kart park
  const { crest } = TRACKS;
  assert.ok(near(crest.pts[0], pointOn('main', CREST_S).at));
  assert.ok(near(crest.pts[crest.pts.length - 1], [CREST_END, CREST.station]));
  const kart = STATIONS.find((s) => s.id === 'kart')!;
  assert.ok(CREST_S > kart.s + PLATFORM.half, "the spur leaves after Kart Park's platform");
  for (let i = 2; i < crest.pts.length; i++) {
    const [a, b, c] = [crest.pts[i - 2], crest.pts[i - 1], crest.pts[i]];
    const t = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
    assert.ok(Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) < 0.08, `the spur kinks at ${b}`);
  }
  for (let s = 12; s <= crest.len; s += 1) {
    const p = pointOn('crest', s).at;
    assert.ok(fromHighway(...p) > HIGHWAY_HALF + DECK_HALF + 1, `the spur over the highway at ${p.map((v) => v.toFixed(1))}`);
    assert.ok(!(p[0] > KART_PARK.x0 && p[0] < KART_PARK.x1 && p[1] > KART_PARK.z0 && p[1] < KART_PARK.z1 + DECK_HALF), 'the spur over the kart park');
    assert.ok(heightAt(...p) < 1, `the spur over the hills at ${p.map((v) => v.toFixed(1))}`);
  }
  // Nothing grows under it: no palm within reach of its deck
  for (const p of PALMS) for (let s = 0; s <= crest.len; s += 2) {
    const q = pointOn('crest', s).at;
    assert.ok(Math.hypot(q[0] - p.x, q[1] - p.z) > DECK_HALF + 1.5, `a palm under the spur at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
  }
  // The bends are quarter circles: about BEND_R * pi / 2 and UP_R * pi / 2 long; and the main line is smooth all the way
  assert.ok(Math.abs(main.len - (SWITCH_S + (BEND_R * Math.PI) / 2 + (LINE_X - BEND_R - WEST_END) + (UP_R * Math.PI) / 2 + (AVENUE_Z - UP_R - UP_END))) < 0.05);
  for (let i = 2; i < main.pts.length; i++) {
    const [a, b, c] = [main.pts[i - 2], main.pts[i - 1], main.pts[i]];
    const t = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
    assert.ok(Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) < 0.05, `the main line kinks at ${b}`);
  }
  // Every point on the line is over a road's median, or open ground, or the river (on the deck): never under a building's footprint
  for (const t of Object.values(TRACKS))
    for (let s = 0; s <= t.len; s += 1) {
      const [x, z] = pointOn(t.id, s).at;
      for (const b of SOLIDS.filter((b) => !METRO_SOLIDS.includes(b))) assert.ok(!(x > b[0] && x < b[2] && z > b[1] && z < b[3] && (b[4] ?? 9) > 4.5), `${t.id} at ${s.toFixed(0)} through a box at ${b.join(', ')}`);
    }
});

test('the pillars stand in a median clear of every junction or on open ground, over the river only in its bridge\'s median, never more than 18 apart', () => {
  assert.ok(PILLAR_HALF < MEDIAN / 2);
  for (const p of PILLARS) {
    const [x, z] = p.at;
    if (z > RIVER[0] - 0.5 && z < RIVER[1] + 0.5) assert.ok(Math.abs(x - LINE_X) + PILLAR_HALF <= MEDIAN / 2 + 1e-6, `a pillar at ${x.toFixed(1)}, ${z.toFixed(1)} in the river off the bridge's median`);
    const hits = roads.filter((s) => distToStreet(s, p.at) <= s.half + PILLAR_HALF + 0.2);
    // At most one road, an avenue, with the pillar inside its median
    assert.ok(hits.length <= 1, `a pillar at ${x.toFixed(1)}, ${z.toFixed(1)} in a junction (${hits.map((s) => s.id)})`);
    if (hits.length) assert.ok(hits[0].kind === 'avenue' && distToStreet(hits[0], p.at) + PILLAR_HALF <= MEDIAN / 2 + 1e-6, `a pillar in ${hits[0].id}'s lanes`);
  }
  for (const t of Object.values(TRACKS)) {
    // (held up by pillars, portal frames where there's no median, and between the arch's feet its hangers)
    const ss = [...PILLARS, ...PORTALS].filter((p) => p.track === t.id).map((p) => p.s).concat(t.id === 'main' ? HANGERS : []).sort((a, b) => a - b);
    // (a spur's first stretch is held up by the main line's pillar at its junction)
    const all = t.id !== 'main' ? [0, ...ss] : ss;
    for (let i = 1; i < all.length; i++) assert.ok(all[i] - all[i - 1] <= 18.1, `${t.id}: ${all[i - 1].toFixed(1)} to ${all[i].toFixed(1)}`);
    assert.ok(all[0] < 3 && t.len - all[all.length - 1] < 3, `${t.id} is held up at both ends`);
  }
});

test('the platforms are between junctions; the stair towers on open ground, off every road, pad and solid, by their platforms', () => {
  for (const st of STATIONS) {
    const mid = stationAt(st);
    // The road the line runs down here (its median), if any: the platform may be over its lanes, never over another road
    const host = roads.find((s) => distToStreet(s, mid.at) < 0.5);
    for (let k = -PLATFORM.half; k <= PLATFORM.half; k += 0.5) {
      const p = pointOn(st.track, st.s + k);
      const n = sideOf(p.dir, sideAt(st));
      for (const w of [PLATFORM.from, PLATFORM.to]) {
        const q: [number, number] = [p.at[0] + n[0] * w, p.at[1] + n[1] * w];
        for (const o of roads) if (o !== host) assert.ok(distToStreet(o, q) > o.half + 0.3 || distToStreet(o, p.at) > o.half + 0.3, `${st.id}'s platform over ${o.id}`);
      }
      assert.ok(p.at[1] < RIVER[0] || p.at[1] > RIVER[1], `${st.id}'s platform over the river`);
    }
    const [x0, z0, x1, z1] = st.tower;
    const corners: [number, number][] = [
      [x0, z0],
      [x1, z0],
      [x0, z1],
      [x1, z1],
      [(x0 + x1) / 2, (z0 + z1) / 2],
    ];
    for (const c of corners) for (const o of roads) assert.ok(distToStreet(o, c) > o.half, `${st.id}'s tower on ${o.id}`);
    for (const p of PADS) assert.ok(x1 < p.rect[0] - 0.3 || x0 > p.rect[2] + 0.3 || z1 < p.rect[1] - 0.3 || z0 > p.rect[3] + 0.3, `${st.id}'s tower on pad ${p.id}`);
    for (const b of SOLIDS.filter((b) => !METRO_SOLIDS.includes(b))) assert.ok(x1 <= b[0] || x0 >= b[2] || z1 <= b[1] || z0 >= b[3], `${st.id}'s tower in a box at ${b.join(', ')}`);
    // The tower is on the platform's side, its face within a skybridge's reach of the platform's outer edge, by the platform
    const c: [number, number] = [(x0 + x1) / 2, (z0 + z1) / 2];
    const n = sideOf(mid.dir, sideAt(st));
    const out = (c[0] - mid.at[0]) * n[0] + (c[1] - mid.at[1]) * n[1];
    const half = Math.abs(n[0]) > 0.5 ? (x1 - x0) / 2 : (z1 - z0) / 2;
    assert.ok(out - half > PLATFORM.to - 0.2 && out - half - PLATFORM.to < 4, `${st.id}'s tower is ${(out - half - PLATFORM.to).toFixed(2)} from its platform`);
    const alongT = (c[0] - mid.at[0]) * mid.dir[0] + (c[1] - mid.at[1]) * mid.dir[1];
    assert.ok(Math.abs(alongT) <= PLATFORM.half, `${st.id}'s tower is by its platform`);
    // Its door at street level, just out of its face, the way you walk out pointing away from the tower
    const dx = st.door.x - c[0];
    const dz = st.door.z - c[1];
    assert.ok(dx * st.face[0] + dz * st.face[1] > 0, `${st.id}'s door faces out`);
    assert.ok(!(st.door.x > x0 && st.door.x < x1 && st.door.z > z0 && st.door.z < z1), `${st.id}'s door is outside the tower`);
    assert.ok(Math.min(Math.abs(st.door.x - x0), Math.abs(st.door.x - x1), Math.abs(st.door.z - z0), Math.abs(st.door.z - z1)) < 0.6);
    assert.ok(DECK_HALF <= PLATFORM.from);
  }
});

test('the train keeps to its tracks, stops at every station, and never jumps', () => {
  const seen = new Set<string>();
  let prev = trainAt(0);
  const pos = (t: ReturnType<typeof trainAt>) => pointOn(t.track, t.s).at;
  for (let t = 0; t <= ROUND_TRIP * 2; t += 0.05) {
    const p = trainAt(t);
    assert.ok(p.speed <= Math.max(TRAIN.speed, TRAIN.express) + 1e-9);
    // Its cars are on the line too (past the ends of the line by no more than half a car)
    for (const off of [-TRAIN.len / 2, TRAIN.len / 2]) {
      const c = carAt(p, off).at;
      const onLine = Object.values(TRACKS).some((tr) => {
        for (let s = -3; s <= tr.len + 3; s += 0.5) if (near(pointOn(tr.id, s).at, c, 0.5)) return true;
        return false;
      });
      assert.ok(onLine, `a car off the line at ${t.toFixed(2)}`);
    }
    // Between one moment and the next it moves no further than it could (a dwell turns it round in place)
    const [a, b] = [pos(prev), pos(p)];
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) <= TRAIN.express * 0.05 + 1e-6, `a jump at ${t.toFixed(2)}`);
    if (p.at) seen.add(p.at);
    prev = p;
  }
  assert.deepEqual([...seen].sort(), STATIONS.map((s) => s.id).sort());
  // (since Crestmont's spur, docs/crestmont-plan.md Phase 9: out to Crestmont and back from Kart Park too)
  assert.ok(ROUND_TRIP > 60 && ROUND_TRIP < 400);
  assert.equal(LEGS.length, 12);
});

test('a ride goes there in well under a minute, and the timetable carries on from where it stops', () => {
  for (const a of STATIONS)
    for (const b of STATIONS) {
      if (a === b) continue;
      const r = rideAt(a.id, b.id, 0);
      // (the longest, The Trenches to Crestmont, the whole main line and the spur, turning round at Kart Park: about
      // 70 s; Skip ride is there for it. Without Crestmont, Uptown to the Airport is the longest, about 50.8 s)
      const limit = a.id === 'crestmont' || b.id === 'crestmont' ? 72 : 52;
      assert.ok(r.total < limit, `${a.id} to ${b.id} takes ${r.total.toFixed(1)}`);
      assert.ok(near(pointOn(r.track, r.s).at, stationAt(a).at));
      const end = rideAt(a.id, b.id, r.total);
      assert.ok(near(pointOn(end.track, end.s).at, stationAt(b).at, 1e-6), `${a.id} to ${b.id} ends at ${b.id}`);
      // Smoothly all the way (turning round at South Bank in place)
      let last = pointOn(r.track, r.s).at;
      for (let t = 0; t <= r.total; t += 0.05) {
        const p = rideAt(a.id, b.id, t);
        const q = pointOn(p.track, p.s).at;
        assert.ok(Math.hypot(q[0] - last[0], q[1] - last[1]) <= TRAIN.express * 0.05 + 1e-6, `${a.id} to ${b.id} jumps at ${t.toFixed(2)}`);
        last = q;
      }
      const lastRun = end.runs[end.runs.length - 1];
      const t = timetableAt(b.id, lastRun.pieces[lastRun.pieces.length - 1]);
      const on = trainAt(t);
      assert.equal(on.at, b.id, `after ${a.id} to ${b.id} the timetable stands it at ${b.id}`);
      assert.ok(near(pointOn(on.track, on.s).at, stationAt(b).at, 1e-6));
    }
});

test("Uptown's extension: portal frames on the blocks' edges either side of the street, the arch's feet off the water", () => {
  const others = SOLIDS.filter((b) => !METRO_SOLIDS.includes(b));
  for (const p of PORTALS)
    for (const k of [-1, 1]) {
      const [x, z] = [p.at[0] + k * PORTAL.half, p.at[1]];
      const box = [x - PORTAL.leg, z - PORTAL.leg, x + PORTAL.leg, z + PORTAL.leg];
      for (const o of roads) assert.ok(distToStreet(o, [x, z]) > o.half + 0.8 + PORTAL.leg - 1e-6, `a portal's leg at ${x.toFixed(1)}, ${z.toFixed(1)} on ${o.id} or its sidewalk`);
      for (const b of others) assert.ok(box[2] <= b[0] || box[0] >= b[2] || box[3] <= b[1] || box[1] >= b[3], `a portal's leg at ${x.toFixed(1)}, ${z.toFixed(1)} in a box at ${b.join(', ')}`);
      assert.ok(z < RIVER[0] - 0.5 || z > RIVER[1] + 0.5, 'a leg in the river');
    }
  // The arch: its feet off the water, its ribs clear of the deck beside it, its crown over the river
  assert.ok(ARCH.z1 < RIVER[0] - 0.5 && ARCH.z0 > RIVER[1] + 0.5);
  assert.ok(ARCH.half - ARCH.rib / 2 > DECK_HALF + 0.5);
  assert.ok(archY((RIVER[0] + RIVER[1]) / 2) > DECK_Y + 8);
});

test('the arch: the tall ship keeps east of it, the boats pass under its deck, and what flies over keeps well over its crown', () => {
  assert.ok(ANCHOR_X[0] - SHIP.len / 2 > ARCH.x + ARCH.half + 5);
  assert.ok(DECK_Y - 0.6 - WATER_Y > 4);
  for (let t = 0; t < PERIOD; t += 0.5)
    for (const f of FLIGHTS) {
      const p = poseAt(f, t);
      const r = REACH[f.kind] + 1;
      const over = Math.abs(p.x - ARCH.x) < ARCH.half + r && p.z > ARCH.z1 - r && p.z < ARCH.z0 + r;
      assert.ok(!over || p.y > ARCH.top + r, `${f.id} at ${t} over the arch at ${p.y.toFixed(1)}`);
    }
});
