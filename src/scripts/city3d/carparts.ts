/*
 * Parts both the fine detail (carfine.ts) and your fitted-out car
 * (carcabin.ts) use: the wheels' discs, calipers and sidewall rings, and
 * turning a shape inside out. Vehicle plan Phase 1; carfine.ts's chunk.
 */
import * as THREE from 'three';
import type { CarSpec } from './carspec';

const DISC = '#8e8aa3';
export const CALIPER = '#d22f45';
const SIDEWALL = '#3e3a4c';

/** A geometry's vertices in one colour (the cars' detail material reads them) */
export function paintAll(g: THREE.BufferGeometry, hex: string) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

/** Turn a mesh inside out: its faces and normals point the other way (seen from inside a hollow) */
export function inward(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const name of ['position', 'normal', 'uv']) {
    const a = n.attributes[name];
    if (!a) continue;
    for (let i = 0; i < a.count; i += 3) {
      // swap the second and third corners of each triangle
      for (let c = 0; c < a.itemSize; c++) {
        const t = a.array[(i + 1) * a.itemSize + c];
        a.array[(i + 1) * a.itemSize + c] = a.array[(i + 2) * a.itemSize + c];
        a.array[(i + 2) * a.itemSize + c] = t;
      }
    }
  }
  const nm = n.attributes.normal;
  for (let i = 0; i < nm.array.length; i++) nm.array[i] = -nm.array[i];
  return n;
}

/**
 * A wheel's disc, its caliper and the ring on its sidewall, in the wheel's own space (axle along z, the rim
 * facing +z): what's laid on every model's wheels, and on your car's turning ones (the caliper apart: it
 * doesn't turn)
 */
export function brakes(s: CarSpec, low: boolean, caliper = true) {
  const r = s.r;
  const h = s.tw / 2;
  const out: THREE.BufferGeometry[] = [];
  const col = (g: THREE.BufferGeometry, hex: string) => void out.push(paintAll(g, hex));
  // (5.5 mm in front of the rim's dark face, behind the spokes: never flush)
  col(new THREE.RingGeometry(r * 0.2, r * 0.5, 16).translate(0, 0, h - 0.0095), DISC);
  if (caliper) col(caliperGeometry(s), CALIPER);
  if (!low) col(new THREE.RingGeometry(r * 0.74, r * 0.79, 20).translate(0, 0, h + 0.006), SIDEWALL);
  return out;
}
/** The caliper: a block over the disc's top, towards the back */
export function caliperGeometry(s: CarSpec) {
  const r = s.r;
  return new THREE.BoxGeometry(r * 0.34, r * 0.22, 0.014)
    .translate(0, r * 0.38, 0)
    .rotateZ(0.5)
    .translate(0, 0, s.tw / 2 - 0.0125);
}

