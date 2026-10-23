# Working on this repo

This is **the** Degen Emporium site. An older multi-page site existed before
it and has been retired completely. Build only on what's here.

## The city's name

- The city is **Sector 7** (the owner's call; it was "Degen City" before).
  Use "Sector 7" in every bit of copy, banner and sign that names the
  city. The localStorage keys and save names keep their `degen-city-`
  prefixes (`degen-city-tycoon-v1` and the rest): renaming them would lose
  every visitor's save.

## Never bring back the old site

- The site is the Sector 7 homepage (`src/pages/index.astro`), the Emporium
  comic page it links into (`src/pages/emporium.astro`) and `404.astro`. Do not
  add or restore pages like `/news`, `/blog`, `/store`, `/shop`, `/alpha`,
  `/tokenomics`, `/vault`, `/terminal`, `/team`, `/projects`, `/about`,
  `/contact` or `/links` unless the owner asks for that page by name.
- Do not restore anything from git history (old pages, art, team portraits,
  graffiti headers, sticker sheets, the acid-green palette, the "Connect"
  wallet button, the "MAINNET" badge). Old commits are history, not source.
- New pages, sections or art only on the owner's explicit request.
- The `nft-minter` branch is a separate project. Never merge it, or copy
  anything from it, into `main` or any website branch.

## Design rules

- The homepage is Sector 7 in two layers, both in Degen's style (black ink
  outlines, flat cartoon shading, PulseChain neon):
  - **3D** (`src/scripts/city3d/`, three.js): toon materials, ink outlines
    from a normal/depth post-pass, bloom, day/night from the visitor's clock,
    weather, traffic, people, optional synthesised sound. Clicking a
    building flies the camera in and opens a glass panel.
  - **2D** (`src/lib/city.ts`): the isometric SVG map. It's the loading
    poster, the fallback without WebGL, and the "2D map" view.
  Both layers share downtown's layout (`streetplan.ts`, `downtown.ts`); keep
  them in step when buildings change. The ring roads and plot districts exist
  in 3D only (on the 2D map the diagonals simply run on out of town). Pin
  copy and panel copy live in `src/components/CityMap.astro`.
- **Buildings are places in the city's game** (the owner's call): each opens
  its own panel (a game menu), never the comic page or an outside link. On
  the 2D map a building takes you into the 3D city and opens its panel
  (`city.open()`). The comic page (`/emporium`), the merch store and X /
  Telegram live in the ☰ Menu only. Places not built yet say "coming soon"
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
  outer districts) are built; Phase 4 is polish. Prices of plots and lots
  don't change in the redesign.
- **Downtown** is `downtown.ts` (DOM-free; the 3D city, the 2D map, the plan,
  collisions and the server read it), drawn by `infill.ts` in 3D and by
  `downtown()` in `city.ts` on the 2D map:
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
    `infill.ts` and `infill()` in `city.ts`): brownstone walk-ups (stoop,
    bay window, bracketed cornice), shops (fascia sign, striped awning, blade
    sign, fire escapes), diners (rooftop sign, tables out front), lofts
    (roll-up doors, sawtooth roofs), offices (glass tower set back on a
    podium, lit crown, mast) and hotels (balconies, canopy, vertical sign).
    Rooftops carry tanks, gardens, huts, masts and billboards; fronts carry
    café tables, chalk boards, planters and bikes in the plot's front strip
    (`front`; the building itself is `bodyOf()`, its footprints `solids`).
    A few offices and hotels (`TOWER_FLOORS`, up to about 10.6) break the
    skyline, all well under the Emporium.
  - Shop signs are fixed copy from `SIGNS` (made-up names, never the token).
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
    landscaped blocks (`OUTER_BLOCKS`). The plots and the Dorras lots keep
    their 9 x 9 pads where they were (`PADS`, drawn with a paved rim), so
    owners' buildings and prices don't change; the lawns round them carry
    trees (`LAWN_TREES`, half on phones).
  - Four small squares (`OUTER_SQUARES`, `SQUARE_LAYOUTS`): North Square
    (fountain, kiosk), West Green (a plinth with the Emporium diamond
    turning in neon), East Square (a bandstand) and South Square (a clock
    tower, kiosk); benches, corner planters, lamps, light bollards at the
    ways in, uplights round the centrepiece and a few people.
    Footprints are `SQUARE_SOLIDS`. Four pocket parks (`OUTER_PARKS`).
  - The waterfront promenade (`PROMENADE`) along both banks: railings at
    the water (open at the bridges), trees in planters and benches between
    the lamps, and viewing decks over the water (`JETTIES`). It's at
    ground level, not a slab: nothing on it is solid.
  - `inTown()` keeps the outskirts' trees out of all this. Tested in
    `tests/outer.test.ts`.
