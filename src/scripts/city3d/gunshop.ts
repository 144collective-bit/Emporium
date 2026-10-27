/*
 * The Armoury's store and workbench, at the gun store counter: browse the
 * guns, compare them, pick the loadout of two Degen carries (the Loadout row:
 * tap a slot, then a gun; or a gun's "Carry as gun 1 / 2"; the rest wait in
 * the locker here), refill and draw, buy the ones for sale, and upgrade a gun
 * you own at the workbench (the barrel, an extended mag, the grip & stock,
 * three levels each).
 *
 * The starters are free and unlock with lifetime score. The rest cost Dorras
 * earned in the city: the prices and levels are catalog.ts, the save and the
 * spending are tycoon.ts (through `d.game`), and the mods reach the rules
 * through `d.setMods()`. Nothing here is real money.
 *
 * Opens from the counter prompt in walk mode (E, a tap, or Y on a gamepad).
 * Arrow keys or the D-pad pick a gun, Enter / A takes or buys it, Esc / B / E
 * closes. The views are patched in place (repaint), so a button never changes
 * under a finger.
 */
import { WEAPONS, WEAPON_IDS, type Weapon, type WeaponId } from './combat-sim';
import { GUN_CATALOG, GUN_MODS, GUN_MOD_IDS, MOD_LEVELS, applyGunMods, type GunModId } from './catalog';
import { buyGun, gunModCost, gunMods, level, modGun, ownsGun } from './tycoon';
import { carryGun } from './inventory';
import { D, LV, esc, fmt, repaint, whyNot, type GameDeps } from './ui';
import { ART } from './gunart';

/** How each gun compares (0..1) for the stat bars (of the stock gun, or the gun with its mods on) */
const STATS: { key: string; label: string; of: (w: Weapon) => number }[] = [
  { key: 'dmg', label: 'Damage', of: (w) => Math.min(1, (w.damage * w.pellets) / 90) },
  { key: 'rate', label: 'Fire rate', of: (w) => Math.min(1, w.rate / 15) },
  { key: 'range', label: 'Range', of: (w) => Math.min(1, w.range / 120) },
  { key: 'acc', label: 'Accuracy', of: (w) => 1 - Math.min(1, w.spreadAim / 0.05) * 0.9 },
  { key: 'mag', label: 'Magazine', of: (w) => Math.min(1, w.mag / 40) },
];

export interface ShopDeps {
  /** Lifetime score (decides which starters are unlocked) */
  lifetime(): number;
  /** The gun Degen carries, and whether he's geared up at all */
  weapon(): WeaponId;
  geared(): boolean;
  /** Take a gun (and its ammo); false if he may not have it */
  equip(id: WeaponId): boolean;
  /** May he carry this gun: a starter his score unlocked, or one he bought */
  may(id: WeaponId): boolean;
  /** The loadout changed in the save: the rules read it again */
  loadoutChanged(): void;
  /** Opening frees the mouse; closing hands control back */
  onOpen(): void;
  onClose(): void;
  /** The economy: the save (what's owned, the mods, the Dorras), commit, toasts and sounds */
  game: GameDeps;
  /** A gun's mods changed in the save: the rules read them again */
  setMods(id: WeaponId): void;
}

