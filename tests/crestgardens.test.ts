// Crestmont's gardens (crestgardens.ts, the polish pass): every estate's and mansion's features inside its garden,
// none on another, on the house, the pool, the paving, a hedge, a palm, a car or the people standing about; the
// lawns on the grass only; what's solid under the houses' height, off the streets and the street's planting; each
// style's own features where they belong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESTATE_GARDENS, GARDEN_SOLIDS, HEIGHT, MANSION_GARDENS, SITE_GARDENS, deckOf, extrasOf, loggiaPiers, type FR, type Feat } from '../src/scripts/city3d/crestgardens';
import { COURT_HALF, ESTATES, TALLEST, fountainOf, gardenPalmsOf, hedgesOf, motorCourt, toWorld, type Part } from '../src/scripts/city3d/estates';
import { MANSIONS, TALLEST as MANSION_TALLEST, toWorld as mansionAt } from '../src/scripts/city3d/mansions';
import { CREST_IDLE, GARDENERS } from '../src/scripts/city3d/crestlife';
import { CREST_LAMPS } from '../src/scripts/city3d/crestmont';
import { PALMS } from '../src/scripts/city3d/landscape';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { CIVIC, CLUB, HOTEL, SITE_SOLIDS } from '../src/scripts/city3d/crestsites';

