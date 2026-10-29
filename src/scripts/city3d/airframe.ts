/*
 * The aircraft's moving parts (vehicle plan Phase 9): DOM-free, tested in
 * tests/airframe.test.ts, read by aircraft.ts (which draws them for the
 * airport's fleets and your own aircraft alike).
 *
 * Model space as aircraft.ts's: +x the nose, y up, +z the right wing; the
 * origin on the ground under the middle.
 *
 * - `PANELS`: each model's wings, tailplane and fin as flat outlines laid
 *   into the model (`place()`), so the drawing and the hinges agree.
 * - `SURFACES`: the ailerons, flaps, elevators and rudder, each cut out of
 *   its panel's trailing edge (`notched()`) and hinged along the cut
 *   (`frames()`, `surfaceMatrix()`): they move with the controls
 *   (`stepAirframe()`: your own from the stick, the airport's from how
 *   their poses turn), the flaps down for landing and part down rolling.
 * - `LEGS`: the retracting gear, each a strut and its wheels hung from a
 *   pivot (on the ground at y 0 when down) that folds about its axis
 *   (`legMatrix()`): the nose leg aft into the nose, the mains inward into
 *   the belly fairing (`FAIRINGS`), over `GEAR_TIME`; hidden once it's up.
 */
import * as THREE from 'three';

export type FrameKind = 'jet' | 'freighter' | 'prop' | 'heli' | 'bizjet';
type V2 = [number, number];
type V3 = [number, number, number];

/** A fuselage as stations: x, radius, centre height, height scale */
export type Station = [number, number, number, number?];

/* ---------- The bodies the gear folds into ---------- */

/** The airliner's centre height and its fuselage */
export const JET_H = 2.75;
export const JET_BODY: Station[] = [
  [10.1, 0.04, JET_H - 0.35],
  [9.85, 0.5, JET_H - 0.3],
  [9.35, 0.86, JET_H - 0.18],
  [8.6, 1.12, JET_H - 0.08],
  [7.6, 1.26, JET_H - 0.02],
  [6.6, 1.3, JET_H],
  [-4.6, 1.3, JET_H],
  [-6.2, 1.16, JET_H + 0.18],
  [-7.8, 0.88, JET_H + 0.48],
  [-9.2, 0.5, JET_H + 0.82],
  [-10.1, 0.12, JET_H + 1.02],
  [-10.25, 0.02, JET_H + 1.05],
];
/** The small jet's */
export const BIZ_H = 1.35;
export const BIZ_BODY: Station[] = [
  [4.4, 0.03, BIZ_H - 0.22],
  [4.2, 0.26, BIZ_H - 0.17],
  [3.8, 0.46, BIZ_H - 0.09],
  [3.2, 0.6, BIZ_H - 0.02],
  [2.5, 0.65, BIZ_H],
  [-1.6, 0.65, BIZ_H],
  [-2.6, 0.55, BIZ_H + 0.1],
  [-3.5, 0.37, BIZ_H + 0.26],
  [-4.2, 0.13, BIZ_H + 0.4],
  [-4.32, 0.02, BIZ_H + 0.42],
];
/** The prop plane's centre height */
export const PROP_H = 1.15;

/** The belly fairing under the wing's root (an ellipsoid: centre and half sizes), where the mains fold */
export interface Fairing {
  at: V3;
  half: V3;
}
export const FAIRINGS: Partial<Record<FrameKind, Fairing>> = {
  jet: { at: [-0.7, 1.95, 0], half: [3.4, 0.82, 1.5] },
  bizjet: { at: [-0.6, 1.0, 0], half: [1.7, 0.42, 0.78] },
};
FAIRINGS.freighter = FAIRINGS.jet;

/** Whether a point is inside a station body (its round sections, eased between) */
export function inBody(st: Station[], x: number, y: number, z: number, give = 0) {
  if (x > st[0][0] || x < st[st.length - 1][0]) return false;
  let i = 0;
  while (i < st.length - 2 && st[i + 1][0] > x) i++;
  const [a, b] = [st[i], st[i + 1]];
  const f = (x - a[0]) / (b[0] - a[0] || 1);
  const r = a[1] + (b[1] - a[1]) * f + give;
  const cy = a[2] + (b[2] - a[2]) * f;
  const sy = (a[3] ?? 1) + ((b[3] ?? 1) - (a[3] ?? 1)) * f;
  return ((y - cy) / (r * sy)) ** 2 + (z / r) ** 2 <= 1;
}
export function inFairing(fr: Fairing, x: number, y: number, z: number) {
  return ((x - fr.at[0]) / fr.half[0]) ** 2 + ((y - fr.at[1]) / fr.half[1]) ** 2 + ((z - fr.at[2]) / fr.half[2]) ** 2 <= 1;
}

