/*
 * The Drive drawn (docs/crestmont-plan.md Phase 4; the numbers are coral.ts's), in Crestmont's chunk (crestmont3d.ts
 * `register()`), as sites (tilework.ts): each boutique (white stone, glass in bronze or white render; a plinth,
 * pilasters, the shop window with its display lit at night, a bronze door, the fascia with its name from one sign
 * atlas, an awning, a cornice, the upper floors' windows, a parapet, flags on the grander ones; planters by the door
 * and a café's tables out front), Via Coral (its cobbles and kerbs, the arch with its name both ways, the fountains,
 * the two lane shops), the bays off the kerb (asphalt, their lines, the valets' stands) and, on the main thread, the
 * cars parked in them (`parkedCars()`). Fixed made-up copy only.
 */
import * as THREE from 'three';
import { Batch, canvasTex, siteMat, toon } from './kit';
import { site } from './tilework';
import { parkedCars, type CarId } from './cars';
import { BAY_DEPTH, CORAL_BAYS, bayRect } from './crestmont';
import { ARCH, CAFES, COBBLES, CORAL_CARS, FOUNTAINS, FRONT, NAMES, PLANTER, PLANTERS, SHOPS, SLAB_Y, SPACE, STAND, STOREY, TABLES, TABLE_R, VALET, VALET_STANDS, VIA, VIA_NAME, doorOf, heightOf, outOf, type Boutique } from './coral';
import { BULB, GOLD, LED, SPRAY, WATER, cyl, flat, planter, signAtlas } from './mallkit';
import { FRONT as WINDOW, CURTAIN } from './mallkit';

type Rect = [number, number, number, number];

const STONE = toon('#efe7d6');
const STONE_SHADE = toon('#ddd2bd');
const PLINTH = toon('#8d8273');
const RENDER = toon('#f6f4ee');
const BRONZE = toon('#8a6a3e');
const BLACK = toon('#18171c');
const CREAM = toon('#f4ead2');
const DOOR_GLASS = toon('#2b3440');
const ROOF = toon('#b9b2a5');
const ASPHALT = toon('#26243f');
const LINE = toon('#e8e4f8');
const KERB = toon('#cfc6b4');
const BALL = toon('#3f7434');
const FLAG_COLOURS = [toon('#1e2a55'), toon('#6e1f2e'), toon('#f1ece0')];
const POLE = toon('#c9b07a');

