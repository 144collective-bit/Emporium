/*
 * Degen, built once and dressed many ways.
 *
 * One body after the brand art (balaclava with the eye opening, red cap with
 * the diamond patch, green shades on a gold chain, collar, tie and a lapelled
 * suit) with knees and elbows, so walks and runs can bend. Outfits swap the
 * clothes on that body: suits, hoodies and joggers, soldier fatigues.
 *
 * Two ways to build it:
 * - createDegen(): one figure as a hierarchy of meshes (the player, the
 *   rooftop hologram). Hands carry sockets for things to hold later.
 * - createCrowd(): many figures as instanced parts, a draw call per part
 *   whatever the head count (pedestrians, soldiers).
 * Both are posed with the same Pose, from the pose helpers below.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rifleGeometry } from './rifle';
import { canvasTex, lit, toon } from './kit';

/* ---------- Outfits ---------- */

export type OutfitKind = 'suit' | 'hoodie' | 'soldier';
export interface Outfit {
  kind: OutfitKind;
  /** Jacket, hoodie or fatigues */
  top: string;
  /** Trousers or joggers */
  bottom: string;
  shoes: string;
  tie?: string;
  /** Cap colour; leave out for no cap */
  cap?: string;
  /** Hoodie with the hood up (no cap) */
  hood?: boolean;
  backpack?: string;
  crossbody?: string;
  headphones?: string;
  /** Gold chain on the shades */
  chain?: boolean;
  /** The Gas Fee Gummy Bears bag in the right hand */
  gummy?: boolean;
  /** Which hand carries a rifle (soldiers) */
  rifle?: 'left' | 'right';
  /** Width and height multipliers, for a bit of variety in build */
  build?: number;
  height?: number;
}

/** Degen as he is in the art. */
export const PLAYER: Outfit = { kind: 'suit', top: '#16141f', bottom: '#16141f', shoes: '#1b1830', tie: '#1f9d55', cap: '#d8312f', chain: true, gummy: true };
export const SOLDIER: Outfit = { kind: 'soldier', top: '#5a6b3a', bottom: '#465530', shoes: '#2b2a33', rifle: 'right' };

/* ---------- The rig ---------- */

type Joint = 'torso' | 'head' | 'armL' | 'armR' | 'foreL' | 'foreR' | 'legL' | 'legR' | 'shinL' | 'shinR' | 'handL' | 'handR';

export interface Rig {
  root: THREE.Object3D;
  hips: THREE.Object3D;
  j: Record<Joint, THREE.Object3D>;
}

const HIP_Y = 0.5;

function makeRig(): Rig {
  const node = (parent: THREE.Object3D, x: number, y: number, z = 0) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const root = new THREE.Object3D();
  const hips = node(root, 0, HIP_Y);
  const torso = node(hips, 0, 0);
  const head = node(torso, 0, 0.43);
  const armL = node(torso, -0.19, 0.38);
  const armR = node(torso, 0.19, 0.38);
  const foreL = node(armL, 0, -0.2);
  const foreR = node(armR, 0, -0.2);
  const handL = node(foreL, 0, -0.225, 0.015);
  const handR = node(foreR, 0, -0.225, 0.015);
  const legL = node(hips, -0.075, 0);
  const legR = node(hips, 0.075, 0);
  const shinL = node(legL, 0, -0.24);
  const shinR = node(legR, 0, -0.24);
  return { root, hips, j: { torso, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR, handL, handR } };
}

/* ---------- Poses ---------- */

export interface Limb {
  /** Swing forward (radians); negative swings back */
  fwd: number;
  /** Away from the body, to the side */
  out: number;
  /** Elbow or knee bend */
  bend: number;
}
export interface Pose {
  bob: number;
  lean: number;
  twist: number;
  /** Weight shift, a sideways tilt of the hips */
  side: number;
  headYaw: number;
  headPitch: number;
  arms: [Limb, Limb];
  legs: [Limb, Limb];
}

