/*
 * The settings (docs/settings-plan.md): one record for the hub's Settings tab, `degen-city-settings-v1`. DOM-free,
 * tested in tests/settings.test.ts; settings-store.ts keeps it in the browser, settings-ui.ts draws the rows.
 *
 * - `cleanSettings()` reads a stored record (anything missing or wrong takes its default), and on the first load the
 *   settings that lived elsewhere: Labels (`degen-city-labels-v1`) and the walk's look speed, invert, aim when
 *   firing, touch buttons and hold or toggle (`degen-city-walk-v1`).
 * - The Settings tab's rows and their pickers are settings-rows.ts's (the tab's chunk and the page's build: the boot
 *   carries only this).
 * - What the game reads off it: `fovShift()`, `flyScale()`, `fpsCap()`, `pixelScale()`.
 */
import { cleanHolds, type Holds } from './comfort';
import { cleanTouch, DEFAULT_TOUCH, type TouchPrefs } from './touchlayout';
import type { Tier } from './gputier';
import type { TimeMode, WeatherMode } from './sky';
import type { ViewId } from './views';

export const SETTINGS_KEY = 'degen-city-settings-v1';
/** Where Labels and the walk's settings lived before (read once, on the first load) */
export const LABELS_KEY = 'degen-city-labels-v1';
export const WALK_KEY = 'degen-city-walk-v1';

export type Quality = 'auto' | Tier;
export type FpsCap = 'auto' | '60' | '30';
export type FlySpeed = 'slow' | 'normal' | 'fast';
/** Aim when firing: never, only with the on-screen Fire button, or with any fire */
export type AutoAds = 'off' | 'touch' | 'always';

export interface Settings {
  /* Game */
  time: TimeMode;
  sky: WeatherMode;
  labels: boolean;
  /* Graphics */
  quality: Quality;
  shadows: boolean;
  bloom: boolean;
  /** The share of the tier's pixels drawn, 50 to 100 */
  res: number;
  fps: FpsCap;
  /* Camera */
  /** On foot's field of view (degrees); every other view moves with it (`fovShift()`) */
  fov: number;
  shake: boolean;
  /** The view the car, the bike, the boat and the aircraft start in */
  carView: ViewId;
  fly: FlySpeed;
  /** Look speed (mouse, stick and touch) */
  sens: number;
  invert: boolean;
  /* Controls */
  autoAds: AutoAds;
  holds: Holds;
  /* Touch */
  touch: TouchPrefs;
  /* Sound */
  /** 0 to 100 */
  volume: number;
}

export const FOV_BASE = 52;

export const DEFAULTS: Readonly<Settings> = {
  time: 'day',
  sky: 'clear',
  labels: false,
  quality: 'auto',
  shadows: true,
  bloom: true,
  res: 100,
  fps: 'auto',
  fov: FOV_BASE,
  shake: true,
  carView: 'near',
  fly: 'normal',
  sens: 1,
  invert: false,
  autoAds: 'off',
  holds: {},
  touch: DEFAULT_TOUCH,
  volume: 100,
};

const TIMES: TimeMode[] = ['live', 'day', 'sunset', 'night'];
const SKIES: WeatherMode[] = ['auto', 'clear', 'rain'];
const QUALITIES: Quality[] = ['auto', 'low', 'medium', 'high'];
const FPS: FpsCap[] = ['auto', '60', '30'];
const VIEWS: ViewId[] = ['near', 'far', 'first'];
const FLY: FlySpeed[] = ['slow', 'normal', 'fast'];
const ADS: AutoAds[] = ['off', 'touch', 'always'];

/* ---------- The record ---------- */

const pick = <T extends string | number | boolean>(v: unknown, list: readonly T[], def: T): T => (list.includes(v as T) ? (v as T) : def);
const num = (v: unknown, min: number, max: number, def: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def);
const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/**
 * A stored record made good. `legacy` is what lived elsewhere before it (read only where the record has nothing of
 * its own): Labels' 'on' / 'off' and the walk's record.
 */
export function cleanSettings(raw: unknown, legacy: { labels?: unknown; walk?: unknown } = {}): Settings {
  const o = obj(raw);
  const w = obj(legacy.walk);
  const has = (k: keyof Settings) => k in o;
  const from = (k: keyof Settings) => (has(k) ? o[k] : w[k]);
  return {
    time: pick(o.time, TIMES, DEFAULTS.time),
    sky: pick(o.sky, SKIES, DEFAULTS.sky),
    labels: has('labels') ? bool(o.labels, DEFAULTS.labels) : legacy.labels === 'on',
    quality: pick(o.quality, QUALITIES, DEFAULTS.quality),
    shadows: bool(o.shadows, DEFAULTS.shadows),
    bloom: bool(o.bloom, DEFAULTS.bloom),
    res: Math.round(num(o.res, 50, 100, DEFAULTS.res) / 5) * 5,
    fps: pick(o.fps, FPS, DEFAULTS.fps),
    fov: Math.round(num(o.fov, 45, 80, DEFAULTS.fov)),
    shake: bool(o.shake, DEFAULTS.shake),
    carView: pick(o.carView, VIEWS, DEFAULTS.carView),
    fly: pick(o.fly, FLY, DEFAULTS.fly),
    sens: Number(num(from('sens'), 0.3, 2.5, DEFAULTS.sens).toFixed(2)),
    invert: bool(from('invert'), DEFAULTS.invert),
    autoAds: pick(from('autoAds'), ADS, DEFAULTS.autoAds),
    holds: cleanHolds(from('holds')),
    touch: cleanTouch(from('touch')),
    volume: Math.round(num(o.volume, 0, 100, DEFAULTS.volume)),
  };
}

/* ---------- What the game reads ---------- */

/** Degrees every view's field of view moves by */
export const fovShift = (s: Pick<Settings, 'fov'>) => s.fov - FOV_BASE;
/** City view's free camera's speed */
export const flyScale = (s: Pick<Settings, 'fly'>) => (s.fly === 'slow' ? 0.5 : s.fly === 'fast' ? 2 : 1);
/** Frames a second at most (0: as the screen and the tier have it) */
export const fpsCap = (s: Pick<Settings, 'fps'>) => (s.fps === '30' ? 30 : s.fps === '60' ? 60 : 0);
/** The share of the tier's pixel ratio drawn */
export const pixelScale = (s: Pick<Settings, 'res'>) => s.res / 100;
/**
 * The pixel ratio drawn: the screen's up to the tier's, scaled (never under a half); the step-down takes a half off
 * that, but no lower than 1 unless the scale already was
 */
export function pixelRatio(screen: number, tierMax: number, s: Pick<Settings, 'res'>, lowered: boolean) {
  const full = Math.max(0.5, Math.min(screen, tierMax) * pixelScale(s));
  return lowered ? Math.max(Math.min(1, full), full - 0.5) : full;
}
/** The sound's master level at full volume, scaled */
export const MASTER = 0.55;
export const masterGain = (s: Pick<Settings, 'volume'>) => MASTER * (s.volume / 100);
