# The Neon Mile

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **The Neon Mile** (the owner's call: a strip like Las Vegas, lights and
  casinos) on the open land between the Parkway's east side and the ring
  highway's east side, north of the river (the kart park's old land),
  planned in `docs/strip-plan.md` in six phases, each with the owner's
  sign-off; keep it up to date. One grand boulevard in place of the two
  small streets there, seven resorts (themed, glass and old-school neon,
  made-up names) with towers over the Emporium (the owner's call: the
  Strip's only, every flight clear of them), the welcome sign, a fountain
  show, a volcano, a giant LED sphere, searchlights, a monorail to the
  metro, crowds, limos and party buses, its own sound. Scenery first: the
  resorts are places that say coming soon, no betting. Phase 1 (the
  boulevard and the land) is built: `strip.ts` (DOM-free, tested in
  `tests/strip.test.ts`): the boulevard (`strip-blvd`, layout.ts
  `STRIP_BLVD`: two lanes each way round a 4-wide planted median) from the
  Parkway's line (`BLVD_WEST`) to the east road (`strip-east`,
  `STRIP_EAST_X`), `STRIP_CROSSINGS`, the north and south rows
  (`STRIP_BLOCKS`, ref `strip`, `STRIP_WALK`), `STRIP_LAMPS`, `STRIP_RECT` /
  `inStrip()`; downtown's two small east-west streets stop at the Parkway
  and start again past it (layout.ts `STRIP_GAP`, `ewRuns()`, `ewStreet()`:
  their east pieces `ew1e` / `ew2e` carry the highway's junctions and
  Crestmont's crossings); an avenue's planted `median` pushes its lanes
  out (routes.ts `wide()`). Drawn by `strip3d.ts` (`LAZY_DISTRICTS` id
  `strip`: asphalt, the median's palms with neon uplights, lines, zebras;
  the palms' shapes are `palms3d.ts`, Crestmont's too). Phase 2 (the
  resorts, as places) is built: `resorts.ts` (DOM-free, tested in
  `tests/resorts.test.ts`): `RESORTS`, each written in its own frame
  (`frame()`: `u` along the boulevard, `v` back from it): **Wild Ace**
  (classic neon, under the Emporium), **Dragonspire** (a castle),
  **The Golden Scarab** (a pyramid), **Big City** (a cluster of towers and
  a rollercoaster, `COASTER`, `coasterAt()`) on the north row; **The
  Gondolier** (a palace on its canal by the fountain show's lake), **Lava
  Lagoon** (a gold crescent behind its lagoon) and **Orbit** (the tallest,
  a saucer deck, its mast 44) on the south row, `SPHERE_LOT` behind
  hoardings until Phase 3; each with its `parts`, `pylon` (an LED screen and
  its name), `porte` (the porte-cochère and a car under it), `door` (a walk
  prompt), `spawn`, `water` (held in by a rim) and `pool`; the themes' own
  (`WILD_ACE`, `DRAWBRIDGE`, `SCARAB`, `BIG_CITY`, `GONDOLIER`, `LAGOON`,
  `ORBIT`); `RESORT_SOLIDS` (in `SOLIDS`), `RESORT_TALLEST`. Spots
  `wildace`, `dragonspire`, `scarab`, `bigcity`, `gondolier`, `lagoon`,
  `orbit` (pins, directory entries, panels with Walk in,
  `data-strip-walkin`, `PLACES` and `LIVE_PLACES` entries, the doors in
  walk.ts `ALL_DOORS`). A taxi may stop on the boulevard's far kerb (no
  U-turns); the resorts' own drives come with the limos (Phase 5). Drawn by
  `resorts3d.ts` (`registerResorts()`, from strip3d.ts): two sites a resort
  and the coaster's, the Strip's own curtain-wall atlas (`strip-glass`),
  one sign atlas (`strip-signs`) and the LED faces (`strip-led`, made-up
  slides stepped on together by the tick); on the main thread the water,
  the cars, the cowboy's waving arm, the pyramid's beam at night, the
  coaster's train, Wild Ace's chasing bulbs (`strip-bulb-<n>`) and the
  waterfalls. Phase 3 (the landmarks) is built:
  `stripmarks.ts` (DOM-free, tested in `tests/stripmarks.test.ts`): the
  welcome sign in the median by the west end (`WELCOME`), the fountain show
  in the Gondolier's lake (`JETS`, `SHOW`: six movements every three
  minutes, `showAt()`, `jetHeights()`), the volcano on Lava Lagoon's islet
  (`VOLCANO`, `ERUPT`, `eruptionAt()`, `volcanoRumble()`: sound.ts's
  `quake`), the Sphere (`SPHERE`, a place: spot `sphere`, `SPHERE_DOOR`,
  `SPHERE_SPAWN`) and the `SEARCHLIGHTS`; `MARK_SOLIDS` (in `SOLIDS`); each
  show a function of the clock, a still frame under reduced motion
  (`SHOW_STILL`, `ERUPT_STILL`). Drawn by `stripmarks3d.ts`
  (`registerMarks()`: the Sphere's LED skin a shader of made-up slides, the
  jets, flames and beams instanced on the main thread); the Strip's chunk
  loads from further out (`STRIP_REACH`). Phase 4 (the monorail) is built: `monorail.ts` (DOM-free,
  tested in `tests/monorail.test.ts`): a beam over the north bank avenue's
  median (`MONO`, `FLOOR`) from by the east ring avenue past the Sphere, its
  pillars in the median (`MONO_PILLARS`), four stations (`MONO_STATIONS`:
  Downtown Link, a short walk from the metro's Downtown station; Neon Mile
  West, Central and The Sphere at the back of the walks between resorts),
  the train on a shuttle timetable (`monoAt()`), rides (`monoRide()`,
  `monoResume()`, `MONO_VIEW`), `MONO_SOLIDS` (in `SOLIDS`). The doors are
  walk prompts (`mono:<id>`) opening `monorail-ui.ts` (loaded on first use,
  the metro's card and bar), the stations places (`mono-<id>`, kind `mono`
  on the world map), `monorail` in `LIVE_FEATURES`; drawn by `monorail3d.ts`
  (`registerMono()`). Phase 5 (life and sound) is built: two new
  traffic-only models, the Velvet Stretch limo and the Party Liner open-top
  bus (`limo`, `partybus` in carspec.ts and the model tables; cars.ts
  `EXTRAS`); the Strip's own traffic (strip.ts `STRIP_LEAD`, `STRIP_MIX`,
  `STRIP_PAINTS`: life.ts `STRIP_HOME`, a Home naming its lead model and
  paints, `strip` in `TIERS`); walkers round its rows with their shopping;
  `striplife.ts` (DOM-free, tested in `tests/striplife.test.ts`: valets,
  doormen, the crowds at the fountains, the volcano and the Sphere, added
  from the chunk through `addPeople()`, the crowd's `reserve` now 320 since Endswood's life); its
  sound (ambience.ts `strip`, `casino`, `show`: the crowd's babble, slot
  chimes by the casino doors, the fountain show's music while a show is on). Phase 6 (polish and performance) is built and the plan
  is done: `?bench` views `strip` and `strip-street`; phones draw the Sphere's
  shader on a lighter path (`LOW`) and the coaster at half its samples; the
  fountain's nozzle lights in the FX layer; the volcano's flames shaped as
  flames. It draws lighter than Uptown on desktop and phones.
