# Working on this repo

This is **the** Degen Emporium site. An older multi-page site existed before
it and has been retired completely. Build only on what's here.

## The city's name

- The city is **Sector 7** (the owner's call; it was "Degen City" before).
  Use "Sector 7" in every bit of copy, banner and sign that names the
  city. The localStorage keys and save names keep their `degen-city-`
  prefixes (`degen-city-tycoon-v1` and the rest): renaming them would lose
  every visitor's save.

## Never bring back the old site

- The site is the Sector 7 homepage (`src/pages/index.astro`), the Emporium
  comic page it links into (`src/pages/emporium.astro`) and `404.astro`. Do not
  add or restore pages like `/news`, `/blog`, `/store`, `/shop`, `/alpha`,
  `/tokenomics`, `/vault`, `/terminal`, `/team`, `/projects`, `/about`,
  `/contact` or `/links` unless the owner asks for that page by name.
- Do not restore anything from git history (old pages, art, team portraits,
  graffiti headers, sticker sheets, the acid-green palette, the "Connect"
  wallet button, the "MAINNET" badge). Old commits are history, not source.
- New pages, sections or art only on the owner's explicit request.
- The `nft-minter` branch is a separate project. Never merge it, or copy
  anything from it, into `main` or any website branch.

## Design rules

- The homepage is Sector 7 in two layers, both in Degen's style (black ink
  outlines, flat cartoon shading, PulseChain neon):
  - **3D** (`src/scripts/city3d/`, three.js): toon materials, ink outlines
    from a normal/depth post-pass, bloom, day/night from the visitor's clock,
    weather, traffic, people, optional synthesised sound. Clicking a
    building flies the camera in and opens a glass panel.
  - **2D** (`src/lib/city.ts`): the isometric SVG map. It's the loading
    poster, the fallback without WebGL, and the "2D map" view.
  Both layers share downtown's layout (`streetplan.ts`, `downtown.ts`); keep
  them in step when buildings change. The ring roads and plot districts exist
  in 3D only (on the 2D map the diagonals simply run on out of town). Pin
  copy and panel copy live in `src/components/CityMap.astro`.
- **Buildings are places in the city's game** (the owner's call): each opens
  its own panel (a game menu), never the comic page or an outside link. On
  the 2D map a building takes you into the 3D city and opens its panel
  (`city.open()`). The comic page (`/emporium`), the merch store and X /
  Telegram live in the ☰ Menu only. Places not built yet say "coming soon"
  (the plan is `docs/tycoon-plan.md`).
- **The redesign** (the owner's call): the city is moving from a grid to an
  organic layout, planned downtown and looser further out (diagonals, varied
  blocks, walk-only alleys, one big hangout square a block from the
  Emporium, smaller squares further out). The plan and its phases are
  `docs/city-plan.md`; keep it up to date, one phase at a time with the
  owner's sign-off. The street plan as data is `streetplan.ts` (DOM-free:
  streets as centre lines with a kind and width, crossings, block outlines
  and their slabs (`outset()`, `onSlab()`), plazas; `PLAN` is `cityPlan()`,
  tested in `tests/streetplan.test.ts`). Phases 2 (downtown) and 3 (the
  outer districts) are built; Phase 4 is polish. Prices of plots and lots
  don't change in the redesign.
