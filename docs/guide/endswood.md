# Endswood Estate and the south of The Trenches

Part of the project guide (`CLAUDE.md` is its index); keep it up to date when what it describes changes.

- **The south re-laid** (the owner's calls, 2026-11-14, `docs/south-plan.md`): Endswood, "the Ends", and the land
  round it are being rebuilt as one place that grew: an old village (Aldwyn's Green) on winding lanes with the estate
  dropped into part of it, tall along the ring road, low to the hedged fields, the Circus the heart, Lot 9 shrunk to
  the south-east. Built a phase at a time with the owner's sign-off. **Phase 1b is built: the streets are in and the
  old estate is taken up.** What stands on the blocks comes back in Phases 2 (the blocks: the Wall, the twin towers,
  the stairwell blocks, the sky network) and 3 (the village's terraces, the High Road's places, St Aldwyn's).
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
  - **The closes and crescents**, grown off them (seeded, the same every time: crescents first, then closes), every
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
- **The blocks** (`southblocks.ts`, DOM-free, tested in `tests/southblocks.test.ts`, docs/south-plan.md Phase 2): drawn
  by `southblocks3d.ts` (2b; `LAZY_DISTRICTS` id `south-blocks`, `BLOCKS_RECT`), walked on in 2c. `BLOCKS` (the Rampart, Harrier and Kite Points, The Core, Linnet, Marten
  and Wren Courts, Sorrel, Fennel and Teasel Houses: each its footprint, spine, depth, galleried side, steps of storeys,
  base, accent; the Rampart's `arch`, Teasel's `refit`), `CORES` (the stair cores), `GALLERIES` (every third floor,
  `SKY_FLOORS`), `BRIDGES` and `DECKS` (the sky network), `COURTS`, `GRASS`, `DESIRE_LINES`, `PLAY`, `BUNKER` (Bunker
  Sound's door), `BLOCK_SOLIDS` (strips over each footprint, `cover()`; not in solids.ts until they're drawn). Heights
  by `floorY()` / `roofY()` / `topOf()`: a storey 1, the ground floor `GROUND_H` 1.4. The slabs round the Circus follow
  their streets (`alongStreet()`: the street moved off to its side); a block's base is its slab over the highest ground
  under it. `stepShape()` gives each step's outline with its edges tagged (its sides, rounded corners, ends, the cuts
  where steps meet; `outward()` their normals), which is what's drawn.
- **The blocks drawn** (`southblocks3d.ts`, sites a step, a tower, a core, a bridge span, the deck): the wall atlas's
  `panel` band (precast panels, ribbon windows lit at night) over a glazed ground floor (`lobby` band and an accent
  fascia) on the galleried side and the ends, concrete on the other; the taller step's wall where steps meet; roofs and
  parapets; the Rampart's arch (soffit, piers' faces); galleries at every third floor (deck, accent upstand, warm strip
  light under it); balconies with accent fronts on the slabs' other sides, Teasel's boarded windows and hoarding, sky
  garden planters on the roofs (near only, not on phones); the towers' ledge rings, flared plant room and beacon; the
  cores' lit stair slots; the bridges (concrete, a glass band each side lit warm at night, a strip light under); the
  podium deck on its columns; Bunker Sound's door with its neon. Built with `lift: false` (kit.ts `Batch.build()`):
  they stand level on their plinths, not on the rolling ground. Their solids are `BLOCK_SOLIDS`, added unlifted in
  solids.ts. Bench views `south-blocks` and `south-rampart`.
- **The sky network walked** (`southsky.ts`, DOM-free, tested in `tests/southsky.test.ts`, docs/south-plan.md 2c):
  `SKY_SHAPES` (the galleries, the bridges, the podium deck, the cores' open landings, the ways through the Rampart's
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
  geometry), terrain.ts reads it (cars, taxis, trees,
  cameras), groundheight.ts's `south` layer walks on it, solids.ts's `onGround()` lifts the boxes, the lamps carry their
  lifted height. Anything new drawn in the south is lifted for free; anything placed outside a Batch (a lamp, a tree, a
  pin, a pool of light, a person) adds `southLift(x, z)` itself.
- **The ground** (ground.ts): worn grass and bare patches round the estate (`ESTATE_LAND`), a worn lawn through the
  village and the rows (`VILLAGE_LAND`), the brook's banks lush. **Trees keep off** (landuse.ts `KEEPS`) the estate's
  land, the brook and the rec ground; the fields keep theirs.
- **Its places** (`endsplaces.ts`, tested in `tests/endsplaces.test.ts`): the estate (pin over the Circus), St
  Aldwyn's (over its churchyard) and Bunker Sound (its door under Teasel House's hoarded half, `southblocks.ts`
  `BUNKER`, off Endswood Road: its pin over it and a door prompt, `ENDS_DOORS`), still "coming soon"; the others' doors
  when their buildings stand (the owner's call); `ENDS_SPAWNS` on a sidewalk by each.
- **Its sound** (ambience.ts `ends`): on its land and 25 past it. Bunker Sound's beat and St Aldwyn's bell are off
  until their buildings come back (`studio`, `bell` are 0).
- **Below ground**: Lot 9's tunnel only (groundheight.ts `UNDER`, underground.ts); the Circus's well and its subways
  are Phase 4's.
- **`?bench` views**: `south-circus`, `south-high`, `south-village`, and `ends-home` (the compound from the High Road's
  end).
- **Degen's home** is the compound (`docs/home-plan.md`, `docs/ends-far-west-plan.md`): `home.ts` on `endsfar.ts`'s
  `PLOT` and `GATES` (all that file is now), its gates on Gate Lane at `HEAD`; the wall and gates, the double garage
  (`CAR_HOME`, `BIKE_HOME`, `HOME_GARAGE_DOOR`), the workshop (`HOME_WORKSHOP_DOOR`), the house with its room
  (`ROOM`, `FURNITURE`, `HOME_PORTALS`, `HOME_USES`: the wardrobe and the stash) and its roof terrace (`ROOF_Y`,
  `TERRACE`, `ROOF_THINGS`, `onRoof()`, `roofWall()`, groundheight.ts's `homeroof` layer), drawn by `home3d.ts`
  (registered by `south3d.ts`), its windows lit at night (`LIT_GLASS`, the middle one upstairs off), pools of light
  at night by the gates' lamps, the garage and the front door (`HOME_POOLS`, drawn by `south3d.ts`). A new thing in the
  room goes in `FURNITURE`, on the terrace in `ROOF_THINGS`.
- **What was here before** (the estate's brutalist blocks with their decks, lifts and stair towers, the church, the
  parade, the subways and well, the common, the west rows, the far west's bungalows and allotments) was taken up for
  the re-laying, the owner's call: its plans (`docs/estate-plan.md`, `docs/ends-west-plan.md`,
  `docs/ends-far-west-plan.md`) are the history of how it was, not what stands now.
