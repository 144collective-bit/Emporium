/*
 * Endswood's shopfronts painted into an atlas (docs/estate-plan.md Phase 4, shared since docs/ends-west-plan.md Phase 3
 * so the west parade's units look the old parade's): `shopfront()` paints a unit's fascia in its kind's colours, its
 * window and what's inside it, its door and stallriser, or its roller shutter with tags; `text()` fits a line into a
 * width. Fixed made-up copy only.
 */
import { FONT_DISPLAY, PAL, rng, shadeHex } from './kit';
import type { UnitKind } from './endsstreet';

/** A cell of an atlas: x, y, w, h */
export type Cell = [number, number, number, number];

export const FASCIA: Record<UnitKind, [string, string]> = {
  offy: ['#5a1e3a', '#f0d27a'],
  chicken: ['#c8241e', '#ffffff'],
  launderette: ['#2d6ab0', '#ffffff'],
  barber: ['#1d1c22', '#e8e2d2'],
  chippy: ['#1f4a7a', '#f2c94c'],
  news: ['#2f6a3e', '#f4f0e0'],
  phone: ['#3a3e48', '#9aa0aa'],
  hall: ['#4a4f5a', '#e8e2d2'],
};
export function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, w: number, size: number, color: string, weight = 900, font = FONT_DISPLAY) {
  c.font = `${weight} ${size}px ${font}`;
  const m = c.measureText(s).width;
  if (m > w) c.font = `${weight} ${Math.floor((size * w) / m)}px ${font}`;
  c.fillStyle = color;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(s, x, y);
}
/** A shopfront in a cell: the fascia, the window with what's inside it, the door, the stallriser; or the shutter */
export function shopfront(c: CanvasRenderingContext2D, [x, y, w, h]: Cell, name: string, kind: UnitKind, shut: boolean, glow: boolean, seed: number) {
  const r = rng(seed);
  const fh = Math.round(h * 0.26);
  const [bg, fg] = FASCIA[kind];
  // The fascia
  if (glow) {
    c.fillStyle = '#000';
    c.fillRect(x, y, w, h);
    if (!shut && (kind === 'chicken' || kind === 'chippy' || kind === 'offy' || kind === 'news')) {
      c.fillStyle = shadeHex(bg, 0.1);
      c.fillRect(x, y, w, fh);
      text(c, name, x + w / 2, y + fh / 2 + 2, w - 30, fh * 0.72, fg);
    }
  } else {
    c.fillStyle = '#4b3f46';
    c.fillRect(x, y, w, h);
    c.fillStyle = shut ? shadeHex(bg, -0.35) : bg;
    c.fillRect(x, y, w, fh);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(x, y + fh - 4, w, 4);
    text(c, name, x + w / 2, y + fh / 2 + 2, w - 30, fh * 0.72, shut ? shadeHex(fg, -0.4) : fg);
  }
  const by = y + fh;
  const bh = h - fh;
  if (shut) {
    if (glow) return;
    // A roller shutter, its slats, tags across it
    c.fillStyle = '#7d8088';
    c.fillRect(x + 8, by, w - 16, bh);
    c.fillStyle = '#5f626a';
    for (let yy = by + 4; yy < by + bh; yy += 7) c.fillRect(x + 8, yy, w - 16, 2);
    c.fillStyle = '#4a4d56';
    c.fillRect(x + 8, by, w - 16, 10);
    const cols = ['#c23a6a', '#2a8a9a', '#e8c23a', '#1d1c22'];
    c.font = `900 ${Math.round(bh * 0.36)}px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let k = 0; k < 3; k++) {
      c.save();
      c.translate(x + w * (0.22 + k * 0.28), by + bh * (0.4 + r() * 0.3));
      c.rotate((r() - 0.5) * 0.4);
      c.fillStyle = cols[k % cols.length];
      c.fillText(['ENDS', 'K2', 'TOX'][k], 0, 0);
      c.restore();
    }
    return;
  }
  // The window (left), the door (right)
  const dw = Math.round(w * 0.2);
  const wx = x + 10;
  const ww = w - dw - 30;
  const wy = by + 8;
  const wh = bh - 34;
  const inside = kind === 'chicken' ? '#fff4e0' : kind === 'launderette' ? '#e8f0ff' : kind === 'hall' ? '#d8cfb8' : PAL.warm;
  if (glow) {
    c.fillStyle = kind === 'hall' ? '#2a2620' : inside;
    c.fillRect(wx, wy, ww, wh);
    c.fillStyle = shadeHex(inside, -0.25);
    c.fillRect(x + w - dw - 12, wy, dw, bh - 16);
    return;
  }
  c.fillStyle = PAL.ink;
  c.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
  c.fillStyle = kind === 'chicken' ? '#efe6d2' : shadeHex(inside, -0.45);
  c.fillRect(wx, wy, ww, wh);
  // What's inside
  if (kind === 'offy' || kind === 'news') {
    for (let s = 0; s < 4; s++) {
      const sy = wy + 8 + s * ((wh - 10) / 4);
      c.fillStyle = '#5a4030';
      c.fillRect(wx, sy + (wh - 10) / 4 - 4, ww, 3);
      for (let px = wx + 4; px < wx + ww - 8; px += 9) {
        c.fillStyle = ['#c23a2a', '#2d6ab0', '#d9b43a', '#2f6a3e', '#e8e2d2', '#6a3d7a'][Math.floor(r() * 6)];
        const ph = 10 + r() * ((wh - 10) / 4 - 16);
        c.fillRect(px, sy + (wh - 10) / 4 - 4 - ph, 6, ph);
      }
    }
    if (kind === 'news') {
      c.fillStyle = '#e8e2d2';
      c.fillRect(wx + 8, wy + wh - 40, 60, 34);
      text(c, 'LOTTO', wx + 38, wy + wh - 23, 54, 16, '#c23a2a');
    }
  } else if (kind === 'chicken') {
    // Menu boards over the counter, a counter, the hot cabinet
    for (let k = 0; k < 3; k++) {
      c.fillStyle = '#c8241e';
      c.fillRect(wx + 10 + k * ((ww - 20) / 3), wy + 6, (ww - 20) / 3 - 8, 34);
      c.fillStyle = '#f2c94c';
      for (let l = 0; l < 3; l++) c.fillRect(wx + 16 + k * ((ww - 20) / 3), wy + 12 + l * 9, (ww - 20) / 3 - 22, 3);
    }
    c.fillStyle = '#8a8a92';
    c.fillRect(wx, wy + wh - 40, ww, 40);
    c.fillStyle = '#e0a020';
    c.fillRect(wx + 20, wy + wh - 58, ww * 0.4, 18);
    text(c, '2 WINGS + CHIPS', wx + ww / 2, wy + 60, ww - 20, 22, '#c8241e');
  } else if (kind === 'launderette') {
    for (let k = 0; k < 5; k++) {
      const mx = wx + 14 + k * ((ww - 20) / 5);
      c.fillStyle = '#e8e8ee';
      c.fillRect(mx, wy + wh - 62, (ww - 20) / 5 - 8, 58);
      c.fillStyle = '#3a3e48';
      c.beginPath();
      c.arc(mx + ((ww - 20) / 5 - 8) / 2, wy + wh - 30, 15, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#7aa0d0';
      c.beginPath();
      c.arc(mx + ((ww - 20) / 5 - 8) / 2, wy + wh - 30, 10, 0, Math.PI * 2);
      c.fill();
    }
    text(c, 'SERVICE WASH', wx + ww / 2, wy + 22, ww - 40, 20, '#2d6ab0');
  } else if (kind === 'barber') {
    c.fillStyle = '#c8c8d0';
    c.fillRect(wx + 20, wy + 10, ww * 0.5, wh * 0.45);
    c.fillStyle = '#1d1c22';
    c.fillRect(wx + ww * 0.25, wy + wh - 60, 50, 60);
    c.fillStyle = '#8a2a2a';
    c.fillRect(wx + ww * 0.25 + 6, wy + wh - 70, 38, 34);
    // (the pole by the door)
    for (let k = 0; k < 6; k++) {
      c.fillStyle = k % 3 === 0 ? '#c23a2a' : k % 3 === 1 ? '#ffffff' : '#2d4f8a';
      c.fillRect(wx + ww - 22, wy + 6 + k * ((wh - 12) / 6), 14, (wh - 12) / 6);
    }
    text(c, 'WALK-INS', wx + ww * 0.45, wy + wh * 0.6, ww * 0.4, 18, '#efe9d6');
  } else if (kind === 'chippy') {
    c.fillStyle = '#c0c4cc';
    c.fillRect(wx, wy + wh - 46, ww, 46);
    c.fillStyle = '#f2e6c0';
    c.fillRect(wx + 10, wy + 8, ww - 20, 44);
    for (let l = 0; l < 3; l++) {
      c.fillStyle = '#1f4a7a';
      c.fillRect(wx + 18, wy + 14 + l * 12, ww * 0.5, 4);
      c.fillRect(wx + ww - 70, wy + 14 + l * 12, 46, 4);
    }
  } else if (kind === 'hall') {
    // Wired glass, a noticeboard behind it
    c.fillStyle = '#6a6458';
    c.fillRect(wx, wy, ww, wh);
    c.fillStyle = '#2a3c5a';
    c.fillRect(wx + 12, wy + 12, ww * 0.55, wh * 0.5);
    for (let k = 0; k < 5; k++) {
      c.fillStyle = ['#e8e2d2', '#f2c94c', '#9ad0e0'][k % 3];
      c.fillRect(wx + 18 + (k % 3) * 34, wy + 18 + Math.floor(k / 3) * 30, 28, 22);
    }
    c.strokeStyle = 'rgba(200,200,210,0.3)';
    c.lineWidth = 1;
    for (let gx = wx; gx < wx + ww; gx += 10) {
      c.beginPath();
      c.moveTo(gx, wy);
      c.lineTo(gx, wy + wh);
      c.stroke();
    }
    for (let gy = wy; gy < wy + wh; gy += 10) {
      c.beginPath();
      c.moveTo(wx, gy);
      c.lineTo(wx + ww, gy);
      c.stroke();
    }
    text(c, 'RESIDENTS MEETING THURS', wx + ww * 0.5, wy + wh - 14, ww - 20, 14, '#efe9d6', 700);
  }
  // (a sticker or two in the glass, the glazing bar)
  c.fillStyle = '#e8e2d2';
  c.fillRect(wx + ww - 50, wy + wh - 22, 36, 16);
  c.fillStyle = PAL.ink;
  c.fillRect(wx + ww * 0.5, wy, 3, wh);
  // The door: glazed, a push plate; the stallriser under the window
  const dx = x + w - dw - 12;
  c.fillStyle = PAL.ink;
  c.fillRect(dx - 3, wy - 3, dw + 6, bh - 10);
  c.fillStyle = '#3a3e48';
  c.fillRect(dx, wy, dw, bh - 16);
  c.fillStyle = shadeHex(inside, -0.4);
  c.fillRect(dx + 6, wy + 6, dw - 12, bh - 40);
  c.fillStyle = '#c4c8d2';
  c.fillRect(dx + dw - 16, wy + bh * 0.4, 6, 20);
  c.fillStyle = '#3a3037';
  c.fillRect(x + 6, y + h - 24, w - dw - 22, 22);
}
