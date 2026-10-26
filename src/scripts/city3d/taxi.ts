/*
 * Taxis (docs/growth-plan.md Phase 8): pick a place on the world map and
 * "Taxi here". A yellow Cruiser with a lit TAXI sign on its roof comes round
 * the corner and pulls up at the kerb nearest you (`pathBetween()` in
 * routes.ts, from a spot on the road a way off); walk up to it (or Get in)
 * and it drives you along the streets to the kerb nearest the place, stopping
 * at red lights and behind the traffic like any other car, under a chase
 * camera. Skip ride (or Esc) cuts to the end; you step out at the place's
 * spot (places.ts). Free: there's no fare. Under reduced motion it's there
 * at once and the ride is a cut.
 */
import * as THREE from 'three';
import { CARS, createCar } from './cars';
import { PAL, fx, glowMat } from './kit';
import { SPOTS, lightState, pathBetween, pointOn, type Route } from './routes';
import { bodies, stoppers } from './life';
import { deckSlope, deckY, onHarbour } from './harbour';
import { departuresRoadY, departuresSlope } from './airfield';
import type { Place } from './places';
import type { Ride } from './walk';

/** Its top speed in town (tiles a second), how hard it pulls away and brakes */
const SPEED = 12;
const ACCEL = 4;
const BRAKE = 7;
/** Where it comes from: a spot on the road this far off */
const FROM = [35, 70] as const;
/** Getting in: this close to it (tiles) */
const BOARD = 3.2;
const ROAD_Y = 0.035;

export interface TaxiDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  reduced: boolean;
  /** Where you are (walking) */
  you(): { x: number; z: number };
  /** On foot, free to get in */
  free(): boolean;
  /** Ride: start (Degen into the taxi) or end */
  setRide(r: Ride | null): boolean;
  /** Stand Degen at the place's spot */
  arrive(p: Place): void;
  /** Walk him up to the taxi's door and in (moments.ts), then `go`; false if he can't right now (it's taken at once) */
  approach?(at: { x: number; z: number; yaw: number; W: number }, go: () => void): boolean;
  /** Build what's waiting round a spot first */
  want(x: number, z: number, r: number): void;
  name(p: Place): string;
  toast(text: string): void;
  sfx(kind: 'door'): void;
}

