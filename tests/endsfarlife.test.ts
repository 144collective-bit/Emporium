// The far west's life and night (endsfarlife.ts, docs/ends-far-west-plan.md Phase 5): its walkers on the lane's
// sidewalks and the allotments' middle path, never through anything solid or onto the asphalt; the people standing
// about by the bungalows and at their plots, facing the way they should; nobody on the compound; the pools of light
// under his lamps; room for them all in the crowd.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAR_IDLE, FAR_LOOPS, FAR_PEOPLE, FAR_POOLS, LANE_OFF } from '../src/scripts/city3d/endsfarlife';
import { LANE_HALF, LANE_X, LANE_Z, PLOT } from '../src/scripts/city3d/endsfar';
import { ALLOTMENT, BUNGALOWS, FAR_HOME_SOLIDS, PLOTS } from '../src/scripts/city3d/endsfarhomes';
import { HOME, HOME_SOLIDS } from '../src/scripts/city3d/home';
import { SLAB_Y, inEndswood } from '../src/scripts/city3d/endswood';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { moment } from '../src/scripts/city3d/parklife';
import { WALK_W } from '../src/scripts/city3d/layout';

const inRect = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const ALL = [...SOLIDS, ...FAR_HOME_SOLIDS];
const free = (x: number, z: number, m = 0.12) => !ALL.some((b) => inRect(b, x, z, m));
const LANE_RUN = [LANE_X - LANE_HALF, LANE_Z[0], LANE_X + LANE_HALF, LANE_Z[1]];

test('the walkers: on the lane\'s sidewalks and the allotments\' middle path, through nothing, never on the compound', () => {
  assert.deepEqual(FAR_LOOPS.map((l) => [l.id, l.count]), [['lane', 3], ['allotments', 1]]);
  assert.equal(FAR_PEOPLE.length, 4);
  assert.equal(new Set(FAR_PEOPLE.map((p) => p.id)).size, 4);
  assert.ok(LANE_OFF > LANE_HALF && LANE_OFF < LANE_HALF + WALK_W, 'on the sidewalk, between the kerb and the blocks');
  const m = moment();
  for (const p of FAR_PEOPLE) {
    let [px, pz] = [NaN, NaN];
    for (let t = 0; t < 400; t += 0.5) {
      p.at(t, m);
      assert.ok(inEndswood(m.x, m.z), `${p.id} off the estate at ${t}`);
      assert.ok(free(m.x, m.z), `${p.id} in something at ${m.x.toFixed(1)}, ${m.z.toFixed(1)}`);
      assert.ok(!inRect(PLOT, m.x, m.z), `${p.id} on the compound`);
      assert.equal(m.y, SLAB_Y);
      assert.equal(m.clip, 'walk');
      // (on the lane it keeps to a sidewalk but where it crosses at the loop's ends)
      if (p.id.startsWith('endsfar-lane') && inRect(LANE_RUN, m.x, m.z)) assert.ok(m.z < LANE_Z[0] + 2.01 || m.z > LANE_Z[1] - 2.01, `${p.id} in the road at ${m.z.toFixed(1)}`);
      if (p.id.startsWith('endsfar-allot')) assert.ok(ALLOTMENT.paths.some((r) => inRect(r, m.x, m.z, 0.01)), `${p.id} off the path`);
      // (it moves a step at a time: no jumps)
      if (!Number.isNaN(px)) assert.ok(Math.hypot(m.x - px, m.z - pz) < 1.2, `${p.id} jumped at ${t}`);
      [px, pz] = [m.x, m.z];
    }
  }
  // Some are left out on phones
  assert.ok(FAR_PEOPLE.some((p) => p.trim) && FAR_PEOPLE.some((p) => !p.trim));
});

