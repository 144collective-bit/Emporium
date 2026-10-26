/*
 * Contact (the revamp's Phase 3, docs/animation-revamp-plan.md; DOM-free,
 * tested in tests/contact.test.ts): what a figure's body does about the
 * things it touches, as a layer on the animator's pose, applied after its
 * update and before the figure takes it (applyTo), as the peek and carry
 * layers are.
 *
 * - **Brushing** a wall or a person at his side while moving: that
 *   shoulder gives (the collarbone pulled back, the chest turned a touch)
 *   and the step hitches (`hitch`: the caller slows him a share for a
 *   moment).
 * - **A hand on a wall:** stopped close to a wall he faces, a hand goes
 *   onto it at shoulder height; walking slowly with a wall at his side,
 *   that hand trails along it at hip height.
 * - **A lean on a rail:** standing a while at an edge he can't step over
 *   with nothing solid there (a railing, a parapet, the quay), facing it:
 *   both hands on the rail, the chest over them.
 * - **A stagger:** running into a wall at a sprint, the body is thrown
 *   back (the chest pitched back, the near hand up to the wall, the head
 *   back) over `stagger.t` while the caller carries him two steps back;
 *   never a stop dead.
 * - **A squeeze:** through a gap narrower than his shoulders need, the
 *   shoulders turn and the arms come in.
 *
 * Everything is a function of what's near (`ContactInput`: the solid boxes
 * round him, the people, where he can't step) and eased, so nothing snaps.
 * The hands reach through a two-bone arm IK on the animator's bones; the
 * rubric's Contact row holds a hand within 1.5 cm of the wall it's on.
 */
import * as THREE from 'three';
import { MB, PARENT, type Posed, REST, newPosed, posed } from './mocap';
import type { Box } from './solids';

/** The numbers (tiles, seconds, radians; distances scale with the figure) */
export const CONTACT = {
  /** A wall counts within this of his centre (his own radius is inside it) */
  reach: 0.62,
  /** Brushing: a wall or a person within this at his side while he moves; the shoulder's give (radians), the chest's share, the step's hitch (a share of his speed) and how long it lasts */
  brush: 0.42,
  person: 0.5,
  close: 0.3,
  give: 0.45,
  giveChest: 0.25,
  hitch: 0.3,
  hitchT: 0.3,
  /** A hand on a wall: stopped (under `still`) within `handStop` of one he faces (within `handCone` of straight ahead), or walking under `slow` with one within `handAlong` at his side */
  still: 0.3,
  slow: 1.0,
  handStop: 0.42,
  handCone: 0.6,
  handAlong: 0.42,
  /** The hand's height on a wall (rig numbers over the ground): stopped at it, and trailing along it; the palm's stand-off from the wall */
  handHigh: 0.9,
  handLow: 0.7,
  palm: 0.03,
  /** How far out from his middle a hand lands on a wall ahead (about the shoulder's) */
  shoulder: 0.14,
  /** A rail's top (rig numbers), the dwell before he leans, the lean (radians) and the hands' spread (rig) */
  railH: 0.72,
  railDwell: 1.2,
  lean: 0.22,
  railSpread: 0.16,
  /** A stagger: into a wall faster than this (tiles a second) he's thrown back `back` tiles over `t` seconds; the chest's pitch back and the hand up (radians, rig) */
  stagger: { speed: 2.2, back: 1.1, t: 0.75, pitch: 0.4, hand: 1.15 },
  /** A squeeze: a gap narrower than this (tiles, scaled, between the walls either side) turns the shoulders up to `squeezeTurn`, the arms in by `squeezeArms` */
  squeeze: 0.95,
  squeezeTurn: 0.65,
  squeezeArms: 0.35,
  /** Everything eases in and out with this half-life (the stagger has its own curve) */
  ease: 0.09,
  easeOut: 0.14,
  /** A hand goes onto a wall at this half-life (a reach, not a snap) */
  handEase: 0.18,
};

export interface ContactInput {
  dt: number;
  /** Where he stands (world) and the ground's height there; the way he's shown facing (world yaw); his scale */
  x: number;
  y: number;
  z: number;
  face: number;
  scale: number;
  /** His speed over the ground (tiles a second) and whether the stick asks for any */
  speed: number;
  moving: boolean;
  /** What's solid near him (the collision grid's boxes within `reach`) and the people near him */
  walls: Box[];
  people: { x: number; z: number }[];
  /** Where he can't step (the caller's own check, for the rails: an edge no box explains); optional */
  blocked?: (x: number, z: number) => boolean;
  /** This frame his move was stopped by something, and how fast he was going into it */
  hit?: boolean;
  hitSpeed?: number;
}

