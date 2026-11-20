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
import { drawnAt } from './drawn';
import { SITE_GROUNDS, TERRACES, banks, driveLights, siteBanks, type Bank, type PlantKind, type Post } from './crestbanks';
import { GATES } from './crestcover';
import { DRAPE, bandMesh, lineMesh, type Mesh } from './crestdrape';

/** A gate's half width in the pad's edge */
const GATE_GAP = 0.9;
import { COVER, PLANT, SOIL } from './palette';
import { MANSARD, MANSIONS, MANSION_CARS, PAD_EASE, STOREY, TURRET, WALL, YARD, outOf, originOf, rectToWorld, toWorld, wallsOf, type MPart, type Mansion } from './mansions';
import { POOL_LED, WINDOW, hip, poolOf, windowOf } from './estates3d';
import { deckHip, mansard } from './roofs3d';
import { POOL_LIGHTS, poolLights } from './crestnight';
import { DECK_HIP, MANSION_BALCONIES, MANSION_CHIMNEY, MANSION_GATE, ROOF_DECKS, mansionPiers, windowsAlong } from './crestgrand';
import { drawBalcony, drawDeck, drawLeaf, drawPierTop, type Draw } from './crestgrand3d';
import { CURTAIN, PAVING, flat } from './mallkit';

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
/** An Art Deco house's speed lines, and a chateau's raked gravel court (the premium upgrade's Phase 3) */
const DECO_LINE = toon('#c9d3da');
const GRAVEL = toon('#d8cfbd');

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
    // (the site reaches over the drive, the cantilever, the terraces, the yard and its bank too)
    const R = YARD + PAD_EASE + 1;
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
      const ground = (u: number, v: number) => drawnAt(...toWorld(m, u, v)) - m.y;
      const { kind, W, D } = m;
      /** The premium upgrade's helpers (crestgrand3d.ts), in this frame */
      const G: Draw = { box, add, detail: (f) => b.detail(f), low };

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
          // (at a garden path's gate: open, crestcover.ts)
          if (gates.some((g) => Math.hypot(um - g.u, vm - g.v) < GATE_GAP)) continue;
          const out = ground(um + n[0] * 2, vm + n[1] * 2);
          const [lu0, lv0, lu1, lv1] = [Math.min(ua, uc) - (n[0] ? 0.15 : 0), Math.min(va, vc) - (n[1] ? 0.15 : 0), Math.max(ua, uc) + (n[0] ? 0.15 : 0), Math.max(va, vc) + (n[1] ? 0.15 : 0)];
          // (where the hills rise past it, the bank's terraces stand instead: crestbanks.ts, drawn below)
          if (out < -0.6 && !m.walled) {
            box(lu0, -0.05, lv0, lu1, 0.15, lv1, STONE);
            b.detail(() => box(lu0 + (n[0] ? 0.1 : 0), 0.15, lv0 + (n[1] ? 0.1 : 0), lu1 - (n[0] ? 0.1 : 0), 1.05, lv1 - (n[1] ? 0.1 : 0), GLASS_RAIL));
          }
        }
      };
      // The gates where a garden path leaves the pad: a stone pier either side
      const gates = GATES.filter((g) => g.m === m.id);
      for (const g of gates)
        for (const s of [-1, 1]) {
          const [pu, pv] = [g.u + g.out[1] * s * -GATE_GAP + g.out[0] * 0.15, g.v + g.out[0] * s * GATE_GAP + g.out[1] * 0.15];
          box(pu - 0.2, -0.3, pv - 0.2, pu + 0.2, 1.1, pv + 0.2, STONE);
          box(pu - 0.25, 1.1, pv - 0.25, pu + 0.25, 1.18, pv + 0.25, STONE_SHADE);
        }
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
          // (a lantern and a plain plaque on each pier; its gates swung open, wrought iron with gilded tips: the
          // premium upgrade's Phase 2, crestgrand.ts)
          drawPierTop(G, u, -0.6, 2.2, 0.3, false);
          b.detail(() => drawLeaf(G, m.du + s * (WALL.gate - 0.05), -1, 1.4, false));
        }
      // (a hill house without a wall: piers either side of its drive's mouth, its gates swung open inside)
      for (const [u, v] of mansionPiers(m)) {
        const h = MANSION_GATE.half;
        box(u - h, -0.3, v - h, u + h, MANSION_GATE.h, v + h, kind === 'glass' ? WHITE : STONE);
        drawPierTop(G, u, v, MANSION_GATE.h, h, kind === 'glass');
        b.detail(() => drawLeaf(G, m.du + Math.sign(u - m.du) * MANSION_GATE.leaf, v, 1.6, kind === 'glass'));
      }

      /* ---------- The house ---------- */
      const wall = kind === 'villa' ? OCHRE : kind === 'summit' ? STONE : WHITE;
      const roof = kind === 'summit' ? SLATE : TILE;
      /** A window and, near, its surround or sill, its glazing bars, a summit's shutters */
      const win = (u: number, v: number, n: [number, number], w: number, y: number, h: number, arch: boolean, front: boolean) => {
        pane(u, v, n, w, y, h, windowOf(m.id, u, y, v, low), arch, 0, 0.035);
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
        // (the premium upgrade's Phase 3: an Art Deco house, a French chateau)
        if (kind === 'deco') {
          drawDeco(p, top, p === m.parts[0]);
          continue;
        }
        if (kind === 'chateau') {
          drawChateau(p, top, p === m.parts[0]);
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
          // (the main block's hip cut flat for its roof terrace: the premium upgrade's Phase 2, crestgrand.ts)
          const [r, soffit] = isMain ? deckHip(p.u0, p.v0, p.u1, p.v1, top, DECK_HIP.h, DECK_HIP.o, DECK_HIP.f) : hip(p.u0, p.v0, p.u1, p.v1, top, DECK_HIP.h, DECK_HIP.o);
          add(r, roof);
          add(soffit, WOOD);
          if (isMain) drawDeck(G, ROOF_DECKS[MANSIONS.indexOf(m)], kind === 'summit' ? 'stone' : 'iron');
          b.detail(() => {
            for (const v of [p.v0 + 0.38, p.v1 - 0.38]) box(p.u0 - 0.4, top - 0.08, v - 0.05, p.u1 + 0.4, top + 0.02, v + 0.05, GUTTER);
          });
          // (a chimney on the main block, rendered, or stone at the summit)
          if (isMain) {
            const cu = p.u0 + MANSION_CHIMNEY.at;
            const ch = MANSION_CHIMNEY.half;
            box(cu - ch, top, p.v1 + 1.5, cu + ch, top + 1.75, p.v1 + 0.86, kind === 'summit' ? STONE_SHADE : wall);
            box(cu - ch - 0.06, top + 1.75, p.v1 + 1.56, cu + ch + 0.06, top + 1.87, p.v1 + 0.8, kind === 'summit' ? SLATE : TILE);
          }
        }
      }
      // The balconies at the back, over the view (the premium upgrade's Phase 2: crestgrand.ts)
      for (const bal of MANSION_BALCONIES[MANSIONS.indexOf(m)]) drawBalcony(G, bal);
      // The front door, on the main block's front; a step before it; a villa's balcony over it
      const main = m.parts[0];
      const fu = (main.u0 + main.u1) / 2;
      // (an Art Deco house's curved canopy over its door, on two slim steel posts)
      if (kind === 'deco') {
        box(fu - 1.3, 2.05, main.v0, fu + 1.3, 2.17, main.v0 + 1.0, WHITE);
        add(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(fu, 2.11, main.v0 + 1.0), WHITE);
        b.detail(() => {
          for (const s of [-1, 1]) box(fu + s * 1.15 - 0.03, 0, main.v0 + 0.85, fu + s * 1.15 + 0.03, 2.05, main.v0 + 0.91, STEEL);
          box(fu - 1.2, 2.0, main.v0 + 0.95, fu + 1.2, 2.04, main.v0 + 0.97, LED);
        });
      }
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
      // (each on the ground behind as it is, crestbanks.ts: topped over the highest ground under it, a coping round it)
      for (const t of TERRACES[MANSIONS.indexOf(m)]) {
        const [u0, v0, u1, v1] = t.r;
        box(u0, t.foot, v0, u1, t.top, v1, STONE_SHADE);
        box(u0 - 0.05, t.top, v1 + 0.15, u1 + 0.05, t.top + 0.08, v1 - 0.05, COPING);
        add(new THREE.PlaneGeometry(u1 - u0 - 0.2, Math.abs(v1 - v0) - 0.2).rotateX(-Math.PI / 2).translate(0, t.top + 0.006, (v0 + v1) / 2), TERRACOTTA);
        // (planted as a vineyard: crestgardens3d.ts)
      }

      /* ---------- The pool ---------- */
      const [pu0, pv0, pu1, pv1] = m.pool;
      box(pu0 - 0.15, 0.012, pv0 + 0.15, pu1 + 0.15, 0.08, pv0, STONE);
      box(pu0 - 0.15, 0.012, pv1, pu1 + 0.15, 0.08, pv1 - 0.15, STONE);
      box(pu0 - 0.15, 0.012, pv0, pu0, 0.08, pv1, STONE);
      box(pu1, 0.012, pv0, pu1 + 0.15, 0.08, pv1, STONE);
      b.detail(() => {
        for (const u of [pu0 + 0.6, pu0 + 1.6]) box(u - 0.25, 0.012, pv0 + 0.6, u + 0.25, 0.25, pv0 + 1.7, LOUNGER);
      });
      // (the lights under its water, small bright points at night: crestnight.ts; none in the phones' plain water)
      if (!low) for (const [u, v] of poolLights(pu0, pv0, pu1, pv1)) add(new THREE.CircleGeometry(POOL_LIGHTS.r, 8).rotateX(-Math.PI / 2).translate(u, 0.03, v), POOL_LED);
      b.build(into, { cast: true, receive: true });

      /**
       * An Art Deco house's part (the premium upgrade's Phase 3): white walls with rounded corners, ribbon windows
       * front and back, portholes along the ground floor's front, speed lines, a parapet; its tower stepped back at the
       * top with fins up its front and a fin on its crown; the main block's flat roof its sundeck
       */
      function drawDeco(p: MPart, top: number, isMain: boolean) {
        const R = Math.min(0.7, (p.u1 - p.u0) / 4);
        const [fv, bv] = [p.v0, p.v1];
        box(p.u0 + R, 0, fv, p.u1 - R, top, bv, WHITE);
        box(p.u0, 0, fv - R, p.u1, top, bv + R, WHITE);
        for (const [u, v] of [
          [p.u0 + R, fv - R],
          [p.u1 - R, fv - R],
          [p.u0 + R, bv + R],
          [p.u1 - R, bv + R],
        ])
          add(new THREE.CylinderGeometry(R, R, top, 14).translate(u, top / 2, v), WHITE);
        // (a dark shadow gap at its foot)
        box(p.u0 + R, 0, fv - 0.04, p.u1 - R, 0.18, bv + 0.04, GUTTER);
        const L = p.u1 - p.u0 - 2 * R;
        const cu = (p.u0 + p.u1) / 2;
        for (let f = 0; f < p.floors; f++) {
          const y = f === 0 ? 0.45 : STOREY.ground + (f - 1) * STOREY.upper + 0.4;
          const h = f === 0 ? 1.35 : 1.15;
          if (f === 0 && isMain) {
            // (portholes along the ground floor's front, clear of the door)
            for (const u of windowsAlong(p.u0 + R, p.u1 - R, 1.4)) {
              if (Math.abs(u - cu) < 1.4) continue;
              add(new THREE.CircleGeometry(0.34, 16).translate(u, y + 0.75, fv + 0.012), windowOf(m.id, u, y, fv, low));
              b.detail(() => add(new THREE.RingGeometry(0.34, 0.42, 16).translate(u, y + 0.75, fv + 0.014), STEEL));
            }
          } else if (L > 1.2) pane(cu, fv, [0, 1], L - 0.6, y, h, windowOf(m.id, cu, y, fv, low), false, 0, 0.012);
          if (L > 1.2 && !(f === 0 && isMain)) pane(cu, bv, [0, -1], L - 0.6, y, h, windowOf(m.id, cu, y, bv, low), false, 0, 0.012);
          // (the ribbon windows' mullions, near)
          if (L > 1.2)
            b.detail(() => {
              for (const v of f === 0 && isMain ? [bv] : [fv, bv])
                for (let u = cu - (L - 0.6) / 2; u <= cu + (L - 0.6) / 2 + 1e-6; u += (L - 0.6) / Math.max(2, Math.round((L - 0.6) / 1.1))) box(u - 0.025, y, v + (v === fv ? 0 : -0.03), u + 0.025, y + h, v + (v === fv ? 0.03 : 0), STEEL);
            });
        }
        // (speed lines: three thin bands along the front and back by its top)
        b.detail(() => {
          for (const y of [top - 0.45, top - 0.6, top - 0.75]) for (const [a, c] of [[fv, fv + 0.025], [bv - 0.025, bv]]) box(p.u0 + R, y, a, p.u1 - R, y + 0.05, c, DECO_LINE);
        });
        // The roof: a parapet round it with a coping
        const t = 0.07;
        for (const [a0, b0, a1, b1] of [
          [p.u0 + 0.05, fv - 0.05, p.u1 - 0.05, fv - 0.05 - t],
          [p.u0 + 0.05, bv + 0.05 + t, p.u1 - 0.05, bv + 0.05],
          [p.u0 + 0.05, fv - 0.05, p.u0 + 0.05 + t, bv + 0.05],
          [p.u1 - 0.05 - t, fv - 0.05, p.u1 - 0.05, bv + 0.05],
        ])
          box(a0, top, b0, a1, top + 0.35, b1, WHITE);
        add(new THREE.PlaneGeometry(p.u1 - p.u0 - 0.2, Math.abs(fv - bv) - 0.2).rotateX(-Math.PI / 2).translate(cu, top + 0.012, (fv + bv) / 2), STONE_SHADE);
        if (isMain) drawDeck(G, ROOF_DECKS[MANSIONS.indexOf(m)], 'glass');
        else {
          // (the tower: its crown stepped back, a fin standing on it; fins up its front)
          box(p.u0 + 0.45, top, fv - 0.45, p.u1 - 0.45, top + 0.6, bv + 0.45, WHITE);
          box(cu - 0.06, top + 0.6, fv - 0.6, cu + 0.06, top + 1.7, bv + 0.6, WHITE);
          for (const k of [-1, 0, 1]) box(cu + k * 0.7 - 0.05, 0.4, fv, cu + k * 0.7 + 0.05, top + 0.3, fv + 0.25, WHITE);
          b.detail(() => box(cu - 0.08, top + 1.55, fv - 0.62, cu + 0.08, top + 1.6, bv + 0.62, LED));
        }
      }

      /**
       * A French chateau's part (Phase 3): pale stone walls with quoins and a string course, tall windows, the main
       * block under a slate mansard with dormers front and back (its flat top a terrace); a turret round under its
       * slate cone with a gilded finial
       */
      function drawChateau(p: MPart, top: number, isMain: boolean) {
        if (p.roof === 'cone') {
          const [cu, cv] = [(p.u0 + p.u1) / 2, (p.v0 + p.v1) / 2];
          const r = (p.u1 - p.u0) / 2;
          add(new THREE.CylinderGeometry(r, r + 0.05, top, 16).translate(cu, top / 2, cv), STONE);
          add(new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.12, 16).translate(cu, top - 0.06, cv), STONE_SHADE);
          add(new THREE.ConeGeometry(r + 0.2, TURRET.cone, 16).translate(cu, top + TURRET.cone / 2, cv), SLATE);
          add(new THREE.SphereGeometry(0.07, 6, 4).translate(cu, top + TURRET.cone + 0.05, cv), GOLD);
          b.detail(() => add(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5).translate(cu, top + TURRET.cone + 0.1, cv), GOLD));
          // (its windows on the side away from the house, a storey each)
          const mp = m.parts[0];
          const [mu, mv] = [(mp.u0 + mp.u1) / 2, (mp.v0 + mp.v1) / 2];
          const l = Math.hypot(cu - mu, cv - mv) || 1;
          const n: [number, number] = [(cu - mu) / l, (cv - mv) / l];
          for (let f = 0; f < p.floors; f++) {
            const y = f === 0 ? 0.55 : STOREY.ground + (f - 1) * STOREY.upper + 0.45;
            pane(cu + n[0] * r, cv + n[1] * r, n, 0.5, y, 0.95, windowOf(m.id, cu, y, cv, low), true, 0, 0.02);
          }
          return;
        }
        box(p.u0, 0, p.v0, p.u1, top, p.v1, STONE);
        box(p.u0 - 0.04, 0, p.v0 + 0.04, p.u1 + 0.04, 0.35, p.v1 - 0.04, STONE_SHADE);
        // (the string course between the floors, and the quoins at its back corners, near)
        box(p.u0 - 0.04, STOREY.ground - 0.08, p.v0 + 0.04, p.u1 + 0.04, STOREY.ground + 0.04, p.v1 - 0.04, STONE_SHADE);
        b.detail(() => {
          for (const u of [p.u0, p.u1])
            for (let y = 0.35, k = 0; y < top - 0.2; y += 0.42, k++) {
              const w = k % 2 ? 0.28 : 0.45;
              const s = u === p.u0 ? 1 : -1;
              box(u - s * 0.03, y, p.v1 + w, u + s * w, y + 0.36, p.v1 - 0.03, STONE_SHADE);
            }
        });
        const us = windowsAlong(p.u0 + 0.6, p.u1 - 0.6, 1.7);
        const cu = (p.u0 + p.u1) / 2;
        for (let f = 0; f < p.floors; f++) {
          const y = f === 0 ? 0.55 : STOREY.ground + (f - 1) * STOREY.upper + 0.35;
          const h = f === 0 ? 1.45 : 1.25;
          for (const u of us) {
            if (f === 0 && isMain && Math.abs(u - cu) < 0.9) continue;
            // (clear of the turrets at its front corners)
            if (!m.parts.slice(1).some((q) => u > q.u0 - 0.45 && u < q.u1 + 0.45)) win(u, p.v0, [0, 1], 0.8, y, h, false, true);
            win(u, p.v1, [0, -1], 0.8, y, h, false, false);
          }
        }
        // The mansard in slate, its flat top the terrace; dormers on its front and back slopes
        const { h: mh, inset, o } = MANSARD;
        const [r, soffit] = mansard(p.u0, p.v0, p.u1, p.v1, top, mh, inset, o);
        add(r, SLATE);
        add(soffit, STONE_SHADE);
        b.detail(() => box(p.u0 - o, top - 0.02, p.v0 + o - 0.06, p.u1 + o, top + 0.1, p.v1 - o + 0.06, STONE_SHADE));
        for (const u of us)
          for (const s of [1, -1]) {
            if (s > 0 && m.parts.slice(1).some((q) => u > q.u0 - 0.6 && u < q.u1 + 0.6)) continue;
            const edge = s > 0 ? p.v0 + o : p.v1 - o;
            const vf = edge - s * inset * 0.45;
            const y0 = top + mh * 0.25;
            const [a, c] = s > 0 ? [vf, vf - 0.7] : [vf, vf + 0.7];
            box(u - 0.38, y0, a, u + 0.38, y0 + 0.85, c, STONE);
            pane(u, vf, [0, s], 0.48, y0 + 0.12, 0.62, windowOf(m.id, u, y0, vf, low), true, 0, 0.012);
            const [dr] = hip(u - 0.38, s > 0 ? a : c, u + 0.38, s > 0 ? c : a, y0 + 0.85, 0.35, 0.06);
            add(dr, SLATE);
          }
        if (isMain) {
          drawDeck(G, ROOF_DECKS[MANSIONS.indexOf(m)], 'stone');
          // (a tall stone chimney at its first end, through the mansard)
          const ch = MANSION_CHIMNEY.half;
          const cx = p.u0 + MANSION_CHIMNEY.at;
          box(cx - ch, top, p.v1 + 1.5, cx + ch, top + mh + 0.9, p.v1 + 0.86, STONE);
          box(cx - ch - 0.06, top + mh + 0.9, p.v1 + 1.56, cx + ch + 0.06, top + mh + 1.02, p.v1 + 0.8, STONE_SHADE);
        }
      }

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
        // (its roof a terrace: decked, railed in glass, furnished: the premium upgrade's Phase 2, crestgrand.ts)
        drawDeck(G, ROOF_DECKS[MANSIONS.indexOf(m)], 'glass');
      }

      // The drive (following the ground), the forecourt, the pool's deck and water, in world numbers
      const q = new Batch();
      const [ox, oz] = outOf(m.face);
      const L = Math.hypot(d1[0] - d0[0], d1[1] - d0[1]);
      const [px, pz] = [-oz * 1.2, ox * 1.2];
      const at = (t: number) => [d0[0] + (d1[0] - d0[0]) * t, d0[1] + (d1[1] - d0[1]) * t];
      // (dense, on the grass as drawn: crestdrape.ts, so the grass never shows through it)
      const g = meshGeometry(lineMesh(m.drive, DRAPE.drive.half, DRAPE.drive.lift));
      // (its kerbs a post every tile)
      const k = Math.max(1, Math.ceil(L));
      q.add(g, STONE);
      const near = (x: number, z: number) => {
        const [vx, vz] = [d1[0] - d0[0], d1[1] - d0[1]];
        const t = Math.max(0, Math.min(1, ((x - d0[0]) * vx + (z - d0[1]) * vz) / (vx * vx + vz * vz || 1)));
        return Math.hypot(x - d0[0] - vx * t, z - d0[1] - vz * t) < 2.5;
      };
      // (its edging: a stone kerb down each side, its foot in the ground, a little over the drive)
      const kerb = new Batch();
      for (const s of [-1, 1]) {
        const line: Post[] = [];
        for (let i = 0; i <= k; i++) {
          const [x, z] = at(i / k);
          const [ex, ez] = [x + s * px * 1.08, z + s * pz * 1.08];
          const top = drawnAt(x + s * px, z + s * pz) + 0.14;
          line.push({ x: ex, z: ez, y0: Math.min(top - 0.2, drawnAt(ex + s * px * 0.15, ez + s * pz * 0.15) - 0.15), y1: top });
        }
        kerb.add(wallGeometry(line, 0.1), STONE_SHADE);
      }
      // Its low lights by turns either side (crestbanks.ts): a dark post near, its glowing cap at every distance
      driveLights().filter(([x, z]) => near(x, z)).forEach(([x, z, y], i) => {
        if (low && i % 2) return;
        kerb.detail(() => kerb.add(new THREE.CylinderGeometry(0.045, 0.055, 0.42, 6).translate(x, y + 0.16, z), GUTTER));
        kerb.add(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 8).translate(x, y + 0.4, z), WALL_GLOW);
      });
      kerb.build(into, { cast: false, receive: true });
      drawBank(into, banks()[MANSIONS.indexOf(m)], low);
      const pave = (r: [number, number, number, number], y: number, mat: THREE.Material) => flat(q, r[0], r[1], r[2], r[3], m.y + y, mat, 8);
      const [cu0, cv0, cu1, cv1] = m.court;
      // (a chateau's forecourt in raked gravel)
      pave(rectToWorld(m, Math.max(-W / 2 + 1, cu0), Math.min(-1, cv0), Math.min(W / 2 - 1, cu1), cv1), 0.02, kind === 'chateau' ? GRAVEL : PAVING);
      pave(rectToWorld(m, pu0 - 1, pv0 + 1.8, pu1 + 1, pv1 - (kind === 'glass' ? 0.4 : 0.8)), 0.014, PAVING);
      pave(rectToWorld(m, pu0, pv0, pu1, pv1), 0.024, poolOf(low));
      // Its yard round the pad (mansions.ts `yard`): level, mown, a little over the grass
      const [y0, y1, y2, y3] = m.yard;
      for (const r of [
        [y0, y1, x0, y3],
        [x1, y1, y2, y3],
        [x0, y1, x1, z0],
        [x0, z1, x1, y3],
      ] as [number, number, number, number][])
        if (r[2] - r[0] > 0.2 && r[3] - r[1] > 0.2) flat(q, r[0], r[1], r[2], r[3], m.y + 0.02, YARD_LAWN, 8);
      q.build(into, { cast: false, receive: true });
      void low;
    });
  }
  // The civic hall's and the country club's banks (crestbanks.ts), a site each
  // (their banks laid when the site's built, in the site worker: crestbanks.ts `siteBanks()`)
  for (const [k, g] of SITE_GROUNDS.entries()) {
    const [x0, z0, x1, z1] = g.rect;
    site(`crestmont bank ${g.id}`, [x0 - PAD_EASE - 1, z0 - PAD_EASE - 1, x1 + PAD_EASE + 1, z1 + PAD_EASE + 1], (into) => drawBank(into, siteBanks()[k], low));
  }
  // The cars on the forecourts (the main thread's), each at its pad's height
  if (scene) for (const { y, car } of MANSION_CARS) parkedCars(scene, y, [[car[0] as CarId, car[1], car[2], car[3], car[4]]]);
}