export const newPose = (): Pose => ({
  bob: 0,
  lean: 0,
  twist: 0,
  side: 0,
  headYaw: 0,
  headPitch: 0,
  arms: [
    { fwd: 0, out: 0.08, bend: 0.15 },
    { fwd: 0, out: 0.08, bend: 0.15 },
  ],
  legs: [
    { fwd: 0, out: 0.02, bend: 0.04 },
    { fwd: 0, out: 0.02, bend: 0.04 },
  ],
});

function applyPose(r: Rig, p: Pose) {
  r.hips.position.y = HIP_Y + p.bob;
  r.hips.rotation.z = p.side;
  r.j.torso.rotation.set(p.lean, p.twist, -p.side * 0.6);
  r.j.head.rotation.set(-p.headPitch - p.lean * 0.6, p.headYaw - p.twist * 0.8, p.side * 0.4);
  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? -1 : 1;
    const a = p.arms[i];
    (i === 0 ? r.j.armL : r.j.armR).rotation.set(-a.fwd, 0, s * a.out);
    (i === 0 ? r.j.foreL : r.j.foreR).rotation.set(-a.bend, 0, 0);
    const l = p.legs[i];
    (i === 0 ? r.j.legL : r.j.legR).rotation.set(-l.fwd, 0, s * l.out - p.side);
    (i === 0 ? r.j.shinL : r.j.shinR).rotation.set(l.bend, 0, 0);
  }
}

const set = (l: Limb, fwd: number, out: number, bend: number) => {
  l.fwd = fwd;
  l.out = out;
  l.bend = bend;
};

/**
 * Walking and running. `phase` advances with distance covered, `stride`
 * 0..1 scales the whole cycle (0 = standing), `run` 0..1 blends to a run.
 */
export function walkPose(p: Pose, phase: number, stride: number, run: number, armSwing = 1) {
  const A = (0.42 + run * 0.36) * stride;
  for (let i = 0; i < 2; i++) {
    const ph = phase + i * Math.PI;
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    // Knees bend most while the leg swings through, a little at the heel strike
    set(p.legs[i], A * s, 0.02, 0.06 + stride * (0.5 + run * 0.85) * Math.max(0, c) + stride * 0.12 * Math.max(0, -s));
    // Arms swing against the legs, elbows tighten as you speed up
    set(p.arms[1 - i], A * 0.95 * s * armSwing + run * 0.15, 0.08 + run * 0.06, 0.2 + run * 1.05 + 0.15 * stride * Math.max(0, s));
  }
  p.bob = (Math.abs(Math.cos(phase)) - 0.6) * 0.03 * stride * (1 + run * 1.2);
  p.lean = 0.03 * stride + run * 0.24;
  p.twist = Math.sin(phase) * 0.08 * stride;
  p.side = Math.sin(phase) * 0.025 * stride;
  p.headYaw = 0;
  p.headPitch = 0;
}

/** Standing: breathing, a slow weight shift. */
export function idlePose(p: Pose, t: number, seed = 0) {
  const sh = Math.sin(t * 0.35 + seed);
  p.bob = Math.sin(t * 1.6 + seed) * 0.003 - Math.abs(sh) * 0.008;
  p.lean = 0.01;
  p.twist = 0;
  p.side = sh * 0.035;
  set(p.arms[0], 0.03, 0.09 + Math.sin(t * 1.6 + seed) * 0.01, 0.18);
  set(p.arms[1], 0.03, 0.09, 0.18);
  set(p.legs[0], 0, 0.04, 0.04 + Math.max(0, -sh) * 0.1);
  set(p.legs[1], 0, 0.04, 0.04 + Math.max(0, sh) * 0.1);
  p.headYaw = 0;
  p.headPitch = 0;
}

/** Looking around while standing. */
export function lookPose(p: Pose, t: number, seed = 0) {
  idlePose(p, t, seed);
  p.headYaw = Math.sin(t * 0.37 + seed * 2) * 0.55 + Math.sin(t * 0.13 + seed) * 0.3;
  p.headPitch = Math.sin(t * 0.21 + seed) * 0.12;
}

