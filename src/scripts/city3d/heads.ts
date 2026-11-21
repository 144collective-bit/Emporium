/*
 * The characters' heads (docs/characters-plan.md): Degen's body with a head
 * of its own, sculpted after the owner's art. DOM-free like body.ts, so the
 * tests build them. Every head here is in the head bone's space, as Degen's
 * is (body.ts): the same neck tube down into the collar, so every top's
 * collar, the hood down and the headphones fit it as they fit his.
 *
 * - Smilex (the second, the owner's art, 2026-11-21; a real name the owner
 *   approved): a thick hexagon of a head, flat on top and bottom and pointed
 *   at the sides, bright yellow, with a smile and two oval eyes in ink; white
 *   cartoon gloves (the wardrobe's `gloves`) and the PulseChain symbol on his
 *   gold chain (`pulsePendant()`: the owner's call, an exception to "no other
 *   company's logo").
 * - SlimeWhale (the first, the owner's art, 2026-11-21): a tall boxy head,
 *   flat on top and at the back, a square jaw and big ears; three lime eyes
 *   bulging in a row across the brow, black pupils; wide lime lips standing
 *   off the face, closed on a dark slit; a short smirk line; a grey-brown
 *   buzz over the crown and back. Nothing is worn over it (the owner's call).
 *
 * Single figures only (detail 2 on phones, 3 on desktops): the crowd never
 * wears a character's head. Its own chunk, loaded the first time a character
 * is worn (`loadHeads()` in character.ts hands it body.ts's `headModel()`,
 * `setHeadModel()`, and hands `characterParts()` to the wardrobe,
 * `useHeads()`). It imports nothing of the boot's but three.js (only types
 * from body.ts), so the bundler leaves the boot's own chunks as they were.
 */
import * as THREE from 'three';
import type { HeadDef, Row, headModel } from './body';
import type { CharacterId } from '../net/profile-data';
type HeadModel = ReturnType<typeof headModel>;

/** The characters whose heads are here (profile-data.ts `CHARACTERS` names them: the tests hold the two lists alike) */
export const CHARACTER_IDS: CharacterId[] = ['slimewhale', 'smilex'];

/** The lime of his eyes and lips: under the palette's white, so it never blooms (visual-rules.md) */
export const SLIME_LIME = '#b4e03a';
/** The ink on his face (the pupils, the slit, the smirk): the wardrobe's black */
export const SLIME_INK = '#16141f';
/** The glints */
export const SLIME_GLINT = '#f3f2f7';

const bell = (x: number, at: number, w: number) => Math.exp(-(((x - at) / w) ** 2));

/** SlimeWhale's head: the neck as Degen's, then a square jaw, straight sides, a flat face and a flat top */
const SLIME_ROWS: Row[] = [
  // The neck tube, as Degen's (the collars fit it)
  [-0.085, 0.05, 0.051, 0.05, -0.01, 2],
  [-0.045, 0.047, 0.048, 0.049, -0.009, 2],
  [-0.008, 0.046, 0.05, 0.048, -0.008, 2],
  // Under the square jaw (its underside as slim as Degen's under the chin, so a nod clears the hood rolled down)
  [0.01, 0.05, 0.064, 0.052, -0.006, 2.3],
  [0.026, 0.064, 0.08, 0.058, -0.004, 2.8],
  [0.05, 0.081, 0.095, 0.076, -0.002, 3.3],
  // The face: flat in front, the sides straight
  [0.07, 0.09, 0.102, 0.09, 0, 4],
  [0.12, 0.091, 0.101, 0.095, -0.001, 4],
  [0.17, 0.09, 0.099, 0.097, -0.003, 4],
  // The crown, flat on top
  [0.205, 0.088, 0.096, 0.095, -0.005, 3.8],
  [0.228, 0.082, 0.089, 0.089, -0.006, 3.4],
  [0.242, 0.07, 0.076, 0.077, -0.007, 3],
  [0.25, 0.05, 0.055, 0.056, -0.007, 2.6],
  [0.254, 0.022, 0.025, 0.025, -0.007, 2.2],
  [0.2555, 0.003, 0.003, 0.003, -0.007, 2],
];
/** The muzzle round the mouth, a touch forward of the flat face */
const slimeFeatures = (x: number, y: number) => 0.007 * bell(y, 0.058, 0.03) * bell(x, 0, 0.06);
const slimeRings = (q: number) => {
  const ys: number[] = [-0.085, -0.06, -0.035, -0.015, -0.004, 0.004, 0.012, 0.02, 0.028];
  const step = q >= 3 ? 0.009 : 0.014;
  for (let y = 0.036; y < 0.236; y += step) ys.push(y);
  ys.push(0.236, 0.242, 0.247, 0.25, 0.2525, 0.254, 0.2555);
  return ys;
};
export const SLIME_HEAD: HeadDef = { rows: SLIME_ROWS, features: slimeFeatures, rings: slimeRings };
/** SlimeWhale's head as functions (body.ts `headModel()`, handed in by `setHeadModel()` before anything's built) */
export let SLIME: HeadModel;
/** The heads' shapes made with body.ts's builder (handed in: the chunk imports nothing of the boot's) */
export function setHeadModel(make: typeof headModel) {
  SLIME = make(SLIME_HEAD);
  SMILEX = make(SMILEX_HEAD);
}

