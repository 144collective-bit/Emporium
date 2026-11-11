# The Ends carried west (a plan)

## The owner's answers (2026-11-11)

| Question | Answer |
| --- | --- |
| 1. Its name | Still Endswood: it's an extension of the estate, not a new one (the owner's call) |
| 2. How it joins | A) The Close opened and carried west as the extension's spine road, the bollards moved to its far end |
| 3. Layout | A) Houses facing footpaths and greens, cars in courts behind |
| 4. How much land | A) The near half now (about x -215 to -135), the rest kept for later |

So it's built as Endswood's own land grown west: `ENDSWOOD_RECT` and its
blocks reach further, with Endswood's lamps, sound and life carried over, and
no new place or pin of its own (the estate's `endswood` spot covers it).

The owner's call (the build-out plan's land plan, `docs/buildout-plan.md`,
second round): carry Endswood Estate, "the Ends", further west in
council-estate town houses, as worn as Endswood itself. This is the second
section of the build-out, after the civic quarter (`docs/civic-plan.md`).
Nothing is built until the owner signs off a phase; keep this plan up to date.

## What it is

The low-rise half of a 60s and 70s council estate, next to Endswood's
brutalist blocks:

- **Two and three storey brick terraces** in rows, flat or shallow-pitched
  roofs, concrete porches and canopies, the odd boarded window.
- **Footpaths along their fronts**, garages and parking courts behind, so the
  houses face paths and greens rather than roads (the way those estates were
  laid out), with small fenced back gardens.
- **A garage block**, a short **parade** with a corner shop, a **playground**
  and a kickabout green.
- **Endswood's look**: its concrete and brick, sodium lamps, bins, washing
  lines and satellite dishes; worn, lived-in, nothing threatening. Made-up
  names only, everything under the Emporium.

## The site (measured)

- **Free land:** west of Endswood (its west edge is x -130), outside the ring
  highway's south-west bend, between the Docks to the north-west (to z 292)
  and Lot 9's Field to the south (its fence from z 472, west to x -205).
