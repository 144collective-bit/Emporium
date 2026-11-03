// Drawing his own body from the eye (docs/firstperson-plan.md Phase 0, fpclose.ts): pushed out K times, each
// fragment's depth put back to its true distance exactly, what's nearer than the near plane kept in front of the
// whole world and still in its own order, and the shader patch wrapping main() without losing it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CLOSE, closeDepth, closeMaterial, injectClose, windowDepth } from '../src/scripts/city3d/fpclose';

// The city camera's numbers (index.ts: near 0.5) and the ink pre-pass's far (post.ts: the ink's fadeFar + 5)
const CAMS = [
  [0.5, 760],
  [0.5, 145],
  [0.1, 200],
];

test('windowDepth() is what three`s projection gives', () => {
  for (const [n, f] of CAMS) {
    const cam = new THREE.PerspectiveCamera(60, 1, n, f);
    cam.updateProjectionMatrix();
    for (const d of [n, 0.8, 3, 40, f * 0.9]) {
      const p = new THREE.Vector3(0, 0, -d).applyMatrix4(cam.projectionMatrix);
      assert.ok(Math.abs((p.z + 1) / 2 - windowDepth(d, n, f)) < 1e-9, `${n}/${f} at ${d}`);
    }
  }
});

test('beyond the near plane, a pushed-out fragment writes exactly its true depth', () => {
  for (const [n, f] of CAMS) {
    const F = f / (f - n);
    for (const d of [n * 1.01, 0.6, 0.9, 1.4, 2.5]) {
      if (CLOSE.K * d > f) continue;
      const got = closeDepth(windowDepth(CLOSE.K * d, n, f), F);
      assert.ok(Math.abs(got - windowDepth(d, n, f)) < 1e-7, `${n}/${f} at ${d}: ${got} vs ${windowDepth(d, n, f)}`);
    }
  }
});

test('nearer than the near plane: in front of all the world, and still in order', () => {
  for (const [n, f] of CAMS) {
    const F = f / (f - n);
    // The world's nearest is at the near plane; anything a hair past it has at least this depth
    const world = windowDepth(n * (1 + 2 * CLOSE.eps), n, f);
    let prev = -1;
    for (let d = n / CLOSE.K + 1e-4; d < n; d += 0.002) {
      const w = closeDepth(windowDepth(CLOSE.K * d, n, f), F);
      assert.ok(w < world, `${n}/${f} at ${d.toFixed(3)} in front of the world`);
      assert.ok(w > prev, `${n}/${f} at ${d.toFixed(3)} further back than nearer bits`);
      prev = w;
    }
  }
});

test('monotonic all the way out: nearer always in front of further', () => {
  for (const [n, f] of CAMS) {
    const F = f / (f - n);
    let prev = -1;
    for (let d = n / CLOSE.K + 1e-4; d * CLOSE.K < f; d *= 1.01) {
      const w = closeDepth(windowDepth(CLOSE.K * d, n, f), F);
      assert.ok(w >= prev, `${n}/${f} at ${d.toFixed(4)}`);
      prev = w;
    }
  }
});

test('what the sliver can tell apart: fingers a millimetre apart, a hand-span from the eye', () => {
  // A 24-bit depth buffer: two surfaces 0.001 tiles apart at 0.2 must land on different steps
  const [n, f] = CAMS[0];
  const F = f / (f - n);
  const step = 1 / 2 ** 24;
  for (const d of [n / CLOSE.K + 0.002, 0.1, 0.2, 0.35]) {
    const a = closeDepth(windowDepth(CLOSE.K * d, n, f), F);
    const b = closeDepth(windowDepth(CLOSE.K * (d + 0.001), n, f), F);
    assert.ok(b - a > 4 * step, `at ${d}: ${((b - a) / step).toFixed(1)} steps`);
  }
});

test('the patch wraps main() and keeps the shader`s own', () => {
  const sh = { vertexShader: 'uniform mat4 m;\nvoid main() { gl_Position = vec4(1.0); }', fragmentShader: 'void main ( ) { gl_FragColor = vec4(1.0); }', defines: { A: 1 } as Record<string, unknown> };
  injectClose(sh);
  assert.match(sh.vertexShader, /void closeMain\(\) \{ gl_Position = vec4\(1\.0\); \}/);
  assert.match(sh.vertexShader, /void main\(\) \{\s+closeMain\(\);/);
  assert.match(sh.fragmentShader, /void closeMain\(\) \{ gl_FragColor/);
  assert.match(sh.fragmentShader, /gl_FragDepth = /);
  assert.equal(sh.defines.A, 1);
  assert.equal(sh.defines.CLOSE_K, CLOSE.K.toFixed(1));
  assert.throws(() => injectClose({ vertexShader: '', fragmentShader: 'void main(){}' }));
});

test('a material`s close copy: one per material, its own onBeforeCompile still runs first, its own program key', () => {
  const m = new THREE.MeshToonMaterial({ color: '#ff00ff' });
  const order: string[] = [];
  m.onBeforeCompile = (sh) => {
    order.push('own');
    sh.vertexShader = sh.vertexShader.replace('void main()', '// own\nvoid main()');
  };
  const c = closeMaterial(m);
  assert.equal(closeMaterial(m), c);
  assert.notEqual(c, m);
  const sh = { vertexShader: 'void main() {}', fragmentShader: 'void main() {}', uniforms: {} } as unknown as THREE.WebGLProgramParametersWithUniforms;
  c.onBeforeCompile(sh, null as unknown as THREE.WebGLRenderer);
  assert.deepEqual(order, ['own']);
  assert.match(sh.vertexShader, /\/\/ own\nvoid closeMain\(\)/);
  assert.notEqual(c.customProgramCacheKey(), m.customProgramCacheKey());
});
