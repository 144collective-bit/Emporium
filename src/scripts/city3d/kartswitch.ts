/*
 * Riverside Raceway's switch (docs/kart-harbour-plan.md: built behind `?karts=new` until Phase 8 puts it on for
 * everyone). DOM-free and light, so the boot can hold it without loading the new circuit: index.ts turns it on when
 * the page asks, then loads the park's rules (kartcourse2.ts) and hands the city its ground (`surfaceAt`, groundheight.ts's
 * `riverside` layer); the trees keep off its land (`KART2_LAND`), its tunnel's walls join the solids, its drawing loads
 * as a district (districts.ts `karts2`, `when`) and the clubhouse races there.
 */
import type { Rect } from './kartpark2';

/** The park's land (kartpark2.ts `KART2_AREA`, written out so the boot needn't load it; tested equal) */
export const KART2_LAND: Rect = [-585, 138.7, -410, 342];

export const KARTS2: {
  /** The new park is on (this page asked for it) */
  on: boolean;
  /** Its ground for walking and driving (kartcourse2.ts `riversideSurfaceAt()`), once its rules have loaded */
  surfaceAt: ((x: number, z: number, yNow: number) => number | null) | null;
  /** Its tunnel's and cuttings' walls on foot (kartcourse2.ts `riversideWall()`) */
  wall: ((x: number, z: number, y: number, r: number) => boolean) | null;
} = { on: false, surfaceAt: null, wall: null };

/** Whether a page's query asks for the new park (`?karts=new`) */
export const kartsNewAsked = (search: string) => new URLSearchParams(search).get('karts') === 'new';
