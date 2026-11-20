// Highcrest's cable car (cablecar.ts, the premium upgrade's Phase 4b; the owner's calls, 2026-11-20: an aerial cable
// car, "Foothill Road's east end", "Ride shown, then walk", "Glass gondolas"): its stations and pylons on clear ground,
// the rope clearing the ground and every hill house's roof, nothing under the Emporium's height but the stations' own
// ground; the cabins round the loop on the clock; a ride from either end to the other in about twenty seconds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CABIN_H, CABLE, CABLE_DOORS, CABLE_STATIONS, CLEAR, stationOf } from '../src/scripts/city3d/cablecar';
import { CABLE_SOLIDS, LINE_L, PYLON_AT, SUPPORTS, cabinAt, cabinsAt, lineAt, needAt, rideAt, ropeY } from '../src/scripts/city3d/cableline';
import { heightAt } from '../src/scripts/city3d/terrain';
import { nearHillRoad } from '../src/scripts/city3d/crestmont';
import { onMansion } from '../src/scripts/city3d/mansions';
import { ASTERLY, OVERLOOK, SITE_SOLIDS, onSite } from '../src/scripts/city3d/crestsites';
import { onLand } from '../src/scripts/city3d/crestland';
import { onTrail } from '../src/scripts/city3d/crestcover';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';

const EMPORIUM_ROOF = 12.5;
const clearAt = (x: number, z: number, m: number) => !onMansion(x, z, m) && !onLand(x, z, m) && !onTrail(x, z, m) && !nearHillRoad(x, z, 1 + m);

test('the stations: the foot by Foothill Road on clear ground, the top beside THE ASTERLY level with it, off everything', () => {
  const [foot, top] = CABLE_STATIONS;
  assert.equal(foot.id, 'foot');
  assert.equal(top.id, 'top');
  assert.ok(Math.abs(top.floor - ASTERLY.y) < 1e-9, 'the top station off the restaurant\'s level');
  assert.ok(top.rect[0] > ASTERLY.body[2], 'the top station in THE ASTERLY');
  for (const s of CABLE_STATIONS) {
    const [x0, z0, x1, z1] = s.rect;
    for (let x = x0; x <= x1; x += 0.5) for (let z = z0; z <= z1; z += 0.5) assert.ok(clearAt(x, z, 0.5), `${s.id} station on something at ${x}, ${z}`);
    for (const b of [...SOLIDS, ...SITE_SOLIDS]) assert.ok(!(b[0] < x1 && b[2] > x0 && b[1] < z1 && b[3] > z0), `${s.id} station on a solid at ${b.slice(0, 2).map((n) => n.toFixed(1))}`);
    // (its door outside it, where you arrive a step from the door, off every street)
    assert.ok(!(s.door.x > x0 && s.door.x < x1 && s.door.z > z0 && s.door.z < z1), `${s.id}'s door inside it`);
    assert.ok(Math.hypot(s.door.x - s.at.x, s.door.z - s.at.z) < 3);
    for (const st of PLAN.streets) if (st.kind !== 'alley') assert.ok(distToStreet(st, [s.at.x, s.at.z]) > st.half + 0.2, `${s.id}'s arrival on ${st.id}`);
  }
  // (the top's door and arrival on the overlook, by THE ASTERLY's bridge)
  const [ox0, oz0, ox1, oz1] = OVERLOOK.rect;
  for (const p of [top.door, top.at]) assert.ok(p.x > ox0 && p.x < ox1 && p.z > oz0 && p.z < oz1, "the top station's way in off the overlook");
  assert.deepEqual(
    CABLE_DOORS.map((d) => d.id),
    ['cable:foot', 'cable:top']
  );
  for (const s of CABLE_STATIONS) assert.ok(PLACES.some((p) => p.id === `cable-${s.id}` && p.kind === 'cable'), `cable-${s.id} isn't a place`);
});

