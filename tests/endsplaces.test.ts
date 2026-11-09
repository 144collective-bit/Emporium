// Endswood's places (endsplaces.ts, docs/estate-plan.md Phase 8): the estate on its tenants' hall, St Aldwyn's and
// Bunker Sound, each a place on the map with a door and somewhere clear to arrive, in front of it and facing it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENDS_DOORS, ENDS_PLACE_IDS, ENDS_SPAWNS, ENDS_SPOTS } from '../src/scripts/city3d/endsplaces';
import { ENDSWOOD_RECT, SUBWAY_HOLES } from '../src/scripts/city3d/endswood';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { endsLiftDoors } from '../src/scripts/city3d/endsdecks';
import { SLAB_Y } from '../src/scripts/city3d/endswood';

const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const inRect = (r: readonly number[], x: number, z: number) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];

test('each is a place on the map and in the live settings, with a spot, a door and where you arrive', () => {
  for (const id of ENDS_PLACE_IDS) {
    const p = PLACES.find((q) => q.id === id);
    assert.ok(p && p.kind === 'spot' && p.spot === id, id);
    assert.ok(LIVE_PLACES.some((q) => q.id === id), id);
    assert.ok(ENDS_SPOTS.some((s) => s.id === id) && ENDS_DOORS.some((d) => d.id === id), id);
  }
});

test('the doors are on their buildings, clear of what is solid; you arrive in front of each, facing it, clear', () => {
  for (const d of ENDS_DOORS) {
    const s = ENDS_SPOTS.find((q) => q.id === d.id)!;
    assert.ok(inRect(ENDSWOOD_RECT, d.x, d.z));
    // (within a step of its pick boxes, never inside anything solid)
    assert.ok(s.boxes.some((b) => inBox(b.rect, d.x, d.z, 0.8)), `${d.id}'s door off its building`);
    assert.ok(!SOLIDS.some((b) => inBox(b, d.x, d.z, 0.05)), `${d.id}'s door in something solid`);
    const at = ENDS_SPAWNS[d.id];
    const dist = Math.hypot(d.x - at.x, d.z - at.z);
    assert.ok(dist > 0.8 && dist < 4, `${d.id} arrives ${dist.toFixed(1)} from its door`);
    // (facing it: yaw 0 looks north, -z)
    const [fx, fz] = [-Math.sin(at.yaw), -Math.cos(at.yaw)];
    assert.ok(((d.x - at.x) * fx + (d.z - at.z) * fz) / dist > 0.8, `${d.id} arrives facing away`);
    assert.ok(!SOLIDS.some((b) => inBox(b, at.x, at.z, 0.35)), `${d.id} arrives in something solid`);
    for (const h of SUBWAY_HOLES) assert.ok(!inBox(h, at.x, at.z, 0.5));
    for (const st of PLAN.streets) if (st.kind !== 'highway' && st.kind !== 'ramp') assert.ok(distToStreet(st, [at.x, at.z]) > st.half, `${d.id} arrives in the road`);
    // (no other prompt on top of it: the lifts' doors at street level)
    for (const l of endsLiftDoors(SLAB_Y)) assert.ok(Math.hypot(l.x - d.x, l.z - d.z) > 2, `${d.id}'s door by a lift's`);
  }
  for (let i = 0; i < ENDS_DOORS.length; i++) for (let j = i + 1; j < ENDS_DOORS.length; j++) assert.ok(Math.hypot(ENDS_DOORS[i].x - ENDS_DOORS[j].x, ENDS_DOORS[i].z - ENDS_DOORS[j].z) > 10);
});

test('the pins stand over what they name, St Aldwyn\'s over its spire', () => {
  for (const s of ENDS_SPOTS) {
    assert.ok(inRect(s.land, s.pin[0], s.pin[1]) || s.boxes.some((b) => inBox(b.rect, s.pin[0], s.pin[1])), s.id);
    assert.ok(s.pinH > Math.max(...s.boxes.map((b) => b.h)), `${s.id}'s pin under its building`);
  }
});