/** Where things sit on his face */
export const SLIME_EYE_Y = 0.155;
export const SLIME_EYE_X = 0.062;
export const SLIME_EYE_R = 0.035;
/** How deep the eye domes are, as a share of their radius */
const EYE_DEPTH = 0.62;
export const SLIME_MOUTH_Y = 0.058;
const LIP_R = 0.021;
const LIP_LEN = 0.11;
const LIP_DEPTH = 0.7;

/** A point on a head's surface, `a` round it (0 is +x, PI/2 the front) at height y */
function surfacePoint(m: HeadModel, a: number, y: number, def: HeadDef) {
  const [, hw, fr, back, zc, n] = m.rowAt(y);
  const e = 2 / n;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const x = Math.sign(c) * Math.abs(c) ** e * hw;
  const w = Math.abs(s) ** e;
  const z = s >= 0 ? zc + fr * w + def.features(x, y) * w ** 4 : zc - back * w;
  return new THREE.Vector3(x, y, z);
}

/** A geometry's every vertex pushed forward by how far the face curves back at its x and height (things laid across the face) */
function alongFace(g: THREE.BufferGeometry) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + SLIME.front(p.getX(i), p.getY(i)) - SLIME.front(0, p.getY(i)));
  g.computeVertexNormals();
  return g;
}

