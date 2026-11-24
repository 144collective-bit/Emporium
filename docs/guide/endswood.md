# Endswood Estate and the south of The Trenches

Part of the project guide (`CLAUDE.md` is its index); keep it up to date when what it describes changes.

- **The south re-laid** (the owner's calls, 2026-11-14, `docs/south-plan.md`): Endswood, "the Ends", and the land
  round it are being rebuilt as one place that grew: an old village (Aldwyn's Green) on winding lanes with the estate
  dropped into part of it, tall along the ring road, low to the hedged fields, the Circus the heart, Lot 9 shrunk to
  the south-east. Built a phase at a time with the owner's sign-off, **all six phases built and signed off
  (2026-11-20)**: the streets and the rolling ground (1), the estate's blocks and their sky network (2), Aldwyn's
  Green's terraces, St Aldwyn's, the High Road's places and the council rows (3), below ground: the Circus's plaza
  and subways, the underpasses and the tube with its five stations (4), exit 6A and its road in (5), and the life,
  night and sound (6). What's left over (the plan's last section): the city-wide far view on phones (its own plan),
  a grassed block's straight edge in the estate band, the platform benches' collisions, the ride bar naming a
  two-line trip's last stop.
- **The estate made brutalist** (the owner's ask, 2026-11-21, `docs/brutalist-plan.md`, for the owner's sign-off):
  the blocks re-dressed in raw grey concrete, separate service towers, the twins joined at the top under a hexagonal
  lookout, pipes and kit on the walls, grit at street level; then lobbies, a flat of Degen's own, a launderette and a
  corner shop under the deck, and the lookout as a rooftop hangout. Until it's built, the blocks below are as they are.
- **The street web** is `south.ts` (DOM-free, the boot's, tested in `tests/south.test.ts`), built on `streetfaces.ts`
  (DOM-free: `smooth()` lines through control points, `node()` putting a shared point wherever lines meet or cross,
  `faces()` tracing the blocks between them, Sunridge's way made general). In it:
  - **The Circus** (`CIRCUS`, at (-82, 418), one way round, `CIRCUS_STREET`) and its five spokes: the High Road
    (`HIGH_ROAD`) west to Degen's gates, Underhill Lane (`UNDERHILL`) north to the tunnel's mouth, Church Road
    (`CHURCH_ROAD`) over the village's hill and on west to the fields, Southfold Lane (`SOUTHFOLD`) south past Lot 9 to
    the country, and Endswood Road (`ENDSWOOD_ROAD`): ns1s bent in off its line. ns2s bends into Marsh Lane
    (`MARSH_LANE`) down to Southfold Lane; the street plan ends both avenues where they bend (`NS_BENDS`). The south
    avenue (ns0s, its buses and Lot 9's road) and ns3 (the airport's edge) stay straight.
  - Gate Lane (`GATE_LANE`) past Degen's compound (`COMPOUND`, endsfar.ts `PLOT`: it never moved), Field Lane out west,
    the links (`FENNEL_WAY`, `RUNWAY_VIEW`, `LOT_LANE` in through Lot 9's west gate onto its lane, `BRAMBLE_LANE`,
    `BROOKSIDE`), the village's streets (Bell Street, Yew Walk, Chapel Row round the churchyard, Orchard, Lark, Hill,
    Mill, Thorn).
  - **The closes and crescents**, grown off them (seeded, the same every time: crescents first, then closes; worked
    out when the site is built, `GROWN`, baked.ts key `south-grown`, `docs/spawn-plan.md` Phase 3a), every
    one in a council, village or bungalow zone, clear of the other streets by `CLEAR`, with **a footpath through**
    (`FOOTPATHS`, the owner's rule: nowhere is a dead end on foot), on ahead past the close's end or out from the
    crescent's back, never back to the street it grew off. A new street joins `MAIN` (and `GROWS` decides where
    closes may grow).
  - `SOUTH_CROSSINGS` (where two or more meet; the avenues by their plan ids), `SOUTH_BLOCKS` (the faces, each with
    its `zone`: tall, estate, council, village, bungalow; too thin to stand on, a sliver is left as grass,
    `SOUTH_GREENS`), `zoneAt()`.
  - The brook (`BROOK`, `BROOK_HALF`) from the fields along the village's south edge, under Southfold Lane (its bridge,
    `BRIDGES`) and on past Lot 9's west side; the rec ground's land on its south bank (`REC`), St Aldwyn's
    churchyard on the hill (`CHURCHYARD`), the hedges round the fields (`HEDGES`), Lot 9's fence's agreed bounds
    (`LOT9_BOUNDS`, `LOT9_EDGE`: lot9.ts owns the fence).
- **`endswood.ts`** (DOM-free, the boot's, tested in `tests/endswood.test.ts`) is what the city asks of the estate:
  its land as a grid of cells over the blocks and the streets with their sidewalks (`inEndswood()`, `ENDSWOOD_RECT`:
  the fields round it are the country's, not the estate's), sodium lamps along every street's sidewalk and round the
  Circus (`ENDS_LAMPS`, lampmix.ts, lampposts.ts), and the bollards at each end of every footpath (`PATH_BOLLARDS`,
  `ENDS_SOLIDS` in `SOLIDS`).
- **The street plan** (`streetplan.ts`) takes `SOUTH_STREETS`, `SOUTH_CROSSINGS` and `SOUTH_BLOCKS` (the estate's and
  the tall band's ref `endswood`, paved as the Docks'; the village's, the rows' and the bungalows' ref `south`,
  grassed; areas.ts reads both as Endswood's), and Lot Lane joins Lot 9's `lot9-w` crossing.
- **Drawn** by `south3d.ts` (`LAZY_DISTRICTS` id `south`, `SOUTH_DRAWN`), all sites: the asphalt along each street
  (roads3d.ts's `ribbon()`, the Circus a hair over its spokes), a dashed centre line down the main roads and links,
  the turning circles, the Circus's planted island, the footpaths (paved, over the blocks) and their bollards, the
  brook between its banks and the bridge's parapets, the hedges, the rec ground's and the churchyard's grass, the
  compound's paved plot and the compound itself (`registerHome()`, home3d.ts), and Lot 9's tunnel under the ring road
  (`tunnel3d.ts`, the estate's subway dressing it always had).
- **The blocks** (`southblocks.ts`, DOM-free, tested in `tests/southblocks.test.ts`, docs/south-plan.md Phase 2; the cores
  standing off their blocks as service towers, `SERVICE_GAP`, `CORE_GAPS`, `Core.link`: docs/brutalist-plan.md Phase 2): drawn
  by `southblocks3d.ts` (2b; `LAZY_DISTRICTS` id `south-blocks`, `BLOCKS_RECT`), walked on in 2c. `BLOCKS` (the Rampart, Harrier and Kite Points, The Core, Linnet, Marten
  and Wren Courts, Sorrel, Fennel and Teasel Houses: each its footprint, spine, depth, galleried side, steps of storeys,
  base, accent; the Rampart's `arch`, Teasel's `refit`), `CORES` (the stair cores), `GALLERIES` (every third floor,
  `SKY_FLOORS`), `BRIDGES` and `DECKS` (the sky network), `COURTS`, `GRASS`, `DESIRE_LINES`, `PLAY`, `BUNKER` (Bunker
  Sound's door), `BLOCK_SOLIDS` (strips over each footprint, `cover()`; not in solids.ts until they're drawn). Heights
  by `floorY()` / `roofY()` / `topOf()`: a storey 1, the ground floor `GROUND_H` 1.4. The slabs round the Circus follow
  their streets (`alongStreet()`: the street moved off to its side); a block's base is its slab over the highest ground
  under it. `stepShape()` gives each step's outline with its edges tagged (its sides, rounded corners, ends, the cuts
  where steps meet; `outward()` their normals), which is what's drawn.
- **The blocks drawn** (`southblocks3d.ts`, sites a step, a tower, a core, a bridge span, the deck), brutalist since
  `docs/brutalist-plan.md` Phase 1 (2026-11-21): the wall atlas's `brutal` band (infill.ts `recessRow()`: board-marked
  grey concrete, the slab's edge at each floor, a fin between each two-bay balcony recess, the window and door at the
  back, a solid front over the recess's foot with its life on it, `recessLife()` in facade.ts: a plant, a dish, an
  air-con unit, a bike, washing now and then, the odd front painted, mostly plain; rain streaks) over a glazed ground
  floor (`lobby` band and a dark concrete fascia) on the galleried side and the ends, concrete on the other; the taller
  step's wall where steps meet; roofs and parapets; each block's colour (`ACCENTS`) a stripe down its ends (a tower's
  down its face away from The Core), the rest all concrete (`CONCRETE`, a cool grey); the corners chamfered
  (southblocks.ts `CUT`, `CORNER_R`); the Rampart's arch (soffit, piers' faces); galleries at every third floor (deck,
  concrete upstand, warm strip light under it; the improvement loop's R1, J1 part 1: the floor `DECK_FLOOR` a step
  lighter than the walls, the upstand's dark coping and closed ends (`capEnds()`), and near only the slab joints about
  every 1.2 m, a skirting 5 mm off the wall and a drip under the front; J1 part 2: the cores' landings, the bridges'
  floors (a lighter strip between the parapets, a joint under each mullion pair) and the podium deck (`drawDeck()`:
  `DECK_FLOOR`, a jointed 1.2 grid near only, its balustrade's coping, a drip under its edge) the same; J1 part 3:
  a core's landing posts are southblocks.ts `landingPosts()`, none in its link's doorway (`inDoorway()`, tested)); balconies with concrete fronts on the slabs' other sides (floors `DECK_FLOOR`), Teasel's
  boarded windows and hoarding, sky garden planters on the roofs (near only, not on phones); the towers' ledge rings, a
  concrete plant room box and beacon; The Perch round The Core's top two floors (`PERCH`, `TOP_FLOOR`, `drawPerch()`: a
  hexagonal drum, its glass band, its name, a glass lift inside; brutalist plan Phase 3) and the top floor's bridges to
  the twins through doorways in its glass; the cores' stair slots, each core a service tower standing off its block (its
  link from the gallery at each landing drawn as a bridge, a boiler house and flue on its top: brutalist plan Phase 2;
  its caged stair outside, `CAGES`, `drawCage()`, and its door's sodium lamp); the bridges (concrete, a glass band each
  side, inside a ceiling strip, mullions, puddles and tags near only; `drawPortal()` at each link's gallery end; piers
  under the long spans, `PIERS`, `drawPier()`; block names at their ends, `SIGN_TEX`); the grit (brutalist plan
  Phase 2's polish: the `brutalDeck` gallery band, `deckRow()`; boarded and burnt flats in `RECESS_LIFE`; bin bags,
  dumped mattresses, sofas and trolleys at the bin stores; bikes in the sheds; netting under the links; dishes on the
  roofs; tired and dead link lights); pipes and kit (brutalist plan Phase 4: ducts up one end and the rubbish chute
  down the other, `drawEndKit()`; air-con units, washing on the galleries, water tanks and aerials, `drawFlatKit()`,
  near only); street-level grit (Phase 5: the shops under the podium deck, `DECK_SHOPS` in southblocks.ts, The Wash House
  and Deck Stores lit with their neon and eight shuttered units, `drawShops()`; cables between the blocks, `CABLES`;
  court puddles that catch the sodium light; noticeboards by the lift doors); the lobbies (Phase 6: a hall in each
  block but The Core, `LOBBIES` in southblocks.ts, cut out of its solids, `coverWithHall()`, walked on groundheight.ts's
  `lobby` layer, its lift doors calling the block's lift, `lobbyLiftDoor()`; drawn rough by `drawLobby()`); Degen's flat (Phase 7a: `FLAT` in Kite Point's 15th floor, its rooms walked once it's
  his, southsky.ts `setFlatOpen()`, its card flat-ui.ts, drawn by `drawFlat()`; Kite's solids hollowed round it for the
  camera, `hollowAt()`); the two open shops run as places (Phase 7b: tycoon.ts places `e0` The Wash House and `e1`
  Deck Stores, `ESTATE_PLACES`; their door spots `DECK_SHOP_DOORS`; once yours, their insides seen through the glass,
  drawn from the save: southblocks.ts `DECK_LOOK` / `setDeckLook()`, set by index.ts from tycoon.ts `deckLook()`, drawn
  by southblocks3d.ts `registerDeckShops()`, near only: the washers and dryers as many as its level has, the drums
  turning, Deck Stores' shelves stocked in its goods' colours as full as they are); the glass
  and the slots dark glass by day, lit warm at night (`lit()` toons); the podium deck on its columns; Bunker Sound's door
  with its neon. Built with `lift: false` (kit.ts `Batch.build()`): they stand level on their plinths, not on the
  rolling ground. Their solids are `BLOCK_SOLIDS`, added unlifted in solids.ts. Bench views `south-blocks` and
  `south-rampart`.
- **The sky network walked** (`southsky.ts`, DOM-free, tested in `tests/southsky.test.ts`, docs/south-plan.md 2c):
  `SKY_SHAPES` (the galleries, the bridges, the podium deck, the cores' open landings, the towers' links
  (`linkShapes()`) and caged stairs (`cageShapes()`: level, flight, turn, flight, landing up each storey pair), The
  Perch's floor (`PERCH_IN`; The Core's lift names it, `liftFloorName()`), the ways through the Rampart's
  gallery fronts, The Core's stair and landing), `skyFloorAt()` (groundheight.ts's `sky` layer, before `south`),
  `skyUp()` / `skyWall()` (walk.ts's `blocked()`: up there only the railings stop you, the solids don't); the lifts
  (`SKY_LIFTS`, `skyLiftDoors()`, `liftArrival()`, `floorName()`) and their floor picker (`skylift-ui.ts`: the metro's
  card, `[data-metro]`, its words put back after; index.ts `rideTo()`). A bridge to a tower ends at its door: the towers
  aren't entered. The smoke test's `sky` and `stair` scenes.
- **The ground round the blocks** (`southyard.ts`, DOM-free, tested in `tests/southyard.test.ts`, 2d): `BAYS` and
  `YARD_CARS` (drawn by cars.ts `parkedCars()` on the main thread), `BIN_STORES`, `BIKE_SHEDS`, the play area's `FRAME`,
  `SANDPIT`, `BALL_COURT` and `courtFence()`, `YARD_TREES` (index.ts adds them at the boot, on the rolling ground),
  `DECK_PROPS` (`onDeckProp()`: southsky.ts keeps you out of them), `DECK_COLUMNS`, `YARD_SOLIDS` (solids.ts, lifted onto
  the ground). Drawn by southblocks3d.ts's `registerYard()` (sites a court, the grass, the play area, the deck's props).
