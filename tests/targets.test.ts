// The picture's render targets (targets.ts, docs/stability-plan.md Phase 2): how each tier smooths its edges on each
// screen, and what a render target holds on the GPU.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEMORY_CEILINGS, SMAA_FROM, antialias, pictureBytes, targetBytes } from '../src/scripts/city3d/targets';

const MB = 1048576;

test('the high tier at a retina screen trades its MSAA for SMAA; below that, as it was', () => {
  // (the tiers as index.ts has them: high draws at up to 2x with 4x MSAA, medium up to 1.5x with none, low 1.25x)
  assert.deepEqual(antialias('high', 2, 2, 4), { msaa: 0, smaa: true });
  assert.deepEqual(antialias('high', 3, 2, 4), { msaa: 0, smaa: true });
  assert.deepEqual(antialias('high', SMAA_FROM, 2, 4), { msaa: 0, smaa: true });
  // A 1x or 1.25x desktop: MSAA and SMAA both, as before; 1.5x: MSAA only, as before
  assert.deepEqual(antialias('high', 1, 2, 4), { msaa: 4, smaa: true });
  assert.deepEqual(antialias('high', 1.25, 2, 4), { msaa: 4, smaa: true });
  assert.deepEqual(antialias('high', 1.5, 2, 4), { msaa: 4, smaa: false });
  // Medium draws no MSAA anywhere and SMAA below 1.5x, as before; a 2x screen is held to its 1.5x
  assert.deepEqual(antialias('medium', 1, 1.5, 0), { msaa: 0, smaa: true });
  assert.deepEqual(antialias('medium', 2, 1.5, 0), { msaa: 0, smaa: false });
  // Phones: neither (they have FXAA)
  assert.deepEqual(antialias('low', 1, 1.25, 0), { msaa: 0, smaa: false });
  assert.deepEqual(antialias('low', 3, 1.25, 0), { msaa: 0, smaa: false });
});

test('what a render target holds: MSAA buffers a sample each, the resolve, the depth', () => {
  const [w, h] = [2880, 1800];
  const px = w * h;
  // A plain half-float target with depth
  assert.equal(targetBytes({ width: w, height: h, bpp: 8, samples: 0, depthBuffer: true, depthTexture: false }), px * 8 + px * 4);
  // With no depth (the composer's second buffer now)
  assert.equal(targetBytes({ width: w, height: h, bpp: 8, samples: 0, depthBuffer: false, depthTexture: false }), px * 8);
  // 4x MSAA: four samples of colour and of depth, and the texture it resolves to
  const msaa = targetBytes({ width: w, height: h, bpp: 8, samples: 4, depthBuffer: true, depthTexture: false });
  assert.equal(msaa, px * 8 + px * 8 * 4 + px * 4 * 4);
  // About 290 MB (277 MiB): what each of the two buffers held at a retina 1440 x 900 before Phase 2
  assert.ok(Math.abs(msaa / MB - 276.9) < 0.5, `${(msaa / MB).toFixed(1)} MiB`);
  // A depth texture beside the colour (the ink's normal pre-pass)
  assert.equal(targetBytes({ width: 10, height: 10, bpp: 4, samples: 0, depthBuffer: false, depthTexture: true }), 100 * 4 + 100 * 4);
  // Nothing for nothing
  assert.equal(targetBytes({ width: 0, height: 0, bpp: 8, samples: 4, depthBuffer: true, depthTexture: true }), 0);
});

test('Phase 2 at a retina 1440 x 900: the buffers a quarter of what they were, SMAA and all', () => {
  const [w, h] = [2880, 1800];
  const before = 2 * targetBytes({ width: w, height: h, bpp: 8, samples: 4, depthBuffer: true, depthTexture: false });
  const { msaa } = antialias('high', 2, 2, 4);
  const after =
    targetBytes({ width: w, height: h, bpp: 8, samples: msaa, depthBuffer: true, depthTexture: false }) +
    targetBytes({ width: w, height: h, bpp: 8, samples: 0, depthBuffer: false, depthTexture: false }) +
    // (SMAA's two RGBA8 targets in their place)
    2 * targetBytes({ width: w, height: h, bpp: 4, samples: 0, depthBuffer: false, depthTexture: false });
  assert.ok(after <= before / 4, `${(before / MB).toFixed(0)} MiB to ${(after / MB).toFixed(0)} MiB`);
});

// The high tier as index.ts's TIERS has it (dpr 2, 4x MSAA, bloom at half, shadow maps 2048): keep these in step
const HIGH = { dpr: 2, msaa: 4, bloomScale: 0.5, shadowMap: 2048 };
const desktop = (screenDpr: number) => {
  const pr = Math.min(screenDpr, HIGH.dpr);
  const aa = antialias('high', screenDpr, HIGH.dpr, HIGH.msaa);
  return pictureBytes({ width: 1440 * pr, height: 900 * pr, msaa: aa.msaa, smaa: aa.smaa, bloomScale: HIGH.bloomScale, shadowMap: HIGH.shadowMap }) / MB;
};

test('the formula gives what the browser measured (Phase 2: 291 MiB at 2x, 175 at 1x, the high tier at 1440 x 900)', () => {
  // (perf.ts targetMemory() over post.ts's targets and the shadow maps, headless; within 3%)
  assert.ok(Math.abs(desktop(2) - 291) / 291 < 0.03, `2x: ${desktop(2).toFixed(1)} MiB`);
  assert.ok(Math.abs(desktop(1) - 175) / 175 < 0.03, `1x: ${desktop(1).toFixed(1)} MiB`);
});

test("the desktop's render targets under their ceilings (the owner's pick: today's and 10%)", () => {
  assert.ok(desktop(2) <= MEMORY_CEILINGS.desktop.retina, `retina: ${desktop(2).toFixed(1)} of ${MEMORY_CEILINGS.desktop.retina} MiB`);
  assert.ok(desktop(1) <= MEMORY_CEILINGS.desktop.standard, `1x: ${desktop(1).toFixed(1)} of ${MEMORY_CEILINGS.desktop.standard} MiB`);
  // (a 3x screen draws at the tier's 2x, the same as retina)
  assert.equal(desktop(3), desktop(2));
});
