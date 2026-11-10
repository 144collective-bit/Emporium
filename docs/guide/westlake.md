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
