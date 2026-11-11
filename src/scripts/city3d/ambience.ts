/*
 * What the city sounds like where you are (docs/growth-plan.md Phase 8;
 * DOM-free, tested in tests/ambience.test.ts): how much of each ambient layer
 * the sound engine (sound.ts) mixes in round a spot, so the sound follows
 * the district you're in rather than centring on the Emporium: the city's
 * hum in town, fading out past it; the river close to the water; the rush of
 * traffic beside the ring highway and the town's avenues; wind over the open
 * land and the woods; the arcade's beat near the Emporium; and in The
 * Trenches (the grit step) the hood's own: distant sirens and a dog now and
 * then (`hood`), a boombox by a walk-up's stoop (`boombox`), Club PULSE's
 * beat through its walls by the door (`club`); the el's rumble follows the
 * train itself (metro3d.ts `rumbleAt()`). In Westlake Park (step 3) the
 * park's own: birdsong by day and an owl at night (`park`), the lake
 * lapping (`water`). In Uptown (finance plan Phase 6) the hum is quieter
 * (`UPTOWN_HUSH`), the plaza's pool and water wall splash (`fountain`) and the
 * circle's traffic comes round it (`road`). In Crestmont (docs/crestmont-plan.md Phase 8) a quiet hum
 * (`CREST_HUM`) and little wind, birds by day and an owl at night as the park's, the sprinklers by day and the crickets
 * at night (`crest`), and the Drive's and the civic hall's fountains (`fountain`). In Sunridge (docs/suburb-plan.md
 * Phase 5) the same quiet hum (`SUN_HUM`), its sprinklers, crickets and birds as Crestmont's and a lawnmower now and
 * then (`suburb`). On the Neon Mile (docs/strip-plan.md Phase 5) its crowd (`strip`), the slot machines' chimes by
 * the casinos' doors (`casino`) and, round the Gondolier's lake, the fountain show's music while a show is on (`show`).
 *
 * The polish pass's sound phase (docs/polish-plan.md theme 3): the town's hum is the loudest of every built-up
 * part's (`HUMS`: the town itself, The Trenches, Uptown and Uptown North hushed, the mall, the Neon Mile, the
 * Docks, the airport, the kart park, the stadium and Southfield Yards, each eased out past its land), so no
 * district reads as open country; and the places with a sound of their own have a layer: the waterfront
 * (`waterfront`: gulls by day, a foghorn now and then, along The Trenches' boardwalk, Pier 7 and the Night
 * Market's deck and the town's promenades; the market's murmur after dusk is `market`), Southbank Docks (`docks`:
 * gulls, a crane's hoist whine, a ship's horn now and then), the airport (`jets`: an airliner's roar rising and
 * fading as one takes off or lands, from the timetable, so it's the same for everyone), inside Starlight Mall
 * (`indoor`: a soft indoor hum and murmur; sound.ts damps the outdoor layers by it), Southfield Yards (`yards`: a
 * compressor running, a reversing beep now and then) and the kart park (`karts`: engines idling and a tannoy's
 * murmur, low; a race's own karts are kart.ts's). The polish plan's Phase 7 added the stadium on a match night
 * (`stadium`: the crowd's roar swelling now and then round the ground, from stadium.ts's `matchOn()` and the clock).
 * On Endswood Estate (docs/estate-plan.md Phase 7) its own (`ends`: pigeons by day, a moped now and then, the two-tone
 * siren far off, the ice-cream van's jingle on a summer's day), Bunker Sound's beat out of its garage door (`studio`)
 * and St Aldwyn's bell on the hour, heard across the estate and beyond (`bell`).
 */
