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

### Phase 2: the wall drawn (built, merged)

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

The owner's go for Phases 3 to 6 ("complete all steps") came after Phase 2 was merged; they were built together and
merged as one.

### Phase 3: walk to the wall (built)

- **Walking and driving:** `WORLD_BOUNDS` (layout.ts) reaches the wall's foot. It
  stops `WALL_FOOT` (0.6) short of the inner face (`WALL_OUT` is the wall's 80 past
  the edge), so you cross the grass past the old edge right up to it. The ground
  there is flat grass (no trees, no roads: the owner's "just grass"), and the
  hills in the north-east corner run on to it.
- **The wall is solid:** `WALL_SOLIDS` (wall.ts), in `SOLIDS`, a box a side to its
  top. It stops walking, driving, the walk camera and bullets, and the game
  server's movement checks follow (protocol.ts reads `WORLD_BOUNDS`).
- **Flying keeps its old limit:** `FLY_BOUNDS`, 6 inside the old edge, which
  walk.ts hands to the aircraft. Its turn back (`EDGE_TURN`) starts well over 40
  short of the wall, so nothing flies near it.
- **City view** pans as it did: `PAN_BOUNDS` stays round the built-up area.
- **The world map:** the land out to the wall, the wall a cold grey band round it,
  open ground (a waypoint) anywhere you can walk.
- **The tests:** walking stops at the foot and never in it, and flying turns back
  well short of it. The solids and road tests skip the wall, which stands past
  every road's end. The collision grid's flying test uses `FLY_BOUNDS`, as the
  game does.

### Phase 4: the top and the night (built)

- **The slab, built face by face** (wall3d.ts `slabGeometry()`): the inner and outer
  faces, a parapet along each edge of the top (`TOP.parapet`, 1.2 over it), the
  walk between them. What's solid goes up to `WALL_TOP`.
- **Razor wire** coiled along both parapets: an upright ribbon with a coil texture
  in the FX layer, so the ink doesn't draw it as a rope. Phones carry the inner
  one only.
- **Cameras** (`CAMERAS`, every 48 along the inner parapet): each on a post,
  leaning out over the face and tilted down into the city, with a red dot by its
  lens, dim by day and bright at night.
- **Floodlights at the foot** (`FLOODS`, every 36 along the inner face, 1.6 out):
  a squat housing on a base, its lens lit at night. Each washes a cone of cold
  light up the inner face: the slab's shader draws it from the same spacing,
  widening and fading up the face, kept under the bloom's threshold.
- **Day and night every frame:** the night, the lenses, the dots and the murk's
  colour are set by `update()` from index.ts beside the city's own lights. The
  time of day isn't motion, so it runs under reduced motion too, when the city's
  ticks run on the first frame only.

### Phase 5: the river and the culverts (built)

- **The arches** (`CULVERTS`, `CULVERT` in wall.ts): where the river meets the wall
  at either end it runs on under it through a row of low arches.
  - Each arch is at most 12 across. It rises straight from the water to `spring`
    and curves to its crown at `crown` (`archY()`).
  - Piers stand between the arches and over the channel's slopes at each end.
  - A lintel runs across them all.
  - The frame is drawn in the slab's own concrete and haze.
- **The bars:** the dark under each arch, and its bars (rods 0.55 apart up to the
  arch, two rails across): one draw coloured per vertex.
- **The boats:** boat-sim.ts stops them at the bars (`BOAT_ENDS`), so the river is
  boated its whole length inside the wall. The traffic's boats turn back where they
  did. The river's water already ran to the wall's inner face (Phase 2).

### Phase 6: polish (built)

- **The sound:** ambience.ts `wall`. Near its foot (fading over `WALL_SOUND`, 70)
  the wind gusts harder against it, and there's a low hum in the concrete
  (sound.ts, brown noise through a low, narrow band, slowly swelling).
- **The views:**
  - `?bench` views `wall`, `wall-corner` and `wall-culvert`;
  - review views `wall-town`, `wall-foot`, `wall-culvert` and `wall-corner`
    (blendviews.ts).
  - Since the wall's views sit outside the City view's limits, the shots hold the
    camera for as long as a view is on (shots.ts `holding()`): the controls don't
    pull it back, and the pan doesn't clamp it.
- **Checked in the browser,** by day and at night: the foot, the top, the culvert
  and a corner.
- **What it costs:** seven draws at most (the slab, the culverts' dark, the wire,
  the fixtures, the lenses, the dots, the murk) and about 15k triangles, the
  cameras' and floodlights' boxes most of them. Nothing of it casts a shadow.

## Later, with the storyline (not in this plan)

- The exits, each placed when its story is ready, and the conditions to leave.
- Whatever watches from the wall.
- Any copy, signs or names on it (none until the owner gives them).