/** Talking with a group: gestures with one hand, nods, now and then both hands. */
export function chatPose(p: Pose, t: number, seed = 0) {
  idlePose(p, t, seed);
  const talk = Math.sin(t * 0.5 + seed * 3) > -0.2;
  if (talk) {
    set(p.arms[1], 0.55 + Math.sin(t * 2.3 + seed) * 0.3, 0.16, 1.25 + Math.sin(t * 3.1 + seed) * 0.35);
    if (Math.sin(t * 0.9 + seed) > 0.4) set(p.arms[0], 0.45 + Math.sin(t * 2.0 + seed) * 0.2, 0.14, 1.1);
    p.headPitch = Math.sin(t * 2.6 + seed) * 0.06;
  } else {
    // Listening: hands in pockets, the odd nod
    set(p.arms[0], -0.05, 0.1, 0.45);
    set(p.arms[1], -0.05, 0.1, 0.45);
    p.headPitch = Math.max(0, Math.sin(t * 1.4 + seed)) * -0.12;
  }
  p.headYaw = Math.sin(t * 0.3 + seed) * 0.25;
}

/** Sitting on a bench: thighs level, hands on the knees. Hips sit 0.47 above the feet's root. */
export function sitPose(p: Pose, t: number, seed = 0) {
  p.bob = -0.03;
  p.lean = -0.08 + Math.sin(t * 0.3 + seed) * 0.03;
  p.twist = 0;
  p.side = 0;
  set(p.legs[0], 1.5, 0.08, 1.45);
  set(p.legs[1], 1.5, 0.08, 1.45);
  set(p.arms[0], 0.55, 0.12, 0.7);
  set(p.arms[1], 0.55, 0.12, 0.7);
  p.headYaw = Math.sin(t * 0.25 + seed) * 0.5;
  p.headPitch = 0.05;
}

/** In the air: knees up, arms out for balance. `a` 0..1 blends it over whatever pose is set. */
export function airPose(p: Pose, a: number) {
  if (a <= 0) return;
  const mix = (l: Limb, fwd: number, out: number, bend: number) => {
    l.fwd += (fwd - l.fwd) * a;
    l.out += (out - l.out) * a;
    l.bend += (bend - l.bend) * a;
  };
  mix(p.legs[0], 0.7, 0.06, 1.1);
  mix(p.legs[1], -0.1, 0.06, 0.55);
  mix(p.arms[0], 0.5, 0.7, 0.6);
  mix(p.arms[1], 0.3, 0.75, 0.5);
  p.lean += (0.1 - p.lean) * a;
  p.bob *= 1 - a;
}

/** Soldier on parade: a crisp march, arms straighter, the rifle hand still. */
export function marchPose(p: Pose, phase: number, rifle: 'left' | 'right') {
  walkPose(p, phase, 1, 0.15, 1.1);
  for (const l of p.legs) l.bend *= 1.25;
  for (const a of p.arms) a.bend = 0.12;
  const r = p.arms[rifle === 'left' ? 0 : 1];
  set(r, 0.05, 0.1, 0.35);
  p.lean = 0.02;
  p.twist *= 0.4;
}

/** Standing to attention, `salute` 0..1 brings the free hand to the brow. */
export function attentionPose(p: Pose, salute: number, rifle: 'left' | 'right') {
  idlePose(p, 0, 0);
  p.side = 0;
  for (const l of p.legs) set(l, 0, 0.02, 0.03);
  const held = p.arms[rifle === 'left' ? 0 : 1];
  set(held, 0.05, 0.1, 0.35);
  const free = p.arms[rifle === 'left' ? 1 : 0];
  set(free, 0.02 + salute * 2.0, 0.07 + salute * 0.45, 0.12 + salute * 2.0);
  p.headPitch = salute * 0.05;
}

