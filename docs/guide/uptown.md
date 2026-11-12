# Uptown and Uptown North

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Uptown, the financial centre** (the owner's call): Westlake Park's three
  strips (x -200.5 to -43.3, z 0 to 60, the north bank avenue along the
  river) becoming a waterfront boulevard and financial centre with
  skyscrapers and a plaza, planned in `docs/finance-plan.md` in seven
  phases, each with the owner's sign-off; keep it up to date. Its name is
  **Uptown**. Its towers may rise above the Emporium (the owner's call: the
  spire about 40 tiles since the redesign, the rest 14 to 32; the Sky Wheel
  about 22; the Emporium
  stays the tallest downtown and the most detailed, and "under the
  Emporium" holds everywhere else but Uptown North, below, Southbank
  Docks' cranes, the Neon Mile's resorts and City Hall's tower); the flying traffic and your own
  aircraft clear them. The strips' courts and their players are retired
  with it. Phases 1 (the land and the streets), 2 (the towers), 3 (the
  plaza), 4 (the waterfront boulevard), 5 (the redesign, the owner's call:
  slim towers, a varied street plan with real-world features, the
  kerbside), 6 (night, life and the place: Sector 7 Tower and its sky
  deck, below) and 7 (street level, more city, landmarks and the metro,
  the owner's picks: scenery only but the metro's station; below) are
  built:
  - `uptown.ts` (DOM-free, tested in `tests/uptown.test.ts`): its streets
    (`UPTOWN_STREETS`, in the street plan; Phase 5, the owner's picks):
    **Uptown Circle** (`CIRCLE`, a roundabout: a one-way loop, `loop` and
    `oneway` in the plan, its traffic giving way at unlit crossings) on the
    circle's street (x -176) with **Circle Street** (`circle-e`) east from
    it to the plaza's middle (the cross at the end of its vista); **the
    one-way pair** (`COUPLET`: x -150 northbound, x -112 southbound, in line
    with The Trenches' cross streets, a bike lane each, `BIKE`); **the
    diagonal** (`DIAG`, from the ring avenue at the pair's southbound street
    to the south cross street at the east street, `EAST_X`; three light
    phases where it comes in, `three` in routes.ts); **the crescent**
    (`CRESCENT`, `crescentX()`, bowing east between the east street and the
    Parkway); the diagonal and Circle Street carry a planted median
    (`STREET_MEDIAN`: `median` on a plan street, its lanes either side),
    every other junction lit (`UPTOWN_CROSSINGS`, `crossingsOn()`). The
    blocks (`UPTOWN_BLOCKS`, ref `uptown` in the street plan) are polygons
    in rows n, m and s, cut round the circle, along the diagonal (a pocket
    park, the flatiron's wedge) and the crescent, each with its `use`
    (towers, the plaza, the park, the circle's island), the plaza's on the
    middle row (`PLAZA_BLOCK`, use `plaza`); **lay-bys** (`LAYBYS`,
    `laybyRect()`: parking, the taxi rank, valets, loading) cut into the
    blocks off the kerb, the sidewalk round behind them; the
    Mall's axis carried on south from its gate (`AXIS_X`): walk-only lanes
    through the blocks either side of the plaza (`UPTOWN_LANES`, alleys in
    the plan) and zebras over the avenues and cross streets
    (`AXIS_ZEBRAS`; the avenues' medians and lines break there,
    `highwayGaps()` in world.ts); lamps
    along its avenues and cross streets (`UPTOWN_LAMPS`); the boulevard's
    line (`BOULEVARD_X`: the north bank from Uptown's west edge to the
    town's promenade, the esplanade's); `UPTOWN_RECT` / `inUptown()`.
  - Its streets are drawn at the boot by `streets3d.ts` (`drawUptown()`:
    asphalt along any line, the circle's ring, planted medians, centre
    lines, zebras on every arm of every lit junction, the lay-bys' asphalt,
    lamps along them and round the circle; clean: no wear), its lots paved
    (world.ts), and the rest is a district loaded as you approach from
    well out (`uptown3d.ts`, `LAZY_DISTRICTS` id `uptown`, its land
    widened by `UPTOWN_REACH`: the skyline is seen from across town): the
    lanes' paving, the towers, the plaza, the boulevard and the kerbside.
  - **The kerbside** (Phase 5) is `kerbside.ts` (DOM-free, tested in
    `tests/kerbside.test.ts`; in the boot: what's solid) and
    `kerbside3d.ts` (Uptown's chunk): the cars in the lay-bys
    (`LAYBY_CARS`: parked the traffic's way, the rank's Cruisers in taxi
    yellow, the valets' Midnight Execs and coupes, a box van at the loading
    bay; `parkedCars()` on the main thread), the **porte-cochères** over the
    lobbies behind the valets' bays (a glass roof on steel posts, lit along
    its edge, a VALET stand), the **service alleys** between towers side by
    side (`SERVICE_ALLEYS`: two bollards at each mouth, a walker passes and
    no car, `ALLEY_DUMPSTERS`, roll-up doors with lamps), **the monument**
    on the circle's island (`MONUMENT`: a granite plinth and column, a
    gilded globe; made up), and the paint and signs (one small atlas each,
    fixed copy): the pair's bike lanes, arrows and ONE WAY signs, give-way
    teeth and yield signs round the circle and arrows round it, the bank
    avenue's red bus lanes with BUS, turn arrows in the avenues' lanes
    coming up to Uptown's junctions, TAXI and LOADING in their bays.
    `KERBSIDE_SOLIDS` (in `SOLIDS`). The avenues' medians and lines break
    as far as a slanting street's asphalt reaches (`highwayGaps()`).
  - **The towers** (Phase 2) are `highrise.ts` (DOM-free, tested in
    `tests/highrise.test.ts`): six designs (`Design`, `design()`: a glass
    slab with its plant room set back, a stepped deco tower in stone and
    gold, a round glass drum, twin towers with a skybridge, the spire, and
    `flatiron()`: a stone wedge filling the diagonal's sharp corner, its
    prow blunt, `PROW`), slim since Phase 5 (the owner's call: shafts 5 to
    10 across, at least 2.5 times as tall as wide, two or three to a block
    on their own lots, 29 in all; `HIGHRISES`), laid by hand: the spire in
    the plaza's block the tallest (`TALLEST`: roof 40, mast 45;
    `SPIRE_LOT`, 12 across, no podium), the rest 16 to 32 on podiums
    (`PODIUM`; the river row's shafts at the back of theirs, `back` and
    `depth`, the front of the roof a restaurant terrace), each its skin
    (`Skin`: blue, gold, black or silver glass, or deco stone) and front
    (its lobby's `door`); parts (`Part`: box, drum, octagon or prism, its
    outline `poly`) bottom up, each tier on the one below and inside it;
    `HIGHRISE_SOLIDS` (in
    `SOLIDS`) in strips no wider than `STRIP` (`partStrips()`: a car put
    out of one is pushed only a little, inside the collision grid's
    reach). They're drawn by `highrise3d.ts` (a site a tower): walls from
    Uptown's own curtain-wall atlas (`ATLAS` there, `uptown-glass`: the
    four glasses and the deco stone a floor to a row, windows lit at night
    from its light map; the podium's lobby), stacked so a band never wraps
    and in pieces no longer than `SPAN`; roofs and parapets on every tier;
    the crowns (a slab's lit band, the deco's gold edges and pyramid, the
    drum's neon ring and cap, the twins' skybridge, the spire's lantern);
    a mast and a red warning light on every tip (the helipad's tower: red
    lights at its deck's corners instead). **The lobbies** (the
    owner's call: "more realistic ... not a plinth"; `Lobby`, `lobby` on
    each tower): a glass atrium with the lobby inside (pendants, a desk,
    plants, people on the atlas's light map), a glass vestibule, a glass
    canopy and flags; a colonnade (deco towers) or an arcade (drums), the
    ground floor set back `GROUND.recess` behind square stone columns with
    gold capitals or round ones (`columns`, solid; `foot` on the podium is
    what's solid under the storey over it, so you walk under it), bronze
    doors, a lit soffit, lanterns; retail (shopfronts from the atlas either
    side of a narrow lobby door, awnings and names from `SHOP_NAMES`, made
    up), the flatiron's shops all round its foot, and the spire's glass
    pavilion. A podium's sides are shops or glass, its back a service wall
    (louvres, a steel door). **Facades** vary by tower (`facade()`): fins
    down the glass, ledges every four floors, or corner piers; the tallest
    slab carries the executive helicopter's helipad (`ROOF_PAD`: a steel
    deck on legs over its plant room, its mast left off for it). Planters
    by every door (near). The airliners' westbound leg crosses Uptown at 53
    to 55 (airfield.ts), and the flight tests keep every aircraft well over
    every tip (but the executive helicopter straight over its helipad).
  - **At night** (Phase 6, the owner's pick: lived-in office lights) is
    `skyline.ts` (DOM-free, tested in `tests/skyline.test.ts`): the curtain
    walls' light map switched in sections a few bays wide and a floor high
    (`OFFICE`, `officeHash()`, the same sum in the uptown-glass material's
    shader, `OFFICE_GLSL`), each on while its number is under the hour's
    share (`officeShare()`: all on by day and in the evening, thinning
    after ten, about three in ten through the small hours); the skins'
    bands only, so lobbies and shops stay lit; the hour comes on Uptown's
    tick. Crowns in white and gold (`TRIM` in highrise3d.ts) with a neon
    accent each (`ACCENTS`), and the warning lights one material of their
    own flashing together (`beaconOn()`).
  - **Sector 7 Tower** (Phase 6, the owner's name for the spire) is
    `skydeck.ts` (DOM-free, tested in `tests/skydeck.test.ts`) and
    `tower3d.ts`: a place (spot `tower`, its pin over the mast, directory
    entry, panel `data-panel-tpl="tower"` with Walk in to `TOWER_SPAWN`,
    `PLACES` and `LIVE_PLACES` entries) whose spot is only the spire's
    tiers as plain shapes on the `PICK` layer (kit.ts: never drawn; the City
    view's raycaster looks for them) and its hover ring, the tower being a
    site in Uptown's chunk. **The lift** (`LIFT`): a door in the glass
    pavilion at its foot and one at the lift house on the deck, walk
    prompts ("Lift · Sky deck", "Lift · Lobby", walk `places` entries
    `lift:up` / `lift:down`), a fade (`ride()` in index.ts) and
    `walk.placeAt()` with the deck's height; a closed tower keeps it shut.
    **The sky deck** (`DECK`, on the spire's roof): walkable inside its rail
    (`skyDeckY()` in walk.ts's `groundAt()`, `skyDeckWall()` in `blocked()`:
    you can't step or fall off), a glass rail at chest height, the glazed
    lift house in the middle (`CORE`, `SKYDECK_SOLIDS` in `SOLIDS`), the
    crown's steel ribs leaning in to a lit ring round the mast (`RIBS`, over
    a walker's head) and four viewers (`VIEWERS`); drawn by highrise3d.ts
    with the spire (`skyDeck()`).
  - **The street wall** (Phase 7) is highrise.ts's: most towers stand on a
    mid-rise masonry base (`base`: 6 to 12 high, limestone, brick or
    granite, `Masonry`, its band in Uptown's atlas), the shaft rising from
    its roof; the river row, the spire and the flatiron as they were. A base
    side can be an arcade (`arcades`: the ground floor set back behind
    columns, Circle Street's), and the tallest have **grand lobbies**
    (`lobby: 'grand'`: a double-height stone portal, revolving doors).
  - **Street level** (Phase 7) is `streetlevel.ts` (DOM-free, tested in
    `tests/streetlevel.test.ts`; in the boot: its solids and people) and
    `streetlevel3d.ts` (Uptown's chunk): each base side facing a street
    takes its character (`characterOf()`, `frontage()`: `luxe` the avenues,
    `dining` the cross streets, Circle Street, the diagonal and the lanes,
    `local` the one-way pair, the east street, the crescent and the
    circle's street, `service` the rest), shop units `UNIT` wide with
    made-up names (`SHOP_NAMES`, 24 a character, `nameAlong()` picking a
    wall's own run so no two units on a side match; one sign atlas a
    character, drawn by
    highrise3d.ts's `shopfront()`), the margins' dressing by character
    (`DRESSING`: café tables and umbrellas, menu boards, planters, a
    florist's buckets, crates, newspaper boxes, bike racks), a sculpture by
    each grand lobby (`SCULPTURES`), the galleria over the axis's lanes
    (`GALLERIAS`: a glass barrel on slim columns), diners and doormen
    (`STREET_PEOPLE`), `STREETLEVEL_SOLIDS` (in `SOLIDS`).
  - **The free land** (Phase 7) is `uptownsites.ts` (DOM-free, tested in
    `tests/uptownsites.test.ts`) and `uptownsites3d.ts` (Uptown's chunk):
    the **Circle Theatre** on the circle's west land (`THEATRE`: its front
    curved round the circle, a marquee with chasing bulbs (`MARQUEE`, three
    materials lit in turn), posters for made-up films (`FILMS`), a fly
    tower, a CIRCLE blade); **the Exchange** east of the diagonal facing the
    park (`EXCHANGE`: steps, a portico and pediment, a ticker of fixed
    made-up words, never a number, `TICKER_WORDS`, its texture scrolled);
    **The Aurelian** hotel west of the diagonal (`HOTEL`, `HOTEL_NAME`: a
    porte-cochère, a HOTEL blade, its name on the roof, a pool deck with
    loungers and a glass penthouse); **a tower going up** (`WORKS`:
    hoardings with made-up developer copy, `HOARDING_COPY`, floors round a
    concrete core, the crane's jib turning on the main thread); **pocket
    gardens** by the circle (`GARDENS`, their trees and fountains);
    `SITE_RECTS`, `UPTOWN_SITE_SOLIDS` (in `SOLIDS`), `SITE_PEOPLE`. None of
    them is a place.
  - **Street life** (Phase 7) is `streetlife.ts` (DOM-free, tested in
    `tests/streetlife.test.ts`) and `streetlife3d.ts` (Uptown's chunk): big
    LED screens on the bases along the north cross street and round the
    plaza (`SCREENS`, slides of fixed made-up words, `SLIDES`, stepping on
    together every `SLIDE_SECONDS`), neon blades on the restaurant fronts
    (`BLADES`, `BLADE_WORDS`), and a cart in each margin deep enough (`CARTS`:
    coffee, hot dogs, flowers, a newsstand, in turn, clear of the dressing,
    the doors and everything solid, the sidewalk left clear) with their
    vendors and customers (`STREETLIFE_PEOPLE`); `STREETLIFE_SOLIDS`.
  - **The Sky Wheel** (Phase 7) is `wheel.ts` (DOM-free, tested in
    `tests/wheel.test.ts`) and `wheel3d.ts` (Uptown's chunk): an
    observation wheel on the esplanade by the water between the axis's
    overlook and the one-way pair's crossing, its rim along the river on
    two A-frames, capsules hanging level (`capsuleAt()`, `wheelAngle()`: a
    function of the clock, a turn every `WHEEL.period`, the same for
    everyone, so it stands where it should under reduced motion, still), lit
    at night; the walk and the joggers pass on its avenue side
    (`WALK_PAST`); the ticket booth by the kerb; `WHEEL_RECT` (the
    boulevard's trees, benches and lamps keep off), `WHEEL_SOLIDS`; well
    under what flies over (the test).
  - **Its life** (Phase 6) is `uptownlife.ts` (DOM-free, tested in
    `tests/uptownlife.test.ts`): walkers round the blocks by the plaza and
    the diagonal (`UPTOWN_WALKS`, life.ts), joggers out and back along the
    esplanade (`JOG`), cyclists in the one-way pair's bike lanes the way each
    street runs (`CYCLISTS`, `cyclistAt()`; the riders the crowd's, kind
    `park` with the park's people; their bikes `uptownlife3d.ts`, one
    instanced mesh on Uptown's tick); its sound in ambience.ts (a quieter
    hum, `UPTOWN_HUSH`; the plaza's `fountain`; the circle's traffic); and
    the executive helicopter (below, under the airport).
  - **The plaza** (Phase 3) is `plaza.ts` (DOM-free, tested in
    `tests/plaza.test.ts`; in the boot: its solids, trees, lamps and
    people) and `plazadress.ts` (what only the drawing needs: the
    canopies, the kiosks' names, the LED ribbon; Uptown's chunk): the
    plaza's block round the spire and the slivers west of the axis's lanes
    as café terraces (`TERRACES`). Where the Mall's axis meets the line
    from Uptown Circle down Circle Street to the spire's lobby (`CENTRE`)
    stands **the cross** (the owner's pick): gold, on a stepped stone
    plinth in a round pool (`CROSS`, `POOL`), its arms across the axis,
    glowing softly at night as if floodlit, the tallest thing in the plaza
    and under the spire's roof. A stepped water wall along the forecourt's
    west side (`WATER_WALL`, `WALL_RUNS`), open at the way in from the
    street (`GAP`); lit glass canopies over the lunch tables along the
    north and south edges (`CANOPIES`, `POSTS`, `TABLES`) with string
    lights between them; trees in grates (`TREES`), benches facing the
    pool (`BENCHES`), lamps (`LAMPS`), planters by the spire (`PLANTERS`);
    on each terrace a café kiosk (`KIOSKS`, `KIOSK_NAMES`: MARBLE CAFÉ,
    SKYLINE DELI, made up) with tables under umbrellas; an LED ribbon round
    the podium across the east street (`RIBBON`, `RIBBON_WORDS`: fixed made-up
    words, never a number); people at lunch (`PLAZA_PEOPLE`: at the tables,
    on the benches, chatting, looking up at the cross, queueing; half on
    phones); `PLAZA_SOLIDS` (in `SOLIDS`: the pool in boxes with their
    corners on its rim, the cross, the water wall, the planters, the
    kiosks). Drawn by `plaza3d.ts` (sites: granite paving from one small
    texture with darker inlays along both axes and round the pool; the
    pool, its jets and the cross, which takes no shadows (the shadow map
    would stripe its gold); the water wall's falls a streaked texture its
    tick scrolls, the ribbon's words another; the kiosks' names one small
    atlas). The hoardings came down with it.
  - **The waterfront boulevard** (Phase 4) is `boulevard.ts` (DOM-free,
    tested in `tests/boulevard.test.ts`; in the boot: the decks, the
    boats' limit, trees, lamps, people, the terraces) and
    `boulevarddress.ts` (the yachts, the planted median, the terraces'
    names; Uptown's chunk): the esplanade (`ESPLANADE`: the north bank from
    Uptown's west edge to the town's promenade, from the bank avenue's kerb
    out `OUT` over the water, at the boardwalk's `DECK_Y`; a double row of
    trees in planters, `LAND_TREES` / `WATER_TREES`, lamps at the water's
    edge, `EDGE_LAMPS`, benches facing the river, `BENCH_XS`), the
    overlooks (`OVERLOOKS`: the axis's, with flagpoles, and one in line
    with the east street), the marina (`PONTOON`, `GANGWAYS`; `YACHTS`, a
    new boat model, and `TENDERS`); walking: `ESPLANADE_DECKS`,
    `onEsplanade()` in walk.ts beside the boardwalk's `onDeck()`, nothing
    on it solid. Since the river was widened again the north lane passes
    outside every deck and yacht (the tests hold 0.8 clear). Restaurant terraces on the river row's podium
    roofs in front of the shafts (`ROOF_TERRACES`, their
    tables; `TERRACE_NAMES`, made up; the podiums' rooftop plant keeps off
    them); a planted median along the bank avenue (`MEDIAN_RUNS`,
    `MEDIAN_TREES`, `HEDGE`: a clipped hedge and columnar trees, well short
    of the junctions and the axis's zebra); people (`BOULEVARD_PEOPLE`:
    benches, rails, the pontoon, the terraces; half on phones). It
    replaces the stretch of the town's promenade that Phase 1 carried west.
    Drawn by `boulevard3d.ts` (sites: the esplanade in stretches with the
    plaza's granite (`granite`, `quad()`, `bench()`, `table()` are
    plaza3d.ts's), a glass rail broken at the overlooks' and gangways'
    mouths, piles; the overlooks; the marina and its yachts; the median a
    run a site; each terrace a site, its name from one small atlas). The
    valets' bays came in Phase 5 (the kerbside, above).
- **Uptown North** (the owner's call: Palm Court moved across the east ring
  avenue and "more large skyscrapers that match Uptown's" on its old land;
  scenery only) is `uptownnorth.ts` (DOM-free, tested in
  `tests/uptownnorth.test.ts`): the block between Westlake Park's east
  sidewalk and the north avenue (ns0), from the highway's slip lanes to the
  Parkway (`NORTH_RECT`, `NORTH_BLOCK`, id `uptown-north`, ref `uptown` in
  the street plan: paved), two columns of lots (`WEST_COL`, `EAST_COL`)
  either side of a service way (`SERVICE_WAY`), the park's two east gates
  carried through to the avenue (`GATE_WALKS`) and the square at its heart
  (`NORTH_SQUARE`: a round pool with a twisting steel sculpture, `POOL`,
  trees in grates, `SQUARE_TREES` / `NORTH_TREES`, benches facing it,
  `SQUARE_BENCHES`, lamps, `NORTH_LAMPS`, people, `NORTH_PEOPLE`), where
  the zebra over the avenue to the mall's forecourt lands (`TOWER_ZEBRA` in
  mall.ts); `NORTH_SOLIDS` (in `SOLIDS`: the pool). Its seven towers are
  highrise.ts's (`un-*` in `HIGHRISES`, block `uptown-north`, 22 to 31, a
  twin, round, slab and deco mix on masonry bases; the west column's lobbies
  on the park, the east column's on the avenue; `TOWER_BLOCKS` is every
  block towers stand on), drawn with Uptown's in its chunk (it loads from
  well out anyway); streetlevel.ts gives their sides on the square and the
  gates' walks dining (`NORTH_OPEN`) and the north avenue luxe. The square
  and the walks' granite are `uptownnorth3d.ts` (`registerNorth()`, from
  uptown3d.ts). The flying traffic clears them (the highrise test).
