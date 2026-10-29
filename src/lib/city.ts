/*
 * Sector 7's places with a pin: their ids and the copy on their pins and in
 * the ☰ Menu's directory (CityMap.astro). The 3D city (src/scripts/city3d)
 * keys its spots, doors and panels by these ids.
 */

/** The places with a pin */
export type SpotId = 'emporium' | 'shop' | 'workshop' | 'vault' | 'signal' | 'telegram' | 'plan' | 'apartments' | 'karts' | 'airport' | 'fightclub' | 'liberty' | 'harbour' | 'trenches' | 'club' | 'bar' | 'arms' | 'pier' | 'stadium' | 'nightmarket' | 'tower' | 'palmcourt' | 'mall' | 'hotel' | 'civichall' | 'golfclub' | 'overlook' | 'reservoir' | 'harbourmaster';

export interface Spot {
  /** Pin title and subline */
  title: string;
  sub: string;
}
