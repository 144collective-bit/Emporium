# A 50 km² Sector 7: the plan

How the world could grow from about 2.5 km across to about 7 km across,
some 50 km², with better graphics, and the game as an app as well as a web
page. Phase 4's first step, the GPU lab, is built (below); nothing else is
yet. Like the other plans, it waits for the owner's sign-off one phase at a
time. Keep it up to date.

## What the owner asked

- If the game were made an app, what are the possibilities? Could the world
  be huge and the graphics better?
- Which way is best for a map of 50 square kilometres?

The short answer: an app on its own doesn't make the world bigger or the
graphics better. Two things do:

- **Loading the world's data as you go** (Part A). Today the boot carries
  everything the city knows about itself.
- **A better renderer** (Part B): three.js's WebGPU renderer, which works in
  the browser and in an app alike.

The app wrap (Part C) then adds store listings and assets kept on the
device, and lifts the download budget. The world grows last (Part D), in
steps, filled by the building kits and recipes.

A native engine (Unity, Unreal, Godot) would manage 50 km² with less work of
its own, but it would be a rewrite of the whole game. It would also lose
playing from a link. For Degen's toon style with ink outlines it doesn't pay
for itself (see "Why not a native engine", below).

## Where it stands (measured elsewhere)

These numbers come from `docs/performance-plan.md` and `CLAUDE.md`.

- **The world:**
  - `EXT` runs from -680 to 720: 1,400 tiles, about 2.5 km across, about
    6.3 km².
  - One tile is about 1.8 m.
  - `WORLD_BOUNDS` sits 6 inside `EXT`.
- **The boot's code:** 694.6 KB zipped, against a budget of 700
  (`scripts/budget.mjs`).
- **Each frame:**
  - 150-450 draw calls, the scene drawn twice (the ink's pre-pass, then
    colour), then bloom.
  - The GPU is the limit, not JavaScript.
- **Memory:**
  - Phones: textures about 62 MB, geometry about 88 MB.
  - Near forms are held against `nearBudget`: 96, 64 and 32 MB by tier.
- **Shadows:** near only (`shadows.ts`), and none on phones.
- **The camera:**
  - Near plane 0.5. The far plane is `CAMERA_FAR`: the sky dome's radius
    (about 1,090 today) plus 40. Both come from the edge (`bounds.ts`).
  - The haze swallows most of the city well inside that.
- **What's already ready to grow** (growth plan Parts A and B, performance
  phase 4):
  - Tiles and merging per tile (`tileBatch()`), and the collision grid
    (`BoxGrid`).
  - Near and far forms.
  - Sites built as you go and let go past the budget (`tilework.ts`).
  - Sites built off the main thread (`sitework.ts`).
  - Districts' drawing loaded as you approach (`LAZY_DISTRICTS`).
  - Textures made at build time.
  - The edge as data, with the tests run at a second size
    (`npm run test:wide`).
  - Traffic and boats spent near you.
  - Getting about: the world map, waypoints, taxis, fast travel, the metro
    and the river bus.
- **What isn't ready:** everything the city *knows* is in the boot. This
  covers:
  - The street plan (`cityPlan()`) and every district's DOM-free data.
  - `SOLIDS` and the collision grids.
  - The baked data in the page (the traffic's routes, the crowd's clips,
    the commons, the verges, the rolls).
  - Where every tree and lamp stands.
  - The places.

  That's right for today's world. At eight times the area it would be
  roughly eight times the boot's data, parse time and memory.

## What 50 km² means

- **The world's size:**
  - About 7.07 km across, about 3,930 tiles: `EXT` about -1,945 to 1,985,
    still centred near today's middle (20).
  - 2.8 times as wide and 7.9 times the area of today's world.
- **The GPU's numbers:**
  - The far corners stand about 2,800 tiles (about 5 km) from the middle.
  - At that distance a 32-bit float is still good to a fraction of a
    millimetre, so world positions as they are today (tiles merged in world
    numbers) are fine.
  - Keeping coordinates round the player (a floating origin) isn't needed at
    this size. It would be past about 10-15 km.