/** The buzz: a shell over the crown and back from the hairline up, `gap` off the scalp, its edge tucked onto it */
function buzz(q: 2 | 3, gap: number) {
  const seg = q === 3 ? 40 : 26;
  const rows = q === 3 ? 12 : 8;
  // (high over the brow, above the ears at the sides, down to the nape at the back)
  const hairline = (a: number) => {
    const f = Math.sin(a);
    return f >= 0 ? 0.172 + 0.055 * f ** 1.5 : 0.172 - 0.1 * THREE.MathUtils.smoothstep(-f, 0.15, 0.85);
  };
  const top = SLIME.top - 0.0004;
  const centre = (y: number) => SLIME.rowAt(y)[4];
  /** The surface's outward normal at (a, y), from its neighbours */
  const normal = (a: number, y: number) => {
    const da = 0.004;
    const dy = 0.0006;
    const ta = surfacePoint(SLIME, a + da, y, SLIME_HEAD).sub(surfacePoint(SLIME, a - da, y, SLIME_HEAD));
    const ty = surfacePoint(SLIME, a, Math.min(top, y + dy), SLIME_HEAD).sub(surfacePoint(SLIME, a, y - dy, SLIME_HEAD));
    const n = new THREE.Vector3().crossVectors(ta, ty).normalize();
    const p = surfacePoint(SLIME, a, y, SLIME_HEAD);
    const out = new THREE.Vector3(p.x, (y - 0.12) * 0.5, p.z - centre(y));
    if (n.dot(out) < 0) n.negate();
    if (y > SLIME.top - 0.0015 || !Number.isFinite(n.x)) n.set(0, 1, 0);
    return n;
  };
  const pos: number[] = [];
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2;
    const y0 = hairline(a);
    // The outline from the hairline up, finely (the flat top turns in over a few millimetres), and its length
    const prof: THREE.Vector3[] = [];
    for (let y = y0; y < top; y += y > 0.245 ? 0.0006 : 0.003) prof.push(surfacePoint(SLIME, a, y, SLIME_HEAD));
    prof.push(surfacePoint(SLIME, a, top, SLIME_HEAD));
    const len = [0];
    for (let i = 1; i < prof.length; i++) len.push(len[i - 1] + prof[i].distanceTo(prof[i - 1]));
    const L = len[len.length - 1];
    for (let j = 0; j <= rows; j++) {
      const s = L * (j / rows) ** 1.2;
      let i = 1;
      while (i < prof.length - 1 && len[i] < s) i++;
      const f = len[i] > len[i - 1] ? (s - len[i - 1]) / (len[i] - len[i - 1]) : 0;
      const p = prof[i - 1].clone().lerp(prof[i], f);
      const tuck = j === 0 ? 0.15 : j === 1 ? 0.7 : 1;
      p.addScaledVector(normal(a, p.y), 0.0005 + gap * tuck);
      pos.push(p.x, p.y, p.z);
    }
  }
  const idx: number[] = [];
  const at = (k: number, j: number) => (k % seg) * (rows + 1) + j;
  for (let k = 0; k < seg; k++)
    for (let j = 0; j < rows; j++) {
      idx.push(at(k, j), at(k, j + 1), at(k + 1, j));
      idx.push(at(k + 1, j), at(k, j + 1), at(k + 1, j + 1));
    }
  const apex = pos.length / 3;
  pos.push(0, SLIME.top + 0.0005 + gap, centre(SLIME.top));
  for (let k = 0; k < seg; k++) idx.push(at(k, rows), apex, at(k + 1, rows));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // (wound outwards whichever way the ring turned)
  const p = g.attributes.position;
  const n = g.attributes.normal;
  let out = 0;
  for (let i = 0; i < p.count; i++) out += n.getX(i) * p.getX(i) + n.getY(i) * (p.getY(i) - 0.12) + n.getZ(i) * (p.getZ(i) - centre(p.getY(i)));
  if (out < 0) {
    const ix = g.index!.array as Uint16Array | Uint32Array;
    for (let t = 0; t < ix.length; t += 3) [ix[t + 1], ix[t + 2]] = [ix[t + 2], ix[t + 1]];
    g.computeVertexNormals();
  }
  return g;
}

/** Where each eye's dome sits: its middle (sunk a little into the face) and its turn to follow the face round */
export function slimeEyes() {
  return [-1, 0, 1].map((i) => {
    const x = i * SLIME_EYE_X;
    const yaw = i * 0.2;
    const centre = new THREE.Vector3(x, SLIME_EYE_Y, SLIME.front(x, SLIME_EYE_Y) - 0.006);
    return { centre, yaw };
  });
}

/** The point on an eye's dome `dir` from its middle (in the eye's own frame), and the dome's normal there */
function onEye(dir: THREE.Vector3) {
  const r = SLIME_EYE_R;
  const d = dir.clone().normalize();
  const t = 1 / Math.sqrt((d.x / r) ** 2 + (d.y / r) ** 2 + (d.z / (r * EYE_DEPTH)) ** 2);
  const p = d.multiplyScalar(t);
  const n = new THREE.Vector3(p.x / r ** 2, p.y / r ** 2, p.z / (r * EYE_DEPTH) ** 2).normalize();
  return { p, n };
}

/** A small flattened disc lying on a dome at `p`, facing along `n` */
function dot(r: number, thick: number, p: THREE.Vector3, n: THREE.Vector3, seg: number) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(4, Math.round(seg * 0.6))).scale(1, 1, thick);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
  return g.translate(p.x, p.y, p.z);
}

