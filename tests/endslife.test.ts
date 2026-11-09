// Endswood's life (endslife.ts, docs/estate-plan.md Phase 7): everyone on the estate's own ground, clear of what's
// solid and of each other, the gallery's walkers and the railing's neighbours up on their floors, the dogs ahead of
// their walkers, the trolley behind its lady, the bikes in their courts, and room for them all in the crowd's spare
// slots with the other districts' chunks' people.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BMX_COURT, BMX_KIDS, ENDS_DOGS, ENDS_IDLE, ENDS_PEOPLE, MOPEDS, MOPED_RUN, TROLLEY, WHEELIE, bmxAt, mopedAt, trolleyAt } from '../src/scripts/city3d/endslife';
import { ENDSWOOD_RECT, ENDS_CROSSINGS, SLAB_Y, SUBWAY_HOLES, WELL } from '../src/scripts/city3d/endswood';
import { ZEBRAS } from '../src/scripts/city3d/endsstreet';
import { endsDeckWall, endsDeckY } from '../src/scripts/city3d/endsdecks';
import { BLOCKS, deckRect } from '../src/scripts/city3d/endsblocks';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { moment } from '../src/scripts/city3d/parklife';
import { SUN_IDLE, SUN_PEOPLE } from '../src/scripts/city3d/sunlife';
import { STRIP_IDLE } from '../src/scripts/city3d/striplife';
import { PORCH_SITTERS } from '../src/scripts/city3d/lot9homes';
import { CAMP_PEOPLE } from '../src/scripts/city3d/lot9camp';

const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const inRect = (r: readonly number[], x: number, z: number) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
const STREETS = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp');
const R = 0.18;
const up = (y: number) => y > SLAB_Y + 0.8;

