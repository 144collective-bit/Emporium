/*
 * Uptown's towers on screen (docs/finance-plan.md Phase 2; the numbers are
 * highrise.ts), part of Uptown's chunk (uptown3d.ts), a site a tower:
 *
 * - **The walls** from Uptown's own curtain-wall atlas (`ATLAS`: blue, gold,
 *   black and silver glass, a floor to a band's row and a bay to its column,
 *   the deco stone with its window strips and gold spandrels, and the
 *   podium's lobby), laid on in world units, stacked so a band never wraps,
 *   in pieces no longer than `SPAN` (nothing fixed much longer than a tile);
 *   their windows lit at night from its light map (offices: about half lit).
 *   Drums in `SIDES` facets, octagons with their corners cut (`CUT`).
 * - **Roofs** on every part (the setbacks' terraces too), a parapet round
 *   each.
 * - **Crowns:** a slab's lit band round its shaft's top; a deco tower's gold
 *   edges at each setback, its gold pyramid and finial; a drum's neon ring
 *   and cap; the twins' skybridge with a lit strip under it; the spire's lit
 *   lantern and mast. Every tower a red warning light at its tip (the
 *   neon's own: faint by day, bright at night, never flashing: a draw each).
 * - **Lobbies:** the podium's glazing all round, a canopy over the door and a
 *   revolving door (near only).
 *
 * Walls, roofs and crowns are drawn at every distance (the skyline is seen
 * from across town); parapets' caps, plant and the doors near only.
 */
import * as THREE from 'three';
import { Batch, canvasTex, lit, neon, rng, shadeHex, siteMat, toon } from './kit';
import { SLAB } from './world';
import { site } from './tilework';
import { HIGHRISES, PODIUM, type Highrise, type Part, type Skin } from './highrise';
import type { Pt, Rect } from './uptown';

/* ---------- The atlas ---------- */

const COLS = 8;
const ROWS = 4;
const PX_W = 48;
const PX_H = 64;
const W_PX = COLS * PX_W;
const BAND_PX = ROWS * PX_H;
const LOBBY_PX = 128;
/** A bay's width and a floor's height (world units) */
const BAY = 0.75;
const FLOOR = 1;
const SKINS: Skin[] = ['blue', 'gold', 'black', 'silver', 'stone'];
const GLASS: Record<Skin, { wall: string; mullion: string }> = {
  blue: { wall: '#2a5aa8', mullion: '#c8d4ee' },
  gold: { wall: '#b08a3a', mullion: '#f3e2b0' },
  black: { wall: '#1c1d2e', mullion: '#6a6c88' },
  silver: { wall: '#7d8fb3', mullion: '#e6ecf8' },
  stone: { wall: '#cdbf9f', mullion: '#a8873a' },
};
/** Lights in the offices at night: warm white and cool white */
const LIGHTS = ['#ffe6b0', '#ffe6b0', '#fff3d6', '#dff0ff'];

interface Band {
  v0: number;
  vh: number;
  tw: number;
  th: number;
}

