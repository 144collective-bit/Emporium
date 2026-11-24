/*
 * The golf game's rules (docs/golf-game-plan.md Phase 1): src/scripts/city3d/golfgame-sim.ts.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  METER,
  PULL,
  pullShot,
  BOUNCE,
  CLUBS,
  CUP,
  MAX_STROKES,
  PUTT_MAX,
  ROLL,
  botShot,
  dropBy,
  inTree,
  launchOf,
  lieTake,
  newRound,
  outOfBounds,
  playShot,
  rng,
  roundOver,
  strike,
  teeBall,
  toPar,
  type Ball,
  type ShotInput,
  type Wind,
} from '../src/scripts/city3d/golfgame-sim';
import { FURNITURE } from '../src/scripts/city3d/golflife';
import { COURSE, HOLES, LAKES, along, inCourse, lakeAt, surfaceAt, teeOf, type Pt } from '../src/scripts/city3d/golf';
import { golfLift, golfTrees } from '../src/scripts/city3d/golflift';

const pinOf = (h: number) => FURNITURE[h].pin;
const still: Wind = { dir: 0, speed: 0 };
const heading = (from: { x: number; z: number }, to: Pt) => Math.atan2(to[0] - from.x, to[1] - from.z);
const ball = (p: Pt): Ball => ({ x: p[0], y: golfLift(...p) + 0.03, z: p[1] });

test('the clubs: each carries about its distance off a tee, longer clubs further, the lie taking its share', () => {
  // Their launches in order: the driver fastest, the sand wedge slowest
  const irons = CLUBS.filter((c) => c.id !== 'putter');
  for (let i = 1; i < irons.length; i++) assert.ok(launchOf(irons[i].id) < launchOf(irons[i - 1].id), `${irons[i].id} launches slower than ${irons[i - 1].id}`);
  // Off the 1st tee down its line, still air, full power: each carries about its carry (the ground's not flat)
  const h = HOLES[0];
  const from = teeBall(h);
  const aim = heading(from, along(h, 60).at);
  let last = Infinity;
  for (const c of irons) {
    const r = strike(from, { club: c.id, aim, power: 1, accuracy: 0 }, still, null);
    assert.ok(Math.abs(r.carry - c.carry) < c.carry * 0.15 + 2, `${c.name} carries ${r.carry.toFixed(1)}, not about ${c.carry}`);
    assert.ok(r.carry < last);
    last = r.carry;
  }
  // The lie: clean off the tee and the fairway, less from the rough, a chip from the native grass, only wedges from sand
  assert.equal(lieTake('fairway', 'iron7'), 1);
  assert.ok(lieTake('rough', 'iron7') < 1 && lieTake('native', 'iron7') < lieTake('rough', 'iron7'));
  assert.ok(lieTake('bunker', 'sw') > lieTake('bunker', 'iron5'));
  // What's underfoot: a fairway lets a ball run on more than the rough, the rough more than the native grass, sand none
  assert.ok(BOUNCE.fairway.run > BOUNCE.rough.run && BOUNCE.rough.run > BOUNCE.native.run && BOUNCE.bunker.run === 0);
  assert.ok(ROLL.green < ROLL.fairway && ROLL.fairway < ROLL.rough && ROLL.rough < ROLL.native);
});

test('a shot: the wind carries it, a slice curves right and a hook left, off the top of the meter goes further', () => {
  const h = HOLES[0];
  const from = teeBall(h);
  const aim = heading(from, along(h, 60).at);
  const shot: ShotInput = { club: 'iron5', aim, power: 1, accuracy: 0 };
  const [fx, fz] = [Math.sin(aim), Math.cos(aim)];
  const fwd = (b: Ball) => (b.x - from.x) * fx + (b.z - from.z) * fz;
  // (right of the way it's aimed: facing +z the right is -x)
  const right = (b: Ball) => (b.x - from.x) * -fz + (b.z - from.z) * fx;
  const calm = strike(from, shot, still, null);
  const down = strike(from, shot, { dir: aim, speed: 4 }, null);
  const into = strike(from, shot, { dir: aim + Math.PI, speed: 4 }, null);
  assert.ok(down.carry > calm.carry && calm.carry > into.carry, `downwind ${down.carry.toFixed(1)}, calm ${calm.carry.toFixed(1)}, into ${into.carry.toFixed(1)}`);
  const slice = strike(from, { ...shot, accuracy: 1 }, still, null);
  const hook = strike(from, { ...shot, accuracy: -1 }, still, null);
  const landed = (r: ReturnType<typeof strike>) => r.path.find((p, i) => i > 0 && p.y <= golfLift(p.x, p.z) + 0.2) ?? r.at;
  assert.ok(right(landed(slice)) > 4, `a slice lands ${right(landed(slice)).toFixed(1)} right`);
  assert.ok(right(landed(hook)) < -4, `a hook lands ${right(landed(hook)).toFixed(1)} right`);
  assert.ok(Math.abs(right(landed(calm))) < 1);
  const over = strike(from, { ...shot, power: 1.1 }, still, null);
  assert.ok(fwd(over.at) > fwd(calm.at));
  // The same shot is the same every time
  assert.deepEqual(strike(from, shot, still, null).at, calm.at);
});

test('putting: a putt rolls about its length, drops when it is slow over the cup, skims it when it is fast', () => {
  for (const f of FURNITURE.slice(0, 6)) {
    const h = HOLES[f.n - 1];
    const pin = f.pin;
    // From 4 tiles out on the green, towards the pin
    const dir = Math.atan2(teeOf(h).at[0] - pin[0], teeOf(h).at[1] - pin[1]);
    const at: Pt = [pin[0] + Math.sin(dir) * 4, pin[1] + Math.cos(dir) * 4];
    assert.equal(surfaceAt(...at), 'green');
    const b = ball(at);
    // A putt's length: a quarter of full power rolls about a quarter of the most (the green's slope a little either way)
    const r = strike(b, { club: 'putter', aim: heading(b, pin) + Math.PI / 2, power: 0.25, accuracy: 0 }, still, null);
    const rolled = Math.hypot(r.at.x - b.x, r.at.z - b.z);
    assert.ok(Math.abs(rolled - 0.25 * PUTT_MAX) < 0.25 * PUTT_MAX * 0.5, `hole ${h.n}: a quarter putt rolls ${rolled.toFixed(1)}`);
    // The bot's putt from there drops; one hit as hard as it goes runs past
    const round = newRound([h.n - 1], 1);
    round.play.ball = b;
    round.wind = still;
    let holed = false;
    for (let k = 0; k < 3 && !holed; k++) holed = !!playShot(round, botShot(round, pinOf), pinOf)?.holed;
    assert.ok(holed, `hole ${h.n}: the bot can't hole a 4-tile putt in three`);
    const hard = strike(b, { club: 'putter', aim: heading(b, pin), power: 1, accuracy: 0 }, still, pin);
    assert.ok(!hard.holed, `hole ${h.n}: a full-power putt drops`);
  }
  assert.ok(CUP.r > 0.05 && CUP.r < 0.3);
});

test('the penalties: into the water is a stroke and a drop on dry land, out of bounds a stroke and the shot again', () => {
  // Every lake: from the grass beside it, a wedge into its middle lands in the water and drops the ball back on dry land
  for (const l of LAKES) {
    let found = false;
    for (let a = 0; a < Math.PI * 2 && !found; a += Math.PI / 8) {
      const reach = Math.max(l.r[0], l.r[1]) + 12;
      const at: Pt = [l.at[0] + Math.cos(a) * reach, l.at[1] + Math.sin(a) * reach];
      const s = surfaceAt(...at);
      if (!s || s === 'water' || s === 'bunker' || outOfBounds(...at)) continue;
      const b = ball(at);
      for (const power of [0.55, 0.65, 0.75, 0.85, 0.95]) {
        const r = strike(b, { club: 'sw', aim: heading(b, l.at), power, accuracy: 0 }, still, null);
        if (r.penalty !== 'water') continue;
        found = true;
        const d = r.drop!;
        assert.ok(lakeAt(l, ...d) > 1 && surfaceAt(...d) !== 'water' && surfaceAt(...d) !== 'bunker' && !outOfBounds(...d), `${l.name}: dropped at ${d.map((v) => v.toFixed(1))} (${surfaceAt(...d)})`);
        break;
      }
    }
    assert.ok(found, `nothing lands in ${l.name}`);
  }
  // dropBy() never leaves a ball in the water
  for (const l of LAKES) {
    const d = dropBy([l.at[0] + l.r[0] * 0.95, l.at[1]], [l.at[0] + l.r[0] + 30, l.at[1]]);
    assert.ok(!LAKES.some((k) => lakeAt(k, ...d) < 1));
  }
  // Out of bounds: a drive off the course from near its edge, played again from where it was (two strokes, the ball back)
  let out = false;
  for (let i = 0; i < COURSE.length && !out; i += 3) {
    const [p, q] = [COURSE[i], COURSE[(i + 1) % COURSE.length]];
    const mid: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const n = [-(q[1] - p[1]), q[0] - p[0]];
    const L = Math.hypot(n[0], n[1]) || 1;
    for (const sgn of [1, -1]) {
      const inPt: Pt = [mid[0] - (n[0] / L) * sgn * 12, mid[1] - (n[1] / L) * sgn * 12];
      if (!inCourse(...inPt) || surfaceAt(...inPt) === 'water') continue;
      const round = newRound([0], 3);
      round.wind = still;
      round.play.ball = ball(inPt);
      const before = { ...round.play.ball };
      const res = playShot(round, { club: 'driver', aim: Math.atan2((n[0] / L) * sgn, (n[1] / L) * sgn), power: 1, accuracy: 0 }, pinOf)!;
      if (res.penalty !== 'out') continue;
      out = true;
      assert.equal(round.play.strokes, 2);
      assert.deepEqual(round.play.ball, before);
      break;
    }
  }
  assert.ok(out, 'no drive goes out of bounds');
});

test('the trees: a low shot into the woods meets a tree', () => {
  const trees = golfTrees().filter((t) => inCourse(t.x, t.z));
  assert.ok(trees.length > 100);
  // A ball at a trunk's foot is in it; a ball well over the woods isn't
  const t0 = trees[0];
  assert.ok(inTree({ x: t0.x, y: golfLift(t0.x, t0.z) + 0.3, z: t0.z }));
  assert.ok(!inTree({ x: t0.x, y: golfLift(t0.x, t0.z) + 40, z: t0.z }));
  // A low punch at trees from a few tiles out: some meet one
  let hits = 0;
  for (const t of trees.slice(0, 60)) {
    const at: Pt = [t.x - 6, t.z];
    if (!inCourse(...at)) continue;
    const r = strike(ball(at), { club: 'iron5', aim: Math.PI / 2, power: 0.35, accuracy: 0 }, still, null);
    if (r.tree) hits++;
  }
  assert.ok(hits > 10, `only ${hits} punches meet a tree`);
});

test('a round: the card, a hole picked up at its most, the score against par, the same with the same seed', () => {
  const r = newRound([0, 1, 2], 5);
  assert.equal(r.card.length, 3);
  assert.equal(r.play.hole, 0);
  // A putt of nothing every time: picked up at MAX_STROKES, on to the next
  for (let k = 0; k < MAX_STROKES; k++) playShot(r, { club: 'putter', aim: 0, power: 0, accuracy: 0 }, pinOf);
  assert.equal(r.card[0], MAX_STROKES);
  assert.equal(r.at, 1);
  assert.equal(r.play.hole, 1);
  assert.equal(toPar(r), MAX_STROKES - HOLES[0].par);
  assert.ok(!roundOver(r));
  // The wind's the seed's
  assert.deepEqual(newRound([0], 9).wind, newRound([0], 9).wind);
  assert.notDeepEqual(newRound([0], 9).wind, newRound([0], 10).wind);
  // A whole round by the bot, twice from one seed: the same card
  const play = (seed: number) => {
    const g = newRound([4, 5], seed);
    while (!roundOver(g)) playShot(g, botShot(g, pinOf), pinOf);
    return g.card;
  };
  assert.deepEqual(play(11), play(11));
});

test('every hole is playable: the bot plays all eighteen within par plus two a hole, a mishitting golfer round about par', () => {
  for (const seed of [1, 2]) {
    const r = newRound([...Array(18).keys()], seed);
    let n = 0;
    while (!roundOver(r) && n++ < 300) {
      const res = playShot(r, botShot(r, pinOf), pinOf)!;
      if (res.drop) assert.ok(!LAKES.some((k) => lakeAt(k, ...res.drop!) < 1), 'a drop in the water');
    }
    assert.ok(roundOver(r), `seed ${seed}: the round never ends`);
    r.card.forEach((s, i) => assert.ok(s! <= HOLES[i].par + 2, `seed ${seed}: hole ${i + 1} took ${s} (par ${HOLES[i].par})`));
    assert.ok(toPar(r) <= 0, `seed ${seed}: the bot goes round in ${toPar(r)} over par`);
  }
  // A golfer who mishits a little (a wobble on the aim, the power and the strike, seeded): round about par, nothing picked up
  for (const seed of [3, 4]) {
    const r = newRound([...Array(18).keys()], seed);
    const wob = rng(seed * 99);
    let n = 0;
    while (!roundOver(r) && n++ < 400) {
      const s = botShot(r, pinOf);
      const putt = s.club === 'putter';
      playShot(r, { ...s, aim: s.aim + (wob() - 0.5) * (putt ? 0.06 : 0.08), power: s.power * (1 + (wob() - 0.5) * (putt ? 0.16 : 0.12)), accuracy: putt ? 0 : (wob() - 0.5) * 0.5 }, pinOf);
    }
    assert.ok(roundOver(r));
    assert.ok(Math.abs(toPar(r)) <= 14, `seed ${seed}: a mishitting golfer goes round ${toPar(r)} against par`);
    assert.ok(r.card.every((s) => s! < MAX_STROKES), `seed ${seed}: a hole picked up: ${r.card}`);
  }
});

test("the touch pull-back: its length the power (past full to the meter's top), its lean the accuracy as a slingshot", () => {
  const full = 200;
  assert.deepEqual(pullShot(0, 100, full), { power: 0.5, accuracy: 0 });
  assert.equal(pullShot(0, 200, full).power, 1);
  assert.equal(pullShot(0, 900, full).power, METER.top, "no further than the meter's top");
  assert.equal(pullShot(0, -40, full).power, 0, 'pushed up is no swing');
  // (a sliver off straight down is straight; leaning right a hook (negative), left a slice, a full one at PULL.lean)
  assert.equal(pullShot(3, 150, full).accuracy, 0);
  assert.ok(pullShot(30, 150, full).accuracy < 0);
  assert.ok(pullShot(-30, 150, full).accuracy > 0);
  const d = 150 * Math.tan(PULL.lean * 1.2);
  assert.equal(pullShot(d, 150, full).accuracy, -1);
  assert.equal(pullShot(-d, 150, full).accuracy, 1);
  // (the full length a share of the screen, between its least and most)
  assert.ok(PULL.min < PULL.max && PULL.least < PULL.min);
});
