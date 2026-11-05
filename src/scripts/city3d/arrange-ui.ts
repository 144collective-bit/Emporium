/*
 * Arranging the touch buttons (docs/controls-plan.md Phase 6): a screen over the city with every button of a
 * family (on foot, at the wheel, in the ring) where it stands, each dragged where the player likes. A drag is
 * held clear of the other buttons, the stick, the screen's edges, the header's room and (on foot) the hotbar and
 * the door prompt: `moveItem()` in touchlayout.ts says where it may go, and a button that can't go where the
 * finger is slides along whichever way it can. Done keeps it for this screen held this way (upright or on its
 * side), Reset puts the family back in its slots, Cancel (or ×, or Esc) leaves it as it was. Its own chunk,
 * loaded the first time Settings > Touch buttons > Arrange buttons opens it.
 */
import { BUTTONS } from './controls';
import {
  arrangeKey,
  arrangementOf,
  centreOf,
  FAMILIES,
  itemsOf,
  LAYOUTS,
  layoutFor,
  moveItem,
  shapeOf,
  SHOWN,
  hotbarBox,
  promptBox,
  type Arrangement,
  type Family,
  type Item,
  type Layout,
  type Spot,
  type TouchPrefs,
} from './touchlayout';

const NAMES: Record<Family, string> = { foot: 'On foot', wheel: 'Vehicles', ring: 'The ring' };
const NOTES: Record<Family, string> = {
  foot: 'With empty hands, Punch, Block and Kick take Fire’s, Reload’s and Aim’s places.',
  wheel: 'Driving, riding, boating and flying. In a kart race Drift takes View’s place.',
  ring: 'The Fight Club’s ring.',
};

export interface ArrangeDeps {
  root: HTMLElement;
  prefs: () => TouchPrefs;
  save: (arrange: Arrangement) => void;
}

