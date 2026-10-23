/*
 * Getting about (docs/growth-plan.md Phase 8), the city's side of it: the
 * world map (worldmap.ts, a chunk of its own loaded the first time it
 * opens) and its keys (M opens and closes it, Esc closes it), your waypoint (a magenta beam, beacons.ts, and the compass in the walk
 * HUD: which way, how far, its name; cleared when you get there), the places
 * you've walked to (`seen()` in places.ts, kept in the save's `visited`, a
 * toast the first time), fast travel to them (a quick fade, then you're
 * standing there), Walk here from the City view, and handing taxis and the
 * metro their rides.
 */
import * as THREE from 'three';
import { PLACES, placeName, seen, type Place } from './places';
import { visit } from './tycoon';
import type { WorldMap, WorldMapDeps } from './worldmap';
import type { createWalk } from './walk';
import type { GameDeps } from './ui';
import { live } from './live-client';

type Walk = ReturnType<typeof createWalk>;
/** Closer than this (tiles) and you've reached your waypoint */
const ARRIVE = 6;
/** A tile is about 1.8 m (layout.ts) */
const METRES = 1.8;

export interface TravelDeps {
  root: HTMLElement;
  camera: THREE.Camera;
  walk: Walk;
  game: GameDeps;
  reduced: boolean;
  walking(): boolean;
  /** Where the City view looks */
  target(): { x: number; z: number };
  beam(at: { x: number; z: number } | null): void;
  open(id: string): void;
  startWalking(at: { x: number; z: number; yaw: number }): void;
  /** Build what's waiting round a spot before arriving there (works.want) */
  want(x: number, z: number, r: number): void;
  taxi(p: Place): void;
  /** Busy with a ride (a taxi or the metro): no map travel meanwhile */
  riding(): boolean;
}

