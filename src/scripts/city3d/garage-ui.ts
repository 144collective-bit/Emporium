/*
 * The garage menu, opened at the garage office's door in walk mode: pick
 * your car (five models) and its paint. Each pick shows on the showroom
 * turntable out front while the camera looks on; Keep saves it (in the
 * browser), closing without keeping puts your saved car back. Cars are free
 * and only for the city: nothing is sold.
 *
 * Arrow keys or the D-pad pick a model (up / down on the pad: the paint),
 * Enter / A keeps it, Esc / B / E closes.
 */
import { CARS } from './cars';
import { CAR_PAINTS, DEFAULT_CAR, DRIVE, PLAYER_CARS, cleanCar, type MyCar, type PaintId, type PlayerCar } from './mycar';

const KEY = 'degen-city-car-v1';

/** Your saved car (or the default) */
export function loadCar(): MyCar {
  try {
    return cleanCar(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_CAR };
  }
}
function saveCar(c: MyCar) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* fine: the car just won't stick */
  }
}

/** A side-on silhouette from the model's own outline, all at one scale so sizes compare (110 x 46) */
function art(id: PlayerCar) {
  const s = CARS[id];
  const k = 32;
  const pt = ([x, y]: readonly [number, number]) => `${(55 + x * k).toFixed(1)},${(44 - y * k).toFixed(1)}`;
  const body = [[s.L / 2, s.clr] as const, ...s.top, [-s.L / 2, s.clr] as const];
  const wheels = s.axles.map((x) => `<circle class="wheel" cx="${(55 + x * k).toFixed(1)}" cy="${(44 - s.r * k).toFixed(1)}" r="${(s.r * k).toFixed(1)}"/>`).join('');
  return `<svg viewBox="0 0 110 46" aria-hidden="true"><path d="M${s.cabin.map(pt).join('L')}Z"/><path d="M${body.map(pt).join('L')}Z"/>${wheels}</svg>`;
}

const STATS: { key: 'speed' | 'accel' | 'grip'; label: string }[] = [
  { key: 'speed', label: 'Top speed' },
  { key: 'accel', label: 'Pick-up' },
  { key: 'grip', label: 'Grip' },
];

export interface GarageDeps {
  /** Show a car on the turntable (each pick, and the saved car again on close) */
  preview(c: MyCar): void;
  /** A new car was kept */
  keep(c: MyCar): void;
  /** Opening frees the mouse and turns the camera to the turntable; closing hands control back */
  onOpen(): void;
  onClose(): void;
}

export function createGarageUI(root: HTMLElement, d: GarageDeps) {
  const el = root.querySelector<HTMLElement>('[data-garage]')!;
  const list = el.querySelector<HTMLElement>('[data-garage-list]')!;
  const paints = el.querySelector<HTMLElement>('[data-garage-paints]')!;
  const keepBtn = el.querySelector<HTMLButtonElement>('[data-garage-keep]')!;
  let saved = loadCar();
  let pick: MyCar = { ...saved };
  let open = false;

  for (const id of PLAYER_CARS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'shop-card garage-card';
    b.dataset.car = id;
    b.setAttribute('role', 'option');
    b.innerHTML = `${art(id)}<b></b><small></small>`;
    b.querySelector('b')!.textContent = CARS[id].name;
    b.querySelector('small')!.textContent = DRIVE[id].kind;
    b.addEventListener('click', () => select({ ...pick, model: id }));
    list.append(b);
  }
  for (const p of CAR_PAINTS) {
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
  el.querySelector('[data-garage-close]')!.addEventListener('click', () => close());
  keepBtn.addEventListener('click', () => keep());

  const same = (a: MyCar, b: MyCar) => a.model === b.model && a.paint === b.paint;
  function paint() {
    for (const b of list.querySelectorAll<HTMLButtonElement>('[data-car]')) b.setAttribute('aria-selected', String(b.dataset.car === pick.model));
    for (const b of paints.querySelectorAll<HTMLButtonElement>('[data-paint]')) {
      const on = b.dataset.paint === pick.paint;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    const s = CARS[pick.model];
    const dr = DRIVE[pick.model];
    el.querySelector('[data-garage-name]')!.textContent = s.name;
    el.querySelector('[data-garage-kind]')!.textContent = `${dr.kind} · about ${Math.round(s.L * 1.8 * 10) / 10} m long`;
    el.querySelector('[data-garage-blurb]')!.textContent = dr.blurb;
    el.querySelector('[data-garage-paint-name]')!.textContent = CAR_PAINTS.find((p) => p.id === pick.paint)!.name;
    for (const st of STATS) el.querySelector<HTMLElement>(`[data-car-stat="${st.key}"] i`)!.style.setProperty('--v', String(dr[st.key]));
    keepBtn.textContent = same(pick, saved) ? 'Your car · done' : 'Keep this one';
  }

  function select(c: MyCar) {
    pick = c;
    d.preview(pick);
    paint();
  }
  function keep() {
    if (!same(pick, saved)) {
      saved = { ...pick };
      saveCar(saved);
      d.keep(saved);
    }
    close();
  }
  function show() {
    if (open) return;
    open = true;
    saved = loadCar();
    pick = { ...saved };
    paint();
    el.hidden = false;
    root.classList.add('is-shopping', 'is-garage');
    d.onOpen();
    list.querySelector<HTMLButtonElement>(`[data-car="${pick.model}"]`)?.focus({ preventScroll: true });
  }
  function close() {
    if (!open) return false;
    open = false;
    el.hidden = true;
    root.classList.remove('is-shopping', 'is-garage');
    // Not kept: the saved car goes back on the turntable
    if (!same(pick, saved)) d.preview(saved);
    d.onClose();
    return true;
  }
  /** Step through the models, or the paints */
  function step(dir: number) {
    const i = PLAYER_CARS.indexOf(pick.model);
    select({ ...pick, model: PLAYER_CARS[(i + dir + PLAYER_CARS.length) % PLAYER_CARS.length] });
    list.querySelector<HTMLButtonElement>(`[data-car="${pick.model}"]`)?.focus({ preventScroll: true });
  }
  function stepPaint(dir: number) {
    const i = CAR_PAINTS.findIndex((p) => p.id === pick.paint);
    select({ ...pick, paint: CAR_PAINTS[(i + dir + CAR_PAINTS.length) % CAR_PAINTS.length].id as PaintId });
  }

  el.addEventListener('keydown', (e) => {
    const inPaints = !!(e.target as HTMLElement).closest('[data-paint]');
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') inPaints ? stepPaint(1) : step(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') inPaints ? stepPaint(-1) : step(-1);
    else if (e.key === 'Enter' && (e.target as HTMLElement).closest('[data-car]')) keep();
    else return;
    if (inPaints) paints.querySelector<HTMLButtonElement>(`[data-paint="${pick.paint}"]`)?.focus({ preventScroll: true });
    e.preventDefault();
  });

  return {
    get open() {
      return open;
    },
    /** The panel, so the camera can frame the turntable beside (or above) it */
    panel: el,
    show,
    close,
    step,
    stepPaint,
    keep,
  };
}

export type GarageUI = ReturnType<typeof createGarageUI>;
