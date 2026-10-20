/*
 * Makers' Row: the four units north of the market square (UNITS in
 * layout.ts), drawn from your save. A unit you don't own has a TO LET board;
 * one you own but haven't built on has cones and a YOUR UNIT board; then:
 *
 * - a garden: three raised beds of its crop (sugar cane, coffee bushes with
 *   red cherries, cotton with white bolls) that fill out as its bins fill,
 *   and a tool shed with crates of the harvest;
 * - a shop: a little flat-roofed shopfront with a striped awning, a lit
 *   window showing crates of what it sells, and its sign;
 * - a warehouse: a corrugated shed with a roller door and pallets of crates
 *   outside, more as it fills.
 *
 * Each built unit has a level (1-3, the save's `levels`; Phase 5) and shows
 * it: a garden gains a fourth bed and drip irrigation at level 2, then a
 * glasshouse in the tool shed's place and string lights; a shop a second
 * storey with neon trim, then a corner tower, a lit roof sign and planters;
 * a warehouse a taller shed with a second roller door, then a dock canopy,
 * a forklift in its open bay and solar panels on the roof. A plaque by the
 * door shows its stars, and the level's capacity (capOf(), capacityMul())
 * sets how full it looks. Every piece stays inside the unit's footprint
 * (UNIT_SHAPES), overhead, or under knee height on the open ground, so the
 * footprints never change with the level.
 *
 * People-scale like the rest of the city: Degen is about a tile tall, doors
 * about 1.25. A unit is drawn in its own numbers (u across its front, v back
 * from it; UNIT_SITE in solids.ts), and rebuilt only when what it shows
 * changes (its level included). Its footprints (for walking and driving)
 * are unitSolids(). One Batch per unit; the materials are shared from the
 * module scope, so a unit stays a handful of draw calls.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, lit, neon, occlude, place, plane, toon } from './kit';
import { UNITS, BS } from './layout';
import { UNIT_SITE, UNIT_SIZE, unitSolids, type Box } from './solids';
import { SLAB as S, addLamp } from './world';
import { SHOP, UNIT_PLACES, capOf, capacityMul, good, placeLevel, total, type TycoonSave, type Unit } from './tycoon';

const ink = toon('#1b1830');
const wood = toon('#8a5a35');
const woodDark = toon('#5a3a22');
const soil = toon('#4a3020');
const cone = toon('#ff8a3d');
const white = toon('#f3f2f7');
const crate = toon('#a8743f');
const cane = toon('#9bbf4a');
const pipe = toon('#5c6b7a');
const steel = toon('#9aa0b0');
const concrete = toon('#4a4560');
const greenery = toon('#2f7a3a');
const forkYellow = toon('#ffd23f');
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const bush = new THREE.IcosahedronGeometry(1, 1);
const berry = new THREE.IcosahedronGeometry(0.055, 0);
const bulbGeo = new THREE.SphereGeometry(0.035, 6, 4);
/** Warm bulbs (string lights, lamps under a canopy): neon folds into a Batch's shared material */
const bulb = neon(PAL.warm, 0.4, 2.6);
/** Neon trim in a shop's colour, one material a colour */
const neons = new Map<string, THREE.Material>();
const neonFor = (c: string) => {
  if (!neons.has(c)) neons.set(c, neon(c, 0.9, 2.2));
  return neons.get(c)!;
};
/** Solar panels (a warehouse's and a factory's roof): dark cells under a light grid */
export const solarMat = new THREE.MeshToonMaterial({
  map: canvasTex(64, 64, (c) => {
    c.fillStyle = '#1a2f5a';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#3a5a9a';
    for (let k = 0; k <= 64; k += 16) {
      c.fillRect(k - 1, 0, 2, 64);
      c.fillRect(0, k - 1, 64, 2);
    }
  }),
  color: '#ffffff',
});