/** A dance for the rooftop hologram, on a two-beats-a-second groove. */
export function dancePose(p: Pose, t: number) {
  const b = t * Math.PI * 2;
  const beat = Math.pow(1 - ((t * 2) % 1), 3);
  p.bob = -beat * 0.05;
  p.lean = 0.05 + beat * 0.06;
  p.twist = Math.sin(b * 0.5) * 0.35;
  p.side = Math.sin(b * 0.5) * 0.06;
  set(p.arms[0], 2.4 + Math.sin(b) * 0.4, 0.4, 0.4);
  set(p.arms[1], 2.4 - Math.sin(b) * 0.4, 0.4, 0.4);
  set(p.legs[0], 0.1 + Math.max(0, Math.sin(b)) * 0.4, 0.12, 0.25 + beat * 0.3 + Math.max(0, Math.sin(b)) * 0.6);
  set(p.legs[1], 0.1 + Math.max(0, -Math.sin(b)) * 0.4, 0.12, 0.25 + beat * 0.3 + Math.max(0, -Math.sin(b)) * 0.6);
  p.headPitch = -beat * 0.15;
  p.headYaw = Math.sin(b * 0.5) * 0.2;
}

/* ---------- Parts ---------- */

type ColorKey = 'top' | 'bottom' | 'shoes' | 'tie' | 'cap' | 'lapel' | 'backpack' | 'crossbody' | 'headphones';
interface Part {
  joint: Joint;
  geo: THREE.BufferGeometry;
  /** A fixed colour, or which outfit colour to use */
  color: string | ColorKey;
  mat?: () => THREE.Material;
  when: (o: Outfit) => boolean;
  /** Small details left out of the light (phone) crowd */
  detail?: boolean;
  /** Thicker on hoodies and fatigues than on a suit */
  fat?: boolean;
  /** Parts a single figure hands back by name */
  name?: 'gummy';
}

const FAT = new THREE.Vector3(1.16, 1, 1.16);
const isFat = (p: Part, o: Outfit) => !!p.fat && o.kind !== 'suit';

const SKIN = '#e8c39e';
const BLACK = '#16141f';
const rbox = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0) => new RoundedBoxGeometry(w, h, d, 2, r).translate(x, y, z);
const caps = (r: number, len: number, y: number) => new THREE.CapsuleGeometry(r, len, 3, 10).translate(0, y, 0);
const merge = (...g: THREE.BufferGeometry[]) =>
  mergeGeometries(
    g.map((x) => {
      const n = x.index ? x.toNonIndexed() : x;
      for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
      return n;
    })
  )!;
/** Narrow a geometry towards its bottom: `waist` is the width kept at the bottom edge. */
const taper = (g: THREE.BufferGeometry, waist: number) => {
  g.computeBoundingBox();
  const { min, max } = g.boundingBox!;
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const f = (pos.getY(i) - min.y) / (max.y - min.y);
    pos.setX(i, pos.getX(i) * (waist + (1 - waist) * Math.min(1, f * 1.25)));
  }
  g.computeVertexNormals();
  return g;
};
const flat = (pts: [number, number][], z: number, depth: number) => {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false });
  g.translate(0, 0, z);
  return g;
};
const mirror = (pts: [number, number][]) => pts.map(([x, y]) => [-x, y] as [number, number]).reverse();

