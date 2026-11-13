// Endswood carried west, its life (endswestlife.ts, docs/ends-west-plan.md Phase 4, the owner's picks: a busy estate,
// the washing out and the kids' things out front, the porch lights on at night): everyone on the extension's own
// ground, clear of what's solid (the city's, the terraces', the estate round them) and of each other, the walkers off
// the Close but at the zebra and the lanes' mouth, the dogs ahead of their walkers, the washing in its back garden,
// the bikes by their front walls, a pool under every porch light, and room for them all in the crowd's spare slots
// with the other districts' chunks' people.
import { HOME } from '../src/scripts/city3d/home';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AIRER,
  CLOSE_OFF,
  FRONT_BITS,
  LANE_MOUTH,
  LATE_UNITS,
  PORCH_POOLS,
  WASHING,
  WEST_DOGS,
  WEST_IDLE,
  WEST_PEOPLE,
} from '../src/scripts/city3d/endswestlife';
import { GARDENS, PATHS, GREENS, WEST_BLOCKS, LINK_BLOCKS, ZEBRA, WEST_LAMPS } from '../src/scripts/city3d/endswest';
import { HOUSES, TERRACES, TERRACE_SOLIDS, fencesOf } from '../src/scripts/city3d/endsterraces';
import { KICKABOUT, STREET_W_SOLIDS, UNITS_W } from '../src/scripts/city3d/endsweststreet';
import { ROAD_HALF, ROAD_Z, SLAB_Y } from '../src/scripts/city3d/endswood';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { moment } from '../src/scripts/city3d/parklife';
import { ENDS_IDLE, ENDS_PEOPLE } from '../src/scripts/city3d/endslife';
import { SUN_IDLE, SUN_PEOPLE } from '../src/scripts/city3d/sunlife';
import { STRIP_IDLE } from '../src/scripts/city3d/striplife';
import { PORCH_SITTERS } from '../src/scripts/city3d/lot9homes';
import { CAMP_PEOPLE } from '../src/scripts/city3d/lot9camp';
import { sodiumShare } from '../src/scripts/city3d/lampmix';

const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const R = 0.18;
// (the city's solids near the extension only: checking every box in the city at every step is slow)
const ALL_SOLIDS = [...SOLIDS, ...TERRACE_SOLIDS, ...STREET_W_SOLIDS].filter((b) => b[2] > -210 && b[0] < -100 && b[3] > 330 && b[1] < 470);
const LAND = [...WEST_BLOCKS, ...LINK_BLOCKS].map((b) => b.rect);
const onRoad = (z: number) => Math.abs(z - ROAD_Z) < ROAD_HALF;

