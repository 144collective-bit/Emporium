// What's laid on Crestmont's hills sits on the grass as it's drawn (crestdrape.ts; the owner's call, 2026-11-19: the
// grass came up through the drives in stripes): every drive, footpath, bed and the golf course, the grass never
// over it anywhere inside.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandMesh, discMesh, lineMesh, poke, type Mesh } from '../src/scripts/city3d/crestdrape';
import { MANSIONS } from '../src/scripts/city3d/mansions';
import { GARDEN_PATHS, TRAIL, TRAILS } from '../src/scripts/city3d/crestcover';
import { banks } from '../src/scripts/city3d/crestbanks';
import { DRAPE, OVERLOOK_PATH, ROAD_LIFT, STEP, resample } from '../src/scripts/city3d/crestdrape';
import { HILL_ROADS } from '../src/scripts/city3d/crestmont';
import { BUNKER_R, FAIRWAY, FRINGE, GREEN_R, HOLES, OVERLOOK, TEE, bunkersOf } from '../src/scripts/city3d/crestsites';
import { offsetLine } from '../src/scripts/city3d/streetplan';
import { drawnAt, heightAt } from '../src/scripts/city3d/terrain';

/** The grass stays this far under anything laid on it, at the least */
const UNDER = 0.005;
const check = (what: string, m: Mesh) => {
  const p = poke(m);
  assert.ok(p < -UNDER, `the grass ${p >= 0 ? 'through' : 'right under'} ${what} (${p.toFixed(3)})`);
};

test('the drives: the grass under them all the way, from the road to the pad', () => {
  for (const m of MANSIONS) check(`${m.id}'s drive`, lineMesh(m.drive, DRAPE.drive.half, DRAPE.drive.lift));
});

test('the footpaths across the slopes and from the gardens', () => {
  for (const t of [...TRAILS, ...GARDEN_PATHS]) check(`the footpath ${t.from} to ${t.to}`, lineMesh(t.pts.map((p) => [p[0], p[1]]), TRAIL.half, DRAPE.path));
});

test("the banks' soil beds", () => {
  for (const b of banks()) for (const [k, bed] of b.beds.entries()) check(`${b.id}'s bed ${k}`, bandMesh(bed.map((s) => [s.ax, s.az]), bed.map((s) => [s.bx, s.bz]), DRAPE.bed));
});

test('the golf course: fairways, tees, fringes, greens and bunkers', () => {
  for (const [k, h] of HOLES.entries()) {
    const [dx, dz] = [h.green[0] - h.tee[0], h.green[1] - h.tee[1]];
    const L = Math.hypot(dx, dz);
    const [ux, uz] = [dx / L, dz / L];
    check(`hole ${k + 1}'s fairway`, lineMesh([[h.tee[0] + ux * 3, h.tee[1] + uz * 3], [h.green[0] - ux * (FRINGE - 0.4), h.green[1] - uz * (FRINGE - 0.4)]], FAIRWAY, DRAPE.fairway));
    check(`hole ${k + 1}'s tee`, lineMesh([[h.tee[0] - ux * TEE.half[1], h.tee[1] - uz * TEE.half[1]], [h.tee[0] + ux * TEE.half[1], h.tee[1] + uz * TEE.half[1]]], TEE.half[0], DRAPE.tee));
    check(`hole ${k + 1}'s fringe`, discMesh(h.green[0], h.green[1], FRINGE, FRINGE, DRAPE.fringe));
    check(`hole ${k + 1}'s green`, discMesh(h.green[0], h.green[1], GREEN_R, GREEN_R, DRAPE.green));
    for (const [x, z] of bunkersOf(h)) check(`hole ${k + 1}'s bunker`, discMesh(x, z, BUNKER_R, BUNKER_R * 0.75, DRAPE.bunker));
  }
});

test("the hill roads' asphalt (as crestmont3d.ts lays it: every half tile, over the higher of its bed and the grass) and the overlook's path", () => {
  for (const r of HILL_ROADS) {
    const pts = resample(r.pts, STEP);
    const [L, R] = [offsetLine(pts, -r.half), offsetLine(pts, r.half)];
    const pos: number[] = [];
    const idx: number[] = [];
    pts.forEach((_, i) => {
      for (const p of [L[i], R[i]]) pos.push(p[0], Math.max(heightAt(p[0], p[1]), drawnAt(p[0], p[1])) + ROAD_LIFT, p[1]);
    });
    for (let i = 1; i < pts.length; i++) idx.push((i - 1) * 2, (i - 1) * 2 + 1, i * 2 + 1, (i - 1) * 2, i * 2 + 1, i * 2);
    check(`${r.id}'s asphalt`, { pos, idx });
  }
  check("the overlook's path", lineMesh(OVERLOOK.path, OVERLOOK_PATH.half, OVERLOOK_PATH.lift));
});
