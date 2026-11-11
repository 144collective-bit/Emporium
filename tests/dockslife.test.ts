/*
 * Southbank Docks' life (dockslife.ts, docs/docks-plan.md Phase 4): the working crane's cycle (one box off the ship,
 * across, down, the carrier to the stacks' lane and back, up onto the ship), all of it seamless and clear of what's
 * solid; a truck in through the gate now and then; the pilot boat round the basin; a few workers out of everyone's way.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOX, CRANE, LAND_RAIL, PORT_SOLIDS, S, SEA_RAIL, SHIP, STACK_BLOCKS, STRADDLE, STRADDLES, TUGS } from '../src/scripts/city3d/docksport';
import { BASIN } from '../src/scripts/city3d/docks';
import {
  CARRY,
  CYCLE,
  DOCK_PEOPLE,
  PARK,
  PICK,
  PILOT,
  PILOT_EVERY,
  PILOT_TRIP,
  QUAY_X,
  SLOT,
  STILL,
  TRUCK_EVERY,
  TRUCK_VISIT,
  WORK,
  boxAt,
  carrierAt,
  craneAt,
  pilotAt,
  truckAt,
} from '../src/scripts/city3d/dockslife';

type Box = [number, number, number, number, number];
const STEP = 0.05;
const times = (period: number, step = STEP) => Array.from({ length: Math.ceil(period / step) }, (_, i) => i * step);

/** The corners of a rectangle `len` by `wid` round x, z, its length along local x turned by yaw (x east, z south) */
function corners(x: number, z: number, yaw: number, len: number, wid: number): [number, number][] {
  const [c, s] = [Math.cos(yaw), -Math.sin(yaw)];
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => [x + (a * len) / 2 * c - (b * wid) / 2 * s, z + (a * len) / 2 * s + (b * wid) / 2 * c]);
}
/** Whether a turned rectangle overlaps an upright box on the ground (separating axes) */
function hits(pts: [number, number][], b: Box | number[]) {
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  if (Math.max(...xs) <= b[0] || Math.min(...xs) >= b[2] || Math.max(...zs) <= b[1] || Math.min(...zs) >= b[3]) return false;
  const box: [number, number][] = [
    [b[0], b[1]],
    [b[2], b[1]],
    [b[2], b[3]],
    [b[0], b[3]],
  ];
  for (let i = 0; i < 2; i++) {
    const [p, q] = [pts[i], pts[i + 1]];
    const ax = [q[1] - p[1], p[0] - q[0]];
    const proj = (list: [number, number][]) => list.map(([x, z]) => x * ax[0] + z * ax[1]);
    const [a, c] = [proj(pts), proj(box)];
    if (Math.max(...a) <= Math.min(...c) || Math.max(...c) <= Math.min(...a)) return false;
  }
  return true;
}
/** What's solid that the moving things must keep off: the port's solids but the carrier's own parking spot */
const SOLID = PORT_SOLIDS.filter((b) => !(Math.abs((b[0] + b[2]) / 2 - STRADDLES[0][0]) < 1e-6 && Math.abs((b[1] + b[3]) / 2 - STRADDLES[0][1]) < 1e-6));

test('the cycle comes round seamlessly, and stands still mid-way for reduced motion', () => {
  const near = (a: object, b: object) => Object.entries(a).every(([k, v]) => typeof v !== 'number' || Math.abs(v - (b as Record<string, number>)[k]) < 1e-6);
  assert.ok(near(craneAt(0), craneAt(CYCLE)));
  assert.ok(near(carrierAt(0), carrierAt(CYCLE)));
  assert.ok(near(boxAt(0), boxAt(CYCLE - 1e-9)));
  assert.equal(boxAt(STILL).holder, 'crane', 'under reduced motion the box hangs from the crane');
});

test('one box goes round: never jumping, handed from the ship to the crane, the quay, the carrier and back', () => {
  const seen = new Set<string>();
  let last = boxAt(0);
  for (const t of times(CYCLE)) {
    const b = boxAt(t);
    seen.add(b.holder);
    assert.ok(Math.hypot(b.x - last.x, b.z - last.z) < 0.6 && Math.abs(b.y - last.y) < 0.6, `the box jumped at ${t.toFixed(2)} (${last.holder} to ${b.holder})`);
    last = b;
  }
  assert.deepEqual([...seen].sort(), ['carrier', 'crane', 'quay', 'ship', 'slot']);
  // It sits on top of the stack it comes off, under the crane
  const b = boxAt(0);
  assert.ok(b.x > PICK.rect[0] && b.x < PICK.rect[2] && Math.abs(b.z - WORK.z) < 1e-9);
  assert.ok(Math.abs(b.y - (SHIP.deck + 0.3 + PICK.tiers.length * BOX.H)) < 1e-9);
  // Clear of the ship's bridge and funnel
  for (const t of times(CYCLE, 0.5)) {
    const { z } = boxAt(t);
    assert.ok(z + BOX.L / 2 < SHIP.bridge.z0, 'clear of the bridge');
  }
});

