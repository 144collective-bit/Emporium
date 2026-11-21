/*
 * The characters' heads (docs/characters-plan.md): Degen's body with a head
 * of its own, sculpted after the owner's art. DOM-free like body.ts, so the
 * tests build them. Every head here is in the head bone's space, as Degen's
 * is (body.ts): the same neck tube down into the collar, so every top's
 * collar, the hood down and the headphones fit it as they fit his.
 *
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
type HeadModel = ReturnType<typeof headModel>;

/** The characters (beside Degen himself) */
export type CharacterId = 'slimewhale';
export const CHARACTER_IDS: CharacterId[] = ['slimewhale'];

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
  }
}
