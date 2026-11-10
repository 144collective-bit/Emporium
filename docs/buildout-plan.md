# Building out to the walls (the owner's call, 2026-11)

The owner wants the whole map inside the wall built up eventually, and the game still
running in a browser, on phones too. This plan is how to get there safely: the
engineering first, measured at every step, then the land filled district by
district. It's a plan only: nothing here is built until the owner signs off a
phase. Keep it up to date. The wall itself is `docs/wall-plan.md` (paused at the
owner's word, Phases 3 to 6 on the branch, not merged).

## The owner's answers (2026-11-10)

| Question | Answer |
| --- | --- |
| Can it be done? | Yes, with the engineering below first. Desktop has room; phones set the limit. |
| How the land fills up | **A mix**: districts with their own character near the centre (as The Trenches, Crestmont, Uptown were made), quicker kit-built blocks (`kits.ts`, `recipes.ts`) towards the walls. |
| Which phones | **Mid-range phones too**: not only the newest ones. |
| How to start | **Write it up as a plan first** (this file). |

## Where things stand (measured)

- **The land:** inside the wall's inner face is 1,560 tiles each way (`WALL_INNER`,
  wall.ts), about 2.43M square tiles, about 7.9 km² (a tile is about 1.8 m).
  The seam map (`seams.ts` `landMap()`, a 2-tile grid) puts it at:
  - **open:** about 79%, the 1.44M inside the old edge plus the 0.47M strip from
    the edge to the wall. That's 67% to 79% of each quarter, the south-east the
    most built;
  - **water:** about 4%;
  - **built:** about 18%, streets included.

  So the whole map built up is roughly **four to five times today's built city**.
- **Phones are already at their limit.** The performance plan's last measurement
  (`docs/performance-plan.md`, "The world at 2.5 km") put phones' geometry at
  about 210 MB with every district loaded, already past its own 150 MB target. Its
  items 5 and 6 (letting far districts go on phones, far districts as simple
  blocks) were named as the way back under it, and haven't been built.
- **The far view.** That plan also said far districts as simple blocks are worth
  building once the far view passes about 60,000 triangles from the overview. A
  built-up map would pass it.
- **The start.** Every district's streets, solids, traffic routes and places are in
  the boot today (the boot's code budget is 740 KB, raised many times as districts
  came; the baked routes are a fetched file). Four or five times the city can't all
  come at the start.
- **What already scales:**
  - tiles drawn only in view (`tileBatch()`);
  - near and far forms;
  - sites built as you go, off the main thread;
  - districts' drawings loaded as you approach (`LAZY_DISTRICTS`);
  - traffic and boats spent near you;
  - the collision grid (`BoxGrid`) and `addSolids()`.

  None of these grow with the size of the map, only with what's near.

## The targets (to agree in Phase 0)

- **A mid-range phone** (about four years old, not a flagship): 30 frames a second
  steady walking and driving, the City view smooth, no stalls over 100 ms when a
  district loads, geometry under the performance plan's 150 MB, the tab never
  reloaded by the browser for memory.
- **A desktop:** 60 frames a second, the detail as it is today.
- **The start:** the boot's download and time no worse than today's, however big
  the map gets.

## Phases

Each phase with the owner's sign-off, measured before and after (`?bench` on a
real phone and a laptop, Copy results; the headless bench's draws, triangles and
memory; `npm run shots`). Nothing that exists moves (the snapshot test).

### Phase 0: the baseline on real devices

- The owner runs `?bench` on their own phone (and an older one if there's one to
  hand) and a laptop, and pastes Copy results. The numbers go in this plan.
- Agree the targets above against them. Name the slowest phone it must run on.

### Phase 1: a test fill, to measure before building

- Behind a switch in the address (`?fill=test`, never on by default), lay ordinary
  kit-built blocks (`recipes.ts` `layDistrict()`) over a big stretch of open land,
  about the size of the whole town, as sites like any district.
