# Westlake Park redesigned (the owner's call)

The owner, 2026-11-21: "Redesign. More complex and with ornate masonry
work. Like central park", with a bandstand and a café. Today's park
(`docs/guide/westlake.md`) is a flat lawn with straight walks, a smooth
lake, small trees all alike and a formal garden of eight flower grids. The
redesign keeps its frame and makes the inside a great city park: walks
that wind through woods, meadows and rocks, a lake with coves and bridges,
and carved stone where the paths meet the water. It's built one phase at a
time, each a PR for the owner's sign-off.

## The owner's answers

- **The paths:** all re-laid, as a great city park's are: the Mall a
  tree-lined promenade on its axis (City Hall's back door to the north gate
  and the stadium, as now), and curving walks looping through hills, a
  woodland ramble and meadows; the straight ring walk softened into curves.
- **The lake:** reshaped (its centre stays, `LAKE_C`): coves, a rocky
  point, and an arm crossed by an arched cast-iron bridge, with a
  stone-arch bridge where a walk crosses an inlet. The boathouse and the
  jetty stay. (The arm reaches north from the north shore into the woods:
  west of the lake the Mall, City Hall and the formal garden leave no room.)
- **The formal garden:** kept, made ornate (balustrades, a pergola,
  patterned beds, a carved central fountain).
- **The plan:** approved 2026-11-21, Phase 1 first.
- **The café:** The Lakehouse Café (the owner's pick). A place (a panel, coming soon for now, a pin, a door,
  `PLACES` and `LIVE_PLACES`), by the lake, with people at its tables.
- **The bandstand:** on a lawn of its own.

## What stays where it is

The snapshot holds the park's block (`WESTLAKE_BLOCKS`), the lake's centre
(`LAKE_C`), the gates (`GATES`) and the formal garden's site
(`GARDEN_SITE`); the civic quarter (City Hall, the police headquarters, the
courthouse, the square), the stadium, its walk and zebra, the boathouse and
the jetty don't move either. The Mall stays on its line (`MALL.x`), so the
axis from Uptown through City Hall to the stadium holds.

## What has to move with it

The park's data is read widely (westlake.ts is imported by about twenty
files), so each phase carries its readers: walk mode's lake rim and
terraces (`inLake()`, `RIM`, `onTerrace()`, groundheight.ts), the cars'
`LAKE_WALLS`, the boats' rings (parklife.ts `RINGS`), the people's lanes
(`LANES` on `PATHS`), the kerbs, edges, walls and planters (gardens.ts),
the trees, lamps and benches, the world map's lawns, lake and paths, the
crowd's district (`districtAt()`), the ambience, the outskirts' trees
(`WESTLAKE_RECT`), and `?bench`'s `park` view.

