/*
 * Highcrest's cable car drawn (cablecar.ts; the premium upgrade's Phase 4b), in Crestmont's chunk: the stations, the
 * pylons and the ropes as sites (fixed, batched); the glass gondolas on the main thread, instanced, placed every frame
 * from the clock (`cabinsAt()`: still under reduced motion) and the ride's own cabin where it's being ridden
 * (`CABLE_VIEW`). White and gold, Crestmont's colours; the cabins lit inside at night, the pylons' tops and the
 * stations' bull wheels each a small light, under the bloom.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch, canvasTex, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import type { Tick } from './world';
import { heightAt } from './terrain';
import { drawnAt } from './drawn';
import { CABIN_H, CABLE, CABLE_STATIONS, type CableStation } from './cablecar';
import { CABLE_VIEW, LINE_DIR, LINE_L, PYLON, PYLON_AT, SUPPORTS, cabinsAt, lineAt, ropeY } from './cableline';

const WHITE = toon('#f4f1ea');
const STONE = toon('#d9cfbb');
const GOLD = toon('#c9a54a');
const STEEL = toon('#2b2d33');
const GLASS_RAIL = toon('#a9dcef');
const ROOF = toon('#e8e4da');
const LIGHT = neon('#ffe2a8', 0.25, 1.3);
const WINDOW = siteMat('cable-window', lit(toon('#3b4c60', { emissive: '#ffd59a' }), 0, 0.75));
/** The line's name over the foot station's door */
const NAME = siteMat(
  'cable-name',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(512, 80, (c) => {
        c.fillStyle = '#121216';
        c.fillRect(0, 0, 512, 80);
        c.fillStyle = '#e8c97e';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = '500 34px Georgia, "Times New Roman", serif';
        (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '6px';
        c.fillText('HIGHCREST CABLE CAR', 256, 42);
      }),
    }),
    0.95,
    1.2
  )
);

const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: THREE.Material) => b.box(Math.min(x0, x1), y0, Math.min(z0, z1), Math.abs(x1 - x0), y1 - y0, Math.abs(z1 - z0), m);
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, m: THREE.Material, seg = 10, r0 = r) => b.add(new THREE.CylinderGeometry(r, r0, h, seg).translate(x, y + h / 2, z), m);
const ground = (x: number, z: number) => Math.min(heightAt(x, z), drawnAt(x, z));

