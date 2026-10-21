// The kart park: the site, its network and courses (kartpark.ts), the racing rules (kart-sim.ts) and
// what the economy makes of it (catalog.ts, tycoon.ts, missions.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOX_LATERALS,
  BRIDGE_H,
  COURSES,
  COURSE_IDS,
  F,
  GANTRY,
  GATE,
  GRID,
  HUT_DOOR,
  KART_PARK,
  KART_SOLIDS,
  trackSurfaceAt,
  KART_SPAWN,
  NODE_REACH,
  PIECES,
  PILLARS,
  SECTOR_IDS,
  SHORTCUT_HALF,
  SITE,
  SLIP_ROAD,
  TRACK_HALF,
  along,
  at,
  frame,
  gridSlots,
  locate,
  nearNode,
  toWorld,
  wrapS,
} from '../src/scripts/city3d/kartpark';
import { CUPS, CUP_IDS, DIRT_CAP, ITEM_IDS, NO_INPUT, createKartSim, tune, type KartInput } from '../src/scripts/city3d/kart-sim';
import { DEFAULT_KART, KART_SPECS, PLAYER_KARTS, cleanKart } from '../src/scripts/city3d/mykart';
import { CHALLENGE_PRIZE, CLASS_IDS, KART_CATALOG, KART_CLASSES, KART_MOD_IDS, MOD_LEVELS, PAR_LAPS, SERIES_POINTS, SERIES_PRIZES, STARTER_KARTS, XP, kartStats } from '../src/scripts/city3d/catalog';
import {
  LEADERBOARD_SIZE,
  abandonSeries,
  buyKart,
  cleanSave,
  dailyChallenge,
  dayKey,
  finishKartRace,
  kartModCost,
  kartMods,
  kartStatsOf,
  modKart,
  newSave,
  ownsKart,
  parLap,
  pickKart,
  recordKey,
  seriesNext,
  seriesRace,
  startSeries,
} from '../src/scripts/city3d/tycoon';
import { BADGES, MISSIONS } from '../src/scripts/city3d/missions';
import { PARKWAY } from '../src/scripts/city3d/outer';
import { WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { SOLIDS } from '../src/scripts/city3d/solids';

const inSite = (x: number, z: number, m = 0) => x >= KART_PARK.x0 + m && x <= KART_PARK.x1 - m && z >= KART_PARK.z0 + m && z <= KART_PARK.z1 - m;

/* ---------- The site ---------- */

test('the kart park fills the north-east beyond the Parkway, out to the world\'s edge', () => {
  const top = Math.min(...PARKWAY.map((p) => p[1]));
  assert.ok(KART_PARK.z1 < top - 5, 'clear of the Parkway');
  assert.ok(KART_PARK.x0 > 64.5, 'east of the ring');
  assert.ok(KART_PARK.x1 <= WORLD_BOUNDS[2] && KART_PARK.x0 >= WORLD_BOUNDS[0] && KART_PARK.z0 >= WORLD_BOUNDS[1]);
  assert.ok(KART_PARK.x1 >= WORLD_BOUNDS[2] - 4 && KART_PARK.z0 <= WORLD_BOUNDS[1] + 4, 'to the edge');
  assert.equal(SLIP_ROAD.z0, KART_PARK.z1);
  const onParkway = PARKWAY.some((p) => Math.abs(p[0] - SLIP_ROAD.x) < 3 && Math.abs(p[1] - SLIP_ROAD.z1) < 3);
  assert.ok(onParkway, 'the slip road meets the Parkway');
  assert.ok(GATE.x0 < SLIP_ROAD.x && GATE.x1 > SLIP_ROAD.x && GATE.z === KART_PARK.z1);
  assert.ok(inSite(KART_SPAWN.x, KART_SPAWN.z, 1) && inSite(HUT_DOOR.x, HUT_DOOR.z, 1));
});

test('six courses from the network, each a closed loop on the site, the line on the west straight by the stand', () => {
  assert.deepEqual(COURSE_IDS, ['neon-loop', 'neon-reverse', 'summit', 'summit-reverse', 'grand', 'grand-reverse']);
  assert.equal(SECTOR_IDS.length, 6);
  const L = (id: string) => COURSES[id as keyof typeof COURSES].L;
  assert.ok(Math.abs(L('neon-loop') - L('neon-reverse')) < 0.01 && Math.abs(L('grand') - L('grand-reverse')) < 0.01);
  assert.ok(L('neon-loop') > 340 && L('neon-loop') < 420, `a lap is ${L('neon-loop').toFixed(1)}`);
  assert.ok(L('grand') > 620 && L('grand') < 760, `the Grand Circuit is ${L('grand').toFixed(1)}`);
  assert.ok(L('summit') > L('neon-loop') - 40 && L('summit') < L('grand'));
  assert.ok(TRACK_HALF >= 5, 'a wide track');
  for (const c of Object.values(COURSES)) {
    assert.ok(c.closed && c.x.length === c.y.length && c.x.length === c.flags.length);
    const n = c.x.length;
    for (let i = 0; i < n; i++) {
      assert.ok(inSite(c.x[i], c.z[i], TRACK_HALF + 0.4), `${c.id} sample ${i} inside the fence with room for the wall`);
      // No corner tighter than the track's half width: the inner edge never folds
      assert.ok(Math.abs(c.k[i]) < 1 / (TRACK_HALF + 0.2), `${c.id} curvature at ${i}: r ${(1 / Math.abs(c.k[i])).toFixed(1)}`);
      const j = (i + 1) % n;
      assert.ok(Math.abs(Math.hypot(c.x[j] - c.x[i], c.z[j] - c.z[i]) - c.step) < 0.05);
    }
    // The start line on the west straight, beside the stand, running north-south
    const s = at(c, c.start);
    const [sx] = toWorld([SITE.stand.u1, 0]);
    assert.ok(s.x > sx && s.x < sx + 8, 'beside the stand');
    assert.ok(Math.abs(Math.sin(s.yaw)) > 0.95);
    assert.ok(c.reverse ? Math.sin(s.yaw) > 0 : Math.sin(s.yaw) < 0);
    // The track's edge keeps clear of the stand all along it
    const [, sz0] = toWorld([0, SITE.stand.v0]);
    const [, sz1] = toWorld([0, SITE.stand.v1]);
    for (let i = 0; i < n; i++) if (c.z[i] > sz0 && c.z[i] < sz1 && c.x[i] < sx + 20) assert.ok(c.x[i] - TRACK_HALF > sx + 0.4, `the stand is on the track at ${c.z[i].toFixed(1)}`);
    assert.equal(c.laps, c.id.startsWith('grand') ? 2 : 3);
    for (const s of c.boxes) assert.ok(s >= 0 && s < c.L);
    for (const p of c.pads) assert.ok(p.s >= 0 && p.s < c.L && p.len > 0);
  }
});

test('the sectors, bridges and surfaces: decks with headroom, ramps no steeper than 1 in 3.5, banking in the bowls, the wet bend, the tunnel', () => {
  for (const c of Object.values(COURSES)) {
    let deck = 0;
    let bank = 0;
    let maxRoll = 0;
    let wet = 0;
    let tunnel = 0;
    for (let i = 0; i < c.x.length; i++) {
      if (c.flags[i] & F.deck && c.y[i] > BRIDGE_H - 0.05) deck++;
      if (c.flags[i] & F.bank) {
        bank++;
        maxRoll = Math.max(maxRoll, Math.abs(c.roll[i]));
      }
      assert.ok(Math.abs(c.roll[i]) <= 0.3);
      if (c.flags[i] & F.wet) {
        wet++;
        assert.ok(c.grip[i] < 0.8);
      }
      if (c.flags[i] & F.tunnel) tunnel++;
      // Height never below the ground; never a step
      assert.ok(c.y[i] >= -0.01);
    }
    const hasFlyover = c.sectors.includes('hairpin');
    const hasNorth = c.sectors.includes('north');
    if (hasFlyover) assert.ok(deck > 0 && wet > 0, `${c.id} has the flyover and the wet bend`);
    if (hasNorth) assert.ok(bank > 20 && maxRoll > 0.2 && tunnel > 10, `${c.id} has the bowls and the tunnel`);
    // Ramps
    for (let s = 0; s < c.L; s += 0.5) if (c.hump < 0 || Math.abs(along(c, s, c.hump)) > 12) assert.ok(Math.abs(frame(c, s).slope) < 0.3, `${c.id} slope at ${s}`);
    if (c.hump >= 0) assert.ok(frame(c, c.hump).y > 1.2 && frame(c, c.hump).y > frame(c, c.hump + 4).y && frame(c, c.hump).y > frame(c, c.hump - 4).y);
    // Wherever two passes of the line come within the track's width, one is a bridge well over the other
    const n = c.x.length;
    for (let i = 0; i < n; i += 2)
      for (let j = i + 30; j < n; j += 2) {
        if (n - j + i < 30) continue;
        const d = Math.hypot(c.x[i] - c.x[j], c.z[i] - c.z[j]);
        if (d > TRACK_HALF * 2 + 0.4) continue;
        if (nearNode(c.x[i], c.z[i]) || nearNode(c.x[j], c.z[j])) continue;
        assert.ok(Math.abs(c.y[i] - c.y[j]) > 1.9, `${c.id}: ${(i * c.step).toFixed(0)} and ${(j * c.step).toFixed(0)} are ${d.toFixed(1)} apart with ${Math.abs(c.y[i] - c.y[j]).toFixed(2)} headroom`);
      }
  }
  // The physical pieces keep apart too, except where they meet at the nodes
  for (let a = 0; a < PIECES.length; a++)
    for (let b = a + 1; b < PIECES.length; b++) {
      const A = PIECES[a];
      const B = PIECES[b];
      for (let i = 0; i < A.x.length; i += 2)
        for (let j = 0; j < B.x.length; j += 2) {
          const d = Math.hypot(A.x[i] - B.x[j], A.z[i] - B.z[j]);
          if (d > A.half + B.half + 0.4) continue;
          if (Math.abs(A.y[i] - B.y[j]) > 1.9) continue;
          if (nearNode(A.x[i], A.z[i]) || nearNode(B.x[j], B.z[j])) continue;
          const sA = i * A.step;
          const sB = j * B.step;
          if ((A.id === 'shortcut' && (sA < 14 || sA > A.L - 14)) || (B.id === 'shortcut' && (sB < 14 || sB > B.L - 14))) continue;
          assert.fail(`${A.id} at ${sA.toFixed(0)} and ${B.id} at ${sB.toFixed(0)} are ${d.toFixed(1)} apart`);
        }
    }
  assert.ok(NODE_REACH >= 9);
});

test('the shortcut: dirt, narrower, shorter than the main line between its ends, only on the courses that pass both', () => {
  for (const c of Object.values(COURSES)) {
    if (!c.sectors.includes('north') || !c.sectors.includes('return')) {
      assert.equal(c.shortcut, null, c.id);
      continue;
    }
    const sc = c.shortcut!;
    assert.ok(sc && sc.L > 30 && sc.L < along(c, sc.out, sc.in), `${c.id}: ${sc.L.toFixed(0)} vs ${along(c, sc.out, sc.in).toFixed(0)}`);
    assert.equal(sc.half, SHORTCUT_HALF);
    assert.ok(along(c, sc.out, sc.in) > 0 && along(c, sc.out, sc.in) < 120);
    let dirt = 0;
    for (let i = 0; i < sc.x.length; i++) if (sc.flags[i] & F.dirt) dirt++;
    assert.ok(dirt > sc.x.length * 0.5);
    // Its ends sit on the main line
    const a = at(sc, 0);
    const b = at(sc, sc.L);
    assert.ok(Math.abs(locate(c, a.x, a.z, sc.out).lateral) < 1.5 && Math.abs(locate(c, b.x, b.z, sc.in).lateral) < 1.5);
  }
});

test('frame, at and locate agree; locate keeps to its layer at a crossing; banking lifts one side', () => {
  const c = COURSES['neon-loop'];
  const cross = c.sectors.includes('hairpin') ? (() => {
    let best = 0;
    for (let i = 0; i < c.x.length; i++) if (c.y[i] > c.y[best]) best = i;
    return best * c.step;
  })() : 0;
  for (const s of [0, 10, 33.3, cross, c.L - 0.2])
    for (const lat of [-2, 0, 1.5]) {
      const p = at(c, s, lat);
      const l = locate(c, p.x, p.z, s);
      assert.ok(Math.abs(along(c, l.s, s)) < 0.12, `s ${s}`);
      assert.ok(Math.abs(l.lateral - lat) < 0.08, `lateral at ${s}`);
      assert.ok(Math.abs(l.y - p.y) < 0.01);
    }
  const f = at(c, cross, 0.3);
  const up = locate(c, f.x, f.z, cross - 3);
  assert.ok(Math.abs(up.y - BRIDGE_H) < 0.1);
  const down = locate(c, f.x, f.z, null);
  const other = locate(c, f.x, f.z, wrapS(c, down.s + (Math.abs(along(c, down.s, cross)) < 1 ? c.L / 2 : 0)));
  assert.ok(Math.abs(up.y - down.y) < 0.1 || Math.abs(other.y) < 0.1);
  assert.equal(wrapS(c, c.L + 3), 3);
  assert.ok(Math.abs(along(c, c.L - 1, 1) - 2) < 1e-9);
  // Banking: in the bowls the right side (lateral < 0) is up
  const g = COURSES.summit;
  const bankAt = [...g.flags].findIndex((v) => v & F.bank) * g.step + 2;
  assert.ok(at(g, bankAt, -3).y > at(g, bankAt, 3).y + 0.5);
});

test('the grid is eight slots behind the line, on the track; the gantry stands either side of it', () => {
  for (const c of Object.values(COURSES)) {
    const g = gridSlots(c);
    assert.equal(g.length, GRID);
    for (const slot of g) {
      assert.ok(along(c, slot.s, c.start) > 1.5, 'behind the line');
      assert.ok(Math.abs(slot.lateral) < TRACK_HALF - 0.8);
      const p = at(c, slot.s, slot.lateral);
      assert.ok(Math.abs(locate(c, p.x, p.z, slot.s).lateral) < TRACK_HALF - 0.6);
    }
    assert.ok(along(c, g[0].s, c.start) < along(c, g[7].s, c.start));
  }
  assert.equal(GANTRY.posts.length, 2);
  assert.ok(GANTRY.h > 3);
  assert.ok(PILLARS.length >= 8 && PILLARS.every((p) => p.h > 0.5 && p.h <= BRIDGE_H + 0.01));
});

test('the footprints: the fence with a gap at the gate, the hut, the stand, the posts and pillars; nothing solid on or beside the track', () => {
  assert.ok(KART_SOLIDS.length > 10);
  for (const b of KART_SOLIDS) {
    assert.ok(b[0] < b[2] && b[1] < b[3] && b[4] > 0);
    assert.ok(b[0] >= KART_PARK.x0 - 0.5 && b[2] <= KART_PARK.x1 + 0.5 && b[1] >= KART_PARK.z0 - 0.5 && b[3] <= KART_PARK.z1 + 0.5, 'on the site');
  }
  for (const b of KART_SOLIDS) assert.ok(SOLIDS.includes(b));
  const gateMid = [(GATE.x0 + GATE.x1) / 2, GATE.z] as const;
  assert.ok(!KART_SOLIDS.some((b) => gateMid[0] > b[0] && gateMid[0] < b[2] && gateMid[1] >= b[1] - 0.01 && gateMid[1] <= b[3] + 0.01));
  const clear = (x: number, z: number) => !KART_SOLIDS.some((b) => x > b[0] - 0.3 && x < b[2] + 0.3 && z > b[1] - 0.3 && z < b[3] + 0.3);
  assert.ok(clear(HUT_DOOR.x, HUT_DOOR.z) && clear(KART_SPAWN.x, KART_SPAWN.z));
  // Nothing solid on any course's lane, its kerbs included (the owner's call: a kart drives on and off the
  // track anywhere; a bridge's pillars stand beside the ground pass)
  for (const c of Object.values(COURSES))
    for (let s = 0; s < c.L; s += 1)
      for (const lat of [-TRACK_HALF - 0.4, -TRACK_HALF + 0.7, 0, TRACK_HALF - 0.7, TRACK_HALF + 0.4]) {
        const p = at(c, s, lat);
        const hit = KART_SOLIDS.find((b) => p.x > b[0] && p.x < b[2] && p.z > b[1] && p.z < b[3] && !(p.y > 1 && b[4] <= BRIDGE_H + 0.01));
        assert.equal(hit, undefined, `${c.id}: solid on the track at s ${s} lateral ${lat}: ${hit}`);
      }
});

test('the track surface for driving off a race: the deck over the ground pass, the banking, nothing off the track', () => {
  const c = COURSES['neon-loop'];
  // On the flyover's deck and under it: the same spot, two heights, each found from its own layer
  let deckS = -1;
  for (let s = 0; s < c.L; s += 0.5) if (frame(c, s).y > BRIDGE_H - 0.05) { deckS = s; break; }
  assert.ok(deckS >= 0);
  const f = frame(c, deckS + 4);
  const up = trackSurfaceAt(f.x, f.z, f.y);
  assert.ok(up && Math.abs(up.y - f.y) < 0.05, 'the deck from the deck');
  const down = trackSurfaceAt(f.x, f.z, 0);
  assert.ok(down && down.y < 0.3, 'the ground pass from the ground');
  // The bowls tilt the kart
  const sum = COURSES['summit'];
  let bankS = -1;
  for (let s = 0; s < sum.L; s += 0.5) if (Math.abs(frame(sum, s).roll) > 0.27) { bankS = s; break; }
  assert.ok(bankS >= 0);
  const b = frame(sum, bankS);
  const onBank = trackSurfaceAt(b.x, b.z, b.y);
  assert.ok(onBank && Math.abs(onBank.roll) > 0.2);
  // Off the track: the lawn and the city
  assert.equal(trackSurfaceAt(KART_PARK.x0 + 1, KART_PARK.z0 + 1, 0), null);
  assert.equal(trackSurfaceAt(0, 0, 0), null);
});

/* ---------- The karts, classes and the economy ---------- */

test('four karts, three classes, the Pocket Rocket free; mods and classes raise the numbers', () => {
  assert.deepEqual(STARTER_KARTS, ['rocket']);
  for (const id of PLAYER_KARTS) {
    const s = KART_SPECS[id];
    for (const k of ['speed', 'accel', 'handling', 'weight'] as const) assert.ok(s[k] >= 0 && s[k] <= 1, `${id} ${k}`);
    assert.ok(KART_CATALOG[id].level >= 1);
  }
  const base = kartStats(KART_SPECS.rocket, { motor: 0, tyres: 0, nitro: 0 });
  const up = kartStats(KART_SPECS.rocket, { motor: 3, tyres: 3, nitro: 3 });
  assert.ok(up.speed > base.speed && up.handling > base.handling && up.boost > base.boost);
  assert.ok(tune(up).top > tune(base).top);
  assert.deepEqual(CLASS_IDS, ['street', 'sport', 'neon']);
  assert.ok(KART_CLASSES.street.pace < KART_CLASSES.sport.pace && KART_CLASSES.sport.pace < KART_CLASSES.neon.pace);
  assert.ok(tune(base, 'neon').top > tune(base, 'sport').top && tune(base, 'street').top < tune(base, 'sport').top);
  for (const c of CUP_IDS) {
    assert.equal(CUPS[c].courses.length, 4);
    assert.ok(CUPS[c].courses.every((id) => COURSE_IDS.includes(id)));
    assert.ok(KART_CLASSES[CUPS[c].cls]);
  }
  assert.deepEqual(cleanKart({ model: 'nope', paint: 'nope' }), DEFAULT_KART);
  assert.equal(SERIES_POINTS.length, 8);
  for (const c of CUP_IDS) assert.ok(SERIES_PRIZES[c][0] > SERIES_PRIZES[c][2]);
  for (const id of COURSE_IDS) assert.ok(PAR_LAPS[id] > 15 && PAR_LAPS[id] < 120);
  assert.ok(parLap('neon-loop', 'street') > parLap('neon-loop', 'sport') && parLap('neon-loop', 'neon') < parLap('neon-loop', 'sport'));
});

test('buying, tuning and picking karts spends Dorras and needs the level', () => {
  const s = newSave(0);
  assert.ok(ownsKart(s, 'rocket') && !ownsKart(s, 'zip'));
  assert.equal(buyKart(s, 'zip').ok, false);
  s.xp = 100000;
  assert.deepEqual(buyKart(s, 'zip'), { ok: false, why: 'money' });
  s.dorras = 100000;
  const r = buyKart(s, 'zip');
  assert.ok(r.ok && r.dorras === KART_CATALOG.zip.price);
  assert.deepEqual(buyKart(s, 'zip'), { ok: false, why: 'owned' });
  for (let i = 0; i < MOD_LEVELS; i++) assert.ok(modKart(s, 'zip', 'tyres').ok);
  assert.deepEqual(modKart(s, 'zip', 'tyres'), { ok: false, why: 'max' });
  assert.equal(kartMods(s, 'zip').tyres, MOD_LEVELS);
  assert.equal(kartModCost('zip', 'tyres', kartMods(s, 'zip')), null);
  assert.ok(kartStatsOf(s, 'zip').handling > KART_SPECS.zip.handling);
  assert.ok(pickKart(s, 'zip', 'red'));
  assert.equal(pickKart(s, 'bigwheel', 'red'), false);
  for (const k of KART_MOD_IDS) assert.ok(kartModCost('rocket', k, kartMods(s, 'rocket'))! > 0);
});

test('a finished race pays the place, keeps the fastest lap per course and class, and a time trial\'s run on your board', () => {
  const s = newSave(0);
  const win = finishKartRace(s, { course: 'neon-loop', cup: 'pro', cls: 'sport', place: 1, seconds: 95.5, laps: [33.1, 31.2, 31.2], hits: 3 });
  assert.equal(win.prize, CUPS.pro.prizes[0]);
  assert.ok(win.lapRecord && !win.record && !win.parBeaten);
  assert.equal(win.bestLap, 31.2);
  assert.equal(win.xp, XP.kartFinish + XP.kartPodium + XP.kartWin + XP.kartRecord);
  assert.deepEqual([s.counters.kartRaces, s.counters.podiums, s.counters.kartWins, s.counters.kartHits], [1, 1, 1, 3]);
  const key = recordKey('neon-loop', 'sport');
  assert.equal(s.karts.records[key].lap, 31.2);
  assert.equal(s.karts.records[key].run, 0, 'no time trial yet');
  // A slower lap in a later race keeps the record
  finishKartRace(s, { course: 'neon-loop', cup: 'rookie', cls: 'sport', place: 8, seconds: 120, laps: [40, 41, 39] });
  assert.equal(s.karts.records[key].lap, 31.2);
  // Time trials: the run goes on the board, sorted, capped
  for (let i = 0; i < LEADERBOARD_SIZE + 3; i++) finishKartRace(s, { course: 'neon-loop', cup: 'time', cls: 'sport', place: 1, seconds: 100 - i, laps: [34, 33, 33 - i * 0.01] });
  assert.equal(s.karts.boards[key].length, LEADERBOARD_SIZE);
  assert.ok(s.karts.boards[key].every((t, i, a) => i === 0 || a[i - 1].run <= t.run));
  assert.equal(s.karts.records[key].run, 100 - LEADERBOARD_SIZE - 2);
  assert.equal(s.karts.records[key].lap, 31.2, 'the race lap still stands');
  // Classes keep separate boards
  assert.equal(s.karts.boards[recordKey('neon-loop', 'neon')], undefined);
  assert.equal(s.counters.kartWins, 1, 'a time trial is not a win');
  // Beating par pays XP once
  const par = parLap('summit', 'street');
  const a = finishKartRace(s, { course: 'summit', cup: 'time', cls: 'street', place: 1, seconds: par * 3 - 1, laps: [par - 0.5, par, par] });
  assert.ok(a.parBeaten && a.xp >= XP.kartFinish + XP.parBeaten);
  const b = finishKartRace(s, { course: 'summit', cup: 'time', cls: 'street', place: 1, seconds: par * 3 - 2, laps: [par - 1, par, par] });
  assert.ok(!b.parBeaten);
});

test('the daily challenge: the same course and class for everyone that day, paid once', () => {
  const d1 = dailyChallenge('2026-10-21');
  const d2 = dailyChallenge('2026-10-21');
  const d3 = dailyChallenge('2026-10-22');
  assert.deepEqual(d1, d2);
  assert.ok(COURSE_IDS.includes(d1.course) && CLASS_IDS.includes(d1.cls) && d1.target > parLap(d1.course, d1.cls));
  assert.ok(d1.course !== d3.course || d1.cls !== d3.cls || d1.target !== d3.target);
  assert.equal(dayKey(new Date(2026, 9, 21, 15).getTime()), '2026-10-21');
  const s = newSave(0);
  const now = new Date(2026, 9, 21, 15).getTime();
  const ch = dailyChallenge(dayKey(now));
  const r = finishKartRace(s, { course: ch.course, cup: 'time', cls: ch.cls, place: 1, seconds: 100, laps: [ch.target - 0.1, 40], now });
  assert.ok(r.challenge);
  assert.equal(s.dorras, 600 + CHALLENGE_PRIZE);
  const r2 = finishKartRace(s, { course: ch.course, cup: 'time', cls: ch.cls, place: 1, seconds: 100, laps: [ch.target - 1], now });
  assert.ok(!r2.challenge, 'once a day');
});

test('a cup is a series of four races with points; the overall winner takes the series prize and a trophy', () => {
  const s = newSave(0);
  assert.equal(seriesNext(s), null);
  assert.ok(startSeries(s, 'rookie'));
  assert.equal(seriesNext(s), CUPS.rookie.courses[0]);
  // You (index 7) win twice and come second twice; rival 0 the other way round
  const results = [
    [2, 3, 4, 5, 6, 7, 8, 1],
    [1, 3, 4, 5, 6, 7, 8, 2],
    [2, 3, 4, 5, 6, 7, 8, 1],
    [1, 3, 4, 5, 6, 7, 8, 2],
  ];
  let r = seriesRace(s, results[0])!;
  assert.equal(r.race, 1);
  assert.ok(!r.done && r.places[7] === 1 && r.points[7] === SERIES_POINTS[0]);
  assert.equal(seriesNext(s), CUPS.rookie.courses[1]);
  seriesRace(s, results[1]);
  seriesRace(s, results[2]);
  const before = s.dorras;
  r = seriesRace(s, results[3])!;
  assert.ok(r.done && r.race === 4 && r.of === 4);
  // Equal points: the lower grid index wins the tie (the rival), you are second
  assert.equal(r.points[7], r.points[0]);
  assert.equal(r.overall, 2);
  assert.equal(r.prize, SERIES_PRIZES.rookie[1]);
  assert.equal(s.dorras, before + SERIES_PRIZES.rookie[1]);
  assert.equal(s.karts.trophies.rookie, 2);
  assert.equal(s.karts.series, null);
  assert.equal(r.xp, XP.seriesPodium);
  // A better finish later improves the trophy; abandoning drops the series
  startSeries(s, 'rookie');
  for (let i = 0; i < 4; i++) seriesRace(s, [2, 3, 4, 5, 6, 7, 8, 1]);
  assert.equal(s.karts.trophies.rookie, 1);
  startSeries(s, 'pro');
  abandonSeries(s);
  assert.equal(s.karts.series, null);
});

test('the save is v7: older saves get the kart section, and a loaded one is cleaned', () => {
  const old = newSave(0) as unknown as Record<string, unknown>;
  old.v = 6;
  old.karts = { model: 'rocket', paint: 'magenta', owned: [], mods: {}, records: { 'neon-loop': 55 } };
  const s = cleanSave(old, 1000);
  assert.equal(s.v, 8);
  assert.deepEqual(s.karts.records, {}, 'old plain times are dropped');
  assert.deepEqual(s.karts.boards, {});
  assert.equal(s.karts.series, null);
  const dirty = cleanSave(
    {
      ...newSave(0),
      karts: {
        model: 'bigwheel',
        paint: 'red',
        owned: ['zip', 'zip', 'nope', 'rocket'],
        mods: { zip: { tyres: 9, motor: -2 }, tank: { nitro: 2 } },
        records: { 'neon-loop:sport': { lap: 31.555, run: 99.9, kart: 'zip', at: 5 }, 'bad:key': { lap: 1, run: 1 }, 'grand:neon': { lap: -1, run: 0 } },
        boards: { 'neon-loop:sport': [{ run: 120, lap: 40 }, { run: 100, lap: 33, kart: 'nope' }, 'junk'] },
        series: { cup: 'pro', race: 2, points: [1, 2, 3, 4, 5, 6, 7, 99] },
        trophies: { rookie: 3, nope: 1, neon: 0 },
        challenge: { day: '2026-10-21', lap: 30.123 },
        parBeaten: ['neon-loop:sport', 'bad', 'neon-loop:sport'],
      },
    },
    1000
  );
  assert.deepEqual(dirty.karts.owned, ['zip']);
  assert.equal(dirty.karts.model, 'rocket', 'a kart you don\'t own falls back');
  assert.deepEqual(dirty.karts.mods, { zip: { motor: 0, tyres: MOD_LEVELS, nitro: 0 } });
  assert.deepEqual(Object.keys(dirty.karts.records), ['neon-loop:sport']);
  assert.deepEqual(dirty.karts.records['neon-loop:sport'], { lap: 31.56, run: 99.9, kart: 'zip', at: 5 });
  assert.deepEqual(dirty.karts.boards['neon-loop:sport'].map((t) => t.run), [100, 120]);
  assert.equal(dirty.karts.boards['neon-loop:sport'][0].kart, 'rocket');
  assert.deepEqual(dirty.karts.series, { cup: 'pro', race: 2, points: [1, 2, 3, 4, 5, 6, 7, 99] });
  assert.deepEqual(dirty.karts.trophies, { rookie: 3 });
  assert.deepEqual(dirty.karts.challenge, { day: '2026-10-21', lap: 30.12 });
  assert.deepEqual(dirty.karts.parBeaten, ['neon-loop:sport']);
});

test('missions and badges watch the kart counters', () => {
  for (const id of ['first-lap', 'podium', 'pigeon-post', 'kart-winner', 'kart-hat-trick', 'kart-champion']) assert.ok(MISSIONS.some((m) => m.id === id), id);
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
const rivals = (cls: 'street' | 'sport' | 'neon' = 'sport') => PLAYER_KARTS.flatMap((k) => [k, k]).slice(0, 7).map((k) => ({ kart: k, tune: tune(KART_SPECS[k], cls) }));

test('a cup race: the countdown, eight karts round the laps, everyone inside the walls, items landing, places in order', () => {
  const sim = createKartSim({ course: 'neon-loop', cup: 'rookie', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, 'street') }, rivals: rivals('street'), seed: 3 });
  assert.equal(sim.racers.length, 8);
  assert.equal(sim.cls, 'street');
  assert.equal(sim.boxes.length, COURSES['neon-loop'].boxes.length * BOX_LATERALS.length);
  const ev0: string[] = [];
  for (let i = 0; i < 70; i++) for (const e of sim.step(1 / 60, { ...NO_INPUT, throttle: 1 })) ev0.push(e.kind);
  assert.ok(ev0.includes('count'));
  assert.ok(!sim.started && sim.player.speed === 0);
  const counts: Record<string, number> = {};
  let t = 1;
  while (!sim.over && t < 900) {
    for (const e of sim.step(1 / 60, brain(sim, t))) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
    t += 1 / 60;
    for (const k of sim.racers) {
      assert.ok(Math.abs(k.lateral) <= TRACK_HALF - 0.4 + 1e-6, `${k.kart} through the wall`);
      assert.ok(Number.isFinite(k.x) && Number.isFinite(k.yaw));
      assert.ok(k.y >= -0.2 && k.y < BRIDGE_H + 4);
    }
  }
  assert.ok(sim.over, 'everyone finished');
  assert.ok(sim.done && sim.player.lap === 3);
  assert.equal(counts.go, 1);
  assert.equal(counts.finish, 8);
  assert.ok(counts.lap === 16, 'two lap events each');
  for (const k of ['box', 'item', 'use', 'hit', 'boost', 'pad', 'drift', 'jump', 'land'] as const) assert.ok((counts[k] ?? 0) > 0, k);
  const order = sim.standings();
  assert.deepEqual(order.map((i) => sim.racers[i].place), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(sim.time > 60 && sim.time < 600);
  assert.ok(sim.racers.some((k) => k.hits > 0), 'someone landed an item');
});

test('every course runs: a solo auto-driven lap on each, the par laps in the right ballpark, the Grand Circuit two laps', () => {
  for (const id of COURSE_IDS) {
    const sim = createKartSim({ course: id, cup: 'time', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, 'sport') }, rivals: [], seed: 1, auto: true, laps: 1 });
    assert.equal(sim.laps, 1);
    let t = 0;
    let onShort = 0;
    let wet = 0;
    let banked = 0;
    while (!sim.done && t < 200) {
      sim.step(1 / 60, NO_INPUT);
      t += 1 / 60;
      const p = sim.player;
      if (p.line === 'short') onShort++;
      if (p.flags & F.wet) wet++;
      if (p.flags & F.bank) banked++;
      assert.ok(Math.abs(p.lateral) <= TRACK_HALF - 0.4 + 1e-6, `${id} through the wall`);
    }
    assert.ok(sim.done, `${id} finished`);
    const lap = sim.player.finishT - 0;
    assert.ok(lap > PAR_LAPS[id] * 0.6 && lap < PAR_LAPS[id] * 1.6, `${id} auto lap ${lap.toFixed(1)} vs par ${PAR_LAPS[id]}`);
    if (COURSES[id].sectors.includes('hairpin')) assert.ok(wet > 0, `${id} crosses the wet bend`);
    if (COURSES[id].sectors.includes('north')) assert.ok(banked > 0, `${id} runs the bowls`);
    assert.equal(onShort, 0, 'no boost, no shortcut');
  }
  assert.equal(createKartSim({ course: 'grand', cup: 'time', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket) }, rivals: [], seed: 1 }).laps, 2);
});

