/*
 * Degen's wardrobe as data (DOM-free, so the tests can dress and pose him):
 * the outfits, the shapes every garment is built from (cross-sections lofted
 * into shells, flat details laid on them) and `items()`, every piece he can
 * wear on the rig's joints. character.ts turns them into the skinned figure
 * and the crowds; `restSkin()` is a piece where it is at rest with its bones,
 * the same numbers the figure is skinned with. docs/clothing-plan.md.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Look, MarkId, MarkSlot, PatternId } from '../net/profile-data';
import { EYE_Y as HERO_EYE_Y, HEAD_TOP as HERO_HEAD_TOP, handParts, headFront, headGeometry, headRow, inHead } from './body';
import { HEAD_Y, HIP_Y, LEG_X, THIGH, WRIST_Y, WRIST_Z, weigh, type BoneName, type Influence, type Joint, type Region } from './skeleton';

/* ---------- Outfits ---------- */

export type OutfitKind = 'suit' | 'hoodie' | 'track' | 'varsity' | 'puffer' | 'soldier';
export interface Outfit {
  kind: OutfitKind;
  /** Jacket, hoodie, track jacket, varsity or puffer jacket, or fatigues */
  top: string;
  /** Trousers or joggers */
  bottom: string;
  shoes: string;
  tie?: string;
  /** Cap colour; leave out for no cap */
  cap?: string;
  /** The cap worn backwards */
  capBack?: boolean;
  /** Beanie or bucket hat colour (instead of a cap) */
  beanie?: string;
  bucket?: string;
  crown?: boolean;
  /** Cowboy hat or top hat colour (premium, instead of a cap) */
  cowboy?: string;
  tophat?: string;
  /** A neon halo floating over the head (premium, instead of a hat; glows in the lens colour) */
  halo?: boolean;
  /** Colour of the shades' lenses (green as in the art), and of any neon he wears */
  lens?: string;
  /** Hoodie with the hood up (no cap) */
  hood?: boolean;
  backpack?: string;
  crossbody?: string;
  /** Skate deck on the back */
  board?: string;
  /** Duffel bag slung across the back (premium) */
  duffel?: string;
  /** Neon-edged wings on the back (premium): the wings' colour, the edges glow in the lens colour */
  wings?: string;
  headphones?: string;
  /** Gold chain on the shades */
  chain?: boolean;
  /** Gold chain with a diamond round the neck */
  necklace?: boolean;
  /** Gold watch on the left wrist (premium) */
  watch?: boolean;
  /** In the right hand: an iced coffee, a boombox, a phone or a briefcase (empty-handed by default); the crowd's
   * shoppers on Crestmont's Drive carry a shopping bag (never the player's: `Look` has none) */
  held?: 'coffee' | 'boombox' | 'phone' | 'briefcase' | 'shopping';
  /** Which hand carries a rifle (soldiers) */
  rifle?: 'left' | 'right';
  /** Both hands closed into fists (fighting; the open hands are left off) */
  fists?: boolean;
  /** Merch (single figures only): the top's mark, where it goes and its ink, the mark on a cap or beanie, on the sneakers, and an all-over print on the top */
  mark?: MarkId;
  markAt?: MarkSlot;
  ink?: string;
  hatMark?: MarkId;
  shoeMark?: MarkId;
  pattern?: PatternId;
  /** Width and height multipliers, for a bit of variety in build */
  build?: number;
  height?: number;
}

/** Degen as he is in the art. */
export const PLAYER: Outfit = {
  kind: 'suit',
  top: '#16141f',
  bottom: '#16141f',
  shoes: '#1b1830',
  tie: '#1f9d55',
  cap: '#d8312f',
  chain: true,
};
export const SOLDIER: Outfit = {
  kind: 'soldier',
  top: '#5a6b3a',
  bottom: '#465530',
  shoes: '#2b2a33',
  rifle: 'right',
};

/** A player's wardrobe choices as a Degen outfit */
export function lookOutfit(l: Look): Outfit {
  const hat = l.kind === 'hoodie' && l.hood ? null : l.hat;
  const bag = (k: Look['bag']) => (l.bag === k ? l.bagColor : undefined);
  return {
    kind: l.kind,
    top: l.top,
    bottom: l.bottom,
    shoes: l.shoes,
    tie: l.kind === 'suit' ? l.tie : undefined,
    cap: hat === 'cap' || hat === 'backcap' ? l.hatColor : undefined,
    capBack: hat === 'backcap',
    beanie: hat === 'beanie' ? l.hatColor : undefined,
    bucket: hat === 'bucket' ? l.hatColor : undefined,
    crown: hat === 'crown',
    cowboy: hat === 'cowboy' ? l.hatColor : undefined,
    tophat: hat === 'tophat' ? l.hatColor : undefined,
    halo: hat === 'halo',
    hood: l.kind === 'hoodie' && l.hood,
    lens: l.lens,
    headphones: l.headphones ?? undefined,
    backpack: bag('backpack'),
    crossbody: bag('crossbody'),
    board: bag('board'),
    duffel: bag('duffel'),
    wings: bag('wings'),
    chain: l.chain,
    necklace: l.necklace,
    watch: l.watch,
    held: l.held ?? undefined,
    mark: l.mark ?? undefined,
    markAt: l.markAt,
    ink: l.ink,
    hatMark: l.hatMark,
    shoeMark: l.shoeMark ?? undefined,
    pattern: l.pattern,
  };
}

/* ---------- Shapes ---------- */

/**
 * Detail level: 0 the light (phone) crowd, 1 the crowd, 2 a single figure (the player, the hologram) on a
 * phone, 3 a single figure on a desktop (docs/clothing-plan.md: finer rings, smoother curves, finer laid-on
 * details; `figureDetail()` in character.ts picks 2 or 3 by the city's tier)
 */
export type Detail = 0 | 1 | 2 | 3;

/** A cross-section: height, half-width, half-depth and how far forward its middle sits */
type Sec = [y: number, hw: number, hd: number, z?: number];

const sorted = (secs: Sec[]) => [...secs].sort((a, b) => a[0] - b[0]);

/**
 * A smooth closed body through cross-sections up y: superellipse rings
 * (`n` 2 is an ellipse, higher is boxier), each end closed on its middle.
 * Ending on a tiny section makes a dome.
 */
function loft(secs: Sec[], seg: number, n = 2) {
  const ss = sorted(secs);
  const R = ss.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const e = 2 / n;
  for (const [y, hw, hd, z = 0] of ss)
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      pos.push(Math.sign(c) * Math.abs(c) ** e * hw, y, z + Math.sign(s) * Math.abs(s) ** e * hd);
    }
  for (let i = 0; i < R - 1; i++)
    for (let k = 0; k < seg; k++) {
      const a = i * seg + k;
      const b = i * seg + ((k + 1) % seg);
      idx.push(a, a + seg, b, b, a + seg, b + seg);
    }
  const lo = R * seg;
  pos.push(0, ss[0][0], ss[0][3] ?? 0, 0, ss[R - 1][0], ss[R - 1][3] ?? 0);
  for (let k = 0; k < seg; k++) {
    const k1 = (k + 1) % seg;
    idx.push(lo, k, k1, lo + 1, (R - 1) * seg + k1, (R - 1) * seg + k);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Where a loft's surface is at (x, y): its front (side 1) or back (side -1) */
function surface(secs: Sec[], n = 2, side = 1) {
  const ss = sorted(secs);
  return (x: number, y: number) => {
    let i = 0;
    while (i < ss.length - 2 && y > ss[i + 1][0]) i++;
    const [y0, w0, d0, z0 = 0] = ss[i];
    const [y1, w1, d1, z1 = 0] = ss[i + 1];
    const f = THREE.MathUtils.clamp((y - y0) / (y1 - y0 || 1), 0, 1);
    const hw = w0 + (w1 - w0) * f;
    const hd = d0 + (d1 - d0) * f;
    const u = Math.min(0.995, Math.abs(x) / hw);
    return z0 + (z1 - z0) * f + side * hd * (1 - u ** n) ** (1 / n);
  };
}

/** How finely flat pieces are split to follow a curved body: single figures only (a crowd's are lifted a touch instead) */
let bend = 0;
/**
 * The suit's laid-on pieces (lapels, shirt, collar, tie, flaps): their outline split as finely as the bend
 * splits their face, and their sides kept apart from it, so their edges ink as solid lines (docs/clothing-plan.md
 * Phase 3); the rest as they were until their phases
 */
let crisp = false;
/** A closed outline with points added along each edge, none longer than `step` */
const dense = (p: [number, number][], step: number) =>
  p.flatMap(([x, y], i) => {
    const [x1, y1] = p[(i + 1) % p.length];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x, y1 - y) / step));
    return Array.from({ length: n }, (_, k): [number, number] => [x + ((x1 - x) * k) / n, y + ((y1 - y) * k) / n]);
  });
/** A flat shape (x, y) with a little thickness, lying on a surface `lift` above it */
function onBody(pts: [number, number][] | THREE.Shape, depth: number, surf: (x: number, y: number) => number, lift: number, side = 1) {
  // (crisp: its outline split as finely as the bend splits its face, so the top and the sides share every point
  // along the edge: split only on the top, the two came apart where it bent, and the ink drew the gaps as dashes)
  const shape = Array.isArray(pts) ? new THREE.Shape((bend && crisp ? dense(pts, bend) : pts).map(([x, y]) => new THREE.Vector2(x, y))) : pts;
  const flatG = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
  const g = bend ? tessellate(flatG, bend, crisp) : flatG;
  if (!bend) lift += 0.003;
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, surf(x, y) + side * (lift + p.getZ(i)));
  }
  if (side < 0) flipFaces(g);
  // Smooth: shaded a triangle at a time, a lapel bent over the chest looked crumpled
  g.deleteAttribute('normal');
  const out = mergeVertices(g, 1e-5);
  g.dispose();
  out.computeVertexNormals();
  return out;
}
/**
 * A strip laid down a surface (a zip, a placket): `x0` to `x1` across, `y0` to `y1` up, `depth` thick and `lift`
 * off it, a row every `step` (as fine as the bend; a crowd's every 5 cm, lifted a touch more), its face smooth and
 * its sides apart from it, so its edges ink as solid lines (Phase 4: laid on as an outline, a zip cost thousands
 * of triangles)
 */
function tape(x0: number, x1: number, y0: number, y1: number, depth: number, surf: (x: number, y: number) => number, lift: number) {
  const step = bend || 0.05;
  if (!bend) lift += 0.003;
  const n = Math.max(1, Math.ceil((y1 - y0) / step));
  const ys = Array.from({ length: n + 1 }, (_, i) => y0 + ((y1 - y0) * i) / n);
  // (its sides bevelled, the top narrower than its foot, so both face the camera a little and ink alike: upright,
  // the near one inked in dashes, seen edge on, and the far one not at all)
  const bev = Math.min(depth * 0.7, (x1 - x0) * 0.25);
  const at = (x: number, y: number, up: number) => {
    const xb = x + up * bev * (x < (x0 + x1) / 2 ? 1 : -1);
    return [xb, y, surf(xb, y) + lift + up * depth];
  };
  // (a sheet between two lines up the strip, facing the way a-to-b crossed with up)
  const sheet = (a: (y: number) => number[], b: (y: number) => number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(ys.flatMap((y) => [...a(y), ...b(y)]), 3));
    const idx: number[] = [];
    for (let i = 0; i < n; i++) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  const end = (y: number, s: number) => {
    const g = new THREE.BufferGeometry();
    const [p, q, r, t] = [at(x0, y, 0), at(x1, y, 0), at(x1, y, 1), at(x0, y, 1)];
    g.setAttribute('position', new THREE.Float32BufferAttribute(s > 0 ? [...p, ...t, ...q, ...q, ...t, ...r] : [...p, ...q, ...t, ...q, ...r, ...t], 3));
    g.computeVertexNormals();
    return g;
  };
  const parts = [
    sheet((y) => at(x0, y, 1), (y) => at(x1, y, 1)),
    sheet((y) => at(x0, y, 0), (y) => at(x0, y, 1)),
    sheet((y) => at(x1, y, 1), (y) => at(x1, y, 0)),
  ].map((g) => g.toNonIndexed());
  for (const g of parts) g.deleteAttribute('uv');
  return mergeGeometries([...parts, end(y0, -1), end(y1, 1)])!;
}
/** Where the side of a loft is at (z, y): its +x side (a sleeve's outside) */
function sideSurface(secs: Sec[], n = 2) {
  const ss = sorted(secs);
  return (z: number, y: number) => {
    let i = 0;
    while (i < ss.length - 2 && y > ss[i + 1][0]) i++;
    const [y0, w0, d0] = ss[i];
    const [y1, w1, d1] = ss[i + 1];
    const f = THREE.MathUtils.clamp((y - y0) / (y1 - y0 || 1), 0, 1);
    const hw = w0 + (w1 - w0) * f;
    const hd = d0 + (d1 - d0) * f;
    return hw * (1 - Math.min(0.995, Math.abs(z) / hd) ** n) ** (1 / n);
  };
}
type Place = (u: number, v: number) => [number, number, number];
/**
 * A printed mark: a square `size` across laid on the cloth. `place(u, v)`
 * puts a point of it on the surface (u to the right as you look at it, v
 * up, both from its middle), so it reads the right way round and faces
 * out. Its uv is the whole square: createDegen points it at the mark's cell
 * in the logo atlas.
 */
function decal(size: number, place: Place, n = 4) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      pos.push(...place((i / n - 0.5) * size, (j / n - 0.5) * size));
      uv.push(i / n, j / n);
    }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      idx.push(a, a + 1, a + n + 2, a, a + n + 2, a + n + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** On the front of a body (`surf` from surface()), `lift` off it */
const onFront = (surf: (x: number, y: number) => number, cx: number, cy: number, lift: number): Place => (u, v) => [cx + u, cy + v, surf(cx + u, cy + v) + lift];
/** On the back (`surf` from surface(..., -1)): read from behind, so its right is the body's left */
const onBack = (surf: (x: number, y: number) => number, cx: number, cy: number, lift: number): Place => (u, v) => [cx - u, cy + v, surf(cx - u, cy + v) - lift];
/** On the outside of the +x sleeve (`surf` from sideSurface()), read from that side */
const onSleeve = (surf: (z: number, y: number) => number, cy: number, lift: number): Place => (u, v) => [surf(-u, cy + v) + lift, cy + v, -u];

/** Split a geometry's triangles across their longest edges until none is longer than `max` (so a flat piece can bend over a body) */
function tessellate(g: THREE.BufferGeometry, max: number, sides = false) {
  const src = (g.index ? g.toNonIndexed() : g).attributes.position.array as ArrayLike<number>;
  type P = number[];
  const tris: P[][] = [];
  const v = (i: number) => [src[i], src[i + 1], src[i + 2]];
  const mid = (a: P, b: P) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const len = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const split = (a: P, b: P, c: P): void => {
    const ab = len(a, b);
    const bc = len(b, c);
    const ca = len(c, a);
    const top = Math.max(ab, bc, ca);
    if (top <= max) {
      tris.push([a, b, c]);
      return;
    }
    if (top === ab) {
      const m = mid(a, b);
      split(a, m, c);
      split(m, b, c);
    } else if (top === bc) {
      const m = mid(b, c);
      split(a, b, m);
      split(a, m, c);
    } else {
      const m = mid(c, a);
      split(a, b, m);
      split(m, b, c);
    }
  };
  for (let i = 0; i < src.length; i += 9) split(v(i), v(i + 3), v(i + 6));
  g.dispose();
  const t = new THREE.BufferGeometry();
  t.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(2), 3));
  // (`sides`: u 1 on the sides, 0 on the faces, so smoothing never merges a side into a face: a soft edge inks in dashes)
  const n = new THREE.Vector3();
  const tri = new THREE.Triangle();
  const uv = tris.flatMap(([a, b, c]) => {
    tri.set(n.fromArray(a).clone(), n.fromArray(b).clone(), n.fromArray(c).clone()).getNormal(n);
    const u = sides && Math.abs(n.z) < 0.5 ? 1 : 0;
    return [u, 0, u, 0, u, 0];
  });
  t.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return t;
}
/** Turn a non-indexed geometry's faces inside out (after mirroring it front to back) */
function flipFaces(g: THREE.BufferGeometry) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      const t = p.getComponent(i + 1, k);
      p.setComponent(i + 1, k, p.getComponent(i + 2, k));
      p.setComponent(i + 2, k, t);
    }
  }
}

/** A rounded rectangle (or superellipse, `n` higher is squarer) centred on the origin */
function roundRect(w: number, h: number, n = 4, pts = 24, squeeze = 0, cy = 0) {
  const s = new THREE.Shape();
  for (let k = 0; k < pts; k++) {
    const a = (k / pts) * Math.PI * 2;
    const c = Math.cos(a);
    const si = Math.sin(a);
    const y = Math.sign(si) * Math.abs(si) ** (2 / n) * (h / 2);
    // `squeeze` narrows the bottom (the shades' lenses)
    const x = Math.sign(c) * Math.abs(c) ** (2 / n) * (w / 2) * (1 - squeeze * Math.max(0, -y / (h / 2)));
    if (k === 0) s.moveTo(x, y + cy);
    else s.lineTo(x, y + cy);
  }
  s.closePath();
  return s;
}

const tube = (pts: [number, number, number][], r: number, seg: number, rad = 5) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), seg, r, rad);