/** The nearest point on a box's outline to (x, z), outside it: the point, its distance and the outward normal there */
export function nearestOn(b: Box, x: number, z: number): { px: number; pz: number; d: number; nx: number; nz: number } {
  const cx = Math.max(b[0], Math.min(b[2], x));
  const cz = Math.max(b[1], Math.min(b[3], z));
  const dx = x - cx;
  const dz = z - cz;
  const d = Math.hypot(dx, dz);
  if (d > 1e-6) return { px: cx, pz: cz, d, nx: dx / d, nz: dz / d };
  // (inside: out through the nearest side)
  const sides: [number, number, number][] = [
    [x - b[0], -1, 0],
    [b[2] - x, 1, 0],
    [z - b[1], 0, -1],
    [b[3] - z, 0, 1],
  ];
  let best = sides[0];
  for (const s of sides) if (s[0] < best[0]) best = s;
  return { px: best[1] ? (best[1] < 0 ? b[0] : b[2]) : x, pz: best[2] ? (best[2] < 0 ? b[1] : b[3]) : z, d: -best[0], nx: best[1], nz: best[2] };
}

export interface Hand {
  /** 0 the left, 1 the right */
  side: 0 | 1;
  /** Where the palm goes (world) and the wall's outward normal there */
  x: number;
  y: number;
  z: number;
  nx: number;
  nz: number;
  w: number;
}

export interface ContactState {
  /** The shoulder's give: which side (-1 his left, 1 his right) and how much */
  give: { side: -1 | 1; w: number };
  /** The step's hitch (0 to 1: the caller slows him by `CONTACT.hitch` of it) */
  hitch: number;
  /** A hand on a wall (the free one stays the pose's) */
  hand: Hand | null;
  /** A lean on a rail: both hands on it and the chest over them */
  lean: { w: number; hands: [Hand, Hand] } | null;
  /** A stagger under way: how far through (0 to 1) */
  stagger: { t: number; hand: Hand } | null;
  /** A squeeze: the shoulders' turn (signed) and how much */
  squeeze: { turn: number; w: number };
}

const ease = (now: number, want: number, dt: number, h: number) => now + (want - now) * (1 - Math.exp((-Math.LN2 * dt) / h));

