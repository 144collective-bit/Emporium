# Sunridge

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Sunridge** (the owner's call): a middle-class suburb of about 120
  Southwest stucco tract houses on the north-east land inside the ring
  highway (curving loops and cul-de-sacs, block-walled back yards with pools,
  a park, a school, a community pool and clubhouse), planned in
  `docs/suburb-plan.md` in phases, each with the owner's sign-off; keep it up
  to date. Made-up names only, under the Emporium. Phase 1 (the land and the
  streets) is built: `sunridge.ts` (DOM-free, tested in
  `tests/sunridge.test.ts`): `LAND`, `SUNRIDGE_RECT` / `inSunridge()` (the
  outskirts' trees keep off), Sunridge Parkway (`PARKWAY_LOOP`, a two-way
  `loop` street in the plan), its entrances off the north ring avenue
  (`ENTRIES`, the main one with a median and lights), Mesa Drive (`MESA`), the
  cul-de-sacs (`COURTS`, turning circles `BULB`, no traffic); `SUN_STREETS` /
  `SUN_CROSSINGS` / `SUN_BLOCKS` in the street plan (ref `sunridge`; the blocks
  worked out from the streets by `faces()`, each with its `runs`: a street's
  kerb or the land's edge), the amenities' land (`ZONES`), the footpath from
  Palm Court (`PATH`), the perimeter wall and the entrance monuments
  (`WALL_RUNS`, `MONUMENTS`, `SUN_SOLIDS` in `SOLIDS`), `SUN_LAMPS` at the
  boot. The lots are `sunridgelots.ts` (the chunk's: `LOTS`, 101, 6.6 x 13,
  pie-shaped round the turning circles). Drawn by `sunridge3d.ts`
  (`LAZY_DISTRICTS` id `sunridge`); the road helpers are `roads3d.ts`
  (shared with Crestmont). Phase 2 (the houses) is built: `sunhouses.ts`
  (DOM-free, the chunk's, tested in `tests/sunhouses.test.ts`): `HOUSES`, a
  house a lot in its frame (`toWorld()`), four plans (`Plan`), three entries
  (`Elevation`), `SCHEMES` and `ROOFS` (neighbours never the same colour),
  the garage, its driveway and the walk, solar and chimneys;
  `HOUSE_SOLIDS` join the grids when the chunk loads (`addSolids()`). Drawn by
  `sunhouses3d.ts` (a site a house: tile roofs from a texture a colour, lit
  windows at night, details near only); the hipped roofs are `roofs3d.ts`
  (shared with Crestmont's estates). Phase 3 (the yards) is built:
  `sunyards.ts` (DOM-free, the chunk's, tested in `tests/sunyards.test.ts`):
  `YARDS` (desert or lawn fronts and their plants, the bins, the back yard's
  ground, patio, ramada, grill, pool, extras, the gates), `WALLS` (block walls
  between and behind the lots, one to a line, none on the perimeter wall's,
  the returns with gates), `YARD_SOLIDS` (joined when the chunk loads); drawn
  by `sunyards3d.ts`. Phase 4 (the amenities and places) is built:
  `sunplaces.ts` (DOM-free, the boot's: the club's, park's and school's land, the
  clubhouse and the school's buildings, `SUNPLACE_SOLIDS` in `SOLIDS`, the front
  doors `SUN_DOORS`, `SUN_SPAWNS`) and `sunamenities.ts` (DOM-free, the chunk's,
  tested in `tests/sunamenities.test.ts`: the pool yard, courts, car park, the park's
  walk, playground and ramada, the school's covered walks, field, playground, bus bay
  and bus, `AMENITY_SOLIDS` joined when the chunk loads); spots `sunclub`,
  `sunpark`, `sunschool` (pins, directory entries, panels with Walk in,
  `data-sun-walkin`, `PLACES` and `LIVE_PLACES` entries); drawn by
  `sunamenities3d.ts`. Phase 5 (life, night and sound) is built: `sunlife.ts`
  (DOM-free, the chunk's, tested in `tests/sunlife.test.ts`): walkers and dog
  walkers along the loop's kerbs and joggers along Mesa Drive's (`LANES`, a
  lane out along one kerb and back along the other, `KERB_IN` off the asphalt,
  inside the lamps), joggers and walkers either way round the park's walk,
  kids running loops on the park's lawn and the school's field and on the
  swings (`SUN_PEOPLE`, the park's kind of crowd person, `SUN_DOGS` on their
  leads), people standing about (`SUN_IDLE`: the club's sunbathers,
  lifeguard and pickleball players, the park's benches, tables and
  playground, the school's playground and flag, the residents on their
  porches, at their grills, patio tables and pool loungers) and the
  residents' cars on about a driveway in three (`DRIVEWAY_CARS`, nosed up to
  the garage, `DRIVEWAY_SOLIDS`); since the houses are the chunk's, the
  crowd keeps spare slots for them (life.ts `LifeOpts.reserve`, 320, 160 on
  phones, with the Neon Mile's and Lot 9's; `addPeople()` fills them when the chunk loads, or queues them
  before the crowd's built, and places them at once through `repaint()`: under reduced motion the ticks run on the
  first frame only) and life.ts's home cars are per district
  (`Home`: Crestmont's, Sunridge's and the Neon Mile's, `SUN_MIX` / `SCHOOL_BUS_PAINT` in
  sunridge.ts, `opts.sun`); bus stops round the collector (transit.ts
  `SUN_STOP_GAP`, the school bus serves them); lamps at the boot round the
  park, in the club's pool yard and by the school's front (`SUN_PLACE_LAMPS`
  in sunplaces.ts; the coach lamps, half the windows and the pools already
  glow at night); its sound (ambience.ts `suburb`, `SUN_HUM`: the town's
  hum hushed, sprinklers by day, crickets at night, its birds as the park's,
  and a lawnmower now and then by day, sound.ts `mower()`). Drawn by
  `sunlife3d.ts` (`registerLife()` from sunridge3d.ts's `register()`: the
  people into the crowd, the dogs and leads on the main thread, the cars
  through `parkedCars()`).