- Measure what it costs at its densest and from far off: draws, triangles,
  geometry and texture memory, the boot, the sites, frame times on the phone.
- Extrapolate to the whole map. Decide with the owner whether Phases 2 to 4 are
  enough, or the targets or the density need to change.
- The test fill is taken out after; nothing of it stays in the city.

### Phase 2: letting far districts go (memory)

- Today a far tile lets its near pieces go past the tier's `nearBudget`, but keeps
  its far pieces, and a district's chunk stays loaded for good once it's come.
- Let a whole district go when you're far from it: its sites' pieces (near and far),
  the main thread's parts (its moving things, its people in the crowd's spare
  slots), its textures. Built again as you come back, ahead of you (as
  `REBUILD_LEAD` does today), so nothing pops in on screen.
- On phones first; on desktop only if the numbers ask for it.
- Done when phones' geometry is back under 150 MB with today's city, wherever you
  stand.

### Phase 3: far districts as simple blocks (the far view)

- Past a distance (about 250 to start, to measure), a tile's buildings are drawn as
  a few boxes and roofs from their footprints (an impostor), with its lit windows
  as a texture, not every building's far form. One draw for all of them.
- The horizon's draws and triangles stay flat however much is built.
- The far blocks are data worked out at build time (`baked()`), so the browser
  doesn't make them.

### Phase 4: the world's data downloaded by region

- The boot keeps only what's needed everywhere:
  - the arterial roads and the highway;
  - the places on the world map;
  - the road graph for taxis, packed small.
- A region's blocks, solids, traffic routes, lamps, trees and people come with
  its district's chunk, and go with it (Phase 2): the collision grid's
  `addSolids()` and a matching remove, the traffic's routes per region.
- The game server (multiplayer) still bundles everything: it has no download to
  worry about.
- The tests run on the whole map as they do today. Only what's downloaded
  changes, not what exists.

### Phase 5: the land plan

- A master plan for the map inside the wall (its own document, as `city-plan.md`
  was for the town):
  - **zones:** character districts near the centre, kit-built filler towards the
    walls;
  - **roads:** the country roads becoming streets as land fills, new arterials, a
    second ring;
  - **the order:** a ring at a time out from the highway;
  - **getting about:** metro lines and stations further out, taxis, fast travel;
  - **room for the wall's exits** later.
- Roads change here for the first time since the wall: only with the owner's
  sign-off.

### Phase 6 and on: filling the land

- **Districts with their own character** near the centre, each its own plan, as
  every district so far.
- **Kit-built filler** towards the walls:
  - new recipes for kinds of land the kits don't have yet: industrial estates,
    retail parks, farms and fields near the wall, a rail yard;
  - each laid by `layDistrict()` from a few lines of data, as sites, with its
    collisions from the same recipe.
- Measured after each district against the targets. If a phone falls under them,
  stop and fix before the next.

## The risks

- **Mid-range phones are the hard part.** Phases 2 to 4 are what make it possible;
  if the test fill shows they're not enough, the far view on phones gets plainer
  (fewer far details, a nearer haze), not the near city.
- **Time.** Hand-made districts take several phases each. The kit-built filler is
  quick but plainer; new recipes and kits make it richer.
- **The start-up download** must not creep back as districts come: Phase 4 has to
  come before the land fills, and the budget stays where it is.
- **The tests and the build** grow with the map (the whole suite runs in a few
  minutes today); keep an eye on them as districts come.

## Open questions for the owner

1. **Where the test fill goes** (Phase 1):
   - A) the open land north-west, between Westlake Park, the kart park and the
     wall (the largest open quarter);
   - B) the south-east, past the airport;
   - C) wherever measures worst (the densest view from town).
2. **Desktop:**
   - A) the same city as phones;
   - B) more detail on desktop as the map fills.
3. **The kit-built filler's look:**
   - A) like the town's outer blocks;
   - B) its own plainer, greyer dystopian look towards the wall;
   - C) varied by zone.
