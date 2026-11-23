/*
 * The hub's Map and Profile tabs (docs/header-plan.md), their own chunk, loaded the first time either shows (hub.ts):
 *
 * - Map: the `‹ District ›` picker (pickerkit.ts) starts on the district you're in ("Here": maptab.ts `areaHere()`),
 *   All among its choices; the rows of the district showing; each row's Go labelled the best way there (maptab.ts
 *   `goAct()`) and done through the world map's own actions (hubhooks.ts), its ◎ a waypoint (X on a gamepad, the
 *   hub's `mk-alt`). The rows' names are the page's `[data-dir-spot]` (a click opens the place, as before).
 * - Profile: the rifle finish as a `‹ Field Olive ›` picker over combat.ts's own finish buttons (`[data-skin]`, kept
 *   out of sight): stepping onto an unlocked finish wears it; a locked one reads its points to go and isn't worn.
 */
import { AREA_CHOICES, areaHere, areaLabel, goAct, GO_LABEL, type AreaId, type GoAct } from './maptab';
import { hubHooks } from './hubhooks';
import { PLACES } from './places';
import { bindPicker, paintChoice } from './pickerkit';

const at = (spot: string) => PLACES.find((p) => p.spot === spot)?.at;

export function createHubTabs(root: HTMLElement, hub: HTMLElement) {
  const map = createMapTab(hub);
  const profile = createProfileTab(root);
  return {
    shown(tab: 'map' | 'profile') {
      if (tab === 'map') map.shown();
      else profile.paint();
    },
  };
}

function createMapTab(hub: HTMLElement) {
  const box = hub.querySelector<HTMLElement>('[data-map-tab]');
  if (!box) return { shown() {} };
  const picker = box.querySelector<HTMLElement>('[data-pick="area"]')!;
  const sections = [...box.querySelectorAll<HTMLElement>('[data-map-area]')];
  const gos = [...box.querySelectorAll<HTMLButtonElement>('[data-map-go]')];
  /** The district picked (null: where you are) */
  let picked: AreaId | 'all' | null = null;

  const here = () => {
    const h = hubHooks.map?.here();
    return h ? areaHere(h.x, h.z, at) : null;
  };
  const current = () => picked ?? here() ?? AREA_CHOICES[0];

  function paint() {
    const cur = current();
    const h = here();
    paintChoice(picker, `${areaLabel(cur)}${cur === h ? ' · Here' : ''}`, AREA_CHOICES.indexOf(cur), AREA_CHOICES.length);
    box!.toggleAttribute('data-all', cur === 'all');
    for (const s of sections) s.hidden = cur !== 'all' && s.dataset.mapArea !== cur;
    // Go: the best way there from where you are
    const m = hubHooks.map;
    const state = m?.state() ?? 'city';
    const been = m?.visited() ?? [];
    for (const b of gos) {
      const id = b.dataset.mapGo!;
      const act = goAct(state, been.includes(id));
      const label = GO_LABEL[act];
      if (b.textContent !== label) b.textContent = label;
      b.dataset.act = act;
      const name = b.closest('[data-map-row]')?.querySelector('.set-label')?.textContent ?? id;
      b.setAttribute('aria-label', `${label}: ${name}`);
    }
  }

  bindPicker(picker, {
    choice: () => true,
    step(dir, wrap) {
      const i = AREA_CHOICES.indexOf(current());
      const n = AREA_CHOICES.length;
      const j = wrap ? (i + dir + n) % n : Math.min(n - 1, Math.max(0, i + dir));
      picked = AREA_CHOICES[j];
      paint();
    },
  });

  box.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const go = t.closest<HTMLButtonElement>('[data-map-go]');
    if (go) return void hubHooks.map?.go(go.dataset.mapGo!, (go.dataset.act as GoAct) ?? 'route');
    const pin = t.closest<HTMLButtonElement>('[data-map-pin]');
    if (pin) hubHooks.map?.pin(pin.dataset.mapPin!);
  });
  // X on a gamepad (hub.ts): the focused row's waypoint
  box.addEventListener('mk-alt', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-map-row]');
    if (row) hubHooks.map?.pin(row.dataset.mapRow!);
  });

  return {
    /** The tab showing (again): the picker back on where you are, the Go buttons for how you're getting about */
    shown() {
      picked = null;
      paint();
    },
  };
}

function createProfileTab(root: HTMLElement) {
  const picker = root.querySelector<HTMLElement>('[data-pick="finish"]');
  const skins = root.querySelector<HTMLElement>('[data-skins]');
  if (!picker || !skins) return { paint() {} };
  const btns = () => [...skins.querySelectorAll<HTMLButtonElement>('[data-skin]')];
  /** A finish's name (the button's own text, less its note) and its note (Equipped, Unlocked or the points to go) */
  const nameOf = (b: HTMLButtonElement) => [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  const noteOf = (b: HTMLButtonElement) => b.querySelector('small')?.textContent?.trim() ?? '';
  const hint = picker.closest('[data-set-row]')?.querySelector<HTMLElement>('[data-finish-note]') ?? null;
  /** The finish looked at (null: the one worn) */
  let looking: number | null = null;
  const worn = () => Math.max(0, btns().findIndex((b) => b.getAttribute('aria-pressed') === 'true'));

  function paint() {
    const list = btns();
    const i = looking ?? worn();
    const b = list[i];
    if (!b) return;
    const locked = b.disabled;
    paintChoice(picker!, nameOf(b), i, list.length);
    picker!.dataset.locked = String(locked);
    if (hint) hint.textContent = locked ? `Locked · ${noteOf(b)}` : noteOf(b);
  }

  bindPicker(picker, {
    choice: () => true,
    step(dir, wrap) {
      const list = btns();
      const n = list.length;
      const i = looking ?? worn();
      const j = wrap ? (i + dir + n) % n : Math.min(n - 1, Math.max(0, i + dir));
      looking = j;
      // An unlocked finish is worn at once (combat.ts's own button); a locked one is only looked at
      if (!list[j].disabled) {
        list[j].click();
        looking = null;
      }
      paint();
    },
  });
  // combat.ts repaints its buttons (a finish worn, one unlocked): so does the picker
  new MutationObserver(() => paint()).observe(skins, { subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'disabled'], childList: true, characterData: true });
  paint();
  return {
    paint() {
      looking = null;
      paint();
    },
  };
}
