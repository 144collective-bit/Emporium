/*
 * Your own car fitted out (vehicle plan Phase 1; carfine.ts's chunk): the
 * garage's turntable car and the one you drive, never the traffic's.
 *
 * - **The shell, hollow:** the traffic's models are solid; yours is cut open
 *   where you can see in. Its paint is the model's own with the body's and
 *   the cabin's solids taken out (they're the first two pieces cars.ts
 *   builds) and in their place the nose and the tail solid, the sides as
 *   skins, a floor, the cabin's walls with the windows' band cut out, the
 *   roof, and pillars along the windscreen and the rear window. Its detail is
 *   the model's own (the fine detail too) with whatever lay in the windows
 *   taken out (`cutWindows()`): the glass goes into its own mesh, and the
 *   dark surrounds come back as frames round the openings.
 * - **The glass:** tinted and see-through, in the FX layer (the ink
 *   pre-pass leaves it out, so what's inside is inked through it).
 * - **Inside** (`INTERIORS`, carinside.ts): seats (a bench behind where
 *   there are rear seats), door cards, the floor, wheel tubs, a headliner,
 *   the dash with its binnacle and two gauges, the centre console and its
 *   gear lever, pedals, the steering wheel on its column.
 * - **You at the wheel:** `car.seat()` sits a Degen on the driver's seat,
 *   leant back as far as the seat is, his feet on the pedals and his hands
 *   at a quarter to three on the wheel (`reachLeg()`, `reachArm()`).
 * - **Its wheels:** the discs and sidewall rings on the turning wheels, the
 *   calipers on the body behind them.
 *
 * Each model's pieces are made once and shared by every car of yours of it.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BLACKOUT, GLASS, bodyShape, carGeometry, carMaterials, clip, extrude, inset, merge, wheelGeometry, wheelSpots, type Car } from './cars';
import { DRIVER_SCALE, INTERIORS, hollowFrom, hollowTo, type Interior } from './carinside';
import type { CarId, CarSpec } from './carspec';
import { CALIPER, brakes, caliperGeometry, inward, paintAll } from './carparts';
import type { Degen } from './character';
import { fx, toon } from './kit';
import { ANKLE_H, HIP_HEIGHT, reachArm, reachLeg, torsoFrame } from './skeleton';

type V2 = [number, number];

const SEAT = '#3a3647';
const BOLSTER = '#2a2734';
const CARD = '#2f2c3a';
const FLOOR = '#1d1b25';
const HEADLINER = '#c8c3d6';
const DASH = '#24222d';
const GAUGE = '#e6eeff';
const NEEDLE = '#ff3b5c';
const STEER = '#1b1922';
const METAL = '#a9a5bd';

/** The cabin's rounding (cars.ts builds every model but the bus with it) */
const CABIN_ROUND = 0.055;

/** The lower body's outline as a polygon (its arches as arcs of points) */
function bodyPoly(s: CarSpec): V2[] {
  return bodyShape(s)
    .getPoints(8)
    .map((v): V2 => [v.x, v.y]);
}
const shape = (poly: V2[]) => new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)));
const area = (poly: V2[]) => poly.reduce((a, p, i) => a + p[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * p[1], 0) / 2;
/** A slab along the side-view segment a-b: `w` across the car at z, `t` thick, its outer face `lift` off the line (away from `centre`) */
function bar(a: V2, b: V2, w: number, t: number, z: number, lift: number, centre: V2) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  let nx = -dy / len;
  let ny = dx / len;
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  if ((mx - centre[0]) * nx + (my - centre[1]) * ny < 0) [nx, ny] = [-nx, -ny];
  return new THREE.BoxGeometry(len, t, w)
    .rotateZ(Math.atan2(dy, dx))
    .translate(mx + nx * (lift - t / 2), my + ny * (lift - t / 2), z);
}
/** A frame round a pane: the surround's slab with the glass's opening cut out, laid like `pane()` */
function framePane(a: V2, b: V2, outer: number, inner: number, centre: V2, ends: number, endsIn: number, lift: number) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  let nx = -dy / len;
  let ny = dx / len;
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  if ((mx - centre[0]) * nx + (my - centre[1]) * ny < 0) [nx, ny] = [-nx, -ny];
  // In the pane's own plane: u along it, v across the car
  const u0 = len / 2 - ends;
  const u1 = len / 2 - endsIn;
  const sh = new THREE.Shape([new THREE.Vector2(-u0, -outer / 2), new THREE.Vector2(u0, -outer / 2), new THREE.Vector2(u0, outer / 2), new THREE.Vector2(-u0, outer / 2)]);
  sh.holes.push(new THREE.Path([new THREE.Vector2(-u1, -inner / 2), new THREE.Vector2(-u1, inner / 2), new THREE.Vector2(u1, inner / 2), new THREE.Vector2(u1, -inner / 2)]));
  // (the shape's x along the pane, y across the car, extruded through its thickness: then laid on the slope)
  return new THREE.ExtrudeGeometry(sh, { depth: 0.014, bevelEnabled: false })
    .translate(0, 0, -0.007)
    .rotateX(Math.PI / 2)
    .rotateZ(Math.atan2(dy, dx))
    .translate(mx + nx * lift, my + ny * lift, 0);
}

