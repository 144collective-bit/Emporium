# Uptown, the financial centre (the owner's call)

The owner wants the land of Westlake Park's three strips turned into a
waterfront boulevard and financial centre: skyscrapers, a plaza, the
city's wealth on show. Built in five phases, each a PR for the owner's
sign-off. Keep this plan up to date as each phase lands.

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
- **The budget:** the boot's code is at 634.4 of 640 KB. Everything drawn
  goes in the district's own chunk; what the boot must hold (solids,
  places, the street plan's blocks) is kept small. The towers' far forms
  are made from data, not shipped as geometry.

## The owner's decisions

1. **Height: the district rises above the Emporium** (the owner's call).
   - The tallest tower is about 30 tiles, the rest 15 to 25.
   - The Emporium stays the tallest building downtown and the most detailed
     in the city. The "under the Emporium" rule holds everywhere else.
   - The flying traffic's routes (the prop plane's low loop along the
     river) and your own aircraft (`floorAt()`, `HULLS`) clear the towers,
     and the flight tests check them.
2. **The courts are retired**, with the people playing on them (tennis,
   football, basketball, their balls and their sound).
3. **The name is Uptown.**
4. **Scenery through Phases 1-4.** In Phase 5 the tallest tower becomes a
   place (pin, panel, "coming soon"), with a walkable sky deck at the top.

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
3. **The plaza.**
   - **The plaza itself:** the heart of the district on the middle strip,
     the towers' lobbies opening onto it. It has:
     - granite paving;
     - a long stepped water wall and a fountain pool;
     - a centrepiece sculpture of the city's own (the owner's pick: for
       example a turning gold Emporium diamond or a giant Dorra coin);
     - trees in grates, benches and planters;
     - café kiosks with made-up names;
     - lit canopies and string lights;
     - people in suits at lunch.
   - **Moving signs:** an LED ribbon round a podium with made-up words
     only, no numbers.
   - **Footprints:** in `SOLIDS`.
4. **The waterfront boulevard.**
   - **The esplanade:** along the north bank from the Parkway to the
     highway, wide paving, a double row of trees, lamps, benches and
     railings at the water. It's open at the bridges and links east to
     the town's promenade and Liberty Bridge.
   - **Over the water:** decks and a marina with moored yachts (a new
     boat model), the river's boats kept clear (as `waterfront.ts` does).
   - **The south row:** restaurant terraces in the river-facing podiums.
   - **The avenue:** a planted median.
   - **At the lobbies:** valet bays with parked cars (`parkedCars()`).
   - **On the move:** a black town car among the traffic's models,
     following the cars' rules (a lane's width, two draws a model).
5. **Night, life and the place.**
   - **The skyline at night:** crowns, beacons and lit floors.
   - **Life:**
     - the district's sound in `ambience.ts` (fountains, a quieter hum,
       the river);
     - people (suits, couriers, joggers on the esplanade);
     - a helicopter to a tower's helipad on the airport's timetable.
   - **The place:**
     - spot, pin, directory entry, panel ("coming soon", Walk in) and a
       `PLACES` entry for the tallest tower;
     - its sky deck walkable if the owner wants it;
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

