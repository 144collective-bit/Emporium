# Growing Sector 7: the plan

How the city gets many more buildings, and then a bigger world, without
getting slower. Phases 0-7 are built. Like the other plans, it waits
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

Measured headless (swiftshader, no graphics card), so frame rates are left
out: only draw calls and triangles mean anything here. Draws and triangles
include the shadow map's, shown after the slash. Real phones and laptops get
their own rows as the owner runs `?bench` on them.

| View | Medium tier (1280 × 800; headless picks medium) | Low (phone) tier (390 × 844) |
| --- | --- | --- |
| Home view | 546 draws (144 shadow) · 1.14M tris (0.38M) | 295 draws · 0.40M tris |
| Downtown, street level | 637 (164) · 1.40M (0.38M) | 269 · 0.37M |
| The square and the Emporium | 483 (144) · 0.99M (0.30M) | 247 · 0.38M |
| Every district (Build overview) | 674 (141) · 1.45M (0.45M) | 348 · 0.51M |
| The airport | 263 (56) · 1.13M (0.33M) | 161 · 0.52M |
| The kart park | 142 (29) · 0.62M (0.21M) | 109 · 0.29M |
| The far edge, looking back | 760 (122) · 1.19M (0.25M) | 564 · 0.66M |
| Route (average / most) | 522 / 869 draws · 1.11M / 1.76M tris | 281 / 602 · 0.45M / 0.86M |

- **Memory:** geometry about 27 MB on the medium tier and 24 MB on the
  phone tier; textures about 90 MB on both (118 of them).
- **Boot (headless):** medium tier 19.3 s (art 5.4, building the scene
  7.9, shaders 0.1, first frame 5.9); phone tier 10.8 s (1.8, 4.6, 0.1,
  4.3). On a real device the first frame is far quicker; the build time is
  what Phase 3 shortens.
- **What it shows:**
  - The phone tier has no shadows (0 shadow draws).
  - The worst view is the far edge looking back, where the whole city is in
    view at once. On the phone tier it's 564 draws, well over the target
    (300). That's what tiles and far forms (Phases 1-2) are for.
  - The route peaks at 869 draws on the medium tier and 602 on the phone
    tier, both over the targets.

## Phase 1: tiles and the collision grid (built)

Nothing new to see; the city draws less of itself.

- **`tiles.ts`** (DOM-free, tested in `tests/tiles.test.ts`):
  - the tile grid, `TILE` 30 (about 54 m; the sun's shadow box, 60 across,
    covers four to nine of them; smaller than the 60 first planned, so the
    culling is finer);
  - the tile a point is in, the tiles near a point, and the tiles in a view
    (the same test three.js makes, checked against it).
- **The collision grid** (`boxgrid.ts`, tested in `tests/boxgrid.test.ts`):
  - `BoxGrid` sorts boxes into cells of 8; a query gives every box touching
    an area, in the list's own order, so the caller's own test gives the
    same answer as before;
  - used by walking (`SOLID_GRID`), the walk camera (`CAMERA_GRID`),
    bullets (`rayBoxes()`, the game server too), and driving and flying (the
    boxes within `reachOf()` / `flyReach()` of the vehicle);
  - the tests hold every check to exactly the one-by-one answer over
    thousands of random points and rays, and run cars (the fastest one) and
    all three aircraft through hundreds of steps with only the near boxes,
    ending every step exactly where they would with all of them;
  - placed buildings, units and lots stay a short list checked as before
    (there are few of them).
- **The city's fixed geometry merged per tile** (`tilebatch.ts`,
  `tileBatch()`):
  - every Batch built straight onto the scene, and the airport's and kart
    park's, is split by the tile each triangle's middle is in, and each
    tile's share becomes one piece of a `BatchedMesh` per material;
  - so it's still one draw call per material (fewer than before, since the
    airport's and kart park's Batches join the rest), but three.js draws
    only the pieces in view, and in the shadow map only those in the sun's
    shadow box;
  - the trees, lamps and road markings were instanced across the whole map
    (never culled); they go through a Batch now (`Batch.instances()`) and
    are split by tile with the rest;
  - the landmarks keep their own merged meshes (they lift on hover);
  - the long road and river meshes aren't cut: they're a few triangles, and
    a piece too big for one tile is simply drawn whenever it's in view.
- **Moving things culled for the shadow map:**
  - the crowds and the traffic were drawn into the shadow map wherever they
    were in view; now the people and cars in the sun's shadow box take the
    front instances, the rest the back, and the shadow map draws only the
    front ones (`CROWD_VIEW.shadow`, from `sky.shadowFrustum()`);
  - the traffic was drawn whole every pass (frustum culling off); now only
    the cars in view are drawn.
