/*
 * The Flats' estates drawn (docs/crestmont-plan.md Phase 5; the numbers are estates.ts's), in Crestmont's chunk
 * (crestmont3d.ts `register()`), a site an estate (tilework.ts): its hedges, the gate's stone piers with their lamps
 * and the iron gates standing open, the drive and the forecourt in pale stone with its fountain, the house in its
 * style, the garden's pool on its deck with loungers. Each house is built in the estate's own frame (u along its
 * front, v out to the street) and turned into the world, a turn and never a mirror (coral3d.ts's way).
 *
 * - **Spanish Colonial:** white render, low red tile roofs, arched openings, an iron balcony, a tiled chimney.
 * - **Mediterranean villa:** warm ochre render, red tile roofs, shutters, its tower with a pyramid roof.
 * - **Tudor:** brick below, cream render and dark timbers above, steep slate gables, a tall brick chimney.
 * - **Georgian:** red brick with white quoins and cornice, a slate hipped roof, a white portico of columns under a
 *   pediment, chimneys at both ends.
 * - **White modern:** white boxes with flat roofs, the upper floor cantilevered out over the forecourt, glass walls,
 *   timber slats.
 *
 * Walls, roofs and windows are drawn at every distance; trims, shutters, timbers, gates and the garden near only.
 */
