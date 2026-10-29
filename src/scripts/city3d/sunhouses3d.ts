/*
 * Sunridge's houses drawn (docs/suburb-plan.md Phase 2; the data is sunhouses.ts), a site a house in Sunridge's chunk
 * (sunridge3d.ts): stucco walls on a low foundation, hipped roofs of concrete tile (one tiled texture a colour, laid on
 * by the slope), the soffits under the eaves; windows in foam surrounds, about half of them lit at night; the garage's
 * panelled door with coach lamps either side; the front door (in an arched recess, behind a stone wainscot, or in an
 * entry tower with a window over it); a two-storey's band at the floor line, a porch's roof on posts; the driveway and
 * the walk; solar panels on some back slopes, a chimney on a few; near only: the side and back windows, the fascias,
 * the coach lamps, the air conditioner in the side yard. Each house in its lot's frame (local x along the street,
 * z out to it, y up from the lot: a turn, never a mirror).
 */
import * as THREE from 'three';
import { Batch, canvasTex, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { SLAB } from './world';
import { tris } from './roofs3d';
import { addSolids } from './solids';
import { LOTS } from './sunridgelots';
import { EAVE, FLOOR, GARAGE, HOUSES, HOUSE_SOLIDS, PITCH, ROOFS, SCHEMES, STOREY, doorW, roofRise, type House, type Part } from './sunhouses';

const WALLS = SCHEMES.map((s) => toon(s.wall));
const TRIMS = SCHEMES.map((s) => toon(s.trim));
const BASE = toon('#8d8577');
const STONE = toon('#a08c72');
const STONE_DARK = toon('#857259');
const DOOR = toon('#5a3a25');
const RECESS = toon('#7d6a55');
const CONCRETE = toon('#c8c0b0');
const SOLAR = toon('#1d2740');
const SOLAR_FRAME = toon('#9aa3b0');
const METAL = toon('#3a3a3e');
const AC = toon('#c9cbc8');
const LAMP = neon('#ffd9a0', 0.25, 1.6);

/** Window glass: about half lit from inside at night, the rest dark */
export const GLASS_LIT = siteMat('sun-glass-lit', lit(toon('#34465a', { emissive: '#ffd49a' }), 0, 0.85));
export const GLASS = siteMat('sun-glass', toon('#2f3e50'));

/** The roofs' concrete tile: rows of S-tiles, a texture a colour, tiled (`TILE` tiles a repeat) */
const TILE = 1.25;
const ROOF_COLOURS: Record<(typeof ROOFS)[number], [string, string, string]> = {
  terracotta: ['#b45a3c', '#8e4229', '#cf7a56'],
  brown: ['#7b5a45', '#5e4232', '#94735c'],
  slate: ['#6d6a66', '#53514e', '#87847f'],
};
export const ROOF_MATS = ROOFS.map((r) => {
  const [base, dark, light] = ROOF_COLOURS[r];
  const map = canvasTex(256, 256, (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, 256, 256);
    // Eight rows of S-tiles, each row's barrels in light and dark, its lower edge a shadow
    for (let row = 0; row < 8; row++) {
      const y = row * 32;
      for (let k = 0; k < 8; k++) {
        const x = k * 32 + (row % 2) * 16;
        const g = c.createLinearGradient(x, 0, x + 32, 0);
        g.addColorStop(0, dark);
        g.addColorStop(0.45, light);
        g.addColorStop(1, dark);
        c.fillStyle = g;
        c.fillRect(x, y, 32, 28);
        c.fillRect(x - 256, y, 32, 28);
      }
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.fillRect(0, y + 27, 256, 5);
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return siteMat(`sun-roof-${r}`, toon('#ffffff', { map }));
});

/** The garage door: sectional panels in a pale finish */
const GARAGE_DOOR = siteMat(
  'sun-garage-door',
  toon('#ffffff', {
    map: canvasTex(256, 128, (c) => {
      c.fillStyle = '#e6dcc8';
      c.fillRect(0, 0, 256, 128);
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 8; k++) {
          const [x, y] = [6 + k * 31, 6 + r * 30];
          c.fillStyle = '#d3c7b0';
          c.fillRect(x, y, 27, 25);
          c.fillStyle = '#f0e8d8';
          c.fillRect(x + 2, y + 2, 23, 3);
        }
      c.fillStyle = 'rgba(0,0,0,0.18)';
      for (let r = 1; r < 4; r++) c.fillRect(0, r * 30 + 2, 256, 2);
    }),
  }),
);

/** The frame a house is drawn in: local x along the street, z out to it (-v), y up from the lot's top */
function frameOf(h: House) {
  return new THREE.Matrix4().set(h.u[0], 0, -h.v[0], h.o[0], 0, 1, 0, SLAB, h.u[1], 0, -h.v[1], h.o[1], 0, 0, 0, 1);
}

/** A cheap hash of a few numbers, 0-1 (which windows are lit) */
const hash = (...n: number[]) => {
  let x = 0;
  for (const v of n) x = Math.sin(x * 12.9898 + v * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** A hipped roof over a part with its tiles laid on (uv rows along the eaves), and its soffit */
export function roofOf(p: Part) {
  const [x0, x1, z0, z1] = [p.u0 - EAVE, p.u1 + EAVE, -p.v1 - EAVE, -p.v0 + EAVE];
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  const [w, d] = [x1 - x0, z1 - z0];
  const h = roofRise(p);
  const ridge = Math.abs(w - d) / 2;
  const [y, top] = [p.top, p.top + h];
  type V3 = [number, number, number];
  const [r0, r1]: V3[] =
    w >= d
      ? [
          [cx - ridge, top, cz],
          [cx + ridge, top, cz],
        ]
      : [
          [cx, top, cz - ridge],
          [cx, top, cz + ridge],
        ];
  const c: V3[] = [
    [x0, y, z0],
    [x1, y, z0],
    [x1, y, z1],
    [x0, y, z1],
  ];
  const list: V3[][] =
    w >= d
      ? [
          [c[0], c[1], r1],
          [c[0], r1, r0],
          [c[3], c[2], r1],
          [c[3], r1, r0],
          [c[0], c[3], r0],
          [c[1], c[2], r1],
        ]
      : [
          [c[0], c[3], r1],
          [c[0], r1, r0],
          [c[1], c[2], r1],
          [c[1], r1, r0],
          [c[0], c[1], r0],
          [c[3], c[2], r1],
        ];
  const g = tris(list, [cx, y + h * 0.2, cz]);
  // The tiles' rows run along each slope's eave: across the slope by x (or z on the hips), up it by the height
  const pos = g.getAttribute('position');
  const nrm = g.getAttribute('normal');
  const uv: number[] = [];
  const up = Math.hypot(1, 1 / PITCH);
  for (let i = 0; i < pos.count; i += 3) {
    const along = Math.abs(nrm.getZ(i)) >= Math.abs(nrm.getX(i)) ? 0 : 2;
    for (let k = 0; k < 3; k++) uv.push((along === 0 ? pos.getX(i + k) : pos.getZ(i + k)) / TILE, ((pos.getY(i + k) - y) * up) / TILE);
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const soffit = new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2).translate(cx, y - 0.005, cz);
  return { roof: g, soffit, h, x0, x1, z0, z1, cx, cz, ridge, along: w >= d };
}

function drawHouse(b: Batch, h: House, low: boolean) {
  const M = frameOf(h);
  const wall = WALLS[h.scheme];
  const trim = TRIMS[h.scheme];
  const add = (g: THREE.BufferGeometry, m: THREE.Material) => b.add(g.applyMatrix4(M), m);
  const box = (u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, m: THREE.Material) =>
    add(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0).translate((u0 + u1) / 2, (y0 + y1) / 2, -(v0 + v1) / 2), m);
  /** A flat thing on the lot, a little over its ground (a driveway, a walk) */
  const flat = (u0: number, u1: number, v0: number, v1: number, y: number, m: THREE.Material) =>
    add(new THREE.PlaneGeometry(u1 - u0, v1 - v0).rotateX(-Math.PI / 2).translate((u0 + u1) / 2, y, -(v0 + v1) / 2), m);
  /** A flat thing on a face: facing the street (front), away (back) or to a side, its middle at (u, v) on the face */
  const plate = (face: 'front' | 'back' | 'left' | 'right', u: number, v: number, w: number, y0: number, hh: number, m: THREE.Material, off = 0.012) => {
    const g = new THREE.PlaneGeometry(w, hh).translate(0, y0 + hh / 2, 0);
    if (face === 'front') g.translate(u, 0, -v + off);
    else if (face === 'back') g.rotateY(Math.PI).translate(u, 0, -v - off);
    else if (face === 'left') g.rotateY(-Math.PI / 2).translate(u - off, 0, -v);
    else g.rotateY(Math.PI / 2).translate(u + off, 0, -v);
    add(g, m);
  };
  /** A window in its foam surround, lit or not, with a sill */
  const win = (face: 'front' | 'back' | 'left' | 'right', u: number, v: number, w: number, y0: number, hh: number) => {
    const glass = hash(u, v, y0, h.o[0]) < 0.5 ? GLASS_LIT : GLASS;
    plate(face, u, v, w + 0.16, y0 - 0.08, hh + 0.16, trim, 0.02);
    plate(face, u, v, w, y0, hh, glass, 0.03);
    // (its glazing split down the middle: a slider)
    plate(face, u, v, 0.05, y0, hh, trim, 0.036);
  };
  const s = h.mirror ? -1 : 1;
  const main = h.parts.find((p) => p.kind === 'main')!;
  const garage = h.parts.find((p) => p.kind === 'garage')!;
  const tower = h.parts.find((p) => p.kind === 'tower');
  const wing = h.parts.find((p) => p.kind === 'wing');
  const two = main.storeys === 2;
  // The rooms' side of the front (off the garage)
  const [ru0, ru1] = s < 0 ? [garage.u1, main.u1] : [main.u0, garage.u0];

  // Walls on a low foundation, each part a box; the garage's slab level with the driveway
  for (const p of h.parts) {
    if (p.kind !== 'garage') box(p.u0 - 0.04, p.u1 + 0.04, p.v0 - 0.04, p.v1 + 0.04, 0, FLOOR, BASE);
    box(p.u0, p.u1, p.v0, p.v1, p.kind === 'garage' ? 0 : FLOOR - 0.01, p.top, wall);
  }
  // A two-storey's band at the floor line
  if (two) {
    const y = FLOOR + STOREY;
    box(main.u0 - 0.04, main.u1 + 0.04, main.v0 - 0.04, main.v1 + 0.04, y - 0.06, y + 0.06, trim);
  }
  // The roofs, their soffits; near only, the fascias round their eaves
  for (const p of h.parts) {
    const r = roofOf(p);
    add(r.roof, ROOF_MATS[h.roof]);
    add(r.soffit, trim);
    b.detail(() => {
      const t = 0.09;
      // (just in under the eave's edge and a little below it: never in the plane of the roof's own edge)
      for (const [a0, a1, b0, b1] of [
        [r.x0, r.x1, r.z1 - t, r.z1],
        [r.x0, r.x1, r.z0, r.z0 + t],
        [r.x0, r.x0 + t, r.z0, r.z1],
        [r.x1 - t, r.x1, r.z0, r.z1],
      ])
        add(new THREE.BoxGeometry(a1 - a0, 0.115, b1 - b0).translate((a0 + a1) / 2, p.top - 0.0725, (b0 + b1) / 2), trim);
    });
  }

  // The garage's door, its trim, and the coach lamps either side
  {
    const w = doorW(garage.u1 - garage.u0);
    const g = new THREE.PlaneGeometry(w, GARAGE.door.h).translate(h.garageDoor.u, GARAGE.door.h / 2, -h.garageDoor.v + 0.014);
    add(g, GARAGE_DOOR);
    plate('front', h.garageDoor.u, h.garageDoor.v, w + 0.18, 0, GARAGE.door.h + 0.1, trim, 0.008);
    b.detail(() => {
      for (const k of [-1, 1]) {
        const x = h.garageDoor.u + k * (w / 2 + 0.22);
        if (x < garage.u0 + 0.08 || x > garage.u1 - 0.08) continue;
        box(x - 0.06, x + 0.06, h.garageDoor.v - 0.08, h.garageDoor.v, 0.95, 1.18, METAL);
        box(x - 0.04, x + 0.04, h.garageDoor.v - 0.075, h.garageDoor.v - 0.005, 1.0, 1.12, LAMP);
      }
    });
  }

  // The front door, by elevation
  {
    const { u, v } = h.door;
    const doorH = 1.12;
    if (h.elevation === 'arch') {
      // An arched recess round the door, a shade darker than the render
      const shape = new THREE.Shape();
      const [w, hh] = [1.05, 1.45];
      shape.moveTo(-w / 2, 0);
      shape.lineTo(w / 2, 0);
      shape.lineTo(w / 2, hh - w / 2);
      shape.absarc(0, hh - w / 2, w / 2, 0, Math.PI, false);
      shape.lineTo(-w / 2, 0);
      add(new THREE.ShapeGeometry(shape, 10).translate(u, FLOOR, -v + 0.01), RECESS);
    }
    if (h.elevation === 'stone') {
      // A stone wainscot across the rooms' front and the garage's, below the windows
      box(ru0 - 0.04, ru1 + 0.04, main.v0 - 0.05, main.v0 + 0.02, FLOOR, 0.6, STONE);
      box(garage.u0 - 0.04, garage.u1 + 0.04, garage.v0 - 0.05, garage.v0 + 0.02, 0, 0.32, STONE);
      if (wing) box(wing.u0 - 0.04, wing.u1 + 0.04, wing.v0 - 0.05, wing.v0 + 0.02, FLOOR, 0.6, STONE);
      // (a stone pier at the garage's outer corner)
      const cu = s < 0 ? garage.u0 : garage.u1;
      box(cu - 0.16 * (s < 0 ? 0 : 1) - 0.02, cu + 0.16 * (s < 0 ? 1 : 0) + 0.02, garage.v0 - 0.06, garage.v0 + 0.3, 0, GARAGE.door.h + 0.25, STONE_DARK);
    }
    plate('front', u, v, 0.6, FLOOR, doorH, DOOR, 0.02);
    // A window over the door: a transom, or a tall one up the tower
    if (tower && two) win('front', u, v, 0.55, FLOOR + STOREY + 0.35, 0.95);
    else plate('front', u, v, 0.6, FLOOR + doorH + 0.06, 0.22, hash(u, v) < 0.5 ? GLASS_LIT : GLASS, 0.02);
    // A step, a lamp by the door
    box(u - 0.45, u + 0.45, v - 0.35, v, 0, FLOOR, CONCRETE);
    b.detail(() => {
      const x = u + 0.45;
      box(x - 0.05, x + 0.05, v - 0.07, v, 1.0, 1.16, METAL);
      box(x - 0.03, x + 0.03, v - 0.065, v - 0.005, 1.03, 1.12, LAMP);
    });
  }

  // The windows facing the street: the rooms' side of the main front (or the wing's), and upstairs across it
  const sill = FLOOR + 0.62;
  const front = (p: Part, u0: number, u1: number, y: number, skipU?: number) => {
    const w = u1 - u0;
    const n = w > 3.4 ? 2 : w > 1.4 ? 1 : 0;
    for (let k = 0; k < n; k++) {
      const u = u0 + (w * (k + 0.5)) / n;
      if (skipU !== undefined && Math.abs(u - skipU) < 0.9) continue;
      win('front', u, p.v0, Math.min(1.25, w / n - 0.4), y, 0.85);
    }
  };
  if (wing) front(wing, wing.u0 + 0.2, wing.u1 - 0.2, sill);
  if (h.plan !== 'ell' || !two) {
    const [a, c] = wing ? (s < 0 ? [ru0, wing.u0] : [wing.u1, ru1]) : [ru0, ru1];
    front(main, a + 0.15, c - 0.15, sill, h.door.u);
  }
  if (two) {
    const w = main.u1 - main.u0;
    const n = w > 4.6 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const u = main.u0 + (w * (k + 0.5)) / n;
      if (tower && Math.abs(u - h.door.u) < 1) continue;
      win('front', u, main.v0, 1.0, FLOOR + STOREY + 0.5, 0.8);
    }
  }
  // The L's garage wing: a window on its side facing the entry court
  if (h.plan === 'ell') win(s < 0 ? 'right' : 'left', s < 0 ? garage.u1 : garage.u0, (garage.v0 + garage.v1) / 2 + 0.3, 0.9, sill, 0.8);

  // Near only: the side and back windows, a slider onto the back yard
  b.detail(() => {
    for (let f = 0; f < main.storeys; f++) {
      const y = f === 0 ? sill : FLOOR + STOREY + 0.5;
      for (const side of ['left', 'right'] as const) {
        const u = side === 'left' ? main.u0 : main.u1;
        if ((side === 'left') === s < 0 && f === 0 && garage.v1 > main.v0 + 1) continue;
        win(side, u, main.v0 + (main.v1 - main.v0) * 0.6, 0.85, y, 0.75);
      }
      const n = main.u1 - main.u0 > 4.5 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const u = main.u0 + ((main.u1 - main.u0) * (k + 0.5)) / n;
        if (f === 0 && k === 0) plate('back', u, main.v1, 1.6, FLOOR, 1.3, hash(u, 7) < 0.5 ? GLASS_LIT : GLASS, 0.02);
        else win('back', u, main.v1, 1.0, y, 0.8);
      }
    }
    // The air conditioner in the side yard off the rooms (not on phones)
    if (low) return;
    const au = s < 0 ? main.u1 + 0.26 : main.u0 - 0.26;
    box(au - 0.22, au + 0.22, main.v1 - 1.6, main.v1 - 1.1, 0, 0.42, AC);
  });

  // A porch across the rooms' front: its roof on posts
  if (h.porch) {
    const [u0, u1, d] = h.porch;
    const v0 = main.v0 - d;
    const y = FLOOR + STOREY - 0.1;
    box(u0, u1, v0, main.v0, y, y + 0.14, trim);
    box(u0 - 0.04, u1 + 0.04, v0 - 0.04, main.v0, y + 0.14, y + 0.2, ROOF_MATS[h.roof]);
    for (const u of [u0 + 0.12, (u0 + u1) / 2, u1 - 0.12]) box(u - 0.09, u + 0.09, v0 + 0.03, v0 + 0.21, FLOOR, y, trim);
    box(u0, u1, v0, main.v0, 0, FLOOR, CONCRETE);
  }

  // Solar panels on the main roof's back slope (along x only), a chimney on a few
  const r = roofOf(main);
  if (h.solar && r.along && r.ridge > 0.6) {
    const zb = r.z0;
    const yAt = (z: number) => main.top + (r.h * (z - zb)) / (r.cz - zb);
    const [za, zc] = [zb + 0.45, r.cz - 0.35];
    const [xa, xc] = [r.cx - r.ridge * 0.9, r.cx + r.ridge * 0.9];
    const lift = 0.035;
    const pos = [xa, yAt(za) + lift, za, xc, yAt(za) + lift, za, xc, yAt(zc) + lift, zc, xa, yAt(za) + lift, za, xc, yAt(zc) + lift, zc, xa, yAt(zc) + lift, zc];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    // (faced up: the winding above faces whichever way; flip it if it faces down)
    if (g.getAttribute('normal').getY(0) < 0) {
      const p = g.getAttribute('position');
      for (let i = 0; i < p.count; i += 3) {
        const [x, y, z] = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)];
        p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
        p.setXYZ(i + 2, x, y, z);
      }
      g.computeVertexNormals();
    }
    add(g, SOLAR);
    if (!low)
      b.detail(() => {
        // (the frames between the panels)
        for (let x = xa; x <= xc + 1e-6; x += (xc - xa) / Math.max(1, Math.round((xc - xa) / 0.9)))
          add(new THREE.BoxGeometry(0.035, 0.02, zc - za).rotateX(-Math.atan2(r.h, r.cz - zb)).translate(x, (yAt(za) + yAt(zc)) / 2 + lift + 0.01, (za + zc) / 2), SOLAR_FRAME);
      });
  }
  if (h.chimney) {
    const cu = s < 0 ? main.u1 - 0.7 : main.u0 + 0.7;
    const cv = main.v1 - 1.2;
    box(cu - 0.3, cu + 0.3, cv - 0.3, cv + 0.3, main.top - 0.2, main.top + roofRise(main) * 0.75 + 0.35, wall);
    box(cu - 0.36, cu + 0.36, cv - 0.36, cv + 0.36, main.top + roofRise(main) * 0.75 + 0.35, main.top + roofRise(main) * 0.75 + 0.45, trim);
  }

  // The driveway out to the sidewalk, the walk from the door to it
  const [d0, d1] = h.drive;
  flat(d0, d1, 0, h.garageDoor.v, 0.012, CONCRETE);
  const [, , wv0, wv1] = h.walk;
  flat(h.door.u - 0.35, h.door.u + 0.35, wv0, wv1 - 0.35, 0.018, CONCRETE);
  const toDrive = h.door.u < (d0 + d1) / 2 ? [h.door.u, d0] : [d1, h.door.u];
  if (toDrive[1] - toDrive[0] > 0.05) flat(toDrive[0], toDrive[1], wv0, wv0 + 0.7, 0.018, CONCRETE);
}

export function registerHouses(low: boolean, scene: THREE.Scene | null) {
  const lots = new Map(LOTS.map((l) => [l.id, l]));
  for (const h of HOUSES) {
    const l = lots.get(h.lot)!;
    const pts = [...l.front, ...l.back];
    const rect: [number, number, number, number] = [
      Math.min(...pts.map((p) => p[0])) - 1,
      Math.min(...pts.map((p) => p[1])) - 1,
      Math.max(...pts.map((p) => p[0])) + 1,
      Math.max(...pts.map((p) => p[1])) + 1,
    ];
    site(`sunridge ${h.id}`, rect, (into) => {
      const b = new Batch();
      drawHouse(b, h, low);
      b.build(into, { cast: true, receive: true });
    });
  }
  // (on the main thread: the houses join the grids, so walking, driving and shots meet them)
  if (scene) addSolids(HOUSE_SOLIDS);
}
