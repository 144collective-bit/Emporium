/*
 * The character screen (character rebuild Phase 4), from the Profile tab:
 * your Degen full size on the podium (stage.ts). Drag turns him, the wheel
 * or a pinch (or Full / Face) zooms from all of him to his face, the poses
 * play an idle, a walk on the spot, the fighter's guard and the emotes, and
 * three lights show the clothes off (studio, daylight, night). Beside him,
 * what he's wearing, and the way to Drop 001's fitting room to change it.
 *
 * It's an overlay on the city: × or Esc closes it (Esc only closes it, it
 * never stops walking), and nothing else hears the keys while it's open.
 */
import { MARKS, MARK_SLOTS, PATTERNS, type Look, type MarkId } from '../net/profile-data';
import { createStage, type Stage, type StageLight, type StagePose } from './stage';

const POSES: { id: StagePose; name: string }[] = [
  { id: 'idle', name: 'Idle' },
  { id: 'walk', name: 'Walk' },
  { id: 'guard', name: 'Guard' },
  { id: 'wave', name: 'Wave' },
  { id: 'cheer', name: 'Cheer' },
  { id: 'dance', name: 'Dance' },
  { id: 'salute', name: 'Salute' },
];
const LIGHTS: { id: StageLight; name: string }[] = [
  { id: 'studio', name: 'Studio' },
  { id: 'day', name: 'Day' },
  { id: 'night', name: 'Night' },
];

const FITS: Record<Look['kind'], string> = { suit: 'Classic Suit', hoodie: 'Drop Hoodie', track: 'Track Suit', varsity: 'Varsity Jacket', puffer: 'Puffer Jacket' };
const HATS: Record<NonNullable<Look['hat']>, string> = { cap: 'Diamond Cap', backcap: 'Backwards Cap', beanie: 'Street Beanie', bucket: 'Bucket Hat', crown: 'Gold Crown', cowboy: 'Cowboy Hat', tophat: 'Top Hat', halo: 'Neon Halo' };
const BAGS: Record<NonNullable<Look['bag']>, string> = { backpack: 'Backpack', crossbody: 'Crossbody', board: 'Skate Deck', duffel: 'Duffel Bag', wings: 'Neon Wings' };
const HELD: Record<NonNullable<Look['held']>, string> = { gummy: 'Gummy Bag', coffee: 'Iced Coffee', boombox: 'Boombox', phone: 'Phone', briefcase: 'Briefcase' };
const markName = (id: MarkId) => MARKS.find((m) => m.id === id)?.name ?? id;

/** What he's wearing, a row a part: [label, what, colours] */
export function describe(l: Look): [string, string, string[]][] {
  const hood = l.kind === 'hoodie' && l.hood;
  const patched = !hood && (l.hat === 'cap' || l.hat === 'backcap' || l.hat === 'beanie');
  const extras = [l.headphones && 'Headphones', l.chain && 'Shades Chain', l.necklace && 'Diamond Chain', l.watch && 'Gold Watch'].filter(Boolean) as string[];
  const rows: [string, string, string[]][] = [
    ['Fit', FITS[l.kind], l.kind === 'suit' ? [l.top, l.bottom, l.tie] : [l.top, l.bottom]],
    ['Head', hood ? 'Hood up' : l.hat ? HATS[l.hat] + (patched ? ` · ${markName(l.hatMark)} patch` : '') : 'Nothing', !hood && l.hat && l.hat !== 'crown' && l.hat !== 'halo' ? [l.hatColor] : []],
    ['Shades', 'Lenses', [l.lens]],
    ['Bag', l.bag ? BAGS[l.bag] : 'None', l.bag ? [l.bagColor] : []],
    ['Hand', l.held ? HELD[l.held] : 'Empty', []],
    ['Extras', extras.length ? extras.join(', ') : 'None', l.headphones ? [l.headphones] : []],
    ['Kicks', l.kind === 'suit' ? 'Dress shoes' : `Sneakers${l.shoeMark ? ` · ${markName(l.shoeMark)}` : ''}`, [l.shoes]],
  ];
  const where = MARK_SLOTS.find((m) => m.id === l.markAt)?.name ?? '';
  rows.push(['Merch', l.mark ? `${markName(l.mark)} · ${l.kind === 'suit' && l.markAt === 'centre' ? 'Pin' : where}` : 'No mark', l.mark || l.shoeMark || patched ? [l.ink] : []]);
  if (l.pattern !== 'plain') rows.push(['Print', PATTERNS.find((p) => p.id === l.pattern)!.name, []]);
  return rows;
}