- **Downtown** is `downtown.ts` (DOM-free; the 3D city, the 2D map, the plan,
  collisions and the server read it), drawn by `infill.ts` in 3D and by
  `downtown()` in `city.ts` on the 2D map:
  - 0-60 on both axes inside the ring, cut in thirds by the cross streets at
    17 and 43 (`CORE_ROADS`, lit junctions). Three diagonals (`DIAGONALS`)
    run in from the ring's north-west, north-east and south-west corners to
    the cross streets, cutting those corner blocks into triangles
    (`BLOCKS_DT`): three pocket parks (`PARKS`) and three of infill.
  - The landmarks keep their 9 x 9 lots (`SEATS` in `layout.ts`): the
    Emporium on the centre block fronting the south cross street, the Signal
    tower and the Apartments in the north block, the Post office and the
    Vault in the west, Drop 001 and the Workshop in the east, the Armoury in
    the south-east. Every landmark fronts south (+z); the Post office and
    Drop 001 front walk-only courtyard lanes (`LANES`).
  - Round them, tight rows of infill (`INFILL`) with walk-only alleys
    between (`ALLEYS`, two bollards at the mouth: Degen gets through, no car
    does; dressed with a wall lamp and its pool of light (`ALLEY_LAMPS`,
    `addPool()` in `world.ts`), a drainpipe, and pallets, crates and a bin
    (`ALLEY_PROPS`, solid, against the walls so the middle stays clear)). Each building has a type (`InfillType`, drawn by `building()` in
    `infill.ts` and `infill()` in `city.ts`): brownstone walk-ups (stoop,
    bay window, bracketed cornice), shops (fascia sign, striped awning, blade
    sign, fire escapes), diners (rooftop sign, tables out front), lofts
    (roll-up doors, sawtooth roofs), offices (glass tower set back on a
    podium, lit crown, mast) and hotels (balconies, canopy, vertical sign).
    Rooftops carry tanks, gardens, huts, masts and billboards; fronts carry
    café tables, chalk boards, planters and bikes in the plot's front strip
    (`front`; the building itself is `bodyOf()`, its footprints `solids`).
    A few offices and hotels (`TOWER_FLOORS`, up to about 10.6) break the
    skyline, all well under the Emporium.
  - Shop signs are fixed copy from `SIGNS` (made-up names, never the token).
    The owner's three shops, `NAMED_SHOPS`, are spread out: Crypto Coffee
    (west of the Emporium, café tables), Dave's Validator (north-east
    triangle, a tech store with a dish) and the Golden Crumpet (south-west
    triangle, a bakery), each with a neon icon. They're signs only, not
    places, for now.
  - Every wall and ground floor comes from one atlas material (bands with
    UVs in world units, taller walls stacked from quads so a band never
    wraps), every sign from one sign atlas, and details are bottomless
    boxes in the shared paint: keep new infill going through them. Phones
    (`LOW` in `infill.ts`) leave out the finest details.
  - The hangout square (`SQUARE`) is the whole south block, a block from the
    Emporium: an open plaza (the owner had the stage and its screen taken
    out; don't put them back), with the fountain, benches facing it, kiosks,
    planters, string lights criss-crossing over it and a crowd.
  - The GM water tower stands on an infill roof (`WATER_TOWER`). The
    target-practice dummies in the old park now stand in the north-west
    pocket park (`PRACTICE`).
  - Footprints are `DOWNTOWN_SOLIDS` in `solids.ts`; tested in
    `tests/downtown.test.ts`.
- **The outer districts** are `outer.ts` (DOM-free; the plan, collisions,
  traffic and the server read it), drawn by `neighbourhoods.ts` and the
  ground in `world.ts`:
  - The Parkway (`PARKWAY`) is a gently bending two-lane street, a
    soft-cornered U (half a superellipse) round the north half of the city
    from the north bank avenue west of W3 to the north bank avenue east of
    the big lots, about 40 north of the ring. The Southside Loop
    (`SOUTHSIDE`) does the same round the south row. Both meet their
    avenues square, cross the arterials at unlit crossings and keep a
    sidewalk on the outside (`BEND_KERBS` / `KERB_RUNS`, drawn as one
    kerb). Keep them convex: the blocks are clipped by their segments.
  - Between the ring and the bends, the arterials cut the land into 16
    landscaped blocks (`OUTER_BLOCKS`). The plots and the Dorras lots keep
    their 9 x 9 pads where they were (`PADS`, drawn with a paved rim), so
    owners' buildings and prices don't change; the lawns round them carry
    trees (`LAWN_TREES`, half on phones).
  - Four small squares (`OUTER_SQUARES`, `SQUARE_LAYOUTS`): North Square
    (fountain, kiosk), West Green (a plinth with the Emporium diamond
    turning in neon), East Square (a bandstand) and South Square (a clock
    tower, kiosk); benches, corner planters, lamps, light bollards at the
    ways in, uplights round the centrepiece and a few people.
    Footprints are `SQUARE_SOLIDS`. Four pocket parks (`OUTER_PARKS`).
  - The waterfront promenade (`PROMENADE`) along both banks: railings at
    the water (open at the bridges), trees in planters and benches between
    the lamps, and viewing decks over the water (`JETTIES`). It's at
    ground level, not a slab: nothing on it is solid.
  - `inTown()` keeps the outskirts' trees out of all this. Tested in
    `tests/outer.test.ts`.
- **Traffic** follows `routes.ts` (DOM-free): a route for every lane of the
  straight roads, two down each diagonal (in off the ring, out along a
  cross street) and two round each bend (in off its avenue, all the way
  round, out the other end) and one out to the airport and back (down the
  east ring avenue, round the car park loop); turns are rounded off
  (tighter for right turns). Junctions where a diagonal comes in run
  three light phases (x, z, diagonal). Cars follow whoever is ahead going
  the same way on any route. Pedestrians walk loops round downtown's block
  outlines and the south row. Tested in `tests/routes.test.ts`.
- **The street plan** is `src/scripts/city3d/layout.ts` (DOM-free; the 3D
  city, the 2D map, the plots and the server all read it). 1 tile is about
  1.8 m and Degen is about one tile tall. Roads are sized for real-proportion
  cars: lanes 1.7 wide, a 0.8 sidewalk round every block and district.
  Downtown's cross streets (`CORE_ROADS`, at 17 and 43) and the diagonals
  are 3.4 wide with one lane each way; the ring and the south bank road are
  9-wide avenues, two lanes each way with a median (`NS_ROADS`, `EW_ROADS`,
  `laneCentres()`). Districts and the extra lots sit on lines centred on
  downtown's thirds (`BLOCKS`). The landmarks, their collision boxes, doors,
  dummies and the 2D buildings are still written on the old drawing grid
  (blocks at 0, 11, 22) and moved onto their lots with `design()` /
  `designBox()` / `seat()` (`SEATS`; in `landmarks.ts`, `onBlock()` does it
  for each block's scene objects). Keep writing landmark numbers on that
  grid, and change street sizes only in `layout.ts`.
- **The world's size** is in `layout.ts` too:
  - `EXT` (-200 to 240, about 790 m across) is the ground, the river and every road, edge to edge. It's mostly open land, room to grow the city into. Build there only when the owner asks.
  - `WORLD_BOUNDS` is how far you can walk or drive.
  - `CITY_EXT` (-80 to 140) is where traffic and boats loop, past the Parkway; the outskirts' tree belt fills a band round the town (outside the bends) and a lighter sprinkle covers the rest.
  - The skyline ring stands just past `EXT`, kept out of the haze (`fog = false`) so it reads as a far metropolis.
  - The sky dome and stars travel with the camera at 400, inside its far plane (440), so everything in the world stays in front of the sky.
  - City view can pan anywhere inside the bounds.
- **Cars** are `src/scripts/city3d/cars.ts`: real-proportion cartoon models
  (City Hatch, Cruiser, Street GT coupe, Hauler pickup, Box Van, City Bus;
  made-up names, never a real make or badge), each a bevelled extruded
  body and cabin with blacked-out window frames and glass, light clusters
  (lamp shape `lamp`) with bezels and indicators, a grille, door seams and
  handles (`seams`, `handles`), sills, exhausts, mirrors, bumpers, plates
  and fat lathe-turned tyres on spoked rims (`rim`, `spokes`), plus each
  model's own touches in `extra()` (spoilers, stripes, flares, a light bar,
  a ladder, roof pods). Keep `top` and `cabin` as the side outline: the
  garage cards draw their silhouettes from them. A model is two
  geometries, `paint` (each car its own colour, `PAINTS`) and `detail`
  (vertex colours), plus the bus's lit windows, so the traffic in `life.ts`
  costs two draw calls a model. Parked cars use `parkedCars()`; give them a
  footprint in `solids.ts`. Keep a new model inside a 1.7-wide lane and in
  scale with Degen (a hatch's roof is about 0.95 tiles up).
- Keep the city's motion optional: under `prefers-reduced-motion` the 3D
  city stands still (no fly-in, no traffic), CSS animations stop and the 2D
  map's SMIL traffic is paused. Sound is always off until the visitor
  turns it on.
- Keep phones light: `src/scripts/city3d/index.ts` picks a quality tier
  (fewer cars and people, no shadows, smaller bloom on phones), runs phones
  at 30fps while nobody is touching the city, and steps quality down
  (pixels, then shadows, then bloom; never the ink outlines) if frames are
  slow. When frames stay fast again, bloom and then pixels come back (once
  each; shadows stay off, re-enabling them recompiles every material).
- One render loop only: always (re)start it with `loop()` in `index.ts`,
  which cancels any frame already queued. A hidden tab holds its queued frame
  back, so a bare `requestAnimationFrame(frame)` on return stacks a second
  loop (each tab switch another) and the frame rate sinks. 120/144 Hz screens
  draw every other refresh (steady 60-72fps), and nothing is drawn while the
  city is scrolled out of view.
- **Draw calls are the budget.** Build static geometry through a `Batch`
  (`kit.ts`): plain `toon()` colours (no options) and `neon()` fold into
  shared materials with the colour per vertex (`sharedFor()`), so a Batch's
  plain colours are one draw and its neon one per brightness. Never change a
  plain `toon()` or `neon()` material's colour at runtime (give anything that
  changes colour its own material, or instance it with `setColorAt`). Many
  copies of one thing are instanced (trees, lamps, traffic lights, birds,
  crowds, cars). A moving thing merges its fixed parts (`mergeMeshes()`).
  A box with side and top materials is `sidesBox()` (two draws, not six).
  Flat things are flat: the lane markings are two-triangle planes, tree
  trunks open-ended (triangles count too).
  `consolidate()` merges each landmark's Batch meshes per material after the
  city is built (not for the units, lots and plots, which rebuild theirs).
  The shadow map is drawn once a frame (`post.ts`), however many passes
  render the scene. Measure with `?fps` before and after.
- `?fps` in the address shows a performance readout (`.city-stats`, built in
  `index.ts`): fps, slowest frame, draw calls and triangles per frame, quality
  tier, pixel ratio and any quality stepped down. Use it on real devices
  before and after changes; it's invisible without the parameter.
- The Emporium arcade tower (`emporium()` in `landmarks.ts`, and in
  `city.ts` for the 2D map) is the centrepiece: keep it the tallest, most
  detailed building. Its LED wall shows (`drawWall`), pixel font, ticker and
  signs use fixed copy only (Insert coin, Player 1, Game on, Hi score with
  made-up names, GM degens, Arcade, Prizes); never put token details on
  them. The rooftop hologram is `createDegen()` in hologram light. Its
  podium, claw machines and prize booth are mirrored in `walk.ts`
  (`SOLIDS`, `CAMERA_ONLY`).
- The Armoury (`armoury()` in `landmarks.ts` and `city.ts`) is a modern
  military compound and the players' gun store, not a castle: blast walls
  with razor wire, steel watchtowers, a checkpoint (booth, boom barrier, sign
  gantry) and a flat-roofed concrete gun store with a shopfront, canopy sign
  and a counter where players gear up. It links to the plan window. Keep it
  stealth dark at night (low red and green lights, no floodlights). Its
  soldiers are instanced; the checkpoint guards salute and the barrier lifts
  when the walker (`walker` in `life.ts`) comes near. Its walls, towers,
  checkpoint, store, counter and vehicles are mirrored in `solids.ts`
  `SOLIDS` (shared with the game server).
- Every character is one shared Degen body (`src/scripts/city3d/character.ts`),
  sculpted after the brand art at human proportions (about 1.25 tall at
  scale 1, six and a half heads, hips `HIP_HEIGHT` 0.62), with knees,
  elbows and hand sockets. The bones (`NECK`, `SHOULDER_X/Y`, `UPPER_ARM`,
  `PALM_Y`, `THIGH`) feed `reachArm()`, so gun holds follow them; the walk
  camera's eye height (`walk.ts`) and the bench seat (`SEAT_DROP` in
  `life.ts`) follow the body too.
  - Shapes are built from cross-sections (`loft()`, superellipse rings) and
    flat details laid onto them (`onBody()` with `surface()`: lapels, the
    shirt V, the tie, zips, pockets). Shoes are side profiles (`profile()`).
  - The wardrobe is `items()`: each item (`head`, `cap`, `suit`, `hoodie`,
    `joggers`, `backpack`, `gummy`...) has a `when` rule on the `Outfit` and
    pieces on joints, each a fixed colour or an outfit colour (`shade`
    darkens or lightens it: lapels, ribbing). New clothes are new items.
  - Three detail levels (`Detail`): 2 for single figures (`createDegen()`:
    the player, other players, the fitting room, the hologram; about 12k
    triangles), 1 for crowd people near the camera (about 6k; the phones'
    `light` crowd leaves out the `detail` pieces), 0 for crowd people
    further away (`far`: plain boxes for rounded ones, no ears or nose, the
    shades as one bar; about 1.5k).
  - `createDegen()` merges everything on a joint into one mesh coloured per
    vertex (about 15 draw calls a figure).
    `createCrowd()` (pedestrians, soldiers) merges an item's pieces per
    joint and colour and shares them left and right. Every frame each person
    in view takes instances of only what they wear, at their level: near
    within `CROWD_NEAR` (12, 8 on phones) of the camera, far beyond, and not
    at all out of the view or past `CROWD_FAR`. The city fills `CROWD_VIEW`
    (camera position and view) each frame in `index.ts`; under reduced
    motion it's off and everyone is drawn near.
  - Outfits (`suit`, `hoodie`, `track`, `soldier`) only change clothes and
    colours; poses come from the helpers there (walk/run, idle, look, chat,
    sit, march, attention/salute, dance). The cap patch is the Emporium
    diamond: never put another brand's logo on it. Whites on clothes are
    `SHIRT`, a shade under white, so they don't bloom.