/** A point round a superellipse section at angle `a` (0 is +x, PI/2 the front) */
const ringAt = ([y, hw, hd, z = 0]: Sec, a: number, n: number): [number, number, number] => {
  const e = 2 / n;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [Math.sign(c) * Math.abs(c) ** e * hw, y, z + Math.sign(s) * Math.abs(s) ** e * hd];
};
/** A loft's sides only, its ends left open (for a lid of its own that shades flat) */
function openLoft(secs: Sec[], seg: number, n: number) {
  const g = loft(secs, seg, n);
  g.setIndex(Array.from(g.index!.array).slice(0, (secs.length - 1) * seg * 6));
  g.computeVertexNormals();
  return g;
}
/** A strip between two rings (`flip` faces it inwards): a hat band's wall, its rim, a crown's inside; to a point, a flat lid */
function ringStrip(a: Sec, b: Sec, seg: number, n: number, flip = false) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (const sec of [a, b]) for (let k = 0; k < seg; k++) pos.push(...ringAt(sec, (k / seg) * Math.PI * 2, n));
  for (let k = 0; k < seg; k++) {
    const k1 = (k + 1) % seg;
    if (flip) idx.push(k, k1, seg + k, k1, seg + k1, seg + k);
    else idx.push(k, seg + k, k1, k1, seg + k, seg + k1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/**
 * A brim swept along `seg` steps from its inner edge to its outer one (`at(t)`: both, t 0 to 1, in x and z):
 * a flat top and underside `thick` apart and a rounded outer edge, the inner edge hidden in the crown;
 * `y(x, z, u)` is the top's height, u 0 at the inner edge to 1 at the outer
 */
function brimSweep(at: (t: number) => { inner: [number, number]; outer: [number, number] }, y: (x: number, z: number, u: number) => number, thick: number, seg: number, across: number, round: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  let ring = 0;
  for (let i = 0; i <= seg; i++) {
    const { inner, outer } = at(i / seg);
    const ox = outer[0] - inner[0];
    const oz = outer[1] - inner[1];
    const ol = Math.hypot(ox, oz) || 1;
    const pt = (u: number, dv: number, bulge = 0): void => {
      const x = inner[0] + ox * u + (ox / ol) * bulge;
      const z = inner[1] + oz * u + (oz / ol) * bulge;
      pos.push(x, y(x, z, Math.min(1, u)) + dv, z);
    };
    // round the section: the top in to out, round the edge, the underside back in, up the inner edge
    for (let j = 0; j <= across; j++) pt(j / across, 0);
    for (let j = 1; j < round; j++) {
      const f = (j / round) * Math.PI;
      pt(1, -thick / 2 + (thick / 2) * Math.cos(f), (thick / 2) * Math.sin(f));
    }
    for (let j = across; j >= 0; j--) pt(j / across, -thick);
    ring = across * 2 + round + 1;
  }
  for (let i = 0; i < seg; i++)
    for (let k = 0; k < ring; k++) {
      const a = i * ring + k;
      const b = i * ring + ((k + 1) % ring);
      idx.push(a, a + ring, b, b, a + ring, b + ring);
    }
  // (the two ends, thin: fans from their first point)
  for (const [i, f] of [[0, true], [seg, false]] as const)
    for (let k = 1; k < ring - 1; k++) {
      const a = i * ring;
      if (f) idx.push(a, a + k, a + k + 1);
      else idx.push(a, a + k + 1, a + k);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A seam line over a loft's surface at angle `a` (0 is +x, PI/2 the front) */
function meridian(secs: Sec[], n: number, a: number, from: number, r: number, lift = 1.012, step = 0) {
  const e = 2 / n;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts = sorted(secs)
    .filter(([y]) => y >= from)
    .map(([y, hw, hd, z = 0]): [number, number, number] => [Math.sign(c) * Math.abs(c) ** e * hw * lift, y, z + Math.sign(s) * Math.abs(s) ** e * hd * lift]);
  // (`step`: a segment every so far along it, where its sections are close: a cap's on the desktop)
  const segs = step ? Math.max(12, Math.round(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))).getLength() / step)) : pts.length * 3;
  return tube(pts, r, segs, 4);
}

const rbox = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0, segs = 2) => new RoundedBoxGeometry(w, h, d, segs, r).translate(x, y, z);
const flat = (pts: [number, number][], z: number, depth: number) => {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false });
  g.translate(0, 0, z);
  return g;
};
const mirror = (pts: [number, number][]) => pts.map(([x, y]) => [-x, y] as [number, number]).reverse();
/** Wider or narrower everywhere, for looser clothes on the same body */
const grow = (secs: Sec[], k: number, dz = 0): Sec[] => secs.map(([y, hw, hd, z = 0]) => [y, hw * k, hd * k, z + dz]);
/** A loft's cross-section at height y, between its sections */
function secAt(secs: Sec[], y: number): Sec {
  const ss = sorted(secs);
  let i = 0;
  while (i < ss.length - 2 && y > ss[i + 1][0]) i++;
  const [y0, w0, d0, z0 = 0] = ss[i];
  const [y1, w1, d1, z1 = 0] = ss[i + 1];
  const f = THREE.MathUtils.clamp((y - y0) / (y1 - y0 || 1), 0, 1);
  return [y, w0 + (w1 - w0) * f, d0 + (d1 - d0) * f, z0 + (z1 - z0) * f];
}
/**
 * The same shape with a section every `step` from `from` to `to` (in the
 * torso's and the hips' numbers, round the hips by default): where the trunk's
 * weights change (skeleton.ts `trunk()`) every layer needs rings close enough
 * to bend with them, or a layer's flat faces cut through the one under it
 */
const fine = (secs: Sec[], from = -0.095, to = 0.14, step = 0.02): Sec[] => {
  const ys = new Set(secs.map(([y]) => y));
  const extra: Sec[] = [];
  for (let y = from; y <= to + 1e-9; y += step) if (![...ys].some((k) => Math.abs(k - y) < step * 0.4) && y > sorted(secs)[0][0] && y < sorted(secs)[secs.length - 1][0]) extra.push(secAt(secs, y));
  return sorted([...secs, ...extra]);
};

/**
 * The same shape with sections every `step` between its own, on a smooth
 * curve through them (Catmull-Rom on the widths, depths and middles), so its
 * silhouette bends instead of breaking at every section: the desktop's finer
 * clothes
 */
function curve(secs: Sec[], step: number): Sec[] {
  const ss = sorted(secs);
  const c = new THREE.CatmullRomCurve3(ss.map(([, hw, hd, z = 0]) => new THREE.Vector3(hw, hd, z)), false, 'catmullrom');
  return ss.flatMap(([y], i): Sec[] => {
    const y1 = ss[i + 1]?.[0];
    if (y1 === undefined) return [ss[i]];
    const n = Math.max(1, Math.round((y1 - y) / step));
    return Array.from({ length: n }, (_, k) => {
      const v = c.getPoint((i + k / n) / (ss.length - 1));
      return [y + ((y1 - y) * k) / n, v.x, v.y, v.z];
    });
  });
}

/**
 * A jacket's hem cut away at the front: the two fronts round off from its middle, so the hem rises `lift` there,
 * easing to nothing towards the sides and over `span` up the front (every point keeps its order up the body)
 */
function cutaway(g: THREE.BufferGeometry, hem: number, lift: number, span = 0.07) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > hem + span || p.getZ(i) <= 0) continue;
    p.setY(i, y + lift * Math.exp(-((p.getX(i) / 0.06) ** 2)) * (1 - (y - hem) / span));
  }
  g.computeVertexNormals();
  return g;
}

/** A shoe's section along its length: u forward from the ankle, its half-width, and its bottom and top */
type ShoeSec = [u: number, hw: number, bottom: number, top: number];
/** A shoe or its sole as a loft along its length (in the shin's numbers), rounded across (`n`) */
function shoe(secs: ShoeSec[], seg: number, n = 2.6, step = 0) {
  const s: Sec[] = secs.map(([u, hw, b, t]) => [u, hw, (t - b) / 2, -(t + b) / 2]);
  // (lofted along y, turned so its length runs forward and its sections stand up)
  return loft(step ? curve(s, step) : s, seg, n).rotateX(Math.PI / 2);
}

/**
 * Trousers in one piece (docs/clothing-plan.md), in the hips' numbers: the
 * seat from the waist down to the crotch (`seat`: sections of the whole hips,
 * round the middle), then each leg down to the cuff (`leg`: sections round the
 * leg's own middle at ±LEG_X), the knee and all. Each leg is a ring of `seg`
 * points: down the seat its outer half is that side of the hips and its inner
 * half runs straight down the middle (where the two halves meet: not drawn);
 * from the crotch down the inner halves are the insides of the legs, meeting
 * along the seam. A point both legs share is one vertex, so the seams shade
 * and bend as one. `hem`: the cuff cut on a slant, longer at the back by
 * that much over the shoe (the break), its last two sections.
 */
