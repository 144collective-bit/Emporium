# Uptown, the financial centre (the owner's call)

The owner wants the land of Westlake Park's three strips turned into a
waterfront boulevard and financial centre: skyscrapers, a plaza, the
city's wealth on show. Built in six phases, each a PR for the owner's
sign-off (the redesign, the owner's call after Phase 4, became Phase 5;
the night, the life and the place moved to Phase 6). Keep this plan up to
date as each phase lands.

## The site today

- **The land:** Westlake Park's three strips (`STRIPS` in `westlake.ts`),
  from x -200.5 (clear of the ring highway's slip lanes) to x -43.3 (the
  Parkway's west leg), about 280 m end to end.
- **The strips:** each runs east to west between the avenues west of town:
  - s0, z 0 to 14.5 (14.5 deep), between the west ring avenue (z -4.5) and
    the cross street at z 17;
  - s1, z 19.5 to 40.5 (21 deep), between the cross streets at z 17 and 43;
  - s2, z 45.5 to 60 (14.5 deep), between the cross street at z 43 and the
    north bank avenue (z 64.5).
- **The river:** the north bank avenue runs along it, and the river itself
  is z 71 to 86. The town's promenade (`PROMENADE` in `outer.ts`) stops at
  the Parkway, so this stretch of the bank has none.
- **On it now:** park life step 3's courts (tennis on s0, football on s1,
  basketball on s2, with their players), a walk down each strip, rows of
  trees, lamps and benches. Westlake Park's big block north of the ring
  avenue (the lake, the garden, the boathouse, the gates) is not part of
  this and stays as it is.
- **Next door:** Liberty Bridge (x -23.5) is just east, past the Parkway.
  The ring highway is west.

## What it keeps to

- **Content:** made-up names only. No real bank, firm, exchange or brand,
  and no copies of real landmarks or sculptures.
  - No token, no prices, no tickers with numbers or anything that reads as
    one, no financial talk or advice.
  - Signs are fixed copy from atlases, as everywhere else.
  - Dorras stay the game's money only.
- **The city's rules:**
  - The district is sites (`site()`) and a lazy district (`LAZY_DISTRICTS`),
    loaded as you approach.
  - Fine detail is near only, with far forms for the towers.
  - Phones get the lighter tier.
  - New rules and data go in DOM-free files with tests, and the tests pass
    at both world sizes.
  - Nothing that exists moves unless the owner says so: the snapshot is
    rewritten only for what the owner moves (the courts).
- **The budget:** the boot's code is at 652.5 of 654 KB (raised from 640
  on purpose in Phase 3: the plaza's solids, trees, lamps and people must be
  there at the boot; and from 642 in Phase 5: the redesign's street plan,
  slim towers, kerbside solids, its streets' drawing and the traffic's
  routes round them, baked). Everything drawn
  goes in the district's own chunk; what the boot must hold (solids,
  places, the street plan's blocks) is kept small. The towers' far forms
  are made from data, not shipped as geometry.

## The owner's decisions

1. **Height: the district rises above the Emporium** (the owner's call).
   - The tallest tower is about 30 tiles, the rest 15 to 25. In Phase 5
     (the owner's call: slim towers, "a bit taller") the spire is 40 and
     the rest 14 to 32, and the airliners' westbound leg over Uptown was
     raised to 53-55.
   - The Emporium stays the tallest building downtown and the most detailed
     in the city. The "under the Emporium" rule holds everywhere else.
   - The flying traffic's routes (the prop plane's low loop along the
     river) and your own aircraft (`floorAt()`, `HULLS`) clear the towers,
     and the flight tests check them.
2. **The courts are retired**, with the people playing on them (tennis,
   football, basketball, their balls and their sound).
3. **The name is Uptown.**
4. **Scenery through Phases 1-5.** In Phase 6 the tallest tower becomes a
   place (pin, panel, "coming soon"), with a walkable sky deck at the top,
   reached by a lift from its lobby (the owner's pick: a lift door in the
   lobby, a fade, the deck; the lift back down).
5. **The plaza's centrepiece is a Christian cross** (the owner's pick, in
   Phase 3).
