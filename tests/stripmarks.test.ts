// The Neon Mile's landmarks (stripmarks.ts, docs/strip-plan.md Phase 3): the welcome sign in the boulevard's median
// clear of its palms and lanes; the fountain show's jets in the Gondolier's lake, a show of six movements every few
// minutes, the lake still between, every jet within its height; the volcano on the lagoon's islet erupting on its
// timetable and rumbling only near it; the Sphere on its lot, a place you walk in at facing its doors; the
// searchlights on roofs; all of it under every flight.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ERUPT,
  ERUPT_STILL,
  JETS,
  JET_MAX,
  MARK_SOLIDS,
  MARKS_TALLEST,
  SEARCHLIGHTS,
  SHOW,
  SHOW_STILL,
  SPHERE,
  SPHERE_DOOR,
  SPHERE_SPAWN,
  SPHERE_TOP,
  VOLCANO,
  WELCOME,
  WELCOME_SOLIDS,
  WELCOME_TOP,
  eruptionAt,
  jetHeights,
  showAt,
  volcanoRumble,
} from '../src/scripts/city3d/stripmarks';
import { RESORTS, SPHERE_LOT, resortOf } from '../src/scripts/city3d/resorts';
import { BLVD_WEST } from '../src/scripts/city3d/strip';
import { STRIP_BLVD, STRIP_EAST_X } from '../src/scripts/city3d/layout';
import { PLAN, onSlab } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';
import { FLIGHTS, PERIOD, REACH, poseAt } from '../src/scripts/city3d/airfield';

test('the welcome sign stands in the median by its west end, between its palms, clear of the lanes', () => {
  const half = STRIP_BLVD.median / 2;
  assert.ok(WELCOME.x > BLVD_WEST + 9 + 2 && WELCOME.x < BLVD_WEST + 25, 'by the west end, past the median\'s nose');
  for (const z of WELCOME.posts) assert.ok(Math.abs(z - STRIP_BLVD.z) + WELCOME.post < half - 0.2, 'its posts on the median');
  for (const b of WELCOME_SOLIDS) assert.ok(MARK_SOLIDS.includes(b) && Math.abs((b[1] + b[3]) / 2 - STRIP_BLVD.z) < half - 0.3);
  assert.ok(WELCOME.w / 2 < half, 'its diamond no wider than the median');
  // (strip3d.ts's palms every 7 from 3 past the median's nose)
  for (let x = BLVD_WEST + 9 + 3; x < STRIP_EAST_X - 9; x += 7) assert.ok(Math.abs(x - WELCOME.x) > 1.5, `a palm at ${x}`);
  assert.ok(WELCOME_TOP < 12);
});

test('the jets stand in the lake, a show every few minutes, still between, each within its height', () => {
  const lake = resortOf('gondolier')!.water[0];
  assert.ok(JETS.length > 40);
  assert.equal(JETS.filter((j) => j.kind === 'shooter').length, 5);
  for (const j of JETS) assert.ok(j.x > lake[0] + 0.5 && j.x < lake[2] - 0.5 && j.z > lake[1] + 0.5 && j.z < lake[3] - 0.5, `a jet at ${j.x}, ${j.z}`);
  let shows = 0;
  let was = -1;
  for (let t = 0; t < SHOW.period * 3; t += 0.5) {
    const s = showAt(t);
    if (s >= 0 && was < 0) shows++;
    was = s;
    const h = jetHeights(s);
    JETS.forEach((j, i) => assert.ok(h[i] >= 0 && h[i] <= JET_MAX[j.kind] + 1e-9, `jet ${i} at ${h[i]}`));
    if (s < 0) assert.ok(h.every((v) => v === 0), 'still between shows');
  }
  assert.equal(shows, 3);
  assert.ok(SHOW.length === SHOW.move * 6);
  // Every movement moves the water, and the shooters fly in the show
  const peak = (a: number, b: number, kind: string) => {
    let m = 0;
    for (let s = a; s < b; s += 0.25) jetHeights(s).forEach((v, i) => JETS[i].kind === kind && (m = Math.max(m, v)));
    return m;
  };
  for (let k = 0; k < 6; k++) assert.ok(peak(k * SHOW.move + 0.5, (k + 1) * SHOW.move, 'row') > 1, `movement ${k}`);
  assert.ok(peak(0, SHOW.length, 'shooter') > JET_MAX.shooter * 0.9);
  // The still frame is mid-show and lively
  assert.ok(Math.max(...jetHeights(SHOW_STILL)) > 3);
  // The same for everyone: a function of the clock alone
  assert.deepEqual(Array.from(jetHeights(showAt(1e9 + 20))), Array.from(jetHeights(showAt(1e9 + 20))));
});

