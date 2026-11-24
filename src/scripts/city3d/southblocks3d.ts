/*
 * Endswood's blocks drawn (docs/south-plan.md Phase 2, step 2b; the data is southblocks.ts), a district loaded as you
 * approach (districts.ts `LAZY_DISTRICTS` id `south-blocks`), as sites (tilework.ts). Brutalist since
 * docs/brutalist-plan.md Phase 1 (the owner's ask, 2026-11-21): raw board-marked concrete in a cool grey, the wall
 * atlas's `brutal` band (deep balcony recesses between fins, the slab's edge at each floor, life in the recesses, rain
 * streaks), hard chamfered corners, the trim all concrete, each block's colour a stripe down its ends.
 *
 * - **The slabs and the Rampart**, a step at a time: walls (a glazed ground floor on the galleried side and the ends,
 *   concrete on the other), the steps' walls where a taller one meets a lower, roofs and parapets, sky gardens on the
 *   roofs (near only); the Rampart's archway (its soffit and its piers' faces); the galleries at every third floor
 *   (deck, concrete front, a warm strip light under it at night); balconies with concrete fronts on the slabs'
 *   other sides (near only); the block's colour a stripe down each end.
 * - **The towers**: their walls, a ledge ring every third floor, the plant room (a concrete box) on top, the beacon,
 *   the tower's colour a stripe down its face away from The Core.
 * - **The cores**: concrete towers with a lit stair slot down their outer faces.
 * - **The bridges**: covered, a band of glass along each side lit warm at night, a strip light under each.
 * - **The podium deck** on its columns; **Teasel House's** hoarded half (boarded windows, hoarding at the ground) and
 *   Bunker Sound's door under it.
 *
 * - **The shops you own under the deck** (docs/brutalist-plan.md Phase 7b): seen through the glass once they're yours,
 *   drawn from the save (`DECK_LOOK`, `registerDeckShops()`): The Wash House's washers and dryers (as many as its level
 *   has), their drums turning; Deck Stores' shelves stocked in its goods' colours, as full as they are. Near only.
 *
 * The blocks stand level on their own plinths (their bases): their Batches aren't lifted onto the rolling ground
 * (`build()`'s `lift`). Their solids are solids.ts's (`BLOCK_SOLIDS`).
 */
import * as THREE from 'three';
import type { Tick } from './world';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, toon } from './kit';
import { ATLAS, kit, type Frame } from './infill';
import { site } from './tilework';
import { PLANT } from './palette';
import { shift } from './streetfaces';
import {
  ACCENTS, BLOCKS, BRIDGES, BRIDGE_HALF, BUNKER, CAGE, CAGES, CONCRETE, CORES, PIERS, PIER_HALF, DECKS, GALLERY_W, GROUND_H, PARAPET, PLANT_H, BEACON_H,
  DECK_SHOPS, DECK_SHOP_DOORS, DECK_SHOP_NAMES, FLAT, LOBBIES, LOBBY as HALL, lobbyProps, PERCH, SKY_FLOORS, TOP_FLOOR, TOWER_HALF, TWIN_CORE, blockById, topOf, floorY, inBlock, lineLength, outward, pointAt, roofY, section, stepShape, storeysOf,
  type Block, type Cage, type Core, type Pt,
} from './southblocks';
import { CORE_GAP, DOOR_OUT, LANDING_H, SKY_LIFTS, STAIR, cageLevels, coreFloors, lobbyLiftDoor } from './southsky';
import { BALL_COURT, BAYS, BIKE_SHEDS, BIN_STORES, COLUMN_R, DECK_COLUMNS, DECK_PROPS, FRAME, SANDPIT, YARD_CARS, bayCorners, courtFence, thingCorners, type Thing } from './southyard';
import { COURTS, DECK_LOOK, DESIRE_LINES, GRASS, PLAY, landingPosts } from './southblocks';
import { CROWD_VIEW } from './character';
import { WASH } from './tycoon';
import { BANK, COVER, ROAD, STONE } from './palette';
import { parkedCars } from './cars';
import type { CarId } from './carspec';

export const SELF = import.meta.url;

type Rect = [number, number, number, number];
const WORLD: Frame = { M: new THREE.Matrix4(), w: 0, d: 0, L: [0, 0], t: [1, 0], n: [0, 1] };

/* ---------- Materials ---------- */

const CONC = toon(CONCRETE);
const CONC_DARK = toon('#54575c');
const ROOF = toon('#424448');
const PAVING = toon('#7e8085');
/** The galleries' and balconies' floors: a step lighter than the walls rising off them (R1: floor and wall told apart) */
const DECK_FLOOR = toon('#8b8d91');
const PLY = toon('#a3804f');
const HOARDING = toon('#55697f');
const DOOR = toon('#1b1820');
const GREEN = toon(PLANT.shrub);
const ACCENT: Record<keyof typeof ACCENTS, THREE.Material> = { orange: toon(ACCENTS.orange), teal: toon(ACCENTS.teal), mustard: toon(ACCENTS.mustard) };
/** Warm strip lights (under the galleries and bridges), the bridges' glass, the stair slots: dark glass by day (against the
 * grey concrete, not a tan band), lit warm at night */
const STRIP = neon('#ffcf86', 0.1, 1.25);
/** A tired tube: the odd link's light stuttering (still under reduced motion: kit.ts `lit()`) */
const STRIP_TIRED = neon('#ffcf86', 0.1, 1.25, 0.55);
const GLASS = lit(toon('#3b4656', { emissive: '#ffe2b4' }), 0, 0.95);
const SLOT = lit(toon('#323b48', { emissive: '#ffe0a6' }), 0, 0.9);
const BEACON = neon('#ff4a3a', 0.8, 2.2);
const BUNKER_NEON = neon('#ff3fb0', 0.6, 1.7);
// (brutalist: board-marked grey concrete, deep balcony recesses with life in them; docs/brutalist-plan.md Phase 1)
const WALL = ATLAS.wall.brutal;
/** The gallery sides: the flats' front doors and kitchen windows off the deck, tags, grime (the brutalist plan's polish) */
const WALL_DECK = ATLAS.wall.brutalDeck;
/** The entrance halls: the city's lobby glazing, warm and patchy at night (infill.ts `lobbyWarm`, Phase 6d) */
const LOBBY = ATLAS.ground.lobbyWarm;
/** The lobby band's height (downtown's `SHOP_H`); the ground floor's fascia over it to the first floor */
const LOBBY_H = 1.25;

/* ---------- Geometry ---------- */

/** A plain geometry ready to join a Batch: indexed, its uv dropped (the plain materials share one paint) */
function plain(g: THREE.BufferGeometry) {
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  if (!g.index) g.setIndex([...Array(g.getAttribute('position').count).keys()]);
  return g;
}
/** An upright quad from a to c, y0 to y1, facing n */
function quad(b: Batch, a: Pt, c: Pt, y0: number, y1: number, n: Pt, m: THREE.Material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], y0, a[1], c[0], y0, c[1], c[0], y1, c[1], a[0], y1, a[1]], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1]], 3));
  // (wound to face n)
  const front = (c[0] - a[0]) * n[1] - (c[1] - a[1]) * n[0] > 0;
  g.setIndex(front ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  b.add(g, m);
}
/** A flat outline at y facing up (or down), its triangles split so none is longer than `most` */
function flat(b: Batch, ring: Pt[], y: number, m: THREE.Material, up = true, most = 12) {
  const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
  if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const pos: number[] = [];
  // (a long thin triangle halved across its longest edge till none is longer than `most`: a few pieces, not a swarm)
  const emit = (p: THREE.Vector2, q: THREE.Vector2, r: THREE.Vector2, depth: number) => {
    const [pq, qr, rp] = [p.distanceTo(q), q.distanceTo(r), r.distanceTo(p)];
    const longest = Math.max(pq, qr, rp);
    if (depth < 14 && longest > most) {
      if (longest === pq) {
        const m = p.clone().add(q).multiplyScalar(0.5);
        emit(p, m, r, depth + 1);
        emit(m, q, r, depth + 1);
      } else if (longest === qr) {
        const m = q.clone().add(r).multiplyScalar(0.5);
        emit(p, q, m, depth + 1);
        emit(p, m, r, depth + 1);
      } else {
        const m = r.clone().add(p).multiplyScalar(0.5);
        emit(p, q, m, depth + 1);
        emit(m, q, r, depth + 1);
      }
      return;
    }
    // (wound to face up or down: a triangle counter-clockwise in x, z faces down in three's y-up frame)
    const ccw = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x) > 0;
    for (const v of ccw === up ? [p, r, q] : [p, q, r]) pos.push(v.x, y, v.y);
  };
  for (const [i, j, k] of tris) emit(contour[i], contour[j], contour[k], 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from({ length: pos.length / 3 }, () => [0, up ? 1 : -1, 0]).flat(), 3));
  b.add(plain(g), m);
}
/** A box along a to c, `w` across (its middle `off` to the right of the line), y0 to y1, in pieces no longer than 10 */
function along(b: Batch, a: Pt, c: Pt, w: number, y0: number, y1: number, m: THREE.Material, off = 0) {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (l < 1e-3) return;
  const [tx, tz] = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
  const [rx, rz] = [-tz, tx];
  const n = Math.ceil(l / 10);
  for (let k = 0; k < n; k++) {
    const [s0, s1] = [(l * k) / n, (l * (k + 1)) / n];
    const mid: Pt = [a[0] + tx * (s0 + s1) * 0.5 + rx * off, a[1] + tz * (s0 + s1) * 0.5 + rz * off];
    b.add(plain(new THREE.BoxGeometry(s1 - s0, y1 - y0, w).rotateY(-Math.atan2(tz, tx)).translate(mid[0], (y0 + y1) / 2, mid[1])), m);
  }
}
/** A low wall along a line as its faces (outer, top, inner; its ends left open): `t` thick, its outer face on the
 * line moved `out` to the line's right (negative: left), facing that way */
function upstand(b: Batch, pts: Pt[], out: number, t: number, y0: number, y1: number, m: THREE.Material) {
  const s = Math.sign(out) || 1;
  const [o, i] = [shift(pts, out), shift(pts, out - s * t)];
  for (let k = 1; k < pts.length; k++) {
    const [a, c] = [pts[k - 1], pts[k]];
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
    const n: Pt = [(-(c[1] - a[1]) / l) * s, ((c[0] - a[0]) / l) * s];
    quad(b, o[k - 1], o[k], y0, y1, n, m);
    quad(b, i[k - 1], i[k], y0, y1, [-n[0], -n[1]], m);
    flat(b, [o[k - 1], o[k], i[k], i[k - 1]], y1, m);
  }
}
/** A flat strip along a line, `w` wide round the line moved `off` to its right, at y, facing up or down */
function stripAlong(b: Batch, pts: Pt[], off: number, w: number, y: number, m: THREE.Material, up = false) {
  const [p, q] = [shift(pts, off - w / 2), shift(pts, off + w / 2)];
  for (let k = 1; k < pts.length; k++) flat(b, [p[k - 1], p[k], q[k], q[k - 1]], y, m, up);
}
/** Each segment of a line, a to c */
function pairs(pts: Pt[], each: (a: Pt, c: Pt) => void) {
  for (let k = 1; k < pts.length; k++) each(pts[k - 1], pts[k]);
}
/** An upstand's two open ends closed (as `upstand()` draws it: its outer face `out` right of the line, `t` thick) */
function capEnds(b: Batch, pts: Pt[], out: number, t: number, y0: number, y1: number, m: THREE.Material) {
  if (pts.length < 2) return;
  const s = Math.sign(out) || 1;
  const [o, i] = [shift(pts, out), shift(pts, out - s * t)];
  const dir = (a: Pt, c: Pt): Pt => {
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
    return [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
  };
  const [t0, t1] = [dir(pts[0], pts[1]), dir(pts[pts.length - 2], pts[pts.length - 1])];
  const last = pts.length - 1;
  quad(b, o[0], i[0], y0, y1, [-t0[0], -t0[1]], m);
  quad(b, i[last], o[last], y0, y1, t1, m);
}
/** A line's length */
const runLength = (pts: Pt[]) => pts.slice(1).reduce((d, p, k) => d + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0);
/** The point `d` along a line and the line's direction there */
function pointAlong(pts: Pt[], d: number): [Pt, Pt] {
  for (let k = 1; k < pts.length; k++) {
    const [a, c] = [pts[k - 1], pts[k]];
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
    if (d <= l || k === pts.length - 1) {
      const f = Math.min(1, d / l);
      return [[a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f], [(c[0] - a[0]) / l, (c[1] - a[1]) / l]];
    }
    d -= l;
  }
  return [pts[0], [1, 0]];
}
/** A prism: an outline stood up from y0 to y1, walls facing out, its top capped */
function prism(b: Batch, ring: Pt[], y0: number, y1: number, m: THREE.Material, cap: THREE.Material = m) {
  ring.forEach((p, i) => quad(b, p, ring[(i + 1) % ring.length], y0, y1, outward(ring, i), m));
  flat(b, ring, y1, cap);
}
/** A ring's bounding rect, padded */
const rectOf = (pts: Pt[], pad: number): Rect => [Math.min(...pts.map((p) => p[0])) - pad, Math.min(...pts.map((p) => p[1])) - pad, Math.max(...pts.map((p) => p[0])) + pad, Math.max(...pts.map((p) => p[1])) + pad];
/** How far along a line its nearest point to p is */
function alongOf(pts: Pt[], p: Pt) {
  let [best, at, d] = [Infinity, 0, 0];
  for (let i = 1; i < pts.length; i++) {
    const [a, c] = [pts[i - 1], pts[i]];
    const [vx, vz] = [c[0] - a[0], c[1] - a[1]];
    const l2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / l2));
    const e = Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
    if (e < best) [best, at] = [e, d + Math.sqrt(l2) * t];
    d += Math.sqrt(l2);
  }
  return at;
}
/** A line offset to its right by `d` round its ring's outward side: the outline grown `d` */
const grow = (ring: Pt[], d: number): Pt[] => ring.map((p, i) => {
  const [n0, n1] = [outward(ring, (i - 1 + ring.length) % ring.length), outward(ring, i)];
  const [mx, mz] = [n0[0] + n1[0], n0[1] + n1[1]];
  const ml = Math.hypot(mx, mz) || 1;
  const k = d / Math.max(0.4, (mx * n1[0] + mz * n1[1]) / ml);
  return [p[0] + (mx / ml) * k, p[1] + (mz / ml) * k];
});

/** A roof's parapet along a to c (facing n): its outer face over the wall's, its inner face and top */
function parapet(b: Batch, a: Pt, c: Pt, n: Pt, top: number) {
  const t = 0.16;
  const [ai, ci]: Pt[] = [[a[0] - n[0] * t, a[1] - n[1] * t], [c[0] - n[0] * t, c[1] - n[1] * t]];
  quad(b, a, c, top, top + PARAPET, n, CONC);
  quad(b, ai, ci, top, top + PARAPET, [-n[0], -n[1]], CONC);
  flat(b, [a, c, ci, ai], top + PARAPET, CONC);
}

/** A block's colour: a stripe `STRIPE_W` wide down the middle of a face, from `y0` to `y1`, standing just off it */
const STRIPE_W = 1.6;
function stripe(b: Batch, a: Pt, c: Pt, n: Pt, y0: number, y1: number, m: THREE.Material) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (len < STRIPE_W + 0.4) return;
  const t: Pt = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
  const mid: Pt = [(a[0] + c[0]) / 2 + n[0] * 0.012, (a[1] + c[1]) / 2 + n[1] * 0.012];
  const h = STRIPE_W / 2;
  quad(b, [mid[0] - t[0] * h, mid[1] - t[1] * h], [mid[0] + t[0] * h, mid[1] + t[1] * h], y0, y1, n, m);
}

/** A gallery's line in runs, broken where a core stands out from it (the Rampart's: the way into its landing) */
function openRuns(blk: Block, part: Pt[]): Pt[][] {
  const cores = CORES.filter((c) => c.of === blk.id && blk.kind === 'rampart').map((c) => alongOf(blk.spine!, c.at));
  if (!cores.length) return [part];
  const runs: Pt[][] = [[]];
  for (const p of part) {
    const d = alongOf(blk.spine!, p);
    if (cores.some((c) => Math.abs(c - d) < CORE_GAP / 2 + 0.2)) {
      if (runs[runs.length - 1].length) runs.push([]);
    } else runs[runs.length - 1].push(p);
  }
  return runs.filter((r) => r.length > 1);
}