- **Aldwyn's Green's terraces** (`southterraces.ts`, DOM-free, tested in `tests/southterraces.test.ts`, 3a): `HOUSES`
  (each its front's middle `at`, its `face`, frontage `w`, street, block, front, paint, door, dormer, chimney, `lit`,
  `endL` / `endR`, `base` / `low`), `houseFoot()`, `plotOf()`, `ALLEYS`, `GINNELS`, `frontWalls()`, the solids,
  `TERRACES_RECT`. Drawn by `village3d.ts` (lazy chunk `village`): `PIECES` (one house's shapes in its own frame,
  `frameOf()` stretches each to its frontage, right-handed) copied by `Batch.instances()`, built with `lift: false`; the
  yards, walls, alleys and ginnels in a lifted Batch. Bench view `village-terraces`.
- **St Aldwyn's** (`aldwyns.ts`, DOM-free, tested in `tests/aldwyns.test.ts`, 3b): `NAVE`, `CHANCEL`, `TOWER`, `PORCH`
  (rects, the nave along x), `HEIGHTS`, `SPIRE_TIP` (22.5 over `CHURCH_BASE`), `PORCH_DOOR` / `DOOR_SPOT` (its door,
  `ENDS_DOORS`), `LYCHGATE`, `CHURCH_PATH` (southterraces.ts leaves a gap for it), `GRAVES`, `YEWS`, `YARD_WALL`,
  `CHURCH_SOLIDS` (unlifted) / `CHURCHYARD_SOLIDS` (lifted). Drawn by village3d.ts (`drawChurch()`, `drawChurchyard()`).
  Bench view `village-church`.
