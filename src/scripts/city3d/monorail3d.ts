/*
 * The Neon Mile's monorail drawn (docs/strip-plan.md Phase 4; the data and the timetable are monorail.ts), in the
 * Strip's chunk (strip3d.ts's `register()`). Sites: the beam in pieces (pale concrete, an amber neon edge each side),
 * the T-shaped pillars in the avenue's median, each station (its platform over the westbound lanes with a glass
 * rail, a white canopy with the station's name both ways, the glazed skybridge to its lift tower, the tower with
 * MONORAIL over its door). On the main thread the train: three white cars straddling the beam, an amber stripe and a
 * lit band of windows, rounded noses at both ends, placed every frame from `MONO_VIEW` (a ride's hold, or the
 * timetable `monoAt()`); still at a station under reduced motion.
 */
import * as THREE from 'three';
import { Batch, lit, moving, siteMat, toon } from './kit';
import { site } from './tilework';
import { SLAB, type Tick } from './world';
import { beam, box, neonOf, sign } from './resorts3d';
import { FLOOR, MONO, MONO_PILLARS, MONO_STATIONS, MONO_TRAIN, MONO_VIEW, PILLAR, TRAIN_LEN, monoAt, type MonoStation } from './monorail';

type Pt = [number, number];

const CONCRETE = toon('#cfccd6');
const CONCRETE_DARK = toon('#9e9aa8');
const WHITE = toon('#f3f2f7');
const STEEL = toon('#3a3846');
const AMBER = '#ffb21e';
const GLASS = siteMat('mono-glass', lit(toon('#2b3a52', { emissive: '#ffe2a8' }), 0.05, 0.75));
const RAIL = siteMat('mono-rail', new THREE.MeshBasicMaterial({ color: '#bfe2ff', transparent: true, opacity: 0.35, depthWrite: false }));
const PIECE = 24;

/** Station names on the atlas */
const NAMES: Record<string, string> = { link: 'DOWNTOWN LINK', west: 'NEON MILE WEST', central: 'NEON MILE CENTRAL', east: 'THE SPHERE · MONORAIL' };

