# Degen City redesign: the plan

The city is moving from a perfect grid to a city that feels like it grew:
planned in the middle, looser further out. This is the plan the owner agreed,
and where each phase stands. Keep it up to date.

## What the owner asked for

- **Mixed by district.** Downtown stays fairly planned but varied; the outer
  districts loosen up.
- **Diagonals.** Two or three diagonal streets cut across downtown.
- **Varied blocks and alleys.** Blocks of different sizes and shapes, back
  alleys, buildings set back or turned. **Alleys are walk-only** (no cars).
- **Plazas and parks.** **One big hangout square**, its own square **a block
  away from the Emporium** (the Emporium keeps its street front), and
  **smaller squares and pocket parks further out** from the centre.
- **Density by area.** Packed tight downtown, more spacious further out
  (yards, trees, a waterfront promenade).
- **Open to a full redesign.** Every place can move; every place still
  exists. Plots and lots can change shape, size and position. **Prices stay
  as they are**; pricing changes come later and are the owner's call.
- **Optimise as we go.** Every step keeps the city sleek: measured with
  `?fps` before and after, never heavier than before.

## How it's built

- **The street plan is data** (`src/scripts/city3d/streetplan.ts`,
  DOM-free): streets as centre lines with a kind (`street`, `avenue`,
  `alley`) and a width, the crossings where they meet (with or without
  lights), blocks as outlines with what stands on them, and plazas.
  `PLAN` (`cityPlan()`) is what the city is built from; `gridPlan()` is the
  plain grid. Downtown's layout is `downtown.ts`; traffic follows
  `routes.ts`; pedestrians, walking, driving, the 2D map and collisions read
  the plan's block outlines.
- **Merged as it's built.** Plain colours share one material with the colour
  per vertex, neon shares one per brightness, and a building's parts merge
  into as few meshes as possible (`Batch`, `mergeMeshes()`, `consolidate()`
  in `kit.ts`). New buildings are written this way from the start.
- **Saves carry over.** The tycoon save, plot owners, your car and your look
  are kept; anything that moves gets a migration, never a reset.

## Performance targets

Checked with `?fps` at every step (and on a real phone):

- Draw calls per frame well under today's, heading for about 150 a pass.
- Triangles no higher than today.
- Phones keep their frame rate (30fps idle, smooth while touched).

## Build order

1. **Plan and foundation** (built).
   - This plan.
   - The street plan as data (`streetplan.ts`, with `gridPlan()` describing
     today's grid) and its tests (`tests/streetplan.test.ts`).
   - Shared materials and merging: plain colours and neon fold into shared
     materials per Batch (`sharedFor()`), several Batches' meshes merge per
     building (`consolidate()`), moving things merge their fixed parts
     (`mergeMeshes()`: drones, boats, dummies), the traffic lights and the
     birds are instanced, the skyline ring and the rain sheen are a few
     meshes, boxes with side and top materials are two draws, not six
     (`sidesBox()`), and the shadow map is drawn once a frame instead of once
     per pass.
   - Result (desktop / phone tier, the `?fps` readout): draw calls per frame
     about 1,830 / 1,030 before, about 725 / 575 after; triangles about
     1.2M / 0.54M before, about 1.0M / 0.54M after. No visible change.
2. **Downtown** (built).
   - Downtown grows to 0-60 inside the ring, with cross streets at 17 and 43
     and three diagonals from the ring's corners (north-west, north-east,
     south-west), cutting those corner blocks into triangles: three pocket
     parks and three of infill.
   - The landmarks re-seated on 9 x 9 lots (`SEATS`), two to a block in the
     north, west and east blocks, the Emporium on the centre block fronting
     the square, the Armoury in the south-east. The Post office and Drop 001
     front courtyard lanes.
   - Tight infill round them: 40 buildings with shopfronts, awnings and neon,
     whole floors, roofs with plant; walk-only alleys with bollards; the GM
     water tower on a roof. Built from six facade and three shopfront
     materials (UVs in world units), merged into a handful of draws.
   - The hangout square on the south block: stage and screen facing south,
     dance floor, benches, kiosks, fountain, planters, string lights, a crowd.
   - Traffic on routes with turns, down the diagonals and back, three-phase
     lights where a diagonal comes in; pedestrians round the block outlines;
     walking, driving and collisions on the new slabs.
   - The 2D map in step (a wider view of the bigger downtown).
   - Result (desktop / phone tier, the `?fps` readout at the home view): draw
     calls about 725 / 575 before, about 620 / 570 after (infill walls share
     one atlas material, one neon, one set of string-light points; phones get
     a smaller crowd on the square); triangles about 1.0M / 0.54M before,
     about 0.95M / 0.54M after.
   - Then, at the owner's request, the infill made as good as the landmarks:
     six building types, the owner's three named shops (Crypto Coffee,
     Dave's Validator, Golden Crumpet) and made-up shop signs, facade depth,
     rooftops and street life, a few towers to break the skyline. Draw calls
     unchanged (about 620 / 570); triangles about 1.04M / 0.56M (from
     0.95M / 0.54M), the finest details left out on phones.