/* ---------- The shell ---------- */

interface Shell {
  paint: THREE.BufferGeometry;
  detail: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  inside: THREE.BufferGeometry;
  wheel: THREE.BufferGeometry;
}
const shells = new Map<CarId, Shell>();

/** The geometry's triangles with their colour: kept, or not */
function triangles(g: THREE.BufferGeometry, keep: (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, colour: THREE.Color) => boolean) {
  const src = g.index ? g.toNonIndexed() : g;
  const names = Object.keys(src.attributes);
  const out: Record<string, number[]> = Object.fromEntries(names.map((k) => [k, []]));
  const pos = src.attributes.position;
  const col = src.attributes.color;
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, i + k);
    if (col) c.fromBufferAttribute(col as THREE.BufferAttribute, i);
    if (!keep(v[0], v[1], v[2], c)) continue;
    for (const k of names) {
      const a = src.attributes[k];
      for (let j = 0; j < 3 * a.itemSize; j++) out[k].push(a.array[i * a.itemSize + j]);
    }
  }
  const r = new THREE.BufferGeometry();
  for (const k of names) r.setAttribute(k, new THREE.Float32BufferAttribute(out[k], src.attributes[k].itemSize));
  return r;
}

function makeShell(s: CarSpec, low: boolean): Shell {
  const n = INTERIORS[s.id];
  const cw = s.W * s.cabinW;
  const [rb, rr, fr, fb] = s.cabin;
  const h0 = hollowFrom(s, n);
  const h1 = hollowTo(s);
  const mid: V2 = [(rb[0] + fb[0] + rr[0] + fr[0]) / 4, (rb[1] + fb[1] + rr[1] + fr[1]) / 4];
  const model = carGeometry(s.id, { wheels: false });

  // The paint: the model's own, less its first two pieces (the body's and the cabin's solids)
  const solids = extrude(bodyShape(s), s.W, 0.04).attributes.position.count + extrude(shape(s.cabin), cw, CABIN_ROUND).attributes.position.count;
  const rest = new THREE.BufferGeometry();
  for (const k of Object.keys(model.paint.attributes)) {
    const a = model.paint.attributes[k];
    rest.setAttribute(k, new THREE.BufferAttribute(a.array.slice(solids * a.itemSize), a.itemSize));
  }
  const paints: THREE.BufferGeometry[] = [rest];
  const body = bodyPoly(s);
  const piece = (poly: V2[], depth: number, round: number, z = 0) => {
    if (poly.length >= 3 && Math.abs(area(poly)) > 1e-4) paints.push(extrude(shape(poly), depth, round).translate(0, 0, z));
  };
  // The nose and the tail solid, the sides between them as skins
  piece(clip(body, ([x]) => x - h1), s.W, 0.04);
  piece(clip(body, ([x]) => h0 - x), s.W, 0.04);
  const between = clip(clip(body, ([x]) => x - h0), ([x]) => h1 - x);
  const SKIN = 0.1;
  for (const side of [-1, 1]) piece(between, SKIN, 0.04, side * (s.W / 2 - SKIN / 2));
  // The cabin: solid behind the hollow (a van's load space), its walls round it, the roof over it
  piece(clip(s.cabin, ([x]) => h0 - x), cw, CABIN_ROUND);
  const x0s = Math.min(...s.panes.map(([a]) => a)) - 0.03;
  const x1s = Math.max(...s.panes.map(([, b]) => b)) + 0.03;
  const frame = inset(s.cabin, CABIN_ROUND + 0.012);
  let band = clip(clip(frame, ([x]) => x - Math.max(x0s, h0 + 0.01)), ([x]) => x1s - x);
  if (s.sill !== undefined) band = clip(band, ([, y]) => y - (s.sill! - 0.03));
  const wall = clip(s.cabin, ([x]) => x - h0);
  const WALL = 0.03;
  if (wall.length >= 3) {
    const sh = shape(wall);
    sh.holes.push(new THREE.Path(band.map(([x, y]) => new THREE.Vector2(x, y))));
    for (const side of [-1, 1]) paints.push(new THREE.ExtrudeGeometry(sh, { depth: WALL, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, side > 0 ? cw / 2 - WALL : -cw / 2));
  }
  const r0: V2 = h0 > rr[0] ? [h0, rr[1] + ((h0 - rr[0]) / (fr[0] - rr[0])) * (fr[1] - rr[1])] : rr;
  const ROOF = 0.045;
  piece([r0, fr, [fr[0], fr[1] - ROOF], [r0[0], r0[1] - ROOF]], cw, 0.02);
  // Pillars along the windscreen and the rear window, from the walls in to the glass's frame
  for (const side of [-1, 1]) {
    paints.push(bar(fb, fr, 0.06, 0.04, side * (cw / 2 - 0.035), 0.012, mid));
    if (s.rearGlass && h0 < rr[0]) paints.push(bar(rb, rr, 0.06, 0.04, side * (cw / 2 - 0.035), 0.012, mid));
  }

  // The detail: the model's own, less what lay in the windows (the glass moves to its own mesh; the dark
  // surrounds come back as frames round the openings)
  const belt = (x: number) => rb[1] + ((x - rb[0]) / (fb[0] - rb[0])) * (fb[1] - rb[1]);
  const glassC = new THREE.Color(GLASS);
  const near = (p: THREE.Vector3, a: V2, b: V2) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const t = ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / (len * len);
    const off = Math.abs((p.x - a[0]) * -dy + (p.y - a[1]) * dx) / len;
    // (out to the glass's highlights: over see-through glass they read as bars, so yours has none)
    return t > -0.02 && t < 1.02 && off < 0.045 && Math.abs(p.z) <= cw / 2;
  };
  const inWindow = (p: THREE.Vector3) =>
    (Math.abs(p.z) >= cw / 2 - 0.002 && Math.abs(p.z) <= cw / 2 + 0.022 && p.x >= x0s - 0.005 && p.x <= x1s + 0.005 && p.y >= belt(p.x) + 0.04) ||
    near(p, fb, fr) ||
    (!!s.rearGlass && near(p, rb, rr));
  const glassBits: THREE.BufferGeometry[] = [];
  const detail = triangles(model.detail, (a, b, c, colour) => {
    if (!(inWindow(a) && inWindow(b) && inWindow(c))) return true;
    // (the colours are stored as 32-bit floats: near enough is the glass)
    if (Math.abs(colour.r - glassC.r) + Math.abs(colour.g - glassC.g) + Math.abs(colour.b - glassC.b) < 1e-4) glassBits.push(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], 3)));
    return false;
  });
  const details: THREE.BufferGeometry[] = [detail];
  // The calipers, fixed to the body behind each wheel's spokes (a front one doesn't steer: behind the spokes
  // nobody sees it, and it costs no draw of its own)
  for (const [x, y, z] of wheelSpots(s)) details.push(paintAll(caliperGeometry(s).applyMatrix4(new THREE.Matrix4().makeRotationY(z < 0 ? Math.PI : 0).setPosition(x, y, z)), CALIPER));
  const dark = (g: THREE.BufferGeometry) => details.push(paintAll(g, BLACKOUT));
  // The band round the side windows with the panes cut out of it
  const inner = inset(s.cabin, CABIN_ROUND + 0.035);
  const sideBand = shape(band);
  for (const [x0, x1] of s.panes) {
    let poly = clip(clip(inner, ([x]) => x - x0), ([x]) => x1 - x);
    if (s.sill !== undefined) poly = clip(poly, ([, y]) => y - s.sill!);
    if (poly.length >= 3) sideBand.holes.push(new THREE.Path(poly.map(([x, y]) => new THREE.Vector2(x, y))));
  }
  for (const side of [-1, 1]) dark(new THREE.ExtrudeGeometry(sideBand, { depth: 0.012, bevelEnabled: false }).translate(0, 0, side * (cw / 2 + 0.006) - 0.006));
  // The windscreen's and the rear window's frames
  dark(framePane(fr, fb, cw - CABIN_ROUND * 2 + 0.02, cw - CABIN_ROUND * 2 - 0.06, mid, 0.03, 0.07, 0.012));
  if (s.rearGlass) dark(framePane(rb, rr, cw - CABIN_ROUND * 2 + 0.02, cw - CABIN_ROUND * 2 - 0.06, mid, 0.03, 0.07, 0.012));
  // The glass, merged (positions and normals only)
  const glass = mergeGeometries(glassBits)!;
  glass.computeVertexNormals();

  return {
    paint: merge(paints, false)!,
    detail: merge(details, true)!,
    glass,
    inside: insideOf(s, n, h0, h1),
    wheel: mergeGeometries([stripColour(wheelGeometry(s)), ...brakes(s, low, false).map(stripColour)].map(withColour))!,
  };
}
/** (the wheel's pieces carry their colours; merged they need the same attributes) */
const stripColour = (g: THREE.BufferGeometry) => {
  const n = g.index ? g.toNonIndexed() : g;
  if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
  return n;
};
const withColour = (g: THREE.BufferGeometry) => {
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
};