let partsCache: Part[] | null = null;
function parts(): Part[] {
  if (partsCache) return partsCache;
  const suit = (o: Outfit) => o.kind === 'suit';
  const hoodie = (o: Outfit) => o.kind === 'hoodie';
  const soldier = (o: Outfit) => o.kind === 'soldier';
  const notSoldier = (o: Outfit) => o.kind !== 'soldier';
  const hasCap = (o: Outfit) => !!o.cap && !o.hood && o.kind !== 'soldier';

  // Head: balaclava with a nose under it, the neck tube, the shades' frame
  const head = merge(
    new THREE.SphereGeometry(0.14, 16, 12).scale(0.96, 1.08, 1).translate(0, 0.13, 0),
    new THREE.CylinderGeometry(0.075, 0.088, 0.08, 14).translate(0, 0.01, 0),
    new THREE.SphereGeometry(0.03, 8, 6).scale(1, 1.1, 1.2).translate(0, 0.095, 0.128),
    new THREE.BoxGeometry(0.22, 0.016, 0.016).translate(0, 0.165, 0.144),
    new THREE.BoxGeometry(0.02, 0.012, 0.014).translate(0, 0.152, 0.151),
    new THREE.BoxGeometry(0.012, 0.012, 0.13).translate(-0.108, 0.158, 0.08),
    new THREE.BoxGeometry(0.012, 0.012, 0.13).translate(0.108, 0.158, 0.08)
  );
  const eyes = rbox(0.2, 0.078, 0.06, 0.026, 0, 0.146, 0.104);
  const lenses = merge(rbox(0.08, 0.048, 0.014, 0.012, -0.05, 0.145, 0.15), rbox(0.08, 0.048, 0.014, 0.012, 0.05, 0.145, 0.15));
  const chain = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(
      [
        [-0.11, 0.15, 0.02],
        [-0.125, 0.04, 0.03],
        [-0.1, -0.08, 0.09],
        [-0.04, -0.14, 0.125],
        [0.04, -0.14, 0.125],
        [0.1, -0.08, 0.09],
        [0.125, 0.04, 0.03],
        [0.11, 0.15, 0.02],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z))
    ),
    28,
    0.005,
    4
  );
  const capCrown = merge(
    new THREE.SphereGeometry(0.154, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.88, 1.06).translate(0, 0.18, 0),
    new THREE.CylinderGeometry(0.155, 0.155, 0.03, 16).scale(1, 1, 1.06).translate(0, 0.185, 0),
    (() => {
      const pts: THREE.Vector2[] = [];
      for (let k = 0; k <= 14; k++) {
        const a = (k / 14) * Math.PI;
        pts.push(new THREE.Vector2(Math.cos(a) * 0.135, Math.sin(a) * 0.15));
      }
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.018, bevelEnabled: false });
      g.rotateX(Math.PI / 2);
      g.rotateX(0.16);
      g.translate(0, 0.192, 0.105);
      return g;
    })(),
    new THREE.SphereGeometry(0.018, 8, 6).translate(0, 0.318, 0)
  );
  const patch = new THREE.PlaneGeometry(0.085, 0.056).rotateX(-0.45).translate(0, 0.245, 0.142);
  const hoodUp = new THREE.SphereGeometry(0.18, 16, 12, Math.PI / 2 + 1.05, Math.PI * 2 - 2.1, 0, Math.PI * 0.72).scale(1, 1.12, 1.15).translate(0, 0.12, -0.025);
  const helmet = merge(
    new THREE.SphereGeometry(0.168, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.8, 1.08).translate(0, 0.17, 0),
    new THREE.TorusGeometry(0.17, 0.018, 6, 24).rotateX(Math.PI / 2).scale(1, 1, 1.08).translate(0, 0.17, 0)
  );

  // Torso: suit jacket with lapels, shirt front and collar, tie; hoodie; fatigues and vest
  const jacket = taper(rbox(0.35, 0.45, 0.21, 0.05, 0, 0.215, 0), 0.84);
  const lapels = merge(
    flat(
      [
        [-0.012, 0.25],
        [-0.05, 0.25],
        [-0.112, 0.4],
        [-0.075, 0.44],
      ],
      0.103,
      0.012
    ),
    flat(
      mirror([
        [-0.012, 0.25],
        [-0.05, 0.25],
        [-0.112, 0.4],
        [-0.075, 0.44],
      ]),
      0.103,
      0.012
    )
  );
  const shirt = merge(
    flat(
      [
        [-0.068, 0.445],
        [0, 0.25],
        [0.068, 0.445],
      ],
      0.1,
      0.01
    ),
    flat(
      [
        [-0.075, 0.45],
        [-0.012, 0.42],
        [-0.055, 0.385],
      ],
      0.109,
      0.008
    ),
    flat(
      mirror([
        [-0.075, 0.45],
        [-0.012, 0.42],
        [-0.055, 0.385],
      ]),
      0.109,
      0.008
    ),
    new THREE.CylinderGeometry(0.083, 0.088, 0.035, 14).translate(0, 0.448, 0)
  );
  const tie = flat(
    [
      [-0.016, 0.418],
      [0.016, 0.418],
      [0.012, 0.395],
      [0.027, 0.3],
      [0, 0.265],
      [-0.027, 0.3],
      [-0.012, 0.395],
    ],
    0.111,
    0.008
  );
  const hoodieBody = merge(taper(rbox(0.37, 0.45, 0.235, 0.075, 0, 0.215, 0), 0.92), rbox(0.2, 0.09, 0.03, 0.012, 0, 0.12, 0.112));
  const hoodDown = new THREE.TorusGeometry(0.1, 0.04, 6, 14, Math.PI).rotateX(Math.PI / 2 + 0.5).rotateZ(Math.PI).translate(0, 0.44, -0.04);
  const strings = merge(new THREE.BoxGeometry(0.008, 0.11, 0.008).translate(-0.035, 0.37, 0.12), new THREE.BoxGeometry(0.008, 0.11, 0.008).translate(0.035, 0.37, 0.12));
  const fatigues = taper(rbox(0.35, 0.45, 0.22, 0.05, 0, 0.215, 0), 0.86);
  const vest = merge(rbox(0.37, 0.27, 0.25, 0.04, 0, 0.26, 0), rbox(0.36, 0.04, 0.24, 0.015, 0, 0.03, 0));
  const backpack = merge(
    rbox(0.25, 0.28, 0.1, 0.035, 0, 0.25, -0.16),
    new THREE.BoxGeometry(0.03, 0.32, 0.012).translate(-0.085, 0.26, 0.11),
    new THREE.BoxGeometry(0.03, 0.32, 0.012).translate(0.085, 0.26, 0.11)
  );
  const crossbody = merge(rbox(0.15, 0.12, 0.05, 0.02, 0.13, 0.06, 0.11), new THREE.BoxGeometry(0.026, 0.52, 0.01).rotateZ(0.72).translate(0, 0.26, 0.112));
  const headphones = merge(
    new THREE.TorusGeometry(0.095, 0.016, 6, 16, Math.PI * 1.15).rotateX(Math.PI / 2).rotateY(Math.PI * 0.43).translate(0, 0.455, 0.0),
    new THREE.CylinderGeometry(0.038, 0.038, 0.03, 12).rotateZ(Math.PI / 2).translate(-0.095, 0.44, 0.05),
    new THREE.CylinderGeometry(0.038, 0.038, 0.03, 12).rotateZ(Math.PI / 2).translate(0.095, 0.44, 0.05)
  );

  // Limbs
  const upper = merge(caps(0.048, 0.12, -0.1), new THREE.SphereGeometry(0.058, 10, 8).translate(0.004, -0.01, 0));
  const fore = caps(0.044, 0.11, -0.09);
  const cuff = new THREE.CylinderGeometry(0.047, 0.047, 0.025, 12).translate(0, -0.172, 0);
  const hand = rbox(0.07, 0.08, 0.072, 0.025, 0, -0.215, 0.006);
  const thigh = caps(0.058, 0.14, -0.12);
  const shin = caps(0.052, 0.13, -0.1);
  const shoe = rbox(0.1, 0.07, 0.18, 0.03, 0, -0.205, 0.035);
  const sole = rbox(0.12, 0.025, 0.2, 0.01, 0, -0.232, 0.035);

  const patchTex = canvasTex(128, 84, (c) => {
    c.fillStyle = '#ffffff';
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
  const gummyTex = canvasTex(128, 160, (c) => {
    c.fillStyle = '#d8312f';
    c.fillRect(0, 0, 128, 160);
    c.fillStyle = '#c99a4a';
    c.fillRect(0, 0, 128, 22);
    c.font = '900 34px Impact, "Arial Narrow", sans-serif';
    c.textAlign = 'center';
    c.fillStyle = '#ffffff';
    c.fillText('GAS FEE', 64, 82);
    c.font = '900 22px Impact, "Arial Narrow", sans-serif';
    c.fillText('GUMMY BEARS', 64, 112);
  });
  const gummy = rbox(0.1, 0.13, 0.04, 0.012, 0, -0.03, 0.04);
  // The same assault rifle the player carries, held upright on parade
  const rifle = rifleGeometry().rotateX(-Math.PI / 2).translate(0, 0, 0.03);

  const lensMat = () => lit(new THREE.MeshToonMaterial({ color: '#0e7a46', emissive: '#22d07a' }), 0.12, 0.7);
  const patchMat = () => new THREE.MeshToonMaterial({ map: patchTex });
  const hoodMat = () => toon('#ffffff', { side: THREE.DoubleSide });
  const gummyMat = () => new THREE.MeshToonMaterial({ map: gummyTex });
  const always = () => true;

  partsCache = [
    { joint: 'head', geo: head, color: BLACK, when: always },
    { joint: 'head', geo: eyes, color: SKIN, when: always },
    { joint: 'head', geo: lenses, color: '#ffffff', mat: lensMat, when: always },
    { joint: 'head', geo: chain, color: '#e2b04a', when: (o) => !!o.chain, detail: true },
    { joint: 'head', geo: capCrown, color: 'cap', when: hasCap },
    { joint: 'head', geo: patch, color: '#ffffff', mat: patchMat, when: hasCap, detail: true },
    { joint: 'head', geo: hoodUp, color: 'top', mat: hoodMat, when: (o) => hoodie(o) && !!o.hood },
    { joint: 'head', geo: helmet, color: '#3e4a26', when: soldier },
    { joint: 'torso', geo: jacket, color: 'top', when: suit },
    { joint: 'torso', geo: lapels, color: 'lapel', when: suit, detail: true },
    { joint: 'torso', geo: shirt, color: '#f3f2f7', when: suit },
    { joint: 'torso', geo: tie, color: 'tie', when: suit },
    { joint: 'torso', geo: hoodieBody, color: 'top', when: hoodie },
    { joint: 'torso', geo: hoodDown, color: 'top', when: (o) => hoodie(o) && !o.hood },
    { joint: 'torso', geo: strings, color: '#f3f2f7', when: hoodie, detail: true },
    { joint: 'torso', geo: fatigues, color: 'top', when: soldier },
    { joint: 'torso', geo: vest, color: '#3a4422', when: soldier },
    { joint: 'torso', geo: backpack, color: 'backpack', when: (o) => !!o.backpack },
    { joint: 'torso', geo: crossbody, color: 'crossbody', when: (o) => !!o.crossbody },
    { joint: 'torso', geo: headphones, color: 'headphones', when: (o) => !!o.headphones, detail: true },
    ...(['L', 'R'] as const).flatMap((s): Part[] => [
      { joint: `arm${s}`, geo: upper, color: 'top', when: always, fat: true },
      { joint: `fore${s}`, geo: fore, color: 'top', when: always, fat: true },
      { joint: `fore${s}`, geo: cuff, color: '#f3f2f7', when: suit, detail: true },
      { joint: `fore${s}`, geo: hand, color: SKIN, when: notSoldier },
      { joint: `fore${s}`, geo: hand, color: '#2b2a33', when: soldier },
      { joint: `leg${s}`, geo: thigh, color: 'bottom', when: always, fat: true },
      { joint: `shin${s}`, geo: shin, color: 'bottom', when: always, fat: true },
      { joint: `shin${s}`, geo: shoe, color: 'shoes', when: always, fat: true },
      { joint: `shin${s}`, geo: sole, color: '#f3f2f7', when: hoodie, detail: true },
      { joint: `hand${s}`, geo: rifle, color: '#2b2a33', when: (o) => o.rifle === (s === 'L' ? 'left' : 'right') },
    ]),
    { joint: 'handR', geo: gummy, color: '#ffffff', mat: gummyMat, when: (o) => !!o.gummy, name: 'gummy' },
  ];
  return partsCache;
}

const tmp = new THREE.Color();
function colorOf(p: Part, o: Outfit): string {
  if (p.color.startsWith('#')) return p.color;
  if (p.color === 'lapel') return '#' + tmp.set(o.top).multiplyScalar(0.62).getHexString();
  return (o[p.color as keyof Outfit] as string | undefined) ?? '#ff00ff';
}

/* ---------- One figure ---------- */

export interface Degen {
  g: THREE.Object3D;
  pose: Pose;
  /** Apply `pose` to the figure */
  update(): void;
  hands: [THREE.Object3D, THREE.Object3D];
  /** The chest, for things carried at the shoulder (the rifle) */
  torso: THREE.Object3D;
  /** The gummy in his hand, if the outfit has one (put away while he holds the rifle) */
  gummy?: THREE.Object3D;
}

export function createDegen(o: Outfit = PLAYER): Degen {
  const rig = makeRig();
  let gummy: THREE.Object3D | undefined;
  for (const p of parts()) {
    if (!p.when(o)) continue;
    const mesh = new THREE.Mesh(p.geo, p.mat ? p.mat() : toon(colorOf(p, o)));
    if (isFat(p, o)) mesh.scale.copy(FAT);
    mesh.castShadow = true;
    rig.j[p.joint].add(mesh);
    if (p.name === 'gummy') gummy = mesh;
  }
  const pose = newPose();
  applyPose(rig, pose);
  return { g: rig.root, pose, update: () => applyPose(rig, pose), hands: [rig.j.handL, rig.j.handR], torso: rig.j.torso, gummy };
}

/* ---------- A crowd ---------- */

export interface Crowd {
  /** Pose figure `i` standing at (x, y, z) facing `yaw` (0 = +z) */
  set(i: number, x: number, y: number, z: number, yaw: number, scale: number, pose: Pose): void;
  /** Call once a frame after setting everyone */
  commit(): void;
  meshes: THREE.InstancedMesh[];
}

export function createCrowd(parent: THREE.Object3D, outfits: Outfit[], opts: { light?: boolean } = {}): Crowd {
  const n = outfits.length;
  const rig = makeRig();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const fat = new THREE.Matrix4().makeScale(FAT.x, FAT.y, FAT.z);
  const m4 = new THREE.Matrix4();
  // Parts that share a shape and a colour rule (left and right limbs) share one instanced mesh
  const groups = new Map<string, Part[]>();
  for (const p of parts()) {
    if ((opts.light && p.detail) || !outfits.some((o) => p.when(o))) continue;
    const key = `${p.geo.uuid}|${p.color}|${p.mat ? "mat" : ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  const used = [...groups.values()];
  const meshes = used.map((g) => {
    const p = g[0];
    const m = new THREE.InstancedMesh(p.geo, p.mat ? p.mat() : toon('#ffffff'), n * g.length);
    m.castShadow = true;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    outfits.forEach((o, i) =>
      g.forEach((q, k) => {
        m.setColorAt(i * g.length + k, tmp.set(q.mat ? '#ffffff' : colorOf(q, o)));
        if (!q.when(o)) m.setMatrixAt(i * g.length + k, zero);
      })
    );
    parent.add(m);
    return m;
  });
  return {
    meshes,
    set(i, x, y, z, yaw, scale, pose) {
      const o = outfits[i];
      rig.root.position.set(x, y, z);
      rig.root.rotation.set(0, yaw, 0);
      rig.root.scale.set(scale * (o.build ?? 1), scale * (o.height ?? 1), scale * (o.build ?? 1));
      applyPose(rig, pose);
      rig.root.updateMatrixWorld(true);
      for (let gi = 0; gi < used.length; gi++) {
        const g = used[gi];
        for (let k = 0; k < g.length; k++) {
          const q = g[k];
          if (!q.when(o)) continue;
          const w = rig.j[q.joint].matrixWorld;
          meshes[gi].setMatrixAt(i * g.length + k, isFat(q, o) ? m4.multiplyMatrices(w, fat) : w);
        }
      }
    },
    commit() {
      for (const m of meshes) m.instanceMatrix.needsUpdate = true;
    },
  };
}

/* ---------- A varied city crowd ---------- */

/** Suits and hoodies in a spread of colours, some with bags or headphones. */
export function cityOutfit(r: () => number): Outfit {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
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
