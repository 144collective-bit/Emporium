/*
 * The cars' fine detail (vehicle plan Phase 1): its own chunk, fetched once
 * the city is up (index.ts), so the boot doesn't carry it. `fitCars()` hands
 * cars.ts two things through its `FINE` hook:
 *
 * - `add()`: what every model takes on, the traffic's and the parked cars'
 *   too (cars.ts builds each model again with it, in place): dark wheel
 *   wells inside the arches (you saw daylight through them), the bonnet's
 *   and the boot's shut lines, a fuel flap, side repeaters, a made-up badge
 *   front and back, highlights on the glass, brake discs and calipers
 *   behind the spokes; on desktops a ring on the tyres' sidewalls, the
 *   headlamps' projectors and fog lamps in the front bumper (phones leave
 *   those out).
 * - `fit()`: your own car fitted out (carcabin.ts): see-through glass, the
 *   inside, and you at the wheel.
 */
import * as THREE from 'three';
import { FINE, build, cache, lay, pane, topAt, wheelSpots, type Car, type Parts } from './cars';
import type { CarSpec } from './carspec';
import { fitOut } from './carcabin';
import { brakes, inward } from './carparts';

type V2 = [number, number];
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

// (cars.ts's seams and chrome: kept here so the boot's chunk exports two names fewer)
const SEAM = '#1b1830';
const CHROME = '#dcdaf0';
const WELL = '#121019';
const STREAK = '#c9f2ff';
const LENS = '#f6f9ff';
const FUEL = '#26232f';

