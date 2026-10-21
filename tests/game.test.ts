// Phase 5, the city's game: levels and the catalog (catalog.ts), buying and upgrading (tycoon.ts),
// races (races.ts) and the mission board and badges (missions.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILD_COSTS,
  CAR_CATALOG,
  GUN_CATALOG,
  GUN_MOD_EFFECT,
  LEVEL_CAPACITY,
  MAX_LEVEL,
  MOD_LEVELS,
  PLOT_DORRAS,
  PLOT_LEVEL,
  PLOT_REFUND,
  STARTER_CARS,
  STARTER_GUNS,
  WARDROBE_CATALOG,
  XP,
  carStats,
  levelFor,
  levelProgress,
  modCost,
  titleFor,
  xpForLevel,
} from '../src/scripts/city3d/catalog';
import {
  addXp,
  buildPlot,
  buildUnit,
  buyCar,
  buyGun,
  buyPlot,
  buyUnit,
  buyWardrobe,
  capOf,
  cargoCap,
  carMods,
  carStatsOf,
  cleanSave,
  gearValue,
  gunMods,
  level,
  modCar,
  modGun,
  ownsCar,
  ownsGun,
  placeLevelCost,
  plotPrice,
  propertyValue,
  room,
  sellPlot,
  takedown,
  upgradePlace,
  worth,
  type TycoonSave,
} from '../src/scripts/city3d/tycoon';
import { CARGO, DRIVE, PLAYER_CARS } from '../src/scripts/city3d/mycar';
import { WEAPONS, WEAPON_IDS } from '../src/scripts/city3d/combat-sim';
import { CHECK_R, COUNTDOWN, RACES, RACE_SITE, START_LINE, clockOf, finishRun, prizeFor, race, startRun, stepRun } from '../src/scripts/city3d/races';
import { BADGES, MISSIONS, MISSIONS_MAX, abandonMission, acceptMission, checkBadges, claimMission, claimable, missionProgress, missionState } from '../src/scripts/city3d/missions';
import { PLOT_IDS } from '../src/data/plots';
import { SOLIDS } from '../src/scripts/city3d/solids';

const T0 = 1_700_000_000_000;
const fresh = () => cleanSave(null, T0);
const rich = (dorras = 1e7, xp = xpForLevel(MAX_LEVEL)) => {
  const s = fresh();
  s.dorras = dorras;
  s.xp = xp;
  return s;
};

/* ---------- Levels and the catalog ---------- */

test('the XP curve climbs, levels follow it, and titles come with levels', () => {
  assert.equal(xpForLevel(1), 0);
  for (let l = 2; l <= MAX_LEVEL; l++) assert.ok(xpForLevel(l) > xpForLevel(l - 1), `level ${l}`);
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(xpForLevel(7)), 7);
  assert.equal(levelFor(xpForLevel(7) - 1), 6);
  assert.equal(levelFor(1e12), MAX_LEVEL);
  const p = levelProgress(xpForLevel(4) + 10);
  assert.equal(p.level, 4);
  assert.ok(p.into > 0 && p.into < 1);
  assert.equal(p.toGo, xpForLevel(5) - xpForLevel(4) - 10);
  assert.equal(levelProgress(1e12).toGo, 0);
  assert.equal(titleFor(1), 'Newcomer');
  assert.equal(titleFor(MAX_LEVEL), 'Degen Supreme');
});

test('the catalog: starters are free and level 1, everything else costs Dorras and needs a level', () => {
  for (const id of PLAYER_CARS) assert.ok(CAR_CATALOG[id], id);
  assert.deepEqual(STARTER_CARS, ['hatch', 'sedan', 'coupe', 'pickup', 'van']);
  for (const id of WEAPON_IDS) assert.ok(GUN_CATALOG[id], id);
  assert.deepEqual(STARTER_GUNS, ['rifle', 'smg', 'shotgun', 'dmr']);
  for (const w of WARDROBE_CATALOG) assert.ok(w.price > 0 && w.level >= 1 && w.name && w.pitch, w.id);
  assert.equal(new Set(WARDROBE_CATALOG.map((w) => w.id)).size, WARDROBE_CATALOG.length);
  for (const id of PLAYER_CARS) assert.ok(CARGO[id] > 0 && DRIVE[id], id);
  // Mods cost more each level, and more on dearer things; nothing past the top
  assert.ok(modCost(0, 1)! < modCost(0, 2)! && modCost(0, 2)! < modCost(0, 3)!);
  assert.ok(modCost(60000, 1)! > modCost(0, 1)!);
  assert.equal(modCost(0, MOD_LEVELS + 1), null);
  assert.equal(modCost(0, 0), null);
  const st = carStats({ speed: 0.5, accel: 0.5, grip: 0.5 }, 40, { engine: 3, turbo: 0, tyres: 1, rack: 2 });
  assert.ok(st.speed > 0.5 && st.accel === 0.5 && st.grip > 0.5);
  assert.equal(st.cargo, 60);
  assert.ok(GUN_MOD_EFFECT.damage > 0);
});

