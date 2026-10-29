# Crestmont: a north-east town in the style of Beverly Hills (the owner's call)

The owner wants a new town in the north-east, in the style of Beverly Hills:
ultra-premium buildings, palm trees and hills. It's the biggest district yet
and the first ground in Sector 7 that isn't flat, so it's built in phases,
each a PR with the owner's sign-off. Keep this plan up to date as each is
built.

Its name is **Crestmont** (the owner's pick; made up).

## Where

The open land outside the ring highway's north-east corner:

- **The Flats:** east of the highway's east side (x 275) out towards the
  world's edge (`EXT` 460), from the north bank avenue (z about 69) north to
  about z -60. Flat, a planned grid like Beverly Hills' flats. Downtown's
  east-west roads (z -9, 17, 43, 69) already run on past the highway here
  as plain continuations with no traffic: they become the Flats' streets.
- **The Hills:** north of the Flats, rising to the world's north-east
  corner (x 230 to 460, z -60 to -420), past the kart park's east and
  north sides (`KART_PARK` x 113-225, z -311.5 to -191.5). Winding roads,
  estates on terraces cut into the slopes, a ridge road along the crest.
- Today it's open land with the outskirts' trees and, further out, the
  pine woods (`WOODS`, `outskirts.ts`). The hills give the far skyline
  (`SKYLINE`) a backdrop on that side.

Nothing that exists moves (`tests/snapshot.test.ts`): the kart park, the
highway, its junctions and slips, the airport's land south of the river and
Palm Court stay as they are.

## The owner's answers

- **The name:** Crestmont.
- **The hills:** gentle, rising from the Flats at street level to about
  25-35 tiles (45-60 m) at the far corner. The buildings on them stay low
  (two or three storeys), so the Emporium stays the tallest building. The
  airliners' turn north past the runway and the aircraft you fly must clear
  the hills (the flight tests get the ground's height).
- **Places or scenery:** scenery first. Then a few places with pins and
  panels saying "coming soon", like the others: the grand hotel, the Drive,
  the overlook and the country club.
- **Landmarks:** the grand hotel, the civic hall, the country club, the
  overlook and the reservoir.
- **No sign on the hillside.** Keep the hills natural.
- **The metro:** yes. The line runs on from Kart Park station east over the
  highway to a Crestmont station by the Flats (Phase 9).

## The rules for it

- Made-up names only: shops, the hotel, the streets. No real brands,
  designers, hotels, people or celebrities (no "homes of the stars" tour of
  real people). Signs are fixed copy from atlases, never prices.
- Premium but it's the game: estates and shops are places and scenery, never
  pitched as an investment; any price is Dorras (Phase 10, if the owner
  wants it).
- Degen's style as everywhere: toon materials, ink outlines, flat shading,
  and the PulseChain neon at night (the Drive's signs, the pools lit, the
  palms uplit), bloom held to the rules (small things bright, big surfaces
  under the threshold).
- Built the city's way: DOM-free data with tests for everything the boot,
  walking, driving, the traffic and the server need; the drawing a district
  loaded as you approach (`LAZY_DISTRICTS`), its buildings as sites
  (`site()`), fine detail near only, far forms, phones lighter. The boot is
  at 651 of 670 KB: the town's data in the boot must stay small (Phase 1's
  ground is the one thing it can't do without).
- Fixed numbers written east of the highway and north of the river: no
  `SOUTH_SHIFT` / `WIDEN` (they're north of the river). Anything written
  against the world's edge works at both sizes (`npm run test:wide`).

## Phases

### Phase 0: decisions and measuring

- The owner's answers (above): done.
- A sketch of the land: the Flats' grid, the hill roads, the terraces, the
  landmarks, as a picture in `docs/` for sign-off (like the kart plan's).
- Bench views over the Flats and the hills (`BENCH_VIEWS`) so every phase
  measures before and after; the boot's budget room checked.

### Phase 1: the ground that rises (built)

**What's built:** `terrain.ts` (DOM-free, tested in `tests/terrain.test.ts`): `HILLS` (the foot at x 285 /
z -75, rising over `rise` to a `peak` of 26 tiles, a seeded `swell()` taking the ridge to about 32 tiles, 58 m,
falling away towards `end` past the world's north-east corner so the skyline ring stands on level ground),
`TERRAIN_RECT`, `heightAt()` (0 outside it: the tests hold every street, block, solid and place of the plan to
0), `slopeAt()` (0.68 at its steepest), `onHills()`, `LEVELS` (cut and fill, none yet: Phase 2's roads and
Phase 5-6's pads come through it) and `hillsAlong()` (where a ray first meets the hills). Read by: the ground
(world.ts `hillsPlane()`: the grass over the hills a grid a vertex every 2 tiles, tinted by height and slope,
`tintHills()`: the city's green in the valleys, sage up the slopes, pale gold over the ridge); walking (walk.ts
`groundAt()`, so driving, riding, the kart and flying follow it too; he keeps his feet going downhill); the walk
and chase cameras (`cameraRoom()` keeps above the slope); shots (solids.ts `rayBoxes()`, the server's too);
the outskirts' trees and the woods (world.ts `scatterOutskirts()`, set into the slope). The aircraft: none of
today's routes crosses the hills (the test holds any that does well over them). The boot's code grew 1 KB
(652.3 of 670).

**Left for later phases:** the world map doesn't shade the hills yet (Phase 2, with its streets); up on the
ridge the skyline ring's towers past the edge are near enough to look big (Phase 11: set them back behind the
hills, or lower there); the City view's camera can dip into a slope when it looks low across them (Phase 2).

**As planned:**

The whole world is flat today, at y 0 but for decks and bridges. This phase
makes ground that rises, and everything that stands or moves on the ground
follow it, with the hills empty.

- `terrain.ts` (DOM-free, tested in `tests/terrain.test.ts`): `HILLS_RECT`,
  `heightAt(x, z)` (0 everywhere outside it, so nothing else in the world
  changes; inside, smooth seeded hills easing up from the Flats to the
  corner, `slopeAt()` / `normalAt()`), with **cut and fill**: flat pads
  (`PADS`, each at its own height) and graded road corridors (`grade()`:
  a road's profile at most `MAX_GRADE`, its cross-section level) pressed
  into the hills, eased into the slope round them. Small enough for the
  boot (a few numbers and a noise, no height map).
- Everything reads it: the ground's mesh (world.ts, a grid per tile with
  its vertices on `heightAt()`, the grass shading by slope); walking
  (walk.ts `groundAt()`, steps no steeper than he can climb, the camera kept
  over the ground); your car, bike and kart (drive-sim.ts, the springs on
  the ground under each wheel, which `suspension.ts` already reads); the
  traffic and taxis (their y and pitch along a street, as on Harbour
  Bridge's hump); the crowd's feet; trees, lamps and sites placed on the
  ground (a site's base y); the collision boxes and bullets with a floor
  (`rayBoxes()`: boxes stand on the ground, the ground stops shots);
  flying (`floorAt()`); the shadows' box; the world map shaded by height
  with contours.
- The tests: 0 outside the rect, smooth (no step a walker or car can't
  take on a road), the pads flat, the roads within their grade, every
  aircraft's route well over the ground, the snapshot unchanged.
- Risks: the ink outlines on long slopes (check the depth pass), triangles
  per tile on phones, the far form of a hill (a coarser grid far).

### Phase 2: the streets (built)

**What's built:** `crestmont.ts` (DOM-free, tested in `tests/crestmont.test.ts`):
- **The Flats** east of the highway: five streets north from the north bank avenue (`FLATS_X`: Alder Way, **Coral
  Drive** (the shopping street, Phase 4), **Crestmont Boulevard** with a planted median for its palms
  (`BOULEVARD_MEDIAN`), Linden Way, Hollis Way) across downtown's four east-west roads (carried on past the
  highway, traffic on them now; lit junctions at the avenues), up to **Foothill Road** (`FOOTHILL_Z`) along the
  hills' foot; twenty blocks (`CREST_BLOCKS`), lawns inside their sidewalks for now.
- **The hill roads** (`HILL_ROADS`): smooth lines (`curve()`) graded (`grade()`: the hills' heights averaged,
  pinned level with the Flats at their feet and with each other where they meet, never steeper than
  `MAX_GRADE`, 14%): **Ridge Road** up from Hollis Way's top round the hills' east side and along the crest to
  the overlook, **Canyon Drive** up from Coral Drive's top to meet it square, and two cul-de-sacs off the ridge,
  **Summit Lane** and **Vista Lane**. Traffic goes up one and down the other; none on the cul-de-sacs or past
  Canyon Drive's top (they go nowhere). The plan's Sage Canyon Road was folded into Ridge Road: on its own it
  couldn't climb to the ridge at 14%. terrain.ts cuts each into the hills as a bed (`BED`: level across, its banks
  eased over 12 tiles; cut up to 8 deep where the grade lags the hills, banks up to about 1.4: Phase 3's
  retaining walls).
- **Lamps** (`CREST_LAMPS`): both sidewalks of the Flats' streets, one verge of the hill roads at their beds'
  height (their pools of light sit on the slope, world.ts).
- Joined to the street plan (`cityPlan()`; the highway's junctions on its east side get slip lanes on their outer
  corners, `OUTER_SLIPS`, but none over the river's promenade), so traffic, taxis (both riding the slopes:
  `riseAlong()` in terrain.ts), walking, the world map (the hills shaded by height with a contour every 5 tiles)
  and the sound read them. Drawn by `crestmont3d.ts`, a district loaded as you approach (`LAZY_DISTRICTS` id
  `crestmont`): asphalt, centre lines, the boulevard's median, zebras at the lit junctions; the hill roads laid on
  the ground's height with white edge lines. The outskirts' trees keep off the Flats and the hill roads.

**Fixed along the way:** a car reaching the end of a curved street took its direction from the street's first
stretch (routes.ts `tangent()`; only straight streets had ended at junctions before); a right turn at the highway
takes the wide slip-lane curve only where there's a slip lane (`slipAt()`). The traffic's routes are baked as
millimetre steps in one string (`packRoutes()`: 28 KB gzipped where the plain numbers made 53), so the boot is
smaller than before the phase (644.3 of 670 KB).

**Left for later:** stop signs up the hills and the Flats' kerbside dressing (Phase 3 on), the City view's camera
low across the slopes.

### Phase 3: palm trees and the landscape (built)

**What's built:** `landscape.ts` (DOM-free, tested in `tests/landscape.test.ts`), drawn by `landscape3d.ts` from
crestmont3d.ts's `register()`, a site a tile:
- **Palms** (`PALMS`, 79): tall fan palms (a bending trunk, a skirt of dead fronds, a small crown) down
  Crestmont Boulevard's median and along the Flats' streets on the lots' street edges, clear of the lamps and the
  junctions; canary date palms (a thick trunk, the crown's knob, long arching fronds) along Foothill Road and at the
  overlook; fan palms up Ridge Road's left verge. Their crowns sway in the wind; all under the Emporium over their
  own ground (`PALM_TALLEST`).
- **Jacarandas** in bloom (`JACARANDAS`, purple) along downtown's east-west roads through the Flats.
- **The hills' planting**: live oaks in the canyons and low slopes (`OAKS`, about 600), chaparral scrub in clumps
  up every slope (`SCRUB`, about 3,700; half on phones, near only there), seeded a cell at a time, off the hill
  roads and their beds. The outskirts' trees and the pine woods keep off the hills now (outskirts.ts `treeSpot()`).
- **The hill roads' edges** (`WALLS`): sandstone retaining walls with a pale cap along the bed's edge where the road
  is cut in (as high as the cut, eased from piece to piece along the road's grade), white post-and-rail guards
  where it stands out on fill.
- Nothing of it is solid. Working it out takes about 120 ms in Node when the district loads (the hill roads and
  the oaks in grids: `nearHillRoad()` is indexed now); a phone might take a few times that: bake it if it shows.

**Left for later:** hedges, lawns and garden palms on the estates come with them (Phases 5 and 6); the palms'
far forms on phones (they're drawn in full at every distance today).

**As planned:**

- Palm trees, new to the city: tall fan palms (the thin ones down the
  avenues), date palms (the fat crowns by the hotel and the estates) and
  short fan palms in gardens, each a few shapes in Degen's style (a curved
  segmented trunk, fronds as flat bent blades), instanced through
  `Batch.instances()` with a far form (crossed cards), the fronds swaying
  in the wind (`SWAY`, as the canopies), fewer on phones.
- The Flats: lines of palms down every street, clipped hedges, lawns,
  jacarandas. The hills: dry grass and scrub on the slopes, oaks in the
  canyons, retaining walls of stone and white render where the pads and
  roads are cut, the outskirts' trees and the woods kept off the town
  (`keepTreesOff()`).

### Phase 4: the Drive, the shopping street

- Low, polished boutiques (two or three storeys): white stone, glass,
  bronze, black-and-gold awnings, a short arcade with fountains and cobbles,
  window displays lit at night, made-up names (one sign atlas), flags,
  planters, kerbside valets with supercars and the town car parked
  (`parkedCars()`), café terraces. Built from kits and recipes like
  downtown's infill (new kits: the boutique, the arcade).

### Phase 5: the Flats' estates

- Big houses on big lots behind hedges and gates: Spanish Colonial (white
  render, red tile roofs, arches), Mediterranean villas, Tudor, Georgian
  and white modern, each on its lawn with a drive, a fountain, a pool out
  back. A house kit with styles and a recipe laying them on the blocks
  (`layBlock()`), the details near only.

### Phase 6: the hills' mansions

- Estates on the terraces from Phase 1: cantilevered glass moderns over
  the slope with infinity pools lit at night, villas with tiled terraces
  stepping down, a few gated compounds with long drives, the summit estate.
  Gates with columns and lamps, hedged walls, parked supercars. Each on a
  pad (`PADS`), its solids from its parts, every one under the Emporium.

### Phase 7: the landmarks

The owner's picks, scenery first, then each a place (spot, pin,
directory entry, a panel with Walk in, `PLACES` and `LIVE_PLACES` entries):

- **The grand hotel** in its gardens off the boulevard (a pastel
  hotel with a tower, a curving drive, palms, cabanas by the pool, its name
  in script on the roof).
- **The civic hall** at the end of the boulevard (a white tower with a
  tiled dome, a park in front, fountains).
- **The country club** (a golf course over the lower slopes: fairways and
  greens shaped into the ground, bunkers, a clubhouse, carts).
- **The overlook** on the ridge (a little park looking back over Sector 7,
  benches, viewers; no sign on the hillside, the owner's call).
- **The reservoir** in a canyon (still water, the city's water shader).

### Phase 8: its life, night and sound

- People: shoppers with bags on the Drive, valets and doormen, joggers and
  dog walkers on the hill roads, gardeners, people by the pools (acts from
  the crowd's rows). Traffic: more convertibles, coupes and the town car;
  a tour bus round the town (no real people's homes).
- Night: the palms uplit, the pools glowing, the Drive's windows and signs
  lit, the estates' windows.
- Sound (`ambience.ts`): a quiet hum, birds and sprinklers by day,
  crickets and an owl at night, fountains on the Drive.

### Phase 9: getting there

- The town's places on the world map, taxis and fast travel.
- The metro (the owner's call): the line on from Kart Park station east
  over the highway to **Crestmont** station by the Flats (`metro.ts`: a new
  track end, pillars on open land or a median, the station's stair tower
  on the ground's height; the timetable's `LEGS` gain the run out and back).

### Phase 10 (optional, the owner's call): an estate of your own

- Buy a mansion for Dorras (a game number, never an investment), a garage
  at it for your cars and bike, a place on the business card. Planned
  separately with `docs/tycoon-plan.md` if the owner wants it.

### Phase 11: polish and performance

- Every width (320 to 1440), both tiers, day and night; the bench before
  and after; phones lighter (half the palms, simpler estates far, no pool
  glow); far forms for the estates and hotel if the district's draws need
  them.