/** One skin's band: ROWS floors of COLS bays, `glow` for the light map */
function skinBand(c: CanvasRenderingContext2D, skin: Skin, y0: number, glow: boolean, seed: number) {
  const r = rng(seed);
  const { wall, mullion } = GLASS[skin];
  c.fillStyle = glow ? '#000' : skin === 'stone' ? wall : shadeHex(wall, -0.2);
  c.fillRect(0, y0, W_PX, BAND_PX);
  for (let row = 0; row < ROWS; row++) {
    const y = y0 + row * PX_H;
    if (skin === 'stone') {
      // Stone piers between tall window strips, a gold spandrel under each window
      for (let col = 0; col < COLS; col++) {
        const x = col * PX_W;
        const on = r() < 0.45 ? LIGHTS[Math.floor(r() * LIGHTS.length)] : null;
        if (glow) {
          if (on) {
            c.fillStyle = on;
            c.fillRect(x + 14, y + 6, 20, 44);
          }
          continue;
        }
        // (by day the windows are all the same dark glass: the lights are the light map's, at night)
        c.fillStyle = shadeHex(wall, 0.12);
        c.fillRect(x, y, 6, PX_H);
        c.fillStyle = '#16131f';
        c.fillRect(x + 12, y + 4, 24, 48);
        const g = c.createLinearGradient(0, y + 6, 0, y + 50);
        g.addColorStop(0, '#5a6f9c');
        g.addColorStop(1, '#26304e');
        c.fillStyle = g;
        c.fillRect(x + 14, y + 6, 20, 44);
        c.fillStyle = mullion;
        c.fillRect(x + 12, y + 52, 24, 8);
      }
      continue;
    }
    // A curtain wall: glass from slab to slab, a dark slab edge at each floor, a mullion at every bay; by day one even
    // tint with the sky's reflection down each floor (the lights are the light map's, at night)
    for (let col = 0; col < COLS; col++) {
      const x = col * PX_W;
      const on = r() < 0.45 ? LIGHTS[Math.floor(r() * LIGHTS.length)] : null;
      if (glow) {
        if (on) {
          c.fillStyle = on;
          c.fillRect(x + 3, y + 9, PX_W - 6, PX_H - 11);
        }
        continue;
      }
      const tint = shadeHex(wall, (r() - 0.5) * 0.08);
      const g = c.createLinearGradient(0, y + 7, 0, y + PX_H);
      g.addColorStop(0, shadeHex(tint, 0.3));
      g.addColorStop(0.5, tint);
      g.addColorStop(1, shadeHex(tint, -0.25));
      c.fillStyle = g;
      c.fillRect(x, y + 7, PX_W, PX_H - 7);
      c.fillStyle = mullion;
      c.fillRect(x, y + 7, 2, PX_H - 7);
      c.fillRect(x + PX_W / 2 - 0.5, y + 7, 1, PX_H - 7);
    }
    if (!glow) {
      c.fillStyle = shadeHex(wall, -0.6);
      c.fillRect(0, y, W_PX, 7);
      c.fillStyle = mullion;
      c.fillRect(0, y + 6, W_PX, 1.5);
    }
  }
}

/** The podium's lobby, the full podium height: tall glazing in bronze frames under a dark band */
function lobbyBand(c: CanvasRenderingContext2D, y0: number, glow: boolean) {
  c.fillStyle = glow ? '#000' : '#16131f';
  c.fillRect(0, y0, W_PX, LOBBY_PX);
  for (let x = 4; x < W_PX; x += 96) {
    if (glow) {
      c.fillStyle = '#ffe6b0';
      c.fillRect(x, y0 + 34, 88, 92);
      continue;
    }
    c.fillStyle = '#8a6a3c';
    c.fillRect(x - 2, y0 + 32, 92, 96);
    const g = c.createLinearGradient(0, y0 + 34, 0, y0 + LOBBY_PX);
    g.addColorStop(0, '#5f7fb8');
    g.addColorStop(1, '#2a3558');
    c.fillStyle = g;
    c.fillRect(x, y0 + 34, 88, 94);
    c.fillStyle = '#8a6a3c';
    c.fillRect(x + 43, y0 + 34, 2, 94);
    c.fillRect(x, y0 + 74, 88, 2);
  }
  if (!glow) {
    c.fillStyle = '#c9b48a';
    c.fillRect(0, y0 + 24, W_PX, 4);
  }
}

const ATLAS = (() => {
  const H = SKINS.length * BAND_PX + LOBBY_PX;
  const draw = (glow: boolean) => (c: CanvasRenderingContext2D) => {
    SKINS.forEach((k, i) => skinBand(c, k, i * BAND_PX, glow, 900 + i));
    lobbyBand(c, SKINS.length * BAND_PX, glow);
  };
  const map = canvasTex(W_PX, H, draw(false));
  const emissiveMap = canvasTex(W_PX / 2, H / 2, (c) => {
    c.scale(0.5, 0.5);
    draw(true)(c);
  });
  for (const t of [map, emissiveMap]) t.wrapS = THREE.RepeatWrapping;
  // (canvas textures are flipped: the canvas's top row is v = 1; the lobby keeps a pixel off each edge)
  const band = (top: number, h: number, tw: number, th: number): Band => ({ v0: 1 - (top + h) / H, vh: h / H, tw, th });
  return {
    mat: siteMat('uptown-glass', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.12, 1)),
    skin: Object.fromEntries(SKINS.map((k, i) => [k, band(i * BAND_PX, BAND_PX, BAY * COLS, FLOOR * ROWS)])) as Record<Skin, Band>,
    lobby: band(SKINS.length * BAND_PX + 1, LOBBY_PX - 2, 3.2, PODIUM.h),
  };
})();

