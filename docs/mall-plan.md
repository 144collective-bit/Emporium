# The shopping plaza and the mall (the owner's call; steps 1 and 2 built, then redesigned)

The owner asked for "a shopping plaza and mall in the space next to the park
and the north of the center between the highways": the open land between the
Parkway and the ring highway's north side, east of Westlake Park. Keep this
plan up to date and build it one step at a time, each with the owner's
sign-off.

## The owner's decisions

- **Layout:**
  - The open-air shopping plaza goes on the block between Westlake Park and
    the north avenue (ns0), opening onto the park's east gates.
  - The mall fills the block between the north and the east avenues (ns0
    and ns3).
  - The two small north-south streets (x 17 and 43) stop at the Parkway
    instead of running on to the highway.
- **Style:** first a retro neon 80s mall (pastel and neon, chrome trim,
  palms). Then the redesign (the owner's call: "more realistic ... colour
  scheme, details and complexity"): a **modern mall**. White and light-grey
  cladding, big glass curtain walls in black steel, timber slats and
  soffits, stone paving, warm white lighting. The 80s theme went, outside,
  in Palm Court and inside (the inside followed so the two match).
- **Inside:** the outside only for now. The interior comes in a later step.
- **Extras:** car parks and a loop road that traffic drives, a multi-storey
  car park, a cinema, and two department-store anchors.

Content: made-up names only (the mall, the plaza, the anchors, the cinema,
every shop and every film on the posters). No real brand, chain or film. No
prices on any sign.

## Where it goes, exactly

- **The land:** from Westlake Park's east sidewalk (x -42.55) to the east
  avenue's west kerb (x 60.8), and since Palm Court moved, on across the
  avenue to x 101.75 (the land west of the north avenue is Uptown North's), and from the ring highway's north side (clear
  of its slip lanes, z -155) to the Parkway's outer sidewalk (z -43).
- **The streets:** ns1 and ns2 end at their crossings with the Parkway
  (`SHORT_NS` in layout.ts). With them go:
  - their stretches to the world's edge
  - their two junctions on the highway's north side and those junctions'
    slip lanes
- **Palm Court** (the plaza) sits east of the mall, across the east ring
  avenue (ns3; moved there from the park's side, the owner's call: see
  "Palm Court moves east" below):
  - a promenade running north to south
  - two rows of shops facing each other across it
  - a passage through the west row to a zebra over the east ring avenue to
    the mall's forecourt, and one through the east row across from it to
    the open land
  - Paradise Cinema across its north end, a fountain in the middle, and the
    PALM COURT arch at its south end
- **Starlight Mall** sits east of the north avenue:
  - The mall building is on the north block, with Maxwell's and Bright & Co.
    (the anchors) at its ends. The mall's own hall between them has an
    entrance porch facing south and a totem by the loop.
  - The two-way loop runs off the north avenue: its north leg passes the
    mall's front, its east leg runs down by the east avenue, and its south leg
    comes back along the Parkway.
  - Inside the loop are the surface car park, a taxi rank in its first row,
    and the multi-storey car park.

## Steps (each with the owner's sign-off)

1. **The plaza and the mall from outside** (built): everything above, as
   scenery. The data is `mall.ts` (tested in `tests/mall.test.ts`), the
   drawing `mall3d.ts` (a district loaded as you approach), the places
   `mallspot.ts`.
   - Palm Court's shops, the cinema, the fountain, the trees and the arch.
   - The mall, its anchors, the pylon, the loop with its traffic, the car
     parks, cars, people and lamps.
   - Both as places (pins, panels, Walk in), on the world map, and with the
     owner's live switches.
2. **The mall's interior** (built): a walk-in concourse in the hall, which
   is hollow now (`mallinside.ts`, tested in `tests/mallinside.test.ts`;
   drawn by `mallinside3d.ts` in the mall's chunk, near only):
   - the doors open behind the porch, with bollards across them (a walker
     gets through, no car does), and a double-height entrance lobby with a
     directory board either side
   - sixteen shops with made-up names, four a side on each floor, their
     fronts on the concourse and on the upper galleries
   - the atrium, open to the glass vault: a fountain, benches, palms,
     columns, a ring of light hung from the roof
   - two escalators side by side (up and down, the steps running) to the
     terrace across the north end, walkable both ways
   - the food court on the terrace: six stalls (made-up names, menu boards
     with no prices), tables and stools, cooks and diners
   - under the terrace: a rocket and a car ride, the information desk, a
     photo booth, and the department stores' doors
   - walking: `mallFloor()` gives the floor by Degen's height and
     `mallWall()` stops him at the upper floor's edges (glass balustrades)
     and at what stands on his floor
   - the panel's Walk in starts in the lobby
   **The redesign** (after step 2, the owner's picks: the mall's outside
   and Palm Court; the facades, the shopfronts and signs, the interior's
   fit-out, the grounds and parking; in the same pull request as step 2):
   - Palm Court: each shop one of four fronts (`ShopStyle` in mall.ts:
     a glass box in black steel under a timber canopy, white render round a
     deep window, cladding with fins over the glass, timber over glass), a
     third of them two storeys, rooftop plant; stone paving, trees in
     planters (`COURT_TREES`), timber benches, festoon lights across the
     promenade, a water feature with a steel ring and jets, a stone gateway
     with a steel beam; Paradise Cinema dark-clad with a double-height glass
     lobby, a timber-soffit canopy and poster lightboxes.
   - Starlight Mall: the hall's curtain wall between clad piers, the
     entrance's dark feature wall with the name and a gold star, a
     cantilevered canopy with a timber soffit; Maxwell's in light panels with
     black fins, Bright & Co. in dark panels with a double-height glass front
     and a timber band; loading docks at the back, rooftop plant; the glass
     vault on black ribs; the totem, a steel and glass bus shelter.
   - The grounds: paved forecourt with planters (`PLANTERS`, their trees
     the city's: `MALL_TREES`), pay stations (`PAY_STATIONS`), bike racks;
     a zebra over the loop to the porch (`LOOP_ZEBRA`); the car park in
     groups of four bays with kerbed planted islands between (`ISLANDS`,
     two trees each, trolley shelters, lamps); the multi-storey behind
     perforated metal screens with a glazed stair core.
   - Inside: pale stone floors, white slabs with timber soffits and slots
     of light, warm LED edges, white and black-steel shopfronts, white
     columns, timber benches, trees in white planters, a ring of light over
     the fountain, a timber food court; two kiosks in the atrium (`KIOSKS`)
     and a glass lift by the east gallery (`LIFT_SHAFT`, `MALL_LIFT`: "Lift ·
     Upper floor" / "Lift · Ground floor", a fade as Sector 7 Tower's).
   - New made-up names for the shops, the units and the food stalls.
   **The polish pass** (the owner's call: "fix all rough spots"): the car
   park's islands each a small garden (a paved walk down the middle with
   light bollards, beds with clipped hedges, flowering shrubs, grasses and a
   boulder, four trees, the lamp by the walk; EV chargers with their bays
   painted green on every other island, a trolley shelter on the rest), and
   Palm Court's festoon lights in the FX layer (drawn with ink outlines the
   thin cables read as thick black ropes).
3. **Later, if the owner wants:** shops to buy and run with Dorras, like the
   corner shops, and events at the cinema.

## Palm Court moves east (the owner's call, built)

The owner asked for the promenade "on the other side of the mall" and for
"more large sky scrapers that match Uptown's" (their picks: Palm Court,
east of the mall across the east ring avenue; towers like Uptown's on its
old land).

- **Palm Court** (`COURT` in mall.ts) is the same plaza, as wide as it was
  (`COURT_W`), from the east ring avenue's sidewalk east, its south end
  clear of the Parkway's outer sidewalk (`SOUTH_Z`), on the open land the
  kart park left. The west row opens at the zebra over the avenue to the
  mall's forecourt (`ZEBRA`, the avenue's median broken there, clear of
  the el's pillars); the east row across from it to the open land
  (`EAST_GAP`). Everything else (the shops, the cinema, the fountain, the
  arch, the festoons, the trees, the lamps, the people) follows it.
- **Uptown North** (uptownnorth.ts) takes the old land: seven towers of
  Uptown's designs (highrise.ts, 22 to 31 high) in two columns either side
  of a service way, the park's east gates carried through to the north
  avenue, and a square in the middle with a pool and a steel sculpture,
  where the zebra over the north avenue to the mall's forecourt
  (`TOWER_ZEBRA`) lands. See docs/finance-plan.md.
- `MALL_AREA` (the district's land, the outskirts' trees kept off) reaches
  from Uptown North's block to Palm Court.

Checks: `npm test` and `npm run test:wide` (664 passing), the type check,
the build and the budget (boot 661.8 of 670 KB), browser shots by day and
night and on a phone.

## One mall: the Skywalk, the metro inside, Palm Court enclosed (the owner's call, 2026-11-18)

The owner asked to "connect these two buildings and create 1 giant mall",
with the train between them running through it and stopping there for
passengers, rebuilt "realistic and of a high standard". Their picks:

- **The link:** a two-floor glass bridge over the east ring avenue (ns3),
  with traffic still driving under it. No street moves.
- **The train:** the metro. The raised line between the mall and Palm Court
  is the metro's (the monorail is the Neon Mile's, further south). It runs
  through the bridge's top floor.
- **The station:** the metro's Starlight Mall station moves from north of
  the highway into the bridge. It keeps its name and its place in the
  timetable.
- **The floors:** a shopping floor at the mall's upper-floor height, with
  the station's platform floor above it, where the metro runs.
- **Palm Court:** a full rebuild later, as an enclosed two-floor wing
  matching the mall's interior.

### Phases (each with the owner's sign-off)

1. **The Skywalk** (built). The bridge, its pavilion on Palm Court, and the
   corridor through Bright & Co. Data in `malllink.ts`, drawing in
   `malllink3d.ts`.
   - **The bridge** (`LINK`): spans the avenue from Bright & Co.'s east face
     to Palm Court's west row, clear of traffic (`CLEAR`). It has two floors:
     - The lower floor (`L1`) is at the mall's upper-floor height.
     - The platform floor (`L2`) is at the el's raised height, east of the
       track.
     - A glass barrel roof runs over both.
   - **The el through it:** raised through the bridge (`LINK_Z` in mall.ts,
     metro.ts `needAt()`). It enters and leaves through portals in the
     bridge's glass ends, and its pillar on the median is a column in the
     lower floor.
   - **The corridor** (`CORRIDOR`): from the hall's east gallery (in place
     of the east upper unit, `CORRIDOR_Z`) through Bright & Co.'s upper floor
     to the bridge, with the store's windows either side.
   - **The pavilion** (`PAVILION`): in place of Palm Court's two northern
     west-row shops. Its triple-height atrium is crossed by two pairs of
     escalators:
     - street to the lower floor (`ESC_G`)
     - lower floor to the platform floor (`ESC_UP`)
   - Its glass front on the promenade carries the mall's name and star, with
     doors on the promenade and the avenue's sidewalk.
   - **The platform floor** for now: the walk along the track behind a glass
     screen, benches, and a "Metro · coming soon" board. Trains pass through
     without stopping until Phase 2.
   - **Walking:** `linkFloorAt()` in groundheight.ts; `linkUp()` and
     `linkWall()` in walk.ts. Up there only the edges and what stands on
     your floor stop you (`LINK_SOLIDS`). `LINK_CAMERA` is for the walk
     camera.
   - **Checks:** the type check, lint and `npm test` pass. The build and
     budget pass (boot 741.2 of 750 KB). Browser shots were taken outside
     and in.
   - **Draw calls** at the mall's views (counted from the page's WebGL,
     before and after, headless):
     - Unchanged: desktop 325 and 318, phone 171. Its geometry merges into
       the mall's batches.
     - Triangles up about 0.5% (its people in the crowd).
2. **The station** (built; the owner's picks: the glass lift, fare gates,
   a next-train board, the metro's sign outside). Starlight Mall station
   moved into the bridge's top floor (metro.ts `inside`); the old station,
   its tower and stair north of the highway are gone.
   - **The platform floor** is level with the train's floor now (`L2`,
     metro.ts `PLATFORM_UP` over the deck; the roof came down to keep
     under the pylon). It has:
     - the screen's doors and a yellow line, the station's name and the M;
     - the Metro prompt on the platform (index.ts shows it only up there);
       a ride ends there (places.ts gives the place a height,
       `walk.placeAt()` / `enter()` take it).
   - **The fare gates** (`GATES`, for the look: rides stay free) are
     between the platform and the mezzanine, under METRO and the M.
   - **The next-train boards** (`NEXT_BOARDS`, metro.ts `nextTrain()`): only
     words, no numbers on a sign. They show where the next train goes and
     ON ITS WAY, DUE, ARRIVING or BOARDING, on the metro's own clock
     (`METRO_CLOCK`).
   - **The glass lift** (`LINK_LIFT`, `STATION_LIFT`) stops at the street,
     the mall's floor and the metro's. Its floor picker is Endswood's card
     (skylift-ui.ts `openStation()`).
   - **Outside:** the M and the station's name on both glazed ends, the M
     and METRO on the pavilion's south pier.
   - **The timetable:** Crestmont's spur leaves the main line north of the
     station, facing north. A train between them runs on past the spur and
     turns round where the old station was (metro.ts `TURN`, `TURN_S`:
     `LEGS` two longer, the round trip about 439 s). A ride runs through
     Starlight Mall without stopping, so Uptown to Crestmont is still about
     75 s.
   - **Checks:** the type check, lint and `npm test` (1516) pass. The build
     and budget pass (boot 742.5 of 750 KB). The walk smoke test passes
     (its metro ride steps out on the new platform). Browser shots were
     taken of the platform, the gates, the lift and the station from
     outside.
3. **Palm Court enclosed** (the owner's picks: a glass barrel vault, shops
   on both floors, bridges across, an upstairs food hall, the cinema's
   upstairs entry). The rules are `courtinside.ts`, the drawing
   `courtinside3d.ts`. Built: a full rebuild as a two-floor indoor wing of
   the mall:
   - A glass roof over the promenade, upper galleries over both rows, and
     bridges across.
   - The fountain, trees and cinema kept inside.
   - Shops on both floors, made-up names.
   - Walking, people, and the panel's Walk in.
   - What went: the promenade's street lamps, festoon lights and the
     city's trees (indoor trees in white planters now), the PALM COURT
     gateway (its name over the south entrance now), the shops' single
     storeys, the cinema's canopy (the food hall's terrace runs over its
     doors) and the Skywalk pavilion's door canopies.
   - **Checks:** the type check, lint and `npm test` (1521) pass. The
     build and budget pass (boot 743.9 of 750 KB: little room left). The
     walk smoke test passes (80 of 80). Browser shots were taken from
     above, the entrance, the promenade, a gallery and the food hall.
