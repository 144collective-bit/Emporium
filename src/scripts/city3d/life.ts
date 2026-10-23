/*
 * Everything that moves on its own: traffic that stops at the lights, buses,
 * Degen-style people on the sidewalks, boats, drones, the blimp and birds.
 * Vehicles and people are instanced, so a crowd costs a handful of draw calls.
 */
import * as THREE from 'three';
import { FONT_DISPLAY, PAL, canvasTex, fx, glowTex, lit, mergeMeshes, neon, rand, toon } from './kit';
import { CENTER, SLAB, type Tick } from './world';

import { PLAN, distToStreet, outset, pointAt, streetLength } from './streetplan';
import { DOWNTOWN, EXT, MARKET } from './layout';
import { BOAT_LANES, DECK_STROLLS, DECK_Y } from './liberty';
import { JUNCTIONS, ROUTES, SPOTS, lightState, phaseOf, pointOn, rightOf, type Junction, type Phase, type Pt, type Route } from './routes';
import { CARS, PAINTS, carGeometry, carMaterials, theFarCars, type CarId } from './cars';
import { isNear, tileKey, tileOf } from './tiles';
import type { Idle } from './landmarks';
import { TRENCH_WALKS } from './projects';
import { inTrenches } from './trenches';
import { CROWD_VIEW, HIP_HEIGHT, cityOutfit, createCrowd } from './character';
import { CLIP_SECONDS, WALK_STRIDE } from './crowdclips';

export interface LifeOpts {
  cars: number;
  buses: number;
  walkers: number;
  /** Leave the characters' small details out (phones) */
  light?: boolean;
  /** How far from the camera a car is drawn in full (beyond, its far form: growth plan Phase 2) */
  far?: number;
}

/* ======================================================================
   Traffic
   ====================================================================== */

interface Vehicle {
  route: Route;
  /** Distance along the route, and the segment it's on */
  p: number;
  seg: number;
  v: number;
  vmax: number;
  len: number;
  model: CarId;
  slot: number;
  /** Where it is this frame (for following, for your own car to bump into), and which way it faces */
  x: number;
  z: number;
  yaw: number;
  fx: number;
  fz: number;
  /** Its placing this frame */
  matrix: THREE.Matrix4;
  /** Drawn in full (near the camera) or its far form, and its far form's instance (cars.ts `FarCars`) */
  near: boolean;
  far: number;
}

const ROAD_Y = 0.035;

/** The player in walk mode: cars stop rather than drive through them. `r` is how far they reach (more in a car). */
export const walker = { x: 0, z: 0, on: false, r: 0 };
/** Anything else in the road the traffic stops short of (a taxi pulled up or on its way: taxi.ts) */
export const stoppers: { x: number; z: number; r: number; on: boolean }[] = [];
/** Where the traffic and the people on the sidewalks are, so your car can bump them softly (drive.ts) */
export const bodies = {
  cars: [] as { x: number; z: number; yaw: number; len: number; model: CarId }[],
  people: [] as { x: number; z: number }[],
};
/**
 * The traffic and the boats are spent where you are (growth plan Phase 7): a car further than `POOL_R`
 * from what the camera's looking at, out of sight (or further than `POOL_FAR`, in sight or not), is put
 * back on the road somewhere within `POOL_R` of it, out of sight; a boat drifting past `BOAT_R` comes
 * round from the other side
 */
const POOL_R = 170;
const POOL_FAR = 320;
/** A car is only put back where you can see it this far from the camera, or further */
const POOL_SEEN = 130;
const BOAT_R = 170;

/** The spots cars can be put back at (routes.ts SPOTS), by tile */
const SPOTS_BY_TILE = (() => {
  const m = new Map<string, typeof SPOTS>();
  for (const s of SPOTS) {
    const k = tileKey(...tileOf(s.x, s.z));
    let l = m.get(k);
    if (!l) m.set(k, (l = []));
    l.push(s);
  }
  return m;
})();
/** The spots within r of x, z */
function spotsNear(x: number, z: number, r: number) {
  const out: typeof SPOTS = [];
  const [i0, j0] = tileOf(x - r, z - r);
  const [i1, j1] = tileOf(x + r, z + r);
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) {
      const l = SPOTS_BY_TILE.get(tileKey(i, j));
      if (l) for (const s of l) if (Math.hypot(s.x - x, s.z - z) < r) out.push(s);
    }
  return out;
}

/** The traffic's mix of cars, repeated (buses come first, as many as the quality tier allows) */
const MIX: CarId[] = ['hatch', 'sedan', 'van', 'hatch', 'pickup', 'sedan', 'coupe', 'hatch', 'sedan', 'van', 'pickup'];

