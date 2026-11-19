/*
 * The quality step-down's order (docs/stability-plan.md, Phase 6.1). DOM-free, tested in tests/quality.test.ts;
 * index.ts watches the frames and does what each step says.
 *
 * Too slow: fewer pixels, then no shadows, then no bloom (the ink outlines always stay). Fast again for a while:
 * bloom, then shadows, then pixels come back, each once: a step put back and then lost again stays off, so the
 * picture doesn't see-saw. Shadows go by their intensity (`sky.setShadows()`, as in the City view), never by the
 * renderer's shadow map or the lights' `castShadow`: those change every material's shader, and turning them off
 * recompiled the whole city in one frame (a freeze of a second or more on a slow laptop). So they can come back too.
 */

export type QualityStep = 'pixels' | 'shadows' | 'bloom';

const DOWN: QualityStep[] = ['pixels', 'shadows', 'bloom'];
const UP: QualityStep[] = ['bloom', 'shadows', 'pixels'];

export interface Quality {
  /** What's lowered now */
  readonly lowered: Readonly<Record<QualityStep, boolean>>;
  /** Anything left to lower */
  canDegrade(): boolean;
  /** Lower the next step: which one (null: nothing left) */
  degrade(): QualityStep | null;
  /** Put the next step back: which one (null: nothing to put back, or only steps already put back once) */
  restore(): QualityStep | null;
}

export function createQuality(): Quality {
  const lowered: Record<QualityStep, boolean> = { pixels: false, shadows: false, bloom: false };
  // (a step put back and then lost again stays off: no see-sawing)
  const settled = new Set<QualityStep>();
  return {
    lowered,
    canDegrade: () => DOWN.some((s) => !lowered[s]),
    degrade() {
      const s = DOWN.find((k) => !lowered[k]) ?? null;
      if (s) lowered[s] = true;
      return s;
    },
    restore() {
      const s = UP.find((k) => lowered[k] && !settled.has(k)) ?? null;
      if (s) {
        lowered[s] = false;
        settled.add(s);
      }
      return s;
    },
  };
}
