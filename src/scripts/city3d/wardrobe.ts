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
import { EYE_Y as HERO_EYE_Y, handParts, headFront, headGeometry } from './body';
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
  /** In the right hand: an iced coffee, a boombox, a phone or a briefcase (empty-handed by default) */
  held?: 'coffee' | 'boombox' | 'phone' | 'briefcase';
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

/** A seam line over a loft's surface at angle `a` (0 is +x, PI/2 the front) */
function meridian(secs: Sec[], n: number, a: number, from: number, r: number, lift = 1.012) {
  const e = 2 / n;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts = sorted(secs)
    .filter(([y]) => y >= from)
    .map(([y, hw, hd, z = 0]): [number, number, number] => [Math.sign(c) * Math.abs(c) ** e * hw * lift, y, z + Math.sign(s) * Math.abs(s) ** e * hd * lift]);
  return tube(pts, r, pts.length * 3, 4);
}

const rbox = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0) => new RoundedBoxGeometry(w, h, d, 2, r).translate(x, y, z);
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
  const rb = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0) => (far ? new THREE.BoxGeometry(w, h, d).translate(x, y, z) : rbox(w, h, d, r, x, y, z));
  const P = (joint: Joint, geo: THREE.BufferGeometry, color: string | ColorKey, extra: Partial<Piece> = {}): Piece => ({ joint, geo, color, ...extra });
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
  const ears = [-1, 1].map((s) => new THREE.SphereGeometry(0.022, R(10), R(8)).scale(0.45, 1, 0.75).translate(s * (hero ? 0.081 : 0.086), 0.125, hero ? -0.004 : 0.004));
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
  const frames = [
    ...[-1, 1].map((s) =>
      atEye(
        new THREE.ExtrudeGeometry(frameShape(), {
          depth: 0.011,
          bevelEnabled: false,
          curveSegments: 4,
        }),
        s,
        0
      )
    ),
    new THREE.BoxGeometry(0.018, 0.009, 0.01).translate(0, EYE_Y + 0.008, lensZ + 0.006),
    ...[-1, 1].map((s) => new THREE.BoxGeometry(0.008, 0.009, 0.115).rotateY(s * 0.08).translate(s * 0.088, EYE_Y + 0.01, 0.04)),
  ];
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
  const CAP: Sec[] = [
    [0.168, 0.095, 0.105, -0.004],
    [0.198, 0.094, 0.103, -0.005],
    [0.228, 0.083, 0.091, -0.007],
    [0.25, 0.06, 0.066, -0.008],
    [0.262, 0.03, 0.033, -0.008],
    [0.266, 0.004, 0.004, -0.008],
  ];
  const capFront = surface(CAP);
  const brim = (() => {
    const s = new THREE.Shape();
    const n = R(20);
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI;
      const x = Math.cos(a) * 0.1;
      const z = Math.sin(a) * 0.18;
      if (k === 0) s.moveTo(x, z);
      else s.lineTo(x, z);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 1,
      curveSegments: 4,
    });
    g.rotateX(Math.PI / 2);
    // Curved down at the sides, pitched down at the front
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) - p.getX(i) ** 2 * 2.0);
    g.computeVertexNormals();
    return g.rotateX(0.07).translate(0, 0.177, -0.006);
  })();
  const capParts = (flip: boolean) => {
    const turn = (g: THREE.BufferGeometry) => (flip ? g.rotateY(Math.PI) : g);
    return {
      crown: [loft(CAP, R(20)), brim.clone(), new THREE.SphereGeometry(0.011, R(8), R(6)).translate(0, 0.267, -0.008)].map(turn),
      // Six panels: seams over the crown, darker than the cap
      seams: [Math.PI / 6, (Math.PI * 5) / 6, (Math.PI * 7) / 6, (Math.PI * 11) / 6, (Math.PI * 3) / 2].map((a) => turn(meridian(CAP, 2, a, 0.18, 0.0022))),
      patch: turn(new THREE.PlaneGeometry(0.044, 0.03).rotateX(-0.5).translate(0, 0.214, capFront(0, 0.214) + 0.004)),
      // (single figures) the mark printed on the patch, a touch in front of it
      logo: turn(new THREE.PlaneGeometry(0.027, 0.027).rotateX(-0.5).translate(0, 0.214 + 0.0016, capFront(0, 0.214) + 0.004 + 0.003)),
    };
  };
  const cap = capParts(false);
  const capBack = capParts(true);
  const BEANIE: Sec[] = [
    [0.19, 0.094, 0.103, -0.005],
    [0.215, 0.087, 0.096, -0.006],
    [0.245, 0.068, 0.075, -0.007],
    [0.266, 0.038, 0.042, -0.008],
    [0.273, 0.004, 0.004, -0.008],
  ];
  const beanie = [loft(BEANIE, R(20)), new THREE.SphereGeometry(0.022, R(10), R(8)).translate(0, 0.285, -0.008)];
  // The turned-up cuff, a shade darker
  const beanieCuff = loft(
    [
      [0.158, 0.097, 0.107, -0.004],
      [0.198, 0.098, 0.108, -0.004],
    ],
    R(20)
  );
  const beaniePatch = new THREE.PlaneGeometry(0.042, 0.026).translate(0, 0.178, 0.107);
  const beanieLogo = new THREE.PlaneGeometry(0.023, 0.023).translate(0, 0.178, 0.11);
  const bucket = [
    loft(
      [
        [0.158, 0.097, 0.107, -0.004],
        [0.235, 0.085, 0.094, -0.006],
        [0.245, 0.06, 0.066, -0.006],
        [0.248, 0.001, 0.001, -0.006],
      ],
      R(20)
    ),
    new THREE.LatheGeometry(
      [
        [0.098, 0.17],
        [0.16, 0.134],
        [0.16, 0.126],
        [0.098, 0.16],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      R(24)
    )
      .scale(1, 1, 1.07)
      .translate(0, 0, -0.005),
  ];
  const bucketBand = loft(
    [
      [0.165, 0.099, 0.109, -0.004],
      [0.185, 0.097, 0.107, -0.004],
    ],
    R(20)
  );
  const crown = [
    new THREE.CylinderGeometry(0.074, 0.068, 0.05, R(18), 1, true).translate(0, 0.225, -0.006),
    new THREE.CylinderGeometry(0.068, 0.068, 0.006, R(18)).translate(0, 0.203, -0.006),
    ...[0, 1, 2, 3, 4].flatMap((k) => {
      const a = (k / 5) * Math.PI * 2;
      const x = Math.sin(a) * 0.07;
      const z = Math.cos(a) * 0.07 - 0.006;
      return [new THREE.ConeGeometry(0.022, 0.05, R(6)).translate(x, 0.272, z), new THREE.SphereGeometry(0.013, R(8), R(6)).translate(x, 0.3, z)];
    }),
  ];
  const crownGem = new THREE.SphereGeometry(0.013, R(8), R(6)).scale(1, 1.2, 0.6).translate(0, 0.225, 0.07);
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
  const necklace = tube(
    [
      [-0.058, 0.415, -0.01],
      [-0.06, 0.38, suitFront(-0.06, 0.38) + 0.01],
      [-0.03, 0.31, suitFront(-0.03, 0.31) + 0.012],
      [0, 0.29, suitFront(0, 0.29) + 0.014],
      [0.03, 0.31, suitFront(0.03, 0.31) + 0.012],
      [0.06, 0.38, suitFront(0.06, 0.38) + 0.01],
      [0.058, 0.415, -0.01],
    ],
    0.007,
    R(24),
    5
  );

  const pendant = new THREE.OctahedronGeometry(0.024).scale(0.9, 1.25, 0.5).translate(0, 0.265, suitFront(0, 0.265) + 0.018);
  const headphones = [
    new THREE.TorusGeometry(0.07, 0.012, R(6), R(16), Math.PI * 1.1)
      .rotateX(Math.PI / 2)
      .rotateY(Math.PI * 0.45)
      .translate(0, 0.43, -0.01),
    ...[-1, 1].map((s) => new THREE.CylinderGeometry(0.03, 0.03, 0.024, R(12)).rotateZ(Math.PI / 2).translate(s * 0.074, 0.425, 0.03)),
  ];
  const BACK = surface(HK, HN2, -1);
  const backpack = [
    rb(0.21, 0.25, 0.09, 0.03, 0, 0.24, BACK(0, 0.24) - 0.04),
    rb(0.15, 0.08, 0.03, 0.012, 0, 0.17, BACK(0, 0.17) - 0.09),
    ...[-1, 1].map((s) =>
      tube(
        [
          [s * 0.08, 0.36, BACK(s * 0.08, 0.36) - 0.01],
          [s * 0.085, 0.395, 0],
          [s * 0.085, 0.36, hoodieFront(s * 0.085, 0.36) + 0.005],
          [s * 0.09, 0.22, hoodieFront(s * 0.09, 0.22) + 0.005],
          [s * 0.1, 0.12, hoodieFront(s * 0.1, 0.12)],
        ],
        0.009,
        R(12),
        4
      )
    ),
  ];
  const crossbody = [
    rb(0.12, 0.09, 0.045, 0.016, 0.105, 0.03, hoodieFront(0.105, 0.03) + 0.022),
    tube(
      [
        [0.1, 0.07, hoodieFront(0.1, 0.07) + 0.01],
        [0.0, 0.2, hoodieFront(0, 0.2) + 0.008],
        [-0.12, 0.36, hoodieFront(-0.12, 0.36) + 0.006],
        [-0.13, 0.4, 0],
        [-0.1, 0.33, BACK(-0.1, 0.33) - 0.006],
        [0.06, 0.12, BACK(0.06, 0.12) - 0.008],
      ],
      0.008,
      R(24),
      4
    ),
  ];
  const deck = new THREE.CapsuleGeometry(0.08, 0.4, 4, R(12)).scale(1, 1, 0.13).translate(0, 0.2, BACK(0, 0.2) - 0.04);
  const trucks = [0.42, 0.0].map((y) => new THREE.BoxGeometry(0.13, 0.018, 0.018).translate(0, y, BACK(0, 0.2) - 0.064));
  const wheels = [0.42, 0.0].flatMap((y) =>
    [-0.065, 0.065].map((x) => new THREE.CylinderGeometry(0.02, 0.02, 0.022, R(10)).rotateZ(Math.PI / 2).translate(x, y, BACK(0, 0.2) - 0.078))
  );

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
  const CUP: [number, number, number] = [-0.006, -0.042, 0.044];
  const cup = new THREE.CylinderGeometry(0.034, 0.027, 0.11, R(14)).translate(...CUP);
  const cupSleeve = new THREE.CylinderGeometry(0.0335, 0.0305, 0.04, R(14)).translate(CUP[0], CUP[1] - 0.005, CUP[2]);
  const cupTop = [
    new THREE.SphereGeometry(0.035, R(12), R(6), 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1).translate(CUP[0], CUP[1] + 0.055, CUP[2]),
    new THREE.CylinderGeometry(0.004, 0.004, 0.07, 6).rotateZ(0.2).translate(CUP[0] + 0.006, CUP[1] + 0.09, CUP[2]),
  ];
  const boombox = [rb(0.085, 0.15, 0.27, 0.018, 0, -0.11, 0.03), new THREE.TorusGeometry(0.06, 0.009, 6, R(12), Math.PI).rotateY(Math.PI / 2).translate(0, -0.035, 0.03)];
  const speakers = [-0.045, 0.045].flatMap((x) => [-0.045, 0.105].map((z) => new THREE.CylinderGeometry(0.046, 0.046, 0.012, R(16)).rotateZ(Math.PI / 2).translate(x, -0.115, z)));

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
      [s * 0.094, EYE_Y + 0.006, 0.03],
      [s * 0.1, 0.06, 0.035],
      [s * 0.085, -0.01, 0.03],
      on(s * 0.072, 0.405),
      on(s * 0.055, 0.375),
      on(s * 0.03, 0.35),
    ];
    return tube([...side(-1), on(0, 0.34), ...side(1).reverse()], 0.0035, R(40), 4);
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

  // Cowboy hat: a wide brim curled up at the sides, a crown with a crease down the middle, a band with a buckle
  const COWBOY: Sec[] = [
    [0.165, 0.1, 0.11, -0.004],
    [0.2, 0.098, 0.108, -0.005],
    [0.25, 0.088, 0.1, -0.006],
    [0.29, 0.072, 0.088, -0.007],
    [0.31, 0.05, 0.07, -0.007],
    [0.32, 0.004, 0.01, -0.007],
  ];
  const cowboyCrown = loft(COWBOY, R(20), 2.4);
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
  /** A flat brim that curls up at the sides (and dips a touch front and back) */
  const curledBrim = (r: number, curl: number, y: number) => {
    const g = new THREE.CylinderGeometry(r, r, 0.008, R(28)).scale(1, 1, 1.08);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      p.setY(i, p.getY(i) + x * x * curl - z * z * curl * 0.15);
    }
    g.computeVertexNormals();
    return g.translate(0, y, -0.005);
  };
  const cowboyBrim = curledBrim(0.19, 1.6, 0.172);
  const cowboyBand = loft(
    [
      [0.186, 0.103, 0.113, -0.004],
      [0.208, 0.1, 0.11, -0.0045],
    ],
    R(20),
    2.4
  );
  const buckle = new THREE.BoxGeometry(0.02, 0.016, 0.006).translate(0, 0.197, 0.106);

  // Top hat: a tall cylinder on a curled brim, a band round the base
  const tophat = [new THREE.CylinderGeometry(0.09, 0.092, 0.175, R(22)).scale(1, 1, 1.08).translate(0, 0.253, -0.006), curledBrim(0.14, 1.1, 0.17)];
  const tophatBand = new THREE.CylinderGeometry(0.0935, 0.0945, 0.026, R(22)).scale(1, 1, 1.08).translate(0, 0.193, -0.006);

  // Halo: a thin ring floating above the head, tilted a touch (neon, in the lens colour)
  const halo = new THREE.TorusGeometry(0.072, 0.008, R(8), R(28)).rotateX(Math.PI / 2 - 0.12).translate(0, 0.305, -0.006);

  // Duffel: a long bag slung across the back from the right shoulder to the left hip, with a strap over the chest
  const duffelZ = BACK(0, 0.2) - 0.07;
  const slung = (g: THREE.BufferGeometry) => g.rotateZ(-0.75).translate(0, 0.2, duffelZ);
  const duffelBody = slung(new THREE.CylinderGeometry(0.072, 0.072, 0.36, R(16)));
  const duffelEnds = [-0.18, 0.18].map((y) => slung(new THREE.CylinderGeometry(0.076, 0.076, 0.02, R(16)).translate(0, y, 0)));
  const duffelHandle = slung(
    tube(
      [
        [0, -0.06, -0.07],
        [0, -0.05, -0.1],
        [0, 0.05, -0.1],
        [0, 0.06, -0.07],
      ],
      0.007,
      R(12),
      5
    )
  );
  const duffelStrap = tube(
    [
      [0.11, 0.33, BACK(0.11, 0.33) - 0.03],
      [0.11, 0.41, 0],
      [0.09, 0.36, hoodieFront(0.09, 0.36) + 0.008],
      [-0.02, 0.2, hoodieFront(-0.02, 0.2) + 0.008],
      [-0.12, 0.06, hoodieFront(-0.12, 0.06) + 0.006],
      [-0.14, 0.03, 0],
      [-0.12, 0.05, BACK(-0.12, 0.05) - 0.03],
    ],
    0.011,
    R(30),
    5
  );

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
  const wingZ = BACK(0, 0.25) - 0.02;
  const wing = (s: number) => {
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
  };
  const wings = [-1, 1].map(wing);

  // The phone: a slim slab in the hand, tilted up so he can see the screen (the screen glows)
  const phoneBody = rb(0.046, 0.09, 0.008, 0.004)
    .rotateX(-0.35)
    .translate(-0.004, -0.045, 0.046);
  const phoneScreen = new THREE.PlaneGeometry(0.038, 0.074)
    .translate(0, 0, 0.0045)
    .rotateX(-0.35)
    .translate(-0.004, -0.045, 0.046);
  // The briefcase: a boxy leather case hanging from the right hand by its handle, gold clasps on top
  const briefcaseBody = rb(0.05, 0.17, 0.24, 0.01, 0.024, -0.152, 0.03);
  const briefcaseHandle = tube(
    [
      [0.024, -0.066, -0.01],
      [0.024, -0.02, 0.0],
      [0.024, -0.006, 0.03],
      [0.024, -0.02, 0.06],
      [0.024, -0.066, 0.07],
    ],
    0.0065,
    R(12),
    5
  );
  const clasps = [-0.05, 0.11].map((z) => new THREE.BoxGeometry(0.016, 0.014, 0.022).translate(0.046, -0.07, z));

  // The gold watch on the left wrist: a band over the cuff, the face on the outside of the arm
  const watchBand = loft(
    [
      [-0.207, 0.0375, 0.0395, 0.001],
      [-0.195, 0.0375, 0.0395, 0.001],
    ],
    R(14)
  );
  const watchFace = new THREE.CylinderGeometry(0.015, 0.015, 0.008, R(12)).rotateZ(Math.PI / 2).translate(-0.04, -0.201, 0.001);
  const watchDial = new THREE.CylinderGeometry(0.011, 0.011, 0.002, R(12)).rotateZ(Math.PI / 2).translate(-0.0445, -0.201, 0.001);

  const one = (geos: THREE.BufferGeometry[]) => (geos.length === 1 ? geos[0] : mergeGeometries(geos.map(plain))!);

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
        P('torso', one([...lapels, ...flaps]), 'top', { shade: 1.45 }),
        P('torso', one([shirtFront, collarBand, ...collars, pocketSquare]), SHIRT),
        P('torso', button, BLACK, { detail: true }),
        P('torso', one([tieKnot, tieBlade]), 'tie'),
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
    // (the puffer's high collar covers the necklace and headphones)
    {
      id: 'necklace',
      when: (o) => !!o.necklace && !puffer(o),
      pieces: [P('torso', necklace, GOLD), P('torso', pendant, '#9ff8ff')],
    },
    {
      id: 'headphones',
      when: (o) => !!o.headphones && !puffer(o),
      pieces: [P('torso', one(headphones), 'headphones', { detail: true })],
    },
    {
      id: 'backpack',
      when: (o) => !!o.backpack,
      pieces: [P('torso', one(backpack), 'backpack', CHEST)],
    },
    {
      id: 'crossbody',
      when: (o) => !!o.crossbody,
      pieces: [P('torso', one(crossbody), 'crossbody')],
    },
    {
      id: 'board',
      when: (o) => !!o.board,
      pieces: [P('torso', deck, 'board', CHEST), P('torso', one(trucks), '#8b889c', { detail: true, ...CHEST }), P('torso', one(wheels), WHITE, { detail: true, ...CHEST })],
    },
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
      id: 'duffel',
      when: (o) => !!o.duffel,
      pieces: [P('torso', one([duffelBody, duffelHandle]), 'duffel', CHEST), P('torso', one(duffelEnds), 'duffel', { shade: 0.6, ...CHEST }), P('torso', duffelStrap, 'duffel', { shade: 0.6 })],
    },
    {
      id: 'wings',
      when: (o) => !!o.wings,
      pieces: [P('torso', one(wings.map((w) => w.plane)), 'wings', CHEST), P('torso', one(wings.map((w) => w.edge)), 'lens', { mat: 'neon', ...CHEST })],
    },
    {
      id: 'watch',
      when: (o) => !!o.watch && q > 0,
      pieces: [P('foreL', one([watchBand, watchFace]), GOLD, { detail: true }), P('foreL', watchDial, '#1a1a2a', { detail: true })],
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