/** A station: its floor (a slab, on legs where the ground falls away), glass round three sides, a roof, its bull wheel under the rope's end */
function station(b: Batch, s: CableStation, low: boolean) {
  const [x0, z0, x1, z1] = s.rect;
  const y = s.floor;
  // (legs under its floor where the ground falls away: the top station, beside THE ASTERLY)
  for (let x = x0 + 0.5; x <= x1 - 0.4; x += (x1 - x0 - 1) / 2)
    for (let z = z0 + 0.5; z <= z1 - 0.4; z += (z1 - z0 - 1) / 2) {
      const g = ground(x, z) - 0.3;
      if (y - 0.3 - g > 0.1) cyl(b, 0.14, y - 0.3 - g, x, g, z, WHITE, 8);
    }
  box(b, x0, y - 0.3, z0, x1, y, z1, STONE);
  // The roof on slim columns, its edge lit; glass on the two long sides and its back
  const top = y + 3.2;
  for (const [cx, cz] of [
    [x0 + 0.2, z0 + 0.2],
    [x1 - 0.2, z0 + 0.2],
    [x0 + 0.2, z1 - 0.2],
    [x1 - 0.2, z1 - 0.2],
  ])
    cyl(b, 0.12, top - y, cx, y, cz, WHITE, 8);
  box(b, x0 - 0.5, top, z0 - 0.5, x1 + 0.5, top + 0.3, z1 + 0.5, ROOF);
  box(b, x0 - 0.52, top + 0.08, z1 + 0.48, x1 + 0.52, top + 0.14, z1 + 0.52, LIGHT);
  const pane = (ax: number, az: number, bx: number, bz: number, n: [number, number]) => {
    const L = Math.hypot(bx - ax, bz - az);
    b.add(new THREE.PlaneGeometry(L - 0.4, 2.4).translate(0, y + 0.2 + 1.2, 0).rotateY(Math.atan2(n[0], n[1])).translate((ax + bx) / 2 + n[0] * 0.01, 0, (az + bz) / 2 + n[1] * 0.01), WINDOW);
  };
  pane(x0, z0, x0, z1, [-1, 0]);
  pane(x1, z0, x1, z1, [1, 0]);
  // (the side the rope leaves by stays open; the other end glazed, its door in it)
  const ropeEnd = s.rope[1] < (z0 + z1) / 2 ? z0 : z1;
  const doorEnd = ropeEnd === z0 ? z1 : z0;
  pane(x0, doorEnd, x1, doorEnd, [0, doorEnd === z1 ? 1 : -1]);
  // The bull wheel, a flat wheel under the rope's end, on its frame
  const ry = ropeY(s.id === 'foot' ? 0 : LINE_L);
  const [wx, wz] = s.rope;
  cyl(b, 0.25, ry - 0.2 - y, wx, y, wz, WHITE, 10);
  b.add(new THREE.CylinderGeometry(CABLE.gauge / 2 + 0.15, CABLE.gauge / 2 + 0.15, 0.22, 24).translate(wx, ry - 0.1, wz), STEEL);
  b.add(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12).translate(wx, ry + 0.2, wz), GOLD);
  b.add(new THREE.SphereGeometry(0.1, 6, 4).translate(wx, ry + 0.45, wz), LIGHT);
  // The foot station's name over its door
  if (s.id === 'foot') b.add(new THREE.PlaneGeometry(3.6, 0.56).translate((x0 + x1) / 2, top - 0.45, doorEnd + (doorEnd === z1 ? 0.56 : -0.56)).rotateY(0), NAME);
  // A glass rail round the top station's open floor
  if (s.id === 'top' && !low) for (const x of [x0 + 0.03, x1 - 0.03]) box(b, x - 0.03, y, z0, x + 0.03, y + 1.05, z1, GLASS_RAIL);
}

