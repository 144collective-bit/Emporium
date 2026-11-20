/*
 * The Neon Mile's people standing about (docs/strip-plan.md Phase 5), DOM-free (tested in tests/striplife.test.ts);
 * the Strip's chunk adds them to the crowd's spare slots (life.ts `addPeople()`, from strip3d.ts) as Sunridge's are:
 * valets at every porte-cochère, doormen either side of every door, a crowd along the Gondolier's lake for the
 * fountain show, another along the front of Lava Lagoon's lagoon for the volcano, and an arc on the Sphere's plaza
 * looking up at it. The walkers round the two rows are life.ts's (with their shopping bags); the Strip's own cars are
 * strip.ts's `STRIP_MIX`. Phones keep every other one.
 */
import type { Idle } from './landmarks';
import { RESORTS, SLAB_Y, resortOf } from './resorts';
import { SPHERE, SPHERE_DOOR, showAt } from './stripmarks';
import { STRIP_BLVD } from './layout';
import { STRIP_LAMPS } from './strip';

/** Facing along (dx, dz): 0 is +z, PI / 2 is +x (landmarks.ts `Idle`) */
const facing = (dx: number, dz: number) => Math.atan2(dx, dz);

export const STRIP_IDLE: Idle[] = (() => {
  const out: Idle[] = [];
  const at = (x: number, z: number, ry: number, act: Idle['act'] = 'look') => out.push({ x, z, y: SLAB_Y + 0.008, ry, act });
  for (const r of RESORTS) {
    // Valets either side of the bay at the canopy's east end: one on the door's side of the car, one by the
    // boulevard's (the drive's way in across the canopy's west part is kept clear: stripdrop.ts)
    const [, pz0, px1, pz1] = r.porte.rect;
    const zMid = (pz0 + pz1) / 2;
    at(px1 - 1.0, r.cars[0][2] - r.face * 1.0, facing(0, r.face), 'serve');
    at(px1 - 1.0, zMid + r.face * 0.9, facing(-1, 0), 'serve');
    // Doormen either side of the door, facing out to the boulevard
    // (closer in where water flanks the door: Dragonspire's drawbridge, the Gondolier's bridge over its canal)
    const flanked = r.water.some((w) => r.door.z > w[1] - 1.2 && r.door.z < w[3] + 1.2 && w[0] < r.door.x + 2 && w[2] > r.door.x - 2);
    const off = flanked ? 0.6 : 1.35;
    for (const s of [-1, 1]) at(r.door.x + s * off, r.door.z + r.face * 0.15, facing(0, r.face), 'guard');
  }
  // The Sphere's doormen
  for (const s of [-1, 1]) at(SPHERE_DOOR.x + s * 1.6, SPHERE_DOOR.z - 0.3, facing(0, -1), 'guard');
  // The fountain show's crowd: along the walk between the Gondolier's lake and its canal, facing the lake
  const lake = resortOf('gondolier')!.water[0];
  for (let x = lake[0] + 1.6, k = 0; x < lake[2] - 1; x += 1.6, k++) at(x + ((k * 37) % 5) * 0.08, lake[3] + 0.25 + 0.65, facing(0, -1), k % 4 === 1 ? 'phone' : k % 4 === 3 ? 'chat' : 'look');
  // The volcano's crowd: along the front of the lagoon, between the sidewalk and its rim, facing it
  const lagoon = resortOf('lagoon')!.water[0];
  for (let x = lagoon[0] + 1.2, k = 0; x < lagoon[2] - 0.8; x += 1.9, k++) at(x, lagoon[1] - 0.25 - 0.45, facing(0, 1), k % 3 === 2 ? 'phone' : 'look');
  // The Sphere's: an arc on its plaza, facing it
  const [cx, cz] = SPHERE.at;
  for (const deg of [-72, -60, -48, 48, 60, 72]) {
    const a = (deg * Math.PI) / 180;
    const [x, z] = [cx + Math.sin(a) * (SPHERE.r + 1.6), cz - Math.cos(a) * (SPHERE.r + 1.6)];
    at(x, z, facing(cx - x, cz - z), deg % 24 === 0 ? 'phone' : 'look');
  }
  return out;
})();

/**
 * Passers-by who stop for the fountain show (docs/strip-plan.md Phase 7): along the boulevard's south sidewalk by the
 * Gondolier's lake, facing it, there only while a show is on (stripmarks.ts `showAt()`; life.ts's `Idle.when`), clear
 * of the sidewalk's lamps. Under reduced motion strip3d.ts keeps them there.
 */
export const SHOW_WATCHERS: Idle[] = (() => {
  const lake = resortOf('gondolier')!.water[0];
  const z = STRIP_BLVD.z + STRIP_BLVD.half + 0.75;
  const lamps = STRIP_LAMPS.filter(([, lz]) => lz > STRIP_BLVD.z).map(([x]) => x);
  const on = () => showAt(Date.now() / 1000) >= 0;
  const out: Idle[] = [];
  for (let x = lake[0] + 1.4, k = 0; x < lake[2] - 1; x += 2.3, k++) {
    if (lamps.some((l) => Math.abs(l - x) < 0.8)) continue;
    out.push({ x, z: z + (k % 2) * 0.35, y: SLAB_Y + 0.008, ry: facing(((k * 7) % 5 - 2) * 0.12, 1), act: k % 3 === 2 ? 'phone' : 'look', when: on });
  }
  return out;
})();