/* ---------- A slab and the Rampart, a step at a time ---------- */

const accentOf = (b: Block) => (b.accent ? ACCENT[b.accent] : CONC);
const sideOf = (b: Block) => (b.galleries === 'right' ? 1 : -1);

/** A rod from p to q (x, y, z), radius r, `sides` round */
function rod(b: Batch, p: [number, number, number], q: [number, number, number], r: number, m: THREE.Material, sides = 6) {
  const v = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  const len = v.length();
  if (len < 1e-3) return;
  const g = new THREE.CylinderGeometry(r, r, len, sides);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()));
  g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
  b.add(plain(g), m);
}
/** A block's id hashed to a small number (which of its ends gets the ducts, which floors the washing) */
const hashOf = (id: string) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7);

/**
 * Pipes and kit on the walls (docs/brutalist-plan.md Phase 4): on a block's open end, a bundle of three ducts up the
 * face beside its stripe (jogging aside at a gallery floor, over the parapet onto the roof), brackets every other
 * storey and joints every third (near), or, on the other end, the rubbish chute down its gallery-side corner with a
 * hopper at each sky floor and its bin hatch at the foot. Phones: the ducts and the chute only.
 */
function drawEndKit(b: Batch, blk: Block, a: Pt, c: Pt, n: Pt, base: number, top: number, galleryLine: Pt[], ducts: boolean, low: boolean) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (len < 4) return;
  const t: Pt = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
  const mid: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  // (which way along the face is away from the galleries)
  const near = (q: Pt) => Math.min(...galleryLine.map((g) => Math.hypot(g[0] - q[0], g[1] - q[1])));
  const away = near([mid[0] + t[0], mid[1] + t[1]]) > near([mid[0] - t[0], mid[1] - t[1]]) ? 1 : -1;
  const at = (along: number, out: number): Pt => [mid[0] + t[0] * along + n[0] * out, mid[1] + t[1] * along + n[1] * out];
  if (ducts) {
    const o = away * (STRIPE_W / 2 + 0.75);
    const jogY = floorY(base, SKY_FLOORS.find((f) => floorY(base, f) < top - 2) ?? 3) + 0.4;
    const radii = [0.14, 0.1, 0.08];
    radii.forEach((r, k) => {
      const s0 = o + away * k * 0.34;
      const s1 = s0 + away * 0.6;
      const out = 0.22 + r;
      const [p0, p1] = [at(s0, out), at(s1, out)];
      const y0 = base + 0.35;
      // (up, a jog aside at the gallery floor, up again, over the parapet and down onto the roof)
      rod(b, [p0[0], y0, p0[1]], [p0[0], jogY, p0[1]], r, CONC_DARK);
      rod(b, [p0[0], jogY, p0[1]], [p1[0], jogY + 0.6, p1[1]], r, CONC_DARK);
      rod(b, [p1[0], jogY + 0.6, p1[1]], [p1[0], top + PARAPET + 0.35, p1[1]], r, CONC_DARK);
      const inner = at(s1, -0.9);
      rod(b, [p1[0], top + PARAPET + 0.35, p1[1]], [inner[0], top + PARAPET + 0.35, inner[1]], r, CONC_DARK);
      rod(b, [inner[0], top + PARAPET + 0.35, inner[1]], [inner[0], top, inner[1]], r, CONC_DARK);
    });
    if (!low)
      b.detail(() => {
        const span = 0.34 * (radii.length - 1);
        for (let y = base + 1.4; y < top; y += 2) {
          const s1 = y > jogY + 0.6 ? o + away * 0.6 : o;
          // (a bracket: a steel strap across the bundle, back to the wall)
          const [q0, q1] = [at(s1 - away * 0.15, 0.3), at(s1 + away * (span + 0.15), 0.3)];
          along(b, q0, q1, 0.06, y, y + 0.08, RAIL);
          along(b, at(s1 + (away * span) / 2, 0.012), at(s1 + (away * span) / 2, 0.3), 0.06, y, y + 0.08, RAIL);
        }
        for (let y = base + 2.5; y < top; y += 3)
          radii.forEach((r, k) => {
            const s1 = (y > jogY + 0.6 ? o + away * 0.6 : o) + away * k * 0.34;
            const p = at(s1, 0.22 + r);
            rod(b, [p[0], y, p[1]], [p[0], y + 0.1, p[1]], r + 0.03, RAIL);
          });
      });
  } else {
    // The rubbish chute: a square duct down the gallery-side corner of the face, a hopper at each sky floor
    const sc = -away * (len / 2 - 0.55);
    const p = at(sc, 0.3);
    b.add(plain(new THREE.BoxGeometry(0.5, top - base - 0.6, 0.5).rotateY(-Math.atan2(t[1], t[0])).translate(p[0], (base + 0.6 + top) / 2, p[1])), CONC_DARK);
    if (!low)
      b.detail(() => {
        for (const f of SKY_FLOORS) {
          const y = floorY(base, f);
          if (y > top - 0.5) break;
          const h = at(sc, 0.62);
          b.add(plain(new THREE.BoxGeometry(0.42, 0.35, 0.22).rotateY(-Math.atan2(t[1], t[0])).translate(h[0], y + 0.55, h[1])), RAIL);
        }
        // (the bin hatch at its foot, a dark door)
        quad(b, at(sc - 0.35, 0.56), at(sc + 0.35, 0.56), base, base + 0.6, n, DOOR);
      });
  }
}

/**
 * The flats' kit (docs/brutalist-plan.md Phase 4), near only, not on phones: an air-con unit hung on the odd balcony
 * front (or the wall, where there are none), washing on lines along the galleries, water tanks and an aerial on the
 * roof
 */
function drawFlatKit(b: Batch, blk: Block, part: Pt[], st: Block['steps'][number], base: number, top: number, s: number) {
  const h0 = hashOf(blk.id);
  const len = runLength(part);
  const back = blk.kind === 'slab' ? blk.depth! / 2 + 0.55 + 0.08 : blk.depth! / 2;
  for (let f = 1; f < st.storeys; f++) {
    const y = floorY(base, f);
    for (let d = 1.5; d < len - 1; d += 2.4) {
      if ((h0 + f * 7 + Math.round(d) * 3) % 6) continue;
      const [p, t] = pointAlong(part, d);
      const r: Pt = [-t[1] * -s, t[0] * -s];
      const c: Pt = [p[0] + r[0] * (back + 0.14), p[1] + r[1] * (back + 0.14)];
      b.add(plain(new THREE.BoxGeometry(0.55, 0.36, 0.24).rotateY(-Math.atan2(t[1], t[0])).translate(c[0], y + 0.12, c[1])), DISH);
      b.add(plain(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 8).rotateX(Math.PI / 2).rotateY(-Math.atan2(t[1], t[0]) + Math.PI / 2).translate(c[0] + r[0] * 0.125, y + 0.12, c[1] + r[1] * 0.125)), RAIL);
    }
  }
  // Washing on lines along the galleries, just inside the front, on the odd stretch
  for (const f of SKY_FLOORS.filter((q) => q < st.storeys)) {
    const y = floorY(base, f);
    const off = s * (blk.depth! / 2 + GALLERY_W - 0.3);
    for (let d = 2; d < len - 3; d += 6) {
      if ((h0 + f * 5 + Math.round(d)) % 3) continue;
      const [p0, t] = pointAlong(part, d);
      const [p1] = pointAlong(part, Math.min(len - 1, d + 3.2));
      const r: Pt = [-t[1], t[0]];
      const [a, c]: Pt[] = [[p0[0] + r[0] * off, p0[1] + r[1] * off], [p1[0] + r[0] * off, p1[1] + r[1] * off]];
      along(b, a, c, 0.015, y + 1.28, y + 1.3, RAIL);
      for (const q of [a, c]) b.add(plain(new THREE.BoxGeometry(0.04, 0.5, 0.04).translate(q[0], y + 1.04, q[1])), RAIL);
      const n = Math.max(2, Math.floor(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.45));
      for (let k = 1; k < n; k++) {
        const q: Pt = [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n];
        const tall = 0.22 + ((h0 + k * 3 + f) % 3) * 0.08;
        const paint = (h0 + k + f) % 5 === 0 ? DISH : TAG_PAINT[(h0 + k * 2 + f) % TAG_PAINT.length];
        b.add(plain(new THREE.BoxGeometry(0.3, tall, 0.02).rotateY(-Math.atan2(t[1], t[0])).translate(q[0], y + 1.28 - tall / 2, q[1])), paint);
      }
    }
  }
  // Water tanks on legs, and an aerial, in the middle of the roof
  const [m, t] = pointAlong(part, len / 2);
  for (const k of [-1, 1]) {
    const q: Pt = [m[0] + t[0] * k * 1.1, m[1] + t[1] * k * 1.1];
    for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) b.add(plain(new THREE.BoxGeometry(0.08, 0.5, 0.08).translate(q[0] + dx, top + 0.25, q[1] + dz)), RAIL);
    b.add(plain(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 10).translate(q[0], top + 0.95, q[1])), CONC_DARK);
    b.add(plain(new THREE.CylinderGeometry(0.58, 0.58, 0.06, 10).translate(q[0], top + 1.43, q[1])), ROOF);
  }
  const ae: Pt = [m[0] - t[0] * 3, m[1] - t[1] * 3];
  rod(b, [ae[0], top, ae[1]], [ae[0], top + 2.2, ae[1]], 0.035, RAIL, 4);
  for (const [y, w] of [[1.5, 0.7], [1.8, 0.55], [2.05, 0.4]]) rod(b, [ae[0] - t[1] * w, top + y, ae[1] + t[0] * w], [ae[0] + t[1] * w, top + y, ae[1] - t[0] * w], 0.02, RAIL, 4);
}

