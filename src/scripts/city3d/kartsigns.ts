/*
 * The kart park's signs, shared by the place drawn at the boot (kartpark3d.ts:
 * the garages' numbers, the screen) and the grounds loaded as you approach
 * (kartgrounds3d.ts: the guidance, the banner): one sign atlas, quads laid on
 * its cells, and the lettering helpers.
 */
import * as THREE from 'three';
import { FONT_DISPLAY, PAL, canvasTex } from './kit';

/**
 * A quad from its centre, the axis its texture's u runs along (unit, in x / z), its size and its
 * atlas cell: standing up (`up`) or lying on the ground. Faces the side cross(u, up) points to
 * (standing) or up (lying, when u, v and up are right-handed).
 */
export function quad(cx: number, cy: number, cz: number, ux: number, uz: number, w: number, h: number, cell: number, lying: false | { vx: number; vz: number }) {
  const [u0, v0, u1, v1] = cellUv(cell);
  const hw = w / 2;
  const hh = h / 2;
  const corner = (su: number, sv: number): number[] =>
    lying ? [cx + ux * hw * su + lying.vx * hh * sv, cy, cz + uz * hw * su + lying.vz * hh * sv] : [cx + ux * hw * su, cy + hh * sv, cz + uz * hw * su];
  const pos = [...corner(-1, -1), ...corner(1, -1), ...corner(1, 1), ...corner(-1, 1)];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([u0, v0, u1, v0, u1, v1, u0, v1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return g;
}

/** Chequered bands along the top and bottom of a board */
export function chequerBands(c: CanvasRenderingContext2D, w: number, h: number, size: number) {
  for (let x = 0; x < w; x += size) {
    c.fillStyle = (x / size) % 2 ? '#e8e6f0' : '#1a1830';
    c.fillRect(x, 0, size, size * 0.6);
    c.fillStyle = (x / size) % 2 ? '#1a1830' : '#e8e6f0';
    c.fillRect(x, h - size * 0.6, size, size * 0.6);
  }
}

/** Glowing lettering with a white core */
export function glowText(c: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, blur: number) {
  c.shadowColor = color;
  c.shadowBlur = blur;
  c.fillStyle = color;
  c.fillText(text, x, y);
  c.shadowBlur = 0;
  c.fillStyle = '#ffffff';
  c.globalAlpha = 0.7;
  c.fillText(text, x, y);
  c.globalAlpha = 1;
}
export const spacing = (c: CanvasRenderingContext2D, px: number) => ((c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`);

/**
 * The guidance's sign atlas, 5 x 4 cells: a chevron board (arrows pointing along +u), an arrow to
 * paint on the asphalt (straight on, then turning towards +u), corner numbers 1-12 (white on ink, a
 * cyan rim) and the braking markers 3, 2, 1 (ink stripes on white, the count big).
 */
export const ATLAS_W = 5;
export const ATLAS_H = 4;
export const CELL = 128;
export const CELL_CHEVRON = 0;
export const CELL_ARROW = 1;
export const cellNumber = (n: number) => 1 + n;
export const cellMarker = (n: number) => 13 + (3 - n);
export function cellUv(cell: number): [number, number, number, number] {
  const cx = cell % ATLAS_W;
  const cy = Math.floor(cell / ATLAS_W);
  const pad = 2 / (CELL * ATLAS_W);
  const u0 = cx / ATLAS_W + pad;
  const u1 = (cx + 1) / ATLAS_W - pad;
  // Canvas rows run down, texture v runs up
  const v1 = 1 - cy / ATLAS_H - pad;
  const v0 = 1 - (cy + 1) / ATLAS_H + pad;
  return [u0, v0, u1, v1];
}
/** The atlas, painted once and shared (the garages' numbers here, the guidance in kartgrounds3d.ts) */
let atlas: THREE.Texture | null = null;
export const atlasTex = () =>
  (atlas ??= canvasTex(CELL * ATLAS_W, CELL * ATLAS_H, (c) => {
    const at = (cell: number) => [(cell % ATLAS_W) * CELL, Math.floor(cell / ATLAS_W) * CELL] as const;
    // The chevron board: red, three white chevrons pointing right
    {
      const [x, y] = at(CELL_CHEVRON);
      c.fillStyle = '#d42a3a';
      c.fillRect(x, y, CELL, CELL);
      c.fillStyle = '#ffffff';
      for (let k = 0; k < 3; k++) {
        const ox = x + 14 + k * 36;
        c.beginPath();
        c.moveTo(ox, y + 22);
        c.lineTo(ox + 26, y + 64);
        c.lineTo(ox, y + 106);
        c.lineTo(ox + 14, y + 106);
        c.lineTo(ox + 40, y + 64);
        c.lineTo(ox + 14, y + 22);
        c.closePath();
        c.fill();
      }
    }
    // The painted arrow: up from the bottom, curving right, on a clear ground
    {
      const [x, y] = at(CELL_ARROW);
      c.strokeStyle = '#f3f2f7';
      c.lineWidth = 18;
      c.lineCap = 'butt';
      c.beginPath();
      c.moveTo(x + 44, y + CELL);
      c.lineTo(x + 44, y + 70);
      c.quadraticCurveTo(x + 44, y + 40, x + 74, y + 40);
      c.stroke();
      c.fillStyle = '#f3f2f7';
      c.beginPath();
      c.moveTo(x + 72, y + 14);
      c.lineTo(x + 112, y + 40);
      c.lineTo(x + 72, y + 66);
      c.closePath();
      c.fill();
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    // Corner numbers
    for (let n = 1; n <= 12; n++) {
      const [x, y] = at(cellNumber(n));
      c.fillStyle = '#16142a';
      c.fillRect(x, y, CELL, CELL);
      c.strokeStyle = PAL.cyan;
      c.lineWidth = 8;
      c.strokeRect(x + 6, y + 6, CELL - 12, CELL - 12);
      c.fillStyle = '#ffffff';
      c.font = `900 ${n > 9 ? 78 : 92}px ${FONT_DISPLAY}`;
      c.fillText(String(n), x + CELL / 2, y + CELL / 2 + 6);
    }
    // Braking markers: white, n diagonal ink stripes, the count
    for (let n = 1; n <= 3; n++) {
      const [x, y] = at(cellMarker(n));
      c.fillStyle = '#f3f2f7';
      c.fillRect(x, y, CELL, CELL);
      c.fillStyle = '#16142a';
      for (let k = 0; k < n; k++) c.fillRect(x + 10, y + 12 + k * 18, CELL - 20, 10);
      c.font = `900 70px ${FONT_DISPLAY}`;
      c.fillText(String(n), x + CELL / 2, y + 92);
    }
  }));