/* ---------- The banks round the pads (crestbanks.ts) ---------- */

const DRY_STONE = toon('#b9ab8f');
const COPING = toon('#d3c8b0');
const BED_SOIL = toon(SOIL.bed);
const ROCK = toon('#8e8a84');
/** A pad's yard, mown (the palette's lawns) */
const YARD_LAWN = toon(COVER.garden);
/** The grounds' low lights at night: small, warm, just past the bloom's threshold */
const WALL_GLOW = neon('#ffe2a8', 0.15, 1.25);
/** A bank's plants: the mound's colour, and (near) its flowers' or its leaves' */
const PLANT_MAT: Record<PlantKind, { body: THREE.Material; top?: THREE.Material }> = {
  lavender: { body: toon('#7d9070'), top: toon('#9b7ddb') },
  rosemary: { body: toon('#5f7d5a') },
  sage: { body: toon('#8aa073') },
  box: { body: toon(PLANT.clipped) },
  bougainvillea: { body: toon('#3f7a40'), top: toon('#d0287a') },
  grass: { body: toon(COVER.dry) },
  agave: { body: toon('#7fa3a0') },
};
const mound = new THREE.IcosahedronGeometry(1, 0);

/**
 * A wall along a run of posts (world numbers): `half` thick either side of the line, each stretch from its posts'
 * feet to their tops (a sloping top where the ground slopes), faces flat-shaded and wound outward
 */
