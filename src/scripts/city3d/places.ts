/*
 * The places you can get about between (docs/growth-plan.md Phase 8;
 * DOM-free, tested in tests/travel.test.ts): every place on the map with the
 * spot you arrive at (standing, facing it), for the world map, waypoints,
 * taxis and fast travel. The landmarks' and the city's places use the copy of
 * their pins (CityMap.astro); the rest have their own short names here.
 * Fast travel goes only to places you've walked to (`visited` in the save,
 * `seen()` decides when you have).
 */
import { DOORS, GARAGE_SITE, SOLIDS, STALL_SPOT, WALK_SPAWN } from './solids';
import { KART_SPAWN } from './kartpark';
import { AIR_ARRIVE } from './airfield';
import { FIGHT_SPAWN } from './fightsite';
import { LIBERTY_SPAWN } from './liberty';
import { HARBOUR_SPAWN } from './harbour';
import { STATIONS } from './metro';
import { STOPS } from './riverbus';
import { BLOCK_SPAWN } from './projects';
import { AVENUE_SPAWNS } from './avenue';
import { PIER_SPAWN } from './waterfront';
import { MARKET_SPAWN } from './nightmarket';
import { STADIUM_SPAWN } from './stadium';
import { TOWER_SPAWN } from './skydeck';
import { STATION_SPAWN } from './station';
import { COURT_SPAWN, MALL_SPAWN } from './mall';

export type PlaceKind = 'spot' | 'lot' | 'metro' | 'riverbus';
export interface Place {
  id: string;
  kind: PlaceKind;
  /** A place with a pin and a panel: its spot id (its name is its pin's); otherwise its own name */
  spot?: string;
  name?: string;
  /** Where you arrive: standing here, facing along yaw (forward is (-sin yaw, -cos yaw), as in walk.ts) */
  at: { x: number; z: number; yaw: number };
}

/** Is a spot clear of everything solid (a body's width round it) */
const clear = (x: number, z: number) => !SOLIDS.some((b) => x > b[0] - 0.35 && x < b[2] + 0.35 && z > b[1] - 0.35 && z < b[3] + 0.35);
/**
 * In front of a landmark's door (they all face south): a couple of steps out,
 * or the nearest clear spot to that, facing the door
 */
const atDoor = (id: string) => {
  const d = DOORS.find((o) => o.id === id)!;
  for (let r = 0; r < 3; r += 0.2)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const [x, z] = [d.x + Math.sin(a) * r, d.z + 1.6 + Math.cos(a) * r];
      if (clear(x, z)) return { x, z, yaw: Math.atan2(-(d.x - x), -(d.z - z)) };
    }
  return { x: d.x, z: d.z + 1.6, yaw: 0 };
};

