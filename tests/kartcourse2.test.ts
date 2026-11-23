// Riverside Raceway raced (kartcourse2.ts, kart-track.ts; docs/kart-harbour-plan.md Phase 3): its two courses in the
// sim's shape, the tunnel and its cuttings walled, the par driver round clean both ways at every class, a full field
// racing it, the items mode's boxes, the race camera's room, the ground off a race, the save keeping its records.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOXES2, CAM2_GAP, F_CUT, RESET2_AT, RIVER_COURSES, camRoom2, enclosed2, groundAt2, riversideSurfaceAt } from '../src/scripts/city3d/kartcourse2';
import { RIVER_TRACK, TODAY_TRACK, courseOf, isRiverside, trackOf } from '../src/scripts/city3d/kart-track';
import { COURSE2_IDS, COURSES2, CIRCUIT2, KERB2, LAPS2, SITE2, TRACK2_HALF, TUNNEL_CLEAR } from '../src/scripts/city3d/kartcircuit2';
import { TUNNEL2, kart2GroundAt } from '../src/scripts/city3d/kartpark2';
import { COURSES, RIVER_COURSE_IDS } from '../src/scripts/city3d/kartcircuit';
import { F, frame } from '../src/scripts/city3d/kartpark';
import { NO_INPUT, createKartSim, tune } from '../src/scripts/city3d/kart-sim';
import { KART_SPECS, PLAYER_KARTS } from '../src/scripts/city3d/mykart';
import { CLASS_IDS, PAR_LAPS } from '../src/scripts/city3d/catalog';
import { cleanSave, newSave } from '../src/scripts/city3d/tycoon';

test("both ways in the sim's shape: the same surface, the line, the corners, the tunnel and its cuttings walled", () => {
  assert.deepEqual(RIVER_COURSE_IDS, COURSE2_IDS);
  for (const id of COURSE2_IDS) {
    const c = RIVER_COURSES[id];
    assert.equal(courseOf(id), c);
    assert.equal(trackOf(id), RIVER_TRACK);
    assert.ok(isRiverside(id));
    assert.equal(c.L, COURSES2[id].L);
    assert.equal(c.laps, LAPS2);
    assert.equal(c.jump, -1);
    assert.equal(c.turns.length, COURSES2[id].turns.length);
    const n = c.x.length;
    let tunnel = 0;
    let cut = 0;
    for (let i = 0; i < n; i++) {
      assert.ok(Math.abs(Math.hypot(c.tx[i], c.tz[i]) - 1) < 1e-9);
      if (c.flags[i] & F_CUT) cut++;
      else if (c.flags[i] & F.tunnel) tunnel++;
    }
    assert.equal(tunnel, TUNNEL2.samples.length, 'the tunnel flagged');
    assert.ok(cut > 4, 'cuttings to its mouths');
  }
  // (today's course and track untouched)
  assert.equal(courseOf('circuit'), COURSES.circuit);
  assert.equal(trackOf('circuit-reverse'), TODAY_TRACK);
  assert.ok(!isRiverside('circuit'));
});

test("the ground across the track: the road's own height on the asphalt and kerbs, the park's ground on the run-off", () => {
  const c = RIVER_COURSES.riverside;
  for (let s = 0; s < c.L; s += 7) {
    const f = frame(c, s);
    assert.ok(Math.abs(groundAt2(f, 0) - f.y) < 1e-9);
    assert.ok(Math.abs(groundAt2(f, TRACK2_HALF + KERB2) - f.y) < 1e-9);
    if (!enclosed2(f)) {
      const lat = TRACK2_HALF + KERB2 + 2;
      assert.ok(Math.abs(groundAt2(f, lat) - kart2GroundAt(f.x + f.nx * lat, f.z + f.nz * lat)) < 1e-9);
    }
  }
  assert.ok(RESET2_AT > TRACK2_HALF + KERB2 + 1.5);
});

const solo = (course: 'riverside' | 'riverside-reverse', cls: (typeof CLASS_IDS)[number], cond: 'day' | 'rain') =>
  createKartSim({ course, cup: 'time', cls, cond, player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, cls) }, rivals: [], seed: 1, auto: true, laps: 2 });

test('the par driver runs both ways at every class, dry and wet, clean, each lap within a little of par', () => {
  for (const id of COURSE2_IDS)
    for (const cls of CLASS_IDS)
      for (const cond of ['day', 'rain'] as const) {
        const sim = solo(id, cls, cond);
        const laps: number[] = [];
        let last = 0;
        for (let t = 0; t < 400 && !sim.done; t += 1 / 60)
          for (const e of sim.step(1 / 60, NO_INPUT)) {
            if ((e.kind === 'lap' || e.kind === 'finish') && e.kart === sim.player.i) {
              laps.push(sim.time - last);
              last = sim.time;
            }
            assert.notEqual(e.kind, 'reset', `${id} ${cls} ${cond}: put back`);
            assert.ok(!(e.kind === 'offtrack' && e.on), `${id} ${cls} ${cond}: into the run-off`);
          }
        assert.ok(sim.done, `${id} ${cls} ${cond} finished`);
        assert.equal(sim.player.cleanLaps, 2);
        const best = Math.min(...laps);
        const par = PAR_LAPS[id][cls];
        if (cond === 'day') assert.ok(best <= par && best > par - 2.5, `${id} ${cls}: ${best.toFixed(1)} vs par ${par}`);
        else assert.ok(best > par - 1, `${id} ${cls}: slower in the rain (${best.toFixed(1)})`);
      }
});

