/*
 * Riding the Neon Mile's monorail (docs/strip-plan.md Phase 4), loaded the first time a station's door is used: the
 * door's prompt ("Monorail") opens the station card (the metro's card and ride bar, `[data-metro]` /
 * `[data-metro-bar]`, with buttons of its own) listing the other stations and how long each ride takes; pick one and
 * you're on the train: it runs straight there (`monoRide()`) under a camera alongside, and you step out at the
 * destination's door. Skip ride (or Esc) cuts to the end. The train carries on its timetable from that station
 * (`monoResume()`, through `MONO_VIEW`). Free, like the metro. Under reduced motion the ride is a cut.
 */
import * as THREE from 'three';
import { FLOOR, MONO, MONO_STATIONS, MONO_VIEW, monoResume, monoRide, type MonoStation } from './monorail';
import type { Ride } from './walk';

export interface MonoDeps {
  camera: THREE.PerspectiveCamera;
  reduced: boolean;
  free(): boolean;
  setRide(r: Ride | null): boolean;
  /** Stand Degen at a station's door on the street */
  arrive(s: MonoStation): void;
  want(x: number, z: number, r: number): void;
  toast(text: string): void;
  sfx(kind: 'door'): void;
  /** The card opened (one card at a time) */
  opened(): void;
}

export function createMonoUI(root: HTMLElement, d: MonoDeps) {
  const card = root.querySelector<HTMLElement>('[data-metro]')!;
  const title = card.querySelector<HTMLElement>('[data-metro-title]')!;
  const list = card.querySelector<HTMLElement>('[data-metro-list]')!;
  const bar = root.querySelector<HTMLElement>('[data-metro-bar]')!;
  const text = bar.querySelector<HTMLElement>('[data-metro-text]')!;
  let here: MonoStation | null = null;
  let mine = false;

  function open(id: string) {
    const s = MONO_STATIONS.find((o) => o.id === id);
    if (!s || !d.free()) return;
    d.opened();
    here = s;
    mine = true;
    title.textContent = `${s.name} · Monorail`;
    list.innerHTML = MONO_STATIONS.filter((o) => o !== s)
      .map((o) => `<li><button type="button" class="metro-go" data-mono-to="${o.id}"><span>${o.name}</span><small>${Math.ceil(monoRide(s.id, o.id, 0).total)} s</small></button></li>`)
      .join('');
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
    const to = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-mono-to]')?.dataset.monoTo;
    if (to && here) go(here, MONO_STATIONS.find((o) => o.id === to)!);
  });

  /* ---------- The ride ---------- */
  let from: MonoStation | null = null;
  let to: MonoStation | null = null;
  let t = 0;
  let total = 0;
  let dir: 1 | -1 = 1;
  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();
  /** Alongside the train on the river's side, a little behind it, looking ahead along the beam */
  function view(x: number, dt: number, snap = false) {
    const want = new THREE.Vector3(x - dir * 7, FLOOR + 3, MONO.z + 9);
    const at = new THREE.Vector3(x + dir * 4, FLOOR + 1, MONO.z);
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
    update(dt) {
      if (!from || !to) return { x: 0, z: 0 };
      t += dt;
      const r = monoRide(from.id, to.id, t);
      MONO_VIEW.hold = r;
      view(r.x, dt);
      text.textContent = `Monorail to ${to.name} · ${Math.max(0, Math.ceil(total - t))} s`;
      if (t >= total + 0.8) finish();
      return { x: r.x, z: MONO.z, y: FLOOR };
    },
    end() {
      // Walk mode stopped mid-ride: the train goes back on its timetable
      MONO_VIEW.hold = null;
      from = to = null;
      bar.hidden = true;
    },
  };
  function go(a: MonoStation, b: MonoStation) {
    close();
    if (!d.free() || !d.setRide(ride)) return;
    from = a;
    to = b;
    t = 0;
    const r = monoRide(a.id, b.id, 0);
    total = r.total;
    dir = r.dir;
    MONO_VIEW.hold = r;
    d.want(b.at.x, b.at.z, 70);
    d.sfx('door');
    view(r.x, 0, true);
    bar.hidden = false;
    text.textContent = `Monorail to ${b.name}`;
    if (d.reduced) finish();
  }
  function finish() {
    if (!to || !from) return;
    const b = to;
    from = to = null;
    // The train carries on its timetable from this station, the way it came in
    const now = Date.now() / 1000;
    MONO_VIEW.shift = monoResume(b.id, dir) - now;
    MONO_VIEW.hold = null;
    d.setRide(null);
    d.arrive(b);
    d.sfx('door');
    bar.hidden = true;
    d.toast(`${b.name} · Monorail`);
  }
  bar.querySelector('[data-metro-skip]')?.addEventListener('click', () => finish());

  return {
    open,
    close,
    get riding() {
      return !!to;
    },
    /** Esc on the monorail: skip to the end */
    skip() {
      if (!to) return false;
      finish();
      return true;
    },
  };
}
export type MonoUI = ReturnType<typeof createMonoUI>;
