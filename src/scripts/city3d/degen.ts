/*
 * Degen as a little 3D figure (balaclava, red cap, green shades, black suit,
 * green tie, a bag of Gas Fee Gummy Bears). Walk mode plays as him; the
 * Emporium's rooftop hologram is a giant copy of him.
 */
import * as THREE from 'three';
import { lit, toon } from './kit';

export function makeDegen(scale: number) {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  const black = toon('#14121f');
  const skin = toon('#e8c39e');
  const part = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const limb = (x: number, y: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    g.add(pivot);
    return pivot;
  };
  const legs = [-0.07, 0.07].map((x) => {
    const p = limb(x, 0.48);
    part(0.11, 0.44, 0.13, black, 0, -0.22, 0, p);
    part(0.12, 0.06, 0.2, toon('#2a2350'), 0, -0.45, 0.03, p);
    return p;
  });
  part(0.34, 0.44, 0.21, black, 0, 0.7, 0);
  part(0.11, 0.2, 0.01, toon('#f3f2f7'), 0, 0.82, 0.106);
  part(0.045, 0.18, 0.012, lit(new THREE.MeshToonMaterial({ color: '#1fbf6b', emissive: '#1fbf6b' }), 0.05, 0.5), 0, 0.8, 0.113);
  const arms = [-0.21, 0.21].map((x, i) => {
    const p = limb(x, 0.9);
    part(0.09, 0.4, 0.11, black, 0, -0.2, 0, p);
    part(0.08, 0.07, 0.08, skin, 0, -0.43, 0, p);
    if (i === 1) part(0.13, 0.17, 0.05, toon('#e23b3b'), 0, -0.5, 0.06, p);
    return p;
  });
  const head = new THREE.Group();
  head.position.y = 1.05;
  g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 10), black);
  skull.castShadow = true;
  head.add(skull);
  part(0.2, 0.05, 0.02, skin, 0, 0.025, 0.13, head);
  part(0.24, 0.055, 0.03, lit(new THREE.MeshToonMaterial({ color: '#1fbf6b', emissive: '#1fbf6b' }), 0.15, 0.8), 0, 0.03, 0.145, head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.075, 16), toon('#e23b3b'));
  cap.position.y = 0.1;
  cap.castShadow = true;
  head.add(cap);
  part(0.2, 0.02, 0.15, toon('#e23b3b'), 0, 0.07, 0.15, head);
  part(0.11, 0.045, 0.012, toon('#f3f2f7'), 0, 0.105, 0.153, head);
  g.scale.setScalar(scale);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.36, 32),
    new THREE.MeshBasicMaterial({ color: '#00eaff', transparent: true, opacity: 0.55, depthWrite: false, fog: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.layers.set(1);
  return { g, legs, arms, head, ring };
}