function trousers(seat: Sec[], leg: Sec[], seg: number, n = 2.2, hem = 0) {
  const N = Math.max(8, seg + (seg % 2));
  const H = N / 2;
  const se = (c: number) => Math.sign(c) * Math.abs(c) ** (2 / n);
  const rows = [...sorted(seat).reverse().map((s) => ({ s, half: true })), ...sorted(leg).reverse().map((s) => ({ s, half: false }))];
  const pos: number[] = [];
  const idx: number[] = [];
  const at = (s: number, [y, hw, hd, z = 0]: Sec, half: boolean, j: number) => {
    const a = Math.PI / 2 - (j / N) * Math.PI * 2;
    // (the seat's inner half: straight down the middle, from the back to the front)
    if (half && j > H) return [0, y, z + hd * (-1 + (2 * (j - H)) / H)];
    return [s * ((half ? 0 : LEG_X) + se(Math.cos(a)) * hw), y, z + se(Math.sin(a)) * hd];
  };
  const last = rows.length - 1;
  const tri = (s: number, a: number, b: number, c: number) => (s > 0 ? idx.push(a, b, c) : idx.push(a, c, b));
  for (const s of [-1, 1]) {
    const base = pos.length / 3;
    rows.forEach(({ s: sec, half }, r) => {
      // (the break: the last sections slanting down to the back, half as much on the one before)
      const k = r === last ? 1 : r === last - 1 ? 0.5 : 0;
      for (let j = 0; j < N; j++) {
        const p = at(s, sec, half, j);
        if (k) p[1] += k * hem * (0.67 * Math.cos((j / N) * Math.PI * 2) - 0.33);
        pos.push(...p);
      }
    });
    const v = (r: number, j: number) => base + r * N + (j % N);
    for (let r = 0; r < rows.length - 1; r++)
      for (let j = 0; j < N; j++) {
        if (rows[r + 1].half && j >= H) continue;
        tri(s, v(r, j), v(r + 1, j), v(r, j + 1));
        tri(s, v(r, j + 1), v(r + 1, j), v(r + 1, j + 1));
      }
    // The waist closed over (under the top) and the cuff under
    const [yt, hwt, , zt = 0] = rows[0].s;
    const [yb, , , zb = 0] = rows[rows.length - 1].s;
    const ct = pos.length / 3;
    pos.push(s * hwt * 0.4, yt, zt, s * LEG_X, yb, zb);
    for (let j = 0; j < N; j++) {
      tri(s, ct, v(0, j), v(0, j + 1));
      tri(s, ct + 1, v(last, j + 1), v(last, j));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const m = mergeVertices(g, 1e-6);
  g.dispose();
  m.computeVertexNormals();
  return m;
}

/** Strip a geometry to what merging needs: no index, position, normal, uv */
export function plain(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
  if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
  if (!n.attributes.normal) n.computeVertexNormals();
  return n;
}
/** Merge geometries, each painted one colour per vertex */
export function paintMerge(list: { geo: THREE.BufferGeometry; color: THREE.Color }[]) {
  return mergeGeometries(
    list.map(({ geo, color }) => {
      const n = plain(geo);
      const c = new Float32Array(n.attributes.position.count * 3);
      for (let i = 0; i < c.length; i += 3) {
        c[i] = color.r;
        c[i + 1] = color.g;
        c[i + 2] = color.b;
      }
      n.setAttribute('color', new THREE.BufferAttribute(c, 3));
      return n;
    })
  )!;
}

/* ---------- The wardrobe: items, each a set of pieces on the rig's joints ---------- */

export type ColorKey = 'top' | 'bottom' | 'shoes' | 'tie' | 'cap' | 'beanie' | 'bucket' | 'cowboy' | 'tophat' | 'backpack' | 'crossbody' | 'board' | 'duffel' | 'wings' | 'headphones' | 'lens' | 'ink';
/** Every outfit colour a piece can take (the crowd works each figure's out once) */
export const COLOR_KEYS: ColorKey[] = ['top', 'bottom', 'shoes', 'tie', 'cap', 'beanie', 'bucket', 'cowboy', 'tophat', 'backpack', 'crossbody', 'board', 'duffel', 'wings', 'headphones', 'lens', 'ink'];
/**
 * Pieces with a material of their own: the shades' lenses, the cap patch,
 * the raised hood (both sides drawn), neon (unlit, coloured per
 * vertex, brighter at night through `neon()`), and on single figures the
 * merch: marks printed from the logo atlas (`logo`, in the outfit's ink)
 * and the top's all-over print (`pattern`, chosen in createDegen)
 */
export type Mat = 'lens' | 'patch' | 'double' | 'neon' | 'logo' | 'pattern';
/** Which mark a logo piece prints: the top's, the hat's, the sneakers', or the varsity's badge (the top's chest mark, or the diamond) */
export type LogoOf = 'top' | 'hat' | 'shoe' | 'badge';
export interface Piece {
  joint: Joint;
  geo: THREE.BufferGeometry;
  /** A fixed colour, or the outfit colour it takes */
  color: string | ColorKey;
  /** Darker or lighter than the outfit colour (lapels, ribbing) */
  shade?: number;
  mat?: Mat;
  /** Small details left out of the light (phone) crowd */
  detail?: boolean;
  /** Skinned body only: weighted as this part instead of by its joint (the shoes ride the feet) */
  region?: Region;
  /** Skinned body only: on this one bone, unbending (a backpack on the chest) */
  bone?: BoneName;
  /** Skinned body only: each vertex's own weights (the fingers), for a non-indexed geometry */
  skin?: Influence[];
  /** A mark printed from the logo atlas (`mat: 'logo'`): which one is the outfit's call */
  logo?: LogoOf;
  /**
   * A closed shell the clipping test holds in layers (tests/clothing.test.ts): what's worn on the
   * torso over the hips (`top`) keeps the trousers under it (`bottom`) inside, and stays outside them
   */
  shell?: Shell;
}
/** A layer the clipping test checks: the top over the hips, the trousers under it */
export type Shell = 'top' | 'bottom';
export interface Item {
  id: string;
  when: (o: Outfit) => boolean;
  pieces: Piece[];
  /** Carried in the right hand (put away while Degen holds a gun) */
  held?: boolean;
}

const SKIN = '#e8c39e';
const BLACK = '#16141f';
const WHITE = '#f3f2f7';
/** The cream of a patch a mark is printed on */
const PATCH = '#dedce8';
/** Shirts a shade under white, so the key light doesn't bloom them */
const SHIRT = '#cfcedb';
const GOLD = '#e2b04a';

const itemsCache: Partial<Record<string, Item[]>> = {};

/* ----- The suit's tailoring (docs/tailoring-plan.md Phase 3): single figures on the desktop ----- */

/** The suit's buttons: horn, their holes and thread darker */
export const HORN = '#3d302a';
const HOLE = '#151013';
type Surf = (x: number, y: number) => number;
/**
 * A button `r` across, lying at `at` with its face out along `out`: a lathed disc, its rim raised round a
 * dished middle; with `holes`, four holes and the thread's cross over them (the coat's)
 */
function buttonAt(r: number, at: THREE.Vector3, out: THREE.Vector3, seg: number, holes: boolean) {
  const h = r * 0.42;
  const face = h * 0.66;
  const prof = [
    [0, 0],
    [r, 0],
    [r * 1.02, h * 0.55],
    [r * 0.84, h],
    [r * 0.62, h * 0.74],
    [0, face],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  // (lathed round y, then turned so its face looks along +z)
  const body = new THREE.LatheGeometry(prof, seg).rotateX(Math.PI / 2);
  const top: THREE.BufferGeometry[] = [];
  if (holes) {
    for (const [x, y] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) top.push(new THREE.CircleGeometry(r * 0.14, 6).translate(x * r * 0.27, y * r * 0.27, face + 0.0002));
    for (const t of [1, -1]) top.push(new THREE.PlaneGeometry(r * 0.9, r * 0.11).rotateZ((t * Math.PI) / 4).translate(0, 0, face + 0.0004));
  }
  const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), out.clone().normalize());
  const place = (g: THREE.BufferGeometry) => g.applyQuaternion(turn).translate(at.x, at.y, at.z);
  return { body: place(plain(body)), holes: holes ? place(mergeGeometries(top.map(plain))!) : null };
}
/**
 * Stitches: short flat dashes `lift` off a surface along a line of points (`side` -1: on its back, read from
 * behind), every `gap`, each `len` long and `w` wide; flush with the cloth's own shading, so no ink round them
 */
function stitches(line: [number, number][], surf: Surf, lift: number, len: number, gap: number, w = 0.0008, side = 1) {
  const pos: number[] = [];
  const nrm: number[] = [];
  let at = gap / 2;
  for (let i = 0; i < line.length - 1; i++) {
    const [x0, y0] = line[i];
    const [x1, y1] = line[i + 1];
    const L = Math.hypot(x1 - x0, y1 - y0);
    const [tx, ty] = [(x1 - x0) / L, (y1 - y0) / L];
    const [nx, ny] = [(-ty * w) / 2, (tx * w) / 2];
    const [hx, hy] = [(tx * len) / 2, (ty * len) / 2];
    for (; at < L; at += gap) {
      const [cx, cy] = [x0 + tx * at, y0 + ty * at];
      const P = [
        [cx - hx - nx, cy - hy - ny],
        [cx + hx - nx, cy + hy - ny],
        [cx + hx + nx, cy + hy + ny],
        [cx - hx + nx, cy - hy + ny],
      ].map(([x, y]) => [x, y, surf(x, y) + side * lift]);
      // (shaded as the cloth under them: their own flat normals inked every stitch round)
      const e = 0.001;
      const [gx, gy] = [(surf(cx + e, cy) - surf(cx - e, cy)) / (2 * e), (surf(cx, cy + e) - surf(cx, cy - e)) / (2 * e)];
      const n = new THREE.Vector3(-gx * side, -gy * side, side).normalize();
      for (const k of side > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) {
        pos.push(...P[k]);
        nrm.push(n.x, n.y, n.z);
      }
    }
    at -= L;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}
/** A line moved `d` in towards a point (the middle of the piece it edges), each corner along its edges' normals */
function inset(line: [number, number][], d: number, [mx, my]: [number, number]): [number, number][] {
  const normal = (a: [number, number], b: [number, number]) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const [nx, ny] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    const s = (mx - (a[0] + b[0]) / 2) * nx + (my - (a[1] + b[1]) / 2) * ny < 0 ? -1 : 1;
    return [s * nx, s * ny];
  };
  return line.map((p, i) => {
    const ns = [i > 0 ? normal(line[i - 1], p) : null, i < line.length - 1 ? normal(p, line[i + 1]) : null].filter((n): n is number[] => !!n);
    const sx = ns.reduce((s, n) => s + n[0], 0);
    const sy = ns.reduce((s, n) => s + n[1], 0);
    const l = Math.hypot(sx, sy);
    const k = d / Math.max(0.5, (sx / l) * ns[0][0] + (sy / l) * ns[0][1]);
    return [p[0] + (sx / l) * k, p[1] + (sy / l) * k];
  });
}
/** A slit (a buttonhole) from (x0, y0) to (x1, y1), `w` wide, its ends rounded */
function slit(x0: number, y0: number, x1: number, y1: number, w: number): [number, number][] {
  const a = Math.atan2(y1 - y0, x1 - x0);
  const end = (x: number, y: number, from: number) => Array.from({ length: 4 }, (_, k): [number, number] => [x + (w / 2) * Math.cos(from + (k / 3) * Math.PI), y + (w / 2) * Math.sin(from + (k / 3) * Math.PI)]);
  return [...end(x1, y1, a - Math.PI / 2), ...end(x0, y0, a + Math.PI / 2)];
}

/**
 * The jacket's tailoring on its torso (`JK` its sections, `SN` their squareness, `front` its front, `lapelPts` the
 * right lapel's outline, `knot` the tie's knot as the phones have it): two horn buttons with their buttonholes, the
 * breast pocket's welt, the jetting over the flaps, the lapel's buttonhole, pick stitching round the lapels and the
 * flaps, the back vent and seam, the collar rolled round the back of the neck, the shirt collar's stand, and the
 * tie's knot rounded over its dimple. Built while `crisp` is on, so the laid-on pieces' edges ink solid.
 */
function tailoring(JK: Sec[], SN: number, front: Surf, lapelPts: [number, number][], knot: THREE.BufferGeometry) {
  const back = surface(JK, SN, -1);
  const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // Two buttons down the front (the top at the waist), through buttonholes in the left front whose ends show
  // either side of them
  const buttons = [0.15, 0.078].map((y) => buttonAt(0.0085, v3(0, y, front(0, y) + 0.0012), v3(0, 0, 1), 18, true));
  const holes = [0.15, 0.078].map((y) => onBody(slit(-0.012, y, 0.019, y, 0.0028), 0.0008, front, 0.0004));
  // The breast pocket's welt, on a slant over the pocket square's foot (the square stands in it)
  const welt = onBody(
    [
      [0.079, 0.261],
      [0.123, 0.266],
      [0.123, 0.278],
      [0.079, 0.273],
    ],
    0.004,
    front,
    0.003
  );
  // A jet along the top of each flap (the flap tucked in under it)
  const jets = [-1, 1].map((s) =>
    onBody(
      [
        [s * 0.04, 0.0505],
        [s * 0.114, 0.0505],
        [s * 0.114, 0.0565],
        [s * 0.04, 0.0565],
      ].map(([x, y]) => [x, y] as [number, number]),
      0.0035,
      front,
      0.0045
    )
  );
  // The buttonhole in the left lapel (a pin goes through it), on a slant up towards the notch
  const lapelHole = onBody(slit(0.083, 0.293, 0.096, 0.304, 0.0021), 0.0008, front, 0.0122);
  // Pick stitching just in from the lapels' free edges (up from the roll, round the notch and along the collar's
  // edge) and round the flaps' sides and foot
  const edge = lapelPts.slice(2).concat([lapelPts[0]]);
  const middle: [number, number] = [-0.08, 0.29];
  const lapelLine = inset(edge, 0.0036, middle);
  const pick = [lapelLine, mirror(lapelLine)].map((l) => stitches(l, front, 0.0124, 0.0014, 0.0042));
  const flapPick = [-1, 1].map((s) =>
    stitches(
      [
        [s * 0.045, 0.05],
        [s * 0.045, 0.0335],
        [s * 0.109, 0.0335],
        [s * 0.109, 0.05],
      ],
      front,
      0.0064,
      0.0014,
      0.0042
    )
  );
  // The back vent from the hem: the right back lapping over the left, its top stitched on a slant into the
  // centre back seam, which runs on up to the collar
  const vent = onBody(
    [
      [-0.0005, -0.0832],
      [0.013, -0.0832],
      [0.013, -0.012],
      [-0.0005, 0.0],
    ],
    0.0025,
    back,
    0.0008,
    -1
  );
  const seam = [
    stitches(
      [
        [0, 0.001],
        [0, 0.398],
      ],
      back,
      0.0004,
      0.006,
      0.006,
      0.0011,
      -1
    ),
    stitches(
      [
        [0.013, -0.012],
        [-0.0005, 0.0],
      ],
      back,
      0.0034,
      0.0014,
      0.0042,
      0.0008,
      -1
    ),
  ];
  // The collar rolled round the back of the neck: a band standing on the jacket's neck (its foot inside the
  // jacket), rising a little at the sides, its top edge rolled over, from beside one lapel's top round the back to
  // the other, its ends lower
  const neck = secAt(JK, 0.42);
  const ring: Sec = [0, neck[1] * 1.09, neck[2] * 1.09, neck[3]];
  const N = 44;
  const a0 = Math.PI / 2 + 1.25;
  const a1 = Math.PI * 2.5 - 1.25;
  const rows: number[][][] = [];
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N;
    const [x, , z] = ringAt(ring, a, SN);
    const [dx, dz] = [x, z - ring[3]!];
    const l = Math.hypot(dx, dz);
    const [ox, oz] = [dx / l, dz / l];
    const side = Math.abs(Math.cos(a));
    // (the ends easing down to the lapels' tops)
    const end = Math.min(1, Math.min(i, N - i) / 8);
    const yb = 0.398 + 0.013 * side;
    const yt = yb + (0.025 - 0.012 * side + 0.002 * side) * (0.25 + 0.75 * end);
    rows.push(
      [
        [0, yb],
        [0, yt - 0.002],
        [0.0022, yt + 0.0006],
        [0.0052, yt - 0.0012],
        [0.0066, yb],
      ].map(([o, y]) => [x + ox * o, y, z + oz * o])
    );
  }
  const pos: number[] = [];
  const idx: number[] = [];
  const M = rows[0].length;
  rows.forEach((r) => r.forEach((p) => pos.push(...p)));
  for (let i = 0; i < N; i++)
    for (let k = 0; k < M - 1; k++) {
      const a = i * M + k;
      idx.push(a, a + M, a + 1, a + 1, a + M, a + M + 1);
    }
  // (its ends closed)
  for (const [i, s] of [[0, 1], [N, -1]])
    for (let k = 1; k < M - 1; k++) idx.push(...(s > 0 ? [i * M, i * M + k + 1, i * M + k] : [i * M, i * M + k, i * M + k + 1]));
  const collar = new THREE.BufferGeometry();
  collar.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  collar.setIndex(idx);
  collar.computeVertexNormals();
  // The shirt collar's stand: the phones' open wall as its inside, the band's outside over it and a rolled top
  // edge between (out from the wall, not in: the neck's knit bunches just inside it)
  const stand = new THREE.LatheGeometry(
    [
      [0.0618, -0.017],
      [0.0578, 0.0168],
      [0.0569, 0.0186],
      [0.056, 0.017],
      [0.06, -0.017],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    36
  ).translate(0, 0.414, -0.004);
  // The tie's knot rounded (its face domed over a finer split), the dimple pinched in under it
  const was = bend;
  bend = 0.004;
  const round = onBody(roundRect(0.032, 0.026, 3, 24, 0.3, 0.385), 0.01, front, 0.006);
  bend = was;
  const p = round.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    if (z - front(x, y) < 0.006 + 0.008) continue;
    // (nothing at its outline, a superellipse narrower under, so its face stays joined to its sides)
    const v = (y - 0.385) / 0.013;
    const u = Math.max(0, 1 - Math.abs(x / (0.016 * (1 - 0.3 * Math.max(0, -v)))) ** 3 - Math.abs(v) ** 3);
    p.setZ(i, z + 0.0034 * Math.sqrt(u));
  }
  round.computeVertexNormals();
  knot.dispose();
  const dimple = onBody(
    [
      [0, 0.3722],
      [0.0024, 0.3665],
      [0.0013, 0.3585],
      [0, 0.3555],
      [-0.0013, 0.3585],
      [-0.0024, 0.3665],
    ],
    0.0004,
    front,
    0.0142
  );
  return {
    /** In the jacket's cloth, a shade lighter: the welt, the jets, the vent, the lapel's buttonhole (darker than the lapel) */
    cloth: [welt, ...jets, vent, lapelHole],
    /** In the lapels' shade: the collar round the back */
    collar,
    /** A shade darker: the buttonholes and the back seam */
    dark: [...holes, ...seam],
    /** Lighter than the lapels: the pick stitching */
    pick: [...pick, ...flapPick],
    horn: buttons.map((b) => b.body),
    thread: buttons.map((b) => b.holes!),
    stand,
    knot: round,
    dimple,
  };
}
/** Four buttons up the back of a sleeve's cuff (`FJ` the forearm's sections, `s` its side: -1 left), kissing */
function sleeveButtons(FJ: Sec[], s: number) {
  // (on the outside, turned a little to the back)
  const a = s > 0 ? -0.5 : Math.PI + 0.5;
  return mergeGeometries(
    [-0.18, -0.1705, -0.161, -0.1515].map((y) => {
      const sec = secAt(FJ, y);
      const [x, , z] = ringAt(sec, a, 2);
      const out = new THREE.Vector3(Math.cos(a) / sec[1], 0, Math.sin(a) / sec[2]).normalize();
      return buttonAt(0.0042, new THREE.Vector3(x, y, z).addScaledVector(out, 0.0005), out, 10, false).body;
    })
  )!;
}

/**
 * The wardrobe at a detail level. `hero` is the skinned body's (createDegen):
 * the brand-art head on the longer neck, hands with fingers, the shoes on
 * the feet; the crowd's (`hero` false) keeps the round head and solid hands.
 */