function drawStep(b: Batch, blk: Block, i: number, low: boolean) {
  const k = kit(b, WORLD);
  const st = blk.steps[i];
  const shape = stepShape(blk, st);
  const { ring, tags } = shape;
  const base = blk.base;
  const top = roofY(base, st.storeys);
  const acc = accentOf(blk);
  const galleryTag = blk.galleries === 'right' ? 'right' : 'left';
  const arch = blk.arch && Math.abs(blk.arch.from - st.from) < 1e-6 ? blk.arch : null;
  const inRefit = (p: Pt) => !!blk.refit && alongOf(blk.spine!, p) > blk.refit.from && alongOf(blk.spine!, p) < blk.refit.to;
  let u = (i * 7.3) % 1;
  k.all(() => {
    ring.forEach((a, j) => {
      const c = ring[(j + 1) % ring.length];
      const n = outward(ring, j);
      const tag = tags[j];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const u0 = u;
      u += len / WALL.tw;
      // Where this step meets the next: the taller one's wall from the lower's roof
      if ((tag === 'start' && shape.cutStart) || (tag === 'end' && shape.cutEnd)) {
        const other = blk.steps[tag === 'start' ? i - 1 : i + 1];
        const otherTop = roofY(base, other.storeys);
        if (top > otherTop) k.wall(WALL, a, c, otherTop, top, n, u0, other.storeys);
        // (the archway's piers: its faces under it, from each side)
        if (arch) quad(b, c, a, base, base + arch.clear, [-n[0], -n[1]], CONC);
        return;
      }
      const mid: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      const refit = inRefit(mid);
      const y0 = arch ? base + arch.clear : base;
      if (!arch) {
        // The ground floor: glazed on the galleried side and round the ends (the entrances), concrete on the other
        const glazed = tag === galleryTag || tag === 'start' || tag === 'end' || tag === 'corner';
        if (refit) along(b, a, c, 0.1, base, base + GROUND_H, HOARDING, -0.05 - 0.006);
        else if (glazed) {
          k.wall(LOBBY, a, c, base, base + LOBBY_H, n, u0 * 3);
          quad(b, a, c, base + LOBBY_H, base + GROUND_H, n, CONC_DARK);
        } else quad(b, a, c, base, base + GROUND_H, n, CONC);
      } else quad(b, a, c, y0, base + GROUND_H + 2 * 1, n, CONC);
      const upper = arch ? floorY(base, 3) : base + GROUND_H;
      if (refit) quad(b, a, c, upper, top, n, CONC_DARK);
      else k.wall(tag === galleryTag ? WALL_DECK : WALL, a, c, upper, top, n, u0, 1);
      // The parapet over it (its outer face the wall's, carried up)
      parapet(b, a, c, n, top);
      // Its colour: a bold stripe down the middle of each end, the block told apart by it
      if (tag === 'start' || tag === 'end') stripe(b, a, c, n, upper, top + PARAPET, acc);
      // Pipes and kit on its ends (docs/brutalist-plan.md Phase 4): ducts up one end of most blocks, the rubbish chute
      // down the other
      if ((tag === 'start' || tag === 'end') && blk.kind !== 'tower' && !refit) {
        const ductEnd = hashOf(blk.id) % 2 ? 'start' : 'end';
        if (tag === ductEnd ? hashOf(blk.id) % 5 !== 0 : true) drawEndKit(b, blk, a, c, n, base, top, shift(section(blk.spine!, st.from, st.to), sideOf(blk) * (blk.depth! / 2 + GALLERY_W)), tag === ductEnd, low);
      }
    });
    // Where it's taller than its neighbour, the parapet along that cut too
    ring.forEach((a, j) => {
      const tag = tags[j];
      if (!((tag === 'start' && shape.cutStart) || (tag === 'end' && shape.cutEnd))) return;
      const other = blk.steps[tag === 'start' ? i - 1 : i + 1];
      if (top > roofY(base, other.storeys)) parapet(b, a, ring[(j + 1) % ring.length], outward(ring, j), top);
    });
    flat(b, ring, top - 0.002, ROOF);
    if (arch) flat(b, ring, base + arch.clear, CONC_DARK, false);
  });

  // The galleries along its galleried side at each sky floor it rises past: deck, accent front, a strip light under it
  const s = sideOf(blk);
  const part = section(blk.spine!, st.from, st.to);
  const inner = shift(part, (s * blk.depth!) / 2);
  const outer = shift(part, s * (blk.depth! / 2 + GALLERY_W));
  for (const f of SKY_FLOORS.filter((q) => q < st.storeys)) {
    const y = floorY(base, f);
    const front = s * (blk.depth! / 2 + GALLERY_W);
    const runs = openRuns(blk, part);
    k.all(() => {
      const deck = [...inner, ...[...outer].reverse()];
      flat(b, deck, y, DECK_FLOOR);
      flat(b, deck, y - 0.16, CONC_DARK, false);
      // (the front: a solid concrete upstand, its outer face on the gallery's edge; open where a core stands out from
      // it, southsky.ts `CORE_GAP`)
      for (const run of runs) {
        upstand(b, run, front, 0.12, y - 0.16, y + 0.62, CONC);
        // (R1: a coping a little wider than the upstand, in the darker concrete, and each run's ends closed)
        pairs(run, (a, c) => along(b, a, c, 0.18, y + 0.62, y + 0.67, CONC_DARK, front - s * 0.06));
        capEnds(b, run, front, 0.12, y - 0.16, y + 0.62, CONC);
      }
    });
    // R1's fine trims, near only: the slab joints across the floor (about 1.2 m), a skirting where the floor meets the
    // wall (5 mm off it), a drip under the deck's front edge
    b.detail(() => {
      const len = runLength(part);
      const n = Math.max(1, Math.round(len / 1.2));
      for (let j = 1; j < n; j++) {
        const [p, t] = pointAlong(part, (len * j) / n);
        const r: Pt = [-t[1], t[0]];
        const [ia, ob] = [(s * blk.depth!) / 2 + s * 0.02, front - s * 0.14];
        const a: Pt = [p[0] + r[0] * ia, p[1] + r[1] * ia];
        const c: Pt = [p[0] + r[0] * ob, p[1] + r[1] * ob];
        along(b, a, c, 0.03, y, y + 0.006, CONC_DARK);
      }
      pairs(part, (a, c) => along(b, a, c, 0.03, y, y + 0.1, CONC_DARK, (s * blk.depth!) / 2 + s * 0.02));
      for (const run of runs) pairs(run, (a, c) => along(b, a, c, 0.05, y - 0.24, y - 0.16, CONC_DARK, front - s * 0.03));
    });
    stripAlong(b, part, s * (blk.depth! / 2 + GALLERY_W - 0.3), 0.08, y - 0.18, STRIP);
  }

  // Balconies on its other side (the slabs': the Rampart's road side has none), solid concrete fronts
  if (!low && blk.kind === 'slab')
    b.detail(() => {
      const face = shift(part, (-s * blk.depth!) / 2);
      const edge = shift(part, -s * (blk.depth! / 2 + 0.55));
      for (let f = 1; f < st.storeys; f++) {
        const y = floorY(base, f);
        const pts = edge.filter((p) => !inRefit(p));
        if (pts.length < 2) continue;
        const deck = [...face.filter((p) => !inRefit(p)), ...[...pts].reverse()];
        flat(b, deck, y + 0.04, DECK_FLOOR);
        upstand(b, part.filter((p) => !inRefit(p)), -s * (blk.depth! / 2 + 0.55), 0.08, y - 0.04, y + 0.45, CONC);
      }
    });
  // Teasel's hoarded half: its windows boarded
  if (blk.refit && !low)
    b.detail(() => {
      ring.forEach((a, j) => {
        const c = ring[(j + 1) % ring.length];
        if (!inRefit([(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]) || tags[j] === 'corner') return;
        for (let f = 1; f < st.storeys; f++) {
          const y = floorY(base, f);
          along(b, a, c, 0.03, y + 0.2, y + 0.8, PLY, -0.02);
        }
      });
    });
  // The flats' kit: air-con units, washing on the galleries, water tanks and an aerial (the brutalist plan's Phase 4)
  if (!low) b.detail(() => drawFlatKit(b, blk, part, st, base, top, s));
  // Satellite dishes clustered on its roof's edge, the side away from the galleries (the brutalist plan's grit)
  if (!low)
    b.detail(() => {
      const edge = shift(part, -s * (blk.depth! / 2 - 0.5));
      for (let q = 2; q < edge.length - 1; q += 5)
        for (let j = 0; j < 3; j++) {
          const p0 = edge[q];
          const off: Pt = [p0[0] + (j - 1) * 0.55, p0[1] + ((q + j) % 2) * 0.3];
          dish(b, off, top + PARAPET, (q * 7 + j * 3) % 6);
        }
    });
  // Sky gardens: planters along its roof, by the galleried side
  if (!low)
    b.detail(() => {
      const row = shift(part, s * (blk.depth! / 2 - 0.7));
      for (let q = 2; q < row.length - 2; q += 3) {
        along(b, row[q - 1], row[q], 0.7, top, top + 0.35, CONC);
        along(b, row[q - 1], row[q], 0.6, top + 0.35, top + 0.6, GREEN);
      }
    });
}

/* ---------- The towers ---------- */

function drawTower(b: Batch, t: Block, low: boolean) {
  const k = kit(b, WORLD);
  const ring = t.foot;
  const base = t.base;
  const top = roofY(base, storeysOf(t));
  const acc = accentOf(t);
  const c = t.foot.reduce((m, p) => [m[0] + p[0] / t.foot.length, m[1] + p[1] / t.foot.length] as Pt, [0, 0] as Pt);
  // (its colour's face: the one looking away from The Core between the twins)
  const core = centre(blockById('twin-core').foot);
  let away = 0;
  let best = -Infinity;
  ring.forEach((a, j) => {
    const n = outward(ring, j);
    const d = n[0] * (c[0] - core[0]) + n[1] * (c[1] - core[1]);
    if (d > best) [best, away] = [d, j];
  });
  let u = 0;
  k.all(() => {
    ring.forEach((a, j) => {
      const e = ring[(j + 1) % ring.length];
      const n = outward(ring, j);
      const u0 = u;
      u += Math.hypot(e[0] - a[0], e[1] - a[1]) / WALL.tw;
      k.wall(LOBBY, a, e, base, base + LOBBY_H, n, u0 * 3);
      quad(b, a, e, base + LOBBY_H, base + GROUND_H, n, CONC_DARK);
      k.wall(WALL, a, e, base + GROUND_H, top, n, u0, 1);
      parapet(b, a, e, n, top);
      if (j === away) stripe(b, a, e, n, base + GROUND_H, top + PARAPET, acc);
    });
    flat(b, ring, top - 0.002, ROOF);
    // A ledge ring every third floor, all concrete: a slab's edge standing out
    const out = grow(ring, 0.35);
    for (const f of SKY_FLOORS) {
      const y = floorY(base, f);
      out.forEach((p, j) => quad(b, p, out[(j + 1) % out.length], y - 0.12, y + 0.14, outward(out, j), CONC));
      // (its top and underside a band round the walls, not across the tower: Degen's flat is inside, Phase 7a)
      out.forEach((p, j) => {
        const band = [p, out[(j + 1) % out.length], ring[(j + 1) % ring.length], ring[j]];
        flat(b, band, y + 0.14, CONC);
        flat(b, band, y - 0.12, CONC_DARK, false);
      });
    }
    // The plant room: a plain concrete box set back on the roof, its corners cut as the tower's, and its beacon
    prism(b, grow(ring, -TOWER_HALF * 0.3), top, top + PLANT_H, CONC, ROOF);
    // (a cluster of dishes round the plant room's foot, near only, not on phones)
    if (!low)
      b.detail(() => {
        ring.forEach((p, j) => {
          if (j % 2) return;
          const at: Pt = [c[0] + (p[0] - c[0]) * 0.82, c[1] + (p[1] - c[1]) * 0.82];
          dish(b, at, top, j % 6);
        });
      });
    b.add(plain(new THREE.CylinderGeometry(0.05, 0.05, BEACON_H, 6).translate(c[0], top + PLANT_H + BEACON_H / 2, c[1])), CONC_DARK);
    b.add(plain(new THREE.SphereGeometry(0.13, 8, 6).translate(c[0], top + PLANT_H + BEACON_H, c[1])), BEACON);
  });
}

/* ---------- The cores ---------- */

/**
 * A core: concrete, open at each landing (`landings`: the levels of its floors, a post at each corner), a lit stair slot
 * down each face turned away from what it serves; its lift's door at its foot
 */
function drawCore(b: Batch, ring: Pt[], base: number, top: number, at: Pt, from: Pt[], landings: number[], door: { x: number; z: number; yaw: number } | null, link: [Pt, Pt] | null = null) {
  const k = kit(b, WORLD);
  const cuts = [...landings].sort((p, q) => p - q);
  k.all(() => {
    // (solid between its landings, each landing's floor the cap of the stretch under it, its ceiling the next one's
    // underside)
    let y0 = base;
    for (const y of [...cuts, Infinity]) {
      const y1 = Math.min(y, top);
      if (y1 - y0 > 0.05) {
        prism(b, ring, y0, y1, CONC, y1 === top ? ROOF : DECK_FLOOR);
        if (y0 > base) flat(b, ring, y0, CONC_DARK, false);
      }
      if (!Number.isFinite(y)) break;
      y0 = y + LANDING_H;
    }
    // The landings' corner posts (none in the link's doorway: southblocks.ts `landingPosts()`)
    const posts = landingPosts(ring, link);
    for (const y of cuts) for (const p of posts) b.add(plain(new THREE.BoxGeometry(0.3, LANDING_H, 0.3).translate(p[0], y + LANDING_H / 2, p[1])), CONC);
    // The stair slots, a stretch between each landing
    ring.forEach((a, j) => {
      const c = ring[(j + 1) % ring.length];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (len < 1.2) return;
      const n = outward(ring, j);
      const away = from.every((f) => (at[0] - f[0]) * n[0] + (at[1] - f[1]) * n[1] > -0.2 * Math.hypot(at[0] - f[0], at[1] - f[1]));
      if (!away) return;
      const m: Pt = [(a[0] + c[0]) / 2 + n[0] * 0.012, (a[1] + c[1]) / 2 + n[1] * 0.012];
      const t: Pt = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
      let s0 = base + 1.5;
      for (const y of [...cuts, top - 0.6]) {
        if (y - 0.3 > s0) quad(b, [m[0] - t[0] * 0.14, m[1] - t[1] * 0.14], [m[0] + t[0] * 0.14, m[1] + t[1] * 0.14], s0, y - 0.3, n, SLOT);
        s0 = y + LANDING_H + 0.3;
      }
    });
    // The lift's door at its foot: dark, a lit strip over it
    if (door) {
      const n: Pt = [-Math.sin(door.yaw), -Math.cos(door.yaw)];
      const t: Pt = [-n[1], n[0]];
      const f: Pt = [door.x - n[0] * (DOOR_OUT - 0.012), door.z - n[1] * (DOOR_OUT - 0.012)];
      const p = (s: number): Pt => [f[0] + t[0] * s, f[1] + t[1] * s];
      quad(b, p(-0.5), p(0.5), base, base + 1.25, n, DOOR);
      quad(b, p(-0.55), p(0.55), base + 1.3, base + 1.36, n, STRIP);
      // A sodium lamp over it on a bracket, orange at night (the brutalist plan's grit)
      const lamp: Pt = [f[0] + n[0] * 0.25, f[1] + n[1] * 0.25];
      b.add(plain(new THREE.BoxGeometry(0.3, 0.1, 0.18).translate(lamp[0], base + 1.62, lamp[1])), SODIUM);
      // ...near only: a puddle at its foot, a tag scrawled low on the wall by it, and the estate's noticeboard beside it
      // (the brutalist plan's Phase 5: a cork board in a steel frame on two posts, its notices pinned up)
      b.detail(() => {
        const nb: Pt = [f[0] + n[0] * 0.35 + t[0] * -1.35, f[1] + n[1] * 0.35 + t[1] * -1.35];
        const ry = -Math.atan2(t[1], t[0]);
        for (const s0 of [-0.42, 0.42]) b.add(plain(new THREE.BoxGeometry(0.06, 1.05, 0.06).translate(nb[0] + t[0] * s0, base + 0.52, nb[1] + t[1] * s0)), RAIL);
        b.add(plain(new THREE.BoxGeometry(0.96, 0.6, 0.05).rotateY(ry).translate(nb[0], base + 0.82, nb[1])), RAIL);
        b.add(plain(new THREE.BoxGeometry(0.86, 0.5, 0.052).rotateY(ry).translate(nb[0], base + 0.82, nb[1])), CORK);
        const hn = Math.abs(Math.round(door.x * 7 + door.z * 3));
        for (let q = 0; q < 5; q++) {
          const [u, v] = [-0.3 + ((hn + q * 3) % 7) * 0.1, 0.64 + ((hn + q * 5) % 4) * 0.08];
          const m = q % 3 === 0 ? DISH : TAG_PAINT[(hn + q) % TAG_PAINT.length];
          b.add(plain(new THREE.BoxGeometry(0.16, 0.2, 0.054).rotateY(ry).translate(nb[0] + t[0] * u, base + v, nb[1] + t[1] * u)), m);
        }
        const h = Math.abs(Math.round(door.x * 13 + door.z * 7));
        const c0: Pt = [f[0] + n[0] * (0.9 + (h % 3) * 0.2) + t[0] * (((h % 5) - 2) * 0.3), f[1] + n[1] * (0.9 + (h % 3) * 0.2) + t[1] * (((h % 5) - 2) * 0.3)];
        flat(b, Array.from({ length: 10 }, (_, i): Pt => {
          const q = (i / 10) * Math.PI * 2;
          return [c0[0] + Math.cos(q) * 0.55, c0[1] + Math.sin(q) * 0.3];
        }), base + 0.012, PUDDLE);
        if (h % 3 !== 2) {
          const paint = TAG_PAINT[h % TAG_PAINT.length];
          const s0 = 0.7 + (h % 4) * 0.08;
          for (let i = 0; i < 6; i++) {
            const [v0, v1] = [0.25 + ((h + i * 3) % 4) * 0.09, 0.3 + ((h + i * 5) % 4) * 0.09];
            quad(b, p(s0 + i * 0.13), p(s0 + i * 0.13 + 0.11), base + Math.min(v0, v1), base + Math.max(v0, v1) + 0.06, n, paint);
          }
        }
      });
    }
  });
}
/**
 * A service tower's top (docs/brutalist-plan.md Phase 2): a boiler house jutting out over its face away from its block,
 * a concrete box, and its flue beside it
 */
function drawBoilerHouse(b: Batch, c: Core, near: Pt) {
  const k = kit(b, WORLD);
  const l = Math.hypot(c.at[0] - near[0], c.at[1] - near[1]) || 1;
  const out: Pt = [(c.at[0] - near[0]) / l, (c.at[1] - near[1]) / l];
  const side: Pt = [-out[1], out[0]];
  const box = (m: Pt, hu: number, hv: number): Pt[] => [
    [m[0] + out[0] * hu + side[0] * hv, m[1] + out[1] * hu + side[1] * hv],
    [m[0] - out[0] * hu + side[0] * hv, m[1] - out[1] * hu + side[1] * hv],
    [m[0] - out[0] * hu - side[0] * hv, m[1] - out[1] * hu - side[1] * hv],
    [m[0] + out[0] * hu - side[0] * hv, m[1] + out[1] * hu - side[1] * hv],
  ];
  // (wound as the footprints are: anticlockwise seen from above)
  const ring = (pts: Pt[]) => (pts.reduce((a, p, i) => a + p[0] * pts[(i + 1) % 4][1] - pts[(i + 1) % 4][0] * p[1], 0) < 0 ? [...pts].reverse() : pts);
  const m: Pt = [c.at[0] + out[0] * (c.half * 0.55), c.at[1] + out[1] * (c.half * 0.55)];
  k.all(() => {
    prism(b, ring(box(m, c.half * 0.7, c.half * 0.55)), c.top - 0.02, c.top + 1.0, CONC, ROOF);
    const f: Pt = [c.at[0] - out[0] * (c.half * 0.45) + side[0] * (c.half * 0.5), c.at[1] - out[1] * (c.half * 0.45) + side[1] * (c.half * 0.5)];
    b.add(plain(new THREE.CylinderGeometry(0.13, 0.15, 1.8, 8).translate(f[0], c.top + 0.9, f[1])), CONC_DARK);
    b.add(plain(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 8).translate(f[0], c.top + 1.82, f[1])), CONC_DARK);
  });
}

/** A satellite dish on a short stand, turned `k` sixths of the way round, at its foot's place */
const DISH = toon('#d6d3cc');
function dish(b: Batch, at: Pt, y: number, k: number) {
  const a = (k / 6) * Math.PI * 2;
  b.add(plain(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4).translate(at[0], y + 0.17, at[1])), RAIL);
  b.add(plain(new THREE.SphereGeometry(0.26, 8, 4, 0, Math.PI * 2, 0, 0.9).rotateX(-Math.PI / 2 + 0.5).rotateY(a).translate(at[0], y + 0.42, at[1])), DISH);
}

/* ---------- The towers' stair cages (docs/brutalist-plan.md, the owner's pick: caged, walked) ---------- */

/** The cages' anti-climb mesh: dark, seen through (the frame's rails over it) */
const MESH = new THREE.MeshBasicMaterial({ color: '#4a5058', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });

/** A sloped slab: from (a0, y0) to (a1, y1) along the cage, b0 to b1 across, its top and underside, `t` thick */
function slope(b: Batch, g: Cage, a0: number, a1: number, b0: number, b1: number, y0: number, y1: number, t: number, m: THREE.Material) {
  const P = (a: number, bb: number, y: number) => {
    const p = g.at(a, bb);
    return [p[0], y, p[1]];
  };
  const pos = [
    // top (facing up and back along the rise)
    ...P(a0, b0, y0), ...P(a1, b0, y1), ...P(a1, b1, y1), ...P(a0, b1, y0),
    // underside
    ...P(a0, b0, y0 - t), ...P(a0, b1, y0 - t), ...P(a1, b1, y1 - t), ...P(a1, b0, y1 - t),
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // (wound so the top faces up whichever way the cage turns)
  const [p0, p1, p2] = [g.at(a0, b0), g.at(a1, b0), g.at(a1, b1)];
  const upCCW = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]) < 0;
  geo.setIndex(upCCW ? [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7] : [0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6]);
  geo.computeVertexNormals();
  b.add(geo, m);
}
/** A landing's slab in the cage: a0 to a1 out, b0 to b1 across, at y */
function cageSlab(b: Batch, g: Cage, a0: number, a1: number, b0: number, b1: number, y: number, m: THREE.Material) {
  const ring = [g.at(a0, b0), g.at(a1, b0), g.at(a1, b1), g.at(a0, b1)];
  flat(b, ring, y, m);
  flat(b, ring, y - 0.15, CONC_DARK, false);
}
/**
 * A tower's stair cage: concrete posts at its corners and halfway along, a ring beam at each landing, its roof; a
 * concrete spine wall between its two lanes; its flights (treads near only, not on phones), its landings with a strip
 * light under each (the odd one tired); anti-climb mesh round its open sides, left open at the foot by the tower: the
 * way in from the street
 */
