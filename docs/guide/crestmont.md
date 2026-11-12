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
  (`CLUB`, `HOLES`), the overlook on Vista Lane (`OVERLOOK`) and the
  reservoir with its dams and fence (`RESERVOIR`, `FENCE`); their ground
  `SITE_LEVELS` (in terrain.ts's `LEVELS`), `SITE_SOLIDS` (in `SOLIDS`),
  `onSite()`; drawn by `crestsites3d.ts`. Step 2 (each a place) is built:
  spots `hotel`, `civichall`, `golfclub`, `overlook`, `reservoir`
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
  piers, `onLand()` keeping the oaks and scrub off). Made-up names only.