function lightBox(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d);
}

function buildTraffic(scene: THREE.Scene, opts: LifeOpts, tick: (f: Tick) => void) {
  const vehicles: Vehicle[] = [];
  const counts = new Map<CarId, number>();
  const total = opts.cars + opts.buses;
  // Every car starts somewhere round the home view, a little apart
  const start = spotsNear(CENTER.x, CENTER.z, POOL_R);
  for (let i = 0; i < total; i++) {
    const model: CarId = i < opts.buses ? 'bus' : MIX[(i - opts.buses) % MIX.length];
    const spot = start[Math.floor(((i * 7919) % 1000) / 1000 * start.length)] ?? SPOTS[i % SPOTS.length];
    const route = ROUTES[spot.r];
    const slot = counts.get(model) ?? 0;
    counts.set(model, slot + 1);
    vehicles.push({
      route,
      p: spot.p,
      seg: 0,
      v: 0,
      vmax: model === 'bus' ? 3.2 : model === 'van' || model === 'pickup' ? 3.8 + rand() * 1.5 : 4.2 + rand() * 2,
      len: CARS[model].L,
      model,
      slot,
      x: 0,
      z: 0,
      yaw: 0,
      fx: 1,
      fz: 0,
      matrix: new THREE.Matrix4(),
      near: true,
      far: -1,
    });
  }
  /** Put a car back on the road near x, z: out of sight, clear of the others; it keeps its speed */
  const respawn = (v: Vehicle, x: number, z: number) => {
    const near = spotsNear(x, z, POOL_R);
    for (let tries = 0; tries < 16 && near.length; tries++) {
      const s = near[Math.floor(rand() * near.length)];
      if (Math.hypot(s.x - x, s.z - z) < 40) continue;
      carBall.center.set(s.x, 0.6, s.z);
      carBall.radius = 3;
      // In sight only far off, past what the camera's looking at (where it's a speck in its far form)
      const fromEye = Math.hypot(s.x - CROWD_VIEW.eye.x, s.z - CROWD_VIEW.eye.z);
      if (CROWD_VIEW.frustum.intersectsSphere(carBall) && (fromEye < POOL_SEEN || fromEye < Math.hypot(x - CROWD_VIEW.eye.x, z - CROWD_VIEW.eye.z) + 20)) continue;
      if (vehicles.some((o) => o !== v && Math.hypot(o.x - s.x, o.z - s.z) < 9)) continue;
      v.route = ROUTES[s.r];
      v.p = s.p;
      v.seg = 0;
      place(v);
      return;
    }
  };
  const place = (v: Vehicle) => {
    const o = pointOn(v.route, v.p, v.seg);
    v.seg = o.seg;
    [v.x, v.z] = o.at;
    [v.fx, v.fz] = o.dir;
    v.yaw = Math.atan2(-v.fz, v.fx);
  };
  vehicles.forEach(place);

  bodies.cars = vehicles;
  // One fleet per model: its paint (each car its own colour) and its details; the bus's windows glow at night
  const mats = carMaterials();
  const busGlow = lit(new THREE.MeshToonMaterial({ color: '#2a3b66', emissive: '#ffd36b' }), 0.05, 1.6);
  /**
   * Each model's meshes (in full, and its far form), and this frame's cars: only the ones in view are
   * drawn, those in the sun's shadow box first (`shadow` of them), so the shadow map leaves the rest out
   */
  interface Fleet {
    meshes: THREE.InstancedMesh[];
    front: Vehicle[];
    back: Vehicle[];
    view: number;
    shadow: number;
  }
  const fleets = new Map<CarId, Fleet>();
  const newFleet = (meshes: THREE.InstancedMesh[]): Fleet => {
    const f: Fleet = { meshes, front: [], back: [], view: 0, shadow: 0 };
    for (const m of meshes) {
      m.castShadow = true;
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.onBeforeShadow = () => void (m.count = f.shadow);
      m.onBeforeRender = () => void (m.count = f.view);
      scene.add(m);
    }
    m0(meshes).setColorAt(0, new THREE.Color());
    m0(meshes).instanceColor!.setUsage(THREE.DynamicDrawUsage);
    return f;
  };
  const m0 = (list: THREE.InstancedMesh[]) => list[0];
  const farDist = opts.far ?? Infinity;
  const moving: THREE.InstancedMesh[] = [];
  /** Each car's own paint (by its slot in its model's fleet) */
  const paintOf = new Map<CarId, THREE.Color[]>();
  for (const [model, n] of counts) {
    const g = carGeometry(model);
    const list = [new THREE.InstancedMesh(g.paint, mats.paint, n), new THREE.InstancedMesh(g.detail, mats.detail, n)];
    if (g.glow) list.push(new THREE.InstancedMesh(g.glow, busGlow, n));
    const paints = PAINTS[model];
    paintOf.set(model, Array.from({ length: n }, (_, i) => new THREE.Color(paints[(i * 5 + 2) % paints.length])));
    fleets.set(model, newFleet(list));
    moving.push(...list);
  }
  // Each car's far form, in its own paint, in the city's one mesh of far cars (one draw for all of them)
  const farCars = theFarCars();
  for (const v of vehicles) v.far = farCars.add(v.model, paintOf.get(v.model)![v.slot]);
  const nVeh = vehicles.length;
  const head = new THREE.InstancedMesh(lightBox(0.03, 0.08, 0.17), neon('#fff6c8', 0.8, 3), nVeh * 2);
  const tail = new THREE.InstancedMesh(lightBox(0.03, 0.07, 0.15), neon('#ff2b2b', 0.8, 3), nVeh * 2);
  for (const m of [head, tail]) {
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    moving.push(m);
  }
  scene.add(fx(head), fx(tail));

  // Headlight beams on the road
  const beamPos = new Float32Array(nVeh * 3);
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPos, 3));
  const beamMat = lit(new THREE.PointsMaterial({ color: '#fff0c0', map: glowTex, size: 1.6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0, 0.28);
  scene.add(fx(new THREE.Points(beamGeo, beamMat)));


  // Traffic lights at the lit junctions: one pole on the right of each way in, facing the traffic it holds.
  // Poles, housings and lamps are three instanced meshes, the lamps lit per instance.
  const colors = { r: '#ff2b2b', y: '#ffc23d', g: '#2bff88' };
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const poleMats: THREE.Matrix4[] = [];
  const boxMats: THREE.Matrix4[] = [];
  const lamps: { m: THREE.Matrix4; j: Junction; phase: Phase; c: 'r' | 'y' | 'g' }[] = [];
  const tq = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  for (const j of JUNCTIONS) {
    if (!j.lit) continue;
    for (const s of j.streets) {
      // Each way the street comes into the junction: from before it along the street and from after it
      // (a diagonal only from its far end; round a loop, both)
      const len = streetLength(s);
      let along = 0;
      for (let d = 0, best = Infinity; d <= len; d += 0.5) {
        const q = pointAt(s, d).at;
        const e = Math.hypot(q[0] - j.at[0], q[1] - j.at[1]);
        if (e < best) [best, along] = [e, d];
      }
      const ins: Pt[] = [];
      for (const back of [-6, 6]) {
        const d = along + back;
        if (s.loop) ins.push(pointAt(s, (d + len) % len).at);
        else if (d >= 0 && d <= len) ins.push(pointAt(s, d).at);
      }
      for (const from of ins) {
        const l = Math.hypot(j.at[0] - from[0], j.at[1] - from[1]);
        const u: Pt = [(j.at[0] - from[0]) / l, (j.at[1] - from[1]) / l];
        const r = rightOf(...u);
        // Back from the junction along the kerb until clear of the other streets' asphalt
        let x = 0;
        let z = 0;
        for (let back = 0; back < 12; back += 0.1) {
          x = j.at[0] - u[0] * back + r[0] * (s.half + 0.35);
          z = j.at[1] - u[1] * back + r[1] * (s.half + 0.35);
          if (j.streets.every((o) => o === s || distToStreet(o, [x, z]) > o.half + 0.3)) break;
        }
        const ry = Math.atan2(-u[0], -u[1]);
        const phase = phaseOf(u[0], u[1]);
        tq.setFromAxisAngle(yAxis, ry);
        poleMats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, SLAB + 0.95, z), tq, new THREE.Vector3(0.07, 1.9, 0.07)));
        boxMats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, SLAB + 1.75, z), tq, new THREE.Vector3(0.2, 0.55, 0.16)));
        (['r', 'y', 'g'] as const).forEach((c, k) => {
          const off = new THREE.Vector3(0, 0, 0.085).applyAxisAngle(yAxis, ry);
          lamps.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x + off.x, SLAB + 1.92 - k * 0.17, z + off.z), tq, new THREE.Vector3(1, 1, 1)), j, phase, c });
        });
      }
    }
  }
  const instanced = (geo: THREE.BufferGeometry, mat: THREE.Material, list: THREE.Matrix4[]) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => im.setMatrixAt(i, m));
    return im;
  };
  const poles = instanced(unit, toon('#1b1830'), poleMats);
  poles.castShadow = true;
  const boxes = instanced(unit, toon('#14121f'), boxMats);
  const lampMesh = instanced(
    new THREE.CircleGeometry(0.06, 12),
    new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    lamps.map((l) => l.m)
  );
  lamps.forEach((_, i) => lampMesh.setColorAt(i, new THREE.Color(1, 1, 1)));
  scene.add(poles, boxes, fx(lampMesh));
  const lampCol = new THREE.Color();
  const base = { r: new THREE.Color(colors.r), y: new THREE.Color(colors.y), g: new THREE.Color(colors.g) };
  /** The phases with a car inside each junction */
  const occupied = JUNCTIONS.map(() => new Set<Phase>());

  const M = new THREE.Matrix4();
  const L = new THREE.Matrix4();
  const T = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const carBall = new THREE.Sphere();

  /** How fast a car may go to stop short of someone (or something) in the road ahead of it */
  const shortOf = (v: { x: number; z: number; fx: number; fz: number; len: number }, w: { x: number; z: number; r: number }) => {
    const ahead = (w.x - v.x) * v.fx + (w.z - v.z) * v.fz - v.len / 2 - w.r;
    const side = Math.abs((w.x - v.x) * v.fz - (w.z - v.z) * v.fx);
    return ahead > -0.2 - w.r && ahead < 4 && side < 1.0 + w.r * 0.6 ? Math.max(0, (ahead - 0.8) * 1.8) : Infinity;
  };

  tick(({ t, dt, night }) => {
    // Lamp states
    lamps.forEach((l, i) => {
      const s = lightState(l.j, l.phase, t);
      lampMesh.setColorAt(i, lampCol.copy(base[l.c]).multiplyScalar(s === l.c ? 1.6 + night * 1.6 : 0.12));
    });
    lampMesh.instanceColor!.needsUpdate = true;

    // Junctions with a vehicle still inside them, by the phase it came in on
    for (const o of occupied) o.clear();
    for (const v of vehicles) for (const s of v.route.stops) if (v.p + v.len / 2 > s.enter && v.p - v.len / 2 < s.exit) occupied[s.j.ix].add(s.phase);

    for (const v of vehicles) {
      let target = v.vmax;
      // Follow whoever is ahead going the same way (any route: routes share lanes)
      for (const o of vehicles) {
        if (o === v || o.fx * v.fx + o.fz * v.fz < 0.5) continue;
        const rx = o.x - v.x;
        const rz = o.z - v.z;
        const along = rx * v.fx + rz * v.fz;
        if (along <= 0 || along > 12) continue;
        if (Math.abs(rx * v.fz - rz * v.fx) > 0.9) continue;
        const gap = along - (o.len + v.len) / 2;
        target = Math.min(target, Math.max(0, (gap - 0.9) * 1.6));
      }
      // Stop lines: just before each junction, for red, late yellow or traffic still crossing the other way
      for (const s of v.route.stops) {
        const d = s.enter - 1.0 - (v.p + v.len / 2);
        if (d < -0.05 || d > 10) continue;
        const light = s.j.lit ? lightState(s.j, s.phase, t) : 'g';
        let blocked = false;
        for (const ph of occupied[s.j.ix]) if (ph !== s.phase) blocked = true;
        if (light === 'r' || (light === 'y' && d > 1.2) || blocked) target = Math.min(target, Math.max(0, d * 1.3));
      }
      // Someone walking in the road ahead (or anything else in it): stop short of them
      if (walker.on) target = Math.min(target, shortOf(v, walker));
      for (const w of stoppers) if (w.on) target = Math.min(target, shortOf(v, w));
      const acc = target > v.v ? 1.8 : 5;
      v.v += Math.max(-acc * dt, Math.min(acc * dt, target - v.v));
      v.p += v.v * dt;
      // Round and round: every route is a loop
      if (v.p > v.route.len) {
        v.p -= v.route.len;
        v.seg = 0;
      }
    }
    // Spent where you are: a car far off and out of sight goes back on the road near you, out of sight
    if (CROWD_VIEW.on) {
      const f = CROWD_VIEW.focus;
      for (const v of vehicles) {
        const d = Math.hypot(v.x - f.x, v.z - f.z);
        if (d < POOL_R) continue;
        carBall.center.set(v.x, 0.6, v.z);
        carBall.radius = v.len / 2 + 1;
        if (d < POOL_FAR && CROWD_VIEW.frustum.intersectsSphere(carBall)) continue;
        respawn(v, f.x, f.z);
      }
    }

    // Instances: the cars in view, those in the sun's shadow box first (the shadow map draws only them),
    // in full near the camera and in their far form beyond (culled by three.js, one car at a time)
    for (const f of fleets.values()) f.front.length = f.back.length = 0;
    let hi = 0;
    vehicles.forEach((v, idx) => {
      place(v);
      q.setFromAxisAngle(up, v.yaw);
      M.makeRotationFromQuaternion(q).setPosition(v.x, ROAD_Y, v.z);
      v.matrix.copy(M);
      v.near = !CROWD_VIEW.on || isNear(Math.hypot(v.x - CROWD_VIEW.eye.x, CROWD_VIEW.eye.y, v.z - CROWD_VIEW.eye.z), farDist, v.near);
      farCars.show(v.far, !v.near);
      const f = fleets.get(v.model)!;
      if (!v.near) farCars.place(v.far, M);
      else if (!CROWD_VIEW.on) f.front.push(v);
      else {
        carBall.center.set(v.x, 0.6, v.z);
        carBall.radius = v.len / 2 + 0.6;
        const shadow = !CROWD_VIEW.shadowOn || CROWD_VIEW.shadow.intersectsSphere(carBall);
        if (shadow) f.front.push(v);
        else if (CROWD_VIEW.frustum.intersectsSphere(carBall)) f.back.push(v);
      }
      const g = carGeometry(v.model);
      for (let k = 0; k < 2; k++) {
        head.setMatrixAt(hi, L.multiplyMatrices(M, T.makeTranslation(...g.head[k])));
        tail.setMatrixAt(hi, L.multiplyMatrices(M, T.makeTranslation(...g.tail[k])));
        hi++;
      }
      beamPos.set([v.x + v.fx * (v.len / 2 + 1.4), 0.06, v.z + v.fz * (v.len / 2 + 1.4)], idx * 3);
    });
    for (const [model, f] of fleets) {
      const paints = paintOf.get(model)!;
      {
        let k = 0;
        for (const v of [...f.front, ...f.back]) {
          for (const m of f.meshes) m.setMatrixAt(k, v.matrix);
          f.meshes[0].setColorAt(k, paints[v.slot]);
          k++;
        }
        f.shadow = f.front.length;
        f.view = k;
        f.meshes[0].instanceColor!.needsUpdate = true;
        // (no draw call at all for a fleet with nobody in it)
        for (const m of f.meshes) m.visible = k > 0;
      }
    }
    for (const m of moving) m.instanceMatrix.needsUpdate = true;
    beamGeo.attributes.position.needsUpdate = true;
  });
}

