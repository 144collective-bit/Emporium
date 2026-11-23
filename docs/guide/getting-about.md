# Getting about: places, the world map, taxis, the river bus, the metro, sound by district

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Getting about** (growth plan Phase 8; the owner picked taxis, fast
  travel and the metro):
  - **Places** are `places.ts` (DOM-free, tested in `tests/travel.test.ts`):
    every place on the map (`PLACES`: the spots with a pin, the garage, the
    market square, the metro's stations) with the spot you arrive at,
    standing, facing it; `seen()` says which you've reached (`SEEN_R`).
    Walking or driving there (not flying over, not riding past) adds it to
    the save's `visited` (`visit()` in `tycoon.ts`, cleaned to `PLACE_IDS`),
    with a toast.
  - **The world map** is `worldmap.ts` (markup `[data-worldmap]` in
    `CityMap.astro`, styles `src/styles/worldmap.css`): a canvas drawn
    from the street plan (slabs, plazas, roads by width, the highway, the
    river, the airport and runway, the kart park's circuit, Liberty
    Bridge, the metro line; since the polish plan's Phase 7 every place's
    footprint in the same muted tone: the resorts, the
    Docks' sheds, warehouses and stacks, Crestmont's landmarks, Sunridge's
    club and school, Lot 9's fence and huts), the places with their pins' names
    (`placeName()`), you, your car, your aircraft when it's away, your
    waypoint. Drag or two fingers pan, scroll or pinch zoom, + / − / Fit /
    You, "Find a place" (the keyboard's way in). From the hub's Map tab
    (World map), or M (walking with no panel open, or the City
    view); M, Esc or × close it. Tapping a place opens a card: Open and
    Walk here (City view), Set waypoint, Taxi here, Fast travel (on foot,
    places you've been); yourself: Bring my car; open ground: a waypoint.
  - **Waypoints** (`travel-ui.ts`, which wires the map in): a magenta beam
    (`beacons.waypoint()`) and the compass in the walk HUD (`[data-compass]`,
    top right: an arrow, metres, the name, an ×), cleared when you're there.
    **Fast travel** fades out, stands you at the place (`walk.placeAt()`)
    and fades in. **Bring my car** (`walk.bringCar()`, `drive.bring()`):
    the nearest lane spot round you, clear of traffic.
  - **Taxis** are `taxi.ts` (loaded the first time one's called): a Cruiser in taxi yellow with a lit TAXI sign
    comes from a spot on the roads a way off to the kerb nearest you, along
    `pathBetween()` (`routes.ts`: the shortest drive between two points on
    the streets, in the right lanes, ending at the kerb nearest the place),
    stopping at red lights and behind traffic; the traffic stops behind it
    (`stoppers` in `life.ts`). Walk up to it (or Get in) and it drives you
    there under a chase camera; Skip ride or Esc cuts to the end. Where the
    road stops short of the place (a kerb past `FAR_DROP`, 15, from its
    spot: a cul-de-sac's end) you step out onto the kerb beside the taxi
    facing it, a waypoint set to the place, and it says "As close as the
    road goes" (the polish plan's Phase 6). Its bar is
    `[data-taxi]` (under the header while it comes, at the bottom while you
    ride). Free: no fare.
  - **The river bus** (river plan step 4b) is `riverbus.ts` (DOM-free, the boot's: its stops, `STOPS`, each a landing off the quay with a gangway, `LANDING`, `GANGWAY`; `atGangway()`, which opens the railings and keeps the promenades' and decks' lamps, benches and trees out of the way) and `riverroute.ts` (DOM-free: two boats, `BUSES`, on one loop, `ROUTE`, between the banks and the outer lanes, crossing only at `CROSS`; the timetable `busAt()`; rides straight along the loop the shorter way, `ride()` / `rideAt()`, at most about `RIDE_MAX`; `offsetFor()` lays the boat you came on at your stop after; `BUS_VIEW` is what the drawing reads), both tested in `tests/riverbus.test.ts`. The landings (sites) and the boats are `riverlife3d.ts`; the card (`[data-riverbus]`) and the ride (`[data-riverbus-bar]`, Skip ride / Esc) are `riverbus-ui.ts`, loaded when a gangway's "River bus" prompt (walk `places` `riverbus:<id>`) first opens one; the stops are places (`riverbus-<id>`, kind `riverbus`) and the world map draws the loop; `riverbus` in `LIVE_FEATURES` closes it.
  - **Rides** (taxi, metro and river bus) go through `walk.setRide()` (`Ride` in
    `walk.ts`): the ride moves Degen (hidden) and its own camera, the keys
    wait, `.city.is-riding` hides the walk HUD; leaving walk mode ends it.
  - **The tube**, the south's underground line (The Trenches to the High
    Road, the south plan's Phase 4), is its own: `endswood.md` (`southline.ts`,
    `southtrains.ts`, `tube3d.ts`, `tube-ui.ts`); it shares the metro's card
    (one card for both lines at every station, `trips.ts`), its ride bar and
    its one switch (`live.closed('metro')`). Its stations are places
    (`tube-<id>`, kind `tube`, at street level by each way in: southline.ts
    `TUBE_SPOTS`) and the world map draws its line, teal, dashed on a dark
    casing.
  - **The metro** is `metro.ts` (DOM-free, tested in `tests/metro.test.ts`):
    an elevated line on a viaduct as tracks (`TRACKS`: `main` from its north
    end north of the ring highway (the north side's stage 2: it crosses the
    raised highway high, metro.ts `trackY()`, and stays up through Starlight
    Mall's Skywalk over the avenue, `needAt()`, `mall.md`; Starlight Mall
    station is in the Skywalk since docs/mall-plan.md "One mall" Phase 2,
    `inside`: its platform floor, its door up there (index.ts shows its
    Metro prompt only up there), its glass lift the mall's; it was at the
    north end, Kart Park's until the park moved west) down the east ring avenue's
    median to the switch (`SWITCH_S`), a
    quarter-circle bend (`BEND_R`) and west over the open land south of the
    south row and Trench Avenue's median to The Trenches, and on (via the
    docks since `docs/docks-plan.md` Phase 2, the owner's call) west along
    Trench Avenue's line over row W and the highway to Southbank Docks
    station on the docks' east quay, a bend north (`WEST_R`, `WEST_END`)
    onto the docks' line (`EL_X` in docks.ts), over the river on the red
    steel arch with nothing in the water (`ARCH`, `archY()`: its ribs
    springing from the east quay and the north bank's promenade, its crown
    16 over the ground, well under what flies over; the deck hung from it,
    `HANGERS`; no pillar under it), a bend east (`NORTH_R`) onto the north
    bank avenue's median, east along it into Uptown (its planted median
    broken round the pillars, no tree under the deck: boulevarddress.ts), a
    bend north (`UP_R`) into the one-way pair's northbound street at `UP_X`
    and up it on portal frames (`PORTALS`, `PORTAL`: a leg each side on the
    blocks' edges, none on a road or its sidewalk; the arch's feet first)
    to Uptown station, `UP_END`; `branch` straight
    on from the switch down the avenue's median, then (since the airport's
    Phase 3 step 2) a bend east (`BRANCH`) over the airport's old land and
    the highway to Airport Station by Airport Drive, `AIRPORT_END`; and
    `crest` (Crestmont's Phase 9): off the main line north of Starlight Mall
    station (`CREST_S`; a train between them runs on past it and turns round,
    `TURN`, `TURN_S`, then through Starlight Mall without stopping on a ride), east between the old Kart Road's line and the highway, round
    outside the highway's north-east corner and south to Crestmont station
    past Alder Way (`CREST`, `CREST_END`; nothing grows under it,
    `SPUR_CLEAR`), facing north, so its runs turn round past it (`TURN_S`;
    the timetable's legs to and from the turn stand `TURN_STOP` there, not a
    station's dwell, `LEGS`); runs on the branch, the spur and out to Uptown go faster, `TRAIN.express`, `speedOf()`); a place
    on them is a track and a distance (`pointOn()`, `along()`, `sideOf()`);
    pillars wherever the ground is clear (`PILLARS`: an avenue's median
    clear of its junctions, or open land off every road; over the river
    only on Harbour Bridge's median, where they're steel posts from its
    deck, river plan step 2);
    nine stations (`STATIONS`: Starlight Mall, Downtown, South Bank, The
    Trenches, Southbank Docks, Kart Park (on the north bank avenue's median
    west of the highway, `KART_STATION_X`, a walk up to the park's gate:
    since the polish plan's Phase 7 a paved path, kartfacility.ts
    `STATION_WALK`, from the station's door west past its tower and
    north-west over the open land, straight over the two small streets and
    ew0 on zebras, to Kart Road's sidewalk's east end; its land in
    `KEEPS` (landuse.ts), so the trees and the rolls keep off it; drawn by
    kartgrounds3d.ts in the karts' chunk, which reaches the station),
    Airport, Uptown, Crestmont; each a track and distance, a platform on the
    track's left (`PLATFORM_SIDE`; Uptown's on its right, `side`,
    `sideAt()`), a stair tower with its door at street level and the way
    out of it, `face`; Uptown's on the plaza's café terrace), `METRO_SOLIDS`
    (in `SOLIDS`: pillars, portal legs, towers), the train
    (`TRAIN`, two cars) on a timetable from the clock (`trainAt()`, `LEGS`:
    from Crestmont to Starlight Mall, down to South Bank, out through The Trenches, the Docks and Kart Park to Uptown and
    back, out to the Airport and back, up again; `ROUND_TRIP`), runs as pieces of track (`runsBetween()`,
    `placeOn()`, `carAt()`: each car on the track where it is, round the
    bend), rides straight between stations (`rideAt()`, turning round at
    South Bank between the west and the Airport, at Starlight Mall from
    Crestmont; at most about 61 s, Uptown to the Airport, but Crestmont's,
    up to about 75 s from Uptown)
    and back on the timetable after (`timetableAt()`). Drawn by `metro3d.ts`
    (the deck in short straight pieces between its pillars, portals and
    hangers, rails, parapets
    with magenta neon, hammerhead pillars (on Harbour Bridge, steel posts
    from its deck, `onHarbour()`); the portal frames, and the arch in
    crimson steel (ribs braced across over the train, white hangers to
    floor beams under the deck, a line of lights along the ribs); each
    station in its own frame along its track: platform, canopy with the
    station names from one sign atlas, skybridge, tower with an M roundel
    over the door, totem; two cars, `userData.keep`). Its rides are
    `metro-ui.ts` (loaded the first time it's needed): the station door's
    "Metro" prompt (a walk `places` entry, `metro:<id>`) opens the card for
    both lines (`[data-metro]`, tube-ui.ts since the south plan's 4h: every
    stop on the metro and the tube, a trip to the other line changing at The
    Trenches, trips.ts; metro-ui.ts's own card only if that won't load), a
    ride runs alongside the train (`[data-metro-bar]`, Skip ride / Esc) and
    you step out at the destination's door (or, on a trip's first ride, the
    change goes on: `ride(a, b, then)`).
  - **Sound by district** is `ambience.ts` (DOM-free, tested in
    `tests/ambience.test.ts`): `ambienceAt(x, z, lift)` gives the town's
    hum, the river (and Westlake's lake), the traffic's rush (the highway,
    the avenues inside it), wind over open land, the Emporium's beat, The
    Trenches' own (`hood`, `boombox`: the grit step), Westlake Park's
    (`park`: birds by day, an owl at night), Uptown's (a quieter hum, the
    plaza's `fountain`, the circle's traffic), Crestmont's (`crest`) and
    Sunridge's (`suburb`: sprinklers, crickets, a lawnmower); since the
    polish pass's sound phase the hum is the loudest of every built-up
    part's (`HUMS`: the town, The Trenches, Uptown and Uptown North hushed,
    the mall, the Docks, the airport, the kart park, each eased
    out past its land, so none reads as open country) and the places with a
    sound of their own have a layer: `waterfront` (the boardwalk, Pier 7,
    the market's deck and the town's promenades: gulls by day, a foghorn
    now and then; the Night Market's murmur after dusk is `market`), `docks`
    (gulls, a crane's hoist whine, a ship's horn), `jets` (`jetsAt()`: an
    airliner's roar as one takes off or lands, from the airport's timetable
    and the clock, `ambienceAt(x, z, lift, t)`), `indoor` (inside the mall's
    hall; sound.ts damps the outdoor layers by it), `home` (in Degen's
    house on foot, home.ts `inHouse()`: damped further, a faint hum), `karts` (the kart
    park: engines idling, a tannoy), `airbase` (Northgate Air Base: far engines across the field, all of it inside
    its fence and fading over 80 past it, airbase.ts `inAirbase()` / `fromFence()`) (the stadium's match-night crowd
    went with it, 2026-11-22); `sound.update()` mixes its layers
    from it (and the el's rumble from `metro.rumbleAt()`), where you walk
    or where the City view looks, each new layer's graph made the first
    time it's heard. Your engine's voice is by what you're in
    (`engine(revs, voice)`; `Voice` in vehicleids.ts, `VOICE` in mycar.ts
    per car model, `BIKE_VOICE` in mybike.ts, the kart `kart`, the hire
    boat `boat`; the kart is a single speed, `motorOf(..., 1)`).

    The south's (docs/south-plan.md Phase 6e): Bunker Sound's beat (`studio`) and
    St Aldwyn's bell (`bell`) back with their buildings, the village's birds and
    owl (the park's layer, `VILLAGE_BIRDS`), the High Road's shoppers (the Neon
    Mile's crowd, `HIGH_ROAD_MURMUR`), and below ground (`BELOW`) hushed as
    indoors with a tube train's rumble from the timetable (`tube`,
    `tubeRumbleAt()`, mixed with the el's in index.ts). ambience.ts is fetched
    after the boot (the south plan's 6a).