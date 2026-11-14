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
  well, the benches), into the crowd's spare slots (the reserve 360, 180 on
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
  - **Carried west** (the owner's call, the build-out's second section:
    still Endswood, an extension, no new name or pin) is planned in
    `docs/ends-west-plan.md` in five phases, each with the owner's sign-off;
    keep it up to date. Phase 1 (the land and the streets) is built:
    `endswest.ts` (DOM-free, the boot's, tested in `tests/endswest.test.ts`):
    the estate's land grows by `WEST_RECT` (endswood.ts; `inEndswood()` is
    the old land, the new and the band between, so lampmix.ts, lampposts.ts,
    ambience.ts and the trees read it as one), the Close carried on west
    from the old estate to `CLOSE_WEST`, its bollards moved there
    (`CLOSE_BOLLARDS`), a zebra with beacons where the tunnel's footpath
    crosses it (`ZEBRA`), the pavements between (`LINK_BLOCKS`), two blocks
    either side of it (`WEST_BLOCKS`, ref `endswood`) laid as those estates
    were (the owner's pick): service lanes in from the Close (`LANES`) to
    parking courts behind the rows (`COURTS`), the rows' footprints kept
    for Phase 2 (`ROWS`, each with the way it faces), back gardens
    (`GARDENS`), front paths either side of a green (`PATHS`, `GREENS`), a
    cross path down each block's east side (`CROSS_PATHS`), the east ends
    kept for Phase 3 (`RESERVE`), sodium lamps (`WEST_LAMPS`, at the boot);
    its land in `KEEPS` and ground.ts; drawn by `endswest3d.ts`
    (`LAZY_DISTRICTS` id `endswest`). Still a dead end: no traffic down it.
    Phase 2 (the terraces) is built: `endsterraces.ts` (DOM-free, the
    chunk's, tested in `tests/endsterraces.test.ts`): each row two or three
    terraces (`TERRACES`) with passages through to the gardens and courts
    (`GINNELS`), every row mixing two and three storeys and flat and pitched
    roofs (the owner's picks), 48 houses (`HOUSES`) mirrored in pairs, every
    door its own colour (`DOOR_COLOURS`, the owner's pick), canopies, brick
    or glazed porches, worn as Endswood (boards, dishes, faded doors), bins,
    the back gardens' fences and gates (`fencesOf()`, `gateOf()`), sheds;
    `TERRACE_SOLIDS` joined through `addSolids()` when the chunk loads;
    drawn by `endsterraces3d.ts` (a site a terrace, walls from infill.ts's
    wall atlas). Phase 3 (the estate round them) is built:
    `endsweststreet.ts` (DOM-free, the chunk's, tested in
    `tests/endsweststreet.test.ts`) on the blocks' east ends: the parade on
    the Close with flats over (`PARADE_W`, `UNITS_W`, made-up names, one to
    let), the fenced playground (`PLAY_W`), the lock-up garages on their
    apron (`GARAGES`, `APRON`, a few doors up), the kickabout green and its
    goals (`KICKABOUT`, `GOALS`), bin stores, the board, CCTV and benches;
    `STREET_W_SOLIDS` joined when the chunk loads; drawn by
    `endsweststreet3d.ts` (its shopfronts painted by `endsshopfront.ts`, the
    old parade's painter, shared). Phase 4 (life, night and sound) is built:
    `endswestlife.ts` (DOM-free, the chunk's, tested in
    `tests/endswestlife.test.ts`): walkers round the rows' front paths, along
    the Close and up the cross path, dogs on leads (`WEST_DOGS`), kids in the
    playground and a kickabout on the green, neighbours on their doorsteps,
    a queue at the chippy, people on the benches (`WEST_PEOPLE`,
    `WEST_IDLE`, into the crowd's spare slots), washing in some back gardens
    and bikes and toys out front (`WASHING`, `FRONT_BITS`), a pool under
    every porch light and the late shops' (`PORCH_POOLS`); drawn by
    `endswestlife3d.ts` (the bits as sites, near only; the dogs and the pools
    on the main thread); the kickabout green under two sodium lamps
    (`WEST_LAMPS`), the playground dark; its sound Endswood's. Phase 5
    (polish) is built and the plan is done: `?bench` views `endsw-parade`,
    `endsw-rows`, `endsw-kick`; no place of its own (it's Endswood's);
    phones draw every other garden's washing and no toys on the greens.
- **Degen's home** (the owner's call: a home with a garage in the Ends, room
  for a car and a bike on the driveway) is planned in `docs/home-plan.md`
  in five phases, each with the owner's sign-off; keep it up to date. Phase
  1 is built: `home.ts` (DOM-free, the boot's, tested in
  `tests/home.test.ts`): the west end house of the row backing onto the
  Close (endsterraces.ts `rn2-0-2`, `HOME_HOUSE`: the house stands where it
  stood), `HOME.garage` in its back garden (its door, `garageDoor`, in its
  west wall; shut for now, one solid box in `SOLIDS`), `HOME.drive` on the
  strip between the row's end and the service lane down to the Close
  (`HOME.kerb` the dropped kerb), the bays on it (`CAR_BAY`, `BIKE_BAY`),
  the place (spot `home`: `HOME_PICK`, `HOME_PIN`, `HOME_DOOR`'s prompt,
  `HOME_SPAWN`, a `PLACES` and `LIVE_PLACES` entry, panel
  `data-panel-tpl="home"` with Walk in, `data-home-walkin`), `onHome()`.
  Walking starts at `HOME_SPAWN` (index.ts's walk button; `?spawn=` in the
  address still starts it elsewhere). endsterraces.ts makes room (no shed,
  gate or fence where the garage stands: `cutBy()`), endswestlife.ts no
  washing there. Drawn by `home3d.ts` (a site in the estate's chunk, from
  endswest3d.ts's `register()`).
  Phase 2 (home base) is built: the garage is hollow, its door up
  (`HOME_SOLIDS`: its walls, `WALL`; the doorway clear), your car inside
  (`CAR_HOME`) and your bike on the driveway (`BIKE_HOME`; a vehicle's yaw
  is its group's turn, nose along (cos yaw, -sin yaw)). garage.ts has the
  two sets of stands (`at('home' | 'city')`, `where`: the city garage's
  turntable and stand are a showroom, used only while its menu is open),
  and its `turntable`, `yaw`, `bikeSpot`, `takeOut()`, `takeOutBike()` and
  `view` answer for the stands in use, so drive.ts and walk.ts needed no
  other change but `drive.blocks()` (the car at home is solid) and the
  second Garage prompt (`HOME_GARAGE_DOOR`, walk.ts `garageAt`).
  `startsAtHome()`: a new player's first walk starts downtown.
  Phase 3 (the interior) is built: `ROOM` and `CEIL` (the ground floor,
  one room), `FURNITURE` (each a kind, a footprint and a height;
  home3d.ts's `furnish()` draws each kind), `HALL_W` (the hall kept
  clear), `inHouse()` / `homeWall()` (walk.ts `blocked()` asks them first:
  inside the house's footprint only the room's walls and furniture stop
  you), `HOME_CAMERA` (the ceiling, in walk.ts's `cameraRoom()`),
  `HOME_PORTALS` (the front and back doors, a prompt outside and in, each
  a fade through index.ts's `rideTo()`; walk `places` entries `home:in`,
  `home:out`, `home:yard`, `home:back`), `YARD_GATE`. The house is sealed:
  `HOME_SOLIDS` has its four walls, and endsterraces.ts's `TERRACE_SOLIDS`
  leaves it out of its terrace's box. A new thing in the room goes in
  `FURNITURE` (the test floods the room to hold everything reachable).
  Phase 4 (the wardrobe and the stash) is built: `HOME_USES` (two prompts
  in the room, by the wardrobe and by the trunk, in walk `places` beside
  `HOME_PORTALS`); index.ts's `openPlace` opens the fitting room for
  `home:wardrobe` (`open('shop', true)`: Drop 001's panel, closed with it
  by the live settings) and the stash's card for `home:stash`
  (stash-ui.ts, loaded then; markup `[data-stash]` in `CityMap.astro`, the
  metro card's styles; its rules are inventory.ts's, `inventory.md`).
  Phase 5's rest: the panel's live line (`home` in livelines.ts) and the
  benchmark's view of the house (`ends-home` in bench.ts).
  Phase 5's first part (the room at night) is built: the inside of the
  house and of the garage is drawn in the shared `neon()` paint (home3d.ts
  `paint(hex, k)`: one material a shade, the day's and night's brightness
  in the vertices, so it stays lit at night and never blooms; `icube()`
  shades a box's sides by hand, as nothing lights it), never a light of
  its own; `sky.setIndoors()` (index.ts's frame, from `inHouse()`) stops
  the rain being drawn in the house; ambience.ts's `home` (1 in the house
  on foot) lets sound.ts turn the street down further than the mall's
  hall does, over a faint hum. The garage door's lamp has a pool on the
  driveway (the last of endswestlife.ts's `PORCH_POOLS`).
- **The far west and Degen's compound** (`docs/ends-far-west-plan.md`, the
  owner's call: the home is a landmark with a design of its own, a walled
  compound on a new plot west of the rows, planned with that phase of the
  estate). Phase 1 (the land and the road) is built: `FAR_RECT` in
  endswood.ts (read by `inEndswood()`), `endsfar.ts` (DOM-free, the boot's:
  `FAR_STREETS` the Close's run on and the lane, `HEAD` their T,
  `FAR_BLOCKS` with a `use` each, `PLOT` and `GATES` the compound's, 
  `FAR_LAMPS`), drawn by `endsfar3d.ts` (`LAZY_DISTRICTS` id `endsfar`).
  The Close's bollards are gone (`CLOSE_BOLLARDS` is empty): you drive on
  to the lane. Phase 2 (the compound's outside) is built, and **home base
  is the compound**: `home.ts` is written round the plot (`HOME`: the wall
  and its gates, the double garage with `carDoor` and `bikeDoor`, the
  house, the workshop, the lawns; `HOME_SOLIDS`; `CAR_HOME`, `BIKE_HOME`,
  `HOME_GARAGE_DOOR`, `HOME_WORKSHOP_DOOR`, `HOME_VIEW`, `HOME_SPAWN`; the
  room's `ROOM`, `FURNITURE`, `HOME_PORTALS` (front door and side door),
  `HOME_USES`), drawn by `home3d.ts` (one site, registered by
  `endsfar3d.ts`; its surfaces lie 24 mm over the slab, clear of the plot's
  paving). What the paragraphs above say of the home's place (the end
  house of row `rn2`, its garage in the back garden, the driveway, the
  yard's gate) is how it was: that house is a neighbour's again, and
  nothing in the terraces' code knows of the home. The Close is one street
  to the T (`FAR_LANE_X` in endswood.ts).
  Phase 3 (the roof terrace) is built: `ROOF_Y`, `TERRACE`, `HATCH`,
  `ROOF_THINGS`, `onRoof()`, `roofWall()`, `homeRoofY()` (groundheight.ts's
  `homeroof` layer); `inHouse(x, z, y)` is the ground floor only;
  `HOME_PORTALS` has `home:up` and `home:down`; `homePlaces(y)` is what
  index.ts gives walk mode as the home's prompts, by floor. A new thing on
  the terrace goes in `ROOF_THINGS`.
  Phase 4 (round the compound) is built: `endsfarhomes.ts` (DOM-free, the
  chunk's: `BUNGALOWS` with `frontWall()` and `backFences()`, `ALLOTMENT`
  with its `paths`, `fence` and `PLOTS`, `FAR_HOME_SOLIDS` joined through
  `addSolids()`), drawn by `endsfarhomes3d.ts` (sites: a bungalow, a pair
  of plots, a run of fence). The compound's back gate, the allotments' east
  gate and their middle path are on one line (`ALLOTMENT.gateZ`).
  Phase 5 (life and night) is built: `endsfarlife.ts` (DOM-free, the
  chunk's: `FAR_LOOPS` and `FAR_PEOPLE`, `FAR_IDLE`, `FAR_POOLS`), added by
  `endsfar3d.ts` on the main thread (`addPeople()`, not on phones: their
  crowd's reserve is full; the pools one instanced mesh in the FX layer).
  Lit windows are `LIT_GLASS` in home3d.ts and endsfarhomes3d.ts.
