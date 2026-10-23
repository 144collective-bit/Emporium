/*
 * Uptown on screen, Phase 1 (docs/finance-plan.md; the numbers are
 * uptown.ts): a district loaded as you approach (districts.ts), its sites
 * built as you go. Until the towers come, its lots are bare earth (world.ts)
 * behind hoardings: dark boards round every block, printed outside with
 * UPTOWN and fixed made-up copy (one small atlas, two panels), a capping
 * rail, posts behind (near only), open at each lot's gate (two posts and a
 * header) and either side of the Mall's axis, whose lanes are paved across
 * the blocks. Its streets, lamps and the axis's zebras are the boot's
 * (streets3d.ts), the promenade along the bank the town's (neighbourhoods.ts).
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, FONT_MONO, canvasTex, siteMat, toon } from './kit';
import { SLAB, type Tick } from './world';
import { site } from './tilework';
import { HOARDING, HOARDINGS, HOARDING_GATES, UPTOWN_BLOCKS, UPTOWN_LANES, type Pt, type Rect } from './uptown';

/** Its own address, for the site worker (sitework.ts) */
export const SELF = import.meta.url;

const BOARD = toon('#1d1b2f');
const CAP = toon('#3a3656');
const POST = toon('#2a2740');
const PAVING = toon('#b7b0cf');

/** The hoardings' prints: one atlas, two panels (rows), fixed made-up copy only */
function prints() {
  const tex = canvasTex(1024, 512, (c) => {
    const panel = (y: number, big: string, small: string) => {
      c.fillStyle = '#0b0a18';
      c.fillRect(0, y, 1024, 256);
      // The PulseChain gradient for the big type and a rule under it
      const g = c.createLinearGradient(80, 0, 944, 0);
      g.addColorStop(0, '#ff2bd6');
      g.addColorStop(0.5, '#8000ff');
      g.addColorStop(1, '#00e1ff');
      c.fillStyle = g;
      c.font = `900 150px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(big, 512, y + 110);
      c.fillRect(160, y + 196, 704, 5);
      c.fillStyle = '#00e1ff';
      c.font = `600 30px ${FONT_MONO}`;
      c.fillText(small, 512, y + 228);
    };
    panel(0, 'UPTOWN', 'A NEW SKYLINE FOR SECTOR 7');
    panel(256, 'COMING SOON', 'UPTOWN · ON THE RIVER');
  });
  return siteMat('uptown-hoarding', new THREE.MeshToonMaterial({ map: tex }));
}

const PANEL = { w: 5.6, h: 1.4, y: 0.45 };
/** Is a point inside a block's hoarded lot (in from its edges, off the axis's lane) */
function hoarded(p: Pt) {
  const m = HOARDING.in;
  return UPTOWN_BLOCKS.some((b) => p[0] > b.rect[0] + m && p[0] < b.rect[2] - m && p[1] > b.rect[1] + m && p[1] < b.rect[3] - m) && !UPTOWN_LANES.some((l) => p[0] > l[0] - 0.4 && p[0] < l[2] + 0.4 && p[1] > l[1] && p[1] < l[3]);
}

/** One run of hoarding: the boards, a capping rail, posts behind, printed panels outside (`k` picks the copy) */
function run(b: Batch, [x0, z0, x1, z1]: Rect, mat: THREE.Material, k: number) {
  const { h, t } = HOARDING;
  const alongX = z0 === z1;
  const len = Math.abs(alongX ? x1 - x0 : z1 - z0);
  const [ux, uz] = alongX ? [Math.sign(x1 - x0), 0] : [0, Math.sign(z1 - z0)];
  const mid: Pt = [(x0 + x1) / 2, (z0 + z1) / 2];
  // Outside: the side that isn't the lot
  let [nx, nz] = alongX ? [0, 1] : [1, 0];
  if (hoarded([mid[0] + nx * 0.4, mid[1] + nz * 0.4])) [nx, nz] = [-nx, -nz];
  const lo: Pt = [Math.min(x0, x1), Math.min(z0, z1)];
  if (alongX) {
    b.box(lo[0], SLAB, z0 - t / 2, len, h - 0.08, t, BOARD);
    b.box(lo[0] - 0.02, SLAB + h - 0.08, z0 - t / 2 - 0.03, len + 0.04, 0.08, t + 0.06, CAP);
  } else {
    b.box(x0 - t / 2, SLAB, lo[1], t, h - 0.08, len, BOARD);
    b.box(x0 - t / 2 - 0.03, SLAB + h - 0.08, lo[1] - 0.02, t + 0.06, 0.08, len + 0.04, CAP);
  }
  b.detail(() => {
    for (let d = 1.5; d < len - 0.5; d += 3) {
      const [px, pz] = [x0 + ux * d - nx * (t / 2 + 0.05), z0 + uz * d - nz * (t / 2 + 0.05)];
      b.box(px - 0.05, SLAB, pz - 0.05, 0.1, h - 0.1, 0.1, POST);
    }
  });
  // As many panels as fit, centred, a hand's width apart
  const n = Math.floor((len - 0.4) / (PANEL.w + 0.3));
  for (let i = 0; i < n; i++) {
    const d = len / 2 + (i - (n - 1) / 2) * (PANEL.w + 0.3);
    const [px, pz] = [x0 + ux * d + nx * (t / 2 + 0.006), z0 + uz * d + nz * (t / 2 + 0.006)];
    const g = new THREE.PlaneGeometry(PANEL.w, PANEL.h);
    // (its row of the atlas: UPTOWN or COMING SOON, alternating along the run)
    const row = (k + i) % 2;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let v = 0; v < uv.count; v++) uv.setY(v, (1 - row) * 0.5 + uv.getY(v) * 0.5);
    b.add(g.rotateY(Math.atan2(nx, nz)).translate(px, SLAB + PANEL.y + PANEL.h / 2, pz), mat);
  }
}

export function register(_: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  const mat = prints();
  // The hoardings, a block's to a site, and its gate: two posts and a header over the opening
  UPTOWN_BLOCKS.forEach((blk, i) => {
    const [x0, z0, x1, z1] = blk.rect;
    site(`uptown hoardings ${blk.id}`, [x0 - 1, z0 - 1, x1 + 1, z1 + 1], (into) => {
      const b = new Batch();
      HOARDINGS.filter((h) => {
        const mx = (h[0] + h[2]) / 2;
        const mz = (h[1] + h[3]) / 2;
        return mx >= x0 && mx <= x1 && mz >= z0 && mz <= z1;
      }).forEach((h, k) => run(b, h, mat, k + i));
      const [gx, gz] = HOARDING_GATES[i];
      for (const s of [-1, 1]) b.box(gx + s * HOARDING.gate - 0.1, SLAB, gz - 0.1, 0.2, HOARDING.h + 0.3, 0.2, CAP);
      b.box(gx - HOARDING.gate - 0.1, SLAB + HOARDING.h + 0.1, gz - 0.08, HOARDING.gate * 2 + 0.2, 0.2, 0.16, CAP);
      b.build(into, { cast: true, receive: true });
    });
  });
  // The axis's lanes, paved across their blocks
  UPTOWN_LANES.forEach(([x0, z0, x1, z1], i) =>
    site(`uptown lane ${i}`, [x0, z0, x1, z1], (into) => {
      const b = new Batch();
      b.box(x0, SLAB, z0, x1 - x0, 0.01, z1 - z0, PAVING);
      b.build(into, { cast: false, receive: true });
    })
  );
}
