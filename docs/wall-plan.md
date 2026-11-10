# The wall (the owner's call, 2026-11)

A 200 ft wall of solid concrete round Sector 7, standing past the grass at the
world's edge. It locks the city in at its size. The storyline will be a
dystopia, and the conditions for leaving the city come later, with the exits.
The skyline ring of tall dark towers that stood past the edge is retired.

Built one phase at a time, each with the owner's sign-off. Keep this plan up to
date. Roads don't change in this plan.

## The owner's answers (the planning round, 2026-11-10)

| Question | Answer |
| --- | --- |
| Why a wall? | A dystopia storyline: there are conditions to leave the city, to be worked out later. No copy on the wall says why. |
| Where it stands | **Past the grass**: its inner face 80 past `EXT` (-760 / 800 today), where the grass skirt used to end. |
| The skyline ring | **Removed**, all of it. The wall is the horizon. |
| Seen from town | **Always seen**: out of the haze, a band round every horizon. |
| The strip between the old edge and the wall | **Walk to the wall**: where walking and driving stop moves out to the wall's foot (Phase 3). |
| The face | **A smooth slab**: one clean grey face, barely any detail. Cold and blank. |
| The top | **Wire and cameras**: a parapet with razor wire and cameras on posts. No towers. |
| Beyond it | **Grey haze**: past the wall the land fades into a thick grey murk. Nothing to see. |
| "Lock in this city" | **The size is final**: the world never grows past the wall. New districts go inside it. |
| The river at the wall | **A barred culvert**: the water flows under the wall through a low arch with heavy bars, and boats stop at the bars. |
| At night | **Floodlit**: lights at its foot washing up the face, and the cameras' red dots along the top. |
| Exits | **Solid all round** for now. Each exit is placed when its story is ready. |
| How far past the edge | **80** (the grass's end). |
| The ground up to it | **Just grass**: the open land carries on unchanged to the wall's foot. |
| How thick | **8 tiles** (about 15 m). |

## The numbers

- 1 tile is about 1.8 m, so 200 ft (60.96 m) is `WALL_H`, about 33.9 tiles.
  That's nearly three times the Emporium's roof (12.5). Sector 7 Tower's
  roof (40) and mast (45), Orbit's mast (44) and a few of Uptown's tallest
  still stand over it, and the flight ceiling (72) clears it by far. The wall
  is the owner's exception to "under the Emporium".
- `WALL_INNER` is `EXT` 80 out on every side, and `WALL_OUTER` is 8 further.
  At -680 to 720 the land inside is 1,560 across, about 2.8 km.
- Everything is worked out from `EXT`, so the wall stands round the test
  run's bigger world (`npm run test:wide`) too.

## Phases

### Phase 1: the wall as data, the skyline gone (built, waiting on the owner's sign-off)

- `wall.ts` (DOM-free, tested in `tests/wall.test.ts`):
  - `WALL` (`out` 80, `thick` 8, `h` 200 ft) and `WALL_INNER` / `WALL_OUTER`.
  - `WALL_RUNS`: the four sides, which meet at the corners with no gap and
    no overlap.
  - `inWall()`, `fromWall()`, `WALL_CORNERS`.
  - `CULVERTS`: the river's band where it meets the west and east sides,
    kept for Phase 5.
- The skyline ring is gone: `buildSkyline()` and `SKYLINE_REACH` in world.ts,
  `SKYLINE` in bounds.ts, and the tiers' `skyline` counts.
- `SKY_RADIUS` is worked out from the wall's outer corners seen from town
  (about 1,130 today, was 1,090). `CAMERA_FAR` follows it.
- The grass skirt (`SKIRT` in world.ts) is `WALL.out`, so it still reaches the
  wall's foot.
- The tests hold:
  - the height;
  - the wall closed all round;
  - everything that exists well inside it (the walk limit, every street,
    block and slab, the airport, the kart park);
  - the culverts on the river;
  - the ground under it level;
  - the sky dome reaching past it.
- Nothing is drawn yet: until Phase 2 the horizon is open sky and haze.

### Phase 2: the wall drawn

- A smooth grey concrete slab (one plain toon colour with ink outlines),
  `WALL.h` tall and `WALL.thick` through, in pieces no longer than a tile
  (`tileBatch()`'s rule).
- A district loaded from anywhere (`LAZY_DISTRICTS`), or at the boot if it's
  cheap enough. Measure it.
- Out of the haze (`fog = false`, as the skyline was), so it's a band round
  every horizon. Check it isn't a flat cut-out from far off: the top edge and
  the corners must read.
- The grey haze beyond: past the outer face the land and sky fade into murk,
  so nothing past it is ever seen, from the air too.
- Open question: walking at one side, the far side is about 3 km off, past
  the sky dome (which travels with the camera). It needs either a dome far
  enough out from anywhere or the far wall drawn into the haze. Measure both.
- `?bench` and `?shots` views: the wall from downtown, from its foot, from the
  air.

### Phase 3: walk to the wall

- `WORLD_BOUNDS` moves out to the wall's inner face (less a small margin), so
  walking, driving, riding and the boat reach the wall's foot.
- The wall is solid in every grid (walking, the camera, bullets).
- Flying turns back short of the wall (`EDGE_TURN`) and never flies through
  it.
- The server's movement checks (`protocol.ts`) follow.
- City view's pan (`PAN_BOUNDS`) stays round the built-up area as it is.
- The strip stays grass, no trees and no roads (the owner's call: "just
  grass"; the outskirts' tree densities keep their measured land).
- The world map draws the wall.
- Tested at both sizes.

### Phase 4: the top and the night

- A parapet along the top with coils of razor wire (in the FX layer, so the
  ink doesn't draw black ropes) and cameras on posts.
- At night, floodlights at the foot washing up the face (kept under the
  bloom's threshold: the face never washes out), and the cameras' small red
  dots.
- Phones leave out the finest wire.

### Phase 5: the river and the culverts

- The river's channel carried on from the world's edge to the wall at both
  ends: the water, its banks and the quays.
- A low arch through the wall at each end with heavy bars. The water runs
  under it.
- Boats stop at the bars (`boat-sim.ts` `WATER_SOLIDS`), and the traffic's
  boats keep turning back where they do.
- The river's channel ends move from the edge to the bars.

### Phase 6: polish

- The sound by the wall (`ambience.ts`: wind, a low hum near it).
- The shots before and after, the bench on phones and desktops, and
  CLAUDE.md.

## Later, with the storyline (not in this plan)

- The exits, each placed when its story is ready, and the conditions to leave.
- Whatever watches from the wall.
- Any copy, signs or names on it (none until the owner gives them).