**The boot is nearly full** (768 of 770 KB gzipped): what walk mode needs at
the boot (the lake's line, the paths' lines for the crowd, solids) stays
lean, and everything only drawn (masonry, beds, reeds, rocks, the café's
and the bandstand's detail) is in the park's chunk (`LAZY_DISTRICTS`:
`westlake`). If a phase can't fit, it says so before raising anything.

## Phases

1. **The lake and the land** (built, signed off 2026-11-21).
   The lake is an outline now, not a radius by angle (an arm that bends
   can't be one): westlake.ts `LAKE_POLY` (baked, key `lake`), the old
   shore with two coves (`LAKE_COVES`, north-west and south) and a rocky
   point (`LAKE_POINT`, south-west) pushed along its normal, joined softly
   (a field of distances, its edge traced) with the arm curving north from
   the north shore east of the boathouse into the woods (`LAKE_ARM`) and the
   inlet running south-east (`LAKE_INLET`), for Phase 3's bridges. What
   asks of it asks the outline: `inLake()` (its margin along the shore's
   normal), `lakeDist()` (the ambience), `lakeLine()` (lines off the shore
   along its normals, folds cut out: the rim, the loop, its lanes),
   `lakeAt()` (where a ray from the middle last leaves the water), and the
   boats keep to the open water (`lakeCoreLine()`, parklife.ts
   `ringLine()`), out of the arm and the inlet. The rim's walls face by the
   shore's winding (westlake3d.ts `band()`); the benches are spaced along
   the loop, each facing the nearest water; the walks join the loop at its
   nearest point. The boathouse and the jetty keep the north shore's line.
   Rock outcrops (`ROCKS`, solid `ROCK_SOLIDS`, `nearRock()` for the trees,
   picnics and planters; palette.ts `OUTCROP`): layered grey stone in
   clusters on the knolls north and east of the lake, either bank of the
   arm, the meadow's edge and small stones at the point, drawn a site a tile
   (westlake3d.ts `registerRocks()`, lichen near only). The rolls under the
   lawn are left for Phase 5 with the planting. Until Phase 2 re-lays the
   paths, the loop goes round the arm and the inlet. Tested: a clean shore,
   the arm and inlet in the water, the lines off the shore clean and dry,
   the north shore where it was, the boats in the open water, the rocks off
   the paths and the water, apart and solid, the trees off them. The boot:
   775.0 of 775 KB at sign-off; then trimmed (the owner's call: make room
   before Phase 2) by baking what's worked out once and is small to keep:
   the open water (`lake-core`), the rocks (`park-rocks`), the lamps
   (`park-lamps`) and the benches (`park-benches`), and the formal garden's
   benches, urns and people, the Mall's beds and the planters (gardens.ts:
   `garden-benches`, `garden-urns`, `garden-people`, `mall-beds`,
   `park-planters`): their making drops out of the boot. 773.3 KB after,
   the baked file 147 KB (3.6 KB more). The trees, kerbs, edges, walls and
   parterres stay worked out in the browser: baked, they'd add far more to
   the baked file than they take from the boot.
2. **The paths re-laid** (built, signed off 2026-11-22).
   westlake.ts: the ring walk's corners rounded, each a curve about 10
   round but those by the civic quarter, and its line wandering a little
   either side where it has room, straight past the civic quarter and the
   gates (`RING_WALK`, its lanes `ringLine()`); the Mall's promenade
   (`promenade`, `PROMENADE_HALF` 3.6, laid over the Mall from City Hall's
   back to the formal garden, its rounded ends short of both; the Mall
   itself and the north gate's width unchanged, the snapshot holding the
   gate): a double avenue either side, benches along its edges, the Mall's
   beds between the avenue's rows (gardens.ts `MALL_BEDS`), paved and
   kerbed (`MAIN_WALKS`); the Great Lawn north of the lake (`LAWN`,
   `onLawn()`: kept open, no trees or rocks on it) with its walk round it
   (`lawn`) and walks to it (`mall-lawn` from the promenade, `lawn-n` up to
   the ring, `lawn-lake` down to the loop west of the boathouse), the
   diagonal meadow walk gone; the ramble through the north-east woods
   (`ramble-e` from the east gate, `ramble-n` from the ring's north side to
   the arm's tip, `ramble-w` from the tip to the lawn: narrow gravel, among
   the rocks); the garden's cross walk to the lawn's walk, its west walk on
   out of the garden's south wall to the civic quarter's west walk and its
   east walk on to the walk to the lawn (no dead ends). The lake loop and
   its walks are as Phase 1 left them, for Phase 3's bridges. Tested: no
   walk a dead end (but where the civic quarter's walks open onto the
   square), the lawn open, the promenade's two rows each side and its
   benches; the lots, the lake and the garden off every walk. The trees are
   fewer (the lawn cleared): Phase 5 plants them anew. The boot: 774.0 of
   775 KB.
   (As planned:) The Mall as a promenade (a wider paved walk, a
   double row of trees each side meeting overhead, benches all along, the
   literary walk's busts swapped for made-up urns). The ring walk's
   corners rounded and its line wandering a little inside the wall. The
   lake loop on the new shore. Curving walks: a ramble of narrow paths
   through the woods north-east of the lake, a walk over the bridge, a
   walk round the meadow, each meeting the next at an angle, none a dead
   end. Kerbs, edges, planters, lamps, benches, the people's lanes and
   the picnics refitted (gardens.ts, parklife.ts). Tested: every path joins
   another or a gate, the lanes on paths, nothing on a path.
3. **The ornate masonry** (built, signed off 2026-11-23). The park's set pieces, in a warm carved stone
   (the owner's calls, 2026-11-22: in three steps, each signed off; the
   terrace on the west shore, where the walk from the promenade behind
   City Hall meets the lake; a winged figure on its fountain):
   - **3a, the bridges** (built, signed off 2026-11-22):
     westlake.ts `BRIDGES` (`iron` over the arm near its mouth, `stone`
     over the inlet), each a straight deck square across the water, its
     ends on the land 3.2 past the water's edge either side, the loop
     joined to them by a short link (`bridgeOver()`), rising in an arch
     to 1.6 (iron) and 1.5 (stone) at the middle (`bridgeY()`,
     `onBridge()`; the owner's tweaks after the first look: higher arches,
     the stone bridge square to the inlet, 11.4 long; the iron one 15); the loop re-routed over them and the
     stretches it went round the arm and the inlet by kept as walks of
     their own (`arm-walk`, `inlet-walk`), all baked (key `park-route`).
     Walk mode crosses them (walk.ts lets you over the water on a deck,
     groundheight.ts's `park-bridge` layer), the loop's walkers and their
     dogs rise over them (parklife.ts, parklife3d.ts), the kerbs, the
     paving and the lamps stop at them. Drawn by `parkbridges3d.ts` (a site
     each, palette.ts `ORNATE`): the cast-iron bridge's timber deck, cream
     girders, an arched rib with rings, railings with scrolls (near only),
     stone abutments with urns of flowers; the stone bridge's carved body
     (one extruded profile), an elliptical arch with voussoirs and a lighter
     keystone, parapets with caps and piers. The boats keep to the open
     water, so none pass under. Tested: the ends on land and on the loop,
     water under each, the deck's rise, the loop across each, the walks
     round the arm and the inlet on land from end to end; walkers and dogs
     over the water only on a deck. Boot 774.3 of 775 KB.
   - **3b, the lake lowered and the grand terrace** (built, signed off
     2026-11-22; the owner's call, 2026-11-22: the west shore had
     only about 12 m of land before the promenade, so the lake was lowered
     rather than the terrace squeezed): the water 2.2 under the lawn
     (`WATER_Y`), its bed under it (`BED_Y`, palette.ts `BANK.bed`), inside
     a rough-cut stone embankment all round (westlake3d.ts, the rim's inner
     wall down to the bed); the lawn's slab and the ground's grass cut over
     it (`LAKE_PARTS`, the lake in convex pieces, baked key `lake-parts`;
     `LAKE_HOLE`; world.ts). The boats float at the new level, the jetty is
     a pier on posts to the bed with a ladder down to the moored boats, both
     bridges' arches spring from the water, and the small terraces (two
     now; the west one's site the grand terrace's) step down the embankment
     in a flight to a landing over the water (`TERRACE_STEPS`, taken as the
     ground, groundheight.ts). The grand terrace at the west lobe's tip
     (`GRAND`, its frame, cut, hole and solids baked as `grand`;
     `grandY()`, `onGrand()`, groundheight.ts's `grand` layer, walk.ts lets
     you onto it over the water; `GRAND_SOLIDS`): a plaza at the water's
     level reaching out over the lake, a carved balustrade along its front
     with lanterns, side walls to the lawn, the arcade's wall under the lawn
     with three arches into a tiled recess, two flights of twelve steps down
     from the lawn along it, and the fountain in its middle: a basin, two
     bowls with water falling in streams and a winged bronze figure in a
     robe, arms raised (made up). Drawn by `grandterrace3d.ts` (a site;
     palette.ts `ORNATE.tile`, `tileDark`, `bronze`). The loop bends round
     behind it, a walk's width off the arcade. Tested: the pieces cover the
     lake, the water well down, the plaza just over the water, the steps
     even and never too tall, the terrace over water and land both, nothing
     on it, no walk through it. Boot 774.8 of 775 KB.
   - **3c, the gates, the overlook and the lamps** (built, signed off
     2026-11-23): room in the boot first (the owner's call: trim
     again): the walks' kerbs and edges moved out of gardens.ts into
     `gardenedges.ts`, which only the park's chunk loads. The park's lamp
     (lampposts.ts `park`) an ornate black post with twin lanterns hung
     from its arms, along every walk; the gates' piers carved in the warm
     stone (a plinth, a sunk panel each face, a moulded cap), an urn of
     flowers on each and an iron lantern on a bracket over the walk (the
     Mall's north gate keeps its lanterns under its sign); the overlook at
     the rocky point (westlake.ts `OVERLOOK`, `onOverlook()`,
     `OVERLOOK_RAIL`, solid): paved from the rim back to the loop, a carved
     balustrade along the embankment with a pier and urn at each end, the
     point's stones moved to its flanks. Drawn in westlake3d.ts. Tested: the
     balustrade on the rim and solid, nothing on the overlook, stones on
     the point's flanks. Boot 774.6 of 775 KB.
     to come.
   As planned:
   - **The terrace** where the Mall's cross walk meets the lake's west
     arm: a grand double flight of steps down to a paved plaza on the
     water, an arcade under the walk above (tiled ceiling, arches), carved
     balustrades, and a fountain in its middle with a winged figure on a
     tiered basin (made up, no real statue copied).
   - **The cast-iron bridge** over the arm: a low arch with scrolled
     railings and planters at its ends.
   - **The stone-arch bridge** over the east inlet, rough-cut with a
     carved keystone.
   - **The gates** dressed: carved piers with urns and wrought-iron
     lanterns; balustraded overlooks at the rocky point.
   - Lamps of the park's own ornate pattern (palette.ts) along the main
     walks.
   Walk mode walks the steps and bridges (groundheight.ts layers, as the
   terraces are); solids for the balustrades and piers.
4. **The formal garden made ornate** (built, signed off 2026-11-23). gardens.ts: the wisteria pergola along the north side inside
   the wall (`PERGOLA`, `PERGOLA_COLUMNS`, solid; the north beds start
   behind it); drawn by gardens3d.ts: the wall a balustrade on the same
   lines (`balustrade()`: plinth, rail, piers, balusters near only), the
   pergola's stone columns, timber beams and joists, the vine and its
   hanging blooms (palette.ts `PLANT.wisteria`), each bed on lawn in a
   pattern (`patternBed()`: a knot of low clipped box, a diamond as big as
   fits and a ring, a ring of one colour round a tiered topiary on a
   plinth, the diamond's corners in two more), the two fountains carved
   (a moulded base, eight piers round the basin, a rounded coping, a
   turned pedestal, two bowls with water spilling in streams, a finial).
   Tested: the columns in the garden, off every walk and solid, the beds
   behind the pergola. Boot 774.8 of 775 KB.
   (As planned:) Its site and its walls kept, laid
   anew inside: balustrades in place of the low walls, a wisteria pergola
   along its north side, beds in patterns (knots of box hedge, rings and
   diamonds of colour on lawn, not grids on soil), a carved central
   fountain where the two round places are, urns, benches. Tested: the
   garden inside its site, the Mall through it.
5. **Trees and land** (built, signed off 2026-11-23; the
   owner's call: the trees out of the boot, with the park's chunk).
   `parktrees.ts` (DOM-free, on `DOM_FREE`, baked: `park-trees`,
   `park-shrubs`, `park-reeds`, `park-lilies`, to the centimetre):
   `PARK_TREES` by kind (elms in two rows either side of the promenade and
   either side of the Mall north of the garden; groves of oaks and planes
   across the lawns where a slow noise is high, glades where it's low; a
   denser wood of oaks among pines round the woodland walk; pines towards
   the highway; willows between the rim and the loop, leaning over the
   water), clear of the boot's things (picnics, planters, beds, benches,
   lamps, the ring street's edge row); `SHRUBS`, beds of uneven length
   just inside the wall, wandering in and out, breaking its line; `REEDS`
   at the embankment's foot in the coves and up the arm, `LILIES` on the
   water off them. Drawn by `parktrees3d.ts` (a site a tile; phones leave
   out every other grove tree and the lilies' flowers): elms with a vase of
   a crown, oaks broad and low on thick trunks, planes round and light,
   willows with a crown and a veil of hanging strands, pines in tiers.
   palette.ts `TREE.elm`, `oak`, `plane`, `willow`, `bark`, `reed`,
   `lily`, `lilyFlower`. The old `PARK_TREES` in westlake.ts went; index.ts
   no longer plants them at the boot, and the planters, the Mall's beds,
   the picnics and the ring street's edge row no longer read them (the
   trees keep off those instead; the planters keep off the avenue's rows).
   Boot 774.5 of 775 KB.
   (As planned:) A great park's planting: the Mall's elms; groves of
   big spreading trees (several kinds, sizes and shapes, from the
   palette), a dense woodland in the ramble, willows leaning over the
   water, a great open meadow (the Great Lawn: kept clear, ringed by
   trees), reeds and lily pads in the lake's coves, shrub beds breaking the
   wall's straight edge (the no ruler-straight edges rule). Instanced, a
   kind a mesh, the clumps trimmed on phones.
6. **The bandstand and the café** (signed off 2026-11-23;
   the owner's sites, 2026-11-23: the bandstand at the Great Lawn's south
   end facing the lake, the café on the east shore by the stone bridge,
   its terrace over the water). westlake.ts: `BANDSTAND` on the lawn,
   `LAKEHOUSE` (the pavilion east of the inlet walk, its `deck` out over
   the inlet's water from the near bank across the walk, `onCafeDeck()`,
   walkable: walk.ts, groundheight.ts `cafe-deck`), `LAKEHOUSE_DOOR`,
   `LAKEHOUSE_SPAWN`, `nearStands()` (the trees, rocks, lamps, benches,
   planters and picnics keep off both), solids; parkstands.ts (out of the
   boot) the bandstand's benches and the café's tables. The café is a place,
   `lakehouse`: lib/city.ts `SpotId`, CityMap.astro (its name, the
   directory, panel 56 "Tea on the water", coming soon, Walk in), index.ts
   (its pick spot and the Walk in), places.ts `PLACES`, live.ts
   `LIVE_PLACES`, livelines.ts (its line by the hour), walk.ts's door, the
   world map's footprint (and the bandstand's). Drawn by parkstands3d.ts:
   the bandstand (an octagonal stone base with steps on its lake side, iron
   columns, a lace frieze, a railing, an ogee roof of eight panels with a
   lantern and a gold finial) and the café (stone piers and glazed bays lit
   softly at night, a hipped roof with a glass lantern, a striped awning,
   the deck on corbels down the embankment with its balustrade and
   lanterns, tables with chairs and parasols). The ring walk is baked now
   (`park-ring`) to keep the boot in its budget: 774.6 of 775 KB. The band
   and the café's people are Phase 7's (life).
   (As planned:)
   - **The bandstand:** an octagonal Victorian bandstand (a carved stone
     base, iron columns, an ornate roof with a finial) on its own lawn, a
     ring of benches round it; a band some evenings (seated players, the
     crowd's acts) and its music in the park's ambience while they play.
   - **The café:** The Lakehouse Café,
     a pavilion of stone and glass with a terrace of tables over the
     water, people at the tables by day. A place: spot, pin, directory
     entry, a panel (coming soon), its door, `PLACES` and `LIVE_PLACES`
     with its marquee line and live line, its footprint on the world map.
7. **Life, night and performance.** The park's people on their new
   lanes, joggers and dog walkers through the ramble, the boats on the new
   shore; the lamps and the bandstand lit at night (under the bloom's
   threshold); sound (the band, the fountain, the café's murmur);
   `?bench` before and after (the `park` view and a new one over the
   terrace), the phone tier, the budgets.

## Constraints

- Nothing in the snapshot moves; the Mall stays on its line.
- Made-up names and copy only; no real park's names (no "Bethesda", "Bow",
  "Ramble" on signs: the plan's words are descriptions).
- Rules in DOM-free tested files (westlake.ts and new ones on `DOM_FREE`),
  drawing in the park's chunk, sites and batches, fine detail near only.
- Colours from palette.ts; nothing flush; minimal bloom.
- `npm test` and `npm run test:wide` (the park reads the highway's edge).