export function registerCable(low: boolean, scene: THREE.Scene | null, tick?: (f: Tick) => void) {
  /* ---------- The stations ---------- */
  for (const s of CABLE_STATIONS) {
    const [x0, z0, x1, z1] = s.rect;
    site(`crestmont cable ${s.id}`, [x0 - 2, z0 - 2, x1 + 2, z1 + 2], (into) => {
      const b = new Batch();
      station(b, s, low);
      b.build(into, { cast: true, receive: true });
    });
  }

  /* ---------- The pylons ---------- */
  const [ux, uz] = LINE_DIR;
  const turn = Math.atan2(ux, uz);
  for (const d of PYLON_AT) {
    const [x, z] = lineAt(d);
    const top = ropeY(d);
    site(`crestmont cable pylon ${d}`, [x - 3, z - 3, x + 3, z + 3], (into) => {
      const b = new Batch();
      const g = ground(x, z) - 0.2;
      // (a stone footing, the tapered white column, the cross-arm with a sheave under each rope, a gold cap and a light)
      cyl(b, 0.75, 0.5, x, g, z, STONE, 10, 0.85);
      cyl(b, PYLON.top, top - PYLON.arm - g - 0.5, x, g + 0.5, z, WHITE, 10, PYLON.r);
      b.add(new THREE.BoxGeometry(2 * PYLON.half, 0.3, 0.4).rotateY(turn + Math.PI / 2).translate(x, top - PYLON.arm, z), WHITE);
      for (const s of [-1, 1]) {
        const [px, pz] = lineAt(d, s);
        b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 8).rotateX(Math.PI / 2).rotateY(turn).translate(px, top - 0.12, pz), GOLD);
      }
      b.add(new THREE.SphereGeometry(0.12, 6, 4).translate(x, top - PYLON.arm + 0.3, z), LIGHT);
      b.build(into, { cast: true, receive: true });
    });
  }

  /* ---------- The ropes, a span a site ---------- */
  for (let i = 0; i + 1 < SUPPORTS.length; i++) {
    const [a, c] = [SUPPORTS[i], SUPPORTS[i + 1]];
    const ends = [lineAt(a.d), lineAt(c.d)];
    const rect: [number, number, number, number] = [Math.min(ends[0][0], ends[1][0]) - 3, Math.min(ends[0][1], ends[1][1]) - 3, Math.max(ends[0][0], ends[1][0]) + 3, Math.max(ends[0][1], ends[1][1]) + 3];
    site(`crestmont cable span ${i}`, rect, (into) => {
      const b = new Batch();
      const n = Math.max(4, Math.ceil((c.d - a.d) / 3));
      for (const s of [-1, 1]) {
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= n; k++) {
          const d = a.d + ((c.d - a.d) * k) / n;
          const [x, z] = lineAt(d, s);
          pts.push(new THREE.Vector3(x, ropeY(d), z));
        }
        b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.045, 4, false), STEEL);
      }
      b.build(into, { cast: false, receive: false });
    });
  }

  /* ---------- The cabins, on the clock ---------- */
  if (!scene || !tick) return;
  const frame = new THREE.BoxGeometry(1.9, 0.18, 2.2).translate(0, -CABIN_H + 0.09, 0);
  const roof = new THREE.BoxGeometry(1.75, 0.22, 2.0).translate(0, -0.12, 0);
  const hanger = new THREE.BoxGeometry(0.1, CABLE.hang, 0.1).translate(0, CABLE.hang / 2, 0);
  const grip = new THREE.BoxGeometry(0.3, 0.25, 0.5).translate(0, CABLE.hang, 0);
  const glass = new THREE.CapsuleGeometry(0.85, 1.1, 4, 10).rotateX(Math.PI / 2).scale(1, 1.05, 1).translate(0, -CABIN_H / 2 - 0.05, 0);
  const whiteGeo = mergeGeometries([frame, roof, hanger], false);
  const n = CABLE.cabins + 1;
  const glassMesh = new THREE.InstancedMesh(glass, lit(toon('#bfe3ef', { emissive: '#ffe1a8' }), 0, 0.55), n);
  const whiteMesh = new THREE.InstancedMesh(whiteGeo, WHITE, n);
  const goldMesh = new THREE.InstancedMesh(grip, GOLD, n);
  const group = new THREE.Group();
  group.name = 'cable cabins';
  for (const m of [glassMesh, whiteMesh, goldMesh]) {
    m.frustumCulled = false;
    m.castShadow = !low;
    group.add(m);
  }
  scene.add(group);
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const none = new THREE.Vector3(0, 0, 0);
  const up = new THREE.Vector3(0, 1, 0);
  const place = () => {
    const list = cabinsAt(reduced ? 0 : Date.now() / 1000);
    const ride = CABLE_VIEW.ride;
    for (let k = 0; k < n; k++) {
      const c = k < CABLE.cabins ? list[k] : ride;
      // (the cabin's top hangs at its grip, CABLE.hang under the rope)
      if (c) m4.compose(v.set(c.x, c.y, c.z), q.setFromAxisAngle(up, c.yaw), one);
      else m4.compose(v.set(0, -100, 0), q.identity(), none);
      for (const m of [glassMesh, whiteMesh, goldMesh]) m.setMatrixAt(k, m4);
    }
    for (const m of [glassMesh, whiteMesh, goldMesh]) m.instanceMatrix.needsUpdate = true;
  };
  place();
  tick(() => place());
}
