# The golf course

Part of the project guide (`CLAUDE.md` is its index); keep it up to date when what it describes changes. The plan, with
the owner's answers and every phase, is `docs/golf-plan.md`; its design maps are in `docs/golf-shots/`.

- **The golf course** (the owner's call, 2026-11-21: "delete the old club and let's build a new functional golf
  course", 18 holes, elevation changes and hills, bunkers, fairways, greens, rough; scenery first, a golf game on it
  later) on the open land in the north-east corner past Crestmont's hills: the north arm across the top of the hills,
  the east arm down Crestmont's east side, the clubhouse where they meet, Clubhouse Drive up from the country road east
  (`ew0-e`). Built a phase at a time, each with the owner's sign-off. Phase 1 (the layout and the ground, as data) is
  built; **nothing of it is in the city yet** (Phase 2 puts its ground under the city's).
- **`golf.ts`** (DOM-free, on `DOM_FREE`; tested in `tests/golf.test.ts`): the layout.
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
  - `CLUB_GROUNDS`, `CLUB_CENTRE` (the clubhouse's grounds, Phase 4), `DRIVE` (Clubhouse Drive's line, a street in
    Phase 3).
  - `surfaceAt()`: what's underfoot (`Surface`: water, bunker, green, fringe (`FRINGE`), tee, fairway, cut
    (`FIRST_CUT`), rough, native (past `NATIVE` from every line), grounds; null off the course): the golf game's lie.
- **`golfground.ts`** (DOM-free, on `DOM_FREE`; tested in `tests/golfground.test.ts`): the ground, in layers.
  - `FEATURES` (the Knob, Beacon Hill, the Spine, the clubhouse's rise, the swells and banks, the Hollow, a hollow
    under each lake) and low waves: `landAt()`, eased to 0 at the club's edge over `EDGE_EASE`.
  - Each fairway held to its line's profile (`lineAt()`: the land along it averaged, no steeper than `GRADE`), keeping
    `CROSS` of its hillside's fall across it (at most `CROSS_MAX`), its banks eased over `BANK_EASE`; a par 3's carry
    left as the land lies. `teeLevel()` (a par 3's on the mean of the land under its box), `greenLevel()` (its front
    meeting its approach; tilted `GREEN_TILT` up to the back), `groundsLevel()` (the grounds level).
  - The bunkers dug `BUNKER_DEPTH`; each lake's water `lakeWater()` (`SHORE_OVER` under its lowest shore), its bed
    `LAKE_DEPTH` under that.
  - `golfHeightAt()` (tiles over today's ground; 0 off the course and at its edge; `dug` false leaves the bunkers out,
    for the tests).
- **The design map:** `npm run golfmap -- <label>` (`scripts/golfmap.mjs`) draws the course from the data (what's
  underfoot, shading, contours every tile, each hole's line and number) into `docs/golf-shots/<label>.png`. Draw one
  for each phase's sign-off.
- **Crestmont Hills Club** (the old six holes, `crestsites.ts` `CLUB`, `HOLES`; the `golfclub` spot) stays until the new
  clubhouse opens (the plan's Phase 4), when the spot moves to the new club and the old holes are taken off the hills.
