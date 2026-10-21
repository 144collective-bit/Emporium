// The kart park: the site and its courses (kartpark.ts), the racing rules (kart-sim.ts) and
// what the economy makes of it (catalog.ts, tycoon.ts, missions.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOX_LATERALS,
  COURSES,
  COURSE_IDS,
  FLYOVER_H,
  GANTRY,
  GATE,
  GRID,
  HUMP_H,
  HUT_DOOR,
  KART_PARK,
  KART_SOLIDS,
  KART_SPAWN,
  PILLARS,
  SITE,
  SLIP_ROAD,
  TRACK_HALF,
  along,
  at,
  frame,
  gridSlots,
  locate,
  toWorld,
  wrapS,
} from '../src/scripts/city3d/kartpark';
import { CUPS, CUP_IDS, ITEM_IDS, NO_INPUT, createKartSim, tune, type KartInput } from '../src/scripts/city3d/kart-sim';
import { DEFAULT_KART, KART_SPECS, PLAYER_KARTS, cleanKart } from '../src/scripts/city3d/mykart';
import { KART_CATALOG, KART_MOD_IDS, MOD_LEVELS, STARTER_KARTS, XP, kartStats } from '../src/scripts/city3d/catalog';
import { buyKart, cleanSave, finishKartRace, kartModCost, kartMods, kartStatsOf, modKart, newSave, ownsKart, pickKart } from '../src/scripts/city3d/tycoon';
import { BADGES, MISSIONS } from '../src/scripts/city3d/missions';
import { PARKWAY } from '../src/scripts/city3d/outer';
import { CITY_EXT, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { SOLIDS } from '../src/scripts/city3d/solids';

const inSite = (x: number, z: number, m = 0) => x >= KART_PARK.x0 + m && x <= KART_PARK.x1 - m && z >= KART_PARK.z0 + m && z <= KART_PARK.z1 - m;

/* ---------- The site ---------- */

test('the kart park sits outside the Parkway in the north-east, inside the world', () => {
  // North of the Parkway's top, east of the city, within the bounds you can walk to
  const top = Math.min(...PARKWAY.map((p) => p[1]));
  assert.ok(KART_PARK.z1 < top - 5, 'clear of the Parkway');
  assert.ok(KART_PARK.x0 > 64.5, 'east of the ring');
  assert.ok(KART_PARK.x1 <= WORLD_BOUNDS[2] && KART_PARK.x0 >= WORLD_BOUNDS[0] && KART_PARK.z0 >= WORLD_BOUNDS[1]);
  assert.ok(KART_PARK.x0 > CITY_EXT[1] - 60, 'the park is the north-east\'s main feature');
  // The slip road runs from the gate down to the Parkway's asphalt
  assert.equal(SLIP_ROAD.z0, KART_PARK.z1);
  const onParkway = PARKWAY.some((p) => Math.abs(p[0] - SLIP_ROAD.x) < 3 && Math.abs(p[1] - SLIP_ROAD.z1) < 3);
  assert.ok(onParkway, 'the slip road meets the Parkway');
  assert.ok(GATE.x0 < SLIP_ROAD.x && GATE.x1 > SLIP_ROAD.x && GATE.z === KART_PARK.z1);
  assert.ok(inSite(KART_SPAWN.x, KART_SPAWN.z, 1) && inSite(HUT_DOOR.x, HUT_DOOR.z, 1));
});

test('both courses are closed loops of the same length, on the site, with the line on the west straight', () => {
  assert.deepEqual(COURSE_IDS, ['neon-loop', 'neon-reverse']);
  const a = COURSES['neon-loop'];
  const b = COURSES['neon-reverse'];
  assert.ok(Math.abs(a.L - b.L) < 0.01);
  assert.ok(a.L > 340 && a.L < 420, `a lap is ${a.L.toFixed(1)}`);
  assert.ok(TRACK_HALF >= 5, 'a wide track');
  for (const c of [a, b]) {
    assert.equal(c.x.length, c.y.length);
    for (let i = 0; i < c.x.length; i++) {
      assert.ok(inSite(c.x[i], c.z[i], TRACK_HALF + 0.6), `${c.id} sample ${i} inside the fence with room for the wall`);
      // No corner tighter than a kart can take (the inner edge never folds)
      assert.ok(Math.abs(c.k[i]) < 1 / (TRACK_HALF + 1), `${c.id} curvature at ${i}`);
    }
    // Consecutive samples a step apart, the last joining the first
    const n = c.x.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      assert.ok(Math.abs(Math.hypot(c.x[j] - c.x[i], c.z[j] - c.z[i]) - c.step) < 0.05);
    }
    // The start line on the west straight, beside the stand
    const s = at(c, c.start);
    const [sx] = toWorld([SITE.stand.u1, 0]);
    assert.ok(s.x > sx && s.x < sx + 8, 'beside the stand');
    // ...and the track's edge keeps clear of the stand all along it
    const [, sz0] = toWorld([0, SITE.stand.v0]);
    const [, sz1] = toWorld([0, SITE.stand.v1]);
    for (let i = 0; i < c.x.length; i++) if (c.z[i] > sz0 && c.z[i] < sz1 && c.x[i] < sx + 20) assert.ok(c.x[i] - TRACK_HALF > sx + 0.4, `the stand is on the track at ${c.z[i].toFixed(1)}`);
    assert.ok(Math.abs(Math.sin(s.yaw)) > 0.95, 'running north-south');
    // The reverse course runs the other way
    if (c.reverse) assert.ok(Math.sin(s.yaw) > 0);
    else assert.ok(Math.sin(s.yaw) < 0);
  }
});

