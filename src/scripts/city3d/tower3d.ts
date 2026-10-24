/*
 * Sector 7 Tower as a place (docs/finance-plan.md Phase 6; the numbers are
 * skydeck.ts): built at the boot, but the tower itself is Uptown's spire,
 * drawn with the rest of its towers as a site in Uptown's chunk
 * (highrise3d.ts, the sky deck's rail, lift house, crown and viewers with
 * it), so it never stands half drawn. The spot's group is only what the City
 * view's click and hover need: the spire's tiers as plain shapes on the
 * `PICK` layer (never drawn, kept out of the far form) and the hover ring
 * round its foot; the pin floats over its mast.
 */
import * as THREE from 'three';
import { PAL, PICK, fx, glowMat } from './kit';
import { SLAB } from './world';
import type { Spot } from './landmarks';
import { DECK, SPIRE } from './skydeck';
import { TALLEST } from './highrise';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function buildTower(scene: THREE.Scene): { spot: Spot } {
  const group = new THREE.Group();
  group.name = 'tower';
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  for (const p of SPIRE.parts) {
    const [x0, z0, x1, z1] = p.rect;
    const box = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, p.y1 - p.y0, z1 - z0), hidden);
    box.position.set((x0 + x1) / 2, SLAB + (p.y0 + p.y1) / 2, (z0 + z1) / 2);
    box.layers.set(PICK);
    box.userData.keep = true;
    group.add(box);
  }
  const [x0, , x1] = SPIRE.parts[0].rect;
  const r = (x1 - x0) / 2;
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.2 + 0.6, r * 1.2 + 0.9, 64), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(DECK.x, SLAB + 0.05, DECK.z);
  group.add(fx(ring));
  scene.add(group);
  return { spot: { id: 'tower', group, focus: V(DECK.x, 16, DECK.z), size: 46, pin: V(DECK.x, SLAB + TALLEST.tip + 2.2, DECK.z), ring } };
}
