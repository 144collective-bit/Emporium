/*
 * Driving your own car (walk mode): get in at the car, drive anywhere in
 * the city, get out wherever you stop. drive-sim.ts holds the rules (arcade
 * handling, soft collisions); this is the view: the car on screen, the
 * camera, the speed readout and the engine.
 *
 * - The car lives on the garage's turntable until you first get in; after
 *   that it stays where you leave it (until it's sent home from the garage,
 *   or the page reloads).
 * - Cameras (V): a chase camera that swings in behind the car (look around
 *   with the mouse, a drag or the right stick; it settles back behind) and a
 *   roof camera.
 * - Traffic stops for you (`walker` in life.ts reaches further in a car);
 *   you bump softly off other cars and people, never through them.
 */
import * as THREE from 'three';
import type { Sfx } from './combat';
import type { Car } from './cars';
import { CARS } from './cars';
import { circles, newCar, stepCar, tune, type CarState, type DriveInput, type DriveTune } from './drive-sim';
import type { Garage } from './garage';
import { bodies } from './life';
import { DRIVE, type MyCar, type PlayerCar } from './mycar';
import type { Box } from './solids';

export interface DriveDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: HTMLElement;
  garage: Garage;
  /** Your saved car (model and paint) */
  myCar(): MyCar;
  /** Every solid box in the city (landmarks, placed buildings) */
  solids(): Box[];
  /** The ground's height (the raised blocks and sidewalks) */
  groundAt(x: number, z: number): number;
  /** How far the camera can sit from a point along a direction before something's in the way */
  cameraRoom(from: THREE.Vector3, dir: THREE.Vector3, want: number): number;
  /** Is a spot free for Degen to stand on (getting out)? */
  free(x: number, z: number): boolean;
  sfx(kind: Sfx, gain?: number): void;
  engine(revs: number): void;
  bounds: Box;
}

const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Tiles per second to km/h (a tile is about 1.8 m) */
const KMH = 1.8 * 3.6;