/* ---------- Wings, tailplanes and fins ---------- */

/**
 * A flat panel: its outline in (u along the body, v out along the span or up the fin), always leading edge at the
 * root, trailing edge at the root, trailing edge at the tip, leading edge at the tip; its thickness; where it's laid
 * (the height of its root, `y`; a wing or tailplane rising `dih` a tile out from `v0`; a fin standing up at z 0)
 */
export interface Panel {
  outline: V2[];
  thick: number;
  y: number;
  v0: number;
  dih: number;
  fin?: boolean;
}
export type PanelId = 'wing' | 'tail' | 'fin';

const JET_PANELS: Record<PanelId, Panel> = {
  wing: { outline: [[2.3, 0.9], [-2.9, 0.9], [-4.2, 9], [-2.5, 9]], thick: 0.26, y: JET_H - 0.95, v0: 0.9, dih: 0.08 },
  tail: { outline: [[-7.6, 0.3], [-9.7, 0.3], [-10.3, 3.7], [-9.3, 3.7]], thick: 0.18, y: JET_H + 0.75, v0: 0, dih: 0.05 },
  fin: { outline: [[-6.4, 0], [-9.8, 0], [-10.6, 4.6], [-9.3, 4.6]], thick: 0.28, y: JET_H + 0.9, v0: 0, dih: 0, fin: true },
};
const BIZ_FIN = 2.05;
export const PANELS: Partial<Record<FrameKind, Record<PanelId, Panel>>> = {
  jet: JET_PANELS,
  freighter: JET_PANELS,
  bizjet: {
    wing: { outline: [[1, 0.5], [-0.9, 0.5], [-2.05, 4.05], [-1.4, 4.05]], thick: 0.16, y: BIZ_H - 0.42, v0: 0.5, dih: 0.07 },
    tail: { outline: [[-3.95, 0.05], [-4.6, 0.05], [-4.95, 1.75], [-4.55, 1.75]], thick: 0.1, y: BIZ_H + 0.3 + BIZ_FIN, v0: 0, dih: 0 },
    fin: { outline: [[-2.85, 0], [-4.15, 0], [-4.75, BIZ_FIN], [-4.1, BIZ_FIN]], thick: 0.14, y: BIZ_H + 0.3, v0: 0, dih: 0, fin: true },
  },
  prop: {
    // (a high wing on struts, rounded off at the tips by their caps)
    wing: { outline: [[0.88, 0], [-0.38, 0], [-0.38, 3.6], [0.88, 3.6]], thick: 0.14, y: PROP_H + 0.68, v0: 0, dih: 0 },
    tail: { outline: [[-2.05, 0], [-2.62, 0], [-2.66, 1.2], [-2.2, 1.2]], thick: 0.08, y: PROP_H + 0.3, v0: 0, dih: 0 },
    fin: { outline: [[-1.9, 0], [-2.75, 0], [-2.95, 1.05], [-2.5, 1.05]], thick: 0.1, y: PROP_H + 0.3, v0: 0, dih: 0, fin: true },
  },
};

/** A panel's (u, v, t) laid into the model, on the right (`side` 1) or the left */
export function place(p: Panel, side: 1 | -1, u: number, v: number, t: number): V3 {
  return p.fin ? [u, p.y + v, t] : [u, p.y + t + (v - p.v0) * p.dih, side * v];
}

/* ---------- Control surfaces ---------- */