- **The readout** (`?fps`) shows how many tile pieces were drawn.

### Benchmark after Phase 1

Headless again (draws and triangles only; shadow draws and triangles are
part of the totals). Phase 0's numbers, then Phase 1's:

| View | Medium tier: draws | Medium tier: triangles | Phone tier: draws | Phone tier: triangles |
| --- | --- | --- | --- | --- |
| Home view | 546 → 517 | 1.14M → 0.81M | 295 → 276 | 0.40M → 0.32M |
| Downtown, street level | 637 → 571 | 1.40M → 0.97M | 269 → 255 | 0.37M → 0.27M |
| The square and the Emporium | 483 → 431 | 0.99M → 0.58M | 247 → 236 | 0.38M → 0.29M |
| Every district (Build overview) | 674 → 639 | 1.45M → 1.12M | 348 → 335 | 0.51M → 0.42M |
| The airport | 263 → 205 | 1.13M → 0.61M | 161 → 137 | 0.52M → 0.41M |
| The kart park | 142 → 79 | 0.62M → 0.14M | 109 → 85 | 0.29M → 0.18M |
| The far edge, looking back | 760 → 726 | 1.19M → 1.03M | 564 → 554 | 0.66M → 0.60M |
| Route, average | 522 → 493 | 1.11M → 0.75M | 281 → 234 | 0.45M → 0.33M |
| Route, most | 869 → 808 | 1.76M → 1.46M | 602 → 583 | 0.86M → 0.78M |

- **The shadow map** on the medium tier: 0.38M triangles at the home view
  down to 0.25M, and 0.21M at the kart park down to 0.04M.
- **Walking downtown** (medium tier): about 384 draws and 0.60M triangles,
  from about 440 and 1.2M.
- **Memory:** geometry 27 MB → 35 MB on the medium tier (the trees, lamps
  and markings are now real geometry, not instances). Textures unchanged.
- **Boot:** the same within the noise (building the scene about 8.5 s on
  the medium tier and 4-6 s on the phone tier headless, before and after).
  Compiling shaders takes about 0.3 s longer for the batched versions.
- **Still over the targets:** the far edge and the Build overview, where
  the whole city is in view at once (554 draws on the phone tier). Tiles
  can't help there; that's Phase 2's far forms.
- **To check on real devices:** `BatchedMesh` draws with one call where
  the browser has `WEBGL_multi_draw` (Chrome, Edge, Firefox; Safari's
  newer versions). Where it doesn't, three.js draws each piece on its own
  and `?fps` shows more draws: worth a look on an iPhone.

## Phase 2: near and far forms (built)

Past the tier's swap distance (`far` in `TIERS`: 120 on the high tier,
110 medium, 90 on phones), things are drawn in a far form. `isNear()`
(`tiles.ts`, tested) decides from the camera's distance to the thing's box,
with a margin of 8 so nothing flickers on the line.

- **Downtown's buildings: details near only.**
  - A Batch can mark what it adds as near only (`Batch.detail()`,
    `Batch.lod`). `tileBatch()` keeps each tile's near pieces apart and
    swaps them per tile (`update()`), inside the same batched meshes, so the
    swap costs no draw calls.
  - At every distance: the walls (the wall atlas, so the windows and lit
    windows stay), roof slabs, signs, the diner's neon and the offices' lit
    crowns.
  - Near only: stoops, cornices, string courses, bay windows, balconies,
    fire escapes, awnings, rooftop tanks, huts, masts and gardens, and the
    street fronts' tables, planters and bikes.
  - Near only too: the alleys', lanes' and parks' dressing, benches,
    bollards, the promenade's railing posts and the street lamps (their
    halos still glow far away at night).
- **Every place has a far form** (`farForm()` in `lod.ts`): the
  landmarks, Liberty Bridge, the airport's hangar, the kart park's and
  Fight Club's places, the garage and the market.
  - Everything in the place is flattened into one mesh, coloured per vertex
    from its materials (a texture by its average colour), with a glow per
    vertex for lit windows, neon and unlit signs that follows the time of
    day (`farFormMaterial()`, one shader for every far form).
  - Triangles too small to see are left out.
  - Big textured surfaces (window facades) keep their textures, merged per
    material, so a place keeps its windows by day and its lights at night.
  - What's meant to be seen from far away, or moves, stays as it is: the
    Emporium's hologram, LED wall and equalizer, beams, glows and glass,
    Liberty Bridge's flames, the garage's turntable with your car.
  - A place far away costs a few draw calls instead of one for each of its
    materials (the Emporium had 31 in the colour pass alone).