export function createDrive(d: DriveDeps) {
  const { camera, root } = d;
  const hud = root.querySelector<HTMLElement>('[data-drive-hud]')!;
  const speedEl = hud.querySelector<HTMLElement>('[data-drive-speed]')!;
  const gearEl = hud.querySelector<HTMLElement>('[data-drive-gear]')!;

  /** The car out in the city (null while it's on the turntable) */
  let out: { car: Car; model: PlayerCar; state: CarState; tune: DriveTune; holder: THREE.Group } | null = null;
  let active = false;
  /** Locked (a race's countdown): no throttle or steering, handbrake on */
  let frozen = false;
  let roofCam = false;
  let camYaw = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  let lookIdle = 0;
  let shake = 0;
  let y = 0;
  let roll = 0;
  let pitch = 0;
  let lastSpeed = 0;
  let fov = 60;
  const camPos = new THREE.Vector3();
  const pivot = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const at = new THREE.Vector3();
  let camReady = false;

  function tuneOf(model: PlayerCar): DriveTune {
    const s = CARS[model];
    return tune(DRIVE[model], { L: s.L, W: s.W, wheelbase: s.axles[1] - s.axles[0] });
  }

  /** The car's footprint as circles (for walking round a parked car) */
  const parkedCircles = () => (out && !active ? circles(out.state, out.tune) : []);

  function place() {
    if (!out) return;
    const s = out.state;
    out.holder.position.set(s.x, y, s.z);
    out.holder.rotation.y = s.yaw;
    out.car.group.rotation.set(roll, 0, pitch);
  }

  /** Things to bump softly: nearby traffic (two circles each) and people */
  const soft: { x: number; z: number; r: number }[] = [];
  function gatherSoft(s: CarState) {
    soft.length = 0;
    for (const v of bodies.cars) {
      if (Math.abs(v.x - s.x) > 8 || Math.abs(v.z - s.z) > 8) continue;
      const w = CARS[v.model].W * 0.5;
      const reach = v.len / 2 - w;
      const fx = Math.cos(v.yaw);
      const fz = -Math.sin(v.yaw);
      for (const o of [-reach, reach]) soft.push({ x: v.x + fx * o, z: v.z + fz * o, r: w });
    }
    for (const p of bodies.people) {
      if (Math.abs(p.x - s.x) > 5 || Math.abs(p.z - s.z) > 5) continue;
      soft.push({ x: p.x, z: p.z, r: 0.28 });
    }
    return soft;
  }

  return {
    get active() {
      return active;
    },
    /** The car being driven (or parked out in the city), for the traffic and the camera */
    get state() {
      return out?.state ?? null;
    },
    /** Is your car out of the garage? */
    get away() {
      return !!out;
    },
    get model() {
      return out?.model ?? d.myCar().model;
    },
    /** How far Degen is from a car he can get into (Infinity if there isn't one) */
    nearCar(x: number, z: number) {
      if (out) return Math.min(...circles(out.state, out.tune).map((c) => Math.hypot(c.x - x, c.z - z) - c.r));
      if (d.garage.hasCar) return Math.hypot(d.garage.turntable.x - x, d.garage.turntable.z - z) - d.garage.turntable.r;
      return Infinity;
    },
    /** Does the parked car block this spot (walking)? */
    blocks(x: number, z: number, pad: number) {
      return parkedCircles().some((c) => Math.hypot(c.x - x, c.z - z) < c.r + pad);
    },
    /** Get in (from the turntable, or wherever it's parked) */
    enter() {
      if (!out) {
        const taken = d.garage.takeOut();
        if (!taken) return false;
        const model = d.myCar().model;
        const holder = new THREE.Group();
        d.scene.add(holder);
        holder.add(taken.car.group);
        taken.car.group.position.set(0, 0, 0);
        out = { car: taken.car, model, state: newCar(taken.x, taken.z, taken.yaw), tune: tuneOf(model), holder };
      }
      active = true;
      camYaw = out.state.yaw;
      lookYaw = lookPitch = 0;
      y = d.groundAt(out.state.x, out.state.z);
      roll = pitch = 0;
      camReady = false;
      fov = camera.fov;
      place();
      hud.hidden = false;
      root.classList.add('is-driving');
      root.dataset.car = CARS[out.model].name;
      d.sfx('door');
      return true;
    },
    /** Get out: the car stays parked; returns where Degen steps out and which way he faces */
    exit() {
      if (!active || !out) return null;
      active = false;
      const s = out.state;
      s.speed = s.vx = s.vz = 0;
      s.steer = 0;
      roll = pitch = 0;
      place();
      hud.hidden = true;
      root.classList.remove('is-driving');
      delete root.dataset.car;
      d.engine(-1);
      d.sfx('door');
      // Out of the left door if there's room, else the right, the back or the front
      const fx = Math.cos(s.yaw);
      const fz = -Math.sin(s.yaw);
      const rx = Math.sin(s.yaw);
      const rz = Math.cos(s.yaw);
      const side = out.tune.W / 2 + 0.45;
      const end = out.tune.L / 2 + 0.45;
      const spots: [number, number][] = [
        [s.x - rx * side, s.z - rz * side],
        [s.x + rx * side, s.z + rz * side],
        [s.x - fx * end, s.z - fz * end],
        [s.x + fx * end, s.z + fz * end],
      ];
      const [x, z] = spots.find(([px, pz]) => d.free(px, pz)) ?? spots[0];
      return { x, z, yaw: s.yaw + Math.PI / 2 };
    },
    /** Send the car home (the garage brought it back): it leaves the streets */
    recall() {
      if (!out) return;
      if (active) return;
      out.car.dispose();
      out.holder.removeFromParent();
      out = null;
    },
    toggleView() {
      roofCam = !roofCam;
      camReady = false;
    },
    /** Look around from the chase camera (it settles back behind the car) */
    look(dx: number, dy: number) {
      lookYaw = THREE.MathUtils.clamp(lookYaw - dx, -2.6, 2.6);
      lookPitch = THREE.MathUtils.clamp(lookPitch + dy, -0.25, 0.7);
      lookIdle = 0;
    },
    /** Is the car locked (a race's countdown)? */
    get frozen() {
      return frozen;
    },
    set frozen(on: boolean) {
      frozen = on;
    },
    /** One frame of driving; returns how far the car moved (tiles) */
    update(dt: number, inp: DriveInput) {
      if (!active || !out) return 0;
      const s = out.state;
      const T = out.tune;
      const boxes = d.solids();
      if (frozen) inp = { throttle: 0, steer: 0, handbrake: true };
      const px = s.x;
      const pz = s.z;
      const hit = stepCar(s, inp, T, Math.min(dt, 1 / 20), { boxes, soft: gatherSoft(s) }, d.bounds);
      const moved = Math.hypot(s.x - px, s.z - pz);
      if (hit > 1.2) {
        d.sfx('bump', Math.min(1, hit / 7));
        shake = Math.min(0.25, hit * 0.03);
      }

      // The body: up the kerbs smoothly, leans into turns and squats under gas or brakes
      y += (d.groundAt(s.x, s.z) - y) * damp(14, dt);
      const accel = (s.speed - lastSpeed) / Math.max(dt, 1e-3);
      lastSpeed = s.speed;
      roll += (THREE.MathUtils.clamp(s.yawRate * s.speed * 0.012, -0.07, 0.07) - roll) * damp(6, dt);
      pitch += (THREE.MathUtils.clamp(accel * 0.006, -0.05, 0.05) - pitch) * damp(6, dt);
      out.car.drive(s.speed * dt, -s.steer);
      place();

      // Readout and engine
      const kmh = Math.round(Math.abs(s.speed) * KMH);
      if (speedEl.textContent !== String(kmh)) speedEl.textContent = String(kmh);
      const gear = s.speed < -0.2 ? 'R' : Math.abs(s.speed) < 0.2 && Math.abs(inp.throttle) < 0.05 ? 'N' : 'D';
      if (gearEl.textContent !== gear) gearEl.textContent = gear;
      d.engine(0.12 + Math.min(1, Math.abs(s.speed) / T.top) * 0.75 + Math.max(0, inp.throttle) * 0.13);

      // Camera
      lookIdle += dt;
      if (lookIdle > 1.2) {
        lookYaw += (0 - lookYaw) * damp(2.5, dt);
        lookPitch += (0 - lookPitch) * damp(2.5, dt);
      }
      // The chase camera follows the way the car is going (in reverse it stays behind the nose)
      camYaw += wrap(s.yaw - camYaw) * damp(roofCam ? 20 : 3.2, dt);
      const yaw = camYaw + lookYaw;
      const fx = Math.cos(yaw);
      const fz = -Math.sin(yaw);
      const spec = CARS[out.model];
      if (roofCam) {
        const roof = spec.cabin[1][1];
        camPos.set(s.x + fx * (spec.cabin[2][0] * 0.6), y + roof + 0.28, s.z + fz * (spec.cabin[2][0] * 0.6));
        at.set(camPos.x + fx * 6, camPos.y - 0.35 + lookPitch * 4, camPos.z + fz * 6);
        camera.position.copy(camPos);
      } else {
        const pitchC = 0.26 + lookPitch;
        pivot.set(s.x, y + 0.9, s.z);
        dir.set(-fx * Math.cos(pitchC), Math.sin(pitchC), -fz * Math.cos(pitchC));
        const want = 3.6 + T.L * 0.95 + Math.abs(s.speed) * 0.1;
        const room = d.cameraRoom(pivot, dir, want);
        const goal = pivot.clone().addScaledVector(dir, room);
        if (!camReady) camPos.copy(goal);
        camPos.lerp(goal, damp(10, dt));
        camera.position.copy(camPos);
        at.set(s.x + Math.cos(s.yaw) * 1.6, y + 0.75, s.z - Math.sin(s.yaw) * 1.6);
      }
      camReady = true;
      if (shake > 0) {
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        shake = Math.max(0, shake - dt * 1.2);
      }
      camera.lookAt(at);
      const wantFov = (roofCam ? 68 : 58) + Math.min(1, Math.abs(s.speed) / T.top) * 10;
      fov += (wantFov - fov) * damp(4, dt);
      if (Math.abs(camera.fov - fov) > 0.05) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      return moved;
    },
  };
}

export type Drive = ReturnType<typeof createDrive>;