/** `hands`: false leaves out the hands and the lean (phones: the layer steps down first; the give, hitch, squeeze and stagger stay) */
export function createContact(opts: { hands?: boolean } = {}) {
  const hands = opts.hands !== false;
  const st: ContactState = { give: { side: 1, w: 0 }, hitch: 0, hand: null, lean: null, stagger: null, squeeze: { turn: 0, w: 0 } };
  let handW = 0;
  let handWant: Hand | null = null;
  let handRel: THREE.Vector3 | null = null;
  let leanW = 0;
  let stillFor = 0;
  let wasBrushing = false;
  let squeezeW = 0;
  let squeezeTurn = 0;
  let giveWant = 0;
  let giveSide: -1 | 1 = 1;

  /** The walls as (point, distance, normal) in his frame: `fwd` along his facing, `side` to his right */
  function around(inp: ContactInput) {
    const sx = Math.cos(inp.face);
    const sz = -Math.sin(inp.face);
    const fx = Math.sin(inp.face);
    const fz = Math.cos(inp.face);
    const out: { b: Box; px: number; pz: number; d: number; nx: number; nz: number; fwd: number; side: number }[] = [];
    for (const b of inp.walls) {
      if (b[4] < 0.5 * inp.scale) continue;
      const n = nearestOn(b, inp.x, inp.z);
      if (n.d > CONTACT.reach * inp.scale) continue;
      const dx = n.px - inp.x;
      const dz = n.pz - inp.z;
      out.push({ b, ...n, fwd: dx * fx + dz * fz, side: dx * sx + dz * sz });
    }
    return out;
  }

  function update(inp: ContactInput): ContactState {
    const dt = Math.min(inp.dt, 0.1);
    const s = inp.scale;
    const near = around(inp);
    const fx = Math.sin(inp.face);
    const fz = Math.cos(inp.face);
    const sx = Math.cos(inp.face);
    const sz = -Math.sin(inp.face);
    const high = inp.y + CONTACT.handHigh * s;
    const low = inp.y + CONTACT.handLow * s;

    // A stagger: into a wall at a sprint (the wall ahead, the hit this frame)
    if (st.stagger) {
      st.stagger.t = Math.min(1, st.stagger.t + dt / CONTACT.stagger.t);
      if (st.stagger.t >= 1) st.stagger = null;
    } else if (inp.hit && (inp.hitSpeed ?? 0) > CONTACT.stagger.speed) {
      const ahead = near.filter((n) => n.fwd > 0 && Math.abs(n.side) < 0.5 * s).sort((a, b) => a.d - b.d)[0];
      if (ahead) {
        const side: 0 | 1 = ahead.side < 0 ? 0 : 1;
        let tx = -ahead.nz;
        let tz = ahead.nx;
        if (tx * sx + tz * sz < 0) (tx = -tx), (tz = -tz);
        const off = (side ? 1 : -1) * CONTACT.shoulder * s;
        st.stagger = { t: 0, hand: { side, x: ahead.px + tx * off + ahead.nx * CONTACT.palm * s, y: inp.y + CONTACT.stagger.hand * s, z: ahead.pz + tz * off + ahead.nz * CONTACT.palm * s, nx: ahead.nx, nz: ahead.nz, w: 1 } };
      }
    }

    // A squeeze: walls close on both sides
    let left = Infinity;
    let right = Infinity;
    for (const n of near) {
      if (Math.abs(n.fwd) > 0.45 * s) continue;
      if (n.side < 0) left = Math.min(left, n.d);
      else right = Math.min(right, n.d);
    }
    const gap = left + right;
    const squeezing = inp.moving && left < Infinity && right < Infinity && gap < CONTACT.squeeze * s;
    if (squeezing) squeezeTurn = CONTACT.squeezeTurn * Math.min(1, (CONTACT.squeeze * s - gap) / (0.4 * s));
    squeezeW = ease(squeezeW, squeezing ? 1 : 0, dt, squeezing ? CONTACT.ease : CONTACT.easeOut);
    st.squeeze = { turn: squeezeTurn, w: squeezeW };

    // Brushing: a wall or a person beside him while he moves
    let brushing = false;
    giveWant = 0;
    if (inp.moving && inp.speed > 0.4 && !st.stagger && !squeezing) {
      // (full within `close` of his middle, nothing at the limit)
      const close = CONTACT.close * s;
      const want = (d: number, limit: number) => Math.min(1, Math.max(0, (limit - d) / (limit - close)));
      for (const n of near) {
        if (Math.abs(n.fwd) > 0.35 * s || n.d > CONTACT.brush * s) continue;
        const w = want(n.d, CONTACT.brush * s);
        if (w > giveWant) {
          giveWant = w;
          giveSide = n.side < 0 ? -1 : 1;
        }
      }
      for (const p of inp.people) {
        const dx = p.x - inp.x;
        const dz = p.z - inp.z;
        const d = Math.hypot(dx, dz);
        const fwd = dx * fx + dz * fz;
        const side = dx * sx + dz * sz;
        if (d > CONTACT.person * s || fwd < -0.1 * s || Math.abs(side) < 0.08 * s) continue;
        const w = want(d, CONTACT.person * s);
        if (w > giveWant) {
          giveWant = w;
          giveSide = side < 0 ? -1 : 1;
        }
      }
      brushing = giveWant > 0;
    }
    if (brushing && !wasBrushing) st.hitch = 1;
    wasBrushing = brushing;
    st.hitch = Math.max(0, st.hitch - dt / CONTACT.hitchT);
    st.give.side = giveSide;
    st.give.w = ease(st.give.w, giveWant, dt, giveWant > st.give.w ? CONTACT.ease : CONTACT.easeOut);

    // A hand on a wall: stopped close to one ahead, or walking slowly along one
    let want: Hand | null = null;
    /** A hand on the wall at `n`, at height `y`: in front of its own shoulder (along the wall from the point nearest him) */
    const onWall = (n: { px: number; pz: number; nx: number; nz: number; side: number }, y: number, sideHint = n.side): Hand => {
      const side: 0 | 1 = sideHint < 0 ? 0 : 1;
      let tx = -n.nz;
      let tz = n.nx;
      if (tx * sx + tz * sz < 0) (tx = -tx), (tz = -tz);
      const off = (side ? 1 : -1) * CONTACT.shoulder * s;
      return { side, x: n.px + tx * off + n.nx * CONTACT.palm * s, y, z: n.pz + tz * off + n.nz * CONTACT.palm * s, nx: n.nx, nz: n.nz, w: 1 };
    };
    if (hands && !st.stagger && !squeezing) {
      if (inp.speed < CONTACT.still) {
        const ahead = near.filter((n) => n.fwd > 0 && n.d < CONTACT.handStop * s && Math.atan2(Math.abs(n.side), n.fwd) < CONTACT.handCone).sort((a, b) => a.d - b.d)[0];
        if (ahead) want = onWall(ahead, high, ahead.side < -0.05 * s ? -1 : 1);
      } else if (inp.speed < CONTACT.slow && inp.moving) {
        const beside = near.filter((n) => Math.abs(n.fwd) < 0.3 * s && n.d < CONTACT.handAlong * s && Math.abs(n.side) > 0.1 * s).sort((a, b) => a.d - b.d)[0];
        if (beside) want = onWall(beside, low);
      }
    }
    // (a hand that's on a wall stays where it is until it's let go: never slides to a new spot)
    // (nor swaps hands: it stays until it's let go)
    if (want && handWant && handW > 0.5) want = { ...handWant, y: want.y };
    if (want) {
      handWant = want;
      handRel = null;
    } else if (handWant) {
      // (let go, the spot comes with him in his own frame, so the hand only eases back to the pose)
      if (!handRel) handRel = toRig(new THREE.Vector3(), handWant.x, handWant.y, handWant.z, inp.x, inp.y, inp.z, inp.face, s);
      const c = Math.cos(inp.face);
      const sn = Math.sin(inp.face);
      handWant.x = inp.x + (handRel.x * c + handRel.z * sn) * s;
      handWant.z = inp.z + (-handRel.x * sn + handRel.z * c) * s;
      handWant.y = inp.y + handRel.y * s;
    }
    handW = ease(handW, want ? 1 : 0, dt, want ? CONTACT.handEase : CONTACT.easeOut);
    if (handW < 0.02) handWant = handRel = null;
    st.hand = handWant && handW >= 0.02 ? { ...handWant, w: handW } : null;

    // A lean on a rail: standing a while facing an edge no wall explains
    let railAt: { px: number; pz: number; nx: number; nz: number } | null = null;
    stillFor = inp.speed < CONTACT.still && !inp.moving ? stillFor + dt : 0;
    if (hands && inp.blocked && stillFor > CONTACT.railDwell && !st.hand && !st.stagger) {
      // (probe ahead: the first step he can't take, with nothing solid within reach of it)
      for (let r = 0.25 * s; r <= 0.5 * s; r += 0.125 * s) {
        const px = inp.x + fx * r;
        const pz = inp.z + fz * r;
        if (!inp.blocked(px, pz)) continue;
        if (inp.walls.some((b) => nearestOn(b, px, pz).d < 0.2 * s)) break;
        railAt = { px: inp.x + fx * (r - 0.08 * s), pz: inp.z + fz * (r - 0.08 * s), nx: -fx, nz: -fz };
        break;
      }
    }
    leanW = ease(leanW, railAt ? 1 : 0, dt, railAt ? CONTACT.ease * 3 : CONTACT.easeOut);
    if (railAt) {
      const y = inp.y + CONTACT.railH * s;
      const sp = CONTACT.railSpread * s;
      st.lean = {
        w: leanW,
        hands: [
          { side: 0, x: railAt.px - sx * sp, y, z: railAt.pz - sz * sp, nx: railAt.nx, nz: railAt.nz, w: leanW },
          { side: 1, x: railAt.px + sx * sp, y, z: railAt.pz + sz * sp, nx: railAt.nx, nz: railAt.nz, w: leanW },
        ],
      };
    } else if (st.lean) {
      st.lean.w = leanW;
      for (const h of st.lean.hands) h.w = leanW;
      if (leanW < 0.02) st.lean = null;
    }
    return st;
  }

  return {
    update,
    get state() {
      return st;
    },
    reset() {
      st.give.w = 0;
      st.hitch = 0;
      st.hand = st.lean = st.stagger = null;
      st.squeeze = { turn: 0, w: 0 };
      handW = leanW = stillFor = squeezeW = 0;
      handWant = handRel = null;
      wasBrushing = false;
    },
  };
}
export type Contact = ReturnType<typeof createContact>;