4. **The whole mall finished** (the owner's picks: the roofs dressed and a
   phone check; the one name and directory, and the bus and coach stop on
   the bare land south of the multi-storey, left for later):
   - **The roofs dressed** (built): `mallroofs.ts` (DOM-free, tested; in the
     mall's chunk, not the boot), drawn by `mallroofs3d.ts` in three sites.
     It covers Palm Court's rows, Maxwell's, Bright & Co., the hall round
     its vault, and Paradise Cinema:
     - a grey membrane over the light roofs;
     - rows of solar panels tilted to face south, clear of the vaults, the
       edges and the plant;
     - rooflights over Palm Court's upper floor;
     - plant on the rows and the cinema. The anchors' and the hall's plant
       now come from the same list (`ANCHOR_PLANT`, `HALL_PLANT`).
   - **The phone check:** draw calls and triangles counted from the page's
     WebGL (headless, by the frame), `main` before Phase 1 against all four
     phases, at the mall's views (the bench's `mall`, from above, Palm Court
     from above, the avenue under the bridge, the promenade, a gallery):
     - desktop: 325 to 329 draws at the mall's view (+4 in every view),
       triangles up about 1.7%;
     - phones: 171 to 173-176 draws, triangles up about 2.9%.
     - The same rise in every view, inside and out, so it's what's drawn
       everywhere (the mall's new people in the crowd, which phones already
       halve), not the buildings: their geometry merges into the mall's
       batches, and the inside is near only. Nothing needed trimming.
   - **Checks:** the type check, lint and `npm test` (1524) pass. The build
     and budget pass (boot 743.9 of 750 KB, unchanged by the roofs: they
     load with the mall).

## The polish after "One mall" (2026-11-19, built)

- **Fittings to Degen's size** (the owner's call: "the mall assets are made
  for a larger character"): one `FIT` in `mall.ts` sizes every seat,
  table, counter, rail, door and entrance across the hall, the Skywalk and
  its station, Palm Court and the forecourt; the solids follow; the
  buildings stay as they are (docs/guide/mall.md).
- **Polish:** Palm Court's and the mall's panel lines say what's inside
  now; the indoor murmur reaches the Skywalk and Palm Court; the world map
  draws the Skywalk, the pavilion and Palm Court's promenade; the rooftop
  plant shows from afar.
