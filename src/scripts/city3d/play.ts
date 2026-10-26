/*
 * Kids at play (the animation revamp's Phase 6, step 4), DOM-free and
 * tested in tests/play.test.ts: everyone a function of the time, as the
 * park's people are (parklife.ts `ParkPerson`), so life.ts moves them with
 * the crowd it already has.
 *
 * - On every basketball half-court in The Trenches (commons.ts
 *   `AMENITIES`): kids running a loop round the inside of the court (the
 *   jog row at a kid's size, `KID`) and one at the free-throw spot taking
 *   set shots at the hoop (the `shoot` row).
 * - In the soccer cage: kids running a loop round the turf, a keeper
 *   standing in each goalmouth.
 * - On The Block's court (projects.ts `THE_BLOCK`): grown-ups' two on two,
 *   two running the loop, one shooting at the north hoop, one waiting.
 * - On the swings (the playgrounds' and The Block's): a kid on a seat,
 *   legs pumping (the `swing` row; the seat itself stays put).
 * Loops are rounded rectangles inset from the court (`loopOf()`); nothing
 * here is solid, and the courts' fences keep the runners off the lawns.
 */
import { AMENITIES, type Amenity } from './commons';
import { THE_BLOCK } from './projects';
import type { Moment, ParkPerson } from './parklife';
import type { Pt, Rect } from './downtown';

/** The lawn's top (world.ts's SLAB: that file draws, so it can't be imported here) */
const SLAB = 0.15;
/** A kid's size against a grown-up's (the crowd's scale is life.ts's) */
export const KID = 0.44;
/** Paces (tiles a second): a kid's run, a grown-up's on the court */
export const KID_RUN = 1.15;
export const RUN = 1.6;
/** How far inside a court or cage its loop runs, and the loop's corner radius */
export const LOOP_IN = 1.3;
const CORNER = 1.1;

/** An amenity's frame (as commons3d's): u along its long side, v across, from its first corner */
export function frameOf(a: Amenity) {
  const [x0, z0, x1, z1] = a.rect;
  const L = a.turned ? z1 - z0 : x1 - x0;
  const D = a.turned ? x1 - x0 : z1 - z0;
  const at = (u: number, v: number): Pt => (a.turned ? [x0 + v, z0 + u] : [x0 + u, z0 + v]);
  /** The facing (ry: 0 is +z) of a direction (du, dv) in the frame */
  const face = (du: number, dv: number) => (a.turned ? Math.atan2(dv, du) : Math.atan2(du, dv));
  return { L, D, at, face };
}

export interface Loop {
  len: number;
  /** The point `s` along it (wrapping), and the way it heads there */
  at(s: number): { x: number; z: number; dx: number; dz: number };
}
/** A closed loop round the inside of `rect`, `inset` in from its edges with rounded corners, run clockwise seen from above (+x then +z) */
export function loopOf(rect: Rect, inset: number): Loop {
  const [x0, z0, x1, z1] = [rect[0] + inset, rect[1] + inset, rect[2] - inset, rect[3] - inset];
  const r = Math.min(CORNER, (x1 - x0) / 2, (z1 - z0) / 2);
  // Sampled: the straights and quarter circles as a polyline
  const pts: Pt[] = [];
  const corner = (cx: number, cz: number, a0: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  };
  corner(x1 - r, z0 + r, -Math.PI / 2);
  corner(x1 - r, z1 - r, 0);
  corner(x0 + r, z1 - r, Math.PI / 2);
  corner(x0 + r, z0 + r, Math.PI);
  pts.push(pts[0]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  return {
    len,
    at(s) {
      let d = ((s % len) + len) % len;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const seg = cum[i] - cum[i - 1] || 1e-6;
      const k = (d - cum[i - 1]) / seg;
      const [a, b] = [pts[i - 1], pts[i]];
      return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, dx: (b[0] - a[0]) / seg, dz: (b[1] - a[1]) / seg };
    },
  };
}

