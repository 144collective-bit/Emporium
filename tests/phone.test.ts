// Phones, sharper and smoother (phone.ts): which phones are strong, dynamic resolution climbing while frames keep
// 60fps and stepping down when the GPU can't (never for the CPU's slowness), a failed level waiting before it's tried
// again, and the sharpening following the stretch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHONES, RES, createResolution, phoneClass, sharpness } from '../src/scripts/city3d/phone';

const IPHONE_15 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPHONE_26 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const IPHONE_OLD = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

test('recent iPhones and every iPad are strong, old iPhones weak', () => {
  assert.equal(phoneClass({ ua: IPHONE_15, touch: 5, gpu: 'Apple GPU' }), 'strong');
  assert.equal(phoneClass({ ua: IPHONE_26, touch: 5, gpu: 'Apple GPU' }), 'strong');
  assert.equal(phoneClass({ ua: IPHONE_OLD, touch: 5, gpu: 'Apple GPU' }), 'weak');
  assert.equal(phoneClass({ ua: IPAD, touch: 5 }), 'strong');
});

test('Android phones by their GPU and memory', () => {
  const at = (gpu: string, memory = 8) => phoneClass({ ua: ANDROID, touch: 5, gpu, memory, cores: 8 });
  assert.equal(at('Adreno (TM) 740'), 'strong');
  assert.equal(at('Adreno (TM) 830'), 'strong');
  assert.equal(at('Adreno (TM) 660'), 'strong');
  assert.equal(at('Adreno (TM) 619'), 'weak');
  assert.equal(at('Adreno (TM) 710'), 'weak');
  assert.equal(at('Mali-G715-Immortalis MC11'), 'strong');
  assert.equal(at('Mali-G78 MP20'), 'strong');
  assert.equal(at('Mali-G57 MC2'), 'weak');
  assert.equal(at('Mali-G610 MC6'), 'weak');
  assert.equal(at('Samsung Xclipse 940'), 'strong');
  assert.equal(at('PowerVR Rogue GE8320'), 'weak');
  // A strong GPU with little memory, and a GPU nobody can name
  assert.equal(at('Adreno (TM) 740', 2), 'weak');
  assert.equal(phoneClass({ ua: ANDROID, touch: 5, memory: 8, cores: 8 }), 'strong');
  assert.equal(phoneClass({ ua: ANDROID, touch: 5 }), 'weak');
});

test('strong phones draw sharper and fuller than weak ones', () => {
  assert.ok(PHONES.strong.dpr.max > PHONES.weak.dpr.max);
  assert.ok(PHONES.strong.cars > PHONES.weak.cars && PHONES.strong.walkers > PHONES.weak.walkers);
  assert.ok(PHONES.weak.far < PHONES.strong.far);
  for (const p of Object.values(PHONES)) assert.ok(p.dpr.min <= p.dpr.start && p.dpr.start <= p.dpr.max);
});

/** Runs `seconds` of frames at `dt` each (seconds), `cpu` of work each, collecting the scales the controller set */
function run(res: ReturnType<typeof createResolution>, from: number, seconds: number, dt: number | ((scale: number) => number), cpu = 0.004) {
  let now = from;
  const seen: number[] = [];
  while (now < from + seconds) {
    const d = typeof dt === 'number' ? dt : dt(res.scale);
    now += d;
    const s = res.frame(d, cpu, now);
    if (s !== null) seen.push(s);
  }
  return { now, seen };
}

test('fast frames climb a step at a time to the top and stay in range', () => {
  const res = createResolution({ min: 1, start: 1.25, max: 2 });
  const { seen } = run(res, 0, 30, 1 / 60);
  assert.equal(res.scale, 2);
  for (let i = 1; i < seen.length; i++) assert.ok(Math.abs(seen[i] - seen[i - 1] - RES.step) < 1e-9);
  assert.ok(seen.every((s) => s >= 1 && s <= 2));
});

test('a GPU too slow for the pixels steps down to the bottom, no further', () => {
  const res = createResolution({ min: 1, start: 2, max: 2 });
  run(res, 0, 30, 1 / 30);
  assert.equal(res.scale, 1);
  assert.ok(res.atMin());
});

test("slow frames the CPU spent aren't the pixels' fault", () => {
  const res = createResolution({ min: 1, start: 1.5, max: 2 });
  run(res, 0, 20, 1 / 30, 0.03);
  assert.equal(res.scale, 1.5);
});

test('it settles where the GPU keeps up, and a failed level waits longer each time', () => {
  // The GPU keeps 60fps up to 1.5 and drops to 40 above it
  const gpu = (scale: number) => (scale > 1.5 + 1e-9 ? 1 / 40 : 1 / 60);
  const res = createResolution({ min: 1, start: 1, max: 2 });
  const { seen } = run(res, 0, 120, gpu);
  assert.ok(res.scale <= 1.625 && res.scale >= 1.375, `settled at ${res.scale}`);
  // Each try at 1.625 comes later than the one before (4, 8, 16 ... seconds)
  const tries = seen.filter((s) => Math.abs(s - 1.625) < 1e-9).length;
  assert.ok(tries >= 2 && tries <= 5, `${tries} tries in two minutes`);
});

test('the sharpening follows the stretch, within its range', () => {
  assert.ok(sharpness(3, 1) > sharpness(3, 2));
  assert.equal(sharpness(2, 2), 0.2);
  assert.ok(sharpness(3, 0.5) <= 0.8);
});