export type Channel = 'aileron' | 'elevator' | 'rudder' | 'flap';
/** Its colour: the panel's grey or white, or the aircraft's livery */
export type Paint = 'grey' | 'white' | 'accent';
export interface Surface {
  panel: PanelId;
  channel: Channel;
  /** Where along the trailing edge it runs (0 the root, 1 the tip) and how deep it is (tiles) */
  from: number;
  to: number;
  chord: number;
  /** As far as it swings (radians); a flap also slides back `slide` of its chord */
  max: number;
  slide?: number;
  paint: Paint;
}
const JET_SURFACES: Surface[] = [
  { panel: 'wing', channel: 'flap', from: 0, to: 0.3, chord: 1.1, max: 0.6, slide: 0.35, paint: 'grey' },
  { panel: 'wing', channel: 'flap', from: 0.33, to: 0.66, chord: 0.95, max: 0.6, slide: 0.35, paint: 'grey' },
  { panel: 'wing', channel: 'aileron', from: 0.7, to: 0.95, chord: 0.7, max: 0.38, paint: 'grey' },
  { panel: 'tail', channel: 'elevator', from: 0.06, to: 0.96, chord: 0.5, max: 0.42, paint: 'grey' },
  { panel: 'fin', channel: 'rudder', from: 0.05, to: 0.92, chord: 0.72, max: 0.42, paint: 'accent' },
];
export const SURFACES: Partial<Record<FrameKind, Surface[]>> = {
  jet: JET_SURFACES,
  freighter: JET_SURFACES,
  bizjet: [
    { panel: 'wing', channel: 'flap', from: 0.04, to: 0.55, chord: 0.42, max: 0.6, slide: 0.3, paint: 'grey' },
    { panel: 'wing', channel: 'aileron', from: 0.6, to: 0.93, chord: 0.32, max: 0.38, paint: 'grey' },
    { panel: 'tail', channel: 'elevator', from: 0.08, to: 0.96, chord: 0.2, max: 0.42, paint: 'white' },
    { panel: 'fin', channel: 'rudder', from: 0.05, to: 0.82, chord: 0.3, max: 0.42, paint: 'accent' },
  ],
  prop: [
    { panel: 'wing', channel: 'flap', from: 0.18, to: 0.5, chord: 0.34, max: 0.55, slide: 0.2, paint: 'white' },
    { panel: 'wing', channel: 'aileron', from: 0.53, to: 0.9, chord: 0.3, max: 0.4, paint: 'white' },
    { panel: 'tail', channel: 'elevator', from: 0.1, to: 0.97, chord: 0.2, max: 0.45, paint: 'white' },
    { panel: 'fin', channel: 'rudder', from: 0.12, to: 0.95, chord: 0.26, max: 0.45, paint: 'accent' },
  ],
};

/** A trailing edge's points at `f` along it, and the inward (forward) unit normal in the panel's (u, v) */
function trailing(p: Panel, f: number): { at: V2; n: V2 } {
  const [a, b] = [p.outline[1], p.outline[2]];
  const d: V2 = [b[0] - a[0], b[1] - a[1]];
  const l = Math.hypot(d[0], d[1]);
  let n: V2 = [d[1] / l, -d[0] / l];
  if (n[0] < 0) n = [-n[0], -n[1]];
  return { at: [a[0] + d[0] * f, a[1] + d[1] * f], n };
}
/** Where a surface's corners are in the panel's (u, v): on the trailing edge at its ends (a, b) and on its hinge (a2, b2) */
export function corners(p: Panel, s: Surface) {
  const A = trailing(p, s.from);
  const B = trailing(p, s.to);
  const fwd = (q: { at: V2; n: V2 }): V2 => [q.at[0] + q.n[0] * s.chord, q.at[1] + q.n[1] * s.chord];
  return { a: A.at, b: B.at, a2: fwd(A), b2: fwd(B) };
}

/** A panel's outline with its surfaces cut out of the trailing edge (the drawing's) */
export function notched(kind: FrameKind, id: PanelId): V2[] {
  const p = PANELS[kind]![id];
  const [le0, te0, te1, le1] = p.outline;
  const cuts = (SURFACES[kind] ?? []).filter((s) => s.panel === id).sort((x, y) => x.from - y.from);
  const pts: V2[] = [le0, te0];
  for (const s of cuts) {
    const c = corners(p, s);
    pts.push(c.a, c.a2, c.b2, c.b);
  }
  pts.push(te1, le1);
  return pts.filter((q, i) => i === 0 || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 1e-6);
}

