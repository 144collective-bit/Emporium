/*
 * Everything that moves on its own: traffic that stops at the lights, buses,
 * Degen-style people on the sidewalks, boats, drones, the blimp and birds.
 * Vehicles and people are instanced, so a crowd costs a handful of draw calls.
 */
import * as THREE from 'three';
import { FONT_DISPLAY, PAL, canvasTex, fx, glowTex, lit, neon, rand, toon } from './kit';
import { BLOCKS, BS, CENTER, CORE_ROADS, DISTRICTS, EW_ROADS, NS_ROADS, RIVER, SLAB, type Tick } from './world';
import { CITY_EXT, laneCentres } from './layout';
import { CARS, PAINTS, carGeometry, carMaterials, type CarId } from './cars';
import type { Idle } from './landmarks';
import { HIP_HEIGHT, chatPose, cityOutfit, createCrowd, idlePose, lookPose, newPose, sitPose, walkPose } from './character';

export interface LifeOpts {
  cars: number;
  buses: number;
  walkers: number;
  /** Leave the characters' small details out (phones) */
  light?: boolean;
}

/* ======================================================================
   Traffic
   ====================================================================== */

type Axis = 'x' | 'z';
interface Lane {
  axis: Axis;
  coord: number;
  dir: 1 | -1;
}
interface Vehicle {
  lane: Lane;
  p: number;
  v: number;
  vmax: number;
  len: number;
  model: CarId;
  slot: number;
  /** Where it is this frame (for your own car to bump into) */
  x: number;
  z: number;
  yaw: number;
}

const ROAD_Y = 0.035;

/** The player in walk mode: cars stop rather than drive through them. `r` is how far they reach (more in a car). */
export const walker = { x: 0, z: 0, on: false, r: 0 };
/** Where the traffic and the people on the sidewalks are, so your car can bump them softly (drive.ts) */
export const bodies = {
  cars: [] as { x: number; z: number; yaw: number; len: number; model: CarId }[],
  people: [] as { x: number; z: number }[],
};
/** Traffic and boats loop round the built-up part of the world */
const [E0, E1] = CITY_EXT;

/** Lights at each crossing cycle x-green, x-yellow, z-green, z-yellow. */
const CYCLE = 22;
function lightState(ix: number, axis: Axis, t: number): 'g' | 'y' | 'r' {
  const k = (t + ix * 5.5) % CYCLE;
  if (axis === 'x') return k < 9 ? 'g' : k < 11 ? 'y' : 'r';
  return k < 11 ? 'r' : k < 20 ? 'g' : k < 22 ? 'y' : 'r';
}

const lanes: Lane[] = [];
// Every lane of every road: one each way on streets, two each way on avenues (over the bridges too)
for (const r of EW_ROADS) for (const l of laneCentres(r, 'x')) lanes.push({ axis: 'x', ...l });
for (const r of NS_ROADS) for (const l of laneCentres(r, 'z')) lanes.push({ axis: 'z', ...l });
/** The traffic's mix of cars, repeated (buses come first, as many as the quality tier allows) */
const MIX: CarId[] = ['hatch', 'sedan', 'van', 'hatch', 'pickup', 'sedan', 'coupe', 'hatch', 'sedan', 'van', 'pickup'];
const pRange = (l: Lane): [number, number] => (l.dir === 1 ? [E0 + 4, E1 - 4] : [-(E1 - 4), -(E0 + 4)]);

function lightBox(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d);
}