export const PLACES: Place[] = [
  // The Emporium: where walk mode starts
  { id: 'emporium', kind: 'spot', spot: 'emporium', at: { x: WALK_SPAWN.x + Math.sin(WALK_SPAWN.yaw) * WALK_SPAWN.back, z: WALK_SPAWN.z + Math.cos(WALK_SPAWN.yaw) * WALK_SPAWN.back, yaw: WALK_SPAWN.yaw } },
  ...['shop', 'workshop', 'vault', 'plan', 'signal', 'telegram', 'apartments'].map((id): Place => ({ id, kind: 'spot', spot: id, at: atDoor(id) })),
  { id: 'karts', kind: 'spot', spot: 'karts', at: KART_SPAWN },
  // (on the GA car park's kerb by the fence's gate, the walk in to Hangar 1: the panel's Walk in starts at its door)
  { id: 'airport', kind: 'spot', spot: 'airport', at: AIR_ARRIVE },
  { id: 'fightclub', kind: 'spot', spot: 'fightclub', at: FIGHT_SPAWN },
  { id: 'liberty', kind: 'spot', spot: 'liberty', at: LIBERTY_SPAWN },
  { id: 'harbour', kind: 'spot', spot: 'harbour', at: HARBOUR_SPAWN },
  { id: 'trenches', kind: 'spot', spot: 'trenches', at: BLOCK_SPAWN },
  // Trench Avenue's places: on the sidewalk in front
  { id: 'club', kind: 'spot', spot: 'club', at: AVENUE_SPAWNS.club },
  { id: 'bar', kind: 'spot', spot: 'bar', at: AVENUE_SPAWNS.bar },
  { id: 'arms', kind: 'spot', spot: 'arms', at: AVENUE_SPAWNS.arms },
  { id: 'pier', kind: 'spot', spot: 'pier', at: PIER_SPAWN },
  { id: 'nightmarket', kind: 'spot', spot: 'nightmarket', at: MARKET_SPAWN },
  // Westlake Park's stadium: on its forecourt, facing the gate
  { id: 'stadium', kind: 'spot', spot: 'stadium', at: STADIUM_SPAWN },
  // Uptown's Sector 7 Tower: on the plaza in front of its pavilion, facing it (the lift to the sky deck inside)
  { id: 'tower', kind: 'spot', spot: 'tower', at: TOWER_SPAWN },
  // Sector 7 Central, the grand station: on its forecourt between the fountains, facing the hall's doors
  { id: 'station', kind: 'spot', spot: 'station', at: STATION_SPAWN },
  // Palm Court and Starlight Mall, north of downtown: under the court's arch facing up its promenade, in front of the mall's porch
  { id: 'palmcourt', kind: 'spot', spot: 'palmcourt', at: COURT_SPAWN },
  { id: 'mall', kind: 'spot', spot: 'mall', at: MALL_SPAWN },
  // The garage's forecourt, facing its office door; the market square, at your stall
  // (its office door faces north, onto the forecourt)
  { id: 'garage', kind: 'lot', name: 'Garage', at: { x: GARAGE_SITE.door.x - 1, z: GARAGE_SITE.door.z - 1.8, yaw: Math.atan2(-1, -1.8) } },
  { id: 'market', kind: 'lot', name: 'Market square', at: { x: STALL_SPOT.x, z: STALL_SPOT.z + 0.4, yaw: 0 } },
  // The metro's stations: on the sidewalk at the foot of each stair tower, facing its door
  ...STATIONS.map((s): Place => ({ id: `metro-${s.id}`, kind: 'metro', name: `${s.name} station`, at: { x: s.door.x + s.face[0] * 0.4, z: s.door.z + s.face[1] * 0.4, yaw: Math.atan2(s.face[0], s.face[1]) } })),
  // The river bus's stops (river plan step 4b): at the top of each landing's gangway, facing the river
  ...STOPS.map((s): Place => ({ id: `riverbus-${s.id}`, kind: 'riverbus', name: s.pier, at: s.arrive })),
];
export const PLACE_IDS = PLACES.map((p) => p.id);

/** How near a place's arrival spot counts as having been there (for fast travel) */
export const SEEN_R = 9;
/** The places a walker at x, z has just reached */
export const seen = (x: number, z: number) => PLACES.filter((p) => Math.hypot(p.at.x - x, p.at.z - z) < SEEN_R).map((p) => p.id);

/** Where placeName() finds the pins' copy: the page (a DOM ParentNode; spelt out so the game server's DOM-free type check passes) */
interface Copy {
  querySelector(s: string): { querySelector(s: string): { textContent: string | null } | null } | null;
}
/** A place's name and a line under it: the copy on its pin (CityMap.astro's directory, found under `root`), or its own */
export function placeName(root: Copy, p: Place) {
  if (p.name) return { name: p.name, sub: p.kind === 'metro' ? 'Metro' : p.kind === 'riverbus' ? 'River bus' : '' };
  const a = root.querySelector(`[data-dir-spot="${p.spot}"]`);
  return { name: a?.querySelector('span')?.textContent?.trim() ?? p.id, sub: a?.querySelector('small')?.textContent?.trim() ?? '' };
}
