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
import { BLACKOUT, GLASS, bodyShape, build, carGeometry, carMaterials, clip, extrude, inset, merge, wheelGeometry, wheelSpots, type Car } from './cars';
import { DRIVER_SCALE, INTERIORS, hollowFrom, hollowTo, type Interior } from './carinside';
import type { CarSpec } from './carspec';
import { CALIPER, brakes, caliperGeometry, inward, paintAll } from './carparts';
import type { Degen } from './character';
import { fx, lit, toon } from './kit';
import { rideOn } from './carride';
import { bareOf, STOCK_PARTS } from './carlook';
import { cleanLook, type PlayerCar } from './mycar';
import { dress } from './carstyle';
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
const RIM = '#4a4658';
const METAL = '#a9a5bd';
const DASH_RIM = '#55506a';
const DASH_LIGHT = '#ff5ad8';
const MIRROR_SKY = '#a9c8ea';
const MIRROR_ROAD = '#5e6070';

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
  inside: Inside;
  wheel: THREE.BufferGeometry;
  /** The front doors (the driver's on the left, then the passenger's), cut out at their seams: their pieces as they sit with the hinge at the origin */
  doors?: { paint: THREE.BufferGeometry; detail: THREE.BufferGeometry; glass: THREE.BufferGeometry; inside?: THREE.BufferGeometry }[];
}
/** (by model, and the model's own parts left out for your kit: carlook.ts `bareOf()`) */
const shells = new Map<string, Shell>();

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

/**
 * The triangles `on` picks cut at each x in `cuts` (a fan for each piece; every attribute carried across in a
 * straight line): a strip along the side (a chrome line, a crease, a stripe) then comes away with the door
 */
function splitAt(g: THREE.BufferGeometry, cuts: number[], on: (p: THREE.Vector3) => boolean) {
  const src = g.index ? g.toNonIndexed() : g;
  const names = Object.keys(src.attributes);
  const sizes = names.map((k) => src.attributes[k].itemSize);
  const at = names.indexOf('position');
  const out: number[][] = names.map(() => []);
  const pos = src.attributes.position;
  const v = new THREE.Vector3();
  type Vert = number[][];
  const vert = (i: number): Vert => names.map((k, a) => Array.from({ length: sizes[a] }, (_, j) => src.attributes[k].array[i * sizes[a] + j]));
  const mix = (p: Vert, q: Vert, t: number): Vert => p.map((a, i) => a.map((x, j) => x + (q[i][j] - x) * t));
  const emit = (poly: Vert[]) => {
    for (let i = 1; i + 1 < poly.length; i++) for (const w of [poly[0], poly[i], poly[i + 1]]) w.forEach((a, k) => out[k].push(...a));
  };
  for (let i = 0; i < pos.count; i += 3) {
    let all = true;
    for (let k = 0; k < 3; k++) all &&= on(v.fromBufferAttribute(pos, i + k));
    let polys: Vert[][] = [[vert(i), vert(i + 1), vert(i + 2)]];
    if (all)
      for (const c of cuts) {
        const next: Vert[][] = [];
        for (const poly of polys) {
          // (each side of the cut, Sutherland-Hodgman against x = c)
          for (const dir of [1, -1]) {
            const kept: Vert[] = [];
            for (let j = 0; j < poly.length; j++) {
              const a = poly[j];
              const b = poly[(j + 1) % poly.length];
              const fa = (a[at][0] - c) * dir;
              const fb = (b[at][0] - c) * dir;
              if (fa >= 0) kept.push(a);
              if ((fa >= 0) !== (fb >= 0)) kept.push(mix(a, b, fa / (fa - fb)));
            }
            if (kept.length >= 3) next.push(kept);
          }
        }
        polys = next;
      }
    for (const poly of polys) emit(poly);
  }
  const r = new THREE.BufferGeometry();
  names.forEach((k, a) => r.setAttribute(k, new THREE.Float32BufferAttribute(out[a], sizes[a])));
  return r;
}