/* ======================================================================
   People
   ====================================================================== */

/** A closed walk round a block on its sidewalk: corners, and the distance along it at each */
interface Loop {
  pts: Pt[];
  cum: number[];
  len: number;
}
interface Person {
  kind: 'walk' | 'idle';
  loop?: Loop;
  /** The corner the walker last passed */
  seg: number;
  /** Distance from the kerb: each lane has its own, so walkers never share a line */
  inset: number;
  /** Standing height (or seat height for someone sitting) */
  y?: number;
  act?: Idle['act'];
  /** How big (PERSON_SCALE unless set: kids) */
  scale?: number;
  /** How far they've walked in all (their walk is played at its stride from it) */
  walked: number;
  u: number;
  dir: 1 | -1;
  speed: number;
  phase: number;
  x: number;
  z: number;
  ry: number;
  /** Facing actually shown, eased towards ry so corners turn smoothly */
  face: number;
}

/** Sidewalk lanes round the outside of a block: two each way, each at its own distance from the lot and its own pace */
const WALK_LANES: { inset: number; dir: 1 | -1; speed: number }[] = [
  { inset: -0.16, dir: 1, speed: 0.6 },
  { inset: -0.31, dir: 1, speed: 0.52 },
  { inset: -0.47, dir: -1, speed: 0.56 },
  { inset: -0.62, dir: -1, speed: 0.48 },
];
const PERSON_SCALE = 0.66;
/** How far the hips sit above the feet when seated, at PERSON_SCALE */
const SEAT_DROP = (HIP_HEIGHT - 0.03) * PERSON_SCALE;

