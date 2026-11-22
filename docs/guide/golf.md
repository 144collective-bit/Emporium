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
    `raise` (the tee over its ground), `green` (radii along and across its last stretch), `bunkers` (`Bunker`: along,
    across to the right, radii, and `'f'` from the tee or `'g'` from the green's middle). The front nine loop the north
    arm, the back nine the east; each nine out from the clubhouse and home. The holes' frame: `along()`, `framePt()`,
    `nearestOn()`, `lengthOf()`, `arcOf()`, `fairwayHalf()` (wandering, narrowing to `FAIRWAY_NECK`), `fairwayEnd()`,
    `fairwayIn()` (round ends), `teeOf()` / `onTee()` (`TEE`), `greenOf()` / `onGreen()`, `ellipseAt()`, `bunkersOf()`,
    `holesApart()`.
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
  (`drawTurf()`, `TURF_SCALE` pixels a tile, the palette's golf covers, mown stripes `FAIRWAY_STRIPE` / `GREEN_STRIPE`,
  the bunkers' `LIP`, clear over the water) on a toon material, alpha-tested (`golf-turf`); laid by `turfMesh()` on
  `golfMesh()`'s own triangles `TURF_LIFT` over the grass, only where `mownNear()`, near and far; a site a tile, in the FX layer
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