function makeShell(s: CarSpec, low: boolean, bare: string): Shell {
  const n = INTERIORS[s.id];
  const cw = s.W * s.cabinW;
  const [rb, rr, fr, fb] = s.cabin;
  const h0 = hollowFrom(s, n);
  const h1 = hollowTo(s);
  const mid: V2 = [(rb[0] + fb[0] + rr[0] + fr[0]) / 4, (rb[1] + fb[1] + rr[1] + fr[1]) / 4];
  const model = bare ? build(s.id, false, bare) : carGeometry(s.id, { wheels: false });

  // The paint: the model's own, less its first two pieces (the body's and the cabin's solids)
  const solids = extrude(bodyShape(s), s.W, 0.04).attributes.position.count + extrude(shape(s.cabin), cw, CABIN_ROUND).attributes.position.count;
  const rest = new THREE.BufferGeometry();
  for (const k of Object.keys(model.paint.attributes)) {
    const a = model.paint.attributes[k];
    rest.setAttribute(k, new THREE.BufferAttribute(a.array.slice(solids * a.itemSize), a.itemSize));
  }
  // The front doors (vehicle plan Phases 2 and 3, carride.ts swings them): each side cut at the door's seams,
  // everything from its sill up between them its own piece (`doors[0]` the driver's, on the left; `doors[1]` the
  // passenger's). `spans` are a side's stretches: before the door, the door, after it
  const D = n.door;
  const SIDES = [-1, 1] as const;
  const doors = SIDES.map(() => ({ paints: [] as THREE.BufferGeometry[], details: [] as THREE.BufferGeometry[], glass: [] as THREE.BufferGeometry[] }));
  const onDoor = (p: THREE.Vector3, side: number) =>
    !!D && p.x > D.back - 0.004 && p.x < D.hinge + 0.004 && p.y > D.y0 - 0.002 && p.z * side > cw / 2 - 0.004 && !s.axles.some((ax) => Math.hypot(p.x - ax, p.y - s.r) < s.r + 0.08);
  const spans: [number, number, boolean][] = D ? [[-9, D.back, false], [D.back, D.hinge, true], [D.hinge, 9, false]] : [[-9, 9, false]];
  // (what lies along the sides is cut at the doors' seams first)
  const onSide = (p: THREE.Vector3) => !!D && Math.abs(p.z) > cw / 2 - 0.004 && p.y > D.y0 - 0.002;
  /** Which door a triangle lies on (0 the driver's, 1 the passenger's), or -1 */
  const which = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => SIDES.findIndex((sd) => onDoor(a, sd) && onDoor(b, sd) && onDoor(c, sd));
  const share = (g: THREE.BufferGeometry, into: (i: number) => THREE.BufferGeometry[]) => {
    const cutG = D ? splitAt(g, [D.back, D.hinge], onSide) : g;
    into(-1).push(triangles(cutG, (a, b, c) => which(a, b, c) < 0));
    if (D) for (const i of [0, 1]) into(i).push(triangles(cutG, (a, b, c) => which(a, b, c) === i));
  };
  const paints: THREE.BufferGeometry[] = [];
  share(rest, (i) => (i < 0 ? paints : doors[i].paints));
  const body = bodyPoly(s);
  const piece = (poly: V2[], depth: number, round: number, z = 0, to = paints) => {
    if (poly.length < 3 || Math.abs(area(poly)) < 1e-4) return;
    // (a thin piece, the sill under the door, rounds less: rounded as much as the rest it would turn inside out)
    const ys = poly.map(([, y]) => y);
    const xs = poly.map(([x]) => x);
    const thin = Math.min(Math.max(...ys) - Math.min(...ys), Math.max(...xs) - Math.min(...xs));
    to.push(extrude(shape(poly), depth, Math.min(round, thin * 0.25)).translate(0, 0, z));
  };
  // The nose and the tail solid, the sides between them as skins
  piece(clip(body, ([x]) => x - h1), s.W, 0.04);
  piece(clip(body, ([x]) => h0 - x), s.W, 0.04);
  const between = clip(clip(body, ([x]) => x - h0), ([x]) => h1 - x);
  const SKIN = 0.1;
  for (const [i, side] of SIDES.entries())
    for (const [a, b, door] of spans) {
      const z = side * (s.W / 2 - SKIN / 2);
      const part = cut(between, a, b);
      if (!door) piece(part, SKIN, 0.04, z);
      else {
        piece(clip(part, ([, y]) => D!.y0 - y), SKIN, 0.04, z);
        piece(clip(part, ([, y]) => y - D!.y0), SKIN, 0.04, z, doors[i].paints);
      }
    }
  // The cabin: solid behind the hollow (a van's load space), its walls round it, the roof over it
  piece(clip(s.cabin, ([x]) => h0 - x), cw, CABIN_ROUND);
  const x0s = Math.min(...s.panes.map(([a]) => a)) - 0.03;
  const x1s = Math.max(...s.panes.map(([, b]) => b)) + 0.03;
  const frame = inset(s.cabin, CABIN_ROUND + 0.012);
  let band = clip(clip(frame, ([x]) => x - Math.max(x0s, h0 + 0.01)), ([x]) => x1s - x);
  if (s.sill !== undefined) band = clip(band, ([, y]) => y - (s.sill! - 0.03));
  const wall = clip(s.cabin, ([x]) => x - h0);
  const WALL = 0.03;
  const r0: V2 = h0 > rr[0] ? [h0, rr[1] + ((h0 - rr[0]) / (fr[0] - rr[0])) * (fr[1] - rr[1])] : rr;
  const ROOF = 0.045;
  /** Where a cut through the window band leaves a pillar of the door's frame (either side of the cut) */
  const E = 0.02;
  /** A wall with the windows' band cut out of it */
  const wallPiece = (poly: V2[], hole: V2[], z: number, to: THREE.BufferGeometry[]) => {
    if (poly.length < 3 || Math.abs(area(poly)) < 1e-4) return;
    const sh = shape(poly);
    if (hole.length >= 3 && Math.abs(area(hole)) > 1e-4) sh.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
    to.push(new THREE.ExtrudeGeometry(sh, { depth: WALL, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, z));
  };
  // (the door's under the roof's slab, which stays)
  const underRoof = ([x, y]: V2) => rr[1] + ((x - rr[0]) / (fr[0] - rr[0])) * (fr[1] - rr[1]) - ROOF - 0.004 - y;
  if (wall.length >= 3)
    for (const [i, side] of SIDES.entries())
      for (const [a, b, door] of spans) {
        const part = cut(wall, a, b);
        wallPiece(door ? clip(part, underRoof) : part, cut(band, a + (a > -9 ? E : 0), b - (b < 9 ? E : 0)), side > 0 ? cw / 2 - WALL : -cw / 2, door ? doors[i].paints : paints);
      }
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
    const isGlass = Math.abs(colour.r - glassC.r) + Math.abs(colour.g - glassC.g) + Math.abs(colour.b - glassC.b) < 1e-4;
    // (the side panes are drawn again below, cut at the doors' seams)
    if (isGlass && !(D && Math.abs(a.z) > cw / 2 - 0.01 && Math.abs(b.z) > cw / 2 - 0.01 && Math.abs(c.z) > cw / 2 - 0.01)) glassBits.push(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], 3)));
    return false;
  });
  const details: THREE.BufferGeometry[] = [];
  share(detail, (i) => (i < 0 ? details : doors[i].details));
  // The calipers, fixed to the body behind each wheel's spokes (a front one doesn't steer: behind the spokes
  // nobody sees it, and it costs no draw of its own)
  for (const [x, y, z] of wheelSpots(s)) details.push(paintAll(caliperGeometry(s).applyMatrix4(new THREE.Matrix4().makeRotationY(z < 0 ? Math.PI : 0).setPosition(x, y, z)), CALIPER));
  const dark = (g: THREE.BufferGeometry) => details.push(paintAll(g, BLACKOUT));
  // The band round the side windows with the panes cut out of it (cut at the doors' seams, a pillar of their
  // frames either side of each cut), and the side glass, cut there too
  const inner = inset(s.cabin, CABIN_ROUND + 0.035);
  const panes = s.panes.map(([x0, x1]) => {
    const poly = cut(inner, x0, x1);
    return s.sill !== undefined ? clip(poly, ([, y]) => y - s.sill!) : poly;
  });
  const bandPiece = (a: number, b: number, z: number, to: THREE.BufferGeometry[]) => {
    const outer = cut(band, a, b);
    if (outer.length < 3 || Math.abs(area(outer)) < 1e-4) return;
    const sh = shape(outer);
    for (const pane of panes) {
      const hole = cut(pane, a + (a > -9 ? E : 0), b - (b < 9 ? E : 0));
      if (hole.length >= 3 && Math.abs(area(hole)) > 1e-4) sh.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
    }
    to.push(paintAll(new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }).translate(0, 0, z - 0.006), BLACKOUT));
  };
  for (const [i, side] of SIDES.entries())
    for (const [a, b, door] of spans) {
      bandPiece(a, b, side * (cw / 2 + 0.006), door ? doors[i].details : details);
      if (!D) continue;
      for (const pane of panes) {
        const poly = cut(pane, a, b);
        if (poly.length < 3 || Math.abs(area(poly)) < 1e-4) continue;
        const g = extrude(shape(poly), 0.012).translate(0, 0, side * (cw / 2 + 0.014)).toNonIndexed();
        (door ? doors[i].glass : glassBits).push(new THREE.BufferGeometry().setAttribute('position', g.attributes.position));
      }
    }
  // The windscreen's and the rear window's frames
  dark(framePane(fr, fb, cw - CABIN_ROUND * 2 + 0.02, cw - CABIN_ROUND * 2 - 0.06, mid, 0.03, 0.07, 0.012));
  if (s.rearGlass) dark(framePane(rb, rr, cw - CABIN_ROUND * 2 + 0.02, cw - CABIN_ROUND * 2 - 0.06, mid, 0.03, 0.07, 0.012));
  // The glass, merged (positions and normals only)
  const glassOf = (bits: THREE.BufferGeometry[]) => {
    const g = bits.length ? mergeGeometries(bits)! : new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    g.computeVertexNormals();
    return g;
  };
  const inside = insideOf(s, n, h0, h1);
  // A door's pieces, about its hinge: at its front seam, on the outside of the skin
  const hinge = (g: THREE.BufferGeometry, side: number) => g.translate(-D!.hinge, 0, (-side * s.W) / 2);
  return {
    paint: merge(paints, false)!,
    detail: merge(details, true)!,
    glass: glassOf(glassBits),
    inside,
    wheel: mergeGeometries([stripColour(wheelGeometry(s)), ...brakes(s, low, false).map(stripColour)].map(withColour))!,
    doors:
      D &&
      doors.map((d, i) => ({
        paint: hinge(merge(d.paints, false)!, SIDES[i]),
        detail: hinge(merge(d.details, true)!, SIDES[i]),
        glass: hinge(glassOf(d.glass), SIDES[i]),
        inside: inside.doors[i] && hinge(inside.doors[i]!, SIDES[i]),
      })),
  };
}
const cut = (poly: V2[], a: number, b: number) => clip(clip(poly, ([x]) => x - a), ([x]) => b - x);
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