- **The High Road's places** (`highroad.ts`, DOM-free, tested in `tests/highroad.test.ts`, 3c): `SHOPS` (each its
  kind, name, front `at`, `face`, `w`, `d`, storeys, colour, base), `KINDS`, `HEIGHT`, `shopFoot()`, `topOf()`, `doorOf()`,
  `SHOP_SOLIDS`, `HIGHROAD_RECT` (the village's chunk covers it); laid before the terraces (southterraces.ts keeps out of
  them). The big four (`brook`, `rosas`, `kestrel`, `busgarage`) are places in endsplaces.ts. Drawn by `highroad3d.ts`
  (`registerHighRoad()`, from village3d.ts): every kind in a building's own frame, the signs one atlas (`siteMat`).
- **The council rows, bungalows, allotments** (`council.ts`, DOM-free, tested in `tests/council.test.ts`, 3d): `lay()`
  (lots along a block's runs where they fit, in zones), `lotRing()`, `SEMIS`, `BUNGALOWS`, `CORNER_SHOPS`,
  `COMMUNITY_CENTRE`, `ALLOTMENTS`, `PLOTS`, `COUNCIL_SOLIDS` (unlifted), `ALLOTMENT_SOLIDS` (lifted), `COUNCIL_RECT`
  (what's laid; inside `COUNCIL_LAND`, fixed in south.ts, which the village's chunk covers: tested). **Not in the
  boot**: only the village's chunk imports it (laying it out took seconds as the page loaded), so its solids join
  there, `registerCouncil()` calling `addSolids()` on the main thread (the houses' with `lift` false, their tops
  already over their plinths), as Sunridge's houses do; tests that check against `SOLIDS` across the south add them
  (`[...SOLIDS, ...COUNCIL_SOLIDS, ...ALLOTMENT_SOLIDS]`). Drawn by `council3d.ts` (`registerCouncil()`, from village3d.ts).
- **Aldwyn's Green Rec** (`rec.ts`, DOM-free, tested in `tests/rec.test.ts`, 3e): `PITCH`, `GOALS`, `PAVILION`, `VERANDA`,
  `SKATE` and its features, `PLAYGROUND`, `BENCHES`, `GATE`, `FOOTPATH`, `BRIDGE` / `recBridgeY()` (groundheight.ts's
  `recbridge` layer), `REC_PATH`, `REC_SPAWN`, `REC_SOLIDS`, `REC_RECT`; a place (`rec`, endsplaces.ts). Drawn by
  village3d.ts (`drawRec()`, `drawRecBridge()`).
- **The rolling ground** (`southground.ts`, docs/south-plan.md Phase 1c, tested in `tests/southground.test.ts`): the
  village's hill (`HILL_H` 2.4, St Aldwyn's on top), swells in the fields, the brook's valley, today's ground wherever
  the south meets what's fixed (`freedom()`); each street on a bed (`ROAD_BEDS`, one in ten at most, level across, the
  same height where streets meet, a bridge over the brook); `southHeightAt()` exactly, `southLift()` off a cached grid.
  **Everything in the south stands on it**: kit.ts `Batch.build()` lifts what's drawn there (`setGroundLift()`, set in
  index.ts for the main thread and the site worker; faces split to `LIFT_EDGE`, but only the faces over the south's
  rect: the rest of a batch keeps its faces whole and its corners shared, so the city's ground and every batch that
  only reaches into the south aren't split and unshared whole, which had tripled the boot's work and doubled the
  geometry; the split faces share their corners too, each corner once where it's the same in every attribute, as the
  plane they came from did: the military plan's Phase 0 trim, `docs/military-plan.md`), terrain.ts reads it (cars, taxis, trees,
  cameras), groundheight.ts's `south` layer walks on it, solids.ts's `onGround()` lifts the boxes, the lamps carry their
  lifted height. Anything new drawn in the south is lifted for free; anything placed outside a Batch (a lamp, a tree, a
  pin, a pool of light, a person) adds `southLift(x, z)` itself.
