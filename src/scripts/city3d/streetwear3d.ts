/*
 * The concrete-era look drawn (docs/highway-plan.md Phase 8; the numbers are streetwear.ts), a district loaded as you
 * approach (districts.ts `LAZY_DISTRICTS` id `streetwear`), a site a tile: the concrete gutters along the kerbs and
 * their drain grates, the patches of newer and older asphalt, the cracks (near only), the manhole covers, and the stop
 * lines and give-way dashes coming into the junctions. Each lies a hair over its street's asphalt (world.ts: the
 * east-west roads' top at 0.03, the north-south roads' at 0.032, the diagonals' at 0.034), the stop lines over the lane
 * dashes' tops.
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { site } from './tilework';
import { COVER } from './palette';
import { TILE } from './tiles';
import { CRACKS, DRAINS, GUTTERS, MANHOLES, PATCHES, STOP_LINES, WEAR, type Strip } from './streetwear';

/** This module's address, for the site worker (districts.ts) */
export const SELF = import.meta.url;

/** A street's asphalt top (world.ts) */
const top = (id: string) => (id.startsWith('diag') ? 0.034 : id.startsWith('ns') ? 0.032 : 0.03);
/** A flat piece lying along its yaw at y */
const flat = (s: Strip, y: number, w = s.wid, l = s.len) => new THREE.PlaneGeometry(l, w).rotateX(-Math.PI / 2).rotateY(s.yaw).translate(s.x, y, s.z);

export function register({ low }: { low: boolean }) {
  // Everything filed by the tile it's in, a site a tile
  const cells = new Map<string, { gut: Strip[]; drains: Strip[]; patches: (Strip & { tone: 0 | 1 })[]; cracks: Strip[]; holes: { street: string; x: number; z: number }[]; stops: (Strip & { give: boolean })[] }>();
  const cell = (x: number, z: number) => {
    const k = `${Math.floor(x / TILE)},${Math.floor(z / TILE)}`;
    let c = cells.get(k);
    if (!c) cells.set(k, (c = { gut: [], drains: [], patches: [], cracks: [], holes: [], stops: [] }));
    return c;
  };
  for (const g of GUTTERS) cell(g.x, g.z).gut.push(g);
  for (const d of DRAINS) cell(d.x, d.z).drains.push(d);
  for (const p of PATCHES) cell(p.x, p.z).patches.push(p);
  for (const c of CRACKS) cell(c.x, c.z).cracks.push(c);
  for (const m of MANHOLES) cell(m.x, m.z).holes.push(m);
  for (const s of STOP_LINES) cell(s.x, s.z).stops.push(s);
  for (const [k, c] of cells) {
    const [i, j] = k.split(',').map(Number);
    site(`street wear ${k}`, [i * TILE - 4, j * TILE - 4, (i + 1) * TILE + 4, (j + 1) * TILE + 4], (into) => {
      const b = new Batch();
      const gutter = toon(COVER.concrete);
      const grate = toon('#1c1a26');
      const old = toon('#1e1c31');
      const fresh = toon('#2f2c46');
      const crack = toon('#121020');
      const iron = toon('#47445a');
      const white = toon('#e8e4f8');
      for (const g of c.gut) b.add(flat(g, top(g.street) + 0.0012), gutter);
      for (const p of c.patches) b.add(flat(p, top(p.street) + 0.0016), p.tone ? fresh : old);
      for (const m of c.holes) b.add(new THREE.CircleGeometry(0.32, 14).rotateX(-Math.PI / 2).translate(m.x, top(m.street) + 0.0022, m.z), iron);
      for (const d of c.drains) {
        b.add(flat(d, top(d.street) + 0.0026), grate);
        // (its bars, near only)
        if (!low) b.detail(() => {
          for (let q = -2; q <= 2; q++) {
            const s = { ...d, x: d.x + Math.cos(d.yaw) * q * 0.1, z: d.z - Math.sin(d.yaw) * q * 0.1 };
            b.add(flat(s, top(d.street) + 0.0032, d.wid - 0.06, 0.03), iron);
          }
        });
      }
      if (!low) b.detail(() => {
        for (const cr of c.cracks) b.add(flat(cr, top(cr.street) + 0.0022), crack);
      });
      // The stop lines (one bar across the lanes) and the give-way dashes, over the lane dashes' tops
      for (const s of c.stops) {
        if (!s.give) b.add(flat(s, 0.0445), white);
        else {
          const n = Math.max(2, Math.floor(s.wid / (WEAR.dash * 2)));
          for (let q = 0; q < n; q++) {
            const off = -s.wid / 2 + WEAR.dash / 2 + (q * (s.wid - WEAR.dash)) / Math.max(1, n - 1);
            const [cx, cz] = [s.x + Math.sin(s.yaw) * off, s.z + Math.cos(s.yaw) * off];
            b.add(flat({ ...s, x: cx, z: cz }, 0.0445, WEAR.dash, 0.18), white);
          }
        }
      }
      b.build(into, { cast: false, receive: true });
    });
  }
}
