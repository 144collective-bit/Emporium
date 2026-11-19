/**
 * What's laid on Crestmont's hills, as a mesh that sits on the grass as it's drawn (the owner's call, 2026-11-19: the
 * grass came up through the drives in stripes). DOM-free: the drawing turns these into geometry (mansions3d.ts,
 * crestgardens3d.ts, crestsites3d.ts), tests/crestdrape.test.ts holds every one of them over the grass.
 *
 * The hills' grass is drawn on a grid (terrain.ts `hillLines()`, a line every tile or two), each square two flat
 * triangles; a drive drawn two points wide, or a green a disc of a middle and a rim, spans many of them, and where the
 * grass bends up between its points it shows through. So every drape here is dense (a point every `STEP` along and
 * across), each point at the grass as drawn (`drawnAt()`) and a little over it (`lift`), and `poke()` measures how far
 * the grass rises over it anywhere inside, which the test holds under the lift.
 */
import { drawnAt } from './terrain';

type Pt = [number, number];
/** A mesh: its points (x, y, z, ...) and its triangles (three indices each), wound to face up */
export interface Mesh {
  pos: number[];
  idx: number[];
}
/** How far over the grass each drape is laid, and a drive's half width (its kerbs stand just past it) */
export const DRAPE = { drive: { half: 1.2, lift: 0.06 }, path: 0.045, bed: 0.06, fairway: 0.1, tee: 0.12, fringe: 0.12, green: 0.14, bunker: 0.13 } as const;
/** The overlook's path up from Ridge Road: its half width and lift */
export const OVERLOOK_PATH = { half: 1.1, lift: 0.08 } as const;
/** The hill roads' asphalt over the higher of its bed and the grass as drawn (crestmont3d.ts `ON`) */
export const ROAD_LIFT = 0.05;
/** How far apart a drape's points are, along and across */
export const STEP = 0.5;

/** A grid's triangles: rows of `cols` points, each square split from its first corner to its third, wound up */
function grid(pos: number[], rows: number, cols: number): Mesh {
  const idx: number[] = [];
  for (let j = 0; j + 1 < rows; j++)
    for (let i = 0; i + 1 < cols; i++) {
      const a = j * cols + i;
      const [b, c, d] = [a + 1, a + cols + 1, a + cols];
      idx.push(...up(pos, a, b, c), ...up(pos, a, c, d));
    }
  return { pos, idx };
}
/** A triangle wound to face up (its normal's y over 0) */
function up(pos: number[], a: number, b: number, c: number): [number, number, number] {
  const [ax, az, bx, bz, cx, cz] = [pos[a * 3], pos[a * 3 + 2], pos[b * 3], pos[b * 3 + 2], pos[c * 3], pos[c * 3 + 2]];
  // (y of (b - a) x (c - a) is (bz - az)(cx - ax) - (bx - ax)(cz - az): over 0 faces up)
  return (bz - az) * (cx - ax) - (bx - ax) * (cz - az) >= 0 ? [a, b, c] : [a, c, b];
}

/** A line resampled every `step` along it (its ends kept) */
export function resample(line: Pt[], step: number): Pt[] {
  const out: Pt[] = [line[0]];
  for (let k = 1; k < line.length; k++) {
    const [a, b] = [line[k - 1], line[k]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / step));
    for (let i = 1; i <= n; i++) out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  }
  return out;
}

/** A strip along a line, `half` either side, on the grass and `lift` over it */
export function lineMesh(line: Pt[], half: number, lift: number): Mesh {
  const pts = resample(line, STEP);
  const n = Math.max(2, Math.ceil((2 * half) / STEP)) + 1;
  const pos: number[] = [];
  pts.forEach((p, k) => {
    const [a, b] = [pts[Math.max(0, k - 1)], pts[Math.min(pts.length - 1, k + 1)]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const [nx, nz] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    for (let i = 0; i < n; i++) {
      const s = -half + (2 * half * i) / (n - 1);
      const [x, z] = [p[0] + nx * s, p[1] + nz * s];
      pos.push(x, drawnAt(x, z) + lift, z);
    }
  });
  return grid(pos, pts.length, n);
}

/** A disc (or an ellipse, `rx` by `rz`) on the grass: rings every `STEP` out from its middle */
export function discMesh(x: number, z: number, rx: number, rz: number, lift: number): Mesh {
  const rings = Math.max(2, Math.ceil(Math.max(rx, rz) / STEP));
  const seg = Math.max(12, Math.ceil((2 * Math.PI * Math.max(rx, rz)) / STEP));
  const pos: number[] = [];
  for (let j = 0; j <= rings; j++)
    for (let i = 0; i <= seg; i++) {
      const [f, a] = [j / rings, (i / seg) * Math.PI * 2];
      const [px, pz] = [x + Math.cos(a) * rx * f, z + Math.sin(a) * rz * f];
      pos.push(px, drawnAt(px, pz) + lift, pz);
    }
  return grid(pos, rings + 1, seg + 1);
}

/** A strip between two lines of points (a bank's bed: each spoke's inner and outer ends), filled in `STEP` apart across */
export function bandMesh(inner0: Pt[], outer0: Pt[], lift: number): Mesh {
  // (rows filled in between the spokes too, `STEP` apart along the band at its wider side)
  const inner: Pt[] = [inner0[0]];
  const outer: Pt[] = [outer0[0]];
  for (let k = 1; k < inner0.length; k++) {
    const gap = Math.max(Math.hypot(inner0[k][0] - inner0[k - 1][0], inner0[k][1] - inner0[k - 1][1]), Math.hypot(outer0[k][0] - outer0[k - 1][0], outer0[k][1] - outer0[k - 1][1]));
    const n = Math.max(1, Math.ceil(gap / STEP));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      inner.push([inner0[k - 1][0] + (inner0[k][0] - inner0[k - 1][0]) * t, inner0[k - 1][1] + (inner0[k][1] - inner0[k - 1][1]) * t]);
      outer.push([outer0[k - 1][0] + (outer0[k][0] - outer0[k - 1][0]) * t, outer0[k - 1][1] + (outer0[k][1] - outer0[k - 1][1]) * t]);
    }
  }
  const w = Math.max(...inner.map((p, k) => Math.hypot(outer[k][0] - p[0], outer[k][1] - p[1])));
  const n = Math.max(2, Math.ceil(w / STEP)) + 1;
  const pos: number[] = [];
  inner.forEach((p, k) => {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const [x, z] = [p[0] + (outer[k][0] - p[0]) * t, p[1] + (outer[k][1] - p[1]) * t];
      pos.push(x, drawnAt(x, z) + lift, z);
    }
  });
  return grid(pos, inner.length, n);
}

/** How far the grass rises over a mesh anywhere inside it (looked at across each triangle), or how far under if never */
export function poke(m: Mesh, per = 3): number {
  let worst = -Infinity;
  for (let t = 0; t < m.idx.length; t += 3) {
    const [a, b, c] = [m.idx[t] * 3, m.idx[t + 1] * 3, m.idx[t + 2] * 3];
    for (let i = 0; i <= per; i++)
      for (let j = 0; i + j <= per; j++) {
        const [u, v] = [i / per, j / per];
        const w = 1 - u - v;
        const x = m.pos[a] * w + m.pos[b] * u + m.pos[c] * v;
        const y = m.pos[a + 1] * w + m.pos[b + 1] * u + m.pos[c + 1] * v;
        const z = m.pos[a + 2] * w + m.pos[b + 2] * u + m.pos[c + 2] * v;
        worst = Math.max(worst, drawnAt(x, z) - y);
      }
  }
  return worst;
}
