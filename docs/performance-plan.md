# Performance plan: solid, fast and ready to grow

The owner's call: "I want this world to be built solid and fast. It needs to
be future proof for expansion." This is the report from the first round of
fixes (fix phase 1, phones) and what can be done next, before the city grows
any further (growth plan Phase 9's next districts, Phase 10's bigger world).

All numbers are from the phone tier (390 x 844, touch) in the test machine's
software renderer. It's slower than a real phone's GPU, so frame rates are
only good for comparing before and after; draw calls, memory and work done
in JavaScript are the real thing.

## Where the time goes today

| | What we measured | What it means on a phone |
|---|---|---|
| **Filling in** | 1,155 sites (the outer city) built after the start menu, 2 ms a frame | The "large buildings slowly coming in": 249 s on the test machine before the fix |
| **Start-up** | About 13 s to the start menu (2 s making the WebGL context and 3.4 s sizing it in the software renderer; the rest our own code) | 1.7 MB of JavaScript (566 KB zipped) to download and parse; data worked out at load (the street plan, the traffic's 67 routes, The Trenches' layouts) |
| **Each frame** | Little JavaScript (the main thread is mostly idle); the GPU is the limit | 150-450 draw calls, the scene drawn twice (the outline pre-pass, then colour), bloom, 0.25M triangles |
| **Memory** | Textures 117-135 MB, geometry 76 MB, 143 shader programs | Phones can run out of GPU memory and reload the page; every shader program is compiled once, a stutter each |

## Fix phase 1 (done)

- **Building faster.** The start menu covers the city completely, so behind
  it the city isn't drawn (once a second, to get its shaders ready) and the
  frame goes on building sites. After it, sites build for a share of the
  time since the last frame instead of a fixed 2 ms (a slow phone draws few
  frames; while its GPU draws, its CPU is free), and the frames a phone
  skips at 30fps build too. The City view builds what it looks at first.
  **Filling in: 249 s to 64 s on the test machine**, more on a real phone
  (the skipped frames and the start menu's time don't show in that test).