function buildTraffic(scene: THREE.Scene, opts: LifeOpts, tick: (f: Tick) => void) {
  const vehicles: Vehicle[] = [];
  const counts = new Map<CarId, number>();
  const total = opts.cars + opts.buses;
  for (let i = 0; i < total; i++) {
    const model: CarId = i < opts.buses ? 'bus' : MIX[(i - opts.buses) % MIX.length];
    const lane = lanes[i % lanes.length];
    const [a, b] = pRange(lane);
    const slot = counts.get(model) ?? 0;
    counts.set(model, slot + 1);
    vehicles.push({
      lane,
      p: a + ((i * 37) % 100) / 100 * (b - a),
      v: 0,
      vmax: model === 'bus' ? 3.2 : model === 'van' || model === 'pickup' ? 3.8 + rand() * 1.5 : 4.2 + rand() * 2,
      len: CARS[model].L,
      model,
      slot,
      x: 0,
      z: 0,
      yaw: 0,
    });
  }

  bodies.cars = vehicles;

  // One fleet per model: its paint (each car its own colour) and its details; the bus's windows glow at night
  const mats = carMaterials();
  const busGlow = lit(new THREE.MeshToonMaterial({ color: '#2a3b66', emissive: '#ffd36b' }), 0.05, 1.6);
  const fleets = new Map<CarId, THREE.InstancedMesh[]>();
  const moving: THREE.InstancedMesh[] = [];
  for (const [model, n] of counts) {
    const g = carGeometry(model);
    const list = [new THREE.InstancedMesh(g.paint, mats.paint, n), new THREE.InstancedMesh(g.detail, mats.detail, n)];
    if (g.glow) list.push(new THREE.InstancedMesh(g.glow, busGlow, n));
    const paints = PAINTS[model];
    for (let i = 0; i < n; i++) list[0].setColorAt(i, new THREE.Color(paints[(i * 5 + 2) % paints.length]));
    for (const m of list) {
      m.castShadow = true;
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(m);
    }
    fleets.set(model, list);
    moving.push(...list);
  }
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

  // Traffic lights
  const lightMats: Record<string, THREE.MeshBasicMaterial> = {};
  const colors = { r: '#ff2b2b', y: '#ffc23d', g: '#2bff88' };
  const poleMat = toon('#1b1830');
  const housing = toon('#14121f');
  const unit = new THREE.BoxGeometry(1, 1, 1);
  let ix = 0;
  // Every crossing is tracked so cars give way; only the core city's have lights
  // hx / hz: half the width of the north-south / east-west road meeting there
  const crossings: { ix: number; cx: number; cz: number; hx: number; hz: number; lit: boolean }[] = [];
  for (const nr of NS_ROADS) {
    for (const er of EW_ROADS) {
      const [cx, cz] = [nr.c, er.c];
      const lights = CORE_ROADS.includes(cx) && CORE_ROADS.includes(cz);
      crossings.push({ ix, cx, cz, hx: nr.half, hz: er.half, lit: lights });
      if (!lights) {
        ix++;
        continue;
      }
      // On the sidewalk corners, facing the traffic they hold
      const ax = nr.half + 0.35;
      const az = er.half + 0.35;
      const approaches: [Axis, number, number, number][] = [
        ['x', cx - ax, cz + az, -Math.PI / 2],
        ['x', cx + ax, cz - az, Math.PI / 2],
        ['z', cx - ax, cz - az, Math.PI],
        ['z', cx + ax, cz + az, 0],
      ];
      for (const [axis, x, z, ry] of approaches) {
        const pole = new THREE.Mesh(unit, poleMat);
        pole.scale.set(0.07, 1.9, 0.07);
        pole.position.set(x, SLAB + 0.95, z);
        pole.castShadow = true;
        const box = new THREE.Mesh(unit, housing);
        box.scale.set(0.2, 0.55, 0.16);
        box.position.set(x, SLAB + 1.75, z);
        box.rotation.y = ry;
        scene.add(pole, box);
        (['r', 'y', 'g'] as const).forEach((c, k) => {
          const key = `${ix}${axis}${c}`;
          lightMats[key] ??= new THREE.MeshBasicMaterial({ color: colors[c] });
          const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), lightMats[key]);
          const off = new THREE.Vector3(0, 0, 0.085).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
          lamp.position.set(x + off.x, SLAB + 1.92 - k * 0.17, z + off.z);
          lamp.rotation.y = ry;
          scene.add(fx(lamp));
        });
      }
      ix++;
    }
  }
  const base = { r: new THREE.Color(colors.r), y: new THREE.Color(colors.y), g: new THREE.Color(colors.g) };
  const occupied = new Set<string>();

  const M = new THREE.Matrix4();
  const L = new THREE.Matrix4();
  const T = new THREE.Matrix4();
  const F = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();

  tick(({ t, dt, night }) => {
    // Lamp states
    for (const c of crossings) {
      if (!c.lit) continue;
      for (const axis of ['x', 'z'] as const) {
        const s = lightState(c.ix, axis, t);
        for (const k of ['r', 'y', 'g'] as const) lightMats[`${c.ix}${axis}${k}`].color.copy(base[k]).multiplyScalar(s === k ? 1.6 + night * 1.6 : 0.12);
      }
    }

    // Drive: follow the car ahead, stop for red
    // Crossings with a vehicle still inside them, by the axis it travels on
    occupied.clear();
    for (const v of vehicles) {
      const s = v.p * v.lane.dir;
      for (const c of crossings) {
        const [along, halfAlong] = v.lane.axis === 'x' ? [c.cx, c.hx] : [c.cz, c.hz];
        const [across, halfAcross] = v.lane.axis === 'x' ? [c.cz, c.hz] : [c.cx, c.hx];
        if (Math.abs(across - v.lane.coord) < halfAcross && Math.abs(s - along) < halfAlong + 0.1 + v.len / 2) occupied.add(c.ix + v.lane.axis);
      }
    }

    const byLane = new Map<Lane, Vehicle[]>();
    for (const v of vehicles) {
      if (!byLane.has(v.lane)) byLane.set(v.lane, []);
      byLane.get(v.lane)!.push(v);
    }
    for (const [lane, list] of byLane) {
      list.sort((a, b) => a.p - b.p);
      for (let i = 0; i < list.length; i++) {
        const v = list[i];
        let target = v.vmax;
        const ahead = list[i + 1];
        if (ahead) {
          const gap = ahead.p - ahead.len / 2 - (v.p + v.len / 2);
          target = Math.min(target, Math.max(0, (gap - 0.9) * 1.6));
        }
        for (const c of crossings) {
          const [centre, halfAlong] = lane.axis === 'x' ? [c.cx, c.hx] : [c.cz, c.hz];
          const [other, halfAcross] = lane.axis === 'x' ? [c.cz, c.hz] : [c.cx, c.hx];
          if (Math.abs(other - lane.coord) > halfAcross) continue;
          // Stop line: just before the zebra crossing
          const stopP = centre * lane.dir - halfAlong - 1.0;
          const d = stopP - (v.p + v.len / 2);
          if (d < -0.05 || d > 10) continue;
          const s = c.lit ? lightState(c.ix, lane.axis, t) : 'g';
          const blocked = occupied.has(c.ix + (lane.axis === 'x' ? 'z' : 'x'));
          if (s === 'r' || (s === 'y' && d > 1.2) || blocked) target = Math.min(target, Math.max(0, d * 1.3));
        }
        // Someone walking in the road ahead: stop short of them
        if (walker.on) {
          const s = v.p * lane.dir;
          const [vx, vz] = lane.axis === 'x' ? [s, lane.coord] : [lane.coord, s];
          const [fx, fz] = lane.axis === 'x' ? [lane.dir, 0] : [0, lane.dir];
          const ahead = (walker.x - vx) * fx + (walker.z - vz) * fz - v.len / 2 - walker.r;
          const side = Math.abs((walker.x - vx) * fz - (walker.z - vz) * fx);
          if (ahead > -0.2 - walker.r && ahead < 4 && side < 1.0 + walker.r * 0.6) target = Math.min(target, Math.max(0, (ahead - 0.8) * 1.8));
        }
        const acc = target > v.v ? 1.8 : 5;
        v.v += Math.max(-acc * dt, Math.min(acc * dt, target - v.v));
        v.p += v.v * dt;
        const [a, b] = pRange(lane);
        if (v.p > b) v.p = a;
      }
    }

    // Instances
    let hi = 0;
    vehicles.forEach((v, idx) => {
      const s = v.p * v.lane.dir;
      const yaw = v.lane.axis === 'x' ? (v.lane.dir === 1 ? 0 : Math.PI) : v.lane.dir === 1 ? -Math.PI / 2 : Math.PI / 2;
      if (v.lane.axis === 'x') pos.set(s, ROAD_Y, v.lane.coord);
      else pos.set(v.lane.coord, ROAD_Y, s);
      q.setFromAxisAngle(up, yaw);
      v.x = pos.x;
      v.z = pos.z;
      v.yaw = yaw;
      M.makeRotationFromQuaternion(q).setPosition(pos);
      for (const m of fleets.get(v.model)!) m.setMatrixAt(v.slot, M);
      const g = carGeometry(v.model);
      for (let k = 0; k < 2; k++) {
        head.setMatrixAt(hi, L.multiplyMatrices(M, T.makeTranslation(...g.head[k])));
        tail.setMatrixAt(hi, L.multiplyMatrices(M, T.makeTranslation(...g.tail[k])));
        hi++;
      }
      const fwd = F.set(1, 0, 0).applyQuaternion(q);
      beamPos.set([pos.x + fwd.x * (v.len / 2 + 1.4), 0.06, pos.z + fwd.z * (v.len / 2 + 1.4)], idx * 3);
    });
    for (const m of moving) m.instanceMatrix.needsUpdate = true;
    beamGeo.attributes.position.needsUpdate = true;
  });
}