function buildPeople(scene: THREE.Scene, opts: LifeOpts, crowd: Idle[], tick: (f: Tick) => void) {
  const people: Person[] = [];
  // Round downtown's blocks (the square and the pocket parks too), and the south row's (the street life across the river),
  // and up and down Liberty Bridge's walkway, up on its arches
  const walks: { poly: Pt[]; y?: number }[] = [
    ...PLAN.blocks.filter((b) => b.id.startsWith('dt-') || (b.use === 'district' && b.ref!.startsWith('S'))).map((b) => ({ poly: b.poly })),
    ...DECK_STROLLS.map((poly) => ({ poly, y: DECK_Y })),
  ];
  // ...and round The Trenches' blocks nearest The Block, with walkers of their own (so downtown keeps its crowd)
  const town = walks.length;
  walks.push(...PLAN.blocks.filter((b) => TRENCH_WALKS.includes(b.id)).map((b) => ({ poly: b.poly })));
  const walkers = Math.round((opts.walkers * walks.length) / town);
  const blocks = walks.map((w) => w.poly);
  const loops = new Map<string, Loop>();
  const loopOf = (b: number, inset: number) => {
    const key = `${b}:${inset}`;
    let l = loops.get(key);
    if (!l) {
      const pts = outset(blocks[b], -inset);
      const cum = [0];
      for (let i = 1; i <= pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % pts.length][0] - pts[i - 1][0], pts[i % pts.length][1] - pts[i - 1][1]));
      loops.set(key, (l = { pts, cum, len: cum.at(-1)! }));
    }
    return l;
  };
  // Spread walkers evenly round each lane. Everyone in a lane keeps the same
  // pace, so nobody walks through the person in front.
  const perLane = new Map<string, number[]>();
  for (let i = 0; i < walkers; i++) {
    const key = `${i % blocks.length}:${Math.floor(i / blocks.length) % WALK_LANES.length}`;
    if (!perLane.has(key)) perLane.set(key, []);
    perLane.get(key)!.push(i);
  }
  for (const [key, members] of perLane) {
    const [b, l] = key.split(':').map(Number);
    const lane = WALK_LANES[l];
    const loop = loopOf(b, lane.inset);
    const off = rand() * loop.len;
    members.forEach((_, k) => {
      people.push({
        kind: 'walk',
        loop,
        seg: 0,
        inset: lane.inset,
        y: walks[b].y,
        u: (off + (k / members.length) * loop.len) % loop.len,
        dir: lane.dir,
        speed: lane.speed,
        phase: rand() * 6,
        x: 0,
        z: 0,
        ry: 0,
        face: NaN,
        walked: 0,
      });
    });
  }
  // Phones (the trim): every other idle person in The Trenches and downtown (the square, the market, the landmarks)
  const busy = (c: Idle) =>
    inTrenches(c.x, c.z) || (c.x > -6 && c.x < DOWNTOWN + 6 && c.z > -6 && c.z < DOWNTOWN + 6) || (c.x > MARKET.ox - 2 && c.x < MARKET.ox + 11 && c.z > MARKET.oz - 2 && c.z < MARKET.oz + 11);
  let every = 0;
  const idlers = opts.light ? crowd.filter((c) => !busy(c) || every++ % 2 === 0) : crowd;
  for (const c of idlers) people.push({ kind: 'idle', seg: 0, inset: 0, u: 0, dir: 1, speed: 0, phase: rand() * 6, x: c.x, z: c.z, y: c.y, act: c.act, scale: c.scale, ry: c.ry, face: c.ry, walked: 0 });
  bodies.people = people;

  // Everyone is the shared Degen body in a city outfit: suits and hoodies, bags, headphones
  const people3d = createCrowd(
    scene,
    people.map(() => cityOutfit(rand)),
    { light: opts.light }
  );
  tick(({ t, dt }) => {
    people.forEach((p, i) => {
      if (p.kind === 'walk') {
        const lp = p.loop!;
        p.u = (p.u + p.dir * p.speed * dt + lp.len) % lp.len;
        // The side of the block they're on
        let k = p.seg;
        while (lp.cum[k + 1] < p.u) k++;
        while (lp.cum[k] > p.u) k--;
        p.seg = k;
        const a = lp.pts[k];
        const c = lp.pts[(k + 1) % lp.pts.length];
        const f = (p.u - lp.cum[k]) / (lp.cum[k + 1] - lp.cum[k] || 1);
        p.x = a[0] + (c[0] - a[0]) * f;
        p.z = a[1] + (c[1] - a[1]) * f;
        // Facing along the side (reversed when walking the other way round)
        p.ry = Math.atan2(c[0] - a[0], c[1] - a[1]) + (p.dir === -1 ? Math.PI : 0);
        p.walked += p.speed * dt;
      }
      // Each plays a baked clip (crowdclips.ts): the walk at its stride, so their feet stay put on the pavement;
      // the rest from where their own offset puts them in it
      const loop = t / CLIP_SECONDS + p.phase / 6;
      // Turn corners over a few frames instead of snapping
      if (Number.isNaN(p.face)) p.face = p.ry;
      const turn = Math.atan2(Math.sin(p.ry - p.face), Math.cos(p.ry - p.face));
      p.face += turn * Math.min(1, dt * 9);
      const y = p.act === 'sit' ? (p.y ?? SLAB) - SEAT_DROP : (p.y ?? SLAB);
      if (p.kind === 'walk') people3d.set(i, p.x, y, p.z, p.face, PERSON_SCALE, 'walk', p.walked / (WALK_STRIDE * PERSON_SCALE) + p.phase / 6);
      else people3d.set(i, p.x, y, p.z, p.face, p.scale ?? PERSON_SCALE, p.act === 'sit' ? 'sit' : p.act === 'chat' ? 'chat' : p.act === 'queue' ? 'idle' : 'look', loop);
    });
    people3d.commit();
  });
}