export interface CharDeps {
  root: HTMLElement;
  look(): Look;
  onChange(fn: (l: Look) => void): void;
  /** Change the look: Drop 001's fitting room */
  openFitting(): void;
  reduced: boolean;
  low: boolean;
}

export function createCharScreen(d: CharDeps) {
  const el = d.root.querySelector<HTMLElement>('[data-char]');
  if (!el) return { open() {}, close() {}, get isOpen() { return false; } };
  const canvas = el.querySelector<HTMLCanvasElement>('[data-char-canvas]')!;
  const list = el.querySelector<HTMLElement>('[data-char-list]')!;
  let stage: Stage | null = null;
  let pose: StagePose = 'idle';
  let light: StageLight = 'studio';
  let back: HTMLElement | null = null;
  let zoomTick = 0;

  const chips = (box: string, attr: string, opts: { id: string; name: string }[]) => {
    const host = el.querySelector<HTMLElement>(box)!;
    host.innerHTML = opts.map((o) => `<button type="button" class="fit-chip" ${attr}="${o.id}" aria-pressed="false">${o.name}</button>`).join('');
  };
  chips('[data-char-poses]', 'data-char-pose', POSES);
  chips('[data-char-lights]', 'data-char-light', LIGHTS);
  const press = (attr: string, value: string) => {
    for (const b of el.querySelectorAll<HTMLButtonElement>(`[${attr}]`)) b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value));
  };

  function paintList(l: Look) {
    list.replaceChildren();
    for (const [label, what, colors] of describe(l)) {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = what;
      for (const c of colors) {
        const sw = document.createElement('i');
        sw.className = 'char-sw';
        sw.style.setProperty('--c', c);
        dd.append(sw);
      }
      list.append(dt, dd);
    }
  }

  // Full / Face follow the zoom (a pinch or the wheel moves it too)
  function paintView() {
    if (!stage) return;
    press('data-char-view', stage.zoom > 0.5 ? '1' : '0');
  }

  function onKey(e: KeyboardEvent) {
    if (el!.hidden) return;
    // Nothing behind the screen hears the keys (walking, the gun), and Esc only closes it
    e.stopImmediatePropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function open() {
    if (!el!.hidden) return;
    back = document.activeElement as HTMLElement | null;
    // The mouse back from the walk camera, so the screen can be used
    if (document.pointerLockElement) document.exitPointerLock();
    el!.hidden = false;
    stage ??= createStage({ reduced: d.reduced, low: d.low }, { zoom: true });
    stage.attach(el!.querySelector<HTMLCanvasElement>('[data-char-canvas]') ?? canvas, d.look());
    stage.setPose(pose);
    stage.setLight(light);
    press('data-char-pose', pose);
    press('data-char-light', light);
    paintList(d.look());
    paintView();
    zoomTick = window.setInterval(paintView, 250);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    el!.querySelector<HTMLButtonElement>('[data-char-close]')?.focus({ preventScroll: true });
  }
  function close() {
    if (el!.hidden) return;
    el!.hidden = true;
    stage?.detach();
    clearInterval(zoomTick);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('keyup', onKey, true);
    back?.focus?.({ preventScroll: true });
  }

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-char-close]')) return close();
    if (t.closest('[data-char-fit]')) {
      close();
      return d.openFitting();
    }
    const p = t.closest<HTMLButtonElement>('[data-char-pose]');
    if (p) {
      pose = p.dataset.charPose as StagePose;
      stage?.setPose(pose);
      return press('data-char-pose', pose);
    }
    const li = t.closest<HTMLButtonElement>('[data-char-light]');
    if (li) {
      light = li.dataset.charLight as StageLight;
      stage?.setLight(light);
      return press('data-char-light', light);
    }
    const v = t.closest<HTMLButtonElement>('[data-char-view]');
    if (v) {
      stage?.setView(+v.dataset.charView!);
      press('data-char-view', v.dataset.charView!);
    }
  });
  d.onChange((l) => {
    if (el.hidden) return;
    stage?.dress(l);
    paintList(l);
  });

  return {
    open,
    close,
    get isOpen() {
      return !el.hidden;
    },
  };
}

export type CharScreen = ReturnType<typeof createCharScreen>;