/** What every model takes on (the traffic's and the parked cars' too) */
function add(p: Parts, s: CarSpec, wheels: boolean, low: boolean) {
  const half = s.L / 2;
  const [rb, , fr, fb] = s.cabin;
  const cw = s.W * s.cabinW;
  const bus = s.id === 'bus';

  // The wheel wells: a dark liner round the inside of each arch and a dark wall behind the tyre, so the arch
  // is dark inside instead of open to the other side
  const arch = s.r + 0.04;
  const deep = Math.min(0.32, s.W / 2 - 0.02);
  for (const ax of s.axles)
    for (const side of [-1, 1]) {
      const z = side * (s.W / 2 - deep / 2 - 0.01);
      p.detail(inward(new THREE.CylinderGeometry(arch - 0.006, arch - 0.006, deep, 8, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(ax, s.r, z)), WELL);
      p.detail(box(arch * 2 - 0.01, arch + s.r - s.clr, 0.01, ax, (s.clr + s.r + arch) / 2 - 0.004, side * (s.W / 2 - deep - 0.012)), WELL);
    }

  if (!bus) {
    // The bonnet: its shut line across in front of the windscreen and down both sides to the nose
    const bx0 = fb[0] + 0.07;
    const bonnet = s.top.filter(([x]) => x > bx0 && x < half - 0.04);
    if (half - bx0 > 0.25) {
      const pts: V2[] = [[half - 0.05, topAt(s, half - 0.05)], ...bonnet, [bx0, topAt(s, bx0)]];
      for (const side of [-1, 1]) lay(p, pts, side * (s.W / 2 - 0.075), 0.012, SEAM, 0.004);
      p.detail(box(0.012, 0.012, s.W - 0.15, bx0, topAt(s, bx0) + 0.004, 0), SEAM);
    }
    // The boot lid's, behind the rear window (a saloon's), or the tailgate's across the back over the bumper
    const tx0 = rb[0] - 0.05;
    if (tx0 + half > 0.25) {
      const pts: V2[] = [[tx0, topAt(s, tx0)], ...s.top.filter(([x]) => x < tx0 && x > -half + 0.04), [-half + 0.05, topAt(s, -half + 0.05)]];
      for (const side of [-1, 1]) lay(p, pts, side * (s.W / 2 - 0.075), 0.012, SEAM, 0.004);
      p.detail(box(0.012, 0.012, s.W - 0.15, tx0, topAt(s, tx0) + 0.004, 0), SEAM);
    }
    p.detail(box(0.012, 0.012, s.W * 0.8, -half - 0.003, s.clr + 0.2, 0), SEAM);
    // The fuel flap on the left rear quarter: a painted square in a seam
    const fx = s.axles[0] + Math.min(0.3, (fb[0] - s.axles[0]) * 0.4);
    const fy = topAt(s, fx) - 0.1;
    p.detail(box(0.08, 0.08, 0.008, fx, fy, -s.W / 2 - 0.002), FUEL);
    p.paint(box(0.064, 0.064, 0.008, fx, fy, -s.W / 2 - 0.008));
    // A shoulder crease down each side under the window line, and a lip round each wheel arch (a thin dark arc
    // just proud of the side)
    const crease = s.top.filter(([x]) => x < half - 0.12 && x > -half + 0.12).map(([x, y]): V2 => [x, y - 0.11]);
    for (const side of [-1, 1]) {
      for (let i = 1; i < crease.length; i++) {
        const [ax, ay] = crease[i - 1];
        const [bx, by] = crease[i];
        const len = Math.hypot(bx - ax, by - ay);
        if (len > 0.05) p.detail(new THREE.BoxGeometry(len, 0.012, 0.006).rotateZ(Math.atan2(by - ay, bx - ax)).translate((ax + bx) / 2, (ay + by) / 2, side * (s.W / 2 + 0.004)), SEAM);
      }
      for (const ax of s.axles) {
        // (the left's drawn at -x and turned round, so it faces out of its side too)
        const cx = side * ax;
        const lip = new THREE.Shape();
        lip.absarc(cx, s.r, arch + 0.022, Math.PI, 0, true);
        lip.lineTo(cx + arch, s.r);
        lip.absarc(cx, s.r, arch, 0, Math.PI, false);
        const g = new THREE.ShapeGeometry(lip, 6);
        if (side < 0) g.rotateY(Math.PI);
        p.detail(g.translate(0, 0, side * (s.W / 2 + 0.006)), SEAM);
      }
    }
    // Side repeaters on the front wings, behind the arches
    const rx = s.axles[1] - arch - 0.07;
    for (const side of [-1, 1]) p.detail(box(0.05, 0.02, 0.01, rx, s.r * 2 + 0.07, side * (s.W / 2 + 0.006)), '#ffad33');
  }

  // A made-up badge (the city's diamond) on the nose and the tail
  const badgeY = Math.max(s.lightY, s.clr + 0.28);
  for (const end of [-1, 1])
    p.detail(new THREE.BoxGeometry(0.012, 0.04, 0.04).rotateX(Math.PI / 4).translate(end * (half + (end > 0 ? 0.03 : 0.012)), badgeY + (end > 0 ? -0.04 : 0.05), 0), CHROME);

  // Highlights on the glass: two pale bars up the windscreen
  const [, rr] = s.cabin;
  const mid: V2 = [(rb[0] + fb[0] + rr[0] + fr[0]) / 4, (rb[1] + fb[1] + rr[1] + fr[1]) / 4];
  if (!bus) for (const [z, w] of [[cw * 0.16, 0.07], [cw * 0.29, 0.03]] as const) p.detail(pane(fr, fb, w, mid, 0.1, 0.035).translate(0, 0, z), STREAK);

  // The headlamps' projectors and fog lamps low in the front bumper (desktops)
  const lz = s.W / 2 - Math.min(0.17, s.W * 0.16);
  if (!low) {
    for (const z of [lz, -lz]) {
      p.detail(new THREE.CircleGeometry(0.026, 8).rotateY(Math.PI / 2).translate(half + 0.024, s.lightY, z + Math.sign(z) * 0.03), LENS);
      if (!bus) p.detail(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8).rotateZ(Math.PI / 2).translate(half + 0.07, s.clr + 0.06, Math.sign(z) * s.W * 0.34), '#fff1c4');
    }
  }

  // Brake discs and calipers behind the spokes, and a ring on each tyre's sidewall (your own car's wheels turn:
  // theirs are fitted to the wheels themselves, carcabin.ts)
  if (wheels) for (const [x, y, z] of wheelSpots(s)) p.details.push(...brakes(s, low).map((g) => g.clone().applyMatrix4(spin(x, y, z))));
}
const spin = (x: number, y: number, z: number) => new THREE.Matrix4().makeRotationY(z < 0 ? Math.PI : 0).setPosition(x, y, z);

/**
 * Hand the cars their fine detail (index.ts, once the city is up): every model built again with it, in place; your
 * cars in the scene fitted out. `compile` readies a fitted car's shaders, `sky` draws the fixed shadows again (the
 * parked cars')
 */
export function fitCars(low: boolean, compile: (o: THREE.Object3D) => unknown, sky: { invalidateShadows(): void }, scene: THREE.Object3D) {
  const o = { low, ready: (obj: THREE.Object3D) => void compile(obj) };
  FINE.add = (p, s, wheels) => add(p, s, wheels, low);
  FINE.fit = (car) => fitOut(car, o);
  for (const [key, g] of cache) {
    const n = build(g.spec.id, key.endsWith('true'));
    for (const k of ['paint', 'detail', 'glow'] as const) {
      // (disposed first: the renderer lets the old buffers go, then uploads the new ones on the next draw)
      g[k]?.dispose();
      g[k]?.copy(n[k]!);
    }
  }
  // Your cars already made (the garage's turntable's)
  scene.traverse((g) => void (g.userData.car && fitOut(g.userData.car as Car, o)));
  sky.invalidateShadows();
}