/** SlimeWhale's head at a detail level: every part, in the head bone's space, by what colours it (the wardrobe merges each) */
export function slimeWhale(q: 2 | 3) {
  const S = q === 3 ? 1 : 0.7;
  const R = (n: number) => Math.max(6, Math.round(n * S));
  const skull = SLIME.geometry(R(36), q);
  // Big ears, standing off the straight sides between the eyes and the mouth
  const ears = [-1, 1].map((s) => {
    const hw = SLIME.rowAt(0.112)[1];
    const outer = new THREE.SphereGeometry(0.037, R(14), R(10)).scale(0.4, 1, 0.72).translate(s * (hw + 0.005), 0.112, -0.012);
    return outer;
  });
  // The ear's bowl: a darker fold inside each one
  const earFolds = [-1, 1].map((s) => {
    const hw = SLIME.rowAt(0.112)[1];
    return new THREE.TorusGeometry(0.021, 0.0036, R(5), R(14), Math.PI * 1.3)
      .rotateZ(Math.PI * 0.35)
      .rotateY((s * Math.PI) / 2)
      .translate(s * (hw + 0.013), 0.113, -0.012);
  });
  // The three eyes: lime domes in a row across the brow, each turned to follow the face round
  const eyes: THREE.BufferGeometry[] = [];
  const pupils: THREE.BufferGeometry[] = [];
  const glints: THREE.BufferGeometry[] = [];
  for (const { centre, yaw } of slimeEyes()) {
    const turn = new THREE.Matrix4().makeRotationY(yaw);
    const move = new THREE.Matrix4().makeTranslation(centre.x, centre.y, centre.z).multiply(turn);
    eyes.push(new THREE.SphereGeometry(SLIME_EYE_R, R(24), R(18)).scale(1, 1, EYE_DEPTH).applyMatrix4(move));
    // (the pupils a little up and towards the middle eye, as in the art: a small dot, not a big iris)
    const look = onEye(new THREE.Vector3(-0.12 * Math.sign(centre.x), 0.1, 1));
    pupils.push(dot(0.0085, 0.3, look.p.clone().addScaledVector(look.n, 0.0004), look.n, R(12)).applyMatrix4(move));
    const shine = onEye(new THREE.Vector3(-0.12 * Math.sign(centre.x) - 0.17, 0.27, 1));
    glints.push(dot(0.0028, 0.3, shine.p.clone().addScaledVector(shine.n, 0.0012), shine.n, R(8)).applyMatrix4(move));
  }
  // The lips: a long rounded rim across the muzzle, standing off it, bent round the face
  const lipZ = SLIME.front(0, SLIME_MOUTH_Y) + 0.005;
  const lips = alongFace(
    new THREE.CapsuleGeometry(LIP_R, LIP_LEN, R(8), R(18)).rotateZ(Math.PI / 2).scale(1, 1, LIP_DEPTH).translate(0, SLIME_MOUTH_Y, lipZ)
  );
  // The slit between them: a dark strip along the lips' front
  const slit = alongFace(
    new THREE.BoxGeometry(LIP_LEN * 0.84, 0.0034, 0.002, R(20), 1, 1).translate(0, SLIME_MOUTH_Y, lipZ + LIP_R * LIP_DEPTH - 0.0006)
  );
  // The smirk: a short curve under the middle eye, off to one side, up at its end
  const smirk = (() => {
    const pts: THREE.Vector3[] = [];
    for (let t = 0; t <= 1.0001; t += 0.125) {
      const x = 0.006 + 0.03 * t;
      const y = 0.103 - 0.006 * Math.sin(Math.PI * t) + 0.005 * t;
      pts.push(new THREE.Vector3(x, y, SLIME.front(x, y) + 0.0024));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), R(14), 0.0016, 5, false);
  })();
  const hair = buzz(q, 0.0022);
  return {
    /** In the skin tone */
    skin: [skull, ...ears],
    /** The ears' folds, the skin a shade darker */
    folds: earFolds,
    /** In the lime */
    lime: [...eyes, lips],
    /** In ink */
    ink: [...pupils, slit, smirk],
    /** In white */
    glints,
    /** In the hair's colour */
    hair: [hair],
  };
}

/* ---------- Smilex ---------- */

