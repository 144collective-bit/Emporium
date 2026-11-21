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
  jetty stay.
- **The formal garden:** kept, made ornate (balustrades, a pergola,
  patterned beds, a carved central fountain).
- **The café:** a place (a panel, coming soon for now, a pin, a door,
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

1. **The lake and the land.** The lake reshaped round its centre: a
   wandering shore of coves and a rocky point (`lakeR()` given more
   harmonics and two bays), an arm reaching west toward the Mall (the
   bridge's crossing) and an inlet on the east (the stone arch's); its
   stone rim and walk mode's `RIM`, `inLake()`, `LAKE_WALLS`, the boats'
   rings and the jetty's reach refitted to it. Rock outcrops in the park's
   own grey stone (schist-like, low and layered, solid where they stand)
   on the knolls north and east of the lake, and the ground's gentle
   rolls (blend.md's rolls, no real hills under walk mode). The world map
   redraws the lake. Tested: the lake round its centre, the boats on the
   water clear of each other and the shore, the jetty over water, the rocks
   off every path.
2. **The paths re-laid.** The Mall as a promenade (a wider paved walk, a
   double row of trees each side meeting overhead, benches all along, the
   literary walk's busts swapped for made-up urns). The ring walk's
   corners rounded and its line wandering a little inside the wall. The
   lake loop on the new shore. Curving walks: a ramble of narrow paths
   through the woods north-east of the lake, a walk over the bridge, a
   walk round the meadow, each meeting the next at an angle, none a dead
   end. Kerbs, edges, planters, lamps, benches, the people's lanes and
   the picnics refitted (gardens.ts, parklife.ts). Tested: every path joins
   another or a gate, the lanes on paths, nothing on a path.
3. **The ornate masonry.** The park's set pieces, in a warm carved stone:
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
4. **The formal garden made ornate.** Its site and its walls kept, laid
   anew inside: balustrades in place of the low walls, a wisteria pergola
   along its north side, beds in patterns (knots of box hedge, rings and
   diamonds of colour on lawn, not grids on soil), a carved central
   fountain where the two round places are, urns, benches. Tested: the
   garden inside its site, the Mall through it.
5. **Trees and land.** A great park's planting: the Mall's elms; groves of
   big spreading trees (several kinds, sizes and shapes, from the
   palette), a dense woodland in the ramble, willows leaning over the
   water, a great open meadow (the Great Lawn: kept clear, ringed by
   trees), reeds and lily pads in the lake's coves, shrub beds breaking the
   wall's straight edge (the no ruler-straight edges rule). Instanced, a
   kind a mesh, the clumps trimmed on phones.
6. **The bandstand and the café.**
   - **The bandstand:** an octagonal Victorian bandstand (a carved stone
     base, iron columns, an ornate roof with a finial) on its own lawn, a
     ring of benches round it; a band some evenings (seated players, the
     crowd's acts) and its music in the park's ambience while they play.
   - **The café:** a lakeside café (a made-up name for the owner to pick),
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
