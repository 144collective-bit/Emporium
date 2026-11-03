/*
 * Palms' shapes (a trunk bending over, a crown of fronds), shared by Crestmont's planting (landscape3d.ts) and the
 * Neon Mile's boulevard (strip3d.ts): a module of their own, so neither chunk pulls in the other.
 */
import * as THREE from 'three';

/** A trunk a unit high, its foot at the origin, bending over towards +x by `lean` at its top */
export function trunk(r0: number, r1: number, lean: number, sides: number) {
  const g = new THREE.CylinderGeometry(r1, r0, 1, sides, 6, true).translate(0, 0.5, 0);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i);
    pos.setX(i, pos.getX(i) + lean * t * t);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A crown of `n` fronds radiating from the origin, each `len` long and `w` wide, rising and then drooping by `droop`
 * (both faces wound, so a frond seen from under shows)
 */
export function crown(n: number, len: number, w: number, rise: number, droop: number, tilt = 0) {
  const pos: number[] = [];
  const SEG = 4;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + (k % 2) * 0.2;
    const [ca, sa] = [Math.cos(a), Math.sin(a)];
    // (every other frond a little higher, so the crown isn't one flat ring)
    const up = (k % 2 ? 0.12 : 0) + tilt * Math.sin(a * 3);
    const at = (t: number, side: number): number[] => {
      const r = len * t;
      const half = w * Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.5;
      const y = up + rise * t - droop * t * t;
      return [ca * r - sa * half * side, y, sa * r + ca * half * side];
    };
    for (let s = 0; s < SEG; s++) {
      const [t0, t1] = [s / SEG, (s + 1) / SEG];
      const [a0, b0, a1, b1] = [at(t0, -1), at(t0, 1), at(t1, -1), at(t1, 1)];
      for (const tri of [
        [a0, b0, b1],
        [a0, b1, a1],
      ]) {
        pos.push(...tri[0], ...tri[1], ...tri[2]);
        pos.push(...tri[0], ...tri[2], ...tri[1]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