import * as THREE from 'three';
import { hip, tris } from './roofs3d';
export { hip, tris };
import { Batch, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { parkedCars, type CarId } from './cars';
import { COURT_HALF, ESTATES, ESTATE_CARS, FOUNTAIN, GATE, HEDGE, ROOF_H, SLAB_Y, STOREY, fountainOf, hedgesOf, motorCourt, outOf, originOf, piersOf, rectToWorld, wallTop, type Estate, type EstateStyle, type Part } from './estates';
import { CURTAIN, PAVING, TIMBER as SLATS, WATER, SPRAY, BULB, flat } from './mallkit';
import { PIER, extrasOf, loggiaPiers } from './crestgardens';

const RENDER_WHITE = toon('#f4efe4');
const OCHRE = toon('#e6c493');
const CREAM = toon('#efe3c6');
const BRICK = toon('#a4523f');
const BRICK_DARK = toon('#8a4434');
const TIMBER = toon('#3d2b22');
const SLATE = toon('#4d5566');
const TILE = toon('#c0603f');
const TILE_DARK = toon('#a44e34');
const STONE = toon('#d9cfbb');
const STONE_SHADE = toon('#c4b99f');
const TRIM = toon('#f7f5ef');
const IRON = toon('#1e1d22');
const WOOD = toon('#5a3a26');
const SHUTTERS = [toon('#4f7a5a'), toon('#4f6f8f')];
const HEDGE_GREEN = toon('#2f6a3a');
const LOUNGER = toon('#f1ede2');
const DARK = toon('#2a2a30');
const LAMP = neon('#ffe2a8', 0.2, 1.3);
const BRASS = toon('#c9a54a');
const GUTTER = toon('#2d2c33');
const GLASS_RAIL = toon('#a9dcef');
const SLATS_DECK = toon('#a8743f');
const TERRACOTTA_FLOOR = toon('#c97b56');
/** A window's surround, its glazing bars (how many upright, how many across) and their colour, by style */
const FRAME: Record<EstateStyle, THREE.Material> = { spanish: WOOD, villa: STONE_SHADE, tudor: TIMBER, georgian: TRIM, modern: IRON };
const BARS: Record<EstateStyle, [number, number]> = { spanish: [1, 1], villa: [1, 1], tudor: [2, 2], georgian: [2, 2], modern: [0, 0] };
const BAR: Record<EstateStyle, THREE.Material> = { spanish: WOOD, villa: WOOD, tudor: IRON, georgian: TRIM, modern: IRON };
/** The garage's doors and the front door, by style (a Georgian's in navy, a villa's in green) */
const GARAGE: Record<EstateStyle, THREE.Material> = { spanish: toon('#6b4630'), villa: toon('#5a3a26'), tudor: toon('#4a3326'), georgian: toon('#f3f1ea'), modern: toon('#3a3d44') };
const DOOR: Record<EstateStyle, THREE.Material> = { spanish: toon('#5a3a26'), villa: toon('#4b6a4e'), tudor: toon('#3d2b22'), georgian: toon('#1d2a4a'), modern: toon('#6b4630') };
const HEDGE_TOP = toon('#3a8a4e');
/** Windows: dark glass by day, warm light at night */
export const WINDOW = siteMat('estate-window', lit(toon('#3b4c60', { emissive: '#ffd59a' }), 0, 0.85));
/** A pool's water: lit from under at night, a soft glowing turquoise (Phase 8; under the bloom's threshold) */
export const POOL = siteMat('crest-pool', lit(toon('#56b6d6', { emissive: '#2fd2ff' }), 0, 0.6));
/** The pools' water: glowing, but plain water on phones (Phase 11: one material fewer, no glow to draw) */
export const poolOf = (low: boolean) => (low ? WATER : POOL);

/** A house's walls, its trims and its roof, by style */
const WALL: Record<EstateStyle, THREE.Material> = { spanish: RENDER_WHITE, villa: OCHRE, tudor: CREAM, georgian: BRICK, modern: RENDER_WHITE };
const ROOF: Record<EstateStyle, THREE.Material> = { spanish: TILE, villa: TILE, tudor: SLATE, georgian: SLATE, modern: STONE_SHADE };

type V3 = [number, number, number];

/** A gabled roof, its ridge along u: the slopes overhang `o` all round, the gable ends in the walls' planes */
function gable(u0: number, v0: number, u1: number, v1: number, y: number, h: number, o: number) {
  const [x0, x1, z0, z1] = [u0 - o, u1 + o, v1 - o, v0 + o];
  const cz = (v0 + v1) / 2;
  const top = y + h;
  const mid: V3 = [(u0 + u1) / 2, y + h * 0.3, cz];
  const slopes = tris(
    [
      [[x0, y, z1], [x1, y, z1], [x1, top, cz]],
      [[x0, y, z1], [x1, top, cz], [x0, top, cz]],
      [[x0, y, z0], [x1, y, z0], [x1, top, cz]],
      [[x0, y, z0], [x1, top, cz], [x0, top, cz]],
    ],
    mid
  );
  const ends = tris(
    [
      [[u0, y, v0], [u0, y, v1], [u0, top, cz]],
      [[u1, y, v0], [u1, y, v1], [u1, top, cz]],
    ],
    mid
  );
  return { slopes, ends };
}

/** The estate's frame: local +x along its front, +y up from the slab, +z out to the street (a turn, never a mirror) */
function frameOf(e: Estate) {
  const [ox, oz] = outOf(e);
  const [cx, cz] = originOf(e);
  return new THREE.Matrix4().set(oz, 0, ox, cx, 0, 1, 0, SLAB_Y, -ox, 0, oz, cz, 0, 0, 0, 1);
}

export function registerEstates(low: boolean, scene: THREE.Scene | null) {
  for (const e of ESTATES) {
    const [x0, z0, x1, z1] = e.rect;
    site(`crestmont ${e.id}`, [x0 - 1, z0 - 1, x1 + 1, z1 + 1], (into) => {
      const b = new Batch();
      const M = frameOf(e);
      const add = (g: THREE.BufferGeometry, m: THREE.Material) => b.add(g.applyMatrix4(M), m);
      const box = (u0: number, y0: number, v0: number, u1: number, y1: number, v1: number, m: THREE.Material) =>
        add(new THREE.BoxGeometry(Math.abs(u1 - u0), y1 - y0, Math.abs(v1 - v0)).translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2), m);
      const cyl = (r: number, h: number, u: number, y: number, v: number, m: THREE.Material, seg = 10, r0 = r, open = false) => add(new THREE.CylinderGeometry(r, r0, h, seg, 1, open).translate(u, y + h / 2, v), m);
      /** A window (or an opening) on a wall: its middle along the wall at (u, v), facing `n` (a unit u, v), w x h from y */
      const pane = (u: number, v: number, n: [number, number], w: number, y: number, h: number, m: THREE.Material = WINDOW, arch = false, off = 0.012) => {
        let g: THREE.BufferGeometry;
        if (arch) {
          const s = new THREE.Shape();
          const r = w / 2;
          s.moveTo(-r, 0);
          s.lineTo(r, 0);
          s.lineTo(r, h - r);
          s.absarc(0, h - r, r, 0, Math.PI, false);
          s.lineTo(-r, 0);
          g = new THREE.ShapeGeometry(s, 8).translate(0, y, 0);
        } else g = new THREE.PlaneGeometry(w, h).translate(0, y + h / 2, 0);
        add(g.rotateY(Math.atan2(n[0], n[1])).translate(u + n[0] * off, 0, v + n[1] * off), m);
      };
      const { style } = e;
      const wall = WALL[style];
      const roof = ROOF[style];
      const parts = [e.house.main, e.house.wing, e.house.tower].filter((p): p is Part => !!p);

      /* ---------- The house ---------- */
      const extras = extrasOf(e);
      const wing = e.house.wing;
      /** A window: its pane, and near it, its surround or sill, its glazing bars, shutters or grille by style */
      const win = (u: number, v: number, n: [number, number], w: number, y: number, h: number, arch: boolean, front: boolean, ground: boolean) => {
        pane(u, v, n, w, y, h, WINDOW, arch, 0.035);
        b.detail(() => {
          const along: [number, number] = [n[1], -n[0]];
          /** A box on the wall: `a` along it from the window's middle, `o` out from the wall, y0..y1 */
          const on = (a0: number, a1: number, o0: number, o1: number, y0: number, y1: number, m: THREE.Material) => {
            const [p0, p1] = [
              [u + along[0] * a0 + n[0] * o0, v + along[1] * a0 + n[1] * o0],
              [u + along[0] * a1 + n[0] * o1, v + along[1] * a1 + n[1] * o1],
            ];
            box(Math.min(p0[0], p1[0]), y0, Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), y1, Math.max(p0[1], p1[1]), m);
          };
          const surround = FRAME[style];
          // (the surround: a square frame behind the pane; an arched one keeps its sill and a keystone)
          if (!arch) on(-w / 2 - 0.07, w / 2 + 0.07, 0, 0.03, y - 0.07, y + h + 0.07, surround);
          else on(-0.06, 0.06, 0, 0.045, y + h - 0.02, y + h + 0.14, STONE_SHADE);
          if (style !== 'modern') on(-w / 2 - 0.1, w / 2 + 0.1, 0, 0.1, y - 0.12, y - 0.04, style === 'georgian' || style === 'tudor' ? TRIM : STONE_SHADE);
          if (low) return;
          // (glazing bars: a Georgian's six panes, a Tudor's leaded lights, a casement's cross; a modern's none)
          const bars = BARS[style];
          for (let k = 1; k <= bars[0]; k++) on(-w / 2 + (k * w) / (bars[0] + 1) - 0.015, -w / 2 + (k * w) / (bars[0] + 1) + 0.015, 0.035, 0.05, y, y + (arch ? h - w / 2 : h), BAR[style]);
          for (let k = 1; k <= bars[1]; k++) {
            const yy = y + (k * (arch ? h - w / 2 : h)) / (bars[1] + 1);
            on(-w / 2, w / 2, 0.035, 0.05, yy - 0.015, yy + 0.015, BAR[style]);
          }
          if (front && (style === 'georgian' || style === 'villa')) for (const s of [-1, 1]) on(s * (w / 2 + 0.06), s * (w / 2 + 0.36), 0, 0.06, y, y + h, style === 'georgian' ? IRON : SHUTTERS[e.id.length % 2]);
          // (a Spanish house's iron grilles over its ground floor's front windows)
          if (front && ground && style === 'spanish') {
            const top = y + h - w / 2;
            for (let k = 1; k <= 3; k++) on(-w / 2 + (k * w) / 4 - 0.018, -w / 2 + (k * w) / 4 + 0.018, 0.07, 0.1, y, top + 0.05, IRON);
            for (const yy of [y + 0.08, top]) on(-w / 2 - 0.04, w / 2 + 0.04, 0.07, 0.1, yy - 0.02, yy + 0.02, IRON);
          }
        });
      };
      for (const p of parts) {
        const top = wallTop(p);
        const modernUp = style === 'modern' && p === e.house.main;
        // The walls (a modern main block's upper floor cantilevered out over the forecourt)
        if (modernUp) {
          box(p.u0, 0, p.v0, p.u1, STOREY.ground, p.v1, wall);
          box(p.u0 - 0.3, STOREY.ground, p.v0 + 0.9, p.u1 + 0.3, top, p.v1, wall);
        } else if (style === 'tudor' && p.floors > 1) {
          box(p.u0, 0, p.v0, p.u1, STOREY.ground, p.v1, BRICK);
          box(p.u0 - 0.12, STOREY.ground, p.v0 + 0.12, p.u1 + 0.12, top, p.v1 - 0.12, CREAM);
        } else box(p.u0, 0, p.v0, p.u1, top, p.v1, wall);
        // A plinth round its foot (a modern's a dark shadow gap)
        if (style !== 'modern' && !(style === 'tudor' && p.floors > 1))
          box(p.u0 - 0.04, 0, p.v0 + 0.04, p.u1 + 0.04, 0.28, p.v1 - 0.04, style === 'georgian' ? STONE : STONE_SHADE);
        // The windows: a row a storey on the front and back, a few on the ends
        const fv = modernUp ? p.v0 + 0.9 : style === 'tudor' && p.floors > 1 ? p.v0 + 0.12 : p.v0;
        const bv = style === 'tudor' && p.floors > 1 ? p.v1 - 0.12 : p.v1;
        const W = p.u1 - p.u0;
        const n = Math.max(1, Math.floor(W / 1.7));
        const garage = p === wing;
        const isMain = p === e.house.main;
        for (let f = 0; f < p.floors; f++) {
          const y = f === 0 ? 0.5 : STOREY.ground + (f - 1) * STOREY.upper + 0.4;
          const front = f === 0 ? p.v0 : fv;
          const backV = f === 0 ? p.v1 : bv;
          if (modernUp && f === 0) {
            // (glass across the modern's ground floor, set back under the cantilever, its mullions near)
            const g = new THREE.PlaneGeometry(W - 0.4, STOREY.ground - 0.3);
            const uv = g.attributes.uv;
            for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) * (W - 0.4)) / 3.2, (uv.getY(k) * (STOREY.ground - 0.3)) / 3.2);
            add(g.translate((p.u0 + p.u1) / 2, (STOREY.ground - 0.3) / 2 + 0.15, p.v0 + 0.012), CURTAIN);
            b.detail(() => {
              for (let u = p.u0 + 0.2; u <= p.u1 - 0.19; u += (W - 0.4) / Math.max(2, Math.round((W - 0.4) / 1.1))) box(u - 0.03, 0.1, p.v0, u + 0.03, STOREY.ground - 0.1, p.v0 + 0.05, IRON);
            });
          } else
            for (let i = 0; i < n; i++) {
              const u = p.u0 + ((i + 0.5) * W) / n;
              // (the front door's bay on the main block's ground floor; the garage's doors on the wing's)
              if (f === 0 && isMain && Math.abs(u - e.hc) < W / n / 2) continue;
              if (f === 0 && garage) continue;
              // (behind a Tudor's bay)
              if (extras.bay && isMain && u > extras.bay[0] - 0.4 && u < extras.bay[2] + 0.4) {
                pane(u, backV, [0, -1], 0.75, y, 1.05, WINDOW, false, 0.035);
                continue;
              }
              const arch = (style === 'spanish' || style === 'villa') && f === 0;
              const [w, h] = style === 'modern' ? [1.3, 1.3] : [0.75, arch ? 1.2 : 1.05];
              win(u, front, [0, 1], w, y, h, arch, true, f === 0);
              win(u, backV, [0, -1], w, y, h, arch, false, f === 0);
            }
          // (the ends)
          for (const s of [-1, 1]) {
            const u = s < 0 ? p.u0 - (style === 'tudor' && f > 0 ? 0.12 : 0) : p.u1 + (style === 'tudor' && f > 0 ? 0.12 : 0);
            win(u, (p.v0 + p.v1) / 2, [s, 0], 0.75, y, style === 'modern' ? 1.3 : 1.05, false, false, f === 0);
          }
        }
        // The garden doors: glazed doors in pairs on the main block's back, under a transom
        if (isMain) {
          pane(e.hc, p.v1, [0, -1], 1.35, 0.06, 1.75, WINDOW, false, 0.035);
          b.detail(() => {
            const fr = FRAME[style];
            box(e.hc - 0.75, 0, p.v1 - 0.03, e.hc + 0.75, 1.88, p.v1, fr);
            box(e.hc - 0.025, 0.06, p.v1 - 0.05, e.hc + 0.025, 1.81, p.v1 - 0.035, BAR[style]);
            box(e.hc - 0.68, 1.4, p.v1 - 0.05, e.hc + 0.68, 1.43, p.v1 - 0.035, BAR[style]);
          });
        }
        // The garage: doors on the wing's front, panelled, its apron paved (below)
        if (garage) {
          const gu = (p.u0 + p.u1) / 2;
          const gw = Math.min(2.2, W - 0.5);
          pane(gu, p.v0, [0, 1], gw, 0.02, 1.62, GARAGE[style], false, 0.03);
          b.detail(() => {
            box(gu - gw / 2 - 0.08, 0, p.v0, gu + gw / 2 + 0.08, 1.74, p.v0 + 0.025, FRAME[style]);
            if (!low) for (let k = 1; k < 4; k++) box(gu - gw / 2 + 0.04, 0.02 + k * 0.405 - 0.012, p.v0 + 0.03, gu + gw / 2 - 0.04, 0.02 + k * 0.405 + 0.012, p.v0 + 0.045, BAR[style] === TRIM ? STONE_SHADE : BAR[style]);
            add(new THREE.SphereGeometry(0.07, 6, 4).translate(gu, 1.95, p.v0 + 0.1), LAMP);
          });
        }
        // The roof
        if (style === 'modern') {
          const [a, c] = modernUp ? [p.u0 - 0.3, p.u1 + 0.3] : [p.u0, p.u1];
          const v0 = modernUp ? p.v0 + 0.9 : p.v0;
          box(a - 0.1, top, v0 + 0.1, c + 0.1, top + ROOF_H.modern, p.v1 - 0.1, TRIM);
          add(new THREE.PlaneGeometry(c - a - 0.2, v0 - p.v1 - 0.2).rotateX(-Math.PI / 2).translate((a + c) / 2, top + ROOF_H.modern + 0.006, (v0 + p.v1) / 2), STONE_SHADE);
          // (a roof terrace on the wing: a glass rail round it, a timber deck, loungers)
          if (garage && p.floors > 1)
            b.detail(() => {
              const t = top + ROOF_H.modern;
              add(new THREE.PlaneGeometry(c - a - 0.6, v0 - p.v1 - 0.6).rotateX(-Math.PI / 2).translate((a + c) / 2, t + 0.02, (v0 + p.v1) / 2), SLATS_DECK);
              for (const [x0, z0, x1, z1] of [
                [a, v0, c, v0 - 0.05],
                [a, p.v1 + 0.05, c, p.v1],
                [a, v0, a + 0.05, p.v1],
                [c - 0.05, v0, c, p.v1],
              ])
                box(x0, t, z0, x1, t + 0.85, z1, GLASS_RAIL);
              if (!low) box((a + c) / 2 - 0.25, t + 0.02, v0 - 0.6, (a + c) / 2 + 0.25, t + 0.28, v0 - 1.8, LOUNGER);
            });
        } else if (style === 'tudor') {
          const g = gable(p.u0 - 0.12, p.v0 + 0.12, p.u1 + 0.12, p.v1 - 0.12, top, ROOF_H.tudor, 0.3);
          add(g.slopes, SLATE);
          add(g.ends, CREAM);
          // (the gable ends' timbers: a king post and the bargeboards)
          b.detail(() => {
            const cz = (p.v0 + p.v1) / 2;
            for (const u of [p.u0 - 0.14, p.u1 + 0.14]) {
              const s = u < p.u0 ? -1 : 1;
              box(u - 0.03 * s, top, cz - 0.05, u + 0.02 * s, top + ROOF_H.tudor - 0.15, cz + 0.05, TIMBER);
              box(u - 0.03 * s, top, p.v0 - 0.2, u + 0.02 * s, top + 0.1, p.v1 + 0.2, TIMBER);
            }
          });
        } else {
          const h = p === e.house.tower ? ROOF_H.villa + 0.3 : ROOF_H[style];
          const o = style === 'georgian' ? 0.2 : 0.4;
          const [r, soffit] = hip(p.u0, p.v0, p.u1, p.v1, top, h, o);
          add(r, roof);
          add(soffit, style === 'georgian' ? TRIM : WOOD);
          b.detail(() => {
            // (the gutters along the eaves; a Spanish house's rafter tails under them)
            for (const v of [p.v0 + o - 0.02, p.v1 - o + 0.02]) box(p.u0 - o, top - 0.08, v - 0.05, p.u1 + o, top + 0.02, v + 0.05, style === 'georgian' ? TRIM : GUTTER);
            if (style === 'spanish' && !low) for (let u = p.u0 + 0.2; u < p.u1 - 0.1; u += 0.5) for (const v of [p.v0, p.v1]) box(u - 0.04, top - 0.12, v - (v === p.v0 ? 0 : o - 0.06), u + 0.04, top - 0.02, v + (v === p.v0 ? o - 0.06 : 0), WOOD);
          });
          // A Georgian's dormers on the front slope
          if (style === 'georgian' && isMain) {
            const d = p.v0 - p.v1 + 2 * o;
            const vf = p.v0 - 0.35;
            const yf = top + (h * (p.v0 + o - vf)) / (d / 2);
            for (const du of [p.u0 + W * 0.26, p.u1 - W * 0.26]) {
              box(du - 0.42, yf - 0.15, vf, du + 0.42, yf + 0.75, vf - 1.1, TRIM);
              pane(du, vf, [0, 1], 0.5, yf, 0.62, WINDOW, false, 0.012);
              const [dr, ds] = hip(du - 0.42, vf, du + 0.42, vf - 1.1, yf + 0.75, 0.32, 0.08);
              add(dr, SLATE);
              add(ds, TRIM);
            }
          }
        }
        // Trims: a cornice, quoins, timbers
        b.detail(() => {
          if (style === 'georgian') {
            box(p.u0 - 0.08, top - 0.18, p.v0 + 0.08, p.u1 + 0.08, top, p.v1 - 0.08, TRIM);
            for (const u of [p.u0, p.u1]) for (const v of [p.v0, p.v1]) box(u - 0.12, 0, v - 0.12, u + 0.12, top - 0.18, v + 0.12, TRIM);
            // (a string course between the floors)
            if (p.floors > 1) box(p.u0 - 0.04, STOREY.ground - 0.05, p.v0 + 0.04, p.u1 + 0.04, STOREY.ground + 0.05, p.v1 - 0.04, TRIM);
          }
          // (a villa's quoins up its corners, long and short in turn)
          if (style === 'villa' && !low) for (const u of [p.u0, p.u1]) for (const v of [p.v0, p.v1]) for (let k = 0, y = 0.3; y < top - 0.45; k++, y += 0.5) box(u - 0.1 - (k % 2) * 0.08, y, v - 0.1 - ((k + 1) % 2) * 0.08, u + 0.1 + (k % 2) * 0.08, y + 0.42, v + 0.1 + ((k + 1) % 2) * 0.08, STONE);
          if (style === 'tudor' && p.floors > 1 && !low) {
            // (the upper storey's frame on its front, back and ends, its braces)
            const y0 = STOREY.ground;
            for (const [f, n] of [
              [p.v0 + 0.12, 1],
              [p.v1 - 0.12, -1],
            ] as [number, number][]) {
              const f2 = f + n * 0.05;
              box(p.u0 - 0.12, y0, f, p.u1 + 0.12, y0 + 0.12, f2, TIMBER);
              box(p.u0 - 0.12, top - 0.12, f, p.u1 + 0.12, top, f2, TIMBER);
              const step = (p.u1 - p.u0) / Math.max(2, Math.round((p.u1 - p.u0) / 0.9));
              for (let u = p.u0; u <= p.u1 + 0.01; u += step) box(u - 0.05, y0, f, u + 0.05, top, f2, TIMBER);
              // (a brace in every other bay, leaning in turn)
              const k0 = Math.round((p.u1 - p.u0) / step);
              for (let k = 0; k < k0; k += 2) {
                const L = Math.hypot(step, top - y0 - 0.24);
                add(new THREE.BoxGeometry(0.07, L, 0.05).rotateZ(Math.atan2(step, top - y0 - 0.24) * ((k / 2) % 2 ? 1 : -1)).translate(p.u0 + (k + 0.5) * step, (y0 + top) / 2, (f + f2) / 2), TIMBER);
              }
            }
            for (const u of [p.u0 - 0.12, p.u1 + 0.12]) {
              const s = u < p.u0 ? -1 : 1;
              const step = (p.v0 - p.v1) / Math.max(2, Math.round((p.v0 - p.v1) / 0.9));
              for (let v = p.v1; v <= p.v0 + 0.01; v += step) box(u, y0, v - 0.05, u + s * 0.05, top, v + 0.05, TIMBER);
            }
          }
          if (style === 'modern' && p === e.house.main) {
            const g = new THREE.PlaneGeometry(1.8, STOREY.upper - 0.2);
            add(g.translate(p.u1 - 0.9 + 0.3, STOREY.ground + STOREY.upper / 2, p.v0 + 0.9 + 0.012), SLATS);
          }
        });
      }

      // A Tudor's gabled bay out from its front, two storeys of windows in its own timbers
      if (extras.bay) {
        const [u0, v0, u1, v1] = extras.bay;
        const m = e.house.main;
        const top = wallTop(m);
        const cu = (u0 + u1) / 2;
        box(u0, 0, v0 + 0.01, u1, STOREY.ground, v1, BRICK);
        box(u0 - 0.1, STOREY.ground, v0 + 0.01, u1 + 0.1, top, v1 + 0.1, CREAM);
        win(cu, v1, [0, 1], Math.min(1.1, u1 - u0 - 0.5), 0.5, 1.05, false, true, true);
        win(cu, v1 + 0.1, [0, 1], Math.min(1.1, u1 - u0 - 0.5), STOREY.ground + 0.4, 1.05, false, true, false);
        // (its gable: the slopes falling to either side, the face in render, the ridge back into the roof)
        const gh = ROOF_H.tudor * 0.85;
        const [a, c, f, bk] = [u0 - 0.25, u1 + 0.25, v1 + 0.3, v0 - 1.2];
        const apex = top + gh;
        add(tris([[[a, top, f], [cu, apex, f], [cu, apex, bk]], [[a, top, f], [cu, apex, bk], [a, top, bk]], [[c, top, f], [cu, apex, f], [cu, apex, bk]], [[c, top, f], [cu, apex, bk], [c, top, bk]]], [cu, top + gh * 0.3, (f + bk) / 2]), SLATE);
        add(tris([[[u0 - 0.1, top, v1 + 0.1], [u1 + 0.1, top, v1 + 0.1], [cu, apex - 0.12, v1 + 0.1]]], [cu, top + gh * 0.3, v1 - 1]), CREAM);
        b.detail(() => {
          box(u0 - 0.1, STOREY.ground, v1 + 0.1, u1 + 0.1, STOREY.ground + 0.12, v1 + 0.15, TIMBER);
          for (const u of [u0 - 0.05, cu, u1 + 0.05]) box(u - 0.05, STOREY.ground, v1 + 0.1, u + 0.05, top, v1 + 0.15, TIMBER);
          box(cu - 0.05, top, v1 + 0.1, cu + 0.05, apex - 0.2, v1 + 0.15, TIMBER);
          for (const s of [-1, 1]) {
            const L = Math.hypot((u1 - u0) / 2 + 0.25, gh);
            add(new THREE.BoxGeometry(L, 0.1, 0.06).rotateZ(-s * Math.atan2(gh, (u1 - u0) / 2 + 0.25)).translate(cu + (s * ((u1 - u0) / 2 + 0.25)) / 2, top + gh / 2, f + 0.02), TIMBER);
          }
        });
      }
      // A Spanish house's or a villa's loggia along its back: piers and arches, a lean-to roof of tiles
      if (extras.loggia) {
        const [u0, v0, u1, v1] = extras.loggia;
        const H = STOREY.ground - 0.05;
        const piers = loggiaPiers(extras.loggia);
        // (the openings between the piers, each a round arch springing well under the band across the top)
        const r = (piers[1] - piers[0] - 2 * PIER) / 2;
        const spring = H - 0.12 - r;
        for (const u of piers) box(u - PIER, 0, v0, u + PIER, spring, v0 + 2 * PIER, wall);
        for (let k = 0; k < piers.length - 1; k++) {
          const [a, c] = [piers[k] - PIER, piers[k + 1] + PIER];
          const sp = new THREE.Shape();
          sp.moveTo(a, spring);
          sp.lineTo(a + 2 * PIER, spring);
          sp.absarc((a + c) / 2, spring, r, Math.PI, 0, true);
          sp.lineTo(c, spring);
          sp.lineTo(c, H);
          sp.lineTo(a, H);
          sp.lineTo(a, spring);
          add(new THREE.ExtrudeGeometry(sp, { depth: 2 * PIER, bevelEnabled: false, curveSegments: low ? 5 : 8 }).translate(0, 0, v0), wall);
        }
        box(u0, H, v0, u1, H + 0.15, v1, wall);
        const lean = tris([[[u0 - 0.15, H + 0.12, v0 - 0.25], [u1 + 0.15, H + 0.12, v0 - 0.25], [u1 + 0.15, H + 0.55, v1]], [[u0 - 0.15, H + 0.12, v0 - 0.25], [u1 + 0.15, H + 0.55, v1], [u0 - 0.15, H + 0.55, v1]]], [(u0 + u1) / 2, 0, (v0 + v1) / 2]);
        add(lean, TILE);
        add(new THREE.PlaneGeometry(u1 - u0, v1 - v0).rotateX(-Math.PI / 2).translate((u0 + u1) / 2, 0.016, (v0 + v1) / 2), TERRACOTTA_FLOOR);
        b.detail(() => {
          for (let k = 0; k < piers.length - 1; k++) add(new THREE.SphereGeometry(0.07, 6, 4).translate((piers[k] + piers[k + 1]) / 2, H - 0.45, (v0 + v1) / 2), LAMP);
        });
      }

      // The chimneys (phones: near only, Phase 11), with their pots
      if (low) b.lod = 'near';
      const m = e.house.main;
      const mt = wallTop(m);
      if (style === 'tudor') {
        box(m.u1 - 1.2, mt - 0.5, m.v1 + 1.4, m.u1 - 0.6, mt + ROOF_H.tudor + 0.6, m.v1 + 0.8, BRICK_DARK);
        box(m.u1 - 1.25, mt + ROOF_H.tudor + 0.5, m.v1 + 1.45, m.u1 - 0.55, mt + ROOF_H.tudor + 0.62, m.v1 + 0.75, STONE_SHADE);
        for (const du of [-1.05, -0.75]) cyl(0.08, 0.3, m.u1 + du, mt + ROOF_H.tudor + 0.62, m.v1 + 1.1, TERRACOTTA_FLOOR, 6, 0.1);
      }
      if (style === 'georgian')
        for (const u of [m.u0 + 0.5, m.u1 - 1.1]) {
          box(u, mt, (m.v0 + m.v1) / 2 + 0.3, u + 0.6, mt + ROOF_H.georgian + 0.6, (m.v0 + m.v1) / 2 - 0.3, BRICK_DARK);
          box(u - 0.04, mt + ROOF_H.georgian + 0.5, (m.v0 + m.v1) / 2 + 0.34, u + 0.64, mt + ROOF_H.georgian + 0.62, (m.v0 + m.v1) / 2 - 0.34, TRIM);
          for (const dz of [-0.14, 0.14]) cyl(0.07, 0.25, u + 0.3, mt + ROOF_H.georgian + 0.62, (m.v0 + m.v1) / 2 + dz, TERRACOTTA_FLOOR, 6, 0.09);
        }
      if (style === 'spanish') {
        box(m.u0 + 0.8, mt, m.v1 + 1.3, m.u0 + 1.4, mt + ROOF_H.spanish + 0.3, m.v1 + 0.7, RENDER_WHITE);
        box(m.u0 + 0.72, mt + ROOF_H.spanish + 0.3, m.v1 + 1.38, m.u0 + 1.48, mt + ROOF_H.spanish + 0.42, m.v1 + 0.62, TILE_DARK);
      }

      b.lod = 'all';
      // The front door and its surround, on the main block's front; a stone step before it
      const fu = e.hc;
      const dv = m.v0;
      if (style === 'georgian') {
        // (the portico: four columns, an entablature, a pediment, the steps)
        // (shallow: the fountain stands in front of it)
        const pv = dv + 0.7;
        for (const s of [-1.3, -0.45, 0.45, 1.3]) cyl(0.13, STOREY.ground + 0.4, fu + s, 0.2, pv - 0.2, TRIM, 10);
        box(fu - 1.55, STOREY.ground + 0.6, dv, fu + 1.55, STOREY.ground + 0.85, pv, TRIM);
        add(tris([[[fu - 1.6, STOREY.ground + 0.85, pv], [fu + 1.6, STOREY.ground + 0.85, pv], [fu, STOREY.ground + 1.45, pv]], [[fu - 1.6, STOREY.ground + 0.85, dv], [fu + 1.6, STOREY.ground + 0.85, dv], [fu, STOREY.ground + 1.45, dv]], [[fu - 1.6, STOREY.ground + 0.85, dv], [fu - 1.6, STOREY.ground + 0.85, pv], [fu, STOREY.ground + 1.45, pv]], [[fu - 1.6, STOREY.ground + 0.85, dv], [fu, STOREY.ground + 1.45, pv], [fu, STOREY.ground + 1.45, dv]], [[fu + 1.6, STOREY.ground + 0.85, dv], [fu + 1.6, STOREY.ground + 0.85, pv], [fu, STOREY.ground + 1.45, pv]], [[fu + 1.6, STOREY.ground + 0.85, dv], [fu, STOREY.ground + 1.45, pv], [fu, STOREY.ground + 1.45, dv]]], [fu, STOREY.ground + 1, (dv + pv) / 2]), SLATE);
        box(fu - 1.7, 0, dv, fu + 1.7, 0.2, pv, STONE);
        b.detail(() => box(fu - 1.45, 0, pv, fu + 1.45, 0.1, pv + 0.22, STONE_SHADE));
        pane(fu, dv, [0, 1], 0.95, 0.2, 1.6, DOOR.georgian);
        // (the fanlight over it, its glazing bars like a fan)
        const fan = new THREE.Shape();
        fan.moveTo(-0.5, 0);
        fan.absarc(0, 0, 0.5, 0, Math.PI, false);
        add(new THREE.ShapeGeometry(fan, 8).translate(fu, 1.85, dv + 0.012), WINDOW);
        b.detail(() => {
          if (!low) for (let k = 1; k < 4; k++) add(new THREE.BoxGeometry(0.025, 0.5, 0.015).translate(0, 0.25, 0).rotateZ(Math.PI / 2 - (k * Math.PI) / 4).translate(fu, 1.85, dv + 0.025), TRIM);
          box(fu - 0.6, 1.8, dv, fu + 0.6, 1.86, dv + 0.05, TRIM);
        });
      } else if (style === 'modern') {
        pane(fu, dv, [0, 1], 1.1, 0.1, 1.75, DOOR.modern);
        b.detail(() => {
          box(fu - 0.62, 0, dv, fu + 0.62, 1.9, dv + 0.03, IRON);
          box(fu + 0.4, 0.95, dv + 0.03, fu + 0.44, 1.35, dv + 0.08, BRASS);
          box(fu - 0.8, 0, dv + 0.02, fu + 0.8, 0.07, dv + 0.7, STONE);
        });
      } else {
        const arch = style === 'spanish' || style === 'villa';
        box(fu - 0.75, 0, dv, fu + 0.75, arch ? 1.95 : 1.85, dv + 0.08, style === 'tudor' ? TIMBER : STONE_SHADE);
        pane(fu, dv + 0.08, [0, 1], 1.0, 0.05, 1.7, DOOR[style], arch);
        b.detail(() => {
          box(fu - 0.75, 0, dv + 0.08, fu + 0.75, 0.08, dv + 0.45, STONE);
          box(fu + 0.3, 0.9, dv + 0.1, fu + 0.36, 1.0, dv + 0.14, BRASS);
        });
        if (style === 'tudor') {
          // (a little gabled porch)
          const g = gable(fu - 0.9, dv + 0.85, fu + 0.9, dv, 1.95, 0.8, 0.1);
          add(g.slopes, SLATE);
          add(g.ends, CREAM);
          for (const s of [-1, 1]) box(fu + s * 0.8 - 0.06, 0, dv + 0.8, fu + s * 0.8 + 0.06, 1.95, dv + 0.68, TIMBER);
        }
        if (style === 'villa')
          // (a balcony over the door: a stone slab on brackets, a balustrade)
          b.detail(() => {
            const y = STOREY.ground + 0.25;
            box(fu - 1.0, y - 0.1, dv, fu + 1.0, y, dv + 0.55, STONE);
            box(fu - 1.0, y + 0.72, dv + 0.45, fu + 1.0, y + 0.8, dv + 0.55, STONE);
            if (!low) for (let u = fu - 0.9; u <= fu + 0.91; u += 0.15) cyl(0.035, 0.72, u, y, dv + 0.5, STONE, 6, 0.05);
            for (const s of [-1, 1]) box(fu + s * 0.8 - 0.06, y - 0.4, dv, fu + s * 0.8 + 0.06, y - 0.1, dv + 0.4, STONE_SHADE);
          });
      }
      // A lamp either side of the door
      b.detail(() => {
        for (const s of [-1, 1]) {
          add(new THREE.SphereGeometry(0.08, 6, 4).translate(fu + s * 0.95, 1.6, dv + 0.12), LAMP);
          if (!low) box(fu + s * 0.95 - 0.05, 1.45, dv, fu + s * 0.95 + 0.05, 1.52, dv + 0.12, IRON);
        }
      });

      /* ---------- The hedges, the gate ---------- */
      for (const [u0, v0, u1, v1] of hedgesOf(e)) {
        box(u0, 0, v0, u1, HEDGE.h, v1, HEDGE_GREEN);
        // (its clipped top, a shade lighter, a little in from its sides)
        const [a, c, d, f] = [Math.min(u0, u1) + 0.04, Math.max(u0, u1) - 0.04, Math.min(v0, v1) + 0.04, Math.max(v0, v1) - 0.04];
        if (c > a && f > d) box(a, HEDGE.h - 0.01, d, c, HEDGE.h + 0.07, f, HEDGE_TOP);
      }
      for (const [u, v] of piersOf(e)) {
        box(u - GATE.pier, 0, v - GATE.pier, u + GATE.pier, GATE.h, v + GATE.pier, STONE);
        box(u - GATE.pier - 0.05, GATE.h, v - GATE.pier - 0.05, u + GATE.pier + 0.05, GATE.h + 0.1, v + GATE.pier + 0.05, STONE_SHADE);
        b.detail(() => box(u - GATE.pier - 0.04, 0, v - GATE.pier - 0.04, u + GATE.pier + 0.04, 0.22, v + GATE.pier + 0.04, STONE_SHADE));
        // (phones: the piers' globes near only)
        if (low) b.detail(() => add(new THREE.SphereGeometry(0.12, 8, 6).translate(u, GATE.h + 0.3, v), BULB));
        else add(new THREE.SphereGeometry(0.12, 8, 6).translate(u, GATE.h + 0.3, v), BULB);
        b.detail(() => cyl(0.05, 0.2, u, GATE.h + 0.1, v, IRON, 6));
      }
      b.detail(() => {
        // (the iron gates, swung open into the forecourt: rails, bars and spear tops)
        for (const s of [-1, 1]) {
          const u = e.hc + s * (GATE.half - 0.08);
          const v = -HEDGE.front - HEDGE.thick;
          for (const y of [0.15, 1.25]) box(u - 0.025, y, v, u + 0.025, y + 0.05, v - 1.2, IRON);
          box(u - 0.03, 0.1, v, u + 0.03, 1.45, v - 0.06, IRON);
          if (!low) for (let k = 1; k <= 8; k++) box(u - 0.015, 0.15, v - (k * 1.2) / 9 - 0.015, u + 0.015, 1.38 + (k % 2) * 0.06, v - (k * 1.2) / 9 + 0.015, IRON);
        }
      });

      /* ---------- The forecourt's fountain ---------- */
      const [cu, cv] = fountainOf(e);
      // (phones: the fountain near only, Phase 11; the forecourt's paving shows far)
      if (low) b.lod = 'near';
      cyl(FOUNTAIN.r, 0.4, cu, 0, cv, STONE, 16, FOUNTAIN.r, true);
      add(new THREE.RingGeometry(FOUNTAIN.r - 0.15, FOUNTAIN.r, 16).rotateX(-Math.PI / 2).translate(cu, 0.4, cv), STONE_SHADE);
      add(new THREE.CircleGeometry(FOUNTAIN.r - 0.14, 16).rotateX(-Math.PI / 2).translate(cu, 0.36, cv), WATER);
      cyl(0.09, 0.6, cu, 0.3, cv, STONE_SHADE, 8);
      cyl(0.32, 0.1, cu, 0.9, cv, STONE, 12, 0.2);
      b.lod = 'all';
      b.detail(() => add(new THREE.ConeGeometry(0.08, 0.35, 6, 1, true).translate(cu, 1.18, cv), SPRAY));

      /* ---------- The garden: the pool on its deck, loungers ---------- */
      const [pu0, pv0, pu1, pv1] = e.pool;
      b.detail(() => {
        for (const s of [-1, 1]) {
          const u = s < 0 ? pu0 - 0.75 : pu1 + 0.75;
          box(u - 0.25, 0.012, pv0 - 0.1, u + 0.25, 0.25, pv0 - 1.2, LOUNGER);
        }
      });
      box(pu0 - 0.15, 0.012, pv0 + 0.15, pu1 + 0.15, 0.06, pv0, STONE);
      box(pu0 - 0.15, 0.012, pv1, pu1 + 0.15, 0.06, pv1 - 0.15, STONE);
      box(pu0 - 0.15, 0.012, pv0, pu0, 0.06, pv1, STONE);
      box(pu1, 0.012, pv0, pu1 + 0.15, 0.06, pv1, STONE);
      b.build(into, { cast: true, receive: true });

      // The paving, in world numbers (the frame's boxes are axis-aligned): the drive, the forecourt, the pool's deck and water
      const p = new Batch();
      const pave = (r: [number, number, number, number], y: number, mat: THREE.Material) => flat(p, r[0], r[1], r[2], r[3], SLAB_Y + y, mat, 8);
      pave(rectToWorld(e, e.hc - GATE.half, 0, e.hc + GATE.half, e.court[0]), 0.008, PAVING);
      pave(rectToWorld(e, e.hc - COURT_HALF, e.court[0], e.hc + COURT_HALF, e.court[1]), 0.008, PAVING);
      const apron = motorCourt(e);
      if (apron) pave(rectToWorld(e, ...apron), 0.008, PAVING);
      pave(rectToWorld(e, pu0 - 1.2, pv0 + 0.7, pu1 + 1.2, pv1 - 0.7), 0.006, PAVING);
      pave(rectToWorld(e, pu0, pv0, pu1, pv1), 0.014, poolOf(low));
      if (!low) pave(rectToWorld(e, pu0 + 0.2, pv1 + 0.3, pu1 - 0.2, pv1 + 0.36), 0.016, DARK);
      p.build(into, { cast: false, receive: true });
    });
  }
  // The cars on the forecourts (the main thread's)
  if (scene) parkedCars(scene, SLAB_Y, ESTATE_CARS.map(([id, x, z, yaw, c]) => [id as CarId, x, z, yaw, c]));
}
