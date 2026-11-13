// The live lines (livelines.ts, the polish plan's Phase 7): one short line a coming-soon place from the visitor's
// clock and the place's own timetable; made-up, fixed copy, never a price; the bouncer's lines at Club PULSE's door.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOUNCER_LINES, DJS, LIVE_IDS, SUNSET, bouncerLine, highWater, liveLine, mmss, nextLift, pierSailing } from '../src/scripts/city3d/livelines';
import { fixtureAt, matchOn } from '../src/scripts/city3d/stadium';
import { ERUPT, SHOW, eruptionAt, showAt } from '../src/scripts/city3d/stripmarks';
import { LIFT_TIMES, SHIP_TIMES, leavesAt } from '../src/scripts/city3d/liberty';
import { BUS } from '../src/scripts/city3d/riverbus';
import { busS } from '../src/scripts/city3d/riverroute';
import { PLACES } from '../src/scripts/city3d/places';

// (local times: 2026-11-09 is a Monday)
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();
const HOURS = [0, 3, 6.5, 9, 11.5, 13, 15.5, 17.5, 18.5, 20, 21.5, 23];

test('every place with a line has one at every hour: short, plain, never money', () => {
  for (const id of LIVE_IDS) {
    assert.ok(PLACES.some((p) => p.spot === id), `${id} is a place`);
    for (let d = 9; d <= 15; d++)
      for (const h of HOURS) {
        const line = liveLine(id, at(d, Math.floor(h), (h % 1) * 60));
        assert.ok(line && line.length > 8 && line.length <= 64, `${id} at ${h}: ${line}`);
        assert.ok(!/[$£€]|dorra|\d{4}|\d,\d/i.test(line), `${id} reads as money: ${line}`);
        assert.ok(line.split(/\s+/).length <= 11, `${id} too long: ${line}`);
      }
  }
  // (Degen's house: its day, and its lights on after dusk)
  assert.equal(liveLine('home', at(9, 8)), 'Kettle on · Car on the drive');
  assert.equal(liveLine('home', at(9, 21)), 'Lights on · Telly on low');
  assert.equal(liveLine('home', at(9, 3)), 'Lights out · Garage locked');
  assert.equal(liveLine('emporium'), null, 'a place with a game has none');
  assert.equal(liveLine('nowhere'), null);
});

test('the stadium: the next fixture and its kick-off, tonight on the day, match on while it plays', () => {
  const mon = liveLine('stadium', at(9, 12))!;
  const f = fixtureAt(at(9, 12));
  assert.match(mon, /^Next: Sector 7 FC v [A-Z][a-z]+ [A-Z][a-z]+ · Wed 7:30 pm$/);
  assert.ok(mon.toLowerCase().includes(f.away.toLowerCase()));
  assert.match(liveLine('stadium', at(11, 12))!, /^Tonight · Sector 7 FC v .* · 7:30 pm$/);
  assert.match(liveLine('stadium', at(11, 20))!, /^Match on · Sector 7 FC v /);
  assert.ok(matchOn(at(11, 20)));
  assert.match(liveLine('stadium', at(11, 22))!, /· Sat 7:30 pm$/);
});

