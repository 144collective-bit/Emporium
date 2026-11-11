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
| Its colour (Phase 2) | **Cold blue-grey** (the most dystopian). |
| Its face up close (Phase 2) | **Plain and blank**: no joints, matching "smooth slab". |
| The haze beyond (Phase 2) | **A little land shows** past the wall before the haze takes it. |
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

### Phase 1: the wall as data, the skyline gone (built)

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

### Phase 2: the wall drawn (built, waiting on the owner's sign-off)

- `wall3d.ts` (`buildWall()`, at the boot: it's seen from everywhere), two draws:
  - **The slab**: each side a box from the ground to `WALL.h`, in one toon material of
    its own (`WALL_LOOK.face`, cold blue-grey, a blank face). It casts no shadows and
    nothing of it is solid yet (Phase 3).
  - **Its haze**: its own fog in place of the city's. It takes only `WALL_LOOK.std`
    (half) of the city's haze, so it stands out of it and is seen from town as a
    band round every horizon. Far off (`WALL_HAZE`, from 0.8 of the sky dome's radius
    to just past it) it fades all the way into the sky's horizon. So the far side,
    seen from the opposite wall about 3 km off, is haze, not an edge cut by the sky
    dome. From town every side's middle stands clear; the far corners go hazy.
  - **The murk** (`BEYOND`): four upright sheets past the outer face (16 to 84 out),
    110 tall, thick at the ground and thinning upwards. Their cold grey takes the
    horizon's brightness, so they're pale by day and dark at night, but always grey
    against the blue. They fade off far away with the wall. It's one transparent mesh
    in the FX layer, so no ink is drawn on it.
- The land past the wall: world.ts `buildGround()` carries the grass on, a tile at a
  time, to `WALL_LAND` (120 past the outer face).
- `SKY_RADIUS` reaches the land's corners from town (about 1,300; `CAMERA_FAR` 40
  further).
- Checked in the browser, by day and at night:
  - from downtown looking west and north;
  - from the wall's foot;
  - from the air over it;
  - at a corner.
- What's seen over the wall's top is the murk. The strip of land before it shows only
  from very high: flying tops out at 72 and turns back about 100 inside the wall, and
  from there the wall's top hides the first 100 or so past it. Phase 3 (walking to
  the wall) doesn't change that.
- The review views and the bench views for the wall come in Phase 6.

### Phase 3: walk to the wall (built, waiting on the owner's sign-off)

- `WORLD_BOUNDS` (layout.ts) is the wall's foot: `WALL_OUT` (80, the wall's
  `out`) past `EXT`, less `WALL_MARGIN` (1). Walking, driving and riding go
  over the grass to it; the server's movement checks (`protocol.ts`
  `WORLD`) follow by themselves.
- The wall is solid in every grid (`WALL_SOLIDS` in wall.ts, in solids.ts
  `SOLIDS`): walking, the walk camera, driving, flying and bullets.
- Flying turns back short of the wall (`EDGE_TURN` inside the walk limit)
  and never flies through it, low or high (the test flies each aircraft
  straight at every side).
