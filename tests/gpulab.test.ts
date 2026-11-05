// The GPU lab (gpulab.ts, `?gpu`): its test city is the same on every run, the two loads are the same city, and
// the card says what the numbers mean (no WebGPU, WebGPU that couldn't draw, faster, slower, about the same).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { labCity, report, verdict, type LabDevice, type LabRun } from '../src/scripts/city3d/gpulab';

/** Every mesh's world-space bounds in the city, summed up as one box (instances left to their own counts) */
function shape(load: 'batched' | 'many', low: boolean) {
  const c = labCity(load, low, true);
  c.step(0);
  c.scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let meshes = 0;
  let tris = 0;
  c.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as unknown as THREE.InstancedMesh).isInstancedMesh) return;
    meshes++;
    box.expandByObject(m);
    const g = m.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  c.dispose();
  return { meshes, tris, box };
}

test('the two loads draw the same city, the batched one in a handful of meshes', () => {
  for (const low of [false, true]) {
    const a = shape('batched', low);
    const b = shape('many', low);
    const n = low ? 26 : 36;
    assert.equal(b.meshes, n * n + 1, 'a mesh a building and the ground');
    assert.ok(a.meshes <= 9, `batched: ${a.meshes} meshes`);
    // (the many-draws city shares one box geometry: its triangles counted once a building)
    assert.equal(a.tris, b.tris);
    assert.ok(a.box.min.distanceTo(b.box.min) < 1e-3 && a.box.max.distanceTo(b.box.max) < 1e-3, 'the same bounds (to float32)');
  }
});

test('the test city is the same every time', () => {
  const a = shape('batched', false);
  const b = shape('batched', false);
  assert.deepEqual([a.box.min.toArray(), a.box.max.toArray(), a.tris], [b.box.min.toArray(), b.box.max.toArray(), b.tris]);
});

const dev = (webgpu: boolean): LabDevice => ({ webgpu, adapter: webgpu ? 'test' : undefined, ua: 'test', screen: '1 x 1 @ 1x' });
const run = (renderer: LabRun['renderer'], avg: number, ok = true): LabRun => ({ renderer, load: 'many', ok, error: ok ? undefined : 'lost', fps: 1000 / avg, avg, p95: avg, worst: avg, cpu: 1, draws: 1000, start: 1 });

test('the verdict says what the numbers mean', () => {
  assert.match(verdict(dev(false), [run('webgl', 20)]), /No WebGPU/);
  assert.match(verdict(dev(true), [run('webgl', 20), run('webgpu', 20, false)]), /couldn't draw/);
  assert.match(verdict(dev(true), [run('webgl', 30), run('webgpu', 10)]), /3x as fast/);
  assert.match(verdict(dev(true), [run('webgl', 10), run('webgpu', 20)]), /WebGL was faster/);
  assert.match(verdict(dev(true), [run('webgl', 10), run('webgpu', 10.5)]), /About the same/);
  // (a run that couldn't start says why in the card)
  assert.match(report(dev(true), [run('webgpu', 10, false)], true), /couldn't run: lost/);
});
