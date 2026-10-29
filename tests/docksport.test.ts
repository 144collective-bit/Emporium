// Southbank Docks' port (docksport.ts, docs/docks-plan.md Phase 3): everything on its quays, off every street and
// the water, clear of the metro and its station, inside the docks' blocks; the cranes the only things over the
// Emporium and well under every flight; the Harbour Master a place you arrive at, facing its door.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOX,
  CRANE,
  CRANES,
  FUEL,
  GATE,
  HARBOUR_MASTER,
  HM_SPAWN,
  LIGHTHOUSE,
  LINES,
  MASTS,
  PORT_SOLIDS,
  PORT_TALLEST,
  SHED,
  SHIP,
  SHIP_STACKS,
  STACKS,
  STRADDLES,
  TRUCKS,
  TUGS,
  WAREHOUSES,
  COASTER,
  craneRect,
  craneTop,
} from '../src/scripts/city3d/docksport';
import { BASIN, DRY_DOCK, DOCK_FLOOR, HOLES, inBasin, inDocks, CAISSON } from '../src/scripts/city3d/docks';
import { PLAN, distToStreet, onSlab } from '../src/scripts/city3d/streetplan';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { FLIGHTS, PERIOD, REACH, poseAt } from '../src/scripts/city3d/airfield';
import { DECK_HALF, PILLARS, PORTALS, STATIONS, TRACKS, pointOn } from '../src/scripts/city3d/metro';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';
import { WATER_Y } from '../src/scripts/city3d/river';

type Box = [number, number, number, number, number];
const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
const corners = (b: Box | number[]): [number, number][] => [
  [b[0], b[1]],
  [b[2], b[1]],
  [b[2], b[3]],
  [b[0], b[3]],
  [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2],
];

test('everything solid stands on the docks\' quays: off every street, out of the water and the dry dock', () => {
  assert.ok(PORT_SOLIDS.every((b) => SOLIDS.includes(b)), 'in SOLIDS');
  for (const b of PORT_SOLIDS) {
    for (const p of corners(b)) {
      assert.ok(inDocks(p[0], p[1]), `${b} outside the docks`);
      assert.ok(onSlab(PLAN, p), `${b} off the quays at ${p}`);
      for (const s of roads) assert.ok(distToStreet(s, p) > s.half + 0.2, `${b} on ${s.id}`);
    }
    for (const r of HOLES) assert.ok(b[2] <= r[0] || b[0] >= r[2] || b[3] <= r[1] || b[1] >= r[3], `${b} in the water or the dry dock`);
  }
});

