/*
 * Endswood's blocks drawn (docs/south-plan.md Phase 2, step 2b; the data is southblocks.ts), a district loaded as you
 * approach (districts.ts `LAZY_DISTRICTS` id `south-blocks`), as sites (tilework.ts), in the owner's 70s retro-future:
 * warm board-marked concrete, the precast panels' ribbon windows from the wall atlas (lit at night), rounded ends,
 * each block's accent on its gallery and balcony fronts and its ground floor's fascia.
 *
 * - **The slabs and the Rampart**, a step at a time: walls (a glazed ground floor on the galleried side and the ends,
 *   concrete on the other), the steps' walls where a taller one meets a lower, roofs and parapets, sky gardens on the
 *   roofs (near only); the Rampart's archway (its soffit and its piers' faces); the galleries at every third floor
 *   (deck, accent front, a warm strip light under it at night); balconies with curved accent fronts on the slabs'
 *   other sides (near only).
 * - **The towers**: their walls, a ledge ring every third floor, the flared plant room on top, the beacon.
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
import { Batch, neon, toon } from './kit';
import { ATLAS, kit, type Frame } from './infill';
import { site } from './tilework';
import { PLANT } from './palette';
import { shift } from './streetfaces';
import {
  ACCENTS, BLOCKS, BRIDGES, BRIDGE_HALF, BUNKER, CONCRETE, CORES, DECKS, GALLERY_W, GROUND_H, PARAPET, PLANT_H, BEACON_H,
  SKY_FLOORS, TOWER_HALF, floorY, inBlock, lineLength, outward, pointAt, roofY, section, stepShape, storeysOf,
  type Block, type Core, type Pt,
} from './southblocks';

export const SELF = import.meta.url;

type Rect = [number, number, number, number];
const WORLD: Frame = { M: new THREE.Matrix4(), w: 0, d: 0, L: [0, 0], t: [1, 0], n: [0, 1] };

/* ---------- Materials ---------- */

const CONC = toon(CONCRETE);
const CONC_DARK = toon('#8b8277');
const ROOF = toon('#6d6862');
const PAVING = toon('#9b958c');
const PLY = toon('#a3804f');
const HOARDING = toon('#55697f');
const DOOR = toon('#1b1820');
const GREEN = toon(PLANT.shrub);
const ACCENT: Record<keyof typeof ACCENTS, THREE.Material> = { orange: toon(ACCENTS.orange), teal: toon(ACCENTS.teal), mustard: toon(ACCENTS.mustard) };
/** Warm strip lights (under the galleries and bridges), the bridges' glass, the stair slots: dim by day, lit at night */
const STRIP = neon('#ffcf86', 0.25, 1.25);
const GLASS = neon('#ffe2b4', 0.16, 0.95);
const SLOT = neon('#ffe0a6', 0.14, 0.9);
const BEACON = neon('#ff4a3a', 0.8, 2.2);
const BUNKER_NEON = neon('#ff3fb0', 0.6, 1.7);
const WALL = ATLAS.wall.panel;
const LOBBY = ATLAS.ground.lobby;
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
          quad(b, a, c, base + LOBBY_H, base + GROUND_H, n, acc);
        } else quad(b, a, c, base, base + GROUND_H, n, CONC);
      } else quad(b, a, c, y0, base + GROUND_H + 2 * 1, n, CONC);
      const upper = arch ? floorY(base, 3) : base + GROUND_H;
      if (refit) quad(b, a, c, upper, top, n, CONC_DARK);
      else k.wall(WALL, a, c, upper, top, n, u0, 1);
      // The parapet over it (its outer face the wall's, carried up)
      parapet(b, a, c, n, top);
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
      // (the front: a solid upstand, the block's colour, its outer face on the gallery's edge)
      upstand(b, part, s * (blk.depth! / 2 + GALLERY_W), 0.12, y - 0.16, y + 0.62, acc);
    });
    stripAlong(b, part, s * (blk.depth! / 2 + GALLERY_W - 0.3), 0.08, y - 0.18, STRIP);
  }

  // Balconies on its other side (the slabs': the Rampart's road side has none), curved fronts in its colour
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
        upstand(b, part.filter((p) => !inRefit(p)), -s * (blk.depth! / 2 + 0.55), 0.08, y - 0.04, y + 0.45, acc);
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
  let u = 0;
  k.all(() => {
    ring.forEach((a, j) => {
      const c = ring[(j + 1) % ring.length];
      const n = outward(ring, j);
      const u0 = u;
      u += Math.hypot(c[0] - a[0], c[1] - a[1]) / WALL.tw;
      k.wall(LOBBY, a, c, base, base + LOBBY_H, n, u0 * 3);
      quad(b, a, c, base + LOBBY_H, base + GROUND_H, n, acc);
      k.wall(WALL, a, c, base + GROUND_H, top, n, u0, 1);
      parapet(b, a, c, n, top);
    });
    flat(b, ring, top - 0.002, ROOF);
    // A ledge ring every third floor, its edge in the tower's colour
    const out = grow(ring, 0.35);
    for (const f of SKY_FLOORS) {
      const y = floorY(base, f);
      out.forEach((p, j) => quad(b, p, out[(j + 1) % out.length], y - 0.12, y + 0.14, outward(out, j), acc));
      flat(b, out, y + 0.14, CONC);
      flat(b, out, y - 0.12, CONC_DARK, false);
    }
    // The plant room, flared, and its beacon
    const c = t.foot.reduce((m, p) => [m[0] + p[0] / t.foot.length, m[1] + p[1] / t.foot.length] as Pt, [0, 0] as Pt);
    const seg = low ? 12 : 20;
    b.add(plain(new THREE.CylinderGeometry(TOWER_HALF * 0.8, TOWER_HALF * 0.62, PLANT_H, seg).translate(c[0], top + PLANT_H / 2, c[1])), CONC);
    b.add(plain(new THREE.CylinderGeometry(TOWER_HALF * 0.82, TOWER_HALF * 0.82, 0.18, seg).translate(c[0], top + PLANT_H - 0.05, c[1])), acc);
    b.add(plain(new THREE.CylinderGeometry(0.05, 0.05, BEACON_H, 6).translate(c[0], top + PLANT_H + BEACON_H / 2, c[1])), CONC_DARK);
    b.add(plain(new THREE.SphereGeometry(0.13, 8, 6).translate(c[0], top + PLANT_H + BEACON_H, c[1])), BEACON);
  });
}