/** A surface laid into the model: its hinge's frame (x aft along the chord, z along the hinge), size and how it moves */
export interface Frame {
  channel: Channel;
  side: 1 | -1;
  paint: Paint;
  /** The hinge line's middle, the frame turned to it */
  hinge: THREE.Matrix4;
  chord: number;
  len: number;
  thick: number;
  /** Turning the frame +z by this sign moves the trailing edge down (a fin's: to the right) */
  sign: 1 | -1;
  max: number;
  slide: number;
}
/** The surfaces' clearance from the cut's sides (so no two faces lie flush) */
const GAP = 0.012;
const FRAMES = new Map<FrameKind, Frame[]>();
export function frames(kind: FrameKind): Frame[] {
  const got = FRAMES.get(kind);
  if (got) return got;
  const out: Frame[] = [];
  for (const s of SURFACES[kind] ?? []) {
    const p = PANELS[kind]![s.panel];
    const c = corners(p, s);
    for (const side of p.fin ? ([1] as const) : ([1, -1] as const)) {
      const w = (q: V2) => new THREE.Vector3(...place(p, side, q[0], q[1], 0));
      const [a, b, a2, b2] = [w(c.a), w(c.b), w(c.a2), w(c.b2)];
      const mid = a2.clone().add(b2).multiplyScalar(0.5);
      const span = b2.clone().sub(a2);
      const aft = a.clone().add(b).multiplyScalar(0.5).sub(mid);
      const Z = span.clone().normalize();
      const X = aft.clone().sub(Z.clone().multiplyScalar(aft.dot(Z))).normalize();
      const Y = Z.clone().cross(X);
      const down = p.fin ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, -1, 0);
      out.push({
        channel: s.channel,
        side,
        paint: s.paint,
        hinge: new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(mid),
        chord: aft.length() - GAP,
        len: span.length() - GAP * 2,
        thick: p.thick * 0.8,
        sign: Y.dot(down) > 0 ? 1 : -1,
        max: s.max,
        slide: s.slide ?? 0,
      });
    }
  }
  FRAMES.set(kind, out);
  return out;
}

const R = new THREE.Matrix4();
const SL = new THREE.Matrix4();
const SC = new THREE.Matrix4();
/**
 * A surface's place in the model at `deflect` (-1..1 of its swing: positive the trailing edge down, a rudder's to
 * the right; a flap 0..1 also slides back), for a unit box from x 0 to 1, y and z -0.5 to 0.5
 */
export function surfaceMatrix(f: Frame, deflect: number, out = new THREE.Matrix4()) {
  const d = Math.max(-1, Math.min(1, deflect));
  SL.makeTranslation(GAP + f.slide * f.chord * Math.max(0, d), 0, 0);
  R.makeRotationZ(f.sign * d * f.max);
  SC.makeScale(f.chord, f.thick, f.len);
  return out.copy(f.hinge).multiply(SL).multiply(R).multiply(SC);
}

/* ---------- The gear ---------- */

export interface Leg {
  /** Where it hangs from (inside the body or the wing) */
  pivot: V3;
  /** Wheel radius and width; twin wheels this far either side of the strut (0: one) */
  r: number;
  w: number;
  twin: number;
  /** The axis it folds about and how far (radians, the right-hand way round it) */
  axis: V3;
  fold: number;
  /** The strut's radius */
  strut: number;
}
/** The strut's length: from the pivot down to the axle, the wheels on the ground */
export const legLength = (l: Leg) => l.pivot[1] - l.r;
const mains = (x: number, y: number, z: number, r: number, w: number, twin: number, fold: number, strut: number): Leg[] =>
  ([1, -1] as const).map((s) => ({ pivot: [x, y, s * z] as V3, r, w, twin, axis: [1, 0, 0] as V3, fold: s * fold, strut }));
const JET_LEGS: Leg[] = [
  { pivot: [7.7, JET_H - 0.9, 0], r: 0.32, w: 0.2, twin: 0.24, axis: [0, 0, 1], fold: -1.75, strut: 0.09 },
  ...mains(-0.7, JET_H - 0.88, 2.1, 0.44, 0.2, 0.24, 1.85, 0.11),
];
export const LEGS: Partial<Record<FrameKind, Leg[]>> = {
  jet: JET_LEGS,
  freighter: JET_LEGS,
  bizjet: [{ pivot: [3.05, BIZ_H - 0.45, 0], r: 0.17, w: 0.16, twin: 0, axis: [0, 0, 1], fold: -1.75, strut: 0.06 }, ...mains(-0.6, BIZ_H - 0.38, 1.05, 0.24, 0.16, 0, 1.75, 0.07)],
};
/** How long the gear takes to come up or go down (seconds) */
export const GEAR_TIME = 3.2;

