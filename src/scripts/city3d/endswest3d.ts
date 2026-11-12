/*
 * Endswood carried west on screen (docs/ends-west-plan.md Phase 1; the numbers are endswest.ts): a district loaded as
 * you approach (districts.ts `endswest`), all sites:
 *
 * - **The Close carried west** from where the old estate's drawing of it stops (endswood3d.ts) to its far end: worn
 *   asphalt a hair over the tunnel's footpath (which runs on under it), the dashed centre line, patches near only; a
 *   zebra where the footpath crosses, with a flashing beacon either side; the Close's bollards across its far end.
 * - **On the blocks:** the service lanes and parking courts in Endswood's tired asphalt, the bays marked; concrete
 *   flags along the rows' fronts and down the blocks' east sides; the greens and the back gardens in grass. The
 *   terraces on the rows' footprints are endsterraces3d.ts's (Phase 2), what's on the east ends endsweststreet3d.ts's
 *   (Phase 3), its life endswestlife3d.ts's (Phase 4).
 */
import * as THREE from 'three';
import type { Tick } from './world';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { along } from './roads3d';
import { COVER, KERB } from './palette';
import { BOLLARD, CLOSE_BOLLARDS, CLOSE_END, ROAD_HALF, ROAD_Z, SLAB_Y, type Pt, type Rect } from './endswood';
import { CLOSE_WEST, COURTS, CROSS_PATHS, GARDENS, GREENS, LANES, PATHS, ZEBRA } from './endswest';
import { registerTerraces } from './endsterraces3d';
import { registerStreetWest } from './endsweststreet3d';
import { registerWestLife } from './endswestlife3d';
import { STREET_W_SOLIDS } from './endsweststreet';
import { TERRACE_SOLIDS } from './endsterraces';
import { addSolids } from './solids';

export const SELF = import.meta.url;

/** The Close's asphalt a hair over the tunnel's footpath's dirt (lot9-3d.ts, at its ground's 0.037), its lines over it */
const ROAD_Y = 0.045;
const LINE_Y = 0.056;
/** On the blocks: over the slab's top, then what lies over that */
const ON = SLAB_Y + 0.006;
const OVER = ON + 0.006;
const ASPHALT = toon('#2b2938');
const PATCH = toon('#33303f');
const LINE = toon('#d8d4c8');
const COURT = toon('#35323f');
const FLAGS = toon(KERB.grit);
const LAWN = toon(COVER.wornLawn);
const GREEN = toon(COVER.lawn);
const CONCRETE = toon('#8b8896');
const POLE_BLACK = toon('#1c1b22');
const POLE_WHITE = toon('#e3e0d6');
/** The beacons' amber globes: small, so bright at night */
const BEACON = neon('#ffb238', 0.45, 2.2);

/** A flat quad over a rect at y, facing up */
function flat(b: Batch, [x0, z0, x1, z1]: Rect, y: number, m: THREE.Material) {
  if (x1 - x0 < 1e-6 || z1 - z0 < 1e-6) return;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
  g.deleteAttribute('uv');
  b.add(g.translate((x0 + x1) / 2, y, (z0 + z1) / 2), m);
}
/** A rect cut into pieces no longer than about `most` either way (a fixed triangle never much longer than a tile) */
function pieces([x0, z0, x1, z1]: Rect, most = 15): Rect[] {
  const [nx, nz] = [Math.max(1, Math.ceil((x1 - x0) / most)), Math.max(1, Math.ceil((z1 - z0) / most))];
  const out: Rect[] = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) out.push([x0 + ((x1 - x0) * i) / nx, z0 + ((z1 - z0) * j) / nz, x0 + ((x1 - x0) * (i + 1)) / nx, z0 + ((z1 - z0) * (j + 1)) / nz]);
  return out;
}
const grow = ([x0, z0, x1, z1]: Rect, m: number): Rect => [x0 - m, z0 - m, x1 + m, z1 + m];