export function wallGeometry(posts: Post[], half: number, cap = 0) {
  const pos: number[] = [];
  const tri = (a: number[], b: number[], c: number[], out: [number, number, number]) => {
    const [ux, uy, uz] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const [vx, vy, vz] = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) pos.push(...a, ...c, ...b);
    else pos.push(...a, ...b, ...c);
  };
  const quad = (a: number[], b: number[], c: number[], d: number[], out: [number, number, number]) => {
    tri(a, b, c, out);
    tri(a, c, d, out);
  };
  for (let i = 0; i + 1 < posts.length; i++) {
    const [p, q] = [posts[i], posts[i + 1]];
    const L = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    const [tx, tz] = [(q.x - p.x) / L, (q.z - p.z) / L];
    const [sx, sz] = [-tz * half, tx * half];
    const [p0, p1, q0, q1] = cap ? [p.y1, p.y1 + cap, q.y1, q.y1 + cap] : [p.y0, p.y1, q.y0, q.y1];
    const P = (s: number, y: number) => [p.x + sx * s, y, p.z + sz * s];
    const Q = (s: number, y: number) => [q.x + sx * s, y, q.z + sz * s];
    quad(P(1, p1), P(-1, p1), Q(-1, q1), Q(1, q1), [0, 1, 0]);
    quad(P(1, p0), P(1, p1), Q(1, q1), Q(1, q0), [sx, 0, sz]);
    quad(P(-1, p0), P(-1, p1), Q(-1, q1), Q(-1, q0), [-sx, 0, -sz]);
    if (i === 0) quad(P(1, p0), P(1, p1), P(-1, p1), P(-1, p0), [-tx, 0, -tz]);
    if (i + 2 === posts.length) quad(Q(1, q0), Q(1, q1), Q(-1, q1), Q(-1, q0), [tx, 0, tz]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** A pad's bank: its terraces' walls and copings, the soil beds, the plants and boulders (world numbers) */
function drawBank(into: THREE.Object3D, bank: Bank, low: boolean) {
  const b = new Batch();
  for (const w of bank.walls) {
    b.add(wallGeometry(w, 0.17), DRY_STONE);
    // (its coping: not on phones)
    if (!low) b.add(wallGeometry(w, 0.21, 0.07), COPING);
  }
  // The beds: strips of soil laid densely on the grass as drawn (crestdrape.ts)
  for (const bed of bank.beds) b.add(meshGeometry(bandMesh(bed.map((s) => [s.ax, s.az]), bed.map((s) => [s.bx, s.bz]), DRAPE.bed)), BED_SOIL);
  // The plants: a mound each by its kind (phones every other), and near, its flowers or its spikes
  // (phones: near only, as the hills' scrub; the walls, beds and boulders at every distance)
  if (low) b.lod = 'near';
  bank.plants.forEach((p, i) => {
    if (low && i % 2) return;
    const { body, top } = PLANT_MAT[p.kind];
    const s = p.s;
    if (p.kind === 'agave' || p.kind === 'grass') {
      // (a rosette of blades)
      const n = p.kind === 'agave' ? 6 : 5;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + p.x;
        const blade = new THREE.ConeGeometry(p.kind === 'agave' ? 0.09 * s : 0.07 * s, (p.kind === 'agave' ? 0.6 : 0.75) * s, 4, 1, true);
        b.add(blade.rotateZ(p.kind === 'agave' ? 0.7 : 0.25).rotateY(a).translate(p.x, p.y + 0.22 * s, p.z), body);
      }
      if (p.kind === 'agave') b.add(new THREE.ConeGeometry(0.07 * s, 0.55 * s, 4, 1, true).translate(p.x, p.y + 0.25 * s, p.z), body);
      return;
    }
    const [r, h] = p.kind === 'box' ? [0.34, 0.3] : p.kind === 'bougainvillea' ? [0.42, 0.3] : [0.36, 0.26];
    b.add(mound.clone().scale(r * s, h * s, r * s).translate(p.x, p.y + h * s * 0.75, p.z), body);
    if (top)
      b.detail(() => {
        if (p.kind === 'lavender') {
          if (!low) for (let k = 0; k < 5; k++) b.add(new THREE.CylinderGeometry(0.03, 0.02, 0.22, 4).translate(p.x + Math.cos(k * 1.3 + p.z) * 0.2 * s, p.y + 0.5 * s, p.z + Math.sin(k * 1.3 + p.z) * 0.2 * s), top);
          else b.add(mound.clone().scale(0.26 * s, 0.08, 0.26 * s).translate(p.x, p.y + 0.48 * s, p.z), top);
        } else b.add(mound.clone().scale(0.38 * s, 0.18 * s, 0.38 * s).translate(p.x + 0.05, p.y + 0.4 * s, p.z - 0.04), top);
      });
  });
  b.lod = 'all';
  // The walls' lights: a small glowing puck in the face (phones: every other)
  bank.lights.forEach(([x, z, y], i) => {
    if (low && i % 2) return;
    b.add(new THREE.SphereGeometry(0.06, 6, 4).scale(1, 0.7, 1).translate(x, y, z), WALL_GLOW);
  });
  for (const r of bank.rocks) b.add(new THREE.DodecahedronGeometry(0.32 * r.s, 0).scale(1.15, 0.7, 0.9).rotateY(r.turn).translate(r.x, r.y + 0.1 * r.s, r.z), ROCK);
  b.build(into, { cast: true, receive: true });
}

/** A mesh laid on the grass (crestdrape.ts) as geometry */
export function meshGeometry(m: Mesh) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(m.pos, 3));
  g.setIndex(m.idx);
  g.computeVertexNormals();
  return g;
}
