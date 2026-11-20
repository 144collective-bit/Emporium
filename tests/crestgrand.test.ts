// Crestmont's houses upgraded (crestgrand.ts, the premium upgrade's Phase 2; the owner's answers, 2026-11-19):
// balconies by style on the houses' walls, under their eaves, clear of the doors' balconies, the portico and
// anything tall in the gardens under them; the hill mansions' roof terraces on their roofs, railed clear of the
// chimneys and the summit's tower, furnished inside their rails, under the Emporium; the gates' piers solid and clear
// of the drives, the gardens and the houses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BALCONY,
  DECK_HIP,
  DECK_RAIL,
  DOOR_BALCONY,
  ESTATE_BALCONIES,
  ESTATE_BALCONY,
  GATE_LEAF,
  MANSION_BALCONIES,
  MANSION_CHIMNEY,
  MANSION_GATE,
  MANSION_PIERS,
  PIER,
  PORTICO,
  ROOF_DECKS,
  balconyRect,
  hipDeck,
  mansionPiers,
  partTop,
  windowsAlong,
} from '../src/scripts/city3d/crestgrand';
import { ESTATES, ESTATE_SOLIDS, GATE, SLAB_Y, TALLEST as ESTATE_TALLEST, wallTop } from '../src/scripts/city3d/estates';
import { MANSIONS, TALLEST as MANSION_TALLEST, toWorld } from '../src/scripts/city3d/mansions';
import { ESTATE_GARDENS, HEIGHT, MANSION_GARDENS, type Feat } from '../src/scripts/city3d/crestgardens';
import { deckHip } from '../src/scripts/city3d/roofs3d';

type R = readonly number[];
const overlap = (a: R, b: R, m = 0) => a[0] < b[2] + m && b[0] < a[2] + m && a[1] < b[3] + m && b[1] < a[3] + m;
const EMPORIUM_ROOF = 12.5;
/** What in a garden stands taller than `y` */
const tallerThan = (feats: Feat[], y: number) => feats.filter((f) => (HEIGHT[f.kind] ?? 0) > y);

test('the windows: laid every step or so along a wall, at least one', () => {
  assert.deepEqual(windowsAlong(0, 1, 1.7), [0.5]);
  const us = windowsAlong(-5, 5, 1.7);
  assert.equal(us.length, 5);
  for (let i = 1; i < us.length; i++) assert.ok(Math.abs(us[i] - us[i - 1] - 2) < 1e-9);
});

test("the estates' balconies: by style, on the main block's wall, under its eaves, none on another", () => {
  let n = 0;
  ESTATES.forEach((e, i) => {
    const p = e.house.main;
    const list = ESTATE_BALCONIES[i];
    if (p.floors < 2) return assert.equal(list.length, 0);
    n += list.length;
    for (const b of list) {
      assert.equal(b.kind, ESTATE_BALCONY[e.style]);
      assert.ok(b.u0 >= p.u0 - 0.31 && b.u1 <= p.u1 + 0.31 && b.u1 > b.u0 + 0.5, `${e.id}'s balcony off its wall`);
      assert.ok(b.y + BALCONY.rail < wallTop(p), `${e.id}'s balcony over its eaves`);
      assert.ok(b.d > 0 && b.d <= 0.9);
      if (e.style === 'villa') assert.ok(b.u1 < e.hc - DOOR_BALCONY || b.u0 > e.hc + DOOR_BALCONY, `${e.id}'s balcony on the one over its door`);
      if (e.style === 'georgian') assert.ok(b.u1 < e.hc - PORTICO || b.u0 > e.hc + PORTICO, `${e.id}'s balcony over its portico`);
      // (nothing tall in the garden under it)
      const under = b.y - BALCONY.slab - 0.35;
      for (const f of tallerThan(ESTATE_GARDENS[i].feats, under)) assert.ok(!overlap(f.r, balconyRect(b)), `${e.id}'s ${f.kind} under its balcony`);
    }
    for (let a = 0; a < list.length; a++) for (let c = a + 1; c < list.length; c++) assert.ok(!overlap(balconyRect(list[a]), balconyRect(list[c])), `${e.id}'s balconies on each other`);
  });
  assert.ok(n >= ESTATES.length * 0.7, `only ${n} balconies on the estates`);
  for (const style of ['spanish', 'villa', 'tudor', 'georgian', 'modern'] as const)
    assert.ok(ESTATES.some((e, i) => e.style === style && ESTATE_BALCONIES[i].length > 0), `no ${style} house with a balcony`);
});

