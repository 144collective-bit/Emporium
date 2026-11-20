/*
 * What stands in Degen's house, floor by floor (DOM-free; docs/compound-plan.md, docs/interior-plan.md): the room on
 * the ground floor (`FURNITURE`), upstairs (`UPSTAIRS`) and the basement (`BASEMENT`). Out of the boot in its own small
 * chunk (the owner's call, 2026-11-19: the first download was full). It imports nothing (a module the boot shares with
 * a chunk of its own is split off the boot's, which costs more than it saves): the house's measurements come in as
 * `HOUSE_GEO` (home.ts), and `houseRooms()` lays the lists out from them. index.ts fetches it as the city starts and
 * hands the lists to home.ts's `homeWall()` (`setRooms()`); home3d.ts draws from them. The house's shell, its floors'
 * heights, its doors and its prompts stay in home.ts, in the boot.
 */
import type { HouseGeo } from './home';
import type { Rect } from './endswood';

export interface Furniture {
  kind: FurnitureKind;
  rect: Rect;
  h: number;
}

export interface UpThing {
  kind: UpKind;
  rect: Rect;
  h: number;
}

export interface BaseThing {
  kind: BaseKind;
  rect: Rect;
  h: number;
}

/** A thing in the room: its footprint, how tall, and what it is (home3d.ts draws each kind) */
export type FurnitureKind =
  | 'stairs'
  | 'sofa'
  | 'chaise'
  | 'armchair'
  | 'table'
  | 'media'
  | 'lamp'
  | 'plant'
  | 'trophies'
  | 'counter'
  | 'fridge'
  | 'island'
  | 'stools'
  | 'console'
  | 'boots'
  | 'laundry'
  | 'oven'
  | 'dining'
  | 'chair';

export type UpKind =
  | 'wall'
  | 'well'
  | 'bed'
  | 'bedside'
  | 'bench'
  | 'tv'
  | 'rails'
  | 'drawers'
  | 'shoes'
  | 'caps'
  | 'mirror'
  | 'desk'
  | 'chair'
  | 'shelf'
  | 'plant'
  | 'vanity'
  | 'toilet'
  | 'shower'
  | 'towels';

export type BaseKind = 'steps' | 'vault' | 'tv' | 'table' | 'sofa' | 'beanbag' | 'arcade' | 'desk' | 'chair' | 'tower' | 'bar' | 'barshelf' | 'stools' | 'fridge' | 'plant';


/** The way through the room from the front door to the side door, kept clear: this wide */
export const HALL_W = 1.25;

/** The house's rooms laid out on its measurements (worked out once) */
export type HouseRooms = ReturnType<typeof layOut>;
let made: HouseRooms | undefined;
export const houseRooms = (g: HouseGeo) => (made ??= layOut(g));

