# The city, its layout and the world

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- The homepage is Sector 7 in 3D, in Degen's style (black ink outlines,
  flat cartoon shading, PulseChain neon):
  - **3D** (`src/scripts/city3d/`, three.js): toon materials, ink outlines
    from a normal/depth post-pass, bloom, day/night (midday by default,
    the visitor's clock on Live),
    weather, traffic, people, optional synthesised sound. Clicking a
    building flies the camera in and opens a glass panel.
  - **The 2D map was retired** (the owner's call, river plan step 1): no
    loading poster, no 2D view, no fallback. Where 3D can't run (no WebGL
    2, or `bootCity()` returns null) the page shows a card saying The
    Trenches needs a device with 3D graphics (`[data-no3d]`, `no3d()` in
    `CityMap.astro`; `data-view` is `loading`, then `3d` or `none`). A
    running city whose GPU context is lost (`webglcontextlost` on the
    renderer's canvas, index.ts) stops its loop and sound and shows the
    same card saying its 3D graphics stopped, with a Reload button.
    `src/lib/city.ts` holds only the place ids (`SpotId`) and pin copy type.
    Don't bring the 2D map back without the owner.
  Pin copy and panel copy live in `src/components/CityMap.astro`.
- **Buildings are places in the city's game** (the owner's call): each opens
  its own panel (a game menu), never the comic page or an outside link. The comic page (`/emporium`), the merch store and X /
  Telegram live in the hub's Map tab only. Places not built yet say "coming soon"
  (the plan is `docs/tycoon-plan.md`).
- **The redesign** (the owner's call): the city is moving from a grid to an
  organic layout, planned downtown and looser further out (diagonals, varied
  blocks, walk-only alleys, one big hangout square a block from the
  Emporium, smaller squares further out). The plan and its phases are
  `docs/city-plan.md`; keep it up to date, one phase at a time with the
  owner's sign-off. The street plan as data is `streetplan.ts` (DOM-free:
  streets as centre lines with a kind and width, crossings, block outlines
  and their slabs (`outset()`, `onSlab()`), plazas; `PLAN` is `cityPlan()`,
  tested in `tests/streetplan.test.ts`). Phases 2 (downtown) and 3 (the
  outer districts) are built; Phase 4 is polish. Prices of lots don't
  change in the redesign.
- **Downtown** is `downtown.ts` (DOM-free; the 3D city, the plan,
  collisions and the server read it), drawn by `infill.ts`:
  - 0-60 on both axes inside the ring, cut in thirds by the cross streets at
    17 and 43 (`CORE_ROADS`, lit junctions). Three diagonals (`DIAGONALS`)
    run in from the ring's north-west, north-east and south-west corners to
    the cross streets, cutting those corner blocks into triangles
    (`BLOCKS_DT`): three pocket parks (`PARKS`) and three of infill.
  - The landmarks keep their 9 x 9 lots (`SEATS` in `layout.ts`): the
    Emporium on the centre block fronting the south cross street, the Signal
    tower and the Apartments in the north block, the Post office and the
    Vault in the west, Drop 001 and the Workshop in the east, the Armoury in
    the south-east. Every landmark fronts south (+z); the Post office and
    Drop 001 front walk-only courtyard lanes (`LANES`).
  - Round them, tight rows of infill (`INFILL`) with walk-only alleys
    between (`ALLEYS`, two bollards at the mouth: Degen gets through, no car
    does; dressed with a wall lamp and its pool of light (`ALLEY_LAMPS`,
    `addPool()` in `world.ts`), a drainpipe, and pallets, crates and a bin
    (`ALLEY_PROPS`, solid, against the walls so the middle stays clear)). Each building has a type (`InfillType`, drawn by `building()` in
    `infill.ts`): brownstone walk-ups (stoop,
    bay window, bracketed cornice), shops (fascia sign, striped awning, blade
    sign, fire escapes), diners (rooftop sign, tables out front), lofts
    (roll-up doors, sawtooth roofs), offices (glass tower set back on a
    podium, lit crown, mast) and hotels (balconies, canopy, vertical sign).
    Rooftops carry tanks, gardens, huts, masts and billboards; fronts carry
    café tables, chalk boards, planters and bikes in the plot's front strip
    (`front`; the building itself is `bodyOf()`, its footprints `solids`).
    A few offices and hotels (`TOWER_FLOORS`, up to about 10.6) break the
    skyline, all well under the Emporium.
  - Shop signs are fixed copy from `SIGNS` (made-up names, never the token);
    the shops, the hotels (`HOTEL_SIGNS`) and the diners (`DINER_SIGNS`)
    each take their names in turn as downtown is laid, so no two
    neighbours read the same (the polish plan's Phase 2; the test holds
    it). The sign atlas (`SIGN_ATLAS` in infill.ts) lays the boards two
    to a row and the blades in rows of 14, growing with the list.
    The owner's three shops, `NAMED_SHOPS`, are spread out: Crypto Coffee
    (west of the Emporium, café tables), Dave's Validator (north-east
    triangle, a tech store with a dish) and the Golden Crumpet (south-west
    triangle, a bakery), each with a neon icon. They're signs only, not
    places, for now.
  - Every wall and ground floor comes from one atlas material (bands with
    UVs in world units, taller walls stacked from quads so a band never
    wraps), every sign from one sign atlas, and details are bottomless
    boxes in the shared paint: keep new infill going through them. Phones
    (`LOW` in `infill.ts`) leave out the finest details.
  - The hangout square (`SQUARE`) is the whole south block, a block from the
    Emporium: an open plaza (the owner had the stage and its screen taken
    out; don't put them back), with the fountain, benches facing it, kiosks,
    planters, string lights criss-crossing over it and a crowd.
  - The GM water tower stands on an infill roof (`WATER_TOWER`). The
    target-practice dummies in the old park now stand in the north-west
    pocket park (`PRACTICE`).
  - Footprints are `DOWNTOWN_SOLIDS` in `solids.ts`; tested in
    `tests/downtown.test.ts`.
- **The outer districts** are `outer.ts` (DOM-free; the plan, collisions,
  traffic and the server read it), drawn by `neighbourhoods.ts` and the
  ground in `world.ts`:
  - The Parkway (`PARKWAY`) is a gently bending two-lane street, a
    soft-cornered U (half a superellipse) round the north half of the city
    from the north bank avenue west of W3 to the north bank avenue east of
    the big lots, about 40 north of the ring. The Southside Loop
    (`SOUTHSIDE`) does the same round the south row. Both meet their
    avenues square, cross the arterials at unlit crossings and keep a
    sidewalk on the outside (`BEND_KERBS` / `KERB_RUNS`, drawn as one
    kerb). Keep them convex: the blocks are clipped by their segments.
  - Between the ring and the bends, the arterials cut the land into 16
    landscaped blocks (`OUTER_BLOCKS`). The districts (`DISTRICTS` in
    layout.ts, Build mode's plots until it was retired: open pads now) and
    the Dorras lots keep their 9 x 9 pads where they were (`PADS`, drawn
    with a paved rim), so owners' buildings and prices don't change; the
    lawns round them carry
    trees (`LAWN_TREES`, half on phones).
  - Four small squares (`OUTER_SQUARES`, `SQUARE_LAYOUTS`): North Square
    (fountain, kiosk), West Green (a plinth with the Emporium diamond
    turning in neon), East Square (a bandstand) and South Square (a clock
    tower, kiosk); benches, corner planters, lamps, light bollards at the
    ways in, uplights round the centrepiece and a few people; paler stone
    inlays (a ring round the centrepiece, bands out to the edges), flower
    troughs along the sides (`troughs`, solid), café tables by the kiosk
    (`cafe`) and string lights round the edge on corner poles (`poles`, the
    lights in the FX layer so the ink doesn't draw them as black ropes).
    Footprints are `SQUARE_SOLIDS`. Four pocket parks (`OUTER_PARKS`).
  - **The lawns dressed** (the polish pass, the owner's call: "add detail to
    low grade parts") are `outerdress.ts` (DOM-free, tested in
    `tests/outerdress.test.ts`; `dressing()`, given a test for what's solid):
    a paved walk from each district's pad, each square's ways in and each pocket
    park out to its block's sidewalk the shortest clear way (`PATH_W`), round
    flower beds with a stone kerb in the blocks' corners and either side of
    each walk's mouth, benches either side of a walk's middle facing it with a
    bin (`BENCH_OUT`), a picnic table on each block's biggest clearing, and
    `LAWN_TREES` kept off them all (`trees`). Nothing of it is solid. Drawn
    by `outerdress3d.ts` (`buildOuterDress()`, a site a block, in the worker
    too; `DRESS`, worked out once with `SOLID_GRID`, also gives
    neighbourhoods.ts its lawn trees), shrubs at the feet of every third lawn
    tree (every sixth on phones).
  - The waterfront promenade (`PROMENADE`) along both banks: railings at
    the water (open at the bridges), trees in planters and benches between
    the lamps, and viewing decks over the water (`JETTIES`); a pale stone
    coping along the water's edge, flowers round the planters' trunks, a bin
    by each bench, life rings on posts by the railing and a telescope on
    each deck (near only). It's at ground level, not a slab: nothing on it
    is solid.
  - `inTown()` keeps the outskirts' trees out of all this. Tested in
    `tests/outer.test.ts`.
- **Traffic** follows `routes.ts` (DOM-free), generated from the street
  plan (growth plan Phase 7): its drivable streets and crossings make a
  graph (each street cut into stretches between crossings, either way, or
  the one way a one-way street (`oneway`, the airport's car park loop)
  allows; a stretch that goes nowhere carries no traffic: the country
  roads out to the world's edge end in turning loops so they do, rural.ts),
  and every route is a closed loop through it: a seeded drive of
  a few stretches, then the shortest way back, until every stretch is
  driven; plus the ring highway all the way round, both ways, in both
  lanes, up on its deck (the first `RING_ROUTES`, `deck`: docs/highway-plan.md
  Phase 2; their cars meet nothing at street level). Turns are rounded off
  (`cornerCurve()` in `highway.ts`: tighter for right turns; `joinLegs()` joins the curve onto the next
  street from where it ends, so no car runs back to the junction after it),
  an avenue's lane picked for the next turn (left from the inner lane,
  which at the busiest junctions is a turn lane with its own green arrow:
  docs/highway-plan.md Phase 6; a street with a planted
  `median` keeps its lanes either side of it; a one-way street's one lane
  down its middle; a loop, Uptown's circle, round one way). Junctions where
  a diagonal comes in (downtown's, Uptown's) run three light phases (x, z,
  diagonal). Cars drive round and round and follow whoever is ahead going
  the same way on any route; they're **spent where you are** (`life.ts`):
  a car further than `POOL_R` from what the camera looks at
  (`CROWD_VIEW.focus`), out of sight (or past `POOL_FAR`), is put back at
  one of the routes' `SPOTS` near it, out of sight (or past `POOL_SEEN`
  beyond the focus); boats do the same along the river (`BOAT_R`).
  Traffic lights stand on every way into a lit junction, found along each
  street (curved and looped ones too). Pedestrians walk loops round
  downtown's block outlines and the south row, and up and down Liberty
  Bridge's walkway. Tested in `tests/routes.test.ts`.
- **The ring highway** (growth plan Phase 7) is `highway.ts` (DOM-free,
  tested in `tests/highway.test.ts`): `HIGHWAY`, a closed centre line on
  a rounded box (`HIGHWAY_BOX` x -215 to 275, z -170 to 320 (its south
  side moved out 45 with the river's widening, docs/river-plan.md), corners
  `HIGHWAY_R` 70) round the town and The
  Trenches; two lanes each way with a median and a hard shoulder
  (`HIGHWAY_HALF`); `fromHighway()` / `insideHighway()` measure it
  exactly. In the street plan it's a street of kind `highway` (`loop`).
  Since docs/highway-plan.md Phase 2 it's raised on a viaduct all the way
  round (below, The raised highway): no junction at street level, every
  arterial passing under it (`RING_MEETS`), onto it and off it only by its
  exits' ramps (Phase 3); its two river
  spans are overhead (`riverBridges()` lists them, `riverCrossings()`
  doesn't: the river walls close under them). The outskirts' trees keep
  off it (`treeSpot()`).
- **The street plan** is `src/scripts/city3d/layout.ts` (DOM-free; the 3D
  city and the server read it). 1 tile is about
  1.8 m and Degen is about 0.86 tiles tall (everyone's size, below). Roads are sized for real-proportion
  cars: lanes 1.7 wide, a 0.8 sidewalk round every block and district.
  Downtown's cross streets (`CORE_ROADS`, at 17 and 43) and the diagonals
  are 3.4 wide with one lane each way; the ring and the south bank road are
  9-wide avenues, two lanes each way with a median (`NS_ROADS`, `EW_ROADS`,
  `laneCentres()`). Districts and the extra lots sit on lines centred on
  downtown's thirds (`BLOCKS`). The landmarks, their collision boxes, doors,
  and dummies are still written on the old drawing grid
  (blocks at 0, 11, 22) and moved onto their lots with `design()` /
  `designBox()` / `seat()` (`SEATS`; in `landmarks.ts`, `onBlock()` does it
  for each block's scene objects; the Emporium is `emporium.ts`, the Armoury
  `armoury.ts`, their shared helpers `landmark-kit.ts`). Keep writing landmark numbers on that
  grid, and change street sizes only in `layout.ts`.
- **The world's size** is in `layout.ts` too:
  - `EXT` (-680 to 720, about 2.5 km across; growth plan Phase 6 moved it out from -200 to 240 to -420 to 460, Phase 10 to here) is the ground, the river and every road, edge to edge (the far-off roads are two-lane country roads since docs/highway-plan.md Phase 7, `rural.ts`, each with its turning loop near the edge and a little traffic). It's mostly open land, room to grow the city into. Build there only when the owner asks.
  - The river is `RIVER_W` (60) wide: five times what it was, then four times again (the owner's calls; the second is `docs/river-plan.md`, built in steps with the owner's sign-off: all four are built, the river, Harbour Bridge, Liberty Bridge and the river's life). It widened southwards both times, so everything south of it moved: what's derived from `SOUTH_ROAD` / `SOUTH_ROW` moved by itself; the south bank's places written in fixed numbers before the first widening (the Fight Club in `fightsite.ts`, South Square and the south pocket parks in `outer.ts`, the airport before it moved out to the world's edge) add `SOUTH_SHIFT` (57, both moves) to their z, and those written after it (The Trenches' streets in `trenches.ts`, the metro's south end in `metro.ts`, the executive helicopter's path, the benchmark's views) add `WIDEN` (45, the second); the airport is written in today's world numbers since its Phase 3. Keep doing that for anything new written in fixed numbers south of the river.
  - **The river's shape** is `river.ts` (DOM-free, tested in `tests/river.test.ts`; river plan step 1, the owner's call: natural, not a straight line): `RIVER` is the band between the quay lines, the bank avenues straight along it edge to edge; the water's edge keeps to the band where anything stands on the water (Uptown's esplanade and marina, the town's promenades and their jetties, The Trenches' boardwalk, Pier 7 and the Night Market, Liberty Bridge, every bridge) and pulls back from it on the stretches in `BANKS` (`pullAt()`, eased in and out, a smooth seeded wander between `min` and `max`): a sandy cove on the south bank below the south row (`beach`), grass banks east of the town's promenades, and past the ring highway, each bank on its own. `edgesAt()` / `inWater()` / `edgeSamples()` are what everything reads: the water's mesh (world.ts `riverWater()`: shallows by the natural banks, a `shore` attribute on the city's water shader) and its banks (`riverBanks()`: stone quay walls, a ribbon of sand or pebbles where it pulls back, the cove's beach back to the promenade, reeds in chunky clumps and rocks near only), walking (walk.ts), driving (`RIVER_WALLS` in drive-sim.ts, a piece every `WALL_STEP` over the water, `riverWallsNear()`), the boats (`laneAt()`, waterfront.ts `boatZ()`), the outskirts' trees (they grow on the banks it leaves: `treeSpot()`), the promenade's railing (open to the cove), the world map and the sound.
  - **The water lies under the streets** (river plan step 2, the owner's pick): `WATER_Y` (-1.5) in `river.ts`. Where it keeps to the quay line a stone quay wall drops to it; where it pulls back the bank slopes down to it (`SLOPE` wide at most, flat land left above it; the cove's beach all the way: `slopeAt()`, `topsAt()` the slopes' tops, `shoreY()` the ground's height, `inChannel()` the slopes and the water). The grass stops at the band (world.ts); `riverBanks()` draws the walls, the slopes, the sand or pebbles and the reeds down at the water, and walls the channel's ends at the world's edge. Walking follows `shoreY()` down a slope (walk.ts `groundAt()`), the cars stop at the slopes' tops (`RIVER_WALLS`), the trees keep off the channel. Everything afloat is at `WATER_Y` (the traffic's boats and the moored ones in life.ts, Uptown's yachts and tenders, the barge), and everything standing in the water reaches down to it (the decks' piles, the jetties' posts, Uptown's marina pontoon on piles, Liberty Bridge's piers, the highway's bridges' piers). Anything new on the water goes there too.
  - **Bridges** (river plan step 1): the four avenue bridges were taken out. Only the east ring avenue keeps one (`BRIDGED_NS` in layout.ts: Harbour Bridge since step 2, below, the metro's; the el's posts stand on its median); the other north-south roads end at the bank avenues, each two streets in the plan (`ns<i>` north of the river, `ns<i>s` south of it, `nsStreet()`), and the ring highway keeps its two bridges far out of town. Liberty Bridge, a footbridge, was rebuilt in step 3 (below).
  - **River life** (river plan step 4, the owner's picks: more boats, the river bus, boating yourself; all three built). Everything on the water keeps to a line of its own, a function of the clock, and the tests hold each clear of everything else there (`tests/water.ts`: the piers, decks, moored boats and landings). 4a, more boats: two traffic boats to a lane and the police launch in the middle one (life.ts), and `riverlife.ts` (DOM-free, tested in `tests/riverlife.test.ts`): the cruise boat (`CRUISE`, round the town's reach), the rowing eight (`CREW`) and the dinghies out west (`DINGHIES`), drawn by `riverlife3d.ts`, a district loaded as you approach the river (`LAZY_DISTRICTS` id `river`). The highway's bridges' piers stand between the lanes (`BRIDGE_PIERS` in waterfront.ts). 4b, the river bus (below, under Getting about). 4c, boating yourself (below, after Driving your car).
  - `WORLD_BOUNDS` is how far you can walk or drive: the wall's foot since the wall plan's Phase 3 (below).
  - `CITY_EXT` (-80 to 140 + `SOUTH_SHIFT`) is the town past the Parkway (with the airport and the kart park it's `BUILT_UP`); the outskirts' tree belt fills a band round the town (outside the bends) and a lighter sprinkle covers the rest, seeded tile by tile at a density per area (`outskirtsTrees()` in `outskirts.ts`: `BELT_FREE` / `OPEN_FREE` are the land a tree could stand on in the world before Phase 6, so a bigger world gets more trees, never thinner ones, and a tile's trees are the same whatever the world's size; the belt's density eases out to the open land's, `BELT_EASE`, `beltShare()`, no edge). **Where a tree may stand is one rule** (`landuse.ts`, docs/blend-plan.md Phase 1, tested in `tests/landuse.test.ts`): `KEEPS`, everything the trees keep off (the highway and its ramps, every plan street, each district's land, the airport and its approach, the river, the hills, the metro's line, `EL_CLEAR`), filed by tile, each margin wobbled further out (`wobble()`, never in) so tree lines come out ragged; `treeSpot()` asks it. A new district's land goes in `KEEPS` (with `since`, as it came after the densities were measured), never in a call from its drawing; land a district left goes in with `gone` (counted when the densities are measured, never kept off: the kart park's old land, docs/kart-west-plan.md), so the open land's trees stay as thick. Pine woods stand in patches on the land well away from the city (`WOODS`, `inWoods()`: a smooth seeded noise, only past `WOODS.clear` from `WOODS_OFF` (the town and the kart park with the airport's old land in one box, and the airport's parts), so none on the land the world had before Phase 6), their trees bigger than the town's.
  - **The wall** (the owner's call, 2026-11; `docs/wall-plan.md`, its phases each with the owner's sign-off, keep it up to date): 200 ft of solid concrete round the city, a smooth slab, its inner face `WALL.out` (80) past `EXT` where the grass ends (`SKIRT` is `WALL.out`), `WALL.thick` (8) through, `WALL.h` (200 ft, about 34 tiles: the owner's exception to "under the Emporium"). The storyline will be a dystopia; the conditions to leave and the exits come later (solid all round until then). It locks the city in at its size: the world never grows past it, new districts go inside. `wall.ts` (DOM-free, tested in `tests/wall.test.ts`): `WALL_INNER` / `WALL_OUTER`, `WALL_RUNS` (the four sides, closed at the corners), `inWall()`, `fromWall()`, `CULVERTS` (where the river will run under it through bars, Phase 5), `WALL_CORNERS`. Phase 1 (the data, the skyline ring of dark towers retired) is built. Phase 3 (walk to the wall) is built: `WORLD_BOUNDS` is its foot (`WALL_OUT`, `WALL_MARGIN` in layout.ts), the wall solid in every grid (`WALL_SOLIDS`), aircraft turning back short of it, the river's boats and the car's river walls running on to it, the world map drawing it; the strip stays grass. Phase 4 (the top and the night) is built: a parapet both sides (`TOP`, in the slab), razor wire on the inner one (wall3d.ts `wireMesh()`, FX layer, phones without the thin strand), cameras on posts looking in (`CAMERAS`), floodlights at the foot (`FLOODS`, `FLOOD_SOLIDS`) washing up the face at night (`washMesh()`, FX layer, under the bloom's threshold), the cameras' red dots and the lenses lit through `lit()`. Phase 5 (the culverts) is built: the river runs on under the wall and 30 past it into the murk (world.ts `RIVER_PAST`), a low arch through each side over it (`ARCH`, `archTop()`, wall3d.ts `culvertGeometry()`), bars in the wall's middle (`CULVERT_X`) the boats stop at (`CULVERT_BARS` in boat-sim.ts `WATER_SOLIDS`). Phase 6 (polish) is built: its sound (ambience.ts `wall`: the wind harder along it, a low hum), the views `wall-foot`, `wall-culvert`, `wall-corner` in `BENCH_VIEWS` and `BLEND_VIEWS`. The plan is done; the exits and the storyline come later. Phase 2 (drawn) is built: `wall3d.ts` (`buildWall()`, at the boot):
    - the slab in cold blue-grey (`WALL_LOOK`), a toon material of its own, taking only `WALL_LOOK.std` of the city's haze so it's seen from town, and fading into the sky's horizon far off (`WALL_HAZE`), so its far side is never cut by the sky dome;
    - the murk past it (`BEYOND`: grey sheets thick at the ground, in the FX layer, shaded with the horizon's light);
    - the land past it to `WALL_LAND` (world.ts `buildGround()`).

    `SKY_RADIUS` reaches the land's corners. Don't bring the skyline ring back without the owner.
  - **Building out to the walls** (the owner's call, 2026-11: the whole map inside the wall built up eventually, still running in a browser on mid-range phones; a mix, districts with character near the centre and kit-built filler towards the walls) is planned in `docs/buildout-plan.md`: the baseline on real devices, a test fill to measure, letting far districts go, far districts as simple blocks, the world's data downloaded by region, a land plan, then the land filled district by district. A plan only so far: nothing built until the owner signs off a phase. Keep it up to date.
  - The sky dome and stars travel with the camera at `SKY_RADIUS` (`bounds.ts`: far enough that the wall's outer corners stand in front of it seen from downtown, about 1,130 today, never under 400), inside its far plane (`CAMERA_FAR`, 40 further), so everything in the world stays in front of the sky and the wall stays on the horizon however far out the edge is.
  - City view pans round the built-up area (`bounds.ts`: `BUILT_UP` is the town, the airport and the kart park; `PAN_BOUNDS` reaches `PAN_MARGIN` (160) past it, never closer than 10 to where you can walk: since Phase 10 the world reaches past it on every side).
  - **The edge is data** (growth plan Phase 5): `EXT` is set in one place, and a test run can set another (`WORLD_EXT=x0,x1`, `npm run test:wide` at -940 to 980, past the site's own); both must pass. Nothing that exists reads the edge: the airport's `SITE` is fixed numbers, the river walls and their bridge gaps come from the street plan (`riverCrossings()` in `streetplan.ts`), flying turns back at whatever bounds it's given. Anything new written against the edge must work at both sizes.
  - **Growing the city** (many more buildings, then a bigger world) is planned in `docs/growth-plan.md`. Part A (Phases 0-4) makes size cheap: the measuring kit and a snapshot test that nothing moves, tiles and a collision grid, near and far building forms, building as you go, building kits. Part B (Phases 5-10) grows the world: the edge as data (the airport's site frozen, trees per tile), `EXT` out to about 880 across, roads to reach it (a ring highway, more bridges, traffic spent near you), getting about (a world map, waypoints, and the owner's pick of metro, taxis or fast travel), districts one at a time, then optionally about 1,400 across. Phases 0 (the measuring kit), 1 (tiles, the collision grid, the city's fixed geometry merged per tile, crowds and traffic culled for the shadow map), 2 (near and far forms: details near only, far forms for the places and the cars) 3 (building as you go: sites built round the home view at the boot and the rest after it, near forms let go past a budget), 4 (building kits: kits, recipes for blocks, a test district behind `?district=test`), 5 (the edge as data: `EXT` in one place, tests at both sizes) 6 (the edge moves out: `EXT` -420 to 460, the woods, the far plane and sky dome from the edge) 7 (roads to reach it: the ring highway, its bridges and slip lanes, routes generated from the street plan, traffic and boats spent near you) and 8 (getting about: the world map, waypoints, Bring my car, taxis, fast travel, the metro, sound by district) are built, Phase 10 (the edge out again: `EXT` -680 to 720, about 1,400 across) is built, and Phase 9's first district, **The Trenches**, is built, and the second, **Westlake Park**, is under way (below); the third, **the Docks** (the owner's call: a port on the south bank west of The Trenches past the highway, scenery first, the metro run through it over the red arch moved there), is planned in `docs/docks-plan.md` and under way (below); follow the rest one phase at a time with the owner's sign-off (the world's size is final since the wall, docs/wall-plan.md: no more phases moving the edge out), and never add buildings in bulk outside the tiles (`tileBatch()`) or outside sites (`site()`).
  - **The polish pass** (the owner's call, 2026-11: "polish the entire
    city"): the audit of the whole city (world, menus, items, clothes,
    cars, sound, the game loop, engineering) and its plan are
    `docs/polish-plan.md`, ten phases smallest and surest first, each with
    the owner's sign-off (the owner's answers to its questions are in it:
    the sixteen pads stay reserved for buildings later, no new places, the
    room-making before the heavy work); keep it up to date, and shoot
    before and after each phase. All ten phases are built (2026-11-09,
    the overnight pass: the plan's morning report lists them; the shots
    are `docs/blend-shots/polish-before/` and `polish-after/`), waiting
    on the owner's sign-off; what's left is the plan's "Still open".
  - **Solid and fast first** (the owner's call): fixes and performance are planned in `docs/performance-plan.md` (where the time goes, what each phase measured, what's next); keep it up to date. Fix phase 1 (phones: the city builds behind the start menu and in spare frames, the outline pre-pass only as far as outlines reach, big textures at half size on phones), fix phase 2 (bugs and broken flows at every width), the trim, fix phase 3 (the code clean-up, the type check in the build) performance phase 2 (data baked at build time, the 2D map held back, features loaded when used, a service worker, the phones' lighter glow, budgets in the build) performance phase 3 (the crowd in a few meshes, shaders compiled once for the right target; far-district impostors measured and left until the districts grow) and performance phase 4, the foundations (sites built off the main thread, textures made at build time, and districts loaded as you approach, built with Westlake Park) are built. On phones only, a softer neon glow and simpler far districts are allowed; desktop stays as it is.
