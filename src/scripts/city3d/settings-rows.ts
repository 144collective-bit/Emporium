/*
 * The Settings tab's rows (docs/settings-plan.md): a sub-tab each (`TABS`), every row a `‹ value ›` picker, a choice or
 * a range; rows marked `act` aren't kept (Sound, which the visitor turns on each visit, and the walk's first person).
 * DOM-free, tested in tests/settings.test.ts. Read by the page's build (CityMap.astro makes the rows) and the tab's
 * chunk (settings-ui.ts), never the boot (settings.ts is the boot's).
 */
import { DEFAULTS as HOLD_DEFAULTS, HOLD_JOBS, cleanHolds, type HoldInput, type HoldJob, type HoldMode } from './comfort';
import { ALPHA_MIN, cleanTouch, DEFAULT_TOUCH } from './touchlayout';
import { cleanSettings, DEFAULTS, type Settings } from './settings';

export type TabId = 'game' | 'graphics' | 'camera' | 'controls' | 'touch' | 'sound';
export const TABS: readonly { id: TabId; label: string; only?: 'touch' }[] = [
  { id: 'game', label: 'Game' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'camera', label: 'Camera' },
  { id: 'controls', label: 'Controls' },
  { id: 'touch', label: 'Touch', only: 'touch' },
  { id: 'sound', label: 'Sound' },
];