/* ======================================================================
   River, sky traffic
   ====================================================================== */

function buildBoats(scene: THREE.Scene, tick: (f: Tick) => void) {
  const boats: { g: THREE.Group; x: number; z: number; v: number; ph: number }[] = [];
  const wakeMat = new THREE.MeshBasicMaterial({ color: '#cfefff', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, map: glowTex });
  const specs: [string, number, number][] = [
    // Spread across the river, each down the middle of one of Liberty Bridge's arches (liberty.ts)
    ['#f3f2f7', BOAT_LANES[0], 1.1],
    ['#e23b3b', BOAT_LANES[2], -0.8],
    ['#ffd23f', BOAT_LANES[1], 0.6],
  ];
  specs.forEach(([color, z, v], i) => {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.6), toon(color));
    hull.position.y = 0.1;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 4).rotateZ(-Math.PI / 2).rotateX(Math.PI / 4), toon(color));
    bow.position.set(1.0, 0.1, 0);
    bow.scale.set(1, 0.5, 1);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.32, 0.46), toon('#2a3b66'));
    cabin.position.set(-0.2, 0.4, 0);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), neon(PAL.warm, 0.5, 3));
    lamp.position.set(-0.2, 0.62, 0);
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), wakeMat);
    wake.rotation.x = -Math.PI / 2;
    wake.position.set(-1.4, 0.03, 0);
    // The hull, bow and cabin are one mesh
    g.add(mergeMeshes([hull, bow, cabin], { cast: true, receive: true }), fx(lamp), fx(wake));
    if (v < 0) g.rotation.y = Math.PI;
    scene.add(g);
    boats.push({ g, x: CENTER.x + (i - 1) * 25, z, v, ph: rand() * 6 });
  });
  tick(({ t, dt }) => {
    for (const b of boats) {
      b.x += b.v * dt;
      // The whole river, but only round you: a boat drifting off one way comes back round from the other
      const f = CROWD_VIEW.on ? CROWD_VIEW.focus.x : CENTER.x;
      const lo = Math.max(EXT[0] + 6, f - BOAT_R);
      const hi = Math.min(EXT[1] - 6, f + BOAT_R);
      if (b.x > hi) b.x = lo + ((b.x - hi) % (hi - lo));
      if (b.x < lo) b.x = hi - ((lo - b.x) % (hi - lo));
      b.g.position.set(b.x, 0.02 + Math.sin(t * 1.6 + b.ph) * 0.03, b.z);
      b.g.rotation.z = Math.sin(t * 1.2 + b.ph) * 0.03;
    }
  });
}

