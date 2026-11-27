/*
 * The kart park in 3D, the place (west of the ring highway since
 * docs/kart-west-plan.md, off Kart Road). What's built at the boot is the
 * spot (its group, what City view lifts on hover, its ring and pin), the
 * LED screens' one live picture (the race's order, `board()`), the trophy
 * cabinet's cups (`trophies()`), the fans' bob, and its people
 * (kartfacility.ts `KART_PEOPLE`: the banks, the stand, the terrace, the
 * café, the plaza, the paddock; half on phones), trees, lamps and the car
 * park's cars.
 *
 * The buildings and the stands (the team garages, the clubhouse, the
 * timing tower, the two grandstands, the screens' frames, the podium, the
 * flags, the arch, the kiosk and the signs) are kartpark-draw.ts, a district
 * of its own since the boot's slimming (2026-11-27), drawn into the spot's
 * group as you approach, `KART_PARK_LIVE` what they share. Everything else
 * round the circuit (the circuit itself, trackside, the paddock, the road
 * and the car park) is kartgrounds3d.ts, loaded as you approach too;
 * `KART_VIEW` is how the race's `setCourse()` and `racing()` reach it,
 * whenever it comes.
 */
import * as THREE from 'three';
import type { SpotId } from '../../lib/city';
import { FONT_DISPLAY, FONT_MONO, PAL, fx, glowMat, lit, liveTex, rng, toon } from './kit';
import { toWorld } from './kartpark';
import { BAYS, CIRCUIT, HUT_DOOR, SITE, type CourseId } from './kartcircuit';
import { CUP_IDS, type CupId } from './kart-cups';
import type { Flag } from './kartcrowd';
import { CLUBHOUSE, COACHES, KART_LAMPS, KART_PEOPLE, KART_TREES, PARKED, TRANSPORTERS, standSeats } from './kartfacility';
import { chequerBands, glowText, spacing } from './kartsigns';
import { parkedCars, type CarId } from './cars';
import type { KartBoard, KartPark } from './kart-types';
import type { Idle, Spot } from './landmarks';
import { addLamp, addTree, type Tick } from './world';

/** The place's id (city.ts adds it to SpotId) */
const ID = 'karts' as unknown as SpotId;

/**
 * Which way round the guidance points, whether a race has the pits closed and the flag at each marshal post
 * (kartcrowd.ts `marshalFlags()`, null between races): the race sets it
 * (`setCourse()`, `racing()`), the grounds (kartgrounds3d.ts) show it once they've loaded (`apply`)
 */
export const KART_VIEW: { course: CourseId; racing: boolean; apply: (() => void) | null; flags: Flag[] | null } = { course: 'circuit', racing: false, apply: null, flags: null };

/**
 * What the boot shares with the buildings' drawing (kartpark-draw.ts): the spot's group it draws into, the screens'
 * live material, whether motion's reduced, and the fans' bob it hands back once the stand's drawn
 */
export const KART_PARK_LIVE: { places: THREE.Group | null; screenMat: THREE.Material | null; reduced: boolean; fans: ((t: number) => void) | null } = {
  places: null,
  screenMat: null,
  reduced: false,
  fans: null,
};
/** The kart park's generator's seed (the stand's seats and fans, then which trees a phone keeps) */
export const KART_SEED = 4747;

export const PAVING = 0.025;
const PIT_Y = 0.04;

const SCREEN_TITLE = 'KART PARK';
const SCREEN_SUB = 'SECTOR 7 CIRCUIT';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const W = (u: number, v: number) => toWorld([u, v]);

