/*
 * Over low things (animation Phase 5, DOM-free, tested in tests/vault.test.ts;
 * the owner's calls: low things only, over and down, never standing on top):
 * Jump at something low straight ahead and Degen goes over it to the far
 * side, a vault for what's waist-high, a climb (hands on the top, pulled up,
 * over and down) for what's up to about head height.
 *
 * - `LOW_THINGS`: what can be gone over, from the data that knows their real
 *   heights (the solids' boxes elsewhere are rough, for the camera): The
 *   Trenches' jersey barriers, the yards' concrete kerbs and the dumpsters,
 *   Westlake Park's walls, hedges, beds and planters, and downtown's alley
 *   crates, pallets and bins. Never a building, a car, a kiosk or a stall.
 * - `overAhead()`: the nearest low thing straight ahead within reach, thin
 *   enough to go over, and where he'd land (walk.ts checks the way and the
 *   landing are clear).
 * - `overAt()`: where he is a share `u` of the way over (along, and up off
 *   the ground), and `overPose()` the keyed pose there: knees tucked, leant
 *   over it, his hands planted on its top by the arm IK.
 */
import * as THREE from 'three';
import type { Box } from './solids';
import { ALLEY_PROPS } from './downtown';
import { BARRIERS, DUMPSTER, DUMPSTERS, JERSEY, barrierRect } from './grit';
import { GARDEN_LOW } from './gardens';
import { EDGES, edgeSolid } from './streetwall';
import { type Pose, reachArm, torsoFrame } from './skeleton';

export const LOW_THINGS: Box[] = [
  ...BARRIERS.map((j): Box => [...barrierRect(j), JERSEY.h]),
  ...DUMPSTERS.map((d): Box => [...d.rect, DUMPSTER.h]),
  ...EDGES.map((e) => edgeSolid(e) as Box),
  ...GARDEN_LOW,
  ...ALLEY_PROPS.map((p): Box => [...p.box, p.h]),
];
const key = (b: Box) => `${b[0].toFixed(3)},${b[1].toFixed(3)},${b[2].toFixed(3)},${b[3].toFixed(3)},${b[4].toFixed(3)}`;
const LOW_KEYS = new Set(LOW_THINGS.map(key));
/** Whether a solid's box is one of the low things (matched by its numbers: the grids hold their own copies) */
export const isLow = (b: Box) => LOW_KEYS.has(key(b));

/**
 * The rules: how far ahead a low thing can be (from his middle to its near
 * face, tiles), how high over his ground it must be to need going over
 * (`min`), the highest he vaults (`vault`) and climbs (`climb`), how thick
 * it can be along the way (`deep`), how square on he must come at it (the
 * cosine against its face, `square`), how far past it he lands (from its far
 * face to his middle), and how long each takes: a vault `vaultT` seconds
 * (plus `perTile` a tile of thickness), a climb `climbT`; a landing at most
 * `drop` lower or higher than where he set off; his feet (the figure's
 * root) go over its top by `clear` (a vault's, a climb's: below it, his
 * knees tucked lift his feet over it)
 */
export const OVER = { reach: 0.85, min: 0.25, vault: 0.75, climb: 1.25, deep: 1.3, square: 0.55, land: 0.42, vaultT: 0.55, climbT: 1.05, perTile: 0.2, drop: 0.45, clear: [-0.26, -0.2] };

export type OverKind = 'vault' | 'climb';
export interface Over {
  kind: OverKind;
  box: Box;
  /** The way he goes (yaw), from where to where on the ground (world) */
  dir: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** How far along the way the thing's near and far faces are (tiles from the start) */
  near: number;
  far: number;
  /** Its top (world) and how high that is over his ground */
  top: number;
  h: number;
  /** Seconds it takes */
  dur: number;
}

/**
 * The low thing to go over straight ahead of (x, z) going `dir`, his ground
 * `ground` there: the nearest in reach, high enough to need it, low enough
 * to go over, thin enough, come at squarely; among `boxes` (the solids near
 * him), only low things count, and nothing else may stand in front of it
 */