test('the shortcut: a kart steered into its mouth runs the dirt, capped unless boosting, and comes out ahead on the main line', () => {
  const sim = createKartSim({ course: 'grand', cup: 'time', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket) }, rivals: [], seed: 2, laps: 1 });
  const c = sim.course;
  const sc = c.shortcut!;
  // Put the kart just before the mouth, rolling
  const p = sim.player;
  for (let i = 0; i < 60 * 3.2; i++) sim.step(1 / 60, NO_INPUT);
  const start = at(c, sc.out - 6, 0);
  Object.assign(p, { x: start.x, z: start.z, y: start.y, yaw: start.yaw, s: wrapS(c, sc.out - 6), lateral: 0, progress: 10, speed: 10, vx: Math.cos(start.yaw) * 10, vz: -Math.sin(start.yaw) * 10 });
  // Steer at the shortcut's line
  let on = false;
  let maxDirtSpeed = 0;
  let left = false;
  let onFor = 0;
  for (let i = 0; i < 60 * 20 && !left; i++) {
    const target = p.line === 'short' ? at(sc, Math.min(sc.L, p.sShort + 4), 0) : at(sc, 4, 0);
    const heading = Math.atan2(-(target.z - p.z), target.x - p.x);
    const err = Math.atan2(Math.sin(heading - p.yaw), Math.cos(heading - p.yaw));
    const ev = sim.step(1 / 60, { ...NO_INPUT, throttle: 1, steer: Math.max(-1, Math.min(1, -err * 2.5)) });
    for (const e of ev) {
      if (e.kind === 'shortcut' && e.on) on = true;
      if (e.kind === 'shortcut' && !e.on) left = true;
    }
    if (p.line === 'short') {
      assert.ok(Math.abs(p.lateral) <= sc.half - 0.4 + 1e-6, 'inside the shortcut\'s walls');
      onFor += 1 / 60;
      if (p.flags & F.dirt && p.boostT <= 0 && onFor > 1) maxDirtSpeed = Math.max(maxDirtSpeed, p.speed);
    }
  }
  assert.ok(on && left, 'through the shortcut');
  assert.ok(maxDirtSpeed > 1 && maxDirtSpeed <= p.tune.top * DIRT_CAP + 0.6, `dirt cap ${maxDirtSpeed.toFixed(1)}`);
  assert.ok(Math.abs(along(c, p.s, sc.in)) < 6, 'back on the main line at the join');
  assert.ok(p.progress > 10 + along(c, sc.out - 6, sc.in) - 8, 'progress carried across');
});

