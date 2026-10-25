/*
 * Palm Court and Starlight Mall as places (docs/mall-plan.md step 1; the
 * numbers are mall.ts): built at the boot, but what they are is drawn as
 * sites in their own chunk (mall3d.ts, loaded as you approach), so neither
 * stands half drawn. Each spot's group is only what the City view's click
 * and hover need: its buildings as plain boxes on the `PICK` layer (never
 * drawn, kept out of the far form) and the hover ring round it; the pins
 * float over the cinema and the mall's hall.
 */
import * as THREE from 'three';
import { PAL, PICK, fx, glowMat } from './kit';
import { SLAB } from './world';
import type { Spot } from './landmarks';
import { ANCHORS, CINEMA, COURT, HALL, MALL_BLOCK, PYLON, SHOPS, type Rect } from './mall';
import type { SpotId } from '../../lib/city';

function spot(scene: THREE.Scene, id: SpotId, boxes: { rect: Rect; h: number }[], land: Rect, pinAt: [number, number, number]): Spot {
  const group = new THREE.Group();
  group.name = id;
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  for (const { rect: [x0, z0, x1, z1], h } of boxes) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), hidden);
    box.position.set((x0 + x1) / 2, SLAB + h / 2, (z0 + z1) / 2);
    box.layers.set(PICK);
    box.userData.keep = true;
    group.add(box);
  }
  const [cx, cz] = [(land[0] + land[2]) / 2, (land[1] + land[3]) / 2];
  const r = Math.hypot(land[2] - land[0], land[3] - land[1]) / 2;
  const ring = new THREE.Mesh(new THREE.RingGeometry(r + 0.6, r + 1, 64), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(cx, SLAB + 0.05, cz);
  group.add(fx(ring));
  scene.add(group);
  return { id, group, focus: new THREE.Vector3(cx, 4, cz), size: Math.max(land[2] - land[0], land[3] - land[1]) * 0.8, pin: new THREE.Vector3(...pinAt), ring };
}

export function buildMallSpots(scene: THREE.Scene): Spot[] {
  const court: Rect = [COURT[0], CINEMA.rect[1], COURT[2], COURT[3]];
  const mall: Rect = [MALL_BLOCK[0], MALL_BLOCK[1], MALL_BLOCK[2], MALL_BLOCK[3]];
  return [
    spot(scene, 'palmcourt', [{ rect: CINEMA.rect, h: CINEMA.h }, ...SHOPS.map((s) => ({ rect: s.rect, h: s.h }))], court, [(CINEMA.rect[0] + CINEMA.rect[2]) / 2, SLAB + CINEMA.h + 2.4, (CINEMA.rect[1] + CINEMA.rect[3]) / 2]),
    spot(scene, 'mall', [{ rect: HALL.rect, h: HALL.h + 2 }, ...ANCHORS.map((a) => ({ rect: a.rect, h: a.h }))], mall, [(HALL.rect[0] + HALL.rect[2]) / 2, SLAB + Math.max(PYLON.h, HALL.h + 2) + 1.6, (HALL.rect[1] + HALL.rect[3]) / 2]),
  ];
}