test('the pylons: on clear ground along the line, under the Emporium', () => {
  for (const d of PYLON_AT) {
    const [x, z] = lineAt(d);
    for (const [ox, oz] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) assert.ok(clearAt(x + ox, z + oz, 0.5), `the pylon at ${d} on something`);
    assert.ok(!onSite(x, z, 0.5), `the pylon at ${d} on a landmark`);
    const tall = ropeY(d) + 0.5 - heightAt(x, z);
    assert.ok(tall < EMPORIUM_ROOF, `the pylon at ${d} is ${tall.toFixed(1)} tall`);
  }
  assert.equal(SUPPORTS.length, PYLON_AT.length + 2);
  assert.ok(SUPPORTS[0].d === 0 && Math.abs(SUPPORTS[SUPPORTS.length - 1].d - LINE_L) < 1e-9);
  for (let i = 1; i < SUPPORTS.length; i++) assert.ok(SUPPORTS[i].d > SUPPORTS[i - 1].d);
  // (each solid: the stations and the pylons)
  assert.equal(CABLE_SOLIDS.length, CABLE_STATIONS.length + PYLON_AT.length);
});

test('the rope: a cabin under it clears the ground, its trees and every hill house, less only by the stations', () => {
  for (let d = 0.5; d < LINE_L - 0.5; d += 0.5) {
    const foot = ropeY(d) - CABLE.hang - CABIN_H;
    assert.ok(foot >= needAt(d) - 0.05, `a cabin ${(needAt(d) - foot).toFixed(2)} too low at ${d}`);
  }
  // (and halfway up, well over the ground)
  const mid = LINE_L / 2;
  assert.ok(ropeY(mid) - CABLE.hang - CABIN_H - heightAt(...lineAt(mid)) >= CLEAR.ground - 0.05);
});

test('the cabins: evenly round the loop, up one rope and down the other, on the clock', () => {
  const a = cabinsAt(1000);
  const b = cabinsAt(1000);
  assert.equal(a.length, CABLE.cabins);
  assert.deepEqual(a, b, 'the same cabins at the same time');
  assert.ok(a.some((c) => c.dir === 1) && a.some((c) => c.dir === -1));
  // (a cabin's at its rope's height less its hang, on its side of the line)
  for (let s = 0; s < 2 * LINE_L; s += 7) {
    const c = cabinAt(s);
    const d = s < LINE_L ? s : 2 * LINE_L - s;
    assert.ok(Math.abs(c.y - (ropeY(d) - CABLE.hang)) < 1e-6);
    const [x, z] = lineAt(d, s < LINE_L ? 1 : -1);
    assert.ok(Math.hypot(c.x - x, c.z - z) < 1e-6);
  }
});

test('the ride: from either station to the other in about twenty seconds, easing out and in', () => {
  for (const from of ['foot', 'top'] as const) {
    const r0 = rideAt(from, 0);
    assert.ok(r0.total > 15 && r0.total < 28, `the ride takes ${r0.total.toFixed(0)} s`);
    const s = stationOf(from);
    const to = stationOf(from === 'foot' ? 'top' : 'foot');
    const end = rideAt(from, r0.total);
    assert.ok(Math.hypot(r0.x - s.rope[0], r0.z - s.rope[1]) < CABLE.gauge, 'the ride starts away from its station');
    assert.ok(Math.hypot(end.x - to.rope[0], end.z - to.rope[1]) < CABLE.gauge, 'the ride ends away from the other station');
    // (slow at both ends)
    const early = Math.hypot(rideAt(from, 0.5).x - r0.x, rideAt(from, 0.5).z - r0.z);
    const middle = Math.hypot(rideAt(from, r0.total / 2 + 0.25).x - rideAt(from, r0.total / 2 - 0.25).x, rideAt(from, r0.total / 2 + 0.25).z - rideAt(from, r0.total / 2 - 0.25).z);
    assert.ok(early < middle, 'the ride leaves at full speed');
  }
});
