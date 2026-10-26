/*
 * Degen, built once and dressed many ways.
 *
 * One body after the brand art (balaclava with the eye opening, red cap with
 * the diamond patch, green shades on a gold chain, collar, tie and a lapelled
 * suit) with knees and elbows, so walks and runs can bend. Outfits swap the
 * clothes on that body: suits, hoodies and joggers, soldier fatigues, and
 * Drop 001's premium wardrobe (the varsity and puffer jackets, the cowboy hat,
 * top hat and neon halo, the duffel bag and neon wings, the phone, the
 * briefcase and the gold watch). Neon pieces (the halo, the wings' edges, the
 * phone's screen) glow through `neon()` in kit.ts, kept dim enough by day
 * not to bloom.
 *
 * Two ways to build it:
 * - createDegen(): one figure, the skinned body on real bones
 *   (skeleton.ts: a spine, neck, collarbones, ankles, toes and fingers),
 *   with the brand-art head and hands with fingers (body.ts), everything
 *   worn weighted to the bones so knees, elbows, shoulders, waist and neck
 *   bend without seams (you, other players, the fitting room, drivers,
 *   fighters and the rooftop hologram). Hands carry sockets for things held.
 * - createCrowd(): many figures as instanced rigid parts on the simple rig,
 *   a draw call per part whatever the head count (pedestrians, soldiers;
 *   they move to the skinned body in the character plan's Phase 5).
 * Both are posed with the same Pose, from the pose helpers below.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rifleGeometry } from './guns';
import { MARK_IDS, type Look, type MarkId, type MarkSlot, type PatternId } from '../net/profile-data';
import { ATLAS_COLS, ATLAS_ROWS, MARK_ART } from './marks';
import { lit, liveTex, moving, neon, toon } from './kit';
import { EYE_Y as HERO_EYE_Y, handParts, headFront, headGeometry } from './body';
import { crowdFrame, type CrowdClip } from './crowdclips';
import { WARDROBE_W, addWardrobe, crowdDepth, crowdTexture, crowdVersion } from './crowdskin';
import {
  HIP_Y,
  THIGH,
  WRIST_Y,
  WRIST_Z,
  makeSkeleton,
  newPose,
  poseSkeleton,
  weigh,
  BONE_INDEX,
  type BoneName,
  type Influence,
  type Joint,
  type Pose,
  type Region,
  type Skeleton,
} from './skeleton';

export { ARM_REACH, HIP_HEIGHT, newPose, reachArm, shoulderTo, torsoFrame, type Limb, type Pose, type Wrist } from './skeleton';

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

/* ---------- Poses (poses.ts) ---------- */

export { walkPose, idlePose, lookPose, chatPose, sitPose, airPose, marchPose, attentionPose } from './poses';
export { dancePose, emotePose } from './emotes';

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