export function openArrange(d: ArrangeDeps) {
  const { root } = d;
  root.querySelector('[data-arrange]')?.remove();
  const el = document.createElement('div');
  el.className = 'tc-arr';
  el.dataset.arrange = '';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Arrange the touch buttons');
  el.innerHTML = `
    <div class="tc-arr-field" data-arr-field></div>
    <div class="tc-arr-bar">
      <div class="tc-arr-tabs" role="tablist" aria-label="Which buttons">
        ${FAMILIES.map((f) => `<button type="button" role="tab" data-arr-tab="${f}">${NAMES[f]}</button>`).join('')}
      </div>
      <div class="tc-arr-acts">
        <button type="button" data-arr-reset>Reset</button>
        <button type="button" class="is-go" data-arr-done>Done</button>
        <button type="button" class="tc-arr-x" data-arr-cancel aria-label="Cancel">×</button>
      </div>
      <p class="tc-arr-note" data-arr-note></p>
    </div>`;
  root.append(el);
  // (the hub it was opened from waits hidden under it, with the real buttons, controls.css)
  root.classList.add('is-arranging');
  const field = el.querySelector<HTMLElement>('[data-arr-field]')!;
  const note = el.querySelector<HTMLElement>('[data-arr-note]')!;
  const tabs = [...el.querySelectorAll<HTMLButtonElement>('[data-arr-tab]')];

  const start = d.prefs();
  // What's been changed so far, family by family: a layout to keep, or null to put back in the slots
  const work = new Map<Family, Layout | null>();
  let fam: Family = 'foot';
  let W = 0;
  let H = 0;

  const size = () => {
    W = field.clientWidth;
    H = field.clientHeight;
  };
  const shown = (f: Family): Layout => {
    const w = work.get(f);
    if (w) return w;
    const key = arrangeKey(f, shapeOf(W, H));
    const arrange = { ...start.arrange };
    if (work.has(f)) delete arrange[key];
    return layoutFor(W, H, SHOWN[f], { ...start, arrange });
  };
  const spotOf = (L: Layout, f: Family, item: Item): Spot | undefined =>
    item === 'stick' ? L.stick : L.buttons[item === 'crouch' ? 'crouch' : LAYOUTS[SHOWN[f]][item]!];

  const place = (g: HTMLElement, s: Spot) => {
    const [cx, cy] = centreOf(s, W, H);
    g.style.setProperty('--tc-d', `${s.d}px`);
    g.style.left = `${cx - s.d / 2}px`;
    g.style.top = `${cy - s.d / 2}px`;
  };
  const box = (cls: string, b: { x0: number; y0: number; x1: number; y1: number }, text: string) => {
    const k = document.createElement('div');
    k.className = `tc-arr-keep ${cls}`;
    k.textContent = text;
    Object.assign(k.style, { left: `${b.x0}px`, top: `${b.y0}px`, width: `${b.x1 - b.x0}px`, height: `${b.y1 - b.y0}px` });
    field.append(k);
  };

  const draw = () => {
    size();
    field.textContent = '';
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.arrTab === fam)));
    const mode = SHOWN[fam];
    note.textContent = `${NOTES[fam]} Kept for your screen held ${shapeOf(W, H) === 'side' ? 'on its side' : 'upright'}.`;
    const L = shown(fam);
    if (fam === 'foot') {
      box('is-hotbar', hotbarBox(L, W, H), 'Hotbar');
      box('is-prompt', promptBox(L, H), 'Door prompt');
    }
    for (const item of itemsOf(fam)) {
      const s = spotOf(L, fam, item);
      if (!s) continue;
      const g = document.createElement('button');
      g.type = 'button';
      g.dataset.arrItem = item;
      if (item === 'stick') {
        g.className = 'tc-arr-stick';
        g.innerHTML = `<span></span><b>${fam === 'foot' ? 'Move' : fam === 'wheel' ? 'Steer' : 'Move'}</b>`;
        g.setAttribute('aria-label', 'The stick');
      } else {
        const action = item === 'crouch' ? 'crouch' : LAYOUTS[mode][item]!;
        const real = root.querySelector<HTMLElement>(BUTTONS[action]);
        g.className = 'tc';
        if (real?.classList.contains('tc-main')) g.classList.add('tc-main');
        if (real?.classList.contains('tc-go')) g.classList.add('tc-go');
        g.innerHTML = (real?.innerHTML ?? action).replace(/ (data-[\w-]+|hidden)(="[^"]*")?/g, '');
        g.setAttribute('aria-label', real?.getAttribute('aria-label') ?? real?.textContent?.trim() ?? action);
      }
      place(g, s);
      drag(g, item);
      field.append(g);
    }
  };

  // Dragging: the button follows the finger wherever it fits, sliding along a side it can't pass
  function drag(g: HTMLElement, item: Item) {
    let grab: [number, number] | null = null;
    g.addEventListener('pointerdown', (e) => {
      const L = shown(fam);
      const s = spotOf(L, fam, item)!;
      const [cx, cy] = centreOf(s, W, H);
      const r = field.getBoundingClientRect();
      grab = [e.clientX - r.left - cx, e.clientY - r.top - cy];
      g.setPointerCapture(e.pointerId);
      g.classList.add('is-dragging');
      e.preventDefault();
    });
    g.addEventListener('pointermove', (e) => {
      if (!grab) return;
      const r = field.getBoundingClientRect();
      const L = shown(fam);
      const s = spotOf(L, fam, item)!;
      const [ox, oy] = centreOf(s, W, H);
      const x = e.clientX - r.left - grab[0];
      const y = e.clientY - r.top - grab[1];
      const next = moveItem(L, SHOWN[fam], item, x, y, W, H) ?? moveItem(L, SHOWN[fam], item, x, oy, W, H) ?? moveItem(L, SHOWN[fam], item, ox, y, W, H);
      // (lit while it can't keep up with the finger)
      const got = next && centreOf(spotOf(next, fam, item)!, W, H);
      g.classList.toggle('is-blocked', !got || Math.hypot(got[0] - x, got[1] - y) > 2);
      if (!next) return;
      work.set(fam, next);
      place(g, spotOf(next, fam, item)!);
    });
    const end = () => {
      grab = null;
      g.classList.remove('is-dragging', 'is-blocked');
    };
    g.addEventListener('pointerup', end);
    g.addEventListener('pointercancel', end);
  }

  const close = () => {
    removeEventListener('resize', onResize);
    removeEventListener('keydown', onKey, true);
    el.remove();
    root.classList.remove('is-arranging');
  };
  const done = () => {
    const key = (f: Family) => arrangeKey(f, shapeOf(W, H));
    const arrange: Arrangement = { ...start.arrange };
    for (const [f, L] of work) {
      // (only what's moved off its slot: the rest keeps to the slots on any screen of this shape)
      const slots = arrangementOf(layoutFor(W, H, SHOWN[f], { ...start, arrange: {} }), f, W, H, start.left);
      const moved = Object.fromEntries(
        Object.entries(L ? arrangementOf(L, f, W, H, start.left) : {}).filter(([item, p]) => {
          const was = slots[item as Item];
          return !was || Math.hypot((p[0] - was[0]) * W, (p[1] - was[1]) * H) > 1;
        }),
      );
      if (Object.keys(moved).length) arrange[key(f)] = moved;
      else delete arrange[key(f)];
    }
    d.save(arrange);
    close();
  };
  // A turn or a resize starts again from what's kept (the shapes are kept apart)
  const onResize = () => {
    work.clear();
    draw();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    close();
  };
  tabs.forEach((t) =>
    t.addEventListener('click', () => {
      fam = t.dataset.arrTab as Family;
      draw();
    }),
  );
  el.querySelector('[data-arr-reset]')!.addEventListener('click', () => {
    work.set(fam, null);
    draw();
  });
  el.querySelector('[data-arr-done]')!.addEventListener('click', done);
  el.querySelector('[data-arr-cancel]')!.addEventListener('click', close);
  addEventListener('resize', onResize);
  addEventListener('keydown', onKey, true);
  draw();
}
