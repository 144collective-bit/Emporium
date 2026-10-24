/*
 * The observation wheel on screen (docs/finance-plan.md Phase 7 step 5; the
 * numbers are wheel.ts), part of Uptown's chunk (uptown3d.ts).
 *
 * - **A site:** the boarding platform with its rail and canopy, the A-frame's
 *   legs from their feet up to the axle and the axle's housing, the ticket
 *   booth with SKY WHEEL over its window.
 * - **On the main thread:** the rim (two rings tied together at each
 *   capsule's pin, spokes to the hub from both at every other pin, a ring of lights round it lit
 *   at night) turning on the hub, and the capsules (two instanced meshes, a
 *   body and its glass, lit at night) hanging level from it; both placed from
 *   the clock (`wheelAngle()`, `capsuleAt()`), so it stands where it should
 *   under reduced motion too, only still.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, moving, neon, siteMat, toon } from './kit';
import type { Tick } from './world';
import { site } from './tilework';
import { DECK_Y } from './waterfront';
import { BOOTH, CAPSULE, PLATFORM, WHEEL, WHEEL_RECT, capsuleAt, wheelAngle } from './wheel';

const WHITE = toon('#eef0f6');
const STEEL = toon('#b8bccb');
const DARK = toon('#2a2740');
const DECK = toon('#c9c4d6');
const GLASS = toon('#bfe3f2');
const NAVY = toon('#1c2a55');
const RING = neon('#4fe3ff', 0.15, 2.4);
const PINS = neon('#ff4fd8', 0.15, 2.4);

const SIGN = siteMat(
  'uptown-wheel-sign',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(256, 64, (c) => {
        c.fillStyle = '#1c2a55';
        c.fillRect(0, 0, 256, 64);
        c.fillStyle = '#ffffff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `800 40px ${FONT_DISPLAY}`;
        c.fillText('SKY WHEEL', 128, 34);
      }),
      color: '#ffffff',
    }),
    0.95,
    1.3
  )
);

/** A cylinder of radius r from a to b */
function strut(a: THREE.Vector3, b: THREE.Vector3, r: number) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, len, 6, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

/* ---------- The base: platform, A-frame, axle, booth ---------- */

function base(b: Batch) {
  const Y = DECK_Y;
  const [x0, z0, x1, z1, h] = PLATFORM;
  b.box(x0, Y, z0, x1 - x0, h, z1 - z0, DECK);
  // Its rail along the walk's side, open in the middle where people board (the capsules swing in over its ends)
  b.detail(() => {
    for (const [a, c] of [[x0, WHEEL.x - 0.9], [WHEEL.x + 0.9, x1]]) {
      for (let x = a + 0.05; x <= c - 0.02; x += 0.6) b.box(x - 0.025, Y + h, z0 + 0.04, 0.05, 0.75, 0.05, STEEL);
      b.box(a, Y + h + 0.72, z0 + 0.02, c - a, 0.05, 0.08, STEEL);
    }
  });
  // The two A-frames either side of the rim: a leg from each foot up to the axle's end, a tie across each
  for (const t of [-1, 1]) {
    const top = new THREE.Vector3(WHEEL.x, Y + WHEEL.hub, WHEEL.z + t * WHEEL.feet.top);
    const feet = [-1, 1].map((s) => new THREE.Vector3(WHEEL.x + s * WHEEL.feet.dx, Y, WHEEL.z + t * WHEEL.feet.dz));
    for (const f of feet) {
      b.add(strut(f, top, 0.15), WHITE);
      b.box(f.x - 0.22, Y, f.z - 0.22, 0.44, 0.4, 0.44, DARK);
    }
    const mid = (f: THREE.Vector3) => f.clone().lerp(top, 0.4);
    b.add(strut(mid(feet[0]), mid(feet[1]), 0.1), WHITE);
    // The axle's bearing at its top
    b.add(new THREE.CylinderGeometry(0.32, 0.32, 0.3, 12).rotateX(Math.PI / 2).translate(WHEEL.x, Y + WHEEL.hub, WHEEL.z + t * (WHEEL.feet.top + 0.05)), DARK);
  }
  // The axle through the hub from one bearing to the other
  b.add(new THREE.CylinderGeometry(0.16, 0.16, WHEEL.feet.top * 2 + 0.3, 10).rotateX(Math.PI / 2).translate(WHEEL.x, Y + WHEEL.hub, WHEEL.z), STEEL);
  // The ticket booth across the walk: navy, a glass window to the wheel, its sign over it
  const [bx0, bz0, bx1, bz1] = BOOTH;
  b.box(bx0, Y, bz0, bx1 - bx0, 2.2, bz1 - bz0, NAVY);
  b.box(bx0 - 0.1, Y + 2.2, bz0 - 0.1, bx1 - bx0 + 0.2, 0.12, bz1 - bz0 + 0.4, DARK);
  b.box(bx0 + 0.2, Y + 0.9, bz1 + 0.005, bx1 - bx0 - 0.4, 0.8, 0.01, GLASS);
  const g = new THREE.PlaneGeometry(bx1 - bx0 - 0.1, 0.32).translate((bx0 + bx1) / 2, Y + 1.95, bz1 + 0.012);
  b.add(g, SIGN);
}