6. **The redesign** (the owner's call after Phase 4: "buildings with a
   smaller footprint so they look more realistic as skyscrapers ... a more
   varied road system ... real-world features in the street plan"), the
   owner's picks:
   - **Towers:** slim, a bit taller (shafts 5 to 10 across, two or three
     to a block, the spire about 40).
   - **Streets:** a diagonal with a flatiron on its sharp corner, a
     roundabout, a one-way pair, a curved crescent.
   - **Kerbside:** lobby drop-offs (porte-cochères with valets, a taxi
     rank), service alleys, parking bays and a bus lane (and bike lanes),
     turn arrows and planted medians.

## Phases

1. **The land and the streets** (built: see "Phase 1 as built" below).
   - **The data:** `finance.ts` (DOM-free, tested). The strips leave
     Westlake Park and become the district's blocks in the street plan.
   - **A real grid:** new north-south streets cut each strip into blocks
     about 40 tiles long, with lit junctions where they meet the avenues
     and cross streets. Traffic, taxis, walking and the world map pick
     them up from the plan.
   - **Lanes and plots:** walk-only lanes between some lots. Each block's
     lots and the plaza's land are set aside on the middle strip, a block
     from the river.
   - **Moving out:** the courts and their players go (decision 2). The strips' walks,
     rows of trees, lamps and benches go, and Westlake Park's rect and
     paths shrink to the big block.
   - **The boulevard's line:** the town's promenade carried on west along
     the north bank to the highway, ready for Phase 4.
   - **Drawn:**
     - the streets, sidewalks and slabs;
     - the empty lots behind hoardings carrying UPTOWN (made-up
       developer copy).
2. **The towers** (built: see "Phase 2 as built" below).
   - **A skyscraper kit** (`kits.ts`, `kits3d.ts`): a podium with a double-
     height lobby (revolving doors, a canopy), a shaft and setbacks, and a
     crown. Four or five designs:
     - a glass slab;
     - a stepped deco tower in stone and gold;
     - a round glass tower;
     - twin towers with a skybridge;
     - a slim spire, the tallest.
   - **Materials:** new wall atlas bands for curtain walls (blue glass,
     gold glass, black glass, deco stone), windows lit at night. Crowns
     and trims go through the shared lit neon (minimal bloom), with
     aircraft warning lights on top.
   - **The layout:** about 12 to 16 towers laid out by hand (`TOWERS`), the
     tallest on the plaza, about 30 tiles
     for the tallest, 15 to 25 for the rest. The south row fronts the
     river.
   - **Drawn and measured:**
     - far forms for each tower;
     - solids for walking, the camera and bullets;
     - hulls for flying;
     - a new `?bench` view (`finance`);
     - phones checked.
3. **The plaza** (built: see "Phase 3 as built" below).
   - **The plaza itself:** the heart of the district on the middle strip,
     the towers' lobbies opening onto it. It has:
     - granite paving;
     - a long stepped water wall and a fountain pool;
     - the centrepiece (the owner's pick: a Christian cross);
     - trees in grates, benches and planters;
     - café kiosks with made-up names;
     - lit canopies and string lights;
     - people in suits at lunch.
   - **Moving signs:** an LED ribbon round a podium with made-up words
     only, no numbers.
   - **Footprints:** in `SOLIDS`.
4. **The waterfront boulevard** (built: see "Phase 4 as built" below).
   - **The esplanade:** along the north bank from the Parkway to the
     highway, wide paving, a double row of trees, lamps, benches and
     railings at the water. It's open at the bridges and links east to
     the town's promenade and Liberty Bridge.
   - **Over the water:** decks and a marina with moored yachts (a new
     boat model), the river's boats kept clear (as `waterfront.ts` does).
   - **The south row:** restaurant terraces in the river-facing podiums.
   - **The avenue:** a planted median.
   - **At the lobbies:** valet bays with parked cars (`parkedCars()`). Not
     built: there's no room without cutting into the podiums (see "Phase 4
     as built").
   - **On the move:** a black town car among the traffic's models,
     following the cars' rules (a lane's width, two draws a model).
5. **The redesign: the streets, slim towers and the kerbside** (built: see
   "Phase 5 as built" below; decision 6).
6. **Night, life and the place.**
   - **The skyline at night:** crowns, beacons and lit floors.
   - **Life:**
     - the district's sound in `ambience.ts` (fountains, a quieter hum,
       the river, the circle's traffic);
     - people (suits, couriers, joggers on the esplanade, cyclists in the
       bike lanes);
     - a helicopter to a tower's helipad on the airport's timetable.
   - **The place:**
     - spot, pin, directory entry, panel ("coming soon", Walk in) and a
       `PLACES` entry for the spire;
     - its sky deck walkable, reached by a lift door in the lobby (fade,
       up, the deck with a glass rail; the lift back down);
     - the world map draws the district.
   - **The pass:** the phone pass and the bench before and after.
     CLAUDE.md is updated.

Each phase: tests at both sizes, the type check, the build and budget,
browser checks at every width (day, night, phones), then a PR for the
owner's sign-off.

## Phase 1 as built

- **The data:** `uptown.ts` (DOM-free, tested in `tests/uptown.test.ts`).
  - **Streets:** three north-south streets at x -150, -112 and -74, in line
    with The Trenches' cross streets across the river, from the west ring
    avenue to the north bank avenue. Every junction is lit (12), and
    traffic drives them (the routes come from the plan).
  - **Blocks:** twelve, in rows n, m and s, 31 to 50 tiles long. The
    plaza's block is `uptown-m1`, the middle row's on the Mall's axis.
  - **The axis:** Westlake Park's Mall (x -140) carried on south from its
    gate: walk-only lanes through the blocks either side of the plaza, and
    zebras over the ring avenue, the cross streets and the bank avenue.
    The plan's walk-only lanes between lots wait for the lots themselves
    (Phase 2): the axis's lanes are the first.
  - **Hoardings:** round every lot, open at a gate on its front and along
    the lanes; solid.
  - **Lamps:** along the avenues and cross streets through Uptown.
  - **The boulevard's line:** the town's promenade (railings, trees in
    planters, benches, lamps) carried on west along the north bank from
    Uptown's edge, on the town's rhythm so nothing of the town's moved.
- **Retired with the strips:** Westlake Park's three strips, their walks,
  rows of trees, lamps and benches; the tennis, football and basketball
  courts, their players, balls and sound. The park's wall now runs round
  its big block only.
- **Drawn:**
  - Uptown's streets at the boot, by the drawer The Trenches' use
    (`streets3d.ts`, clean here);
  - the lots as bare earth (world.ts);
  - the hoardings and the lanes' paving as a district loaded as you
    approach (`uptown3d.ts`).
- **The budget:** the boot's code went from 634.4 to 629.5 KB of 640 (the
  courts' players and balls went).

## Phase 2 as built

- **The data:** `highrise.ts` (DOM-free, tested in `tests/highrise.test.ts`).
  - **Designs:** five (`design()`): a glass slab (a shaft no longer than
    2.2 times its depth, its plant room set back), a stepped deco tower
    (stone, three setbacks, a gold pyramid and finial), a round glass drum
    (a crown ring and cap), twin towers (two shafts, the second a little
    lower, a skybridge at about 0.6 of the height) and the spire.
  - **The towers:** one to a block, twelve in all, fourteen shafts.
    - The spire stands in the plaza's block, east of the axis: roof 30,
      mast 36, no podium, its lobby facing the plaza.
    - The rest are 17 to 24 on a podium 3.2 high. The deco on the middle
      row is 24, its finial under the spire's roof.
    - The two either side of the plaza front it; the river row fronts the
      water.
  - **The lots:** the two blocks the axis's lanes cross keep a sliver west
    of the lane, hoarded with the plaza's block until Phase 3
    (`OPEN_LOTS` in uptown.ts). Every other lot is paved round its tower.
  - **Solid** in strips no wider than 6 (a car started inside a 31-tile
    podium was pushed past the collision grid's reach: the kart
    grandstand's lesson).
- **The flying traffic:** the airliners' westbound leg over Uptown was
  raised from 40-42 to 46-48. The tests keep every aircraft at least 4
  over any tower's tip within its reach. The prop plane's loop stays over
  the river, about 18 from the river row.
- **Drawn** by `highrise3d.ts`, a site a tower, in Uptown's chunk, which
  now loads from well out (its land widened by 240): the skyline is seen
  from across town.
  - **Walls:** Uptown's own curtain-wall atlas (blue, gold, black and
    silver glass, deco stone; the lobby), windows lit at night.
  - **Roofs and crowns:** roofs and parapets on every tier, each design's
    crown.
  - **Masts:** a mast with a red warning light on every tip.
  - **Lobbies:** a canopy over each door, a revolving door (near).
- **Measured:** a bench view over Uptown from the river (`uptown`). The
  boot's code is 636.0 of 640 KB (the towers' data, for their solids).

