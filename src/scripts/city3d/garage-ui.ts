/*
 * The garage menu, opened at the garage office's door in walk mode: the
 * dealership and tuning shop. Cards for the eight models (PLAYER_CARS): the
 * five starters are yours from the start, the other three are for sale for
 * Dorras (CAR_CATALOG in catalog.ts, with a level each; a card you can't buy
 * yet is dimmed with its level). Picking any card shows it on the showroom
 * turntable out front while the camera looks on, with its stat bars (the
 * model's numbers plus a bright bonus for the mods fitted), how much it
 * carries (the roof rack counts), the paint picker (paint is free) and:
 *
 * - for a car you don't own, a Buy button that asks once ("Buy the ... for
 *   18,000 Dorras?") and then goes through the rules (buyCar in tycoon.ts;
 *   a refusal is said in words, whyNot);
 * - for one you own, the Tune section: the four mods (CAR_MODS), three
 *   levels each with the next level's cost, bought with modCar.
 *
 * Every change goes through the shared GameDeps (ui.ts): the save, commit()
 * to keep it and repaint the other screens, a toast and the sounds. The
 * balance sits in the header and the whole panel is painted again after
 * every change (and once a second while it's open, as takings come in).
 *
 * Keep saves the car you're driving (in the browser, mycar.ts) and only
 * works on a car you own; closing without keeping puts your saved car back.
 * If your car is out on the streets, Keep also calls it home. Nothing here
 * is real money and nothing is tied to the store or the token.
 *
 * Arrow keys or the D-pad pick a model (up / down on the pad: the paint),
 * Enter / A keeps it, Esc / B / F closes.
 */
import { CAR_CATALOG, CAR_MODS, CAR_MOD_IDS, MOD_LEVELS, type CarModId } from './catalog';
import { CARS } from './cars';
import { CAR_PAINTS, CARGO, DEFAULT_CAR, DRIVE, PLAYER_CARS, cleanCar, type MyCar, type PaintId, type PlayerCar } from './mycar';
import { buyCar, carModCost, carMods, carStatsOf, level, modCar, ownsCar } from './tycoon';
import { COIN, D, LV, esc, fmt, repaint, whyNot, type GameDeps } from './ui';

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

/** The three stat bars, and the mod that raises each */
const STATS: { key: 'speed' | 'accel' | 'grip'; label: string; mod: CarModId }[] = [
  { key: 'speed', label: 'Top speed', mod: 'engine' },
  { key: 'accel', label: 'Pick-up', mod: 'turbo' },
  { key: 'grip', label: 'Grip', mod: 'tyres' },
];

export interface GarageDeps {
  /** Show a car on the turntable (each pick, and the saved car again on close) */
  preview(c: MyCar): void;
  /** A new car was kept (or your car, out on the streets, was called home) */
  keep(c: MyCar): void;
  /** Closed without keeping: the saved car goes back on the turntable (or it empties, if your car is out) */
  cancel(saved: MyCar): void;
  /** Is your car out on the streets? */
  away(): boolean;
  /** The economy: the save the rules change, commit(), a toast and the sounds */
  game: GameDeps;
  /** Opening frees the mouse and turns the camera to the turntable; closing hands control back */
  onOpen(): void;
  onClose(): void;
}