/** Signs, made once per text and colour */
const boards = new Map<string, THREE.Texture>();
function board(text: string, color: string, sub = '') {
  const key = `${text}|${color}|${sub}`;
  if (!boards.has(key))
    boards.set(
      key,
      canvasTex(256, 96, (c) => {
        c.fillStyle = '#0b0a18';
        c.fillRect(0, 0, 256, 96);
        c.strokeStyle = color;
        c.lineWidth = 6;
        c.strokeRect(3, 3, 250, 90);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = color;
        c.font = `900 ${sub ? 40 : 46}px ${FONT_DISPLAY}`;
        c.fillText(text, 128, sub ? 38 : 50);
        if (sub) {
          c.font = `700 20px ${FONT_DISPLAY}`;
          c.fillStyle = '#f3f2f7';
          c.fillText(sub, 128, 74);
        }
      })
    );
  return boards.get(key)!;
}
/** The level plaque: one to three gold stars on a small dark board (fixed copy, no text), made once a level */
const plaques = new Map<number, THREE.Texture>();
export function starBoard(level: number) {
  if (!plaques.has(level))
    plaques.set(
      level,
      canvasTex(192, 64, (c) => {
        c.fillStyle = '#0b0a18';
        c.fillRect(0, 0, 192, 64);
        c.strokeStyle = PAL.gold;
        c.lineWidth = 4;
        c.strokeRect(2, 2, 188, 60);
        c.fillStyle = PAL.gold;
        const n = Math.max(1, Math.min(3, Math.round(level)));
        for (let k = 0; k < n; k++) {
          const cx = 96 + (k - (n - 1) / 2) * 48;
          c.beginPath();
          for (let i = 0; i < 10; i++) {
            const r = i % 2 ? 9 : 22;
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            c.lineTo(cx + Math.cos(a) * r, 32 + Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
        }
      })
    );
  return plaques.get(level)!;
}
const stripes = (color: string) =>
  canvasTex(128, 64, (c) => {
    for (let x = 0; x < 128; x += 32) {
      c.fillStyle = color;
      c.fillRect(x, 0, 16, 64);
      c.fillStyle = '#f3f2f7';
      c.fillRect(x + 16, 0, 16, 64);
    }
  });
const corrugated = canvasTex(128, 128, (c) => {
  c.fillStyle = '#7d8aa3';
  c.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 8) {
    c.fillStyle = '#66728a';
    c.fillRect(x, 0, 3, 128);
  }
});
const shutter = canvasTex(128, 128, (c) => {
  c.fillStyle = '#c9ccd6';
  c.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 10) {
    c.fillStyle = '#9aa0b0';
    c.fillRect(0, y, 128, 3);
  }
});
const shedMat = new THREE.MeshToonMaterial({ map: corrugated, color: '#ffffff' });
const shutterMat = new THREE.MeshToonMaterial({ map: shutter, color: '#ffffff' });
const awnings = new Map<string, THREE.Material>();
const awning = (c: string) => {
  if (!awnings.has(c)) awnings.set(c, new THREE.MeshToonMaterial({ map: stripes(c), side: THREE.DoubleSide }));
  return awnings.get(c)!;
};
const glass = lit(new THREE.MeshBasicMaterial({ color: '#2a5d8a' }), 0.55, 1.3);

/** What a unit shows (at its level, with the level's capacity): when this changes, it's rebuilt */
function look(u: Unit | null, lvl: number, cap: number) {
  if (!u) return 'let';
  if (!u.kind) return 'empty';
  if (u.kind === 'garden') return `garden|${lvl}|${u.crop}|${Math.ceil(((u.stock[u.crop] ?? 0) / cap) * 4)}`;
  if (u.kind === 'shop') return `shop|${lvl}|${u.slots.map((s) => `${s.good}:${Math.ceil((s.qty / cap) * 3)}`).join(',')}`;
  return `warehouse|${lvl}|${Math.ceil((total(u.stock) / cap) * 6)}`;
}

