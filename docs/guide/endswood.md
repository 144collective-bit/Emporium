# Endswood Estate

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Endswood Estate**, "the Ends" (the owner's call, 2026-11: a rough London
  council estate, a brutalist concrete jungle with subways, underpasses and
  abandoned buildings, corner shops, an old but large church and a DIY
  recording studio) is planned in `docs/estate-plan.md`, on Lot 9's land
  south of the highway, Lot 9 moving further south so The Trenches,
  Endswood and Lot 9 blend north to south. Phase 1 (Lot 9 moved south) and
  Phase 2 (the land, streets and subways) are built: `endswood.ts`
  (DOM-free, the boot's, tested in `tests/endswood.test.ts`): its land
  (`ENDSWOOD_RECT`, Lot 9's old land and the strips east of the south avenue
  to the east one), Endswood Road (lit at both avenues), **Endswood Circus**
  (`CIRCUS`, one way round as Uptown's, on the estate's own road a block in
  from the avenue) and the Close (a dead end, `CLOSE_BOLLARDS`) in the street
  plan (`ENDS_STREETS` / `ENDS_CROSSINGS`), its blocks (`ENDS_BLOCKS`, ref
  `endswood`, drawn as the Docks', grit in areas.ts) cut round the Circus
  either side of **the spine** (`SPINE`), the **well** sunk in the Circus's
  middle and the **subways** north and south from it under the Circus up
  ramps into the spine (`WELL`, `SUBWAYS`, `SUBWAY_HOLES`, `ENDS_SOLIDS`),
  sodium lamps (`ENDS_LAMPS`), a bus stop each way on the south avenue, exit
  6's signs ("Endswood · The Trenches"); drawn by `endswood3d.ts`
  (`LAZY_DISTRICTS` id `endswood`). Phase 3 (the blocks) is built: `endsblocks.ts`
  (DOM-free, tested in `tests/endsblocks.test.ts`): `BLOCKS` in shells
  (`Shell`, each side a `Face`, the ground floor a `Ground`): Fennel House,
  the barrier block in two halves either side of the spine with decks every
  other floor (`DECK`, `finsOf()`) and a bridge over the spine, Harrier Point
  (the tower, its lift tower bridged to it every third floor), Linnet Court,
  Hawthorn Terrace, the garages, the courts and Marten House east of the
  avenue, and Kite House, condemned behind hoardings (`hoardingRuns()`); all
  under the Emporium (`TALLEST`), the galleries over a walker's head
  (`GROUND`); `BLOCK_SOLIDS` (in `SOLIDS`); drawn by `endsblocks3d.ts`
  (`registerBlocks()`, a site a shell, its own atlas `ends-concrete`; the
  galleries' front doors painted nearly a storey tall, about 0.97 tiles,
  their lights on the wall over them, so everyone fits them:
  docs/scale-plan.md). Phase 4 (street level) is built:
  `endsstreet.ts` (DOM-free, tested in `tests/endsstreet.test.ts`): **St Aldwyn's** (`CHURCH`, its spire
  `SPIRE_TOP` the estate's one thing over the Emporium, every flight well over it) in its churchyard
  (`CHURCHYARD`: railings, the lychgate, yews, `HEADSTONES`), Endswood Parade's units (`PARADE_UNITS`; the block
  is endsblocks.ts's `parade`, its ground floor `shops`), the corner shops (`CORNER_SHOPS`, scenery now), the
  boarded pub and the derelict community centre (`PUB`, `CENTRE`, each a way in round the `back` for later),
  Bunker Sound in Linnet Court's garages (`STUDIO`, `AERIAL`), the green, the pitch, the playground, bin stores,
  CCTV, the estate boards, the zebras with flashing beacons, double yellows and humps; `STREET_SOLIDS` (in
  `SOLIDS`), `ENDS_TREES` at the boot; drawn by `endsstreet3d.ts` (`registerStreet()`, one atlas `ends-shops`) and
  `endschurch3d.ts` (stained glass lit at night, `ends-church`). **Below ground is one kit**
  (`underground.ts`, DOM-free: passages and wells, `underworld()`'s `y()`,
  `wall()`, `room()`, `roofed()`, `inZone()`, `holesOf()` / `wellHole()`):
  Lot 9's tunnel is one of its passages (`LOT9_PASSAGE`), and walk.ts asks
  one underworld of the tunnel, the subways and the well; anything new below
  ground goes in it. Phase 5 (the decks and bridges walked on) is built:
  `endsdecks.ts` (DOM-free, the boot's, tested in `tests/endsdecks.test.ts`):
  Fennel House's galleries every second storey (room overhead: storeys are a
  tile), their cross walls open at each gallery (`finSpans()`, `OPENING`),
  the street in the sky on the third floor's gallery line and Harrier Point's
  bridges (floors 2, 5, 8) as open walkways `WALK_H` tall; `ENDS_FLOORS`,
  `endsDeckY()` / `upOnEnds()` / `endsDeckWall()` first in walk.ts's
  `groundAt()` / `blocked()`, `ENDS_CAMERA` in `CAMERA_GRID`; lifts in
  Fennel's cores and Harrier's lift tower (`ENDS_LIFTS`, Up and Down doors,
  prompts `lift:ends:...` from `endsLiftDoors()`, `endsLiftRide()` through
  index.ts `rideTo()`; since the polish round Fennel's lifts are in its stair
  towers, below). Anything new walked on up there goes through
  `ENDS_FLOORS`. Phase 6 (the blend) is built: `endsblend.ts` (DOM-free,
  the boot's, tested in `tests/endsblend.test.ts`): the common between the
  estate's south edge and Lot 9's fence (`COMMON`: in `KEEPS`, its own
  ground in ground.ts, sodium all the way, `inSodiumBand()` in lampmix.ts),
  the desire line to the footpath (`DESIRE`), the ditch with its plank
  bridge (`DITCH_LINE`, `PLANK`, its banks solid but at the plank), the
  fly-tipping (`TIPPED`), the estate's old chain-link broken (`CHAIN_RUNS`:
  up, leaning, down), brambles, hawthorns and lamps (`BRAMBLES`,
  `COMMON_TREES`, `COMMON_LAMPS` at the boot), `COMMON_SOLIDS` (in
  `SOLIDS`); drawn by `endsblend3d.ts`; Lot 9's tunnel drawn as the
  estate's subway (tiles, THE ENDS, SUBWAY plates, concrete bollards) by
  endswood3d.ts's `registerTunnel()`; a skate spot and lock-ups under the
  viaduct by the estate (viadress.ts `skate`). Phase 7 (life, night and
  sound) is built: `endslife.ts` (DOM-free, the chunk's, tested in
  `tests/endslife.test.ts`): walkers on Endswood Road's sidewalks (crossing
  at the zebras), down the spine and along Fennel House's third-floor
  gallery, dog walkers (`ENDS_DOGS`), the old lady and her shopping trolley
  (`trolleyAt()`), kids on BMXs in the garage court doing wheelies
  (`bmxAt()`, `WHEELIE`), mopeds up and down the Close (`mopedAt()`), a
  kickabout on the ball court, kids on the swings (`ENDS_PEOPLE`), and
  people standing about (`ENDS_IDLE`: on the deck railings, at the parade,
  the corner shops, Bunker Sound's sofa, the church, the bus stops, the
  well, the benches), into the crowd's spare slots (the reserve 320, 160 on
  phones); drawn by `endslife3d.ts`; at night the stairwells' glazing lit
  up each core and lift tower, fluorescent tubes under every gallery (some
  tired, the odd one dead) and TVs' blue among the windows
  (endsblocks3d.ts); its sound (ambience.ts `ends`, `studio`, `bell`:
  pigeons, mopeds, the two-tone siren, the ice-cream van's made-up jingle,
  Bunker Sound's beat, St Aldwyn's bell on the hour by the visitor's
  clock). Phase 8 (places and polish) is built and the plan is done:
  `endsplaces.ts` (DOM-free, the boot's, tested in
  `tests/endsplaces.test.ts`): spots `endswood` (the estate, its pin over the
  tenants' hall on the parade), `aldwyns` (St Aldwyn's, its pin over the
  spire) and `bunker` (Bunker Sound), their pick boxes (`ENDS_SPOTS`, through
  crestspots.ts `spot()`), pins, directory entries, panels with Walk in
  (`data-ends-walkin` to `ENDS_SPAWNS`), doors (`ENDS_DOORS` in walk.ts's
  `ALL_DOORS`, each with its own `label`: "Enter Tenants' Hall"), `PLACES` and
  `LIVE_PLACES` entries, all coming soon; the lychgate's roof keeps the walk
  camera out (`LYCH_CAMERA`); `?bench` views `ends-circus`, `ends-street`,
  `ends-common`. The polish round (the owner's call: "use a stairwell to get
  to the balcony", "some buildings don't make sense") is built: a concrete
  dog-leg stair tower off every block with galleries (`STAIRS`,
  `STAIR_TOWERS`, `stairGeom()` in endsblocks.ts: a frame of its own, `u`
  across, `v` out; off the gallery's outer edge through a gap in its parapet,
  or off its end, `stairedAt()` opening the end wall), every gallery walked,
  its flights floors that rise (endsdecks.ts `Floor.slope`, `floorY()`, its
  porch a `ground` foot, `stairSolids()`, `stairCamera()`), Fennel House's
  lifts moved from the gallery wall into its towers (`lift`, `SHAFT`,
  `LIFT_NEAR`, `towerLift()`; its north cores, and Marten House's east ones,
  are escape stairs), drawn by endsblocks3d.ts's `drawStair()` (concrete
  faces from the blocks' atlas, a lit slit up each side, stepped flights and
  a handrail, landing lights, the shaft; no shadows cast, as the mall's hall,
  so the day reaches the stairwell). Keep it up to date.
