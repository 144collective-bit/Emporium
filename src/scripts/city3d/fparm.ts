/*
 * Degen's arms in first person with empty hands (the owner's call, 2026-11: "the arms look deformed and unnatural";
 * "we want this looking premium"): the shapes and the reach. DOM-free, tested in tests/fparm.test.ts; fistsview.ts
 * dresses and moves them.
 *
 * - Each arm is two pieces jointed at the elbow: the upper arm from the shoulder (out of shot, behind the eye) and
 *   the forearm with the fist on its end. They're his body's own arms (the owner's call, 2026-11: "use his real
 *   body's clips"): each frame his skeleton, posed by the motion capture and the fight's clips as third person
 *   shows him, is read from an eye in his head (`eyeFrame()`), and the arm laid on his shoulder, elbow and wrist
 *   (`bodyArm()`), the fist turned as his hand is. With the guard up a first-person correction (`FP_FIX`) carries
 *   the fists into shot without moving the body: the elbow is then solved again (`solveArm()`, a two-bone reach)
 *   round towards where his own elbow is, so the arm keeps its lengths and its bend.
 * - The fist is modelled for being seen up close (`fistGeometry()`), not the body's hand closed (body.ts
 *   `bakedHand()`, built to read from a distance): the back of the hand, four knuckles in a row that slopes off to the
 *   little finger, each finger folded in two under them, and the thumb wrapped across the front. Its frame: the wrist
 *   at the origin, +y out to the knuckles, +z the back of the hand, the thumb on the side `thumb` says.
 * - Sleeves are turned (`sleeveGeometry()`): round at both ends, so the elbow bends without a seam, tapering a touch
 *   towards the cuff.
 * - Every piece carries its own colour (`paint()`), so an arm is two draws, the upper arm and the
 *   forearm with its cuff and fist, whatever the outfit (a `tint` attribute of its own, not three's vertex colours).
 *
 * Lengths are metres, life size (fistsview.ts builds them `FP_SCALE` times bigger and further out).
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HAND, UPPER_ARM, WRIST_Y, WRIST_Z } from './skeleton';

/** The fist's wrist (its origin) to its knuckles, along +y */
export const KNUCKLES = 0.09;
/** His forearm in the body's units: the elbow to the hand bone, and on from it to his knuckles */
const BODY_FORE = Math.hypot(WRIST_Y, WRIST_Z);
const BODY_KNUCKLES = Math.abs(HAND.knuckleY);
/**
 * The arm's two lengths (metres): shoulder to elbow, elbow to the fist's wrist. In his body's proportions, so laid on
 * his skeleton the fist's knuckles land where his own do (`bodyArm()`)
 */
export const ARM = { upper: 0.29, fore: (0.29 * (BODY_FORE + BODY_KNUCKLES)) / UPPER_ARM - KNUCKLES };
/** How many of these metres to one of his body's units (his arm's length against `UPPER_ARM`) */
export const BODY_TO_ARM = ARM.upper / UPPER_ARM;
/**
 * The eye in his head, in his body's units from the head bone: up, and forward (the camera's own first-person height
 * is above his head, so the arms are read from here instead)
 */
export const EYE = { up: 0.07, fwd: 0.06 };

/** The fist's size: across the knuckles, wrist to the front of the folded fingers, and its depth (metres) */
export const FIST = { width: 0.094, length: 0.118, depth: 0.072 };

const UP = new THREE.Vector3(0, 1, 0);

/** Only the position and normal kept, not indexed, so every piece merges */
function plain(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'tint') n.deleteAttribute(k);
  return n;
}

/** A piece's every vertex in one colour (its `tint`, linear), so pieces of different colours share one draw */
export function paint(g: THREE.BufferGeometry, color: string | THREE.Color) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('tint', new THREE.BufferAttribute(a, 3));
  return g;
}

/** Pieces made into one (each painted first) */
export function merge(parts: THREE.BufferGeometry[]) {
  return mergeGeometries(parts)!;
}

