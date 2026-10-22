# Growing Sector 7: the plan

How the city gets many more buildings, and then a bigger world, without
getting slower. Nothing here is built yet: it waits for the owner's
sign-off, one phase at a time, like the other plans. Keep it up to date.

## What the owner asked

- Could the city have ten times the buildings without ruining the game?
- How far can the world's size be pushed?

The short answer: yes, but not by adding them the way the city is built
today. First the city has to learn to draw only what's near you and in
view; then density and size are cheap.

## Where it stands (measured)

Measured with `?fps` (draw calls and triangles per frame; the frame rate
needs a real device):

| View | Draw calls | Triangles |
| --- | --- | --- |
| Desktop, home view | ~560 | ~1.05M |
| Desktop, walking downtown | ~460 | ~1.1M |
| Phone tier, home view | ~300 | ~0.4M |

- **Buildings:** 39 infill buildings downtown, 9 landmarks, the plots, lots,
  units, market, garage, airport, kart park, Fight Club and Liberty Bridge.
- **Collision boxes:** ~300 in `SOLIDS` (`solids.ts`, shared with the game
  server), checked one by one.
- **The world:** `EXT` is -200 to 240 (440 tiles, about 790 m across), most
  of it open land; `WORLD_BOUNDS` a little inside it; traffic and boats
  loop inside `CITY_EXT`.
- **How far you see:** the camera's far plane is 440; the haze
  (`FogExp2`, density 0.012 in `sky.ts`) has swallowed almost everything
  by about 150-180 tiles; past `EXT` the skyline ring fakes a far
  metropolis.

Rough budgets for a smooth frame:

- **Mid-range phones:** about 300-400 draw calls and 0.5M triangles. The
  phone tier is already near that.
- **Ordinary laptops:** about 1,000 draw calls and 2-3M triangles.
- **Gaming PCs:** far more, but the city is tuned for phones first.

## Why "just add ten times as many" breaks it

- **Everything is drawn all the time.** Draw calls stay low because a
  district's buildings are merged into a few big meshes (`Batch`,
  `consolidate()`). But a merged mesh covers the whole district, so it's
  always in view and nothing gets skipped. Ten times the buildings would
  be about ten times the triangles: ~10M on desktop, ~4M on phones. The
  ink outlines draw the scene again for their normal and depth pass, and
  shadows draw it once more, so each extra triangle counts two or three
  times.
- **Everything is built at load.** All the geometry is made in the browser
  when the city boots, so the loading screen and memory grow with every
  building. Phones are the first to run out.
- **Collisions check every box.** Walking, driving, the kart, bullets and
  the server's sim test `SOLIDS` one by one, so ten times the boxes is ten
  times the work, every frame.
- **What doesn't grow with buildings:** traffic and pedestrians (they
  follow the roads), the characters, the HUD and the ink-outline pass (it
  costs by pixels).

## How it's built

The rules every phase follows:

- **Tiles.** The world is cut into square tiles (about 60 x 60). Static
  geometry is merged per tile, not per district, so a tile out of view or
  behind you is skipped. Draw calls become "tiles in view x materials",
  not "everything".
- **Levels of detail, as the crowds already have.** Each building has a
  near form (the full model: signs, fire escapes, rooftop clutter), a far
  form (its shape with the windows painted on, a few dozen triangles) and,
  past the haze, nothing (the skyline ring and the fog cover it). A
  building 150 tiles away is a handful of pixels: its detail is wasted.
- **Repeats are instanced.** A building type used many times (a
  brownstone, a shop, a tower) is drawn as one instanced mesh, with its
  colour and sign per instance (`setColorAt`, a row of the sign atlas),
  like the trees, lamps and cars.
- **Built near you, when there's time.** Tiles near the camera are built
  in spare time between frames (a small time budget a frame); far ones are
  built as their far form only. The boot builds the home view's tiles, so
  the loader gets shorter, not longer.
- **Collisions by grid.** `SOLIDS` is sorted into a grid of cells, so a
  check only looks at the boxes near it. It has to give exactly the same
  answers as today, for the city and the game server alike.
- **Data first, DOM-free and tested.** The tile grid, the collision grid,
  the building recipes and new districts are plain data and functions
  (like `streetplan.ts`, `downtown.ts`, `outer.ts`), tested in Node; the
  drawing reads them. New districts are seeded, so they're the same for
  everyone and ready for a server.
- **Nothing that exists moves.** Plots, lots, units, landmarks and places
  keep where they are, and saves carry over without a migration. Growth
  adds; it never shuffles.
- **Measured at every step.** `?fps` before and after, on a real phone and
  a laptop, from the same views and along the same route. A phase that
  makes the city heavier isn't finished.

## Targets

| | Phone tier | Desktop |
| --- | --- | --- |
| Draw calls in view | ≤ 300 | ≤ 700 |
| Triangles in view | ≤ 0.5M | ≤ 1.5M |
| Frame rate | 30fps idle, smooth while touched | 60fps |
| Boot to start menu ready | no longer than today | no longer than today |

