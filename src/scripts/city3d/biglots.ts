/*
 * The big lots (BIG_LOTS in layout.ts), east of Makers' Row: the business
 * game's top tier, bought with Dorras (never the PLS district plots). Drawn
 * from your save, like Makers' Row: a FOR SALE board on a lot you don't own,
 * cones and a YOUR LOT board on one you haven't built on, then:
 *
 * - a superstore: a long, low store with a glass entrance, a big sign and a
 *   car park with painted bays and trolley bays;
 * - a factory: a brick hall under a sawtooth roof with a roller door and a
 *   tall striped chimney;
 * - a depot: a long shed with three loading docks and a trailer backed up to
 *   one, crates on pallets that stack up as it fills;
 * - offices: a glass tower (well under the Emporium's height) with a lobby
 *   canopy and an HQ sign on its crown.
 *
 * Each lot is drawn in its own numbers (u across the front, v back from it;
 * LOT_SITE in solids.ts), and rebuilt only when what it shows changes. Its
 * footprints are lotSolids(). Signs use occlude().
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, facadeMat, fx, lit, neon, occlude, place, plane, toon } from './kit';
import { BS } from './layout';
import { LOT_SITE, lotSolids, type Box } from './solids';
import { SLAB as S } from './world';
import { DEPOT_CAP, SUPERSTORE, good, total, type Lot, type TycoonSave } from './tycoon';

const ink = toon('#1b1830');
const white = toon('#f3f2f7');
const cone = toon('#ff8a3d');
const tarmac = toon('#2a2740');
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 16);

const boards = new Map<string, THREE.Texture>();
function board(text: string, color: string, sub = '', w = 512) {
  const key = `${text}|${color}|${sub}|${w}`;
  if (!boards.has(key))
    boards.set(
      key,
      canvasTex(w, 128, (c) => {
        c.fillStyle = '#0b0a18';
        c.fillRect(0, 0, w, 128);
        c.strokeStyle = color;
        c.lineWidth = 8;
        c.strokeRect(4, 4, w - 8, 120);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = color;
        c.font = `900 ${sub ? 58 : 76}px ${FONT_DISPLAY}`;
        c.fillText(text, w / 2, sub ? 52 : 68);
        if (sub) {
          c.font = `700 26px ${FONT_DISPLAY}`;
          c.fillStyle = '#f3f2f7';
          c.fillText(sub, w / 2, 100);
        }
      })
    );
  return boards.get(key)!;
}
/** Wall materials, made once */
let mats: Record<string, THREE.Material> | null = null;
function materials() {
  mats ??= {
    store: toon('#3a3550'),
    brick: new THREE.MeshToonMaterial({
      map: canvasTex(128, 128, (c) => {
        c.fillStyle = '#8a3b32';
        c.fillRect(0, 0, 128, 128);
        c.fillStyle = '#6e2c26';
        for (let y = 0; y < 128; y += 16) {
          c.fillRect(0, y, 128, 3);
          for (let x = (y / 16) % 2 ? 0 : 16; x < 128; x += 32) c.fillRect(x, y, 3, 16);
        }
      }),
    }),
    shed: new THREE.MeshToonMaterial({
      map: canvasTex(128, 128, (c) => {
        c.fillStyle = '#5b6b86';
        c.fillRect(0, 0, 128, 128);
        for (let x = 0; x < 128; x += 8) {
          c.fillStyle = '#4b5a73';
          c.fillRect(x, 0, 3, 128);
        }
      }),
    }),
    shutter: new THREE.MeshToonMaterial({
      map: canvasTex(64, 64, (c) => {
        c.fillStyle = '#c9ccd6';
        c.fillRect(0, 0, 64, 64);
        for (let y = 0; y < 64; y += 6) {
          c.fillStyle = '#9aa0b0';
          c.fillRect(0, y, 64, 2);
        }
      }),
    }),
    tower: facadeMat({ cols: 6, rows: 9, wall: '#1d2f4f', glass: '#15214a', lit: [PAL.cyan, PAL.warm, '#ffffff'], litRatio: 0.55, seed: 77, bands: '#2c4570' }, 0.2, 1.8),
    roof: toon('#24203a'),
    glass: lit(new THREE.MeshBasicMaterial({ color: '#2a5d8a' }), 0.6, 1.4),
    glow: neon(PAL.warm, 0.6, 2.2),
    chimney: new THREE.MeshToonMaterial({
      map: canvasTex(32, 128, (c) => {
        for (let y = 0; y < 128; y += 32) {
          c.fillStyle = '#e23b3b';
          c.fillRect(0, y, 32, 16);
          c.fillStyle = '#f3f2f7';
          c.fillRect(0, y + 16, 32, 16);
        }
      }),
    }),
  };
  return mats;
}