- **Minimal bloom, nothing washes out** (the owner's call). Bloom is faint
  and tight (`post.bloom` in `index.ts`: threshold 1.05, 1.2 close up and
  walking; strength at most about 0.3, less close up and on phones, whose
  low-resolution bloom spreads further). Only small, very bright things
  (bulbs, thin neon tubes and caps at 2.4, `glow()`) pass the threshold;
  big lit surfaces stay under it and keep their colour: window and
  shopfront light maps about 1-1.3, screens about 1, sign textures
  1.1-1.8. Lit panels bigger than a tube (hatches, bollard caps, uplights)
  use the softer `soft()` (1.3), and never light a whole roof or slab:
  give it a neon trim instead. Check new lights close up at night on the
  phone tier, not just from the home view.
- Floating cut-out signs (FX layer with a transparent texture, like the roof
  logo) need `occlude()` from `kit.ts`, or the ink outlines of whatever is
  behind them get drawn across them.
- Every card and menu can be closed: panels, the gun store and the buy
  dialog have an × (`.city-panel-close` / `.shop-close`); drop-open menus
  (City settings, Directory, walk panels with their `.pop-head` ×) also
  close on a tap outside and on Esc. The welcome card is a one-line
  first-visit tip under the header (`.city-card` in `.city-hud`: GM, "Welcome
  to Sector 7" (the page's h1), how to move, the draft note, an ×). It's
  closed for good with its × (remembered as `city-card` in localStorage) and
  isn't shown on phones; when it's hidden the "Draft · v0" tag in the
  bottom-right corner keeps the draft note.
- 3D pin labels stay on screen and fold to dots where they'd sit under the
  city's own buttons and cards (`chrome` in `index.ts`); add any new
  always-visible city overlay to that list.
- **The start menu** (the owner's call): on every open, `[data-start]` in
  `CityMap.astro` (styles `src/styles/start.css`) covers the whole page
  while the 3D city boots behind it, so the 2D map is never seen loading.
  Single player enters the city (the fly-in runs again, `city.intro()` in
  `index.ts`); Multiplayer says "Coming soon" without `PUBLIC_GAME_SERVER`
  and flips the Online switch on and enters with one; Options holds Time,
  Weather, Sound and the view (3D city / 2D map), driving the header's own
  settings controls (pressed when the city is up, queued until then). The
  root carries `has-start` until a choice is made; the loader and the
  welcome tip wait behind it. Gradient-bordered buttons, white text.
- The city page has **one header**: the city's own bar (`.city-head` in
  `CityMap.astro`, copy in `head.ts`), slim dark glass. The site bar
  (`Nav.astro`) is left out there (`<Base nav={false}>`) and stays on the
  other pages. Left to right: the logo (home link), the mode title and
  subtitle (City view, Walk mode, Build mode, City map (2D)), then on the
  right (walk tabs, ammo and score while walking), the City / Walk / Build
  switch (the current mode lit with a glow and a gradient underline, the
  others dimmed), and the tools: in Build mode a Plots button
  (`[data-builder-bar]`, painted by `builder-ui.ts`: what you own, your
  Dorras and the next plot's price), a ⚙ Settings button (time, weather, sound, reset
  view, 2D map; 3D only, not while walking; never open by default) and a
  ☰ Menu (the city's places, 3D only (`.dir-places`); then under "More" the
  Emporium comic page and the merch store (`.dir-links`); then PulseChain
  native, X and Telegram; not while walking). Left of them, in the 3D city
  (not in Build mode, and not while walking on phones), the Dorras readout
  (`[data-dorras]`, painted by `tycoon-ui.ts`, a green dot when the stall's
  till has takings); it opens your business card. Beside it the level pill
  (`[data-level]`, `missions-ui.ts`: level, XP bar, title). Their cards drop down under them (`.head-panel`, one open at a
  time, with a `.pop-head` ×), spanning the width on phones. Tablets show
  Settings and Menu as icons; phones put logo, title, ⚙ and ☰ on the first
  row and the switch, with names, across the second (walking: title and
  switch, then the walk tabs, ammo and score). Its live height is
  `--head-h`; anything pinned to the top of the city sits below it
  (`top: calc(var(--head-h) + 12px)`).
- The comic-window layout in `src/components/ComicPage.astro` is the design.
  Each window is defined by its ink outline; keep content inside the slants.
- Palette is the PulseChain gradient. Follow `brand/README.md`: gradient for
  borders, glows and large type; `--p-cyan` for small text; buttons are
  gradient-bordered with white text, never gradient-filled.
- Type: Big Shoulders Display (headlines), Inter (body), JetBrains Mono
  (labels).
- Check every change at 320, 375, 768, 1024 and 1440px wide: no sideways
  scroll, no text clipped by a slanted edge.

## Sector 7 Airport (`docs/airport-plan.md`)

- The plan and its phases are `docs/airport-plan.md`; keep it up to date,
  one phase at a time with the owner's sign-off. Phase 1 (the airport and
  its flying traffic) and Phase 2 (fly it yourself, from the hangar) are
  built.
- **Where:** south-east of the Southside Loop, east of the x = 64.5 avenue,
  where no road runs (the north-south roads carry on south past the loop).
  `airfield.ts` (DOM-free, tested in `tests/airfield.test.ts`) holds it all:
  `SITE`, the runway (east-west, take-offs and landings eastwards), taxiway
  and connectors, apron, `TERMINAL`, `STANDS` (nose-in, facing north),
  `TOWER` (under the Emporium's height), `HANGAR` (its east office is where
  Phase 2's hangar menu will open), `PROP_STAND`, `HELIPAD`, masts, the
  windsock, apron vehicles, airbridges, the parked cars, and
  `AIRPORT_SOLIDS` (in `SOLIDS`; the ground itself is open, at ground
  level, not a slab). The access road and the one-way loop round the car
  park are `AIRPORT_STREETS` in the street plan.
- **The flying traffic:** three airliners, a prop plane and a helicopter on
  one timetable (`PERIOD`, four minutes; `timetable()`, `FLIGHTS`). A flight
  is a loop of acts (fly along waypoints with rounded corners, eased
  altitude and speed; hold; turn on the spot; lift); `poseAt()` turns the
  time into a pose, the same for everyone (the clock is `Date.now()`).
  Airliners push back, taxi out, take off east, climb round to the north,
  cross the city high over downtown (above 38), come round the west and
  land, the prop plane flies a lower loop along the river, the helicopter
  circles the Emporium (above the hologram and the blimp). The tests check
  they stay in the world, high over the town, on the ground only at the
  airport, never near each other (`REACH`) and clear of the solids. Change a
  route or a take-off time only with the tests passing.
- **Drawn by** `airport.ts` (runway markings and lights, approach lights,
  PAPI, terminal with its glass front, wave roof, the SECTOR 7 AIRPORT
  sign and airbridges, tower, hangar, helipad, masts, windsock, vehicles,
  road, car park) and `aircraft.ts` (the models: a cartoon airliner in
  DEGEN AIR colours, a made-up airline, never a real one, maker or badge;
  a high-wing prop plane; a helicopter). Each model is a few parts by role
  (body, accent livery colour, neon nav lights, blinking strobe, gear that
  folds away, decal, spinning props and rotors with blur discs);
  `createFleet()` makes one instanced mesh per part for each kind, culled
  as a fleet. Under reduced motion every aircraft stands parked.
- The skyline ring leaves out the towers within 150 of the airport (they'd
  loom over the runway); trees keep off the airport and the low end of the
  approach.
- **Flying it yourself** (Phase 2): the airport is a place (spot
  `airport`, its pin over Hangar 1 (`spot.group` is the hangar, built in
  its own Batch), directory entry, a panel with **Walk in** to
  `AIR_SPAWN`). The hangar office's door (`HANGAR_DOOR`, the office
  `HANGAR_OFFICE` is solid) opens the hangar menu (`hangar-ui.ts`, markup
  `data-hangar` in `CityMap.astro` on the garage's `.shop` panel and
  styles): the Sky Hopper (`prop`), the Neon Dart (`bizjet`, a small jet
  model in `aircraft.ts`) and the Whirlybird (`heli`), twelve paints; free
  and only for the city, never sold, priced or tied to the store or the
  token (`myplane.ts`, saved as `degen-city-plane-v1`). While it's open
  the camera looks into the hangar (`HANGAR_VIEW` in `walk.ts`, the
  garage's `frameShowroom()`). Your aircraft stands at `HANGAR_SPOT` (the
  hangar's east half; the airport's prop plane's stand is in front of the
  west half) and stays wherever you land it.
  - The rules are `flight-sim.ts` (DOM-free, tested in
    `tests/flight.test.ts`): `TUNES` per aircraft, `stepFly()`, `HULLS`
    (spheres for every kind, the airport's too), `floorAt()` (the ground or
    a roof under the wheels), `canLeave()`, `CEILING`, `EDGE_TURN`. Arcade
    and forgiving: it levels itself, can't stall, eases a hard descent
    near the ground and lands wherever it touches down; collisions are soft
    (it slides off, nothing is damaged). New handling goes in the sim
    first.
  - `fly.ts` is the view: your aircraft is a fleet of one
    (`createFleet()`, repainted with `paint()`), chase and nose cameras
    (V), the readout (`data-fly-hud`: speed, height, throttle, state), the
    engine (`aero()` in `sound.ts`), getting out only on the ground and
    stopped (`exit()`), `abandon()` home to the hangar when walk mode ends
    in the air. Flying sets `is-flying` on top of `is-driving` (the touch
    layout is the car's: the stick turns and climbs, the pedals read
    Faster / Slower) and `data-plane` (the header reads "Flying ·
    <aircraft>"); styles in `src/styles/fly.css`. Controls: W / S throttle,
    A / D turn, arrows or Space / Shift climb and dive, V camera, E get out;
    gamepad left stick, RT / LT, Y, View. Check the readout, stick, pedals
    and prompt at phone widths, upright and on their side.

## Drop 001's fitting room

- Drop 001's panel (`data-panel-tpl="shop"` in `CityMap.astro`) has the
  fitting room (`fitting.ts`): item cards by tab (Fit, Head, Shades, Bags,
  Hand, Extras, Kicks), colours, and a turning preview of the player's Degen drawn by a
  small second renderer with the same ink outlines, only while the panel is
  open (still under reduced motion; drag turns him).
- The look belongs to `profile-ui.ts` (browser and player profile); the
  fitting room only calls `wear()`. The original wardrobe is free; the
  premium wardrobe (`WARDROBE_CATALOG` in `catalog.ts`) costs Dorras and
  needs a level (`buyWardrobe()` in `tycoon.ts`). Everything is cosmetic
  and only for the city: never tied to the Shopify store or the token, never
  real money.
- **The premium wardrobe** (the city's game): Drop 001 also sells
  `WARDROBE_CATALOG` (catalog.ts) for Dorras earned in the city, each piece
  with a price and a level: the varsity and puffer fits, the cowboy hat, top
  hat and neon halo, the duffel bag and neon wings, the phone and briefcase,
  the gold watch, and the Gold and Holo colour packs for tops and bottoms
  (`PALETTE.gold` / `PALETTE.holo`, `PACKS`, `packOf()`). The look carries
  them as ordinary values (`cleanLook()` validates, it never checks
  ownership); owning them is `wardrobe` in the save (`buyWardrobe()` /
  `ownsWardrobe()`), and the fitting room (`fitting.ts`, with
  `game: GameDeps`) is what enforces it: cards show the price and `Lv n`,
  "Buy · 4,000" opens an inline confirm, locked pieces say the level, pack
  colours sit under a lock in the colour rows, and the head shows your
  Dorras and level. Styles in `src/styles/fitting.css`. In `character.ts`
  the pieces are items like any other; neon pieces (the halo, the wings'
  edges, the phone's screen) share one `neon()` material coloured per
  vertex in the lens colour, dim by day so they never bloom out of control.
- A new item needs a `Look` field with its palette and rules in
  `profile-data.ts` `cleanLook()` (the server checks it too), the mapping in
  `lookOutfit()`, an item in `items()` in `character.ts` and an entry in `fitting.ts`
  `TABS`. One hat (`hat`), one bag (`bag`) and one thing in the hand
  (`held`) at a time; `cleanLook()` also upgrades looks saved in older
  formats, so keep its migration when fields change. Held items are put
  away while Degen carries a gun (`Degen.held`).

## The economy: Dorras, the market, your units, contracts, staff, big lots and the Vault (Tycoon phases 1-4)

- The plan and its phases are in `docs/tycoon-plan.md`; keep it up to date.
  Build one phase at a time, each with the owner's sign-off.
- **Dorras** are the city's money: earned by playing, never bought and
  never cashed out. Never give them a real-money value, call them an
  investment, or tie them to the token or the Shopify store. Nothing in the
  city costs real money (plot sales for PLS were retired).
- **Rules:** `tycoon.ts`, DOM-free and tested (`tests/tycoon.test.ts`):
  goods (`GOODS`, made-up city goods, nothing about the token; raw goods
  last, since a good's place in the list sets its price rhythm), the market
  price (a function of the time only, the same for everyone and ready for a
  server), places (`PlaceId`: the stall, the four units, the Workshop) with
  `room()` / `holds()`, buy / sell back to or from any place, your stall's
  levels, price levels, units (`buyUnit()`, `buildUnit()`, `setCrop()`), the
  Workshop's jobs (`startJob()`, `cancelJob()`), your car's load
  (`load()` / `unload()`, `CARGO` per model), and `advance()`: sales
  (faster at the place you're serving, slower and capped while away),
  gardens growing and the Workshop working; staff (`hire()`, `roleAt()`,
  paid a share of what they handle, `STAFF_CUT`), couriers (`ship()`) and
  contracts (`board()`, seeded from the time so it's the same for everyone;
  `accept()`, `deliver()`, drop-offs at building doors via `destAt()`); big
  lots (`buyLot()`, `buildLot()`, places `l0`-`l2`, production lines via
  `line()` for the Workshop and factories), the ledger (`book()`, called by
  every rule that moves Dorras) and loans (`borrow()`, `repay()`, a share
  of takings in `advance()`).
  `cleanSave()` cleans anything loaded and upgrades older saves (now v8);
  keep that migration when the save changes. New economy rules go here
  first.
- **The city's game (Phase 5)** sits on the same save: XP and levels
  (`xp`, `level()`, `addXp()`), owned cars, guns and clothes with their mods
  (`buyCar()` / `modCar()` / `carStatsOf()`, `buyGun()` / `modGun()`,
  `buyWardrobe()`), district plots (`buyPlot()` / `buildPlot()` /
  `sellPlot()`), levels for the places you run (`upgradePlace()`,
  `capOf()`, `capacityMul()`), race records, missions, badges and the
  `counters` everything watches (`count()`, `takedown()`). Prices, the
  level each thing needs, the XP curve and what each mod does are
  `catalog.ts`; the courses are `races.ts`; the board and badges
  `missions.ts`. All DOM-free, tested in `tests/game.test.ts`. The starter
  tier (the five original cars, the four original guns, the original
  wardrobe) stays free; everything new costs Dorras and needs a level.
  Screens reach the save through `GameDeps` in `ui.ts` (`save()`, then
  `commit()` once the rules have changed it; `toast()`, `sfx()`), never
  by writing the save themselves.
- Goods only move between your places in your car (or by buying them
  straight there at the market hall). Stock on sale (stall, shops) can't be
  loaded back; that keeps the delivery bonus from being farmed.
- **Screens:** `tycoon-ui.ts` (save `degen-city-tycoon-v1`): the Dorras
  readout, your business card (`[data-biz]`, on the gun store's `.shop`
  panel: right side under the header on wide screens, the bottom sheet on
  phones; the till on top, then the Stall / Units / Workshop / Car tabs), the
  market hall, filled into the Emporium's panel (`[data-market]`, with its
  deliver-to / sell-from picker, your car included when it's parked outside),
  and the Workshop's (`[data-workshop]`), Signal tower's (`[data-contracts]`:
  news and the contract board), Post office's (`[data-couriers]`) and
  Apartments' (`[data-staff]`) and the Vault's (`[data-bank]`: worth,
  ledger, loans) panels: `PANELS` in `tycoon-ui.ts`, mounted
  with `mountPanel()` from `open()` in `index.ts`. One card at a time: opening a
  panel closes the business card and the other way round. Esc closes the card
  first. The views tick every second and are patched in place (`repaint()`
  / `morph()`), so a button never changes under a finger; keep new views
  going through `repaint()`.
- **The market square:** `market.ts`, on the `MARKET` lot (`layout.ts`,
  in `EXTRA_LOTS` with the garage), drawn in world numbers. Two rows of four
  stalls, the MARKET gantry (its cut-out sign uses `occlude()`), the
  string-light pole, traders and shoppers from the shared crowd (so it's built
  before `buildLamps` and `buildLife`). Stall 0 is yours and shows your
  stock (`show()`). Counters are at a Degen's waist (0.5). Footprints,
  the gantry, the pole and your spot are `MARKET_SITE` / `STALL_SPOT` in
  `solids.ts` (tested in `tests/solids.test.ts`).
- **Makers' Row:** `units.ts`, on the `UNITS` lot (in `EXTRA_LOTS`) north
  of the market square: four units of 4.1 x 4.1 (`UNIT_SITE` in
  `solids.ts`, drawn in each unit's own numbers: u across the front, v back
  from it), each drawn from the save (to let, empty, garden, shop,
  warehouse) and rebuilt only when what it shows changes. Their footprints
  are `unitSolids()` (per kind, `UNIT_SHAPES`), fed to walking and driving
  with the plots' (`plotSolids` in `index.ts`). Signs use `occlude()`.
- In walk mode, standing at your stall or a unit's door (`places()` in
  `tycoon-ui.ts`, the walk deps `places` / `openPlace`) shows a prompt (E or
  a tap) that opens the card on that place, and standing at a stall or shop
  doubles its customers. The Workshop's door opens its panel. Your car
  parked near one of your places (stall, a built unit or the Workshop) lets
  the Car tab load and unload there; the garage menu says how much each car
  carries. Your contracts' drop-offs get a "Deliver" prompt at the door and
  a beam of light (`beacons.ts`, up to three).
- **Big lots** (Phase 4, the owner's call): three 9 x 9 lots east of
  Makers' Row (`BIG_LOTS` in `layout.ts`, in `EXTRA_LOTS`; `LOT_SITE`,
  `LOT_SHAPES`, `lotSolids()` in `solids.ts`), drawn from the save by
  `biglots.ts` (FOR SALE board, empty, superstore, factory, depot, offices),
  rebuilt only when what they show changes; offices stay well under the
  Emporium's height. Units, lots and the Workshop have levels 1-3 (the
  business card's Upgrade row); `units.ts` and `biglots.ts` show the level.
- **The district plots** (Phase 5, the owner's call) are Dorras property
  too: bought at the Vault's estate agent (`[data-bank]`, the list in
  `bankView()`) or from a plot's panel in Build mode. Ownership lives in
  the tycoon save (`plots`), behind `createPlotStore()` in `store.ts`.
- **Loans and the ledger** are game mechanics with Dorras only: a flat fee,
  no interest rates, savings returns or APY-style wording anywhere.
- **Missions, levels and badges** (Phase 5): the rules are `missions.ts`
  (`MISSIONS` in tiers by level, up to `MISSIONS_MAX` at once, counted from
  the save's `counters` as they stood when taken; `BADGES` are lifetime
  milestones awarded by `checkBadges()`) and `catalog.ts` (`xpForLevel`,
  `levelFor`, `levelProgress`, `titleFor`, `XP` per deed), on the save in
  `tycoon.ts`. The screens are `missions-ui.ts` (styles in `missions.css`):
  the level pill in the header tools next to the Dorras readout
  (`[data-level]`, a `.head-pop` card in the city; while walking it opens
  the Profile tab's badges `[data-badges]`), the mission board at the end
  of the Signal tower's panel (appended by `tycoon-ui.ts` after the
  contracts; its Take / Claim / Give up go through `missions.act()` before
  the economy's buttons), the mission tracker in the walk HUD
  (`[data-missions-tracker]`; a pill with the count on phones) and the
  badge / level-up pops under the header (`[data-mission-pops]`).
  `tycoon.commit()` runs `missions.onCommit()` first, so any screen that
  changes the save and commits gets badges and level-ups checked. Rewards
  are Dorras and XP only: no prizes, nothing real.
- **Getting started** (the new player's first steps): the rules are
  `guide.ts` (DOM-free, tested in `tests/guide.test.ts`): `GUIDE`, seven
  steps in order (stock your stall at the market hall, make 5 sales, take
  your car out, deliver a contract, target practice, a street race, back up
  your save at the Vault), each with a beam spot (`at`), a way in from the
  City view (`go`: open a panel, or start walking at a free spot facing
  it) and a check on the save (`met()`, lifetime counters, so a step
  already done moves straight on). `advanceGuide()` (run first in
  `missions.onCommit()`) pays each step's small reward (Dorras and XP, the
  ledger's Missions line) once. The save carries `guide` { step, hidden }
  (`GUIDE_STEPS` in `tycoon.ts`; a save from before it that's past level 1
  has it done) and `backup` (when it was last downloaded). On screen
  (`missions-ui.ts`, styles `src/styles/guide.css`): the City view's card
  under the welcome tip (`[data-guide]` in `.city-hud`, 3D only, with the
  way in and an ×; in `chrome`), the top row of the walk tracker (with its
  own ×), the steps at the top of the Signal tower's board (Show / Hide the
  guide) and a cyan beam (`beacons.guide()`). Hiding only hides it; the
  steps still count.
- **Your save as a file:** everything the city keeps in this browser goes
  in one backup (`backup.ts`, DOM-free, tested: `BACKUP_KEYS`,
  `packBackup()`, `readBackup()`; never the guest or wallet login tokens or
  screen preferences). The Vault's panel ("Your save" in `bankView()`)
  downloads it (`sector-7-save-<date>.json`) and loads one: the file is
  checked and the city's game cleaned with `cleanSave()` first, a confirm
  shows its level and Dorras, then every save is replaced and the page
  reloads (`frozen` stops the tycoon storing over it). A level-up from 3 on
  reminds you when the last backup is over a week old. A new save in
  localStorage needs its key in `BACKUP_KEYS` and a loader that cleans what
  it reads.
- **The Apartments** (the tower in the north block, east of the Signal tower, `apartments()` in
  `landmarks.ts` and `city.ts`) are a place since Phase 3: spot
  `apartments`, its pin, door (`DOORS`) and panel. The Emporium stays first
  in the 3D `spots` list (the city's sound centres on `spots[0]`).

## Walk mode (3D)

- `src/scripts/city3d/walk.ts`: the playable Degen, over-the-shoulder and
  first-person camera, mouse (pointer lock), keyboard, touch and gamepad
  controls, collisions and door prompts. The Controls panel's settings
  (Look: speed, invert, first person; Shooting: "Aim when firing"
  `settings.autoAds` = off / touch / always) are saved under
  `degen-city-walk-v1` in localStorage. The HUD markup (Controls panel, Run
  and Jump buttons, joystick) is in `CityMap.astro`; `walk.ts` expects every
  `data-walk-*` element to exist.
- Buildings only lift and glow on hover in City view; while walking nothing
  is hovered and nothing lifts (Degen stands on the same ground).
- Esc frees the mouse first and only then stops walking. Door panels free
  the mouse so their links can be clicked.
- While walking (`body.is-walking`, set in `index.ts`) the header drops the
  logo on tablets and phones and the Settings and Menu buttons, and carries the walk tabs
  (Controls, Profile, Online, Emote), ammo and score at the top (two rows on
  phones). The touch buttons stay at the bottom.
- The gun store is compact: a 2 x 2 grid of guns beside the picked gun's
  details; on upright phones a short bottom sheet with the guns in one row.
  Check it at phone widths upright and on its side (no scrolling needed).
- Collision footprints (`SOLIDS`) and door spots (`DOORS`), both in
  `solids.ts` with the walk-mode start (`WALK_SPAWN`), mirror
  `landmarks.ts`. When a landmark moves or changes size, update both.
  Placed buildings block via `plots.solids()`; parks stay walkable.
- Cars yield to the walker through `walker` in `life.ts`.

## The garage and your car (3D walk mode)

- `drive.ts` drives one vehicle at a time, your car or your kart (both can
  be out: "Get in" takes the nearest; `carState` / `inCar` are the car's
  own, for the street races; `recallKart()` sends the kart to the pits).
- The garage is on the south bank, east of S5, facing the south bank
  avenue (`GARAGE` in `layout.ts`; drawn by `garage.ts` in world numbers,
  not the landmarks' drawing grid). A flat-roofed workshop with an open bay
  and a car lift, a roller door, an office, a neon GARAGE roof sign, and a
  showroom turntable on the forecourt with the player's own car on it. It
  has no pin and links nowhere; it's walk-mode only. Its footprints, the
  turntable and the office door are `GARAGE_SITE` in `solids.ts`.
- The office door's prompt opens the garage menu (`garage-ui.ts`, markup
  `data-garage` in `CityMap.astro`, built on the gun store's `.shop`
  panel): five models (`PLAYER_CARS`: the bus is city-only) with card
  silhouettes drawn from each model's outline at one scale, three stat bars
  and twelve paints. Each pick shows on the turntable; Keep saves it,
  closing without keeping puts the saved car back. While it's open the
  camera eases to the turntable (`frameShowroom()` in `walk.ts`, over the
  shoulder so the first-person hands stay out of shot) and the picture
  slides with `setViewOffset` so the car sits beside the panel (wide
  screens, panel on the right) or above it (phones, bottom sheet). The
  turntable turns only while the menu is open, and never under reduced
  motion. Check it upright and on its side at phone widths (no scrolling).
- Your car (`mycar.ts`, DOM-free): `{ model, paint }`, cleaned by
  `cleanCar()`, saved in the browser as `degen-city-car-v1`. `DRIVE` holds
  each model's garage copy and its 0-1 speed / pick-up / grip (for the
  handling), `CARGO` its boot. Eight models: the five starters are free,
  the Street Thunder, Big Rover and Hyper Comet are bought with Dorras at
  the garage (`CAR_CATALOG`), and every car is tuned there (`CAR_MODS`:
  engine, turbo, tyres, roof rack, three levels each; `carStatsOf()` feeds
  the handling and the boot). Only for the city: never tied to the store or
  the token, never real money.
- `createCar()` in `cars.ts` builds one car with its own paint, steerable
  rolling wheels (`drive()`) and lights. The turntable's car is the one you
  drive (`takeOut()` in `garage.ts` hands it to `drive.ts`).

## Driving your car (3D walk mode)

- `drive-sim.ts` holds the rules, DOM-free like `combat-sim.ts`:
  - **Handling:** arcade. Speed tapers to the model's top speed; brake, then reverse. Steering uses a bicycle model that eases off with speed. Grip sets how quickly the slide follows the nose; the handbrake lets it go.
  - **Collisions:** soft and safe. The car is three circles along its length. It slides along `SOLIDS` (minus the turntable), placed buildings and the river walls (`RIVER_WALLS`, open at the bridges). It bumps softly off traffic and people, never through them.
  - **Tuning:** `tune()` turns `DRIVE`'s 0-1 numbers into speeds. New handling goes in the sim first.
- `drive.ts` is the view:
  - **Getting in:** "Get in" at your car, on the turntable (it drives off facing the avenue) or wherever it was left.
  - **The car on screen:** it climbs kerbs smoothly, leans into turns and squats under gas or brakes. The wheels roll and steer.
  - **Cameras:** a chase camera that swings in behind, where you can look around and it settles back; it's pulled in by buildings like the walk camera. V swaps to the roof camera.
  - **Readout:** speed in km/h and the gear (`data-drive-hud`).
  - **Sound:** a synthesised engine (`engine()` in `sound.ts`) plus bump and door sounds, all through the sound switch.
  - **Getting out:** "Get out" anywhere. Degen steps out of the left door, or wherever there's room, and the car stays parked and solid to walk round. Leaving walk mode parks it too.
  - **Sending it home:** the garage menu's Keep calls it back to the turntable ("Bring my car home"). A reload puts it back there too.
- Traffic stops for your car (`walker.r` in `life.ts` reaches further while driving). `bodies` in `life.ts` shares where the traffic and the pedestrians are, for the soft bumps.
- **Controls:**
  - Keyboard: W / S (or arrows) gas and brake / reverse, A / D steer, Space handbrake, V camera, E get out.
  - Touch: the stick steers (and pedals when no pedal is held), with Gas and Brake buttons (`data-drive-gas`, `data-drive-brake`). Layout while driving: a bigger stick bottom-left, Gas and Brake as tall pedals side by side bottom-right (Gas taller, on the outside), Get out at the top right and the speed at the top left, all clear of the phone's safe areas. Getting out brings the walk layout back.
  - Gamepad: left stick steers, RT gas, LT brake, A handbrake, Y get out, View camera; the right stick or the mouse looks.
- While driving, `.city.is-driving` hides the walk and combat HUD, and the header says "Driving · <car>" (`head.ts`). A gun is holstered on getting in.
- Check the pedals, stick, prompt and readout at phone widths, upright and on their side: nothing may overlap.

## Street races (3D walk mode)

- The rules are `races.ts` (DOM-free, tested): four courses of checkpoints
  on the roads from the start line on the south bank avenue in front of
  South 4 (`RACES`, `START_LINE`, `RACE_SITE`, `CHECK_R`, `START_R`,
  `COUNTDOWN`, `startRun` / `stepRun` / `finishRun`, `prizeFor`,
  `clockOf`). `racesite.ts` draws the gantry, the banner (fixed copy only:
  START / FINISH, SECTOR 7 RACES), the chequered line, the race board and
  the checkpoint markers (beacons style; `show(next, after)`); its
  footprints are `RACE_SOLIDS` in `solids.ts`.
- `race-ui.ts` (markup `data-races`, `data-race-hud`, `data-race-result` in
  `CityMap.astro`, styles in `src/styles/races.css`) is the menu on the gun
  store's `.shop` panel, the countdown, the HUD and the results card. It
  opens at the board on foot or from your car when it's stopped at the
  line, needs your car within `START_R`, freezes the car (`drive.frozen`)
  during the countdown, steps the run from the car every frame and pays
  through `finishRun()` + `commit()`. Getting out, leaving walk mode, Esc
  or Quit abandons a run. While a run is on, `data-race` on the city root
  makes the header read "Racing · <race>". Prizes are Dorras only; best
  times are kept per race in the save.
- `drive.update()` returns the tiles moved; walk mode counts them on the
  save every ten tiles (`counters.driven`, for missions and badges).
- `?spawn=x,z[,yaw]` in the address starts walk mode at a spot, and `?fps`
  shows where Degen stands: use them to check a place on a real device.

## The kart park (3D walk mode)

- **The place** (the owner's call): a Mario-Kart-style go-kart park on the
  open land outside the Parkway in the north-east, filling the quadrant to
  the world's edge, fenced, with a slip road down to the Parkway and a gate;
  one circuit raced both ways (the rebuild, `docs/kart-plan.md`), the kart
  hut (door prompt "Kart hut"), a grandstand facing the start straight, the
  pit lane with eight garages and the big screen on their roof. It's a place like the landmarks (spot
  `karts`, pin, directory entry, a City-view panel with your records and
  **Walk in**, which starts walk mode at the gate, `KART_SPAWN`). Race karts
  stay on the track, but your own kart can be taken out of the pits and
  driven anywhere on the map (the owner's call: "Get in" at the show kart,
  `drive.ts` drives it like the car, with Degen seated; it rides the
  circuit's ground (the deck, the banking, the grass banks) through
  `circuitSurfaceAt()`, and goes back to the pits when a race starts).
  Walking follows the same ground inside the park (`groundAt()` in
  `walk.ts`).
- **The site** is `kartpark.ts` (DOM-free): `KART_PARK` (world x 92-232,
  z -192 to -48), local numbers via `toWorld()` / `toLocal()` (u east, v
  south from the site's corner), the fence's `GATE`, the `SLIP_ROAD` and
  `KART_SPAWN`, and the line maths every track part uses: `sampleLine()`
  (centripetal Catmull-Rom through control points `CPt`, heights
  cosine-eased, sampled every half tile), `Line`, `frame()`, `at()`,
  `locate()` (keeps to the layer its hint is on), `along()`, `wrapS()`,
  `heightAt()` (banking), flags `F` (deck, tunnel, bank). The site is flat
  ground, not a slab, and the outskirts' trees keep off it and the slip
  road (`scatterIn()` in `world.ts`, `onRoad()` in `outer.ts`).
- **The rules** are `kart-sim.ts` (DOM-free, seeded, a fixed 60 Hz tick,
  tested), racing on the rebuild's circuit (`kartcircuit.ts`) since
  Phase 2: `createKartSim(setup)` → `step(dt, input)` returning events.
  Arcade karts (`tune()` from the 0..1 stats, times the engine class's
  pace; `turnRate()`), a hop into a drift (`T.drift` stages,
  `T.driftBoost`), boost pads (`pads` on the course), bumps weighted by
  `weight` (a heavy kart ramming a light one spins it), air off the jump
  (`flight()`), banking (more grip), pure racing (no items, the owner's
  call). **No walls:** kerbs are track; the run-off holds a kart to
  `RUNOFF_CAP` with `RUNOFF_GRIP`; past `RESET_AT` (or over the deck's
  edge) it fades back onto the centre line where it had got to
  (`'reset'`, `RESET_T`, no progress lost). Conditions (`cond`): day,
  night (looks only), rain (`RAIN_GRIP` everywhere). Clean laps (no
  wheel in the run-off) and overtakes are counted per racer. Seven
  rivals (`think()`: pure pursuit on the way they're moving, a lane
  offset, passing a slower kart ahead or holding back, drifting only
  where a bend needs more than full lock, braking planned from
  `cornerSpeed()` back along the track and past the jump's flight) with a
  rubber band (`rubber()`); three cups (`CUPS`: `cls`, four `races` of
  { course, laps, cond }, `ai` pace, `skill`, prizes by place), time
  trials (`cup: 'time'`, alone) and `auto` (the sim drives the player:
  the par ghost, the tests, and every kart's cool-down lap after the
  line). Places by progress (`standings()`), the player's finish
  (`done`) and everyone's (`over`). New gameplay goes here first; looks
  and sounds in the view.
- **The rebuild** (the owner's call, `docs/kart-plan.md`): one narrower
  circuit (5.6 wide, kerbs, grass and gravel run-off), raced both ways,
  with a pit lane and nothing solid near it, replaces the network in four
  phases. Phase 1 is built: the circuit as data in `kartcircuit.ts`
  (DOM-free, tested in `tests/kartcircuit.test.ts`; twelve corners, lefts
  and rights, the owner's call: no long runs of straight road besides the
  start straight): `CIRCUIT` (the physical track) and `COURSES` (forward
  and reverse; `start`, `jump`, numbered `turns`),
  `TRACK_HALF`, `KERB`, `RUNOFF`, `CLEAR`, `FLY_H`, `BANK`, `MIN_RADIUS`,
  `MAX_SLOPE`, `gridSlots()`, `PIT_LANE`, `BAYS`, `SITE` (garages, hut,
  stand, screen, gate path), `CIRCUIT_SOLIDS`, `GANTRY`, `SUPPORTS`,
  `onCircuit()`, `circuitSurfaceAt()`; the races are `COURSES` /
  `COURSE_IDS` (`circuit`, `circuit-reverse`: name, laps, `pads`) and
  `Cond` / `CONDS`; `groundAt()` (the ground across it: the asphalt's
  plane, the run-off easing down to the lawn at `CLEAR`, the sim's and the
  drawing's both), `enclosed()` (the deck and the tunnel: no run-off, off
  their kerbs a kart is put back). Footprints for walking and driving are
  `CIRCUIT_SOLIDS` (in `SOLIDS`: the fence with the gate's gap, the hut,
  the garages, the stand; **nothing on or beside the track is solid**,
  the owner's call). Phases 2 (the rules race on it, the save is v8) and 3
  (the park drawn round it) are built; Phase 4 (the HUD's minimap, the
  hut's menu, the item slot and buttons out of the markup) is next.
- **Classes** (`catalog.ts` `KART_CLASSES`, `ClassId`, `CLASS_IDS`): Street
  (Lv 1, 0.82), Sport (Lv 3, 1) and Neon (Lv 8, 1.18) set everyone's pace
  in a race; a cup fixes its class, a time trial picks one. Records and
  boards are per course per class (`recordKey()`).
- **The karts** are `mykart.ts` (`PLAYER_KARTS`, `KART_SPECS`: Pocket
  Rocket, Big Wheel, Zip, Tank Kart; `cleanKart()`), priced in `catalog.ts`
  (`KART_CATALOG`, the Rocket free; `KART_MODS`: motor, soft tyres, nitro
  kit, three levels; `kartStats()`), drawn by `karts.ts` (`createKart()`:
  Degen's style, origin on the ground under the middle, +x forward, wheels
  that steer and roll, a seated Degen driver via `seat()`). Only for the
  kart park: never real money, never tied to the store or the token.
- **The save** (`tycoon.ts`, v8): `karts` { model, paint, owned, mods,
  `records` (fastest lap and best run per course and class, `KartTime`),
  `boards` (the local leaderboards, `LEADERBOARD_SIZE` runs per key: your
  own runs for now, built so a server can hold everyone's later),
  `series` (the cup in progress: race, points), `trophies` (cup wins),
  `challenge` (today's daily challenge, done once a day), `parBeaten`,
  `old` (the old network's lap records, kept aside when a v7 save moved
  to the rebuilt circuit; its boards, par ghosts and a series on the go
  were dropped) }
  with `buyKart()` / `modKart()` / `kartStatsOf()` / `pickKart()`,
  `finishKartRace()` → `KartResult` (prizes by place, lap records in any
  race, run records and boards in time trials, par beaten (`PAR_LAPS`,
  `parLap()`), the daily challenge (`dailyChallenge()`, `dayKey()`,
  `CHALLENGE_PRIZE`), counters `kartRaces` / `podiums` / `kartWins` /
  `cleanLaps` / `overtakes`, XP `kartFinish` / `kartPodium` / `kartWin` / `kartRecord` /
  `parBeaten` / `challenge`) and the series (`startSeries()`,
  `seriesNext()`, `seriesRace()` → `SeriesResult`: `SERIES_POINTS`
  15-12-10-8-6-4-2-1, standings between races, the trophy and
  `SERIES_PRIZES` at the end, XP `seriesWin` / `seriesPodium`;
  `abandonSeries()`); ledger entries `karting` (in) and `karts` (out); six
  missions and five badges in `missions.ts`. Global boards wait for the
  game server (keep the boards' shape server-ready).
- **On screen:** `kart-types.ts` holds the interfaces the three parts agree
  on. `kartpark3d.ts` draws the site round the circuit (`buildKartPark()`:
  asphalt, edge lines and red-and-white kerbs swept along the centre
  line, banked where it rolls; grass run-off with gravel on the outside
  of the bends where it lies flat, easing down as grass banks where the
  track is raised; the tunnel tube; the jump's striped lip; the flyover's
  railed deck on columns just past its edges, open underneath, with
  abutments at the ramps; the chequered line, both ways' grids and the
  gantry; the pit lane, its bays and the cones that close it in a race
  (`racing()`); eight garages with their numbers and the screen on their
  roof (fixed copy only); the hut; the grandstand facing south with its
  fans; tyre stacks, marshal posts, light poles and trees past the
  run-off), and per course (`setCourse()`, the way round being raced) the
  guidance: pad chevrons, chevron boards on the outside of the bends,
  arrows painted before the turns, numbered corner boards and 3-2-1
  braking markers before the hard corners (one sign atlas, `atlasTex()`).
  The show kart waits in the middle bay (`showSpot`). A race's conditions
  go on the sky through `conditions()` (night: night, rain: rain, day:
  day and dry), and the visitor's own time and weather come back after
  (`raceConditions` in `index.ts`). `kart.ts`
  (`createKartRace()`) runs a race: builds the sim from the save at the
  class's pace, seats Degen, places the karts from the sim every frame
  (tilted with the banking), the chase camera, sparks, flames, dust off
  the run-off and spray in the rain, the sounds (`kart*` kinds in
  `sound.ts`), pays through `finishKartRace()` (and `seriesRace()` in a
  series) + `commit()` and shows the results. **Ghosts** in time trials:
  your best lap on the course and class is recorded as it's set and
  replayed (`degen-city-ghosts-v1` in localStorage, per key), and a par
  ghost is driven by the sim's `auto` at the class's pace; `setGhosts()`
  shows or hides each, the HUD shows the gap. `kart-ui.ts`
  (`createKartUI()`, markup `data-karts`, `data-kart-hud`,
  `data-kart-count`, `data-kart-pops`, `data-kart-result`, the Drift /
  Item touch buttons `data-kart-drift` / `data-kart-item` in
  `CityMap.astro`, styles in `src/styles/karts.css`) is the hut's menu
  (Race: the cups as series (start, continue, drop), single races, time
  trials with their class and ghosts, the daily challenge; Karts: buy,
  pick, mods, paints; Boards: the leaderboards per course and class, your
  records, par and trophies), the HUD (place, lap, clock, last and best
  lap, the ghost gap, surface, item slot and roulette, drift meter, the
  series race), the countdown, pops and the results card (laps, par, the
  series table with Next race / Drop). `walk.ts` wires them: the hut
  door's prompt opens the menu, a race hides Degen and feeds the kart
  (`kartFrame()`: W/S gas and brake, A/D steer, Space hop and drift, E (or
  a click) uses the item, S held sends it behind; touch: the stick, the
  pedals, Drift and Item; gamepad: stick, RT / LT, A drift, X / RB item, Y
  quits), `nextRace()` / `quitSeries()` carry a series on, Esc or Quit
  abandons (no prize), closing the results stands Degen up by the hut.
  While racing `.city.is-karting` is on the root and `data-kart` makes the
  header read "Karting · <course>". Under reduced motion the race still
  runs (it's the game) with no camera shake or sparks.

## Target practice (3D walk mode)

- Solo shooting practice. Only the player's Degen carries a gun, picked up
  at the gun store counter in the Armoury (`RACK` in `solids.ts`, the
  counter itself in `armoury()`). Targets are the cardboard dummies (`DUMMIES`) and the patrol
  drones; never make pedestrians, soldiers or other characters targets.
- **Rules and view are split, ready for multiplayer.** `combat-sim.ts` owns
  the rules (ammo, fire rate, spread, hits, health, respawns, score, streaks)
  on a fixed 60 Hz tick, takes per-player inputs and emits events. It must
  stay free of DOM, scene objects and `Math.random` (seeded generator only)
  so a server can run it. `combat.ts` is the local view: it feeds the local
  player's input in and draws / plays the events. New gameplay goes in the
  sim first; looks and sounds in the view.
- **The gun store** (`gunshop.ts`, markup `data-shop` in `CityMap.astro`)
  opens at the Armoury counter. Four guns, each defined once in
  `combat-sim.ts` `WEAPONS` (stats, `need` = lifetime score that unlocks it)
  and modelled in `guns.ts` `SPECS` (parts, muzzle, sight, hand spots): the
  Assault Rifle (holo red-dot, also carried by the soldiers via
  `rifleGeometry()`), Buzz SMG, Street Sweeper shotgun (pellets, iron sights)
  and Long Shot marksman rifle (scope, full-screen scope view) unlock with
  score and are free; the Hand Cannon revolver, Tri-Tap burst carbine and
  Belt Feeder are bought with Dorras (`GUN_CATALOG`), and every gun's mods
  (`GUN_MODS`: barrel, extended mag, grip and stock; `applyGunMods()`, per
  player in the sim) are bought at the Armoury's workbench. Never real
  money, never tied to the token. Keep them cartoon: no real-world gun
  names, brands or markings. A new gun needs a `WEAPONS` entry (with a `short` name for the Swap
  button), a `SPECS` entry (with its
  third-person `hold` spot for the front hand), store art (`ART` in
  `gunshop.ts`) and a shot sound (`SHOT_SOUND` in `combat.ts`).
- In third person (the player and other players), `stance.ts` `holdGun()`
  puts both hands on the gun with `reachArm()` in `character.ts`: the
  shooting hand on the pistol grip (every gun's origin), the other on its
  `hold` spot, or on the magazine during a reload. Longer guns turn Degen
  side-on just enough for the front hand to reach. Call it after the walk
  and jump poses so they don't pull the hands off.
- Finishes (`SKINS`) are cosmetic and work on every gun. Lifetime score,
  finish and last gun are saved in the browser under `degen-city-combat-v1`
  (or the player profile online).
- First person is the default when walking starts. The hands
  (`viewmodel.ts`) wear the sleeves of Degen's outfit (`setOutfit()`, called
  from `walk.setLook()` through `combat.setOutfit()`: a suit sleeve with a
  shirt cuff, or a looser hoodie / track sleeve with a ribbed cuff and the
  track top's stripes). They're built `K` times bigger and further out (the camera's
  near plane is 0.5 m) and drawn in the front of the depth buffer, with
  their own flat shading (city lamps would otherwise light them wrongly).
  Keep the red dot on the line of sight: scale the whole holder, never only
  its position.
- Hits are hitscan from the camera centre. Bullets stop on everything in
  `SOLIDS` except the dummies' own footprints (`SHOT_SOLIDS`), on plot
  buildings and on the ground. When dummies move, their footprints follow
  `DUMMIES` automatically.
- Keys: click fires, right-click aims, R reloads, G holsters, Q / 1-4 swap
  guns; Caps Lock (not R) toggles run. Where the mouse can't be captured
  (`noLock` in `walk.ts`), click fires and dragging looks. Only a real mouse
  fires from the canvas (taps send mouse events too).
- Swapping (`swap()` in `combat.ts`, `sim.swap()`, the `swap` message): once
  geared up, any unlocked gun, anywhere; each gun keeps its own ammo
  (`stash`), a new one comes full, the counter refills all, and the new gun
  fires after `SWAP_TIME`. On touch the Swap button (`data-walk-swap`, gun's
  `short` name in `data-swap-name`) sits above Fire; the desktop HUD shows the
  gun's name (`data-gun`).
- Touch: dragging the Fire button also looks (one thumb shoots and steers);
  keep its `touch-action: none` so the browser never cancels a held Fire. The
  right-hand buttons and the door prompt must not overlap at any phone size,
  upright or on its side (narrow phones get a smaller stick). With "Aim when firing" on, firing also aims (`aimNow` in
  `walk.ts`, held `AUTO_ADS_HOLD` after the trigger is let go); use `aimNow`,
  not the aim input, for anything that depends on aiming (spread, sight,
  zoom, the aim sent to the server). The combat HUD (`data-cross`, `data-hitmark`, `data-dmg`,
  `data-pops`, `data-mag`, `data-reserve`, `data-reload-hint`, `data-score`,
  `data-streak`), the finish picker (`data-skins`, `data-lifetime`) and the
  Fire / Aim / Reload / Swap buttons live in `CityMap.astro`; `combat.ts` and
  `walk.ts` expect them.
- Gun sounds go through `sfx()` in `sound.ts`, so they stay silent until the
  visitor turns sound on. Under reduced motion the drones hover in place.
- Score, streaks and finishes are for fun only: no prizes, real rewards or
  token tie-ins. Takedowns do count for the city's game (`takedown()` in
  `tycoon.ts`: XP, missions, badges), through the `onTakedown` dep.
- **Fighting** (punches and kicks, the Fight Club on the south bank, styles
  bought with Dorras, player-versus-player when the server is live) is
  planned in `docs/fight-plan.md`; build it one phase at a time with the
  owner's sign-off, the rules in `fight-sim.ts` first.
- **The crew** (the owner's call): a cartoon rival crew of ten goons on the
  south bank, the only characters that are targets; the city north of the
  river stays a safe hangout. Rules in `combat-sim.ts`: `CREW_ZONE` (the
  bank between the river wall and the south row, from the west bridge to
  past South 5) and `CREW_SPOTS` (patrol routes along the riverside walk
  between the bridges and the avenue's south sidewalk, never on asphalt or
  in `SOLIDS`). A goon walks its route on the sim clock (`goonPatrol()`,
  pure), jogs at a player within 7 tiles in the zone (`setPlayerPos()`
  feeds Degen's position each frame), shoves (a `shove` event;
  `combat.shove` knocks Degen back in `walk.ts`, `is-shoved` flashes the
  screen edge, `'shove'` sounds) and backs off for 2 s; shot like a
  standing figure it goes down for `POINTS.goon`, lies 8 s and gets up at
  its spawn; it never leaves the zone and stands still under reduced
  motion. The look is `crew.ts`: one `createCrowd` in violet track suits
  and cyan beanies and shades, `downPose` flat on the back with stars round
  the head; `combat.ts` adds health bars, bursts, `'goonDown'` and
  `onTakedown('goon')`. Goons shove, never shoot, and nothing in the city
  ever hurts: there is no player health. Tested in `tests/combat.test.ts`.

## City builder (3D build mode)

- Each district around the core is **one large plot** (its 3 x 3 squares
  merged into one): North 1-5, West 1-3, East 1-3, and the South row (S1-5)
  across the river. The south bank has its own east-west road
  (`SOUTH_ROAD`, so roads are split into `NS_ROADS` / `EW_ROADS` in
  `world.ts`), a lamp-lit riverside walk, traffic over the four bridges and
  pedestrians round the south row (`DISTRICTS`, `BUILDINGS`, `cleanDesign()` in
  `src/data/plots.ts`, DOM-free). Plot grid, overlay and building
  generators are in `plots.ts`, the interface in `builder-ui.ts`. The core
  landmarks are not for sale.
- **Plots cost Dorras** (the owner's call, Phase 5): `PLOT_DORRAS` in
  `catalog.ts`, dearer with each plot you own, from level `PLOT_LEVEL`;
  designs cost `BUILD_COSTS`; selling back pays `PLOT_REFUND`. The rules
  are `buyPlot()` / `buildPlot()` / `sellPlot()` in `tycoon.ts`, behind
  `createPlotStore()` (`store.ts`) for `builder-ui.ts`. There is no wallet
  in Build mode and no live or demo mode any more: one game, in this
  browser's save. Sales for PLS were retired; don't bring them back without
  the owner.
- The eight designs (`GEN` in `plots.ts`) are drawn at the large plot's own
  scale (8.2 x 8.2 tiles, front facing +z before the owner's turn), each with
  its site dressed around it from the shared helpers (paving, `tree`, `pine`,
  `lamp`, `bench`, `planter`, `fence`, `bollards`, `lightString`). People-scale:
  doors ~1.2-1.7 tall, floors ~0.95-1.0. Each design pushes its walk-mode
  footprints to `ctx.solids` (turned with the building; parks stay walkable).
  Tower and loft floors are capped in `BUILDINGS` so nothing outgrows the
  Emporium (its roof is ~12.5 tiles up; an 8-floor tower's mast tops out at
  ~11.9). Keep it that way when adding designs.
- Visitors can't type text onto buildings: sign texts come from the fixed
  `SIGNS` list, so nothing unexpected (or confidential) appears in public.
- **Logging in with a wallet** (`wallet.ts`, `account.ts`, `account-ui.ts`;
  the server's `accounts.ts`, the sign-in message in `src/scripts/net/auth.ts`)
  is part of the paused multiplayer: a player profile that follows the
  wallet. It never sends a transaction. No explorer or wallet-brand links;
  only the confirmed links in `src/data/site.ts` are linked.

## Multiplayer (beta, paused)

- **Paused by the owner**: the live site is built without a game server
  (see Hosting). The notes below describe the parked code.
- The plan and decisions are in `docs/multiplayer-plan.md`; keep it up to
  date. Phase 1 (hangout, player profiles, shared target practice) is built;
  leaderboards and south-bank PvP come next.
- The game server lives in `server/` (Cloudflare Worker + Durable Objects:
  Lobby, Room per city of 16, Profile per player, Accounts for wallet
  logins). See `server/README.md`.
  The server decides hits, scores and profiles; browsers only predict their
  own shots. New rules go in `combat-sim.ts` (shared), never only in the view.
- Shared code the server bundles must stay free of DOM and scene code:
  `src/scripts/net/*` (except `client.ts`), `combat-sim.ts`, `solids.ts`.
  `src/scripts/net/protocol.ts` is the wire format; bump `PROTOCOL` when it
  changes incompatibly.
- Nothing typed by players ever shows: guest names come from the word lists
  and emotes / phrases from the fixed lists in `profile-data.ts`. Review any
  new words or phrases for the content rules below (no token details, no
  financial talk). The server re-checks every value players send.
- Player profiles: player name (from the word lists, reroll), wardrobe look,
  rifle finish, lifetime score and rank, stored on the server against a hash
  of the browser's guest token (`degen-city-player-v1`), or of the wallet
  address once logged in (`server/src/keys.ts`). Offline, the Profile panel
  keeps the look and finish in the browser.
- **Log in with a wallet** (`account.ts`, `account-ui.ts`; server
  `server/src/accounts.ts`, the `Accounts` Durable Object, `/auth/*`): the
  wallet signs `signInMessage()` with a one-time nonce (personal_sign, no
  transaction, no gas); the server recovers the signer and issues a 30-day
  session token (only its hash is stored; the browser keeps it as
  `degen-city-account-v1`). One login covers everything: the room opens the
  wallet's own profile (the token rides in `hello`). A wallet's first login starts a fresh profile (no guest score,
  name or look carried over), and its look never overwrites the browser's
  own guest look. The **Connect wallet** button sits in the header's tools (`.nav-account`,
  rendered by `CityMap.astro` when there's a game server,
  "Connect" on phones) and in the walk Profile tab (`[data-account-open]`);
  both open the profile card (`[data-account]`). The account and card are
  made with the page (`CityMap.astro`), not with the 3D city, so they work
  on the 2D map and before 3D has loaded; `bootCity()` gets them and fills
  in their `hooks` (Online switch, rename, Build mode). The card shows:
  player name, rank, lifetime score, the wallet (short) and network, and the
  with New name and Log out. Only the visitor sees their own address; other
  players only see the player name. Logging in needs the city Online.
- The site only shows the Online pill and the Online / Offline switch when
  built with `PUBLIC_GAME_SERVER` (set by the Worker's build). Only pages in
  `ALLOWED_ORIGINS`
  (`server/wrangler.jsonc`) can connect.
- **The Online / Offline switch** (`online.ts`, `[data-online-switch]` in the
  mode header, remembered as `degen-city-online-v1`, online by default) is
  one choice for the whole city. Online: walking joins the shared city
  (`multiplayer.ts` connects only while walking). Offline: solo walking, and
  nothing calls the game server. Build mode is the same game either way. Go online / Leave in the Online pill flip the same switch. Its
  dot: grey off, cyan ready, yellow joining, green in a city, red full or
  unreachable. It reads "On / Off" up to 900px wide; up to 420px only the
  current side shows (a tap flips it) and City / Walk / Build are icons, so
  the mode header keeps the title.
- PvP will only ever happen across the river (south bank); the city north of
  the bridges stays a safe hangout.

## Tests

- `npm test` runs `tests/*.test.ts` with Node's own test runner
  (`scripts/test.mjs` bundles each with esbuild first; `npm test -- drive`
  runs only matching files). The "Build site" Action runs them before the
  build: a failing test means no zip.
- They cover the code that's free of the DOM and scene code: the street plan
  (`layout.ts`, `streetplan.ts`), downtown (`downtown.ts`), the traffic's
  routes and lights (`routes.ts`), collision data, doors, the gun counter, the garage, the
  race start line and the spawn (`solids.ts`), the plots (`src/data/plots.ts`), your car
  (`mycar.ts`), the driving rules (`drive-sim.ts`), target practice
  (`combat-sim.ts`), the economy (`tycoon.ts`, the market square in
  `solids.ts`), the city's game (`catalog.ts`, `races.ts`, `missions.ts`
  in `tests/game.test.ts`), Getting started and the save backup (`guide.ts`,
  `backup.ts`), the airport and its timetable (`airfield.ts`) and
  flying your own aircraft (`flight-sim.ts`, `myplane.ts`).
  Modules that touch the DOM or `kit.ts` (canvas
  textures) can't load in Node; keep data a test needs in the DOM-free
  files.
- When you change a rule or move something in the city, run the tests and
  extend them: a new landmark's boxes and door, a new model's handling, a
  new road. Fix the code, not the test, unless the test was wrong.
- Browser checks (the widths above, walk and drive flows) are still done by
  hand with Playwright against `npm run preview`.

## Hosting

- degenemporium.com is a static build hosted on Hostinger (`dist/`
  extracted into `public_html`). The "Build site" GitHub Action builds
  every push to `main` into a downloadable zip (artifact
  `degenemporium-site`).
- Keep the site fully static (no server routes) and keep `public/.htaccess`
  in the build.
- **Multiplayer is paused** (the owner's call): the "Build site" Action
  builds without `PUBLIC_GAME_SERVER`, so the city runs on its own: the
  whole city game in the browser's save, no Online switch, multiplayer or
  Connect wallet. Keep that code working
  (it's all behind `PUBLIC_GAME_SERVER`), but don't develop it further
  until the owner resumes it.
- **Ignore Cloudflare** for now: the `server/` Worker (emporium on
  workers.dev, which also builds a copy of the site) is parked. Don't spend
  time on its deploys unless the owner brings it back.

## Content guardrails

- **The token is confidential until launch.** Never put its name, ticker,
  contract address or launch details in the site's markup, alt text, meta
  tags, file names or commit messages. Window 05 shows a blurred *decoy*:
  CSS blur only hides things visually, and the HTML is public. Reveal it
  only when the owner says launch is live.

- All copy is draft until the owner says otherwise; keep the draft note.
- No prices, stats, APYs, audits, partnerships or testimonials unless the
  owner supplies them as facts. Dorras prices in the game (plots, cars,
  guns, clothes) are game numbers, not real prices. No financial advice:
  plots are city land for building on, never pitched as an investment.
- PulseChain is a real project: say "PulseChain native", never imply an
  official partnership or endorsement.
- Only link to destinations the owner has confirmed (currently X, Telegram
  and the Shopify store in `src/data/site.ts`).
- The Shopify store is public too: anything the site pulls from it (product
  names, images, descriptions) must not reveal the token either.