export function overAhead(x: number, z: number, dir: number, ground: number, boxes: Box[], radius: number, low: (b: Box) => boolean = isLow): Over | null {
  const dx = Math.sin(dir);
  const dz = Math.cos(dir);
  let best: Over | null = null;
  let nearest = Infinity;
  for (const b of boxes) {
    // (the ray along the way through the box: where it goes in and out)
    let t0 = -Infinity;
    let t1 = Infinity;
    let nx = 0;
    let nz = 0;
    let miss = false;
    for (const [o, d, lo, hi, ax] of [
      [x, dx, b[0], b[2], 0],
      [z, dz, b[1], b[3], 1],
    ] as const) {
      if (Math.abs(d) < 1e-9) {
        if (o < lo || o > hi) miss = true;
        continue;
      }
      let a = (lo - o) / d;
      let c = (hi - o) / d;
      if (a > c) [a, c] = [c, a];
      if (a > t0) {
        t0 = a;
        nx = ax === 0 ? -Math.sign(d) : 0;
        nz = ax === 1 ? -Math.sign(d) : 0;
      }
      t1 = Math.min(t1, c);
    }
    if (miss || t0 > t1 || t1 < 0 || t0 > OVER.reach + radius || t0 < -radius) continue;
    if (t0 >= nearest) continue;
    nearest = t0;
    const h = b[4] - ground;
    // (something else in front of it, or the nearest thing isn't one to go over: nothing)
    if (!low(b) || h < OVER.min || h > OVER.climb || t1 - t0 > OVER.deep || -(nx * dx + nz * dz) < OVER.square) {
      best = null;
      continue;
    }
    const kind: OverKind = h <= OVER.vault ? 'vault' : 'climb';
    const end = t1 + OVER.land + radius;
    best = {
      kind,
      box: b,
      dir,
      x0: x,
      z0: z,
      x1: x + dx * end,
      z1: z + dz * end,
      near: Math.max(0, t0),
      far: t1,
      top: b[4],
      h,
      dur: kind === 'vault' ? OVER.vaultT + OVER.perTile * end : OVER.climbT + OVER.perTile * Math.max(0, end - 1.5),
    };
  }
  return best;
}

const ease = (u: number) => u * u * (3 - 2 * u);
/** How far over he is at share `u`, as (along the way 0..1, the tuck 0..1, the hands down 0..1) */
function phases(o: Over, u: number) {
  if (o.kind === 'vault') {
    // Steady along; tucked and the hands on it over the middle
    const along = u * 0.85 + ease(u) * 0.15;
    const tuck = THREE.MathUtils.smoothstep(u, 0.03, 0.22) * (1 - THREE.MathUtils.smoothstep(u, 0.62, 0.88));
    const hands = THREE.MathUtils.smoothstep(u, 0.12, 0.25) * (1 - THREE.MathUtils.smoothstep(u, 0.55, 0.7));
    return { along, tuck, hands };
  }
  // A climb: up the near face slowly, over the top quickly, down the far side
  const atWall = Math.max(0, o.near - 0.28) / Math.max(1e-3, Math.hypot(o.x1 - o.x0, o.z1 - o.z0));
  const along = u < 0.45 ? atWall * ease(u / 0.45) : atWall + (1 - atWall) * ease((u - 0.45) / 0.55);
  const tuck = THREE.MathUtils.smoothstep(u, 0.2, 0.5) * (1 - THREE.MathUtils.smoothstep(u, 0.72, 0.95));
  const hands = THREE.MathUtils.smoothstep(u, 0.05, 0.22) * (1 - THREE.MathUtils.smoothstep(u, 0.45, 0.58));
  return { along, tuck, hands };
}

/**
 * Where he is a share `u` (0..1) of the way over: on the ground along the
 * way (world x, z) and how high off the ground under the start and the
 * landing (`g0`, `g1`) his feet are: clear of the top while he's over it
 */
export function overAt(o: Over, u: number, g0: number, g1: number) {
  const { along } = phases(o, u);
  const len = Math.hypot(o.x1 - o.x0, o.z1 - o.z0);
  const s = along * len;
  const base = g0 + (g1 - g0) * along;
  // (his feet over the top while he's across it, eased up to it and down from it)
  // (up from where he sets off at the earliest, down by the landing)
  // (a vault's legs come up early, out in front: up earlier)
  const lo = Math.max(0, o.near - 0.8);
  const over = THREE.MathUtils.smoothstep(s, lo, Math.max(lo + 0.1, o.near - (o.kind === 'vault' ? 0.42 : 0.25))) * (1 - THREE.MathUtils.smoothstep(s, o.far + 0.05, Math.max(o.far + 0.15, len)));
  const clear = o.kind === 'vault' ? OVER.clear[0] : OVER.clear[1];
  const up = Math.max(0, o.top + clear - base) * over;
  return { x: o.x0 + (o.x1 - o.x0) * along, z: o.z0 + (o.z1 - o.z0) * along, y: base + up };
}