export function buildUnits(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = 'units';
  scene.add(root);
  const groups = UNIT_SITE.map(() => {
    const g = new THREE.Group();
    root.add(g);
    return g;
  });
  const shown: string[] = UNIT_SITE.map(() => '');
  let solids: Box[] = [];

  // The cross path between the four units, and lamps at the row's corners
  const b0 = new Batch();
  const path = toon('#4a4388');
  b0.box(UNITS.ox, S + 0.004, UNITS.oz + UNIT_SIZE, BS, 0.01, 0.8, path);
  b0.box(UNITS.ox + UNIT_SIZE, S + 0.004, UNITS.oz, 0.8, 0.01, BS, path);
  b0.build(root, { cast: false });
  addLamp(UNITS.ox + UNIT_SIZE + 0.4, UNITS.oz + 0.25, 0);
  addLamp(UNITS.ox + UNIT_SIZE + 0.4, UNITS.oz + BS - 0.25, Math.PI);

  /** Draw a unit at its level; `cap` is what it holds at that level (the shelves' per-good capacity for a shop) */
  function draw(i: number, u: Unit | null, lvl: number, cap: number) {
    const site = UNIT_SITE[i];
    const g = groups[i];
    for (const o of [...g.children]) {
      o.removeFromParent();
      o.traverse((m) => (m as THREE.Mesh).geometry?.dispose());
    }
    const b = new Batch();
    const F = site.facing;
    /** A box in the unit's own numbers: u across, y up, v back from the front */
    const box = (u0: number, y: number, v0: number, w: number, h: number, d: number, mat: THREE.Material) => {
      const [x, z] = site.at(u0, F < 0 ? v0 : v0 + d);
      b.box(x, S + y, z, w, h, d, mat);
    };
    /** A sign or panel facing the street, its centre at (u, y, v) */
    const face = (mesh: THREE.Mesh, u0: number, y: number, v0: number) => {
      const [x, z] = site.at(u0, v0);
      mesh.position.set(x, S + y, z);
      mesh.rotation.y = F < 0 ? Math.PI : 0;
      g.add(mesh);
      return mesh;
    };
    // (occlude(): the ink outlines of whatever is behind a sign stay off it)
    const sign = (text: string, color: string, sub: string, u0: number, y: number, v0: number, w = 1.5) => {
      const tex = board(text, color, sub);
      return face(fx(occlude(plane(w, w * 0.375, lit(new THREE.MeshBasicMaterial({ map: tex }), 0.95, 1.5)), tex)), u0, y, v0);
    };
    /** The unit's star plaque, its centre at (u, y, v) */
    const plaque = (u0: number, y: number, v0: number, w = 0.5) => {
      const tex = starBoard(lvl);
      return face(fx(occlude(plane(w, w / 3, lit(new THREE.MeshBasicMaterial({ map: tex }), 0.9, 1.4)), tex)), u0, y, v0);
    };
    /** A post-mounted board at the front */
    const postBoard = (text: string, color: string, sub: string) => {
      box(1.35, 0, 0.35, 0.07, 1.1, 0.07, ink);
      box(2.68, 0, 0.35, 0.07, 1.1, 0.07, ink);
      sign(text, color, sub, UNIT_SIZE / 2, 1.0, 0.37);
    };
    /** A sagging string of warm bulbs from one point to another (both in the unit's numbers) */
    const strand = (a: [number, number, number], c: [number, number, number], n = 10, sag = 0.12) => {
      const pts = Array.from({ length: n }, (_, k) => {
        const t = k / (n - 1);
        const [x, z] = site.at(a[0] + (c[0] - a[0]) * t, a[2] + (c[2] - a[2]) * t);
        return new THREE.Vector3(x, S + a[1] + (c[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, z);
      });
      b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.01, 4), ink);
      for (const p of pts) b.add(place(bulbGeo, p.x, p.y - 0.045, p.z), bulb);
    };

    if (!u) {
      // To let: a board, some weeds
      postBoard('TO LET', PAL.warm, `UNIT ${i + 1}`);
      for (let k = 0; k < 7; k++) box(0.5 + ((k * 1.37) % 3.2), 0, 1.2 + ((k * 0.91) % 2.5), 0.18, 0.12, 0.18, toon('#3f8f4a'));
    } else if (!u.kind) {
      postBoard('YOUR UNIT', PAL.cyan, 'BUILD IT IN YOUR BUSINESS CARD');
      for (const [cu, cv] of [[0.6, 1.4], [3.4, 1.4], [0.6, 3.4], [3.4, 3.4]]) {
        box(cu - 0.12, 0, cv - 0.12, 0.24, 0.05, 0.24, cone);
        box(cu - 0.07, 0.05, cv - 0.07, 0.14, 0.32, 0.14, cone);
        box(cu - 0.08, 0.2, cv - 0.08, 0.16, 0.06, 0.16, white);
      }
    } else if (u.kind === 'garden') {
      const fill = (u.stock[u.crop] ?? 0) / cap;
      const grow = 0.45 + 0.55 * Math.min(1, fill * 1.4 + 0.2);
      const leaf = toon(u.crop === 'sugar' ? '#5fbf3a' : u.crop === 'beans' ? '#2f7a3a' : '#4f8f45');
      const fruit = toon(u.crop === 'beans' ? '#e23b3b' : '#f7f7ff');
      // Three raised beds running back from the front, a path between; level 2 adds a short fourth
      // one in front of the shed, with drip irrigation along every bed (posts at knee height)
      const beds = lvl >= 2 ? [3.2, 3.2, 3.2, 1.7] : [3.2, 3.2, 3.2];
      beds.forEach((depth, k) => {
        const bu = 0.3 + k * 0.85;
        box(bu, 0, 0.5, 0.7, 0.24, depth, wood);
        box(bu + 0.05, 0.2, 0.55, 0.6, 0.05, depth - 0.1, soil);
        if (lvl >= 2) {
          for (const pv of [0.42, 0.53 + depth]) box(bu + 0.325, 0, pv, 0.05, 0.5, 0.05, pipe);
          box(bu + 0.33, 0.44, 0.42, 0.04, 0.04, depth + 0.16, pipe);
          box(bu + 0.3, 0.42, 0.38, 0.1, 0.08, 0.1, toon(PAL.cyan));
        }
        const plants = Math.floor((depth - 0.2) / 0.5);
        for (let n = 0; n < plants; n++) {
          const pu = bu + 0.35;
          const pv = 0.8 + n * 0.5;
          if (u.crop === 'sugar') {
            // Cane: tall jointed stalks with long leaves arching out
            for (const o of [-0.12, 0.12]) {
              const hgt = 0.8 * grow * (o < 0 ? 1 : 0.85);
              box(pu + o - 0.025, 0.25, pv - 0.025, 0.05, hgt, 0.05, cane);
              const [x, z] = site.at(pu + o, pv);
              for (const [f, side] of [[0.55, 1], [0.8, -1], [1, 1]] as const) {
                const ry = (o + f) * 4;
                b.add(place(unitBox, x + Math.cos(ry) * 0.1 * side, S + 0.25 + hgt * f, z - Math.sin(ry) * 0.1 * side, 0.26, 0.025, 0.06, 0, ry, side * 0.55), leaf);
              }
            }
          } else {
            // Round bushes, with red coffee cherries or white cotton bolls
            const h = 0.44 * grow;
            const [x, z] = site.at(pu, pv);
            b.add(place(bush, x, S + 0.25 + h / 2, z, 0.25, h / 2, 0.25, 0, n + k, 0), leaf);
            if (fill > 0.05)
              for (const [fu, fv, fy] of [[-0.17, -0.06, 0.65], [0.13, 0.13, 0.75], [0.03, -0.18, 0.5], [0.08, 0.02, 0.98]]) {
                const [fx2, fz] = site.at(pu + fu, pv + fv);
                b.add(place(berry, fx2, S + 0.25 + h * fy, fz, 1, 1, 1), fruit);
              }
          }
        }
      });
      if (lvl >= 2) box(0.08, 0, 0.28, 0.08, 0.5, 0.08, pipe); // the standpipe the drip lines run from
      if (lvl >= 3) {
        // Level 3: a glasshouse in the tool shed's place (its footprint): lit glass on a timber base
        // under a pitched glass roof, and string lights from its ridge to the sign posts
        box(2.8, 0, 2.9, 1.05, 0.3, 0.95, woodDark);
        box(2.83, 0.3, 2.93, 0.99, 0.8, 0.89, glass);
        for (const [gu, gv] of [[2.8, 2.9], [3.8, 2.9], [2.8, 3.8], [3.8, 3.8]]) box(gu, 0.3, gv, 0.05, 0.82, 0.05, ink);
        box(3.3, 0.3, 2.9, 0.04, 0.82, 0.03, ink);
        const [gx, gz] = site.at(3.325, 3.375);
        for (const side of [-1, 1]) b.add(place(unitBox, gx, S + 1.27, gz + side * 0.25, 1.15, 0.03, 0.62, side * 0.55), glass);
        box(2.78, 1.38, 3.35, 1.1, 0.06, 0.06, ink);
        strand([3.3, 1.42, 3.37], [1.385, 1.1, 0.385]);
        strand([3.3, 1.42, 3.37], [2.715, 1.1, 0.385]);
      } else {
        // The tool shed at the back
        box(2.8, 0, 2.9, 1.05, 1.35, 0.95, woodDark);
        box(2.75, 1.35, 2.85, 1.15, 0.1, 1.05, ink);
        box(3.1, 0, 2.88, 0.45, 1.05, 0.03, wood);
      }
      // Crates of the harvest beside it
      const crates = Math.round(fill * 4);
      for (let k = 0; k < crates; k++) box(2.85 + (k % 2) * 0.45, Math.floor(k / 2) * 0.32, 2.35, 0.4, 0.3, 0.4, toon(good(u.crop).color));
      postBoard(good(u.crop).name.toUpperCase(), '#5fbf3a', 'GARDEN');
      plaque(UNIT_SIZE / 2, 0.6, 0.37);
    } else if (u.kind === 'shop') {
      const top = u.slots[0] ? good(u.slots[0].good) : null;
      const color = top?.color ?? PAL.cyan;
      const wall = toon('#3a3550');
      const trim = neonFor(color);
      // The shop: walls (two storeys from level 2), a parapet roof, a glass front with a door
      const H = lvl >= 2 ? 4.2 : 2.1;
      box(0.4, 0, 0.6, 3.3, H, 2.7, wall);
      box(0.35, H, 0.55, 3.4, 0.14, 2.8, ink);
      box(0.55, 0.12, 0.57, 1.05, 1.15, 0.04, glass);
      box(2.5, 0.12, 0.57, 1.05, 1.15, 0.04, glass);
      box(1.72, 0, 0.56, 0.66, 1.25, 0.05, toon('#14304a'));
      box(0.4, 0, 0.55, 3.3, 0.12, 0.06, ink);
      // Crates of what's on its shelves, in the windows
      u.slots.forEach((s, k) => {
        const n = Math.ceil((s.qty / cap) * 3);
        const wu = k < 2 ? 0.65 + k * 0.45 : 2.6 + (k - 2) * 0.45;
        for (let j = 0; j < n; j++) box(wu, 0.16 + j * 0.2, 0.7, 0.36, 0.18, 0.3, toon(good(s.good).color));
      });
      // The striped awning over the front
      // (face() turns it to the street; tilted so its front edge hangs lower)
      const aw = face(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.75), awning(color)), 2.05, 1.45, 0.3);
      aw.rotation.x = F < 0 ? Math.PI / 2 - 0.45 : -Math.PI / 2 + 0.45;
      aw.castShadow = true;
      sign(top ? top.name.toUpperCase() : 'YOUR SHOP', color, 'SHOP', 2.05, 1.86, 0.53, 1.4);
      plaque(3.3, 1.72, 0.58);
      if (lvl >= 2) {
        // Level 2: a second storey of lit windows over an ink string course, and fat neon trim
        // along the parapet and down the front corners
        box(0.38, 2.12, 0.57, 3.34, 0.08, 0.06, ink);
        box(0.62, 2.5, 0.57, 1.1, 1.0, 0.04, glass);
        box(2.38, 2.5, 0.57, 1.1, 1.0, 0.04, glass);
        box(0.36, H + 0.14, 0.55, 3.38, 0.07, 0.07, trim);
        for (const tu of [0.36, 3.67]) box(tu, 2.3, 0.55, 0.07, H - 2.3, 0.07, trim);
      } else box(0.38, H + 0.14, 0.56, 3.34, 0.04, 0.04, trim);
      if (lvl >= 3) {
        // Level 3: a corner tower with its own neon band, a roof sign lit from below, planters out front
        box(0.4, H + 0.14, 0.6, 1.1, 1.3, 1.1, wall);
        box(0.35, H + 1.44, 0.55, 1.2, 0.1, 1.2, ink);
        box(0.37, H + 1.3, 0.57, 1.16, 0.06, 0.06, trim);
        box(0.37, H + 1.3, 0.57, 0.06, 0.06, 1.16, trim);
        for (const su of [1.85, 3.35]) box(su, H + 0.14, 0.62, 0.05, 0.45, 0.05, ink);
        sign(top ? top.name.toUpperCase() : 'YOUR SHOP', color, 'SHOP', 2.6, H + 0.69, 0.64, 1.8);
        for (const lu of [1.95, 2.6, 3.25]) box(lu - 0.07, H + 0.14, 0.58, 0.14, 0.06, 0.12, bulb);
        for (const pu of [0.05, 3.65]) {
          box(pu, 0, 0.1, 0.4, 0.3, 0.4, concrete);
          box(pu + 0.05, 0.3, 0.15, 0.3, 0.15, 0.3, greenery);
        }
      }
    } else {
      // The warehouse: a corrugated shed (taller from level 2), roller doors, pallets outside
      const H = lvl >= 2 ? 2.9 : 2.2;
      if (lvl >= 3) {
        // Level 3: the first roller door stands open on a lit bay with the forklift in it
        // (all inside the shed's footprint)
        box(0.3, 0, 1.9, 3.5, H, 1.9, shedMat);
        box(0.3, 0, 0.7, 0.15, H, 1.2, shedMat);
        box(1.75, 0, 0.7, 2.05, H, 1.2, shedMat);
        box(0.3, H - 0.5, 0.7, 1.6, 0.5, 1.2, shedMat);
        box(0.45, 0, 0.7, 1.3, 0.04, 1.2, concrete);
        box(0.6, H - 0.56, 1.2, 1.0, 0.04, 0.08, bulb);
        box(0.45, H - 0.8, 0.67, 1.3, 0.3, 0.04, shutterMat);
        // The forklift: yellow body, mast and forks toward the street, a cab guard over the seat
        const fu = 0.6;
        const fv = 0.95;
        box(fu + 0.15, 0.12, fv + 0.35, 0.7, 0.45, 0.75, forkYellow);
        for (const [wu, wv] of [[fu + 0.05, fv + 0.4], [fu + 0.8, fv + 0.4], [fu + 0.05, fv + 0.95], [fu + 0.8, fv + 0.95]]) box(wu, 0, wv, 0.15, 0.3, 0.3, ink);
        for (const mu of [fu + 0.2, fu + 0.74]) box(mu, 0, fv + 0.2, 0.06, 1.4, 0.06, ink);
        for (const ku of [fu + 0.22, fu + 0.68]) box(ku, 0.06, fv, 0.1, 0.04, 0.3, steel);
        for (const [gu, gv] of [[fu + 0.2, fv + 0.45], [fu + 0.75, fv + 0.45], [fu + 0.2, fv + 1.05], [fu + 0.75, fv + 1.05]]) box(gu, 0.57, gv, 0.05, 0.7, 0.05, ink);
        box(fu + 0.15, 1.27, fv + 0.4, 0.7, 0.04, 0.75, ink);
        box(fu + 0.35, 0.57, fv + 0.6, 0.3, 0.3, 0.3, toon('#2a2740'));
      } else box(0.3, 0, 0.7, 3.5, H, 3.1, shedMat);
      box(0.25, H, 0.65, 3.6, 0.12, 3.2, ink);
      if (lvl >= 2) {
        // Level 2: two roller doors and the door at the east end
        if (lvl < 3) box(0.45, 0, 0.67, 1.3, 1.8, 0.04, shutterMat);
        box(1.95, 0, 0.67, 1.3, 1.8, 0.04, shutterMat);
        box(3.35, 0, 0.67, 0.4, 1.2, 0.04, toon('#14304a'));
      } else {
        box(0.75, 0, 0.67, 1.5, 1.55, 0.04, shutterMat);
        box(2.6, 0, 0.67, 0.5, 1.2, 0.04, toon('#14304a'));
      }
      if (lvl >= 3) {
        // Level 3: a loading-dock canopy over the doors with lamps under it, solar panels on the roof
        box(0.3, 2.0, 0.22, 3.5, 0.08, 0.5, ink);
        for (const cu of [0.5, 2.0, 3.5]) box(cu, 1.75, 0.6, 0.06, 0.25, 0.12, ink);
        for (const cu of [1.1, 2.6]) box(cu, 1.96, 0.35, 0.3, 0.04, 0.1, bulb);
        for (let r = 0; r < 2; r++)
          for (let c = 0; c < 3; c++) {
            const cu = 0.95 + c * 1.1;
            const cv = 1.5 + r * 1.1;
            const [px, pz] = site.at(cu, cv);
            b.add(place(unitBox, px, S + H + 0.44, pz, 1.0, 0.03, 0.8, F * 0.4), solarMat);
            box(cu - 0.35, H + 0.12, cv + 0.3, 0.7, 0.56, 0.05, ink);
            box(cu - 0.35, H + 0.12, cv - 0.37, 0.7, 0.26, 0.05, ink);
          }
      }
      const fill = total(u.stock) / cap;
      const n = Math.ceil(fill * 6);
      const colors = Object.keys(u.stock).map((id) => toon(good(id as never).color));
      for (let k = 0; k < n; k++) {
        const pu = k < 3 ? 0.35 + k * 0.5 : 0.35 + (k - 3) * 0.5;
        const y = k < 3 ? 0.1 : 0.42;
        if (k < 3) box(pu - 0.03, 0, 0.12, 0.46, 0.1, 0.46, woodDark);
        box(pu, y, 0.15, 0.4, 0.32, 0.4, colors[k % colors.length] ?? crate);
      }
      sign('WAREHOUSE', '#ffd23f', '', 2.05, lvl >= 2 ? 2.5 : 1.9, 0.66, 1.6);
      plaque(3.3, 1.45, 0.66);
    }
    b.build(g);
  }

  return {
    /** Draw every unit as the save has it, at its level (only the ones that changed are rebuilt) */
    show(s: TycoonSave) {
      let changed = false;
      s.units.forEach((u, i) => {
        const p = UNIT_PLACES[i];
        const lvl = placeLevel(s, p);
        const cap = u?.kind === 'shop' ? Math.round(SHOP.capacity * capacityMul(s, p)) : capOf(s, p);
        const k = look(u, lvl, cap);
        if (shown[i] === k) return;
        shown[i] = k;
        draw(i, u, lvl, cap);
        changed = true;
      });
      if (changed) solids = s.units.flatMap((u, i) => unitSolids(i, u?.kind ?? null));
      return changed;
    },
    /** What the units put in the way (walking and driving) */
    solids: () => solids,
  };
}

export type Units = ReturnType<typeof buildUnits>;