function drawCage(b: Batch, g: Cage, low: boolean, tired: boolean) {
  const k = kit(b, WORLD);
  const { len, half, land, gap } = CAGE;
  const w = half - 0.12;
  const ys = cageLevels(g.id);
  const top = Math.max(g.top, ys[ys.length - 1] + 1.9);
  const corners: [number, number][] = [[0, -half], [len / 2, -half], [len, -half], [len, half], [len / 2, half], [0, half]];
  k.all(() => {
    // The frame
    for (const [a, bb] of corners) {
      const p = g.at(a, bb);
      b.add(plain(new THREE.BoxGeometry(0.24, top - g.base, 0.24).rotateY(-Math.atan2(g.out[1], g.out[0])).translate(p[0], (g.base + top) / 2, p[1])), CONC);
    }
    const beams = [...ys.slice(1), ...ys.slice(1).map((y, i) => (ys[i] + y) / 2), top];
    for (const y of beams) {
      along(b, g.at(0, -half), g.at(len, -half), 0.2, y - 0.2, y + 0.05, CONC);
      along(b, g.at(0, half), g.at(len, half), 0.2, y - 0.2, y + 0.05, CONC);
      along(b, g.at(len, -half), g.at(len, half), 0.2, y - 0.2, y + 0.05, CONC);
    }
    flat(b, [g.at(0, -half), g.at(len, -half), g.at(len, half), g.at(0, half)], top + 0.05, ROOF);
    // The spine wall between the lanes, from the street to the roof
    along(b, g.at(land, 0), g.at(len - land, 0), gap * 2, g.base, top, CONC);
    // The flights and the landings
    for (let i = 0; i + 1 < ys.length; i++) {
      const [y0, y1] = [ys[i], ys[i + 1]];
      const mid = (y0 + y1) / 2;
      slope(b, g, land, len - land, gap, w, y0, mid, 0.18, CONC);
      slope(b, g, len - land, land, -w, -gap, mid, y1, 0.18, CONC);
      cageSlab(b, g, len - land, len - 0.12, -w, w, mid, PAVING);
      cageSlab(b, g, 0.02, land, -w, w, y1, PAVING);
    }
  });
  // The landings' lights, under each (the odd cage's tired, stuttering)
  for (let i = 1; i < ys.length; i++) {
    const mid = (ys[i - 1] + ys[i]) / 2;
    along(b, g.at(len - land / 2, -w + 0.2), g.at(len - land / 2, w - 0.2), 0.08, mid - 0.2, mid - 0.16, tired ? STRIP_TIRED : STRIP);
  }
  // The treads: near only, not on phones
  if (!low)
    b.detail(() => {
      for (let i = 0; i + 1 < ys.length; i++) {
        const [y0, y1] = [ys[i], ys[i + 1]];
        const mid = (y0 + y1) / 2;
        const n = Math.round((len - 2 * land) / 0.27);
        for (let s = 0; s < n; s++) {
          const f = (s + 0.5) / n;
          for (const [b0, b1, ya, yb, dir] of [[gap, w, y0, mid, 1], [-w, -gap, mid, y1, -1]] as const) {
            const a = dir > 0 ? land + (len - 2 * land) * f : len - land - (len - 2 * land) * f;
            const y = ya + (yb - ya) * f;
            const p = g.at(a, (b0 + b1) / 2);
            b.add(plain(new THREE.BoxGeometry(0.06, 0.05, b1 - b0).rotateY(-Math.atan2(g.out[1], g.out[0])).translate(p[0], y + 0.03, p[1])), CONC_DARK);
          }
        }
      }
    });
  // The mesh: the far end and both long sides, from a head's height over the street at the way in, the rest from the foot
  const meshSide = (a0: number, a1: number, bb: number, y0: number, y1: number) => {
    const n: Pt = [g.side[0] * Math.sign(bb), g.side[1] * Math.sign(bb)];
    quad(b, g.at(a0, bb), g.at(a1, bb), y0, y1, n, MESH);
  };
  // (near only, not on phones: the mesh's bars, upright every 0.3, so it reads as a cage, the flights seen through it)
  if (!low)
    b.detail(() => {
      for (const bb of [-half, half])
        for (let a = 0.3; a < len; a += 0.3) {
          if (bb > 0 && a < land + 0.3) continue;
          const p = g.at(a, bb);
          b.add(plain(new THREE.BoxGeometry(0.025, top - g.base, 0.025).translate(p[0], (g.base + top) / 2, p[1])), CONC_DARK);
        }
    });
  meshSide(land + 0.3, len, half, g.base, top);
  meshSide(0, land + 0.3, half, g.base + 1.7, top);
  meshSide(0, len, -half, g.base, top);
  quad(b, g.at(len, -half), g.at(len, half), g.base, top, g.out, MESH);
}

const centre = (ring: Pt[]): Pt => [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];

/* ---------- The bridges, the podium deck, Bunker Sound's door ---------- */

const PUDDLE = toon('#1b2230');
/** The noticeboards' cork */
const CORK = toon('#8b6a45');
/** The towers' door lamps: sodium orange, off by day */
const SODIUM = neon('#ff9a3c', 0.08, 1.7);
const TAG_PAINT = ['#d94fb0', '#38c6d9', '#e6c13a', '#e0e0e0'].map((c) => toon(c));
function drawBridge(b: Batch, a: Pt, c: Pt, y: number, strip: THREE.Material | null = STRIP) {
  const k = kit(b, WORLD);
  const w = BRIDGE_HALF * 2;
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  k.all(() => {
    along(b, a, c, w, y - 0.2, y, CONC_DARK);
    // (R1, J1 part 2: the floor between the parapets a lighter paving over the dark slab, 6 mm up)
    along(b, a, c, w - 0.26, y, y + 0.006, DECK_FLOOR);
    for (const side of [-1, 1]) {
      along(b, a, c, 0.12, y, y + 0.6, CONC, side * (BRIDGE_HALF - 0.06));
      along(b, a, c, 0.04, y + 0.6, y + 1.5, GLASS, side * (BRIDGE_HALF - 0.1));
    }
    along(b, a, c, w + 0.12, y + 1.5, y + 1.68, CONC);
  });
  // (its lights under it and inside, down its ceiling; a dead one none)
  if (strip) {
    along(b, a, c, 0.1, y - 0.24, y - 0.2, strip);
    along(b, a, c, 0.1, y + 1.44, y + 1.48, strip);
  }
  if (l < 1.5) return;
  // ...near only: the glass's concrete mullions (wired glass, a pane each 1.2), a puddle or two, the odd tag
  b.detail(() => {
    const t: Pt = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
    const r: Pt = [-t[1], t[0]];
    const at = (s: number, o: number): Pt => [a[0] + t[0] * s + r[0] * o, a[1] + t[1] * s + r[1] * o];
    for (let s = 1.2; s < l - 0.3; s += 1.2) {
      for (const side of [-1, 1]) along(b, at(s - 0.04, side * (BRIDGE_HALF - 0.1)), at(s + 0.04, side * (BRIDGE_HALF - 0.1)), 0.07, y + 0.6, y + 1.5, CONC_DARK);
      // (the floor's joint under each mullion pair)
      along(b, at(s, -(BRIDGE_HALF - 0.13)), at(s, BRIDGE_HALF - 0.13), 0.03, y + 0.006, y + 0.012, CONC_DARK);
    }
    // (where, from a hash of the bridge's place: the same every time)
    const h = Math.abs(Math.round(a[0] * 7 + a[1] * 13 + y * 31));
    const puddle = (s: number, o: number, rx: number) => {
      const ring: Pt[] = Array.from({ length: 10 }, (_, i) => {
        const q = (i / 10) * Math.PI * 2;
        return at(s + Math.cos(q) * rx, o + Math.sin(q) * rx * 0.45);
      });
      flat(b, ring, y + 0.006, PUDDLE);
    };
    if (h % 3 !== 0) puddle(l * (0.3 + (h % 5) * 0.08), ((h % 7) - 3) * 0.12, 0.35 + (h % 4) * 0.08);
    if (l > 8 && h % 2 === 0) puddle(l * 0.75, -0.2, 0.3);
    // A tag on the inside of a parapet: a few strokes of one paint, low
    if (h % 4 !== 1) {
      const side = h % 2 ? 1 : -1;
      const s0 = l * (0.2 + (h % 6) * 0.1);
      const paint = TAG_PAINT[h % TAG_PAINT.length];
      const o = side * (BRIDGE_HALF - 0.125);
      for (let i = 0; i < 5; i++) {
        const [u0, u1] = [s0 + i * 0.16, s0 + i * 0.16 + 0.14];
        const [v0, v1] = [0.15 + ((h + i * 3) % 4) * 0.08, 0.2 + ((h + i * 5) % 4) * 0.08];
        along(b, at(u0, o), at(u1, o), 0.012, y + Math.min(v0, v1), y + Math.max(v0, v1) + 0.05, paint);
      }
    }
  });
}
/* ---------- The blocks' names on their bridges (the brutalist plan's polish: painted, stencilled, worn) ---------- */

/** The names a bridge's end can lead to: the blocks' own (made up), each a row of one painted texture */
const SIGN_NAMES = [...BLOCKS.map((q) => q.name.toUpperCase()), PERCH.name.toUpperCase(), 'TO LET'];
/**
 * (half-size and opaque, on the concrete's own colour: the names are small, and a sheet with no see-through parts bakes
 * to the lighter texture format; it stood the full-tier texture budget over at first: docs/brutalist-plan.md)
 */