- **Cars far away:**
  - Each model has a far form (`farCarGeometry()`): its own body and cabin
    outlines extruded and four block wheels, about a hundred triangles
    instead of about 2,500, in the car's own paint.
  - Every far car, parked or driving, is one instance in one
    `BatchedMesh`, so they're one draw call together and three.js culls
    them one by one.
  - A parked lot (the airport's car park) swaps whole; a car in traffic
    swaps by its own distance.
- **What differs from the plan above:**
  - The far forms cast and receive shadows. They're simple, and with the
    camera pulled far back the place the camera looks at can be far from
    it but inside the shadow box.
  - The swap is a clean switch, not a cross-fade or dither. The swap
    distances are where the details are a few pixels and the haze has
    started to soften them; checked flying out across them by day and
    night with a narrow lens, which shows them twice the size the city's
    own camera does.
  - The aircraft, pins, the blimp and the crowds' own two levels stay as
    they were.
- `?fps` shows how many tiles are near and how many far forms are showing.

### Benchmark after Phase 2

Headless (draws and triangles; the shadow map's are part of the totals).
Phase 1's numbers, then Phase 2's:

| View | Medium tier: draws | Medium tier: triangles | Phone tier: draws | Phone tier: triangles |
| --- | --- | --- | --- | --- |
| Home view | 517 → 500 | 0.81M → 0.77M | 276 → 257 | 0.32M → 0.23M |
| Downtown, street level | 571 → 563 | 0.97M → 0.81M | 255 → 245 | 0.27M → 0.23M |
| The square and the Emporium | 431 → 429 | 0.58M → 0.56M | 236 → 225 | 0.29M → 0.24M |
| Every district (Build overview) | 639 → 585 | 1.12M → 0.99M | 335 → 264 | 0.42M → 0.27M |
| The airport | 205 → 202 | 0.61M → 0.61M | 137 → 113 | 0.41M → 0.31M |
| The kart park | 79 → 79 | 0.14M → 0.14M | 85 → 63 | 0.18M → 0.08M |
| The far edge, looking back | 726 → 515 | 1.03M → 0.39M | 554 → 375 | 0.60M → 0.19M |
| Route, average | 493 → 447 | 0.75M → 0.59M | 234 → 223 | 0.33M → 0.22M |
| Route, most | 808 → 734 | 1.46M → 1.15M | 583 → 429 | 0.78M → 0.44M |

- **Against Phase 0** (before any of this), the far edge is 760 → 515
  draws and 1.19M → 0.39M triangles on the medium tier, and 564 → 375 and
  0.66M → 0.19M on phones: about a third of the triangles.
- **On phones** every view but the far edge and the route's busiest moment
  is now inside the target (300 draws, 0.5M triangles), and every
  triangle count is.
- **Memory:** geometry 35 MB → 40 MB on the medium tier (the far forms).
- **Boot:** the same as Phase 1 within the noise. The far forms are made
  after the first frame, a place at a time in spare moments, while the
  start menu is still up; a place stays near until its far form is ready.
  Making them all takes about a second headless, most of it reading back
  textures' average colours; small signs are left out instead.
- **Still over the targets:** the far edge on phones (375 draws). What's
  left there is the post-processing passes, the aircraft (kept as they
  are), the crowds' and places' parts that stay as they are, and the units
  and big lots (drawn from the save, rebuilt when they change, so they
  have no far forms yet). Building as you go (Phase 3) can give those far
  forms when they're rebuilt.

## Phase 3: building as you go (built)

The city's fixed geometry outside the places is now made of **sites**: a
piece of the city drawn from data by a function that only fills Batches
(`site(id, rect, build)` in `tilework.ts`), the same every time it runs,
so it can run again.

- **What's a site today:** each tile's trees and each tile's lamps
  (`world.ts`; a tree's turn now comes from its position, so a tile built
  twice is the same), the airport's runway and its apron (`airport.ts`),
  and the kart park's grounds and circuit (`kartpark3d.ts`): 174 sites.
  The places (the landmarks, Liberty Bridge, the garage, the market, the
  Fight Club, the hangar, the kart park's buildings), downtown's infill,
  the outer districts and the ground stay with the boot: they're in the
  home view, or have pins, doors, crowds and things that move. The
  districts and kits to come (Phases 4 and 8) are sites from the start.
- **The boot builds only the sites round the home view:** those in the
  tiles the home view and the intro's first frame can see (`bootSites()`
  in `tileplan.ts`), 65 of the 174, merged with the rest of the boot in
  one go (`tileBatch()`). However many sites there are elsewhere, the
  boot builds the same ones (a test adds ten thousand far away and checks
  the boot list doesn't change).
- **The rest are built a few milliseconds a frame** (`works.step()`):
  12 while the start menu covers the city, 3 in the city, 2 on phones.
  Nearest first (`nextSite()`), and ahead of the camera when it's moving
  (`focusOf()`: where it will be in 2.5 s), so walking, driving or flying
  fast pulls the tiles ahead first. They join the same batched meshes
  (`TileBatches.add()`); a mesh made at the boot grows when a later site
  doesn't fit, with a quarter's room to spare so it doesn't grow often.
- **Places stay ready:** every fly-to (a panel's camera move, Build mode,
  the City button), walking in (any spawn) and the intro build what's
  waiting where they're going before they get there (`want()`,
  `wantView()` for the intro's view), so nothing pops in on screen. The
  start menu and the intro's first frame hide whatever is still waiting.
- **Near forms are let go past a budget** (`nearBudget` in `TIERS`: 96 MB
  high, 64 medium, 32 on phones):
  - while the near pieces held add up to less, they're kept, so coming
    back costs nothing;
  - past it, tiles past the swap distance plus 40 (`KEEP_LEAD`) let their
    sites' near pieces in the shared materials go, furthest first, until
    it fits (`toRelease()`); never a tile drawn near;
  - a tile that let them go is drawn in its far form until its sites run
    again, keeping only its near pieces (`toRebuild()`), once it's within
    the swap distance plus 24 (`REBUILD_LEAD`): before it's near, and far
    enough from where it was let go that a tile on the line doesn't churn;
  - the room they took is taken back (`optimize()`) before a mesh grows,
    so memory stays at the budget however far you go;
  - today the near forms held come to under 1 MB (the lamps are the only
    sites' near pieces yet), so nothing is let go at the tiers' budgets.
    `?budget=0.05` in the address sets a tiny one, to see it work: flying
    out to the far edge lets downtown's lamps go, and they're back before
    the camera returns.
- `?fps` shows the sites built (at the boot, with how long they took, and
  after it), how many are waiting, and the near forms held against the
  budget, how many tiles let them go and were built again; the
  benchmark's boot line has the boot's sites too.
- **Tested** (DOM-free): `tests/tileplan.test.ts` (which sites the boot
  builds, nearest first and ahead, what's let go and built again) and
  `tests/tilebatch.test.ts` (later sites join the meshes and grow them, a
  far tile lets go only its sites' near pieces in shared materials and is
  drawn far until they're back, room let go is reused before a mesh grows)
  and `tests/tilework.test.ts` (the boot builds only the home view's
  sites, the rest nearest first, a place asked for at once, and a tile
  let go is built again before the camera gets back).

### Measured after Phase 3

Headless, five boots each, the median (`work` in `?fps`: building the
scene, less the time spent waiting on the browser for a frame or the
canvas; the boot's total is mostly the headless browser's own waiting and
shader linking, too noisy to compare):

| | Phase 2 | Phase 3 |
| --- | --- | --- |
| Building the scene, medium tier | 1.67 s | 1.48 s |
| Building the scene, phone tier | 1.38 s | 1.26 s |
| Sites built at the boot | (all) | 65 of 174 in about 0.1-0.17 s (40 of 154 on phones, about 0.07-0.1 s) |
| Sites built after it | none | the rest in about 0.25-0.33 s, a few milliseconds a frame |

- **About a tenth less work before the start menu is ready.** What's left
  in the boot is the places and downtown, which are in the home view; the
  kart park's and the airport's grounds and most of the outskirts' trees
  now wait. The sites left waiting are built in the first second or two
  while the start menu is up.
- **The boot no longer grows with the world:** a district built as sites
  (Phase 4's kits, Phase 8's districts) costs the boot nothing unless it's
  in the home view.
- **Drawing is unchanged:** once everything is built the views draw the
  same draws and triangles as after Phase 2, within the noise of the
  traffic and the crowds (home view on the phone tier: 265 draws before,
  264 after), and the screenshots from the same views match. In the
  benchmark's first views on the phone tier a few more are drawn (up to
  about 15) while the far forms and the last sites are still being made:
  headless, the phone tier runs at a few frames a second, so they take
  longer to finish there.
- **Memory:** geometry 40 MB on the medium tier and 35 MB on phones (34
  before): the meshes grown for later sites keep a little room.
- **Done when** boot time stays flat however many tiles there are, and
  memory stays inside the targets: the boot builds the home view's sites
  only (tested with ten thousand more sites elsewhere), and geometry is
  40 MB against the 150 MB phone target, with the near forms held to the
  tier's budget.

## Phase 4: building kits (built)

A new district is now a few lines of data: a grid of blocks and a recipe
for each. Nothing in the city itself changed; the test district that
proves it is only there with `?district=test` in the address.

- **The kits** (`kits.ts`, DOM-free): fourteen kinds of building.
  - The downtown six, drawn as downtown draws them (infill.ts): brownstone,
    shop, diner, loft, office and hotel.
  - Rows: the terrace (a narrow two-storey house, a pitched roof, a front
    garden behind a low wall) and the warehouse (wide and low, a loading
    dock, skylights).
  - The house: detached, in its yard (a porch, a picket fence, a tree, a
    chimney).
  - One to a block: the factory (sheds under a sawtooth roof, a red and
    white chimney, tanks, a fence), the school (a long block, its name over
    the doors, a flagpole, a court behind), the mall (shops along the
    ground floor, glass above, its name lit, a car park), the stadium stand
    (a pitch with its lines and goals, tiers of seats, a roof with the
    name, floodlights) and the crane (a frame going up, scaffolding, a
    hoarding, a tower crane over it).
  - Each kit's sizes, floors and front strip (`KIT_SPEC`), its height, and
    its footprints (`lotSolids()`). Nothing stands taller than 11.2, the
    crane's mast (the Emporium's roof is about 12.5); offices keep
    downtown's nine-floor cap.
- **Recipes for blocks** (`recipes.ts`, DOM-free, seeded):
  - a recipe is a mix of kits, how tall they get, how many towers a block
    may have, how often an alley breaks a row, rows of houses in yards, or
    one big kit to a block: midtown, mainstreet, terraces, suburb,
    warehouses, and factory, school, mall, stadium and works;
  - `layBlock()` lays one on a block's outline (the land inside its
    sidewalk): a row along every straight side, downtown's way (widths in
    each kit's range, a few set back, an alley every few with bollards at
    its mouth, the corners going to the longer side, slanted sides left as
    they are), houses with yards between, or the big kit filling the
    inside;
  - the same seed lays the same block, in the browser or on a server.
- **Collisions come from the same recipe:** every building carries its
  footprints, and a district's go into every collision grid at once
  (`addSolids()`, `BoxGrid.add()`, tested to answer exactly as a grid made
  with all of them). Walking, the walk camera, bullets, driving and flying
  all meet them, with no hand-written boxes; the district's raised blocks
  are walkable ground (`addSlabs()`).
- **Drawn merge-ready** (`kits3d.ts`): every wall from the one wall atlas,
  every sign from the one sign atlas, plain colours in the shared paint,
  neon in the shared neon. Walls, roofs, signs and lit trims are drawn at
  every distance (a building's far form), everything else near only, and
  phones leave out the finest details.
- **Signs stay fixed copy:** the kits added SECTOR 7 HIGH, NEON MALL and
  SECTOR 7 STADIUM to `SIGNS` (made-up names, never the token).
- **The test district** (`testdistrict.ts`, `district3d.ts`):
  - 285 buildings on 20 blocks of about 25 x 28, on the open land south of
    the river avenue, west of the town (x -190 to -46, z 100 to 228), off
    a grid of streets a lane each way;
  - its streets, its blocks' ground and its buildings (four at a time) are
    sites, built as you go (Phase 3), so the boot doesn't build any of it
    (it's out of the home view) and no one site takes long;
  - the outskirts' trees keep off it, and the benchmark adds two views of
    it: the whole district from above and down one of its streets.
- **Tested:** `tests/recipes.test.ts` (every kit under the Emporium; a
  lot's frame turns the way the drawing does; every recipe lays every
  block inside its outline, nothing overlapping, its own kits, its
  footprints on its lots, the same every time; rows fill their street
  fronts; houses stand apart; the test district has every kit and stays
  clear of the town, roads, river, airport and kart park).
- **What differs from the plan above:**
  - The kits aren't instanced meshes. Each building is its own size, and
    it's merged into the tile pieces of the shared materials' batched
    meshes, so a district's buildings are already a handful of draws
    however many there are (a hundred brownstones cost the same draws as
    one), and they keep the per-tile culling and the near / far swap that
    instancing would lose.
  - Recipes lay rows along a block's sides that run along x or z;
    a slanted side (a diagonal, a bend) is left as it is, like
    downtown's triangles' planted strips.
  - The benchmark now waits for every site to be built before it measures
    (it builds faster while it waits), so its views measure the finished
    city.

### Measured with the test district

Headless, the benchmark with and without `?district=test` (draws and
triangles, the shadow map's included; headless frame rates mean nothing):

| View | Medium tier, without | Medium tier, with | Phone tier, without | Phone tier, with |
| --- | --- | --- | --- | --- |
| Home view | 503 / 0.77M | 506 / 0.78M | 268 / 0.25M | 267 / 0.24M |
| Downtown, street level | 549 / 0.78M | 557 / 0.81M | 244 / 0.25M | 243 / 0.24M |
| Every district (Build overview) | 585 / 1.00M | 593 / 1.00M | 258 / 0.27M | 267 / 0.27M |
| The far edge, looking back | 538 / 0.38M | 520 / 0.37M | 374 / 0.18M | 377 / 0.17M |
| Route, average | 445 / 0.58M | 432 / 0.58M | 222 / 0.22M | 219 / 0.22M |
| Test district, from above | | 59 / 0.28M | | 52 / 0.07M |
| Test district, street level | | 59 / 0.33M | | 46 / 0.07M |

- **The 285 buildings cost a handful of draws:** looking at the whole
  district takes 59 draws on the medium tier (the city round it
  included), well inside the targets (700 draws and 1.5M triangles on
  desktop, 300 and 0.5M on phones). On phones its views are 46-52 draws
  and 0.07M triangles: the finest details are left out and most of it is
  past the swap distance, drawn in its far form.
- **The rest of the city is unchanged** with it on (within the noise of
  the traffic and the crowds): it's out of the other views, and each
  tile's pieces are culled on their own.
- **Memory:** geometry 41 → 60 MB on the medium tier, 34 → 44 MB on
  phones, against the 150 MB phone target.
- **Boot:** unchanged. The district is out of the home view, so the boot
  builds none of it (the sites built at the boot take the same 0.12 s, or
  0.07-0.08 s on phones, with it or without). Its 112 sites are built
  after, nearest first. A block's buildings are four to a site (the
  whole block at once took up to 0.18 s headless, the stadium's); the
  slowest site is now 24-55 ms headless, a tile of trees, the kart park's
  circuit or four of midtown's buildings, depending on the run. (The first site that brings a
  material the city hadn't drawn yet also compiles its shader, once,
  which took up to about 0.15 s headless.)
- **Done:** a test district of 285 buildings stays inside every target.
- **To check on real devices:** `?district=test&fps` (and
  `?bench&district=test`) on a phone and a laptop: how long the district
  takes to finish building, and the frame rate walking and driving
  through it.

---

# Part B: a bigger world

## Phase 5: the edge as data (built)

Nothing new to see: everything that reads the world's edge now scales
with it, before the edge moves.

- **The edge in one place:** `EXT` in `layout.ts`. A test run can set
  another (`WORLD_EXT=x0,x1`; `npm run test:wide` runs every test at
  Phase 6's -420 to 460), and both runs pass.
- **Frozen:** the airport's `SITE` is fixed numbers (it used to clamp to
  `WORLD_BOUNDS`, so in a bigger world it would have grown; the snapshot
  test at Phase 6's size caught it). The kart park, the Fight Club, the
  south bank's places and every street were already fixed numbers or
  ended at `'edge'` in the snapshot; the test passes at both sizes.
- **The land, river and roads:** the grass is a plane per tile, and
  carries on 80 past the edge (`SKIRT`) under the skyline's towers, which
  used to stand on nothing past the ground's edge (it showed from high up
  near the edge). The river, its banks, the promenades and the roads are
  each a few long boxes from edge to edge: a longer world makes them
  longer, not heavier.
- **The outskirts' trees** (`outskirts.ts`, DOM-free, tested in
  `tests/outskirts.test.ts`) are seeded tile by tile at a density per
  area: the belt round the town thickly, the open land lightly
  (`BELT_FREE`, `OPEN_FREE`: the land a tree may stand on today, so today
  keeps its numbers, within a few percent on every tier). A tile's trees
  are the same whatever the world's size, so a bigger world keeps every
  tree where it was and adds more past the old edge, never thinner ones.
  They stand in new places today (each tile its own seed, not one draw
  for the whole map); scattering them takes about 10 ms.
- **The skyline ring** follows the edge at the same distance, with as many
  towers as today's for its length (`SKYLINE_REACH`), each from its own
  seeded numbers; it still leaves out the airport's approach, and it was
  already split by tile (the towers in view drawn, Phase 1) and simple
  boxes (its only form; it's past the haze).
- **The camera** (`bounds.ts`): City view pans round the built-up area
  (`BUILT_UP`: the town, the airport and the kart park; `PAN_BOUNDS`
  reaches 160 past it, never past 10 in from where you can walk), so
  today it's the whole world as before and in a bigger world it stays
  round the city. The Build overview frames the plots
  (`overviewFrame()`), the same view as before. The far plane (440) and
  the sky dome (400, travelling with the camera) stay.
- **Flying:** `CEILING` stays; flying already turns back at whatever bounds
  it's given, and the airport's timetable is fixed numbers the tests keep
  inside the world at both sizes.
- **Driving:** the river walls and their gaps come from the street plan
  (`riverCrossings()`: the river's run, and every street crossing it with
  its sidewalks), the same walls as before (tested).
- **What changed to look at:** the outskirts' trees and the skyline's
  towers stand in new places, and the city's other random choices
  (traffic's and pedestrians' colours and starting places, clouds) come
  out differently, since the trees no longer draw from the city's shared
  random numbers. The weather used to start from one of those draws and
  always came out dry; it now starts dry on purpose. The draws and
  triangles from the same views are the same as before, within the
  noise.
- **Done:** `EXT` is set in one place, the tests pass at today's and
  Phase 6's size, and today's city looks the same.

## Phase 6: the edge moves out (built)

- **`EXT` is -420 to 460** (880 tiles, about 1.6 km across), set in
  `layout.ts` as before; `npm run test:wide` now runs every test at Phase
  10's -680 to 720, and both runs pass.
  - `WORLD_BOUNDS` follows it: you can walk, drive and fly out to 6 in
    from the new edge.
  - `CITY_EXT` stays (traffic and boats loop round the town) until Phase
    7 brings roads.
  - The river, its banks and promenades, the roads, their medians and lane
    markings run on to the new edge both ways (each still a few long boxes
    or markings split by tile). The far-off roads are plain continuations
    of today's, with no traffic and no lamps.
- **What's out there:** grass to the edge and 80 past it (`SKIRT`), the
  open land's light sprinkle of trees and the belt as before, and **pine
  woods** (`WOODS`, `inWoods()` in `outskirts.ts`): patches where a smooth
  seeded noise (two layers on lattices turned off the world's grid, so the
  patches come out round, not boxy) is high, only further than
  `WOODS.clear` (120) from the built-up area, so none stand on the land
  the world had before. They're planted 2.5 times as thickly as the belt,
  mostly pines, and the trees are about twice the town's size (old woods),
  so they read as woods without standing thicker. Like the other trees
  they're seeded per tile (after the tile's other trees, which stay as
  they were) and they're the same whatever the world's size.
- **The skyline ring** stands past the new edge, as many towers as before
  for its length (about twice as many). Seen from town it's now 450-700
  away, past the old far plane, so **the camera sees further**: the sky
  dome's radius (`SKY_RADIUS` in `bounds.ts`) is worked out from the edge
  (far enough that the ring's far side, out to its corners, stands in
  front of the sky seen from downtown: about 720, never under 400), and the
  far plane (`CAMERA_FAR`) is 40 past it. The depth buffer's precision
  depends on the near plane (0.5), not the far, so nothing in town
  flickers more; the haze hides the land long before the far plane, and
  the skyline stays out of the haze as before.
- **Nothing in town changes:** the kart park, the airport, the south bank
  and every place stay where they are (the snapshot test passes at both
  sizes). The ring is now about 300 from the airport, so none of its
  towers is left out for the runway any more; the kart park's fence keeps
  its line, and the woods keep 120 clear of it, the airport and the town.
- **The benchmark** has a view where the edge was (`outskirts`) and the far
  edge from `EXT` (`edge`, 20 in from the corner, looking back); the route
  goes through both and takes 48 s.
- **Measured** (headless, before and after, from the same views; frame
  rates headless mean nothing):

  | | Medium (laptop) before | after | Low (phone) before | after |
  | --- | --- | --- | --- | --- |
  | Home view | 500 draws · 0.77M | 498 · 0.79M | 256 · 0.24M | 274 · 0.26M |
  | Downtown street | 555 · 0.78M | 537 · 0.81M | 240 · 0.24M | 250 · 0.25M |
  | Build overview | 597 · 1.01M | 599 · 0.99M | 261 · 0.28M | 279 · 0.29M |
  | Where the edge was | 535 · 0.38M | 577 · 0.49M | 392 · 0.18M | 429 · 0.21M |
  | The new edge | (none) | 523 · 0.52M | (none) | 403 · 0.26M |
  | Route (average) | 429 · 0.57M | 449 · 0.59M | 226 · 0.23M | 262 · 0.24M |
  | Geometry | 40 MB | 68 MB | 36 MB | 52 MB |

  The city's own views are the same within the noise of the traffic and
  the crowds. Looking out from where the edge was, the woods beyond add a
  little. The views from the edges are over the phones' 300 draws (they
  were before: the places' far forms all show from out there). The extra
  memory is the trees (most of it the woods: about 2,000 trees on phones,
  3,200 on the medium tier, 5,400 on the high), well inside the targets
  (150 MB on phones, 400 on desktop).
- **Boot:** unchanged (the boot builds the same 42-66 sites round the home
  view). After it, 750 sites instead of 192 on the medium tier (581 on
  phones), about 2.1 s of work in all (1.2 s on phones) spread over the
  frames a few milliseconds at a time, nearest first; the slowest site is
  still the kart park's circuit (about 40 ms headless).
- **Behaviour inside the old edge** is exactly as before: the walking,
  driving, flying, kart and fight rules' tests pass at both sizes, the
  river walls are the same walls, and the airport's timetable is fixed
  numbers. Walking past where the edge was carries on to 6 in from the new
  one.
- **To check on real devices:** `?bench` on a phone and a laptop (the
  route now goes out to the edge), and the skyline from town at night.

## Phase 7: roads to reach it (built)

- **The ring highway** (`highway.ts`, DOM-free, tested in
  `tests/highway.test.ts`): two lanes each way with a median and a hard
  shoulder, on a rounded box (x -215 to 275, z -170 to 275, corners of
  70) round the town, the kart park, the airport and the test district,
  well outside the Parkway and the Southside Loop: about 1,700 tiles
  round (some 3 km), about 1 minute 45 in a fast car.
  - It meets each of the 18 arterials at a lit junction (two phases, like
    downtown's), all at ground level. That's the simple way: no overpasses,
    so walking, driving, flying and the kart park need no new ground
    heights or ramps.
  - **Slip lanes:** on the town side of each junction, a one-way slip lane
    cuts across each corner for the right turns on and off the highway
    (`slipCurve()`). Cars turning right take it rather than the junction.
    The corners on the outside have none: the arterials past the highway
    go nowhere yet.
  - **Two more bridges** over the river, one each side (`riverBridges()`
    in `streetplan.ts` finds every road that crosses it). They're drawn
    like the others and are gaps in `RIVER_WALLS` (tested by driving
    across both, in every lane). Boats pass under them as under the
    town's.
  - **Drawn** in `world.ts`: the asphalt, the median (broken at the
    junctions and over the river), lane dashes and edge lines, lamps along
    both verges and the slip lanes. The arterials' medians and lines break
    where it crosses them, and the outskirts' trees keep off it and its
    slips.
- **Today's arterials** already ran edge to edge; they stay as they are
  (the town's two cross streets one lane each way, the ring avenues two).
  Past the highway they carry no traffic until districts come (Phase 9).
  No local streets yet.
- **Routes from the street plan** (`routes.ts`): the plan's drivable
  streets and crossings make a graph, each street cut into stretches
  between crossings, either way, or the one way a one-way street allows
  (`oneway` on the street: the airport's car park loop).
  - Every route is a closed loop: a seeded drive of nine stretches,
    turning where it likes, then the shortest way back. Routes are added
    until every stretch is driven and every slip lane taken.
  - The highway gets four of its own: all the way round, both ways, in
    both lanes. That makes 53 routes, about 51,000 tiles between them.
  - An avenue's lane is picked for the next turn: the outer lane into a
    right turn or out of a slip lane, the inner one into a left turn.
  - Lights and junctions come from the plan's crossings, as before.
  - Building them takes about 0.4-0.5 s at load (headless). The
    hand-made routes took 0.65 s against the same plan.
- **Traffic spent where you are** (`life.ts`):
  - The same pool of cars as before (the tier's count).
  - A car further than 170 from what the camera looks at
    (`CROWD_VIEW.focus`) and out of sight, or further than 320 in sight
    or not, is put back on the road near it.
  - It reappears at one of the routes' spots, out of sight. It can
    appear in view only far off past the focus, where it's a speck in its
    far form.
  - So the busiest roads are always round you: in town, on the highway,
    at the far edge.
  - Cars go round and round their loops and still follow whoever is
    ahead.
  - Traffic lights stand on every way into a lit junction, found along
    each street, curved and looped ones too.
- **Boats** run the whole river, kept within 170 of what you're looking
  at (one drifting off one way comes back round from the other).
- **The aircraft:** unchanged (widening their routes over the new land is
  the owner's call).
- **Driving feel:** no new handling. The drive sim is free-roaming, so
  the highway is just more road. Its tests now drive over the highway's
  bridges too.
- **The benchmark** has a view of a highway junction, on the route.
- **Measured** (headless, before and after, the same views):

MEASURED

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
