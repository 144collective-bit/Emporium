# The golf course

Part of the project guide (`CLAUDE.md` is its index); keep it up to date when what it describes changes. The plan, with
the owner's answers and every phase, is `docs/golf-plan.md`; its design maps are in `docs/golf-shots/`.

- **The golf course** (the owner's call, 2026-11-21: "delete the old club and let's build a new functional golf
  course", 18 holes, elevation changes and hills, bunkers, fairways, greens, rough; scenery first, a golf game on it
  later) on the open land in the north-east corner past Crestmont's hills: the north arm across the top of the hills,
  the east arm down Crestmont's east side, the clubhouse where they meet, Clubhouse Drive up from the country road east
  (`ew0-e`). Built a phase at a time, each with the owner's sign-off. Phase 1 (the layout and the ground, as data) is
  built, Phase 2 (the ground in the city: its hills walked on, its turf and its lakes drawn) and Phase 3 (Clubhouse
  Drive, the cart paths and the footpath, the woods, the fence round its edge, reeds) and Phase 4 (Knob Hill Golf
  Club's clubhouse, the place `golfclub` moved to it, Crestmont Hills Club retired), Clubhouse Drive made a street
  (taxis and a little traffic up to the club), and Phase 5 (its life: what stands on the course, the flags, the
  golfers, the carts, the mower, the ducks, the clubhouse lit at night, its sound).
- **`golf.ts`** (DOM-free, on `DOM_FREE`; tested in `tests/golf.test.ts`): the layout (its top-level values marked
  `/* @__PURE__ */` so the bundler can drop what isn't used).
  - `COURSE` (the club's land: `wander()` round `COURSE_BASE`, `EDGE_AMP`, `EDGE_STEP`, no ruler-straight edge),
    `COURSE_RECT`, `inCourse()`, `insetOf()` (how far inside the edge; negative outside).
  - `HOLES`: eighteen, par 72 (four par 3s, ten par 4s, four par 5s, `PAR_LENGTH`: about half real length), each its
    `line` (tee, turns, green's middle), `fairway` (`from` the tee, `to` back from the green, `half`; none on a par 3),
    `raise` (the tee over its ground), `green` (radii along and across its last stretch), `shape` (the green's
    `Lobes`: `PEAR`, `FRONT`, `PEANUT`, `KIDNEY` / `KIDNEY_L`, `ROUND`, `LONG`; no two greens the same size and shape),
    `bunkers` (`Bunker`: along, across to the right, radii, `'f'` from the tee or `'g'` from the green's middle, and a
    turn; one to four a hole, no mirrored pairs, the design pass's D1). The front nine loop the north
    arm, the back nine the east; each nine out from the clubhouse and home. The holes' frame: `along()`, `framePt()`,
    `nearestOn()`, `lengthOf()`, `arcOf()`, `fairwayHalf()` (wandering, narrowing to `FAIRWAY_NECK`), `fairwayEnd()`,
    `fairwayIn()` (round ends), `teeOf()` / `onTee()` (`TEE`), `greenOf()` / `onGreen()`, `ellipseAt()`, `bunkersOf()`,
    `holesApart()`. The shapes (D1): an ellipse whose radius is scaled round it by `lobeAt()` (1 + a sum of cosines);
    `shapeAt()` (under 1 inside), `shapeOutline()`, `greenOutline()`; `bunkersOf()` (cached) gives each bunker's
    `BunkerShape` (`at`, `dir`, `r`, its own lobes from `bunkerLobes()`, seeded) and pushes a greenside bunker out from
    the green till its lip is `BUNKER_CLEAR` clear of the fringe (closer, the turf texture smears them together);
    `bunkerAt()`; `LIP` (the bunker's turf lip, here so golflife.ts's rakes and golf3d.ts share it).
  - `LAKES` (Fen Pond, the Pond, Heron Lake, Reed Water, Clubhouse Lake; each an ellipse, its shore wobbled:
    `lakeAt()`), `inLake()`.
  - `CLUB_GROUNDS`, `CLUB_CENTRE` (the clubhouse's grounds, Phase 4), `DRIVE`, `DRIVE_HALF`, `FOOTPATH`, `PATH_HALF`
    (golflift.ts's, re-exported).
  - `PATHS` (the cart paths: `besideHole()` on the side and shape `pathCost()` finds clearest, `SIDES` where it's
    chosen, `PATH_OFF`; links green to next tee bent round what's in the way; the grounds to the 1st and 10th and back;
    the footpath's join), `fromPaths()`, `fromDrive()` (their stretches filed by `CELL`).
  - `surfaceAt()`: what's underfoot (`Surface`: water, bunker, green, fringe (`FRINGE`), tee, fairway, cut
    (`FIRST_CUT`), rough, native (past `NATIVE` from every line), grounds, path, drive; null off the course): the golf
    game's lie; `holeSurface()` the holes' own (the paths' costing).
- **`golfground.ts`** (DOM-free, on `DOM_FREE`; tested in `tests/golfground.test.ts`): the ground, in layers.
  - `FEATURES` (the Knob, Beacon Hill, the Spine, the clubhouse's rise, the swells and banks, the Hollow, a hollow
    under each lake) and low waves: `landAt()`, eased to 0 at the club's edge over `EDGE_EASE`.
  - Each fairway held to its line's profile (`lineAt()`: the land along it averaged, no steeper than `GRADE`), keeping
    `CROSS` of its hillside's fall across it (at most `CROSS_MAX`), its banks eased over `BANK_EASE`; a par 3's carry
    left as the land lies. `teeLevel()` (a par 3's on the mean of the land under its box), `greenLevel()` (its front
    meeting its approach; tilted `GREEN_TILT` up to the back), `groundsLevel()` (the grounds level).
  - The bunkers dug `BUNKER_DEPTH`; each lake's water `lakeWater()` (`SHORE_OVER` under its lowest shore), its bed
    `LAKE_DEPTH` under that.
  - Clubhouse Drive's bed (`driveBed()`, `driveBedY()`, `DRIVE_BED`, `BED_IN`): level across, today's ground till well
    in from the club's edge, then up evenly to the grounds (applied after them, never on them).
  - `golfHeightAt()` (tiles over today's ground; 0 off the course and at its edge; `dug` false leaves the bunkers out,
    for the tests).
- **`golflift.ts`** (DOM-free, on `DOM_FREE`, the boot's; tested in `tests/golflift.test.ts`): the course's ground as
  the city reads it, baked (`golf-ground`) on a grid every `GOLF_STEP` over the fixed `GOLF_RECT`: `golfLift()` (each
  square two triangles from its low corner to its high one, as world.ts draws it), `golfNode()`, `golfLand()` (0 off
  the course, 1 its native grass, 2 in play), `golfShare()` (the land blurred over `BLUR` points, for the ground's
  paint), `golfWater()`, `golfIn()`, `onGolf()`, `onGolfGrid()`; packed by `packGolf()` (heights in 64ths, a character
  a step along each row, `ESC` for big ones; the land in runs), `unpackGolf()`. It never imports golf.ts or
  golfground.ts: **`golfbake.ts`** works the grid out (`makeGolfGrid()`, `setGolfMaker()`), loaded only by the bake
  (first in `scripts/bake.mjs`), the tests (each test file's entry in `scripts/test.mjs`) and `scripts/seams.mjs`. Never
  import golf.ts or golfground.ts from the boot's code: they'd come into the boot.
  - `LAND` (off, native, rough well clear of the holes, play: golfbake.ts `landAt()`, `TREES_CLEAR`), `golfTrees()`
    (the course's woods: `WOODS_CHANCE` a grid point, seeded, none by the play or off the course, `keep` for phones;
    placed with the outskirts' trees, world.ts `scatterOutskirts()`), `DRIVE` / `DRIVE_HALF` (Clubhouse Drive: `DRIVE_CORNERS` rounded, `rounded()`),
    `FOOTPATH` / `PATH_HALF`, `CLUB_GAPS` (where they cross the country road's fence: ruralfence.ts `DRIVES`).
  - `golfStreets()` (Clubhouse Drive a street of the plan, `docs/golf-plan.md`: `golf-drive` off `ew0-e` at
    `golf-drive-gate`, the one-way turning loop `golf-drive-turn` by the car park, `DRIVE_TURN` round, at
    `golf-drive-end`; pushed by streetplan.ts after the country roads' split; kind `rural` but drawn by golf3d.ts, not
    rural3d.ts). Taxis to the club drive up it; routes.ts `project()` leaves it to the club's own (`inClub()`).
  - `golfMesh()`: the ground over a box as triangles, near the grid (each square split as `golfLift()` reads it), far a
    middle every `GOLF_FAR` with its edges still every `GOLF_STEP`, a band zipping the two (so a tile drawn far meets
    one drawn near with no gap: the near and far forms swap per tile).
  - Read by terrain.ts (`heightAt()` adds `golfLift()`, `onHills()` takes `onGolf()`, `hillsAlong()` the box), world.ts
    (`golfPlane()`: the course's grass on `golfMesh()`, near and far; `paintGolf()`), rolls.ts (kept off the course), landuse.ts (`KEEPS` `golf`: all its land, and
    `golf-footpath`; the drive kept as a street) and ground.ts (`INFLUENCES` `golf-native`, `golf`, the worn
    `golf-footpath`; the drive's verge a street's).
- **`golf3d.ts`** (the district `golf`, `LAZY_DISTRICTS`; tested in `tests/golflift.test.ts`): the turf, one texture
  (`drawTurf()`, `TURF_SCALE` pixels a tile, one on every tier: phones ask for two and paint it at half; the owner's call, 2026-11-24, to keep `texFull` in budget; the palette's golf covers, mown stripes `FAIRWAY_STRIPE` / `GREEN_STRIPE`,
  the bunkers' `LIP`, clear over the water) on a toon material, alpha-tested (`golf-turf`); laid by `turfMesh()` on
  `golfMesh()`'s own triangles `TURF_LIFT` over the grass, only where `mownNear()`, near and far; a site a tile, in the FX layer.
  The ink round the greens' fringes and the bunkers' lips (D1: the texture's two pixels a tile can't hold a crisp
  edge): `INK_LOOPS`, cut to each tile by `inkRuns()`, laid by `inkMesh()` (roads3d.ts `ribbon()`, `EDGE_INK` wide and
  over the turf) in `COVER.courseInk`, near only, in the turf's own batch (no draws of its own)
  (kit.ts `fx()`: the ink's pre-pass draws a mesh solid, the texture's clear parts too, so the turf's triangles came
  out as ink zig-zags across the rough; fixed in Phase 5). The
  cart paths painted in it, under what's mown. Clubhouse Drive (`driveMesh()`, `DRIVE_LIFT`, `DRIVE_LAMPS`, `LAMP_H`),
  a site a stretch; the club's edge near only (`FENCE_RUNS`, `FENCE_GAPS`, `FENCE`: a white post-and-rail fence, stone
  pillars at the drive, posts at the footpath; `reedsOf()`), a site a tile. The lakes' water (`shoreOf()`, `golfWater()`, world.ts `waterMat`) on the main thread.
- **The design map:** `npm run golfmap -- <label>` (`scripts/golfmap.mjs`) draws the course from the data (what's
  underfoot, shading, contours every tile, each hole's line and number) into `docs/golf-shots/<label>.png`. Draw one
  for each phase's sign-off.
- **Knob Hill Golf Club** (Phase 4): golflift.ts `GOLF_CLUBHOUSE` (the grounds, house, storeys, roof, porch, terrace,
  car park, cart shed, putting green, nets, `spawn`, `door`), `CLUB_NAME`, `clubLevel()`, `GOLF_CLUBHOUSE_H`,
  `golfSolids()` (in solids.ts `SOLIDS`, tops over the grounds' level); drawn by golf3d.ts `drawClubhouse()` (its name
  `nameMat()`, `golf-name`; the nets `golf-net`), the putting green in the turf. The place `golfclub`: crestspots.ts
  (its spot), places.ts, index.ts (`data-golf-walkin`), walk.ts (its door), live.ts, CityMap.astro (its panel),
  worldmap.ts. Crestmont Hills Club, the old six holes on the hills, is retired (the owner's call, 2026-11-21).
- **Its life** (Phase 5): **`golflife.ts`** (DOM-free, on `DOM_FREE`, the golf chunk's; tested in
  `tests/golflife.test.ts`):
  - `FURNITURE` (a hole each, `HoleFurniture`): the `pin` on the green (within `PIN_OUT` of its middle), the tee's
    `markers` (`MARKERS`), the `washer`, the `bench` facing the tee and the hole's `sign` (its name, never a number)
    beside the tee on the grass (`BESIDE`, clear of the path by `PATH_CLEAR`, the first clear of a few spots; `side`
    the cart path's), a rake by each bunker on its far side from the line; `FLAG`.
  - `GOLFERS` (`GROUPS` on each nine, spread round it, `offset`): each a round of legs (`Leg`: walking, watching, a
    full swing `golf`, a putt) that loops (`roundOf()`): off the tee in turn, out to their balls (`ballsOf()`: a lane
    of the fairway each, then the green round the pin), the furthest from the pin first, two putts each, a step back
    off the line (`HOLED`), on by the cart paths to the next tee (`wayOn()`; round the water by the hole's path,
    `walkOn()`), abreast (`ABREAST`, `besideLine()`); `golferAt()` (with `since`, how far into a shot). `GOLF_PACE`,
    `SWING_T` and `PUTT_T` (the rows' loops, acts.ts `GOLF_SECONDS` and `PUTT_SECONDS`).
  - `CART_LOOPS` (each nine's cart paths end to end, `loopOf()`, `onLoop()`), `CARTS`, `CART`, `CART_PACE`,
    `cartAt()`; the greenkeeper's mower up and down the 10th's fairway in stripes (`MOW_HOLE`, `MOW_LOOP`,
    `MOW_PACE`, `mowerAt()`); `DUCKS` on the lakes (`duckAt()`).
  - **`golflife3d.ts`** (`registerGolfLife()`, from golf3d.ts's `register()`): the tee's and the green's things a site
    each, near only (`drawTee()`, `drawGreen()`; the signs one texture, `signMat()`, `golf-signs`); the flags' cloth
    one instanced mesh, fluttering in the wind (dusk.ts `windStrength()`; its stick drawn near and far) (`FLAG_COLOURS`: the
    front nine red, the back yellow); the golfers into the crowd's spare slots (life.ts `addPeople()`, phones the
    trimmed half), the carts' drivers and the greenkeeper seated on theirs; the carts, the mower and the ducks one
    instanced mesh each (`cartGeometry()`, `mowerGeometry()`, `duckGeometry()`), moved on the tick while the camera's
    within 200 of the course. Under reduced motion all of it holds its first frame.
  - In the boot (0.7 KB, room made first: `docs/golf-plan.md` Phase 5): the crowd's `golf` and `putt` rows (acts.ts,
    crowdclips.ts), `ParkClip`'s and `Moment.since` (parklife.ts, life.ts), the `golfer` role's look (crowdlook.ts)
    and its club (wardrobe.ts `held: 'club'`), the course's sound (ambience.ts `GOLF_BIRDS`, `GOLF_LAWNS`).
  - The clubhouse's windows lit at night (golf3d.ts `golf-window`); the course stays dark.
- **The golf game** (`docs/golf-game-plan.md`; Phase 1, the rules, built): **`golfgame-sim.ts`** (DOM-free, on
  `DOM_FREE`, seeded, tested in `tests/golfgame.test.ts`): the clubs (`CLUBS`, `club()`, `launchOf()`, `lieTake()`,
  `SPRAY`, `PUTT_MAX`, `puttSpeed()`), a shot (`strike()`: `ShotInput` aim, power, accuracy; `GRAVITY`, `DRAG`,
  `STEP`, `CURVE`, `OVER`; the trees `inTree()`, `TREE`; `BOUNCE`, `ROLL`, `SLOPE_PULL`, `CUP`, `BALL_R`;
  `groundAt()`, `slopeAt()`, `outOfBounds()`, `dropBy()`; `ShotResult` with its `path` every `TRACE` steps and its
  `carry`), a round (`newRound()`, `teeBall()`, `windOn()`, `playShot()`, `toPar()`, `roundOver()`, `MAX_STROKES`,
  `WIND_MAX`, `rng()`), the test golfer (`botShot()`). The pins are golflife.ts's flags (`FURNITURE[i].pin`).
  `npm run golfmap` draws a round on the map (`GOLF_ROUND`, `GOLF_ROUND_BOT`).
  Phase 2 (a shot on the course) built: **`golfgame.ts`** (its own chunk: walk.ts `loadGolf()` / `startGolf()` at
  Knob Hill's door, whose prompt reads Play golf, `DOOR_LABEL`, gated by the live settings' `golf`, `GATED`):
  `createGolfGame()` → `GolfGame` (`start()`, `frame()`, `key()`, `quit()`, `at`): a round's phases (aim, the meter,
  the swing, the flight, settling, the camera's move to the next ball, the hole's card); the meter (`METER`: up past
  the top, the power on the way up, the accuracy on the way down: early a hook, late a slice); `pickClub()` for the
  distance; Degen posed at the addressed ball by acts.ts's `golfPose()` / `puttPose()`, placed with locomotion.ts's
  `placeRoot()`, a club on his right hand's bone while the round's on (the owner's exception to "his hands hold only
  weapons"); the ball (unlit white, on the FX layer), its trail, the aim's ring and dashed line; the shot camera
  (`shotCamera()`: behind the ball on his side), following the ball, flying between shots; the HUD and the hole's card
  built in the chunk, styled by `src/styles/golf.css` (imported after karts.css in Base.astro), walk mode's own
  buttons, the guide and the hotbar hidden under `.city.is-golfing`; `scoreName()` (par, birdie...). Walk mode's
  hooks: `golfFrame()` in `update()`, `modeNow()`'s `golf` (keymap.ts `golf`: aim A / D, club W / S, swing Space,
  the camera V (behind the ball or high over the hole), quit Esc; the jobs `club` and `swing`), walkkeys.ts's `golf` branch, Esc's `quitGolf()`, `endGolf()` standing
  Degen back at the door. The smoke's `golf` scene plays a shot (`npm run smoke -- golf`).
  Phase 3 (the round) built: Play golf opens the clubhouse's **menu** (`open()`: Continue a round left part-way, a
  hole picked with its arrows, the front nine, the back nine, all eighteen; the bests); the round kept on the save
  after every shot (golfscore.ts `keepRound()`, `dropRound()`; tycoon.ts `golf.round`, v15); each hole's **card**
  (its score's name, its XP, Next hole) and the round's (its strokes against par, `parWords()`, the Dorras under the
  day's cap, the XP, Again or Done); **`golfscore.ts`** (DOM-free, on `DOM_FREE`, the game's chunk's; tested in
  `tests/golfscore.test.ts`): `finishGolfHole()` (counters, the hole's best, `GOLF_XP`), `finishGolfRound()`
  (`HOLE_PRIZES` by each hole against par, `PRIZE_CAP.rounds`, the ledger's `golf`, `roundKind()` and its best, XP),
  `keepRound()`, `dropRound()`; the HUD's round line (which hole of how many, the score so far); the green's slope
  for a putt (`paintSlopes()`: a chevron a tile, downhill, longer where steeper); the crowd's golfers off the hole
  being played (golflife.ts `PLAYING`, `offCourse()`, each `Leg`'s `hole`; golflife3d.ts puts them off the course);
  the driver picked first off a tee only (`pickClub()`); Degen put back where he stood at the door, facing it
  (walk.ts `golfFrom`). Missions `tee-off`, `birdie`, `nine-holes` and badges `golf-18`, `birdies-10`, `ace-1`,
  `under-par` (missions.ts).
  Phase 4 (phones, pads and polish) built and signed off (2026-11-24; golf paused there, the owner's call): **touch** (shown on a coarse pointer, golf.css): ◀ ▶ aim, Club ▲ ▼, View in
  a row over the meter (`.golf-touch`, `.golf-tb`), and the swing's **pull-back** anywhere over the course between the
  HUD's blocks and that row (`.golf-pull`: down from where the finger went is the power, full at `PULL`'s share of
  the screen's height, past it to the meter's top; its lean off straight down the accuracy, as a slingshot's: right a
  hook, left a slice; `pullShot()` and `PULL` with `METER` now in golfgame-sim.ts, tested), its line drawn from
  where it started (`.golf-pull-line`, hot past full); the **gamepad** (walkpad.ts's `golf` branch, before the hub's
  Start: `GolfGame.pad()`): the left stick or the d-pad aims, LB / RB or the d-pad's up and down the club, A the
  meter's presses, R3 or Y the camera, B or Start quits; the menu and the cards by the menus' kit (`menuKit()`: the
  arrows and the d-pad round the buttons, A or Enter presses, the first choice focused for the pad); the HUD's hints
  follow what you last used (Space, A, Pull back; W/S or LB/RB); **sounds** (combat.ts `Sfx`, synthesised in
  sound.ts: `golfHit`, `golfPutt`, `golfLand`, `golfTree`, `golfSplash`, `golfCup`; the round's card `finish`); under
  **reduced motion** the camera cuts between shots and only turns to follow the ball. The smoke's `golf` scene plays
  the 1st hole through to its card; `golf-touch` (a phone on its side) plays a shot by a real touch's pull-back.