const SIGN_ROW = 32;
const SIGN_W = 256;
const SIGN_BG = `#${CONCRETE.toString(16).padStart(6, '0')}`;
const SIGN_TEX = canvasTex(SIGN_W, SIGN_ROW * SIGN_NAMES.length, (c) => {
  c.fillStyle = SIGN_BG;
  c.fillRect(0, 0, SIGN_W, SIGN_ROW * SIGN_NAMES.length);
  SIGN_NAMES.forEach((name, i) => {
    const y = i * SIGN_ROW + SIGN_ROW / 2;
    c.font = `800 20px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#e8e4d8';
    c.fillText(name, SIGN_W / 2, y, SIGN_W - 8);
    // (stencil breaks across the letters, a drip or two under them, worn through here and there: the concrete showing)
    c.fillStyle = SIGN_BG;
    for (let x = 9; x < SIGN_W - 6; x += 12) c.fillRect(x, y - 1, 2, 2);
    for (let k = 0; k < 40; k++) c.fillRect((k * 97 + i * 31) % SIGN_W, y - 10 + ((k * 53) % 20), 2, 2);
    c.fillStyle = '#e8e4d8';
    for (let k = 0; k < 4; k++) c.fillRect(30 + ((k * 113 + i * 41) % 190), y + 8, 1, 4 + ((k * 7) % 5));
  });
});
const SIGN = toon('#ffffff', { map: SIGN_TEX });
/** A block's name painted on a bridge's parapet, inside, `s` along it from a to c, on its right (o) or left side */
function drawName(b: Batch, a: Pt, c: Pt, y: number, s: number, side: 1 | -1, name: string) {
  const row = SIGN_NAMES.indexOf(name.toUpperCase());
  if (row < 0) return;
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
  const t: Pt = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
  const r: Pt = [-t[1], t[0]];
  const o = side * (BRIDGE_HALF - 0.125);
  const w = 1.5;
  // (read left to right walking towards the end: along t on the left parapet, against it on the right)
  const dir = side < 0 ? 1 : -1;
  const p0: Pt = [a[0] + t[0] * (s - (dir * w) / 2) + r[0] * o, a[1] + t[1] * (s - (dir * w) / 2) + r[1] * o];
  const p1: Pt = [a[0] + t[0] * (s + (dir * w) / 2) + r[0] * o, a[1] + t[1] * (s + (dir * w) / 2) + r[1] * o];
  const n: Pt = [-r[0] * side, -r[1] * side];
  nameQuad(b, p0, p1, y + 0.18, y + 0.5, n, row);
}
/** A name from the sign sheet (its row) on a quad from p0 to p1, y0 to y1, facing n, read left to right from in front */
function nameQuad(b: Batch, p0: Pt, p1: Pt, y0: number, y1: number, n: Pt, row: number) {
  const [v0, v1] = [1 - ((row + 1) * SIGN_ROW) / (SIGN_ROW * SIGN_NAMES.length), 1 - (row * SIGN_ROW) / (SIGN_ROW * SIGN_NAMES.length)];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([p0[0], y0, p0[1], p1[0], y0, p1[1], p1[0], y1, p1[1], p0[0], y1, p0[1]], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1]], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v0, 1, v0, 1, v1, 0, v1], 2));
  const front = (p1[0] - p0[0]) * n[1] - (p1[1] - p0[1]) * n[0] > 0;
  g.setIndex(front ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  b.add(g, SIGN);
}
/** Where a bridge's end leads: the block its core serves, the block it meets, nothing for the deck */
const endName = (e: (typeof BRIDGES)[number]['a'], floor = 0) =>
  'core' in e ? blockById(CORES.find((q) => q.id === e.core)!.of).name : 'block' in e ? (e.block === 'twin-core' && floor >= TOP_FLOOR ? PERCH.name : blockById(e.block).name) : '';

/** A bridge's pier: a concrete column under its span, a cap on it under the deck */
function drawPier(b: Batch, p: (typeof PIERS)[number]) {
  const k = kit(b, WORLD);
  k.all(() => {
    b.add(plain(new THREE.BoxGeometry(PIER_HALF * 2, p.top - p.base, PIER_HALF * 2).rotateY(-p.rot).translate(p.at[0], (p.base + p.top) / 2, p.at[1])), CONC);
    b.add(plain(new THREE.BoxGeometry(PIER_HALF * 2 + 0.3, 0.25, BRIDGE_HALF * 2).rotateY(-p.rot).translate(p.at[0], p.top - 0.125, p.at[1])), CONC);
  });
}

/**
 * A link's mouth on the gallery (the brutalist plan's polish): a concrete portal, a post each side and a lintel across,
 * so the gallery's front and the link's parapets meet at it, not at a kink
 */
function drawPortal(b: Batch, a: Pt, c: Pt, y: number) {
  const k = kit(b, WORLD);
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
  const t: Pt = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
  const r: Pt = [-t[1], t[0]];
  const h = BRIDGE_HALF + 0.08;
  k.all(() => {
    for (const side of [-1, 1]) {
      const m: Pt = [a[0] + r[0] * side * h, a[1] + r[1] * side * h];
      along(b, [m[0] - t[0] * 0.15, m[1] - t[1] * 0.15], [m[0] + t[0] * 0.15, m[1] + t[1] * 0.15], 0.3, y - 0.2, y + 1.7, CONC);
    }
    along(b, [a[0] - t[0] * 0.15, a[1] - t[1] * 0.15], [a[0] + t[0] * 0.15, a[1] + t[1] * 0.15], h * 2 + 0.3, y + 1.68, y + 1.92, CONC);
  });
}

function drawDeck(b: Batch, poly: Pt[], y: number, base: number) {
  const k = kit(b, WORLD);
  k.all(() => {
    flat(b, poly, y, DECK_FLOOR);
    flat(b, poly, y - 0.3, CONC_DARK, false);
    poly.forEach((a, j) => {
      const c = poly[(j + 1) % poly.length];
      const n = outward(poly, j);
      quad(b, a, c, y - 0.3, y, n, CONC);
      // (a balustrade where it isn't against a gallery, its coping a little wider and darker: R1)
      const mid: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      if (!inBlock(mid, 2.4)) {
        along(b, a, c, 0.12, y, y + 0.6, CONC, -0.07);
        along(b, a, c, 0.18, y + 0.6, y + 0.65, CONC_DARK, -0.07);
      }
    });
    // Its columns down to the court (southyard.ts)
    for (const [x, z] of DECK_COLUMNS) b.add(plain(new THREE.CylinderGeometry(COLUMN_R, COLUMN_R, y - 0.3 - base, 10).translate(x, (base + y - 0.3) / 2, z)), CONC);
  });
  // R1's fine trims, near only: the paving's joints on a 1.2 grid inside its outline, a drip under its edge
  b.detail(() => {
    const [x0, z0, x1, z1] = rectOf(poly, 0);
    const M = 1.2;
    for (let x = Math.ceil(x0 / M) * M; x < x1; x += M)
      for (let z = z0; z < z1; z += M) {
        const z2 = Math.min(z + M, z1);
        if (insidePoly(poly, [x, (z + z2) / 2]) && insidePoly(poly, [x, z + 0.05]) && insidePoly(poly, [x, z2 - 0.05])) along(b, [x, z], [x, z2], 0.03, y, y + 0.006, CONC_DARK);
      }
    for (let z = Math.ceil(z0 / M) * M; z < z1; z += M)
      for (let x = x0; x < x1; x += M) {
        const x2 = Math.min(x + M, x1);
        if (insidePoly(poly, [(x + x2) / 2, z]) && insidePoly(poly, [x + 0.05, z]) && insidePoly(poly, [x2 - 0.05, z])) along(b, [x, z], [x2, z], 0.03, y, y + 0.006, CONC_DARK);
      }
    poly.forEach((a, j) => along(b, a, poly[(j + 1) % poly.length], 0.05, y - 0.38, y - 0.3, CONC_DARK, -0.03));
  });
}
/** Whether a point is inside an outline */
function insidePoly(ring: Pt[], [x, z]: Pt) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function drawBunkerDoor(b: Batch, base: number) {
  const [x, z] = BUNKER.door;
  const k = kit(b, WORLD);
  const t: Pt = [-Math.sin(BUNKER.face), Math.cos(BUNKER.face)];
  const n: Pt = [Math.cos(BUNKER.face), Math.sin(BUNKER.face)];
  const p = (s: number, o: number): Pt => [x + t[0] * s + n[0] * o, z + t[1] * s + n[1] * o];
  k.all(() => {
    quad(b, p(-0.55, 0.06), p(0.55, 0.06), base, base + 1.15, n, DOOR);
    quad(b, p(-0.6, 0.075), p(0.6, 0.075), base + 1.22, base + 1.3, n, BUNKER_NEON);
  });
}

/** The Core's stair: its steps up its south face, the landing at the third floor, a rail each side */
function drawStair(b: Batch) {
  const k = kit(b, WORLD);
  const { base, top, w, o0, s0, s1, landing, steps } = STAIR;
  const foot = blockById('twin-core').foot;
  const c = centre(foot);
  const h = blockById('harrier').foot;
  const kc = blockById('kite').foot;
  const hc = centre(h);
  const kk = centre(kc);
  const l = Math.hypot(kk[0] - hc[0], kk[1] - hc[1]);
  const u: Pt = [(kk[0] - hc[0]) / l, (kk[1] - hc[1]) / l];
  const v: Pt = [-u[1], u[0]];
  const at = (s: number, o: number): Pt => [c[0] + u[0] * s + v[0] * o, c[1] + u[1] * s + v[1] * o];
  const rise = (top - base) / steps;
  const run = (s1 - s0) / steps;
  k.all(() => {
    for (let i = 0; i < steps; i++) {
      const [a, e] = [at(s0 + run * i, o0 + w / 2), at(s0 + run * (i + 1), o0 + w / 2)];
      along(b, a, e, w, base + rise * i, base + rise * (i + 1), CONC);
    }
    // (its landing, on a column, against the face)
    flat(b, [at(s1, o0), at(s1 + landing, o0), at(s1 + landing, o0 + w), at(s1, o0 + w)], top, CONC);
    flat(b, [at(s1, o0), at(s1 + landing, o0), at(s1 + landing, o0 + w), at(s1, o0 + w)], top - 0.2, CONC_DARK, false);
    const col = at(s1 + landing / 2, o0 + w / 2);
    b.add(plain(new THREE.CylinderGeometry(0.18, 0.18, top - 0.2 - base, 8).translate(col[0], (base + top - 0.2) / 2, col[1])), CONC);
  });
  // Its rails (the face side and the open side), up the flight and round the landing
  b.detail(() => {
    for (const o of [o0 + 0.05, o0 + w - 0.05]) {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const [sa, sb] = [s0 + ((s1 - s0) * i) / n, s0 + ((s1 - s0) * (i + 1)) / n];
        const [ya, yb] = [base + ((top - base) * i) / n, base + ((top - base) * (i + 1)) / n];
        const [a, e] = [at(sa, o), at(sb, o)];
        b.add(plain(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5).translate(a[0], ya + 0.45, a[1])), CONC_DARK);
        const g = new THREE.CylinderGeometry(0.035, 0.035, Math.hypot(sb - sa, yb - ya), 5);
        g.rotateZ(-Math.atan2(sb - sa, yb - ya));
        g.rotateY(-Math.atan2(u[1], u[0]));
        g.translate((a[0] + e[0]) / 2, (ya + yb) / 2 + 0.9, (a[1] + e[1]) / 2);
        b.add(plain(g), ACCENT.mustard);
      }
    }
    along(b, at(s1, o0 + w - 0.05), at(s1 + landing, o0 + w - 0.05), 0.07, top, top + 0.9, ACCENT.mustard);
    along(b, at(s1 + landing - 0.05, o0 + 0.2), at(s1 + landing - 0.05, o0 + w), 0.07, top, top + 0.9, ACCENT.mustard);
  });
}

/* ---------- Street-level grit (docs/brutalist-plan.md Phase 5) ---------- */

/** The shops' neon over their fronts: the two names (the owner's picks), pink and cyan tubes on a dark board */
const SHOP_ROW = 48;
const SHOP_TEX = canvasTex(256, SHOP_ROW * DECK_SHOP_NAMES.length, (c) => {
  c.fillStyle = '#121019';
  c.fillRect(0, 0, 256, SHOP_ROW * DECK_SHOP_NAMES.length);
  DECK_SHOP_NAMES.forEach((name, i) => {
    const y = i * SHOP_ROW + SHOP_ROW / 2;
    c.font = `800 26px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const tube = i ? '#5ff2ff' : '#ff6fd0';
    c.shadowColor = tube;
    c.shadowBlur = 8;
    c.fillStyle = tube;
    c.fillText(name.toUpperCase(), 128, y, 240);
    c.shadowBlur = 0;
    c.fillStyle = '#ffffff';
    c.fillText(name.toUpperCase(), 128, y, 240);
  });
});
/** (dim by day, lit at night, the tubes small and bright: minimal bloom) */
const SHOP_NEON = lit(new THREE.MeshBasicMaterial({ map: SHOP_TEX }), 0.55, 1.15);
/** A roller shutter's steel, a puddle that catches the sodium lamps at night */
const SHUTTER = toon('#7d8189');
const PUDDLE_SHINE = lit(toon('#1b2230', { emissive: '#7a4a24' }), 0, 0.18);

/** A quad from p0 to p1 (p0 on the left seen from in front), y0 to y1, facing n, a band v0..v1 of a texture */
function texQuad(b: Batch, p0: Pt, p1: Pt, y0: number, y1: number, n: Pt, v0: number, v1: number, m: THREE.Material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([p0[0], y0, p0[1], p1[0], y0, p1[1], p1[0], y1, p1[1], p0[0], y1, p0[1]], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1]], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v0, 1, v0, 1, v1, 0, v1], 2));
  const front = (p1[0] - p0[0]) * n[1] - (p1[1] - p0[1]) * n[0] > 0;
  g.setIndex(front ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  b.add(g, m);
}

/**
 * The units under the podium deck (southblocks.ts `DECK_SHOPS`): the two open ones (The Wash House, Deck Stores) a
 * glazed front lit warm at night, a door, a dark fascia and their neon; the rest roller shutters down, the box over
 * them, ribs, tags and (one) a To Let board, near
 */
function drawShops(b: Batch, low: boolean) {
  const k = kit(b, WORLD);
  for (const sh of DECK_SHOPS) {
    const { a, c, n, base } = sh;
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const t: Pt = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
    const at = (u: number, out: number): Pt => [a[0] + t[0] * u + n[0] * out, a[1] + t[1] * u + n[1] * out];
    // (read left to right from in front: from the left of someone facing it)
    const left = (u: number, out: number, w: number): [Pt, Pt] => {
      const m = at(u, out);
      const l: Pt = [-n[1], n[0]];
      return [[m[0] + l[0] * w, m[1] + l[1] * w], [m[0] - l[0] * w, m[1] - l[1] * w]];
    };
    k.all(() => {
      if (sh.name) {
        quad(b, at(0.1, 0.014), at(len - 0.1, 0.014), base + 0.05, base + 1.02, n, GLASS);
        quad(b, at(len - 0.8, 0.022), at(len - 0.2, 0.022), base, base + 1.0, n, DOOR);
        quad(b, at(0, 0.016), at(len, 0.016), base + 1.04, base + 1.38, n, CONC_DARK);
        const row = DECK_SHOP_NAMES.indexOf(sh.name as (typeof DECK_SHOP_NAMES)[number]);
        const H = SHOP_ROW * DECK_SHOP_NAMES.length;
        const [p0, p1] = left(len / 2, 0.026, Math.min(1.6, len / 2 - 0.15));
        texQuad(b, p0, p1, base + 1.07, base + 1.35, n, 1 - ((row + 1) * SHOP_ROW) / H, 1 - (row * SHOP_ROW) / H, SHOP_NEON);
      } else {
        quad(b, at(0.05, 0.02), at(len - 0.05, 0.02), base, base + 1.06, n, SHUTTER);
        along(b, at(0, 0.1), at(len, 0.1), 0.2, base + 1.06, base + 1.28, CONC_DARK);
      }
      // A strip light under the deck's soffit in front of each unit, tired, the odd one dead
      const h = hashOf(sh.id);
      if (h % 5) along(b, at(len * 0.25, 1.6), at(len * 0.75, 1.6), 0.08, DECKS[0].y - 0.36, DECKS[0].y - 0.31, h % 3 ? STRIP_TIRED : STRIP);
    });
    if (low) continue;
    b.detail(() => {
      if (sh.name) {
        // (mullions across the glazing)
        for (let u = 0.1 + 0.9; u < len - 0.9; u += 0.9) along(b, at(u, 0.02), at(u + 0.04, 0.02), 0.04, base + 0.05, base + 1.02, CONC_DARK);
        return;
      }
      // The shutter's ribs, its tags (most of them), the To Let board on the one to let
      for (let y = base + 0.08; y < base + 1.04; y += 0.09) along(b, at(0.05, 0.026), at(len - 0.05, 0.026), 0.012, y, y + 0.015, CONC_DARK);
      const h = hashOf(sh.id);
      if (h % 4) {
        const paint = TAG_PAINT[h % TAG_PAINT.length];
        for (let i = 0; i < 9; i++) {
          const u = 0.4 + i * 0.22 + (h % 3) * 0.1;
          const [v0, v1] = [0.25 + ((h + i * 3) % 5) * 0.07, 0.3 + ((h + i * 7) % 5) * 0.07];
          if (u < len - 0.3) quad(b, at(u, 0.034), at(u + 0.18, 0.034), base + Math.min(v0, v1), base + Math.max(v0, v1) + 0.08, n, paint);
        }
      }
      if (sh.toLet) {
        const row = SIGN_NAMES.indexOf('TO LET');
        const H = SIGN_ROW * SIGN_NAMES.length;
        const [p0, p1] = left(len / 2, 0.04, 0.55);
        texQuad(b, p0, p1, base + 0.62, base + 0.82, n, 1 - ((row + 1) * SIGN_ROW) / H, 1 - (row * SIGN_ROW) / H, SIGN);
      }
    });
  }
}

/* ---------- The shops you own under the deck, from the save (docs/brutalist-plan.md Phase 7b) ---------- */

/** Lit warm inside, a little by day (minimal bloom: as the glass it's drawn over) */
const PANE = lit(toon('#c4ab84', { emissive: '#ffd9a0' }), 0.12, 0.8);
const MACHINE = toon('#f2f1ec');
const PORT_RIM = toon('#9aa1a8');
const PORT = toon('#3a4654');
const SHELF = toon('#6f6a62');
/** What's tumbling in the drums */
const LAUNDRY = toon('#d9668f');
/** The display's width behind the glass (from 0.12 to `SHOW_U1` along the front: the door's to the right of it) */
const SHOW_U0 = 0.12;
const SHOW_U1 = 2.58;
/** Washers and dryers, a column at a time: a washer under a dryer */
const MACHINE_W = 0.44;
const MACHINE_GAP = 0.1;
const ROWS_Y = [0.3, 0.76];
const PORT_R = 0.14;
/** Deck Stores' shelves (their heights over the floor) and how many packs a shelf of one kind holds */
const SHELVES_Y = [0.32, 0.6, 0.88];
const PACKS = 5;
/** Drawn when the camera's this near */
const SHOP_NEAR = 80;

/** A disc of radius r facing n, its centre at p, height y */
function disc(b: Batch, p: Pt, y: number, r: number, n: Pt, m: THREE.Material) {
  b.add(plain(new THREE.CircleGeometry(r, 16).rotateY(Math.atan2(n[0], n[1])).translate(p[0], y, p[1])), m);
}
/** A front's frame: a point `u` along it and `out` in front of its face */
function frontOf(name: string) {
  const sh = DECK_SHOPS.find((d) => d.name === name)!;
  const len = Math.hypot(sh.c[0] - sh.a[0], sh.c[1] - sh.a[1]);
  const t: Pt = [(sh.c[0] - sh.a[0]) / len, (sh.c[1] - sh.a[1]) / len];
  return { sh, at: (u: number, out: number): Pt => [sh.a[0] + t[0] * u + sh.n[0] * out, sh.a[1] + t[1] * u + sh.n[1] * out] };
}
/** The Wash House's machines' centres along its front (a column a pair) */
const columnsOf = (machines: number) => {
  const cols = Math.ceil(machines / 2);
  const w = cols * MACHINE_W + (cols - 1) * MACHINE_GAP;
  const u0 = (SHOW_U0 + SHOW_U1 - w) / 2 + MACHINE_W / 2;
  return Array.from({ length: cols }, (_, i) => u0 + i * (MACHINE_W + MACHINE_GAP));
};