- **Nothing on it yet:** no street, block, ramp or metro line crosses
  x -400 to -120, z 290 to 470. Only the highway's bend clips its north-east
  corner (the curve runs through x -215 to -145, z 250 to 320). The exits
  nearest are 6 ("Endswood · The Trenches", at x -4.5) and 7 ("Southbank
  Docks", at x -215, z 137), neither in the way.
- **No road reaches it**, so it needs its own way in. Endswood Road runs east
  to west at z 380 and carries on as the Close (a dead end, bollards at
  x -107).
- **The near half** is about x -215 to -135, z 330 to 460: 80 across and 130
  deep, beside Endswood and the highway's bend. **The whole land** reaches
  west to about x -380.

## The phases (each with the owner's sign-off)

1. **The land and the streets** (built, waiting on the owner's sign-off):
   the way in, the estate's roads and parking courts, its blocks in the
   street plan (the world map, walking), footpaths, sodium lamps; the
   outskirts' trees and the rolls kept off (`KEEPS`). What's built:
   - `endswest.ts` (DOM-free, the boot's, tested in
     `tests/endswest.test.ts`): Endswood's land grows by `WEST_RECT`
     (x -204 to -128, z 330 to 466), read as one with the old land by
     `inEndswood()`, so its lamps are sodium, its posts the estate's and its
     sound Endswood's.
   - The Close carried west from the old estate's bollards (x -107) to
     `CLOSE_WEST` (x -200.8), the bollards moved to its far end; a zebra
     with flashing beacons where the tunnel's footpath to Lot 9 crosses it
     (`ZEBRA`), and short pavements between the old estate and the
     extension (`LINK_BLOCKS`). It's still a dead end, so no traffic drives
     it; you walk or drive in.
   - Two blocks either side of it (`WEST_BLOCKS`): on each a service lane
     in from the Close at its west end (`LANES`) to parking courts behind
     the rows (`COURTS`, the bays marked), six rows' footprints kept for
     Phase 2 (`ROWS`, facing each other in pairs), their back gardens
     (`GARDENS`), front paths either side of a green between each pair
     (`PATHS`, `GREENS`), a cross path down each block's east side to the
     Close (`CROSS_PATHS`), and the east ends kept for Phase 3 (`RESERVE`:
     the parade, the playground, the garage block).
   - Sodium lamps along the Close, in each court and over each green
     (`WEST_LAMPS`); its land in `KEEPS` (the trees and the rolls keep off)
     and worn ground round it (ground.ts).
   - Drawn by `endswest3d.ts` (`LAZY_DISTRICTS` id `endswest`), all sites:
     the Close's worn asphalt and line, the zebra and beacons, the
     bollards, the lanes, courts, paths, greens and gardens.
2. **The terraces:** the rows of town houses through the building kits
   (`recipes.ts` terraces), in Endswood's brick and concrete, the porches,
   the back gardens and their fences. The owner's picks (2026-11-11):
   - a mix of two and three storeys, varied along each row;
   - roofs a mix, flat behind a parapet and shallow pitched;
   - as worn as Endswood: a few boarded windows, satellite dishes, patched
     porches;
   - (asked before starting) the front doors in mixed colours, as after
     right-to-buy.

   Built, waiting on the owner's sign-off. Its own module rather than the
   kits' terrace (that kit is two storeys and pitched only):
   - `endsterraces.ts` (DOM-free, the chunk's, tested in
     `tests/endsterraces.test.ts`): each row broken into two or three
     terraces (`TERRACES`, `PLANS`) by passages through to the gardens and
     the courts (`GINNELS`, `GINNEL` wide), every row mixing two- and
     three-storey builds and flat and pitched roofs, in red, buff or dark
     brick; 48 houses (`HOUSES`) mirrored in pairs so their doors sit side
     by side on the front path, each door its own colour (`DOOR_COLOURS`,
     never a neighbour's), a concrete canopy (flat-roofed terraces) or a
     brick porch (pitched), a glazed porch someone added on about one in
     five; worn: a boarded window, dishes, faded doors, stained canopies;
     wheelie bins by each front, the back gardens in close-board fences
     (`fencesOf()`) with a gate each (`gateOf()`), a shed in some;
     `TERRACE_SOLIDS` joined through `addSolids()` when the chunk loads.
   - Drawn by `endsterraces3d.ts` (a site a terrace and a passage): the
     walls from the city's wall atlas (windows lit at night), flat roofs
     inside a parapet with coping, vents and aerials, pitched roofs in
     concrete tiles with brick gables, gutters, downpipes and a chimney a
     pair; near only the fronts, back doors, fences, gates and sheds.
3. **The estate round them:** the garage block, the parade and its corner
   shop, the playground, the green, bin stores, CCTV, the estate's board.
   The owner's picks (2026-11-11): a parade of shops with flats over them on
   the Close; a fenced playground and a kickabout green with goalposts; a
   row of lock-up garages, a few doors left open.

   Built, waiting on the owner's sign-off, on the blocks' east ends Phase 1
   kept (`RESERVE`):
   - `endsweststreet.ts` (DOM-free, the chunk's, tested in
     `tests/endsweststreet.test.ts`): the parade on the Close (`PARADE_W`:
     four units, `UNITS_W`, FENNEL MART, FRYING SQUAD, SPIN CYCLE and a
     fourth to let, made up; a concrete canopy, two storeys of flats over,
     their door and a steel stair at the back), a bin store behind it and
     one by the garages (`BIN_STORES_W`); the fenced playground north of
     the parade (`PLAY_W`, `PLAY_FENCE`: its gate onto the cross path;
     swings, a slide, a roundabout, two springers); on the south block the
     garages (`GARAGES`: eight lock-ups facing west onto their apron off
     the Close, `APRON`, three doors up) and the kickabout green with a
     goal at each end (`KICKABOUT`, `GOALS`); the estate's board by the
     Close, CCTV over the parade and the apron, benches (`BOARD_W`,
     `CCTV_W`, `BENCHES_W`); `STREET_W_SOLIDS` joined when the chunk loads.
   - Drawn by `endsweststreet3d.ts` (sites): the shopfronts from an atlas
     of their own (`ends-west-shops`, painted as the old parade's: the
     painter is `endsshopfront.ts` now, shared with endsstreet3d.ts), the
     flats from the city's wall atlas, the rest in the shared paint.
4. **Life, night and sound:** people on the paths and at their doors, kids
   on the green, washing lines, dogs; the windows and porch lights at night;
   its sound (Endswood's, carried over). The owner's picks (2026-11-11): a
   busy estate (kids on the playground and the green, neighbours at their
   doors and on the parade, a queue at the chippy, dog walkers on the
   paths); washing lines in some back gardens and a few bikes and toys out
   front; at night the porch lights on, the chippy and the corner shop lit
   late, the playground dark, the green under the sodium lamps.

   Built, waiting on the owner's sign-off:
   - `endswestlife.ts` (DOM-free, the chunk's, tested in
     `tests/endswestlife.test.ts`): walkers round each pair of rows on their
     front paths (`PATH_OUT`, on the path's outer half, past the porches and
     bins), along the Close's sidewalks (`CLOSE_OFF`, over at the zebra and
     the lanes' mouth, `LANE_MOUTH`) and up the north block's cross path, a
     dog on the lead with some (`WEST_DOGS`); kids running round the
     playground (`PLAY_IN`), round the roundabout (`ROUND_R`), on the swings
     (`SWING_SEATS`) and a springer; a kickabout between the goals with a
     keeper in each (`WEST_PEOPLE`); neighbours on their doorsteps and
     chatting at a mirrored pair's doors side by side (`STEP_OUT`), someone
     at the washing, a queue of three at FRYING SQUAD, others at FENNEL MART
     and SPIN CYCLE, a parent at the swings, people on the benches, someone
     at an open garage, someone reading the board (`WEST_IDLE`); a rotary
     airer or a line of washing in about two gardens in five (`WASHING`,
     `AIRER`, `LINE`), a kid's bike or scooter against the front wall by
     some doors and toys on the green (`FRONT_BITS`); a pool under every
     porch light and the corner shop's and the chippy's on the forecourt
     (`PORCH_POOLS`, `LATE_UNITS`); all of it into the crowd's spare slots
     (the reserve raised to 360, 180 on phones, so every chunk's people fit
     at once, the test holds it).
   - Drawn by `endswestlife3d.ts` (`registerWestLife()`): the washing,
     bikes and toys a site a terrace, near only; warm tubes under the
     parade's canopy over the two late shops; on the main thread the dogs
     and their leads and the porch lights' pools (one additive mesh in the
     FX layer, dark by day), drawn only while the camera is near. The
     playground has no lamp; two sodium lamps along the south block's cross
     path light the kickabout green (`WEST_LAMPS`). Its sound is Endswood's
     (ambience.ts `ends` reads `inEndswood()`, which takes in the
     extension).
5. **Polish:** benchmark and review views, phones, a place on the map if
   wanted; the plan done.

## The owner's questions (answered above)

1. **Its name** (answered: still Endswood, an extension):
   - A) Endswood West, so it reads as part of the Ends (my pick).
   - B) The Rows.
   - C) Kestrel Fields.
   - D) Your own.
2. **How it joins the city:**
   - A) Open the Close's dead end and carry it west as the new estate's
     spine road, the bollards moved to its far end (my pick: it joins the
     Ends straight on).
   - B) A new road off the south avenue between Endswood and Lot 9.
   - C) A road south from the Docks.
3. **How it's laid out:**
   - A) Houses facing footpaths and greens, cars in courts behind, as those
     estates really were (my pick).
   - B) Ordinary streets, the houses facing the road.
   - C) A mix of the two.
4. **How much land:**
   - A) The near half now (x -215 to -135), the rest kept for later (my
     pick: quicker, lighter on phones, and it tests the build-out's limits
     first).
   - B) The whole land, west to about x -380.