/** What's inside, coloured per vertex: what stays put, and the pieces that move (carride.ts) */
interface Inside {
  all: THREE.BufferGeometry;
  /** Each front door's card and armrest (in the car's numbers; the shell moves them onto the door's hinge) */
  doors: (THREE.BufferGeometry | undefined)[];
  /** The steering wheel's rim, hub and spokes about its middle, turning about x */
  steer: THREE.BufferGeometry;
  /** The gauges' faces and the strip of light along the dash (lit by night) */
  dash: THREE.BufferGeometry;
  /** A needle from a gauge's middle, turning about x; and where each gauge's middle is, its face tilted back `GAUGE_TILT` */
  needle: THREE.BufferGeometry;
  gauges: THREE.Vector3[];
  /** A wiper's arm and blade along -z from its spindle */
  wiper: THREE.BufferGeometry;
}
/** How far the gauges' faces lean back towards him */
export const GAUGE_TILT = 0.35;

function insideOf(s: CarSpec, n: Interior, h0: number, h1: number): Inside {
  const parts: THREE.BufferGeometry[] = [];
  const doorParts: THREE.BufferGeometry[][] = [[], []];
  const dashParts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, hex: string, to = parts) => void to.push(paintAll(g.index ? g.toNonIndexed() : g, hex));
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, hex: string, rz = 0, to = parts) => add(new THREE.BoxGeometry(w, h, d).rotateZ(rz).translate(x, y, z), hex, to);
  const cw = s.W * s.cabinW;
  const [rb, , fr, fb] = s.cabin;
  const inW = s.W - 0.2 - 0.012;
  const floorY = n.floor;
  const D = n.door;

  // The floor, the door cards (the skins' inner faces, their arches left open for the wheel tubs; cut at the front
  // doors' seams), the headliner
  box(h1 - h0, 0.02, inW, (h0 + h1) / 2, floorY - 0.01, 0, FLOOR);
  const belt = (x: number) => rb[1] + ((x - rb[0]) / (fb[0] - rb[0])) * (fb[1] - rb[1]);
  for (const side of [-1, 1]) {
    const card = clip(clip(clip(bodyPoly(s), ([x]) => x - h0), ([x]) => h1 - x), ([, y]) => y - floorY);
    const pieces: [V2[], THREE.BufferGeometry[]][] =
      D ? [[clip(card, ([x]) => D.back - x), parts], [clip(clip(card, ([x]) => x - D.hinge), ([, y]) => y - floorY), parts], [clip(cut(card, D.back, D.hinge), ([, y]) => y - D.y0), doorParts[side < 0 ? 0 : 1]]] : [[card, parts]];
    for (const [poly, to] of pieces) {
      if (poly.length < 3 || Math.abs(area(poly)) < 1e-4) continue;
      // (facing in: the right one drawn at -x and turned round)
      const g = new THREE.ShapeGeometry(shape(poly.map(([x, y]): V2 => [side > 0 ? -x : x, Math.min(y, belt(x) - 0.03)])));
      if (side > 0) g.rotateY(Math.PI);
      add(g.translate(0, 0, side * (s.W / 2 - 0.106)), CARD, to);
    }
    // An armrest along each door
    const ax = n.hip[0] + 0.05;
    box(Math.min(0.5, h1 - h0 - 0.2), 0.03, 0.05, ax, n.hip[1] + 0.12, side * (s.W / 2 - 0.13), BOLSTER, 0, D && ax > D.back && ax < D.hinge ? doorParts[side < 0 ? 0 : 1] : parts);
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

  // The dash from the wheel to the windscreen's foot, its binnacle and two gauges facing him (lit at night, their
  // needles turning: carride.ts), a strip of light along it, the console
  const [dx, dy] = n.dash;
  const dashBack = n.wheel[0] + 0.05;
  box(h1 - dashBack + 0.02, 0.2, inW, (dashBack + h1) / 2, dy - 0.1, 0, DASH);
  box(0.14, 0.09, 0.26, dashBack + 0.05, dy + 0.02, n.hip[2], DASH);
  const gauges: THREE.Vector3[] = [];
  for (const e of [-1, 1]) {
    // (in front of the binnacle's back, under its hood)
    const g = new THREE.Vector3(dashBack - 0.034, dy + 0.018, n.hip[2] + e * 0.05);
    add(new THREE.CircleGeometry(0.032, 16).rotateY(-Math.PI / 2).rotateZ(-GAUGE_TILT).translate(g.x, g.y, g.z), GAUGE, dashParts);
    // (a darker ring round each, its rim)
    add(new THREE.RingGeometry(0.032, 0.038, 16).rotateY(-Math.PI / 2).rotateZ(-GAUGE_TILT).translate(g.x, g.y, g.z), DASH_RIM, dashParts);
    gauges.push(g);
  }
  box(0.006, 0.005, inW * 0.7, dashBack - 0.013, dy - 0.035, -n.hip[2] * 0.3, DASH_LIGHT, 0, dashParts);
  box(Math.max(0.1, dx - n.hip[0] - 0.1), n.hip[1] - floorY - 0.04, 0.12, (dx + n.hip[0]) / 2 + 0.06, (n.hip[1] + floorY) / 2 - 0.02, 0, DASH);
  add(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6).translate(n.hip[0] + 0.25, n.hip[1] + 0.02, 0), METAL);
  add(new THREE.SphereGeometry(0.025, 8, 6).translate(n.hip[0] + 0.25, n.hip[1] + 0.08, 0), STEER);
  // Pedals under the dash
  for (const e of [-0.06, 0.06]) box(0.02, 0.07, 0.05, n.pedals, floorY + 0.06, n.hip[2] + e, METAL, 0.4);
  // The rear-view mirror under the roof behind the windscreen's top, turned to him: its glass a painted view behind
  // (the sky over the road)
  const mirror: THREE.BufferGeometry[] = [];
  const mbox = (w: number, h: number, d: number, x: number, y: number, hex: string) => void mirror.push(paintAll(new THREE.BoxGeometry(w, h, d).translate(x, y, 0).toNonIndexed(), hex));
  mbox(0.03, 0.055, 0.17, 0, 0, BLACKOUT);
  mbox(0.004, 0.022, 0.15, -0.017, 0.011, MIRROR_SKY);
  mbox(0.004, 0.022, 0.15, -0.017, -0.011, MIRROR_ROAD);
  mbox(0.012, 0.05, 0.012, 0.004, 0.05, BLACKOUT);
  for (const g of mirror) parts.push(g.rotateY(-0.25).translate(fr[0] - 0.05, roofY - 0.085, 0));
  // The steering wheel, tilted back towards him, on its column into the dash (the wheel itself turns, about its
  // middle: carride.ts)
  const tilt = n.wheelTilt;
  const steer: THREE.BufferGeometry[] = [];
  const toWheel = (g: THREE.BufferGeometry) => g.rotateY(Math.PI / 2);
  add(toWheel(new THREE.TorusGeometry(n.wheelR, 0.013, 6, 20)), RIM, steer);
  add(toWheel(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10).rotateX(Math.PI / 2)), STEER, steer);
  for (const a of [0, Math.PI / 2, Math.PI]) add(toWheel(new THREE.BoxGeometry(n.wheelR, 0.012, 0.012).translate(n.wheelR / 2, 0, 0).rotateZ(a - Math.PI / 2)), STEER, steer);
  // (a mark at the top of the rim, so you see it turn)
  add(toWheel(new THREE.BoxGeometry(0.014, 0.03, 0.03).translate(0, n.wheelR, 0)), NEEDLE, steer);
  const col = new THREE.CylinderGeometry(0.018, 0.022, 0.24, 8).translate(0, 0.12, 0).rotateZ(-Math.PI / 2 - tilt).translate(n.wheel[0], n.wheel[1], n.wheel[2]);
  add(col, STEER);

  const merged = (g: THREE.BufferGeometry[]) => mergeGeometries(g.map(stripColour).map(withColour))!;
  // A wiper: its arm and blade from the spindle along -z (carride.ts lays it on the windscreen's foot)
  const len = cw * 0.38;
  const wiper = merged([paintAll(new THREE.BoxGeometry(0.012, 0.008, len).translate(0, 0, -len / 2), BLACKOUT), paintAll(new THREE.BoxGeometry(0.008, 0.018, len * 0.85).translate(0.004, 0.006, -len * 0.55), BLACKOUT)]);
  return {
    all: merged(parts),
    doors: doorParts.map((d) => (d.length ? merged(d) : undefined)),
    steer: merged(steer),
    dash: merged(dashParts),
    needle: merged([paintAll(new THREE.BoxGeometry(0.004, 0.027, 0.005).translate(-0.004, 0.01, 0), NEEDLE)]),
    gauges,
    wiper,
  };
}

