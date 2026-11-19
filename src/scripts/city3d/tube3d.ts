/*
 * The underground's south line's trains drawn (docs/south-plan.md Phase 4g; southtrains.ts the rules): round-top tube
 * cars, two to a train: silver sides with a band in the line's colour, windows down each side you see in and out of,
 * doors, a cab at each end with its windscreen and lights; inside, the floor, bench seats down each side, yellow grab
 * poles and a strip light along the roof (a ride's seen from in here: tube-ui.ts). Two trains on the timetable from the
 * clock, and a third for a ride (the two hidden while you ride). Loaded when you go below ground in the south or ride
 * (index.ts); placed every frame near, not at all far off; under reduced motion they stand still.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { LINE_COLOUR, PLAT_Y } from './southline';
import { TUBE, carOffset, carPose, trackOf, trainAt } from './southtrains';

const L = TUBE.carLen;
const HW = 1.2;
const SIDE = toon('#c9cdd6', { side: THREE.DoubleSide });
const BAND = toon(LINE_COLOUR, { side: THREE.DoubleSide });
const ROOF = toon('#aeb3be', { side: THREE.DoubleSide });
const UNDER = toon('#2a2b33');
const FLOOR = toon('#4c5463');
const SEAT = toon('#1f6f7a');
const POLE = toon('#e8c23a');
const DARK = toon('#14151c');
const LIGHT = neon('#f2f6ff', 0.7, 1.4);
const HEAD = neon('#fff2c4', 0.6, 1.6);
const TAIL = neon('#ff3b3b', 0.4, 1.3);

/** One car, its floor at y 0, along +x, its middle at the origin */
function makeCar(low: boolean): THREE.Group {
  const g = new THREE.Group();
  const b = new Batch();
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: THREE.Material) =>
    b.add(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), m);
  const h = L / 2;
  // The underframe, the floor
  box(-h + 0.3, h - 0.3, -0.72, -0.1, -HW + 0.15, HW - 0.15, UNDER);
  box(-h, h, -0.1, 0, -HW, HW, FLOOR);
  // The sides: below the windows (the line's band along them), pillars between the windows, over them
  for (const side of [-1, 1]) {
    const z = side * HW;
    box(-h, h, -0.1, 0.62, z - 0.03, z + 0.03, SIDE);
    box(-h, h, 0.62, 0.76, z - 0.035, z + 0.035, BAND);
    for (let x = -h; x <= h + 1e-6; x += L / 6) box(x - 0.08, x + 0.08, 0.76, 1.56, z - 0.03, z + 0.03, SIDE);
    box(-h, h, 1.56, 1.78, z - 0.03, z + 0.03, SIDE);
    // (the doors: dark lines round two pairs each side)
    for (const dx of [-L / 4, L / 4]) for (const ex of [-0.75, 0.75]) box(dx + ex - 0.025, dx + ex + 0.025, 0, 1.7, z - 0.04 * -side, z + 0.04 * side, DARK);
  }
  // The round top: an arc from side to side over the car (seen from inside and out)
  const segs = low ? 6 : 10;
  const pos: number[] = [];
  for (let j = 0; j < segs; j++) {
    const [a0, a1] = [(j / segs) * Math.PI, ((j + 1) / segs) * Math.PI];
    const p = (a: number, x: number) => [x, 1.78 + Math.sin(a) * 0.42, Math.cos(a) * HW];
    pos.push(...p(a0, -h), ...p(a0, h), ...p(a1, h), ...p(a0, -h), ...p(a1, h), ...p(a1, -h));
  }
  const roof = new THREE.BufferGeometry();
  roof.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  roof.computeVertexNormals();
  b.add(roof, ROOF);
  // The ends: a cab at each, its windscreen open either side of a middle pillar (from inside you see the tunnel ahead
  // and the car behind), a light either side low down
  for (const end of [-1, 1]) {
    const x = end * h;
    const wall = (y0: number, y1: number, z0: number, z1: number) => box(x - 0.04, x + 0.04, y0, y1, z0, z1, SIDE);
    wall(-0.1, 0.85, -HW, HW);
    wall(1.55, 2.15, -HW, HW);
    for (const k of [-1, 1]) {
      wall(0.85, 1.55, Math.min(k * HW, k * 0.95), Math.max(k * HW, k * 0.95));
      wall(0.85, 1.55, Math.min(0, k * 0.15), Math.max(0, k * 0.15));
    }
    for (const z of [-0.8, 0.8]) box(x + end * 0.03 - 0.02, x + end * 0.03 + 0.02, 0.25, 0.4, z - 0.12, z + 0.12, end > 0 ? HEAD : TAIL);
  }
  // Inside: bench seats down each side, their backs, the grab poles, a strip light along the roof
  for (const side of [-1, 1]) {
    box(-h + 0.4, h - 0.4, 0, 0.42, side * (HW - 0.5) - 0.25, side * (HW - 0.5) + 0.25, SEAT);
    box(-h + 0.4, h - 0.4, 0.42, 0.95, side * (HW - 0.12) - 0.05, side * (HW - 0.12) + 0.05, SEAT);
  }
  if (!low) for (let x = -h + 1.6; x < h - 1; x += 2.2) b.add(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 6).translate(x, 1.05, 0), POLE);
  box(-h + 0.5, h - 0.5, 2.08, 2.12, -0.12, 0.12, LIGHT);
  b.build(g, { cast: false, receive: false, lift: false });
  return g;
}

/** The trains: the timetable's two, and the ride's; `update()` each frame, `ride()` holds the ride's where it is */
export function buildTube(scene: THREE.Scene, opts: { reduced: boolean; low: boolean }) {
  const proto = makeCar(opts.low);
  const train = () => {
    const cars = Array.from({ length: TUBE.cars }, () => proto.clone());
    for (const c of cars) scene.add(c);
    return cars;
  };
  const trains = [train(), train()];
  const rider = train();
  for (const c of rider) c.visible = false;
  const place = (cars: THREE.Group[], s: number, dir: 1 | -1, u: number) =>
    cars.forEach((c, i) => {
      const pose = carPose(s + carOffset(i, dir), u);
      // (facing the way it runs: +x along the line its way)
      const [dx, dz] = [pose.dir[0] * dir, pose.dir[1] * dir];
      c.position.set(pose.at[0], PLAT_Y, pose.at[1]);
      c.rotation.set(0, Math.atan2(-dz, dx), 0);
    });
  /** The still frame under reduced motion: the trains stood at a moment of the round */
  const STILL = 37;
  let riding = false;
  return {
    /** Place the timetable's trains for the clock (seconds), unless a ride's on; `on`: drawn at all (down below in
     * the south: up in the street they're not, their draw calls saved) */
    update(t: number, on: boolean) {
      for (const cars of trains) for (const c of cars) c.visible = on && !riding;
      if (riding || !on) return;
      const tt = opts.reduced ? STILL : t;
      trains.forEach((cars, k) => {
        const at = trainAt(k, tt);
        place(cars, at.s, at.dir, trackOf(k));
      });
    },
    /** A ride's train where it is (null: the ride's over, the timetable's back) */
    ride(at: { s: number; dir: 1 | -1; u: number } | null) {
      riding = !!at;
      for (const cars of trains) for (const c of cars) c.visible = !at && c.visible;
      for (const c of rider) c.visible = !!at;
      if (at) place(rider, at.s, at.dir, at.u);
    },
    /** The ride's front car (its camera's inside it) */
    front: () => rider[0],
  };
}
export type Tube = ReturnType<typeof buildTube>;
