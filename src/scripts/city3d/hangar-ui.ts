/*
 * The hangar menu, opened at the hangar office's door at the airport (walk
 * mode): pick your aircraft and its paint. Three cards (PLAYER_AIRCRAFT:
 * the prop plane, the small jet, the helicopter), all free and only for
 * the city (the owner's call: never sold, priced or tied to the store or
 * the token), with stat bars from how each one flies (flight-sim.ts TUNES)
 * and the garage's twelve paints. Each pick shows in the hangar while the
 * camera looks on (walk.ts frames it like the garage's turntable).
 *
 * Keep saves your aircraft in the browser (degen-city-plane-v1); closing
 * without keeping puts the saved one back. If your aircraft is parked out
 * on the airfield (or anywhere you landed it), Keep also brings it home.
 *
 * Arrow keys or the D-pad pick an aircraft (up / down on the pad: the
 * paint), Enter / A keeps it, Esc / B / F closes.
 */
import { TUNES } from './flight-sim';
import { DEFAULT_PLANE, FLY, PLANE_PAINTS, PLAYER_AIRCRAFT, cleanPlane, type MyPlane, type PlaneId } from './myplane';
import type { PaintId } from './mycar';
import { repaint } from './ui';

const KEY = 'degen-city-plane-v1';

/** Your saved aircraft (or the default) */
export function loadPlane(): MyPlane {
  try {
    return cleanPlane(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_PLANE };
  }
}
function savePlane(p: MyPlane) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* fine: the pick just won't stick */
  }
}

/** Side-on silhouettes, all at one scale (110 x 46) */
const ART: Record<PlaneId, string> = {
  prop: `<svg viewBox="0 0 110 46" aria-hidden="true"><path d="M20 26 L28 12 L33 12 L36 22 L78 21 Q88 21 90 25 Q88 30 78 30 L36 30 Z"/><path d="M42 17 L76 17 L76 19.5 L42 19.5 Z"/><path d="M90 16 L92 16 L92 34 L90 34 Z"/><circle class="wheel" cx="80" cy="37" r="3"/><circle class="wheel" cx="54" cy="37" r="3.4"/></svg>`,
  bizjet: `<svg viewBox="0 0 110 46" aria-hidden="true"><path d="M10 25 L14 8 L21 8 L28 20 L84 20 Q98 21 102 26 Q97 30 86 30 L28 30 Z"/><path d="M8 8 L24 8 L24 10 L8 10 Z"/><path d="M26 18 L42 18 Q45 21 42 24 L26 24 Z"/><path d="M52 28 L66 28 L60 33 L46 33 Z"/><circle class="wheel" cx="86" cy="38" r="2.6"/><circle class="wheel" cx="58" cy="38" r="3.2"/></svg>`,
  heli: `<svg viewBox="0 0 110 46" aria-hidden="true"><path d="M18 9 L92 9 L92 11 L18 11 Z"/><path d="M53 11 L57 11 L57 16 L53 16 Z"/><path d="M14 22 L46 20 L48 25 L14 26 Z"/><path d="M10 13 L16 13 L18 25 L12 25 Z"/><path d="M46 17 Q58 14 72 17 Q84 20 86 27 Q82 34 70 34 L50 34 Q44 30 46 17 Z"/><path d="M48 39 L84 39 L86 37 L86 40 L48 40.5 Z"/></svg>`,
};

/** The stat bars, from how each one flies */
const climbOf = (id: PlaneId) => {
  const t = TUNES[id];
  return t.kind === 'heli' ? t.climb : t.top * Math.sin(t.pitch);
};
const STATS: { label: string; of: (id: PlaneId) => number }[] = [
  { label: 'Top speed', of: (id) => TUNES[id].top },
  { label: 'Climb', of: climbOf },
  { label: 'Turning', of: (id) => TUNES[id].turn },
];
const best = STATS.map((s) => Math.max(...PLAYER_AIRCRAFT.map(s.of)));

export interface HangarDeps {
  /** Show a pick in the hangar (each pick, and the saved one again on close) */
  preview(p: MyPlane): void;
  /** Kept (or your aircraft, parked out, was brought home) */
  keep(p: MyPlane): void;
  /** Closed without keeping */
  cancel(saved: MyPlane): void;
  /** Is your aircraft out of the hangar? */
  away(): boolean;
  /** Opening frees the mouse and turns the camera to the hangar; closing hands control back */
  onOpen(): void;
  onClose(): void;
}

