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
 * People-scale like the rest of the city: Degen is about a tile tall, doors
 * about 1.25. A unit is drawn in its own numbers (u across its front, v back
 * from it; UNIT_SITE in solids.ts), and rebuilt only when what it shows
 * changes. Its footprints (for walking and driving) are unitSolids().
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, lit, occlude, place, plane, toon } from './kit';
import { UNITS, BS } from './layout';
import { UNIT_SITE, UNIT_SIZE, unitSolids, type Box } from './solids';
import { SLAB as S, addLamp } from './world';
import { GARDEN_CAP, SHOP, WAREHOUSE_CAP, good, total, type TycoonSave, type Unit } from './tycoon';

const ink = toon('#1b1830');
const wood = toon('#8a5a35');
const woodDark = toon('#5a3a22');
const soil = toon('#4a3020');
const cone = toon('#ff8a3d');
const white = toon('#f3f2f7');
const crate = toon('#a8743f');
const cane = toon('#9bbf4a');
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const bush = new THREE.IcosahedronGeometry(1, 1);
const berry = new THREE.IcosahedronGeometry(0.055, 0);

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

/** What a unit shows: when this changes, it's rebuilt */
function look(u: Unit | null) {
  if (!u) return 'let';
  if (!u.kind) return 'empty';
  if (u.kind === 'garden') return `garden|${u.crop}|${Math.ceil(((u.stock[u.crop] ?? 0) / GARDEN_CAP) * 4)}`;
  if (u.kind === 'shop') return `shop|${u.slots.map((s) => `${s.good}:${Math.ceil((s.qty / SHOP.capacity) * 3)}`).join(',')}`;
  return `warehouse|${Math.ceil((total(u.stock) / WAREHOUSE_CAP) * 6)}`;
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

  function draw(i: number, u: Unit | null) {
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
    /** A post-mounted board at the front */
    const postBoard = (text: string, color: string, sub: string) => {
      box(1.35, 0, 0.35, 0.07, 1.1, 0.07, ink);
      box(2.68, 0, 0.35, 0.07, 1.1, 0.07, ink);
      sign(text, color, sub, UNIT_SIZE / 2, 1.0, 0.37);
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
      const fill = (u.stock[u.crop] ?? 0) / GARDEN_CAP;
      const grow = 0.45 + 0.55 * Math.min(1, fill * 1.4 + 0.2);
      const leaf = toon(u.crop === 'sugar' ? '#5fbf3a' : u.crop === 'beans' ? '#2f7a3a' : '#4f8f45');
      const fruit = toon(u.crop === 'beans' ? '#e23b3b' : '#f7f7ff');
      // Three raised beds running back from the front, a path between
      for (let k = 0; k < 3; k++) {
        const bu = 0.3 + k * 0.85;
        box(bu, 0, 0.5, 0.7, 0.24, 3.2, wood);
        box(bu + 0.05, 0.2, 0.55, 0.6, 0.05, 3.1, soil);
        for (let n = 0; n < 6; n++) {
          const pu = bu + 0.35;
          const pv = 0.8 + n * 0.5;
          if (u.crop === 'sugar') {
            // Cane: tall jointed stalks with long leaves arching out
            for (const o of [-0.12, 0.12]) {
              const hgt = 0.8 * grow * (o < 0 ? 1 : 0.85);
              box(pu + o - 0.025, 0.25, pv - 0.025, 0.05, hgt, 0.05, cane);
              const [x, z] = site.at(pu + o, pv);
              for (const [k, side] of [[0.55, 1], [0.8, -1], [1, 1]] as const) {
                const ry = (o + k) * 4;
                b.add(place(unitBox, x + Math.cos(ry) * 0.1 * side, S + 0.25 + hgt * k, z - Math.sin(ry) * 0.1 * side, 0.26, 0.025, 0.06, 0, ry, side * 0.55), leaf);
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
      }
      // The tool shed at the back, crates of the harvest beside it
      box(2.8, 0, 2.9, 1.05, 1.35, 0.95, woodDark);
      box(2.75, 1.35, 2.85, 1.15, 0.1, 1.05, ink);
      box(3.1, 0, 2.88, 0.45, 1.05, 0.03, wood);
      const crates = Math.round(fill * 4);
      for (let k = 0; k < crates; k++) box(2.85 + (k % 2) * 0.45, Math.floor(k / 2) * 0.32, 2.35, 0.4, 0.3, 0.4, toon(good(u.crop).color));
      postBoard(good(u.crop).name.toUpperCase(), '#5fbf3a', 'GARDEN');
    } else if (u.kind === 'shop') {
      const top = u.slots[0] ? good(u.slots[0].good) : null;
      const color = top?.color ?? PAL.cyan;
      // The shop: walls, a parapet roof, a glass front with a door
      box(0.4, 0, 0.6, 3.3, 2.1, 2.7, toon('#3a3550'));
      box(0.35, 2.1, 0.55, 3.4, 0.14, 2.8, ink);
      box(0.55, 0.12, 0.57, 1.05, 1.15, 0.04, glass);
      box(2.5, 0.12, 0.57, 1.05, 1.15, 0.04, glass);
      box(1.72, 0, 0.56, 0.66, 1.25, 0.05, toon('#14304a'));
      box(0.4, 0, 0.55, 3.3, 0.12, 0.06, ink);
      // Crates of what's on its shelves, in the windows
      u.slots.forEach((s, k) => {
        const n = Math.ceil((s.qty / SHOP.capacity) * 3);
        const wu = k < 2 ? 0.65 + k * 0.45 : 2.6 + (k - 2) * 0.45;
        for (let j = 0; j < n; j++) box(wu, 0.16 + j * 0.2, 0.7, 0.36, 0.18, 0.3, toon(good(s.good).color));
      });
      // The striped awning over the front
      // (face() turns it to the street; tilted so its front edge hangs lower)
      const aw = face(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.75), awning(color)), 2.05, 1.45, 0.3);
      aw.rotation.x = F < 0 ? Math.PI / 2 - 0.45 : -Math.PI / 2 + 0.45;
      aw.castShadow = true;
      sign(top ? top.name.toUpperCase() : 'YOUR SHOP', color, 'SHOP', 2.05, 1.86, 0.53, 1.4);
    } else {
      // The warehouse: a corrugated shed, a roller door, pallets outside
      box(0.3, 0, 0.7, 3.5, 2.2, 3.1, shedMat);
      box(0.25, 2.2, 0.65, 3.6, 0.12, 3.2, ink);
      box(0.75, 0, 0.67, 1.5, 1.55, 0.04, shutterMat);
      box(2.6, 0, 0.67, 0.5, 1.2, 0.04, toon('#14304a'));
      const fill = total(u.stock) / WAREHOUSE_CAP;
      const n = Math.ceil(fill * 6);
      const colors = Object.keys(u.stock).map((id) => toon(good(id as never).color));
      for (let k = 0; k < n; k++) {
        const pu = k < 3 ? 0.35 + k * 0.5 : 0.35 + (k - 3) * 0.5;
        const y = k < 3 ? 0.1 : 0.42;
        if (k < 3) box(pu - 0.03, 0, 0.12, 0.46, 0.1, 0.46, woodDark);
        box(pu, y, 0.15, 0.4, 0.32, 0.4, colors[k % colors.length] ?? crate);
      }
      sign('WAREHOUSE', '#ffd23f', '', 2.05, 1.9, 0.66, 1.6);
    }
    b.build(g);
  }

  return {
    /** Draw every unit as the save has it (only the ones that changed are rebuilt) */
    show(s: TycoonSave) {
      let changed = false;
      s.units.forEach((u, i) => {
        const k = look(u);
        if (shown[i] === k) return;
        shown[i] = k;
        draw(i, u);
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