/* ---------- Fitting out ---------- */

const glassMat = () =>
  (theGlass ??= toon('#a6e6f7', { transparent: true, opacity: 0.32, depthWrite: false, name: 'car-glass' }));
let theGlass: THREE.MeshToonMaterial | null = null;

/** The dash's light: the gauges' faces and needles, lit faintly by day and fully at night (under the bloom's threshold) */
const dashMat = () => (theDash ??= lit(new THREE.MeshBasicMaterial({ vertexColors: true, name: 'car-dash' }), 0.8, 1));
let theDash: THREE.MeshBasicMaterial | null = null;

const X = new THREE.Vector3(1, 0, 0);
const grip = new THREE.Vector3();
const ankle = new THREE.Vector3();

/** Your car's pieces that move (carride.ts drives them) */
export interface Moving {
  /** Everything but the wheels: it rides the springs over them */
  body: THREE.Group;
  /** The wheels' pivots (cars.ts `wheelSpots()`'s order) */
  wheels: THREE.Object3D[];
  /** The front doors about their hinges (rotation.y), the driver's then the passenger's, if it has them */
  doors: THREE.Object3D[];
  /** The steering wheel (rotation.x), the gauges' needles (speed, revs; rotation.x), the wipers (rotation.y) */
  steer: THREE.Object3D;
  needles: THREE.Object3D[];
  wipers: THREE.Object3D[];
  /** His hands on the wheel, turned this far (radians) */
  hands(turn: number): void;
  /** Who's at the wheel */
  driver(): Degen | null;
}

