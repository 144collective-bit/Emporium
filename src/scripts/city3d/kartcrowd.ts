/*
 * The kart park's live crowd and its podium ceremony as rules (docs/kart-west-plan.md Phase 4), free of the DOM and
 * of scene code, tested in tests/kartcrowd.test.ts; kart.ts plays them, kartgrounds3d.ts waves the marshals' flags.
 *
 * - **The fans** (`excited()`): a fan on the banks, in the stands or on the terrace cheers (crowdclips.ts `cheer`,
 *   `sitcheer` seated) while a kart goes by within `FAN_REACH`, everyone near you for a moment when you overtake
 *   (`WAVE`), and the whole park through the ceremony.
 * - **The marshals** (`marshalFlags()`): green round the circuit for the first seconds after the start, yellow at the
 *   posts just up the track from a kart that's spun or been put back (`YELLOW`), blue at a post where a kart is about
 *   to be lapped, the chequered flag at the post by the line once the leader's on the last lap; nothing otherwise.
 * - **The ceremony** (`CEREMONY`, `ceremonyAt()`, `ceremonyCam()`, `podiumSpot()`): when a race is over the top three
 *   karts stand on the podium's steps facing the plaza, a trophy comes up over the winner, confetti flies from the
 *   backdrop (`confettiAt()`), and the camera moves from the plaza in to the winner and up and out; then the results.
 */
import { CIRCUIT, type Course } from './kartcircuit';
import { MARSHALS } from './kartside';
import { PODIUM, PODIUM_RECT } from './kartfacility';
import { along, frame, locate, toWorld } from './kartpark';

/** How near a kart has to come for a fan to cheer, and how long the wave after you overtake lasts and how far it reaches */
export const FAN_REACH = 10;
export const WAVE = { seconds: 1.6, reach: 26 };
/** A kart as the crowd sees it: where it is, how far round it's got (s along the course, laps included), its lap */
export interface Seen {
  x: number;
  z: number;
  s: number;
  progress: number;
  lap: number;
  speed: number;
}

/** Does a fan at x, z cheer: a kart near, you just overtook near them (wave: seconds left, where you were), or the ceremony */
export function excited(x: number, z: number, karts: readonly Seen[], wave: { t: number; x: number; z: number } | null, ceremony: boolean) {
  if (ceremony) return true;
  if (wave && wave.t > 0 && Math.hypot(wave.x - x, wave.z - z) < WAVE.reach) return true;
  for (const k of karts) if (Math.abs(k.speed) > 2 && Math.hypot(k.x - x, k.z - z) < FAN_REACH) return true;
  return false;
}

/* ---------- The marshals ---------- */

export type Flag = 'none' | 'green' | 'yellow' | 'blue' | 'chequered';
/** Green for this long after the start; yellow for this long after a spin, at posts this far up the track from it */
export const GREEN_SECONDS = 4;
export const YELLOW = { seconds: 4, ahead: 40, behind: 4 };
/** Blue when a kart a lap down has a faster one this close behind it */
export const BLUE_GAP = 6;
/** Each marshal post's place round the circuit (s on the forward circuit) */
export const MARSHAL_S: number[] = MARSHALS.map((m) => locate(CIRCUIT, m.x, m.z, null).s);

/**
 * The flag each marshal post shows: `since` the race's seconds since the start (negative before), the spins and
 * put-backs with when they were (s on the course raced, the race's seconds), the karts, the laps, the course
 * (for which way round "up the track" is)
 */
export function marshalFlags(c: Course, since: number, karts: readonly Seen[], spins: readonly { s: number; at: number }[], laps: number, leaderLap: number): Flag[] {
  const L = c.L;
  // Up the track from a point: how far along the course raced (its own s runs the way it's raced)
  const ahead = (from: number, to: number) => ((to - from) % L + L) % L;
  // Each post's s on the course raced
  const posts = MARSHAL_S.map((s) => (c.reverse ? locate(c, frame(CIRCUIT, s).x, frame(CIRCUIT, s).z, null).s : s));
  const lineS = c.start;
  let nearLine = 0;
  for (let i = 1; i < posts.length; i++) if (Math.min(ahead(posts[i], lineS), ahead(lineS, posts[i])) < Math.min(ahead(posts[nearLine], lineS), ahead(lineS, posts[nearLine]))) nearLine = i;
  return posts.map((ps, i) => {
    if (since < 0) return 'none';
    if (i === nearLine && leaderLap >= laps - 1) return 'chequered';
    for (const sp of spins) if (since - sp.at < YELLOW.seconds && (ahead(sp.s, ps) < YELLOW.ahead || ahead(ps, sp.s) < YELLOW.behind)) return 'yellow';
    // A kart a lap down near this post with a faster kart closing on it from a lap up
    for (const a of karts)
      for (const b of karts)
        if (b !== a && b.progress - a.progress > L * 0.5 && Math.abs(along(c, a.s, b.s)) < BLUE_GAP && b.speed > a.speed && Math.min(ahead(a.s, ps), ahead(ps, a.s)) < 15) return 'blue';
    if (since < GREEN_SECONDS) return 'green';
    return 'none';
  });
}