- **Depth:**
  - The sky dome's radius grows with the edge, to roughly 2,900, so the far
    plane would be about 5,800 times the near one.
  - A 24-bit depth buffer then resolves only about a tile at the far end
    (about 0.15 of a tile today), so far roofs and roads would flicker
    against each other.
  - That needs a reversed depth buffer or a logarithmic one (Phase 2).
- **Crossing it:**
  - About 3 minutes edge to edge in a fast car, about 15 minutes running.
  - Getting about (taxis, fast travel, the metro, the highway) has to reach
    it all (Phase 3).
- **Filling it:** some 44 km² of new land is far more than hand-planned
  districts can fill.
  - Most of it would be laid by the building kits' recipes (`kits.ts`,
    `recipes.ts`): the countryside, the suburbs, the industry and the
    corridors.
  - Hand-made landmarks and district centres would go among them, each with
    the owner's sign-off as today.

## The rules every phase follows

- **Nothing that exists moves.** `tests/snapshot.test.ts` holds every place
  where it stands.
- **The web page stays.** The site keeps working in the browser at every
  phase. The app is the same game, never a fork of it.
- **Phones first.** What a phone holds stays about the same whatever the
  world's size: it streams, it never piles up.
- **Desktop stays as it is or better.** A phase never makes desktop look
  worse to make room.
- **Measured before and after:** `?fps`, `?bench` and the blend plan's
  `npm run shots`, on a phone and a laptop.
- **The tests pass at both sizes**, today's and the big one (`WORLD_EXT`,
  `npm run test:wide`).
- **The content rules hold everywhere:** made-up names, no token details,
  Dorras never real money, the draft note.

## Part A: ready for size (in the browser, today's renderer)

Part A's phases help today's world too, so they come first.

### Phase 0: measure at 50 km²

- A test world at the big size, `WORLD_EXT=-1945,1985`, beside
  `test:wide`'s.
- List what grows with the world's area and what doesn't. That covers:
  - The boot's data, in bytes and in parse and build time.
  - The baked data in the page.
  - The collision boxes and grid cells.
  - The trees, lamps and sites, the routes, the ground's vertices, the rolls
    and the verges.
  - The world map's drawing.
  - The game server's memory and start-up.
- `?bench` views at the big world's edge and from high over it.
- The output is a table in this plan: what to stream, what to bake smaller,
  what's fine.

### Phase 1: regions (the world's data loaded with it)

- Cut the world into regions: a few square kilometres each, whole numbers of
  tiles, with the town and everything built today as the core region.
- The boot keeps only the core region's data and a small index of the rest.
  The index holds each region's rect, its places (for the map and fast
  travel) and the streets that join it.
- A region's data module carries its street plan pieces, solids, trees and
  lamps, places, routes, and its baked data. It's loaded as you approach,
  ahead of its drawing, the way `LAZY_DISTRICTS` loads a district's drawing
  today. It's let go when you're far away.
  - The street plan, the routes and the grids take a region's pieces in and
    out: `BoxGrid` gets a `remove()` beside `add()`.
  - Traffic, the taxis' `pathBetween()` and walking's slabs read whatever's
    loaded.
  - A taxi or fast travel to a region that isn't loaded waits for it behind
    the fade it already has.
- The game server loads every region (it has the memory) and checks
  movement and hits as before. The wire format doesn't change.
- Tests: every region's data joins the core's exactly as if it had all been
  in the boot. The tests check this the way `tests/baked.test.ts` holds
  baked data to `make()`.

### Phase 2: the far view

- **Stand-ins for whole districts far away** (HLOD): each district or block
  of tiles past a distance drawn as one simple mesh made at build time.
  - The mesh is its buildings' outlines and roofs with lit windows baked in,
    by day and at night.
  - The performance plan measured this and left it until the districts grew.
    This is when they do.
- **Depth:** a reversed depth buffer (or a logarithmic one where that isn't
  supported), so the far city doesn't flicker. Check the ink outlines' depth
  pass with it.
- **The haze and the horizon:**
  - The haze is tuned so the edge of what's drawn never shows.
  - The skyline ring moves out with the edge (it already follows `EXT`).
  - The ground far out stays coarse (`groundStep()`).
- **The far plane and the sky dome** as today, from the edge. Check that the
  sky stays behind everything and the stars hold still.

### Phase 3: getting about at 50 km²