/** His yellow: under the palette's white, so it never blooms (visual-rules.md) */
export const SMILEX_YELLOW = '#f4c61f';
/** His gloves: a shade under white, as the shirts are */
export const SMILEX_GLOVES = '#e9e7ef';
/** The hexagon: half its width point to point, its height flat to flat, where it sits, how deep */
const HEX_R = 0.135;
const HEX_H = Math.sqrt(3) * HEX_R;
const HEX_Y0 = 0.008;
const HEX_MID = HEX_Y0 + HEX_H / 2;
const HEX_Y1 = HEX_Y0 + HEX_H;
const HEX_D = 0.062;
const HEX_ZC = 0.004;
/** The hexagon's half-width at height y: its flat top and bottom, its points at the sides */
const hexHW = (y: number) => HEX_R / 2 + (HEX_R / 2) * (1 - Math.min(1, Math.abs(y - HEX_MID) / (HEX_H / 2)));
/** Smilex's head: the neck as Degen's, then the hexagon, its edges rounded a few millimetres */
const SMILEX_ROWS: Row[] = [
  [-0.085, 0.05, 0.051, 0.05, -0.01, 2],
  [-0.045, 0.047, 0.048, 0.049, -0.009, 2],
  [-0.008, 0.046, 0.05, 0.048, -0.008, 2],
  [HEX_Y0 - 0.004, 0.056, HEX_D - 0.012, HEX_D - 0.012, HEX_ZC, 5],
  [HEX_Y0, hexHW(HEX_Y0) - 0.002, HEX_D - 0.004, HEX_D - 0.004, HEX_ZC, 7],
  [HEX_Y0 + 0.006, hexHW(HEX_Y0 + 0.006), HEX_D, HEX_D, HEX_ZC, 8],
  [HEX_MID, HEX_R, HEX_D, HEX_D, HEX_ZC, 8],
  [HEX_Y1 - 0.006, hexHW(HEX_Y1 - 0.006), HEX_D, HEX_D, HEX_ZC, 8],
  [HEX_Y1, hexHW(HEX_Y1) - 0.002, HEX_D - 0.004, HEX_D - 0.004, HEX_ZC, 7],
  [HEX_Y1 + 0.003, 0.05, HEX_D - 0.014, HEX_D - 0.014, HEX_ZC, 5],
  [HEX_Y1 + 0.004, 0.003, 0.003, 0.003, HEX_ZC, 2],
];
/** Every row a ring (the hexagon's points and edges stay sharp where they should), and a few up the neck and lower face */
const smilexRings = () => [...new Set([...SMILEX_ROWS.map((r) => r[0]), -0.06, -0.035, -0.015, 0.03, 0.05, 0.075, 0.18])].sort((a, b) => a - b);
export const SMILEX_HEAD: HeadDef = { rows: SMILEX_ROWS, features: () => 0, rings: smilexRings };
/** Smilex's head as functions (handed in with SlimeWhale's, `setHeadModel()`) */
export let SMILEX: HeadModel;
export const SMILEX_EYE_Y = 0.15;
export const SMILEX_MOUTH_Y = 0.085;

/** A flat outline in ink laid on a head's front, `lift` off it (with holes: a border) */
function inkOn(m: HeadModel, outline: [number, number][], lift: number, depth = 0.0012, holes: [number, number][][] = []) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, m.front(p.getX(i), p.getY(i)) + lift + p.getZ(i));
  g.computeVertexNormals();
  return g;
}
/** A thick line from a to b as an outline (`w` wide) */
const bar = ([ax, ay]: [number, number], [bx, by]: [number, number], w: number): [number, number][] => {
  const l = Math.hypot(bx - ax, by - ay) || 1;
  const nx = (-(by - ay) / l) * (w / 2);
  const ny = ((bx - ax) / l) * (w / 2);
  return [
    [ax + nx, ay + ny],
    [bx + nx, by + ny],
    [bx - nx, by - ny],
    [ax - nx, ay - ny],
  ];
};

/** Smilex's head at a detail level: the hexagon, and the smile and eyes in ink */
export function smilex(q: 2 | 3) {
  const S = q === 3 ? 1 : 0.7;
  const R = (n: number) => Math.max(6, Math.round(n * S));
  const head = SMILEX.geometry(R(40), q);
  // Two tall oval eyes
  const eyes = [-1, 1].map((s) =>
    inkOn(
      SMILEX,
      Array.from({ length: R(20) }, (_, k): [number, number] => {
        const a = (k / R(20)) * Math.PI * 2;
        return [s * 0.038 + Math.cos(a) * 0.0095, SMILEX_EYE_Y + Math.sin(a) * 0.018];
      }),
      0.0006
    )
  );
  // The smile: a wide arc, and a tick across each end
  const CX = 0;
  const CY = 0.137;
  const RAD = 0.075;
  const A0 = (200 * Math.PI) / 180;
  const A1 = (340 * Math.PI) / 180;
  const W = 0.0075;
  const n = R(24);
  const arc: [number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const a = A0 + ((A1 - A0) * k) / n;
    arc.push([CX + Math.cos(a) * (RAD + W / 2), CY + Math.sin(a) * (RAD + W / 2)]);
  }
  for (let k = n; k >= 0; k--) {
    const a = A0 + ((A1 - A0) * k) / n;
    arc.push([CX + Math.cos(a) * (RAD - W / 2), CY + Math.sin(a) * (RAD - W / 2)]);
  }
  const smile = inkOn(SMILEX, arc, 0.0006);
  // (the ticks a hair further off than the smile, so the two never share a plane)
  const ticks = [A0, A1].map((a) => {
    const end: [number, number] = [CX + Math.cos(a) * RAD, CY + Math.sin(a) * RAD];
    const d = 0.012;
    return inkOn(SMILEX, bar([end[0] - Math.cos(a) * d, end[1] - Math.sin(a) * d], [end[0] + Math.cos(a) * d, end[1] + Math.sin(a) * d], 0.006), 0.0011);
  });
  return { head: [head], ink: [...eyes, smile, ...ticks], edges: hexEdges(q) };
}