export function createTaxis(root: HTMLElement, d: TaxiDeps) {
  const bar = root.querySelector<HTMLElement>('[data-taxi]')!;
  const text = bar.querySelector<HTMLElement>('[data-taxi-text]')!;
  const getIn = bar.querySelector<HTMLButtonElement>('[data-taxi-in]')!;
  const skip = bar.querySelector<HTMLButtonElement>('[data-taxi-skip]')!;
  const cancelBtn = bar.querySelector<HTMLButtonElement>('[data-taxi-cancel]')!;

  // The taxi: a Cruiser in taxi yellow, a lit sign on its roof (made the first time one's called)
  let car: ReturnType<typeof createCar> | null = null;
  const make = () => {
    if (car) return car;
    car = createCar('sedan', '#ffc23d');
    const roof = Math.max(...car.spec.cabin.map((p) => p[1]));
    const sign = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.13, 0.5), glowMat(PAL.warm, 0.95, null));
    box.position.y = 0.065;
    sign.add(box);
    // TAXI on both sides
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 40;
    const g = c.getContext('2d')!;
    g.fillStyle = '#111';
    g.fillRect(0, 0, 128, 40);
    g.fillStyle = '#ffd36b';
    g.font = '900 30px "Big Shoulders Display", Impact, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('TAXI', 64, 21);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    for (const side of [1, -1]) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.12), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      plane.position.set(0, 0.065, side * 0.256);
      if (side < 0) plane.rotation.y = Math.PI;
      sign.add(fx(plane));
    }
    sign.position.set(-0.3, roof, 0);
    car.group.add(sign);
    car.group.visible = false;
    d.scene.add(car.group);
    return car;
  };

  type State = 'idle' | 'coming' | 'waiting' | 'riding' | 'leaving';
  let state: State = 'idle';
  let route: Route | null = null;
  let p = 0;
  let v = 0;
  let seg = 0;
  let dest: Place | null = null;
  let leaveT = 0;
  const pos = new THREE.Vector3();
  const stop_ = { x: 0, z: 0, r: 1.2, on: false };
  stoppers.push(stop_);
  const fwd = new THREE.Vector2(1, 0);
  // The chase camera's spot and what it looks at, eased
  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();

  function show(msg: string, can: { in?: boolean; skip?: boolean; cancel?: boolean }) {
    bar.hidden = false;
    text.textContent = msg;
    getIn.hidden = !can.in;
    skip.hidden = !can.skip;
    cancelBtn.hidden = !can.cancel;
  }
  function hide() {
    bar.hidden = true;
  }
  /** Put the taxi where it is along its route */
  function place() {
    if (!route || !car) return;
    const o = pointOn(route, Math.min(p, route.len), seg);
    seg = o.seg;
    // (over Harbour Bridge's hump, its nose along the deck: harbour.ts)
    // (and up and down the airport's departures deck: airfield.ts)
    const harbour = onHarbour(o.at[0], o.at[1]);
    const hb = harbour ? deckY(o.at[1]) : departuresRoadY(o.at[0], o.at[1]);
    pos.set(o.at[0], ROAD_Y + hb, o.at[1]);
    fwd.set(o.dir[0], o.dir[1]);
    car.group.position.copy(pos);
    car.group.rotation.set(0, Math.atan2(-o.dir[1], o.dir[0]), harbour ? Math.atan(o.dir[1] * deckSlope(o.at[1])) : Math.atan(o.dir[0] * departuresSlope(o.at[0], o.at[1])), 'YXZ');
  }
  /** Drive on along the route, for the lights and the traffic ahead, easing to a stop at its end */
  function drive(dt: number, t: number) {
    if (!route || !car) return;
    let target = SPEED;
    // Stop at its end
    target = Math.min(target, Math.sqrt(Math.max(0, 2 * BRAKE * 0.8 * (route.len - p))));
    // Red lights (and late yellows) at the stop line
    for (const s of route.stops) {
      const dd = s.enter - 1.0 - (p + 1.2);
      if (dd < -0.05 || dd > 14) continue;
      const light = s.j.lit ? lightState(s.j, s.phase, t) : 'g';
      if (light === 'r' || (light === 'y' && dd > 2)) target = Math.min(target, Math.max(0, dd * 1.4));
    }
    // Whoever's ahead going the same way
    for (const o of bodies.cars) {
      const ox = Math.cos(o.yaw);
      const oz = -Math.sin(o.yaw);
      if (ox * fwd.x + oz * fwd.y < 0.5) continue;
      const rx = o.x - pos.x;
      const rz = o.z - pos.z;
      const along = rx * fwd.x + rz * fwd.y;
      if (along <= 0 || along > 14 || Math.abs(rx * fwd.y - rz * fwd.x) > 0.9) continue;
      target = Math.min(target, Math.max(0, (along - (o.len + 2.4) / 2 - 1) * 1.6));
    }
    const a = target > v ? ACCEL : BRAKE;
    v += Math.max(-a * dt, Math.min(a * dt, target - v));
    const step = v * dt;
    p += step;
    place();
    car.drive(step);
  }
  function chase(dt: number, snap = false) {
    // Behind and above, looking a little ahead of it
    const want = new THREE.Vector3(pos.x - fwd.x * 7.5, pos.y + 3.6, pos.z - fwd.y * 7.5);
    const at = new THREE.Vector3(pos.x + fwd.x * 3, pos.y + 0.8, pos.z + fwd.y * 3);
    const k = snap ? 1 : 1 - Math.exp(-dt * 3.2);
    cam.lerp(want, k);
    look.lerp(at, k);
    if (snap) {
      cam.copy(want);
      look.copy(at);
    }
    d.camera.position.copy(cam);
    d.camera.lookAt(look);
  }

  /** The ride, for walk mode: Degen sits in the taxi, the chase camera follows */
  const ride: Ride = {
    update(dt, t) {
      if (state === 'riding') {
        drive(dt, t);
        chase(dt);
        const left = route ? Math.max(0, (route.len - p) / SPEED) : 0;
        text.textContent = `Taxi to ${dest ? d.name(dest) : ''} · ${Math.ceil(left)} s`;
        if (route && p >= route.len - 0.05 && v < 0.2) finish();
      }
      return { x: pos.x, z: pos.z };
    },
    end() {
      stop();
    },
  };

  /** Call a taxi to take you to a place */
  function call(to: Place) {
    if (!d.free()) return d.toast('Taxis pick up on foot: get out first');
    if (state === 'riding') return;
    const you = d.you();
    const there = pathBetween([you.x, you.z], [to.at.x, to.at.z]);
    if (!there || there.len < 12) return d.toast(there ? `You're nearly at ${d.name(to)}: walk it` : 'No taxi can get there from here');
    dest = to;
    make();
    // Its pickup: the start of the drive there. It comes from a spot a way off, out on the roads
    const pick = there.pts[0];
    const from = SPOTS.filter((s) => {
      const dd = Math.hypot(s.x - pick[0], s.z - pick[1]);
      return dd > FROM[0] && dd < FROM[1];
    }).sort((a, b) => Math.hypot(a.x - pick[0], a.z - pick[1]) - Math.hypot(b.x - pick[0], b.z - pick[1]));
    let coming: Route | null = null;
    for (const s of from.slice(0, 6)) {
      coming = pathBetween([s.x, s.z], pick);
      if (coming && coming.len > 20) break;
    }
    route = coming;
    pending = there;
    p = 0;
    v = 0;
    seg = 0;
    car!.group.visible = true;
    if (!coming || d.reduced) {
      // At once: it's waiting at the kerb
      route = there;
      p = 0;
      place();
      state = 'waiting';
      show(`Your taxi to ${d.name(to)} is here`, { in: true, cancel: true });
    } else {
      place();
      state = 'coming';
      show(`A taxi's on its way · to ${d.name(to)}`, { cancel: true });
    }
    d.want(to.at.x, to.at.z, 70);
  }
  /** The drive there, kept while it comes for you */
  let pending: Route | null = null;

  /** The walk up to its door is under way (moments.ts) */
  let boarding = false;
  function board(now = false) {
    if (state !== 'waiting' || !pending || !d.free()) return;
    if (!now && d.approach) {
      if (boarding) return;
      boarding = true;
      if (d.approach({ x: pos.x, z: pos.z, yaw: Math.atan2(-fwd.y, fwd.x), W: CARS.sedan.W }, () => board(true))) return;
      boarding = false;
    }
    boarding = false;
    if (!d.setRide(ride)) return;
    d.sfx('door');
    route = pending;
    p = 0;
    v = 0;
    seg = 0;
    place();
    chase(0, true);
    state = 'riding';
    show(`Taxi to ${dest ? d.name(dest) : ''}`, { skip: true });
    if (d.reduced) finish();
  }
  /** At the place: step out at its spot; the taxi waits a moment, then it's gone */
  function finish() {
    if (state !== 'riding' || !dest) return;
    const to = dest;
    if (route) {
      p = route.len;
      place();
    }
    state = 'leaving';
    leaveT = 4;
    d.setRide(null);
    d.arrive(to);
    d.sfx('door');
    hide();
    d.toast(`Here you are: ${d.name(to)}`);
  }
  function stop() {
    state = 'idle';
    boarding = false;
    route = pending = null;
    dest = null;
    if (car) car.group.visible = false;
    hide();
  }
  getIn.addEventListener('click', () => board());
  skip.addEventListener('click', () => finish());
  cancelBtn.addEventListener('click', () => {
    stop();
    d.toast('Taxi cancelled');
  });

  return {
    call,
    get riding() {
      return state === 'riding';
    },
    /** Esc in a taxi: skip to the end */
    skip() {
      if (state !== 'riding') return false;
      finish();
      return true;
    },
    /** Every frame (walking or not): it comes for you, waits, or pulls away */
    update(dt: number, t: number) {
      // The traffic stops behind it, like behind anyone in the road
      stop_.on = state !== 'idle';
      stop_.x = pos.x;
      stop_.z = pos.z;
      if (state === 'coming') {
        drive(dt, t);
        if (route && p >= route.len - 0.05 && v < 0.2) {
          state = 'waiting';
          route = pending;
          p = 0;
          seg = 0;
          place();
          show(`Your taxi to ${dest ? d.name(dest) : ''} is here`, { in: true, cancel: true });
        }
      } else if (state === 'waiting') {
        const you = d.you();
        if (d.free() && Math.hypot(you.x - pos.x, you.z - pos.z) < BOARD) board();
      } else if (state === 'leaving') {
        leaveT -= dt;
        if (leaveT <= 0) stop();
      }
    },
    /** Walk mode ended: no taxi */
    reset() {
      if (state !== 'idle') stop();
    },
  };
}
export type Taxis = ReturnType<typeof createTaxis>;
