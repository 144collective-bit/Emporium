/*
 * Crestmont's landmarks as places (docs/crestmont-plan.md Phase 7 step 2; the numbers are crestsites.ts's): built at
 * the boot, though what they are is drawn as sites in Crestmont's chunk (crestsites3d.ts, loaded as you approach), so
 * none stands half drawn. Each spot's group is only what the City view's click and hover need: plain boxes on the
 * `PICK` layer (never drawn, kept out of the far form) and the hover ring round it at its ground's height; the pins
 * float over the hotel's tower, the civic hall's dome, the clubhouse, the overlook and the reservoir's valve tower.
 */
import * as THREE from 'three';
import { PAL, PICK, fx, glowMat } from './kit';
import type { Spot } from './landmarks';
import { CIVIC, CLUB, HOTEL, OVERLOOK, RESERVOIR, SLAB_Y } from './crestsites';
import type { Rect } from './crestmont';
import type { SpotId } from '../../lib/city';

function spot(scene: THREE.Scene, id: SpotId, y: number, boxes: { rect: Rect; h: number }[], land: Rect, pinH: number, pinAt?: [number, number]): Spot {
  const group = new THREE.Group();
  group.name = id;
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  for (const { rect: [x0, z0, x1, z1], h } of boxes) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), hidden);
    box.position.set((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2);
    box.layers.set(PICK);
    box.userData.keep = true;
    group.add(box);
  }
  const [cx, cz] = [(land[0] + land[2]) / 2, (land[1] + land[3]) / 2];
  const r = Math.hypot(land[2] - land[0], land[3] - land[1]) / 2;
  const ring = new THREE.Mesh(new THREE.RingGeometry(r + 0.6, r + 1, 64), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(cx, y + 0.05, cz);
  group.add(fx(ring));
  scene.add(group);
  const [px, pz] = pinAt ?? [cx, cz];
  return { id, group, focus: new THREE.Vector3(cx, y + 4, cz), size: Math.max(land[2] - land[0], land[3] - land[1]) * 0.8, pin: new THREE.Vector3(px, y + pinH, pz), ring };
}

export function buildCrestSpots(scene: THREE.Scene): Spot[] {
  const hotelH = HOTEL.storey.ground + (HOTEL.towerFloors - 1) * HOTEL.storey.upper;
  const hallH = CIVIC.storey.ground + CIVIC.storey.upper;
  const tower = (r: Rect) => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as [number, number];
  const { tower: valve } = RESERVOIR;
  return [
    spot(scene, 'hotel', SLAB_Y, [{ rect: HOTEL.body, h: hotelH - 2 }, { rect: HOTEL.tower, h: hotelH }], HOTEL.block, hotelH + 2.4, tower(HOTEL.tower)),
    spot(scene, 'civichall', CIVIC.y, [{ rect: CIVIC.hall, h: hallH }, { rect: CIVIC.tower, h: CIVIC.towerTop + CIVIC.dome }], CIVIC.pad, CIVIC.towerTop + CIVIC.dome + 2.6, tower(CIVIC.tower)),
    spot(scene, 'golfclub', CLUB.y, [{ rect: CLUB.house, h: CLUB.storey.ground + CLUB.storey.upper + 1.3 }], CLUB.pad, 7.4, tower(CLUB.house)),
    spot(scene, 'overlook', OVERLOOK.y, [{ rect: OVERLOOK.rect, h: 1.2 }], OVERLOOK.rect, 4),
    spot(scene, 'reservoir', RESERVOIR.y, [{ rect: RESERVOIR.water, h: 1 }], RESERVOIR.water, valve.h + 3, [valve.x, valve.z]),
  ];
}