/**
 * The block's edges inked (the owner's call, after the art: a cartoon block, black lines along its edges, not a ring
 * drawn on the face): round the face where it turns onto the sides, round the back the same, and along each of the
 * six corners from front to back, following the rounded edge. Black tubes half sunk into the rounded edges, so each
 * reads as a bold line from the face and from the side alike; a ball at each corner joins them.
 */
export const EDGE_R = 0.0038;
function hexEdges(q: 2 | 3) {
  const M = SMILEX;
  const seg = q === 3 ? 6 : 4;
  // (the rounded edge's middle on a row: its squircle at 45 degrees, front or back)
  const rim = (x: number, y: number, side: 1 | -1, k = 0.5) => {
    const [, hw, fr, back, zc, n] = M.rowAt(y);
    const e = 2 / n;
    const a = (Math.PI / 2) * k;
    return new THREE.Vector3(Math.sign(x) * Math.cos(a) ** e * hw, y, zc + side * Math.sin(a) ** e * (side > 0 ? fr : back));
  };
  // (the top and bottom flats: the edge between face and flat, a couple of millimetres in from each)
  const yTop = HEX_Y1 - 0.0012;
  const yBot = HEX_Y0 + 0.0012;
  const flatZ = (side: 1 | -1) => HEX_ZC + side * (HEX_D - 0.0028);
  const corners = (side: 1 | -1) => {
    const top = hexHW(HEX_Y1) - 0.002;
    const bot = hexHW(HEX_Y0) - 0.002;
    const c = rim(1, HEX_MID, side).x;
    return [
      new THREE.Vector3(c, HEX_MID, rim(1, HEX_MID, side).z),
      new THREE.Vector3(top * 0.97, yTop, flatZ(side)),
      new THREE.Vector3(-top * 0.97, yTop, flatZ(side)),
      new THREE.Vector3(-c, HEX_MID, rim(1, HEX_MID, side).z),
      new THREE.Vector3(-bot * 0.97, yBot, flatZ(side)),
      new THREE.Vector3(bot * 0.97, yBot, flatZ(side)),
    ];
  };
  const out: THREE.BufferGeometry[] = [];
  const tube = (pts: THREE.Vector3[], n: number) => out.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), n, EDGE_R, seg, false));
  const ball = (p: THREE.Vector3) => out.push(new THREE.SphereGeometry(EDGE_R * 1.05, seg + 2, Math.max(3, seg - 1)).translate(p.x, p.y, p.z));
  for (const side of [1, -1] as const) {
    const c = corners(side);
    // Round the face (or the back): the slanted sides follow the rim row by row, the flats run straight
    for (let i = 0; i < 6; i++) {
      const a = c[i];
      const b = c[(i + 1) % 6];
      if (Math.abs(a.y - b.y) < 1e-6) tube([a, b], 2);
      else {
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 8; k++) {
          const y = a.y + ((b.y - a.y) * k) / 8;
          const p = rim(a.x, y, side);
          // (towards the flats the line eases onto the flat's edge line)
          pts.push(k === 8 ? b.clone() : k === 0 ? a.clone() : p);
        }
        tube(pts, 10);
      }
      ball(c[i]);
    }
  }
  // Along each corner, front to back: the side points round their rows' rounded ends, the four flats' corners along
  // where the flat meets the slanted side
  for (const [x, y] of [
    [1, HEX_MID],
    [-1, HEX_MID],
  ] as const) {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 8; k++) {
      const t = 1 - k / 4;
      pts.push(rim(x, y, t >= 0 ? 1 : -1, Math.abs(t) * 0.5));
    }
    tube(pts, 10);
  }
  for (const [sx, y] of [
    [1, yTop],
    [-1, yTop],
    [1, yBot],
    [-1, yBot],
  ] as const) {
    const w = (y === yTop ? hexHW(HEX_Y1) : hexHW(HEX_Y0)) - 0.002;
    tube([new THREE.Vector3(sx * w * 0.97, y, flatZ(1)), new THREE.Vector3(sx * w * 1.0, y, HEX_ZC), new THREE.Vector3(sx * w * 0.97, y, flatZ(-1))], 6);
  }
  return out;
}