/* ---------- Buying and upgrading ---------- */

test('a fresh save starts at level 1 with the starters and nothing bought', () => {
  const s = fresh();
  assert.equal(s.v, 8);
  assert.equal(level(s), 1);
  for (const id of STARTER_CARS) assert.ok(ownsCar(s, id));
  assert.ok(!ownsCar(s, 'super'));
  for (const id of STARTER_GUNS) assert.ok(ownsGun(s, id));
  assert.ok(!ownsGun(s, 'lmg'));
  assert.equal(gearValue(s), 0);
  assert.deepEqual(carMods(s, 'hatch'), { engine: 0, turbo: 0, tyres: 0, rack: 0 });
});

test('addXp levels you up and reports it; takedowns count and pay XP', () => {
  const s = fresh();
  assert.equal(addXp(s, xpForLevel(3)), 2);
  assert.equal(level(s), 3);
  assert.equal(addXp(s, 1), 0);
  assert.equal(addXp(s, -5), 0);
  takedown(s, 'drone');
  takedown(s, 'dummy');
  assert.equal(s.counters.drones, 1);
  assert.equal(s.counters.dummies, 1);
  assert.equal(s.xp, xpForLevel(3) + 1 + XP.drone + XP.dummy);
});

test('cars: level first, then money; owned once; mods stop at the top and change the handling and the boot', () => {
  const s = fresh();
  s.dorras = 1e6;
  assert.deepEqual(buyCar(s, 'super'), { ok: false, why: 'level' });
  s.xp = xpForLevel(CAR_CATALOG.super.level);
  s.dorras = CAR_CATALOG.super.price - 1;
  assert.deepEqual(buyCar(s, 'super'), { ok: false, why: 'money' });
  s.dorras = CAR_CATALOG.super.price;
  assert.deepEqual(buyCar(s, 'super'), { ok: true, dorras: CAR_CATALOG.super.price });
  assert.equal(s.dorras, 0);
  assert.ok(ownsCar(s, 'super'));
  assert.deepEqual(buyCar(s, 'super'), { ok: false, why: 'owned' });
  assert.deepEqual(buyCar(s, 'hatch'), { ok: false, why: 'owned' });
  assert.equal(s.counters.bought, 1);
  assert.equal(s.ledger.totals.vehicles, CAR_CATALOG.super.price);
  // Mods
  s.dorras = 1e6;
  const before = carStatsOf(s, 'van');
  for (let i = 0; i < MOD_LEVELS; i++) assert.ok(modCar(s, 'van', 'rack').ok);
  assert.deepEqual(modCar(s, 'van', 'rack'), { ok: false, why: 'max' });
  assert.equal(carMods(s, 'van').rack, MOD_LEVELS);
  assert.equal(cargoCap('van', s), Math.round(CARGO.van * 1.75));
  assert.equal(cargoCap('van'), CARGO.van);
  assert.ok(modCar(s, 'van', 'engine').ok);
  const after = carStatsOf(s, 'van');
  assert.ok(after.speed > before.speed && after.cargo > before.cargo && after.grip === before.grip);
  assert.deepEqual(modCar(s, 'muscle', 'engine'), { ok: false, why: 'place' }, 'not owned');
  assert.equal(s.counters.upgrades, MOD_LEVELS + 1);
  assert.ok(gearValue(s) > CAR_CATALOG.super.price);
});

