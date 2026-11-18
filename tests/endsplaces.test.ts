// Endswood's places (endsplaces.ts; re-sited with the south, docs/south-plan.md Phase 1b, the owner's call): the estate
// over the Circus, St Aldwyn's over its churchyard on the hill, Bunker Sound by Endswood Road, each still a place on the
// map ("coming soon") with its pin where it's to be built, no door until its building stands, and somewhere clear to
// arrive, on a sidewalk, facing it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENDS_DOORS, ENDS_PLACE_IDS, ENDS_SPAWNS, ENDS_SPOTS } from '../src/scripts/city3d/endsplaces';
import { inEndswood } from '../src/scripts/city3d/endswood';
import { SOLIDS as BOOT_SOLIDS } from '../src/scripts/city3d/solids';
import { ALLOTMENT_SOLIDS, COUNCIL_SOLIDS } from '../src/scripts/city3d/council';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
/** What's solid, the council rows' and the allotments' too (they join with the village's chunk: council3d.ts) */
const SOLIDS = [...BOOT_SOLIDS, ...COUNCIL_SOLIDS, ...ALLOTMENT_SOLIDS];

const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;

test('each is a place on the map and in the live settings, with a spot and where you arrive; its doors', () => {
  for (const id of ENDS_PLACE_IDS) {
    const p = PLACES.find((q) => q.id === id);
    assert.ok(p && p.kind === 'spot' && p.spot === id, id);
    assert.ok(LIVE_PLACES.some((q) => q.id === id), id);
    assert.ok(ENDS_SPOTS.some((s) => s.id === id), id);
    assert.ok(ENDS_SPAWNS[id], id);
  }
  // (Bunker Sound's under Teasel House, Phase 2; the others' buildings are Phase 3's)
  // (Bunker Sound's under Teasel House, St Aldwyn's porch, the High Road's four: Phases 2, 3b and 3c)
  assert.deepEqual(ENDS_DOORS.map((d) => d.id), ['bunker', 'aldwyns', 'brook', 'rosas', 'kestrel', 'busgarage']);
  for (const door of ENDS_DOORS) {
    assert.ok(!SOLIDS.some((b) => inBox(b, door.x, door.z, 0.2)), `${door.id}'s door in something solid`);
    const pin = ENDS_SPOTS.find((q) => q.id === door.id)!.pin;
    assert.ok(Math.hypot(door.x - pin[0], door.z - pin[1]) < 1.5, `${door.id}'s door by its pin`);
  }
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