test('standing about: by the bungalows and at the plots, in nothing, nobody on the compound', () => {
  assert.equal(FAR_IDLE.length, 7);
  for (const p of FAR_IDLE) {
    assert.ok(inEndswood(p.x, p.z) && free(p.x, p.z), `someone in something at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
    assert.ok(!inRect(PLOT, p.x, p.z, 0.2) && !HOME_SOLIDS.some((b) => inRect(b, p.x, p.z, 0.3)), 'nobody on his land');
    assert.ok(!inRect(LANE_RUN, p.x, p.z), 'nobody stood in the road');
    assert.equal(p.y, SLAB_Y);
    for (const q of FAR_IDLE) if (q !== p) assert.ok(Math.hypot(p.x - q.x, p.z - q.z) > 0.6, 'two on one spot');
  }
  // The two chatting face each other over the first bungalow's front wall (one in its garden, one outside)
  const [a, b] = FAR_IDLE;
  assert.deepEqual([a.act, b.act], ['chat', 'chat']);
  assert.ok(inRect(BUNGALOWS[0].front, a.x, a.z) && !inRect(BUNGALOWS[0].lot, b.x, b.z));
  assert.ok(Math.abs(a.z - b.z) < 1e-9 && b.x - a.x > 0.6 && b.x - a.x < 1.6);
  assert.ok(Math.sin(a.ry) > 0.9 && Math.sin(b.ry) < -0.9, 'face to face across the wall');
  // Three at plots that are worked, each beside its own plot on the middle path's side, facing it
  const growers = FAR_IDLE.filter((p) => inRect(ALLOTMENT.rect, p.x, p.z) && p.act !== 'phone');
  assert.equal(growers.length, 3);
  for (const g of growers) {
    const plot = PLOTS.find((p) => g.z > p.rect[1] && g.z < p.rect[3] && Math.min(Math.abs(g.x - p.rect[0]), Math.abs(g.x - p.rect[2])) < 0.3)!;
    assert.ok(plot && plot.beds.some((bd) => bd.crop), 'at a plot with something growing');
    assert.ok(Math.sign(Math.sin(g.ry)) === Math.sign((plot.rect[0] + plot.rect[2]) / 2 - g.x), 'facing their plot');
  }
});

test('at night: a pool under each of his lamps, on the ground it lights', () => {
  assert.equal(FAR_POOLS.length, 4);
  const [g0, g1, garage, door] = FAR_POOLS;
  // The gates' two, out on the lane's sidewalk either side of the opening; the garage's and the door's in the yard
  for (const [x, z] of [g0, g1]) assert.ok(x > PLOT[2] && x < LANE_X - LANE_HALF + 0.2 && (z < HOME.gates.z0 || z > HOME.gates.z1));
  assert.ok(inRect(HOME.inner, garage[0], garage[1]) && garage[0] > HOME.garage[2]);
  assert.ok(inRect(HOME.inner, door[0], door[1]) && door[1] < HOME.house[1] && Math.abs(door[0] - HOME.door[0]) < 1e-9);
  for (const [, , size] of FAR_POOLS) assert.ok(size > 1 && size < 3);
});

test('the benchmark has four views of the far west besides the compound\'s, each standing in nothing, looking at the estate', async () => {
  const { BENCH_VIEWS } = await import('../src/scripts/city3d/bench');
  const { onRoof, ROOF_Y } = await import('../src/scripts/city3d/home');
  const ids = ['far-yard', 'far-terrace', 'far-lane', 'far-allot'];
  for (const id of ids) {
    const v = BENCH_VIEWS.find((b) => b.id === id)!;
    assert.ok(v, id);
    const [x, y, z] = v.pos;
    assert.ok(free(x, z, 0.05), `${id}'s camera in something`);
    assert.ok(inEndswood(x, z) && inEndswood(v.target[0], v.target[2], 12), `${id} off the estate`);
    assert.ok(y > SLAB_Y + 1.5 && y < SLAB_Y + 6);
  }
  // (the terrace's is up over his roof, the yard's inside his wall, the lane's on the lane, the allotments' on their path)
  const at = (id: string) => BENCH_VIEWS.find((b) => b.id === id)!.pos;
  assert.ok(onRoof(at('far-terrace')[0], at('far-terrace')[2], at('far-terrace')[1]) && at('far-terrace')[1] > SLAB_Y + ROOF_Y + 1);
  assert.ok(inRect(HOME.inner, at('far-yard')[0], at('far-yard')[2]));
  assert.ok(inRect(LANE_RUN, at('far-lane')[0], at('far-lane')[2]));
  assert.ok(ALLOTMENT.paths.some((r) => inRect(r, at('far-allot')[0], at('far-allot')[2])));
});
