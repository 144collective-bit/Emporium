/*
 * The civic quarter on screen, Phase 1 (docs/civic-plan.md; the numbers are civic.ts): the civic square, a site
 * in Westlake Park's chunk (registered by westlake3d.ts). Uptown's granite (plaza3d.ts) over the whole square, so
 * the axis reads as one walk from City Hall's door over the avenue to the plaza's cross; the axis inlaid down its
 * middle in a darker stone, a border of it round the square's three park sides, a pale ring round its middle
 * where the axis crosses the line between the two flanking lots, grates round its trees, and benches facing the
 * axis (near only). Its trees and lamps are the city's, placed at the boot (index.ts).
 *
 * Phase 4 (life, night and sound): the flagpole in the ring's heart (a stone plinth, a white pole, a gold ball) and
 * the city's flag flying from it (on the main thread, its cloth waved by the tick near the camera); the
 * floodlights' fixtures at the feet of the three facades (a site), and their washes of warm light up the columns,
 * the friezes, City Hall's tower and the police's front (one additive mesh on the main thread, dark by day: each
 * wash fades up its face, under the bloom's threshold); and the pigeons pecking by the bench in front of their
 * friend, by day. The square's people are the crowd's, placed at the boot (civic.ts `CIVIC_IDLE`, `CIVIC_LOOPS`).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch, canvasTex, fx, glowMat, lit, moving, neon, toon } from './kit';
import { site } from './tilework';
import { nearGate } from './nearby';
import { GRANITE_TILE, bench, granite, quad } from './plaza3d';
import { PAVE_Y } from './gardens3d';
import { GOLD, SHADE, STONE, registerCityHall, starPath } from './cityhall3d';
import { registerFlanks } from './flank3d';
import type { Tick } from './world';
import {
  AXIS,
  AXIS_HALF,
  BORDER,
  COURT,
  FLAGPOLE,
  FLAG_TOP,
  FLOODS,
  GRATE,
  HALL,
  HALL_GROUND,
  PIGEONS,
  PIGEON_C,
  POLICE,
  RING_C,
  RING_R,
  SQUARE,
  SQUARE_BENCHES,
  SQUARE_TREES,
  STAR,
  WASH_OFF,
  civicDay,
  type Flood,
  type Rect,
} from './civic';

/** The square's granite: over the park's paved walks where they cross it (nothing flush) */
export const TOP = PAVE_Y + 0.008;
/** The inlays over the granite, and what lies on them over that */
const INLAY_Y = TOP + 0.006;
const OVER_Y = INLAY_Y + 0.006;
const INLAY = toon('#6f6a86');
const PALE = toon('#e0dacb');
const IRON = toon('#2b2838');

/** A rect cut into pieces no longer than about `most` either way (a fixed triangle never much longer than a tile) */
function pieces([x0, z0, x1, z1]: Rect, most = 16): Rect[] {
  const [nx, nz] = [Math.ceil((x1 - x0) / most), Math.ceil((z1 - z0) / most)];
  const out: Rect[] = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) out.push([x0 + ((x1 - x0) * i) / nx, z0 + ((z1 - z0) * j) / nz, x0 + ((x1 - x0) * (i + 1)) / nx, z0 + ((z1 - z0) * (j + 1)) / nz]);
  return out;
}

/* ---------- Phase 4: the flag, the floodlights, the pigeons ---------- */

const POLE = toon('#eceae4');
const FIXTURE = toon('#2b2838');
/** The fixtures' lenses: a soft glow at night (small panels, under the bulbs' brightness) */
const LENS = neon('#ffe6b0', 0.05, 1.3);
/** The flag: the city's star in gold on crimson, a gold edge at the fly (fixed, made up) */
const FLAG_TEX = canvasTex(256, 160, (c) => {
  c.fillStyle = '#7a1c29';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#c9a24c';
  c.fillRect(0, 0, 256, 8);
  c.fillRect(0, 152, 256, 8);
  c.fillRect(244, 0, 12, 160);
  starPath(c, 112, 80, 52, STAR.inner);
  c.fill();
});
/** A wash's light: brightest at the face's foot, fading up it and soft at its sides */
const WASH_TEX = canvasTex(64, 128, (c) => {
  for (let y = 0; y < 128; y++) {
    const up = 1 - y / 127;
    const a = 0.12 + 0.88 * (1 - up) ** 1.6;
    const g = c.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.22, `rgba(255,255,255,${a})`);
    g.addColorStop(0.78, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, y, 64, 1);
  }
});

/** A wash's quad on its face, a hair in front of it, facing out (uv: v up the face) */
function washQuad(f: Flood) {
  const [w, h] = [f.a1 - f.a0, f.y1 - f.y0];
  const g = new THREE.PlaneGeometry(w, h);
  const at = f.at + f.sign * WASH_OFF;
  const [a, y] = [(f.a0 + f.a1) / 2, (f.y0 + f.y1) / 2];
  if (f.axis === 'z') {
    if (f.sign < 0) g.rotateY(Math.PI);
    return g.translate(a, y, at);
  }
  g.rotateY((f.sign * Math.PI) / 2);
  return g.translate(at, y, a);
}

