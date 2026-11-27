/*
 * The cities there are (docs/cities-plan.md; DOM-free, tested in tests/citymap.test.ts): Sector 7, the home city
 * written in code, and each city that's a map file (citymap.ts), drawn on the stage (citystage.ts). The page reads
 * `cityAsked()` to know which to start.
 */
import { blankMap, type CityMap } from './citymap';

export interface City {
  id: string;
  name: string;
  /** Sector 7: the city in code, started by index.ts; every other is a map file */
  home?: true;
  /** A test level: reached by the address only, never on the airport's board */
  test?: true;
  /** Its map file (not Sector 7's) */
  map?: () => CityMap;
}

/** The home city's id */
export const HOME = 'sector7';
/** The blank open level the map creator starts from */
export const OPEN_LEVEL = 'open-level';

export const CITIES: readonly City[] = [
  { id: HOME, name: 'Sector 7', home: true },
  { id: OPEN_LEVEL, name: 'Open Level', test: true, map: () => blankMap(OPEN_LEVEL, 'Open Level') },
];

export const cityOf = (id: string) => CITIES.find((c) => c.id === id) ?? null;

/** The cities a flight can go to: every map city that isn't a test level (none yet) */
export const destinations = () => CITIES.filter((c) => !c.home && !c.test);

/**
 * The map city the address asks for (`?city=<id>`), or null for Sector 7: no `city`, the home city's own id or one
 * that isn't known all start Sector 7 as ever.
 */
export function cityAsked(search: string): City | null {
  const m = /[?&]city=([^&#]*)/.exec(search);
  if (!m) return null;
  let id = m[1];
  try {
    id = decodeURIComponent(id);
  } catch {
    return null;
  }
  const city = cityOf(id);
  return city && !city.home && city.map ? city : null;
}