/** Someone running a loop: `phase` of the way round at t = 0, at `pace` */
function runner(id: string, loop: Loop, phase: number, pace: number, scale: number | undefined, trim: boolean): ParkPerson {
  return {
    id,
    trim,
    scale,
    at(t: number, out: Moment) {
      const p = loop.at(phase * loop.len + t * pace);
      out.x = p.x;
      out.z = p.z;
      out.ry = Math.atan2(p.dx, p.dz);
      out.y = SLAB;
      out.clip = 'jog';
      out.speed = pace;
      return out;
    },
  };
}
/** Someone standing (or sitting, `y` the seat) in one spot playing `clip` */
function still(id: string, x: number, z: number, ry: number, clip: Moment['clip'], scale: number | undefined, trim = false, y = SLAB): ParkPerson {
  return {
    id,
    trim,
    scale,
    at(_t: number, out: Moment) {
      out.x = x;
      out.z = z;
      out.ry = ry;
      out.y = y;
      out.clip = clip;
      out.speed = 0;
      return out;
    },
  };
}

/** The half-court's hoop end, as commons3d draws it: the far end from the gate; `dir` points from the hoop into the court */
export function hoopOf(a: Amenity) {
  const f = frameOf(a);
  const hoopAtEnd = a.turned ? a.opens === 'n' || a.opens === 'w' : a.opens === 'w' || a.opens === 'n';
  return { hu: hoopAtEnd ? f.L - 0.9 : 0.9, dir: hoopAtEnd ? -1 : 1 };
}
/** Where the swings' seats are on a playground (commons3d: two seats under a bar across the far end) and which way a kid on one faces (along the swing) */
export function swingsOf(a: Amenity) {
  const f = frameOf(a);
  const [wu, wv] = [f.L - 2.2, f.D / 2];
  return [-0.55, 0.55].map((d) => ({ at: f.at(wu + d, wv), ry: f.face(0, 1), y: SLAB + 0.5 }));
}

export const PLAY_PEOPLE: ParkPerson[] = (() => {
  const out: ParkPerson[] = [];
  for (const a of AMENITIES) {
    const f = frameOf(a);
    if (a.kind === 'halfcourt') {
      const loop = loopOf(a.rect, LOOP_IN);
      out.push(runner(`${a.id}-run-0`, loop, 0, KID_RUN, KID, false), runner(`${a.id}-run-1`, loop, 0.5, KID_RUN, KID, true));
      const { hu, dir } = hoopOf(a);
      const [x, z] = f.at(hu + dir * 3.2, f.D / 2);
      out.push(still(`${a.id}-shoot`, x, z, f.face(-dir, 0), 'shoot', KID));
    } else if (a.kind === 'soccer') {
      const loop = loopOf(a.rect, LOOP_IN);
      for (let k = 0; k < 3; k++) out.push(runner(`${a.id}-run-${k}`, loop, k / 3, KID_RUN, KID, k === 2));
      for (const [k, u] of [1.0, f.L - 1.0].entries()) {
        const [x, z] = f.at(u, f.D / 2);
        out.push(still(`${a.id}-keeper-${k}`, x, z, f.face(k === 0 ? 1 : -1, 0), 'look', KID));
      }
    } else if (a.kind === 'playground') {
      swingsOf(a).forEach((s, k) => out.push(still(`${a.id}-swing-${k}`, s.at[0], s.at[1], s.ry, 'swing', KID, k === 1, s.y)));
    }
  }
  // The Block: two on two on its court (grown-ups, the crowd's own size: `scale` left to life.ts), a kid on each swing
  const [c0, cz0, c1, cz1] = THE_BLOCK.court;
  const loop = loopOf(THE_BLOCK.court, 1.4);
  const cx = (c0 + c1) / 2;
  out.push(runner('block-run-0', loop, 0, RUN, undefined, false), runner('block-run-1', loop, 0.5, RUN, undefined, true));
  out.push(still('block-shoot', cx, cz0 + 4.2, Math.PI, 'shoot', undefined), still('block-wait', cx + 2.4, cz1 - 3.2, Math.PI + 0.6, 'look', undefined));
  const [, pz0, p1] = THE_BLOCK.playground;
  const [sx, sz] = [p1 - 2.6, pz0 + 2.6];
  [-0.6, 0.6].forEach((d, k) => out.push(still(`block-swing-${k}`, sx + d, sz, 0, 'swing', KID, k === 1, SLAB + 0.56)));
  return out;
})();
