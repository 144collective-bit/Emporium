/**
 * Rooms behind the glass (docs/buildings-plan.md Phase 4, the owner's pick, desktops only): which of a modelled
 * front's windows show a room behind them, and how a room's window is told to the shader. DOM-free, tested in
 * tests/rooms.test.ts; rooms3d.ts draws them.
 *
 * Only a bare window has a room (windows.ts `paneAt()`'s `dressing`): blinds and curtains stay the atlas's paint, so
 * what you see near is what the wall shows far off. A room's light at night, and by day, is the painted window's own
 * (`roomCode()`), so it doesn't change as the room comes near.
 *
 * A Batch keeps only a geometry's position, normal and uv (kit.ts `Batch.add()`), so a room's window carries what the
 * shader needs in its uv: the fraction across and up the window, plus its width and height in centimetres and its
 * light's code in the whole part (`packRoomUv()`, `unpackRoomUv()`: the shader's sums are the same). The four corners
 * of a window share the whole part, so it's exact anywhere across it.
 */
import type { Light, Pane } from './windows';

/** The night lights in the order the shader knows them (1 on: 0 is none) */
export const ROOM_LIGHTS: Light[] = ['warm', 'tv', 'pink', 'cyan'];
/** Added to a room's code when the painted window is lit by day too */
export const DAY_BIT = 8;
/** How a window's height and its code share the uv's whole part: the code counts in steps of this (centimetres) */
export const CODE_STEP = 400;

/** A window's room code (its night light, 1 to 4, and `DAY_BIT` if lit by day), or null: no room (blinds, curtains) */
export function roomCode(p: Pick<Pane, 'dressing' | 'night' | 'day'>): number | null {
  if (p.dressing !== 'bare') return null;
  const light = p.night ? ROOM_LIGHTS.indexOf(p.night) + 1 : 0;
  return light + (p.day ? DAY_BIT : 0);
}

/** A corner's uv: `fx`, `fy` its fraction across and up the window (0 or 1), the window `w` by `h`, the room's code */
export function packRoomUv(fx: number, fy: number, w: number, h: number, code: number): [number, number] {
  const wc = Math.round(w * 100);
  const hc = Math.round(h * 100);
  return [fx + 2 * wc, fy + 2 * (hc + CODE_STEP * code)];
}

/** What the shader reads back from a uv anywhere across the window */
export function unpackRoomUv(u: number, v: number) {
  const wc = Math.floor(u / 2);
  const whole = Math.floor(v / 2);
  const code = Math.floor(whole / CODE_STEP);
  return { fx: u - 2 * wc, fy: v - 2 * whole, w: wc / 100, h: (whole - code * CODE_STEP) / 100, light: code % DAY_BIT, day: code >= DAY_BIT };
}
