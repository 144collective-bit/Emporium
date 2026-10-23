# The financial centre (the owner's call)

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

## Decisions for the owner (before Phase 1)

1. **How tall.** Today nothing may be taller than the Emporium (roof 12.5
   tiles, about 22 m; the kits stop at 11.2). Under that cap the towers are
   about seven storeys at Degen's scale: tall and slim, but not
   skyscrapers.
   - **(a) Keep the Emporium the tallest.** The towers stay under 12.5 and
     read as a skyline through slender shafts, setbacks, crowns and a
     dense cluster.
   - **(b) Let the financial centre rise above it.** For example, the
     tallest tower at about 30 tiles and the rest 15 to 25. The Emporium
     stays the tallest downtown and the most detailed building in the
     city. Seen from the home view the cluster is a skyline about 150
     tiles west, behind downtown.
     - This changes a standing rule (CLAUDE.md).
     - The flying traffic's routes (the prop plane flies low along the
       river) and your own aircraft's roofs (`floorAt()`) have to clear
       the towers.
   - Recommended: (b), if real skyscrapers are what's wanted.
2. **The courts and the people playing on them.** The options:
   - move them into Westlake Park's big block (recommended);
   - retire them;
   - keep one strip's court as a pocket park in the district.
3. **The name.** A made-up name for the district (working name: "Crown
   Quay").
4. **Scenery or places.** Recommended: scenery first (Phases 1-4), then
   in Phase 5 the tallest tower becomes a place (pin, panel, "coming
   soon"), with its sky deck walkable if the owner wants it.

## Phases

1. **The land and the streets.**
   - **The data:** `finance.ts` (DOM-free, tested). The strips leave
     Westlake Park and become the district's blocks in the street plan.
   - **A real grid:** new north-south streets cut each strip into blocks
     about 40 tiles long, with lit junctions where they meet the avenues
     and cross streets. Traffic, taxis, walking and the world map pick
     them up from the plan.
   - **Lanes and plots:** walk-only lanes between some lots. Each block's
     lots and the plaza's land are set aside on the middle strip, a block
     from the river.
   - **Moving out:** the courts move or go (decision 2). The strips' walks,
     rows of trees, lamps and benches go, and Westlake Park's rect and
     paths shrink to the big block.
   - **The boulevard's line:** the town's promenade carried on west along
     the north bank to the highway, ready for Phase 4.
   - **Drawn:**
     - the streets, sidewalks and slabs;
     - the empty lots behind hoardings carrying the district's name
       (made-up developer copy).
2. **The towers.**
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
     tallest on the plaza, heights by decision 1. The south row fronts the
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