/** The Close's run west: asphalt in pieces, the dashed centre line (broken at the zebra), patches near only */
function registerClose(low: boolean) {
  const pts = along([CLOSE_END, ROAD_Z], [CLOSE_WEST, ROAD_Z], 15);
  for (let k = 1; k < pts.length; k++) {
    const [p, q]: [Pt, Pt] = [pts[k - 1], pts[k]];
    const [xa, xb] = [Math.min(p[0], q[0]), Math.max(p[0], q[0])];
    site(`endswest close ${k}`, [xa - 1, ROAD_Z - ROAD_HALF - 1, xb + 1, ROAD_Z + ROAD_HALF + 1], (into) => {
      const b = new Batch();
      flat(b, [xa, ROAD_Z - ROAD_HALF, xb, ROAD_Z + ROAD_HALF], ROAD_Y, ASPHALT);
      for (let x = xa + 0.4; x < xb - 1.4; x += 3) if (Math.abs(x + 0.7 - ZEBRA.x) > ZEBRA.half + 1.4) flat(b, [x, ROAD_Z - 0.06, x + 1.4, ROAD_Z + 0.06], LINE_Y, LINE);
      b.detail(() => {
        if (low) return;
        for (let x = xa + 2.5; x < xb - 2; x += 5.3) {
          if (Math.abs(x - ZEBRA.x) < ZEBRA.half + 2) continue;
          const side = Math.sin(x * 1.7) > 0 ? 1 : -1;
          const z0 = ROAD_Z + side * 0.3 + (side < 0 ? -1.1 : 0);
          flat(b, [x, z0, x + 1.4 + Math.abs(Math.sin(x)) * 1.2, z0 + 1.1], ROAD_Y + 0.004, PATCH);
        }
      });
      b.build(into, { cast: false, receive: true });
    });
  }
  // The zebra where the tunnel's footpath crosses: bars along the road, and a flashing beacon on each side
  site('endswest zebra', [ZEBRA.x - ZEBRA.half - 1, ROAD_Z - ROAD_HALF - 2, ZEBRA.x + ZEBRA.half + 1, ROAD_Z + ROAD_HALF + 2], (into) => {
    const b = new Batch();
    for (let z = ROAD_Z - ROAD_HALF + 0.15; z < ROAD_Z + ROAD_HALF - 0.4; z += 0.9) flat(b, [ZEBRA.x - ZEBRA.half, z, ZEBRA.x + ZEBRA.half, z + 0.45], LINE_Y, LINE);
    for (const k of [-1, 1]) {
      const [x, z] = [ZEBRA.x + ZEBRA.half + 0.4, ROAD_Z + k * (ROAD_HALF + 0.45)];
      // (the pole in black and white bands, the amber globe on top)
      for (let i = 0; i < 4; i++) b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 6, 1, true).translate(x, 0.21 + i * 0.42, z), i % 2 ? POLE_WHITE : POLE_BLACK);
      b.add(new THREE.SphereGeometry(0.16, 10, 8).translate(x, 1.86, z), BEACON);
    }
    b.build(into, { cast: true, receive: true });
  });
  // The Close's bollards across its far end
  const [bx0, bx1] = [Math.min(...CLOSE_BOLLARDS.map((p) => p[0])), Math.max(...CLOSE_BOLLARDS.map((p) => p[0]))];
  site('endswest close end', [bx0 - 1.5, ROAD_Z - ROAD_HALF - 1, bx1 + 1.5, ROAD_Z + ROAD_HALF + 1], (into) => {
    const b = new Batch();
    for (const [x, z] of CLOSE_BOLLARDS) {
      b.add(new THREE.CylinderGeometry(BOLLARD.r, BOLLARD.r, BOLLARD.h, low ? 6 : 10, 1, true).translate(x, ROAD_Y + BOLLARD.h / 2, z), CONCRETE);
      b.add(new THREE.SphereGeometry(BOLLARD.r, low ? 6 : 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, ROAD_Y + BOLLARD.h, z), CONCRETE);
    }
    b.build(into, { cast: true, receive: true });
  });
}

/** What lies on the blocks: lanes and courts (bays marked), the paths, the greens and the gardens, a site a piece */
function registerGrounds() {
  const layers: [Rect[], number, THREE.Material, string][] = [
    [LANES, ON, COURT, 'lane'],
    [COURTS, ON, COURT, 'court'],
    [PATHS, ON + 0.002, FLAGS, 'path'],
    [CROSS_PATHS, ON + 0.002, FLAGS, 'cross'],
    [GREENS, ON, GREEN, 'green'],
    [GARDENS, ON, LAWN, 'garden'],
  ];
  for (const [rects, y, m, id] of layers)
    rects.forEach((r, i) =>
      pieces(r).forEach((p, j) =>
        site(`endswest ${id} ${i} ${j}`, grow(p, 0.5), (into) => {
          const b = new Batch();
          flat(b, p, y, m);
          // (a court's bays along both its long sides: a line every 2.4, 1.8 long)
          if (id === 'court')
            for (let x = Math.ceil(p[0] / 2.4) * 2.4; x <= p[2]; x += 2.4)
              for (const [z0, z1] of [
                [r[1] + 0.1, r[1] + 1.9],
                [r[3] - 1.9, r[3] - 0.1],
              ])
                flat(b, [x - 0.04, z0, x + 0.04, z1], OVER, LINE);
          b.build(into, { cast: false, receive: true });
        })
      )
    );
}

export function register({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  registerClose(low);
  registerGrounds();
  // Phase 2: the terraces, their gardens and the passages through the rows; what's solid joins the grids on the main thread
  registerTerraces(low);
  // Phase 3: the parade, the playground, the garages, the green and the rest round the terraces
  registerStreetWest(low);
  if (scene) addSolids([...TERRACE_SOLIDS, ...STREET_W_SOLIDS]);
  // Phase 4: the people, the dogs, the washing and the kids' things out, the porch lights at night
  registerWestLife(low, scene, tick);
}
