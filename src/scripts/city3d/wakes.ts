/*
 * The boats' wakes (docs/water-plan.md, step 3): which boats leave one and how. DOM-free, tested in
 * tests/wakes.test.ts; drawn in the water's own shader (world.ts `wakeFoam()`), so a wake costs no draw.
 *
 * - **Every drawing hands over its boats** (`setWakes()`), as with the lights in the water: the traffic's boats and
 *   the moored ones (life.ts), the river's own (riverlife3d.ts: the cruise boat, the rowing eight, the dinghies, the
 *   river buses), the tall ship (libertybridge.ts), your hire boat (boat.ts) and the lake's rowing boats and swans
 *   (parklife3d.ts), only while it's drawing them.
 * - **The nearest go to the shader** (`nearestWakes()`): at most `WAKES.most` (`WAKES.phones` on phones), none past
 *   `WAKES.far` from the camera.
 * - **What a wake is** (the shader's, from these numbers): a V of foam lines behind the stern at the Kelvin angle
 *   (`KELVIN`), trailing `trailOf()` behind it, and the churned water down its middle, both broken up further back; the
 *   bow wave peeling off along the hull's sides; and a stopped boat, rings spreading out round it (`REST`).
 * - **Speeds** a drawing doesn't know it measures (`speedTracker()`: from where a boat was, smoothed).
 */

/** A boat on the water: where it is, which way its bow points (0 is +x, as every boat's), its speed and size */
export interface Wake {
  x: number;
  z: number;
  yaw: number;
  /** Tiles a second over the water */
  speed: number;
  len: number;
  beam: number;
}

/** How many wakes the shader draws at once, on phones, and how far from the camera */
export const WAKES = { most: 12, phones: 6, far: 120 };
/** The wake's arms open at the Kelvin angle (about 19.5°): how far out they spread for each tile behind */
export const KELVIN = Math.tan((19.47 * Math.PI) / 180);
/** Under this speed a boat is at rest: rings, no V */
export const REST = 0.35;
/** The speed at which a wake is as strong as it gets */
export const FULL = 3;

/** How far behind its stern a boat's wake trails: longer the faster and the longer it is, never past 16 */
export function trailOf(speed: number, len: number) {
  return speed < REST ? 0 : Math.min(16, len * 1.2 + speed * 2.4);
}
/** How strong it is, 0..1 */
export const strengthOf = (speed: number) => Math.min(1, Math.max(0, speed / FULL));

const lists = new Map<string, readonly Wake[]>();
/** A drawing's boats this frame (replacing what it said before; an empty list when it shows none) */
export function setWakes(owner: string, list: readonly Wake[]) {
  lists.set(owner, list);
}
/** The boats nearest x, z (at most `most`, none past `WAKES.far`), nearest first, `into` a list it fills */
export function nearestWakes(x: number, z: number, most: number, into: Wake[]) {
  into.length = 0;
  for (const list of lists.values())
    for (const w of list) {
      const d = Math.hypot(w.x - x, w.z - z);
      if (d <= WAKES.far) into.push(w);
    }
  into.sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
  if (into.length > most) into.length = most;
  return into;
}

/**
 * A boat's speed from where it is now and was before (seconds `t`), eased so a jump (a boat put back where it should
 * be) never shows; per boat `id`
 */
export function speedTracker() {
  const last = new Map<string, { x: number; z: number; t: number; v: number }>();
  return (id: string, x: number, z: number, t: number) => {
    const p = last.get(id);
    if (!p) {
      last.set(id, { x, z, t, v: 0 });
      return 0;
    }
    const dt = t - p.t;
    if (dt <= 0) return p.v;
    const raw = Math.hypot(x - p.x, z - p.z) / dt;
    // (a jump far faster than any boat goes is a boat put back: its speed stays as it was)
    if (raw < 20) p.v += (raw - p.v) * Math.min(1, dt * 4);
    p.x = x;
    p.z = z;
    p.t = t;
    return p.v;
  };
}