test('a full field: eight karts round three laps, on the ground or the hill, never under it, rarely off', () => {
  const rivals = PLAYER_KARTS.flatMap((k) => [k, k]).slice(0, 7).map((k) => ({ kart: k, tune: tune(KART_SPECS[k], 'sport') }));
  for (const course of COURSE2_IDS) {
    const sim = createKartSim({ course, cup: 'rookie', laps: 3, player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, 'sport') }, rivals, seed: 3, auto: true });
    const counts: Record<string, number> = {};
    for (let t = 0; t < 900 && !sim.over; t += 1 / 60) {
      for (const e of sim.step(1 / 60, NO_INPUT)) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
      for (const k of sim.racers) {
        assert.ok(Number.isFinite(k.x) && Number.isFinite(k.y));
        assert.ok(k.y > -0.05 && k.y < CIRCUIT2.y.reduce((a, b) => Math.max(a, b)) + 0.6, `${course}: at height ${k.y.toFixed(2)}`);
        assert.ok(Math.abs(k.lateral) <= RESET2_AT + 1);
      }
    }
    assert.ok(sim.over, `${course}: everyone finished`);
    assert.equal(counts.finish, 8);
    assert.ok((counts.reset ?? 0) <= 2, `${course}: put back ${counts.reset} times`);
    assert.ok((counts.overtake ?? 0) > 0);
  }
});

test("the items mode's boxes: three rows across the forward course, on the track, clear of the tunnel; taken in a race", () => {
  assert.equal(BOXES2.length, 12);
  const c = RIVER_COURSES.riverside;
  for (const b of BOXES2) {
    let near = Infinity;
    let flags = 0;
    for (let i = 0; i < c.x.length; i++) {
      const d = Math.hypot(c.x[i] - b.x, c.z[i] - b.z);
      if (d < near) [near, flags] = [d, c.flags[i]];
    }
    assert.ok(near <= TRACK2_HALF, 'on the track');
    assert.equal(flags & F.tunnel, 0, 'not in the tunnel');
  }
  const rivals = PLAYER_KARTS.flatMap((k) => [k, k]).slice(0, 7).map((k) => ({ kart: k, tune: tune(KART_SPECS[k], 'sport') }));
  const sim = createKartSim({ course: 'riverside', cup: 'rookie', laps: 1, items: true, player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, 'sport') }, rivals, seed: 5, auto: true });
  let items = 0;
  for (let t = 0; t < 300 && !sim.over; t += 1 / 60) for (const e of sim.step(1 / 60, NO_INPUT)) if (e.kind === 'item') items++;
  assert.ok(items > 3, `items taken (${items})`);
});

test("the race camera: kept under the tunnel's roof and inside its walls with the kart in it; over the hill outside", () => {
  const c = RIVER_COURSES.riverside;
  const i = TUNNEL2.samples[Math.floor(TUNNEL2.samples.length / 2)];
  const f = frame(c, i * c.step);
  // (a camera wanted high and wide of a kart in the middle of the tunnel)
  const [cx, cy, cz] = camRoom2(f.x + f.nx * 6, 4, f.z + f.nz * 6, f.x, f.y, f.z);
  assert.ok(cy <= f.y + TUNNEL_CLEAR - CAM2_GAP + 1e-9, 'under the roof');
  assert.ok(Math.abs((cx - f.x) * f.nx + (cz - f.z) * f.nz) <= TRACK2_HALF + KERB2 - CAM2_GAP + 1e-6, 'inside the walls');
  // (a camera wanted low over the hill, the kart on the road over it)
  const top = CIRCUIT2.y.indexOf(Math.max(...CIRCUIT2.y));
  const [hx, hz] = [CIRCUIT2.x[top] + 4, CIRCUIT2.z[top]];
  const [, hy] = camRoom2(hx, 0.2, hz, CIRCUIT2.x[top], CIRCUIT2.y[top], CIRCUIT2.z[top]);
  assert.ok(hy >= kart2GroundAt(hx, hz) + CAM2_GAP - 1e-9, 'over the hill');
});

test("off a race: the tunnel's floor inside it, the hill over it from above, nothing off the site", () => {
  const i = TUNNEL2.samples[Math.floor(TUNNEL2.samples.length / 2)];
  const [x, z] = [CIRCUIT2.x[i], CIRCUIT2.z[i]];
  assert.equal(riversideSurfaceAt(x, z, 0.1), 0);
  assert.ok((riversideSurfaceAt(x, z, 3.2) ?? 0) > TUNNEL_CLEAR);
  assert.equal(riversideSurfaceAt(SITE2.x0 - 5, SITE2.z0 + 20, 0), null);
});

test("the save keeps Riverside Raceway's records and boards", () => {
  const s = newSave(0);
  s.karts.records['riverside:sport'] = { lap: 63.2, run: 190.5, kart: 'rocket', at: 0 };
  s.karts.boards['riverside-reverse:neon'] = [{ lap: 55, run: 170, kart: 'rocket', at: 0 }];
  const back = cleanSave(JSON.parse(JSON.stringify(s)), 1);
  assert.equal(back.karts.records['riverside:sport']?.lap, 63.2);
  assert.equal(back.karts.boards['riverside-reverse:neon']?.length, 1);
});
