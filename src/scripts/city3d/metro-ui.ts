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
import { DECK_Y, STATIONS, carAt, pointOn, rideAt, sideOf, stationAt, timetableAt, type Run, type Station } from './metro';
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
  let t = 0;
  let total = 0;
  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();
  /** Alongside the train at its height, on the side away from the platforms, a little behind it, looking ahead */
  function view(tr: { run: Run; d: number; track: 'main' | 'branch'; s: number }, dt: number, snap = false) {
    const c = carAt(tr, 0);
    const n = sideOf(pointOn(tr.track, tr.s).dir, 1);
    const want = new THREE.Vector3(c.at[0] + n[0] * 9 - c.dir[0] * 6, DECK_Y + 2.6, c.at[1] + n[1] * 9 - c.dir[1] * 6);
    const at = new THREE.Vector3(c.at[0] + c.dir[0] * 3, DECK_Y + 1.1, c.at[1] + c.dir[1] * 3);
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
  let last: ReturnType<typeof rideAt> | null = null;
  const ride: Ride = {
    update(dt) {
      if (!from || !to) return { x: 0, z: 0 };
      t += dt;
      const r = (last = rideAt(from.id, to.id, t));
      d.metro.hold(r);
      view(r, dt);
      text.textContent = `Metro to ${to.name} · ${Math.max(0, Math.ceil(total - t))} s`;
      const p = pointOn(r.track, r.s).at;
      if (t >= total + 0.8) finish();
      return { x: p[0], z: p[1], y: PLATFORM_Y };
    },
    end() {
      // Walk mode stopped mid-ride: the train goes back on its timetable
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
    t = 0;
    const r = (last = rideAt(a.id, b.id, 0));
    total = r.total;
    d.metro.hold(r);
    const end = stationAt(b).at;
    d.want(end[0], end[1], 70);
    d.sfx('door');
    view(r, 0, true);
    bar.hidden = false;
    text.textContent = `Metro to ${b.name}`;
    if (d.reduced) finish();
  }
  function finish() {
    if (!to || !from) return;
    const b = to;
    // The train carries on its timetable from this station, the way it came in
    const runs = (last ?? rideAt(from.id, b.id, 0)).runs;
    const lastRun = runs[runs.length - 1];
    from = to = null;
    d.metro.resume(timetableAt(b.id, lastRun.pieces[lastRun.pieces.length - 1]));
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