export function createTravelUI(d: TravelDeps) {
  const { root, camera, walk, game } = d;
  const dir = new THREE.Vector3();
  /** The camera's heading on the ground in walk.ts's yaw (forward is (-sin yaw, -cos yaw)) */
  const heading = () => {
    camera.getWorldDirection(dir);
    return Math.atan2(-dir.x, -dir.z);
  };
  let waypoint: { x: number; z: number; name: string } | null = null;
  const compass = root.querySelector<HTMLElement>('[data-compass]')!;
  const arrow = compass.querySelector<HTMLElement>('[data-compass-arrow]')!;
  const dist = compass.querySelector<HTMLElement>('[data-compass-dist]')!;
  const label = compass.querySelector<HTMLElement>('[data-compass-name]')!;
  function setWaypoint(at: { x: number; z: number } | null, name = 'Waypoint') {
    waypoint = at ? { x: at.x, z: at.z, name } : null;
    d.beam(waypoint);
    label.textContent = waypoint?.name ?? '';
    compass.hidden = !waypoint;
    shown = '';
  }
  compass.querySelector('[data-compass-clear]')?.addEventListener('click', () => setWaypoint(null));

  const state = () => (!d.walking() ? 'city' : walk.onFoot && !d.riding() ? 'foot' : 'busy');
  const visited = () => game.save().visited;
  /** Fast travel: a quick fade, then you're standing there */
  let fading = false;
  function travel(p: Place) {
    if (state() !== 'foot' || fading || !visited().includes(p.id)) return;
    // (unless the owner has closed it for now: live settings)
    const shut = live.closed('travel');
    if (shut) return game.toast(shut);
    d.want(p.at.x, p.at.z, 70);
    fading = true;
    root.classList.add('is-fading');
    setTimeout(
      () => {
        walk.placeAt(p.at);
        fading = false;
        requestAnimationFrame(() => root.classList.remove('is-fading'));
        game.toast(`Fast travel: ${placeName(root, p).name}`);
      },
      d.reduced ? 0 : 260
    );
  }

  const mapDeps: WorldMapDeps = {
    you() {
      if (d.walking()) return { x: walk.position.x, z: walk.position.z, yaw: heading(), walking: true };
      const t = d.target();
      return { x: t.x, z: t.z, yaw: heading(), walking: false };
    },
    car: () => walk.car,
    plane() {
      const p = walk.plane;
      return p.away ? p : null;
    },
    waypoint: () => waypoint,
    setWaypoint,
    visited,
    state,
    openSpot: (id) => d.open(id),
    walkHere(p) {
      if (!visited().includes(p.id)) return;
      d.want(p.at.x, p.at.z, 70);
      d.startWalking(p.at);
    },
    travel,
    taxi(p) {
      const shut = live.closed('taxi');
      if (shut) game.toast(shut);
      else d.taxi(p);
    },
    bringCar: () => walk.bringCar(),
    toast: (text) => game.toast(text),
  };
  let map: WorldMap | null = null;
  let mapLoad: Promise<WorldMap> | null = null;
  const loadMap = () => (mapLoad ??= import('./worldmap').then(({ createWorldMap }) => (map = createWorldMap(root, mapDeps))));
  const show = () => {
    if (d.walking()) {
      if (walk.karting || walk.fighting) return;
      walk.releaseMouse();
    }
    void loadMap().then((m) => m.show());
  };
  root.querySelectorAll<HTMLButtonElement>('[data-worldmap-open]').forEach((b) =>
    b.addEventListener('click', () => {
      b.closest('details')?.removeAttribute('open');
      if (map?.isOpen) map.close();
      else show();
    })
  );

  /* ---------- Every frame while walking: places reached, the compass ---------- */
  let check = 0;
  let shown = '';
  /** Places just reached, for the toast: held while a menu, a panel or the metro's card is open (it'd sit on their header) */
  let reached: string[] = [];
  const sheetOpen = () => root.classList.contains('is-shopping') || root.classList.contains('has-panel') || root.querySelector<HTMLElement>('[data-metro]')?.hidden === false;
  function update(dt: number) {
    if (!d.walking()) return;
    const p = walk.position;
    if (reached.length && !sheetOpen()) {
      game.toast(`${reached.join(', ')}: on the map for fast travel`);
      reached = [];
    }
    // The places you've reached (on foot or at the wheel; not from the air, nor driving past in a taxi or on the metro)
    check -= dt;
    if (check <= 0 && !walk.airborne && !walk.riding) {
      check = 0.5;
      const ids = seen(p.x, p.z);
      if (ids.length) {
        const fresh = visit(game.save(), ids);
        if (fresh.length) {
          game.commit();
          reached.push(...fresh.map((id) => placeName(root, PLACES.find((o) => o.id === id)!).name));
        }
      }
    }
    if (!waypoint) return;
    const dx = waypoint.x - p.x;
    const dz = waypoint.z - p.z;
    const far = Math.hypot(dx, dz);
    if (far < ARRIVE) {
      game.toast(`You're at ${waypoint.name === 'Waypoint' ? 'your waypoint' : waypoint.name}`);
      setWaypoint(null);
      return;
    }
    // The arrow turns from straight up (the way the camera looks) towards the waypoint, clockwise
    const want = Math.atan2(-dx, -dz);
    const turn = Math.round(((heading() - want) * 180) / Math.PI);
    const m = far * METRES;
    const text = m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
    const key = `${turn}|${text}`;
    if (key === shown) return;
    shown = key;
    arrow.style.transform = `rotate(${turn}deg)`;
    dist.textContent = text;
  }

  return {
    update,
    setWaypoint,
    /** Keys: M opens and closes the map (walking with no panel open, or the City view), Esc closes it; true if handled */
    key(e: KeyboardEvent, free: boolean) {
      if ((e.target as HTMLElement).matches?.('input, select, textarea')) return false;
      if (map?.isOpen) {
        if (e.type === 'keydown' && (e.key === 'Escape' || e.code === 'KeyM')) map.close();
        e.preventDefault();
        return true;
      }
      if (e.type === 'keydown' && e.code === 'KeyM' && !e.repeat && free && !e.ctrlKey && !e.metaKey && !e.altKey) {
        show();
        e.preventDefault();
        return true;
      }
      return false;
    },
  };
}
export type TravelUI = ReturnType<typeof createTravelUI>;
