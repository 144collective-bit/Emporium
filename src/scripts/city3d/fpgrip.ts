/*
 * The first-person hands' grip on each gun (the owner's call: "add the per-gun grips too"): DOM-free, tested in
 * tests/fpgrip.test.ts, baked when the site is built (baked.ts key `fpgrips`), read by viewmodel.ts.
 *
 * - `FP_HANDS`: where each hand sits on the gun (the gun's own frame: the pistol grip at the origin, the barrel
 *   along +z): his right on the pistol grip, his left at the gun's `fore` (gunfit.ts), each hand's wrist up its
 *   forearm and its knuckles along the grip or the handguard; `placeOf()` turns a hand's own space into the gun's.
 * - `solveGrip()`: each hand on that gun's real shape (gunshapes.ts at the first-person level, as voxels inside or
 *   out, `insideOf()`): out along its palm until the palm lies on the gun and a little further where its fingers
 *   wrap it better; then each digit's knuckle and middle joint the pair that touches the most of the gun with the
 *   least of it inside (`fit()`), so it wraps what it holds. His right index's pad rests just off the trigger and
 *   goes onto it while he fires (`TRIGGER`, `reach()`). On the Hand Cannon his left holds round his right (it keeps
 *   clear of it too).
 * - `gripsOf()`: the grips, from the page (built), or worked out for the one gun asked for (the tests, the dev
 *   server).
 */
import * as THREE from 'three';
import type { WeaponId } from './combat-sim';
import { gunParts, gunShape } from './gunshapes';
import { BUILT, baked } from './baked';
import { digitMoves, gripCurl, posePart, smoothHand, type Curl, type HandPart } from './handmesh';
import { HAND } from './skeleton';