const mRoot = new THREE.Matrix4();
const mTorso = new THREE.Matrix4();
const vHand = new THREE.Vector3();
const qYaw = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
/**
 * The keyed pose a share `u` of the way over, `a` 0..1 of it over whatever
 * pose is set: the knees tucked up, leant into it, his hands planted on its
 * top either side of the way (the arm IK, from where his figure stands: `x`,
 * `y`, `z`, facing `face` at `scale`), then the arms out for the landing
 */
export function overPose(p: Pose, o: Over, u: number, a: number, x: number, y: number, z: number, face: number, scale: number) {
  if (a <= 0) return;
  const { tuck, hands } = phases(o, u);
  const k = tuck * a;
  const climb = o.kind === 'climb';
  // (a vault swings the tucked legs out to his right, past the hand planted on his left: a speed vault)
  for (const [i, l] of p.legs.entries()) {
    l.fwd += ((climb ? 1.5 : 1.5) - l.fwd) * k;
    l.bend += ((climb ? 2.1 : 1.0) - l.bend) * k;
    l.out += ((climb ? 0.12 : i === 0 ? 0.45 : -0.1) - l.out) * k;
    l.foot = (l.foot ?? 0) * (1 - k) - 0.2 * k;
    l.toe = (l.toe ?? 0) * (1 - k);
    l.footYaw = (l.footYaw ?? 0) * (1 - k);
    l.footRoll = (l.footRoll ?? 0) * (1 - k);
  }
  p.lean += ((climb ? 0.55 : 0.8) - p.lean) * Math.max(k, hands * a);
  p.bob *= 1 - a;
  p.twist += ((climb ? 0 : -0.25) * k - p.twist) * a;
  p.side += ((climb ? 0 : -0.3) * k - p.side) * a;
  p.sway = (p.sway ?? 0) * (1 - a);
  p.turn = (p.turn ?? 0) * (1 - a) + (climb ? 0 : 0.45) * k;
  p.headPitch += (0.25 - p.headPitch) * hands * a;
  // Out for balance, before and after (a vault's free right arm all the way)
  for (const [i, l] of p.arms.entries()) {
    const out = (climb || i === 1 ? 1 - hands : 1) * Math.max(k, 0.3 * a);
    l.fwd += (0.5 - l.fwd) * out;
    l.out += ((i ? 0.7 : 0.7) - l.out) * out;
    l.bend += (0.5 - l.bend) * out;
  }
  if (hands * a < 0.02) return;
  // The hands on its top, either side of the way, just past the near face (world), into the torso frame
  mRoot.compose(new THREE.Vector3(x, y, z), qYaw.setFromAxisAngle(UP, face), new THREE.Vector3(scale, scale, scale)).invert();
  torsoFrame(p, mTorso);
  mTorso.invert();
  const dx = Math.sin(o.dir);
  const dz = Math.cos(o.dir);
  const at = o.near + 0.12;
  for (const i of climb ? ([0, 1] as const) : ([1] as const)) {
    // (arms[0] is the rig's -x arm: his right when he faces +z; a vault plants only his left)
    const side = i === 0 ? -1 : 1;
    const wx = o.x0 + dx * at + dz * side * 0.16;
    const wz = o.z0 + dz * at - dx * side * 0.16;
    vHand.set(wx, o.top + 0.03, wz).applyMatrix4(mRoot).applyMatrix4(mTorso);
    const before = { ...p.arms[i] };
    reachArm(p, i, vHand);
    // (blended in as the hands come down)
    const w = hands * a;
    const l = p.arms[i];
    l.fwd = before.fwd + (l.fwd - before.fwd) * w;
    l.out = before.out + (l.out - before.out) * w;
    l.bend = before.bend + (l.bend - before.bend) * w;
    l.twist = (before.twist ?? 0) + ((l.twist ?? 0) - (before.twist ?? 0)) * w;
  }
}