/** The two shops' insides as the save has them: a group rebuilt when the look changes, drums turned while near */
function registerDeckShops(scene: THREE.Scene | null, tick?: (f: Tick) => void) {
  if (!scene || !tick) return;
  const wash = frontOf(DECK_SHOP_NAMES[0]);
  const store = frontOf(DECK_SHOP_NAMES[1]);
  const g = new THREE.Group();
  g.name = 'south-blocks deck shops';
  scene.add(g);
  const drums = new THREE.InstancedMesh(new THREE.CircleGeometry(PORT_R * 0.62, 10, 0, Math.PI), LAUNDRY, Math.max(...WASH.machines));
  drums.frustumCulled = false;
  drums.count = 0;
  scene.add(drums);
  const spots: { p: Pt; y: number }[] = [];
  const face = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(wash.sh.n[0], wash.sh.n[1]));
  const [q, m, one, pos, z] = [new THREE.Quaternion(), new THREE.Matrix4(), new THREE.Vector3(1, 1, 1), new THREE.Vector3(), new THREE.Vector3(0, 0, 1)];
  let v = -1;
  function build() {
    for (const o of [...g.children]) {
      g.remove(o);
      (o as THREE.Mesh).geometry?.dispose();
    }
    spots.length = 0;
    const b = new Batch();
    const base = wash.sh.base;
    if (DECK_LOOK.wash) {
      const { at, sh } = wash;
      quad(b, at(SHOW_U0, 0.046), at(SHOW_U1, 0.046), base + 0.05, base + 1.02, sh.n, PANE);
      for (const u of columnsOf(DECK_LOOK.wash))
        ROWS_Y.forEach((y, row) => {
          if (row && spots.length >= DECK_LOOK.wash) return;
          along(b, at(u - MACHINE_W / 2, 0.062), at(u + MACHINE_W / 2, 0.062), 0.02, base + y - 0.2, base + y + 0.2, MACHINE);
          disc(b, at(u, 0.0735), base + y, PORT_R, sh.n, PORT_RIM);
          disc(b, at(u, 0.0775), base + y, PORT_R * 0.82, sh.n, PORT);
          spots.push({ p: at(u, 0.0815), y: base + y });
        });
      for (let u = 0.1 + 0.9; u < SHOW_U1; u += 0.9) along(b, at(u, 0.095), at(u + 0.04, 0.095), 0.01, base + 0.05, base + 1.02, CONC_DARK);
    }
    if (DECK_LOOK.store) {
      const { at, sh } = store;
      quad(b, at(SHOW_U0, 0.046), at(SHOW_U1, 0.046), base + 0.05, base + 1.02, sh.n, PANE);
      for (const y of SHELVES_Y) along(b, at(SHOW_U0 + 0.04, 0.062), at(SHOW_U1 - 0.04, 0.062), 0.03, base + y - 0.02, base + y, SHELF);
      // A column of shelves a kind of goods, its packs as many as it's full
      const col = (SHOW_U1 - SHOW_U0) / Math.max(4, DECK_LOOK.store.length);
      DECK_LOOK.store.forEach((slot, i) => {
        const mat = toon(slot.color);
        let left = Math.round(slot.fill * PACKS * SHELVES_Y.length);
        for (const y of SHELVES_Y)
          for (let k = 0; k < PACKS && left > 0; k++, left--) {
            const u = SHOW_U0 + i * col + 0.06 + k * ((col - 0.12) / PACKS);
            along(b, at(u, 0.064), at(u + (col - 0.12) / PACKS - 0.02, 0.064), 0.026, base + y, base + y + 0.13, mat);
          }
      });
      for (let u = 0.1 + 0.9; u < SHOW_U1; u += 0.9) along(b, at(u, 0.095), at(u + 0.04, 0.095), 0.01, base + 0.05, base + 1.02, CONC_DARK);
    }
    b.build(g, { cast: false, receive: false, lift: false });
    drums.count = spots.length;
  }
  tick(({ t }) => {
    const e = CROWD_VIEW.eye;
    const d = DECK_SHOP_DOORS[0];
    const near = Math.hypot(e.x - d.x, e.z - d.z) < SHOP_NEAR;
    g.visible = drums.visible = near;
    if (!near) return;
    if (DECK_LOOK.v !== v) {
      v = DECK_LOOK.v;
      build();
    }
    // The drums turning (each its own pace; still under reduced motion, as the city's clock is)
    spots.forEach((s, i) => {
      q.setFromAxisAngle(z, t * (2.4 + (i % 3) * 0.7) + i * 1.9).premultiply(face);
      m.compose(pos.set(s.p[0], s.y, s.p[1]), q, one);
      drums.setMatrixAt(i, m);
    });
    drums.instanceMatrix.needsUpdate = true;
  });
}

/**
 * Cables strung between neighbouring blocks (the estate's own wiring, sagging), a pair between each two blocks within
 * reach of each other; not on phones
 */
const CABLES: { a: [number, number, number]; c: [number, number, number] }[] = (() => {
  const out: { a: [number, number, number]; c: [number, number, number] }[] = [];
  const hung = BLOCKS.filter((q) => q.id !== 'twin-core');
  const pts = (f: Pt[]) => f.flatMap((p, j) => {
    const q = f[(j + 1) % f.length];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return Array.from({ length: Math.max(1, Math.ceil(l)) }, (_, k): Pt => [p[0] + ((q[0] - p[0]) * k) / Math.ceil(l || 1), p[1] + ((q[1] - p[1]) * k) / Math.ceil(l || 1)]);
  });
  for (let i = 0; i < hung.length; i++)
    for (let j = i + 1; j < hung.length; j++) {
      const [A, B] = [pts(hung[i].foot), pts(hung[j].foot)];
      let best = { d: Infinity, p: A[0], q: B[0] };
      for (const p of A) for (const q of B) {
        const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (d < best.d) best = { d, p, q };
      }
      if (best.d < 6 || best.d > 28) continue;
      const y = Math.min(topOf(hung[i]), topOf(hung[j])) - 2.4;
      for (const [dy, side] of [[0, 0.6], [-1.6, -0.6]] as const) {
        const l = best.d || 1;
        const r: Pt = [(-(best.q[1] - best.p[1]) / l) * side, ((best.q[0] - best.p[0]) / l) * side];
        out.push({ a: [best.p[0] + r[0], y + dy, best.p[1] + r[1]], c: [best.q[0] + r[0], y + dy - 0.3, best.q[1] + r[1]] });
      }
    }
  return out;
})();
function drawCable(b: Batch, cb: (typeof CABLES)[number]) {
  const { a, c } = cb;
  const l = Math.hypot(c[0] - a[0], c[2] - a[2]);
  const sag = 0.05 * l;
  const at = (f: number): [number, number, number] => [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f - sag * 4 * f * (1 - f), a[2] + (c[2] - a[2]) * f];
  for (let k = 0; k < 10; k++) rod(b, at(k / 10), at((k + 1) / 10), 0.022, RAIL, 4);
  // (its brackets on the walls)
  for (const p of [a, c]) b.add(plain(new THREE.BoxGeometry(0.12, 0.16, 0.12).translate(p[0], p[1], p[2])), RAIL);
}

/** Puddles in a court (a few, hashed), catching the sodium lamps at night; near only */
function courtPuddles(b: Batch, poly: Pt[], id: string, y: number) {
  const [x0, z0, x1, z1] = rectOf(poly, 0);
  const h0 = hashOf(id);
  for (let x = x0 + 3; x < x1 - 3; x += 5.5)
    for (let z = z0 + 3; z < z1 - 3; z += 5.5) {
      const h = Math.abs(Math.round(x * 13 + z * 7 + h0));
      if (h % 3 || !insidePoly(poly, [x, z])) continue;
      const [rx, rz] = [0.5 + (h % 4) * 0.2, 0.3 + (h % 3) * 0.15];
      flat(b, Array.from({ length: 10 }, (_, i): Pt => {
        const q = (i / 10) * Math.PI * 2;
        return [x + Math.cos(q) * rx, z + Math.sin(q) * rz];
      }), y + 0.012, PUDDLE_SHINE);
    }
}

/* ---------- The lobbies (docs/brutalist-plan.md Phase 6) ---------- */

/** The halls' floor (terrazzo, worn), their walls (painted concrete, scuffed) and the plywood over a broken pane */
const TERRAZZO = toon('#938d82');
const HALL_WALL = toon('#9a9a8c');
const PLY_BOARD = toon('#a3804f');

/**
 * A lobby (southblocks.ts `LOBBIES`): its floor, ceiling and walls seen from inside (the front's glass from outside is
 * the block's own), the doorway's frame and reveals; inside, near: the post boxes and the noticeboard on its side walls,
 * a bench and the lift doors on its back wall, the stairs up in its corner, strip lights (one flickering, one dead),
 * and its grit (the owner's pick, rough: tags, litter, a boarded pane, a dented post box); never threatening
 */
function drawLobby(b: Batch, l: (typeof LOBBIES)[number], low: boolean) {
  const k = kit(b, WORLD);
  const { w, d, base, t, n } = l;
  const wall = HALL.wall;
  const at = (u: number, o: number): Pt => [l.door[0] + t[0] * u + n[0] * o, l.door[1] + t[1] * u + n[1] * o];
  const top = base + GROUND_H - 0.04;
  const back = -wall - d;
  const nIn: Pt = [-n[0], -n[1]];
  const ry = -Math.atan2(t[1], t[0]);
  const h = hashOf(l.id);
  k.all(() => {
    flat(b, l.poly, base + 0.012, TERRAZZO);
    flat(b, l.doorPoly, base + 0.012, TERRAZZO);
    flat(b, l.poly, top, CONC_DARK, false);
    // (its walls' inner faces: the back, the two sides, and the front either side of the door)
    quad(b, at(-w / 2, back), at(w / 2, back), base, top, n, HALL_WALL);
    quad(b, at(-w / 2, -wall), at(-w / 2, back), base, top, t, HALL_WALL);
    quad(b, at(w / 2, back), at(w / 2, -wall), base, top, [-t[0], -t[1]], HALL_WALL);
    quad(b, at(-w / 2, -wall), at(-HALL.door / 2, -wall), base + 1.02, top, nIn, HALL_WALL);
    quad(b, at(HALL.door / 2, -wall), at(w / 2, -wall), base + 1.02, top, nIn, HALL_WALL);
    quad(b, at(-w / 2, -wall), at(-HALL.door / 2, -wall), base, base + 1.02, nIn, GLASS);
    quad(b, at(HALL.door / 2, -wall), at(w / 2, -wall), base, base + 1.02, nIn, GLASS);
    // (the doorway's reveals through the wall, its frame on the face, a dark mat on the step)
    for (const sx of [-1, 1]) {
      quad(b, at((sx * HALL.door) / 2, 0.02), at((sx * HALL.door) / 2, -wall), base, base + 1.15, [-t[0] * sx, -t[1] * sx], CONC);
      along(b, at((sx * HALL.door) / 2 + sx * 0.05, 0.03), at((sx * HALL.door) / 2 + sx * 0.05, 0.11), 0.1, base, base + 1.2, RAIL);
    }
    along(b, at(-HALL.door / 2 - 0.1, 0.07), at(HALL.door / 2 + 0.1, 0.07), 0.08, base + 1.15, base + 1.25, RAIL);
    flat(b, [at(-0.5, 0.6), at(0.5, 0.6), at(0.5, 0.02), at(-0.5, 0.02)], base + 0.016, DOOR);
    // Its lights: strip lights on the ceiling (lit warm at night through the glass), the second one dead
    along(b, at(-1.4, back / 2 - 0.4), at(-0.2, back / 2 - 0.4), 0.09, top - 0.04, top - 0.01, h % 2 ? STRIP_TIRED : STRIP);
  });
  if (low) return;
  b.detail(() => {
    // The post boxes: a steel bank of little doors on the left wall, one hanging open, one dented in
    const pb = at(-w / 2 + 0.06, back + 1.6);
    b.add(plain(new THREE.BoxGeometry(0.1, 0.62, 1.4).rotateY(ry).translate(pb[0], base + 0.62, pb[1])), SHUTTER);
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 6; c++) {
        const q = at(-w / 2 + 0.115, back + 1.6 - 0.58 + c * 0.23);
        const open = (h + r * 7 + c) % 13 === 0;
        b.add(plain(new THREE.BoxGeometry(0.02, 0.11, 0.18).rotateY(ry + (open ? 0.9 : 0)).translate(q[0], base + 0.38 + r * 0.15, q[1])), (h + r + c) % 9 === 0 ? CONC_DARK : RAIL);
      }
    // The noticeboard on the right wall, notices pinned up, one torn off and hanging
    const nb = at(w / 2 - 0.05, back + 2.6);
    b.add(plain(new THREE.BoxGeometry(0.06, 0.46, 0.8).rotateY(ry).translate(nb[0], base + 0.8, nb[1])), RAIL);
    b.add(plain(new THREE.BoxGeometry(0.065, 0.38, 0.7).rotateY(ry).translate(nb[0] - t[0] * 0.005, base + 0.8, nb[1] - t[1] * 0.005)), CORK);
    for (let q = 0; q < 5; q++) {
      const p = at(w / 2 - 0.09, back + 2.35 + q * 0.12);
      b.add(plain(new THREE.BoxGeometry(0.01, 0.12, 0.1).rotateY(ry).translate(p[0], base + 0.72 + ((h + q * 3) % 3) * 0.08, p[1])), q % 2 ? DISH : TAG_PAINT[(h + q) % TAG_PAINT.length]);
    }
    // The bench on the back wall, worn slats on concrete ends
    const { bench, stairs } = lobbyProps(l);
    const bc: Pt = [bench.reduce((a, p) => a + p[0], 0) / 4, bench.reduce((a, p) => a + p[1], 0) / 4];
    b.add(plain(new THREE.BoxGeometry(1.4, 0.06, 0.42).rotateY(ry).translate(bc[0], base + 0.42, bc[1])), PLY_BOARD);
    for (const u of [-0.6, 0.6]) b.add(plain(new THREE.BoxGeometry(0.1, 0.4, 0.4).rotateY(ry).translate(bc[0] + t[0] * u, base + 0.2, bc[1] + t[1] * u)), CONC);
    // The lift doors on the back wall (they call the block's lift: southsky.ts `lobbyLiftDoor()`), a lit strip over them
    const ld = lobbyLiftDoor(l);
    const lw: Pt = [ld[0] - n[0] * 0.53, ld[1] - n[1] * 0.53];
    for (const u of [-0.24, 0.24]) quad(b, [lw[0] + t[0] * (u - 0.23), lw[1] + t[1] * (u - 0.23)], [lw[0] + t[0] * (u + 0.23), lw[1] + t[1] * (u + 0.23)], base, base + 1.05, n, SHUTTER);
    quad(b, [lw[0] - t[0] * 0.5, lw[1] - t[1] * 0.5], [lw[0] + t[0] * 0.5, lw[1] + t[1] * 0.5], base + 1.08, base + 1.13, n, STRIP);
    // The stairs up in the corner: a flight rising to the ceiling along the right wall
    const s0 = stairs;
    const sc: Pt = [s0.reduce((a, p) => a + p[0], 0) / 4, s0.reduce((a, p) => a + p[1], 0) / 4];
    for (let i = 0; i < 8; i++) {
      const o = back + 0.1 + i * 0.26;
      const p = at(w / 2 - 0.55, o);
      b.add(plain(new THREE.BoxGeometry(1, (i + 1) * 0.17, 0.26).rotateY(ry).translate(p[0], base + ((i + 1) * 0.17) / 2, p[1])), CONC);
    }
    along(b, at(w / 2 - 1.08, back + 0.1), at(w / 2 - 1.08, back + 2.2), 0.05, base + 0.9, base + 0.96, RAIL);
    void sc;
    // Its grit: tags on the walls, litter on the floor, a pane boarded over by the door
    for (let i = 0; i < 7; i++) {
      const u = -w / 2 + 0.5 + i * 0.2;
      const [v0, v1] = [0.28 + ((h + i * 3) % 5) * 0.06, 0.32 + ((h + i * 7) % 5) * 0.06];
      quad(b, at(u, back + 0.012), at(u + 0.16, back + 0.012), base + Math.min(v0, v1), base + Math.max(v0, v1) + 0.07, n, TAG_PAINT[(h + i) % TAG_PAINT.length]);
    }
    for (let i = 0; i < 5; i++) {
      const p = at(-1 + ((h + i * 5) % 9) * 0.25, back + 0.6 + ((h + i * 3) % 7) * 0.35);
      b.add(plain(new THREE.BoxGeometry(0.12, 0.03, 0.08).rotateY(ry + i).translate(p[0], base + 0.03, p[1])), i % 2 ? DISH : BAG);
    }
    quad(b, at(HALL.door / 2 + 0.15, -wall - 0.02), at(HALL.door / 2 + 1.1, -wall - 0.02), base + 0.15, base + 0.95, nIn, PLY_BOARD);
  });
}

/* ---------- Degen's flat (docs/brutalist-plan.md Phase 7a) ---------- */

/** The flat's palette: a dark wood floor, plaster walls, his dark sofa with his neon in its cushions, a navy duvet */
const FLAT_WOOD = toon('#5a4330');
const PLASTER = toon('#d8d2c4');
const SOFA_DARK = toon('#25222c');
const DUVET = toon('#34466a');
const WORKTOP = toon('#cfc9be');
const CUSHION = toon('#ff4fb8');
const SCREEN = lit(toon('#141820', { emissive: '#7fe9ff' }), 0.15, 0.6);

/**
 * Degen's flat (southblocks.ts `FLAT`): its floor, ceiling and walls seen from inside (its front's the tower's own face,
 * seen from inside: windows on the city), the partition between the living room and the bedroom; its things (the
 * sofa, the low table, the kitchen counter, the telly, the bed, a rug, lamps), the lights over them lit warm at night
 */
