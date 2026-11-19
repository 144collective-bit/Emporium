/*
 * The city's lines' card and the tube's rides (docs/south-plan.md Phases 4g and 4h; southtrains.ts and trips.ts the
 * rules, tube3d.ts the trains). At any station, the raised metro's door on the street or a tube platform's ("Metro" /
 * "Tube", F or a tap), one card lists every stop on both lines and how long each trip takes (the raised metro's card and
 * ride bar, metro-ui.ts: one card at a time); this station's line first, the other's after, the change at The Trenches.
 * Pick one and you're on the train. On the tube, seen from inside the carriage, the tunnel's walls and lights going by
 * the windows, pulling in at each station between, and you step out on to the platform you picked. A stop on the other
 * line is one trip: this line's ride to The Trenches, "Change at The Trenches" under a quick fade, the other line's ride
 * on. Skip ride (or Esc) cuts to the very end. Free, as the raised metro is. Under reduced motion the rides are cuts.
 * Loaded the first time a station's card opens (index.ts).
 */
import type { PerspectiveCamera } from 'three';
import { PLAT_DOOR, PLAT_Y, SOUTH_STATIONS, lineAt, type Station } from './southline';
import { TUBE, carOffset, carPose, rideAt } from './southtrains';
import { ALL_STOPS, CHANGE_AT, changes, sameStop, tripOf, tripTime, type Leg, type LineId, type Stop } from './trips';
import type { Tube } from './tube3d';
import type { Ride } from './walk';
import { RIDE_CAM, rideView } from './views';

/** The raised metro's rides (metro-ui.ts), for a trip's leg on it */
export interface MetroRides {
  ride(a: string, b: string, then?: ((skipped: boolean) => void) | null): boolean;
  arriveAt(id: string): void;
}

export interface TubeDeps {
  tube: () => Promise<Tube>;
  /** The raised metro's rides, loaded */
  metro: () => Promise<MetroRides>;
  camera: PerspectiveCamera;
  reduced: boolean;
  free(): boolean;
  setRide(r: Ride | null): boolean;
  /** Stand Degen on a station's platform, facing along it */
  arrive(at: { x: number; z: number; y: number; yaw: number }): void;
  want(x: number, z: number, r: number): void;
  toast(text: string): void;
  sfx(kind: 'door'): void;
  /** The screen faded out (true) or back (false): the change between the lines */
  fade(on: boolean): void;
  /** The card opened (one card at a time) */
  opened(): void;
}

const LINE_NAME: Record<LineId, string> = { metro: 'Metro', tube: 'Tube' };

