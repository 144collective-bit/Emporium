/*
 * Endswood's lifts (docs/south-plan.md Phase 2c; the cores and their floors are southsky.ts `SKY_LIFTS`), loaded the
 * first time a lift's prompt is used: the prompt ("Lift") opens the metro's card (`[data-metro]`, the arcade kit) as
 * the lift's, listing its other floors; pick one and you ride there (index.ts `rideTo()`: a fade, out at that floor).
 */
import { SKY_LIFTS, floorName, liftArrival, liftFloorOf, type SkyLift } from './southsky';

export interface SkyLiftDeps {
  free(): boolean;
  /** Where Degen's feet are (over the street) */
  height(): number;
  ride(to: { x: number; z: number; y?: number; yaw: number }, arrived: string): void;
  /** The card opened (one card at a time) */
  opened(): void;
}

export function createSkyLiftUI(root: HTMLElement, d: SkyLiftDeps) {
  const card = root.querySelector<HTMLElement>('[data-metro]')!;
  const title = card.querySelector<HTMLElement>('[data-metro-title]')!;
  const list = card.querySelector<HTMLElement>('[data-metro-list]')!;
  const note = card.querySelector<HTMLElement>('.metro-note');
  const roundel = card.querySelector<HTMLElement>('.metro-roundel');
  // (the card is the metro's: its own words put back when the lift's is done with it)
  const was = { note: note?.textContent ?? '', roundel: roundel?.textContent ?? '' };
  let lift: SkyLift | null = null;

  function open(id: string) {
    const l = SKY_LIFTS.find((q) => q.id === id);
    const here = l ? liftFloorOf(l, d.height()) : null;
    if (!l || here === null || !d.free()) return;
    d.opened();
    lift = l;
    title.textContent = `${l.name} · Lift`;
    if (note) note.textContent = 'Pick a floor.';
    if (roundel) roundel.textContent = 'L';
    list.innerHTML = [0, ...l.floors]
      .filter((f) => f !== here)
      .map((f) => `<li><button type="button" class="metro-go" data-lift-to="${f}"><span>${floorName(f)}</span></button></li>`)
      .join('');
    card.hidden = false;
    list.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }
  function close() {
    if (card.hidden || !lift) return false;
    card.hidden = true;
    restore();
    return true;
  }
  function restore() {
    lift = null;
    if (note) note.textContent = was.note;
    if (roundel) roundel.textContent = was.roundel;
  }
  card.querySelector('[data-metro-close]')?.addEventListener('click', () => lift && restore());
  list.addEventListener('click', (e) => {
    const to = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-lift-to]')?.dataset.liftTo;
    if (to === undefined || !lift) return;
    const l = lift;
    const f = Number(to);
    close();
    d.ride(liftArrival(l, f), `${l.name} · ${floorName(f)}`);
  });
  return { open, close };
}
export type SkyLiftUI = ReturnType<typeof createSkyLiftUI>;