/* ---------- The rim, turning ---------- */

function rim(): THREE.Group {
  const b = new Batch();
  const { r, capsules } = WHEEL;
  const { half } = WHEEL;
  // Two rings, a ring of lights between them on the outside
  for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(r, 0.09, 6, 96).translate(0, 0, s * half), WHITE);
  b.add(new THREE.TorusGeometry(r + 0.12, 0.04, 4, 96), RING);
  // The hub
  b.add(new THREE.CylinderGeometry(0.7, 0.7, half * 2 + 0.2, 16).rotateX(Math.PI / 2), STEEL);
  b.add(new THREE.CylinderGeometry(0.3, 0.3, half * 2 + 0.25, 12).rotateX(Math.PI / 2), DARK);
  for (let i = 0; i < capsules; i++) {
    const a = (i / capsules) * Math.PI * 2;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    // Spokes from both faces of the hub to both rings, at every other pin
    if (i % 2 === 0) for (const side of [-1, 1]) b.add(strut(new THREE.Vector3(c * 0.6, s * 0.6, side * (half - 0.1)), new THREE.Vector3(c * r, s * r, side * half), 0.025), STEEL);
    // The tie across at its pin, a light on it
    b.add(new THREE.CylinderGeometry(0.06, 0.06, half * 2, 6, 1, true).rotateX(Math.PI / 2).translate(c * r, s * r, 0), WHITE);
    b.add(new THREE.OctahedronGeometry(0.11, 0).translate(c * (r + 0.12), s * (r + 0.12), 0), PINS);
  }
  const g = new THREE.Group();
  b.build(g, { cast: true, receive: false });
  g.position.set(WHEEL.x, DECK_Y + WHEEL.hub, WHEEL.z);
  g.name = 'uptown-wheel';
  g.userData.keep = true;
  return moving(g);
}

/* ---------- The capsules, hanging level ---------- */

function capsules() {
  const { w, h, d } = CAPSULE;
  const body = new THREE.BoxGeometry(w, h * 0.42, d).translate(0, -h * 0.29, 0);
  const roof = new THREE.CylinderGeometry(w * 0.32, w * 0.5, h * 0.18, 8).translate(0, h * 0.41, 0);
  const glass = new THREE.BoxGeometry(w * 0.96, h * 0.58, d * 0.96).translate(0, h * 0.21, 0);
  const bodyMat = toon('#f3f2f7');
  const glassMat = lit(new THREE.MeshBasicMaterial({ color: '#9fd8f0' }), 0.85, 1.25);
  const parts: [THREE.BufferGeometry, THREE.Material][] = [
    [body, bodyMat],
    [roof, bodyMat],
    [glass, glassMat],
  ];
  const meshes = parts.map(([g, m]) => {
    const mesh = new THREE.InstancedMesh(g, m, WHEEL.capsules);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(WHEEL.x, DECK_Y + WHEEL.hub, WHEEL.z), WHEEL.r + 2);
    mesh.frustumCulled = true;
    mesh.castShadow = true;
    mesh.name = 'uptown-wheel-capsules';
    mesh.userData.keep = true;
    return mesh;
  });
  const m = new THREE.Matrix4();
  const place = (t: number) => {
    for (let i = 0; i < WHEEL.capsules; i++) {
      const [x, y] = capsuleAt(i, t);
      m.makeTranslation(x, DECK_Y + y, WHEEL.z);
      for (const mesh of meshes) mesh.setMatrixAt(i, m);
    }
    for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
  };
  return { meshes, place };
}

/* ---------- Registering ---------- */

export function registerWheel(scene: THREE.Scene | null, tick?: (f: Tick) => void) {
  site('uptown wheel', [WHEEL_RECT[0], WHEEL_RECT[1] - 1, WHEEL_RECT[2], WHEEL_RECT[3] + 1], (into) => {
    const b = new Batch();
    base(b);
    b.build(into, { cast: true, receive: true });
  });
  if (!scene) return;
  const wheel = rim();
  const caps = capsules();
  scene.add(wheel, ...caps.meshes);
  // Placed from the clock (the same for everyone), now and on every tick
  const now = () => Date.now() / 1000;
  const set = (t: number) => {
    wheel.rotation.z = wheelAngle(t);
    caps.place(t);
  };
  set(now());
  tick?.(() => set(now()));
}
