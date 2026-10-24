/*
 * The riverside's drawing kit (riverside3d.ts, waterfront3d.ts, boardwalk3d.ts
 * and nightmarket3d.ts draw with it; it's in the boot, since Pier 7 and the
 * Night Market are places built there): a world frame for infill.ts's kit,
 * boxes between two corners, arched panes and their frames, and the
 * riverside's sign atlas, a row each of fixed made-up copy (`SIGNS`,
 * `signPlane()`).
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, siteMat } from './kit';
import type { Frame } from './infill';

export const WORLD: Frame = { M: new THREE.Matrix4(), w: 0, d: 0, L: [0, 0], t: [1, 0], n: [0, 1] };
/** A box between two corners, given either way round */
export const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) =>
  b.box(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), mat);
function archShape(w: number, h: number) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, h - r);
  s.absarc(0, h - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}
/** An arched pane, flat, facing north (-z): its middle at x, standing on y, at z */
export function archPane(w: number, h: number, x: number, y: number, z: number, seg = 10) {
  return new THREE.ShapeGeometry(archShape(w, h), seg).rotateY(Math.PI).translate(x, y, z);
}
/** An arch's frame round the pane (its jambs and its ring), t wide, d deep out of the wall, facing north */
export function archFrame(w: number, h: number, t: number, d: number, x: number, y: number, z: number, seg = 10) {
  const outer = archShape(w + t * 2, h + t);
  outer.holes.push(archShape(w, h));
  return new THREE.ExtrudeGeometry(outer, { depth: d, bevelEnabled: false, curveSegments: seg }).rotateY(Math.PI).translate(x, y, z);
}

/* ---------- The riverside's signs: one atlas, a row each (fixed made-up copy) ---------- */

const ROWS = [
  { text: 'THE WHARF', color: '#7ff6ff', glow: '#00eaff', board: '#0b1420', font: 800 },
  { text: 'REFINERY', color: '#ffd23f', glow: '#ffb020', board: '#100d08', font: 900 },
  { text: 'THE REFINERY', color: '#f3e3c3', glow: '', board: '#5a2622', font: 800 },
  { text: 'HARBOR STORES', color: '#e6dccb', glow: '', board: '#3c2426', font: 900 },
  { text: 'PIER HOUSE', color: '#f2cf6b', glow: '', board: '#1d3a33', font: 800 },
  { text: 'PIER 7', color: '#ffffff', glow: '#ff3bd4', board: '#0d0b22', font: 900 },
  { text: 'BAIT · COFFEE', color: '#ffb347', glow: '#ff6a2f', board: '#14100c', font: 800 },
] as const;
export type SignRow = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const SIGNS = (() => {
  const W = 1024;
  const H = 128;
  const tex = canvasTex(W, H * ROWS.length, (c) => {
    ROWS.forEach((r, i) => {
      const y = i * H;
      c.fillStyle = r.board;
      c.fillRect(0, y, W, H);
      if (r.glow) {
        c.strokeStyle = r.glow;
        c.lineWidth = 5;
        c.strokeRect(10, y + 10, W - 20, H - 20);
      }
      c.font = `${r.font} 100px ${FONT_DISPLAY}`;
      const size = Math.min(100, (100 * (W - 90)) / c.measureText(r.text).width);
      c.font = `${r.font} ${size}px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (r.glow) {
        c.shadowColor = r.glow;
        c.shadowBlur = 22;
      }
      c.fillStyle = r.color;
      c.fillText(r.text, W / 2, y + H / 2 + 4);
      c.shadowBlur = 0;
    });
  });
  return siteMat('riverside-signs', lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.3));
})();
/** A board showing row `row`, w x h, facing north (-z), its middle at x, y, z */
export function signPlane(row: SignRow, w: number, h: number, x: number, y: number, z: number, facing: 'n' | 's' = 'n') {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const v0 = 1 - (row + 1) / ROWS.length;
  const v1 = 1 - row / ROWS.length;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? v1 - 0.004 : v0 + 0.004);
  return (facing === 'n' ? g.rotateY(Math.PI) : g).translate(x, y, z);
}