/** A capsule from `a` to `b` of radius `r` */
function capsule(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 8) {
  const d = b.clone().sub(a);
  const g = new THREE.CapsuleGeometry(r, Math.max(1e-4, d.length()), 3, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return plain(g);
}

/** A rounded box `w` (x) by `h` (y) by `d` (z) centred at (x, y, z), tilted `tilt` about x */
function block(w: number, h: number, d: number, r: number, x: number, y: number, z: number, tilt = 0) {
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
  if (tilt) g.rotateX(tilt);
  g.translate(x, y, z);
  return plain(g);
}

/**
 * The fist, closed tight (or `loose`, 0..1, as he runs): the wrist at the origin, +y out to the knuckles, +z the back of the hand, the thumb on the
 * `thumb` side of x (-1 or 1). Its index finger is next to the thumb; the knuckles' line slopes back to the little
 * finger, as a real fist's does.
 */
export function fistGeometry(thumb: -1 | 1, loose = 0) {
  // (loose, as a runner carries his hands: the fingers eased open about their knuckles, the thumb resting along the
  // index finger's side instead of across the front)
  const ease = 0.34 * loose;
  const about = (knuckleY: number, off: THREE.Vector3, turn: number) => off.applyAxisAngle(new THREE.Vector3(1, 0, 0), turn).add(new THREE.Vector3(0, knuckleY, 0.013));
  const parts: THREE.BufferGeometry[] = [];
  // The wrist, into the cuff
  const wrist = new THREE.CylinderGeometry(0.026, 0.024, 0.04, 12);
  wrist.scale(1.12, 1, 0.82);
  wrist.translate(0, 0.006, -0.004);
  parts.push(plain(wrist));
  // The back of the hand, narrowing a little to the wrist
  const back = block(0.088, 0.078, 0.038, 0.014, 0, 0.05, 0.001);
  const p = back.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const k = THREE.MathUtils.clamp((p.getY(i) - 0.011) / 0.078, 0, 1);
    p.setX(i, p.getX(i) * (0.84 + 0.16 * k));
  }
  back.computeVertexNormals();
  parts.push(back);
  // The palm, under it, where the fingertips tuck in
  parts.push(block(0.08, 0.06, 0.024, 0.01, 0, 0.042, -0.024));
  // Four fingers, index (by the thumb) to little: each knuckle, and the finger folded under it in two
  const at = [0.0315, 0.0105, -0.0105, -0.0305];
  const reach = [0.089, 0.092, 0.089, 0.083];
  const wide = [0.0215, 0.0225, 0.021, 0.0185];
  for (let f = 0; f < 4; f++) {
    const x = at[f] * thumb;
    const y = reach[f];
    const w = wide[f];
    // the knuckle, standing proud of the back of the hand
    const kn = new THREE.SphereGeometry(w * 0.5, 10, 8);
    kn.scale(1, 0.8, 0.62);
    kn.translate(x, y - 0.004, 0.013);
    parts.push(plain(kn));
    // the first bone, folded straight down at the front (the face that lands a punch)
    const b1 = about(y, new THREE.Vector3(0, 0.004, -0.022), ease);
    parts.push(block(w, 0.024, 0.044, 0.009, x, b1.y, b1.z, ease));
    // the second, folded back under towards the palm
    const b2 = about(y, new THREE.Vector3(0, -0.013, -0.046), ease * 1.35);
    parts.push(block(w * 0.95, 0.032, 0.021, 0.008, x, b2.y, b2.z, ease * 1.35));
  }
  // The thumb: from the heel of the hand, round the side and across the front of the first two fingers
  const t0 = new THREE.Vector3(0.039 * thumb, 0.022, -0.014);
  const t1 = new THREE.Vector3(0.036 * thumb, 0.06, -0.04).lerp(new THREE.Vector3(0.04 * thumb, 0.063, -0.032), loose);
  const t2 = new THREE.Vector3(0.006 * thumb, 0.074, -0.05).lerp(new THREE.Vector3(0.03 * thumb, 0.084, -0.036), loose);
  parts.push(capsule(t0, t1, 0.0145));
  parts.push(capsule(t1, t2, 0.0128));
  // (the ball of the thumb, filling the heel of the hand on its side)
  const ball = new THREE.SphereGeometry(0.019, 10, 8);
  ball.scale(1, 1.3, 0.9);
  ball.translate(0.03 * thumb, 0.03, -0.022);
  parts.push(plain(ball));
  return merge(parts);
}

/**
 * A sleeve turned round +y from 0 to `len`, radius `r0` at 0 to `r1` at `len`, rounded off at both ends (so a joint
 * bends without a seam); `cap` false leaves the far end open-ended square (a cuff runs on from it)
 */
export function sleeveGeometry(r0: number, r1: number, len: number, cap = true, seg = 14) {
  const pts: THREE.Vector2[] = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(1e-4, r0 * Math.cos(a)), r0 * Math.sin(a)));
  }
  // (a little fullness through the middle: cloth over muscle, not a pipe)
  for (let i = 1; i < 6; i++) pts.push(new THREE.Vector2(sleeveRadius(r0, r1, len, (len * i) / 6), (len * i) / 6));
  if (cap)
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.max(1e-4, r1 * Math.cos(a)), len + r1 * Math.sin(a)));
    }
  else pts.push(new THREE.Vector2(r1, len));
  const g = new THREE.LatheGeometry(pts, seg);
  return plain(g);
}