export function createGunShop(root: HTMLElement, d: ShopDeps) {
  const el = root.querySelector<HTMLElement>('[data-shop]')!;
  const list = el.querySelector<HTMLElement>('[data-shop-list]')!;
  const dorras = el.querySelector<HTMLElement>('[data-shop-dorras]')!;
  const score = el.querySelector<HTMLElement>('[data-shop-score]')!;
  const detail = el.querySelector<HTMLElement>('[data-shop-detail]')!;
  const bench = el.querySelector<HTMLElement>('[data-shop-bench]')!;
  const loadout = el.querySelector<HTMLElement>('[data-shop-loadout]')!;
  let open = false;
  let pick: WeaponId = 'rifle';
  /** Picking a gun for one of the loadout's slots (the next ready gun tapped goes there) */
  let choosing: 0 | 1 | null = null;
  const guns = () => d.game.save().inventory.guns;
  /** Which loadout slot carries this gun (-1: in the locker) */
  const slotOf = (id: WeaponId) => guns().indexOf(id);
  /** The buy step is showing for the picked gun */
  let confirming = false;
  let timer = 0;
  const pts = (n: number) => fmt.format(Math.floor(n));

  /** Where a gun stands with this player */
  function stateOf(id: WeaponId) {
    const save = d.game.save();
    const c = GUN_CATALOG[id];
    const premium = c.price > 0;
    const owned = ownsGun(save, id);
    const unlocked = d.lifetime() >= WEAPONS[id].need;
    const lv = level(save);
    return {
      premium,
      owned,
      unlocked,
      /** Not for sale to you yet (a premium gun above your level) */
      lowLevel: premium && !owned && lv < c.level,
      /** Yours to carry */
      ready: owned && unlocked,
      carrying: d.geared() && d.weapon() === id,
      /** In the loadout (0 gun 1, 1 gun 2) or the locker (-1) */
      slot: slotOf(id),
      mods: gunMods(save, id),
      lv,
      c,
    };
  }

  function paintList() {
    const html = WEAPON_IDS.map((id) => {
      const w = WEAPONS[id];
      const s = stateOf(id);
      const locked = s.premium ? s.lowLevel : !s.unlocked;
      const state = s.slot >= 0
        ? `Gun ${s.slot + 1}`
        : s.ready
          ? 'In the locker'
          : s.premium
          ? s.owned
            ? 'Yours'
            : `<span class="shop-sale-word">For sale · </span>${D(s.c.price)}`
          : s.unlocked
            ? 'Ready'
            : `${pts(w.need)} pts`;
      const tag = s.premium && !s.owned ? LV(s.c.level) : '';
      return `<button type="button" class="shop-card${locked ? ' is-locked' : ''}${s.premium && !s.owned ? ' is-sale' : ''}${choosing !== null && s.ready ? ' is-choice' : ''}${s.slot >= 0 ? ' is-carried' : ''}" data-gun="${id}" role="option" aria-selected="${id === pick}">` + `<svg viewBox="0 0 120 40" aria-hidden="true"><path d="${ART[id]}"/></svg><b>${esc(w.name)}</b><small>${state}</small>${tag}</button>`;
    }).join('');
    repaint(list, html);
  }

  function paintDetail() {
    const w = WEAPONS[pick];
    const s = stateOf(pick);
    const W = applyGunMods(w, s.mods);
    const mode = `${w.burst ? `${w.burst}-round bursts` : w.auto ? 'Full auto' : 'One shot per pull'} · ${W.mag} round magazine${w.pellets > 1 ? ` · ${w.pellets} pellets a shot` : ''}`;
    const stats = STATS.map((st) => {
      const a = Math.max(0.06, st.of(w));
      const b = Math.max(a, st.of(W));
      // The stock gun's bar, and the bonus from its mods lit on top
      return `<div data-stat="${st.key}"><dt>${st.label}</dt><dd><i style="--v:${a.toFixed(3)}"></i>${b > a + 0.001 ? `<em style="--a:${a.toFixed(3)};--b:${b.toFixed(3)}"></em>` : ''}</dd></div>`;
    }).join('');
    let action: string;
    let note = '';
    if (s.ready && s.slot >= 0) {
      action = `<button type="button" class="shop-take" data-act="take">${s.carrying ? 'Refill ammo' : 'Refill &amp; draw'}</button>`;
      note = s.slot === 0 && !guns()[1] ? 'Carry a second gun: tap Gun 2 above, then a gun you own.' : '';
    } else if (s.ready) {
      action = `<div class="shop-confirm-row"><button type="button" class="shop-take" data-act="carry0">Carry as gun 1</button><button type="button" class="shop-take" data-act="carry1">Carry as gun 2</button></div>`;
      note = 'In the locker. Carry it and draw it anywhere from the hotbar.';
    } else if (s.premium) {
      if (confirming) {
        action = `<div class="shop-confirm"><p>Buy the ${esc(w.name)} for ${D(s.c.price)}?</p><div class="shop-confirm-row"><button type="button" class="shop-take" data-act="confirm">Buy it</button><button type="button" class="shop-cancel" data-act="cancel">Not now</button></div></div>`;
      } else {
        action = `<button type="button" class="shop-take" data-act="buy">Buy · ${D(s.c.price)}</button>`;
      }
      const save = d.game.save();
      if (s.lowLevel) note = `Needs level ${s.c.level} (you're level ${s.lv}). Earn XP by trading, delivering and shooting.`;
      else if (save.dorras < s.c.price) note = `You're ${D(s.c.price - save.dorras)} short. Dorras are earned in the city.`;
    } else {
      action = `<button type="button" class="shop-take" disabled>Unlocks at ${pts(w.need)} pts</button>`;
      note = `${pts(w.need - d.lifetime())} more points to unlock. Score by knocking down dummies and drones.`;
    }
    repaint(
      detail,
      `<div class="shop-name-row"><h3 class="shop-name" data-shop-name>${esc(w.name)}</h3><p class="shop-mode">${esc(mode)}</p></div>` +
        `<p class="shop-blurb">${esc(w.blurb)}</p><p class="shop-pitch">${esc(s.c.pitch)}</p>` +
        `<dl class="shop-stats">${stats}</dl>${action}<p class="shop-note"${note ? '' : ' hidden'}>${note}</p>`
    );
  }

  function paintBench() {
    const s = stateOf(pick);
    bench.hidden = !s.ready;
    if (!s.ready) return;
    const rows = GUN_MOD_IDS.map((mod) => {
      const lvl = s.mods[mod];
      const cost = gunModCost(pick, mod, s.mods);
      const pips = Array.from({ length: MOD_LEVELS }, (_, i) => `<i${i < lvl ? ' class="is-on"' : ''}></i>`).join('');
      return (
        `<div class="bench-row${cost === null ? ' is-maxed' : ''}"><div class="bench-info"><b>${GUN_MODS[mod].name}</b><small>${GUN_MODS[mod].blurb}</small></div>` +
        `<span class="pips" aria-label="Level ${lvl} of ${MOD_LEVELS}">${pips}</span>` +
        `<button type="button" class="bench-btn" data-mod="${mod}"${cost === null ? ' disabled' : ''}>${cost === null ? 'Maxed' : `Upgrade · ${D(cost)}`}</button></div>`
      );
    }).join('');
    repaint(bench, `<h3 class="bench-title">Workbench <span>· ${esc(WEAPONS[pick].name)}</span></h3><div class="bench-rows">${rows}</div>`);
  }

  /** The Loadout row: the two guns he carries, each a slot to tap and fill */
  function paintLoadout() {
    const [a, b] = guns();
    const slot = (i: 0 | 1, id: WeaponId | null) =>
      `<button type="button" class="shop-slot${choosing === i ? ' is-on' : ''}${id ? '' : ' is-empty'}" data-slot="${i}" aria-pressed="${choosing === i}">` +
      `<small>Gun ${i + 1}</small>${id ? `<svg viewBox="0 0 120 40" aria-hidden="true"><path d="${ART[id]}"/></svg><b>${esc(WEAPONS[id].short)}</b>` : '<b>Empty</b>'}</button>`;
    const hint =
      choosing === null
        ? '<p class="shop-loadout-hint">Tap a slot, then a gun you own. Draw them anywhere from the hotbar.</p>'
        : `<p class="shop-loadout-hint is-on">Pick a gun for gun ${choosing + 1}.${choosing === 1 && b ? ' <button type="button" class="chip-link" data-act="empty">Leave it empty</button>' : ''} <button type="button" class="chip-link" data-act="unchoose">Cancel</button></p>`;
    repaint(loadout, `<span class="shop-loadout-label">Loadout</span><div class="shop-slots">${slot(0, a)}${slot(1, b)}</div>${hint}`);
  }

  function paint() {
    const save = d.game.save();
    dorras.innerHTML = D(save.dorras);
    score.textContent = pts(d.lifetime());
    paintLoadout();
    paintList();
    paintDetail();
    paintBench();
  }

  /** Carry a gun in a loadout slot (null leaves gun 2 empty): he's geared up with gun 1, every gun full */
  function carry(i: 0 | 1, id: WeaponId | null) {
    choosing = null;
    const r = carryGun(d.game.save(), i, id, d.may);
    if (!r.ok) {
      d.game.toast(r.why === 'owned' ? 'Gun 1 is never empty: put another gun there first.' : whyNot('place'));
      d.game.sfx('denied');
      paint();
      return;
    }
    d.game.commit();
    d.loadoutChanged();
    d.equip(guns()[0]);
    d.game.toast(id ? `The ${WEAPONS[id].name} is gun ${i + 1}. Draw it anywhere from the hotbar.` : 'Gun 2 is empty: the rest wait in the locker here.');
    paint();
  }
  function select(id: WeaponId) {
    if (id !== pick) confirming = false;
    pick = id;
    // Picking a gun for a loadout slot: a ready one goes straight in
    if (choosing !== null && stateOf(id).ready) return carry(choosing, id);
    paint();
  }
  /** Buy the picked gun (after the confirmation step) */
  function buy() {
    confirming = false;
    const s = stateOf(pick);
    const r = buyGun(d.game.save(), pick);
    if (!r.ok) {
      d.game.toast(whyNot(r.why, s.c.level));
      d.game.sfx('denied');
    } else {
      d.game.commit();
      d.game.sfx('buy');
      d.game.toast(`The ${WEAPONS[pick].name} is yours. Carry it as gun 1 or gun 2.`);
    }
    paint();
  }
  /** Fit the next level of a mod to the picked gun */
  function upgrade(mod: GunModId) {
    const save = d.game.save();
    const r = modGun(save, pick, mod);
    if (!r.ok) {
      d.game.toast(whyNot(r.why));
      d.game.sfx('denied');
      return;
    }
    d.game.commit();
    d.game.sfx('upgrade');
    d.setMods(pick);
    d.game.toast(`${GUN_MODS[mod].name} level ${gunMods(save, pick)[mod]} fitted to the ${WEAPONS[pick].name}.`);
    paint();
  }
  /** The picked gun's main action: refill and draw it, carry it (as gun 2, or gun 1 when that's free), or start (and then confirm) buying it */
  function take() {
    const s = stateOf(pick);
    if (s.ready && s.slot >= 0) {
      if (!d.equip(pick)) return;
      close();
    } else if (s.ready) {
      carry(1, pick);
    } else if (s.premium) {
      if (confirming) buy();
      else {
        confirming = true;
        paint();
        detail.querySelector<HTMLButtonElement>('[data-act="confirm"]')?.focus({ preventScroll: true });
      }
    }
  }
  const title = el.querySelector<HTMLElement>('#shop-title');
  const closeBtn = el.querySelector<HTMLElement>('[data-shop-close]');
  /** Open it: at the Armoury's counter, or another counter with the same stock (Trench Arms) under its own name */
  function show(name = 'Armoury') {
    if (open) return;
    open = true;
    if (title) title.textContent = name;
    closeBtn?.setAttribute('aria-label', `Close ${name === 'Armoury' ? 'the Armoury' : name}`);
    pick = d.weapon();
    confirming = false;
    choosing = null;
    paint();
    el.hidden = false;
    root.classList.add('is-shopping');
    d.onOpen();
    // Sales tick on while it's open: keep the balance honest
    timer = window.setInterval(paint, 1000);
    // Focus the picked card so the keyboard (and screen readers) start there
    list.querySelector<HTMLButtonElement>(`[data-gun="${pick}"]`)?.focus({ preventScroll: true });
  }
  function close() {
    if (!open) return false;
    open = false;
    confirming = false;
    choosing = null;
    el.hidden = true;
    root.classList.remove('is-shopping');
    clearInterval(timer);
    d.onClose();
    return true;
  }
  /** Step through the guns (keys, D-pad) */
  function step(dir: number) {
    const i = WEAPON_IDS.indexOf(pick);
    select(WEAPON_IDS[(i + dir + WEAPON_IDS.length) % WEAPON_IDS.length]);
    list.querySelector<HTMLButtonElement>(`[data-gun="${pick}"]`)?.focus({ preventScroll: true });
  }

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const card = t.closest<HTMLElement>('[data-gun]');
    if (card) return select(card.dataset.gun as WeaponId);
    if (t.closest('[data-shop-close]')) return void close();
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    const slot = t.closest<HTMLElement>('[data-slot]')?.dataset.slot;
    if (slot) {
      const i = Number(slot) as 0 | 1;
      choosing = choosing === i ? null : i;
      // (the gun already there is picked, for its details and mods)
      const g = guns()[i];
      if (g) pick = g;
      confirming = false;
      paint();
      return;
    }
    if (act === 'take') return take();
    if (act === 'carry0') return carry(0, pick);
    if (act === 'carry1') return carry(1, pick);
    if (act === 'empty') return carry(1, null);
    if (act === 'unchoose') {
      choosing = null;
      paint();
      return;
    }
    if (act === 'buy') return take();
    if (act === 'confirm') return buy();
    if (act === 'cancel') {
      confirming = false;
      paint();
      return;
    }
    const mod = t.closest<HTMLElement>('[data-mod]')?.dataset.mod as GunModId | undefined;
    if (mod) upgrade(mod);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step(-1);
    // Enter on a gun card takes (or buys) it instead of just picking it
    else if (e.key === 'Enter' && (e.target as HTMLElement).closest('[data-gun]')) take();
    else return;
    e.preventDefault();
  });

  return {
    get open() {
      return open;
    },
    show,
    close,
    step,
    take,
    /** Score or the save changed while it's open (online profile updates, a commit) */
    refresh() {
      if (open) paint();
    },
  };
}

export type GunShop = ReturnType<typeof createGunShop>;
