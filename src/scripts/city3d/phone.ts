/*
 * Phones, sharper and smoother (DOM-free, tested in tests/phone.test.ts; the owner's call: "better quality and higher
 * fps"). Every touch screen is the low tier (index.ts `pickTier()`); this splits it in two by what the phone can do:
 *
 * - `phoneClass()`: strong phones (recent iPhones and iPads, Android flagships by their GPU) and the rest;
 * - `PHONES`: what each draws (its range of pixel ratios, people and cars, how far the detail reaches, bloom);
 * - `createResolution()`: dynamic resolution, the pixel ratio stepped up while frames keep 60fps and down when the GPU
 *   can't, a level that failed tried again only after a wait that doubles each time it fails;
 * - `sharpness()`: how hard the final pass sharpens (post.ts `lite`), more the further the picture is stretched.
 */

export type PhoneClass = 'strong' | 'weak';

/** What a phone tells about itself (index.ts reads it from the browser and the WebGL context) */
export interface PhoneInfo {
  ua: string;
  /** `navigator.maxTouchPoints` (an iPad says it's a Mac, but has a touch screen) */
  touch: number;
  /** `navigator.deviceMemory` in GB (Chrome only, rounded down to a power of two, at most 8) */
  memory?: number;
  /** `navigator.hardwareConcurrency` */
  cores?: number;
  /** The GPU's name (WEBGL_debug_renderer_info: Android's Chrome gives it; Safari says "Apple GPU") */
  gpu?: string;
}

/** The iOS version an iPhone's or iPad's browser reports (the larger of the OS's and Safari's: Safari 26 froze the OS's at 18) */
function iosVersion(ua: string): number {
  const os = /OS (\d+)_\d/.exec(ua);
  const safari = /Version\/(\d+)/.exec(ua);
  return Math.max(os ? +os[1] : 0, safari ? +safari[1] : 0);
}

/** A strong Android GPU by its name: Adreno 640-699 and 730 on, Mali-G77, G78 and G710 on, every Immortalis and Xclipse */
function strongGpu(gpu: string): boolean | null {
  if (/Immortalis|Xclipse/i.test(gpu)) return true;
  const adreno = /Adreno[^\d]*(\d{3})/i.exec(gpu);
  if (adreno) {
    const n = +adreno[1];
    return (n >= 640 && n < 700) || n >= 730;
  }
  const mali = /Mali-G(\d+)/i.exec(gpu);
  if (mali) {
    const n = +mali[1];
    return n === 77 || n === 78 || (n >= 710 && n < 800) || n >= 900;
  }
  if (/PowerVR/i.test(gpu)) return false;
  return null;
}

/**
 * Strong or weak: iPhones on iOS 17 or later (the A12 and newer) and every iPad; Android phones with a strong GPU
 * and at least 4 GB; a GPU nobody can name, with 8 GB and 8 cores. Anything else is weak.
 */
export function phoneClass(p: PhoneInfo): PhoneClass {
  const ipad = /iPad/.test(p.ua) || (/Macintosh/.test(p.ua) && p.touch > 1);
  if (ipad) return 'strong';
  if (/iPhone|iPod/.test(p.ua)) return iosVersion(p.ua) >= 17 ? 'strong' : 'weak';
  const roomy = (p.memory ?? 4) >= 4;
  const named = p.gpu ? strongGpu(p.gpu) : null;
  if (named !== null) return named && roomy ? 'strong' : 'weak';
  return (p.memory ?? 0) >= 8 && (p.cores ?? 0) >= 8 ? 'strong' : 'weak';
}

/** What each class of phone draws, over the low tier's (index.ts `TIERS.low`) */
export const PHONES = {
  /** Sharper (up to 2.25 pixels a point), more people and cars, the detail as far as before, bloom on */
  strong: { dpr: { min: 1.25, start: 1.75, max: 2.25 }, cars: 22, walkers: 24, bikes: 4, far: 90, bloom: true },
  /** Today's sharpness to a little more, fewer people and cars, the detail nearer, no bloom (the neon still lit) */
  weak: { dpr: { min: 1, start: 1.25, max: 1.5 }, cars: 12, walkers: 10, bikes: 2, far: 75, bloom: false },
};

