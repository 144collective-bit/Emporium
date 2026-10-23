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
 * Each built lot has a level (1-3, the save's `levels`; Phase 5) and shows
 * it: the superstore gains a bigger sign, roof lights and trolley bays, then
 * a second entrance with its own canopy at the end of a painted pick-up lane
 * (no petrol here), and flags; the factory a second chimney and a water tank,
 * then solar panels, a conveyor gantry over to the chimney and warning
 * stripes; the depot a second trailer, then a gantry crane out over the docks
 * and floodlights; the offices a taller crown ringed in neon, then a helipad,
 * an antenna and a glass bridge from a two-storey annex on the lobby. A
 * plaque by each door shows its stars (starBoard() in units.ts), and the
 * level's capacity (capOf(), capacityMul()) sets how full it looks. New
 * pieces stay inside the building's footprint (LOT_SHAPES), overhead, or
 * under knee height on the forecourt, so the footprints never change.
 *
 * Each lot is drawn in its own numbers (u across the front, v back from it;
 * LOT_SITE in solids.ts), and rebuilt only when what it shows changes (its
 * level included). Its footprints are lotSolids(). Signs use occlude(). One
 * Batch per lot with the materials shared from the module scope.
 */
import * as THREE from 'three';
import { Batch, facadeMat, FONT_DISPLAY, fx, lit, liveTex, neon, occlude, PAL, place, plane, toon } from './kit';
import { BS } from './layout';
import { LOT_SITE, lotSolids, type Box } from './solids';
import { SLAB as S } from './world';
import { LOT_PLACES, SUPERSTORE, capOf, capacityMul, good, placeLevel, total, type Lot, type TycoonSave } from './tycoon';
import { solarMat, starBoard } from './units';

const ink = toon('#1b1830');
const white = toon('#f3f2f7');
const cone = toon('#ff8a3d');
const tarmac = toon('#2a2740');
const lane = toon('#3b3760');
const steel = toon('#9aa0b0');
const crane = toon(PAL.craneYellow);
const pad = toon('#3a3a42');
const padRing = toon('#ffd23f');
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 16);
const coneGeo = new THREE.ConeGeometry(1, 1, 16);
const ring = new THREE.RingGeometry(0.76, 0.9, 32);