function buildDrones(scene: THREE.Scene, tick: (f: Tick) => void) {
  const drones: { g: THREE.Group; ph: number; r: number; h: number; blink: THREE.Mesh }[] = [];
  // Spinning rotors read as blurred discs: one see-through mesh for all four
  const blur = new THREE.MeshBasicMaterial({ color: '#c9c4e6', transparent: true, opacity: 0.45, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const parts = [new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), toon('#1b1830'))];
    const discs: THREE.Mesh[] = [];
    for (const [x, z] of [
      [0.22, 0.22],
      [-0.22, 0.22],
      [0.22, -0.22],
      [-0.22, -0.22],
    ]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.04), toon('#1b1830'));
      arm.position.set(x, 0.04, z);
      parts.push(arm);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.12, 14).rotateX(-Math.PI / 2), blur);
      disc.position.set(x, 0.07, z);
      discs.push(disc);
    }
    g.add(mergeMeshes(parts), fx(mergeMeshes(discs, { cast: false, receive: false })));
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), neon(i % 2 ? '#2bff88' : '#ff2b2b', 1.5, 4));
    blink.position.y = -0.06;
    g.add(fx(blink));
    scene.add(g);
    drones.push({ g, ph: i * 1.7, r: 6 + i * 3.2, h: 6 + (i % 3) * 1.6, blink });
  }
  tick(({ t }) => {
    for (const d of drones) {
      const a = t * (0.18 + d.r * 0.004) + d.ph;
      d.g.position.set(CENTER.x + Math.sin(a) * d.r * 1.4, d.h + Math.sin(t * 0.9 + d.ph) * 0.4, CENTER.z + Math.sin(a * 2) * d.r * 0.7);
      d.g.rotation.y = -a;
      d.g.rotation.z = Math.cos(a) * 0.12;
      d.blink.visible = Math.sin(t * 6 + d.ph) > 0.2;
    }
  });
}

