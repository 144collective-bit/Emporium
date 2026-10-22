/*
 * The garage on the south bank, east of the south row: a flat-roofed
 * workshop with an open bay (a car lift inside), a roller door and a little
 * office, a big neon GARAGE sign on the roof, and on the forecourt a
 * showroom turntable with your own car on it. The office door opens the
 * garage menu (garage-ui.ts) in walk mode.
 *
 * It's outside the core, so it's drawn in world numbers (GARAGE_SITE in
 * solids.ts holds the footprints walk mode and the server share).
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, lit, neon, neonSign, plane, toon } from './kit';
import { GARAGE_SITE } from './solids';
import { SLAB as S, addLamp, type Tick } from './world';
import { GARAGE } from './layout';
import { createCar, type Car } from './cars';
import { paintHex, type MyCar } from './mycar';

/** The turntable's resting turn: three-quarters on to the avenue */
const REST = -0.65;

export function buildGarage(scene: THREE.Scene, opts: { tick: (f: Tick) => void; reduced: boolean; car: MyCar }) {
  const { ox, oz } = GARAGE;
  const [x0, z0, x1, z1, H] = GARAGE_SITE.building;
  const W = x1 - x0;
  const D = z1 - z0;
  const g = new THREE.Group();
  g.name = 'garage';
  scene.add(g);
  const b = new Batch();

  const wall = toon('#3d4a6b');
  const wallDark = toon('#2c3550');
  const trim = toon('#1b1830');
  const roof = toon('#25223a');
  const yellow = toon('#ffd23f');
  const inside = toon('#0e0c1a');

  // The building: a body set back from the front, then the front wall's pillars and lintel
  const FT = 0.25;
  b.box(x0, S, z0 + FT, W, H, D - FT, wall);
  b.box(x0 - 0.1, S + H, z0 - 0.1, W + 0.2, 0.16, D + 0.2, roof);
  const bays: [number, number][] = [
    [x0 + 0.35, x0 + 2.85],
    [x0 + 3.25, x0 + 5.75],
  ];
  const DOOR_H = 1.75;
  for (const [a, c] of [
    [x0, x0 + 0.35],
    [x0 + 2.85, x0 + 3.25],
    [x0 + 5.75, x0 + 6.15],
  ])
    b.box(a, S, z0, c - a, DOOR_H, FT, wallDark);
  b.box(x0, S + DOOR_H, z0, W, H - DOOR_H, FT, wallDark);

  // Bay 1 stands open: the dark workshop and a yellow car lift
  const [o0, o1] = bays[0];
  b.box(o0, S, z0 + FT - 0.02, o1 - o0, DOOR_H, 0.02, inside);
  for (const x of [o0 + 0.2, o1 - 0.32]) b.box(x, S, z0 + 0.05, 0.12, 1.55, 0.12, yellow);
  b.box(o0 + 0.2, S + 0.85, z0 + 0.07, o1 - o0 - 0.4, 0.07, 0.08, yellow);
  b.box(o0, S, z0 - 0.02, o1 - o0, 0.02, FT, trim);

  // Bay 2: a roller door, down
  const [r0, r1] = bays[1];
  const shutter = canvasTex(256, 192, (c) => {
    c.fillStyle = '#8a86a8';
    c.fillRect(0, 0, 256, 192);
    c.fillStyle = '#6f6a8f';
    for (let y = 0; y < 192; y += 12) c.fillRect(0, y, 256, 4);
    // Hazard stripes along the bottom rail
    for (let x = -24; x < 256; x += 24) {
      c.fillStyle = '#ffd23f';
      c.beginPath();
      c.moveTo(x, 192);
      c.lineTo(x + 12, 176);
      c.lineTo(x + 24, 176);
      c.lineTo(x + 12, 192);
      c.fill();
    }
    c.fillStyle = '#14121f';
    c.fillRect(0, 172, 256, 4);
  });
  const door = plane(r1 - r0, DOOR_H, new THREE.MeshToonMaterial({ map: shutter }));
  door.position.set((r0 + r1) / 2, S + DOOR_H / 2, z0 + FT - 0.01);
  door.rotation.y = Math.PI;
  g.add(door);

  // The office: a lit window and the door the menu opens from
  const dx = GARAGE_SITE.door.x;
  b.box(x0 + 6.15, S, z0, x1 - x0 - 6.15, DOOR_H, FT, wallDark);
  const glow = lit(new THREE.MeshToonMaterial({ color: '#2a3b66', emissive: '#ffd36b' }), 0.08, 1.4);
  b.box(x0 + 6.3, S + 0.55, z0 - 0.02, 0.62, 0.8, 0.04, glow);
  b.box(dx - 0.36, S, z0 - 0.03, 0.72, 1.4, 0.05, toon('#14102a'));
  b.box(dx - 0.36, S + 0.62, z0 - 0.04, 0.72, 0.5, 0.02, glow);
  b.box(dx + 0.22, S + 0.65, z0 - 0.07, 0.06, 0.12, 0.04, toon('#c9c4e6'));

  // Canopy over the bays, with a neon strip along its edge
  b.box(x0, S + 1.95, z0 - 0.7, 6.15, 0.1, 0.72, toon('#e219e5'));
  b.add(new THREE.BoxGeometry(6.15, 0.035, 0.035).translate(x0 + 3.075, S + 1.93, z0 - 0.7), neon(PAL.cyan, 0.8, 2.6));

  // The roof sign
  b.box(x0 + 1.2, S + H + 0.16, z0 + 0.15, 5.8, 0.95, 0.12, toon('#0b0a18'));
  for (const x of [x0 + 1.6, x0 + 6.6]) b.box(x, S + H + 0.16, z0 + 0.27, 0.08, 0.6, 0.3, trim);
  const signTex = neonSign('GARAGE', PAL.cyan, { board: null, size: 200, tracking: 18 });
  const sign = plane(5.6, 1.1, lit(new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false }), 1, 1.7));
  sign.position.set(x0 + 4.1, S + H + 0.63, z0 + 0.13);
  sign.rotation.y = Math.PI;
  g.add(fx(sign));
  // A small "OFFICE" plate over its door
  const plate = canvasTex(256, 64, (c) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, 256, 64);
    c.font = `900 44px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = PAL.warm;
    c.fillText('OFFICE', 128, 34);
  });
  const office = plane(0.9, 0.22, lit(new THREE.MeshBasicMaterial({ map: plate }), 0.9, 1.6));
  office.position.set(dx, S + 1.55, z0 - 0.04);
  office.rotation.y = Math.PI;
  g.add(fx(office));

  // Tyres stacked by the bay, a toolbox, oil drums at the side
  const tyre = toon('#17151f');
  const T = GARAGE_SITE.tyres;
  for (let k = 0; k < 4; k++) b.add(new THREE.CylinderGeometry(0.28, 0.28, 0.17, 14).translate(T.x, S + 0.09 + k * 0.18, T.z), tyre);
  b.box(x1 - 0.55, S, z0 - 0.5, 0.45, 0.55, 0.32, toon('#e23b3b'));
  for (const [x, z] of [
    [x1 + 0.38, z0 + 0.9],
    [x1 + 0.38, z0 + 1.5],
  ])
    b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12).translate(x, S + 0.28, z), toon('#2aabee'));

  // Forecourt: bay lines, and the turntable
  const line = toon('#d9d4ef');
  b.box(ox + 4.9, S + 0.006, oz + 0.6, 0.06, 0.005, 2.6, line);
  b.box(ox + 0.5, S + 0.006, oz + 3.45, 8.0, 0.005, 0.06, toon('#ffd23f'));
  b.build(g);

  const TT = GARAGE_SITE.turntable;
  const spin = new THREE.Group();
  spin.position.set(TT.x, S, TT.z);
  spin.rotation.y = REST;
  // Your car comes and goes on it: never baked into the garage's far form (lod.ts)
  spin.userData.keep = true;
  g.add(spin);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(TT.r, TT.r, 0.07, 40), toon('#2b2a40'));
  disc.position.y = 0.035;
  disc.receiveShadow = true;
  spin.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(TT.r - 0.06, 0.03, 6, 48), neon(PAL.cyan, 0.7, 2.4));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.075;
  spin.add(fx(ring));

  // Lamps at the front corners of the lot, leaning in
  addLamp(ox + 0.4, oz + 0.3, -Math.PI / 2);
  addLamp(ox + 8.6, oz + 0.3, -Math.PI / 2);

  let car: Car | null = null;
  let showing = '';
  function show(c: MyCar) {
    const key = `${c.model}:${c.paint}`;
    if (key === showing) return;
    showing = key;
    car?.dispose();
    car = createCar(c.model, paintHex(c.paint));
    car.group.position.y = 0.07;
    spin.add(car.group);
  }
  show(opts.car);

  let spinning = false;
  opts.tick(({ dt }) => {
    if (!spinning || opts.reduced) return;
    spin.rotation.y += dt * 0.45;
  });

  /** Empty the turntable (your car is out on the streets) */
  function clear() {
    car?.dispose();
    car = null;
    showing = '';
  }

  return {
    /** Put a car on the turntable (picking in the menu shows each one here) */
    show,
    clear,
    /** Is a car on the turntable? */
    get hasCar() {
      return !!car;
    },
    /** Where the turntable is (getting in at home) */
    turntable: TT,
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
      out.group.position.set(TT.x, S + 0.07, TT.z);
      return { car: out, x: TT.x, z: TT.z, yaw: Math.PI / 2 };
    },
    /** Turn slowly while the menu is open (it stands still under reduced motion); back to rest after */
    spin(on: boolean) {
      spinning = on;
      if (!on) spin.rotation.y = REST;
    },
    /** Where the showroom camera looks from and at */
    view: {
      eye: new THREE.Vector3(TT.x - 2.6, S + 2.3, TT.z - 6.8),
      at: new THREE.Vector3(TT.x + 0.5, S + 0.95, TT.z + 0.6),
    },
  };
}

export type Garage = ReturnType<typeof buildGarage>;
