/*
 * The hills' mansions drawn (docs/crestmont-plan.md Phase 6; the numbers are mansions.ts's), in Crestmont's chunk
 * (crestmont3d.ts `register()`), a site a mansion: the drive up from the road following the ground, the pad's edges (a
 * stone retaining wall where the hills rise past it, a glass balustrade where they fall away), the forecourt, the
 * house by kind in its own frame (estates3d.ts's way: u along its front, v out to the road, y up from the pad), the
 * pool, and on the main thread its car.
 *
 * - **Glass:** a white box on a glass ground floor, the upper floor cantilevered out past the pad over the slope on
 *   two black steel legs, glass bands front and back, an infinity pool along the pad's back edge.
 * - **Villa:** warm render under red tile hips, arched windows below, a wing, tiled terraces stepping down behind.
 * - **Compound:** white render and tile behind a stone wall with its gate, the house and a guest house.
 * - **Summit:** pale stone and slate, the biggest pad, a walled court, a flat-roofed tower with a glass lantern.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { parkedCars, type CarId } from './cars';
import { heightAt } from './terrain';
import { MANSIONS, MANSION_CARS, STOREY, WALL, outOf, originOf, rectToWorld, toWorld, wallsOf, type MPart, type Mansion } from './mansions';
import { WINDOW, hip, poolOf } from './estates3d';
import { CURTAIN, PAVING, BULB, flat } from './mallkit';

const WHITE = toon('#f4f1ea');
const OCHRE = toon('#e6c493');
const STONE = toon('#d9cfbb');
const STONE_SHADE = toon('#c4b99f');
const SLATE = toon('#4d5566');
const TILE = toon('#c0603f');
const TERRACOTTA = toon('#c97b56');
const STEEL = toon('#1e1d22');
const WOOD = toon('#5a3a26');
const GLASS_RAIL = toon('#a9dcef');
const LOUNGER = toon('#f1ede2');
const LAMP = neon('#ffe2a8', 0.2, 1.3);
const GUTTER = toon('#2d2c33');
const SHUTTER = toon('#4f7a5a');
const FRONT_DOOR = toon('#1d2a4a');
const GOLD = toon('#c9a54a');
const LED = neon('#fff0d0', 0.15, 1.4);

/** The frame: local +x along its front, +y up from the pad, +z out to the road (a turn, never a mirror) */
function frameOf(m: Mansion) {
  const [ox, oz] = outOf(m.face);
  const [cx, cz] = originOf(m);
  return new THREE.Matrix4().set(oz, 0, ox, cx, 0, 1, 0, m.y, -ox, 0, oz, cz, 0, 0, 0, 1);
}

