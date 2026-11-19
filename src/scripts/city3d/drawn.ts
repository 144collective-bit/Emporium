/**
 * The hills' ground as their grass is drawn (world.ts `hillsPlane()`, on terrain.ts `hillLines()`): what stands on the hills
 * and wants its foot on the grass it's seen on reads this. DOM-free, and only the districts' chunks read it (Crestmont's,
 * the drapes, crestdrape.ts), so it's no weight in the boot.
 */
import { PIECE, TERRAIN_RECT, heightAt, hillLines } from './terrain';

/** Each piece's lines, worked out once */
const PIECE_LINES = new Map<number, [number[], number[]]>();
/** The last line at or before `v` in a sorted list (its index) */
function cellOf(lines: number[], v: number) {
  let lo = 0;
  let hi = lines.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid] <= v) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
/**
 * The ground's height as the hills' grass draws it (world.ts `hillsPlane()`): `heightAt()` at its grid's corners
 * (`hillLines()`), each square split from its low corner (x0, z0) to its high one (x1, z1), each triangle flat. What
 * stands on the hills and wants its foot on the grass it's seen on (crestbanks.ts) reads this.
 */
export function drawnAt(x: number, z: number) {
  if (x <= TERRAIN_RECT[0] || x >= TERRAIN_RECT[2] || z <= TERRAIN_RECT[1] || z >= TERRAIN_RECT[3]) return heightAt(x, z);
  const [p0, q0] = [Math.floor(x / PIECE) * PIECE, Math.floor(z / PIECE) * PIECE];
  const key = p0 * 7919 + q0;
  let lines = PIECE_LINES.get(key);
  if (!lines) PIECE_LINES.set(key, (lines = [hillLines(p0, p0 + PIECE, q0, q0 + PIECE, 0), hillLines(q0, q0 + PIECE, p0, p0 + PIECE, 1)]));
  const [xs, zs] = lines;
  const [i, j] = [cellOf(xs, x), cellOf(zs, z)];
  const [x0, x1, z0, z1] = [xs[i], xs[i + 1], zs[j], zs[j + 1]];
  const [fx, fz] = [(x - x0) / (x1 - x0), (z - z0) / (z1 - z0)];
  const a = heightAt(x0, z0);
  const c = heightAt(x1, z1);
  // (the triangle with the (x1, z0) corner, or the one with the (x0, z1) corner)
  if (fx >= fz) {
    const b = heightAt(x1, z0);
    return a + (b - a) * fx + (c - b) * fz;
  }
  const dd = heightAt(x0, z1);
  return a + (dd - a) * fz + (c - dd) * fx;
}

