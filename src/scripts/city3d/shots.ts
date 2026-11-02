/*
 * The review shots (`?shots` in the address, `?shots=night` for night;
 * docs/blend-plan.md Phase 0): straight into the 3D city as the benchmark
 * goes, clear sky, every district loaded and every site built, then the
 * camera held on one of the review views (blendviews.ts) at a time for a
 * script to photograph (`npm run shots`, scripts/shots.mjs). The city's own
 * buttons, cards and pins are hidden so only the city shows.
 *
 * The script drives it through `window.__shots`: `ready` once every site is
 * built, `show(id)` puts the camera on a view, and `frames` counts the frames
 * drawn since (it waits for a few, and for anything that view asked to be
 * built, before it shoots).
 */
import type * as THREE from 'three';
import { BLEND_VIEWS, type ReviewView } from './blendviews';

export interface ShotsDeps {
  root: HTMLElement;
  /** Clear day (or night) for the shots */
  conditions(night: boolean): () => void;
  /** Whether every site and district is built */
  built(): boolean;
  /** Build what's waiting in the camera's view first (works.wantView) */
  want(camera: THREE.PerspectiveCamera): void;
}

export function createShots(d: ShotsDeps, night: boolean) {
  d.root.classList.add('is-shots');
  const style = document.createElement('style');
  // (only the city: its header, HUD, cards and pins hidden)
  style.textContent = '.city.is-shots > :not([data-city3d]), .city.is-shots .city-pins, .city.is-shots .city-stats { visibility: hidden !important; }';
  document.head.append(style);
  d.conditions(night);
  let view: ReviewView | null = null;
  let fresh = false;
  const api = {
    views: BLEND_VIEWS.map((v) => ({ id: v.id, name: v.name })),
    ready: false,
    frames: 0,
    view: '' as string,
    show(id: string) {
      const v = BLEND_VIEWS.find((w) => w.id === id);
      if (!v) throw new Error(`no review view ${id}`);
      view = v;
      api.view = id;
      api.frames = 0;
      fresh = true;
    },
  };
  (window as unknown as { __shots: typeof api }).__shots = api;
  return {
    /** The camera, while a view is held (true: it's placed) */
    place(camera: THREE.PerspectiveCamera, target: THREE.Vector3) {
      if (!api.ready && d.built()) api.ready = true;
      if (!view) return false;
      camera.position.set(...view.pos);
      target.set(...view.target);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      if (fresh) d.want(camera);
      fresh = false;
      return true;
    },
    /** A frame drawn */
    drawn() {
      api.frames++;
    },
  };
}
export type Shots = ReturnType<typeof createShots>;