/** What a lot shows: when this changes, it's rebuilt */
function look(l: Lot | null) {
  if (!l) return 'sale';
  if (!l.kind) return 'empty';
  if (l.kind === 'superstore') return `superstore|${l.slots.map((s) => `${s.good}:${Math.ceil((s.qty / SUPERSTORE.capacity) * 2)}`).join(',')}`;
  if (l.kind === 'depot') return `depot|${Math.ceil((total(l.stock) / DEPOT_CAP) * 6)}`;
  return l.kind;
}

export function buildBigLots(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = 'big-lots';
  scene.add(root);
  const groups = LOT_SITE.map(() => {
    const g = new THREE.Group();
    root.add(g);
    return g;
  });
  const shown: string[] = LOT_SITE.map(() => '');
  let solids: Box[] = [];

  function draw(i: number, l: Lot | null) {
    const site = LOT_SITE[i];
    const g = groups[i];
    for (const o of [...g.children]) {
      o.removeFromParent();
      o.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (mesh.geometry && mesh.geometry !== unitBox && mesh.geometry !== cyl) mesh.geometry.dispose();
      });
    }
    const m = materials();
    const b = new Batch();
    const F = site.facing;
    /** A box in the lot's own numbers: u across, y up, v back from the front */
    const box = (u0: number, y: number, v0: number, w: number, h: number, d: number, mat: THREE.Material) => {
      const [x, z] = site.at(u0, F < 0 ? v0 : v0 + d);
      b.box(x, S + y, z, w, h, d, mat);
    };
    /** A cylinder standing at (u, v) */
    const post = (u: number, v: number, r: number, h: number, mat: THREE.Material, y = 0) => {
      const [x, z] = site.at(u, v);
      b.add(place(cyl, x, S + y + h / 2, z, r, h, r), mat);
    };
    /** A mesh facing the street, its centre at (u, y, v) */
    const face = (mesh: THREE.Mesh, u: number, y: number, v: number) => {
      const [x, z] = site.at(u, v);
      mesh.position.set(x, S + y, z);
      mesh.rotation.y = F < 0 ? Math.PI : 0;
      g.add(mesh);
      return mesh;
    };
    const sign = (text: string, color: string, sub: string, u: number, y: number, v: number, w: number) => {
      const tex = board(text, color, sub);
      return face(fx(occlude(plane(w, w / 4, lit(new THREE.MeshBasicMaterial({ map: tex }), 1, 1.7)), tex)), u, y, v);
    };
    const postBoard = (text: string, color: string, sub: string) => {
      box(3.1, 0, 0.5, 0.1, 1.5, 0.1, ink);
      box(5.8, 0, 0.5, 0.1, 1.5, 0.1, ink);
      sign(text, color, sub, BS / 2, 1.35, 0.53, 3.2);
    };
    const letter = 'ABC'[i];

    if (!l) {
      postBoard(`LOT ${letter}`, PAL.warm, 'FOR SALE · BIG LOT');
      for (let k = 0; k < 14; k++) box(0.6 + ((k * 2.37) % 7.6), 0, 1.6 + ((k * 1.91) % 6.8), 0.22, 0.14, 0.22, toon('#3f8f4a'));
    } else if (!l.kind) {
      postBoard('YOUR LOT', PAL.cyan, `LOT ${letter} · BUILD IT IN YOUR BUSINESS CARD`);
      for (const [cu, cv] of [[1, 2], [8, 2], [1, 8], [8, 8]]) {
        box(cu - 0.14, 0, cv - 0.14, 0.28, 0.06, 0.28, cone);
        box(cu - 0.08, 0.06, cv - 0.08, 0.16, 0.38, 0.16, cone);
        box(cu - 0.09, 0.24, cv - 0.09, 0.18, 0.07, 0.18, white);
      }
    } else if (l.kind === 'superstore') {
      // Car park: tarmac, painted bays, trolley bay, lamp posts
      box(0.3, 0.005, 0.2, 8.4, 0.01, 2.6, tarmac);
      for (let k = 0; k <= 7; k++) box(0.6 + k * 1.1, 0.012, 0.5, 0.05, 0.01, 1.6, white);
      box(7.6, 0, 2.35, 0.9, 0.5, 0.35, toon('#9aa0b0'));
      for (const u of [0.5, 8.5]) {
        post(u, 2.6, 0.05, 2.4, ink);
        box(u - 0.18, 2.4, 2.45, 0.36, 0.08, 0.3, m.glow);
      }
      // The store, its glass entrance and a canopy
      box(0.8, 0, 3.0, 7.4, 3.0, 5.4, m.store);
      box(0.75, 3.0, 2.95, 7.5, 0.18, 5.5, m.roof);
      box(3.3, 0, 2.96, 2.4, 2.0, 0.06, m.glass);
      box(1.1, 0.4, 2.97, 1.8, 1.1, 0.04, m.glass);
      box(6.1, 0.4, 2.97, 1.8, 1.1, 0.04, m.glass);
      box(3.0, 2.0, 2.4, 3.0, 0.14, 0.6, ink);
      // Goods in the windows, in what it's stocking
      l.slots.slice(0, 4).forEach((s, k) => {
        const u = k < 2 ? 1.25 + k * 0.8 : 6.25 + (k - 2) * 0.8;
        for (let j = 0; j < Math.ceil((s.qty / SUPERSTORE.capacity) * 2); j++) box(u, 0.45 + j * 0.32, 3.1, 0.6, 0.3, 0.4, toon(good(s.good).color));
      });
      sign('SUPERSTORE', PAL.cyan, '', BS / 2, 3.55, 2.93, 5);
    } else if (l.kind === 'factory') {
      // A brick hall under a sawtooth roof, a roller door, a striped chimney
      box(0.6, 0, 2.6, 6.0, 2.4, 5.9, m.brick);
      for (let k = 0; k < 4; k++) {
        const v = 2.6 + k * 1.475;
        const [x, z] = site.at(0.6 + 3, v + 0.74);
        b.add(place(unitBox, x, S + 2.4 + 0.42, z, 6.0, 0.85, 1.55, F < 0 ? 0.5 : -0.5, 0, 0), m.roof);
      }
      box(2.4, 0, 2.56, 2.2, 1.9, 0.06, m.shutter);
      box(0.9, 0, 2.56, 0.6, 1.25, 0.06, toon('#14304a'));
      box(5.0, 0.9, 2.56, 1.2, 0.8, 0.04, m.glass);
      post(7.7, 6.9, 0.55, 7.0, m.chimney);
      post(7.7, 6.9, 0.62, 0.3, ink, 7.0);
      // Pallets of crates in the yard
      for (let k = 0; k < 3; k++) {
        box(6.9, 0, 3.0 + k * 0.9, 0.8, 0.1, 0.8, toon('#5a3a22'));
        box(6.95, 0.1, 3.05 + k * 0.9, 0.7, 0.55, 0.7, toon('#a8743f'));
      }
      sign('FACTORY', '#ffd23f', '', 3.6, 2.85, 2.5, 3.4);
    } else if (l.kind === 'depot') {
      // The long shed with three loading docks and a trailer at one
      box(0.5, 0, 3.6, 8.0, 3.4, 5.0, m.shed);
      box(0.45, 3.4, 3.55, 8.1, 0.16, 5.1, m.roof);
      box(0.5, 0, 3.0, 8.0, 0.7, 0.6, toon('#4a4560'));
      for (let k = 0; k < 3; k++) {
        box(1.1 + k * 2.6, 0.7, 3.57, 1.8, 1.8, 0.05, m.shutter);
        box(1.1 + k * 2.6, 0.2, 2.95, 0.2, 0.4, 0.06, ink);
        box(2.7 + k * 2.6, 0.2, 2.95, 0.2, 0.4, 0.06, ink);
      }
      // A trailer backed up to the first dock
      box(1.2, 0.35, 0.3, 1.6, 1.7, 2.6, white);
      box(1.2, 0.35, 0.28, 1.6, 0.3, 0.04, toon('#e23b3b'));
      for (const u of [1.35, 2.45]) box(u, 0, 0.6, 0.2, 0.35, 0.5, ink);
      // Pallets on the apron, more as it fills
      const fill = l ? total(l.stock) / DEPOT_CAP : 0;
      const colors = Object.keys(l.stock).map((id) => toon(good(id as never).color));
      for (let k = 0; k < Math.ceil(fill * 6); k++) {
        const u = 4.2 + (k % 3) * 1.4;
        const y = k < 3 ? 0 : 0.6;
        if (k < 3) box(u, 0, 1.2, 1.1, 0.12, 1.1, toon('#5a3a22'));
        box(u + 0.1, y + 0.12, 1.3, 0.9, 0.48, 0.9, colors[k % colors.length] ?? toon('#a8743f'));
      }
      sign('DEPOT', '#2bff88', '', 6.0, 3.0, 2.95, 2.8);
    } else {
      // Offices: a glass tower on a plinth, a lobby canopy, HQ on the crown
      g.add(Object.assign(new THREE.Mesh(unitBox, [m.tower, m.tower, m.roof, m.roof, m.tower, m.tower]), { castShadow: true }));
      const tower = g.children[g.children.length - 1] as THREE.Mesh;
      const [tx, tz] = site.at(4.5, 5.7);
      tower.position.set(tx, S + 4.4, tz);
      tower.scale.set(4.2, 8.8, 4.2);
      box(2.3, 8.8, 3.5, 4.4, 0.25, 4.4, ink);
      box(3.6, 9.05, 4.8, 1.8, 0.6, 1.8, m.roof);
      box(1.6, 0, 2.6, 5.8, 1.6, 1.0, m.store);
      box(3.4, 0, 2.58, 2.2, 1.3, 0.05, m.glass);
      box(3.1, 1.6, 2.0, 2.8, 0.12, 1.2, ink);
      for (const u of [3.2, 5.8]) post(u, 2.15, 0.05, 1.6, ink);
      // Planters either side of the lobby
      for (const u of [0.6, 7.6]) {
        box(u, 0, 1.0, 0.9, 0.4, 0.9, toon('#4a4560'));
        box(u + 0.1, 0.4, 1.1, 0.7, 0.35, 0.7, toon('#2f7a3a'));
      }
      sign('HQ', PAL.pink, '', 4.5, 8.2, 3.47, 2.6);
      sign('OFFICES', PAL.cyan, '', 4.5, 2.2, 2.55, 3.2);
    }
    b.build(g);
  }

  return {
    /** Draw every big lot as the save has it (only the ones that changed are rebuilt) */
    show(s: TycoonSave) {
      let changed = false;
      s.lots.forEach((l, i) => {
        const k = look(l);
        if (shown[i] === k) return;
        shown[i] = k;
        draw(i, l);
        changed = true;
      });
      if (changed) solids = s.lots.flatMap((l, i) => lotSolids(i, l?.kind ?? null));
      return changed;
    },
    /** What the big lots put in the way (walking and driving) */
    solids: () => solids,
  };
}

export type BigLots = ReturnType<typeof buildBigLots>;
