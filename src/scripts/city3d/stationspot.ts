/*
 * Sector 7 Central as a place (docs/station-plan.md step 1; the numbers are
 * station.ts): built at the boot, but the station itself is drawn as sites
 * in its own chunk (station3d.ts, loaded as you approach), so it never stands
 * half drawn. The spot's group is only what the City view's click and hover
 * need: the hall and the shed as plain boxes on the `PICK` layer (never
 * drawn, kept out of the far form) and the hover ring round the hall; the pin
 * floats over the hall's crown.
 */
import * as THREE from 'three';
import { PAL, PICK, fx, glowMat } from './kit';
import { SLAB } from './world';
import type { Spot } from './landmarks';
import { HALL, SHED, TALLEST } from './station';

export function buildStationSpot(scene: THREE.Scene): { spot: Spot } {
  const group = new THREE.Group();
  group.name = 'station';
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  for (const [x0, z0, x1, z1, h] of [
    [HALL.x0, HALL.z0, HALL.x1, HALL.z1, HALL.crown],
    [SHED.x0, SHED.z0, SHED.x1, SHED.z1, SHED.crown],
  ]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), hidden);
    box.position.set((x0 + x1) / 2, SLAB + h / 2, (z0 + z1) / 2);
    box.layers.set(PICK);
    box.userData.keep = true;
    group.add(box);
  }
  const [cx, cz] = [(HALL.x0 + HALL.x1) / 2, (HALL.z0 + HALL.z1) / 2];
  const r = (HALL.z1 - HALL.z0) / 2;
  const ring = new THREE.Mesh(new THREE.RingGeometry(r + 1.2, r + 1.6, 64), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(cx, SLAB + 0.05, cz);
  group.add(fx(ring));
  scene.add(group);
  return { spot: { id: 'station', group, focus: new THREE.Vector3(cx - 10, 5, cz), size: 64, pin: new THREE.Vector3(cx, SLAB + TALLEST + 2.2, cz), ring } };
}