/** The LED screens between races: the park's name over the circuit's */
function idleScreen(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = '#0b0a18';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffffff08';
  for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1.5);
  chequerBands(c, w, h, 18);
  c.strokeStyle = PAL.cyan;
  c.lineWidth = 3;
  c.strokeRect(7, 17, w - 14, h - 34);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `900 105px ${FONT_DISPLAY}`;
  spacing(c, 6);
  glowText(c, SCREEN_TITLE, w / 2, 110, PAL.pink, 18);
  c.font = `700 30px ${FONT_MONO}`;
  spacing(c, 5);
  c.fillStyle = PAL.cyan;
  c.fillText(SCREEN_SUB, w / 2, 195);
}
/** The LED screens in a race: the lap and the order, each kart in its colour, yours lit */
function raceScreen(c: CanvasRenderingContext2D, w: number, h: number, b: KartBoard) {
  c.fillStyle = '#0b0a18';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffffff08';
  for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1.5);
  chequerBands(c, w, h, 14);
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  c.font = `900 34px ${FONT_DISPLAY}`;
  spacing(c, 2);
  glowText(c, b.title, 16, 36, PAL.cyan, 10);
  c.textAlign = 'right';
  glowText(c, b.done ? 'FINISH' : `LAP ${Math.min(b.lap, b.laps)}/${b.laps}`, w - 16, 36, b.done ? PAL.gold : PAL.pink, 10);
  c.font = `700 22px ${FONT_MONO}`;
  spacing(c, 1);
  const rows = b.rows.slice(0, 8);
  rows.forEach((r, k) => {
    const col = k < 4 ? 0 : 1;
    const x = 16 + col * (w / 2);
    const y = 82 + (k % 4) * 40;
    c.fillStyle = r.you ? '#ffffff' : '#ffffff22';
    c.fillRect(x - 6, y - 16, w / 2 - 22, 32);
    c.fillStyle = r.you ? '#0b0a18' : '#ffffff';
    c.textAlign = 'left';
    c.fillText(`P${k + 1}`, x, y);
    c.fillStyle = r.colour;
    c.fillRect(x + 46, y - 9, 14, 18);
    c.fillStyle = r.you ? '#0b0a18' : '#ffffff';
    c.fillText(r.name.slice(0, 10).toUpperCase(), x + 68, y);
  });
}