export function createGarageUI(root: HTMLElement, d: GarageDeps) {
  const el = root.querySelector<HTMLElement>('[data-garage]')!;
  const list = el.querySelector<HTMLElement>('[data-garage-list]')!;
  const paints = el.querySelector<HTMLElement>('[data-garage-paints]')!;
  const keepBtn = el.querySelector<HTMLButtonElement>('[data-garage-keep]')!;
  const dorrasEl = el.querySelector<HTMLElement>('[data-garage-dorras]')!;
  const statsEl = el.querySelector<HTMLElement>('[data-garage-stats]')!;
  const dealEl = el.querySelector<HTMLElement>('[data-garage-deal]')!;
  let saved = loadCar();
  let pick: MyCar = { ...saved };
  let open = false;
  /** The Buy button was pressed: Confirm / Cancel are showing */
  let asking = false;
  let ticker = 0;

  const cards = PLAYER_CARS.map((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'shop-card garage-card';
    b.dataset.car = id;
    b.setAttribute('role', 'option');
    b.innerHTML = `${art(id)}<b></b><small></small>`;
    b.querySelector('b')!.textContent = CARS[id].name;
    b.addEventListener('click', () => select({ ...pick, model: id }));
    list.append(b);
    return b;
  });
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
  // The deal section is painted from the save, so its buttons are handled here
  dealEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || b.disabled) return;
    if (b.hasAttribute('data-garage-buy')) askBuy();
    else if (b.hasAttribute('data-garage-confirm')) buy();
    else if (b.hasAttribute('data-garage-cancel')) {
      asking = false;
      paint();
      dealEl.querySelector<HTMLButtonElement>('[data-garage-buy]')?.focus({ preventScroll: true });
    } else if (b.dataset.garageUp) upgrade(b.dataset.garageUp as CarModId);
  });

  const same = (a: MyCar, b: MyCar) => a.model === b.model && a.paint === b.paint;
  const fill = (n: number) => Math.max(0, Math.min(1, n)).toFixed(3);

  /** Bring the whole panel up to date with the pick and the save */
  function paint() {
    const save = d.game.save();
    const lv = level(save);
    const id = pick.model;
    const spec = CARS[id];
    const entry = CAR_CATALOG[id];
    const owned = ownsCar(save, id);
    const mods = carMods(save, id);
    const st = carStatsOf(save, id);

    repaint(dorrasEl, D(save.dorras));
    for (const b of cards) {
      const cid = b.dataset.car as PlayerCar;
      const c = CAR_CATALOG[cid];
      const mine = ownsCar(save, cid);
      const locked = !mine && lv < c.level;
      b.setAttribute('aria-selected', String(cid === id));
      b.classList.toggle('is-locked', locked);
      b.classList.toggle('is-owned', mine);
      // On sale: the tag (or the level it needs) over the price; the tag goes on small screens
      const price = `<span class="garage-price">${COIN}${fmt.format(c.price)}</span>`;
      const state = cid === saved.model ? 'Your car' : mine ? 'Yours' : locked ? `${LV(c.level)}${price}` : `<span class="garage-sale-tag">For sale</span>${price}`;
      repaint(b.querySelector('small')!, state);
    }
    for (const b of paints.querySelectorAll<HTMLButtonElement>('[data-paint]')) {
      const on = b.dataset.paint === pick.paint;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }

    const dr = DRIVE[id];
    el.querySelector('[data-garage-name]')!.textContent = spec.name;
    el.querySelector('[data-garage-kind]')!.textContent = `${dr.kind} · carries ${st.cargo} goods${mods.rack ? ` (${CARGO[id]} + ${st.cargo - CARGO[id]} on the rack)` : ''}`;
    el.querySelector('[data-garage-blurb]')!.textContent = dr.blurb;
    el.querySelector('[data-garage-pitch]')!.textContent = entry.pitch;
    el.querySelector('[data-garage-paint-name]')!.textContent = CAR_PAINTS.find((p) => p.id === pick.paint)!.name;
    // Stat bars: the model's number, and a bright segment on top for the mods fitted
    repaint(
      statsEl,
      STATS.map(({ key, label, mod }) => {
        const base = dr[key];
        const lvl = mods[mod];
        const bonus = st[key] > base ? `<em class="garage-bonus" style="--v:${fill(base)};--b:${fill(st[key] - base)}"></em>` : '';
        return `<div data-car-stat="${key}"><dt>${label}${lvl ? `<span class="garage-plus">+${lvl}</span>` : ''}</dt><dd><i style="--v:${fill(base)}"></i>${bonus}</dd></div>`;
      }).join('')
    );

    // The deal: Buy (then Confirm / Cancel) for a car on sale, the Tune section for one you own
    let deal: string;
    if (!owned && asking) {
      deal = `<div class="garage-sale is-asking"><p class="garage-ask">Buy the ${esc(spec.name)} for ${fmt.format(entry.price)} Dorras?</p><div class="garage-confirm"><button type="button" class="shop-take" data-garage-confirm>Confirm</button><button type="button" class="garage-cancel" data-garage-cancel>Cancel</button></div></div>`;
    } else if (!owned) {
      const note = lv < entry.level ? `Needs level ${entry.level} (you're level ${lv}).` : save.dorras < entry.price ? `You're ${fmt.format(entry.price - save.dorras)} Dorras short.` : '';
      deal = `<div class="garage-sale"><button type="button" class="shop-take garage-buy" data-garage-buy>Buy · ${D(entry.price)} Dorras</button>${note ? `<p class="shop-note">${note}</p>` : ''}</div>`;
    } else {
      const rows = CAR_MOD_IDS.map((m) => {
        const info = CAR_MODS[m];
        const lvl = mods[m];
        const cost = carModCost(id, m, mods);
        const pips = Array.from({ length: MOD_LEVELS }, (_, i) => `<i${i < lvl ? ' class="on"' : ''}></i>`).join('');
        const btn =
          cost === null
            ? `<button type="button" class="garage-up" disabled><span>Maxed</span></button>`
            : `<button type="button" class="garage-up" data-garage-up="${m}"${save.dorras < cost ? ' disabled' : ''}><span>Upgrade</span><small>${D(cost)}</small></button>`;
        return `<li class="garage-mod"><div class="garage-mod-info"><b>${esc(info.name)}</b><small>${esc(info.blurb)}</small></div><span class="garage-pips" role="img" aria-label="Level ${lvl} of ${MOD_LEVELS}">${pips}</span>${btn}</li>`;
      }).join('');
      deal = `<section class="garage-tune" aria-label="Tune"><h4 class="garage-tune-head">Tune</h4><ul class="garage-mods">${rows}</ul></section>`;
    }
    repaint(dealEl, deal);

    keepBtn.disabled = !owned;
    keepBtn.textContent = !owned ? 'Buy it first' : !same(pick, saved) ? 'Keep this one' : d.away() ? 'Bring my car home' : 'Your car · done';
  }

  function select(c: MyCar) {
    if (c.model !== pick.model) asking = false;
    pick = c;
    d.preview(pick);
    paint();
  }

  /* ---------- Buying and tuning (the rules in tycoon.ts decide) ---------- */

  function askBuy() {
    const save = d.game.save();
    const entry = CAR_CATALOG[pick.model];
    // No point asking when the rules will say no: say why instead
    if (level(save) < entry.level || save.dorras < entry.price) return buy();
    asking = true;
    paint();
    dealEl.querySelector<HTMLButtonElement>('[data-garage-confirm]')?.focus({ preventScroll: true });
  }
  function buy() {
    asking = false;
    const id = pick.model;
    const r = buyCar(d.game.save(), id);
    if (r.ok) {
      d.game.commit();
      d.game.sfx('buy');
      d.game.toast(`The ${CARS[id].name} is yours. Keep it to take it out.`);
    } else {
      d.game.sfx('denied');
      d.game.toast(whyNot(r.why, CAR_CATALOG[id].level));
    }
    paint();
    if (r.ok) keepBtn.focus({ preventScroll: true });
  }
  function upgrade(mod: CarModId) {
    const id = pick.model;
    const r = modCar(d.game.save(), id, mod);
    if (r.ok) {
      d.game.commit();
      d.game.sfx('upgrade');
      d.game.toast(`${CAR_MODS[mod].name} level ${carMods(d.game.save(), id)[mod]} fitted to the ${CARS[id].name}.`);
    } else {
      d.game.sfx('denied');
      d.game.toast(whyNot(r.why));
    }
    paint();
  }

  let kept = false;
  function keep() {
    if (!ownsCar(d.game.save(), pick.model)) {
      d.game.sfx('denied');
      d.game.toast(`Buy the ${CARS[pick.model].name} first.`);
      return;
    }
    if (!same(pick, saved) || d.away()) {
      saved = { ...pick };
      saveCar(saved);
      d.keep(saved);
    }
    kept = true;
    close();
  }
  function show() {
    if (open) return;
    open = true;
    saved = loadCar();
    pick = { ...saved };
    kept = false;
    asking = false;
    // Your car is out: show it on the turntable while you look
    if (d.away()) d.preview(saved);
    paint();
    el.hidden = false;
    el.scrollTop = 0;
    root.classList.add('is-shopping', 'is-garage');
    d.onOpen();
    list.querySelector<HTMLButtonElement>(`[data-car="${pick.model}"]`)?.focus({ preventScroll: true });
    // Takings come in while you browse: keep the balance and the buttons honest
    ticker = window.setInterval(paint, 1000);
  }
  function close() {
    if (!open) return false;
    open = false;
    clearInterval(ticker);
    el.hidden = true;
    root.classList.remove('is-shopping', 'is-garage');
    if (!kept) d.cancel(saved);
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
    const t = e.target as HTMLElement;
    // The deal's buttons (Buy, Confirm, Upgrade) keep their own keys
    if (t.closest('[data-garage-deal]')) return;
    const inPaints = !!t.closest('[data-paint]');
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') inPaints ? stepPaint(1) : step(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') inPaints ? stepPaint(-1) : step(-1);
    else if (e.key === 'Enter' && t.closest('[data-car]')) keep();
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
