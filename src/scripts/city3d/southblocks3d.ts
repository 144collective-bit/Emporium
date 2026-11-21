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
 * The blocks stand level on their own plinths (their bases): their Batches aren't lifted onto the rolling ground
 * (`build()`'s `lift`). Their solids are solids.ts's (`BLOCK_SOLIDS`).
 */
import * as THREE from 'three';
import type { Tick } from './world';
import { Batch, lit, neon, toon } from './kit';
import { ATLAS, kit, type Frame } from './infill';
import { site } from './tilework';
import { PLANT } from './palette';
import { shift } from './streetfaces';
import {
  ACCENTS, BLOCKS, BRIDGES, BRIDGE_HALF, BUNKER, CONCRETE, CORES, DECKS, GALLERY_W, GROUND_H, PARAPET, PLANT_H, BEACON_H,
  SKY_FLOORS, TOWER_HALF, blockById, floorY, inBlock, lineLength, outward, pointAt, roofY, section, stepShape, storeysOf,
  type Block, type Core, type Pt,
} from './southblocks';
import { CORE_GAP, DOOR_OUT, LANDING_H, SKY_LIFTS, STAIR, coreFloors } from './southsky';
import { BALL_COURT, BAYS, BIKE_SHEDS, BIN_STORES, COLUMN_R, DECK_COLUMNS, DECK_PROPS, FRAME, SANDPIT, YARD_CARS, bayCorners, courtFence, thingCorners, type Thing } from './southyard';
import { COURTS, DESIRE_LINES, GRASS, PLAY } from './southblocks';
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
    k.all(() => {
      const deck = [...inner, ...[...outer].reverse()];
      flat(b, deck, y, CONC);
      flat(b, deck, y - 0.16, CONC_DARK, false);
      // (the front: a solid concrete upstand, its outer face on the gallery's edge; open where a core stands out from
      // it, southsky.ts `CORE_GAP`)
      for (const run of openRuns(blk, part)) upstand(b, run, s * (blk.depth! / 2 + GALLERY_W), 0.12, y - 0.16, y + 0.62, CONC);
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
        flat(b, deck, y + 0.04, CONC);
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
      flat(b, out, y + 0.14, CONC);
      flat(b, out, y - 0.12, CONC_DARK, false);
    }
    // The plant room: a plain concrete box set back on the roof, its corners cut as the tower's, and its beacon
    prism(b, grow(ring, -TOWER_HALF * 0.3), top, top + PLANT_H, CONC, ROOF);
    b.add(plain(new THREE.CylinderGeometry(0.05, 0.05, BEACON_H, 6).translate(c[0], top + PLANT_H + BEACON_H / 2, c[1])), CONC_DARK);
    b.add(plain(new THREE.SphereGeometry(0.13, 8, 6).translate(c[0], top + PLANT_H + BEACON_H, c[1])), BEACON);
  });
}

/* ---------- The cores ---------- */

/**
 * A core: concrete, open at each landing (`landings`: the levels of its floors, a post at each corner), a lit stair slot
 * down each face turned away from what it serves; its lift's door at its foot
 */