const AX = new THREE.Vector3();
/** A leg's place in the model, `down` 1 down and locked to 0 folded away; its geometry hangs from the origin down -y */
export function legMatrix(l: Leg, down: number, out = new THREE.Matrix4()) {
  out.makeRotationAxis(AX.set(...l.axis), (1 - Math.max(0, Math.min(1, down))) * l.fold);
  return out.setPosition(l.pivot[0], l.pivot[1], l.pivot[2]);
}

/* ---------- Moving them ---------- */

/** What the controls are doing for one aircraft (each -1..1; flaps and gear 0..1) */
export interface Airframe {
  ail: number;
  ele: number;
  rud: number;
  flap: number;
  gear: number;
  /** The pose it had last step, for how it's turning */
  last: { yaw: number; pitch: number; roll: number } | null;
}
export const newAirframe = (gear = 1): Airframe => ({ ail: 0, ele: 0, rud: 0, flap: 0, gear, last: null });

/** What a pose says about the aircraft (airfield.ts `Pose`'s fields this reads) */
export interface FramePose {
  yaw: number;
  pitch: number;
  roll: number;
  v: number;
  ground: boolean;
  gear: boolean;
  /** Your own aircraft: the stick (turn right +, climb +), straight onto the surfaces */
  stick?: { turn: number; climb: number };
}
/** How quickly the surfaces follow (a second's share, as a rate) and the rates that put them full over */
export const SURFACE_RATE = 6;
const ROLL_FULL = 0.45;
const PITCH_FULL = 0.2;
const YAW_FULL = 0.35;

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/** Where the controls want the surfaces: from the stick, or from how the pose is turning (`dt` seconds since the last) */
export function targetsOf(a: Airframe, p: FramePose, dt: number) {
  const flap = p.gear ? (!p.ground ? 1 : p.v > 0.5 ? 0.4 : 0) : 0;
  if (p.stick) {
    const { turn, climb } = p.stick;
    return { ail: clamp1(turn), ele: clamp1(climb), rud: clamp1(turn * 0.6), flap };
  }
  if (!a.last || dt <= 0) return { ail: 0, ele: 0, rud: 0, flap };
  // (a positive roll banks right, a positive yaw turns left, a positive pitch is nose up)
  const rollRate = wrap(p.roll - a.last.roll) / dt;
  const pitchRate = wrap(p.pitch - a.last.pitch) / dt;
  const yawRate = wrap(p.yaw - a.last.yaw) / dt;
  return {
    ail: clamp1(rollRate / ROLL_FULL),
    // (held a little up through a banked turn)
    ele: clamp1(pitchRate / PITCH_FULL + (p.ground ? 0 : Math.abs(p.roll) * 0.6)),
    rud: clamp1(-yawRate / (p.ground ? YAW_FULL : YAW_FULL * 3)),
    flap,
  };
}

/** One step: the surfaces ease to the controls, the gear comes up or goes down (the first step lands where it is) */
export function stepAirframe(a: Airframe, p: FramePose, dt: number) {
  const t = targetsOf(a, p, dt);
  const first = !a.last;
  const k = first ? 1 : 1 - Math.exp(-SURFACE_RATE * Math.max(0, dt));
  a.ail += (t.ail - a.ail) * k;
  a.ele += (t.ele - a.ele) * k;
  a.rud += (t.rud - a.rud) * k;
  // (flaps travel slower)
  a.flap += (t.flap - a.flap) * (first ? 1 : 1 - Math.exp(-1.2 * Math.max(0, dt)));
  const g = p.gear ? 1 : 0;
  a.gear = first ? g : g > a.gear ? Math.min(1, a.gear + dt / GEAR_TIME) : Math.max(0, a.gear - dt / GEAR_TIME);
  a.last = { yaw: p.yaw, pitch: p.pitch, roll: p.roll };
  return a;
}

/** A surface's deflection (-1..1 of its swing) from the controls */
export function deflection(f: Frame, a: Airframe) {
  switch (f.channel) {
    // (rolling right: the right aileron's trailing edge up, the left's down)
    case 'aileron':
      return -f.side * a.ail;
    // (nose up: the trailing edge up)
    case 'elevator':
      return -a.ele;
    case 'rudder':
      return a.rud;
    case 'flap':
      return a.flap;
  }
}