/** Cobbles, warm grey setts in rows, laid on in world units */
const COBBLE = (() => {
  const map = canvasTex(128, 128, (c) => {
    let s = 77;
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    c.fillStyle = '#8f877a';
    c.fillRect(0, 0, 128, 128);
    const tones = ['#c9bfae', '#b9ae9b', '#d3cab9', '#bfb3a0', '#aa9f8c'];
    for (let row = 0; row < 8; row++)
      for (let col = -1; col < 9; col++) {
        const x = col * 16 + (row % 2 ? 8 : 0);
        c.fillStyle = tones[Math.floor(r() * tones.length)];
        c.beginPath();
        c.roundRect(x + 1.5, row * 16 + 1.5, 13, 13, 4);
        c.fill();
      }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const m = toon('#ffffff', { map });
  m.userData.worldUV = [1.6, 1.6];
  return siteMat('coral-cobble', m);
})();

/** Bay paint and the asphalt, at the streets' heights (crestmont3d.ts: 0.031) */
const BAY_Y = 0.031;

/** Where a boutique's frame puts things: u along its front (from its door, to its right seen from the street), y up from the slab, v out from its front */
function frameOf(b: Boutique) {
  const [dx, dz] = doorOf(b);
  const [ox, oz] = outOf(b.face);
  // (local +x along the front, +y up, +z out: a turn, never a mirror)
  const M = new THREE.Matrix4().set(oz, 0, ox, dx, 0, 1, 0, SLAB_Y, -ox, 0, oz, dz, 0, 0, 0, 1);
  const W = b.face === 'e' || b.face === 'w' ? b.rect[3] - b.rect[1] : b.rect[2] - b.rect[0];
  const D = b.face === 'e' || b.face === 'w' ? b.rect[2] - b.rect[0] : b.rect[3] - b.rect[1];
  return { M, W, D };
}

export function registerCoral(low: boolean, scene: THREE.Scene | null) {
  const sign = signAtlas('coral-signs', [...NAMES, ...CAFES, VIA_NAME, VALET], new Set([VIA_NAME]));

  /* ---------- The boutiques ---------- */
  for (const shop of SHOPS) {
    const [x0, z0, x1, z1] = shop.rect;
    const pad = FRONT;
    site(`coral ${shop.id}`, [x0 - pad, z0 - pad, x1 + pad, z1 + pad], (into) => {
      const b = new Batch();
      const { M, W, D } = frameOf(shop);
      const add = (g: THREE.BufferGeometry, m: THREE.Material) => b.add(g.applyMatrix4(M), m);
      // (a proxy for the sign atlas, laying its planes in the frame)
      const framed = { add } as unknown as Batch;
      const box = (u0: number, y0: number, v0: number, u1: number, y1: number, v1: number, m: THREE.Material) => add(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0).translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2), m);
      /** A pane facing out (+v) at v, u0 to u1, y0 to y1, its texture `rep` wide (world units) */
      const pane = (m: THREE.Material, u0: number, u1: number, y0: number, y1: number, v: number, rep: [number, number], turn = 0) => {
        const g = new THREE.PlaneGeometry(u1 - u0, y1 - y0);
        const uv = g.attributes.uv;
        // (a texture laid on in world units, or across its height once: rep[1] 0)
        for (let k = 0; k < uv.count; k++) uv.setXY(k, (u0 + uv.getX(k) * (u1 - u0)) / rep[0], rep[1] ? (y0 + uv.getY(k) * (y1 - y0)) / rep[1] : uv.getY(k));
        g.translate((u0 + u1) / 2, (y0 + y1) / 2, v);
        if (turn) g.rotateY(turn);
        add(g, m);
      };
      const H = heightOf(shop);
      const top = H - STOREY.parapet;
      const [hw] = [W / 2];
      const skin = shop.style === 'render' ? RENDER : STONE;
      const trim = shop.style === 'glass' ? BRONZE : shop.style === 'render' ? BLACK : STONE_SHADE;
      // The body
      box(-hw, 0, -D, hw, top, 0, skin);
      // The plinth, the pilasters at the front's corners
      box(-hw, 0, 0, hw, 0.22, 0.05, PLINTH);
      for (const s of [-1, 1]) box(s * hw - (s > 0 ? 0.32 : 0), 0.22, 0, s * hw + (s < 0 ? 0.32 : 0), top, 0.07, skin === STONE ? STONE_SHADE : skin);
      // The shop window either side of the door, its display lit at night (the mall's window texture), framed in bronze
      const g0 = STOREY.ground;
      const door = 0.6;
      for (const [a, c] of [
        [-hw + 0.38, -door - 0.12],
        [door + 0.12, hw - 0.38],
      ] as [number, number][]) {
        if (c - a < 0.4) continue;
        pane(WINDOW, a, c, 0.28, g0 - 0.48, 0.012, [4, 0]);
        // (the frame: sill, head, the jambs)
        box(a - 0.05, 0.22, 0.012, c + 0.05, 0.3, 0.06, BRONZE);
        box(a - 0.05, g0 - 0.5, 0.012, c + 0.05, g0 - 0.44, 0.06, BRONZE);
      }
      // The door: a bronze surround, dark glass, a gold handle
      box(-door - 0.1, 0.22, 0.012, door + 0.1, g0 - 0.36, 0.08, BRONZE);
      box(-door, 0.24, 0.08, door, g0 - 0.44, 0.095, DOOR_GLASS);
      box(-0.06, 0.9, 0.095, 0.06, 1.3, 0.13, GOLD);
      // The fascia and its name
      box(-hw + 0.32, g0 - 0.36, 0, hw - 0.32, g0, 0.1, shop.style === 'render' ? BLACK : trim === STONE_SHADE ? BLACK : BRONZE);
      sign(framed, shop.name, 0, g0 - 0.18, 0.112, Math.min(W - 1.2, 3.2), 0.3, 0);
      // A cornice over the shop
      box(-hw, g0, 0, hw, g0 + 0.14, 0.16, skin === STONE ? STONE_SHADE : skin);
      // The awning, over the windows: black with a gold edge, or gold and cream stripes
      if (shop.awning !== 'none') {
        const out = 1.05;
        const [ya, yb] = [g0 - 0.38, g0 - 0.72];
        const slope = Math.atan2(ya - yb, out);
        const n = Math.max(2, Math.round((W - 0.8) / 0.34));
        const w = (W - 0.8) / n;
        for (let i = 0; i < n; i++) {
          const m = shop.awning === 'black' ? BLACK : i % 2 ? CREAM : GOLD;
          add(new THREE.BoxGeometry(w, 0.04, Math.hypot(out, ya - yb)).rotateX(slope).translate(-hw + 0.4 + (i + 0.5) * w, (ya + yb) / 2, 0.15 + out / 2), m);
        }
        // (its valance)
        box(-hw + 0.4, yb - 0.16, out + 0.12, hw - 0.4, yb, out + 0.17, shop.awning === 'black' ? GOLD : BLACK);
      }
      // The upper floors' windows: a row a storey, a window a bay; or the glass shop's curtain wall in bronze fins
      const bays = Math.max(1, Math.floor((W - 0.6) / 1.6));
      const bw = (W - 0.6) / bays;
      for (let f = 1; f < shop.floors; f++) {
        const y0 = g0 + 0.14 + (f - 1) * STOREY.upper;
        if (shop.style === 'glass') {
          pane(CURTAIN, -hw + 0.32, hw - 0.32, y0 + 0.05, y0 + STOREY.upper - 0.05, 0.02, [3.2, 3.2]);
          for (let i = 0; i <= bays; i++) box(-hw + 0.3 + i * bw - 0.04, y0, 0.02, -hw + 0.3 + i * bw + 0.04, y0 + STOREY.upper, 0.12, BRONZE);
          box(-hw + 0.32, y0 + STOREY.upper - 0.08, 0.02, hw - 0.32, y0 + STOREY.upper, 0.1, BRONZE);
        } else
          for (let i = 0; i < bays; i++) {
            const [a, c] = [-hw + 0.3 + i * bw + 0.28, -hw + 0.3 + (i + 1) * bw - 0.28];
            pane(CURTAIN, a, c, y0 + 0.3, y0 + STOREY.upper - 0.2, 0.012, [3.2, 3.2]);
            // (a surround and a sill)
            box(a - 0.07, y0 + 0.22, 0.012, c + 0.07, y0 + 0.3, 0.09, trim === STONE_SHADE ? STONE_SHADE : BLACK);
            box(a - 0.07, y0 + STOREY.upper - 0.2, 0.012, c + 0.07, y0 + STOREY.upper - 0.13, 0.05, trim === STONE_SHADE ? STONE_SHADE : BLACK);
          }
      }
      // A window or two on the arcade's side, its ground floor a second window onto the lane
      if (shop.side) {
        const [sx, sz] = outOf(shop.side);
        // (which way the side faces in the frame: along u, +1 or -1)
        const [ox, oz] = outOf(shop.face);
        const s = Math.sign(sx * oz - sz * ox) || 1;
        const turn = (s * Math.PI) / 2;
        // (a pane on the side wall at u = s * hw, its v running back from the front: laid facing +v then turned)
        const side = (m: THREE.Material, v0: number, v1: number, y0: number, y1: number, rep: [number, number]) => {
          const g = new THREE.PlaneGeometry(v1 - v0, y1 - y0);
          const uv = g.attributes.uv;
          for (let k = 0; k < uv.count; k++) uv.setXY(k, (v0 + uv.getX(k) * (v1 - v0)) / rep[0], rep[1] ? (y0 + uv.getY(k) * (y1 - y0)) / rep[1] : uv.getY(k));
          g.translate(s * ((v0 + v1) / 2), (y0 + y1) / 2, hw + 0.012).rotateY(turn);
          add(g, m);
        };
        side(WINDOW, 0.6, D - 1.2, 0.3, g0 - 0.5, [4, 0]);
        for (let f = 1; f < shop.floors; f++) side(CURTAIN, 1, D - 1.4, g0 + 0.44 + (f - 1) * STOREY.upper, g0 + (f - 1) * STOREY.upper + STOREY.upper - 0.06, [3.2, 3.2]);
      }
      // The top: a cornice, the parapet round the roof, a little plant on it
      box(-hw, top - 0.2, 0, hw, top, 0.2, trim === BRONZE ? STONE_SHADE : skin === STONE ? STONE_SHADE : skin);
      box(-hw, top, -0.22, hw, H, 0, skin);
      box(-hw, top, -D, hw, H, -D + 0.22, skin);
      for (const s of [-1, 1]) box(s > 0 ? hw - 0.22 : -hw, top, -D + 0.22, s > 0 ? hw : -hw + 0.22, H, -0.22, skin);
      add(new THREE.PlaneGeometry(W - 0.44, D - 0.44).rotateX(-Math.PI / 2).translate(0, top + 0.006, -D / 2), ROOF);
      b.detail(() => box(-hw * 0.4, top, -D * 0.7, hw * 0.3, top + 0.55, -D * 0.4, ROOF));
      // Flags out from the upper floor
      if (shop.flags)
        b.detail(() => {
          for (const s of [-1, 1]) {
            const [u, y] = [s * (hw - 0.6), g0 + STOREY.upper * 0.9];
            add(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 5, 1, true).rotateX(Math.PI / 2.6).translate(u, y + 0.25, 0.5), POLE);
            add(new THREE.BoxGeometry(0.02, 0.8, 0.5).translate(u, y - 0.05, 0.8), FLAG_COLOURS[(shop.name.length + (s > 0 ? 1 : 0)) % FLAG_COLOURS.length]);
          }
        });
      // A soft light over the door at night
      box(-0.5, g0 - 0.41, 0.1, 0.5, g0 - 0.38, 0.14, LED);
      b.build(into, { cast: true, receive: true });
      // The planters by its door and the café's tables (world numbers)
      const p = new Batch();
      const [dx, dz] = doorOf(shop);
      for (const [x, z] of PLANTERS) if (Math.hypot(x - dx, z - dz) < 1.6) {
        planter(p, x, z, SLAB_Y, PLANTER.half * 2, PLANTER.h);
        p.detail(() => p.add(new THREE.IcosahedronGeometry(0.26, 1).translate(x, SLAB_Y + PLANTER.h + 0.34, z), BALL));
      }
      if (shop.cafe)
        for (const [x, z] of TABLES) {
          if (x < x0 - FRONT || x > x1 + FRONT || z < z0 || z > z1) continue;
          cyl(p, 0.32, 0.04, x, SLAB_Y + 0.7, z, STONE, 12);
          cyl(p, 0.04, 0.7, x, SLAB_Y, z, BRONZE, 6, 0.04, true);
          p.detail(() => {
            for (const s of [-1, 1]) {
              const cz = z + s * (TABLE_R - 0.15);
              p.box(x - 0.17, SLAB_Y + 0.4, cz - 0.17, 0.34, 0.05, 0.34, BLACK);
              p.box(x - 0.17, SLAB_Y + 0.45, cz + s * 0.13, 0.34, 0.4, 0.04, BLACK);
            }
            // (an umbrella over it)
            cyl(p, 0.02, 1.4, x, SLAB_Y + 0.74, z, BRONZE, 5, 0.02, true);
            p.add(new THREE.ConeGeometry(0.9, 0.35, 8, 1, true).translate(x, SLAB_Y + 2.3, z), shop.awning === 'gold' ? CREAM : BLACK);
          });
        }
      p.build(into, { cast: false, receive: true });
    });
  }

  /* ---------- Via Coral: the cobbles, the arch, the fountains ---------- */
  const [, lz0, lx1, lz1] = VIA.lane;
  const [px0, pz0, , pz1] = VIA.piazza;
  site('coral via', [px0 - 1, pz0 - 1, lx1 + 1, pz1 + 1], (into) => {
    const b = new Batch();
    for (const c of COBBLES) flat(b, c[0], c[1], c[2], c[3], SLAB_Y + 0.012, COBBLE, 8);
    // (a stone kerb along the lane's edges where no shop stands, and round the piazza)
    for (const z of [lz0, lz1]) b.box(lx1 - FRONT + 0.1, SLAB_Y, z - 0.1, FRONT - 0.1, 0.03, 0.2, KERB);
    for (const z of [pz0, pz1]) b.box(px0, SLAB_Y, z - 0.1, VIA.piazza[2] - px0, 0.03, 0.2, KERB);
    // The arch: two stone piers, a lintel with a cornice, its name both ways
    const { x, piers, half, h, top } = ARCH;
    for (const z of piers) {
      b.box(x - half, SLAB_Y, z - half, half * 2, h, half * 2, STONE);
      b.box(x - half - 0.05, SLAB_Y, z - half - 0.05, half * 2 + 0.1, 0.3, half * 2 + 0.1, PLINTH);
      b.box(x - half - 0.06, SLAB_Y + h - 0.16, z - half - 0.06, half * 2 + 0.12, 0.16, half * 2 + 0.12, STONE_SHADE);
    }
    const [za, zb] = [piers[0] - half, piers[1] + half];
    b.box(x - half, SLAB_Y + h, za, half * 2, top - h, zb - za, STONE);
    b.box(x - half - 0.08, SLAB_Y + top, za - 0.08, half * 2 + 0.16, 0.12, zb - za + 0.16, STONE_SHADE);
    sign(b, VIA_NAME, x + half + 0.012, SLAB_Y + (h + top) / 2, VIA.z, 2.4, 0.42, Math.PI / 2);
    sign(b, VIA_NAME, x - half - 0.012, SLAB_Y + (h + top) / 2, VIA.z, 2.4, 0.42, -Math.PI / 2);
    // Lanterns on the piers
    for (const z of piers) b.add(new THREE.SphereGeometry(0.12, 8, 6).translate(x, SLAB_Y + top + 0.3, z), BULB);
    // The fountains: a stone basin, its water, a column and bowls, the jets
    for (const f of FOUNTAINS) {
      // (the basin's wall open at the top, its rim a ring, the water just under it)
      cyl(b, f.r, f.rim, f.x, SLAB_Y, f.z, STONE, 20, f.r, true);
      b.add(new THREE.RingGeometry(f.r - 0.12, f.r, 20).rotateX(-Math.PI / 2).translate(f.x, SLAB_Y + f.rim, f.z), STONE_SHADE);
      b.add(new THREE.CircleGeometry(f.r - 0.1, 20).rotateX(-Math.PI / 2).translate(f.x, SLAB_Y + f.rim - 0.04, f.z), WATER);
      let y = SLAB_Y + f.rim;
      for (let t = 0; t < f.tiers; t++) {
        const r = f.r * (0.55 - t * 0.2);
        cyl(b, 0.1, 0.7, f.x, y - 0.1, f.z, STONE_SHADE, 8);
        y += 0.6;
        cyl(b, r, 0.14, f.x, y, f.z, STONE, 14, r * 0.6);
        b.add(new THREE.CircleGeometry(r - 0.06, 14).rotateX(-Math.PI / 2).translate(f.x, y + 0.146, f.z), WATER);
      }
      b.detail(() => b.add(new THREE.ConeGeometry(0.12, 0.5, 6, 1, true).translate(f.x, y + 0.4, f.z), SPRAY));
    }
    b.build(into, { cast: true, receive: true });
  });

  /* ---------- The bays: asphalt, their lines, the valets' stands ---------- */
  for (const bay of CORAL_BAYS) {
    const r: Rect = bayRect(bay);
    site(`coral bay ${bay.id}`, [r[0] - 2, r[1] - 1, r[2] + 2, r[3] + 1], (into) => {
      const b = new Batch();
      flat(b, r[0], r[1], r[2], r[3], BAY_Y, ASPHALT, 12);
      // (the spaces' lines across the bay, and along its back)
      const n = Math.floor((bay.to - bay.from) / SPACE);
      const start = bay.from + (bay.to - bay.from - n * SPACE) / 2;
      for (let i = 0; i <= n; i++) b.box(r[0] + 0.15, BAY_Y, start + i * SPACE - 0.04, BAY_DEPTH - 0.3, 0.006, 0.08, LINE);
      for (const st of VALET_STANDS)
        if (st[1] > bay.from && st[1] < bay.to && bay.kind === 'valet') {
          const [x, z] = st;
          b.box(x - STAND.half, SLAB_Y, z - STAND.half, STAND.half * 2, STAND.h, STAND.half * 2, BLACK);
          b.box(x - STAND.half - 0.03, SLAB_Y + STAND.h, z - STAND.half - 0.03, STAND.half * 2 + 0.06, 0.05, STAND.half * 2 + 0.06, BRONZE);
          const f = bay.side === 'e' ? 1 : -1;
          sign(b, VALET, x + f * (STAND.half + 0.012), SLAB_Y + STAND.h - 0.3, z, 0.5, 0.14, (f * Math.PI) / 2);
          b.detail(() => {
            cyl(b, 0.025, 1.7, x, SLAB_Y + STAND.h, z, BRONZE, 5, 0.025, true);
            b.add(new THREE.ConeGeometry(0.85, 0.32, 8, 1, true).translate(x, SLAB_Y + STAND.h + 1.75, z), BLACK);
          });
        }
      b.build(into, { cast: false, receive: true });
    });
  }

  // The cars in the bays (the main thread's)
  if (scene) parkedCars(scene, BAY_Y, CORAL_CARS.map(([id, x, z, yaw, c]) => [id as CarId, x, z, yaw, c]));
  void low;
}
