/*
 * Sector 7 Stadium as a place, at the boot (docs/boot-plan.md Phase 1): its
 * spot (the pin over its roof, the hover ring round it, its bowl as a plain
 * oval on the `PICK` layer, never drawn, for the City view's click), the
 * match night's queue at the gate and the car park's cars. The stadium
 * itself (stadium3d.ts) is drawn into the spot's group when Westlake Park
 * loads as you approach (westlake3d.ts `register()`).
 */
import * as THREE from 'three';
import { PAL, PICK, fx, glowMat } from './kit';
import { SLAB } from './world';
import { parkedCars, type CarId } from './cars';
import type { Idle, Spot } from './landmarks';
import { CENTRE, FACADE, GATE, PARKED, ROOF, matchOn } from './stadium';

/** The spot's group, which stadium3d.ts draws into when it loads */
export const STADIUM_VIEW: { group: THREE.Group | null } = { group: null };

export function buildStadiumSpot(scene: THREE.Scene, crowd: Idle[], opts: { low: boolean }): { spot: Spot } {
  const S = SLAB;
  const group = new THREE.Group();
  group.name = 'stadium';
  scene.add(group);
  STADIUM_VIEW.group = group;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(FACADE.a, FACADE.a, FACADE.h - S, 32), new THREE.MeshBasicMaterial({ visible: false }));
  bowl.scale.set(1, 1, FACADE.b / FACADE.a);
  bowl.position.set(CENTRE[0], (S + FACADE.h) / 2, CENTRE[1]);
  bowl.layers.set(PICK);
  bowl.userData.keep = true;
  group.add(bowl);
  // The hover ring round it
  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(FACADE.a + 3.6, FACADE.a + 3.9, 96), glowMat(PAL.cyan, 0, null));
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.scale.set(1, FACADE.b / FACADE.a, 1);
  ringMesh.position.set(CENTRE[0], S + 0.05, CENTRE[1]);
  group.add(fx(ringMesh));
  // On a match night a few people queue at the shut gate (life.ts `Idle.when`: out of the world the rest of the time),
  // along the forecourt west of the gate's prompt, facing it, shuffling (the crowd's `wait` act)
  for (let k = 0; k < (opts.low ? 3 : 5); k++) crowd.push({ x: GATE.x - 1.7 - k * 0.78 - (k % 2) * 0.12, z: GATE.z + 1.45 + (k % 2) * 0.38, ry: Math.PI / 2 + ((k % 3) - 1) * 0.3, act: 'wait', when: () => matchOn(Date.now()) });
  // The car park's cars, on its asphalt (the grounds, roads, car park and footbridge, are Westlake's chunk:
  // stadiumgrounds3d.ts, districts.ts)
  parkedCars(scene, 0.04, PARKED as [CarId, number, number, number, string][]);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  return { spot: { id: 'stadium', group, focus: V(CENTRE[0], 4, CENTRE[1]), size: 62, pin: V(CENTRE[0], S + ROOF.y1 + 3.6, CENTRE[1]), ring: ringMesh } };
}