/* ======================================================================
   People
   ====================================================================== */

interface Person {
  kind: 'walk' | 'idle';
  block?: [number, number];
  /** Distance from the kerb: each lane has its own, so walkers never share a line */
  inset: number;
  /** Standing height (or seat height for someone sitting) */
  y?: number;
  act?: Idle['act'];
  /** Posture: a little forward or back, how much the arms swing */
  lean: number;
  swing: number;
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
  // Round the core city's blocks, and the south row's (the street life across the river)
  const blocks = [...BLOCKS.flatMap((x) => BLOCKS.map((z) => [x, z] as [number, number])), ...DISTRICTS.filter((d) => d.id.startsWith('S')).map((d) => [d.ox, d.oz] as [number, number])];
  // Spread walkers evenly round each lane. Everyone in a lane keeps the same
  // pace, so nobody walks through the person in front.
  const perLane = new Map<string, number[]>();
  for (let i = 0; i < opts.walkers; i++) {
    const key = `${i % blocks.length}:${Math.floor(i / blocks.length) % WALK_LANES.length}`;
    if (!perLane.has(key)) perLane.set(key, []);
    perLane.get(key)!.push(i);
  }
  for (const [key, members] of perLane) {
    const [b, l] = key.split(':').map(Number);
    const lane = WALK_LANES[l];
    const loop = (BS - lane.inset * 2) * 4;
    const off = rand() * loop;
    members.forEach((_, k) => {
      people.push({
        kind: 'walk',
        block: blocks[b],
        inset: lane.inset,
        u: (off + (k / members.length) * loop) % loop,
        dir: lane.dir,
        speed: lane.speed,
        phase: rand() * 6,
        x: 0,
        z: 0,
        ry: 0,
        face: NaN,
        lean: (rand() - 0.4) * 0.08,
        swing: 0.8 + rand() * 0.35,
      });
    });
  }
  for (const c of crowd) people.push({ kind: 'idle', inset: 0, u: 0, dir: 1, speed: 0, phase: rand() * 6, x: c.x, z: c.z, y: c.y, act: c.act, ry: c.ry, face: c.ry, lean: 0, swing: 1 });
  const n = people.length;
  bodies.people = people;