/* ---------- The layer on the pose ---------- */

const P: Posed = newPosed();
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const ql = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const vt = new THREE.Vector3();
const vab = new THREE.Vector3();
const vcb = new THREE.Vector3();
const vac = new THREE.Vector3();
const n1 = new THREE.Vector3();
const n2 = new THREE.Vector3();
const n3 = new THREE.Vector3();
const hinge = new THREE.Vector3();
const r0 = new THREE.Quaternion();
const r1 = new THREE.Quaternion();
const qi = new THREE.Quaternion();
const handW = new THREE.Quaternion();
const ARM: [number, number, number][] = [
  [MB.armL, MB.foreL, MB.handL],
  [MB.armR, MB.foreR, MB.handR],
];
const CLAV = [MB.clavL, MB.clavR];

/** Turn bone `b` in the figure's frame (about its parent's world axes): pitch about x, yaw about y, roll about z */
function turn(rot: Float32Array, b: number, pitch: number, yaw: number, roll: number) {
  const pw = P.rot[PARENT[b]];
  qa.setFromAxisAngle(X, pitch).multiply(qb.setFromAxisAngle(Y, yaw)).multiply(ql.setFromAxisAngle(Z, roll));
  qb.copy(pw).invert().multiply(qa).multiply(pw).multiply(ql.fromArray(rot, b * 4));
  qb.normalize().toArray(rot, b * 4);
}