/** A ribbed or plain cuff: a short tube round +y from `y0` to `y1` */
export function cuffGeometry(r0: number, r1: number, y0: number, y1: number, ribs = 0) {
  const parts: THREE.BufferGeometry[] = [];
  const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, 16, 1, false);
  g.translate(0, (y0 + y1) / 2, 0);
  parts.push(plain(g));
  // (ribbing: a few raised rings, each an edge the ink picks out)
  for (let i = 0; i < ribs; i++) {
    const y = y0 + ((i + 0.5) / ribs) * (y1 - y0);
    const r = THREE.MathUtils.lerp(r0, r1, (y - y0) / (y1 - y0));
    const ring = new THREE.TorusGeometry(r, 0.0022, 4, 16);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, y, 0);
    parts.push(plain(ring));
  }
  return merge(parts);
}

/** How far out a sleeve from `sleeveGeometry(r0, r1, len)` is at `y` along it (its fullness through the middle included) */
export function sleeveRadius(r0: number, r1: number, len: number, y: number) {
  const k = THREE.MathUtils.clamp(y / len, 0, 1);
  return THREE.MathUtils.lerp(r0, r1, k) * (1 + 0.06 * Math.sin(Math.PI * k));
}

/**
 * A stripe down a sleeve's side (the sleeve `sleeveGeometry(r0, r1, len)`): a thin strip `w` wide at angle `a` round
 * +y (0 is +x, π/2 is +z), from `y0` to `y1`, lying on the sleeve all the way along, however it tapers and fills out
 */
export function stripeGeometry(a: number, r0: number, r1: number, len: number, y0: number, y1: number, w = 0.01) {
  const g = new THREE.BoxGeometry(0.0024, y1 - y0, w, 1, 8, 1);
  g.translate(0, (y0 + y1) / 2, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  // (each row out to the sleeve's own radius there, a hair proud of it)
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + sleeveRadius(r0, r1, len, p.getY(i)) + 0.0014);
  g.computeVertexNormals();
  g.rotateY(-a);
  return plain(g);
}

/**
 * Where the elbow goes for a hand wanted at `target` from `shoulder` (a two-bone reach, lengths `upper` and
 * `fore`): the hand at the target when it's in reach, else as far as the straight arm goes towards it; the elbow
 * swung round the line from the shoulder towards `pole`. Fills `elbow` and `hand`.
 */
export function solveArm(
  shoulder: THREE.Vector3,
  target: THREE.Vector3,
  pole: THREE.Vector3,
  elbow: THREE.Vector3,
  hand: THREE.Vector3,
  upper = ARM.upper,
  fore = ARM.fore,
) {
  const dir = target.clone().sub(shoulder);
  let dist = dir.length();
  if (dist < 1e-6) dir.set(0, 0, -1);
  dir.normalize();
  // (never quite straight, so the elbow keeps its side; never folded through itself)
  dist = THREE.MathUtils.clamp(dist, Math.abs(upper - fore) + 0.02, (upper + fore) * 0.999);
  hand.copy(shoulder).addScaledVector(dir, dist);
  const a = (upper * upper + dist * dist - fore * fore) / (2 * dist);
  const h = Math.sqrt(Math.max(0, upper * upper - a * a));
  const side = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (side.lengthSq() < 1e-8) side.set(0, -1, 0).addScaledVector(dir, -dir.y);
  side.normalize();
  elbow.copy(shoulder).addScaledVector(dir, a).addScaledVector(side, h);
  return { elbow, hand };
}

/**
 * The turn of a piece reaching from `from` to `to` (+y along it), with +z as near `face` as it can be (the back of
 * the hand, or a sleeve's front): into `q`
 */
