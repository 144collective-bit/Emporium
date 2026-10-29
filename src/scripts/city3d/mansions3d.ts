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
const HEDGE = toon('#2f6a3a');
const LOUNGER = toon('#f1ede2');
const LAMP = neon('#ffe2a8', 0.2, 1.3);

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
      const pane = (u: number, v: number, n: [number, number], w: number, y: number, h: number, mat: THREE.Material = WINDOW, arch = false, rep = 0) => {
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
        add(g.rotateY(Math.atan2(n[0], n[1])).translate(u + n[0] * 0.012, 0, v + n[1] * 0.012), mat);
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
          b.detail(() => box(m.du + s * (WALL.gate - 0.05) - 0.03, 0.1, -1, m.du + s * (WALL.gate - 0.05) + 0.03, 1.7, -2.4, STEEL));
        }

      /* ---------- The house ---------- */
      const wall = kind === 'villa' ? OCHRE : kind === 'summit' ? STONE : WHITE;
      const roof = kind === 'summit' ? SLATE : TILE;
      for (const p of m.parts) {
        const top = STOREY.ground + (p.floors - 1) * STOREY.upper;
        const w = p.u1 - p.u0;
        if (kind === 'glass' && p === m.parts[0]) {
          drawGlass(p, top);
          continue;
        }
        box(p.u0, 0, p.v0, p.u1, top, p.v1, wall);
        const n = Math.max(1, Math.floor(w / 1.8));
        for (let f = 0; f < p.floors; f++) {
          const y = f === 0 ? 0.5 : STOREY.ground + (f - 1) * STOREY.upper + 0.4;
          for (let i = 0; i < n; i++) {
            const u = p.u0 + ((i + 0.5) * w) / n;
            if (f === 0 && p === m.parts[0] && Math.abs(u - (p.u0 + p.u1) / 2) < w / n / 2) continue;
            const arch = kind !== 'summit' && f === 0;
            pane(u, p.v0, [0, 1], 0.85, y, arch ? 1.3 : 1.1, WINDOW, arch);
            pane(u, p.v1, [0, -1], 0.85, y, arch ? 1.3 : 1.1, WINDOW, arch);
          }
          for (const s of [-1, 1]) pane(s < 0 ? p.u0 : p.u1, (p.v0 + p.v1) / 2, [s, 0], 0.85, y, 1.1);
        }
        if (p.flat) {
          // (the summit's tower: a flat roof and a glass lantern)
          box(p.u0 - 0.1, top, p.v0 + 0.1, p.u1 + 0.1, top + 0.35, p.v1 - 0.1, STONE_SHADE);
          box(p.u0 + 0.5, top + 0.35, p.v0 - 0.5, p.u1 - 0.5, top + 1.3, p.v1 + 0.5, GLASS_RAIL);
          box(p.u0 + 0.4, top + 1.3, p.v0 - 0.4, p.u1 - 0.4, top + 1.42, p.v1 + 0.4, STONE_SHADE);
        } else {
          const [r, soffit] = hip(p.u0, p.v0, p.u1, p.v1, top, 1.3, 0.4);
          add(r, roof);
          add(soffit, WOOD);
        }
      }
      // The front door, on the main block's front
      const main = m.parts[0];
      const fu = (main.u0 + main.u1) / 2;
      if (kind !== 'glass') {
        box(fu - 0.85, 0, main.v0, fu + 0.85, 2.05, main.v0 + 0.08, STONE_SHADE);
        pane(fu, main.v0 + 0.08, [0, 1], 1.2, 0.05, 1.85, WOOD, kind !== 'summit');
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
        b.detail(() => {
          for (const u of [-W / 2 + 2, 0, W / 2 - 2]) {
            box(u - 0.25, top, v1 + 0.45, u + 0.25, top + 0.4, v1 + 0.95, TERRACOTTA);
            add(new THREE.IcosahedronGeometry(0.32, 1).translate(u, top + 0.7, v1 + 0.7), HEDGE);
          }
        });
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