/** Where everyone stands: on a gallery (its floor, inside its parapets), in the well, or on the ground clear of what's solid */
function placed(id: string, x: number, z: number, y: number, seated = false) {
  if (up(y)) {
    // (a walked floor, endsdecks.ts; or a gallery nobody walks but its neighbours, inside its parapet)
    if (endsDeckY(x, z, y) === y) assert.ok(!endsDeckWall(x, z, y, R), `${id} in a parapet at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    else assert.ok(BLOCKS.some((b) => b.decks.some((d) => d.ys.some((g) => Math.abs(g - y) < 1e-9) && inBox(deckRect(b, d), x, z, -0.25))), `${id} off its floor at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    return;
  }
  if (y < 0) {
    assert.ok(Math.hypot(x - WELL.x, z - WELL.z) < WELL.r - 0.5, `${id} out of the well`);
    return;
  }
  assert.ok(inRect(ENDSWOOD_RECT, x, z), `${id} off the estate at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  for (const h of SUBWAY_HOLES) assert.ok(!inBox(h, x, z, R), `${id} in a subway's cutting`);
  if (!seated) for (const b of SOLIDS) assert.ok(!inBox(b, x, z, R), `${id} in [${b.slice(0, 4).map((v) => v.toFixed(1))}] at ${x.toFixed(1)}, ${z.toFixed(1)}`);
}

test('the walkers, riders and players keep to the estate, clear of everything solid, the walkers off the road but at the zebras', () => {
  const m = moment();
  for (const p of ENDS_PEOPLE)
    for (let t = 0; t < 160; t += 0.7) {
      p.at(t, m);
      placed(p.id, m.x, m.z, m.y, m.clip === 'sit' || m.clip === 'swing');
      if (m.clip === 'walk' && !up(m.y)) {
        const onRoad = STREETS.some((s) => distToStreet(s, [m.x, m.z]) < s.half);
        // (over at the zebras, and over the side streets at the road's junctions)
        const crossing = ZEBRAS.some((x) => Math.abs(m.x - x) < 1.3) || ENDS_CROSSINGS.some((c) => Math.hypot(c.at[0] - m.x, c.at[1] - m.z) < 7);
        if (onRoad) assert.ok(crossing, `${p.id} walking in the road at ${m.x.toFixed(1)}, ${m.z.toFixed(1)}`);
      }
    }
});

test('nobody walks through anybody', () => {
  const ms = ENDS_PEOPLE.map(() => moment());
  for (let t = 0; t < 120; t += 0.5) {
    ENDS_PEOPLE.forEach((p, i) => p.at(t, ms[i]));
    for (let i = 0; i < ms.length; i++)
      for (let j = i + 1; j < ms.length; j++) {
        if (Math.abs(ms[i].y - ms[j].y) > 0.5) continue;
        const d = Math.hypot(ms[i].x - ms[j].x, ms[i].z - ms[j].z);
        assert.ok(d > 0.34, `${ENDS_PEOPLE[i].id} and ${ENDS_PEOPLE[j].id} ${d.toFixed(2)} apart at ${t}`);
      }
  }
  // ...nor through anyone standing about
  for (let t = 0; t < 120; t += 0.5)
    ENDS_PEOPLE.forEach((p, i) => {
      p.at(t, ms[i]);
      for (const s of ENDS_IDLE) if (Math.abs((s.y ?? SLAB_Y) - ms[i].y) < 0.5) assert.ok(Math.hypot(s.x - ms[i].x, s.z - ms[i].z) > 0.4, `${p.id} through someone standing at ${s.x}, ${s.z}`);
    });
});

test('everyone standing about stands somewhere real, apart; the gallery ones on their floors', () => {
  ENDS_IDLE.forEach((s, i) => {
    const y = s.y ?? SLAB_Y;
    placed(`idle ${i}`, s.x, s.z, y, s.act === 'sit');
    for (let j = i + 1; j < ENDS_IDLE.length; j++) {
      const o = ENDS_IDLE[j];
      if (Math.abs((o.y ?? SLAB_Y) - y) < 0.5) assert.ok(Math.hypot(o.x - s.x, o.z - s.z) > 0.5, `idle ${i} and ${j} on top of each other`);
    }
  });
  // (some up on the decks, looking out)
  assert.ok(ENDS_IDLE.filter((s) => up(s.y ?? 0)).length >= 10);
});

test("the dogs ahead of their walkers, the trolley behind its lady, the bikes in their courts, wheelies now and then", () => {
  const w = moment();
  const d = moment();
  assert.ok(ENDS_DOGS.length >= 3);
  for (const dog of ENDS_DOGS)
    for (let t = 0; t < 60; t += 1.3) {
      ENDS_PEOPLE[dog.walker].at(t, w);
      dog.at(t, d);
      // (ahead on the lead: round a corner it's already turned)
      const gap = Math.hypot(d.x - w.x, d.z - w.z);
      assert.ok(gap > 0.4 && gap < 1.6, `a dog ${gap.toFixed(2)} from its walker`);
      placed('a dog', d.x, d.z, d.y);
    }
  const lady = ENDS_PEOPLE.find((p) => p.id === 'ends-lady')!;
  for (let t = 0; t < 400; t += 2.1) {
    lady.at(t, w);
    const c = trolleyAt(t);
    // (pulled behind her: as far as its handle, closer while she turns round at an end of her walk)
    assert.ok(Math.hypot(c.x - w.x, c.z - w.z) <= TROLLEY.behind + 0.05, `the trolley ${Math.hypot(c.x - w.x, c.z - w.z).toFixed(2)} off at ${t}`);
    placed('the trolley', c.x, c.z, SLAB_Y);
  }
  let wheelies = 0;
  for (let k = 0; k < BMX_KIDS; k++)
    for (let t = 0; t < 30; t += 0.25) {
      const b = bmxAt(k, t);
      assert.ok(inRect(BMX_COURT, b.x, b.z) && b.pitch >= 0 && b.pitch <= WHEELIE.lift + 1e-9);
      if (b.pitch > 0.2) wheelies++;
    }
  assert.ok(wheelies > 10);
  for (let k = 0; k < MOPEDS; k++)
    for (let t = 0; t < 30; t += 0.25) {
      const p = mopedAt(k, t);
      assert.ok(inRect(MOPED_RUN, p.x, p.z));
    }
});

test("room for them all in the crowd's spare slots (index.ts TIERS reserve), with the other chunks' people", () => {
  const RESERVE = { high: 320, low: 160 };
  const all = SUN_IDLE.length + SUN_PEOPLE.length + STRIP_IDLE.length + PORCH_SITTERS.length + CAMP_PEOPLE.length + ENDS_IDLE.length + ENDS_PEOPLE.length;
  assert.ok(all <= RESERVE.high, `${all} people for ${RESERVE.high} slots`);
  // (phones get every other idle person and the movers' trimmed half: about half)
  assert.ok(Math.ceil(all / 2) + 10 <= RESERVE.low, `about ${Math.ceil(all / 2)} people on phones for ${RESERVE.low} slots`);
});