function beamPiece(b: Batch, x0: number, x1: number) {
  const { z, y0, y1, w } = MONO;
  box(b, x0, SLAB + y0, z - w / 2, x1, SLAB + y1, z + w / 2, CONCRETE);
  // (an amber neon edge along each side, just under its top)
  for (const s of [-1, 1]) beam(b, [x0, SLAB + y1 - 0.12, z + s * (w / 2 + 0.02)], [x1, SLAB + y1 - 0.12, z + s * (w / 2 + 0.02)], 0.05, neonOf(AMBER));
}
function pillar(b: Batch, [x, z]: Pt) {
  const { y0 } = MONO;
  box(b, x - PILLAR.w / 2, SLAB, z - PILLAR.w / 2, x + PILLAR.w / 2, SLAB + y0 - 0.5, z + PILLAR.w / 2, CONCRETE_DARK);
  // The head: wider across the beam, tapering into the column
  box(b, x - 0.35, SLAB + y0 - 0.5, z - PILLAR.head / 2, x + 0.35, SLAB + y0, z + PILLAR.head / 2, CONCRETE_DARK);
}
function station(b: Batch, s: MonoStation, low: boolean) {
  const [x0, z0, x1, z1] = s.platform;
  const y = SLAB + FLOOR;
  // The platform: a deck at the cars' floor, its edge by the beam
  box(b, x0, y - 0.3, z0, x1, y - 0.01, z1, CONCRETE);
  box(b, x0, y - 0.01, z1 - 0.25, x1, y, z1, toon('#ffd23a'));
  // Its glass rail along the far side and the ends
  for (const [a, c] of [
    [
      [x0, z0],
      [x1, z0],
    ],
    [
      [x0, z0],
      [x0, z1 - 0.3],
    ],
    [
      [x1, z0],
      [x1, z1 - 0.3],
    ],
  ] as [Pt, Pt][]) {
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const g = new THREE.PlaneGeometry(len, 1).rotateY(a[1] === c[1] ? 0 : Math.PI / 2).translate((a[0] + c[0]) / 2, y + 0.5, (a[1] + c[1]) / 2);
    b.add(g, RAIL);
    beam(b, [a[0], y + 1.02, a[1]], [c[0], y + 1.02, c[1]], 0.06, STEEL);
  }
  // The canopy over the platform and the train: a white roof on slim posts, amber along its edges, the name both ways
  const roofY = y + 2.7;
  box(b, x0 - 0.2, roofY, z0 - 0.3, x1 + 0.2, roofY + 0.25, MONO.z + MONO.w / 2 + 1.1, WHITE);
  for (const zz of [z0 - 0.32, MONO.z + MONO.w / 2 + 1.12]) beam(b, [x0 - 0.22, roofY + 0.12, zz], [x1 + 0.22, roofY + 0.12, zz], 0.06, neonOf(AMBER));
  for (const x of [x0 + 0.4, (x0 + x1) / 2, x1 - 0.4]) box(b, x - 0.08, y, z0 + 0.1, x + 0.08, roofY, z0 + 0.26, STEEL);
  // The name on a thin board standing along each long edge of the roof, both ways
  const cx = (x0 + x1) / 2;
  for (const n of [-1, 1] as const) {
    const ze = n < 0 ? z0 - 0.3 : MONO.z + MONO.w / 2 + 1.1;
    box(b, cx - 3.6, roofY + 0.25, ze - 0.03, cx + 3.6, roofY + 0.95, ze + 0.03, STEEL);
    sign(b, NAMES[s.id], cx, roofY + 0.6, ze + n * 0.03, [0, n], 7, 0.62, 0.012);
  }
  // The skybridge from the tower to the platform: a deck, glass sides, a roof
  const [bx0, bz0, bx1, bz1] = s.bridge;
  box(b, bx0, y - 0.3, bz0, bx1, y, bz1, CONCRETE);
  for (const x of [bx0, bx1]) {
    const g = new THREE.PlaneGeometry(bz1 - bz0, 2.2).rotateY(Math.PI / 2).translate(x, y + 1.1, (bz0 + bz1) / 2);
    b.add(g, GLASS);
  }
  box(b, bx0 - 0.1, y + 2.2, bz0, bx1 + 0.1, y + 2.4, bz1, WHITE);
  // The lift tower: glass between white corner piers, its roof at the bridge's, MONORAIL over its door
  const [tx0, tz0, tx1, tz1] = s.tower;
  const top = y + 2.4;
  box(b, tx0 + 0.04, SLAB, tz0 + 0.04, tx1 - 0.04, top, tz1 - 0.04, GLASS);
  for (const [x, z] of [
    [tx0, tz0],
    [tx0, tz1],
    [tx1, tz0],
    [tx1, tz1],
  ])
    box(b, x - 0.18, SLAB, z - 0.18, x + 0.18, top + 0.1, z + 0.18, WHITE);
  box(b, tx0 - 0.2, top, tz0 - 0.2, tx1 + 0.2, top + 0.3, tz1 + 0.2, WHITE);
  // The door on its face, the sign over it
  const n = s.face;
  const along: Pt = [Math.abs(n[1]), Math.abs(n[0])];
  const fx = n[0] !== 0 ? (n[0] > 0 ? tx1 : tx0) : s.door.x;
  const fz = n[1] !== 0 ? (n[1] > 0 ? tz1 : tz0) : s.door.z;
  box(b, fx - along[0] * 0.6 + n[0] * 0.02, SLAB, fz - along[1] * 0.6 + n[1] * 0.02, fx + along[0] * 0.6 + n[0] * 0.06, SLAB + 2.2, fz + along[1] * 0.6 + n[1] * 0.06, STEEL);
  sign(b, 'MONORAIL', fx, SLAB + 2.8, fz, n, 2.2, 0.32, 0.08);
  if (!low) b.detail(() => beam(b, [fx - along[0] * 1.1 + n[0] * 0.1, SLAB + 2.45, fz - along[1] * 1.1 + n[1] * 0.1], [fx + along[0] * 1.1 + n[0] * 0.1, SLAB + 2.45, fz + along[1] * 1.1 + n[1] * 0.1], 0.05, neonOf(AMBER)));
}

