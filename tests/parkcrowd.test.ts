// Westlake Park's people who come with its chunk (parkcrowd.ts, docs/westlake-plan.md Phase 7): the band at the
// bandstand some evenings and its listeners, the Lakehouse Café's diners and waiter by day, the woodland walk's
// walkers, joggers and dogs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAND, BAND_FLOOR, BAND_HOURS, DINERS, RAMBLE_DOGS, RAMBLE_PEOPLE, WAITER_STOPS, bandDay, bandOn, bandPeople, cafeOpen, chairsOf, listeners, waiter } from '../src/scripts/city3d/parkcrowd';
import { CAFE_TABLES } from '../src/scripts/city3d/parkstands';
import { BANDSTAND, LAKEHOUSE, inLake, inPark, onCafeDeck, onPath } from '../src/scripts/city3d/westlake';
import { moment } from '../src/scripts/city3d/parklife';
import { SEATED, secondsOf, type CrowdClip } from '../src/scripts/city3d/crowdclips';

test('the band plays five evenings in seven, every week, from 6 to 9:30 pm', () => {
  for (let week = 2900; week < 2960; week++) {
    const on = Array.from({ length: 7 }, (_, d) => bandDay(week * 7 + d)).filter(Boolean).length;
    assert.equal(on, BAND_HOURS.days, `week ${week}`);
  }
  const day = Array.from({ length: 7 }, (_, d) => 20300 + d).find(bandDay)!;
  assert.ok(bandOn(day, 18.5) && bandOn(day, 21.2));
  assert.ok(!bandOn(day, 17.9) && !bandOn(day, 21.6) && !bandOn(day, 13));
  const off = Array.from({ length: 7 }, (_, d) => 20300 + d).find((d) => !bandDay(d))!;
  assert.ok(!bandOn(off, 19));
});

test('the band: six seated players inside the bandstand, apart, facing the benches; there only while it plays', () => {
  assert.equal(BAND.length, 6);
  for (const s of BAND) assert.ok(Math.hypot(s.x - BANDSTAND.c[0], s.z - BANDSTAND.c[1]) < BANDSTAND.r - 0.6, 'inside its railing');
  for (let i = 0; i < BAND.length; i++) for (let j = i + 1; j < BAND.length; j++) assert.ok(Math.hypot(BAND[i].x - BAND[j].x, BAND[i].z - BAND[j].z) > 0.9, 'room for each');
  // (facing north, the benches' side: the way they face points to -z)
  for (const s of BAND) assert.ok(Math.cos(s.ry) < -0.9);
  const day = [20300, 20301, 20302].find(bandDay)!;
  const players = bandPeople(() => day);
  for (const p of players) {
    assert.ok(SEATED.has(p.act as CrowdClip), 'seated');
    assert.ok(p.y! > BAND_FLOOR, 'on a chair on its floor');
    assert.ok(p.when!(19) && !p.when!(12));
  }
  assert.deepEqual(players.map((p) => p.act).sort(), ['brass', 'brass', 'brass', 'brass', 'brass', 'drum']);
  assert.ok(secondsOf('brass') > 0 && secondsOf('drum') > 0);
});

test('its listeners: two to a bench round it, facing it, there while it plays', () => {
  const day = [20300, 20301, 20302].find(bandDay)!;
  const ls = listeners(() => day);
  assert.equal(ls.length, 16);
  for (const l of ls) {
    const d = Math.hypot(l.x - BANDSTAND.c[0], l.z - BANDSTAND.c[1]);
    assert.ok(d > 5.5 && d < 7, 'on the ring of benches');
    // (facing the bandstand)
    const [fx, fz] = [Math.sin(l.ry), Math.cos(l.ry)];
    assert.ok((fx * (BANDSTAND.c[0] - l.x) + fz * (BANDSTAND.c[1] - l.z)) / d > 0.95);
    assert.ok(l.when!(20) && !l.when!(10));
  }
});

