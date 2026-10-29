/*
 * Other players' vehicles (docs/multiplayer-plan.md, "What others see"): a
 * player in their car, motorbike, kart, aircraft or the hire boat is drawn
 * in it, its model and paint from what they told the room (protocol.ts
 * `Vehicle`), placed where their snapshots put it (its heading from their
 * facing, `faceYaw()`), and moving as it's seen to move: wheels rolling, a
 * car's front wheels steered, a bike leaning into its turns with the rider's
 * foot down as it stops, a kart's driver tipping into a drift, an aircraft
 * pitching with its climb and banking with its turn (its control surfaces
 * and gear are airframe.ts's, the gear down when they say so), the boat
 * rising at the bow with its wheel turned. Their Degen sits on the bike,
 * in the kart and at the boat's wheel (the car's glass and the aircraft's
 * hide him). The bike, the kart and the boat are their own chunks, fetched
 * the first time anyone is seen in one.
 */
import * as THREE from 'three';
import { createCar } from './cars';
import { createFleet, type Fleet } from './aircraft';
import { paintHex, type PlayerCar } from './mycar';
import type { BikeId } from './mybike';
import type { KartId } from './mykart';
import type { PlaneId } from './myplane';
import { G } from './bike-sim';
import type { Degen } from './character';
import { FLAG, faceYaw, type Vehicle } from '../net/protocol';

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = THREE.MathUtils.clamp;
const MODEL: Record<PlaneId, 'prop' | 'bizjet' | 'heli'> = { prop: 'prop', bizjet: 'bizjet', heli: 'heli' };

/** Where they are this frame, as drawn (interpolated between snapshots) */
export interface VehFrame {
  x: number;
  y: number;
  z: number;
  face: number;
  speed: number;
  flags: number;
  dt: number;
  t: number;
}

export interface RemoteVehicle {
  readonly tag: Vehicle;
  /** Their Degen is drawn in it (on the bike, in the kart, at the boat's wheel): the vehicle poses him */
  readonly carries: boolean;
  /** Its model has come (the bike, the kart and the boat are fetched first) */
  readonly ready: boolean;
  place(f: VehFrame): void;
  dispose(): void;
}

export function remoteVehicle(scene: THREE.Scene, tag: Vehicle, fig: Degen): RemoteVehicle {
  const hex = paintHex(tag.p);
  let ready = false;
  let gone = false;
  let place: (f: VehFrame, steer: number, lean: number, dist: number) => void = () => {};
  let drop = () => {};
  const carries = tag.k === 'bike' || tag.k === 'kart' || tag.k === 'boat';
  /** What's seen of its motion: the turn rate (smoothed), the climb, where it was */
  let rate = 0;
  let climb = 0;
  let last: { yaw: number; y: number } | null = null;
  let foot = 1;

  // (each kind's model and how it moves; the bike, the kart and the boat once their chunks are in)
  if (tag.k === 'car') {
    const car = createCar(tag.id as PlayerCar, hex);
    scene.add(car.group);
    const wheelbase = car.spec.L * 0.6;
    let lastSpeed = 0;
    place = (f, _steer, _lean, dist) => {
      car.group.position.set(f.x, f.y, f.z);
      car.group.rotation.set(0, faceYaw(f.face), 0);
      car.drive(dist, clamp(Math.atan((rate * wheelbase) / Math.max(f.speed, 1)), -0.55, 0.55));
      // (the brake lights while it's slowing)
      car.lights(f.speed < lastSpeed - f.dt * 2, false, null);
      lastSpeed = f.speed;
    };
    drop = () => car.dispose();
    ready = true;
  } else if (tag.k === 'plane') {
    const fleet: Fleet = createFleet(MODEL[tag.id as PlaneId], [hex]);
    scene.add(fleet.group);
    place = (f) => {
      const air = (f.flags & FLAG.air) !== 0;
      fleet.set(0, {
        x: f.x,
        y: f.y,
        z: f.z,
        yaw: faceYaw(f.face),
        pitch: air ? clamp(Math.atan2(climb, Math.max(f.speed, 4)), -0.4, 0.4) : 0,
        roll: air ? clamp(-Math.atan((f.speed * rate) / G), -0.7, 0.7) : 0,
        v: f.speed,
        ground: !air,
        gear: !air || (f.flags & FLAG.gear) !== 0,
        power: air || f.speed > 0.3 ? 1 : 0.35,
      });
      fleet.update(f.t, f.dt);
    };
    drop = () => fleet.dispose();
    ready = true;
  } else if (tag.k === 'kart')
    void import('./karts').then(({ createKart }) => {
      if (gone) return;
      const kart = createKart(tag.id as KartId, hex, { detail: 1 });
      scene.add(kart.group);
      kart.seat(fig);
      place = (f, steer, lean, dist) => {
        kart.group.position.set(f.x, f.y, f.z);
        kart.group.rotation.set(0, faceYaw(f.face), 0);
        kart.drive(dist, steer);
        kart.lean(lean);
      };
      drop = () => kart.dispose();
      ready = true;
    });
  else if (tag.k === 'bike')
    void import('./bikes').then(({ createBike }) => {
      if (gone) return;
      const bike = createBike(tag.id as BikeId, hex);
      scene.add(bike.group);
      bike.seat(fig);
      place = (f, steer, lean, dist) => {
        bike.group.position.set(f.x, f.y, f.z);
        // (leaning about its own length: its top to its right, positive, into a right turn)
        bike.group.rotation.set(lean, faceYaw(f.face), 0, 'YXZ');
        bike.drive(dist, steer);
        // (the left foot comes down as it stops)
        foot += ((f.speed < 0.8 ? 1 : 0) - foot) * Math.min(1, f.dt * 6);
        bike.pose(steer, foot);
      };
      drop = () => bike.dispose();
      ready = true;
    });
  else
    void Promise.all([import('./riverlife3d'), import('./boat')]).then(([{ hireBoat }, { seatAtHelm, helmPose }]) => {
      if (gone) return;
      const model = hireBoat();
      scene.add(model.group);
      seatAtHelm(fig, model);
      place = (f, steer) => {
        model.group.position.set(f.x, f.y, f.z);
        // (the bow up with speed)
        model.group.rotation.set(0, faceYaw(f.face), clamp(f.speed * 0.012, 0, 0.09), 'YXZ');
        helmPose(fig, model, steer);
      };
      drop = () => {
        fig.g.removeFromParent();
        model.group.removeFromParent();
        model.group.traverse((o) => void (o as THREE.Mesh).geometry?.dispose());
      };
      ready = true;
    });

  return {
    tag,
    carries,
    get ready() {
      return ready;
    },
    place(f) {
      const yaw = faceYaw(f.face);
      if (last && f.dt > 0) {
        rate += (wrap(yaw - last.yaw) / f.dt - rate) * Math.min(1, f.dt * 6);
        climb += ((f.y - last.y) / f.dt - climb) * Math.min(1, f.dt * 4);
      }
      last = { yaw, y: f.y };
      // (a turn rate's lean, as a bike's into a right turn: positive; its steer, left positive as the cars')
      const lean = clamp(-Math.atan((f.speed * rate) / G), -0.6, 0.6);
      const steer = clamp(rate * 0.35, -0.5, 0.5);
      place(f, steer, tag.k === 'kart' ? clamp(lean * 2, -1, 1) : lean, f.speed * f.dt);
    },
    dispose() {
      gone = true;
      drop();
    },
  };
}