test("the crane's trolley keeps to its girders and the spreader between them and the quay", () => {
  for (const t of times(CYCLE, 0.25)) {
    const { trolley, spreader } = craneAt(t);
    assert.ok(trolley > LAND_RAIL - CRANE.back + 1.5 && trolley < SEA_RAIL + CRANE.out - 1.5);
    assert.ok(spreader >= S + BOX.H - 1e-9 && spreader <= CRANE.girder - 1);
    // Over the ship it never goes down through a stack: only onto its own one
    if (trolley > SHIP.rect[0]) assert.ok(spreader >= SHIP.deck + 0.3 + PICK.tiers.length * BOX.H + BOX.H - 1e-9);
  }
});

test('the carrier stays on the quay and keeps off everything solid, the box it carries too', () => {
  for (const t of times(CYCLE, 0.1)) {
    const c = carrierAt(t);
    const body = corners(c.x, c.z, c.yaw, STRADDLE.L, STRADDLE.W);
    for (const b of SOLID) assert.ok(!hits(body, b), `the carrier at ${t.toFixed(1)} (${c.x.toFixed(2)}, ${c.z.toFixed(2)}) hits ${b.map((v) => v.toFixed(1)).join(', ')}`);
    for (const r of STACK_BLOCKS) assert.ok(!hits(body, r), `into the stacks at ${t.toFixed(1)}`);
    assert.ok(Math.max(...body.map((p) => p[0])) < BASIN[0], 'on the quay, not over the water');
    assert.ok(c.lift >= S - 1e-9 && c.lift <= CARRY + 1e-9);
  }
  assert.deepEqual([carrierAt(0).x, carrierAt(0).z], PARK);
  assert.equal(PARK[0], QUAY_X);
  // The slot's in the lane, off the stacks
  const slot = corners(SLOT[0], SLOT[1], Math.PI, BOX.L, BOX.W);
  for (const r of STACK_BLOCKS) assert.ok(!hits(slot, r));
});

test('a truck now and then: in through the gate, round in the lane, out, clear of everything solid', () => {
  assert.ok(TRUCK_VISIT < TRUCK_EVERY * 0.5, 'away most of the time');
  let shown = 0;
  for (const t of times(TRUCK_EVERY, 0.1)) {
    const p = truckAt(t);
    if (!p) continue;
    shown++;
    const body = corners(p.x, p.z, p.yaw, 3.4, 1.0);
    for (const b of SOLID) assert.ok(!hits(body, b), `the truck at ${t.toFixed(1)} hits a solid`);
    for (const r of STACK_BLOCKS) assert.ok(!hits(body, r), `the truck at ${t.toFixed(1)} is in the stacks`);
    // Never in the carrier's way
    for (const u of times(CYCLE, 1)) {
      const c = carrierAt(u);
      assert.ok(!hits(body, [c.x - 3.5, c.z - 3.5, c.x + 3.5, c.z + 3.5]) || Math.hypot(p.x - c.x, p.z - c.z) > 8);
    }
  }
  assert.ok(shown > 0);
});

test('the pilot boat goes round the basin and backs into its berth, clear of the ship, the tugs and the walls', () => {
  assert.ok(PILOT_TRIP < PILOT_EVERY);
  const at = pilotAt(0);
  assert.deepEqual([at.x, at.z, at.yaw], [PILOT.x, PILOT.z, 0]);
  const end = pilotAt(PILOT_EVERY - 0.01);
  assert.deepEqual([end.x, end.z], [PILOT.x, PILOT.z]);
  let last = at;
  for (const t of times(PILOT_EVERY, 0.1)) {
    const p = pilotAt(t);
    assert.ok(Math.hypot(p.x - last.x, p.z - last.z) < 1, `the pilot boat jumped at ${t}`);
    last = p;
    // Its hull: bow to -z turned by yaw (its length along local z)
    const hull = corners(p.x, p.z, p.yaw + Math.PI / 2, PILOT.L, PILOT.B);
    for (const [x, z] of hull) assert.ok(x > BASIN[0] && x < BASIN[2] && z > BASIN[1] && z < BASIN[3], `out of the basin at ${t.toFixed(1)}`);
    assert.ok(!hits(hull, [SHIP.rect[0] - 2, SHIP.rect[1], SHIP.rect[2], SHIP.rect[3]]), 'into the ship');
    for (const g of TUGS.filter((k) => k !== PILOT)) assert.ok(!hits(hull, [g.x - g.B / 2, g.z - g.L / 2, g.x + g.B / 2, g.z + g.L / 2]), `into ${g.name} at ${t.toFixed(1)}`);
  }
});

test('the dock workers stand out of everything solid and everyone moving', () => {
  for (const w of DOCK_PEOPLE) {
    const me: Box = [w.x - 0.35, w.z - 0.35, w.x + 0.35, w.z + 0.35, 1.7];
    for (const b of PORT_SOLIDS) assert.ok(!(me[0] < b[2] && me[2] > b[0] && me[1] < b[3] && me[3] > b[1]), `a worker at ${w.x}, ${w.z} in a solid`);
    for (const t of times(CYCLE, 0.5)) {
      const c = carrierAt(t);
      assert.ok(!hits(corners(c.x, c.z, c.yaw, STRADDLE.L, STRADDLE.W), me), `a worker at ${w.x}, ${w.z} in the carrier's way`);
    }
    for (const t of times(TRUCK_EVERY, 0.5)) {
      const p = truckAt(t);
      if (p) assert.ok(!hits(corners(p.x, p.z, p.yaw, 3.4, 1.0), me), `a worker at ${w.x}, ${w.z} in the truck's way`);
    }
  }
});
