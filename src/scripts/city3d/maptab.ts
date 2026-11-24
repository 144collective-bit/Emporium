/*
 * The hub's Map tab (docs/header-plan.md): its districts, the places in each, which is "here", and what a place's
 * Go button does. DOM-free, tested in tests/maptab.test.ts; CityMap.astro builds the rows from `DIRECTORY` and
 * `AREA_OF`, hubtabs-ui.ts works them.
 */
import type { SpotId } from '../../lib/city';

export type AreaId = 'downtown' | 'trenches' | 'westlake' | 'uptown' | 'crest' | 'docks' | 'strip' | 'sunridge' | 'ends' | 'lot9' | 'out';

/** The districts, in the picker's order, and their places in the Map tab's order */
export const AREAS: readonly { id: AreaId; label: string; places: readonly SpotId[] }[] = [
  { id: 'downtown', label: 'Downtown', places: ['emporium', 'shop', 'workshop', 'vault', 'plan', 'signal', 'telegram', 'apartments', 'fightclub', 'liberty', 'harbour'] },
  { id: 'trenches', label: 'The Trenches', places: ['trenches', 'club', 'bar', 'arms', 'pier', 'nightmarket'] },
  { id: 'westlake', label: 'Westlake', places: ['cityhall', 'police', 'courthouse', 'lakehouse'] },
  { id: 'uptown', label: 'Uptown', places: ['tower', 'palmcourt', 'mall'] },
  { id: 'crest', label: 'Crestmont', places: ['hotel', 'civichall', 'golfclub', 'overlook', 'reservoir', 'asterly', 'belvedere', 'glasshouse', 'vellano', 'solenne'] },
  { id: 'docks', label: 'The Docks', places: ['harbourmaster'] },
  { id: 'strip', label: 'Neon Mile', places: ['wildace', 'dragonspire', 'scarab', 'bigcity', 'gondolier', 'lagoon', 'orbit', 'sphere'] },
  { id: 'sunridge', label: 'Sunridge', places: ['sunclub', 'sunpark', 'sunschool'] },
  { id: 'ends', label: 'Endswood', places: ['home', 'endswood', 'aldwyns', 'bunker', 'brook', 'rosas', 'kestrel', 'busgarage', 'rec'] },
  { id: 'lot9', label: 'Lot 9', places: ['lot9'] },
  { id: 'out', label: 'Out of town', places: ['airport', 'karts', 'northgate'] },
];

/** Every place on the Map tab, in its order */
export const DIRECTORY: readonly SpotId[] = AREAS.flatMap((a) => a.places);

/** A place's district */
export const AREA_OF = Object.fromEntries(AREAS.flatMap((a) => a.places.map((p) => [p, a.id]))) as Record<SpotId, AreaId>;

/** The district picker's choices: every district, then All */
export const AREA_CHOICES: readonly (AreaId | 'all')[] = [...AREAS.map((a) => a.id), 'all'];
export const areaLabel = (id: AreaId | 'all') => (id === 'all' ? 'All' : (AREAS.find((a) => a.id === id)?.label ?? id));

/**
 * The district you're in: that of the nearest place on the Map tab to x, z (`at`, each place's arrival spot by its
 * spot id: places.ts `PLACES`); null with none to go by
 */
export function areaHere(x: number, z: number, at: (spot: SpotId) => { x: number; z: number } | undefined): AreaId | null {
  let best: AreaId | null = null;
  let bestD = Infinity;
  for (const id of DIRECTORY) {
    const p = at(id);
    if (!p) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bestD) {
      bestD = d;
      best = AREA_OF[id];
    }
  }
  return best;
}

/** Where you are, as travel-ui.ts has it: the City view, on foot, or busy (at a wheel, on a ride) */
export type TravelState = 'city' | 'foot' | 'busy';
/** What Go does: fly there and open it, walk there from the City view, fast travel, a taxi, or a waypoint */
export type GoAct = 'view' | 'walk' | 'travel' | 'taxi' | 'route';
export const GO_LABEL: Record<GoAct, string> = { view: 'View', walk: 'Walk', travel: 'Go', taxi: 'Taxi', route: 'Route' };

/** The best way there from where you are (`been`: walked to it before; `spot`: it has a panel to open) */
export function goAct(state: TravelState, been: boolean, spot = true): GoAct {
  if (state === 'city') return spot ? 'view' : been ? 'walk' : 'route';
  if (state === 'foot') return been ? 'travel' : 'taxi';
  return 'route';
}

/** A place's line split from its "coming soon" ("Nightclub · coming soon" → the line and true) */
export function soonSplit(sub: string): { line: string; soon: boolean } {
  const m = /\s*·\s*coming soon\s*$/i.exec(sub);
  return m ? { line: sub.slice(0, m.index), soon: true } : { line: sub, soon: false };
}
