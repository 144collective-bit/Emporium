/*
 * The lifts with a floor picker, loaded the first time a lift's prompt is used: Endswood's (docs/south-plan.md Phase
 * 2c; the cores and their floors are southsky.ts `SKY_LIFTS`) and Starlight Mall station's glass lift in the Skywalk
 * (docs/mall-plan.md "One mall" Phase 2; malllink.ts `STATION_LIFT`). The prompt ("Lift") opens the metro's card
 * (`[data-metro]`, the arcade kit) as the lift's, listing its other floors; pick one and you ride there (index.ts
 * `rideTo()`: a fade, out at that floor).
 */
import { SKY_LIFTS, floorName, liftArrival, liftFloorOf } from './southsky';
import { STATION_LIFT, liftFloorAt } from './malllink';

export interface SkyLiftDeps {
  free(): boolean;
  /** Where Degen's feet are (over the street) */
  height(): number;
  ride(to: { x: number; z: number; y?: number; yaw: number }, arrived: string): void;
  /** The card opened (one card at a time) */
  opened(): void;
}

/** A floor to pick: its name in the list, where it lets you out, what the toast says */
interface Choice {
  label: string;
  to: { x: number; z: number; y?: number; yaw: number };
  arrived: string;
}

export function createSkyLiftUI(root: HTMLElement, d: SkyLiftDeps) {
  const card = root.querySelector<HTMLElement>('[data-metro]')!;
  const title = card.querySelector<HTMLElement>('[data-metro-title]')!;
  const list = card.querySelector<HTMLElement>('[data-metro-list]')!;
  const note = card.querySelector<HTMLElement>('.metro-note');
  const roundel = card.querySelector<HTMLElement>('.metro-roundel');
  // (the card is the metro's: its own words put back when the lift's is done with it)
  const was = { note: note?.textContent ?? '', roundel: roundel?.textContent ?? '' };
  let choices: Choice[] | null = null;

  /** The card for a lift: its name and the floors other than this one */
  function show(name: string, floors: Choice[]) {
    if (!floors.length || !d.free()) return;
    d.opened();
    choices = floors;
    title.textContent = `${name} · Lift`;
    if (note) note.textContent = 'Pick a floor.';
    if (roundel) roundel.textContent = 'L';
    list.innerHTML = floors.map((c, i) => `<li><button type="button" class="metro-go" data-lift-to="${i}"><span>${c.label}</span></button></li>`).join('');
    card.hidden = false;
    list.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }
  /** One of Endswood's, by its core's id */
  function open(id: string) {
    const l = SKY_LIFTS.find((q) => q.id === id);
    const here = l ? liftFloorOf(l, d.height()) : null;
    if (!l || here === null) return;
    show(
      l.name,
      [0, ...l.floors].filter((f) => f !== here).map((f) => ({ label: floorName(f), to: liftArrival(l, f), arrived: `${l.name} · ${floorName(f)}` }))
    );
  }
  /** Starlight Mall station's: the street, the mall's floor, the metro's (walk.ts `placeAt()`'s height is over the slab) */
  function openStation() {
    const here = liftFloorAt(d.height());
    if (here === null) return;
    show(
      STATION_LIFT.name,
      STATION_LIFT.floors.flatMap((f, i) => (i === here ? [] : [{ label: f.name, to: { ...f.door, y: i ? f.y - STATION_LIFT.floors[0].y : undefined }, arrived: `${STATION_LIFT.name} · ${f.name}` }]))
    );
  }
  function close() {
    if (card.hidden || !choices) return false;
    card.hidden = true;
    restore();
    return true;
  }
  function restore() {
    choices = null;
    if (note) note.textContent = was.note;
    if (roundel) roundel.textContent = was.roundel;
  }
  card.querySelector('[data-metro-close]')?.addEventListener('click', () => choices && restore());
  list.addEventListener('click', (e) => {
    const to = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-lift-to]')?.dataset.liftTo;
    const c = to === undefined ? undefined : choices?.[Number(to)];
    if (!c) return;
    close();
    d.ride(c.to, c.arrived);
  });
  return { open, openStation, close };
}
export type SkyLiftUI = ReturnType<typeof createSkyLiftUI>;
