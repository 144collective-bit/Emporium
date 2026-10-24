/*
 * Riding the river bus (river plan step 4b; riverbus.ts has the numbers),
 * loaded when a stop's card first opens: at the top of a landing's gangway
 * ("River bus", F or a tap) the stop's card opens with the other stops and
 * how long each ride takes; pick one and you're aboard: the boat runs
 * straight there along its loop (`rideAt()`) under a camera alongside it,
 * out over the water, and you step off at the top of the destination's
 * gangway. Skip ride (or Esc) cuts to the end. The boat you came on lies at
 * your stop after (`offsetFor()`), and carries on its timetable from there.
 * Free, like the metro. Under reduced motion the ride is a cut.
 */
import * as THREE from 'three';
import { STOPS, type Stop, type StopId } from './riverbus';
import { BUS_VIEW, offsetFor, ride, rideAt } from './riverroute';
import { WATER_Y } from './river';
import type { Ride } from './walk';

export interface RiverBusDeps {
  camera: THREE.PerspectiveCamera;
  reduced: boolean;
  free(): boolean;
  setRide(r: Ride | null): boolean;
  /** Stand Degen at the top of a stop's gangway */
  arrive(stop: Stop): void;
  want(x: number, z: number, r: number): void;
  toast(text: string): void;
  sfx(kind: 'door'): void;
  /** The card opened (one card at a time) */
  opened(): void;
}

export function createRiverBusUI(root: HTMLElement, d: RiverBusDeps) {
  const card = root.querySelector<HTMLElement>('[data-riverbus]')!;
  const title = card.querySelector<HTMLElement>('[data-riverbus-title]')!;
  const list = card.querySelector<HTMLElement>('[data-riverbus-list]')!;
  const bar = root.querySelector<HTMLElement>('[data-riverbus-bar]')!;
  const text = bar.querySelector<HTMLElement>('[data-riverbus-text]')!;
  const stopOf = (id: string) => STOPS.find((s) => s.id === id);
  let here: Stop | null = null;

  function open(id: string) {
    const s = stopOf(id);
    if (!s || !d.free()) return;
    here = s;
    d.opened();
    title.textContent = s.pier;
    list.innerHTML = STOPS.filter((o) => o !== s)
      .map((o) => `<li><button type="button" class="metro-go" data-riverbus-to="${o.id}"><span>${o.name}</span><small>${Math.ceil(ride(s.id, o.id).total)} s</small></button></li>`)
      .join('');
    card.hidden = false;
    list.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }
  function close() {
    if (card.hidden) return false;
    card.hidden = true;
    return true;
  }
  card.querySelector('[data-riverbus-close]')?.addEventListener('click', close);
  list.addEventListener('click', (e) => {
    const to = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-riverbus-to]')?.dataset.riverbusTo;
    const b = to && stopOf(to);
    if (b && here) go(here, b);
  });

  /* ---------- The ride ---------- */
  let from: Stop | null = null;
  let to: Stop | null = null;
  let t = 0;
  let total = 0;
  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();
  const want = new THREE.Vector3();
  const at = new THREE.Vector3();
  /** Alongside the boat out over the river (the loop's inside), a little behind it, looking ahead */
  function view(p: ReturnType<typeof rideAt>, dt: number, snap = false) {
    const [fx, fz] = [Math.cos(p.yaw), -Math.sin(p.yaw)];
    want.set(p.x + p.inside[0] * 8 - fx * 6, WATER_Y + 3.4, p.z + p.inside[1] * 8 - fz * 6);
    at.set(p.x + fx * 2, WATER_Y + 0.9, p.z + fz * 2);
    const k = snap ? 1 : 1 - Math.exp(-dt * 4);
    cam.lerp(want, k);
    look.lerp(at, k);
    if (snap) {
      cam.copy(want);
      look.copy(at);
    }
    d.camera.position.copy(cam);
    d.camera.lookAt(look);
  }
  const hold = (p: { x: number; z: number; yaw: number } | null) => (BUS_VIEW.ride = p && { x: p.x, z: p.z, yaw: p.yaw });
  const rideState: Ride = {
    update(dt) {
      if (!from || !to) return { x: 0, z: 0 };
      t += dt;
      const p = rideAt(from.id, to.id, t);
      hold(p);
      view(p, dt);
      text.textContent = `River bus to ${to.name} · ${Math.max(0, Math.ceil(total - t))} s`;
      if (t >= total + 1.2) finish();
      return { x: p.x, z: p.z, y: WATER_Y + 0.5 };
    },
    end() {
      // Walk mode stopped mid-ride: the boat goes back on its timetable
      hold(null);
      from = to = null;
      bar.hidden = true;
    },
  };
  function go(a: Stop, b: Stop) {
    close();
    if (!d.free() || !d.setRide(rideState)) return;
    from = a;
    to = b;
    t = 0;
    const p = rideAt(a.id, b.id, 0);
    total = p.total;
    hold(p);
    d.want(b.door.x, b.door.z, 70);
    d.sfx('door');
    view(p, 0, true);
    bar.hidden = false;
    text.textContent = `River bus to ${b.name}`;
    if (d.reduced) finish();
  }
  function finish() {
    if (!to || !from) return;
    const b = to;
    from = to = null;
    // The boat you came on lies at your stop, and carries on its timetable from there
    hold(null);
    BUS_VIEW.offset = offsetFor(b.id as StopId, Date.now() / 1000);
    d.setRide(null);
    d.arrive(b);
    d.sfx('door');
    bar.hidden = true;
    d.toast(b.pier);
  }
  bar.querySelector('[data-riverbus-skip]')?.addEventListener('click', () => finish());

  return {
    open,
    close,
    get riding() {
      return !!to;
    },
    /** Esc on the river bus: skip to the end */
    skip() {
      if (!to) return false;
      finish();
      return true;
    },
  };
}
export type RiverBusUI = ReturnType<typeof createRiverBusUI>;
