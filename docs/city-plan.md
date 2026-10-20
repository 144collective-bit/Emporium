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
  `PLAN` is what the city is built from; `gridPlan()` is today's grid.
  Traffic, pedestrians, collisions, the 2D map, the plots and the server
  move over to reading it.
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
2. **Downtown.** The diagonals, varied blocks, tight buildings and walk-only
   alleys; the hangout square a block from the Emporium; the landmarks
   re-seated on the new blocks; traffic, pedestrians and collisions on the
   new streets; the 2D map in step.
3. **The outer districts.** Gently bending streets, irregular and more
   spacious blocks, the smaller squares and pocket parks, the waterfront
   promenade; the plots and the Dorras lots re-cut to their blocks (same
   prices).
4. **Polish and measure.** Alley and square details, night lighting, every
   width upright and on its side, before and after `?fps` numbers.

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