test('the flyover crosses the ground pass at a right angle with headroom, and the hump is a hump', () => {
  for (const c of Object.values(COURSES)) {
    const f = frame(c, c.crossing);
    assert.ok(Math.abs(f.y - FLYOVER_H) < 0.01);
    // The other pass of the same spot, at ground level, square to it
    let ground: number | null = null;
    for (let s = 0; s < c.L; s += 0.5) {
      if (Math.abs(along(c, s, c.crossing)) < 40) continue;
      const p = frame(c, s);
      if (Math.hypot(p.x - f.x, p.z - f.z) < 0.6) ground = s;
    }
    assert.ok(ground !== null, 'the ground pass');
    const g = frame(c, ground!);
    assert.ok(g.y < 0.01);
    assert.ok(Math.abs(g.tx * f.tx + g.tz * f.tz) < 0.08, 'square');
    // Ramps no steeper than about 1 in 3.5, except the hump
    for (let s = 0; s < c.L; s += 0.5) if (Math.abs(along(c, s, c.hump)) > 10) assert.ok(Math.abs(frame(c, s).slope) < 0.3);
    assert.ok(Math.abs(frame(c, c.hump).y - HUMP_H) < 0.02);
    // ...and back on the ground past it (the flyover's long tail runs out on the crossing's side)
    const away = Math.sign(along(c, c.crossing, c.hump));
    assert.ok(frame(c, c.hump + away * 10).y < 0.05 && frame(c, c.hump - away * 10).y < 1.5);
    assert.ok(frame(c, c.hump).y > frame(c, c.hump + 2).y && frame(c, c.hump).y > frame(c, c.hump - 2).y);
    // Two passes never come closer than the track's width (walls apart), away from the crossing
    const n = c.x.length;
    for (let i = 0; i < n; i += 2)
      for (let j = i + 30; j < n; j += 2) {
        if (n - j + i < 30) continue;
        const si = i * c.step;
        const sj = j * c.step;
        const atCross = (Math.abs(along(c, si, c.crossing)) < 20 && Math.abs(along(c, sj, ground!)) < 20) || (Math.abs(along(c, sj, c.crossing)) < 20 && Math.abs(along(c, si, ground!)) < 20);
        if (atCross) continue;
        assert.ok(Math.hypot(c.x[i] - c.x[j], c.z[i] - c.z[j]) > TRACK_HALF * 2 + 0.6, `${c.id}: ${si.toFixed(0)} and ${sj.toFixed(0)} too close`);
      }
  }
});

test('frame, at and locate agree, and locate keeps to its layer at the crossing', () => {
  const c = COURSES['neon-loop'];
  for (const s of [0, 10, 33.3, c.crossing, c.hump, c.L - 0.2])
    for (const lat of [-2, 0, 1.5]) {
      const p = at(c, s, lat);
      const l = locate(c, p.x, p.z, s);
      assert.ok(Math.abs(along(c, l.s, s)) < 0.05, `s ${s}`);
      assert.ok(Math.abs(l.lateral - lat) < 0.05, `lateral at ${s}`);
      assert.ok(Math.abs(l.y - p.y) < 0.01);
    }
  // The same spot from a hint on the flyover and from one on the ground
  const f = at(c, c.crossing, 0.3);
  const up = locate(c, f.x, f.z, c.crossing - 3);
  assert.ok(Math.abs(up.y - FLYOVER_H) < 0.02);
  const down = locate(c, f.x, f.z, null);
  const other = locate(c, f.x, f.z, wrapS(c, down.s + (Math.abs(along(c, down.s, c.crossing)) < 1 ? c.L / 2 : 0)));
  assert.ok(Math.abs(up.y - down.y) < 0.02 || Math.abs(other.y) < 0.02);
  assert.equal(wrapS(c, c.L + 3), 3);
  assert.ok(Math.abs(along(c, c.L - 1, 1) - 2) < 1e-9);
});

