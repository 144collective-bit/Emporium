/*
 * The city's sound as the boot holds it: nothing plays until the visitor turns it on (sound.ts), so the synth itself
 * is a chunk fetched on that first tap. Until then, and while it comes, every call is silent, as sound.ts's own are
 * while it's off. The audio context is made in the tap itself (iOS starts audio only there) and handed over.
 */
import type { Sfx } from './combat';
import type { Ambience } from './ambience';
import type { createSound as Real } from './sound';

type Sound = ReturnType<typeof Real>;

export function createSound() {
  let real: Sound | null = null;
  let ctx: AudioContext | null = null;
  let loading: Promise<Sound> | null = null;
  return {
    get on() {
      return real?.on ?? false;
    },
    async toggle() {
      if (!real) {
        // (in the tap, before anything waits)
        ctx ??= new AudioContext();
        void ctx.resume();
        loading ??= import('./sound').then((m) => (real = m.createSound(ctx!)));
        await loading;
      }
      return real!.toggle();
    },
    sfx: (kind: Sfx, gain?: number) => real?.sfx(kind, gain),
    engine: (revs: number, whine?: boolean) => real?.engine(revs, whine),
    tyres: (level: number) => real?.tyres(level),
    aero: (kind: 'prop' | 'jet' | 'heli', revs: number) => real?.aero(kind, revs),
    update: (rain: number, night: number, a: Ambience, rumble?: number) => real?.update(rain, night, a, rumble),
    suspend: () => real?.suspend(),
    resume: () => real?.resume(),
  };
}
