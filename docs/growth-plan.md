# Growing Sector 7: the plan

How the city gets many more buildings, and then a bigger world, without
getting slower. Nothing here is built yet. Like the other plans, it waits
for the owner's sign-off one phase at a time. Keep it up to date.

## What the owner asked

- Could the city have ten times the buildings without ruining the game?
- How far can the world's size be pushed?
- Plan the phases for making the world bigger, with everything above in
  them.

The short answer: yes, but not by adding buildings the way the city is
built today. First the city has to learn to draw only what's near you and
in view; after that, density and size are cheap. So the plan has two parts:

- **Part A (Phases 0-4)** makes size cheap. The city looks the same at the
  end of it.
- **Part B (Phases 5-10)** makes the world bigger and fills it.

## Where it stands (measured)

Measured with `?fps`, which reports draw calls and triangles per frame. The
frame rate needs a real device.

| View | Draw calls | Triangles |
| --- | --- | --- |
| Desktop, home view | ~540 | ~1.12M |
| Desktop, walking downtown | ~440 | ~1.2M |
| Phone tier, home view | ~290 | ~0.4M |

- **Buildings:** 39 infill buildings downtown and 9 landmarks. Beyond them:
  the plots, lots, units, market, garage, airport, kart park, Fight Club
  and Liberty Bridge.
- **Collision boxes:** about 300 in `SOLIDS` (`solids.ts`, shared with the
  game server). They are checked one by one.
- **The world:** `EXT` runs from -200 to 240 (440 tiles, about 790 m
  across), and most of it is open land.
  - The ground, the river and the straight roads are each one long mesh
    from edge to edge (`world.ts`).
  - `WORLD_BOUNDS` sits 6 inside `EXT`.
  - Traffic and boats loop inside `CITY_EXT` (-80 to 152).
  - The outskirts' trees are a belt round the town plus a sprinkle out to
    the edge.
  - The skyline ring of towers stands just past `EXT`.
- **How far you see:**
  - The camera's far plane is 440.
  - The haze (`FogExp2` in `sky.ts`, about 0.002-0.018 depending on time
    and weather) has swallowed almost everything by about 150-180 tiles.
  - The sky dome travels with the camera at 400.
  - City view can pull back 220 (`maxDistance`). The pan is held inside
    `WORLD_BOUNDS`.
- **Shadows** already follow the view: the sun's shadow box reaches 30
  either way. But today's merged meshes span whole districts, so they are
  all drawn into the shadow map anyway.
- **The 2D map** has its own extent (`EXT` in `src/lib/city.ts`, -50 to
  130). It doesn't grow with the world.

Rough budgets for a smooth frame:

- **Mid-range phones:** about 300-400 draw calls and 0.5M triangles. The
  phone tier is already near that.
- **Ordinary laptops:** about 1,000 draw calls and 2-3M triangles.
- **Gaming PCs:** far more, but the city is tuned for phones first.

## Why "just add ten times as many" breaks it

- **Everything is drawn all the time.**
  - Draw calls stay low because a district's buildings are merged into a
    few big meshes (`Batch`, `consolidate()`).
  - But a merged mesh covers the whole district, so it's always partly in
    view and is never skipped.
  - Ten times the buildings would be about ten times the triangles: about
    10M on desktop and 4M on phones.
  - The ink outlines draw the scene again for their normal and depth pass,
    and shadows draw it once more. So each extra triangle counts two or
    three times.
- **Everything is built at load.** All the geometry is made in the browser
  when the city boots, so the loading time and memory grow with every
  building. Phones are the first to run out.
- **Collisions check every box.** Walking, driving, the kart, bullets and
  the server's sim test `SOLIDS` one by one. Ten times the boxes is ten
  times the work, every frame.
- **What doesn't grow with buildings:** traffic and pedestrians (they
  follow the roads), the characters, the HUD, and the ink-outline pass
  (which costs by pixels).

## Why "just make `EXT` bigger" breaks it

Doubling `EXT` today wouldn't add a single building, but it would still go
wrong:

- **Things that read the edge would move or stretch.**
  - The airport's site is clamped to `WORLD_BOUNDS`, so its south edge
    would slide.
  - The skyline ring would jump out with the edge.
  - The outskirts' sprinkle of trees would thin to nothing, or double in
    count.
  - The river and road meshes would double in length, and in triangles
    where they're subdivided.
- **Nothing would be out there.** It would just be more grass, and minutes
  of running to cross it.
- **Nothing would get you there.** Traffic only loops inside `CITY_EXT`, so
  there would be no roads worth driving, no landmarks to aim for, and no
  map to find them on.