/** On the extension's blocks or the Close's sidewalks, and clear of everything solid unless seated on it */
function placed(id: string, x: number, z: number, seated = false) {
  const onLand = LAND.some((r) => inBox(r, x, z, 0.01)) || Math.abs(z - ROAD_Z) < ROAD_HALF + 0.8;
  assert.ok(onLand, `${id} off the estate at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  if (!seated) for (const b of ALL_SOLIDS) assert.ok(!inBox(b, x, z, R), `${id} in [${b.slice(0, 4).map((v) => v.toFixed(1))}] at ${x.toFixed(1)}, ${z.toFixed(1)}`);
}

test('the walkers and players keep to the estate, clear of everything solid, off the Close but at the zebra and the lanes', () => {
  const m = moment();
  for (const p of WEST_PEOPLE)
    for (let t = 0; t < 200; t += 0.6) {
      p.at(t, m);
      assert.equal(m.y >= SLAB_Y, true);
      placed(p.id, m.x, m.z, m.clip === 'swing');
      if (m.clip === 'walk' && onRoad(m.z)) assert.ok(Math.abs(m.x - ZEBRA.x) < ZEBRA.half || Math.abs(m.x - LANE_MOUTH) < 2, `${p.id} walking in the Close at ${m.x.toFixed(1)}`);
    }
  // (the Close's walkers between the kerb and the lamps)
  assert.ok(CLOSE_OFF > ROAD_HALF && CLOSE_OFF < ROAD_HALF + 0.45);
});

test('nobody walks through anybody, nor through anyone standing about', () => {
  const ms = WEST_PEOPLE.map(() => moment());
  for (let t = 0; t < 160; t += 0.5) {
    WEST_PEOPLE.forEach((p, i) => p.at(t, ms[i]));
    for (let i = 0; i < ms.length; i++) {
      for (let j = i + 1; j < ms.length; j++) {
        const d = Math.hypot(ms[i].x - ms[j].x, ms[i].z - ms[j].z);
        assert.ok(d > 0.34, `${WEST_PEOPLE[i].id} and ${WEST_PEOPLE[j].id} ${d.toFixed(2)} apart at ${t}`);
      }
      for (const s of WEST_IDLE) assert.ok(Math.hypot(s.x - ms[i].x, s.z - ms[i].z) > 0.4, `${WEST_PEOPLE[i].id} through someone standing at ${s.x.toFixed(1)}, ${s.z.toFixed(1)}`);
    }
  }
});

test('everyone standing about stands somewhere real, apart: on doorsteps, at the parade, in gardens, on benches', () => {
  WEST_IDLE.forEach((s, i) => {
    placed(`idle ${i}`, s.x, s.z, s.act === 'sit');
    for (let j = i + 1; j < WEST_IDLE.length; j++) {
      const o = WEST_IDLE[j];
      assert.ok(Math.hypot(o.x - s.x, o.z - s.z) > 0.5, `idle ${i} and ${j} on top of each other`);
    }
  });
  // (a busy estate: neighbours out on a fair few doorsteps, and kids at play)
  assert.ok(WEST_IDLE.length >= 25, `${WEST_IDLE.length} standing about`);
  assert.ok(WEST_PEOPLE.filter((p) => p.scale).length >= 8, 'kids at play');
});

test('the dogs ahead of their walkers on the lead, clear of what is solid', () => {
  const w = moment();
  const d = moment();
  assert.ok(WEST_DOGS.length >= 3);
  for (const dog of WEST_DOGS)
    for (let t = 0; t < 90; t += 1.1) {
      WEST_PEOPLE[dog.walker].at(t, w);
      dog.at(t, d);
      const gap = Math.hypot(d.x - w.x, d.z - w.z);
      assert.ok(gap > 0.4 && gap < 1.6, `a dog ${gap.toFixed(2)} from its walker`);
      placed('a dog', d.x, d.z);
    }
});

test("the washing in its own back garden, clear of the fences; the kids' things by their own front, on the path or the green", () => {
  assert.ok(WASHING.length >= 10 && WASHING.some((w) => w.kind === 'rotary') && WASHING.some((w) => w.kind === 'line'));
  const fences = TERRACES.flatMap((T) => fencesOf(T));
  for (const w of WASHING) {
    const garden = GARDENS.find((g) => w.at.every(([x, z]) => inBox(g, x, z, -0.2)));
    assert.ok(garden, `${w.house}'s washing out of the gardens`);
    const reach = w.kind === 'rotary' ? AIRER.r + 0.05 : 0.1;
    for (const [x, z] of w.at)
      for (const [a, c] of fences) {
        // (its pole or posts clear of every fence, a rotary's arms too)
        const [x0, z0, x1, z1] = [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1])];
        assert.ok(!inBox([x0, z0, x1, z1], x, z, reach), `${w.house}'s washing on a fence`);
      }
  }
  assert.ok(FRONT_BITS.some((f) => f.kind === 'bike') && FRONT_BITS.some((f) => f.kind !== 'bike' && f.kind !== 'scooter'));
  for (const f of FRONT_BITS) {
    assert.ok([...PATHS, ...GREENS].some((r) => inBox(r, f.at[0], f.at[1], 0.01)), `${f.house}'s ${f.kind} off the paths and greens`);
    if (f.kind === 'bike' || f.kind === 'scooter') for (const b of TERRACE_SOLIDS) assert.ok(!inBox(b, f.at[0], f.at[1], 0.05), `${f.house}'s ${f.kind} in a bin or porch`);
  }
});

test("a pool under every porch light and the late shops' (the corner shop, the chippy, not the shut unit); the green lit in sodium", () => {
  // (and one on Degen's driveway, under the lamp over his garage door: home.ts)
  assert.equal(PORCH_POOLS.length, HOUSES.length + LATE_UNITS.length + 1);
  assert.ok(PORCH_POOLS.some(([x, z]) => inBox(HOME.drive, x, z, 0.01)));
  assert.ok(LATE_UNITS.every((k) => !UNITS_W[k].shut));
  for (const [x, z] of PORCH_POOLS) assert.ok([...PATHS, ...LAND, HOME.drive].some((r) => inBox(r, x, z, 0.01)));
  const green = WEST_LAMPS.filter(([x, z]) => x > KICKABOUT[0] - 3 && z > KICKABOUT[1] && z < KICKABOUT[3]);
  assert.ok(green.length >= 2 && green.every(([x, z]) => sodiumShare(x, z) > 0.99));
  // (their heads out over the green: a lamp's arm points along cos ry, -sin ry; world.ts buildLamps())
  for (const [x, z, ry] of green) {
    const [hx, hz] = [x + Math.cos(ry) * 0.6, z - Math.sin(ry) * 0.6];
    assert.ok(hx > x && hx > KICKABOUT[0] - 0.8 && hz > KICKABOUT[1] && hz < KICKABOUT[3], `a green lamp's head at ${hx.toFixed(1)}, ${hz.toFixed(1)}`);
  }
});

test("room for them all in the crowd's spare slots (index.ts TIERS reserve), with the other chunks' people", () => {
  const RESERVE = { high: 360, low: 180 };
  const all = SUN_IDLE.length + SUN_PEOPLE.length + STRIP_IDLE.length + PORCH_SITTERS.length + CAMP_PEOPLE.length + ENDS_IDLE.length + ENDS_PEOPLE.length + WEST_IDLE.length + WEST_PEOPLE.length;
  assert.ok(all <= RESERVE.high, `${all} people for ${RESERVE.high} slots`);
  assert.ok(Math.ceil(all / 2) + 10 <= RESERVE.low, `about ${Math.ceil(all / 2)} people on phones for ${RESERVE.low} slots`);
});