/* ---------- Inside ---------- */

/** Everything inside, one geometry coloured per vertex */
function insideOf(s: CarSpec, n: Interior, h0: number, h1: number) {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, hex: string) => void parts.push(paintAll(g.index ? g.toNonIndexed() : g, hex));
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, hex: string, rz = 0) => add(new THREE.BoxGeometry(w, h, d).rotateZ(rz).translate(x, y, z), hex);
  const cw = s.W * s.cabinW;
  const [rb, , , fb] = s.cabin;
  const inW = s.W - 0.2 - 0.012;
  const floorY = n.floor;

  // The floor, the door cards (the skins' inner faces, their arches left open for the wheel tubs), the headliner
  box(h1 - h0, 0.02, inW, (h0 + h1) / 2, floorY - 0.01, 0, FLOOR);
  const belt = (x: number) => rb[1] + ((x - rb[0]) / (fb[0] - rb[0])) * (fb[1] - rb[1]);
  for (const side of [-1, 1]) {
    const card = clip(clip(clip(bodyPoly(s), ([x]) => x - h0), ([x]) => h1 - x), ([, y]) => y - floorY);
    if (card.length >= 3) {
      // (facing in: the right one drawn at -x and turned round)
      const g = new THREE.ShapeGeometry(shape(card.map(([x, y]): V2 => [side > 0 ? -x : x, Math.min(y, belt(x) - 0.03)])));
      if (side > 0) g.rotateY(Math.PI);
      add(g.translate(0, 0, side * (s.W / 2 - 0.106)), CARD);
    }
    // An armrest along each door
    box(Math.min(0.5, h1 - h0 - 0.2), 0.03, 0.05, n.hip[0] + 0.05, n.hip[1] + 0.12, side * (s.W / 2 - 0.13), BOLSTER);
  }
  const roofY = s.cabin[1][1] - 0.045;
  box(Math.max(0.2, s.cabin[2][0] - Math.max(h0, s.cabin[1][0]) - 0.04), 0.012, cw - 0.07, (s.cabin[2][0] + Math.max(h0, s.cabin[1][0])) / 2, roofY - 0.008, 0, HEADLINER);
  // Wheel tubs over any wheel inside the hollow
  for (const ax of s.axles) {
    if (ax < h0 - s.r || ax > h1 + s.r) continue;
    const arch = s.r + 0.04;
    for (const side of [-1, 1]) {
      const z = side * (s.W / 2 - 0.1 - 0.13);
      add(new THREE.CylinderGeometry(arch + 0.01, arch + 0.01, 0.26, 12, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(ax, s.r, z), CARD);
      const cap = new THREE.CircleGeometry(arch + 0.01, 12, 0, Math.PI).translate(ax, s.r, 0);
      add(side > 0 ? inward(cap.clone()).translate(0, 0, s.W / 2 - 0.36) : cap.translate(0, 0, -s.W / 2 + 0.36), CARD);
    }
  }

  // The seats: the driver's and the passenger's, a bench behind if it has rear seats
  const seat = (x: number, z: number, w: number, recline: number) => {
    const y = n.hip[1] - 0.04;
    box(0.3, 0.07, w, x + 0.06, y, z, SEAT);
    for (const e of [-1, 1]) box(0.3, 0.05, 0.04, x + 0.06, y + 0.04, z + e * (w / 2 - 0.02), BOLSTER);
    const back = 0.44;
    const bx = x - 0.1 - (Math.sin(recline) * back) / 2;
    box(0.07, back, w, bx, y + (Math.cos(recline) * back) / 2 + 0.02, z, SEAT, recline);
    box(0.06, 0.1, w * 0.5, bx - Math.sin(recline) * (back / 2 + 0.07), y + Math.cos(recline) * (back + 0.07) + 0.02, z, BOLSTER, recline);
  };
  const seatW = Math.min(0.32, cw / 2 - 0.06);
  for (const z of [n.hip[2], -n.hip[2]]) seat(n.hip[0], z, seatW, n.recline);
  if (n.rear) seat(n.rear.x, 0, cw - 0.12, n.rear.recline);

  // The dash from the wheel to the windscreen's foot, its binnacle and two gauges facing him, the console
  const [dx, dy] = n.dash;
  const dashBack = n.wheel[0] + 0.05;
  box(h1 - dashBack + 0.02, 0.2, inW, (dashBack + h1) / 2, dy - 0.1, 0, DASH);
  box(0.14, 0.06, 0.26, dashBack + 0.05, dy + 0.02, n.hip[2], DASH);
  for (const e of [-1, 1]) {
    add(new THREE.CircleGeometry(0.045, 16).rotateY(-Math.PI / 2).rotateZ(-0.35).translate(dashBack - 0.016, dy + 0.02, n.hip[2] + e * 0.06), GAUGE);
    box(0.004, 0.035, 0.006, dashBack - 0.02, dy + 0.035, n.hip[2] + e * 0.06, NEEDLE, -0.35);
  }
  box(Math.max(0.1, dx - n.hip[0] - 0.1), n.hip[1] - floorY - 0.04, 0.12, (dx + n.hip[0]) / 2 + 0.06, (n.hip[1] + floorY) / 2 - 0.02, 0, DASH);
  add(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6).translate(n.hip[0] + 0.25, n.hip[1] + 0.02, 0), METAL);
  add(new THREE.SphereGeometry(0.025, 8, 6).translate(n.hip[0] + 0.25, n.hip[1] + 0.08, 0), STEER);
  // Pedals under the dash
  for (const e of [-0.06, 0.06]) box(0.02, 0.07, 0.05, n.pedals, floorY + 0.06, n.hip[2] + e, METAL, 0.4);
  // The steering wheel, tilted back towards him, on its column into the dash
  const tilt = n.wheelTilt;
  // (its top leaning forward, its face up towards him, the column forward and down into the dash)
  const toWheel = (g: THREE.BufferGeometry) => g.rotateY(Math.PI / 2).rotateZ(-tilt).translate(n.wheel[0], n.wheel[1], n.wheel[2]);
  add(toWheel(new THREE.TorusGeometry(n.wheelR, 0.013, 6, 20)), STEER);
  add(toWheel(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10).rotateX(Math.PI / 2)), STEER);
  for (const a of [0, Math.PI / 2, Math.PI]) add(toWheel(new THREE.BoxGeometry(n.wheelR, 0.012, 0.012).translate(n.wheelR / 2, 0, 0).rotateZ(a - Math.PI / 2)), STEER);
  const col = new THREE.CylinderGeometry(0.018, 0.022, 0.24, 8).translate(0, 0.12, 0).rotateZ(-Math.PI / 2 - tilt).translate(n.wheel[0], n.wheel[1], n.wheel[2]);
  add(col, STEER);

  return mergeGeometries(parts.map(stripColour).map(withColour))!;
}