- **The ground** (ground.ts): worn grass and bare patches round the estate (`ESTATE_LAND`), a worn lawn through the
  village and the rows (`VILLAGE_LAND`), the brook's banks lush. **Trees keep off** (landuse.ts `KEEPS`) the estate's
  land, the brook and the rec ground; the fields keep theirs.
- **Its places** (`endsplaces.ts`, tested in `tests/endsplaces.test.ts`): the estate (pin over the Circus), St
  Aldwyn's (over its churchyard) and Bunker Sound (its door under Teasel House's hoarded half, `southblocks.ts`
  `BUNKER`, off Endswood Road: its pin over it and a door prompt, `ENDS_DOORS`), still "coming soon"; St Aldwyn's (its
  door), the High Road's (`HIGH_ROAD_PLACES`: The Brook & Lantern, Rosa's Café, Kestrel Fuel, the bus garage) and the
  rec (its pavilion), each with its door prompt and panel; `ENDS_SPAWNS` on a sidewalk by each. The tube's five stations are places too (southline.ts `TUBE_SPOTS`).
- **Its sound** (ambience.ts `ends`): on its land and 25 past it; Bunker Sound's beat (`studio`) and St Aldwyn's bell
  (`bell`), the village's birds, the High Road's shoppers, and below ground a hush and the tube's rumble (the south
  plan's 6e: getting-about.md's sound by district).
