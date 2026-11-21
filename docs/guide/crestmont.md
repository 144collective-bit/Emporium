# Crestmont

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Crestmont** (the owner's call: a north-east town in the style of
  Beverly Hills, ultra-premium buildings, palm trees and gentle hills to
  about 45-60 m, no hillside sign, a metro station) on the open
  land outside the ring highway's north-east corner (the Flats east of its
  east side, the hills rising north to the world's corner), planned in
  `docs/crestmont-plan.md` in phases, each with the owner's sign-off; keep it up
  to date. Phase 1 (the ground that rises) is built: `terrain.ts`
  (DOM-free, tested in `tests/terrain.test.ts`): `HILLS`, `TERRAIN_RECT`,
  `heightAt()` (0 everywhere outside the hills' land: under every street,
  block, solid and place), `slopeAt()`, `onHills()`, `LEVELS` (ground held
  level, cut and fill, for later phases' roads and pads), `hillsAlong()`
  (where a ray meets them). Read by world.ts (`hillsPlane()`: the grass a
  grid over the hills, `tintHills()` by height and slope), walk.ts
  `groundAt()` (so walking, driving and flying follow them), `cameraRoom()`,
  solids.ts `rayBoxes()` and the outskirts' trees. Anything new standing on
  the hills stands at `heightAt()`. Phase 2 (the streets) is built:
  `crestmont.ts` (DOM-free, tested in `tests/crestmont.test.ts`): the Flats'
  grid (`FLATS_X`, Coral Drive, Crestmont Boulevard with its median, Foothill
  Road, `CREST_BLOCKS`) across downtown's east-west roads past the highway,
  and the hill roads (`HILL_ROADS`: Ridge Road and Canyon Drive, the
  cul-de-sacs Summit Lane and Vista Lane; `curve()`, `grade()` at most
  `MAX_GRADE`), cut into the hills as beds (`BED`; terrain.ts reads them,
  the hills' own shape is hills.ts's `natural()`); `CREST_STREETS` /
  `CREST_CROSSINGS` in the street plan, `CREST_LAMPS` at the boot, drawn by
  `crestmont3d.ts` (`LAZY_DISTRICTS` id `crestmont`); traffic and taxis
  ride the slopes (`riseAlong()`). Phase 3 (palm trees and the landscape)
  is built: `landscape.ts` (DOM-free, tested in `tests/landscape.test.ts`):
  `PALMS` (fan and date palms down the boulevard's median, along the Flats'
  streets, Foothill Road, up Ridge Road; `PALM_TALLEST`), `JACARANDAS`,
  the hills' `OAKS` and `SCRUB`, and `WALLS` (retaining walls where a hill
  road is cut in, guard rails where it's built up); drawn by
  `landscape3d.ts` (crowns sway, `SWAY`); nothing of it solid; the
  outskirts' trees keep off the hills. Phase 4 (the Drive, the shopping
  street) is built: `coral.ts` (DOM-free, tested in `tests/coral.test.ts`):
  `BOUTIQUES` along both sides of Coral Drive (two or three storeys, white
  stone, glass in bronze or white render, black or gold awnings, two
  cafés with `TABLES`, `PLANTERS`; under `TALLEST`), Via Coral (`VIA`: a
  cobbled walk-only lane to a piazza, `ARCH`, `FOUNTAINS`, `LANE_SHOPS`),
  the valets' stands and the cars in the bays (`VALET_STANDS`,
  `CORAL_CARS`); the bays are crestmont.ts's (`CORAL_BAYS`, `crestPoly()`:
  the block notched so the sidewalk wraps round them, `inBay()`);
  `CORAL_SOLIDS` (in `SOLIDS`), `onDrive()` (the planting keeps off);
  drawn by `coral3d.ts` (one sign atlas `coral-signs`, the cars through
  `parkedCars()`). Phase 5 (the Flats' estates) is built: `estates.ts`
  (DOM-free, tested in `tests/estates.test.ts`): `ESTATES` on
  `ESTATE_BLOCKS` (the blocks the Drive leaves, but `KEPT`: the grand
  hotel's crest-2-0 and the metro station's crest-0-0), back to back so
  each faces a north-south street; each in its own frame (`toWorld()`,
  `rectToWorld()`): hedges (`hedgesOf()`), a gate (`piersOf()`), the
  forecourt's fountain and car (`ESTATE_CARS`), the house (`House`, five
  `EstateStyle`s: Spanish Colonial, villa, Tudor, Georgian, modern; under
  `TALLEST`), the pool; `ESTATE_SOLIDS` (in `SOLIDS`), `inGateway()` and
  the forecourts' date palms (`gardenPalmsOf()`, in landscape.ts
  `PALMS`); drawn by `estates3d.ts` (a site an estate). Phase 6 (the
  hills' mansions) is built: `mansions.ts` (DOM-free, tested in
  `tests/mansions.test.ts`): `MANSIONS` on pads beside the hill roads,
  their ground held level (`MANSION_LEVELS` are terrain.ts's `LEVELS`, over
  `PAD_EASE`, never over a road's bed, cut at most `CUT` so the banks stay
  walkable), a drive up from the road; kinds glass (cantilevered over the
  slope), villa (terraces stepping down), compound (walled) and the summit
  estate at Summit Lane's end; `MANSION_SOLIDS` (in `SOLIDS`: tops at the
  pad's height plus the building's), `MANSION_CARS`, `onMansion()` (the
  hills' planting keeps off); drawn by `mansions3d.ts`. Anything new on
  the hills stands on a level of its own the same way. Phase 7's first step
  (the landmarks' scenery) is built: `crestsites.ts` (DOM-free, tested in
  `tests/crestsites.test.ts`): the grand hotel (`HOTEL`, THE CORALLINE,
  on crest-2-0, `HOTEL_PALMS`), the civic hall at the boulevard's head
  (`CIVIC`), the country club's clubhouse and six holes on the lower slopes
  (retired, the owner's call 2026-11-21, for Knob Hill Golf Club in the north-east corner: `docs/golf-plan.md` Phase
  4; the place `golfclub` moved there), the overlook on Vista Lane (`OVERLOOK`) and the
  reservoir with its dams and fence (`RESERVOIR`, `FENCE`); their ground
  `SITE_LEVELS` (in terrain.ts's `LEVELS`), `SITE_SOLIDS` (in `SOLIDS`),
  `onSite()`; drawn by `crestsites3d.ts`. Step 2 (each a place) is built:
  spots `hotel`, `civichall`, `overlook`, `reservoir` (and `golfclub`, at Knob Hill since the golf plan's Phase 4)
  (`crestspots.ts`: pick boxes and rings at the boot, the drawing in the
  chunk), pins, directory entries, panels with Walk in (`data-crest-walkin`
  to `SITE_SPAWNS`), `PLACES` and `LIVE_PLACES` entries; a taxi aims only
  for streets that join the network (`project()` in routes.ts); since the
  polish plan's Phase 7 each has a walk prompt (`SITE_DOORS` in
  crestsites.ts, in walk.ts's `ALL_DOORS`: the hotel's door under its
  porte-cochère, the civic hall's in its colonnade, the clubhouse's off its
  terrace, and "Look out" at the overlook's rail and by the reservoir's
  fence, `DOOR_LABEL`), each opening its panel. Phase 8
  (its life, night and sound) is built: `crestlife.ts` (DOM-free, tested in
  `tests/crestlife.test.ts`): joggers and dog walkers on the hill roads'
  shoulders (`LANES`, `CREST_PEOPLE`, `CREST_DOGS`, the park's kind of
  crowd person), people standing about (`CREST_IDLE`: valets, doormen,
  diners, sunbathers on the loungers, gardeners with barrows, `GARDENERS`),
  the Drive's blocks in the town's walks with shopping bags (the crowd's
  `held: 'shopping'`), the traffic's own cars and tour bus (`CREST_MIX`,
  `TOUR_PAINT`, life.ts `opts.crest`: put back on its streets, never spent
  round the camera); the Flats' palms uplit and the pools glowing at night
  (`POOL` in estates3d.ts); its sound (ambience.ts `crest`, `CREST_HUM`:
  sprinklers by day, crickets at night, birds and the owl as the park's);
  drawn by `crestlife3d.ts` (the dogs' shape is `dogs3d.ts`, the park's
  too). Phase 9 (getting there) is built: its places on the world map,
  taxis and fast travel (from Phase 7), and the metro's Crestmont spur and
  station (`crest` in metro.ts, above under the metro). Phase 11 (polish and
  performance) is built: three `?bench` views (`crest-drive`, `crest-flats`,
  `crest-hills`); it draws lighter than downtown and Uptown, so no far forms
  for its houses; phones draw every other palm, the estates' fountains,
  chimneys and gate globes near only and the pools as plain water
  (`poolOf()` in estates3d.ts). The polish pass (the owner's call: detail, correct
  building features, luxury gardens, the land round them) is built: the houses'
  style details in estates3d.ts and mansions3d.ts (window surrounds and glazing
  bars, garden doors, garages with their aprons, `motorCourt()` in estates.ts,
  a Tudor's gabled bay and a Spanish house's or villa's loggia, `extrasOf()`);
  the gardens are `crestgardens.ts` (DOM-free, the chunk's only, tested in
  `tests/crestgardens.test.ts`: each garden laid by a `Planner` on a half-tile
  grid round the house, paving, palms, cars and people; pool houses, spas,
  pergolas, fire pits, gazebos, parterres, statues, topiary, the lawns mown in
  stripes; the hotel's, the civic hall's and the club's, `SITE_GARDENS`), drawn by
  `crestgardens3d.ts`, their solids (`GARDEN_SOLIDS`) joining the grids through
  `addSolids()` when the chunk loads; the land round them is `crestland.ts`
  (vineyards, olive groves, meadows, the mansions' cypress avenues and drive
  piers, `onLand()` keeping the oaks and scrub off). The grounds pass (the
  owner's call, 2026-11: "the landscape needs adjusting around buildings...
  improve the grounds around the houses"; `docs/crestmont-plan.md`, the
  grounds pass) is built: the hills' grass is drawn on a grid with a line on
  every level's edges and every `LEVEL_STEP` through its bank (terrain.ts
  `hillLines()`, world.ts `hillsPlane()`), and `drawnAt()` reads the ground as
  that grid draws it, so a pad is flat to its edge and what stands on the hills
  stands on the grass it's seen on (the drives, the trees, vines, piers,
  flowers and the landmarks' draped ground read it); the banks round the
  mansions' pads are `crestbanks.ts` (DOM-free, the chunk's, tested in
  `tests/crestbanks.test.ts`: spokes round each pad, cut banks terraced with
  dry-stone walls along the contours, `TIERS`, topped just over the ground they
  hold, soil beds planted by the house's kind, `KIND_PLANTS`; fill banks a lower
  wall and drifts down the slope; level edges a border), drawn in each
  mansion's own site by mansions3d.ts (which no longer stands tall walls on a
  pad's edge; its drive has a stone kerb each side); a villa's terraces stand
  on the ground behind it (`TERRACES`: bays each topped over the highest ground
  under it, `TERRACE_SOLIDS` joining the grids with the chunk, no longer in
  `MANSION_SOLIDS`); the Flats' lots' boundaries are planted (trees and shrub
  runs along the side and back hedges, a `specimen` tree for a Tudor or
  Georgian house) and their verges outside the hedges (`vergeOf()`, clear of
  the gateway, the street's trees and lamps); the open slopes' cover is
  `crestcover.ts` (DOM-free, the chunk's, tested in `tests/crestcover.test.ts`:
  `DRIFTS` of the hills' shrubs, `OUTCROPS` of boulders, `TRAILS`, gravel
  footpaths where a hill road doubles back or passes another, never steeper
  than `TRAIL.grade`, `BOLLARDS` at each end), drawn by crestgardens3d.ts
  (`registerCover()`; on phones the drifts, the banks' planting and the verges
  are near only). The second grounds pass (the owner's call, 2026-11-19: the
  next passes, "fix the terrain and any errors in the build") is built: the
  hills' grass is drawn fine (a line every `FINE_STEP`) on the pieces where
  the plain grid strayed more than `FINE_GAP` from the hills' shape
  (`FINE_PIECES`, baked as `hill-fine`), so the ridges and hollows aren't
  blocky and what stands on them meets the grass; garden paths from the
  mansions' gates (`GARDEN_PATHS`, `GATES`: none on a walled pad) to a
  neighbour's garden or down to a hill road, the banks opening for them
  (`PATH_GAP`), the pads' balustrades opening at the gates with a pier each
  side, the gardens keeping the way in clear with stepping stones; low lights
  at night (`PATH_LIGHTS` by the footpaths, `DRIVE_LIGHTS` by the drives, a
  bank's `lights` in its walls; phones every other); the banks laid round any
  level's ground (`Ground`, `mansionGround()`), the civic hall's and the
  club's pads banked too (`SITE_BANKS`), and the grand hotel's block's edges
  planted (`hotelVerge()`, `HOTEL_VERGE`). The hill houses are built on the
  hillside, not sunk in it (the owner's call, 2026-11-19): `settle()` in
  mansions.ts sets each pad's level to the middle of the hills under it (never
  further from its road's height than `DRIVE_GRADE` lets its drive climb) and
  widens its level ground by up to `YARD` a side where that stays clear
  (`yard`, `yardOf()`: off the roads with its bank, the other yards, the
  overlook, never cut or built up past `CUT` along its edges nor `CUT` and a
  half halfway through its bank); `MANSION_LEVELS` hold the yard level,
  `onMansion()` keeps the planting off it and its bank, the banks start at its
  edge, mansions3d.ts mows it. The pads, drives and houses stand where they
  stood. Its chunk's setup is light on the main thread: the footpaths are
  baked (`crest-paths`), the banks and the slopes' drifts laid when their
  sites are built (`banks()`, `siteBanks()`, `driveLights()`, `cover()`).
  The fix pass (the owner's call, 2026-11-19, three pictures: the reservoir's
  water spread up its banks, a drive standing on a slab at its road, the grass
  through a drive in stripes): the reservoir's water is a stone-edged basin
  (crestsites.ts `RESERVOIR` `crest`, `apron`, `coping`, `BASIN_DEPTH`: its
  apron held at the coping's height and its basin a little lower inside it,
  levels `of` one site, terrain.ts `Level`); the ground under each drive is
  graded from its road to its pad (terrain.ts `RAMP`, never on a road's bed or
  its pad's level ground); what's laid on the hills is dense on the grass as
  drawn (`crestdrape.ts`: the drives, the footpaths, the banks' beds, the golf
  course, the overlook's path; the hill roads' asphalt every half tile over the
  higher of its bed and the grass, `ROAD_LIFT`), `tests/crestdrape.test.ts`
  holding the grass under every one; the hill roads' walls topped just over
  the bank behind them (landscape.ts `EDGE_AT`). Made-up names only.
- **The premium upgrade** (the owner's answers, 2026-11-19; `docs/crestmont-plan.md`,
  "The premium upgrade", a phase at a time with the owner's sign-off). Phase 1,
  arrival and the night glow ("Gateway, streets kept"; "Glamorous"): the
  gateway is `crestgate.ts` (DOM-free, the chunk's, tested in
  `tests/crestgate.test.ts`), drawn by `crestgate3d.ts` as one site: a
  limestone pylon with an iron lantern on each corner where the boulevard
  leaves the bank avenue (`PYLONS`), a low wing wall along the avenue from each
  with CRESTMONT gilded on a dark stone plaque facing it (`WINGS`, `PLAQUE`),
  all in the corner lots' strip outside their hedges, and a fountain on the
  median's nose (`BASIN`); `GATEWAY_SOLIDS` join the grids with the chunk, the
  verges' planting keeps off it (`nearGateway()`). The streets, lots and
  estates stand where they stood. The night's rules are `crestnight.ts`
  (DOM-free, tested in `tests/crestnight.test.ts`): which windows are lit
  (`windowGlow()`, the same window the same every time: `WINDOW_SHARE` warm or
  soft, the rest dark, fewer on phones, `WINDOW_SHARE_LOW`; estates3d.ts
  `windowOf()`, `WINDOW_SOFT`, `WINDOW_DARK`, on the estates, the mansions and
  the landmarks), festoon lights (`FESTOON`, `festoon()`: strung between each
  garden's lamps level with each other on slim posts raised from them,
  `pairRuns()`, and criss-crossed under the pergolas; near only, every other
  bulb on phones), the lights under the pools' water (`poolLights()`,
  `POOL_LED`; the pools' glow brighter, still none on phones) and the
  landmarks' uplights (`alongWall()`, `UPLIGHT`): the hotel, the civic hall and
  the clubhouse floodlit (their main walls' faint warm emissive in
  crestsites3d.ts, `flood()`), all under the bloom's threshold.
  Phase 2, the houses upgraded (balconies "By style", roof terraces "Mansions
  only", gates "Iron gates, lit piers", phones "Trimmed as now"): the rules
  are `crestgrand.ts` (DOM-free, the chunk's, tested in
  `tests/crestgrand.test.ts`), drawn through each house's own helpers by
  `crestgrand3d.ts` (`drawBalcony()`, `drawDeck()`, `drawPierTop()`,
  `drawLeaf()`) from estates3d.ts and mansions3d.ts. Balconies
  (`ESTATE_BALCONIES`, `MANSION_BALCONIES`, a kind by style:
  `ESTATE_BALCONY`, `MANSION_BALCONY`) on the main block's first upper floor,
  at the windows as the houses lay them (`windowsAlong()`), clear of a villa's
  stone balcony over its door (`DOOR_BALCONY`), a Georgian portico
  (`PORTICO`) and anything tall in the garden under them (`clearOf()`). The
  hill mansions' roof terraces (`ROOF_DECKS`, `roofDeckOf()`): a glass house's
  flat roof decked; the others' main hips cut flat at `DECK_HIP.f` of their
  height (`hipDeck()`, roofs3d.ts `deckHip()`), the rail (`DECK_RAIL`) clear
  of the chimney (`MANSION_CHIMNEY`) and the summit's tower, furnished inside
  it. Gates: the estates' piers `GATE.h` 2.1 (estates.ts, solid at that
  height), a lantern and a plain plaque each (`PIER`), the leaves wrought
  iron with gilded tips (`GATE_LEAF`, `leavesOf()`; a modern house's slatted,
  `slatted()`); the hill houses without a wall get piers and gates at their
  drive's mouth (`MANSION_GATE`, `mansionPiers()`, `MANSION_PIERS` joining the
  grids with the chunk).
  Phase 3, the new hill mansions (four, Art Deco and French chateau by
  turns, "deeper terraces + vineyard"): `NEW_LOTS` in mansions.ts (the road,
  the distance along it, the side, how far back, the kind, how much deeper
  than `CUT` its terraces may cut), laid after the eight already there
  (`lot` marks them), tested in `tests/crestlots.test.ts`. The kinds `deco`
  (a flat-roofed main block and a stepped tower, a sundeck) and `chateau` (a
  mansard main block, `MANSARD`, roofs3d.ts `mansard()`, crestgrand.ts
  `mansardDeck()`; two turrets, `TURRET`, an `MPart`'s `roof: 'cone'`), drawn
  by mansions3d.ts `drawDeco()` and `drawChateau()`; their gardens in
  crestgardens.ts (a chateau's parterre and statues, an Art Deco house's
  reflecting pool), their banks' planting in crestbanks.ts `KIND_PLANTS`. The
  land is laid as it was (crestland.ts `LAID`), a piece a new lot or drive
  takes moved aside whole (`keep()`): two vineyards and a grove. A new lot's
  drive cut into the hillside eases over a wider bank (terrain.ts
  `RAMP.bank`); Crestmont's north edge is -395 (`CREST_RECT`).
  Phase 4a, Highcrest's places ("Split", "Panels + the showroom sells"):
  THE ASTERLY (crestsites.ts `ASTERLY`, `ASTERLY_NAME`; drawn in
  crestsites3d.ts as the site `crestmont asterly`) off the overlook's
  falling side on legs over the slope as it is, its door at a gap in the
  overlook's rail (`SITE_DOORS`, `SITE_SPAWNS.asterly`), its body and
  terrace's rail solid (`SITE_SOLIDS`), the planting kept off under it
  (`onSite()`); the `HIGHCREST_NAME` marker at the overlook's way in. Coral
  Drive's refits (coral.ts `CORAL_PLACES`, `CORAL_PLACE_NAMES`,
  `CORAL_DOORS`, `CORAL_SPAWNS`; a `Boutique`'s `place`): VELLANO MOTOR
  SALON's ground floor open behind clear glass with its car on show
  (coral3d.ts `SHOW_CAR`), SOLENNE's frosted windows. Their panels are in
  CityMap.astro (kickers 51 to 53), their walk-ins in index.ts, their pins in
  crestspots.ts, their live lines in livelines.ts; the showroom's cars are
  the tycoon's `vellano` panel (tycoon-boot.ts `PANELS`, tycoon-ui.ts
  `showroomView()`), bought with tycoon.ts `buyCar()`.
  Phase 4b, Highcrest's cable car: the rules are `cablecar.ts` (DOM-free, in
  the boot; `CABLE_STATIONS` with their doors and arrivals, `PYLON_AT` on
  clear ground, `SUPPORTS` baked as `cable-supports`, `ropeY()`, `needAt()`
  and `CLEAR`, `cabinsAt()` on the clock, `rideAt()`, `CABLE_VIEW` for the
  ride's cabin, `CABLE_DOORS`, `CABLE_SOLIDS` joining the grids with the
  chunk), tested in `tests/cablecar.test.ts`; the stations, pylons and ropes
  are sites and the gondolas instanced on the main thread in `cablecar3d.ts`
  (`registerCable()`); the ride is `cablecar-ui.ts` (the metro's card and
  bar, a `Ride` of kind `cable`), loaded by index.ts the first time a
  station's door is used (behind `live.closed('cablecar')`); the stations
  are places of kind `cable` (`cable-foot`, `cable-top`).
  Phase 5, the Ridgeline Walk, the Belvedere and the Crestmont Glasshouse:
  the walk is `crestwalk.ts` (DOM-free, the chunk's: `WALK_LINE` held as a
  search laid it, `WALK_POINTS` every half tile with their grades, `STEPS`
  where steep, `BENCHES`, `WALK_LAMPS`, `LOOKOUTS`, `GLASS_PATH` the branch
  to the glasshouse's door), tested in `tests/crestwalk.test.ts`, drawn in
  `crestwalk3d.ts` (`registerWalk()`, a site every 30 along it). The
  Belvedere and the glasshouse are crestsites.ts's (`BELVEDERE` on the
  ground as it is, its ring at `top`, kept off by `onSite()`; `GLASSHOUSE`
  held level in `SITE_LEVELS`), places with their doors (`SITE_DOORS`) and
  arrivals (`SITE_SPAWNS`), their solids in `SITE_SOLIDS`. The walk's
  benches (`BENCHES`, `BENCH`: along it, a sitter facing across it), the
  Belvedere's (`BELVEDERE_BENCHES`, off its way through) and the glasshouse's
  fountain (`GLASS_FOUNTAIN`, south of its path) are crestwalk.ts's data,
  which the drawing, Phase 6's sitters and the tests all read.
  Phase 6, residents at leisure and Ridge Road's cyclists: `crestleisure.ts`
  (DOM-free, the chunk's) holds `LEISURE_IDLE` (people on the balconies,
  the roof terraces' loungers and tables, at THE ASTERLY's terrace tables
  with a waiter, on the Belvedere's and the walk's benches, at the lookouts,
  in the glasshouse and its garden) and `LEISURE_PEOPLE` (walkers up and down
  the Ridgeline Walk, `strollAt()`; road cyclists on Ridge Road, `RIDERS` and
  `rideAt()` round `RIDE_LOOP`, on the asphalt's edge right of the cars,
  their pace from the grade), tested in `tests/crestleisure.test.ts`.
  `crestleisure3d.ts` (`registerLeisure()`) puts them in the crowd's spare
  slots (life.ts `addPeople()`, phones half) and draws the bikes instanced
  on the main thread, pitched with the road; the bike's geometry is shared
  with Uptown's in `bike3d.ts`. The crowd's look counts the hills east of
  `CREST_RECT` as Crestmont's (crowdlook.ts `CREST_EAST`), so the walk's and
  the glasshouse's people dress as its own; a rider's id holds `cyclist`
  for their kit. Phase 8's people (`crestlife.ts`) stay the boot's.
  The upgrade's polish pass: nothing grows or lies on the walk (crestwalk.ts
  `onWalk(x, z, margin)`, a grid of the walk, its branch, the Belvedere's
  round, the lookouts and the benches, which landscape.ts's oaks and scrub
  and crestcover.ts's drifts and rocks keep off); the steps are solid
  blocks, each from the higher end's tread down into the lower end's ground
  (`stepAt(d)`, `walkGround()`: the walk's ground is the lower of the hills'
  height and the grass as drawn), the walkers on their treads; the handrail
  is drawn in runs, none across the Belvedere's paving. Phones: the steps
  and the lookouts' rail posts near only, every other walk lamp, the Art Deco
  houses' portholes plainer.
