/*
 * Driving your own car, or your kart (walk mode): get in at the vehicle,
 * drive anywhere in the city, get out wherever you stop. drive-sim.ts holds
 * the rules (arcade handling, soft collisions); this is the view: the
 * vehicle on screen, the camera, the speed readout and the engine.
 *
 * - The car lives on the garage's turntable until you first get in; after
 *   that it stays where you leave it (until it's sent home from the garage,
 *   or the page reloads).
 * - The kart stands in the kart park's pits between races (the owner's
 *   call: it can be taken out and driven anywhere too, with Degen seated in
 *   it). It goes back to the pits when a race starts. On the track it rides
 *   the decks and the banking (`track()`, kartpark.ts trackSurfaceAt).
 * - Both can be out at once; you're in one at a time.
 * - Cameras (V): a chase camera that swings in behind the car (look around
 *   with the mouse, a drag or the right stick; it settles back behind) and a
 *   roof camera.
 * - Traffic stops for you (`walker` in life.ts reaches further in a car);
 *   you bump softly off other cars and people, never through them.
 * - The handling comes from the model's numbers with the garage's mods on
 *   (`stats()`, carStatsOf in tycoon.ts), tuned again every time you get
 *   in, so an upgrade bought while the car was parked counts at once.
 */
import * as THREE from 'three';
import { createDegen, type Degen, type Outfit } from './character';
import type { Sfx } from './combat';
import { CARS } from './cars';
import { circles, newCar, stepCar, tune, type CarState, type DriveInput, type DriveTune } from './drive-sim';
import type { Garage } from './garage';
import type { Kart } from './karts';
import { bodies } from './life';
import type { MyCar, PlayerCar } from './mycar';
import type { KartId } from './mykart';
import type { Box } from './solids';