export type Value = string | number | boolean;
export interface Row {
  /** The setting (`hold:<job>` for hold or toggle, `touch.<field>` for the touch buttons) */
  id: string;
  tab: TabId;
  label: string;
  /** A heading over it, where a group starts */
  group?: string;
  /** Choices, in order (a choice row), or a range: min, max, step, how it reads (a range row) */
  opts?: readonly { v: Value; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: '%' | '°' | '×';
  /** Shown as a share (the touch buttons' opacity is kept 0.4 to 1, read 40% to 100%) */
  scale?: number;
  /** A short line under it */
  hint?: string;
  /** Only while walking, or only on touch screens */
  only?: 'walk' | 'touch';
  /** Takes a reload */
  reload?: boolean;
  /** Not kept: it acts on the city now (settings-store.ts `actions`) */
  act?: boolean;
}

const ON_OFF = [
  { v: false, label: 'Off' },
  { v: true, label: 'On' },
] as const;
const HOLD_OPTS = [
  { v: 'hold', label: 'Hold' },
  { v: 'toggle', label: 'Toggle' },
] as const;
const HOLD_LABELS: Record<HoldJob, string> = { sprint: 'Sprint', aim: 'Aim', crouch: 'Crouch', block: 'Ring block', guard: 'Guard' };

export const ROWS: readonly Row[] = [
  { id: 'time', tab: 'game', label: 'Time', group: 'The city', opts: [{ v: 'live', label: 'Live' }, { v: 'day', label: 'Day' }, { v: 'sunset', label: 'Sunset' }, { v: 'night', label: 'Night' }] },
  { id: 'sky', tab: 'game', label: 'Sky', opts: [{ v: 'auto', label: 'Auto' }, { v: 'clear', label: 'Clear' }, { v: 'rain', label: 'Rain' }] },
  { id: 'labels', tab: 'game', label: 'Labels', opts: ON_OFF, hint: 'Place names over the city' },

  { id: 'quality', tab: 'graphics', label: 'Quality', opts: [{ v: 'auto', label: 'Auto' }, { v: 'low', label: 'Low' }, { v: 'medium', label: 'Medium' }, { v: 'high', label: 'High' }], reload: true, hint: 'Takes a reload' },
  { id: 'shadows', tab: 'graphics', label: 'Shadows', opts: ON_OFF },
  { id: 'bloom', tab: 'graphics', label: 'Bloom', opts: ON_OFF },
  { id: 'res', tab: 'graphics', label: 'Resolution', min: 50, max: 100, step: 5, unit: '%' },
  { id: 'fps', tab: 'graphics', label: 'Frame rate', opts: [{ v: 'auto', label: 'Auto' }, { v: '60', label: '60' }, { v: '30', label: '30' }], hint: '30 saves battery' },

  { id: 'fov', tab: 'camera', label: 'Field of view', min: 45, max: 80, step: 1, unit: '°' },
  { id: 'shake', tab: 'camera', label: 'Camera shake', opts: ON_OFF },
  { id: 'carView', tab: 'camera', label: 'Vehicle view', opts: [{ v: 'near', label: 'Near' }, { v: 'far', label: 'Far' }, { v: 'first', label: 'First' }] },
  { id: 'fly', tab: 'camera', label: 'Fly speed', opts: [{ v: 'slow', label: 'Slow' }, { v: 'normal', label: 'Normal' }, { v: 'fast', label: 'Fast' }], hint: 'City view' },
  { id: 'sens', tab: 'camera', label: 'Look speed', group: 'Looking', min: 0.3, max: 2.5, step: 0.1, unit: '×' },
  { id: 'invert', tab: 'camera', label: 'Invert look', opts: ON_OFF },
  { id: 'fp', tab: 'camera', label: 'On foot', opts: [{ v: false, label: 'Third' }, { v: true, label: 'First' }], only: 'walk', act: true },

  ...HOLD_JOBS.map((j, i): Row => ({ id: `hold:${j}`, tab: 'controls', label: HOLD_LABELS[j], group: i ? undefined : 'Hold or toggle', opts: HOLD_OPTS })),
  { id: 'autoAds', tab: 'controls', label: 'Aim when firing', group: 'Shooting', opts: [{ v: 'off', label: 'Off' }, { v: 'touch', label: 'Touch' }, { v: 'always', label: 'Always' }], hint: 'Steadier shots' },

  { id: 'touch.size', tab: 'touch', label: 'Size', opts: [{ v: 'small', label: 'Small' }, { v: 'medium', label: 'Medium' }, { v: 'large', label: 'Large' }] },
  { id: 'touch.alpha', tab: 'touch', label: 'Opacity', min: ALPHA_MIN, max: 1, step: 0.05, unit: '%', scale: 100 },
  { id: 'touch.left', tab: 'touch', label: 'Left-handed', opts: ON_OFF },

  { id: 'sound', tab: 'sound', label: 'Sound', opts: ON_OFF, act: true },
  { id: 'volume', tab: 'sound', label: 'Volume', min: 0, max: 100, step: 5, unit: '%' },
];

export const row = (id: string) => ROWS.find((r) => r.id === id);
export const rowsOf = (tab: TabId) => ROWS.filter((r) => r.tab === tab);

/** A kept row's value (hold or toggle: as it works on this input until it's picked) */
export function valueOf(s: Settings, id: string, input: HoldInput): Value {
  if (id.startsWith('hold:')) {
    const job = id.slice(5) as HoldJob;
    return s.holds[job] ?? HOLD_DEFAULTS[job][input];
  }
  if (id.startsWith('touch.')) return s.touch[id.slice(6) as 'size' | 'alpha' | 'left'];
  return s[id as keyof Settings] as Value;
}

/** The change that sets a kept row to `v` */
export function patchFor(s: Settings, id: string, v: Value): Partial<Settings> {
  if (id.startsWith('hold:')) return { holds: cleanHolds({ ...s.holds, [id.slice(5)]: v as HoldMode }) };
  if (id.startsWith('touch.')) return { touch: cleanTouch({ ...s.touch, [id.slice(6)]: v }) };
  return cleanSettings({ ...s, [id]: v })[id as keyof Settings] === v ? { [id]: v } : {};
}

/** Away from its default (a hold or toggle picked to work otherwise than this input's default) */
export function changed(s: Settings, id: string, input: HoldInput): boolean {
  if (id.startsWith('hold:')) {
    const job = id.slice(5) as HoldJob;
    return s.holds[job] !== undefined && s.holds[job] !== HOLD_DEFAULTS[job][input];
  }
  const def = id.startsWith('touch.') ? DEFAULT_TOUCH[id.slice(6) as 'size' | 'alpha' | 'left'] : DEFAULTS[id as keyof Settings];
  const v = valueOf(s, id, input);
  return typeof v === 'number' && typeof def === 'number' ? Math.abs(v - def) > 1e-6 : v !== def;
}

/** Any row on a tab changed (the Touch tab: a button moved by hand counts too) */
export const tabChanged = (s: Settings, tab: TabId, input: HoldInput) =>
  rowsOf(tab).some((r) => !r.act && changed(s, r.id, input)) || (tab === 'touch' && Object.keys(s.touch.arrange).length > 0);

/** What puts a tab back as it was (Touch: the buttons' places too); no tab, everything */
export function resetPatch(tab?: TabId): Partial<Settings> {
  if (!tab) return { ...DEFAULTS, holds: {}, touch: cleanTouch(undefined) };
  const p: Partial<Settings> = {};
  for (const r of rowsOf(tab)) {
    if (r.act) continue;
    if (r.id.startsWith('hold:')) p.holds = {};
    else if (r.id.startsWith('touch.')) p.touch = cleanTouch(undefined);
    else Object.assign(p, { [r.id]: DEFAULTS[r.id as keyof Settings] });
  }
  return p;
}

/** Left (-1) or right (1) from `v`: choices stop at their ends unless `wrap` (a tap on the value), ranges at theirs */
export function stepValue(r: Row, v: Value, dir: 1 | -1, wrap = false): Value {
  if (r.opts) {
    const i = r.opts.findIndex((o) => o.v === v);
    const n = r.opts.length;
    const j = wrap ? (((i < 0 ? 0 : i + dir) % n) + n) % n : Math.min(n - 1, Math.max(0, (i < 0 ? 0 : i) + dir));
    return r.opts[j].v;
  }
  const { min = 0, max = 1, step = 1 } = r;
  const k = Math.round(((typeof v === 'number' ? v : min) - min) / step) + dir;
  const out = Math.min(max, Math.max(min, min + k * step));
  return Number(out.toFixed(4));
}

/** A range row's value at a share (0-1) of its bar, on its step */
export function valueAt(r: Row, share: number): number {
  const { min = 0, max = 1, step = 1 } = r;
  const k = Math.round((Math.min(1, Math.max(0, share)) * (max - min)) / step);
  return Number(Math.min(max, min + k * step).toFixed(4));
}

/** How a value reads */
export function label(r: Row, v: Value): string {
  if (r.opts) return r.opts.find((o) => o.v === v)?.label ?? String(v);
  const n = (v as number) * (r.scale ?? 1);
  const text = r.unit === '×' ? n.toFixed(1) : String(Math.round(n));
  return r.unit ? `${text}${r.unit}` : text;
}

/** A range's share of its bar */
export const share = (r: Row, v: number) => ((v - (r.min ?? 0)) / ((r.max ?? 1) - (r.min ?? 0)) || 0);