## Phase 3 as built

- **The data:** `plaza.ts` (DOM-free, tested in `tests/plaza.test.ts`) is
  what the boot needs: its solids, trees, lamps and people.
  `plazadress.ts` (DOM-free, tested there too) is what only the drawing
  needs, kept in Uptown's chunk: the canopies, the kiosks' names and the LED
  ribbon.
- **The layout:** the forecourt is the plaza's block west of the spire. The
  Mall's axis (north-south) meets the line between the spire's lobby and
  the lobby across the street (east-west) at the centre. The ways through
  are kept open: down the axis round the pool, in from the street through
  the water wall, and on to the spire's door.
- **The cross** (the owner's pick):
  - gold, on a three-step stone plinth in a round pool;
  - its arms across the axis, so it faces the Mall and the river;
  - 7.6 tall, the tallest thing in the plaza, under the spire's roof and
    the Emporium's;
  - glowing softly at night as if floodlit, with uplights at its foot and
    jets in the pool;
  - drawn so it takes no shadows (the shadow map's steps striped its
    gold).
- **The water wall:** three stone steps with water sheeting down them into a
  trough, in two halves either side of the way in from the street. The
  falls are a streaked texture the tick scrolls; they glow a little at
  night.
- **Lunch:**
  - lit glass canopies on posts along the north and south edges, six
    tables with chairs under them, string lights between the canopies;
  - trees in grates, four benches facing the pool, lamps flanking the way
    in and the spire's lobby, planters along the spire's sides;
  - granite paving with darker inlays along both axes and a ring round the
    pool.
- **The terraces:** the slivers west of the lanes are café terraces, each
  with a kiosk (MARBLE CAFÉ, SKYLINE DELI, made up), four tables under
  umbrellas and a tree at each end.
- **The LED ribbon:** round the podium across the street, above its lobby's
  canopy. Fixed made-up words only, never a number; they scroll round with
  the tick.
- **People at lunch:** 37 (half on phones): at the tables, on the benches,
  two pairs chatting by the spire's lobby, two looking up at the cross, two
  queueing at each kiosk.
- **Solid:** the pool (in six boxes with their corners on its rim, so
  nobody walks into the water), the cross, the water wall and troughs, the
  planters and the kiosks.
- **Retired:** the hoardings round the open lots.
- **The budget:** the boot's code went from 639.4 to 640.2 KB. The budget
  was raised on purpose from 640 to 642: the plaza's people, trees, lamps
  and solids have to be in the boot, and everything drawing-only was moved
  out to `plazadress.ts`.

## Phase 4 as built

- **The data:** `boulevard.ts` (DOM-free, tested in
  `tests/boulevard.test.ts`) is what the boot needs: the decks you walk on,
  the boats' limit, the trees, lamps and people, the terraces.
  `boulevarddress.ts` (DOM-free, tested there too) is what only the drawing
  needs, kept in Uptown's chunk: the yachts, the planted median, the
  terraces' names.
- **The esplanade:**
  - a paved deck along the north bank from Uptown's west edge to where the
    town's promenade begins, from the bank avenue's kerb out 3 over the
    water (about 5.8 across), at the boardwalk's height;
  - the plaza's granite, darker bands along the tree rows;
  - a double row of trees in round stone planters (every 6 by the avenue,
    every 12 by the water), lamps at the water's edge every 12, benches
    facing the river between them;
  - a glass rail with a steel top along the water and across its ends.
  - It replaces the stretch of the town's promenade that Phase 1 carried
    west (its railings, planters, benches and lamps).
- **Over the water:**
  - the axis's overlook where the Mall's line meets the river (8 wide, two
    flagpoles with pennants, coin binoculars) and a smaller one in line
    with Uptown's east street;
  - the marina at the west end: a timber pontoon on floats reached by two
    gangways, five yachts moored along its river side (a new boat model: a
    pointed hull with a sheer stripe, a teak deck, a deck house with a dark
    window band, a flybridge on the bigger ones, a mast and navigation
    lights), two tenders inside it.
- **The boats keep clear:** the north lane's boats stay east of the
  esplanade, as the south lane's do at the boardwalk. The middle lane runs
  as it did; the tests keep every deck and yacht at least 0.8 clear of its
  boats.
- **Walking:** the decks are ground at the boardwalk's height; their rails
  are their edges. Nothing on the esplanade is solid, as on the town's
  promenade.
- **Restaurant terraces:** on the river row's podium roofs wherever a roof
  is clear of its shafts (five: two on the west slab's podium, one between
  the twins, two on the deco tower's), with timber decking, a glass
  balustrade over the parapet, tables under umbrellas, planters, string
  lights, and the name on a lit board facing the river (HARBOUR & VINE, THE
  LANTERN ROOM, SKY GARDEN, RIVERLIGHT, THE GILDED FORK; made up). The
  sidewalk in front of the podiums is only 0.8 deep, so the roofs are where
  there's room. The podiums' rooftop plant keeps off them.
- **The planted median:** a clipped hedge along the bank avenue's median
  through Uptown, broken well short of every junction and the axis's
  zebra, slim columnar trees every 8 along it.
- **The town car:** the Midnight Exec (`exec` in `cars.ts`, made up), a
  long black executive saloon with chrome trim, one in twelve of the
  traffic's cars, everywhere in the city. Traffic only, never in the
  garage.
- **People:** 53 (half on phones): on every other bench, at the overlooks'
  rails, a pair on the pontoon, and dining on the terraces.
- **Not built: valet bays at the lobbies.** Every lobby door sits 0.2 from
  the sidewalk, and the podiums fill their lots to 0.8 from the edge, so a
  parked car would stand on the sidewalk or in a traffic lane. Doing it
  properly means cutting a covered drop-off into some podiums, which moves
  the towers' footprints. It's the owner's call whether to do that in
  Phase 5.
- **The budget:** the boot's code went from 640.2 to 641.5 of 642 KB (the
  town car's model and the boulevard's people, trees and lamps); the
  drawing is in Uptown's chunk.

## Phase 5 as built

- **The streets** (`uptown.ts`, tested in `tests/uptown.test.ts`), all in
  the street plan, so traffic, taxis, walking and the world map read them:
  - **Uptown Circle** (`CIRCLE`): a roundabout west of the plaza, one lane
    wide (3 tiles), one way round (anticlockwise seen from above with north
    up: keep right), its traffic giving way (unlit crossings) where its
    three streets join it: the circle's street north and south of it
    (x -176, ring avenue to bank avenue) and **Circle Street**
    (`circle-e`), with a planted median, east to the one-way pair at the
    plaza's middle, so the cross stands at the end of its vista. On its
    island, **the monument** (`MONUMENT` in `kerbside.ts`: a stepped granite
    plinth, a column, a gilded globe; made up), flowers and uplights.
  - **The one-way pair** (`COUPLET`): the plaza's two side streets, in
    line with The Trenches' (x -150 northbound, x -112 southbound), each
    with a green bike lane on its kerb side (`BIKE`), arrows and ONE WAY
    signs.
  - **The diagonal** (`DIAG`): from where the ring avenue meets the pair's
    southbound street to where the south cross street meets the east street
    (x -74), about 39 degrees off north-south, one lane each way either side
    of a planted median (`STREET_MEDIAN`; `median` on a street in the plan,
    its lanes either side, routes.ts), its junctions on three light phases.
    It cuts a pocket park (`uptown-n2w`) and **the flatiron's wedge**
    (`uptown-m2e`) out of the blocks either side of the north cross street.
  - **The crescent** (`CRESCENT`, `crescentX()`): a street bowing six tiles
    east between the east street and the Parkway, ring avenue to bank
    avenue.
  - Every other junction lit. The blocks are polygons (`UptownBlock.use`:
    towers, the plaza, the pocket park, the circle's island), cut round the
    circle, along the diagonal and the crescent.
- **The traffic:** routes.ts joins a turn's curve onto the next street
  from where the curve ends (not only past what's near the corner): a lane
  well off its street's line, or a street bending round the circle, used to
  run back to the junction after the curve (266 such steps backwards in the
  routes before, none now), and three light phases wherever the diagonal
  comes in.
- **The towers** (`highrise.ts`, tested in `tests/highrise.test.ts`): 29,
  two or three to a block (the old 12 had a block each), shafts 5 to 10
  across, every one at least 2.5 times as tall as it's wide: the spire 40
  (tip 45, 12 across, no podium) in the plaza, the rest 16 to 32 stepping
  down to the edges; the river row's shafts at the back of their podiums
  (`back`, `depth`), the front of the roof a restaurant terrace
  (`ROOF_TERRACES` in boulevard.ts, now in front of the shafts: ten names);
  and **the flatiron** (`flatiron()`, design `flatiron`): a stone wedge
  filling the diagonal's sharp corner, its prow blunt (`PROW`), a gold line
  under its heavy cornice, solid in thin strips along it (a prism part,
  `poly`). The airliners' westbound leg was raised from 46-48 to 53-55.
- **The kerbside** (`LAYBYS` in uptown.ts, `kerbside.ts`, tested in
  `tests/kerbside.test.ts`; drawn by `kerbside3d.ts`):
  - **Lay-bys** cut into the blocks off the kerb (the sidewalk runs round
    behind them): parking bays along the circle's street north and south
    of it, the taxi rank behind the spire on the pair's southbound street
    (Cruisers in taxi yellow, a TAXI sign), valets' bays at the lobbies
    either side of the plaza (the north row's on the north cross street, the
    river row's on the bank avenue) under **porte-cochères** (a glass roof
    from the podium over the sidewalk to the bay on steel posts, lit along
    its edge, a VALET stand, Midnight Execs and coupes), and a loading bay
    with a box van. The cars are `LAYBY_CARS`, solid, facing the traffic's
    way.
  - **Service alleys** (`SERVICE_ALLEYS`): between the towers that stand
    side by side, through the block, two bollards at each mouth (a walker
    passes, no car), a dumpster, roll-up doors with lamps, crates.
  - **Paint:** the bank avenue's kerb lanes a red bus lane with BUS on it,
    turn arrows in the avenues' lanes coming up to Uptown's junctions (left
    from the inner lane, straight or right from the outer), give-way teeth
    and yield signs round the circle, arrows round it.
  - The avenues' medians and lines break as far as a slanting street's
    asphalt reaches (`highwayGaps()` in world.ts).
- **Drawn:** the streets' asphalt along any line, the circle's ring, the
  planted medians, centre lines, zebras on every arm of every lit junction
  and lamps along the new streets are the boot's (`drawUptown()` in
  streets3d.ts); the kerbside is Uptown's chunk's.
- **The budget:** the boot's code went from 641.5 to 652.5 (raised to 654
  on purpose; see above).

