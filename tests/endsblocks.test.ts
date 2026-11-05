// Endswood's blocks (endsblocks.ts, docs/estate-plan.md Phase 3): each standing on one of the estate's blocks, inside
// its sidewalk, clear of the Circus, the spine, the subways and the well, the streets, the lamps and each other; under
// the Emporium; galleries and bridges over a walker's head; what's solid in SOLIDS; every entrance reachable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKS, BLOCK_SOLIDS, DECK, GROUND, TALLEST, deckRect, finsOf, hoardingRuns, type EstateBlock } from '../src/scripts/city3d/endsblocks';
import { CIRCUS, CIRCUS_OUT, ENDS_LAMPS, SLAB_Y, SPINE, SUBWAYS, SUBWAY_HOLES, type Rect } from '../src/scripts/city3d/endswood';
import { PLAN, distToStreet, inPoly, type Pt } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';

const overlap = (a: readonly number[], b: readonly number[], m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
const corners = (r: Rect): Pt[] => [
  [r[0], r[1]],
  [r[2], r[1]],
  [r[2], r[3]],
  [r[0], r[3]],
];
const estate = PLAN.blocks.filter((b) => b.ref === 'endswood');
/** Everything a building covers on the ground or over it: its shells, its galleries, its hoardings */
const covers = (b: EstateBlock): Rect[] => [...b.shells.map((s) => s.rect), ...b.decks.map((d) => deckRect(b, d)), ...(b.hoarding ? [b.hoarding] : [])];
const DEGEN = 1.35;

test('every building stands inside one of the estate\'s blocks, off its sidewalk, clear of the Circus and the spine', () => {
  for (const b of BLOCKS) {
    const all = covers(b).flatMap(corners);
    const home = estate.find((e) => all.every((p) => inPoly(e.poly, p)));
    assert.ok(home, `${b.id} is off its block`);
    for (const p of all) assert.ok(Math.hypot(p[0] - CIRCUS.x, p[1] - CIRCUS.z) > CIRCUS_OUT, `${b.id} in the Circus at ${p}`);
    // (the spine runs north and south of the Circus between the blocks: only the bridge over it)
    for (const r of covers(b)) assert.ok(!(r[0] < CIRCUS.x + SPINE && r[2] > CIRCUS.x - SPINE), `${b.id} on the spine`);
  }
});

test('the buildings keep apart, off the streets, the subways, the well and the lamps', () => {
  for (let i = 0; i < BLOCKS.length; i++)
    for (let j = i + 1; j < BLOCKS.length; j++) for (const a of covers(BLOCKS[i])) for (const c of covers(BLOCKS[j])) assert.ok(!overlap(a, c, 0.5), `${BLOCKS[i].id} and ${BLOCKS[j].id}`);
  for (const b of BLOCKS) {
    for (const r of covers(b)) {
      for (const h of SUBWAY_HOLES) assert.ok(!overlap(r, h, 0.5), `${b.id} over a hole`);
      for (const p of SUBWAYS) assert.ok(!overlap(r, [p.c - p.half - p.wall, p.a0, p.c + p.half + p.wall, p.a1], 0.5), `${b.id} over ${p.id}`);
      for (const s of PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp')) for (const p of corners(r)) assert.ok(distToStreet(s, p) > s.half + 0.8, `${b.id} on ${s.id}`);
      for (const [x, z] of ENDS_LAMPS) assert.ok(!(x > r[0] - 0.4 && x < r[2] + 0.4 && z > r[1] - 0.4 && z < r[3] + 0.4), `a lamp in ${b.id}`);
    }
  }
});

test('under the Emporium; the galleries, bridges and the street in the sky over a walker\'s head', () => {
  assert.ok(TALLEST <= EMPORIUM_ROOF - 0.5);
  for (const b of BLOCKS) {
    for (const s of b.shells) assert.ok(s.y1 + 0.25 <= TALLEST + 1e-9, `${b.id} too tall: ${s.y1}`);
    for (const d of b.decks) assert.ok(d.ys[0] - DECK.slab >= SLAB_Y + DEGEN, `${b.id}'s first gallery too low`);
    for (const br of b.bridges) assert.ok(br.y0 >= SLAB_Y + GROUND + DEGEN, `${b.id}'s bridge too low`);
  }
  // Fennel House's two halves bridged over the spine, the tower's lift tower bridged to it every third floor
  const fw = BLOCKS.find((b) => b.id === 'fennel-w')!;
  const sky = fw.bridges[0].rect;
  assert.ok(sky[0] <= CIRCUS.x - SPINE && sky[2] >= CIRCUS.x + SPINE);
  const fe = BLOCKS.find((b) => b.id === 'fennel-e')!;
  assert.ok(Math.abs(sky[0] - fw.shells[0].rect[2]) < 1e-9 && Math.abs(sky[2] - fe.shells[0].rect[0]) < 1e-9, 'it meets both halves');
  const tower = BLOCKS.find((b) => b.kind === 'tower')!;
  assert.equal(tower.bridges.length, 3);
  for (const br of tower.bridges) assert.ok(Math.abs(br.rect[0] - tower.shells[1].rect[2]) < 1e-9 && Math.abs(br.rect[2] - tower.shells[0].rect[0]) < 1e-9);
});

test("what's solid: the shells, the galleries' cross walls and the hoardings, in SOLIDS; every entrance outside them, on the estate's slab", () => {
  for (const b of BLOCK_SOLIDS) assert.ok(SOLIDS.includes(b));
  for (const b of BLOCKS) {
    for (const s of b.shells) assert.ok(BLOCK_SOLIDS.some((x) => x[0] === s.rect[0] && x[1] === s.rect[1] && x[2] === s.rect[2] && x[3] === s.rect[3]));
    for (const d of b.decks) for (const f of finsOf(b, d)) assert.ok(BLOCK_SOLIDS.some((x) => x[0] === f[0] && x[1] === f[1]));
    if (b.hoarding) for (const r of hoardingRuns(b.hoarding)) assert.ok(BLOCK_SOLIDS.some((x) => x[0] === r[0] && x[1] === r[1] && x[2] === r[2]));
    // (its door: nothing solid there; on its block's slab or the ground by it)
    const [x, z] = b.door;
    assert.ok(!SOLIDS.some((o) => x > o[0] - 0.2 && x < o[2] + 0.2 && z > o[1] - 0.2 && z < o[3] + 0.2), `${b.id}'s door in something at ${b.door}`);
    assert.ok(PLAN.slabs.some((s) => inPoly(s, b.door)) || !PLAN.streets.some((s) => distToStreet(s, b.door) < s.half), `${b.id}'s door in the road`);
  }
});

test('every building has a made-up name and its kind; the condemned one shut behind hoardings, screened', () => {
  const kinds = new Set(BLOCKS.map((b) => b.kind));
  for (const k of ['slab', 'tower', 'maisonette', 'terrace', 'condemned', 'garages'] as const) assert.ok(kinds.has(k), k);
  for (const b of BLOCKS) assert.ok(b.name.length > 3 && /^[A-Z]/.test(b.name));
  const kite = BLOCKS.find((b) => b.kind === 'condemned')!;
  assert.ok(kite.hoarding && kite.shells.every((s) => Object.values(s.faces).every((f) => f === 'void' || f === 'blank')));
  const [hx0, hz0, hx1, hz1] = kite.hoarding!;
  for (const s of kite.shells) assert.ok(s.rect[0] > hx0 && s.rect[1] > hz0 && s.rect[2] < hx1 && s.rect[3] < hz1);
});