test('guns: the starters are owned, premium ones are bought, mods go up three levels', () => {
  const s = rich();
  assert.ok(buyGun(s, 'revolver').ok);
  assert.deepEqual(buyGun(s, 'revolver'), { ok: false, why: 'owned' });
  assert.deepEqual(buyGun(s, 'rifle'), { ok: false, why: 'owned' });
  for (let i = 0; i < MOD_LEVELS; i++) assert.ok(modGun(s, 'rifle', 'mag').ok);
  assert.deepEqual(modGun(s, 'rifle', 'mag'), { ok: false, why: 'max' });
  assert.deepEqual(gunMods(s, 'rifle'), { barrel: 0, mag: 3, grip: 0 });
  assert.deepEqual(modGun(s, 'lmg', 'barrel'), { ok: false, why: 'place' });
  const poor = fresh();
  assert.deepEqual(buyGun(poor, 'revolver'), { ok: false, why: 'level' });
  poor.xp = xpForLevel(GUN_CATALOG.revolver.level);
  assert.deepEqual(buyGun(poor, 'revolver'), { ok: false, why: 'money' });
  assert.ok(WEAPONS.revolver.need === 0 && WEAPONS.burst.burst === 3);
});

test('clothes: bought once, level and money checked', () => {
  const s = rich();
  assert.ok(buyWardrobe(s, 'halo').ok);
  assert.deepEqual(buyWardrobe(s, 'halo'), { ok: false, why: 'owned' });
  assert.deepEqual(buyWardrobe(s, 'nothing'), { ok: false, why: 'place' });
  assert.equal(s.ledger.totals.clothes, 9000);
  assert.deepEqual(buyWardrobe(fresh(), 'phone'), { ok: false, why: 'money' });
});

test('plots: dearer each time, built on for the difference, sold back for a share', () => {
  const s = rich();
  assert.equal(plotPrice(s), PLOT_DORRAS);
  assert.deepEqual(buyPlot(s, 'X9', T0, (id) => PLOT_IDS.includes(id)), { ok: false, why: 'place' });
  assert.ok(buyPlot(s, 'N3', T0, (id) => PLOT_IDS.includes(id)).ok);
  assert.deepEqual(buyPlot(s, 'N3', T0), { ok: false, why: 'owned' });
  assert.equal(plotPrice(s), Math.round(PLOT_DORRAS * 1.25));
  const d0 = s.dorras;
  assert.ok(buildPlot(s, 'N3', { type: 'house', color: '#e23b3b', neon: '#ff6ad5', floors: 1, sign: 'GM', rot: 0 }).ok);
  assert.equal(d0 - s.dorras, BUILD_COSTS.house);
  assert.equal(s.plots.N3.design?.type, 'house');
  // Up to a tower: the difference; back down to a garden: free
  assert.ok(buildPlot(s, 'N3', { type: 'tower', color: '#e23b3b', neon: '#ff6ad5', floors: 6, sign: 'GM', rot: 1 }).ok);
  assert.equal(d0 - s.dorras, BUILD_COSTS.tower);
  assert.ok(buildPlot(s, 'N3', { type: 'garden', color: '#e23b3b', neon: '#ff6ad5', floors: 1, sign: 'GM', rot: 0 }).ok);
  assert.equal(d0 - s.dorras, BUILD_COSTS.tower);
  assert.ok(buildPlot(s, 'N3', null).ok);
  assert.equal(s.plots.N3.design, null);
  assert.equal(s.plots.N3.paid, PLOT_DORRAS + BUILD_COSTS.tower);
  assert.ok(propertyValue(s) >= PLOT_DORRAS + BUILD_COSTS.tower);
  const d1 = s.dorras;
  const r = sellPlot(s, 'N3');
  assert.ok(r.ok && r.dorras === Math.round((PLOT_DORRAS + BUILD_COSTS.tower) * PLOT_REFUND));
  assert.equal(s.dorras - d1, r.ok ? r.dorras : 0);
  assert.ok(!('N3' in s.plots));
  assert.deepEqual(sellPlot(s, 'N3'), { ok: false, why: 'place' });
  const low = fresh();
  low.dorras = 1e9;
  low.xp = xpForLevel(PLOT_LEVEL) - 1;
  assert.deepEqual(buyPlot(low, 'S1', T0), { ok: false, why: 'level' });
  assert.deepEqual(buildPlot(low, 'S1', null), { ok: false, why: 'place' });
});