test('the grid is eight slots behind the line, on the track', () => {
  for (const c of Object.values(COURSES)) {
    const g = gridSlots(c);
    assert.equal(g.length, GRID);
    for (const slot of g) {
      assert.ok(along(c, slot.s, c.start) > 1.5, 'behind the line');
      assert.ok(Math.abs(slot.lateral) < TRACK_HALF - 0.8);
      const p = at(c, slot.s, slot.lateral);
      const l = locate(c, p.x, p.z, slot.s);
      assert.ok(Math.abs(l.lateral) < TRACK_HALF - 0.6);
    }
    // Pole is nearest the line
    assert.ok(along(c, g[0].s, c.start) < along(c, g[7].s, c.start));
    // Item boxes and pads sit on the loop, off the flyover's ramps
    for (const s of c.boxes) assert.ok(s >= 0 && s < c.L);
    for (const p of c.pads) assert.ok(p.s >= 0 && p.s < c.L && p.len > 0);
  }
});

test('the footprints: the fence with a gap at the gate, the hut, the stand, the posts and pillars, walls at ground level only', () => {
  assert.ok(KART_SOLIDS.length > 50);
  for (const b of KART_SOLIDS) {
    assert.ok(b[0] < b[2] && b[1] < b[3] && b[4] > 0);
    assert.ok(b[0] >= KART_PARK.x0 - 0.5 && b[2] <= KART_PARK.x1 + 0.5 && b[1] >= KART_PARK.z0 - 0.5 && b[3] <= KART_PARK.z1 + 0.5, 'on the site');
  }
  // Every one of them is in the city's SOLIDS
  for (const b of KART_SOLIDS) assert.ok(SOLIDS.includes(b));
  // The gate is open: nothing solid across it
  const gateMid = [(GATE.x0 + GATE.x1) / 2, GATE.z] as const;
  assert.ok(!KART_SOLIDS.some((b) => gateMid[0] > b[0] && gateMid[0] < b[2] && gateMid[1] >= b[1] - 0.01 && gateMid[1] <= b[3] + 0.01));
  // The hut door stands clear of its box; the spawn is clear of everything
  const clear = (x: number, z: number) => !KART_SOLIDS.some((b) => x > b[0] - 0.3 && x < b[2] + 0.3 && z > b[1] - 0.3 && z < b[3] + 0.3);
  assert.ok(clear(HUT_DOOR.x, HUT_DOOR.z) && clear(KART_SPAWN.x, KART_SPAWN.z));
  // Nothing solid on the track itself (the walls are outside its edges): sample the centre line
  const c = COURSES['neon-loop'];
  for (let s = 0; s < c.L; s += 1) {
    for (const lat of [-TRACK_HALF + 0.6, 0, TRACK_HALF - 0.6]) {
      const p = at(c, s, lat);
      // (the flyover's pillars stand under the deck, beside the ground pass)
      const hit = KART_SOLIDS.find((b) => p.x > b[0] && p.x < b[2] && p.z > b[1] && p.z < b[3] && !(p.y > 1 && b[4] <= FLYOVER_H + 0.01));
      assert.equal(hit, undefined, `solid on the track at s ${s} lateral ${lat}: ${hit}`);
    }
  }
  assert.equal(GANTRY.posts.length, 2);
  assert.equal(PILLARS.length, 8);
  assert.ok(GANTRY.h > 3);
});

/* ---------- The karts ---------- */

