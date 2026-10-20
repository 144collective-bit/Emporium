/*
 * The Armoury's store and workbench, at the gun store counter: browse the
 * guns, compare them, take one (full of ammo), buy the ones for sale, and
 * upgrade a gun you own at the workbench (the barrel, an extended mag, the
 * grip & stock, three levels each).
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
import { D, LV, esc, fmt, repaint, whyNot, type GameDeps } from './ui';

/** Small side-on silhouettes for the cards (SVG paths, 120 x 40) */
const ART: Record<WeaponId, string> = {
  rifle:
    'M6 18h18v-3h4v-3h22v3h44v4h20v5H90v4H62l-4 2-2 9h-8l1-10h-8l-6 6h-6v-6H24v3H6z M44 10h12v-4h-12z',
  smg: 'M20 16h12v-4h16v4h30v3h12v5H80v3H62v12h-7V27h-6l-3 10h-7l2-11h-6v4h-8v-4H20z M48 9h10v-3H48z',
  shotgun: 'M4 20h14l10-6h20v3h66v4H48v4h36v4H48l-6 3-2 7h-8l1-9H26l-8 4H4z M50 13h3v-2h-3z',
  dmr: 'M2 18h20l4-4h28v-5h30v5h6v5h28v4H84v4H64l-4 2-2 9h-8l1-10h-6l-5 6h-6v-6H22l-4 3H2z M58 7h22v-4H58z',
  // The Hand Cannon: frame and long barrel, the cylinder, the hammer, the lug under the barrel, the front blade
  revolver: 'M26 12h78v7H52v3h-6l-5 3-2 10h-9l2-11-5-4-1-8z M34 10h12v12H34z M22 8h5v6h-5z M52 19h30v3H52z M100 9h3v3h-3z',
  // The Tri-Tap: a bullpup body with the magazine behind the grip, a short barrel, the carry handle and its sight
  burst: 'M8 15h64v2h26v-1h8v6h-8v-1H72v2H56l-2 11h-8l1-11h-9v10h-9V23H8z M26 9h32v3h-4v3H30v-3h-4z M38 4h8v5h-8z',
  // The Belt Feeder: stock, long receiver under its cover, finned barrel, the belt box under it, the bipod folded back
  lmg: 'M2 15h20v-3h48v3h34v-1h8v6h-8v-1H70v3H48l-3 11h-8l2-11h-9l-4 4h-4l-8 4H6l-4-3z M24 9h42v3H24z M50 22h20v10H50z M78 19h28l-2 3H80z M80 13h3v8h-3z M88 13h3v8h-3z M96 13h3v8h-3z',
};

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
  let open = false;
  let pick: WeaponId = 'rifle';
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
      /** Yours to take at the counter */
      ready: owned && unlocked,
      carrying: d.geared() && d.weapon() === id,
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
      const state = s.carrying
        ? 'Carrying'
        : s.premium
          ? s.owned
            ? 'Yours'
            : `<span class="shop-sale-word">For sale · </span>${D(s.c.price)}`
          : s.unlocked
            ? 'Ready'
            : `${pts(w.need)} pts`;
      const tag = s.premium && !s.owned ? LV(s.c.level) : '';
      return `<button type="button" class="shop-card${locked ? ' is-locked' : ''}${s.premium && !s.owned ? ' is-sale' : ''}" data-gun="${id}" role="option" aria-selected="${id === pick}">` + `<svg viewBox="0 0 120 40" aria-hidden="true"><path d="${ART[id]}"/></svg><b>${esc(w.name)}</b><small>${state}</small>${tag}</button>`;
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
    if (s.ready) {
      action = `<button type="button" class="shop-take" data-act="take">${s.carrying ? 'Refill ammo' : 'Take it &amp; gear up'}</button>`;
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

  function paint() {
    const save = d.game.save();
    dorras.innerHTML = D(save.dorras);
    score.textContent = pts(d.lifetime());
    paintList();
    paintDetail();
    paintBench();
  }

  function select(id: WeaponId) {
    if (id !== pick) confirming = false;
    pick = id;
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
      d.game.toast(`The ${WEAPONS[pick].name} is yours. Take it at the counter.`);
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
  /** The picked gun's main action: take it, or start (and then confirm) buying it */
  function take() {
    const s = stateOf(pick);
    if (s.ready) {
      if (!d.equip(pick)) return;
      close();
    } else if (s.premium) {
      if (confirming) buy();
      else {
        confirming = true;
        paint();
        detail.querySelector<HTMLButtonElement>('[data-act="confirm"]')?.focus({ preventScroll: true });
      }
    }
  }
  function show() {
    if (open) return;
    open = true;
    pick = d.weapon();
    confirming = false;
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
    if (act === 'take') return take();
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