These should hold however big the city gets: the cost of a frame follows
what's in view, not the size of the world.

## Build order

Each phase is its own PR with the owner's sign-off.

### Phase 0: the measuring kit

- `?fps` also shows tiles drawn and built, build time at boot, and
  geometry memory.
- A fixed benchmark: a few saved views (home, downtown street level, the
  outer districts, the far edge) and a scripted camera route, so every
  later phase compares like for like.
- Today's numbers, recorded in this plan.

### Phase 1: the foundation (nothing new to see)

- `tiles.ts` (DOM-free, tested): the tile grid, the tile a point is in,
  the tiles near a point and in a view.
- The collision grid over `SOLIDS` (and the plots' and units' solids),
  used by walking, driving, the kart, bullets and the server. The tests
  check it answers exactly as the one-by-one check does.
- Static geometry merged per tile instead of per district, with frustum
  culling on.
- Done when the city looks the same and the benchmark shows fewer
  triangles and no more draw calls than today.

### Phase 2: near and far buildings

- A far form for every infill type and landmark: its outline, the windows
  and lit windows painted on from the wall atlas, and a lit crown where it
  has one. Swapped by distance per quality tier.
- Shadows only for the near tiles; the far forms neither cast nor receive
  them.
- Pins, the Emporium's hologram and the blimp stay as they are: they're
  meant to be seen from far away.
- Done when the far edge of the benchmark route costs a fraction of
  today's and nobody can see the swap happen.

### Phase 3: building as you go

- The boot builds the tiles round the home view; the rest are built a few
  at a time in spare time between frames, nearest first, far forms before
  near ones.
- Tiles far from the camera drop their near form (kept for reuse, so
  coming back costs nothing to rebuild).
- The fly-in and the 2D map's poster hide anything still building.
- Done when boot time stays flat however many tiles there are.

### Phase 4: building kits

- Recipes for blocks (DOM-free, seeded): a district's density, its mix of
  building types, heights and setbacks, alleys and front details, laid out
  from the street plan's block outlines, so a new district is a few lines
  of data, not hand-placed buildings.
- The infill's building types (brownstone, shop, diner, loft, office,
  hotel) drawn as instanced kits with their colour and sign per instance,
  so a hundred brownstones cost about one draw.
- Signs stay fixed copy from `SIGNS`: made-up names, never the token.
- Done when a test district of about 300 buildings stays inside the
  targets.

### Phase 5: filling the map (the owner picks)

The open land inside `EXT` is room for several new districts. Each is its
own sub-phase, the owner's call, for example:

- **Docklands** along the river: warehouses, cranes, a ferry pier.
- **An industrial east:** factories, rail yards, depots (a home for the
  economy's bigger lots).
- **Suburbs:** low houses, gardens, a school, a mall.
- **A park district:** a big green with a lake, a stadium or a fairground.

Each comes with its roads (`streetplan.ts`, traffic in `routes.ts`),
pedestrians, its 2D map rule (the 2D map is downtown's: new districts
stay 3D only, like the ring and the plots today), and, if the owner wants,
plots or lots for sale. Prices are the owner's call.

### Phase 6: a bigger world

- `EXT` grows, for example to about 1,200-1,600 tiles across (2-3 km),
  with `WORLD_BOUNDS`, `CITY_EXT`, the river, the skyline ring and the
  outskirts' trees following it.
- Precision isn't a limit: three.js stays accurate to well under a
  millimetre this far from the centre (it isn't a worry until about 10 km).
- The camera's far plane can stay (the haze hides past ~180 tiles); the
  sky dome already travels with the camera.
- Getting about: walking across 2-3 km takes minutes, so this phase needs
  a way to cross the city, the owner's call (your car and aircraft
  already do; a metro, taxis or fast travel from the ☰ Menu are options).
- Done when the targets still hold at the new edge and the far side of the
  city is a pleasant drive away.

## What has to keep working

- **Saves:** the tycoon save, plots, lots, units, your car, aircraft,
  kart and look. Nothing that exists moves, so nothing needs migrating.
- **The game server** (paused): it bundles `solids.ts` and the sims; the
  collision grid has to stay DOM-free and give the same answers there.
- **The 2D map:** it shows downtown and stays the loading poster and the
  fallback without WebGL.
- **Every test**, plus new ones for the tile grid, the collision grid and
  every recipe.
- **The design rules:** ink outlines, minimal bloom, nothing flush,
  reduced motion, phones first.

## Open questions for the owner

- How big should it get: fill the current map first, or grow the world
  too?
- Which districts, in what order?
- How dense: downtown-tight everywhere, or looser further out (as the
  redesign does today)?
- Should new districts carry plots or lots for sale, and at what prices?
- How should players cross a bigger city: car and aircraft only, or a
  metro, taxis or fast travel?