export function createTubeUI(root: HTMLElement, d: TubeDeps) {
  const card = root.querySelector<HTMLElement>('[data-metro]')!;
  const title = card.querySelector<HTMLElement>('[data-metro-title]')!;
  const list = card.querySelector<HTMLElement>('[data-metro-list]')!;
  const bar = root.querySelector<HTMLElement>('[data-metro-bar]')!;
  const text = bar.querySelector<HTMLElement>('[data-metro-text]')!;
  let here: Stop | null = null;
  let mine = false;

  /** The card at a station: its own line's stops first, then the other's (the change at The Trenches) */
  function open(stop: Stop) {
    const s = ALL_STOPS.find((o) => sameStop(o, stop));
    if (!s || !d.free()) return;
    here = stop;
    d.opened();
    mine = true;
    title.textContent = `${s.name} · ${LINE_NAME[stop.line]}`;
    const other: LineId = stop.line === 'metro' ? 'tube' : 'metro';
    const section = (line: LineId) =>
      `<li class="metro-head">${LINE_NAME[line]}${line === stop.line ? '' : ' · change at The Trenches'}</li>` +
      ALL_STOPS.filter((o) => o.line === line && !sameStop(o, stop))
        .map((o) => `<li><button type="button" class="metro-go" data-trip="${o.line}:${o.id}"><span>${o.name}</span><small>${Math.ceil(tripTime(stop, o))} s</small></button></li>`)
        .join('');
    list.innerHTML = section(stop.line) + section(other);
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
    const to = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-trip]')?.dataset.trip?.split(':');
    if (to && here) void trip(here, { line: to[0] as LineId, id: to[1] });
  });

  /* ---------- A trip: one ride, or two with the change at The Trenches ---------- */
  async function trip(a: Stop, b: Stop) {
    close();
    if (!d.free()) return;
    const legs = tripOf(a, b);
    // (both lines' rides loaded before any ride, so the change goes straight on)
    if (legs.some((l) => l.line === 'tube') || b.line === 'tube') tube = await d.tube();
    if (legs.some((l) => l.line === 'metro') || b.line === 'metro') metro = await d.metro();
    if (!d.free()) return;
    // Between the two Trenches stations: the change alone
    if (!legs.length) {
      if (!changes(a, b)) return;
      d.fade(true);
      setTimeout(
        () => {
          land(b);
          d.fade(false);
        },
        d.reduced ? 0 : 420
      );
      return;
    }
    const [first, second] = legs;
    leg(first, second ? (skipped) => onward(second, skipped) : null);
  }
  /** The change at The Trenches: on to the other line's ride (skipped: straight to the trip's end) */
  function onward(l: Leg, skipped: boolean) {
    if (skipped || d.reduced) return land({ line: l.line, id: l.to });
    d.fade(true);
    d.toast('Change at The Trenches');
    leg(l, null);
    setTimeout(() => d.fade(false), 320);
  }
  /** Start a leg's ride on its line */
  function leg(l: Leg, then: ((skipped: boolean) => void) | null) {
    if (l.line === 'metro') return void metro?.ride(l.from, l.to, then);
    const [sa, sb] = [stationOf(l.from), stationOf(l.to)];
    if (sa && sb) go(sa, sb, then);
  }
  /** Step out at a stop with no ride (a trip's end, skipped to) */
  function land(b: Stop) {
    if (b.line === 'metro') return metro?.arriveAt(b.id);
    const st = stationOf(b.id);
    // (facing on along the line from The Trenches, its end; back towards it from the rest)
    if (st) arrive(st, st.id === CHANGE_AT.tube ? 1 : -1);
  }
  const stationOf = (id: string) => SOUTH_STATIONS.find((o) => o.id === id);
  let metro: MetroRides | null = null;

  /* ---------- The tube's ride ---------- */
  let from: Station | null = null;
  let to: Station | null = null;
  let next: ((skipped: boolean) => void) | null = null;
  let tube: Tube | null = null;
  let t = 0;
  let total = 0;
  /**
   * Inside the front car, as you look round (views.ts `rideView()`, V): near, stood at its back (by the poles, not
   * behind one) looking down the car and out of the windscreen; far, the same from the car behind's front; the window
   * seat, sat on the side by the tunnel's wall, looking ahead
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
      // Walk mode stopped mid-ride: the trains go back on their timetable (and a trip's on stops here)
      tube?.ride(null);
      from = to = next = null;
      bar.hidden = true;
    },
  };
  function go(a: Station, b: Station, then: ((skipped: boolean) => void) | null) {
    if (!tube || !d.free() || !d.setRide(ride)) return;
    from = a;
    to = b;
    next = then;
    t = 0;
    const r0 = rideAt(a.id, b.id, 0);
    total = r0.total;
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
  function finish(skipped = false) {
    if (!to || !from) return;
    const b = to;
    const dir = rideAt(from.id, b.id, 0).dir;
    const then = next;
    from = to = next = null;
    tube?.ride(null);
    d.setRide(null);
    bar.hidden = true;
    if (then) return then(skipped);
    arrive(b, dir);
  }
  /** On a platform by its middle, off its bench, facing the way the train was going */
  function arrive(b: Station, dir: number) {
    const { at, dir: ld } = lineAt((b.p0 + b.p1) / 2 + PLAT_DOOR);
    d.arrive({ x: at[0], z: at[1], y: PLAT_Y, yaw: Math.atan2(-ld[0] * dir, -ld[1] * dir) });
    d.sfx('door');
    d.toast(`${b.name} · Tube`);
  }
  bar.querySelector('[data-metro-skip]')?.addEventListener('click', () => finish(true));

  return {
    /** A station's card: a tube platform's (`tube`) or the raised metro's door (`metro`) */
    open: (line: LineId, id: string) => open({ line, id }),
    close,
    get riding() {
      return !!to;
    },
    /** Esc on the tube: skip to the trip's end */
    skip() {
      if (!to) return false;
      finish(true);
      return true;
    },
  };
}
export type TubeUI = ReturnType<typeof createTubeUI>;