export function buildKartPark(scene: THREE.Scene, crowd: Idle[], opts: { tick: (f: Tick) => void; reduced: boolean; low: boolean }): KartPark {
  const { low, reduced } = opts;
  const r = rng(KART_SEED);
  const group = new THREE.Group();
  group.name = 'kartpark';
  scene.add(group);
  /** The buildings and the stands: the spot's group, lifted on hover (drawn into by kartpark-draw.ts) */
  const places = new THREE.Group();
  places.name = ID;
  group.add(places);
  const c = CIRCUIT;
  const n = c.x.length;

  /* ----- The LED screens' face: one live picture for all three (the race's order, or the park's name) ----- */

  const SCREEN_W = 512;
  const SCREEN_H = 256;
  const screenTexture = liveTex(SCREEN_W, SCREEN_H, (c, w, h) => idleScreen(c, w, h));
  const screenMat = lit(new THREE.MeshBasicMaterial({ map: screenTexture }), 0.9, 1.25);
  const repaint = (draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const cv = screenTexture.image as HTMLCanvasElement | undefined;
    const ctx = typeof HTMLCanvasElement !== 'undefined' && cv instanceof HTMLCanvasElement ? cv.getContext('2d') : null;
    if (!ctx) return;
    ctx.setTransform(cv!.width / SCREEN_W, 0, 0, cv!.height / SCREEN_H, 0, 0);
    draw(ctx, SCREEN_W, SCREEN_H);
    screenTexture.needsUpdate = true;
  };
  Object.assign(KART_PARK_LIVE, { places, screenMat, reduced });

  // The clubhouse's footprint and its trophy cabinet's run (the pin over its roof, the cups along the case)
  const [hx0, hz0] = W(SITE.hut.u0, SITE.hut.v0);
  const [hx1, hz1] = W(SITE.hut.u1, SITE.hut.v1);
  const HUT_H = SITE.hut.h;
  const [cab0] = W(CLUBHOUSE.cabinet.u0, 0);
  const [cab1] = W(CLUBHOUSE.cabinet.u1, 0);

  /* ----- Its people, trees, lamps and the car park's cars ----- */

  for (const p of KART_PEOPLE) if (!(low && p.trim)) crowd.push({ x: p.x, z: p.z, y: p.y, ry: p.ry, act: p.act });
  // (the generator stepped past the stand's seats and fans, their colours and their bobs' phases, as kartpark-draw.ts
  // runs it, so a phone keeps the same trees)
  const seats = standSeats(low, r);
  for (let i = 0; i < seats.fans.length * 2; i++) r();
  for (const [x, z, s, pine] of KART_TREES) if (!low || r() < 0.6) addTree(x, z, s, pine, 0);
  for (const [x, z, ry, y] of KART_LAMPS) addLamp(x, z, ry, y);
  parkedCars(scene, 0.04, PARKED as [CarId, number, number, number, string][]);
  parkedCars(scene, 0.05, [...COACHES, ...TRANSPORTERS] as [CarId, number, number, number, string][]);

  /* ----- The trophy cabinet's trophies: the cups you've won, painted from the save (trophies()) ----- */

  const cabinet = new THREE.Group();
  cabinet.name = 'kart-trophies';
  cabinet.userData.keep = true;
  places.add(cabinet);
  const trophyGeo = (() => {
    const pts = [
      [0, 0],
      [0.09, 0],
      [0.09, 0.03],
      [0.03, 0.05],
      [0.025, 0.14],
      [0.08, 0.2],
      [0.1, 0.3],
      [0.0, 0.3],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 12);
  })();
  const metals = [toon(PAL.gold), toon('#c9cbd8'), toon('#cd7f32')];
  const showTrophies = (won: Partial<Record<CupId, number>>) => {
    cabinet.clear();
    const [, cz] = W(0, SITE.hut.v1);
    CUP_IDS.forEach((id, k) => {
      const place = won[id];
      if (!place || place > 3) return;
      const x = cab0 + ((cab1 - cab0) * (k + 0.5)) / CUP_IDS.length;
      const m = new THREE.Mesh(trophyGeo, metals[place - 1]);
      m.position.set(x, 1.65 + 0.05, cz - 0.72);
      m.scale.setScalar(1.6);
      cabinet.add(m);
    });
  };

  /* ----- The spot ----- */

  let bx0 = Infinity;
  let bx1 = -Infinity;
  let bz0 = Infinity;
  let bz1 = -Infinity;
  for (let i = 0; i < n; i++) {
    bx0 = Math.min(bx0, c.x[i]);
    bx1 = Math.max(bx1, c.x[i]);
    bz0 = Math.min(bz0, c.z[i]);
    bz1 = Math.max(bz1, c.z[i]);
  }
  const focus = V((bx0 + bx1) / 2, 0, (bz0 + bz1) / 2);
  const pin = V((hx0 + hx1) / 2, HUT_H + 2.6, (hz0 + hz1) / 2);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.64, 48), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(HUT_DOOR.x, PAVING + 0.014, HUT_DOOR.z);
  group.add(fx(ring));
  const spot: Spot = { id: ID, group: places, focus, size: 110, pin, ring };
  // The show kart waits in the middle bay, nose to the pit lane (kart.ts: yaw π/2 faces -z)
  const [bayX, bayZ] = BAYS[3];
  const showSpot = { x: bayX, y: PAVING + PIT_Y, z: bayZ + 0.45, yaw: Math.PI / 2 };

  // (the fans' bob, once the stand's drawn: kartpark-draw.ts)
  opts.tick(({ t }) => {
    if (reduced) return;
    KART_PARK_LIVE.fans?.(t);
  });

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
      repaint((c, w, h) => (b ? raceScreen(c, w, h, b) : idleScreen(c, w, h)));
    },
    trophies(won) {
      showTrophies(won);
    },
  };
}
