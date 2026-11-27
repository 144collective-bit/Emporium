/*
 * The garage on the south bank, east of the south row: a flat-roofed
 * workshop with an open bay (a car lift inside), a roller door and a little
 * office, a big neon GARAGE sign on the roof, and on the forecourt a
 * showroom turntable with your own car on it. The office door opens the
 * garage menu (garage-ui.ts) in walk mode.
 *
 * It's outside the core, so it's drawn in world numbers (GARAGE_SITE in
 * solids.ts holds the footprints walk mode and the server share).
 *
 * This is what the boot keeps (the boot's slimming, 2026-11-26): the stands
 * your car and bike rest on (here and at home), the lamps, the menu's views
 * and taking them out. The building, the sign and the turntable's disc are
 * garage3d.ts, a district loaded as you approach (districts.ts).
 */
import * as THREE from 'three';
import { GARAGE_SITE } from './solids';
import { SLAB as S, addLamp, type Tick } from './world';
import { GARAGE } from './layout';
import { createCar, type Car } from './cars';
import { paintHex, type MyCar } from './mycar';
import type { MyBike } from './mybike';
import type { Bike } from './bikes';
import { REST as BIKE_REST } from './bike-sim';
import { BIKE_HOME, CAR_HOME, HOME_SLAB, HOME_VIEW } from './home';

/**
 * Your motorbikes' drawing (vehicle plan Phase 7): bikes.ts, a chunk fetched once the city is up; index.ts hands its
 * `createBike` here (`setBikeMaker()`), and the stand shows your bike from then on
 */
export const BIKE_3D: { create?: (id: MyBike['model'], paint: string) => Bike } = {};

/** The turntable's resting turn: three-quarters on to the avenue */
const REST = -0.65;

