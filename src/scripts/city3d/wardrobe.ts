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
import { bottomsFor, coversEyes, shoesFor, type Bottoms, type CharacterId, type EyeStyle, type FaceGear, type HeadShape, type Look, type MarkId, type MarkSlot, type PatternId, type ShoeStyle } from '../net/profile-data';
import { EYE_Y as HERO_EYE_Y, HEAD_TOP as HERO_HEAD_TOP, handParts, headFront, headGeometry, headRow, inHead } from './body';
import type { HeadPart } from './heads';
import { HEAD_Y, HIP_Y, LEG_X, THIGH, WRIST_Y, WRIST_Z, weigh, type BoneName, type Influence, type Joint, type Region } from './skeleton';

/* ---------- Outfits ---------- */

export type OutfitKind = 'suit' | 'hoodie' | 'track' | 'varsity' | 'puffer' | 'bomber' | 'coach' | 'vest' | 'tee' | 'shell' | 'trucker' | 'hivis' | 'hivisjacket' | 'chore' | 'coveralls' | 'blazer' | 'shirt' | 'double' | 'waistcoat' | 'overcoat' | 'soldier';
/** The unmasked hair's styles (docs/faces-plan.md); bald is no `hair` */
export type HairCut = 'buzz' | 'crop' | 'curls' | 'bun' | 'twists' | 'hightop' | 'long';
export const HAIR_CUTS: readonly HairCut[] = ['buzz', 'crop', 'curls', 'bun', 'twists', 'hightop', 'long'];
/**
 * The head's proportions (docs/faces-plan.md Phase 3): a stretch across, up and front to back about the head bone,
 * hats, hair, the face's ink and the shades with it (`shapeHead()`)
 */
export const HEAD_SCALE: Record<HeadShape, [x: number, y: number, z: number]> = {
  standard: [1, 1, 1],
  round: [1.07, 0.95, 1.04],
  long: [0.95, 1.09, 0.98],
  wide: [1.11, 1, 1.03],
  narrow: [0.91, 1.03, 0.97],
  big: [1.1, 1.1, 1.1],
};
/**
 * A point at rest (the rig's space) stretched with the head: `w` its weight on the head bone, `pivot` the head
 * bone's own point at rest. The crowd's shader does the same (crowdskin.ts); a figure's mesh has it done once.
 */
export function shapeHead(p: [number, number, number], w: number, pivot: [number, number, number], s: readonly [number, number, number]): [number, number, number] {
  return [0, 1, 2].map((k) => pivot[k] + (p[k] - pivot[k]) * (1 + (s[k] - 1) * w)) as [number, number, number];
}
export interface Outfit {
  kind: OutfitKind;
  /** Jacket, hoodie, track jacket, varsity, puffer, bomber, coach or trucker jacket, puffer vest, tee, shell, hi-vis vest or
   * jacket, chore coat, coveralls, blazer, shirt, double-breasted suit, waistcoat, overcoat, or fatigues */
  top: string;
  /** The bottoms' colour, and which (left out: what the top comes with, `bottomsOf()`) */
  bottom: string;
  bottoms?: Bottoms;
  /** The shoes' colour, and which (left out: what the top comes with, `shoesOf()`) */
  shoes: string;
  shoeStyle?: ShoeStyle;
  tie?: string;
  /** The suit's shirt, or the long-sleeve under the puffer vest (left out: the shirt white, `SHIRT`) */
  shirt?: string;
  /** Cap colour; leave out for no cap */
  cap?: string;
  /** The cap worn backwards */
  capBack?: boolean;
  /** The cap a fitted one, its brim flat (docs/wardrobe-plan.md Phase 5) */
  capFlat?: boolean;
  /** A hard hat's colour (docs/wardrobe-plan.md Phase 6) */
  hardhat?: string;
  /** Beanie or bucket hat colour (instead of a cap); the beanie a skully (close, no cuff, no pompom) */
  beanie?: string;
  skully?: boolean;
  bucket?: string;
  /** A kart driver's helmet colour (docs/kart-west-plan.md Phase 6: the kart park's races; no hat with it) */
  helmet?: string;
  /** Colour of the shades' lenses (green as in the art) */
  lens?: string;
  /** The shades' style and their frames' colour (left out: the classic, in black: docs/wardrobe-plan.md Phase 4) */
  eyewear?: EyeStyle;
  frame?: string;
  /** Face gear and its colour (single figures: the crowd wears none; docs/wardrobe-plan.md Phase 4) */
  faceGear?: FaceGear;
  gear?: string;
  /**
   * Unmasked (docs/faces-plan.md): no balaclava and no shades, the head in the skin tone with the face's ink laid on
   * it, and the hair (`hair`, `cut`) unless a hat or the hood covers it
   */
  face?: boolean;
  /** The skin tone: the hands, the eye opening, and the head when unmasked (the art's tone if not said) */
  skin?: string;
  /** The hair's colour, unmasked; leave out for bald */
  hair?: string;
  /** The hair's style (a crop if not said) */
  cut?: HairCut;
  /** The shades on an unmasked face (the balaclava always wears them) */
  shades?: boolean;
  /** The head's proportions, unmasked (the standard if not said) */
  headShape?: HeadShape;
  /**
   * A character's head instead of Degen's (docs/characters-plan.md; single figures only): nothing is worn over it, so
   * his head, face, hair, hats, eyewear, face gear, the shades' chain and the hood up are left off while it's on
   */
  character?: CharacterId;
  /** Hoodie with the hood up (no cap) */
  hood?: boolean;
  backpack?: string;
  crossbody?: string;
  /** Skate deck on the back */
  board?: string;
  /** Duffel bag slung across the back */
  duffel?: string;
  /** A sling bag on the back, a chest rig, a waist bag across the chest (docs/wardrobe-plan.md Phase 5) */
  sling?: string;
  chestrig?: string;
  waist?: string;
  headphones?: string;
  /** Gold chain on the shades */
  chain?: boolean;
  /** Gold chain with a diamond round the neck */
  necklace?: boolean;
  /** Gold watch on the left wrist */
  watch?: boolean;
  /** In the right hand, the crowd's only: a phone (people reading theirs) or a shopping bag (the shoppers on
   * Crestmont's Drive). Never the player's: his hands hold only weapons (docs/wardrobe-plan.md Phase 1) */
  held?: 'phone' | 'shopping';
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

/*
 * A detail's shade on its cloth (docs/wardrobe-plan.md Phase 5, the dark-outfit fix): a piece drawn a shade off its
 * outfit colour (ribbing, a pocket, a seam, a lapel) multiplies it, as before; but on near-black cloth multiplying
 * leaves it near-black, so the detail is lost in a black silhouette. There a darker shade lifts it toward grey
 * instead, and a lighter one lifts it a little more, so a black fit still shows its seams and shape. Worked in the
 * colour as seen (sRGB, 0..1); mid and light colours are untouched. `SHADE_GLSL` is the crowd's shader's copy.
 */
export const DARK = { at: 0.115, under: 0.32, over: 0.12 };
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
/**
 * A colour as seen (sRGB) with a detail's shade: as it always was (the colour's light times the shade), or on
 * near-black cloth (seen brightness under `DARK.at`) lifted. A switch, not a blend: blended, the lift and the
 * darkening cancel somewhere in between and a detail there matches its cloth.
 */
export function shadeRGB(r: number, g: number, b: number, s: number): [number, number, number] {
  const dark = 0.2126 * r + 0.7152 * g + 0.0722 * b < DARK.at;
  const one = (c: number) => {
    const plain = toSrgb(toLin(c) * s);
    return Math.min(1, !dark ? plain : s < 1 ? c + (1 - s) * DARK.under : plain + (s - 1) * DARK.over);
  };
  return [one(r), one(g), one(b)];
}
/** The crowd's shader's copy: its tint arrives in linear light, and the plain case stays the linear multiply it was */
export const SHADE_GLSL = `vec3 crowdShade(vec3 lin, float s) {
  vec3 plain = lin * s;
  vec3 c = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));
  if (dot(c, vec3(0.2126, 0.7152, 0.0722)) >= ${DARK.at.toFixed(3)}) return plain;
  vec3 dark = s < 1.0 ? c + (1.0 - s) * ${DARK.under.toFixed(3)} : pow(plain, vec3(1.0 / 2.2)) + (s - 1.0) * ${DARK.over.toFixed(3)};
  return pow(min(dark, vec3(1.0)), vec3(2.2));
}`;

/** What an outfit wears on its legs: its own, or what its top comes with (the crowd's); soldiers wear their fatigues, and
 * coveralls their own legs */
export const bottomsOf = (o: Outfit): Bottoms | null => (o.kind === 'soldier' || o.kind === 'coveralls' ? null : (o.bottoms ?? bottomsFor(o.kind)));
/** What an outfit wears on its feet: its own, or what its top comes with; soldiers wear their boots */
export const shoesOf = (o: Outfit): ShoeStyle | null => (o.kind === 'soldier' ? null : (o.shoeStyle ?? shoesFor(o.kind)));

/** The shades an outfit wears: its own style, or the classic */
export const eyesOf = (o: Outfit): EyeStyle | null => (coversEyes(o.faceGear) || (o.face && !o.shades) ? null : (o.eyewear ?? 'classic'));

/** A player's wardrobe choices as a Degen outfit */
export function lookOutfit(l: Look): Outfit {
  const hat = l.kind === 'hoodie' && l.hood ? null : l.hat;
  const bag = (k: Look['bag']) => (l.bag === k ? l.bagColor : undefined);
  return {
    kind: l.kind,
    top: l.top,
    bottom: l.bottom,
    bottoms: l.bottoms,
    shoes: l.shoes,
    shoeStyle: l.shoeStyle,
    tie: l.kind === 'suit' || l.kind === 'double' || l.kind === 'waistcoat' || l.kind === 'overcoat' ? l.tie : undefined,
    shirt: l.shirt,
    cap: hat === 'cap' || hat === 'backcap' || hat === 'fitted' ? l.hatColor : undefined,
    capBack: hat === 'backcap',
    capFlat: hat === 'fitted',
    beanie: hat === 'beanie' || hat === 'skully' ? l.hatColor : undefined,
    skully: hat === 'skully',
    hardhat: hat === 'hardhat' ? l.hatColor : undefined,
    bucket: hat === 'bucket' ? l.hatColor : undefined,
    hood: l.kind === 'hoodie' && l.hood,
    lens: l.lens,
    eyewear: l.eyewear,
    frame: l.frame,
    faceGear: l.faceGear ?? undefined,
    gear: l.gear,
    headphones: l.headphones ?? undefined,
    backpack: bag('backpack'),
    crossbody: bag('crossbody'),
    board: bag('board'),
    duffel: bag('duffel'),
    sling: bag('sling'),
    chestrig: bag('chestrig'),
    waist: bag('waist'),
    chain: l.chain,
    necklace: l.necklace,
    watch: l.watch,
    mark: l.mark ?? undefined,
    markAt: l.markAt,
    ink: l.ink,
    hatMark: l.hatMark,
    shoeMark: l.shoeMark ?? undefined,
    pattern: l.pattern,
    face: l.face || undefined,
    skin: l.tone,
    // (a character's head has hair of its own: SlimeWhale's buzz, in the look's hair colour)
    hair: l.character || (l.face && l.cut !== 'bald') ? l.hair : undefined,
    cut: l.cut === 'bald' ? undefined : l.cut,
    shades: l.face && l.shades ? true : undefined,
    headShape: l.face && l.shape !== 'standard' ? l.shape : undefined,
    character: l.character ?? undefined,
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
// (`open`: its ends left open, for a band that lies on a body whose ends would only be hidden inside it)
/** A loft's sides only, its ends left open (for a lid of its own that shades flat) */
function openLoft(secs: Sec[], seg: number, n: number) {
  const g = loft(secs, seg, n);
  g.setIndex(Array.from(g.index!.array).slice(0, (secs.length - 1) * seg * 6));
  g.computeVertexNormals();
  return g;
}
function loft(secs: Sec[], seg: number, n = 2, open = false) {
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
  if (!open)
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
const mirror = (pts: [number, number][]) => pts.map(([x, y]) => [-x, y] as [number, number]).reverse();
/** Wider or narrower everywhere, for looser clothes on the same body */
const grow = (secs: Sec[], k: number, dz = 0): Sec[] => secs.map(([y, hw, hd, z = 0]) => [y, hw * k, hd * k, z + dz]);
/** A loft's cross-section at height y, between its sections */
function secAt(secs: Sec[], y: number): Sec {
  return secAtSorted(sorted(secs), y);
}
/** `secAt()` for sections already sorted up y (asked many times over one shape: no sort each time) */
function secAtSorted(ss: Sec[], y: number): Sec {
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

export type ColorKey = 'top' | 'bottom' | 'shoes' | 'tie' | 'shirt' | 'frame' | 'gear' | 'cap' | 'beanie' | 'bucket' | 'hardhat' | 'backpack' | 'crossbody' | 'board' | 'duffel' | 'sling' | 'chestrig' | 'waist' | 'headphones' | 'lens' | 'ink' | 'helmet' | 'skin' | 'head' | 'hair';
/** Every outfit colour a piece can take (the crowd works each figure's out once) */
export const COLOR_KEYS: ColorKey[] = ['top', 'bottom', 'shoes', 'tie', 'shirt', 'frame', 'gear', 'cap', 'beanie', 'bucket', 'hardhat', 'backpack', 'crossbody', 'board', 'duffel', 'sling', 'chestrig', 'waist', 'headphones', 'lens', 'ink', 'helmet', 'skin', 'head', 'hair'];
/**
 * Pieces with a material of their own: the shades' lenses, the cap patch,
 * the raised hood (both sides drawn), neon (a crowd phone's screen: unlit,
 * coloured per vertex, brighter at night through `neon()`), and on single figures the
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
export type Shell = 'top' | 'bottom' | 'shoe';
export interface Item {
  id: string;
  when: (o: Outfit) => boolean;
  pieces: Piece[];
  /** Carried in the right hand (put away while Degen holds a gun) */
  held?: boolean;
}

/** The art's skin tone: the hands and the eye opening when an outfit doesn't say (docs/faces-plan.md) */
export const SKIN = '#e8c39e';
/** The balaclava's black, and the ink of the face */
export const BLACK = '#16141f';
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
  /** A shoe's upper: the bottoms' legs held clear of it (docs/wardrobe-plan.md Phase 2) */
  const UPPER: Partial<Piece> = { ...SHOE, shell: 'shoe' };
  /** A hat's patch: the diamond printed on it (the crowd's), or on single figures a cream patch with the hat's mark */
  const hatPatch = (patch: THREE.BufferGeometry, logo: THREE.BufferGeometry): Piece[] =>
    hero ? [P('head', patch, PATCH), P('head', logo, 'ink', { mat: 'logo', logo: 'hat' })] : [P('head', patch, '#ffffff', { mat: 'patch', detail: true })];
  /** The skinned body's hands, fingers and all, each vertex weighted to its bones */
  // (far off, a crowd person's hands are the simple block: fingers are wasted at a few pixels)
  const fingers = (color: string): Piece[] =>
    far ? both('wrist', one(hand), color) : ([-1, 1] as const).flatMap((s) => handParts(s, R(9)).map(({ geo, skin }) => P(s < 0 ? 'handL' : 'handR', geo, color, { skin })));

  /** A character's own pendant on the necklace in the diamond's place (single figures, once the heads' chunk is in) */
  const pendantOf = (o: Outfit) => q >= 2 && !!(o.character && heads?.pendant(o.character, q as 2 | 3));
  /** Gloves on (a character's: docs/characters-plan.md) */
  const glovesOf = (o: Outfit) => !!(o.character && heads?.gloves(o.character));
  /** A glove's rolled cuff round each wrist, weighted as the wrist is (the hand, and the forearm towards the sleeve) */
  const cuffs = (color: string): Piece[] =>
    ([-1, 1] as const).map((s) => {
      const S = s < 0 ? 'L' : 'R';
      const geo = new THREE.TorusGeometry(0.029, 0.0085, R(6), R(14)).rotateX(Math.PI / 2).translate(0, 0.047, -0.002).toNonIndexed();
      const p = geo.attributes.position as THREE.BufferAttribute;
      const skin: Influence[] = [];
      for (let i = 0; i < p.count; i++) {
        const f = 0.5 * THREE.MathUtils.smoothstep(p.getY(i), 0.035, 0.065);
        skin.push(f > 1e-4 ? [[`hand${S}` as BoneName, 1 - f], [`fore${S}` as BoneName, f]] : [[`hand${S}` as BoneName, 1]]);
      }
      return P(s < 0 ? 'handL' : 'handR', geo, color, { skin });
    });
  /** A cartoon glove's three stitch lines down the back of each hand, towards the knuckles (the palm is the hand's -x side on the +x hand) */
  const stitchLines = (): Piece[] =>
    ([-1, 1] as const).map((s) => {
      const S = s < 0 ? 'L' : 'R';
      const merged = one([-0.014, 0, 0.014].map((z) => new THREE.BoxGeometry(0.0014, 0.026, 0.0026).translate(s * 0.0165, 0.013, z)));
      const geo = merged.index ? merged.toNonIndexed() : merged;
      const skin: Influence[] = Array.from({ length: geo.attributes.position.count }, () => [[`hand${S}` as BoneName, 1]]);
      return P(s < 0 ? 'handL' : 'handR', geo, BLACK, { skin, detail: true });
    });
  const suit = (o: Outfit) => o.kind === 'suit';
  const hoodie = (o: Outfit) => o.kind === 'hoodie';
  const track = (o: Outfit) => o.kind === 'track';
  const soldier = (o: Outfit) => o.kind === 'soldier';
  const varsity = (o: Outfit) => o.kind === 'varsity';
  const bomber = (o: Outfit) => o.kind === 'bomber';
  const puffer = (o: Outfit) => o.kind === 'puffer';
  const coach = (o: Outfit) => o.kind === 'coach';
  const gilet = (o: Outfit) => o.kind === 'vest';
  const tee = (o: Outfit) => o.kind === 'tee';
  const shell = (o: Outfit) => o.kind === 'shell';
  const hivis = (o: Outfit) => o.kind === 'hivis';
  const hivisJacket = (o: Outfit) => o.kind === 'hivisjacket';
  const chore = (o: Outfit) => o.kind === 'chore';
  const coveralls = (o: Outfit) => o.kind === 'coveralls';
  const blazer = (o: Outfit) => o.kind === 'blazer';
  const shirtOnly = (o: Outfit) => o.kind === 'shirt';
  const double = (o: Outfit) => o.kind === 'double';
  const waistcoatOn = (o: Outfit) => o.kind === 'waistcoat';
  const overcoatOn = (o: Outfit) => o.kind === 'overcoat';
  const trucker = (o: Outfit) => o.kind === 'trucker';
  /** On his feet: sneakers, high-tops or dress shoes (docs/wardrobe-plan.md Phases 2 and 5: any with any top) */
  /*
   * The crowd's stand-ins (docs/wardrobe-plan.md Phase 8): a crowd's mesh of a kind holds every piece anyone of that
   * kind wears, and every person's vertex work runs over all of it, so pieces a crowd can't tell apart at its distance
   * share a shape (the colours stay their own). Near (detail 1): chinos as trousers, work trousers as cargo, derbies
   * as dress shoes, high-tops as sneakers; far (0) too: denim and cargo as joggers, runners, boots and slides as
   * sneakers, loafers as dress shoes. Single figures (2 and 3) wear every piece as it is.
   */
  const LEGS_NEAR: Partial<Record<Bottoms, Bottoms>> = { chinos: 'trousers', work: 'cargo' };
  const LEGS_FAR: Partial<Record<Bottoms, Bottoms>> = { chinos: 'trousers', work: 'joggers', denim: 'joggers', cargo: 'joggers' };
  const FEET_NEAR: Partial<Record<ShoeStyle, ShoeStyle>> = { derby: 'dress', hightop: 'sneaker' };
  const FEET_FAR: Partial<Record<ShoeStyle, ShoeStyle>> = { derby: 'dress', hightop: 'sneaker', runner: 'sneaker', boot: 'sneaker', slide: 'sneaker', loafer: 'dress' };
  const wornLegs = (o: Outfit): Bottoms | null => {
    const b = bottomsOf(o);
    return q >= 2 || !b ? b : ((q === 1 ? LEGS_NEAR : LEGS_FAR)[b] ?? b);
  };
  const wornFeet = (o: Outfit): ShoeStyle | null => {
    const f = shoesOf(o);
    return q >= 2 || !f ? f : ((q === 1 ? FEET_NEAR : FEET_FAR)[f] ?? f);
  };
  const sneakers = (o: Outfit) => wornFeet(o) === 'sneaker';
  /** Either sneaker, low or high: the stripe and the shoe's mark go on its side */
  const kicks = (o: Outfit) => wornFeet(o) === 'sneaker' || wornFeet(o) === 'hightop';
  const bare = (o: Outfit) => !o.hood && o.kind !== 'soldier';
  /** In the balaclava and shades (everyone but the unmasked: docs/faces-plan.md) */
  const masked = (o: Outfit) => !o.face;
  /** Hair that shows: unmasked, not bald, the hood down */
  const hairy = (o: Outfit) => !!o.face && !!o.hair && !(o.kind === 'hoodie' && o.hood);
  /** A hat or a helmet over it (the hard hat too): only the hair at the nape shows */
  const covered = (o: Outfit) => !!(o.cap || o.beanie || o.bucket || o.hardhat || o.helmet) || o.kind === 'soldier';
  const hasCap = (o: Outfit) => !!o.cap && !o.beanie && !o.bucket && !o.hardhat && bare(o);
  /** Which cap: the fitted, worn straight (`capFlat`), or the curved cap, either way round */
  // (far off, the crowd's fitted caps are drawn as caps, its skullies as beanies: docs/wardrobe-plan.md Phase 8)
  const curvedCap = (o: Outfit) => hasCap(o) && (!o.capFlat || far);

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
  /*
   * Shades (docs/wardrobe-plan.md Phase 4): real proportions, in five styles (`EYES`). Each is its lens's outline,
   * a thin rim round it (`outset()`), the lens set into the rim a little behind its front and both curved round the
   * eye a touch (`bend`), each side toed in round the face; a bridge (the aviator's double), small hinge blocks at the
   * outer edges and arms back along the head to the ear. Every style's hinges are at one height, so the arms past the
   * temples (and the chain hooked under them) are the same whichever is worn. The frames take the outfit's `frame`
   * colour; the lenses glow in its `lens` colour as before.
   */
  const lensZ = face(0, EYE_Y) + 0.012;
  /** The hinges' height over the eyes' middle */
  const HINGE_DY = 0.013;
  /** An outline pushed out `d` along its own normals (the rim round a lens), anticlockwise */
  const outset = (pts: THREE.Vector2[], d: number) => {
    const p = THREE.ShapeUtils.isClockWise(pts) ? [...pts].reverse() : pts;
    return p.map((v, i) => {
      const a = p[(i - 1 + p.length) % p.length];
      const b = p[(i + 1) % p.length];
      const t = new THREE.Vector2().subVectors(b, a).normalize();
      return new THREE.Vector2(v.x + t.y * d, v.y - t.x * d);
    });
  };
  /** The aviator's teardrop: a nearly straight top, the outer side dropping and the bottom swelling out and down */
  const teardrop = (n: number) =>
    Array.from({ length: n }, (_, k) => {
      const a = (k / n) * Math.PI * 2;
      const c = Math.cos(a);
      const si = Math.sin(a);
      let x = Math.sign(c) * Math.abs(c) ** (2 / 2.4) * 0.033;
      let y = Math.sign(si) * Math.abs(si) ** (2 / 2.4) * 0.026;
      if (y < 0) {
        const f = -y / 0.026;
        x = x * (1 - 0.22 * f) + 0.008 * f;
        y *= 1.08;
      } else y *= 0.82;
      return new THREE.Vector2(x, y - 0.002);
    });
  const EYE_STYLES: EyeStyle[] = ['classic', 'aviator', 'round', 'slim', 'wrap'];
  /** Points round a lens: enough for a smooth outline at the size it's seen */
  const LENS_PTS = q === 3 ? 24 : 18;
  /**
   * Each style: its right lens's outline (the outer side +x; the left is its mirror), the rim's width, how far out
   * each lens's middle is, how far each side turns round the face (toe), how much the lens curves (bend), whether
   * the bridge is doubled
   */
  const EYES: Record<EyeStyle, { lens: () => THREE.Vector2[]; rim: number; cx: number; toe: number; bend: number; double?: boolean }> = {
    classic: { lens: () => roundRect(0.066, 0.036, 4, LENS_PTS, 0.16).getPoints(), rim: 0.0032, cx: 0.043, toe: 0.24, bend: 1.2 },
    aviator: { lens: () => teardrop(LENS_PTS + 4), rim: 0.0016, cx: 0.042, toe: 0.2, bend: 1.4, double: true },
    round: { lens: () => roundRect(0.05, 0.05, 2, LENS_PTS + 4).getPoints(), rim: 0.0022, cx: 0.036, toe: 0.12, bend: 0.8 },
    slim: { lens: () => roundRect(0.07, 0.025, 6, LENS_PTS, 0.05).getPoints(), rim: 0.0024, cx: 0.044, toe: 0.24, bend: 1.2 },
    wrap: { lens: () => roundRect(0.076, 0.036, 2.6, LENS_PTS, 0.32).getPoints(), rim: 0.0014, cx: 0.042, toe: 0.42, bend: 4.5 },
  };
  const FRAME_D = q === 3 ? 0.0036 : 0.0048;
  // (no bevel: at a rim this thin it doesn't show, and it doubled the frames' triangles)
  const BEVEL = { bevelEnabled: false };
  /** A style's pieces in the head's space: the frames' front (rims, bridge, hinge blocks), the lenses, and each hinge */
  const shadesFront = (style: EyeStyle) => {
    const e = EYES[style];
    const lens = e.lens().map((v) => new THREE.Vector2(v.x, v.y));
    const rimPts = outset(lens, e.rim);
    const mirror = (pts: THREE.Vector2[]) => pts.map((v) => new THREE.Vector2(-v.x, v.y)).reverse();
    /** Curved round the eye, turned round the face and put on side s */
    const place = (g: THREE.BufferGeometry, s: number, dz: number) => {
      const P = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < P.count; i++) P.setZ(i, P.getZ(i) - e.bend * P.getX(i) ** 2);
      g.computeVertexNormals();
      return g.rotateY(s * e.toe).translate(s * e.cx, EYE_Y, lensZ + dz - Math.abs(s) * 0.004);
    };
    const side = (s: number) => {
      const outer = s > 0 ? rimPts : mirror(rimPts);
      const inner = s > 0 ? lens : mirror(lens);
      const ccw = (pts: THREE.Vector2[]) => (THREE.ShapeUtils.isClockWise(pts) ? [...pts].reverse() : pts);
      const rim = new THREE.Shape(ccw(outer));
      rim.holes.push(new THREE.Path([...ccw(inner)].reverse()));
      return {
        frame: place(new THREE.ExtrudeGeometry(rim, { depth: FRAME_D, curveSegments: 4, ...BEVEL }), s, 0),
        lens: place(new THREE.ExtrudeGeometry(new THREE.Shape(ccw(inner)), { depth: 0.0024, bevelEnabled: false, curveSegments: 4 }), s, FRAME_D * 0.35),
      };
    };
    const sides = [-1, 1].map(side);
    /** A point of the right lens's rim (local x, y, its depth) where it ends up on side s */
    const at = (s: number, x: number, y: number, z: number) =>
      new THREE.Vector3(s * x, y, z - e.bend * x * x).applyAxisAngle(new THREE.Vector3(0, 1, 0), s * e.toe).add(new THREE.Vector3(s * e.cx, EYE_Y, lensZ - 0.004));
    // (the rim's outer edge at the hinges' height, and its inner edge high on the nose side)
    const near = (pts: THREE.Vector2[], y: number, pick: (a: number, b: number) => boolean) =>
      pts.filter((v) => Math.abs(v.y - y) < 0.006).reduce((m, v) => (pick(v.x, m) ? v.x : m), pick(1, 0) ? -9 : 9);
    const outerX = near(rimPts, HINGE_DY, (a, b) => a > b);
    const top = Math.max(...lens.map((v) => v.y));
    const innerX = near(rimPts, top * 0.5, (a, b) => a < b);
    const hinge = (s: number) => at(s, outerX, HINGE_DY, FRAME_D / 2 + 0.004);
    const tubeR = q === 3 ? 0.0022 : 0.0026;
    const bridgeAt = (y: number, lift: number) => {
      const l = at(-1, innerX, y, FRAME_D / 2 + 0.004);
      const r = at(1, innerX, y, FRAME_D / 2 + 0.004);
      const mid = l.clone().add(r).multiplyScalar(0.5).add(new THREE.Vector3(0, lift, 0.002));
      return tube([l.toArray(), mid.toArray(), r.toArray()] as [number, number, number][], tubeR, q === 3 ? R(12) : R(6), q === 3 ? 6 : 4);
    };
    const bridges = [bridgeAt(top * 0.5, 0.004), ...(e.double ? [bridgeAt(top + e.rim * 0.5, 0)] : [])];
    const blocks = [-1, 1].map((s) => {
      const h = hinge(s);
      return (q === 3 ? rbox(0.0045, 0.006, 0.009, 0.0015) : new THREE.BoxGeometry(0.0045, 0.006, 0.009)).rotateY(s * e.toe).translate(h.x - s * 0.001, h.y, h.z - 0.002);
    });
    return { frames: [...sides.map((v) => v.frame), ...bridges, ...blocks], lenses: sides.map((v) => v.lens), hinge };
  };
  const SHADES = Object.fromEntries(EYE_STYLES.map((st) => [st, shadesFront(st)])) as Record<EyeStyle, ReturnType<typeof shadesFront>>;

  /* ----- The face, unmasked (docs/faces-plan.md): flat ink laid on the head's own features ----- */
  /** A closed outline round (cx, cy): a superellipse w by h, `n` squarer, tilted by `tilt` */
  const blob = (cx: number, cy: number, w: number, h: number, n: number, pts: number, tilt = 0): [number, number][] =>
    Array.from({ length: pts }, (_, k) => {
      const a = (k / pts) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const x = Math.sign(c) * Math.abs(c) ** (2 / n) * (w / 2);
      const y = Math.sign(s) * Math.abs(s) ** (2 / n) * (h / 2);
      return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)];
    });
  /** A stroke along y(t) for t from -1 to 1 across x0..x1, `hw(t)` its half-width (the brows, the mouth) */
  const stroke = (x0: number, x1: number, y: (t: number) => number, hw: (t: number) => number, pts: number): [number, number][] => {
    const at = (t: number) => x0 + ((x1 - x0) * (t + 1)) / 2;
    const ts = Array.from({ length: pts + 1 }, (_, k) => -1 + (2 * k) / pts);
    return [...ts.map((t): [number, number] => [at(t), y(t) + hw(t)]), ...ts.reverse().map((t): [number, number] => [at(t), y(t) - hw(t)])];
  };
  const INK_DEPTH = 0.0016;
  const FACE_LIFT = 0.0005;
  const EYE_X = 0.032;
  const eyes = [-1, 1].map((s) => onBody(blob(s * EYE_X, EYE_Y + 0.002, 0.015, 0.023, 2.3, R(16)), INK_DEPTH, face, FACE_LIFT));
  // (a white glint high on each eye, towards the outside, standing just off it)
  const glints = [-1, 1].map((s) => onBody(blob(s * (EYE_X + 0.003), EYE_Y + 0.0085, 0.005, 0.0055, 2, R(10)), 0.0008, face, FACE_LIFT + INK_DEPTH + 0.0006));
  // Brows arched a little, thicker at the inside; the mouth a short line turned up at the corners
  const brows = [-1, 1].map((s) =>
    onBody(
      // (t runs from the inside end to the outside on either side)
      stroke(s * 0.017, s * 0.049, (t) => 0.151 + 0.0028 * (1 - t * t) - 0.0012 * t, (t) => 0.0029 * (1 - 0.175 * (t + 1)), R(8)),
      INK_DEPTH,
      face,
      FACE_LIFT
    )
  );
  const mouth = onBody(stroke(-0.015, 0.015, (t) => 0.05 + 0.0032 * t * t, (t) => 0.0017 * (1 - 0.4 * t * t), R(10)), INK_DEPTH, face, FACE_LIFT);

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
  /** How far forward of the ear's middle the arm starts over it (where the chain hooks) */
  const ARM_EAR = 0.012;
  /** How far out the head's side is at height y and depth z */
  const sideAt = (y: number, z: number) => {
    const { hw, zf, zb } = headAt(y);
    const zc = (zf + zb) / 2;
    const d = z > zc ? zf - zc : zc - zb;
    const n = hero ? headRow(y).n : HN;
    return hw * Math.max(0, 1 - Math.min(1, Math.abs((z - zc) / d)) ** n) ** (1 / n);
  };
  const armPath = (s: number, hinge: (s: number) => THREE.Vector3): [number, number, number][] => {
    const h = hinge(s);
    const along = (y: number, z: number, out = 0): [number, number, number] => [s * Math.max(sideAt(y, z) + ARM_GAP + out, 0), y, z];
    // (level with the hinges, out past the ear's root, so from the front they keep behind the frames)
    const y = h.y + 0.001;
    // (from a narrow pair's hinges, out round the temple first, then along the side every centimetre so the arm keeps
    // off the head's curve between its points: docs/wardrobe-plan.md Phase 4)
    const side: [number, number, number][] = [];
    for (let z = h.z - 0.03; z > 0.02; z -= 0.01) side.push(along(y, z));
    return [
      [h.x, h.y, h.z - 0.002],
      [s * Math.max(Math.abs(h.x) + 0.001, sideAt(h.y, h.z - 0.012) + ARM_GAP), y, h.z - 0.012],
      ...side.map(([x, , z], i): [number, number, number] => [i ? x : s * Math.max(Math.abs(x), Math.abs(h.x) + 0.002), y, z]),
      along(y, ARM_EAR, EAR_OUT * 0.5),
      along(y, -0.004, EAR_OUT),
      along(y - 0.012, -0.02),
      along(y - 0.026, -0.026),
    ];
  };
  // (every style's arms: alike past the temples, its hinges being at one height; thin, as real arms are)
  const ARMS_OF = Object.fromEntries(EYE_STYLES.map((st) => [st, [-1, 1].map((s) => armPath(s, SHADES[st].hinge))])) as Record<EyeStyle, [number, number, number][][]>;
  const ARMS = ARMS_OF.classic;
  const armTubes = (st: EyeStyle) => ARMS_OF[st].map((pts) => tube(pts, q === 3 ? 0.0021 : 0.003, q === 3 ? 20 : R(8), q === 3 ? 5 : 4));
  /** Where the chain hooks onto each arm (s: the side): under it, by the ear */
  const armHook = (s: number): [number, number, number] => {
    const [x, y, z] = ARMS[s < 0 ? 0 : 1].find((p) => p[2] === ARM_EAR)!;
    return [x + s * 0.003, y - 0.004, z];
  };