export function registerMansions(low: boolean, scene: THREE.Scene | null) {
  for (const m of MANSIONS) {
    const [x0, z0, x1, z1] = m.rect;
    const [d0, d1] = m.drive;
    // (the site reaches over the drive, the cantilever and the terraces too)
    const R = 6;
    const rect: [number, number, number, number] = [Math.min(x0, d0[0]) - R, Math.min(z0, d0[1]) - R, Math.max(x1, d0[0]) + R, Math.max(z1, d0[1]) + R];
    site(`crestmont ${m.id}`, rect, (into) => {
      const b = new Batch();
      const M = frameOf(m);
      const add = (g: THREE.BufferGeometry, mat: THREE.Material) => b.add(g.applyMatrix4(M), mat);
      const box = (u0: number, y0: number, v0: number, u1: number, y1: number, v1: number, mat: THREE.Material) =>
        add(new THREE.BoxGeometry(Math.abs(u1 - u0), y1 - y0, Math.abs(v1 - v0)).translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2), mat);
      const pane = (u: number, v: number, n: [number, number], w: number, y: number, h: number, mat: THREE.Material = WINDOW, arch = false, rep = 0, off = 0.012) => {
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
        } else {
          g = new THREE.PlaneGeometry(w, h);
          if (rep) {
            const uv = g.attributes.uv;
            for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) * w) / rep, (uv.getY(k) * h) / rep);
          }
          g.translate(0, y + h / 2, 0);
        }
        add(g.rotateY(Math.atan2(n[0], n[1])).translate(u + n[0] * off, 0, v + n[1] * off), mat);
      };
      /** The ground's height in the frame, over the pad */
      const ground = (u: number, v: number) => heightAt(...toWorld(m, u, v)) - m.y;
      const { kind, W, D } = m;

      /* ---------- The pad's edges ---------- */
      const edge = (u0: number, v0: number, u1: number, v1: number, n: [number, number]) => {
        const L = Math.hypot(u1 - u0, v1 - v0);
        const k = Math.max(1, Math.round(L / 2));
        for (let i = 0; i < k; i++) {
          const [a, c] = [i / k, (i + 1) / k];
          const [ua, va, uc, vc] = [u0 + (u1 - u0) * a, v0 + (v1 - v0) * a, u0 + (u1 - u0) * c, v0 + (v1 - v0) * c];
          const [um, vm] = [(ua + uc) / 2, (va + vc) / 2];
          // (in the drive's mouth on the front: open)
          if (n[1] > 0.5 && Math.abs(um - m.du) < 2) continue;
          const out = ground(um + n[0] * 2, vm + n[1] * 2);
          const [lu0, lv0, lu1, lv1] = [Math.min(ua, uc) - (n[0] ? 0.15 : 0), Math.min(va, vc) - (n[1] ? 0.15 : 0), Math.max(ua, uc) + (n[0] ? 0.15 : 0), Math.max(va, vc) + (n[1] ? 0.15 : 0)];
          if (out > 0.35) box(lu0, -0.3, lv0, lu1, Math.min(2.4, out + 0.2), lv1, STONE_SHADE);
          else if (out < -0.6 && !m.walled) {
            box(lu0, -0.05, lv0, lu1, 0.15, lv1, STONE);
            b.detail(() => box(lu0 + (n[0] ? 0.1 : 0), 0.15, lv0 + (n[1] ? 0.1 : 0), lu1 - (n[0] ? 0.1 : 0), 1.05, lv1 - (n[1] ? 0.1 : 0), GLASS_RAIL));
          }
        }
      };
      edge(-W / 2, 0, W / 2, 0, [0, 1]);
      edge(-W / 2, -D, W / 2, -D, [0, -1]);
      edge(-W / 2, 0, -W / 2, -D, [-1, 0]);
      edge(W / 2, 0, W / 2, -D, [1, 0]);

      /* ---------- The walls round a compound, its gate ---------- */
      for (const [u0, v0, u1, v1] of wallsOf(m)) {
        box(u0, -0.2, v0, u1, WALL.h, v1, kind === 'summit' ? STONE : WHITE);
        box(Math.min(u0, u1) - 0.05, WALL.h, Math.min(v0, v1) - 0.05, Math.max(u0, u1) + 0.05, WALL.h + 0.12, Math.max(v0, v1) + 0.05, kind === 'summit' ? STONE_SHADE : TILE);
      }
      if (m.walled)
        for (const s of [-1, 1]) {
          const u = m.du + s * (WALL.gate + 0.3);
          box(u - 0.3, -0.2, -0.3, u + 0.3, 2.2, -0.9, STONE);
          add(new THREE.SphereGeometry(0.13, 8, 6).translate(u, 2.45, -0.6), BULB);
          // (its gates, swung open: rails, bars and spear tops)
          b.detail(() => {
            const gu = m.du + s * (WALL.gate - 0.05);
            for (const y of [0.15, 1.5]) box(gu - 0.025, y, -1, gu + 0.025, y + 0.05, -2.4, STEEL);
            if (!low) for (let k = 0; k <= 9; k++) box(gu - 0.015, 0.15, -1 - (k * 1.4) / 9 - 0.015, gu + 0.015, 1.62 + (k % 2) * 0.08, -1 - (k * 1.4) / 9 + 0.015, STEEL);
          });
        }

      /* ---------- The house ---------- */
      const wall = kind === 'villa' ? OCHRE : kind === 'summit' ? STONE : WHITE;
      const roof = kind === 'summit' ? SLATE : TILE;
      /** A window and, near, its surround or sill, its glazing bars, a summit's shutters */
      const win = (u: number, v: number, n: [number, number], w: number, y: number, h: number, arch: boolean, front: boolean) => {
        pane(u, v, n, w, y, h, WINDOW, arch, 0, 0.035);
        b.detail(() => {
          const along: [number, number] = [n[1], -n[0]];
          const on = (a0: number, a1: number, o0: number, o1: number, y0: number, y1: number, mat: THREE.Material) => {
            const [p0, p1] = [
              [u + along[0] * a0 + n[0] * o0, v + along[1] * a0 + n[1] * o0],
              [u + along[0] * a1 + n[0] * o1, v + along[1] * a1 + n[1] * o1],
            ];
            box(Math.min(p0[0], p1[0]), y0, Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), y1, Math.max(p0[1], p1[1]), mat);
          };
          if (!arch) on(-w / 2 - 0.07, w / 2 + 0.07, 0, 0.03, y - 0.07, y + h + 0.07, kind === 'summit' ? STONE_SHADE : WOOD);
          else on(-0.06, 0.06, 0, 0.045, y + h - 0.02, y + h + 0.14, STONE_SHADE);
          on(-w / 2 - 0.1, w / 2 + 0.1, 0, 0.1, y - 0.12, y - 0.04, STONE_SHADE);
          if (low) return;
          const top = arch ? h - w / 2 : h;
          const [nu, nv] = kind === 'summit' ? [2, 2] : [1, 1];
          for (let k = 1; k <= nu; k++) on(-w / 2 + (k * w) / (nu + 1) - 0.015, -w / 2 + (k * w) / (nu + 1) + 0.015, 0.035, 0.05, y, y + top, kind === 'summit' ? WHITE : WOOD);
          for (let k = 1; k <= nv; k++) on(-w / 2, w / 2, 0.035, 0.05, y + (k * top) / (nv + 1) - 0.015, y + (k * top) / (nv + 1) + 0.015, kind === 'summit' ? WHITE : WOOD);
          if (front && (kind === 'summit' || kind === 'villa')) for (const s of [-1, 1]) on(s * (w / 2 + 0.06), s * (w / 2 + 0.38), 0, 0.06, y, y + h, kind === 'summit' ? STEEL : SHUTTER);
        });
      };
      for (const p of m.parts) {
        const top = STOREY.ground + (p.floors - 1) * STOREY.upper;
        const w = p.u1 - p.u0;
        if (kind === 'glass' && p === m.parts[0]) {
          drawGlass(p, top);
          continue;
        }
        box(p.u0, 0, p.v0, p.u1, top, p.v1, wall);
        box(p.u0 - 0.04, 0, p.v0 + 0.04, p.u1 + 0.04, 0.3, p.v1 - 0.04, STONE_SHADE);
        const n = Math.max(1, Math.floor(w / 1.8));
        const isMain = p === m.parts[0];
        for (let f = 0; f < p.floors; f++) {
          const y = f === 0 ? 0.5 : STOREY.ground + (f - 1) * STOREY.upper + 0.4;
          for (let i = 0; i < n; i++) {
            const u = p.u0 + ((i + 0.5) * w) / n;
            if (f === 0 && isMain && Math.abs(u - (p.u0 + p.u1) / 2) < w / n / 2) continue;
            const arch = kind !== 'summit' && f === 0;
            win(u, p.v0, [0, 1], 0.85, y, arch ? 1.3 : 1.1, arch, true);
            win(u, p.v1, [0, -1], 0.85, y, arch ? 1.3 : 1.1, arch, false);
          }
          for (const s of [-1, 1]) win(s < 0 ? p.u0 : p.u1, (p.v0 + p.v1) / 2, [s, 0], 0.85, y, 1.1, false, false);
        }
        // (the garden doors on the main block's back)
        if (isMain) {
          const cu = (p.u0 + p.u1) / 2;
          pane(cu, p.v1, [0, -1], 1.5, 0.06, 1.85, WINDOW, false, 0, 0.035);
          b.detail(() => {
            box(cu - 0.83, 0, p.v1 - 0.03, cu + 0.83, 1.98, p.v1, kind === 'summit' ? WHITE : WOOD);
            box(cu - 0.025, 0.06, p.v1 - 0.05, cu + 0.025, 1.91, p.v1 - 0.035, kind === 'summit' ? WHITE : WOOD);
          });
        }
        if (p.flat) {
          // (the summit's tower: a flat roof and a glass lantern)
          box(p.u0 - 0.1, top, p.v0 + 0.1, p.u1 + 0.1, top + 0.35, p.v1 - 0.1, STONE_SHADE);
          box(p.u0 + 0.5, top + 0.35, p.v0 - 0.5, p.u1 - 0.5, top + 1.3, p.v1 + 0.5, GLASS_RAIL);
          box(p.u0 + 0.4, top + 1.3, p.v0 - 0.4, p.u1 - 0.4, top + 1.42, p.v1 + 0.4, STONE_SHADE);
          b.detail(() => {
            for (const [a, c] of [[p.u0 + 0.5, p.v0 - 0.5], [p.u1 - 0.5, p.v0 - 0.5], [p.u0 + 0.5, p.v1 + 0.5], [p.u1 - 0.5, p.v1 + 0.5]]) box(a - 0.05, top + 0.35, c - 0.05, a + 0.05, top + 1.3, c + 0.05, STEEL);
            add(new THREE.SphereGeometry(0.12, 8, 6).translate((p.u0 + p.u1) / 2, top + 0.85, (p.v0 + p.v1) / 2), LAMP);
          });
        } else {
          const [r, soffit] = hip(p.u0, p.v0, p.u1, p.v1, top, 1.3, 0.4);
          add(r, roof);
          add(soffit, WOOD);
          b.detail(() => {
            for (const v of [p.v0 + 0.38, p.v1 - 0.38]) box(p.u0 - 0.4, top - 0.08, v - 0.05, p.u1 + 0.4, top + 0.02, v + 0.05, GUTTER);
          });
          // (a chimney on the main block, rendered, or stone at the summit)
          if (isMain) {
            const cu = p.u0 + 1.1;
            box(cu - 0.32, top, p.v1 + 1.5, cu + 0.32, top + 1.75, p.v1 + 0.86, kind === 'summit' ? STONE_SHADE : wall);
            box(cu - 0.38, top + 1.75, p.v1 + 1.56, cu + 0.38, top + 1.87, p.v1 + 0.8, kind === 'summit' ? SLATE : TILE);
          }
        }
      }
      // The front door, on the main block's front; a step before it; a villa's balcony over it
      const main = m.parts[0];
      const fu = (main.u0 + main.u1) / 2;
      if (kind !== 'glass') {
        box(fu - 0.85, 0, main.v0, fu + 0.85, 2.05, main.v0 + 0.08, STONE_SHADE);
        pane(fu, main.v0 + 0.08, [0, 1], 1.2, 0.05, 1.85, kind === 'summit' ? FRONT_DOOR : WOOD, kind !== 'summit');
        b.detail(() => {
          box(fu - 0.95, 0, main.v0 + 0.08, fu + 0.95, 0.1, main.v0 + 0.55, STONE);
          box(fu + 0.36, 0.95, main.v0 + 0.1, fu + 0.42, 1.06, main.v0 + 0.15, GOLD);
          if (kind === 'villa' || kind === 'compound') {
            const y = STOREY.ground + 0.25;
            box(fu - 1.1, y - 0.1, main.v0, fu + 1.1, y, main.v0 + 0.6, STONE);
            box(fu - 1.1, y + 0.72, main.v0 + 0.5, fu + 1.1, y + 0.8, main.v0 + 0.6, STONE);
            if (!low) for (let u = fu - 1.0; u <= fu + 1.01; u += 0.16) box(u - 0.035, y, main.v0 + 0.52, u + 0.035, y + 0.72, main.v0 + 0.58, STONE);
          }
        });
      }
      b.detail(() => {
        for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.08, 6, 4).translate(fu + s * 1.05, 1.7, main.v0 + (kind === 'glass' ? 0.2 : 0.14)), LAMP);
      });

      /* ---------- A villa's terraces stepping down behind ---------- */
      m.terraces.forEach(([v0, v1], i) => {
        const top = -0.9 * (i + 1);
        const lo = Math.min(ground(-W / 2 + 1, v1), ground(W / 2 - 1, v1), ground(0, v1), top) - 0.6;
        box(-W / 2 + 1, lo, v0, W / 2 - 1, top, v1, STONE_SHADE);
        add(new THREE.PlaneGeometry(W - 2.2, Math.abs(v1 - v0) - 0.2).rotateX(-Math.PI / 2).translate(0, top + 0.006, (v0 + v1) / 2), TERRACOTTA);
        // (planted as a vineyard: crestgardens3d.ts)
      });

      /* ---------- The pool ---------- */
      const [pu0, pv0, pu1, pv1] = m.pool;
      box(pu0 - 0.15, 0.012, pv0 + 0.15, pu1 + 0.15, 0.08, pv0, STONE);
      box(pu0 - 0.15, 0.012, pv1, pu1 + 0.15, 0.08, pv1 - 0.15, STONE);
      box(pu0 - 0.15, 0.012, pv0, pu0, 0.08, pv1, STONE);
      box(pu1, 0.012, pv0, pu1 + 0.15, 0.08, pv1, STONE);
      b.detail(() => {
        for (const u of [pu0 + 0.6, pu0 + 1.6]) box(u - 0.25, 0.012, pv0 + 0.6, u + 0.25, 0.25, pv0 + 1.7, LOUNGER);
      });
      b.build(into, { cast: true, receive: true });

      /** The glass mansion's main block: glass below, the white upper floor out over the slope on two legs */
      function drawGlass(p: MPart, top: number) {
        const g0 = STOREY.ground;
        const back = Math.min(p.v1, -D) - m.reach;
        // (the ground floor: a white core and glass all round, set in)
        box(p.u0 + 0.3, 0, p.v0 - 0.3, p.u1 - 0.3, g0, p.v1 + 0.3, WHITE);
        for (const [n, u, v, w] of [
          [[0, 1], (p.u0 + p.u1) / 2, p.v0 - 0.3, p.u1 - p.u0 - 0.6],
          [[0, -1], (p.u0 + p.u1) / 2, p.v1 + 0.3, p.u1 - p.u0 - 0.6],
        ] as [[number, number], number, number, number][])
          pane(u, v, n, w, 0.1, g0 - 0.2, CURTAIN, false, 3.2);
        // (the upper floor, a white box with a glass band front and back, reaching out past the pad)
        box(p.u0 - 0.4, g0, p.v0 + 0.6, p.u1 + 0.4, g0 + 0.25, back, WHITE);
        box(p.u0 - 0.4, top - 0.2, p.v0 + 0.6, p.u1 + 0.4, top + 0.35, back, WHITE);
        for (const s of [-1, 1]) box(s < 0 ? p.u0 - 0.4 : p.u1 + 0.2, g0 + 0.25, p.v0 + 0.6, s < 0 ? p.u0 - 0.2 : p.u1 + 0.4, top - 0.2, back, WHITE);
        pane((p.u0 + p.u1) / 2, p.v0 + 0.6, [0, 1], p.u1 - p.u0 + 0.4, g0 + 0.25, top - g0 - 0.45, CURTAIN, false, 3.2);
        pane((p.u0 + p.u1) / 2, back, [0, -1], p.u1 - p.u0 + 0.4, g0 + 0.25, top - g0 - 0.45, CURTAIN, false, 3.2);
        b.detail(() => {
          // (the glass bands' mullions; a strip of light under the cantilever's soffit)
          for (let u = p.u0 - 0.2; u <= p.u1 + 0.21; u += (p.u1 - p.u0 + 0.4) / Math.max(3, Math.round((p.u1 - p.u0) / 1.2)))
            for (const [v, n] of [
              [p.v0 + 0.6, 1],
              [back, -1],
            ] as [number, number][])
              box(u - 0.03, g0 + 0.25, v, u + 0.03, top - 0.2, v + n * 0.04, STEEL);
          box(p.u0 - 0.35, g0 - 0.02, p.v0 + 0.5, p.u1 + 0.35, g0 + 0.005, p.v0 + 0.56, LED);
        });
        // (the legs under its far end, down to the slope)
        for (const u of [p.u0 + 0.3, p.u1 - 0.3]) {
          const lo = ground(u, back + 0.4) - 0.3;
          box(u - 0.12, lo, back + 0.28, u + 0.12, g0, back + 0.52, STEEL);
        }
        // (the infinity pool's edge: a glass rail along the pad's back, beyond the pool)
        b.detail(() => box(m.pool[0] - 1, 0.1, -D + 0.3, m.pool[2] + 1, 1.0, -D + 0.36, GLASS_RAIL));
      }

      // The drive (following the ground), the forecourt, the pool's deck and water, in world numbers
      const q = new Batch();
      const [ox, oz] = outOf(m.face);
      const L = Math.hypot(d1[0] - d0[0], d1[1] - d0[1]);
      const k = Math.max(1, Math.ceil(L));
      const pos: number[] = [];
      const [px, pz] = [-oz * 1.2, ox * 1.2];
      const at = (t: number) => [d0[0] + (d1[0] - d0[0]) * t, d0[1] + (d1[1] - d0[1]) * t];
      for (let i = 0; i < k; i++) {
        const [a, c] = [at(i / k), at((i + 1) / k)];
        const y = (x: number, z: number) => heightAt(x, z) + 0.06;
        const quad = [
          [a[0] - px, a[1] - pz],
          [a[0] + px, a[1] + pz],
          [c[0] + px, c[1] + pz],
          [c[0] - px, c[1] - pz],
        ];
        for (const j of [0, 1, 2, 0, 2, 3]) pos.push(quad[j][0], y(quad[j][0], quad[j][1]), quad[j][1]);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      // (wound to face up)
      const idx = g.attributes.position;
      for (let t = 0; t < idx.count; t += 3) {
        const [ax, az, bx, bz, cx, cz] = [idx.getX(t), idx.getZ(t), idx.getX(t + 1), idx.getZ(t + 1), idx.getX(t + 2), idx.getZ(t + 2)];
        if ((bz - az) * (cx - ax) - (bx - ax) * (cz - az) < 0) {
          const [x, y, z] = [idx.getX(t + 1), idx.getY(t + 1), idx.getZ(t + 1)];
          idx.setXYZ(t + 1, idx.getX(t + 2), idx.getY(t + 2), idx.getZ(t + 2));
          idx.setXYZ(t + 2, x, y, z);
        }
      }
      g.computeVertexNormals();
      q.add(g, STONE);
      const pave = (r: [number, number, number, number], y: number, mat: THREE.Material) => flat(q, r[0], r[1], r[2], r[3], m.y + y, mat, 8);
      const [cu0, cv0, cu1, cv1] = m.court;
      pave(rectToWorld(m, Math.max(-W / 2 + 1, cu0), Math.min(-1, cv0), Math.min(W / 2 - 1, cu1), cv1), 0.02, PAVING);
      pave(rectToWorld(m, pu0 - 1, pv0 + 1.8, pu1 + 1, pv1 - (kind === 'glass' ? 0.4 : 0.8)), 0.014, PAVING);
      pave(rectToWorld(m, pu0, pv0, pu1, pv1), 0.024, poolOf(low));
      q.build(into, { cast: false, receive: true });
      void low;
    });
  }
  // The cars on the forecourts (the main thread's), each at its pad's height
  if (scene) for (const { y, car } of MANSION_CARS) parkedCars(scene, y, [[car[0] as CarId, car[1], car[2], car[3], car[4]]]);
}