- **Lighter frames.** The outline pre-pass only draws as far as the outlines
  reach (they've faded out by 140), so the far city is drawn once, not
  twice. A place's hover ring isn't drawn while it's invisible (17 draws).
  The 2D map's animations hold still behind the start menu.
- **Less memory on phones.** The big canvas textures (the wall and sign
  atlases, tags, long signs) are drawn at half size: a quarter of the memory.
- **Quicker start.** The traffic's routes are worked out in half the time
  (a grid of junctions instead of checking every one), the same routes.

Measured on the phone tier, the old build and the new one back to back:

| | Before | After |
|---|---|---|
| The city filled in, from the start menu | 249 s | **64 s** |
| Texture memory | 141 MB | **62 MB** |
| Geometry memory | 79 MB | 88 MB (more of the city held near at the time) |
| Draws, out by the old edge / at the far edge | 445 / 408 | **270 / 254** |
| Triangles there | 245k / 295k | **142k / 164k** |
| Frame rate there (software renderer) | 3.5 / 4.3 | **5.5 / 4.5** |
| The camera route through every view | 4.1 fps, 235 draws | **4.6 fps, 194 draws** |
| The traffic's routes worked out | 745 ms | **356 ms** |
| Downtown, the square, The Trenches, the airport | unchanged (within a few percent) | |

## Fix phase 2 (done): every flow at every width

Every flow played in the real build at 320, 375, 768, 1024 and 1440 wide and
a phone on its side, with a busy save: every place's panel, the header's
cards, the world map, Build mode, the 2D map; walking, the gun store, the
metro and taxis; driving, flying, a kart race, a spar, the fitting room and
the character screen. Checked for sideways scroll, buttons off screen or
clipped, buttons covering each other, and errors. Fixed:

- The header's cards (☰ Menu, ⚙ Settings, Dorras, level) are never taller
  than the screen; on phones the Menu's last links were out of reach.
- The fast-travel toast waits for a menu, panel or the metro's card to
  close instead of landing on its header.
- The gun store's header on phones: title and × always on the first row.
- A place's panel sliding in no longer widens the page by 8 px.

No page errors anywhere. Left as they are: an open bottom sheet covers the
walk buttons under it (on purpose).

## Fix phase 3 (done): the code clean-up

So the speed work lands on clean code. Nothing in the city looks or plays
differently: the tests pass at both world sizes, the built CSS has exactly the
same rules, and the city builds the same meshes and geometry as before.

- **Dead code out.** 15 exports nothing used (retired features' helpers:
  the old kart network's `yawAt`, the club's `clubPeople`, id lists, a
  street gap, ...), and about 65 unused imports and locals across 35 files.
  `addSolids()` / `addSlabs()` and the kits' `drawBlock()` stay: they're
  how the next district joins in.
- **Dead styles out.** Rules for markup that no longer exists (the panels'
  old lists and steps, the wallet's plot list, the 2D map's rebar and
  second beacon, the fitting room's "free" tag, the kart hut's old course
  grid and tag, the street races' warning note).
- **Big files split.** `global.css` (5,600 lines) into `global.css` (the
  site), `city.css`, `walk.css` and `economy.css`, imported in the same order;
  `landmarks.ts` (2,400) into `landmarks.ts`, `emporium.ts`, `armoury.ts` and
  `landmark-kit.ts` (the helpers they share).
- **A type check in the build.** `npm run typecheck` (TypeScript, now a
  declared dev dependency, with no unused locals allowed) runs in the "Build
  site" Action before the tests: a type error or a leftover stops the zip.
- **Docs.** Stale mentions fixed (a retired test district, a function that
  no longer exists, the ring highway's neighbours, "real plot sales", the
  Action's "play-money demo").

## Performance phase 2 (done): a quicker start, and guard rails

Items 1, 2, 4, 6, 11 and 12 below. Nothing in the city looks or plays
differently (but for the phones' glow, the owner's call): the tests pass at
both world sizes, and a test holds the baked data to exactly what the
browser used to work out.

- **The city's data worked out at build time (2).** The traffic's routes,
  the crowd's walk and march cycles and The Trenches' amenities are made
  once when the site is built (`scripts/bake.mjs`, `baked.ts`) and shipped
  in the page as one JSON string (about 310 KB, 84 KB over the wire). The
  searches behind them got quicker too (squared distances, number keys,
  the amenity spots sorted once, each block's outline worked out once):
  the city's data modules load in about 480 ms on this machine, from 690.
- **The 2D map held back.** The isometric map (550 KB of SVG, 10,000
  elements, 200 animations) was laid out and timed on every visit behind
  the start menu. It now waits, inert, in a `<template>` and goes in the
  page only when the 2D view is picked or 3D isn't available. This was the
  biggest single cost of the start.
- **Features loaded when they're used (1).** SMAA (60 KB, desktop only),
  the fight (when the trainer's menu first opens), the fitting room's and
  character screen's stage, each a chunk of its own; three.js a chunk of
  its own, so a deploy that leaves it alone keeps it cached. The kart race,
  flying and Build mode stay in the main chunk: they're tied into the city
  at the boot (the show kart, your aircraft in its hangar, the plots), so
  splitting them is a bigger change for little (about 100 KB raw).
- **Return visits (4).** A service worker (`public/sw.js`) keeps the
  fingerprinted files in `/_astro/` on the device: a second visit takes
  every one of them from there. Pages always come from the network, so an
  upload shows straight away.
- **A lighter glow on phones (6).** The bloom at 3 of its 5 blur levels on
  the phone tier: 4 fewer passes a frame and the widest halo left out (a
  touch tighter, nothing washes out). The outlines and the picture's
  resolution are as they were (the owner's call).
- **Budgets that fail the build (11).** `scripts/budget.mjs` (`npm run
  budget`, run by the "Build site" Action after the build): the homepage's
  HTML, the page's own script, the 3D city's boot code, the biggest lazy
  chunk and the CSS, gzipped, each under a fixed size. Budgets for sites'
  build times, draws and memory per view need a real GPU and stay with
  `?bench` (12, done in fix phase 1) on real devices.

### What phase 2 measured

Headless Chromium as a phone (390 x 844, CPU slowed 4x), from opening the
page to the start menu's "The city is ready", best of 3:

| | before | after |
|---|---|---|
| Ready | 16.3 s | 12.5 s |
| The city's code before it's up (gzipped) | 568 KB | 590 KB |
| The homepage's HTML (gzipped) | 95 KB | 92 KB |

Both measured in the same session (the machine varies a second or two
between sessions). The step by step, in an earlier one: 17.9 s, 15.8 s with
the data baked, 12.3 s with the 2D map held back. The code is a little bigger over the wire (the baked data,
84 KB, against SMAA and the fight, 50 KB, now loaded later), but the
browser no longer works any of it out.

## Performance phase 3 (done): fewer draws, shaders once

Items 5 and 7 below; item 8 measured and left for later. Nothing looks or
plays differently.

- **The crowd in a few meshes (5).** At each level everyone of one outfit
  kind (suits, hoodies, soldiers) shares one mesh per material: every item
  anyone of that kind wears, each vertex knowing its item and its colour
  key. A person's colours and what they wear are a row in one float
  texture (the wardrobe); items they don't wear fold to a point in every
  pass. Grouped by kind because within a kind everyone wears nearly the
  same (a suit's whole set is 5% more vertices than one suit, a hoodie's
  17%; across kinds it would be 71%). The city crowd is 8 meshes instead of
  44, the soldiers 4 instead of 18, and each person one instance per mesh
  instead of one per part (about ten), so the CPU writes a tenth as much a
  frame. Close up the people are pixel for pixel as they were.
- **Shaders compiled once, for the right target (7).** The boot compiled
  every material for the screen, but the city draws into the post chain's
  linear target: each material got a program no frame used, and the real
  one compiled the first time it was drawn (a hitch as you looked round).
  Now they're compiled for the post chain's target (`compileFor()`, in
  parallel with `compileAsync` at the boot), each site as it's built and
  each place's far form as it's made. A phone holds 83 programs instead of
  148, and the benchmark's route compiles 4 after the start instead of 16.
- **Far districts as simple blocks (8): not needed yet.** From the Build
  overview on a phone, every district's tiles (near and far) are about
  17,000 triangles, and the tiles already keep the draws flat (one per
  material however many districts). The far triangles are people (the
  crowd's far level, about 2,000 each out to 170) and the soldiers.
  Impostors are worth building when new districts push the tiles' far
  pieces past about 60,000 triangles from the overview; a lighter far
  crowd on phones (a simpler level, or a shorter reach) is the owner's
  call, as people would pop a little.

### What phase 3 measured

`?bench`, headless Chromium (software GL: the draws, triangles and
programs are what to read; its frame rates aren't a device's). Draws a
frame:

| View | phone before | after | desktop before | after |
|---|---|---|---|---|
| Home | 250 | 232 | 347 | 338 |
| Downtown street | 249 | 223 | 408 | 361 |
| The square | 213 | 194 | 293 | 259 |
| Build overview | 267 | 236 | 454 | 419 |
| The airport | 102 | 78 | 143 | 124 |
| The Trenches | 132 | 105 | 212 | 184 |
| Route (average) | 190 | 180 | 296 | 261 |

The first frame after the boot (where the real shaders used to compile):
2.84 s to 1.27 s on the phone tier, 3.23 s to 1.97 s on desktop.

## Performance phase 4 (done): the foundations

Items 9, 3 and 10 below (10 built with the next district, Westlake Park).
Nothing looks or plays differently.

- **Sites built off the main thread (9).** A worker (`sitework.ts`)
  imports the city's own chunk (already in the browser's cache), registers
  the same sites the boot does (The Trenches' builders, and every tile's
  trees and lamps from the main thread's own list, `placed()`) and builds
  them as they're asked for, nearest first, a few at a time. Each comes
  back as its meshes' arrays (transferred, not copied) and its material's
  name (`siteMat()` in kit.ts); the main thread only joins them into the
  tile meshes with its own material of that name. A site it can't send
  (a material with no name) is built on the main thread, and so is
  anything wanted at once (the boot, a fly-in, walking in, a tile's near
  pieces built again): slower, never wrong. The worker closes once every
  site is built. `?worker=0` turns it off; `?fps` says how many were built
  off the main thread. The tile meshes' bounds now grow with each piece
  instead of being worked out again from every vertex, which took a third
  of the joining.
- **Textures made at build time (3).** Every canvas texture the boot
  paints is painted once at build time instead, in a headless Chromium
  (`scripts/bake-textures.mjs`, run by the "Build site" Action after the
  build), twice for each set (phones' half-size, everyone else's): with a
  fresh save at noon and a well-used one at midnight. A texture is kept
  only if both runs painted it the same, so a texture's key (what draws
  it, its size, how many like it came before) always stands for one
  picture. Each is compressed for the GPU (KTX2: Basis ETC1S, or UASTC
  where ETC1S loses too much, checked by decoding it again) and listed in
  the page (`#city-tex`); the city loads them with three's transcoder,
  which turns them into whatever the device's GPU reads. Textures drawn
  from the save (your units, lots, plots, corner shops, the garage's car,
  karts, guns, the LED wall) go through `liveTex()` and are always painted.
  If the bake can't run, the build says so and the site paints them in the
  browser as before; `?textures=0` paints them anyway, to compare.
- **Districts loaded as you approach (10): built with the next district,
  Westlake Park** (the owner's call). The Trenches costs about 0.2 s of a
  13 s phone start, so it stayed in the boot until the boot's code budget
  ran out (below, 7). How it works (`districts.ts`):
  1. A district's drawing is a module of its own (`westlake3d.ts`), a
     chunk the boot never downloads. What the rest of the city needs (its
     blocks in the street plan, its solids, the lake that keeps walkers
     and cars out, where its trees and lamps stand) is DOM-free data in
     the boot already, so walking, driving, traffic and the world map
     never wait on it.
  2. It's loaded when what the camera looks at (or Degen, walking) comes
     within the tier's `far` and `LEAD` (90) of its land. It registers its
     sites then (`register()`), and the tile work takes them on
     (`works.adopt()`); the site worker loads the same module (its own
     address, `SELF`) and builds them, the main thread waiting a few
     seconds at most for it. The benchmark loads every district first.
  3. Once built it's held like the rest of the city: far tiles let their
     near pieces go past the budget (`toRelease()`).
  4. The budget script holds each district's chunk under `lazyJs`, and the
     bench has a view of it.
  5. Its places, when it has some (the stadium, step 2), are registered by
     the boot from data, so the world map and the directory list them
     before it's loaded, and a fly-in or walking in asks for its sites
     first (`want()`).
  6. The kart park is the second (the north side's stage 2): its grounds
     round the circuit (`kartgrounds3d.ts`, id `karts`) load as you
     approach, the place itself (the hut, garages, stands, gate) stays in
     the boot, and its game (the hut's menu and the race, `kartgame.ts`)
     is a chunk of its own fetched when Degen comes near or asks at the
     hut. With the facility added the boot's code went from 638.5 to
     628.9 KB of 640.
  7. **The Trenches is the fourth** (2026-10, the owner's call: the
     boot's code had reached 639.5 KB of its 640). Its drawing
     (`trenches3d.ts`: the streets, the towers and rows, the commons, the
     grit, the street walls, the riverside's landmarks, the boardwalk) is
     its chunk, 21.7 KB gzipped; what the boot needs of it (its lamps,
     trees, parked cars and people) `placeTrenches()` puts in the city's
     lists from the same data, and its places stay in the boot. It loads
     at once from the home view (its land is within reach), so the only
     difference is that its pieces come a moment after the boot's. At the
     same time the baked data's numbers were cut to 3 decimals
     (`rounded()` in `baked.ts`: the routes' coordinates were written at
     full double precision, 70 KB gzipped on their own); the baked chunk
     went from 95 to 47 KB. Together the boot's code went from 639.5 to
     572.2 KB of 640. Next in line if it fills again: the screens that
     open on demand (the business card and market hall, the fight,
     missions, Build, garage and hangar menus, about 30 KB), then walk
     mode itself (about 27 KB, woven through the boot).

### What phase 4 measured

Headless Chromium, phone tier (the ready times at 4x CPU throttle).

| | before | after |
|---|---|---|
| Sites built after the boot, on the main thread | 1,235 (3.5 s of work) | 32 (1.3 s); 1,203 in the worker |
| Joining sites into the tile meshes | 1.53 s | 0.48 s |
| Texture memory on a phone | 60 MB | 20 MB |
| Ready (start menu up), best of three | 15.4 s | 14.6 s |

What the textures cost to download: phones 1.75 MB and everyone else 2.69
MB (111 textures each, compressed already), plus the transcoder once
(257 KB zipped: a little more than the 100 KB first guessed). All of it is
cached for a year, and by the service worker. The bake takes about seven
minutes of the Action's time. The budgets (`npm run budget`) hold the two
sets and the transcoder.

## What else can be done

Grouped by what it buys. Effort is S (a day or less), M (a few days) or L (a
week or more); risk is how much could break or look different.

### A. Start-up (the city sooner)

1. **Split the code (M, low risk).** Everything is one 1.7 MB file today.
   The kart races, fights, fitting room and character screen, world map,
   flying and Build mode are only needed when you use them: loaded then
   (about 10-15% off the first download and parse). Every future feature
   lands in its own piece, so start-up doesn't grow with the game.
2. **Work the city out at build time, not on every visit (M, low risk).**
   The street plan, routes, The Trenches' towers, rows, tenements and
   commons are the same for everyone: computed once when the site is
   built and shipped as data. Today it's a few hundred ms on this machine
   and grows with every district.
3. **Textures made at build time, GPU-compressed (L, medium risk).** The 129
   canvas textures are painted in the browser at every start. Painted once
   at build time and saved as compressed GPU textures (KTX2/Basis), they'd
   load faster and take 4-8 times less GPU memory, on every device.
4. **Cache for return visits (S, low risk).** A service worker keeps the
   code and art on the phone, so the second visit starts at once.

### B. Every frame (smoother)

5. **Crowds in fewer draws (M, medium risk).** Each person is drawn as
   parts (an item's pieces of one colour), one instanced mesh each: 40-60
   draw calls a view for the crowd alone. One mesh per detail level, the
   colours from a small palette texture, would make it a handful.
6. **A lighter outline and glow chain on phones (S-M, low risk).** The
   outlines, bloom and output as fewer passes, the bloom at fewer levels;
   resolution that follows the frame time smoothly instead of three steps.
7. **Fewer shader programs (M, medium risk).** 143 programs, each compiled
   once (a stutter on a phone). Fewer material variants, and the rest
   compiled ahead in the background (`compileAsync`), so nothing stutters
   the first time you look somewhere new.
8. **Far districts as simple blocks (M, low risk).** Past the far distance a
   whole tile drawn as a few boxes and roofs (an impostor) rather than every
   building's far form: the draws and triangles stay flat however many
   districts there are.

### C. Ready to grow (future proof)

9. **Sites built off the main thread (L, medium risk).** Sites are already
   pure data to geometry. Built in a Web Worker, the main thread only uploads
   the result: no hitch while the city fills in, and twice the speed on a
   phone with two cores to spare.
10. **Districts loaded as you approach (L, medium risk).** Each district (The
    Trenches today, the next ones tomorrow) its own piece of code and data,
    loaded when the camera comes near, and its near and far geometry let go
    when it's far away. Start-up and memory then stay the same however big
    the world gets (Phase 10 is about 1,400 across).
11. **Budgets that fail the build (S-M, low risk).** Tests that hold the
    numbers: the size of the code, how long each site takes, how many draws
    and how much memory each benchmark view may use. A district that blows
    a budget fails before it ever reaches the site.
12. **Your phone's numbers in one tap (S, low risk; done in fix phase 1).**
    `?bench` already measures; a Copy results button on its card, so
    real-device numbers (yours) go straight into the plan.

## Suggested order

Fix phases 1, 2 and 3 and the trim (done) → performance phase 2 (done): **1, 2, 4, 6, 11, 12**
(quick wins and the guard rails) → performance phase 3 (done): **5, 7, 8** (smoother
frames; 8 measured and left until the districts grow) → performance phase 4 (done): **9, 3**, and **10** with the
next district, Westlake Park (the foundations for a much bigger world) → real-device numbers (`?bench` on the
owner's phone and laptop) → 8 once the far tiles pass about 60,000 triangles.

## The owner's decisions

- **Order:** fix phase 2 (bugs and broken flows) and fix phase 3 (the code
  clean-up) first, so the speed work lands on clean code; then the
  performance phases.
- **Foundations: all of them, before any more districts** (9 the sites built
  off the main thread, 10 districts loaded as you approach, 3 textures made
  at build time), so every district after that costs the same to start and
  to hold in memory.
- **On phones only** (desktop stays as it is): a softer neon glow (fewer
  bloom passes) and simpler far districts are fine. The picture's
  resolution stays as it steps today.
- **Real-device numbers:** `?bench`'s card has a **Copy results** button
  (the card's text, the full results and the device), to paste back from the
  owner's phone once the site is live.

## The trim (the owner's call; done, its own PR after the bugs pass)

"Remove some things that may not be important and create strain on the
performance... replaced by more efficient builds." Measured on the phone
tier (the outer city's sites, every one built): trees are 41% of their
triangles (about 1,700 trees, 157k triangles, 17 MB, about a second to
build), the yards' chain-link 4.6%, the lamps 6%; the airport's aircraft
120k triangles; a nearby person 7-9k.

- **Trees, on phones:** simpler models (a lower-poly canopy, fewer sides on
  the pines), flat crossed cards far away, and half the trees out of town
  (the belt round the town and the pine woods; in town, the parks and The
  Trenches keep theirs).
- **Street lamps, on phones:** a simpler post and head.
- **Parked cars, on phones:** always their simple far form (the bays, lots
  and aprons), even close up. Your own car and the traffic stay as they are.
- **People, on phones:** half the idle people in The Trenches and downtown
  (the square, the market, the landmarks), and 15 walkers instead of 30.
- **Everywhere:** the chain-link round the Trenches' yards becomes a low
  worn concrete kerb (a gap at every way in); the fences round the
  community gardens and the two vacant lots come out. The courts', the
  soccer cage's and The Block's chain-link stay.
- **Kept:** the Trenches' small details (washing lines, chess tables, trash
  bags, the bays' cars, tags, bills and shutters) and the aircraft.

### What the trim measured

The phone tier, the build before and after back to back (the software
renderer: frame rates only for comparing).

| | Before | After |
|---|---|---|
| Geometry memory | 84 MB | **65 MB** |
| Objects in the scene | 1,024 | **914** |
| Sites to build after the start | 1,155 (3.2 s) | **1,032 (2.7 s)** |
| Triangles: home / downtown / the square | 0.26M / 0.25M / 0.26M | **0.23M / 0.20M / 0.23M** |
| Triangles: Build overview / airport / The Trenches | 0.32M / 0.35M / 0.27M | **0.22M / 0.10M / 0.17M** |
| Triangles: the old edge / the far edge | 0.14M / 0.16M | **0.13M / 0.13M** |
| Draws: airport / The Trenches / Build overview | 130 / 156 / 287 | **105 / 136 / 270** |
| The camera route through every view | 4.0 fps, 203 draws, 0.19M | **4.3 fps, 191 draws, 0.14M** |
| Frame rate: airport / far edge | 4.8 / 4.4 | **5.7 / 5.9** |

The ring highway's junction went the other way (0.07M to 0.10M triangles,
56 to 58 draws): the traffic in view differs from run to run. Texture
memory is unchanged (60 MB): the trim is geometry.

How each looks: a near tree on a phone is a dodecahedron canopy (36
triangles, was 80) on a four-sided trunk; a pine two open five-sided cones;
far off, two crossed flat cards (16 triangles a round tree, 4 a pine); half
the trees in the belt and the woods; lamps half the triangles; parked cars
the simple far form even close up (blocky wheels, dark windows); the yards'
edge a low worn concrete kerb with a gap at every way in; the gardens and
the vacant lots open.