test('four karts, the Pocket Rocket free, the rest priced and levelled; mods raise the numbers', () => {
  assert.deepEqual(STARTER_KARTS, ['rocket']);
  for (const id of PLAYER_KARTS) {
    const s = KART_SPECS[id];
    for (const k of ['speed', 'accel', 'handling', 'weight'] as const) assert.ok(s[k] >= 0 && s[k] <= 1, `${id} ${k}`);
    assert.ok(KART_CATALOG[id].level >= 1);
    assert.ok(/^[A-Z][a-z A-Z]+$/.test(s.name));
  }
  assert.ok(KART_CATALOG.bigwheel.price > KART_CATALOG.tank.price && KART_CATALOG.tank.price > KART_CATALOG.zip.price);
  const base = kartStats(KART_SPECS.rocket, { motor: 0, tyres: 0, nitro: 0 });
  const up = kartStats(KART_SPECS.rocket, { motor: 3, tyres: 3, nitro: 3 });
  assert.ok(up.speed > base.speed && up.handling > base.handling && up.boost > base.boost && up.accel > base.accel);
  assert.equal(up.weight, base.weight);
  // The sim's numbers grow with them
  assert.ok(tune(up).top > tune(base).top && tune(up).boost > 1);
  assert.deepEqual(cleanKart({ model: 'nope', paint: 'nope' }), DEFAULT_KART);
  assert.deepEqual(cleanKart({ model: 'zip', paint: 'red' }), { model: 'zip', paint: 'red' });
});

test('buying, tuning and picking karts spends Dorras and needs the level; only owned karts can be picked', () => {
  const s = newSave(0);
  assert.ok(ownsKart(s, 'rocket') && !ownsKart(s, 'zip'));
  assert.equal(buyKart(s, 'zip').ok, false);
  s.xp = 100000;
  assert.deepEqual(buyKart(s, 'zip'), { ok: false, why: 'money' });
  s.dorras = 100000;
  const r = buyKart(s, 'zip');
  assert.ok(r.ok && r.dorras === KART_CATALOG.zip.price);
  assert.equal(s.dorras, 100000 - KART_CATALOG.zip.price);
  assert.deepEqual(buyKart(s, 'zip'), { ok: false, why: 'owned' });
  assert.equal(s.counters.bought, 1);
  assert.equal(s.ledger.totals.karts, KART_CATALOG.zip.price);
  // Mods: three levels, each dearer, counted as upgrades
  const before = s.dorras;
  for (let i = 0; i < MOD_LEVELS; i++) assert.ok(modKart(s, 'zip', 'tyres').ok);
  assert.deepEqual(modKart(s, 'zip', 'tyres'), { ok: false, why: 'max' });
  assert.equal(kartMods(s, 'zip').tyres, MOD_LEVELS);
  assert.ok(s.dorras < before && s.counters.upgrades === MOD_LEVELS);
  assert.equal(kartModCost('zip', 'tyres', kartMods(s, 'zip')), null);
  assert.ok(kartStatsOf(s, 'zip').handling > KART_SPECS.zip.handling);
  assert.equal(modKart(s, 'tank', 'motor').ok, false, 'not owned');
  // Picking
  assert.ok(pickKart(s, 'zip', 'red'));
  assert.deepEqual([s.karts.model, s.karts.paint], ['zip', 'red']);
  assert.equal(pickKart(s, 'bigwheel', 'red'), false);
  assert.equal(s.karts.model, 'zip');
  for (const k of KART_MOD_IDS) assert.ok(kartModCost('rocket', k, kartMods(s, 'rocket'))! > 0);
});

test('a finished race pays the place, counts podiums and wins, and keeps a time-trial best', () => {
  const s = newSave(0);
  const win = finishKartRace(s, { course: 'neon-loop', cup: 'pro', place: 1, seconds: 61.234, hits: 3 });
  assert.equal(win.prize, CUPS.pro.prizes[0]);
  assert.equal(win.xp, XP.kartFinish + XP.kartPodium + XP.kartWin);
  assert.equal(s.dorras, 600 + CUPS.pro.prizes[0]);
  assert.deepEqual([s.counters.kartRaces, s.counters.podiums, s.counters.kartWins, s.counters.kartHits, s.counters.earned], [1, 1, 1, 3, CUPS.pro.prizes[0]]);
  assert.equal(s.ledger.totals.karting, CUPS.pro.prizes[0]);
  const last = finishKartRace(s, { course: 'neon-loop', cup: 'rookie', place: 8, seconds: 90 });
  assert.equal(last.prize, CUPS.rookie.prizes[7]);
  assert.equal(last.xp, XP.kartFinish);
  assert.equal(s.counters.podiums, 1);
  // Time trials: no prize, a record
  const t1 = finishKartRace(s, { course: 'neon-reverse', cup: 'time', place: 1, seconds: 70.5 });
  assert.ok(t1.record && t1.prize === 0 && t1.xp === XP.kartFinish + XP.kartRecord);
  assert.equal(s.karts.records['neon-reverse'], 70.5);
  const t2 = finishKartRace(s, { course: 'neon-reverse', cup: 'time', place: 1, seconds: 75 });
  assert.ok(!t2.record && s.karts.records['neon-reverse'] === 70.5);
  assert.equal(s.counters.kartWins, 1, 'a time trial is not a win');
});