- **Traffic** follows `routes.ts` (DOM-free), generated from the street
  plan (growth plan Phase 7): its drivable streets and crossings make a
  graph (each street cut into stretches between crossings, either way, or
  the one way a one-way street (`oneway`, the airport's car park loop)
  allows; stretches out towards the world's edge go nowhere and carry no
  traffic), and every route is a closed loop through it: a seeded drive of
  a few stretches, then the shortest way back, until every stretch is
  driven and every slip lane taken; plus the ring highway all the way
  round, both ways, in both lanes. Turns are rounded off (`cornerCurve()`
  in `highway.ts`: tighter for right turns, through the slip lanes where
  the highway meets an arterial), an avenue's lane picked for the next
  turn. Junctions where a diagonal comes in run three light phases (x, z,
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
  a rounded box (`HIGHWAY_BOX` x -215 to 275, z -170 to 275, corners
  `HIGHWAY_R` 70) round the town, the kart park, the airport and The
  Trenches; two lanes each way with a median and a hard shoulder
  (`HIGHWAY_HALF`); `fromHighway()` / `insideHighway()` measure it
  exactly. In the street plan it's a street of kind `highway` (`loop`),
  with a lit junction wherever it meets a straight arterial (18), and on
  the town side of each, two `slip` streets (one-way slip lanes across
  the corners for the right turns on and off it, `slipCurve()`); it
  crosses the river on two bridges (`riverBridges()` in `streetplan.ts`,
  every road crossing the river: they're drawn, and they're the gaps in
  `RIVER_WALLS`). It's all at ground level: nothing to climb, nothing
  solid. Drawn in `world.ts` (the asphalt, the median broken at the
  junctions and over the river, lane dashes and edge lines, lamps along
  both verges, the slips); the arterials' medians and lines break where it
  crosses them (`highwayGaps()`), and the outskirts' trees keep off it and
  its slips (`treeSpot()`).
- **The street plan** is `src/scripts/city3d/layout.ts` (DOM-free; the 3D
  city, the 2D map, the plots and the server all read it). 1 tile is about
  1.8 m and Degen is about one tile tall. Roads are sized for real-proportion
  cars: lanes 1.7 wide, a 0.8 sidewalk round every block and district.
  Downtown's cross streets (`CORE_ROADS`, at 17 and 43) and the diagonals
  are 3.4 wide with one lane each way; the ring and the south bank road are
  9-wide avenues, two lanes each way with a median (`NS_ROADS`, `EW_ROADS`,
  `laneCentres()`). Districts and the extra lots sit on lines centred on
  downtown's thirds (`BLOCKS`). The landmarks, their collision boxes, doors,
  dummies and the 2D buildings are still written on the old drawing grid
  (blocks at 0, 11, 22) and moved onto their lots with `design()` /
  `designBox()` / `seat()` (`SEATS`; in `landmarks.ts`, `onBlock()` does it
  for each block's scene objects; the Emporium is `emporium.ts`, the Armoury
  `armoury.ts`, their shared helpers `landmark-kit.ts`). Keep writing landmark numbers on that
  grid, and change street sizes only in `layout.ts`.
- **The world's size** is in `layout.ts` too:
  - `EXT` (-420 to 460, about 1.6 km across; growth plan Phase 6 moved it out from -200 to 240) is the ground, the river and every road, edge to edge (the far-off roads are plain continuations of today's, with no traffic). It's mostly open land, room to grow the city into. Build there only when the owner asks.
  - The river is `RIVER_W` (15) wide, five times what it was (the owner's call). It widened southwards, so everything south of it moved `SOUTH_SHIFT` (12) south: what's derived from `SOUTH_ROAD` / `SOUTH_ROW` moved by itself, and the south bank's places written in fixed numbers (the Fight Club in `fightsite.ts`, South Square and the south pocket parks in `outer.ts`, the airport and its timetable in `airfield.ts`) add `SOUTH_SHIFT` to their z. Keep doing that for anything new written in fixed numbers south of the river.
  - `WORLD_BOUNDS` is how far you can walk or drive.
  - `CITY_EXT` (-80 to 140) is the town past the Parkway (with the airport and the kart park it's `BUILT_UP`); the outskirts' tree belt fills a band round the town (outside the bends) and a lighter sprinkle covers the rest, seeded tile by tile at a density per area (`outskirtsTrees()` in `outskirts.ts`: `BELT_FREE` / `OPEN_FREE` are the land a tree could stand on in the world before Phase 6, so a bigger world gets more trees, never thinner ones, and a tile's trees are the same whatever the world's size; trees keep off land in `keepTreesOff()`). Pine woods stand in patches on the land well away from the city (`WOODS`, `inWoods()`: a smooth seeded noise, only past `WOODS.clear` from `BUILT_UP`, so none on the land the world had before Phase 6), their trees bigger than the town's.
  - The skyline ring stands just past `EXT` (`SKYLINE` in `bounds.ts`: `gap` to `gap` + `depth` past it), kept out of the haze (`fog = false`) so it reads as a far metropolis; as many towers as the ring had for its length before Phase 6 (`SKYLINE_REACH`), each from its own seeded numbers, on grass that carries on `SKIRT` (80) past the edge (the grass is a plane per tile).
  - The sky dome and stars travel with the camera at `SKY_RADIUS` (`bounds.ts`: far enough that the skyline's far side stands in front of it seen from downtown, about 720 today, never under 400), inside its far plane (`CAMERA_FAR`, 40 further), so everything in the world stays in front of the sky and the skyline stays on the horizon however far out the edge is.
  - City view pans round the built-up area (`bounds.ts`: `BUILT_UP` is the town, the airport and the kart park; `PAN_BOUNDS` reaches `PAN_MARGIN` (160) past it, never closer than 10 to where you can walk: today that's the whole world), and the Build overview frames the plots (`overviewFrame()`).
  - **The edge is data** (growth plan Phase 5): `EXT` is set in one place, and a test run can set another (`WORLD_EXT=x0,x1`, `npm run test:wide` at Phase 10's -680 to 720); both must pass. Nothing that exists reads the edge: the airport's `SITE` is fixed numbers, the river walls and their bridge gaps come from the street plan (`riverCrossings()` in `streetplan.ts`), flying turns back at whatever bounds it's given. Anything new written against the edge must work at both sizes.
  - **Growing the city** (many more buildings, then a bigger world) is planned in `docs/growth-plan.md`. Part A (Phases 0-4) makes size cheap: the measuring kit and a snapshot test that nothing moves, tiles and a collision grid, near and far building forms, building as you go, building kits. Part B (Phases 5-10) grows the world: the edge as data (the airport's site frozen, trees per tile), `EXT` out to about 880 across, roads to reach it (a ring highway, more bridges, traffic spent near you), getting about (a world map, waypoints, and the owner's pick of metro, taxis or fast travel), districts one at a time, then optionally about 1,400 across. Phases 0 (the measuring kit), 1 (tiles, the collision grid, the city's fixed geometry merged per tile, crowds and traffic culled for the shadow map), 2 (near and far forms: details near only, far forms for the places and the cars) 3 (building as you go: sites built round the home view at the boot and the rest after it, near forms let go past a budget), 4 (building kits: kits, recipes for blocks, a test district behind `?district=test`), 5 (the edge as data: `EXT` in one place, tests at both sizes) 6 (the edge moves out: `EXT` -420 to 460, the woods, the far plane and sky dome from the edge) 7 (roads to reach it: the ring highway, its bridges and slip lanes, routes generated from the street plan, traffic and boats spent near you) and 8 (getting about: the world map, waypoints, Bring my car, taxis, fast travel, the metro, sound by district) are built, and Phase 9's first district, **The Trenches**, is built, and the second, **Westlake Park**, is under way (below); follow the rest one phase at a time with the owner's sign-off, and never add buildings in bulk outside the tiles (`tileBatch()`) or outside sites (`site()`).
  - **Solid and fast first** (the owner's call): fixes and performance are planned in `docs/performance-plan.md` (where the time goes, what each phase measured, what's next); keep it up to date. Fix phase 1 (phones: the city builds behind the start menu and in spare frames, the outline pre-pass only as far as outlines reach, big textures at half size on phones), fix phase 2 (bugs and broken flows at every width), the trim, fix phase 3 (the code clean-up, the type check in the build) performance phase 2 (data baked at build time, the 2D map held back, features loaded when used, a service worker, the phones' lighter glow, budgets in the build) performance phase 3 (the crowd in a few meshes, shaders compiled once for the right target; far-district impostors measured and left until the districts grow) and performance phase 4, the foundations (sites built off the main thread, textures made at build time, and districts loaded as you approach, built with Westlake Park) are built. On phones only, a softer neon glow and simpler far districts are allowed; desktop stays as it is.
- **Getting about** (growth plan Phase 8; the owner picked taxis, fast
  travel and the metro):
  - **Places** are `places.ts` (DOM-free, tested in `tests/travel.test.ts`):
    every place on the map (`PLACES`: the spots with a pin, the garage, the
    market square, the metro's stations) with the spot you arrive at,
    standing, facing it; `seen()` says which you've reached (`SEEN_R`).
    Walking or driving there (not flying over, not riding past) adds it to
    the save's `visited` (`visit()` in `tycoon.ts`, cleaned to `PLACE_IDS`),
    with a toast.
  - **The world map** is `worldmap.ts` (markup `[data-worldmap]` in
    `CityMap.astro`, styles `src/styles/worldmap.css`): a canvas drawn
    from the street plan (slabs, plazas, roads by width, the highway, the
    river, the airport and runway, the kart park's circuit, Liberty
    Bridge, the metro line), the places with their pins' names
    (`placeName()`), you, your car, your aircraft when it's away, your
    waypoint. Drag or two fingers pan, scroll or pinch zoom, + / − / Fit /
    You, "Find a place" (the keyboard's way in). From the ☰ Menu's World
    map, the Map walk tab, or M (walking with no panel open, or the City
    view); M, Esc or × close it. Tapping a place opens a card: Open and
    Walk here (City view), Set waypoint, Taxi here, Fast travel (on foot,
    places you've been); yourself: Bring my car; open ground: a waypoint.
    It isn't the 2D poster (`city.ts`), which stays downtown's.
  - **Waypoints** (`travel-ui.ts`, which wires the map in): a magenta beam
    (`beacons.waypoint()`) and the compass in the walk HUD (`[data-compass]`,
    top right: an arrow, metres, the name, an ×), cleared when you're there.
    **Fast travel** fades out, stands you at the place (`walk.placeAt()`)
    and fades in. **Bring my car** (`walk.bringCar()`, `drive.bring()`):
    the nearest lane spot round you, clear of traffic.
  - **Taxis** are `taxi.ts`: a Cruiser in taxi yellow with a lit TAXI sign
    comes from a spot on the roads a way off to the kerb nearest you, along
    `pathBetween()` (`routes.ts`: the shortest drive between two points on
    the streets, in the right lanes, ending at the kerb nearest the place),
    stopping at red lights and behind traffic; the traffic stops behind it
    (`stoppers` in `life.ts`). Walk up to it (or Get in) and it drives you
    there under a chase camera; Skip ride or Esc cuts to the end. Its bar is
    `[data-taxi]` (under the header while it comes, at the bottom while you
    ride). Free: no fare.
  - **Rides** (taxi and metro) go through `walk.setRide()` (`Ride` in
    `walk.ts`): the ride moves Degen (hidden) and its own camera, the keys
    wait, `.city.is-riding` hides the walk HUD; leaving walk mode ends it.
  - **The metro** is `metro.ts` (DOM-free, tested in `tests/metro.test.ts`):
    an elevated line on a viaduct as tracks (`TRACKS`: `main` from the Kart
    Park station north of the ring highway (the north side's stage 2: it
    crosses the highway's junction on a span) down the east ring avenue's
    median to the switch (`SWITCH_S`), a
    quarter-circle bend (`BEND_R`) and west over the open land south of the
    south row and Trench Avenue's median to The Trenches; `branch` straight
    on from the switch to the Airport, Phase 9, the owner's call); a place
    on them is a track and a distance (`pointOn()`, `along()`, `sideOf()`);
    pillars wherever the ground is clear (`PILLARS`: an avenue's median
    clear of its junctions, or open land off every road; never the river);
    five stations (`STATIONS`: Kart Park, Downtown, South Bank, The
    Trenches, Airport; each a track and distance, a platform on the track's
    left (`PLATFORM_SIDE`), a stair tower with its door at street level and
    the way out of it, `face`), `METRO_SOLIDS` (in `SOLIDS`), the train
    (`TRAIN`, two cars) on a timetable from the clock (`trainAt()`, `LEGS`:
    down to South Bank, out to The Trenches and back, out to the Airport and
    back, up again; `ROUND_TRIP`), runs as pieces of track (`runsBetween()`,
    `placeOn()`, `carAt()`: each car on the track where it is, round the
    bend), rides straight between stations (`rideAt()`, turning round at
    South Bank between The Trenches and the Airport; at most about 40 s)
    and back on the timetable after (`timetableAt()`). Drawn by `metro3d.ts`
    (the deck in short straight pieces between its pillars, rails, parapets
    with magenta neon, hammerhead pillars, a girder over the river; each
    station in its own frame along its track: platform, canopy with the
    station names from one sign atlas, skybridge, tower with an M roundel
    over the door, totem; two cars, `userData.keep`). Its rides are
    `metro-ui.ts`: the station door's "Metro" prompt (a walk `places` entry,
    `metro:<id>`) opens the station card (`[data-metro]`), a ride runs
    alongside the train (`[data-metro-bar]`, Skip ride / Esc) and you step
    out at the destination's door.
  - **Sound by district** is `ambience.ts` (DOM-free, tested in
    `tests/ambience.test.ts`): `ambienceAt(x, z, lift)` gives the town's
    hum, the river (and Westlake's lake), the traffic's rush (the highway,
    the avenues inside it), wind over open land, the Emporium's beat, The
    Trenches' own (`hood`, `boombox`: the grit step) and Westlake Park's
    (`park`: birds by day, an owl at night); `sound.update()` mixes its layers
    from it (and the el's rumble from `metro.rumbleAt()`), where you walk
    or where the City view looks.
- **The Trenches** (growth plan Phase 9, the owner's call): a
  neighbourhood of projects in the style of Brooklyn on the south-west
  quadrant inside the ring highway, where the storyline will start later.
  Lived-in and lively (murals and tags with made-up names only, people on
  stoops, kids on the court; nothing threatening). Built in steps, each
  with the owner's sign-off: (1) streets, traffic and the metro (built);
  (2) the brick tower blocks (8-10 floors, under the Emporium),
  brownstones, The Block and its pin (built); (3) four corner shops for Dorras
  (20,000 / 30,000 / 45,000 / 60,000 from level 5, run like your units;
  built).
  - `trenches.ts` (DOM-free, tested in `tests/trenches.test.ts`): Trench
    Avenue (`AVENUE_Z`, an avenue from the west ring avenue to West
    Street, lit junctions, the el over its median), the cross streets
    (`NS_X`, north to the south bank avenue where the south row's bend
    leaves room, south to Bottom Street), the streets through the
    projects (`EW_Z`) and Bottom Street (`BOTTOM_Z`), all kept
    `HIGHWAY_CLEAR` from the highway and inside its south-west bend
    (`BEND_C`, `BEND_REACH`); `TRENCH_STREETS`, `TRENCH_CROSSINGS` and
    `TRENCH_BLOCKS` (rows A: Trench Avenue's north side, nearest town; B:
    the projects; C: the strip along the highway; W: the strip between
    West Street and the highway) join the street plan
    (`cityPlan()`), so traffic, taxis, walking (the slabs), the world map
    and the sound read them; `TRENCH_RECT` / `inTrenches()`.
  - `trenches3d.ts` draws its streets as sites (asphalt, Trench Avenue's
    median, lane lines, zebras on every arm, lamps along both sides); its
    blocks' slabs and lawns are the street plan's (`world.ts`), and the
    avenues it meets break their medians and lines there (`highwayGaps()`).
  - `projects.ts` (DOM-free, tested in `tests/projects.test.ts`) is what
    stands on its blocks: the Trench Houses (`TOWERS`, numbered; the
    redesign, the owner's call: each block of row B laid out by hand in
    `LAYOUTS` from a mix of designs (`TowerDesign`: L and T shapes round
    half-courtyards, stepped towers, low walk-ups with stoops (`STOOP`),
    slim point towers (the tallest), crosses and a slab), every block its
    own; a tower is parts (`TowerPart`: a footprint and its own storeys, 3
    to 9 over the ground floor), its `main` part carrying the stair house
    (and a water tank up to 8 storeys), every top `EMPORIUM_ROOF` less half
    a tile or more under; mostly red brick with some brown, tan and dark
    (`Brick`, new wall atlas bands `brickTan` / `brickDark` in infill.ts);
    balconies on some (`balconies`), scaffolding up one (`scaffold`); each
    door on the side nearest a street. `towerShell()` turns the parts into
    walls and roofs: the footprint cut into cells, each as tall as the
    tallest part over it, a wall wherever a cell meets a lower one, from
    the floor line under the lower roof, so no two walls share a plane.
    `trench-b0-3`, east of The Block, is the rec block (commons.ts)), The Block
    (`THE_BLOCK` on `trench-b0-2`, south of the station: plaza, court and
    its fence with a gate each side (`blockFence()`), playground,
    handball wall, garden beds, benches, tables, string-light poles;
    `BLOCK_SPAWN` on the plaza), and the rows (`ROW_BLOCKS`: row A's as
    strips along Trench Avenue (`STRIPS` in riverside.ts: their river side
    is the riverside's), row C as a strip along Bottom Street, laid by the
    `rowhouses` recipe, `rows()`; each strip is laid with its back edge a
    hair off straight so its one row faces its street). `PROJECT_SOLIDS` (in `SOLIDS`) are the
    towers' parts to their roofs (the main one to its top), stoops and
    scaffolding, the fence, the handball wall, the rows'
    buildings and their alleys' bollards. `TRENCH_WALKS` are the blocks
    people walk round (`life.ts`, with walkers of their own so downtown
    keeps its crowd).
  - `projects3d.ts` draws them as sites (`buildProjects()`), each tower a
    site per piece (its shell, each wall's details, its scaffolding: none
    takes long to build): the shell (`towerShell()`'s walls from the wall
    atlas in its brick, windows lit at night and lined up from wall to
    wall, string course and cornices, roofs inside parapets, the stair and
    lift house, a water tank, roof terraces on a stepped tower's lower
    steps, the door's canopy with lamps (a walk-up's stoops and carved
    door surrounds) and its "TRENCH HOUSES · n" sign from one small atlas,
    a mural with made-up words on the north wall of those along Trench
    Avenue (`MURAL_TEXT`)), then, near only, the lived-in details laid on
    the atlas's bays (window air conditioners, window boxes, dishes,
    balconies with light panels and washing on some) and the scaffolding
    (poles, ledgers, boards, orange toe boards; a few windows boarded up,
    `boarded()`, tagged low down), the yards (paths from the doors to the
    sidewalk with benches, a lamp by each), the rows (`drawLot()`), their
    alleys and bollards, and behind Bottom Street a car park and trees
    along the highway.
  - **The communal areas** (the redesign's step B, the owner's call;
    scenery only for now) are `commons.ts` (DOM-free, tested in
    `tests/commons.test.ts`): `AMENITIES`, each projects block its own
    `MIX` (no two alike) of playgrounds, basketball half-courts, a soccer
    cage, skate spots, community gardens with grills and picnic tables,
    chess tables and washing lines, each placed on the open lawn (the
    first spot from the lawn's middle that's clear of the towers, their
    stoops and scaffolding, every door's way out (`doorWay()`) and the
    others) and opening onto the nearest edge its way out (`amenityWay()`)
    is clear to; the rec block (`REC`: the rec centre, the laundromat,
    the pavilion, the path, `REC_DOORS`); parking bays (`BAYS`: lay-bys
    behind the sidewalk along the projects' streets, clear of every way
    in, cars in about two spaces in three, `BAY_CARS`; and a fuller one
    along Trench Avenue under the el, `<block>:el`, where its pillars
    stand over a yard: the el's median is too narrow to park in);
    hydrants on the sidewalk corners (`HYDRANTS`); `COMMONS_SOLIDS` (in
    `SOLIDS`: fences with a gate on the way out (the courts' and the
    cage's; the garden's came out in the trim), ramps, grills, washing poles,
    the rec block's buildings and the pavilion's posts, the parked cars);
    and `commonsPeople()` (kids at play, neighbours at the grills, chess
    and the pavilion). Drawn by `commons3d.ts` as sites (`buildCommons()`,
    before the trees, lamps and crowd: the parked cars a lot to a block,
    the rec block's lamps, the people, kids smaller through `Idle.scale`;
    the courts on old asphalt with faded lines and a tagged backboard, the
    rubber faded, the cage's turf worn bald, the chain-link's mesh in the
    FX layer, `chainMesh()` / `buildFx()` in `grime.ts`); the signs
    (TRENCHES REC CENTER, WASH & FOLD) are fixed made-up copy.
  - **The grit** (the owner's call: "more concrete... a gritty urban city
    feel", moody and realistic; step 1 of three, then the street walls and
    the three places on Trench Avenue, all built) is `grit.ts` (DOM-free, tested in
    `tests/grit.test.ts`), drawn by `grit3d.ts` (`buildGrit()`, sites, after
    the commons): the yards (`YARDS`, row B but The Block) are worn
    concrete (world.ts's `yard` lot, a texture 8 tiles to a repeat laid on
    in world units, `YARD_REPEAT`; The Trenches' sidewalks plain grey) with
    patches of worn grass and bare dirt (`PATCHES`, clear of everything
    `taken()` lists) and the rec block's lawn worn; trees in pits with
    grates along the yards' street sides and on the worn grass
    (`YARD_TREES`, `PIT`); jersey barriers behind Bottom Street's car parks
    (`BARRIERS`, `JERSEY`, `CAR_PARKS`); a dumpster against a side wall of
    each tower but the walk-ups (`DUMPSTERS`) with bags beside it and in
    some of the rows' alleys (`TRASH`); about two in five of the rows' shops
    shuttered (`shuttered()`, never a corner shop), windows boarded
    (`boarded()`); three boombox corners by walk-ups' stoops with folding
    chairs and neighbours (`BOOMBOXES`); the el's pillars and spans in The
    Trenches (`EL_PILLARS`, `PLINTH`, `EL_SPANS`); `GRIT_SOLIDS` (in
    `SOLIDS`: the barriers, the dumpsters). Tags and wheatpasted bills are
    two atlases in `grime.ts` (`TAGS`, `POSTERS`: made-up names and made-up
    things on the block, nothing for sale, never a real crew, brand or
    person), laid on near only in the FX layer: on the dumpsters, the
    barriers' slopes, the shutters, boarded windows, backboards, the skate
    ramps and the el's pillars. The streets are worn too (`trenches3d.ts`:
    patched asphalt inside the lanes, never across a line, cracks,
    manholes). The lamps there are sodium orange (`lampKind()` in
    trenches.ts, `buildLamps()` in world.ts: about one in ten flickering,
    in two sets going out together through `flickerTogether()` in kit.ts,
    the odd one dead). The el over Trench Avenue is dark steel
    (`metro3d.ts`: a grimy deck, deep plate girders braced across, flanged
    steel columns on concrete plinths, steel hammerheads, a sodium lamp
    under each span with its pool, sparks off the wheels as the train goes
    over (not under reduced motion), and `rumbleAt()` for the sound). The
    sound (ambience.ts `hood`, `boombox`; sound.ts): the el's rumble and
    screech by the train, a siren far off and a dog now and then, the
    boombox's own slow beat by its corner. Phones get fewer bags and no
    grate bars. Nothing threatening: worn and lived-in, that's all.
  - **Built up** (the grit's step 2, the owner's call) is `streetwall.ts`
    (DOM-free, tested in `tests/streetwall.test.ts`), drawn by
    `streetwall3d.ts` (`buildStreetWalls()`, sites, after the grit): the
    street walls (`TENEMENTS`: 4-6 storey tenements, the kits' shops with
    `escape` (a fire escape up the front for certain) and `wall` (their
    brick), Infill fields infill.ts honours; made-up names `TRENCH_SIGNS`
    (CLUCK HOUSE, GLOSS NAILS, HERO DELI, CELL FIX added to `SIGNS`)) laid
    shoulder to shoulder along the yards' street fronts wherever there's
    room (`WALL_DEPTH`): broken at every way in, `BACK_CLEAR` from the
    towers, never in front of a mural, drawn two to a site through
    `drawLot()`; two vacant lots in the walls (`VACANT`: dirt, rubble,
    weeds, open to the street (their chain-link came out in the trim), a
    billboard with made-up copy, tags on the neighbours' side walls); low commercial
    (`LOWRISE`, `LowLot`, `lowFrame()`: lock-ups along Bottom Street's
    side of the yards (`LOCKUP_DEPTH`), and on row W, the strip between
    West Street and the highway (`trench-w0` in trenches.ts, kept clear of
    the slip lane), warehouses, an auto shop, a tyre place, a car wash, a
    scrap yard, a body shop and lock-ups facing West Street, signs from
    one atlas (`LOWRISE_NAMES`), cars on the aprons and in the car wash
    (`LOW_CARS`), trees along the highway behind, a few people at work).
    The yards' edge is a low worn concrete kerb (`EDGES` here, `EDGE_H`,
    `EDGE_W`, `edgeSolid()`; chain-link until the trim, the owner's call,
    the courts', the cage's and The Block's chain-link stay): it runs only
    where nothing's built (`built()`), with a gap at every way in, and the
    grit keeps its patches, trees and dumpsters off what's built.
    `STREETWALL_SOLIDS` (in `SOLIDS`): the buildings, the kerbs, the scrap
    yard's piles, the car wash's posts and brushes, the docks, the cars.
    Some of the tenements' shops are shuttered too (grit's `shuttered()`).
  - **Trench Avenue's places** (the grit's step 3, the owner's call:
    "a gun store, a bar, and a large neon nightclub", first under the el)
    are `avenue.ts` (DOM-free, tested in `tests/avenue.test.ts`) on row lots
    set aside in projects.ts (`AVENUE_LOTS`, `isAvenue()`: kept out of the
    rows' drawing, their solids and the shutters), drawn by `avenue3d.ts`
    (`buildAvenue()`, at the boot, after The Block). Since the riverside's
    redesign (below) they stand on its lots (`CLUB_LOT`, `BAR_LOT`,
    `ARMS_LOT` in riverside.ts), facing north across the bank avenue to
    the boardwalk; every number in avenue.ts and avenue3d.ts follows the way
    a place faces (`face`, `out`, `wall`, `street`), keep new ones doing so,
    and their spots carry `faces: 'n'` so the fly-in comes from the river
    (`spotView()` in index.ts). **Club PULSE** (`CLUB`, the riverside's
    landmark, the owner's call: four times the club it was, the whole river
    half of trench-a3): a black hall behind vertical neon fins (`fins`)
    throbbing with the beat, PULSE on a big board across them, the corner
    pylon by the cross street (`pylon`: the vertical PULSE on its two outer
    faces, neon up its edges, a cyan crown ring and a mast, its top under
    the Emporium), the fly tower at the back with a heartbeat traced in neon
    across its face (`fly`, `ECG`), the sky deck on the roof (`deck`: its
    rail, the DJ booth under a canopy with SKY DECK, string lights,
    dancers), two searchlights sweeping the sky at night (`searchlights`,
    `beams()`: soft cones of their own, still under reduced motion), a wide
    marquee with chasing bulbs over the red carpet (`carpet`), the stage
    door on the cross street, a velvet rope on brass posts along its
    forecourt (`FORECOURT`) with the queue behind it and two bouncers (the
    tubes, ring, heartbeat and bulbs are four materials of their own driven
    by the tick, `userData.keep`; tasteful, nothing explicit), **The Rusty
    Nail** (`BAR`, on trench-a2's corner: dark brick, a dark wood front, its
    name in neon, a BAR blade, an OPEN sign) and **Trench Arms** (`ARMS`, on
    trench-a1's corner by Harbor Stores: red brick over concrete, barred
    windows, a hatch on the street, `ARMS.counter`). Signs are one atlas of fixed made-up copy, the blades
    another. Each is a place: spots `club`, `bar`, `arms` (pins, directory
    entries, panels `data-panel-tpl` with Walk in to `AVENUE_SPAWNS`,
    `PLACES` entries). The club's and the bar's doors (`AVENUE_DOORS`) prompt
    "Enter ..." and open their panels (coming soon); Trench Arms' hatch
    prompts "Trench Arms" and opens the Armoury's gun store and workbench
    under its own name (`shop.show(name)` in gunshop.ts). The club's beat
    thumps through its walls by the door (ambience.ts `club`, sound.ts:
    a kick and bass under a low-pass). `AVENUE_SOLIDS` (in `SOLIDS`): the
    buildings, the club's pylon and fly tower, and the rope.
  - **The corner shops** (step 3, the owner's call): `CORNER_SHOPS` in
    `projects.ts` turns four row lots (one each on rows A's a2, a1, a3 and
    C's c2, facing their street) into shops with made-up names (Block
    Bodega, Trench Mart, Avenue Deli, Corner Stop) and a `door` on the
    sidewalk; `isCorner()` keeps them out of the rows' drawing. The rules
    are tycoon.ts's: places `c0`-`c3` (`CORNER_PLACES`), `corners` in the
    save (v10; older saves own none), `buyCorner()` / `cornerPrice()`
    (`CORNER_PRICES` 20,000 / 30,000 / 45,000 / 60,000 by how many you own,
    from `CORNER_LEVEL` 5, ledger `property`), always a shop (`CORNER`: 4
    shelves of 60, a faster pace than a unit's shop; `kindAt()` reads
    `'corner'`), levels 1-3 (`CORNER_LEVEL_COSTS` in catalog.ts), clerks,
    couriers, car deliveries with the bonus. Drawn from the save by
    `cornershops.ts` (`buildCornerShops()`, `show()` rebuilds only what
    changed): for sale behind a shutter with a FOR SALE board; yours with
    its name lit on the fascia, an awning, the door open, an OPEN sign,
    crates of its stock on stands, neon and planters at level 2, its name on
    the roof at level 3, stars by the door. On screen: the business card's
    Units tab has a second row of chips for them (buy, shelves, Market hall,
    Upgrade), the Vault's estate agent lists them, the market hall and the
    Post office take them, the Apartments hire for them, and walk mode
    prompts at each door ("Trench Mart · For sale").
  - **The riverside** (the owner's call: "variety and an architecturally
    impressive waterfront") is row A's four blocks redesigned:
    `riverside.ts` (DOM-free, tested in `tests/riverside.test.ts`): their
    river side a row of landmarks fronting the bank avenue (`FRONT_Z`), each
    its own architecture, their Trench Avenue side a strip of brownstones
    and the corner shops (`STRIPS`), service yards between (`YARD_Z`):
    **The Wharf** (`WHARF`: a glass lobby with a roof terrace, four stacks
    of glass floors each shifted off the one under it, white floor plates,
    a lit crown), **The Refinery** (`REFINERY`: an old red-brick sugar works
    turned lofts, tall arched windows, a monitor roof, the round brick
    chimney, REFINERY in yellow neon on a steel lattice on its roof),
    **Harbor Stores** (`STORES`: dark brick over an arcade of round arches,
    hoist beams, a ghost sign, a glass penthouse set back on the roof),
    Trench Arms, **The Pier House** (`PIER_HOUSE`: a pale stone ferry hall
    with tall arched windows, a balustrade and a copper mansard, its clock
    tower on Pier 7's line with a dial on each face, the belfry and the
    copper cupola), The Rusty Nail and Club PULSE; every top under the
    Emporium (`TALLEST`). `RIVERSIDE_SOLIDS` (in `SOLIDS`). Drawn by
    `riverside3d.ts` (`buildRiverside()`: the Wharf, the Refinery and
    Harbor Stores as sites, walls from the wall atlas, arches as flat
    shapes with extruded frames (`archPane()`, `archFrame()`), the
    riverside's sign atlas `SIGNS` / `signPlane()` with fixed made-up copy).
  - **The waterfront** (the owner's pick: a boardwalk over the water and a
    pier; the plan and what's next: `docs/waterfront-plan.md`) is
    `waterfront.ts` (DOM-free, tested in `tests/waterfront.test.ts`): the
    boardwalk (`BOARDWALK`, from the bank avenue's kerb out `OUT` over the
    water, from the highway's slip lanes to the town's promenade), **Pier
    7** (`PIER`: its neck under the arch, `ARCH`, and its head with the
    `KIOSK`, `BINOCULARS`, `FISHERS`), the old docks (`CRANE` straddling the
    boardwalk, its jib over the `BARGE`), the dressing (`LAMPS`, sodium
    always (world.ts), `BENCHES`, `PLANTERS`, `BOLLARDS`, `RINGS`), people
    strolling (`STROLL`, life.ts), `WATERFRONT_SOLIDS` (in `SOLIDS`: the
    crane's legs, the arch's posts, the kiosk). Walking: the decks are
    ground at `DECK_Y` (`DECKS`, `onDeck()`: walk.ts lets you off the river's
    wall only onto them; their edge is the railing). The boats keep clear:
    the south lane's boat stays east of it (`BOAT_EAST`), the middle lane
    swings north round the pier's head (`boatZ()`). Drawn by
    `waterfront3d.ts`: the boardwalk in sites a tile long and the docks a
    site (`buildWaterfront()`), and Pier 7 with the Pier House a place at
    the boot (`buildPier()`: spot `pier`, its pin over the arch, panel
    `data-panel-tpl="pier"` with Walk in to `PIER_SPAWN`, a `PLACES` entry;
    the clock's hands keep the visitor's time). On the world map the decks
    are drawn in wood.
  - **The Night Market** (the owner's call, the waterfront plan's first
    next step; scenery for now, stalls to run later) is `nightmarket.ts`
    (DOM-free, tested in `tests/nightmarket.test.ts`) on its deck out over
    the water in front of Harbor Stores (`MARKET_DECK` in waterfront.ts, one
    of `DECKS`, open to the boardwalk along its length (`RAIL_GAPS`), the
    middle boat lane swinging round it in `boatZ()`, the boardwalk's dressing
    kept off it): `STALLS` along its water side, counters facing the city
    (four containers, two food trucks, a cart, made-up names `STALL_NAMES`),
    `TABLES` (two rows of picnic tables) between the queues (`QUEUE`) and the
    boardwalk's walk (`WALK_FROM`, the strollers pass behind), NIGHT MARKET
    on the `GANTRY` over the boardwalk (both ways), string lights and paper
    lanterns from the stalls' roofs to the `POLES`, `HEATERS`, the cooks
    (`VENDORS`) and diners (`DINERS`), `NIGHT_MARKET_SOLIDS` (in `SOLIDS`).
    Drawn by `nightmarket3d.ts` (`buildNightMarket()`, a place at the boot:
    spot `nightmarket`, its pin over the gantry, directory entry, panel
    `data-panel-tpl="nightmarket"` with Walk in to `MARKET_SPAWN`, a `PLACES`
    entry; one sign atlas of fixed made-up copy).
  - **The Block** is a place (`theblock.ts`, built at the boot): spot
    `trenches` (pin over the court, directory entry, panel
    `data-panel-tpl="trenches"`: the storyline starts here, coming soon,
    with **Walk in** to `BLOCK_SPAWN`; place `trenches` in `places.ts`).
    The plaza with THE BLOCK on a gantry (both ways, `occlude()`), the
    court (lines, keys, two hoops, the chain-link in the FX layer, two
    floodlights), the playground (climbing frame and slide, swings, a
    see-saw, a low wall), the handball wall painted both sides, the
    garden, tables, string lights over it all, lamps, trees, and its
    people (a game on the court, benches, tables, groups chatting,
    handball).
- **Westlake Park** (growth plan Phase 9b, the owner's call: a park
  district with a stadium as its attraction, scenery only for now) on the
  land west of town, north of the river, between the ring highway and the
  Parkway. Built in steps, each with the owner's sign-off: (1) the land,
  the lake and the paths (built); (2) the stadium (built); (3) the park's life
  (boats, a boathouse, people, its sound; built). The three strips south
  of the ring avenue (and their courts) became Uptown (below).
  - `westlake.ts` (DOM-free, tested in `tests/westlake.test.ts`): the big
    block (`BIG`: `X0` clear of the highway's slip lanes, `X1` its
    sidewalk alongside the Parkway's, `Z0` the highway's north side round
    its north-west bend, `ZS` the west ring avenue), `WESTLAKE_BLOCKS` in
    the street plan as a park, `WESTLAKE_RECT` (the outskirts' trees keep off it);
    the lake (`LAKE_C`, `lakeR()`, `lakeAt()`, `lakeLine()`, `inLake()`:
    walk.ts stops you on the lawn at its rim (`RIM`), cars stop at
    `LAKE_WALLS`, which drive-sim.ts adds near it); the paths (`PATHS`:
    `ring` round the big block, `loop` round the lake (`LOOP_OUT`), the
    Mall (`MALL`) from the south gate to the stadium's forecourt, the ways
    in from `GATES`; `onPath()`); the gates' piers
    (`GATE_PIERS`, `WESTLAKE_SOLIDS` in `SOLIDS`); `PARK_TREES` (the Mall's
    avenue, clumps from a seeded noise; `clump` ones,
    every other, left out on phones), `PARK_LAMPS` and `BENCHES`;
    `GARDEN_SITE` (the stadium's old site, kept for the formal garden); step 3's
    land: the boathouse (`BOATHOUSE`, solid) and its jetty (`JETTY`,
    `onJetty()`: walk.ts lets you out along it, at its deck's height). Its
    trees and lamps are placed
    at the boot with the town's (`addTree()` / `addLamp()` in index.ts).
  - `westlake3d.ts` draws the rest as sites: the paths (a stretch a
    site: the main walks paved, the rest pale gravel), the lake's stone rim (in quarters), the
    gates (stone piers, caps, lanterns; the Mall's with iron posts, a beam
    and WESTLAKE PARK on a board both ways, one small texture), benches
    (near only); and on the main thread the lake's water (one mesh, the
    river's `waterMat`). It's the first district loaded as you approach
    (`districts.ts`, below). The world map draws its lawns, the lake and
    its paths; the benchmark has a view over the lake (`park`).
  - **The park's life** (step 3) is `parklife.ts` (DOM-free, tested in
    `tests/parklife.test.ts`), everyone and everything a function of the
    time: walkers, joggers and dog walkers in lanes (`LANES`: walkers near
    a path's middle, joggers by its edges, either way, everyone in a lane
    at its pace and evenly spread) round the lake loop and the ring walk,
    up and down the Mall (`PARK_PEOPLE`, `trim` ones left
    out on phones), dogs on the lead ahead of their walkers (`DOGS`,
    `LEAD`), people on every third bench, picnics in the glades
    (`PICNICS`) and the boats on the lake (`BOATS`: rowing boats and swan pedalos on rings
    along the shore's normals, `ringLine()`, `RINGS`, each its own pace and
    way round so none meet; rowers and swan riders aboard; two moored at the
    jetty). The people are the crowd's (life.ts, kind `park`; clips `jog`
    and `picnic`); `parklife3d.ts` (the park's chunk) draws the boathouse,
    the jetty and the picnics as sites and, on the main thread
    with the district's tick, the boats with their sweeping oars, the dogs
    and their leads, an instanced mesh a kind (not drawn
    while the camera is far from the park). Its sound: `park` (birds by
    day, an owl at night) in ambience.ts, the lake in `water`.
  - **Sector 7 Stadium** (step 2; moved north of the ring highway in the
    north side's stage 1, `docs/north-plan.md`, the owner's call) is
    `stadium.ts` (DOM-free, tested in `tests/stadium.test.ts`) on its own
    block north of the highway (`BLOCK`, in the street plan as `stadium`),
    in line with the Mall (`CENTRE`): a soft-cornered oval bowl (`ovalAt()`,
    `oval()`, `inOval()`; `FACADE`), two tiers of seats (`TIERS`) with a
    concourse between (`CONCOURSE`), a roof ring over the upper tier
    (`ROOF`), the pitch (`PITCH`) and its track (`TRACK`), four floodlight
    masts (`MASTS`, `MAST`; `TALLEST` under the Emporium), the big screen
    over the north stand (`SCREEN`) and the main gate in the south facade
    (`GATE`, under `NAME`, fixed made-up copy), `STADIUM_SPAWN` on the
    forecourt. Stadium Road (`ROAD`) runs west off the north road (ns0) past
    its front, and the car park (`CAR_PARK`, `BAY_ROWS`, `BAYS`, `PARKED`) is
    inside a one-way loop off it east of the stadium (`LOOP`), as the
    airport's is: `STADIUM_STREETS` / `STADIUM_CROSSINGS` in the street
    plan, so traffic drives them, coming off the highway at ns0, whose outer
    corners get slip lanes too (`OUTER_SLIPS` in streetplan.ts). The
    footbridge (`BRIDGE`) carries the Mall from the park up over the ring
    walk, the park's edge, the highway and Stadium Road and down to the
    forecourt: walkable (`bridgeY()`, `bridgeWall()` in walk.ts, as Liberty
    Bridge's), its piers (the middle one on the highway's median) and its
    stairs past their first steps solid. `STADIUM_SOLIDS` (in `SOLIDS`):
    the facade all round, the gates shut until there are events, the masts,
    the parked cars, the footbridge's piers and stairs; `STADIUM_LAMPS`,
    `STADIUM_RECTS` (the outskirts' trees keep off; no highway lamp under
    the bridge). The stadium is drawn by `stadium3d.ts` (`buildStadium()`, a
    place built at the boot: seats in sections of magenta, purple and cyan,
    the roof's neon edge, lamp heads on the masts and their pools of light
    on the pitch at night, the screen and the name board from one small
    atlas, the parked cars); its grounds (the road, the car park with its
    bays, one-way arrows and P sign, the footbridge) by
    `stadiumgrounds3d.ts`, loaded as you approach with the park's chunk
    (`LAZY_DISTRICTS`: `westlake`, whose land covers it too).
    It's a place: spot `stadium` (pin, directory entry, panel
    `data-panel-tpl="stadium"`: events coming soon, Walk in), the gate's
    door prompt opens it, `PLACES` entry. Its sound waits for events. Its
    old site in the park (`GARDEN_SITE` in westlake.ts) is kept clear for
    the formal garden (stage 3), the Mall running through it to the
    footbridge's foot (`BRIDGE_FOOT`); the old car park on the first strip
    went back to park.
- **The north side** (the owner's call): the stadium and the kart park
  moving north of the ring highway and Westlake Park's paths, kerbs, low
  walls and gardens, planned in `docs/north-plan.md` in three stages, each
  with the owner's sign-off; keep it up to date. Stage 1 (the stadium
  north, above), stage 2 (the kart park north, with its facility, below)
  and stage 3 (the park's walks, walls and gardens) are built:
  - `gardens.ts` (DOM-free, tested in `tests/gardens.test.ts`): the main
    walks (`MAIN_WALKS`: the ring walk, the lake loop, the Mall) paved with
    a raised stone kerb both sides (`KERBS`, `KERB`), the gravel paths with
    a flush stone edge (`EDGES`), both cut where a path joins, at the
    jetty, the round places and the terraces; the park's low stone wall
    (`WALLS`, `WALL`), broken at the gates and the paths; the formal garden
    on the stadium's old site (`GARDEN_SITE`) in its own wall
    (`GARDEN_WALLS`): the cross walk and two garden walks (`garden-cross`,
    `garden-w`, `garden-e` in westlake.ts's `PATHS`), two round places with
    fountains (`ROUNDS`, `FOUNTAIN`), eight parterres (`PARTERRES`: hedge,
    gravel border, flower bed, topiary cone), urns (`URNS`), benches
    (`GARDEN_BENCHES`), lamps and people (`GARDEN_LAMPS`, `GARDEN_PEOPLE`,
    placed at the boot in index.ts); planters (`MALL_BEDS` along the Mall,
    round `PLANTERS` at junctions and along the ring walk and the loop);
    `GARDEN_SOLIDS` (in `SOLIDS`: walls, hedges, fountains, urns,
    planters). The lakeside terraces are westlake.ts's (`TERRACES`,
    `TERRACE_STEPS`, `onTerrace()`, `terraceY()`): steps off the loop down
    to just over the water, walkable (walk.ts, as the jetty), nothing on
    them solid; the trees, lamps and benches keep off them.
  - `gardens3d.ts` (the park's chunk, from westlake3d.ts's `register()`)
    draws them as sites: kerbs, edges and walls a site per tile, the
    garden one, the planters a site per tile, each terrace one; flowers,
    benches and lanterns near only. The main walks' paving is
    westlake3d.ts's (`PAVE_Y`, over the gravel's `PATH_Y`).
- **Uptown, the financial centre** (the owner's call): Westlake Park's three
  strips (x -200.5 to -43.3, z 0 to 60, the north bank avenue along the
  river) becoming a waterfront boulevard and financial centre with
  skyscrapers and a plaza, planned in `docs/finance-plan.md` in five
  phases, each with the owner's sign-off; keep it up to date. Its name is
  **Uptown**. Its towers may rise above the Emporium (the owner's call: the
  tallest about 30 tiles, the rest 15 to 25; the Emporium stays the
  tallest downtown and the most detailed, and "under the Emporium" holds
  everywhere else); the flying traffic and your own aircraft clear them.
  The strips' courts and their players are retired with it. Scenery first;
  in Phase 5 the tallest tower becomes a place with a sky deck. Phase 1
  (the land and the streets) is built:
  - `uptown.ts` (DOM-free, tested in `tests/uptown.test.ts`): three
    north-south streets (`UPTOWN_STREETS`, `NS_X`: in line with The
    Trenches' cross streets across the river) from the west ring avenue to
    the north bank avenue, every junction lit (`UPTOWN_CROSSINGS`); twelve
    blocks in rows n, m and s (`UPTOWN_BLOCKS`, ref `uptown` in the street
    plan), the plaza's on the middle row (`PLAZA_BLOCK`, use `plaza`); the
    Mall's axis carried on south from its gate (`AXIS_X`): walk-only lanes
    through the blocks either side of the plaza (`UPTOWN_LANES`, alleys in
    the plan) and zebras over the avenues and cross streets
    (`AXIS_ZEBRAS`; the avenues' medians and lines break there,
    `highwayGaps()` in world.ts); the hoardings round the empty lots
    (`HOARDINGS`, `HOARDING`, open at each lot's gate, `HOARDING_GATES`,
    and along the lanes), solid (`UPTOWN_SOLIDS`, in `SOLIDS`); lamps
    along its avenues and cross streets (`UPTOWN_LAMPS`); the boulevard's
    line (`BOULEVARD_X`: the town's promenade carried on west along the
    north bank, its railings, trees, benches and lamps on the town's
    rhythm, neighbourhoods.ts and world.ts); `UPTOWN_RECT` / `inUptown()`.
  - Its streets are drawn at the boot by `streets3d.ts` (`drawStreets()`,
    shared with The Trenches, clean here: no wear), its lots are bare
    earth (world.ts), and the hoardings (dark boards printed with UPTOWN
    and COMING SOON from one small atlas, capping rail, posts behind near
    only, a header over each gate) and the lanes' paving are a district
    loaded as you approach (`uptown3d.ts`, `LAZY_DISTRICTS` id `uptown`).
- **Districts loaded as you approach** (performance phase 4, item 10):
  a district's drawing is a module of its own (`LAZY_DISTRICTS` in
  `districts.ts`: an id, its land and `load()`, a dynamic import), a chunk
  the boot never downloads. `createDistricts()` loads it when what the
  camera looks at (or Degen, walking) comes within the tier's `far` and
  `LEAD` of its land; its `register({ low, scene, tick })` registers its
  sites (and, given the scene and the city's tick, anything the main thread
  draws itself, moving things too), the site
  worker loads the same module from its `SELF` (`import.meta.url`) and
  registers them there (`SiteWorker.load()`), and then `works.adopt()`
  queues them. Everything else about a district (its blocks and streets
  in the street plan, its solids, where its trees and lamps stand, its
  places) is DOM-free data in the boot, so nothing waits on the chunk.
  `?bench` loads every district before it starts. A new district comes
  the same way.
- **City life** (behaviour and animation of the traffic, the people and
  your car at no cost in memory: the owner's brief, 2026-10) is planned in
  `docs/life-plan.md`; keep it up to date, one phase at a time with the
  owner's sign-off. Rules go in DOM-free code with tests; the view only
  draws them on the meshes the city already has. Phase 1 (traffic that
  behaves) is built: `traffic.ts` (DOM-free, tested in
  `tests/traffic.test.ts`) holds the rules and `life.ts` draws them:
  brake lights (the tail-light mesh's `instanceColor`, bright while
  `braking()`), headlights faint by day, a reaction time at every stop
  (`pullAway()`, a queue peels from the front), a nod under braking and a
  lean in turns (`bodyMotion()`), indicators before turns (`turnsOf()` on
  each route's polyline, `indicating()`, `blinkOn()`; four more instances
  a car in the tail-light mesh, amber lenses under the lamps at
  `CarGeometry.turn`, on the flat of the body: a lit lens laid over one of
  the model's own small details is swallowed by its ink outline) and a
  horn when a car is held up by you (`hornDue()`, `LifeOpts.horn`, the
  `horn` sound). No new draws, no new geometry. Phase 2 (your car's feel)
  is built: the rules in `drive-sim.ts` (`carLights()`: brake lights,
  reversing lights, indicators with the wheel below `SIGNAL_SPEED` and
  held `SIGNAL_HOLD`; `gearOf()`: four gears, the revs dropping at each
  shift; `skidding()`: the tyres' sideways speed), drawn by `drive.ts`
  and `createCar()` in cars.ts (lit lens materials swapped on the car's
  own lenses, amber indicator lenses under the lamps, `car.lights()`), a
  horn (H, the Horn button `[data-drive-horn]` over the Brake pedal, your
  car's only through `.in-car`, the gamepad's left stick pressed,
  `drive.horn()`), skid marks (one fixed mesh of `SKID_N` quads with a
  small alpha shader, under the rear wheels while sliding, fading over
  `SKID_FADE`; none under reduced motion; multiply blending isn't honoured
  in the post chain, so don't use it for decals), the `tyres()` screech in
  sound.ts, and the headlights' pool and brake wash as two glow points
  dark by day. Phase 3 (people who notice) is built: `pedestrians.ts`
  (DOM-free, tested in `tests/pedestrians.test.ts`): `crossingLinks()`
  (the walked blocks' corners across one street at a lit junction, never
  an avenue or a junction's middle), `walkLight()` / `redLeft()` (red for
  the cars with time to get over), `takesCrossing()`, `noticing()`
  (`NOTICE`, `NOTICE_HOLD`), `hurry()` (the rain), `outAtNight()` (1 to 5,
  `Env.hour` from sky.ts) and `BENCHES` / `SEAT_H` (data for a later
  seated state); life.ts's people tick walks them (a walker on a crossing
  or waiting at a kerb, `Person.cross` / `wait`, joins the other block's
  lane at the corner it arrives at; stops and faces you within reach;
  sitters go in past 0.6 of rain). Nothing new is drawn. Phase 4 (buses,
  boats and the weather's small reactions) is built: `transit.ts`
  (DOM-free, tested in `tests/transit.test.ts`: `BUS_STOPS` from the
  street plan, along every avenue in town each way, in the kerb lane,
  clear of the crossings, the bridges and anything solid on the sidewalk;
  `routeStops()`, `pullIn()` (a bus in the inner lane eases over to the
  kerb and back), `busStep()` (slowing in, a `DWELL` with the brake
  lights on and the doors' hiss, then on); the shelters are
  `transit3d.ts`, a site each, near only, not solid, built in the worker
  too), `boats.ts` (DOM-free, tested in `tests/boats.test.ts`: a horn
  before every bridge (`hornDue()`), the speed easing (`cruise()`), the
  wake by the speed (`wakeOf()`), two boats `MOORED` at jetties clear of
  the lanes) and `dusk.ts` (DOM-free, tested in `tests/dusk.test.ts`: the
  lamps coming on one by one at dusk with a flicker (`lampGlow()`, drawn
  by `buildLamps()`'s tick on the halos' and pools' colours; the bulbs
  come up with the night), thunder in heavy rain (`stormStep()`: a soft
  brighten of the sky, never a hard flash, the rumble after; run by
  sky.ts, off under reduced motion), the steam `VENTS` in The Trenches'
  streets (`puff()`; six points near the camera at night, none on
  phones) and the wind (`windStrength()`): the canopies' sway rides in
  their uv (`SWAY`, `Batch.instances()`'s `sway`; the shared paint has no
  texture) and `injectWind()` in kit.ts swings it in the paint's shader
  and the ink outlines' normal pass (phones' canopies carry none; merging
  a tile re-normalises normals, so never encode anything in their
  lengths)). The life's sounds go through `LifeOpts.sfx` (`horn`,
  `doors`, `boatHorn`; `thunder` from index.ts). **Not character
  animation** (the owner's call): this plan picks which existing clip a
  crowd person plays and where they stand, never a pose, clip or rig
  change on Degen; that's `docs/animation-plan.md`'s (sitting on a bench
  waits for it).
- **Cars** are `src/scripts/city3d/cars.ts`: real-proportion cartoon models
  (City Hatch, Cruiser, Street GT coupe, Hauler pickup, Box Van, City Bus;
  made-up names, never a real make or badge), each a bevelled extruded
  body and cabin with blacked-out window frames and glass, light clusters
  (lamp shape `lamp`) with bezels and indicators, a grille, door seams and
  handles (`seams`, `handles`), sills, exhausts, mirrors, bumpers, plates
  and fat lathe-turned tyres on spoked rims (`rim`, `spokes`), plus each
  model's own touches in `extra()` (spoilers, stripes, flares, a light bar,
  a ladder, roof pods). Keep `top` and `cabin` as the side outline: the
  garage cards draw their silhouettes from them. A model is two
  geometries, `paint` (each car its own colour, `PAINTS`) and `detail`
  (vertex colours), plus the bus's lit windows, so the traffic in `life.ts`
  costs two draw calls a model. Parked cars use `parkedCars()`; give them a
  footprint in `solids.ts`. Keep a new model inside a 1.7-wide lane and in
  scale with Degen (a hatch's roof is about 0.95 tiles up).
- Keep the city's motion optional: under `prefers-reduced-motion` the 3D
  city stands still (no fly-in, no traffic), CSS animations stop and the 2D
  map's SMIL traffic is paused. It's drawn only when something changes
  (`dirty` in index.ts): what's built as you go asks for a frame at most
  once a second (`builtShows()`). Sound is always off until the visitor
  turns it on.
- Keep phones light: `src/scripts/city3d/index.ts` picks a quality tier
  (fewer cars and people, no shadows, smaller bloom on phones), runs phones
  at 30fps while nobody is touching the city, and steps quality down
  (pixels, then shadows, then bloom; never the ink outlines) if frames are
  slow. When frames stay fast again, bloom and then pixels come back (once
  each; shadows stay off, re-enabling them recompiles every material).
  The trim (the owner's call, phones only; `docs/performance-plan.md`):
  trees are lighter near (a dodecahedron canopy, four-sided trunks, open
  five-sided cones) and two crossed flat cards far (`crossedCards()` in
  `world.ts`, the tile's far piece), and half the outskirts' trees (the
  belt and the woods, `scatterOutskirts()`'s `keep`) are left out; lamps
  are four-sided and open-ended; parked cars are always their far form
  (`initFarCars()`'s `parkedAlwaysFar`); every other idle person in The
  Trenches and downtown (the square, the market, the landmarks) is left
  out (`buildPeople()` in `life.ts`) and there are 15 walkers (`TIERS`).
  Phones also draw the big canvas textures (512 x 512 pixels or more: the
  atlases, the long signs) at half size, a quarter of the memory
  (`canvasTex()` in `kit.ts`; a draw function works in the numbers it
  asked for and never knows; a texture redrawn live in pixels afterwards
  must stay under that size, and goes through `liveTex()`). The 2D map isn't in the page until it's
  shown: it waits, inert, in a `<template data-map-tpl>` (`mountMap()` in
  `CityMap.astro`, from `show2d()`), so the 3D city's boot never lays it
  out. Phones draw the bloom at 3 of its 5 blur levels (`bloomMips` in
  `post.ts`: a softer glow, 4 fewer passes a frame); desktop draws all 5.
- **Start-up stays light** (performance phase 2,
  `docs/performance-plan.md`):
  - Data that's the same for everyone is worked out when the site is
    built, not in the browser: `baked(key, make, pack?, unpack?)` in
    `baked.ts` returns what the build put in the page (`__CITY_BAKED__`, a
    JSON string; `scripts/bake.mjs`, run from `astro.config.mjs`, loads the
    modules in Node and records what each `make()` made), or works it out
    with `make()` where there's none (the tests, the game server). Today:
    the traffic's routes (`routes.ts`, packed with `packRoutes()`), the
    crowd's walk, jog and march cycles (`crowdclips.ts`) and The Trenches'
    amenities (`commons.ts`). A new module that bakes goes in `MODULES` in
    `bake.mjs` and in `tests/baked.test.ts`, which holds every key to
    exactly what `make()` makes. Baked data must be plain (numbers,
    strings, arrays, objects): anything with references packs and unpacks.
  - Features load when they're used, each its own chunk (`import()`):
    the fight (`fight.ts` and the figures' clips, when the trainer's menu
    first opens: `loadFight()` in `walk.ts`), the stage of the fitting room
    and the character screen (`stage.ts`), SMAA (`post.ts`), the fight
    demo, the benchmark (`?bench`, `bench.ts`), Drop 001's fitting room
    (`fitting.ts`, when its panel first opens: `loadFitting()` in index.ts)
    the world map (`worldmap.ts`, when it first opens: `loadMap()` in
    travel-ui.ts; `placeName()` is places.ts's) and the kart park's game
    (the hut's menu and the race, `kartgame.ts`: `loadKarts()` in walk.ts,
    when Degen comes near the park or asks at the hut; idle stand-ins until
    then; the City-view panel's records are `kart-records.ts`, at the boot). New features that aren't needed until they're used come the same
    way. three.js is a chunk of its own (`manualChunks` in
    `astro.config.mjs`), so a deploy that doesn't change it leaves it
    cached.
  - A service worker (`public/sw.js`, registered in `Base.astro` in the
    built site only) keeps the files in `/_astro/` (named by their contents)
    on the device for return visits; pages always come from the network.
    `.htaccess` keeps `sw.js` itself uncached.
  - Shaders are compiled for where the city draws, the post chain's
    linear target (`compileFor()` in `index.ts`: at the boot, with
    `compileAsync`, each site as it's built and each place's far form as
    it's made). `renderer.compile()` with the screen as the target makes
    sRGB programs no frame uses, and the real ones then compile the first
    time they're drawn (a hitch): never call it bare.
  - **Textures made at build time** (performance phase 4): every canvas
    texture the boot paints (`canvasTex()` in `kit.ts`) is painted once by
    `scripts/bake-textures.mjs` (`npm run bake:textures` after a build;
    the "Build site" Action runs it) in a headless Chromium with
    `?bake-textures`, for phones (`low`) and everyone else (`full`), twice
    each (a fresh save at noon, a well-used one at midnight): only what
    both runs painted the same is kept, so a key (`texKey()`: what draws
    it, its size, how many like it came before) stands for one picture.
    Each is GPU-compressed (KTX2: Basis ETC1S, UASTC where ETC1S loses
    too much), written to `_astro/tex/` and listed in the page
    (`#city-tex`); `loadBuiltTextures()` loads them with three's
    transcoder (`_astro/basis-<three's version>/`) and the boot waits for
    them (up to 8 s, then they come in as they arrive). The bake waits for
    the web fonts; if it can't run it warns and the site paints them as
    before. A texture drawn from the save or changed while the city runs
    (units, lots, plots, corner shops, the garage's car, karts, guns, the
    first-person hands, the stage, the LED wall, a sign with `live: true`
    in `neonSign()` / `facade()`) uses `liveTex()`: always painted, never
    baked. A drawing that changes means a new bake (every build makes
    one). `?textures=0` paints them all in the browser, to compare.
  - **Sites built off the main thread** (performance phase 4,
    `sitework.ts`): a worker imports the city's own chunk, registers the
    same sites the boot does (The Trenches' builders, every tile's trees
    and lamps from the main thread's `placed()`) and builds them as
    they're asked for (`IN_FLIGHT` at a time, nearest first, from
    `works.step()` in `tilework.ts`), sending each mesh's arrays and its
    material's name; the main thread joins them with its own material of
    that name (`siteMat()` / `siteMatOf()` in `kit.ts`: every material a
    site draws with needs one, the Batches' shared ones have theirs). A
    site whose material has no name, and anything wanted at once (the
    boot, `want()`, `wantView()`, near pieces built again) is built on
    the main thread. The worker closes once every site is built.
    `?worker=0` turns it off. A new district's builders go in
    `serveSites()` too.
  - **Budgets** (`scripts/budget.mjs`, `npm run budget` after a build; the
    "Build site" Action runs it): the homepage's HTML, the page's own
    script, the 3D city's boot code (its chunk and what it imports
    straight away), the biggest lazy chunk and the CSS, gzipped, each
    under a fixed size. Raise one only on purpose, never to get a build
    through.
- One render loop only: always (re)start it with `loop()` in `index.ts`,
  which cancels any frame already queued. A hidden tab holds its queued frame
  back, so a bare `requestAnimationFrame(frame)` on return stacks a second
  loop (each tab switch another) and the frame rate sinks. 120/144 Hz screens
  draw every other refresh (steady 60-72fps), and nothing is drawn while the
  city is scrolled out of view.
- **Draw calls are the budget.** Build static geometry through a `Batch`
  (`kit.ts`): plain `toon()` colours (no options) and `neon()` fold into
  shared materials with the colour per vertex (`sharedFor()`), so a Batch's
  plain colours are one draw and its steady neon another (each vertex
  carries its day and night brightness in a `lit` attribute the shared
  neon's shader mixes by the time of day; only flickering neon is a draw
  per brightness). Never change a
  plain `toon()` or `neon()` material's colour at runtime (give anything that
  changes colour its own material, or instance it with `setColorAt`). Many
  copies of one thing are instanced (trees, lamps, traffic lights, birds,
  crowds, cars). A moving thing merges its fixed parts (`mergeMeshes()`).
  A box with side and top materials is `sidesBox()` (two draws, not six).
  Signs that come in sets share one canvas atlas, a row each, and merge
  into one mesh (the market's canopies and boards, `atlas()` /
  `rowPlane()` in `market.ts`; the Emporium's LED wall is one mesh with one
  occluder).
  Flat things are flat: the lane markings are two-triangle planes, tree
  trunks open-ended (triangles count too). `tileBatch()` files each
  triangle under the tile its middle is in, so nothing fixed may have a
  triangle much longer than a tile (it would go with that tile when it's
  out of view): world.ts draws a block bigger than a tile a piece per tile
  (`tiled()`, `tiledSlab()`: the lot as its top, the sidewalk a `ring()`
  laid on it), and long things go in stretches.
  `consolidate()` merges each landmark's Batch meshes per material after the
  city is built (not for the units, lots and plots, which rebuild theirs).
  Everything else fixed (the Batches built straight onto the scene, and the
  airport's and kart park's) is merged **per tile** by `tileBatch()`
  (`tilebatch.ts`, growth plan Phase 1): each material's triangles split by
  the tile (`tiles.ts`, `TILE` 30) their middle is in, each tile's share one
  piece of a `BatchedMesh`, so it's still one draw per material but only
  the pieces in view are drawn (and in the shadow map only those in the
  sun's shadow box). Fixed things spread over the map go through a Batch
  too, not an InstancedMesh: `Batch.instances()` (the trees, lamps and road
  markings), so they're split by tile with the rest. Moving instanced
  things (crowds, traffic) draw only what's in view and put what's in the
  sun's shadow box first, so the shadow map draws only those
  (`CROWD_VIEW.shadow`, `onBeforeShadow` / `onBeforeRender` set each
  mesh's count per pass). The shadow map is drawn once a frame (`post.ts`),
  however many passes render the scene, and the ink outlines' normal and
  depth pre-pass only reaches as far as the outlines do (its own camera's
  far plane at the ink's `fadeFar`), so the far city is drawn once, not
  twice. A place's hover ring isn't drawn while it's faded out. Measure
  with `?fps` and `?bench` before and after.
- **Near and far** (growth plan Phase 2): past the tier's `far` (`TIERS`:
  120 high, 110 medium, 90 low) from the camera, things are drawn in a far
  form; `isNear()` in `tiles.ts` decides, with a margin so nothing flickers
  on the line.
  - A Batch's details are near only (`Batch.lod`, `Batch.detail()`; Lod
    'all' / 'near' / 'far'): `tileBatch()` keeps each tile's near and far
    pieces apart and swaps them together (`tiled.update()`). The infill's
    walls, roof slabs, signs, the diner's neon and the offices' crowns are
    drawn at every distance (`k.all()` in `infill.ts`), everything else on
    a building is near only, and so are the alleys', lanes' and parks'
    dressing, benches, bollards, the promenade's posts and the lamps (their
    halos stay). New fine detail on a building goes in near only.
  - Each place (every spot's group, the garage, the market) has a far form
    (`farForm()` in `lod.ts`): everything in it flattened into one mesh
    coloured per vertex with a glow per vertex for lit windows and neon
    (`farFormMaterial()`, by day and at night), triangles under `TINY` left
    out; big textured surfaces (facades) keep their textures, merged per
    material. What must stay as it is (the hologram, the LED wall, the
    equalizer, beams and glows, glass, Liberty's flames, the garage's
    turntable with your car, anything moving: `keeps()`, or
    `userData.keep` on a part) is drawn at every distance. The near parts
    move into a `<name>-near` group, so code that shows or hides a part
    still can. `addLod()` / `addLodSwitch()` swap them (`updateLods()`
    from `index.ts`). They're made after the first frame, a place at a
    time in spare moments (`farQueue` in `index.ts`); until then a place
    stays near.
  - Cars far away (parked and traffic) are their model's far form
    (`farCarGeometry()` in `cars.ts`: the body and cabin outlines
    extruded, block wheels, about a hundred triangles), all in one
    `BatchedMesh` (`initFarCars()`, `theFarCars()`), one draw for every
    far car; a parked lot swaps whole, a car in traffic by its own
    distance. On phones parked cars are always far (the trim).
- **Building as you go** (growth plan Phase 3): the fixed city outside
  the places is made of sites (`site(id, rect, build)` in `tilework.ts`):
  a function that draws a piece of the city from data into Batches only
  (no ticks, crowds, solids or pools of light; those stay with the boot),
  the same every time it runs. Today they're each tile's trees and lamps
  (`world.ts`), the airport's runway and apron (`airport.ts`) and the
  kart park's grounds and circuit (`kartgrounds3d.ts`); new districts and
  building kits come as sites.
  - The boot builds only the sites in the home view's and the intro's
    tiles (`bootSites()` in `tileplan.ts`) and merges them with the rest
    (`tileBatch()`); the others wait and `works.step()` builds them a
    share of the time since the last frame (15%, 2-3 ms at 60fps, up to
    10 ms on a slow phone: its CPU is free while the GPU draws), and the
    frames that draw nothing build too (`spare()` in `index.ts`: a phone
    resting at 30fps, a fast screen's in-between frames). The start menu
    covers the city completely, so behind it the city is drawn only once
    a second and each frame builds for 24 ms. Nearest first: in the City
    view nearest what it looks at (`look`, `CROWD_VIEW.focus`), walking
    round Degen, and ahead of the camera when it moves fast (`focusOf()`,
    `LOOK_AHEAD`). What's built later joins the same batched meshes
    (`TileBatches.add()`; a mesh grows when it's full).
  - Places ask first: `flyTo()` (every panel's fly-in), walking in
    (`startWalking()`) and the intro (`works.wantView()`) build what's
    waiting where they're going, so nothing pops in on screen.
  - A tile far away (past `far` + `KEEP_LEAD`) lets its sites' near pieces
    in the shared materials go when what's held passes the tier's
    `nearBudget` (`TIERS`: 96, 64, 32 MB; `?budget=MB` in the address
    overrides it, for testing), furthest first (`toRelease()`); it's drawn
    far until the site runs again and puts them back, before it's near
    (`toRebuild()`, `REBUILD_LEAD`). The room they took is reused
    (`BatchedMesh.optimize()`) before a mesh grows. The places, the
    landmarks and downtown's monolithic builders are built at the boot and
    never let go.
  - The rules are DOM-free in `tileplan.ts` (tested in
    `tests/tileplan.test.ts`); the tile pieces and the scheduler are
    tested too (`tests/tilebatch.test.ts`, `tests/tilework.test.ts`).
- **Building kits** (growth plan Phase 4): what a new district is built
  from, as data, so a district is a few lines, not hand-placed buildings.
  - `kits.ts` (DOM-free): the kits (`KitId`): the downtown six
    (brownstone, shop, diner, loft, office, hotel), the terrace and the
    warehouse (rows), the house (in its yard), and one to a block: the
    factory, the school, the mall, the stadium stand and the crane;
    `KIT_SPEC` (widths, floors, front strip), `heightOf()`, `bigParts()`,
    `lotFrame()`, `lotSolids()`; nothing taller than `KIT_TALLEST` (11.2,
    under the Emporium).
  - `recipes.ts` (DOM-free, seeded): `RECIPES` (midtown, mainstreet,
    terraces, suburb, warehouses, rowhouses (The Trenches' brownstones
    and corner shops), and factory / school / mall / stadium /
    works, one big kit each) and `layBlock()`: a row along every straight
    side of a block's outline (the land inside its sidewalk), downtown's
    way (widths in the kit's range, a few set back, alleys with bollards,
    corners to the longer side, slanted sides left as they are), houses
    with yards between, or the big kit filling the inside. Each building
    comes with its footprints, so the collisions come from the same
    recipe. `layDistrict()` lays a district block by block.
  - `kits3d.ts` draws them: the downtown six through infill.ts
    (`infillBuilding()`, its helpers exported), the rest here, all from
    the wall atlas, the sign atlas and the shared materials; walls, roofs,
    signs and lit trims at every distance, details near only, phones
    leaving out the finest. Signs are fixed copy from `SIGNS` (the kits
    added `school`, `mall`, `stadium`; their blades are left out).
    Nothing drawn in a site goes into the city's own lists (a rooftop
    garden's trees are drawn in the site's own Batch, `IN_SITE`).
  - The test district that proved the kits (`?district=test`) was retired
    in Phase 9 (the owner's call: The Trenches took its land); the recipes'
    test lays its 20-block grid as a fixture instead. A district laid by
    recipes joins every grid through `addSolids()` (`solids.ts`,
    `BoxGrid.add()`) and `addSlabs()` (`walk.ts`) when its blocks aren't
    the street plan's, and the outskirts' trees keep off it
    (`keepTreesOff()`).
  - Tested in `tests/recipes.test.ts`.
- `?fps` in the address (`.city-stats`, built in
  `index.ts`): fps, slowest frame, draw calls and triangles per frame, the
  shadow map's share (`post.shadowStat`), geometry and texture memory
  (`sceneMemory()` in `perf.ts`), how many tile pieces were drawn and
  tiles are near, how many far forms are showing, how long the boot took (art, build and its own work less the waits, tiles, shaders), the sites built (at the boot, after, the slowest, waiting) and the near forms held against the budget, quality tier, pixel ratio and any
  quality stepped down. Use it on
  real devices before and after changes; it's invisible without the
  parameter.
- `?bench` runs the benchmark (`bench.ts`, growth plan Phase 0): straight
  into the 3D city, clear day (`?bench=night` for night), quality held, the
  same views (`BENCH_VIEWS`: home, a downtown street, the square, the Build
  overview, the airport, the kart park, a junction on the ring highway,
  The Trenches round The Block,
  where the edge was before Phase 6, the far edge (from `EXT`)) measured for a few
  seconds each, once every site is built (it builds faster while it
  waits), then a 48 s camera route through them (all but the Build overview). Results (fps,
  average / 95th-percentile / slowest frame, CPU ms, draws and triangles,
  the shadow map's, memory, boot) go in a card on the page, the console and
  `window.__bench`; the card's **Copy results** button copies them with the
  device (its user agent and screen), so a real phone's numbers can be
  pasted back. Run it before and after anything that could make the
  city heavier, on a phone and a laptop.
- `tests/snapshot.test.ts` holds every place, door, pad, lot, spawn,
  landmark, downtown building and street where it stands
  (`tests/fixtures/layout.json`; a street's end at the world's edge is
  `'edge'`). Nothing that exists moves; only when the owner moves something
  on purpose, rewrite it with `UPDATE_SNAPSHOT=1 npm test -- snapshot`.
- The Emporium arcade tower (`emporium()` in `emporium.ts`, and in
  `city.ts` for the 2D map) is the centrepiece: keep it the tallest, most
  detailed building. Its LED wall shows (`drawWall`), pixel font, ticker and
  signs use fixed copy only (Insert coin, Player 1, Game on, Hi score with
  made-up names, GM degens, Arcade, Prizes); never put token details on
  them. The rooftop hologram is `createDegen()` in hologram light. Its
  podium, claw machines and prize booth are mirrored in `walk.ts`
  (`SOLIDS`, `CAMERA_ONLY`).
- The Armoury (`armoury()` in `armoury.ts` and `city.ts`) is a modern
  military compound and the players' gun store, not a castle: blast walls
  with razor wire, steel watchtowers, a checkpoint (booth, boom barrier, sign
  gantry) and a flat-roofed concrete gun store with a shopfront, canopy sign
  and a counter where players gear up. It links to the plan window. Keep it
  stealth dark at night (low red and green lights, no floodlights). Its
  soldiers are instanced; the checkpoint guards salute and the barrier lifts
  when the walker (`walker` in `life.ts`) comes near. Its walls, towers,
  checkpoint, store, counter and vehicles are mirrored in `solids.ts`
  `SOLIDS` (shared with the game server).
- **The character rebuild** (the owner's call, critical) is planned in
  `docs/character-plan.md`: a skinned body on real bones built in code, the
  brand-art head, every wardrobe piece rebuilt, grounded hand-keyed
  animation, merch-store logos on the clothes (Dorras and levels), a
  character screen, phones first. Build it one phase at a time with the
  owner's sign-off. Phase 1 (the skinned body, head, hands and feet),
  Phase 2 (walking and running, `locomotion.ts`), Phase 3 (guns and
  fighting on the new bones: `gunfit.ts`, `stance.ts`, the fight clips)
  Phase 4 (merch marks and prints on the clothes, the Merch tab, the
  character screen) and Phase 5 (the crowds and soldiers on the new body,
  skinned on the GPU from baked clips; fighters and other players stepping
  with planted feet) are built: every figure in the city is the one body.
- **The animation rebuild** (the owner's call, critical) is planned in
  `docs/animation-plan.md`: AAA movement (Spider-Man / Ratchet feel,
  neutral athletic) from motion capture, then turns, jumps, armed
  movement, peeking (Q / E), crouch, slide, vault and climb, contact, and
  everyone on the same clips, and (Phase 8, the owner's call) the rifle
  held properly, its butt in his shoulder. Build it one phase at a time
  with the owner's sign-off. Phase 1 (run, sprint and momentum), Phase 2
  (turning, terrain and transitions), Phase 3 (jumps, falls and landings)
  and Phase 8 (the rifle shouldered, below under Target practice) are
  built, for the player on foot:
  - **The data** is CMU's motion capture (free for commercial use; the
    acknowledgment is in the start menu's Options > Credits, named, never
    linked): mostly subject 143's and 127's takes, in `assets/mocap/cmu/`
    (BVH, untouched), listed in `assets/mocap/takes.json` (a `loop` makes a seamless cycle,
    `loopClip()`; `fps` where the file's frame rate is wrong: subject 143's
    are 60, not the 120 cgspeed wrote, so he walked and ran at double speed
    until it was fixed). `npm run mocap` (`scripts/mocap.mjs`) retargets them
    (`mocap-build.ts`: each target bone takes its source joint's turn
    since the T-pose, the feet and the collarbones kept level (CMU's
    shoulder joint sits at the neck: aligned to it, the collarbones held a
    37° shrug), the floor from the ankles, the root smoothed from the
    hips) into `src/data/mocap/clips.bin`
    (`mocap.ts`: 22 body bones at `MOCAP_FPS` 30, turns in 16 bits;
    `mirrorClip()`, `posed()`, `contacts()`); `tests/mocap.test.ts` holds
    the file to exactly what the pipeline makes. It's fetched when walking
    starts (`mocap-load.ts`, a hashed asset), with the animator's own
    chunk (`import('./animator')`).
  - **Moving** is `movesim.ts`: velocity and facing on critically damped
    springs (`MOVE` half-lives), `ahead()` the trajectory; `GAITS` walk
    0.78, run 2.8 (the default), sprint 4.2 tiles a second (about 1.4, 5 and
    7.5 m/s, the owner's call: quick but believable).
  - **The animation** is `animator.ts`: motion matching (`motionmatch.ts`,
    Holden's 27 features, every clip and its mirror, a search about ten
    times a second) with inertialization (`inertia.ts`), playback warped
    to his speed (`RATE`), and faster than the capture his steps lengthen
    as a runner's do (`WARP`: his legs turn over only a little quicker; a
    foot on the ground plays fast enough to stay put, the air slower for
    more hang time, a swinging knee driving higher, and into a sprint a
    longer reach once he's done speeding up: the owner's call, "his legs
    move very fast when sprinting"), the sprint's harder swing and lean and
    a lean into bends (`LAYERS`), and the feet (the ball never under the
    ground, `BALL_UNDER`; a free foot no further down than a step,
    `AIR.kerb`): each held by the ball of the foot
    where the clip has it down (`LOCK`), reached by a hinge-knee two-bone
    IK with a soft reach (`twoBone()`), on the ground under it, the hips
    coming down (at most `LOCK.drop`) when a leg can't reach. `applyTo()`
    puts it on the figure (`Degen.rig`) after its own `update()`, and
    `addLook()` turns the head where the camera looks. walk.ts blends it
    in (`mocapW`) on foot, unarmed, not aiming or emoting, and not during
    the roll on a very hard landing at a run (`LAND_ROLL`, the keyed one);
    everywhere else, and for everyone else, it's `locomotion.ts` as before.
  - **Phase 2:** more takes (running turns, a quick stop, walking into a
    run, turning on the spot, standing and waiting: `assets/mocap/takes.json`
    and `CREDITS.md`); his shown facing follows the clip's own turn, pulled
    to the springs' (`FACE`, `animator.face`: place the figure with it);
    standing still only the idle is searched (`STAND`), and frames near a
    clip's end cost more (`ENDING`); a free foot clears the ground just
    ahead of it (`LOCK.look`), a held one stands on the ground it was put
    down on, the hips follow the feet above his ground (`LIFT`). The feet
    can stand on something other than what he walks on (`AnimInput.feet`):
    Liberty Bridge's treads as drawn (`stairTread()` in liberty.ts, the
    drawing's `STAIR_BASE`) over the ramp walking follows, and walk.ts slows
    him to a brisk climb on them (`CLIMB`).
  - **Phase 3:** jump takes (subject 127's running jumps, 143's standing
    ones; `JUMPS_ONLY` keeps the standing ones' wind-ups out of the
    ground's searches); motionmatch.ts finds each take's flights
    (`FLIGHT`, `Database.flights`, `takeoff` / `touchdown` frames, the
    hips' `bump`), shut to the ground's searches. The animator (`AIR`;
    `AnimInput.grounded`, `vy`, `jump`, `gravity` from walk.ts): a jump
    cuts to the take-off that carries on best, a fall (off something higher
    than a kerb) to a flight's top; the flight plays as far through as his
    rise and fall have gone, its last frames as the ground comes up, the
    flight's own rise taken out (the game does the jump), nothing held; a
    long fall raises the arms; it lands on its own touchdown unless another
    is far better (`AIR.margin`), the landing plays out (`settle`), and a
    harder one squashes the hips and bows the chest (`squash`). walk.ts
    dips the camera on landings and shakes it on hard ones (`LAND_SHAKE`,
    not under reduced motion).
  - **The lab** is `?anim` (`anim-lab.ts`, styles `animlab.css`): the new
    animation beside the old on an open floor, scripted moves or W A S D,
    slow motion, cameras (over his right shoulder too), floors (flat,
    kerbs, stairs, a ledge), any gun in his hands (`gun`, `aim`, `pitch`;
    markers at the butt and his shoulder's pocket), any kind of top
    (`outfit`), the free camera placed with `orbit=yaw,pitch,dist`, jumps
    (programs and Space, walk.ts's jump and gravity), foot traces and
    readouts (the clip, its rate, the match, the blend left, the foot
    slide, the air); `rec`, `prog`, `gait`, `cam`, `floor`, `zoom`, `compare=0` in
    the address set it up for recordings. Review
    every animation change there, and run `tests/animator.test.ts`.
- Every character is one shared Degen body (`src/scripts/city3d/character.ts`),
  sculpted after the brand art at human proportions (about 1.3 tall at
  scale 1, six and a half heads, hips `HIP_HEIGHT` 0.62), with knees,
  elbows, wrists (`Limb.wrist` { roll, bend }, zero by default so nothing
  moves unless a pose asks; fighting turns the fist) and hand sockets.
  - **The skeleton** is `skeleton.ts` (DOM-free, tested in
    `tests/skeleton.test.ts`): 34 bones (`BONES`: hips, `spine1`, `spine2`,
    `chest`, neck, head; per side collarbone, arm, forearm, hand, index
    (`idx1`/`idx2`), the other three fingers (`fin1`/`fin2`), thumb
    (`thb1`/`thb2`), thigh, shin, foot, toes; L is the rig's -x side).
    The proportions (`HIP_Y`, `SHOULDER_X/Y`, `UPPER_ARM`, `PALM_Y`,
    `THIGH`, `NECK_Y`, `HEAD_Y`) feed `reachArm()`, so gun holds and the
    kart's wheel follow them; the walk camera's eye height (`walk.ts`) and
    the bench seat (`SEAT_DROP` in `life.ts`) follow the body too. The old
    rig's frames live on (`Joint`: `torso` is a frame on the chest where
    the one-piece torso was, the hands are the old sockets), so callers
    attach guns and held things as before; `torsoFrame()` gives the torso
    frame for a pose before posing (the kart's wheel grips).
  - `poseSkeleton()` maps a `Pose` onto the bones: the spine shares the
    lean and twist, the neck a share of the head's turn, the collarbone
    shrugs when an arm goes over the shoulder (never for a gun or a wheel),
    the feet ease towards level and the toes bend when a foot tips onto
    them, and `grip` closes each hand (0 open, 1 a fist; read once per
    `update()`: fighters default to fists, a held thing to a hold, and
    `holdGun()` sets it every frame).
  - `weigh()` weights every vertex by what it's part of (its old joint, or
    `region: 'shoe'`) and where it is at rest, passing smoothly across each
    joint (shoulders take a collarbone share, the jacket's and hoodie's
    hems go some of the way with the thighs); `bone` pins a piece to one
    bone unbent (bags, boards, wings on the chest); `skin` gives a piece
    its own weights per vertex (the fingers).
  - **The head and hands** are `body.ts` (DOM-free, tested): the balaclava
    after the brand art (`HEAD_ROWS`, `headGeometry()`: a tall oval with a
    flatter front, nose ridge, cheekbones, brow over the eye sockets, jaw,
    chin and the neck tube down into the collar; `headFront()` lays the eye
    opening, its knit rim and the shades onto it) and the hands
    (`handParts()`: wrist, palm, thumb pad, four fingers and a thumb, each
    vertex weighted; `bakedHand()` sets one solid at a grip, for the
    first-person hands in `viewmodel.ts`).
  - **Walking and running** are `locomotion.ts` (DOM-free, tested in
    `tests/locomotion.test.ts`), for your Degen in walk mode
    (`createLocomotion()`; walk.ts feeds it his position, velocity,
    facing, the ground (`groundAt`) and whether he's in the air, copies
    its pose onto his (`copyPose()`) and places him with `placeRoot()`).
    The feet are planted in the world: each stays where it lands while
    the body moves over it, and the other swings to where the body will
    be when it lands (ahead along the way he's going, by `fore` of the
    stride), at the ground's height there, so nothing slides walking,
    jogging, sprinting, turning, strafing or backing up (aiming), on
    kerbs, slopes and stairs; the tests hold a planted foot to under
    4 mm. Two-bone leg IK (`reachLeg()`) puts each ankle where its foot
    needs it; the foot keeps its own heading and pitch (`Limb.foot`,
    `footYaw`, `footRoll`, `toe`) and rolls heel, flat, then onto the ball
    with the toes flat; the hips (`Pose.sway`, `turn`, `bob`) come down
    when a planted foot would be out of reach, and ease back up.
    `gait()` sets the rhythm from the speed in leg lengths a second
    (`CADENCE` worked out so a stance always stays in reach; Degen's walk
    speed is a jog for his legs, his run a sprint): steps a second, time
    on the ground, lift, hip drop, lean, arms; the gait follows the speed
    over a few steps. A sprinting leg folds up under him. Standing, he
    stops with both feet down and steps a foot back under him when he
    turns or drifts (turning on the spot); the idle breathes and shifts
    its weight, and after a while with the camera still he looks round.
    Upper body: arms swing with the opposite foot, the pelvis turns with
    the forward leg (square while armed) and the shoulders against it,
    the body leans into speed, starts, stops and bends (`root.roll`).
    Landings are keyed clips (`LANDINGS`: soft, crouch past `LAND_CROUCH`,
    a forward roll past `LAND_ROLL` on the run; `root.pitch` about
    `root.pivot`); in the air the legs tuck. Emotes keep the planted legs
    (the dance has its own).
  - **Shoulders: natural athletic** (the owner's call): every top's
    cross-sections slope from the neck down to the shoulder (the
    trapezius, no padded shelf) and the sleeve's cap is a low rounded
    deltoid running down into the arm (`SUIT`, `HOODIE`, `UPPER_S`; the
    rest grow from them). Check new tops from the front and back running
    in the lab (`?anim&outfit=hoodie`, ...).
  - Shapes are built from cross-sections (`loft()`, superellipse rings) and
    flat details laid onto them (`onBody()` with `surface()`: lapels, the
    shirt V, the tie, zips, pockets). Shoes are side profiles (`profile()`).
  - The wardrobe is `items()`: each item (`head`, `cap`, `suit`, `hoodie`,
    `joggers`, `backpack`, `gummy`...) has a `when` rule on the `Outfit` and
    pieces on joints, each a fixed colour or an outfit colour (`shade`
    darkens or lightens it: lapels, ribbing). New clothes are new items.
  - Three detail levels (`Detail`): 2 for single figures (`createDegen()`:
    the player, other players, the fitting room, the hologram; about 13-15k
    triangles), 1 for crowd people near the camera (the new head, fingers
    and shoes at a crowd's detail, about 7-9k; the phones' `light` crowd
    leaves out the `detail` pieces), 0 for crowd people further away (`far`:
    plain boxes for rounded ones, the head coarser, block hands instead of
    fingers, no ears or nose; about 2k).
  - `createDegen()` builds the skinned body (`items(q, true)`: the hero
    wardrobe, with the new head, fingers and shoes on the feet) as one
    `SkinnedMesh` coloured per vertex, plus one each for the lenses, the
    patches, the raised hood and neon, all on one `Skeleton` (3-5 draw
    calls a figure, never frustum-culled); things in the hand stay solid on
    the hand bone. `dispose()` frees a figure's geometry and bones. A
    material swapped onto a figure (the hologram's `ShaderMaterial`, a
    fighter's hit flash) must handle skinning (three's skinning chunks).
    `createCrowd()` (pedestrians, soldiers) is the same skinned body
    (`items(q, true)`) drawn instanced (performance phase 3): at each level
    everyone of one outfit kind (suits, hoodies, soldiers) shares one
    `InstancedMesh` per material, holding every item anyone of that kind
    wears (an item's pieces of one colour, `crowdGeometry()`, its bones and
    weights as `crowdIdx` / `crowdWt`; each vertex's colour key and item as
    `crowdSlot`). A person's row in the wardrobe (`crowdWardrobe`,
    `addWardrobe()` in crowdskin.ts, one float texture for every crowd:
    their colours by `COLOR_KEYS`, and in each item's column whether they
    wear it; `crowdAnim.w` is the row) says what they wear: items they don't
    fold to a point in every pass. Group by kind, never across kinds (a
    hoodie would carry every suit's vertices). Skinned on the GPU (`crowdskin.ts`: `injectCrowdSkin()` in every
    pass that draws them: their materials (`crowdVersion()`), their
    shadows (`crowdDepth()`) and the ink outlines' normal pass in
    `post.ts`, where everything else reads `crowdOn` 0) from one float
    texture of baked clips (`crowdclips.ts`, DOM-free, tested in
    `tests/crowdclips.test.ts`): `walk`, `jog` (Westlake Park's joggers)
    and `march` recorded from the planted-feet walk (locomotion.ts) over one
    cycle, played at their stride (`WALK_STRIDE`, `JOG_STRIDE`,
    `MARCH_STRIDE`: a person at scale s and speed v plays v / (stride s)
    cycles a second, so their feet stay put), `idle`, `look`, `chat`, `sit`
    and `picnic` (sitting on the ground) from the formulas in `poses.ts` over
    `CLIP_SECONDS` with the end eased into the start, and `salute` from
    attention to the hand at the brow. Callers set each person's clip and
    how far through it they are (`set(i, x, y, z, yaw, scale, clip, u)`;
    `crowdFrame()` picks the two rows and the blend); the CPU never poses
    a crowd. Every frame each person in view takes one instance in each of
    their kind's meshes (those with anything they wear), at their level: near within `CROWD_NEAR` (12, 8 on phones)
    of the camera, far beyond, and not at all out of the view or past
    `CROWD_FAR`. The city fills `CROWD_VIEW` (camera position and view,
    and the sun's shadow box, `sky.shadowFrustum()`) each frame in
    `index.ts`; people in the shadow box take instances from the front,
    the rest from the back (moved up behind them at `commit()`), and the
    shadow map draws only the front ones. Under reduced motion it's off and
    everyone is drawn near. A new crowd move is a new clip in `CLIP_DEFS`.
  - Outfits (`suit`, `hoodie`, `track`, `soldier`) only change clothes and
    colours; poses come from the helpers in `poses.ts` (DOM-free; walk/run
    by formula, idle, look, chat, sit, march, attention/salute, dance, the
    emotes), re-exported by `character.ts`. The Fight Club's fighters
    (`fight-figure.ts`) and other players (`remote.ts`) step with the
    planted-feet walk (`createLocomotion()` each, fed where they're drawn);
    a fighter's guard fades to it while moving round the ring. The cap patch is the Emporium
    diamond (the crowd's always; your own can carry another of the city's
    made-up marks): never put another brand's logo on it. Whites on clothes are
    `SHIRT`, a shade under white, so they don't bloom.
  - **The merch** (single figures only; `createDegen()`): marks (`MARKS`
    in `profile-data.ts`, their art in `marks.ts`: SVG paths in a 100 box,
    drawn into one logo atlas, `logoAtlas()`) printed as `decal()`s laid on
    the cloth's own surface (`onFront()`, `onBack()`, `onSleeve()`), pieces
    with `mat: 'logo'` and `logo` (which mark: the top's, the hat's, the
    sneakers' or the varsity's badge, `markFor()`; `atlasUV()` points the
    square at its cell) in the outfit's `ink`; the top's mark goes on the
    chest (a lapel pin on the suit, the badge on the varsity), big on the
    front or back, or on the left sleeve (`TOPS` in `items()`); hats and
    the varsity carry a cream patch with the mark a touch in front. The
    top's all-over print (`pattern`) puts its own cloth (colour `top`, no
    shade) on `patternMaterial()`: a tiling mask laid on from three sides
    by where the cloth is at rest (`rest` / `restNormal`), so it moves with
    it. A mark replaced by the merch store's real art is a change to its
    art in `marks.ts` only; check it against the content rules.
- **Minimal bloom, nothing washes out** (the owner's call). Bloom is faint
  and tight (`post.bloom` in `index.ts`: threshold 1.05, 1.2 close up and
  walking; strength at most about 0.3, less close up and on phones, whose
  low-resolution bloom spreads further). Only small, very bright things
  (bulbs, thin neon tubes and caps at 2.4, `glow()`) pass the threshold;
  big lit surfaces stay under it and keep their colour: window and
  shopfront light maps about 1-1.3, screens about 1, sign textures
  1.1-1.8. Lit panels bigger than a tube (hatches, bollard caps, uplights)
  use the softer `soft()` (1.3), and never light a whole roof or slab:
  give it a neon trim instead. Check new lights close up at night on the
  phone tier, not just from the home view.
- **Nothing flush** (z-fighting): two faces in the same plane, facing the
  same way, in different colours flicker against each other, even with the
  camera still (a door's side level with the wall it's in, a roof slab's
  edge level with its walls, glass level with its surround, a decal at the
  very height of the paving it lies on). Keep such faces at least about
  5 mm apart, or tuck one just inside the other (a roof slab 6 mm in from
  its walls, hidden by the parapet). Faces pointing into a building, or
  down under something resting on the ground, don't matter (nobody sees
  them).
- Floating cut-out signs (FX layer with a transparent texture, like the roof
  logo) need `occlude()` from `kit.ts`, or the ink outlines of whatever is
  behind them get drawn across them.
- Every card and menu can be closed: panels, the gun store and the buy
  dialog have an × (`.city-panel-close` / `.shop-close`); drop-open menus
  (City settings, Directory, walk panels with their `.pop-head` ×) also
  close on a tap outside and on Esc. The welcome card is a one-line
  first-visit tip under the header (`.city-card` in `.city-hud`: GM, "Welcome
  to Sector 7" (the page's h1), how to move, the draft note, an ×). It's
  closed for good with its × (remembered as `city-card` in localStorage) and
  isn't shown on phones; when it's hidden the "Draft · v0" tag in the
  bottom-right corner keeps the draft note.
- 3D pin labels stay on screen and fold to dots where they'd sit under the
  city's own buttons and cards (`chrome` in `index.ts`); add any new
  always-visible city overlay to that list.
- **The start menu** (the owner's call): on every open, `[data-start]` in
  `CityMap.astro` (styles `src/styles/start.css`) covers the whole page
  while the 3D city boots behind it, so the 2D map is never seen loading.
  Single player enters the city (the fly-in runs again, `city.intro()` in
  `index.ts`); Multiplayer says "Coming soon" without `PUBLIC_GAME_SERVER`
  and flips the Online switch on and enters with one; Options holds Time,
  Weather, Sound and the view (3D city / 2D map), driving the header's own
  settings controls (pressed when the city is up, queued until then). The
  root carries `has-start` until a choice is made; the loader and the
  welcome tip wait behind it. Gradient-bordered buttons, white text.
- The city page has **one header**: the city's own bar (`.city-head` in
  `CityMap.astro`, copy in `head.ts`), slim dark glass. The site bar
  (`Nav.astro`) is left out there (`<Base nav={false}>`) and stays on the
  other pages. Left to right: the logo (home link), the mode title and
  subtitle (City view, Walk mode, Build mode, City map (2D)), then on the
  right (walk tabs, ammo and score while walking), the City / Walk / Build
  switch (the current mode lit with a glow and a gradient underline, the
  others dimmed), and the tools: in Build mode a Plots button
  (`[data-builder-bar]`, painted by `builder-ui.ts`: what you own, your
  Dorras and the next plot's price), a ⚙ Settings button (time, weather, sound, reset
  view, 2D map; 3D only, not while walking; never open by default) and a
  ☰ Menu (the city's places, 3D only (`.dir-places`); then under "More" the
  Emporium comic page and the merch store (`.dir-links`); then PulseChain
  native, X and Telegram; not while walking). Left of them, in the 3D city
  (not in Build mode, and not while walking on phones), the Dorras readout
  (`[data-dorras]`, painted by `tycoon-ui.ts`, a green dot when the stall's
  till has takings); it opens your business card. Beside it the level pill
  (`[data-level]`, `missions-ui.ts`: level, XP bar, title). Their cards drop down under them (`.head-panel`, one open at a
  time, with a `.pop-head` ×), spanning the width on phones, never taller
  than the screen under the header (they scroll inside). Tablets show
  Settings and Menu as icons; phones put logo, title, ⚙ and ☰ on the first
  row and the switch, with names, across the second (walking: title and
  switch, then the walk tabs, ammo and score). Its live height is
  `--head-h`; anything pinned to the top of the city sits below it
  (`top: calc(var(--head-h) + 12px)`).
- The comic-window layout in `src/components/ComicPage.astro` is the design.
  Each window is defined by its ink outline; keep content inside the slants.
- Palette is the PulseChain gradient. Follow `brand/README.md`: gradient for
  borders, glows and large type; `--p-cyan` for small text; buttons are
  gradient-bordered with white text, never gradient-filled.
- Type: Big Shoulders Display (headlines), Inter (body), JetBrains Mono
  (labels).
- Check every change at 320, 375, 768, 1024 and 1440px wide: no sideways
  scroll, no text clipped by a slanted edge.
- Styles: `global.css` (the site: tokens, the comic page, the nav, small
  screens and reduced motion), `city.css` (the city page: the 2D map, pins,
  panels, the mode header, Settings, the Menu), `walk.css` (walk mode, its
  HUD, the fitting room, the gun store, driving), `economy.css` (the business
  card, the market hall and the tycoon panels), then a file per game screen.
  `Base.astro` imports them in that order, which is the order rules apply
  in: keep it.

## Liberty Bridge (the owner's call)

- A one-of-a-kind landmark: a stone **footbridge** built up and over the
  water, in the style of an old gate-tower bridge (the owner's photo:
  sandstone, an arch through each tower, stairs up both sides, domed
  turrets), with the Liberty flame (the owner's permission; the flame mark
  only, `src/assets/liberty-flame.png`) as a 3D spiral on top of both
  towers and as a crest on their faces. Name it "Liberty Bridge"; never
  link it anywhere, and keep the flame the only outside mark on it. It's
  for people only: no road, no cars (an earlier draft with Liberty Road and
  traffic was dropped, and West 3 and South 1 stayed on the market).
- **The numbers** are `liberty.ts` (DOM-free, tested in
  `tests/liberty.test.ts`): on `FOOTBRIDGE_X` (`layout.ts`, x -23.5, just
  west of the W3 and S1 pads, on their blocks' lawns), a gate tower on each
  bank (`TOWERS`, level with the middle of W3 and of S1; `TOWER`: the
  ground storey with its arch, the upper storey, roof, turrets, the flame's
  drum and height, all under the Emporium), stairs beside each tower rising
  towards the river (`STAIR`, `stairsOf()`), a landing at the tower's river
  face (`landingOf()`), the walkway between them (`WALKWAY` at `DECK_Y`)
  raised on round-topped arches (`SUPPORTS`: pairs of pillars on the lawns
  and promenades you can walk between, two piers in the river; `SPANS`,
  `archY()`) high over both river avenues, `BOAT_LANES` down the middle of
  the river's three arches (life.ts's boats), `DECK_STROLLS` (life.ts
  walks people along the walkway at `DECK_Y`), `LIBERTY_RECTS` (what it
  covers: the lawns' trees and the promenade's benches and lamps keep off),
  `LIBERTY_SOLIDS` (in `SOLIDS`: the towers either side of the arch, the
  stairs past their first steps, the landings' posts, pillars, piers) and
  `LIBERTY_SPAWN` (the foot of the north tower's east stairs).
- **Walking on it:** `footbridgeY(x, z, y, m)` is the stairs, landings and
  walkway as ground when you're up there (walking under them stays on the
  ground), and `footbridgeWall()` the parapets (you can't step or fall
  off); `walk.ts` passes Degen's height into `blocked()` and `groundAt()`.
- **Drawn by** `libertybridge.ts`: the towers (arch and voussoir ring,
  string course, lit arched windows, the crest and the LIBERTY BRIDGE
  plaque, cornice, crenellations, four turrets with octagonal slate domes
  and finials, the drum), the stairs (stepped stone flanks, outer walls,
  newels, street lamps at their feet), the landings, the walkway (arches
  with their rings, cutwater piers, parapets with coping, pilasters with
  lanterns, pools of their light at night), paved aprons round the towers,
  and `flameGeometry()`: the flame mark as a sculpture, a ribbon
  spiralling up from violet through magenta into tongues of fire curling
  to one side, coloured per vertex, turning slowly (still under reduced
  motion). The whole bridge is the spot's group.
- **The place:** spot `liberty` (after the Emporium in `spots`), its pin
  over the north tower's flame, directory entry and an info-only panel
  (`data-panel-tpl="liberty"`) with **Walk in**. No outside links.

## Sector 7 Airport (`docs/airport-plan.md`)

- The plan and its phases are `docs/airport-plan.md`; keep it up to date,
  one phase at a time with the owner's sign-off. Phase 1 (the airport and
  its flying traffic) and Phase 2 (fly it yourself, from the hangar) are
  built.
- **Where:** south-east of the Southside Loop, east of the x = 64.5 avenue,
  where no road runs (the north-south roads carry on south past the loop).
  `airfield.ts` (DOM-free, tested in `tests/airfield.test.ts`) holds it all:
  `SITE`, the runway (east-west, take-offs and landings eastwards), taxiway
  and connectors, apron, `TERMINAL`, `STANDS` (nose-in, facing north),
  `TOWER` (under the Emporium's height), `HANGAR` (its east office is where
  Phase 2's hangar menu will open), `PROP_STAND`, `HELIPAD`, masts, the
  windsock, apron vehicles, airbridges, the parked cars, and
  `AIRPORT_SOLIDS` (in `SOLIDS`; the ground itself is open, at ground
  level, not a slab). The access road and the one-way loop round the car
  park are `AIRPORT_STREETS` in the street plan.
- **The flying traffic:** three airliners, a prop plane and a helicopter on
  one timetable (`PERIOD`, four minutes; `timetable()`, `FLIGHTS`). A flight
  is a loop of acts (fly along waypoints with rounded corners, eased
  altitude and speed; hold; turn on the spot; lift); `poseAt()` turns the
  time into a pose, the same for everyone (the clock is `Date.now()`).
  Airliners push back, taxi out, take off east, climb round to the north,
  cross the city high over downtown (above 38), come round the west and
  land, the prop plane flies a lower loop along the river, the helicopter
  circles the Emporium (above the hologram and the blimp). The tests check
  they stay in the world, high over the town, on the ground only at the
  airport, never near each other (`REACH`) and clear of the solids. Change a
  route or a take-off time only with the tests passing.
- **Drawn by** `airport.ts` (runway markings and lights, approach lights,
  PAPI, terminal with its glass front, wave roof, the SECTOR 7 AIRPORT
  sign and airbridges, tower, hangar, helipad, masts, windsock, vehicles,
  road, car park) and `aircraft.ts` (the models: a cartoon airliner in
  DEGEN AIR colours, a made-up airline, never a real one, maker or badge;
  a high-wing prop plane; a helicopter). Each model is a few parts by role
  (body, accent livery colour, neon nav lights, blinking strobe, gear that
  folds away, decal, spinning props and rotors with blur discs);
  `createFleet()` makes one instanced mesh per part for each kind, culled
  as a fleet. Under reduced motion every aircraft stands parked.
- The skyline ring leaves out any tower within 150 of the airport (they'd
  loom over the runway; since Phase 6 the ring stands far enough out that
  none is); trees keep off the airport and the low end of the approach.
- **Flying it yourself** (Phase 2): the airport is a place (spot
  `airport`, its pin over Hangar 1 (`spot.group` is the hangar, built in
  its own Batch), directory entry, a panel with **Walk in** to
  `AIR_SPAWN`). The hangar office's door (`HANGAR_DOOR`, the office
  `HANGAR_OFFICE` is solid) opens the hangar menu (`hangar-ui.ts`, markup
  `data-hangar` in `CityMap.astro` on the garage's `.shop` panel and
  styles): the Sky Hopper (`prop`), the Neon Dart (`bizjet`, a small jet
  model in `aircraft.ts`) and the Whirlybird (`heli`), twelve paints; free
  and only for the city, never sold, priced or tied to the store or the
  token (`myplane.ts`, saved as `degen-city-plane-v1`). While it's open
  the camera looks into the hangar (`HANGAR_VIEW` in `walk.ts`, the
  garage's `frameShowroom()`). Your aircraft stands at `HANGAR_SPOT` (the
  hangar's east half; the airport's prop plane's stand is in front of the
  west half) and stays wherever you land it.
  - The rules are `flight-sim.ts` (DOM-free, tested in
    `tests/flight.test.ts`): `TUNES` per aircraft, `stepFly()`, `HULLS`
    (spheres for every kind, the airport's too), `floorAt()` (the ground or
    a roof under the wheels), `canLeave()`, `CEILING`, `EDGE_TURN`. Arcade
    and forgiving: it levels itself, can't stall, eases a hard descent
    near the ground and lands wherever it touches down; collisions are soft
    (it slides off, nothing is damaged). New handling goes in the sim
    first.
  - `fly.ts` is the view: your aircraft is a fleet of one
    (`createFleet()`, repainted with `paint()`), chase and nose cameras
    (V), the readout (`data-fly-hud`: speed, height, throttle, state), the
    engine (`aero()` in `sound.ts`), getting out only on the ground and
    stopped (`exit()`), `abandon()` home to the hangar when walk mode ends
    in the air. Flying sets `is-flying` on top of `is-driving` (the touch
    layout is the car's: the stick turns and climbs, the pedals read
    Faster / Slower) and `data-plane` (the header reads "Flying ·
    <aircraft>"); styles in `src/styles/fly.css`. Controls: W / S throttle,
    A / D turn, arrows or Space / Shift climb and dive, V camera, F get out;
    gamepad left stick, RT / LT, Y, View. Check the readout, stick, pedals
    and prompt at phone widths, upright and on their side.

## Drop 001's fitting room

- Drop 001's panel (`data-panel-tpl="shop"` in `CityMap.astro`) has the
  fitting room (`fitting.ts`): item cards by tab (Fit, Head, Shades, Bags,
  Hand, Extras, Kicks, Merch), colours, and a turning preview of the player's Degen drawn by a
  small second renderer with the same ink outlines (`stage.ts`), only while the panel is
  open (still under reduced motion; drag turns him). The **Merch** tab
  (`merchItems()`, `[data-fit-merch]`) dresses the top, the hat or the
  kicks with a mark, or the top with a print; where the top's mark goes
  and the ink are rows of their own; a note says when it won't show (no
  cap or beanie, a suit's dress shoes).
- **The character screen** (`charscreen.ts`, markup `[data-char]` in
  `CityMap.astro`, styles in `fitting.css`), from the Profile tab's "See
  your Degen": an overlay under the header with the same stage
  (`createStage(..., { zoom: true })`): drag turns him, scroll, pinch or
  Full / Face zoom to his face, poses (idle, walk, the fighter's guard and
  the emotes, `StagePose`), lights (studio, day, night, `StageLight`), what
  he's wearing (`describe()`) and the way to Drop 001. × or Esc closes it;
  while it's open no other key handler hears the keyboard (Esc never
  stops walking). Check it upright and on its side at phone widths.
- The look belongs to `profile-ui.ts` (browser and player profile); the
  fitting room only calls `wear()`. The original wardrobe is free; the
  premium wardrobe (`WARDROBE_CATALOG` in `catalog.ts`) costs Dorras and
  needs a level (`buyWardrobe()` in `tycoon.ts`). Everything is cosmetic
  and only for the city: never tied to the Shopify store or the token, never
  real money.
- **The premium wardrobe** (the city's game): Drop 001 also sells
  `WARDROBE_CATALOG` (catalog.ts) for Dorras earned in the city, each piece
  with a price and a level: the varsity and puffer fits, the cowboy hat, top
  hat and neon halo, the duffel bag and neon wings, the phone and briefcase,
  the gold watch, the Gold and Holo colour packs for tops and bottoms
  (`PALETTE.gold` / `PALETTE.holo`, `PACKS`, `packOf()`), and the merch:
  the marks but the diamond and the Sector 7 badge (`markItem()`, ids
  `mark-<id>`) and the prints (`patternItem()`, `pattern-<id>`), tab
  `merch`. The look carries
  them as ordinary values (`cleanLook()` validates, it never checks
  ownership); owning them is `wardrobe` in the save (`buyWardrobe()` /
  `ownsWardrobe()`), and the fitting room (`fitting.ts`, with
  `game: GameDeps`) is what enforces it: cards show the price and `Lv n`,
  "Buy · 4,000" opens an inline confirm, locked pieces say the level, pack
  colours sit under a lock in the colour rows, and the head shows your
  Dorras and level. Styles in `src/styles/fitting.css`. In `character.ts`
  the pieces are items like any other; neon pieces (the halo, the wings'
  edges, the phone's screen) share one `neon()` material coloured per
  vertex in the lens colour, dim by day so they never bloom out of control.
- A new item needs a `Look` field with its palette and rules in
  `profile-data.ts` `cleanLook()` (the server checks it too), the mapping in
  `lookOutfit()`, an item in `items()` in `character.ts` and an entry in `fitting.ts`
  `TABS`. One hat (`hat`), one bag (`bag`) and one thing in the hand
  (`held`) at a time; `cleanLook()` also upgrades looks saved in older
  formats, so keep its migration when fields change. Held items are put
  away while Degen carries a gun (`Degen.held`).

## The economy: Dorras, the market, your units, contracts, staff, big lots and the Vault (Tycoon phases 1-4)

- The plan and its phases are in `docs/tycoon-plan.md`; keep it up to date.
  Build one phase at a time, each with the owner's sign-off.
- **Dorras** are the city's money: earned by playing, never bought and
  never cashed out. Never give them a real-money value, call them an
  investment, or tie them to the token or the Shopify store. Nothing in the
  city costs real money (plot sales for PLS were retired).
- **Rules:** `tycoon.ts`, DOM-free and tested (`tests/tycoon.test.ts`):
  goods (`GOODS`, made-up city goods, nothing about the token; raw goods
  last, since a good's place in the list sets its price rhythm), the market
  price (a function of the time only, the same for everyone and ready for a
  server), places (`PlaceId`: the stall, the four units, the Workshop) with
  `room()` / `holds()`, buy / sell back to or from any place, your stall's
  levels, price levels, units (`buyUnit()`, `buildUnit()`, `setCrop()`), the
  Workshop's jobs (`startJob()`, `cancelJob()`), your car's load
  (`load()` / `unload()`, `CARGO` per model), and `advance()`: sales
  (faster at the place you're serving, slower and capped while away),
  gardens growing and the Workshop working; staff (`hire()`, `roleAt()`,
  paid a share of what they handle, `STAFF_CUT`), couriers (`ship()`) and
  contracts (`board()`, seeded from the time so it's the same for everyone;
  `accept()`, `deliver()`, drop-offs at building doors via `destAt()`); big
  lots (`buyLot()`, `buildLot()`, places `l0`-`l2`, production lines via
  `line()` for the Workshop and factories), the ledger (`book()`, called by
  every rule that moves Dorras) and loans (`borrow()`, `repay()`, a share
  of takings in `advance()`).
  `cleanSave()` cleans anything loaded and upgrades older saves (now v10: The
  Trenches' corner shops, `corners`);
  keep that migration when the save changes. New economy rules go here
  first.
- **The city's game (Phase 5)** sits on the same save: XP and levels
  (`xp`, `level()`, `addXp()`), owned cars, guns and clothes with their mods
  (`buyCar()` / `modCar()` / `carStatsOf()`, `buyGun()` / `modGun()`,
  `buyWardrobe()`), district plots (`buyPlot()` / `buildPlot()` /
  `sellPlot()`), levels for the places you run (`upgradePlace()`,
  `capOf()`, `capacityMul()`), missions, badges and the
  `counters` everything watches (`count()`, `takedown()`). Prices, the
  level each thing needs, the XP curve and what each mod does are
  `catalog.ts`; the board and badges `missions.ts`. All DOM-free, tested in `tests/game.test.ts`. The starter
  tier (the five original cars, the four original guns, the original
  wardrobe) stays free; everything new costs Dorras and needs a level.
  Screens reach the save through `GameDeps` in `ui.ts` (`save()`, then
  `commit()` once the rules have changed it; `toast()`, `sfx()`), never
  by writing the save themselves.
- Goods only move between your places in your car (or by buying them
  straight there at the market hall). Stock on sale (stall, shops) can't be
  loaded back; that keeps the delivery bonus from being farmed.
- **Screens:** `tycoon-ui.ts` (save `degen-city-tycoon-v1`): the Dorras
  readout, your business card (`[data-biz]`, on the gun store's `.shop`
  panel: right side under the header on wide screens, the bottom sheet on
  phones; the till on top, then the Stall / Units / Workshop / Car tabs), the
  market hall, filled into the Emporium's panel (`[data-market]`, with its
  deliver-to / sell-from picker, your car included when it's parked outside),
  and the Workshop's (`[data-workshop]`), Signal tower's (`[data-contracts]`:
  news and the contract board), Post office's (`[data-couriers]`) and
  Apartments' (`[data-staff]`) and the Vault's (`[data-bank]`: worth,
  ledger, loans) panels: `PANELS` in `tycoon-ui.ts`, mounted
  with `mountPanel()` from `open()` in `index.ts`. One card at a time: opening a
  panel closes the business card and the other way round. Esc closes the card
  first. The views tick every second and are patched in place (`repaint()`
  / `morph()`), so a button never changes under a finger; keep new views
  going through `repaint()`.
- **The market square:** `market.ts`, on the `MARKET` lot (`layout.ts`,
  in `EXTRA_LOTS` with the garage), drawn in world numbers. Two rows of four
  stalls, the MARKET gantry (its cut-out sign uses `occlude()`), the
  string-light pole, traders and shoppers from the shared crowd (so it's built
  before `buildLamps` and `buildLife`). Stall 0 is yours and shows your
  stock (`show()`). Counters are at a Degen's waist (0.5). Footprints,
  the gantry, the pole and your spot are `MARKET_SITE` / `STALL_SPOT` in
  `solids.ts` (tested in `tests/solids.test.ts`).
- **Makers' Row:** `units.ts`, on the `UNITS` lot (in `EXTRA_LOTS`) north
  of the market square: four units of 4.1 x 4.1 (`UNIT_SITE` in
  `solids.ts`, drawn in each unit's own numbers: u across the front, v back
  from it), each drawn from the save (to let, empty, garden, shop,
  warehouse) and rebuilt only when what it shows changes. Their footprints
  are `unitSolids()` (per kind, `UNIT_SHAPES`), fed to walking and driving
  with the plots' (`plotSolids` in `index.ts`). Signs use `occlude()`.
- In walk mode, standing at your stall or a unit's door (`places()` in
  `tycoon-ui.ts`, the walk deps `places` / `openPlace`) shows a prompt (F or
  a tap) that opens the card on that place, and standing at a stall or shop
  doubles its customers. The Workshop's door opens its panel. Your car
  parked near one of your places (stall, a built unit or the Workshop) lets
  the Car tab load and unload there; the garage menu says how much each car
  carries. Your contracts' drop-offs get a "Deliver" prompt at the door and
  a beam of light (`beacons.ts`, up to three).
- **Big lots** (Phase 4, the owner's call): three 9 x 9 lots east of
  Makers' Row (`BIG_LOTS` in `layout.ts`, in `EXTRA_LOTS`; `LOT_SITE`,
  `LOT_SHAPES`, `lotSolids()` in `solids.ts`), drawn from the save by
  `biglots.ts` (FOR SALE board, empty, superstore, factory, depot, offices),
  rebuilt only when what they show changes; offices stay well under the
  Emporium's height. Units, lots and the Workshop have levels 1-3 (the
  business card's Upgrade row); `units.ts` and `biglots.ts` show the level.
- **The district plots** (Phase 5, the owner's call) are Dorras property
  too: bought at the Vault's estate agent (`[data-bank]`, the list in
  `bankView()`) or from a plot's panel in Build mode. Ownership lives in
  the tycoon save (`plots`), behind `createPlotStore()` in `store.ts`.
- **Loans and the ledger** are game mechanics with Dorras only: a flat fee,
  no interest rates, savings returns or APY-style wording anywhere.
- **Missions, levels and badges** (Phase 5): the rules are `missions.ts`
  (`MISSIONS` in tiers by level, up to `MISSIONS_MAX` at once, counted from
  the save's `counters` as they stood when taken; `BADGES` are lifetime
  milestones awarded by `checkBadges()`) and `catalog.ts` (`xpForLevel`,
  `levelFor`, `levelProgress`, `titleFor`, `XP` per deed), on the save in
  `tycoon.ts`. The screens are `missions-ui.ts` (styles in `missions.css`):
  the level pill in the header tools next to the Dorras readout
  (`[data-level]`, a `.head-pop` card in the city; while walking it opens
  the Profile tab's badges `[data-badges]`), the mission board at the end
  of the Signal tower's panel (appended by `tycoon-ui.ts` after the
  contracts; its Take / Claim / Give up go through `missions.act()` before
  the economy's buttons), the mission tracker in the walk HUD
  (`[data-missions-tracker]`; a pill with the count on phones) and the
  badge / level-up pops under the header (`[data-mission-pops]`).
  `tycoon.commit()` runs `missions.onCommit()` first, so any screen that
  changes the save and commits gets badges and level-ups checked. Rewards
  are Dorras and XP only: no prizes, nothing real.
- **Getting started** (the new player's first steps): the rules are
  `guide.ts` (DOM-free, tested in `tests/guide.test.ts`): `GUIDE`, seven
  steps in order (stock your stall at the market hall, make 5 sales, take
  your car out, deliver a contract, target practice, a race at the kart park, back up
  your save at the Vault), each with a beam spot (`at`), a way in from the
  City view (`go`: open a panel, or start walking at a free spot facing
  it) and a check on the save (`met()`, lifetime counters, so a step
  already done moves straight on). `advanceGuide()` (run first in
  `missions.onCommit()`) pays each step's small reward (Dorras and XP, the
  ledger's Missions line) once. The save carries `guide` { step, hidden }
  (`GUIDE_STEPS` in `tycoon.ts`; a save from before it that's past level 1
  has it done) and `backup` (when it was last downloaded). On screen
  (`missions-ui.ts`, styles `src/styles/guide.css`): the City view's card
  under the welcome tip (`[data-guide]` in `.city-hud`, 3D only, with the
  way in and an ×; in `chrome`), the top row of the walk tracker (with its
  own ×), the steps at the top of the Signal tower's board (Show / Hide the
  guide) and a cyan beam (`beacons.guide()`). Hiding only hides it; the
  steps still count.
- **Your save as a file:** everything the city keeps in this browser goes
  in one backup (`backup.ts`, DOM-free, tested: `BACKUP_KEYS`,
  `packBackup()`, `readBackup()`; never the guest or wallet login tokens or
  screen preferences). The Vault's panel ("Your save" in `bankView()`)
  downloads it (`sector-7-save-<date>.json`) and loads one: the file is
  checked and the city's game cleaned with `cleanSave()` first, a confirm
  shows its level and Dorras, then every save is replaced and the page
  reloads (`frozen` stops the tycoon storing over it). A level-up from 3 on
  reminds you when the last backup is over a week old. A new save in
  localStorage needs its key in `BACKUP_KEYS` and a loader that cleans what
  it reads.
- **The Apartments** (the tower in the north block, east of the Signal tower, `apartments()` in
  `landmarks.ts` and `city.ts`) are a place since Phase 3: spot
  `apartments`, its pin, door (`DOORS`) and panel. The Emporium stays first
  in the 3D `spots` list.

## Walk mode (3D)

- `src/scripts/city3d/walk.ts`: the playable Degen, over-the-shoulder and
  first-person camera, mouse (pointer lock), keyboard, touch and gamepad
  controls, collisions and door prompts. The Controls panel's settings
  (Look: speed, invert, first person; Shooting: "Aim when firing"
  `settings.autoAds` = off / touch / always) are saved under
  `degen-city-walk-v1` in localStorage. The HUD markup (Controls panel, Run
  and Jump buttons, joystick) is in `CityMap.astro`; `walk.ts` expects every
  `data-walk-*` element to exist.
- Buildings only lift and glow on hover in City view; while walking nothing
  is hovered and nothing lifts (Degen stands on the same ground).
- Esc frees the mouse first and only then stops walking. Door panels free
  the mouse so their links can be clicked.
- While walking (`body.is-walking`, set in `index.ts`) the header drops the
  logo on tablets and phones and the Settings and Menu buttons, and carries the walk tabs
  (Controls, Profile, Online, Emote), ammo and score at the top (two rows on
  phones). The touch buttons stay at the bottom.
- The gun store is compact: a 2 x 2 grid of guns beside the picked gun's
  details; on upright phones a short bottom sheet with the guns in one row.
  Check it at phone widths upright and on its side (no scrolling needed).
- Collision footprints (`SOLIDS`) and door spots (`DOORS`), both in
  `solids.ts` with the walk-mode start (`WALK_SPAWN`), mirror
  `landmarks.ts`. When a landmark moves or changes size, update both.
  Placed buildings block via `plots.solids()`; parks stay walkable.
- Checks go through the collision grid (`boxgrid.ts`, `BoxGrid`: boxes in
  cells of `CELL`, a query gives every box touching an area in the list's
  order): `SOLID_GRID` for walking, `CAMERA_GRID` for the walk camera,
  bullets through `rayBoxes()` (the server too), and driving and flying
  ask for the boxes within `reachOf()` / `flyReach()` of the vehicle
  (`solids(x, z, reach)`). `tests/boxgrid.test.ts` holds them to exactly
  the answers of checking every box; keep new checks going through it.
- Cars yield to the walker through `walker` in `life.ts`.

## The garage and your car (3D walk mode)

- `drive.ts` drives one vehicle at a time, your car or your kart (both can
  be out: "Get in" takes the nearest; `carState` / `inCar` are the car's
  own; `recallKart()` sends the kart to the pits).
- The garage is on the south bank, east of S5, facing the south bank
  avenue (`GARAGE` in `layout.ts`; drawn by `garage.ts` in world numbers,
  not the landmarks' drawing grid). A flat-roofed workshop with an open bay
  and a car lift, a roller door, an office, a neon GARAGE roof sign, and a
  showroom turntable on the forecourt with the player's own car on it. It
  has no pin and links nowhere; it's walk-mode only. Its footprints, the
  turntable and the office door are `GARAGE_SITE` in `solids.ts`.
- The office door's prompt opens the garage menu (`garage-ui.ts`, markup
  `data-garage` in `CityMap.astro`, built on the gun store's `.shop`
  panel): five models (`PLAYER_CARS`: the bus is city-only) with card
  silhouettes drawn from each model's outline at one scale, three stat bars
  and twelve paints. Each pick shows on the turntable; Keep saves it,
  closing without keeping puts the saved car back. While it's open the
  camera eases to the turntable (`frameShowroom()` in `walk.ts`, over the
  shoulder so the first-person hands stay out of shot) and the picture
  slides with `setViewOffset` so the car sits beside the panel (wide
  screens, panel on the right) or above it (phones, bottom sheet). The
  turntable turns only while the menu is open, and never under reduced
  motion. Check it upright and on its side at phone widths (no scrolling).
- Your car (`mycar.ts`, DOM-free): `{ model, paint }`, cleaned by
  `cleanCar()`, saved in the browser as `degen-city-car-v1`. `DRIVE` holds
  each model's garage copy and its 0-1 speed / pick-up / grip (for the
  handling), `CARGO` its boot. Eight models: the five starters are free,
  the Street Thunder, Big Rover and Hyper Comet are bought with Dorras at
  the garage (`CAR_CATALOG`), and every car is tuned there (`CAR_MODS`:
  engine, turbo, tyres, roof rack, three levels each; `carStatsOf()` feeds
  the handling and the boot). Only for the city: never tied to the store or
  the token, never real money.
- `createCar()` in `cars.ts` builds one car with its own paint, steerable
  rolling wheels (`drive()`) and lights. The turntable's car is the one you
  drive (`takeOut()` in `garage.ts` hands it to `drive.ts`).

## Driving your car (3D walk mode)

- `drive-sim.ts` holds the rules, DOM-free like `combat-sim.ts`:
  - **Handling:** arcade. Speed tapers to the model's top speed; brake, then reverse. Steering uses a bicycle model that eases off with speed. Grip sets how quickly the slide follows the nose; the handbrake lets it go.
  - **Collisions:** soft and safe. The car is three circles along its length. It slides along `SOLIDS` (minus the turntable), placed buildings and the river walls (`RIVER_WALLS`, open at the bridges). It bumps softly off traffic and people, never through them.
  - **Tuning:** `tune()` turns `DRIVE`'s 0-1 numbers into speeds. New handling goes in the sim first.
- `drive.ts` is the view:
  - **Getting in:** "Get in" at your car, on the turntable (it drives off facing the avenue) or wherever it was left.
  - **The car on screen:** it climbs kerbs smoothly, leans into turns and squats under gas or brakes. The wheels roll and steer.
  - **Cameras:** a chase camera that swings in behind, where you can look around and it settles back; it's pulled in by buildings like the walk camera. V swaps to the roof camera.
  - **Readout:** speed in km/h and the gear (`data-drive-hud`).
  - **Sound:** a synthesised engine (`engine()` in `sound.ts`) plus bump and door sounds, all through the sound switch.
  - **Getting out:** "Get out" anywhere. Degen steps out of the left door, or wherever there's room, and the car stays parked and solid to walk round. Leaving walk mode parks it too.
  - **Sending it home:** the garage menu's Keep calls it back to the turntable ("Bring my car home"). A reload puts it back there too.
- Traffic stops for your car (`walker.r` in `life.ts` reaches further while driving). `bodies` in `life.ts` shares where the traffic and the pedestrians are, for the soft bumps.
- **Controls:**
  - Keyboard: W / S (or arrows) gas and brake / reverse, A / D steer, Space handbrake, H horn, V camera, F get out.
  - Touch: the stick steers (and pedals when no pedal is held), with Gas and Brake buttons (`data-drive-gas`, `data-drive-brake`). Layout while driving: a bigger stick bottom-left, Gas and Brake as tall pedals side by side bottom-right (Gas taller, on the outside), Get out at the top right and the speed at the top left, all clear of the phone's safe areas. Getting out brings the walk layout back.
  - Gamepad: left stick steers (pressed: the horn), RT gas, LT brake, A handbrake, Y get out, View camera; the right stick or the mouse looks.
- While driving, `.city.is-driving` hides the walk and combat HUD, and the header says "Driving · <car>" (`head.ts`). A gun is holstered on getting in. Your car's lights, horn, skid marks and gears are the city life plan's Phase 2 (above; `docs/life-plan.md`).
- Check the pedals, stick, prompt and readout at phone widths, upright and on their side: nothing may overlap.

- `drive.update()` returns the tiles moved; walk mode counts them on the
  save every ten tiles (`counters.driven`, for missions and badges).
- `?spawn=x,z[,yaw]` in the address starts walk mode at a spot, and `?fps`
  shows where Degen stands: use them to check a place on a real device.
- **The street races were retired** (the owner's call): no start line,
  gantry or board on the south bank avenue, no race menu, HUD or results,
  no race missions or badges, and no race times in the save. Racing lives
  at the kart park only. Don't bring them back without the owner. The
  pieces their screens left behind (the big countdown digits, the results
  card, the list rows and tags) are shared by the kart and fight menus in
  `src/styles/cards.css`, still under their `.race-*` class names.

## The kart park (3D walk mode)

- **The place** (the owner's call): a Mario-Kart-style go-kart park north
  of the ring highway in the north-east (the north side's stage 2,
  `docs/north-plan.md`, the owner's call: moved from outside the Parkway,
  the same circuit to the last sample, "a more realistic track with more
  than just a fence around it"; its old land is open again, kept clear for
  a district later), fenced round its facility, its gate on Kart Road off
  the east ring avenue, the metro's Kart Park station at the corner;
  one circuit raced both ways (the rebuild, `docs/kart-plan.md`), the kart
  hut (door prompt "Kart hut") with a viewing terrace on its roof, a
  grandstand in the infield facing the start straight and a big covered
  one over the hill and the jump, grass banks with people, the pit lane
  with eight garages, the big screen on their roof and the timing tower,
  the paddock and the plaza inside the gate, armco, tyre walls, catch
  fencing, marshal posts and floodlights (`kartfacility.ts`, below). It's a place like the landmarks (spot
  `karts`, pin, directory entry, a City-view panel with your records and
  **Walk in**, which starts walk mode at the gate, `KART_SPAWN`). Race karts
  stay on the track, but your own kart can be taken out of the pits and
  driven anywhere on the map (the owner's call: "Get in" at the show kart,
  `drive.ts` drives it like the car, with Degen seated; it rides the
  circuit's ground (the deck, the banking, the grass banks) through
  `circuitSurfaceAt()`, and goes back to the pits when a race starts).
  Walking follows the same ground inside the park, and up the banks
  (`groundAt()` in `walk.ts`, `bankY()`; your kart climbs them too).
- **The site** is `kartpark.ts` (DOM-free): `KART_PARK` (world x 113-225,
  z -311.5 to -191.5, its fence), local numbers via `toWorld()` /
  `toLocal()` (u east, v south from the circuit frame's corner; `SITE_U`
  x `SITE_V` is the circuit's frame, the site reaches past it on every
  side), Kart Road (`ROAD`, east off ns3 past the gate) and the car park's
  one-way loop (`LOOP`), in the street plan as `KART_STREETS` /
  `KART_CROSSINGS` (traffic drives them, off the highway at ns3, whose
  outer corners get slip lanes: `OUTER_SLIPS`), the fence's `GATE` and
  `KART_SPAWN`, and the line maths every track part uses: `sampleLine()`
  (centripetal Catmull-Rom through control points `CPt`, heights
  cosine-eased from point to point, or through a `glide` point in one
  long ease (a ramp round a bend), sampled every half tile), `Line`, `frame()`, `at()`,
  `locate()` (keeps to the layer its hint is on), `along()`, `wrapS()`,
  `heightAt()` (banking), flags `F` (deck, tunnel, bank). The site is flat
  ground, not a slab, and the outskirts' trees keep off it, the road and
  the car park (`KART_RECTS`, `treeSpot()` in `outskirts.ts`).
- **The facility** (the north side's stage 2, the owner's picks: proper
  trackside, spectator areas, a paddock and entrance, night lighting) is
  `kartfacility.ts` (DOM-free, tested in `tests/kartfacility.test.ts`), in
  the park's local numbers round the unchanged circuit: armco along the
  run-off's edge wherever it's open and clear of the rest of the circuit
  and the pits (`BARRIERS`, `ARMCO_OUT`), tyre walls round the outside of
  the bends (`TYRE_WALLS`), catch fencing in front of the spectators
  (`CATCH`), none of it solid (a kart that wide is put back); the covered
  `GRANDSTAND` north of the hill and the jump (`tierAt()`), three grass
  `BANKS` (`bankAt()`, `bankY()`: walkable), the hut's roof `TERRACE` and
  its stairs; the `PLAZA` inside the gate with the ticket `KIOSK` and the
  gate's `ARCH`, the `TOWER` (timing) at the pit lane's east end, the
  `PADDOCK` behind the garages with its team `TENTS`; `FLOODLIGHTS`
  (`FLOOD`, under the Emporium); the car park in the loop (`CAR_PARK`,
  `BAY_COLS`, `BAYS`, `PARKED`), `KART_LAMPS`, `KART_TREES` and the
  people (`KART_PEOPLE`: on the banks, sitting in the grandstand, on the
  terrace, the plaza and in the paddock; `trim` ones left out on phones);
  `FACILITY_SOLIDS` (in `SOLIDS`), `KART_RECTS` / `KART_AREA`.
- **The rules** are `kart-sim.ts` (DOM-free, seeded, a fixed 60 Hz tick,
  tested), racing on the rebuild's circuit (`kartcircuit.ts`) since
  Phase 2: `createKartSim(setup)` → `step(dt, input)` returning events.
  Arcade karts (`tune()` from the 0..1 stats, times the engine class's
  pace; `turnRate()`), a hop into a drift (`T.drift` stages,
  `T.driftBoost`), boost pads (`pads` on the course), bumps weighted by
  `weight` (a heavy kart ramming a light one spins it), air off the jump
  (`flight()`), banking (more grip), pure racing (no items, the owner's
  call). **No invisible walls:** kerbs are track; the run-off holds a
  kart to `RUNOFF_CAP` with `RUNOFF_GRIP`; past `RESET_AT` (or over the
  deck's edge) it fades back onto the centre line where it had got to
  (`'reset'`, `RESET_T`, no progress lost). The tunnel's walls are real:
  a kart scrapes along them, slower, never put back. Conditions (`cond`): day,
  night (looks only), rain (`RAIN_GRIP` everywhere). Clean laps (no
  wheel in the run-off) and overtakes are counted per racer. Seven
  rivals (`think()`: pure pursuit on the way they're moving, a lane
  offset, passing a slower kart ahead or holding back, drifting only
  where a bend needs more than full lock, braking planned from
  `cornerSpeed()` back along the track and past the jump's flight,
  coasting instead of boosting towards the deck or the tunnel until
  lined up with the track) with a
  rubber band (`rubber()`); three cups (`CUPS`: `cls`, four `races` of
  { course, laps, cond }, `ai` pace, `skill`, prizes by place), time
  trials (`cup: 'time'`, alone) and `auto` (the sim drives the player:
  the par ghost, the tests, and every kart's cool-down lap after the
  line). Places by progress (`standings()`), the player's finish
  (`done`) and everyone's (`over`). New gameplay goes here first; looks
  and sounds in the view.
- **The rebuild** (the owner's call, `docs/kart-plan.md`): one narrower
  circuit (kerbs, grass and gravel run-off), raced both ways,
  with a pit lane and nothing solid near it, replaces the network in four
  phases. Phase 1 is built: the circuit as data in `kartcircuit.ts`
  (DOM-free, tested in `tests/kartcircuit.test.ts`; twelve corners, lefts
  and rights, the owner's call: no long runs of straight road besides the
  start straight): `CIRCUIT` (the physical track) and `COURSES` (forward
  and reverse; `start`, `jump`, numbered `turns`),
  `TRACK_HALF`, `KERB`, `RUNOFF`, `CLEAR`, `FLY_H`, `BANK`, `MIN_RADIUS`,
  `MAX_SLOPE`, `gridSlots()`, `PIT_LANE`, `BAYS`, `SITE` (garages, hut,
  stand, screen, gate path), `CIRCUIT_SOLIDS`, `GANTRY`, `SUPPORTS`,
  `onCircuit()`, `circuitSurfaceAt()`; the races are `COURSES` /
  `COURSE_IDS` (`circuit`, `circuit-reverse`: name, laps, `pads`) and
  `Cond` / `CONDS`; `groundAt()` (the ground across it: the asphalt's
  plane, the run-off easing down to the lawn at `CLEAR`, the sim's and the
  drawing's both), `enclosed()` (the deck and the tunnel: no run-off, off
  their kerbs a kart is put back). Footprints for walking and driving are
  `CIRCUIT_SOLIDS` (in `SOLIDS`: the fence with the gate's gap, the hut,
  the garages, the stand; **nothing on or beside the track is solid**,
  the owner's call). Phases 2 (the rules race on it, the save is v8), 3
  (the park drawn round it) and 4 (the HUD's minimap, single races in the
  hut, the item slot and button gone) are built. Then the whole circuit
  was scaled down to 60% (the owner's call: faster paced, more lifelike):
  a lap of about 350 tiles (some 630 m), `TRACK_W` 4.4 (four or five
  karts abreast), `RUNOFF` 3, `MIN_RADIUS` 4, the hill `HILL_H` 2 with
  the tunnel on its lower slope and the jump clear of it either way,
  four boost pads (none under a grid or into a deck), the karts about 20%
  slower (`tune()`), par laps about 34 / 29.5 / 27 s (Street / Sport /
  Neon), the park's fence pulled in round it, the save v9.
- **Classes** (`catalog.ts` `KART_CLASSES`, `ClassId`, `CLASS_IDS`): Street
  (Lv 1, 0.82), Sport (Lv 3, 1) and Neon (Lv 8, 1.18) set everyone's pace
  in a race; a cup fixes its class, a time trial picks one. Records and
  boards are per course per class (`recordKey()`).
- **The karts** are `mykart.ts` (`PLAYER_KARTS`, `KART_SPECS`: Pocket
  Rocket, Big Wheel, Zip, Tank Kart; `cleanKart()`), priced in `catalog.ts`
  (`KART_CATALOG`, the Rocket free; `KART_MODS`: motor, soft tyres, nitro
  kit, three levels; `kartStats()`), drawn by `karts.ts` (`createKart()`:
  Degen's style, origin on the ground under the middle, +x forward, wheels
  that steer and roll, a seated Degen driver via `seat()`). Only for the
  kart park: never real money, never tied to the store or the token.
- **The save** (`tycoon.ts`, v10): `karts` { model, paint, owned, mods,
  `records` (fastest lap and best run per course and class, `KartTime`),
  `boards` (the local leaderboards, `LEADERBOARD_SIZE` runs per key: your
  own runs for now, built so a server can hold everyone's later),
  `series` (the cup in progress: race, points), `trophies` (cup wins),
  `challenge` (today's daily challenge, done once a day), `parBeaten`,
  `old` (the old tracks' lap records: the network's, kept aside when a
  v7 save moved to the rebuilt circuit (its boards, par ghosts and a
  series on the go were dropped), and the full-size circuit's as
  `full-circuit` / `full-circuit-reverse`, kept aside when a v8 save met
  the scaled-down one (its boards and par ghosts beaten dropped, a series
  kept)) }
  with `buyKart()` / `modKart()` / `kartStatsOf()` / `pickKart()`,
  `finishKartRace()` → `KartResult` (prizes by place, lap records in any
  race, run records and boards in time trials, par beaten (`PAR_LAPS`,
  `parLap()`), the daily challenge (`dailyChallenge()`, `dayKey()`,
  `CHALLENGE_PRIZE`), counters `kartRaces` / `podiums` / `kartWins` /
  `cleanLaps` / `overtakes`, XP `kartFinish` / `kartPodium` / `kartWin` / `kartRecord` /
  `parBeaten` / `challenge`) and the series (`startSeries()`,
  `seriesNext()`, `seriesRace()` → `SeriesResult`: `SERIES_POINTS`
  15-12-10-8-6-4-2-1, standings between races, the trophy and
  `SERIES_PRIZES` at the end, XP `seriesWin` / `seriesPodium`;
  `abandonSeries()`); ledger entries `karting` (in) and `karts` (out); six
  missions and five badges in `missions.ts`. Global boards wait for the
  game server (keep the boards' shape server-ready).
- **On screen:** `kart-types.ts` holds the interfaces the three parts agree
  on. `kartpark3d.ts` (`buildKartPark()`, at the boot) is the place: the
  spot's group (the garages with their numbers and the screen, the hut and
  its terrace, the timing tower with its board, both grandstands, the
  gate's arch with SECTOR 7 KART PARK both ways, the kiosk), its people,
  trees, lamps and parked cars, and `KART_VIEW` (the way round and whether
  the pits are closed, which `setCourse()` / `racing()` set and the
  grounds apply when they've come). `kartgrounds3d.ts` (a district loaded
  as you approach, `LAZY_DISTRICTS` id `karts`; signs shared through
  `kartsigns.ts`) draws the rest as sites: the lawn, the paving and the
  banks; the circuit:
  asphalt, edge lines and red-and-white kerbs swept along the centre
  line, banked where it rolls; grass run-off with gravel on the outside
  of the bends where it lies flat, easing down as grass banks where the
  track is raised; the tunnel tube; the jump's striped lip; the flyover's
  railed deck on columns just past its edges, open underneath, with
  abutments at the ramps; the chequered line, both ways' grids and the
  gantry; the pit lane, its bays and the cones that close it in a race
  (`racing()`); the armco, tyre walls and catch fencing (its mesh in the
  FX layer), marshal posts with their booths and flags, the floodlight
  towers, the fence; the paddock's tents with karts on stands; the plaza's
  flags and benches; Kart Road, the loop and the car park with its bays,
  arrows and P sign), and on the main thread the start line, the banner,
  the cones and per course (`setCourse()`, the way round being raced) the
  guidance: pad chevrons, chevron boards on the outside of the bends,
  arrows painted before the turns, numbered corner boards and 3-2-1
  braking markers before the hard corners (one sign atlas, `atlasTex()`).
  The show kart waits in the middle bay (`showSpot`). A race's conditions
  go on the sky through `conditions()` (night: night, rain: rain, day:
  day and dry), and the visitor's own time and weather come back after
  (`raceConditions` in `index.ts`). `kart.ts`
  (`createKartRace()`) runs a race: builds the sim from the save at the
  class's pace, seats Degen, places the karts from the sim every frame
  (tilted with the banking), the chase camera, sparks, flames, dust off
  the run-off and spray in the rain, the sounds (`kart*` kinds in
  `sound.ts`), pays through `finishKartRace()` (and `seriesRace()` in a
  series) + `commit()` and shows the results. **Ghosts** in time trials:
  your best lap on the course and class is recorded as it's set and
  replayed (`degen-city-ghosts-v2` in localStorage, per key; the v1
  ghosts were the full-size circuit's and are cleared), and a par
  ghost is driven by the sim's `auto` at the class's pace; `setGhosts()`
  shows or hides each, the HUD shows the gap. `kart-ui.ts`
  (`createKartUI()`, markup `data-karts`, `data-kart-hud`,
  `data-kart-count`, `data-kart-pops`, `data-kart-result`, the Drift
  touch button `data-kart-drift` in `CityMap.astro`, styles in
  `src/styles/karts.css`) is the hut's menu (Race: the cups as series
  (start, continue, drop); a single race (a cup's rivals at its class and
  level, forward or reverse, day, night or rain, three laps, paid like a
  cup's race, outside any series: `RaceStart.single`, kart.ts skips
  `startSeries()` / `seriesRace()`); time trials with their class and
  ghosts; the daily challenge. Karts: buy, pick, mods, paints. Boards: the
  leaderboards per course and class, your records, par, trophies,
  counters and your laps from the old track (`karts.old`)), the HUD
  (place, lap, clock, last and best lap, the ghost gap, the surface and
  Night / Rain tags, drift meter, the series race, and the minimap
  `data-kart-map`: the circuit's outline drawn once from `CIRCUIT`'s
  samples in world numbers, the flyover's deck over the run below, the
  start line, a dot per kart from `KartHud.dots` with yours lit and on
  top), the countdown, pops and the results card (laps, par, the series
  table with Next race / Drop). `walk.ts` wires them: the hut door's
  prompt opens the menu, a race hides Degen and feeds the kart
  (`kartFrame()`: W/S gas and brake, A/D steer, Space hop and drift;
  touch: the stick, the pedals and Drift over Brake; gamepad: stick, RT /
  LT, A drift, Y quits), `nextRace()` / `quitSeries()` carry a series on, Esc or Quit
  abandons (no prize), closing the results stands Degen up by the hut.
  While racing `.city.is-karting` is on the root and `data-kart` makes the
  header read "Karting · <course>". Under reduced motion the race still
  runs (it's the game) with no camera shake or sparks.

## Target practice (3D walk mode)

- Solo shooting practice. Only the player's Degen carries a gun, picked up
  at the gun store counter in the Armoury (`RACK` in `solids.ts`, the
  counter itself in `armoury()`) or at Trench Arms' hatch in The Trenches
  (`ARMS.counter` in `avenue.ts`, the same store). Targets are the cardboard dummies (`DUMMIES`) and the patrol
  drones; never make pedestrians, soldiers or other characters targets.
- **Rules and view are split, ready for multiplayer.** `combat-sim.ts` owns
  the rules (ammo, fire rate, spread, hits, health, respawns, score, streaks)
  on a fixed 60 Hz tick, takes per-player inputs and emits events. It must
  stay free of DOM, scene objects and `Math.random` (seeded generator only)
  so a server can run it. `combat.ts` is the local view: it feeds the local
  player's input in and draws / plays the events. New gameplay goes in the
  sim first; looks and sounds in the view.
- **The gun store** (`gunshop.ts`, markup `data-shop` in `CityMap.astro`)
  opens at the Armoury counter. Four guns, each defined once in
  `combat-sim.ts` `WEAPONS` (stats, `need` = lifetime score that unlocks it)
  and modelled in `guns.ts` `SPECS` (parts, muzzle, sight, hand spots): the
  Assault Rifle (holo red-dot, also carried by the soldiers via
  `rifleGeometry()`), Buzz SMG, Street Sweeper shotgun (pellets, iron sights)
  and Long Shot marksman rifle (scope, full-screen scope view) unlock with
  score and are free; the Hand Cannon revolver, Tri-Tap burst carbine and
  Belt Feeder are bought with Dorras (`GUN_CATALOG`), and every gun's mods
  (`GUN_MODS`: barrel, extended mag, grip and stock; `applyGunMods()`, per
  player in the sim) are bought at the Armoury's workbench. Never real
  money, never tied to the token. Keep them cartoon: no real-world gun
  names, brands or markings. A new gun needs a `WEAPONS` entry (with a `short` name for the Swap
  button), a `FIT` entry in `gunfit.ts` (its hand spots, muzzle and sight, a long gun's `butt`,
  third-person `hold` spot for the front hand, `carry`, `reload` kind and
  `kick`), a `SPECS` entry in `guns.ts` (its parts), store art (`ART` in
  `gunshop.ts`) and a shot sound (`SHOT_SOUND` in `combat.ts`); the tests
  check the hands land on it.
- In third person (the player and other players), `stance.ts` `holdGun()`
  (DOM-free, tested in `tests/gunfit.test.ts`) poses the gun's pivot (a
  child of Degen's torso frame) and puts both hands on it with
  `reachArm()` (`skeleton.ts`): the shooting hand on the pistol grip
  (every gun's origin, `GRIP`), the other on its `hold` spot, or wherever
  the reload clip sends it, both closed round it (`grip`). On top of the
  walk or run: `aim` (the spine bends a share of the way, the head takes it
  back out; a long gun's `SPINE_AIM` share is bigger),
  **shouldered** (animation Phase 8: at the ready and aiming a long gun's
  `butt` in `FIT` sits in his right shoulder's `POCKET` and the gun pivots
  there; aiming, his head comes down onto the stock, `CHEEK`, pitched and
  tilted (`Pose.headRoll`) so his eye is on the sight's line, the gun
  meeting it part of the way; `Stance.cheek` says how far, and walk.ts and
  remote.ts add the look only the rest of the way; a new long gun needs its
  `butt`), `ready` (1 after a shot, an aim or a reload for
  `READY_HOLD`; 0 is the relaxed carry: a long gun low across the body, the
  revolver hanging in one hand; sprinting relaxes it), `draw` (0 put away:
  slung on his back or the revolver on his hip (`STOWED`); the hand goes to
  it, then it swings round to his hands), recoil (the chest and the
  shooting shoulder shoved back; `Limb.reach` turns the collarbone).
  Longer guns turn Degen side-on just enough for the front hand to reach
  (the collarbone brings the shoulder forward first). Call it after the
  walk and jump poses so they don't pull the hands off; walk mode calls
  `combat.poseGun()` every frame while geared up (it returns whether the
  hands are on the gun), and `combat.ts` runs the draw, holster and swap
  (`DRAW_TIME`, the old gun away and the new one out in `SWAP_TIME`).
- Reloads are keyed clips in `gunfit.ts` (`reloadAt()`: `mag`, `shells`,
  `cylinder`, `box`), played by the third-person hold and the first-person
  hands (`viewmodel.ts`) alike; the magazine rides in the hand while it's
  `carried`, and the sounds follow `RELOAD_CUES`. Every clip starts and
  ends at rest.
- Finishes (`SKINS`) are cosmetic and work on every gun. Lifetime score,
  finish and last gun are saved in the browser under `degen-city-combat-v1`
  (or the player profile online).
- Over the shoulder is the default when walking starts (V or the
  Controls panel swaps to first person). The first-person hands
  (`viewmodel.ts`, Degen's own from `bakedHand()` in `body.ts`: the right
  closed round the pistol grip, the left under the front) wear the sleeves of Degen's outfit (`setOutfit()`, called
  from `walk.setLook()` through `combat.setOutfit()`: a suit sleeve with a
  shirt cuff, or a looser hoodie / track sleeve with a ribbed cuff and the
  track top's stripes). They're built `K` times bigger and further out (the camera's
  near plane is 0.5 m) and drawn in the front of the depth buffer, with
  their own flat shading (city lamps would otherwise light them wrongly).
  Keep the red dot on the line of sight: scale the whole holder, never only
  its position.
- Hits are hitscan from the camera centre. Bullets stop on everything in
  `SOLIDS` except the dummies' own footprints (`SHOT_SOLIDS`), on plot
  buildings and on the ground. When dummies move, their footprints follow
  `DUMMIES` automatically.
- Keys: click fires, right-click aims, R reloads, G holsters, X / 1-4 swap
  guns (Q and E are kept for peeking, animation Phase 4); F does what the
  prompt says (the owner's call: every door, counter and getting in or
  out, and F closes those menus); Shift sprints, Caps Lock (not R) toggles
  walking, the touch Sprint button locks the sprint. Where the mouse can't be captured
  (`noLock` in `walk.ts`), click fires and dragging looks. Only a real mouse
  fires from the canvas (taps send mouse events too).
- Swapping (`swap()` in `combat.ts`, `sim.swap()`, the `swap` message): once
  geared up, any unlocked gun, anywhere; each gun keeps its own ammo
  (`stash`), a new one comes full, the counter refills all, and the new gun
  fires after `SWAP_TIME`. On touch the Swap button (`data-walk-swap`, gun's
  `short` name in `data-swap-name`) sits above Fire; the desktop HUD shows the
  gun's name (`data-gun`).
- Touch: dragging the Fire button also looks (one thumb shoots and steers);
  keep its `touch-action: none` so the browser never cancels a held Fire. The
  right-hand buttons and the door prompt must not overlap at any phone size,
  upright or on its side (narrow phones get a smaller stick). With "Aim when firing" on, firing also aims (`aimNow` in
  `walk.ts`, held `AUTO_ADS_HOLD` after the trigger is let go); use `aimNow`,
  not the aim input, for anything that depends on aiming (spread, sight,
  zoom, the aim sent to the server). The combat HUD (`data-cross`, `data-hitmark`, `data-dmg`,
  `data-pops`, `data-mag`, `data-reserve`, `data-reload-hint`, `data-score`,
  `data-streak`), the finish picker (`data-skins`, `data-lifetime`) and the
  Fire / Aim / Reload / Swap buttons live in `CityMap.astro`; `combat.ts` and
  `walk.ts` expect them.
- Gun sounds go through `sfx()` in `sound.ts`, so they stay silent until the
  visitor turns sound on. Under reduced motion the drones hover in place.
- Score, streaks and finishes are for fun only: no prizes, real rewards or
  token tie-ins. Takedowns do count for the city's game (`takedown()` in
  `tycoon.ts`: XP, missions, badges), through the `onTakedown` dep.
- **Fighting** (punches and kicks, the Fight Club on the south bank, styles
  bought with Dorras, player-versus-player when the server is live) is
  planned in `docs/fight-plan.md`; build it one phase at a time with the
  owner's sign-off. Phase 1 is built: the rules are `fight-sim.ts`
  (DOM-free, seeded, 60 Hz, tested in `tests/fight.test.ts`: `MOVES` with
  start-up / active / recovery frames, reach and arc, the jab-cross-hook-
  uppercut chain and the kicks, block and the parry window, dodge, stamina,
  stagger and knockdowns, `STYLES`, bots via `think()`, spars and bouts;
  a fighter faces along (sin yaw, cos yaw); a press is kept `T.buffer`
  frames so it fires when it can, a strike from just out of reach steps in
  (`T.stepIn`), the facing turns at `T.turn` and a move's lock-on snaps at
  most `T.lockSnap`; bots are `BotTraits` (`botTraits()`: block, dodge,
  parry, telegraph (extra wind-up on heavy moves, a tell), kicks, finisher,
  backOff, pace), the gym's three in `FIGHT_BOTS.traits`); the animations are
  `fight-anim.ts` (DOM-free, tested in `tests/fight-anim.test.ts`: every
  clip is keyframed on the `Pose` rig, a move's clip is exactly its sim
  frames long with the strike on the first active frame; `sampleClip()`,
  `blendPose()`, `moveClip()`, `hurtClip()`; the hips' `turn` and `sway`
  go into every punch and kick, the reactions are keyed for a blow from the
  right and mirrored for one from the left (`hurtMirror()`, from the sim's
  `hurtBy`), the clips' head turn is over square hips (the figure takes
  the hips' turn back out); `root` { y, pitch, pivot } for
  the lying poses (the fall and the get-up pivot at the hips, `rootShift()`
  in `fight-figure.ts` moves the group so); `fists: true` on an `Outfit`
  closes the hands); `?fight` in the address
  runs the sparring demo (`fight-demo.ts`: two bots on the hangout square,
  an overlay with health, stamina, the clip each plays and a clip picker).
  Phase 2 is built, **the Fight Club**: the site is `fightsite.ts`
  (DOM-free: the lot on the south bank east of the garage, `RING` and
  `RING_HALF`, `POSTS`, `ROPES`, `SHED`, `COUNTER` and `TRAINER` (the
  "Trainer" prompt), `CORNERS`, `OUT`, `FIGHT_SPAWN`; the lawns' trees keep
  off it in `outer.ts`), drawn by `fightclub.ts` (`buildFightClub()`: the
  paved yard, the ring with the diamond canvas, posts and neon ropes (not
  solid: you step through), the open-sided shed with its rig, the counter
  kiosk, bags, lockers, bleachers and the FIGHT CLUB cut-out; `setLive()`
  brightens the lights for a fight; its footprints are `FIGHTCLUB_SITE` in
  `solids.ts`, and it's a place: spot `fightclub`, pin, directory entry
  and a City-view panel with your record and **Walk in**). `fight-types.ts`
  holds the parts' interfaces. `fight-ui.ts` (markup `data-fight`,
  `data-fight-hud`, `data-fight-count`, `data-fight-pops`,
  `data-fight-result`, the Punch / Kick / Block / Dodge touch buttons
  `data-fight-punch` / `-kick` / `-block` / `-dodge` and Quit
  `data-fight-quit` in `CityMap.astro`, styles in `fight.css`) is the
  trainer's menu (Spar, Bout, Record, Styles (coming)), the HUD (health,
  stamina, round and clock, score pips, chain, the knockdown count), the
  bell text, pops and the bout card. `fight.ts` (`createFight()`) runs a
  fight: your Degen with fists against one of `FIGHT_BOTS` (`catalog.ts`:
  Rookie Ray, Knuckles, The Mayor; skill, style, purse, level) in the
  ring, a soft lock-on (forward is towards the opponent), hit-stop and a
  camera punch on heavy hits, the hit figure's white flash, impact lines
  and sparks at the contact, floating damage numbers (`.fight-dmg`), stars
  on a knockdown, health bars that chip with a pale ghost draining behind
  (`.fight-ghost`), the sounds
  (`whoosh`, `punch`, `kick`, `fightBlock`, `parry`, `thud`, `fightKo`,
  `bell`, `count` in `sound.ts`), the over-the-shoulder camera kept inside
  the ropes, and it pays through `finishFight()` + `commit()` (a spar: XP
  with a capped bonus per hit; a bout of three 90 s rounds, first to two:
  the purse on a win, XP either way, a quit is a loss; knock-outs and
  chains of three add XP). `walk.ts` wires it: the counter's prompt opens
  the menu, a fight hides Degen and feeds `fightFrame()` (W/A/S/D move
  relative to the opponent, click punch, right-click or G kick, Shift
  block, Space dodge; touch: the stick and the four buttons; gamepad:
  stick, X / Y, LB held, A, Start quits), Esc or Quit ends it with the
  card, closing the card stands Degen up outside the ropes (`OUT`);
  `.city.is-fighting` hides the walk HUD and `data-fight` makes the header
  read "Fighting · <opponent>". The save (`tycoon.ts`, v10) keeps `fight`
  (style, owned styles, wins, losses, knock-outs, best chain, bouts, spars,
  each opponent's record), the ledger entry `fighting` and the counters
  `bouts` / `fightWins` / `kos` / `chains`. New gameplay goes in the sim
  first; looks in the clips and the view.
- **Nothing in the city attacks you** (the owner's call): the rival crew
  that patrolled the south bank was retired; only its look (`crewOutfit()`
  in `crew.ts`) remains, worn by the Fight Club's opponents. Targets are
  the dummies and the drones only, and there is no player health outside
  the Fight Club's ring. Don't bring the crew back without the owner.

## City builder (3D build mode)

- Each district around the core is **one large plot** (its 3 x 3 squares
  merged into one): North 1-5, West 1-3, East 1-3, and the South row (S1-5)
  across the river. The south bank has its own east-west road
  (`SOUTH_ROAD`, so roads are split into `NS_ROADS` / `EW_ROADS` in
  `world.ts`), a lamp-lit riverside walk, traffic over the four bridges and
  pedestrians round the south row (`DISTRICTS`, `BUILDINGS`, `cleanDesign()` in
  `src/data/plots.ts`, DOM-free). Plot grid, overlay and building
  generators are in `plots.ts`, the interface in `builder-ui.ts`. The core
  landmarks are not for sale.
- **Plots cost Dorras** (the owner's call, Phase 5): `PLOT_DORRAS` in
  `catalog.ts`, dearer with each plot you own, from level `PLOT_LEVEL`;
  designs cost `BUILD_COSTS`; selling back pays `PLOT_REFUND`. The rules
  are `buyPlot()` / `buildPlot()` / `sellPlot()` in `tycoon.ts`, behind
  `createPlotStore()` (`store.ts`) for `builder-ui.ts`. There is no wallet
  in Build mode and no live or demo mode any more: one game, in this
  browser's save. Sales for PLS were retired; don't bring them back without
  the owner.
- The eight designs (`GEN` in `plots.ts`) are drawn at the large plot's own
  scale (8.2 x 8.2 tiles, front facing +z before the owner's turn), each with
  its site dressed around it from the shared helpers (paving, `tree`, `pine`,
  `lamp`, `bench`, `planter`, `fence`, `bollards`, `lightString`). People-scale:
  doors ~1.2-1.7 tall, floors ~0.95-1.0. Each design pushes its walk-mode
  footprints to `ctx.solids` (turned with the building; parks stay walkable).
  Tower and loft floors are capped in `BUILDINGS` so nothing outgrows the
  Emporium (its roof is ~12.5 tiles up; an 8-floor tower's mast tops out at
  ~11.9). Keep it that way when adding designs.
- Visitors can't type text onto buildings: sign texts come from the fixed
  `SIGNS` list, so nothing unexpected (or confidential) appears in public.
- **Logging in with a wallet** (`wallet.ts`, `account.ts`, `account-ui.ts`;
  the server's `accounts.ts`, the sign-in message in `src/scripts/net/auth.ts`)
  is part of the paused multiplayer: a player profile that follows the
  wallet. It never sends a transaction. No explorer or wallet-brand links;
  only the confirmed links in `src/data/site.ts` are linked.

## Multiplayer (beta, paused)

- **Paused by the owner**: the live site is built without a game server
  (see Hosting). The notes below describe the parked code.
- The plan and decisions are in `docs/multiplayer-plan.md`; keep it up to
  date. Phase 1 (hangout, player profiles, shared target practice) is built;
  leaderboards and south-bank PvP come next.
- The game server lives in `server/` (Cloudflare Worker + Durable Objects:
  Lobby, Room per city of 16, Profile per player, Accounts for wallet
  logins). See `server/README.md`.
  The server decides hits, scores and profiles; browsers only predict their
  own shots. New rules go in `combat-sim.ts` (shared), never only in the view.
- Shared code the server bundles must stay free of DOM and scene code:
  `src/scripts/net/*` (except `client.ts`), `combat-sim.ts`, `solids.ts`.
  `src/scripts/net/protocol.ts` is the wire format; bump `PROTOCOL` when it
  changes incompatibly.
- Nothing typed by players ever shows: guest names come from the word lists
  and emotes / phrases from the fixed lists in `profile-data.ts`. Review any
  new words or phrases for the content rules below (no token details, no
  financial talk). The server re-checks every value players send.
- Player profiles: player name (from the word lists, reroll), wardrobe look,
  rifle finish, lifetime score and rank, stored on the server against a hash
  of the browser's guest token (`degen-city-player-v1`), or of the wallet
  address once logged in (`server/src/keys.ts`). Offline, the Profile panel
  keeps the look and finish in the browser.
- **Log in with a wallet** (`account.ts`, `account-ui.ts`; server
  `server/src/accounts.ts`, the `Accounts` Durable Object, `/auth/*`): the
  wallet signs `signInMessage()` with a one-time nonce (personal_sign, no
  transaction, no gas); the server recovers the signer and issues a 30-day
  session token (only its hash is stored; the browser keeps it as
  `degen-city-account-v1`). One login covers everything: the room opens the
  wallet's own profile (the token rides in `hello`). A wallet's first login starts a fresh profile (no guest score,
  name or look carried over), and its look never overwrites the browser's
  own guest look. The **Connect wallet** button sits in the header's tools (`.nav-account`,
  rendered by `CityMap.astro` when there's a game server,
  "Connect" on phones) and in the walk Profile tab (`[data-account-open]`);
  both open the profile card (`[data-account]`). The account and card are
  made with the page (`CityMap.astro`), not with the 3D city, so they work
  on the 2D map and before 3D has loaded; `bootCity()` gets them and fills
  in their `hooks` (Online switch, rename, Build mode). The card shows:
  player name, rank, lifetime score, the wallet (short) and network, and the
  with New name and Log out. Only the visitor sees their own address; other
  players only see the player name. Logging in needs the city Online.
- The site only shows the Online pill and the Online / Offline switch when
  built with `PUBLIC_GAME_SERVER` (set by the Worker's build). Only pages in
  `ALLOWED_ORIGINS`
  (`server/wrangler.jsonc`) can connect.
- **The Online / Offline switch** (`online.ts`, `[data-online-switch]` in the
  mode header, remembered as `degen-city-online-v1`, online by default) is
  one choice for the whole city. Online: walking joins the shared city
  (`multiplayer.ts` connects only while walking). Offline: solo walking, and
  nothing calls the game server. Build mode is the same game either way. Go online / Leave in the Online pill flip the same switch. Its
  dot: grey off, cyan ready, yellow joining, green in a city, red full or
  unreachable. It reads "On / Off" up to 900px wide; up to 420px only the
  current side shows (a tap flips it) and City / Walk / Build are icons, so
  the mode header keeps the title.
- PvP will only ever happen across the river (south bank), in the Fight
  Club's ring; the city north of the bridges stays a safe hangout.

## Tests

- `npm run typecheck` (`astro sync`, then `tsc` with `--noUnusedLocals`)
  checks the types and that nothing declared is left unused; the "Build
  site" Action runs it first, so a type error stops the build too.
- `npm test` runs `tests/*.test.ts` with Node's own test runner
  (`scripts/test.mjs` bundles each with esbuild first; `npm test -- drive`
  runs only matching files). `npm run test:wide` runs them all in Phase
  10's bigger world (`WORLD_EXT`): run both when anything reads the edge. The "Build site" Action runs them before the
  build: a failing test means no zip.
- They cover the code that's free of the DOM and scene code: the street plan
  (`layout.ts`, `streetplan.ts`), downtown (`downtown.ts`), the ring highway
  (`highway.ts`), the traffic's routes and lights (`routes.ts`), collision data, doors, the gun counter, the garage
  and the spawn (`solids.ts`), the plots (`src/data/plots.ts`), your car
  (`mycar.ts`), the driving rules (`drive-sim.ts`), target practice
  (`combat-sim.ts`), the economy (`tycoon.ts`, the market square in
  `solids.ts`), the city's game (`catalog.ts`, `missions.ts` and the
  clock format in `ui.ts`, in `tests/game.test.ts`), Getting started and
  the save backup (`guide.ts`, `backup.ts`), the layout snapshot (nothing that exists moves, `tests/snapshot.test.ts`), the tile grid and the collision grid (`tiles.ts`, `boxgrid.ts`), building as you go (`tileplan.ts`, `tilebatch.ts`, `tilework.ts`), the outskirts' trees and the camera's bounds (`outskirts.ts`, `bounds.ts`), the building kits and recipes (`kits.ts`, `recipes.ts`), Liberty Bridge (`liberty.ts`),
  getting about (`places.ts`, `metro.ts`, taxis' drives in `routes.ts`, `ambience.ts`), how the traffic behaves (`traffic.ts`), the people on the sidewalks (`pedestrians.ts`), the buses' stops, the boats and the dusk (`transit.ts`, `boats.ts`, `dusk.ts`), The Trenches (`trenches.ts`, `projects.ts`, `commons.ts`, `grit.ts`, `streetwall.ts`, `avenue.ts`, `riverside.ts`, `waterfront.ts`, `nightmarket.ts`), Westlake Park (`westlake.ts`, `stadium.ts`, `parklife.ts`, `gardens.ts`), Uptown (`uptown.ts`), the kart park's facility (`kartfacility.ts`),
  the airport and its timetable
  (`airfield.ts`), flying your own aircraft (`flight-sim.ts`,
  `myplane.ts`), the merch looks and marks (`profile-data.ts`, `marks.ts`,
  in `tests/merch.test.ts`), the crowd's baked clips (`crowdclips.ts`) and Degen's skeleton, weights, head and hands
  (`skeleton.ts`, `body.ts`), his walking (`locomotion.ts`), the motion capture and its animation (`bvh.ts`, `mocap-build.ts`, `mocap.ts`, `movesim.ts`, `inertia.ts`, `motionmatch.ts`, `animator.ts`) and the guns in his hands (`gunfit.ts`, `stance.ts`). Modules that touch the DOM or `kit.ts` (canvas
  textures) can't load in Node; keep data a test needs in the DOM-free
  files.
- When you change a rule or move something in the city, run the tests and
  extend them: a new landmark's boxes and door, a new model's handling, a
  new road. Fix the code, not the test, unless the test was wrong.
- `npm run budget` (after `npm run build`) holds the start's download to
  its budgets (`scripts/budget.mjs`); the "Build site" Action runs it after
  the build.
- Browser checks (the widths above, walk and drive flows) are still done by
  hand with Playwright against `npm run preview`.

## Hosting

- degenemporium.com is a static build hosted on Hostinger (`dist/`
  extracted into `public_html`). The "Build site" GitHub Action builds
  every push to `main` into a downloadable zip (artifact
  `degenemporium-site`).
- Keep the site fully static (no server routes) and keep `public/.htaccess`
  in the build.
- **Multiplayer is paused** (the owner's call): the "Build site" Action
  builds without `PUBLIC_GAME_SERVER`, so the city runs on its own: the
  whole city game in the browser's save, no Online switch, multiplayer or
  Connect wallet. Keep that code working
  (it's all behind `PUBLIC_GAME_SERVER`), but don't develop it further
  until the owner resumes it.
- **Ignore Cloudflare** for now: the `server/` Worker (emporium on
  workers.dev, which also builds a copy of the site) is parked. Don't spend
  time on its deploys unless the owner brings it back.

## Content guardrails

- **The token is confidential until launch.** Never put its name, ticker,
  contract address or launch details in the site's markup, alt text, meta
  tags, file names or commit messages. Window 05 shows a blurred *decoy*:
  CSS blur only hides things visually, and the HTML is public. Reveal it
  only when the owner says launch is live.

- All copy is draft until the owner says otherwise; keep the draft note.
- No prices, stats, APYs, audits, partnerships or testimonials unless the
  owner supplies them as facts. Dorras prices in the game (plots, cars,
  guns, clothes) are game numbers, not real prices. No financial advice:
  plots are city land for building on, never pitched as an investment.
- PulseChain is a real project: say "PulseChain native", never imply an
  official partnership or endorsement.
- Only link to destinations the owner has confirmed (currently X, Telegram
  and the Shopify store in `src/data/site.ts`).
- The Shopify store is public too: anything the site pulls from it (product
  names, images, descriptions) must not reveal the token either.
