# The Trenches

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **The Trenches** (growth plan Phase 9, the owner's call): a
  neighbourhood of projects in the style of Brooklyn on the south-west
  quadrant inside the ring highway, where the storyline will start later.
  Lived-in and lively (murals and tags with made-up names only, people on
  stoops, kids on the court; nothing threatening). Built in steps, each
  with the owner's sign-off: (1) streets, traffic and the metro (built);
  (2) the brick tower blocks (8-10 floors, under the Emporium),
  brownstones, The Block and its pin (built); (3) four corner shops for Dorras
  (20,000 / 30,000 / 45,000 / 60,000 from level 5, run like your units;
  built). **More real and more varied** (the owner's call, 2026-11-12: "the
  buildings are all the same") is planned in `docs/trenches-variety-plan.md`
  in six phases (windows, facades, rooflines, ground floors, streets and
  yards, polish), each with the owner's sign-off; keep it up to date.
  Phase 1 (the windows, city-wide: `windows.ts`, painted by infill.ts's
  `wallBand()`) and Phase 2 (the facades: five more wall materials in the
  atlas, weathering, the towers and tenements in a mix) and Phase 3 (the
  rooflines: `rooftones.ts`, roofs in tar, gravel, silver or navy,
  cornices of four kinds, the tenements 3 to 6 storeys) and Phase 4 (the
  ground floors: `shopfronts.ts`, fire escapes on about half, half-up
  shutters, recessed doorways, gates, painted ground floors) and Phase 5
  (the yards and streets: `yardbits.ts`, benches with bins, bike racks and
  planters in the yards, timber poles and their wires along the yards'
  open street edges) are built.
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
    a tile or more under; a mix of materials, red brick the most common
    (`Brick`; since the variety plan's Phase 2 orange and purple brick,
    the post-war cream glazed brick and precast panels too, bands in
    infill.ts's wall atlas);
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
    chairs and neighbours (`BOOMBOXES`); since the variety plan's Phase 5
    (`yardbits.ts`, tested in `tests/yardbits.test.ts`, drawn in each
    yard's site) benches with a bin, bike racks and planters on the bare
    concrete (`YARD_BITS`, on a `BIT_GRID` clear of `taken()`, the
    patches, trees, dumpsters and each other, a quarter turn towards the
    nearest tower's door) and timber poles just inside the yards' street
    edges (`STREET_POLES`, `POLE`, every `POLE_GAP`, sliding up to
    `POLE_SLIDE` off a taken spot, clear of what's built, `taken()` and the
    trees; a transformer on some) with three wires between neighbours on
    an edge (`POLE_WIRES`, at most `WIRE_MAX` long, never across a
    tenement or tower; near only); none of it solid; the el's pillars and spans in The
    Trenches (`EL_PILLARS`, `PLINTH`, `EL_SPANS`); `GRIT_SOLIDS` (in
    `SOLIDS`: the barriers, the dumpsters). Tags and wheatpasted bills are
    two atlases in `grime.ts` (`TAGS`, `POSTERS`: made-up names and made-up
    things on the block, nothing for sale, never a real crew, brand or
    person), laid on near only in the FX layer: on the dumpsters, the
    barriers' slopes, the shutters, boarded windows, backboards, the skate
    ramps and the el's pillars. The streets are worn too (`trenches3d.ts`:
    patched asphalt inside the lanes, never across a line, cracks,
    manholes). The lamps there are sodium orange (`lampKind()` in
    trenches.ts, mixed with the town's white for a block at its edges by
    `lampTone()` in lampmix.ts, `buildLamps()` in world.ts: about one in ten flickering,
    in two sets going out together through `flickerTogether()` in kit.ts,
    the odd one dead). The el over Trench Avenue is dark steel
    (`metro3d.ts`, on through Southbank Docks too, `grim()`: a grimy deck, deep plate girders braced across, flanged
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
    street walls (`TENEMENTS`: 3-6 storey tenements, no two neighbours alike, the kits' shops with
    `escape` (a fire escape up the front or not, shopfronts.ts `escapeAt()`), `shopfront`, `paint` and `wall` (their
    brick), Infill fields infill.ts honours; made-up names `TRENCH_SIGNS`
    (CLUCK HOUSE, GLOSS NAILS, HERO DELI, CELL FIX, KING'S CUTS, LUCKY 7
    PHARMACY and the rest added to `SIGNS`; each tenement's picked from
    where it stands by `signAt()`, never one a neighbour within
    `NAME_CLEAR` carries: the polish plan's Phase 2)) laid
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
    "Enter ..."; since the polish plan's Phase 7 the club's door turns you
    away with the bouncer's word as a toast (livelines.ts `bouncerLine()`,
    in turn by the minute, the set after dark; its panel is the pin's, with
    the set tonight as its live line) and the bar's door sells the snack
    ("Rusty Nail · Snack": `SNACK_BARS` in inventory.ts, its panel the
    pin's; the queue behind the velvet rope shuffles on the crowd's `wait`
    act); Trench Arms' hatch
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
    and the corner shops (`STRIPS`), service yards between (`YARD_Z`;
    dressed since the polish plan's Phase 7: `serviceyards.ts`, DOM-free,
    tested in `tests/serviceyards.test.ts`: `YARDS`, a yard a block with
    wheelie bins, a caged wall lamp over them and a stack of pallets
    against the brownstones' backs, crates by the landmark's lot line and a
    white box van across the two deeper yards (the Pier House's and the
    club's, through `parkedCars()`), everything clear of the rows' alleys'
    way through, solid in `YARD_SOLIDS` (in `SOLIDS`); drawn near only by
    riverside3d.ts's `buildRiverside(low, scene)`, the lamps' pools placed
    at the boot):
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
    since the river was widened again every lane runs its whole length,
    following its curves (`boatZ()`, river.ts `laneAt()`), and a lane
    coming near the pier's head or the market's deck swings north round it.
    Drawn by
    `waterfront3d.ts`: the boardwalk in sites a tile long and the docks a
    site (`buildWaterfront()`), and Pier 7 with the Pier House a place at
    the boot (`buildPier()`: spot `pier`, its pin over the arch, panel
    `data-panel-tpl="pier"` with Walk in to `PIER_SPAWN`, a `PLACES` entry;
    the clock's hands keep the visitor's time). On the world map the decks
    are drawn in wood.
  - **The Night Market** (the owner's call, the waterfront plan's first
    next step; scenery but for the cart, yours to run since the polish
    plan's Phase 10, below) is `nightmarket.ts`
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
  - **The Night Market's stall** (the polish plan's Phase 10, the owner's
    call: "stalls to run"): the cart at the end of the row (`MY_STALL`,
    `MY_STALL_NAME`, `MY_STALL_DOOR` in nightmarket.ts) is a place in the
    economy like a corner shop: tycoon.ts's place `m0` (`NIGHT_PLACE`,
    `NightId` in `PlaceId`), `night` in the save (v14; older saves don't own
    it), `buyNightStall()` / `nightPrice()` (`NIGHT_PRICE` 25,000 from
    `NIGHT_LEVEL` 4, ledger `property`), always a food stall (`NIGHT_STALL`:
    3 shelves of 40, a quicker pace than a corner shop's; `kindAt()` reads
    `'night'`), levels 1-3 (`NIGHT_LEVEL_COSTS` in catalog.ts), a clerk,
    couriers, the car's deliveries with the bonus; it trades **after dusk
    only**, 18:00 to 02:00 by the visitor's clock (`NIGHT_HOURS`,
    `nightOpen()`; `advance()` scales its sales by `nightShare()`, the share
    of the time since the last tick it was open). On screen: the business
    card's Units tab has its chip after the corner shops (`nightView()`), the
    Vault's estate agent lists it, the market hall and the Post office take
    it, walk mode prompts at the cart's counter ("Sweets cart · For sale").
    Drawn from the save by nightmarket3d.ts (`buildNightMarket().show()`,
    rebuilt only when what it shows changes; index.ts's `stock` hook calls
    it): for sale with a FOR SALE board on its front and the umbrella furled;
    yours with its name, the umbrella up, your goods in tubs on the lid,
    stars by the sign for its level, a neon trim at level 2. Its cook and
    queue are the crowd's as before.
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