test('nothing under the metro or in the way of its pillars and station', () => {
  const docks = STATIONS.find((s) => s.id === 'docks')!;
  const [t0, tz0, t1, tz1] = docks.tower;
  for (const b of PORT_SOLIDS) {
    // (the el's deck: a box round each piece of the track in the docks, its pillars' plinths and the arch's feet)
    for (const t of Object.values(TRACKS))
      for (let s = 0; s <= t.len; s += 0.5) {
        const [x, z] = pointOn(t.id, s).at;
        if (!inDocks(x, z, 2)) continue;
        assert.ok(x < b[0] - DECK_HALF - 0.5 || x > b[2] + DECK_HALF + 0.5 || z < b[1] - DECK_HALF - 0.5 || z > b[3] + DECK_HALF + 0.5, `${b} under the el at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      }
    for (const p of [...PILLARS, ...PORTALS]) assert.ok(Math.hypot(Math.max(b[0] - p.at[0], 0, p.at[0] - b[2]), Math.max(b[1] - p.at[1], 0, p.at[1] - b[3])) > 2, `${b} by a pillar at ${p.at}`);
    assert.ok(b[2] < t0 - 1.5 || b[0] > t1 + 1.5 || b[3] < tz0 - 1.5 || b[1] > tz1 + 1.5, `${b} by the station's tower`);
    assert.ok(!(docks.door.x > b[0] - 1.5 && docks.door.x < b[2] + 1.5 && docks.door.z > b[1] - 2 && docks.door.z < b[3] + 2), `${b} at the station's door`);
  }
});

test('the boxes are boxes: 40-foot, in made-up lines, two to four high on the quay, on deck', () => {
  assert.ok(LINES.length >= 6);
  for (const k of STACKS) {
    const [x0, z0, x1, z1] = k.rect;
    assert.ok(Math.abs(x1 - x0 - BOX.L) < 1e-6 && Math.abs(z1 - z0 - BOX.W) < 1e-6);
    assert.ok(k.tiers.length >= 1 && k.tiers.length <= 4 && k.tiers.every((l) => l >= 0 && l < LINES.length));
  }
  // No two boxes overlap
  const all = [...STACKS, ...SHIP_STACKS].map((k) => k.rect);
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const [a, b] = [all[i], all[j]];
      assert.ok(a[2] <= b[0] + 1e-6 || b[2] <= a[0] + 1e-6 || a[3] <= b[1] + 1e-6 || b[3] <= a[1] + 1e-6, `${a} over ${b}`);
    }
  // Some high, some low: a skyline, not a slab
  const tiers = STACKS.map((k) => k.tiers.length);
  assert.ok(new Set(tiers).size >= 3);
  // The ship's on its deck, inside its hull clear of the bow and the bridge
  for (const k of SHIP_STACKS) {
    const [x0, z0, x1, z1] = k.rect;
    assert.ok(x0 > SHIP.rect[0] && x1 < SHIP.rect[2] && z0 > SHIP.rect[1] + SHIP.bow && z1 < SHIP.bridge.z0, `${k.rect}`);
    assert.ok(SHIP.deck + 0.3 + k.tiers.length * BOX.H < SHIP.bridge.top, 'under the bridge');
  }
});

test('the ship lies at the berth under the cranes\' booms, in the basin; the tugs along its east wall; nothing afloat touches', () => {
  const [x0, z0, x1, z1] = SHIP.rect;
  assert.ok(x0 > BASIN[0] + 1 && x1 < BASIN[2] && z0 > BASIN[1] + 1 && z1 < BASIN[3] - 1);
  for (const c of CRANES) {
    const [, , tip] = craneRect(c);
    assert.ok(tip > x1 + 2, 'the boom reaches over the ship');
    assert.ok(c.z > z0 && c.z < z1, 'over the ship');
  }
  const boats = [
    { r: SHIP.rect },
    ...TUGS.map((t) => ({ r: [t.x - t.B / 2, t.z - t.L / 2, t.x + t.B / 2, t.z + t.L / 2] as [number, number, number, number] })),
  ];
  for (const b of boats) assert.ok(b.r[0] > BASIN[0] + 0.5 && b.r[2] < BASIN[2] - 0.5 && b.r[1] > BASIN[1] + 0.5 && b.r[3] < BASIN[3] - 0.5, `${b.r} out of the basin`);
  for (let i = 0; i < boats.length; i++)
    for (let j = i + 1; j < boats.length; j++) {
      const [a, b] = [boats[i].r, boats[j].r];
      assert.ok(a[2] + 1 < b[0] || b[2] + 1 < a[0] || a[3] + 1 < b[1] || b[3] + 1 < a[1], `${a} by ${b}`);
    }
  // The coaster on its blocks in the dry dock, clear of its walls and the caisson
  const [cx0, cz0, cx1, cz1] = COASTER.rect;
  assert.ok(cx0 > DRY_DOCK[0] + CAISSON + 1 && cx1 < DRY_DOCK[2] - 1 && cz0 > DRY_DOCK[1] + 1 && cz1 < DRY_DOCK[3] - 1);
  assert.ok(COASTER.keel > DOCK_FLOOR + 0.4 && DOCK_FLOOR < WATER_Y - 1, 'drained, on its blocks');
  assert.ok(inBasin((cx0 + cx1) / 2, (cz0 + cz1) / 2), 'nobody walks into the dry dock');
});

test('the cranes are the only things over the Emporium, about real height, well under every flight', () => {
  assert.ok(PORT_TALLEST < EMPORIUM_ROOF - 0.5, `${PORT_TALLEST}`);
  for (const c of CRANES) {
    const top = craneTop(c);
    assert.ok(top > 22 && top < 36, `a crane's top ${top}`);
  }
  assert.ok(CRANES.some((c) => c.raised) && CRANES.some((c) => !c.raised));
  assert.ok(CRANE.girder > SHIP.funnel.top + 3, 'the girder over the ship');
  for (let t = 0; t < PERIOD; t += 0.25)
    for (const f of FLIGHTS) {
      const p = poseAt(f, t);
      for (const c of CRANES) {
        const [x0, z0, x1, z1] = craneRect(c);
        const d = Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1));
        if (d < REACH[f.kind] + 4) assert.ok(p.y > craneTop(c) + 4, `${f.id} at ${p.y.toFixed(1)} over a crane at t ${t}`);
      }
    }
});