  /*
   * Face gear (docs/wardrobe-plan.md Phase 4): moulded on the face it's worn on. A mask is a shell over the face
   * (`moulded()`: the face's own surface carried out `off`, domed `dome` at its middle, inside a rounded outline), its
   * edge sealed by a rolled rim, held by straps round the head (`headStrap()`: the head's outline carried out at a height,
   * from one side of the face round the back to the other). The gas mask covers the face and has its own eye windows
   * (the shades come off); the half respirator covers the nose and mouth (any shades over it); the goggles are one
   * curved lens across both eyes in a frame, their strap round the head over the ears (the shades come off).
   */
  /** The face's smooth surface (its oval without the nose, cheekbones and brow), what a moulded mask follows */
  const smoothFace = (x: number, y: number) => {
    if (!hero) return face(x, y);
    const r = headRow(y);
    const u = Math.min(0.995, Math.abs(x) / r.hw);
    return r.zc + r.front * (1 - u ** r.n) ** (1 / r.n);
  };
  /** A moulded shell over the face: centre height yc, half-width w and half-height h, roundness n, narrower at the bottom by `chin` */
  const moulded = (yc: number, w: number, h: number, n: number, chin: number, off: number, dome: number, rim: number, rings = q === 3 ? 6 : 5, segs = q === 3 ? 26 : 20) => {
    const at = (r: number, a: number): [number, number, number] => {
      const c = Math.cos(a);
      const si = Math.sin(a);
      const yy = Math.sign(si) * Math.abs(si) ** (2 / n) * h;
      const x = Math.sign(c) * Math.abs(c) ** (2 / n) * w * (1 - chin * Math.max(0, -yy / h)) * r;
      const y = yc + yy * r;
      // (out from the head's middle, so the sides stand off the face as well as the front; never nearer the face
      // itself, its nose and all, than 4 thousandths, and at the edge than its rolled rim is thick)
      const { zf, zb } = headAt(y);
      const zc = (zf + zb) / 2;
      const z0 = smoothFace(x, y);
      const out = Math.max(off + dome * (1 - r * r), face(x, y) - z0 + 0.004 + rim * 1.6 * r ** 6);
      const l = Math.hypot(x, z0 - zc) || 1;
      return [x + (x / l) * out, y, z0 + ((z0 - zc) / l) * out];
    };
    const pos: number[] = [];
    const idx: number[] = [];
    pos.push(...at(0, 0));
    for (let i = 1; i <= rings; i++) for (let k = 0; k < segs; k++) pos.push(...at(i / rings, (k / segs) * Math.PI * 2));
    for (let k = 0; k < segs; k++) idx.push(0, 1 + k, 1 + ((k + 1) % segs));
    for (let i = 1; i < rings; i++)
      for (let k = 0; k < segs; k++) {
        const a = 1 + (i - 1) * segs + k;
        const b = 1 + (i - 1) * segs + ((k + 1) % segs);
        const c2 = a + segs;
        const d = b + segs;
        idx.push(a, c2, b, b, c2, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // (facing out: forward at its middle)
    if ((g.attributes.normal as THREE.BufferAttribute).getZ(0) < 0) {
      const ix = g.index!.array as unknown as number[];
      for (let t = 0; t < ix.length; t += 3) [ix[t + 1], ix[t + 2]] = [ix[t + 2], ix[t + 1]];
      g.index!.needsUpdate = true;
      g.computeVertexNormals();
    }
    const edge = Array.from({ length: segs + 1 }, (_, k) => at(1, (k / segs) * Math.PI * 2));
    return { shell: g, edge, at };
  };
  /** A strap round the head at height y (rising to `yBack` behind), `gap` off it, from the face's side at angle a0 round the back */
  const headStrap = (y: number, yBack: number, gap: number, a0: number, r: number) => {
    const pts: [number, number, number][] = [];
    const n = 16;
    for (let k = 0; k <= n; k++) {
      const a = a0 - ((Math.PI + 2 * a0) * k) / n;
      const yy = y + (yBack - y) * Math.sin(Math.PI * (k / n));
      // (on the head's own surface, measured out from its middle that way, then `gap` further)
      const { zf, zb } = headAt(yy);
      const zc = (zf + zb) / 2;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      const r = headR(yy, dx, dz) + gap;
      pts.push([dx * r, yy, zc + dz * r]);
    }
    return tube(pts, r, q === 3 ? 32 : 24, 4);
  };
  /** A disc facing `dir` at p: a filter, a pad, a valve (r its radius, d its depth) */
  const disc = (p: [number, number, number], dir: THREE.Vector3, r: number, d: number, seg = q === 3 ? 14 : 10) =>
    new THREE.CylinderGeometry(r, r * 0.96, d, seg).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())).translate(...p);
  const STRAP_R = q === 3 ? 0.0028 : 0.0034;
  const RIM_R = q === 3 ? 0.0042 : 0.005;

  // The gas mask: brow to under the chin, two eye windows, two filters low on the cheeks, a valve at the mouth
  const gasMask = (() => {
    const m = moulded(0.08, 0.074, 0.08, 2.5, 0.38, 0.008, 0.012, RIM_R);
    const front = (x: number, y: number) => {
      // (the shell's surface over a point of the face: the nearest of its rings)
      const r = Math.min(1, Math.hypot(x / 0.074, (y - 0.08) / 0.08));
      return smoothFace(x, y) + 0.008 + 0.012 * (1 - r * r);
    };
    // (the eye windows stand proud of the shell in their rings, so they read from any side)
    const eyes = [-1, 1].map((s) => {
      const p: [number, number, number] = [s * 0.031, EYE_Y + 0.004, front(s * 0.031, EYE_Y + 0.004) + 0.003];
      const dir = new THREE.Vector3(s * 0.3, 0.05, 1).normalize();
      return { glass: disc([p[0] + dir.x * 0.0035, p[1], p[2] + dir.z * 0.0035], dir, 0.018, 0.003), ring: disc(p, dir, 0.0225, 0.007) };
    });
    const filters = [-1, 1].map((s) => {
      const p: [number, number, number] = [s * 0.048, 0.034, front(s * 0.048, 0.034) + 0.017];
      const dir = new THREE.Vector3(s * 0.75, -0.25, 0.7);
      return [disc(p, dir, 0.017, 0.024), disc([p[0] + dir.x * 0.016, p[1] - 0.004, p[2] + 0.011], dir, 0.0155, 0.004)];
    });
    const valve = disc([0, 0.03, front(0, 0.03) + 0.006], new THREE.Vector3(0, -0.15, 1), 0.011, 0.012);
    const rim = tube(m.edge, RIM_R, q === 3 ? 44 : 30, q === 3 ? 5 : 4);
    const straps = [headStrap(0.142, 0.152, 0.004, 0.42, STRAP_R), headStrap(0.06, 0.07, 0.004, 0.55, STRAP_R)];
    return {
      body: [m.shell, rim, valve, ...filters.map((f) => f[0]), ...straps, ...eyes.map((e) => e.ring)],
      dark: filters.map((f) => f[1]),
      glass: eyes.map((e) => e.glass),
    };
  })();

  // The half respirator: over the nose and mouth, two filter pads at the sides, straps under the ears and round the neck
  const respirator = (() => {
    const m = moulded(0.052, 0.05, 0.042, 2.3, 0.3, 0.006, 0.017, RIM_R * 0.85);
    const front = (x: number, y: number) => {
      const r = Math.min(1, Math.hypot(x / 0.05, (y - 0.052) / 0.042));
      return smoothFace(x, y) + 0.006 + 0.017 * (1 - r * r);
    };
    const pads = [-1, 1].map((s) => {
      const p: [number, number, number] = [s * 0.036, 0.046, front(s * 0.036, 0.046) + 0.003];
      return disc(p, new THREE.Vector3(s * 0.85, -0.1, 0.55), 0.019, 0.008);
    });
    const valve = disc([0, 0.03, front(0, 0.03) + 0.004], new THREE.Vector3(0, -0.1, 1), 0.009, 0.008);
    const rim = tube(m.edge, RIM_R * 0.85, q === 3 ? 36 : 26, q === 3 ? 5 : 4);
    const straps = [headStrap(0.085, 0.095, 0.004, 0.62, STRAP_R), headStrap(0.035, 0.03, 0.004, 0.75, STRAP_R)];
    return { body: [m.shell, rim, valve, ...straps], pads };
  })();