export function items(q: Detail, hero = false): Item[] {
  const key = `${q}${hero ? 'h' : ''}`;
  if (itemsCache[key]) return itemsCache[key]!;
  /** Ring segments at this detail level */
  const R = (n: number) => Math.max(5, Math.round(n * [0.36, 0.7, 1, 1.5][q]));
  bend = q === 3 ? 0.02 : q === 2 ? 0.03 : 0;
  /**
   * The tops' bodies keep the phone's rings on the desktop until their own phases (3 and 4) smooth them,
   * and the trousers take 28: the counts the clipping test holds (finer tops over the hips met the
   * trousers' crotch at a sprint)
   */
  /**
   * The casual tops' rings on the desktop (Phase 4): 30, so the middle of the back falls between two of them,
   * 6 degrees off (two more than a multiple of four, as the phone's 22): a ring point at the middle or just off it
   * sank into the trousers' seat at a sprint (the test: 1.6 cm at 28, 7 mm at 33)
   */
  const TOP_RINGS = q === 3 ? 30 : R(22);
  const LEGS = q === 3 ? 28 : R(20);
  /** People far from the camera: plain boxes for rounded ones, shoes without rounded edges */
  const far = q === 0;
  // (on the desktop, rounder corners: docs/clothing-plan.md Phase 5)
  const rb = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0) => (far ? new THREE.BoxGeometry(w, h, d).translate(x, y, z) : rbox(w, h, d, r, x, y, z, q === 3 ? 3 : 2));
  const P = (joint: Joint, geo: THREE.BufferGeometry, color: string | ColorKey, extra: Partial<Piece> = {}): Piece => ({ joint, geo, color, ...extra });
  /** Several geometries as one piece */
  const one = (geos: THREE.BufferGeometry[]) => (geos.length === 1 ? geos[0] : mergeGeometries(geos.map(plain))!);
  /** The same piece on both sides (one geometry, or one per side for things that sit on the outside) */
  const both = (
    kind: 'arm' | 'fore' | 'leg' | 'shin' | 'wrist' | 'hand',
    geo: THREE.BufferGeometry | THREE.BufferGeometry[],
    color: string | ColorKey,
    extra: Partial<Piece> = {}
  ): Piece[] => (['L', 'R'] as const).map((s, i) => P(`${kind}${s}`, Array.isArray(geo) ? geo[i] : geo, color, extra));

  /** Rings through the hips (`fine()`) where the clipping would show: not on the far crowd, a few pixels tall */
  const hips = (secs: Sec[]) => (far ? secs : fine(secs));
  /** Shoes ride the feet; bags and boards sit unbending on the chest (both on the skinned body only) */
  const SHOE: Partial<Piece> = { region: 'shoe' };
  const CHEST: Partial<Piece> = { bone: 'chest' };
  /** The shells the clipping test holds in layers */
  const TOP: Partial<Piece> = { shell: 'top' };
  const BOTTOM: Partial<Piece> = { shell: 'bottom' };
  /** A hat's patch: the diamond printed on it (the crowd's), or on single figures a cream patch with the hat's mark */
  const hatPatch = (patch: THREE.BufferGeometry, logo: THREE.BufferGeometry): Piece[] =>
    hero ? [P('head', patch, PATCH), P('head', logo, 'ink', { mat: 'logo', logo: 'hat' })] : [P('head', patch, '#ffffff', { mat: 'patch', detail: true })];
  /** The skinned body's hands, fingers and all, each vertex weighted to its bones */
  // (far off, a crowd person's hands are the simple block: fingers are wasted at a few pixels)
  const fingers = (color: string): Piece[] =>
    far ? both('wrist', one(hand), color) : ([-1, 1] as const).flatMap((s) => handParts(s, R(9)).map(({ geo, skin }) => P(s < 0 ? 'handL' : 'handR', geo, color, { skin })));

  const suit = (o: Outfit) => o.kind === 'suit';
  const hoodie = (o: Outfit) => o.kind === 'hoodie';
  const track = (o: Outfit) => o.kind === 'track';
  const soldier = (o: Outfit) => o.kind === 'soldier';
  const varsity = (o: Outfit) => o.kind === 'varsity';
  const puffer = (o: Outfit) => o.kind === 'puffer';
  /** Fits worn with joggers and sneakers */
  const casual = (o: Outfit) => o.kind === 'hoodie' || o.kind === 'track' || varsity(o) || puffer(o);
  const bare = (o: Outfit) => !o.hood && o.kind !== 'soldier';
  const hasCap = (o: Outfit) => !!o.cap && !o.beanie && !o.bucket && !o.crown && !o.cowboy && !o.tophat && !o.halo && bare(o);

  /* ----- Head: the balaclava over a real head shape, the eye opening, the shades ----- */
  const HEAD: Sec[] = [
    [-0.045, 0.045, 0.048, -0.008],
    [0.028, 0.047, 0.05, -0.006],
    [0.048, 0.062, 0.074, 0.008],
    [0.07, 0.076, 0.09, 0.008],
    [0.1, 0.086, 0.098, 0.004],
    [0.138, 0.09, 0.1, 0],
    [0.178, 0.085, 0.095, -0.004],
    [0.204, 0.069, 0.079, -0.007],
    [0.221, 0.044, 0.052, -0.008],
    [0.23, 0.012, 0.015, -0.008],
  ];
  const HN = 2.5;
  const face = hero ? headFront : surface(HEAD, HN);
  const EYE_Y = HERO_EYE_Y;
  const skull = hero ? headGeometry(R(30), q) : loft(HEAD, R(20), HN);
  const nose = new THREE.SphereGeometry(0.016, R(10), R(8)).scale(0.75, 1.25, 0.9).translate(0, 0.094, face(0, 0.094) - 0.009);
  const EAR_Y = 0.125;
  // (how far out from the head's side the ear's root stands, where the shades' arms go over it)
  const EAR_OUT = 0.004;
  const ears = [-1, 1].map((s) => new THREE.SphereGeometry(0.022, R(10), R(8)).scale(0.45, 1, 0.75).translate(s * (hero ? 0.081 : 0.086), EAR_Y, hero ? -0.004 : 0.004));
  // The skinned head: the balaclava bunched round the neck under the jaw, and the knit edge round the eye opening
  const neckFold = new THREE.TorusGeometry(0.048, 0.0055, 5, R(20)).rotateX(Math.PI / 2).scale(1, 1, 1.05).translate(0, -0.002, -0.008);
  const eyeRim = (() => {
    const pts = roundRect(0.158, 0.066, 5, R(32), 0, EYE_Y + 0.003)
      .getPoints()
      .map((v) => new THREE.Vector3(v.x, v.y, face(v.x, v.y) + 0.0015));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), R(64), 0.0042, 4, true);
  })();
  // The balaclava bunches where it meets the collar
  const folds = [0.014, 0.034].map((y, k) =>
    new THREE.TorusGeometry(0.048 + k * 0.002, 0.006, 5, R(18))
      .rotateX(Math.PI / 2)
      .scale(1, 1, 1.06)
      .translate(0, y, -0.006)
  );
  const eyesSkin = onBody(roundRect(0.15, 0.058, 5, R(28), 0, EYE_Y + 0.003), 0.004, face, 0.0005);
  // Shades: two rounded lenses in thick black frames, a bridge and arms back to the ears
  const lensShape = () => roundRect(0.064, 0.038, 4, R(24), 0.18);
  const frameShape = () => {
    const s = roundRect(0.078, 0.05, 4, R(24), 0.16);
    s.holes.push(new THREE.Path(lensShape().getPoints().reverse()));
    return s;
  };
  const lensZ = face(0, EYE_Y) + 0.012;
  const atEye = (g: THREE.BufferGeometry, s: number, dz: number) => g.rotateY(s * 0.24).translate(s * 0.043, EYE_Y, lensZ + dz - Math.abs(s) * 0.004);
  // (on the desktop the frames' edges bevelled round, docs/clothing-plan.md Phase 5; the arms come with the hats' head, below)
  const BEVEL = q === 3 ? { bevelEnabled: true, bevelThickness: 0.0014, bevelSize: 0.0012, bevelSegments: 1 } : { bevelEnabled: false };
  const frames = [
    ...[-1, 1].map((s) => atEye(new THREE.ExtrudeGeometry(frameShape(), { depth: q === 3 ? 0.0082 : 0.011, curveSegments: 4, ...BEVEL }).translate(0, 0, q === 3 ? 0.0014 : 0), s, 0)),
    q === 3 ? rbox(0.018, 0.009, 0.01, 0.003, 0, EYE_Y + 0.008, lensZ + 0.006) : new THREE.BoxGeometry(0.018, 0.009, 0.01).translate(0, EYE_Y + 0.008, lensZ + 0.006),
  ];
  /** The frames' outer top corner, where each arm is hinged (s: the side) */
  const hinge = (s: number) => new THREE.Vector3(s * 0.039, 0.013, 0.0055).applyAxisAngle(new THREE.Vector3(0, 1, 0), s * 0.24).add(new THREE.Vector3(s * 0.043, EYE_Y, lensZ - 0.004));
  const lenses = [-1, 1].map((s) =>
    atEye(
      new THREE.ExtrudeGeometry(lensShape(), {
        depth: 0.006,
        bevelEnabled: false,
        curveSegments: 4,
      }),
      s,
      0.003
    )
  );

  /* ----- Hats ----- */
  // Every hat seated on the head the figure has, the hero's (body.ts) or the crowd's (docs/clothing-plan.md
  // Phase 5): a crown carried out from the head's own outline, a band fitted to it, a brim rooted in the crown
  const HN_HAT = 2.3;
  const HEAD_HI = hero ? HERO_HEAD_TOP : HEAD[HEAD.length - 1][0];
  /** The head at height y: its half-width, and where its front and back are */
  const headAt = (y: number) => {
    if (hero) {
      const r = headRow(y);
      return { hw: r.hw, zf: r.zc + r.front, zb: r.zc - r.back };
    }
    const [, hw, hd, z = 0] = secAt(HEAD, y);
    return { hw, zf: z + hd, zb: z - hd };
  };
  const insideHead = (x: number, y: number, z: number) => {
    if (hero) return inHead(x, y, z);
    if (y < HEAD[0][0] || y > HEAD_HI) return false;
    const [, hw, hd, zc = 0] = secAt(HEAD, y);
    return Math.abs(x / hw) ** HN + Math.abs((z - zc) / hd) ** HN < 1;
  };
  /** How far the head's surface is from its middle at height y, along (dx, dz) */
  const headR = (y: number, dx: number, dz: number) => {
    const { zf, zb } = headAt(y);
    const zc = (zf + zb) / 2;
    if (!insideHead(0, y, zc)) return 0;
    let lo = 0;
    let hi = 0.2;
    for (let k = 0; k < 22; k++) {
      const m = (lo + hi) / 2;
      if (insideHead(dx * m, y, zc + dz * m)) lo = m;
      else hi = m;
    }
    return lo;
  };
  /** How far a hat's ring of R(20) cuts inside its own outline between its points: added to every gap, so a crowd's coarser hats clear the head too */
  const SAG = 0.095 * (1 - Math.cos(Math.PI / R(20)));
  /** Rows a hat's crown is drawn in: a section every 5 mm on the desktop, fewer on phones and crowds */
  const HAT_STEP = [0.026, 0.016, 0.013, 0.005][q];
  /**
   * A crown on the head: the head's outline, across and front to back, carried out `gap(y)` along its normals
   * from y0 up over the top (or to y1), as sections
   */
  const headShell = (y0: number, gap: (y: number) => number, y1 = Infinity): Sec[] => {
    const ys: number[] = [];
    for (let y = y0 - 0.012; y < HEAD_HI - 1e-4; y += 0.002) ys.push(y);
    ys.push(HEAD_HI);
    const out = (r: (y: number) => number) => {
      const pts = ys.map((y) => [r(y), y]);
      return pts.map(([x, y], i) => {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[Math.min(pts.length - 1, i + 1)];
        const nx = p1[1] - p0[1];
        const ny = -(p1[0] - p0[0]);
        const l = Math.hypot(nx, ny) || 1;
        const g = gap(y) + SAG;
        return [x + (nx / l) * g, y + (ny / l) * g];
      });
    };
    const across = out((y) => headAt(y).hw);
    const front = out((y) => headAt(y).zf);
    const back = out((y) => -headAt(y).zb);
    const at = (c: number[][], y: number) => {
      if (y <= c[0][1]) return c[0][0];
      for (let i = 1; i < c.length; i++) if (c[i][1] >= y) return c[i - 1][0] + ((c[i][0] - c[i - 1][0]) * (y - c[i - 1][1])) / (c[i][1] - c[i - 1][1] || 1);
      return c[c.length - 1][0];
    };
    const top = Math.min(across[across.length - 1][1], front[front.length - 1][1], back[back.length - 1][1]);
    const end = Math.min(y1, top);
    const rows = Math.max(3, Math.round((end - y0) / HAT_STEP));
    const secs: Sec[] = [];
    for (let i = 0; i <= rows; i++) {
      // (closer together at the band, round the brow, and over the dome, where the outline turns)
      const f = y1 < top ? i / rows : (1 - Math.cos((i / rows) * Math.PI)) / 2;
      const y = y0 + (end - y0) * f;
      const zf = at(front, y);
      const zb = -at(back, y);
      secs.push([y, Math.max(0.002, at(across, y)), Math.max(0.002, (zf - zb) / 2), (zf + zb) / 2]);
    }
    return secs;
  };
  /** A hat's own design in sections, sized so its lowest section sits `gap` off the head all round */
  const fitTo = (secs: Sec[], gap: number): Sec[] => {
    const [y0, hw0, hd0, z0 = 0] = sorted(secs)[0];
    const { hw, zf, zb } = headAt(y0);
    const kx = (hw + gap + SAG) / hw0;
    const kz = ((zf - zb) / 2 + gap + SAG) / hd0;
    const dz = (zf + zb) / 2 - z0;
    return secs.map(([y, w, d, z = 0]) => [y, w * kx, d * kz, z0 + dz + (z - z0) * kz]);
  };
  /**
   * The hat's lowest band held exactly `gap(y)` off the head (its brow and all) along each vertex's own way out
   * from the head's middle, up to y1, eased back into the hat's own shape over `fade`
   */
  const snug = (g: THREE.BufferGeometry, y1: number, gap: (y: number) => number, fade = 0.014) => {
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y > y1 + fade) continue;
      const { zf, zb } = headAt(y);
      const zc = (zf + zb) / 2;
      const dx = p.getX(i);
      const dz = p.getZ(i) - zc;
      const r = Math.hypot(dx, dz);
      if (r < 0.01) continue;
      const h = headR(y, dx / r, dz / r);
      if (!h) continue;
      const want = h + gap(y) + SAG;
      const f = THREE.MathUtils.smoothstep(y, y1, y1 + fade);
      const rr = want + (r - want) * f;
      p.setXYZ(i, (dx / r) * rr, y, zc + (dz / r) * rr);
    }
    g.computeVertexNormals();
    return g;
  };
  /** Where a seated hat's front is at height y, `gap` off the head */
  const frontAt = (y: number, gap: number) => {
    const { zf, zb } = headAt(y);
    return (zf + zb) / 2 + headR(y, 0, 1) + gap + SAG;
  };

  // The shades' arms: from the hinges straight back, then along the side of the head, over the ear's root and
  // down behind it
  const ARM_GAP = 0.0045;
  /** How far out the head's side is at height y and depth z */
  const sideAt = (y: number, z: number) => {
    const { hw, zf, zb } = headAt(y);
    const zc = (zf + zb) / 2;
    const d = z > zc ? zf - zc : zc - zb;
    const n = hero ? headRow(y).n : HN;
    return hw * Math.max(0, 1 - Math.min(1, Math.abs((z - zc) / d)) ** n) ** (1 / n);
  };
  const armPath = (s: number): [number, number, number][] => {
    const h = hinge(s);
    const along = (y: number, z: number, out = 0): [number, number, number] => [s * Math.max(sideAt(y, z) + ARM_GAP + out, 0), y, z];
    // (level with the hinges, out past the ear's root, so from the front they keep behind the frames)
    const y = h.y + 0.001;
    return [
      [h.x, h.y, h.z - 0.002],
      [s * Math.max(Math.abs(h.x) + 0.002, sideAt(h.y, h.z - 0.03) + ARM_GAP), y, h.z - 0.03],
      along(y, 0.035),
      along(y, 0.012, EAR_OUT * 0.5),
      along(y, -0.004, EAR_OUT),
      along(y - 0.012, -0.02),
      along(y - 0.026, -0.026),
    ];
  };
  const ARMS = [-1, 1].map((s) => armPath(s));
  frames.push(...ARMS.map((pts) => tube(pts, q === 3 ? 0.0032 : 0.0038, q === 3 ? R(16) : R(8), q === 3 ? 6 : 4)));
  /** Where the chain hooks onto each arm (s: the side): under it, by the ear */
  const armHook = (s: number): [number, number, number] => {
    const [x, y, z] = ARMS[s < 0 ? 0 : 1][3];
    return [x + s * 0.003, y - 0.004, z];
  };

  // The cap: six panels close over the crown, rising a touch higher than the head, the brim from the band
  const CAP_GAP = (y: number) => 0.003 + 0.011 * THREE.MathUtils.smoothstep(y, 0.176, HEAD_HI);
  const CAP_Y = 0.166;
  const CAP = headShell(CAP_Y, CAP_GAP);
  const CAP_TOP = CAP[CAP.length - 1][0];
  const capFront = surface(CAP, HN_HAT);
  const brim = (() => {
    const [, hw, hd, z0 = 0] = secAt(CAP, CAP_Y + 0.004);
    const e = 2 / HN_HAT;
    const at = (t: number) => {
      const a = t * Math.PI;
      const c = Math.cos(a);
      const s = Math.sin(a);
      // (the inner edge just inside the crown; the outer reaching out in front, back to the band at the sides)
      const x = Math.sign(c) * Math.abs(c) ** e * (hw - 0.004);
      const z = z0 + Math.abs(s) ** e * (hd - 0.004);
      return {
        inner: [x, z] as [number, number],
        outer: [x * (1 + 0.1 * s) + Math.sign(c) * 0.004 * (1 - s), z + 0.004 + 0.084 * s ** 1.4] as [number, number],
      };
    };
    const front = z0 + hd;
    // Curved down at the sides and pitched down in front, more towards its edge
    const y = (x: number, z: number, u: number) => CAP_Y + 0.012 - (x * x * 1.9 + Math.max(0, z - front + 0.01) * 0.13) * u;
    return brimSweep(at, y, 0.007, R(20), [1, 1, 2, 3][q], [2, 2, 3, 4][q]);
  })();
  const capCrown = snug(loft(CAP, R(20), HN_HAT), CAP_Y + 0.004, CAP_GAP);
  const capParts = (flip: boolean) => {
    // (worn back to front: the crown stays seated as it is, and the brim, seams and patch turn round its middle)
    const zc = secAt(CAP, CAP_Y)[3] ?? 0;
    const turn = (g: THREE.BufferGeometry) => (flip ? g.translate(0, 0, -zc).rotateY(Math.PI).translate(0, 0, zc) : g);
    return {
      crown: [capCrown.clone(), turn(brim.clone()), new THREE.SphereGeometry(0.011, R(8), R(6)).translate(0, CAP_TOP + 0.001, CAP[CAP.length - 1][3] ?? 0)],
      // Six panels: seams over the crown, darker than the cap
      seams: [Math.PI / 6, (Math.PI * 5) / 6, (Math.PI * 7) / 6, (Math.PI * 11) / 6, (Math.PI * 3) / 2].map((a) => meridian(CAP, HN_HAT, a + (flip ? Math.PI : 0), CAP_Y + 0.02, 0.0022, 1.012, q === 3 ? 0.006 : 0)),
      patch: turn(new THREE.PlaneGeometry(0.044, 0.03).rotateX(-0.5).translate(0, 0.21, capFront(0, 0.21) + 0.004)),
      // (single figures) the mark printed on the patch, a touch in front of it
      logo: turn(new THREE.PlaneGeometry(0.027, 0.027).rotateX(-0.5).translate(0, 0.21 + 0.0016, capFront(0, 0.21) + 0.004 + 0.003)),
    };
  };
  const cap = capParts(false);
  const capBack = capParts(true);
  // The beanie: knit close over the head, its cuff turned up a shade darker, a pompom on top
  const BEANIE_GAP = (y: number) => 0.004 + 0.007 * THREE.MathUtils.smoothstep(y, 0.19, HEAD_HI);
  const BEANIE = headShell(0.19, BEANIE_GAP);
  const BEANIE_TOP = BEANIE[BEANIE.length - 1];
  const beanie = [loft(BEANIE, R(20), HN_HAT), new THREE.SphereGeometry(0.022, R(10), R(8)).translate(0, BEANIE_TOP[0] + 0.016, BEANIE_TOP[3] ?? 0)];
  const CUFF = 0.009;
  const beanieCuff = snug(loft(headShell(0.158, () => CUFF, 0.198), R(20), HN_HAT), 0.2, () => CUFF, 0.001);
  const cuffFront = frontAt(0.178, CUFF);
  const beaniePatch = new THREE.PlaneGeometry(0.042, 0.026).translate(0, 0.178, cuffFront + 0.0025);
  const beanieLogo = new THREE.PlaneGeometry(0.023, 0.023).translate(0, 0.178, cuffFront + 0.0055);
  // The bucket hat: a crown with straight sides on a band fitted to the head, the brim sloping down clear of the shades
  const BUCKET = fitTo(
    [
      [0.164, 0.097, 0.107, -0.004],
      [0.235, 0.085, 0.094, -0.006],
      [0.245, 0.06, 0.066, -0.006],
      [0.248, 0.001, 0.001, -0.006],
    ],
    0.004
  );
  /** A crown's sections with rows added round its band, so the band (seated on the head as the crown is) stays outside it */
  const banded = (secs: Sec[], ys: number[]): Sec[] => sorted([...secs, ...ys.map((y) => secAt(secs, y))]);
  const bucketCrown = q === 3 ? curve(BUCKET, 0.008) : banded(BUCKET, [0.172, 0.182, 0.194]);
  const BUCKET_BAND = (y: number): Sec => {
    const [, hw, hd, z] = secAt(BUCKET, y);
    return [y, hw + 0.0018, hd + 0.0018, z];
  };
  const bucket = [
    snug(loft(bucketCrown, R(20), HN_HAT), 0.168, () => 0.004),
    new THREE.LatheGeometry(
      [
        [0.09, 0.181],
        [0.16, 0.159],
        [0.16, 0.151],
        [0.09, 0.172],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      R(24)
    )
      .scale(1, 1, 1.07)
      .translate(0, 0, BUCKET[0][3] ?? 0),
  ];
  // (snug where the crown is, so it stays round the crown all the way)
  const bucketBand = snug(loft([BUCKET_BAND(0.17), BUCKET_BAND(0.19)], R(20), HN_HAT), 0.168, () => 0.0058);
  // The crown: a gold band resting on the head where it's wide enough, five points round its top
  const CROWN_Y = 0.2;
  const crownBase = (() => {
    const { hw, zf, zb } = headAt(CROWN_Y);
    return [CROWN_Y, hw + 0.0045 + SAG, (zf - zb) / 2 + 0.0045 + SAG, (zf + zb) / 2] as Sec;
  })();
  const CROWN_H = 0.05;
  const crownTop: Sec = [CROWN_Y + CROWN_H, crownBase[1] * 1.06, crownBase[2] * 1.06, crownBase[3]];
  const crownIn = (sec: Sec): Sec => [sec[0], sec[1] - 0.004, sec[2] - 0.004, sec[3]];
  const CS = R(24);
  const crown = [
    ringStrip(crownBase, crownTop, CS, HN_HAT),
    ringStrip(crownIn(crownBase), crownIn(crownTop), CS, HN_HAT, true),
    ringStrip(crownTop, crownIn(crownTop), CS, HN_HAT),
    ...[0, 1, 2, 3, 4].flatMap((k) => {
      const [x, , z] = ringAt([0, crownTop[1] - 0.002, crownTop[2] - 0.002, crownTop[3]], Math.PI / 2 + (k / 5) * Math.PI * 2, HN_HAT);
      const y = crownTop[0];
      return [new THREE.ConeGeometry(0.02, 0.048, R(8)).translate(x, y + 0.024, z), new THREE.SphereGeometry(0.012, R(8), R(6)).translate(x, y + 0.051, z)];
    }),
  ];
  const crownGem = new THREE.SphereGeometry(0.013, R(8), R(6))
    .scale(1, 1.2, 0.6)
    .translate(0, CROWN_Y + 0.024, crownBase[3]! + crownBase[2] * 1.03 + 0.004);
  const hoodUp = new THREE.SphereGeometry(0.112, R(18), R(12), Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * 0.74).scale(1, 1.16, 1.12).translate(0, 0.12, -0.012);
  const HELMET: Sec[] = [
    [0.152, 0.101, 0.112, -0.004],
    [0.2, 0.096, 0.106, -0.005],
    [0.238, 0.074, 0.082, -0.007],
    [0.26, 0.036, 0.04, -0.008],
    [0.265, 0.004, 0.004, -0.008],
  ];
  // A chin strap from the rim, down past the ears and under the jaw
  const strap = tube(
    [
      [-0.098, 0.152, 0.0],
      [-0.09, 0.1, 0.012],
      [-0.07, 0.05, 0.04],
      [-0.035, 0.035, 0.07],
      [0, 0.032, 0.078],
      [0.035, 0.035, 0.07],
      [0.07, 0.05, 0.04],
      [0.09, 0.1, 0.012],
      [0.098, 0.152, 0.0],
    ],
    0.005,
    R(24),
    4
  );
  const helmet = [
    loft(HELMET, R(20)),
    new THREE.TorusGeometry(0.104, 0.01, 5, R(24))
      .rotateX(Math.PI / 2)
      .scale(1, 1, 1.1)
      .translate(0, 0.153, -0.004),
  ];

  /* ----- Torsos ----- */
  const SN = 2.6;
  // The suit's jacket (docs/clothing-plan.md Phase 3): natural athletic shoulders (the trapezius sloping up to
  // the neck, no padded shelf), the chest fuller, the waist taken in, the shoulder line carried out and up to the
  // sleeve's head so the two meet in one line; on the desktop a section every 2 cm on a smooth curve through these.
  // The varsity and the fatigues grow from it (Phase 4).
  const JACKET: Sec[] = [
    [-0.085, 0.142, 0.094, 0],
    [-0.02, 0.137, 0.091, 0],
    [0.04, 0.128, 0.087, 0.001],
    [0.1, 0.124, 0.087, 0.003],
    [0.16, 0.133, 0.093, 0.006],
    [0.22, 0.151, 0.101, 0.008],
    [0.29, 0.161, 0.101, 0.005],
    [0.33, 0.157, 0.094, 0.002],
    [0.355, 0.147, 0.087, 0],
    [0.373, 0.129, 0.079, -0.003],
    [0.39, 0.105, 0.07, -0.005],
    [0.405, 0.082, 0.062, -0.006],
    [0.42, 0.058, 0.054, -0.006],
  ];
  const JK = q === 3 ? curve(JACKET, 0.02) : JACKET;
  const suitFront = surface(JK, SN);
  const lapelPts: [number, number][] = [
    [-0.062, 0.41],
    [-0.002, 0.198],
    [-0.012, 0.168],
    [-0.088, 0.25],
    [-0.106, 0.318],
    [-0.128, 0.326],
    [-0.12, 0.372],
  ];
  const jacket = cutaway(loft(hips(JK), R(22), SN), -0.085, 0.03);
  crisp = true;
  const lapels = [onBody(lapelPts, 0.009, suitFront, 0.003), onBody(mirror(lapelPts), 0.009, suitFront, 0.003)];
  const flaps = [-1, 1].map((s) =>
    onBody(
      [
        [s * 0.042, 0.052],
        [s * 0.112, 0.05],
        [s * 0.112, 0.03],
        [s * 0.042, 0.032],
      ] as [number, number][],
      0.005,
      suitFront,
      0.001
    )
  );
  const shirtFront = onBody(
    [
      [-0.064, 0.412],
      [0, 0.19],
      [0.064, 0.412],
    ],
    0.004,
    suitFront,
    0.001
  );
  const collarBand = new THREE.CylinderGeometry(0.056, 0.06, 0.034, R(16), 1, true).translate(0, 0.414, -0.004);
  const collarPts: [number, number][] = [
    [-0.054, 0.428],
    [-0.01, 0.396],
    [-0.046, 0.382],
  ];
  // (under the lapels where they meet, so its points never come through them)
  const collars = [onBody(collarPts, 0.004, suitFront, 0.002), onBody(mirror(collarPts), 0.004, suitFront, 0.002)];
  const pocketSquare = onBody(
    [
      [0.084, 0.272],
      [0.118, 0.272],
      [0.108, 0.292],
      [0.096, 0.284],
      [0.09, 0.294],
    ],
    0.004,
    suitFront,
    0.002
  );
  const button = new THREE.CylinderGeometry(0.008, 0.008, 0.005, R(10)).rotateX(Math.PI / 2).translate(0, 0.15, suitFront(0, 0.15) + 0.003);
  // (the knot a rounded trapezoid, narrower under)
  const tieKnot = onBody(
    roundRect(0.032, 0.026, 3, R(16), 0.3, 0.385),
    0.01,
    suitFront,
    0.006
  );
  // (well off the shirt, so its edges ink as one line)
  const tieBlade = onBody(
    [
      [-0.01, 0.374],
      [0.01, 0.374],
      [0.024, 0.236],
      [0, 0.21],
      [-0.024, 0.236],
    ],
    0.006,
    suitFront,
    0.008
  );
  // The suit's tailoring (docs/tailoring-plan.md Phase 3): single figures on the desktop only, the phones' and
  // the crowds' suit as it was
  const tailor = q === 3 ? tailoring(JK, SN, suitFront, lapelPts, tieKnot) : null;
  crisp = false;

  const HOODIE: Sec[] = [
    [-0.085, 0.148, 0.1, 0],
    [0.0, 0.15, 0.102, 0],
    [0.12, 0.148, 0.1, 0.002],
    [0.23, 0.162, 0.108, 0.006],
    [0.31, 0.171, 0.104, 0.004],
    // (the jacket's shoulder line, a little looser: carried out and up to the sleeve's head so the two meet)
    [0.34, 0.165, 0.097, 0.002],
    [0.362, 0.153, 0.09, 0],
    [0.38, 0.134, 0.082, -0.003],
    [0.396, 0.109, 0.072, -0.005],
    [0.41, 0.084, 0.063, -0.006],
    [0.422, 0.06, 0.056, -0.006],
  ];
  const HN2 = 2.2;
  // (the casual tops on the desktop, docs/clothing-plan.md Phase 4: a section every 2 cm on the curve through
  // their own, `fine()` through the hips over it, and `TOP_RINGS` round)
  const smooth = (secs: Sec[]) => hips(q === 3 ? curve(secs, 0.02) : secs);
  const HK = smooth(HOODIE);
  const hoodieFront = surface(HK, HN2);
  const hoodieBody = loft(HK, TOP_RINGS, HN2);
  const hem = loft(
    [
      [-0.095, 0.152, 0.104, 0],
      [-0.05, 0.155, 0.106, 0],
    ],
    TOP_RINGS,
    HN2
  );
  crisp = true;
  const pouch = onBody(
    [
      [-0.088, -0.03],
      [0.088, -0.03],
      [0.068, 0.1],
      [-0.068, 0.1],
    ],
    0.008,
    hoodieFront,
    0.001
  );
  crisp = false;

  // The hood down (Phase 4): rolled round the neck from one side of the front to the other, thickest and riding
  // highest at the back where it bunches, tapering to the front where the drawstrings come out
  const hoodDown = (() => {
    const N = R(24);
    const at = (k: number) => {
      const f = Math.sin(Math.PI * k);
      const a = (Math.PI / 3) * (1 + 4 * k);
      return new THREE.Vector3(Math.sin(a) * (0.08 + 0.006 * f), 0.398 + 0.03 * f, -0.012 + Math.cos(a) * (0.064 + 0.018 * f));
    };
    const path = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => at(i / 8)));
    const g = new THREE.TubeGeometry(path, N, 1, R(10), false);
    const p = g.attributes.position as THREE.BufferAttribute;
    const c = new THREE.Vector3();
    for (let i = 0; i <= N; i++) {
      path.getPointAt(i / N, c);
      const r = 0.012 + 0.022 * Math.sin(Math.PI * (i / N)) ** 0.6;
      for (let j = 0; j <= R(10); j++) {
        const v = i * (R(10) + 1) + j;
        p.setXYZ(v, c.x + (p.getX(v) - c.x) * r, c.y + (p.getY(v) - c.y) * r, c.z + (p.getZ(v) - c.z) * r);
      }
    }
    g.computeVertexNormals();
    return g;
  })();
  const strings = [-1, 1].map((s) =>
    tube(
      [
        [s * 0.03, 0.4, hoodieFront(s * 0.03, 0.4) - 0.01],
        [s * 0.032, 0.36, hoodieFront(s * 0.032, 0.36) + 0.006],
        [s * 0.034, 0.3, hoodieFront(s * 0.034, 0.3) + 0.006],
      ],
      0.004,
      R(8),
      4
    )
  );
  const TRACK = grow(HOODIE, 0.96);
  const TK = smooth(TRACK);
  const trackFront = surface(TK, HN2);
  const trackBody = loft(TK, TOP_RINGS, HN2);
  const trackCollar = new THREE.CylinderGeometry(0.06, 0.066, 0.05, R(16), 1, true).translate(0, 0.42, -0.004);
  const zip = [
    tape(-0.005, 0.005, -0.08, 0.41, 0.004, trackFront, 0.001),
    new THREE.BoxGeometry(0.018, 0.026, 0.008).translate(0, 0.37, trackFront(0, 0.37) + 0.006),
  ];

  const FATIGUES = grow(JACKET, 1.03);
  const fatigues = loft(smooth(FATIGUES), TOP_RINGS, 2.8);
  // (a little fuller since the fatigues grow from the jacket's fuller chest, Phase 4: they came through it)
  const VEST: Sec[] = grow(
    [
      [0.05, 0.155, 0.11, 0],
      [0.2, 0.168, 0.118, 0.006],
      [0.33, 0.184, 0.11, 0.004],
      [0.37, 0.165, 0.094, 0],
      [0.38, 0.12, 0.08, 0],
    ],
    1.04
  );
  const vestFront = surface(VEST, 3);
  const vest = loft(VEST, R(22), 3);
  const pouches = [-0.09, -0.03, 0.03, 0.09].map((x) => rb(0.05, 0.06, 0.03, 0.008, x, 0.13, vestFront(x, 0.13) + 0.01));
  const collarFat = new THREE.CylinderGeometry(0.06, 0.066, 0.04, R(16), 1, true).translate(0, 0.415, -0.004);

  /* ----- Neck and back: necklace, headphones, backpack, crossbody, board ----- */
  const headphones = [
    new THREE.TorusGeometry(0.07, 0.012, R(6), R(16), Math.PI * 1.1)
      .rotateX(Math.PI / 2)
      .rotateY(Math.PI * 0.45)
      .translate(0, 0.43, -0.01),
    // (each cup turned round its axis, out from the neck: a domed back, rounded edges; docs/clothing-plan.md Phase 5)
    ...[-1, 1].map((s) =>
      new THREE.LatheGeometry(
        (
          [
            [0, -0.009],
            [0.029, -0.009],
            [0.031, -0.004],
            [0.0305, 0.0045],
            [0.026, 0.0095],
            [0.017, 0.0125],
            [0, 0.013],
          ] as const
        ).map(([r, y]) => new THREE.Vector2(r, y)),
        R(12)
      )
        .rotateZ(-s * (Math.PI / 2))
        .translate(s * 0.077, 0.425, 0.03)
    ),
  ];
  // The cushions on the cups' insides, against the neck
  const cushions = q === 3 ? [-1, 1].map((s) => new THREE.TorusGeometry(0.021, 0.0065, 6, R(12)).rotateY(Math.PI / 2).translate(s * 0.0655, 0.425, 0.03)) : [];
  const BACK = surface(HK, HN2, -1);

  /* ----- Hips and legs: trousers in one piece (in the hips' numbers: the knee is 0.29 down, the shin's 0 there) ----- */
  // The seat: the hips from the waist (under every top) to the crotch, inside every top's hips with room to spare
  const SEAT: Sec[] = [
    [0.16, 0.1, 0.07, 0],
    [0.12, 0.114, 0.078, 0],
    [0.07, 0.122, 0.082, 0],
    [0.0, 0.128, 0.085, 0],
    [-0.045, 0.13, 0.086, 0],
    [-0.075, 0.128, 0.084, 0],
    [-0.095, 0.12, 0.08, 0],
  ];
  // Round the knee, closer sections, so it bends round rather than folding
  const knee = (hw: number, hd: number): Sec[] => [
    [-0.25, hw * 1.02, hd * 1.02, 0.001],
    [-0.265, hw, hd, 0.002],
    [-0.28, hw * 0.98, hd * 0.98, 0.002],
    [-0.295, hw, hd, 0.001],
  ];
  // The desktop's legs: a section every 2 cm on a smooth curve through these
  // (from the upper thigh down: the rows under the crotch stay as they are, where the top's hem swings over them)
  const legs = (secs: Sec[]) => (q === 3 ? [...secs.filter(([y]) => y > -0.2), ...curve(secs.filter(([y]) => y < -0.2), 0.02)] : secs);
  const onShin = (secs: Sec[]): Sec[] => secs.map(([y, hw, hd, z = 0]) => [y - THIGH, hw, hd, z]);
  const offShin = (secs: Sec[]): Sec[] => secs.map(([y, hw, hd, z = 0]) => [y + THIGH, hw, hd, z]);
  // (the shin, in its own numbers: a fold of the break just over the shoe)
  const SHIN_S: Sec[] = [
    [-0.02, 0.049, 0.053, 0],
    [-0.11, 0.05, 0.055, -0.004],
    [-0.21, 0.046, 0.05, 0],
    [-0.25, 0.05, 0.056, 0.004],
    [-0.27, 0.052, 0.058, 0.005],
    [-0.285, 0.051, 0.057, 0.005],
  ];
  const LEG_S = legs([[-0.12, 0.061, 0.065, 0.001], [-0.15, 0.058, 0.062, 0.002], [-0.21, 0.054, 0.058, 0.001], ...knee(0.049, 0.052), ...onShin(SHIN_S)]);
  const trouserLegs = trousers(hips(SEAT), LEG_S, LEGS, 2.2, 0.012);
  // The crease down the front of the shin, on the leg as it's built
  const crease =
    q >= 2
      ? onBody(
          [
            [-0.002, -0.25],
            [0.002, -0.25],
            [0.002, -0.02],
            [-0.002, -0.02],
          ],
          0.002,
          surface(offShin(LEG_S)),
          0.0005
        )
      : null;
  // Joggers: looser over the thigh (narrower right under the hems), tapering and gathered into the cuff
  const JOG_THIGH: Sec[] = [
    [-0.12, 0.062, 0.064, 0.002],
    [-0.15, 0.064, 0.066, 0.003],
    [-0.21, 0.06, 0.064, 0.001],
  ];
  const JOG_SHIN: Sec[] = [
    [-0.02, 0.053, 0.057, 0],
    [-0.11, 0.052, 0.056, -0.004],
    [-0.18, 0.046, 0.049, 0],
    [-0.2, 0.047, 0.05, 0.001],
    [-0.215, 0.046, 0.049, 0.001],
    [-0.235, 0.039, 0.042, 0],
  ];
  const JOG_S = legs([...JOG_THIGH, ...knee(0.053, 0.057), ...onShin(JOG_SHIN)]);
  const joggers = trousers(hips(SEAT), JOG_S, LEGS);
  const joggerCuff = loft(
    [
      [-0.258, 0.042, 0.045, 0.002],
      [-0.224, 0.043, 0.046, 0.002],
    ],
    R(16)
  );
  // Fatigues: fuller still, into the boots
  const cargo = trousers(
    hips(grow(SEAT, 1.02)),
    legs([
      [-0.12, 0.066, 0.071, 0.001],
      [-0.15, 0.066, 0.071, 0.002],
      [-0.21, 0.062, 0.066, 0.001],
      ...knee(0.056, 0.06),
      ...onShin([
        [-0.02, 0.056, 0.06, 0],
        [-0.12, 0.054, 0.058, -0.004],
        [-0.2, 0.05, 0.054, 0],
      ]),
    ]),
    R(20)
  );
  // Cargo pockets on the outside of each thigh
  const cargoPockets = [-1, 1].map((s) => rb(0.02, 0.07, 0.06, 0.008, s * 0.07, -0.16, 0.004));
  const kneePads = q === 0 ? [] : [rb(0.06, 0.06, 0.025, 0.01, 0, -0.01, 0.054)];

  /* ----- Arms and hands ----- */
  const UPPER_S: Sec[] = [
    // (the deltoid: a low rounded cap that runs down into the arm, not a ball on top of it, and round over
    // the outside of the shoulder, its widest a little under the joint, tapering to the elbow)
    [0.02, 0.014, 0.02, 0],
    [0.014, 0.034, 0.04, 0],
    [0.004, 0.046, 0.051, 0.001],
    [-0.01, 0.053, 0.056, 0.002],
    [-0.032, 0.055, 0.056, 0.002],
    [-0.06, 0.052, 0.053, 0.001],
    [-0.1, 0.048, 0.049, 0],
    [-0.16, 0.044, 0.046, 0],
    [-0.215, 0.04, 0.042, 0],
    [-0.236, 0.024, 0.026, 0],
  ];
  const FORE_S: Sec[] = [
    [0.03, 0.02, 0.022, 0],
    [0.015, 0.04, 0.042, 0],
    [-0.04, 0.043, 0.045, 0.002],
    [-0.12, 0.039, 0.041, 0],
    [-0.185, 0.036, 0.038, 0],
    [-0.192, 0.034, 0.036, 0],
  ];
  // The suit's sleeves: on the desktop curved (a section every 1.5 cm), the forearm tapering to the cuff
  // (its head a touch lower than the casual tops' deltoid, so it runs on from the jacket's shoulder line)
  const UPPER_J: Sec[] = [[0.013, 0.014, 0.02, 0], [0.009, 0.034, 0.04, 0], ...UPPER_S.slice(2)];
  const SU = q === 3 ? curve(UPPER_J, 0.015) : UPPER_J;
  const FORE_J: Sec[] = [
    [0.03, 0.02, 0.022, 0],
    [0.015, 0.04, 0.042, 0],
    [-0.04, 0.043, 0.045, 0.002],
    [-0.12, 0.0385, 0.0405, 0],
    [-0.175, 0.0352, 0.0372, 0],
    [-0.192, 0.0335, 0.0355, 0],
  ];
  const suitUpper = loft(SU, R(14));
  const suitFore = loft(q === 3 ? curve(FORE_J, 0.015) : FORE_J, R(14));
  const sleeveBtns = q === 3 ? [-1, 1].map((s) => sleeveButtons(curve(FORE_J, 0.015), s)) : null;
  const shirtCuff = loft(
    [
      [-0.202, 0.031, 0.033, 0.001],
      [-0.184, 0.033, 0.035, 0.001],
    ],
    R(14)
  );
  // The casual tops' sleeves: the suit's lower head, curved on the desktop
  const LOOSE_U = SU;
  const LOOSE_F = q === 3 ? curve(FORE_S, 0.015) : FORE_S;
  const looseUpper = loft(grow(LOOSE_U, 1.14), R(14));
  const looseFore = loft(grow(LOOSE_F, 1.14), R(14));
  const ribCuff = loft(
    [
      [-0.208, 0.033, 0.035, 0.001],
      [-0.18, 0.037, 0.039, 0.001],
    ],
    R(14)
  );
  // Two stripes down the outside of each sleeve and trouser leg (track suits): flat tape lying on the cloth
  // (`side` of the loft it's on, `n` its squareness), bending with it
  const stripe = (secs: Sec[], s: number, from: number, to: number, n = 2) => {
    const W = 0.0035;
    const side = sideSurface(secs, n);
    const ys: number[] = [];
    for (let y = from; y > to + 1e-6; y -= 0.01) ys.push(y);
    ys.push(to);
    return [-0.009, 0.009].map((dz) => {
      const pos: number[] = [];
      const idx: number[] = [];
      ys.forEach((y, k) => {
        const z0 = secAt(secs, y)[3] ?? 0;
        for (const dw of [-W, W]) pos.push(s * (side(dz + dw, y) + 0.003), y, z0 + dz + dw);
        const a = (k - 1) * 2;
        if (k) idx.push(...(s > 0 ? [a, a + 1, a + 2, a + 1, a + 3, a + 2] : [a, a + 2, a + 1, a + 1, a + 2, a + 3]));
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return plain(g);
    });
  };
  const sleeveStripes = (secs: Sec[], to: number) => [-1, 1].map((s) => mergeGeometries(stripe(grow(secs, 1.14), s, 0.0, to))!);
  const upperStripes = sleeveStripes(LOOSE_U, -0.2);
  // (stopping short of the cuff, which is narrower than the sleeve)
  const foreStripes = sleeveStripes(LOOSE_F, -0.172);
  const thighStripes = [-1, 1].map((s) => mergeGeometries(stripe(JOG_S, s, -0.12, -0.265, 2.2))!);
  const shinStripes = [-1, 1].map((s) => mergeGeometries(stripe(offShin(JOG_S), s, 0.025, -0.2, 2.2))!);
  // A hand at rest: palm towards the leg, fingers curled, the thumb along the front.
  // Drawn in the forearm's numbers and moved into the wrist's space (`onWrist`), so the wrist turns it
  const onWrist = (list: THREE.BufferGeometry[]) => list.map((g) => g.translate(0, -WRIST_Y, -WRIST_Z));
  const hand = onWrist(
    far
      ? [new THREE.BoxGeometry(0.044, 0.11, 0.07).translate(0, -0.25, 0.008)]
      : [
          new THREE.CylinderGeometry(0.026, 0.028, 0.03, R(10)).translate(0, -0.2, 0.004),
          rb(0.044, 0.072, 0.07, 0.019, 0, -0.236, 0.004),
          rb(0.046, 0.046, 0.062, 0.019, 0, -0.28, 0.012),
          new THREE.CapsuleGeometry(0.013, 0.03, 2, R(8)).rotateX(-0.45).translate(0, -0.238, 0.045),
        ]
  );
  // A closed fist: the same wrist, the fingers folded under into one rounded lump, the thumb across the front
  const fist = onWrist(
    far
      ? [new THREE.BoxGeometry(0.05, 0.08, 0.072).translate(0, -0.242, 0.01)]
      : [
          new THREE.CylinderGeometry(0.026, 0.028, 0.03, R(10)).translate(0, -0.2, 0.004),
          rb(0.052, 0.072, 0.074, 0.024, 0, -0.246, 0.012),
          new THREE.CapsuleGeometry(0.012, 0.024, 2, R(8)).rotateZ(Math.PI / 2).translate(0, -0.228, 0.05),
        ]
  );

  /* ----- Shoes (in the shin's space: the sole is on the ground at -0.33): each a loft along its length, a rounded
     toe box, the heel, the collar where the leg goes in, on a sole whose toe curves up off the ground ----- */
  const G = -(HIP_Y - THIGH);
  const SG = R(16);
  // (the desktop's: a section every 1.5 cm on a smooth curve through these)
  const SS = q === 3 ? 0.015 : 0;
  // (the crowd's: every other section and the toe, the far crowd's every fourth: about the triangles of their old shoes)
  const every = [4, 2][q] ?? 1;
  const up = (secs: ShoeSec[]): ShoeSec[] => secs.filter((_, i) => i % every === 0 || i === secs.length - 1).map(([u, hw, b, t]) => [u, hw, G + b, G + t]);
  /** A rounded toe from `u0` to the tip `L` on: each section an ellipse's share of the last, its middle rising `spring` */
  const toe = (u0: number, L: number, [hw, b, t]: [number, number, number], spring = 0): ShoeSec[] =>
    [0.35, 0.6, 0.78, 0.9, 0.97, 1].map((k) => {
      const f = Math.max(0.15, Math.sqrt(1 - k * k));
      const mid = (b + t) / 2 + spring * k * k;
      return [u0 + k * L, hw * f, mid - ((t - b) / 2) * f, mid + ((t - b) / 2) * f];
    });
  /**
   * The sole under an upper: `out` wider, from the ground (its toe curving up with the upper's) to `thick` over
   * the upper's bottom, `ext` past its heel and toe; `arch` lifts it off the ground in front of the heel block
   */
  const sole = (secs: ShoeSec[], out: number, thick: number, ext: number, arch = 0): ShoeSec[] => {
    const lift = secs[0][2] - G;
    return secs.map(([u, hw, b], i) => [
      u + (i === 0 ? -ext : i === secs.length - 1 ? ext : 0),
      hw + out,
      b - lift + (u > -0.015 ? arch * Math.max(0, Math.min(1, (0.12 - u) / 0.13)) : 0),
      b + thick,
    ]);
  };
  const SNEAKER: ShoeSec[] = up([
    [-0.065, 0.026, 0.015, 0.075],
    [-0.058, 0.038, 0.015, 0.095],
    [-0.03, 0.042, 0.015, 0.102],
    [0.0, 0.043, 0.015, 0.1],
    [0.035, 0.044, 0.015, 0.088],
    [0.07, 0.045, 0.016, 0.072],
    [0.105, 0.044, 0.017, 0.058],
    ...toe(0.105, 0.065, [0.044, 0.017, 0.058], 0.004),
  ]);
  const sneaker = shoe(SNEAKER, SG, 2.6, SS);
  const sneakerSole = shoe(sole(SNEAKER, 0.003, 0.009, 0.006), SG, 3, SS);
  // (the laces lie on its top, the stripe on its side)
  const laces = q === 0 ? [] : [0.03, 0.055, 0.08].map((u) => new THREE.BoxGeometry(0.05, 0.005, 0.008).rotateX(0.4).translate(0, secAt(SNEAKER, u)[3]! + 0.001, u));
  const swoop = [-1, 1].map((s) => new THREE.BoxGeometry(0.004, 0.012, 0.11).rotateX(-0.2).translate(s * (secAt(SNEAKER, 0.05)[1] + 0.002), G + 0.05, 0.05));
  const DRESS: ShoeSec[] = up([
    [-0.062, 0.026, 0.016, 0.062],
    [-0.055, 0.034, 0.016, 0.077],
    [-0.02, 0.036, 0.016, 0.08],
    [0.02, 0.037, 0.016, 0.074],
    [0.06, 0.038, 0.016, 0.06],
    [0.1, 0.038, 0.016, 0.05],
    [0.13, 0.036, 0.016, 0.046],
    ...toe(0.13, 0.044, [0.036, 0.016, 0.046], 0.003),
  ]);
  const dress = shoe(DRESS, SG, 2.4, SS);
  const dressSole = shoe(sole(DRESS, 0.002, 0.004, 0.005, 0.01), SG, 3, SS);
  const BOOT: ShoeSec[] = up([
    [-0.068, 0.03, 0.02, 0.13],
    [-0.06, 0.042, 0.02, 0.15],
    [-0.02, 0.046, 0.02, 0.152],
    [0.02, 0.047, 0.02, 0.15],
    [0.05, 0.048, 0.02, 0.118],
    [0.09, 0.048, 0.02, 0.09],
    [0.125, 0.046, 0.021, 0.078],
    ...toe(0.125, 0.049, [0.046, 0.021, 0.078], 0.004),
  ]);
  const boot = shoe(BOOT, SG, 2.8, SS);
  const bootSole = shoe(sole(BOOT, 0.004, 0.008, 0.007), SG, 3.2, SS);

  /* ----- Held things ----- */
  // In the hand's own space (the socket in the palm; the palm is the right hand's -x side, facing his thigh,
  // the thumb +z): the cup forward of the palm, in the fingers' curl (on the palm side it sank into his leg)
  // Held things sit in the hand as it closes to hold (docs/clothing-plan.md Phase 5): the cup against the front of
  // the curled fingers and the thumb, none through it; a handle's bar in the fingers' hook (`HOOK`), the thing
  // hanging under it
  const CUP: [number, number, number] = [-0.021, -0.08, 0.06];
  const HOOK: [number, number] = [-0.02, -0.026];
  /** A carry handle through the hook, its posts down past the hand's sides to `y` (z0 to z1 along the hand) */
  const handle = (y: number, z0: number, z1: number, r: number) =>
    tube(
      [
        [HOOK[0], y + 0.002, z0],
        [HOOK[0], HOOK[1] - 0.008, z0 + 0.004],
        [HOOK[0], HOOK[1], z0 + 0.022],
        [HOOK[0], HOOK[1], z1 - 0.022],
        [HOOK[0], HOOK[1] - 0.008, z1 - 0.004],
        [HOOK[0], y + 0.002, z1],
      ],
      r,
      R(16),
      q === 3 ? 8 : 5
    );
  const cup = new THREE.CylinderGeometry(0.034, 0.027, 0.11, R(14), q === 3 ? 4 : 1).translate(...CUP);
  const cupSleeve = new THREE.CylinderGeometry(0.0335, 0.0305, 0.04, R(14)).translate(CUP[0], CUP[1] - 0.005, CUP[2]);
  const cupTop = [
    new THREE.SphereGeometry(0.035, R(12), R(6), 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1).translate(CUP[0], CUP[1] + 0.055, CUP[2]),
    // (the straw leaning forward, away from his fingers)
    new THREE.CylinderGeometry(0.004, 0.004, 0.064, q === 3 ? 8 : 6).translate(0, 0.032, 0).rotateX(0.42).translate(CUP[0], CUP[1] + 0.06, CUP[2] + 0.004),
  ];
  const BOOM: [number, number, number] = [HOOK[0], -0.141, 0.005];
  const boombox = [rb(0.085, 0.15, 0.27, 0.018, ...BOOM), handle(BOOM[1] + 0.075, BOOM[2] - 0.05, BOOM[2] + 0.05, 0.0085)];
  const speakers = [-0.045, 0.045].flatMap((x) => [-0.075, 0.075].map((z) => new THREE.CylinderGeometry(0.046, 0.046, 0.012, R(16)).rotateZ(Math.PI / 2).translate(BOOM[0] + x, BOOM[1] - 0.005, BOOM[2] + z)));

  /* ----- The premium wardrobe (Drop 001, catalog.ts) ----- */
  /** The varsity's sleeves and ribbing stripe: a fixed cream, a shade under white */
  const CREAM = '#e4dcc4';
  /**
   * Quilting: a loft's sections from `from` up to `to`, `fat` times wider,
   * pinched in halfway between every `step`, so the stacked rounded sections
   * read as the ridges of a puffer
   */
  const quilt = (secs: Sec[], from: number, to: number, step: number, fat: number, pinch = 0.92): Sec[] => {
    // Each baffle a rounded pillow from seam to seam, four sections across it (two made a sawtooth)
    const out: Sec[] = [];
    // (six on the desktop, rounder)
    for (let y = from; y < to - 1e-6; y += step / (q === 3 ? 6 : 4)) {
      const t = ((y - from) / step) % 1;
      const k = fat * (pinch + (1 - pinch) * Math.sin(Math.PI * t));
      const [, hw, hd, z = 0] = secAt(secs, y);
      out.push([y, hw * k, hd * k, z]);
    }
    const [, hw, hd, z = 0] = secAt(secs, to);
    out.push([to, hw * fat * pinch, hd * fat * pinch, z]);
    return out;
  };
  /** A ribbed band (hem, collar, cuff) with a stripe round its middle, standing a touch proud */
  const ribBand = (y0: number, y1: number, hw: number, hd: number, z: number, seg: number, n = 2) => {
    const h = y1 - y0;
    return {
      band: loft(
        [
          [y0, hw, hd, z],
          [y1, hw, hd, z],
        ],
        seg,
        n
      ),
      stripe: loft(
        [
          [y0 + h * 0.36, hw * 1.015, hd * 1.015, z],
          [y0 + h * 0.64, hw * 1.015, hd * 1.015, z],
        ],
        seg,
        n
      ),
    };
  };

  // Varsity: the suit's body without lapels, cream sleeves, ribbed striped hem, collar and cuffs, snaps and the diamond patch
  const VARSITY = grow(JACKET, 1.02);
  const VK = smooth(VARSITY);
  const varsityFront = surface(VK, SN);
  const varsityBody = loft(VK, TOP_RINGS, SN);
  const varsityHem = ribBand(-0.098, -0.046, 0.149, 0.099, 0, TOP_RINGS, SN);
  const varsityCollar = ribBand(0.4, 0.446, 0.066, 0.06, -0.004, R(16));
  const varsityCuff = ribBand(-0.21, -0.176, 0.039, 0.041, 0.001, R(14));
  const placket = tape(-0.011, 0.011, -0.04, 0.4, 0.003, varsityFront, 0.001);

  const snaps = [0.06, 0.14, 0.22, 0.3].map((y) => new THREE.CylinderGeometry(0.0075, 0.0075, 0.005, R(10)).rotateX(Math.PI / 2).translate(0, y, varsityFront(0, y) + 0.005));
  // The chest patch follows the chest's slope where it sits
  const patchAt = (x: number, y: number) => {
    const e = 0.01;
    const slope = (varsityFront(x + e, y) - varsityFront(x - e, y)) / (2 * e);
    return new THREE.PlaneGeometry(0.056, 0.038)
      .rotateY(-Math.atan(slope))
      .translate(x, y, varsityFront(x, y) + 0.005);
  };
  const varsityPatch = patchAt(-0.084, 0.275);

  // Puffer: a fat quilted body with a high collar, fat quilted sleeves, visibly wider than the body
  const PUFFER_BODY: Sec[] = [
    [-0.1, 0.168, 0.116, 0],
    ...quilt(HOODIE, -0.08, 0.36, 0.064, 1.18),
    [0.392, 0.168, 0.1, 0],
    [0.415, 0.104, 0.088, -0.004],
    [0.425, 0.08, 0.072, -0.005],
  ];
  // (on the desktop in two at the second baffle's seam: the hem the phone's 22 rings, as more sank its fuller
  // hem into the trousers' seat at a sprint, and the rest the casual tops' 30, the join hidden in the seam's pinch)
  const SEAM = -0.016;
  const pufferBody =
    q === 3
      ? mergeGeometries([loft(PUFFER_BODY.filter(([y]) => y <= SEAM + 1e-6), 22, HN2), loft(PUFFER_BODY.filter(([y]) => y >= SEAM - 1e-6), TOP_RINGS, HN2)])!
      : loft(PUFFER_BODY, R(22), HN2);
  const PUFFER_COLLAR: Sec[] = [
    [0.395, 0.1, 0.094, -0.004],
    [0.43, 0.103, 0.097, -0.004],
    [0.462, 0.096, 0.09, -0.005],
    [0.48, 0.078, 0.074, -0.006],
    [0.486, 0.06, 0.058, -0.006],
  ];
  const pufferCollar = loft(PUFFER_COLLAR, R(18), 2.2);
  const PUFFER_S: Sec[] = [
    [-0.1, 0.168, 0.116, 0],
    ...quilt(HOODIE, -0.08, 0.36, 0.064, 1.18, 1),
    [0.392, 0.168, 0.1, 0],
  ];
  const pufferFront = surface(PUFFER_S, HN2);
  const pufferZip = [
    tape(-0.005, 0.005, -0.09, 0.39, 0.004, pufferFront, 0.002),
    new THREE.BoxGeometry(0.018, 0.026, 0.008).translate(0, 0.36, pufferFront(0, 0.36) + 0.008),
  ];
  const pufferUpper = loft([[-0.24, 0.03, 0.032, 0], ...quilt(UPPER_S, -0.22, 0.0, 0.055, 1.4), [0.036, 0.026, 0.028, 0]], R(14));
  const pufferFore = loft([[-0.2, 0.04, 0.042, 0], ...quilt(FORE_S, -0.19, 0.0, 0.055, 1.35), [0.03, 0.026, 0.028, 0]], R(14));
  const pufferCuff = loft(
    [
      [-0.212, 0.038, 0.04, 0.001],
      [-0.182, 0.043, 0.045, 0.001],
    ],
    R(14)
  );


  // The gold chain from the shades' arms, down past the jaw and over the collar onto the chest, lying on the top
  // he wears (`front`: its front, in the torso's numbers), clear of the tie, zip or snaps down its middle and of
  // whatever else is laid on it (`over`: the suit's lapels and collar stand 0.012 proud)
  const chainOn = (front: (x: number, y: number) => number, over = 0) => {
    const lift = (x: number) => Math.max(over + 0.004, 0.006 + 0.01 * Math.max(0, 1 - Math.abs(x) / 0.035));
    const on = (x: number, y: number): [number, number, number] => [x, y - HEAD_Y, front(x, y) + lift(x)];
    const side = (s: number): [number, number, number][] => [
      armHook(s),
      [s * 0.1, 0.06, 0.035],
      [s * 0.085, -0.01, 0.03],
      on(s * 0.072, 0.405),
      on(s * 0.055, 0.375),
      on(s * 0.03, 0.35),
    ];
    return tube([...side(-1), on(0, 0.34), ...side(1).reverse()], 0.0035, R(40), q === 3 ? 6 : 4);
  };
  const collarFront = surface(PUFFER_COLLAR, 2.2);
  const CHAINS: [OutfitKind, THREE.BufferGeometry][] = [
    ['suit', chainOn(suitFront, 0.012)],
    ['hoodie', chainOn(hoodieFront)],
    ['track', chainOn(trackFront)],
    ['varsity', chainOn(varsityFront)],
    // (over the puffer's high collar where it stands)
    ['puffer', chainOn((x, y) => Math.max(pufferFront(x, y), y >= 0.395 ? collarFront(x, y) : 0))],
  ];

  /* ----- What's worn over a top (docs/clothing-plan.md Phase 5): each on that top's own outline ----- */
  // Per top: its sections and roundness (its collar's too), how far its laid-on pieces stand on the front, and
  // how far out from the neck its shoulder straps go over (the puffer's high collar pushes them out)
  const TORSOS: { kind: OutfitKind; shells: [Sec[], number][]; over: number; strapX: number }[] = [
    { kind: 'suit', shells: [[JK, SN]], over: 0.012, strapX: 0.085 },
    { kind: 'hoodie', shells: [[HK, HN2]], over: 0, strapX: 0.118 },
    { kind: 'track', shells: [[TK, HN2]], over: 0.002, strapX: 0.085 },
    { kind: 'varsity', shells: [[VK, SN]], over: 0.003, strapX: 0.085 },
    { kind: 'puffer', shells: [[[...PUFFER_S, ...PUFFER_BODY.slice(-2)], HN2], [PUFFER_COLLAR, 2.2]], over: 0, strapX: 0.124 },
  ];
  /** A top's outline as tests: inside it, its middle (z) at a height, and the top of its shoulder at x */
  const torsoOf = (t: (typeof TORSOS)[number]) => {
    const [main, n] = t.shells[0];
    const lo = sorted(main)[0][0];
    const inside = (x: number, y: number, z: number) =>
      t.shells.some(([secs, k]) => {
        const ss = sorted(secs);
        if (y < ss[0][0] || y > ss[ss.length - 1][0]) return false;
        const [, hw, hd, zc = 0] = secAt(ss, y);
        return Math.abs(x / hw) ** k + Math.abs((z - zc) / hd) ** k < 1;
      });
    const mid = (y: number) => secAt(main, Math.max(lo, y))[3] ?? 0;
    const topAt = (x: number) => {
      for (let y = 0.5; y > 0.2; y -= 0.002) if (inside(x, y, mid(y))) return y;
      return 0.2;
    };
    return { inside, mid, topAt, front: surface(main, n), back: surface(main, n, -1) };
  };
  /**
   * A strap laid over a top: a smooth line through rough points (only their side, front or back, and their height
   * matter), each of its points put `lift` off the top's surface: straight out from its middle front or back, up
   * over the shoulder, round the side past its edge (`over`: more on the front, where the top's laid-on pieces are)
   */
  // (`tuck`: its ends left where they're put, under a collar, the line easing out onto the surface from them, and
  // every point laid straight out onto the front, never up over the shoulder)
  const strapOver = (t: (typeof TORSOS)[number], pts: [number, number, number][], r: number, extra = 0, tuck = false) => {
    const o = torsoOf(t);
    const rough = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const len = rough.getLength();
    const n = Math.max(24, Math.round(len / 0.012));
    const laid = rough.getSpacedPoints(n).map((p, i) => {
      const keep = p.clone();
      const w = tuck ? THREE.MathUtils.smoothstep(Math.min(i, n - i) / n, 0.02, 0.2) : 1;
      const zc = o.mid(p.y);
      const top = o.topAt(p.x);
      // (from inside: a little under the shoulder's top near it, else level, through the point)
      const c = new THREE.Vector3(p.x, tuck ? p.y : Math.min(p.y, top - 0.05), zc);
      if (!o.inside(c.x, c.y, c.z)) c.set(0, p.y, zc);
      const d = p.clone().sub(c);
      if (d.lengthSq() < 1e-8) d.set(0, 0, 1);
      d.normalize();
      let lo = 0;
      let hi = 0.4;
      for (let k = 0; k < 22; k++) {
        const m = (lo + hi) / 2;
        if (o.inside(c.x + d.x * m, c.y + d.y * m, c.z + d.z * m)) lo = m;
        else hi = m;
      }
      const lift = r + 0.002 + (d.z > 0.5 ? t.over + extra : 0);
      return keep.lerp(c.addScaledVector(d, lo + lift), w);
    });
    // (phones and crowds: about as many segments as the straps had before they were laid on, docs/clothing-plan.md Phase 5)
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(laid), q === 3 ? n : R(Math.max(16, Math.round(len / 0.04))), r, q === 3 ? 6 : 4);
  };
  const F = 0.3;
  const B = -0.3;
  // Per top, its items: the necklace and its pendant (the puffer's high collar covers it), the backpack and its
  // straps, the crossbody bag, the skateboard, the duffel and its strap, the wings
  const OVER = TORSOS.flatMap((t): Item[] => {
    const o = torsoOf(t);
    const top = (x: number) => o.topAt(x) + 0.05;
    const sx = t.strapX;
    // The necklace: round the neck under the collar and down onto the chest
    const necklace = [
      strapOver(
        t,
        [
          [-0.058, 0.415, -0.01],
          ...([
            [-0.06, 0.38],
            [-0.03, 0.31],
            [0, 0.29],
            [0.03, 0.31],
            [0.06, 0.38],
          ] as const).map(([x, y]): [number, number, number] => [x, y, o.front(x, y) + t.over + 0.01]),
          [0.058, 0.415, -0.01],
        ],
        0.007,
        0.002,
        true
      ),
    ];
    const pendant = new THREE.OctahedronGeometry(0.024).scale(0.9, 1.25, 0.5).translate(0, 0.265, o.front(0, 0.265) + t.over + 0.018);
    const BK = o.back;
    const backpack = [
      rb(0.21, 0.25, 0.09, 0.03, 0, 0.24, BK(0, 0.24) - 0.04),
      rb(0.15, 0.08, 0.03, 0.012, 0, 0.17, BK(0, 0.17) - 0.09),
      ...[-1, 1].map((s) =>
        strapOver(t, [
          [s * 0.075, 0.33, B],
          [s * sx, top(s * sx), o.mid(0.36)],
          [s * sx, 0.33, F],
          [s * 0.09, 0.22, F],
          [s * 0.105, 0.13, F],
        ], 0.009)
      ),
    ];
    const cx = Math.max(0.12, sx);
    const crossbody = [
      rb(0.12, 0.09, 0.045, 0.016, 0.105, 0.03, o.front(0.105, 0.03) + 0.022),
      strapOver(t, [
        [0.1, 0.07, F],
        [0.0, 0.2, F],
        [-cx, 0.34, F],
        [-cx, top(-cx), o.mid(0.36)],
        [-0.1, 0.33, B],
        [0.06, 0.12, B],
        [0.15, 0.05, 0],
      ], 0.008),
    ];
    const deckZ = BK(0, 0.2) - 0.04;
    const deck = new THREE.CapsuleGeometry(0.08, 0.4, q === 3 ? 6 : 4, R(12)).scale(1, 1, 0.13).translate(0, 0.2, deckZ);
    const trucks = [0.42, 0.0].map((y) => new THREE.BoxGeometry(0.13, 0.018, 0.018).translate(0, y, deckZ - 0.024));
    const wheels = [0.42, 0.0].flatMap((y) => [-0.065, 0.065].map((x) => new THREE.CylinderGeometry(0.02, 0.02, 0.022, R(10)).rotateZ(Math.PI / 2).translate(x, y, deckZ - 0.038)));
    // The duffel: a long round bag slung across the back from the right shoulder to the left hip, its ends piped,
    // a handle along the top and a strap over the chest
    const duffelZ = BK(0, 0.2) - 0.07;
    const slung = (g: THREE.BufferGeometry) => g.rotateZ(-0.75).translate(0, 0.2, duffelZ);
    const L = 0.18;
    const DR = 0.074;
    const duffelBody = slung(
      loft(
        // (its ends rounded: a quarter round in rows)
        [0, 1, 2, 3].flatMap((k): Sec[] => {
          const a = (k / 3) * (Math.PI / 2);
          const y = L - 0.012 + Math.sin(a) * 0.018;
          const r = DR - 0.016 + Math.cos(a) * 0.016;
          return [
            [-y, r, r, 0],
            [y, r, r, 0],
          ];
        }),
        R(16)
      )
    );
    const duffelEnds = [-1, 1].map((e) => slung(new THREE.TorusGeometry(DR - 0.006, 0.0045, q === 3 ? 6 : 4, R(16)).rotateX(Math.PI / 2).translate(0, e * (L - 0.004), 0)));
    const duffelHandle = slung(tube([[0, -0.07, -DR + 0.004], [0, -0.055, -DR - 0.026], [0, 0.055, -DR - 0.026], [0, 0.07, -DR + 0.004]], 0.007, R(12), q === 3 ? 8 : 5));
    const dx = Math.max(0.11, sx);
    const duffelStrap = strapOver(t, [
      [0.11, 0.33, B],
      [dx, top(dx), o.mid(0.36)],
      [0.09, 0.36, F],
      [-0.02, 0.2, F],
      [-0.12, 0.06, F],
      [-0.15, 0.03, 0],
      [-0.12, 0.05, B],
    ], 0.011);
    // Wings: two flat wing shapes on the back, swept back, their outlines traced in neon
    const wingPts: [number, number][] = [
      [0.015, 0.34],
      [0.09, 0.44],
      [0.2, 0.49],
      [0.3, 0.47],
      [0.36, 0.4],
      [0.33, 0.33],
      [0.36, 0.26],
      [0.31, 0.2],
      [0.32, 0.12],
      [0.24, 0.1],
      [0.19, 0.15],
      [0.12, 0.08],
      [0.06, 0.14],
      [0.015, 0.1],
    ];
    const wingZ = BK(0, 0.25) - 0.02;
    const wings = [-1, 1].map((s) => {
      const pts = s > 0 ? wingPts : mirror(wingPts);
      const plane = flat(pts, -0.003, 0.006)
        .rotateY(s * 0.45)
        .translate(0, 0, wingZ);
      const loop = pts.map(([x, y]): [number, number, number] => [x, y, 0]);
      loop.push(loop[0]);
      const edge = tube(loop, 0.0045, R(70), 4)
        .rotateY(s * 0.45)
        .translate(0, 0, wingZ);
      return { plane, edge };
    });
    const is = (o: Outfit) => o.kind === t.kind;
    const k = t.kind;
    return [
      ...(k === 'puffer' ? [] : [{ id: `necklace-${k}`, when: (o: Outfit) => !!o.necklace && is(o), pieces: [P('torso', one(necklace), GOLD), P('torso', pendant, '#9ff8ff')] }]),
      { id: `backpack-${k}`, when: (o) => !!o.backpack && is(o), pieces: [P('torso', one(backpack), 'backpack', CHEST)] },
      { id: `crossbody-${k}`, when: (o) => !!o.crossbody && is(o), pieces: [P('torso', one(crossbody), 'crossbody')] },
      {
        id: `board-${k}`,
        when: (o) => !!o.board && is(o),
        pieces: [P('torso', deck, 'board', CHEST), P('torso', one(trucks), '#8b889c', { detail: true, ...CHEST }), P('torso', one(wheels), WHITE, { detail: true, ...CHEST })],
      },
      {
        id: `duffel-${k}`,
        when: (o) => !!o.duffel && is(o),
        pieces: [P('torso', one([duffelBody, duffelHandle]), 'duffel', CHEST), P('torso', one(duffelEnds), 'duffel', { shade: 0.6, ...CHEST }), P('torso', duffelStrap, 'duffel', { shade: 0.6 })],
      },
      {
        id: `wings-${k}`,
        when: (o) => !!o.wings && is(o),
        pieces: [P('torso', one(wings.map((v) => v.plane)), 'wings', CHEST), P('torso', one(wings.map((v) => v.edge)), 'lens', { mat: 'neon', ...CHEST })],
      },
    ];
  });

  // Cowboy hat: a wide brim curled up at the sides, a crown with a crease down the middle, a band with a buckle
  const COWBOY = fitTo(
    [
      [0.165, 0.1, 0.11, -0.004],
      [0.2, 0.098, 0.108, -0.005],
      [0.25, 0.088, 0.1, -0.006],
      [0.29, 0.072, 0.088, -0.007],
      [0.31, 0.05, 0.07, -0.007],
      [0.32, 0.004, 0.01, -0.007],
    ],
    0.004
  );
  const cowboyCrown = snug(loft(q === 3 ? curve(COWBOY, 0.008) : banded(COWBOY, [0.175, 0.188]), R(20), 2.4), 0.168, () => 0.004, 0.02);
  {
    const p = cowboyCrown.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y < 0.27) continue;
      const k = Math.min(1, (y - 0.27) / 0.045);
      p.setY(i, y - 0.03 * k * Math.max(0, 1 - Math.abs(p.getX(i)) / 0.05));
    }
    cowboyCrown.computeVertexNormals();
  }
  /** A flat brim that curls up at the sides (and dips a touch front and back), round the band on its middle */
  const curledBrim = (r: number, curl: number, y: number, z: number) => {
    const g = new THREE.CylinderGeometry(r, r, 0.008, R(28)).scale(1, 1, 1.08);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      p.setY(i, p.getY(i) + x * x * curl - z * z * curl * 0.15);
    }
    g.computeVertexNormals();
    return g.translate(0, y, z);
  };
  const cowboyBrim = curledBrim(0.19, 1.6, 0.172, COWBOY[0][3] ?? 0);
  const BAND = (secs: Sec[], y: number, out = 0.0025): Sec => {
    const [, hw, hd, z] = secAt(secs, y);
    return [y, hw + out, hd + out, z];
  };
  const cowboyBand = snug(loft([BAND(COWBOY, 0.18), BAND(COWBOY, 0.202)], R(20), 2.4), 0.168, () => 0.0065, 0.02);
  const buckle = new THREE.BoxGeometry(0.02, 0.016, 0.006).translate(0, 0.191, (BAND(COWBOY, 0.191)[3] ?? 0) + BAND(COWBOY, 0.191)[2] + 0.002);

  // Top hat: a tall crown, wider a touch at the top, on a band fitted to the head, a ribbon round its base
  const TOPHAT = fitTo(
    [
      [0.166, 0.092, 0.0994, -0.006],
      [0.3, 0.091, 0.098, -0.006],
      [0.34, 0.094, 0.101, -0.006],
    ],
    0.004
  );
  const TS = R(22);
  const tophatTop = TOPHAT[TOPHAT.length - 1];
  const tophat = [
    snug(openLoft(q === 3 ? curve(TOPHAT, 0.01) : banded(TOPHAT, [0.174, 0.186, 0.2]), TS, HN_HAT), 0.168, () => 0.004, 0.02),
    ringStrip(tophatTop, [tophatTop[0], 1e-4, 1e-4, tophatTop[3]], TS, HN_HAT),
    curledBrim(0.14, 1.1, 0.17, TOPHAT[0][3] ?? 0),
  ];
  const tophatBand = snug(loft([BAND(TOPHAT, 0.18, 0.002), BAND(TOPHAT, 0.206, 0.002)], TS, HN_HAT), 0.168, () => 0.006, 0.02);

  // Halo: a thin ring floating above the head, tilted a touch (neon, in the lens colour)
  const halo = new THREE.TorusGeometry(0.072, 0.008, R(8), R(28)).rotateX(Math.PI / 2 - 0.12).translate(0, 0.305, -0.006);

  // The phone: a slim slab in the hand, tilted up so he can see the screen (the screen glows)
  const phoneBody = rb(0.046, 0.09, 0.008, 0.004)
    .rotateX(-0.35)
    .translate(-0.004, -0.045, 0.046);
  const phoneScreen = new THREE.PlaneGeometry(0.038, 0.074)
    .translate(0, 0, 0.0045)
    .rotateX(-0.35)
    .translate(-0.004, -0.045, 0.046);
  // The briefcase: a boxy leather case hanging from the right hand by its handle, gold clasps on top
  const CASE: [number, number, number] = [HOOK[0], -0.152, 0.005];
  const briefcaseBody = rb(0.05, 0.17, 0.24, 0.01, ...CASE);
  const briefcaseHandle = handle(CASE[1] + 0.085, CASE[2] - 0.042, CASE[2] + 0.048, 0.0065);
  const clasps = [-0.08, 0.08].map((z) => new THREE.BoxGeometry(0.016, 0.014, 0.022).translate(CASE[0] + 0.022, CASE[1] + 0.082, CASE[2] + z));
  // A shopping bag (the crowd's, on Crestmont's Drive): a stiff paper bag hanging by its cord, a band round its top
  const BAG: [number, number, number] = [HOOK[0], -0.172, 0.005];
  const bagBody = rb(0.07, 0.19, 0.2, 0.005, ...BAG);
  const bagBand = new THREE.BoxGeometry(0.074, 0.03, 0.204).translate(BAG[0], BAG[1] + 0.07, BAG[2]);
  const bagCord = handle(BAG[1] + 0.095, BAG[2] - 0.05, BAG[2] + 0.06, 0.004);

  // The gold watch on the left wrist: on the wrist itself, just under the cuff, riding the hand (its band's edges
  // rounded, the face's bezel turned; docs/clothing-plan.md Phase 5), the face on the outside of the arm
  const WATCH: [number, number] = [WRIST_Y + 0.0365, WRIST_Z - 0.002];
  const WR = 0.0278;
  const watchBand = loft(
    [-0.005, -0.0038, 0.0038, 0.005].map((y, i): Sec => [WATCH[0] + y, WR - (i % 3 ? 0 : 0.0012), WR - (i % 3 ? 0 : 0.0012), WATCH[1]]),
    R(14)
  );
  const watchFace = new THREE.LatheGeometry(
    (
      [
        [0, -0.004],
        [0.012, -0.004],
        [0.0125, 0.0012],
        [0.0108, 0.0034],
        [0.0088, 0.0036],
        [0, 0.0036],
      ] as const
    ).map(([r, y]) => new THREE.Vector2(r, y)),
    R(12)
  )
    .rotateZ(Math.PI / 2)
    .translate(-WR - 0.0015, WATCH[0], WATCH[1]);
  const watchDial = new THREE.CylinderGeometry(0.0086, 0.0086, 0.0016, R(12))
    .rotateZ(Math.PI / 2)
    .translate(-WR - 0.0047, WATCH[0], WATCH[1]);


  /* ----- The merch (single figures): the top's mark on the chest, big on the front or back, or on the sleeve; the sneakers' marks ----- */
  // Per top: its front and back, the chest spot (the wearer's left), and its sleeve (marks go on the left one, +x)
  const TOPS: { is: (o: Outfit) => boolean; front: (x: number, y: number) => number; back: (x: number, y: number) => number; chest: [number, number, number?, number?] | null; sleeve: Sec[] }[] = [
    // (the suit's is a pin on its left lapel: smaller, lifted over the lapel)
    { is: suit, front: suitFront, back: surface(JK, SN, -1), chest: [0.096, 0.296, 0.038, 0.017], sleeve: SU },
    { is: hoodie, front: hoodieFront, back: BACK, chest: [0.075, 0.28], sleeve: grow(LOOSE_U, 1.14) },
    { is: track, front: trackFront, back: surface(TK, HN2, -1), chest: [0.075, 0.28], sleeve: grow(LOOSE_U, 1.14) },
    // (the varsity's chest mark goes on its badge)
    { is: varsity, front: varsityFront, back: surface(VK, SN, -1), chest: null, sleeve: grow(LOOSE_U, 1.14) },
    { is: puffer, front: pufferFront, back: surface(PUFFER_S, HN2, -1), chest: [0.08, 0.28], sleeve: grow(UPPER_S, 1.44) },
  ];
  /** Where the top's mark goes (a suit's front is its shirt and tie: a big front mark goes on its chest) */
  const slot = (o: Outfit): MarkSlot => (o.markAt === 'centre' && suit(o) ? 'chest' : (o.markAt ?? 'chest'));
  const LOGO = (j: Joint, geo: THREE.BufferGeometry, logo: LogoOf, extra: Partial<Piece> = {}) => P(j, geo, 'ink', { mat: 'logo', logo, ...extra });
  const merch: Item[] = [];
  TOPS.forEach((t, i) => {
    const marks: [MarkSlot, Piece][] = [
      ['centre', LOGO('torso', decal(0.13, onFront(t.front, 0, 0.245, 0.005)), 'top')],
      ['back', LOGO('torso', decal(0.17, onBack(t.back, 0, 0.23, 0.005)), 'top')],
      ['sleeve', LOGO('armR', decal(0.054, onSleeve(sideSurface(t.sleeve), -0.085, 0.005)), 'top')],
    ];
    if (t.chest) marks.push(['chest', LOGO('torso', decal(t.chest[2] ?? 0.062, onFront(t.front, t.chest[0], t.chest[1], t.chest[3] ?? 0.005)), 'top')]);
    for (const [at, piece] of marks) merch.push({ id: `mark-${i}-${at}`, when: (o) => t.is(o) && !!o.mark && slot(o) === at, pieces: [piece] });
  });
  const shoeMark = ([-1, 1] as const).map((s) => decal(0.034, (u, v) => [s * 0.049, G + 0.054 + v, 0.045 - s * u]));
  merch.push({ id: 'shoeMarks', when: (o) => casual(o) && !!o.shoeMark, pieces: both('shin', shoeMark, 'ink', { mat: 'logo', logo: 'shoe', ...SHOE }) });
  const all: Item[] = [
    {
      id: 'head',
      when: () => true,
      pieces: [
        P('head', far ? skull : one(hero ? [skull, ...ears] : [skull, nose, ...ears]), BLACK),
        ...(hero ? [P('head', one([neckFold, eyeRim]), BLACK, { detail: true })] : q > 0 ? [P('head', one(folds), BLACK, { detail: true })] : []),
        P('head', eyesSkin, SKIN),
        P('head', far ? new THREE.BoxGeometry(0.17, 0.05, 0.008).translate(0, EYE_Y, lensZ - 0.002) : one(frames), '#0d0c14'),
        P('head', one(lenses), '#ffffff', { mat: 'lens' }),
      ],
    },
    ...CHAINS.map(([kind, geo]): Item => ({
      id: `chain-${kind}`,
      when: (o) => !!o.chain && o.kind === kind,
      pieces: [P('head', geo, GOLD, { detail: true })],
    })),
    {
      id: 'cap',
      when: (o) => hasCap(o) && !o.capBack,
      pieces: [P('head', one(cap.crown), 'cap'), P('head', one(cap.seams), 'cap', { shade: 0.62, detail: true }), ...hatPatch(cap.patch, cap.logo)],
    },
    {
      id: 'capBack',
      when: (o) => hasCap(o) && !!o.capBack,
      pieces: [
        P('head', one(capBack.crown), 'cap'),
        P('head', one(capBack.seams), 'cap', { shade: 0.62, detail: true }),
        ...hatPatch(capBack.patch, capBack.logo),
      ],
    },
    {
      id: 'bucket',
      when: (o) => !!o.bucket && bare(o),
      pieces: [P('head', one(bucket), 'bucket'), P('head', bucketBand, BLACK, { detail: true })],
    },
    {
      id: 'crown',
      when: (o) => !!o.crown && bare(o),
      pieces: [P('head', one(crown), GOLD), P('head', crownGem, '#d8312f', { detail: true })],
    },
    {
      id: 'beanie',
      when: (o) => !!o.beanie && bare(o),
      pieces: [P('head', one(beanie), 'beanie'), P('head', beanieCuff, 'beanie', { shade: 0.82 }), ...hatPatch(beaniePatch, beanieLogo)],
    },
    {
      id: 'hoodUp',
      when: (o) => hoodie(o) && !!o.hood,
      pieces: [P('head', hoodUp, 'top', { mat: 'double' })],
    },
    {
      id: 'helmet',
      when: soldier,
      pieces: [P('head', one(helmet), '#3e4a26'), P('head', strap, '#2b2a33', { detail: true })],
    },
    {
      id: 'suit',
      when: suit,
      pieces: [
        P('torso', jacket, 'top', TOP),
        P('torso', one([...lapels, ...flaps, ...(tailor ? [tailor.collar] : [])]), 'top', { shade: 1.45 }),
        P('torso', one([shirtFront, tailor?.stand ?? collarBand, ...collars, pocketSquare]), SHIRT),
        ...(tailor && sleeveBtns
          ? [
              P('torso', one(tailor.cloth), 'top', { shade: 1.2 }),
              P('torso', one(tailor.dark), 'top', { shade: 0.55 }),
              P('torso', one(tailor.pick), 'top', { shade: 2.1 }),
              P('torso', one(tailor.horn), HORN),
              P('torso', one(tailor.thread), HOLE),
              P('torso', tailor.dimple, 'tie', { shade: 0.62 }),
              ...both('fore', sleeveBtns, HORN),
            ]
          : [P('torso', button, BLACK, { detail: true })]),
        P('torso', one([tailor?.knot ?? tieKnot, tieBlade]), 'tie'),
        ...both('arm', suitUpper, 'top'),
        ...both('fore', suitFore, 'top'),
        ...both('fore', shirtCuff, SHIRT, { detail: true }),
      ],
    },
    {
      id: 'hoodie',
      when: hoodie,
      pieces: [
        P('torso', hoodieBody, 'top', TOP),
        P('torso', hem, 'top', { shade: 0.8, ...TOP }),
        P('torso', pouch, 'top', { shade: 0.8 }),
        P('torso', one(strings), SHIRT, { detail: true }),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...both('fore', ribCuff, 'top', { shade: 0.8 }),
      ],
    },
    {
      id: 'hoodDown',
      when: (o) => hoodie(o) && !o.hood,
      pieces: [P('torso', hoodDown, 'top')],
    },
    {
      id: 'track',
      when: track,
      pieces: [
        P('torso', trackBody, 'top', TOP),
        P('torso', trackCollar, 'top'),
        P('torso', one(zip), SHIRT, { detail: true }),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...both('fore', ribCuff, 'top', { shade: 0.8 }),
        ...both('arm', upperStripes, SHIRT, { detail: true }),
        ...both('fore', foreStripes, SHIRT, { detail: true }),
        ...both('leg', thighStripes, SHIRT, { detail: true }),
        ...both('shin', shinStripes, SHIRT, { detail: true }),
      ],
    },
    {
      id: 'soldier',
      when: soldier,
      pieces: [
        P('torso', fatigues, 'top', TOP),
        P('torso', collarFat, 'top'),
        P('torso', one([vest, ...pouches]), '#3a4422'),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...(hero ? fingers('#2b2a33') : both('wrist', one(hand), '#2b2a33')),
        P('pelvis', cargo, 'bottom', BOTTOM),
        ...both('leg', cargoPockets, 'bottom', { shade: 0.82, detail: true }),
        ...(kneePads.length ? both('shin', one(kneePads), '#3a4422', { detail: true }) : []),
        ...both('shin', boot, 'shoes', SHOE),
        ...both('shin', bootSole, '#14121a', SHOE),
      ],
    },
    // Hands (open, or fists while fighting), trousers and shoes for everyone but soldiers
    ...(hero
      ? [
          // The skinned body's hands have fingers: a fist is the same hand, closed (`grip`)
          { id: 'fingers', when: (o: Outfit) => !soldier(o), pieces: fingers(SKIN) },
        ]
      : [
          {
            id: 'hands',
            when: (o: Outfit) => !soldier(o) && !o.fists,
            pieces: both('wrist', one(hand), SKIN),
          },
          {
            id: 'fists',
            when: (o: Outfit) => !soldier(o) && !!o.fists,
            pieces: both('wrist', one(fist), SKIN),
          },
        ]),
    {
      id: 'trousers',
      when: suit,
      pieces: [
        P('pelvis', trouserLegs, 'bottom', BOTTOM),
        ...(crease ? both('shin', crease, 'bottom', { shade: 0.75, detail: true }) : []),
        ...both('shin', dress, 'shoes', SHOE),
        ...both('shin', dressSole, '#14121a', SHOE),
      ],
    },
    {
      id: 'joggers',
      when: casual,
      pieces: [
        P('pelvis', joggers, 'bottom', BOTTOM),
        ...both('shin', joggerCuff, 'bottom', { shade: 0.8 }),
        ...both('shin', sneaker, 'shoes', SHOE),
        ...both('shin', sneakerSole, SHIRT, SHOE),
        ...(laces.length ? both('shin', one(laces), SHIRT, { detail: true, ...SHOE }) : []),
      ],
    },
    // The sneakers' side stripe, unless a mark is printed there instead
    {
      id: 'swoop',
      when: (o) => casual(o) && !(hero && o.shoeMark),
      pieces: both('shin', one(swoop), 'shoes', { shade: 0.6, detail: true, ...SHOE }),
    },
    // (the puffer's high collar covers the headphones, and the necklace, below)
    {
      id: 'headphones',
      when: (o) => !!o.headphones && !puffer(o),
      pieces: [P('torso', one(headphones), 'headphones', { detail: true }), ...(cushions.length ? [P('torso', one(cushions), 'headphones', { shade: 0.45, detail: true })] : [])],
    },
    // (the necklace, bags, boards and wings on the top he's wearing: each top its own)
    ...OVER,
    {
      id: 'coffee',
      held: true,
      when: (o) => o.held === 'coffee',
      pieces: [P('handR', cup, WHITE), P('handR', cupSleeve, '#ff6ad5'), P('handR', one(cupTop), WHITE)],
    },
    {
      id: 'boombox',
      held: true,
      when: (o) => o.held === 'boombox',
      pieces: [P('handR', one(boombox), '#2b2a33'), P('handR', one(speakers), '#00d8ff')],
    },
    /* The premium wardrobe (Drop 001) */
    {
      id: 'varsity',
      when: varsity,
      pieces: [
        P('torso', varsityBody, 'top', TOP),
        P('torso', varsityHem.band, 'top', { shade: 0.72, ...TOP }),
        P('torso', one([varsityCollar.band, placket]), 'top', { shade: 0.72 }),
        P('torso', one([varsityHem.stripe, varsityCollar.stripe]), CREAM),
        P('torso', one(snaps), '#b8b6c4', { detail: true }),
        ...(hero
          ? [P('torso', varsityPatch, PATCH), P('torso', decal(0.032, onFront(varsityFront, -0.084, 0.275, 0.009)), 'ink', { mat: 'logo', logo: 'badge' })]
          : [P('torso', varsityPatch, '#ffffff', { mat: 'patch', detail: true })]),
        ...both('arm', looseUpper, CREAM),
        ...both('fore', looseFore, CREAM),
        ...both('fore', varsityCuff.band, 'top', { shade: 0.72 }),
        ...both('fore', varsityCuff.stripe, CREAM, { detail: true }),
      ],
    },
    {
      id: 'puffer',
      when: puffer,
      pieces: [
        P('torso', pufferBody, 'top', TOP),
        P('torso', pufferCollar, 'top'),
        P('torso', one(pufferZip), SHIRT, { detail: true }),
        ...both('arm', pufferUpper, 'top'),
        ...both('fore', pufferFore, 'top'),
        ...both('fore', pufferCuff, 'top', { shade: 0.75 }),
      ],
    },
    {
      id: 'cowboy',
      when: (o) => !!o.cowboy && bare(o),
      pieces: [P('head', one([cowboyCrown, cowboyBrim]), 'cowboy'), P('head', cowboyBand, BLACK, { detail: true }), P('head', buckle, GOLD, { detail: true })],
    },
    {
      id: 'tophat',
      when: (o) => !!o.tophat && bare(o),
      pieces: [P('head', one(tophat), 'tophat'), P('head', tophatBand, '#c99a4a', { detail: true })],
    },
    {
      id: 'halo',
      when: (o) => !!o.halo && bare(o),
      pieces: [P('head', halo, 'lens', { mat: 'neon' })],
    },
    {
      id: 'watch',
      when: (o) => !!o.watch && q > 0,
      pieces: [P('foreL', one([watchBand, watchFace]), GOLD, { detail: true, bone: 'handL' }), P('foreL', watchDial, '#1a1a2a', { detail: true, bone: 'handL' })],
    },
    {
      id: 'phone',
      held: true,
      when: (o) => o.held === 'phone',
      pieces: [P('handR', phoneBody, '#0d0c14'), P('handR', phoneScreen, '#49c2f0', { mat: 'neon' })],
    },
    {
      id: 'briefcase',
      held: true,
      when: (o) => o.held === 'briefcase',
      pieces: [P('handR', briefcaseBody, '#4a2e1a'), P('handR', briefcaseHandle, '#2b1a10'), P('handR', one(clasps), GOLD, { detail: true })],
    },
    {
      id: 'shopping',
      held: true,
      when: (o) => o.held === 'shopping',
      pieces: [P('handR', bagBody, '#f0e9dc'), P('handR', bagCord, '#1b1830'), P('handR', bagBand, GOLD, { detail: true })],
    },
    ...(hero ? merch : []),
  ];
  itemsCache[key] = all;
  return all;
}

/**
 * A piece where it is at rest in the figure's own space (`rest`: its joint's
 * world matrix on the unposed skeleton), stripped to position, normal and
 * uv, and each vertex's bones: on one bone unbent (`bone`), its own weights
 * (`skin`), or weighed by what it's part of and where it is (`weigh()`).
 */
export function restSkin(p: Piece, rest: THREE.Matrix4): { geo: THREE.BufferGeometry; skin: Influence[] } {
  const geo = plain(p.geo).applyMatrix4(rest);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const one: Influence | null = p.bone ? [[p.bone, 1]] : null;
  const skin: Influence[] = [];
  for (let i = 0; i < pos.count; i++) skin.push(one ?? p.skin?.[i] ?? weigh(p.region ?? p.joint, pos.getX(i), pos.getY(i), pos.getZ(i)));
  return { geo, skin };
}
