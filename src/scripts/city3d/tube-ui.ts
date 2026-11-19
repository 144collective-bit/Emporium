/*
 * Riding the underground's south line (docs/south-plan.md Phase 4g; southtrains.ts the rules, tube3d.ts the trains): on
 * a station's platform ("Tube", F or a tap) the line's card opens with its other stations and how long each ride takes
 * (the raised metro's card and ride bar, metro-ui.ts: one card at a time); pick one and you're on the train, seen from
 * inside the carriage, the tunnel's walls and lights going by the windows, pulling in at each station between, and you
 * step out on to the platform you picked. Skip ride (or Esc) cuts to the end. Free, as the raised metro is. Under
 * reduced motion the ride is a cut. Loaded the first time a platform's card opens (index.ts).
 */
import type { PerspectiveCamera } from 'three';
import { PLAT_DOOR, PLAT_Y, SOUTH_STATIONS, lineAt, type Station, type StationId } from './southline';
import { TUBE, carOffset, carPose, rideAt } from './southtrains';
import { RIDE_CAM, rideView } from './views';
import type { Tube } from './tube3d';
import type { Ride } from './walk';

export interface TubeDeps {
  tube: () => Promise<Tube>;
  camera: PerspectiveCamera;
  reduced: boolean;
  free(): boolean;
  setRide(r: Ride | null): boolean;
  /** Stand Degen on a station's platform, facing along it */
  arrive(at: { x: number; z: number; y: number; yaw: number }): void;
  want(x: number, z: number, r: number): void;
  toast(text: string): void;
  sfx(kind: 'door'): void;
  /** The card opened (one card at a time) */
  opened(): void;
}

export function createTubeUI(root: HTMLElement, d: TubeDeps) {
  const card = root.querySelector<HTMLElement>('[data-metro]')!;
  const title = card.querySelector<HTMLElement>('[data-metro-title]')!;
  const list = card.querySelector<HTMLElement>('[data-metro-list]')!;
  const bar = root.querySelector<HTMLElement>('[data-metro-bar]')!;
  const text = bar.querySelector<HTMLElement>('[data-metro-text]')!;
  let here: Station | null = null;
  let mine = false;

  function open(id: string) {
    const s = SOUTH_STATIONS.find((o) => o.id === id);
    if (!s || !d.free()) return;
    here = s;
    d.opened();
    mine = true;
    title.textContent = `${s.name} · Tube`;
    list.innerHTML = SOUTH_STATIONS.filter((o) => o !== s)
      .map((o) => `<li><button type="button" class="metro-go" data-tube-to="${o.id}"><span>${o.name}</span><small>${Math.ceil(rideAt(s.id, o.id, 0).total)} s</small></button></li>`)
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
    const to = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tube-to]')?.dataset.tubeTo as StationId | undefined;
    if (to && here) void go(here, SOUTH_STATIONS.find((o) => o.id === to)!);
  });

  /* ---------- The ride ---------- */
  let from: Station | null = null;
  let to: Station | null = null;
  let tube: Tube | null = null;
  let t = 0;
  let total = 0;
  /**
   * Inside the front car, as you look round (views.ts `rideView()`, V): near, stood at its back (by the poles, not
   * behind one) looking down the car and out of the windscreen; far, the same from the car behind's front; the window seat, sat on the side by the
   * tunnel's wall, looking ahead
   */
  function view(r: { s: number; dir: 1 | -1; u: number }) {
    const pose = carPose(r.s + carOffset(0, r.dir), r.u);
    const f: [number, number] = [pose.dir[0] * r.dir, pose.dir[1] * r.dir];
    // (across the car towards the tunnel's wall: the track's side of the line)
    const k = Math.sign(r.u) || 1;
    const out: [number, number] = [-pose.dir[1] * k, pose.dir[0] * k];
    const [back, side, up] = RIDE_CAM.view === 'first' ? [-1.5, 0.62, 1.15] : RIDE_CAM.view === 'far' ? [-(TUBE.carLen + TUBE.gap / 2) + 0.4, 0.5, 1.6] : [-TUBE.carLen / 2 + 0.5, 0.5, 1.6];
    const eye = { x: pose.at[0] + f[0] * back + out[0] * side, y: PLAT_Y + up, z: pose.at[1] + f[1] * back + out[1] * side };
    const v = rideView({ want: eye, at: eye }, eye, eye, f, { view: 'first', yaw: RIDE_CAM.yaw, pitch: RIDE_CAM.pitch });
    d.camera.position.set(v.want.x, v.want.y, v.want.z);
    d.camera.lookAt(v.at.x, v.at.y, v.at.z);
  }
  const ride: Ride = {
    kind: 'metro',
    update(dt) {
      if (!from || !to || !tube) return { x: 0, z: 0 };
      t += dt;
      const r = rideAt(from.id, to.id, t);
      tube.ride(r);
      view(r);
      text.textContent = `Tube to ${to.name} · ${Math.max(0, Math.ceil(total - t))} s`;
      if (t >= total + 0.8) finish();
      const [x, z] = lineAt(r.s).at;
      return { x, z, y: PLAT_Y };
    },
    end() {
      // Walk mode stopped mid-ride: the trains go back on their timetable
      tube?.ride(null);
      from = to = null;
      bar.hidden = true;
    },
  };
  async function go(a: Station, b: Station) {
    close();
    if (!d.free()) return;
    tube = await d.tube();
    if (!d.free() || !d.setRide(ride)) return;
    from = a;
    to = b;
    t = 0;
    total = rideAt(a.id, b.id, 0).total;
    const r0 = rideAt(a.id, b.id, 0);
    tube.ride(r0);
    // (the line's tunnels and the far station drawn ahead of the train)
    const [ex, ez] = lineAt((b.p0 + b.p1) / 2).at;
    d.want(ex, ez, 60);
    d.sfx('door');
    view(r0);
    bar.hidden = false;
    text.textContent = `Tube to ${b.name}`;
    if (d.reduced) finish();
  }
  function finish() {
    if (!to || !from) return;
    const b = to;
    const dir = rideAt(from.id, b.id, 0).dir;
    from = to = null;
    tube?.ride(null);
    d.setRide(null);
    // (by the platform's middle, off its bench, facing the way the train was going)
    const { at, dir: ld } = lineAt((b.p0 + b.p1) / 2 + PLAT_DOOR);
    d.arrive({ x: at[0], z: at[1], y: PLAT_Y, yaw: Math.atan2(-ld[0] * dir, -ld[1] * dir) });
    d.sfx('door');
    bar.hidden = true;
    d.toast(`${b.name} · Tube`);
  }
  bar.querySelector('[data-metro-skip]')?.addEventListener('click', () => finish());

  return {
    open,
    close,
    get riding() {
      return !!to;
    },
    /** Esc on the tube: skip to the end */
    skip() {
      if (!to) return false;
      finish();
      return true;
    },
  };
}
export type TubeUI = ReturnType<typeof createTubeUI>;