test("the hill mansions' balconies: at the back of the main block, none on a glass house, nothing tall under them", () => {
  MANSIONS.forEach((m, i) => {
    const list = MANSION_BALCONIES[i];
    if (m.kind === 'glass') return assert.equal(list.length, 0);
    assert.ok(list.length > 0, `${m.id} with no balcony`);
    const p = m.parts[0];
    for (const b of list) {
      assert.equal(b.v, p.v1);
      assert.equal(b.n, -1);
      assert.ok(b.u0 >= p.u0 - 0.2 && b.u1 <= p.u1 + 0.2, `${m.id}'s balcony off its wall`);
      assert.ok(b.v - b.d > -m.D, `${m.id}'s balcony off its pad`);
      const under = b.y - BALCONY.slab - 0.35;
      for (const f of tallerThan(MANSION_GARDENS[i].feats, under)) assert.ok(!overlap(f.r, balconyRect(b)), `${m.id}'s ${f.kind} under its balcony`);
    }
    for (let a = 0; a < list.length; a++) for (let c = a + 1; c < list.length; c++) assert.ok(!overlap(balconyRect(list[a]), balconyRect(list[c])), `${m.id}'s balconies on each other`);
  });
});

test("the roof terraces: on every hill mansion's roof, railed clear of its chimney and tower, furnished inside, under the Emporium", () => {
  assert.equal(ROOF_DECKS.length, MANSIONS.length);
  MANSIONS.forEach((m, i) => {
    const d = ROOF_DECKS[i];
    const p = m.parts[0];
    assert.equal(d.kind, m.kind === 'glass' ? 'flat' : 'hip');
    const [u0, v0, u1, v1] = d.r;
    assert.ok(u1 > u0 + 2 && v1 > v0 + 1.2, `${m.id}'s deck too small`);
    const [a0, b0, a1, b1] = d.rail;
    assert.ok(a0 >= u0 && a1 <= u1 && b0 >= v0 && b1 <= v1 && a1 > a0 + 1.5 && b1 > b0 + 1, `${m.id}'s rail off its deck`);
    if (d.kind === 'hip') {
      assert.ok(Math.abs(d.y - (partTop(p) + DECK_HIP.h * DECK_HIP.f)) < 1e-9);
      // (the chimney rises outside the rail)
      const cu = p.u0 + MANSION_CHIMNEY.at;
      assert.ok(a0 > cu + MANSION_CHIMNEY.half, `${m.id}'s rail through its chimney`);
      // (and any other part standing up through the roof outside it)
      for (const q of m.parts.slice(1)) assert.ok(!overlap([q.u0, Math.min(q.v0, q.v1), q.u1, Math.max(q.v0, q.v1)], d.rail, -1e-6), `${m.id}'s rail through its tower`);
    }
    for (const t of d.things) {
      assert.ok(t.u - t.r >= a0 - 1e-9 && t.u + t.r <= a1 + 1e-9 && t.v - t.r >= b0 - 1e-9 && t.v + t.r <= b1 + 1e-9, `${m.id}'s ${t.kind} outside its rail`);
    }
    for (let x = 0; x < d.things.length; x++)
      for (let y = x + 1; y < d.things.length; y++) {
        const [s, t] = [d.things[x], d.things[y]];
        assert.ok(Math.hypot(s.u - t.u, s.v - t.v) > s.r + t.r - 1e-9, `${m.id}'s ${s.kind} on its ${t.kind}`);
      }
    assert.ok(d.things.some((t) => t.kind === 'pot'), `${m.id}'s deck bare`);
    // (its tallest, a parasol's top, under the houses' own limit and the Emporium)
    const top = d.y + Math.max(DECK_RAIL.h + 0.2, ...d.things.map((t) => (t.kind === 'parasol' ? 2.25 : 1.1)));
    assert.ok(top < MANSION_TALLEST && top < EMPORIUM_ROOF, `${m.id}'s roof terrace too tall: ${top.toFixed(2)}`);
  });
});