test('the volcano on its islet in the lagoon erupts on its timetable, embers between, rumbling only near it', () => {
  const lagoon = resortOf('lagoon')!.water[0];
  const [x, z] = VOLCANO.at;
  assert.ok(x - VOLCANO.r0 > lagoon[0] + 0.5 && x + VOLCANO.r0 < lagoon[2] - 0.5 && z - VOLCANO.r0 > lagoon[1] + 0.5 && z + VOLCANO.r0 < lagoon[3] - 0.5, 'in the lagoon');
  assert.ok(VOLCANO.h < 6);
  let bursts = 0;
  let was = 0;
  for (let t = 0; t < ERUPT.period * 2; t += 0.25) {
    const e = eruptionAt(t);
    assert.ok(e.glow > 0 && e.glow <= 1 && e.flames >= 0 && e.flames <= 1);
    if (e.s < 0) assert.equal(e.flames, 0);
    if (e.flames > 0.9 && was <= 0.9) bursts++;
    was = e.flames;
  }
  assert.equal(bursts, 2);
  assert.ok(eruptionAt(ERUPT.offset + ERUPT_STILL).flames > 0.9, 'the still frame mid-eruption');
  const mid = ERUPT.offset + 10;
  assert.ok(volcanoRumble(x, z, mid) > 0.8);
  assert.ok(volcanoRumble(x + 200, z, mid) === 0);
  assert.ok(volcanoRumble(x, z, ERUPT.offset + ERUPT.length + 5) === 0, 'quiet between');
});

test('the Sphere on its lot: about 20 across on its plinth, a place you walk in at facing its doors', () => {
  const [x0, z0, x1, z1] = SPHERE_LOT;
  const [x, z] = SPHERE.at;
  assert.ok(SPHERE.r * 2 >= 17 && SPHERE.r * 2 <= 22);
  assert.ok(x - SPHERE.r >= x0 && x + SPHERE.r <= x1 && z - SPHERE.r >= z0 && z + SPHERE.r <= z1, 'on its lot');
  assert.ok(SPHERE.y - SPHERE.r > 0.5 && SPHERE.y - SPHERE.r < SPHERE.plinth.h + 0.2, 'on its plinth');
  for (const r of RESORTS) assert.ok(r.land[2] <= x0 || r.land[0] >= x1 || r.land[3] <= z0 || r.land[1] >= z1, `over ${r.id}'s land`);
  const p = PLACES.find((q) => q.id === 'sphere')!;
  assert.ok(p && p.spot === 'sphere' && LIVE_PLACES.some((q) => q.id === 'sphere'));
  assert.deepEqual(p.at, SPHERE_SPAWN);
  assert.ok(onSlab(PLAN, [SPHERE_SPAWN.x, SPHERE_SPAWN.z]));
  for (const b of SOLIDS) {
    assert.ok(!(SPHERE_SPAWN.x > b[0] - 0.4 && SPHERE_SPAWN.x < b[2] + 0.4 && SPHERE_SPAWN.z > b[1] - 0.4 && SPHERE_SPAWN.z < b[3] + 0.4), `the spawn in ${b}`);
    assert.ok(!(SPHERE_DOOR.x > b[0] && SPHERE_DOOR.x < b[2] && SPHERE_DOOR.z > b[1] && SPHERE_DOOR.z < b[3]), `the door in ${b}`);
  }
  const [fx, fz] = [-Math.sin(SPHERE_SPAWN.yaw), -Math.cos(SPHERE_SPAWN.yaw)];
  const [dx, dz] = [SPHERE_DOOR.x - SPHERE_SPAWN.x, SPHERE_DOOR.z - SPHERE_SPAWN.z];
  assert.ok((fx * dx + fz * dz) / Math.hypot(dx, dz) > 0.9, 'facing its doors');
});

test('the searchlights on roofs and the plaza, the solids in SOLIDS, all of it under every flight', () => {
  assert.ok(SEARCHLIGHTS.length >= 10);
  for (const [x, , z] of SEARCHLIGHTS) assert.ok(onSlab(PLAN, [x, z]), `a searchlight off the lots at ${x}, ${z}`);
  for (const b of MARK_SOLIDS) assert.ok(SOLIDS.includes(b));
  assert.equal(MARKS_TALLEST, SPHERE_TOP);
  const land: [number, number, number, number][] = [SPHERE_LOT, [WELCOME.x - 2, WELCOME.z - 2, WELCOME.x + 2, WELCOME.z + 2]];
  for (let t = 0; t < PERIOD; t += 0.25)
    for (const f of FLIGHTS) {
      const p = poseAt(f, t);
      for (const [x0, z0, x1, z1] of land) {
        const d = Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1));
        if (d < REACH[f.kind] + 4) assert.ok(p.y > MARKS_TALLEST + 4, `${f.id} over the Strip's landmarks at t ${t}`);
      }
    }
});