import { CITY_EXT } from './layout';
import { edgesAt } from './river';
import { PLAN, distToStreet } from './streetplan';
import { fromHighway, insideHighway } from './highway';
import { DOORS } from './solids';
import { TRENCH_RECT, inTrenches } from './trenches';
import { BOOMBOXES } from './grit';
import { CLUB } from './avenue';
import { LAKE_C, WESTLAKE_RECT, inPark, lakeR } from './westlake';
import { CIRCLE, UPTOWN_RECT, inUptown } from './uptown';
import { NORTH_RECT } from './uptownnorth';
import { CENTRE, POOL, WALL_RUNS, WATER_WALL } from './plaza';
import { CREST_RECT } from './crestmont';
import { STRIP_RECT, inStrip } from './strip';
import { RESORTS, resortOf } from './resorts';
import { SPHERE_DOOR } from './stripmarks';
import { FOUNTAINS as DRIVE_FOUNTAINS } from './coral';
import { CIVIC } from './crestsites';
import { SUNRIDGE_RECT, inSunridge } from './sunridge';
import { LOT9_RADIO, LOT9_RECT, inLot9 } from './lot9';
import { HALL, MALL_AREA } from './mall';
import { DOCKS_RECT } from './docks';
import { FLIGHTS, SITE, poseAt } from './airfield';
import { KART_PARK } from './kartpark';
import { BLOCK as STADIUM_BLOCK, matchOn } from './stadium';
import { DECKS, MARKET_DECK } from './waterfront';
import { PROMENADE } from './outer';
import { YARDS_RECT, inYards } from './southfield';
import { ENDSWOOD_RECT, inEndswood } from './endswood';
import { CHURCH, STUDIO } from './endsstreet';
import { COMMON, inCommon } from './endsblend';
import { fromWall } from './wall';

export interface Ambience {
  /** The town's hum, 0-1 */
  city: number;
  /** Water lapping, 0-1 */
  water: number;
  /** Traffic's rush, 0-1 */
  road: number;
  /** Wind over open land, 0-1 */
  open: number;
  /** The Emporium's beat, 0-1 */
  beat: number;
  /** The Trenches: sirens far off, a dog now and then, 0-1 */
  hood: number;
  /** A boombox by a stoop, 0-1 */
  boombox: number;
  /** Club PULSE's beat, muffled by its walls, 0-1 */
  club: number;
  /** Westlake Park: birds by day, an owl at night, 0-1 */
  park: number;
  /** Uptown's plaza: its pool's jets and the water wall; Crestmont's fountains, 0-1 */
  fountain: number;
  /** Crestmont: the sprinklers by day, the crickets at night (and its birds and owl, as the park's), 0-1 */
  crest: number;
  /** Sunridge: the sprinklers and a lawnmower by day, the crickets at night, 0-1 */
  suburb: number;
  /** The Neon Mile: its crowd's hum, 0-1 */
  strip: number;
  /** Slot machines' chimes through a casino's doors, 0-1 */
  casino: number;
  /** By the Gondolier's lake: the fountain show's music (sound.ts plays it while a show is on), 0-1 */
  show: number;
  /** The waterfront (the boardwalk, Pier 7, the market's deck, the town's promenades): gulls by day, a foghorn now and then, 0-1 */
  waterfront: number;
  /** The Night Market's deck: its murmur after dusk, 0-1 */
  market: number;
  /** Southbank Docks: gulls, a crane's hoist whine, a ship's horn now and then, 0-1 */
  docks: number;
  /** The airport: an airliner's roar as one takes off or lands nearby, rising and fading, 0-1 */
  jets: number;
  /** Inside Starlight Mall: a soft indoor hum and murmur (the outdoor layers damped by it), 0-1 */
  indoor: number;
  /** Southfield Yards: a compressor running, a reversing beep now and then, 0-1 */
  yards: number;
  /** The kart park: engines idling, a tannoy's murmur, 0-1 */
  karts: number;
  /** The stadium on a match night (stadium.ts `matchOn()`): the crowd's roar swelling now and then, 0-1; 0 any other time */
  stadium: number;
  /** Endswood Estate: pigeons, mopeds, the two-tone siren far off, the ice-cream van, 0-1 */
  ends: number;
  /** Bunker Sound's beat out of its garage door, 0-1 */
  studio: number;
  /** St Aldwyn's bell (sound.ts tolls it on the hour), 0-1 */
  bell: number;
  /** By the wall round the city (docs/wall-plan.md Phase 6): the wind along its face and a low hum off it, 0-1 */
  wall: number;
}
/** How far from the wall's inner face its sound carries (full at its foot) */
export const WALL_SOUND = 70;
/** The church's tower, where its bell hangs */
const BELFRY = [(CHURCH.tower.rect[0] + CHURCH.tower.rect[2]) / 2, (CHURCH.tower.rect[1] + CHURCH.tower.rect[3]) / 2];
/** How much of the town's hum Crestmont has (a quiet, well-off hum) */
export const CREST_HUM = 0.4;
/** Crestmont's fountains: x, z, the basin's radius */
const CREST_FOUNTAINS: [number, number, number][] = [...DRIVE_FOUNTAINS.map((f): [number, number, number] => [f.x, f.z, f.r]), ...CIVIC.fountains.map(([x, z]): [number, number, number] => [x, z, CIVIC.fountainR])];
/** How much of the town's hum Sunridge has (a suburb's quiet) */
export const SUN_HUM = 0.3;
/** How much quieter the town's hum is deep in Uptown (its offices, glass and the river) */
export const UPTOWN_HUSH = 0.35;
/** The Neon Mile's casino doors (the resorts' and the Sphere's), and the lake the fountain show plays on */
const CASINO_DOORS = [...RESORTS.map((r) => r.door), SPHERE_DOOR];
const SHOW_LAKE = resortOf('gondolier')!.water[0];
/**
 * How much of the town's hum each built-up part has on its land (the town's own is 1 inside `CITY_EXT`), and how
 * far past its edge it fades out: The Trenches (its own `hood` layer over it), Uptown and Uptown North hushed
 * (`UPTOWN_HUSH`), the mall's car parks and forecourt, the Neon Mile (its crowd's `strip` over it), the Docks'
 * yards, the airport's landside, the kart park, the stadium's grounds and Southfield Yards
 */