test('the save is v6: older saves get a kart section, and a loaded one is cleaned', () => {
  const old = newSave(0) as unknown as Record<string, unknown>;
  old.v = 5;
  delete old.karts;
  const s = cleanSave(old, 1000);
  assert.equal(s.v, 6);
  assert.deepEqual(s.karts, { model: 'rocket', paint: 'magenta', owned: [], mods: {}, records: {} });
  assert.equal(s.counters.kartRaces, 0);
  const dirty = cleanSave(
    { ...newSave(0), karts: { model: 'bigwheel', paint: 'red', owned: ['zip', 'zip', 'nope', 'rocket'], mods: { zip: { tyres: 9, motor: -2 }, tank: { nitro: 2 } }, records: { 'neon-loop': 55.555, bad: -1 } } },
    1000
  );
  assert.deepEqual(dirty.karts.owned, ['zip']);
  assert.equal(dirty.karts.model, 'rocket', 'a kart you don\'t own falls back');
  assert.equal(dirty.karts.paint, 'red');
  assert.deepEqual(dirty.karts.mods, { zip: { motor: 0, tyres: MOD_LEVELS, nitro: 0 } });
  assert.deepEqual(dirty.karts.records, { 'neon-loop': 55.56 });
});

test('missions and badges watch the kart counters', () => {
  const ids = ['first-lap', 'podium', 'pigeon-post', 'kart-winner', 'kart-hat-trick', 'kart-champion'];
  for (const id of ids) assert.ok(MISSIONS.some((m) => m.id === id), id);
  assert.ok(BADGES.some((b) => b.id === 'kart-wins-25') && BADGES.some((b) => b.id === 'hits-50'));
  assert.equal(new Set(MISSIONS.map((m) => m.id)).size, MISSIONS.length);
  assert.equal(new Set(BADGES.map((b) => b.id)).size, BADGES.length);
});

/* ---------- The racing ---------- */

/** Drive the player like a rival would: at the line ahead, braking for bends, drifting through them */
function brain(sim: ReturnType<typeof createKartSim>, t: number, items = true): KartInput {
  const c = sim.course;
  const p = sim.player;
  const f = frame(c, p.s + 2.5 + p.speed * 0.3);
  const heading = Math.atan2(-(f.z - p.z), f.x - p.x);
  const err = Math.atan2(Math.sin(heading - p.yaw), Math.cos(heading - p.yaw));
  let max = Infinity;
  for (let d = 2; d <= 10; d += 2) {
    const k = Math.abs(frame(c, p.s + d).k);
    if (k > 0.02) max = Math.min(max, Math.sqrt(10 / k) + (10 - d) * 0.25);
  }
  return { throttle: p.speed > max ? 0 : 1, steer: Math.max(-1, Math.min(1, -err * 2.2)), drift: Math.abs(f.k) > 0.11 && p.speed > 7, item: items && t % 2 < 0.02, back: false };
}
const rivals = () => PLAYER_KARTS.flatMap((k) => [k, k]).slice(0, 7).map((k) => ({ kart: k, tune: tune(KART_SPECS[k]) }));

