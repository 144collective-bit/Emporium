// Degen's footsteps (footsteps.ts, docs/sound-plan.md Phase 1): a step as each foot comes down, by gait and weight,
// a landing, a scuff and a slide's scrape; the surface underfoot from the street plan, the ground's cover and the
// ground's layers; wet in the rain out of doors; the takes never repeating.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COVER_SURFACE, LAYER_SURFACE, STEPS, SURFACES, createFootsteps, gaitOf, onStreet, surfaceAt, type StepInput, type Surface } from '../src/scripts/city3d/footsteps';
import { GROUND_LAYERS } from '../src/scripts/city3d/groundheight';
import { PLAN, raised } from '../src/scripts/city3d/streetplan';
import { EXT } from '../src/scripts/city3d/layout';
import { JETTY } from '../src/scripts/city3d/westlake';
import { HALL } from '../src/scripts/city3d/mall';
import { WALK_SPAWN } from '../src/scripts/city3d/solids';
import { GAITS } from '../src/scripts/city3d/movesim';
import { COVER } from '../src/scripts/city3d/palette';
import { LAND_ROLL } from '../src/scripts/city3d/locomotion';

const DT = 1 / 60;
const base = (o: Partial<StepInput> = {}): StepInput => ({ dt: DT, x: 0, y: 0, z: 0, speed: GAITS.run, face: 0, grounded: true, vy: 0, crouch: 0, sliding: false, feet: [true, false], rain: 0, ...o });
/** A steady walk: the feet alternating down every `half` seconds; the steps it gives over `secs` */
function stride(f: ReturnType<typeof createFootsteps>, secs: number, half: number, o: Partial<StepInput> = {}) {
  const out = [];
  for (let t = 0; t < secs; t += DT) {
    const left = Math.floor(t / half) % 2 === 0;
    out.push(...f.update(base({ feet: [left, !left], ...o })));
  }
  return out;
}
const flat = () => ({ surface: 'paving' as Surface, indoor: false });

test('every cover and every ground layer has a surface', () => {
  for (const c of Object.keys(COVER)) assert.ok(SURFACES.includes(COVER_SURFACE[c as keyof typeof COVER]), c);
  for (const L of GROUND_LAYERS) assert.ok(L.id in LAYER_SURFACE, `layer ${L.id} has no surface`);
});

test('the surface is always one of the surfaces, across the world', () => {
  for (let x = EXT[0]; x <= EXT[1]; x += 29)
    for (let z = EXT[0]; z <= EXT[1]; z += 29) {
      const s = surfaceAt(x, z);
      assert.ok(SURFACES.includes(s.surface), `${x}, ${z}: ${s.surface}`);
      assert.equal(typeof s.indoor, 'boolean');
    }
});

test('the streets are asphalt underfoot, off them is not', () => {
  const streets = PLAN.streets.filter((s) => !raised(s));
  let asphalt = 0;
  for (const s of streets) {
    const [a, b] = s.pts;
    const x = (a[0] + b[0]) / 2;
    const z = (a[1] + b[1]) / 2;
    assert.ok(onStreet(x, z), `${s.id}'s middle is on it`);
    if (surfaceAt(x, z).surface === 'asphalt') asphalt++;
  }
  // (a few streets' middles are on a bridge's deck)
  assert.ok(asphalt > streets.length * 0.85, `${asphalt} of ${streets.length}`);
  assert.equal(onStreet(EXT[0] + 1, EXT[0] + 1), false);
});

test("known places: the walk's start on paving, the park's jetty boards, the mall's tile indoors", () => {
  assert.equal(surfaceAt(WALK_SPAWN.x, WALK_SPAWN.z).surface, 'paving');
  assert.equal(surfaceAt(JETTY.x, (JETTY.z0 + JETTY.z1) / 2, JETTY.y + 0.3).surface, 'wood');
  const [x0, z0, x1, z1] = HALL.rect;
  assert.deepEqual(surfaceAt((x0 + x1) / 2, (z0 + z1) / 2, 0.3), { surface: 'tile', indoor: true });
});

test('a step as each foot comes down, and none standing still', () => {
  const f = createFootsteps({ surface: flat });
  const steps = stride(f, 2, 0.3);
  // (about one each 0.3 s: the first foot's already down as it starts)
  assert.ok(steps.length >= 5 && steps.length <= 7, `${steps.length}`);
  assert.ok(steps.every((s) => s.kind === 'step' && s.surface === 'paving'));
  assert.deepEqual(steps.slice(0, 4).map((s) => s.foot), [1, 0, 1, 0]);
  const still = createFootsteps({ surface: flat });
  assert.equal(stride(still, 2, 0.3, { speed: 0 }).length, 0, 'the idle shifting his weight is silent');
  const air = createFootsteps({ surface: flat });
  assert.equal(stride(air, 2, 0.3, { grounded: false }).length, 0, 'nothing in the air');
  const none = createFootsteps({ surface: flat });
  assert.equal(stride(none, 2, 0.3, { feet: null }).length, 0, 'nothing while nothing poses his legs');
});