test('the yards: warehouses along Quay Road, the fuel farm in its bund, the truck park; the gate open to West Road', () => {
  for (const w of WAREHOUSES) assert.ok(w.h < EMPORIUM_ROOF - 2);
  for (let i = 1; i < WAREHOUSES.length; i++) assert.ok(WAREHOUSES[i].rect[0] - WAREHOUSES[i - 1].rect[2] > 4, 'a way through between them');
  for (const t of FUEL.tanks) assert.ok(t.x - t.r > FUEL.bund[0] + 0.5 && t.x + t.r < FUEL.bund[2] - 0.5 && t.z - t.r > FUEL.bund[1] + 0.5 && t.z + t.r < FUEL.bund[3] - 0.5);
  assert.ok(TRUCKS.length >= 12);
  // Nothing solid in the gate's lanes between the gantry and the stacks but the gantry's posts and the booth
  const lanes: Box = [GATE.x + 0.3, GATE.z0 + 0.6, -357, GATE.z1 - 0.6, 0];
  for (const b of PORT_SOLIDS) {
    const hit = b[0] < lanes[2] && b[2] > lanes[0] && b[1] < lanes[3] && b[3] > lanes[1];
    if (hit) assert.deepEqual(b.slice(0, 4), [...GATE.booth], `${b} in the gate's lanes`);
  }
  for (const [x, z] of MASTS) assert.ok(onSlab(PLAN, [x, z]));
  for (const [x, z] of STRADDLES) assert.ok(x > -356 && x < -347 && onSlab(PLAN, [x, z]));
  assert.ok(SHED.ridge < EMPORIUM_ROOF && LIGHTHOUSE.top < EMPORIUM_ROOF);
});

test('the Harbour Master\'s office is a place: you arrive on the sidewalk facing its door, clear of everything solid', () => {
  const p = PLACES.find((q) => q.id === 'harbourmaster')!;
  assert.ok(p && p.spot === 'harbourmaster');
  assert.ok(LIVE_PLACES.some((q) => q.id === 'harbourmaster'));
  assert.deepEqual(p.at, HM_SPAWN);
  assert.ok(onSlab(PLAN, [HM_SPAWN.x, HM_SPAWN.z]));
  for (const b of SOLIDS) assert.ok(!(HM_SPAWN.x > b[0] - 0.4 && HM_SPAWN.x < b[2] + 0.4 && HM_SPAWN.z > b[1] - 0.4 && HM_SPAWN.z < b[3] + 0.4), `the spawn in ${b}`);
  // Facing the door: forward is (-sin yaw, -cos yaw)
  const [fx, fz] = [-Math.sin(HM_SPAWN.yaw), -Math.cos(HM_SPAWN.yaw)];
  const [dx, dz] = [HARBOUR_MASTER.door.x - HM_SPAWN.x, HARBOUR_MASTER.door.z - HM_SPAWN.z];
  assert.ok((fx * dx + fz * dz) / Math.hypot(dx, dz) > 0.95);
  assert.ok(HARBOUR_MASTER.door.z < HARBOUR_MASTER.rect[1] && HARBOUR_MASTER.rect[1] - HARBOUR_MASTER.door.z < 0.6, 'the door on its north face');
});