/** Fit your car out: its hollow shell, see-through glass, the inside, its wheels' brakes, and a seat for you */
export function fitOut(car: Car, o: { low: boolean; ready(obj: THREE.Object3D): void }) {
  if (car.group.userData.fitted) return;
  car.group.userData.fitted = true;
  const s = car.spec;
  const n = INTERIORS[s.id];
  const look = cleanLook(car.group.userData.look);
  const bare = s.id in STOCK_PARTS ? bareOf(s.id as PlayerCar, look) : '';
  const key = `${s.id}|${bare}`;
  let sh = shells.get(key);
  if (!sh) shells.set(key, (sh = makeShell(s, o.low, bare)));
  const model = carGeometry(s.id, { wheels: false });
  const { detail } = carMaterials();
  // The body on its springs: everything but the wheels in a group of its own, the wheels with their discs and the
  // sidewall's ring
  const body = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  let paint: THREE.Material | null = null;
  for (const c of [...car.group.children]) {
    const m = c as THREE.Mesh;
    if (c.type === 'Group' && c.children[0]) {
      (c.children[0] as THREE.Mesh).geometry = sh.wheel;
      wheels.push(c);
      continue;
    }
    if (m.geometry === model.paint) (m.geometry = sh.paint), (paint = m.material as THREE.Material);
    else if (m.geometry === model.detail) m.geometry = sh.detail;
    body.add(c);
  }
  car.group.add(body);
  const mesh = (g: THREE.BufferGeometry, mat: THREE.Material, to: THREE.Object3D = body, shade = true) => {
    const m = new THREE.Mesh(g, mat);
    m.castShadow = m.receiveShadow = shade;
    to.add(m);
    return m;
  };
  const glass = (g: THREE.BufferGeometry, to: THREE.Object3D) => (fx(mesh(g, glassMat(), to, false)).renderOrder = 1);
  glass(sh.glass, body);
  mesh(sh.inside.all, detail);
  mesh(sh.inside.dash, dashMat(), body, false);
  // The steering wheel on its column, the needles in their gauges
  const pivot = (at: THREE.Vector3Tuple, tilt: number) => {
    const p = new THREE.Object3D();
    p.position.set(...at);
    p.rotation.z = -tilt;
    body.add(p);
    return p;
  };
  const steer = mesh(sh.inside.steer, detail, pivot(n.wheel, n.wheelTilt));
  const needles = sh.inside.gauges.map((g) => mesh(sh.inside.needle, dashMat(), pivot(g.toArray(), GAUGE_TILT), false));
  // The wipers on their spindles at the windscreen's foot, lying along it (their local y out of the glass)
  const [, , fr, fb] = s.cabin;
  const cw = s.W * s.cabinW;
  const up = new THREE.Vector3(fr[0] - fb[0], fr[1] - fb[1], 0).normalize();
  const out = new THREE.Vector3(up.y, -up.x, 0);
  const lay = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(up, out, new THREE.Vector3().crossVectors(up, out)));
  const wipers = [-0.34, 0].map((k) => {
    const p = new THREE.Object3D();
    p.quaternion.copy(lay);
    p.position.set(fb[0], fb[1], k * cw).addScaledVector(up, 0.05).addScaledVector(out, 0.035);
    body.add(p);
    return mesh(sh.inside.wiper, detail, p, false);
  });
  // The front doors on their hinges: the paint, what lies on them, their glass and their cards
  const doors: THREE.Object3D[] = [];
  if (sh.doors && n.door && paint)
    for (const [i, d] of sh.doors.entries()) {
      const door = new THREE.Object3D();
      door.position.set(n.door.hinge, 0, ((i ? 1 : -1) * s.W) / 2);
      body.add(door);
      mesh(d.paint, paint, door);
      mesh(d.detail, detail, door);
      glass(d.glass, door);
      if (d.inside) mesh(d.inside, detail, door);
      doors.push(door);
    }

  // You at the wheel
  let driver: Degen | null = null;
  const toTorso = new THREE.Matrix4();
  const onWheel = new THREE.Matrix4().compose(new THREE.Vector3(...n.wheel), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -n.wheelTilt)), new THREE.Vector3(1, 1, 1));
  // His hands at a quarter to three (arm 0, the rig's -x, is on the car's right, +z), the wheel turned `turn`
  const hands = (turn: number) => {
    if (!driver) return;
    for (const i of [0, 1] as const) {
      grip.set(0, 0, (i === 0 ? 1 : -1) * n.wheelR).applyAxisAngle(X, turn).applyMatrix4(onWheel).applyMatrix4(toTorso);
      reachArm(driver.pose, i, grip);
    }
    driver.update();
  };
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
    body.add(g);
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
    toTorso.compose(g.position, g.quaternion, g.scale).multiply(torsoFrame(p, toTorso.clone())).invert();
    hands(0);
  };
  rideOn(car, { body, wheels, doors, steer, needles, wipers, hands, driver: () => driver });
  // Dressed as the garage left it (vehicle plan Phase 5)
  if (paint && s.id in STOCK_PARTS) dress(car, look, { body, wheels, doors, paint, low: o.low });
  o.ready(car.group);
}