/* ---------- Walls, roofs, outlines ---------- */

/** The longest a wall piece runs (nothing fixed much longer than a tile: tilebatch.ts) */
const SPAN = 12;
/** A drum's facets, an octagon's corner cut (a share of its side) */
const SIDES = 20;
const CUT = 0.22;

/** A part's outline, counter-clockwise from above (+y) */
function outline(p: Part, sides = SIDES): Pt[] {
  const [x0, z0, x1, z1] = p.rect;
  if (p.shape === 'box')
    return [
      [x0, z0],
      [x0, z1],
      [x1, z1],
      [x1, z0],
    ];
  if (p.shape === 'drum') {
    const [cx, cz, r] = [(x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2];
    return Array.from({ length: sides }, (_, k) => {
      const a = (-2 * Math.PI * k) / sides;
      return [cx + Math.cos(a) * r, cz + Math.sin(a) * r] as Pt;
    });
  }
  const c = Math.min(x1 - x0, z1 - z0) * CUT;
  return [
    [x0 + c, z0],
    [x0, z0 + c],
    [x0, z1 - c],
    [x0 + c, z1],
    [x1 - c, z1],
    [x1, z1 - c],
    [x1, z0 + c],
    [x1 - c, z0],
  ];
}

/** An upright wall from a to c, y0 to y1, facing out of an outline wound counter-clockwise, its band laid on from u0 */
function wall(b: Batch, band: Band, a: Pt, c: Pt, y0: number, y1: number, u0: number) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  // Outward: along an outline wound as the blocks are ((x0, z0), (x0, z1), (x1, z1), ...) the inside is on the right
  const n: Pt = [-(c[1] - a[1]) / len, (c[0] - a[0]) / len];
  const pieces = Math.max(1, Math.ceil(len / SPAN));
  for (let k = 0; k < pieces; k++) {
    const t0 = k / pieces;
    const t1 = (k + 1) / pieces;
    const p: Pt = [a[0] + (c[0] - a[0]) * t0, a[1] + (c[1] - a[1]) * t0];
    const q: Pt = [a[0] + (c[0] - a[0]) * t1, a[1] + (c[1] - a[1]) * t1];
    const ua = u0 + (len * t0) / band.tw;
    const ub = u0 + (len * t1) / band.tw;
    for (let ya = y0; ya < y1 - 0.01; ya += band.th) {
      const yb = Math.min(y1, ya + band.th);
      const vb = band.v0 + ((yb - ya) / band.th) * band.vh;
      const g = new THREE.BufferGeometry();
      // (wound to face n: seen from outside, p is on the left of q)
      g.setAttribute('position', new THREE.Float32BufferAttribute([p[0], ya, p[1], q[0], ya, q[1], q[0], yb, q[1], p[0], yb, p[1]], 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute([n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1]], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([ua, band.v0, ub, band.v0, ub, vb, ua, vb], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      b.add(g, ATLAS.mat);
    }
  }
}
/** Every wall round an outline, the band continuing round the corners */
function walls(b: Batch, band: Band, line: Pt[], y0: number, y1: number, u0 = 0) {
  let u = u0;
  line.forEach((a, i) => {
    const c = line[(i + 1) % line.length];
    wall(b, band, a, c, y0, y1, u);
    u += Math.hypot(c[0] - a[0], c[1] - a[1]) / band.tw;
  });
}
/** A flat polygon at y facing up (a roof) */
function flat(b: Batch, line: Pt[], y: number, mat: THREE.Material) {
  const shape = new THREE.Shape(line.map(([x, z]) => new THREE.Vector2(x, -z)));
  b.add(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0), mat);
}
/** An outline shrunk towards its middle by d */
function shrink(line: Pt[], d: number): Pt[] {
  const cx = line.reduce((a, p) => a + p[0], 0) / line.length;
  const cz = line.reduce((a, p) => a + p[1], 0) / line.length;
  return line.map(([x, z]) => {
    const l = Math.hypot(x - cx, z - cz) || 1;
    return [x - ((x - cx) / l) * d, z - ((z - cz) / l) * d];
  });
}
/** A thin bar along an outline's edges at y (a parapet's cap, a lit band), `t` thick and `h` high */
function rim(b: Batch, line: Pt[], y: number, t: number, h: number, mat: THREE.Material) {
  line.forEach((a, i) => {
    const c = line[(i + 1) % line.length];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const g = new THREE.BoxGeometry(len + t, h, t)
      .rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]))
      .translate((a[0] + c[0]) / 2, y + h / 2, (a[1] + c[1]) / 2);
    b.add(g, mat);
  });
}