/** The fixtures at the facades' feet: a low dark box, its lens on top facing the wall */
function fixtures(b: Batch) {
  for (const f of FLOODS) {
    if (!f.foot) continue;
    const [x, y, z] = f.foot;
    const [w, d] = f.axis === 'z' ? [Math.min(0.5, f.a1 - f.a0), 0.16] : [0.16, Math.min(0.5, f.a1 - f.a0)];
    b.box(x - w / 2, y, z - d / 2, w, 0.12, d, FIXTURE);
    b.box(x - w / 2 + 0.03, y + 0.12, z - d / 2 + 0.03, w - 0.06, 0.012, d - 0.06, LENS);
  }
}

/** The flagpole: an octagonal plinth stepped in, the pole tapering, a gold ball on its top */
function flagpole(b: Batch) {
  const [x, z] = FLAGPOLE.at;
  const { r, h } = FLAGPOLE.plinth;
  b.add(new THREE.CylinderGeometry(r, r + 0.08, h * 0.6, 8).translate(x, HALL_GROUND + h * 0.3, z), SHADE);
  b.add(new THREE.CylinderGeometry(r * 0.62, r * 0.7, h * 0.4, 8).translate(x, HALL_GROUND + h * 0.8, z), STONE);
  b.add(new THREE.CylinderGeometry(FLAGPOLE.r * 0.65, FLAGPOLE.r, FLAGPOLE.h, 10).translate(x, HALL_GROUND + h + FLAGPOLE.h / 2, z), POLE);
  b.add(new THREE.SphereGeometry(0.16, 12, 8).translate(x, FLAG_TOP + 0.12, z), GOLD);
}