  // Goggles: one curved lens across both eyes in a frame, a strap round the head over the ears (the ski pair taller,
  // its frame padded)
  const goggles = (ski: boolean) => {
    const h = ski ? 0.026 : 0.024;
    const fr = ski ? 0.0065 : 0.004;
    const m = moulded(EYE_Y + 0.003, 0.078, h, 3.2, 0.12, ski ? 0.016 : 0.013, ski ? 0.006 : 0.004, fr, q === 3 ? 5 : 4, q === 3 ? 36 : 26);
    const frame = tube(m.edge, fr, q === 3 ? 48 : 32, q === 3 ? 6 : 4);
    const band = headStrap(EYE_Y + 0.003, EYE_Y + 0.02, 0.012, 0.1, ski ? 0.0045 : 0.0032);
    return { lens: m.shell, frame: [frame, band] };
  };
  const safety = goggles(false);
  const ski = goggles(true);
  /* ----- Hair, unmasked (docs/faces-plan.md): a shell over the scalp from the hairline up ----- */
  /** The hairline's height round the head (a: 0 is +x, PI/2 the front): over the brow, above the ears, down to the nape */
  const hairline = (a: number) => {
    const f = Math.sin(a);
    return f >= 0 ? 0.158 + 0.038 * f ** 1.6 : 0.158 - 0.09 * THREE.MathUtils.smoothstep(-f, 0.15, 0.85);
  };
  /**
   * The hair: in each direction round the head, the head's own outline (bottom to top, as `headR()` finds it) from
   * the hairline up, carried out `gap(y, a)` along its normal; the edge tucked onto the scalp so it reads as a line.
   * Up to y1 (and open there) for the hair left showing under a hat, else over the top to a point.
   */
  const hairShell = (gap: (y: number, a: number) => number, y1 = Infinity, o: { line?: (a: number) => number; hang?: number; more?: number; top?: (a: number) => number } = {}) => {
    const seg = R(24);
    const rows = Math.round([3, 5, 8, 11][q] * (o.more ?? 1));
    const line = o.line ?? hairline;
    const hang = o.hang ?? -Infinity;
    const closed = y1 > HEAD_HI;
    const pos: number[] = [];
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      const top = Math.min(y1, o.top?.(a) ?? Infinity, HEAD_HI - 0.0005);
      // (under a hat, none at the sides where the hairline's already above the band: a point there, folded away)
      const y0 = Math.min(line(a), top);
      // The outline from the hairline up (its points every 2 mm), and its length along the way; below `hang` it
      // falls straight down rather than in round the jaw and the neck
      const rHang = hang > -Infinity ? headR(hang, dx, dz) : 0;
      const prof: [r: number, y: number, zc: number][] = [];
      for (let y = y0; y < top; y += 0.002) prof.push([y < hang ? Math.max(headR(y, dx, dz), rHang) : headR(y, dx, dz), y, (headAt(Math.max(y, hang)).zf + headAt(Math.max(y, hang)).zb) / 2]);
      prof.push([headR(top, dx, dz), top, (headAt(top).zf + headAt(top).zb) / 2]);
      const len = [0];
      for (let i = 1; i < prof.length; i++) len.push(len[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
      const L = len[len.length - 1];
      for (let j = 0; j <= rows; j++) {
        // (rows closer together at the edge, where it turns out from the scalp)
        const s = L * (j / rows) ** 1.25;
        let i = 1;
        while (i < prof.length - 1 && len[i] < s) i++;
        const f = len[i] > len[i - 1] ? (s - len[i - 1]) / (len[i] - len[i - 1]) : 0;
        const [r0, ya, z0] = prof[i - 1];
        const [r1, yb, z1] = prof[Math.min(i, prof.length - 1)];
        const r = r0 + (r1 - r0) * f;
        const y = ya + (yb - ya) * f;
        const zc = z0 + (z1 - z0) * f;
        // Its normal in the outline's own plane, out from the head
        const tr = r1 - r0;
        const ty = yb - ya;
        const tl = Math.hypot(tr, ty) || 1;
        const tuck = j === 0 || (!closed && j === rows) ? 0.06 : j === 1 || (!closed && j === rows - 1) ? 0.6 : 1;
        // (the edge too clears the head between its points: the ring's sag)
        const g = 0.0006 + SAG + gap(y, a) * tuck;
        const rr = r + (ty / tl) * g;
        pos.push(dx * rr, y + (-tr / tl) * g, zc + dz * rr);
      }
    }
    const idx: number[] = [];
    const at = (k: number, j: number) => (k % seg) * (rows + 1) + j;
    for (let k = 0; k < seg; k++)
      for (let j = 0; j < rows; j++) {
        idx.push(at(k, j), at(k, j + 1), at(k + 1, j));
        idx.push(at(k + 1, j), at(k, j + 1), at(k + 1, j + 1));
      }
    if (closed) {
      // The crown's point: over the top, as far out as the gap there
      const apex = pos.length / 3;
      const { zf, zb } = headAt(HEAD_HI);
      pos.push(0, HEAD_HI + 0.0006 + gap(HEAD_HI, 0) + SAG, (zf + zb) / 2);
      for (let k = 0; k < seg; k++) idx.push(at(k, rows), apex, at(k + 1, rows));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    // (wound outwards whichever way the ring turned)
    g.computeVertexNormals();
    const p = g.attributes.position;
    const n = g.attributes.normal;
    let out = 0;
    for (let i = 0; i < p.count; i++) out += n.getX(i) * p.getX(i) + n.getZ(i) * (p.getZ(i) - headAt(p.getY(i)).zf * 0.5 - headAt(p.getY(i)).zb * 0.5);
    if (out < 0) {
      const ix = g.index!.array as Uint32Array | Uint16Array;
      for (let t = 0; t < ix.length; t += 3) [ix[t + 1], ix[t + 2]] = [ix[t + 2], ix[t + 1]];
      g.computeVertexNormals();
    }
    return g;
  };
  const ease = THREE.MathUtils.smoothstep;
  /** Hair falling past the ears stands out over them (they stand out of the head about a centimetre) */
  const overEars = (y: number, a: number) => 0.0125 * ease(Math.abs(Math.cos(a)), 0.72, 0.92) * ease(y, 0.088, 0.104) * (1 - ease(y, 0.145, 0.158));
  /** Each cut's thickness off the scalp by height (and way round, for the curls) */
  const CUT_GAP: Record<HairCut, (y: number, a: number) => number> = {
    buzz: () => 0.0016,
    crop: (y) => 0.0025 + 0.0075 * ease(y, 0.18, 0.226),
    curls: (y, a) => 0.006 + 0.015 * ease(y, 0.12, 0.215) + 0.0035 * (0.5 + 0.5 * Math.sin(a * 9)) * (0.5 + 0.5 * Math.sin(y * 260)),
    bun: () => 0.0024,
    twists: (y) => 0.003 + 0.004 * ease(y, 0.18, 0.226),
    hightop: () => 0.0014,
    // (fuller towards the ends, the way long hair falls)
    long: (y, a) => 0.0035 + 0.005 * ease(y, 0.17, 0.226) + 0.006 * (1 - ease(y, 0.03, 0.13)) + overEars(y, a),
  };
  // The bun: a ball high on the back of the head, sunk into the hair
  const bun = (() => {
    const y = 0.206;
    const { zb } = headAt(y);
    return new THREE.SphereGeometry(0.03, R(12), R(9)).scale(1, 0.9, 0.85).translate(0, y + 0.006, zb - 0.012);
  })();
  // Twists: locs from the crown hanging round the back and sides, clear of the ears (above them at the sides, to the
  // nape at the back), never over the face
  const twists = (() => {
    const n = [0, 8, 14, 18][q];
    const out: THREE.BufferGeometry[] = [];
    for (let k = 0; k < n; k++) {
      // (from one side round the back to the other: the front third left to the crop under them)
      const a = Math.PI * (0.88 + (1.24 * (k + 0.5)) / n);
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      const yEnd = 0.152 - 0.09 * ease(-dz, 0.3, 0.85);
      const pts: [number, number, number][] = [];
      for (let t = 0; t <= 1.0001; t += q === 1 ? 0.34 : 0.2) {
        const y = 0.205 + (yEnd - 0.205) * t;
        const { zf, zb } = headAt(y);
        const r = headR(y, dx, dz) + 0.0115 + 0.003 * t;
        pts.push([dx * r, y, (zf + zb) / 2 + dz * r]);
      }
      out.push(tube(pts, 0.0065, q === 3 ? 8 : q === 2 ? 6 : 4, q === 1 ? 3 : q === 2 ? 5 : 6));
    }
    return out;
  })();
  // The high-top: a tall flat top over a fade, snug to the head at its foot (`hightopHair`: `hightop` is the sneaker)
  const hightopHair = (() => {
    // (sized from the head itself, its brow and all, every way out from its middle)
    const at = (y: number, g: number): Sec => {
      const { zf, zb } = headAt(y);
      const zc = (zf + zb) / 2;
      const front = headR(y, 0, 1);
      const back = headR(y, 0, -1);
      return [y, Math.max(headR(y, 1, 0), headR(y, 0.7071, 0.7071), headR(y, 0.7071, -0.7071)) + g + SAG, (front + back) / 2 + g + SAG, zc + (front - back) / 2];
    };
    const [, hw, hd, zc] = at(0.178, 0.006);
    const secs: Sec[] = [at(0.166, 0.0012), at(0.172, 0.004), [0.178, hw, hd, zc], [0.23, hw * 1.04, hd * 1.03, zc], [0.282, hw * 1.05, hd * 1.04, zc], [0.29, hw, hd, zc], [0.2915, 0.002, 0.002, zc]];
    return openLoft(secs, R(20), 3.2);
  })();
  // Long: to the jaw at the sides and the back, framing the face, falling straight below the cheekbones
  const LONG_END = 0.02;
  const LONG_HANG = 0.12;
  const longLine = (a: number) => {
    const f = Math.sin(a);
    return f > 0.55 ? hairline(a) : LONG_END + (hairline(a) - LONG_END) * ease(f, 0.2, 0.55);
  };
  const hairs: Record<HairCut, THREE.BufferGeometry[]> = {
    buzz: [hairShell(CUT_GAP.buzz)],
    crop: [hairShell(CUT_GAP.crop)],
    curls: [hairShell(CUT_GAP.curls)],
    bun: [hairShell(CUT_GAP.bun), bun],
    twists: [hairShell(CUT_GAP.twists)],
    // (the fade in fewer rows: above its foot the block hides it)
    hightop: [hairShell(CUT_GAP.hightop, Infinity, { more: 0.6 }), hightopHair],
    long: [hairShell(CUT_GAP.long, Infinity, { line: longLine, hang: LONG_HANG, more: q === 1 ? 1.6 : 2.2 })],
  };
  /** The hair left showing under a hat (or a helmet): close to the scalp at the back, below the lowest hat's band */
  const NAPE_TOP = 0.162;
  const nape = hairShell(() => 0.0012, NAPE_TOP);
  // (long hair still hangs below a hat)
  // (only round the sides and the back, rising to the band at the sides, clear of the brow)
  const longUnder = hairShell((y, a) => 0.0012 + overEars(y, a), NAPE_TOP, {
    line: (a) => LONG_END + (NAPE_TOP + 0.01 - LONG_END) * ease(Math.sin(a), -0.05, 0.2),
    hang: LONG_HANG,
    more: 2.2,
    // (lower at the sides, under the tips of a cap's brim, which curl down there)
    top: (a) => NAPE_TOP - 0.009 * Math.abs(Math.cos(a)) ** 3,
  });

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
  /*
   * The fitted cap (docs/wardrobe-plan.md Phase 5): the cap's crown with its front panels standing up structured, a
   * flat brim (barely pitched, square to the face, its sides kept level) reaching a little further, and the hat's mark
   * embroidered straight onto the front, bigger, with no patch
   */
  const flatBrim = (() => {
    const [, hw, hd, z0 = 0] = secAt(CAP, CAP_Y + 0.004);
    const e = 2 / HN_HAT;
    const at = (t: number) => {
      const a = t * Math.PI;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const x = Math.sign(c) * Math.abs(c) ** e * (hw - 0.004);
      const z = z0 + Math.abs(s) ** e * (hd - 0.004);
      return {
        inner: [x, z] as [number, number],
        outer: [x * (1 + 0.12 * s) + Math.sign(c) * 0.004 * (1 - s), z + 0.004 + 0.092 * s ** 1.2] as [number, number],
      };
    };
    const front = z0 + hd;
    const y = (x: number, z: number, u: number) => CAP_Y + 0.012 - (x * x * 0.25 + Math.max(0, z - front + 0.01) * 0.04) * u;
    return brimSweep(at, y, 0.0065, R(20), [1, 1, 2, 3][q], [2, 2, 3, 4][q]);
  })();
  // (the front panels a touch fuller and higher: a structured crown)
  const FIT_GAP = (y: number) => CAP_GAP(y) + 0.003 * THREE.MathUtils.smoothstep(y, 0.18, 0.23);
  const FITTED = headShell(CAP_Y, FIT_GAP);
  const fittedFront = surface(FITTED, HN_HAT);
  const fitted = {
    crown: [
      snug(loft(FITTED, R(20), HN_HAT), CAP_Y + 0.004, FIT_GAP),
      flatBrim,
      new THREE.SphereGeometry(0.011, R(8), R(6)).translate(0, FITTED[FITTED.length - 1][0] + 0.001, FITTED[FITTED.length - 1][3] ?? 0),
    ],
    seams: [Math.PI / 6, (Math.PI * 5) / 6, (Math.PI * 7) / 6, (Math.PI * 11) / 6, (Math.PI * 3) / 2].map((a) => meridian(FITTED, HN_HAT, a, CAP_Y + 0.02, 0.0022, 1.012, q === 3 ? 0.006 : 0)),
    // (the crowd's: the diamond on a patch, as on their caps)
    patch: new THREE.PlaneGeometry(0.044, 0.03).rotateX(-0.5).translate(0, 0.205, fittedFront(0, 0.205) + 0.004),
    logo: new THREE.PlaneGeometry(0.042, 0.042).rotateX(-0.5).translate(0, 0.205, fittedFront(0, 0.205) + 0.0035),
  };
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
  /*
   * The skully (docs/wardrobe-plan.md Phase 5): a fine knit pulled close over the head, no cuff and no pompom, its hem
   * rolled thin just over the brow and the ears, a small woven label on the hem at the front
   */
  const SKULLY_Y = 0.176;
  const SKULLY_GAP = (y: number) => 0.0035 + 0.003 * THREE.MathUtils.smoothstep(y, SKULLY_Y, HEAD_HI);
  const skully = snug(loft(headShell(SKULLY_Y, SKULLY_GAP), R(20), HN_HAT), SKULLY_Y + 0.004, SKULLY_GAP);
  const HEM = 0.0068;
  const skullyHem = snug(loft(headShell(SKULLY_Y - 0.002, () => HEM, SKULLY_Y + 0.006), R(20), HN_HAT), SKULLY_Y + 0.008, () => HEM, 0.001);
  const hemFront = frontAt(SKULLY_Y + 0.001, HEM);
  const skullyPatch = new THREE.PlaneGeometry(0.03, 0.016).translate(0, SKULLY_Y + 0.001, hemFront + 0.0025);
  const skullyLogo = new THREE.PlaneGeometry(0.013, 0.013).translate(0, SKULLY_Y + 0.001, hemFront + 0.0045);
  /*
   * The hard hat (docs/wardrobe-plan.md Phase 6): a rigid shell standing off the head on its harness (the gap the
   * suspension leaves), a raised ridge from front to back, a narrow brim all round reaching out into a short peak at
   * the front
   */
  const HARD_Y = 0.17;
  const HARD_GAP = (y: number) => 0.008 + 0.007 * THREE.MathUtils.smoothstep(y, 0.18, HEAD_HI);
  const HARD = headShell(HARD_Y, HARD_GAP);
  const hardCrown = snug(loft(HARD, R(20), HN_HAT), HARD_Y + 0.004, HARD_GAP);
  const hardRidge = [Math.PI / 2, (Math.PI * 3) / 2].map((a) => meridian(HARD, HN_HAT, a, HARD_Y + 0.012, 0.0045, 1.0, q === 3 ? 0.006 : 0));
  const hardBrim = (() => {
    const [, hw, hd, z0 = 0] = secAt(HARD, HARD_Y + 0.004);
    const r0 = Math.min(hw, hd) - 0.004;
    const g = new THREE.LatheGeometry(
      [
        [r0, HARD_Y + 0.008],
        [r0 + 0.02, HARD_Y + 0.002],
        [r0 + 0.02, HARD_Y - 0.003],
        [r0, HARD_Y + 0.003],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      R(28)
    );
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const r = Math.hypot(x, z);
      const out = (r - r0) / 0.02;
      const front = Math.max(0, z / (r || 1)) ** 3;
      // (stretched to the head's own oval, the peak reaching forward)
      const k = (r + out * 0.03 * front) / (r || 1);
      p.setXYZ(i, x * k * (hw / (r0 + 0.004)), p.getY(i) - out * 0.006 * front, z0 + z * k * (hd / (r0 + 0.004)));
    }
    g.computeVertexNormals();
    return g;
  })();
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
  /*
   * Business wear (docs/wardrobe-plan.md Phase 7). The blazer: the suit's jacket and tailoring over an open-collar
   * shirt, no tie: the shirt's collar spread open over the lapels, its top buttons undone
   */
  const OPEN_COLLAR: [number, number][] = [
    [-0.06, 0.432],
    [-0.018, 0.388],
    [-0.04, 0.37],
    [-0.094, 0.356],
    [-0.084, 0.404],
  ];
  const openCollar = [onBody(OPEN_COLLAR, 0.004, suitFront, 0.013), onBody(mirror(OPEN_COLLAR), 0.004, suitFront, 0.013)];
  // (the shirt open lower at the neck than under a tie)
  const openFront = onBody(
    [
      [-0.06, 0.414],
      [0, 0.25],
      [0.06, 0.414],
    ],
    0.004,
    suitFront,
    0.001
  );
  const blazerButtons = [0.15, 0.078].map((y) => new THREE.CylinderGeometry(0.008, 0.008, 0.005, R(10)).rotateX(Math.PI / 2).translate(0, y, suitFront(0, y) + 0.003));
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
  /*
   * The shirt on its own: a button-down's body on the jacket's lines (untucked, over every bottoms), its collar band
   * and points, a buttoned placket, a chest pocket, slim sleeves to buttoned cuffs, a narrow hem; the look's top colour
   */
  const OXK = smooth(grow(JACKET, 1.01));
  const shirtFront2 = surface(OXK, SN);
  const shirtBody = loft(OXK, TOP_RINGS, SN);
  const SHIRT_COLLAR: [number, number][] = [
    [-0.064, 0.414],
    [-0.012, 0.402],
    [-0.03, 0.354],
    [-0.08, 0.372],
  ];
  crisp = true;
  const shirtCollar = [onBody(SHIRT_COLLAR, 0.004, shirtFront2, 0.002), onBody(mirror(SHIRT_COLLAR), 0.004, shirtFront2, 0.002)];
  const shirtPocket = onBody(
    [
      [0.05, 0.215],
      [0.1, 0.215],
      [0.1, 0.27],
      [0.05, 0.27],
    ],
    0.003,
    shirtFront2,
    0.001
  );
  crisp = false;
  const shirtBand = new THREE.CylinderGeometry(0.058, 0.062, 0.032, R(16), 1, true).translate(0, 0.414, -0.004);
  const shirtPlacket = tape(-0.011, 0.011, -0.085, 0.4, 0.002, shirtFront2, 0.001);
  const shirtButtons = [-0.05, 0.03, 0.11, 0.19, 0.27, 0.35].map((y) => new THREE.CylinderGeometry(0.0045, 0.0045, 0.003, R(8)).rotateX(Math.PI / 2).translate(0, y, shirtFront2(0, y) + 0.0045));
  /** A tie laid on a front: its knot at the collar and its blade down to `end` (the suit's own, on another top) */
  const tieOn = (front: (x: number, y: number) => number, end: number, lift = 0) => [
    onBody(roundRect(0.032, 0.026, 3, R(16), 0.3, 0.385), 0.01, front, 0.006 + lift),
    onBody(
      [
        [-0.01, 0.374],
        [0.01, 0.374],
        [0.022, end + 0.026],
        [0, end],
        [-0.022, end + 0.026],
      ],
      0.006,
      front,
      0.008 + lift
    ),
  ];
  /*
   * The double-breasted suit (docs/wardrobe-plan.md Phase 7): the suit's jacket closed over to the wearer's right,
   * wide peak lapels (the left one over the right where they cross), six buttons in two columns, the front edge of
   * the left front down to the hem; the shirt and tie in its V
   */
  crisp = true;
  const PEAK: [number, number][] = [
    [-0.062, 0.41],
    [0.03, 0.214],
    [0.022, 0.19],
    [-0.088, 0.262],
    [-0.11, 0.33],
    [-0.152, 0.356],
    [-0.124, 0.378],
  ];
  // (the wearer's right lapel under, the left over it, a hair further off the cloth)
  const peakLapels = [onBody(PEAK, 0.009, suitFront, 0.003), onBody(mirror(PEAK), 0.009, suitFront, 0.0065)];
  const dbEdge = onBody(
    [
      [0.024, 0.19],
      [0.03, 0.19],
      [0.04, -0.075],
      [0.034, -0.075],
    ],
    0.002,
    suitFront,
    0.001
  );
  const dbShirt = onBody(
    [
      [-0.064, 0.412],
      [0, 0.22],
      [0.064, 0.412],
    ],
    0.004,
    suitFront,
    0.001
  );
  const dbTie = tieOn(suitFront, 0.226);
  /*
   * The waistcoat: over a shirt and tie, on the jacket's lines a touch fuller (the shirt's sleeves come out of it), a
   * deep V showing the shirt and tie, five buttons, two welt pockets
   */
  const WK = smooth(grow(JACKET, 1.015));
  const wkFront = surface(WK, SN);
  const waistcoat = loft(WK, TOP_RINGS, SN);
  const wkShirt = onBody(
    [
      [-0.066, 0.414],
      [0, 0.2],
      [0.066, 0.414],
    ],
    0.004,
    wkFront,
    0.001
  );
  const wkTie = tieOn(wkFront, 0.21);
  const wkCollar = [onBody(SHIRT_COLLAR, 0.004, wkFront, 0.003), onBody(mirror(SHIRT_COLLAR), 0.004, wkFront, 0.003)];
  const wkWelts = [-1, 1].map((s) =>
    onBody(
      [
        [s * 0.07 - 0.025, 0.058],
        [s * 0.07 + 0.025, 0.06],
        [s * 0.07 + 0.025, 0.066],
        [s * 0.07 - 0.025, 0.064],
      ],
      0.002,
      wkFront,
      0.001
    )
  );
  /*
   * The overcoat: a topcoat over a suit, the jacket's lines 7% fuller (to the same hem as every top: longer, the legs
   * would come through it), wide notch lapels and a turned collar a shade lighter, three buttons, flap pockets at the
   * hips; the shirt and tie in its V
   */
  const OCK = smooth(grow(JACKET, 1.07));
  const ocFront = surface(OCK, SN);
  const overcoat = loft(OCK, TOP_RINGS, SN);
  const OC_LAPEL: [number, number][] = [
    [-0.07, 0.418],
    [-0.002, 0.18],
    [-0.012, 0.15],
    [-0.1, 0.24],
    [-0.124, 0.322],
    [-0.15, 0.33],
    [-0.138, 0.384],
  ];
  const ocLapels = [onBody(OC_LAPEL, 0.01, ocFront, 0.003), onBody(mirror(OC_LAPEL), 0.01, ocFront, 0.003)];
  const ocFlaps = [-1, 1].map((s) =>
    onBody(
      [
        [s * 0.05, 0.02],
        [s * 0.13, 0.016],
        [s * 0.13, -0.008],
        [s * 0.05, -0.004],
      ],
      0.005,
      ocFront,
      0.001
    )
  );
  const ocShirt = onBody(
    [
      [-0.07, 0.42],
      [0, 0.19],
      [0.07, 0.42],
    ],
    0.004,
    ocFront,
    0.001
  );
  const ocTie = tieOn(ocFront, 0.2);
  crisp = false;
  const dbButtons = [0.08, 0.15, 0.215].flatMap((y, i) => [-1, 1].map((sx) => new THREE.CylinderGeometry(0.0075, 0.0075, 0.005, R(10)).rotateX(Math.PI / 2).translate(sx * (i === 2 ? 0.056 : 0.046), y, suitFront(sx * 0.05, y) + (sx > 0 ? 0.004 : 0.003))));
  const wkButtons = [0.03, 0.075, 0.12, 0.165, 0.205].map((y) => new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, R(8)).rotateX(Math.PI / 2).translate(0, y, wkFront(0, y) + 0.003));
  const ocButtons = [0.02, 0.085, 0.15].map((y) => new THREE.CylinderGeometry(0.0095, 0.0095, 0.005, R(10)).rotateX(Math.PI / 2).translate(0, y, ocFront(0, y) + 0.003));
  const hoodieFront = surface(HK, HN2);
  const hoodieBody = loft(HK, TOP_RINGS, HN2);
  /*
   * The hood up (docs/wardrobe-plan.md Phase 3): cloth over the head, not a helmet, and one with the hoodie. Its
   * sections are the head's own outline carried out (`headShell()`), roomier at the sides (`HOOD_SIDE`, over the ears
   * and the shades' arms) and fuller at the back, rising a little over the crown; under the jaw it falls to the
   * neck (`HOOD_NECK`) and grows out of the hoodie's own neckline: its lowest rows lie on the sweater's surface (its
   * sections, a little inside, then a little out: `HOOD_INTO`), leaving it at a shallow angle so no line shows where
   * one becomes the other, weighted as the sweater is there (the `hood` region, skeleton.ts) and as the head above
   * the jaw. Its opening frames the face, from the brow round behind the shades' frames and down the cheeks to a
   * narrow V at the throat that closes where it meets the sweater (`hoodOpen()`), each row drawn only round its
   * cloth so the edge is clean, a rolled edge (`hoodRim`) round it.
   */
  const HOOD_SIDE = 0.02;
  const HOOD_N = 2.2;
  /** The hood round the neck, over the hoodie's neckline (head space) */
  const HOOD_NECK: Sec = [-0.03, 0.1, 0.084, -0.006];
  /** Where the hood grows out of the sweater: its lowest row this far inside it, rising to this far out (head space) */
  const HOOD_INTO = { from: -0.085, under: 0.005, to: -0.05, over: 0.003 };
  /**
   * The opening's half-width at a height, as an angle round the hood's ring each side of the front: behind the shades'
   * frames from the cheeks to the brow, narrowing smoothly to a point over the brow (so the rows close a little at a
   * time and the cloth keeps its curve), and to a narrow V at the throat
   */
  const HOOD_FACE = 1.2;
  const HOOD_THROAT = 0.18;
  const hoodOpen = (y: number) =>
    y >= 0.19
      ? 0
      : (HOOD_THROAT + (HOOD_FACE - HOOD_THROAT) * THREE.MathUtils.smoothstep(y, -0.045, 0.04) - HOOD_FACE * THREE.MathUtils.smoothstep(y, 0.148, 0.19)) *
        THREE.MathUtils.smoothstep(y, -0.052, -0.028);
  const hoodSecs = (() => {
    // (the head's outline carried out over the cheeks, the brow and the crown; fuller behind, where a hood hangs)
    const upper = headShell(0.06, (y) => HOOD_SIDE - 0.006 * THREE.MathUtils.smoothstep(y, 0.2, HEAD_HI)).map(([y, hw, hd, z = 0]): Sec => {
      const full = 0.012 * Math.exp(-(((y - 0.12) / 0.07) ** 2));
      return [y, hw, hd + full / 2, z - full / 2];
    });
    // (under the jaw: falling to the neck, then into the hoodie's neckline, on the sweater's own sections)
    const top = upper[0];
    const lerp = (a: Sec, b: Sec, f: number): Sec => [0, 1, 2, 3].map((k) => (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * f) as Sec;
    const lower: Sec[] = [];
    const n = Math.max(6, Math.round((top[0] - HOOD_INTO.from) / HAT_STEP));
    for (let i = 0; i < n; i++) {
      const y = HOOD_INTO.from + ((top[0] - HOOD_INTO.from) * i) / n;
      const [, bw, bd, bz = 0] = secAt(HK, Math.min(y + HEAD_Y, HK[HK.length - 1][0]));
      const off = -HOOD_INTO.under + (HOOD_INTO.under + HOOD_INTO.over) * THREE.MathUtils.smoothstep(y, HOOD_INTO.from, HOOD_INTO.to);
      const body: Sec = [y, bw + off, bd + off, bz];
      const neck = lerp(HOOD_NECK, top, THREE.MathUtils.smoothstep(y, HOOD_NECK[0], top[0]));
      const out = lerp(body, neck, THREE.MathUtils.smoothstep(y, -0.06, -0.015));
      out[0] = y;
      lower.push(out);
    }
    // (closed over the crown: a last row to a point)
    const last = upper[upper.length - 1];
    // (its back hangs straight from the back of the head down to the upper back, as cloth would, rather than in
    // round the nape: each row's back no further in than that line, its front as it is)
    const drape = (y: number) => -0.085 - 0.031 * THREE.MathUtils.clamp((y + 0.06) / 0.16, 0, 1);
    const hung = [...lower, ...upper].map(([y, hw, hd, z = 0]): Sec => {
      if (y <= -0.06 || y >= 0.1) return [y, hw, hd, z];
      const front = z + hd;
      const back = Math.min(z - hd, drape(y));
      return [y, hw, (front - back) / 2, (front + back) / 2];
    });
    return [...hung, [last[0] + 0.0005, 0, 0, last[3] ?? 0] as Sec];
  })();
  /** Each row's cloth: from the opening's left edge round the back to its right edge (or all the way round) */
  const hoodRows = hoodSecs.map((sec) => {
    const t = Math.max(0, hoodOpen(sec[0]));
    return { sec, from: Math.PI / 2 + t, to: Math.PI / 2 - t + 2 * Math.PI, open: t > 1e-4 };
  });
  const HOOD_M = R(32);
  const hoodUp = (() => {
    const pos: number[] = [];
    const idx: number[] = [];
    for (const r of hoodRows) for (let j = 0; j <= HOOD_M; j++) pos.push(...ringAt(r.sec, r.from + ((r.to - r.from) * j) / HOOD_M, HOOD_N));
    const W = HOOD_M + 1;
    for (let i = 0; i < hoodRows.length - 1; i++)
      for (let j = 0; j < HOOD_M; j++) {
        const a = i * W + j;
        const b = (i + 1) * W + j;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    // (the rows closed all the way round meet themselves at the front: one smooth seam)
    const m = mergeVertices(g, 1e-6);
    m.computeVertexNormals();
    return m;
  })();
  /** The opening's edge, up the right side, over the brow and down the left */
  const hoodEdge = (() => {
    const open = hoodRows.filter((r) => r.open);
    const right = open.map((r) => ringAt(r.sec, r.to, HOOD_N));
    const left = open.map((r) => ringAt(r.sec, r.from, HOOD_N));
    // (over the top of the opening, the brow: the middle of the first closed row's front)
    const crest = hoodRows[hoodRows.indexOf(open[open.length - 1]) + 1];
    const peak = crest ? [ringAt(crest.sec, Math.PI / 2, HOOD_N)] : [];
    return [...right, ...peak, ...left.reverse()];
  })();
  const ROLL = q === 3 ? 0.0055 : 0.0065;
  const hoodRim = tube(hoodEdge.filter((_, i) => i % (q === 3 ? 1 : 2) === 0 || i === hoodEdge.length - 1), ROLL, q === 3 ? R(64) : R(32), q === 3 ? R(10) : R(6));
  // (heavyweight ribbing, docs/wardrobe-plan.md Phase 5: a deep band, deepened upward only: its foot lower sank into
  // the thighs at a sprint)
  const hem = loft(
    [
      [-0.095, 0.152, 0.104, 0],
      [-0.038, 0.157, 0.107, 0],
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
  /** The hood down's roll: its line round the neck (k 0 to 1, front to front by the back) and how thick it is there */
  const rollAt = (k: number) => {
    const f = Math.sin(Math.PI * k);
    const a = (Math.PI / 3) * (1 + 4 * k);
    return new THREE.Vector3(Math.sin(a) * (0.08 + 0.006 * f), 0.398 + 0.03 * f, -0.012 + Math.cos(a) * (0.064 + 0.018 * f));
  };
  const rollR = (k: number) => 0.012 + 0.022 * Math.sin(Math.PI * k) ** 0.6;
  const hoodDown = (() => {
    const N = R(24);
    const path = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => rollAt(i / 8)));
    const g = new THREE.TubeGeometry(path, N, 1, R(10), false);
    const p = g.attributes.position as THREE.BufferAttribute;
    const c = new THREE.Vector3();
    for (let i = 0; i <= N; i++) {
      path.getPointAt(i / N, c);
      const r = rollR(i / N);
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
      0.0048,
      R(8),
      4
    )
  );
  // (metal tips on the drawcords' ends: single figures)
  const aglets = [-1, 1].map((s) =>
    new THREE.CylinderGeometry(0.0056, 0.0052, 0.014, R(8)).translate(s * 0.034, 0.293, hoodieFront(s * 0.034, 0.3) + 0.006)
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
  /*
   * Cargo pants (docs/wardrobe-plan.md Phase 5): the fatigues' fuller legs on the one seat every bottoms shares (so
   * every top's hips stay over them), tapering under the knee to a gathered cuff like the joggers', a bellows pocket
   * on the outside of each thigh under its flap
   */
  // (right under the tops' hems as narrow as the joggers, which every hem swings clear of; fuller from there down)
  const CARGO_S = legs([
    [-0.12, 0.062, 0.064, 0.002],
    [-0.15, 0.064, 0.066, 0.003],
    [-0.21, 0.063, 0.067, 0.001],
    ...knee(0.056, 0.06),
    ...onShin([
      [-0.02, 0.057, 0.061, 0],
      [-0.11, 0.055, 0.059, -0.004],
      [-0.18, 0.049, 0.052, 0],
      [-0.2, 0.048, 0.051, 0.001],
      [-0.215, 0.047, 0.05, 0.001],
      [-0.235, 0.04, 0.043, 0],
    ]),
  ]);
  const cargoPants = trousers(hips(SEAT), CARGO_S, LEGS);
  const cargoCuff = loft(
    [
      [-0.258, 0.043, 0.046, 0.002],
      [-0.224, 0.044, 0.047, 0.002],
    ],
    R(16)
  );
  const cargoFlaps = [-1, 1].map((s) => rb(0.024, 0.016, 0.064, 0.005, s * 0.072, -0.12, 0.004));
  /*
   * Relaxed denim (docs/wardrobe-plan.md Phase 5): on the one seat, as narrow as the joggers right under the tops' hems,
   * then straight and roomy through the knee to the ankle, the hem turned up into a cuff (its inside showing, lighter),
   * a line of gold topstitching down the outseam
   */
  const DENIM_S = legs([
    ...JOG_THIGH,
    ...knee(0.056, 0.06),
    ...onShin([
      [-0.02, 0.057, 0.061, 0],
      [-0.11, 0.057, 0.061, -0.003],
      [-0.185, 0.056, 0.06, 0],
      [-0.22, 0.055, 0.059, 0.002],
      [-0.233, 0.055, 0.059, 0.003],
    ]),
  ]);
  const denim = trousers(hips(SEAT), DENIM_S, LEGS);
  // (the cuff sits just over the shoe's collar: lower, it took the runners', high-tops' and work boots' collars as the
  // foot flexed at a crouch)
  const denimCuff = loft(
    [
      [-0.24, 0.0575, 0.0615, 0.003],
      [-0.207, 0.0575, 0.0615, 0.003],
    ],
    R(16)
  );
  const STITCH = '#c99a4e';
  /*
   * Work trousers (docs/wardrobe-plan.md Phase 6): on the one seat, straight and roomy (the coveralls' legs too), a
   * hem; reinforced panels over the knees (laid on the leg's own surface, so they bend with it) and a hammer loop on
   * the right thigh
   */
  const WORK_S = legs([
    ...JOG_THIGH,
    ...knee(0.057, 0.061),
    ...onShin([
      [-0.02, 0.057, 0.061, 0],
      [-0.11, 0.056, 0.06, -0.003],
      [-0.185, 0.054, 0.058, 0],
      [-0.218, 0.054, 0.058, 0.002],
      [-0.232, 0.054, 0.058, 0.003],
    ]),
  ]);
  const workPants = trousers(hips(SEAT), WORK_S, LEGS);
  // (ending just over the boot's collar, as the denim's cuff does)
  const workHem = loft(
    [
      [-0.239, 0.0555, 0.0595, 0.003],
      [-0.223, 0.0555, 0.0595, 0.003],
    ],
    R(16)
  );
  /** A panel laid on a leg's front (`secs`, rounded `n`) from y0 to y1 and from angle a0 to a1 round it, `lift` off and `thick` */
  const legPatch = (secs: Sec[], n: number, y0: number, y1: number, a0: number, a1: number, lift: number, thick: number) => {
    const ny = q === 3 ? 8 : 5;
    const na = q === 3 ? 8 : 5;
    const e = 2 / n;
    const at = (i: number, j: number, out: number) => {
      const y = y0 + ((y1 - y0) * i) / ny;
      const a = a0 + ((a1 - a0) * j) / na;
      const [, hw, hd, z = 0] = secAt(secs, y);
      const c = Math.cos(a);
      const sn = Math.sin(a);
      return [Math.sign(c) * Math.abs(c) ** e * (hw + out), y, z + Math.sign(sn) * Math.abs(sn) ** e * (hd + out)];
    };
    const pos: number[] = [];
    const idx: number[] = [];
    const grid = (out: number, flip: boolean) => {
      const b = pos.length / 3;
      for (let i = 0; i <= ny; i++) for (let j = 0; j <= na; j++) pos.push(...at(i, j, out));
      for (let i = 0; i < ny; i++)
        for (let j = 0; j < na; j++) {
          const v = b + i * (na + 1) + j;
          const t = [v, v + 1, v + na + 1, v + 1, v + na + 2, v + na + 1];
          idx.push(...(flip ? [t[0], t[2], t[1], t[3], t[5], t[4]] : t));
        }
      return b;
    };
    const o = grid(lift + thick, false);
    const inn = grid(lift, true);
    // (its four edges closed between the two sheets)
    const edge = (list: number[]) => {
      for (let k = 0; k < list.length - 1; k++) {
        const [a, b] = [list[k], list[k + 1]];
        idx.push(o + a, inn + a, o + b, o + b, inn + a, inn + b);
      }
    };
    const W = na + 1;
    edge(Array.from({ length: W }, (_, j) => j).reverse());
    edge(Array.from({ length: ny + 1 }, (_, i) => i * W + na).reverse());
    edge(Array.from({ length: W }, (_, j) => ny * W + j));
    edge(Array.from({ length: ny + 1 }, (_, i) => i * W));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  // (over each knee, from the thigh down past the joint, across the front)
  const kneePanels = legPatch(WORK_S, 2.2, -0.31, -0.235, Math.PI / 2 - 0.62, Math.PI / 2 + 0.62, 0.0012, 0.0028);
  /*
   * Chinos (docs/wardrobe-plan.md Phase 7): on the one seat, slim and straight, tapering a little to a clean hem just
   * over the shoe
   */
  const CHINO_S = legs([
    ...JOG_THIGH,
    ...knee(0.052, 0.056),
    ...onShin([
      [-0.02, 0.051, 0.055, 0],
      [-0.11, 0.049, 0.053, -0.003],
      [-0.185, 0.046, 0.05, 0],
      [-0.216, 0.045, 0.049, 0.002],
      [-0.23, 0.045, 0.049, 0.003],
    ]),
  ]);
  const chinos = trousers(hips(SEAT), CHINO_S, LEGS);
  // (just over the shoe's collar, the work boots' too)
  const chinoHem = loft(
    [
      [-0.237, 0.0465, 0.0505, 0.003],
      [-0.222, 0.0465, 0.0505, 0.003],
    ],
    R(16)
  );
  // (on the right leg, the rig's -x side: the loop of the cloth down the outside of the thigh)
  const hammerLoop = (() => {
    const side = (y: number) => secAt(WORK_S, y)[1];
    return tube(
      [
        [-side(-0.13) - 0.001, -0.13, 0.022],
        [-side(-0.14) - 0.011, -0.142, 0.022],
        [-side(-0.18) - 0.012, -0.18, 0.02],
        [-side(-0.195) - 0.001, -0.195, 0.018],
      ],
      0.0035,
      R(10),
      4
    );
  })();
  /*
   * Shorts (docs/wardrobe-plan.md Phase 5): on the one seat every bottoms shares, roomy legs to just over the knee with
   * a stitched hem; his legs bare under them (`BARE_LEG`, in the leg's numbers: the thigh from inside the shorts, the
   * knee, the calf full at the back, the ankle into the sock) and white crew socks into the shoes
   */
  const SHORTS_S: Sec[] = [
    [-0.12, 0.063, 0.065, 0.002],
    [-0.15, 0.065, 0.067, 0.003],
    [-0.19, 0.066, 0.068, 0.002],
    [-0.226, 0.066, 0.068, 0.002],
  ];
  const shorts = trousers(hips(SEAT), SHORTS_S, LEGS);
  const shortsHem = loft(
    [
      [-0.233, 0.0685, 0.0705, 0.002],
      [-0.213, 0.0685, 0.0705, 0.002],
    ],
    R(16)
  );
  const BARE_LEG: Sec[] = [
    [-0.17, 0.052, 0.055, 0],
    [-0.21, 0.049, 0.052, 0],
    [-0.25, 0.045, 0.047, 0.002],
    [-0.28, 0.042, 0.045, 0.004],
    [-0.3, 0.041, 0.044, 0.003],
    ...onShin([
      [-0.04, 0.042, 0.046, -0.003],
      [-0.09, 0.043, 0.047, -0.006],
      [-0.15, 0.036, 0.04, -0.003],
      [-0.2, 0.031, 0.034, 0],
      [-0.24, 0.029, 0.031, 0.001],
    ]),
  ];
  const bareLeg = loft(q === 3 ? curve(BARE_LEG, 0.02) : BARE_LEG, R(14));
  // (in the shin's numbers: over the ankle's skin all the way, into every shoe's opening)
  const SOCK: Sec[] = [
    [-0.165, 0.037, 0.04, -0.002],
    [-0.19, 0.0355, 0.0385, -0.001],
    [-0.225, 0.034, 0.037, 0.001],
    [-0.265, 0.036, 0.039, 0.003],
  ];
  const sock = loft(SOCK, R(14));
  const sockRib = loft(
    [
      [-0.181, 0.0378, 0.0408, -0.002],
      [-0.163, 0.0378, 0.0408, -0.002],
    ],
    R(14)
  );

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
  // (the overcoat's: the suit's, fuller, over them)
  const ocUpper = loft(grow(SU, 1.1), R(14));
  const ocFore = loft(grow(q === 3 ? curve(FORE_J, 0.015) : FORE_J, 1.1), R(14));
  const ocCuff = loft(
    [
      [-0.196, 0.0375, 0.0395, 0.001],
      [-0.17, 0.0405, 0.0425, 0.001],
    ],
    R(14)
  );
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
  // (`side` of the loft it's on, `n` its squareness), bending with it; or as many as `dzs` asks, `W` either side
  // of each line (a taped seam, a felled seam's stitching)
  const stripe = (secs: Sec[], s: number, from: number, to: number, n = 2, dzs = [-0.009, 0.009], W = 0.0035) => {
    const side = sideSurface(secs, n);
    const ys: number[] = [];
    for (let y = from; y > to + 1e-6; y -= 0.01) ys.push(y);
    ys.push(to);
    return dzs.map((dz) => {
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
  /*
   * The heavyweight hoodie (docs/wardrobe-plan.md Phase 5, the refresh): deep ribbed cuffs, the shoulder's seam
   * dropped down the arm (a felled seam round the sleeve under the shoulder's point), and felled seams down the
   * body's sides, each a pair of stitch lines (the seams single figures only)
   */
  const hoodieCuff = loft(
    [
      [-0.212, 0.034, 0.036, 0.001],
      [-0.164, 0.038, 0.04, 0.001],
    ],
    R(14)
  );
  const DROP = -0.04;
  const dropSeam = (() => {
    const [, hw, hd, z = 0] = secAt(grow(LOOSE_U, 1.14), DROP);
    return loft(
      [
        [DROP - 0.0018, hw + 0.0013, hd + 0.0013, z],
        [DROP + 0.0018, hw + 0.0013, hd + 0.0013, z],
      ],
      R(14),
      2,
      true
    );
  })();
  const sideSeams = mergeGeometries([-1, 1].flatMap((s) => stripe(HK, s, 0.31, -0.08, HN2, [-0.0028, 0.0028], 0.0009)))!;
  // (stopping short of the cuff, which is narrower than the sleeve)
  const foreStripes = sleeveStripes(LOOSE_F, -0.172);
  const thighStripes = [-1, 1].map((s) => mergeGeometries(stripe(JOG_S, s, -0.12, -0.265, 2.2))!);
  const shinStripes = [-1, 1].map((s) => mergeGeometries(stripe(offShin(JOG_S), s, 0.025, -0.2, 2.2))!);
  // (the denim's outseam: one line of stitching, from under the hems to the cuff)
  const denimThighSeam = [-1, 1].map((s) => mergeGeometries(stripe(DENIM_S, s, -0.12, -0.265, 2.2, [0], 0.0011))!);
  const denimShinSeam = [-1, 1].map((s) => mergeGeometries(stripe(offShin(DENIM_S), s, 0.025, -0.203, 2.2, [0], 0.0011))!);
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
  /**
   * Laces lying on a shoe's rounded top (docs/wardrobe-plan.md Phase 5): each an arc across it at u, following the
   * section's own curve a hair over it (a flat bar laid across stood out past the sides)
   */
  const laceArcs = (secs: ShoeSec[], us: number[], n: number) =>
    us.map((u) => {
      const [, hw, b, t] = secAt(secs, u) as unknown as ShoeSec;
      const c = (b + t) / 2;
      const hh = (t - b) / 2;
      const pts = [-1, -0.5, 0, 0.5, 1].map((k): [number, number, number] => {
        const x = k * 0.5 * hw;
        return [x, c + hh * (1 - Math.abs(x / hw) ** n) ** (1 / n) + 0.0018, u - k * k * 0.004];
      });
      return tube(pts, q === 3 ? 0.0022 : 0.0028, 6, q === 3 ? 4 : 3);
    });
  const laces = q === 0 ? [] : laceArcs(SNEAKER, [0.03, 0.05, 0.07, 0.09], 2.6);
  /*
   * High-tops (docs/wardrobe-plan.md Phase 5): the sneaker's own lower half (so its stripe and mark fit as they are),
   * the collar carried up round the ankle, highest at the back, a padded rim round the opening, the tongue standing up
   * at the front, laces up the instep to the collar
   */
  const HIGHTOP: ShoeSec[] = up([
    [-0.065, 0.029, 0.015, 0.155],
    [-0.058, 0.04, 0.015, 0.168],
    [-0.03, 0.044, 0.015, 0.172],
    [0.0, 0.045, 0.015, 0.162],
    [0.035, 0.045, 0.015, 0.105],
    [0.07, 0.045, 0.016, 0.074],
    [0.105, 0.044, 0.017, 0.058],
    ...toe(0.105, 0.065, [0.044, 0.017, 0.058], 0.004),
  ]);
  const hightop = shoe(HIGHTOP, SG, 2.6, SS);
  const hightopSole = shoe(sole(HIGHTOP, 0.003, 0.009, 0.006), SG, 3, SS);
  const hightopLaces = q === 0 ? [] : laceArcs(HIGHTOP, [0.012, 0.03, 0.048, 0.066, 0.084], 2.6);
  // (the padded rim: round the opening at the collar's top, a touch inside its outline)
  const hightopCollar = (() => {
    const pts: [number, number, number][] = [];
    const n = q === 3 ? 20 : 12;
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI * 2;
      const u = -0.032 + 0.034 * Math.sin(a);
      const [, hw, , t] = secAt(HIGHTOP, u) as unknown as ShoeSec;
      pts.push([Math.cos(a) * hw * 0.82, t - 0.004 - 0.006 * Math.max(0, Math.sin(a)), u]);
    }
    return tube(pts, q === 3 ? 0.0055 : 0.0065, q === 3 ? 24 : 14, q === 3 ? 6 : 4);
  })();
  /*
   * Chunky runners (docs/wardrobe-plan.md Phase 5): a fuller upper on a thick two-layer sole (a midsole in white, the
   * outsole under it a band of dark), a heel counter and a toe mudguard laid over the upper a shade darker, laces, a
   * pull tab at the heel
   */
  const RUNNER: ShoeSec[] = up([
    [-0.068, 0.028, 0.03, 0.08],
    [-0.06, 0.041, 0.03, 0.1],
    [-0.03, 0.045, 0.03, 0.106],
    [0.0, 0.046, 0.03, 0.103],
    [0.035, 0.047, 0.03, 0.092],
    [0.07, 0.048, 0.031, 0.077],
    [0.105, 0.047, 0.032, 0.064],
    ...toe(0.105, 0.062, [0.047, 0.032, 0.064], 0.006),
  ]);
  // (the flat parts round fewer: on phones the soles; at every level the outsole and the panels, every other section
  // and not curved between them, so a pair costs about what the sneakers do)
  const SGF = q === 3 ? SG : R(12);
  const SGL = q === 3 ? R(12) : R(10);
  const lean = (secs: ShoeSec[]) => secs.filter((_, i) => i % 2 === 0 || i === secs.length - 1);
  const runner = shoe(RUNNER, SG, 2.6, SS);
  const runnerSole = shoe(sole(RUNNER, 0.007, 0.008, 0.01), SGF, 3, SS);
  const runnerOut = shoe(lean(sole(RUNNER, 0.0085, -0.021, 0.0115)), SGL, 3);
  /** A panel laid over the upper from `u0` to `u1`, `share` of the way up its side */
  const overlay = (secs: ShoeSec[], u0: number, u1: number, share: number) =>
    shoe(
      lean(secs.filter(([u]) => u >= u0 && u <= u1)).map(([u, hw, b, t]): ShoeSec => [u, hw + 0.0022, b - 0.001, b + (t - b) * share]),
      SGL,
      2.6
    );
  const runnerPanels = [overlay(RUNNER, -1, -0.012, 0.62), overlay(RUNNER, 0.07, 1, 0.55)];
  const runnerLaces = q === 0 ? [] : laceArcs(RUNNER, q === 3 ? [0.025, 0.045, 0.065, 0.085] : [0.03, 0.055, 0.08], 2.6);
  const runnerTab = new THREE.BoxGeometry(0.012, 0.022, 0.005).translate(0, G + 0.098, -0.07);
  /*
   * Slides (docs/wardrobe-plan.md Phase 5): worn over white socks, as on the street: the sock's foot on a contoured
   * footbed, a wide strap over the instep; the sock is the shoe's shell, so the hems go into it as into any shoe
   */
  const SOCK_FOOT: ShoeSec[] = up([
    [-0.064, 0.025, 0.014, 0.07],
    [-0.056, 0.035, 0.014, 0.086],
    [-0.03, 0.039, 0.014, 0.092],
    [0.0, 0.04, 0.014, 0.082],
    [0.035, 0.041, 0.014, 0.064],
    [0.07, 0.042, 0.014, 0.048],
    [0.1, 0.041, 0.014, 0.038],
    ...toe(0.1, 0.055, [0.041, 0.014, 0.038], 0.0),
  ]);
  const sockFoot = shoe(SOCK_FOOT, SG, 2.4, SS);
  const footbed = shoe(sole(SOCK_FOOT, 0.008, 0.004, 0.012), SGF, 3, SS);
  const slideSole = shoe(lean(sole(SOCK_FOOT, 0.0088, -0.008, 0.0125)), SGL, 3);
  const slideStrap = shoe(
    SOCK_FOOT.filter(([u]) => u >= 0.0 && u <= 0.075).map(([u, hw, b, t]): ShoeSec => [u, hw + 0.007, b - 0.004, t + 0.007]),
    SG,
    2.4,
    SS
  );

  /*
   * Work boots (docs/wardrobe-plan.md Phase 6): the fatigues' boot's last up over the ankle, a toe cap laid over it a
   * shade darker, laces up the instep, a padded collar round the opening, a heel tab, on a deep lugged sole
   */
  // (round the ankle the high-top's own line, the instep falling away in front of the shin: with the fatigues' boot's
  // taller, wider front the shin tipped it into every trouser leg at a crouch; a chunkier toe past the ball of the foot)
  const WORKBOOT: ShoeSec[] = up([
    [-0.066, 0.029, 0.018, 0.15],
    [-0.058, 0.039, 0.018, 0.164],
    [-0.03, 0.043, 0.018, 0.168],
    [0.0, 0.044, 0.018, 0.156],
    [0.035, 0.045, 0.018, 0.104],
    [0.07, 0.046, 0.018, 0.08],
    [0.105, 0.047, 0.019, 0.07],
    ...toe(0.105, 0.064, [0.047, 0.019, 0.07], 0.004),
  ]);
  const workBoot = shoe(WORKBOOT, SG, 2.8, SS);
  const workBootSole = shoe(sole(WORKBOOT, 0.005, 0.008, 0.008), SGF, 3.2, SS);
  const workBootCap = overlay(WORKBOOT, 0.105, 1, 0.8);
  const workBootLaces = q === 0 ? [] : laceArcs(WORKBOOT, q === 3 ? [0.012, 0.03, 0.048, 0.066, 0.084] : [0.015, 0.05, 0.085], 2.8);
  const workBootCollar = (() => {
    const pts: [number, number, number][] = [];
    const n = q === 3 ? 20 : 12;
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI * 2;
      const u = -0.03 + 0.034 * Math.sin(a);
      const [, hw, , t] = secAt(WORKBOOT, u) as unknown as ShoeSec;
      pts.push([Math.cos(a) * hw * 0.84, t - 0.004 - 0.005 * Math.max(0, Math.sin(a)), u]);
    }
    return tube(pts, q === 3 ? 0.006 : 0.007, q === 3 ? 24 : 14, q === 3 ? 6 : 4);
  })();

  // (the side stripe laid along the shoe's own side, rising to the heel: a straight plate stood off where the side
  // curves in at the heel and the toe; docs/wardrobe-plan.md Phase 5)
  const swoop = [-1, 1].map((s) => {
    const pts: [number, number, number][] = [];
    for (let u = -0.025; u <= 0.1001; u += 0.0125) {
      const [, hw, b, t] = secAt(SNEAKER, u) as unknown as ShoeSec;
      const c = (b + t) / 2;
      const hh = (t - b) / 2;
      const y = G + 0.04 + 0.15 * (0.1 - u);
      pts.push([s * (hw * Math.max(0, 1 - Math.abs((y - c) / hh) ** 2.6) ** (1 / 2.6) + 0.0016), y, u]);
    }
    return tube(pts, q === 3 ? 0.0024 : 0.003, q === 3 ? 12 : 8, 4);
  });
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
  /*
   * Loafers and derbies (docs/wardrobe-plan.md Phase 7), on the dress shoe's last. The loafer: cut lower round the
   * ankle, a moc-toe seam round the front of the vamp and a saddle strap across it. The derby: the quarters laid open
   * over the vamp, laced across, on a heavier sole
   */
  const LOAFER: ShoeSec[] = DRESS.map(([u, hw, b, t]): ShoeSec => [u, hw, b, t - 0.008 * Math.max(0, 1 - Math.abs(u + 0.01) / 0.06)]);
  const loafer = shoe(LOAFER, SG, 2.4, SS);
  const loaferStrap = overlay(
    LOAFER.filter(([u]) => u >= 0.03 && u <= 0.062),
    -1,
    1,
    1.0
  );
  const mocSeam = (() => {
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI * (k / 10);
      const u = 0.07 + 0.06 * Math.sin(a);
      const [, hw, b, t] = secAt(LOAFER, u) as unknown as ShoeSec;
      const x = Math.cos(a) * hw * 0.62;
      const c = (b + t) / 2;
      const hh = (t - b) / 2;
      pts.push([x, c + hh * Math.max(0, 1 - Math.abs(x / hw) ** 2.4) ** (1 / 2.4) + 0.0012, u]);
    }
    return tube(pts, q === 3 ? 0.0016 : 0.002, q === 3 ? 16 : 10, 3);
  })();
  const derbyQuarters = overlay(DRESS, -1, 0.06, 0.92);
  const derbyLaces = q === 0 ? [] : laceArcs(DRESS, q === 3 ? [0.03, 0.045, 0.06] : [0.035, 0.055], 2.4);
  const derbySole = shoe(sole(DRESS, 0.003, 0.007, 0.006, 0.008), SGF, 3, SS);
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

  /* ----- Held things (the crowd's phones and shopping bags; the player's hands hold only weapons) ----- */
  // In the hand's own space (the socket in the palm; the palm is the right hand's -x side, facing his thigh,
  // the thumb +z), in the hand as it closes to hold (docs/clothing-plan.md Phase 5): a handle's bar in the
  // fingers' hook (`HOOK`), the thing hanging under it
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

  /* ----- The varsity and the puffer ----- */
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

  /*
   * The bomber (docs/wardrobe-plan.md Phase 5): the jacket's body a little fuller (a padded flight jacket), a ribbed
   * stand collar, ribbed cuffs and a ribbed hem it blouses over, a zip up the front with its pull, and the small zip
   * pocket high on one sleeve (the other sleeve keeps the merch's mark)
   */
  const BK = smooth(grow(JACKET, 1.05));
  const bomberFront = surface(BK, SN);
  const bomberBody = loft(BK, TOP_RINGS, SN);
  const bomberHem = ribBand(-0.098, -0.046, 0.152, 0.102, 0, TOP_RINGS, SN).band;
  const bomberCollar = ribBand(0.398, 0.442, 0.068, 0.062, -0.004, R(16)).band;
  const bomberCuff = ribBand(-0.212, -0.17, 0.039, 0.041, 0.001, R(14)).band;
  const bomberZip = [
    tape(-0.005, 0.005, -0.044, 0.398, 0.004, bomberFront, 0.001),
    rb(0.012, 0.02, 0.006, 0.002, 0, 0.372, bomberFront(0, 0.372) + 0.007),
  ];
  const bomberPocket = (() => {
    const side = sideSurface(grow(LOOSE_U, 1.14));
    const x = side(0.004, -0.072) + 0.0032;
    return [rb(0.007, 0.05, 0.036, 0.0025, -x, -0.072, 0.004), rb(0.004, 0.003, 0.03, 0.001, -x - 0.003, -0.05, 0.004)];
  })();

  /*
   * The coach jacket (docs/wardrobe-plan.md Phase 5): a light unpadded shell on the jacket's lines, hanging straight to a
   * drawcord hem (its channel a band round the bottom, a cord and toggle at each side), a fold-over collar on a low
   * stand, snaps down a placket, the sleeves gathered into plain elastic cuffs
   */
  const CK = smooth(grow(JACKET, 1.025));
  const coachFront = surface(CK, SN);
  const coachBody = loft(CK, TOP_RINGS, SN);
  const coachHem = (() => {
    const [, hw, hd] = secAt(CK, -0.08);
    return loft(
      [
        [-0.09, hw + 0.0025, hd + 0.0025, 0],
        [-0.07, hw + 0.0025, hd + 0.0025, 0],
      ],
      TOP_RINGS,
      SN
    );
  })();
  const coachStand = ribBand(0.398, 0.43, 0.066, 0.06, -0.004, R(16)).band;
  crisp = true;
  const COACH_COLLAR: [number, number][] = [
    [-0.074, 0.412],
    [-0.012, 0.399],
    [-0.03, 0.338],
    [-0.098, 0.37],
  ];
  // (as thick as the suit's lapels and lifted off the front, so its edges ink)
  const coachCollar = [onBody(COACH_COLLAR, 0.007, coachFront, 0.003), onBody(mirror(COACH_COLLAR), 0.007, coachFront, 0.003)];
  crisp = false;
  const coachPlacket = tape(-0.011, 0.011, -0.07, 0.392, 0.003, coachFront, 0.001);
  const coachSnaps = [0.04, 0.13, 0.22, 0.31].map((y) => new THREE.CylinderGeometry(0.0065, 0.0065, 0.004, R(10)).rotateX(Math.PI / 2).translate(0, y, coachFront(0, y) + 0.006));
  // (the drawcord out of the hem's channel at each side, a toggle on its end)
  const toggles = (front: (x: number, y: number) => number) =>
    [-1, 1].flatMap((s) => {
      const x = s * 0.1;
      const z = front(x, -0.08) + 0.004;
      return [rb(0.003, 0.022, 0.003, 0.001, x, -0.096, z), rb(0.011, 0.016, 0.009, 0.003, x, -0.112, z)];
    });
  const coachToggles = toggles(coachFront);
  /** A hem's band round a body (a drawcord's channel, a waistband) from `y0` to `y1`, `out` proud of its widest */
  const hemBand = (secs: Sec[], n: number, y0: number, y1: number, out: number) => {
    const [, hw, hd] = secAt(secs, Math.min(...secs.map(([y]) => y)));
    return loft(
      [
        [y0, hw + out, hd + out, 0],
        [y1, hw + out, hd + out, 0],
      ],
      TOP_RINGS,
      n
    );
  };

  /*
   * The technical shell (docs/wardrobe-plan.md Phase 5): a rain shell a little fuller than the coach, a tall funnel
   * collar fuller at the back where its hood packs away, a storm flap over the zip up the front and the collar, taped
   * seams (a yoke across the chest, the side panels, along the top of each sleeve) a shade lighter than the cloth, a
   * zipped chest pocket, a drawcord hem and a tab at each cuff
   */
  const SHK = smooth(grow(JACKET, 1.04));
  const shellFront = surface(SHK, SN);
  const shellBody = loft(SHK, TOP_RINGS, SN);
  const SHELL_COLLAR: Sec[] = [
    [0.37, 0.1, 0.078, -0.004],
    [0.4, 0.095, 0.082, -0.006],
    [0.43, 0.09, 0.083, -0.009],
    [0.456, 0.085, 0.079, -0.011],
    [0.466, 0.078, 0.072, -0.011],
    [0.47, 0.068, 0.062, -0.011],
  ];
  const shellCollarFront = surface(SHELL_COLLAR, 2.2);
  const shellCollar = loft(SHELL_COLLAR, R(18), 2.2);
  /** The shell's outside at the front: its body, and its collar where that stands proud */
  const shellUp = (x: number, y: number) => Math.max(shellFront(x, y), y >= 0.37 ? shellCollarFront(x, y) : -1);
  const shellHem = hemBand(SHK, SN, -0.09, -0.07, 0.0025);
  const shellFlap = tape(-0.003, 0.024, -0.075, 0.464, 0.004, shellUp, 0.002);
  crisp = true;
  const shellTape = one([
    onBody(
      [
        [-0.135, 0.331],
        [0.135, 0.331],
        [0.135, 0.335],
        [-0.135, 0.335],
      ],
      0.0012,
      shellFront,
      0.0006
    ),
    ...[-1, 1].map((s) => tape(s * 0.12 - 0.0018, s * 0.12 + 0.0018, -0.07, 0.3, 0.0012, shellFront, 0.0006)),
  ]);
  crisp = false;
  const shellPocket = tape(-0.088, -0.083, 0.19, 0.29, 0.002, shellFront, 0.001);
  const shellPull = rb(0.008, 0.014, 0.004, 0.0015, -0.0855, 0.279, shellFront(-0.0855, 0.279) + 0.004);
  const shellToggles = toggles(shellFront);
  const shellArmTape = [-1, 1].map((s) => mergeGeometries(stripe(grow(LOOSE_U, 1.14), s, 0.0, -0.2, 2, [0], 0.0022))!);
  const shellForeTape = [-1, 1].map((s) => mergeGeometries(stripe(grow(LOOSE_F, 1.14), s, 0.0, -0.17, 2, [0], 0.0022))!);
  // (a tab across the outside of each cuff)
  const shellTabs = [-1, 1].map((s) => rb(0.004, 0.022, 0.016, 0.0015, s * 0.0375, -0.193, 0.001));

  /*
   * The trucker jacket (docs/wardrobe-plan.md Phase 5): a denim jacket's lines on the jacket's body, a buttoned
   * waistband with an adjuster tab at each side, a point collar on a stand, a buttoned placket, two chest pockets
   * under pointed button flaps, the yoke's seams rising from the placket to the shoulders, a pleat seam from each
   * pocket down to the band, buttoned cuffs; the buttons in copper
   */
  const DK = smooth(grow(JACKET, 1.03));
  const truckerFront = surface(DK, SN);
  const truckerBody = loft(DK, TOP_RINGS, SN);
  const truckerBand = hemBand(DK, SN, -0.091, -0.052, 0.003);
  const truckerStand = ribBand(0.398, 0.428, 0.065, 0.059, -0.004, R(16)).band;
  const COPPER = '#b07a3c';
  crisp = true;
  const TRUCKER_COLLAR: [number, number][] = [
    [-0.078, 0.413],
    [-0.012, 0.399],
    [-0.026, 0.328],
    [-0.106, 0.364],
  ];
  const truckerCollar = [onBody(TRUCKER_COLLAR, 0.007, truckerFront, 0.003), onBody(mirror(TRUCKER_COLLAR), 0.007, truckerFront, 0.003)];
  const truckerFlaps = [-1, 1].map((s) => {
    const x = s * 0.072;
    return onBody(
      [
        [x - 0.034, 0.3],
        [x + 0.034, 0.3],
        [x + 0.034, 0.276],
        [x, 0.262],
        [x - 0.034, 0.276],
      ],
      0.005,
      truckerFront,
      0.002
    );
  });
  const YOKE: [number, number][] = [
    [0.014, 0.312],
    [0.14, 0.333],
    [0.14, 0.337],
    [0.014, 0.316],
  ];
  const truckerSeams = [
    onBody(YOKE, 0.0012, truckerFront, 0.0006),
    onBody(mirror(YOKE), 0.0012, truckerFront, 0.0006),
    ...[-1, 1].map((s) => tape(s * 0.072 - 0.0012, s * 0.072 + 0.0012, -0.052, 0.26, 0.0012, truckerFront, 0.0006)),
  ];
  crisp = false;
  const truckerPlacket = tape(-0.013, 0.013, -0.052, 0.392, 0.003, truckerFront, 0.001);
  const stud = (x: number, y: number, z: number) => new THREE.CylinderGeometry(0.0068, 0.0068, 0.004, R(10)).rotateX(Math.PI / 2).translate(x, y, z);
  const truckerButtons = [
    stud(0, -0.071, truckerFront(0, -0.071) + 0.008),
    ...[0.02, 0.11, 0.2, 0.29, 0.37].map((y) => stud(0, y, truckerFront(0, y) + 0.006)),
    ...[-1, 1].map((s) => stud(s * 0.072, 0.27, truckerFront(s * 0.072, 0.27) + 0.009)),
    ...[-1, 1].map((s) => stud(s * 0.112, -0.071, truckerFront(s * 0.112, -0.071) + 0.008)),
  ];
  const truckerTabs = [-1, 1].map((s) => rb(0.032, 0.012, 0.004, 0.0015, s * 0.124, -0.071, truckerFront(s * 0.124, -0.071) + 0.005));
  const truckerCuff = loft(
    [
      [-0.21, 0.036, 0.038, 0.001],
      [-0.178, 0.039, 0.041, 0.001],
    ],
    R(14)
  );
  const cuffButtons = [-1, 1].map((s) => new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, R(10)).rotateZ(Math.PI / 2).translate(s * 0.0405, -0.194, 0.006));

  /* ----- Work wear (docs/wardrobe-plan.md Phase 6) ----- */
  /** Reflective tape: a fixed silver, under white so it never blooms */
  const TAPE = '#c4c8d4';
  /** A band round a body from `y0` to `y1`, `out` proud of it at each height (open: its ends would only be hidden) */
  const ring = (secs: Sec[], n: number, y0: number, y1: number, out: number, seg = TOP_RINGS) => {
    const at = (y: number): Sec => {
      const [, hw, hd, z = 0] = secAt(secs, y);
      return [y, hw + out, hd + out, z];
    };
    return loft([at(y0), at(y1)], seg, n, true);
  };
  /** Tape up the front from `y0` over the chest to `y1`, either side of the middle at `x` */
  const braces = (front: (x: number, y: number) => number, x: number, y0: number, y1: number) =>
    [-1, 1].map((s) => tape(s * x - 0.009, s * x + 0.009, y0, y1, 0.0015, front, 0.0012));
  const sleeveTape = (secs: Sec[], y: number, seg: number) => ring(grow(secs, 1.14), 2, y - 0.009, y + 0.009, 0.0016, seg);
  /*
   * The hi-vis vest: over a long-sleeve in the look's shirt colour (as the puffer vest), on the hoodie's roomy body
   * (the shape every bottoms sits under), a V at the neck showing the shirt, the closure down the front, two bands of
   * reflective tape round the body and two up the front over the shoulders
   */
  const hivisV = (() => {
    crisp = true;
    const g = onBody(
      [
        [-0.052, 0.408],
        [0, 0.318],
        [0.052, 0.408],
      ],
      0.003,
      hoodieFront,
      0.001
    );
    crisp = false;
    return g;
  })();
  const hivisTape = one([ring(HK, HN2, 0.045, 0.067, 0.002), ring(HK, HN2, 0.115, 0.137, 0.002), ...braces(hoodieFront, 0.075, 0.137, 0.37)]);
  const hivisClosure = tape(-0.003, 0.003, -0.085, 0.318, 0.002, hoodieFront, 0.0008);
  /*
   * The hi-vis jacket: the jacket's lines 3.5% fuller, a stand collar and a zip, two bands of tape round the body low
   * down, two up the front over the shoulders, two round each sleeve
   */
  const HJK = smooth(grow(JACKET, 1.035));
  const hjFront = surface(HJK, SN);
  const hjBody = loft(HJK, TOP_RINGS, SN);
  const hjCollar = ribBand(0.396, 0.44, 0.067, 0.061, -0.004, R(16)).band;
  const hjZip = tape(-0.005, 0.005, -0.08, 0.398, 0.004, hjFront, 0.001);
  const hjTape = one([ring(HJK, SN, -0.01, 0.01, 0.0022), ring(HJK, SN, 0.06, 0.08, 0.0022), ...braces(hjFront, 0.072, 0.08, 0.37)]);
  const hjArmTape = sleeveTape(LOOSE_U, -0.1, R(14));
  const hjForeTape = sleeveTape(LOOSE_F, -0.12, R(14));
  /*
   * The chore coat: a work jacket in heavy canvas on the jacket's lines, a point collar on a stand, dark buttons down a
   * placket, three patch pockets (one on the chest, two at the hips), plain cuffs with a button
   */
  const CHK = smooth(grow(JACKET, 1.035));
  const choreFront = surface(CHK, SN);
  const choreBody = loft(CHK, TOP_RINGS, SN);
  const choreStand = ribBand(0.398, 0.428, 0.065, 0.059, -0.004, R(16)).band;
  const HORN_DARK = '#3a2418';
  crisp = true;
  const choreCollar = [onBody(TRUCKER_COLLAR, 0.007, choreFront, 0.003), onBody(mirror(TRUCKER_COLLAR), 0.007, choreFront, 0.003)];
  const pocketAt = (x: number, y: number, w: number, h: number) =>
    onBody(
      [
        [x - w / 2, y - h / 2],
        [x + w / 2, y - h / 2],
        [x + w / 2, y + h / 2],
        [x - w / 2, y + h / 2],
      ],
      0.004,
      choreFront,
      0.0015
    );
  const chorePockets = [pocketAt(0.075, 0.24, 0.062, 0.07), pocketAt(-0.085, 0.015, 0.08, 0.085), pocketAt(0.085, 0.015, 0.08, 0.085)];
  crisp = false;
  const chorePlacket = tape(-0.013, 0.013, -0.085, 0.392, 0.003, choreFront, 0.001);
  const choreButtons = [0.01, 0.1, 0.19, 0.28, 0.37].map((y) => stud(0, y, choreFront(0, y) + 0.006));
  /*
   * Coveralls: one piece, its legs its own (`bottomsOf()` says none): the jacket's body with a zip to the collar, a
   * point collar, two zipped chest pockets, a belt of the cloth at the waist; the legs the work trousers' cut in the
   * same colour, hemmed
   */
  const CVK = smooth(grow(JACKET, 1.035));
  const cvFront = surface(CVK, SN);
  const cvBody = loft(CVK, TOP_RINGS, SN);
  crisp = true;
  const cvCollar = [onBody(TRUCKER_COLLAR, 0.007, cvFront, 0.003), onBody(mirror(TRUCKER_COLLAR), 0.007, cvFront, 0.003)];
  // (each chest pocket's zip, a line across)
  const cvPockets = [-1, 1].map((s) =>
    onBody(
      [
        [s * 0.075 - 0.026, 0.267],
        [s * 0.075 + 0.026, 0.267],
        [s * 0.075 + 0.026, 0.272],
        [s * 0.075 - 0.026, 0.272],
      ],
      0.002,
      cvFront,
      0.001
    )
  );
  crisp = false;
  const cvZip = tape(-0.005, 0.005, -0.08, 0.398, 0.004, cvFront, 0.001);
  const cvBelt = ring(CVK, SN, 0.0, 0.032, 0.0025);

  /*
   * The heavyweight tee (docs/wardrobe-plan.md Phase 5): the hoodie's roomy body without its hood, pouch or ribbing,
   * a stitched hem, a ribbed crew neck, boxy short sleeves to mid-arm with a hem of their own, and his arms bare under
   * them (`BARE_U`, `BARE_F`: slimmer than any sleeve, the forearm tapering into the hand's wrist)
   */
  const teeHem = (() => {
    const [, hw, hd] = secAt(HOODIE, -0.085);
    return loft(
      [
        [-0.091, hw + 0.0018, hd + 0.0018, 0],
        [-0.075, hw + 0.0018, hd + 0.0018, 0],
      ],
      TOP_RINGS,
      HN2
    );
  })();
  const teeNeck = loft(
    [0.401, 0.409, 0.417, 0.426].map((y): Sec => {
      const [, hw, hd, z = 0] = secAt(HK, Math.min(y, 0.422));
      return [y, hw + 0.003, hd + 0.003, z];
    }),
    TOP_RINGS,
    HN2
  );
  const TEE_U: Sec[] = [...grow(LOOSE_U, 1.16).filter(([y]) => y > -0.11), [-0.13, 0.0565, 0.0575, 0]];
  const teeSleeve = loft(TEE_U, R(14));
  const teeCuff = loft(
    [
      [-0.134, 0.0585, 0.0595, 0],
      [-0.118, 0.0585, 0.0595, 0],
    ],
    R(14)
  );
  const BARE_U: Sec[] = [
    [-0.03, 0.044, 0.046, 0.001],
    [-0.07, 0.043, 0.045, 0.001],
    [-0.12, 0.039, 0.041, 0],
    [-0.17, 0.035, 0.037, 0],
    [-0.215, 0.032, 0.034, 0],
    [-0.238, 0.026, 0.028, 0],
  ];
  const BARE_F: Sec[] = [
    [0.022, 0.025, 0.027, 0],
    [0.0, 0.032, 0.034, 0.001],
    [-0.04, 0.035, 0.036, 0.002],
    [-0.1, 0.031, 0.032, 0.004],
    [-0.16, 0.026, 0.028, 0.009],
    [-0.212, 0.0225, 0.024, 0.013],
  ];
  const bareUpper = loft(q === 3 ? curve(BARE_U, 0.015) : BARE_U, R(12));
  const bareFore = loft(q === 3 ? curve(BARE_F, 0.015) : BARE_F, R(12));

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
  /*
   * The quilting's stitched seams (docs/wardrobe-plan.md Phase 5, the dark-outfit fix): a thin band in each pinch
   * between the baffles, a shade off the cloth, so the quilting reads in any colour (in black the baffles' shape
   * alone was lost)
   */
  const seamsAt = (secs: Sec[], from: number, to: number, step: number, fat: number, seg: number, n: number) => {
    const out: THREE.BufferGeometry[] = [];
    for (let y = from + step; y < to - 1e-6; y += step) {
      const [, hw, hd, z = 0] = secAt(secs, y);
      const k = fat * 0.92;
      out.push(
        loft(
          [
            [y - 0.0016, hw * k + 0.0012, hd * k + 0.0012, z],
            [y + 0.0016, hw * k + 0.0012, hd * k + 0.0012, z],
          ],
          seg,
          n,
          true
        )
      );
    }
    return out;
  };
  const pufferSeams = one(seamsAt(HOODIE, -0.08, 0.36, 0.064, 1.18, TOP_RINGS, HN2));
  const pufferArmSeams = one(seamsAt(UPPER_S, -0.22, 0.0, 0.055, 1.4, R(14), 2));
  const pufferForeSeams = one(seamsAt(FORE_S, -0.19, 0.0, 0.055, 1.35, R(14), 2));


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
  /**
   * The chain with the hood up (docs/wardrobe-plan.md Phase 3): from each arm by the ear forward inside the hood along
   * the cheek, out through its opening by the jaw, down in front of the neck and over the hood's V at the throat onto
   * the hoodie's chest
   */
  const chainHood = (() => {
    // (a little further off the chest than on the plain hoodie: the hood's cloth lies over the sweater there)
    const lift = (x: number) => 0.012 + 0.01 * Math.max(0, 1 - Math.abs(x) / 0.035);
    const on = (x: number, y: number): [number, number, number] => [x, y - HEAD_Y, hoodieFront(x, y) + lift(x)];
    const side = (s: number): [number, number, number][] => [
      armHook(s),
      [s * 0.084, 0.1, 0.03],
      [s * 0.074, 0.06, 0.074],
      [s * 0.05, 0.015, 0.088],
      [s * 0.034, -0.03, 0.1],
      // (over the hood's V where it meets the sweater, then down the chest)
      [s * 0.038, -0.048, 0.1],
      on(s * 0.04, 0.392),
      on(s * 0.039, 0.378),
      on(s * 0.035, 0.362),
      on(s * 0.03, 0.35),
    ];
    return tube([...side(-1), on(0, 0.34), ...side(1).reverse()], 0.0035, R(48), q === 3 ? 6 : 4);
  })();
  const collarFront = surface(PUFFER_COLLAR, 2.2);
  const CHAINS: [OutfitKind, THREE.BufferGeometry][] = [
    ['suit', chainOn(suitFront, 0.012)],
    ['hoodie', chainOn(hoodieFront)],
    ['track', chainOn(trackFront)],
    ['varsity', chainOn(varsityFront)],
    ['bomber', chainOn(bomberFront, 0.003)],
    ['coach', chainOn(coachFront, 0.006)],
    ['tee', chainOn(hoodieFront)],
    ['shell', chainOn(shellUp, 0.006)],
    ['trucker', chainOn(truckerFront, 0.007)],
    ['hivis', chainOn(hoodieFront, 0.004)],
    ['hivisjacket', chainOn(hjFront, 0.004)],
    ['chore', chainOn(choreFront, 0.007)],
    ['coveralls', chainOn(cvFront, 0.007)],
    // (over the open collar where it lies on the lapels)
    ['blazer', chainOn(suitFront, 0.018)],
    ['shirt', chainOn(shirtFront2, 0.004)],
    ['double', chainOn(suitFront, 0.016)],
    ['waistcoat', chainOn(wkFront, 0.012)],
    ['overcoat', chainOn(ocFront, 0.016)],
    // (over the puffer's high collar where it stands)
    ['puffer', chainOn((x, y) => Math.max(pufferFront(x, y), y >= 0.395 ? collarFront(x, y) : 0))],
  ];
  // (the vest's body is the puffer's: the same chain)
  CHAINS.push(['vest', CHAINS.find(([k]) => k === 'puffer')![1]]);

  /* ----- What's worn over a top (docs/clothing-plan.md Phase 5): each on that top's own outline ----- */
  // Per top: its sections and roundness (its collar's too), how far its laid-on pieces stand on the front, and
  // how far out from the neck its shoulder straps go over (the puffer's high collar pushes them out)
  const TORSOS: { kind: OutfitKind; shells: [Sec[], number][]; over: number; strapX: number }[] = [
    { kind: 'suit', shells: [[JK, SN]], over: 0.012, strapX: 0.085 },
    { kind: 'hoodie', shells: [[HK, HN2]], over: 0, strapX: 0.118 },
    { kind: 'track', shells: [[TK, HN2]], over: 0.002, strapX: 0.085 },
    { kind: 'varsity', shells: [[VK, SN]], over: 0.003, strapX: 0.085 },
    { kind: 'bomber', shells: [[BK, SN]], over: 0.004, strapX: 0.088 },
    { kind: 'coach', shells: [[CK, SN]], over: 0.006, strapX: 0.088 },
    { kind: 'tee', shells: [[HK, HN2]], over: 0, strapX: 0.118 },
    { kind: 'shell', shells: [[SHK, SN], [SHELL_COLLAR, 2.2]], over: 0.006, strapX: 0.104 },
    { kind: 'trucker', shells: [[DK, SN]], over: 0.007, strapX: 0.088 },
    { kind: 'hivis', shells: [[HK, HN2]], over: 0.004, strapX: 0.118 },
    { kind: 'hivisjacket', shells: [[HJK, SN]], over: 0.005, strapX: 0.088 },
    { kind: 'chore', shells: [[CHK, SN]], over: 0.007, strapX: 0.088 },
    { kind: 'coveralls', shells: [[CVK, SN]], over: 0.007, strapX: 0.088 },
    { kind: 'blazer', shells: [[JK, SN]], over: 0.018, strapX: 0.09 },
    { kind: 'shirt', shells: [[OXK, SN]], over: 0.004, strapX: 0.085 },
    { kind: 'double', shells: [[JK, SN]], over: 0.016, strapX: 0.09 },
    { kind: 'waistcoat', shells: [[WK, SN]], over: 0.012, strapX: 0.085 },
    { kind: 'overcoat', shells: [[OCK, SN]], over: 0.016, strapX: 0.1 },
    { kind: 'puffer', shells: [[[...PUFFER_S, ...PUFFER_BODY.slice(-2)], HN2], [PUFFER_COLLAR, 2.2]], over: 0, strapX: 0.124 },
    { kind: 'vest', shells: [[[...PUFFER_S, ...PUFFER_BODY.slice(-2)], HN2], [PUFFER_COLLAR, 2.2]], over: 0, strapX: 0.124 },
  ];
  /** A top's outline as tests: inside it, its middle (z) at a height, and the top of its shoulder at x */
  // (once per top: every strap and bag on it asks)
  const torsos = new Map<(typeof TORSOS)[number], ReturnType<typeof makeTorso>>();
  const torsoOf = (t: (typeof TORSOS)[number]) => {
    if (!torsos.has(t)) torsos.set(t, makeTorso(t));
    return torsos.get(t)!;
  };
  function makeTorso(t: (typeof TORSOS)[number]) {
    const [main, n] = t.shells[0];
    // (each shell sorted once: the straps ask hundreds of points of each)
    const shells = t.shells.map(([secs, k]) => [sorted(secs), k] as const);
    const mainSorted = sorted(main);
    const lo = mainSorted[0][0];
    const inside = (x: number, y: number, z: number) =>
      shells.some(([ss, k]) => {
        if (y < ss[0][0] || y > ss[ss.length - 1][0]) return false;
        const [, hw, hd, zc = 0] = secAtSorted(ss, y);
        return Math.abs(x / hw) ** k + Math.abs((z - zc) / hd) ** k < 1;
      });
    const mid = (y: number) => secAtSorted(mainSorted, Math.max(lo, y))[3] ?? 0;
    const tops = new Map<number, number>();
    const topAt = (x: number) => {
      let top = tops.get(x);
      if (top === undefined) {
        top = 0.2;
        for (let y = 0.5; y > 0.2; y -= 0.002)
          if (inside(x, y, mid(y))) {
            top = y;
            break;
          }
        tops.set(x, top);
      }
      return top;
    };
    return { inside, mid, topAt, front: surface(main, n), back: surface(main, n, -1) };
  }
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
  /*
   * The headphones round the neck, fitted to each top's collar (docs/wardrobe-plan.md Phase 5): they used to sit in one
   * place on every top, the cups a centimetre into a jacket's shoulders and three into the hoodie's rolled hood. Each
   * top lists what stands round its neck (`NECKS`: its collar's rings, the hood's roll, how far laid-on pieces stand
   * off its front), and `fitPhones()` lifts them, opens them out and tips their band back until none of them is in
   * the top's cloth: resting on the collar, as a pair round the neck does. The puffer's, the vest's and the shell's
   * high collars cover them: those tops have no line in `NECKS`, so no headphones.
   */
  type Neck = { rings: [y0: number, y1: number, hw: number, hd: number, z: number][]; roll?: boolean; margin: number };
  const NECKS: Partial<Record<OutfitKind, Neck>> = {
    suit: { rings: [[0.395, 0.433, 0.062, 0.062, -0.004]], margin: 0.012 },
    hoodie: { rings: [], roll: true, margin: 0.003 },
    track: { rings: [[0.393, 0.447, 0.068, 0.068, -0.004]], margin: 0.004 },
    varsity: { rings: [[0.398, 0.448, 0.068, 0.062, -0.004]], margin: 0.005 },
    bomber: { rings: [[0.396, 0.444, 0.07, 0.064, -0.004]], margin: 0.006 },
    coach: { rings: [[0.396, 0.432, 0.068, 0.062, -0.004]], margin: 0.012 },
    trucker: { rings: [[0.396, 0.43, 0.067, 0.061, -0.004]], margin: 0.012 },
    tee: { rings: [], margin: 0.006 },
    hivis: { rings: [], margin: 0.006 },
    hivisjacket: { rings: [[0.394, 0.442, 0.069, 0.063, -0.004]], margin: 0.006 },
    chore: { rings: [[0.396, 0.43, 0.067, 0.061, -0.004]], margin: 0.012 },
    coveralls: { rings: [], margin: 0.012 },
    blazer: { rings: [[0.395, 0.433, 0.062, 0.062, -0.004]], margin: 0.02 },
    shirt: { rings: [[0.396, 0.432, 0.064, 0.064, -0.004]], margin: 0.008 },
    double: { rings: [[0.395, 0.433, 0.062, 0.062, -0.004]], margin: 0.02 },
    waistcoat: { rings: [[0.396, 0.432, 0.064, 0.064, -0.004]], margin: 0.016 },
    overcoat: { rings: [[0.394, 0.454, 0.077, 0.07, -0.004]], margin: 0.02 },
  };
  const PHONE_PTS = (() => {
    const pts: THREE.Vector3[] = [];
    for (const g of [...headphones, ...cushions]) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i += 2) pts.push(new THREE.Vector3().fromBufferAttribute(p, i));
    }
    return pts;
  })();
  /** Where the headphones go on a top: raised `dy`, opened out by `spread` at the cups, the band tipped back `tilt` */
  const phoneAt = (dy: number, spread: number, tilt: number) =>
    new THREE.Matrix4()
      .makeTranslation(0, 0.43 + dy, 0)
      .multiply(new THREE.Matrix4().makeRotationX(tilt))
      .multiply(new THREE.Matrix4().makeTranslation(0, -0.43, 0))
      .multiply(new THREE.Matrix4().makeScale(1 + spread / 0.077, 1, 1));
  const fitPhones = (t: (typeof TORSOS)[number], neck: Neck) => {
    const o = torsoOf(t);
    const v = new THREE.Vector3();
    const rollPts = neck.roll ? Array.from({ length: 41 }, (_, i) => ({ c: rollAt(i / 40), r: rollR(i / 40) })) : [];
    const inCloth = (p: THREE.Vector3) => {
      const zc = o.mid(p.y);
      const r = Math.hypot(p.x, p.z - zc);
      const k = r > neck.margin ? (r - neck.margin) / r : 0;
      if (o.inside(p.x * k, p.y, zc + (p.z - zc) * k)) return true;
      for (const [y0, y1, hw, hd, z] of neck.rings) if (p.y > y0 && p.y < y1 && (p.x / (hw + 0.003)) ** 2 + ((p.z - z) / (hd + 0.003)) ** 2 < 1) return true;
      for (const { c, r: rr } of rollPts) if (p.distanceToSquared(c) < (rr + 0.003) ** 2) return true;
      return false;
    };
    let best: { m: THREE.Matrix4; cost: number } | null = null;
    for (const tilt of [0, 0.12, 0.24, 0.36])
      for (const spread of [0, 0.004, 0.008, 0.012])
        for (let dy = 0; dy <= 0.06 + 1e-9; dy += 0.002) {
          const cost = dy + spread * 0.5 + tilt * 0.02;
          if (best && cost >= best.cost) break;
          const m = phoneAt(dy, spread, tilt);
          if (!PHONE_PTS.some((p) => inCloth(v.copy(p).applyMatrix4(m)))) {
            best = { m, cost };
            break;
          }
        }
    return (best ?? { m: phoneAt(0.06, 0.012, 0.36) }).m;
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
    /*
     * The bags of Phase 5 (docs/wardrobe-plan.md): a sling bag diagonal on the back, its strap over the right shoulder
     * and down the chest to the left hip; a chest rig, a wide pouch on the chest on two shoulder straps that cross on
     * the back and a strap round the ribs; a waist bag worn across the chest, rising to the left shoulder. Each laid
     * clear of the top it's on (`seat()`: its back face off the cloth at every corner), zips and buckles on single
     * figures. The backpack and the duffel rebuilt (single figures): the backpack's grab handle, zips, a sternum strap
     * and side straps; the duffel's zip and pulls along its top, a wrap on its handle.
     */
    const detailed = q >= 2;
    /** How far out a box `w` by `h` turned `a` round its middle at (x, y) sits: its back face clear of the front (or the back) */
    const seat = (x: number, y: number, w: number, h: number, a: number, side: 1 | -1) => {
      let z = side > 0 ? -9 : 9;
      for (const u of [-0.5, 0, 0.5])
        for (const v of [-0.5, 0, 0.5]) {
          const px = x + Math.cos(a) * u * w - Math.sin(a) * v * h;
          const py = y + Math.sin(a) * u * w + Math.cos(a) * v * h;
          z = side > 0 ? Math.max(z, o.front(px, py) + t.over) : Math.min(z, o.back(px, py));
        }
      return z;
    };
    const placed = (g: THREE.BufferGeometry, a: number, x: number, y: number, z: number) => g.rotateZ(a).translate(x, y, z);
    // (zips, pulls and buckles: plain boxes, a dozen triangles each; a rounded box is hundreds)
    const bx = (w: number, h: number, d: number, _r = 0, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
    const pull = (x: number, y: number, z: number, a = 0) => placed(bx(0.007, 0.013, 0.004), a, x, y, z);
    // The sling: on the back, from high on the left (-x) down to the right
    const SA = -0.88;
    const [slX, slY, slW, slH, slD] = [0.01, 0.245, 0.2, 0.09, 0.05];
    const slZ = seat(slX, slY, slW, slH, SA, -1) - slD / 2 - 0.004;
    const slingBody = placed(rb(slW, slH, slD, 0.03), SA, slX, slY, slZ);
    const slingDetail = detailed
      ? [
          // (a zip along its outer face's top edge, its pull, and a small zipped pocket lower down)
          placed(bx(slW - 0.04, 0.0035, 0.003, 0.001), SA, slX - Math.sin(SA) * 0.022, slY + Math.cos(SA) * 0.022, slZ - slD / 2 - 0.001),
          pull(slX + Math.cos(SA) * 0.07 - Math.sin(SA) * 0.022, slY + Math.sin(SA) * 0.07 + Math.cos(SA) * 0.022, slZ - slD / 2 - 0.004, SA),
          placed(bx(0.09, 0.035, 0.006, 0.006), SA, slX + Math.sin(SA) * 0.014, slY - Math.cos(SA) * 0.014, slZ - slD / 2 - 0.002),
        ]
      : [];
    const slingStrap = strapOver(t, [
      [slX - Math.cos(SA) * 0.1, slY - Math.sin(SA) * 0.1, B],
      [-sx, top(-sx), o.mid(0.36)],
      [-0.085, 0.34, F],
      [0.02, 0.2, F],
      [0.12, 0.07, F],
      [0.155, 0.06, 0],
      [slX + Math.cos(SA) * 0.1, slY + Math.sin(SA) * 0.1, B],
    ], 0.008);
    // The chest rig: its pouch across the chest
    const [rgY, rgW, rgH, rgD] = [0.205, 0.2, 0.085, 0.045];
    const rgZ = seat(0, rgY, rgW, rgH, 0, 1) + rgD / 2 + 0.004;
    const rigBody = rb(rgW, rgH, rgD, 0.016, 0, rgY, rgZ);
    const rigDetail = detailed
      ? [
          // (two zips across its front, a pull on each, and a buckle where each side strap meets it)
          ...[0.022, -0.004].map((dy) => bx(rgW - 0.03, 0.0035, 0.003, 0.001, 0, rgY + dy, rgZ + rgD / 2 + 0.001)),
          ...[0.022, -0.004].map((dy, i) => pull((i ? -1 : 1) * 0.07, rgY + dy - 0.006, rgZ + rgD / 2 + 0.003)),
          ...[-1, 1].map((s) => bx(0.012, 0.024, 0.008, 0.002, s * (rgW / 2 + 0.006), rgY, rgZ - 0.004)),
        ]
      : [];
    const rigStraps = [-1, 1].flatMap((s) => [
      strapOver(t, [
        [s * 0.075, rgY + rgH / 2 - 0.004, F],
        [s * 0.085, 0.33, F],
        [s * sx, top(s * sx), o.mid(0.36)],
        [s * 0.07, 0.33, B],
        [-s * 0.03, 0.24, B],
        [-s * 0.11, 0.17, B],
      ], 0.007),
      strapOver(t, [
        [s * 0.04, 0.17, B],
        [s * 0.13, 0.19, B],
        [s * 0.16, 0.2, 0],
        [s * (rgW / 2 + 0.004), rgY, F],
      ], 0.006),
    ]);
    // The waist bag across the chest: rising to the left (+x) shoulder
    const WA = 0.42;
    const [wbX, wbY, wbW, wbH, wbD] = [0.015, 0.25, 0.17, 0.068, 0.05];
    const wbZ = seat(wbX, wbY, wbW, wbH, WA, 1) + wbD / 2 + 0.004;
    const waistBody = placed(rb(wbW, wbH, wbD, 0.026), WA, wbX, wbY, wbZ);
    const waistDetail = detailed
      ? [
          placed(bx(wbW - 0.04, 0.0035, 0.003, 0.001), WA, wbX - Math.sin(WA) * 0.016, wbY + Math.cos(WA) * 0.016, wbZ + wbD / 2 + 0.001),
          pull(wbX + Math.cos(WA) * 0.055 - Math.sin(WA) * 0.016, wbY + Math.sin(WA) * 0.055 + Math.cos(WA) * 0.016 - 0.006, wbZ + wbD / 2 + 0.003, WA),
          // (the strap's buckle where it comes off the bag's low end)
          placed(bx(0.026, 0.016, 0.007, 0.002), WA, wbX - Math.cos(WA) * (wbW / 2 + 0.03), wbY - Math.sin(WA) * (wbW / 2 + 0.03), seat(wbX - Math.cos(WA) * (wbW / 2 + 0.03), wbY - Math.sin(WA) * (wbW / 2 + 0.03), 0.03, 0.02, WA, 1) + 0.008),
        ]
      : [];
    const waistStrap = strapOver(t, [
      [wbX + Math.cos(WA) * (wbW / 2 - 0.01), wbY + Math.sin(WA) * (wbW / 2 - 0.01), F],
      [0.1, 0.34, F],
      [sx, top(sx), o.mid(0.36)],
      [0.08, 0.33, B],
      [-0.06, 0.18, B],
      [-0.14, 0.12, B],
      [-0.16, 0.13, 0],
      [wbX - Math.cos(WA) * (wbW / 2 - 0.01), wbY - Math.sin(WA) * (wbW / 2 - 0.01), F],
    ], 0.0075);
    // The backpack's single-figure detail
    const packZ = BK(0, 0.24) - 0.04;
    const packDetail = detailed
      ? [
          // (the grab handle over its top, the main zip round its top edge with two pulls, the front pocket's zip)
          tube([[-0.03, 0.362, packZ + 0.012], [-0.022, 0.382, packZ + 0.008], [0.022, 0.382, packZ + 0.008], [0.03, 0.362, packZ + 0.012]], 0.0045, R(10), 4),
          bx(0.16, 0.0035, 0.004, 0.001, 0, 0.352, packZ - 0.04),
          ...[-1, 1].map((s) => bx(0.004, 0.014, 0.008, 0.0015, s * 0.072, 0.344, packZ - 0.045)),
          bx(0.12, 0.0035, 0.004, 0.001, 0, 0.198, BK(0, 0.17) - 0.106),
          // (a compression strap down each side)
          ...[-1, 1].map((s) => bx(0.004, 0.17, 0.016, 0.0015, s * 0.107, 0.24, packZ)),
        ]
      : [];
    const sternum = detailed
      ? [
          strapOver(t, [
            [-0.1, 0.262, F],
            [0, 0.262, F],
            [0.1, 0.262, F],
          ], 0.0045, 0.006),
          bx(0.024, 0.014, 0.008, 0.002, 0, 0.262, o.front(0, 0.262) + t.over + 0.02),
        ]
      : [];
    // The duffel's: a zip along its top, two pulls, a wrap round the handle
    const duffelDetail = detailed
      ? [
          slung(tube([[0.036, -L + 0.03, -DR * 0.9 + 0.002], [0.036, L - 0.03, -DR * 0.9 + 0.002]], 0.0025, 4, 4)),
          ...[-0.05, 0.06].map((y) => slung(bx(0.012, 0.007, 0.004, 0.0015, 0.04, y, -DR * 0.92 - 0.004))),
          slung(bx(0.022, 0.034, 0.022, 0.008, 0, 0, -DR - 0.026)),
        ]
      : [];
    const is = (o: Outfit) => o.kind === t.kind;
    const k = t.kind;
    const phones = NECKS[k] ? fitPhones(t, NECKS[k]!) : null;
    return [
      ...(phones
        ? [
            {
              id: `headphones-${k}`,
              when: (o: Outfit) => !!o.headphones && is(o) && !(hoodie(o) && o.hood),
              pieces: [
                P('torso', one(headphones.map((g) => g.clone().applyMatrix4(phones))), 'headphones', { detail: true }),
                ...(cushions.length ? [P('torso', one(cushions.map((g) => g.clone().applyMatrix4(phones))), 'headphones', { shade: 0.45, detail: true })] : []),
              ],
            },
          ]
        : []),
      ...(k === 'puffer' || k === 'vest' || k === 'shell'
        ? []
        : [
            { id: `necklace-${k}`, when: (o: Outfit) => !!o.necklace && is(o) && !pendantOf(o), pieces: [P('torso', one(necklace), GOLD), P('torso', pendant, '#9ff8ff')] },
            // A character's own pendant on the chain in the diamond's place (docs/characters-plan.md: Smilex's PulseChain symbol)
            ...(heads && q >= 2
              ? heads.ids.flatMap((id): Item[] => {
                  const parts = heads!.pendant(id, q as 2 | 3);
                  if (!parts) return [];
                  const at = new THREE.Matrix4().makeTranslation(0, 0.258, o.front(0, 0.258) + t.over + 0.012);
                  return [
                    {
                      id: `necklace-${id}-${k}`,
                      when: (o: Outfit) => !!o.necklace && is(o) && o.character === id,
                      // (his own chain where he has one: Smilex's chunky curb links, along the cord's own path)
                      pieces: [
                        P('torso', one(heads!.chain(id, q as 2 | 3, (necklace[0] as THREE.TubeGeometry).parameters.path) ?? necklace), GOLD),
                        ...parts.map((h) => P('torso', one(h.geos.map((g) => g.clone().applyMatrix4(at))), h.color)),
                      ],
                    },
                  ];
                })
              : []),
          ]),
      {
        id: `backpack-${k}`,
        when: (o) => !!o.backpack && is(o),
        pieces: [
          P('torso', one(backpack), 'backpack', CHEST),
          ...(detailed ? [P('torso', one(packDetail), 'backpack', { shade: 0.7, detail: true, ...CHEST }), P('torso', one(sternum), 'backpack', { shade: 0.6, detail: true })] : []),
        ],
      },
      { id: `crossbody-${k}`, when: (o) => !!o.crossbody && is(o), pieces: [P('torso', one(crossbody), 'crossbody')] },
      {
        id: `board-${k}`,
        when: (o) => !!o.board && is(o),
        pieces: [P('torso', deck, 'board', CHEST), P('torso', one(trucks), '#8b889c', { detail: true, ...CHEST }), P('torso', one(wheels), WHITE, { detail: true, ...CHEST })],
      },
      {
        id: `duffel-${k}`,
        when: (o) => !!o.duffel && is(o),
        pieces: [
          P('torso', one([duffelBody, duffelHandle]), 'duffel', CHEST),
          P('torso', one(duffelEnds), 'duffel', { shade: 0.6, ...CHEST }),
          P('torso', duffelStrap, 'duffel', { shade: 0.6 }),
          ...(detailed ? [P('torso', one(duffelDetail), 'duffel', { shade: 0.6, detail: true, ...CHEST })] : []),
        ],
      },
      {
        id: `sling-${k}`,
        // (the small bags left off the far crowd: a few pixels, and a shape more on every person of the kind)
        when: (o) => !!o.sling && is(o) && !far,
        pieces: [
          P('torso', slingBody, 'sling', CHEST),
          ...(slingDetail.length ? [P('torso', one(slingDetail), 'sling', { shade: 0.7, detail: true, ...CHEST })] : []),
          P('torso', slingStrap, 'sling', { shade: 0.6 }),
        ],
      },
      {
        id: `chestrig-${k}`,
        when: (o) => !!o.chestrig && is(o),
        pieces: [
          P('torso', rigBody, 'chestrig'),
          ...(rigDetail.length ? [P('torso', one(rigDetail), 'chestrig', { shade: 0.62, detail: true })] : []),
          P('torso', one(rigStraps), 'chestrig', { shade: 0.6 }),
        ],
      },
      {
        id: `waist-${k}`,
        when: (o) => !!o.waist && is(o) && !far,
        pieces: [
          P('torso', waistBody, 'waist'),
          ...(waistDetail.length ? [P('torso', one(waistDetail), 'waist', { shade: 0.65, detail: true })] : []),
          P('torso', waistStrap, 'waist', { shade: 0.6 }),
        ],
      },
    ];
  });

  // The crowd's phone: a slim slab in the hand, tilted up so they can see the screen (the screen glows)
  const phoneBody = rb(0.046, 0.09, 0.008, 0.004)
    .rotateX(-0.35)
    .translate(-0.004, -0.045, 0.046);
  const phoneScreen = new THREE.PlaneGeometry(0.038, 0.074)
    .translate(0, 0, 0.0045)
    .rotateX(-0.35)
    .translate(-0.004, -0.045, 0.046);
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
    { is: bomber, front: bomberFront, back: surface(BK, SN, -1), chest: [0.078, 0.28], sleeve: grow(LOOSE_U, 1.14) },
    { is: coach, front: coachFront, back: surface(CK, SN, -1), chest: [0.078, 0.28], sleeve: grow(LOOSE_U, 1.14) },
    { is: tee, front: hoodieFront, back: BACK, chest: [0.075, 0.28], sleeve: TEE_U },
    { is: shell, front: shellFront, back: surface(SHK, SN, -1), chest: [0.078, 0.27], sleeve: grow(LOOSE_U, 1.14) },
    // (the trucker's chest mark goes small on its left pocket's flap)
    { is: trucker, front: truckerFront, back: surface(DK, SN, -1), chest: [0.072, 0.284, 0.026, 0.008], sleeve: grow(LOOSE_U, 1.14) },
    // (the hi-vis tops keep their chest clear of the tape: the mark goes on the left, small, between the braces' line
    // and the arm; the chore coat's on its chest pocket)
    { is: hivis, front: hoodieFront, back: BACK, chest: [0.115, 0.25, 0.04], sleeve: grow(LOOSE_U, 1.14) },
    { is: hivisJacket, front: hjFront, back: surface(HJK, SN, -1), chest: [0.112, 0.25, 0.04], sleeve: grow(LOOSE_U, 1.14) },
    { is: chore, front: choreFront, back: surface(CHK, SN, -1), chest: [0.075, 0.24, 0.04, 0.006], sleeve: grow(LOOSE_U, 1.14) },
    // (the blazer's chest mark a pin on its lapel, as the suit's; the shirt's on its pocket)
    { is: blazer, front: suitFront, back: surface(JK, SN, -1), chest: [0.096, 0.296, 0.038, 0.017], sleeve: SU },
    { is: shirtOnly, front: shirtFront2, back: surface(OXK, SN, -1), chest: [0.075, 0.245, 0.034, 0.004], sleeve: SU },
    { is: double, front: suitFront, back: surface(JK, SN, -1), chest: [0.11, 0.31, 0.038, 0.021], sleeve: SU },
    { is: waistcoatOn, front: wkFront, back: surface(WK, SN, -1), chest: [0.085, 0.27, 0.034, 0.004], sleeve: SU },
    { is: overcoatOn, front: ocFront, back: surface(OCK, SN, -1), chest: [0.115, 0.215, 0.04], sleeve: grow(SU, 1.1) },
    { is: coveralls, front: cvFront, back: surface(CVK, SN, -1), chest: [0.075, 0.22, 0.045], sleeve: grow(LOOSE_U, 1.14) },
    // (the vest's sleeve mark goes on the long-sleeve under it)
    { is: gilet, front: pufferFront, back: surface(PUFFER_S, HN2, -1), chest: [0.08, 0.28], sleeve: grow(LOOSE_U, 1.14) },
    { is: puffer, front: pufferFront, back: surface(PUFFER_S, HN2, -1), chest: [0.08, 0.28], sleeve: grow(UPPER_S, 1.44) },
  ];
  /** Where the top's mark goes (a suit's front is its shirt and tie: a big front mark goes on its chest) */
  // (the tailored tops' too: the blazer, the double-breasted, the waistcoat and the overcoat open on a shirt and tie)
  const tailored = (o: Outfit) => suit(o) || blazer(o) || double(o) || waistcoatOn(o) || overcoatOn(o);
  const slot = (o: Outfit): MarkSlot => (o.markAt === 'centre' && tailored(o) ? 'chest' : (o.markAt ?? 'chest'));
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
  merch.push({ id: 'shoeMarks', when: (o) => kicks(o) && !!o.shoeMark, pieces: both('shin', shoeMark, 'ink', { mat: 'logo', logo: 'shoe', ...SHOE }) });
  const all: Item[] = [
    {
      // (the balaclava's black, or the skin unmasked: the `head` colour)
      id: 'head',
      when: () => true,
      pieces: [P('head', far ? skull : one(hero ? [skull, ...ears] : [skull, nose, ...ears]), 'head')],
    },
    {
      // The balaclava's folds and the eye opening
      id: 'mask',
      when: masked,
      pieces: [
        ...(hero ? [P('head', one([neckFold, eyeRim]), BLACK, { detail: true })] : q > 0 ? [P('head', one(folds), BLACK, { detail: true })] : []),
        P('head', eyesSkin, 'skin'),
      ],
    },
    // Face gear (docs/wardrobe-plan.md Phase 4): single figures only
    {
      id: 'face-gasmask',
      when: (o) => o.faceGear === 'gasmask',
      pieces: [P('head', one(gasMask.body), 'gear'), P('head', one(gasMask.dark), 'gear', { shade: 0.55 }), P('head', one(gasMask.glass), '#3a4a55')],
    },
    {
      id: 'face-respirator',
      when: (o) => o.faceGear === 'respirator',
      pieces: [P('head', one(respirator.body), 'gear'), P('head', one(respirator.pads), 'gear', { shade: 0.6 })],
    },
    ...([['safety', safety], ['ski', ski]] as const).map(
      ([id, g]): Item => ({
        id: `face-${id}`,
        when: (o) => o.faceGear === id,
        pieces: [P('head', one(g.frame), 'gear'), P('head', g.lens, '#ffffff', { mat: 'lens' })],
      })
    ),
    // The shades in the outfit's style (the crowd's the classic; far off, a plain bar)
    ...EYE_STYLES.map(
      (st): Item => ({
        id: `shades-${st}`,
        when: (o) => eyesOf(o) === st,
        pieces: [
          P('head', far ? new THREE.BoxGeometry(0.17, 0.05, 0.008).translate(0, EYE_Y, lensZ - 0.002) : one([...SHADES[st].frames, ...armTubes(st)]), 'frame'),
          P('head', one(SHADES[st].lenses), '#ffffff', { mat: 'lens' }),
        ],
      })
    ),
    // The face's ink, unmasked: the eyes wherever there's a face to see (not the far crowd), the rest close up
    ...(far
      ? []
      : [
          {
            id: 'features',
            when: (o: Outfit) => !!o.face,
            pieces: [P('head', one(eyes), BLACK), P('head', one([...brows, mouth]), BLACK, { detail: true }), P('head', one(glints), WHITE, { detail: true })],
          },
        ]),
    // (the far crowd's every cut the crop: a few pixels can't tell them apart, and each is a shell more on every person)
    ...(far ? (['crop'] as const) : HAIR_CUTS).map(
      (c): Item => ({
        id: `hair-${c}`,
        when: (o) => hairy(o) && !covered(o) && (far || (o.cut ?? 'crop') === c),
        // (the locs a detail: the phones' light crowd keeps the hair under them)
        pieces: [P('head', one(hairs[c]), 'hair'), ...(c === 'twists' && twists.length ? [P('head', one(twists), 'hair', { detail: true })] : [])],
      })
    ),
    // (long hair below a hat on single figures only: the crowd's, the nape)
    { id: 'hair-nape', when: (o) => hairy(o) && covered(o) && (q < 2 || o.cut !== 'long'), pieces: [P('head', nape, 'hair')] },
    ...(q < 2 ? [] : [{ id: 'hair-longunder', when: (o: Outfit) => hairy(o) && covered(o) && o.cut === 'long', pieces: [P('head', longUnder, 'hair')] }]),
    ...CHAINS.map(([kind, geo]): Item => ({
      id: `chain-${kind}`,
      when: (o) => !!o.chain && !!eyesOf(o) && o.kind === kind && !(hoodie(o) && o.hood),
      pieces: [P('head', geo, GOLD, { detail: true })],
    })),
    {
      id: 'chain-hood',
      when: (o) => !!o.chain && !!eyesOf(o) && hoodie(o) && !!o.hood,
      pieces: [P('head', chainHood, GOLD, { detail: true })],
    },
    {
      id: 'cap',
      when: (o) => curvedCap(o) && !o.capBack,
      pieces: [P('head', one(cap.crown), 'cap'), P('head', one(cap.seams), 'cap', { shade: 0.62, detail: true }), ...hatPatch(cap.patch, cap.logo)],
    },
    {
      id: 'capBack',
      when: (o) => curvedCap(o) && !!o.capBack,
      pieces: [
        P('head', one(capBack.crown), 'cap'),
        P('head', one(capBack.seams), 'cap', { shade: 0.62, detail: true }),
        ...hatPatch(capBack.patch, capBack.logo),
      ],
    },
    {
      id: 'fitted',
      when: (o) => hasCap(o) && !!o.capFlat && !far,
      pieces: [
        P('head', one(fitted.crown), 'cap'),
        P('head', one(fitted.seams), 'cap', { shade: 0.62, detail: true }),
        // (the mark embroidered straight on the front; far off, the white patch the crowd's hats print)
        ...(hero ? [P('head', fitted.logo, 'ink', { mat: 'logo', logo: 'hat' })] : [P('head', fitted.patch, '#ffffff', { mat: 'patch', detail: true })]),
      ],
    },
    {
      id: 'bucket',
      when: (o) => !!o.bucket && bare(o),
      pieces: [P('head', one(bucket), 'bucket'), P('head', bucketBand, BLACK, { detail: true })],
    },
    {
      id: 'beanie',
      when: (o) => !!o.beanie && (!o.skully || far) && bare(o),
      pieces: [P('head', one(beanie), 'beanie'), P('head', beanieCuff, 'beanie', { shade: 0.82 }), ...hatPatch(beaniePatch, beanieLogo)],
    },
    {
      id: 'hardhat',
      when: (o) => !!o.hardhat && bare(o),
      pieces: [P('head', one([hardCrown, hardBrim]), 'hardhat'), P('head', one(hardRidge), 'hardhat', { shade: 0.88 })],
    },
    {
      id: 'skully',
      when: (o) => !!o.beanie && !!o.skully && !far && bare(o),
      pieces: [P('head', skully, 'beanie'), P('head', skullyHem, 'beanie', { shade: 0.85 }), ...hatPatch(skullyPatch, skullyLogo)],
    },
    {
      id: 'hoodUp',
      when: (o) => hoodie(o) && !!o.hood,
      pieces: [P('head', hoodUp, 'top', { mat: 'double', region: 'hood' }), P('head', hoodRim, 'top', { shade: 0.85, region: 'hood' })],
    },
    {
      id: 'helmet',
      when: soldier,
      pieces: [P('head', one(helmet), '#3e4a26'), P('head', strap, '#2b2a33', { detail: true })],
    },
    // A kart driver's helmet: the soldier's shell in the driver's colour, its strap dark (docs/kart-west-plan.md Phase 6)
    {
      id: 'racehelmet',
      when: (o) => !soldier(o) && !!o.helmet,
      pieces: [P('head', one(helmet), 'helmet'), P('head', strap, '#16141f', { detail: true })],
    },
    {
      id: 'suit',
      when: suit,
      pieces: [
        P('torso', jacket, 'top', TOP),
        P('torso', one([...lapels, ...flaps, ...(tailor ? [tailor.collar] : [])]), 'top', { shade: 1.45 }),
        P('torso', one([shirtFront, tailor?.stand ?? collarBand, ...collars]), 'shirt'),
        P('torso', pocketSquare, SHIRT),
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
        ...both('fore', shirtCuff, 'shirt', { detail: true }),
      ],
    },
    {
      id: 'blazer',
      when: blazer,
      pieces: [
        P('torso', jacket, 'top', TOP),
        P('torso', one([...lapels, ...flaps, ...(tailor ? [tailor.collar] : [])]), 'top', { shade: 1.45 }),
        P('torso', one([openFront, tailor?.stand ?? collarBand, ...openCollar]), 'shirt'),
        ...(tailor && sleeveBtns
          ? [
              P('torso', one(tailor.cloth), 'top', { shade: 1.2 }),
              P('torso', one(tailor.dark), 'top', { shade: 0.55 }),
              P('torso', one(tailor.pick), 'top', { shade: 2.1 }),
              P('torso', one(tailor.horn), HORN),
              P('torso', one(tailor.thread), HOLE),
              ...both('fore', sleeveBtns, HORN),
            ]
          : [P('torso', one(blazerButtons), BLACK, { detail: true })]),
        ...both('arm', suitUpper, 'top'),
        ...both('fore', suitFore, 'top'),
        ...both('fore', shirtCuff, 'shirt', { detail: true }),
      ],
    },
    {
      id: 'double',
      when: double,
      pieces: [
        P('torso', jacket, 'top', TOP),
        P('torso', one([...peakLapels, ...flaps, ...(tailor ? [tailor.collar] : [])]), 'top', { shade: 1.45 }),
        P('torso', dbEdge, 'top', { shade: 0.7, detail: true }),
        P('torso', one([dbShirt, tailor?.stand ?? collarBand, ...collars]), 'shirt'),
        P('torso', pocketSquare, SHIRT),
        P('torso', one(dbTie), 'tie'),
        P('torso', one(dbButtons), HORN),
        ...both('arm', suitUpper, 'top'),
        ...both('fore', suitFore, 'top'),
        ...(sleeveBtns ? both('fore', sleeveBtns, HORN) : []),
        ...both('fore', shirtCuff, 'shirt', { detail: true }),
      ],
    },
    {
      id: 'waistcoat',
      when: waistcoatOn,
      pieces: [
        P('torso', waistcoat, 'top', TOP),
        P('torso', one(wkWelts), 'top', { shade: 0.8, detail: true }),
        P('torso', one([wkShirt, shirtBand, ...wkCollar]), 'shirt'),
        P('torso', one(wkTie), 'tie'),
        P('torso', one(wkButtons), HORN, { detail: true }),
        ...both('arm', suitUpper, 'shirt'),
        ...both('fore', suitFore, 'shirt'),
        ...both('fore', ribCuff, 'shirt', { shade: 0.92 }),
      ],
    },
    {
      id: 'overcoat',
      when: overcoatOn,
      pieces: [
        P('torso', overcoat, 'top', TOP),
        P('torso', one([...ocLapels, ribBand(0.396, 0.452, 0.075, 0.068, -0.004, R(18)).band, ...ocFlaps]), 'top', { shade: 1.3 }),
        P('torso', one([ocShirt, ...collars]), 'shirt'),
        P('torso', one(ocTie), 'tie'),
        P('torso', one(ocButtons), BLACK, { detail: true }),
        ...both('arm', ocUpper, 'top'),
        ...both('fore', ocFore, 'top'),
        ...both('fore', ocCuff, 'top', { shade: 1.15 }),
      ],
    },
    {
      id: 'shirt',
      when: shirtOnly,
      pieces: [
        P('torso', shirtBody, 'top', TOP),
        P('torso', hemBand(OXK, SN, -0.09, -0.079, 0.0015), 'top', { shade: 0.92, ...TOP }),
        P('torso', one([shirtBand, ...shirtCollar, shirtPlacket, shirtPocket]), 'top', { shade: 0.92 }),
        P('torso', one(shirtButtons), '#dcdae4', { detail: true }),
        ...both('arm', suitUpper, 'top'),
        ...both('fore', suitFore, 'top'),
        ...both('fore', ribCuff, 'top', { shade: 0.92 }),
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
        ...both('fore', hoodieCuff, 'top', { shade: 0.8 }),
        // (the heavyweight's seams and the cords' tips: single figures, detail 2 and 3; the crowd draws at 0 and 1)
        ...(q >= 2
          ? [
              P('torso', sideSeams, 'top', { shade: 0.78, detail: true }),
              ...both('arm', dropSeam, 'top', { shade: 0.78, detail: true }),
              P('torso', one(aglets), '#b8b6c4', { detail: true }),
            ]
          : []),
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
          { id: 'fingers', when: (o: Outfit) => !soldier(o) && !glovesOf(o), pieces: fingers('skin') },
          // A character's gloves (docs/characters-plan.md: Smilex's white cartoon gloves): the hands in the glove's
          // colour, a rolled cuff round each wrist
          ...(heads
            ? heads.ids.flatMap((id): Item[] => {
                const c = heads!.gloves(id);
                return c ? [{ id: `gloves-${id}`, when: (o: Outfit) => !soldier(o) && o.character === id, pieces: [...fingers(c), ...cuffs(c), ...stitchLines()] }] : [];
              })
            : []),
        ]
      : [
          {
            id: 'hands',
            when: (o: Outfit) => !soldier(o) && !o.fists,
            pieces: both('wrist', one(hand), 'skin'),
          },
          {
            id: 'fists',
            when: (o: Outfit) => !soldier(o) && !!o.fists,
            pieces: both('wrist', one(fist), 'skin'),
          },
        ]),
    // The bottoms and the shoes, each on its own (docs/wardrobe-plan.md Phase 2): any with any top
    {
      id: 'trousers',
      when: (o) => wornLegs(o) === 'trousers',
      pieces: [P('pelvis', trouserLegs, 'bottom', BOTTOM), ...(crease ? both('shin', crease, 'bottom', { shade: 0.75, detail: true }) : [])],
    },
    {
      id: 'joggers',
      when: (o) => wornLegs(o) === 'joggers' || wornLegs(o) === 'trackpants',
      pieces: [P('pelvis', joggers, 'bottom', BOTTOM), ...both('shin', joggerCuff, 'bottom', { shade: 0.8 })],
    },
    {
      id: 'cargoPants',
      when: (o) => wornLegs(o) === 'cargo',
      pieces: [
        P('pelvis', cargoPants, 'bottom', BOTTOM),
        ...both('shin', cargoCuff, 'bottom', { shade: 0.8 }),
        ...both('leg', cargoPockets, 'bottom', { shade: 0.88 }),
        // (the pockets' flaps on the desktop only: fine detail, and phones keep their budget)
        ...(q === 3 ? both('leg', cargoFlaps, 'bottom', { shade: 0.72, detail: true }) : []),
      ],
    },
    {
      id: 'shorts',
      when: (o) => wornLegs(o) === 'shorts',
      pieces: [
        P('pelvis', shorts, 'bottom', BOTTOM),
        ...both('leg', shortsHem, 'bottom', { shade: 0.82 }),
        ...both('leg', bareLeg, 'skin'),
        ...both('shin', sock, WHITE, BOTTOM),
        ...both('shin', sockRib, WHITE, { shade: 0.88 }),
      ],
    },
    {
      id: 'denim',
      when: (o) => wornLegs(o) === 'denim',
      pieces: [
        P('pelvis', denim, 'bottom', BOTTOM),
        ...both('shin', denimCuff, 'bottom', { shade: 1.15 }),
        ...(q >= 2 ? [...both('leg', denimThighSeam, STITCH, { detail: true }), ...both('shin', denimShinSeam, STITCH, { detail: true })] : []),
      ],
    },
    {
      id: 'chinos',
      when: (o) => wornLegs(o) === 'chinos',
      pieces: [P('pelvis', chinos, 'bottom', BOTTOM), ...both('shin', chinoHem, 'bottom', { shade: 0.88 })],
    },
    {
      id: 'workPants',
      when: (o) => wornLegs(o) === 'work',
      pieces: [
        P('pelvis', workPants, 'bottom', BOTTOM),
        ...both('shin', workHem, 'bottom', { shade: 0.85 }),
        ...both('leg', kneePanels, 'bottom', { shade: 0.78 }),
        P('legL', hammerLoop, 'bottom', { shade: 0.8, detail: true }),
      ],
    },
    // Track pants: the joggers with the track suit's stripes down the outside of each leg
    {
      id: 'trackStripes',
      when: (o) => wornLegs(o) === 'trackpants',
      pieces: [...both('leg', thighStripes, SHIRT, { detail: true }), ...both('shin', shinStripes, SHIRT, { detail: true })],
    },
    {
      id: 'dressShoes',
      when: (o) => wornFeet(o) === 'dress',
      pieces: [...both('shin', dress, 'shoes', UPPER), ...both('shin', dressSole, '#14121a', SHOE)],
    },
    {
      id: 'sneakers',
      when: sneakers,
      pieces: [
        ...both('shin', sneaker, 'shoes', UPPER),
        ...both('shin', sneakerSole, SHIRT, SHOE),
        ...(laces.length ? both('shin', one(laces), SHIRT, { detail: true, ...SHOE }) : []),
      ],
    },
    {
      id: 'hightops',
      when: (o) => wornFeet(o) === 'hightop',
      pieces: [
        ...both('shin', hightop, 'shoes', UPPER),
        ...both('shin', hightopSole, SHIRT, SHOE),
        ...both('shin', hightopCollar, 'shoes', { shade: 0.7, ...SHOE }),
        ...(hightopLaces.length ? both('shin', one(hightopLaces), SHIRT, { detail: true, ...SHOE }) : []),
      ],
    },
    {
      id: 'runners',
      when: (o) => wornFeet(o) === 'runner',
      pieces: [
        ...both('shin', runner, 'shoes', UPPER),
        ...both('shin', one(runnerPanels), 'shoes', { shade: 0.72, ...SHOE }),
        ...both('shin', runnerSole, SHIRT, SHOE),
        ...both('shin', runnerOut, '#2b2a33', SHOE),
        ...(runnerLaces.length ? both('shin', one([...runnerLaces, runnerTab]), SHIRT, { detail: true, ...SHOE }) : []),
      ],
    },
    {
      id: 'loafers',
      when: (o) => wornFeet(o) === 'loafer',
      pieces: [
        ...both('shin', loafer, 'shoes', UPPER),
        ...both('shin', loaferStrap, 'shoes', { shade: 0.78, ...SHOE }),
        ...both('shin', mocSeam, 'shoes', { shade: 0.6, detail: true, ...SHOE }),
        ...both('shin', dressSole, '#14121a', SHOE),
      ],
    },
    {
      id: 'derbies',
      when: (o) => wornFeet(o) === 'derby',
      pieces: [
        ...both('shin', dress, 'shoes', UPPER),
        ...both('shin', derbyQuarters, 'shoes', { shade: 0.85, ...SHOE }),
        ...(derbyLaces.length ? both('shin', one(derbyLaces), 'shoes', { shade: 0.5, detail: true, ...SHOE }) : []),
        ...both('shin', derbySole, '#14121a', SHOE),
      ],
    },
    {
      id: 'workBoots',
      when: (o) => wornFeet(o) === 'boot',
      pieces: [
        ...both('shin', workBoot, 'shoes', UPPER),
        ...both('shin', workBootCap, 'shoes', { shade: 0.72, ...SHOE }),
        ...both('shin', workBootCollar, 'shoes', { shade: 0.6, ...SHOE }),
        ...both('shin', workBootSole, '#14121a', SHOE),
        ...(workBootLaces.length ? both('shin', one(workBootLaces), '#c99a4e', { detail: true, ...SHOE }) : []),
      ],
    },
    {
      id: 'slides',
      when: (o) => wornFeet(o) === 'slide',
      pieces: [
        ...both('shin', sockFoot, WHITE, UPPER),
        ...both('shin', footbed, 'shoes', { shade: 0.8, ...SHOE }),
        ...both('shin', slideSole, '#14121a', SHOE),
        ...both('shin', slideStrap, 'shoes', SHOE),
      ],
    },
    // The sneakers' side stripe, unless a mark is printed there instead
    {
      id: 'swoop',
      when: (o) => kicks(o) && !(hero && o.shoeMark),
      pieces: both('shin', one(swoop), 'shoes', { shade: 0.6, detail: true, ...SHOE }),
    },
    // (the puffer's, the vest's and the shell's high collar covers the headphones, and the necklace, below; so does the hood up, where it meets the
    // sweater round the neck)

    // (the necklace, bags, boards and wings on the top he's wearing: each top its own)
    ...OVER,
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
      id: 'bomber',
      when: bomber,
      pieces: [
        P('torso', bomberBody, 'top', TOP),
        P('torso', bomberHem, 'top', { shade: 0.72, ...TOP }),
        P('torso', bomberCollar, 'top', { shade: 0.72 }),
        P('torso', one(bomberZip), '#b8b6c4', { detail: true }),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...both('fore', bomberCuff, 'top', { shade: 0.72 }),
        P('armL', one(bomberPocket), 'top', { shade: 0.82, detail: true }),
      ],
    },
    {
      id: 'puffer',
      when: puffer,
      pieces: [
        P('torso', pufferBody, 'top', TOP),
        P('torso', pufferCollar, 'top'),
        P('torso', one(pufferZip), SHIRT, { detail: true }),
        P('torso', pufferSeams, 'top', { shade: 0.7, detail: true }),
        ...both('arm', pufferArmSeams, 'top', { shade: 0.7, detail: true }),
        ...both('fore', pufferForeSeams, 'top', { shade: 0.7, detail: true }),
        ...both('arm', pufferUpper, 'top'),
        ...both('fore', pufferFore, 'top'),
        ...both('fore', pufferCuff, 'top', { shade: 0.75 }),
      ],
    },
    {
      id: 'coach',
      when: coach,
      pieces: [
        P('torso', coachBody, 'top', TOP),
        P('torso', coachHem, 'top', { shade: 0.82, ...TOP }),
        P('torso', one([coachStand, coachPlacket]), 'top', { shade: 0.85 }),
        P('torso', one(coachCollar), 'top', { shade: 0.78 }),
        P('torso', one(coachSnaps), '#b8b6c4', { detail: true }),
        P('torso', one(coachToggles), '#2b2a33', { detail: true }),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...both('fore', ribCuff, 'top', { shade: 0.82 }),
      ],
    },
    // The puffer vest: the puffer's quilted body, collar and zip over a long-sleeve in the look's shirt colour
    {
      id: 'vest',
      when: gilet,
      pieces: [
        P('torso', pufferBody, 'top', TOP),
        P('torso', pufferCollar, 'top'),
        P('torso', one(pufferZip), SHIRT, { detail: true }),
        P('torso', pufferSeams, 'top', { shade: 0.7, detail: true }),
        ...both('arm', looseUpper, 'shirt'),
        ...both('fore', looseFore, 'shirt'),
        ...both('fore', ribCuff, 'shirt', { shade: 0.8 }),
      ],
    },
    {
      id: 'shell',
      when: shell,
      pieces: [
        P('torso', shellBody, 'top', TOP),
        P('torso', shellHem, 'top', { shade: 0.85, ...TOP }),
        P('torso', shellCollar, 'top'),
        P('torso', shellFlap, 'top', { shade: 0.88 }),
        P('torso', shellTape, 'top', { shade: 1.25, detail: true }),
        P('torso', shellPocket, 'top', { shade: 0.55, detail: true }),
        P('torso', one([shellPull, ...shellToggles]), '#2b2a33', { detail: true }),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...both('fore', ribCuff, 'top', { shade: 0.85 }),
        ...both('arm', shellArmTape, 'top', { shade: 1.25, detail: true }),
        ...both('fore', shellForeTape, 'top', { shade: 1.25, detail: true }),
        ...both('fore', shellTabs, 'top', { shade: 0.85 }),
      ],
    },
    {
      id: 'trucker',
      when: trucker,
      pieces: [
        P('torso', truckerBody, 'top', TOP),
        P('torso', truckerBand, 'top', { shade: 0.88, ...TOP }),
        P('torso', one([truckerStand, truckerPlacket, ...truckerTabs]), 'top', { shade: 0.88 }),
        P('torso', one([...truckerCollar, ...truckerFlaps]), 'top', { shade: 0.8 }),
        P('torso', one(truckerSeams), 'top', { shade: 0.7, detail: true }),
        P('torso', one(truckerButtons), COPPER, { detail: true }),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...both('fore', truckerCuff, 'top', { shade: 0.88 }),
        ...both('fore', cuffButtons, COPPER, { detail: true }),
      ],
    },
    // Work wear (docs/wardrobe-plan.md Phase 6)
    {
      id: 'hivis',
      when: hivis,
      pieces: [
        P('torso', hoodieBody, 'top', TOP),
        P('torso', teeHem, 'top', { shade: 0.85, ...TOP }),
        P('torso', one([hivisV, teeNeck]), 'shirt'),
        P('torso', hivisClosure, 'top', { shade: 0.8, detail: true }),
        P('torso', hivisTape, TAPE),
        ...both('arm', looseUpper, 'shirt'),
        ...both('fore', looseFore, 'shirt'),
        ...both('fore', ribCuff, 'shirt', { shade: 0.8 }),
      ],
    },
    {
      id: 'hivisjacket',
      when: hivisJacket,
      pieces: [
        P('torso', hjBody, 'top', TOP),
        P('torso', hemBand(HJK, SN, -0.09, -0.07, 0.0025), 'top', { shade: 0.85, ...TOP }),
        P('torso', hjCollar, 'top', { shade: 0.85 }),
        P('torso', hjZip, '#2b2a33', { detail: true }),
        P('torso', hjTape, TAPE),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...both('fore', ribCuff, 'top', { shade: 0.85 }),
        ...both('arm', hjArmTape, TAPE),
        ...both('fore', hjForeTape, TAPE),
      ],
    },
    {
      id: 'chore',
      when: chore,
      pieces: [
        P('torso', choreBody, 'top', TOP),
        P('torso', one([choreStand, chorePlacket]), 'top', { shade: 0.88 }),
        P('torso', one([...choreCollar, ...chorePockets]), 'top', { shade: 0.82 }),
        P('torso', one(choreButtons), HORN_DARK, { detail: true }),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...both('fore', truckerCuff, 'top', { shade: 0.88 }),
        ...both('fore', cuffButtons, HORN_DARK, { detail: true }),
      ],
    },
    {
      id: 'coveralls',
      when: coveralls,
      pieces: [
        P('torso', cvBody, 'top', TOP),
        P('torso', cvBelt, 'top', { shade: 0.85 }),
        P('torso', one(cvCollar), 'top', { shade: 0.82 }),
        P('torso', one([cvZip, ...cvPockets]), '#2b2a33', { detail: true }),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...both('fore', ribCuff, 'top', { shade: 0.85 }),
        // (its own legs: the work trousers' cut, in the top's colour)
        P('pelvis', workPants, 'top', BOTTOM),
        ...both('shin', workHem, 'top', { shade: 0.85 }),
      ],
    },
    {
      id: 'tee',
      when: tee,
      pieces: [
        P('torso', hoodieBody, 'top', TOP),
        P('torso', teeHem, 'top', { shade: 0.85, ...TOP }),
        P('torso', teeNeck, 'top', { shade: 0.8 }),
        ...both('arm', teeSleeve, 'top'),
        ...both('arm', teeCuff, 'top', { shade: 0.85 }),
        ...both('arm', bareUpper, 'skin'),
        ...both('fore', bareFore, 'skin'),
      ],
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
      id: 'shopping',
      held: true,
      when: (o) => o.held === 'shopping',
      pieces: [P('handR', bagBody, '#f0e9dc'), P('handR', bagCord, '#1b1830'), P('handR', bagBand, GOLD, { detail: true })],
    },
    ...(hero ? merch : []),
    // The characters' heads (docs/characters-plan.md): single figures only, once their chunk is in
    ...(hero && q >= 2 && heads
      ? heads.ids.map(
          (id): Item => ({
            id: `character-${id}`,
            when: (o) => o.character === id,
            pieces: heads!.parts(id, q as 2 | 3).map((h) => P('head', one(h.geos), h.color, { ...(h.shade ? { shade: h.shade } : {}), ...(h.detail ? { detail: true } : {}), ...(h.rigid ? { bone: 'head' as BoneName } : {}) })),
          })
        )
      : []),
  ];
  // With a character's head on, Degen's own head and everything worn over a head is off, whatever the outfit says
  const out = all.map((it): Item => {
    const own = DEGEN_HEAD_ITEMS(it.id);
    // (until the heads' chunk is in, he's Degen as he is: never a figure with no head)
    return { ...it, when: (o) => (o.character && heads ? !own && it.when(headless(o)) : it.when(o)) };
  });
  itemsCache[key] = out;
  return out;
}

/** The characters' heads, once their chunk is in (heads.ts; `loadHeads()` in character.ts) */
let heads: {
  ids: readonly CharacterId[];
  parts: (id: CharacterId, q: 2 | 3) => HeadPart[];
  /** What hangs on a character's chain in place of the diamond (null: the diamond) */
  pendant: (id: CharacterId, q: 2 | 3) => HeadPart[] | null;
  /** A character's own chain along the necklace's path (null: the smooth cord) */
  chain: (id: CharacterId, q: 2 | 3, path: THREE.Curve<THREE.Vector3>) => THREE.BufferGeometry[] | null;
  /** A character's gloves' colour (null: bare hands) */
  gloves: (id: CharacterId) => string | null;
} | null = null;
/** Hand the wardrobe the characters' heads (their chunk is in): the single figures' items are made again with them */
export function useHeads(h: NonNullable<typeof heads>) {
  heads = h;
  delete itemsCache['2h'];
  delete itemsCache['3h'];
}
/** A character's gloves' colour on this outfit (null: bare hands): the first-person hands and fists wear it too */
export const gloveColour = (o: Outfit): string | null => (o.character && heads?.gloves(o.character)) || null;
/** Degen's own head: the head and its balaclava, the face's ink, the hair (docs/characters-plan.md) */
const DEGEN_HEAD_ITEMS = (id: string) => id === 'head' || id === 'mask' || id === 'features' || id.startsWith('hair-');
/**
 * An outfit as a character's head wears it: no hat, helmet, face gear, shades or chain, the hood down (nothing is
 * worn over it: the owner's call), and unmasked, so the balaclava's pieces are off too. The outfit itself is untouched.
 */
export function headless(o: Outfit): Outfit {
  return { ...o, cap: undefined, beanie: undefined, bucket: undefined, hardhat: undefined, helmet: undefined, faceGear: undefined, hood: undefined, chain: undefined, face: true, shades: undefined, headShape: undefined };
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