/* ---------- The towers ---------- */

const ROOF = toon('#3a3550');
const PARAPET = toon('#5a5478');
const GOLD = toon('#b8892e');
const STEEL = toon('#8f93ad');
const DARK = toon('#1b1830');
const CANOPY = toon('#2a2740');
/** Lit trims: a slab's band, a deco tower's gold edges, a drum's ring, the spire's lantern; warning lights at the tips */
const TRIM: Record<Skin, THREE.Material> = {
  blue: neon('#5fd4ff', 0.15, 2.4),
  gold: neon('#ffd27a', 0.15, 2.4),
  black: neon('#ff4fd8', 0.15, 2.4),
  silver: neon('#b4a8ff', 0.15, 2.4),
  stone: neon('#ffd27a', 0.15, 2.4),
};
const WARNING = neon('#ff2a2a', 0.3, 2.4);

/** A tower: its parts' walls and roofs, its crown, its mast and light, its lobby */
function tower(b: Batch, t: Highrise, low: boolean) {
  const skinOf = (p: Part) => (p.skin === 'podium' ? ATLAS.lobby : ATLAS.skin[p.skin]);
  const trim = TRIM[t.skin];
  b.detail(() => {
    t.parts.forEach((p, i) => {
      const line = outline(p, low ? 14 : SIDES);
      walls(b, skinOf(p), line, SLAB + p.y0, SLAB + p.y1, i * 0.37);
      // The roof tucked just under the parapet's cap, the parapet round it
      flat(b, shrink(line, 0.006), SLAB + p.y1 - 0.02, ROOF);
      // (its outer face a centimetre proud of the wall under it: never flush)
      rim(b, shrink(line, 0.07), SLAB + p.y1 - 0.02, 0.16, 0.3, PARAPET);
    });
    const top = t.parts.filter((p) => p.y1 === t.roof).at(-1)!;
    const [x0, z0, x1, z1] = top.rect;
    const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    const R = SLAB + t.roof;
    const shafts = t.parts.filter((p) => p.skin !== 'podium');
    if (t.design === 'slab') {
      // A lit band round the shaft's top, under the plant room
      const shaft = shafts[0];
      rim(b, shrink(outline(shaft), -0.03), SLAB + shaft.y1 - 0.5, 0.08, 0.08, trim);
    }
    if (t.design === 'deco') {
      // Gold edges at each setback, a gold pyramid and a finial
      for (const p of shafts) rim(b, shrink(outline(p), -0.03), SLAB + p.y1 - 0.42, 0.08, 0.08, trim);
      const half = Math.min(x1 - x0, z1 - z0) / 2;
      b.add(new THREE.ConeGeometry(half * Math.SQRT2 * 0.92, 4.4, 4, 1).rotateY(Math.PI / 4).scale((x1 - x0) / (2 * half), 1, (z1 - z0) / (2 * half)).translate(cx, R + 2.2 + 0.28, cz), GOLD);
    }
    if (t.design === 'round') {
      // A neon ring round the top and a low cap
      const r = (x1 - x0) / 2;
      b.add(new THREE.TorusGeometry(r + 0.05, 0.06, 4, low ? 14 : SIDES).rotateX(Math.PI / 2).translate(cx, R - 0.5, cz), trim);
      b.add(new THREE.ConeGeometry(r * 0.75, 1.2, low ? 14 : SIDES, 1).translate(cx, R + 0.6 + 0.28, cz), STEEL);
    }
    if (t.design === 'twin' && t.bridge) {
      // The skybridge: dark glass, a lit strip along its underside
      const { rect, y0, y1 } = t.bridge;
      b.box(rect[0], SLAB + y0, rect[1], rect[2] - rect[0], y1 - y0, rect[3] - rect[1], DARK);
      const long = rect[2] - rect[0] > rect[3] - rect[1];
      if (long) b.box(rect[0], SLAB + y0 - 0.06, (rect[1] + rect[3]) / 2 - 0.05, rect[2] - rect[0], 0.06, 0.1, trim);
      else b.box((rect[0] + rect[2]) / 2 - 0.05, SLAB + y0 - 0.06, rect[1], 0.1, 0.06, rect[3] - rect[1], trim);
      for (const s of shafts) rim(b, shrink(outline(s), -0.03), SLAB + s.y1 - 0.5, 0.08, 0.08, trim);
    }
    if (t.design === 'spire') {
      // A glass lantern on the top tier, lit edges up it, then the mast
      const s = Math.min(x1 - x0, z1 - z0);
      b.add(new THREE.CylinderGeometry(s * 0.18, s * 0.42, 3.2, 8, 1, true).rotateY(Math.PI / 8).translate(cx, R + 1.6 + 0.28, cz), STEEL);
      rim(b, shrink(outline(top), -0.03), R - 0.45, 0.08, 0.08, trim);
      for (const p of shafts) rim(b, shrink(outline(p), -0.03), SLAB + p.y1 - 0.45, 0.08, 0.08, trim);
    }
    // The mast to the tip, a red light at its top
    const mastFrom = t.design === 'deco' ? R + 4.5 : t.design === 'spire' ? R + 3.3 : R + 0.28;
    const tip = SLAB + t.tip;
    b.add(new THREE.CylinderGeometry(0.06, 0.14, tip - mastFrom, 6, 1, true).translate(cx, (mastFrom + tip) / 2, cz), STEEL);
    b.add(new THREE.OctahedronGeometry(0.16, 0).translate(cx, tip + 0.08, cz), WARNING);
  }, 'all');

  // The lobby: a canopy over the door (at every distance), the revolving door near
  const pod = t.parts[0];
  const [dx, dz] = t.door;
  const across = t.front === 'n' || t.front === 's';
  const face = t.front === 'n' ? pod.rect[1] : t.front === 's' ? pod.rect[3] : t.front === 'w' ? pod.rect[0] : pod.rect[2];
  const out = t.front === 'n' || t.front === 'w' ? -1 : 1;
  b.detail(() => {
    if (across) b.box(dx - 2.2, SLAB + 2.55, Math.min(face, face + out * 1.6), 4.4, 0.16, 1.6, CANOPY);
    else b.box(Math.min(face, face + out * 1.6), SLAB + 2.55, dz - 2.2, 1.6, 0.16, 4.4, CANOPY);
    if (across) b.box(dx - 2.2, SLAB + 2.52, face + out * 1.6 - 0.03, 4.4, 0.04, 0.06, TRIM[t.skin]);
    else b.box(face + out * 1.6 - 0.03, SLAB + 2.52, dz - 2.2, 0.06, 0.04, 4.4, TRIM[t.skin]);
  }, 'all');
  b.detail(() => {
    const [rx, rz] = across ? [dx, face + out * 0.62] : [face + out * 0.62, dz];
    b.add(new THREE.CylinderGeometry(0.62, 0.62, 2.1, 12, 1, true).translate(rx, SLAB + 1.05, rz), toon('#7b8fc4'));
    b.add(new THREE.CylinderGeometry(0.68, 0.68, 0.12, 12).translate(rx, SLAB + 2.16, rz), GOLD);
    if (low) return;
    // Plant on the roofs: a few boxes on the podium's roof round the shaft
    if (t.design !== 'spire') {
      const r = rng(t.id.charCodeAt(0) * 31 + t.id.charCodeAt(1));
      const [px0, pz0, px1, pz1] = pod.rect;
      const shaftsR = t.parts.slice(1).map((p) => p.rect);
      for (let k = 0; k < 6; k++) {
        const x = px0 + 0.8 + r() * (px1 - px0 - 1.6);
        const z = pz0 + 0.8 + r() * (pz1 - pz0 - 1.6);
        if (shaftsR.some((q) => x > q[0] - 1.2 && x < q[2] + 1.2 && z > q[1] - 1.2 && z < q[3] + 1.2)) continue;
        b.box(x - 0.5, SLAB + PODIUM.h, z - 0.4, 1.0, 0.6, 0.8, STEEL);
      }
    }
  });
}

/** Each tower a site (its lot) */
export function registerHighrises(low: boolean) {
  for (const t of HIGHRISES) {
    const [x0, z0, x1, z1]: Rect = t.lot;
    site(`uptown tower ${t.id}`, [x0 - 1, z0 - 1, x1 + 1, z1 + 1], (into) => {
      const b = new Batch();
      tower(b, t, low);
      b.build(into, { cast: true, receive: true });
    });
  }
}