export const HUMS = {
  trenches: { level: 0.8, fade: 40 },
  uptown: { level: 1 - UPTOWN_HUSH, fade: 30 },
  mall: { level: 0.7, fade: 40 },
  strip: { level: 0.8, fade: 30 },
  docks: { level: 0.5, fade: 40 },
  airport: { level: 0.45, fade: 50 },
  karts: { level: 0.4, fade: 40 },
  stadium: { level: 0.5, fade: 40 },
  yards: { level: 0.5, fade: 40 },
} as const;
/** How far past the airport's land the jets are listened for (their roar carries) */
export const JETS_REACH = 200;

type Rect = [number, number, number, number];
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** How far x, z is outside a rect (0 inside) */
const past = (r: Rect, x: number, z: number) => Math.hypot(Math.max(r[0] - x, x - r[2], 0), Math.max(r[1] - z, z - r[3], 0));
/** 1 inside a rect, easing to 0 from `a` to `b` past its edge */
const near = (r: Rect, x: number, z: number, a: number, b: number) => 1 - smooth(a, b, past(r, x, z));
const AVENUES = PLAN.streets.filter((s) => s.kind === 'avenue');
const EMPORIUM = DOORS.find((d) => d.id === 'emporium')!;
/** The waterfront's decks (The Trenches' boardwalk, Pier 7's neck and head, the market's deck) and the town's promenades along both banks */
const WATERFRONT: Rect[] = [...DECKS, [PROMENADE.x[0], PROMENADE.north[0], PROMENADE.x[1], PROMENADE.north[1]], [PROMENADE.x[0], PROMENADE.south[0], PROMENADE.x[1], PROMENADE.south[1]]];
const JETS = FLIGHTS.filter((f) => f.kind === 'jet');
const KART_RECT: Rect = [KART_PARK.x0, KART_PARK.z0, KART_PARK.x1, KART_PARK.z1];

/**
 * An airliner's roar at x, z at time `t` (seconds, the timetable's clock): the loudest of the jets rolling fast
 * (taking off or landing) or flying low nearby, by how far off it is; 0 past `JETS_REACH` of the airport's land
 */
export function jetsAt(x: number, z: number, t: number): number {
  if (past(SITE, x, z) > JETS_REACH) return 0;
  let roar = 0;
  for (const f of JETS) {
    const p = poseAt(f, t);
    if (p.power <= 0) continue;
    // Rolling: only at speed (taxiing is quiet); flying: only low
    const state = p.ground ? smooth(8, 20, p.v) : 1 - smooth(6, 40, p.y);
    if (state <= 0) continue;
    roar = Math.max(roar, state * (1 - smooth(20, JETS_REACH, Math.hypot(x - p.x, z - p.z))));
  }
  return roar;
}

/**
 * The layers at x, z; `lift` is how far above it the listener is (the City
 * view's camera): the beat fades with it as before, and the ground's layers
 * soften to a wash of the town; `t` is the clock (seconds) for the jets' timetable
 */