So the world grows only after Part A, and in steps. Each step brings the
edge out, the roads to reach it, a way to get about, and districts to fill
it.

## How it's built

The rules every phase follows:

- **Tiles.**
  - The world is cut into square tiles of about 60 x 60.
  - Static geometry is merged per tile, not per district. A tile out of
    view, or behind you, is skipped, and so are its shadows.
  - Draw calls become "tiles in view × materials", not "everything".
  - The ground, the river, the roads and the trees are cut into tiles too.
- **Levels of detail, as the crowds already have.** Each building has three
  forms:
  - a near form: the full model, with signs, fire escapes and rooftop
    clutter;
  - a far form: its shape with the windows painted on, a few dozen
    triangles;
  - past the haze, nothing: the skyline ring and the fog cover it.

  A building 150 tiles away is a handful of pixels, so its detail is
  wasted.
- **Repeats are instanced.** A building type used many times (a brownstone,
  a shop, a tower) is drawn as one instanced mesh, like the trees, lamps and
  cars. Its colour and sign are set per instance (`setColorAt`, a row of
  the sign atlas).
- **Built near you, when there's time.**
  - Tiles near the camera are built in spare time between frames, with a
    small time budget per frame.
  - Far tiles are built as their far form only.
  - The boot builds the home view's tiles, so the loader gets shorter, not
    longer.
- **Collisions by grid.**
  - `SOLIDS` is sorted into a grid of cells, so a check only looks at the
    boxes near it.
  - It has to give exactly the same answers as today, for the city and the
    game server alike.
- **Life lives near you.**
  - Cars, pedestrians and boats come from a fixed pool that is spent on
    the roads and pavements round the camera, not spread over the whole
    world.
  - A bigger world doesn't mean more cars in memory, just cars where you
    are.
- **Data first, DOM-free and tested.**
  - The tile grid, the collision grid, the building recipes, the roads and
    the new districts are plain data and functions (like `streetplan.ts`,
    `downtown.ts` and `outer.ts`), tested in Node. The drawing reads them.
  - New districts are seeded, so they're the same for everyone and ready
    for a server.
- **Nothing that exists moves.**
  - Plots, lots, units, landmarks, places, the airport, the kart park and
    the spawns keep their coordinates.
  - Saves carry over without a migration. Growth adds; it never shuffles.
  - Downtown stays at the middle of the map; the world grows round it.
- **Measured at every step.** Run `?fps` before and after, on a real phone
  and a laptop, from the same views and along the same route. A phase that
  makes the city heavier isn't finished.

## Targets

| | Phone tier | Desktop |
| --- | --- | --- |
| Draw calls in view | ≤ 300 | ≤ 700 |
| Triangles in view | ≤ 0.5M | ≤ 1.5M |
| Frame rate | 30fps idle, smooth while touched | 60fps |
| Boot to start menu ready | no longer than today | no longer than today |
| Geometry memory | ≤ 150 MB | ≤ 400 MB |

These should hold however big the city gets: the cost of a frame follows
what's in view, not the size of the world.

## The sizes, step by step

| Step | `EXT` | Across | Running edge to edge | Driving (a mid car) |
| --- | --- | --- | --- | --- |
| Today | -200 to 240 | 440 tiles, ~790 m | ~1.4 min | ~40 s |
| Phase 6 | about -420 to 460 | ~880 tiles, ~1.6 km | ~2.7 min | ~75 s |
| Phase 10 (optional) | about -680 to 720 | ~1,400 tiles, ~2.5 km | ~4.3 min | ~2 min |

Degen runs 5.4 tiles a second. The cars' top speeds are 7-16 tiles a
second. All three steps keep downtown in the middle.

---

# Part A: making size cheap

## Phase 0: the measuring kit (built)

- **More readouts in `?fps`** (`index.ts`):
  - the shadow map's draws and triangles, apart (`post.shadowStat`, counted
    round three's shadow pass);
  - geometry and texture memory (`sceneMemory()` in `perf.ts`: every
    geometry, instance buffer and texture the scene draws, counted once);
  - how long the boot took: art, building the scene, compiling shaders and
    the first frame.
  - Tiles drawn, built and waiting come with Phase 1, when there are tiles.
- **The benchmark, `?bench`** (`bench.ts`):
  - goes straight into the 3D city, sets clear day (`?bench=night` for
    night), holds quality where the tier put it and turns off the phones'
    idle 30fps;
  - measures fixed views (`BENCH_VIEWS`: home, a downtown street at eye
    level, the square and the Emporium, the Build overview, the airport, the
    kart park and the far edge looking back), each settling for a second
    and measured for four;
  - then flies a 40 s route through them and back home;
  - reports, for each: frames a second; average, 95th-percentile and
    slowest frame; the CPU's share; draws and triangles (average and most),
    the shadow map's; then memory and the boot;
  - shows them in a card on the page, the console and `window.__bench`.
  - The views stay where they are when the world grows, so later phases
    compare like for like. A bigger world adds views; it doesn't move
    these.