export function aimPiece(from: THREE.Vector3, to: THREE.Vector3, face: THREE.Vector3, q: THREE.Quaternion) {
  const y = to.clone().sub(from).normalize();
  const z = face.clone().addScaledVector(y, -face.dot(y));
  if (z.lengthSq() < 1e-8) z.set(0, 0, 1).addScaledVector(y, -y.z);
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/**
 * The eye's frame in the world, from his head bone at `head` and his body's facing `forward` (level), `unit` the
 * world length of one of his body's units: x to his right, y up, -z the way he faces, as a camera's. Into `out`
 */
export function eyeFrame(head: THREE.Vector3, forward: THREE.Vector3, unit: number, out: THREE.Matrix4) {
  const f = new THREE.Vector3(forward.x, 0, forward.z);
  if (f.lengthSq() < 1e-9) f.set(0, 0, 1);
  f.normalize();
  const right = new THREE.Vector3().crossVectors(f, UP);
  const at = head.clone().addScaledVector(UP, EYE.up * unit).addScaledVector(f, EYE.fwd * unit);
  return out.makeBasis(right, UP, f.clone().negate()).setPosition(at);
}

/** One of his arms as the skeleton has it, in the world: the shoulder, elbow and hand bones, and which way the back of the hand faces */
export interface BodyJoints {
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  hand: THREE.Vector3;
  back: THREE.Vector3;
}

/** An arm laid in the eye's frame, in these metres: the shoulder, the elbow, the fist's wrist and the way its back faces */
export interface LaidArm {
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  wrist: THREE.Vector3;
  face: THREE.Vector3;
}
export const newLaidArm = (): LaidArm => ({ shoulder: new THREE.Vector3(), elbow: new THREE.Vector3(), wrist: new THREE.Vector3(), face: new THREE.Vector3() });

const toEye = new THREE.Matrix4();
const rotEye = new THREE.Matrix3();
const tA = new THREE.Vector3();
const tB = new THREE.Vector3();

/**
 * The first-person correction (the owner's call: the clips are made to read from behind him, and from his own eyes
 * their guard holds the fists at his chin, under and beside the eye, out of shot): with the guard up, each fist is
 * raised `lift`, drawn `pull` of the way in towards the middle, carried forward `reach` the more the arm is bent
 * (none at full stretch, where the clip already reaches) and never nearer the eye than `near` (the clips bring a
 * hand back beside his face: from the eye it would fill the screen), the elbow solved again round towards his own.
 * These metres, the eye's frame.
 */
export const FP_FIX = { lift: 0.1, pull: 0.45, reach: 0.12, near: 0.3 };
/**
 * Running with his hands down (the owner's calls, 2026-11: "a classic FPS pump", "his steps, a designed arc", loose
 * fists; then "his hands should just move up and down, but his whole arm locks out when sprinting"): his body sets
 * the timing (each arm's own swing, `pumpSwing()`), the arm a designed bob (`pumpArm()`): the fist rising from `low`
 * (its top just peeking over the bottom of the shot) to `high` in its lower corner and back, mostly up and down, the
 * elbow always bent (`pole`: down, back and out), higher and a touch bigger sprinting (`sprint`), lower and smaller
 * walking (`walk`: `walkLow`, `walkHigh`), the back of the loose fist facing out, thumb up (`face`), all from a
 * shoulder of its own (`shoulder`: his real one moves about the eye as he leans). For the arm on the right, the
 * eye's frame; the left mirrors it.
 */
export const PUMP = {
  shoulder: new THREE.Vector3(0.2, -0.21, 0.06),
  low: new THREE.Vector3(0.2, -0.33, -0.28),
  high: new THREE.Vector3(0.165, -0.19, -0.35),
  sprint: new THREE.Vector3(0.155, -0.15, -0.37),
  walkLow: new THREE.Vector3(0.215, -0.39, -0.27),
  walkHigh: new THREE.Vector3(0.2, -0.265, -0.31),
  /** (a touch forward through the middle of the bob, as a fist swings on a bent arm) */
  bulge: 0.02,
  pole: new THREE.Vector3(0.4, -0.7, 0.6),
  face: new THREE.Vector3(1, 0.3, 0.1),
};

/** How far out an arm laid in the eye's frame is (0 folded, 1 at full stretch) */
export const stretch = (l: LaidArm) => THREE.MathUtils.clamp(l.wrist.distanceTo(l.shoulder) / (ARM.upper + ARM.fore), 0, 1);

/**
 * His arm `j` (the world) read from the eye `eye` (`eyeFrame()`), `unit` the world length of one of his body's units,
 * into `out` in these metres: the fist's wrist set back along his forearm so its knuckles are where his are. `fix`
 * (0..1: the guard's share) lays the first-person correction (`FP_FIX`) on it without moving his body. `pull` (0..1)
 * scales the draw in towards the middle (less for the hand left in the guard while the other is out punching: the
 * punch has the middle).
 */
export function bodyArm(j: BodyJoints, eye: THREE.Matrix4, unit: number, out: LaidArm, fix = 0, pull = 1) {
  const k = BODY_TO_ARM / unit;
  toEye.copy(eye).invert();
  rotEye.setFromMatrix4(toEye);
  const put = (w: THREE.Vector3, o: THREE.Vector3) => o.copy(w).applyMatrix4(toEye).multiplyScalar(k);
  put(j.shoulder, out.shoulder);
  put(j.elbow, out.elbow);
  put(j.hand, tA);
  // (the fist's wrist: back from his hand bone along the forearm, by the fist's knuckles less his)
  const along = tB.copy(tA).sub(out.elbow).normalize();
  out.wrist.copy(out.elbow).addScaledVector(along, ARM.fore);
  out.face.copy(j.back).applyMatrix3(rotEye).normalize();
  if (fix > 0) {
    const bent = 1 - THREE.MathUtils.clamp(out.wrist.distanceTo(out.shoulder) / (ARM.upper + ARM.fore), 0, 1);
    const target = tA.set(-out.wrist.x * FP_FIX.pull * pull, FP_FIX.lift, -FP_FIX.reach * bent).multiplyScalar(fix).add(out.wrist);
    target.z = Math.min(target.z, THREE.MathUtils.lerp(target.z, -FP_FIX.near, fix));
    // (round towards his own elbow: its side of the line from the shoulder to the wrist)
    const pole = tB.copy(out.elbow).sub(out.shoulder).addScaledVector(out.wrist.clone().sub(out.shoulder), -0.5);
    solveArm(out.shoulder, target, pole, out.elbow, out.wrist);
  }
  return out;
}

/**
 * One arm's swing from his body (-1 back, 1 forward), the timing of the pump: how far ahead of the other arm its wrist
 * is (`ahead`: this arm's wrist forward of the other's, in these metres; the two swing opposite, so this stays centred
 * whatever his lean), against `amp`, the size of his swing as it's been lately (the caller keeps it)
 */
export function pumpSwing(ahead: number, amp: number) {
  return THREE.MathUtils.clamp(ahead / Math.max(amp * 1.4, 0.02), -1, 1);
}

const pDir = new THREE.Vector3();
const pFwd = new THREE.Vector3();
const pBack = new THREE.Vector3();

/**
 * The pump's arm on side `side` (1 the right of the eye, -1 the left), swung `swing` (-1 down .. 1 up, `pumpSwing()`),
 * `sprint` (0 a jog .. 1 a sprint) of the way to the sprint's height and `walk` (0 a jog .. 1 a walk) of the way down
 * to the walk's: into `out` (its own shoulder, the elbow bent, the wrist on its bob, the back of the fist out)
 */
export function pumpArm(side: number, swing: number, sprint: number, out: LaidArm, walk = 0) {
  side = Math.sign(side) || 1;
  const mirror = (v: THREE.Vector3, o: THREE.Vector3) => o.set(v.x * side, v.y, v.z);
  const low = mirror(PUMP.low, pBack).lerp(mirror(PUMP.walkLow, pDir), walk);
  const high = mirror(PUMP.high, pFwd).lerp(mirror(PUMP.sprint, pDir), sprint).lerp(mirror(PUMP.walkHigh, pDir), walk);
  // (eased at the ends, as an arm slows to turn at the top and the bottom of its swing)
  const t = THREE.MathUtils.smoothstep((swing + 1) / 2, 0, 1);
  const target = tA.copy(low).lerp(high, t);
  target.z -= PUMP.bulge * Math.sin(Math.PI * t);
  const shoulder = mirror(PUMP.shoulder, out.shoulder);
  solveArm(shoulder, target, mirror(PUMP.pole, tB), out.elbow, out.wrist);
  mirror(PUMP.face, out.face).normalize();
  return out;
}

/**
 * `a` eased `w` (0..1) of the way to `b`: the shoulder, the wrist and the way the fist faces between them, the elbow
 * solved again round between theirs (so the arm keeps its lengths), into `a`
 */
export function blendArm(a: LaidArm, b: LaidArm, w: number) {
  if (w <= 0) return a;
  const target = tA.copy(a.wrist).lerp(b.wrist, w);
  const mid = (l: LaidArm, o: THREE.Vector3) => o.copy(l.elbow).sub(l.shoulder).addScaledVector(tmpS.copy(l.wrist).sub(l.shoulder), -0.5);
  const pole = mid(a, tB).lerp(mid(b, pDir), w);
  a.face.lerp(b.face, w).normalize();
  a.shoulder.lerp(b.shoulder, w);
  solveArm(a.shoulder, target, pole, a.elbow, a.wrist);
  return a;
}
const tmpS = new THREE.Vector3();