  // Everyone is the shared Degen body in a city outfit: suits and hoodies, bags, headphones
  const people3d = createCrowd(
    scene,
    people.map(() => cityOutfit(rand)),
    { light: opts.light }
  );
  const pose = newPose();

  tick(({ t, dt }) => {
    people.forEach((p, i) => {
      if (p.kind === 'walk') {
        const side = BS - p.inset * 2;
        p.u = (p.u + p.dir * p.speed * dt + side * 4) % (side * 4);
        const [ox, oz] = p.block!;
        const seg = Math.min(3, Math.floor(p.u / side));
        const f = p.u - seg * side;
        const x0 = ox + p.inset;
        const z0 = oz + p.inset;
        const pts: [number, number, number][] = [
          [x0 + f, z0, 0],
          [x0 + side, z0 + f, 1],
          [x0 + side - f, z0 + side, 2],
          [x0, z0 + side - f, 3],
        ];
        const [x, z, s] = pts[seg];
        p.x = x;
        p.z = z;
        // facing along the edge: +x, +z, -x, -z for seg 0..3 (reversed when walking backwards)
        const yaws = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
        p.ry = yaws[s] + (p.dir === -1 ? Math.PI : 0);
        // Stride matched to walking pace, so feet don't slide
        walkPose(pose, t * p.speed * 11 + p.phase, 1, 0, p.swing);
        pose.lean += p.lean;
      } else if (p.act === 'sit') sitPose(pose, t, p.phase);
      else if (p.act === 'chat') chatPose(pose, t, p.phase);
      else if (p.act === 'queue') {
        idlePose(pose, t, p.phase);
        pose.headYaw = Math.sin(t * 0.23 + p.phase) * 0.25;
      } else lookPose(pose, t, p.phase);
      // Turn corners over a few frames instead of snapping
      if (Number.isNaN(p.face)) p.face = p.ry;
      const turn = Math.atan2(Math.sin(p.ry - p.face), Math.cos(p.ry - p.face));
      p.face += turn * Math.min(1, dt * 9);
      const y = p.act === 'sit' ? (p.y ?? SLAB) - SEAT_DROP : (p.y ?? SLAB);
      people3d.set(i, p.x, y, p.z, p.face, PERSON_SCALE, pose);
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
    ['#f3f2f7', RIVER[0] + 1.0, 1.1],
    ['#e23b3b', RIVER[1] - 1.0, -0.8],
    ['#ffd23f', RIVER[0] + 1.6, 0.6],
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
    g.add(hull, bow, cabin, fx(lamp), fx(wake));
    hull.castShadow = cabin.castShadow = true;
    if (v < 0) g.rotation.y = Math.PI;
    scene.add(g);
    boats.push({ g, x: CENTER.x + (i - 1) * 25, z, v, ph: rand() * 6 });
  });
  tick(({ t, dt }) => {
    for (const b of boats) {
      b.x += b.v * dt;
      if (b.x > E1 - 6) b.x = E0 + 6;
      if (b.x < E0 + 6) b.x = E1 - 6;
      b.g.position.set(b.x, 0.02 + Math.sin(t * 1.6 + b.ph) * 0.03, b.z);
      b.g.rotation.z = Math.sin(t * 1.2 + b.ph) * 0.03;
    }
  });
}

function buildDrones(scene: THREE.Scene, tick: (f: Tick) => void) {
  const drones: { g: THREE.Group; rotors: THREE.Mesh[]; ph: number; r: number; h: number; blink: THREE.Mesh }[] = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), toon('#1b1830'));
    g.add(body);
    const rotors: THREE.Mesh[] = [];
    for (const [x, z] of [
      [0.22, 0.22],
      [-0.22, 0.22],
      [0.22, -0.22],
      [-0.22, -0.22],
    ]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.04), toon('#1b1830'));
      arm.position.set(x, 0.04, z);
      const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.03), toon('#c9c4e6'));
      rotor.position.set(x, 0.07, z);
      g.add(arm, rotor);
      rotors.push(rotor);
    }
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), neon(i % 2 ? '#2bff88' : '#ff2b2b', 1.5, 4));
    blink.position.y = -0.06;
    g.add(fx(blink));
    scene.add(g);
    drones.push({ g, rotors, ph: i * 1.7, r: 6 + i * 3.2, h: 6 + (i % 3) * 1.6, blink });
  }
  tick(({ t }) => {
    for (const d of drones) {
      const a = t * (0.18 + d.r * 0.004) + d.ph;
      d.g.position.set(CENTER.x + Math.sin(a) * d.r * 1.4, d.h + Math.sin(t * 0.9 + d.ph) * 0.4, CENTER.z + Math.sin(a * 2) * d.r * 0.7);
      d.g.rotation.y = -a;
      d.g.rotation.z = Math.cos(a) * 0.12;
      for (const r of d.rotors) r.rotation.y += 0.9;
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
  const flocks: { g: THREE.Group; wings: THREE.Mesh[][]; ph: number }[] = [];
  for (let f = 0; f < 2; f++) {
    const g = new THREE.Group();
    const wings: THREE.Mesh[][] = [];
    for (let i = 0; i < 7; i++) {
      const bird = new THREE.Group();
      const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
      bird.position.set(-Math.abs(k) * 0.7, 0, k * 0.6);
      const l = new THREE.Mesh(wing, mat);
      const r = new THREE.Mesh(wing, mat);
      r.scale.x = -1;
      bird.add(l, r);
      bird.rotation.y = Math.PI / 2;
      g.add(bird);
      wings.push([l, r]);
    }
    scene.add(g);
    flocks.push({ g, wings, ph: f * 40 });
  }
  tick(({ t, day }) => {
    for (const fl of flocks) {
      fl.g.visible = day > 0.35;
      const k = ((t * 1.4 + fl.ph) % 120) - 60;
      fl.g.position.set(CENTER.x + k, 12 + fl.ph * 0.05, CENTER.z - 18 + fl.ph * 0.6 + Math.sin(t * 0.2) * 3);
      fl.wings.forEach(([l, r], i) => {
        const a = Math.sin(t * 9 + i) * 0.7;
        l.rotation.z = a;
        r.rotation.z = -a;
      });
    }
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