- **Its life** (the south plan's 6c, city-life.md): people about (`southpeople.ts`), walkers round `SOUTH_WALKS`' blocks,
  its own bus route (routes.ts `busLoop()`, `SOUTH_BUS_ROUTE`) and stops (transit.ts); its crowd dressed by zone
  (crowdlook.ts `districtAt()`). **By night** (6d) its windows are lit patchily, its blocks' entrance halls warm
  (infill.ts `lobbyWarm`).
- **Below ground**: Lot 9's tunnel (groundheight.ts `UNDER`, underground.ts); the Circus's sunken plaza and its four
  subways as data (`circus.ts`, `tests/circus.test.ts`, the south plan's 4a: `PLAZA`, `SUBWAYS` north-west,
  north-east, south-east and south, `MOUTH_PATHS`, `CIRCUS_HOLE`, `CIRCUS_CUTS`, `CIRCUS_SOLIDS`), drawn by
  `circus3d.ts` (a site for the plaza, each subway and the paths, in the south's chunk) and walked (groundheight.ts
  `UNDER`, the planters and lamps its `boxes`). Its holes are cut out of the blocks' slabs (world.ts `tiled()`,
  `holedPoly()`, holes.ts) and the junctions' asphalt round the Circus (south3d.ts); the grass goes from under it
  (`CIRCUS_HOLE`); the island is a planted ring round the plaza. Its trees and lamps at the boot (index.ts). The kit
  takes a passage at any angle (`radial()`) and a well's stepped seats (`tiers`, `wellFloor()`). The underpasses under
  the avenue crossings (`underpasses.ts`, the south plan's 4c: under the wide south avenue and Endswood Road's and
  Marsh Lane's bends, `straight()` passages, plain: `underpass3d.ts`) share the Circus's cuts (`SLAB_CUTS`,
  `GROUND_HOLES`) and walking (`UNDER`). The underground's south line as data (`southline.ts`, the south plan's 4d: `LINE`,
  `SOUTH_STATIONS` with their platform, hall, escalator and way in, `LINE_PASSAGES`), drawn and walked from 4e; the kit
  has levels for it (`y0` / `y1`, `LEVEL`). The stations built (`BUILT_STATIONS`: the High Road's in 4e, all five since 4f) are walked
  (`BUILT_PASSAGES` in `UNDER`), drawn (`line3d.ts`, the south's chunk, a site each) and their stairs cut
  (`STAIR_CUTS`); the High Road's station building is highroad.ts's `station` kind (`stationWalls()`). The line's
  running tunnels between the stations are line3d.ts's `registerTunnels()` (`TUNNEL_HALF` wide enough for the cars on
  the bends). Its trains (the south plan's 4g): the rules in `southtrains.ts` (`TUBE`, the timetable `LEGS` / `ROUND`,
  `trainAt()`, `trackOf()`, `carPose()`, a ride's `rideAt()`), drawn by `tube3d.ts` (a lazy chunk, loaded and drawn
  only while you're down in a station or riding, index.ts), ridden from a **Tube** door on each platform
  (`PLAT_DOOR` along from its middle) through `tube-ui.ts` (the raised metro's card and ride bar). Since 4h that card is
  both lines' at every station (`data-trip`): a trip to the other line (`trips.ts`: `tripOf()`, `tripTime()`,
  `CHANGE_AT`) rides to The Trenches, changes under a fade and rides on; the stations are places (`TUBE_SPOTS`) and on
  the world map.
- **`?bench` views**: `south-circus`, `south-high`, `south-village`, `ends-home` (the compound from the High Road's
  end), and inside it `ends-room` (his lounge) and `ends-den` (his basement).
- **Degen's home** is the compound (`docs/home-plan.md`, `docs/ends-far-west-plan.md`): `home.ts` on `endsfar.ts`'s
  `PLOT` and `GATES` (all that file is now), its gates on Gate Lane at `HEAD`; the wall and gates, the double garage
  (`CAR_HOME`, `BIKE_HOME`, `HOME_GARAGE_DOOR`), the workshop (`HOME_WORKSHOP_DOOR`), the house with its room
  (`ROOM`, `FURNITURE`, `HOME_PORTALS`, `HOME_USES`: the wardrobe and the stash; `HOME_WAKE`, where every visit
  starts, `SOFA_SEAT`, where he sits as he wakes, `HOME_WAITS`, the ways out that wait while the street loads, and
  the room's curtains, `ROOM_WINDOWS`, `CURTAIN`, `curtainPanels()`, drawn by home3d.ts `addCurtains()`, following
  spawn.ts `curtains`: `docs/spawn-plan.md`) and its roof terrace (`ROOF_Y`,
  `TERRACE`, `ROOF_THINGS`, `onRoof()`, `roofWall()`, groundheight.ts's `homeroof` layer), drawn by `home3d.ts`
  (registered by `south3d.ts`), its windows lit at night (`LIT_GLASS`, the middle one upstairs off), pools of light
  at night by the gates' lamps, the garage and the front door (`HOME_POOLS`, drawn by `south3d.ts`). A new thing in the
  room goes in `FURNITURE` (homerooms.ts), on the terrace in `ROOF_THINGS`. **The upgrade** (the owner's call, 2026-11-18) is planned in
  `docs/compound-plan.md`: the outside done up with his neon, the ground floor refitted, an upstairs (a bedroom, an
  office with a desk), a trophy wall, a basement trading den; nothing built until its phase is signed off.
  Phase 1 (the outside) is built: black steel and his neon (home3d.ts `STEEL_BLACK`, `HIS_NEON`, his D by `mark()` on
  the gate pier's plaque and in the paving), a hoop on the garage's pier, and the yard's lit bollards and the planters
  by the front door (home.ts `BOLLARDS`, `PLANTERS`, in `HOME_SOLIDS`).
  Phase 2 (the ground floor refit) is built: the lounge, kitchen island and hall in `FURNITURE`, the open stairs, and
  the trophy wall (`hometrophies.ts`: `trophies()` from the save, the `SHELF` feed set by tycoon-boot.ts; drawn on the
  main thread by home3d.ts `trophyWall()`, added by south3d.ts).
  Phase 3 (the upstairs) is built: the house's floors by height (home.ts `homeLevel()`, `UP_Y`, `UP_CEIL`;
  `homeWall(x, z, r, y)`, `homeFloorY()` for groundheight.ts's `home` layer, `homeCamera(y)` for walk.ts), `UPSTAIRS`
  (the landing, bedroom and office), the stairs re-routed room ↔ landing ↔ terrace (`HOME_PORTALS`, each with its
  `level`), and the office's desk (`home:desk`, the business card). A new thing upstairs goes in `UPSTAIRS`.
  Phase 4 (the basement, his trading den) is built: the `base` floor (`BASE_Y`, `BASE_CEIL`), `BASEMENT`, the steps
  down from under the stairs (`home:cellar`, `home:cellarup`), drawn in the room's batch (home3d.ts `basement()`), the
  trading desk's screens on the main thread (`denCharts()`, made-up charts, nothing legible). A new thing down there
  goes in `BASEMENT`.
  Phase 5 (the terrace and polish) is built: the outdoor sofa, the telescope, his sign at the east rail, a third
  planter (`ROOF_THINGS`); `?bench` views `ends-room` and `ends-den`.
  Phase 6 (the kingpin compound, the owner's call after seeing Phase 1) is built: the loft shell in charcoal brick and
  steel (home3d.ts `house()`, `houseLights()`, home.ts `FIRE_ESCAPE`, `WALL_H` 1.8), the gatehouse and the crest gate
  (`GATEHOUSE`, `GATE_LEAF`, `wall()`, `gatehouse()`), the fountain and palms on the drive (`FOUNTAIN`, `PALMS`,
  `showpiece()`), the pool and cabana on the east lawn (`POOL`, `LOUNGERS`, `CABANA`, `poolside()`) and the helipad on
  the garage's roof (`HELIPAD`, `helipad()`, looks only). Their solids are in `HOME_SOLIDS`. The plan is complete.
  **The interior** (the owner's call, 2026-11-19) is planned in `docs/interior-plan.md`: the house fitted out to a high
  standard in a dark luxe palette (home3d.ts's colours under "The house's palette"), a phase at a time. Phase 1 (the
  lounge and the vault) is built: the media wall on the west wall (`FURNITURE` `media`, home3d.ts `media()`: the telly
  mounted over a long fire, lit niches), the corner sofa facing it with its chaise, an armchair and an arc lamp, the
  trophy wall past the media wall; he wakes facing west at it (`HOME_WAKE`, `SOFA_SEAT`). The stash is a vault door in
  the den's north wall (`BASEMENT` `vault`, `home:stash` on the `base` floor).
  The rooms' lists (`FURNITURE`, `UPSTAIRS`, `BASEMENT`) are in `homerooms.ts`, out of the boot (the owner's call): laid
  out by `houseRooms(HOUSE_GEO)` (it imports nothing, so the boot's modules aren't split), fetched as the city starts
  (index.ts), handed to `homeWall()` by `setRooms()`; waking waits for them. A new thing in a room goes there. Phase 3
  (upstairs) is built: the dressing room off the landing (the wardrobe's prompt, `WARDROBE_RECT`), the bedroom past
  it, the bathroom behind the landing (`DRESS_X`, `BED_DOOR`, `BATH_DOOR`, `BATH_Z`). Phase 2 (the kitchen and dining)
  and Phase 4 (the boot room, the laundry, the den in the palette) are built. Phase 5 (polish): his art, made-up shapes
  in his colours under brass picture lights (home3d.ts `art()`, its looks `Look`: over the bed, in the office, on the
  landing, in the den), brass wall lights by the front door (`sconce()`), reading lights on swing arms over the
  bedsides, tall plants (`potted()` draws a plant 0.9 or taller as a tall one: the lounge's front corner, the bedroom,
  the landing). They reuse the palette's colours: the house's draw calls didn't change.
  **The house rebuilt** (the owner's call, 2026-11-23) is planned in `docs/house-plan.md`. Phase 1 is live: `HOUSE`
  is 10.4 by 7.5 (it was 9 by 6.5), its back and west wall where they were, grown east and north; the front door in the
  middle of its front, the side door on its east wall. The east lawn starts `LAWN_SET` back from the house's front so
  the bollards (four by the house, five by the workshop) stand clear of the drive. The rooms are re-laid in
  `homerooms.ts` with room to breathe. Phase 2 (the turned stair, walked) is live: `STAIR` in `home.ts` (the stair
  hall in the front east corner, its two flights, the half landing, the spine, the stair's window), its floor
  `stairY()` (asked through `homeFloorY()`), its rails `stairRails()` (in `homeWall()`), the camera open over its well
  (`homeCamera()`), its foot waiting while the street loads (`STAIR_GATE`, set by index.ts with the curtains); drawn by
  home3d.ts `stair()` and `upStair()` (with the roof's steps, `ROOF_STEPS`). Nothing in the rooms' lists stands in
  its well (tests). Phase 3 (the den's and the roof's steps, walked) is built: `DEN_STEPS` and `denY()` (down through
  the den's door under the second flight, turning under the stair to the basement's floor), `ROOF_STEPS` and
  `roofStepY()` (up from the landing to a platform in the hatch, out over `HATCH_WAY`); `homeFloorY()` takes the highest
  floor he's on where they stand over one another; drawn by home3d.ts `denSteps()` and `upStair()`. The house's only
  fades are its doors out.
- **What was here before** (the estate's brutalist blocks with their decks, lifts and stair towers, the church, the
  parade, the subways and well, the common, the west rows, the far west's bungalows and allotments) was taken up for
  the re-laying, the owner's call: its plans (`docs/estate-plan.md`, `docs/ends-west-plan.md`,
  `docs/ends-far-west-plan.md`) are the history of how it was, not what stands now.