/* ---------- The podium ceremony ---------- */

/** How long the ceremony runs (seconds), and its beats: the karts on the steps, the trophy up, the confetti */
export const CEREMONY = { seconds: 8, trophy: 1.6, confetti: 2.2, settle: 7 };
/** Where a place's kart stands on the podium (world, its top's height) facing the plaza (yaw: kart.ts's, +x forward) */
export function podiumSpot(place: 1 | 2 | 3) {
  const st = PODIUM.steps.find((s) => s.place === place)!;
  const [x, z] = toWorld([(st.u0 + st.u1) / 2, (PODIUM.v0 + PODIUM.v1) / 2]);
  // (facing +z, south over the plaza: kart.ts's yaw with +x forward and z = -sin yaw)
  return { x, z, y: st.h, yaw: -Math.PI / 2 };
}
/** The ceremony's beat at t seconds: how far the trophy's come up (0..1), whether the confetti's flying, its end */
export function ceremonyAt(t: number) {
  const trophy = Math.max(0, Math.min(1, (t - CEREMONY.trophy) / 0.8));
  return { trophy, confetti: t >= CEREMONY.confetti, done: t >= CEREMONY.seconds };
}
/**
 * The ceremony's camera at t seconds: from the plaza in front, in on the winner, then up and back over the podium
 * (eye and target, world); still at its first frame under reduced motion
 */
export function ceremonyCam(t: number, reduced: boolean): { eye: [number, number, number]; at: [number, number, number] } {
  const w = podiumSpot(1);
  const keys: [number, [number, number, number], [number, number, number]][] = [
    [0, [w.x - 1.2, 2.4, w.z + 9.5], [w.x, 1.4, w.z]],
    [3, [w.x + 0.6, 1.9, w.z + 4.2], [w.x, 1.6, w.z]],
    [CEREMONY.seconds, [w.x + 3.5, 4.8, w.z + 10.5], [w.x, 1.8, w.z - 0.5]],
  ];
  const u = reduced ? 0 : Math.max(0, Math.min(CEREMONY.seconds, t));
  let k = 1;
  while (k < keys.length - 1 && u > keys[k][0]) k++;
  const [t0, e0, a0] = keys[k - 1];
  const [t1, e1, a1] = keys[k];
  const f = Math.max(0, Math.min(1, (u - t0) / (t1 - t0)));
  const e = f * f * (3 - 2 * f);
  const mix = (p: [number, number, number], q: [number, number, number]): [number, number, number] => [p[0] + (q[0] - p[0]) * e, p[1] + (q[1] - p[1]) * e, p[2] + (q[2] - p[2]) * e];
  return { eye: mix(e0, e1), at: mix(a0, a1) };
}

/** The confetti: how many pieces, from the backdrop's two top corners, falling over the podium */
export const CONFETTI = 240;
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** A piece of confetti `t` seconds after it was fired (world): up and out from a cannon, then fluttering down; null once it's down */
export function confettiAt(i: number, t: number): [number, number, number] | null {
  if (t < 0) return null;
  const [cx0] = toWorld([PODIUM_RECT.u0, 0]);
  const [cx1] = toWorld([PODIUM_RECT.u1, 0]);
  const [, cz] = toWorld([0, PODIUM.back.v1]);
  const side = i % 2 ? 1 : -1;
  const ox = side > 0 ? cx1 : cx0;
  const oy = PODIUM.back.h;
  // Fired up and in over the steps and out towards the plaza, each its own way
  const vx = -side * (1.2 + hash(i) * 2.4);
  const vz = 0.8 + hash(i + 0.5) * 2.6;
  const vy = 3 + hash(i + 0.25) * 3;
  const drag = 1.4;
  const k = (1 - Math.exp(-drag * t)) / drag;
  const fall = 0.55 + hash(i + 0.75) * 0.35;
  const y = oy + vy * k - fall * Math.max(0, t - k) * 1.4;
  if (y < 0.02) return null;
  const flutter = Math.sin(t * (5 + hash(i + 0.1) * 4) + i) * 0.18;
  return [ox + vx * k + flutter, y, cz + vz * k + Math.cos(t * 4 + i) * 0.12];
}
/** The confetti's colours, a piece's */
export const CONFETTI_COLOURS = ['#ffd23f', '#e219e5', '#2aabee', '#1fbf6b', '#f3f2f7', '#ff8a3d'];
export const confettiColour = (i: number) => CONFETTI_COLOURS[Math.floor(hash(i + 0.9) * CONFETTI_COLOURS.length) % CONFETTI_COLOURS.length];