function layOut(g: HouseGeo) {
  const { ROOM, CEIL, UP_Y, UP_CEIL, BASE_Y, BASE_CEIL, HOME, WARDROBE_RECT, VAULT_RECT, DESK_CHAIR_RECT } = g;
  const [rx0, rz0, rx1, rz1] = ROOM;

  /** The front door's place along the front wall */
  const DX = HOME.door[0];
  /**
   * The room, refitted (docs/compound-plan.md Phase 2) and fitted out (docs/interior-plan.md Phase 1, the owner's
   * call: the telly on the wall, not in the middle): **the lounge** in its west half (the media wall on the west wall,
   * the telly mounted on it over a long low fire between lit niches; the corner sofa facing it, its long run with its
   * back to the hall and a chaise at its south end; an armchair under the front window, an arc lamp by it, a coffee
   * table on a rug; **the trophy wall** along the west wall past the media wall); **the kitchen** along the back wall
   * (the counter, the fridge at its end, a plant at its west end, an island with its stools on the lounge's side);
   * **the hall** from the front door to the side door, clear (a console table under the front window east of the door,
   * a plant in its back corner), the stairs open along the east wall by the front and the wardrobe past them. The stash
   * is the den's vault now (`BASEMENT`)
   */
  const FURNITURE: Furniture[] = [
    { kind: 'stairs', rect: [rx1 - 0.95, rz0, rx1, rz0 + 2.8], h: CEIL },
    { kind: 'media', rect: [rx0, rz0 + 0.7, rx0 + 0.16, rz0 + 3.6], h: CEIL },
    // (the sofa's run facing west at the media wall, the chaise turning its south end toward it; he wakes in front of
    // the run, `HOME_WAKE`)
    { kind: 'sofa', rect: [rx0 + 2.7, rz0 + 0.85, rx0 + 3.44, rz0 + 3.55], h: 0.42 },
    { kind: 'chaise', rect: [rx0 + 1.8, rz0 + 2.83, rx0 + 2.7, rz0 + 3.55], h: 0.42 },
    { kind: 'armchair', rect: [rx0 + 0.95, rz0 + 0.08, rx0 + 1.65, rz0 + 0.78], h: 0.44 },
    { kind: 'lamp', rect: [rx0 + 0.65, rz0 + 0.1, rx0 + 0.9, rz0 + 0.35], h: 1.05 },
    { kind: 'table', rect: [rx0 + 1.15, rz0 + 1.65, rx0 + 1.95, rz0 + 2.65], h: 0.2 },
    { kind: 'trophies', rect: [rx0, rz0 + 3.85, rx0 + 0.22, rz0 + 4.95], h: 1.1 },
    { kind: 'plant', rect: [rx0 + 0.06, rz0 + 5.02, rx0 + 0.36, rz0 + 5.32], h: 0.75 },
    { kind: 'console', rect: [DX + 0.75, rz0, DX + 2.05, rz0 + 0.3], h: 0.36 },
    { kind: 'island', rect: [rx0 + 1.0, rz1 - 1.85, rx0 + 3.2, rz1 - 1.25], h: 0.48 },
    { kind: 'stools', rect: [rx0 + 1.15, rz1 - 2.25, rx0 + 3.05, rz1 - 1.88], h: 0.3 },
    // The kitchen (docs/interior-plan.md Phase 2): the oven's tall unit at the back wall's west end, the run with its sink
    // under the window, the fridge's tall unit at its east end (the island with its hob and stools, above)
    { kind: 'oven', rect: [rx0, rz1 - 0.6, rx0 + 0.7, rz1], h: 1.12 },
    { kind: 'counter', rect: [rx0 + 0.75, rz1 - 0.6, rx0 + 4.6, rz1], h: 0.52 },
    { kind: 'fridge', rect: [rx0 + 4.66, rz1 - 0.66, rx0 + 5.26, rz1], h: 1.12 },
    // Dining for four in the corner east of the hall, clear of the way to the side door and to the stairs
    { kind: 'dining', rect: [DX + 1.1, rz0 + 3.3, DX + 2.5, rz0 + 3.95], h: 0.4 },
    { kind: 'chair', rect: [DX + 1.25, rz0 + 2.9, DX + 1.6, rz0 + 3.25], h: 0.5 },
    { kind: 'chair', rect: [DX + 1.95, rz0 + 2.9, DX + 2.3, rz0 + 3.25], h: 0.5 },
    { kind: 'chair', rect: [DX + 1.25, rz0 + 4.0, DX + 1.6, rz0 + 4.3], h: 0.5 },
    { kind: 'chair', rect: [DX + 1.95, rz0 + 4.0, DX + 2.3, rz0 + 4.3], h: 0.5 },
    // The boot room by the side door (docs/interior-plan.md Phase 4): the bench under his coats north of it, the laundry's
    // tall unit in the corner south of it; both clear of the way out
    { kind: 'boots', rect: [rx1 - 0.45, rz0 + 3.0, rx1, rz0 + 4.1], h: 0.24 },
    { kind: 'laundry', rect: [rx1 - 0.65, rz1 - 0.9, rx1, rz1], h: 1.12 },
  ];

  /* ---------- Upstairs (Phase 3) ---------- */

  /** The partition between the landing (east, by the stairs) and his two rooms, and between the bedroom (front) and the office (back) */
  const LAND_X = rx1 - 2.6;
  const SPLIT_Z = rz0 + 3.0;
  const PART = 0.05;
  /**
   * Upstairs (docs/compound-plan.md Phase 3; fitted out, docs/interior-plan.md Phase 3), on the slab over the room:
   * **the landing** along the east wall (the stairwell over the stairs, railed, with the steep steps on up to the roof's
   * hatch over it; the bathroom's doorway at its back end, a pocket door slid away), **the dressing room** off it at
   * the front (walked through to the bedroom: lit rails along its back, an island of drawers before the window, his
   * shoe wall, his caps, a tall mirror; the wardrobe's prompt is here now), **the bedroom** past it at the front (the
   * bed's head on the green wall, bedside tables, a bench at its foot, the telly on the wall facing it), **the office**
   * at the back (the desk against the back wall with its screens and chair: its prompt opens the business card; a
   * bookshelf, a plant), **the bathroom** behind the landing (a toilet, a double basin under a lit mirror, a walk-in
   * shower behind a steel-framed screen, a towel rail). Partitions to the ceiling with a doorway into each room. Its
   * own list, asked by `homeWall()` up there
   */
  /** The doorways in the landing's partition, into the dressing room and into the office (from, to along z) */
  const UP_DOORS: [number, number][] = [
    [rz0 + 1.2, rz0 + 2.1],
    [rz0 + 4.1, rz0 + 5.0],
  ];
  const UH = UP_CEIL - UP_Y;
  /** The partition between the dressing room (east) and the bedroom (west), clear of the middle front window, and its doorway (z from, to) */
  const DRESS_X = rx0 + 3.15;
  const BED_DOOR: [number, number] = [rz0 + 2.0, rz0 + 2.85];
  /** The bathroom's doorway in its wall at the landing's back (x from, to) */
  const BATH_DOOR: [number, number] = [rx1 - 1.8, rx1 - 1.1];
  const BATH_Z = rz0 + 5.1;
  const UPSTAIRS: UpThing[] = [
    // The partitions: the landing's (but for its two doorways), the one between the rooms, the dressing room's from the
    // bedroom (but for its doorway), the bathroom's at the landing's back (but for its doorway)
    { kind: 'wall', rect: [LAND_X - PART, rz0, LAND_X + PART, UP_DOORS[0][0]], h: UH },
    { kind: 'wall', rect: [LAND_X - PART, UP_DOORS[0][1], LAND_X + PART, UP_DOORS[1][0]], h: UH },
    { kind: 'wall', rect: [LAND_X - PART, UP_DOORS[1][1], LAND_X + PART, rz1], h: UH },
    { kind: 'wall', rect: [rx0, SPLIT_Z - PART, LAND_X - PART, SPLIT_Z + PART], h: UH },
    { kind: 'wall', rect: [DRESS_X - PART, rz0, DRESS_X + PART, BED_DOOR[0]], h: UH },
    { kind: 'wall', rect: [DRESS_X - PART, BED_DOOR[1], DRESS_X + PART, SPLIT_Z - PART], h: UH },
    { kind: 'wall', rect: [LAND_X + PART, BATH_Z, BATH_DOOR[0], BATH_Z + 0.1], h: UH },
    { kind: 'wall', rect: [BATH_DOOR[1], BATH_Z, rx1, BATH_Z + 0.1], h: UH },
    // The stairwell over the stairs, railed (the steps on up to the hatch rise in it)
    { kind: 'well', rect: [rx1 - 0.95, rz0, rx1, rz0 + 2.8], h: 0.45 },
    // The bedroom: the bed's head on the west wall, a bedside table each side, a bench at its foot, the telly facing it
    { kind: 'bed', rect: [rx0, rz0 + 0.7, rx0 + 1.45, rz0 + 2.0], h: 0.3 },
    { kind: 'bedside', rect: [rx0, rz0 + 0.25, rx0 + 0.34, rz0 + 0.62], h: 0.24 },
    { kind: 'bedside', rect: [rx0, rz0 + 2.08, rx0 + 0.34, rz0 + 2.45], h: 0.24 },
    { kind: 'bench', rect: [rx0 + 1.6, rz0 + 0.85, rx0 + 1.9, rz0 + 1.85], h: 0.2 },
    { kind: 'tv', rect: [DRESS_X - PART - 0.05, rz0 + 0.85, DRESS_X - PART, rz0 + 1.85], h: 0.9 },
    // The dressing room: the rails along its back (the wardrobe's prompt), the drawers, the shoe wall, the caps, the mirror
    { kind: 'rails', rect: WARDROBE_RECT, h: 1.05 },
    { kind: 'drawers', rect: [rx0 + 3.95, rz0 + 0.5, rx0 + 5.15, rz0 + 0.9], h: 0.42 },
    { kind: 'shoes', rect: [LAND_X - PART - 0.32, rz0 + 0.08, LAND_X - PART, rz0 + 1.1], h: 1.05 },
    { kind: 'caps', rect: [DRESS_X + PART, rz0 + 0.25, DRESS_X + PART + 0.12, rz0 + 1.85], h: 0.95 },
    { kind: 'mirror', rect: [LAND_X - PART - 0.05, rz0 + 2.15, LAND_X - PART, rz0 + 2.5], h: 1.1 },
    // The office
    { kind: 'desk', rect: [rx0 + 1.4, rz1 - 0.55, rx0 + 3.4, rz1], h: 0.38 },
    { kind: 'chair', rect: DESK_CHAIR_RECT, h: 0.5 },
    { kind: 'shelf', rect: [rx0, SPLIT_Z + PART + 0.3, rx0 + 0.3, SPLIT_Z + PART + 1.7], h: 1.0 },
    { kind: 'plant', rect: [LAND_X - PART - 0.4, rz1 - 0.4, LAND_X - PART - 0.1, rz1 - 0.1], h: 0.7 },
    // The bathroom: the toilet and the double basin along its back wall, the shower's screen, the towel rail
    { kind: 'toilet', rect: [LAND_X + PART + 0.05, rz1 - 0.4, LAND_X + PART + 0.35, rz1], h: 0.28 },
    { kind: 'vanity', rect: [rx1 - 2.2, rz1 - 0.4, rx1 - 0.95, rz1], h: 0.42 },
    { kind: 'shower', rect: [rx1 - 0.9, rz1 - 0.7, rx1 - 0.86, rz1], h: 1.1 },
    { kind: 'towels', rect: [LAND_X + PART + 0.1, BATH_Z + 0.1, LAND_X + PART + 0.6, BATH_Z + 0.16], h: 0.8 },
  ];

  /* ---------- The basement (docs/compound-plan.md Phase 4) ---------- */

  /**
   * His basement, his trading den (the owner's call: "a basement that he uses to trade in. A real degen man cave"):
   * under the house, a room's height (`BASE_Y` to `BASE_CEIL`), down steps under the open stairs (their way down a fade,
   * `home:cellar`). **The trading desk** along the back wall: six screens on arms (made-up charts, no words, numbers or
   * names: home3d.ts `denCharts()`), his chair, the tower with its lit side; **the cave**: a wall-hung telly on the front
   * wall, a low sofa facing it across a table, a beanbag, a bar along the east wall (its counter, a lit shelf of made-up
   * bottles behind it, stools, a mini fridge), an arcade cabinet on the west wall, a plant. Looks only: nothing in it does
   * anything in the game. Its own list, asked by `homeWall()` down there
   */
  const BH = BASE_CEIL - BASE_Y;
  const BASEMENT: BaseThing[] = [
    // The steps down, along the east wall from under the stairs (their top at the front, at the room's floor)
    { kind: 'steps', rect: [rx1 - 0.95, rz0, rx1, rz0 + 2.2], h: BH },
    // The cave: the telly on the front wall, the table, the sofa facing it, a beanbag
    { kind: 'tv', rect: [rx0 + 1.0, rz0, rx0 + 3.0, rz0 + 0.12], h: 0.9 },
    // The stash's vault (docs/interior-plan.md Phase 1, the owner's pick): a round steel door in the north wall
    { kind: 'vault', rect: VAULT_RECT, h: 0.95 },
    { kind: 'table', rect: [rx0 + 1.55, rz0 + 0.75, rx0 + 2.45, rz0 + 1.2], h: 0.2 },
    { kind: 'sofa', rect: [rx0 + 0.8, rz0 + 1.55, rx0 + 3.2, rz0 + 2.25], h: 0.42 },
    { kind: 'beanbag', rect: [rx0 + 3.5, rz0 + 1.0, rx0 + 4.0, rz0 + 1.5], h: 0.25 },
    { kind: 'arcade', rect: [rx0, rz0 + 3.0, rx0 + 0.5, rz0 + 3.55], h: 1.0 },
    // The trading desk along the back wall, his chair, the tower
    { kind: 'desk', rect: [rx0 + 1.6, rz1 - 0.6, rx0 + 4.8, rz1], h: 0.38 },
    { kind: 'chair', rect: [rx0 + 2.95, rz1 - 1.15, rx0 + 3.45, rz1 - 0.65], h: 0.55 },
    { kind: 'tower', rect: [rx0 + 4.9, rz1 - 0.5, rx0 + 5.15, rz1 - 0.05], h: 0.4 },
    // The bar along the east wall: the counter, the lit shelf behind it, the stools, the mini fridge
    { kind: 'bar', rect: [rx1 - 0.8, rz0 + 3.3, rx1 - 0.4, rz0 + 5.3], h: 0.5 },
    { kind: 'barshelf', rect: [rx1 - 0.25, rz0 + 3.3, rx1, rz0 + 5.3], h: 1.05 },
    { kind: 'stools', rect: [rx1 - 1.2, rz0 + 3.5, rx1 - 0.85, rz0 + 5.1], h: 0.3 },
    { kind: 'fridge', rect: [rx1 - 0.55, rz1 - 0.55, rx1, rz1], h: 0.45 },
    { kind: 'plant', rect: [rx0 + 0.05, rz1 - 0.4, rx0 + 0.35, rz1 - 0.1], h: 0.7 },
  ];
  return { FURNITURE, UPSTAIRS, BASEMENT, UP_DOORS, DRESS_X, BED_DOOR, BATH_DOOR, BATH_Z };
}
