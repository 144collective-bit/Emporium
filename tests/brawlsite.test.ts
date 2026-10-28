// The sparring partners on the street (docs/inventory-plan.md Phase 3, brawlsite.ts): where they wait, the
// rings their spars are fought in, clear of everything solid, of the lawns' dressing and of the people about.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAP, PARTNERS, PARTNER_SOLIDS, PROMPT_R, arenaOf, partnerNear, startOf, type Partner } from '../src/scripts/city3d/brawlsite';
import { SOLIDS, SOLID_GRID } from '../src/scripts/city3d/solids';
import { PLAN, onSlab } from '../src/scripts/city3d/streetplan';
import { OUTER_PARKS, OUTER_SQUARES, PADS, type Pt } from '../src/scripts/city3d/outer';
import { BENCHES } from '../src/scripts/city3d/pedestrians';
import { PATH_W, dressing } from '../src/scripts/city3d/outerdress';
import { THE_BLOCK, BLOCK_SPAWN } from '../src/scripts/city3d/projects';
import { BINOCULARS, DECKS, FISHERS, KIOSK } from '../src/scripts/city3d/waterfront';
import { STYLES } from '../src/scripts/city3d/fight-moves';
import { T } from '../src/scripts/city3d/fight-sim';

const boxGap = (x: number, z: number, [x0, z0, x1, z1]: readonly number[]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
const seg = (a: Pt, b: Pt, p: Pt) => {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
};
const ring = (a: { x: number; z: number; r: number }) => Array.from({ length: 16 }, (_, i): Pt => [a.x + Math.cos((i / 16) * Math.PI * 2) * a.r, a.z + Math.sin((i / 16) * Math.PI * 2) * a.r]);
const onDeck = ([x, z]: Pt) => DECKS.some(([a, b, c, d]) => x >= a && x <= c && z >= b && z <= d);

test('the partners: three, named, each its own style and look, far apart', () => {
  assert.equal(PARTNERS.length, 3);
  assert.equal(new Set(PARTNERS.map((p) => p.id)).size, 3);
  assert.equal(new Set(PARTNERS.map((p) => p.name)).size, 3);
  assert.equal(new Set(PARTNERS.map((p) => p.look)).size, 3);
  assert.deepEqual(new Set(PARTNERS.map((p) => p.style)), new Set(Object.keys(STYLES)));
  for (const p of PARTNERS) for (const q of PARTNERS) if (p !== q) assert.ok(Math.hypot(p.x - q.x, p.z - q.z) > 40, `${p.id} and ${q.id}`);
  // (easy to hard)
  assert.ok(PARTNERS[0].skill < PARTNERS[1].skill && PARTNERS[1].skill < PARTNERS[2].skill);
});

test('a spar starts you in front of them, inside its ring, with room to fight', () => {
  for (const p of PARTNERS) {
    const a = arenaOf(p);
    const s = startOf(p);
    for (const [x, z] of [
      [p.x, p.z],
      [s.x, s.z],
    ])
      assert.ok(Math.hypot(x - a.x, z - a.z) <= a.r - T.radius + 1e-9, `${p.id}: starts inside`);
    assert.ok(Math.abs(Math.hypot(s.x - p.x, s.z - p.z) - GAP) < 1e-9);
    // (facing them)
    assert.ok(Math.abs(Math.sin(s.yaw) * (p.x - s.x) + Math.cos(s.yaw) * (p.z - s.z) - GAP) < 1e-9);
    assert.ok(a.r >= 1.4, `${p.id}: a ring to fight in`);
  }
});

/** What stands about where each partner waits, with how much room it wants round it */
function clutter(p: Partner): [number, number, number][] {
  if (p.id === 'tash') {
    const [g0, gz0, g1] = THE_BLOCK.plaza;
    const gx = (g0 + g1) / 2 + 6.5;
    return [
      // (theblock.ts: the plaza's chatting groups, the gantry's posts)
      [g0 + 4, gz0 + 3, 1.2],
      [g1 - 4, gz0 + 3.5, 1.2],
      [gx - 3.5, gz0 + 5.6, 0.3],
      [gx + 3.5, gz0 + 5.6, 0.3],
      [BLOCK_SPAWN.x, BLOCK_SPAWN.z, 0.4],
      ...THE_BLOCK.benches.map(([x, z]): [number, number, number] => [x, z, 0.9]),
      ...THE_BLOCK.poles.map(([x, z]): [number, number, number] => [x, z, 0.3]),
    ];
  }
  if (p.id === 'sal') return [...FISHERS.map((f): [number, number, number] => [f.x, f.z, 0.6]), [KIOSK.c[0], KIOSK.c[1], KIOSK.r + 0.2], ...BINOCULARS.map(([x, z]): [number, number, number] => [x, z, 0.4])];
  return [];
}

test("each ring is on the ground you walk on, clear of everything solid and of what's about", () => {
  const solidAt = ([x, z]: Pt, m: number) => SOLID_GRID.near(x, z, m + 0.5).some((b) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m);
  const D = dressing(solidAt);
  for (const p of PARTNERS) {
    const a = arenaOf(p);
    for (const b of SOLIDS) assert.ok(boxGap(a.x, a.z, b) >= a.r, `${p.id}: a solid box at ${b.slice(0, 4).join(',')}`);
    for (const pt of ring(a)) assert.ok(onSlab(PLAN, pt) || onDeck(pt), `${p.id}: ${pt.map((v) => v.toFixed(1))} off the ground`);
    for (const pad of PADS) assert.ok(boxGap(a.x, a.z, pad.rect) >= a.r, `${p.id}: a pad`);
    // (the pocket parks and squares: their trees, benches and lamps)
    for (const q of [...OUTER_PARKS, ...OUTER_SQUARES]) assert.ok(boxGap(a.x, a.z, q.rect) >= a.r + 0.5, `${p.id}: ${q.id}`);
    for (const b of BENCHES) assert.ok(Math.hypot(b.x - a.x, b.z - a.z) >= a.r + 0.9, `${p.id}: a bench at ${b.x.toFixed(1)},${b.z.toFixed(1)}`);
    for (const t of D.trees) assert.ok(Math.hypot(t[0] - a.x, t[1] - a.z) >= a.r + 0.6, `${p.id}: a tree`);
    for (const b of D.beds) assert.ok(Math.hypot(b.at[0] - a.x, b.at[1] - a.z) >= a.r + b.r, `${p.id}: a bed`);
    for (const f of D.furniture) assert.ok(Math.hypot(f.at[0] - a.x, f.at[1] - a.z) >= a.r + 0.8, `${p.id}: a ${f.kind}`);
    for (const w of D.paths) assert.ok(seg(w.a, w.b, [a.x, a.z]) >= a.r + PATH_W / 2, `${p.id}: a walk`);
    for (const [x, z, m] of clutter(p)) assert.ok(Math.hypot(x - a.x, z - a.z) >= a.r + m, `${p.id}: something at ${x.toFixed(1)},${z.toFixed(1)}`);
  }
});

test('their prompt shows by them, and their footprint is where they stand', () => {
  for (const p of PARTNERS) {
    assert.equal(partnerNear(p.x + 0.8, p.z), p);
    assert.equal(partnerNear(p.x + PROMPT_R + 0.1, p.z), null);
  }
  assert.equal(PARTNER_SOLIDS.length, PARTNERS.length);
  PARTNER_SOLIDS.forEach((b, i) => assert.ok(b[0] < PARTNERS[i].x && PARTNERS[i].x < b[2] && b[1] < PARTNERS[i].z && PARTNERS[i].z < b[3] && b[4] > 1));
});
