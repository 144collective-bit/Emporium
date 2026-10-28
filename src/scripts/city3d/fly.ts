/*
 * Flying your own aircraft (walk mode, Airport Phase 2): get in at the
 * hangar, take off, fly anywhere over Sector 7, land and get out wherever
 * you touch down. flight-sim.ts holds the rules (arcade handling, soft
 * collisions); this is the view: the aircraft on screen, the cameras, the
 * readout and the engine.
 *
 * - Your aircraft (the one picked at the hangar, myplane.ts) stands in the
 *   hangar until you first get in; after that it stays where you land it,
 *   until the hangar menu brings it home, walk mode ends in the air or the
 *   page reloads.
 * - It's drawn as a fleet of one (aircraft.ts createFleet), so the props and
 *   rotor spin, the gear folds and the beacons blink like the airport's own.
 * - Cameras (V): a chase camera that swings in behind (look around with the
 *   mouse, a drag or the right stick; it settles back) and a nose camera
 *   that banks with it.
 * - It bumps softly off the airport's aircraft (their spheres, flight-sim.ts
 *   HULLS) and everything solid; nothing is ever damaged.
 */
import * as THREE from 'three';
import { createFleet, type Fleet, type ModelKind } from './aircraft';
import { HANGAR_ROOF, HANGAR_SPOT, type AircraftKind, type Pose } from './airfield';
import type { Sfx } from './combat';
import { CEILING, TUNES, canLeave, flyReach, hullAt, newFlight, stepFly, type FlyInput, type FlyState, type FlyTune } from './flight-sim';
import { paintHex } from './mycar';
import { FLY, type MyPlane, type PlaneId } from './myplane';
import type { Box } from './solids';

export interface FlyDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: HTMLElement;
  /** Your saved aircraft (model and paint) */
  myPlane(): MyPlane;
  /** Every solid box in the city (landmarks, placed buildings) */
  /** The solid boxes within `reach` of a point (the collision grid's answer) */
  solids(x: number, z: number, reach: number): Box[];
  /** The ground's height (the raised blocks and sidewalks) */
  groundAt(x: number, z: number): number;
  /** How far the camera can sit from a point along a direction before something's in the way */
  cameraRoom(from: THREE.Vector3, dir: THREE.Vector3, want: number): number;
  /** Is a spot free for Degen to stand on (getting out)? */
  free(x: number, z: number): boolean;
  /** The airport's own aircraft, where they are now */
  traffic(): { kind: AircraftKind; pose: Pose }[];
  sfx(kind: Sfx, gain?: number): void;
  /** The engine's voice: revs 0..1, negative for off */
  aero(kind: 'prop' | 'jet' | 'heli', revs: number): void;
  bounds: Box;
}

const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Tiles per second to km/h, and tiles to metres (a tile is about 1.8 m) */
const KMH = 1.8 * 3.6;
const METRES = 1.8;
const MODEL: Record<PlaneId, ModelKind> = { prop: 'prop', bizjet: 'bizjet', heli: 'heli' };
const VOICE: Record<PlaneId, 'prop' | 'jet' | 'heli'> = { prop: 'prop', bizjet: 'jet', heli: 'heli' };
/** The nose camera: just ahead of the nose (forward, up), clear of the propeller and the rotor */
const NOSE: Record<PlaneId, [number, number]> = { prop: [3.05, 1.2], bizjet: [4.7, 1.25], heli: [2.05, 1.2] };
/** Where Degen climbs out: forward along the left side, clear of the fuselage or the skids */
const DOOR: Record<PlaneId, [number, number]> = { prop: [0.7, 1.15], bizjet: [2.65, 1.2], heli: [0.35, 1.45] };

/** One aircraft on screen: a fleet of one, its pose from the sim's state */
interface Craft {
  id: PlaneId;
  fleet: Fleet;
  state: FlyState;
}