- The river already ran on to the wall's inner face in the drawing
  (`riverWater()` / `riverBanks()` to the grass's end); now a boat runs on to
  it too (boat-sim.ts `END`), and a car's river walls go on to it
  (drive-sim.ts `RIVER_WALLS`). The culverts are still Phase 5's: the
  channel's end is the wall's face until then.
- City view's pan (`PAN_BOUNDS`) is as it was (held by the test).
- The strip stays grass, no trees and no roads.
- The world map draws the wall as a frame round the land, the land and the
  river out to it, and pans and zooms out to it; a waypoint can go anywhere
  you can walk.
- Tested at both sizes (`tests/wall.test.ts`: the walk limit at the wall's
  foot, solid in every grid and to bullets, the aircraft turning back, a
  boat and a car's river walls reaching it). The tests that held the old
  edge now hold the wall's (layout, protocol, drive, solids); the collision
  grid's random spots stay on the land inside the edge, where the boxes are.
- Checked in the browser: standing at the west wall's foot, and the world
  map with the wall round it.

### Phase 4: the top and the night (built, waiting on the owner's sign-off)

- **The top** (wall.ts `TOP`, `EDGES`, `onEdge()`): a concrete parapet along
  both edges, 1.1 high, in the slab's own material (one draw with it); coils
  of razor wire along the inner one, a big coil and a thinner strand on top
  (wall3d.ts `wireMesh()`: an open tube along each side with the coils on a
  cut-out texture repeating along it, in the FX layer, so the ink doesn't
  draw black ropes; phones leave the strand out); cameras on posts along the
  inner edge every 64, kept 24 clear of the corners, each an arm and a
  housing out over the city, looking in (`CAMERAS`, `lookIn()`).
- **At night** (`FLOOD`, `FLOODS`): a floodlight housing against the inner
  face at its foot every 36, clear of the corners and the culverts, solid and
  low enough to see over (`FLOOD_SOLIDS`, in `SOLIDS`); each washes a soft fan
  of cool light up the face (`washMesh()`: added light in the FX layer, its
  strength from the tick's `night`, nothing by day, well under the bloom's
  threshold so the face never washes out). The cameras' red dots and the
  floodlights' lenses are two small meshes lit at night through `lit()`.
- The cameras, the housings and the culverts' bars are one dark steel mesh
  in the wall's own haze: the wall is now six draws (the slab, the steel,
  the dots, the lenses, the wire, the wash) and the murk.

### Phase 5: the river and the culverts (built, waiting on the owner's sign-off)

- The river runs on through the wall: its water and banks (world.ts
  `riverWater()` / `riverBanks()`) from 30 past the outer face at either end
  (`RIVER_PAST`, into the murk, where the channel's end is walled), the land
  past the wall cut round it.
- **The culverts** (wall.ts `ARCH`, `ARCH_SPAN`, `archTop()`): over the
  river's band at the west and east sides the wall is an outline from under
  the water (`CULVERT_FLOOR`, a sill below it) to the top with a low arch cut
  through it (wall3d.ts `culvertGeometry()`): its sides straight up from
  under the water to 3.2, a flat segmental arch 2.6 more to its crown, 2 in
  from the band's edges.
- **The bars** in the wall's middle (`CULVERT_X`, `ARCH.bars`): uprights 1.1
  apart, 0.11 thick, from under the water to the arch, two rails across.
  The boats stop at them (`CULVERT_BARS` in boat-sim.ts `WATER_SOLIDS`; the
  hire boat's ends are now the wall's outer face, so the bars are what stops
  it). The traffic's boats keep turning back well inside, as they did.
- Walking and driving still stop at the wall's foot (Phase 3): the wall's
  solids are the full ring, the culverts included.

### Phase 6: polish (built, waiting on the owner's sign-off)

- **The sound by the wall** (ambience.ts `wall`, `WALL_SOUND` 70): full at
  its foot, fading out over the strip, none in town; sound.ts blows the wind
  harder along its face and adds a low hum off its concrete (a layer made the
  first time it's heard).
- **The views**: `wall-foot`, `wall-culvert` and `wall-corner` in the bench's
  `BENCH_VIEWS` and the review shots' `BLEND_VIEWS`, from `WALL_INNER`, so they
  stand where the wall does at either world size.
- **Checked** in a local build (swiftshader, desktop tier): the top's cameras
  and wire from the wall's foot, the culvert with its bars and the water
  running under it from the north bank, and the floodlights' wash at night.
  The bench on a real phone and laptop, and the full `npm run shots` contact
  sheets, are for the owner's devices: the views are in for them.
- The boot's code is 697.6 of 740 KB (694.8 before Phases 4-6).

## Later, with the storyline (not in this plan)

- The exits, each placed when its story is ready, and the conditions to leave.
- Whatever watches from the wall.
- Any copy, signs or names on it (none until the owner gives them).