/**
 * The PulseChain symbol as a pendant (the owner's call, 2026-11-21), set like a jewel: a gold back plate and a bezel
 * standing round the edge, the face set into it in four bevelled facets for the logo's gradient (cyan, violet, magenta,
 * red), the white pulse line across it edge to edge with rounded joins, and a chunky bail at the top for the chain.
 * Flat-topped, centred on the origin, its face towards +z, about 6 cm across.
 */
export function pulsePendant(q: 2 | 3) {
  const r = 0.031;
  const T = 0.008;
  const hex = (rr: number, k: number): [number, number] => [Math.cos((k * Math.PI) / 3) * rr, Math.sin((k * Math.PI) / 3) * rr];
  const hexPts = (rr: number) => Array.from({ length: 6 }, (_, k) => hex(rr, k));
  const shapeOf = (pts: [number, number][]) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const flat = (outline: [number, number][], z: number, d: number, bevel = 0) =>
    new THREE.ExtrudeGeometry(shapeOf(outline), { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 1 }).translate(0, 0, z);
  // The back plate, and the bezel: a hexagonal ring standing proud of the face
  const plate = new THREE.CylinderGeometry(r, r, T, 6, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 6);
  const IN = r * 0.84;
  const bezelShape = shapeOf(hexPts(r));
  bezelShape.holes.push(new THREE.Path(hexPts(IN).reverse().map(([x, y]) => new THREE.Vector2(x, y))));
  const bezel = new THREE.ExtrudeGeometry(bezelShape, { depth: 0.0035, bevelEnabled: true, bevelThickness: 0.0009, bevelSize: 0.0007, bevelSegments: q === 3 ? 2 : 1 }).translate(0, 0, T / 2);
  // The face's four facets, set a little below the bezel's lip, each bevelled so it catches the light like a cut stone
  const f = IN - 0.0012;
  const h = (f * Math.sqrt(3)) / 2;
  const g = 0.0026;
  const face = T / 2 + 0.0003;
  const xAt = (y: number) => f - Math.abs(y) / Math.sqrt(3);
  const B = 0.0007;
  const bands = {
    cyan: flat([[0.0009, g], [xAt(g), g], hex(f, 1), [0.0009, h]], face, 0.0012, B),
    violet: flat([[-0.0009, g], [-0.0009, h], hex(f, 2), [-xAt(g), g]], face, 0.0012, B),
    magenta: flat([[0.0009, -g], [0.0009, -h], hex(f, 5), [xAt(g), -g]], face, 0.0012, B),
    red: flat([[-0.0009, -g], [-xAt(g), -g], hex(f, 4), [-0.0009, -h]], face, 0.0012, B),
  };
  // The pulse line: flat in from each edge, up, down past the middle, up again; thick, its joins round
  const P: [number, number][] = [
    [-1, 0],
    [-0.4, 0],
    [-0.25, 0.62],
    [-0.07, -0.74],
    [0.1, 0.46],
    [0.23, 0],
    [1, 0],
  ].map(([x, y]) => [x * IN, y * f]);
  const W = 0.0055;
  const lineZ = face + 0.0012 + B + 0.0003;
  const pulse = [
    ...P.slice(1).map((b2, i) => flat(bar(P[i], b2, W), lineZ, 0.0009)),
    ...P.slice(1, -1).map(([x, y]) => new THREE.CylinderGeometry(W / 2, W / 2, 0.0009, R2(q, 10)).rotateX(Math.PI / 2).translate(x, y, lineZ + 0.00045)),
  ];
  const bail = new THREE.TorusGeometry(0.0062, 0.0022, R2(q, 6), R2(q, 14)).rotateY(Math.PI / 2).translate(0, (r * Math.sqrt(3)) / 2 + 0.0055, 0);
  return { gold: [plate, bezel, bail], bands, white: pulse };
}

