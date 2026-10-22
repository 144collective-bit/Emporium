/*
 * Riding the metro (docs/growth-plan.md Phase 8): at a station's door on
 * the street ("Metro", E or a tap) the station card opens with the other
 * stations and how long each ride takes; pick one and you're on the
 * train: it runs straight there (`rideAt()` in metro.ts) under a camera
 * alongside, and you step out at the destination's door. Skip ride (or
 * Esc) cuts to the end. The train goes back on its timetable from the
 * station it stopped at (`timetableAt()`). Free, like the taxis. Under
 * reduced motion the ride is a cut.
 */
import * as THREE from 'three';
import { DECK_Y, LINE_X, STATIONS, rideAt, timetableAt, type Station } from './metro';
import { PLATFORM_Y, type buildMetro } from './metro3d';
import type { Ride } from './walk';

type Metro = ReturnType<typeof buildMetro>;

export interface MetroDeps {
  metro: Metro;
  camera: THREE.PerspectiveCamera;
  reduced: boolean;
  free(): boolean;
  setRide(r: Ride | null): boolean;
  /** Stand Degen at a station's door on the street */
  arrive(station: string): void;
  want(x: number, z: number, r: number): void;
  toast(text: string): void;
  sfx(kind: 'door'): void;
  /** The card opened (one card at a time) */
  opened(): void;
}

export function createMetroUI(root: HTMLElement, d: MetroDeps) {
  const card = root.querySelector<HTMLElement>('[data-metro]')!;
  const title = card.querySelector<HTMLElement>('[data-metro-title]')!;
  const list = card.querySelector<HTMLElement>('[data-metro-list]')!;
  const bar = root.querySelector<HTMLElement>('[data-metro-bar]')!;
  const text = bar.querySelector<HTMLElement>('[data-metro-text]')!;
  let here: Station | null = null;

  function open(id: string) {
    const s = STATIONS.find((o) => o.id === id);
    if (!s || !d.free()) return;
    here = s;
    d.opened();
    title.textContent = `${s.name} station`;
    list.innerHTML = STATIONS.filter((o) => o !== s)
      .map((o) => `<li><button type="button" class="metro-go" data-metro-to="${o.id}"><span>${o.name}</span><small>${Math.ceil(rideAt(s.id, o.id, 0).total)} s</small></button></li>`)
      .join('');
    card.hidden = false;
    list.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }
  function close() {
    if (card.hidden) return false;
    card.hidden = true;
    return true;
  }
  card.querySelector('[data-metro-close]')?.addEventListener('click', close);
  list.addEventListener('click', (e) => {
    const to = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-metro-to]')?.dataset.metroTo;
    if (to && here) go(here, STATIONS.find((o) => o.id === to)!);
  });

  /* ---------- The ride ---------- */
  let from: Station | null = null;
  let to: Station | null = null;
  let dir: 1 | -1 = 1;
  let t = 0;
  let total = 0;
  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();
  function view(z: number, dt: number, snap = false) {
    // Alongside from the west at the train's height, a little behind it, looking ahead
    const want = new THREE.Vector3(LINE_X - 9, DECK_Y + 2.6, z - dir * 6);
    const at = new THREE.Vector3(LINE_X, DECK_Y + 1.1, z + dir * 3);
    const k = snap ? 1 : 1 - Math.exp(-dt * 4);
    cam.lerp(want, k);
    look.lerp(at, k);
    d.camera.position.copy(cam);
    d.camera.lookAt(look);
  }
  const ride: Ride = {
    update(dt) {
      if (!from || !to) return { x: LINE_X, z: 0 };
      t += dt;
      const r = rideAt(from.id, to.id, t);
      d.metro.hold({ z: r.z, dir });
      view(r.z, dt);
      text.textContent = `Metro to ${to.name} · ${Math.max(0, Math.ceil(total - t))} s`;
      const at = { x: LINE_X, z: r.z, y: PLATFORM_Y };
      if (t >= total + 0.8) finish();
      return at;
    },
    end() {
      // Walk mode stopped mid-ride: the train goes back on its timetable where it is
      d.metro.hold(null);
      from = to = null;
      bar.hidden = true;
    },
  };
  function go(a: Station, b: Station) {
    close();
    if (!d.free() || !d.setRide(ride)) return;
    from = a;
    to = b;
    dir = b.z > a.z ? 1 : -1;
    t = 0;
    total = rideAt(a.id, b.id, 0).total;
    d.metro.hold({ z: a.z, dir });
    d.want(LINE_X + 4, b.z, 70);
    d.sfx('door');
    view(a.z, 0, true);
    bar.hidden = false;
    text.textContent = `Metro to ${b.name}`;
    if (d.reduced) finish();
  }
  function finish() {
    if (!to) return;
    const b = to;
    from = to = null;
    // The train carries on its timetable from this station
    d.metro.resume(timetableAt(b.id, dir));
    d.setRide(null);
    d.arrive(b.id);
    d.sfx('door');
    bar.hidden = true;
    d.toast(`${b.name} station`);
  }
  bar.querySelector('[data-metro-skip]')?.addEventListener('click', () => finish());

  return {
    open,
    close,
    get riding() {
      return !!to;
    },
    /** Esc on the metro: skip to the end */
    skip() {
      if (!to) return false;
      finish();
      return true;
    },
    /** The stations' doors, for walk mode's prompts */
    doors: STATIONS.map((s) => ({ id: `metro:${s.id}`, x: s.door.x, z: s.door.z, label: 'Metro' })),
  };
}
export type MetroUI = ReturnType<typeof createMetroUI>;
