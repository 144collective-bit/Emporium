/*
 * Uptown on screen (docs/finance-plan.md; the numbers are uptown.ts,
 * highrise.ts and plaza.ts): a district loaded as you approach (districts.ts,
 * from well out: the skyline is seen from across town), its sites built as
 * you go. Its towers (Phase 2) are highrise3d.ts's, its plaza and café
 * terraces (Phase 3) plaza3d.ts's, its waterfront boulevard (Phase 4)
 * boulevard3d.ts's, its kerbside (Phase 5) kerbside3d.ts's; the axis's lanes are paved across their
 * blocks here. Its streets, lamps and the axis's zebras are the boot's
 * (streets3d.ts), the promenade along the bank the town's (neighbourhoods.ts).
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { SLAB, type Tick } from './world';
import { site } from './tilework';
import { UPTOWN_LANES } from './uptown';
import { registerHighrises } from './highrise3d';
import { registerPlaza } from './plaza3d';
import { registerBoulevard } from './boulevard3d';
import { registerKerbside } from './kerbside3d';
import { registerUptownLife } from './uptownlife3d';
import { registerStreetLevel } from './streetlevel3d';
import { registerSites } from './uptownsites3d';
import { registerStreetLife } from './streetlife3d';
import { registerWheel } from './wheel3d';
import { registerNorth } from './uptownnorth3d';

/** Its own address, for the site worker (sitework.ts) */
export const SELF = import.meta.url;

const PAVING = toon('#b7b0cf');

export function register({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  // The towers (Phase 2): a site each; their offices' lights and warning lights by the hour on the main thread's tick (Phase 6)
  registerHighrises(low, tick);
  // The plaza and the café terraces (Phase 3); its falls and the LED ribbon move on the main thread's tick
  registerPlaza(low, tick);
  // The waterfront boulevard (Phase 4): the esplanade, its overlooks and the marina, the planted median, the terraces
  registerBoulevard();
  // The kerbside (Phase 5): the pair's bike lanes and signs, the circle and its monument, the bus lanes, the lay-bys and their cars, the service alleys
  registerKerbside(low, scene);
  // Its street level (Phase 7): the sidewalks' dressing, the grand lobbies' sculptures, the galleria over the lanes
  registerStreetLevel();
  // ...and its new buildings on the free land: the theatre, the exchange, the hotel, a tower going up, the gardens
  registerSites(low, scene, tick);
  // ...and its street life: screens on the street wall, neon blades over the restaurants, the vendors' carts
  registerStreetLife(tick);
  // ...and the observation wheel on the esplanade, its rim and capsules turning on the main thread
  registerWheel(scene, tick);
  // Its cyclists' bikes under their riders (Phase 6; the riders are the crowd's), on the main thread
  if (scene) registerUptownLife(scene, tick);
  // Uptown North's square and the park's gates' walks through its block (its towers are among the rest)
  registerNorth();
  // The axis's lanes, paved across their blocks
  UPTOWN_LANES.forEach(([x0, z0, x1, z1], i) =>
    site(`uptown lane ${i}`, [x0, z0, x1, z1], (into) => {
      const b = new Batch();
      b.box(x0, SLAB, z0, x1 - x0, 0.01, z1 - z0, PAVING);
      b.build(into, { cast: false, receive: true });
    })
  );
}