/** The hands drawn a touch bigger than life (they're held up close) */
export const FP_HAND = 1.15;
export interface HandPlace {
  side: -1 | 1;
  /** Up the forearm from the wrist, into the sleeve */
  dir: THREE.Vector3;
  /** The wrist's bone (the left hand's from the gun's `fore`) */
  at: THREE.Vector3;
  /** The knuckles' line */
  along: THREE.Vector3;
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const FP_HANDS: { right: HandPlace; left: HandPlace } = {
  // His right closed round the pistol grip (raked back)
  right: { side: -1, dir: V(-0.36, -0.72, -0.58), at: V(-0.016, -0.045, -0.024), along: V(0, Math.cos(0.3), Math.sin(0.3)) },
  // His left under the front, fingers up its side
  left: { side: 1, dir: V(0.6, -0.68, -0.42), at: V(0.014, -0.036, 0), along: V(0, 0, 1) },
};

/** The pistol grip's rake (the right hand's knuckles lie along it) */
const RAKE = 0.3;
/**
 * His right hand's hold on the pistol grip, mirrored for his left round another grip: its axis through `origin`,
 * raked `rake`, the arm standing at the gun's `fore`
 */
function mirrored(id: WeaponId, origin: THREE.Vector3, rake: number): HandPlace {
  const r = FP_HANDS.right;
  const flip = flipper(rake);
  return { side: 1, dir: flip(r.dir.clone()), at: flip(r.at.clone()).add(origin).sub(gunShape(id).fore), along: flip(r.along.clone()) };
}
/** The right hand's pistol grip turned to another rake and mirrored */
function flipper(rake: number) {
  const turn = new THREE.Matrix4().makeRotationX(rake - RAKE);
  return (v: THREE.Vector3) => v.applyMatrix4(turn).multiply(V(-1, 1, 1));
}
/** The grips the left hand holds as the right does, mirrored, and their rakes */
const MIRRORED: Partial<Record<WeaponId, number>> = { smg: 0, revolver: RAKE };
/**
 * Where a gun puts a hand otherwise: the SMG's left round its vertical foregrip, the Hand Cannon's round his right
 * on its grip (both hands on it, the left's fingers over the right's)
 */
export const HAND_ON: Partial<Record<WeaponId, Partial<Record<'right' | 'left', HandPlace>>>> = {
  smg: { left: mirrored('smg', V(0, 0, 0.2), 0) },
  revolver: { left: mirrored('revolver', V(0, 0, 0), RAKE) },
};
/** Grips the left hand holds round the right (it keeps clear of the right hand as well as the gun) */
const OVER_RIGHT: WeaponId[] = ['revolver'];
/** Where a hand sits on a gun */
export const placeFor = (id: WeaponId, hand: 'right' | 'left') => HAND_ON[id]?.[hand] ?? FP_HANDS[hand];

/** A hand's own space into its arm's (round the wrist at `at`) */
export function handMatrix(h: HandPlace) {
  const z = h.along.clone().normalize();
  const y = h.dir.clone().addScaledVector(z, -h.dir.dot(z)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z).scale(new THREE.Vector3(FP_HAND, FP_HAND, FP_HAND)).setPosition(h.at);
}
/** A hand's own space into the gun's: the left's arm stands at the gun's `fore` */
export function placeOf(id: WeaponId, hand: 'right' | 'left') {
  const m = handMatrix(placeFor(id, hand));
  if (hand === 'left') m.premultiply(new THREE.Matrix4().makeTranslation(gunShape(id).fore));
  return m;
}

/**
 * A gun's grips: each hand's curl, his right index on the trigger (its knuckle and middle joint), and how far each
 * hand stands off where `FP_HANDS` puts it (in the gun's frame: out along its palm until the palm lies on the gun)
 */
export interface Grip {
  right: Curl;
  left: Curl;
  trigger: [number, number];
  rightOff: [number, number, number];
  leftOff: [number, number, number];
}
/**
 * The solve: the voxels' size and reach round a hand; the amounts a digit's tried at (of the skeleton's grip), as far
 * open and closed as it goes, its middle joint's most on past that; how far out the palm may go, a step, and the gap it's left at; a point inside the gun against a point
 * touching it, the lean towards a hand at rest (`rest`, of the grip) a point and an amount
 */
export const GRIP = { voxel: 0.0015, reach: 0.09, step: 0.05, most: 1.15, open: -0.2, wrap: 1.2, push: 0.05, pushStep: 0.001, gap: 0.0012, into: 4, lean: 0.02, rest: 0.55, bend: 1.9, thumbOpen: -0.6, further: 0.03, furtherStep: 0.003, away: 1, slide: 0.05, slideStep: 0.004 };

/* ---------- The gun as voxels round a hand (inside or out: each part's own, by ray parity) ---------- */

/** Inside the gun (2), touching it (1: outside, a voxel off it) or clear (0) */
type Inside = (p: THREE.Vector3) => 0 | 1 | 2;
/** The gun's inside, in voxels round `c` */
export function insideOf(id: WeaponId, c: THREE.Vector3, extra: THREE.BufferGeometry[] = []): Inside {
  const H = GRIP.voxel;
  const R = GRIP.reach;
  const n = Math.ceil((2 * R) / H);
  const o = c.clone().subScalar(R);
  const cells = new Uint8Array(n * n * n);
  const { body, mag } = gunParts(id, 2);
  const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(1, 0, 0));
  const hit = new THREE.Vector3();
  for (const geo of [...body, ...mag].map(([g]) => g).concat(extra)) {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const idx = geo.index;
    const cnt = idx ? idx.count : pos.count;
    const tris: THREE.Vector3[][] = [];
    for (let i = 0; i < cnt; i += 3) tris.push([0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k)));
    // (each row along x: the triangles over it, then its crossings in order, inside between each pair)
    const rows = new Map<number, number[]>();
    tris.forEach((t, ti) => {
      const y0 = Math.max(0, Math.floor((Math.min(t[0].y, t[1].y, t[2].y) - o.y) / H));
      const y1 = Math.min(n - 1, Math.ceil((Math.max(t[0].y, t[1].y, t[2].y) - o.y) / H));
      const z0 = Math.max(0, Math.floor((Math.min(t[0].z, t[1].z, t[2].z) - o.z) / H));
      const z1 = Math.min(n - 1, Math.ceil((Math.max(t[0].z, t[1].z, t[2].z) - o.z) / H));
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) {
          const k = y * n + z;
          const list = rows.get(k);
          if (list) list.push(ti);
          else rows.set(k, [ti]);
        }
    });
    for (const [k, list] of rows) {
      const y = Math.floor(k / n);
      const z = k % n;
      // (a hair off the voxels' middles, so a ray never runs along an edge)
      ray.origin.set(o.x - 1, o.y + (y + 0.5) * H + 1.3e-7, o.z + (z + 0.5) * H + 1.7e-7);
      const xs: number[] = [];
      for (const ti of list) if (ray.intersectTriangle(tris[ti][0], tris[ti][1], tris[ti][2], false, hit)) xs.push(hit.x);
      xs.sort((a, b) => a - b);
      for (let q = 0; q + 1 < xs.length; q += 2) {
        const x0 = Math.max(0, Math.ceil((xs[q] - o.x) / H - 0.5));
        const x1 = Math.min(n - 1, Math.floor((xs[q + 1] - o.x) / H - 0.5));
        for (let x = x0; x <= x1; x++) cells[(x * n + y) * n + z] = 1;
      }
    }
  }
  const at = (x: number, y: number, z: number) => x >= 0 && y >= 0 && z >= 0 && x < n && y < n && z < n && cells[(x * n + y) * n + z] === 1;
  return (p) => {
    const x = Math.floor((p.x - o.x) / H);
    const y = Math.floor((p.y - o.y) / H);
    const z = Math.floor((p.z - o.z) / H);
    if (at(x, y, z)) return 2;
    return at(x - 1, y, z) || at(x + 1, y, z) || at(x, y - 1, z) || at(x, y + 1, z) || at(x, y, z - 1) || at(x, y, z + 1) ? 1 : 0;
  };
}

