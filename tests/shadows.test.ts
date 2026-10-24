// The near-only shadows (shadows.ts): the fade sits well inside the shadow box whatever the sun does, even with the
// fixed map's box lagging behind; the fixed map is drawn again only when it's due; the shader chunks take the patch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ShaderChunk } from 'three';
import { DIR_SHADOW_LINE, MARGIN, SHADOW, SHADOW_GLSL, markDrawn, newFixedMap, patchShadowChunks, shadowCentre, shadowFade, staticDue } from '../src/scripts/city3d/shadows';

/** sky.ts's sun (and moon) direction at an hour */
function sunAt(h: number): [number, number, number] {
  const ang = ((h - 6) / 24) * Math.PI * 2;
  const elev = Math.sin(ang);
  const night = 1 - Math.min(1, Math.max(0, (elev + 0.22) / 0.28));
  const az = ang * 0.5 + 0.6;
  const e = night > 0.5 ? 0.75 : Math.max(0.12, elev);
  const d: [number, number, number] = [Math.cos(az) * Math.cos(e), Math.sin(e), Math.sin(az) * Math.cos(e)];
  const l = Math.hypot(...d);
  return [d[0] / l, d[1] / l, d[2] / l];
}
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: number[]) => a.map((v) => v / Math.hypot(...a));
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

test('everything the fade lets show is inside the box, at every hour, the fixed map lagging as far as it may', () => {
  assert.ok(SHADOW.fade0 < SHADOW.fade1 && MARGIN > SHADOW.move, 'room between the fade and the box');
  for (let h = 0; h < 24; h += 0.25) {
    const dir = sunAt(h);
    const sx = norm(cross([0, 1, 0], dir));
    const sy = cross(dir, sx);
    // The box's middle a whole `move` off the fade's (either way), a wall up to 8 tiles high anywhere within `fade1`
    for (let k = 0; k < 16; k++) {
      const lag = [Math.cos((k * Math.PI) / 8) * SHADOW.move, 0, Math.sin((k * Math.PI) / 8) * SHADOW.move];
      for (let a = 0; a < 32; a++)
        for (const y of [0, 4, 8]) {
          const p = [Math.cos((a * Math.PI) / 16) * SHADOW.fade1 - lag[0], y, Math.sin((a * Math.PI) / 16) * SHADOW.fade1 - lag[2]];
          assert.ok(Math.abs(dot(p, sx)) < SHADOW.reach && Math.abs(dot(p, sy)) < SHADOW.reach, `out of the box at ${h}h`);
        }
    }
  }
});

test('the box goes ahead of the camera; the fade is full near it and gone past fade1', () => {
  const c = shadowCentre({ x: 10, z: 5 }, { x: 0, z: -3 }, { x: 0, z: 0 });
  assert.deepEqual([c.x, c.z], [10, 5 - SHADOW.ahead]);
  // Looking straight down, still somewhere sensible
  const d = shadowCentre({ x: 1, z: 2 }, { x: 0, z: 0 }, { x: 0, z: 0 });
  assert.ok(Number.isFinite(d.x) && Number.isFinite(d.z));
  assert.equal(shadowFade(10, 5, c), 1);
  assert.equal(shadowFade(10 + SHADOW.fade0 - 0.01, c.z, c), 1);
  assert.equal(shadowFade(10 + SHADOW.fade1 + 0.01, c.z, c), 0);
  const mid = shadowFade(10 + (SHADOW.fade0 + SHADOW.fade1) / 2, c.z, c);
  assert.ok(mid > 0.4 && mid < 0.6);
});

test('the fixed map: drawn at first, again once moved, turned, stale or invalidated, never otherwise', () => {
  const m = newFixedMap();
  const up: [number, number, number] = [0, 1, 0];
  assert.ok(staticDue(m, 0, 0, 0, up, 0));
  markDrawn(m, 0, 0, 0, up, 0);
  assert.ok(!staticDue(m, SHADOW.move * 0.9, 0, 0, up, SHADOW.refresh * 0.9), 'a small step: no');
  assert.ok(staticDue(m, SHADOW.move * 1.1, 0, 0, up, 0), 'moved');
  const tilt: [number, number, number] = [Math.sin(SHADOW.turn * 1.5), Math.cos(SHADOW.turn * 1.5), 0];
  assert.ok(staticDue(m, 0, 0, 0, tilt, 0), 'the sun turned');
  const nudge: [number, number, number] = [Math.sin(SHADOW.turn * 0.5), Math.cos(SHADOW.turn * 0.5), 0];
  assert.ok(!staticDue(m, 0, 0, 0, nudge, 0));
  assert.ok(staticDue(m, 0, 0, 0, up, SHADOW.refresh + 0.1), 'stale');
  m.drawn = false;
  assert.ok(staticDue(m, 0, 0, 0, up, 0), 'invalidated');
});

test("three's shader chunks take the patch, once; the shader's sum uses the same numbers", () => {
  const chunks = { ...(ShaderChunk as unknown as Record<string, string>) };
  assert.ok(chunks.lights_fragment_begin.includes(DIR_SHADOW_LINE), "three's directional shadow line is where it was");
  assert.ok(patchShadowChunks(chunks));
  assert.ok(!chunks.lights_fragment_begin.includes(DIR_SHADOW_LINE) && chunks.lights_fragment_begin.includes('cityShadow( geometryPosition )'));
  assert.ok(chunks.shadowmap_pars_fragment.endsWith(SHADOW_GLSL));
  const once = chunks.shadowmap_pars_fragment;
  assert.ok(patchShadowChunks(chunks));
  assert.equal(chunks.shadowmap_pars_fragment, once, 'patched once only');
  for (const n of [SHADOW.ahead, SHADOW.fade0, SHADOW.fade1]) assert.ok(SHADOW_GLSL.includes(n.toFixed(2)));
});