/** Detail level: 0 the light (phone) crowd, 1 the crowd, 2 a single figure (the player, the hologram) */
export type Detail = 0 | 1 | 2;

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
/** A flat shape (x, y) with a little thickness, lying on a surface `lift` above it */
function onBody(pts: [number, number][] | THREE.Shape, depth: number, surf: (x: number, y: number) => number, lift: number, side = 1) {
  const shape = Array.isArray(pts) ? new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))) : pts;
  const flatG = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
  const g = bend ? tessellate(flatG, bend) : flatG;
  if (!bend) lift += 0.003;
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, surf(x, y) + side * (lift + p.getZ(i)));
  }
  if (side < 0) flipFaces(g);
  g.computeVertexNormals();
  return g;
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
function tessellate(g: THREE.BufferGeometry, max: number) {
  const src = (g.index ? g.toNonIndexed() : g).attributes.position.array as ArrayLike<number>;
  const out: number[] = [];
  const v = (i: number) => [src[i], src[i + 1], src[i + 2]];
  const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const len = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const split = (a: number[], b: number[], c: number[]): void => {
    const ab = len(a, b);
    const bc = len(b, c);
    const ca = len(c, a);
    const top = Math.max(ab, bc, ca);
    if (top <= max) {
      out.push(...a, ...b, ...c);
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
  t.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  t.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((out.length / 3) * 2), 2));
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

/**
 * A side profile (forward, up) turned into a solid `w` wide, rounded at the
 * edges (shoes). The first two points are the flat bottom; the rest is a
 * smooth curve over the toe, the top and the heel.
 */
function profile(pts: [number, number][], w: number, round: number, curve = 6) {
  const v = pts.map(([u, y]) => new THREE.Vector2(u, y));
  const s = new THREE.Shape().moveTo(v[0].x, v[0].y).lineTo(v[1].x, v[1].y);
  s.splineThru(v.slice(2).concat([v[0]]));
  const g = new THREE.ExtrudeGeometry(s, {
    depth: w - round * 2,
    bevelEnabled: round > 0,
    bevelThickness: round,
    bevelSize: round,
    bevelOffset: -round,
    bevelSegments: 2,
    curveSegments: curve,
  });
  g.translate(0, 0, -(w - round * 2) / 2);
  return g.rotateY(-Math.PI / 2);
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

/** Strip a geometry to what merging needs: no index, position, normal, uv */
function plain(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
  if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
  if (!n.attributes.normal) n.computeVertexNormals();
  return n;
}
/** Merge geometries, each painted one colour per vertex */
function paintMerge(list: { geo: THREE.BufferGeometry; color: THREE.Color }[]) {
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

type ColorKey = 'top' | 'bottom' | 'shoes' | 'tie' | 'cap' | 'beanie' | 'bucket' | 'cowboy' | 'tophat' | 'backpack' | 'crossbody' | 'board' | 'duffel' | 'wings' | 'headphones' | 'lens' | 'ink';
/** Every outfit colour a piece can take (the crowd works each figure's out once) */
const COLOR_KEYS: ColorKey[] = ['top', 'bottom', 'shoes', 'tie', 'cap', 'beanie', 'bucket', 'cowboy', 'tophat', 'backpack', 'crossbody', 'board', 'duffel', 'wings', 'headphones', 'lens', 'ink'];
/**
 * Pieces with a material of their own: the shades' lenses, the cap patch,
 * the raised hood (both sides drawn), neon (unlit, coloured per
 * vertex, brighter at night through `neon()`), and on single figures the
 * merch: marks printed from the logo atlas (`logo`, in the outfit's ink)
 * and the top's all-over print (`pattern`, chosen in createDegen)
 */
type Mat = 'lens' | 'patch' | 'double' | 'neon' | 'logo' | 'pattern';
/** Which mark a logo piece prints: the top's, the hat's, the sneakers', or the varsity's badge (the top's chest mark, or the diamond) */
type LogoOf = 'top' | 'hat' | 'shoe' | 'badge';
interface Piece {
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
}
interface Item {
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
const texCache: { patch?: THREE.Texture } = {};

/**
 * The wardrobe at a detail level. `hero` is the skinned body's (createDegen):
 * the brand-art head on the longer neck, hands with fingers, the shoes on
 * the feet; the crowd's (`hero` false) keeps the round head and solid hands.
 */
function items(q: Detail, hero = false): Item[] {
  const key = `${q}${hero ? 'h' : ''}`;
  if (itemsCache[key]) return itemsCache[key]!;
  /** Ring segments at this detail level */
  const R = (n: number) => Math.max(5, Math.round(n * [0.36, 0.7, 1][q]));
  const L = (s: number) => (q === 2 ? s : Math.max(2, Math.round(s * 0.6)));
  bend = q === 2 ? 0.03 : 0;
  /** People far from the camera: plain boxes for rounded ones, shoes without rounded edges */
  const far = q === 0;
  const rb = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0) => (far ? new THREE.BoxGeometry(w, h, d).translate(x, y, z) : rbox(w, h, d, r, x, y, z));
  const prof = (pts: [number, number][], w: number, round: number, curve = 6) => (far ? profile(pts, w, 0, 1) : profile(pts, w, round, curve));
  const P = (joint: Joint, geo: THREE.BufferGeometry, color: string | ColorKey, extra: Partial<Piece> = {}): Piece => ({ joint, geo, color, ...extra });
  /** The same piece on both sides (one geometry, or one per side for things that sit on the outside) */
  const both = (
    kind: 'arm' | 'fore' | 'leg' | 'shin' | 'wrist' | 'hand',
    geo: THREE.BufferGeometry | THREE.BufferGeometry[],
    color: string | ColorKey,
    extra: Partial<Piece> = {}
  ): Piece[] => (['L', 'R'] as const).map((s, i) => P(`${kind}${s}`, Array.isArray(geo) ? geo[i] : geo, color, extra));

  /** Shoes ride the feet; bags and boards sit unbending on the chest (both on the skinned body only) */
  const SHOE: Partial<Piece> = { region: 'shoe' };
  const CHEST: Partial<Piece> = { bone: 'chest' };
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
  // The gold chain from the shades' arms, under the chin and round the neck
  const chain = tube(
    [
      [-0.094, EYE_Y + 0.006, 0.03],
      [-0.1, 0.06, 0.04],
      [-0.085, -0.02, 0.07],
      [-0.045, -0.07, 0.1],
      [0, -0.085, 0.112],
      [0.045, -0.07, 0.1],
      [0.085, -0.02, 0.07],
      [0.1, 0.06, 0.04],
      [0.094, EYE_Y + 0.006, 0.03],
    ],
    0.0035,
    R(36),
    4
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
  const SUIT: Sec[] = [
    [-0.085, 0.142, 0.094, 0],
    [-0.02, 0.138, 0.092, 0],
    [0.1, 0.127, 0.088, 0.002],
    [0.2, 0.148, 0.1, 0.006],
    [0.29, 0.16, 0.1, 0.004],
    // (natural athletic shoulders: rounded into the arm, the trapezius sloping up to the neck, no padded shelf;
    // the body stops short of the arm's outside, so the sleeve's rounded cap is the shoulder, not a square corner)
    [0.33, 0.152, 0.092, 0.002],
    [0.355, 0.138, 0.085, 0],
    [0.378, 0.118, 0.076, -0.003],
    [0.397, 0.096, 0.068, -0.005],
    [0.41, 0.076, 0.06, -0.006],
    [0.42, 0.058, 0.054, -0.006],
  ];
  const SN = 2.6;
  const suitFront = surface(SUIT, SN);
  const lapelPts: [number, number][] = [
    [-0.062, 0.41],
    [-0.002, 0.198],
    [-0.012, 0.168],
    [-0.088, 0.25],
    [-0.106, 0.318],
    [-0.128, 0.326],
    [-0.12, 0.372],
  ];
  const jacket = loft(SUIT, R(22), SN);
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
  const collars = [onBody(collarPts, 0.004, suitFront, 0.008), onBody(mirror(collarPts), 0.004, suitFront, 0.008)];
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
  const tieKnot = onBody(
    [
      [-0.016, 0.398],
      [0.016, 0.398],
      [0.011, 0.372],
      [-0.011, 0.372],
    ],
    0.01,
    suitFront,
    0.004
  );
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
    0.005
  );

  const HOODIE: Sec[] = [
    [-0.085, 0.148, 0.1, 0],
    [0.0, 0.15, 0.102, 0],
    [0.12, 0.148, 0.1, 0.002],
    [0.23, 0.162, 0.108, 0.006],
    [0.31, 0.171, 0.104, 0.004],
    // (the same sloping shoulders as the suit, a little looser)
    [0.34, 0.161, 0.097, 0.002],
    [0.362, 0.146, 0.089, 0],
    [0.383, 0.124, 0.08, -0.003],
    [0.4, 0.1, 0.071, -0.005],
    [0.412, 0.08, 0.062, -0.006],
    [0.422, 0.06, 0.056, -0.006],
  ];
  const HN2 = 2.2;
  const hoodieFront = surface(HOODIE, HN2);
  const hoodieBody = loft(HOODIE, R(22), HN2);
  const hem = loft(
    [
      [-0.095, 0.152, 0.104, 0],
      [-0.05, 0.155, 0.106, 0],
    ],
    R(22),
    HN2
  );
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
  const hoodDown = new THREE.TorusGeometry(0.08, 0.03, R(8), R(16), Math.PI * 1.2)
    .rotateZ(-Math.PI * 0.1)
    .rotateX(Math.PI / 2 + 0.45)
    .rotateZ(Math.PI)
    .translate(0, 0.405, -0.035);
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
  const trackFront = surface(TRACK, HN2);
  const trackBody = loft(TRACK, R(22), HN2);
  const trackCollar = new THREE.CylinderGeometry(0.06, 0.066, 0.05, R(16), 1, true).translate(0, 0.42, -0.004);
  const zip = [
    onBody(
      [
        [-0.005, -0.08],
        [0.005, -0.08],
        [0.005, 0.41],
        [-0.005, 0.41],
      ],
      0.004,
      trackFront,
      0.001
    ),
    new THREE.BoxGeometry(0.018, 0.026, 0.008).translate(0, 0.37, trackFront(0, 0.37) + 0.006),
  ];

  const FATIGUES = grow(SUIT, 1.03);
  const fatigues = loft(FATIGUES, R(22), 2.8);
  const VEST: Sec[] = [
    [0.05, 0.155, 0.11, 0],
    [0.2, 0.168, 0.118, 0.006],
    [0.33, 0.184, 0.11, 0.004],
    [0.37, 0.165, 0.094, 0],
    [0.38, 0.12, 0.08, 0],
  ];
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
  const BACK = surface(HOODIE, HN2, -1);
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

  /* ----- Hips and legs ----- */
  const PELVIS: Sec[] = [
    [-0.1, 0.085, 0.07, 0],
    [-0.07, 0.122, 0.086, 0],
    [0.0, 0.134, 0.09, 0],
    [0.1, 0.126, 0.086, 0],
    [0.15, 0.11, 0.075, 0],
  ];
  const pelvis = loft(PELVIS, R(20), 2.2);
  // (the top tapers in under the jacket's and the hoodie's hips)
  const THIGH_S: Sec[] = [
    [0.04, 0.05, 0.058, 0],
    [-0.03, 0.058, 0.064, 0],
    [-0.08, 0.062, 0.066, 0.001],
    [-0.15, 0.058, 0.062, 0.002],
    [-0.26, 0.05, 0.054, 0],
    [-0.3, 0.042, 0.046, 0],
    [-0.318, 0.02, 0.024, 0],
  ];
  const SHIN_S: Sec[] = [
    [0.03, 0.024, 0.026, 0],
    [0.012, 0.046, 0.05, 0],
    [-0.02, 0.049, 0.053, 0],
    [-0.11, 0.05, 0.055, -0.004],
    [-0.21, 0.046, 0.05, 0],
    [-0.27, 0.051, 0.057, 0.004],
    [-0.285, 0.051, 0.057, 0.004],
  ];
  const trouserThigh = loft(THIGH_S, R(16));
  const trouserShin = loft(SHIN_S, R(16));
  const crease =
    q === 2
      ? onBody(
          [
            [-0.002, -0.27],
            [0.002, -0.27],
            [0.002, 0.0],
            [-0.002, 0.0],
          ],
          0.002,
          surface(SHIN_S),
          0.0005
        )
      : null;
  const joggerThigh = loft(grow(THIGH_S, 1.1), R(16));
  const joggerShin = loft(
    [
      [0.03, 0.026, 0.028, 0],
      [0.012, 0.05, 0.054, 0],
      [-0.02, 0.053, 0.057, 0],
      [-0.11, 0.052, 0.056, -0.004],
      [-0.2, 0.043, 0.046, 0],
      [-0.235, 0.039, 0.042, 0],
    ],
    R(16)
  );
  const joggerCuff = loft(
    [
      [-0.258, 0.042, 0.045, 0.002],
      [-0.224, 0.043, 0.046, 0.002],
    ],
    R(16)
  );
  const cargoThigh = loft(grow(THIGH_S, 1.14), R(16));
  const cargoShin = loft(
    [
      [0.03, 0.027, 0.03, 0],
      [0.012, 0.052, 0.056, 0],
      [-0.02, 0.056, 0.06, 0],
      [-0.12, 0.054, 0.058, -0.004],
      [-0.2, 0.05, 0.054, 0],
    ],
    R(16)
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
  const suitUpper = loft(UPPER_S, R(14));
  const suitFore = loft(FORE_S, R(14));
  const shirtCuff = loft(
    [
      [-0.202, 0.031, 0.033, 0.001],
      [-0.184, 0.033, 0.035, 0.001],
    ],
    R(14)
  );
  const looseUpper = loft(grow(UPPER_S, 1.14), R(14));
  const looseFore = loft(grow(FORE_S, 1.14), R(14));
  const ribCuff = loft(
    [
      [-0.208, 0.033, 0.035, 0.001],
      [-0.18, 0.037, 0.039, 0.001],
    ],
    R(14)
  );
  // Two stripes down the outside of each sleeve and trouser leg (track suits)
  const stripe = (secs: Sec[], s: number, from: number, to: number) => {
    const w = 0.009;
    const pts = sorted(secs).filter(([y]) => y <= from + 1e-6 && y >= to - 1e-6);
    return [-w, w].map((dz) =>
      tube(
        pts.map(([y, hw]): [number, number, number] => [s * (hw + 0.002), y, dz]),
        0.0045,
        pts.length * 2,
        4
      )
    );
  };
  const sleeveStripes = (secs: Sec[]) => [-1, 1].map((s) => mergeGeometries(stripe(grow(secs, 1.14), s, 0.0, -0.2).map(plain))!);
  const upperStripes = sleeveStripes(UPPER_S);
  const foreStripes = sleeveStripes(FORE_S);
  const thighStripes = [-1, 1].map((s) => mergeGeometries(stripe(grow(THIGH_S, 1.1), s, -0.03, -0.3).map(plain))!);
  const shinStripes = [-1, 1].map(
    (s) =>
      mergeGeometries(
        stripe(
          [
            [0.012, 0.05, 0.054, 0],
            [-0.11, 0.052, 0.056, 0],
            [-0.2, 0.043, 0.046, 0],
          ],
          s,
          0.012,
          -0.2
        ).map(plain)
      )!
  );
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

  /* ----- Shoes (in the shin's space: the sole is on the ground at -0.33) ----- */
  const G = -(HIP_Y - THIGH);
  const sneaker = prof(
    [
      [-0.062, G + 0.012],
      [0.15, G + 0.012],
      [0.172, G + 0.03],
      [0.15, G + 0.052],
      [0.08, G + 0.068],
      [0.03, G + 0.098],
      [-0.03, G + 0.1],
      [-0.066, G + 0.06],
    ],
    0.088,
    0.014,
    L(6)
  );
  const sneakerSole = prof(
    [
      [-0.064, G],
      [0.146, G],
      [0.166, G + 0.012],
      [0.158, G + 0.022],
      [-0.066, G + 0.022],
    ],
    0.09,
    0.008,
    L(4)
  );
  const laces = q === 0 ? [] : [0.03, 0.06, 0.09].map((u) => new THREE.BoxGeometry(0.05, 0.005, 0.008).rotateX(0.5).translate(0, G + 0.098 - u * 0.33, 0.035 + u * 0.55));
  const swoop = [-1, 1].map((s) => new THREE.BoxGeometry(0.004, 0.012, 0.11).rotateX(-0.2).translate(s * 0.046, G + 0.05, 0.05));
  const dress = prof(
    [
      [-0.058, G + 0.01],
      [0.15, G + 0.01],
      [0.172, G + 0.03],
      [0.13, G + 0.058],
      [0.05, G + 0.075],
      [-0.035, G + 0.078],
      [-0.062, G + 0.045],
    ],
    0.078,
    0.012,
    L(6)
  );
  const dressSole = prof(
    [
      [-0.062, G],
      [0.152, G],
      [0.176, G + 0.012],
      [0.12, G + 0.013],
      [-0.064, G + 0.012],
    ],
    0.08,
    0.004,
    L(4)
  );
  const boot = prof(
    [
      [-0.064, G + 0.02],
      [0.15, G + 0.02],
      [0.168, G + 0.045],
      [0.11, G + 0.07],
      [0.055, G + 0.1],
      [0.05, G + 0.15],
      [-0.06, G + 0.15],
      [-0.068, G + 0.06],
    ],
    0.094,
    0.014,
    L(6)
  );
  const bootSole = prof(
    [
      [-0.07, G],
      [0.152, G],
      [0.168, G + 0.014],
      [0.16, G + 0.026],
      [-0.072, G + 0.026],
    ],
    0.098,
    0.006,
    L(4)
  );

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
  // The same assault rifle the player carries, held upright on parade
  const rifle = rifleGeometry()
    .rotateX(-Math.PI / 2)
    .translate(0, 0, 0.03);

  /* ----- The premium wardrobe (Drop 001, catalog.ts) ----- */
  /** The varsity's sleeves and ribbing stripe: a fixed cream, a shade under white */
  const CREAM = '#e4dcc4';
  /** A loft's cross-section at height y, between its sections */
  const secAt = (secs: Sec[], y: number): Sec => {
    const ss = sorted(secs);
    let i = 0;
    while (i < ss.length - 2 && y > ss[i + 1][0]) i++;
    const [y0, w0, d0, z0 = 0] = ss[i];
    const [y1, w1, d1, z1 = 0] = ss[i + 1];
    const f = THREE.MathUtils.clamp((y - y0) / (y1 - y0 || 1), 0, 1);
    return [y, w0 + (w1 - w0) * f, d0 + (d1 - d0) * f, z0 + (z1 - z0) * f];
  };
  /**
   * Quilting: a loft's sections from `from` up to `to`, `fat` times wider,
   * pinched in halfway between every `step`, so the stacked rounded sections
   * read as the ridges of a puffer
   */
  const quilt = (secs: Sec[], from: number, to: number, step: number, fat: number, pinch = 0.9): Sec[] => {
    const out: Sec[] = [];
    for (let y = from; y <= to + 1e-6; y += step) {
      const [, hw, hd, z = 0] = secAt(secs, y);
      out.push([y, hw * fat, hd * fat, z]);
      const y2 = y + step / 2;
      if (y2 < to - 1e-6) {
        const [, hw2, hd2, z2 = 0] = secAt(secs, y2);
        out.push([y2, hw2 * fat * pinch, hd2 * fat * pinch, z2]);
      }
    }
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
  const VARSITY = grow(SUIT, 1.02);
  const varsityFront = surface(VARSITY, SN);
  const varsityBody = loft(VARSITY, R(22), SN);
  const varsityHem = ribBand(-0.098, -0.046, 0.149, 0.099, 0, R(22), SN);
  const varsityCollar = ribBand(0.4, 0.446, 0.066, 0.06, -0.004, R(16));
  const varsityCuff = ribBand(-0.21, -0.176, 0.039, 0.041, 0.001, R(14));
  const placket = onBody(
    [
      [-0.011, -0.04],
      [0.011, -0.04],
      [0.011, 0.4],
      [-0.011, 0.4],
    ],
    0.003,
    varsityFront,
    0.001
  );
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
  const pufferBody = loft(
    [
      [-0.1, 0.168, 0.116, 0],
      ...quilt(HOODIE, -0.08, 0.36, 0.064, 1.18, 0.9),
      [0.392, 0.168, 0.1, 0],
      [0.415, 0.104, 0.088, -0.004],
      [0.425, 0.08, 0.072, -0.005],
    ],
    R(22),
    HN2
  );
  const pufferCollar = loft(
    [
      [0.395, 0.1, 0.094, -0.004],
      [0.43, 0.103, 0.097, -0.004],
      [0.462, 0.096, 0.09, -0.005],
      [0.48, 0.078, 0.074, -0.006],
      [0.486, 0.06, 0.058, -0.006],
    ],
    R(18),
    2.2
  );
  const PUFFER_S: Sec[] = [
    [-0.1, 0.168, 0.116, 0],
    ...quilt(HOODIE, -0.08, 0.36, 0.064, 1.18, 1),
    [0.392, 0.168, 0.1, 0],
  ];
  const pufferFront = surface(PUFFER_S, HN2);
  const pufferZip = [
    onBody(
      [
        [-0.005, -0.09],
        [0.005, -0.09],
        [0.005, 0.39],
        [-0.005, 0.39],
      ],
      0.004,
      pufferFront,
      0.002
    ),
    new THREE.BoxGeometry(0.018, 0.026, 0.008).translate(0, 0.36, pufferFront(0, 0.36) + 0.008),
  ];
  const pufferUpper = loft([[-0.24, 0.03, 0.032, 0], ...quilt(UPPER_S, -0.22, 0.0, 0.055, 1.4, 0.9), [0.036, 0.026, 0.028, 0]], R(14));
  const pufferFore = loft([[-0.2, 0.04, 0.042, 0], ...quilt(FORE_S, -0.19, 0.0, 0.055, 1.35, 0.9), [0.03, 0.026, 0.028, 0]], R(14));
  const pufferCuff = loft(
    [
      [-0.212, 0.038, 0.04, 0.001],
      [-0.182, 0.043, 0.045, 0.001],
    ],
    R(14)
  );

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
    { is: suit, front: suitFront, back: surface(SUIT, SN, -1), chest: [0.096, 0.296, 0.038, 0.017], sleeve: UPPER_S },
    { is: hoodie, front: hoodieFront, back: BACK, chest: [0.075, 0.28], sleeve: grow(UPPER_S, 1.14) },
    { is: track, front: trackFront, back: surface(TRACK, HN2, -1), chest: [0.075, 0.28], sleeve: grow(UPPER_S, 1.14) },
    // (the varsity's chest mark goes on its badge)
    { is: varsity, front: varsityFront, back: surface(VARSITY, SN, -1), chest: null, sleeve: grow(UPPER_S, 1.14) },
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
    {
      id: 'chain',
      when: (o) => !!o.chain,
      pieces: [P('head', chain, GOLD, { detail: true })],
    },
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
        P('torso', jacket, 'top'),
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
        P('torso', hoodieBody, 'top'),
        P('torso', one([hem, pouch]), 'top', { shade: 0.8 }),
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
        P('torso', one([trackBody, trackCollar]), 'top'),
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
        P('torso', one([fatigues, collarFat]), 'top'),
        P('torso', one([vest, ...pouches]), '#3a4422'),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...(hero ? fingers('#2b2a33') : both('wrist', one(hand), '#2b2a33')),
        P('pelvis', pelvis, 'bottom'),
        ...both('leg', cargoThigh, 'bottom'),
        ...both('leg', cargoPockets, 'bottom', { shade: 0.82, detail: true }),
        ...both('shin', cargoShin, 'bottom'),
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
        P('pelvis', pelvis, 'bottom'),
        ...both('leg', trouserThigh, 'bottom'),
        ...both('shin', trouserShin, 'bottom'),
        ...(crease ? both('shin', crease, 'bottom', { shade: 0.75, detail: true }) : []),
        ...both('shin', dress, 'shoes', SHOE),
        ...both('shin', dressSole, '#14121a', SHOE),
      ],
    },
    {
      id: 'joggers',
      when: casual,
      pieces: [
        P('pelvis', pelvis, 'bottom'),
        ...both('leg', joggerThigh, 'bottom'),
        ...both('shin', joggerShin, 'bottom'),
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
      id: 'rifleL',
      when: (o) => o.rifle === 'left',
      pieces: [P('handL', rifle, '#2b2a33')],
    },
    {
      id: 'rifleR',
      when: (o) => o.rifle === 'right',
      pieces: [P('handR', rifle, '#2b2a33')],
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
        P('torso', varsityBody, 'top'),
        P('torso', one([varsityHem.band, varsityCollar.band, placket]), 'top', { shade: 0.72 }),
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
        P('torso', one([pufferBody, pufferCollar]), 'top'),
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

const tmp = new THREE.Color();
/** A piece's colour on an outfit */
function colorOf(p: Piece, o: Outfit, out = new THREE.Color()) {
  if (p.color.startsWith('#')) return out.set(p.color);
  out.set(outfitColor(o, p.color as ColorKey));
  return p.shade ? out.multiplyScalar(p.shade) : out;
}
/** An outfit's colour for a key (the lenses are green as in the art when an outfit doesn't say) */
const outfitColor = (o: Outfit, k: ColorKey) => (o[k] as string | undefined) ?? (k === 'lens' ? '#22d07a' : k === 'ink' ? '#16c7b5' : '#ff00ff');

/* ---------- Materials ---------- */

let plainMat: THREE.Material | null = null;
let doubleMat: THREE.Material | null = null;
let neonMat: THREE.MeshBasicMaterial | null = null;
let logoMat: THREE.Material | null = null;
let atlas: THREE.Texture | null = null;
/**
 * The marks (marks.ts) in one atlas, white on clear, their dark parts and
 * outlines near black: the ink colours them per vertex, so one texture
 * prints every mark in every colourway.
 */
function logoAtlas() {
  const S = 128;
  return (atlas ??= liveTex(S * ATLAS_COLS, S * ATLAS_ROWS, (c) => {
    MARK_IDS.forEach((id, i) => {
      const art = MARK_ART[id];
      c.save();
      c.translate((i % ATLAS_COLS) * S + 12, Math.floor(i / ATLAS_COLS) * S + 12);
      c.scale((S - 24) / 100, (S - 24) / 100);
      c.lineJoin = c.lineCap = 'round';
      const DARK = '#2a2830';
      if (art.stroke) {
        const path = new Path2D(art.stroke);
        c.strokeStyle = DARK;
        c.lineWidth = (art.width ?? 8) + 8;
        c.stroke(path);
        c.strokeStyle = '#ffffff';
        c.lineWidth = art.width ?? 8;
        c.stroke(path);
      }
      if (art.fill) {
        const path = new Path2D(art.fill);
        c.fillStyle = '#ffffff';
        c.fill(path);
        c.strokeStyle = DARK;
        c.lineWidth = 6;
        c.stroke(path);
      }
      if (art.dark) {
        c.fillStyle = DARK;
        c.fill(new Path2D(art.dark));
      }
      if (art.line) {
        c.strokeStyle = DARK;
        c.lineWidth = 5;
        c.stroke(new Path2D(art.line));
      }
      c.restore();
    });
  }));
}
/** The all-over prints as tiling masks (white the cloth's colour, black its second tone) */
const printTex: Partial<Record<PatternId, THREE.Texture>> = {};
function printMask(id: PatternId) {
  if (printTex[id]) return printTex[id]!;
  const t = liveTex(64, 64, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#000000';
    if (id === 'stripes') c.fillRect(0, 32, 64, 32);
    else if (id === 'checks') {
      c.fillRect(0, 0, 32, 32);
      c.fillRect(32, 32, 32, 32);
    } else if (id === 'camo') {
      // Blobs in two tones, drawn round the edges too so it tiles
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (const tone of ['#7a7a7a', '#000000'])
        for (let k = 0; k < 7; k++) {
          const x = rnd() * 64;
          const y = rnd() * 64;
          const rx = 6 + rnd() * 9;
          const ry = 4 + rnd() * 6;
          const a = rnd() * Math.PI;
          c.fillStyle = tone;
          for (const dx of [-64, 0, 64])
            for (const dy of [-64, 0, 64]) {
              c.beginPath();
              c.ellipse(x + dx, y + dy, rx, ry, a, 0, Math.PI * 2);
              c.fill();
            }
        }
    }
  });
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (printTex[id] = t);
}
/**
 * The top's cloth with an all-over print: coloured per vertex like the rest,
 * the print laid on where the cloth is at rest (`rest`, `restNormal`) from
 * three sides at once, so it never smears however the body bends. Its
 * second tone is the cloth's colour darkened (or, on a near-black top,
 * lightened). The fade runs dark at the hem to the colour at the shoulders.
 */
const printMats: Partial<Record<PatternId, THREE.Material>> = {};
function patternMaterial(id: PatternId) {
  if (printMats[id]) return printMats[id]!;
  const m = new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true });
  const tile = id === 'camo' ? 0.16 : id === 'checks' ? 0.07 : 0.06;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.printMap = { value: printMask(id === 'fade' ? 'plain' : id) };
    sh.vertexShader = 'attribute vec3 rest;\nattribute vec3 restNormal;\nvarying vec3 vRest;\nvarying vec3 vRestN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = rest;\nvRestN = restNormal;');
    const body =
      id === 'fade'
        ? 'float printT = smoothstep(0.5, 1.02, vRest.y);'
        : `vec3 pw = pow(abs(normalize(vRestN)), vec3(4.0)); pw /= (pw.x + pw.y + pw.z);
      vec3 pp = vRest / ${tile.toFixed(3)};
      float printT = texture2D(printMap, pp.zy).r * pw.x + texture2D(printMap, pp.xz).r * pw.y + texture2D(printMap, pp.xy).r * pw.z;`;
    sh.fragmentShader =
      'uniform sampler2D printMap;\nvarying vec3 vRest;\nvarying vec3 vRestN;\n' +
      sh.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
      ${body}
      float printL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      vec3 printB = printL < 0.03 ? diffuseColor.rgb * 0.5 + vec3(0.11) : diffuseColor.rgb * 0.52;
      diffuseColor.rgb = mix(printB, diffuseColor.rgb, printT);`
      );
  };
  m.customProgramCacheKey = () => `print-${id}`;
  return (printMats[id] = m);
}
function textures() {
  texCache.patch ??= liveTex(128, 84, (c) => {
    c.fillStyle = '#dedce8';
    c.fillRect(0, 0, 128, 84);
    c.fillStyle = '#16c7b5';
    c.beginPath();
    c.moveTo(42, 22);
    c.lineTo(86, 22);
    c.lineTo(100, 36);
    c.lineTo(64, 72);
    c.lineTo(28, 36);
    c.closePath();
    c.fill();
    c.strokeStyle = '#0a5c56';
    c.lineWidth = 4;
    c.stroke();
    c.beginPath();
    c.moveTo(28, 36);
    c.lineTo(100, 36);
    c.moveTo(52, 22);
    c.lineTo(64, 72);
    c.lineTo(76, 22);
    c.stroke();
  });
  return texCache as Required<typeof texCache>;
}
/** The material for a piece: plain pieces are coloured per vertex (and per instance in a crowd) */
function material(m: Mat | undefined, o?: Outfit): THREE.Material {
  if (m === 'lens') {
    const c = new THREE.Color(o?.lens ?? '#22d07a');
    return lit(
      new THREE.MeshToonMaterial({
        color: c.clone().multiplyScalar(0.42),
        emissive: c,
      }),
      0.12,
      0.7
    );
  }
  if (m === 'patch') return new THREE.MeshToonMaterial({ map: textures().patch });
  // Every mark from one atlas, in the outfit's ink (per vertex); its cut-out edge from the alpha
  if (m === 'logo') return (logoMat ??= new THREE.MeshToonMaterial({ map: logoAtlas(), vertexColors: true, alphaTest: 0.5 }));
  if (m === 'double')
    return (doubleMat ??= toon('#ffffff', {
      side: THREE.DoubleSide,
      vertexColors: true,
    }));
  if (m === 'neon') {
    // One unlit glow for every neon piece, coloured per vertex: plain by day (under the bloom
    // threshold, so a halo never blooms out of control), brighter at night like the city's signs
    if (!neonMat) {
      neonMat = neon('#ffffff', 1, 1.8);
      neonMat.vertexColors = true;
    }
    return neonMat;
  }
  return (plainMat ??= toon('#ffffff', { vertexColors: true }));
}

/* ---------- One figure ---------- */

export interface Degen {
  g: THREE.Object3D;
  pose: Pose;
  /** Apply `pose` to the figure */
  update(): void;
  hands: [THREE.Object3D, THREE.Object3D];
  /** The torso frame on the chest, for things carried at the shoulder (the gun): `reachArm()`'s space */
  torso: THREE.Object3D;
  /** The bones, for the motion capture (animator.ts `applyTo()`, after `update()`) */
  rig: Skeleton;
  /** What he holds in his right hand, if anything (put away while he holds the rifle) */
  held?: THREE.Object3D;
  /** Free the figure's geometry and bones (when it's rebuilt or leaves) */
  dispose(): void;
}

/** Each hand's grip when the pose doesn't set one: relaxed, closed on what's held, or fists for fighting */
// (relaxed: the fingers curled a little, as a hand hangs, not held out straight)
const RELAXED = 0.3;
const HOLDING = 0.62;

/** A piece in the figure's own space, with each vertex's bones */
function skinPiece(p: Piece, rest: THREE.Matrix4, color: THREE.Color) {
  const g = plain(p.geo).applyMatrix4(rest);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const n = pos.count;
  const idx = new Uint16Array(n * 4);
  const wt = new Float32Array(n * 4);
  const col = new Float32Array(n * 3);
  const one: Influence | null = p.bone ? [[p.bone, 1]] : null;
  for (let i = 0; i < n; i++) {
    const inf = one ?? p.skin?.[i] ?? weigh(p.region ?? p.joint, pos.getX(i), pos.getY(i), pos.getZ(i));
    for (let k = 0; k < inf.length; k++) {
      idx[i * 4 + k] = BONE_INDEX[inf[k][0]];
      wt[i * 4 + k] = inf[k][1];
    }
    col[i * 3] = color.r;
    col[i * 3 + 1] = color.g;
    col[i * 3 + 2] = color.b;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/** The mark a logo piece prints for an outfit (null: none there) */
function markFor(of: LogoOf, o: Outfit): MarkId | null {
  if (of === 'top') return o.mark ?? null;
  if (of === 'hat') return o.hatMark ?? 'diamond';
  if (of === 'shoe') return o.shoeMark ?? null;
  return (o.markAt === 'chest' && o.mark) || 'diamond';
}
/** A copy of a mark's square with its uv pointed at the mark's cell in the logo atlas (a little in from the edges) */
function atlasUV(geo: THREE.BufferGeometry, id: MarkId) {
  const g = geo.clone();
  const i = Math.max(0, MARK_IDS.indexOf(id));
  const col = i % ATLAS_COLS;
  const row = Math.floor(i / ATLAS_COLS);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, (col + 0.03 + uv.getX(k) * 0.94) / ATLAS_COLS, 1 - (row + 1 - (0.03 + uv.getY(k) * 0.94)) / ATLAS_ROWS);
  return g;
}

/**
 * One figure: the skinned body (skeleton.ts) with everything it wears as
 * one mesh coloured per vertex, plus one each for the lenses, the cap
 * patch, the raised hood (both sides drawn) and any neon, so a figure is
 * about four draw calls whatever he wears. Things in the hand (a coffee, a
 * rifle) ride the hand bone unbent.
 */
export function createDegen(o: Outfit = PLAYER, q: Detail = 2): Degen {
  const sk = makeSkeleton();
  sk.root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(sk.list);
  const skinned = new Map<string, { mat?: Mat; list: THREE.BufferGeometry[] }>();
  const rigid = new Map<string, { joint: Joint; held: boolean; mat?: Mat; list: { geo: THREE.BufferGeometry; color: THREE.Color }[] }>();
  const print = o.pattern && o.pattern !== 'plain' ? o.pattern : null;
  for (const it of items(q, true)) {
    if (!it.when(o)) continue;
    for (const src of it.pieces) {
      let p = src;
      // A mark: pointed at its cell in the logo atlas (or left off when there's none)
      if (p.logo) {
        const id = markFor(p.logo, o);
        if (!id) continue;
        p = { ...p, geo: atlasUV(p.geo, id) };
      }
      const color = colorOf(p, o);
      // Held things and anything else on a hand without weights of its own stay solid on the hand
      if (it.held || ((p.joint === 'handL' || p.joint === 'handR') && !p.skin)) {
        const key = `${p.joint}|${it.held ? 1 : 0}|${p.mat ?? ''}`;
        if (!rigid.has(key)) rigid.set(key, { joint: p.joint, held: !!it.held, mat: p.mat, list: [] });
        rigid.get(key)!.list.push({ geo: p.geo, color });
        continue;
      }
      // The top's own cloth takes its all-over print, if it has one
      const mat: Mat | undefined = print && !p.mat && p.color === 'top' && !p.shade ? 'pattern' : p.mat;
      const key = mat ?? '';
      if (!skinned.has(key)) skinned.set(key, { mat, list: [] });
      const g = skinPiece(p, sk.j[p.joint].matrixWorld, color);
      if (p.logo) p.geo.dispose();
      // (the print is laid out on the cloth where it is at rest, so it moves with it)
      if (mat === 'pattern') {
        g.setAttribute('rest', g.attributes.position.clone());
        g.setAttribute('restNormal', g.attributes.normal.clone());
      }
      skinned.get(key)!.list.push(g);
    }
  }
  const bind = new THREE.Matrix4();
  for (const b of skinned.values()) {
    const geo = mergeGeometries(b.list)!;
    for (const g of b.list) g.dispose();
    const mesh = new THREE.SkinnedMesh(geo, b.mat === 'pattern' ? patternMaterial(print!) : material(b.mat, o));
    mesh.castShadow = true;
    // Its bounds move with the bones: never culled (a figure is small)
    mesh.frustumCulled = false;
    sk.root.add(mesh);
    mesh.bind(skeleton, bind);
  }
  let held: THREE.Group | undefined;
  for (const b of rigid.values()) {
    const mesh = new THREE.Mesh(paintMerge(b.list), material(b.mat, o));
    mesh.castShadow = true;
    if (b.held) {
      if (!held) sk.j[b.joint].add((held = new THREE.Group()));
      held.add(mesh);
    } else sk.j[b.joint].add(mesh);
  }
  const pose = newPose();
  const base = o.fists ? 1 : RELAXED;
  const grip: [number, number] = [base, base];
  const update = () => {
    if (pose.grip) {
      grip[0] = pose.grip[0];
      grip[1] = pose.grip[1];
      pose.grip = undefined;
    } else {
      grip[0] = base;
      grip[1] = held?.visible ? Math.max(base, HOLDING) : base;
    }
    poseSkeleton(sk, pose, grip);
  };
  update();
  // (it moves: the moving shadow map's, shadows.ts)
  moving(sk.root);
  return {
    g: sk.root,
    pose,
    update,
    hands: [sk.bones.handL, sk.bones.handR],
    torso: sk.torso,
    rig: sk,
    held,
    dispose() {
      sk.root.traverse((m) => (m as THREE.Mesh).geometry?.dispose());
      skeleton.dispose();
    },
  };
}

/* ---------- A crowd ---------- */

export interface Crowd {
  /**
   * Figure `i` standing at (x, y, z) facing `yaw` (0 = +z), `u` (0..1) of
   * the way through one of the baked clips (crowdclips.ts): `crowdFrame()`
   * picks the rows, the GPU does the rest
   */
  set(i: number, x: number, y: number, z: number, yaw: number, scale: number, clip: CrowdClip, u: number): void;
  /** Call once a frame after setting everyone */
  commit(): void;
  meshes: THREE.InstancedMesh[];
}

/**
 * Where the camera is and what it sees, for every crowd: the city sets it
 * each frame (`view()` in index.ts). Until it's set, everyone is near.
 */
export const CROWD_VIEW = {
  eye: new THREE.Vector3(),
  frustum: new THREE.Frustum(),
  on: false,
  /** The sun's shadow box this frame (`shadowOn` while shadows are drawn): moving things outside it stay out of the shadow map */
  shadow: new THREE.Frustum(),
  shadowOn: false,
  /** Where on the ground the camera is looking, about (the traffic and the boats stay round it: life.ts) */
  focus: new THREE.Vector3(),
};
/** People nearer the camera than this get the crowd's detail, the rest the far one (and past `CROWD_FAR` nobody is drawn) */
const CROWD_NEAR = 12;
const CROWD_NEAR_LIGHT = 8;
const CROWD_FAR = 170;

/** Each crowd part's skinned geometry at rest, shared between crowds (each mesh adds its own per-person rows) */
const crowdBase = new Map<string, THREE.BufferGeometry>();
/** The crowd's version of each material (skinned on the GPU) */
const crowdMats = new Map<string, THREE.Material>();
function crowdMaterial(m: Mat | undefined) {
  const key = m ?? '';
  let c = crowdMats.get(key);
  if (!c) {
    c = crowdVersion(material(m), key);
    // (the lenses and neon follow the time of day like everyone's)
    if (m === 'lens') lit(c, 0.12, 0.7);
    if (m === 'neon') lit(c, 1, 1.8);
    crowdMats.set(key, c);
  }
  return c;
}
/** The bone a rig frame hangs from (things held in a hand ride that hand's bone, unbent) */
function boneOf(o: THREE.Object3D | null): BoneName {
  while (o && !(o as THREE.Bone).isBone) o = o.parent;
  return (o?.name ?? 'hips') as BoneName;
}
/**
 * One crowd part (an item's pieces of one colour and material) skinned at
 * rest, its bones and weights renamed for the crowd's shader, coloured per
 * vertex (a fixed colour, or the shade a person's own colour is multiplied by)
 */
function crowdGeometry(list: Piece[], held: boolean, sk: Skeleton) {
  const fixed = list[0].color.startsWith('#');
  const parts = list.map((src) => {
    let p = src;
    if (p.logo) p = { ...p, geo: atlasUV(p.geo, 'diamond') };
    if (held || ((p.joint === 'handL' || p.joint === 'handR') && !p.skin)) p = { ...p, bone: boneOf(sk.j[p.joint]) };
    const g = skinPiece(p, sk.j[p.joint].matrixWorld, fixed ? new THREE.Color(p.color) : new THREE.Color().setScalar(p.shade ?? 1));
    if (src.logo) p.geo.dispose();
    const idx = g.attributes.skinIndex as THREE.BufferAttribute;
    g.setAttribute('crowdIdx', new THREE.Float32BufferAttribute(Float32Array.from(idx.array as Uint16Array), 4));
    g.setAttribute('crowdWt', g.attributes.skinWeight);
    g.setAttribute('crowdOn', new THREE.Float32BufferAttribute(new Float32Array(idx.count).fill(1), 1));
    g.deleteAttribute('skinIndex');
    g.deleteAttribute('skinWeight');
    return g;
  });
  const geo = mergeGeometries(parts)!;
  for (const g of parts) g.dispose();
  return geo;
}

interface Part {
  mesh: THREE.InstancedMesh;
  /** Each person's rows and blend, and their row in the wardrobe */
  anim: THREE.InstancedBufferAttribute;
  /**
   * Instances used so far this frame: from the front for people in the sun's shadow box (`n`), from the
   * back for the rest (`back`, moved up behind them at commit), so the shadow map draws only the front ones
   */
  n: number;
  back: number;
  cap: number;
  /** How many the camera's passes draw, and the shadow map */
  view: number;
  shadow: number;
}

/** Each item's column in the wardrobe (its texel's alpha: whether a person wears it), the same for every crowd */
const itemCols = new Map<string, number>();
function itemCol(id: string) {
  let c = itemCols.get(id);
  if (c === undefined) {
    c = itemCols.size;
    if (c >= WARDROBE_W) throw new Error('crowd wardrobe: more items than columns');
    itemCols.set(id, c);
  }
  return c;
}

/**
 * Many figures, each the skinned body (the new head, hands and shoes) at a
 * crowd's detail, drawn instanced and skinned on the GPU from the baked
 * clips (crowdclips.ts, crowdskin.ts), at two levels: near the camera the
 * crowd's own (`Detail` 1, without the small details on phones), further
 * away the far one (0). At each level everyone of one outfit kind (suits,
 * hoodies, soldiers...) shares one mesh per material: every item anyone of
 * that kind wears, each vertex knowing its item and the colour it takes;
 * a person's row in the wardrobe (crowdskin.ts) says what they wear and
 * their colours, and the rest folds away. So a crowd costs a draw call per
 * kind and material (a handful), each person one instance per mesh, and
 * the CPU only works out where each person is and which frame they're on.
 */
export function createCrowd(parent: THREE.Object3D, outfits: Outfit[], opts: { light?: boolean } = {}): Crowd {
  crowdTexture();
  const sk = makeSkeleton();
  sk.root.updateMatrixWorld(true);
  const near = opts.light ? CROWD_NEAR_LIGHT : CROWD_NEAR;
  const meshes: THREE.InstancedMesh[] = [];
  // Everyone's row: their colours, then which items they wear
  const rowOf = addWardrobe(
    outfits.map((o) => {
      const row = new Float32Array(WARDROBE_W * 4);
      COLOR_KEYS.forEach((k, c) => {
        tmp.set(outfitColor(o, k));
        row[c * 4] = tmp.r;
        row[c * 4 + 1] = tmp.g;
        row[c * 4 + 2] = tmp.b;
      });
      for (const q of [1, 0] as Detail[]) for (const it of items(q, true)) if (it.when(o)) row[itemCol(it.id) * 4 + 3] = 1;
      return row;
    })
  );
  const kinds = [...new Set(outfits.map((o) => o.kind))];
  const levels = ([1, 0] as Detail[]).map((q) => {
    const details = q === 1 && !opts.light;
    const parts: Part[] = [];
    const wear: Part[][] = outfits.map(() => []);
    for (const kind of kinds) {
      const who = outfits.flatMap((o, i) => (o.kind === kind ? [i] : []));
      // This kind's pieces by material: each item's pieces of one colour, with the colour they take and their item
      const byMat = new Map<string, { geos: THREE.BufferGeometry[]; wearers: Set<number> }>();
      for (const it of items(q, true)) {
        const wearers = who.filter((i) => it.when(outfits[i]));
        if (!wearers.length) continue;
        const sub = new Map<string, Piece[]>();
        for (const p of it.pieces) {
          if (!details && p.detail) continue;
          const k = `${p.color.startsWith('#') ? '#' : p.color}|${p.mat ?? ''}`;
          if (!sub.has(k)) sub.set(k, []);
          sub.get(k)!.push(p);
        }
        for (const [k, list] of sub) {
          const id = `${q}|${details}|${it.id}|${k}`;
          let base = crowdBase.get(id);
          if (!base) crowdBase.set(id, (base = crowdGeometry(list, !!it.held, sk)));
          const [key, mat] = k.split('|');
          const geo = new THREE.BufferGeometry();
          for (const [name, attr] of Object.entries(base.attributes)) geo.setAttribute(name, attr);
          // (the lenses keep their material's own colour, as fixed colours keep theirs)
          const colour = key === '#' || mat === 'lens' ? -1 : COLOR_KEYS.indexOf(key as ColorKey);
          const slot = new Float32Array(base.attributes.position.count * 2);
          for (let v = 0; v < slot.length; v += 2) {
            slot[v] = colour;
            slot[v + 1] = itemCol(it.id);
          }
          geo.setAttribute('crowdSlot', new THREE.Float32BufferAttribute(slot, 2));
          if (!byMat.has(mat)) byMat.set(mat, { geos: [], wearers: new Set() });
          const m = byMat.get(mat)!;
          m.geos.push(geo);
          wearers.forEach((i) => m.wearers.add(i));
        }
      }
      for (const [mat, { geos, wearers }] of byMat) {
        const geo = mergeGeometries(geos)!;
        for (const g of geos) g.dispose();
        const cap = wearers.size;
        const anim = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
        anim.setUsage(THREE.DynamicDrawUsage);
        geo.setAttribute('crowdAnim', anim);
        const m = new THREE.InstancedMesh(geo, crowdMaterial((mat || undefined) as Mat | undefined), cap);
        m.customDepthMaterial = crowdDepth();
        m.castShadow = true;
        m.frustumCulled = false;
        m.count = 0;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        parent.add(m);
        meshes.push(m);
        const part: Part = { mesh: m, anim, n: 0, back: 0, cap, view: 0, shadow: 0 };
        // The shadow map draws only the people in the sun's shadow box (the front ones), the camera everyone in view
        m.onBeforeShadow = () => void (m.count = part.shadow);
        m.onBeforeRender = () => void (m.count = part.view);
        parts.push(part);
        for (const i of wearers) wear[i].push(part);
      }
    }
    return { parts, wear };
  });
  const at = new THREE.Vector3();
  const ball = new THREE.Sphere(at, 0);
  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const frame: [number, number, number] = [0, 0, 0];
  return {
    meshes,
    set(i, x, y, z, yaw, scale, clip, u) {
      const o = outfits[i];
      // Which level, if any: out of view or very far, nothing is drawn
      let level = levels[0];
      let shadow = true;
      if (CROWD_VIEW.on) {
        at.set(x, y + 0.6 * scale, z).applyMatrix4(parent.matrixWorld);
        ball.radius = 1.6 * scale;
        const d = at.distanceTo(CROWD_VIEW.eye);
        if (d > CROWD_FAR || !CROWD_VIEW.frustum.intersectsSphere(ball)) return;
        if (d > near) level = levels[1];
        // Out of the sun's shadow box, they cast nothing it can see
        shadow = !CROWD_VIEW.shadowOn || CROWD_VIEW.shadow.intersectsSphere(ball);
      }
      m4.compose(pos.set(x, y, z), quat.setFromAxisAngle(UP, yaw), scl.set(scale * (o.build ?? 1), scale * (o.height ?? 1), scale * (o.build ?? 1)));
      crowdFrame(clip, u, frame);
      for (const g of level.wear[i]) {
        const k = shadow ? g.n++ : g.cap - 1 - g.back++;
        g.mesh.setMatrixAt(k, m4);
        g.anim.setXYZW(k, frame[0], frame[1], frame[2], rowOf + i);
      }
    },
    commit() {
      for (const l of levels)
        for (const g of l.parts) {
          const m = g.mesh;
          // The ones out of the shadow box, from the back up behind the rest (where the two ends meet, some already are)
          const gap = Math.min(g.n + g.back, g.cap - g.back);
          const from = Math.max(g.cap - g.back, g.n + g.back);
          for (let j = 0; j < gap - g.n; j++) moveInstance(g, from + j, g.n + j);
          g.shadow = g.n;
          g.view = m.count = g.n + g.back;
          m.visible = m.count > 0;
          m.instanceMatrix.needsUpdate = true;
          g.anim.needsUpdate = true;
          g.n = g.back = 0;
        }
    },
  };
}

/** One crowd instance from slot `from` to slot `to` (its matrix, and its rows and wardrobe row) */
function moveInstance(g: Part, from: number, to: number) {
  if (from === to) return;
  g.mesh.instanceMatrix.array.copyWithin(to * 16, from * 16, from * 16 + 16);
  g.anim.array.copyWithin(to * 4, from * 4, from * 4 + 4);
}

/* ---------- A varied city crowd ---------- */

/** Suits and hoodies in a spread of colours, some with bags or headphones. */
export function cityOutfit(r: () => number): Outfit {
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const extras = {
    backpack: r() < 0.2 ? pick(['#14121f', '#2a2350', '#d8312f', '#1f9d6a', '#f3f2f7']) : undefined,
    crossbody: r() < 0.15 ? pick(['#14121f', '#8f3dff', '#c99a4a']) : undefined,
    headphones: r() < 0.22 ? pick(['#14121f', '#f3f2f7', '#ff6ad5', '#00b8d8']) : undefined,
    build: 0.92 + r() * 0.2,
    height: 0.95 + r() * 0.1,
  };
  if (r() < 0.55) {
    const top = pick(['#16141f', '#16141f', '#16141f', '#1d2550', '#3b2a6a', '#f3f2f7', '#4a4a5a']);
    return {
      kind: 'suit',
      top,
      bottom: top === '#f3f2f7' && r() < 0.5 ? '#16141f' : top,
      shoes: pick(['#1b1830', '#3a2418', '#16141f']),
      tie: pick(['#1f9d55', '#1f9d55', '#e219e5', '#00b8d8', '#d8312f', '#c99a4a']),
      cap: r() < 0.85 ? pick(['#d8312f', '#d8312f', '#d8312f', '#16141f', '#f3f2f7']) : undefined,
      chain: r() < 0.3,
      ...extras,
      backpack: undefined,
    };
  }
  const hood = r() < 0.4;
  return {
    kind: 'hoodie',
    top: pick(['#16141f', '#2a2350', '#e219e5', '#00a8d8', '#f3f2f7', '#ff6a3d', '#1f9d6a', '#8f3dff']),
    bottom: pick(['#3a3a48', '#16141f', '#4a4a5a']),
    shoes: pick(['#f3f2f7', '#f3f2f7', '#16141f', '#ff6ad5', '#00b8d8']),
    hood,
    cap: hood ? undefined : r() < 0.7 ? pick(['#d8312f', '#16141f', '#f3f2f7', '#d8312f']) : undefined,
    ...extras,
  };
}