/**
 * A chunky curb chain along a path (Smilex's: docs/characters-plan.md): oval links every centimetre, each turned a
 * quarter from the one before so they interlock, laid where the necklace's cord would be
 */
export function curbChain(path: THREE.Curve<THREE.Vector3>, q: 2 | 3) {
  const len = path.getLength();
  const n = Math.round(len / 0.0105);
  const links: THREE.BufferGeometry[] = [];
  const link = new THREE.TorusGeometry(0.0066, 0.0021, q === 3 ? 5 : 3, q === 3 ? 10 : 7).scale(1.35, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  const front = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = path.getPointAt(u);
    const t = path.getTangentAt(u).normalize();
    // (a link lies flat on the chest, the next stands across it)
    const lie = new THREE.Vector3().crossVectors(t, up);
    if (lie.lengthSq() < 1e-4) lie.crossVectors(t, front);
    lie.normalize();
    if (lie.z < 0) lie.negate();
    const normal = i % 2 ? new THREE.Vector3().crossVectors(t, lie).normalize() : lie;
    const side = new THREE.Vector3().crossVectors(normal, t).normalize();
    links.push(link.clone().applyMatrix4(new THREE.Matrix4().makeBasis(t, side, normal).setPosition(p)));
  }
  return links;
}
const R2 = (q: 2 | 3, n: number) => Math.max(4, Math.round(n * (q === 3 ? 1 : 0.7)));

/** A part of a character's head: its geometries in the head bone's space (one piece), its colour (or the outfit's `skin` or `hair`) */
export interface HeadPart {
  geos: THREE.BufferGeometry[];
  color: string;
  /** Darker (under 1) or lighter, as the wardrobe's `shade` */
  shade?: number;
  /** Fine detail (left off where the wardrobe leaves `detail` off) */
  detail?: boolean;
}

/** A character's head at a detail level, part by part, as the wardrobe draws it */
export function characterParts(id: CharacterId, q: 2 | 3): HeadPart[] {
  switch (id) {
    case 'slimewhale': {
      const s = slimeWhale(q);
      return [
        { geos: s.skin, color: 'skin' },
        { geos: s.folds, color: 'skin', shade: 0.8 },
        { geos: s.lime, color: SLIME_LIME },
        { geos: s.ink, color: SLIME_INK },
        { geos: s.glints, color: SLIME_GLINT, detail: true },
        { geos: s.hair, color: 'hair' },
      ];
    }
    case 'smilex': {
      const s = smilex(q);
      return [
        { geos: s.head, color: SMILEX_YELLOW },
        { geos: s.ink, color: SLIME_INK },
        { geos: s.edges, color: SLIME_INK },
      ];
    }
  }
}

/** What hangs on a character's chain in place of the diamond (null: the diamond), centred, facing +z */
export function characterPendant(id: CharacterId, q: 2 | 3): HeadPart[] | null {
  if (id !== 'smilex') return null;
  const p = pulsePendant(q);
  return [
    { geos: p.gold, color: '#e2b04a' },
    { geos: [p.bands.cyan], color: '#22c4ee' },
    { geos: [p.bands.violet], color: '#6a3cf0' },
    { geos: [p.bands.magenta], color: '#c42ade' },
    { geos: [p.bands.red], color: '#ee3070' },
    { geos: p.white, color: '#e9e7ef' },
  ];
}

/** A character's own chain along the necklace's path (null: the necklace's smooth cord) */
export function characterChain(id: CharacterId, q: 2 | 3, path: THREE.Curve<THREE.Vector3>): THREE.BufferGeometry[] | null {
  return id === 'smilex' ? curbChain(path, q) : null;
}

/** The colour of a character's gloves (null: bare hands in the skin tone) */
export const characterGloves = (id: CharacterId): string | null => (id === 'smilex' ? SMILEX_GLOVES : null);