export function createFly(d: FlyDeps) {
  const { camera, root } = d;
  const hud = root.querySelector<HTMLElement>('[data-fly-hud]')!;
  const speedEl = hud.querySelector<HTMLElement>('[data-fly-speed]')!;
  const altEl = hud.querySelector<HTMLElement>('[data-fly-alt]')!;
  const powerEl = hud.querySelector<HTMLElement>('[data-fly-power]')!;
  const stateEl = hud.querySelector<HTMLElement>('[data-fly-state]')!;
  const gas = root.querySelector<HTMLElement>('[data-drive-gas]');
  const brake = root.querySelector<HTMLElement>('[data-drive-brake]');

  /** One fleet per model and slot (yours, and the hangar's showroom while yours is away), made when first needed */
  const fleets = new Map<string, Fleet>();
  function fleetFor(slot: 'own' | 'show', id: PlaneId) {
    const key = `${slot}:${id}`;
    let f = fleets.get(key);
    if (!f) {
      f = createFleet(MODEL[id], ['#ffffff']);
      f.group.name = `my-${id}`;
      d.scene.add(f.group);
      fleets.set(key, f);
    }
    return f;
  }
  const home = () => newFlight(HANGAR_SPOT.x, HANGAR_SPOT.z, HANGAR_SPOT.yaw);
  function dress(slot: 'own' | 'show', p: MyPlane, state: FlyState): Craft {
    for (const [k, f] of fleets) if (k.startsWith(`${slot}:`)) f.group.visible = false;
    const fleet = fleetFor(slot, p.model);
    fleet.group.visible = true;
    fleet.paint(0, paintHex(p.paint));
    const c = { id: p.model, fleet, state };
    pose(c, 0, 0);
    return c;
  }
  const pose = (c: Craft, t: number, dt: number) => {
    const s = c.state;
    c.fleet.set(0, { x: s.x, y: s.y, z: s.z, yaw: s.yaw, pitch: s.pitch, roll: s.roll, v: s.speed, ground: s.ground, gear: s.gear, power: s.spool });
    c.fleet.update(t, dt);
  };

  /** Yours: at home in the hangar, flying, or parked wherever you landed */
  let craft = dress('own', d.myPlane(), home());
  /** The hangar menu's pick while yours is away */
  let show: Craft | null = null;
  let flying = false;
  let tune: FlyTune = TUNES[craft.id];
  let noseCam = false;
  let camYaw = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  let lookIdle = 0;
  let shake = 0;
  let fov = 60;
  let clock = 0;
  const camPos = new THREE.Vector3();
  const pivot = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const at = new THREE.Vector3();
  const goal = new THREE.Vector3();
  let camReady = false;

  const atHome = () => {
    const s = craft.state;
    return Math.hypot(s.x - HANGAR_SPOT.x, s.z - HANGAR_SPOT.z) < 0.8 && Math.abs(wrap(s.yaw - HANGAR_SPOT.yaw)) < 0.2 && s.y < 0.3;
  };
  /** The airport's aircraft nearby, as spheres */
  const soft: { x: number; y: number; z: number; r: number }[] = [];
  function gatherSoft(s: FlyState) {
    soft.length = 0;
    for (const { kind, pose: p } of d.traffic()) {
      if (Math.abs(p.x - s.x) > 30 || Math.abs(p.z - s.z) > 30 || Math.abs(p.y - s.y) > 20) continue;
      for (const c of hullAt(p, kind)) soft.push(c);
    }
    return soft;
  }
  function setPedals(on: boolean) {
    if (gas) {
      gas.textContent = on ? 'Faster' : 'Gas';
      gas.setAttribute('aria-label', on ? 'Faster' : 'Gas');
    }
    if (brake) {
      brake.textContent = on ? 'Slower' : 'Brake';
      brake.setAttribute('aria-label', on ? 'Slower' : 'Brake and reverse');
    }
  }

  return {
    get active() {
      return flying;
    },
    get state() {
      return craft.state;
    },
    /** Is your aircraft out of the hangar? */
    get away() {
      return !atHome();
    },
    /** What you're flying */
    get name() {
      return FLY[craft.id].name;
    },
    /** Can you climb out here (on the ground, stopped)? */
    get canLeave() {
      return canLeave(craft.state);
    },
    /** Your aircraft's door for getting in (moments.ts): where it stands, its heading, the door along it and the body's side there */
    doorOf() {
      const s = craft.state;
      const [u, side] = DOOR[craft.id];
      return { x: s.x, z: s.z, yaw: s.yaw, u, side: side - 0.45 };
    },
    /** How far a point is from your aircraft's door (for the Get in prompt) */
    near(x: number, z: number) {
      if (flying) return Infinity;
      const s = craft.state;
      const reach = Math.min(...hullAt(s, tune.hull).map((c) => Math.hypot(c.x - x, c.z - z) - c.r));
      return s.y > 1.5 ? Infinity : reach;
    },
    /** Does your parked aircraft block this spot (walking)? Only its body, so you can walk under the wings */
    blocks(x: number, z: number, pad: number) {
      if (flying) return false;
      const s = craft.state;
      return hullAt(s, tune.hull).some((c, i) => c.y - c.r < s.y + 1.4 && i < 3 && Math.hypot(c.x - x, c.z - z) < c.r + pad);
    },
    /** The hangar menu: show a pick (on your aircraft at home, or in the showroom slot while yours is away) */
    preview(p: MyPlane) {
      if (flying) return;
      if (atHome()) {
        craft = dress('own', p, craft.state);
        tune = TUNES[craft.id];
        if (show) show.fleet.group.visible = false;
        show = null;
      } else show = dress('show', p, home());
    },
    /** Closed without keeping: your saved aircraft goes back, the showroom empties */
    cancel(saved: MyPlane) {
      if (show) show.fleet.group.visible = false;
      show = null;
      if (atHome()) {
        craft = dress('own', saved, craft.state);
        tune = TUNES[craft.id];
      }
    },
    /** Kept (or brought home): your aircraft is back in the hangar, as picked */
    recall(p: MyPlane) {
      if (flying) return;
      if (show) show.fleet.group.visible = false;
      show = null;
      craft = dress('own', p, home());
      tune = TUNES[craft.id];
    },
    /** Climb in */
    enter() {
      if (flying) return false;
      flying = true;
      tune = TUNES[craft.id];
      const s = craft.state;
      s.ground = true;
      s.speed = s.vx = s.vz = s.vy = 0;
      s.power = 0;
      camYaw = s.yaw;
      lookYaw = lookPitch = 0;
      camReady = false;
      fov = camera.fov;
      hud.hidden = false;
      root.classList.add('is-driving', 'is-flying');
      root.dataset.plane = FLY[craft.id].name;
      setPedals(true);
      d.sfx('door');
      return true;
    },
    /** Climb out (only on the ground, stopped): returns where Degen steps out; it stays parked */
    exit() {
      if (!flying || !canLeave(craft.state)) return null;
      flying = false;
      const s = craft.state;
      s.speed = s.vx = s.vz = s.vy = 0;
      s.power = 0;
      hud.hidden = true;
      root.classList.remove('is-driving', 'is-flying');
      delete root.dataset.plane;
      setPedals(false);
      d.aero(VOICE[craft.id], -1);
      d.sfx('door');
      // Out of the left side by the door if there's room, else the right, behind or ahead
      const [u, side] = DOOR[craft.id];
      const fx = Math.cos(s.yaw);
      const fz = -Math.sin(s.yaw);
      const rx = Math.sin(s.yaw);
      const rz = Math.cos(s.yaw);
      const end = tune.L / 2 + 0.5;
      const spots: [number, number][] = [
        [s.x + fx * u - rx * side, s.z + fz * u - rz * side],
        [s.x + fx * u + rx * side, s.z + fz * u + rz * side],
        [s.x - fx * end, s.z - fz * end],
        [s.x + fx * end, s.z + fz * end],
      ];
      const [x, z] = spots.find(([px, pz]) => d.free(px, pz)) ?? spots[0];
      // (`from`: the seat behind the door, for the step down, moments.ts)
      return { x, z, yaw: s.yaw + Math.PI / 2, from: { x: s.x + fx * u, z: s.z + fz * u } };
    },
    /** Leaving walk mode in the air: you're set down by the hangar and the aircraft goes home */
    abandon(p: MyPlane) {
      if (!flying) return;
      flying = false;
      hud.hidden = true;
      root.classList.remove('is-driving', 'is-flying');
      delete root.dataset.plane;
      setPedals(false);
      d.aero(VOICE[craft.id], -1);
      craft = dress('own', p, home());
      tune = TUNES[craft.id];
    },
    toggleView() {
      noseCam = !noseCam;
      camReady = false;
    },
    look(dx: number, dy: number) {
      lookYaw = THREE.MathUtils.clamp(lookYaw - dx, -2.6, 2.6);
      lookPitch = THREE.MathUtils.clamp(lookPitch + dy, -0.4, 0.8);
      lookIdle = 0;
    },
    /** Not flying: the engine winds down and the props and rotor slow to a stop */
    idle(dt: number) {
      clock += dt;
      const s = craft.state;
      if (s.spool > 0) {
        s.spool = Math.max(0, s.spool - dt * 0.35);
        pose(craft, clock, dt);
      } else craft.fleet.update(clock, dt);
    },
    /** One frame of flying; returns how far it moved (tiles) */
    update(dt: number, inp: FlyInput) {
      if (!flying) return 0;
      clock += dt;
      const s = craft.state;
      const T = tune;
      const px = s.x;
      const pz = s.z;
      const hit = stepFly(s, inp, T, Math.min(dt, 1 / 20), { boxes: d.solids(s.x, s.z, flyReach(s)), ceilings: [HANGAR_ROOF], soft: gatherSoft(s), ground: d.groundAt }, d.bounds);
      if (hit > 1.5) {
        d.sfx('bump', Math.min(1, hit / 8));
        shake = Math.min(0.3, hit * 0.03);
      }
      pose(craft, clock, dt);

      // Readout: speed, height over the ground, the lever (or the rotor), and what it's doing
      const ground = d.groundAt(s.x, s.z);
      const kmh = String(Math.round(Math.hypot(s.vx, s.vz) * KMH));
      if (speedEl.textContent !== kmh) speedEl.textContent = kmh;
      const alt = String(Math.max(0, Math.round((s.y - ground) * METRES)));
      if (altEl.textContent !== alt) altEl.textContent = alt;
      const lever = T.kind === 'plane' ? s.power : s.spool;
      powerEl.style.setProperty('--v', lever.toFixed(2));
      const status = T.kind === 'heli' ? (s.ground ? (s.spool < 0.7 ? 'Rotor' : 'Ready') : Math.hypot(s.vx, s.vz) > 2 ? 'Flying' : 'Hover') : s.ground ? (s.speed > T.rotate * 0.6 ? 'Rotate' : 'Taxi') : s.y > CEILING - 2 ? 'Ceiling' : 'Flying';
      if (stateEl.textContent !== status) stateEl.textContent = status;
      d.aero(VOICE[craft.id], T.kind === 'plane' ? Math.min(1, 0.1 + s.spool * 0.62 + (Math.abs(s.speed) / T.top) * 0.28) : Math.min(1, s.spool * 0.82 + (Math.abs(s.vy) / T.climb) * 0.1 + (Math.abs(s.speed) / T.top) * 0.1));

      // Cameras
      lookIdle += dt;
      if (lookIdle > 1.2) {
        lookYaw += (0 - lookYaw) * damp(2.5, dt);
        lookPitch += (0 - lookPitch) * damp(2.5, dt);
      }
      camYaw += wrap(s.yaw - camYaw) * damp(noseCam ? 20 : 2.6, dt);
      const yaw = camYaw + lookYaw;
      const fx = Math.cos(yaw);
      const fz = -Math.sin(yaw);
      if (noseCam) {
        const [u, h] = NOSE[craft.id];
        const nx = Math.cos(s.yaw);
        const nz = -Math.sin(s.yaw);
        camera.position.set(s.x + nx * u, s.y + h + Math.sin(s.pitch) * u, s.z + nz * u);
        const p = s.pitch + lookPitch * 0.6;
        at.set(camera.position.x + fx * Math.cos(p) * 10, camera.position.y + Math.sin(p) * 10 - 0.6, camera.position.z + fz * Math.cos(p) * 10);
        camera.up.set(0, 1, 0);
        camera.lookAt(at);
        // It banks with the aircraft
        camera.rotateZ(-s.roll * 0.85);
      } else {
        const pitchC = 0.2 + lookPitch + (s.ground ? 0.06 : 0);
        pivot.set(s.x, s.y + T.tall * 0.55, s.z);
        dir.set(-fx * Math.cos(pitchC), Math.sin(pitchC), -fz * Math.cos(pitchC));
        const want = 4.5 + T.L * 1.15 + Math.min(14, Math.hypot(s.vx, s.vz) * 0.18);
        const room = d.cameraRoom(pivot, dir, want);
        goal.copy(pivot).addScaledVector(dir, room);
        if (!camReady) camPos.copy(goal);
        camPos.lerp(goal, damp(9, dt));
        camera.position.copy(camPos);
        at.set(s.x + Math.cos(s.yaw) * 2.5, s.y + T.tall * 0.5, s.z - Math.sin(s.yaw) * 2.5);
        camera.up.set(0, 1, 0);
        camera.lookAt(at);
      }
      camReady = true;
      if (shake > 0) {
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        shake = Math.max(0, shake - dt * 1.2);
      }
      const wantFov = (noseCam ? 70 : 58) + Math.min(1, Math.hypot(s.vx, s.vz) / T.top) * 12;
      fov += (wantFov - fov) * damp(4, dt);
      if (Math.abs(camera.fov - fov) > 0.05) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      return Math.hypot(s.x - px, s.z - pz);
    },
  };
}

export type Fly = ReturnType<typeof createFly>;
