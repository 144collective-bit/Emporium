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
import { SOUTH_STATIONS, TUBE_SPOTS } from './southline';
import { BLOCK_SPAWN } from './projects';
import { AVENUE_SPAWNS } from './avenue';
import { PIER_SPAWN } from './waterfront';
import { MARKET_SPAWN } from './nightmarket';
import { TOWER_SPAWN } from './skydeck';
import { COURT_SPAWN, MALL_SPAWN } from './mall';
import { SITE_SPAWNS } from './crestsites';
import { GOLF_CLUBHOUSE } from './golflift';
import { CORAL_SPAWNS } from './coral';
import { HM_SPAWN } from './docksport';
import { SUN_SPAWNS } from './sunplaces';
import { LOT9_SPAWN } from './lot9';
import { ENDS_PLACE_IDS, ENDS_SPAWNS } from './endsplaces';
import { HOME_SPAWN } from './home';
import { CITYHALL_SPAWN, COURTHOUSE_SPAWN, POLICE_SPAWN } from './civic';
import { RESORTS } from './resorts';
import { SPHERE_SPAWN } from './stripmarks';
import { MONO_STATIONS } from './monorail';
import { VISITOR_SPAWN } from './airbase';
import { CABLE_STATIONS } from './cablecar';

export type PlaceKind = 'spot' | 'lot' | 'metro' | 'riverbus' | 'mono' | 'tube' | 'cable';
export interface Place {
  id: string;
  kind: PlaceKind;
  /** A place with a pin and a panel: its spot id (its name is its pin's); otherwise its own name */
  spot?: string;
  name?: string;
  /** Where you arrive: standing here, facing along yaw (forward is (-sin yaw, -cos yaw), as in walk.ts); `y`, up on a floor over the slab (walk.ts `placeAt()`) */
  at: { x: number; z: number; yaw: number; y?: number };
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
  // Uptown's Sector 7 Tower: on the plaza in front of its pavilion, facing it (the lift to the sky deck inside)
  { id: 'tower', kind: 'spot', spot: 'tower', at: TOWER_SPAWN },
  // Palm Court and Starlight Mall, north of downtown: under the court's arch facing up its promenade, in front of the mall's porch
  { id: 'palmcourt', kind: 'spot', spot: 'palmcourt', at: COURT_SPAWN },
  { id: 'mall', kind: 'spot', spot: 'mall', at: MALL_SPAWN },
  // Crestmont's landmarks (crestsites.ts): where you arrive at each, facing it
  ...(['hotel', 'civichall', 'overlook', 'reservoir', 'asterly', 'belvedere', 'glasshouse'] as const).map((id): Place => ({ id, kind: 'spot', spot: id, at: SITE_SPAWNS[id] })),
  // (Knob Hill Golf Club in the north-east corner, docs/golf-plan.md Phase 4: in its car park, facing the clubhouse)
  { id: 'golfclub', kind: 'spot', spot: 'golfclub', at: GOLF_CLUBHOUSE.spawn },
  // Coral Drive's refitted showroom and spa (coral.ts, the premium upgrade's Phase 4): on the strip in front of each
  ...(['vellano', 'solenne'] as const).map((id): Place => ({ id, kind: 'spot', spot: id, at: CORAL_SPAWNS[id] })),
  // Southbank Docks' Harbour Master (docksport.ts): on the sidewalk, facing its door
  { id: 'harbourmaster', kind: 'spot', spot: 'harbourmaster', at: HM_SPAWN },
  // Sunridge's club, park and school (sunplaces.ts): on the loop's sidewalk in front of each, facing it
  ...(['sunclub', 'sunpark', 'sunschool'] as const).map((id): Place => ({ id, kind: 'spot', spot: id, at: SUN_SPAWNS[id] })),
  // The Neon Mile's resorts (resorts.ts): on the lot in front of each door
  ...RESORTS.map((r): Place => ({ id: r.id, kind: 'spot', spot: r.id, at: r.spawn })),
  { id: 'sphere', kind: 'spot', spot: 'sphere', at: SPHERE_SPAWN },
  // Lot 9, the trailer park south of the highway (lot9.ts): on the lane outside its gate, facing in
  { id: 'lot9', kind: 'spot', spot: 'lot9', at: LOT9_SPAWN },
  // Northgate Air Base's visitors' centre outside its main gate (airbase.ts, docs/military-plan.md): in its car park,
  // facing its door
  { id: 'northgate', kind: 'spot', spot: 'northgate', at: VISITOR_SPAWN },
  // Endswood Estate's (endsplaces.ts): in front of the tenants' hall, St Aldwyn's west door and Bunker Sound's
  ...ENDS_PLACE_IDS.map((id): Place => ({ id, kind: 'spot', spot: id, at: ENDS_SPAWNS[id] })),
  // City Hall (civic.ts): on the civic square at its steps' foot, facing them
  { id: 'cityhall', kind: 'spot', spot: 'cityhall', at: CITYHALL_SPAWN },
  // ...and the police headquarters and the courthouse either side of the square, facing their doors
  { id: 'police', kind: 'spot', spot: 'police', at: POLICE_SPAWN },
  { id: 'courthouse', kind: 'spot', spot: 'courthouse', at: COURTHOUSE_SPAWN },
  // Degen's home in the Ends (home.ts): on its front path, facing the door
  { id: 'home', kind: 'spot', spot: 'home', at: HOME_SPAWN },
  // The garage's forecourt, facing its office door; the market square, at your stall
  // (its office door faces north, onto the forecourt)
  { id: 'garage', kind: 'lot', name: 'Garage', at: { x: GARAGE_SITE.door.x - 1, z: GARAGE_SITE.door.z - 1.8, yaw: Math.atan2(-1, -1.8) } },
  { id: 'market', kind: 'lot', name: 'Market square', at: { x: STALL_SPOT.x, z: STALL_SPOT.z + 0.4, yaw: 0 } },
  // The metro's stations: on the sidewalk at the foot of each stair tower, facing its door (Starlight Mall's on its
  // platform, up in the Skywalk: malllink.ts)
  ...STATIONS.map((s): Place => ({ id: `metro-${s.id}`, kind: 'metro', name: `${s.name} station`, at: { x: s.door.x + s.face[0] * 0.4, z: s.door.z + s.face[1] * 0.4, yaw: Math.atan2(s.face[0], s.face[1]), ...(s.inside ? { y: s.inside.y } : {}) } })),
  // The river bus's stops (river plan step 4b): at the top of each landing's gangway, facing the river
  ...STOPS.map((s): Place => ({ id: `riverbus-${s.id}`, kind: 'riverbus', name: s.pier, at: s.arrive })),
  // The Neon Mile's monorail (monorail.ts): at each station's door
  ...MONO_STATIONS.map((s): Place => ({ id: `mono-${s.id}`, kind: 'mono', name: s.name, at: s.at })),
  // Highcrest's cable car (cablecar.ts, the premium upgrade's Phase 4b): where you arrive at each station
  ...CABLE_STATIONS.map((s): Place => ({ id: `cable-${s.id}`, kind: 'cable', name: s.name, at: s.at })),
  // The south's underground line, the tube (southline.ts, the south plan's 4h): at street level by each station's way
  // in, facing it (the Circus's in its sunken plaza)
  ...SOUTH_STATIONS.map((s): Place => ({ id: `tube-${s.id}`, kind: 'tube', name: `${s.name} station`, at: TUBE_SPOTS[s.id] })),
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
  if (p.name) return { name: p.name, sub: p.kind === 'metro' ? 'Metro' : p.kind === 'tube' ? 'Tube' : p.kind === 'riverbus' ? 'River bus' : p.kind === 'mono' ? 'Monorail' : p.kind === 'cable' ? 'Cable car' : '' };
  const a = root.querySelector(`[data-dir-spot="${p.spot}"]`);
  return { name: a?.querySelector('span')?.textContent?.trim() ?? p.id, sub: a?.querySelector('small')?.textContent?.trim() ?? '' };
}
