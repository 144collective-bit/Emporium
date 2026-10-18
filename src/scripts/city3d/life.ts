/*
 * Everything that moves on its own: traffic that stops at the lights, buses,
 * Degen-style people on the sidewalks, boats, drones, the blimp and birds.
 * Vehicles and people are instanced, so a crowd costs a handful of draw calls.
 */
import * as THREE from 'three';
import { FONT_DISPLAY, PAL, canvasTex, fx, glowTex, lit, neon, rand, toon } from './kit';
import { BLOCKS, BS, CENTER, CORE_ROADS, EXT, RIVER, ROADS, SLAB, type Tick } from './world';
import type { Idle } from './landmarks';
import { chatPose, cityOutfit, createCrowd, idlePose, lookPose, newPose, sitPose, walkPose } from './character';

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
  bus: boolean;
  slot: number;
}

const ROAD_Y = 0.035;

/** The player in walk mode: cars stop rather than drive through them. */
export const walker = { x: 0, z: 0, on: false };
const [E0, E1] = EXT;

/** Lights at each crossing cycle x-green, x-yellow, z-green, z-yellow. */
const CYCLE = 22;
function lightState(ix: number, axis: Axis, t: number): 'g' | 'y' | 'r' {
  const k = (t + ix * 5.5) % CYCLE;
  if (axis === 'x') return k < 9 ? 'g' : k < 11 ? 'y' : 'r';
  return k < 11 ? 'r' : k < 20 ? 'g' : k < 22 ? 'y' : 'r';
}

const lanes: Lane[] = [];
for (const r of ROADS) {
  lanes.push({ axis: 'x', coord: r + 0.5, dir: 1 }, { axis: 'x', coord: r - 0.5, dir: -1 });
  lanes.push({ axis: 'z', coord: r - 0.5, dir: 1 }, { axis: 'z', coord: r + 0.5, dir: -1 });
}
const pRange = (l: Lane): [number, number] => (l.dir === 1 ? [E0 + 4, E1 - 4] : [-(E1 - 4), -(E0 + 4)]);

