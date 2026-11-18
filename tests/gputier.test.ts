// The tier a device starts on (gputier.ts, docs/stability-plan.md "The tier by the graphics"): the screen, memory and
// cores as before, graphics built into the processor a step down, and a step down after the 3D graphics stopped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOST_DAYS, RELOAD_GAP, below, cleanLost, pickTier, reloadOnRestore, sharedGpu, type Device } from '../src/scripts/city3d/gputier';

const NOW = Date.UTC(2026, 10, 14);
const DAY = 86_400_000;
const desk = (o: Partial<Device> = {}): Device => ({ small: false, coarse: false, memory: 8, cores: 12, gpu: '', lost: null, now: NOW, ...o });

// Names as browsers give them (Chrome's ANGLE strings, Firefox's plain ones, Linux's Mesa)
const SHARED = [
  'ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001636) Direct3D11 vs_5_0 ps_5_0, D3D11)', // a Ryzen 5 4000's
  'AMD Radeon(TM) Graphics',
  'ANGLE (AMD, AMD Radeon(TM) RX Vega 10 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'AMD Radeon Vega 8 Graphics',
  'ANGLE (AMD, AMD Radeon 780M Graphics (0x000015BF) Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'AMD Radeon Graphics (renoir, LLVM 15.0.7, DRM 3.49, 6.1.0)',
  'AMD RENOIR (DRM 3.40.0, 5.10.0, LLVM 11.0.1)',
  'ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00005917) Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'Mesa Intel(R) UHD Graphics 620 (KBL GT2)',
  'ANGLE (Intel, Intel(R) Arc(TM) Graphics (0x00007D55) Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
  'ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version)',
];
const CARDS = [
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)', // the card a Ryzen 5 4600H laptop may have
  'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'AMD Radeon Pro 5500M OpenGL Engine',
  'ANGLE (AMD, AMD Radeon RX 6800M Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)',
  'ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Max, Unspecified Version)',
  'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', // the headless checks'
  'Apple GPU', // Safari hides the name
  'WebKit WebGL',
  '',
];

test('graphics built into the processor are told from cards of their own', () => {
  for (const n of SHARED) assert.equal(sharedGpu(n), true, n);
  for (const n of CARDS) assert.equal(sharedGpu(n), false, n);
});

test('the screen, memory and cores pick as they did', () => {
  assert.deepEqual(pickTier(desk({ small: true })), { tier: 'low', why: 'phone screen' });
  assert.deepEqual(pickTier(desk({ coarse: true })), { tier: 'medium', why: 'touch screen' });
  assert.deepEqual(pickTier(desk({ memory: 4 })), { tier: 'medium', why: 'little memory' });
  assert.deepEqual(pickTier(desk({ cores: 4 })), { tier: 'medium', why: 'few cores' });
  assert.deepEqual(pickTier(desk()), { tier: 'high', why: '' });
  // The browser saying nothing of memory or cores counts as plenty, as before
  assert.equal(pickTier(desk({ memory: undefined, cores: undefined })).tier, 'high');
  // A phone on shared graphics stays low (not raised to medium)
  assert.equal(pickTier(desk({ small: true, gpu: SHARED[0] })).tier, 'low');
});

test('a desktop on shared graphics starts on medium; a card or a hidden name keeps high', () => {
  assert.deepEqual(pickTier(desk({ gpu: SHARED[0] })), { tier: 'medium', why: 'shared graphics' });
  assert.equal(pickTier(desk({ gpu: CARDS[0] })).tier, 'high');
  assert.equal(pickTier(desk({ gpu: 'Apple GPU' })).tier, 'high');
});

test('after the 3D graphics stopped, the next start is a tier lower, for a while', () => {
  assert.equal(pickTier(desk({ lost: { tier: 'high', at: NOW - DAY } })).tier, 'medium');
  assert.equal(pickTier(desk({ lost: { tier: 'high', at: NOW - DAY } })).why, 'graphics stopped lately');
  // stopped again on medium: low
  assert.equal(pickTier(desk({ lost: { tier: 'medium', at: NOW - DAY } })).tier, 'low');
  // low stays low
  assert.equal(pickTier(desk({ small: true, lost: { tier: 'low', at: NOW } })).tier, 'low');
  // never raises: a shared GPU's medium, lost on high long ago... and a loss on high doesn't lift a phone
  assert.deepEqual(pickTier(desk({ gpu: SHARED[0], lost: { tier: 'high', at: NOW } })), { tier: 'medium', why: 'shared graphics' });
  assert.equal(pickTier(desk({ small: true, lost: { tier: 'high', at: NOW } })).tier, 'low');
  // after LOST_DAYS it's forgotten
  assert.equal(pickTier(desk({ lost: { tier: 'high', at: NOW - LOST_DAYS * DAY } })).tier, 'high');
  assert.equal(pickTier(desk({ lost: { tier: 'high', at: NOW - (LOST_DAYS * DAY - 1) } })).tier, 'medium');
});

test('a kept loss that is unreadable is none', () => {
  for (const raw of [null, undefined, 'high', 3, [], {}, { tier: 'ultra', at: NOW }, { tier: 'high' }, { tier: 'high', at: NaN }, { tier: 'high', at: NOW + DAY }])
    assert.equal(cleanLost(raw, NOW), null, JSON.stringify(raw));
  assert.deepEqual(cleanLost({ tier: 'medium', at: NOW - DAY, extra: 1 }, NOW), { tier: 'medium', at: NOW - DAY });
});

test('one tier below', () => {
  assert.equal(below('high'), 'medium');
  assert.equal(below('medium'), 'low');
  assert.equal(below('low'), 'low');
});

test('a restored GPU reloads the city, once a minute at most', () => {
  // never before, or nothing readable kept: reload
  for (const last of [null, undefined, '', '  ', 'soon', String(NOW + DAY)]) assert.equal(reloadOnRestore(last, NOW), true, String(last));
  // reloaded just now: stay on the card
  assert.equal(reloadOnRestore(String(NOW - 1000), NOW), false);
  assert.equal(reloadOnRestore(String(NOW - (RELOAD_GAP - 1)), NOW), false);
  // a minute on: again
  assert.equal(reloadOnRestore(String(NOW - RELOAD_GAP), NOW), true);
});
