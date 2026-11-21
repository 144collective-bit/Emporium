// Crestmont's residents at leisure and its road cyclists (crestleisure.ts, the premium upgrade's Phase 6; the owner's
// calls, 2026-11-20: the residents where the plan put them, "Ridge Road, a few", "Skip tennis"): everyone standing or
// sitting on what they're on (a balcony, a lounger, a chair, a bench) at its height; the walkers on the Ridgeline Walk,
// the cyclists on Ridge Road's asphalt's edge, right of the cars, slower up than down; nobody running into anybody;
// and all the chunks' people fitting the crowd's spare slots. With the Phase 5 fixes it came with: the walk's benches
// along it, the Belvedere's off its way through, the glasshouse's fountain off its path.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEISURE_IDLE, LEISURE_PEOPLE, RIDE, RIDERS, RIDE_LOOP, STROLL, rideAt, roadTop, strollAt, ASTERLY_TABLES, type RidePose } from '../src/scripts/city3d/crestleisure';
import { BELVEDERE_BENCH, BELVEDERE_BENCHES, BENCH, BENCHES, GLASS_FOUNTAIN, GLASS_PATH, LOOKOUTS, WALK, WALK_L, WALK_POINTS, stepAt } from '../src/scripts/city3d/crestwalk';
import { ASTERLY, BELVEDERE, GLASSHOUSE } from '../src/scripts/city3d/crestsites';
import { ESTATES, toWorld as estateAt } from '../src/scripts/city3d/estates';
import { MANSIONS, toWorld as mansionAt } from '../src/scripts/city3d/mansions';
import { ESTATE_BALCONIES, MANSION_BALCONIES, ROOF_DECKS, balconyRect } from '../src/scripts/city3d/crestgrand';
import { CREST_PEOPLE } from '../src/scripts/city3d/crestlife';
import { HILL_ROADS } from '../src/scripts/city3d/crestmont';
import { districtAt, roleOf } from '../src/scripts/city3d/crowdlook';
import { LANE } from '../src/scripts/city3d/layout';
import { SLAB_Y } from '../src/scripts/city3d/coral';
import { SUN_IDLE, SUN_PEOPLE } from '../src/scripts/city3d/sunlife';
import { STRIP_IDLE } from '../src/scripts/city3d/striplife';
import { PORCH_SITTERS } from '../src/scripts/city3d/lot9homes';
import { CAMP_PEOPLE } from '../src/scripts/city3d/lot9camp';
import { DOCK_PEOPLE } from '../src/scripts/city3d/dockslife';
import { moment, type Moment } from '../src/scripts/city3d/parklife';

type Pt = [number, number];
/** Whether a point is in a house's rect (its frame's u0, v0, u1, v1) as it stands in the world */
function inFrame(at: (u: number, v: number) => Pt, r: readonly number[], x: number, z: number, m = 0.02) {
  const [o, a, b] = [at(r[0], r[1]), at(r[2], r[1]), at(r[0], r[3])];
  const [ax, az, bx, bz] = [a[0] - o[0], a[1] - o[1], b[0] - o[0], b[1] - o[1]];
  const [px, pz] = [x - o[0], z - o[1]];
  const s = (px * ax + pz * az) / (ax * ax + az * az);
  const t = (px * bx + pz * bz) / (bx * bx + bz * bz);
  const [mu, mv] = [m / Math.hypot(ax, az), m / Math.hypot(bx, bz)];
  return s >= -mu && s <= 1 + mu && t >= -mv && t <= 1 + mv;
}
const near = (y: number, want: number, e = 0.06) => Math.abs(y - want) < e;
/** The walk's middle's nearest distance to a point */
const offWalk = (x: number, z: number) => Math.min(...WALK_POINTS.map((p) => Math.hypot(p.x - x, p.z - z)));
/** The Belvedere's columns */
const COLUMNS: Pt[] = Array.from({ length: BELVEDERE.columns }, (_, k) => {
  const a = ((k + 0.5) / BELVEDERE.columns) * Math.PI * 2;
  return [BELVEDERE.x + Math.cos(a) * BELVEDERE.r, BELVEDERE.z + Math.sin(a) * BELVEDERE.r];
});
/** A bench's four corners (its length across its `yaw`) */
const corners = (s: { x: number; z: number; yaw: number }, long: number, deep: number): Pt[] => {
  const [lx, lz] = [Math.cos(s.yaw), -Math.sin(s.yaw)];
  const [fx, fz] = [Math.sin(s.yaw), Math.cos(s.yaw)];
  return [-1, 1].flatMap((a) => [-1, 1].map((b): Pt => [s.x + lx * a * long * 0.5 + fx * b * deep * 0.5, s.z + lz * a * long * 0.5 + fz * b * deep * 0.5]));
};