const boards = new Map<string, THREE.Texture>();
function board(text: string, color: string, sub = '', w = 512) {
  const key = `${text}|${color}|${sub}|${w}`;
  if (!boards.has(key))
    boards.set(
      key,
      liveTex(w, 128, (c) => {
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
/** Wall materials and neon, made once */
let mats: Record<string, THREE.Material> | null = null;
function materials() {
  mats ??= {
    store: toon('#3a3550'),
    brick: new THREE.MeshToonMaterial({
      map: liveTex(128, 128, (c) => {
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
      map: liveTex(128, 128, (c) => {
        c.fillStyle = '#5b6b86';
        c.fillRect(0, 0, 128, 128);
        for (let x = 0; x < 128; x += 8) {
          c.fillStyle = '#4b5a73';
          c.fillRect(x, 0, 3, 128);
        }
      }),
    }),
    shutter: new THREE.MeshToonMaterial({
      map: liveTex(64, 64, (c) => {
        c.fillStyle = '#c9ccd6';
        c.fillRect(0, 0, 64, 64);
        for (let y = 0; y < 64; y += 6) {
          c.fillStyle = '#9aa0b0';
          c.fillRect(0, y, 64, 2);
        }
      }),
    }),
    tower: facadeMat({ cols: 6, rows: 9, wall: '#1d2f4f', glass: '#15214a', lit: [PAL.cyan, PAL.warm, '#ffffff'], litRatio: 0.55, seed: 77, bands: '#2c4570', live: true }, 0.2, 1.8),
    roof: toon('#24203a'),
    glass: lit(new THREE.MeshBasicMaterial({ color: '#2a5d8a' }), 0.6, 1.4),
    glow: neon(PAL.warm, 0.6, 2.2),
    bulb: neon(PAL.warm, 0.4, 2.6),
    cyan: neon(PAL.cyan, 0.8, 2.2),
    pink: neon(PAL.pink, 0.7, 2.4),
    red: neon(PAL.red, 1, 2.6),
    chimney: new THREE.MeshToonMaterial({
      map: liveTex(32, 128, (c) => {
        for (let y = 0; y < 128; y += 32) {
          c.fillStyle = '#e23b3b';
          c.fillRect(0, y, 32, 16);
          c.fillStyle = '#f3f2f7';
          c.fillRect(0, y + 16, 32, 16);
        }
      }),
    }),
    /** Warning stripes: yellow and black on the slant */
    hazard: new THREE.MeshToonMaterial({
      map: liveTex(64, 64, (c) => {
        c.fillStyle = '#ffd23f';
        c.fillRect(0, 0, 64, 64);
        c.fillStyle = '#1b1830';
        for (let k = -64; k < 128; k += 32) {
          c.beginPath();
          c.moveTo(k, 0);
          c.lineTo(k + 16, 0);
          c.lineTo(k + 80, 64);
          c.lineTo(k + 64, 64);
          c.closePath();
          c.fill();
        }
      }),
    }),
  };
  return mats;
}

/** What a lot shows (at its level, with the level's capacity): when this changes, it's rebuilt */
function look(l: Lot | null, lvl: number, cap: number) {
  if (!l) return 'sale';
  if (!l.kind) return 'empty';
  if (l.kind === 'superstore') return `superstore|${lvl}|${l.slots.map((s) => `${s.good}:${Math.ceil((s.qty / cap) * 2)}`).join(',')}`;
  if (l.kind === 'depot') return `depot|${lvl}|${Math.ceil((total(l.stock) / cap) * 6)}`;
  return `${l.kind}|${lvl}`;
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

  /** Draw a lot at its level; `cap` is what it holds at that level (the shelves' per-good capacity for a superstore) */
  function draw(i: number, l: Lot | null, lvl: number, cap: number) {
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
    /** The lot's star plaque, its centre at (u, y, v) */
    const plaque = (u: number, y: number, v: number, w = 0.9) => {
      const tex = starBoard(lvl);
      return face(fx(occlude(plane(w, w / 3, lit(new THREE.MeshBasicMaterial({ map: tex }), 0.9, 1.4)), tex)), u, y, v);
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
      for (let k = lvl >= 3 ? 1 : 0; k <= 7; k++) box(0.6 + k * 1.1, 0.012, 0.5, 0.05, 0.01, 1.6, white);
      box(7.6, 0, 2.35, 0.9, 0.5, 0.35, steel);
      for (const u of [0.5, 8.5]) {
        post(u, 2.6, 0.05, 2.4, ink);
        box(u - 0.18, 2.4, 2.45, 0.36, 0.08, 0.3, m.glow);
      }
      // The store, its glass entrance and a canopy
      box(0.8, 0, 3.0, 7.4, 3.0, 5.4, m.store);
      box(0.75, 3.0, 2.95, 7.5, 0.18, 5.5, m.roof);
      box(3.3, 0, 2.96, 2.4, 2.0, 0.06, m.glass);
      box(6.1, 0.4, 2.97, 1.8, 1.1, 0.04, m.glass);
      box(3.0, 2.0, 2.4, 3.0, 0.14, 0.6, ink);
      if (lvl >= 3) {
        // Level 3: a second entrance in the west window's place, its canopy lit, at the end of a
        // painted pick-up lane (flat, with arrows) that takes the first bay, and flags on the roof
        box(1.0, 0, 2.96, 1.8, 2.0, 0.06, m.glass);
        box(0.8, 2.0, 2.4, 2.2, 0.14, 0.6, ink);
        box(0.8, 1.96, 2.4, 2.2, 0.04, 0.05, m.cyan);
        box(0.4, 0.012, 0.3, 1.2, 0.006, 2.4, lane);
        for (let v = 0.4; v < 2.6; v += 0.5) for (const eu of [0.4, 1.55]) box(eu, 0.016, v, 0.05, 0.005, 0.3, white);
        for (const av of [0.7, 1.5, 2.3]) {
          box(0.97, 0.016, av, 0.06, 0.005, 0.45, white);
          const [ax, az] = site.at(1.0, av + 0.45);
          for (const side of [-1, 1]) b.add(place(unitBox, ax + side * 0.08, S + 0.019, az + F * 0.08, 0.05, 0.005, 0.26, 0, side * F * 0.7), white);
        }
        for (const [fu, color] of [[2.0, PAL.pink], [4.5, PAL.violet], [7.0, PAL.cyan]] as const) {
          post(fu, 4.0, 0.03, 1.6, ink, 3.18);
          box(fu + 0.03, 4.43, 3.98, 0.55, 0.32, 0.03, toon(color));
        }
      } else box(1.1, 0.4, 2.97, 1.8, 1.1, 0.04, m.glass);
      if (lvl >= 2) {
        // Level 2: a neon line along the roof's edge with lamps shining up at the sign, and covered
        // trolley bays either side of the entrance (rails at knee height)
        box(0.8, 3.18, 2.92, 7.4, 0.06, 0.06, m.cyan);
        for (const lu of [2.2, 4.5, 6.8]) {
          box(lu - 0.15, 3.18, 3.1, 0.3, 0.12, 0.2, ink);
          box(lu - 0.1, 3.3, 3.12, 0.2, 0.06, 0.16, m.bulb);
        }
        for (const tu of [1.9, 5.2]) {
          for (const eu of [tu, tu + 1.05]) box(eu, 0, 2.2, 0.05, 0.45, 0.4, ink);
          box(tu, 0.42, 2.2, 1.1, 0.04, 0.04, ink);
          box(tu, 0.42, 2.56, 1.1, 0.04, 0.04, ink);
          for (let k = 0; k < 3; k++) {
            box(tu + 0.12 + k * 0.32, 0.1, 2.25, 0.26, 0.3, 0.3, steel);
            box(tu + 0.15 + k * 0.32, 0, 2.28, 0.2, 0.1, 0.24, ink);
          }
        }
      }
      // Goods in the windows, in what it's stocking (all in the east window once the west one is a door)
      l.slots.slice(0, 4).forEach((s, k) => {
        const w = lvl >= 3 ? 0.4 : 0.6;
        const u = lvl >= 3 ? 6.2 + k * 0.42 : k < 2 ? 1.25 + k * 0.8 : 6.25 + (k - 2) * 0.8;
        for (let j = 0; j < Math.ceil((s.qty / cap) * 2); j++) box(u, 0.45 + j * 0.32, 3.1, w, 0.3, 0.4, toon(good(s.good).color));
      });
      // The sign, bigger from level 2
      sign('SUPERSTORE', PAL.cyan, '', BS / 2, lvl >= 2 ? 3.85 : 3.55, 2.93, lvl >= 2 ? 7 : 5);
      plaque(4.5, 2.5, 2.95);
    } else if (l.kind === 'factory') {
      // A brick hall under a sawtooth roof, a roller door, a striped chimney
      box(0.6, 0, 2.6, 6.0, 2.4, 5.9, m.brick);
      const tilt = F < 0 ? 0.5 : -0.5;
      for (let k = 0; k < 4; k++) {
        const v = 2.6 + k * 1.475;
        const [x, z] = site.at(0.6 + 3, v + 0.74);
        b.add(place(unitBox, x, S + 2.4 + 0.42, z, 6.0, 0.85, 1.55, tilt, 0, 0), m.roof);
      }
      box(2.4, 0, 2.56, 2.2, 1.9, 0.06, m.shutter);
      box(0.9, 0, 2.56, 0.6, 1.25, 0.06, toon('#14304a'));
      box(5.0, 0.9, 2.56, 1.2, 0.8, 0.04, m.glass);
      post(7.7, 6.9, 0.55, 7.0, m.chimney);
      post(7.7, 6.9, 0.62, 0.3, ink, 7.0);
      if (lvl >= 2) {
        // Level 2: a second chimney up through the hall's roof, and a water tank on legs over it
        post(1.5, 7.6, 0.38, 4.2, m.chimney, 2.4);
        post(1.5, 7.6, 0.44, 0.25, ink, 6.6);
        for (const [tu, tv] of [[4.8, 6.9], [5.8, 6.9], [4.8, 7.9], [5.8, 7.9]]) box(tu - 0.04, 2.4, tv - 0.04, 0.08, 1.85, 0.08, ink);
        post(5.3, 7.4, 0.65, 0.9, steel, 4.25);
        post(5.3, 7.4, 0.67, 0.08, ink, 4.6);
        const [cx, cz] = site.at(5.3, 7.4);
        b.add(place(coneGeo, cx, S + 5.35, cz, 0.7, 0.4, 0.7), ink);
      }
      if (lvl >= 3) {
        // Level 3: solar panels on the sawtooth's slopes, a conveyor gantry from the hall over to
        // the chimney (overhead), warning stripes round the roller door and along the yard's edge
        for (const k of [1, 2])
          for (const cu of [1.6, 3.0, 4.4]) {
            const [px, pz] = site.at(cu, 2.6 + k * 1.475 + 0.74);
            b.add(place(unitBox, px, S + 2.82 + 0.45 * Math.cos(tilt), pz + 0.45 * Math.sin(tilt), 1.2, 0.04, 1.0, tilt), solarMat);
          }
        box(6.6, 1.9, 6.5, 0.6, 0.7, 0.8, m.shed);
        box(6.6, 2.6, 6.5, 0.6, 0.05, 0.8, ink);
        box(6.6, 1.86, 6.48, 0.6, 0.06, 0.84, m.hazard);
        for (const hu of [2.25, 4.6]) box(hu, 0, 2.52, 0.15, 1.9, 0.08, m.hazard);
        box(2.2, 0.005, 2.1, 2.6, 0.012, 0.3, m.hazard);
      }
      // Pallets of crates in the yard
      for (let k = 0; k < 3; k++) {
        box(6.9, 0, 3.0 + k * 0.9, 0.8, 0.1, 0.8, toon('#5a3a22'));
        box(6.95, 0.1, 3.05 + k * 0.9, 0.7, 0.55, 0.7, toon('#a8743f'));
      }
      sign('FACTORY', '#ffd23f', '', 3.6, 2.85, 2.5, 3.4);
      plaque(1.7, 1.55, 2.54);
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
      // Trailers backed up to the docks: one at the first, from level 2 another at the third
      const trailer = (u: number, stripe: THREE.Material) => {
        box(u, 0.35, 0.3, 1.6, 1.7, 2.6, white);
        box(u, 0.35, 0.28, 1.6, 0.3, 0.04, stripe);
        for (const wu of [u + 0.15, u + 1.25]) box(wu, 0, 0.6, 0.2, 0.35, 0.5, ink);
      };
      trailer(1.2, toon('#e23b3b'));
      if (lvl >= 2) trailer(6.4, toon(PAL.cyan));
      // Pallets on the apron, more as it fills
      const fill = total(l.stock) / cap;
      const colors = Object.keys(l.stock).map((id) => toon(good(id as never).color));
      for (let k = 0; k < Math.ceil(fill * 6); k++) {
        const u = 3.4 + (k % 3) * 1.0;
        const y = k < 3 ? 0 : 0.6;
        if (k < 3) box(u, 0, 1.2, 0.9, 0.12, 0.9, toon('#5a3a22'));
        box(u + 0.1, y + 0.12, 1.3, 0.7, 0.48, 0.7, colors[k % colors.length] ?? toon('#a8743f'));
      }
      if (lvl >= 3) {
        // Level 3: a gantry crane on legs at the shed's front corners (inside its footprint), its
        // beam out over the docks with a trolley and hook, floodlights on the legs and the roof
        for (const cu of [0.55, 8.25]) {
          box(cu, 0, 3.6, 0.2, 4.7, 0.2, crane);
          box(cu, 4.4, 2.3, 0.2, 0.3, 1.5, crane);
          box(cu - 0.15, 4.7, 3.5, 0.5, 0.2, 0.35, m.glow);
        }
        box(0.55, 4.4, 2.3, 7.9, 0.3, 0.3, crane);
        box(4.3, 4.1, 2.25, 0.5, 0.3, 0.4, ink);
        box(4.53, 2.6, 2.42, 0.04, 1.5, 0.04, ink);
        box(4.38, 2.4, 2.3, 0.34, 0.2, 0.28, crane);
        for (const mu of [1.2, 7.8]) {
          box(mu, 3.56, 8.2, 0.08, 1.4, 0.08, ink);
          box(mu - 0.2, 4.9, 8.0, 0.48, 0.18, 0.3, m.glow);
        }
      }
      sign('DEPOT', '#2bff88', '', 6.0, 3.0, 2.95, 2.8);
      plaque(4.5, 2.85, 3.57);
    } else {
      // Offices: a glass tower on a plinth, a lobby canopy, HQ on the crown
      g.add(Object.assign(new THREE.Mesh(unitBox, [m.tower, m.tower, m.roof, m.roof, m.tower, m.tower]), { castShadow: true }));
      const tower = g.children[g.children.length - 1] as THREE.Mesh;
      const [tx, tz] = site.at(4.5, 5.7);
      tower.position.set(tx, S + 4.4, tz);
      tower.scale.set(4.2, 8.8, 4.2);
      box(2.3, 8.8, 3.5, 4.4, 0.25, 4.4, ink);
      if (lvl >= 2) {
        // Level 2: a taller crown (a plant room with a cap on the west half, still well under the
        // Emporium's roof), neon round the crown's edge and along the plant room's top
        box(2.5, 9.05, 4.0, 1.9, 0.9, 3.4, m.roof);
        box(2.7, 9.95, 4.4, 1.5, 0.5, 2.6, m.roof);
        box(2.3, 9.05, 3.5, 4.4, 0.06, 0.06, m.pink);
        box(2.3, 9.05, 7.84, 4.4, 0.06, 0.06, m.pink);
        box(2.3, 9.05, 3.5, 0.06, 0.06, 4.4, m.pink);
        box(6.64, 9.05, 3.5, 0.06, 0.06, 4.4, m.pink);
        box(2.5, 9.95, 4.0, 1.9, 0.05, 0.05, m.cyan);
      } else box(3.6, 9.05, 4.8, 1.8, 0.6, 1.8, m.roof);
      if (lvl >= 3) {
        // Level 3: a helipad (flat) on the east half of the crown, an antenna with a red light on
        // the plant room, and a glass bridge from a two-storey annex on the lobby's west end into
        // the tower (all on the lobby's footprint)
        const [hx, hz] = site.at(5.5, 5.7);
        b.add(place(cyl, hx, S + 9.06, hz, 0.95, 0.02, 0.95), pad);
        b.add(place(ring, hx, S + 9.075, hz, 1, 1, 1, -Math.PI / 2), padRing);
        box(5.08, 9.07, 5.25, 0.14, 0.012, 0.9, white);
        box(5.78, 9.07, 5.25, 0.14, 0.012, 0.9, white);
        box(5.2, 9.07, 5.63, 0.6, 0.012, 0.14, white);
        post(3.45, 5.7, 0.05, 1.0, ink, 10.45);
        box(3.4, 11.45, 5.65, 0.1, 0.1, 0.1, m.red);
        box(1.6, 1.6, 2.6, 1.2, 1.7, 1.0, m.store);
        box(1.65, 1.75, 2.58, 1.1, 1.3, 0.04, m.glass);
        box(1.55, 3.3, 2.55, 1.3, 0.12, 1.1, ink);
        box(2.8, 2.0, 2.85, 1.2, 0.75, 0.7, m.glass);
        box(2.8, 1.98, 2.83, 1.2, 0.05, 0.74, ink);
        box(2.8, 2.73, 2.83, 1.2, 0.05, 0.74, ink);
        box(4.0, 1.9, 2.8, 0.3, 0.95, 0.8, ink);
      }
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
      sign('OFFICES', PAL.cyan, '', lvl >= 3 ? 5.9 : 4.5, 2.2, 2.55, lvl >= 3 ? 3.0 : 3.2);
      plaque(2.4, 1.05, 2.57);
    }
    b.build(g);
  }

  return {
    /** Draw every big lot as the save has it, at its level (only the ones that changed are rebuilt) */
    show(s: TycoonSave) {
      let changed = false;
      s.lots.forEach((l, i) => {
        const p = LOT_PLACES[i];
        const lvl = placeLevel(s, p);
        const cap = l?.kind === 'superstore' ? Math.round(SUPERSTORE.capacity * capacityMul(s, p)) : capOf(s, p);
        const k = look(l, lvl, cap);
        if (shown[i] === k) return;
        shown[i] = k;
        draw(i, l, lvl, cap);
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