/**
 * The arm reaches for `t` (the figure's frame): a two-bone IK as the legs' (animator.ts twoBone()), the
 * elbow a hinge about the upper arm's own x axis bending the way an elbow does, the hand keeping its turn
 */
export function reachArmBones(rot: Float32Array, p: Posed, a: number, b: number, c: number, t: THREE.Vector3, softAt = 0.98) {
  const A = p.pos[a];
  const B = p.pos[b];
  const C = p.pos[c];
  const lab = vab.copy(B).sub(A).length();
  const lcb = vcb.copy(C).sub(B).length();
  const full = lab + lcb;
  const soft = full * softAt;
  let lat = Math.max(Math.abs(lab - lcb) + 1e-4, vt.copy(t).sub(A).length());
  if (lat > soft) lat = soft + (full - soft) * (1 - Math.exp(-(lat - soft) / (full - soft)));
  lat = Math.min(lat, full * 0.9999);
  handW.copy(p.rot[c]);
  hinge.copy(X).applyQuaternion(p.rot[a]);
  n1.copy(vab).normalize();
  n2.copy(vcb).normalize();
  const now = Math.atan2(n3.copy(n1).cross(n2).dot(hinge), n1.dot(n2));
  const cosW = Math.max(-1, Math.min(1, (lab * lab + lcb * lcb - lat * lat) / (2 * lab * lcb)));
  // (the elbow bends the other way from the knee about the same axis)
  const want = -(Math.PI - Math.acos(cosW));
  r1.setFromAxisAngle(hinge, want - now);
  p.rot[b].premultiply(r1);
  p.pos[c].copy(REST[c]).applyQuaternion(p.rot[b]).add(p.pos[b]);
  r0.setFromUnitVectors(vac.copy(p.pos[c]).sub(A).normalize(), n1.copy(t).sub(A).normalize());
  p.rot[a].premultiply(r0);
  p.rot[b].premultiply(r0);
  p.pos[b].copy(REST[b]).applyQuaternion(p.rot[a]).add(A);
  p.pos[c].copy(REST[c]).applyQuaternion(p.rot[b]).add(p.pos[b]);
  qi.copy(p.rot[PARENT[a]]).invert();
  ql.copy(qi).multiply(p.rot[a]).normalize().toArray(rot, a * 4);
  qi.copy(p.rot[a]).invert();
  ql.copy(qi).multiply(p.rot[b]).normalize().toArray(rot, b * 4);
  qi.copy(p.rot[b]).invert();
  ql.copy(qi).multiply(handW).normalize().toArray(rot, c * 4);
  p.rot[c].copy(handW);
}