export function ambienceAt(x: number, z: number, lift = 0, t = Date.now() / 1000): Ambience {
  // Out of town: how far past the town's edge
  const ox = Math.max(CITY_EXT[0] - x, x - CITY_EXT[1], 0);
  const oz = Math.max(CITY_EXT[0] - z, z - CITY_EXT[1], 0);
  const out = Math.hypot(ox, oz);
  const city = 1 - smooth(0, 70, out);
  // (to the water's edges as they curve: river.ts)
  const [rn, rs] = edgesAt(x);
  const river = Math.max(rn - z, z - rs, 0);
  const water = 1 - smooth(3, 28, river);
  // The highway carries traffic all the way round; the avenues only inside it (out past it they're empty)
  let avenue = Infinity;
  if (insideHighway(x, z)) for (const s of AVENUES) avenue = Math.min(avenue, distToStreet(s, [x, z]));
  const road = Math.max(1 - smooth(10, 45, fromHighway(x, z)), 0.6 * (1 - smooth(4, 22, avenue)));
  const beat = 1 - smooth(8, 36, Math.hypot(x - EMPORIUM.x, z - EMPORIUM.z) + lift * 0.4);
  const k = 1 - 0.6 * smooth(20, 160, lift);
  // The Trenches: all of it inside, fading out over 30 past its edge
  const fromHood = inTrenches(x, z) ? 0 : past(TRENCH_RECT, x, z) + 4;
  // (and Endswood south of the highway, and Lot 9 south of it: their dogs, sirens far off; endswood.ts, lot9.ts)
  const fromLot9 = Math.min(inLot9(x, z) ? 0 : past(LOT9_RECT, x, z) + 4, inEndswood(x, z) ? 0 : past(ENDSWOOD_RECT, x, z) + 4);
  const hood = 1 - smooth(0, 30, Math.min(fromHood, fromLot9));
  let box = Infinity;
  for (const b of BOOMBOXES) box = Math.min(box, Math.hypot(x - b.x, z - b.z));
  // (Lot 9's radio by the fire pit, as a boombox's)
  box = Math.min(box, Math.hypot(x - LOT9_RADIO.x, z - LOT9_RADIO.z));
  const boombox = 1 - smooth(2, 20, box + lift * 0.5);
  const club = 1 - smooth(3, 32, Math.hypot(x - CLUB.door.x, z - CLUB.door.z) + lift * 0.5);
  // Westlake Park: all of it on its land, fading out over 30 past it; the lake lapping close by
  const fromPark = inPark([x, z]) ? 0 : past(WESTLAKE_RECT, x, z) + 4;
  const park = 1 - smooth(0, 30, fromPark);
  const fromLake = Math.max(0, Math.hypot(x - LAKE_C[0], z - LAKE_C[1]) - lakeR(Math.atan2(z - LAKE_C[1], x - LAKE_C[0])));
  const lake = 0.8 * (1 - smooth(2, 22, fromLake + lift * 0.4));
  // Uptown: a quieter hum on its land (fading in over 20 from its edge), the circle's traffic round it, the plaza's water
  const fromUptown = inUptown(x, z) ? 0 : past(UPTOWN_RECT, x, z);
  const hush = 1 - UPTOWN_HUSH * (1 - smooth(0, 20, fromUptown));
  const circle = 0.55 * (1 - smooth(2, 18, Math.abs(Math.hypot(x - CIRCLE.x, z - CIRCLE.z) - CIRCLE.r)));
  let wall = Infinity;
  for (const [a, c] of WALL_RUNS) wall = Math.min(wall, Math.hypot(x - WATER_WALL.x, z - Math.min(c, Math.max(a, z))));
  const pool = Math.max(0, Math.hypot(x - CENTRE[0], z - CENTRE[1]) - POOL.r);
  // Crestmont: all of it on its land, fading out over 30 past it; its fountains close by
  const crest = near(CREST_RECT, x, z, 0, 30);
  let spring = Infinity;
  for (const [fx, fz, r] of CREST_FOUNTAINS) spring = Math.min(spring, Math.max(0, Math.hypot(x - fx, z - fz) - r));
  const fountain = Math.max(1 - smooth(1.5, 18, Math.min(pool, wall) + lift * 0.5), 0.8 * (1 - smooth(1, 14, spring + lift * 0.5)));
  // Sunridge: all of it on its land, fading out over 30 past its wall
  const suburb = 1 - smooth(0, 30, inSunridge(x, z, 0) ? 0 : past(SUNRIDGE_RECT, x, z) + 2);
  // (the gardened districts: their lawns and walls take the wind)
  const lawns = Math.max(crest, suburb);
  // The Neon Mile: its crowd all over its land, fading over 25 past it; the casinos' chimes by their doors; the show's
  // music round the Gondolier's lake
  const strip = 1 - smooth(0, 25, inStrip(x, z) ? 0 : past(STRIP_RECT, x, z));
  let door = Infinity;
  for (const d of CASINO_DOORS) door = Math.min(door, Math.hypot(x - d.x, z - d.z));
  const casino = 1 - smooth(2, 16, door + lift * 0.5);
  const show = 1 - smooth(4, 55, past(SHOW_LAKE, x, z) + lift * 0.4);
  // Southfield Yards: on its land, fading out over 30 past it
  const yards = 1 - smooth(0, 30, inYards(x, z) ? 0 : past(YARDS_RECT, x, z));
  // The hum is the loudest of every built-up part's: the town's (hushed in Uptown and Sunridge, which it reaches),
  // Crestmont's and Sunridge's own, The Trenches', Uptown's and Uptown North's hushed, the mall's, the Neon Mile's,
  // the Docks', the airport's, the kart park's, the stadium's and Southfield Yards'
  const H = HUMS;
  const town = Math.max(
    city * hush * (1 - (1 - SUN_HUM) * suburb),
    CREST_HUM * crest,
    SUN_HUM * suburb,
    H.trenches.level * (inTrenches(x, z) ? 1 : near(TRENCH_RECT, x, z, 0, H.trenches.fade)),
    H.uptown.level * Math.max(near(UPTOWN_RECT, x, z, 0, H.uptown.fade), near(NORTH_RECT, x, z, 0, H.uptown.fade)),
    H.mall.level * near(MALL_AREA, x, z, 0, H.mall.fade),
    H.strip.level * (inStrip(x, z) ? 1 : near(STRIP_RECT, x, z, 0, H.strip.fade)),
    H.docks.level * near(DOCKS_RECT, x, z, 0, H.docks.fade),
    H.airport.level * near(SITE, x, z, 0, H.airport.fade),
    H.karts.level * near(KART_RECT, x, z, 0, H.karts.fade),
    H.stadium.level * near(STADIUM_BLOCK, x, z, 0, H.stadium.fade),
    H.yards.level * (inYards(x, z) ? 1 : near(YARDS_RECT, x, z, 0, H.yards.fade))
  );
  // The waterfront's decks and the promenades (the gulls, the foghorn), the market's deck after dusk
  let waterfront = 0;
  for (const r of WATERFRONT) waterfront = Math.max(waterfront, near(r, x, z, 2, 24));
  const market = near(MARKET_DECK, x, z, 1, 20);
  const docks = near(DOCKS_RECT, x, z, 0, 30);
  const jets = jetsAt(x, z, t);
  // Inside the mall's hall (a little way out of its doors too); the City view's camera over its roof hears none of it
  const indoor = near(HALL.rect, x, z, 0, 5) * (1 - smooth(HALL.h, HALL.h + 10, lift));
  const karts = near(KART_RECT, x, z, 0, 40);
  // The stadium's crowd on a match night (the polish plan's Phase 7): round the ground, carrying well past its block
  const stadium = matchOn(t * 1000) ? near(STADIUM_BLOCK, x, z, 0, 90) : 0;
  // Endswood: all of it on its land and the common down to Lot 9, fading over 25 past them; the studio's beat by its
  // door; the church's bell across the estate, fading over a long way
  const fromEnds = Math.min(inEndswood(x, z) ? 0 : past(ENDSWOOD_RECT, x, z) + 4, inCommon(x, z) ? 0 : past(COMMON, x, z) + 4) - 4;
  const ends = 1 - smooth(0, 25, Math.max(0, fromEnds));
  const studio = 1 - smooth(2, 18, Math.hypot(x - STUDIO.door[0], z - STUDIO.door[1]) + lift * 0.5);
  const bell = 1 - smooth(25, 170, Math.hypot(x - BELFRY[0], z - BELFRY[1]) + lift * 0.3);
  return {
    city: town,
    water: Math.max(water, lake) * k,
    road: Math.max(road, circle) * k,
    open: (1 - town) * (1 - 0.6 * lawns) * k,
    beat,
    hood: hood * k,
    boombox,
    club,
    park: park * k,
    fountain,
    crest: crest * k,
    suburb: suburb * k,
    strip: strip * k,
    casino,
    show: show * k,
    waterfront: waterfront * k,
    market: market * k,
    docks: docks * k,
    jets,
    indoor,
    yards: yards * k,
    karts: karts * k,
    stadium: stadium * k,
    ends: ends * k,
    studio,
    bell,
    wall: (1 - smooth(0, WALL_SOUND, Math.max(0, fromWall(x, z)))) * k,
  };
}
