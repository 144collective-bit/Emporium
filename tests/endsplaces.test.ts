// Endswood's places (endsplaces.ts; re-sited with the south, docs/south-plan.md Phase 1b, the owner's call): the estate
// over the Circus, St Aldwyn's over its churchyard on the hill, Bunker Sound by Endswood Road, each still a place on the
// map ("coming soon") with its pin where it's to be built, no door until its building stands, and somewhere clear to
// arrive, on a sidewalk, facing it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENDS_DOORS, ENDS_PLACE_IDS, ENDS_SPAWNS, ENDS_SPOTS } from '../src/scripts/city3d/endsplaces';
import { inEndswood } from '../src/scripts/city3d/endswood';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';

const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;

test('each is a place on the map and in the live settings, with a spot and where you arrive; no doors yet', () => {
  for (const id of ENDS_PLACE_IDS) {
    const p = PLACES.find((q) => q.id === id);
    assert.ok(p && p.kind === 'spot' && p.spot === id, id);
    assert.ok(LIVE_PLACES.some((q) => q.id === id), id);
    assert.ok(ENDS_SPOTS.some((s) => s.id === id), id);
    assert.ok(ENDS_SPAWNS[id], id);
  }
  assert.equal(ENDS_DOORS.length, 0, 'their buildings are Phases 2 and 3');
});

test('you arrive on a sidewalk by each, clear of the asphalt and of anything solid, facing its pin', () => {
  for (const id of ENDS_PLACE_IDS) {
    const at = ENDS_SPAWNS[id];
    const s = ENDS_SPOTS.find((q) => q.id === id)!;
    assert.ok(inEndswood(at.x, at.z), `${id} arrives off the estate`);
    for (const st of PLAN.streets) if (st.kind !== 'highway' && st.kind !== 'ramp') assert.ok(distToStreet(st, [at.x, at.z]) > st.half + 0.1, `${id} arrives on ${st.id}`);
    assert.ok(!SOLIDS.some((b) => inBox(b, at.x, at.z, 0.35)), `${id} arrives in something solid`);
    const [dx, dz] = [s.pin[0] - at.x, s.pin[1] - at.z];
    const d = Math.hypot(dx, dz);
    assert.ok(d < 25, `${id} arrives ${d.toFixed(1)} from its pin`);
    // (facing it: yaw 0 looks north, -z)
    const [fx, fz] = [-Math.sin(at.yaw), -Math.cos(at.yaw)];
    assert.ok((dx * fx + dz * fz) / d > 0.6, `${id} arrives facing away`);
  }
});

test('the pins stand over the ground they name, off the streets', () => {
  for (const s of ENDS_SPOTS) {
    assert.ok(inBox(s.land, s.pin[0], s.pin[1]), `${s.id}'s pin off its land`);
    assert.ok(s.boxes.every((b) => b.rect[2] > b.rect[0] && b.rect[3] > b.rect[1] && b.h > 0), s.id);
    assert.ok(s.pinH > 2, s.id);
  }
});
