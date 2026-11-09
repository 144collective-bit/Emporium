// The street lamps mixed at the districts' edges (lampmix.ts, docs/blend-plan.md Phase 6a): all white well outside the
// sodium districts, all sodium well inside, a share easing between across the edge, each lamp the same every time,
// The Trenches' dead and flickering lamps its own.
import { test } from 'node:test';
import { inLot9Lamps as inFence } from '../src/scripts/city3d/lot9';
import assert from 'node:assert/strict';
import { KERB_SEAM, MIX, SODIUM_AREAS, kerbShare, lampTone, sodiumDepth, sodiumShare } from '../src/scripts/city3d/lampmix';
import { BLOCK_SPAWN } from '../src/scripts/city3d/projects';
import { DOCKS_RECT, DOCK_LAMPS } from '../src/scripts/city3d/docks';
import { PARK_LAMPS, SF_LAMPS, YARDS_RECT } from '../src/scripts/city3d/southfield';
import { LAMPS as WATER_LAMPS } from '../src/scripts/city3d/waterfront';
import { RING_W, inTrenches } from '../src/scripts/city3d/trenches';

type Pt = [number, number];
const mid = (r: readonly number[]): Pt => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];

test('all sodium well inside each sodium district, all white well away from them', () => {
  for (const p of [[BLOCK_SPAWN.x, BLOCK_SPAWN.z] as Pt, mid(DOCKS_RECT), mid(YARDS_RECT)]) assert.equal(sodiumShare(p[0], p[1]), 1, `${p}`);
  // Downtown, Uptown, Westlake Park, Sunridge, the Neon Mile
  for (const p of [[30, 30], [-120, 30], [-120, -80], [180, -90], [200, 30]] as Pt[]) assert.equal(sodiumShare(p[0], p[1]), 0, `${p}`);
});

test("the share eases across an edge: from the yards' middle out west over Forge Street into the park", () => {
  const z = (YARDS_RECT[1] + YARDS_RECT[3]) / 2;
  let last = 2;
  let crossed = false;
  for (let x = mid(YARDS_RECT)[0]; x > YARDS_RECT[0] - 2 * MIX; x -= 0.5) {
    const s = sodiumShare(x, z);
    assert.ok(s <= last + 1e-9, `the share rises again at x ${x}`);
    last = s;
    // (half on the edge)
    if (!crossed && x < YARDS_RECT[0]) {
      crossed = true;
      assert.ok(Math.abs(s - 0.5) < 0.05, `the edge's share is ${s}`);
    }
  }
  assert.equal(last, 0);
  // The depth agrees with each district's own test, both ways
  for (const [x, zz] of [[YARDS_RECT[0] + 5, z], [YARDS_RECT[0] - 5, z]] as Pt[]) assert.equal(sodiumDepth(x, zz) > 0, SODIUM_AREAS.some((a) => a(x, zz, 0)));
});

test('the lamps where the yards meet the park are mixed, and the lamps away from every edge keep their colour', () => {
  const lamps: Pt[] = [...SF_LAMPS.map(([x, z]) => [x, z] as Pt), ...PARK_LAMPS.map(([x, z]) => [x, z] as Pt), ...DOCK_LAMPS.map(([x, z]) => [x, z] as Pt), ...WATER_LAMPS];
  let [inSodium, inWhite, outSodium, outWhite] = [0, 0, 0, 0];
  for (const [x, z] of lamps) {
    const d = sodiumDepth(x, z);
    const t = lampTone(x, z);
    assert.equal(t, lampTone(x, z), 'the same every time');
    if (d >= MIX) assert.notEqual(t, 'white', `a lamp deep in at ${x}, ${z} is white`);
    if (d <= -MIX) assert.equal(t, 'white', `a lamp well out at ${x}, ${z} is sodium`);
    if (Math.abs(d) < MIX) {
      if (d > 0) t === 'white' ? inWhite++ : inSodium++;
      else t === 'white' ? outWhite++ : outSodium++;
    }
  }
  // (both colours on each side of the edge, the sodium more often inside)
  assert.ok(inWhite > 0 && inSodium > 0 && outWhite > 0 && outSodium > 0, `${inSodium} ${inWhite} ${outSodium} ${outWhite}`);
  assert.ok(inSodium / (inSodium + inWhite) > outSodium / (outSodium + outWhite));
});

test("The Trenches' (and Lot 9's) dead and flickering lamps are only their own", () => {
  let [dead, flicker] = [0, 0];
  for (let x = -260; x < 160; x += 1.7)
    for (let z = 120; z < 330; z += 1.9) {
      const t = lampTone(x, z);
      if (t === 'dead' || t === 'flicker') assert.ok(inTrenches(x, z) || inFence(x, z), `${t} at ${x}, ${z}`);
      if (t === 'dead') dead++;
      if (t === 'flicker') flicker++;
    }
  assert.ok(dead > 0 && flicker > 0);
});

test("the kerb blends across the west ring avenue at The Trenches' edge: grey well inside, the town's stone well out, half on the avenue's line", () => {
  const z = (KERB_SEAM.z0 + KERB_SEAM.z1) / 2;
  assert.equal(kerbShare(KERB_SEAM.x - MIX, z), 1);
  assert.equal(kerbShare(KERB_SEAM.x + MIX, z), 0);
  assert.ok(Math.abs(kerbShare(KERB_SEAM.x, z) - 0.5) < 1e-9);
  let last = 2;
  for (let x = KERB_SEAM.x - MIX - 2; x < KERB_SEAM.x + MIX + 2; x += 0.25) {
    const s = kerbShare(x, z);
    assert.ok(s <= last + 1e-9 && s >= 0 && s <= 1, `the share rises again at x ${x}`);
    last = s;
  }
  // The seam runs along The Trenches' blocks only: north of the bank avenue and south of the highway each side keeps its own
  assert.equal(kerbShare(KERB_SEAM.x - 1, KERB_SEAM.z0 - MIX - 1), 1);
  assert.equal(kerbShare(KERB_SEAM.x + 1, KERB_SEAM.z1 + MIX + 1), 0);
  // The avenue's kerbs either side meet in the middle: each a step from its own colour, the two together the old jump
  const half = RING_W.half;
  assert.ok(kerbShare(KERB_SEAM.x - half, z) > 0.6 && kerbShare(KERB_SEAM.x + half, z) < 0.4);
  assert.ok(Math.abs(kerbShare(KERB_SEAM.x - half, z) + kerbShare(KERB_SEAM.x + half, z) - 1) < 1e-9, 'symmetric');
});
