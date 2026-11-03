# Blending the city (plan)

The owner's call (2026-11): a polish and clean-up of the city's built areas,
so Sector 7 looks more natural, one city that grew rather than districts set
down side by side. Built one phase at a time, each with the owner's sign-off;
keep this file up to date.

## What's wrong today (measured from the code)

- **One flat green.** The open ground is one colour (`toon('#245c45')`, a
  plane per tile, world.ts `buildGround`): no texture, tint, patches or
  dirt. The districts' own grounds use at least seven other greens
  (#2f7a52 lots, #367f5a pads, #3f7a4a medians, #4f9a49 Sunridge's lawns,
  #6f9a4e the mall's islands, the kart park's three, The Trenches' worn
  patches), none fading into the base.
- **Every block is a box.** A block is a 0.15 slab with a straight kerb all
  round (`SLAB`, world.ts), whether it meets a street, a park or open land,
  so every district ends in a hard step on a straight line. Most districts
  are rectangles (`TRENCH_RECT`, `UPTOWN_RECT`, `WESTLAKE_RECT`,
  `DOCKS_RECT`, `CREST_RECT`, `NORTH_RECT`; Sunridge's `LAND` is the one
  polygon).
- **Style switches on a line.** Kerbs go from purple (#5a5290) to grey
  (#5f5c70) at The Trenches and the Docks; lamps from white to sodium at
  `inTrenches()`, `WATERFRONT_RECT` and `inDocks()`.
- **Trees cut straight.** The outskirts' trees keep off a dozen separate
  rectangles (`keepTreesOff()` from index.ts, trenches3d.ts, streets3d.ts,
  waterfront3d.ts, ...), every arterial in a strip, a 34 x 34 box at every
  highway junction and the metro's rects, each with a fixed margin: straight
  edges. The belt outside the Parkway (`BELT`) is about one tree in 47
  square tiles and the land past it one in 580: a twelvefold drop on a hard
  edge.
- **Bare land between.** Inside the ring highway the land no district holds
  is the base grass and a sprinkle of trees: chiefly the band south of the
  south row down to the highway's south side (with the airport's old land),
  and the strips east of town north of the river (`docs/suburb-plan.md`:
  "stay open land for now"). Outside the highway it's the same grass to the
  world's edge, the woods only past `WOODS.clear` from `WOODS_OFF`.
- **Bare corridors.** The highway is asphalt, a median and lamps; the
  arterials between districts are asphalt edge to edge with no sidewalks
  (sidewalks belong to blocks), no street trees, verges, walls or banks.
- **Flat.** Height changes only in Crestmont's hills (`terrain.ts`) and down
  the river's banks.

## The owner's answers

- **All four kinds of seam** matter: the ground and edges, the empty land
  between, the road corridors and the style jumps.
- **"Natural" means lived-in realism**, in the toon style: worn grass, dirt
  paths where people cut corners, varied greens, verges, hedgerows, the
  ordinary mess real cities have between places. Ink outlines, flat shading
  and the neon stay.
- **The open land inside the highway: mixed by neighbour.** Each gap takes
  after what's beside it: yards and light industry by the highway and the
  Docks, parkland and meadows by homes, small mixed blocks by downtown.
- **The ground: one palette, blended.** A small shared palette (lawn, rough
  grass, dry grass, dirt, worn concrete and the rest), each district its own
  mix, the colours fading into each other over a few tiles at every seam.
- **Terrain: gentle rolls outside the town.** Low swells and dips, a metre
  or two, on the open land; flat under every street, block, place and solid.
- **The highway: its own plan first.** The raised highway
  (`docs/highway-plan.md`) is built before this plan touches the highway's
  corridor; this plan then dresses the ground round and under the viaduct.
- **Transitions: all four.** Stepped heights at district edges, shared
  streets (one look both sides), buffer parks where very different districts
  meet, and mixed edge blocks (a bit of each style).
- **Lamps: mixed at the edges.** Each district keeps its lamp colour, mixed
  with its neighbour's for a block or two where they meet, as a city
  replacing lamps street by street.
- **Block edges: a kerb on streets only.** Where a block meets a street it
  keeps its kerb; where it meets open land or a park the slab eases down
  into the ground with a verge by district (grass, a hedge, a low wall, a
  fence).
- **Clean-up:** one shared palette module, one tree-clearing rule (soft
  edges, not rectangles), and leftovers from retired things removed.
  Refactoring beyond that only where a phase needs it.
- **Budget: free on phones.** Desktop may draw a little more (more trees,
  finer ground). Phones get the palette and the blending at no extra cost;
  the extras near only or left out. Measured with `?bench` before and after
  every phase.
- **Details: all of them.** Paths and desire lines; hedges, fences and walls;
  utilities (pylons and lines, substations, water towers, billboards, masts);
  water and wild bits (ponds, ditches and culverts, reeds, meadows, scrub,
  rocks).
- **Outside the highway: countryside.** Farm fields in patches with
  hedgerows, a few farmsteads, country lanes, then the woods further out:
  the city fading into the land round it.
- **Order: foundations first.** The palette, the clearing rule and the
  clean-up first, then the ground and edges, then the gaps and the
  transitions, the corridors after the raised highway.
- **New buildings are scenery**, with a few sites kept ready to become
  places to run for Dorras in a later plan.
- **Reviews: before and after shots** from the same fixed spots, by day and
  at night, desktop and phone, with the `?bench` numbers, at every phase.

## The rules for it

- **Nothing that exists moves.** Every place, door, pad, lot, spawn,
  landmark, building and street stays where it stands
  (`tests/snapshot.test.ts` holds it). Prices don't change. Blending is what
  lies between and round them.
- **Data first.** What goes where (the land cover, the heights, the paths,
  the hedges, the pylons) is DOM-free data with tests; the view only draws
  it, through Batches, sites and `tileBatch()` as everything else. Nothing
  added in bulk outside the tiles or sites.
- **Seeded, the same for everyone**, and the same whatever the world's size:
  both test runs pass (`npm test`, `npm run test:wide`), and nothing new is
  written against today's edge.
- **Free on phones.** Colours ride on vertices that are already there or on
  the ground's own grid; new props are near only or left out on the low
  tier; the boot stays under its budget (new data in chunks, or baked).
- **Toon, not photoreal.** Flat colours from the palette, ink outlines,
  nothing textured that isn't already. Under the Emporium's height
  everywhere this plan touches (Uptown and the Docks' cranes keep their
  exceptions).
- **Made-up names only.** Billboards, farm names, depot signs: fixed made-up
  copy, never a real brand, never the token, nothing for sale.
- **Nothing flush.** Ground colours on one surface, never two planes in the
  same place; verges, paths and decals at least 5 mm over what they lie on.

## Phases

### Phase 0: the seam map and the review kit (built)

Nothing changes on screen.

- **The seam map** is `seams.ts` (DOM-free, tested in
  `tests/seams.test.ts`, at both world sizes; `npm run seams` prints it,
  `-- --md` as the tables below). `landMap()` lays the world on a grid of
  `CELL` (2 tiles), each cell one thing: the highway, a street (its kind),
  water (the river, its banks past the promenades, the docks' basin), a
  sidewalk-only strip (the bends' kerbs, the town's promenades), one of the
  `AREAS` (fourteen: downtown, the town, Uptown, Uptown North, Westlake
  Park, the stadium, the mall, Palm Court, Sunridge, Crestmont, The
  Trenches, the Docks, the airport, the kart park; each with its
  `Character`: core, town, towers, park, retail, homes, estates, grit,
  industry, airport, sport), by the street plan block it's on or the land
  the district holds, or open land (inside the highway or out). `seams()`
  walks straight out from every district's edge over streets and sidewalks
  (at most `REACH`, 40) to what's on the far side, and cuts what it finds
  into stretches: which two, the widest way between (none, a walk, an
  alley, a street, a slip, an avenue, the highway), how long, a point on it
  and its box, ranked by length and nearness to downtown (`rank`, the order
  for Phase 6). `gaps()` is the open land inside the highway in connected
  patches of at least `GAP_MIN` (600 square tiles), each named by a point
  in it (`GAP_NAMES`): the test fails on a patch with no name, so a gap
  appearing or closing is noticed. 52 seams, 10 gaps; worked out in about
  0.4 s, so nothing in the browser reads it yet (Phase 1's clearing rule
  builds on `landMap()`).
- **The review views** are `BLEND_VIEWS` in `blendviews.ts` (DOM-free):
  thirteen fixed cameras: The Trenches meeting the south row, Uptown across
  the ring avenue from Westlake Park, Uptown meeting the town, Uptown North
  across the avenue from the mall, Sunridge's wall from the east strips,
  Crestmont's Flats meeting the open land, the south band, the south
  strips, the east strips, Westlake's west verge, the highway's north-east
  bend, the Docks across the highway from The Trenches, and the open land
  outside the highway looking in. `?shots` (`?shots=night`; `shots.ts`, a
  chunk of its own) goes straight into the city as `?bench` does, clear
  sky, every district loaded, live settings off, the city's header, HUD,
  cards and pins hidden, and holds the camera on a view while
  `window.__shots` asks (`ready`, `show(id)`, `frames`); a view is drawn a
  dozen frames, then rests. `npm run shots -- <label>` (`scripts/shots.mjs`,
  after `npm run build`) serves the built site to a headless Chromium as a
  desktop (1280 x 800, the high tier) and a phone (390 x 844, the low tier),
  by day and at night, still (reduced motion: no traffic, so the same view
  is the same picture) at a fixed clock, and shoots every view: full size
  in `shots/<label>/` (not kept in git), a contact sheet per tier and time
  in `docs/blend-shots/<label>/` for the PR. `SHOTS_BENCH=1` also runs
  `?bench` on each tier and keeps its draws, triangles and memory
  (`bench.md`; headless on the CPU, its frame times mean nothing).
- **The baseline:** the shots and the headless bench in
  `docs/blend-shots/phase-0/`. A real device's `?bench` (Copy results) is
  the owner's to paste here for frame times.

**What the seam map found** (the seams between districts, ranked; the rest
are districts meeting open land or the water, `npm run seams`):

| # | One side | The other | Between | Length (tiles) | Where (x, z) |
|---|---|---|---|---|---|
| 4 | Downtown | The town | the ring avenue | 164 | 27, 5 |
| 12 | Uptown | Westlake Park | the ring avenue | 148 | -123, 1 |
| 17 | Starlight Mall | Palm Court | the east ring avenue | 114 | 69, -99 |
| 21 | Uptown North | Westlake Park | nothing (side by side) | 114 | -41, -99 |
| 22 | Uptown North | Starlight Mall | the north avenue | 108 | 1, -101 |
| 31 | The town | Starlight Mall | a street | 48 | 35, -37 |
| 32 | The town | Uptown | a street | 42 | -37, 37 |
| 34 | The town | The Trenches | a street | 47 | -29, 159 |

The longest seams are districts meeting open land: the airport (1,338
tiles round its fence), Crestmont (790), the kart park and the Docks (460
each), Sunridge's wall inside the highway (402), Westlake (278), The
Trenches along the highway (210) and the stadium (246).

**The gaps** (open land inside the ring highway: 25% of it):

| Gap | Area (sq tiles) | Box (x0, z0, x1, z1) | Next to | Already on it |
|---|---|---|---|---|
| The south band, the airport's old land (`south-band`) | 33,140 | 69, 141, 269, 315 | the town | the metro's pillars (18) |
| Sunridge's fringe (`sunridge-fringe`) | 5,360 | 69, -165, 269, -9 | Sunridge, Palm Court, the town | 2 solids |
| South strip, middle (`south-strip-m`) | 3,476 | 19, 169, 41, 315 | the town | metro pillars (3) |
| East strip, middle (`east-strip-m`) | 3,428 | 125, 19, 269, 41 | the town | nothing |
| South strip, west (`south-strip-w`) | 2,320 | 1, 169, 15, 315 | The Trenches, the town | metro pillars (2) |
| South strip, east (`south-strip-e`) | 2,320 | 45, 169, 59, 315 | the town | metro pillars (2) |
| East strip, by the east road (`east-strip-n`) | 2,308 | 125, 1, 269, 15 | Sunridge, the town | nothing |
| East strip, by the river (`east-strip-s`) | 2,284 | 127, 45, 269, 59 | the town | nothing |
| Westlake's west verge (`westlake-verge`) | 1,316 | -209, -165, -143, -9 | Westlake Park, the stadium | nothing |
| The north verge (`north-verge`) | 904 | -137, -165, -9, -157 | Westlake, Uptown North, the stadium | nothing |

(Since this report the Neon Mile, docs/strip-plan.md, was merged in on the east strips' land: those three gaps are gone, the Strip an area of its own; `npm run seams -- --md` gives today's tables.)

No place's arrival spot stands on a gap (the test holds it). The south band
alone is about two thirds of the open land; the metro's main line crosses
it and the south strips on its way west.

### Phase 1: foundations (the clean-up) (built)

Little changes on screen but the trees' edges.

- **The palette** is `palette.ts` (DOM-free, tested in
  `tests/palette.test.ts`): `COVER` (rough, the open land; lawn, pad,
  planted, median, garden, island, dry, worn, worn lawn, dirt, bare,
  paving, concrete), `KERB` (town, grit), `TREE` (the crowns' greens, the
  trunk, the pines) and `LAMP` (white, sodium: bulb, halo, pool). world.ts
  and every file that drew ground of its own (the fight club, the kart
  park, the squares, the kits, Sunridge, Harbour Bridge, Uptown's streets,
  Crestmont, The Trenches' grit and street walls, the mall, the el's and
  Pier 7's lamps) take their colours from it; the test fails if a file
  writes one of the ground's own colours. Every value as it was: nothing
  changed on screen. The white lamps' warm light is also the city's warm
  light (lanterns, lit windows, a dozen files): it stays where it is until
  Phase 6 mixes the lamps.
- **One clearing rule** is `landuse.ts` (DOM-free, tested in
  `tests/landuse.test.ts` at both world sizes): `KEEPS`, everything the
  outskirts' trees keep off (the highway and its verges, every street of
  the plan and its slip lanes with a verge, `STREET_VERGE`, the town, the
  mall, Crestmont's Flats, hill roads and hills, the kart park, the Docks,
  Sunridge, The Trenches, the waterfront, Uptown, Westlake, the stadium,
  the airport and its approach, the river and the metro's line,
  `EL_CLEAR`), filed by tile; each margin wobbled further out by a smooth
  seeded noise (`wobble()`, 0 to `WOBBLE` 3 tiles, never in), so a tree
  line along a street or a district comes out ragged (the test holds the
  verge's width varying along a straight avenue). `treeSpot()` asks it. It
  replaced the `keepTreesOff()` calls in five modules (four of them made by
  drawing code), the 34 x 34 boxes round the highway's junctions (the slip
  lanes themselves are kept off now) and the strips along the arterials.
  Keeps added since the densities were measured carry `since`, so the old
  land's measure (`freeLand()`) still matches `BELT_FREE` / `OPEN_FREE`.
  Placing the trees takes about 70 ms where it took about 165.
- **The belt without a cliff:** `beltShare()` in outskirts.ts: the belt's
  density out to `BELT_EASE.full` (8) past the town's box, easing to the
  open land's by `fade` (40), as many trees in the band as before. The test
  counts the trees against the land free today at the densities.
- **Leftovers out:** the test district's ground (`drawBlock()`,
  `drawStreet()` in kits3d.ts) and its walking slabs (`addSlabs()` in
  walk.ts), `gridPlan()` and its blocks (streetplan.ts; the arterials,
  `gridStreets()` / `gridCrossings()`, keep their tests), the old sites'
  `HIGHWAY_NORTH` (stadium.ts) and `SITE_U` / `SITE_V` (kartpark.ts), and
  the crew's last mentions in sound.ts and catalog.ts. Nothing else of the
  retired features was left. Not retired, but unused, and left for now:
  a few exports nothing reads (airfield.ts `CONNECTOR_NAMES`, docks.ts
  `SIDE_NAMES`, karts.ts `kartSilhouette()`, movesim.ts `bendPull`,
  skydeck.ts `PAVILION`, wallet.ts's helpers, site.ts `SITE_URL`) and two
  CSS rules (`.fight-style.is-soon`, `.nowrap`).
- **Measured:** the boot 666.7 KB of 680 (up 0.7 for the palette and the
  rule); 995 tests at both world sizes. A headless boot logs one
  pre-existing console error (a geometry with NaN positions,
  `computeBoundingBox()`), the same before this phase: one for the fixes.

### Phase 2: the ground (built)

- **Covers on the ground's own grid:** `ground.ts` (DOM-free, tested in
  `tests/ground.test.ts` at both world sizes). `coverAt(x, z)` is a mix of
  the palette's covers: the open land rough grass with seeded patches of
  meadow and dry grass (`openMix()`, `PATCHES`), and over it, in turn, each
  of `INFLUENCES`: a worn verge along every street (one influence a street,
  measured to its nearest stretch), dry grass along the highway's verges,
  lawn round the town, Westlake Park, Uptown, the mall, the stadium and the
  kart park, dry grass round Sunridge, Crestmont and the airport, gravel
  and dry grass round the Docks, worn grass and bare dirt round The
  Trenches, lusher grass down to the river. Each eases out over its reach,
  the reach itself wobbled by a noise (`REACH_WOBBLE`), so nothing ends on a
  line; the test holds every half tile's change small. `colourAt()` is the
  same worked out straight into a colour (every vertex asks it).
- **Painted on the vertices:** world.ts's `buildGround()` makes each piece
  of the ground a grid only as fine as it needs (`groundStep()`, `GRID`: one
  quad where a district covers it all, 15 apart past 60 from the built-up
  area, 5 near the city, 10 on phones) and paints it (`paintGround()`); the
  hills rise out of the same colours (`tintHills()` starts from them). No
  texture, no new draw. Measured: about 35,000 vertices and 49,000
  triangles on the desktop (the ground was 2,500), 15,000 and 15,000 on
  phones; about 40 ms to paint on the desktop warm, about 85 ms the first
  time (a phone's boot pays that, several times slower).
- **The greens one family:** the palette's planted verges, Sunridge's
  lawns, the mall's islands and the worn lawn drawn in towards the city's
  green (`#3a7a50`, `#4a9257`, `#5f925a`, `#4a7a4e`); new covers meadow,
  dry grass, gravel and the river's bank grass (moved from world.ts).
- Not in this phase: the worn patches where people walk come with Phase
  7's paths; the blocks' slabs still step up from the ground (Phase 3).
- **Seen:** `docs/blend-shots/phase-2-try/before-after.webp` (five views,
  desktop by day, before and after).

### Phase 3: the block edges (built)

- **The verges** are `verges.ts` (DOM-free, tested in
  `tests/verges.test.ts`; worked out when the site is built, `baked()` key
  `verges`, so the boot carries the list, not the search): each straight
  side of every block's slab walked a tile at a time and looked past
  (`OUT`), and where it's open land (`openAt()`: off every street of the
  plan and the highway, Uptown's lay-bys and Coral Drive's bays, every
  slab, the water, the docks' basin and the airport) the stretch is a
  verge, a step in from the corners, if the open land runs at least `DEEP`
  (5) past it (a sliver between two blocks gives neither a verge); and the
  Parkway's and the Southside Loop's outer kerbs, a verge a piece where the
  belt lies past them. 189 in all: about 1,300 tiles of block edge (The
  Trenches along the highway, Sunridge's land, the stadium, Westlake Park,
  Crestmont, the mall, Uptown and Uptown North, Palm Court) and 280 of the
  bends' (167 since the Neon Mile came in on the east strips' land: the
  town's and Palm Court's edges there meet its streets now, and its own
  blocks are streets all round, so it takes none). The page carries them packed (the blocks' a few numbers each,
  the bends' one flag a kerb piece; `pack()` / `unpack()`), and the areas
  they take after are `areas.ts` (small, so the boot never takes the seam
  map).
- **The bank:** along each the slab eases down to the ground over `RAMP`
  (1.1), drawn by world.ts's `buildVerges()` in pieces a tile or less long:
  the block's own cover at the top, the ground's colour there at the foot
  (ground.ts), its ends closed. Walking and driving follow it
  (`vergeY()` in walk.ts's `groundAt()`).
- **The district's edge** along the foot (`BY_CHARACTER`): a clipped hedge
  round the town and Crestmont's estates (its top a shade lighter, near
  only), a low stone wall with a coping round Uptown, Uptown North, Palm
  Court and the mall; the park, the stadium, The Trenches, the Docks and
  Sunridge (its own perimeter wall) just the bank. A way through `GAP`
  wide every `GAP_EVERY` (12) along a run (a bend's verges count from its
  start, `s0`, so their gaps keep one spacing). Solid (`VERGE_SOLIDS`, in
  `SOLIDS`), low enough to vault (in vault.ts's `LOW_THINGS`), clear of
  everything else solid and every place's spot (the test); the outskirts'
  trees keep off the banks and the hedges (`KEEPS` in landuse.ts).
- **Kerbs:** the grey and the purple never meet (the seam map: a street
  between The Trenches and the south row everywhere), so no shared stone
  was needed; both are the palette's.
- Not done: the block's corners keep their kerb step (the verges stop a
  step short of each corner, so the bank and the kerb never fight).
- Measured: the boot 672.2 KB of 680 (4.2 more than Phase 2: the verges'
  code and their packed list); about 1,500 bank triangles and 412 hedge
  and wall boxes (the bends' in short slanting pieces). The shots take a
  one-off camera too (`SHOTS_EXTRA`) for a close look:
  `docs/blend-shots/phase-3-close/`.

### Phase 4: gentle rolls (built)

- **Where:** the open land outside the ring highway only (the owner's
  "outside the town"; the gaps inside it are Phase 5's and stay flat for
  their neighbours to fill). Today that's the north-west past Westlake
  Park and Uptown, the strip west of the highway, the land north of the
  highway's north side and south of its south side: Crestmont, the
  airport, the Flats, the kart park, the stadium and the Docks hold the
  rest. A wider world gets more of it by itself.
- **The rolls** are `rolls.ts` (DOM-free, tested in `tests/rolls.test.ts`;
  kept beside `terrain.ts`, whose `heightAt()` still means the hills and is
  0 everywhere else): heights on a lattice `ROLL.cell` (15) apart on the
  world's own grid, from fixed waves (`shape()`: swells to `up`, 1 tile,
  about 1.8 m; dips to `down`, 0.45), the same for everyone and whatever
  the world's size. Between the lattice points the ground is each cell's
  two triangles, split from its low corner to its high one
  (`rollsAt()`): world.ts draws exactly those (`rolledPlane()`), and any
  finer grid laid on the lattice (desktop's, a cell in thirds) draws the
  very same surface, so what's walked and driven on is what's drawn, to
  the millimetre.
- **The mask:** a lattice point's share is 0 wherever anything the
  outskirts' trees keep off (landuse.ts `KEEPS`: every street, block and
  district, the airport, the river, the metro's line, the verges), the
  land inside the highway, the hills' land or the world's edge comes
  within `ROLL.clear` (a cell's diagonal and two raster steps) of it, so
  every triangle touching any of them is flat; past that it rises over
  `ROLL.ramp` (30). Working it out asks the clearing rule all over the
  world (about 150 ms), so it's baked when the site is built (`baked()` key
  `rolls`, a digit a point) and made only when first asked for elsewhere
  (the tests, the game server).
- **What follows them:** walking, driving and flying (walk.ts's
  `groundAt()`, which drive.ts and fly.ts read; the step down a slope),
  the walk camera (`rollsAlong()` in `cameraRoom()`), shots (`rayBoxes()`
  in solids.ts) and the outskirts' trees and woods (set into the slope a
  little). Nothing else stands there yet; Phase 8's countryside will.
- **Drawn:** the ground's pieces over the rolls are grids on the lattice
  (`rolledPlane()`: desktop near the city a cell in thirds, as before;
  phones and far out a cell a quad, coarser than the phones' grid was, so
  no heavier), their vertices painted as the ground's (ground.ts), the
  crests drier (`COVER.dryGrass`), the lows lusher (`COVER.bank`), the
  slopes a shade darker; smooth normals, so the ink draws no facets.
- **Checked:** the tests hold the rolls to 0 everywhere the trees keep
  off (every 1.5 tiles over the world), under every solid, door, place,
  spawn, street, slab, the metro, the highway and the river's edges, only
  outside the highway and off the hills, flat at the edge, the steepest
  under 0.12 (walkable and drivable), the drawn surface equal to the
  walked one, the camera and shots stopping on a swell, the flight sim's
  floor on them; the boxgrid test's reference ray has them too.
- Measured: the boot 685.9 KB of 690 (1.8 more: the module and its baked
  digits).

### Phase 5: the gaps inside the highway

Each gap by its neighbours, scenery only, built from the kits and recipes
(`recipes.ts`), one gap a step with the owner's sign-off on each:

- **5a, the band south of the south row (built): Southfield.** `southfield.ts`
  (DOM-free, tested in `tests/southfield.test.ts`), drawn by `southfield3d.ts`
  (a district loaded as you approach, `LAZY_DISTRICTS` id `southfield`):
  - **Southfield Yards** (ref `southyards`, industry): a ring off the south
    bank avenue (`sy-ring`: Forge Street down at x 140, along at z 261 and
    back up as Kiln Lane at x 240, the Docks' way; lit where it meets the
    avenue) with Yard Street across it at z 200 (`SF_STREETS`,
    `SF_CROSSINGS`). North of Yard Street the bus depot (its shed open to a
    forecourt of buses, a gatehouse) and Kingpost Builders (a store, material
    bays with heaps, pallets of blocks); south of it warehouses and a works
    (the kits, `YARD_LOTS`), a truck depot and lock-ups along the ring's
    south leg. Worn concrete and grey sidewalks as the Docks', sodium lamps.
  - **Southfield Park** (ref `southfield`, a park) between the east ring
    avenue and Forge Street: a loop of gravel paths, a pond in a stone rim
    (solid, walked round), the community garden by the south row (raised
    beds, a shed, a polytunnel), benches, a name board, white lamps, 40-odd
    trees in clumps.
  - **The strips** between the small north-south roads, south of the main
    line: allotments down the middle one (54 plots either side of a path,
    sheds on every third, the society's hut) and the east one's south half
    (its north half a community garden); the west one, across the ring
    avenue from The Trenches, lock-ups and warehouses back to back.
  - **The walks:** the railside walk under the airport branch (gravel, shrubs,
    benches; down the inside of its bend and along its north side, 5 off the
    track) and the walk under the main line across the strips' tops.
  - **Nothing moves:** the metro's pillars are worked out from the street plan
    (metro.ts `clearFor()`), so no new street goes within reach of a track
    (the test holds it); the ring stops short of the airport branch. The
    snapshot gains the two new streets (`sy-ring`, `sy-yard`) and nothing
    else.
  - Kept for later (`FUTURE_SITES`): the bus depot, the builder's merchant,
    the lock-ups and the allotment society, no pin, panel or price.
  - The seam map: the south strips' three gaps are gone and the south band's
    is what's left by the highway (the railside, the land south of the
    branch and east of Kiln Lane, 14,252 square tiles of 33,140); open land
    inside the highway is 11%, from 22%.
  - Measured: the boot 690.9 KB, the budget raised from 690 to 700 under the
    owner's standing call (its data in the boot, the routes round the ring).
- **5b, the strips east of town north of the river:** taken by the Neon Mile
  (docs/strip-plan.md), its boulevard and resorts on that land; nothing left
  to fill.
- **5c, the smaller leftovers (built): the verges.** Mapped, the four gaps the
  seam map still lists are slivers between the districts and the highway, 2 to
  30 tiles across, mostly inside the trees' wobbled margins, so they stay open
  land (no block, no street, nothing that moves), dressed by their neighbours:
  `fringes.ts` (DOM-free, tested in `tests/fringes.test.ts`), drawn by
  `fringes3d.ts` from the neighbours' chunks (`registerFringes()` from
  southfield3d.ts, sunridge3d.ts and westlake3d.ts: the boot gets only the
  solids and the trees' keeps, 1.9 KB).
  - **East of Kiln Lane** (Southfield Yards' side): the Kiln Lane substation
    (`SUBSTATION`: a gravel yard in a palisade with its gate on a gravel drive
    off the lane, a brick control house with its name, two transformers with
    their fins, conservators and bushings, a gantry of two portal frames with
    insulators and wires, busbars on posts, warning plates).
  - **Sunridge's fringe** (the suburb's side, between its wall and the
    highway, about 15 across all the way round): a dry wash (`WASH`, a sandy
    bed winding 10 to 14 in from the highway, cobbles and boulders, a culvert's
    concrete headwall at each end, `HEADWALLS`) and a dirt path beside it
    (`FRINGE_PATH`) from Sunridge's footpath at Palm Court up the strip
    between them (squeezed round the end of Palm Court's low wall,
    `PATH_SQUEEZE`), round the fringe and down to the north ring avenue, two
    benches and bins facing the wash. The wash and the path are laid as
    offsets of the highway's own centre line, so they follow its bend.
  - **Billboards** (`BILLBOARDS`, four, one on each side of town: east of Kiln
    Lane, the south-east bend, Sunridge's fringe, Westlake's west verge), each
    on two steel legs with a walkway and three lamps, turned a little off
    square towards the traffic, fixed made-up copy for the city's own places
    (the metro, Westlake Park, the Neon Mile, the Sky Wheel; no price, no
    number), lit a little at night under the bloom.
  - **Scrub** on all four (and the south band round Southfield), wherever a
    tree could stand and a little closer to the highway (not past its lamp
    line), in clumps from a seeded noise: Sunridge's desert plants on its
    fringe (creosote, brittlebush, agave, ocotillo), brambles, gorse and tall
    grass on the rest; phones half, no flowers, pales or cobbles.
  - The trees keep off the compound, the boards, the wash and the path
    (`FRINGE_KEEPS` in landuse.ts's `KEEPS`, `since`); `FRINGE_SOLIDS` (in
    `SOLIDS`: the palisade, the house, the boards' legs, the headwalls).
  - The seam map still lists the four as gaps (open land, 11% inside the
    highway): they're verges now, not land waiting for a district.
  - Measured: the boot 694.6 KB of 700.
- **Sites kept for later** (`FUTURE_SITES`): a few of the new buildings
  marked as places that could be run for Dorras in a later plan, with no
  pin, panel or price now.
- Their streets join the street plan (traffic, taxis, walking and the world
  map read them), their solids `SOLIDS` or `addSolids()` as the districts'.

### Phase 6: transitions between districts

For each seam in the seam map, the treatment it needs:

- **Shared streets:** the streets and arterials between districts get one
  look both sides: sidewalks where people would walk, street trees, the
  same lamps, a shared kerb.
- **6a, lamps mixed at the edges (built):** `lampmix.ts` (DOM-free, tested
  in `tests/lampmix.test.ts`): the sodium districts (`SODIUM_AREAS`: The
  Trenches, the waterfront, the Docks, Southfield Yards) and how far a point
  stands inside them (`sodiumDepth()`, each district's own test with its
  margin halved down to the edge); within `MIX` (18, about a block) either
  side of the edge a lamp is sodium with a share easing from 0 outside to 1
  inside (`sodiumShare()`), picked by its own number from where it stands
  (`lampTone()`); The Trenches' dead and flickering lamps stay its own.
  world.ts's `buildLamps()` takes each lamp's tone from it. No new draws;
  the boot 694.7 KB.
- **Stepped heights:** where towers meet low-rise (Uptown's edge by
  Westlake and downtown, Uptown North by the mall), the edge lots step down;
  where The Trenches meets the south row, its tenements step to the row's
  height.
- **Buffer parks:** a linear park or tree-lined walk where two very
  different districts meet (The Trenches and the south row, the mall's car
  parks and Sunridge's wall, the Docks' yards and the highway).
- **Mixed edge blocks:** a row of in-between buildings on the edge blocks,
  a bit of each style (brick shopfronts with a cleaner face towards Uptown,
  stucco and brick where Sunridge meets Palm Court).
- One seam a step, in the order the seam map ranks them (what's seen most
  first). Ranked today (district against district): Downtown and the town
  across the ring avenue, Uptown and Westlake Park, the mall and Palm Court,
  Uptown North and Westlake Park, Sunridge and the Neon Mile, Uptown North
  and the mall, Southfield and its yards, The Trenches and the yards.

### Phase 7: the in-between details

On the open land, the verges and the gaps, from data (`landuse.ts`,
`ground.ts`), near only where they're small:

- **Paths and desire lines:** worn footpaths across the grass along the
  shortest ways people would take between stops, stations, gates and
  districts' corners (a path graph, DOM-free), drawn as dirt on the ground's
  colours (free) and walkable as the ground.
- **Hedges, fences and walls** by their neighbour: hedgerows on open land,
  chain-link round yards, low stone walls by parks, picket fences by homes.
- **Utilities:** a line of power pylons and cables across the open land to
  substations by the districts, water towers, phone masts, billboards along
  the arterials and later the highway (fixed made-up copy). Pylons under the
  Emporium and clear of every flight (the tests).
- **Water and wild bits:** ponds in the rolls' dips, ditches along the
  lanes with culverts at the crossings, reeds, wildflower meadows, rough
  scrub, rocks. Water at its own level, walking stopping at it.

### Phase 8: the countryside

Outside the ring highway, to the world's edge, at both world sizes:

- **Fields:** patches of crops and pasture (`FIELDS`, seeded, their colours
  on the ground's grid from the palette), hedgerows and field trees along
  their edges, gates, a few hay bales near only.
- **Farmsteads:** a handful of farmhouses, barns and silos (new kits in
  `kits.ts`), each on its own lane with a few trees, under the Emporium.
- **Country lanes:** narrow lanes off the arterials' far ends to the
  farmsteads (in the street plan, light traffic or none).
- **The woods further out:** `WOODS` starting where the fields thin, their
  edges ragged, copses in the fields between.
- Keeping clear of the airport, the kart park, the stadium, the Docks,
  Crestmont's hills and their approaches (`landuse.ts`).

### Phase 9: the corridors (after the raised highway)

Once `docs/highway-plan.md` is built:

- **The highway's verges:** the ground under and beside the viaduct
  dressed: rough grass and scrub, gravel under the deck, planting by the
  ramps, its sound walls (the highway plan's) planted on the town side by
  homes.
- **The arterials outside the highway:** verges, a ditch or a hedge each
  side, lamps at the junctions, trees in groups, not strips.
- **The junctions:** each a small piece of landscape, not a cleared box.

### Phase 10: polish and performance

- Every review view shot by day and at night, desktop and phone, side by
  side with Phase 0's.
- `?bench` against the baseline: phones no heavier, desktop within what the
  owner agrees.
- Every width checked where any overlay changed (the world map draws the new
  streets, paths and fields).
- CLAUDE.md updated with what each phase built.

## Open questions for later phases

- **Phase 5:** what each gap holds in detail (a bus depot? allotments? a
  school or a fire station?), once the seam map has measured them.
- **Phase 7:** where the pylon line runs, and whether billboards may carry
  the city's own made-up ads (the Emporium, the kart park) or only made-up
  businesses.
- **Phase 8:** the skyline ring's towers past the edge are drawn outside the
  haze while the ground under them fades into it, so seen from out in the
  open land (`docs/blend-shots/phase-4-try`, `rolls-mid`) their feet seem to
  float over the horizon; the countryside should carry the ground to them
  (or the haze to their feet). Found in Phase 4, there before it.
- **Phase 8:** how farmed the countryside looks (neat fields, or more
  pasture and wild land), and whether the farmsteads get names.
- **Later:** which of `FUTURE_SITES` become places to run, in their own plan.
