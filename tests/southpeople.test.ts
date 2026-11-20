// The south's people about (southpeople.ts, docs/south-plan.md Phase 6c): on the High Road, the podium deck, the Circus's
// plaza and tiers, in the churchyard and at the rec; each on what's there at their height, in nothing solid, off the
// roads, facing somewhere sensible.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOUTH_PEOPLE } from '../src/scripts/city3d/southpeople';
import { createGroundHeight } from '../src/scripts/city3d/groundheight';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { COUNCIL_SOLIDS, ALLOTMENT_SOLIDS } from '../src/scripts/city3d/council';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';

const ground = createGroundHeight({ leavesOpen: () => true });
const solids = [...SOLIDS, ...COUNCIL_SOLIDS, ...ALLOTMENT_SOLIDS];

test('people in every place the owner picked, a few dozen in all', () => {
  for (const w of ['high-road', 'deck', 'plaza', 'churchyard', 'rec'] as const) assert.ok(SOUTH_PEOPLE.some((p) => p.where === w), w);
  assert.ok(SOUTH_PEOPLE.length >= 20 && SOUTH_PEOPLE.length <= 60, `${SOUTH_PEOPLE.length}`);
});

test('each stands (or sits) on the surface there, in nothing solid, off the roads, a body apart', () => {
  for (const p of SOUTH_PEOPLE) {
    const at = `${p.where} ${p.act} at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`;
    assert.ok(Number.isFinite(p.ry), at);
    const g = ground(p.x, p.z, p.y + 0.3);
    assert.ok(Math.abs(g - p.y) < 0.12, `${at}: on ${g.toFixed(2)}, not ${p.y.toFixed(2)}`);
    for (const b of solids) assert.ok(!(p.x > b[0] - 0.2 && p.x < b[2] + 0.2 && p.z > b[1] - 0.2 && p.z < b[3] + 0.2 && b[4] > p.y + 0.3), `${at}: in a solid ${b.slice(0, 4).map((v) => v.toFixed(1))}`);
    if (p.where !== 'deck' && p.where !== 'plaza')
      for (const s of PLAN.streets) if (s.kind !== 'highway' && s.kind !== 'ramp' && s.kind !== 'alley') assert.ok(distToStreet(s, [p.x, p.z]) > s.half + 0.2, `${at}: on ${s.id}`);
  }
  for (let i = 0; i < SOUTH_PEOPLE.length; i++)
    for (let j = i + 1; j < SOUTH_PEOPLE.length; j++) {
      const [a, b] = [SOUTH_PEOPLE[i], SOUTH_PEOPLE[j]];
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0.6 || Math.abs(a.y - b.y) > 1.5, `two people at ${a.x.toFixed(1)}, ${a.z.toFixed(1)}`);
    }
});