3. **The outer districts** (built).
   - The Parkway: a gently bending street round the north half of the city
     (a soft-cornered U from the north bank avenue round to the north bank
     avenue, about 40 north of the ring); the Southside Loop round the south
     row. Both with sidewalks, lamps, centre lines and traffic.
   - 16 landscaped blocks between the ring and the bends, cut by the
     arterials. The plots and the Dorras lots keep their 9 x 9 pads in the
     same places (owners' buildings and prices unchanged), now with lawns
     and trees round them.
   - Four small squares further out (a fountain, a statue with the
     Emporium diamond, a bandstand, a clock tower) and four pocket parks.
   - The waterfront promenade: railings, trees, benches and viewing decks on
     both banks.
   - Result: draw calls unchanged (about 620 / 570); triangles about 1.04M /
     0.50M (from 1.04M / 0.56M), after the lane markings became flat planes
     and the outskirts' tree belt was thinned to match the trees now in town.
4. **Polish and measure** (built).
   - Alleys dressed from the bollards back: a caged wall lamp with a pool of
     light under it, a drainpipe, pallets leaning on the other wall, stacked
     crates and a bin at the back (`ALLEY_PROPS`, solid when walking; the
     middle stays clear end to end).
   - The outer squares: light bollards in pairs at the north and south ways
     in (solid), flush uplights in a ring round each centrepiece.
   - Night lighting balanced, at the owner's request: big lit surfaces
     (infill windows and shopfronts, landmark windows, the stage screen,
     shop and site signs) toned down so they keep their colour instead of
     flaring white close up; kiosk roofs carry a neon trim instead of a
     whole glowing roof; lit panels bigger than a tube (kiosk hatches,
     bollard caps) glow softer; street-lamp bulbs and halos a touch lower.
     Thin neon tubes keep their glow.
   - Checked at 320, 375, 768, 1024 and 1440 wide, phones and tablets
     upright and on their side, in City view and walking: no sideways
     scroll, no walk controls overlapping.
   - Result (desktop / phone tier, the `?fps` readout at the home view):
     draw calls about 620 / 565 before, about 624 / 570 after (the alley
     pools share the street lamps' pools; one softer neon per batch);
     triangles unchanged (about 1.05M / 0.50M). Day and night read the
     same within the traffic's jitter (about 630-640 / 330-345 once the
     phone tier settles).

Each phase gets the owner's sign-off before the next one starts.

## Still to do for performance

- **Signs on one texture sheet.** Each sign has its own canvas texture, so
  each is its own draw. Packing the static ones onto a shared sheet would
  merge them (the LED wall, the ticker and the arcade pad redraw every few
  frames and stay apart).
- **The outline pre-pass.** The ink outlines draw the solid scene a second
  time; drawing normals and colour in one pass would save that.
- **Landmarks rebuilt merge-ready.** Their loose meshes (signs, glows, small
  props) are merged as each one is rebuilt for the new layout.
