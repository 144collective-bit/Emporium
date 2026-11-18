// Aldwyn's Green Rec (rec.ts; docs/south-plan.md Phase 3e, the owner's calls): its pitch, pavilion, skate park and
// playground on the rec ground, apart; the footbridge over the brook from Brookside's sidewalk to its gate, walked
// over its deck; the path on to the pavilion clear; nothing solid in the way in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BENCHES, BRIDGE, FOOTPATH, GATE, PAVILION, PAVILION_DOOR, PITCH, PLAYGROUND, REC_PATH, REC_SOLIDS, REC_SPAWN, SKATE, VERANDA, recBridgeY } from '../src/scripts/city3d/rec';
import { BROOK, BROOKSIDE, REC, type Pt } from '../src/scripts/city3d/south';
import { HOUSES, houseFoot } from '../src/scripts/city3d/southterraces';
import { distTo, inside } from '../src/scripts/city3d/streetfaces';
import { createGroundHeight } from '../src/scripts/city3d/groundheight';

const corners = (r: number[]): Pt[] => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
const overlap = (a: number[], b: number[]) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;

test('the pitch, the pavilion and its veranda, the skate park and the playground: on the rec ground, apart', () => {
  const parts = { PITCH, PAVILION, VERANDA, SKATE, PLAYGROUND };
  for (const [k, r] of Object.entries(parts)) for (const p of corners(r)) assert.ok(inside(REC, p), `${k} off the rec ground`);
  const list = Object.entries(parts).filter(([k]) => k !== 'VERANDA');
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) assert.ok(!overlap(list[i][1], list[j][1]), `${list[i][0]} on ${list[j][0]}`);
  assert.ok(VERANDA[2] <= PAVILION[0] + 1e-9 && VERANDA[0] > PITCH[2], 'the veranda between the pitch and the pavilion');
  for (const b of BENCHES) assert.ok(inside(REC, b.at), 'a bench off the rec ground');
});

test("the way in: Brookside's sidewalk, the footbridge over the brook, the gate, the path to the pavilion", () => {
  assert.ok(distTo(BROOKSIDE.pts, FOOTPATH[0]) < BROOKSIDE.half + 1.5, 'the path from the sidewalk');
  assert.ok(Math.hypot(FOOTPATH[1][0] - GATE[0], FOOTPATH[1][1] - GATE[1]) < 1, 'to the gate');
  assert.ok(distTo(REC, GATE, true) < 0.8, "the gate on the rec ground's edge");
  // (the bridge spans the brook, bank to bank)
  const brookZ = BROOK.reduce((b, p) => (Math.abs(p[0] - BRIDGE.x) < Math.abs(b[0] - BRIDGE.x) ? p : b))[1];
  assert.ok(BRIDGE.z0 < brookZ - 2 && BRIDGE.z1 > brookZ + 2);
  // (walked over its deck: humped over the middle; off it, the ground)
  const ground = createGroundHeight({ leavesOpen: () => false });
  const mid = (BRIDGE.z0 + BRIDGE.z1) / 2;
  const y = recBridgeY(BRIDGE.x, mid)!;
  assert.ok(y > Math.max(BRIDGE.y0, BRIDGE.y1) + 0.2, 'humped');
  assert.ok(Math.abs(ground(BRIDGE.x, mid, y) - y) < 1e-9);
  assert.equal(recBridgeY(BRIDGE.x + 2, mid), null);
  for (const line of [FOOTPATH, REC_PATH])
    for (let i = 1; i < line.length; i++)
      for (let k = 0; k <= 10; k++) {
        const p: Pt = [line[i - 1][0] + ((line[i][0] - line[i - 1][0]) * k) / 10, line[i - 1][1] + ((line[i][1] - line[i - 1][1]) * k) / 10];
        for (const h of HOUSES) assert.ok(!inside(houseFoot(h), p), `the path through ${h.id}`);
        assert.ok(!REC_SOLIDS.some((b) => inBox(b, p[0], p[1], 0.3)), `the path blocked at ${p}`);
      }
  assert.ok(!REC_SOLIDS.some((b) => inBox(b, REC_SPAWN.x, REC_SPAWN.z, 0.4)), 'the arrival blocked');
  assert.ok(!REC_SOLIDS.some((b) => inBox(b, PAVILION_DOOR[0] - 0.6, PAVILION_DOOR[1], 0.3)), "the pavilion's door blocked");
});