function drawFlat(b: Batch, low: boolean) {
  const k = kit(b, WORLD);
  const { at, y, ceil, t, n } = FLAT;
  const [u0, u1, o0, o1] = [-5.5, 3, -0.3, -5.8];
  const rect = (a: number, c: number, p: number, q: number): Pt[] => [at(a, p), at(c, p), at(c, q), at(a, q)];
  const ry = -Math.atan2(t[1], t[0]);
  const box = ([a, c, p, q, h]: [number, number, number, number, number], m: THREE.Material, from = y) => {
    const m0 = at((a + c) / 2, (p + q) / 2);
    b.add(plain(new THREE.BoxGeometry(Math.abs(c - a), h, Math.abs(q - p)).rotateY(ry).translate(m0[0], from + h / 2, m0[1])), m);
  };
  k.all(() => {
    flat(b, rect(u0, u1, o0, o1), y + 0.012, FLAT_WOOD);
    flat(b, rect(u0, u1, o0, o1), ceil, PLASTER, false);
    // (its walls inside the tower: the back, the two ends; the front is the tower's face, its windows)
    quad(b, at(u0, o1), at(u1, o1), y, ceil, n, PLASTER);
    quad(b, at(u0, o0), at(u0, o1), y, ceil, t, PLASTER);
    quad(b, at(u1, o1), at(u1, o0), y, ceil, [-t[0], -t[1]], PLASTER);
    // (the partition: the living room's side and the bedroom's)
    box([0.75, 0.95, -3.05, o1, ceil - y], PLASTER);
    // (and what's in the rooms: you walk round them, southsky.ts)
    const th = FLAT.things;
    box(th.sofa, SOFA_DARK);
    box([th.sofa[0], th.sofa[1], th.sofa[3] + 0.25, th.sofa[3], 0.8], SOFA_DARK);
    box(th.counter, CONC_DARK);
    box([th.counter[0], th.counter[1], th.counter[2], th.counter[3], 0.04], WORKTOP, y + th.counter[4]);
    box(th.bed, CONC_DARK);
    box([th.bed[0] + 0.05, th.bed[1] - 0.05, th.bed[2] - 0.05, th.bed[3] + 0.35, 0.1], DUVET, y + th.bed[4]);
    box(th.telly, RAIL);
    // (its windows along the front: a low sill, mullions every 1.4 and a head, the doorway clear)
    for (const [a, c] of [[u0, -0.65], [0.65, u1]] as [number, number][]) {
      along(b, at(a, -0.34), at(c, -0.34), 0.08, y, y + 0.22, CONC);
      along(b, at(a, -0.34), at(c, -0.34), 0.08, ceil - 0.16, ceil, CONC);
      for (let u = a + 0.05; u <= c - 0.05; u += 1.4) along(b, at(u - 0.03, -0.34), at(u + 0.03, -0.34), 0.06, y + 0.22, ceil - 0.16, RAIL);
    }
    for (const u of [-0.65, 0.65]) along(b, at(u, -0.05), at(u, -0.36), 0.1, y, ceil, CONC);
    // (his lights: a strip over the living room, one over the bed)
    along(b, at(-3.4, -2.6), at(-1.0, -2.6), 0.1, ceil - 0.04, ceil - 0.01, STRIP);
    along(b, at(1.5, -4.6), at(2.5, -4.6), 0.1, ceil - 0.04, ceil - 0.01, STRIP);
  });
  if (low) return;
  b.detail(() => {
    const th = FLAT.things;
    // The low table, a rug under it, his neon in the sofa's cushions, the telly's screen on its stand
    box(th.table, RAIL);
    flat(b, rect(-3.4, -1.0, -3.0, -4.5), y + 0.018, toon('#6e2a5c'));
    for (const u of [-3.3, -2.2, -1.1]) box([u, u + 0.5, th.sofa[3] + 0.3, th.sofa[3] + 0.45, 0.32], CUSHION, y + th.sofa[4]);
    const sc = at((th.telly[0] + th.telly[1]) / 2, -0.47);
    b.add(plain(new THREE.BoxGeometry(1.3, 0.5, 0.04).rotateY(ry).translate(sc[0], y + th.telly[4] + 0.3, sc[1])), SCREEN);
    // The kitchen's cupboards over the counter, a kettle, the fridge at its end
    box([th.counter[0], th.counter[1] + 0.2, th.counter[2] - 0.2, th.counter[3], 0.35], CONC_DARK, y + 1.0);
    box([th.counter[0], th.counter[1], th.counter[2] + 0.6, th.counter[2], 1.2], DISH);
    // The bed's pillows, a side lamp, a wardrobe by the bedroom's door
    box([th.bed[0] + 0.2, th.bed[1] - 0.2, th.bed[3] + 0.32, th.bed[3] + 0.08, 0.1], DISH, y + th.bed[4]);
    box([2.4, 2.9, -3.1, -3.5, 1.15], CONC_DARK);
  });
}

/* ---------- The Perch (docs/brutalist-plan.md Phase 3) ---------- */

/** Its floor slab's depth, its glass band's height over its floor, its ceiling under its roof */
const PERCH_SLAB = 0.25;
const PERCH_GLASS = 1.3;
const PERCH_CEIL = 0.12;
/**
 * The Perch: the hexagonal drum round The Core's top two floors. Its floor slab and soffit; the glass band all round
 * (its outer face only, so from inside it's the city you see), dark by day and lit warm at night; the concrete band over
 * it to the roof, its name stencilled on two faces; inside, the band's inner face, the ceiling and a strip light round
 * it, and near, the glass lift in the middle and mullions; the lift house on its roof
 */
function drawPerch(b: Batch, low: boolean) {
  const { foot, at, y0, y1, apothem } = PERCH;
  const k = kit(b, WORLD);
  const [yG, yC, top] = [y0 + PERCH_GLASS, y1 - PERCH_CEIL, topOf(TWIN_CORE)];
  const inner = (d: number) => foot.map((p): Pt => [at[0] + ((p[0] - at[0]) * (apothem - d)) / apothem, at[1] + ((p[1] - at[1]) * (apothem - d)) / apothem]);
  const [inn, light] = [inner(0.15), inner(0.35)];
  const next = (j: number) => (j + 1) % foot.length;
  /** Where the top bridges meet it, and the faces they meet */
  const ends = BRIDGES.filter((br) => br.floor === TOP_FLOOR).map((br) => br.pts['block' in br.a && br.a.block === 'twin-core' ? 0 : 1]);
  const onFace = (e: Pt, j: number) => {
    const [p, c] = [foot[j], foot[next(j)]];
    const l = Math.hypot(c[0] - p[0], c[1] - p[1]);
    const u = ((e[0] - p[0]) * (c[0] - p[0]) + (e[1] - p[1]) * (c[1] - p[1])) / l;
    return u > 0 && u < l && Math.abs(((e[0] - p[0]) * (c[1] - p[1]) - (e[1] - p[1]) * (c[0] - p[0])) / l) < 0.05;
  };
  k.all(() => {
    prism(b, foot, y0 - PERCH_SLAB, y0, CONC, PAVING);
    flat(b, foot, y0 - PERCH_SLAB, CONC_DARK, false);
    // (open where a top bridge meets it: its way in)
    foot.forEach((p, j) => {
      const c = foot[next(j)];
      const l = Math.hypot(c[0] - p[0], c[1] - p[1]);
      const t: Pt = [(c[0] - p[0]) / l, (c[1] - p[1]) / l];
      const gaps = ends.filter((e) => onFace(e, j)).map((e) => (e[0] - p[0]) * t[0] + (e[1] - p[1]) * t[1]);
      let u0 = 0;
      for (const u of [...gaps.sort((q, r) => q - r), Infinity]) {
        const u1 = Number.isFinite(u) ? u - BRIDGE_HALF : l;
        if (u1 - u0 > 0.05) quad(b, [p[0] + t[0] * u0, p[1] + t[1] * u0], [p[0] + t[0] * u1, p[1] + t[1] * u1], y0, yG, outward(foot, j), GLASS);
        u0 = u + BRIDGE_HALF;
      }
    });
    prism(b, foot, yG, y1 + PARAPET, CONC, ROOF);
    inn.forEach((p, j) => {
      const n = outward(foot, j);
      quad(b, p, inn[next(j)], yG - 0.02, yC, [-n[0], -n[1]], CONC_DARK);
      along(b, light[j], light[next(j)], 0.08, yC - 0.04, yC - 0.01, STRIP);
    });
    flat(b, inn, yC, CONC_DARK, false);
    // (its posts at the corners, between the panes)
    for (const p of foot) b.add(plain(new THREE.BoxGeometry(0.22, PERCH_GLASS, 0.22).translate(p[0], y0 + PERCH_GLASS / 2, p[1])), CONC);
    // Its name on two faces turned from the towers, one to Endswood Road, one to the Rampart
    for (const j of [1, 4]) {
      const [a, c] = [foot[j], foot[next(j)]];
      const n = outward(foot, j);
      const m: Pt = [(a[0] + c[0]) / 2 + n[0] * 0.012, (a[1] + c[1]) / 2 + n[1] * 0.012];
      // (read left to right from in front: from the left of someone facing it, -n, to their right)
      const left: Pt = [-n[1], n[0]];
      const w = 3;
      const [p0, p1]: Pt[] = [[m[0] + left[0] * (w / 2), m[1] + left[1] * (w / 2)], [m[0] - left[0] * (w / 2), m[1] - left[1] * (w / 2)]];
      nameQuad(b, p0, p1, yG + 0.2, yG + 0.84, n, SIGN_NAMES.indexOf(PERCH.name.toUpperCase()));
    }
    // The lift house on its roof: The Core's top, no higher than it was
    b.add(plain(new THREE.BoxGeometry(2.2, top - (y1 + PARAPET), 2.2).rotateY(-PERCH.rot).translate(at[0], (top + y1 + PARAPET) / 2, at[1])), CONC);
  });
  // Near: the glass lift in its middle (its posts, its glass), and mullions down the band
  if (!low)
    b.detail(() => {
      const q = 0.6;
      const [cs, sn] = [Math.cos(PERCH.rot), Math.sin(PERCH.rot)];
      const sq: Pt[] = [[q, q], [-q, q], [-q, -q], [q, -q]].map(([x, z]): Pt => [at[0] + x * cs - z * sn, at[1] + x * sn + z * cs]);
      sq.forEach((p, j) => {
        b.add(plain(new THREE.BoxGeometry(0.08, yC - y0, 0.08).translate(p[0], (y0 + yC) / 2, p[1])), RAIL);
        // (its glass on three sides, the fourth its door, open)
        if (j !== 3) quad(b, p, sq[(j + 1) % 4], y0 + 0.02, yC - 0.02, outward(sq, j), MESH);
      });
      foot.forEach((p, j) => {
        const c = foot[next(j)];
        if (ends.some((e) => onFace(e, j))) return;
        for (const f of [1 / 3, 2 / 3]) {
          const m: Pt = [p[0] + (c[0] - p[0]) * f, p[1] + (c[1] - p[1]) * f];
          b.add(plain(new THREE.BoxGeometry(0.07, PERCH_GLASS, 0.07).translate(m[0], y0 + PERCH_GLASS / 2, m[1])), CONC_DARK);
        }
      });
    });
}