/** A world point in the figure's frame (rig numbers): at (x, y, z) facing `face`, at `scale` */
export function toRig(out: THREE.Vector3, wx: number, wy: number, wz: number, x: number, y: number, z: number, face: number, scale: number) {
  const dx = wx - x;
  const dz = wz - z;
  const c = Math.cos(face);
  const s = Math.sin(face);
  return out.set((dx * c - dz * s) / scale, (wy - y) / scale, (dx * s + dz * c) / scale);
}

const target = new THREE.Vector3();
/**
 * The layer on the animator's pose (`rot`, `hips`: the figure's frame), where he stands and faces at
 * `scale`: the give, the squeeze, the lean and the stagger on the body, then the hands reaching
 */
export function applyContact(rot: Float32Array, hips: THREE.Vector3, st: ContactState, x: number, y: number, z: number, face: number, scale: number) {
  const any = st.give.w > 1e-3 || st.squeeze.w > 1e-3 || st.hand || st.lean || st.stagger;
  if (!any) return;
  posed(rot, 0, hips.x, hips.y, hips.z, P);
  // The shoulder's give: the collarbone back, the chest turned a touch the same way
  if (st.give.w > 1e-3) {
    const k = st.give.side * st.give.w;
    turn(rot, MB.chest, 0, k * CONTACT.giveChest, 0);
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    turn(rot, st.give.side < 0 ? MB.clavL : MB.clavR, 0, k * CONTACT.give, 0);
  }
  // The squeeze: the shoulders turned, the arms in
  if (st.squeeze.w > 1e-3) {
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    turn(rot, MB.spine2, 0, st.squeeze.turn * 0.4 * st.squeeze.w, 0);
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    turn(rot, MB.chest, 0, st.squeeze.turn * 0.6 * st.squeeze.w, 0);
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    turn(rot, MB.armL, 0, 0, CONTACT.squeezeArms * st.squeeze.w);
    turn(rot, MB.armR, 0, 0, -CONTACT.squeezeArms * st.squeeze.w);
  }
  // The lean on the rail: the chest over the hands
  if (st.lean) {
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    turn(rot, MB.spine1, CONTACT.lean * 0.5 * st.lean.w, 0, 0);
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    turn(rot, MB.spine2, CONTACT.lean * 0.5 * st.lean.w, 0, 0);
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    turn(rot, MB.head, -CONTACT.lean * 0.8 * st.lean.w, 0, 0);
  }
  // The stagger: thrown back, the head with it
  if (st.stagger) {
    const u = st.stagger.t;
    const bell = Math.sin(Math.PI * Math.min(1, u)) ** 1.5;
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    turn(rot, MB.spine1, -CONTACT.stagger.pitch * 0.5 * bell, 0, 0);
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    turn(rot, MB.chest, -CONTACT.stagger.pitch * 0.5 * bell, 0, 0);
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    turn(rot, MB.head, -CONTACT.stagger.pitch * 0.4 * bell, 0, 0);
  }
  // The hands: on the wall, on the rail, up at the wall in a stagger
  const hands: Hand[] = [];
  if (st.hand) hands.push(st.hand);
  if (st.lean) hands.push(...st.lean.hands);
  if (st.stagger) hands.push({ ...st.stagger.hand, w: Math.sin(Math.PI * Math.min(1, st.stagger.t)) });
  for (const h of hands) {
    if (h.w < 1e-3) continue;
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    const [a, b, c] = ARM[h.side];
    toRig(target, h.x, h.y, h.z, x, y, z, face, scale);
    // (part of the way for a partial weight, eased: from where the hand is now)
    const hw = h.w * h.w * (3 - 2 * h.w);
    if (hw < 0.999) target.lerpVectors(P.pos[c], target, hw);
    // (the collarbone comes forward a little towards the reach)
    turn(rot, CLAV[h.side], 0, (h.side ? -1 : 1) * 0.12 * hw, 0);
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    reachArmBones(rot, P, a, b, c, target);
  }
}

/** The rubric's Contact row: how far a hand is from where it's meant to be (rig numbers), for a test */
export function handOff(rot: Float32Array, hips: THREE.Vector3, h: Hand, x: number, y: number, z: number, face: number, scale: number) {
  posed(rot, 0, hips.x, hips.y, hips.z, P);
  toRig(target, h.x, h.y, h.z, x, y, z, face, scale);
  return P.pos[ARM[h.side][2]].distanceTo(target) * scale;
}