test('a hit spins a kart, a shield soaks one up, a rival that lags gets a faster kart', () => {
  const sim = createKartSim({ course: 'neon-loop', cup: 'neon', player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, 'neon') }, rivals: rivals('neon'), seed: 9 });
  for (let i = 0; i < 60 * 4; i++) sim.step(1 / 60, brain(sim, i / 60, false));
  const p = sim.player;
  p.item = 'rocket';
  const ev = sim.step(1 / 60, { ...NO_INPUT, throttle: 1, item: true });
  assert.ok(ev.some((e) => e.kind === 'use' && e.item === 'rocket') && ev.some((e) => e.kind === 'boost'));
  assert.ok(p.boostT > 0);
  p.item = 'shield';
  sim.step(1 / 60, { ...NO_INPUT, throttle: 1, item: true });
  assert.ok(p.shield);
  // A pigeon from the rival just behind
  const rival = sim.racers[0];
  const back = at(sim.course, p.s - 2, p.lateral);
  Object.assign(rival, { x: back.x, z: back.z, s: wrapS(sim.course, p.s - 2), lateral: p.lateral, progress: p.progress - 2, yaw: p.yaw });
  sim.missiles.push({ kind: 'pigeon', x: back.x, z: back.z, y: back.y + 0.8, yaw: back.yaw, s: rival.s, lateral: p.lateral, vx: 0, vz: 0, owner: rival.i, target: p.i, t: 9, bounces: 0 });
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
  const a = sim.racers[1];
  const b = sim.racers[2];
  a.progress = p.progress - 60;
  b.progress = p.progress + 60;
  sim.step(1 / 60, NO_INPUT);
  assert.ok(a.tune.top > b.tune.top);
});
