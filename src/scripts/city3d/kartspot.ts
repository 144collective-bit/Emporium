/*
 * The kart park as a place, at the boot (docs/boot-plan.md Phase 1): what
 * the rest of the city needs before its drawing loads. Its spot (the pin
 * over the clubhouse, the hover ring at its door, the buildings as plain
 * boxes on the `PICK` layer, never drawn, for the City view's click), the
 * show kart's bay, its people, trees, lamps and the car park's cars.
 *
 * The buildings, the stands and the screens are kartpark3d.ts, drawn into
 * the spot's group when the kart park's grounds load as you approach
 * (kartgrounds3d.ts `register()`). The race (kart.ts) can ask for things
 * before then: `KART_VIEW` keeps what it asked (the way round, the pits,
 * the LED screens' order, the trophies) and the drawing shows it when it
 * comes.
 */
import * as THREE from 'three';
import type { SpotId } from '../../lib/city';
import { PAL, PICK, fx, glowMat, rng } from './kit';
import { toWorld } from './kartpark';
import { BAYS, CIRCUIT, HUT_DOOR, SITE, type CourseId } from './kartcircuit';
import type { CupId } from './kart-cups';
import type { Flag } from './kartcrowd';
import { COACHES, GRANDSTAND, KART_LAMPS, KART_PEOPLE, KART_TREES, PARKED, TOWER, TRANSPORTERS } from './kartfacility';
import { parkedCars, type CarId } from './cars';
import type { KartBoard, KartPark } from './kart-types';
import type { Idle, Spot } from './landmarks';
import { addLamp, addTree } from './world';

/** The place's id (city.ts adds it to SpotId) */
export const KART_ID = 'karts' as unknown as SpotId;
/** The paving's and the pit lane's heights (kartpark3d.ts draws on them) */
export const PAVING = 0.025;
export const PIT_Y = 0.04;

/**
 * What the race asks of the site, kept until the drawing shows it: which way round the guidance points, whether a
 * race has the pits closed and the flag at each marshal post (kartcrowd.ts `marshalFlags()`, null between races),
 * which the grounds show once they've loaded (`apply`, kartgrounds3d.ts); the LED screens' order and the trophies,
 * which the buildings show (`show`, kartpark3d.ts); and the spot's group the buildings are drawn into (`places`)
 */
export const KART_VIEW: {
  course: CourseId;
  racing: boolean;
  apply: (() => void) | null;
  flags: Flag[] | null;
  board: KartBoard | null;
  trophies: Partial<Record<CupId, number>>;
  show: { board(b: KartBoard | null): void; trophies(won: Partial<Record<CupId, number>>): void } | null;
  places: THREE.Group | null;
} = { course: 'circuit', racing: false, apply: null, flags: null, board: null, trophies: {}, show: null, places: null };

const W = (u: number, v: number) => toWorld([u, v]);

export function buildKartSpot(scene: THREE.Scene, crowd: Idle[], opts: { low: boolean }): KartPark {
  const { low } = opts;
  const group = new THREE.Group();
  group.name = 'kartpark';
  scene.add(group);
  /** The buildings and the stands: the spot's group, lifted on hover (kartpark3d.ts draws into it) */
  const places = new THREE.Group();
  places.name = KART_ID;
  group.add(places);
  KART_VIEW.places = places;
  // What City view's click finds before the drawing comes: the garages, the clubhouse, the infield's stand, the big
  // covered stand and the timing tower, as boxes never drawn
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const G = SITE.garages;
  const H = SITE.hut;
  const S = SITE.stand;
  for (const { u0, v0, u1, v1, h } of [G, H, S, { ...GRANDSTAND, h: GRANDSTAND.roof }, TOWER]) {
    const [x0, z0] = W(u0, v0);
    const [x1, z1] = W(u1, v1);
    const box = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), hidden);
    box.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    box.layers.set(PICK);
    box.userData.keep = true;
    places.add(box);
  }

  /* ----- Its people, trees, lamps and the car park's cars ----- */

  const r = rng(4747);
  for (const p of KART_PEOPLE) if (!(low && p.trim)) crowd.push({ x: p.x, z: p.z, y: p.y, ry: p.ry, act: p.act });
  for (const [x, z, s, pine] of KART_TREES) if (!low || r() < 0.6) addTree(x, z, s, pine, 0);
  for (const [x, z, ry, y] of KART_LAMPS) addLamp(x, z, ry, y);
  parkedCars(scene, 0.04, PARKED as [CarId, number, number, number, string][]);
  parkedCars(scene, 0.05, [...COACHES, ...TRANSPORTERS] as [CarId, number, number, number, string][]);

  /* ----- The spot ----- */

  const c = CIRCUIT;
  const [bx0, bx1] = [Math.min(...c.x), Math.max(...c.x)];
  const [bz0, bz1] = [Math.min(...c.z), Math.max(...c.z)];
  const [hx0, hz0] = W(H.u0, H.v0);
  const [hx1, hz1] = W(H.u1, H.v1);
  const focus = new THREE.Vector3((bx0 + bx1) / 2, 0, (bz0 + bz1) / 2);
  const pin = new THREE.Vector3((hx0 + hx1) / 2, H.h + 2.6, (hz0 + hz1) / 2);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.64, 48), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(HUT_DOOR.x, PAVING + 0.014, HUT_DOOR.z);
  group.add(fx(ring));
  const spot: Spot = { id: KART_ID, group: places, focus, size: 110, pin, ring };
  // The show kart waits in the middle bay, nose to the pit lane (kart.ts: yaw π/2 faces -z)
  const [bayX, bayZ] = BAYS[3];
  const showSpot = { x: bayX, y: PAVING + PIT_Y, z: bayZ + 0.45, yaw: Math.PI / 2 };

  return {
    group,
    spot,
    setCourse(id) {
      KART_VIEW.course = id;
      KART_VIEW.apply?.();
    },
    racing(on) {
      KART_VIEW.racing = on;
      KART_VIEW.apply?.();
    },
    showSpot,
    board(b) {
      KART_VIEW.board = b;
      KART_VIEW.show?.board(b);
    },
    trophies(won) {
      KART_VIEW.trophies = won;
      KART_VIEW.show?.trophies(won);
    },
  };
}