test('place levels: more room and faster work; the stall and empty places have no levels', () => {
  const s = rich();
  assert.equal(placeLevelCost(s, 'stall'), null);
  assert.equal(placeLevelCost(s, 'u0'), null, 'nothing built yet');
  assert.ok(buyUnit(s, 0).ok && buildUnit(s, 0, 'warehouse').ok);
  const cap1 = capOf(s, 'u0');
  assert.ok(upgradePlace(s, 'u0').ok);
  assert.equal(capOf(s, 'u0'), Math.round(cap1 * LEVEL_CAPACITY[1]));
  assert.equal(room(s, 'glow', 'u0'), capOf(s, 'u0'));
  assert.ok(upgradePlace(s, 'u0').ok);
  assert.deepEqual(upgradePlace(s, 'u0'), { ok: false, why: 'max' });
  assert.ok(upgradePlace(s, 'workshop').ok);
  assert.equal(capOf(s, 'workshop'), Math.round(200 * LEVEL_CAPACITY[1]));
  assert.ok(worth(s, T0) > 0);
  const poor = fresh();
  poor.dorras = 1e5;
  assert.ok(buyUnit(poor, 0).ok && buildUnit(poor, 0, 'shop').ok);
  poor.dorras = 0;
  assert.deepEqual(upgradePlace(poor, 'u0'), { ok: false, why: 'money' });
});

test('cleanSave carries a Phase 4 save into Phase 5 and keeps everything within the rules', () => {
  const old = cleanSave(null, T0) as unknown as Record<string, unknown>;
  old.v = 4;
  delete old.xp;
  delete old.garage;
  delete old.plots;
  const s = cleanSave(old, T0);
  assert.equal(s.v, 8);
  assert.equal(s.xp, 0);
  assert.deepEqual(s.garage, { owned: [], mods: {} });
  assert.deepEqual(s.plots, {});
  const dirty = cleanSave(
    {
      xp: -4,
      garage: { owned: ['super', 'hatch', 'bus', 'super'], mods: { super: { engine: 9, rack: -1 }, muscle: { engine: 2 } } },
      armoury: { owned: ['lmg', 'rifle', 'bazooka'], mods: { lmg: { mag: 2.4 }, rifle: { grip: 1 }, revolver: { barrel: 3 } } },
      wardrobe: ['halo', 'halo', 'cape'],
      plots: { N3: { design: { type: 'castle' }, paid: 5 }, ZZ: {}, S1: { design: { type: 'house', color: 'bad' }, paid: 1e12 } },
      levels: { u0: 9, stall: 3, workshop: 2, l1: 0 },
      races: { 'river-loop': 31.123456, bad: -1, 'x y': 4 },
      missions: { active: [{ id: 'drone-patrol', from: { drones: 2 } }, { id: 'drone-patrol' }, { id: 'nope!' }], done: ['warm-up', 'warm-up'] },
      badges: ['seller-100', 'Bad Badge'],
      counters: { drones: 7.9, dummies: -3, made_up: 4 },
    },
    T0
  );
  assert.equal(dirty.xp, 0);
  assert.deepEqual(dirty.garage.owned, ['super']);
  assert.deepEqual(dirty.garage.mods, { super: { engine: 3, turbo: 0, tyres: 0, rack: 0 } }, 'mods only on cars you own');
  assert.deepEqual(dirty.armoury.owned, ['lmg']);
  assert.deepEqual(dirty.armoury.mods, { lmg: { barrel: 0, mag: 2, grip: 0 }, rifle: { barrel: 0, mag: 0, grip: 1 } });
  assert.deepEqual(dirty.wardrobe, ['halo']);
  assert.deepEqual(Object.keys(dirty.plots), ['N3', 'S1']);
  assert.equal(dirty.plots.N3.design, null);
  assert.equal(dirty.plots.S1.design?.type, 'house');
  assert.equal(dirty.plots.S1.paid, 1e9);
  assert.deepEqual(dirty.levels, { u0: 3, workshop: 2 });
  assert.deepEqual(dirty.races, { 'river-loop': 31.12 });
  assert.equal(dirty.missions.active.length, 1);
  assert.equal(dirty.missions.active[0].from.drones, 2);
  assert.deepEqual(dirty.missions.done, ['warm-up']);
  assert.deepEqual(dirty.badges, ['seller-100']);
  assert.equal(dirty.counters.drones, 7);
  assert.equal(dirty.counters.dummies, 0);
  assert.ok(!('made_up' in dirty.counters));
});