function buildBlimp(scene: THREE.Scene, tick: (f: Tick) => void) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), toon('#cfc8f0'));
  hull.scale.set(3.6, 1.05, 1.05);
  hull.castShadow = true;
  const gondola = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.45), toon('#2c1f68'));
  gondola.position.y = -1.1;
  g.add(hull, gondola);
  for (const [ry, rx] of [
    [0, 0],
    [0, Math.PI / 2],
  ]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.06), toon(PAL.magenta));
    fin.position.set(-3.3, 0, 0);
    fin.rotation.set(rx, ry, 0);
    g.add(fin);
  }
  const banner = canvasTex(1024, 192, (c) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, 1024, 192);
    c.font = `900 120px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = PAL.pink;
    c.shadowBlur = 26;
    c.fillStyle = '#ffffff';
    c.fillText('GM DEGEN', 512, 102);
  });
  const mat = lit(new THREE.MeshBasicMaterial({ map: banner, side: THREE.DoubleSide }), 0.9, 1.7);
  for (const side of [1, -1]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.64), mat);
    b.position.set(0, 0, side * 1.07);
    if (side < 0) b.rotation.y = Math.PI;
    g.add(fx(b));
  }
  scene.add(g);
  // Cruises back and forth behind the city, so it never parks in front of the camera
  tick(({ t }) => {
    const k = Math.sin(t * 0.025);
    const heading = Math.cos(t * 0.025) >= 0 ? 0 : Math.PI;
    g.position.set(CENTER.x + k * 40, 17 + Math.sin(t * 0.3) * 0.4, CENTER.z - 26 + k * 6);
    g.rotation.y += ((heading - 0.15) - g.rotation.y) * 0.02;
  });
}

function buildBirds(scene: THREE.Scene, tick: (f: Tick) => void) {
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.32, 0, -0.08, 0, 0, -0.16], 3));
  wing.computeVertexNormals();
  const mat = toon('#14121f', { side: THREE.DoubleSide });
  // Two flocks of seven, every wing one instance of a single mesh
  const FLOCKS = 2;
  const BIRDS = 7;
  const wings = new THREE.InstancedMesh(wing, mat, FLOCKS * BIRDS * 2);
  wings.frustumCulled = false;
  wings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(wings);
  const bird = new THREE.Object3D();
  const w = new THREE.Object3D();
  bird.add(w);
  tick(({ t, day }) => {
    wings.visible = day > 0.35;
    if (!wings.visible) return;
    let n = 0;
    for (let f = 0; f < FLOCKS; f++) {
      const ph = f * 40;
      const k0 = ((t * 1.4 + ph) % 120) - 60;
      const [fx0, fy, fz] = [CENTER.x + k0, 12 + ph * 0.05, CENTER.z - 18 + ph * 0.6 + Math.sin(t * 0.2) * 3];
      for (let i = 0; i < BIRDS; i++) {
        const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
        bird.position.set(fx0 - Math.abs(k) * 0.7, fy, fz + k * 0.6);
        bird.rotation.set(0, Math.PI / 2, 0);
        const a = Math.sin(t * 9 + i) * 0.7;
        for (const side of [1, -1]) {
          w.scale.x = side;
          w.rotation.z = a * side;
          bird.updateMatrixWorld(true);
          wings.setMatrixAt(n++, w.matrixWorld);
        }
      }
    }
    wings.instanceMatrix.needsUpdate = true;
  });
}

export function buildLife(scene: THREE.Scene, opts: LifeOpts, crowd: Idle[], tick: (f: Tick) => void) {
  buildTraffic(scene, opts, tick);
  buildPeople(scene, opts, crowd, tick);
  buildBoats(scene, tick);
  buildDrones(scene, tick);
  buildBlimp(scene, tick);
  buildBirds(scene, tick);
}