/** A tower's doors where bridges meet it: dark, a floor's height, on its face */
function drawTowerDoors(b: Batch, t: Block) {
  const k = kit(b, WORLD);
  k.all(() => {
    for (const br of BRIDGES) {
      const hit = 'block' in br.a && br.a.block === t.id ? 0 : 'block' in br.b && br.b.block === t.id ? 1 : null;
      if (hit === null) continue;
      const end: 0 | 1 = hit;
      const p = br.pts[end];
      const q = br.pts[1 - end];
      const l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1;
      const n: Pt = [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
      const tt: Pt = [-n[1], n[0]];
      const f: Pt = [p[0] + n[0] * 0.015, p[1] + n[1] * 0.015];
      const y = br.ys[end];
      quad(b, [f[0] - tt[0] * 0.55, f[1] - tt[1] * 0.55], [f[0] + tt[0] * 0.55, f[1] + tt[1] * 0.55], y, y + 1.3, n, DOOR);
    }
  });
}

/* ---------- The ground round them (2d: southyard.ts) ---------- */

/** On the block's slab (world.ts `SLAB`), a hair over it; these follow the rolling ground (their Batches are lifted) */
const ON = 0.15 + 0.006;
const ASPHALT = toon(ROAD.asphalt);
const BAY_LINE = toon(ROAD.line);
const LAWN = toon(COVER.lawn);
const WORN = toon(COVER.dry);
const PLAY_FLOOR = toon(STONE.edge);
const SAND = toon(BANK.sand);
const BIN_COLOURS = ['#2f6a3c', '#2b2d3a', '#55697f', '#8b5a2b'].map((c) => toon(c));
const RAIL = toon('#3b3846');
/** The grit by the bins (the brutalist plan): bin bags, a dumped mattress and sofa, a trolley's wire basket */
const BAG = toon('#17181c');
const MATTRESS = toon('#b9ab8e');
const SOFA = toon('#5a3b34');
const TROLLEY = new THREE.MeshBasicMaterial({ color: '#8e949c', transparent: true, opacity: 0.55, depthWrite: false });

/** A thing's box (its corners, `y0` to `y1`) */
function thingBox(b: Batch, t: Thing, y0: number, y1: number, m: THREE.Material, shrink = 0) {
  b.add(plain(new THREE.BoxGeometry(t.w - shrink, y1 - y0, t.d - shrink).rotateY(-t.rot).translate(t.at[0], (y0 + y1) / 2, t.at[1])), m);
}
/** A point in a thing's frame (u along it, v across) */
const inThing = (t: Thing, u: number, v: number): Pt => [t.at[0] + u * Math.cos(t.rot) - v * Math.sin(t.rot), t.at[1] + u * Math.sin(t.rot) + v * Math.cos(t.rot)];

function drawCourt(b: Batch, poly: Pt[], court: string) {
  flat(b, poly, ON, ASPHALT);
  // (the bays' white lines: each bay's two sides)
  for (const bay of BAYS.filter((q) => q.court === court)) {
    const [p, q, r, t] = bayCorners(bay);
    for (const [a, c] of [[p, q], [t, r]] as [Pt, Pt][]) {
      const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const n: Pt = [-(c[1] - a[1]) / l, (c[0] - a[0]) / l];
      flat(b, [[a[0] + n[0] * 0.05, a[1] + n[1] * 0.05], [c[0] + n[0] * 0.05, c[1] + n[1] * 0.05], [c[0] - n[0] * 0.05, c[1] - n[1] * 0.05], [a[0] - n[0] * 0.05, a[1] - n[1] * 0.05]], ON + 0.004, BAY_LINE);
    }
  }
}
function drawBins(b: Batch, t: Thing, low: boolean) {
  // A low concrete pen, open on its long front, the bins in it
  const [c0, c1, c2, c3] = thingCorners(t);
  for (const [a, c] of [[c1, c2], [c2, c3], [c3, c0]] as [Pt, Pt][]) along(b, a, c, 0.12, ON, ON + t.h, CONC, 0);
  if (low) return;
  b.detail(() => {
    const n = Math.max(2, Math.floor(Math.max(t.w, t.d) / 0.7));
    const longU = t.w >= t.d;
    for (let i = 0; i < n; i++) {
      const s = -Math.max(t.w, t.d) / 2 + 0.45 + i * 0.7;
      const at = longU ? inThing(t, s, 0) : inThing(t, 0, s);
      b.add(plain(new THREE.BoxGeometry(0.5, 0.85, 0.55).rotateY(-t.rot).translate(at[0], ON + 0.425, at[1])), BIN_COLOURS[i % BIN_COLOURS.length]);
    }
    // The mess round it (the brutalist plan's grit): bin bags at its open front, and, by a hash of its place, a
    // mattress leant on its back wall, a sofa dumped by it, a shopping trolley
    const h = Math.abs(Math.round(t.at[0] * 11 + t.at[1] * 7));
    const front = (u: number, v: number) => inThing(t, u, v);
    for (let k = 0; k < 3 + (h % 3); k++) {
      const p = front(-t.w / 2 + 0.3 + ((k * 0.55 + (h % 5) * 0.1) % Math.max(0.6, t.w - 0.6)), t.d / 2 + 0.35 + (k % 2) * 0.2);
      b.add(plain(new THREE.IcosahedronGeometry(0.2 + (k % 2) * 0.05, 0).scale(1, 0.8, 1).translate(p[0], ON + 0.16, p[1])), BAG);
    }
    if (h % 3 === 0) {
      const p = front(t.w / 2 + 0.25, 0);
      b.add(plain(new THREE.BoxGeometry(0.12, 1.2, 0.9).rotateZ(0.25).rotateY(-t.rot).translate(p[0], ON + 0.58, p[1])), MATTRESS);
    }
    if (h % 4 === 1) {
      const p = front(-t.w / 2 - 0.7, t.d / 2 + 0.3);
      b.add(plain(new THREE.BoxGeometry(1.1, 0.25, 0.5).rotateY(-t.rot + 0.4).translate(p[0], ON + 0.2, p[1])), SOFA);
      const q = front(-t.w / 2 - 0.7 - 0.05, t.d / 2 + 0.1);
      b.add(plain(new THREE.BoxGeometry(1.1, 0.35, 0.15).rotateY(-t.rot + 0.4).translate(q[0], ON + 0.4, q[1])), SOFA);
    }
    if (h % 3 === 1) {
      const p = front(t.w / 2 + 0.6, t.d / 2 + 0.5);
      // (a trolley: its basket's wires, its handle, its wheels)
      b.add(plain(new THREE.BoxGeometry(0.55, 0.4, 0.38).rotateY(-t.rot - 0.6).translate(p[0], ON + 0.55, p[1])), TROLLEY);
      b.add(plain(new THREE.BoxGeometry(0.04, 0.6, 0.38).rotateY(-t.rot - 0.6).translate(p[0], ON + 0.3, p[1])), RAIL);
    }
  });
}
function drawShed(b: Batch, t: Thing) {
  // Posts at its corners, a roof over them, the bike stands under it
  for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const p = inThing(t, (u * t.w) / 2 * 0.92, (v * t.d) / 2 * 0.85);
    b.add(plain(new THREE.CylinderGeometry(0.05, 0.05, t.h - 0.3, 5).translate(p[0], ON + (t.h - 0.3) / 2, p[1])), RAIL);
  }
  // (its roof: a shallow slab in the estate's teal, a lip each long side)
  thingBox(b, t, ON + t.h - 0.3, ON + t.h - 0.2, ACCENT.teal, -0.2);
  b.detail(() => {
    for (let i = 0; i < 4; i++) {
      const p = inThing(t, -t.w / 2 + 0.5 + i * 0.75, 0);
      b.add(plain(new THREE.TorusGeometry(0.28, 0.025, 4, 10, Math.PI).rotateY(-t.rot + Math.PI / 2).translate(p[0], ON, p[1])), RAIL);
      // (a bike chained to every other stand: its wheels and its frame)
      if (i % 2 === 0)
        for (const du of [-0.38, 0.38]) {
          const w = inThing(t, -t.w / 2 + 0.5 + i * 0.75 + 0.15, du);
          b.add(plain(new THREE.TorusGeometry(0.3, 0.03, 4, 12).rotateY(-t.rot).translate(w[0], ON + 0.3, w[1])), RAIL);
        }
    }
  });
}
function drawPlay(b: Batch, low: boolean) {
  flat(b, PLAY, ON + 0.003, PLAY_FLOOR);
  // The climbing frame: a box of bars, a deck half way up, a slide off one end
  const f = FRAME;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => inThing(f, (u * f.w) / 2, (v * f.d) / 2));
  for (const p of corners) b.add(plain(new THREE.CylinderGeometry(0.06, 0.06, f.h, 6).translate(p[0], ON + f.h / 2, p[1])), ACCENT.orange);
  for (let i = 0; i < 4; i++) {
    const [p, q] = [corners[i], corners[(i + 1) % 4]];
    along(b, p, q, 0.08, ON + f.h - 0.08, ON + f.h, ACCENT.orange);
  }
  thingBox(b, f, ON + 1.0, ON + 1.08, CONC, 0.2);
  if (!low) {
    const s0 = inThing(f, f.w / 2, 0);
    const s1 = inThing(f, f.w / 2 + 1.8, 0);
    const l = 1.8;
    b.add(plain(new THREE.BoxGeometry(Math.hypot(l, 1.0), 0.06, 0.6).rotateZ(-Math.atan2(1.0, l)).rotateY(-f.rot).translate((s0[0] + s1[0]) / 2, ON + 0.55, (s0[1] + s1[1]) / 2)), ACCENT.teal);
  }
  // The sandpit: a low concrete edge, the sand in it
  const sp = SANDPIT;
  const sc = thingCorners(sp);
  for (let i = 0; i < 4; i++) along(b, sc[i], sc[(i + 1) % 4], 0.18, ON, ON + sp.h, CONC, 0);
  flat(b, thingCorners({ ...sp, w: sp.w - 0.3, d: sp.d - 0.3 }), ON + sp.h - 0.08, SAND);
  // The ball court: its lines, its fence (a gap in its west side), a goal at each end
  const bc = BALL_COURT;
  const [a, c, d, e] = thingCorners({ ...bc, w: bc.w - 0.6, d: bc.d - 0.6 });
  for (const [p, q] of [[a, c], [c, d], [d, e], [e, a]] as [Pt, Pt][]) {
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const n: Pt = [-(q[1] - p[1]) / l, (q[0] - p[0]) / l];
    flat(b, [[p[0] + n[0] * 0.05, p[1] + n[1] * 0.05], [q[0] + n[0] * 0.05, q[1] + n[1] * 0.05], [q[0] - n[0] * 0.05, q[1] - n[1] * 0.05], [p[0] - n[0] * 0.05, p[1] - n[1] * 0.05]], ON + 0.008, BAY_LINE);
  }
  for (const [p, q] of courtFence()) {
    along(b, p, q, 0.05, ON + bc.h - 0.06, ON + bc.h, RAIL);
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    for (let k = 0; k <= Math.ceil(l / 1.5); k++) {
      const t = Math.min(1, k / Math.ceil(l / 1.5));
      b.add(plain(new THREE.CylinderGeometry(0.04, 0.04, bc.h, 5).translate(p[0] + (q[0] - p[0]) * t, ON + bc.h / 2, p[1] + (q[1] - p[1]) * t)), RAIL);
    }
    if (!low) b.detail(() => along(b, p, q, 0.01, ON + 0.1, ON + bc.h - 0.1, toon('#4d4a5c'), 0));
  }
  for (const v of [-1, 1]) {
    const g0 = inThing(bc, -0.9, (v * (bc.d - 1.4)) / 2);
    const g1 = inThing(bc, 0.9, (v * (bc.d - 1.4)) / 2);
    for (const p of [g0, g1]) b.add(plain(new THREE.CylinderGeometry(0.05, 0.05, 1, 5).translate(p[0], ON + 0.5, p[1])), CONC);
    along(b, g0, g1, 0.06, ON + 0.96, ON + 1.04, CONC);
  }
}
function drawDeckProps(b: Batch, low: boolean) {
  for (const t of DECK_PROPS) {
    if (t.kind === 'planter') {
      thingBox(b, t, t.y, t.y + t.h, CONC);
      if (!low) b.detail(() => thingBox(b, t, t.y + t.h - 0.04, t.y + t.h + 0.25, GREEN, 0.15));
    } else if (!low) {
      b.detail(() => {
        thingBox(b, t, t.y + 0.38, t.y + 0.45, toon('#a3804f'));
        for (const u of [-0.5, 0.5]) {
          const p = inThing(t, u, 0);
          b.add(plain(new THREE.BoxGeometry(0.08, 0.38, t.d * 0.8).rotateY(-t.rot).translate(p[0], t.y + 0.19, p[1])), CONC);
        }
      });
    }
  }
}
function registerYard(low: boolean, scene: THREE.Scene | null) {
  for (const c of COURTS)
    site(`south-blocks ${c.id}`, rectOf(c.poly, 1), (into) => {
      const b = new Batch();
      drawCourt(b, c.poly, c.id);
      if (!low) b.detail(() => courtPuddles(b, c.poly, c.id, ON + 0.004));
      for (const t of [...BIN_STORES, ...BIKE_SHEDS].filter((q) => rectHas(rectOf(c.poly, 4), q.at))) (t.kind === 'bins' ? drawBins(b, t, low) : drawShed(b, t));
      b.build(into, { cast: true, receive: true });
    });
  GRASS.forEach((g, i) =>
    site(`south-blocks grass ${i}`, rectOf(g, 1), (into) => {
      const b = new Batch();
      flat(b, g, ON + 0.002, LAWN);
      for (const l of DESIRE_LINES) stripAlong(b, l, 0, 0.7, ON + 0.006, WORN, true);
      b.build(into, { cast: false, receive: true });
    })
  );
  site('south-blocks play', rectOf(PLAY, 1), (into) => {
    const b = new Batch();
    drawPlay(b, low);
    b.build(into, { cast: true, receive: true });
  });
  site('south-blocks deck props', rectOf(DECK_PROPS.map((t) => t.at), 2), (into) => {
    const b = new Batch();
    drawDeckProps(b, low);
    b.build(into, { cast: true, receive: true, lift: false });
  });
  // The parked cars (cars.ts: instanced near, the far fleet far; phones always far), on the main thread only
  if (scene)
    for (const c of COURTS) {
      const list = YARD_CARS.filter((q) => q[5] === c.id).map(([id, x, z, yaw, paint]): [CarId, number, number, number, string] => [id, x, z, yaw, paint]);
      if (list.length) parkedCars(scene, ON + 0.004, list);
    }
}
const rectHas = (r: Rect, [x, z]: Pt) => x > r[0] && x < r[2] && z > r[1] && z < r[3];

/* ---------- Registered ---------- */

export function register({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  registerYard(low, scene);
  registerDeckShops(scene, tick);
  const opts = { cast: true, receive: true, lift: false };
  for (const blk of BLOCKS) {
    if (blk.spine)
      blk.steps.forEach((st, i) => {
        const shape = stepShape(blk, st);
        site(`south-blocks ${blk.id} ${i}`, rectOf(shape.ring, blk.depth! / 2 + GALLERY_W + 1), (into) => {
          const b = new Batch();
          drawStep(b, blk, i, low);
          if (blk.id === BUNKER.of && i === 0) drawBunkerDoor(b, blk.base);
          b.build(into, opts);
        });
      });
    else if (blk.kind === 'tower')
      site(`south-blocks ${blk.id}`, rectOf(blk.foot, 2), (into) => {
        const b = new Batch();
        drawTower(b, blk, low);
        drawTowerDoors(b, blk);
        b.build(into, opts);
      });
    else
      site(`south-blocks ${blk.id}`, rectOf([...blk.foot, ...PERCH.foot], 1), (into) => {
        const b = new Batch();
        const towers = BLOCKS.filter((q) => q.kind === 'tower').map((q) => centre(q.foot));
        const lift = SKY_LIFTS.find((q) => q.id === blk.id)!;
        // (up to The Perch's floor: it's the top two floors, docs/brutalist-plan.md Phase 3)
        const floors = coreFloors(blk.id).filter((f) => f < TOP_FLOOR);
        drawCore(b, blk.foot, blk.base, PERCH.y0 - PERCH_SLAB - 0.01, centre(blk.foot), towers, floors.map((f) => floorY(blk.base, f)), lift.door);
        drawStair(b);
        drawPerch(b, low);
        b.build(into, opts);
      });
  }
  CORES.forEach((c: Core) =>
    site(`south-blocks core ${c.id}`, rectOf([...c.foot, ...(c.link ?? [])], 1), (into) => {
      const b = new Batch();
      const blk = BLOCKS.find((q) => q.id === c.of)!;
      // (its slot down the face away from its block's spine)
      const near = pointAt(blk.spine!, Math.min(lineLength(blk.spine!), Math.max(0, alongOf(blk.spine!, c.at)))).p;
      const lift = SKY_LIFTS.find((q) => q.id === c.id)!;
      const landings = coreFloors(c.id).map((f) => floorY(blk.base, f));
      drawCore(b, c.foot, blk.base, c.top, c.at, [near], landings, lift.door, c.link);
      // A service tower standing off its block: a covered link from the gallery to it at each landing
      // (its portal at the gallery; every fourth tower's link lights tired, stuttering)
      // (and every seventh's dead: no light at all)
      const i = CORES.indexOf(c);
      const light = i % 7 === 5 ? null : i % 4 === 3 ? STRIP_TIRED : STRIP;
      if (c.link)
        for (const y of landings) {
          drawBridge(b, c.link[0], c.link[1], y, light);
          drawPortal(b, c.link[0], c.link[1], y);
          // Pigeon netting slung under it, near only, not on phones
          if (!low)
            b.detail(() => {
              const [a, e] = c.link!;
              const l = Math.hypot(e[0] - a[0], e[1] - a[1]) || 1;
              const r: Pt = [(-(e[1] - a[1]) / l) * BRIDGE_HALF, ((e[0] - a[0]) / l) * BRIDGE_HALF];
              flat(b, [[a[0] + r[0], a[1] + r[1]], [e[0] + r[0], e[1] + r[1]], [e[0] - r[0], e[1] - r[1]], [a[0] - r[0], a[1] - r[1]]], y - 0.5, MESH, false);
            });
        }
      drawBoilerHouse(b, c, near);
      b.build(into, opts);
    })
  );
  // The towers' stair cages (one site each)
  CAGES.forEach((g, i) =>
    site(`south-blocks cage ${g.id}`, rectOf([g.at(0, -CAGE.half), g.at(CAGE.len, -CAGE.half), g.at(CAGE.len, CAGE.half), g.at(0, CAGE.half)], 1), (into) => {
      const b = new Batch();
      drawCage(b, g, low, i % 3 === 2);
      b.build(into, opts);
    })
  );
  // The bridges (one site a span: its floors over each other)
  const spans = new Map<string, typeof BRIDGES>();
  for (const br of BRIDGES) {
    const key = br.pts.flat().map((v) => v.toFixed(1)).join(',');
    spans.set(key, [...(spans.get(key) ?? []), br]);
  }
  [...spans.values()].forEach((set, i) =>
    site(`south-blocks bridge ${i}`, rectOf(set[0].pts, 2), (into) => {
      const b = new Batch();
      for (const br of set) {
        const [a, c] = br.pts;
        const y = (br.ys[0] + br.ys[1]) / 2;
        drawBridge(b, a, c, y);
        // (each end's block named on the parapet a little before it, on the left walking towards it)
        const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
        if (l > 4 && !low)
          b.detail(() => {
            if (endName(br.b, br.floor)) drawName(b, a, c, y, l - 1.3, -1, endName(br.b, br.floor));
            if (endName(br.a, br.floor)) drawName(b, a, c, y, 1.3, 1, endName(br.a, br.floor));
          });
      }
      for (const p of PIERS.filter((q) => set.some((br) => q.id.startsWith(`${br.id}-pier`)))) drawPier(b, p);
      b.build(into, opts);
    })
  );
  for (const d of DECKS)
    site(`south-blocks deck ${d.id}`, rectOf(d.poly, 1), (into) => {
      const b = new Batch();
      drawDeck(b, d.poly, d.y, Math.min(...BLOCKS.filter((q) => q.id === 'teasel' || q.id === 'fennel').map((q) => q.base)));
      // (the shops under it, docs/brutalist-plan.md Phase 5)
      drawShops(b, low);
      b.build(into, opts);
    });
  // Degen's flat (Phase 7a): its own site, out of the sun's shadow (inside Kite Point)
  site('south-blocks flat', rectOf(FLAT.outline, 1), (into) => {
    const b = new Batch();
    drawFlat(b, low);
    b.build(into, { cast: false, receive: false, lift: false });
  });
  // The lobbies (Phase 6): each its own site, out of the sun's shadow (they're inside the blocks)
  for (const l of LOBBIES)
    site(`south-blocks ${l.id}`, rectOf([...l.poly, ...l.doorPoly], 1), (into) => {
      const b = new Batch();
      drawLobby(b, l, low);
      b.build(into, { cast: false, receive: false, lift: false });
    });
  // Cables strung between the blocks (Phase 5), not on phones
  if (!low)
    CABLES.forEach((cb, i) =>
      site(`south-blocks cable ${i}`, [Math.min(cb.a[0], cb.c[0]) - 1, Math.min(cb.a[2], cb.c[2]) - 1, Math.max(cb.a[0], cb.c[0]) + 1, Math.max(cb.a[2], cb.c[2]) + 1], (into) => {
        const b = new Batch();
        drawCable(b, cb);
        b.build(into, { cast: false, receive: false, lift: false });
      })
    );
}