- **The layout snapshot** (`tests/snapshot.test.ts`, `tests/fixtures/layout.json`):
  - every landmark, door, spawn, pad, lot, plot district, market stall,
    unit, the airport, kart park, Fight Club, Liberty Bridge, downtown's
    buildings and every street, as they stand;
  - a street's end at the world's edge is written as `'edge'`, so the edge
    can move out without the street "moving";
  - a test fails if anything moves. Only when the owner moves something on
    purpose: `UPDATE_SNAPSHOT=1 npm test -- snapshot`.
- **Today's numbers:** see "Benchmark, today" below. Real phones and
  laptops go in as the owner runs them.

### Benchmark, today

BENCH_RESULTS

## Phase 1: tiles and the collision grid (nothing new to see)

- **`tiles.ts`** (DOM-free, tested):
  - the tile grid over `EXT`;
  - the tile a point is in;
  - the tiles near a point;
  - the tiles inside a view (a frustum against each tile's box, with a
    height for its tallest building).
- **The collision grid** over `SOLIDS` and the plots', units' and lots'
  solids:
  - used by walking, driving, the kart, flying (`HULLS`), bullets and the
    server;
  - placed buildings update their cells when they change;
  - the tests check it answers exactly as the one-by-one check does, over
    thousands of random points and moves.
- **Static geometry merged per tile instead of per district:**
  - `Batch` learns to split by tile;
  - `consolidate()` merges per landmark per tile;
  - frustum culling is on for the tile meshes.
- **The long meshes cut into tiles too:** the ground, the river, the
  straight roads and their markings, the kerbs, and the instanced trees and
  lamps (one instanced mesh per tile and kind, or a tile range inside one
  instanced mesh).
- **Shadows:** only tiles inside the sun's shadow box are drawn into the
  shadow map.
- **Done when** the city looks the same and the benchmark shows fewer
  triangles (in the colour pass and the shadow map) and no more draw calls
  than today.

## Phase 2: near and far buildings

- **A far form for every infill type and landmark:**
  - its outline;
  - the windows and lit windows painted on from the wall atlas;
  - a lit crown where it has one.
- **Swapped by distance, per quality tier,** with a cross-fade or a dither
  so nobody sees the swap.
- **Far forms neither cast nor receive shadows.**
- **The ink outlines still draw round far forms** (they're Degen's style),
  just with fewer edges.
- **Some things stay as they are,** because they're meant to be seen from
  far away: pins, the Emporium's hologram, the blimp, Liberty Bridge's
  flames and the aircraft.
- **Done when** the far edge of the benchmark route costs a fraction of
  today's and nobody can see the swap happen.

## Phase 3: building as you go

- **Boot builds only the tiles round the home view.** The rest are built a
  few at a time in spare time between frames: nearest first, far forms
  before near ones.
- **Tiles far from the camera drop their near form.**
  - It is kept for reuse up to a memory budget per tier, so coming back
    costs nothing.
  - Past the budget it's freed and rebuilt from data later.
- **Places stay ready:** walk mode, the fly-in and every panel's camera
  move ask for their tiles first. Walking or driving fast pulls tiles
  ahead along the way you're going.
- **The fly-in and the start menu hide anything still building.**
- **Done when** boot time stays flat however many tiles there are, and
  memory stays inside the targets on the benchmark route.

## Phase 4: building kits

- **Recipes for blocks** (DOM-free, seeded):
  - a district's density;
  - its mix of building types, heights and setbacks;
  - its alleys and front details;
  - all laid out from the street plan's block outlines.

  A new district then becomes a few lines of data, not hand-placed
  buildings.
- **The infill's building types as instanced kits:**
  - brownstone, shop, diner, loft, office and hotel;
  - colour and sign set per instance;
  - a hundred brownstones cost about one draw.
- **New kits for the new districts:** warehouse, factory shed, terrace
  house, detached house, school, mall, stadium stand, crane. Each comes in
  a near form and a far form.
- **Collisions come from the same recipe,** so the kits' footprints go
  into the collision grid with no hand-written boxes.
- **Signs stay fixed copy from `SIGNS`:** made-up names, never the token.
- **Heights stay well under the Emporium,** so it stays the tallest.
- **Done when** a test district of about 300 buildings stays inside the
  targets.