test("the café's diners: at its tables' chairs, facing the table, eating while it's open", () => {
  assert.ok(DINERS.length >= 10);
  for (const d of DINERS) {
    const t = CAFE_TABLES.reduce((a, b) => (Math.hypot(b[0] - d.x, b[1] - d.z) < Math.hypot(a[0] - d.x, a[1] - d.z) ? b : a));
    const r = Math.hypot(t[0] - d.x, t[1] - d.z);
    assert.ok(r > 0.5 && r < 0.65, 'at a chair');
    assert.ok(chairsOf(t).some(([x, z]) => Math.hypot(x - d.x, z - d.z) < 0.06));
    const [fx, fz] = [Math.sin(d.ry), Math.cos(d.ry)];
    assert.ok((fx * (t[0] - d.x) + fz * (t[1] - d.z)) / r > 0.99, 'facing the table');
    assert.equal(d.act, 'eat');
    assert.ok(d.when!(12) && !d.when!(20) && !d.when!(7));
    assert.ok(Math.abs(d.y! - (0.15 + (onCafeDeck(t[0], t[1]) ? LAKEHOUSE.deckY : 0) + 0.46)) < 1e-9, "on the chair's seat");
  }
  assert.ok(cafeOpen(8) && cafeOpen(17.9) && !cafeOpen(18) && !cafeOpen(23));
  // (every chair clear of the pavilion's plinth and of its door)
  const [x0, z0, x1, z1] = LAKEHOUSE.rect;
  for (const t of CAFE_TABLES)
    for (const [x, z] of chairsOf(t)) assert.ok(!(x > x0 - 0.45 && x < x1 + 0.45 && z > z0 - 0.45 && z < z1 + 0.45), `a chair in the pavilion at ${x.toFixed(2)}, ${z.toFixed(2)}`);
  for (const t of CAFE_TABLES) assert.ok(Math.hypot(t[0] - (x0 - 0.4), t[1] - (z0 + z1) / 2) > 2, 'the door clear');
});

test('the waiter: round the tables from the door while the café is open, never in the water; gone when it is shut', () => {
  let hour = 12;
  const w = waiter(() => hour);
  const m = moment();
  const clips = new Set<string>();
  for (let t = 0; t < 400; t += 0.37) {
    w.at(t, m);
    clips.add(m.clip);
    assert.ok(inPark([m.x, m.z], 0) && (!inLake(m.x, m.z, 0.2) || onCafeDeck(m.x, m.z)), `in the water at ${m.x.toFixed(1)}, ${m.z.toFixed(1)}`);
    for (const t2 of CAFE_TABLES) assert.ok(Math.hypot(t2[0] - m.x, t2[1] - m.z) > 0.6, 'not through a table');
  }
  assert.deepEqual([...clips].sort(), ['idle', 'serve', 'walk']);
  assert.ok(WAITER_STOPS.length >= 5);
  hour = 20;
  w.at(10, m);
  assert.ok(m.x < -1e4);
});

test('the woodland walk: walkers, joggers and dogs along the ramble paths, on them, out of the water', () => {
  assert.ok(RAMBLE_PEOPLE.length >= 10 && RAMBLE_DOGS.length >= 3);
  const m = moment();
  for (const p of RAMBLE_PEOPLE)
    for (let t = 0; t < 600; t += 7.3) {
      p.at(t, m);
      assert.ok(onPath([m.x, m.z], 0.05), `${p.id} off the paths at ${m.x.toFixed(1)}, ${m.z.toFixed(1)}`);
      assert.ok(!inLake(m.x, m.z, 0.5));
    }
  const d = { x: 0, z: 0, ry: 0, speed: 0 };
  for (const g of RAMBLE_DOGS) {
    assert.ok(RAMBLE_PEOPLE.includes(g.person));
    for (let t = 0; t < 300; t += 5.1) {
      g.at(t, d);
      g.person.at(t, m);
      assert.ok(Math.hypot(d.x - m.x, d.z - m.z) < 1.6, 'on its lead');
      assert.ok(inPark([d.x, d.z], 0));
    }
  }
});