/* ---------- The cores ---------- */

/** A core: concrete, a lit stair slot down each face turned away from what it serves */
function drawCore(b: Batch, ring: Pt[], base: number, top: number, at: Pt, from: Pt[]) {
  const k = kit(b, WORLD);
  k.all(() => {
    prism(b, ring, base, top, CONC, ROOF);
    ring.forEach((a, j) => {
      const c = ring[(j + 1) % ring.length];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (len < 1.2) return;
      const n = outward(ring, j);
      const away = from.every((f) => (at[0] - f[0]) * n[0] + (at[1] - f[1]) * n[1] > -0.2 * Math.hypot(at[0] - f[0], at[1] - f[1]));
      if (!away) return;
      const m: Pt = [(a[0] + c[0]) / 2 + n[0] * 0.012, (a[1] + c[1]) / 2 + n[1] * 0.012];
      const t: Pt = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
      quad(b, [m[0] - t[0] * 0.14, m[1] - t[1] * 0.14], [m[0] + t[0] * 0.14, m[1] + t[1] * 0.14], base + 1.5, top - 0.6, n, SLOT);
    });
  });
}
const centre = (ring: Pt[]): Pt => [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];

/* ---------- The bridges, the podium deck, Bunker Sound's door ---------- */

function drawBridge(b: Batch, a: Pt, c: Pt, y: number) {
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
  along(b, a, c, 0.1, y - 0.24, y - 0.2, STRIP);
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
    // Its columns, on a grid inside it
    const [x0, z0, x1, z1] = rectOf(poly, 0);
    const insidePoly = (p: Pt) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
        if (poly[i][1] > p[1] !== poly[j][1] > p[1] && p[0] < ((poly[j][0] - poly[i][0]) * (p[1] - poly[i][1])) / (poly[j][1] - poly[i][1]) + poly[i][0]) inside = !inside;
      return inside;
    };
    for (let x = x0 + 2; x < x1; x += 5)
      for (let z = z0 + 2; z < z1; z += 5) {
        const p: Pt = [x, z];
        if (!insidePoly(p) || inBlock(p, 3)) continue;
        b.add(plain(new THREE.CylinderGeometry(0.26, 0.26, y - 0.3 - base, 10).translate(x, (base + y - 0.3) / 2, z)), CONC);
      }
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

/* ---------- Registered ---------- */

export function register({ low }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
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
        b.build(into, opts);
      });
    else
      site(`south-blocks ${blk.id}`, rectOf(blk.foot, 1), (into) => {
        const b = new Batch();
        const towers = BLOCKS.filter((q) => q.kind === 'tower').map((q) => centre(q.foot));
        drawCore(b, blk.foot, blk.base, roofY(blk.base, storeysOf(blk)) + 0.8, centre(blk.foot), towers);
        b.build(into, opts);
      });
  }
  CORES.forEach((c: Core) =>
    site(`south-blocks core ${c.id}`, rectOf(c.foot, 1), (into) => {
      const b = new Batch();
      const blk = BLOCKS.find((q) => q.id === c.of)!;
      // (its slot down the face away from its block's spine)
      const near = pointAt(blk.spine!, Math.min(lineLength(blk.spine!), Math.max(0, alongOf(blk.spine!, c.at)))).p;
      drawCore(b, c.foot, blk.base, c.top, c.at, [near]);
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