const overlap = (a: FR, b: FR, m = 0) => a[0] < b[2] - m && b[0] < a[2] - m && a[1] < b[3] - m && b[1] < a[3] - m;
const inside = (r: FR, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const norm = (r: number[]): FR => [Math.min(r[0], r[2]), Math.min(r[1], r[3]), Math.max(r[0], r[2]), Math.max(r[1], r[3])];
/** What stands on its own ground (the rest are on the deck or the forecourt's paving by design) */
const ON_PAVING = new Set(['spa', 'umbrella', 'lamp', 'urn', 'cone', 'lemon', 'planter', 'cypress']);
const parts = (e: (typeof ESTATES)[number]) => [e.house.main, e.house.wing, e.house.tower].filter((p): p is Part => !!p);

test('the estates: every feature in its garden, on no other, off the house, the paving, the hedges and the palms', () => {
  for (const [i, e] of ESTATES.entries()) {
    const g = ESTATE_GARDENS[i];
    const lot: FR = [-e.W / 2, -e.D, e.W / 2, 0];
    const deck = deckOf(e);
    const own = g.feats.filter((f) => !ON_PAVING.has(f.kind));
    const fixed: FR[] = [
      ...parts(e).map((p) => norm([p.u0, p.v1, p.u1, p.v0])),
      deck,
      [e.hc - COURT_HALF, e.court[1], e.hc + COURT_HALF, e.court[0]],
      ...hedgesOf(e).map(norm),
      ...gardenPalmsOf(e).map(([u, v]): FR => [u - 0.4, v - 0.4, u + 0.4, v + 0.4]),
    ];
    const motor = motorCourt(e);
    if (motor) fixed.push(motor);
    for (const f of g.feats) assert.ok(f.r[0] >= lot[0] + 0.3 && f.r[2] <= lot[2] - 0.3 && f.r[1] >= lot[1] + 0.3 && f.r[3] <= lot[3] - 1, `${e.id}'s ${f.kind} off its lot`);
    for (const f of own) for (const r of fixed) assert.ok(!overlap(f.r, r, 1e-6), `${e.id}'s ${f.kind} on its house, paving, hedge or a palm`);
    for (const [k, a] of own.entries()) for (const b of own.slice(k + 1)) assert.ok(!overlap(a.r, b.r, 1e-6), `${e.id}'s ${a.kind} on its ${b.kind}`);
    // (the spa and the umbrellas on the deck, the pairs at the door on the forecourt, clear of its fountain)
    const [fu, fv] = fountainOf(e);
    for (const f of g.feats.filter((f) => f.kind === 'spa' || f.kind === 'umbrella')) assert.ok(f.r[0] >= deck[0] && f.r[2] <= deck[2] && f.r[1] >= deck[1] - 1e-9 && f.r[3] <= deck[3], `${e.id}'s ${f.kind} off its deck`);
    for (const f of g.feats.filter((f) => ON_PAVING.has(f.kind) && f.r[3] > e.house.main.v0)) assert.ok(Math.hypot((f.r[0] + f.r[2]) / 2 - fu, (f.r[1] + f.r[3]) / 2 - fv) > 0.9, `${e.id}'s ${f.kind} on its fountain`);
    // The lawns: on its own grass only, off every feature that lies flat or stands
    for (const { r } of g.lawn) {
      for (const f of fixed.slice(0, parts(e).length + 3)) assert.ok(!overlap(r, f, 1e-6), `${e.id}'s lawn on its house or paving`);
      if (motor) assert.ok(!overlap(r, motor, 1e-6), `${e.id}'s lawn on its garage's apron`);
      for (const f of own) assert.ok(!overlap(r, f.r, 1e-6), `${e.id}'s lawn under its ${f.kind}`);
    }
  }
});

test("the estates' features clear of the people standing about there and their barrows", () => {
  for (const [i, e] of ESTATES.entries()) {
    const feats = ESTATE_GARDENS[i].feats.filter((f) => !['lamp', 'umbrella', 'stones', 'gravel'].includes(f.kind));
    const world = (f: Feat): FR => norm([...toWorld(e, f.r[0], f.r[1]), ...toWorld(e, f.r[2], f.r[3])]);
    for (const p of CREST_IDLE)
      if (inside(e.rect, p.x, p.z))
        for (const f of feats) assert.ok(!inside(world(f), p.x, p.z, 0.25) || f.kind === 'spa', `${e.id}: someone (${p.act}) in its ${f.kind}`);
    for (const g of GARDENERS) if (inside(e.rect, g.x, g.z)) for (const f of feats) assert.ok(!inside(world(f), ...g.barrow, 0.3), `${e.id}: a barrow in its ${f.kind}`);
  }
});

test("each style's own: pergolas, gazebos, parterres, statues, fire pits, pool houses and the deep lots' formal gardens", () => {
  const all = (style: string) => ESTATES.flatMap((e, i) => (e.style === style ? ESTATE_GARDENS[i].feats.map((f) => f.kind) : []));
  assert.ok(all('spanish').includes('pergola') && all('spanish').includes('lemon'));
  assert.ok(all('villa').includes('pergola') && all('villa').includes('cypress'));
  assert.ok(all('tudor').includes('birdbath') && all('tudor').includes('roses'));
  assert.ok(all('georgian').includes('statue') && all('georgian').includes('cone') && all('georgian').includes('parterre'));
  assert.ok(all('modern').includes('firepit') && all('modern').includes('reflect'));
  const kinds = ESTATE_GARDENS.flatMap((g) => g.feats.map((f) => f.kind));
  for (const k of ['poolhouse', 'kitchen', 'gazebo', 'fountain', 'citrus', 'spa', 'border', 'stones', 'shrubs', 'bench'] as const) assert.ok(kinds.includes(k), `no ${k} anywhere`);
  // Every estate has its spa, its umbrellas and more besides; every lot of any depth its formal garden past the pool
  for (const g of ESTATE_GARDENS) assert.ok(g.feats.filter((f) => f.kind === 'spa').length === 1 && g.feats.length >= 9);
  for (const [i, e] of ESTATES.entries()) if (e.D > 20) assert.ok(ESTATE_GARDENS[i].feats.some((f) => ['gazebo', 'fountain', 'reflect'].includes(f.kind)), `${e.id}'s formal garden`);
  // A Tudor's bay out from its front, a Spanish house's and a villa's loggia along its back, clear of the loungers' sunbathers
  for (const e of ESTATES) {
    const { bay, loggia } = extrasOf(e);
    assert.equal(!!loggia, e.style === 'spanish' || e.style === 'villa');
    if (e.style === 'tudor') assert.ok(bay, `${e.id} has no bay`);
    if (bay) assert.ok(bay[1] >= e.house.main.v0 - 1e-9 && bay[3] < e.court[0] - 2, `${e.id}'s bay`);
    if (loggia) {
      assert.ok(loggiaPiers(loggia).length >= 3);
      assert.ok(loggia[1] > e.pool[1] - 0.1 + 0.05, `${e.id}'s loggia on its loungers`);
    }
  }
});

test('the mansions: every feature on its pad, on no other, off the house, the forecourt, the pool and the drive', () => {
  for (const [i, m] of MANSIONS.entries()) {
    const g = MANSION_GARDENS[i];
    const own = g.feats.filter((f) => !ON_PAVING.has(f.kind));
    const [pu0, pv0, pu1, pv1] = m.pool;
    const fixed: FR[] = [...m.parts.map((p) => norm([p.u0, p.v1, p.u1, p.v0])), norm([pu0, pv0, pu1, pv1]), norm([m.du - 1.2, -1.5, m.du + 1.2, 0]), norm([m.court[0] + 0.5, m.court[1], m.court[2] - 0.5, m.court[3]])];
    for (const f of g.feats) assert.ok(f.r[0] >= -m.W / 2 + 0.3 && f.r[2] <= m.W / 2 - 0.3 && f.r[1] >= -m.D + 0.3 && f.r[3] <= 0, `${m.id}'s ${f.kind} off its pad`);
    for (const f of own) for (const r of fixed) assert.ok(!overlap(f.r, r, 1e-6), `${m.id}'s ${f.kind} on its house, pool, drive or forecourt`);
    for (const [k, a] of own.entries()) for (const b of own.slice(k + 1)) assert.ok(!overlap(a.r, b.r, 1e-6), `${m.id}'s ${a.kind} on its ${b.kind}`);
    assert.ok(g.feats.some((f) => f.kind === 'olive') && g.lawn.length > 4, `${m.id}'s garden is bare`);
    for (const p of CREST_IDLE)
      if (Math.abs(p.y! - m.y) < 0.6 && inside(m.rect, p.x, p.z))
        for (const f of own) {
          const r = norm([...mansionAt(m, f.r[0], f.r[1]), ...mansionAt(m, f.r[2], f.r[3])]);
          assert.ok(!inside(r, p.x, p.z, 0.2), `${m.id}: someone (${p.act}) in its ${f.kind}`);
        }
  }
  const kinds = MANSION_GARDENS.flatMap((g) => g.feats.map((f) => f.kind));
  for (const k of ['poolhouse', 'pergola', 'firepit', 'statue', 'border'] as const) assert.ok(kinds.includes(k), `no mansion has a ${k}`);
});

test("the gardens' solids: under the houses, off the streets, the street's palms and lamps", () => {
  for (const [k, h] of Object.entries(HEIGHT)) assert.ok(h < Math.min(TALLEST, MANSION_TALLEST) - 3, `a ${k} too tall`);
  assert.ok(GARDEN_SOLIDS.length > 150);
  const streets = PLAN.streets.filter((s) => s.kind !== 'alley');
  for (const s of GARDEN_SOLIDS) {
    assert.ok(s[2] > s[0] && s[3] > s[1]);
    for (const st of streets) assert.ok(distToStreet(st, [(s[0] + s[2]) / 2, (s[1] + s[3]) / 2]) > st.half + 0.5, 'a garden box on a street');
    for (const p of PALMS) assert.ok(!inside([s[0], s[1], s[2], s[3]], p.x, p.z), `a palm in a garden's ${s.join(', ')}`);
    for (const [x, z] of CREST_LAMPS) assert.ok(!inside([s[0], s[1], s[2], s[3]], x, z));
  }
});

test("the landmarks' gardens: the hotel's terrace and pool garden, the civic hall's park, clear of what's there", () => {
  const ids = SITE_GARDENS.map((s) => s.id);
  assert.deepEqual(ids, ['hotel', 'civic', 'club']);
  const there: FR[] = SITE_SOLIDS.map((b) => [b[0], b[1], b[2], b[3]]);
  for (const { id, g } of SITE_GARDENS) {
    const own = g.feats.filter((f) => !['umbrella', 'gravel'].includes(f.kind));
    for (const f of own) for (const t of there) assert.ok(!overlap(f.r, t, 1e-6), `the ${id}'s ${f.kind} in a building`);
    for (const [k, a] of own.entries()) for (const b of own.slice(k + 1)) assert.ok(!overlap(a.r, b.r, 1e-6), `the ${id}'s ${a.kind} on its ${b.kind}`);
    for (const f of g.feats) for (const p of PALMS) assert.ok(!inside(f.r, p.x, p.z, f.kind === 'umbrella' ? 0.3 : 0.5), `the ${id}'s ${f.kind} on a palm`);
    for (const p of CREST_IDLE) for (const f of g.feats) assert.ok(!inside(f.r, p.x, p.z, f.kind === 'umbrella' ? 0.2 : 0.25), `the ${id}'s ${f.kind} on someone (${p.act})`);
  }
  // (the hotel's pool garden on its deck and the terrace behind it; the civic hall's on its pad)
  for (const f of SITE_GARDENS[0].g.feats) assert.ok(f.r[0] >= HOTEL.block[0] && f.r[2] <= HOTEL.block[2] && f.r[1] >= HOTEL.body[3] && f.r[3] <= HOTEL.deck[3] + 0.6);
  for (const f of SITE_GARDENS[1].g.feats) assert.ok(f.r[0] >= CIVIC.pad[0] && f.r[2] <= CIVIC.pad[2] && f.r[1] >= CIVIC.pad[1] && f.r[3] <= CIVIC.pad[3]);
  for (const f of SITE_GARDENS[2].g.feats) assert.ok(f.r[0] >= CLUB.pad[0] && f.r[2] <= CLUB.pad[2] && f.r[1] >= CLUB.pad[1] && f.r[3] <= CLUB.pad[3], `the club's ${f.kind} off its pad`);
});