export interface DriveDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: HTMLElement;
  garage: Garage;
  /** Your saved car (model and paint) */
  myCar(): MyCar;
  /** A model's 0..1 handling with its mods on (carStatsOf in tycoon.ts) */
  stats(model: PlayerCar): { speed: number; accel: number; grip: number };
  /** Your kart in the pits (kart.ts): where it stands when it's home, taking it out, and bringing it back; its handling */
  kart: {
    home(): { x: number; z: number; yaw: number } | null;
    takeOut(): { kart: Kart; model: KartId; name: string; x: number; z: number; yaw: number } | null;
    bringBack(): void;
    stats(model: KartId): { speed: number; accel: number; grip: number };
  };
  /** What Degen wears (the kart's driver is a seated Degen in the same look) */
  outfit(): Outfit;
  /** The kart track's surface under a point (height and banking), if it's on the track at about this height */
  track(x: number, z: number, yNow: number): { y: number; roll: number } | null;
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

  /** A vehicle out in the city: the car (off the turntable) or the kart (out of the pits) */
  interface Out {
    kind: 'car' | 'kart';
    name: string;
    model: PlayerCar | KartId;
    group: THREE.Group;
    drive(dist: number, steer: number): void;
    dispose(): void;
    seat?(degen: Degen | null): void;
    state: CarState;
    tune: DriveTune;
    holder: THREE.Group;
    /** Where it sits: the ground or the track's deck, and the banking's tilt */
    y: number;
    bank: number;
    /** The roof camera's height and how far forward it sits */
    roof: number;
    roofFwd: number;
  }
  let car: Out | null = null;
  let kart: Out | null = null;
  /** The one being driven */
  let out: Out | null = null;
  const active = () => !!out;
  /** The seated Degen for the kart, made once */
  let driver: Degen | null = null;
  /** Locked (a countdown): no throttle or steering, handbrake on */
  let frozen = false;
  let roofCam = false;
  let camYaw = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  let lookIdle = 0;
  let shake = 0;
  let roll = 0;
  let pitch = 0;
  let lastSpeed = 0;
  let fov = 60;
  const camPos = new THREE.Vector3();
  const pivot = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const at = new THREE.Vector3();
  let camReady = false;

  function tuneOf(v: Out): DriveTune {
    if (v.kind === 'car') {
      const s = CARS[v.model as PlayerCar];
      return tune(d.stats(v.model as PlayerCar), { L: s.L, W: s.W, wheelbase: s.axles[1] - s.axles[0] });
    }
    // A kart: small, quick off the line, a little slower than a race pace on the open road
    const k = d.kart.stats(v.model as KartId);
    return tune({ speed: k.speed * 0.8, accel: k.accel, grip: k.grip }, { L: 1.2, W: 0.95, wheelbase: 0.82 });
  }

  /** The parked vehicles' footprints as circles (for walking round them) */
  const parkedCircles = () => [car, kart].flatMap((v) => (v && v !== out ? circles(v.state, v.tune) : []));
  const outs = () => [car, kart].filter((v): v is Out => !!v);

  function place(v: Out) {
    const s = v.state;
    v.holder.position.set(s.x, v.y, s.z);
    v.holder.rotation.y = s.yaw;
    v.group.rotation.set((v === out ? roll : 0) + v.bank, 0, v === out ? pitch : 0);
  }

  /** The kart out of the pits, standing where it was shown */
  function takeKart(): Out | null {
    const taken = d.kart.takeOut();
    if (!taken) return null;
    const holder = new THREE.Group();
    d.scene.add(holder);
    holder.add(taken.kart.group);
    taken.kart.group.position.set(0, 0, 0);
    const v: Out = {
      kind: 'kart',
      name: taken.name,
      model: taken.model,
      group: taken.kart.group,
      drive: (dist, steer) => taken.kart.drive(dist, steer),
      dispose: () => taken.kart.dispose(),
      seat: (deg) => taken.kart.seat(deg),
      state: newCar(taken.x, taken.z, taken.yaw),
      tune: { top: 0, reverse: 0, accel: 0, brake: 0, grip: 0, L: 1.2, W: 0.95, wheelbase: 0.82 },
      holder,
      y: d.groundAt(taken.x, taken.z),
      bank: 0,
      roof: 0.95,
      roofFwd: -0.1,
    };
    v.tune = tuneOf(v);
    place(v);
    return v;
  }
  function takeCar(): Out | null {
    const taken = d.garage.takeOut();
    if (!taken) return null;
    const model = d.myCar().model;
    const holder = new THREE.Group();
    d.scene.add(holder);
    holder.add(taken.car.group);
    taken.car.group.position.set(0, 0, 0);
    const spec = CARS[model];
    const v: Out = {
      kind: 'car',
      name: spec.name,
      model,
      group: taken.car.group,
      drive: (dist, steer) => taken.car.drive(dist, steer),
      dispose: () => taken.car.dispose(),
      state: newCar(taken.x, taken.z, taken.yaw),
      tune: { top: 0, reverse: 0, accel: 0, brake: 0, grip: 0, L: spec.L, W: spec.W, wheelbase: 1 },
      holder,
      y: d.groundAt(taken.x, taken.z),
      bank: 0,
      roof: spec.cabin[1][1] + 0.28,
      roofFwd: spec.cabin[2][0] * 0.6,
    };
    v.tune = tuneOf(v);
    place(v);
    return v;
  }
  /** How far a point is from a vehicle you could get into: parked ones, the turntable's car, the pits' kart */
  function nearest(x: number, z: number): { d: number; kind: 'car' | 'kart' } | null {
    let best: { d: number; kind: 'car' | 'kart' } | null = null;
    const offer = (dist: number, kind: 'car' | 'kart') => {
      if (!best || dist < best.d) best = { d: dist, kind };
    };
    for (const v of outs()) if (v !== out) offer(Math.min(...circles(v.state, v.tune).map((c) => Math.hypot(c.x - x, c.z - z) - c.r)), v.kind);
    if (!car && d.garage.hasCar) offer(Math.hypot(d.garage.turntable.x - x, d.garage.turntable.z - z) - d.garage.turntable.r, 'car');
    const home = kart ? null : d.kart.home();
    if (home) offer(Math.hypot(home.x - x, home.z - z) - 0.9, 'kart');
    return best;
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
      return active();
    },
    /** The vehicle being driven, else your car out in the city (parked), for the traffic and the camera */
    get state() {
      return (out ?? car)?.state ?? null;
    },
    /** Your car's own state, out of the garage (driving or parked); null while it's on the turntable */
    get carState() {
      return car?.state ?? null;
    },
    /** Driving the car (not the kart)? */
    get inCar() {
      return !!out && out.kind === 'car';
    },
    /** Is your car out of the garage? */
    get away() {
      return !!car;
    },
    /** Is the kart out of the pits? */
    get kartAway() {
      return !!kart;
    },
    get model() {
      return (car?.model as PlayerCar | undefined) ?? d.myCar().model;
    },
    /** What you're driving */
    get vehicle() {
      return out ? { kind: out.kind, name: out.name } : null;
    },
    /** How far Degen is from a vehicle he can get into (Infinity if there isn't one), and which it is */
    nearCar(x: number, z: number) {
      return nearest(x, z)?.d ?? Infinity;
    },
    nearKind(x: number, z: number) {
      return nearest(x, z)?.kind ?? null;
    },
    /** Does a parked vehicle block this spot (walking)? */
    blocks(x: number, z: number, pad: number) {
      return parkedCircles().some((c) => Math.hypot(c.x - x, c.z - z) < c.r + pad);
    },
    /** Get into the nearest vehicle (from the turntable, the pits, or wherever it's parked) */
    enter(x: number, z: number) {
      if (out) return false;
      const n = nearest(x, z);
      if (!n) return false;
      let v: Out | null;
      if (n.kind === 'car') v = car ?? (car = takeCar());
      else v = kart ?? (kart = takeKart());
      if (!v) return false;
      out = v;
      // Mods may have been bought since it was parked
      v.tune = tuneOf(v);
      if (v.seat) {
        driver ??= createDegen(d.outfit(), 2);
        v.seat(driver);
      }
      camYaw = v.state.yaw;
      lookYaw = lookPitch = 0;
      roll = pitch = 0;
      camReady = false;
      fov = camera.fov;
      place(v);
      hud.hidden = false;
      root.classList.add('is-driving');
      root.dataset.car = v.name;
      d.sfx('door');
      return true;
    },
    /** Get out: the vehicle stays parked; returns where Degen steps out and which way he faces */
    exit() {
      if (!out) return null;
      const v = out;
      out = null;
      const s = v.state;
      s.speed = s.vx = s.vz = 0;
      s.steer = 0;
      roll = pitch = 0;
      v.seat?.(null);
      place(v);
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
      const side = v.tune.W / 2 + 0.45;
      const end = v.tune.L / 2 + 0.45;
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
      if (!car || out === car) return;
      car.dispose();
      car.holder.removeFromParent();
      car = null;
    },
    /** The kart goes back to the pits (a race is starting, or the hut sends it home) */
    recallKart() {
      if (!kart || out === kart) return;
      kart.seat?.(null);
      kart.dispose();
      kart.holder.removeFromParent();
      kart = null;
      d.kart.bringBack();
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
    /** Is the car locked (a countdown)? */
    get frozen() {
      return frozen;
    },
    set frozen(on: boolean) {
      frozen = on;
    },
    /** One frame of driving; returns how far the car moved (tiles) */
    update(dt: number, inp: DriveInput) {
      if (!out) return 0;
      const v = out;
      const s = v.state;
      const T = v.tune;
      // Up on the track's deck, what's below the deck (its pillars) is no obstacle
      const boxes = v.y > 0.5 ? d.solids().filter((b) => b[4] > v.y + 0.2) : d.solids();
      if (frozen) inp = { throttle: 0, steer: 0, handbrake: true };
      const px = s.x;
      const pz = s.z;
      const hit = stepCar(s, inp, T, Math.min(dt, 1 / 20), { boxes, soft: gatherSoft(s) }, d.bounds);
      const moved = Math.hypot(s.x - px, s.z - pz);
      if (hit > 1.2) {
        d.sfx('bump', Math.min(1, hit / 7));
        shake = Math.min(0.25, hit * 0.03);
      }

      // The body: up the kerbs smoothly (and the kart track's ramps, decks and banking), leans into turns and squats under gas or brakes
      const track = d.track(s.x, s.z, v.y);
      v.y += (Math.max(d.groundAt(s.x, s.z), track?.y ?? -Infinity) - v.y) * damp(14, dt);
      v.bank += (-Math.atan(track?.roll ?? 0) - v.bank) * damp(8, dt);
      const accel = (s.speed - lastSpeed) / Math.max(dt, 1e-3);
      lastSpeed = s.speed;
      roll += (THREE.MathUtils.clamp(s.yawRate * s.speed * 0.012, -0.07, 0.07) - roll) * damp(6, dt);
      pitch += (THREE.MathUtils.clamp(accel * 0.006, -0.05, 0.05) - pitch) * damp(6, dt);
      v.drive(s.speed * dt, -s.steer);
      place(v);
      const y = v.y;

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
      if (roofCam) {
        camPos.set(s.x + fx * v.roofFwd, y + v.roof, s.z + fz * v.roofFwd);
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