/* ---------- Races ---------- */

test('the courses: on the roads, in order, the finish by the start line; the site is solid', () => {
  assert.ok(RACES.length >= 4);
  for (const r of RACES) {
    assert.ok(r.checkpoints.length >= 4, r.id);
    for (const [x, z] of r.checkpoints) assert.ok(Number.isFinite(x) && Number.isFinite(z));
    const [fx, fz] = r.checkpoints[r.checkpoints.length - 1];
    assert.ok(Math.hypot(fx - START_LINE.x, fz - START_LINE.z) < 3, `${r.id} finishes at the start line`);
    assert.ok(r.par > 10 && r.prize > 0 && r.level >= 1);
  }
  assert.ok(race('nope') === null);
  // The gantry's posts stand on the sidewalks, the board beside them: all in SOLIDS
  const post = SOLIDS.find((b) => b[0] <= RACE_SITE.gantry.x && b[2] >= RACE_SITE.gantry.x && b[1] <= RACE_SITE.gantry.post && b[3] >= RACE_SITE.gantry.post);
  assert.ok(post, 'the gantry post');
  const board = SOLIDS.find((b) => b[0] <= RACE_SITE.board.x && b[2] >= RACE_SITE.board.x && b[1] <= RACE_SITE.board.z && b[3] >= RACE_SITE.board.z);
  assert.ok(board, 'the race board');
  assert.ok(!SOLIDS.some((b) => b[0] <= RACE_SITE.spot.x && b[2] >= RACE_SITE.spot.x && b[1] <= RACE_SITE.spot.z && b[3] >= RACE_SITE.spot.z), 'you can stand at the board');
});

test('a run counts down, takes checkpoints in order, finishes and pays by par', () => {
  assert.equal(startRun('nope'), null);
  const run = startRun('river-loop')!;
  const r = race('river-loop')!;
  const far: [number, number] = [-100, -100];
  // Countdown: a beep at each whole second, then GO
  const events: string[] = [];
  for (let i = 0; i < 40; i++) events.push(...stepRun(run, ...far, 0.1));
  assert.equal(events.filter((e) => e === 'count').length, COUNTDOWN - 1);
  assert.equal(events.filter((e) => e === 'go').length, 1);
  assert.equal(run.countdown, 0);
  // The second checkpoint doesn't count before the first
  const [x1, z1] = r.checkpoints[1];
  assert.deepEqual(stepRun(run, x1, z1, 0.1), []);
  assert.equal(run.next, 0);
  for (let i = 0; i < r.checkpoints.length; i++) {
    const [x, z] = r.checkpoints[i];
    const ev = stepRun(run, x + CHECK_R * 0.7, z, 0.5);
    assert.deepEqual(ev, [i === r.checkpoints.length - 1 ? 'finish' : 'checkpoint'], `checkpoint ${i}`);
  }
  assert.ok(run.done);
  assert.equal(run.splits.length, r.checkpoints.length);
  assert.deepEqual(stepRun(run, 0, 0, 1), []);
  // Pay-out
  const s = fresh();
  const res = finishRun(s, run)!;
  assert.ok(res.prize === prizeFor(r, res.seconds) && res.record && res.underPar);
  assert.equal(s.races['river-loop'], res.seconds);
  assert.equal(s.dorras, 600 + res.prize);
  assert.equal(s.counters.races, 1);
  assert.equal(s.counters.pars, 1);
  assert.equal(s.counters.records, 1);
  assert.equal(res.xp, XP.raceFinish + XP.racePar + XP.raceRecord);
  // A slower second run: no record, no par bonus, a smaller prize
  const slow = startRun('river-loop')!;
  slow.countdown = 0;
  slow.t = r.par * 2;
  slow.done = true;
  const res2 = finishRun(s, slow)!;
  assert.ok(!res2.record && !res2.underPar && res2.prize < res.prize);
  assert.equal(prizeFor(r, r.par), r.prize);
  assert.equal(prizeFor(r, r.par / 3), Math.round(r.prize * 1.5));
  assert.equal(prizeFor(r, r.par * 10), Math.round(r.prize * 0.4));
  assert.equal(finishRun(s, startRun('ring-circuit')!), null, 'not finished');
  assert.equal(clockOf(65.5), '1:05.50');
});