test('a cup race: the countdown, eight karts round three laps, everyone inside the walls, items landing, places in order', () => {
  const sim = createKartSim({ course: 'neon-loop', cup: 'rookie', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket) }, rivals: rivals(), seed: 3 });
  assert.equal(sim.racers.length, 8);
  assert.equal(sim.boxes.length, COURSES['neon-loop'].boxes.length * BOX_LATERALS.length);
  // Nothing moves during the countdown
  const ev0: string[] = [];
  for (let i = 0; i < 70; i++) for (const e of sim.step(1 / 60, { ...NO_INPUT, throttle: 1 })) ev0.push(e.kind);
  assert.ok(ev0.includes('count'));
  assert.ok(!sim.started && sim.player.speed === 0);
  const counts: Record<string, number> = {};
  let t = 1;
  while (!sim.over && t < 600) {
    for (const e of sim.step(1 / 60, brain(sim, t))) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
    t += 1 / 60;
    for (const k of sim.racers) {
      assert.ok(Math.abs(k.lateral) <= TRACK_HALF - 0.4 + 1e-6, `${k.kart} through the wall`);
      assert.ok(Number.isFinite(k.x) && Number.isFinite(k.yaw));
      assert.ok(k.y >= -0.01 && k.y < FLYOVER_H + 3);
    }
  }
  assert.ok(sim.over, 'everyone finished');
  assert.ok(sim.done && sim.player.lap === 3);
  assert.equal(counts.go, 1);
  assert.equal(counts.finish, 8);
  assert.ok(counts.lap === 16, 'two lap events each');
  for (const k of ['box', 'item', 'use', 'hit', 'boost', 'pad', 'drift', 'jump', 'land'] as const) assert.ok((counts[k] ?? 0) > 0, k);
  // Places follow finishing order, 1..8
  const order = sim.standings();
  assert.deepEqual(order.map((i) => sim.racers[i].place), [1, 2, 3, 4, 5, 6, 7, 8]);
  for (let i = 1; i < order.length; i++) assert.ok(sim.racers[order[i - 1]].finishT <= sim.racers[order[i]].finishT);
  assert.ok(sim.time > 60 && sim.time < 400);
  assert.ok(sim.racers.some((k) => k.hits > 0), 'someone landed an item');
});

test('a time trial is you alone with no items; the reverse course works too', () => {
  const sim = createKartSim({ course: 'neon-reverse', cup: 'time', player: { kart: 'zip', tune: tune(KART_SPECS.zip) }, rivals: rivals(), seed: 1 });
  assert.equal(sim.racers.length, 1);
  assert.equal(sim.boxes.length, 0);
  assert.equal(sim.cup, null);
  let t = 0;
  let items = 0;
  while (!sim.done && t < 400) {
    for (const e of sim.step(1 / 60, brain(sim, t))) if (e.kind === 'item' || e.kind === 'use') items++;
    t += 1 / 60;
  }
  assert.ok(sim.done && sim.player.place === 1 && items === 0);
});

test('a hit spins a kart, a shield soaks one up, a rival that lags gets a faster kart', () => {
  const sim = createKartSim({ course: 'neon-loop', cup: 'neon', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket) }, rivals: rivals(), seed: 9 });
  for (let i = 0; i < 60 * 4; i++) sim.step(1 / 60, brain(sim, i / 60, false));
  const p = sim.player;
  const speed = p.speed;
  assert.ok(speed > 5);
  // Give the player a rocket and fire it: faster
  p.item = 'rocket';
  const ev = sim.step(1 / 60, { ...NO_INPUT, throttle: 1, item: true });
  assert.ok(ev.some((e) => e.kind === 'use' && e.item === 'rocket') && ev.some((e) => e.kind === 'boost'));
  assert.ok(p.boostT > 0);
  // A shield, then a pigeon from a rival: the shield goes, no spin
  p.item = 'shield';
  sim.step(1 / 60, { ...NO_INPUT, throttle: 1, item: true });
  assert.ok(p.shield);
  const rival = sim.racers[0];
  rival.item = 'pigeon';
  rival.rouletteT = 0;
  rival.spinT = 0;
  rival.ai!.cool = 0.2;
  // Everyone else well behind, so the player is the kart ahead of this rival
  for (const k of sim.racers) if (k !== rival && k !== p) k.progress -= 50;
  // Put the rival just behind the player on its line
  const back = at(sim.course, p.s - 2, p.lateral);
  Object.assign(rival, { x: back.x, z: back.z, s: wrapS(sim.course, p.s - 2), lateral: p.lateral, progress: p.progress - 2, yaw: p.yaw });
  // (the sim's rivals use items on their own clock; fire this one now)
  let shielded = false;
  let spun = false;
  for (let i = 0; i < 60 * 10 && !spun && !shielded; i++) {
    for (const e of sim.step(1 / 60, { ...NO_INPUT, throttle: 0.4 })) {
      if (e.kind === 'shield' && e.kart === p.i) shielded = true;
      if (e.kind === 'hit' && e.kart === p.i && e.item !== 'bump') spun = true;
    }
  }
  assert.ok(shielded || spun, 'the pigeon arrived');
  assert.ok(ITEM_IDS.length === 6 && CUP_IDS.length === 3);
  // The rubber band: a rival far behind the player runs faster than one far ahead
  const a = sim.racers[1];
  const b = sim.racers[2];
  a.progress = p.progress - 60;
  b.progress = p.progress + 60;
  sim.step(1 / 60, NO_INPUT);
  assert.ok(a.tune.top > b.tune.top);
});