test('steps never come closer than the gaps, however the feet flicker', () => {
  const f = createFootsteps({ surface: flat });
  const at: number[] = [];
  let t = 0;
  for (let i = 0; i < 600; i++, t += DT) {
    const out = f.update(base({ feet: [i % 2 === 0, i % 3 === 0] }));
    for (const s of out) if (s.kind === 'step') at.push(t);
  }
  for (let i = 1; i < at.length; i++) assert.ok(at[i] - at[i - 1] >= STEPS.pair - 1e-9, `${at[i] - at[i - 1]}`);
});

test('the gait and how hard he comes down: a creep, a walk, a jog, a sprint', () => {
  assert.equal(gaitOf(GAITS.walk), 'walk');
  assert.equal(gaitOf(GAITS.run), 'jog');
  assert.equal(gaitOf(GAITS.sprint), 'sprint');
  assert.equal(gaitOf(GAITS.run, 1), 'creep');
  const w = (o: Partial<StepInput>) => stride(createFootsteps({ surface: flat }), 1, 0.3, o)[0].weight;
  assert.ok(w({ speed: GAITS.walk }) < w({ speed: GAITS.run }));
  assert.ok(w({ speed: GAITS.run }) < w({ speed: GAITS.sprint }));
  assert.ok(w({ speed: GAITS.run, crouch: 1 }) < w({ speed: GAITS.walk }));
});

test('a landing, heavier for a harder fall, and the feet locking with it quiet', () => {
  const land = (vy: number) => {
    const f = createFootsteps({ surface: flat });
    f.update(base({ grounded: false, feet: [false, false] }));
    return f.update(base({ grounded: true, vy, feet: [true, true] }));
  };
  const soft = land(-2);
  const hard = land(-LAND_ROLL);
  assert.deepEqual(soft.map((s) => s.kind), ['land']);
  assert.ok(hard[0].weight > soft[0].weight);
  assert.equal(hard[0].weight, 1);
  assert.deepEqual(land(-0.5).map((s) => s.kind), ['step'], 'stepping off a kerb is a step, not a landing');
});

test('a scuff pulling up from a run, and a slide scraping as it starts', () => {
  const f = createFootsteps({ surface: flat });
  for (let i = 0; i < 30; i++) f.update(base({ speed: GAITS.sprint, feet: [true, true] }));
  const stop = f.update(base({ speed: 0.2, feet: [true, true] }));
  assert.deepEqual(stop.map((s) => s.kind), ['scuff']);
  assert.equal(f.update(base({ speed: 0.2, feet: [true, true] })).length, 0, 'once');
  const g = createFootsteps({ surface: flat });
  g.update(base({ speed: GAITS.sprint, feet: [true, true] }));
  assert.deepEqual(g.update(base({ speed: GAITS.sprint, sliding: true, crouch: 1, feet: [true, true] })).map((s) => s.kind), ['slide']);
  assert.equal(g.update(base({ speed: GAITS.sprint, sliding: true, crouch: 1, feet: [true, false] })).length, 0, 'no steps while sliding');
});

test('wet in the rain out of doors, dry indoors, and a splash only on hard ground', () => {
  const rainy = (surface: Surface, indoor: boolean) => stride(createFootsteps({ surface: () => ({ surface, indoor }) }), 20, 0.3, { rain: 1 });
  const out = rainy('asphalt', false);
  assert.ok(out.every((s) => s.wet === 1));
  const splashes = out.filter((s) => s.splash).length;
  assert.ok(splashes > out.length * 0.15 && splashes < out.length * 0.5, `${splashes} of ${out.length}`);
  assert.ok(rainy('tile', true).every((s) => s.wet === 0 && !s.splash));
  assert.ok(rainy('grass', false).every((s) => s.wet === 1 && !s.splash));
  assert.ok(stride(createFootsteps({ surface: flat }), 5, 0.3, { rain: STEPS.dryUnder / 2 }).every((s) => s.wet === 0));
});

test('the takes never repeat on a surface, and the detune wanders', () => {
  const out = stride(createFootsteps({ surface: flat }), 30, 0.3);
  for (let i = 1; i < out.length; i++) assert.notEqual(out[i].take, out[i - 1].take);
  assert.ok(out.every((s) => s.take >= 0 && s.take < STEPS.takes && s.detune >= -1 && s.detune <= 1));
  assert.equal(new Set(out.map((s) => s.take)).size, STEPS.takes, 'every take plays');
  // (seeded: the same walk, the same steps)
  assert.deepEqual(stride(createFootsteps({ surface: flat, seed: 3 }), 5, 0.3), stride(createFootsteps({ surface: flat, seed: 3 }), 5, 0.3));
});

test('reset: nothing fires off the jump to a new place', () => {
  const f = createFootsteps({ surface: flat });
  f.update(base({ feet: [false, false], grounded: false }));
  f.reset();
  assert.equal(f.update(base({ feet: [true, true], grounded: true, vy: -6 })).length, 0);
});