export function buildGarage(scene: THREE.Scene, opts: { tick: (f: Tick) => void; reduced: boolean; car: MyCar; bike: MyBike }) {
  const { ox, oz } = GARAGE;
  // (the building itself is garage3d.ts, loaded as you approach: here, only the stands your car and bike rest on)
  const g = new THREE.Group();
  g.name = 'garage-stands';
  scene.add(g);

  const TT = GARAGE_SITE.turntable;
  const spin = new THREE.Group();
  spin.position.set(TT.x, S, TT.z);
  spin.rotation.y = REST;
  // Your car comes and goes on it (kept out of any far form: lod.ts)
  spin.userData.keep = true;
  g.add(spin);

  // Lamps at the front corners of the lot, leaning in
  addLamp(ox + 0.4, oz + 0.3, -Math.PI / 2);
  addLamp(ox + 8.6, oz + 0.3, -Math.PI / 2);

  // Where your car and bike stand when they're not out (docs/home-plan.md Phase 2): at home in the Ends, the car in
  // Degen's garage and the bike on his driveway (home.ts), or here, the car on the turntable and the bike on its
  // stand, while this garage's menu is open (`at('city')`: a showroom). The same car and bike, moved between the two.
  let where: 'home' | 'city' = 'home';
  const homeCar = new THREE.Group();
  homeCar.position.set(CAR_HOME.x, HOME_SLAB + 0.012, CAR_HOME.z);
  homeCar.rotation.y = CAR_HOME.yaw;
  homeCar.userData.keep = true;
  scene.add(homeCar);
  const homeBike = new THREE.Group();
  homeBike.position.set(BIKE_HOME.x, HOME_SLAB + 0.012, BIKE_HOME.z);
  homeBike.rotation.y = BIKE_HOME.yaw;
  homeBike.userData.keep = true;
  scene.add(homeBike);
  /** Put the car and the bike on the stands they belong on now */
  function settle() {
    if (car) {
      (where === 'city' ? spin : homeCar).add(car.group);
      car.group.position.set(0, where === 'city' ? 0.07 : 0, 0);
      car.group.rotation.set(0, 0, 0);
    }
    if (bike) (where === 'city' ? stand : homeBike).add(bike.group);
  }

  let car: Car | null = null;
  let showing = '';
  function show(c: MyCar) {
    const key = `${c.model}:${c.paint}:${JSON.stringify(c.look)}`;
    if (key === showing) return;
    showing = key;
    car?.dispose();
    car = createCar(c.model, paintHex(c.paint), true, c.look);
    settle();
  }

  const CITY_VIEW = { eye: new THREE.Vector3(TT.x - 2.6, S + 2.3, TT.z - 6.8), at: new THREE.Vector3(TT.x + 0.5, S + 0.95, TT.z + 0.6) };
  const AT_HOME_VIEW = { eye: new THREE.Vector3(HOME_VIEW.eye[0], HOME_SLAB + HOME_VIEW.eye[1], HOME_VIEW.eye[2]), at: new THREE.Vector3(HOME_VIEW.at[0], HOME_SLAB + HOME_VIEW.at[1], HOME_VIEW.at[2]) };
  let spinning = false;
  opts.tick(({ dt }) => {
    if (!spinning || opts.reduced) return;
    spin.rotation.y += dt * 0.45;
  });

  // Your motorbike on its side stand on the forecourt, between the bay and the office door, facing the avenue
  const BIKE_SPOT = { x: ox + 5.9, z: oz + 1.7, yaw: Math.PI / 2 };
  const stand = new THREE.Group();
  stand.position.set(BIKE_SPOT.x, S, BIKE_SPOT.z);
  stand.rotation.y = BIKE_SPOT.yaw;
  stand.userData.keep = true;
  g.add(stand);
  let bike: Bike | null = null;
  let bikeShowing = '';
  let bikeWant: MyBike | null = opts.bike;
  function showBike(b: MyBike) {
    bikeWant = b;
    if (!BIKE_3D.create) return;
    const key = `${b.model}:${b.paint}`;
    if (key === bikeShowing) return;
    bikeShowing = key;
    bike?.dispose();
    bike = BIKE_3D.create(b.model, paintHex(b.paint));
    // (resting on its side stand, a touch over to its left)
    bike.group.rotation.x = BIKE_REST.lean;
    settle();
  }
  function clearBike() {
    bike?.dispose();
    bike = null;
    bikeShowing = '';
    bikeWant = null;
  }

  /** Empty the turntable (your car is out on the streets) */
  function clear() {
    car?.dispose();
    car = null;
    showing = '';
  }

  // (once the stands and the bike's are made: `settle()` reads them)
  show(opts.car);

  return {
    /** Put a car on the turntable (picking in the menu shows each one here) */
    show,
    clear,
    /** Is a car on the turntable? */
    get hasCar() {
      return !!car;
    },
    /** Which stands the car and the bike are on: 'home' (Degen's garage and driveway) but while this garage's menu is open */
    at(w: 'home' | 'city') {
      if (w === where) return;
      where = w;
      spinning = false;
      spin.rotation.y = REST;
      settle();
    },
    get where() {
      return where;
    },
    /** The car at home (its door opens as you get in there), and which way it faces */
    get car() {
      return car;
    },
    get yaw() {
      return where === 'city' ? spin.rotation.y : CAR_HOME.yaw;
    },
    /** Where the car stands at home, and how far round it reaches (getting in there): the turntable in the showroom */
    get turntable() {
      return where === 'city' ? TT : CAR_HOME;
    },
    /** Your motorbike's stand: the drawing comes (bikes.ts), what's on it, and taking it out (vehicle plan Phase 7) */
    setBikeMaker(create: NonNullable<typeof BIKE_3D.create>) {
      BIKE_3D.create = create;
      if (bikeWant) showBike(bikeWant);
    },
    showBike,
    clearBike,
    get hasBike() {
      return !!bike;
    },
    get bikeSpot() {
      return where === 'city' ? BIKE_SPOT : BIKE_HOME;
    },
    takeOutBike() {
      if (!bike) return null;
      const out = bike;
      bike = null;
      bikeShowing = '';
      bikeWant = null;
      scene.add(out.group);
      const sp = where === 'city' ? BIKE_SPOT : BIKE_HOME;
      return { bike: out, x: sp.x, z: sp.z, yaw: sp.yaw };
    },
    /**
     * Drive it off: the turntable's car moves into the city (facing the avenue) and is the
     * caller's to look after from now on. The turntable stays empty until a car comes home.
     */
    takeOut() {
      if (!car) return null;
      const out = car;
      car = null;
      showing = '';
      spin.rotation.y = REST;
      scene.add(out.group);
      // (out of Degen's garage nose first, or off the turntable facing the avenue)
      if (where === 'home') {
        out.group.position.set(CAR_HOME.x, HOME_SLAB, CAR_HOME.z);
        return { car: out, x: CAR_HOME.x, z: CAR_HOME.z, yaw: CAR_HOME.yaw };
      }
      out.group.position.set(TT.x, S + 0.07, TT.z);
      return { car: out, x: TT.x, z: TT.z, yaw: Math.PI / 2 };
    },
    /** Turn slowly while the menu is open (it stands still under reduced motion); back to rest after */
    spin(on: boolean) {
      spinning = on && where === 'city';
      if (!on) spin.rotation.y = REST;
    },
    /** Where the menu's camera looks from and at: the showroom's turntable, or into Degen's garage from his driveway */
    get view() {
      return where === 'city' ? CITY_VIEW : AT_HOME_VIEW;
    },
  };
}

export type Garage = ReturnType<typeof buildGarage>;
