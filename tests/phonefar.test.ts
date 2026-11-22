// The far city on phones (lod.ts `FAR_PHONE`, docs/phone-far-plan.md Phase 3): a place's far form in one piece (its
// facades flattened too), small cut-out signs not drawn past the tier's far (by their layers, so code can still show
// or hide them), the kept glows not drawn while they're clear
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FAR_PHONE, farForm, updateLods } from '../src/scripts/city3d/lod';
import { occlude } from '../src/scripts/city3d/kit';

/** A place: a box, a big textured facade inside a group, and a glow (kept: additive) */
function place(name: string) {
  const g = new THREE.Group();
  g.name = name;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshToonMaterial({ color: '#884422' })));
  const tex = new THREE.DataTexture(new Uint8Array([200, 180, 90, 255]), 1, 1);
  tex.userData.average = [0.8, 0.7, 0.35, 1];
  const wing = new THREE.Group();
  const facade = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.MeshBasicMaterial({ map: tex }));
  facade.position.set(0, 4, 2.01);
  wing.add(facade, new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshToonMaterial()));
  g.add(wing);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
  g.add(glow);
  return { g, glow, wing };
}

test('on phones a place far off is one piece: its facades flattened, nothing kept but what must be', () => {
  FAR_PHONE.on = true;
  try {
    const { g, glow, wing } = place('phone-place');
    assert.ok(farForm(g));
    const far = g.getObjectByName('phone-place-far')!;
    assert.equal(far.children.length, 1, 'one mesh far off');
    // (the wing with the facade went into the near form, flattened far off; the glow stays as it is)
    assert.equal(wing.parent?.name, 'phone-place-near');
    assert.equal(glow.parent, g);
  } finally {
    FAR_PHONE.on = false;
  }
});

test('on desktops a place keeps its facades textured far off, as before', () => {
  const { g, wing } = place('desk-place');
  assert.ok(farForm(g));
  // (a group holding a facade is kept whole, its facade drawn as it is)
  assert.equal(wing.parent, g);
});

test('on phones a small cut-out sign is not drawn past far, and is again as the camera comes near', () => {
  FAR_PHONE.on = true;
  try {
    const scene = new THREE.Scene();
    const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    const sign = occlude(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.56), new THREE.MeshBasicMaterial({ map: tex })), tex);
    sign.layers.set(2);
    sign.position.set(0, 2, 0);
    const big = occlude(new THREE.Mesh(new THREE.PlaneGeometry(6, 2), new THREE.MeshBasicMaterial({ map: tex })), tex);
    big.layers.set(2);
    scene.add(sign, big);
    scene.updateMatrixWorld(true);
    // (far off: the small sign and its stand-in off every layer; the big one drawn)
    updateLods(300, 2, 0, 90);
    assert.equal(sign.layers.mask, 0);
    assert.equal(sign.children[0].layers.mask, 0);
    assert.equal(big.layers.mask, 1 << 2);
    // (code hiding it meanwhile still can)
    sign.visible = false;
    updateLods(20, 2, 0, 90);
    assert.equal(sign.layers.mask, 1 << 2);
    assert.equal(sign.visible, false);
  } finally {
    FAR_PHONE.on = false;
  }
});

test('on phones a kept glow is not drawn while it is clear', () => {
  FAR_PHONE.on = true;
  try {
    const { g, glow } = place('glow-place');
    farForm(g);
    const mat = glow.material as THREE.MeshBasicMaterial;
    updateLods(0, 0, 0, 90);
    assert.equal(mat.visible, false);
    mat.opacity = 0.6;
    updateLods(0, 0, 0, 90);
    assert.equal(mat.visible, true);
  } finally {
    FAR_PHONE.on = false;
  }
});
