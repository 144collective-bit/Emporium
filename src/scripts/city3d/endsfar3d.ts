/*
 * The Ends' far west on screen (docs/ends-far-west-plan.md Phase 1; the numbers are endsfar.ts): a district loaded as
 * you approach (districts.ts `endsfar`), all sites:
 *
 * - **The Close's run on** from its old end to the T, and **the lane** across it: Endswood's worn asphalt, the Close's
 *   dashed centre line carried on to a give-way line at the T, the lane unmarked (a back lane), patches near only.
 * - **The plots:** the compound's in block paving with a brick-coloured kerb round it where its wall will stand and
 *   the gates' threshold on the lane (Phase 2 builds the compound); the bungalows' and the allotments' land and the
 *   verge by the rows in worn grass (Phase 4 builds on them).
 */
import * as THREE from 'three';
import type { Tick } from './world';
import { Batch, PAL, fx, glowMat, lit, toon } from './kit';
import { site } from './tilework';
import { COVER } from './palette';
import { CLOSE_WEST, ROAD_HALF, ROAD_Z, SLAB_Y, type Rect } from './endswood';
import { FAR_BLOCKS, LANE_HALF, LANE_X, LANE_Z, PLOT } from './endsfar';
import { registerHome } from './home3d';
import { registerFarHomes } from './endsfarhomes3d';
import { FAR_HOME_SOLIDS } from './endsfarhomes';
import { addSolids } from './solids';
import { addPeople } from './life';
import { FAR_IDLE, FAR_PEOPLE, FAR_POOLS } from './endsfarlife';

export const SELF = import.meta.url;

/** The roads' asphalt and their lines over it (as the Close's run through the rows, endswest3d.ts) */
const ROAD_Y = 0.045;
const LINE_Y = 0.056;
/** On the blocks: over the slab's top, then what lies over that */
const ON = SLAB_Y + 0.006;
const OVER = ON + 0.006;
const ASPHALT = toon('#2b2938');
const PATCH = toon('#33303f');
const LINE = toon('#d8d4c8');
const LAWN = toon(COVER.wornLawn);
const PAVING = toon('#6d6672');
const PAVING_DARK = toon('#5f5965');

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

/** The Close's run on to the T and the lane across it */
function registerRoads(low: boolean) {
  const lane0 = LANE_X - LANE_HALF;
  // The Close: from its old end to the lane's near kerb line (the lane's own asphalt takes the T)
  site('endsfar close', [lane0 - 1, ROAD_Z - ROAD_HALF - 1, CLOSE_WEST + 1, ROAD_Z + ROAD_HALF + 1], (into) => {
    const b = new Batch();
    flat(b, [LANE_X + LANE_HALF, ROAD_Z - ROAD_HALF, CLOSE_WEST, ROAD_Z + ROAD_HALF], ROAD_Y, ASPHALT);
    for (let x = CLOSE_WEST - 1.8; x > LANE_X + LANE_HALF + 1.6; x -= 3) flat(b, [x - 1.4, ROAD_Z - 0.06, x, ROAD_Z + 0.06], LINE_Y, LINE);
    // (the give-way line where it meets the lane: a double dashed bar across its own half)
    for (let z = ROAD_Z - ROAD_HALF + 0.15; z < ROAD_Z + ROAD_HALF - 0.3; z += 0.6) flat(b, [LANE_X + LANE_HALF + 0.2, z, LANE_X + LANE_HALF + 0.42, z + 0.36], LINE_Y, LINE);
    b.detail(() => {
      if (!low) flat(b, [CLOSE_WEST - 6.2, ROAD_Z + 0.3, CLOSE_WEST - 4.1, ROAD_Z + 1.4], ROAD_Y + 0.004, PATCH);
    });
    b.build(into, { cast: false, receive: true });
  });
  // The lane, a piece a site
  pieces([lane0, LANE_Z[0], LANE_X + LANE_HALF, LANE_Z[1]]).forEach((p, i) =>
    site(`endsfar lane ${i}`, grow(p, 1), (into) => {
      const b = new Batch();
      flat(b, p, ROAD_Y, ASPHALT);
      b.detail(() => {
        if (low) return;
        for (let z = p[1] + 2.5; z < p[3] - 2; z += 6.1) {
          if (Math.abs(z - ROAD_Z) < ROAD_HALF + 2) continue;
          const side = Math.sin(z * 1.3) > 0 ? 0.25 : -1.35;
          flat(b, [LANE_X + side, z, LANE_X + side + 1.1, z + 1.3 + Math.abs(Math.sin(z)) * 1.1], ROAD_Y + 0.004, PATCH);
        }
      });
      b.build(into, { cast: false, receive: true });
    })
  );
}

/** What lies on the plots: the compound's paving and its wall's line, the rest in worn grass */
function registerPlots() {
  for (const blk of FAR_BLOCKS) {
    if (blk.use === 'compound') continue;
    pieces(blk.rect).forEach((p, j) =>
      site(`endsfar ${blk.id} ${j}`, grow(p, 0.5), (into) => {
        const b = new Batch();
        flat(b, p, ON, LAWN);
        b.build(into, { cast: false, receive: true });
      })
    );
  }
  // The compound's plot: block paving in two tones (courses across it); its wall, gates and buildings are home3d.ts's
  pieces(PLOT, 13).forEach((p, j) =>
    site(`endsfar plot ${j}`, grow(p, 0.5), (into) => {
      const b = new Batch();
      flat(b, p, ON, PAVING);
      b.detail(() => {
        for (let z = Math.ceil(p[1] / 1.2) * 1.2; z < p[3]; z += 2.4) flat(b, [p[0], z, p[2], Math.min(p[3], z + 1.2)], OVER, PAVING_DARK);
      });
      b.build(into, { cast: false, receive: true });
    })
  );
}

export function register({ low, scene }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  registerRoads(low);
  registerPlots();
  // Degen's compound on its plot (home.ts, home3d.ts: docs/ends-far-west-plan.md Phase 2)
  registerHome(low);
  // Phase 4: the bungalows along the lane and the allotments behind; what's solid joins the grids on the main thread
  registerFarHomes(low);
  if (!scene) return;
  addSolids(FAR_HOME_SOLIDS);
  // Phase 5: its people into the crowd's spare slots (not on phones: their slots are all spoken for by the rest of the
  // city, and the reserve isn't raised for a quiet corner), and the pools of light at the gates, the garage and his
  // front door: flat glows, dark by day (as the lamps' pools)
  if (!low) addPeople(FAR_IDLE, FAR_PEOPLE);
  const flatQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), lit(glowMat(PAL.warm, 1), 0, 0.24), FAR_POOLS.length);
  const [m4, v, sv] = [new THREE.Matrix4(), new THREE.Vector3(), new THREE.Vector3()];
  FAR_POOLS.forEach(([x, z, size], i) => pools.setMatrixAt(i, m4.compose(v.set(x, SLAB_Y + 0.04, z), flatQ, sv.setScalar(size))));
  pools.frustumCulled = false;
  pools.name = 'endsfar-pools';
  scene.add(fx(pools));
}