/** One car (x along it, y up from the floor, z across), its nose rounded where `nose` (+1 / -1 its end, 0 none) */
function car(b: Batch, x0: number, x1: number, nose: number) {
  const { w, h } = MONO_TRAIN;
  const half = w / 2;
  const stripe = toon(AMBER);
  // The body above the floor, the skirts down either side of the beam
  box(b, x0, 0, -half, x1, h, half, WHITE);
  for (const s of [-1, 1]) box(b, x0 + 0.1, -1.05, s * (MONO.w / 2 + 0.05), x1 - 0.1, 0.02, s * half, WHITE);
  // The amber stripe along it, the windows' band, a dark roof
  for (const s of [-1, 1]) {
    box(b, x0, 0.15, s * half - (s > 0 ? 0.01 : -0.01), x1, 0.35, s * (half + 0.012), stripe);
    box(b, x0 + 0.15, 0.75, s * half - (s > 0 ? 0.01 : -0.01), x1 - 0.15, 1.45, s * (half + 0.014), GLASS);
  }
  box(b, x0 + 0.05, h, -half + 0.08, x1 - 0.05, h + 0.12, half - 0.08, STEEL);
  if (nose) {
    // (a rounded nose: half a squashed sphere on the end, its windscreen dark)
    const xe = nose > 0 ? x1 : x0;
    const g = new THREE.SphereGeometry(1, 16, 10, nose > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI).scale(1.1, h / 2, half).translate(xe, h / 2, 0);
    b.add(g, WHITE);
    const ws = new THREE.SphereGeometry(1, 12, 8, nose > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI, 0, Math.PI * 0.45).scale(1.12, h / 2 + 0.02, half * 0.9).translate(xe, h / 2, 0);
    b.add(ws, GLASS);
  }
}

export function registerMono({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  // The beam in pieces, the pillars with the piece they stand under
  const n = Math.ceil((MONO.x1 - MONO.x0) / PIECE);
  for (let k = 0; k < n; k++) {
    const [x0, x1] = [MONO.x0 + ((MONO.x1 - MONO.x0) * k) / n, MONO.x0 + ((MONO.x1 - MONO.x0) * (k + 1)) / n];
    site(`mono beam ${k}`, [x0 - 1, MONO.z - 1, x1 + 1, MONO.z + 1], (into) => {
      const b = new Batch();
      beamPiece(b, x0, x1);
      for (const p of MONO_PILLARS) if (p[0] >= x0 && p[0] < x1) pillar(b, p);
      b.build(into, { cast: true, receive: true });
    });
  }
  for (const s of MONO_STATIONS) {
    const r: [number, number, number, number] = [Math.min(s.platform[0], s.tower[0]), Math.min(s.platform[1], s.tower[1]), Math.max(s.platform[2], s.tower[2]), Math.max(s.platform[3], s.tower[3])];
    site(`mono station ${s.id}`, r, (into) => {
      const b = new Batch();
      station(b, s, low);
      b.build(into, { cast: true, receive: true });
    });
  }
  if (!scene) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The train: three cars, built once, moved together
  const train = new THREE.Group();
  {
    const b = new Batch();
    const L = MONO_TRAIN.car;
    for (let i = 0; i < MONO_TRAIN.cars; i++) {
      const x0 = -TRAIN_LEN / 2 + i * (L + MONO_TRAIN.gap);
      car(b, x0, x0 + L, i === 0 ? -1 : i === MONO_TRAIN.cars - 1 ? 1 : 0);
    }
    b.build(train, { cast: true, receive: false });
  }
  train.userData.keep = true;
  scene.add(moving(train));
  const place = () => {
    const p = MONO_VIEW.hold ?? monoAt(reduced ? 0 : Date.now() / 1000 + MONO_VIEW.shift);
    train.position.set(p.x, SLAB + FLOOR, MONO.z);
  };
  place();
  tick?.(() => place());

}
