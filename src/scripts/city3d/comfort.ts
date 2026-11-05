/**
 * Hold or toggle (docs/views-plan.md Phase 5, the owner's call): sprint, aim, crouch and block each work by holding
 * their key or button, or by pressing it once to turn on and again to turn off, on the keyboard, the gamepad and
 * touch alike. Unpicked, each works as it always has (`DEFAULTS`: on a touch screen Sprint and Aim lock, one thumb
 * can't hold them with the stick or Fire; crouch has always toggled; block has always been held). DOM-free: walk.ts
 * keeps the choice in `degen-city-walk-v1` (`holds`) and asks `holdMode()` at every press.
 */

export type HoldJob = 'sprint' | 'aim' | 'crouch' | 'block';
export type HoldMode = 'hold' | 'toggle';
export type HoldInput = 'keys' | 'pad' | 'touch';
/** What the player picked (a job left out works as it always has) */
export type Holds = Partial<Record<HoldJob, HoldMode>>;

export const HOLD_JOBS: readonly HoldJob[] = ['sprint', 'aim', 'crouch', 'block'];

/** How each worked before there was a choice, per input */
export const DEFAULTS: Record<HoldJob, Record<HoldInput, HoldMode>> = {
  sprint: { keys: 'hold', pad: 'hold', touch: 'toggle' },
  aim: { keys: 'hold', pad: 'hold', touch: 'toggle' },
  crouch: { keys: 'toggle', pad: 'toggle', touch: 'toggle' },
  block: { keys: 'hold', pad: 'hold', touch: 'hold' },
};

/** How `job` works on `input` */
export function holdMode(h: Holds, job: HoldJob, input: HoldInput): HoldMode {
  return h[job] ?? DEFAULTS[job][input];
}

/** A saved choice cleaned: only the four jobs, only hold or toggle */
export function cleanHolds(v: unknown): Holds {
  const out: Holds = {};
  if (!v || typeof v !== 'object') return out;
  for (const j of HOLD_JOBS) {
    const m = (v as Record<string, unknown>)[j];
    if (m === 'hold' || m === 'toggle') out[j] = m;
  }
  return out;
}

/** A press (`down`) or a let-go of a job's key or button: whether it's on after, from whether it was (`on`) */
export function press(mode: HoldMode, on: boolean, down: boolean): boolean {
  return mode === 'hold' ? down : down ? !on : on;
}