test('the cut hip: drawn to the deck its rules hold', () => {
  for (const m of MANSIONS.filter((q) => q.kind !== 'glass')) {
    const p = m.parts[0];
    const [g] = deckHip(p.u0, p.v0, p.u1, p.v1, partTop(p), DECK_HIP.h, DECK_HIP.o, DECK_HIP.f);
    const pos = g.attributes.position;
    let top = -Infinity;
    for (let k = 0; k < pos.count; k++) top = Math.max(top, pos.getY(k));
    const { r, y } = hipDeck(p);
    assert.ok(Math.abs(top - y) < 1e-5, `${m.id}'s roof's top off its deck`);
    // (the slopes' top corners are the deck's corners)
    const corners = [
      [r[0], r[1]],
      [r[2], r[1]],
      [r[2], r[3]],
      [r[0], r[3]],
    ];
    for (const [u, v] of corners) {
      let found = false;
      for (let k = 0; k < pos.count; k++) if (Math.abs(pos.getX(k) - u) < 1e-5 && Math.abs(pos.getZ(k) - v) < 1e-5 && Math.abs(pos.getY(k) - y) < 1e-5) found = true;
      assert.ok(found, `${m.id}'s deck corner not on its roof`);
    }
  }
});

test("the estates' gates: the piers taller and solid, their lanterns under the houses' height", () => {
  assert.ok(GATE.h >= 2 && GATE.h < 2.5);
  const tops = ESTATE_SOLIDS.filter((s) => Math.abs(s[2] - s[0] - 2 * GATE.pier) < 1e-6 && Math.abs(s[3] - s[1] - 2 * GATE.pier) < 1e-6 && Math.abs(s[4] - SLAB_Y - GATE.h) < 1e-6);
  assert.equal(tops.length, ESTATES.length * 2, 'every pier solid to its new height');
  const lantern = GATE.h + 0.17 + PIER.lanternH + 0.15;
  assert.ok(lantern < ESTATE_TALLEST && lantern < EMPORIUM_ROOF);
  assert.ok(PIER.plaque.y + PIER.plaque.h < GATE.h && PIER.plaque.w < 2 * GATE.pier);
  assert.ok(GATE_LEAF.h + GATE_LEAF.arch + GATE_LEAF.tip < GATE.h, 'the gates over their piers');
});

test("the hill mansions' piers: only where there's no wall, either side of the drive, off its gardens and its house", () => {
  let n = 0;
  MANSIONS.forEach((m, i) => {
    const piers = mansionPiers(m);
    if (m.walled) return assert.equal(piers.length, 0);
    n += piers.length;
    assert.equal(piers.length, 2);
    const h = MANSION_GATE.half;
    for (const [u, v] of piers) {
      const r = [u - h, v - h, u + h, v + h];
      // (off the drive: its half width and kerbs, crestdrape.ts DRAPE.drive, 1.2 and a kerb)
      assert.ok(Math.abs(u - m.du) - h > 1.2 + 0.25, `${m.id}'s pier on its drive`);
      assert.ok(u - h > -m.W / 2 && u + h < m.W / 2, `${m.id}'s pier off its pad`);
      for (const f of MANSION_GARDENS[i].feats) if ((HEIGHT[f.kind] ?? 0) > 0) assert.ok(!overlap(f.r, r, 0.05), `${m.id}'s pier on its ${f.kind}`);
      for (const p of m.parts) assert.ok(!overlap([p.u0, p.v1, p.u1, p.v0], r, 0.3), `${m.id}'s pier on its house`);
      // (its gate's leaf, swung in from beside it, off the garden)
      const lu = m.du + Math.sign(u - m.du) * MANSION_GATE.leaf;
      for (const f of MANSION_GARDENS[i].feats) if ((HEIGHT[f.kind] ?? 0) > 0) assert.ok(!overlap(f.r, [lu - 0.04, v - 1.6, lu + 0.04, v], 0.02), `${m.id}'s gate on its ${f.kind}`);
    }
  });
  assert.equal(MANSION_PIERS.length, n);
  for (const b of MANSION_PIERS) assert.ok(b[2] - b[0] < 0.6 && b[3] - b[1] < 0.6 && b[2] > b[0]);
  // (in the world where the frame puts them)
  const m = MANSIONS.find((q) => !q.walled)!;
  const [u, v] = mansionPiers(m)[0];
  const [x, z] = toWorld(m, u, v);
  assert.ok(MANSION_PIERS.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3]));
});
