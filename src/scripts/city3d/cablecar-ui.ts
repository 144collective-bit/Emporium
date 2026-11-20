/*
 * Riding Highcrest's cable car (cablecar.ts; the premium upgrade's Phase 4b, the owner's call: "Ride shown, then walk"),
 * loaded the first time a station's door is used: the prompt ("Cable car") opens the station card (the metro's card and
 * ride bar, `[data-metro]` / `[data-metro-bar]`, with a button of its own) to ride to the other station; pick it and
 * you're in a cabin: it climbs (or comes down) the rope (`rideAt()`, about twenty seconds) under a camera alongside it
 * looking out over the city, and you step out at the other station. Skip ride (or Esc) cuts to the end. Free, like the
 * monorail. Under reduced motion the ride is a cut.
 */
import * as THREE from 'three';
import { CABIN_H, stationOf, type CableStation, type CableStationId } from './cablecar';
import { CABLE_VIEW, LINE_DIR, rideAt } from './cableline';
import type { Ride } from './walk';
import { rideView } from './views';

export interface CableDeps {
  camera: THREE.PerspectiveCamera;
  reduced: boolean;
  free(): boolean;
  setRide(r: Ride | null): boolean;
  /** Stand Degen where you arrive at a station */
  arrive(s: CableStation): void;
  want(x: number, z: number, r: number): void;
  toast(text: string): void;
  sfx(kind: 'door'): void;
  /** The card opened (one card at a time) */
  opened(): void;
}

export function createCableUI(root: HTMLElement, d: CableDeps) {
  const card = root.querySelector<HTMLElement>('[data-metro]')!;
  const title = card.querySelector<HTMLElement>('[data-metro-title]')!;
  const list = card.querySelector<HTMLElement>('[data-metro-list]')!;
  const bar = root.querySelector<HTMLElement>('[data-metro-bar]')!;
  const text = bar.querySelector<HTMLElement>('[data-metro-text]')!;
  let here: CableStationId | null = null;
  let mine = false;
  const other = (id: CableStationId): CableStationId => (id === 'foot' ? 'top' : 'foot');

  function open(id: string) {
    if ((id !== 'foot' && id !== 'top') || !d.free()) return;
    d.opened();
    here = id;
    mine = true;
    const s = stationOf(id);
    const to = stationOf(other(id));
    title.textContent = `${s.name} · Cable car`;
    list.innerHTML = `<li><button type="button" class="metro-go" data-cable-go><span>${id === 'foot' ? 'Ride up' : 'Ride down'} · ${to.name}</span><small>${Math.ceil(rideAt(id, 0).total)} s</small></button></li>`;
    card.hidden = false;
    list.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }
  function close() {
    if (card.hidden || !mine) return false;
    card.hidden = true;
    mine = false;
    return true;
  }
  card.querySelector('[data-metro-close]')?.addEventListener('click', () => (mine = false));
  list.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-cable-go]') && here) go(here);
  });

  /* ---------- The ride ---------- */
  let from: CableStationId | null = null;
  let t = 0;
  let total = 0;
  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();
  /**
   * Near: beside the cabin on the city's side (west), a little behind and above it, looking on along the rope and out
   * over the view; far and the window seat from it (views.ts `rideView()`, V, as you look round)
   */
  function view(dt: number, snap = false) {
    const c = CABLE_VIEW.ride;
    if (!c) return;
    const [ux, uz] = [LINE_DIR[0] * c.dir, LINE_DIR[1] * c.dir];
    // (the city's side: the left of the way up, the west)
    const [sx, sz] = [-Math.abs(LINE_DIR[1]), 0];
    const mid = c.y - CABIN_H / 2;
    const near = {
      want: { x: c.x + sx * 9 - ux * 7, y: mid + 3.5, z: c.z + sz * 9 - uz * 7 },
      at: { x: c.x + ux * 6 + sx * 3, y: mid - 1.5, z: c.z + uz * 6 },
    };
    const eye = { x: c.x + ux * 0.4, y: mid + 0.25, z: c.z + uz * 0.4 };
    const v = rideView(near, { x: c.x, y: mid, z: c.z }, eye, [ux, uz]);
    const want = new THREE.Vector3(v.want.x, v.want.y, v.want.z);
    const at = new THREE.Vector3(v.at.x, v.at.y, v.at.z);
    if (v.snap) snap = true;
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
  const ride: Ride = {
    kind: 'cable',
    update(dt) {
      if (!from) return { x: 0, z: 0 };
      t += dt;
      const r = rideAt(from, t);
      CABLE_VIEW.ride = r;
      view(dt);
      text.textContent = `Cable car to ${stationOf(other(from)).name} · ${Math.max(0, Math.ceil(total - t))} s`;
      if (t >= total + 0.6) finish();
      return { x: r.x, z: r.z, y: r.y - CABIN_H };
    },
    end() {
      // Walk mode stopped mid-ride: the ride's cabin goes
      CABLE_VIEW.ride = null;
      from = null;
      bar.hidden = true;
    },
  };
  function go(a: CableStationId) {
    close();
    if (!d.free() || !d.setRide(ride)) return;
    from = a;
    t = 0;
    const r = rideAt(a, 0);
    total = r.total;
    CABLE_VIEW.ride = r;
    const b = stationOf(other(a));
    d.want(b.at.x, b.at.z, 80);
    d.sfx('door');
    view(0, true);
    bar.hidden = false;
    text.textContent = `Cable car to ${b.name}`;
    if (d.reduced) finish();
  }
  function finish() {
    if (!from) return;
    const b = stationOf(other(from));
    from = null;
    CABLE_VIEW.ride = null;
    d.setRide(null);
    d.arrive(b);
    d.sfx('door');
    bar.hidden = true;
    d.toast(`${b.name} · Cable car`);
  }
  bar.querySelector('[data-metro-skip]')?.addEventListener('click', () => finish());

  return {
    open,
    close,
    get riding() {
      return !!from;
    },
    /** Esc in the cable car: skip to the end */
    skip() {
      if (!from) return false;
      finish();
      return true;
    },
  };
}
export type CableUI = ReturnType<typeof createCableUI>;