/* ---------- Missions and badges ---------- */

test('missions: level-gated, three at once, progress from when you took them, claimed when done', () => {
  const s = fresh();
  assert.equal(missionState(s, 'drone-patrol'), 'open');
  assert.equal(missionState(s, 'kart-winner'), 'locked');
  assert.equal(missionState(s, 'nope'), 'locked');
  assert.deepEqual(acceptMission(s, 'kart-winner', T0), { ok: false, why: 'level' });
  takedown(s, 'drone');
  assert.ok(acceptMission(s, 'drone-patrol', T0).ok);
  assert.equal(missionState(s, 'drone-patrol'), 'active');
  assert.deepEqual(acceptMission(s, 'drone-patrol', T0), { ok: false, why: 'owned' });
  assert.deepEqual(missionProgress(s, s.missions.active[0]), { done: 0, need: 3, complete: false }, 'the drone before counts for nothing');
  assert.deepEqual(claimMission(s, 'drone-patrol'), { ok: false, why: 'progress' });
  takedown(s, 'drone');
  takedown(s, 'drone');
  takedown(s, 'drone');
  takedown(s, 'drone');
  assert.deepEqual(missionProgress(s, s.missions.active[0]), { done: 3, need: 3, complete: true });
  assert.equal(claimable(s).length, 1);
  const d0 = s.dorras;
  const x0 = s.xp;
  const r = claimMission(s, 'drone-patrol');
  assert.ok(r.ok && r.reward === 400 && r.xp === 80);
  assert.equal(s.dorras - d0, 400);
  assert.equal(s.xp - x0, 80);
  assert.equal(missionState(s, 'drone-patrol'), 'done');
  assert.equal(s.counters.missions, 1);
  assert.deepEqual(acceptMission(s, 'drone-patrol', T0), { ok: false, why: 'owned' });
  // Three at once
  for (const id of ['first-sales', 'paper-run', 'joyride']) assert.ok(acceptMission(s, id, T0).ok, id);
  assert.deepEqual(acceptMission(s, 'warm-up', T0), { ok: false, why: 'max' });
  assert.ok(abandonMission(s, 'joyride'));
  assert.ok(!abandonMission(s, 'joyride'));
  assert.ok(acceptMission(s, 'warm-up', T0).ok);
  // A race mission: done once the race is in the records (under par when asked)
  const a = s.missions.active.find((m) => m.id === 'warm-up')!;
  assert.ok(!missionProgress(s, a).complete);
  s.races['river-loop'] = 999;
  assert.ok(missionProgress(s, a).complete);
  s.xp = xpForLevel(5);
  assert.ok(acceptMission(s, 'under-par', T0).ok === false, 'three active');
  abandonMission(s, 'paper-run');
  assert.ok(acceptMission(s, 'under-par', T0).ok);
  const u = s.missions.active.find((m) => m.id === 'under-par')!;
  assert.ok(!missionProgress(s, u).complete);
  s.races['river-loop'] = 1;
  assert.ok(missionProgress(s, u).complete);
  // A plots mission
  s.xp = xpForLevel(8);
  abandonMission(s, 'first-sales');
  assert.ok(acceptMission(s, 'property-mogul', T0).ok);
  const pm = s.missions.active.find((m) => m.id === 'property-mogul')!;
  assert.ok(!missionProgress(s, pm).complete);
  s.dorras = 1e9;
  assert.ok(buyPlot(s, 'N1', T0).ok);
  assert.ok(missionProgress(s, pm).complete);
  assert.equal(MISSIONS_MAX, 3);
  assert.equal(new Set(MISSIONS.map((m) => m.id)).size, MISSIONS.length);
});

test('badges land once when a counter or level crosses the line, with their XP', () => {
  const s = fresh();
  assert.deepEqual(checkBadges(s), []);
  s.counters.drones = 10;
  const got = checkBadges(s);
  assert.deepEqual(got.map((b) => b.id), ['drones-10']);
  assert.equal(s.xp, 100);
  assert.deepEqual(checkBadges(s), [], 'not twice');
  s.xp = xpForLevel(10);
  const lv = checkBadges(s).map((b) => b.id);
  assert.ok(lv.includes('level-5') && lv.includes('level-10'));
  assert.equal(new Set(BADGES.map((b) => b.id)).size, BADGES.length);
});
