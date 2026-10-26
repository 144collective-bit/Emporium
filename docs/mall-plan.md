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