test('the crowd\'s spare slots take every chunk\'s people, these with them (index.ts: 360, phones 180)', () => {
  const half = <T,>(l: readonly T[]) => l.filter((_, i) => i % 2 === 0).length;
  const high = SUN_IDLE.length + SUN_PEOPLE.length + STRIP_IDLE.length + PORCH_SITTERS.length + CAMP_PEOPLE.length + DOCK_PEOPLE.length + LEISURE_IDLE.length + LEISURE_PEOPLE.length;
  const low =
    half(SUN_IDLE) + SUN_PEOPLE.filter((p) => !p.trim).length + half(STRIP_IDLE) + half([...PORCH_SITTERS, ...CAMP_PEOPLE]) + DOCK_PEOPLE.length + half(LEISURE_IDLE) + LEISURE_PEOPLE.filter((p) => !p.trim).length;
  assert.ok(high <= 360, `${high} people for 360 spare slots`);
  assert.ok(low <= 180, `${low} people for 180 spare slots on phones`);
  assert.ok(LEISURE_IDLE.length >= 30 && LEISURE_IDLE.length <= 60, `${LEISURE_IDLE.length} at leisure`);
  // (all in Crestmont, dressed as its people are: crowdlook.ts, the hills east of its streets too)
  for (const p of LEISURE_IDLE) assert.equal(districtAt(p.x, p.z), 'crest', `someone outside Crestmont at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
  const m = moment();
  for (const p of LEISURE_PEOPLE) for (let t = 0; t < 1500; t += 5) assert.equal(districtAt(p.at(t, m).x, m.z), 'crest', `${p.id} outside Crestmont`);
  // (and the cyclists in cycling kit)
  for (const p of LEISURE_PEOPLE) assert.equal(roleOf({ id: p.id, clip: 'sit' }), p.id.startsWith('ridge-cyclist') ? 'cyclist' : 'idle');
});

test('at home: out on the balconies, on the roof terraces\' loungers and at their tables, each at its height', () => {
  let balconies = 0;
  let decks = 0;
  const houses: { at: (u: number, v: number) => Pt; y0: number; bal: (typeof ESTATE_BALCONIES)[number] }[] = [
    ...ESTATES.map((e, i) => ({ at: (u: number, v: number) => estateAt(e, u, v), y0: SLAB_Y, bal: ESTATE_BALCONIES[i] })),
    ...MANSIONS.map((m, i) => ({ at: (u: number, v: number) => mansionAt(m, u, v), y0: m.y, bal: MANSION_BALCONIES[i] })),
  ];
  for (const p of LEISURE_IDLE) {
    const h = houses.find((h) => h.bal.some((b) => inFrame(h.at, balconyRect(b), p.x, p.z) && near(p.y!, h.y0 + b.y + 0.02)));
    if (!h) continue;
    balconies++;
    assert.equal(p.act, 'look');
    // (facing out from the wall)
    const b = h.bal.find((b) => inFrame(h.at, balconyRect(b), p.x, p.z))!;
    const [o, f] = [h.at(0, b.v), h.at(0, b.v + b.n)];
    assert.ok(Math.sin(p.ry) * (f[0] - o[0]) + Math.cos(p.ry) * (f[1] - o[1]) > 0.99, 'someone on a balcony facing the wall');
  }
  MANSIONS.forEach((m, i) => {
    const d = ROOF_DECKS[i];
    const at = (u: number, v: number) => mansionAt(m, u, v);
    for (const p of LEISURE_IDLE) {
      if (!inFrame(at, d.rail, p.x, p.z) || p.y! < m.y + d.y) continue;
      decks++;
      const on = d.things.find((t) => (t.kind === 'lounger' ? inFrame(at, [t.u - t.r, t.v - 0.6, t.u + t.r, t.v + 0.6], p.x, p.z) : false));
      if (p.act === 'lounge') assert.ok(on && near(p.y!, m.y + d.y + 0.01 + 0.28 + 0.03), 'a lounger off its lounger');
      else assert.ok(p.act === 'eat' && near(p.y!, m.y + d.y + 0.01 + 0.47, 0.03), 'someone on a deck neither lounging nor at its table');
    }
  });
  assert.ok(balconies >= 8, `${balconies} on the balconies`);
  assert.ok(decks >= 5, `${decks} on the roof terraces`);
});

test('out: THE ASTERLY\'s diners at their tables and its waiter; the Belvedere\'s, the glasshouse\'s, the walk\'s benches and lookouts', () => {
  const [tx0, tz0, tx1, tz1] = ASTERLY.terrace;
  const onTerrace = LEISURE_IDLE.filter((p) => p.x > tx0 && p.x < tx1 && p.z > tz0 && p.z < tz1);
  const diners = onTerrace.filter((p) => p.act === 'eat');
  assert.ok(diners.length >= 6);
  assert.equal(onTerrace.filter((p) => p.act === 'serve').length, 1);
  const tz = (tz0 + tz1) / 2;
  for (const p of diners) {
    assert.ok(near(p.y!, ASTERLY.y + ASTERLY_TABLES.seat, 0.01));
    // (a table's middle 0.7 in front of them)
    const [fx, fz] = [p.x + Math.sin(p.ry) * ASTERLY_TABLES.chair, p.z + Math.cos(p.ry) * ASTERLY_TABLES.chair];
    assert.ok(Math.abs(fz - tz) < 1e-6 && Math.abs((fx - tx0 - ASTERLY_TABLES.first) / ASTERLY_TABLES.every - Math.round((fx - tx0 - ASTERLY_TABLES.first) / ASTERLY_TABLES.every)) < 1e-6, 'a diner not at a table');
  }
  // The Belvedere's sitters on its benches, the glasshouse's people in its garden or under its dome
  for (const s of BELVEDERE_BENCHES) assert.ok(LEISURE_IDLE.some((p) => p.act === 'sit' && Math.hypot(p.x - s.x, p.z - s.z) < 0.05), 'a Belvedere bench without its sitter');
  const G = GLASSHOUSE;
  const inG = LEISURE_IDLE.filter((p) => p.x > G.rect[0] && p.x < G.rect[2] && p.z > G.rect[1] && p.z < G.rect[3]);
  assert.ok(inG.length >= 5);
  for (const p of inG) {
    const inside = p.x > G.house[0] && p.x < G.house[2] && p.z > G.house[1] && p.z < G.house[3];
    assert.ok(near(p.y!, G.y + (inside ? 0.42 : 0.02), 0.01), "someone in the glasshouse off its floor");
    assert.ok(Math.hypot(p.x - GLASS_FOUNTAIN.x, p.z - GLASS_FOUNTAIN.z) > GLASS_FOUNTAIN.r + 0.25, 'someone in the fountain');
    if (inside) assert.ok(Math.hypot(p.x - G.dome.x, p.z - G.dome.z) > 1 && Math.hypot(p.x - G.dome.x, p.z - G.dome.z) < G.dome.r - 0.4, 'someone in the glasshouse but not under its dome');
  }
  // The walk's benches: every other one sat on; someone at each lookout
  const sat = BENCHES.filter((s) => LEISURE_IDLE.some((p) => p.act === 'sit' && Math.hypot(p.x - s.x, p.z - s.z) < 0.05));
  assert.equal(sat.length, Math.ceil(BENCHES.length / 2));
  for (const o of LOOKOUTS) assert.ok(LEISURE_IDLE.some((p) => p.act === 'look' && Math.hypot(p.x - o.x, p.z - o.z) < 1.2), 'a lookout with nobody at it');
});

test('the walk\'s benches along it facing across it, the Belvedere\'s off its way through, the glasshouse\'s fountain off its path (Phase 5\'s, fixed)', () => {
  for (const s of BENCHES) {
    for (const [x, z] of corners(s, BENCH.long, BENCH.deep)) assert.ok(offWalk(x, z) > WALK.half + 0.05, 'a bench on the walk');
    // (facing the walk: a step forward is nearer it)
    assert.ok(offWalk(s.x + Math.sin(s.yaw) * 0.5, s.z + Math.cos(s.yaw) * 0.5) < offWalk(s.x, s.z), 'a bench facing away from the walk');
  }
  for (const s of BELVEDERE_BENCHES) {
    for (const [x, z] of corners(s, BELVEDERE_BENCH.long, BELVEDERE_BENCH.deep)) {
      assert.ok(offWalk(x, z) > WALK.half + 0.1, "a Belvedere's bench on the walk");
      assert.ok(Math.hypot(x - BELVEDERE.x, z - BELVEDERE.z) < BELVEDERE.r - 0.45, "a Belvedere's bench into its columns");
    }
  }
  const F = GLASS_FOUNTAIN;
  for (let k = 1; k < GLASS_PATH.length; k++)
    for (let t = 0; t <= 1; t += 0.02) {
      const [x, z] = [GLASS_PATH[k - 1][0] + (GLASS_PATH[k][0] - GLASS_PATH[k - 1][0]) * t, GLASS_PATH[k - 1][1] + (GLASS_PATH[k][1] - GLASS_PATH[k - 1][1]) * t];
      assert.ok(Math.hypot(x - F.x, z - F.z) > F.r + WALK.half * 0.8 + 0.2, "the glasshouse's path through its fountain");
    }
  const G = GLASSHOUSE;
  assert.ok(F.x - F.r > G.rect[0] && F.x + F.r < G.house[0] && F.z - F.r > G.rect[1] + 2.4 && F.z + F.r < G.rect[3], "the fountain off the glasshouse's garden or on its beds");
});

test('the walkers: on the walk, on its gravel, up on one side and down the other, past the Belvedere\'s columns and nobody', () => {
  const walkers = LEISURE_PEOPLE.filter((p) => p.id.startsWith('ridgeline-walk'));
  assert.equal(walkers.length, STROLL.count);
  const ms = walkers.map(() => moment());
  const still = LEISURE_IDLE.filter((p) => offWalk(p.x, p.z) < WALK.half + 1.5);
  for (let t = 0; t < 1400; t += 0.7) {
    walkers.forEach((w, i) => w.at(t, ms[i]));
    for (const m of ms) {
      // (the walk's middle as sampled, a point every half tile: round a bend its outer side's a little more)
      assert.ok(offWalk(m.x, m.z) <= STROLL.side + 0.3, `a walker off the walk at ${m.x.toFixed(1)}, ${m.z.toFixed(1)}`);
      for (const [cx, cz] of COLUMNS) assert.ok(Math.hypot(m.x - cx, m.z - cz) > 0.42, "a walker into a Belvedere's column");
      for (const p of still) assert.ok(Math.hypot(m.x - p.x, m.z - p.z) > 0.5, 'a walker into someone sitting or standing by the walk');
      assert.equal(m.clip, 'walk');
    }
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) assert.ok(Math.hypot(ms[i].x - ms[j].x, ms[i].z - ms[j].z) > 0.4, 'two walkers into each other');
  }
  // (steadily along: no jump between one moment and the next, in place or height)
  const m0 = moment();
  const m1 = moment();
  for (let t = 0; t < 1200; t += 0.25) {
    strollAt(t * STROLL.pace, m0);
    strollAt((t + 0.25) * STROLL.pace, m1);
    // (a step's rise up or down on a flight, else smooth)
    assert.ok(Math.hypot(m1.x - m0.x, m1.z - m0.z) < 0.3 && Math.abs(m1.y - m0.y) < 0.3, `a walker jumps at ${t}`);
    const d = (t * STROLL.pace) % (2 * WALK_L);
    const st = stepAt(d < WALK_L ? d : 2 * WALK_L - d);
    if (st) assert.ok(Math.abs(m0.y - st.top) < 1e-9, 'a walker on a flight off its tread');
  }
});

test('the cyclists: on Ridge Road\'s asphalt\'s edge right of the cars, slower up than down, apart, clear of the joggers', () => {
  const ridge = HILL_ROADS.find((r) => r.id === 'crest-ridge')!;
  const fromMiddle = (x: number, z: number) => {
    let best = Infinity;
    for (let i = 1; i < ridge.pts.length; i++) {
      const [a, b] = [ridge.pts[i - 1], ridge.pts[i]];
      const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
    }
    return best;
  };
  assert.equal(RIDERS.length, RIDE.count);
  assert.ok(RIDE.count >= 4 && RIDE.count <= 6);
  // (past a car's side in its lane: LANE / 2 plus its half width, about 0.53; within the asphalt)
  assert.ok(RIDE.off >= LANE / 2 + 0.6 && RIDE.off <= ridge.half - 0.15);
  // Each point of the loop on the edge (but the turns across at either end), its height the asphalt's
  const L = RIDE_LOOP;
  L.pts.forEach(([x, z], i) => {
    assert.ok(Math.abs(fromMiddle(x, z) - RIDE.off) < 0.05, `the ride off the road's edge at ${x.toFixed(0)}, ${z.toFixed(0)}`);
    assert.ok(Math.abs(L.ys[i] - roadTop(x, z)) < 1e-9);
  });
  // Slower climbing than coming down: the climb's pace under the descent's
  const pose: RidePose = { x: 0, z: 0, y: 0, ry: 0, pitch: 0, pace: 0 };
  const ups: number[] = [];
  const downs: number[] = [];
  for (let t = 0; t < L.T; t += 0.5) {
    rideAt(0, t, pose);
    if (pose.pitch > 0.05) ups.push(pose.pace);
    if (pose.pitch < -0.05) downs.push(pose.pace);
    assert.ok(pose.pace >= RIDE.min - 1e-9 && pose.pace <= RIDE.max + 1e-9);
  }
  assert.ok(ups.length && downs.length && Math.max(...ups) < Math.min(...downs), 'climbing as fast as coming down');
  assert.ok(L.T > 200 && L.T < 1200, `a loop takes ${L.T.toFixed(0)} s`);
  // Apart, and clear of Ridge Road's joggers (crestlife.ts) as they pass
  const joggers = CREST_PEOPLE.filter((p) => p.id.startsWith('ridge-jog'));
  const riders = LEISURE_PEOPLE.filter((p) => p.id.startsWith('ridge-cyclist'));
  const jm = joggers.map(() => moment());
  const rm: Moment[] = riders.map(() => moment());
  let closest = Infinity;
  for (let t = 0; t < 2 * L.T; t += 0.2) {
    riders.forEach((r, i) => r.at(t, rm[i]));
    joggers.forEach((j, i) => j.at(t, jm[i]));
    for (let i = 0; i < rm.length; i++) {
      assert.equal(rm[i].clip, 'sit');
      for (let j = i + 1; j < rm.length; j++) assert.ok(Math.hypot(rm[i].x - rm[j].x, rm[i].z - rm[j].z) > 2, 'two cyclists into each other');
      for (const m of jm) closest = Math.min(closest, Math.hypot(rm[i].x - m.x, rm[i].z - m.z));
    }
  }
  assert.ok(closest > 0.25, `a cyclist ${closest.toFixed(2)} from a jogger`);
});