/* ---------- Closing the digits ---------- */

/** A part's points, once each (a digit's: only what its joints move, outside the palm) */
function points(part: HandPart, digit: boolean) {
  const P = part.geo.attributes.position as THREE.BufferAttribute;
  const seen = new Set<string>();
  const out: number[] = [];
  for (let i = 0; i < P.count; i++) {
    if (digit) {
      let moved = 0;
      for (const [b, w] of part.skin[i]) if (/^(idx|fin|thb)[12]/.test(b)) moved += w;
      if (moved < 0.5) continue;
    } else if (P.getY(i) > 0.03) continue; // (the wrist up in the sleeve isn't the palm)
    const k = `${P.getX(i).toFixed(5)},${P.getY(i).toFixed(5)},${P.getZ(i).toFixed(5)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(i);
  }
  return out;
}

/** How many of a geometry's points are inside the gun and how many touch it, the hand placed by `place` */
function count(geo: THREE.BufferGeometry, pts: number[], place: THREE.Matrix4, inside: Inside) {
  const P = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  let into = 0;
  let touch = 0;
  for (const i of pts) {
    const k = inside(v.fromBufferAttribute(P, i).applyMatrix4(place));
    if (k === 2) into++;
    else if (k === 1) touch++;
  }
  return { into, touch };
}

/**
 * Digit `d` (0-3 the fingers, 4 the thumb) on the gun: of its knuckle's amounts `us` and its middle joint's on past
 * them `ws` (`angles(u, w)`), the one touching the most of the gun with the least of it inside (`GRIP.into` a point
 * in) and closest to `rest` where it touches nothing (or where everything's equal)
 */
function fit(part: HandPart, side: -1 | 1, d: number, place: THREE.Matrix4, inside: Inside, angles: (u: number, w: number) => [number, number], us: number[], ws: number[], rest: number) {
  const pts = points(part, true);
  const geo = part.geo.clone();
  const curl = gripCurl(0);
  let best = { score: -Infinity, u: rest, w: 0 };
  for (const u of us)
    for (const w of ws) {
      const a = angles(u, w);
      if (d < 4) curl.fingers[d] = a;
      else curl.thumb = a;
      posePart(part, digitMoves(side, curl)[d], geo);
      const { into, touch } = count(geo, pts, place, inside);
      const score = touch - GRIP.into * into - GRIP.lean * pts.length * (Math.abs(u - rest) + 0.3 * w);
      if (score > best.score) best = { score, u, w };
    }
  return best;
}
/**
 * Where his index's pad goes on every gun (they share gunshapes.ts's `trigger()`): on the blade's face, and at rest
 * just in front of it
 */
export const TRIGGER = { at: V(0, -0.014, 0.053), rest: V(0, -0.012, 0.062), open: -0.6 };
/** A gun's own spots on its trigger: the SMG's magazine stands just in front of its guard, so lower and further back */
const TRIGGER_ON: Partial<Record<WeaponId, { at: THREE.Vector3; rest: THREE.Vector3 }>> = {
  smg: { at: V(0, -0.02, 0.048), rest: V(0, -0.019, 0.053) },
};
/** Where his index's pad goes on a gun's trigger (`at`) and rests (`rest`) */
export const triggerOf = (id: WeaponId) => TRIGGER_ON[id] ?? TRIGGER;
/** The middle of the index's last joint's pad, in the hand's own space at rest (side -1: the palm +x) */
export function indexPad(side: -1 | 1) {
  const f = HAND.fingers[0];
  const at = f.len * HAND.mid;
  const along = at + (f.len - at) * 0.55;
  return V(0, -along, 0)
    .applyAxisAngle(V(1, 0, 0), -0.07)
    .add(V(-side * f.r * 0.8, HAND.knuckleY, f.z));
}
/** His index curled (knuckle, middle joint) to put its pad nearest `target` on the gun, never through it */
function reach(part: HandPart, side: -1 | 1, place: THREE.Matrix4, inside: Inside, target: THREE.Vector3, coarse: boolean): [number, number] {
  return reachScore(part, side, place, inside, target, coarse).at;
}
/** The same, with how far it misses (metres, a point through the gun counting `TRIGGER_INTO`) */
function reachScore(part: HandPart, side: -1 | 1, place: THREE.Matrix4, inside: Inside, target: THREE.Vector3, coarse: boolean) {
  const pts = points(part, true);
  const geo = part.geo.clone();
  const curl = gripCurl(0);
  const pad = indexPad(side);
  const v = new THREE.Vector3();
  let best: [number, number] = [0.5, 0.5];
  let bestScore = Infinity;
  const step = coarse ? 0.1 : 0.04;
  for (let a1 = TRIGGER.open; a1 <= 1.6 + 1e-9; a1 += step)
    for (let a2 = 0; a2 <= GRIP.bend + 1e-9; a2 += step) {
      curl.fingers[0] = [a1, a2];
      const moves = digitMoves(side, curl)[0];
      const miss = v.copy(pad).applyMatrix4(moves[1]).applyMatrix4(place).distanceTo(target);
      if (miss > bestScore) continue;
      posePart(part, moves, geo);
      const score = miss + TRIGGER_INTO * count(geo, pts, place, inside).into;
      if (score < bestScore) [bestScore, best] = [score, [a1, a2]];
    }
  return { at: best, score: bestScore };
}
/** How near his index's pad can come to `target` from the hand placed by `place` (any curl, through the gun or not) */
function padMiss(side: -1 | 1, place: THREE.Matrix4, target: THREE.Vector3) {
  const curl = gripCurl(0);
  const pad = indexPad(side);
  const v = new THREE.Vector3();
  let best = Infinity;
  for (let a1 = TRIGGER.open; a1 <= 1.6 + 1e-9; a1 += 0.05)
    for (let a2 = 0; a2 <= GRIP.bend + 1e-9; a2 += 0.05) {
      curl.fingers[0] = [a1, a2];
      best = Math.min(best, v.copy(pad).applyMatrix4(digitMoves(side, curl)[0][1]).applyMatrix4(place).distanceTo(target));
    }
  return best;
}
/** A point of the index inside the gun, against a metre off the trigger */
const TRIGGER_INTO = 0.0015;

const range = (a: number, b: number, step: number) => Array.from({ length: Math.round((b - a) / step) + 1 }, (_, i) => a + i * step);

/** One hand on a gun: out along its palm until the palm lies on it, then each finger closed and wrapped, the thumb */
function handGrip(id: WeaponId, hand: 'right' | 'left', extra: THREE.BufferGeometry[] = [], start = new THREE.Vector3()) {
  const side = placeFor(id, hand).side;
  const place0 = placeOf(id, hand).premultiply(new THREE.Matrix4().makeTranslation(start.x, start.y, start.z));
  const inside = insideOf(id, new THREE.Vector3().setFromMatrixPosition(place0), extra);
  const parts = smoothHand(side, 3);
  // The palm out off the gun (its side: -side x in the hand's own space)
  const out = new THREE.Vector3(side, 0, 0).transformDirection(place0);
  const palmPts = points(parts[0], false);
  // (his right hand slides along its grip, `up`, until his index reaches the trigger)
  const up = new THREE.Vector3(0, 0, 1).transformDirection(place0);
  let slide = 0;
  let t = 0;
  const place = place0.clone();
  const moved = (k: number) => place.copy(place0).premultiply(new THREE.Matrix4().makeTranslation(out.x * k + up.x * slide, out.y * k + up.y * slide, out.z * k + up.z * slide));
  const clear = () => {
    let k = 0;
    while (k < GRIP.push && count(parts[0].geo, palmPts, moved(k), inside).into > 0) k += GRIP.pushStep;
    return Math.min(GRIP.push, k + (k > 0 ? GRIP.gap : 0));
  };
  if (hand === 'right') {
    let best = Infinity;
    let bestK = 0;
    for (let k = -GRIP.slide; k <= GRIP.slide + 1e-9; k += GRIP.slideStep) {
      slide = k;
      const tk = clear();
      moved(tk);
      // (the index's reach to the trigger, through the gun or not: a quick look, then its curl through what's there)
      const quick = padMiss(side, place, triggerOf(id).at);
      const m = (quick > 0.02 ? quick : reachScore(parts[1], side, place, inside, triggerOf(id).at, true).score) + Math.abs(k) * 0.05;
      if (m < best) [best, bestK, t] = [m, k, tk];
    }
    slide = bestK;
  } else t = clear();
  // Then out a little further where the fingers wrap it better (the gun in the curl of them, not across them): the
  // stand-off whose digits, fitted coarsely, score best, a little against each step out
  const digits = (coarse: boolean) => {
    const us = range(GRIP.open, GRIP.most, coarse ? GRIP.step * 2 : GRIP.step);
    // (the thumb may open further: up the side of a revolver's frame)
    const thumbUs = range(GRIP.thumbOpen, GRIP.most, coarse ? GRIP.step * 2 : GRIP.step);
    const ws = range(0, GRIP.wrap, GRIP.step * (coarse ? 4 : 2));
    const base = gripCurl(0);
    const curl: Curl = { fingers: base.fingers.map((f) => [...f] as [number, number]), thumb: [...base.thumb] as [number, number] };
    let trigger: [number, number] = [0, 0];
    let total = 0;
    for (let d = 0; d < 5; d++) {
      const part = parts[d + 1];
      const [a0, b0] = d < 4 ? base.fingers[d] : base.thumb;
      const k1 = d < 4 ? 1.45 : 1;
      const k2 = d < 4 ? 1.6 : 0.9;
      if (hand === 'right' && d === 0) {
        // His trigger finger: its pad just off the trigger's face, and on it while he fires
        curl.fingers[0] = reach(part, side, place, inside, triggerOf(id).rest, coarse);
        if (!coarse) trigger = reach(part, side, place, inside, triggerOf(id).at, false);
        continue;
      }
      const angles = (u: number, w: number): [number, number] => [a0 + k1 * u, Math.min(GRIP.bend, b0 + k2 * u + w)];
      const f = fit(part, side, d, place, inside, angles, d < 4 ? us : thumbUs, ws, GRIP.rest);
      total += f.score;
      const pair = angles(f.u, f.w);
      if (d < 4) curl.fingers[d] = pair;
      else curl.thumb = pair;
    }
    return { curl, trigger, total };
  };
  let bestT = t;
  let bestScore = -Infinity;
  for (let k = t; k <= Math.min(GRIP.push, t + (hand === 'right' ? 0 : GRIP.further)) + 1e-9; k += GRIP.furtherStep) {
    moved(k);
    const score = digits(true).total - GRIP.away * (k - t) * 1000;
    if (score > bestScore) [bestScore, bestT] = [score, k];
  }
  t = bestT;
  moved(t);
  const { curl, trigger } = digits(false);
  return { curl, trigger, off: out.multiplyScalar(t).addScaledVector(up, slide).add(start) };
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;
const round = (c: Curl): Curl => ({ fingers: c.fingers.map(([a, b]) => [r3(a), r3(b)]), thumb: [r3(c.thumb[0]), r3(c.thumb[1])] });

/** A gun's grip worked out from its shape */
export function solveGrip(id: WeaponId): Grip {
  const r = handGrip(id, 'right');
  // (round his right hand: each of its parts as it holds the grip, in the gun's frame)
  let extra: THREE.BufferGeometry[] = [];
  if (OVER_RIGHT.includes(id)) {
    const place = placeOf(id, 'right').premultiply(new THREE.Matrix4().makeTranslation(r.off.x, r.off.y, r.off.z));
    const moves = digitMoves(-1, r.curl);
    extra = smoothHand(-1, 3).map((p, j) => posePart(p, j ? moves[j - 1] : null).applyMatrix4(place));
  }
  // (a left hand holding as the right does sets off where the right ended up, mirrored)
  const rake = MIRRORED[id];
  const l = handGrip(id, 'left', extra, rake === undefined ? undefined : flipper(rake)(r.off.clone()));
  const v3 = (v: THREE.Vector3): [number, number, number] => [r3(v.x * 10) / 10, r3(v.y * 10) / 10, r3(v.z * 10) / 10];
  return { right: round(r.curl), left: round(l.curl), trigger: [r3(r.trigger[0]), r3(r.trigger[1])], rightOff: v3(r.off), leftOff: v3(l.off) };
}

export const GUN_IDS: WeaponId[] = ['rifle', 'smg', 'shotgun', 'dmr', 'revolver', 'burst', 'lmg'];
const solveAll = () => Object.fromEntries(GUN_IDS.map((id) => [id, solveGrip(id)])) as Record<WeaponId, Grip>;

/** Baking the site (scripts/bake.mjs) or built: every gun's at once */
const BAKING = !!(globalThis as { __cityBake?: unknown }).__cityBake;
let all: Record<WeaponId, Grip> | null = BUILT || BAKING ? baked('fpgrips', BUILT ? undefined : solveAll) : null;
const one = new Map<WeaponId, Grip>();
/** A gun's grip: from the page, or worked out the first time it's asked for */
export function gripsOf(id: WeaponId): Grip {
  // (the site's own build has them all from the page: the solve folds out of the browser's code)
  if (BUILT) return all![id];
  if (all) return all[id];
  let g = one.get(id);
  if (!g) one.set(id, (g = solveGrip(id)));
  return g;
}
/** Every gun's (the tests: what the build bakes) */
export const allGrips = () => (BUILT ? all! : (all ??= solveAll()));