/** The flag on the main thread: its cloth waving in the tick, near the camera (still under reduced motion) */
function flag(scene: THREE.Scene, tick: ((f: Tick) => void) | undefined) {
  const { w, h } = FLAGPOLE.flag;
  const geo = new THREE.PlaneGeometry(w, h, 12, 4).translate(w / 2, 0, 0);
  const base = Float32Array.from(geo.attributes.position.array as Float32Array);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  pos.setUsage(THREE.DynamicDrawUsage);
  const wave = (t: number, gust: number) => {
    for (let i = 0; i < pos.count; i++) {
      const [x, y] = [base[i * 3], base[i * 3 + 1]];
      const k = x / w;
      // (the hoist held by the pole; the fly free, the ripples running out along it)
      pos.setXYZ(i, x * (1 - 0.04 * k), y - 0.12 * k * k * (1 - gust), (0.16 + 0.12 * gust) * k * Math.sin(2.4 * x - 3.2 * t) + 0.04 * k * Math.sin(5.3 * x - 4.1 * t + y));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  wave(0, 0.5);
  const mesh = moving(new THREE.Mesh(geo, toon('#ffffff', { map: FLAG_TEX, side: THREE.DoubleSide })));
  const [x, z] = FLAGPOLE.at;
  mesh.position.set(x + FLAGPOLE.r, FLAG_TOP - h / 2 - 0.25, z);
  mesh.castShadow = true;
  scene.add(mesh);
  const near = nearGate();
  tick?.(({ t, rain }) => {
    if (near(x, z)) wave(t, 0.4 + 0.5 * rain + 0.2 * Math.sin(t * 0.37));
  });
}

/** The washes: one additive mesh, dark by day, warm at night (each fading up its face, under the bloom's threshold) */
function washes(scene: THREE.Scene) {
  const geo = mergeGeometries(FLOODS.map(washQuad), false);
  scene.add(fx(new THREE.Mesh(geo, lit(glowMat('#ffdcae', 1, WASH_TEX), 0, 0.3))));
}

/** The pigeons: a few pecking about in front of their friend's bench by day, an instanced mesh near the camera */
function pigeons(scene: THREE.Scene, tick: ((f: Tick) => void) | undefined) {
  const body = new THREE.SphereGeometry(1, 8, 6).scale(0.05, 0.048, 0.085).translate(0, 0.065, 0);
  const head = new THREE.SphereGeometry(0.032, 8, 6).translate(0, 0.115, 0.07);
  const tail = new THREE.BoxGeometry(0.05, 0.012, 0.07).translate(0, 0.07, -0.1);
  const geo = mergeGeometries([body, head, tail], false);
  geo.deleteAttribute('uv');
  const mesh = new THREE.InstancedMesh(geo, toon('#8a8798'), PIGEONS.n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = true;
  scene.add(mesh);
  const [cx, cz] = PIGEON_C;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler(0, 0, 0, 'YXZ');
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const y = PAVE_Y + 0.008;
  const place = (t: number) => {
    for (let i = 0; i < PIGEONS.n; i++) {
      // (each round its own little circle at its own pace and way, stopping now and then to peck)
      const s = (i % 2 ? 1 : -1) * (0.12 + 0.05 * (i % 3));
      const r = PIGEONS.r * (0.35 + 0.65 * ((i * 0.618) % 1));
      const a = i * 2.4 + s * t;
      const peck = Math.max(0, Math.sin(t * 2.6 + i * 1.7)) ** 6;
      v.set(cx + Math.cos(a) * r, y + 0.02 * Math.abs(Math.sin(t * 9 + i)) * (1 - peck), cz + Math.sin(a) * r);
      // (facing along the way round, the tangent; the head down as it pecks)
      e.set(0.55 * peck, Math.atan2(-Math.sin(a) * Math.sign(s), Math.cos(a) * Math.sign(s)), 0);
      m.compose(v, q.setFromEuler(e), one);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  place(0);
  const near = nearGate(120);
  tick?.(({ t, hour }) => {
    mesh.visible = civicDay(hour);
    if (mesh.visible && near(cx, cz)) place(t);
  });
}

export function registerCivic(scene: THREE.Scene | null = null, tick?: (f: Tick) => void) {
  // City Hall (Phase 2, cityhall3d.ts), the police headquarters and the courthouse (Phase 3, flank3d.ts)
  registerCityHall();
  registerFlanks(scene);
  // The floodlights' fixtures (Phase 4), over the whole quarter
  site('civic floods', [POLICE[0], HALL.back[1], COURT[2], SQUARE[3]], (into) => {
    const b = new Batch();
    fixtures(b);
    b.build(into, { cast: false, receive: true });
  });
  if (scene) {
    flag(scene, tick);
    washes(scene);
    pigeons(scene, tick);
  }
  const [x0, z0, x1, z1] = SQUARE;
  site('civic square', [x0, z0, x1, z1], (into) => {
    const b = new Batch();
    for (const p of pieces(SQUARE)) b.add(quad(p, TOP, GRANITE_TILE), granite);
    // The axis, from the avenue to City Hall's door, broken by the ring round the middle
    const [rx, rz] = RING_C;
    for (const [za, zb] of [
      [HALL.door[1], rz - RING_R - 0.3],
      [rz + RING_R + 0.3, z1],
    ])
      for (const p of pieces([AXIS - AXIS_HALF, za, AXIS + AXIS_HALF, zb])) b.add(quad(p, INLAY_Y), INLAY);
    // A pale ring round the middle, the axis's two lines carried round inside it, a dark disc at its heart
    b.add(new THREE.RingGeometry(RING_R - 0.6, RING_R + 0.3, 64).rotateX(-Math.PI / 2).translate(rx, INLAY_Y, rz), PALE);
    b.add(new THREE.CircleGeometry(1.4, 32).rotateX(-Math.PI / 2).translate(rx, INLAY_Y, rz), INLAY);
    // (the lines stop short of the ring's inside edge: nothing flush)
    const reach = Math.sqrt((RING_R - 0.6) ** 2 - (AXIS_HALF + 0.15) ** 2) - 0.1;
    for (const s of [-1, 1]) {
      const [lx0, lx1] = [AXIS + s * AXIS_HALF - 0.15, AXIS + s * AXIS_HALF + 0.15];
      b.add(quad([lx0, rz - reach, lx1, rz - 1.6], INLAY_Y), INLAY);
      b.add(quad([lx0, rz + 1.6, lx1, rz + reach], INLAY_Y), INLAY);
    }
    // The border round its park sides (the avenue's side is open)
    for (const r of [
      [x0, z0, x1, z0 + BORDER],
      [x0, z0 + BORDER, x0 + BORDER, z1],
      [x1 - BORDER, z0 + BORDER, x1, z1],
    ] as Rect[])
      for (const p of pieces(r)) b.add(quad(p, INLAY_Y), INLAY);
    // Grates round the trees (their bars near only)
    for (const [tx, tz] of SQUARE_TREES) {
      b.add(quad([tx - GRATE, tz - GRATE, tx + GRATE, tz + GRATE], INLAY_Y), IRON);
      b.detail(() => {
        for (let k = -2; k <= 2; k++) b.add(quad([tx - GRATE + 0.06, tz + k * 0.28 - 0.03, tx + GRATE - 0.06, tz + k * 0.28 + 0.03], OVER_Y), INLAY);
      });
    }
    // Benches facing the axis
    for (const s of SQUARE_BENCHES) bench(b, s.at, s.ry, TOP);
    // The flagpole in the ring's dark heart (Phase 4)
    flagpole(b);
    b.build(into, { cast: true, receive: true });
  });
}
