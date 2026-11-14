# Performance and engineering: motion, phones, start-up, draw calls, shadows, near and far, sites, kits, measuring

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- Keep the city's motion optional: under `prefers-reduced-motion` the 3D
  city stands still (no fly-in, no traffic) and CSS animations stop. It's drawn only when something changes
  (`dirty` in index.ts): what's built as you go asks for a frame at most
  once a second (`builtShows()`). Sound is always off until the visitor
  turns it on.
- Keep phones light: `src/scripts/city3d/index.ts` picks a quality tier
  (fewer cars and people, no shadows, smaller bloom on phones), runs phones
  at 30fps while nobody is touching the city, and steps quality down
  (pixels, then shadows, then bloom; never the ink outlines) if frames are
  slow. When frames stay fast again, bloom and then pixels come back (once
  each; shadows stay off, re-enabling them recompiles every material).
  The trim (the owner's call, phones only; `docs/performance-plan.md`):
  trees are lighter near (a dodecahedron canopy, four-sided trunks, open
  five-sided cones) and two crossed flat cards far (`crossedCards()` in
  `world.ts`, the tile's far piece), and half the outskirts' trees (the
  belt and the woods, `scatterOutskirts()`'s `keep`) are left out; lamps
  are four-sided and open-ended; parked cars are always their far form
  (`initFarCars()`'s `parkedAlwaysFar`); every other idle person in The
  Trenches and downtown (the square, the market, the landmarks) is left
  out (`buildPeople()` in `life.ts`) and there are 15 walkers (`TIERS`).
  Phones also draw the big canvas textures (512 x 512 pixels or more: the
  atlases, the long signs) at half size, a quarter of the memory
  (`canvasTex()` in `kit.ts`; a draw function works in the numbers it
  asked for and never knows; a texture redrawn live in pixels afterwards
  must stay under that size, and goes through `liveTex()`). Phones draw the bloom at 3 of its 5 blur levels (`bloomMips` in
  `post.ts`: a softer glow, 4 fewer passes a frame); desktop draws all 5. Phones draw the ink outlines thinner (`thinInk` in
  `post.ts`: each line on one side of its edge only, one texel out, about half
  the width, its edges soft) and smooth the picture with FXAA last (`fxaa`,
  three's shader in its own chunk after the boot; phones draw no MSAA or
  SMAA); desktop's are as they are, but for a retina screen's (the
  stability plan's Phase 2, `docs/stability-plan.md`): the high tier at
  1.75x pixels and over draws no MSAA and smooths with SMAA
  (`antialias()` in `targets.ts`, DOM-free, `tests/targets.test.ts`). MSAA
  is the scene's own pass only: the composer's second buffer, which the
  ink, bloom and output passes draw full-screen quads through, has no MSAA
  and no depth (`post.ts`). What the render targets and shadow maps hold is
  counted in `?fps`, `?bench` and `__mem()` (`targetMemory()` in `perf.ts`).
- **Start-up stays light** (performance phase 2,
  `docs/performance-plan.md`):
  - Data that's the same for everyone is worked out when the site is
    built, not in the browser: `baked(key, make, pack?, unpack?)` in
    `baked.ts` returns what the build made (`scripts/bake.mjs`, run from
    `astro.config.mjs`, loads the modules in Node and records what each
    `make()` made; since the polish plan's Phase 4 the build writes it all
    to one hashed JSON file under `/_astro/`, `baked.<hash>.json`, and the
    page carries only its address, `__CITY_BAKED_URL__`: baked.ts awaits
    the fetch at its top level, so `ROUTES` and the rest read it as they
    load, the page starts the fetch beside the city's code (`__cityBakedP`,
    CityMap.astro), the site worker is handed the data with the chunk's
    address, and a stale file after a deploy reloads the page once, as a
    stale chunk does), or works it out with `make()` where there's none
    (the tests, the game server). Today:
    the traffic's routes (`routes.ts`, packed with `packRoutes()`: each route's points as millimetre steps in one string), the
    crowd's walk, jog and march cycles (`crowdclips.ts`, rounded to a ten-thousandth as they're recorded, `rounded()`) and The Trenches'
    amenities (`commons.ts`), the blocks' verges and the rolls, and since the
    start-up profile (`docs/performance-plan.md`) the metro's pillars and
    raised stretches (`metro.ts` `PILLARS`, `PLATEAUS`) and what's under the
    highway's deck (`viadress.ts` `UNDER`). A new module that bakes goes in `MODULES` in
    `bake.mjs` and in `tests/baked.test.ts`, which holds every key to
    exactly what `make()` makes. Baked data must be plain (numbers,
    strings, arrays, objects): anything with references packs and unpacks.
    Pass `BUILT ? undefined : make` (`BUILT` is the site's own build,
    `__CITY_BUILT__` in astro.config.mjs) and what only `make()` uses folds
    out of the browser's code (the route generator, the amenities' layout,
    the crowd's recorded cycles); the tests, the server and the bake run it.
  - Features load when they're used, each its own chunk (`import()`):
    the fight (`fight.ts` and the figures' clips, when the trainer's menu
    first opens: `loadFight()` in `walk.ts`; the menu itself, `fight-ui.ts`,
    the first time the trainer opens it, `lazyMenu()`; the City-view panel's
    record is `fight-records.ts`, at the boot), the animator with the motion
    capture and the on-foot extras (`onfoot.ts`: the emotes, the gaze, the
    vault and the moments' keyed poses, `momentposes.ts`, one chunk
    fetched when walking starts; until it's in an emote is skipped, the
    gaze still, nothing vaulted and a moment plays no pose; the hologram
    fetches the emotes on its own after the boot), the stage of the fitting room
    and the character screen (`stage.ts`), SMAA and the phones' FXAA (`post.ts`), the sound's synth
    (`sound.ts`, on the first tap of Sound: the boot holds `soundlazy.ts`, silent until it's in, which makes
    the audio context in the tap for `createSound(given)`), the fight
    demo, the benchmark (`?bench`, `bench.ts`), Drop 001's fitting room
    (`fitting.ts`, when its panel first opens: `loadFitting()` in index.ts)
    the world map (`worldmap.ts`, when it first opens: `loadMap()` in
    travel-ui.ts; `placeName()` is places.ts's), the gun store, the
    garage's and the hangar's menus (`gunshop.ts`, `garage-ui.ts`,
    `hangar-ui.ts`: each loads the first time its door or counter opens
    it, `lazyMenu()` in walk.ts; the saved car and aircraft are read by
    `loadCar()` in mycar.ts and `loadPlane()` in myplane.ts, in the boot)
    and the kart park's game
    (the clubhouse's menu and the race, `kartgame.ts`: `loadKarts()` in walk.ts,
    when Degen comes near the park or asks at the hut; idle stand-ins until
    then; the City-view panel's records are `kart-records.ts`, at the boot,
    and the cups the boot reads are `kart-cups.ts`, so the race's rules,
    `kart-sim.ts`, come with the race), the economy's screens
    (`tycoon-ui.ts`: the business card's views, the market hall and the
    building panels' parts, the first time one opens; `tycoon-boot.ts`
    keeps the save, its tick, the Dorras readout, the missions and the
    card's shell in the boot, and `TycoonCore` is what they share) and
    target practice (`combat.ts` with `viewmodel.ts` and `stance.ts`, behind
    `combat-lazy.ts`, which walk.ts holds as `combat`: the same shape,
    fetched once the first frame is drawn since the targets stand in the
    city from the start; until then it answers from the save and replays
    what was set). A dynamic import goes through `lazy(load, what)` in
    `lazy.ts` (walk.ts's `lazyMenu()` too): a failed fetch toasts
    "Couldn't load <what> · reload" once and the next call tries again. New
    features that aren't needed until they're used come the same way. three.js is a chunk of its own (`manualChunks` in
    `astro.config.mjs`), so a deploy that doesn't change it leaves it
    cached.
  - A service worker (`public/sw.js`, registered in `Base.astro` in the
    built site only) keeps the files in `/_astro/` (named by their contents)
    on the device for return visits; pages always come from the network.
    `.htaccess` keeps `sw.js` itself uncached.
  - Shaders are compiled for where the city draws, the post chain's
    linear target (`compileFor()` in `index.ts`: at the boot, with
    `compileAsync`, each site as it's built and each place's far form as
    it's made). `renderer.compile()` with the screen as the target makes
    sRGB programs no frame uses, and the real ones then compile the first
    time they're drawn (a hitch): never call it bare.
  - **Textures made at build time** (performance phase 4): every canvas
    texture the boot paints (`canvasTex()` in `kit.ts`) is painted once by
    `scripts/bake-textures.mjs` (`npm run bake:textures` after a build;
    the "Build site" Action runs it, on `ubuntu-24.04`: pinned, since
    Playwright 1.56 has no Chromium for `ubuntu-latest`'s 26.04, and
    without one the bake is skipped and the budget fails; locally,
    `CHROMIUM_PATH` points it at a browser) in a headless Chromium with
    `?bake-textures`, for phones (`low`) and everyone else (`full`), twice
    each (a fresh save at noon, a well-used one at midnight): only what
    both runs painted the same is kept, so a key (`texKey()`: what draws
    it, its size, how many like it came before) stands for one picture.
    Only what the boot painted counts: index.ts calls
    `bootTexturesPainted()` (kit.ts) as the loader goes, and the bake keeps
    the textures painted up to then (`__texBakeBoot`). A district loaded as
    you approach paints its own whenever it arrives, so counting those made
    the set differ run to run (2026-11: two extra kept on one run tipped
    `texLow` over its budget); the bake logs any it left out.
    Each is GPU-compressed (KTX2: Basis ETC1S, UASTC where ETC1S loses
    too much), written to `_astro/tex/` and listed in the page
    (`#city-tex`); `loadBuiltTextures()` loads them with three's
    transcoder (`_astro/basis-<three's version>/`) and the boot waits for
    them (up to 8 s, then they come in as they arrive). The bake waits for
    the web fonts; if it can't run it warns and the site paints them as
    before. A texture drawn from the save or changed while the city runs
    (units, lots, corner shops, the garage's car, karts, guns, the
    first-person hands, the stage, the LED wall, a sign with `live: true`
    in `neonSign()` / `facade()`) uses `liveTex()`: always painted, never
    baked. A drawing that changes means a new bake (every build makes
    one). `?textures=0` paints them all in the browser, to compare.
  - **Sites built off the main thread** (performance phase 4,
    `sitework.ts`): a worker imports the city's own chunk, registers the
    same sites the boot does (The Trenches' builders, every tile's trees
    and lamps from the main thread's `placed()`) and builds them as
    they're asked for (`IN_FLIGHT` at a time, nearest first, from
    `works.step()` in `tilework.ts`), sending each mesh's arrays and its
    material's name; the main thread joins them with its own material of
    that name (`siteMat()` / `siteMatOf()` in `kit.ts`: every material a
    site draws with needs one, the Batches' shared ones have theirs). A
    site whose material has no name, and anything wanted at once (the
    boot, `want()`, `wantView()`, near pieces built again) is built on
    the main thread. The worker closes once every site is built.
    `?worker=0` turns it off. A new district's builders go in
    `serveSites()` too.
  - **Budgets** (`scripts/budget.mjs`, `npm run budget` after a build; the
    "Build site" Action runs it): the homepage's HTML, the page's own
    script, the 3D city's boot code (its chunk and what it imports
    straight away), the biggest lazy chunk and the CSS, gzipped, each
    under a fixed size. Raise one only on purpose, never to get a build
    through. The wallet's log-in library (`@walletconnect`, only in the
    Worker's build with a game server, loaded when someone connects a
    wallet) has its own row, `walletJs` (120 KB, the owner's call, 2026-11:
    its core alone is 112 KB, which held the Worker's build red at
    `lazyJs`): astro.config.mjs names its chunks `wallet-*` (a chunk made
    of nothing but packages other than three.js's, Astro's and Vite's;
    every other chunk keeps Astro's own name), and `lazyJs` counts the
    rest. The baked data's file is an information row (`baked`); on CI
    (`process.env.CI`) a build without the texture sets made at build time
    is red (`texLow`, `texFull`: the bake didn't run or failed).
- One render loop only: always (re)start it with `loop()` in `index.ts`,
  which cancels any frame already queued. A hidden tab holds its queued frame
  back, so a bare `requestAnimationFrame(frame)` on return stacks a second
  loop (each tab switch another) and the frame rate sinks. 120/144 Hz screens
  draw every other refresh (steady 60-72fps), and nothing is drawn while the
  city is scrolled out of view.
- **Draw calls are the budget.** Build static geometry through a `Batch`
  (`kit.ts`): plain `toon()` colours (no options) and `neon()` fold into
  shared materials with the colour per vertex (`sharedFor()`), so a Batch's
  plain colours are one draw and its steady neon another (each vertex
  carries its day and night brightness in a `lit` attribute the shared
  neon's shader mixes by the time of day; only flickering neon is a draw
  per brightness). Never change a
  plain `toon()` or `neon()` material's colour at runtime (give anything that
  changes colour its own material, or instance it with `setColorAt`). Many
  copies of one thing are instanced (trees, lamps, traffic lights, birds,
  crowds, cars). A moving thing merges its fixed parts (`mergeMeshes()`).
  A box with side and top materials is `sidesBox()` (two draws, not six).
  Signs that come in sets share one canvas atlas, a row each, and merge
  into one mesh (the market's canopies and boards, `atlas()` /
  `rowPlane()` in `market.ts`; the Emporium's LED wall is one mesh with one
  occluder).
  Flat things are flat: the lane markings are two-triangle planes, tree
  trunks open-ended (triangles count too). `tileBatch()` files each
  triangle under the tile its middle is in, so nothing fixed may have a
  triangle much longer than a tile (it would go with that tile when it's
  out of view): world.ts draws a block bigger than a tile a piece per tile
  (`tiled()`, `tiledSlab()`: the lot as its top, the sidewalk a `ring()`
  laid on it), and long things go in stretches.
  `consolidate()` merges each landmark's Batch meshes per material after the
  city is built (not for the units and lots, which rebuild theirs).
  Everything else fixed (the Batches built straight onto the scene, and the
  airport's and kart park's) is merged **per tile** by `tileBatch()`
  (`tilebatch.ts`, growth plan Phase 1): each material's triangles split by
  the tile (`tiles.ts`, `TILE` 30) their middle is in, each tile's share one
  piece of a `BatchedMesh`, so it's still one draw per material but only
  the pieces in view are drawn (and in the shadow map only those in the
  sun's shadow box). Fixed things spread over the map go through a Batch
  too, not an InstancedMesh: `Batch.instances()` (the trees, lamps and road
  markings), so they're split by tile with the rest. Moving instanced
  things (crowds, traffic) draw only what's in view and put what's in the
  sun's shadow box first, so the shadow map draws only those
  (`CROWD_VIEW.shadow`, `onBeforeShadow` / `onBeforeRender` set each
  mesh's count per pass). The shadow map is drawn once a frame (`post.ts`),
  however many passes render the scene, and the ink outlines' normal and
  depth pre-pass only reaches as far as the outlines do (its own camera's
  far plane at the ink's `fadeFar`), so the far city is drawn once, not
  twice. A place's hover ring isn't drawn while it's faded out. Measure
  with `?fps` and `?bench` before and after. A tick that moves a
  landmark's parts every frame asks `nearGate()` (`nearby.ts`) first: it
  draws only while the camera is within about 200 of it (a margin's
  hysteresis), the clock-driven state behind it running on so it's right
  the moment it comes back; the metro's cars are placed twice a second
  when the train is far.
- **Shadows are near only** (the owner's call; `shadows.ts`, DOM-free,
  tested in `tests/shadows.test.ts`): drawn only while walking or driving
  (`sky.setShadows()`: not in the City view, not up in an aircraft), easing
  in and out, the shadow box (`SHADOW.reach`) ahead of the camera
  (`shadowCentre()`) and the shadows fading out well inside it
  (`fade0` to `fade1`, round the same centre in every lit material's shader:
  `SHADOW_GLSL`, patched into three's chunks by `patchShadowChunks()` before
  anything compiles), so the box's edge never shows; nothing is sampled
  past the fade. Two maps (`sky.ts`): the sun's holds the city's fixed
  shadows and is drawn again only when it's due (`staticDue()`: the centre
  moved `move`, the sun turned `turn`, `refresh` seconds, or something new
  was built: `invalidateShadows()`), with everything that moves hidden from
  it; a second light (black, lighting nothing, light 1) holds what moves,
  drawn every frame from only those (`drawShadows()`, called by post.ts's
  shadow hook). What moves is `isMoving()` in kit.ts: skinned figures,
  instanced meshes whose instances move (`DynamicDrawUsage`), anything
  with `userData.keep`, and what's tagged `moving()` (your car, karts, the
  far cars, boats, the blimp, the drones, the dummies' cards, the
  Armoury's barrier); a new thing that moves and casts gets tagged. A
  Batch's near-only details cast no shadows (`build()`'s `details`: the
  street lamps keep theirs). The medium tier's maps are 768 with a softer
  filter (`shadowRadius`); phones draw none. Both maps are made (cleared)
  before anything samples them, even in the City view.
- **Near and far** (growth plan Phase 2): past the tier's `far` (`TIERS`:
  120 high, 110 medium, 90 low) from the camera, things are drawn in a far
  form; `isNear()` in `tiles.ts` decides, with a margin so nothing flickers
  on the line.
  - A Batch's details are near only (`Batch.lod`, `Batch.detail()`; Lod
    'all' / 'near' / 'far'): `tileBatch()` keeps each tile's near and far
    pieces apart and swaps them together (`tiled.update()`). The infill's
    walls, roof slabs, signs, the diner's neon and the offices' crowns are
    drawn at every distance (`k.all()` in `infill.ts`), everything else on
    a building is near only, and so are the alleys', lanes' and parks'
    dressing, benches, bollards, the promenade's posts and the lamps (their
    halos stay). New fine detail on a building goes in near only.
  - Each place (every spot's group, the garage, the market) has a far form
    (`farForm()` in `lod.ts`): everything in it flattened into one mesh
    coloured per vertex with a glow per vertex for lit windows and neon
    (`farFormMaterial()`, by day and at night), triangles under `TINY` left
    out; big textured surfaces (facades) keep their textures, merged per
    material. What must stay as it is (the hologram, the LED wall, the
    equalizer, beams and glows, glass, Liberty's flames, the garage's
    turntable with your car, anything moving: `keeps()`, or
    `userData.keep` on a part) is drawn at every distance. The near parts
    move into a `<name>-near` group, so code that shows or hides a part
    still can. `addLod()` / `addLodSwitch()` swap them (`updateLods()`
    from `index.ts`). They're made after the first frame, a place at a
    time in spare moments (`farQueue` in `index.ts`); until then a place
    stays near. Once a place's far form has shown `FREE_AFTER` (15 s), its
    near form's geometries are freed on the GPU (`release()` on its switch,
    `geometry.dispose()`: the arrays stay, three uploads them again as
    they're next drawn; the stability plan's Phase 3, item 6); `?fps` says
    how many and how much (`freedNear()`). Code that changes a near part's
    geometry while it's far needs nothing special: it's uploaded when drawn.
  - Cars far away (parked and traffic) are their model's far form
    (`farCarGeometry()` in `cars.ts`: the body and cabin outlines
    extruded, block wheels, about a hundred triangles), all in one
    `BatchedMesh` (`initFarCars()`, `theFarCars()`, growing when a
    district's parked cars fill it), one draw for every far car; a parked lot swaps whole, a car in traffic by its own
    distance. On phones parked cars are always far (the trim).
- **Building as you go** (growth plan Phase 3): the fixed city outside
  the places is made of sites (`site(id, rect, build)` in `tilework.ts`):
  a function that draws a piece of the city from data into Batches only
  (no ticks, crowds, solids or pools of light; those stay with the boot),
  the same every time it runs. Today they're each tile's trees and lamps
  (`world.ts`), the airport's grounds (`airportgrounds3d.ts`, loaded as you approach) and the
  kart park's grounds and circuit (`kartgrounds3d.ts`); new districts and
  building kits come as sites.
  - The boot builds only the sites in the home view's and the intro's
    tiles (`bootSites()` in `tileplan.ts`) and merges them with the rest
    (`tileBatch()`); the others wait and `works.step()` builds them a
    share of the time since the last frame (15%, 2-3 ms at 60fps, up to
    10 ms on a slow phone: its CPU is free while the GPU draws), and the
    frames that draw nothing build too (`spare()` in `index.ts`: a phone
    resting at 30fps, a fast screen's in-between frames). The start menu
    covers the city completely, so behind it the city is drawn only once
    a second and each frame builds for 24 ms. Nearest first: in the City
    view nearest what it looks at (`look`, `CROWD_VIEW.focus`), walking
    round Degen, and ahead of the camera when it moves fast (`focusOf()`,
    `LOOK_AHEAD`). What's built later joins the same batched meshes
    (`TileBatches.add()`; a mesh grows when it's full).
  - Places ask first: `flyTo()` (every panel's fly-in), walking in
    (`startWalking()`) and the intro (`works.wantView()`) build what's
    waiting where they're going, so nothing pops in on screen.
  - A tile far away (past `far` + `KEEP_LEAD`) lets its sites' near pieces
    in the shared materials go when what's held passes the tier's
    `nearBudget` (`TIERS`: 64, 48, 32 MB, high's and medium's lowered from
    96 and 64 in the stability plan's Phase 3a; `?budget=MB` in the address
    overrides it, for testing), furthest first (`toRelease()`); it's drawn
    far until the site runs again and puts them back, before it's near
    (`toRebuild()`, `REBUILD_LEAD`). The room they took is reused
    (`BatchedMesh.optimize()`) before a mesh grows. The places, the
    landmarks and downtown's monolithic builders are built at the boot and
    never let go.
  - The rules are DOM-free in `tileplan.ts` (tested in
    `tests/tileplan.test.ts`); the tile pieces and the scheduler are
    tested too (`tests/tilebatch.test.ts`, `tests/tilework.test.ts`).
- **Building kits** (growth plan Phase 4): what a new district is built
  from, as data, so a district is a few lines, not hand-placed buildings.
  - `kits.ts` (DOM-free): the kits (`KitId`): the downtown six
    (brownstone, shop, diner, loft, office, hotel), the terrace and the
    warehouse (rows), the house (in its yard), and one to a block: the
    factory, the school, the mall, the stadium stand and the crane;
    `KIT_SPEC` (widths, floors, front strip), `heightOf()`, `bigParts()`,
    `lotFrame()`, `lotSolids()`; nothing taller than `KIT_TALLEST` (11.2,
    under the Emporium).
  - `recipes.ts` (DOM-free, seeded): `RECIPES` (midtown, mainstreet,
    terraces, suburb, warehouses, rowhouses (The Trenches' brownstones
    and corner shops), and factory / school / mall / stadium /
    works, one big kit each) and `layBlock()`: a row along every straight
    side of a block's outline (the land inside its sidewalk), downtown's
    way (widths in the kit's range, a few set back, alleys with bollards,
    corners to the longer side, slanted sides left as they are), houses
    with yards between, or the big kit filling the inside. Each building
    comes with its footprints, so the collisions come from the same
    recipe. `layDistrict()` lays a district block by block.
  - `kits3d.ts` draws them: the downtown six through infill.ts
    (`infillBuilding()`, its helpers exported), the rest here, all from
    the wall atlas, the sign atlas and the shared materials; walls, roofs,
    signs and lit trims at every distance, details near only, phones
    leaving out the finest. Signs are fixed copy from `SIGNS` (the kits
    added `school`, `mall`, `stadium`; their blades are left out).
    Nothing drawn in a site goes into the city's own lists (a rooftop
    garden's trees are drawn in the site's own Batch, `IN_SITE`).
  - The test district that proved the kits (`?district=test`) was retired
    in Phase 9 (the owner's call: The Trenches took its land); the recipes'
    test lays its 20-block grid as a fixture instead. A district laid by
    recipes joins every grid through `addSolids()` (`solids.ts`,
    `BoxGrid.add()`), its blocks go in the street plan (so walking's slabs
    have them), and the outskirts' trees keep off it (its land in `KEEPS`,
    `landuse.ts`).
  - Tested in `tests/recipes.test.ts`.
- **Vertices are packed** as they join a batched mesh (`compact()` in
  `tilebatch.ts`; `docs/performance-plan.md`, phones' geometry memory):
  normals as signed bytes and the shared paint's colours (all 0 to 1,
  `userData.paint`) as 16-bit shares, both `normalized`, 29 bytes a vertex
  where there were 44. A new shared material whose colours stay 0 to 1 can
  be marked `paint` too; one whose colours pass 1 must not be.
  `window.__mem()` under `?fps` says where the geometry memory is.
  The uv is left out where nothing reads it (`dropsUv()` in
  `tilebatch.ts`, the stability plan's Phase 3b): the shared materials
  have no texture, and only the paint's trees' sway reads the uv
  (`injectWind()`), so the shared materials' pieces carry none, but the
  paint's while its trees sway (`UV.sway`: every tier but phones'). 21
  bytes a vertex there. A shared material that comes to read its uv must
  be kept out of `dropsUv()`.
- **Past the haze, far tiles go altogether** (the owner's pick: only on the
  ground, only what the haze already hides; `docs/performance-plan.md`,
  phones' geometry memory step 2; every tier since the stability plan's
  Phase 3a, `docs/stability-plan.md`, where it was phones only). On every
  tier, while walking, driving or riding (not the City view, which keeps
  everything, the owner's call; not up in an aircraft), `hazeHorizon()` (`tileplan.ts`) turns the scene's fog into the
  distance past which under a hundredth of anything is left. A tile
  `HORIZON_OUT` past it lets go of everything its sites drew in the shared
  materials, at every level (`toVanish()`, `TileBatches.vanish()`), sites
  still waiting out there wait on, and the meshes are made smaller once
  enough has gone (`trim()`). A tile coming within `HORIZON_BACK` of it gets
  its always-drawn and far pieces back (`toReturn()`, `regain()` in
  `tilework.ts`: its sites run again), its near pieces when it's close, as
  before; back in the City view every one returns, nearest first. `want()`
  and `wantView()` bring back what they need at once. The haze keeps its full
  thickness on the ground (`sky.update()`'s `ground`: only the City view
  thins it), so the horizon is the same wherever you walk. `?horizon=N` forces a
  distance on any tier while walking, `?horizon=0` turns it off. Tested in
  `tests/tileplan.test.ts` and `tests/tilebatch.test.ts`.
- `?fps` in the address (`.city-stats`, built in
  `index.ts`): fps, slowest frame, draw calls and triangles per frame, the
  shadow map's share (`post.shadowStat`), geometry and texture memory
  (`sceneMemory()` in `perf.ts`), how many tile pieces were drawn and
  tiles are near, how many far forms are showing, how long the boot took (art, build and its own work less the waits, tiles, shaders), the sites built (at the boot, after, the slowest, waiting) and the near forms held against the budget, quality tier, pixel ratio and any
  quality stepped down. Use it on
  real devices before and after changes; it's invisible without the
  parameter.
- **Memory ceilings** (`docs/stability-plan.md`, Phase 5; the owner's
  picks): `MEMORY_CEILINGS` in `targets.ts` (MiB). `npm run memcheck`
  (after a build and `npm run bake:textures`; `scripts/memcheck.mjs`, about
  13 minutes) builds the whole city on a headless phone under `?bench` and
  holds its geometry, textures and render targets to the phone's; `npm run
  memcheck -- soak` adds the leak check (`SOAK_MIN`, 20: half the City
  view, half walking). The "Memory" Action runs it by hand only. The
  desktop's render targets are held by a formula (`pictureTargets()`,
  `pictureBytes()` in `targets.ts`, `tests/targets.test.ts`), which
  memcheck holds to what the phone measures: **a change to the targets
  post.ts or sky.ts make goes in `pictureTargets()` too.** Lower a ceiling
  when a change cuts it; raise one only on purpose.
- `?bench` runs the benchmark (`bench.ts`, growth plan Phase 0): straight
  into the 3D city, clear day (`?bench=night` for night), quality held, the
  same views (`BENCH_VIEWS`: home, a downtown street, the square, the Build
  overview, the airport, the kart park, a junction on the ring highway,
  The Trenches round The Block, Degen's home in the Ends, the Neon Mile from over its boulevard and down it,
  where the edge was before Phase 6, the far edge (from `EXT`), and since the
  polish plan's Phase 10 Uptown North, the mall, Harbour Bridge, Sunridge,
  Southfield and Lot 9 (`BLEND_VIEWS` has the same six for the shots)) measured for a few
  seconds each, once every site is built (it builds faster while it
  waits), then a 48 s camera route through them (all but the view from high over every district). Results (fps,
  average / 95th-percentile / slowest frame, CPU ms, draws and triangles,
  the shadow map's, memory, boot) go in a card on the page, the console and
  `window.__bench`; the card's **Copy results** button copies them with the
  device (its user agent and screen), so a real phone's numbers can be
  pasted back. Run it before and after anything that could make the
  city heavier, on a phone and a laptop.
- `tests/snapshot.test.ts` holds every place, door, pad, lot, spawn,
  landmark, downtown building and street where it stands
  (`tests/fixtures/layout.json`; a street's end at the world's edge is
  `'edge'`). Nothing that exists moves; only when the owner moves something
  on purpose, rewrite it with `UPDATE_SNAPSHOT=1 npm test -- snapshot`.

- **Districts loaded as you approach** (performance phase 4, item 10):
  a district's drawing is a module of its own (`LAZY_DISTRICTS` in
  `districts.ts`: an id, its land and `load()`, a dynamic import), a chunk
  the boot never downloads. `createDistricts()` loads it when what the
  camera looks at (or Degen, walking) comes within the tier's `far` and
  `LEAD` of its land; its `register({ low, scene, tick })` registers its
  sites (and, given the scene and the city's tick, anything the main thread
  draws itself, moving things too), the site
  worker loads the same module from its `SELF` (`import.meta.url`) and
  registers them there (`SiteWorker.load()`), and then `works.adopt()`
  queues them. Everything else about a district (its blocks and streets
  in the street plan, its solids, where its trees and lamps stand, its
  places) is DOM-free data in the boot, so nothing waits on the chunk.
  `?bench` loads every district before it starts. A new district comes
  the same way.