export function createHangarUI(root: HTMLElement, d: HangarDeps) {
  const el = root.querySelector<HTMLElement>('[data-hangar]')!;
  const list = el.querySelector<HTMLElement>('[data-hangar-list]')!;
  const paints = el.querySelector<HTMLElement>('[data-hangar-paints]')!;
  const keepBtn = el.querySelector<HTMLButtonElement>('[data-hangar-keep]')!;
  const statsEl = el.querySelector<HTMLElement>('[data-hangar-stats]')!;
  let saved = loadPlane();
  let pick: MyPlane = { ...saved };
  let open = false;
  let kept = false;

  const cards = PLAYER_AIRCRAFT.map((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'shop-card garage-card';
    b.dataset.plane = id;
    b.setAttribute('role', 'option');
    b.innerHTML = `${ART[id]}<b></b><small></small>`;
    b.querySelector('b')!.textContent = FLY[id].name;
    b.addEventListener('click', () => select({ ...pick, model: id }));
    list.append(b);
    return b;
  });
  for (const p of PLANE_PAINTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'garage-paint';
    b.dataset.paint = p.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', p.name);
    b.title = p.name;
    b.style.setProperty('--paint', p.hex);
    b.addEventListener('click', () => select({ ...pick, paint: p.id }));
    paints.append(b);
  }
  el.querySelector('[data-hangar-close]')!.addEventListener('click', () => close());
  keepBtn.addEventListener('click', () => keep());

  const same = (a: MyPlane, b: MyPlane) => a.model === b.model && a.paint === b.paint;

  function paint() {
    const id = pick.model;
    for (const b of cards) {
      const pid = b.dataset.plane as PlaneId;
      b.setAttribute('aria-selected', String(pid === id));
      b.classList.add('is-owned');
      repaint(b.querySelector('small')!, pid === saved.model ? 'Yours' : FLY[pid].kind);
    }
    for (const b of paints.querySelectorAll<HTMLButtonElement>('[data-paint]')) {
      const on = b.dataset.paint === pick.paint;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    const t = TUNES[id];
    el.querySelector('[data-hangar-name]')!.textContent = FLY[id].name;
    el.querySelector('[data-hangar-kind]')!.textContent = `${FLY[id].kind} · ${t.kind === 'heli' ? 'takes off straight up' : `lifts off at ${Math.round(t.rotate * 6.48)} km/h`}`;
    el.querySelector('[data-hangar-blurb]')!.textContent = FLY[id].blurb;
    el.querySelector('[data-hangar-paint-name]')!.textContent = PLANE_PAINTS.find((p) => p.id === pick.paint)!.name;
    repaint(
      statsEl,
      STATS.map((s, i) => `<div><dt>${s.label}</dt><dd><i style="--v:${(s.of(id) / best[i]).toFixed(3)}"></i></dd></div>`).join('')
    );
    keepBtn.textContent = !same(pick, saved) ? 'Keep this one' : d.away() ? 'Bring it home' : 'Yours · done';
  }

  function select(p: MyPlane) {
    pick = p;
    d.preview(pick);
    paint();
  }
  function keep() {
    if (!same(pick, saved) || d.away()) {
      saved = { ...pick };
      savePlane(saved);
      d.keep(saved);
    }
    kept = true;
    close();
  }
  function show() {
    if (open) return;
    open = true;
    saved = loadPlane();
    pick = { ...saved };
    kept = false;
    if (d.away()) d.preview(saved);
    paint();
    el.hidden = false;
    el.scrollTop = 0;
    root.classList.add('is-shopping', 'is-garage');
    d.onOpen();
    list.querySelector<HTMLButtonElement>(`[data-plane="${pick.model}"]`)?.focus({ preventScroll: true });
  }
  function close() {
    if (!open) return false;
    open = false;
    el.hidden = true;
    root.classList.remove('is-shopping', 'is-garage');
    if (!kept) d.cancel(saved);
    d.onClose();
    return true;
  }
  function step(dir: number) {
    const i = PLAYER_AIRCRAFT.indexOf(pick.model);
    select({ ...pick, model: PLAYER_AIRCRAFT[(i + dir + PLAYER_AIRCRAFT.length) % PLAYER_AIRCRAFT.length] });
    list.querySelector<HTMLButtonElement>(`[data-plane="${pick.model}"]`)?.focus({ preventScroll: true });
  }
  function stepPaint(dir: number) {
    const i = PLANE_PAINTS.findIndex((p) => p.id === pick.paint);
    select({ ...pick, paint: PLANE_PAINTS[(i + dir + PLANE_PAINTS.length) % PLANE_PAINTS.length].id as PaintId });
  }

  el.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    const inPaints = !!t.closest('[data-paint]');
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') inPaints ? stepPaint(1) : step(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') inPaints ? stepPaint(-1) : step(-1);
    else if (e.key === 'Enter' && t.closest('[data-plane]')) keep();
    else return;
    if (inPaints) paints.querySelector<HTMLButtonElement>(`[data-paint="${pick.paint}"]`)?.focus({ preventScroll: true });
    e.preventDefault();
  });

  return {
    get open() {
      return open;
    },
    panel: el,
    show,
    close,
    step,
    stepPaint,
    keep,
  };
}

export type HangarUI = ReturnType<typeof createHangarUI>;