/* ---------- Fitting out ---------- */

const glassMat = () =>
  (theGlass ??= toon('#a6e6f7', { transparent: true, opacity: 0.32, depthWrite: false, name: 'car-glass' }));
let theGlass: THREE.MeshToonMaterial | null = null;

const M = new THREE.Matrix4();
const inv = new THREE.Matrix4();
const grip = new THREE.Vector3();
const ankle = new THREE.Vector3();

/** Fit your car out: its hollow shell, see-through glass, the inside, its wheels' brakes, and a seat for you */
export function fitOut(car: Car, o: { low: boolean; ready(obj: THREE.Object3D): void }) {
  if (car.group.userData.fitted) return;
  car.group.userData.fitted = true;
  const s = car.spec;
  const n = INTERIORS[s.id];
  let sh = shells.get(s.id);
  if (!sh) shells.set(s.id, (sh = makeShell(s, o.low)));
  const model = carGeometry(s.id, { wheels: false });
  const { detail } = carMaterials();
  for (const c of car.group.children) {
    const m = c as THREE.Mesh;
    if (m.geometry === model.paint) m.geometry = sh.paint;
    else if (m.geometry === model.detail) m.geometry = sh.detail;
    // A wheel's pivot: the discs and the sidewall's ring on the turning wheel
    else if (c.type === 'Group' && c.children[0]) (c.children[0] as THREE.Mesh).geometry = sh.wheel;
  }
  const glass = fx(new THREE.Mesh(sh.glass, glassMat()));
  glass.renderOrder = 1;
  const inside = new THREE.Mesh(sh.inside, detail);
  inside.castShadow = inside.receiveShadow = true;
  car.group.add(glass, inside);

  let driver: Degen | null = null;
  car.seat = (degen) => {
    if (driver) {
      driver.g.removeFromParent();
      if (driver.held) driver.held.visible = true;
    }
    driver = degen;
    if (!degen) return;
    const g = degen.g;
    g.rotation.set(0, Math.PI / 2, 0);
    g.scale.setScalar(DRIVER_SCALE);
    g.position.set(n.hip[0], n.hip[1] - HIP_HEIGHT * DRIVER_SCALE, n.hip[2]);
    if (degen.held) degen.held.visible = false;
    car.group.add(g);
    const p = degen.pose;
    p.bob = p.twist = p.side = 0;
    p.lean = -n.recline * 0.8;
    p.headYaw = 0;
    // (the neck takes back 0.6 of the lean, poseSkeleton(): the rest here, and a touch down at the road)
    p.headPitch = p.lean * 0.4 - 0.03;
    // His feet on the pedals (in the hips' space, his own size), the knees up
    for (const [i, l] of p.legs.entries()) {
      const side = i === 0 ? -1 : 1;
      ankle.set(side * 0.02, (n.floor + ANKLE_H * DRIVER_SCALE - n.hip[1]) / DRIVER_SCALE, (n.pedals - 0.04 - n.hip[0]) / DRIVER_SCALE);
      reachLeg(l, side, ankle, 0);
      // (toes up on the pedal)
      l.foot = -0.25;
    }
    // His hands at a quarter to three: arm 0 (the rig's -x) is on the car's right (+z)
    M.compose(g.position, g.quaternion, g.scale).multiply(torsoFrame(p, inv));
    inv.copy(M).invert();
    for (const i of [0, 1] as const) {
      grip.set(n.wheel[0], n.wheel[1], n.wheel[2] + (i === 0 ? 1 : -1) * n.wheelR).applyMatrix4(inv);
      reachArm(p, i, grip);
    }
    degen.update();
  };
  o.ready(car.group);
}
