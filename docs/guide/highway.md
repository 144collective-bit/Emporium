# The raised highway and the roads

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **The raised highway and the roads** (the owner's call): the ring highway
  rebuilt on a modern concrete box-girder viaduct all the way round, eight
  numbered exits laid as partial cloverleafs (district edges moved to make
  room, the owner's call), the metro rising over it, then the road upgrades
  (a swing bridge from Uptown to The Trenches, turn lanes and signals, rural
  roads past the highway, the concrete-era look), planned in
  `docs/highway-plan.md` in phases, each with the owner's sign-off; keep it
  up to date. Phase 1 (the shape as data) is built: `viaduct.ts` (DOM-free,
  tested in `tests/viaduct.test.ts`: the ring exactly, `ringAt()` /
  `ringPoint()` / `ringS()`; `DECK_Y`, `CLEARANCE`; `EXITS`; `RAMPS`, `QUAD`,
  `REACH`, each quadrant's `Form`: full, slip or none, the owner's call: open
  land only moves) and `viapiers.ts` (`PIERS`); Phase 1b (making room) is
  built: the ramps' land is `rampLand()` (the outskirts' trees, the seam map
  and `inTrenches()` keep off it; `quadrantEdge()` for a district's edge),
  Westlake Park's south-west corner is cut back for exit 8 (`EXIT_NOTCH`),
  Stadium Road comes in further north for exit 1 (stadium.ts `IN`,
  `ROAD_LINE`), and the test holds every ramp clear; the fit is
  `docs/highway-exits-fit.png`. Phase 2 (the viaduct drawn and the ring
  raised) is built: no junction or slip lane with it at street level
  (`OUTER_SLIPS` went; `RING_MEETS` in streetplan.ts, where each arterial
  passes under), its traffic on the deck (routes.ts `RING_ROUTES`, `deck`;
  life.ts draws them at `DECK_Y` and keeps them from following, stopping
  for or bumping anything at street level, `bodies.cars`' `y`), world.ts's
  street-level asphalt, lines, lamps, slips and river bridges gone;
  `viaduct3d.ts` draws it (`LAZY_DISTRICTS` id `viaduct`, a site every 12:
  the box girder, asphalt and lines, parapets with a steel rail, the median
  barrier, joints every `JOINT_EVERY` piers, hammerhead piers), its lamps
  in the median barrier (viapiers.ts `DECK_LAMPS`, at the boot), the piers
  solid (`PIER_SOLIDS`), the deck the walk camera's (`DECK_CAMERA`, in
  `CAMERA_GRID` only, with a bottom); the metro rises over it and its ramps
  (metro.ts `trackY()`, `PLATEAUS`, `HIGH_Y` 7.4 over `RISE`; Starlight Mall (Kart Park's until the park moved west), the new Kart Park station,
  Southbank Docks and the Airport raised with it, its pillars clear of the
  ramps; metro3d.ts draws every piece at its height, the train pitched on
  the climbs); the stadium's footbridge retired (above). Phase 3 (the
  exits) is built: every ramp a one-way street of kind `ramp` in the plan
  (`ys` its heights; a `-deck` merge crossing with the highway, unlit, and a
  lit `-foot` on its arterial; `raised()` in streetplan.ts is what's off the
  ground, left out of what's measured at street level); routes.ts's `merge`
  turn (straight on in the outer lane, `turnOf()`), every route point's
  height (`heightsOf()`, `Route.ys` baked, `heightOn()` / `climbOn()`: life.ts
  and taxi.ts draw cars there, and cars only meet what's at their height),
  taxis the quickest way (`HIGHWAY_PACE`), never stopping up there;
  `viaground.ts` (DOM-free): the deck and ramps as ground by height
  (`viaductY()` in walk.ts's `groundAt()`), their walls (`viaWallsNear()`:
  the ramps' sides always, the parapets only for a car up there, open at each
  ramp's taper, `deckGap()`), walking stopped at a ramp's foot (`walkOff()`),
  the ramps' piers (`RAMP_PIER_SOLIDS`); drive-sim.ts's `up` skips the
  river's walls under the deck; no getting out up there; viaduct3d.ts draws
  the ramps (`rampSegs()`: asphalt, edge lines, parapets, on piers where high,
  a filled bank where low). Phase 4 (signs and the look) is built:
  `viadress.ts` and `viasigns.ts` (DOM-free; the signs' file the chunk's
  only): green gantries before every off-ramp
  (`GANTRIES`: an advance one and one where it leaves, kept off the metro
  overhead, `METRO_S`, and the deck's lamps; one sign atlas
  `viaduct-signs`, the exits' own made-up names, `EXIT_SIGNS`), a sign by
  every on-ramp's foot (`RAMP_SIGNS`), sound walls on the parapet past homes
  (`SOUND_WALLS`, `soundWall()`), under the deck between its piers
  (`UNDER`: car parks in town with their cars, `UNDER_CARS`; lock-ups by
  the yards and the Docks; half courts by The Trenches and Endswood, and
  between them by Endswood a skate spot and lock-ups in turn (`skate`,
  `skateParts()`, Endswood's Phase 6), murals on
  the piers there, `MURALS`, made-up words; `UNDER_SOLIDS` in `SOLIDS`), the
  soffit's lights over every street under it (`UNDER_LIGHTS`, pools at the
  boot) and lamps up the ramps (`RAMP_LAMPS`, at the boot), and each exit's
  number on the world map (`exitBadge()`); drawn by viaduct3d.ts. Phase 5
  (the swing bridge, Uptown to The Trenches) is built: see Kestrel Bridge
  below. Phase 6 (turn lanes and signals) is built: at the busiest avenue
  junctions (routes.ts `arrowsAt()`, `Junction.arrows`: lit four-way
  crossroads on an avenue) the inner lane is for left turns and the outer
  for ahead and right, painted with arrows and a stop bar (`turnlanes.ts`,
  drawn by `turnlanes3d.ts`, `LAZY_DISTRICTS` id `turnlanes`; Uptown paints
  its own, the arrows' shape `arrowShape()` in roads3d.ts), and the lights
  give the avenue's left turns a green arrow first (`lightState(j, phase, t,
  left)`, a route stop's `left`, `ARROW`, `arrowCycle()`; a fourth head, an
  arrow, in life.ts; people wait while it's lit, pedestrians.ts `redLeft()`).
  Phase 7 (country roads) is built: past the highway and whatever stands
  along them, the grid's roads run on to the edge as two-lane country roads
  (`rural.ts`: `ruralSplit()` in `cityPlan()`, streets of kind `rural`
  `<id>-w/e/n/s` from an unlit join, routes.ts's `join`, to a one-way turning
  loop near the edge, a bank avenue's up a stub inland; `RURAL`,
  `RURAL_RUNS`, `onRural()`), with verges, ditches, post-and-rail fences and
  field gates (`ruralfence.ts`: `FENCES`, `GATES`; `ruraldress.ts`: `riverSide()`;
  `RURAL_KEEPS` in landuse.ts), the odd lamp (`RURAL_LAMPS`, at the boot) and
  a little traffic (routes.ts `RURAL_SPOTS`); drawn by `rural3d.ts`
  (`LAZY_DISTRICTS` id `rural`); the town pieces' asphalt, medians and lines
  stop at the join (world.ts `townRun()`). A grid road's id (`ew0`, `ns3`...)
  is its town piece now; a new thing out past where it ends is on its
  country road. Phase 8 (the concrete-era look) is built: `streetwear.ts`
  (DOM-free, the chunk's only): on the grid's town streets and the
  diagonals inside the highway (not Uptown, kept clean, nor The Trenches,
  worn their own way, nor the bridges), concrete gutters along the kerbs
  with drains, patches inside the lanes, cracks, manholes, stop lines into
  the lit junctions and give-way dashes into the rest; drawn by
  `streetwear3d.ts` (`LAZY_DISTRICTS` id `streetwear`). Phase 9 (polish and
  performance) is built and the plan is done: `?bench` views `hw-straight`,
  `hw-exit`, `hw-river`, `swing` and `rural`; what only the drawing reads is
  out of the boot (the gantries, ramp signs, sound walls and murals are
  `viasigns.ts`, the rural fences and gates `ruralfence.ts`, each its chunk's
  only); keep new drawing-only data in files of that kind.
