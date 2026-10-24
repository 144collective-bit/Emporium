/*
 * What The Trenches puts in the city's own lists at the boot, before the
 * lamps, the trees and the crowd are built: its drawing is a chunk loaded as
 * you approach (trenches3d.ts), and a chunk that comes later can't add to
 * those. All of it is read from the district's DOM-free data, in the order
 * the builders once placed it (the lamps' order sets their seeds).
 */
import type * as THREE from 'three';
import { SLAB as S, addLamp, addTree, keepTreesOff } from './world';
import { parkedCars, type CarId } from './cars';
import type { Idle } from './landmarks';
import type { Pt } from './downtown';
import { TRENCH_BLOCKS, TRENCH_RECT } from './trenches';
import { TOWERS, type Tower } from './projects';
import { rng } from './recipes';
import { BAYS, BAY_CARS, REC, REC_DOORS, commonsPeople } from './commons';
import { BOOMBOXES, YARD_TREES } from './grit';
import { LOWRISE, LOW_CARS, lowFrame, type LowLot } from './streetwall';
import { BLOCK_RECT, RIVER_BLOCKS } from './riverside';
import { DECK_Y, LAMPS, PLANTERS, WATERFRONT_RECT } from './waterfront';

/** Kids at play are this big (Idle.scale) */
const KID = 0.44;
const FACE_N: Record<Tower['door']['face'], Pt> = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
const OUT: Record<LowLot['face'], Pt> = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
const hash = (a: number, b: number) => {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
};
const bounds = (poly: Pt[]) => [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1]))] as const;

export function placeTrenches(scene: THREE.Scene, crowd: Idle[], low: boolean) {
  // No outskirts' trees on its land, the riverside's blocks or the waterfront
  keepTreesOff(TRENCH_RECT);
  // The Trench Houses: a lamp by each door's path (block by block, as the towers are drawn)
  const byBlock = new Map<string, Tower[]>();
  for (const t of TOWERS) byBlock.set(t.block, [...(byBlock.get(t.block) ?? []), t]);
  for (const towers of byBlock.values())
    for (const t of towers) {
      const n = FACE_N[t.door.face];
      addLamp(t.door.x + n[0] * 1.6 + n[1] * 1.1, t.door.z + n[1] * 1.6 - n[0] * 1.1, Math.atan2(-n[1], n[0]));
    }
  // Trees along the highway behind Bottom Street's car parks
  for (const blk of TRENCH_BLOCKS.filter((o) => o.row === 'C')) {
    const [x0, , x1, z1] = bounds(blk.poly);
    const px0 = x0 + (blk.poly.length > 4 ? 6 : 1);
    const r = rng(x0 * 3 + 11);
    for (let x = px0 + 1; x < x1 - 1; x += 3.2) if (r() < 0.8) addTree(x, z1 - 1.2, 0.9 + r() * 0.4, r() < 0.35);
  }
  // The commons: the parked cars, a lot to a block (each swaps to its far form on its own)
  const cars = new Map<string, [CarId, number, number, number, string][]>();
  for (const { bay: id, car } of BAY_CARS) {
    const block = BAYS.find((y) => y.id === id)!.block;
    cars.set(block, [...(cars.get(block) ?? []), car as [CarId, number, number, number, string]]);
  }
  for (const list of cars.values()) parkedCars(scene, S, list);
  // The rec block's lamps (its trees are the yards')
  for (const d of Object.values(REC_DOORS)) addLamp(d.x + 2.2, d.z + 1.8, 0);
  addLamp(REC.path[0] - 0.6, REC.rect[3] - 6, Math.PI / 2);
  addLamp(REC.path[0] - 0.6, (REC.pavilion[1] + REC.pavilion[3]) / 2 - 4, Math.PI / 2);
  // The people out on the lawns (kids smaller)
  for (const p of commonsPeople(low)) crowd.push({ x: p.x, z: p.z, ry: p.ry, act: p.act, y: p.seat !== undefined ? S + p.seat : undefined, scale: p.kid ? KID : undefined });
  // The grit: the yards' trees (pits or patches of grass) and the people round the boomboxes
  for (const t of YARD_TREES) addTree(t.x, t.z, t.s, false);
  for (const bx of BOOMBOXES) {
    for (const [x, z, ry] of bx.chairs) crowd.push({ x, z, ry, act: 'sit', y: S + 0.42 });
    for (const [x, z, ry] of bx.standing) crowd.push({ x, z, ry, act: 'chat' });
  }
  // The street walls: the cars on the aprons and in the car wash, trees along the highway behind row W, people at work
  parkedCars(scene, S, LOW_CARS as [CarId, number, number, number, string][]);
  const w = TRENCH_BLOCKS.find((b) => b.row === 'W')!;
  const [wx0, wz0, , wz1] = bounds(w.poly);
  for (let z = wz0 + 1.5; z < wz1 - 1; z += 3.4) if (hash(z, 7) < 0.8) addTree(wx0 + 1.2, z, 0.9 + hash(z, 3) * 0.35, hash(z, 11) < 0.4);
  for (const l of LOWRISE) {
    if (l.kind === 'lockups' || l.kind === 'warehouse') continue;
    const F = lowFrame(l);
    const [u, v] = l.kind === 'carwash' ? [F.W - 1.2, 0.9] : l.kind === 'scrap' ? [F.W - 2.1, 3.3] : [F.W * 0.55, 2.7];
    const [x, z] = F.at(u, v);
    const n = OUT[l.face];
    crowd.push({ x, z, ry: Math.atan2(n[0], n[1]), act: 'look' });
  }
  // The riverside's blocks and the waterfront: no outskirts' trees; the boardwalk's lamps (on the deck at the water,
  // their arms reaching in over the walk) and its planters' trees
  for (const id of RIVER_BLOCKS) keepTreesOff(BLOCK_RECT[id]);
  keepTreesOff(WATERFRONT_RECT);
  for (const [x, z] of LAMPS) addLamp(x, z, -Math.PI / 2, DECK_Y);
  for (const [x, z] of PLANTERS) addTree(x, z, 0.75, false, DECK_Y + 0.44);
}