- **The world map:**
  - Its picture of the far regions made at build time as image tiles, the
    near ones drawn from the street plan as today.
  - Every region's places come from the index, so "Find a place" knows them
    before they're loaded.
- **Roads:**
  - An outer route (a second ring out past the raised highway, carried
    out) so the far regions are a drive, not a crawl.
  - Its traffic spent near you as today.
- **The metro and fast travel:**
  - The metro reaches the new regions where the owner wants stations.
  - Fast travel covers everywhere you've been, as today.

## Part B: the renderer (WebGPU)

three.js's WebGPU renderer works in the browser and in an app. Where WebGPU
isn't there, the game keeps WebGL 2, so nobody is left out.

### Phase 4: the WebGPU renderer, looking the same

- **Step 1, the GPU lab (built, the owner's go):** `?gpu` in the address
  (`gpulab.ts`, tested in `tests/gpulab.test.ts`) opens over the page with
  no city behind it, like the animation lab.
  - **The device:** whether the browser has WebGPU and its adapter, and
    WebGL 2's GPU.
  - **The test city** (`labCity()`): buildings on a grid in eight toon
    colours, instanced trees, cars moving, the sun's shadows but on phones.
    It's drawn two ways: `batched` (merged per colour, a few draws, as the
    city's tiles are) and `many` (a draw a building, where WebGPU's lighter
    draw calls should show).
  - **Three renderers:** today's WebGL renderer, WebGPURenderer on WebGPU,
    and WebGPURenderer on its own WebGL 2 backend (the fallback a port to
    node materials would run on where WebGPU isn't there).
  - **Each run** settles, then measures with the GPU caught up before and
    after (`sync()`), so frames a renderer queued without drawing count. A
    lost GPU device fails the run with its reason.
  - **Results:** a card with Copy results (with the device), the console
    and `window.__gpulab`. `?gpu=quick` runs shorter; `only=` picks
    renderers.
  - **three's WebGPU build** is a chunk of its own (`three-webgpu` in
    `astro.config.mjs`, 160 KB zipped), fetched only by the lab. It has its
    own budget row (`webgpu`, 200 KB), and the budget fails if the boot
    ever takes it. It shares three's core with the boot, so the core's parts
    only the WebGPU renderer uses stay in the boot's `three` chunk: about
    4 KB more there (717.2 to 721.7 of 730), which the city on WebGPU will
    need anyway.
  - **First numbers** (the test machine's software GPU, so only good for
    comparing):
    - The lab runs, at desktop and phone sizes.
    - Today's renderer: about 21 draws batched against 1,890 many, the
      frame's CPU time 1.1 ms against 8.7.
    - The new renderer on its WebGL backend draws the same city but costs
      about three times the CPU on the many-draws load (27 ms). The WebGL
      fallback would be the slow path: keep today's renderer for devices
      without WebGPU until that's measured on real phones.
    - Headless Chromium's software WebGPU loses its device as soon as
      anything is drawn to a screen, three's smallest example too, so
      WebGPU's numbers have to come from real devices.
  - **Next:** run `?gpu` on the owner's phones and computers and paste the
    results here before step 2.
- **Step 2, behind a switch** (`?gpu=webgpu` for the city itself), WebGL the
  default until it's proven.
- Check support on the devices that matter first: recent iPhones and iPads,
  mid-range Android phones, Chrome, Edge, Safari and Firefox on desktop.
- Port what's tied to WebGL's shaders today into three's node materials
  (TSL), one at a time, each checked against today's picture with
  `npm run shots`:
  - **The post chain:** the ink outlines' normal and depth pre-pass, bloom
    with its mip levels, SMAA, and the phones' FXAA and thin ink
    (`post.ts`).
  - **The shared materials:** `toon()` and `neon()` folded per vertex, the
    `lit` day and night mix, the far forms' material, the uptown-glass
    office lights (`OFFICE_GLSL`).
  - **Shadows:** the near-only fade (`SHADOW_GLSL`, `patchShadowChunks()`)
    and the two maps (fixed and moving).
  - **The crowd's skinning on the GPU** (`injectCrowdSkin()`, its depth and
    normal passes) and the wind's sway (`injectWind()`).
  - **The water,** the sky, the hologram, the LED faces, the Sphere's
    shader, the waterfall and ribbon scrolls.