test("the club's set by the night and the hour, the bar's happy hour, the mall's and the court's hours", () => {
  const dj = DJS.map((d) => d.toLowerCase().replace(/^dj /, ''));
  const late = liveLine('club', at(10, 23))!;
  assert.match(late, /on now · Guest list only$/);
  assert.ok(dj.some((d) => late.toLowerCase().includes(d)));
  assert.match(liveLine('club', at(10, 20, 30))!, /^Doors at ten · /);
  assert.match(liveLine('club', at(10, 14))!, /^Opens at ten · Tonight: /);
  assert.notEqual(liveLine('club', at(10, 14)), liveLine('club', at(11, 14)), 'a different set each night');
  assert.equal(liveLine('bar', at(10, 17, 30)), 'Happy hour till seven · Snacks at the door');
  assert.equal(liveLine('bar', at(10, 12)), 'Open · Happy hour at five');
  assert.equal(liveLine('bar', at(10, 1)), 'Open late · Snacks at the door');
  assert.equal(liveLine('bar', at(10, 5)), 'Opens at eleven');
  assert.equal(liveLine('mall', at(10, 12)), 'Open till nine · Food court on the terrace');
  assert.equal(liveLine('mall', at(10, 22)), 'Doors open at nine');
  assert.match(liveLine('palmcourt', at(10, 12))!, /^Shops till nine · Tonight's film: [A-Z]/);
  assert.match(liveLine('palmcourt', at(10, 22))!, /^Late film on · /);
  assert.equal(liveLine('nightmarket', at(10, 12)), 'Opens at dusk · Lanterns lit at six');
  assert.equal(liveLine('nightmarket', at(10, 20)), 'Stalls open · Hot food till midnight');
  assert.equal(liveLine('trenches', at(10, 16)), 'Pick-up game on · Everyone plays');
  assert.equal(liveLine('trenches', at(10, 10)), 'Court quiet · Kids out after three');
  assert.equal(liveLine('trenches', at(14, 11)), 'Pick-up game on · Everyone plays', 'a weekend morning');
  assert.equal(liveLine('sunschool', at(10, 10)), 'In class till three');
  assert.equal(liveLine('sunschool', at(14, 10)), 'No school today · Playground open');
  assert.match(liveLine('civichall', at(10, 12))!, /^Council sits today/, 'a Tuesday');
  assert.match(liveLine('civichall', at(11, 12))!, /^Open till five/);
  assert.equal(liveLine('cityhall', at(10, 12)), 'Doors open till five · Permits upstairs');
  assert.equal(liveLine('cityhall', at(12, 19)), 'The council sits tonight · Gallery full', 'a Thursday evening');
  assert.equal(liveLine('cityhall', at(14, 12)), 'Doors shut · Open weekdays at nine', 'a Saturday');
  assert.equal(liveLine('police', at(10, 12)), 'Front desk open · Patrols out');
  assert.equal(liveLine('police', at(10, 23)), 'Night shift on · Front desk open');
  assert.equal(liveLine('courthouse', at(11, 10)), 'Court in session till four');
  assert.equal(liveLine('courthouse', at(9, 10)), 'Court in session · New week, full list', 'a Monday');
  assert.equal(liveLine('courthouse', at(14, 10)), 'Court rises · Sits weekdays at nine', 'a Saturday');
});

test("the Neon Mile's timetables: the fountain show and the volcano count down and announce themselves", () => {
  // (the show's clock is seconds, the same for everyone: pick moments of it)
  const t0 = 1_800_000_000; // a clock in seconds whose show phase is 0
  const base = (t0 - (t0 % SHOW.period)) * 1000;
  assert.ok(showAt(base / 1000) >= 0);
  assert.match(liveLine('gondolier', base + 10_000)!, /^Fountain show on · Ends in \d:\d\d$/);
  const between = base + (SHOW.length + 20) * 1000;
  assert.ok(showAt(between / 1000) < 0);
  const line = liveLine('gondolier', between)!;
  assert.match(line, /^Next fountain show in \d:\d\d$/);
  assert.equal(line, `Next fountain show in ${mmss(SHOW.period - SHOW.length - 20)}`);
  const quiet = (ERUPT.offset + ERUPT.length + 5) * 1000;
  assert.ok(eruptionAt(quiet / 1000).s < 0);
  assert.equal(liveLine('lagoon', quiet), `Volcano erupts in ${mmss(ERUPT.period - ERUPT.length - 5)}`);
  assert.equal(liveLine('lagoon', (ERUPT.offset + 10) * 1000), "The volcano's erupting · Stand back");
});

test("the ferry hall's next sailing from the river bus's timetable, Liberty's next lift from the tall ship's, the tide", () => {
  for (let t = 0; t < 600; t += 7) {
    const b = pierSailing(t);
    assert.ok(b.wait >= 0 && b.wait < 400, `a sailing within the loop at ${t}: ${b.wait}`);
    // A boat waiting at Pier 7 is the one leaving soon
    const waiting = [0, 1].some((i) => busS(i, t).at === 'pier7');
    assert.equal(b.here, waiting, `at ${t}`);
    if (waiting) assert.ok(b.wait <= BUS.dwell);
  }
  assert.match(liveLine('pier', 0)!, /^(Next river bus in \d:\d\d|River bus at the landing · Leaving soon)$/);
  for (let t = 0; t < SHIP_TIMES.period; t += 3) {
    const w = nextLift(t);
    assert.ok(w >= 0 && w < SHIP_TIMES.period / 2 + 1, `a lift within the half at ${t}`);
    if (leavesAt(t).shut) assert.equal(w, 0);
    // What it counts down to is the gates shutting
    else if (w > 0.5) assert.ok(leavesAt(t + w + 0.1).shut && !leavesAt(t + w - 0.1).shut, `the lift at ${t} + ${w}`);
  }
  assert.ok(LIFT_TIMES.warn > 0);
  assert.match(liveLine('liberty', 0)!, /^(Leaves lift in \d:\d\d · Tall ship due|Leaves up for the tall ship · Mind the gates)$/);
  const hw = highWater(1000);
  assert.ok(hw.wait >= 0 && hw.wait < 12.5 * 3600);
  assert.match(hw.at, /^\d{1,2}(:\d\d)? [ap]m$/);
  assert.match(liveLine('harbourmaster', at(10, 10))!, /^ORCA STAR alongside · High water (now|at \d{1,2}(:\d\d)? [ap]m)$/);
});

test('the viewpoints read the sunset by the month; the bouncer has a few short lines, the set after dark', () => {
  assert.equal(SUNSET.length, 12);
  assert.match(liveLine('overlook', at(10, 12))!, /^Sunset about 5 pm · /);
  assert.equal(liveLine('overlook', at(10, 21)), 'City lights below · Stars over the hills');
  assert.match(liveLine('tower', at(10, 12))!, /^Sky deck open · Sunset about /);
  for (let k = 0; k < BOUNCER_LINES.length; k++) {
    const line = bouncerLine(at(10, 14, k));
    assert.ok(BOUNCER_LINES.includes(line) && line.length <= 40, line);
  }
  assert.ok(new Set(BOUNCER_LINES.map((_, k) => bouncerLine(at(10, 14, k)))).size === BOUNCER_LINES.length, 'in turn by the minute');
  assert.match(bouncerLine(at(10, 23))!, / · [A-Z].* on now$/);
  assert.equal(mmss(100), '1:40');
  assert.equal(mmss(0), '0:00');
});