function vehicleBox(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function buildTraffic(scene: THREE.Scene, opts: LifeOpts, tick: (f: Tick) => void) {
  const vehicles: Vehicle[] = [];
  let carSlot = 0;
  let busSlot = 0;
  const total = opts.cars + opts.buses;
  for (let i = 0; i < total; i++) {
    const bus = i < opts.buses;
    const lane = lanes[i % lanes.length];
    const [a, b] = pRange(lane);
    vehicles.push({
      lane,
      p: a + ((i * 37) % 100) / 100 * (b - a),
      v: 0,
      vmax: bus ? 2.0 : 2.8 + rand() * 1.4,
      len: bus ? 2.3 : 1.1,
      bus,
      slot: bus ? busSlot++ : carSlot++,
    });
  }

  // Car parts (model points along +x, origin at road level)
  const nCars = carSlot;
  const nBus = busSlot;
  const carBody = new THREE.InstancedMesh(vehicleBox(1.05, 0.3, 0.56, 0, 0.23, 0), toon('#ffffff', { name: 'car' }), nCars);
  const carCab = new THREE.InstancedMesh(vehicleBox(0.55, 0.25, 0.5, -0.08, 0.5, 0), toon('#8fe7ff'), nCars);
  const wheelGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10).rotateX(Math.PI / 2);
  const wheels = new THREE.InstancedMesh(wheelGeo, toon('#14121f'), nCars * 4 + nBus * 4);
  const head = new THREE.InstancedMesh(vehicleBox(0.02, 0.07, 0.12, 0, 0, 0), neon('#fff6c8', 0.8, 3), (nCars + nBus) * 2);
  const tail = new THREE.InstancedMesh(vehicleBox(0.02, 0.07, 0.12, 0, 0, 0), neon('#ff2b2b', 0.8, 3), (nCars + nBus) * 2);
  const busBody = new THREE.InstancedMesh(vehicleBox(2.3, 0.62, 0.66, 0, 0.42, 0), toon('#ffffff', { name: 'bus' }), Math.max(nBus, 1));
  const busGlass = new THREE.InstancedMesh(vehicleBox(2.1, 0.2, 0.67, 0, 0.56, 0), lit(new THREE.MeshToonMaterial({ color: '#2a3b66', emissive: '#ffd36b' }), 0.05, 1.6), Math.max(nBus, 1));
  const carColors = ['#e23b3b', '#ffd23f', '#00c2ff', '#e219e5', '#f3f2f7', '#1fbf6b', '#ff8a3d', '#8000ff'].map((c) => new THREE.Color(c));
  for (let i = 0; i < nCars; i++) carBody.setColorAt(i, carColors[i % carColors.length]);
  for (let i = 0; i < nBus; i++) busBody.setColorAt(i, new THREE.Color(i % 2 ? PAL.telegram : PAL.magenta));
  if (!nBus) busBody.count = busGlass.count = 0;
  for (const m of [carBody, carCab, wheels, busBody, busGlass]) {
    m.castShadow = true;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(m);
  }
  head.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  tail.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(fx(head), fx(tail));

  // Headlight beams on the road
  const beamPos = new Float32Array((nCars + nBus) * 3);
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
  const crossings: { ix: number; cx: number; cz: number; lit: boolean }[] = [];
  for (const cx of ROADS) {
    for (const cz of ROADS) {
      const lights = CORE_ROADS.includes(cx) && CORE_ROADS.includes(cz);
      crossings.push({ ix, cx, cz, lit: lights });
      if (!lights) {
        ix++;
        continue;
      }
      const approaches: [Axis, number, number, number][] = [
        ['x', cx - 1.3, cz + 1.3, -Math.PI / 2],
        ['x', cx + 1.3, cz - 1.3, Math.PI / 2],
        ['z', cx - 1.3, cz - 1.3, Math.PI],
        ['z', cx + 1.3, cz + 1.3, 0],
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
  const one = new THREE.Vector3(1, 1, 1);
  const carWheels: [number, number][] = [
    [-0.32, 0.29],
    [0.32, 0.29],
    [-0.32, -0.29],
    [0.32, -0.29],
  ];
  const busWheels: [number, number][] = [
    [-0.75, 0.32],
    [0.75, 0.32],
    [-0.75, -0.32],
    [0.75, -0.32],
  ];

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
        const along = v.lane.axis === 'x' ? c.cx : c.cz;
        const across = v.lane.axis === 'x' ? c.cz : c.cx;
        if (Math.abs(across - v.lane.coord) < 1.1 && Math.abs(s - along) < 1.1 + v.len / 2) occupied.add(c.ix + v.lane.axis);
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
          target = Math.min(target, Math.max(0, (gap - 0.5) * 1.6));
        }
        for (const c of crossings) {
          const centre = lane.axis === 'x' ? c.cx : c.cz;
          const other = lane.axis === 'x' ? c.cz : c.cx;
          if (Math.abs(other - lane.coord) > 1.2) continue;
          const stopP = centre * lane.dir - 1.6;
          const d = stopP - (v.p + v.len / 2);
          if (d < -0.05 || d > 7) continue;
          const s = c.lit ? lightState(c.ix, lane.axis, t) : 'g';
          const blocked = occupied.has(c.ix + (lane.axis === 'x' ? 'z' : 'x'));
          if (s === 'r' || (s === 'y' && d > 1.2) || blocked) target = Math.min(target, Math.max(0, d * 1.3));
        }
        // Someone walking in the road ahead: stop short of them
        if (walker.on) {
          const s = v.p * lane.dir;
          const [vx, vz] = lane.axis === 'x' ? [s, lane.coord] : [lane.coord, s];
          const [fx, fz] = lane.axis === 'x' ? [lane.dir, 0] : [0, lane.dir];
          const ahead = (walker.x - vx) * fx + (walker.z - vz) * fz - v.len / 2;
          const side = Math.abs((walker.x - vx) * fz - (walker.z - vz) * fx);
          if (ahead > -0.2 && ahead < 3 && side < 0.75) target = Math.min(target, Math.max(0, (ahead - 0.6) * 1.8));
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
      M.compose(pos, q, one);
      const half = v.len / 2;
      if (v.bus) {
        busBody.setMatrixAt(v.slot, M);
        busGlass.setMatrixAt(v.slot, M);
      } else {
        carBody.setMatrixAt(v.slot, M);
        carCab.setMatrixAt(v.slot, M);
      }
      const wl = v.bus ? busWheels : carWheels;
      const wbase = v.bus ? nCars * 4 + v.slot * 4 : v.slot * 4;
      wl.forEach(([x, z], k) => wheels.setMatrixAt(wbase + k, L.multiplyMatrices(M, T.makeTranslation(x, 0.11, z))));
      for (const side of [-1, 1]) {
        head.setMatrixAt(hi, L.multiplyMatrices(M, T.makeTranslation(half + 0.005, 0.27, side * 0.18)));
        tail.setMatrixAt(hi, L.multiplyMatrices(M, T.makeTranslation(-half - 0.005, 0.27, side * 0.18)));
        hi++;
      }
      const fwd = F.set(1, 0, 0).applyQuaternion(q);
      beamPos.set([pos.x + fwd.x * (half + 0.9), 0.06, pos.z + fwd.z * (half + 0.9)], idx * 3);
    });
    for (const m of [carBody, carCab, wheels, busBody, busGlass, head, tail]) m.instanceMatrix.needsUpdate = true;
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

/** Sidewalk lanes: two each way, each at its own distance from the kerb and its own pace. */
const WALK_LANES: { inset: number; dir: 1 | -1; speed: number }[] = [
  { inset: 0.13, dir: 1, speed: 0.6 },
  { inset: 0.21, dir: 1, speed: 0.52 },
  { inset: 0.29, dir: -1, speed: 0.56 },
  { inset: 0.37, dir: -1, speed: 0.48 },
];
const PERSON_SCALE = 0.66;
/** How far the hips sit above the feet when seated, at PERSON_SCALE */
const SEAT_DROP = 0.47 * PERSON_SCALE;

function buildPeople(scene: THREE.Scene, opts: LifeOpts, crowd: Idle[], tick: (f: Tick) => void) {
  const people: Person[] = [];
  const blocks = BLOCKS.flatMap((x) => BLOCKS.map((z) => [x, z] as [number, number]));
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
