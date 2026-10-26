// Uptown at street level (streetlevel.ts, docs/finance-plan.md Phase 7): every tower's base sides facing a street take
// its character, the shops along them named from fixed made-up lists, the sidewalk's dressing in the margins (never on
// the sidewalk, a street, a lay-by or a lane), the grand lobbies' sculptures and doormen, the galleria over the lanes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRESSING, DRESS_SIZE, FRONTAGES, GALLERIAS, GALLERY, SCULPTURES, SHOP_NAMES, STREET_PEOPLE, STREETLEVEL_SOLIDS, UNIT, characterOf } from '../src/scripts/city3d/streetlevel';
import { HIGHRISES, TOWER_BLOCKS } from '../src/scripts/city3d/highrise';
import { LAYBYS, UPTOWN_LANES, laybyRect } from '../src/scripts/city3d/uptown';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';

type Pt = [number, number];
const inRect = (p: Pt, r: number[], m = 0) => p[0] > r[0] - m && p[0] < r[2] + m && p[1] > r[1] - m && p[1] < r[3] + m;
function inPoly(poly: Pt[], p: Pt) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [u, v] = [poly[i], poly[j]];
    if (u[1] > p[1] !== v[1] > p[1] && p[0] < ((v[0] - u[0]) * (p[1] - u[1])) / (v[1] - u[1]) + u[0]) inside = !inside;
  }
  return inside;
}

test('each street its character: luxe on the avenues, dining on the cross streets and lanes, local on the side streets', () => {
  assert.equal(characterOf('ew3', 'avenue'), 'luxe');
  assert.equal(characterOf('ew0', 'avenue'), 'luxe');
  assert.equal(characterOf('ew1', 'street'), 'dining');
  assert.equal(characterOf('uptown-diag', 'street'), 'dining');
  assert.equal(characterOf('uptown-ns1', 'street'), 'local');
  assert.equal(characterOf('x', 'alley'), 'dining');
  const chars = new Set(FRONTAGES.map((f) => f.char));
  for (const c of ['luxe', 'dining', 'local'] as const) assert.ok(chars.has(c), `some frontage is ${c}`);
  // Nearly every tower with a base or podium has shops facing some street
  const pods = HIGHRISES.filter((h) => h.parts[0].skin === 'podium');
  const shops = pods.filter((t) => FRONTAGES.some((f) => f.tower === t.id && f.units.length));
  assert.ok(shops.length >= pods.length - 2, `${pods.length - shops.length} without shops`);
});

test("the shops: a unit's width apart along their walls, named from their character's list, none at a lobby's door", () => {
  for (const ch of ['luxe', 'dining', 'local'] as const) {
    assert.equal(new Set(SHOP_NAMES[ch]).size, SHOP_NAMES[ch].length, `${ch}'s names unique`);
    for (const n of SHOP_NAMES[ch]) assert.ok(n.length <= 16 && !/[0-9$%]/.test(n), `${n}: short, no numbers or prices`);
  }
  for (const f of FRONTAGES) {
    const t = HIGHRISES.find((h) => h.id === f.tower)!;
    for (const u of f.units) {
      assert.ok(u.name >= 0 && u.name < SHOP_NAMES[f.char as 'luxe'].length);
      if (f.side === t.front) assert.ok(Math.hypot(u.at[0] - t.door[0], u.at[1] - t.door[1]) >= 1.9, `${t.id}'s shop over its door`);
    }
    for (let i = 1; i < f.units.length; i++) assert.ok(f.units[i].u - f.units[i - 1].u >= UNIT - 1e-9);
  }
});

test("the sidewalk's dressing stands in the margins: on its block, off every street and its sidewalk, the lay-bys and the lanes", () => {
  assert.ok(DRESSING.length > 40, `${DRESSING.length} pieces`);
  for (const k of ['table', 'umbrella', 'planter', 'aboard'] as const) assert.ok(DRESSING.some((d) => d.kind === k), `some ${k}`);
  for (const d of DRESSING) {
    const [across, along] = DRESS_SIZE[d.kind];
    const r = Math.max(across, along);
    const blk = TOWER_BLOCKS.find((b) => inPoly(b.poly, [d.x, d.z]));
    assert.ok(blk, `${d.kind} at ${d.x.toFixed(1)}, ${d.z.toFixed(1)} on a block`);
    for (const s of PLAN.streets) assert.ok(distToStreet(s, [d.x, d.z]) > s.half + 0.8 + Math.min(across, along) - 0.05, `${d.kind} at ${d.x.toFixed(1)}, ${d.z.toFixed(1)} on ${s.id}`);
    for (const l of LAYBYS) assert.ok(!inRect([d.x, d.z], laybyRect(l), r * 0.5), `${d.kind} in ${l.id}`);
    for (const l of UPTOWN_LANES) assert.ok(!inRect([d.x, d.z], l), `${d.kind} in a lane`);
    // Clear of every tower's walls and its door
    for (const t of HIGHRISES) {
      const p = t.parts[0].foot ?? t.parts[0].rect;
      assert.ok(!inRect([d.x, d.z], p, -0.05), `${d.kind} inside ${t.id}`);
      assert.ok(Math.hypot(d.x - t.door[0], d.z - t.door[1]) > 2.4, `${d.kind} at ${t.id}'s door`);
    }
  }
});

test('the grand lobbies: a doorman at each, a sculpture beside most; the galleria over each lane on columns at its edges', () => {
  const grand = HIGHRISES.filter((t) => t.lobby === 'grand');
  assert.ok(grand.length >= 3);
  assert.ok(SCULPTURES.length >= 2);
  assert.ok(STREET_PEOPLE.filter((p) => p.act === 'look').length >= grand.length);
  assert.ok(STREET_PEOPLE.filter((p) => p.act === 'sit').length > 10, 'diners');
  assert.equal(GALLERIAS.length, UPTOWN_LANES.length);
  for (const g of GALLERIAS) for (const [x] of g.columns) assert.ok(x - g.rect[0] < 0.3 || g.rect[2] - x < 0.3, 'columns at the lane\'s edges');
  assert.ok(GALLERY.y > 3.5, 'over a walker');
  // All of it solid, in the city's solids
  for (const b of STREETLEVEL_SOLIDS) assert.ok(SOLIDS.includes(b));
});