/** The rules for dynamic resolution */
export const RES = {
  /** One step of the pixel ratio */
  step: 0.125,
  /** Frames looked at before deciding */
  window: 30,
  /** A frame this much over the budget is slow */
  slowAt: 1.25,
  /** More than this share of slow frames in a window steps down */
  slowShare: 0.25,
  /** Less than this share counts as calm */
  calmShare: 0.04,
  /** Calm windows in a row before trying a step up */
  calm: 3,
  /**
   * A slow frame whose own work (the city's logic, before the GPU is asked to draw) took more than this share of the
   * budget was slow for the CPU: fewer pixels wouldn't help, so it isn't counted
   */
  cpuShare: 0.6,
  /** Seconds at least between two changes (each one resizes the render targets) */
  gap: 1.2,
  /** Seconds before a level that failed is tried again, doubling each time it fails, up to `backoffMax` */
  backoff: 4,
  backoffMax: 60,
};

export interface Resolution {
  /** The pixel ratio now */
  readonly scale: number;
  /** At the lowest it goes (index.ts then turns bloom off, as before) */
  atMin(): boolean;
  /**
   * A frame drawn: `dt` since the last one and `cpu` the city's own work in it, both in seconds, at `now` (seconds).
   * Returns the new pixel ratio when it should change, or null
   */
  frame(dt: number, cpu: number, now: number): number | null;
}

/** Dynamic resolution between `min` and `max` (pixel ratios), starting at `start`, for a frame `budget` in seconds */
export function createResolution(range: { min: number; start: number; max: number }, budget = 1 / 60): Resolution {
  const { min, max } = range;
  const snap = (v: number) => Math.min(max, Math.max(min, min + Math.round((v - min) / RES.step) * RES.step));
  const key = (v: number) => Math.round(v * 1000);
  let scale = snap(range.start);
  let frames = 0;
  let slow = 0;
  let calm = 0;
  let changed = -Infinity;
  /** Levels that failed: when each may be tried again, and how long it waited last time */
  const failed = new Map<number, { until: number; wait: number }>();
  return {
    get scale() {
      return scale;
    },
    atMin: () => scale <= min + 1e-6,
    frame(dt, cpu, now) {
      // (a hitch, a tab coming back: nothing to learn from it)
      if (!(dt > 0) || dt > 0.1) return null;
      const late = dt > budget * RES.slowAt;
      if (late && cpu > budget * RES.cpuShare) return null;
      frames++;
      if (late) slow++;
      if (frames < RES.window) return null;
      const share = slow / frames;
      frames = slow = 0;
      if (share > RES.slowShare) {
        calm = 0;
        if (scale <= min + 1e-6 || now - changed < RES.gap) return null;
        const f = failed.get(key(scale));
        const wait = f ? Math.min(RES.backoffMax, f.wait * 2) : RES.backoff;
        failed.set(key(scale), { until: now + wait, wait });
        scale = snap(scale - RES.step);
        changed = now;
        return scale;
      }
      calm = share < RES.calmShare ? calm + 1 : 0;
      if (calm < RES.calm || scale >= max - 1e-6 || now - changed < RES.gap) return null;
      const up = snap(scale + RES.step);
      const f = failed.get(key(up));
      if (f && now < f.until) return null;
      calm = 0;
      scale = up;
      changed = now;
      return scale;
    },
  };
}

/**
 * How hard the final pass sharpens (0 to 1), from how far the screen stretches the picture: `native` the screen's
 * pixels a point, `scale` what's drawn. A picture drawn at the screen's own pixels is only touched up
 */
export function sharpness(native: number, scale: number): number {
  const stretch = native / Math.max(0.5, scale);
  return Math.min(0.8, Math.max(0.2, (stretch - 1) * 0.4));
}
