// The draw breakdown under ?fps (drawrows.ts, docs/phone-far-plan.md Phase 1): each draw of a frame put down to what
// made it, the pass it's in and how far off it is
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { captureDraws, drawName, makerOf } from "../src/scripts/city3d/drawrows";

const box = new THREE.BoxGeometry(1, 1, 1);
const mesh = (name = "", color = "#ff0000") => {
  const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color }));
  m.name = name;
  return m;
};

test("the draw breakdown names a draw by its mesh, its nearest named parent, or its material", () => {
  const g = new THREE.Group();
  g.name = "emporium-far";
  const inner = new THREE.Group();
  const a = mesh();
  inner.add(a);
  g.add(inner);
  assert.equal(drawName(a, a.material), "emporium-far");
  const b = mesh("sign");
  g.add(b);
  assert.equal(drawName(b, b.material), "sign");
  const c = mesh("", "#00ff00");
  assert.equal(drawName(c, c.material), "?MeshBasicMaterial #00ff00");
});

test("the draw breakdown counts each draw by what made it and its pass, and the far ones", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  camera.updateMatrixWorld();
  const pre = new THREE.PerspectiveCamera();
  const sun = new THREE.OrthographicCamera();
  const near = mesh("near-thing");
  near.position.set(0, 0, -10);
  const far = new THREE.Group();
  far.name = "jet";
  const parts = [mesh(), mesh(), mesh()];
  parts.forEach((p, i) => {
    p.position.set(i, 0, -300);
    far.add(p);
  });
  scene.add(near, far);
  scene.updateMatrixWorld(true);
  const quad = new THREE.Scene();
  const q = mesh("quad");
  quad.add(q);
  const calls: string[] = [];
  const renderer = {
    renderBufferDirect(
      _c: THREE.Camera,
      _s: THREE.Object3D,
      _g: THREE.BufferGeometry,
      _m: THREE.Material,
      o: THREE.Object3D,
      _gr?: unknown,
    ) {
      calls.push(o.name);
    },
  };
  const own = renderer.renderBufferDirect;
  const draw = (cam: THREE.Camera, sc: THREE.Object3D, o: THREE.Mesh) =>
    renderer.renderBufferDirect(
      cam,
      sc,
      o.geometry,
      o.material as THREE.Material,
      o,
      null,
    );
  const out = captureDraws(
    renderer,
    scene,
    camera,
    () => {
      draw(pre, scene, near);
      draw(sun, scene, near);
      draw(camera, scene, near);
      for (const p of parts) draw(camera, scene, p);
      draw(camera, quad, q);
    },
    90,
  );
  // (the frame still drew: every call went on to the renderer's own)
  assert.equal(calls.length, 7);
  assert.equal(renderer.renderBufferDirect, own);
  assert.equal(out.total, 7);
  assert.deepEqual(out.byPass, { main: 4, outline: 1, shadow: 1, post: 1 });
  assert.equal(out.far, 3);
  const { what, pass, draws, meshes, at } = out.rows[0];
  assert.deepEqual(
    { what, pass, draws, meshes, at },
    { what: "jet", pass: "main", draws: 3, meshes: 3, at: [0, -300] },
  );
  assert.ok(out.rows[0].near > 290);
  assert.ok(
    (out.rows.find((r) => r.what === "near-thing" && r.pass === "main")?.near ??
      99) < 10,
  );
});

test('the draw breakdown names an unnamed thing by the code that made it', () => {
  const stack = [
    'Error',
    '    at Object3D.add (http://x/node_modules/.vite/deps/three.js?v=1:100:5)',
    '    at tagged (http://x/src/scripts/city3d/drawrows.ts:90:3)',
    '    at addGlow (http://x/src/scripts/city3d/kit.ts?t=1:412:9)',
    '    at buildPark (http://x/src/scripts/city3d/westlake3d.ts:88:3)',
    '    at boot (http://x/src/scripts/city3d/index.ts:900:3)',
  ].join('\n');
  assert.equal(makerOf(stack), 'kit:412<westlake3d:88');
  // (a built chunk's code is all on one line: its file and column, for its source map)
  assert.equal(makerOf('    at a (http://x/_astro/westlake3d.Bx9_k2Qa.js:1:2000)', 1), 'westlake3d.Bx9_k2Qa.js:1:2000');
  const m = mesh();
  m.userData.made = 'kit:412<westlake3d:88';
  assert.equal(drawName(m, m.material), '@kit:412<westlake3d:88');
});