---

# Part B: a bigger world

## Phase 5: the edge as data (nothing new to see)

Everything that reads the world's edge is made to scale with it, before
the edge moves:

- **Freeze what mustn't move.**
  - The airport's `SITE` gets fixed numbers instead of clamping to
    `WORLD_BOUNDS`.
  - The same check applies to the kart park, the Fight Club, the south
    bank's places and anything else written against the edge.
  - Phase 0's snapshot test guards it.
- **The land, river and roads come from tiles** (Phase 1), so a longer
  river or road costs nothing outside the view.
- **The outskirts' trees** are seeded per tile with a density per area, not
  a fixed count spread over the whole world. A bigger world gets more
  trees, never thinner ones.
- **The skyline ring:**
  - it follows the edge at a set distance, its towers per tile so only
    the visible arc is drawn;
  - it still leaves out the airport's approach;
  - it goes far form only (it's past the haze anyway).
- **The camera and sky:**
  - the City-view pan limit and the Build overview are worked out from the
    built-up area, not hard-coded;
  - the far plane and sky dome stay at 440 and 400, since the haze hides
    everything past about 180 and the dome travels with the camera;
  - the haze is checked so the new edge never shows as a hard line.
- **Flying:** `CEILING` stays. `EDGE_TURN` and the airport's timetable read
  the bounds, and `tests/airfield.test.ts` keeps them inside.
- **Driving:** `RIVER_WALLS` and the bridges' gaps come from the street plan
  data, not from `EXT`.
- **Done when** `EXT` can be changed in one place, the tests pass at both
  today's and Phase 6's size, and today's city looks the same.

## Phase 6: the edge moves out

- **`EXT` grows to about -420 to 460** (about 880 tiles, 1.6 km across).
  The details:
  - `WORLD_BOUNDS` follows it.
  - `CITY_EXT` stays until Phase 7 brings roads.
  - The river runs on to the new edge both ways.
- **What's out there for now:** the outskirts' land (lawns, woods, the tree
  belt carried on), the skyline ring further out, and the far-off roads as
  plain continuations of today's (no traffic yet).
- **Nothing in town changes.** The kart park, the airport and the south
  bank stay where they are.
  - The airport gains open land round its approach, so the ring of towers
    can come closer elsewhere.
  - The kart park's fence keeps its line; the land past it stays open.
- **Done when** the targets hold at the new edge on the benchmark route,
  and walking, driving, flying and the kart park behave exactly as before
  inside the old edge.

## Phase 7: roads to reach it

- **A network beyond the Parkway and the Southside Loop**, all in
  `streetplan.ts` (tested):
  - a ring highway well outside the bends: two lanes each way with a
    median and gentle curves, joined to the avenues by slip roads;
  - today's arterials carried on out as avenues;
  - local streets only where districts come later (Phase 9).
- **More bridges over the river,** further out east and west, so the far
  banks join up. Each one has a gap in `RIVER_WALLS` and its own boat
  clearance.
- **Traffic over the whole network:**
  - `routes.ts` generates its routes from the street plan rather than by
    hand;
  - lights and junctions come from data;
  - cars are spent where you are (the pool rule above), so the busiest
    stretch is always the one you're on;
  - cars still follow whoever is ahead.
- **Boats:** they run the whole river, spent near you, under every bridge.
- **The aircraft:** the timetable's routes can widen to fly over the new
  land (the owner's call). They still stay high over town, and the tests
  still pass.
- **Driving feel:** the highway lets the faster cars stretch their legs.
  No new handling is needed, but the drive sim's tests are checked for
  long straights and slip roads.
- **Done when** you can drive the ring highway round the whole city, with
  traffic, inside the targets.

## Phase 8: getting about (the owner picks)

- **The world map:** a full-screen map from the ☰ Menu (and M while
  walking).
  - It is drawn from the street plan data: roads, the river, districts,
    places, your car, your aircraft and your kart's pits.
  - It is not the 2D poster: the 2D map stays downtown, the loading poster
    and the fallback without WebGL.
  - Tapping a place opens its panel, as the directory does.
- **Waypoints:** pick a place on the map and a beam (`beacons.ts`) and a
  marker on the compass lead you there.
- **Ways to cross the city** (pick any):
  - **Your car, aircraft and kart**, as today. The map shows where you
    left each one, and "Bring my car" calls the car to the nearest road.
  - **A metro:** an elevated line with stations downtown and in each new
    district. You board on the platform and ride a short trip with the
    city passing below, then step off at the next station. It brings one
    new train model and station kits.
  - **Taxis:** wave one down at any kerb and pick a place, then ride in the
    back with the camera outside, or skip the ride.
  - **Fast travel:** from the map, to places you've already walked to (a
    list in the save). It's quick and simple, but it makes the city feel
    smaller.
- **Sound:** the city's ambient sound follows the district you're in. It
  stops centring on the Emporium (`spots[0]`) when you're far from
  downtown.
- **Done when** any place on the map is a minute or less away, by the way
  the owner chose.

## Phase 9: filling the map (each district its own sub-phase)

The open land inside the new edge is room for several districts. Each one
is its own PR and the owner's call, built from Phase 4's kits. For
example:

- **9a Docklands**, along the river east and west of town: warehouses,
  cranes (still), container stacks, a ferry pier with its own boat, and a
  waterfront market.
- **9b An industrial east:** factories, rail yards, depots and
  chimneys (steam, not smoke, on the phone tier). It's a home for the
  economy's bigger lots: more `BIG_LOTS`, at prices the owner sets.
- **9c Suburbs**, north and west: low houses with gardens, quieter
  streets, a school, a mall and a little main street. There's more land
  per building, so it's cheaper per tile.
- **9d A park district:** a big green with a lake, paths and boats on the
  lake. Optionally a stadium or a fairground (the owner's pick).

Every district comes with the same set of things:

- **Its roads** (`streetplan.ts`), traffic (`routes.ts`) and pedestrian
  loops. The pavements carry crowds from the shared crowd.
- **Its recipe** (density, type mix, heights), its squares and parks, and
  its trees.
- **The 2D map rule:** new districts stay 3D only, like the ring and the
  plots today. They are drawn on the world map from data.
- **Places, if the owner wants:** a pin, a panel and a directory entry for
  each new place. Places not built yet say "coming soon".
- **Plots or lots for sale, if the owner wants,** at Dorras prices the
  owner sets. They get new ids, so old saves are untouched.
- **Missions and Getting started:** new districts can add missions
  (`missions.ts`) and contract drop-offs (`destAt()`) later. That's the
  owner's call.
- **Tests:** the district's data (`tests/<district>.test.ts`), its
  footprints in the collision grid, its roads and routes, and the snapshot
  test still passing.
- **Done when** the district is inside the targets on its own stretch of
  the benchmark route.

## Phase 10: bigger still (optional)

- `EXT` grows again, to about 1,400 tiles across (2.5 km), only if Phases
  6-9 hold the targets and the owner wants more room. The same rules
  apply: the edge moves, then roads, then districts.
- **Precision isn't a limit:**
  - three.js stays accurate to well under a millimetre this far from the
    centre;
  - shaking only starts at about 10 km;
  - the shadow box and the sky dome already follow the camera.
- **Memory is the limit on phones.** That's why Phase 3's budget frees near
  forms, and why far forms are kept small.

---

## What has to keep working

- **Saves:** the tycoon save, plots, lots, units, your car, aircraft,
  kart, look and backups (`backup.ts`). Nothing that exists moves, so
  nothing needs migrating. New things get new ids and new save fields,
  with `cleanSave()` upgrading old saves as usual.
- **The game server** (paused):
  - it bundles `solids.ts` and the sims, so the collision grid has to stay
    DOM-free and give the same answers there;
  - when multiplayer resumes in a bigger world, the room should only send
    each player the players near them (a note for `docs/multiplayer-plan.md`).
- **The 2D map:** it shows downtown and stays the loading poster and the
  fallback without WebGL.
- **Every test**, plus new ones for the tile grid, the collision grid, the
  snapshot, every recipe, every new road and every district.
- **The design rules:** ink outlines, minimal bloom, nothing flush,
  reduced motion (no traffic or fly-in; a metro or taxi ride becomes a
  cut), phones first, one render loop.
- **The content rules:** made-up names and signs only, never the token.
  Dorras are game numbers. No real places, brands or partners.

## Open questions for the owner

- **How big:** fill the current map first (Part A, then Phase 9 inside
  today's edge), or grow the world too (Phases 5-8)? And how far: Phase 6's
  1.6 km, or on to Phase 10's 2.5 km?
- **Which districts, in what order?** Docklands, the industrial east,
  suburbs, a park district, or something else?
- **How dense:** downtown-tight everywhere, or looser further out (as the
  redesign does today)?
- **Plots and lots:** should new districts carry them for sale, and at
  what prices?
- **Getting about:** how should players cross a bigger city? Car and
  aircraft only, or a metro, taxis or fast travel (and if fast travel,
  only to places you've already been)?
- **The aircraft:** should the airliners' routes widen over the new land?
