// The gentle rolls outside the town (rolls.ts, docs/blend-plan.md Phase 4): flat under and round everything that
// stands, only outside the ring highway, gentle enough to walk and drive, and drawn exactly as they're walked on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLL, rollSlope, rollsAlong, rollsAt, rollsIn, shape } from '../src/scripts/city3d/rolls';
import { keptOff } from '../src/scripts/city3d/landuse';
import { insideHighway, HIGHWAY } from '../src/scripts/city3d/highway';
import { EXT } from '../src/scripts/city3d/layout';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { SOLIDS, DOORS, WALK_SPAWN } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { TRACKS } from '../src/scripts/city3d/metro';
import { edgeSamples } from '../src/scripts/city3d/river';
import { TERRAIN_RECT } from '../src/scripts/city3d/hills';
import { floorAt } from '../src/scripts/city3d/flight-sim';

const [E0, E1] = EXT;
/** Every point of the world `step` apart */
function* grid(step: number) {
  for (let x = E0; x <= E1; x += step) for (let z = E0; z <= E1; z += step) yield [x, z] as const;
}

test('there are rolls: swells and dips, a metre or two at most', () => {
  let [lo, hi] = [0, 0];
  for (const [x, z] of grid(3)) {
    const h = rollsAt(x, z);
    lo = Math.min(lo, h);
    hi = Math.max(hi, h);
  }
  assert.ok(hi > 0.6 && hi <= ROLL.up + 1e-6, `highest ${hi}`);
  assert.ok(lo < -0.2 && lo >= -ROLL.down - 1e-6, `deepest ${lo}`);
});

test('only outside the ring highway, never on the hills, flat at the world\'s edge', () => {
  for (const [x, z] of grid(2)) {
    const h = rollsAt(x, z);
    if (h === 0) continue;
    assert.ok(!insideHighway(x, z), `${x}, ${z} rolls inside the highway`);
    assert.ok(!(x > TERRAIN_RECT[0] && x < TERRAIN_RECT[2] && z > TERRAIN_RECT[1] && z < TERRAIN_RECT[3]), `${x}, ${z} rolls on the hills' land`);
  }
  for (let v = E0; v <= E1; v += 1) for (const [x, z] of [[E0, v], [E1, v], [v, E0], [v, E1]]) assert.equal(rollsAt(x, z), 0, `${x}, ${z} at the edge`);
});

test('flat wherever the outskirts\' trees keep off (every street, block, district, the airport, the river, the metro, the verges)', () => {
  for (const [x, z] of grid(1.5)) if (keptOff(x, z) !== null) assert.equal(rollsAt(x, z), 0, `${x}, ${z} (${keptOff(x, z)}) is ${rollsAt(x, z)}`);
});

