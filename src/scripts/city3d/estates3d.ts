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
import { Batch, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { parkedCars, type CarId } from './cars';
import { COURT_HALF, ESTATES, ESTATE_CARS, FOUNTAIN, GATE, HEDGE, ROOF_H, SLAB_Y, STOREY, fountainOf, hedgesOf, outOf, originOf, piersOf, rectToWorld, wallTop, type Estate, type EstateStyle, type Part } from './estates';
import { CURTAIN, PAVING, TIMBER as SLATS, WATER, SPRAY, BULB, flat } from './mallkit';

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
/** Windows: dark glass by day, warm light at night */
export const WINDOW = siteMat('estate-window', lit(toon('#3b4c60', { emissive: '#ffd59a' }), 0, 0.85));
/** A pool's water: lit from under at night, a soft glowing turquoise (Phase 8; under the bloom's threshold) */
export const POOL = siteMat('crest-pool', lit(toon('#56b6d6', { emissive: '#2fd2ff' }), 0, 0.6));

/** A house's walls, its trims and its roof, by style */
const WALL: Record<EstateStyle, THREE.Material> = { spanish: RENDER_WHITE, villa: OCHRE, tudor: CREAM, georgian: BRICK, modern: RENDER_WHITE };
const ROOF: Record<EstateStyle, THREE.Material> = { spanish: TILE, villa: TILE, tudor: SLATE, georgian: SLATE, modern: STONE_SHADE };

type V3 = [number, number, number];

/** Triangles, each turned to face away from `mid` (a convex roof's middle) */
export function tris(list: V3[][], mid: V3) {
  const pos: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (const [p, q, r] of list) {
    a.set(...p);
    b.set(...q);
    c.set(...r);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const out = new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3).sub(new THREE.Vector3(...mid));
    for (const v of n.dot(out) >= 0 ? [p, q, r] : [p, r, q]) pos.push(...v);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
/** A hipped roof over u0..u1, v0..v1 (v1 < v0) at y, `h` high, overhanging `o` (h with no ridge: a pyramid) */
export function hip(u0: number, v0: number, u1: number, v1: number, y: number, h: number, o: number) {
  const [x0, x1, z0, z1] = [u0 - o, u1 + o, v1 - o, v0 + o];
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  const [w, d] = [x1 - x0, z1 - z0];
  const ridge = Math.abs(w - d) / 2;
  const top = y + h;
  const [r0, r1]: V3[] = w >= d ? [[cx - ridge, top, cz], [cx + ridge, top, cz]] : [[cx, top, cz - ridge], [cx, top, cz + ridge]];
  const c: V3[] = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
  const mid: V3 = [cx, y + h * 0.2, cz];
  const list: V3[][] =
    w >= d
      ? [[c[0], c[1], r1], [c[0], r1, r0], [c[3], c[2], r1], [c[3], r1, r0], [c[0], c[3], r0], [c[1], c[2], r1]]
      : [[c[0], c[3], r1], [c[0], r1, r0], [c[1], c[2], r1], [c[1], r1, r0], [c[0], c[1], r0], [c[3], c[2], r1]];
  // (its soffit under the overhang)
  const soffit = new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2).translate(cx, y - 0.005, cz);
  return [tris(list, mid), soffit];
}
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
      const pane = (u: number, v: number, n: [number, number], w: number, y: number, h: number, m: THREE.Material = WINDOW, arch = false) => {
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
        add(g.rotateY(Math.atan2(n[0], n[1])).translate(u + n[0] * 0.012, 0, v + n[1] * 0.012), m);
      };
      const { style } = e;
      const wall = WALL[style];
      const roof = ROOF[style];
      const parts = [e.house.main, e.house.wing, e.house.tower].filter((p): p is Part => !!p);

      /* ---------- The house ---------- */
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
        // The windows: a row a storey on the front and back, a few on the ends
        const fv = modernUp ? p.v0 + 0.9 : style === 'tudor' && p.floors > 1 ? p.v0 + 0.12 : p.v0;
        const W = p.u1 - p.u0;
        const n = Math.max(1, Math.floor(W / 1.7));
        for (let f = 0; f < p.floors; f++) {
          const y = f === 0 ? 0.5 : STOREY.ground + (f - 1) * STOREY.upper + 0.4;
          const front = f === 0 ? p.v0 : fv;
          if (modernUp && f === 0) {
            // (glass across the modern's ground floor, set back under the cantilever)
            const g = new THREE.PlaneGeometry(W - 0.4, STOREY.ground - 0.3);
            const uv = g.attributes.uv;
            for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) * (W - 0.4)) / 3.2, (uv.getY(k) * (STOREY.ground - 0.3)) / 3.2);
            add(g.translate((p.u0 + p.u1) / 2, (STOREY.ground - 0.3) / 2 + 0.15, p.v0 + 0.012), CURTAIN);
            continue;
          }
          for (let i = 0; i < n; i++) {
            const u = p.u0 + ((i + 0.5) * W) / n;
            // (the front door's bay on the main block's ground floor)
            if (f === 0 && p === e.house.main && Math.abs(u - e.hc) < W / n / 2) continue;
            const arch = (style === 'spanish' || style === 'villa') && f === 0;
            const [w, h] = style === 'modern' ? [1.3, 1.3] : [0.75, arch ? 1.2 : 1.05];
            pane(u, front, [0, 1], w, y, h, WINDOW, arch);
            pane(u, p.v1, [0, -1], w, y, h, WINDOW, arch);
            b.detail(() => {
              if (style === 'villa' && !low) for (const s of [-1, 1]) box(u + s * (w / 2 + 0.05), y, front, u + s * (w / 2 + 0.3), y + h, front + 0.06, SHUTTERS[e.id.length % 2]);
              if (style === 'georgian' || style === 'tudor') box(u - w / 2 - 0.06, y - 0.08, front, u + w / 2 + 0.06, y, front + 0.07, TRIM);
              if (style === 'spanish' && f === 1 && i === Math.floor(n / 2) && p === e.house.main) {
                // (an iron balcony)
                box(u - 0.8, y - 0.12, front, u + 0.8, y - 0.04, front + 0.5, IRON);
                box(u - 0.8, y - 0.04, front + 0.46, u + 0.8, y + 0.55, front + 0.5, IRON);
              }
            });
          }
          // (the ends)
          for (const s of [-1, 1]) {
            const u = s < 0 ? p.u0 : p.u1;
            pane(u, (p.v0 + p.v1) / 2, [s, 0], 0.75, y, style === 'modern' ? 1.3 : 1.05);
          }
        }
        // The roof
        if (style === 'modern') {
          const [a, c] = modernUp ? [p.u0 - 0.3, p.u1 + 0.3] : [p.u0, p.u1];
          const v0 = modernUp ? p.v0 + 0.9 : p.v0;
          box(a - 0.1, top, v0 + 0.1, c + 0.1, top + ROOF_H.modern, p.v1 - 0.1, TRIM);
          add(new THREE.PlaneGeometry(c - a - 0.2, v0 - p.v1 - 0.2).rotateX(-Math.PI / 2).translate((a + c) / 2, top + ROOF_H.modern + 0.006, (v0 + p.v1) / 2), STONE_SHADE);
        } else if (style === 'tudor') {
          const g = gable(p.u0 - 0.12, p.v0 + 0.12, p.u1 + 0.12, p.v1 - 0.12, top, ROOF_H.tudor, 0.3);
          add(g.slopes, SLATE);
          add(g.ends, CREAM);
        } else {
          const h = p === e.house.tower ? ROOF_H.villa + 0.3 : ROOF_H[style];
          const [r, soffit] = hip(p.u0, p.v0, p.u1, p.v1, top, h, style === 'georgian' ? 0.2 : 0.4);
          add(r, roof);
          add(soffit, style === 'georgian' ? TRIM : WOOD);
        }
        // Trims: a cornice, quoins, timbers
        b.detail(() => {
          if (style === 'georgian') {
            box(p.u0 - 0.08, top - 0.18, p.v0 + 0.08, p.u1 + 0.08, top, p.v1 - 0.08, TRIM);
            for (const u of [p.u0, p.u1]) for (const v of [p.v0, p.v1]) box(u - 0.12, 0, v - 0.12, u + 0.12, top - 0.18, v + 0.12, TRIM);
          }
          if (style === 'tudor' && p.floors > 1 && !low) {
            const f = p.v0 + 0.12;
            const y0 = STOREY.ground;
            box(p.u0 - 0.12, y0, f, p.u1 + 0.12, y0 + 0.12, f + 0.05, TIMBER);
            box(p.u0 - 0.12, top - 0.12, f, p.u1 + 0.12, top, f + 0.05, TIMBER);
            for (let u = p.u0; u <= p.u1 + 0.01; u += (p.u1 - p.u0) / Math.max(2, Math.round((p.u1 - p.u0) / 0.9))) box(u - 0.05, y0, f, u + 0.05, top, f + 0.05, TIMBER);
          }
          if (style === 'spanish' || style === 'villa') box(p.u0, 0, p.v0, p.u1, 0.25, p.v0 + 0.04, STONE_SHADE);
          if (style === 'modern' && p === e.house.main) {
            const g = new THREE.PlaneGeometry(1.8, STOREY.upper - 0.2);
            add(g.translate(p.u1 - 0.9 + 0.3, STOREY.ground + STOREY.upper / 2, p.v0 + 0.9 + 0.012), SLATS);
          }
        });
      }

      // The chimneys
      const m = e.house.main;
      const mt = wallTop(m);
      if (style === 'tudor') box(m.u1 - 1.2, mt - 0.5, m.v1 + 1.4, m.u1 - 0.6, mt + ROOF_H.tudor + 0.6, m.v1 + 0.8, BRICK_DARK);
      if (style === 'georgian') for (const u of [m.u0 + 0.5, m.u1 - 1.1]) box(u, mt, (m.v0 + m.v1) / 2 + 0.3, u + 0.6, mt + ROOF_H.georgian + 0.6, (m.v0 + m.v1) / 2 - 0.3, BRICK_DARK);
      if (style === 'spanish') {
        box(m.u0 + 0.8, mt, m.v1 + 1.3, m.u0 + 1.4, mt + ROOF_H.spanish + 0.3, m.v1 + 0.7, RENDER_WHITE);
        box(m.u0 + 0.72, mt + ROOF_H.spanish + 0.3, m.v1 + 1.38, m.u0 + 1.48, mt + ROOF_H.spanish + 0.42, m.v1 + 0.62, TILE_DARK);
      }

      // The front door and its surround, on the main block's front
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
        pane(fu, dv, [0, 1], 0.95, 0.2, 1.6, WOOD);
      } else if (style === 'modern') {
        pane(fu, dv, [0, 1], 1.1, 0.1, 1.75, WOOD);
      } else {
        const arch = style === 'spanish' || style === 'villa';
        box(fu - 0.75, 0, dv, fu + 0.75, arch ? 1.95 : 1.85, dv + 0.08, style === 'tudor' ? TIMBER : STONE_SHADE);
        pane(fu, dv + 0.08, [0, 1], 1.0, 0.05, 1.7, WOOD, arch);
        if (style === 'tudor') {
          // (a little gabled porch)
          const g = gable(fu - 0.9, dv + 0.85, fu + 0.9, dv, 1.95, 0.8, 0.1);
          add(g.slopes, SLATE);
          add(g.ends, CREAM);
          for (const s of [-1, 1]) box(fu + s * 0.8 - 0.06, 0, dv + 0.8, fu + s * 0.8 + 0.06, 1.95, dv + 0.68, TIMBER);
        }
      }
      // A lamp either side of the door
      b.detail(() => {
        for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.08, 6, 4).translate(fu + s * 0.95, 1.6, dv + 0.12), LAMP);
      });

      /* ---------- The hedges, the gate ---------- */
      for (const [u0, v0, u1, v1] of hedgesOf(e)) box(u0, 0, v0, u1, HEDGE.h, v1, HEDGE_GREEN);
      for (const [u, v] of piersOf(e)) {
        box(u - GATE.pier, 0, v - GATE.pier, u + GATE.pier, GATE.h, v + GATE.pier, STONE);
        box(u - GATE.pier - 0.05, GATE.h, v - GATE.pier - 0.05, u + GATE.pier + 0.05, GATE.h + 0.1, v + GATE.pier + 0.05, STONE_SHADE);
        add(new THREE.SphereGeometry(0.12, 8, 6).translate(u, GATE.h + 0.3, v), BULB);
      }
      b.detail(() => {
        // (the iron gates, swung open into the forecourt)
        for (const s of [-1, 1]) {
          const u = e.hc + s * (GATE.half - 0.08);
          const v = -HEDGE.front - HEDGE.thick;
          box(u - 0.03, 0.1, v, u + 0.03, 1.35, v - 1.2, IRON);
        }
      });

      /* ---------- The forecourt's fountain ---------- */
      const [cu, cv] = fountainOf(e);
      cyl(FOUNTAIN.r, 0.4, cu, 0, cv, STONE, 16, FOUNTAIN.r, true);
      add(new THREE.RingGeometry(FOUNTAIN.r - 0.15, FOUNTAIN.r, 16).rotateX(-Math.PI / 2).translate(cu, 0.4, cv), STONE_SHADE);
      add(new THREE.CircleGeometry(FOUNTAIN.r - 0.14, 16).rotateX(-Math.PI / 2).translate(cu, 0.36, cv), WATER);
      cyl(0.09, 0.6, cu, 0.3, cv, STONE_SHADE, 8);
      cyl(0.32, 0.1, cu, 0.9, cv, STONE, 12, 0.2);
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
      pave(rectToWorld(e, pu0 - 1.2, pv0 + 0.7, pu1 + 1.2, pv1 - 0.7), 0.006, PAVING);
      pave(rectToWorld(e, pu0, pv0, pu1, pv1), 0.014, POOL);
      if (!low) pave(rectToWorld(e, pu0 + 0.2, pv1 + 0.3, pu1 - 0.2, pv1 + 0.36), 0.016, DARK);
      p.build(into, { cast: false, receive: true });
    });
  }
  // The cars on the forecourts (the main thread's)
  if (scene) parkedCars(scene, SLAB_Y, ESTATE_CARS.map(([id, x, z, yaw, c]) => [id as CarId, x, z, yaw, c]));
}
