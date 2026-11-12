# Westlake Park, the stadium and the north side

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

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
    Mall (`MALL`) from City Hall's back door (the civic quarter, below) to
    the stadium's forecourt, the ways
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
    gates (stone piers, caps, lanterns; the Mall's north gate with iron posts, a beam
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
    plan, so traffic drives them, up the north road (ns0) under the raised
    highway. Its footbridge was retired with the highway's rise (the
    owner's call, docs/highway-plan.md Phase 2): the Mall runs on out of
    the park's north gate (westlake.ts `gate-n`) on a paved walk under the
    deck (`WALK`, the deck's piers keep off it) to a zebra over Stadium
    Road (`ZEBRA`). `STADIUM_SOLIDS` (in `SOLIDS`): the facade all round,
    the gates shut until there are events, the masts, the parked cars;
    `STADIUM_LAMPS`, `STADIUM_RECTS` (the outskirts' trees keep off). The stadium is drawn by `stadium3d.ts` (`buildStadium()`, a
    place built at the boot: seats in sections of magenta, purple and cyan,
    the roof's neon edge, lamp heads on the masts and their pools of light
    on the pitch at night, the screen and the name board from one small
    atlas, the parked cars); its grounds (the road, the car park with its
    bays, one-way arrows and P sign, the walk and the zebra) by
    `stadiumgrounds3d.ts`, loaded as you approach with the park's chunk
    (`LAZY_DISTRICTS`: `westlake`, whose land covers it too).
    It's a place: spot `stadium` (pin, directory entry, panel
    `data-panel-tpl="stadium"`: events coming soon, Walk in), the gate's
    door prompt opens it, `PLACES` entry. **Fixtures and match night** (the
    polish plan's Phase 7): `fixtureAt(t)` in stadium.ts is the next match
    from the visitor's clock (`HOME`, Sector 7 FC, against `VISITORS` in
    turn by the day, Wednesdays and Saturdays at half past seven,
    `FIXTURE`; `clockAt()`, `clockText()`, `fixtureLines()`; the same for
    everyone in a time zone), on a fixture board beside the gate and on the
    screen (stadium3d.ts: painted live, `liveTex()`, repainted when it
    changes; the panel's live line too), and `matchOn(t)` (`MATCH`, the
    match day's evening) is match night: the floodlights full on with their
    pools on the pitch (a material of their own on the tick; dim otherwise),
    the screen playing its slides (fixed made-up copy), the crowd's roar
    round the ground (ambience.ts `stadium`, sound.ts: a murmur and a roar
    swelling now and then) and a few people queueing at the shut gate (the
    crowd's `wait` act; `Idle.when` in landmarks.ts: an idle only sometimes
    there, life.ts stands them out of the world the rest of the time).
    Nothing moves and the gates stay shut. Its
    old site in the park (`GARDEN_SITE` in westlake.ts) is kept clear for
    the formal garden (stage 3), the Mall running through it to the
    north gate; the old car park on the first strip
    went back to park.
- **The civic quarter** (the owner's call, the build-out plan's first
  section: City Hall, the police headquarters and the courthouse at
  Westlake Park's south end, facing Uptown across the avenue) is planned in
  `docs/civic-plan.md` in five phases, each with the owner's sign-off; keep
  it up to date. City Hall may rise over the Emporium (the owner's
  exception: a tower or dome, the seat of power), in stern stripped
  classicism; the police headquarters and the courthouse are to be places;
  names plain and made up (Sector 7 City Hall, Sector 7 Police, the Sector 7
  Courthouse). Phases 1 (the land, the square and the walks), 2 (City
  Hall), 3 (the police headquarters and the courthouse), 4 (life, night
  and sound) and 5 (polish) are built, and the plan is done, waiting on the
  owner's sign-off: `civic.ts` (DOM-free, tested in
  `tests/civic.test.ts`):
  - the civic square (`SQUARE`) on the axis (`AXIS`, the Mall's line and
    Uptown's), open to the avenue (the Mall's south gate went, its WESTLAKE
    PARK board to the north gate; the park's wall stops either side);
  - the lots kept for the buildings (`LOTS`: City Hall's `HALL` front range
    and back block at the square's head, `POLICE` west and `COURT` east,
    facing across it; lawn until their phases);
  - the walks round City Hall (westlake.ts `civic-w`, `civic-e`; the Mall
    starts at its back door, `mall-lake` moved behind it, all three clear of
    the lake loop, which didn't move);
  - the square's trees, lamps and benches (`SQUARE_TREES`, `SQUARE_LAMPS`,
    `SQUARE_BENCHES`).

  The park's trees, lamps, benches, beds, planters, edge row and picnics
  keep off it (`inCivic()`), and the kerbs stop at the square
  (`inSquare()`). Drawn by `civic3d.ts` (Westlake Park's chunk): Uptown's
  granite (plaza3d.ts) over the square, the axis and a border inlaid, a pale
  ring at its middle, grates round its trees.
  - **City Hall** (Phase 2, the owner's picks): steps up from the square to a
    podium (`STEPS`, `PODIUM_Y`; walked as a slope, `cityHallY()`, a layer in
    groundheight.ts), a colonnade of eight square columns (`COLUMNS`) under
    a frieze carved SECTOR 7 · CITY HALL, the emblem (a seven-pointed star,
    `STAR`, made up) on the attic, crimson banners with the star (`BANNER`)
    either side of the bronze door (`DOOR`), the front range and the back
    block with tall windows lit at night, and the stepped tower over it
    (`TIERS`, stars lit on its second tier, a lantern and a gold finial:
    `CITYHALL_TOP` 22.4, `CITYHALL_TIP`; the owner's exception to "under
    the Emporium", every flight well over it). It's solid
    (`CITYHALL_SOLIDS` in `SOLIDS`), drawn by `cityhall3d.ts` (two sites in
    Westlake Park's chunk). It's a place: spot `cityhall` (its pick boxes at
    the boot, `CITYHALL_PICK`, through crestspots.ts `spot()`), a pin, a
    directory entry, a panel with Walk in (`data-civic-walkin`,
    `CITYHALL_SPAWN`), its door (`CITYHALL_DOOR` in walk.ts `ALL_DOORS`),
    `PLACES` and `LIVE_PLACES` entries, its live line and its footprint on
    the world map.
  - **The police headquarters and the courthouse** (Phase 3, the owner's
    picks: City Hall's stone, plainer and lower), drawn by `flank3d.ts`
    (two sites in the park's chunk, City Hall's materials and helpers
    exported from cityhall3d.ts, `carvedMat()`):
    - Sector 7 Police (`HQ` on `POLICE_HQ`): three storeys, its entrance
      onto the west walk with the blue lamp and SECTOR 7 POLICE, a mast;
      its walled yard south of it (`POLICE_YARD`, `YARD_WALL`, the gate
      onto the ring walk, `YARD_GATE`) with four Patrol cars (`YARD_CARS`,
      `parkedCars()` on the main thread).
    - The Sector 7 Courthouse (`COURT`): four steps up from the square
      (`COURT_STEPS`), a portico of four columns (`COURT_COLUMNS`) under
      SECTOR 7 COURTHOUSE and a low pediment with the gold star, the body
      behind (`COURT_BODY`).
    - The steps and porticos are one ground layer (`civicY()`, groundheight.ts
      `civic`); `FLANK_SOLIDS` in `SOLIDS`.
    - Both are places: spots `police` and `courthouse`, pins, directory
      entries, panels with Walk in (`POLICE_SPAWN`, `COURTHOUSE_SPAWN`),
      doors (`POLICE_DOOR`, `COURT_DOOR`), `PLACES`, `LIVE_PLACES`, live
      lines and world-map footprints.
  - **Life, night and sound** (Phase 4, the owner's picks):
    - the flagpole in the ring's dark heart (`FLAGPOLE`, `RING_C`, solid
      `FLAG_SOLIDS`), the city's flag (the gold star on crimson) waved by the
      park's chunk's tick near the camera;
    - floodlights (`FLOODS`: City Hall's columns, frieze and tower, the
      police's front, the courthouse's columns and frieze): fixtures as a
      site and their washes one additive `lit()` mesh, a hair in front of
      each face (`WASH_OFF`), fading up it, under the bloom's threshold; the
      police's pools at the boot (`FLOOD_POOLS`);
    - people: `CIVIC_IDLE` (guards always; by day, `civicDay()`, officials,
      the queue, the pigeons' friend: `Idle.when` takes the city's hour),
      `CIVIC_WALKERS` round `CIVIC_LOOPS` (life.ts), the pigeons (`PIGEONS`,
      main thread, by day);
    - sound: ambience.ts `civic` (murmur, footsteps, the flags) and
      `hallBell` (City Hall's bell on the hour, deeper than St Aldwyn's,
      sound.ts `toll()` with its own gain and pitch).
  - **Polish** (Phase 5, the owner's pick: the polish and two extras): the
    twin fountains flanking the axis in front of City Hall's steps
    (`FOUNTAINS`, `FOUNTAIN_SOLIDS`, heard as ambience.ts `fountain`); the
    flag run up at seven and down at seven by the city's hour (`FLAG_DAY`,
    `flagLift()`, taken in between) with the honour guard at the pole round
    each (`ceremony` in `CIVIC_IDLE`, `flagCeremony()`); `?bench` views
    `civic` and `civic-high`, `BLEND_VIEWS` `civic`.
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