test('flat under everything that stands: every solid, door, place, spawn, street, slab, the metro, the highway and the river\'s edges', () => {
  const flat = (x: number, z: number, what: string) => assert.equal(rollsAt(x, z), 0, `${what} at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  for (const b of SOLIDS) for (const [x, z] of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]], [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]]) flat(x, z, 'a solid');
  for (const d of DOORS) flat(d.x, d.z, `door ${d.id}`);
  for (const p of PLACES) flat(p.at.x, p.at.z, `place ${p.id}`);
  flat(WALK_SPAWN.x, WALK_SPAWN.z, 'the spawn');
  for (const s of PLAN.streets) {
    const pts = s.loop ? [...s.pts, s.pts[0]] : s.pts;
    for (let i = 1; i < pts.length; i++)
      for (let t = 0; t <= 1; t += 0.1) for (const o of [-1, 0, 1]) {
        const [a, b] = [pts[i - 1], pts[i]];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const [nx, nz] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
        flat(a[0] + (b[0] - a[0]) * t + nx * o * s.half, a[1] + (b[1] - a[1]) * t + nz * o * s.half, `street ${s.id}`);
      }
  }
  for (const poly of PLAN.slabs) for (const [x, z] of poly) flat(x, z, 'a slab');
  for (const t of Object.values(TRACKS)) for (const [x, z] of t.pts) flat(x, z, `the metro's ${t.id}`);
  for (const [x, z] of HIGHWAY) flat(x, z, 'the highway');
  for (const e of edgeSamples(E0, E1, 4)) for (const z of [e.n, e.s]) flat(e.x, z, "the river's edge");
});

test('gentle: walkable and drivable everywhere', () => {
  let most = 0;
  for (const [x, z] of grid(2.5)) most = Math.max(most, rollSlope(x + 0.3, z + 0.7));
  assert.ok(most < 0.12, `steepest ${most}`);
});

test('a finer grid laid on the lattice draws the very surface walked on (desktop\'s ground: a cell in thirds)', () => {
  const L = ROLL.cell;
  const sub = L / 3;
  let checked = 0;
  for (const [x, z] of grid(7.3)) {
    if (rollsAt(x, z) === 0) continue;
    // The sub-cell it's in, split from its low corner to its high one, as world.ts's rolledPlane() splits it
    const [i, j] = [Math.floor(x / sub), Math.floor(z / sub)];
    const [u, v] = [x / sub - i, z / sub - j];
    const [h00, h10, h01, h11] = [rollsAt(i * sub, j * sub), rollsAt((i + 1) * sub, j * sub), rollsAt(i * sub, (j + 1) * sub), rollsAt((i + 1) * sub, (j + 1) * sub)];
    const drawn = u >= v ? h00 + u * (h10 - h00) + v * (h11 - h10) : h00 + v * (h01 - h00) + u * (h11 - h01);
    assert.ok(Math.abs(drawn - rollsAt(x, z)) < 1e-5, `${x}, ${z}: drawn ${drawn}, walked ${rollsAt(x, z)}`);
    checked++;
  }
  assert.ok(checked > 100);
});

test('rollsIn() finds every piece with rolls in it, and only those', () => {
  for (let x = E0; x < E1; x += 30)
    for (let z = E0; z < E1; z += 30) {
      let any = false;
      for (let a = 0; a <= 30 && !any; a += 2.5) for (let b = 0; b <= 30 && !any; b += 2.5) any = rollsAt(x + a, z + b) !== 0;
      if (any) assert.ok(rollsIn(x, z, x + 30, z + 30), `tile ${x}, ${z}`);
    }
  // (inside the town, nothing)
  assert.equal(rollsIn(0, 0, 60, 60), false);
});

test('the waves are fixed: the same rolls for everyone, whatever the world\'s size', () => {
  assert.equal(shape(-300, -300), shape(-300, -300));
  assert.ok(Math.abs(shape(-300, -300) - shape(-300.001, -300)) < 1e-3);
});

test('the camera and shots stop on a swell; a ray over them passes', () => {
  // The highest point found, and a ray along the ground through it
  let best = { x: 0, z: 0, h: 0 };
  for (const [x, z] of grid(3)) {
    const h = rollsAt(x, z);
    if (h > best.h) best = { x, z, h };
  }
  const from = { x: best.x - 10, y: 0.1, z: best.z };
  assert.ok(rollsAlong(from, { x: 1, y: 0, z: 0 }, 20, 0) < 20);
  assert.equal(rollsAlong({ x: best.x - 10, y: 5, z: best.z }, { x: 1, y: 0, z: 0 }, 20), 20);
});

test("the flight sim's floor follows the rolls", () => {
  let p = { x: 0, z: 0 };
  for (const [x, z] of grid(5)) if (rollsAt(x, z) > rollsAt(p.x, p.z)) p = { x, z };
  const world = { boxes: [], ceilings: [], soft: [], ground: (x: number, z: number) => rollsAt(x, z) };
  assert.equal(floorAt(world, p.x, p.z, 10), rollsAt(p.x, p.z));
  assert.ok(floorAt(world, p.x, p.z, 10) > 0.5);
});