function drawCore(b: Batch, ring: Pt[], base: number, top: number, at: Pt, from: Pt[], landings: number[], door: { x: number; z: number; yaw: number } | null) {
  const k = kit(b, WORLD);
  const cuts = [...landings].sort((p, q) => p - q);
  k.all(() => {
    // (solid between its landings, each landing's floor the cap of the stretch under it, its ceiling the next one's
    // underside)
    let y0 = base;
    for (const y of [...cuts, Infinity]) {
      const y1 = Math.min(y, top);
      if (y1 - y0 > 0.05) {
        prism(b, ring, y0, y1, CONC, y1 === top ? ROOF : CONC);
        if (y0 > base) flat(b, ring, y0, CONC_DARK, false);
      }
      if (!Number.isFinite(y)) break;
      y0 = y + LANDING_H;
    }
    // The landings' corner posts
    const posts = cornersOf(ring);
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

/** A rounded square's four corners, a little in: the ring's points furthest out each way round its middle */
function cornersOf(ring: Pt[]): Pt[] {
  const c = centre(ring);
  const far = [...ring].sort((p, q) => Math.hypot(q[0] - c[0], q[1] - c[1]) - Math.hypot(p[0] - c[0], p[1] - c[1]));
  const out: Pt[] = [];
  for (const p of far) {
    if (out.length === 4) break;
    if (out.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 1)) out.push(p);
  }
  return out.map((p) => [c[0] + (p[0] - c[0]) * 0.85, c[1] + (p[1] - c[1]) * 0.85]);
}
const centre = (ring: Pt[]): Pt => [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];

/* ---------- The bridges, the podium deck, Bunker Sound's door ---------- */

function drawBridge(b: Batch, a: Pt, c: Pt, y: number, strip: THREE.Material = STRIP) {
  const k = kit(b, WORLD);
  const w = BRIDGE_HALF * 2;
  k.all(() => {
    along(b, a, c, w, y - 0.2, y, CONC_DARK);
    for (const side of [-1, 1]) {
      along(b, a, c, 0.12, y, y + 0.6, CONC, side * (BRIDGE_HALF - 0.06));
      along(b, a, c, 0.04, y + 0.6, y + 1.5, GLASS, side * (BRIDGE_HALF - 0.1));
    }
    along(b, a, c, w + 0.12, y + 1.5, y + 1.68, CONC);
  });
  along(b, a, c, 0.1, y - 0.24, y - 0.2, strip);
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
    flat(b, poly, y, PAVING);
    flat(b, poly, y - 0.3, CONC_DARK, false);
    poly.forEach((a, j) => {
      const c = poly[(j + 1) % poly.length];
      const n = outward(poly, j);
      quad(b, a, c, y - 0.3, y, n, CONC);
      // (a balustrade where it isn't against a gallery)
      const mid: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      if (!inBlock(mid, 2.4)) along(b, a, c, 0.12, y, y + 0.6, CONC, -0.07);
    });
    // Its columns down to the court (southyard.ts)
    for (const [x, z] of DECK_COLUMNS) b.add(plain(new THREE.CylinderGeometry(COLUMN_R, COLUMN_R, y - 0.3 - base, 10).translate(x, (base + y - 0.3) / 2, z)), CONC);
  });
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

export function register({ low, scene }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  registerYard(low, scene);
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
      site(`south-blocks ${blk.id}`, rectOf(blk.foot, 1), (into) => {
        const b = new Batch();
        const towers = BLOCKS.filter((q) => q.kind === 'tower').map((q) => centre(q.foot));
        const lift = SKY_LIFTS.find((q) => q.id === blk.id)!;
        drawCore(b, blk.foot, blk.base, roofY(blk.base, storeysOf(blk)) + 0.8, centre(blk.foot), towers, coreFloors(blk.id).map((f) => floorY(blk.base, f)), lift.door);
        drawStair(b);
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
      drawCore(b, c.foot, blk.base, c.top, c.at, [near], landings, lift.door);
      // A service tower standing off its block: a covered link from the gallery to it at each landing
      // (its portal at the gallery; every fourth tower's link lights tired, stuttering)
      const tired = CORES.indexOf(c) % 4 === 3;
      if (c.link)
        for (const y of landings) {
          drawBridge(b, c.link[0], c.link[1], y, tired ? STRIP_TIRED : STRIP);
          drawPortal(b, c.link[0], c.link[1], y);
        }
      drawBoilerHouse(b, c, near);
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
      for (const br of set) drawBridge(b, br.pts[0], br.pts[1], (br.ys[0] + br.ys[1]) / 2);
      b.build(into, opts);
    })
  );
  for (const d of DECKS)
    site(`south-blocks deck ${d.id}`, rectOf(d.poly, 1), (into) => {
      const b = new Batch();
      drawDeck(b, d.poly, d.y, Math.min(...BLOCKS.filter((q) => q.id === 'teasel' || q.id === 'fennel').map((q) => q.base)));
      b.build(into, opts);
    });
}