- Shaders compiled for the right target at the boot (`compileFor()`), as
  today, so nothing hitches.
- Nothing new is drawn in this phase: the same city, the same frame rate or
  better.

### Phase 5: what WebGPU buys

Each item below is its own step, measured, and phones take only what's free
for them. The owner picks which and in what order.

- **The GPU picks what to draw:** culling and indirect draws on the GPU, so
  thousands of buildings, far more trees and more of the city at full detail
  cost a few draws.
- **Shadows further out on desktop:** cascaded shadow maps reaching the whole
  view, not only near (`shadows.ts`'s fade carried out).
- **Ambient occlusion** under the ink outlines: soft contact shadows in
  corners, under cars and at the feet of buildings, in the toon style's flat
  steps.
- **The atmosphere:** light shafts and volumetric haze at dusk and in the
  rain. The river's water gets better reflections of the city and the neon.
- **The crowd and the traffic on compute:** more people and cars for the
  same cost, moved on the GPU.
- **Sharper textures** where the app carries them (Part C).

The bloom rule holds: minimal bloom, nothing washes out.

## Part C: the apps

### Phase 6: the game as an app

- **Phones:** Capacitor for iOS and Android. The game in the system's web
  view, which uses WebGPU where the system has it.
- **Desktop:** Tauri, or Electron if Tauri's web view on Windows or Linux
  falls short. It's one fixed browser engine, so WebGPU is the same on every
  desktop.
- **The assets on the device:**
  - The baked textures, motion capture and region data ship with the app or
    download once.
  - The app build gets budgets of its own (`scripts/budget.mjs`); the web's
    stay as they are.
- **An `app` quality tier** over desktop's where the device allows: full-size
  textures, more near forms held (`nearBudget`), more people and traffic.
- **Saves:**
  - localStorage carries on in the web view.
  - The Vault's backup file (`backup.ts`) works there too.
  - Moving a save between the web and the app goes through the backup.
- **Multiplayer:**
  - The app's origins go in `ALLOWED_ORIGINS` (`server/wrangler.jsonc`) for
    the workers.dev beta only.
  - degenemporium.com's build stays single-player, as the owner decided.
- **The stores:** check each store's rules at the time, before any work on
  store builds.
  - A full game passes the "not just a website" test.
  - The wallet login needs care under Apple's rules on crypto; it could be
    left out of the store builds.
  - Dorras are never bought, so no store payments come into it. If anything
    is ever sold, the stores take their cut.

## Part D: growing the world

### Phase 7: the edge out, in steps

- Out from 1,400 tiles to about 2,400, then to about 3,930 (50 km²). Each
  step:
  - The tests at both sizes.
  - The regions, the far view and the roads to reach it.
  - Shots and the bench before and after.
- **The land laid by recipes:**
  - New recipes as the owner picks them: countryside and farms, villages,
    suburbs, industry, a coast if the river reaches the sea.
  - Each region gets its kits and its ground in the palette and blended at
    its seams (`docs/blend-plan.md`).
  - The rolls and woods carry on outside the highway.
- **New districts** each get a plan of their own with the owner, as every
  district has. No buildings in bulk outside the tiles and sites.

## Why not a native engine

- **What it would give:** Unreal's World Partition, Nanite and Lumen, or
  Unity's streaming, handle a 50 km² world and near-photoreal lighting
  without much of the work above.
- **What it would cost:**
  - A rewrite of the whole game: about 330 files of the city's code, its
    menus, and the DOM-free rules.
    - The rules would be ported, or kept on the game server.
  - Phone builds of several gigabytes.
  - No more playing from a link.
- **When it would be worth it:** if the owner wants a different, realistic
  look, detailed interiors everywhere, or a world well past about 100 km².
  None of that is the plan today.

## Questions for the owner

- **The order:** Part A first (good for today's world too), or WebGPU first
  (the graphics sooner)?
- **What's out there:** what should the new land be? Countryside, more
  towns, a coast, mountains? This sets the recipes.
- **Which apps:** phones, desktop or both? Store listings, or a download
  from the site?
- **Phase 5's picks:** which of WebGPU's gains matter most?
